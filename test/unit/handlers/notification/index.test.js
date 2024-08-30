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
const Consumer = require('@mojaloop/central-services-stream').Kafka.Consumer
const EncodePayload = require('@mojaloop/central-services-shared').Util.StreamingProtocol.encodePayload
const Logger = require('@mojaloop/central-services-logger')
const FSPIOPError = require('@mojaloop/central-services-error-handling').Factory.FSPIOPError
const ErrorHandlingEnums = require('@mojaloop/central-services-error-handling').Enums.Internal
const Util = require('@mojaloop/central-services-shared').Util
const Callback = require('@mojaloop/central-services-shared').Util.Request
const Config = require(`${src}/lib/config.js`)
const Participant = require(`${src}/domain/participant`)
const ENUM = require('@mojaloop/central-services-shared').Enum
const JwsSigner = require('@mojaloop/sdk-standard-components').Jws.signer
const Uuid = require('uuid4')
const HeadersLib = require(`${src}/lib/headers`)

Test('Notification Service tests', async notificationTest => {
  let sandbox
  let createCallbackHeadersSpy
  let createCallbackHeaders
  let Notification
  const responseType = ENUM.Http.ResponseTypes.JSON
  const hubNameRegex = Util.HeaderValidation.getHubNameRegex(Config.HUB_NAME)
  const match = Sinon.match

  const url = 'https://somehost:port/'
  const proxyUrl = 'https://proxyhost:port/'

  await notificationTest.beforeEach(t => {
    sandbox = Sinon.createSandbox()
    sandbox.stub(Consumer.prototype, 'constructor')

    sandbox.stub(Consumer.prototype, 'connect').returns(Promise.resolve(true))
    // sandbox.stub(Consumer.prototype, 'consume').callsArgAsync(0)
    sandbox.stub(Consumer.prototype, 'consume').returns(Promise.resolve(true)) // .callsArgAsync(0)
    sandbox.stub(Consumer.prototype, 'commitMessageSync').returns(Promise.resolve(true))
    sandbox.stub(Participant, 'getEndpoint').callsFake(({ fsp, proxy }) => {
      const result = fsp.includes('proxied') ? proxyUrl : url
      return Promise.resolve(proxy ? { url: result } : result)
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
    t.end()
  })

  await notificationTest.test('processMessage should', async processMessageTest => {
    await processMessageTest.test('process a prepare message received from kafka and send out a transfer post callback payload with an error, but without cause entry from extensionList extension', async test => {
      const msg = {
        value: {
          metadata: {
            event: {
              type: 'prepare',
              action: 'prepare',
              state: {
                status: 'success',
                code: 0
              }
            }
          },
          content: {
            headers: {},
            payload: {
              errorInformation: {
                errorCode: '3100',
                errorDescription: 'Validation error - PartyIdTypeEnum',
                extensionList: {
                  extension: [
                    {
                      key: ErrorHandlingEnums.FSPIOPError.ExtensionsKeys.cause,
                      value: 'FSPIOPError: PartyIdTypeEnum\n    at createFSPIOPError (/Users/juancorrea/Documents/MuleSoft/Projects/ModusBox/BMGF-2/github/myfo'
                    }
                  ]
                }
              }
            },
            uriParams: { id: 'b51ec534-ee48-4575-b6a9-ead2955b8098' }
          },
          to: 'dfsp2',
          from: 'dfsp1',
          id: 'b51ec534-ee48-4575-b6a9-ead2955b8098'
        }
      }
      const method = ENUM.Http.RestMethods.POST
      const url = await Participant.getEndpoint({ fsp: msg.value.to, endpointType: ENUM.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_TRANSFER_POST, id: msg.value.content.uriParams.id })
      const headers = createCallbackHeaders({ headers: msg.value.content.headers, httpMethod: ENUM.Http.RestMethods.POST, endpointTemplate: ENUM.EndPoints.FspEndpointTemplates.TRANSFERS_POST })
      const message = {
        errorInformation: {
          errorCode: '3100',
          errorDescription: 'Validation error - PartyIdTypeEnum'
        }
      }
      const expected = true
      Callback.sendRequest.withArgs(match({ url, headers, source: msg.value.from, destination: msg.value.to, method, payload: JSON.stringify(message), hubNameRegex })).returns(Promise.resolve(200))
      createCallbackHeadersSpy.resetHistory()
      Participant.getEndpoint.resetHistory()

      const result = await Notification.processMessage(msg)

      test.ok(Callback.sendRequest.calledWith(match({ url, headers, source: msg.value.from, destination: msg.value.to, method, payload: JSON.stringify(message), span: undefined, hubNameRegex })))
      test.ok(Participant.getEndpoint.calledWith(match({ fsp: msg.value.to, endpointType: ENUM.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_TRANSFER_POST, id: msg.value.content.uriParams.id, isFx: false, span: undefined })))
      test.ok(createCallbackHeadersSpy.calledWith(match({ headers: msg.value.content.headers, httpMethod: ENUM.Http.RestMethods.POST, endpointTemplate: ENUM.EndPoints.FspEndpointTemplates.TRANSFERS_POST })))
      test.equal(result, expected)
      test.end()
    })

    await processMessageTest.test('process a prepare message received from kafka and send out an fx transfer post callback payload with an error, but without cause entry from extensionList extension', async test => {
      const msg = {
        value: {
          metadata: {
            event: {
              type: 'prepare',
              action: 'fx-prepare',
              state: {
                status: 'success',
                code: 0
              }
            }
          },
          content: {
            headers: {},
            payload: {
              errorInformation: {
                errorCode: '3100',
                errorDescription: 'Validation error - PartyIdTypeEnum',
                extensionList: {
                  extension: [
                    {
                      key: ErrorHandlingEnums.FSPIOPError.ExtensionsKeys.cause,
                      value: 'FSPIOPError: PartyIdTypeEnum\n    at createFSPIOPError (/Users/juancorrea/Documents/MuleSoft/Projects/ModusBox/BMGF-2/github/myfo'
                    }
                  ]
                }
              }
            },
            uriParams: { id: 'b51ec534-ee48-4575-b6a9-ead2955b8098' }
          },
          to: 'dfsp2',
          from: 'dfsp1',
          id: 'b51ec534-ee48-4575-b6a9-ead2955b8098'
        }
      }
      const method = ENUM.Http.RestMethods.POST
      const url = await Participant.getEndpoint({ fsp: msg.value.to, endpointType: ENUM.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_FX_TRANSFER_POST, id: msg.value.content.uriParams.id })
      const headers = createCallbackHeaders({ headers: msg.value.content.headers, httpMethod: ENUM.Http.RestMethods.POST, endpointTemplate: ENUM.EndPoints.FspEndpointTemplates.FX_TRANSFERS_POST })
      const message = {
        errorInformation: {
          errorCode: '3100',
          errorDescription: 'Validation error - PartyIdTypeEnum'
        }
      }
      const expected = true
      Callback.sendRequest.withArgs(match({ url, headers, source: msg.value.from, destination: msg.value.to, method, payload: JSON.stringify(message), hubNameRegex })).returns(Promise.resolve(200))
      createCallbackHeadersSpy.resetHistory()
      Participant.getEndpoint.resetHistory()

      const result = await Notification.processMessage(msg)

      test.ok(Callback.sendRequest.calledWith(match({ url, headers, source: msg.value.from, destination: msg.value.to, method, payload: JSON.stringify(message), hubNameRegex })))
      test.ok(Participant.getEndpoint.calledWith(match({ fsp: msg.value.to, endpointType: ENUM.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_FX_TRANSFER_POST, id: msg.value.content.uriParams.id, isFx: true, span: undefined })))
      test.ok(createCallbackHeadersSpy.calledWith(match({ headers: msg.value.content.headers, httpMethod: ENUM.Http.RestMethods.POST, endpointTemplate: ENUM.EndPoints.FspEndpointTemplates.FX_TRANSFERS_POST })))
      test.equal(result, expected)
      test.end()
    })

    await processMessageTest.test('process a prepare message received from kafka and send out a transfer post callback', async test => {
      const uuid = Uuid()
      const msg = {
        value: {
          metadata: {
            event: {
              type: 'prepare',
              action: 'prepare',
              state: {
                status: 'success',
                code: 0
              }
            }
          },
          content: {
            headers: {},
            payload: {
              transferId: uuid
            }
          },
          to: 'dfsp2',
          from: 'dfsp1',
          id: 'b51ec534-ee48-4575-b6a9-ead2955b8098'
        }
      }
      const method = ENUM.Http.RestMethods.POST
      const url = await Participant.getEndpoint({ fsp: msg.value.to, endpointType: ENUM.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_TRANSFER_POST, id: msg.value.content.payload.transferId })
      const headers = createCallbackHeaders({ headers: msg.value.content.headers, httpMethod: ENUM.Http.RestMethods.POST, endpointTemplate: ENUM.EndPoints.FspEndpointTemplates.TRANSFERS_POST })
      const message = { transferId: uuid }
      const expected = true
      Callback.sendRequest.withArgs(match({ url, headers, source: msg.value.from, destination: msg.value.to, method, payload: JSON.stringify(message), hubNameRegex })).returns(Promise.resolve(200))
      createCallbackHeadersSpy.resetHistory()
      Participant.getEndpoint.resetHistory()

      const result = await Notification.processMessage(msg)

      test.ok(Callback.sendRequest.calledWith(match({ url, headers, source: msg.value.from, destination: msg.value.to, method, payload: JSON.stringify(message), hubNameRegex })))
      test.ok(Participant.getEndpoint.calledWith(match({ fsp: msg.value.to, endpointType: ENUM.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_TRANSFER_POST, id: msg.value.content.payload.transferId, isFx: false, span: undefined })))
      test.ok(createCallbackHeadersSpy.calledWith(match({ headers: msg.value.content.headers, httpMethod: ENUM.Http.RestMethods.POST, endpointTemplate: ENUM.EndPoints.FspEndpointTemplates.TRANSFERS_POST })))
      test.equal(result, expected)
      test.end()
    })

    await processMessageTest.test('process a prepare message received from kafka and send out a transfer post callback to proxy', async test => {
      const uuid = Uuid()
      const msg = {
        value: {
          metadata: {
            event: {
              type: 'prepare',
              action: 'prepare',
              state: {
                status: 'success',
                code: 0
              }
            }
          },
          content: {
            headers: {},
            payload: {
              transferId: uuid
            }
          },
          to: 'proxied',
          from: 'dfsp1',
          id: 'b51ec534-ee48-4575-b6a9-ead2955b8098'
        }
      }
      const method = ENUM.Http.RestMethods.POST
      const url = await Participant.getEndpoint({ fsp: msg.value.to, endpointType: ENUM.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_TRANSFER_POST, id: msg.value.content.payload.transferId })
      const headers = createCallbackHeaders({ headers: msg.value.content.headers, httpMethod: ENUM.Http.RestMethods.POST, endpointTemplate: ENUM.EndPoints.FspEndpointTemplates.TRANSFERS_POST })
      const message = { transferId: uuid }
      const expected = true
      Callback.sendRequest.withArgs(match({ url, headers, source: msg.value.from, destination: msg.value.to, method, payload: JSON.stringify(message), hubNameRegex })).returns(Promise.resolve(200))
      createCallbackHeadersSpy.resetHistory()
      Participant.getEndpoint.resetHistory()

      const result = await Notification.processMessage(msg)

      test.equal(url, proxyUrl)
      test.ok(Callback.sendRequest.calledWith(match({ url, headers, source: msg.value.from, destination: msg.value.to, method, payload: JSON.stringify(message), hubNameRegex })))
      test.ok(Participant.getEndpoint.calledWith(match({ fsp: msg.value.to, endpointType: ENUM.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_TRANSFER_POST, id: msg.value.content.payload.transferId, isFx: false, span: undefined })))
      test.ok(createCallbackHeadersSpy.calledWith(match({ headers: msg.value.content.headers, httpMethod: ENUM.Http.RestMethods.POST, endpointTemplate: ENUM.EndPoints.FspEndpointTemplates.TRANSFERS_POST })))
      test.equal(result, expected)
      test.end()
    })

    await processMessageTest.test('process an fx prepare message received from kafka and send out a fx transfer post callback', async test => {
      const uuid = Uuid()
      const msg = {
        value: {
          metadata: {
            event: {
              type: 'prepare',
              action: 'fx-prepare',
              state: {
                status: 'success',
                code: 0
              }
            }
          },
          content: {
            headers: {},
            payload: {
              commitRequestId: uuid
            }
          },
          to: 'fxp1',
          from: 'dfsp1',
          id: 'b51ec534-ee48-4575-b6a9-ead2955b8098'
        }
      }
      const method = ENUM.Http.RestMethods.POST
      const url = await Participant.getEndpoint({ fsp: msg.value.to, endpointType: ENUM.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_FX_TRANSFER_POST, id: msg.value.content.payload.commitRequestId })
      const headers = createCallbackHeaders({ headers: msg.value.content.headers, httpMethod: ENUM.Http.RestMethods.POST, endpointTemplate: ENUM.EndPoints.FspEndpointTemplates.FX_TRANSFERS_POST })
      const message = { commitRequestId: uuid }
      const expected = true
      Callback.sendRequest.withArgs(match({ url, headers, source: msg.value.from, destination: msg.value.to, method, payload: JSON.stringify(message), hubNameRegex })).returns(Promise.resolve(200))
      createCallbackHeadersSpy.resetHistory()
      Participant.getEndpoint.resetHistory()

      const result = await Notification.processMessage(msg)

      test.ok(Callback.sendRequest.calledWith(match({ url, headers, source: msg.value.from, destination: msg.value.to, method, payload: JSON.stringify(message), hubNameRegex })))
      test.ok(Participant.getEndpoint.calledWith(match({ fsp: msg.value.to, endpointType: ENUM.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_FX_TRANSFER_POST, id: msg.value.content.payload.commitRequestId, isFx: true, span: undefined })))
      test.ok(createCallbackHeadersSpy.calledWith(match({ headers: msg.value.content.headers, httpMethod: ENUM.Http.RestMethods.POST, endpointTemplate: ENUM.EndPoints.FspEndpointTemplates.FX_TRANSFERS_POST })))
      test.equal(result, expected)
      test.end()
    })

    await processMessageTest.test('process a prepare message received from kafka and send out a transfer post callback with injected protocolVersions config', async test => {
      const ConfigStub = Util.clone(Config)
      // override the PROTOCOL_VERSIONS config
      ConfigStub.PROTOCOL_VERSIONS = {
        CONTENT: {
          DEFAULT: '2.1',
          VALIDATELIST: [
            '2',
            '2.1'
          ]
        },
        ACCEPT: {
          DEFAULT: '2',
          VALIDATELIST: [
            '2',
            '2.1'
          ]
        }
      }

      const NotificationProxy = Proxyquire(`${src}/handlers/notification`, {
        '../../lib/config': ConfigStub
      })
      const uuid = Uuid()
      const msg = {
        value: {
          metadata: {
            event: {
              type: 'prepare',
              action: 'prepare',
              state: {
                status: 'success',
                code: 0
              }
            }
          },
          content: {
            headers: {},
            payload: {
              transferId: uuid
            }
          },
          to: 'dfsp2',
          from: 'dfsp1',
          id: 'b51ec534-ee48-4575-b6a9-ead2955b8098'
        }
      }

      const method = ENUM.Http.RestMethods.POST
      const url = await Participant.getEndpoint({ fsp: msg.value.to, endpointType: ENUM.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_TRANSFER_POST, id: msg.value.content.payload.transferId })
      const headers = createCallbackHeaders({ headers: msg.value.content.headers, httpMethod: ENUM.Http.RestMethods.POST, endpointTemplate: ENUM.EndPoints.FspEndpointTemplates.TRANSFERS_POST })
      const message = { transferId: uuid }
      const expected = true
      Callback.sendRequest.withArgs(match({ url, headers, source: msg.value.from, destination: msg.value.to, method, payload: JSON.stringify(message), hubNameRegex })).returns(Promise.resolve(200))

      const result = await NotificationProxy.processMessage(msg)

      test.ok(Callback.sendRequest.calledWith(match({ url, headers, source: msg.value.from, destination: msg.value.to, method, payload: JSON.stringify(message), hubNameRegex })))
      test.equal(result, expected)
      test.equal(Callback.sendRequest.args[0][0].protocolVersions.content, ConfigStub.PROTOCOL_VERSIONS.CONTENT.DEFAULT)
      test.equal(Callback.sendRequest.args[0][0].protocolVersions.accept, ConfigStub.PROTOCOL_VERSIONS.ACCEPT.DEFAULT)
      test.end()
    })

    processMessageTest.test('process a commit message received from kafka and send out a transfer post callback should throw', async test => {
      const payeeFsp = 'dfsp1'
      const payerFsp = 'dfsp2'
      const uuid = Uuid()
      const msg = {
        value: {
          metadata: {
            event: {
              type: 'notification',
              action: 'commit',
              state: {
                status: 'success',
                code: 0
              }
            }
          },
          content: {
            headers: {
              'FSPIOP-Destination': payeeFsp,
              'FSPIOP-Source': payerFsp
            },
            payload: { transferId: uuid }
          },
          to: payeeFsp,
          from: payerFsp,
          id: 'b51ec534-ee48-4575-b6a9-ead2955b8098'
        }
      }

      const urlPayee = await Participant.getEndpoint({ fsp: msg.value.to, endpointType: ENUM.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_TRANSFER_PUT, id: msg.value.content.payload.transferId })
      const urlPayer = await Participant.getEndpoint({ fsp: msg.value.from, endpointType: ENUM.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_TRANSFER_PUT, id: msg.value.content.payload.transferId })
      const method = ENUM.Http.RestMethods.PUT
      const payeeHeaders = createCallbackHeaders({ dfspId: msg.value.to, transferId: msg.value.content.payload.transferId, headers: msg.value.content.headers, httpMethod: method, endpointTemplate: ENUM.EndPoints.FspEndpointTemplates.TRANSFERS_PUT })
      const payerHeaders = createCallbackHeaders({ dfspId: msg.value.from, transferId: msg.value.content.payload.transferId, headers: msg.value.content.headers, httpMethod: method, endpointTemplate: ENUM.EndPoints.FspEndpointTemplates.TRANSFERS_PUT }, true)
      const message = { transferId: uuid }
      try {
        Callback.sendRequest.withArgs(match({ url: urlPayee, headers: payeeHeaders, source: msg.value.from, destination: msg.value.to, method, payload: JSON.stringify(message), hubNameRegex })).returns(Promise.resolve(200))
        Callback.sendRequest.withArgs(match({ url: urlPayer, headers: payerHeaders, source: Config.HUB_NAME, destination: msg.value.from, method, payload: JSON.stringify(message), responseType, span: undefined, jwsSigner: undefined, hubNameRegex })).returns(Promise.reject(new Error()))
        await Notification.processMessage(msg)
        test.fail('should throw')
        test.end()
      } catch (e) {
        test.ok(e, 'error thrown')
        test.end()
      }
    })

    processMessageTest.test('process message with action "abort-validation" action received from kafka and send out a transfer PUT error callback', async test => {
      // Disable SEND_TRANSFER_CONFIRMATION_TO_PAYEE
      const ORIGINAL_SEND_TRANSFER_CONFIRMATION_TO_PAYEE = Config.SEND_TRANSFER_CONFIRMATION_TO_PAYEE
      Config.SEND_TRANSFER_CONFIRMATION_TO_PAYEE = false
      const msg = {
        value: {
          from: 'dfsp1',
          to: 'dfsp2',
          id: '6b74834e-688b-419f-aa59-145ccb962b24',
          content: {
            uriParams: {
              id: '6b74834e-688b-419f-aa59-145ccb962b24'
            },
            headers: {
              accept: 'application/vnd.interoperability.transfers+json;version=1.1',
              'content-type': 'application/vnd.interoperability.transfers+json;version=1.1',
              date: '2021-11-08T09:35:59.000Z',
              'fspiop-uri': '/transfers/6b74834e-688b-419f-aa59-145ccb962b24',
              'fspiop-http-method': 'PUT',
              'fspiop-source': 'payeefsp',
              'fspiop-destination': 'payerfsp',
              'fspiop-signature': '{{fspiopSignature}}',
              authorization: 'Bearer {{NORESPONSE_SIMPAYEE_BEARER_TOKEN}}',
              host: 'localhost:3000',
              'accept-encoding': 'gzip, deflate, br',
              connection: 'keep-alive',
              'content-length': '97'
            },
            payload: {
              errorInformation: {
                errorCode: '3100',
                errorDescription: 'Generic validation error - invalid fulfilment',
                extensionList: {
                  extension: [
                    {
                      key: 'cause',
                      value: 'FSPIOPError: invalid fulfilment\n    at Object.createFSPIOPError (/Users/mdebarros/Documents/work/projects/mojaloop/git/central-ledger/node_modules/@mojaloop/central-services-error-handling/src/factory.js:198:12)\n    at fulfil (/Users/mdebarros/Documents/work/projects/mojaloop/git/central-ledger/src/handlers/transfers/handler.js:439:52)\n    at processTicksAndRejections (internal/process/task_queues.js:97:5)'
                    }
                  ]
                }
              }
            }
          },
          type: 'application/json',
          metadata: {
            correlationId: '6b74834e-688b-419f-aa59-145ccb962b24',
            event: {
              type: 'notification',
              action: 'abort-validation',
              createdAt: '2021-11-08T11:35:59.183Z',
              state: {
                status: 'success',
                code: 0,
                description: 'action successful'
              },
              id: '11e08d8b-76d0-48e2-9a88-9c24f5e9d6f5',
              responseTo: 'fd86e9ed-8d85-4c42-be15-f3cba6b68ae8'
            },
            trace: {
              startTimestamp: '2021-11-08T11:36:05.033Z',
              service: 'cl_transfer_position',
              traceId: '000d6eafe3f9a7541148009044eb18d1',
              spanId: 'd2eeab3327961401',
              parentSpanId: '80cbe7ac57bf9384',
              tags: {
                tracestate: 'acmevendor=eyJzcGFuSWQiOiJkMmVlYWIzMzI3OTYxNDAxIiwidGltZUFwaUZ1bGZpbCI6IjE2MzYzNzEzNTkxODAifQ==',
                transactionType: 'transfer',
                transactionAction: 'fulfil',
                transactionId: '6b74834e-688b-419f-aa59-145ccb962b24',
                source: 'payeefsp',
                destination: 'payerfsp'
              },
              tracestates: {
                acmevendor: {
                  spanId: 'd2eeab3327961401',
                  timeApiFulfil: '1636371359180'
                }
              }
            },
            'protocol.createdAt': 1636371368576
          }
        }
      }

      const urlPayee = await Participant.getEndpoint({ fsp: msg.value.to, endpointType: ENUM.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_TRANSFER_ERROR, id: msg.value.content.uriParams.id })
      const urlPayer = await Participant.getEndpoint({ fsp: msg.value.from, endpointType: ENUM.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_TRANSFER_ERROR, id: msg.value.content.uriParams.id })
      const method = ENUM.Http.RestMethods.PUT
      const payeeHeaders = createCallbackHeaders({ dfspId: msg.value.to, transferId: msg.value.content.uriParams.id, headers: msg.value.content.headers, httpMethod: method, endpointTemplate: ENUM.EndPoints.FspEndpointTemplates.TRANSFERS_PUT_ERROR }, true)
      const payerHeaders = createCallbackHeaders({ dfspId: msg.value.from, transferId: msg.value.content.uriParams.id, headers: msg.value.content.headers, httpMethod: method, endpointTemplate: ENUM.EndPoints.FspEndpointTemplates.TRANSFERS_PUT_ERROR }, true)
      const message = {
        errorInformation:
        {
          errorCode: '3100',
          errorDescription: 'Generic validation error - invalid fulfilment'
        }
      }
      try {
        // callback request to PayerFSP
        Callback.sendRequest.withArgs(match({ url: urlPayer, headers: payeeHeaders, source: Config.HUB_NAME, destination: msg.value.to, method, payload: JSON.stringify(message), hubNameRegex })).returns(Promise.resolve(200))
        // callback request to PayeeFSP
        Callback.sendRequest.withArgs(match({ url: urlPayee, headers: payerHeaders, source: Config.HUB_NAME, destination: msg.value.from, method, payload: JSON.stringify(message), hubNameRegex })).returns(Promise.resolve(200))
        createCallbackHeadersSpy.resetHistory()
        Participant.getEndpoint.resetHistory()

        // process message
        const result = await Notification.processMessage(msg)

        test.ok(Participant.getEndpoint.calledWith(match({ fsp: msg.value.to, endpointType: ENUM.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_TRANSFER_ERROR, id: msg.value.content.uriParams.id, isFx: false, span: undefined })))
        test.ok(createCallbackHeadersSpy.calledWith(match({ dfspId: msg.value.to, transferId: msg.value.content.uriParams.id, headers: msg.value.content.headers, httpMethod: method, endpointTemplate: ENUM.EndPoints.FspEndpointTemplates.TRANSFERS_PUT_ERROR }), true))
        test.ok(Callback.sendRequest.calledOnce)
        test.ok(Callback.sendRequest.calledWith(match({ url, headers: payerHeaders, source: Config.HUB_NAME, destination: msg.value.to, method, payload: JSON.stringify(message), hubNameRegex })))
        test.equal(result, true)
        test.end()
      } catch (e) {
        test.fail('should not throw')
        test.end()
      }
      // Reset SEND_TRANSFER_CONFIRMATION_TO_PAYEE
      Config.SEND_TRANSFER_CONFIRMATION_TO_PAYEE = ORIGINAL_SEND_TRANSFER_CONFIRMATION_TO_PAYEE
    })

    processMessageTest.test('process message with action "fx-abort-validation" action received from kafka and send out a transfer PUT error callback', async test => {
      // Disable SEND_TRANSFER_CONFIRMATION_TO_PAYEE
      const ORIGINAL_SEND_TRANSFER_CONFIRMATION_TO_PAYEE = Config.SEND_TRANSFER_CONFIRMATION_TO_PAYEE
      Config.SEND_TRANSFER_CONFIRMATION_TO_PAYEE = false
      const msg = {
        value: {
          from: 'dfsp1',
          to: 'fxp1',
          id: '6b74834e-688b-419f-aa59-145ccb962b24',
          content: {
            uriParams: {
              id: '6b74834e-688b-419f-aa59-145ccb962b24'
            },
            headers: {
              accept: 'application/vnd.interoperability.transfers+json;version=1.1',
              'content-type': 'application/vnd.interoperability.transfers+json;version=1.1',
              date: '2021-11-08T09:35:59.000Z',
              'fspiop-uri': '/transfers/6b74834e-688b-419f-aa59-145ccb962b24',
              'fspiop-http-method': 'PUT',
              'fspiop-source': 'fxp1',
              'fspiop-destination': 'dfsp1',
              'fspiop-signature': '{{fspiopSignature}}',
              authorization: 'Bearer {{NORESPONSE_SIMPAYEE_BEARER_TOKEN}}',
              host: 'localhost:3000',
              'accept-encoding': 'gzip, deflate, br',
              connection: 'keep-alive',
              'content-length': '97'
            },
            payload: {
              errorInformation: {
                errorCode: '3100',
                errorDescription: 'Generic validation error - invalid fulfilment',
                extensionList: {
                  extension: [
                    {
                      key: 'cause',
                      value: 'FSPIOPError: invalid fulfilment\n    at Object.createFSPIOPError (/Users/mdebarros/Documents/work/projects/mojaloop/git/central-ledger/node_modules/@mojaloop/central-services-error-handling/src/factory.js:198:12)\n    at fulfil (/Users/mdebarros/Documents/work/projects/mojaloop/git/central-ledger/src/handlers/transfers/handler.js:439:52)\n    at processTicksAndRejections (internal/process/task_queues.js:97:5)'
                    }
                  ]
                }
              }
            }
          },
          type: 'application/json',
          metadata: {
            correlationId: '6b74834e-688b-419f-aa59-145ccb962b24',
            event: {
              type: 'notification',
              action: 'fx-abort-validation',
              createdAt: '2021-11-08T11:35:59.183Z',
              state: {
                status: 'success',
                code: 0,
                description: 'action successful'
              },
              id: '11e08d8b-76d0-48e2-9a88-9c24f5e9d6f5',
              responseTo: 'fd86e9ed-8d85-4c42-be15-f3cba6b68ae8'
            },
            trace: {
              startTimestamp: '2021-11-08T11:36:05.033Z',
              service: 'cl_transfer_position',
              traceId: '000d6eafe3f9a7541148009044eb18d1',
              spanId: 'd2eeab3327961401',
              parentSpanId: '80cbe7ac57bf9384',
              tags: {
                tracestate: 'acmevendor=eyJzcGFuSWQiOiJkMmVlYWIzMzI3OTYxNDAxIiwidGltZUFwaUZ1bGZpbCI6IjE2MzYzNzEzNTkxODAifQ==',
                transactionType: 'transfer',
                transactionAction: 'fulfil',
                transactionId: '6b74834e-688b-419f-aa59-145ccb962b24',
                source: 'dfsp1',
                destination: 'fxp1'
              },
              tracestates: {
                acmevendor: {
                  spanId: 'd2eeab3327961401',
                  timeApiFulfil: '1636371359180'
                }
              }
            },
            'protocol.createdAt': 1636371368576
          }
        }
      }

      const urlFxp = await Participant.getEndpoint({ fsp: msg.value.to, endpointType: ENUM.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_FX_TRANSFER_ERROR, id: msg.value.content.uriParams.id })
      const urlPayer = await Participant.getEndpoint({ fsp: msg.value.from, endpointType: ENUM.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_FX_TRANSFER_ERROR, id: msg.value.content.uriParams.id })
      const method = ENUM.Http.RestMethods.PUT
      const fxpHeaders = createCallbackHeaders({ dfspId: msg.value.to, transferId: msg.value.content.uriParams.id, headers: msg.value.content.headers, httpMethod: method, endpointTemplate: ENUM.EndPoints.FspEndpointTemplates.FX_TRANSFERS_PUT_ERROR }, true)
      const payerHeaders = createCallbackHeaders({ dfspId: msg.value.from, transferId: msg.value.content.uriParams.id, headers: msg.value.content.headers, httpMethod: method, endpointTemplate: ENUM.EndPoints.FspEndpointTemplates.FX_TRANSFERS_PUT_ERROR }, true)
      const message = {
        errorInformation:
        {
          errorCode: '3100',
          errorDescription: 'Generic validation error - invalid fulfilment'
        }
      }
      try {
        // callback request to PayerFSP
        Callback.sendRequest.withArgs(match({ url: urlPayer, headers: fxpHeaders, source: Config.HUB_NAME, destination: msg.value.to, method, payload: JSON.stringify(message), hubNameRegex })).returns(Promise.resolve(200))
        // callback request to FXP
        Callback.sendRequest.withArgs(match({ url: urlFxp, headers: payerHeaders, source: Config.HUB_NAME, destination: msg.value.from, method, payload: JSON.stringify(message), hubNameRegex })).returns(Promise.resolve(200))
        createCallbackHeadersSpy.resetHistory()
        Participant.getEndpoint.resetHistory()

        // process message
        const result = await Notification.processMessage(msg)

        test.ok(Participant.getEndpoint.calledWith(match({ fsp: msg.value.to, endpointType: ENUM.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_FX_TRANSFER_ERROR, id: msg.value.content.uriParams.id, isFx: true, span: undefined })))
        test.ok(createCallbackHeadersSpy.calledWith(match({ dfspId: msg.value.to, transferId: msg.value.content.uriParams.id, headers: msg.value.content.headers, httpMethod: method, endpointTemplate: ENUM.EndPoints.FspEndpointTemplates.FX_TRANSFERS_PUT_ERROR }), true))
        test.ok(Callback.sendRequest.calledOnce)
        test.ok(Callback.sendRequest.calledWith(match({ url, headers: payerHeaders, source: Config.HUB_NAME, destination: msg.value.to, method, payload: JSON.stringify(message), hubNameRegex })))
        test.equal(result, true)
        test.end()
      } catch (e) {
        test.fail('should not throw')
        test.end()
      }
      // Reset SEND_TRANSFER_CONFIRMATION_TO_PAYEE
      Config.SEND_TRANSFER_CONFIRMATION_TO_PAYEE = ORIGINAL_SEND_TRANSFER_CONFIRMATION_TO_PAYEE
    })

    processMessageTest.test('process message with action "abort-validation" action received from kafka and send out a transfer PUT error callback with PayeeFSP Callback', async test => {
      const msg = {
        value: {
          from: 'dfsp1',
          to: 'dfsp2',
          id: '6b74834e-688b-419f-aa59-145ccb962b24',
          content: {
            uriParams: {
              id: '6b74834e-688b-419f-aa59-145ccb962b24'
            },
            headers: {
              accept: 'application/vnd.interoperability.transfers+json;version=1.1',
              'content-type': 'application/vnd.interoperability.transfers+json;version=1.1',
              date: '2021-11-08T09:35:59.000Z',
              'fspiop-uri': '/transfers/6b74834e-688b-419f-aa59-145ccb962b24',
              'fspiop-http-method': 'PUT',
              'fspiop-source': 'payeefsp',
              'fspiop-destination': 'payerfsp',
              'fspiop-signature': '{{fspiopSignature}}',
              authorization: 'Bearer {{NORESPONSE_SIMPAYEE_BEARER_TOKEN}}',
              host: 'localhost:3000',
              'accept-encoding': 'gzip, deflate, br',
              connection: 'keep-alive',
              'content-length': '97'
            },
            payload: {
              errorInformation: {
                errorCode: '3100',
                errorDescription: 'Generic validation error - invalid fulfilment',
                extensionList: {
                  extension: [
                    {
                      key: 'cause',
                      value: 'FSPIOPError: invalid fulfilment\n    at Object.createFSPIOPError (/Users/mdebarros/Documents/work/projects/mojaloop/git/central-ledger/node_modules/@mojaloop/central-services-error-handling/src/factory.js:198:12)\n    at fulfil (/Users/mdebarros/Documents/work/projects/mojaloop/git/central-ledger/src/handlers/transfers/handler.js:439:52)\n    at processTicksAndRejections (internal/process/task_queues.js:97:5)'
                    }
                  ]
                }
              }
            }
          },
          type: 'application/json',
          metadata: {
            correlationId: '6b74834e-688b-419f-aa59-145ccb962b24',
            event: {
              type: 'notification',
              action: 'abort-validation',
              createdAt: '2021-11-08T11:35:59.183Z',
              state: {
                status: 'success',
                code: 0,
                description: 'action successful'
              },
              id: '11e08d8b-76d0-48e2-9a88-9c24f5e9d6f5',
              responseTo: 'fd86e9ed-8d85-4c42-be15-f3cba6b68ae8'
            },
            trace: {
              startTimestamp: '2021-11-08T11:36:05.033Z',
              service: 'cl_transfer_position',
              traceId: '000d6eafe3f9a7541148009044eb18d1',
              spanId: 'd2eeab3327961401',
              parentSpanId: '80cbe7ac57bf9384',
              tags: {
                tracestate: 'acmevendor=eyJzcGFuSWQiOiJkMmVlYWIzMzI3OTYxNDAxIiwidGltZUFwaUZ1bGZpbCI6IjE2MzYzNzEzNTkxODAifQ==',
                transactionType: 'transfer',
                transactionAction: 'fulfil',
                transactionId: '6b74834e-688b-419f-aa59-145ccb962b24',
                source: 'payeefsp',
                destination: 'payerfsp'
              },
              tracestates: {
                acmevendor: {
                  spanId: 'd2eeab3327961401',
                  timeApiFulfil: '1636371359180'
                }
              }
            },
            'protocol.createdAt': 1636371368576
          }
        }
      }

      const urlPayee = await Participant.getEndpoint({ fsp: msg.value.to, endpointType: ENUM.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_TRANSFER_ERROR, id: msg.value.content.uriParams.id })
      const urlPayer = await Participant.getEndpoint({ fsp: msg.value.from, endpointType: ENUM.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_TRANSFER_ERROR, id: msg.value.content.uriParams.id })
      const method = ENUM.Http.RestMethods.PUT
      const payeeHeaders = createCallbackHeaders({ dfspId: msg.value.to, transferId: msg.value.content.uriParams.id, headers: msg.value.content.headers, httpMethod: method, endpointTemplate: ENUM.EndPoints.FspEndpointTemplates.TRANSFERS_PUT_ERROR }, true)
      const payerHeaders = createCallbackHeaders({ dfspId: msg.value.from, transferId: msg.value.content.uriParams.id, headers: msg.value.content.headers, httpMethod: method, endpointTemplate: ENUM.EndPoints.FspEndpointTemplates.TRANSFERS_PUT_ERROR }, true)
      const message = {
        errorInformation:
        {
          errorCode: '3100',
          errorDescription: 'Generic validation error - invalid fulfilment'
        }
      }
      try {
        // callback request to PayerFSP
        Callback.sendRequest.withArgs(match({ url: urlPayer, headers: payeeHeaders, source: Config.HUB_NAME, destination: msg.value.to, method, payload: JSON.stringify(message), hubNameRegex })).returns(Promise.resolve(200))
        // callback request to PayeeFSP
        Callback.sendRequest.withArgs(match({ url: urlPayee, headers: payerHeaders, source: Config.HUB_NAME, destination: msg.value.from, method, payload: JSON.stringify(message), hubNameRegex })).returns(Promise.resolve(200))
        createCallbackHeadersSpy.resetHistory()
        Participant.getEndpoint.resetHistory()

        // process message
        const result = await Notification.processMessage(msg)

        test.ok(Participant.getEndpoint.getCall(0).calledWith(match({ fsp: msg.value.to, endpointType: ENUM.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_TRANSFER_ERROR, id: msg.value.content.uriParams.id, isFx: false, span: undefined })))
        test.ok(Participant.getEndpoint.getCall(1).calledWith(match({ fsp: msg.value.from, endpointType: ENUM.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_TRANSFER_ERROR, id: msg.value.content.uriParams.id, isFx: false, span: undefined })))
        test.ok(createCallbackHeadersSpy.getCall(0).calledWith(match({ dfspId: msg.value.to, transferId: msg.value.content.uriParams.id, headers: msg.value.content.headers, httpMethod: method, endpointTemplate: ENUM.EndPoints.FspEndpointTemplates.TRANSFERS_PUT_ERROR }), true))
        test.ok(createCallbackHeadersSpy.getCall(1).calledWith(match({ dfspId: msg.value.from, transferId: msg.value.content.uriParams.id, headers: msg.value.content.headers, httpMethod: method, endpointTemplate: ENUM.EndPoints.FspEndpointTemplates.TRANSFERS_PUT_ERROR }), true))
        test.ok(Callback.sendRequest.calledTwice)
        test.ok(Callback.sendRequest.calledWith(match({ url, headers: payerHeaders, source: Config.HUB_NAME, destination: msg.value.to, method, payload: JSON.stringify(message), hubNameRegex })))
        test.ok(Callback.sendRequest.calledWith(match({ url, headers: payeeHeaders, source: Config.HUB_NAME, destination: msg.value.from, method, payload: JSON.stringify(message), hubNameRegex })))
        test.equal(result, true)
        test.end()
      } catch (e) {
        test.fail('should not throw')
        test.end()
      }
    })

    processMessageTest.test('process a commit message received from kafka and send out a transfer post callback should throw', async test => {
      const payeeFsp = 'dfsp1'
      const payerFsp = 'dfsp2'
      const uuid = Uuid()
      const msg = {
        value: {
          metadata: {
            event: {
              type: 'notification',
              action: 'commit',
              state: {
                status: 'success',
                code: 0
              }
            }
          },
          content: {
            headers: {
              'FSPIOP-Destination': payeeFsp,
              'FSPIOP-Source': payerFsp
            },
            payload: { transferId: uuid }
          },
          to: payeeFsp,
          from: payerFsp,
          id: 'b51ec534-ee48-4575-b6a9-ead2955b8098'
        }
      }

      const urlPayee = await Participant.getEndpoint({ fsp: msg.value.to, endpointType: ENUM.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_TRANSFER_PUT, id: msg.value.content.payload.transferId })
      const urlPayer = await Participant.getEndpoint({ fsp: msg.value.from, endpointType: ENUM.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_TRANSFER_PUT, id: msg.value.content.payload.transferId })
      const method = ENUM.Http.RestMethods.PUT
      const payeeHeaders = createCallbackHeaders({ dfspId: msg.value.to, transferId: msg.value.content.payload.transferId, headers: msg.value.content.headers, httpMethod: method, endpointTemplate: ENUM.EndPoints.FspEndpointTemplates.TRANSFERS_PUT })
      const payerHeaders = createCallbackHeaders({ dfspId: msg.value.from, transferId: msg.value.content.payload.transferId, headers: msg.value.content.headers, httpMethod: method, endpointTemplate: ENUM.EndPoints.FspEndpointTemplates.TRANSFERS_PUT }, true)
      const message = { transferId: uuid }
      try {
        Callback.sendRequest.withArgs(match({ url: urlPayee, headers: payeeHeaders, source: msg.value.from, destination: msg.value.to, method, payload: JSON.stringify(message), hubNameRegex })).returns(Promise.reject(new Error()))
        Callback.sendRequest.withArgs(match({ url: urlPayer, headers: payerHeaders, source: Config.HUB_NAME, destination: msg.value.from, method, payload: JSON.stringify(message), hubNameRegex })).returns(Promise.resolve(200))
        await Notification.processMessage(msg)
        test.fail('should throw')
        test.end()
      } catch (e) {
        test.ok(e, 'error thrown')
        test.end()
      }
    })

    processMessageTest.test('process a prepare message received from kafka and send out a transfer post callback and base64 encode the payload', async test => {
      const uuid = Uuid()
      const message = { transferId: uuid }
      const encodedPayload = EncodePayload(JSON.stringify(message), 'application/json')
      const msg = {
        value: {
          metadata: {
            event: {
              type: 'prepare',
              action: 'prepare',
              state: {
                status: 'success',
                code: 0
              }
            }
          },
          content: {
            headers: {},
            payload: encodedPayload
          },
          to: 'dfsp2',
          from: 'dfsp1',
          id: 'b51ec534-ee48-4575-b6a9-ead2955b8098'
        }
      }

      const method = ENUM.Http.RestMethods.POST
      const url = await Participant.getEndpoint({ fsp: msg.value.to, endpointType: ENUM.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_TRANSFER_POST, id: msg.value.content.payload.transferId })
      const headers = createCallbackHeaders({ headers: msg.value.content.headers, httpMethod: ENUM.Http.RestMethods.POST, endpointTemplate: ENUM.EndPoints.FspEndpointTemplates.TRANSFERS_POST })

      const expected = true

      Callback.sendRequest.withArgs(match({ url, headers, source: msg.value.from, destination: msg.value.to, method, payload: JSON.stringify(message), hubNameRegex })).returns(Promise.resolve(200))
      const result = await Notification.processMessage(msg)
      test.ok(Callback.sendRequest.calledWith(match({ url, headers, source: msg.value.from, destination: msg.value.to, method, payload: JSON.stringify(message), hubNameRegex })))
      test.equal(result, expected)
      test.end()
    })

    await processMessageTest.test('process a prepare message received from kafka and send out a transfer error notification to the sender', async test => {
      const uuid = Uuid()
      const msg = {
        value: {
          metadata: {
            event: {
              type: 'prepare',
              action: 'prepare',
              state: {
                status: 'error',
                code: 0
              }
            }
          },
          content: {
            headers: {},
            payload: { transferId: uuid }
          },
          to: 'dfsp2',
          from: 'dfsp1',
          id: 'b51ec534-ee48-4575-b6a9-ead2955b8098'
        }
      }
      const method = ENUM.Http.RestMethods.PUT
      const url = await Participant.getEndpoint({ fsp: msg.value.to, endpointType: ENUM.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_TRANSFER_ERROR, id: msg.value.content.payload.transferId })
      const headers = createCallbackHeaders({ dfspId: msg.value.to, transferId: msg.value.content.payload.transferId, headers: msg.value.content.headers, httpMethod: method, endpointTemplate: ENUM.EndPoints.FspEndpointTemplates.TRANSFERS_PUT_ERROR }, true)
      const message = { transferId: uuid }
      const expected = true
      Callback.sendRequest.withArgs(match({ url, headers, source: msg.value.from, destination: msg.value.to, method, payload: JSON.stringify(message), hubNameRegex })).returns(Promise.resolve(200))
      createCallbackHeadersSpy.resetHistory()
      Participant.getEndpoint.resetHistory()

      const result = await Notification.processMessage(msg)

      test.ok(Participant.getEndpoint.calledWith(match({ fsp: msg.value.to, endpointType: ENUM.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_TRANSFER_ERROR, id: msg.value.content.payload.transferId, isFx: false, span: undefined })))
      test.ok(createCallbackHeadersSpy.calledWith(match({ dfspId: msg.value.to, transferId: msg.value.content.payload.transferId, headers: msg.value.content.headers, httpMethod: method, endpointTemplate: ENUM.EndPoints.FspEndpointTemplates.TRANSFERS_PUT_ERROR }), true))
      test.ok(Callback.sendRequest.calledWith(match({ url, headers, source: msg.value.from, destination: msg.value.to, method, payload: JSON.stringify(message), hubNameRegex })))
      test.equal(result, expected)
      test.end()
    })

    await processMessageTest.test('throw error if not able to post the transfer to the receiver', async test => {
      const uuid = Uuid()
      const msg = {
        value: {
          metadata: {
            event: {
              type: 'prepare',
              action: 'prepare',
              state: {
                status: 'success',
                code: 0
              }
            }
          },
          content: {
            headers: {},
            payload: { transferId: uuid }
          },
          to: 'dfsp2',
          from: 'dfsp1',
          id: 'b51ec534-ee48-4575-b6a9-ead2955b8098'
        }
      }
      const method = ENUM.Http.RestMethods.POST
      const url = await Participant.getEndpoint({ fsp: msg.value.to, endpointType: ENUM.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_TRANSFER_POST, id: msg.value.content.payload.transferId })
      const headers = createCallbackHeaders({ headers: msg.value.content.headers, httpMethod: method, endpointTemplate: ENUM.EndPoints.FspEndpointTemplates.TRANSFERS_POST })
      const message = { transferId: uuid }

      Callback.sendRequest.withArgs(match({ url, headers, source: msg.value.from, destination: msg.value.to, method, payload: JSON.stringify(message), hubNameRegex })).throws(new Error())

      try {
        await Notification.processMessage(msg)
        test.fail('Was expecting an error when receiving trying post the transfer to the receiver')
        test.end()
      } catch (e) {
        test.ok(e instanceof Error)
        test.end()
      }
    })

    await processMessageTest.test('throw error if not able to send the notification to the sender', async test => {
      const uuid = Uuid()
      const msg = {
        value: {
          metadata: {
            event: {
              type: 'prepare',
              action: 'prepare',
              state: {
                status: 'error',
                code: 0
              }
            }
          },
          content: {
            headers: {},
            payload: { transferId: uuid }
          },
          to: 'dfsp2',
          from: 'dfsp1',
          id: 'b51ec534-ee48-4575-b6a9-ead2955b8098'
        }
      }
      const method = ENUM.Http.RestMethods.PUT
      const url = await Participant.getEndpoint({ fsp: msg.value.to, endpointType: ENUM.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_TRANSFER_ERROR, id: msg.value.content.payload.transferId })
      const headers = createCallbackHeaders({ dfspId: msg.value.to, transferId: msg.value.content.payload.transferId, headers: msg.value.content.headers, httpMethod: method, endpointTemplate: ENUM.EndPoints.FspEndpointTemplates.TRANSFERS_PUT_ERROR }, true)
      const message = { transferId: uuid }

      Callback.sendRequest.withArgs(match({ url, headers, source: msg.value.from, destination: msg.value.to, method, payload: JSON.stringify(message), hubNameRegex })).throws(new Error())

      try {
        await Notification.processMessage(msg)
        test.fail('Was expecting an error when receiving trying to send an error notification to sender')
        test.end()
      } catch (e) {
        test.ok(e instanceof Error)
        test.end()
      }
    })

    await processMessageTest.test('process a commit message received from kafka and send out a transfer post callback', async test => {
      const payeeFsp = 'dfsp1'
      const payerFsp = 'dfsp2'
      const uuid = Uuid()
      const msg = {
        value: {
          metadata: {
            event: {
              type: 'notification',
              action: 'commit',
              state: {
                status: 'success',
                code: 0
              }
            }
          },
          content: {
            headers: {
              'FSPIOP-Destination': payeeFsp,
              'FSPIOP-Source': payerFsp
            },
            payload: { transferId: uuid }
          },
          to: payeeFsp,
          from: payerFsp,
          id: 'b51ec534-ee48-4575-b6a9-ead2955b8098'
        }
      }

      const urlPayee = await Participant.getEndpoint({ fsp: msg.value.to, endpointType: ENUM.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_TRANSFER_PUT, id: msg.value.content.payload.transferId })
      const urlPayer = await Participant.getEndpoint({ fsp: msg.value.from, endpointType: ENUM.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_TRANSFER_PUT, id: msg.value.content.payload.transferId })
      const method = ENUM.Http.RestMethods.PUT
      const payeeHeaders = createCallbackHeaders({ dfspId: msg.value.to, transferId: msg.value.content.payload.transferId, headers: msg.value.content.headers, httpMethod: method, endpointTemplate: ENUM.EndPoints.FspEndpointTemplates.TRANSFERS_PUT })
      const payerHeaders = createCallbackHeaders({ dfspId: msg.value.from, transferId: msg.value.content.payload.transferId, headers: msg.value.content.headers, httpMethod: method, endpointTemplate: ENUM.EndPoints.FspEndpointTemplates.TRANSFERS_PUT }, true)
      const message = { transferId: uuid }
      const expected = 200
      Callback.sendRequest.withArgs(match({ url: urlPayee, headers: payeeHeaders, source: msg.value.from, destination: msg.value.to, method, payload: JSON.stringify(message), hubNameRegex })).returns(Promise.resolve(200))
      Callback.sendRequest.withArgs(match({ url: urlPayer, headers: payerHeaders, source: Config.HUB_NAME, destination: msg.value.from, method, payload: JSON.stringify(message), hubNameRegex })).returns(Promise.resolve(200))
      Participant.getEndpoint.resetHistory()
      createCallbackHeadersSpy.resetHistory()

      const result = await Notification.processMessage(msg)

      test.ok(Participant.getEndpoint.getCall(0).calledWith(match({ fsp: msg.value.to, endpointType: ENUM.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_TRANSFER_PUT, id: msg.value.content.payload.transferId, isFx: false, span: undefined })))
      test.ok(Participant.getEndpoint.getCall(1).calledWith(match({ fsp: msg.value.from, endpointType: ENUM.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_TRANSFER_PUT, id: msg.value.content.payload.transferId, isFx: false, span: undefined })))
      test.ok(createCallbackHeadersSpy.getCall(0).calledWith(match({ dfspId: msg.value.to, transferId: msg.value.content.payload.transferId, headers: msg.value.content.headers, httpMethod: method, endpointTemplate: ENUM.EndPoints.FspEndpointTemplates.TRANSFERS_PUT })))
      test.ok(createCallbackHeadersSpy.getCall(1).calledWith(match({ dfspId: msg.value.from, transferId: msg.value.content.payload.transferId, headers: msg.value.content.headers, httpMethod: method, endpointTemplate: ENUM.EndPoints.FspEndpointTemplates.TRANSFERS_PUT }), true))
      test.ok(Callback.sendRequest.calledWith(match({ url: urlPayee, headers: payeeHeaders, source: msg.value.from, destination: msg.value.to, method, payload: JSON.stringify(message), hubNameRegex })))
      test.ok(Callback.sendRequest.calledWith(match({ url: urlPayer, headers: payerHeaders, source: Config.HUB_NAME, destination: msg.value.from, method, payload: JSON.stringify(message), hubNameRegex })))
      test.equal(result, expected)
      test.end()
    })

    await processMessageTest.test('process an fx commit message received from kafka and send out callbacks to payerfsp and confirmation to fxp', async test => {
      const payerFsp = 'dfsp1'
      const fxp = 'fxp1'
      const uuid = Uuid()
      const msg = {
        value: {
          metadata: {
            event: {
              type: 'notification',
              action: 'fx-commit',
              state: {
                status: 'success',
                code: 0
              }
            }
          },
          content: {
            headers: {
              'FSPIOP-Destination': payerFsp,
              'FSPIOP-Source': fxp
            },
            payload: { commitRequestId: uuid }
          },
          to: payerFsp,
          from: fxp,
          id: 'b51ec534-ee48-4575-b6a9-ead2955b8098'
        }
      }

      const urlPayer = await Participant.getEndpoint({ fsp: msg.value.to, endpointType: ENUM.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_FX_TRANSFER_PUT, id: msg.value.content.payload.commitRequestId })
      const urlFsp = await Participant.getEndpoint({ fsp: msg.value.from, endpointType: ENUM.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_FX_TRANSFER_PUT, id: msg.value.content.payload.commitRequestId })
      const method = ENUM.Http.RestMethods.PUT
      const payeeHeaders = createCallbackHeaders({ dfspId: msg.value.to, transferId: msg.value.content.payload.commitRequestId, headers: msg.value.content.headers, httpMethod: method, endpointTemplate: ENUM.EndPoints.FspEndpointTemplates.FX_TRANSFERS_PUT })
      const payerHeaders = createCallbackHeaders({ dfspId: msg.value.from, transferId: msg.value.content.payload.commitRequestId, headers: msg.value.content.headers, httpMethod: method, endpointTemplate: ENUM.EndPoints.FspEndpointTemplates.FX_TRANSFERS_PUT }, true)
      const message = { commitRequestId: uuid }
      const expected = 200
      Callback.sendRequest.withArgs(match({ url: urlPayer, headers: payeeHeaders, source: msg.value.from, destination: msg.value.to, method, payload: JSON.stringify(message), hubNameRegex })).returns(Promise.resolve(200))
      Callback.sendRequest.withArgs(match({ url: urlFsp, headers: payerHeaders, source: Config.HUB_NAME, destination: msg.value.from, method, payload: JSON.stringify(message), hubNameRegex })).returns(Promise.resolve(200))
      Participant.getEndpoint.resetHistory()
      createCallbackHeadersSpy.resetHistory()

      const result = await Notification.processMessage(msg)

      test.ok(Participant.getEndpoint.getCall(0).calledWith(match({ fsp: msg.value.to, endpointType: ENUM.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_FX_TRANSFER_PUT, id: msg.value.content.payload.commitRequestId, isFx: true, span: undefined })))
      test.ok(Participant.getEndpoint.getCall(1).calledWith(match({ fsp: msg.value.from, endpointType: ENUM.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_FX_TRANSFER_PUT, id: msg.value.content.payload.commitRequestId, isFx: true, span: undefined })))
      test.ok(createCallbackHeadersSpy.getCall(0).calledWith(match({ dfspId: msg.value.to, transferId: msg.value.content.payload.commitRequestId, headers: msg.value.content.headers, httpMethod: method, endpointTemplate: ENUM.EndPoints.FspEndpointTemplates.FX_TRANSFERS_PUT })))
      test.ok(createCallbackHeadersSpy.getCall(1).calledWith(match({ dfspId: msg.value.from, transferId: msg.value.content.payload.commitRequestId, headers: msg.value.content.headers, httpMethod: method, endpointTemplate: ENUM.EndPoints.FspEndpointTemplates.FX_TRANSFERS_PUT }), true))
      test.ok(Callback.sendRequest.calledWith(match({ url: urlPayer, headers: payeeHeaders, source: msg.value.from, destination: msg.value.to, method, payload: JSON.stringify(message), hubNameRegex })))
      test.ok(Callback.sendRequest.calledWith(match({ url: urlFsp, headers: payerHeaders, source: Config.HUB_NAME, destination: msg.value.from, method, payload: JSON.stringify(message), hubNameRegex })))
      test.equal(result, expected)
      test.end()
    })

    await processMessageTest.test('process an fx commit message received from kafka ( success==false ) and send error callback to fxp', async test => {
      const fxp = 'fxp1'
      const uuid = Uuid()
      const msg = {
        value: {
          metadata: {
            event: {
              type: 'notification',
              action: 'fx-commit',
              state: {
                status: 'error',
                code: 1
              }
            }
          },
          content: {
            headers: {
              'FSPIOP-Destination': fxp,
              'FSPIOP-Source': Config.HUB_NAME
            },
            payload: { commitRequestId: uuid }
          },
          to: fxp,
          from: Config.HUB_NAME,
          id: 'b51ec534-ee48-4575-b6a9-ead2955b8098'
        }
      }

      const urlFsp = await Participant.getEndpoint({ fsp: msg.value.to, endpointType: ENUM.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_FX_TRANSFER_ERROR, id: msg.value.content.payload.commitRequestId })
      const method = ENUM.Http.RestMethods.PUT
      const fxpHeaders = createCallbackHeaders({ dfspId: msg.value.to, transferId: msg.value.content.payload.commitRequestId, headers: msg.value.content.headers, httpMethod: method, endpointTemplate: ENUM.EndPoints.FspEndpointTemplates.FX_TRANSFERS_PUT_ERROR }, true)
      const message = { commitRequestId: uuid }
      const expected = true
      Callback.sendRequest.withArgs(match({ url: urlFsp, headers: fxpHeaders, source: Config.HUB_NAME, destination: msg.value.to, method, payload: JSON.stringify(message), span: undefined, jwsSigner: undefined, hubNameRegex })).returns(Promise.resolve(200))
      Participant.getEndpoint.resetHistory()
      createCallbackHeadersSpy.resetHistory()

      const result = await Notification.processMessage(msg)

      test.ok(Participant.getEndpoint.getCall(0).calledWith(match({ fsp: msg.value.to, endpointType: ENUM.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_FX_TRANSFER_ERROR, id: msg.value.content.payload.commitRequestId, isFx: true, span: undefined })))
      test.ok(createCallbackHeadersSpy.getCall(0).calledWith(match({ dfspId: msg.value.to, transferId: msg.value.content.payload.commitRequestId, headers: msg.value.content.headers, httpMethod: method, endpointTemplate: ENUM.EndPoints.FspEndpointTemplates.FX_TRANSFERS_PUT_ERROR }), true))
      test.ok(Callback.sendRequest.calledWith(match({ url: urlFsp, headers: fxpHeaders, source: Config.HUB_NAME, destination: msg.value.to, method, payload: JSON.stringify(message), responseType: ENUM.Http.ResponseTypes.JSON, hubNameRegex })))
      test.equal(result, expected)
      test.end()
    })

    await processMessageTest.test('process a commit message received from kafka and send out a transfer post callback should throw', async test => {
      const payeeFsp = 'dfsp1'
      const payerFsp = 'dfsp2'
      const uuid = Uuid()
      const msg = {
        value: {
          metadata: {
            event: {
              type: 'notification',
              action: 'commit',
              state: {
                status: 'success',
                code: 0
              }
            }
          },
          content: {
            headers: {
              'FSPIOP-Destination': payeeFsp,
              'FSPIOP-Source': payerFsp
            },
            payload: { transferId: uuid }
          },
          to: payeeFsp,
          from: payerFsp,
          id: 'b51ec534-ee48-4575-b6a9-ead2955b8098'
        }
      }

      const urlPayee = await Participant.getEndpoint({ fsp: msg.value.to, endpointType: ENUM.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_TRANSFER_PUT, id: msg.value.content.payload.transferId })
      const urlPayer = await Participant.getEndpoint({ fsp: msg.value.from, endpointType: ENUM.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_TRANSFER_PUT, id: msg.value.content.payload.transferId })
      const method = ENUM.Http.RestMethods.PUT
      const payeeHeaders = createCallbackHeaders({ dfspId: msg.value.to, transferId: msg.value.content.payload.transferId, headers: msg.value.content.headers, httpMethod: method, endpointTemplate: ENUM.EndPoints.FspEndpointTemplates.TRANSFERS_PUT })
      const payerHeaders = createCallbackHeaders({ dfspId: msg.value.from, transferId: msg.value.content.payload.transferId, headers: msg.value.content.headers, httpMethod: method, endpointTemplate: ENUM.EndPoints.FspEndpointTemplates.TRANSFERS_PUT }, true)
      const message = { transferId: uuid }
      try {
        Callback.sendRequest.withArgs(match({ url: urlPayee, headers: payeeHeaders, source: msg.value.from, destination: msg.value.to, method, payload: JSON.stringify(message), hubNameRegex })).returns(Promise.resolve(200))
        Callback.sendRequest.withArgs(match({ url: urlPayer, headers: payerHeaders, source: Config.HUB_NAME, destination: msg.value.from, method, payload: JSON.stringify(message), hubNameRegex })).returns(Promise.reject(new Error()))
        await Notification.processMessage(msg)
        test.fail('should throw')
        test.end()
      } catch (e) {
        test.ok(e, 'error thrown')
        test.end()
      }
    })

    await processMessageTest.test('process a commit message received from kafka and send out a transfer post callback should throw', async test => {
      const payeeFsp = 'dfsp1'
      const payerFsp = 'dfsp2'
      const uuid = Uuid()
      const msg = {
        value: {
          metadata: {
            event: {
              type: 'notification',
              action: 'commit',
              state: {
                status: 'success',
                code: 0
              }
            }
          },
          content: {
            headers: {
              'FSPIOP-Destination': payeeFsp,
              'FSPIOP-Source': payerFsp
            },
            payload: { transferId: uuid }
          },
          to: payeeFsp,
          from: payerFsp,
          id: 'b51ec534-ee48-4575-b6a9-ead2955b8098'
        }
      }

      const urlPayee = await Participant.getEndpoint({ fsp: msg.value.to, endpointType: ENUM.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_TRANSFER_PUT, id: msg.value.content.payload.transferId })
      const urlPayer = await Participant.getEndpoint({ fsp: msg.value.from, endpointType: ENUM.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_TRANSFER_PUT, id: msg.value.content.payload.transferId })
      const method = ENUM.Http.RestMethods.PUT
      const payeeHeaders = createCallbackHeaders({ dfspId: msg.value.to, transferId: msg.value.content.payload.transferId, headers: msg.value.content.headers, httpMethod: method, endpointTemplate: ENUM.EndPoints.FspEndpointTemplates.TRANSFERS_PUT })
      const payerHeaders = createCallbackHeaders({ dfspId: msg.value.from, transferId: msg.value.content.payload.transferId, headers: msg.value.content.headers, httpMethod: method, endpointTemplate: ENUM.EndPoints.FspEndpointTemplates.TRANSFERS_PUT }, true)
      const message = { transferId: uuid }
      try {
        Callback.sendRequest.withArgs(match({ url: urlPayee, headers: payeeHeaders, source: msg.value.from, destination: msg.value.to, method, payload: JSON.stringify(message), hubNameRegex })).returns(Promise.reject(new Error()))
        Callback.sendRequest.withArgs(match({ url: urlPayer, headers: payerHeaders, source: Config.HUB_NAME, destination: msg.value.from, method, payload: JSON.stringify(message), hubNameRegex })).returns(Promise.resolve(200))
        await Notification.processMessage(msg)
        test.fail('should throw')
        test.end()
      } catch (e) {
        test.ok(e, 'error thrown')
        test.end()
      }
    })

    await processMessageTest.test('throw error if not able to send the notification to the sender', async test => {
      const payerFsp = 'dfsp2'
      const payeeFsp = 'dfsp1'
      const uuid = Uuid()
      const msg = {
        value: {
          metadata: {
            event: {
              type: 'commit',
              action: 'commit',
              state: {
                status: 'error',
                code: 0
              }
            }
          },
          content: {
            headers: {
              'FSPIOP-Destination': payeeFsp,
              'FSPIOP-Source': payerFsp
            },
            payload: { transferId: uuid }
          },
          to: payeeFsp,
          from: payerFsp,
          id: 'b51ec534-ee48-4575-b6a9-ead2955b8098'
        }
      }
      const method = ENUM.Http.RestMethods.PUT
      const url = await Participant.getEndpoint({ fsp: msg.value.to, endpointType: ENUM.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_TRANSFER_ERROR, id: msg.value.content.payload.transferId })
      const headers = createCallbackHeaders({ dfspId: msg.value.to, transferId: msg.value.content.payload.transferId, headers: msg.value.content.headers, httpMethod: method, endpointTemplate: ENUM.EndPoints.FspEndpointTemplates.TRANSFERS_PUT_ERROR }, true)
      const message = { transferId: uuid }

      Callback.sendRequest.withArgs(match({ url, headers, source: msg.value.from, destination: msg.value.to, method, payload: JSON.stringify(message), hubNameRegex })).throws(new Error())

      try {
        await Notification.processMessage(msg)
        test.fail('Was expecting an error when receiving trying to send an error notification to sender')
        test.end()
      } catch (e) {
        test.ok(e instanceof Error)
        test.end()
      }
    })

    processMessageTest.test('throw error if not able to send the notification to the sender', async test => {
      const payerFsp = 'dfsp2'
      const payeeFsp = 'dfsp1'
      const uuid = Uuid()
      const msg = {
        value: {
          metadata: {
            event: {
              type: 'commit',
              action: 'commit',
              state: {
                status: 'error',
                code: 0
              }
            }
          },
          content: {
            headers: {
              'FSPIOP-Destination': payeeFsp,
              'FSPIOP-Source': payerFsp
            },
            payload: { transferId: uuid }
          },
          to: payeeFsp,
          from: payerFsp,
          id: 'b51ec534-ee48-4575-b6a9-ead2955b8098'
        }
      }
      const method = ENUM.Http.RestMethods.PUT
      const url = await Participant.getEndpoint({ fsp: msg.value.to, endpointType: ENUM.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_TRANSFER_ERROR, id: msg.value.content.payload.transferId })
      const headers = createCallbackHeaders({ dfspId: msg.value.to, transferId: msg.value.content.payload.transferId, headers: msg.value.content.headers, httpMethod: method, endpointTemplate: ENUM.EndPoints.FspEndpointTemplates.TRANSFERS_PUT_ERROR }, true)
      const message = { transferId: uuid }

      Callback.sendRequest.withArgs(match({ url, headers, source: msg.value.from, destination: msg.value.to, method, payload: JSON.stringify(message), hubNameRegex })).returns(Promise.resolve(true))

      try {
        await Notification.processMessage(msg)
        test.ok(await Callback.sendRequest({ url, headers, source: msg.value.from, destination: msg.value.to, method, payload: JSON.stringify(message) }))
        test.end()
      } catch (e) {
        test.fail('should be ok')
        test.end()
      }
    })

    processMessageTest.test('should not send notification to sender if "SEND_TRANSFER_CONFIRMATION_TO_PAYEE" is disabled', async test => {
      const ConfigStub = Util.clone(Config)
      ConfigStub.SEND_TRANSFER_CONFIRMATION_TO_PAYEE = false
      const NotificationProxy = Proxyquire(`${src}/handlers/notification`, {
        '../../lib/config': ConfigStub
      })
      const payerFsp = 'dfsp2'
      const payeeFsp = 'dfsp1'
      const uuid = Uuid()
      const msg = {
        value: {
          metadata: {
            event: {
              type: 'notification',
              action: 'commit',
              state: {
                status: 'success',
                code: 0
              }
            }
          },
          content: {
            headers: {
              'FSPIOP-Destination': payeeFsp,
              'FSPIOP-Source': payerFsp
            },
            payload: { transferId: uuid }
          },
          to: payeeFsp,
          from: payerFsp,
          id: 'b51ec534-ee48-4575-b6a9-ead2955b8098'
        }
      }

      const method = ENUM.Http.RestMethods.PUT
      let fromUrl = await Participant.getEndpoint({ fsp: msg.value.from, endpointType: ENUM.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_TRANSFER_PUT, id: msg.value.content.payload.transferId })
      let toUrl = await Participant.getEndpoint({ fsp: msg.value.to, endpointType: ENUM.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_TRANSFER_PUT, id: msg.value.content.payload.transferId })
      let fromHeaders = createCallbackHeaders({ dfspId: msg.value.from, transferId: msg.value.content.payload.transferId, headers: msg.value.content.headers, httpMethod: method, endpointTemplate: ENUM.EndPoints.FspEndpointTemplates.TRANSFERS_PUT }, true)
      let toHeaders = createCallbackHeaders({ dfspId: msg.value.to, transferId: msg.value.content.payload.transferId, headers: msg.value.content.headers, httpMethod: method, endpointTemplate: ENUM.EndPoints.FspEndpointTemplates.TRANSFERS_PUT })
      const message = { transferId: uuid }

      Callback.sendRequest.withArgs(match({ url: fromUrl, headers: fromHeaders, source: Config.HUB_NAME, destination: msg.value.from, method, payload: JSON.stringify(message), responseType: 'json', hubNameRegex })).returns(Promise.resolve(200))

      // test for "commit" action and "success" status
      await NotificationProxy.processMessage(msg)
      test.ok(Callback.sendRequest.calledWith(match({ url: toUrl, headers: toHeaders, source: msg.value.from, destination: msg.value.to, method, payload: JSON.stringify(message), hubNameRegex })))
      test.notok(Callback.sendRequest.calledWith(match({ url: fromUrl, headers: fromHeaders, source: Config.HUB_NAME, destination: msg.value.from, method, payload: JSON.stringify(message), hubNameRegex })))

      // test for "reject" action
      msg.value.metadata.event.action = 'reject'
      await NotificationProxy.processMessage(msg)
      test.ok(Callback.sendRequest.calledWith(match({ url: toUrl, headers: toHeaders, source: msg.value.from, destination: msg.value.to, method, payload: JSON.stringify(message), hubNameRegex })))
      test.notok(Callback.sendRequest.calledWith(match({ url: fromUrl, headers: fromHeaders, source: Config.HUB_NAME, destination: msg.value.from, method, payload: JSON.stringify(message), hubNameRegex })))

      fromUrl = await Participant.getEndpoint({ fsp: msg.value.from, endpointType: ENUM.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_TRANSFER_ERROR, id: msg.value.content.payload.transferId })
      toUrl = await Participant.getEndpoint({ fsp: msg.value.to, endpointType: ENUM.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_TRANSFER_ERROR, id: msg.value.content.payload.transferId })
      fromHeaders = createCallbackHeaders({ dfspId: msg.value.from, transferId: msg.value.content.payload.transferId, headers: msg.value.content.headers, httpMethod: method, endpointTemplate: ENUM.EndPoints.FspEndpointTemplates.TRANSFERS_PUT_ERROR }, true)
      toHeaders = createCallbackHeaders({ dfspId: msg.value.to, transferId: msg.value.content.payload.transferId, headers: msg.value.content.headers, httpMethod: method, endpointTemplate: ENUM.EndPoints.FspEndpointTemplates.TRANSFERS_PUT_ERROR })

      // test for "abort" action
      msg.value.metadata.event.action = 'abort'
      await NotificationProxy.processMessage(msg)
      test.notok(Callback.sendRequest.calledWith(match({ url: fromUrl, headers: fromHeaders, source: Config.HUB_NAME, destination: msg.value.from, method, payload: JSON.stringify(message), hubNameRegex })))
      test.ok(Callback.sendRequest.calledWith(match({ url: toUrl, headers: toHeaders, source: msg.value.from, destination: msg.value.to, method, payload: JSON.stringify(message), hubNameRegex })))

      test.end()
    })

    processMessageTest.test('should not send notification to sender even if "SEND_TRANSFER_CONFIRMATION_TO_PAYEE" is enabled for on-us transfers', async test => {
      const ConfigStub = Util.clone(Config)
      ConfigStub.SEND_TRANSFER_CONFIRMATION_TO_PAYEE = true
      const NotificationProxy = Proxyquire(`${src}/handlers/notification`, {
        '../../lib/config': ConfigStub
      })
      const payerFsp = 'dfsp1'
      const payeeFsp = 'dfsp1'
      const uuid = Uuid()
      const msg = {
        value: {
          metadata: {
            event: {
              type: 'notification',
              action: 'commit',
              state: {
                status: 'success',
                code: 0
              }
            }
          },
          content: {
            headers: {
              'FSPIOP-Destination': payeeFsp,
              'FSPIOP-Source': payerFsp
            },
            payload: { transferId: uuid }
          },
          to: payeeFsp,
          from: payerFsp,
          id: 'b51ec534-ee48-4575-b6a9-ead2955b8098'
        }
      }

      const method = ENUM.Http.RestMethods.PUT
      let fromUrl = await Participant.getEndpoint({ fsp: msg.value.from, endpointType: ENUM.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_TRANSFER_PUT, id: msg.value.content.payload.transferId })
      let toUrl = await Participant.getEndpoint({ fsp: msg.value.to, endpointType: ENUM.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_TRANSFER_PUT, id: msg.value.content.payload.transferId })
      let fromHeaders = createCallbackHeaders({ dfspId: msg.value.from, transferId: msg.value.content.payload.transferId, headers: msg.value.content.headers, httpMethod: method, endpointTemplate: ENUM.EndPoints.FspEndpointTemplates.TRANSFERS_PUT }, true)
      let toHeaders = createCallbackHeaders({ dfspId: msg.value.to, transferId: msg.value.content.payload.transferId, headers: msg.value.content.headers, httpMethod: method, endpointTemplate: ENUM.EndPoints.FspEndpointTemplates.TRANSFERS_PUT })
      const message = { transferId: uuid }

      Callback.sendRequest.withArgs(match({ url: fromUrl, headers: fromHeaders, source: Config.HUB_NAME, destination: msg.value.from, method, payload: JSON.stringify(message), responseType: 'json', hubNameRegex })).returns(Promise.resolve(200))

      // test for "commit" action and "success" status
      await NotificationProxy.processMessage(msg)
      test.ok(Callback.sendRequest.calledWith(match({ url: toUrl, headers: toHeaders, source: msg.value.from, destination: msg.value.to, method, payload: JSON.stringify(message), hubNameRegex })))
      test.notok(Callback.sendRequest.calledWith(match({ url: fromUrl, headers: fromHeaders, source: Config.HUB_NAME, destination: msg.value.from, method, payload: JSON.stringify(message), hubNameRegex })))

      // test for "reject" action
      msg.value.metadata.event.action = 'reject'
      await NotificationProxy.processMessage(msg)
      test.ok(Callback.sendRequest.calledWith(match({ url: toUrl, headers: toHeaders, source: msg.value.from, destination: msg.value.to, method, payload: JSON.stringify(message), hubNameRegex })))
      test.notok(Callback.sendRequest.calledWith(match({ url: fromUrl, headers: fromHeaders, source: Config.HUB_NAME, destination: msg.value.from, method, payload: JSON.stringify(message), hubNameRegex })))

      fromUrl = await Participant.getEndpoint({ fsp: msg.value.from, endpointType: ENUM.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_TRANSFER_ERROR, id: msg.value.content.payload.transferId })
      toUrl = await Participant.getEndpoint({ fsp: msg.value.to, endpointType: ENUM.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_TRANSFER_ERROR, id: msg.value.content.payload.transferId })
      fromHeaders = createCallbackHeaders({ dfspId: msg.value.from, transferId: msg.value.content.payload.transferId, headers: msg.value.content.headers, httpMethod: method, endpointTemplate: ENUM.EndPoints.FspEndpointTemplates.TRANSFERS_PUT_ERROR }, true)
      toHeaders = createCallbackHeaders({ dfspId: msg.value.to, transferId: msg.value.content.payload.transferId, headers: msg.value.content.headers, httpMethod: method, endpointTemplate: ENUM.EndPoints.FspEndpointTemplates.TRANSFERS_PUT_ERROR })

      // test for "abort" action
      msg.value.metadata.event.action = 'abort'
      await NotificationProxy.processMessage(msg)
      test.notok(Callback.sendRequest.calledWith(match({ url: fromUrl, headers: fromHeaders, source: Config.HUB_NAME, destination: msg.value.from, method, payload: JSON.stringify(message), hubNameRegex })))
      test.ok(Callback.sendRequest.calledWith(match({ url: toUrl, headers: toHeaders, source: msg.value.from, destination: msg.value.to, method, payload: JSON.stringify(message), hubNameRegex })))

      test.end()
    })

    await processMessageTest.test('warn if invalid action received from kafka', async test => {
      const CentralServicesLoggerStub = {
        error: sandbox.stub().returns(Promise.resolve()),
        info: sandbox.stub().returns(Promise.resolve()),
        warn: sandbox.stub().returns(Promise.resolve())
      }
      const NotificationProxy = Proxyquire(`${src}/handlers/notification`, {
        '@mojaloop/central-services-logger': CentralServicesLoggerStub
      })
      const uuid = Uuid()
      const msg = {
        value: {
          metadata: {
            event: {
              type: 'prepare',
              action: 'invalid action',
              state: {
                status: 'error',
                code: 0
              }
            }
          },
          content: {
            headers: {},
            payload: { transferId: uuid }
          },
          to: 'dfsp2',
          from: 'dfsp1',
          id: 'b51ec534-ee48-4575-b6a9-ead2955b8098'
        }
      }
      try {
        const result = await NotificationProxy.processMessage(msg)
        test.ok(!result, 'processMessage should have returned false signalling that no action was taken')
        test.ok(CentralServicesLoggerStub.warn.withArgs(`Unknown action received from kafka: ${msg.value.metadata.event.action}`).calledOnce, 'Logger.warn called once')
        test.end()
      } catch (e) {
        test.fail('Error thrown')
        test.end()
      }
    })

    await processMessageTest.test('throw error if invalid message received from kafka', async test => {
      const msg = {}

      try {
        await Notification.processMessage(msg)
        test.fail('Was expecting an error when receiving an invalid message from Kafka')
        test.end()
      } catch (err) {
        test.ok(err instanceof FSPIOPError)
        test.equal(err.message, 'Invalid message received from kafka')
        test.equal(err.apiErrorCode.code, '2001')
        test.end()
      }
    })

    await processMessageTest.test('process the reject message received from kafka and send out a transfer put callback', async test => {
      const uuid = Uuid()
      const payerFsp = 'dfsp2'
      const payeeFsp = 'dfsp1'
      const msg = {
        value: {
          metadata: {
            event: {
              type: 'prepare',
              action: 'reject',
              state: {
                status: 'success',
                code: 0
              }
            }
          },
          content: {
            headers: {
              'FSPIOP-Destination': payeeFsp,
              'FSPIOP-Source': payerFsp
            },
            payload: { transferId: uuid }
          },
          to: payeeFsp,
          from: payerFsp,
          id: 'b51ec534-ee48-4575-b6a9-ead2955b8098'
        }
      }

      const fromUrl = await Participant.getEndpoint({ fsp: msg.value.from, endpointType: ENUM.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_TRANSFER_PUT, id: msg.value.content.payload.transferId })
      const toUrl = await Participant.getEndpoint({ fsp: msg.value.to, endpointType: ENUM.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_TRANSFER_PUT, id: msg.value.content.payload.transferId })
      const method = ENUM.Http.RestMethods.PUT
      const toHeaders = createCallbackHeaders({ dfspId: msg.value.to, transferId: msg.value.content.payload.transferId, headers: msg.value.content.headers, httpMethod: method, endpointTemplate: ENUM.EndPoints.FspEndpointTemplates.TRANSFERS_PUT })
      const fromHeaders = createCallbackHeaders({ dfspId: msg.value.from, transferId: msg.value.content.payload.transferId, headers: msg.value.content.headers, httpMethod: method, endpointTemplate: ENUM.EndPoints.FspEndpointTemplates.TRANSFERS_PUT }, true)
      const message = { transferId: uuid }

      const expected = 200

      Callback.sendRequest.withArgs(match({ url: toUrl, headers: toHeaders, source: msg.value.from, destination: msg.value.to, method, payload: JSON.stringify(message), hubNameRegex })).returns(Promise.resolve(200))
      Callback.sendRequest.withArgs(match({ url: fromUrl, headers: fromHeaders, source: Config.HUB_NAME, destination: msg.value.from, method, payload: JSON.stringify(message), hubNameRegex })).returns(Promise.resolve(200))

      const result = await Notification.processMessage(msg)
      test.ok(Callback.sendRequest.calledWith(match({ url: toUrl, headers: toHeaders, source: msg.value.from, destination: msg.value.to, method, payload: JSON.stringify(message), hubNameRegex })))
      test.ok(Callback.sendRequest.calledWith(match({ url: fromUrl, headers: fromHeaders, source: Config.HUB_NAME, destination: msg.value.from, method, payload: JSON.stringify(message), hubNameRegex })))
      test.equal(result, expected)
      test.end()
    })

    await processMessageTest.test('process an fx reject message received from kafka and send out a transfer put callback', async test => {
      const uuid = Uuid()
      const fxp = 'fxp'
      const payerFsp = 'dfsp1'
      const msg = {
        value: {
          metadata: {
            event: {
              type: 'prepare',
              action: 'fx-reject',
              state: {
                status: 'success',
                code: 0
              }
            }
          },
          content: {
            headers: {
              'FSPIOP-Destination': payerFsp,
              'FSPIOP-Source': fxp
            },
            payload: { commitRequestId: uuid }
          },
          to: payerFsp,
          from: fxp,
          id: 'b51ec534-ee48-4575-b6a9-ead2955b8098'
        }
      }

      const fromUrl = await Participant.getEndpoint({ fsp: msg.value.from, endpointType: ENUM.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_FX_TRANSFER_PUT, id: msg.value.content.payload.commitRequestId })
      const toUrl = await Participant.getEndpoint({ fsp: msg.value.to, endpointType: ENUM.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_FX_TRANSFER_PUT, id: msg.value.content.payload.commitRequestId })
      const method = ENUM.Http.RestMethods.PUT
      const toHeaders = createCallbackHeaders({ dfspId: msg.value.to, transferId: msg.value.content.payload.commitRequestId, headers: msg.value.content.headers, httpMethod: method, endpointTemplate: ENUM.EndPoints.FspEndpointTemplates.FX_TRANSFERS_PUT })
      const fromHeaders = createCallbackHeaders({ dfspId: msg.value.from, transferId: msg.value.content.payload.commitRequestId, headers: msg.value.content.headers, httpMethod: method, endpointTemplate: ENUM.EndPoints.FspEndpointTemplates.FX_TRANSFERS_PUT }, true)
      const message = { commitRequestId: uuid }
      const expected = 200
      Callback.sendRequest.withArgs(match({ url: toUrl, headers: toHeaders, source: msg.value.from, destination: msg.value.to, method, payload: JSON.stringify(message), hubNameRegex })).returns(Promise.resolve(200))
      Callback.sendRequest.withArgs(match({ url: fromUrl, headers: fromHeaders, source: Config.HUB_NAME, destination: msg.value.from, method, payload: JSON.stringify(message), hubNameRegex })).returns(Promise.resolve(200))
      createCallbackHeadersSpy.resetHistory()
      Participant.getEndpoint.resetHistory()

      const result = await Notification.processMessage(msg)

      test.ok(Participant.getEndpoint.getCall(0).calledWith(match({ fsp: msg.value.from, endpointType: ENUM.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_FX_TRANSFER_PUT, id: msg.value.content.payload.commitRequestId, isFx: true, span: undefined })))
      test.ok(Participant.getEndpoint.getCall(1).calledWith(match({ fsp: msg.value.to, endpointType: ENUM.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_FX_TRANSFER_PUT, id: msg.value.content.payload.commitRequestId, isFx: true, span: undefined })))
      test.ok(createCallbackHeadersSpy.getCall(0).calledWith(match({ dfspId: msg.value.to, transferId: msg.value.content.payload.commitRequestId, headers: msg.value.content.headers, httpMethod: method, endpointTemplate: ENUM.EndPoints.FspEndpointTemplates.FX_TRANSFERS_PUT })))
      test.ok(createCallbackHeadersSpy.getCall(1).calledWith(match({ dfspId: msg.value.from, transferId: msg.value.content.payload.commitRequestId, headers: msg.value.content.headers, httpMethod: method, endpointTemplate: ENUM.EndPoints.FspEndpointTemplates.FX_TRANSFERS_PUT }), true))
      test.ok(Callback.sendRequest.calledWith(match({ url: toUrl, headers: toHeaders, source: msg.value.from, destination: msg.value.to, method, payload: JSON.stringify(message), hubNameRegex })))
      test.ok(Callback.sendRequest.calledWith(match({ url: fromUrl, headers: fromHeaders, source: Config.HUB_NAME, destination: msg.value.from, method, payload: JSON.stringify(message), hubNameRegex })))
      test.equal(result, expected)
      test.end()
    })

    await processMessageTest.test('process the abort message received from kafka and send out a transfer put callback', async test => {
      const uuid = Uuid()
      const payerFsp = 'dfsp2'
      const payeeFsp = 'dfsp1'
      const msg = {
        value: {
          metadata: {
            event: {
              type: 'prepare',
              action: 'abort',
              state: {
                status: 'success',
                code: 0
              }
            }
          },
          content: {
            headers: {
              'FSPIOP-Destination': payeeFsp,
              'FSPIOP-Source': payerFsp
            },
            payload: { transferId: uuid }
          },
          to: payeeFsp,
          from: payerFsp,
          id: 'b51ec534-ee48-4575-b6a9-ead2955b8098'
        }
      }
      const fromUrl = await Participant.getEndpoint({ fsp: msg.value.from, endpointType: ENUM.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_TRANSFER_ERROR, id: msg.value.content.payload.transferId })
      const toUrl = await Participant.getEndpoint({ fsp: msg.value.to, endpointType: ENUM.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_TRANSFER_ERROR, id: msg.value.content.payload.transferId })
      const method = ENUM.Http.RestMethods.PUT
      const toHeaders = createCallbackHeaders({ dfspId: msg.value.to, transferId: msg.value.content.payload.transferId, headers: msg.value.content.headers, httpMethod: method, endpointTemplate: ENUM.EndPoints.FspEndpointTemplates.TRANSFERS_PUT_ERROR })
      const fromHeaders = createCallbackHeaders({ dfspId: msg.value.from, transferId: msg.value.content.payload.transferId, headers: msg.value.content.headers, httpMethod: method, endpointTemplate: ENUM.EndPoints.FspEndpointTemplates.TRANSFERS_PUT_ERROR }, true)
      const message = { transferId: uuid }
      const expected = 200
      Callback.sendRequest.withArgs(match({ url: fromUrl, headers: fromHeaders, source: Config.HUB_NAME, destination: msg.value.from, method, payload: JSON.stringify(message), hubNameRegex })).returns(Promise.resolve(200))
      Callback.sendRequest.withArgs(match({ url: toUrl, headers: toHeaders, source: msg.value.from, destination: msg.value.to, method, payload: JSON.stringify(message), hubNameRegex })).returns(Promise.resolve(200))
      Participant.getEndpoint.resetHistory()
      createCallbackHeadersSpy.resetHistory()

      const result = await Notification.processMessage(msg)

      test.ok(Participant.getEndpoint.getCall(0).calledWith(match({ fsp: msg.value.from, endpointType: ENUM.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_TRANSFER_ERROR, id: msg.value.content.payload.transferId, isFx: false, span: undefined })))
      test.ok(Participant.getEndpoint.getCall(1).calledWith(match({ fsp: msg.value.to, endpointType: ENUM.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_TRANSFER_ERROR, id: msg.value.content.payload.transferId, isFx: false, span: undefined })))
      test.ok(createCallbackHeadersSpy.getCall(0).calledWith(match({ dfspId: msg.value.to, transferId: msg.value.content.payload.transferId, headers: msg.value.content.headers, httpMethod: method, endpointTemplate: ENUM.EndPoints.FspEndpointTemplates.TRANSFERS_PUT_ERROR })))
      test.ok(createCallbackHeadersSpy.getCall(1).calledWith(match({ dfspId: msg.value.from, transferId: msg.value.content.payload.transferId, headers: msg.value.content.headers, httpMethod: method, endpointTemplate: ENUM.EndPoints.FspEndpointTemplates.TRANSFERS_PUT_ERROR }), true))
      test.ok(Callback.sendRequest.calledWith(match({ url: toUrl, headers: toHeaders, source: msg.value.from, destination: msg.value.to, method, payload: JSON.stringify(message), hubNameRegex })))
      test.ok(Callback.sendRequest.calledWith(match({ url: fromUrl, headers: fromHeaders, source: Config.HUB_NAME, destination: msg.value.from, method, payload: JSON.stringify(message), hubNameRegex })))
      test.equal(result, expected)
      test.end()
    })

    await processMessageTest.skip('process the fx abort message received from kafka and send out a transfer put callback', async test => {
      const uuid = Uuid()
      const payerFsp = 'dfsp1'
      const fxp = 'fxp1'
      const msg = {
        value: {
          metadata: {
            event: {
              type: 'prepare',
              action: 'fx-abort',
              state: {
                status: 'success',
                code: 0
              }
            }
          },
          content: {
            headers: {
              'FSPIOP-Destination': fxp,
              'FSPIOP-Source': payerFsp
            },
            payload: { commitRequestId: uuid }
          },
          to: payerFsp,
          from: fxp,
          id: 'b51ec534-ee48-4575-b6a9-ead2955b8098'
        }
      }
      const fromUrl = await Participant.getEndpoint({ fsp: msg.value.from, endpointType: ENUM.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_FX_TRANSFER_ERROR, id: msg.value.content.payload.commitRequestId })
      const toUrl = await Participant.getEndpoint({ fsp: msg.value.to, endpointType: ENUM.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_FX_TRANSFER_ERROR, id: msg.value.content.payload.commitRequestId })
      const method = ENUM.Http.RestMethods.PUT
      const toHeaders = createCallbackHeaders({ dfspId: msg.value.to, transferId: msg.value.content.payload.commitRequestId, headers: msg.value.content.headers, httpMethod: method, endpointTemplate: ENUM.EndPoints.FspEndpointTemplates.FX_TRANSFERS_PUT_ERROR })
      const fromHeaders = createCallbackHeaders({ dfspId: msg.value.from, transferId: msg.value.content.payload.commitRequestId, headers: msg.value.content.headers, httpMethod: method, endpointTemplate: ENUM.EndPoints.FspEndpointTemplates.FX_TRANSFERS_PUT_ERROR }, true)
      const message = { transferId: uuid }
      const expected = 200
      Callback.sendRequest.withArgs(match({ url: fromUrl, headers: fromHeaders, source: Config.HUB_NAME, destination: msg.value.from, method, payload: JSON.stringify(message), hubNameRegex })).returns(Promise.resolve(200))
      Callback.sendRequest.withArgs(match({ url: toUrl, headers: toHeaders, source: msg.value.from, destination: msg.value.to, method, payload: JSON.stringify(message), hubNameRegex })).returns(Promise.resolve(200))
      Participant.getEndpoint.resetHistory()
      createCallbackHeadersSpy.resetHistory()

      const result = await Notification.processMessage(msg)

      test.ok(Participant.getEndpoint.getCall(0).calledWith(match({ fsp: msg.value.from, endpointType: ENUM.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_FX_TRANSFER_ERROR, id: msg.value.content.payload.commitRequestId, isFx: false, span: undefined })))
      test.ok(Participant.getEndpoint.getCall(1).calledWith(match({ fsp: msg.value.to, endpointType: ENUM.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_FX_TRANSFER_ERROR, id: msg.value.content.payload.commitRequestId, isFx: false, span: undefined })))
      test.ok(createCallbackHeadersSpy.getCall(0).calledWith(match({ dfspId: msg.value.to, transferId: msg.value.content.payload.commitRequestId, headers: msg.value.content.headers, httpMethod: method, endpointTemplate: ENUM.EndPoints.FspEndpointTemplates.FX_TRANSFERS_PUT_ERROR })))
      test.ok(createCallbackHeadersSpy.getCall(1).calledWith(match({ dfspId: msg.value.from, transferId: msg.value.content.payload.commitRequestId, headers: msg.value.content.headers, httpMethod: method, endpointTemplate: ENUM.EndPoints.FspEndpointTemplates.FX_TRANSFERS_PUT_ERROR }), true))
      test.ok(Callback.sendRequest.calledWith(match({ url: toUrl, headers: toHeaders, source: msg.value.from, destination: msg.value.to, method, payload: JSON.stringify(message), hubNameRegex })))
      test.ok(Callback.sendRequest.calledWith(match({ url: fromUrl, headers: fromHeaders, source: Config.HUB_NAME, destination: msg.value.from, method, payload: JSON.stringify(message), hubNameRegex })))
      test.equal(result, expected)
      test.end()
    })

    await processMessageTest.test('process the fulfil-duplicate message received from kafka and send out a transfer put callback', async test => {
      const uuid = Uuid()
      const payerFsp = 'dfsp1'
      const payeeFsp = 'dfsp2'

      const msg = {
        value: {
          metadata: {
            event: {
              type: 'prepare',
              action: 'fulfil-duplicate',
              state: {
                status: 'success',
                code: 0
              }
            }
          },
          content: {
            headers: {
              'fspiop-destination': payerFsp,
              'fspiop-source': payeeFsp
            },
            payload: { transferId: uuid }
          },
          to: payerFsp,
          from: payeeFsp,
          id: 'b51ec534-ee48-4575-b6a9-ead2955b8098'
        }
      }
      const toUrl = await Participant.getEndpoint({ fsp: msg.value.to, endpointType: ENUM.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_TRANSFER_PUT, id: msg.value.content.payload.transferId })
      const method = ENUM.Http.RestMethods.PUT
      const headers = createCallbackHeaders({ dfspId: msg.value.to, transferId: msg.value.content.payload.transferId, headers: msg.value.content.headers, httpMethod: method, endpointTemplate: ENUM.EndPoints.FspEndpointTemplates.TRANSFERS_PUT }, true)
      const message = { transferId: uuid }

      const expected = true

      Callback.sendRequest.withArgs(match({ url: toUrl, headers, source: msg.value.from, destination: msg.value.to, method, payload: JSON.stringify(message), hubNameRegex })).returns(Promise.resolve(200))

      const result = await Notification.processMessage(msg)
      test.ok(Callback.sendRequest.calledWith(match({ url: toUrl, headers, source: msg.value.from, destination: msg.value.to, method, payload: JSON.stringify(message), hubNameRegex })))
      test.equal(result, expected)
      test.end()
    })

    await processMessageTest.test('process the fx-fulfil-duplicate message received from kafka and send out a transfer put callback', async test => {
      const uuid = Uuid()
      const payerFsp = 'dfsp1'
      const fxp = 'fxp1'

      const msg = {
        value: {
          metadata: {
            event: {
              type: 'prepare',
              action: 'fx-fulfil-duplicate',
              state: {
                status: 'success',
                code: 0
              }
            }
          },
          content: {
            headers: {
              'fspiop-destination': payerFsp,
              'fspiop-source': fxp
            },
            payload: { commitRequestId: uuid }
          },
          to: payerFsp,
          from: fxp,
          id: 'b51ec534-ee48-4575-b6a9-ead2955b8098'
        }
      }
      const toUrl = await Participant.getEndpoint({ fsp: msg.value.to, endpointType: ENUM.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_FX_TRANSFER_PUT, id: msg.value.content.payload.commitRequestId })
      const method = ENUM.Http.RestMethods.PUT
      const headers = createCallbackHeaders({ dfspId: msg.value.to, transferId: msg.value.content.payload.commitRequestId, headers: msg.value.content.headers, httpMethod: method, endpointTemplate: ENUM.EndPoints.FspEndpointTemplates.FX_TRANSFERS_PUT }, true)
      const message = { commitRequestId: uuid }
      const expected = true
      Callback.sendRequest.withArgs(match({ url: toUrl, headers, source: msg.value.from, destination: msg.value.to, method, payload: JSON.stringify(message), hubNameRegex })).returns(Promise.resolve(200))
      Participant.getEndpoint.resetHistory()
      createCallbackHeadersSpy.resetHistory()

      const result = await Notification.processMessage(msg)

      test.ok(Participant.getEndpoint.getCall(0).calledWith(match({ fsp: msg.value.to, endpointType: ENUM.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_FX_TRANSFER_PUT, id: msg.value.content.payload.commitRequestId, isFx: true, span: undefined })))
      test.ok(createCallbackHeadersSpy.getCall(0).calledWith(match({ dfspId: msg.value.to, transferId: msg.value.content.payload.commitRequestId, headers: msg.value.content.headers, httpMethod: method, endpointTemplate: ENUM.EndPoints.FspEndpointTemplates.FX_TRANSFERS_PUT })))
      test.ok(Callback.sendRequest.calledWith(match({ url: toUrl, headers, source: msg.value.from, destination: msg.value.to, method, payload: JSON.stringify(message), hubNameRegex })))
      test.equal(result, expected)
      test.end()
    })

    await processMessageTest.test('process the fulfil-duplicate message received from kafka and send out a transfer error callback', async test => {
      const uuid = Uuid()
      const payerFsp = 'dfsp1'
      const payeeFsp = 'dfsp2'

      const msg = {
        value: {
          metadata: {
            event: {
              type: 'prepare',
              action: 'fulfil-duplicate',
              state: {
                status: 'error',
                code: 1
              }
            }
          },
          content: {
            headers: {
              'FSPIOP-Destination': payerFsp,
              'FSPIOP-Source': payeeFsp
            },
            payload: { transferId: uuid }
          },
          to: payerFsp,
          from: payeeFsp,
          id: 'b51ec534-ee48-4575-b6a9-ead2955b8098'
        }
      }
      const method = ENUM.Http.RestMethods.PUT
      const toUrl = await Participant.getEndpoint({ fsp: msg.value.to, endpointType: ENUM.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_TRANSFER_ERROR, id: msg.value.content.payload.transferId })
      const toHeaders = createCallbackHeaders({ dfspId: msg.value.to, transferId: msg.value.content.payload.transferId, headers: msg.value.content.headers, httpMethod: method, endpointTemplate: ENUM.EndPoints.FspEndpointTemplates.TRANSFERS_PUT_ERROR }, true)
      const message = { transferId: uuid }

      const expected = true

      Callback.sendRequest.withArgs(match({ url: toUrl, headers: toHeaders, source: msg.value.from, destination: msg.value.to, method, payload: JSON.stringify(message), hubNameRegex })).returns(Promise.resolve(200))

      const result = await Notification.processMessage(msg)
      test.ok(Callback.sendRequest.calledWith(match({ url: toUrl, headers: toHeaders, source: msg.value.from, destination: msg.value.to, method, payload: JSON.stringify(message), hubNameRegex })))
      test.equal(result, expected)
      test.end()
    })

    await processMessageTest.test('process the fx-fulfil-duplicate message received from kafka and send out a transfer error callback', async test => {
      const uuid = Uuid()
      const payerFsp = 'dfsp1'
      const fxp = 'fxp1'

      const msg = {
        value: {
          metadata: {
            event: {
              type: 'prepare',
              action: 'fx-fulfil-duplicate',
              state: {
                status: 'error',
                code: 1
              }
            }
          },
          content: {
            headers: {
              'FSPIOP-Destination': payerFsp,
              'FSPIOP-Source': fxp
            },
            payload: {
              errorInformation: {
                errorCode: '3100',
                errorDescription: 'Generic validation error'
              }
            },
            uriParams: { id: uuid }
          },
          to: payerFsp,
          from: fxp,
          id: 'b51ec534-ee48-4575-b6a9-ead2955b8098'
        }
      }
      const method = ENUM.Http.RestMethods.PUT
      const toUrl = await Participant.getEndpoint({ fsp: msg.value.to, endpointType: ENUM.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_FX_TRANSFER_ERROR, id: msg.value.content.uriParams.id })
      const toHeaders = createCallbackHeaders({ dfspId: msg.value.to, transferId: msg.value.content.uriParams.id, headers: msg.value.content.headers, httpMethod: method, endpointTemplate: ENUM.EndPoints.FspEndpointTemplates.FX_TRANSFERS_PUT_ERROR }, true)
      const message = { errorInformation: msg.value.content.payload.errorInformation }
      const expected = true
      Callback.sendRequest.withArgs(match({ url: toUrl, headers: toHeaders, source: msg.value.from, destination: msg.value.to, method, payload: JSON.stringify(message), hubNameRegex })).returns(Promise.resolve(200))
      Participant.getEndpoint.resetHistory()
      createCallbackHeadersSpy.resetHistory()

      const result = await Notification.processMessage(msg)

      test.ok(Participant.getEndpoint.getCall(0).calledWith(match({ fsp: msg.value.to, endpointType: ENUM.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_FX_TRANSFER_ERROR, id: msg.value.content.uriParams.id, isFx: true, span: undefined })))
      test.ok(createCallbackHeadersSpy.getCall(0).calledWith(match({ dfspId: msg.value.to, transferId: msg.value.content.uriParams.id, headers: msg.value.content.headers, httpMethod: method, endpointTemplate: ENUM.EndPoints.FspEndpointTemplates.FX_TRANSFERS_PUT_ERROR })))
      test.ok(Callback.sendRequest.calledWith(match({ url: toUrl, headers: toHeaders, source: msg.value.from, destination: msg.value.to, method, payload: JSON.stringify(message), hubNameRegex })))
      test.equal(result, expected)
      test.end()
    })

    await processMessageTest.test('process the abort-duplicate message received from kafka and send out a transfer put callback', async test => {
      const uuid = Uuid()
      const payerFsp = 'dfsp1'
      const payeeFsp = 'dfsp2'

      const msg = {
        value: {
          metadata: {
            event: {
              type: 'prepare',
              action: 'abort-duplicate',
              state: {
                status: 'success',
                code: 0
              }
            }
          },
          content: {
            headers: {
              'FSPIOP-Destination': payeeFsp,
              'FSPIOP-Source': payerFsp
            },
            payload: { transferId: uuid }
          },
          to: payeeFsp,
          from: payerFsp,
          id: 'b51ec534-ee48-4575-b6a9-ead2955b8098'
        }
      }
      const method = ENUM.Http.RestMethods.PUT
      const toUrl = await Participant.getEndpoint({ fsp: msg.value.to, endpointType: ENUM.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_TRANSFER_PUT, id: msg.value.content.payload.transferId })
      const toHeaders = createCallbackHeaders({ dfspId: msg.value.to, transferId: msg.value.content.payload.transferId, headers: msg.value.content.headers, httpMethod: method, endpointTemplate: ENUM.EndPoints.FspEndpointTemplates.TRANSFERS_PUT })
      const message = { transferId: uuid }

      const expected = true

      Callback.sendRequest.withArgs(match({ url: toUrl, headers: toHeaders, source: msg.value.from, destination: msg.value.to, method, payload: JSON.stringify(message), hubNameRegex })).returns(Promise.resolve(200))

      const result = await Notification.processMessage(msg)
      test.ok(Callback.sendRequest.calledWith(match({ url: toUrl, headers: toHeaders, source: msg.value.from, destination: msg.value.to, method, payload: JSON.stringify(message), hubNameRegex })))
      test.equal(result, expected)
      test.end()
    })

    await processMessageTest.test('process the fx-abort-duplicate message received from kafka and send out a transfer put callback', async test => {
      const uuid = Uuid()
      const payerFsp = 'dfsp1'
      const fxp = 'fxp1'

      const msg = {
        value: {
          metadata: {
            event: {
              type: 'prepare',
              action: 'fx-abort-duplicate',
              state: {
                status: 'success',
                code: 0
              }
            }
          },
          content: {
            headers: {
              'FSPIOP-Destination': fxp,
              'FSPIOP-Source': payerFsp
            },
            payload: { commitRequestId: uuid }
          },
          to: fxp,
          from: payerFsp,
          id: 'b51ec534-ee48-4575-b6a9-ead2955b8098'
        }
      }
      const method = ENUM.Http.RestMethods.PUT
      const toUrl = await Participant.getEndpoint({ fsp: msg.value.to, endpointType: ENUM.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_FX_TRANSFER_PUT, id: msg.value.content.payload.commitRequestId })
      const toHeaders = createCallbackHeaders({ dfspId: msg.value.to, transferId: msg.value.content.payload.commitRequestId, headers: msg.value.content.headers, httpMethod: method, endpointTemplate: ENUM.EndPoints.FspEndpointTemplates.FX_TRANSFERS_PUT })
      const message = { commitRequestId: uuid }
      const expected = true
      Callback.sendRequest.withArgs(match({ url: toUrl, headers: toHeaders, source: msg.value.from, destination: msg.value.to, method, payload: JSON.stringify(message), hubNameRegex })).returns(Promise.resolve(200))
      Participant.getEndpoint.resetHistory()
      createCallbackHeadersSpy.resetHistory()

      const result = await Notification.processMessage(msg)

      test.ok(Participant.getEndpoint.getCall(0).calledWith(match({ fsp: msg.value.to, endpointType: ENUM.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_FX_TRANSFER_PUT, id: msg.value.content.payload.commitRequestId, isFx: true, span: undefined })))
      test.ok(createCallbackHeadersSpy.getCall(0).calledWith(match({ dfspId: msg.value.to, transferId: msg.value.content.payload.commitRequestId, headers: msg.value.content.headers, httpMethod: method, endpointTemplate: ENUM.EndPoints.FspEndpointTemplates.FX_TRANSFERS_PUT })))
      test.ok(Callback.sendRequest.calledWith(match({ url: toUrl, headers: toHeaders, source: msg.value.from, destination: msg.value.to, method, payload: JSON.stringify(message), hubNameRegex })))
      test.equal(result, expected)
      test.end()
    })

    await processMessageTest.test('process the abort-duplicate message received from kafka and send out a transfer error callback', async test => {
      const uuid = Uuid()
      const payerFsp = 'dfsp1'
      const payeeFsp = 'dfsp2'

      const msg = {
        value: {
          metadata: {
            event: {
              type: 'prepare',
              action: 'abort-duplicate',
              state: {
                status: 'error',
                code: 1
              }
            }
          },
          content: {
            headers: {
              'FSPIOP-Destination': payerFsp,
              'FSPIOP-Source': payeeFsp
            },
            payload: { transferId: uuid }
          },
          to: payerFsp,
          from: payeeFsp,
          id: 'b51ec534-ee48-4575-b6a9-ead2955b8098'
        }
      }
      const method = ENUM.Http.RestMethods.PUT
      const toUrl = await Participant.getEndpoint({ fsp: msg.value.to, endpointType: ENUM.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_TRANSFER_ERROR, id: msg.value.content.payload.transferId })
      const toHeaders = createCallbackHeaders({ dfspId: msg.value.to, transferId: msg.value.content.payload.transferId, headers: msg.value.content.headers, httpMethod: method, endpointTemplate: ENUM.EndPoints.FspEndpointTemplates.TRANSFERS_PUT_ERROR }, true)
      const message = { transferId: uuid }

      const expected = true

      Callback.sendRequest.withArgs(match({ url: toUrl, headers: toHeaders, source: msg.value.from, destination: msg.value.to, method, payload: JSON.stringify(message), hubNameRegex })).returns(Promise.resolve(200))

      const result = await Notification.processMessage(msg)
      test.ok(Callback.sendRequest.calledWith(match({ url: toUrl, headers: toHeaders, source: msg.value.from, destination: msg.value.to, method, payload: JSON.stringify(message), hubNameRegex })))
      test.equal(result, expected)
      test.end()
    })

    await processMessageTest.test('process the fx-abort-duplicate message received from kafka and send out a transfer error callback', async test => {
      const uuid = Uuid()
      const payerFsp = 'dfsp1'
      const fxp = 'fxp1'

      const msg = {
        value: {
          metadata: {
            event: {
              type: 'prepare',
              action: 'fx-abort-duplicate',
              state: {
                status: 'error',
                code: 1
              }
            }
          },
          content: {
            headers: {
              'FSPIOP-Destination': payerFsp,
              'FSPIOP-Source': fxp
            },
            payload: {
              errorInformation: {
                errorCode: '3100',
                errorDescription: 'Generic validation error'
              }
            },
            uriParams: { id: uuid }
          },
          to: payerFsp,
          from: fxp,
          id: 'b51ec534-ee48-4575-b6a9-ead2955b8098'
        }
      }
      const method = ENUM.Http.RestMethods.PUT
      const toUrl = await Participant.getEndpoint({ fsp: msg.value.to, endpointType: ENUM.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_FX_TRANSFER_ERROR, id: msg.value.content.uriParams.id })
      const toHeaders = createCallbackHeaders({ dfspId: msg.value.to, transferId: msg.value.content.uriParams.id, headers: msg.value.content.headers, httpMethod: method, endpointTemplate: ENUM.EndPoints.FspEndpointTemplates.FX_TRANSFERS_PUT_ERROR }, true)
      const message = { errorInformation: msg.value.content.payload.errorInformation }
      const expected = true
      Callback.sendRequest.withArgs(match({ url: toUrl, headers: toHeaders, source: msg.value.from, destination: msg.value.to, method, payload: JSON.stringify(message), hubNameRegex })).returns(Promise.resolve(200))
      Participant.getEndpoint.resetHistory()
      createCallbackHeadersSpy.resetHistory()

      const result = await Notification.processMessage(msg)

      test.ok(Participant.getEndpoint.getCall(0).calledWith(match({ fsp: msg.value.to, endpointType: ENUM.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_FX_TRANSFER_ERROR, id: msg.value.content.uriParams.id, isFx: true, span: undefined })))
      test.ok(createCallbackHeadersSpy.getCall(0).calledWith(match({ dfspId: msg.value.to, transferId: msg.value.content.uriParams.id, headers: msg.value.content.headers, httpMethod: method, endpointTemplate: ENUM.EndPoints.FspEndpointTemplates.FX_TRANSFERS_PUT_ERROR })))
      test.ok(Callback.sendRequest.calledWith(match({ url: toUrl, headers: toHeaders, source: msg.value.from, destination: msg.value.to, method, payload: JSON.stringify(message), hubNameRegex })))
      test.equal(result, expected)
      test.end()
    })

    await processMessageTest.test('process the timeout-received message received from kafka and send out a transfer put callback', async test => {
      const uuid = Uuid()
      const payerFsp = 'dfsp2'
      const payeeFsp = 'dfsp1'

      const msg = {
        value: {
          metadata: {
            event: {
              type: 'prepare',
              action: 'timeout-received',
              state: {
                status: 'success',
                code: 0
              }
            }
          },
          content: {
            headers: {
              'fspiop-destination': payeeFsp,
              'fspiop-source': payerFsp
            },
            payload: { transferId: uuid }
          },
          to: payeeFsp,
          from: payerFsp,
          id: 'b51ec534-ee48-4575-b6a9-ead2955b8098'
        }
      }
      const method = ENUM.Http.RestMethods.PUT
      const toUrl = await Participant.getEndpoint({ fsp: msg.value.to, endpointType: ENUM.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_TRANSFER_ERROR, id: msg.value.content.payload.transferId })
      const toHeaders = createCallbackHeaders({ dfspId: msg.value.to, transferId: msg.value.content.payload.transferId, headers: msg.value.content.headers, httpMethod: method, endpointTemplate: ENUM.EndPoints.FspEndpointTemplates.TRANSFERS_PUT_ERROR }, true)
      const message = { transferId: uuid }

      const expected = true

      Callback.sendRequest.withArgs(match({ url: toUrl, headers: toHeaders, source: msg.value.from, destination: msg.value.to, method, payload: JSON.stringify(message), hubNameRegex })).returns(Promise.resolve(200))

      const result = await Notification.processMessage(msg)
      test.ok(Callback.sendRequest.calledWith(match({ url: toUrl, headers: toHeaders, source: Config.HUB_NAME, destination: msg.value.to, method, payload: JSON.stringify(message), hubNameRegex })))
      test.equal(result, expected)
      test.end()
    })

    await processMessageTest.test('process the fx-timeout-received message received from kafka and send out a transfer put callback', async test => {
      const uuid = Uuid()
      const payerFsp = 'dfsp1'
      const fxp = 'fxp1'

      const msg = {
        value: {
          metadata: {
            event: {
              type: 'prepare',
              action: 'fx-timeout-received',
              state: {
                status: 'success',
                code: 0
              }
            }
          },
          content: {
            headers: {
              'fspiop-destination': fxp,
              'fspiop-source': payerFsp
            },
            payload: { commitRequestId: uuid }
          },
          to: fxp,
          from: payerFsp,
          id: 'b51ec534-ee48-4575-b6a9-ead2955b8098'
        }
      }
      const method = ENUM.Http.RestMethods.PUT
      const toUrl = await Participant.getEndpoint({ fsp: msg.value.to, endpointType: ENUM.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_FX_TRANSFER_ERROR, id: msg.value.content.payload.commitRequestId })
      const toHeaders = createCallbackHeaders({ dfspId: msg.value.to, transferId: msg.value.content.payload.commitRequestId, headers: msg.value.content.headers, httpMethod: method, endpointTemplate: ENUM.EndPoints.FspEndpointTemplates.FX_TRANSFERS_PUT_ERROR }, true)
      const message = { commitRequestId: uuid }
      const expected = true
      Callback.sendRequest.withArgs(match({ url: toUrl, headers: toHeaders, source: msg.value.from, destination: msg.value.to, method, payload: JSON.stringify(message), hubNameRegex })).returns(Promise.resolve(200))
      Participant.getEndpoint.resetHistory()
      createCallbackHeadersSpy.resetHistory()

      const result = await Notification.processMessage(msg)

      test.ok(Participant.getEndpoint.getCall(0).calledWith(match({ fsp: msg.value.to, endpointType: ENUM.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_FX_TRANSFER_ERROR, id: msg.value.content.payload.commitRequestId, isFx: true, span: undefined })))
      test.ok(createCallbackHeadersSpy.getCall(0).calledWith(match({ dfspId: msg.value.to, transferId: msg.value.content.payload.commitRequestId, headers: msg.value.content.headers, httpMethod: method, endpointTemplate: ENUM.EndPoints.FspEndpointTemplates.FX_TRANSFERS_PUT_ERROR })))
      test.ok(Callback.sendRequest.calledWith(match({ url: toUrl, headers: toHeaders, source: Config.HUB_NAME, destination: msg.value.to, method, payload: JSON.stringify(message), hubNameRegex })))
      test.equal(result, expected)
      test.end()
    })

    await processMessageTest.test('process the timeout-reserved message received from kafka and send out a transfer error put callback', async test => {
      const uuid = Uuid()
      const payerFsp = 'dfsp2'
      const payeeFsp = 'dfsp1'

      const msg = {
        value: {
          metadata: {
            event: {
              type: 'prepare',
              action: 'timeout-reserved',
              state: {
                status: 'success',
                code: 0
              }
            }
          },
          content: {
            headers: {
              'fspiop-destination': payeeFsp,
              'fspiop-source': payerFsp
            },
            payload: { transferId: uuid }
          },
          to: payeeFsp,
          from: payerFsp,
          id: 'b51ec534-ee48-4575-b6a9-ead2955b8098'
        }
      }
      const method = ENUM.Http.RestMethods.PUT
      const toUrl = await Participant.getEndpoint({ fsp: msg.value.to, endpointType: ENUM.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_TRANSFER_ERROR, id: msg.value.content.payload.transferId })
      const fromUrl = await Participant.getEndpoint({ fsp: msg.value.from, endpointType: ENUM.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_TRANSFER_ERROR, id: msg.value.content.payload.transferId })
      const toHeaders = createCallbackHeaders({ dfspId: msg.value.to, transferId: msg.value.content.payload.transferId, headers: msg.value.content.headers, httpMethod: method, endpointTemplate: ENUM.EndPoints.FspEndpointTemplates.TRANSFERS_PUT_ERROR }, true)
      const fromHeaders = createCallbackHeaders({ dfspId: msg.value.from, transferId: msg.value.content.payload.transferId, headers: msg.value.content.headers, httpMethod: method, endpointTemplate: ENUM.EndPoints.FspEndpointTemplates.TRANSFERS_PUT_ERROR }, true)
      const message = { transferId: uuid }

      const expected = true

      Callback.sendRequest.withArgs(match({ url: toUrl, headers: toHeaders, source: msg.value.from, destination: msg.value.to, method, payload: JSON.stringify(message), hubNameRegex })).returns(Promise.resolve(200))
      Callback.sendRequest.withArgs(match({ url: fromUrl, headers: fromHeaders, source: Config.HUB_NAME, destination: msg.value.from, method, payload: JSON.stringify(message), hubNameRegex })).returns(Promise.resolve(200))

      const result = await Notification.processMessage(msg)
      test.ok(Callback.sendRequest.calledWith(match({ url: toUrl, headers: toHeaders, source: Config.HUB_NAME, destination: msg.value.to, method, payload: JSON.stringify(message), responseType: ENUM.Http.ResponseTypes.JSON, hubNameRegex })))
      test.ok(Callback.sendRequest.calledWith(match({ url: fromUrl, headers: fromHeaders, source: Config.HUB_NAME, destination: msg.value.from, method, payload: JSON.stringify(message), hubNameRegex })))
      test.equal(result, expected)
      test.end()
    })

    await processMessageTest.test('process the fx-timeout-reserved message received from kafka and send out a transfer error put callback', async test => {
      const uuid = Uuid()
      const payerFsp = 'dfsp1'
      const fxp = 'fxp1'

      const msg = {
        value: {
          metadata: {
            event: {
              type: 'prepare',
              action: 'fx-timeout-reserved',
              state: {
                status: 'success',
                code: 0
              }
            }
          },
          content: {
            headers: {
              'fspiop-destination': fxp,
              'fspiop-source': payerFsp
            },
            payload: {
              errorInformation: {
                errorCode: '3100',
                errorDescription: 'Generic validation error'
              }
            },
            uriParams: { id: uuid }
          },
          to: fxp,
          from: payerFsp,
          id: 'b51ec534-ee48-4575-b6a9-ead2955b8098'
        }
      }
      const method = ENUM.Http.RestMethods.PUT
      const toUrl = await Participant.getEndpoint({ fsp: msg.value.to, endpointType: ENUM.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_FX_TRANSFER_ERROR, id: msg.value.content.uriParams.id })
      const fromUrl = await Participant.getEndpoint({ fsp: msg.value.from, endpointType: ENUM.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_FX_TRANSFER_ERROR, id: msg.value.content.uriParams.id })
      const toHeaders = createCallbackHeaders({ dfspId: msg.value.to, transferId: msg.value.content.uriParams.id, headers: msg.value.content.headers, httpMethod: method, endpointTemplate: ENUM.EndPoints.FspEndpointTemplates.FX_TRANSFERS_PUT_ERROR }, true)
      const fromHeaders = createCallbackHeaders({ dfspId: msg.value.from, transferId: msg.value.content.uriParams.id, headers: msg.value.content.headers, httpMethod: method, endpointTemplate: ENUM.EndPoints.FspEndpointTemplates.FX_TRANSFERS_PUT_ERROR }, true)
      const message = { errorInformation: msg.value.content.payload.errorInformation }
      const expected = true
      Callback.sendRequest.withArgs(match({ url: toUrl, headers: toHeaders, source: msg.value.from, destination: msg.value.to, method, payload: JSON.stringify(message), hubNameRegex })).returns(Promise.resolve(200))
      Callback.sendRequest.withArgs(match({ url: fromUrl, headers: fromHeaders, source: Config.HUB_NAME, destination: msg.value.from, method, payload: JSON.stringify(message), hubNameRegex })).returns(Promise.resolve(200))
      Participant.getEndpoint.resetHistory()
      createCallbackHeadersSpy.resetHistory()

      const result = await Notification.processMessage(msg)

      test.ok(Participant.getEndpoint.getCall(0).calledWith(match({ fsp: msg.value.to, endpointType: ENUM.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_FX_TRANSFER_ERROR, id: msg.value.content.uriParams.id, isFx: true, span: undefined })))
      test.ok(Participant.getEndpoint.getCall(1).calledWith(match({ fsp: msg.value.from, endpointType: ENUM.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_FX_TRANSFER_ERROR, id: msg.value.content.uriParams.id, isFx: true, span: undefined })))
      test.ok(createCallbackHeadersSpy.getCall(0).calledWith(match({ dfspId: msg.value.to, transferId: msg.value.content.uriParams.id, headers: msg.value.content.headers, httpMethod: method, endpointTemplate: ENUM.EndPoints.FspEndpointTemplates.FX_TRANSFERS_PUT_ERROR })))
      test.ok(createCallbackHeadersSpy.getCall(1).calledWith(match({ dfspId: msg.value.from, transferId: msg.value.content.uriParams.id, headers: msg.value.content.headers, httpMethod: method, endpointTemplate: ENUM.EndPoints.FspEndpointTemplates.FX_TRANSFERS_PUT_ERROR })))
      test.ok(Callback.sendRequest.calledWith(match({ url: toUrl, headers: toHeaders, source: Config.HUB_NAME, destination: msg.value.to, method, payload: JSON.stringify(message), responseType: ENUM.Http.ResponseTypes.JSON, hubNameRegex })))
      test.ok(Callback.sendRequest.calledWith(match({ url: fromUrl, headers: fromHeaders, source: Config.HUB_NAME, destination: msg.value.from, method, payload: JSON.stringify(message), responseType: ENUM.Http.ResponseTypes.JSON, hubNameRegex })))
      test.equal(result, expected)
      test.end()
    })

    await processMessageTest.test('process the `forwarded` error message received from kafka and send out a transfer error put callback', async test => {
      const payerFsp = 'dfsp1'
      const proxyFsp = 'proxyFsp'

      const msg = {
        value: {
          metadata: {
            event: {
              id: Uuid(),
              createdAt: new Date(),
              type: 'notification',
              action: 'forwarded',
              state: {
                status: 'error',
                code: 1
              }
            }
          },
          content: {
            headers: {
              'fspiop-destination': proxyFsp,
              'fspiop-source': payerFsp
            },
            payload: {
              errorInformation: {
                errorCode: '3000',
                errorDescription: 'Generic error'
              }
            }
          },
          to: proxyFsp,
          from: payerFsp,
          id: 'b51ec534-ee48-4575-b6a9-ead2955b8098'
        }
      }
      const method = ENUM.Http.RestMethods.PUT
      const toUrl = await Participant.getEndpoint({ fsp: msg.value.to, endpointType: ENUM.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_TRANSFER_ERROR, id: msg.value.content.payload.transferId })
      const fromUrl = await Participant.getEndpoint({ fsp: msg.value.from, endpointType: ENUM.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_TRANSFER_ERROR, id: msg.value.content.payload.transferId })
      const toHeaders = createCallbackHeaders({ dfspId: msg.value.to, transferId: msg.value.content.payload.transferId, headers: msg.value.content.headers, httpMethod: method, endpointTemplate: ENUM.EndPoints.FspEndpointTemplates.TRANSFERS_PUT_ERROR }, true)
      const fromHeaders = createCallbackHeaders({ dfspId: msg.value.from, transferId: msg.value.content.payload.transferId, headers: msg.value.content.headers, httpMethod: method, endpointTemplate: ENUM.EndPoints.FspEndpointTemplates.TRANSFERS_PUT_ERROR }, true)

      const expected = true

      Callback.sendRequest.withArgs(match({ url: toUrl, headers: toHeaders, source: msg.value.from, destination: msg.value.to, method, payload: JSON.stringify(msg.value.content.payload), hubNameRegex })).returns(Promise.resolve(200))
      Callback.sendRequest.withArgs(match({ url: fromUrl, headers: fromHeaders, source: Config.HUB_NAME, destination: msg.value.from, method, payload: JSON.stringify(msg.value.content.payload), hubNameRegex })).returns(Promise.resolve(200))

      const result = await Notification.processMessage(msg)
      test.ok(Callback.sendRequest.calledWith(match({ url: toUrl, headers: toHeaders, source: Config.HUB_NAME, destination: msg.value.to, method, payload: JSON.stringify(msg.value.content.payload), responseType: ENUM.Http.ResponseTypes.JSON, hubNameRegex })))
      test.ok(Callback.sendRequest.calledWith(match({ url: fromUrl, headers: fromHeaders, source: Config.HUB_NAME, destination: msg.value.from, method, payload: JSON.stringify(msg.value.content.payload), hubNameRegex })))
      test.equal(result, expected)
      test.end()
    })

    await processMessageTest.test('process the `fx-forwarded` error message received from kafka and send out a transfer error put callback', async test => {
      const payerFsp = 'dfsp1'
      const proxyFsp = 'proxyFsp'

      const msg = {
        value: {
          metadata: {
            event: {
              id: Uuid(),
              createdAt: new Date(),
              type: 'notification',
              action: 'fx-forwarded',
              state: {
                status: 'error',
                code: 1
              }
            }
          },
          content: {
            headers: {
              'fspiop-destination': proxyFsp,
              'fspiop-source': payerFsp
            },
            payload: {
              errorInformation: {
                errorCode: '3000',
                errorDescription: 'Generic error'
              }
            }
          },
          to: proxyFsp,
          from: payerFsp,
          id: 'b51ec534-ee48-4575-b6a9-ead2955b8098'
        }
      }
      const method = ENUM.Http.RestMethods.PUT
      const toUrl = await Participant.getEndpoint({ fsp: msg.value.to, endpointType: ENUM.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_FX_TRANSFER_ERROR, id: msg.value.content.payload.transferId })
      const fromUrl = await Participant.getEndpoint({ fsp: msg.value.from, endpointType: ENUM.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_FX_TRANSFER_ERROR, id: msg.value.content.payload.transferId })
      const toHeaders = createCallbackHeaders({ dfspId: msg.value.to, transferId: msg.value.content.payload.transferId, headers: msg.value.content.headers, httpMethod: method, endpointTemplate: ENUM.EndPoints.FspEndpointTemplates.FX_TRANSFERS_PUT_ERROR }, true)
      const fromHeaders = createCallbackHeaders({ dfspId: msg.value.from, transferId: msg.value.content.payload.transferId, headers: msg.value.content.headers, httpMethod: method, endpointTemplate: ENUM.EndPoints.FspEndpointTemplates.FX_TRANSFERS_PUT_ERROR }, true)

      const expected = true

      Callback.sendRequest.withArgs(match({ url: toUrl, headers: toHeaders, source: msg.value.from, destination: msg.value.to, method, payload: JSON.stringify(msg.value.content.payload), hubNameRegex })).returns(Promise.resolve(200))
      Callback.sendRequest.withArgs(match({ url: fromUrl, headers: fromHeaders, source: Config.HUB_NAME, destination: msg.value.from, method, payload: JSON.stringify(msg.value.content.payload), hubNameRegex })).returns(Promise.resolve(200))

      const result = await Notification.processMessage(msg)
      test.ok(Callback.sendRequest.calledWith(match({ url: toUrl, headers: toHeaders, source: Config.HUB_NAME, destination: msg.value.to, method, payload: JSON.stringify(msg.value.content.payload), responseType: ENUM.Http.ResponseTypes.JSON, hubNameRegex })))
      test.ok(Callback.sendRequest.calledWith(match({ url: fromUrl, headers: fromHeaders, source: Config.HUB_NAME, destination: msg.value.from, method, payload: JSON.stringify(msg.value.content.payload), hubNameRegex })))
      test.equal(result, expected)
      test.end()
    })

    await processMessageTest.test('process the prepare-duplicate message received from kafka and send out a transfer put callback', async test => {
      const uuid = Uuid()
      const payerFsp = 'dfsp2'
      const payeeFsp = 'dfsp1'

      const msg = {
        value: {
          metadata: {
            event: {
              type: 'prepare',
              action: 'prepare-duplicate',
              state: {
                status: 'success',
                code: 0
              }
            }
          },
          content: {
            headers: {
              'FSPIOP-Destination': payeeFsp,
              'FSPIOP-Source': payerFsp
            },
            payload: { transferId: uuid }
          },
          to: payeeFsp,
          from: payerFsp,
          id: 'b51ec534-ee48-4575-b6a9-ead2955b8098'
        }
      }
      const method = ENUM.Http.RestMethods.PUT
      const toUrl = await Participant.getEndpoint({ fsp: msg.value.to, endpointType: ENUM.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_TRANSFER_PUT, id: msg.value.content.payload.transferId })
      const toHeaders = createCallbackHeaders({ dfspId: msg.value.to, transferId: msg.value.content.payload.transferId, headers: msg.value.content.headers, httpMethod: method, endpointTemplate: ENUM.EndPoints.FspEndpointTemplates.TRANSFERS_PUT }, true)
      const message = { transferId: uuid }
      const expected = true
      Callback.sendRequest.withArgs(match({ url: toUrl, headers: toHeaders, source: msg.value.from, destination: msg.value.to, method, payload: JSON.stringify(message), hubNameRegex })).returns(Promise.resolve(200))
      createCallbackHeadersSpy.resetHistory()
      Participant.getEndpoint.resetHistory()

      const result = await Notification.processMessage(msg)

      test.ok(Participant.getEndpoint.calledWith(match({ fsp: msg.value.to, endpointType: ENUM.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_TRANSFER_PUT, id: msg.value.content.payload.transferId, isFx: false, span: undefined })))
      test.ok(createCallbackHeadersSpy.calledWith(match({ dfspId: msg.value.to, transferId: msg.value.content.payload.transferId, headers: msg.value.content.headers, httpMethod: method, endpointTemplate: ENUM.EndPoints.FspEndpointTemplates.TRANSFERS_PUT }), true))
      test.ok(Callback.sendRequest.calledWith(match({ url: toUrl, headers: toHeaders, source: msg.value.from, destination: msg.value.to, method, payload: JSON.stringify(message), hubNameRegex })))
      test.equal(result, expected)
      test.end()
    })

    await processMessageTest.test('process the fx-prepare-duplicate message received from kafka and send out a transfer put callback', async test => {
      const uuid = Uuid()
      const payerFsp = 'dfsp1'
      const fxp = 'fxp1'

      const msg = {
        value: {
          metadata: {
            event: {
              type: 'prepare',
              action: 'fx-prepare-duplicate',
              state: {
                status: 'success',
                code: 0
              }
            }
          },
          content: {
            headers: {
              'FSPIOP-Destination': fxp,
              'FSPIOP-Source': payerFsp
            },
            payload: { commitRequestId: uuid }
          },
          to: fxp,
          from: payerFsp,
          id: 'b51ec534-ee48-4575-b6a9-ead2955b8098'
        }
      }
      const method = ENUM.Http.RestMethods.PUT
      const toUrl = await Participant.getEndpoint({ fsp: msg.value.to, endpointType: ENUM.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_FX_TRANSFER_PUT, id: msg.value.content.payload.commitRequestId })
      const toHeaders = createCallbackHeaders({ dfspId: msg.value.to, transferId: msg.value.content.payload.commitRequestId, headers: msg.value.content.headers, httpMethod: method, endpointTemplate: ENUM.EndPoints.FspEndpointTemplates.FX_TRANSFERS_PUT }, true)
      const message = { commitRequestId: uuid }
      const expected = true
      Callback.sendRequest.withArgs(match({ url: toUrl, headers: toHeaders, source: msg.value.from, destination: msg.value.to, method, payload: JSON.stringify(message), hubNameRegex })).returns(Promise.resolve(200))
      createCallbackHeadersSpy.resetHistory()
      Participant.getEndpoint.resetHistory()

      const result = await Notification.processMessage(msg)

      test.ok(Participant.getEndpoint.calledWith(match({ fsp: msg.value.to, endpointType: ENUM.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_FX_TRANSFER_PUT, id: msg.value.content.payload.commitRequestId, isFx: true, span: undefined })))
      test.ok(createCallbackHeadersSpy.calledWith(match({ dfspId: msg.value.to, transferId: msg.value.content.payload.commitRequestId, headers: msg.value.content.headers, httpMethod: method, endpointTemplate: ENUM.EndPoints.FspEndpointTemplates.FX_TRANSFERS_PUT }), true))
      test.ok(Callback.sendRequest.calledWith(match({ url: toUrl, headers: toHeaders, source: msg.value.from, destination: msg.value.to, method, payload: JSON.stringify(message), hubNameRegex })))
      test.equal(result, expected)
      test.end()
    })

    await processMessageTest.test('process the prepare-duplicate message received from kafka and send out a transfer put callback - JWS sign', async test => {
      const ConfigStub = Util.clone(Config)
      ConfigStub.JWS_SIGN = true
      ConfigStub.JWS_SIGNING_KEY = 'some jws key'
      const JwsSignerStub = Sinon.stub()
      const NotificationProxy = Proxyquire(`${src}/handlers/notification`, {
        '../../lib/config': ConfigStub,
        '@mojaloop/sdk-standard-components': {
          Jws: {
            signer: JwsSignerStub.returns({
              getSignature: () => {
                return 'some signature'
              }
            })
          }
        }
      })
      const uuid = Uuid()
      const payerFsp = 'dfsp2'
      const payeeFsp = 'dfsp1'

      const msg = {
        value: {
          metadata: {
            event: {
              type: 'prepare',
              action: 'prepare-duplicate',
              state: {
                status: 'success',
                code: 0
              }
            }
          },
          content: {
            headers: {
              'FSPIOP-Destination': payeeFsp,
              'FSPIOP-Source': payerFsp
            },
            payload: { transferId: uuid }
          },
          to: payeeFsp,
          from: Config.HUB_NAME,
          id: 'b51ec534-ee48-4575-b6a9-ead2955b8098'
        }
      }
      const method = ENUM.Http.RestMethods.PUT
      const toUrl = await Participant.getEndpoint({ fsp: msg.value.to, endpointType: ENUM.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_TRANSFER_PUT, id: msg.value.content.payload.transferId })
      const toHeaders = createCallbackHeaders({ dfspId: msg.value.to, transferId: msg.value.content.payload.transferId, headers: msg.value.content.headers, httpMethod: method, endpointTemplate: ENUM.EndPoints.FspEndpointTemplates.TRANSFERS_PUT }, true)
      const message = { transferId: uuid }

      const expected = true

      const logger = Logger
      logger.log = logger.info

      const jwsSigner = new JwsSignerStub()

      Callback.sendRequest.withArgs(match({ url: toUrl, headers: toHeaders, source: msg.value.from, destination: msg.value.to, method, payload: JSON.stringify(message), responseType: ENUM.Http.ResponseTypes.JSON, span: undefined, jwsSigner, hubNameRegex })).returns(Promise.resolve(200))
      const result = await NotificationProxy.processMessage(msg)
      test.ok(Callback.sendRequest.calledWith(match({ url: toUrl, headers: toHeaders, source: msg.value.from, destination: msg.value.to, method, payload: JSON.stringify(message), responseType: ENUM.Http.ResponseTypes.JSON, span: undefined, jwsSigner, hubNameRegex })))
      test.deepEqual(Callback.sendRequest.args[0][0].jwsSigner, jwsSigner, 'JwsSigner is same')

      test.equal(result, expected)
      test.end()
    })

    await processMessageTest.test('process a prepare message received from kafka and send out a transfer error notification to the sender - JWS Sign', async test => {
      const ConfigStub = Util.clone(Config)
      ConfigStub.JWS_SIGN = true
      ConfigStub.JWS_SIGNING_KEY = 'some jws key'
      const JwsSignerStub = Sinon.stub()
      const NotificationProxy = Proxyquire(`${src}/handlers/notification`, {
        '../../lib/config': ConfigStub,
        '@mojaloop/sdk-standard-components': {
          Jws: {
            signer: JwsSignerStub.returns({
              getSignature: () => {
                return 'some signature'
              }
            })
          }
        }
      })

      const uuid = Uuid()
      const msg = {
        value: {
          metadata: {
            event: {
              type: 'prepare',
              action: 'prepare',
              state: {
                status: 'error',
                code: 0
              }
            }
          },
          content: {
            headers: { 'fspiop-source': 'dfsp1', 'fspiop-destination': 'dfsp2' },
            payload: { transferId: uuid }
          },
          to: 'dfsp2',
          from: Config.HUB_NAME,
          id: 'b51ec534-ee48-4575-b6a9-ead2955b8098'
        }
      }
      const method = ENUM.Http.RestMethods.PUT
      const url = await Participant.getEndpoint({ fsp: msg.value.to, endpointType: ENUM.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_TRANSFER_ERROR, id: msg.value.content.payload.transferId })
      const headers = createCallbackHeaders({ dfspId: msg.value.to, transferId: msg.value.content.payload.transferId, headers: msg.value.content.headers, httpMethod: method, endpointTemplate: ENUM.EndPoints.FspEndpointTemplates.TRANSFERS_PUT_ERROR }, true)
      const message = { transferId: uuid }

      const expected = true
      const logger = Logger
      logger.log = logger.info

      const jwsSigner = new JwsSignerStub()

      Callback.sendRequest.withArgs(match({ url, headers, source: msg.value.from, destination: msg.value.to, method, payload: JSON.stringify(message), responseType: ENUM.Http.ResponseTypes.JSON, hubNameRegex, jwsSigner })).returns(Promise.resolve(200))
      const result = await NotificationProxy.processMessage(msg)
      test.ok(Callback.sendRequest.calledWith(match({ url, headers, source: msg.value.from, destination: msg.value.to, method, payload: JSON.stringify(message), responseType: ENUM.Http.ResponseTypes.JSON, hubNameRegex, jwsSigner })))
      test.deepEqual(Callback.sendRequest.args[0][0].jwsSigner, jwsSigner, 'JwsSigner is same')
      test.equal(result, expected)
      test.end()
    })

    await processMessageTest.test('process a commit message received from kafka and send out a transfer post callback - JWS Sign', async test => {
      const ConfigStub = Util.clone(Config)
      ConfigStub.JWS_SIGN = true
      ConfigStub.JWS_SIGNING_KEY = 'some jws key'
      ConfigStub.SEND_TRANSFER_CONFIRMATION_TO_PAYEE = true
      const JwsSignerStub = Sinon.stub()
      const NotificationProxy = Proxyquire(`${src}/handlers/notification`, {
        '../../lib/config': ConfigStub,
        '@mojaloop/sdk-standard-components': {
          Jws: {
            signer: JwsSignerStub.returns({
              getSignature: () => {
                return 'some signature'
              }
            })
          }
        }
      })

      const payeeFsp = 'dfsp1'
      const payerFsp = 'dfsp2'
      const uuid = Uuid()
      const msg = {
        value: {
          metadata: {
            event: {
              type: 'notification',
              action: 'commit',
              state: {
                status: 'success',
                code: 0
              }
            }
          },
          content: {
            headers: {
              'FSPIOP-Destination': payeeFsp,
              'FSPIOP-Source': payerFsp
            },
            payload: { transferId: uuid }
          },
          to: payeeFsp,
          from: payerFsp,
          id: 'b51ec534-ee48-4575-b6a9-ead2955b8098'
        }
      }

      const urlPayee = await Participant.getEndpoint({ fsp: msg.value.to, endpointType: ENUM.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_TRANSFER_PUT, id: msg.value.content.payload.transferId })
      const urlPayer = await Participant.getEndpoint({ fsp: msg.value.from, endpointType: ENUM.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_TRANSFER_PUT, id: msg.value.content.payload.transferId })
      const method = ENUM.Http.RestMethods.PUT
      const payeeHeaders = createCallbackHeaders({ dfspId: msg.value.to, transferId: msg.value.content.payload.transferId, headers: msg.value.content.headers, httpMethod: method, endpointTemplate: ENUM.EndPoints.FspEndpointTemplates.TRANSFERS_PUT })
      const payerHeaders = createCallbackHeaders({ dfspId: msg.value.from, transferId: msg.value.content.payload.transferId, headers: msg.value.content.headers, httpMethod: method, endpointTemplate: ENUM.EndPoints.FspEndpointTemplates.TRANSFERS_PUT }, true)
      const message = { transferId: uuid }

      const expected = 200
      const logger = Logger
      logger.log = logger.info

      const jwsSigner = new JwsSignerStub()

      Callback.sendRequest.withArgs(match({ url: urlPayee, headers: payeeHeaders, source: msg.value.from, destination: msg.value.to, method, payload: JSON.stringify(message), hubNameRegex })).returns(Promise.resolve(200))
      Callback.sendRequest.withArgs(match({ url: urlPayer, headers: payerHeaders, source: Config.HUB_NAME, destination: msg.value.from, method, payload: JSON.stringify(message), responseType: ENUM.Http.ResponseTypes.JSON, hubNameRegex, jwsSigner })).returns(Promise.resolve(200))

      const result = await NotificationProxy.processMessage(msg)
      test.ok(Callback.sendRequest.calledWith(match({ url: urlPayee, headers: payeeHeaders, source: msg.value.from, destination: msg.value.to, method, payload: JSON.stringify(message), hubNameRegex })))
      test.ok(Callback.sendRequest.calledWith(match({ url: urlPayer, headers: payerHeaders, source: Config.HUB_NAME, destination: msg.value.from, method, payload: JSON.stringify(message), responseType: ENUM.Http.ResponseTypes.JSON, hubNameRegex, jwsSigner })))
      test.equal(result, expected)
      test.end()
    })

    await processMessageTest.test('process a reject message received from kafka and send out a transfer put callback - JWS Sign', async test => {
      const ConfigStub = Util.clone(Config)
      ConfigStub.JWS_SIGN = true
      ConfigStub.JWS_SIGNING_KEY = 'some jws key'
      const JwsSignerStub = Sinon.stub()
      const NotificationProxy = Proxyquire(`${src}/handlers/notification`, {
        '../../lib/config': ConfigStub,
        '@mojaloop/sdk-standard-components': {
          Jws: {
            signer: JwsSignerStub.returns({
              getSignature: () => {
                return 'some signature'
              }
            })
          }
        }
      })

      const uuid = Uuid()
      const payerFsp = 'dfsp2'
      const payeeFsp = 'dfsp1'
      const msg = {
        value: {
          metadata: {
            event: {
              type: 'prepare',
              action: 'reject',
              state: {
                status: 'success',
                code: 0
              }
            }
          },
          content: {
            headers: {
              'FSPIOP-Destination': payeeFsp,
              'FSPIOP-Source': payerFsp
            },
            payload: { transferId: uuid }
          },
          to: payeeFsp,
          from: payerFsp,
          id: 'b51ec534-ee48-4575-b6a9-ead2955b8098'
        }
      }

      const fromUrl = await Participant.getEndpoint({ fsp: msg.value.from, endpointType: ENUM.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_TRANSFER_PUT, id: msg.value.content.payload.transferId })
      const toUrl = await Participant.getEndpoint({ fsp: msg.value.to, endpointType: ENUM.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_TRANSFER_PUT, id: msg.value.content.payload.transferId })
      const method = ENUM.Http.RestMethods.PUT
      const toHeaders = createCallbackHeaders({ dfspId: msg.value.to, transferId: msg.value.content.payload.transferId, headers: msg.value.content.headers, httpMethod: method, endpointTemplate: ENUM.EndPoints.FspEndpointTemplates.TRANSFERS_PUT })
      const fromHeaders = createCallbackHeaders({ dfspId: msg.value.from, transferId: msg.value.content.payload.transferId, headers: msg.value.content.headers, httpMethod: method, endpointTemplate: ENUM.EndPoints.FspEndpointTemplates.TRANSFERS_PUT }, true)
      const message = { transferId: uuid }

      const expected = 200
      const logger = Logger
      logger.log = logger.info

      const jwsSigner = new JwsSignerStub()

      Callback.sendRequest.withArgs(match({ url: toUrl, headers: toHeaders, source: msg.value.from, destination: msg.value.to, method, payload: JSON.stringify(message), hubNameRegex })).returns(Promise.resolve(200))
      Callback.sendRequest.withArgs(match({ url: fromUrl, headers: fromHeaders, source: Config.HUB_NAME, destination: msg.value.from, method, payload: JSON.stringify(message), responseType: ENUM.Http.ResponseTypes.JSON, hubNameRegex, jwsSigner })).returns(Promise.resolve(200))

      const result = await NotificationProxy.processMessage(msg)
      test.ok(Callback.sendRequest.calledWith(match({ url: toUrl, headers: toHeaders, source: msg.value.from, destination: msg.value.to, method, payload: JSON.stringify(message), hubNameRegex })))
      test.ok(Callback.sendRequest.calledWith(match({ url: fromUrl, headers: fromHeaders, source: Config.HUB_NAME, destination: msg.value.from, method, payload: JSON.stringify(message), responseType: ENUM.Http.ResponseTypes.JSON, hubNameRegex, jwsSigner })))
      test.equal(result, expected)
      test.end()
    })

    await processMessageTest.test('process a abort message received from kafka and send out a transfer put callback', async test => {
      const ConfigStub = Util.clone(Config)
      ConfigStub.JWS_SIGN = true
      ConfigStub.JWS_SIGNING_KEY = 'some jws key'
      const JwsSignerStub = Sinon.stub()
      const NotificationProxy = Proxyquire(`${src}/handlers/notification`, {
        '../../lib/config': ConfigStub,
        '@mojaloop/sdk-standard-components': {
          Jws: {
            signer: JwsSignerStub.returns({
              getSignature: () => {
                return 'some signature'
              }
            })
          }
        }
      })

      const uuid = Uuid()
      const payerFsp = 'dfsp2'
      const payeeFsp = 'dfsp1'
      const msg = {
        value: {
          metadata: {
            event: {
              type: 'prepare',
              action: 'abort',
              state: {
                status: 'success',
                code: 0
              }
            }
          },
          content: {
            headers: {
              'FSPIOP-Destination': payeeFsp,
              'FSPIOP-Source': payerFsp
            },
            payload: { transferId: uuid }
          },
          to: payeeFsp,
          from: payerFsp,
          id: 'b51ec534-ee48-4575-b6a9-ead2955b8098'
        }
      }
      const fromUrl = await Participant.getEndpoint({ fsp: msg.value.from, endpointType: ENUM.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_TRANSFER_ERROR, id: msg.value.content.payload.transferId })
      const toUrl = await Participant.getEndpoint({ fsp: msg.value.to, endpointType: ENUM.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_TRANSFER_ERROR, id: msg.value.content.payload.transferId })
      const method = ENUM.Http.RestMethods.PUT
      const toHeaders = createCallbackHeaders({ dfspId: msg.value.to, transferId: msg.value.content.payload.transferId, headers: msg.value.content.headers, httpMethod: method, endpointTemplate: ENUM.EndPoints.FspEndpointTemplates.TRANSFERS_PUT_ERROR })
      const fromHeaders = createCallbackHeaders({ dfspId: msg.value.from, transferId: msg.value.content.payload.transferId, headers: msg.value.content.headers, httpMethod: method, endpointTemplate: ENUM.EndPoints.FspEndpointTemplates.TRANSFERS_PUT_ERROR }, true)
      const message = { transferId: uuid }

      const expected = 200
      const logger = Logger
      logger.log = logger.info

      const jwsSigner = new JwsSignerStub()

      Callback.sendRequest.withArgs(match({ url: fromUrl, headers: fromHeaders, source: Config.HUB_NAME, destination: msg.value.from, method, payload: JSON.stringify(message), responseType: ENUM.Http.ResponseTypes.JSON, hubNameRegex, jwsSigner })).returns(Promise.resolve(200))
      Callback.sendRequest.withArgs(match({ url: toUrl, headers: toHeaders, source: msg.value.from, destination: msg.value.to, method, payload: JSON.stringify(message), hubNameRegex })).returns(Promise.resolve(200))

      const result = await NotificationProxy.processMessage(msg)
      test.ok(Callback.sendRequest.calledWith(match({ url: toUrl, headers: toHeaders, source: msg.value.from, destination: msg.value.to, method, payload: JSON.stringify(message), hubNameRegex })))
      test.ok(Callback.sendRequest.calledWith(match({ url: fromUrl, headers: fromHeaders, source: Config.HUB_NAME, destination: msg.value.from, method, payload: JSON.stringify(message), responseType: ENUM.Http.ResponseTypes.JSON, hubNameRegex, jwsSigner })))
      test.equal(result, expected)
      test.end()
    })

    await processMessageTest.test('process a fulfil-duplicate message received from kafka and send out a transfer error callback - JWS Sign', async test => {
      const ConfigStub = Util.clone(Config)
      ConfigStub.JWS_SIGN = true
      ConfigStub.JWS_SIGNING_KEY = 'some jws key'
      const JwsSignerStub = Sinon.stub()
      const NotificationProxy = Proxyquire(`${src}/handlers/notification`, {
        '../../lib/config': ConfigStub,
        '@mojaloop/sdk-standard-components': {
          Jws: {
            signer: JwsSignerStub.returns({
              getSignature: () => {
                return 'some signature'
              }
            })
          }
        }
      })

      const uuid = Uuid()
      const payerFsp = 'dfsp1'
      const payeeFsp = 'dfsp2'

      const msg = {
        value: {
          metadata: {
            event: {
              type: 'prepare',
              action: 'fulfil-duplicate',
              state: {
                status: 'error',
                code: 1
              }
            }
          },
          content: {
            headers: {
              'FSPIOP-Destination': payerFsp,
              'FSPIOP-Source': payeeFsp
            },
            payload: { transferId: uuid }
          },
          to: payerFsp,
          from: Config.HUB_NAME,
          id: 'b51ec534-ee48-4575-b6a9-ead2955b8098'
        }
      }
      const method = ENUM.Http.RestMethods.PUT
      const toUrl = await Participant.getEndpoint({ fsp: msg.value.to, endpointType: ENUM.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_TRANSFER_ERROR, id: msg.value.content.payload.transferId })
      const toHeaders = createCallbackHeaders({ dfspId: msg.value.to, transferId: msg.value.content.payload.transferId, headers: msg.value.content.headers, httpMethod: method, endpointTemplate: ENUM.EndPoints.FspEndpointTemplates.TRANSFERS_PUT_ERROR }, true)
      const message = { transferId: uuid }

      const expected = true
      const logger = Logger
      logger.log = logger.info

      const jwsSigner = new JwsSignerStub()

      Callback.sendRequest.withArgs(match({ url: toUrl, headers: toHeaders, source: msg.value.from, destination: msg.value.to, method, payload: JSON.stringify(message), responseType: ENUM.Http.ResponseTypes.JSON, hubNameRegex, jwsSigner })).returns(Promise.resolve(200))

      const result = await NotificationProxy.processMessage(msg)
      test.ok(Callback.sendRequest.calledWith(match({ url: toUrl, headers: toHeaders, source: msg.value.from, destination: msg.value.to, method, payload: JSON.stringify(message), responseType: ENUM.Http.ResponseTypes.JSON, hubNameRegex, jwsSigner })))
      test.equal(result, expected)
      test.end()
    })

    await processMessageTest.test('process a abort-duplicate message received from kafka and send out a transfer error callback - JWS Sign', async test => {
      const ConfigStub = Util.clone(Config)
      ConfigStub.JWS_SIGN = true
      ConfigStub.JWS_SIGNING_KEY = 'some jws key'
      const JwsSignerStub = Sinon.stub()
      const NotificationProxy = Proxyquire(`${src}/handlers/notification`, {
        '../../lib/config': ConfigStub,
        '@mojaloop/sdk-standard-components': {
          Jws: {
            signer: JwsSignerStub.returns({
              getSignature: () => {
                return 'some signature'
              }
            })
          }
        }
      })

      const uuid = Uuid()
      const payerFsp = 'dfsp1'
      const payeeFsp = 'dfsp2'

      const msg = {
        value: {
          metadata: {
            event: {
              type: 'prepare',
              action: 'abort-duplicate',
              state: {
                status: 'error',
                code: 1
              }
            }
          },
          content: {
            headers: {
              'FSPIOP-Destination': payerFsp,
              'FSPIOP-Source': payeeFsp
            },
            payload: { transferId: uuid }
          },
          to: payerFsp,
          from: Config.HUB_NAME,
          id: 'b51ec534-ee48-4575-b6a9-ead2955b8098'
        }
      }
      const method = ENUM.Http.RestMethods.PUT
      const toUrl = await Participant.getEndpoint({ fsp: msg.value.to, endpointType: ENUM.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_TRANSFER_ERROR, id: msg.value.content.payload.transferId })
      const toHeaders = createCallbackHeaders({ dfspId: msg.value.to, transferId: msg.value.content.payload.transferId, headers: msg.value.content.headers, httpMethod: method, endpointTemplate: ENUM.EndPoints.FspEndpointTemplates.TRANSFERS_PUT_ERROR }, true)
      const message = { transferId: uuid }

      const expected = true
      const logger = Logger
      logger.log = logger.info

      const jwsSigner = new JwsSignerStub()

      Callback.sendRequest.withArgs(match({ url: toUrl, headers: toHeaders, source: msg.value.from, destination: msg.value.to, method, payload: JSON.stringify(message), responseType: ENUM.Http.ResponseTypes.JSON, hubNameRegex, jwsSigner })).returns(Promise.resolve(200))

      const result = await NotificationProxy.processMessage(msg)
      test.ok(Callback.sendRequest.calledWith(match({ url: toUrl, headers: toHeaders, source: msg.value.from, destination: msg.value.to, method, payload: JSON.stringify(message), responseType: ENUM.Http.ResponseTypes.JSON, hubNameRegex, jwsSigner })))
      test.equal(result, expected)
      test.end()
    })

    await processMessageTest.test('ignore a RESERVED_ABORTED message if the API version < 1.1', async test => {
      // Arrange
      const ConfigStub = Util.clone(Config)
      ConfigStub.PROTOCOL_VERSIONS.CONTENT.DEFAULT = '1.0'
      ConfigStub.JWS_SIGN = false
      const NotificationProxy = Proxyquire(`${src}/handlers/notification`, {
        '../../lib/config': ConfigStub
      })

      const uuid = Uuid()
      const msg = {
        value: {
          metadata: {
            event: {
              type: 'fulfil',
              action: 'reserved-aborted',
              state: {
                status: 'error',
                code: 1
              }
            }
          },
          content: {
            headers: {
              'FSPIOP-Destination': 'dfsp1',
              'FSPIOP-Source': Config.HUB_NAME
            },
            // TODO: double check - is this a valid payload?
            payload: {
              transferId: uuid,
              completedTimestamp: '2021-05-24T08:38:08.699-04:00',
              transferState: 'ABORTED'
            }
          },
          to: 'dfsp1',
          from: Config.HUB_NAME,
          id: 'b51ec534-ee48-4575-b6a9-ead2955b8098'
        }
      }

      // Act
      const result = await NotificationProxy.processMessage(msg)

      // Assert
      const callbackCall = Callback.sendRequest.getCall(0)
      test.equal(callbackCall, null, 'Callback.sendRequest should not have been called')
      test.equal(result, undefined, 'NotificationProxy.processMessage should resolve to undefined')
      test.end()
    })

    await processMessageTest.test('process a RESERVED_ABORTED message if the API version === 1.1', async test => {
      // Arrange
      const ConfigStub = Util.clone(Config)
      ConfigStub.PROTOCOL_VERSIONS.CONTENT.DEFAULT = '1.1'
      ConfigStub.JWS_SIGN = false

      const NotificationProxy = Proxyquire(`${src}/handlers/notification`, {
        '../../lib/config': ConfigStub
      })

      const uuid = Uuid()
      const msg = {
        value: {
          metadata: {
            event: {
              type: 'prepare',
              action: 'reserved-aborted',
              state: {
                status: 'error',
                code: 1
              }
            }
          },
          content: {
            headers: {
              'FSPIOP-Destination': 'dfsp1',
              'FSPIOP-Source': Config.HUB_NAME
            },
            // TODO: double check - is this a valid payload?
            payload: {
              transferId: uuid,
              completedTimestamp: '2021-05-24T08:38:08.699-04:00',
              transferState: 'ABORTED'
            }
          },
          to: 'dfsp1',
          from: Config.HUB_NAME,
          id: 'b51ec534-ee48-4575-b6a9-ead2955b8098'
        }
      }
      const expectedHeaders = createCallbackHeaders({
        dfspId: 'dfsp1',
        transferId: uuid,
        headers: msg.value.content.headers,
        httpMethod: ENUM.Http.RestMethods.PATCH,
        endpointTemplate: ENUM.EndPoints.FspEndpointTemplates.TRANSFERS_PUT
      }, true)
      const expectedMessageStr = JSON.stringify({
        // hmm I don't think this should include the transferId!
        transferId: uuid,
        completedTimestamp: '2021-05-24T08:38:08.699-04:00',
        transferState: 'ABORTED'
      })
      const protocolVersions = { content: ConfigStub.PROTOCOL_VERSIONS.CONTENT.DEFAULT, accept: ConfigStub.PROTOCOL_VERSIONS.ACCEPT.DEFAULT }

      // Act
      const result = await NotificationProxy.processMessage(msg)

      // Assert
      test.ok(Callback.sendRequest.calledWith(match({
        url,
        headers: expectedHeaders,
        source: msg.value.from,
        destination: msg.value.to,
        method: ENUM.Http.RestMethods.PATCH,
        payload: expectedMessageStr,
        responseType: ENUM.Http.ResponseTypes.JSON,
        span: undefined,
        jwsSigner: undefined,
        protocolVersions,
        hubNameRegex
      })), 'Callback.sendRequest was called with the expected args')
      test.equal(result, true, 'NotificationProxy.processMessage should match the expected')
      test.end()
    })

    await processMessageTest.test('process a FX_RESERVED_ABORTED message if the API version === 2.0', async test => {
      // Arrange
      const ConfigStub = Util.clone(Config)
      ConfigStub.PROTOCOL_VERSIONS.CONTENT.DEFAULT = '2.0'
      ConfigStub.JWS_SIGN = false

      const NotificationProxy = Proxyquire(`${src}/handlers/notification`, {
        '../../lib/config': ConfigStub
      })

      const uuid = Uuid()
      const msg = {
        value: {
          metadata: {
            event: {
              type: 'prepare',
              action: 'fx-reserved-aborted',
              state: {
                status: 'error',
                code: 1
              }
            }
          },
          content: {
            headers: {
              'FSPIOP-Destination': 'dfsp1',
              'FSPIOP-Source': Config.HUB_NAME
            },
            payload: {
              commitRequestId: uuid,
              completedTimestamp: '2021-05-24T08:38:08.699-04:00',
              transferState: 'ABORTED'
            }
          },
          to: 'dfsp1',
          from: Config.HUB_NAME,
          id: 'b51ec534-ee48-4575-b6a9-ead2955b8098'
        }
      }
      const expectedHeaders = createCallbackHeaders({
        dfspId: 'dfsp1',
        transferId: uuid,
        headers: msg.value.content.headers,
        httpMethod: ENUM.Http.RestMethods.PATCH,
        endpointTemplate: ENUM.EndPoints.FspEndpointTemplates.FX_TRANSFERS_PUT
      }, true)
      const expectedMessageStr = JSON.stringify({
        commitRequestId: uuid,
        completedTimestamp: '2021-05-24T08:38:08.699-04:00',
        transferState: 'ABORTED'
      })

      // Act
      const result = await NotificationProxy.processMessage(msg)

      // Assert
      test.ok(Callback.sendRequest.calledWith(match({
        url,
        headers: expectedHeaders,
        source: msg.value.from,
        destination: msg.value.to,
        method: ENUM.Http.RestMethods.PATCH,
        payload: expectedMessageStr,
        responseType: ENUM.Http.ResponseTypes.JSON,
        span: undefined,
        jwsSigner: undefined,
        hubNameRegex
      })), 'Callback.sendRequest was called with the expected args')
      test.equal(result, true, 'NotificationProxy.processMessage should match the expected')
      test.end()
    })

    await processMessageTest.test('process a get message received from kafka and send out a put callback', async test => {
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
              'FSPIOP-Source': payerFsp
            },
            payload: { transferId: uuid },
            uriParams: { id: uuid }
          },
          to: payeeFsp,
          from: payerFsp,
          id: 'b51ec534-ee48-4575-b6a9-ead2955b8098'
        }
      }

      const urlPayee = await Participant.getEndpoint({ fsp: msg.value.to, endpointType: ENUM.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_TRANSFER_PUT, id: msg.value.content.uriParams.id })
      const method = ENUM.Http.RestMethods.PUT
      const payeeHeaders = createCallbackHeaders({ dfspId: msg.value.to, transferId: msg.value.content.uriParams.id, headers: msg.value.content.headers, httpMethod: method, endpointTemplate: ENUM.EndPoints.FspEndpointTemplates.TRANSFERS_PUT }, true)
      const message = { transferId: uuid }
      const expected = true
      Callback.sendRequest.withArgs(match({ url: urlPayee, headers: payeeHeaders, source: msg.value.from, destination: msg.value.to, method, payload: JSON.stringify(message), hubNameRegex })).returns(Promise.resolve(200))
      Participant.getEndpoint.resetHistory()
      createCallbackHeadersSpy.resetHistory()

      const result = await Notification.processMessage(msg)

      test.ok(Participant.getEndpoint.getCall(0).calledWith(match({ fsp: msg.value.to, endpointType: ENUM.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_TRANSFER_PUT, id: msg.value.content.uriParams.id, isFx: false, span: undefined })))
      test.ok(createCallbackHeadersSpy.getCall(0).calledWith(match({ dfspId: msg.value.to, transferId: msg.value.content.uriParams.id, headers: msg.value.content.headers, httpMethod: method, endpointTemplate: ENUM.EndPoints.FspEndpointTemplates.TRANSFERS_PUT })))
      test.ok(Callback.sendRequest.calledWith(match({ url: urlPayee, headers: payeeHeaders, source: msg.value.from, destination: msg.value.to, method, payload: JSON.stringify(message), hubNameRegex })))
      test.equal(result, expected)
      test.end()
    })

    await processMessageTest.test('process a fx-get message received from kafka and send out a put callback', async test => {
      const fxp = 'fxp1'
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
              'FSPIOP-Destination': fxp,
              'FSPIOP-Source': payerFsp
            },
            payload: { commitRequestId: uuid },
            uriParams: { id: uuid }
          },
          to: fxp,
          from: payerFsp,
          id: 'b51ec534-ee48-4575-b6a9-ead2955b8098'
        }
      }

      const urlPayee = await Participant.getEndpoint({ fsp: msg.value.to, endpointType: ENUM.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_FX_TRANSFER_PUT, id: msg.value.content.uriParams.id })
      const method = ENUM.Http.RestMethods.PUT
      const payeeHeaders = createCallbackHeaders({ dfspId: msg.value.to, transferId: msg.value.content.uriParams.id, headers: msg.value.content.headers, httpMethod: method, endpointTemplate: ENUM.EndPoints.FspEndpointTemplates.FX_TRANSFERS_PUT }, true)
      const message = { commitRequestId: uuid }
      const expected = true
      Callback.sendRequest.withArgs(match({ url: urlPayee, headers: payeeHeaders, source: msg.value.from, destination: msg.value.to, method, payload: JSON.stringify(message), hubNameRegex })).returns(Promise.resolve(200))
      Participant.getEndpoint.resetHistory()
      createCallbackHeadersSpy.resetHistory()

      const result = await Notification.processMessage(msg)

      test.ok(Participant.getEndpoint.getCall(0).calledWith(match({ fsp: msg.value.to, endpointType: ENUM.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_FX_TRANSFER_PUT, id: msg.value.content.uriParams.id, isFx: true, span: undefined })))
      test.ok(createCallbackHeadersSpy.getCall(0).calledWith(match({ dfspId: msg.value.to, transferId: msg.value.content.uriParams.id, headers: msg.value.content.headers, httpMethod: method, endpointTemplate: ENUM.EndPoints.FspEndpointTemplates.FX_TRANSFERS_PUT })))
      test.ok(Callback.sendRequest.calledWith(match({ url: urlPayee, headers: payeeHeaders, source: msg.value.from, destination: msg.value.to, method, payload: JSON.stringify(message), hubNameRegex })))
      test.equal(result, expected)
      test.end()
    })

    await processMessageTest.test('process a get message received from kafka and send out a put error callback', async test => {
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
                status: 'error',
                code: 1
              }
            }
          },
          content: {
            headers: {
              'FSPIOP-Destination': payeeFsp,
              'FSPIOP-Source': payerFsp
            },
            payload: {
              errorInformation: {
                errorCode: '3100',
                errorDescription: 'Generic validation error'
              }
            },
            uriParams: { id: uuid }
          },
          to: payeeFsp,
          from: payerFsp,
          id: 'b51ec534-ee48-4575-b6a9-ead2955b8098'
        }
      }

      const urlPayee = await Participant.getEndpoint({ fsp: msg.value.to, endpointType: ENUM.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_TRANSFER_ERROR, id: msg.value.content.uriParams.id })
      const method = ENUM.Http.RestMethods.PUT
      const payeeHeaders = createCallbackHeaders({ dfspId: msg.value.to, transferId: msg.value.content.uriParams.id, headers: msg.value.content.headers, httpMethod: method, endpointTemplate: ENUM.EndPoints.FspEndpointTemplates.TRANSFERS_PUT_ERROR }, true)
      const message = { errorInformation: msg.value.content.payload.errorInformation }
      const expected = true
      Callback.sendRequest.withArgs(match({ url: urlPayee, headers: payeeHeaders, source: msg.value.from, destination: msg.value.to, method, payload: JSON.stringify(message), hubNameRegex })).returns(Promise.resolve(200))
      Participant.getEndpoint.resetHistory()
      createCallbackHeadersSpy.resetHistory()

      const result = await Notification.processMessage(msg)

      test.ok(Participant.getEndpoint.getCall(0).calledWith(match({ fsp: msg.value.to, endpointType: ENUM.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_TRANSFER_ERROR, id: msg.value.content.uriParams.id, isFx: false, span: undefined })))
      test.ok(createCallbackHeadersSpy.getCall(0).calledWith(match({ dfspId: msg.value.to, transferId: msg.value.content.uriParams.id, headers: msg.value.content.headers, httpMethod: method, endpointTemplate: ENUM.EndPoints.FspEndpointTemplates.TRANSFERS_PUT_ERROR })))
      test.ok(Callback.sendRequest.calledWith(match({ url: urlPayee, headers: payeeHeaders, source: msg.value.from, destination: msg.value.to, method, payload: JSON.stringify(message), hubNameRegex })))
      test.equal(result, expected)
      test.end()
    })

    await processMessageTest.test('process a fx-get message received from kafka and send out a put error callback', async test => {
      const fxp = 'fxp1'
      const payerFsp = 'dfsp1'
      const uuid = Uuid()
      const msg = {
        value: {
          metadata: {
            event: {
              type: 'notification',
              action: 'fx-get',
              state: {
                status: 'error',
                code: 1
              }
            }
          },
          content: {
            headers: {
              'FSPIOP-Destination': fxp,
              'FSPIOP-Source': payerFsp
            },
            payload: {
              errorInformation: {
                errorCode: '3100',
                errorDescription: 'Generic validation error'
              }
            },
            uriParams: { id: uuid }
          },
          to: fxp,
          from: payerFsp,
          id: 'b51ec534-ee48-4575-b6a9-ead2955b8098'
        }
      }

      const urlPayee = await Participant.getEndpoint({ fsp: msg.value.to, endpointType: ENUM.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_FX_TRANSFER_ERROR, id: msg.value.content.uriParams.id })
      const method = ENUM.Http.RestMethods.PUT
      const payeeHeaders = createCallbackHeaders({ dfspId: msg.value.to, transferId: msg.value.content.uriParams.id, headers: msg.value.content.headers, httpMethod: method, endpointTemplate: ENUM.EndPoints.FspEndpointTemplates.FX_TRANSFERS_PUT_ERROR }, true)
      const message = { errorInformation: msg.value.content.payload.errorInformation }
      const expected = true
      Callback.sendRequest.withArgs(match({ url: urlPayee, headers: payeeHeaders, source: msg.value.from, destination: msg.value.to, method, payload: JSON.stringify(message), hubNameRegex })).returns(Promise.resolve(200))
      Participant.getEndpoint.resetHistory()
      createCallbackHeadersSpy.resetHistory()

      const result = await Notification.processMessage(msg)

      test.ok(Participant.getEndpoint.getCall(0).calledWith(match({ fsp: msg.value.to, endpointType: ENUM.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_FX_TRANSFER_ERROR, id: msg.value.content.uriParams.id, isFx: true, span: undefined })))
      test.ok(createCallbackHeadersSpy.getCall(0).calledWith(match({ dfspId: msg.value.to, transferId: msg.value.content.uriParams.id, headers: msg.value.content.headers, httpMethod: method, endpointTemplate: ENUM.EndPoints.FspEndpointTemplates.FX_TRANSFERS_PUT_ERROR })))
      test.ok(Callback.sendRequest.calledWith(match({ url: urlPayee, headers: payeeHeaders, source: msg.value.from, destination: msg.value.to, method, payload: JSON.stringify(message), hubNameRegex })))
      test.equal(result, expected)
      test.end()
    })

    await processMessageTest.test('throws an error if Callback.sendRequest fails', async test => {
      // Arrange
      const ConfigStub = Util.clone(Config)
      ConfigStub.PROTOCOL_VERSIONS.CONTENT.DEFAULT = '1.1'
      ConfigStub.JWS_SIGN = false
      const NotificationProxy = Proxyquire(`${src}/handlers/notification`, {
        '../../lib/config': ConfigStub
      })
      // Override mock
      Callback.sendRequest.returns(Promise.reject(new Error('Test Error')))

      const uuid = Uuid()
      const msg = {
        value: {
          metadata: {
            event: {
              type: 'prepare',
              action: 'reserved-aborted',
              state: {
                status: 'error',
                code: 1
              }
            }
          },
          content: {
            headers: {
              'FSPIOP-Destination': 'dfsp1',
              'FSPIOP-Source': Config.HUB_NAME
            },
            // TODO: double check - is this a valid payload?
            payload: {
              transferId: uuid,
              completedTimestamp: '2021-05-24T08:38:08.699-04:00',
              transferState: 'ABORTED'
            }
          },
          to: 'dfsp1',
          from: Config.HUB_NAME,
          id: 'b51ec534-ee48-4575-b6a9-ead2955b8098'
        }
      }
      const expectedHeaders = createCallbackHeaders({
        dfspId: 'dfsp1',
        transferId: uuid,
        headers: msg.value.content.headers,
        httpMethod: ENUM.Http.RestMethods.PATCH,
        endpointTemplate: ENUM.EndPoints.FspEndpointTemplates.TRANSFERS_PUT
      }, true)
      const expectedMessageStr = JSON.stringify({
        // hmm I don't think this should include the transferId!
        transferId: uuid,
        completedTimestamp: '2021-05-24T08:38:08.699-04:00',
        transferState: 'ABORTED'
      })

      // Act
      try {
        // TODO: use this for validating the test
        await NotificationProxy.processMessage(msg)
        test.notOk('Code should not be executed')
      } catch (err) {
        // Assert
        test.ok(Callback.sendRequest.calledWith(match({
          url,
          headers: expectedHeaders,
          source: msg.value.from,
          destination: msg.value.to,
          method: ENUM.Http.RestMethods.PATCH,
          payload: expectedMessageStr,
          responseType: ENUM.Http.ResponseTypes.JSON,
          span: undefined,
          jwsSigner: undefined,
          hubNameRegex
        })), 'Callback.sendRequest was called with the expected args')
        test.equal(err.message, 'Test Error')
      }

      test.end()
    })

    await processMessageTest.end()
  })

  await notificationTest.test('startConsumer should', async startConsumerTest => {
    await startConsumerTest.test('start the consumer and consumer messages', async test => {
      test.ok(await Notification.startConsumer())
      test.end()
    })

    await startConsumerTest.test('start the consumer and consumer messages with auto-commit enabled', async test => {
      Config.KAFKA_CONFIG.CONSUMER.NOTIFICATION.EVENT.config.rdkafkaConf['enable.auto.commit'] = undefined
      test.ok(await Notification.startConsumer())
      test.end()
      Config.KAFKA_CONFIG.CONSUMER.NOTIFICATION.EVENT.config.rdkafkaConf['enable.auto.commit'] = false
    })

    await startConsumerTest.test('throw error on error connecting to kafka', async test => {
      const error = new Error()
      Consumer.prototype.connect.returns(Promise.reject(error))
      try {
        await Notification.startConsumer()
        test.fail('Was expecting an error when connecting to Kafka')
        test.end()
      } catch (e) {
        test.ok(e instanceof Error)
        test.end()
      }
    })

    await startConsumerTest.end()
  })

  await notificationTest.test('consumeMessage should', async consumeMessageTest => {
    await consumeMessageTest.test('process the message', async test => {
      const msg = {
        value: {
          metadata: {
            event: {
              type: 'prepare',
              action: 'prepare',
              state: {
                status: 'success',
                code: 0
              }
            }
          },
          content: {
            headers: {},
            payload: {}
          },
          to: 'dfsp2',
          from: 'dfsp1',
          id: 'b51ec534-ee48-4575-b6a9-ead2955b8098'
        }
      }
      const result = await Notification.consumeMessage(null, [msg])
      test.ok(result)
      test.end()
    })

    await consumeMessageTest.test('process the message with auto-commit enabled', async test => {
      Config.KAFKA_CONFIG.CONSUMER.NOTIFICATION.EVENT.config.rdkafkaConf['enable.auto.commit'] = true
      const msg = {
        value: {
          metadata: {
            event: {
              type: 'prepare',
              action: 'prepare',
              state: {
                status: 'success',
                code: 0
              }
            }
          },
          content: {
            headers: {},
            payload: {}
          },
          to: 'dfsp2',
          from: 'dfsp1',
          id: 'b51ec534-ee48-4575-b6a9-ead2955b8098'
        }
      }
      test.ok(await Notification.startConsumer())
      const result = await Notification.consumeMessage(null, [msg])
      test.ok(result)
      test.end()
      Config.KAFKA_CONFIG.CONSUMER.NOTIFICATION.EVENT.config.rdkafkaConf['enable.auto.commit'] = false
    })

    consumeMessageTest.test('process the message with tracestate metrics for prepare', async test => {
      Config.KAFKA_CONFIG.CONSUMER.NOTIFICATION.EVENT.config.rdkafkaConf['enable.auto.commit'] = true
      const ts = {
        spanId: '203f89c23748cfb1',
        timeApiPrepare: Date.now()
      }
      const msg = {
        value: {
          metadata: {
            event: {
              type: 'prepare',
              action: 'prepare',
              state: {
                status: 'success',
                code: 0
              }
            },
            trace: {
              startTimestamp: new Date().toISOString(),
              service: 'parent service',
              traceId: 'a2e298d549a55ee9ac342c6b42f58923',
              spanId: '203f89c23748cfb1',
              tags: {
                tracestate: `acmevendor=${Buffer.from(JSON.stringify(ts)).toString('base64')}`
              }
            }
          },
          content: {
            headers: {},
            payload: {}
          },
          to: 'dfsp2',
          from: 'dfsp1',
          id: 'b51ec534-ee48-4575-b6a9-ead2955b8098'
        }
      }
      test.ok(await Notification.startConsumer())
      const result = await Notification.consumeMessage(null, [msg])
      test.ok(result)
      test.end()
      Config.KAFKA_CONFIG.CONSUMER.NOTIFICATION.EVENT.config.rdkafkaConf['enable.auto.commit'] = false
    })

    consumeMessageTest.test('process the message with tracestate metrics for fulfil', async test => {
      Config.KAFKA_CONFIG.CONSUMER.NOTIFICATION.EVENT.config.rdkafkaConf['enable.auto.commit'] = true
      const ts = {
        spanId: '203f89c23748cfb1',
        timeApiPrepare: Date.now(),
        timeApiFulfil: Date.now()
      }

      const msg = {
        value: {
          metadata: {
            event: {
              type: 'fulfil',
              action: 'fulfil',
              state: {
                status: 'success',
                code: 0
              }
            },
            trace: {
              startTimestamp: new Date().toISOString(),
              service: 'parent service',
              traceId: 'a2e298d549a55ee9ac342c6b42f58923',
              spanId: '203f89c23748cfb1',
              tags: {
                tracestate: `acmevendor=${Buffer.from(JSON.stringify(ts)).toString('base64')}`
              }
            }
          },
          content: {
            headers: {},
            payload: {}
          },
          to: 'dfsp2',
          from: 'dfsp1',
          id: 'b51ec534-ee48-4575-b6a9-ead2955b8098'
        }
      }
      test.ok(await Notification.startConsumer())
      const result = await Notification.consumeMessage(null, [msg])
      test.ok((result === false))
      test.end()
      Config.KAFKA_CONFIG.CONSUMER.NOTIFICATION.EVENT.config.rdkafkaConf['enable.auto.commit'] = false
    })

    consumeMessageTest.test('process the message for reserve action', async test => {
      Config.KAFKA_CONFIG.CONSUMER.NOTIFICATION.EVENT.config.rdkafkaConf['enable.auto.commit'] = true
      const msg = {
        value: {
          metadata: {
            event: {
              type: 'notification',
              action: 'reserve',
              state: {
                status: 'success',
                code: 0
              }
            }
          },
          content: {
            headers: {},
            payload: {
              fulfilment: 'test'
            }
          },
          to: 'dfsp2',
          from: 'dfsp1',
          id: 'b51ec534-ee48-4575-b6a9-ead2955b8098'
        }
      }
      test.ok(await Notification.startConsumer())
      const result = await Notification.consumeMessage(null, [msg])
      test.ok((result === true))
      test.end()
      Config.KAFKA_CONFIG.CONSUMER.NOTIFICATION.EVENT.config.rdkafkaConf['enable.auto.commit'] = false
    })

    consumeMessageTest.test('process the message with auto-commit disabled', async test => {
      Config.KAFKA_CONFIG.CONSUMER.NOTIFICATION.EVENT.config.rdkafkaConf['enable.auto.commit'] = false
      const msg = {
        value: {
          metadata: {
            event: {
              type: 'prepare',
              action: 'prepare',
              state: {
                status: 'success',
                code: 0
              }
            }
          },
          content: {
            headers: {},
            payload: {}
          },
          to: 'dfsp2',
          from: 'dfsp1',
          id: 'b51ec534-ee48-4575-b6a9-ead2955b8098'
        }
      }
      test.ok(await Notification.startConsumer())
      const result = await Notification.consumeMessage(null, [msg])
      test.ok(result)
      test.end()
      Config.KAFKA_CONFIG.CONSUMER.NOTIFICATION.EVENT.config.rdkafkaConf['enable.auto.commit'] = false
    })

    await consumeMessageTest.test('process the message with action = get', async test => {
      Config.KAFKA_CONFIG.CONSUMER.NOTIFICATION.EVENT.config.rdkafkaConf['enable.auto.commit'] = false
      const msg = {
        value: {
          metadata: {
            event: {
              type: 'prepare',
              action: 'get',
              state: {
                status: 'success',
                code: 0
              }
            }
          },
          content: {
            headers: {},
            payload: {}
          },
          to: 'dfsp2',
          from: 'dfsp1',
          id: 'b51ec534-ee48-4575-b6a9-ead2955b8098'
        }
      }
      test.ok(await Notification.startConsumer())
      const result = await Notification.consumeMessage(null, [msg])
      test.ok(result)
      test.end()
      Config.KAFKA_CONFIG.CONSUMER.NOTIFICATION.EVENT.config.rdkafkaConf['enable.auto.commit'] = false
    })

    await consumeMessageTest.test('process the message with action = get and unsuccessful message status', async test => {
      Config.KAFKA_CONFIG.CONSUMER.NOTIFICATION.EVENT.config.rdkafkaConf['enable.auto.commit'] = false
      const msg = {
        value: {
          metadata: {
            event: {
              type: 'prepare',
              action: 'get',
              state: {
                status: 'error',
                code: 1
              }
            }
          },
          content: {
            headers: {},
            payload: {}
          },
          to: 'dfsp2',
          from: 'dfsp1',
          id: 'b51ec534-ee48-4575-b6a9-ead2955b8098'
        }
      }
      test.ok(await Notification.startConsumer())
      const result = await Notification.consumeMessage(null, [msg])
      test.ok(result)
      test.end()
      Config.KAFKA_CONFIG.CONSUMER.NOTIFICATION.EVENT.config.rdkafkaConf['enable.auto.commit'] = false
    })

    await consumeMessageTest.test('throw error is there is any error processing the message', async test => {
      const msg = {
        value: {
          metadata: {
            event: {
              type: 'prepare',
              action: 'prepare',
              state: {
                status: 'success',
                code: 0
              }
            }
          },
          to: 'dfsp2',
          from: 'dfsp1',
          id: 'b51ec534-ee48-4575-b6a9-ead2955b8098'
        }
      }
      try {
        await Notification.consumeMessage(null, [msg])
        test.fail('Should not have caught an error here since it should have been dealt with')
        test.end()
      } catch (e) {
        test.pass('Error successfully thrown')
        test.end()
      }
    })

    await consumeMessageTest.test('throw error is there is any error processing the message with auto-commit enabled', async test => {
      Config.KAFKA_CONFIG.CONSUMER.NOTIFICATION.EVENT.config.rdkafkaConf['enable.auto.commit'] = true
      const msg = {
        value: {
          metadata: {
            event: {
              type: 'prepare',
              action: 'prepare',
              state: {
                status: 'success',
                code: 0
              }
            }
          },
          to: 'dfsp2',
          from: 'dfsp1',
          id: 'b51ec534-ee48-4575-b6a9-ead2955b8098'
        }
      }
      try {
        test.ok(await Notification.startConsumer())
        await Notification.consumeMessage(null, [msg])
        test.fail('Should not have caught an error here since it should have been dealt with')
        test.end()
      } catch (e) {
        test.pass('Error successfully thrown')
        test.end()
      }
      Config.KAFKA_CONFIG.CONSUMER.NOTIFICATION.EVENT.config.rdkafkaConf['enable.auto.commit'] = false
    })

    await consumeMessageTest.test('convert a single message into an array', async test => {
      const msg = {
        value: {
          metadata: {
            event: {
              type: 'prepare',
              action: 'prepare',
              state: {
                status: 'success',
                code: 0
              }
            }
          },
          content: {
            headers: {},
            payload: {}
          },
          to: 'dfsp2',
          from: 'dfsp1',
          id: 'b51ec534-ee48-4575-b6a9-ead2955b8098'
        }
      }
      const result = await Notification.consumeMessage(null, msg)
      test.ok(result === true)
      test.end()
    })

    await consumeMessageTest.test('throw error on invalid message', async test => {
      const msg = {
      }

      const message = [msg]
      const error = new Error()

      try {
        await Notification.consumeMessage(error, message)
        test.fail('ehe')
        test.end()
      } catch (e) {
        test.ok(e instanceof Error)
        test.end()
      }
    })

    await consumeMessageTest.end()
  })

  await notificationTest.test('isConnected', async isConnectedTest => {
    await isConnectedTest.test('call base class isConnected function - true', async test => {
      // Arrange
      await Notification.startConsumer()
      sandbox.stub(Consumer.prototype, 'isConnected').returns(true)

      // Act
      const result = await Notification.isConnected()

      // Assert
      test.ok(Consumer.prototype.isConnected.calledOnce)
      test.equal(result, true, 'isConnected should return true')
      test.end()
    })

    await isConnectedTest.test('call base class isConnected function - false', async test => {
      // Arrange
      await Notification.startConsumer()
      sandbox.stub(Consumer.prototype, 'isConnected').returns(false)

      // Act
      const result = await Notification.isConnected()

      // Assert
      test.ok(Consumer.prototype.isConnected.calledOnce)
      test.equal(result, false, 'isConnected should return false')
      test.end()
    })

    await isConnectedTest.end()
  })

  await notificationTest.test('disconnect', async disconnectTest => {
    await disconnectTest.test('call base class disconnect function', async test => {
      // Arrange
      await Notification.startConsumer()
      sandbox.stub(Consumer.prototype, 'disconnect')

      // Act
      await Notification.disconnect()

      // Assert
      test.ok(Consumer.prototype.disconnect.calledOnce)
      test.end()
    })

    await disconnectTest.end()
  })

  await notificationTest.end()
})
