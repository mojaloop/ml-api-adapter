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
const axios = require('axios')
const proxyquire = require('proxyquire')

const Config = require('../../../../src/lib/config')
const Notification = require('../../../../src/handlers/notification')
const Producer = require('@mojaloop/central-services-stream').Util.Producer

const {
  createRequest,
  unwrapResponse
} = require('../../../helpers/general')

const apiTags = ['api']

Test('metadata handler', (handlerTest) => {
  let originalScale
  let originalPrecision
  let originalHostName
  let sandbox
  let Handler

  handlerTest.beforeEach(t => {
    sandbox = Sinon.createSandbox()
    sandbox.stub(Notification, 'isConnected')
    sandbox.stub(Producer, 'isConnected')
    sandbox.stub(axios, 'get')
    Handler = proxyquire('../../../../src/api/metadata/handler', {})

    originalScale = Config.AMOUNT.SCALE
    originalPrecision = Config.AMOUNT.PRECISION
    originalHostName = Config.HOSTNAME
    Config.AMOUNT.SCALE = 0
    Config.AMOUNT.PRECISION = 0
    Config.HOSTNAME = ''

    t.end()
  })

  handlerTest.afterEach(t => {
    sandbox.restore()

    Config.AMOUNT.SCALE = originalScale
    Config.AMOUNT.PRECISION = originalPrecision
    Config.HOSTNAME = originalHostName
    Config.HANDLERS_DISABLED = false

    t.end()
  })

  handlerTest.test('/health should', healthTest => {
    healthTest.test('returns the correct response when the health check is up', async test => {
      // Arrange
      Notification.isConnected.resolves(true)
      Producer.isConnected.resolves(true)
      axios.get.resolves({ data: { status: 'OK' } })
      const expectedResponseCode = 200

      // Act
      const {
        responseCode
      } = await unwrapResponse((reply) => Handler.getHealth({}, createRequest({}), reply))

      // Assert
      test.deepEqual(responseCode, expectedResponseCode, 'The response code matches')
      test.end()
    })

    healthTest.test('returns the correct response when the health check is up in API mode only (Config.HANDLERS_DISABLED=true)', async test => {
      // Arrange
      Notification.isConnected.resolves(true)
      Producer.isConnected.resolves(true)

      Config.HANDLERS_DISABLED = true
      Handler = proxyquire('../../../../src/api/metadata/handler', {})
      axios.get.resolves({ data: { status: 'OK' } })
      const expectedResponseCode = 200

      // Act
      const {
        responseCode
      } = await unwrapResponse((reply) => Handler.getHealth({}, createRequest({}), reply))

      // Assert
      test.deepEqual(responseCode, expectedResponseCode, 'The response code matches')
      test.end()
    })

    healthTest.test('returns the correct response when the health check is down', async test => {
      // Arrange
      Notification.isConnected.throws(new Error('Error connecting to consumer'))
      Producer.isConnected.throws(new Error('Error connecting producer'))
      axios.get.resolves({ data: { status: 'OK' } })
      const expectedResponseCode = 502

      // Act
      const {
        responseCode
      } = await unwrapResponse((reply) => Handler.getHealth({}, createRequest({ query: { detailed: true } }), reply))

      // Assert
      test.deepEqual(responseCode, expectedResponseCode, 'The response code matches')
      test.end()
    })

    healthTest.end()
  })
  handlerTest.test('metadata should', function (metadataTest) {
    metadataTest.test('return 200 httpStatus', async function (t) {
      const reply = {
        response: () => {
          return {
            code: statusCode => {
              t.equal(statusCode, 200)
              t.end()
            }
          }
        }
      }
      await Handler.metadata({}, createRequest(), reply)
    })

    metadataTest.test('return urls from request.server and append hostname', t => {
      const hostName = 'some-host-name'
      Config.HOSTNAME = hostName
      const request = createRequest([
        { settings: { id: 'first_route', tags: apiTags }, path: '/first' }
      ])

      const reply = {
        response: (response) => {
          t.equal(response.urls.first_route, `${hostName}/first`)
          return { code: statusCode => { t.end() } }
        }
      }
      Handler.metadata({}, request, reply)
    })

    metadataTest.test('format url parameters with colons', t => {
      const request = createRequest([
        { settings: { id: 'path', tags: apiTags }, path: '/somepath/{id}' },
        { settings: { id: 'manyargs', tags: apiTags }, path: '/somepath/{id}/{path*}/{test2}/' }
      ])

      const reply = {
        response: (response) => {
          t.equal(response.urls.path, '/somepath/:id')
          t.equal(response.urls.manyargs, '/somepath/:id/:path*/:test2/')
          return { code: () => { t.end() } }
        }
      }

      Handler.metadata({}, request, reply)
    })

    metadataTest.end()
  })

  handlerTest.end()
})
