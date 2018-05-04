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

const Test = require('tapes')(require('tape'))
const Sinon = require('sinon')
const Notification = require('../../../../src/handlers/notification')
// const Service = require('../../../../src/domain/transfer')
const Consumer = require('@mojaloop/central-services-shared').Kafka.Consumer
const Logger = require('@mojaloop/central-services-shared').Logger

Test('Transfer Service tests', notificationTest => {
  let sandbox

  notificationTest.beforeEach(t => {
    sandbox = Sinon.sandbox.create()
    sandbox.stub(Consumer.prototype, 'constructor')
    sandbox.stub(Logger)
    // sandbox.stub(request)
    t.end()
  })

  notificationTest.afterEach(t => {
    sandbox.restore()
    t.end()
  })

  notificationTest.test('getUrl should', async getUrlTest => {
    getUrlTest.test('return the valid URL for the recepient on success', async test => {
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

      const expected = 'http://localhost:3000/dfsp2/notify'

      let result = Notification.getUrl(msg)

      test.equal(result, expected)
      test.end()
    })

    getUrlTest.test('return the valid URL for the sender on failure', async test => {
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

      const expected = 'http://localhost:3000/dfsp1/notify'

      let result = Notification.getUrl(msg)

      test.equal(result, expected)
      test.end()
    })

    getUrlTest.test('return the null on invalid msg', async test => {
      const msg = {}
      const expected = null

      let result = Notification.getUrl(msg)

      test.equal(result, expected)
      test.end()
    })

    getUrlTest.end()
  })

  notificationTest.test('sendNotification should', async sendNotificationTest => {
    sendNotificationTest.test('send the notification to the URL', async test => {
      const url = 'http://localhost:3000/dfsp1/notify'
      const headers = {
        // 'content-type': 'application/json',
        // 'content-length': '100',
        // 'date': '2018-05-03',
        // 'x-forwarded-for': '',
        // 'fspiop-source': '',
        // 'fspiop-destination': '',
        // 'fspiop-encryption': '',
        // 'fspiop-signature': '',
        // 'fspiop-uri': '',
        // 'fspiop-http-method': ''
      }
      const msg = {}
      const expected = 400

      await Notification.sendNotification(url, headers, msg).then(result => {
        test.equal(result, expected)
        test.end()
      })
    })
    sendNotificationTest.end()
  })

  notificationTest.test('startConsumer should', async startConsumerTest => {
    startConsumerTest.test('start the consumer and consumer messages', async test => {
      test.ok(Notification.startConsumer())
      test.end()
      process.exit(0)
    })
    startConsumerTest.end()
  })

  notificationTest.end()
})
