'use strict'

const Test = require('tapes')(require('tape'))
const Sinon = require('sinon')
const request = require('request-promise-native')

const Notification = require('../../../../src/handlers/notification')
const Handler = require('../../../../src/api/metadata/handler')
const {
  createRequest,
  unwrapResponse
} = require('../../../helpers')

Test('route handler', (handlerTest) => {
  let sandbox

  handlerTest.beforeEach(t => {
    sandbox = Sinon.createSandbox()
    sandbox.stub(Notification, 'isConnected')
    sandbox.stub(request, 'get')

    t.end()
  })

  handlerTest.afterEach(t => {
    sandbox.restore()

    t.end()
  })

  handlerTest.test('/health should', healthTest => {
    healthTest.test('returns the correct response when the health check is up', async test => {
      // Arrange
      Notification.isConnected.resolves(true)
      request.get.resolves({status: 'OK'})
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
      Notification.isConnected.resolves(true)
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

    healthTest.end()
  })

  handlerTest.end()
})
