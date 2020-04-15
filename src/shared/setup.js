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

const Hapi = require('@hapi/hapi')
const ErrorHandling = require('@mojaloop/central-services-error-handling')
const Plugins = require('./plugins')
const Logger = require('@mojaloop/central-services-logger')
const Boom = require('@hapi/boom')
const RegisterHandlers = require('../handlers/register')
const Config = require('../lib/config')
const Endpoints = require('@mojaloop/central-services-shared').Util.Endpoints
const Metrics = require('@mojaloop/central-services-metrics')
const Enums = require('@mojaloop/central-services-shared').Enum
const Kafka = require('@mojaloop/central-services-stream').Util
const KafkaUtil = require('@mojaloop/central-services-shared').Util.Kafka
const generalEnum = require('@mojaloop/central-services-shared').Enum

/**
 * @module src/shared/setup
 */

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
      },
      payload: {
        parse: true,
        output: 'stream'
      }
    }
  })

  await Plugins.registerPlugins(server)
  await server.register(modules)

  await server.start()
  Logger.isDebugEnabled && Logger.debug('Server running at: ', server.info.uri)
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
    handlers: handlers
  }

  for (handlerIndex in handlers) {
    const handler = handlers[handlerIndex]
    if (handler.enabled) {
      Logger.isInfoEnabled && Logger.info(`Handler Setup - Registering ${JSON.stringify(handler)}!`)
      if (handler.type === Enums.Kafka.Topics.NOTIFICATION) {
        await Endpoints.initializeCache(Config.ENDPOINT_CACHE_CONFIG)
        await RegisterHandlers.registerNotificationHandler()
      } else {
        const error = `Handler Setup - ${JSON.stringify(handler)} is not a valid handler to register!`
        const fspiopError = ErrorHandling.Factory.createInternalServerFSPIOPError(error)
        Logger.error(fspiopError)
        throw fspiopError
      }
    }
  }
  return registeredHandlers
}

const initializeInstrumentation = () => {
  if (!Config.INSTRUMENTATION_METRICS_DISABLED) {
    Metrics.setup(Config.INSTRUMENTATION_METRICS_CONFIG)
  }
}

const initializeProducers = async () => {
  const configs = []
  configs.push({
    topicConfig: KafkaUtil.createGeneralTopicConf(Config.KAFKA_CONFIG.TOPIC_TEMPLATES.GENERAL_TOPIC_TEMPLATE.TEMPLATE, generalEnum.Events.Event.Action.TRANSFER, generalEnum.Events.Event.Action.PREPARE),
    kafkaConfig: KafkaUtil.getKafkaConfig(Config.KAFKA_CONFIG, generalEnum.Kafka.Config.PRODUCER, generalEnum.Events.Event.Action.TRANSFER.toUpperCase(), generalEnum.Events.Event.Action.PREPARE.toUpperCase())
  })

  configs.push({
    topicConfig: KafkaUtil.createGeneralTopicConf(Config.KAFKA_CONFIG.TOPIC_TEMPLATES.GENERAL_TOPIC_TEMPLATE.TEMPLATE, generalEnum.Events.Event.Action.TRANSFER, generalEnum.Events.Event.Action.FULFIL),
    kafkaConfig: KafkaUtil.getKafkaConfig(Config.KAFKA_CONFIG, generalEnum.Kafka.Config.PRODUCER, generalEnum.Events.Event.Action.TRANSFER.toUpperCase(), generalEnum.Events.Event.Action.FULFIL.toUpperCase())
  })

  configs.push({
    topicConfig: KafkaUtil.createGeneralTopicConf(Config.KAFKA_CONFIG.TOPIC_TEMPLATES.GENERAL_TOPIC_TEMPLATE.TEMPLATE, generalEnum.Events.Event.Action.TRANSFER, generalEnum.Events.Event.Action.GET),
    kafkaConfig: KafkaUtil.getKafkaConfig(Config.KAFKA_CONFIG, generalEnum.Kafka.Config.PRODUCER, generalEnum.Events.Event.Action.TRANSFER.toUpperCase(), generalEnum.Events.Event.Action.GET.toUpperCase())
  })
  await Kafka.Producer.connectAll(configs)
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
      server = await createServer(port, modules)
      await initializeProducers()
      break
    }
    case Enums.Http.ServiceType.HANDLER: {
      if (!Config.HANDLERS_API_DISABLED) {
        server = await createServer(port, modules)
      }
      break
    }
    default: {
      const fspiopError = ErrorHandling.Factory.createInternalServerFSPIOPError(`No valid service type ${service} found!`)
      Logger.error(fspiopError)
      throw fspiopError
    }
  }
  if (runHandlers) {
    if (Array.isArray(handlers) && handlers.length > 0) {
      await createHandlers(handlers)
    } else {
      await Endpoints.initializeCache(Config.ENDPOINT_CACHE_CONFIG)
      await RegisterHandlers.registerAllHandlers()
    }
  }

  return server
}

module.exports = {
  initialize,
  createServer
}
