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
 - Rajiv Mothilal <rajiv.mothilal@modusbox.com>
 --------------
 ******/

'use strict'

const Logger = require('@mojaloop/central-services-logger')
const ErrorHandler = require('@mojaloop/central-services-error-handling')
const Endpoints = require('@mojaloop/central-services-shared').Util.Endpoints
const Config = require('../../lib/config')
const Metrics = require('@mojaloop/central-services-metrics')

/**
 *
 * @module src/domain/participant
 */

/**
 * @function GetEndpoint
 *
 * @description It returns the endpoint for a given fsp and type from the cache if the cache is still valid, otherwise it will refresh the cache and return the value
 *
 * @param {string} fsp - the id of the fsp
 * @param {string} endpointType - the type of the endpoint
 * @param {string} transferId - optional transferId
 *
 * @returns {string} - Returns the endpoint, throws error if failure occurs
 */
const getEndpoint = async (fsp, endpointType, transferId = null, span = null) => {
  const histTimerEnd = Metrics.getHistogram(
    'notification_event_getEndpoint',
    'Gets endpoints for notification from central ledger db',
    ['success', 'endpointType', 'fsp']
  ).startTimer()
  let getEndpointSpan
  if (span) {
    getEndpointSpan = span.getChild(`${span.getContext().service}_getEndpoint`)
    getEndpointSpan.setTags({ endpointType, fsp })
  }
  Logger.isDebugEnabled && Logger.debug(`domain::participant::getEndpoint::fsp - ${fsp}`)
  Logger.isDebugEnabled && Logger.debug(`domain::participant::getEndpoint::endpointType - ${endpointType}`)
  Logger.isDebugEnabled && Logger.debug(`domain::participant::getEndpoint::transferId - ${transferId}`)

  try {
    const url = await Endpoints.getEndpoint(Config.ENDPOINT_SOURCE_URL, fsp, endpointType, { transferId })
    !!getEndpointSpan && await getEndpointSpan.finish()
    histTimerEnd({ success: true, endpointType, fsp })
    return url
  } catch (err) {
    Logger.error(`participantEndpointCache::getEndpoint:: ERROR:'${err}'`)
    const fspiopError = ErrorHandler.Factory.reformatFSPIOPError(err)
    Logger.error(fspiopError)
    histTimerEnd({ success: false, fsp, endpointType })

    throw fspiopError
  }
}

module.exports = {
  getEndpoint
}
