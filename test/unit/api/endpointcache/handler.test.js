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

 * Juan Correa <juan.correa@modusbox.com>

 --------------
 ******/

'use strict'

const Test = require('tapes')(require('tape'))
const Sinon = require('sinon')
const axios = require('axios')

const Endpoints = require('@mojaloop/central-services-shared').Util.Endpoints
const Config = require('../../../../src/lib/config.js')

const Notification = require('../../../../src/handlers/notification')
const Handler = require('../../../../src/api/endpointcache/handler')
const proxyquire = require('proxyquire')
const {
  createRequest,
  unwrapResponse
} = require('../../../helpers')

const SharedStub = {
  Util: {
    Endpoint: {
      stopCache: () => {
        throw new Error()
      }
    }
  }
}
const handler = proxyquire('../../../../src/api/endpointcache/handler', {
  '@mojaloop/central-services-shared': SharedStub
})

Test('route handler', (handlerTest) => {
  let sandbox

  handlerTest.beforeEach(t => {
    sandbox = Sinon.createSandbox()

    sandbox.stub(Notification, 'isConnected')
    sandbox.stub(axios, 'get')

    t.end()
  })

  handlerTest.afterEach(t => {
    sandbox.restore()

    t.end()
  })

  handlerTest.test('/endpointcache should', endpointcacheTest => {
    endpointcacheTest.test('returns the error response when the endpointcache is called without cache being initialized', async test => {
      // Arrange
      Notification.isConnected.resolves(true)
      axios.get.resolves({ data: { status: 'OK' } })

      // Assert
      try {
        // Act
        await unwrapResponse((reply) => handler.deleteEndpointCache(createRequest({}), reply))
        test.fail()
        sandbox.restore()
        test.end()
      } catch (e) {
        test.pass()
        sandbox.restore()
        test.end()
      }
    })

    endpointcacheTest.test('returns the correct response when the endpointcache is called', async test => {
      // Arrange
      Notification.isConnected.resolves(true)
      axios.get.resolves({ data: { status: 'OK' } })
      const expectedResponseCode = 202
      await Endpoints.initializeCache(Config.ENDPOINT_CACHE_CONFIG)

      // Act
      const {
        responseCode
      } = await unwrapResponse((reply) => Handler.deleteEndpointCache(createRequest({}), reply))

      // Assert
      test.deepEqual(responseCode, expectedResponseCode, 'The response code matches')
      sandbox.restore()
      test.end()
    })

    endpointcacheTest.end()
  })

  handlerTest.end()
})
