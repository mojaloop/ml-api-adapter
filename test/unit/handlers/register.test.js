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

const Test = require('tapes')(require('tape'))
const Sinon = require('sinon')
const Handlers = require('../../../src/handlers/register')
const NotificationHandler = require('../../../src/handlers/notification')

Test('handlers', handlersTest => {
  let sandbox

  handlersTest.beforeEach(test => {
    sandbox = Sinon.createSandbox()
    test.end()
  })

  handlersTest.afterEach(test => {
    sandbox.restore()
    test.end()
  })

  handlersTest.test('handlers test should', registerAllTest => {
    registerAllTest.test('register all handlers', async (test) => {
      sandbox.stub(NotificationHandler, 'startConsumer').returns(Promise.resolve(true))
      const result = await Handlers.registerAllHandlers()
      test.ok(NotificationHandler.startConsumer.called)
      test.equal(result, true)
      test.end()
    })

    registerAllTest.test('throw error when transfer handler throws error', async (test) => {
      const error = new Error('Here be dragons!')
      try {
        Sinon.stub(NotificationHandler, 'startConsumer').throws(error)
        await Handlers.registerAllHandlers()
        test.fail('Error not thrown')
        test.end()
      } catch (e) {
        test.ok(NotificationHandler.startConsumer.called)
        test.ok(e === error)
        test.pass('Error thrown')
        test.end()
      }
    })

    registerAllTest.end()
  })

  handlersTest.end()
})
