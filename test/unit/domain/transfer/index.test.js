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

 - Shashikant Hirugade <shashikant.hirugade@modusbox.com>
 --------------
 ******/

'use strict'

const Test = require('tapes')(require('tape'))
const Sinon = require('sinon')
const P = require('bluebird')
const Uuid = require('uuid4')
const Service = require('../../../../src/domain/transfer')
const Kafka = require('../../../../src/lib/kafka')
const Utility = require('../../../../src/lib/utility')
const axios = require('axios')

const TRANSFER = 'transfer'
const PREPARE = 'prepare'
const FULFIL = 'fulfil'

Test('Transfer Service tests', serviceTest => {
  let sandbox

  serviceTest.beforeEach(t => {
    sandbox = Sinon.createSandbox()
    sandbox.stub(Kafka.Producer, 'produceMessage')
    sandbox.stub(Kafka.Producer, 'disconnect').returns(P.resolve(true))
    sandbox.stub(axios, 'get').returns(P.resolve({ data: { destination: 'test' } }))
    t.end()
  })

  serviceTest.afterEach(t => {
    sandbox.restore()
    t.end()
  })

  serviceTest.test('prepare should', prepareTest => {
    prepareTest.test('execute prepare function', async test => {
      const message = {
        transferId: 'b51ec534-ee48-4575-b6a9-ead2955b8069',
        payeeFsp: '1234',
        payerFsp: '5678',
        amount: {
          currency: 'USD',
          amount: 123.45
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

      const headers = {}

      const kafkaConfig = Utility.getKafkaConfig(Utility.ENUMS.PRODUCER, TRANSFER.toUpperCase(), PREPARE.toUpperCase())
      const messageProtocol = {
        id: message.transferId,
        to: message.payeeFsp,
        from: message.payerFsp,
        type: 'application/vnd.interoperability.transfers+json;version=1.0',
        content: {
          headers: headers,
          payload: message
        },
        metadata: {
          event: {
            id: Uuid(),
            type: 'prepare',
            action: 'prepare',
            createdAt: new Date(),
            status: 'success'
          }
        }
      }
      const topicConfig = Utility.createGeneralTopicConf(TRANSFER, PREPARE, null, message.transferId)

      Kafka.Producer.produceMessage.withArgs(messageProtocol, topicConfig, kafkaConfig).returns(P.resolve(true))

      let result = await Service.prepare(headers, message)
      test.equals(result, true)
      test.end()
    })
    prepareTest.test('throw error if error while publishing message to kafka', async test => {
      const message = {
        transferId: 'b51ec534-ee48-4575-b6a9-ead2955b8069',
        payeeFsp: '1234',
        payerFsp: '5678',
        amount: {
          currency: 'USD',
          amount: 123.45
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

      const headers = {}
      const error = new Error()
      Kafka.Producer.produceMessage.returns(P.reject(error))
      try {
        await Service.prepare(headers, message)
      } catch (e) {
        test.ok(e instanceof Error)
        test.end()
      }
    })

    prepareTest.end()
  })

  serviceTest.test('fulfil should', fulfilTest => {
    fulfilTest.test('execute fulfil function', async test => {
      const message = {
        transferState: 'RECEIVED',
        fulfilment: 'f5sqb7tBTWPd5Y8BDFdMm9BJR_MNI4isf8p8n4D5pHA',
        completedTimestamp: '2016-05-24T08:38:08.699-04:00',
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

      const headers = {}
      const id = 'dfsp1'
      const kafkaConfig = Utility.getKafkaConfig(Utility.ENUMS.PRODUCER, TRANSFER.toUpperCase(), FULFIL.toUpperCase())
      const messageProtocol = {
        id,
        to: headers['fspiop-destination'],
        from: headers['fspiop-source'],
        type: 'application/vnd.interoperability.transfers+json;version=1.0',
        content: {
          headers: headers,
          payload: message
        },
        metadata: {
          event: {
            id: Uuid(),
            type: 'fulfil',
            action: 'commit',
            createdAt: new Date(),
            state: {
              status: 'success',
              code: 0
            }
          }
        }
      }
      const topicConfig = Utility.createGeneralTopicConf(TRANSFER, PREPARE, null, message.transferId)

      Kafka.Producer.produceMessage.withArgs(messageProtocol, topicConfig, kafkaConfig).returns(P.resolve(true))
      let result = await Service.fulfil(id, headers, message)
      test.equals(result, true)
      test.end()
    })

    fulfilTest.test('execute fulfil function', async test => {
      const message = {
        transferState: 'COMMITTED',
        fulfilment: 'f5sqb7tBTWPd5Y8BDFdMm9BJR_MNI4isf8p8n4D5pHA',
        completedTimestamp: '2016-05-24T08:38:08.699-04:00',
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

      const headers = {}
      const id = 'dfsp1'
      const error = new Error()

      Kafka.Producer.produceMessage.returns(P.reject(error))
      try {
        await Service.fulfil(id, headers, message)
      } catch (e) {
        test.ok(e instanceof Error)
        test.end()
      }
    })

    fulfilTest.test('execute fulfil function', async test => {
      const message = {
        transferState: 'ABORTED',
        fulfilment: 'f5sqb7tBTWPd5Y8BDFdMm9BJR_MNI4isf8p8n4D5pHA',
        completedTimestamp: '2016-05-24T08:38:08.699-04:00',
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

      const headers = {}
      const id = 'dfsp1'
      const error = new Error()

      Kafka.Producer.produceMessage.returns(P.reject(error))
      try {
        await Service.fulfil(id, headers, message)
      } catch (e) {
        test.ok(e instanceof Error)
        test.end()
      }
    })
    fulfilTest.end()
  })
  serviceTest.test('getById should', async getTransferByIdTest => {
    await getTransferByIdTest.test('return transfer', async test => {
      const message = {
        transferId: 'b51ec534-ee48-4575-b6a9-ead2955b8069',
        payeeFsp: '1234',
        payerFsp: '5678',
        amount: {
          currency: 'USD',
          amount: 123.45
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

      const headers = {}
      const kafkaConfig = Utility.getKafkaConfig(Utility.ENUMS.PRODUCER, TRANSFER.toUpperCase(), PREPARE.toUpperCase())
      const messageProtocol = {
        id: message.id,
        to: message.payeeFsp,
        from: message.payerFsp,
        type: 'application/vnd.interoperability.transfers+json;version=1.0',
        content: {
          headers: headers,
          payload: message
        },
        metadata: {
          event: {
            id: Uuid(),
            type: 'prepare',
            action: 'prepare',
            createdAt: new Date(),
            status: 'success'
          }
        }
      }
      const topicConfig = Utility.createGeneralTopicConf(TRANSFER, PREPARE, null, message.transferId)

      Kafka.Producer.produceMessage.withArgs(messageProtocol, topicConfig, kafkaConfig).returns(P.resolve(true))

      let result = await Service.getTransferById(headers, message)
      test.equals(result, true)
      test.end()
    })
    await getTransferByIdTest.test('throw error', async test => {
      const message = {
        transferId: 'b51ec534-ee48-4575-b6a9-ead2955b8069',
        payeeFsp: '1234',
        payerFsp: '5678',
        amount: {
          currency: 'USD',
          amount: 123.45
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

      const headers = {}
      const error = new Error()
      Kafka.Producer.produceMessage.rejects(error)
      try {
        await Service.getTransferById(headers, message)
        test.fail('does not throw')
        test.end()
      } catch (e) {
        test.ok(e instanceof Error)
        test.end()
      }
    })
    getTransferByIdTest.end()
  })
  serviceTest.end()
})
