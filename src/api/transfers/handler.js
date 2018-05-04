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
 --------------
 ******/

'use strict'

const TransferService = require('../../domain/transfer')
const Logger = require('@mojaloop/central-services-shared').Logger
const Boom = require('boom')
const { Map } = require('immutable')

exports.create = async function (request, h) {
  const allHeaders = Map(request.headers)
  try {
    const headers = {
      'Content-Length': allHeaders.get('content-length'),
      'Content-Type': allHeaders.get('content-type'),
      'Date': allHeaders.get('date'),
      'x-forwarded-for': allHeaders.get('x-forwarded-for'),
      'fspiop-source': allHeaders.get('fspiop-source'),
      'FSPIOP-destination': allHeaders.get('fspiop-destination'),
      'FSPIOP-encryption': allHeaders.get('fspiop-encryption'),
      'FSPIOP-signature': allHeaders.get('fspiop-signature'),
      'FSPIOP-uri': allHeaders.get('fspiop-uri'),
      'FSPIOP-http-method': allHeaders.get('fspiop-http-method')
    }
    Logger.info('create::start(%s)', JSON.stringify(request.payload))
    const result = await TransferService.prepare(JSON.parse(JSON.stringify(headers)), request.payload)
    return h.response(result).code((result === true) ? 202 : 500)
  } catch (err) {
    throw Boom.boomify(err, {statusCode: 500, message: 'An error has occurred'})
  }
}

exports.receiveNotification = async function (request, h) {
  console.log('receiveNotification::headers(%s)', JSON.stringify(request.headers))
  console.log('receiveNotification::payload(%s)', JSON.stringify(request.payload))
  return h.response(true).code(200)
}
