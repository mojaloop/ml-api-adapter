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
 --------------
 ******/
'use strict'

const Test = require('tapes')(require('tape'))
const Headers = require('../../../src/lib/headers')
const Mustache = require('mustache')

Test('Headers tests', headersTest => {
  let sandbox
  const Sinon = require('sinon')

  headersTest.beforeEach(t => {
    sandbox = Sinon.createSandbox()
    sandbox.stub(Mustache, 'render')
    t.end()
  })

  headersTest.afterEach(t => {
    sandbox.restore()
    t.end()
  })

  headersTest.test('createCallbackHeaders should', async createCallbackHeadersTest => {
    createCallbackHeadersTest.test('test', test => {
      const fromSwitch = true
      const params = {
        httpMethod: 'PUT'
      }
      Mustache.render = sandbox.stub().returns('http://fspiop-uri/participants')
      const expected = {
        'fspiop-http-method': 'PUT',
        'fspiop-uri': '/participants'
      }
      const result = Headers.createCallbackHeaders(params, fromSwitch)

      test.deepEqual(result, expected)
      test.end()
    })

    createCallbackHeadersTest.test('test', test => {
      const fromSwitch = true
      const params = {
        httpMethod: 'PUT'
      }
      Mustache.render = sandbox.stub().returns('http://fspiop-uri/transfers/5ac51bd9-0be4-4256-876b-070b44b438cb/error')
      const expected = {
        'fspiop-http-method': 'PUT',
        'fspiop-uri': '/transfers/5ac51bd9-0be4-4256-876b-070b44b438cb/error'
      }
      const result = Headers.createCallbackHeaders(params, fromSwitch)

      test.deepEqual(result, expected)
      test.end()
    })

    createCallbackHeadersTest.end()
  })

  headersTest.end()
})
