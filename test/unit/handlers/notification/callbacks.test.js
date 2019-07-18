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

 - Shashikant Hirugade <shashikant.hirugade@modusbox.com>
 --------------
 ******/

'use strict'

const Test = require('tapes')(require('tape'))
const Sinon = require('sinon')
const Logger = require('@mojaloop/central-services-shared').Logger
const proxyquire = require('proxyquire')
const Config = require('../../../../src/lib/config')
const Enum = require('../../../../src/lib/enum')

const sourceFsp = 'sourceFsp'
const destinationFsp = 'destinationFsp'
const cid = '1234567890'

Test('Callback Service tests', callbacksTest => {
  let sandbox, callback, request
  const url = 'http://somehost:port/'

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

      const method = 'post'

      let headers = {
        'Content-Length': 1234,
        'Random': 'string'
      }
      headers[Enum.headers.FSPIOP.SOURCE] = sourceFsp

      let expectedHeaders = {
        'Random': 'string'
      }
      expectedHeaders[Enum.headers.FSPIOP.DESTINATION] = destinationFsp
      expectedHeaders[Enum.headers.FSPIOP.SOURCE] = sourceFsp

      const agentOptions = {
        rejectUnauthorized: Config.ENDPOINT_SECURITY_TLS.rejectUnauthorized
      }

      const expected = 200

      const requestOptions = {
        url,
        method,
        headers: expectedHeaders,
        body: message,
        agentOptions
      }

      request.withArgs(requestOptions).yieldsAsync(null, { statusCode: 200 }, null)
      let result = {}
      try {
        result = await callback.sendCallback(url, method, headers, message, cid, sourceFsp, destinationFsp)
        test.equal(result, expected)
        test.end()
      } catch (err) {
        Logger.error(err)
        test.fail(`Test failed with error - ${err}`)
        test.end()
      }
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

      const method = 'post'

      let headers = {
        'Content-Length': 1234,
        'Random': 'string'
      }
      headers[Enum.headers.FSPIOP.SOURCE] = sourceFsp

      let expectedHeaders = {
        'Random': 'string'
      }
      expectedHeaders[Enum.headers.FSPIOP.DESTINATION] = destinationFsp
      expectedHeaders[Enum.headers.FSPIOP.SOURCE] = sourceFsp

      const agentOptions = {
        rejectUnauthorized: Config.ENDPOINT_SECURITY_TLS.rejectUnauthorized
      }

      const requestOptions = {
        url,
        method,
        headers: expectedHeaders,
        body: message,
        agentOptions
      }

      const error = new Error()

      request.withArgs(requestOptions).yields(error, null, null)

      try {
        await callback.sendCallback(url, method, headers, message, cid, sourceFsp, destinationFsp)
        test.fail('test failed without throwing an error')
        test.end()
      } catch (e) {
        test.ok(e instanceof Error)
        test.end()
      }
    })

    sendCallbackTest.test('throw the error on error when no url is provided', async test => {
      try {
        await callback.sendCallback()
        test.fail('test failed without throwing an error')
        test.end()
      } catch (e) {
        test.ok(e instanceof Error)
        test.equal(e.message, Enum.errorMessages.MISSINGFUNCTIONPARAMETERS)
        test.end()
      }
    })

    sendCallbackTest.test('throw the error on error when no method is provided', async test => {
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

      const method = 'post'

      let headers = {
        'Content-Length': 1234,
        'Random': 'string'
      }
      headers[Enum.headers.FSPIOP.SOURCE] = sourceFsp

      let expectedHeaders = {
        'Random': 'string'
      }
      expectedHeaders[Enum.headers.FSPIOP.DESTINATION] = destinationFsp
      expectedHeaders[Enum.headers.FSPIOP.SOURCE] = sourceFsp

      const agentOptions = {
        rejectUnauthorized: Config.ENDPOINT_SECURITY_TLS.rejectUnauthorized
      }

      const requestOptions = {
        url,
        method,
        headers: expectedHeaders,
        body: JSON.stringify(message),
        agentOptions
      }

      const error = new Error()

      request.withArgs(requestOptions).yields(error, null, null)

      try {
        await callback.sendCallback(url, method)
        test.fail('test failed without throwing an error')
        test.end()
      } catch (e) {
        test.ok(e instanceof Error)
        test.equal(e.message, Enum.errorMessages.MISSINGFUNCTIONPARAMETERS)
        test.end()
      }
    })

    sendCallbackTest.test('throw the error on error when no headers is provided', async test => {
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

      const method = 'post'

      let headers = {
        'Content-Length': 1234,
        'Random': 'string'
      }
      headers[Enum.headers.FSPIOP.SOURCE] = sourceFsp

      let expectedHeaders = {
        'Random': 'string'
      }
      expectedHeaders[Enum.headers.FSPIOP.DESTINATION] = destinationFsp
      expectedHeaders[Enum.headers.FSPIOP.SOURCE] = sourceFsp

      const agentOptions = {
        rejectUnauthorized: Config.ENDPOINT_SECURITY_TLS.rejectUnauthorized
      }

      const requestOptions = {
        url,
        method,
        headers: expectedHeaders,
        body: message,
        agentOptions
      }

      const error = new Error()

      request.withArgs(requestOptions).yields(error, null, null)

      try {
        await callback.sendCallback(url, method, headers)
        test.fail('test failed without throwing an error')
        test.end()
      } catch (e) {
        test.ok(e instanceof Error)
        test.equal(e.message, Enum.errorMessages.MISSINGFUNCTIONPARAMETERS)
        test.end()
      }
    })

    sendCallbackTest.test('throw the error on error when no cid is provided', async test => {
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

      const method = 'post'

      let headers = {
        'Content-Length': 1234,
        'Random': 'string'
      }
      headers[Enum.headers.FSPIOP.SOURCE] = sourceFsp

      let expectedHeaders = {
        'Random': 'string'
      }
      expectedHeaders[Enum.headers.FSPIOP.DESTINATION] = destinationFsp
      expectedHeaders[Enum.headers.FSPIOP.SOURCE] = sourceFsp

      const agentOptions = {
        rejectUnauthorized: Config.ENDPOINT_SECURITY_TLS.rejectUnauthorized
      }

      const requestOptions = {
        url,
        method,
        headers: expectedHeaders,
        body: message,
        agentOptions
      }

      const error = new Error()

      request.withArgs(requestOptions).yields(error, null, null)

      try {
        await callback.sendCallback(url, method, headers, message)
        test.fail('test failed without throwing an error')
        test.end()
      } catch (e) {
        test.ok(e instanceof Error)
        test.equal(e.message, Enum.errorMessages.MISSINGFUNCTIONPARAMETERS)
        test.end()
      }
    })

    sendCallbackTest.test('throw the error on error when no sourceFsp is provided', async test => {
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

      const method = 'post'

      let headers = {
        'Content-Length': 1234,
        'Random': 'string'
      }
      headers[Enum.headers.FSPIOP.SOURCE] = sourceFsp

      let expectedHeaders = {
        'Random': 'string'
      }
      expectedHeaders[Enum.headers.FSPIOP.DESTINATION] = destinationFsp
      expectedHeaders[Enum.headers.FSPIOP.SOURCE] = sourceFsp

      const agentOptions = {
        rejectUnauthorized: Config.ENDPOINT_SECURITY_TLS.rejectUnauthorized
      }

      const requestOptions = {
        url,
        method,
        headers: expectedHeaders,
        body: JSON.stringify(message),
        agentOptions
      }

      const error = new Error()

      request.withArgs(requestOptions).yields(error, null, null)

      try {
        await callback.sendCallback(url, method, headers, message, cid)
        test.fail('test failed without throwing an error')
        test.end()
      } catch (e) {
        test.ok(e instanceof Error)
        test.equal(e.message, Enum.errorMessages.MISSINGFUNCTIONPARAMETERS)
        test.end()
      }
    })

    sendCallbackTest.test('throw the error on error when no destinationFsp is provided', async test => {
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

      const method = 'post'

      let headers = {
        'Content-Length': 1234,
        'Random': 'string'
      }
      headers[Enum.headers.FSPIOP.SOURCE] = sourceFsp

      let expectedHeaders = {
        'Random': 'string'
      }
      expectedHeaders[Enum.headers.FSPIOP.DESTINATION] = destinationFsp
      expectedHeaders[Enum.headers.FSPIOP.SOURCE] = sourceFsp

      const agentOptions = {
        rejectUnauthorized: Config.ENDPOINT_SECURITY_TLS.rejectUnauthorized
      }

      const requestOptions = {
        url,
        method,
        headers: expectedHeaders,
        body: message,
        agentOptions
      }

      const error = new Error()

      request.withArgs(requestOptions).yields(error, null, null)

      try {
        await callback.sendCallback(url, method, headers, message, cid, sourceFsp)
        test.fail('test failed without throwing an error')
        test.end()
      } catch (e) {
        test.ok(e instanceof Error)
        test.equal(e.message, Enum.errorMessages.MISSINGFUNCTIONPARAMETERS)
        test.end()
      }
    })

    sendCallbackTest.end()
  })

  callbacksTest.end()
})
