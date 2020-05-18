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

const src = '../../../../src'
const Test = require('tapes')(require('tape'))
const Sinon = require('sinon')
const rewire = require('rewire')
const Consumer = require('@mojaloop/central-services-stream').Kafka.Consumer
const EncodePayload = require('@mojaloop/central-services-shared').Util.StreamingProtocol.encodePayload
const Logger = require('@mojaloop/central-services-logger')
const FSPIOPError = require('@mojaloop/central-services-error-handling').Factory.FSPIOPError
const ErrorHandlingEnums = require('@mojaloop/central-services-error-handling').Enums.Internal

const Notification = require(`${src}/handlers/notification`)
const Util = require('@mojaloop/central-services-shared').Util
const Callback = require('@mojaloop/central-services-shared').Util.Request
const createCallbackHeaders = require(`${src}/lib/headers`).createCallbackHeaders
const Config = require(`${src}/lib/config.js`)
const Participant = require(`${src}/domain/participant`)
const ENUM = require('@mojaloop/central-services-shared').Enum
const KafkaUtil = require('@mojaloop/central-services-shared').Util.Kafka
const JwsSigner = require('@mojaloop/sdk-standard-components').Jws.signer
const Uuid = require('uuid4')
const Proxyquire = require('proxyquire')

Test('Notification Service tests', async notificationTest => {
  let sandbox
  const url = 'http://somehost:port/'

  await notificationTest.beforeEach(t => {
    sandbox = Sinon.createSandbox()
    sandbox.stub(Consumer.prototype, 'constructor')

    sandbox.stub(Consumer.prototype, 'connect').returns(Promise.resolve(true))
    // sandbox.stub(Consumer.prototype, 'consume').callsArgAsync(0)
    sandbox.stub(Consumer.prototype, 'consume').returns(Promise.resolve(true)) // .callsArgAsync(0)
    sandbox.stub(Consumer.prototype, 'commitMessageSync').returns(Promise.resolve(true))
    sandbox.stub(Participant, 'getEndpoint').returns(Promise.resolve(url))

    sandbox.stub(Logger)
    sandbox.stub(Logger, 'isErrorEnabled').value(true)
    sandbox.stub(Logger, 'isInfoEnabled').value(true)
    sandbox.stub(Logger, 'isDebugEnabled').value(true)

    // sandbox.stub(Callback, 'sendRequest').returns(Promise.resolve(true))
    sandbox.stub(Callback, 'sendRequest').returns(Promise.resolve(true))
    sandbox.stub(JwsSigner.prototype, 'constructor')
    sandbox.stub(JwsSigner.prototype, 'getSignature').returns(true)
    t.end()
  })

  await notificationTest.afterEach(t => {
    sandbox.restore()
    t.end()
  })

  await notificationTest.test('processMessage should', async processMessageTest => {
    await processMessageTest.test('process the message received from kafka and send out a transfer post callback payload with an error, but without cause entry from extensionList extension', async test => {
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
            }
          },
          to: 'dfsp2',
          from: 'dfsp1',
          id: 'b51ec534-ee48-4575-b6a9-ead2955b8098'
        }
      }

      const method = ENUM.Http.RestMethods.POST
      const url = await Participant.getEndpoint(msg.value.to, ENUM.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_TRANSFER_POST, msg.value.content.payload.transferId)
      const headers = createCallbackHeaders({ headers: msg.value.content.headers, httpMethod: ENUM.Http.RestMethods.POST, endpointTemplate: ENUM.EndPoints.FspEndpointTemplates.TRANSFERS_POST })
      const message = {
        errorInformation: {
          errorCode: '3100',
          errorDescription: 'Validation error - PartyIdTypeEnum'
        }
      }

      const expected = true

      Callback.sendRequest.withArgs(url, headers, msg.value.from, msg.value.to, method, JSON.stringify(message)).returns(Promise.resolve(200))
      const result = await Notification.processMessage(msg)
      test.ok(Callback.sendRequest.calledWith(url, headers, msg.value.from, msg.value.to, method, JSON.stringify(message)))
      test.equal(result, expected)
      test.end()
    })

    await processMessageTest.test('process the message received from kafka and send out a transfer post callback', async test => {
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
      const url = await Participant.getEndpoint(msg.value.to, ENUM.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_TRANSFER_POST, msg.value.content.payload.transferId)
      const headers = createCallbackHeaders({ headers: msg.value.content.headers, httpMethod: ENUM.Http.RestMethods.POST, endpointTemplate: ENUM.EndPoints.FspEndpointTemplates.TRANSFERS_POST })
      const message = { transferId: uuid }

      const expected = true

      Callback.sendRequest.withArgs(url, headers, msg.value.from, msg.value.to, method, JSON.stringify(message)).returns(Promise.resolve(200))
      const result = await Notification.processMessage(msg)
      test.ok(Callback.sendRequest.calledWith(url, headers, msg.value.from, msg.value.to, method, JSON.stringify(message)))
      test.equal(result, expected)
      test.end()
    })

    processMessageTest.test('process the message received from kafka and send out a transfer post callback should throw', async test => {
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

      const urlPayee = await Participant.getEndpoint(msg.value.to, ENUM.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_TRANSFER_PUT, msg.value.content.payload.transferId)
      const urlPayer = await Participant.getEndpoint(msg.value.from, ENUM.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_TRANSFER_PUT, msg.value.content.payload.transferId)
      const method = ENUM.Http.RestMethods.PUT
      const payeeHeaders = createCallbackHeaders({ dfspId: msg.value.to, transferId: msg.value.content.payload.transferId, headers: msg.value.content.headers, httpMethod: method, endpointTemplate: ENUM.EndPoints.FspEndpointTemplates.TRANSFERS_PUT })
      const payerHeaders = createCallbackHeaders({ dfspId: msg.value.from, transferId: msg.value.content.payload.transferId, headers: msg.value.content.headers, httpMethod: method, endpointTemplate: ENUM.EndPoints.FspEndpointTemplates.TRANSFERS_PUT }, true)
      const message = { transferId: uuid }
      try {
        Callback.sendRequest.withArgs(urlPayee, payeeHeaders, msg.value.from, msg.value.to, method, JSON.stringify(message)).returns(Promise.resolve(200))
        Callback.sendRequest.withArgs(urlPayer, payerHeaders, ENUM.Http.Headers.FSPIOP.SWITCH.value, msg.value.from, method, JSON.stringify(message)).returns(Promise.reject(new Error()))
        await Notification.processMessage(msg)
        test.fail('should throw')
        test.end()
      } catch (e) {
        test.ok(e, 'error thrown')
        test.end()
      }
    })

    processMessageTest.test('process the message received from kafka and send out a transfer post callback should throw', async test => {
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

      const urlPayee = await Participant.getEndpoint(msg.value.to, ENUM.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_TRANSFER_PUT, msg.value.content.payload.transferId)
      const urlPayer = await Participant.getEndpoint(msg.value.from, ENUM.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_TRANSFER_PUT, msg.value.content.payload.transferId)
      const method = ENUM.Http.RestMethods.PUT
      const payeeHeaders = createCallbackHeaders({ dfspId: msg.value.to, transferId: msg.value.content.payload.transferId, headers: msg.value.content.headers, httpMethod: method, endpointTemplate: ENUM.EndPoints.FspEndpointTemplates.TRANSFERS_PUT })
      const payerHeaders = createCallbackHeaders({ dfspId: msg.value.from, transferId: msg.value.content.payload.transferId, headers: msg.value.content.headers, httpMethod: method, endpointTemplate: ENUM.EndPoints.FspEndpointTemplates.TRANSFERS_PUT }, true)
      const message = { transferId: uuid }
      try {
        Callback.sendRequest.withArgs(urlPayee, payeeHeaders, msg.value.from, msg.value.to, method, JSON.stringify(message)).returns(Promise.reject(new Error()))
        Callback.sendRequest.withArgs(urlPayer, payerHeaders, ENUM.Http.Headers.FSPIOP.SWITCH.value, msg.value.from, method, JSON.stringify(message)).returns(Promise.resolve(200))
        await Notification.processMessage(msg)
        test.fail('should throw')
        test.end()
      } catch (e) {
        test.ok(e, 'error thrown')
        test.end()
      }
    })

    processMessageTest.test('process the message received from kafka and send out a transfer post callback and base64 encode the payload', async test => {
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
      const url = await Participant.getEndpoint(msg.value.to, ENUM.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_TRANSFER_POST, msg.value.content.payload.transferId)
      const headers = createCallbackHeaders({ headers: msg.value.content.headers, httpMethod: ENUM.Http.RestMethods.POST, endpointTemplate: ENUM.EndPoints.FspEndpointTemplates.TRANSFERS_POST })

      const expected = true

      Callback.sendRequest.withArgs(url, headers, msg.value.from, msg.value.to, method, JSON.stringify(message)).returns(Promise.resolve(200))
      const result = await Notification.processMessage(msg)
      test.ok(Callback.sendRequest.calledWith(url, headers, msg.value.from, msg.value.to, method, JSON.stringify(message)))
      test.equal(result, expected)
      test.end()
    })

    await processMessageTest.test('process the message received from kafka and send out a transfer error notification to the sender', async test => {
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
      const url = await Participant.getEndpoint(msg.value.to, ENUM.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_TRANSFER_ERROR, msg.value.content.payload.transferId)
      const headers = createCallbackHeaders({ dfspId: msg.value.to, transferId: msg.value.content.payload.transferId, headers: msg.value.content.headers, httpMethod: method, endpointTemplate: ENUM.EndPoints.FspEndpointTemplates.TRANSFERS_PUT_ERROR }, true)
      const message = { transferId: uuid }

      const expected = true

      Callback.sendRequest.withArgs(url, headers, msg.value.from, msg.value.to, method, JSON.stringify(message)).returns(Promise.resolve(200))

      const result = await Notification.processMessage(msg)
      test.ok(Callback.sendRequest.calledWith(url, headers, msg.value.from, msg.value.to, method, JSON.stringify(message)))
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
      const url = await Participant.getEndpoint(msg.value.to, ENUM.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_TRANSFER_POST, msg.value.content.payload.transferId)
      const headers = createCallbackHeaders({ headers: msg.value.content.headers, httpMethod: method, endpointTemplate: ENUM.EndPoints.FspEndpointTemplates.TRANSFERS_POST })
      const message = { transferId: uuid }

      Callback.sendRequest.withArgs(url, headers, msg.value.from, msg.value.to, method, JSON.stringify(message)).throws(new Error())

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
      const url = await Participant.getEndpoint(msg.value.to, ENUM.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_TRANSFER_ERROR, msg.value.content.payload.transferId)
      const headers = createCallbackHeaders({ dfspId: msg.value.to, transferId: msg.value.content.payload.transferId, headers: msg.value.content.headers, httpMethod: method, endpointTemplate: ENUM.EndPoints.FspEndpointTemplates.TRANSFERS_PUT_ERROR }, true)
      const message = { transferId: uuid }

      Callback.sendRequest.withArgs(url, headers, msg.value.from, msg.value.to, method, JSON.stringify(message)).throws(new Error())

      try {
        await Notification.processMessage(msg)
        test.fail('Was expecting an error when receiving trying to send an error notification to sender')
        test.end()
      } catch (e) {
        test.ok(e instanceof Error)
        test.end()
      }
    })

    await processMessageTest.test('process the message received from kafka and send out a transfer post callback', async test => {
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

      const urlPayee = await Participant.getEndpoint(msg.value.to, ENUM.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_TRANSFER_PUT, msg.value.content.payload.transferId)
      const urlPayer = await Participant.getEndpoint(msg.value.from, ENUM.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_TRANSFER_PUT, msg.value.content.payload.transferId)
      const method = ENUM.Http.RestMethods.PUT
      const payeeHeaders = createCallbackHeaders({ dfspId: msg.value.to, transferId: msg.value.content.payload.transferId, headers: msg.value.content.headers, httpMethod: method, endpointTemplate: ENUM.EndPoints.FspEndpointTemplates.TRANSFERS_PUT })
      const payerHeaders = createCallbackHeaders({ dfspId: msg.value.from, transferId: msg.value.content.payload.transferId, headers: msg.value.content.headers, httpMethod: method, endpointTemplate: ENUM.EndPoints.FspEndpointTemplates.TRANSFERS_PUT }, true)
      const message = { transferId: uuid }

      const expected = 200

      Callback.sendRequest.withArgs(urlPayee, payeeHeaders, msg.value.from, msg.value.to, method, JSON.stringify(message)).returns(Promise.resolve(200))
      Callback.sendRequest.withArgs(urlPayer, payerHeaders, ENUM.Http.Headers.FSPIOP.SWITCH.value, msg.value.from, method, JSON.stringify(message)).returns(Promise.resolve(200))

      const result = await Notification.processMessage(msg)
      test.ok(Callback.sendRequest.calledWith(urlPayee, payeeHeaders, msg.value.from, msg.value.to, method, JSON.stringify(message)))
      test.ok(Callback.sendRequest.calledWith(urlPayer, payerHeaders, ENUM.Http.Headers.FSPIOP.SWITCH.value, msg.value.from, method, JSON.stringify(message)))
      test.equal(result, expected)
      test.end()
    })
    await processMessageTest.test('process the message received from kafka and send out a transfer post callback should throw', async test => {
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

      const urlPayee = await Participant.getEndpoint(msg.value.to, ENUM.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_TRANSFER_PUT, msg.value.content.payload.transferId)
      const urlPayer = await Participant.getEndpoint(msg.value.from, ENUM.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_TRANSFER_PUT, msg.value.content.payload.transferId)
      const method = ENUM.Http.RestMethods.PUT
      const payeeHeaders = createCallbackHeaders({ dfspId: msg.value.to, transferId: msg.value.content.payload.transferId, headers: msg.value.content.headers, httpMethod: method, endpointTemplate: ENUM.EndPoints.FspEndpointTemplates.TRANSFERS_PUT })
      const payerHeaders = createCallbackHeaders({ dfspId: msg.value.from, transferId: msg.value.content.payload.transferId, headers: msg.value.content.headers, httpMethod: method, endpointTemplate: ENUM.EndPoints.FspEndpointTemplates.TRANSFERS_PUT }, true)
      const message = { transferId: uuid }
      try {
        Callback.sendRequest.withArgs(urlPayee, payeeHeaders, msg.value.from, msg.value.to, method, JSON.stringify(message)).returns(Promise.resolve(200))
        Callback.sendRequest.withArgs(urlPayer, payerHeaders, ENUM.Http.Headers.FSPIOP.SWITCH.value, msg.value.from, method, JSON.stringify(message)).returns(Promise.reject(new Error()))
        await Notification.processMessage(msg)
        test.fail('should throw')
        test.end()
      } catch (e) {
        test.ok(e, 'error thrown')
        test.end()
      }
    })

    await processMessageTest.test('process the message received from kafka and send out a transfer post callback should throw', async test => {
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

      const urlPayee = await Participant.getEndpoint(msg.value.to, ENUM.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_TRANSFER_PUT, msg.value.content.payload.transferId)
      const urlPayer = await Participant.getEndpoint(msg.value.from, ENUM.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_TRANSFER_PUT, msg.value.content.payload.transferId)
      const method = ENUM.Http.RestMethods.PUT
      const payeeHeaders = createCallbackHeaders({ dfspId: msg.value.to, transferId: msg.value.content.payload.transferId, headers: msg.value.content.headers, httpMethod: method, endpointTemplate: ENUM.EndPoints.FspEndpointTemplates.TRANSFERS_PUT })
      const payerHeaders = createCallbackHeaders({ dfspId: msg.value.from, transferId: msg.value.content.payload.transferId, headers: msg.value.content.headers, httpMethod: method, endpointTemplate: ENUM.EndPoints.FspEndpointTemplates.TRANSFERS_PUT }, true)
      const message = { transferId: uuid }
      try {
        Callback.sendRequest.withArgs(urlPayee, payeeHeaders, msg.value.from, msg.value.to, method, JSON.stringify(message)).returns(Promise.reject(new Error()))
        Callback.sendRequest.withArgs(urlPayer, payerHeaders, ENUM.Http.Headers.FSPIOP.SWITCH.value, msg.value.from, method, JSON.stringify(message)).returns(Promise.resolve(200))
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
      const url = await Participant.getEndpoint(msg.value.to, ENUM.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_TRANSFER_ERROR, msg.value.content.payload.transferId)
      const headers = createCallbackHeaders({ dfspId: msg.value.to, transferId: msg.value.content.payload.transferId, headers: msg.value.content.headers, httpMethod: method, endpointTemplate: ENUM.EndPoints.FspEndpointTemplates.TRANSFERS_PUT_ERROR }, true)
      const message = { transferId: uuid }

      Callback.sendRequest.withArgs(url, headers, msg.value.from, msg.value.to, method, JSON.stringify(message)).throws(new Error())

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
      const url = await Participant.getEndpoint(msg.value.to, ENUM.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_TRANSFER_ERROR, msg.value.content.payload.transferId)
      const headers = createCallbackHeaders({ dfspId: msg.value.to, transferId: msg.value.content.payload.transferId, headers: msg.value.content.headers, httpMethod: method, endpointTemplate: ENUM.EndPoints.FspEndpointTemplates.TRANSFERS_PUT_ERROR }, true)
      const message = { transferId: uuid }

      Callback.sendRequest.withArgs(url, headers, msg.value.from, msg.value.to, method, JSON.stringify(message)).returns(Promise.resolve(true))

      try {
        await Notification.processMessage(msg)
        test.ok(await Callback.sendRequest(url, headers, msg.value.from, msg.value.to, method, JSON.stringify(message)))
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
      const urlPayee = await Participant.getEndpoint(msg.value.to, ENUM.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_TRANSFER_PUT, msg.value.content.payload.transferId)
      const headers = createCallbackHeaders({ dfspId: msg.value.to, transferId: msg.value.content.payload.transferId, headers: msg.value.content.headers, httpMethod: method, endpointTemplate: ENUM.EndPoints.FspEndpointTemplates.TRANSFERS_PUT })
      const message = { transferId: uuid }

      Callback.sendRequest.withArgs(urlPayee, headers, ENUM.Http.Headers.FSPIOP.SWITCH.value, msg.value.from, method, JSON.stringify(message)).returns(Promise.resolve(200))

      // test for "commit" action and "success" status
      await NotificationProxy.processMessage(msg)
      test.notok(Callback.sendRequest.calledWith(urlPayee, headers, ENUM.Http.Headers.FSPIOP.SWITCH.value, msg.value.from, method, JSON.stringify(message)))

      // test for "reject" action
      msg.value.metadata.event.action = 'reject'
      await NotificationProxy.processMessage(msg)
      test.notok(Callback.sendRequest.calledWith(urlPayee, headers, ENUM.Http.Headers.FSPIOP.SWITCH.value, msg.value.from, method, JSON.stringify(message)))

      // test for "abort" action
      msg.value.metadata.event.action = 'abort'
      await NotificationProxy.processMessage(msg)
      test.notok(Callback.sendRequest.calledWith(urlPayee, headers, ENUM.Http.Headers.FSPIOP.SWITCH.value, msg.value.from, method, JSON.stringify(message)))

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

      const fromUrl = await Participant.getEndpoint(msg.value.from, ENUM.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_TRANSFER_PUT, msg.value.content.payload.transferId)
      const toUrl = await Participant.getEndpoint(msg.value.to, ENUM.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_TRANSFER_PUT, msg.value.content.payload.transferId)
      const method = ENUM.Http.RestMethods.PUT
      const toHeaders = createCallbackHeaders({ dfspId: msg.value.to, transferId: msg.value.content.payload.transferId, headers: msg.value.content.headers, httpMethod: method, endpointTemplate: ENUM.EndPoints.FspEndpointTemplates.TRANSFERS_PUT })
      const fromHeaders = createCallbackHeaders({ dfspId: msg.value.from, transferId: msg.value.content.payload.transferId, headers: msg.value.content.headers, httpMethod: method, endpointTemplate: ENUM.EndPoints.FspEndpointTemplates.TRANSFERS_PUT }, true)
      const message = { transferId: uuid }

      const expected = 200

      Callback.sendRequest.withArgs(toUrl, toHeaders, msg.value.from, msg.value.to, method, JSON.stringify(message)).returns(Promise.resolve(200))
      Callback.sendRequest.withArgs(fromUrl, fromHeaders, ENUM.Http.Headers.FSPIOP.SWITCH.value, msg.value.from, method, JSON.stringify(message)).returns(Promise.resolve(200))

      const result = await Notification.processMessage(msg)
      test.ok(Callback.sendRequest.calledWith(toUrl, toHeaders, msg.value.from, msg.value.to, method, JSON.stringify(message)))
      test.ok(Callback.sendRequest.calledWith(fromUrl, fromHeaders, ENUM.Http.Headers.FSPIOP.SWITCH.value, msg.value.from, method, JSON.stringify(message)))
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
      const fromUrl = await Participant.getEndpoint(msg.value.from, ENUM.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_TRANSFER_ERROR, msg.value.content.payload.transferId)
      const toUrl = await Participant.getEndpoint(msg.value.to, ENUM.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_TRANSFER_ERROR, msg.value.content.payload.transferId)
      const method = ENUM.Http.RestMethods.PUT
      const toHeaders = createCallbackHeaders({ dfspId: msg.value.to, transferId: msg.value.content.payload.transferId, headers: msg.value.content.headers, httpMethod: method, endpointTemplate: ENUM.EndPoints.FspEndpointTemplates.TRANSFERS_PUT_ERROR })
      const fromHeaders = createCallbackHeaders({ dfspId: msg.value.from, transferId: msg.value.content.payload.transferId, headers: msg.value.content.headers, httpMethod: method, endpointTemplate: ENUM.EndPoints.FspEndpointTemplates.TRANSFERS_PUT_ERROR }, true)
      const message = { transferId: uuid }

      const expected = 200

      Callback.sendRequest.withArgs(fromUrl, fromHeaders, ENUM.Http.Headers.FSPIOP.SWITCH.value, msg.value.from, method, JSON.stringify(message)).returns(Promise.resolve(200))
      Callback.sendRequest.withArgs(toUrl, toHeaders, msg.value.from, msg.value.to, method, JSON.stringify(message)).returns(Promise.resolve(200))

      const result = await Notification.processMessage(msg)
      test.ok(Callback.sendRequest.calledWith(toUrl, toHeaders, msg.value.from, msg.value.to, method, JSON.stringify(message)))
      test.ok(Callback.sendRequest.calledWith(fromUrl, fromHeaders, ENUM.Http.Headers.FSPIOP.SWITCH.value, msg.value.from, method, JSON.stringify(message)))
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
      const toUrl = await Participant.getEndpoint(msg.value.to, ENUM.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_TRANSFER_PUT, msg.value.content.payload.transferId)
      const method = ENUM.Http.RestMethods.PUT
      const headers = createCallbackHeaders({ dfspId: msg.value.to, transferId: msg.value.content.payload.transferId, headers: msg.value.content.headers, httpMethod: method, endpointTemplate: ENUM.EndPoints.FspEndpointTemplates.TRANSFERS_PUT })
      const message = { transferId: uuid }

      const expected = true

      Callback.sendRequest.withArgs(toUrl, headers, msg.value.from, msg.value.to, method, JSON.stringify(message)).returns(Promise.resolve(200))

      const result = await Notification.processMessage(msg)
      test.ok(Callback.sendRequest.calledWith(toUrl, headers, msg.value.from, msg.value.to, method, JSON.stringify(message)))
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
      const toUrl = await Participant.getEndpoint(msg.value.to, ENUM.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_TRANSFER_ERROR, msg.value.content.payload.transferId)
      const toHeaders = createCallbackHeaders({ dfspId: msg.value.to, transferId: msg.value.content.payload.transferId, headers: msg.value.content.headers, httpMethod: method, endpointTemplate: ENUM.EndPoints.FspEndpointTemplates.TRANSFERS_PUT_ERROR }, true)
      const message = { transferId: uuid }

      const expected = true

      Callback.sendRequest.withArgs(toUrl, toHeaders, msg.value.from, msg.value.to, method, JSON.stringify(message)).returns(Promise.resolve(200))

      const result = await Notification.processMessage(msg)
      test.ok(Callback.sendRequest.calledWith(toUrl, toHeaders, msg.value.from, msg.value.to, method, JSON.stringify(message)))
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
      const toUrl = await Participant.getEndpoint(msg.value.to, ENUM.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_TRANSFER_PUT, msg.value.content.payload.transferId)
      const toHeaders = createCallbackHeaders({ dfspId: msg.value.to, transferId: msg.value.content.payload.transferId, headers: msg.value.content.headers, httpMethod: method, endpointTemplate: ENUM.EndPoints.FspEndpointTemplates.TRANSFERS_PUT })
      const message = { transferId: uuid }

      const expected = true

      Callback.sendRequest.withArgs(toUrl, toHeaders, msg.value.from, msg.value.to, method, JSON.stringify(message)).returns(Promise.resolve(200))

      const result = await Notification.processMessage(msg)
      test.ok(Callback.sendRequest.calledWith(toUrl, toHeaders, msg.value.from, msg.value.to, method, JSON.stringify(message)))
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
      const toUrl = await Participant.getEndpoint(msg.value.to, ENUM.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_TRANSFER_ERROR, msg.value.content.payload.transferId)
      const toHeaders = createCallbackHeaders({ dfspId: msg.value.to, transferId: msg.value.content.payload.transferId, headers: msg.value.content.headers, httpMethod: method, endpointTemplate: ENUM.EndPoints.FspEndpointTemplates.TRANSFERS_PUT_ERROR }, true)
      const message = { transferId: uuid }

      const expected = true

      Callback.sendRequest.withArgs(toUrl, toHeaders, msg.value.from, msg.value.to, method, JSON.stringify(message)).returns(Promise.resolve(200))

      const result = await Notification.processMessage(msg)
      test.ok(Callback.sendRequest.calledWith(toUrl, toHeaders, msg.value.from, msg.value.to, method, JSON.stringify(message)))
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
      const toUrl = await Participant.getEndpoint(msg.value.to, ENUM.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_TRANSFER_ERROR, msg.value.content.payload.transferId)
      const fromHeaders = createCallbackHeaders({ dfspId: msg.value.to, transferId: msg.value.content.payload.transferId, headers: msg.value.content.headers, httpMethod: method, endpointTemplate: ENUM.EndPoints.FspEndpointTemplates.TRANSFERS_PUT_ERROR })
      const message = { transferId: uuid }

      const expected = true

      Callback.sendRequest.withArgs(toUrl, fromHeaders, msg.value.from, msg.value.to, method, JSON.stringify(message)).returns(Promise.resolve(200))

      const result = await Notification.processMessage(msg)
      test.ok(Callback.sendRequest.calledWith(toUrl, fromHeaders, msg.value.from, msg.value.to, method, JSON.stringify(message)))
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
      const toUrl = await Participant.getEndpoint(msg.value.to, ENUM.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_TRANSFER_PUT, msg.value.content.payload.transferId)
      const toHeaders = createCallbackHeaders({ dfspId: msg.value.to, transferId: msg.value.content.payload.transferId, headers: msg.value.content.headers, httpMethod: method, endpointTemplate: ENUM.EndPoints.FspEndpointTemplates.TRANSFERS_PUT }, true)
      const message = { transferId: uuid }

      const expected = true

      Callback.sendRequest.withArgs(toUrl, toHeaders, msg.value.from, msg.value.to, method, JSON.stringify(message)).returns(Promise.resolve(200))

      const result = await Notification.processMessage(msg)
      test.ok(Callback.sendRequest.calledWith(toUrl, toHeaders, msg.value.from, msg.value.to, method, JSON.stringify(message)))
      test.equal(result, expected)
      test.end()
    })

    await processMessageTest.test('process the prepare-duplicate message received from kafka and send out a transfer put callback - JWS sign', async test => {
      const ConfigStub = Util.clone(Config)
      ConfigStub.JWS_SIGN = true
      ConfigStub.JWS_SIGNING_KEY = 'some jws key'
      const NotificationProxy = Proxyquire(`${src}/handlers/notification`, {
        '../../lib/config': ConfigStub
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
          from: 'switch',
          id: 'b51ec534-ee48-4575-b6a9-ead2955b8098'
        }
      }
      const method = ENUM.Http.RestMethods.PUT
      const toUrl = await Participant.getEndpoint(msg.value.to, ENUM.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_TRANSFER_PUT, msg.value.content.payload.transferId)
      const toHeaders = createCallbackHeaders({ dfspId: msg.value.to, transferId: msg.value.content.payload.transferId, headers: msg.value.content.headers, httpMethod: method, endpointTemplate: ENUM.EndPoints.FspEndpointTemplates.TRANSFERS_PUT }, true)
      const message = { transferId: uuid }

      const expected = true

      const logger = Logger
      logger.log = logger.info

      const jwsSigner = new JwsSigner({
        logger,
        signingKey: ConfigStub.JWS_SIGNING_KEY
      })

      Callback.sendRequest.withArgs(toUrl, toHeaders, msg.value.from, msg.value.to, method, JSON.stringify(message), ENUM.Http.ResponseTypes.JSON, undefined, jwsSigner).returns(Promise.resolve(200))
      const result = await NotificationProxy.processMessage(msg)
      test.ok(Callback.sendRequest.calledWith(toUrl, toHeaders, msg.value.from, msg.value.to, method, JSON.stringify(message), ENUM.Http.ResponseTypes.JSON, undefined, jwsSigner))
      test.deepEqual(Callback.sendRequest.args[0][8], jwsSigner, 'JwsSigner is same')

      test.equal(result, expected)
      test.end()
    })

    await processMessageTest.test('process the message received from kafka and send out a transfer error notification to the sender - JWS Sign', async test => {
      const ConfigStub = Util.clone(Config)
      ConfigStub.JWS_SIGN = true
      ConfigStub.JWS_SIGNING_KEY = 'some jws key'
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
          from: 'switch',
          id: 'b51ec534-ee48-4575-b6a9-ead2955b8098'
        }
      }
      const method = ENUM.Http.RestMethods.PUT
      const url = await Participant.getEndpoint(msg.value.to, ENUM.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_TRANSFER_ERROR, msg.value.content.payload.transferId)
      const headers = createCallbackHeaders({ dfspId: msg.value.to, transferId: msg.value.content.payload.transferId, headers: msg.value.content.headers, httpMethod: method, endpointTemplate: ENUM.EndPoints.FspEndpointTemplates.TRANSFERS_PUT_ERROR }, true)
      const message = { transferId: uuid }

      const expected = true
      const logger = Logger
      logger.log = logger.info

      const jwsSigner = new JwsSigner({
        logger,
        signingKey: ConfigStub.JWS_SIGNING_KEY
      })

      Callback.sendRequest.withArgs(url, headers, msg.value.from, msg.value.to, method, JSON.stringify(message), ENUM.Http.ResponseTypes.JSON, undefined, jwsSigner).returns(Promise.resolve(200))
      const result = await NotificationProxy.processMessage(msg)
      test.ok(Callback.sendRequest.calledWith(url, headers, msg.value.from, msg.value.to, method, JSON.stringify(message), ENUM.Http.ResponseTypes.JSON, undefined, jwsSigner))
      test.deepEqual(Callback.sendRequest.args[0][8], jwsSigner, 'JwsSigner is same')
      test.equal(result, expected)
      test.end()
    })

    await processMessageTest.test('process the message received from kafka and send out a transfer post callback - JWS Sign', async test => {
      const ConfigStub = Util.clone(Config)
      ConfigStub.JWS_SIGN = true
      ConfigStub.JWS_SIGNING_KEY = 'some jws key'
      ConfigStub.SEND_TRANSFER_CONFIRMATION_TO_PAYEE = true
      const NotificationProxy = Proxyquire(`${src}/handlers/notification`, {
        '../../lib/config': ConfigStub
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

      const urlPayee = await Participant.getEndpoint(msg.value.to, ENUM.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_TRANSFER_PUT, msg.value.content.payload.transferId)
      const urlPayer = await Participant.getEndpoint(msg.value.from, ENUM.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_TRANSFER_PUT, msg.value.content.payload.transferId)
      const method = ENUM.Http.RestMethods.PUT
      const payeeHeaders = createCallbackHeaders({ dfspId: msg.value.to, transferId: msg.value.content.payload.transferId, headers: msg.value.content.headers, httpMethod: method, endpointTemplate: ENUM.EndPoints.FspEndpointTemplates.TRANSFERS_PUT })
      const payerHeaders = createCallbackHeaders({ dfspId: msg.value.from, transferId: msg.value.content.payload.transferId, headers: msg.value.content.headers, httpMethod: method, endpointTemplate: ENUM.EndPoints.FspEndpointTemplates.TRANSFERS_PUT }, true)
      const message = { transferId: uuid }

      const expected = 200
      const logger = Logger
      logger.log = logger.info

      const jwsSigner = new JwsSigner({
        logger,
        signingKey: ConfigStub.JWS_SIGNING_KEY
      })

      Callback.sendRequest.withArgs(urlPayee, payeeHeaders, msg.value.from, msg.value.to, method, JSON.stringify(message)).returns(Promise.resolve(200))
      Callback.sendRequest.withArgs(urlPayer, payerHeaders, ENUM.Http.Headers.FSPIOP.SWITCH.value, msg.value.from, method, JSON.stringify(message), ENUM.Http.ResponseTypes.JSON, undefined, jwsSigner).returns(Promise.resolve(200))

      const result = await NotificationProxy.processMessage(msg)
      test.ok(Callback.sendRequest.calledWith(urlPayee, payeeHeaders, msg.value.from, msg.value.to, method, JSON.stringify(message)))
      test.ok(Callback.sendRequest.calledWith(urlPayer, payerHeaders, ENUM.Http.Headers.FSPIOP.SWITCH.value, msg.value.from, method, JSON.stringify(message), ENUM.Http.ResponseTypes.JSON, undefined, jwsSigner))
      test.equal(result, expected)
      test.end()
    })

    await processMessageTest.test('process the reject message received from kafka and send out a transfer put callback - JWS Sign', async test => {
      const ConfigStub = Util.clone(Config)
      ConfigStub.JWS_SIGN = true
      ConfigStub.JWS_SIGNING_KEY = 'some jws key'
      const NotificationProxy = Proxyquire(`${src}/handlers/notification`, {
        '../../lib/config': ConfigStub
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

      const fromUrl = await Participant.getEndpoint(msg.value.from, ENUM.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_TRANSFER_PUT, msg.value.content.payload.transferId)
      const toUrl = await Participant.getEndpoint(msg.value.to, ENUM.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_TRANSFER_PUT, msg.value.content.payload.transferId)
      const method = ENUM.Http.RestMethods.PUT
      const toHeaders = createCallbackHeaders({ dfspId: msg.value.to, transferId: msg.value.content.payload.transferId, headers: msg.value.content.headers, httpMethod: method, endpointTemplate: ENUM.EndPoints.FspEndpointTemplates.TRANSFERS_PUT })
      const fromHeaders = createCallbackHeaders({ dfspId: msg.value.from, transferId: msg.value.content.payload.transferId, headers: msg.value.content.headers, httpMethod: method, endpointTemplate: ENUM.EndPoints.FspEndpointTemplates.TRANSFERS_PUT }, true)
      const message = { transferId: uuid }

      const expected = 200
      const logger = Logger
      logger.log = logger.info

      const jwsSigner = new JwsSigner({
        logger,
        signingKey: ConfigStub.JWS_SIGNING_KEY
      })

      Callback.sendRequest.withArgs(toUrl, toHeaders, msg.value.from, msg.value.to, method, JSON.stringify(message)).returns(Promise.resolve(200))
      Callback.sendRequest.withArgs(fromUrl, fromHeaders, ENUM.Http.Headers.FSPIOP.SWITCH.value, msg.value.from, method, JSON.stringify(message), ENUM.Http.ResponseTypes.JSON, undefined, jwsSigner).returns(Promise.resolve(200))

      const result = await NotificationProxy.processMessage(msg)
      test.ok(Callback.sendRequest.calledWith(toUrl, toHeaders, msg.value.from, msg.value.to, method, JSON.stringify(message)))
      test.ok(Callback.sendRequest.calledWith(fromUrl, fromHeaders, ENUM.Http.Headers.FSPIOP.SWITCH.value, msg.value.from, method, JSON.stringify(message), ENUM.Http.ResponseTypes.JSON, undefined, jwsSigner))
      test.equal(result, expected)
      test.end()
    })

    await processMessageTest.test('process the abort message received from kafka and send out a transfer put callback', async test => {
      const ConfigStub = Util.clone(Config)
      ConfigStub.JWS_SIGN = true
      ConfigStub.JWS_SIGNING_KEY = 'some jws key'
      const NotificationProxy = Proxyquire(`${src}/handlers/notification`, {
        '../../lib/config': ConfigStub
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
      const fromUrl = await Participant.getEndpoint(msg.value.from, ENUM.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_TRANSFER_ERROR, msg.value.content.payload.transferId)
      const toUrl = await Participant.getEndpoint(msg.value.to, ENUM.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_TRANSFER_ERROR, msg.value.content.payload.transferId)
      const method = ENUM.Http.RestMethods.PUT
      const toHeaders = createCallbackHeaders({ dfspId: msg.value.to, transferId: msg.value.content.payload.transferId, headers: msg.value.content.headers, httpMethod: method, endpointTemplate: ENUM.EndPoints.FspEndpointTemplates.TRANSFERS_PUT_ERROR })
      const fromHeaders = createCallbackHeaders({ dfspId: msg.value.from, transferId: msg.value.content.payload.transferId, headers: msg.value.content.headers, httpMethod: method, endpointTemplate: ENUM.EndPoints.FspEndpointTemplates.TRANSFERS_PUT_ERROR }, true)
      const message = { transferId: uuid }

      const expected = 200
      const logger = Logger
      logger.log = logger.info

      const jwsSigner = new JwsSigner({
        logger,
        signingKey: ConfigStub.JWS_SIGNING_KEY
      })

      Callback.sendRequest.withArgs(fromUrl, fromHeaders, ENUM.Http.Headers.FSPIOP.SWITCH.value, msg.value.from, method, JSON.stringify(message), ENUM.Http.ResponseTypes.JSON, undefined, jwsSigner).returns(Promise.resolve(200))
      Callback.sendRequest.withArgs(toUrl, toHeaders, msg.value.from, msg.value.to, method, JSON.stringify(message)).returns(Promise.resolve(200))

      const result = await NotificationProxy.processMessage(msg)
      test.ok(Callback.sendRequest.calledWith(toUrl, toHeaders, msg.value.from, msg.value.to, method, JSON.stringify(message)))
      test.ok(Callback.sendRequest.calledWith(fromUrl, fromHeaders, ENUM.Http.Headers.FSPIOP.SWITCH.value, msg.value.from, method, JSON.stringify(message), ENUM.Http.ResponseTypes.JSON, undefined, jwsSigner))
      test.equal(result, expected)
      test.end()
    })

    await processMessageTest.test('process the fulfil-duplicate message received from kafka and send out a transfer error callback - JWS Sign', async test => {
      const ConfigStub = Util.clone(Config)
      ConfigStub.JWS_SIGN = true
      ConfigStub.JWS_SIGNING_KEY = 'some jws key'
      const NotificationProxy = Proxyquire(`${src}/handlers/notification`, {
        '../../lib/config': ConfigStub
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
          from: 'switch',
          id: 'b51ec534-ee48-4575-b6a9-ead2955b8098'
        }
      }
      const method = ENUM.Http.RestMethods.PUT
      const toUrl = await Participant.getEndpoint(msg.value.to, ENUM.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_TRANSFER_ERROR, msg.value.content.payload.transferId)
      const toHeaders = createCallbackHeaders({ dfspId: msg.value.to, transferId: msg.value.content.payload.transferId, headers: msg.value.content.headers, httpMethod: method, endpointTemplate: ENUM.EndPoints.FspEndpointTemplates.TRANSFERS_PUT_ERROR }, true)
      const message = { transferId: uuid }

      const expected = true
      const logger = Logger
      logger.log = logger.info

      const jwsSigner = new JwsSigner({
        logger,
        signingKey: ConfigStub.JWS_SIGNING_KEY
      })

      Callback.sendRequest.withArgs(toUrl, toHeaders, msg.value.from, msg.value.to, method, JSON.stringify(message), ENUM.Http.ResponseTypes.JSON, undefined, jwsSigner).returns(Promise.resolve(200))

      const result = await NotificationProxy.processMessage(msg)
      test.ok(Callback.sendRequest.calledWith(toUrl, toHeaders, msg.value.from, msg.value.to, method, JSON.stringify(message), ENUM.Http.ResponseTypes.JSON, undefined, jwsSigner))
      test.equal(result, expected)
      test.end()
    })

    await processMessageTest.test('process the abort-duplicate message received from kafka and send out a transfer error callback - JWS Sign', async test => {
      const ConfigStub = Util.clone(Config)
      ConfigStub.JWS_SIGN = true
      ConfigStub.JWS_SIGNING_KEY = 'some jws key'
      const NotificationProxy = Proxyquire(`${src}/handlers/notification`, {
        '../../lib/config': ConfigStub
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
          from: 'switch',
          id: 'b51ec534-ee48-4575-b6a9-ead2955b8098'
        }
      }
      const method = ENUM.Http.RestMethods.PUT
      const toUrl = await Participant.getEndpoint(msg.value.to, ENUM.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_TRANSFER_ERROR, msg.value.content.payload.transferId)
      const toHeaders = createCallbackHeaders({ dfspId: msg.value.to, transferId: msg.value.content.payload.transferId, headers: msg.value.content.headers, httpMethod: method, endpointTemplate: ENUM.EndPoints.FspEndpointTemplates.TRANSFERS_PUT_ERROR }, true)
      const message = { transferId: uuid }

      const expected = true
      const logger = Logger
      logger.log = logger.info

      const jwsSigner = new JwsSigner({
        logger,
        signingKey: ConfigStub.JWS_SIGNING_KEY
      })

      Callback.sendRequest.withArgs(toUrl, toHeaders, msg.value.from, msg.value.to, method, JSON.stringify(message), ENUM.Http.ResponseTypes.JSON, undefined, jwsSigner).returns(Promise.resolve(200))

      const result = await NotificationProxy.processMessage(msg)
      test.ok(Callback.sendRequest.calledWith(toUrl, toHeaders, msg.value.from, msg.value.to, method, JSON.stringify(message), ENUM.Http.ResponseTypes.JSON, undefined, jwsSigner))
      test.equal(result, expected)
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
    await isConnectedTest.test('reject with an error if getMetadata fails', async test => {
      // Arrange
      const NotificationProxy = rewire(`${src}/handlers/notification`)
      NotificationProxy.__set__('notificationConsumer', {
        // Callback with error
        getMetadata: (options, cb) => {
          const error = new Error('test err message')
          cb(error, null)
        }
      })

      // Act
      try {
        await NotificationProxy.isConnected()
        test.fail('Error not thrown!')
      } catch (err) {
        // Assert
        test.equal(err.message, 'Error connecting to consumer: Error: test err message', 'Error message does not match')
        test.pass('Error successfully thrown')
      }
      test.end()
    })

    await isConnectedTest.test('reject with an error if client.getMetadata passes, but metadata is mising topic', async test => {
      // Arrange
      const topicConf = KafkaUtil.createGeneralTopicConf(Config.KAFKA_CONFIG.TOPIC_TEMPLATES.GENERAL_TOPIC_TEMPLATE.TEMPLATE, ENUM.Events.Event.Type.NOTIFICATION, ENUM.Events.Event.Action.EVENT)
      const topicName = topicConf.topicName
      const NotificationProxy = rewire(`${src}/handlers/notification`)
      const metadata = {
        orig_broker_id: 0,
        orig_broker_name: 'kafka:9092/0',
        topics: [],
        brokers: [{ id: 0, host: 'kafka', port: 9092 }]
      }
      NotificationProxy.__set__('notificationConsumer', {
        // Successful callback
        getMetadata: (options, cb) => cb(null, metadata)
      })

      // Act
      try {
        await NotificationProxy.isConnected()
        test.fail('Error not thrown!')
      } catch (err) {
        // Assert
        test.equal(err.message, `Connected to consumer, but ${topicName} not found.`, 'Error message does not match')
        test.pass('Error successfully thrown')
      }
      test.end()
    })

    await isConnectedTest.test('pass if the topic can be found', async test => {
      // Arrange
      const topicConf = KafkaUtil.createGeneralTopicConf(Config.KAFKA_CONFIG.TOPIC_TEMPLATES.GENERAL_TOPIC_TEMPLATE.TEMPLATE, ENUM.Events.Event.Type.NOTIFICATION, ENUM.Events.Event.Action.EVENT)
      const topicName = topicConf.topicName
      const NotificationProxy = rewire(`${src}/handlers/notification`)
      const metadata = {
        orig_broker_id: 0,
        orig_broker_name: 'kafka:9092/0',
        topics: [
          { name: topicName, partitions: [] }
        ],
        brokers: [{ id: 0, host: 'kafka', port: 9092 }]
      }
      NotificationProxy.__set__('notificationConsumer', {
        // Successful callback
        getMetadata: (options, cb) => cb(null, metadata)
      })

      // Act
      let result
      try {
        result = await NotificationProxy.isConnected()
      } catch (err) {
        test.fail(err.message)
      }

      // Assert
      test.equal(result, true, 'isConnected should return true')
      test.end()
    })

    await isConnectedTest.end()
  })

  await notificationTest.end()
})
