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

 * VesselsTech
 - Lewis Daly <lewis@vesselstech.com>

 * ModusBox
 - Miguel de Barros <miguel.debarros@modusbox.com>

 --------------
 ******/

'use strict'

const HealthCheck = require('@mojaloop/central-services-shared').HealthCheck.HealthCheck
const { defaultHealthHandler } = require('@mojaloop/central-services-health')
const packageJson = require('../../../package.json')
const Config = require('../../lib/config')

const {
  getSubServiceHealthBroker,
  getSubServiceHealthCentralLedger
} = require('../../lib/healthCheck/subServiceHealth.js')

let healthCheck

if (!Config.HANDLERS_DISABLED) {
  healthCheck = new HealthCheck(packageJson, [
    getSubServiceHealthBroker,
    getSubServiceHealthCentralLedger
  ])
} else {
  // TODO: Include getSubServiceHealthBroker once 'getMetadata' enhancement has been added to the central-services-stream Producer
  healthCheck = new HealthCheck(packageJson, [
    getSubServiceHealthBroker
  ])
}

/**
 * @module src/api/metadata/handler
 */

/**
 * @function ExtractUrls
 * @async
 *
 * @description This function returns the registered URLs on this server
 *
 * @param {object} request - the http request object
 *
 * @returns {object} - Returns the object containing all the registered URLs
 */

const extractUrls = (request) => {
  const urls = {}
  request.server.table().filter(route => {
    return route.settings.id !== undefined &&
      Array.isArray(route.settings.tags) &&
      route.settings.tags.indexOf('api') >= 0
  }).forEach(route => {
    urls[route.settings.id] = `${Config.HOSTNAME}${route.path.replace(/\{/g, ':').replace(/\}/g, '')}`
  })
  return urls
}

/**
 * @function getHealth
 *
 * @description Get the health of the service
 *
 * @param {*} request - the Hapi request object
 * @param {*} h - the Hapi handler object
 */
const getHealth = defaultHealthHandler(healthCheck)

/**
 * @function metadata
 * @async
 *
 * @description This is the handler for / endpoint
 *
 * @param {object} request - the http request object
 * @param {object} h - the http response object
 *
 * @returns {object} - Returns the object containing the hostname, registered URLs and 200 status code
 */
const metadata = (request, h) => {
  return h.response({
    directory: Config.HOSTNAME,
    urls: extractUrls(request)
  }).code(200)
}

module.exports = {
  metadata,
  getHealth
}
