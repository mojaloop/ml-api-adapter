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
const Notification = require(`${src}/handlers/notification`)
const Callback = require(`${src}/handlers/notification/callbacks`)
const Consumer = require('@mojaloop/central-services-stream').Kafka.Consumer
const Logger = require('@mojaloop/central-services-shared').Logger
const FSPIOPError = require('@mojaloop/central-services-error-handling').Factory.FSPIOPError
const P = require('bluebird')
const Config = require(`${src}/lib/config.js`)
const Participant = require(`${src}/domain/participant`)
const ENUM = require('../../../../src/lib/enum')

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

      const url = await Participant.getEndpoint(msg.value.to, FSPIOP_CALLBACK_URL_TRANSFER_POST, msg.value.id)
      const method = 'post'
      const headers = {}
      const message = {}

      const expected = 200

      Callback.sendCallback.withArgs(url, method, headers, JSON.stringify(message), msg.value.id, msg.value.from, msg.value.to).returns(P.resolve(200))

      let result = await Notification.processMessage(msg)
      test.ok(Callback.sendCallback.calledWith(url, method, headers, JSON.stringify(message), msg.value.id, msg.value.from, msg.value.to))
      test.equal(result, expected)
      test.end()
    })

    processMessageTest.test('process the message received from kafka and send out a transfer error notification to the sender', async test => {
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
            payload: {}
          },
          to: 'dfsp2',
          from: 'dfsp1',
          id: 'b51ec534-ee48-4575-b6a9-ead2955b8098'
        }
      }
      const url = await Participant.getEndpoint(msg.value.from, FSPIOP_CALLBACK_URL_TRANSFER_ERROR, msg.value.id)
      const method = 'put'
      const headers = {}
      const message = {}

      const expected = 200

      Callback.sendCallback.withArgs(url, method, headers, JSON.stringify(message), msg.value.id, msg.value.from, msg.value.to).returns(P.resolve(200))

      let result = await Notification.processMessage(msg)
      test.ok(Callback.sendCallback.calledWith(url, method, headers, JSON.stringify(message), msg.value.id, msg.value.from, msg.value.to))
      test.equal(result, expected)
      test.end()
    })

    processMessageTest.test('throw error if not able to post the transfer to the receiver', async test => {
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
      const url = await Participant.getEndpoint(msg.value.to, FSPIOP_CALLBACK_URL_TRANSFER_POST, msg.value.id)
      const method = 'post'
      const headers = {}
      const message = {}

      Callback.sendCallback.withArgs(url, method, headers, JSON.stringify(message), msg.value.id, msg.value.from, msg.value.to).throws(new Error())

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
            payload: {}
          },
          to: 'dfsp2',
          from: 'dfsp1',
          id: 'b51ec534-ee48-4575-b6a9-ead2955b8098'
        }
      }
      const url = await Participant.getEndpoint(msg.value.from, FSPIOP_CALLBACK_URL_TRANSFER_ERROR, msg.value.id)
      const method = 'put'
      const headers = {}
      const message = {}

      Callback.sendCallback.withArgs(url, method, headers, JSON.stringify(message), msg.value.id, msg.value.from, msg.value.to).throws(new Error())

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
            payload: {}
          },
          to: payeeFsp,
          from: payerFsp,
          id: 'b51ec534-ee48-4575-b6a9-ead2955b8098'
        }
      }

      const urlPayer = await Participant.getEndpoint(msg.value.from, FSPIOP_CALLBACK_URL_TRANSFER_PUT, msg.value.id)
      const urlPayee = await Participant.getEndpoint(msg.value.to, FSPIOP_CALLBACK_URL_TRANSFER_PUT, msg.value.id)
      const method = 'put'
      const message = {}

      const expected = 200
      // console.log(`${urlPayer}, ${method}, ${JSON.stringify(msg.value.content.headers)}, ${JSON.stringify(message)}, ${msg.value.id}, ${msg.value.from}, ${msg.value.to}`)
      Callback.sendCallback.withArgs(urlPayer, method, msg.value.content.headers, JSON.stringify(message), msg.value.id, msg.value.from, msg.value.to).returns(P.resolve(200))
      // console.log(`${urlPayer}, ${method}, ${JSON.stringify(msg.value.content.headers)}, ${JSON.stringify(message)}, ${msg.value.id}, ${ENUM.headers.FSPIOP.SWITCH.value}, ${msg.value.from}`)
      Callback.sendCallback.withArgs(urlPayee, method, msg.value.content.headers, JSON.stringify(message), msg.value.id, ENUM.headers.FSPIOP.SWITCH.value, msg.value.from).returns(P.resolve(200))

      let result = await Notification.processMessage(msg)
      test.ok(Callback.sendCallback.calledWith(urlPayee, method, msg.value.content.headers, JSON.stringify(message), msg.value.id, ENUM.headers.FSPIOP.SWITCH.value, msg.value.from))
      test.ok(Callback.sendCallback.calledWith(urlPayer, method, msg.value.content.headers, JSON.stringify(message), msg.value.id, msg.value.from, msg.value.to))
      test.equal(result, expected)
      test.end()
    })

    processMessageTest.test('throw error if not able to send the notification to the sender', async test => {
      const payerFsp = 'dfsp2'
      const payeeFsp = 'dfsp1'
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
            payload: {}
          },
          to: payeeFsp,
          from: payerFsp,
          id: 'b51ec534-ee48-4575-b6a9-ead2955b8098'
        }
      }
      const url = await Participant.getEndpoint(msg.value.from, FSPIOP_CALLBACK_URL_TRANSFER_ERROR, msg.value.id)
      const method = 'put'
      const message = {}

      Callback.sendCallback.withArgs(url, method, msg.value.content.headers, JSON.stringify(message), msg.value.id, msg.value.from, msg.value.to).throws(new Error())

      try {
        await Notification.processMessage(msg)
        test.fail('Was expecting an error when receiving trying to send an error notification to sender')
        test.end()
      } catch (e) {
        test.ok(e instanceof Error)
        test.end()
      }
    })

    processMessageTest.test('log a warning message if invalid action received from kafka', async test => {
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
            payload: {}
          },
          to: 'dfsp2',
          from: 'dfsp1',
          id: 'b51ec534-ee48-4575-b6a9-ead2955b8098'
        }
      }
      try {
        await Notification.processMessage(msg)
        test.ok(Logger.warn.calledWith('Unknown action received from kafka: invalid action'),
          'Expected a warning message to be logged')
        test.end()
      } catch (e) {
        test.fail('Was expecting a warning log message instead of a failure')
        test.end()
      }
    })

    processMessageTest.test('throw error if invalid message received from kafka', async test => {
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

    processMessageTest.test('process the reject message received from kafka and send out a transfer put callback', async test => {
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
            payload: {}
          },
          to: payeeFsp,
          from: payerFsp,
          id: 'b51ec534-ee48-4575-b6a9-ead2955b8098'
        }
      }

      const fromUrl = await Participant.getEndpoint(msg.value.from, FSPIOP_CALLBACK_URL_TRANSFER_PUT, msg.value.id)
      const toUrl = await Participant.getEndpoint(msg.value.to, FSPIOP_CALLBACK_URL_TRANSFER_PUT, msg.value.id)
      const method = 'put'
      const message = {}

      const expected = 200

      Callback.sendCallback.withArgs(fromUrl, method, msg.value.content.headers, JSON.stringify(message), msg.value.id, ENUM.headers.FSPIOP.SWITCH.value, msg.value.from).returns(P.resolve(200))
      Callback.sendCallback.withArgs(toUrl, method, msg.value.content.headers, JSON.stringify(message), msg.value.id, msg.value.from, msg.value.to).returns(P.resolve(200))

      let result = await Notification.processMessage(msg)
      test.ok(Callback.sendCallback.calledWith(fromUrl, method, msg.value.content.headers, JSON.stringify(message), msg.value.id, ENUM.headers.FSPIOP.SWITCH.value, msg.value.from))
      test.ok(Callback.sendCallback.calledWith(toUrl, method, msg.value.content.headers, JSON.stringify(message), msg.value.id, msg.value.from, msg.value.to))
      test.equal(result, expected)
      test.end()
    })

    processMessageTest.test('process the abort message received from kafka and send out a transfer put callback', async test => {
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
            payload: {}
          },
          to: payeeFsp,
          from: payerFsp,
          id: 'b51ec534-ee48-4575-b6a9-ead2955b8098'
        }
      }
      const fromUrl = await Participant.getEndpoint(msg.value.from, FSPIOP_CALLBACK_URL_TRANSFER_ERROR, msg.value.id)
      const toUrl = await Participant.getEndpoint(msg.value.to, FSPIOP_CALLBACK_URL_TRANSFER_ERROR, msg.value.id)
      const method = 'put'
      const message = {}

      const expected = 200

      Callback.sendCallback.withArgs(toUrl, method, msg.value.content.headers, JSON.stringify(message), msg.value.id, msg.value.from, msg.value.to).returns(P.resolve(200))
      // console.log(`${urlPayer}, ${method}, ${JSON.stringify(msg.value.content.headers)}, ${JSON.stringify(message)}, ${msg.value.id}, ${ENUM.headers.FSPIOP.SWITCH.value}, ${msg.value.from}`)
      Callback.sendCallback.withArgs(fromUrl, method, msg.value.content.headers, JSON.stringify(message), msg.value.id, ENUM.headers.FSPIOP.SWITCH.value, msg.value.from).returns(P.resolve(200))

      let result = await Notification.processMessage(msg)
      test.ok(Callback.sendCallback.calledWith(fromUrl, method, msg.value.content.headers, JSON.stringify(message), msg.value.id, ENUM.headers.FSPIOP.SWITCH.value, msg.value.from))
      test.ok(Callback.sendCallback.calledWith(toUrl, method, msg.value.content.headers, JSON.stringify(message), msg.value.id, msg.value.from, msg.value.to))
      test.equal(result, expected)
      test.end()
    })

    processMessageTest.test('process the fulfil-duplicate message received from kafka and send out a transfer put callback', async test => {
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
            payload: {}
          },
          to: payerFsp,
          from: payeeFsp,
          id: 'b51ec534-ee48-4575-b6a9-ead2955b8098'
        }
      }
      const fromUrl = await Participant.getEndpoint(msg.value.from, FSPIOP_CALLBACK_URL_TRANSFER_PUT, msg.value.id)
      const method = 'put'
      const message = {}

      const expected = 200

      // console.log(`${fromUrl}, ${method}, ${JSON.stringify(msg.value.content.headers)}, ${JSON.stringify(message)}, ${msg.value.id}, ${msg.value.from}, ${msg.value.to}`)
      Callback.sendCallback.withArgs(fromUrl, method, msg.value.content.headers, JSON.stringify(message), msg.value.id, msg.value.from, msg.value.to).returns(P.resolve(200))

      let result = await Notification.processMessage(msg)
      test.ok(Callback.sendCallback.calledWith(fromUrl, method, msg.value.content.headers, JSON.stringify(message), msg.value.id, msg.value.from, msg.value.to))
      test.equal(result, expected)
      test.end()
    })

    processMessageTest.test('process the fulfil-duplicate message received from kafka and send out a transfer error callback', async test => {
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
            payload: {}
          },
          to: payerFsp,
          from: payeeFsp,
          id: 'b51ec534-ee48-4575-b6a9-ead2955b8098'
        }
      }
      const fromUrl = await Participant.getEndpoint(msg.value.from, FSPIOP_CALLBACK_URL_TRANSFER_ERROR, msg.value.id)
      const method = 'put'
      const message = {}

      const expected = 200

      // console.log(`${fromUrl}, ${method}, ${JSON.stringify(msg.value.content.headers)}, ${JSON.stringify(message)}, ${msg.value.id}, ${msg.value.from}, ${msg.value.to}`)
      Callback.sendCallback.withArgs(fromUrl, method, msg.value.content.headers, JSON.stringify(message), msg.value.id, msg.value.from, msg.value.to).returns(P.resolve(200))

      let result = await Notification.processMessage(msg)
      test.ok(Callback.sendCallback.calledWith(fromUrl, method, msg.value.content.headers, JSON.stringify(message), msg.value.id, msg.value.from, msg.value.to))
      test.equal(result, expected)
      test.end()
    })

    processMessageTest.test('process the abort-duplicate message received from kafka and send out a transfer put callback', async test => {
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
            payload: {}
          },
          to: payerFsp,
          from: payeeFsp,
          id: 'b51ec534-ee48-4575-b6a9-ead2955b8098'
        }
      }
      const fromUrl = await Participant.getEndpoint(msg.value.from, FSPIOP_CALLBACK_URL_TRANSFER_PUT, msg.value.id)
      const method = 'put'
      const message = {}

      const expected = 200

      // console.log(`${fromUrl}, ${method}, ${JSON.stringify(msg.value.content.headers)}, ${JSON.stringify(message)}, ${msg.value.id}, ${msg.value.from}, ${msg.value.to}`)
      Callback.sendCallback.withArgs(fromUrl, method, msg.value.content.headers, JSON.stringify(message), msg.value.id, msg.value.from, msg.value.to).returns(P.resolve(200))

      let result = await Notification.processMessage(msg)
      test.ok(Callback.sendCallback.calledWith(fromUrl, method, msg.value.content.headers, JSON.stringify(message), msg.value.id, msg.value.from, msg.value.to))
      test.equal(result, expected)
      test.end()
    })

    processMessageTest.test('process the abort-duplicate message received from kafka and send out a transfer error callback', async test => {
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
            payload: {}
          },
          to: payerFsp,
          from: payeeFsp,
          id: 'b51ec534-ee48-4575-b6a9-ead2955b8098'
        }
      }
      const fromUrl = await Participant.getEndpoint(msg.value.from, FSPIOP_CALLBACK_URL_TRANSFER_ERROR, msg.value.id)
      const method = 'put'
      const message = {}

      const expected = 200

      // console.log(`${fromUrl}, ${method}, ${JSON.stringify(msg.value.content.headers)}, ${JSON.stringify(message)}, ${msg.value.id}, ${msg.value.from}, ${msg.value.to}`)
      Callback.sendCallback.withArgs(fromUrl, method, msg.value.content.headers, JSON.stringify(message), msg.value.id, msg.value.from, msg.value.to).returns(P.resolve(200))

      let result = await Notification.processMessage(msg)
      test.ok(Callback.sendCallback.calledWith(fromUrl, method, msg.value.content.headers, JSON.stringify(message), msg.value.id, msg.value.from, msg.value.to))
      test.equal(result, expected)
      test.end()
    })

    processMessageTest.test('process the timeout-received message received from kafka and send out a transfer put callback', async test => {
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
            payload: {}
          },
          to: payeeFsp,
          from: payerFsp,
          id: 'b51ec534-ee48-4575-b6a9-ead2955b8098'
        }
      }
      const fromUrl = await Participant.getEndpoint(msg.value.from, FSPIOP_CALLBACK_URL_TRANSFER_ERROR, msg.value.id)
      const method = 'put'
      const message = {}

      const expected = 200

      console.log(`${fromUrl}, ${method}, ${JSON.stringify(msg.value.content.headers)}, ${JSON.stringify(message)}, ${msg.value.id}, ${msg.value.to}, ${msg.value.from}`)
      Callback.sendCallback.withArgs(fromUrl, method, msg.value.content.headers, JSON.stringify(message), msg.value.id, msg.value.from, msg.value.to).returns(P.resolve(200))

      let result = await Notification.processMessage(msg)
      test.ok(Callback.sendCallback.calledWith(fromUrl, method, msg.value.content.headers, JSON.stringify(message), msg.value.id, msg.value.from, msg.value.to))
      test.equal(result, expected)
      test.end()
    })

    processMessageTest.test('process the prepare-duplicate message received from kafka and send out a transfer put callback', async test => {
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
            payload: {}
          },
          to: payeeFsp,
          from: payerFsp,
          id: 'b51ec534-ee48-4575-b6a9-ead2955b8098'
        }
      }
      const fromUrl = await Participant.getEndpoint(msg.value.from, FSPIOP_CALLBACK_URL_TRANSFER_PUT, msg.value.id)
      const method = 'put'
      const message = {}

      const expected = 200

      // console.log(`${fromUrl}, ${method}, ${JSON.stringify(msg.value.content.headers)}, ${JSON.stringify(message)}, ${msg.value.id}, ${msg.value.from}, ${msg.value.to}`)
      Callback.sendCallback.withArgs(fromUrl, method, msg.value.content.headers, JSON.stringify(message), msg.value.id, msg.value.from, msg.value.to).returns(P.resolve(200))

      let result = await Notification.processMessage(msg)
      test.ok(Callback.sendCallback.calledWith(fromUrl, method, msg.value.content.headers, JSON.stringify(message), msg.value.id, msg.value.from, msg.value.to))
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
  notificationTest.end()
})
