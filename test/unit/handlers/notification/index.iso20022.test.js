/*****
 License
 --------------
 Copyright © 2017 Bill & Melinda Gates Foundation
 The Mojaloop files are made available by the Bill & Melinda Gates Foundation under the Apache License, Version 2.0 (the "License") and you may not use these files except in compliance with the License. You may obtain a copy of the License at
 http://www.apache.org/licenses/LICENSE-2.0
 Unless required by applicable law or agreed to in writing, the Mojaloop files are distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 Contributors
 --------------
 This is the official list of the Mojaloop project contributors for this file.
 Names of the original copyright holders (individuals or organizations)
 should be listed with a '*' in the first column. People who have
 contributed from an organization can be listed under the organization
 that actually holds the copyright for their contributions (see the
 Gates Foundation organization for an example). Those individuals should have
 their names indented and be marked with a '-'. Email address can be added
 optionally within square brackets <email>.
 * Gates Foundation
 - Name Surname <name.surname@gatesfoundation.com>

 * Georgi Georgiev <georgi.georgiev@modusbox.com>
 * Shashikant Hirugade <shashikant.hirugade@modusbox.com>
 * Miguel de Barros <miguel.debarros@modusbox.com>
 * Rajiv Mothilal <rajiv.mothilal@modusbox.com>
 * Steven Oderayi <steven.oderayi@modusbox.com>

 --------------
 ******/
'use strict'

const Proxyquire = require('proxyquire')
const src = '../../../../src'
const Test = require('tapes')(require('tape'))
const Sinon = require('sinon')
const { Kafka: { Consumer }, Util: { Producer } } = require('@mojaloop/central-services-stream')
const Logger = require('@mojaloop/central-services-logger')
const { Hapi } = require('@mojaloop/central-services-shared').Util
const Util = require('@mojaloop/central-services-shared').Util
const Callback = require('@mojaloop/central-services-shared').Util.Request
const Config = require(`${src}/lib/config.js`)
const Participant = require(`${src}/domain/participant`)
const ENUM = require('@mojaloop/central-services-shared').Enum
const JwsSigner = require('@mojaloop/sdk-standard-components').Jws.signer
const Uuid = require('uuid4')
const HeadersLib = require(`${src}/lib/headers`)
const PayloadCache = require(`${src}/lib/payloadCache/PayloadCache`)
const { mockPayloadCache } = require('../../mocks')
const { TransformFacades } = require('@mojaloop/ml-schema-transformer-lib')

