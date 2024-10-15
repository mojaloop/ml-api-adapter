/*****
 License
 --------------
 Copyright © 2017 Bill & Melinda Gates Foundation
 The Mojaloop files are made available by the Bill & Melinda Gates Foundation under the Apache License, Version 2.0 (the "License") and you may not use these files except in compliance with the License. You may obtain a copy of the License at
 http://www.apache.org/licenses/LICENSE-2.0
 Unless required by applicable law or agreed to in writing, the Mojaloop files are distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 Contributors
 --------------
 This is the official list of the Mojaloop project contributors for this file.
 Names of the original copyright holders (individuals or organizations)
 should be listed with a '*' in the first column. People who have
 contributed from an organization can be listed under the organization
 that actually holds the copyright for their contributions (see the
 Gates Foundation organization for an example). Those individuals should have
 their names indented and be marked with a '-'. Email address can be added
 optionally within square brackets <email>.
 * Gates Foundation
 - Name Surname <name.surname@gatesfoundation.com>

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

const { getTransferSpanTags } = Util.EventFramework
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
  const { headers, dataUri, span, rawPayload } = request
  let { payload } = request
  const isFx = request.path?.includes(ROUTES.fxTransfers)
  const isIsoMode = Config.API_TYPE === Hapi.API_TYPES.iso20022

  let kafkaMessageContext
  if (isIsoMode) {
    if (isFx) {
      payload = await TransformFacades.FSPIOPISO20022.fxTransfers.post({ body: payload.body, headers })
    } else {
      payload = await TransformFacades.FSPIOPISO20022.transfers.post({ body: payload.body, headers })
    }
    kafkaMessageContext = {
      originalPayload: rawPayload,
      originalRequestId: request.info.id
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
    await span.audit({
      headers,
      dataUri,
      payload
    }, EventSdk.AuditEventAction.start)

    await TransferService.prepare(headers, dataUri, payload, span, kafkaMessageContext)

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
  const { headers, params, dataUri, span, rawPayload } = request
  let { payload } = request
  const isFx = request.path?.includes(ROUTES.fxTransfers)
  const isIsoMode = Config.API_TYPE === Hapi.API_TYPES.iso20022
  let kafkaMessageContext
  if (isIsoMode) {
    if (isFx) {
      payload = await TransformFacades.FSPIOPISO20022.fxTransfers.put({ body: payload.body, headers })
    } else {
      payload = await TransformFacades.FSPIOPISO20022.transfers.put({ body: payload.body, headers })
    }

    kafkaMessageContext = {
      originalPayload: rawPayload,
      originalRequestId: request.info.id
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
    await span.audit({
      headers,
      payload,
      params,
      dataUri
    }, EventSdk.AuditEventAction.start)

    await TransferService.fulfil(headers, dataUri, payload, params, span, kafkaMessageContext)

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

  const span = request.span
  try {
    span.setTags(getTransferSpanTags(request, Enum.Events.Event.Type.TRANSFER, Enum.Events.Event.Action.GET))
    logger.info(`getById::id(${request.params.id})`)
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
  const { headers, params, dataUri, span, rawPayload } = request
  let { payload } = request
  const isFx = request.path?.includes(ROUTES.fxTransfers)
  const isIsoMode = Config.API_TYPE === Hapi.API_TYPES.iso20022
  let kafkaMessageContext

  if (isIsoMode) {
    if (isFx) {
      payload = await TransformFacades.FSPIOPISO20022.fxTransfers.putError({ body: payload.body, headers })
    } else {
      payload = await TransformFacades.FSPIOPISO20022.transfers.putError({ body: payload.body, headers })
    }
    kafkaMessageContext = {
      originalPayload: rawPayload,
      originalRequestId: request.info.id
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
    await span.audit({
      headers,
      dataUri,
      payload,
      params
    }, EventSdk.AuditEventAction.start)

    await TransferService.transferError(headers, dataUri, payload, params, span, isFx, kafkaMessageContext)

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
