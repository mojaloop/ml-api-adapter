'use strict'

const Test = require('tapes')(require('tape'))
const Sinon = require('sinon')
const Uuid = require('uuid4')
const { Enum, Util } = require('@mojaloop/central-services-shared')
const Logger = require('@mojaloop/central-services-logger')

const Service = require('../../../../src/domain/participant')
const Config = require('../../../../src/lib/config')
const { TEMPLATE_PARAMS } = require('../../../../src/shared/constants')

const Facade = Util.Endpoints
const { FspEndpointTypes } = Enum.EndPoints

Test('ParticipantEndpoint Service Test', endpointTest => {
  let sandbox

  endpointTest.beforeEach(async test => {
    sandbox = Sinon.createSandbox()
    sandbox.stub(Logger, 'isDebugEnabled').value(true)
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
      const endpointType = FspEndpointTypes.FSPIOP_CALLBACK_URL_TRANSFER_PUT
      const transferId = Uuid()
      const expected = `https://localhost:1080/transfers/${transferId}`
      Facade.getEndpoint.withArgs(Config.ENDPOINT_SOURCE_URL, fsp, endpointType, { transferId }).returns(Promise.resolve(expected))

      try {
        const result = await Service.getEndpoint({ fsp, endpointType, id: transferId })
        test.equal(result, expected, 'The results match')
        test.end()
      } catch (err) {
        test.fail('Error thrown', err)
        test.end()
      }
    })

    getEndpointTest.test('return the endpoint when transferId is null', async (test) => {
      const fsp = 'fsp'
      const endpointType = FspEndpointTypes.FSPIOP_CALLBACK_URL_TRANSFER_POST
      const expected = 'https://localhost:1080/transfers'
      Facade.getEndpoint.withArgs(Config.ENDPOINT_SOURCE_URL, fsp, endpointType).returns(Promise.resolve(expected))

      try {
        const result = await Service.getEndpoint({ fsp, endpointType })
        test.equal(result, expected, 'The results match')
        test.end()
      } catch (err) {
        test.fail('Error thrown', err)
        test.end()
      }
    })

    getEndpointTest.test('return the FX endpoint', async (test) => {
      const fsp = `fsp-${Uuid()}`
      const endpointType = FspEndpointTypes.FSPIOP_CALLBACK_URL_FX_TRANSFER_POST
      const id = 'fxId'
      const expectedTemplateParams = {
        [TEMPLATE_PARAMS.commitRequestId]: id
      }
      const expectedUrl = 'https://host/fxTransfers'
      Facade.getEndpoint.withArgs(Config.ENDPOINT_SOURCE_URL, fsp).resolves(expectedUrl)

      const result = await Service.getEndpoint({ fsp, endpointType, id, isFx: true })
      test.equal(result, expectedUrl, 'The url matches')
      const { lastArg } = Facade.getEndpoint.firstCall
      test.same(lastArg, expectedTemplateParams)
      test.end()
    })

    getEndpointTest.test('throw error', async (test) => {
      const fsp = 'fsp1'
      const endpointType = FspEndpointTypes.FSPIOP_CALLBACK_URL_TRANSFER_PUT
      const transferId = Uuid()

      Facade.getEndpoint.withArgs(Config.ENDPOINT_SOURCE_URL, fsp, endpointType, { transferId }).throws(new Error())
      try {
        await Service.getEndpoint({ fsp, endpointType, id: transferId })
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
