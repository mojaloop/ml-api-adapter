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

 - Shashikant Hiruagde <shashikant.hirugade@modusbox.com>
 --------------
 ******/

'use strict'

const Hapi = require('@hapi/hapi')
const Boom = require('@hapi/boom')
const ErrorHandling = require('@mojaloop/central-services-error-handling')
const Logger = require('@mojaloop/central-services-logger')
const { Endpoints, HeaderValidation } = require('@mojaloop/central-services-shared').Util
const Metrics = require('@mojaloop/central-services-metrics')
const Enums = require('@mojaloop/central-services-shared').Enum
const OpenapiBackend = require('@mojaloop/central-services-shared').Util.OpenapiBackend
const Kafka = require('@mojaloop/central-services-stream').Util

const Plugins = require('./plugins')
const RegisterHandlers = require('../handlers/register')
const Config = require('../lib/config')
const { getProducerConfigs } = require('../lib/kafka/producer')
const Util = require('../lib/util')
const Handlers = require('../api/handlers')
const HandlerModeHandlers = require('../handlers/api/handlers')
const { createPayloadCache } = require('../lib/payloadCache')
const { PAYLOAD_STORAGES } = require('../lib/payloadCache/constants')

const hubNameRegex = HeaderValidation.getHubNameRegex(Config.HUB_NAME)

/**
 * Generate Hapi routes from OpenAPI spec operations
 * @param {object} api OpenAPIBackend instance
 * @returns {array} Hapi route definitions
 */
const generateHapiRoutes = (api) => {
  const handleRequest = (req, h) => api.handleRequest(
    {
      method: req.method,
      path: req.path,
      body: req.payload,
      query: req.query,
      headers: req.headers
    },
    req,
    h
  )

  /* istanbul ignore next */
  return api.router.getOperations()
    .filter(operation => operation.path !== '/metrics') // the route is added by Metrics Plugin
    .map(operation => ({
      method: operation.method.toUpperCase(),
      path: operation.path,
      handler: handleRequest,
      config: {
        tags: ['api', ...(operation.tags || [])],
        description: operation.summary || operation.operationId || 'No route description'
      }
    }))
}

/**
 * @description Create HTTP Server
 *
 * @param {number} port Port to register the Server against
 * @param {object} api OpenAPIBackend instance
 * @param {array} routes array of API routes
 * @param {array} modules list of Modules to be registered
 * @returns {Promise<Server>} Returns the Server object
 */
const createServer = async (port, api, routes, modules) => {
  /* istanbul ignore next */
  const server = await new Hapi.Server({
    port,
    routes: {
      validate: {
        options: ErrorHandling.validateRoutes(),
        failAction: async (request, h, err) => {
          throw Boom.boomify(err)
        }
      },
      payload: {
        parse: true,
        output: 'stream'
      }
    }
  })

  if (Config.PAYLOAD_CACHE.enabled) {
    Util.setProp(server, 'app.payloadCache', initializePayloadCache())
  }

  await Plugins.registerPlugins(server, api)
  await server.register(modules)
  server.route(routes)

  await server.start()
  Logger.isDebugEnabled && Logger.debug(`Server running at: ${server.info.uri}`)
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
const createHandlers = async (handlers) => {
  let handlerIndex
  const registeredHandlers = {
    connection: {},
    register: {},
    ext: {},
    start: new Date(),
    info: {},
    handlers
  }

  for (handlerIndex in handlers) {
    const handler = handlers[handlerIndex]
    if (handler.enabled) {
      Logger.isInfoEnabled && Logger.info(`Handler Setup - Registering ${JSON.stringify(handler)}!`)
      if (handler.type === Enums.Kafka.Topics.NOTIFICATION) {
        await Endpoints.initializeCache(Config.ENDPOINT_CACHE_CONFIG, { hubName: Config.HUB_NAME, hubNameRegex })
        await RegisterHandlers.registerNotificationHandler({ payloadCache: initializePayloadCache() })
      } else {
        const error = `Handler Setup - ${JSON.stringify(handler)} is not a valid handler to register!`
        const fspiopError = ErrorHandling.Factory.createInternalServerFSPIOPError(error)
        Logger.isErrorEnabled && Logger.error(fspiopError)
        throw fspiopError
      }
    }
  }
  return registeredHandlers
}

// Returns an instance of the PayloadCache if the feature is enabled
const initializePayloadCache = () => {
  if (Config.PAYLOAD_CACHE.enabled && Config.ORIGINAL_PAYLOAD_STORAGE === PAYLOAD_STORAGES.redis) {
    return createPayloadCache(Config.PAYLOAD_CACHE.type, Config.PAYLOAD_CACHE.connectionConfig)
  }
}

const initializeInstrumentation = () => {
  if (!Config.INSTRUMENTATION_METRICS_DISABLED) {
    Metrics.setup(Config.INSTRUMENTATION_METRICS_CONFIG)
  }
}

const initializeProducers = async () => {
  await Kafka.Producer.connectAll(getProducerConfigs())
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
  initializeInstrumentation()
  switch (service) {
    case Enums.Http.ServiceType.API: {
      const OpenAPISpecPath = Util.pathForInterface({ isHandlerInterface: false })
      const api = await OpenapiBackend.initialise(OpenAPISpecPath, Handlers.ApiHandlers)
      server = await createServer(port, api, generateHapiRoutes(api), modules)
      await initializeProducers()
      break
    }
    case Enums.Http.ServiceType.HANDLER: {
      if (!Config.HANDLERS_API_DISABLED) {
        const OpenAPISpecPath = Util.pathForInterface({ isHandlerInterface: true })
        const api = await OpenapiBackend.initialise(OpenAPISpecPath, HandlerModeHandlers.KafkaModeHandlerApiHandlers)
        server = await createServer(port, api, generateHapiRoutes(api), modules)
      }
      break
    }
    default: {
      const fspiopError = ErrorHandling.Factory.createInternalServerFSPIOPError(`No valid service type ${service} found!`)
      Logger.isErrorEnabled && Logger.error(fspiopError)
      throw fspiopError
    }
  }
  if (runHandlers) {
    if (Array.isArray(handlers) && handlers.length > 0) {
      await createHandlers(handlers)
    } else {
      await Endpoints.initializeCache(Config.ENDPOINT_CACHE_CONFIG, { hubName: Config.HUB_NAME, hubNameRegex })
      await RegisterHandlers.registerAllHandlers({ payloadCache: initializePayloadCache() })
    }
  }

  return server
}

module.exports = {
  initialize,
  initializeProducers,
  createServer,
  getProducerConfigs,
  generateHapiRoutes
}
