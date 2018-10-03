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

/**
 * @module src/domain/transfer/transformer
 */

/**
* @function transformHeaders
*
* @description This will transform the headers before sending to kafka
*
* @param {object} headers - the http header from the request
*
* @returns {object} Returns the normalized headers
*/

const transformHeaders = (headers) => {
  // Normalized headers
  var normalizedHeaders = {}
  for (var headerKey in headers) {
    var headerValue = headers[headerKey]
    switch (headerKey.toLowerCase()) {
      case ('date'):
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
      case ('content-length'):
        // Do nothing here, do not map. This will be inserted correctly by the Hapi framework.
        break
      default:
        normalizedHeaders[headerKey] = headerValue
    }
  }
  return normalizedHeaders
  // return headers
}

module.exports = {
  transformHeaders
}
