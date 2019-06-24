'use strict'

const Test = require('tapes')(require('tape'))
const src = '../../../../../../src'
const Sinon = require('sinon')
const P = require('bluebird')
const Model = require(`${src}/models/participant/participantEndpoint`)
const Cache = require(`${src}/domain/participant/lib/cache/participantEndpoint`)
const Catbox = require('catbox')

const FSPIOP_CALLBACK_URL_TRANSFER_PUT = 'FSPIOP_CALLBACK_URL_TRANSFER_PUT'

Test('Cache Test', cacheTest => {
  let sandbox

  cacheTest.beforeEach(async test => {
    sandbox = Sinon.createSandbox()
    sandbox.stub(Model, 'getEndpoint')
    test.end()
  })

  cacheTest.afterEach(async test => {
    sandbox.restore()
    test.end()
  })

  cacheTest.test('getEndpoint should', async (getEndpointTest) => {
    getEndpointTest.test('return the endpoint', async (test) => {
      const fsp = 'fsp'
      const endpointType = FSPIOP_CALLBACK_URL_TRANSFER_PUT

      const endpointMap = {
        FSPIOP_CALLBACK_URL_TRANSFER_POST: 'http://localhost:1080/transfers',
        FSPIOP_CALLBACK_URL_TRANSFER_PUT: 'http://localhost:1080/transfers/{{id}}',
        FSPIOP_CALLBACK_URL_TRANSFER_ERROR: 'http://localhost:1080/transfers/{{id}}/error'

      }
      const expected = 'http://localhost:1080/transfers/{{id}}'

      await Cache.initializeCache()
      Model.getEndpoint.withArgs(fsp).returns(P.resolve(endpointMap))

      try {
        const result = await Cache.getEndpoint(fsp, endpointType)
        test.equal(result, expected, 'The results match')
        await Cache.stopCache()
        test.end()
      } catch (err) {
        test.fail('Error thrown', err)
        test.end()
      }
    })

    getEndpointTest.test('throw error', async (test) => {
      const fsp = 'fsp1'
      const endpointType = FSPIOP_CALLBACK_URL_TRANSFER_PUT

      await Cache.initializeCache()
      Model.getEndpoint.withArgs(fsp).throws(new Error())
      try {
        await Cache.getEndpoint(fsp, endpointType)
        test.fail('should throw error')
        await Cache.stopCache()
        test.end()
      } catch (e) {
        test.ok(e instanceof Error)
        await Cache.stopCache()
        test.end()
      }
    })

    await getEndpointTest.end()
  })

  cacheTest.test('initializeCache should', async (initializeCacheTest) => {
    initializeCacheTest.test('initializeCache cache and return true', async (test) => {
      try {
        const result = await Cache.initializeCache()
        test.equal(result, true, 'The results match')
        await Cache.stopCache()
        test.end()
      } catch (err) {
        test.fail('Error thrown', err)
        test.end()
      }
    })

    initializeCacheTest.test('should throw error', async (test) => {
      try {
        Catbox.Client = sandbox.stub()
        Catbox.Client.throws(new Error())
        await Cache.initializeCache()
        test.fail('should throw')
        test.end()
      } catch (err) {
        test.ok(err instanceof Error)
        test.end()
      }
    })

    await initializeCacheTest.end()
  })
  cacheTest.end()
})
