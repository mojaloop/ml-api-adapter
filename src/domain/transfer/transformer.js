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

 * ModusBox
 - Miguel de Barros <miguel.debarros@modusbox.com>

 --------------
 ******/

'use strict'

const ENUM = require('../../lib/enum')

/**
 * @module src/domain/transfer/transformer
 */

/**
* @function transformHeaders
*
* @description This will transform the headers before sending to kafka
* NOTE: Assumes incoming headers keys are lowercased. This is a safe
* assumption only if the headers parameter comes from node default http framework.
*
* see https://nodejs.org/dist/latest-v10.x/docs/api/http.html#http_message_headers
*
* @param {object} headers - the http header from the request
*
* @returns {object} Returns the normalized headers
*/

const transformHeaders = (headers, config) => {
  // Normalized keys
  var normalizedKeys = Object.keys(headers).reduce(
    function (keys, k) {
      keys[k.toLowerCase()] = k
      return keys
    }, {})
  // Normalized headers
  var normalizedHeaders = {}
  for (var headerKey in headers) {
    var headerValue = headers[headerKey]
    switch (headerKey.toLowerCase()) {
      case (ENUM.headers.GENERAL.DATE.toLowerCase()):
        var tempDate = {}
        if (typeof headerValue === 'object' && headerValue instanceof Date) {
          tempDate = headerValue.toUTCString()
        } else {
          try {
            tempDate = (new Date(headerValue)).toUTCString()
            if (tempDate === 'Invalid Date') {
              throw new Error('Invalid Date')
            }
          } catch (err) {
            tempDate = headerValue
          }
        }
        normalizedHeaders[headerKey] = tempDate
        break
      case (ENUM.headers.GENERAL.CONTENT_LENGTH.toLowerCase()):
        // Do nothing here, do not map. This will be inserted correctly by the Hapi framework.
        break
      case (ENUM.headers.FSPIOP.URI.toLowerCase()):
        // Do nothing here, do not map. This will be removed from the callback request.
        break
      case (ENUM.headers.FSPIOP.HTTP_METHOD.toLowerCase()):
        if (config.httpMethod.toLowerCase() === headerValue.toLowerCase()) {
          // HTTP Methods match, and thus no change is required
          normalizedHeaders[headerKey] = headerValue
        } else {
          // HTTP Methods DO NOT match, and thus a change is required for target HTTP Method
          normalizedHeaders[headerKey] = config.httpMethod
        }
        break
      case (ENUM.headers.FSPIOP.SIGNATURE.toLowerCase()):
        // Check to see if we find a regex match the source header containing the switch name.
        // If so we include the signature otherwise we remove it.

        if (headers[normalizedKeys[ENUM.headers.FSPIOP.SOURCE.toLowerCase()]].match(ENUM.headers.FSPIOP.SWITCH.regex) === null) {
          normalizedHeaders[headerKey] = headerValue
        }
        break
      case (ENUM.headers.FSPIOP.SOURCE.toLowerCase()):
        normalizedHeaders[headerKey] = config.sourceFsp
        break
      case (ENUM.headers.FSPIOP.DESTINATION.toLowerCase()):
        normalizedHeaders[headerKey] = config.destinationFsp
        break
      default:
        normalizedHeaders[headerKey] = headerValue
    }
  }
  return normalizedHeaders
}

module.exports = {
  transformHeaders
}
