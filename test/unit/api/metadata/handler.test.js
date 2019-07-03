'use strict'

const Test = require('tapes')(require('tape'))
const Sinon = require('sinon')
const request = require('request-promise-native')
const HealthCheck = require('@mojaloop/central-services-shared').HealthCheck.HealthCheck

const Config = require('../../../../src/lib/config')
const Notification = require('../../../../src/handlers/notification')
const Handler = require('../../../../src/api/metadata/handler')
const {
  createRequest,
  unwrapResponse
} = require('../../../helpers')

const apiTags = ['api']

Test('metadata handler', (handlerTest) => {
  let originalScale
  let originalPrecision
  let originalHostName
  let sandbox

  handlerTest.beforeEach(t => {
    sandbox = Sinon.createSandbox()
    sandbox.stub(Notification, 'isConnected')
    sandbox.stub(request, 'get')

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

    t.end()
  })

  handlerTest.test('/health should', healthTest => {
    healthTest.test('returns the correct response when the health check is up', async test => {
      // Arrange
      Notification.isConnected.resolves(true)
      request.get.resolves({ status: 'OK' })
      const expectedResponseCode = 200

      // Act
      const {
        responseCode
      } = await unwrapResponse((reply) => Handler.getHealth(createRequest({}), reply))

      // Assert
      test.deepEqual(responseCode, expectedResponseCode, 'The response code matches')
      test.end()
    })

    healthTest.test('returns the correct response when the health check is down', async test => {
      // Arrange
      Notification.isConnected.throws(new Error('Error connecting to consumer'))
      request.get.resolves({ status: 'OK' })
      const expectedResponseCode = 502

      // Act
      const {
        responseCode
      } = await unwrapResponse((reply) => Handler.getHealth(createRequest({ query: { detailed: true } }), reply))

      // Assert
      test.deepEqual(responseCode, expectedResponseCode, 'The response code matches')
      test.end()
    })

    // healthTest.test('is down when there is no response body', async test => {
    //   // Arrange
    //   HealthCheck.prototype.getHealth.resolves(undefined)
    //   const expectedResponseCode = 502

    //   // Act
    //   const {
    //     responseCode
    //   } = await unwrapResponse((reply) => Handler.getHealth(createRequest({ query: { detailed: true } }), reply))

    //   // Assert
    //   test.deepEqual(responseCode, expectedResponseCode, 'The response code matches')
    //   test.end()
    // })

    healthTest.end()
  })

  handlerTest.test('metadata should', function (metadataTest) {
    metadataTest.test('return 200 httpStatus', async function (t) {
      let reply = {
        response: () => {
          return {
            code: statusCode => {
              t.equal(statusCode, 200)
              t.end()
            }
          }
        }
      }
      await Handler.metadata(createRequest(), reply)
    })

    metadataTest.test('return urls from request.server and append hostname', t => {
      let hostName = 'some-host-name'
      Config.HOSTNAME = hostName
      let request = createRequest([
        { settings: { id: 'first_route', tags: apiTags }, path: '/first' }
      ])

      let reply = {
        response: (response) => {
          t.equal(response.urls['first_route'], `${hostName}/first`)
          return { code: statusCode => { t.end() } }
        }
      }
      Handler.metadata(request, reply)
    })

    metadataTest.test('format url parameters with colons', t => {
      let request = createRequest([
        { settings: { id: 'path', tags: apiTags }, path: '/somepath/{id}' },
        { settings: { id: 'manyargs', tags: apiTags }, path: '/somepath/{id}/{path*}/{test2}/' }
      ])

      let reply = {
        response: (response) => {
          t.equal(response.urls['path'], '/somepath/:id')
          t.equal(response.urls['manyargs'], '/somepath/:id/:path*/:test2/')
          return { code: () => { t.end() } }
        }
      }

      Handler.metadata(request, reply)
    })

    metadataTest.end()
  })

  handlerTest.end()
})
