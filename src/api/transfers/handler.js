/*****
 License
 --------------
 Copyright © 2020-2025 Mojaloop Foundation
 The Mojaloop files are made available by the Mojaloop Foundation under the Apache License, Version 2.0 (the "License") and you may not use these files except in compliance with the License. You may obtain a copy of the License at

 http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, the Mojaloop files are distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.

 Contributors
 --------------
 This is the official list of the Mojaloop project contributors for this file.
 Names of the original copyright holders (individuals or organizations)
 should be listed with a '*' in the first column. People who have
 contributed from an organization can be listed under the organization
 that actually holds the copyright for their contributions (see the
 Mojaloop Foundation for an example). Those individuals should have
 their names indented and be marked with a '-'. Email address can be added
 optionally within square brackets <email>.

 * Mojaloop Foundation
 - Name Surname <name.surname@mojaloop.io>

 - Shashikant Hirugade <shashikant.hirugade@modusbox.com>
 --------------
 ******/

'use strict'

const EventSdk = require('@mojaloop/event-sdk')
const Metrics = require('@mojaloop/central-services-metrics')
const ErrorHandler = require('@mojaloop/central-services-error-handling')
const { Enum, Util } = require('@mojaloop/central-services-shared')
const { TransformFacades } = require('@mojaloop/ml-schema-transformer-lib')
const { Hapi } = require('@mojaloop/central-services-shared').Util

const Config = require('../../lib/config')
const TransferService = require('../../domain/transfer')
const Validator = require('../../lib/validator')
const { logger } = require('../../shared/logger')
const { ROUTES, PROM_METRICS } = require('../../shared/constants')
const { setOriginalRequestPayload } = require('../../domain/transfer/dto')
const { injectAuditQueryTags } = require('../../lib/util')
const { getTransferSpanTags } = Util.EventFramework.Tags
const { Type, Action } = Enum.Events.Event

/**
 * @module src/api/transfers/handler
 */

/**
 * @function Create
 * @async
 *
 * @description This will call prepare method of transfer service, which will produce a transfer message on prepare kafka topic
 *
 * @param {object} request - the http request object, containing headers and transfer request as payload
 * @param {object} h - the http response object, the response code will be sent using this object methods.
 *
 * @returns {integer} - Returns the response code 202 on success, throws error if failure occurs
 */

const create = async function (context, request, h) {
  const { headers, span, method } = request
  let { dataUri, payload } = request
  const isFx = request.path?.includes(ROUTES.fxTransfers)
  const isIsoMode = Config.API_TYPE === Hapi.API_TYPES.iso20022
  let kafkaMessageContext

  if (isIsoMode) {
    // dataUri is the original encoded payload
    kafkaMessageContext = {
      originalRequestPayload: dataUri,
      originalRequestId: request.info.id
    }

    if (request.server?.app?.payloadCache) {
      await setOriginalRequestPayload(
        kafkaMessageContext,
        request.server.app.payloadCache
      )
      delete kafkaMessageContext.originalRequestPayload
    }

    // Transform the payload to ISO20022
    // We're leaving the transformed payload as an object
    if (isFx) {
      payload = (await TransformFacades.FSPIOPISO20022.fxTransfers.post({ body: payload, headers })).body
    } else {
      payload = (await TransformFacades.FSPIOPISO20022.transfers.post({ body: payload, headers })).body
    }
  }
  const metric = PROM_METRICS.transferPrepare(isFx)
  const histTimerEnd = Metrics.getHistogram(
    metric,
    `Produce a ${metric} message to transfer prepare kafka topic`,
    ['success']
  ).startTimer()

  try {
    span.setTracestateTags({ timeApiPrepare: `${Date.now()}` })
    span.setTags(getTransferSpanTags(request, Type.TRANSFER, Action.PREPARE))
    injectAuditQueryTags({
      span,
      id: payload.transferId || payload.commitRequestId,
      method,
      action: Action.PREPARE,
      isFx,
      ...(isFx ? { additionalTags: { determiningTransferId: payload.determiningTransferId } } : {})
    })
    await span.audit({
      headers,
      dataUri,
      payload
    }, EventSdk.AuditEventAction.start)

    await TransferService.prepare(headers, dataUri, payload, span, kafkaMessageContext, isIsoMode)

    histTimerEnd({ success: true })
    return h.response().code(202)
  } catch (err) {
    const fspiopError = ErrorHandler.Factory.reformatFSPIOPError(err)
    logger.error(fspiopError)
    histTimerEnd({ success: false })
    throw fspiopError
  }
}

