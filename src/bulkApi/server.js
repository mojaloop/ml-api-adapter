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

 * Georgi Georgiev <georgi.georgiev@modusbox.com>
 * Valentin Genev <valentin.genev@modusbox.com>
 --------------
 ******/
'use strict'

const Hapi = require('hapi')
const HapiOpenAPI = require('hapi-openapi')
const Path = require('path')
const Boom = require('@hapi/boom')
const Logger = require('@mojaloop/central-services-shared').Logger
const ObjStoreDb = require('@mojaloop/central-object-store').Db
const Config = require('../lib/config')

const connectMongoose = async () => {
  try {
    let db = await ObjStoreDb.connect(Config.MONGODB_URI, {
      promiseLibrary: global.Promise
    })
    return db
  } catch (error) {
    Logger.error(`error - ${error}`) // TODO: ADD PROPER ERROR HANDLING HERE POST-POC
    return null
  }
}

const init = async function (options) {
  const { port } = options
  const server = new Hapi.Server({
    port,
    routes: {
      validate: {
        failAction: async (request, h, err) => {
          throw Boom.boomify(err)
        }
      }
    }
  })
  let db = await connectMongoose()
  server.app.db = db
  await server.register({
    plugin: HapiOpenAPI,
    options: {
      api: Path.resolve(__dirname, './config/swagger.yaml'),
      handlers: Path.resolve(__dirname, './handlers')
    }
  })
  await server.start()
  return server
}

const initialize = (options) => {
  init(options).then((server) => {
    server.plugins.openapi.setHost(server.info.host + ':' + server.info.port)
    Logger.info(`Server running at: ${server.info.host}:${server.info.port}`)
    server.log(['info'], `Server running at: ${server.info.host}:${server.info.port}`)
    return server
  })
}

module.exports = ({ initialize })