Test('Notification Service tests', async notificationTest => {
  let sandbox
  let createCallbackHeadersSpy
  let createCallbackHeaders
  let Notification
  const hubNameRegex = Util.HeaderValidation.getHubNameRegex(Config.HUB_NAME)
  const match = Sinon.match

  const url = 'https://somehost:port/'
  const proxyUrl = 'https://proxyhost:port/'
  await notificationTest.beforeEach(t => {
    Config.API_TYPE = Hapi.API_TYPES.iso20022
    Config.IS_ISO_MODE = true

    sandbox = Sinon.createSandbox()
    sandbox.stub(Consumer.prototype, 'constructor')
    sandbox.stub(Consumer.prototype, 'connect').returns(Promise.resolve(true))

    sandbox.stub(Producer, 'produceMessage').returns(Promise.resolve(true))

    // stub out PayloadCache methods
    sandbox.stub(PayloadCache.prototype, 'connect').returns(Promise.resolve(true))
    sandbox.stub(PayloadCache.prototype, 'disconnect').returns(Promise.resolve(true))
    sandbox.stub(PayloadCache.prototype, 'getPayload').returns(Promise.resolve(true))
    sandbox.stub(PayloadCache.prototype, 'setPayload').returns(Promise.resolve(true))
    sandbox.stub(PayloadCache.prototype, 'isConnected').returns(true)

    // sandbox.stub(Consumer.prototype, 'consume').callsArgAsync(0)
    sandbox.stub(Consumer.prototype, 'consume').returns(Promise.resolve(true)) // .callsArgAsync(0)
    sandbox.stub(Consumer.prototype, 'commitMessageSync').returns(Promise.resolve(true))
    sandbox.stub(Participant, 'getEndpoint').callsFake(({ fsp, proxy }) => {
      const result = fsp.includes('proxied') ? proxyUrl : url
      return Promise.resolve(proxy ? { url: result, proxyId: 'proxy-id' } : result)
    })

    sandbox.stub(Logger)
    sandbox.stub(Logger, 'isErrorEnabled').value(true)
    sandbox.stub(Logger, 'isInfoEnabled').value(true)
    sandbox.stub(Logger, 'isDebugEnabled').value(true)

    sandbox.stub(Callback, 'sendRequest').returns(Promise.resolve(true))
    sandbox.stub(JwsSigner.prototype, 'constructor')
    sandbox.stub(JwsSigner.prototype, 'getSignature').returns(true)

    createCallbackHeadersSpy = sandbox.spy(HeadersLib, 'createCallbackHeaders')
    createCallbackHeaders = HeadersLib.createCallbackHeaders
    Notification = Proxyquire(`${src}/handlers/notification`, {
      '../../lib/headers': HeadersLib
    })

    Proxyquire.callThru()
    t.end()
  })

  await notificationTest.afterEach(t => {
    sandbox.restore()
    mockPayloadCache.getPayload.reset()
    Config.IS_ISO_MODE = false
    t.end()
  })

  await notificationTest.test('processMessage should', async processMessageTest => {
    await processMessageTest.test('transform hub sent transfer GET message when in iso mode', async test => {
      const payeeFsp = 'dfsp2'
      const payerFsp = 'dfsp1'
      const uuid = Uuid()
      const msg = {
        value: {
          metadata: {
            event: {
              type: 'notification',
              action: 'get',
              state: {
                status: 'success',
                code: 0
              }
            }
          },
          content: {
            headers: {
              'FSPIOP-Destination': payeeFsp,
              'FSPIOP-Source': 'Hub'
            },
            payload: {
              transferState: 'COMMITTED',
              fulfilment: 'some-fulfilment',
              completedTimestamp: '2021-01-01T00:00:00Z'
            },
            uriParams: { id: uuid },
            context: {
              originalRequestId: uuid
            }
          },
          to: payeeFsp,
          from: payerFsp,
          id: 'b51ec534-ee48-4575-b6a9-ead2955b8098'
        }
      }
      mockPayloadCache.getPayload.returns(Promise.resolve(msg.value.content.payload))
      Notification.startConsumer({ payloadCache: mockPayloadCache })
      const urlPayee = await Participant.getEndpoint({ fsp: msg.value.to, endpointType: ENUM.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_TRANSFER_PUT, id: msg.value.content.uriParams.id })
      const method = ENUM.Http.RestMethods.PUT
      const payeeHeaders = createCallbackHeaders({ dfspId: msg.value.to, transferId: msg.value.content.uriParams.id, headers: msg.value.content.headers, httpMethod: method, endpointTemplate: ENUM.EndPoints.FspEndpointTemplates.TRANSFERS_PUT }, true)
      const message = {
        transferState: 'COMMITTED',
        fulfilment: 'some-fulfilment',
        completedTimestamp: '2021-01-01T00:00:00Z'
      }
      const expectedMessage = await TransformFacades.FSPIOP.transfers.put({ body: message })
      const expected = true
      Callback.sendRequest.withArgs(match({ url: urlPayee, headers: payeeHeaders, source: msg.value.from, destination: msg.value.to, method, payload: JSON.stringify(expectedMessage), hubNameRegex })).returns(Promise.resolve(200))
      Participant.getEndpoint.resetHistory()
      createCallbackHeadersSpy.resetHistory()

      const result = await Notification.processMessage(msg)

      test.ok(Callback.sendRequest.getCall(0).args[0].payload.body.TxInfAndSts.ExctnConf)
      test.ok(Callback.sendRequest.getCall(0).args[0].payload.body.TxInfAndSts.PrcgDt)
      test.ok(Callback.sendRequest.getCall(0).args[0].payload.body.TxInfAndSts.TxSts)
      test.equal(result, expected)
      test.end()
    })

    await processMessageTest.test('transform hub sent transfer FX_GET message when in iso mode', async test => {
      const payeeFsp = 'dfsp2'
      const payerFsp = 'dfsp1'
      const uuid = Uuid()
      const msg = {
        value: {
          metadata: {
            event: {
              type: 'notification',
              action: 'fx-get',
              state: {
                status: 'success',
                code: 0
              }
            }
          },
          content: {
            headers: {
              'FSPIOP-Destination': payeeFsp,
              'FSPIOP-Source': 'Hub'
            },
            payload: {
              transferState: 'COMMITTED',
              fulfilment: 'some-fulfilment',
              completedTimestamp: '2021-01-01T00:00:00Z'
            },
            uriParams: { id: uuid },
            context: {
              originalRequestId: uuid
            }
          },
          to: payeeFsp,
          from: payerFsp,
          id: 'b51ec534-ee48-4575-b6a9-ead2955b8098'
        }
      }
      mockPayloadCache.getPayload.returns(Promise.resolve(msg.value.content.payload))
      Notification.startConsumer({ payloadCache: mockPayloadCache })
      const urlPayee = await Participant.getEndpoint({ fsp: msg.value.to, endpointType: ENUM.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_FX_TRANSFER_PUT, id: msg.value.content.uriParams.id })
      const method = ENUM.Http.RestMethods.PUT
      const payeeHeaders = createCallbackHeaders({ dfspId: msg.value.to, transferId: msg.value.content.uriParams.id, headers: msg.value.content.headers, httpMethod: method, endpointTemplate: ENUM.EndPoints.FspEndpointTemplates.TRANSFERS_PUT }, true)
      const message = {
        transferState: 'COMMITTED',
        fulfilment: 'some-fulfilment',
        completedTimestamp: '2021-01-01T00:00:00Z'
      }
      const expectedMessage = await TransformFacades.FSPIOP.transfers.put({ body: message })
      const expected = true
      Callback.sendRequest.withArgs(match({ url: urlPayee, headers: payeeHeaders, source: msg.value.from, destination: msg.value.to, method, payload: JSON.stringify(expectedMessage), hubNameRegex })).returns(Promise.resolve(200))
      Participant.getEndpoint.resetHistory()
      createCallbackHeadersSpy.resetHistory()

      const result = await Notification.processMessage(msg)

      test.ok(Callback.sendRequest.getCall(0).args[0].payload.body.TxInfAndSts.ExctnConf)
      test.ok(Callback.sendRequest.getCall(0).args[0].payload.body.TxInfAndSts.PrcgDt)
      test.ok(Callback.sendRequest.getCall(0).args[0].payload.body.TxInfAndSts.TxSts)
      test.equal(result, expected)
      test.end()
    })

    await processMessageTest.test('transform hub sent transfer ABORT_VALIDATION message when in iso mode', async test => {
      test.end()
    })

    await processMessageTest.test('transform hub sent transfer FX_ABORT_VALIDATION message when in iso mode', async test => {
      test.end()
    })

    await processMessageTest.test('transform hub sent transfer RESERVED_ABORTED message when in iso mode', async test => {
      test.end()
    })

    await processMessageTest.test('transform hub sent transfer FX_RESERVED_ABORTED message when in iso mode', async test => {
      test.end()
    })

    processMessageTest.end()
  })
  notificationTest.end()
})
