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

const Logger = require('@mojaloop/central-services-shared').Logger
const Config = require('../../lib/config')
const Catbox = require('catbox')
const Facade = require('../../models/cache')
const { Map } = require('immutable')
const Mustache = require('mustache')

const partition = 'endpoint-cache'
const clientOptions = { partition }
let policyOptions = Config.ENDPOINT_CACHE_CONFIG

let policy

/**
* @function initializeCache
*
* @description This initializes the cache for endpoints
*
* @returns {boolean} Returns true on successful initialization of the cache, throws error on falires
*/
const initializeCache = async () => {
  Logger.debug('initializeCache::start')
  try {
    const client = new Catbox.Client(require('catbox-memory'), clientOptions)
    await client.start()
    policyOptions.generateFunc = fetchEndpoints
    policy = new Catbox.Policy(policyOptions, client, partition)

    return true
  } catch (err) {
    Logger.error(`Cache error:: ERROR:'${err}'`)
    throw err
  }
}

/**
* @function fetchEndpoints
*
 * @description This populates the cache of endpoints
 *
 * @param {string} id The fsp id
 * @returns {object} endpointMap Returns the object containing the endpoints for given fsp id
 */

const fetchEndpoints = async (id) => {
  Logger.info(`[fsp=${id}] ~ Setup::getEndpoints := Refreshing the cache for FSP: ${id}`)
  Logger.debug(`[fsp=${id}] ~ Setup::getEndpoints := Refreshing the cache for FSP: ${id}`)

  const endpointMap = await Facade.fetchEndpoints(id)

  Logger.debug(`[fsp=${id}] ~ Setup::getEndpoints := Returning the endpoints: ${endpointMap}`)
  return endpointMap
}

/**
 * @function GetEndpoint
 *
 * @description It returns the endpoint for a given fsp and type from the cache if the cache is still valid, otherwise it will refresh the cache and return the value
 *
 * @param {string} fsp - the id of the fsp
 * @param {string} enpointType - the type of the endpoint
 *
 * @returns {string} - Returns the endpoint, throws error if failure occurs
 */
const getEndpoint = async (fsp, enpointType, transferId = null) => {
  try {
    let endpoints = await policy.get(fsp)
    let url = new Map(endpoints).get(enpointType)
    url = Mustache.render(url, { transferId: transferId })
    return (url)
  } catch (e) {
    Logger.error(e)
    throw e
  }
}

module.exports = {
  initializeCache,
  getEndpoint
}
