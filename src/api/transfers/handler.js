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

const TransferService = require('../../domain/transfer')
const Logger = require('@mojaloop/central-services-shared').Logger
const Boom = require('boom')
const Metrics = require('../../lib/metrics')

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
    'transfers_prepare',
    'Produce a transfer prepare message to transfer prepare kafka topic',
    ['success']
  ).startTimer()

  Logger.info(`[cid=${request.payload.transferId}, fsp=${request.payload.payerFsp}, source=${request.payload.payerFsp}, dest=${request.payload.payeeFsp}] ~ Transfers::create::start`)
  try {
    Logger.debug('create::payload(%s)', JSON.stringify(request.payload))
    Logger.debug('create::headers(%s)', JSON.stringify(request.headers))
    await TransferService.prepare(request.headers, request.payload)

    // setTimeout(()=>{
    histTimerEnd({success: true})
    // }, 150)

    return h.response().code(202)
  } catch (err) {
    Logger.error(err)
    histTimerEnd({success: false})
    throw Boom.boomify(err, { message: 'An error has occurred' })
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
    'transfers_fulfil',
    'Produce a transfer fulfil message to transfer fulfil kafka topic',
    ['success']
  ).startTimer()
  try {
    Logger.debug('fulfilTransfer::payload(%s)', JSON.stringify(request.payload))
    Logger.debug('fulfilTransfer::headers(%s)', JSON.stringify(request.headers))
    Logger.debug('fulfilTransfer::id(%s)', request.params.id)
    await TransferService.fulfil(request.params.id, request.headers, request.payload)
    // setTimeout(()=>{
    histTimerEnd({success: true})
    // }, 150)
    return h.response().code(200)
  } catch (err) {
    Logger.error(err)
    histTimerEnd({success: false})
    throw Boom.boomify(err, { message: 'An error has occurred' })
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
  try {
    Logger.info('getById::id(%s)', request.params.id)
    await TransferService.getTransferById(request.params.id, request.headers)
    return h.response().code(200)
  } catch (err) {
    Logger.error(err)
    throw Boom.boomify(err, { message: 'An error has occurred' })
  }
}

module.exports = {
  create,
  fulfilTransfer,
  getTransferById
}
