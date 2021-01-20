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
const TransferService = require('../../domain/transfer')
const Validator = require('../../lib/validator')
const Logger = require('@mojaloop/central-services-logger')
const Metrics = require('@mojaloop/central-services-metrics')
const ErrorHandler = require('@mojaloop/central-services-error-handling')
const Enum = require('@mojaloop/central-services-shared').Enum

const { getTransferSpanTags } = require('@mojaloop/central-services-shared').Util.EventFramework
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

const create = async function (request, h) {
  const histTimerEnd = Metrics.getHistogram(
    'transfer_prepare',
    'Produce a transfer prepare message to transfer prepare kafka topic',
    ['success']
  ).startTimer()

  const span = request.span

  span.setTracestateTags({ timeApiPrepare: `${Date.now()}` })
  try {
    span.setTags(getTransferSpanTags(request, Enum.Events.Event.Type.TRANSFER, Enum.Events.Event.Action.PREPARE))
    Logger.isDebugEnabled && Logger.debug('create::payload(%s)', JSON.stringify(request.payload))
    Logger.isDebugEnabled && Logger.debug('create::headers(%s)', JSON.stringify(request.headers))
    await span.audit({
      headers: request.headers,
      dataUri: request.dataUri,
      payload: request.payload
    }, EventSdk.AuditEventAction.start)

    await TransferService.prepare(request.headers, request.dataUri, request.payload, span)
    histTimerEnd({ success: true })
    return h.response().code(202)
  } catch (err) {
    const fspiopError = ErrorHandler.Factory.reformatFSPIOPError(err)
    Logger.error(fspiopError)
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

const fulfilTransfer = async function (request, h) {
  const histTimerEnd = Metrics.getHistogram(
    'transfer_fulfil',
    'Produce a transfer fulfil message to transfer fulfil kafka topic',
    ['success']
  ).startTimer()

  const span = request.span
  span.setTracestateTags({ timeApiFulfil: `${Date.now()}` })
  try {
    span.setTags(getTransferSpanTags(request, Enum.Events.Event.Type.TRANSFER, Enum.Events.Event.Action.FULFIL))
    Validator.fulfilTransfer(request)
    Logger.isDebugEnabled && Logger.debug('fulfilTransfer::payload(%s)', JSON.stringify(request.payload))
    Logger.isDebugEnabled && Logger.debug('fulfilTransfer::headers(%s)', JSON.stringify(request.headers))
    Logger.isDebugEnabled && Logger.debug('fulfilTransfer::id(%s)', request.params.id)
    await span.audit({
      headers: request.headers,
      dataUri: request.dataUri,
      payload: request.payload,
      params: request.params
    }, EventSdk.AuditEventAction.start)
    await TransferService.fulfil(request.headers, request.dataUri, request.payload, request.params, span)
    histTimerEnd({ success: true })
    return h.response().code(200)
  } catch (err) {
    const fspiopError = ErrorHandler.Factory.reformatFSPIOPError(err)
    Logger.error(fspiopError)
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

const getTransferById = async function (request, h) {
  const histTimerEnd = Metrics.getHistogram(
    'transfer_get',
    'Get a transfer by Id',
    ['success']
  ).startTimer()

  const span = request.span
  try {
    span.setTags(getTransferSpanTags(request, Enum.Events.Event.Type.TRANSFER, Enum.Events.Event.Action.GET))
    Logger.isInfoEnabled && Logger.info(`getById::id(${request.params.id})`)
    await span.audit({
      headers: request.headers,
      params: request.params
    }, EventSdk.AuditEventAction.start)
    await TransferService.getTransferById(request.headers, request.params, span)
    histTimerEnd({ success: true })
    return h.response().code(202)
  } catch (err) {
    const fspiopError = ErrorHandler.Factory.reformatFSPIOPError(err)
    Logger.error(fspiopError)
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
const fulfilTransferError = async function (request, h) {
  const histTimerEnd = Metrics.getHistogram(
    'transfer_fulfil_error',
    'Produce a transfer fulfil error message to transfer fulfil kafka topic',
    ['success']
  ).startTimer()

  const span = request.span
  try {
    span.setTags(getTransferSpanTags(request, Enum.Events.Event.Type.TRANSFER, Enum.Events.Event.Action.ABORT))
    Logger.isDebugEnabled && Logger.debug('fulfilTransferError::payload(%s)', JSON.stringify(request.payload))
    Logger.isDebugEnabled && Logger.debug('fulfilTransferError::headers(%s)', JSON.stringify(request.headers))
    Logger.isDebugEnabled && Logger.debug('fulfilTransfer::id(%s)', request.params.id)
    await span.audit({
      headers: request.headers,
      dataUri: request.dataUri,
      payload: request.payload,
      params: request.params
    }, EventSdk.AuditEventAction.start)
    await TransferService.transferError(request.headers, request.dataUri, request.payload, request.params, span)
    histTimerEnd({ success: true })
    return h.response().code(200)
  } catch (err) {
    const fspiopError = ErrorHandler.Factory.reformatFSPIOPError(err)
    Logger.error(fspiopError)
    histTimerEnd({ success: false })
    throw fspiopError
  }
}

module.exports = {
  create,
  fulfilTransfer,
  getTransferById,
  fulfilTransferError
}
