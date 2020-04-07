'use strict'

const Test = require('tapes')(require('tape'))
const Sinon = require('sinon')
const axios = require('axios')
const proxyquire = require('proxyquire')
const Joi = require('@hapi/joi')

const Config = require('../../../../src/lib/config')
const Notification = require('../../../../src/handlers/notification')

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
  let Handler

  handlerTest.beforeEach(t => {
    sandbox = Sinon.createSandbox()
    sandbox.stub(Notification, 'isConnected')
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
      axios.get.resolves({ data: { status: 'OK' } })
      const expectedResponseCode = 200

      // Act
      const {
        responseCode
      } = await unwrapResponse((reply) => Handler.getHealth(createRequest({}), reply))

      // Assert
      test.deepEqual(responseCode, expectedResponseCode, 'The response code matches')
      test.end()
    })

    healthTest.test('returns the correct response when the health check is up in API mode only (Config.HANDLERS_DISABLED=true)', async test => {
      // Arrange
      Notification.isConnected.resolves(true)

      Config.HANDLERS_DISABLED = true
      Handler = proxyquire('../../../../src/api/metadata/handler', {})
      axios.get.resolves({ data: { status: 'OK' } })
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
      axios.get.resolves({ data: { status: 'OK' } })
      const expectedResponseCode = 502

      // Act
      const {
        responseCode
      } = await unwrapResponse((reply) => Handler.getHealth(createRequest({ query: { detailed: true } }), reply))

      // Assert
      test.deepEqual(responseCode, expectedResponseCode, 'The response code matches')
      test.end()
    })

    healthTest.test('get simple health status with query string "simple"', async test => {
      // Arrange
      const expectedSchema = {
        status: Joi.string().valid('OK').required(),
        uptime: Joi.number().required(),
        startTime: Joi.date().iso().required(),
        versionNumber: Joi.string().required(),
        services: Joi.array().required()
      }
      const expectedStatus = 200
      const expectedServices = []

      // Act
      const {
        responseBody,
        responseCode
      } = await unwrapResponse((reply) => Handler.getHealth(createRequest({}, { query: { simple: '' } }), reply))

      // Assert
      const validationResult = Joi.validate(responseBody, expectedSchema)
      test.equal(validationResult.error, null, 'The response matches the validation schema')
      test.deepEqual(responseCode, expectedStatus, 'The response code matches')
      test.deepEqual(responseBody.services, expectedServices, 'The sub-services are empty')
      test.end()
    })

    healthTest.test('get simple health status with query string "simple=true"', async test => {
      // Arrange
      const expectedSchema = {
        status: Joi.string().valid('OK').required(),
        uptime: Joi.number().required(),
        startTime: Joi.date().iso().required(),
        versionNumber: Joi.string().required(),
        services: Joi.array().required()
      }
      const expectedStatus = 200
      const expectedServices = []

      // Act
      const {
        responseBody,
        responseCode
      } = await unwrapResponse((reply) => Handler.getHealth(createRequest({}, { query: { simple: true } }), reply))

      // Assert
      const validationResult = Joi.validate(responseBody, expectedSchema)
      test.equal(validationResult.error, null, 'The response matches the validation schema')
      test.deepEqual(responseCode, expectedStatus, 'The response code matches')
      test.deepEqual(responseBody.services, expectedServices, 'The sub-services are empty')
      test.end()
    })

    healthTest.test('get detailed health status with query string "simple=false"', async test => {
      // Arrange
      axios.get.withArgs(Config.ENDPOINT_HEALTH_URL).resolves({ data: { status: 'OK' } })
      const expectedSchema = {
        status: Joi.string().valid('OK').required(),
        uptime: Joi.number().required(),
        startTime: Joi.date().iso().required(),
        versionNumber: Joi.string().required(),
        services: Joi.array().required()
      }
      const expectedStatus = 200
      const expectedServices = [
        { name: 'broker', status: 'OK' },
        { name: 'participantEndpointService', status: 'OK' }
      ]

      // Act
      const {
        responseBody,
        responseCode
      } = await unwrapResponse((reply) => Handler.getHealth(createRequest({}, { query: { simple: false } }), reply))

      // Assert
      const validationResult = Joi.validate(responseBody, expectedSchema)
      test.equal(validationResult.error, null, 'The response matches the validation schema')
      test.deepEqual(responseCode, expectedStatus, 'The response code matches')
      test.deepEqual(responseBody.services, expectedServices, 'The sub-services are correct')
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
      await Handler.metadata(createRequest(), reply)
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
      Handler.metadata(request, reply)
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

      Handler.metadata(request, reply)
    })

    metadataTest.end()
  })

  handlerTest.end()
})
