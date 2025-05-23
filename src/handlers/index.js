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

 * Miguel de Barros <miguel.debarros@modusbox.com>

 --------------
 ******/

'use strict'

/**
 * @module Handlers CLI Startup
 */

const Logger = require('@mojaloop/central-services-logger')
const Enums = require('@mojaloop/central-services-shared').Enum
const Config = require('../lib/config')
const Setup = require('../shared/setup')
const PJson = require('../../package.json')
const MetricsPlugin = require('@mojaloop/central-services-metrics').plugin
const { Command } = require('commander')

const Program = new Command()

Program
  .version(PJson.version)
  .description('CLI to manage Handlers')

Program.command('handler') // sub-command name, coffeeType = type, required
  .alias('h') // alternative sub-command is `h`
  .description('Start a specified Handler') // command description
  .option('--notification', 'Start the Notification Handler')
  .action(async (args) => {
    const handlerList = []
    if (args.notification && typeof args.notification === 'boolean') {
      Logger.isDebugEnabled && Logger.debug('CLI: Executing --notification')
      const handler = {
        type: 'notification',
        enabled: true
      }
      handlerList.push(handler)
    }
    module.exports = Setup.initialize({
      service: Enums.Http.ServiceType.HANDLER,
      port: Config.PORT,
      modules: [!Config.INSTRUMENTATION_METRICS_DISABLED && MetricsPlugin].filter(Boolean),
      handlers: handlerList,
      runHandlers: true
    })
  })

if (Array.isArray(process.argv) && process.argv.length > 2) {
  // parse command line vars
  Program.parse(process.argv)
} else {
  // display default help
  Program.help()
}
