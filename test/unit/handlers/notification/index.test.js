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
 --------------
 ******/

'use strict'

const src = '../../../../src'
const Test = require('tapes')(require('tape'))
const Sinon = require('sinon')
const Notification = require('../../../../src/handlers/notification')
const Callback = require('../../../../src/handlers/notification/callbacks.js')
const Consumer = require('@mojaloop/central-services-shared').Kafka.Consumer
const Logger = require('@mojaloop/central-services-shared').Logger
const P = require('bluebird')
const Config = require(`${src}/lib/config.js`)

Test('Notification Service tests', notificationTest => {
  let sandbox

  notificationTest.beforeEach(t => {
    sandbox = Sinon.sandbox.create()
    sandbox.stub(Consumer.prototype, 'constructor')

    sandbox.stub(Consumer.prototype, 'connect').returns(P.resolve(true))
    // sandbox.stub(Consumer.prototype, 'consume').callsArgAsync(0) //.returns(P.resolve(true))
    sandbox.stub(Consumer.prototype, 'consume', () => { return P.resolve(true) }) // .callsArgAsync(0) //.returns(P.resolve(true))
    sandbox.stub(Consumer.prototype, 'commitMessageSync', () => { return P.resolve(true) }) // .returns(P.resolve(true))

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
              status: 'success'
            }
          },
          content: {
            headers: {},
            payload: {}
          },
          to: 'dfsp2',
          from: 'dfsp1'
        }
      }
      const url = Config.DFSP_URLS['dfsp2'].transfers
      const method = 'post'
      const headers = {}
      const message = {}

      const expected = 200

      Callback.sendCallback.withArgs(url, method, headers, message).returns(P.resolve(200))

      let result = await Notification.processMessage(msg)
      test.ok(Callback.sendCallback.calledWith(url, method, headers, message))
      test.equal(result, expected)
      test.end()
    })

    processMessageTest.test('process the message received from kafka and send out a transfer error notication to the sender', async test => {
      const msg = {
        value: {
          metadata: {
            event: {
              type: 'prepare',
              action: 'prepare',
              status: 'failure'
            }
          },
          content: {
            headers: {},
            payload: {}
          },
          to: 'dfsp2',
          from: 'dfsp1'
        }
      }
      const url = Config.DFSP_URLS['dfsp1'].error
      const method = 'put'
      const headers = {}
      const message = {}

      const expected = 200

      Callback.sendCallback.withArgs(url, method, headers, message).returns(P.resolve(200))

      let result = await Notification.processMessage(msg)
      test.ok(Callback.sendCallback.calledWith(url, method, headers, message))
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
              status: 'success'
            }
          },
          content: {
            headers: {},
            payload: {}
          },
          to: 'dfsp2',
          from: 'dfsp1'
        }
      }
      const url = Config.DFSP_URLS['dfsp2'].transfers
      const method = 'post'
      const headers = {}
      const message = {}

      const error = new Error()
      Callback.sendCallback.withArgs(url, method, headers, message).returns(P.reject(error))

      try {
        await Notification.processMessage(msg)
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
              status: 'failure'
            }
          },
          content: {
            headers: {},
            payload: {}
          },
          to: 'dfsp2',
          from: 'dfsp1'
        }
      }
      const url = Config.DFSP_URLS['dfsp1'].error
      const method = 'put'
      const headers = {}
      const message = {}

      const error = new Error()
      Callback.sendCallback.withArgs(url, method, headers, message).returns(P.reject(error))

      try {
        await Notification.processMessage(msg)
      } catch (e) {
        test.ok(e instanceof Error)
        test.end()
      }
    })

    processMessageTest.test('throw error if invalid action received from kafka', async test => {
      const msg = {
        value: {
          metadata: {
            event: {
              type: 'prepare',
              action: 'invalid action',
              status: 'failure'
            }
          },
          content: {
            headers: {},
            payload: {}
          },
          to: 'dfsp2',
          from: 'dfsp1'
        }
      }
      try {
        await Notification.processMessage(msg)
      } catch (e) {
        test.ok(e instanceof Error)
        test.end()
      }
    })

    processMessageTest.test('throw error if invalid message received from kafka', async test => {
      const msg = {}

      try {
        await Notification.processMessage(msg)
      } catch (e) {
        test.ok(e instanceof Error)
        test.equal(e.message, 'Invalid message received from kafka')
        test.end()
      }
    })
    processMessageTest.end()
  })

  notificationTest.test('startConsumer should', async startConsumerTest => {
    startConsumerTest.test('start the consumer and consumer messages', async test => {
      test.ok(await Notification.startConsumer())
      test.end()
    })

    startConsumerTest.test('throw error on error connecting to kafka', async test => {
      const error = new Error()
      Consumer.prototype.connect.returns(P.reject(error))
      try {
        await Notification.startConsumer()
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
              status: 'success'
            }
          },
          content: {
            headers: {},
            payload: {}
          },
          to: 'dfsp2',
          from: 'dfsp1'
        }
      }
      let result = await Notification.consumeMessage(null, [msg])
      test.ok(result)
      test.end()
    })

    consumeMessageTest.test('throw error is there is any error processing the message', async test => {
      const msg = {
        value: {
          metadata: {
            event: {
              type: 'prepare',
              action: 'prepare',
              status: 'success'
            }
          },
          to: 'dfsp2',
          from: 'dfsp1'
        }
      }
      try {
        await Notification.consumeMessage(null, [msg])
      } catch (e) {
        test.ok(e instanceof Error)
        test.end()
      }
    })

    consumeMessageTest.test('convert a single message into an array', async test => {
      const msg = {
        value: {
          metadata: {
            event: {
              type: 'prepare',
              action: 'prepare',
              status: 'success'
            }
          },
          content: {
            headers: {},
            payload: {}
          },
          to: 'dfsp2',
          from: 'dfsp1'
        }
      }
      test.ok(await Notification.consumeMessage(null, msg))
      test.end()
    })

    consumeMessageTest.test('throw error on invalid message', async test => {
      const msg = {
      }

      const message = [msg]
      const error = new Error()

      try {
        await Notification.consumeMessage(error, message)
      } catch (e) {
        test.ok(e instanceof Error)
        test.end()
      }
    })
    consumeMessageTest.end()
  })
  notificationTest.end()
})
