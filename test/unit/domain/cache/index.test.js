'use strict'

const Test = require('tapes')(require('tape'))
const Sinon = require('sinon')
const Uuid = require('uuid4')
const P = require('bluebird')
const Facade = require('../../../../src/models/cache')
const Cache = require('../../../../src/domain/cache')
// const Catbox = require('catbox')

const FSPIOP_CALLBACK_URL_TRANSFER_POST = 'FSPIOP_CALLBACK_URL_TRANSFER_POST'
const FSPIOP_CALLBACK_URL_TRANSFER_PUT = 'FSPIOP_CALLBACK_URL_TRANSFER_PUT'

Test('Cache Test', cacheTest => {
  let sandbox

  cacheTest.beforeEach(async test => {
    sandbox = Sinon.createSandbox()
    sandbox.stub(Facade, 'fetchEndpoints')
    // Catbox.Client = sandbox.stub()
    test.end()
  })

  cacheTest.afterEach(async test => {
    sandbox.restore()
    test.end()
  })

  cacheTest.test('getEndpoint should', async (getEndpointTest) => {
    getEndpointTest.test('return the endpoint', async (test) => {
      const fsp = 'fsp'
      const enpointType = FSPIOP_CALLBACK_URL_TRANSFER_PUT
      const transferId = Uuid()
      const endpointMap = {
        FSPIOP_CALLBACK_URL_TRANSFER_POST: 'http://localhost:1080/transfers',
        FSPIOP_CALLBACK_URL_TRANSFER_PUT: 'http://localhost:1080/transfers/{{transferId}}',
        FSPIOP_CALLBACK_URL_TRANSFER_ERROR: 'http://localhost:1080/transfers/{{transferId}}/error'

      }
      const expected = `http://localhost:1080/transfers/${transferId}`

      await Cache.initializeCache()
      Facade.fetchEndpoints.withArgs(fsp).returns(P.resolve(endpointMap))

      try {
        const result = await Cache.getEndpoint(fsp, enpointType, transferId)
        test.equal(result, expected, 'The results match')
        await Cache.stopCache()
        test.end()
      } catch (err) {
        test.fail('Error thrown', err)
        test.end()
      }
    })

    getEndpointTest.test('return the endpoint when transferId is null', async (test) => {
      const fsp = 'fsp'
      const enpointType = FSPIOP_CALLBACK_URL_TRANSFER_POST
      const endpointMap = {
        FSPIOP_CALLBACK_URL_TRANSFER_POST: 'http://localhost:1080/transfers',
        FSPIOP_CALLBACK_URL_TRANSFER_PUT: 'http://localhost:1080/transfers/{{transferId}}',
        FSPIOP_CALLBACK_URL_TRANSFER_ERROR: 'http://localhost:1080/transfers/{{transferId}}/error'

      }
      const expected = `http://localhost:1080/transfers`

      await Cache.initializeCache()
      Facade.fetchEndpoints.withArgs(fsp).returns(P.resolve(endpointMap))

      try {
        const result = await Cache.getEndpoint(fsp, enpointType)
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
      const enpointType = FSPIOP_CALLBACK_URL_TRANSFER_PUT
      const transferId = Uuid()

      await Cache.initializeCache()
      Facade.fetchEndpoints.withArgs(fsp).throws(new Error())
      try {
        await Cache.getEndpoint(fsp, enpointType, transferId)
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

    // initializeCacheTest.test('should throw error', async (test) => {
    //   let localSandbox = Sinon.createSandbox()
    //   try {
    //     Catbox.Client = localSandbox.stub()
    //     Catbox.Client.throws(new Error())

    //     await Cache.initializeCache()
    //     test.fail('should throw')
    //     test.end()
    //   } catch (err) {
    //     test.ok(err instanceof Error)
    //     test.end()
    //     localSandbox.restore()
    //   }
    // })

    await initializeCacheTest.end()
  })
  cacheTest.end()
})
