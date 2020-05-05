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

const EventSdk = require('@mojaloop/event-sdk')
const Test = require('tapes')(require('tape'))
const Sinon = require('sinon')
const Uuid = require('uuid4')
const Service = require('../../../../src/domain/transfer')
const KafkaUtil = require('@mojaloop/central-services-shared').Util.Kafka
const Kafka = require('@mojaloop/central-services-stream').Util
const Enum = require('@mojaloop/central-services-shared').Enum
const Config = require('../../../../src/lib/config')
const Logger = require('@mojaloop/central-services-logger')

const TRANSFER = 'transfer'
const PREPARE = 'prepare'
const FULFIL = 'fulfil'
const dataUri = ''

Test('Transfer Service tests', serviceTest => {
  let sandbox

  serviceTest.beforeEach(t => {
    sandbox = Sinon.createSandbox()
    sandbox.stub(Logger, 'isErrorEnabled').value(true)
    sandbox.stub(Logger, 'isInfoEnabled').value(true)
    sandbox.stub(Logger, 'isDebugEnabled').value(true)
    sandbox.stub(Kafka.Producer, 'produceMessage')
    sandbox.stub(Kafka.Producer, 'disconnect').returns(Promise.resolve(true))
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

      const kafkaConfig = KafkaUtil.getKafkaConfig(Config.KAFKA_CONFIG, Enum.Kafka.Config.PRODUCER, Enum.Events.Event.Type.TRANSFER.toUpperCase(), Enum.Events.Event.Action.PREPARE.toUpperCase())
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
      const topicConfig = KafkaUtil.createGeneralTopicConf(Config.KAFKA_CONFIG.TOPIC_TEMPLATES.GENERAL_TOPIC_TEMPLATE.TEMPLATE, Enum.Events.Event.Type.TRANSFER, Enum.Events.Event.Action.PREPARE, null, message.transferId)
      Kafka.Producer.produceMessage.withArgs(messageProtocol, topicConfig, kafkaConfig).returns(Promise.resolve(true))

      const span = EventSdk.Tracer.createSpan('test_span')

      const result = await Service.prepare(headers, dataUri, message, span)
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
      Kafka.Producer.produceMessage.returns(Promise.reject(error))
      try {
        const span = EventSdk.Tracer.createSpan('test_span')
        await Service.prepare(headers, dataUri, message, span)
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
      const kafkaConfig = KafkaUtil.getKafkaConfig(Config.KAFKA_CONFIG, Enum.Kafka.Config.PRODUCER, Enum.Events.Event.Type.TRANSFER.toUpperCase(), Enum.Events.Event.Action.FULFIL.toUpperCase())
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
      const topicConfig = KafkaUtil.createGeneralTopicConf(Config.KAFKA_CONFIG.TOPIC_TEMPLATES.GENERAL_TOPIC_TEMPLATE.TEMPLATE, TRANSFER, FULFIL, null, message.transferId)

      Kafka.Producer.produceMessage.withArgs(messageProtocol, topicConfig, kafkaConfig).returns(Promise.resolve(true))
      const span = EventSdk.Tracer.createSpan('test_span')
      const result = await Service.fulfil(headers, dataUri, message, { id }, span)
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
      Kafka.Producer.produceMessage.returns(Promise.reject(error))
      try {
        const span = EventSdk.Tracer.createSpan('test_span')
        await Service.fulfil(headers, dataUri, message, { id }, span)
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
      Kafka.Producer.produceMessage.returns(Promise.reject(error))
      try {
        const span = EventSdk.Tracer.createSpan('test_span')
        await Service.fulfil(headers, dataUri, message, { id }, span)
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
      const id = message.transferId
      const headers = {}
      const kafkaConfig = KafkaUtil.getKafkaConfig(Config.KAFKA_CONFIG, Enum.Kafka.Config.PRODUCER, Enum.Events.Event.Type.TRANSFER.toUpperCase(), Enum.Events.Event.Action.PREPARE.toUpperCase())
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
      const topicConfig = KafkaUtil.createGeneralTopicConf(Config.KAFKA_CONFIG.TOPIC_TEMPLATES.GENERAL_TOPIC_TEMPLATE.TEMPLATE, TRANSFER, PREPARE, null, message.transferId)

      Kafka.Producer.produceMessage.withArgs(messageProtocol, topicConfig, kafkaConfig).returns(Promise.resolve(true))
      const span = EventSdk.Tracer.createSpan('test_span')

      const result = await Service.getTransferById(headers, { id }, span)
      test.equals(result, true)
      test.end()
    })
    await getTransferByIdTest.test('throw error', async test => {
      const id = 'b51ec534-ee48-4575-b6a9-ead2955b8069'
      const headers = {}
      const error = new Error()
      Kafka.Producer.produceMessage.rejects(error)
      try {
        await Service.getTransferById(headers, { id })
        test.fail('does not throw')
        test.end()
      } catch (e) {
        test.ok(e instanceof Error)
        test.end()
      }
    })
    getTransferByIdTest.end()
  })
  serviceTest.test('transferError should', async transferErrorTest => {
    const message = {
      errorCode: '5001',
      errorDescription: 'Payee FSP has insufficient liquidity to perform the transfer',
      fulfilment: 'f5sqb7tBTWPd5Y8BDFdMm9BJR_MNI4isf8p8n4D5pHA',
      extensionList: {
        extension: [{
          key: 'errorDescription',
          value: 'This is a more detailed error description'
        }]
      }
    }
    const headers = {}
    const id = '888ec534-ee48-4575-b6a9-ead2955b8930'
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
          action: 'abort',
          createdAt: new Date(),
          state: {
            status: 'success',
            code: 0
          }
        }
      }
    }

    await transferErrorTest.test('execute function', async test => {
      const kafkaConfig = KafkaUtil.getKafkaConfig(Config.KAFKA_CONFIG, Enum.Kafka.Config.PRODUCER, Enum.Events.Event.Type.TRANSFER.toUpperCase(), Enum.Events.Event.Action.FULFIL.toUpperCase())
      const topicConfig = KafkaUtil.createGeneralTopicConf(Config.KAFKA_CONFIG.TOPIC_TEMPLATES.GENERAL_TOPIC_TEMPLATE.TEMPLATE, TRANSFER, FULFIL, null, message.transferId)
      Kafka.Producer.produceMessage.withArgs(messageProtocol, topicConfig, kafkaConfig).returns(Promise.resolve(true))
      const span = EventSdk.Tracer.createSpan('test_span')
      const result = await Service.transferError(headers, dataUri, message, { id }, span)
      test.equals(result, true)
      test.end()
    })

    await transferErrorTest.test('throw error', async test => {
      const error = new Error()
      Kafka.Producer.produceMessage.returns(Promise.reject(error))
      try {
        const span = EventSdk.Tracer.createSpan('test_span')
        await Service.transferError(headers, dataUri, message, { id }, span)
        test.fail('error not thrown')
      } catch (e) {
        test.ok(e instanceof Error)
        test.end()
      }
    })

    transferErrorTest.end()
  })

  serviceTest.test('message format tests', formatTest => {
    /* Test Data */
    const transferId = 'b51ec534-ee48-4575-b6a9-ead2955b8069'
    const message = {
      transferId,
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

    formatTest.test('prepare should call `produceMessage` with the correct messageProtocol format', async test => {
      // Arrange
      let resultMessageProtocol = {}
      // stub and unwrap the message sent to `Kafka.Producer.produceMessage`
      Kafka.Producer.produceMessage = (messageProtocol, topicConfig, kafkaConfig) => {
        resultMessageProtocol = messageProtocol
      }

      const expectedMessageProtocol = {
        to: message.payeeFsp,
        from: message.payerFsp,
        type: 'application/json',
        content: {
          uriParams: {
            id: message.transferId
          },
          headers,
          payload: {}
        },
        metadata: {
          correlationId: transferId,
          event: {
            type: 'prepare',
            action: 'prepare',
            state: {
              status: 'success',
              code: 0,
              description: 'action successful'
            }
          }
        }
      }

      const span = EventSdk.Tracer.createSpan('test_span')

      // Act
      await Service.prepare(headers, dataUri, message, span)

      test.equal(resultMessageProtocol.metadata.trace.service, 'test_span')

      // Delete non-deterministic fields
      delete resultMessageProtocol.id
      delete resultMessageProtocol.metadata.event.id
      delete resultMessageProtocol.metadata.event.createdAt
      delete resultMessageProtocol.metadata.trace

      // Assert
      test.deepEqual(resultMessageProtocol, expectedMessageProtocol, 'messageProtocols should match')
      test.end()
    })

    // TODO: I'm not sure this is a valid case
    formatTest.test('prepare should not fail if message.transferId is undefined', async test => {
      // Arrange
      let resultMessageProtocol = {}
      delete message.transferId
      // stub and unwrap the message sent to `Kafka.Producer.produceMessage`
      Kafka.Producer.produceMessage = (messageProtocol, topicConfig, kafkaConfig) => {
        resultMessageProtocol = messageProtocol
      }

      const expectedMessageProtocol = {
        to: message.payeeFsp,
        from: message.payerFsp,
        type: 'application/json',
        content: {
          uriParams: {
            id: undefined
          },
          headers,
          payload: {}
        },
        metadata: {
          correlationId: undefined,
          event: {
            type: 'prepare',
            action: 'prepare',
            state: {
              status: 'success',
              code: 0,
              description: 'action successful'
            }
          }
        }
      }

      const span = EventSdk.Tracer.createSpan('test_span')

      // Act
      await Service.prepare(headers, dataUri, message, span)

      test.equal(resultMessageProtocol.metadata.trace.service, 'test_span')

      // Delete non-deterministic fields
      delete resultMessageProtocol.id
      delete resultMessageProtocol.metadata.event.id
      delete resultMessageProtocol.metadata.event.createdAt
      delete resultMessageProtocol.metadata.trace

      // Assert
      test.deepEqual(resultMessageProtocol, expectedMessageProtocol, 'messageProtocols should match')
      test.end()
    })

    formatTest.end()
  })

  serviceTest.end()
})
