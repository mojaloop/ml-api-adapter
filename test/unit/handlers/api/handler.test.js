'use strict'

const Test = require('tapes')(require('tape'))
const Sinon = require('sinon')
const request = require('request-promise-native')
const HealthCheck = require('@mojaloop/central-services-shared').HealthCheck.HealthCheck

const Notification = require('../../../../src/handlers/notification')
const Handler = require('../../../../src/api/metadata/handler')

function createRequest (routes) {
  let value = routes || []
  return {
    server: {
      table: () => {
        return [{ table: value }]
      }
    }
  }
}

/**
 * unwrapResponse
 *
 * Use this function to unwrap the innner response body and code from an async Handler
 */
const unwrapResponse = async (asyncFunction) => {
  let responseBody
  let responseCode
  const nestedReply = {
    response: (response) => {
      responseBody = response
      return {
        code: statusCode => {
          responseCode = statusCode
        }
      }
    }
  }
  await asyncFunction(nestedReply)

  return {
    responseBody,
    responseCode
  }
}

Test('route handler', (handlerTest) => {
  let sandbox

  handlerTest.beforeEach(t => {
    sandbox = Sinon.createSandbox()
    sandbox.stub(HealthCheck.prototype, 'getHealth').resolves()
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
      // HealthCheck.prototype.getHealth.resolves({ status: 'OK' })
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
      // HealthCheck.prototype.getHealth.throws(new Error('getHealth() failed'))
      Notification.isConnected.throws(new Error('Error connecting to consumer'))

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
