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
 
 --------------
 ******/

'use strict'

const Hapi = require('hapi')
const ErrorHandling = require('@mojaloop/central-services-error-handling')
const P = require('bluebird')
const Migrator = require('../lib/migrator')
const Plugins = require('./plugins')
const Config = require('../lib/config')
const Sidecar = require('../lib/sidecar')
const RequestLogger = require('../lib/request-logger')
const Uuid = require('uuid4')
const UrlParser = require('../lib/urlparser')

const migrate = (runMigrations) => {
  return runMigrations ? Migrator.migrate() : P.resolve()
}

const createServer = (port, modules, addRequestLogging = true) => {
  return new P((resolve, reject) => {
    const server = new Hapi.Server()
    server.connection({
      port,
      routes: {
        validate: ErrorHandling.validateRoutes()
      }
    })

    if (addRequestLogging) {
      server.ext('onRequest', onServerRequest)
      server.ext('onPreResponse', onServerPreResponse)
    }

    Plugins.registerPlugins(server)
    server.register(modules)
    resolve(server)
  })
}

// Migrator.migrate is called before connecting to the database to ensure all new tables are loaded properly.
// Eventric.getContext is called to replay all events through projections (creating the read-model) before starting the server.
const initialize = ({ service, port, modules = [], loadEventric = false, runMigrations = false }) => {
  // ## Added to increase available threads for IO processing
  process.env.UV_THREADPOOL_SIZE = Config.UV_THREADPOOL_SIZE
  return migrate(runMigrations)
    .then(() => createServer(port, modules))
    .catch(err => {
      throw err
    })
}

const onServerRequest = (request, reply) => {
  const transferId = UrlParser.idFromTransferUri(`${Config.HOSTNAME}${request.url.path}`)
  request.headers.traceid = request.headers.traceid || transferId || Uuid()
  RequestLogger.logRequest(request)
  reply.continue()
}

const onServerPreResponse = (request, reply) => {
  RequestLogger.logResponse(request)
  reply.continue()
}

module.exports = {
  initialize,
  createServer
}
