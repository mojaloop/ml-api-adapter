'use strict'

const src = '../../../../src'
const Test = require('tapes')(require('tape'))
const Sinon = require('sinon')
const Cache = require(`${src}/domain/participant/lib/cache/participantEndpoint`)
const Facade = require(`${src}/models/participant/facade`)
const Uuid = require('uuid4')
const P = require('bluebird')

const FSPIOP_CALLBACK_URL_TRANSFER_POST = 'FSPIOP_CALLBACK_URL_TRANSFER_POST'
const FSPIOP_CALLBACK_URL_TRANSFER_PUT = 'FSPIOP_CALLBACK_URL_TRANSFER_PUT'

Test('Facade Test', facadeTest => {
  let sandbox

  facadeTest.beforeEach(test => {
    sandbox = Sinon.createSandbox()
    sandbox.stub(Cache, 'getEndpoint')
    test.end()
  })

  facadeTest.afterEach(test => {
    sandbox.restore()
    test.end()
  })

  facadeTest.test('getEndpoint should', async (getEndpointTest) => {
    getEndpointTest.test('return the endpoint if transferId is not passed', async (test) => {
      const fsp = 'fsp'
      const endpointType = FSPIOP_CALLBACK_URL_TRANSFER_POST
      const url = 'http://localhost:1080/transfers'
      const expected = 'http://localhost:1080/transfers'

      Cache.getEndpoint.withArgs(fsp, endpointType).returns(P.resolve(url))

      try {
        const result = await Facade.getEndpoint(fsp, endpointType)
        test.equal(result, expected, 'The results match')
        test.end()
      } catch (err) {
        test.fail('Error thrown', err)
        test.end()
      }
    })

    getEndpointTest.test('return the endpoint if id is passed', async (test) => {
      const fsp = 'fsp'
      const transferId = Uuid()
      const endpointType = FSPIOP_CALLBACK_URL_TRANSFER_PUT
      const url = 'http://localhost:1080/transfers/{{transferId}}'
      const expected = `http://localhost:1080/transfers/${transferId}`

      Cache.getEndpoint.withArgs(fsp, endpointType).returns(P.resolve(url))

      try {
        const result = await Facade.getEndpoint(fsp, endpointType, transferId)
        test.equal(result, expected, 'The results match')
        test.end()
      } catch (err) {
        test.fail('Error thrown', err)
        test.end()
      }
    })

    getEndpointTest.test('throw error', async (test) => {
      const fsp = 'fsp'
      const endpointType = FSPIOP_CALLBACK_URL_TRANSFER_PUT
      Cache.getEndpoint.withArgs(fsp, endpointType).throws(new Error())
      try {
        await Facade.getEndpoint(fsp, endpointType)
        test.fail('should throw error')
        test.end()
      } catch (e) {
        test.ok(e instanceof Error)
        test.end()
      }
    })

    getEndpointTest.end()
  })

  facadeTest.end()
})