/**
 * @function FulfilTransfer
 * @async
 *
 * @description This will call fulfil method of transfer service, which will produce a transfer fulfil message on fulfil kafka topic
 *
 * @param {object} request - the http request object, containing headers and transfer fulfilment request as payload. It also contains transferId as param
 * @param {object} h - the http response object, the response code will be sent using this object methods.
 *
 * @returns {integer} - Returns the response code 200 on success, throws error if failure occurs
 */

const fulfilTransfer = async function (context, request, h) {
  const { headers, params, span, method, path } = request
  let { dataUri, payload } = request

  const isFx = request.path?.includes(ROUTES.fxTransfers)
  const isIsoMode = Config.API_TYPE === Hapi.API_TYPES.iso20022
  let kafkaMessageContext

  if (isIsoMode) {
    // dataUri is the original encoded payload
    kafkaMessageContext = {
      originalRequestPayload: dataUri,
      originalRequestId: request.info.id
    }

    if (request.server?.app?.payloadCache) {
      await setOriginalRequestPayload(
        kafkaMessageContext,
        request.server.app.payloadCache
      )
      delete kafkaMessageContext.originalRequestPayload
    }

    // Transform ISO20022 message to fspiop message
    // We're leaving the transformed payload as an object
    if (isFx) {
      payload = (await TransformFacades.FSPIOPISO20022.fxTransfers.put({ body: payload, headers })).body
    } else {
      payload = (await TransformFacades.FSPIOPISO20022.transfers.put({ body: payload, headers })).body
    }
  }

  const metric = PROM_METRICS.transferFulfil(isFx)
  const histTimerEnd = Metrics.getHistogram(
    metric,
    `Produce a ${metric} message to transfer fulfil kafka topic`,
    ['success']
  ).startTimer()

  span.setTracestateTags({ timeApiFulfil: `${Date.now()}` })
  try {
    Validator.fulfilTransfer({ payload })

    span.setTags(getTransferSpanTags(request, Type.TRANSFER, Action.FULFIL))
    injectAuditQueryTags({ span, id: params.ID, method, path, action: Action.FULFIL, isFx })
    await span.audit({
      headers,
      payload,
      params,
      dataUri
    }, EventSdk.AuditEventAction.start)

    await TransferService.fulfil(headers, dataUri, payload, params, span, kafkaMessageContext, isIsoMode)

    histTimerEnd({ success: true })
    return h.response().code(200)
  } catch (err) {
    const fspiopError = ErrorHandler.Factory.reformatFSPIOPError(err)
    logger.error(fspiopError)
    histTimerEnd({ success: false })
    throw fspiopError
  }
}

/**
 * @function getById
 * @async
 *
 * @description This will call getTransferById method of transfer service, which will produce a transfer fulfil message on fulfil kafka topic
 *
 * @param {object} request - the http request object, containing headers and transfer fulfilment request as payload. It also contains transferId as param
 * @param {object} h - the http response object, the response code will be sent using this object methods.
 *
 * @returns {integer} - Returns the response code 200 on success, throws error if failure occurs
 */

