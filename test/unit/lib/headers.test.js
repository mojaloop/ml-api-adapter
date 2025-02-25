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

 * Georgi Georgiev <georgi.georgiev@modusbox.com>
 --------------
 ******/
'use strict'

const Proxyquire = require('proxyquire')
const Test = require('tapes')(require('tape'))
const Util = require('@mojaloop/central-services-shared').Util
const Headers = require('../../../src/lib/headers')
const Mustache = require('mustache')
const Config = require('../../../src/lib/config')

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
    createCallbackHeadersTest.test('change headers to lower-case, replace source with `SWITCH` for a POST /transfers request', test => {
      const fromSwitch = true
      const params = {
        httpMethod: 'POST',
        headers: {
          'fspiop-source': 'payer',
          'fspiop-destination': 'payee'
        }
      }
      Mustache.render = sandbox.stub().returns('http://fspiop-uri/transfers')
      const expected = {
        'fspiop-http-method': 'POST',
        'fspiop-uri': '/transfers',
        'fspiop-source': Config.HUB_NAME,
        'fspiop-destination': 'payee'
      }
      const result = Headers.createCallbackHeaders(params, fromSwitch)

      test.deepEqual(result, expected)
      test.end()
    })

    createCallbackHeadersTest.test('change headers to lower-case, replace source with `SWITCH` for a PUT transfer/{transferId} callback', test => {
      const fromSwitch = true
      const params = {
        httpMethod: 'PUT',
        headers: {
          'fspiop-source': 'payer',
          'fspiop-destination': 'payee'
        }
      }
      Mustache.render = sandbox.stub().returns('http://fspiop-uri/transfers/5ac51bd9-0be4-4256-876b-070b44b438cb/error')
      const expected = {
        'fspiop-http-method': 'PUT',
        'fspiop-uri': '/transfers/5ac51bd9-0be4-4256-876b-070b44b438cb/error',
        'fspiop-source': Config.HUB_NAME,
        'fspiop-destination': 'payee'
      }
      const result = Headers.createCallbackHeaders(params, fromSwitch)

      test.deepEqual(result, expected)
      test.end()
    })

    createCallbackHeadersTest.test('change headers to lower-case, replace source with `SWITCH` and delete signature', test => {
      const fromSwitch = true
      const params = {
        httpMethod: 'PUT',
        headers: {
          'fspiop-source': 'payer',
          'fspiop-destination': 'payee',
          'FSPIOP-Signature': 'DELETEME'
        }
      }
      Mustache.render = sandbox.stub().returns('http://fspiop-uri/transfers/5ac51bd9-0be4-4256-876b-070b44b438cb/error')
      const expected = {
        'fspiop-http-method': 'PUT',
        'fspiop-uri': '/transfers/5ac51bd9-0be4-4256-876b-070b44b438cb/error',
        'fspiop-source': Config.HUB_NAME,
        'fspiop-destination': 'payee'
      }
      const result = Headers.createCallbackHeaders(params, fromSwitch)

      test.deepEqual(result, expected)
      test.end()
    })

    createCallbackHeadersTest.test('map existing headers as-is', test => {
      const fromSwitch = false
      const params = {
        httpMethod: 'PUT',
        headers: {
          'fspiop-source': 'payer',
          'fspiop-destination': 'payee',
          'FSPIOP-Signature': 'DELETEME'
        }
      }
      Mustache.render = sandbox.stub().returns('http://fspiop-uri/transfers/5ac51bd9-0be4-4256-876b-070b44b438cb/error')
      const expected = {
        'fspiop-http-method': 'PUT',
        'fspiop-uri': '/transfers/5ac51bd9-0be4-4256-876b-070b44b438cb/error',
        'fspiop-source': 'payer',
        'fspiop-destination': 'payee',
        'FSPIOP-Signature': 'DELETEME'
      }
      const result = Headers.createCallbackHeaders(params, fromSwitch)

      test.deepEqual(result, expected)
      test.end()
    })

    createCallbackHeadersTest.test('transform content-type header in ISO mode for transfers', test => {
      const ConfigStub = Util.clone(Config)
      ConfigStub.IS_ISO_MODE = true
      ConfigStub.API_TYPE = 'iso20022'
      const HeadersProxy = Proxyquire('../../../src/lib/headers', {
        '../lib/config': ConfigStub
      })
      const fromSwitch = true
      const params = {
        httpMethod: 'PUT',
        headers: {
          'fspiop-source': 'payer',
          'fspiop-destination': 'payee',
          'content-type': 'application/vnd.interoperability.transfers+json;version=1.0'
        }
      }
      Mustache.render = sandbox.stub().returns('http://fspiop-uri/transfers')
      const expected = {
        'fspiop-http-method': 'PUT',
        'fspiop-uri': '/transfers',
        'fspiop-source': Config.HUB_NAME,
        'fspiop-destination': 'payee',
        'content-type': 'application/vnd.interoperability.iso20022.transfers+json;version=2.0'
      }
      const result = HeadersProxy.createCallbackHeaders(params, fromSwitch)

      test.deepEqual(result, expected)
      test.end()
    })

    createCallbackHeadersTest.test('transform content-type header in ISO mode for fx transfers', test => {
      const ConfigStub = Util.clone(Config)
      ConfigStub.IS_ISO_MODE = true
      ConfigStub.API_TYPE = 'iso20022'
      const HeadersProxy = Proxyquire('../../../src/lib/headers', {
        '../lib/config': ConfigStub
      })
      const fromSwitch = true
      const params = {
        httpMethod: 'PUT',
        headers: {
          'fspiop-source': 'payer',
          'fspiop-destination': 'payee',
          'content-type': 'application/vnd.interoperability.fxTransfers+json;version=1.1'
        }
      }
      Mustache.render = sandbox.stub().returns('http://fspiop-uri/fxTransfers')
      const expected = {
        'fspiop-http-method': 'PUT',
        'fspiop-uri': '/fxTransfers',
        'fspiop-source': Config.HUB_NAME,
        'fspiop-destination': 'payee',
        'content-type': 'application/vnd.interoperability.iso20022.fxTransfers+json;version=2.0'
      }
      const result = HeadersProxy.createCallbackHeaders(params, fromSwitch)

      test.deepEqual(result, expected)
      test.end()
    })

    createCallbackHeadersTest.end()
  })

  headersTest.test('getHeaderCaseInsensitiveKey should', async getHeaderCaseInsensitiveKeyTest => {
    getHeaderCaseInsensitiveKeyTest.test('return null if object is null', test => {
      const headers = null
      const key = 'not null'

      const result = Headers.getHeaderCaseInsensitiveKey(headers, key)

      test.ok(result == null)
      test.end()
    })

    getHeaderCaseInsensitiveKeyTest.test('return null if searchKey is null', test => {
      const headers = {
        'fspiop-source': 'payer',
        'fspiop-destination': 'payee'
      }
      const key = null

      const result = Headers.getHeaderCaseInsensitiveKey(headers, key)

      test.ok(result == null)
      test.end()
    })

    getHeaderCaseInsensitiveKeyTest.end()
  })

  headersTest.test('getHeaderCaseInsensitiveValue should', async getHeaderCaseInsensitiveValueTest => {
    getHeaderCaseInsensitiveValueTest.test('return null if object is null', test => {
      const headers = null
      const key = 'not null'

      const result = Headers.getHeaderCaseInsensitiveValue(headers, key)

      test.ok(result == null)
      test.end()
    })

    getHeaderCaseInsensitiveValueTest.test('return null if searchKey is null', test => {
      const headers = {
        'fspiop-source': 'payer',
        'fspiop-destination': 'payee'
      }
      const key = null

      const result = Headers.getHeaderCaseInsensitiveValue(headers, key)

      test.ok(result == null)
      test.end()
    })

    getHeaderCaseInsensitiveValueTest.end()
  })

  headersTest.end()
})
