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

const Logger = require('@mojaloop/central-services-shared').Logger
const request = require('request')
const Transformer = require('../../domain/transfer/transformer')
const Config = require('../../lib/config')

/**
 * @module src/handlers/notification/callbacks
 */

/**
* @function sendCallback
* @async

* @description This sends an http request to a callback url with the details of the notification
*
* @param url - the callback url
* @param method - the http method - e.g. post
* @param headers - the http headers to be used while sending the request
* @param message - the message that will be sent as the body of http request
* @param cid - the component id (transferId) for which callback is being sent, its used for logging only
* @param fsp - the fsp id for which callback is being sent, its used for logging only

* @returns {Promise} Returns a promise which resolves the http status code on success or rejects the error on failure
*/
const sendCallback = async (url, method, headers, message, cid, sourceFsp, destinationFsp) => {
  // Transform headers into Mojaloop v1.0 Specifications
  const transformedHeaders = Transformer.transformHeaders(headers, { httpMethod: method, sourceFsp: sourceFsp, destinationFsp })

  const requestOptions = {
    url,
    method,
    headers: transformedHeaders,
    body: JSON.stringify(message),
    agentOptions: {
      rejectUnauthorized: Config.ENDPOINT_SECURITY_TLS.rejectUnauthorized || true
    }
  }

  Logger.info(`[cid=${cid}, sourceFsp=${sourceFsp}, destinationFsp=${destinationFsp}] ~ NotificationHandler::sendCallback := Callback URL: ${url}`)
  Logger.debug(`[cid=${cid}, sourceFsp=${sourceFsp}, destinationFsp=${destinationFsp}] ~ NotificationHandler::sendCallback := Callback requestOptions: ${JSON.stringify(requestOptions)}`)

  return new Promise((resolve, reject) => {
    return request(requestOptions, (error, response, body) => {
      if (error) {
        // throw error // this is not correct in the context of a Promise.
        Logger.error(`[cid=${cid}, sourceFsp=${sourceFsp}, destinationFsp=${destinationFsp}] ~ NotificationHandler::sendCallback := Callback failed with error: ${error}, response: ${JSON.stringify(response)}`)
        return reject(error)
      }
      Logger.info(`[cid=${cid}, sourceFsp=${sourceFsp}, destinationFsp=${destinationFsp}] ~ NotificationHandler::sendCallback := Callback successful with status code: ${response.statusCode}`)
      Logger.debug(`[cid=${cid}, sourceFsp=${sourceFsp}, destinationFsp=${destinationFsp}] ~ NotificationHandler::sendCallback := Callback successful with response: ${JSON.stringify(response)}`)
      return resolve(response.statusCode)
    })
  })
}

module.exports = {
  sendCallback
}