const getTransferById = async function (context, request, h) {
  const isFx = request.path?.includes(ROUTES.fxTransfers)
  const metric = PROM_METRICS.transferGet(isFx)
  const histTimerEnd = Metrics.getHistogram(
    metric,
    'Get a transfer by Id',
    ['success']
  ).startTimer()

  const { span, params, path, method } = request
  try {
    span.setTags(getTransferSpanTags(request, Enum.Events.Event.Type.TRANSFER, Enum.Events.Event.Action.GET))
    injectAuditQueryTags({ span, id: params.id || params.ID, method, path, action: Action.GET, isFx })
    logger.info(`getById::id(${params.id || params.ID})`)
    await span.audit({
      headers: request.headers,
      params: request.params
    }, EventSdk.AuditEventAction.start)
    await TransferService.getTransferById(request.headers, request.params, span, isFx)
    histTimerEnd({ success: true })
    return h.response().code(202)
  } catch (err) {
    const fspiopError = ErrorHandler.Factory.reformatFSPIOPError(err)
    logger.error(fspiopError)
    histTimerEnd({ success: false })
    throw fspiopError
  }
}

/**
 * @function fulfilTransferError
 * @async
 *
 * @description This will call error method of transfer service, which will produce a transfer error message on fulfil kafka topic
 *
 * @param {object} request - the http request object, containing headers and transfer fulfilment request as payload. It also contains transferId as param
 * @param {object} h - the http response object, the response code will be sent using this object methods.
 *
 * @returns {integer} - Returns the response code 200 on success, throws error if failure occurs
 */
const fulfilTransferError = async function (context, request, h) {
  const { headers, params, span, path, method } = request
  let { dataUri, payload } = request
  const isFx = request.path?.includes(ROUTES.fxTransfers)
  const isIsoMode = Config.API_TYPE === Hapi.API_TYPES.iso20022
  let kafkaMessageContext

  if (isIsoMode) {
    // dataUri is the original encoded payload
    kafkaMessageContext = {
      originalRequestPayload: dataUri,
      originalRequestId: request.info.id
    }

    if (request.server?.app?.payloadCache) {
      await setOriginalRequestPayload(
        kafkaMessageContext,
        request.server.app.payloadCache
      )
      delete kafkaMessageContext.originalRequestPayload
    }

    // Transform ISO20022 message to fspiop message
    // We're leaving the transformed payload as an object
    if (isFx) {
      payload = (await TransformFacades.FSPIOPISO20022.fxTransfers.putError({ body: payload, headers })).body
    } else {
      payload = (await TransformFacades.FSPIOPISO20022.transfers.putError({ body: payload, headers })).body
    }
  }

  const metric = PROM_METRICS.transferFulfilError(isFx)
  const histTimerEnd = Metrics.getHistogram(
    metric,
    `Produce a ${metric} message to transfer fulfil kafka topic`,
    ['success']
  ).startTimer()

  try {
    span.setTags(getTransferSpanTags(request, Enum.Events.Event.Type.TRANSFER, Enum.Events.Event.Action.ABORT))
    injectAuditQueryTags({ span, id: params.ID, method, path, action: Action.ABORT, isFx })
    await span.audit({
      headers,
      dataUri,
      payload,
      params
    }, EventSdk.AuditEventAction.start)

    await TransferService.transferError(headers, dataUri, payload, params, span, isFx, kafkaMessageContext, isIsoMode)

    histTimerEnd({ success: true })
    return h.response().code(200)
  } catch (err) {
    const fspiopError = ErrorHandler.Factory.reformatFSPIOPError(err)
    logger.error(fspiopError)
    histTimerEnd({ success: false })
    throw fspiopError
  }
}

/**
 * @function patchTransfer
 * @async
 * @description Not implemented
 */
const patchTransfer = async function (context, request, h) {
  // Not implemented yet
  throw ErrorHandler.Factory.createFSPIOPError(ErrorHandler.Enums.FSPIOPErrorCodes.NOT_IMPLEMENTED)
}

module.exports = {
  create,
  fulfilTransfer,
  getTransferById,
  fulfilTransferError,
  patchTransfer
}
