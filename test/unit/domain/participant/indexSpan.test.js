'use strict'

const Test = require('tapes')(require('tape'))
const Sinon = require('sinon')
const Uuid = require('uuid4')
const Facade = require('@mojaloop/central-services-shared').Util.Endpoints
const Service = require('../../../../src/domain/participant')
const Enum = require('@mojaloop/central-services-shared').Enum
const Config = require('../../../../src/lib/config')
const EventSdk = require('@mojaloop/event-sdk')
let span

Test('ParticipantEndpoint Service Test', endpointTest => {
  let sandbox

  endpointTest.beforeEach(async test => {
    span = EventSdk.Tracer.createSpan('test_span')
    sandbox = Sinon.createSandbox()
    sandbox.stub(Facade, 'getEndpoint')
    test.end()
  })

  endpointTest.afterEach(async test => {
    sandbox.restore()
    span.finish()
    test.end()
  })

  endpointTest.test('getEndpoint should', async (getEndpointTest) => {
    getEndpointTest.test('return the endpoint', async (test) => {
      const fsp = 'fsp'
      const endpointType = Enum.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_TRANSFER_PUT
      const transferId = Uuid()
      const expected = `http://localhost:1080/transfers/${transferId}`
      Facade.getEndpoint.withArgs(Config.ENDPOINT_SOURCE_URL, fsp, endpointType, { transferId }).returns(Promise.resolve(expected))

      try {
        const result = await Service.getEndpoint(fsp, endpointType, transferId, span)
        test.equal(result, expected, 'The results match')
        test.end()
      } catch (err) {
        test.fail('Error thrown', err)
        test.end()
      }
    })

    getEndpointTest.test('return the endpoint when transferId is null', async (test) => {
      const fsp = 'fsp'
      const endpointType = Enum.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_TRANSFER_POST
      const expected = 'http://localhost:1080/transfers'
      Facade.getEndpoint.withArgs(Config.ENDPOINT_SOURCE_URL, fsp, endpointType).returns(Promise.resolve(expected))

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
      const endpointType = Enum.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_TRANSFER_PUT
      const transferId = Uuid()

      Facade.getEndpoint.withArgs(Config.ENDPOINT_SOURCE_URL, fsp, endpointType, { transferId }).throws(new Error())
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
