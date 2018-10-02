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
const Mustache = require('mustache')
const request = require('request')

/**
 * @module src/models/participant
 */

/**
* @function getEndpoint
*
 * @description This returns fetches the endpoints from a remote URI, so that it will can be cached in ml-api-adapter
 *
 * @param {string} fsp The fsp id
 * @returns {object} endpointMap Returns the object containing the endpoints for given fsp id
 */

const getEndpoint = async (fsp) => {
  const url = Mustache.render(Config.ENDPOINT_SOURCE_URL, { fsp })
  const requestOptions = {
    url,
    method: 'get',
    agentOptions: {
      rejectUnauthorized: false
    }
  }
  Logger.debug(`[fsp=${fsp}] ~ Model::participantEndpoint::getEndpoint := fetching the endpoints from the resource with options: ${JSON.stringify(requestOptions)}`)

  return new Promise((resolve, reject) => {
    return request(requestOptions, (error, response, body) => {
      if (error) {
        Logger.error(`[fsp=${fsp}] ~ Model::participantEndpoint::getEndpoint := failed with error: ${error}, response: ${JSON.stringify(response)}`)
        return reject(error)
      }
      Logger.info(`[fsp=${fsp}] ~ Model::participantEndpoint::getEndpoint := successful with body: ${JSON.stringify(response.body)}`)
      Logger.debug(`[fsp=${fsp}] ~ Model::participantEndpoint::getEndpoint := successful with response: ${JSON.stringify(response)}`)
      let endpoints = JSON.parse(body)
      let endpointMap = {}

      if (Array.isArray(endpoints)) {
        endpoints.forEach(item => {
          endpointMap[item.type] = item.value
        })
      }

      Logger.debug(`[fsp=${fsp}] ~ Model::participantEndpoint::getEndpoints := Returning the endpoints: ${JSON.stringify(response)}`)
      return resolve(endpointMap)
    })
  })
}
module.exports = {
  getEndpoint
}
