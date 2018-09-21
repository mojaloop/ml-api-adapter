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

 - Shashikant Hiruagde <shashikant.hirugade@modusbox.com>
 --------------
 ******/

'use strict'

const Hapi = require('hapi')
const ErrorHandling = require('@mojaloop/central-services-error-handling')
const Plugins = require('./plugins')
const Logger = require('@mojaloop/central-services-shared').Logger
const Boom = require('boom')
const RegisterHandlers = require('../handlers/register')
const Config = require('../lib/config')
const request = require('request')
const Mustache = require('mustache')

const SECOND = 1000
/**
 * @function createServer
 *
 * @description Create HTTP Server
 *
 * @param {number} port Port to register the Server against
 * @param modules list of Modules to be registered
 * @returns {Promise<Server>} Returns the Server object
 */
const createServer = async (port, modules) => {
  const server = await new Hapi.Server({
    port,
    routes: {
      validate: {
        options: ErrorHandling.validateRoutes(),
        failAction: async (request, h, err) => {
          throw Boom.boomify(err)
        }
      }
    },
    cache: [
      {
        name: 'endpointCache',
        engine: require('catbox-memory'),
        partition: 'cache'
      }
    ]
  })

  await Plugins.registerPlugins(server)
  await server.register(modules)

  server.method({
    name: 'getEndpoints',
    method: getEndpoints,
    options: {
      cache: {
        cache: 'endpointCache',
        expiresIn: Config.ENDPOINT_CACHE.expiresIn * SECOND,
        generateTimeout: Config.ENDPOINT_CACHE.generateTimeout * SECOND
      }
    }
  })
  await server.start()
  Logger.debug('Server running at: ', server.info.uri)
  return server
}

/**
 * @function createHandlers
 *
 * @description Create method to register specific Handlers specified by the Module list as part of the Setup process
 *
 * @typedef handler
 * @type {Object}
 * @property {string} type The type of Handler to be registered
 * @property {boolean} enabled True|False to indicate if the Handler should be registered
 * @property {string[]} [fspList] List of FSPs to be registered
 *
 * @param {handler[]} handlers List of Handlers to be registered
 * @returns {Promise<boolean>} Returns true if Handlers were registered
 */
const createHandlers = async (handlers, server) => {
  let handlerIndex
  let registerdHandlers = {
    connection: {},
    register: {},
    ext: {},
    start: new Date(),
    info: {},
    handlers: handlers
  }

  for (handlerIndex in handlers) {
    var handler = handlers[handlerIndex]
    if (handler.enabled) {
      Logger.info(`Handler Setup - Registering ${JSON.stringify(handler)}!`)
      switch (handler.type) {
        case 'notification':
          await RegisterHandlers.registerNotificationHandler(server)
          break
        default:
          var error = `Handler Setup - ${JSON.stringify(handler)} is not a valid handler to register!`
          Logger.error(error)
          throw new Error(error)
      }
    }
  }

  return registerdHandlers
}

/**
 * @function initialize
 *
 * @description Setup method for API, Admin and Handlers. Note that the Migration scripts are called before connecting to the database to ensure all new tables are loaded properly.
 *
 * @typedef handler
 * @type {Object}
 * @property {string} type The type of Handler to be registered
 * @property {boolean} enabled True|False to indicate if the Handler should be registered
 * @property {string[]} [fspList] List of FSPs to be registered
 *
 * @param {string} service Name of service to start. Available choices are 'api', 'admin', 'handler'
 * @param {number} port Port to start the HTTP Server on
 * @param {object[]} modules List of modules to be loaded by the HTTP Server
 * @param {boolean} runMigrations True to run Migration script, false to ignore them, only applicable for service types that are NOT 'handler'
 * @param {boolean} runHandlers True to start Handlers, false to ignore them
 * @param {handler[]} handlers List of Handlers to be registered
 * @returns {object} Returns HTTP Server object
 */
const initialize = async function ({ service, port, modules = [], runHandlers = false, handlers = [] }) {
  let server
  switch (service) {
    case 'api':
      server = await createServer(port, modules)
      break
    case 'handler':
      if (!Config.HANDLERS_API_DISABLED) {
        server = await createServer(port, modules)
      }
      break
    default:
      Logger.error(`No valid service type ${service} found!`)
      throw new Error(`No valid service type ${service} found!`)
  }

  if (runHandlers) {
    if (Array.isArray(handlers) && handlers.length > 0) {
      await createHandlers(handlers, server)
    } else {
      await RegisterHandlers.registerAllHandlers(server)
    }
  }

  return server
}

/**
* @function fetchEndpoints
*
* @description This calls the central-ledger service to fetch the endpoints for fsp
*
* @param {string} fsp The fsp id
* @returns {object} Returns the object containing the endpoints for given fsp id
*/
const fetchEndpoints = async (fsp) => {
  const url = Mustache.render(Config.ENDPOINT_CACHE.url, { fsp })
  const requestOptions = {
    url,
    method: 'get',
    agentOptions: {
      rejectUnauthorized: false
    }
  }
  Logger.debug(`[fsp=${fsp}] ~ Setup::fetchEndpoints := fetching the endpoints from the resource with options: ${requestOptions}`)

  return new Promise((resolve, reject) => {
    return request(requestOptions, (error, response, body) => {
      if (error) {
        // throw error // this is not correct in the context of a Promise.
        Logger.error(`[fsp=${fsp}] ~ Setup::fetchEndpoints := Callback failed with error: ${error}, response: ${JSON.stringify(response)}`)
        return reject(error)
      }
      Logger.info(`[fsp=${fsp}] ~ Setup::fetchEndpoints := Callback successful with body: ${response.body}`)
      Logger.debug(`[fsp=${fsp}] ~ Setup::fetchEndpoints := Callback successful with response: ${JSON.stringify(response)}`)
      return resolve(JSON.parse(response.body))
    })
  })
}

/**
 * @function getEndpoints
 *
 * @description This populates the cache of endpoints
 *
 * @param {string} id The fsp id
 * @returns {object} endpointMap Returns the object containing the endpoints for given fsp id
 */

const getEndpoints = async (id) => {
  Logger.info(`[fsp=${id}] ~ Setup::getEndpoints := Refreshing the cache for FSP: ${id}`)
  Logger.debug(`[fsp=${id}] ~ Setup::getEndpoints := Refreshing the cache for FSP: ${id}`)

  const endpoints = await fetchEndpoints(id)

  let endpointMap = {}

  if (Array.isArray(endpoints)) {
    endpoints.forEach(item => {
      endpointMap[item.type] = item.value
    })
  }

  Logger.debug(`[fsp=${id}] ~ Setup::getEndpoints := Returning the endpoints: ${endpointMap}`)
  return endpointMap
}

module.exports = {
  initialize,
  createServer,
  fetchEndpoints,
  getEndpoints
}
