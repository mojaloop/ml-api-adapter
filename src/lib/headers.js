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

 * Steven Oderayi <steven.oderayi@modusbox.com>

 --------------
 ******/
'use strict'

const Mustache = require('mustache')
const { Enum: Enums, Util: { Headers: { makeAcceptContentTypeHeader } } } = require('@mojaloop/central-services-shared')
const Config = require('../lib/config')
const uriRegex = /(?:^.*)(\/(transfers|fxTransfers)(\/.*)*)$/

/**
 * @function createErrorCallbackHeaders
 * @description It returns the FSPIOP headers for callbacks
 * @param {object} params - parameters to the function with the shape `{ headers, dfspId, transferId, httpMethod, endpointTemplate }`
 *
 * @returns {object} - FSPIOP callback headers merged with the headers passed in `params.headers`
 */
const createCallbackHeaders = (params, fromSwitch = false) => {
  const callbackHeaders = { ...params.headers }

  callbackHeaders[Enums.Http.Headers.FSPIOP.HTTP_METHOD] = params.httpMethod
  const uri = Mustache.render(params.endpointTemplate, { ID: params.transferId || null, fsp: params.dfspId || null })
  callbackHeaders[Enums.Http.Headers.FSPIOP.URI] = uriRegex.exec(uri)[1]
  if (fromSwitch) {
    const fspIOPSourceKey = getHeaderCaseInsensitiveKey(callbackHeaders, Enums.Http.Headers.FSPIOP.SOURCE)
    if (fspIOPSourceKey) delete callbackHeaders[fspIOPSourceKey]
    const fspIOPDestinationKey = getHeaderCaseInsensitiveKey(callbackHeaders, Enums.Http.Headers.FSPIOP.DESTINATION)
    if (fspIOPDestinationKey) delete callbackHeaders[fspIOPDestinationKey]
    const fspIOPSingatureKey = getHeaderCaseInsensitiveKey(callbackHeaders, Enums.Http.Headers.FSPIOP.SIGNATURE)
    if (fspIOPSingatureKey) delete callbackHeaders[fspIOPSingatureKey]
    callbackHeaders[Enums.Http.Headers.FSPIOP.SOURCE] = Config.HUB_NAME
    callbackHeaders[Enums.Http.Headers.FSPIOP.DESTINATION] = getHeaderCaseInsensitiveValue(params.headers, Enums.Http.Headers.FSPIOP.DESTINATION)
    if (Config.IS_ISO_MODE) {
      let contentType = getHeaderCaseInsensitiveValue(callbackHeaders, Enums.Http.Headers.GENERAL.CONTENT_TYPE.value)
      if (!contentType.startsWith('application/vnd.interoperability.iso20022')) {
        const resourceType = contentType.includes(Enums.Http.HeaderResources.FX_TRANSFERS) ? Enums.Http.HeaderResources.FX_TRANSFERS : Enums.Http.HeaderResources.TRANSFERS
        contentType = makeAcceptContentTypeHeader(resourceType, Config.PROTOCOL_VERSIONS.CONTENT.DEFAULT, Config.API_TYPE)
        callbackHeaders[Enums.Http.Headers.GENERAL.CONTENT_TYPE.value] = contentType
      }
    }
  }

  return callbackHeaders
}

const getHeaderCaseInsensitiveKey = (object, searchKey) => {
  if (object == null || searchKey == null) return null
  return Object.keys(object).find(key => key.toLowerCase() === searchKey.toLowerCase())
}

const getHeaderCaseInsensitiveValue = (object, searchKey) => {
  if (object == null || searchKey == null) return null
  const key = Object.keys(object).find(key => key.toLowerCase() === searchKey.toLowerCase())
  if (key) return object[key]
  return null
}

module.exports = {
  createCallbackHeaders,
  getHeaderCaseInsensitiveKey,
  getHeaderCaseInsensitiveValue
}
