'use strict'

const Test = require('tapes')(require('tape'))
const Sinon = require('sinon')
const Uuid = require('uuid4')
const P = require('bluebird')
const Facade = require('../../../../src/models/participant/facade')
const Service = require('../../../../src/domain/participant')

const FSPIOP_CALLBACK_URL_TRANSFER_POST = 'FSPIOP_CALLBACK_URL_TRANSFER_POST'
const FSPIOP_CALLBACK_URL_TRANSFER_PUT = 'FSPIOP_CALLBACK_URL_TRANSFER_PUT'

Test('ParticipantEndpoint Service Test', endpointTest => {
  let sandbox

  endpointTest.beforeEach(async test => {
    sandbox = Sinon.createSandbox()
    sandbox.stub(Facade, 'getEndpoint')
    test.end()
  })

  endpointTest.afterEach(async test => {
    sandbox.restore()
    test.end()
  })

  endpointTest.test('getEndpoint should', async (getEndpointTest) => {
    getEndpointTest.test('return the endpoint', async (test) => {
      const fsp = 'fsp'
      const endpointType = FSPIOP_CALLBACK_URL_TRANSFER_PUT
      const transferId = Uuid()
      const expected = `http://localhost:1080/transfers/${transferId}`
      Facade.getEndpoint.withArgs(fsp, endpointType, transferId).returns(P.resolve(expected))

      try {
        const result = await Service.getEndpoint(fsp, endpointType, transferId)
        test.equal(result, expected, 'The results match')
        test.end()
      } catch (err) {
        test.fail('Error thrown', err)
        test.end()
      }
    })

    getEndpointTest.test('return the endpoint when transferId is null', async (test) => {
      const fsp = 'fsp'
      const endpointType = FSPIOP_CALLBACK_URL_TRANSFER_POST
      const expected = `http://localhost:1080/transfers`
      Facade.getEndpoint.withArgs(fsp, endpointType).returns(P.resolve(expected))

      try {
        const result = await Service.getEndpoint(fsp, endpointType)
        test.equal(result, expected, 'The results match')
        test.end()
      } catch (err) {
        test.fail('Error thrown', err)
        test.end()
      }
    })

    getEndpointTest.test('throw error', async (test) => {
      const fsp = 'fsp1'
      const endpointType = FSPIOP_CALLBACK_URL_TRANSFER_PUT
      const transferId = Uuid()

      Facade.getEndpoint.withArgs(fsp).throws(new Error())
      try {
        await Service.getEndpoint(fsp, endpointType, transferId)
        test.fail('should throw error')
        test.end()
      } catch (e) {
        test.ok(e instanceof Error)
        test.end()
      }
    })

    await getEndpointTest.end()
  })

  endpointTest.end()
})
