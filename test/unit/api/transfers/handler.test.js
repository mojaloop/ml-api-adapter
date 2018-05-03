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

const Sinon = require('sinon')
const Test = require('tapes')(require('tape'))
const P = require('bluebird')
const Config = require('../../../../src/lib/config')
const Handler = require('../../../../src/api/transfers/handler')
const TransferService = require('../../../../src/domain/transfer')

const createRequest = (payload) => {
  const requestPayload = payload || {}
  return {
    payload: requestPayload,
    server: {
      log: () => { }
    }
  }
}

Test('transfer handler', handlerTest => {
  let sandbox
  let originalHostName
  const hostname = 'http://some-host'

  handlerTest.beforeEach(t => {
    sandbox = Sinon.sandbox.create()
    sandbox.stub(TransferService, 'prepare')
    originalHostName = Config.HOSTNAME
    Config.HOSTNAME = hostname
    t.end()
  })

  handlerTest.afterEach(t => {
    Config.HOSTNAME = originalHostName
    sandbox.restore()
    t.end()
  })

  handlerTest.test('create should', async createTransferTest => {
    createTransferTest.test('reply with status code 202 if message is sent successfully to kafka', test => {
      const payload = {
        transferId: 'b51ec534-ee48-4575-b6a9-ead2955b8069',
        payeeFsp: '1234',
        payerFsp: '5678',
        amount: {
          currency: 'USD',
          amount: '123.45'
        },
        ilpPacket: 'AYIBgQAAAAAAAASwNGxldmVsb25lLmRmc3AxLm1lci45T2RTOF81MDdqUUZERmZlakgyOVc4bXFmNEpLMHlGTFGCAUBQU0svMS4wCk5vbmNlOiB1SXlweUYzY3pYSXBFdzVVc05TYWh3CkVuY3J5cHRpb246IG5vbmUKUGF5bWVudC1JZDogMTMyMzZhM2ItOGZhOC00MTYzLTg0NDctNGMzZWQzZGE5OGE3CgpDb250ZW50LUxlbmd0aDogMTM1CkNvbnRlbnQtVHlwZTogYXBwbGljYXRpb24vanNvbgpTZW5kZXItSWRlbnRpZmllcjogOTI4MDYzOTEKCiJ7XCJmZWVcIjowLFwidHJhbnNmZXJDb2RlXCI6XCJpbnZvaWNlXCIsXCJkZWJpdE5hbWVcIjpcImFsaWNlIGNvb3BlclwiLFwiY3JlZGl0TmFtZVwiOlwibWVyIGNoYW50XCIsXCJkZWJpdElkZW50aWZpZXJcIjpcIjkyODA2MzkxXCJ9IgA',
        condition: 'f5sqb7tBTWPd5Y8BDFdMm9BJR_MNI4isf8p8n4D5pHA',
        expiration: '2016-05-24T08:38:08.699-04:00',
        extensionList:
        {
          extension:
          [
            {
              key: 'errorDescription',
              value: 'This is a more detailed error description'
            },
            {
              key: 'errorDescription',
              value: 'This is a more detailed error description'
            }
          ]
        }
      }

      TransferService.prepare.returns(P.resolve(true))

      const request = createRequest(payload)
      const reply = {
        response: (response) => {
          test.equal(response, true)
          return {
            code: statusCode => {
              test.equal(statusCode, 202)
              test.end()
            }
          }
        }
      }

      Handler.create(request, reply)
    })

    createTransferTest.test('return error if transfer create throws', async test => {
      const payload = {
        transferId: 'invalid transferId',
        payeeFsp: '1234',
        payerFsp: '5678',
        amount: {
          currency: 'USD',
          amount: '123.45'
        },
        ilpPacket: 'AYIBgQAAAAAAAASwNGxldmVsb25lLmRmc3AxLm1lci45T2RTOF81MDdqUUZERmZlakgyOVc4bXFmNEpLMHlGTFGCAUBQU0svMS4wCk5vbmNlOiB1SXlweUYzY3pYSXBFdzVVc05TYWh3CkVuY3J5cHRpb246IG5vbmUKUGF5bWVudC1JZDogMTMyMzZhM2ItOGZhOC00MTYzLTg0NDctNGMzZWQzZGE5OGE3CgpDb250ZW50LUxlbmd0aDogMTM1CkNvbnRlbnQtVHlwZTogYXBwbGljYXRpb24vanNvbgpTZW5kZXItSWRlbnRpZmllcjogOTI4MDYzOTEKCiJ7XCJmZWVcIjowLFwidHJhbnNmZXJDb2RlXCI6XCJpbnZvaWNlXCIsXCJkZWJpdE5hbWVcIjpcImFsaWNlIGNvb3BlclwiLFwiY3JlZGl0TmFtZVwiOlwibWVyIGNoYW50XCIsXCJkZWJpdElkZW50aWZpZXJcIjpcIjkyODA2MzkxXCJ9IgA',
        condition: 'f5sqb7tBTWPd5Y8BDFdMm9BJR_MNI4isf8p8n4D5pHA',
        expiration: '2016-05-24T08:38:08.699-04:00',
        extensionList:
        {
          extension:
          [
            {
              key: 'errorDescription',
              value: 'This is a more detailed error description'
            },
            {
              key: 'errorDescription',
              value: 'This is a more detailed error description'
            }
          ]
        }
      }

      const error = new Error()
      TransferService.prepare.returns(P.reject(error))

      try {
        await Handler.create(createRequest(payload))
      } catch (e) {
        test.ok(e instanceof Error)
        test.equal(e.message, 'An error has occurred')
        test.end()
      }
    })

    createTransferTest.end()
  })

  handlerTest.test('receiveNotification should', async receiveNotificationTest => {
    receiveNotificationTest.test('reply with status code 200 if a notification is received', test => {
      const payload = {
        transferId: 'b51ec534-ee48-4575-b6a9-ead2955b8069',
        payeeFsp: '1234',
        payerFsp: '5678',
        amount: {
          currency: 'USD',
          amount: '123.45'
        },
        ilpPacket: 'AYIBgQAAAAAAAASwNGxldmVsb25lLmRmc3AxLm1lci45T2RTOF81MDdqUUZERmZlakgyOVc4bXFmNEpLMHlGTFGCAUBQU0svMS4wCk5vbmNlOiB1SXlweUYzY3pYSXBFdzVVc05TYWh3CkVuY3J5cHRpb246IG5vbmUKUGF5bWVudC1JZDogMTMyMzZhM2ItOGZhOC00MTYzLTg0NDctNGMzZWQzZGE5OGE3CgpDb250ZW50LUxlbmd0aDogMTM1CkNvbnRlbnQtVHlwZTogYXBwbGljYXRpb24vanNvbgpTZW5kZXItSWRlbnRpZmllcjogOTI4MDYzOTEKCiJ7XCJmZWVcIjowLFwidHJhbnNmZXJDb2RlXCI6XCJpbnZvaWNlXCIsXCJkZWJpdE5hbWVcIjpcImFsaWNlIGNvb3BlclwiLFwiY3JlZGl0TmFtZVwiOlwibWVyIGNoYW50XCIsXCJkZWJpdElkZW50aWZpZXJcIjpcIjkyODA2MzkxXCJ9IgA',
        condition: 'f5sqb7tBTWPd5Y8BDFdMm9BJR_MNI4isf8p8n4D5pHA',
        expiration: '2016-05-24T08:38:08.699-04:00',
        extensionList:
        {
          extension:
          [
            {
              key: 'errorDescription',
              value: 'This is a more detailed error description'
            },
            {
              key: 'errorDescription',
              value: 'This is a more detailed error description'
            }
          ]
        }
      }

      // TransferService.prepare.returns(P.resolve(true))
      // console.log.returns(P.resolve(true))

      const request = createRequest(payload)
      const reply = {
        response: (response) => {
          test.equal(response, true)
          return {
            code: statusCode => {
              test.equal(statusCode, 200)
              test.end()
            }
          }
        }
      }

      Handler.receiveNotification(request, reply)
    })

    receiveNotificationTest.end()
  })

  handlerTest.end()
})
