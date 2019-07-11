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

 --------------
 ******/
'use strict'

const src = '../../../../src'
const Test = require('tapes')(require('tape'))
const Sinon = require('sinon')
const rewire = require('rewire')
const Consumer = require('@mojaloop/central-services-stream').Kafka.Consumer
const Logger = require('@mojaloop/central-services-shared').Logger
const P = require('bluebird')

const Notification = require(`${src}/handlers/notification`)
const Callback = require(`${src}/handlers/notification/callbacks`)
const Config = require(`${src}/lib/config.js`)
const Participant = require(`${src}/domain/participant`)
const ENUM = require(`${src}/lib/enum`)
const Utility = require(`${src}/lib/utility`)
const Uuid = require('uuid4')
const Proxyquire = require('proxyquire')

Test('Notification Service tests', notificationTest => {
  let sandbox
  const FSPIOP_CALLBACK_URL_TRANSFER_POST = 'FSPIOP_CALLBACK_URL_TRANSFER_POST'
  const FSPIOP_CALLBACK_URL_TRANSFER_PUT = 'FSPIOP_CALLBACK_URL_TRANSFER_PUT'
  const FSPIOP_CALLBACK_URL_TRANSFER_ERROR = 'FSPIOP_CALLBACK_URL_TRANSFER_ERROR'
  const url = 'http://somehost:port/'

  notificationTest.beforeEach(t => {
    sandbox = Sinon.createSandbox()
    sandbox.stub(Consumer.prototype, 'constructor')

    sandbox.stub(Consumer.prototype, 'connect').returns(P.resolve(true))
    // sandbox.stub(Consumer.prototype, 'consume').callsArgAsync(0)
    sandbox.stub(Consumer.prototype, 'consume').returns(P.resolve(true)) // .callsArgAsync(0)
    sandbox.stub(Consumer.prototype, 'commitMessageSync').returns(P.resolve(true))
    sandbox.stub(Participant, 'getEndpoint').returns(P.resolve(url))

    sandbox.stub(Logger)
    sandbox.stub(Callback, 'sendCallback').returns(P.resolve(true))
    t.end()
  })

  notificationTest.afterEach(t => {
    sandbox.restore()
    t.end()
  })

  notificationTest.test('processMessage should', async processMessageTest => {
    processMessageTest.test('process the message received from kafka and send out a transfer post callback', async test => {
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

      const url = await Participant.getEndpoint(msg.value.to, FSPIOP_CALLBACK_URL_TRANSFER_POST, msg.value.content.payload.transferId)
      const method = 'post'
      const headers = {}
      const message = { transferId: uuid }

      const expected = 200

      Callback.sendCallback.withArgs(url, method, headers, JSON.stringify(message), msg.value.content.payload.transferId, msg.value.from, msg.value.to).returns(P.resolve(200))

      let result = await Notification.processMessage(msg)
      test.ok(Callback.sendCallback.calledWith(url, method, headers, JSON.stringify(message), msg.value.content.payload.transferId, msg.value.from, msg.value.to))
      test.equal(result, expected)
      test.end()
    })

    processMessageTest.test('process the message received from kafka and send out a transfer error notification to the sender', async test => {
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
      const url = await Participant.getEndpoint(msg.value.from, FSPIOP_CALLBACK_URL_TRANSFER_ERROR, msg.value.content.payload.transferId)
      const method = 'put'
      const headers = {}
      const message = { transferId: uuid }

      const expected = 200

      Callback.sendCallback.withArgs(url, method, headers, JSON.stringify(message), msg.value.content.payload.transferId, msg.value.from, msg.value.to).returns(P.resolve(200))

      let result = await Notification.processMessage(msg)
      test.ok(Callback.sendCallback.calledWith(url, method, headers, JSON.stringify(message), msg.value.content.payload.transferId, msg.value.from, msg.value.to))
      test.equal(result, expected)
      test.end()
    })

    processMessageTest.test('throw error if not able to post the transfer to the receiver', async test => {
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
      const url = await Participant.getEndpoint(msg.value.to, FSPIOP_CALLBACK_URL_TRANSFER_POST, msg.value.content.payload.transferId)
      const method = 'post'
      const headers = {}
      const message = { transferId: uuid }

      Callback.sendCallback.withArgs(url, method, headers, JSON.stringify(message), msg.value.content.payload.transferId, msg.value.from, msg.value.to).throws(new Error())

      try {
        await Notification.processMessage(msg)
        test.fail('Was expecting an error when receiving trying post the transfer to the receiver')
        test.end()
      } catch (e) {
        test.ok(e instanceof Error)
        test.end()
      }
    })

    processMessageTest.test('throw error if not able to send the notification to the sender', async test => {
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
      const url = await Participant.getEndpoint(msg.value.from, FSPIOP_CALLBACK_URL_TRANSFER_ERROR, msg.value.content.payload.transferId)
      const method = 'put'
      const headers = {}
      const message = { transferId: uuid }

      Callback.sendCallback.withArgs(url, method, headers, JSON.stringify(message), msg.value.content.payload.transferId, msg.value.from, msg.value.to).throws(new Error())

      try {
        await Notification.processMessage(msg)
        test.fail('Was expecting an error when receiving trying to send an error notification to sender')
        test.end()
      } catch (e) {
        test.ok(e instanceof Error)
        test.end()
      }
    })

    processMessageTest.test('process the message received from kafka and send out a transfer post callback', async test => {
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

      const urlPayer = await Participant.getEndpoint(msg.value.from, FSPIOP_CALLBACK_URL_TRANSFER_PUT, msg.value.content.payload.transferId)
      const urlPayee = await Participant.getEndpoint(msg.value.to, FSPIOP_CALLBACK_URL_TRANSFER_PUT, msg.value.content.payload.transferId)
      const method = 'put'
      const message = { transferId: uuid }

      const expected = 200
      // console.log(`${urlPayer}, ${method}, ${JSON.stringify(msg.value.content.headers)}, ${JSON.stringify(message)}, ${msg.value.content.payload.transferId}, ${msg.value.from}, ${msg.value.to}`)
      Callback.sendCallback.withArgs(urlPayer, method, msg.value.content.headers, JSON.stringify(message), msg.value.content.payload.transferId, msg.value.from, msg.value.to).returns(P.resolve(200))
      // console.log(`${urlPayer}, ${method}, ${JSON.stringify(msg.value.content.headers)}, ${JSON.stringify(message)}, ${msg.value.content.payload.transferId}, ${ENUM.headers.FSPIOP.SWITCH.value}, ${msg.value.from}`)
      Callback.sendCallback.withArgs(urlPayee, method, msg.value.content.headers, JSON.stringify(message), msg.value.content.payload.transferId, ENUM.headers.FSPIOP.SWITCH.value, msg.value.from).returns(P.resolve(200))

      let result = await Notification.processMessage(msg)
      test.ok(Callback.sendCallback.calledWith(urlPayee, method, msg.value.content.headers, JSON.stringify(message), msg.value.content.payload.transferId, ENUM.headers.FSPIOP.SWITCH.value, msg.value.from))
      test.ok(Callback.sendCallback.calledWith(urlPayer, method, msg.value.content.headers, JSON.stringify(message), msg.value.content.payload.transferId, msg.value.from, msg.value.to))
      test.equal(result, expected)
      test.end()
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
      const url = await Participant.getEndpoint(msg.value.from, FSPIOP_CALLBACK_URL_TRANSFER_ERROR, msg.value.content.payload.transferId)
      const method = 'put'
      const message = { transferId: uuid }

      Callback.sendCallback.withArgs(url, method, msg.value.content.headers, JSON.stringify(message), msg.value.content.payload.transferId, msg.value.from, msg.value.to).throws(new Error())

      try {
        await Notification.processMessage(msg)
        test.fail('Was expecting an error when receiving trying to send an error notification to sender')
        test.end()
      } catch (e) {
        test.ok(e instanceof Error)
        test.end()
      }
    })

    processMessageTest.test('warn if invalid action received from kafka', async test => {
      let CentralServicesSharedStub = {
        Logger: {
          error: sandbox.stub().returns(P.resolve()),
          info: sandbox.stub().returns(P.resolve()),
          warn: sandbox.stub().returns(P.resolve())
        }
      }
      const NotificationProxy = Proxyquire(`${src}/handlers/notification`, {
        '@mojaloop/central-services-shared': CentralServicesSharedStub
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
        await NotificationProxy.processMessage(msg)
        test.ok(CentralServicesSharedStub.Logger.warn.withArgs(`Unknown action received from kafka: ${msg.value.metadata.event.action}`).calledOnce, 'Logger.warn called once')
        test.end()
      } catch (e) {
        test.fail('Error thrown')
        test.end()
      }
    })

    processMessageTest.test('throw error if invalid message received from kafka', async test => {
      const msg = {}

      try {
        await Notification.processMessage(msg)
        test.fail('Was expecting an error when receiving an invalid message from Kafka')
        test.end()
      } catch (e) {
        test.ok(e instanceof Error)
        test.equal(e.message, 'Invalid message received from kafka')
        test.end()
      }
    })

    processMessageTest.test('process the reject message received from kafka and send out a transfer put callback', async test => {
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

      const fromUrl = await Participant.getEndpoint(msg.value.from, FSPIOP_CALLBACK_URL_TRANSFER_PUT, msg.value.content.payload.transferId)
      const toUrl = await Participant.getEndpoint(msg.value.to, FSPIOP_CALLBACK_URL_TRANSFER_PUT, msg.value.content.payload.transferId)
      const method = 'put'
      const message = { transferId: uuid }

      const expected = 200

      Callback.sendCallback.withArgs(fromUrl, method, msg.value.content.headers, JSON.stringify(message), msg.value.content.payload.transferId, ENUM.headers.FSPIOP.SWITCH.value, msg.value.from).returns(P.resolve(200))
      Callback.sendCallback.withArgs(toUrl, method, msg.value.content.headers, JSON.stringify(message), msg.value.content.payload.transferId, msg.value.from, msg.value.to).returns(P.resolve(200))

      let result = await Notification.processMessage(msg)
      test.ok(Callback.sendCallback.calledWith(fromUrl, method, msg.value.content.headers, JSON.stringify(message), msg.value.content.payload.transferId, ENUM.headers.FSPIOP.SWITCH.value, msg.value.from))
      test.ok(Callback.sendCallback.calledWith(toUrl, method, msg.value.content.headers, JSON.stringify(message), msg.value.content.payload.transferId, msg.value.from, msg.value.to))
      test.equal(result, expected)
      test.end()
    })

    processMessageTest.test('process the abort message received from kafka and send out a transfer put callback', async test => {
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
      const fromUrl = await Participant.getEndpoint(msg.value.from, FSPIOP_CALLBACK_URL_TRANSFER_ERROR, msg.value.content.payload.transferId)
      const toUrl = await Participant.getEndpoint(msg.value.to, FSPIOP_CALLBACK_URL_TRANSFER_ERROR, msg.value.content.payload.transferId)
      const method = 'put'
      const message = { transferId: uuid }

      const expected = 200

      Callback.sendCallback.withArgs(toUrl, method, msg.value.content.headers, JSON.stringify(message), msg.value.content.payload.transferId, msg.value.from, msg.value.to).returns(P.resolve(200))
      // console.log(`${urlPayer}, ${method}, ${JSON.stringify(msg.value.content.headers)}, ${JSON.stringify(message)}, ${msg.value.content.payload.transferId}, ${ENUM.headers.FSPIOP.SWITCH.value}, ${msg.value.from}`)
      Callback.sendCallback.withArgs(fromUrl, method, msg.value.content.headers, JSON.stringify(message), msg.value.content.payload.transferId, ENUM.headers.FSPIOP.SWITCH.value, msg.value.from).returns(P.resolve(200))

      let result = await Notification.processMessage(msg)
      test.ok(Callback.sendCallback.calledWith(fromUrl, method, msg.value.content.headers, JSON.stringify(message), msg.value.content.payload.transferId, ENUM.headers.FSPIOP.SWITCH.value, msg.value.from))
      test.ok(Callback.sendCallback.calledWith(toUrl, method, msg.value.content.headers, JSON.stringify(message), msg.value.content.payload.transferId, msg.value.from, msg.value.to))
      test.equal(result, expected)
      test.end()
    })

    processMessageTest.test('process the fulfil-duplicate message received from kafka and send out a transfer put callback', async test => {
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
      const fromUrl = await Participant.getEndpoint(msg.value.from, FSPIOP_CALLBACK_URL_TRANSFER_PUT, msg.value.content.payload.transferId)
      const method = 'put'
      const message = { transferId: uuid }

      const expected = 200

      // console.log(`${fromUrl}, ${method}, ${JSON.stringify(msg.value.content.headers)}, ${JSON.stringify(message)}, ${msg.value.content.payload.transferId}, ${msg.value.from}, ${msg.value.to}`)
      Callback.sendCallback.withArgs(fromUrl, method, msg.value.content.headers, JSON.stringify(message), msg.value.content.payload.transferId, msg.value.from, msg.value.to).returns(P.resolve(200))

      let result = await Notification.processMessage(msg)
      test.ok(Callback.sendCallback.calledWith(fromUrl, method, msg.value.content.headers, JSON.stringify(message), msg.value.content.payload.transferId, msg.value.from, msg.value.to))
      test.equal(result, expected)
      test.end()
    })

    processMessageTest.test('process the fulfil-duplicate message received from kafka and send out a transfer error callback', async test => {
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
      const fromUrl = await Participant.getEndpoint(msg.value.from, FSPIOP_CALLBACK_URL_TRANSFER_ERROR, msg.value.content.payload.transferId)
      const method = 'put'
      const message = { transferId: uuid }

      const expected = 200

      // console.log(`${fromUrl}, ${method}, ${JSON.stringify(msg.value.content.headers)}, ${JSON.stringify(message)}, ${msg.value.content.payload.transferId}, ${msg.value.from}, ${msg.value.to}`)
      Callback.sendCallback.withArgs(fromUrl, method, msg.value.content.headers, JSON.stringify(message), msg.value.content.payload.transferId, msg.value.from, msg.value.to).returns(P.resolve(200))

      let result = await Notification.processMessage(msg)
      test.ok(Callback.sendCallback.calledWith(fromUrl, method, msg.value.content.headers, JSON.stringify(message), msg.value.content.payload.transferId, msg.value.from, msg.value.to))
      test.equal(result, expected)
      test.end()
    })

    processMessageTest.test('process the abort-duplicate message received from kafka and send out a transfer put callback', async test => {
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
      const fromUrl = await Participant.getEndpoint(msg.value.from, FSPIOP_CALLBACK_URL_TRANSFER_PUT, msg.value.content.payload.transferId)
      const method = 'put'
      const message = { transferId: uuid }

      const expected = 200

      // console.log(`${fromUrl}, ${method}, ${JSON.stringify(msg.value.content.headers)}, ${JSON.stringify(message)}, ${msg.value.content.payload.transferId}, ${msg.value.from}, ${msg.value.to}`)
      Callback.sendCallback.withArgs(fromUrl, method, msg.value.content.headers, JSON.stringify(message), msg.value.content.payload.transferId, msg.value.from, msg.value.to).returns(P.resolve(200))

      let result = await Notification.processMessage(msg)
      test.ok(Callback.sendCallback.calledWith(fromUrl, method, msg.value.content.headers, JSON.stringify(message), msg.value.content.payload.transferId, msg.value.from, msg.value.to))
      test.equal(result, expected)
      test.end()
    })

    processMessageTest.test('process the abort-duplicate message received from kafka and send out a transfer error callback', async test => {
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
      const fromUrl = await Participant.getEndpoint(msg.value.from, FSPIOP_CALLBACK_URL_TRANSFER_ERROR, msg.value.content.payload.transferId)
      const method = 'put'
      const message = { transferId: uuid }

      const expected = 200

      // console.log(`${fromUrl}, ${method}, ${JSON.stringify(msg.value.content.headers)}, ${JSON.stringify(message)}, ${msg.value.content.payload.transferId}, ${msg.value.from}, ${msg.value.to}`)
      Callback.sendCallback.withArgs(fromUrl, method, msg.value.content.headers, JSON.stringify(message), msg.value.content.payload.transferId, msg.value.from, msg.value.to).returns(P.resolve(200))

      let result = await Notification.processMessage(msg)
      test.ok(Callback.sendCallback.calledWith(fromUrl, method, msg.value.content.headers, JSON.stringify(message), msg.value.content.payload.transferId, msg.value.from, msg.value.to))
      test.equal(result, expected)
      test.end()
    })

    processMessageTest.test('process the timeout-received message received from kafka and send out a transfer put callback', async test => {
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
      const fromUrl = await Participant.getEndpoint(msg.value.from, FSPIOP_CALLBACK_URL_TRANSFER_ERROR, msg.value.content.payload.transferId)
      const method = 'put'
      const message = { transferId: uuid }

      const expected = 200

      console.log(`${fromUrl}, ${method}, ${JSON.stringify(msg.value.content.headers)}, ${JSON.stringify(message)}, ${msg.value.content.payload.transferId}, ${msg.value.to}, ${msg.value.from}`)
      Callback.sendCallback.withArgs(fromUrl, method, msg.value.content.headers, JSON.stringify(message), msg.value.content.payload.transferId, msg.value.from, msg.value.to).returns(P.resolve(200))

      let result = await Notification.processMessage(msg)
      test.ok(Callback.sendCallback.calledWith(fromUrl, method, msg.value.content.headers, JSON.stringify(message), msg.value.content.payload.transferId, msg.value.from, msg.value.to))
      test.equal(result, expected)
      test.end()
    })

    processMessageTest.test('process the prepare-duplicate message received from kafka and send out a transfer put callback', async test => {
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
      const fromUrl = await Participant.getEndpoint(msg.value.from, FSPIOP_CALLBACK_URL_TRANSFER_PUT, msg.value.content.payload.transferId)
      const method = 'put'
      const message = { transferId: uuid }

      const expected = 200

      // console.log(`${fromUrl}, ${method}, ${JSON.stringify(msg.value.content.headers)}, ${JSON.stringify(message)}, ${msg.value.content.payload.transferId}, ${msg.value.from}, ${msg.value.to}`)
      Callback.sendCallback.withArgs(fromUrl, method, msg.value.content.headers, JSON.stringify(message), msg.value.content.payload.transferId, msg.value.from, msg.value.to).returns(P.resolve(200))

      let result = await Notification.processMessage(msg)
      test.ok(Callback.sendCallback.calledWith(fromUrl, method, msg.value.content.headers, JSON.stringify(message), msg.value.content.payload.transferId, msg.value.from, msg.value.to))
      test.equal(result, expected)
      test.end()
    })

    processMessageTest.end()
  })

  notificationTest.test('startConsumer should', async startConsumerTest => {
    startConsumerTest.test('start the consumer and consumer messages', async test => {
      test.ok(await Notification.startConsumer())
      test.end()
    })

    startConsumerTest.test('start the consumer and consumer messages with auto-commit enabled', async test => {
      Config.KAFKA_CONFIG.CONSUMER.NOTIFICATION.EVENT.config.rdkafkaConf['enable.auto.commit'] = undefined
      test.ok(await Notification.startConsumer())
      test.end()
      Config.KAFKA_CONFIG.CONSUMER.NOTIFICATION.EVENT.config.rdkafkaConf['enable.auto.commit'] = false
    })

    startConsumerTest.test('throw error on error connecting to kafka', async test => {
      const error = new Error()
      Consumer.prototype.connect.returns(P.reject(error))
      try {
        await Notification.startConsumer()
        test.fail('Was expecting an error when connecting to Kafka')
        test.end()
      } catch (e) {
        test.ok(e instanceof Error)
        test.end()
      }
    })

    startConsumerTest.end()
  })

  notificationTest.test('consumeMessage should', async consumeMessageTest => {
    consumeMessageTest.test('process the message', async test => {
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
      let result = await Notification.consumeMessage(null, [msg])
      test.ok(result)
      test.end()
    })

    consumeMessageTest.test('process the message with auto-commit enabled', async test => {
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
      let result = await Notification.consumeMessage(null, [msg])
      test.ok(result)
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
      let result = await Notification.consumeMessage(null, [msg])
      test.ok(result)
      test.end()
      Config.KAFKA_CONFIG.CONSUMER.NOTIFICATION.EVENT.config.rdkafkaConf['enable.auto.commit'] = false
    })

    consumeMessageTest.test('process the message with action = get', async test => {
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
      let result = await Notification.consumeMessage(null, [msg])
      test.ok(result)
      test.end()
      Config.KAFKA_CONFIG.CONSUMER.NOTIFICATION.EVENT.config.rdkafkaConf['enable.auto.commit'] = false
    })

    consumeMessageTest.test('process the message with action = get and unsuccessful message status', async test => {
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
      let result = await Notification.consumeMessage(null, [msg])
      test.ok(result)
      test.end()
      Config.KAFKA_CONFIG.CONSUMER.NOTIFICATION.EVENT.config.rdkafkaConf['enable.auto.commit'] = false
    })

    consumeMessageTest.test('throw error is there is any error processing the message', async test => {
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
        const result = await Notification.consumeMessage(null, [msg])
        test.ok(result instanceof Error)
        test.end()
      } catch (e) {
        test.fail('Should not have caught an error here since it should have been dealt with')
        test.end()
      }
    })

    consumeMessageTest.test('throw error is there is any error processing the message with auto-commit enabled', async test => {
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
        const result = await Notification.consumeMessage(null, [msg])
        test.ok(result instanceof Error)
        test.end()
      } catch (e) {
        test.fail('Should not have caught an error here since it should have been dealt with')
        test.end()
      }
      Config.KAFKA_CONFIG.CONSUMER.NOTIFICATION.EVENT.config.rdkafkaConf['enable.auto.commit'] = false
    })

    consumeMessageTest.test('convert a single message into an array', async test => {
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

    consumeMessageTest.test('throw error on invalid message', async test => {
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

    consumeMessageTest.end()
  })

  notificationTest.test('isConnected', async isConnectedTest => {
    isConnectedTest.test('reject with an error if getMetadata fails', async test => {
      // Arrange
      let NotificationProxy = rewire(`${src}/handlers/notification`)
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

    isConnectedTest.test('reject with an error if client.getMetadata passes, but metadata is mising topic', async test => {
      // Arrange
      const topicName = Utility.getNotificationTopicName()
      let NotificationProxy = rewire(`${src}/handlers/notification`)
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

    isConnectedTest.test('pass if the topic can be found', async test => {
      // Arrange
      const topicName = Utility.getNotificationTopicName()
      let NotificationProxy = rewire(`${src}/handlers/notification`)
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

    isConnectedTest.end()
  })

  notificationTest.end()
})
