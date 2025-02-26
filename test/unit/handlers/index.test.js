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

const Test = require('tapes')(require('tape'))
const Sinon = require('sinon')
const Config = require('../../../src/lib/config')
const Proxyquire = require('proxyquire')
const MetricsPlugin = require('@mojaloop/central-services-metrics').plugin

Test('cli', async (cliTest) => {
  cliTest.beforeEach(test => {
    console.log('start')
    test.end()
  })

  cliTest.afterEach(test => {
    console.log('end')
    test.end()
  })

  cliTest.test('yes', async (test) => {
    test.end()
  })

  cliTest.test('Commander should', async (commanderTest) => {
    let sandbox
    // let Index
    let SetupStub

    commanderTest.beforeEach(test => {
      sandbox = Sinon.createSandbox()

      SetupStub = {
        initialize: sandbox.stub().returns(Promise.resolve())
      }

      process.argv = []
      Proxyquire.noPreserveCache() // enable no caching for module requires

      test.end()
    })

    commanderTest.afterEach(test => {
      sandbox.restore()
      Proxyquire.preserveCache()

      test.end()
    })

    commanderTest.test('start all Handlers up via all switches', async test => {
      const argv = [
        'node',
        'index.js',
        'handler',
        '--notification'
      ]

      process.argv = argv

      const Index = Proxyquire('../../../src/handlers/index', {
        '../shared/setup': SetupStub
      })

      const notificationHandler = {
        type: 'notification',
        enabled: true
      }

      const modulesList = [
        notificationHandler
      ]

      const initOptions = {
        service: 'handler',
        port: Config.PORT,
        modules: [MetricsPlugin],
        handlers: modulesList,
        runHandlers: true
      }

      test.ok(Index)
      test.ok(SetupStub.initialize.calledWith(initOptions))
      test.end()
    })

    commanderTest.test('start all prepare Handlers with no flags provided', async test => {
      const argv = [
        'node',
        'index.js',
        'handler'
      ]

      process.argv = argv

      const Index = Proxyquire('../../../src/handlers/index', {
        '../shared/setup': SetupStub
      })

      const modulesList = []

      const initOptions = {
        service: 'handler',
        port: Config.PORT,
        modules: [MetricsPlugin],
        handlers: modulesList,
        runHandlers: true
      }

      test.ok(Index)
      test.ok(SetupStub.initialize.calledWith(initOptions))
      test.end()
    })

    commanderTest.test('start all prepare Handlers up with invalid args', async test => {
      // stub process.exit
      sandbox.stub(process, 'exit')

      const argv = [
        'node',
        'index.js'
      ]

      process.argv = argv

      const Index = Proxyquire('../../../src/handlers/index', {
        '../shared/setup': SetupStub
      })

      test.ok(Index)
      test.notOk(SetupStub.initialize.called)
      test.ok(process.exit.called)
      test.end()
    })

    commanderTest.end()
  })

  cliTest.end()
})
