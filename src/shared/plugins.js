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

const Package = require('../../package')
const Inert = require('inert')
const Vision = require('vision')
const Blipp = require('blipp')
const Good = require('good')

const HapiSwagger = require('hapi-swagger')
const Logger = require('@mojaloop/central-services-shared').Logger
const ErrorHandling = require('@mojaloop/central-services-error-handling')
const Auth = require('@mojaloop/central-services-auth')

const registerPlugins = (server) => {
  server.register({
    register: HapiSwagger,
    options: {
      info: {
        'title': 'Central Ledger API Documentation',
        'version': Package.version
      }
    }
  })

  server.register({
    register: Good,
    options: {
      ops: {
        interval: 1000
      },
      reporters: {
        // winston: [{
        //   module: 'good-winston',
        //   args: [
        //     Logger,
        //     {
        //       error_level: 'error',
        //       ops_level: 'debug',
        //       request_level: 'debug',
        //       response_level: 'info',
        //       other_level: 'info'
        //     }
        //   ]
        // }]
      }
    }
  })

  server.register([Inert, Vision, Blipp, ErrorHandling, Auth])
}

module.exports = {
  registerPlugins
}
