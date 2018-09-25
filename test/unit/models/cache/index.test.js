'use strict'

const Test = require('tapes')(require('tape'))
const Sinon = require('sinon')
const Config = require('../../../../src/lib/config')
const Mustache = require('mustache')
const proxyquire = require('proxyquire')

Test('Cache Model Test', modelTest => {
  let sandbox
  let request
  let Model

  modelTest.beforeEach(test => {
    sandbox = Sinon.createSandbox()
    request = sandbox.stub()

    test.end()
  })

  modelTest.afterEach(test => {
    sandbox.restore()
    test.end()
  })

  modelTest.test('fetchEndpoints should', async (fetchEndpointsTest) => {
    fetchEndpointsTest.test('return the object of endpoints', async (test) => {
      const fsp = 'fsp'
      const requestOptions = {
        url: Mustache.render(Config.ENDPOINT_CACHE_URI, { fsp }),
        method: 'get',
        agentOptions: {
          rejectUnauthorized: false
        }
      }
      const endpoints = [
        {
          type: 'FSPIOP_CALLBACK_URL_TRANSFER_POST',
          value: 'http://localhost:1080/transfers'
        },
        {
          type: 'FSPIOP_CALLBACK_URL_TRANSFER_PUT',
          value: 'http://localhost:1080/transfers/{{transferId}}'
        },
        {
          type: 'FSPIOP_CALLBACK_URL_TRANSFER_ERROR',
          value: 'http://localhost:1080/transfers/{{transferId}}/error'
        }
      ]

      const expected = {
        FSPIOP_CALLBACK_URL_TRANSFER_POST: 'http://localhost:1080/transfers',
        FSPIOP_CALLBACK_URL_TRANSFER_PUT: 'http://localhost:1080/transfers/{{transferId}}',
        FSPIOP_CALLBACK_URL_TRANSFER_ERROR: 'http://localhost:1080/transfers/{{transferId}}/error'

      }
      request.withArgs(requestOptions).yields(null, { statusCode: 200 }, JSON.stringify(endpoints))
      Model = proxyquire('../../../../src/models/cache/index.js', { 'request': request })

      try {
        const result = await Model.fetchEndpoints(fsp)
        test.deepEqual(result, expected, 'The results match')
        test.end()
      } catch (err) {
        test.fail('Error thrown', err)
        test.end()
      }
    })

    fetchEndpointsTest.test('return the empty object if no endpoints defined', async (test) => {
      const fsp = 'fsp'
      const requestOptions = {
        url: Mustache.render(Config.ENDPOINT_CACHE_URI, { fsp }),
        method: 'get',
        agentOptions: {
          rejectUnauthorized: false
        }
      }
      const endpoints = {}

      const expected = {}
      request.withArgs(requestOptions).yields(null, { statusCode: 200 }, JSON.stringify(endpoints))
      Model = proxyquire('../../../../src/models/cache/index.js', { 'request': request })

      try {
        const result = await Model.fetchEndpoints(fsp)
        test.deepEqual(result, expected, 'The results match')
        test.end()
      } catch (err) {
        test.fail('Error thrown', err)
        test.end()
      }
    })

    fetchEndpointsTest.test('throw error', async (test) => {
      const fsp = 'fsp'

      const requestOptions = {
        url: Mustache.render(Config.ENDPOINT_CACHE_URI, { fsp }),
        method: 'get',
        agentOptions: {
          rejectUnauthorized: false
        }
      }

      request.withArgs(requestOptions).yields(new Error(), null, null)
      Model = proxyquire('../../../../src/models/cache/index.js', { 'request': request })

      try {
        await Model.fetchEndpoints(fsp)
        test.fail('should throw error')
        test.end()
      } catch (e) {
        test.ok(e instanceof Error)
        test.end()
      }
    })

    fetchEndpointsTest.end()
  })

  modelTest.end()
})
