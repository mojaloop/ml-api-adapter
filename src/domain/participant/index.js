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
 - Rajiv Mothilal <rajiv.mothilal@modusbox.com>
 --------------
 ******/

'use strict'

const ErrorHandler = require('@mojaloop/central-services-error-handling')
const Metrics = require('@mojaloop/central-services-metrics')
const { Endpoints } = require('@mojaloop/central-services-shared').Util

const { logger } = require('../../shared/logger')
const { TEMPLATE_PARAMS } = require('../../shared/constants')
const config = require('../../lib/config')

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
 * @param {string} id - optional transferId OR commitRequestId
 * @param {boolean} isFx - optional isFx
 * @param {Span} span - optional tracer span
 *
 * @returns {string} - Returns the endpoint, throws error if failure occurs
 */
const getEndpoint = async ({
  fsp, endpointType, id = '', isFx = false, span = null, proxy
}) => {
  const metric = `notification_event_getEndpoint${isFx ? '_fx' : ''}`
  const histTimerEnd = Metrics.getHistogram(
    metric,
    'Gets endpoints for notification from central ledger db',
    ['success', 'endpointType', 'fsp']
  ).startTimer()
  const log = logger.child({ fsp, id, isFx })

  try {
    const templateOptions = {
      [isFx ? TEMPLATE_PARAMS.commitRequestId : TEMPLATE_PARAMS.transferId]: id
    }
    log.debug(metric, { endpointType, templateOptions })

    let getEndpointSpan
    if (span) {
      getEndpointSpan = span.getChild(`${span.getContext().service}_getEndpoint`)
      getEndpointSpan.setTags({ endpointType, fsp })
    }

    const url = await Endpoints.getEndpoint(config.ENDPOINT_SOURCE_URL, fsp, endpointType, templateOptions, undefined, config.PROXY)
    await getEndpointSpan?.finish()
    histTimerEnd({ success: true, endpointType, fsp })

    return proxy
      ? typeof url === 'string' ? { url } : url
      : typeof url === 'string' ? url : url?.url
  } catch (err) {
    log.warn('error in participant.getEndpoint: ', err)
    const fspiopError = ErrorHandler.Factory.reformatFSPIOPError(err)
    histTimerEnd({ success: false, fsp, endpointType })

    throw fspiopError
  }
}

module.exports = {
  getEndpoint
}
