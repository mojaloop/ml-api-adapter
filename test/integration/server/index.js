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
 --------------
 ******/

'use strict'

const Hapi = require('@hapi/hapi')
const ErrorHandling = require('@mojaloop/central-services-error-handling')
const Boom = require('@hapi/boom')
const Routes = require('./routes')
const RawPayloadToDataUriPlugin = require('@mojaloop/central-services-shared').Util.Hapi.HapiRawPayload
const Logger = require('@mojaloop/central-services-logger')

const Enum = require('@mojaloop/central-services-shared').Enum
const regexAccept = Enum.Http.Headers.GENERAL.ACCEPT.regex
const regexContentType = Enum.Http.Headers.GENERAL.ACCEPT.regex

const createServer = (port, modules) => {
  return (async () => {
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
          output: 'stream',
          multipart: true
        }
      }
    })
    await server.register(modules)
    await server.register({
      plugin: require('@hapi/good'),
      options: {
        ops: {
          interval: 10000
        }
      }
    })

    server.ext('onRequest', function (request, h) {
      if (regexContentType.test(request.headers['content-type'])) {
        request.headers['x-content-type'] = request.headers['content-type']
        request.headers['content-type'] = 'application/json'
      }
      if (regexAccept.test(request.headers.accept)) {
        request.headers['x-accept'] = request.headers.accept
        request.headers.accept = 'application/json'
      }
      return h.continue
    })

    await server.start()
    Logger.info(`Test Server started at ${server.info.uri}`)
    return server
  })()
}

module.exports = createServer(4545, [Routes, RawPayloadToDataUriPlugin])
