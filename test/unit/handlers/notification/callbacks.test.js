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

const src = '../../../../src'
const Test = require('tapes')(require('tape'))
const Sinon = require('sinon')
const Logger = require('@mojaloop/central-services-shared').Logger
const proxyquire = require('proxyquire')
const Config = require(`${src}/lib/config.js`)

Test('Callback Service tests', callbacksTest => {
  let sandbox, callback, request

  callbacksTest.beforeEach(t => {
    sandbox = Sinon.createSandbox()
    request = sandbox.stub()
    sandbox.stub(Logger)
    callback = proxyquire('../../../../src/handlers/notification/callbacks.js', { 'request': request })

    t.end()
  })

  callbacksTest.afterEach(t => {
    sandbox.restore()
    t.end()
  })

  callbacksTest.test('sendCallback should', async sendCallbackTest => {
    sendCallbackTest.test('handle the post request and return 200 status code', async test => {
      const message = {
        value: {
          metadata: {
            event: {
              type: 'prepare',
              action: 'prepare',
              status: 'success'
            }
          },
          content: {
            headers: {},
            payload: {}
          },
          to: 'dfsp2',
          from: 'dfsp1'
        }
      }
      const url = Config.DFSP_URLS['dfsp2'].transfers
      const method = 'post'
      const headers = {
        'Content-Length': 1234,
        'Random': 'string'
      }
      const agentOptions = {
        rejectUnauthorized: false
      }

      const expected = 200

      const body = JSON.stringify(message)

      request.withArgs({ url, method, body, headers, agentOptions }).yields(null, { statusCode: 200 }, null)

      let result = await callback.sendCallback(url, method, headers, message)
      test.equal(result, expected)
      test.end()
    })

    sendCallbackTest.test('throw the error on error while calling the endpoint', async test => {
      const message = {
        value: {
          metadata: {
            event: {
              type: 'prepare',
              action: 'prepare',
              status: 'success'
            }
          },
          content: {
            headers: {},
            payload: {}
          },
          to: 'dfsp2',
          from: 'dfsp1'
        }
      }
      const url = Config.DFSP_URLS['dfsp2'].transfers
      const method = 'post'
      const headers = {
        'Content-Length': 1234,
        'Random': 'string'
      }

      const agentOptions = {
        rejectUnauthorized: false
      }

      const body = JSON.stringify(message)
      const error = new Error()

      request.withArgs({ url, method, body, headers, agentOptions }).yields(error, null, null)

      try {
        await callback.sendCallback(url, method, headers, message)
      } catch (e) {
        test.ok(e instanceof Error)
        test.end()
      }
    })

    sendCallbackTest.end()
  })

  callbacksTest.end()
})
