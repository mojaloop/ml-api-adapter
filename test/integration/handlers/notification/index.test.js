'use strict'

const src = '../../../../src'
const Test = require('tapes')(require('tape'))
const Uuid = require('uuid4')
const request = require('request')

const Kafka = require(`${src}/lib/kafka`)
const Utility = require(`${src}/lib/utility`)

const TRANSFER = 'transfer'
const PREPARE = 'prepare'

let getNotificationUrl = process.env.ENDPOINT_URL || 'http://localhost:4545/notification'
console.log('!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!')
console.log(getNotificationUrl)
console.log('!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!')
console.log(process.env.ENDPOINT_URL)
console.log('!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!')
Test('Notification Handler', notificationHandlerTest => {
  notificationHandlerTest.test('should', async notificationTest => {
    notificationTest.test('consume a PREPARE message and send POST callback', async test => {
      const transferId = Uuid()
      const kafkaConfig = Utility.getKafkaConfig(Utility.ENUMS.PRODUCER, TRANSFER.toUpperCase(), PREPARE.toUpperCase())
      const messageProtocol = {
        metadata: {
          event: {
            id: Uuid(),
            createdAt: new Date(),
            type: 'prepare',
            action: 'prepare',
            state: {
              status: 'success',
              code: 0
            }
          }
        },
        content: {
          headers: {
            'content-length': 1038,
            'content-type': 'application/json',
            'date': '2017-11-02T00:00:00.000Z',
            'fspiop-destination': 'dfsp2',
            'fspiop-source': 'dfsp1'
          },
          payload: {
            amount: { amount: 100, currency: 'USD' },
            condition: 'uU0nuZNNPgilLlLX2n2r-sSE7-N6U4DukIj3rOLvze1',
            expiration: '2018-08-24T21:31:00.534+01:00',
            ilpPacket: 'AQAAAAAAAABkEGcuZXdwMjEuaWQuODAwMjCCAhd7InRyYW5zYWN0aW9uSWQiOiJmODU0NzdkYi0xMzVkLTRlMDgtYThiNy0xMmIyMmQ4MmMwZDYiLCJxdW90ZUlkIjoiOWU2NGYzMjEtYzMyNC00ZDI0LTg5MmYtYzQ3ZWY0ZThkZTkxIiwicGF5ZWUiOnsicGFydHlJZEluZm8iOnsicGFydHlJZFR5cGUiOiJNU0lTRE4iLCJwYXJ0eUlkZW50aWZpZXIiOiIyNTYxMjM0NTYiLCJmc3BJZCI6IjIxIn19LCJwYXllciI6eyJwYXJ0eUlkSW5mbyI6eyJwYXJ0eUlkVHlwZSI6Ik1TSVNETiIsInBhcnR5SWRlbnRpZmllciI6IjI1NjIwMTAwMDAxIiwiZnNwSWQiOiIyMCJ9LCJwZXJzb25hbEluZm8iOnsiY29tcGxleE5hbWUiOnsiZmlyc3ROYW1lIjoiTWF0cyIsImxhc3ROYW1lIjoiSGFnbWFuIn0sImRhdGVPZkJpcnRoIjoiMTk4My0xMC0yNSJ9fSwiYW1vdW50Ijp7ImFtb3VudCI6IjEwMCIsImN1cnJlbmN5IjoiVVNEIn0sInRyYW5zYWN0aW9uVHlwZSI6eyJzY2VuYXJpbyI6IlRSQU5TRkVSIiwiaW5pdGlhdG9yIjoiUEFZRVIiLCJpbml0aWF0b3JUeXBlIjoiQ09OU1VNRVIifSwibm90ZSI6ImhlaiJ9',
            payeeFsp: 'dfsp1',
            payerFsp: 'dfsp2',
            transferId: transferId
          }
        },
        to: 'dfsp2',
        from: 'dfsp1',
        id: transferId,
        type: 'application/json'
      }

      const topicConfig = {
        topicName: Utility.getNotificationTopicName()
      }

      await Kafka.Producer.produceMessage(messageProtocol, topicConfig, kafkaConfig)
      sleep(10)
      const response = await getNotifications(messageProtocol.to, transferId)
      test.equal(response, JSON.stringify(messageProtocol.content.payload), 'Notification sent successfully to Payee')
      test.end()
    })

    notificationTest.test('consume a PREPARE message and send PUT callback on error', async test => {
      const kafkaConfig = Utility.getKafkaConfig(Utility.ENUMS.PRODUCER, TRANSFER.toUpperCase(), PREPARE.toUpperCase())
      const transferId = Uuid()
      const messageProtocol = {
        metadata: {
          event: {
            id: Uuid(),
            createdAt: new Date(),
            type: 'prepare',
            action: 'prepare',
            state: {
              code: 3100,
              description: 'Generic validation error',
              status: 'error'
            }
          }
        },
        content: {
          headers: {
            'content-length': 1038,
            'content-type': 'application/json',
            'date': '2017-11-02T00:00:00.000Z',
            'fspiop-destination': 'dfsp2',
            'fspiop-source': 'dfsp1'
          },
          payload: {
            errorInformation: {
              errorCode: 3100,
              errorDescription: 'Generic validation error'
            }
          }
        },
        to: 'dfsp2',
        from: 'dfsp1',
        id: transferId,
        type: 'application/json'
      }

      const topicConfig = {
        topicName: Utility.getNotificationTopicName()
      }

      await Kafka.Producer.produceMessage(messageProtocol, topicConfig, kafkaConfig)
      sleep(10)
      const response = await getNotifications(messageProtocol.from, transferId)
      test.equal(response, JSON.stringify(messageProtocol.content.payload), 'Error notification sent successfully to Payer')
      test.end()
    })

    notificationTest.test('consume a COMMIT message and send PUT callback', async test => {
      const transferId = Uuid()
      const kafkaConfig = Utility.getKafkaConfig(Utility.ENUMS.PRODUCER, TRANSFER.toUpperCase(), PREPARE.toUpperCase())
      const messageProtocol = {
        metadata: {
          event: {
            id: Uuid(),
            createdAt: new Date(),
            type: 'commit',
            action: 'commit',
            state: {
              status: 'success',
              code: 0
            }
          }
        },
        content: {
          headers: {
            'content-length': 1038,
            'content-type': 'application/json',
            'date': '2017-11-02T00:00:00.000Z',
            'fspiop-destination': 'dfsp2',
            'fspiop-source': 'dfsp1'
          },
          payload: {
            amount: { amount: 100, currency: 'USD' },
            transferState: 'COMMITTED',
            fulfilment: 'f5sqb7tBTWPd5Y8BDFdMm9BJR_MNI4isf8p8n4D5pHA',
            condition: 'uU0nuZNNPgilLlLX2n2r-sSE7-N6U4DukIj3rOLvze1',
            expiration: '2018-08-24T21:31:00.534+01:00',
            ilpPacket: 'AQAAAAAAAABkEGcuZXdwMjEuaWQuODAwMjCCAhd7InRyYW5zYWN0aW9uSWQiOiJmODU0NzdkYi0xMzVkLTRlMDgtYThiNy0xMmIyMmQ4MmMwZDYiLCJxdW90ZUlkIjoiOWU2NGYzMjEtYzMyNC00ZDI0LTg5MmYtYzQ3ZWY0ZThkZTkxIiwicGF5ZWUiOnsicGFydHlJZEluZm8iOnsicGFydHlJZFR5cGUiOiJNU0lTRE4iLCJwYXJ0eUlkZW50aWZpZXIiOiIyNTYxMjM0NTYiLCJmc3BJZCI6IjIxIn19LCJwYXllciI6eyJwYXJ0eUlkSW5mbyI6eyJwYXJ0eUlkVHlwZSI6Ik1TSVNETiIsInBhcnR5SWRlbnRpZmllciI6IjI1NjIwMTAwMDAxIiwiZnNwSWQiOiIyMCJ9LCJwZXJzb25hbEluZm8iOnsiY29tcGxleE5hbWUiOnsiZmlyc3ROYW1lIjoiTWF0cyIsImxhc3ROYW1lIjoiSGFnbWFuIn0sImRhdGVPZkJpcnRoIjoiMTk4My0xMC0yNSJ9fSwiYW1vdW50Ijp7ImFtb3VudCI6IjEwMCIsImN1cnJlbmN5IjoiVVNEIn0sInRyYW5zYWN0aW9uVHlwZSI6eyJzY2VuYXJpbyI6IlRSQU5TRkVSIiwiaW5pdGlhdG9yIjoiUEFZRVIiLCJpbml0aWF0b3JUeXBlIjoiQ09OU1VNRVIifSwibm90ZSI6ImhlaiJ9',
            payeeFsp: 'dfsp1',
            payerFsp: 'dfsp2',
            transferId: transferId
          }
        },
        to: 'dfsp2',
        from: 'dfsp1',
        id: transferId,
        type: 'application/json'
      }

      const topicConfig = {
        topicName: Utility.getNotificationTopicName()
      }

      await Kafka.Producer.produceMessage(messageProtocol, topicConfig, kafkaConfig)
      sleep(10)
      const responseFrom = await getNotifications(messageProtocol.from, transferId)
      const responseTo = await getNotifications(messageProtocol.to, transferId)
      test.equal(responseFrom, JSON.stringify(messageProtocol.content.payload), 'Notification sent successfully to Payer')
      test.equal(responseTo, JSON.stringify(messageProtocol.content.payload), 'Notification sent successfully to Payee')
      test.end()
    })

    notificationTest.test('consume a COMMIT message and send PUT callback on error', async test => {
      const kafkaConfig = Utility.getKafkaConfig(Utility.ENUMS.PRODUCER, TRANSFER.toUpperCase(), PREPARE.toUpperCase())
      const transferId = Uuid()
      const messageProtocol = {
        metadata: {
          event: {
            id: Uuid(),
            createdAt: new Date(),
            type: 'commit',
            action: 'commit',
            state: {
              code: 3000,
              description: 'Generic error',
              status: 'error'
            }
          }
        },
        content: {
          headers: {
            'content-length': 1038,
            'content-type': 'application/json',
            'date': '2017-11-02T00:00:00.000Z',
            'fspiop-destination': 'dfsp2',
            'fspiop-source': 'dfsp1'
          },
          payload: {
            errorInformation: {
              errorCode: 3000,
              errorDescription: 'Generic error'
            }
          }
        },
        to: 'dfsp2',
        from: 'dfsp1',
        id: transferId,
        type: 'application/json'
      }

      const topicConfig = {
        topicName: Utility.getNotificationTopicName()
      }

      await Kafka.Producer.produceMessage(messageProtocol, topicConfig, kafkaConfig)
      sleep(10)
      const response = await getNotifications(messageProtocol.from, transferId)
      test.equal(response, JSON.stringify(messageProtocol.content.payload), 'Notification sent successfully to Payer')
      test.end()
    })

    notificationTest.test('consume a REJECT message and send PUT callback', async test => {
      const transferId = Uuid()
      const kafkaConfig = Utility.getKafkaConfig(Utility.ENUMS.PRODUCER, TRANSFER.toUpperCase(), PREPARE.toUpperCase())
      const messageProtocol = {
        metadata: {
          event: {
            id: Uuid(),
            createdAt: new Date(),
            type: 'reject',
            action: 'reject',
            state: {
              status: 'success',
              code: 0
            }
          }
        },
        content: {
          headers: {
            'content-length': 1038,
            'content-type': 'application/json',
            'date': '2017-11-02T00:00:00.000Z',
            'fspiop-destination': 'dfsp2',
            'fspiop-source': 'dfsp1'
          },
          payload: {
            amount: { amount: 100, currency: 'USD' },
            transferState: 'COMMITTED',
            fulfilment: 'f5sqb7tBTWPd5Y8BDFdMm9BJR_MNI4isf8p8n4D5pHA',
            condition: 'uU0nuZNNPgilLlLX2n2r-sSE7-N6U4DukIj3rOLvze1',
            expiration: '2018-08-24T21:31:00.534+01:00',
            ilpPacket: 'AQAAAAAAAABkEGcuZXdwMjEuaWQuODAwMjCCAhd7InRyYW5zYWN0aW9uSWQiOiJmODU0NzdkYi0xMzVkLTRlMDgtYThiNy0xMmIyMmQ4MmMwZDYiLCJxdW90ZUlkIjoiOWU2NGYzMjEtYzMyNC00ZDI0LTg5MmYtYzQ3ZWY0ZThkZTkxIiwicGF5ZWUiOnsicGFydHlJZEluZm8iOnsicGFydHlJZFR5cGUiOiJNU0lTRE4iLCJwYXJ0eUlkZW50aWZpZXIiOiIyNTYxMjM0NTYiLCJmc3BJZCI6IjIxIn19LCJwYXllciI6eyJwYXJ0eUlkSW5mbyI6eyJwYXJ0eUlkVHlwZSI6Ik1TSVNETiIsInBhcnR5SWRlbnRpZmllciI6IjI1NjIwMTAwMDAxIiwiZnNwSWQiOiIyMCJ9LCJwZXJzb25hbEluZm8iOnsiY29tcGxleE5hbWUiOnsiZmlyc3ROYW1lIjoiTWF0cyIsImxhc3ROYW1lIjoiSGFnbWFuIn0sImRhdGVPZkJpcnRoIjoiMTk4My0xMC0yNSJ9fSwiYW1vdW50Ijp7ImFtb3VudCI6IjEwMCIsImN1cnJlbmN5IjoiVVNEIn0sInRyYW5zYWN0aW9uVHlwZSI6eyJzY2VuYXJpbyI6IlRSQU5TRkVSIiwiaW5pdGlhdG9yIjoiUEFZRVIiLCJpbml0aWF0b3JUeXBlIjoiQ09OU1VNRVIifSwibm90ZSI6ImhlaiJ9',
            payeeFsp: 'dfsp1',
            payerFsp: 'dfsp2',
            transferId: transferId
          }
        },
        to: 'dfsp2',
        from: 'dfsp1',
        id: transferId,
        type: 'application/json'
      }

      const topicConfig = {
        topicName: Utility.getNotificationTopicName()
      }

      await Kafka.Producer.produceMessage(messageProtocol, topicConfig, kafkaConfig)
      sleep(10)
      const responseFrom = await getNotifications(messageProtocol.from, transferId)
      const responseTo = await getNotifications(messageProtocol.to, transferId)
      test.equal(responseFrom, JSON.stringify(messageProtocol.content.payload), 'Notification sent successfully to Payer')
      test.equal(responseTo, JSON.stringify(messageProtocol.content.payload), 'Notification sent successfully to Payee')
      test.end()
    })

    notificationTest.test('consume a ABORT message and send PUT callback', async test => {
      const transferId = Uuid()
      const kafkaConfig = Utility.getKafkaConfig(Utility.ENUMS.PRODUCER, TRANSFER.toUpperCase(), PREPARE.toUpperCase())
      const messageProtocol = {
        metadata: {
          event: {
            id: Uuid(),
            createdAt: new Date(),
            type: 'abort',
            action: 'abort',
            state: {
              status: 'success',
              code: 0
            }
          }
        },
        content: {
          headers: {
            'content-length': 1038,
            'content-type': 'application/json',
            'date': '2017-11-02T00:00:00.000Z',
            'fspiop-destination': 'dfsp2',
            'fspiop-source': 'dfsp1'
          },
          payload: {
            amount: { amount: 100, currency: 'USD' },
            transferState: 'COMMITTED',
            fulfilment: 'f5sqb7tBTWPd5Y8BDFdMm9BJR_MNI4isf8p8n4D5pHA',
            condition: 'uU0nuZNNPgilLlLX2n2r-sSE7-N6U4DukIj3rOLvze1',
            expiration: '2018-08-24T21:31:00.534+01:00',
            ilpPacket: 'AQAAAAAAAABkEGcuZXdwMjEuaWQuODAwMjCCAhd7InRyYW5zYWN0aW9uSWQiOiJmODU0NzdkYi0xMzVkLTRlMDgtYThiNy0xMmIyMmQ4MmMwZDYiLCJxdW90ZUlkIjoiOWU2NGYzMjEtYzMyNC00ZDI0LTg5MmYtYzQ3ZWY0ZThkZTkxIiwicGF5ZWUiOnsicGFydHlJZEluZm8iOnsicGFydHlJZFR5cGUiOiJNU0lTRE4iLCJwYXJ0eUlkZW50aWZpZXIiOiIyNTYxMjM0NTYiLCJmc3BJZCI6IjIxIn19LCJwYXllciI6eyJwYXJ0eUlkSW5mbyI6eyJwYXJ0eUlkVHlwZSI6Ik1TSVNETiIsInBhcnR5SWRlbnRpZmllciI6IjI1NjIwMTAwMDAxIiwiZnNwSWQiOiIyMCJ9LCJwZXJzb25hbEluZm8iOnsiY29tcGxleE5hbWUiOnsiZmlyc3ROYW1lIjoiTWF0cyIsImxhc3ROYW1lIjoiSGFnbWFuIn0sImRhdGVPZkJpcnRoIjoiMTk4My0xMC0yNSJ9fSwiYW1vdW50Ijp7ImFtb3VudCI6IjEwMCIsImN1cnJlbmN5IjoiVVNEIn0sInRyYW5zYWN0aW9uVHlwZSI6eyJzY2VuYXJpbyI6IlRSQU5TRkVSIiwiaW5pdGlhdG9yIjoiUEFZRVIiLCJpbml0aWF0b3JUeXBlIjoiQ09OU1VNRVIifSwibm90ZSI6ImhlaiJ9',
            payeeFsp: 'dfsp1',
            payerFsp: 'dfsp2',
            transferId: transferId
          }
        },
        to: 'dfsp2',
        from: 'dfsp1',
        id: transferId,
        type: 'application/json'
      }

      const topicConfig = {
        topicName: Utility.getNotificationTopicName()
      }

      await Kafka.Producer.produceMessage(messageProtocol, topicConfig, kafkaConfig)
      sleep(10)
      const responseFrom = await getNotifications(messageProtocol.from, transferId)
      const responseTo = await getNotifications(messageProtocol.to, transferId)
      test.equal(responseFrom, JSON.stringify(messageProtocol.content.payload), 'Notification sent successfully to Payer')
      test.equal(responseTo, JSON.stringify(messageProtocol.content.payload), 'Notification sent successfully to Payee')
      test.end()
    })

    notificationTest.test('consume a TIMEOUT-RECEIVED message and send PUT callback', async test => {
      const transferId = Uuid()
      const kafkaConfig = Utility.getKafkaConfig(Utility.ENUMS.PRODUCER, TRANSFER.toUpperCase(), PREPARE.toUpperCase())
      const messageProtocol = {
        metadata: {
          event: {
            id: Uuid(),
            createdAt: new Date(),
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
            'content-length': 1038,
            'content-type': 'application/json',
            'date': '2017-11-02T00:00:00.000Z',
            'fspiop-destination': 'dfsp2',
            'fspiop-source': 'dfsp1'
          },
          payload: {
            amount: { amount: 100, currency: 'USD' },
            transferState: 'COMMITTED',
            fulfilment: 'f5sqb7tBTWPd5Y8BDFdMm9BJR_MNI4isf8p8n4D5pHA',
            condition: 'uU0nuZNNPgilLlLX2n2r-sSE7-N6U4DukIj3rOLvze1',
            expiration: '2018-08-24T21:31:00.534+01:00',
            ilpPacket: 'AQAAAAAAAABkEGcuZXdwMjEuaWQuODAwMjCCAhd7InRyYW5zYWN0aW9uSWQiOiJmODU0NzdkYi0xMzVkLTRlMDgtYThiNy0xMmIyMmQ4MmMwZDYiLCJxdW90ZUlkIjoiOWU2NGYzMjEtYzMyNC00ZDI0LTg5MmYtYzQ3ZWY0ZThkZTkxIiwicGF5ZWUiOnsicGFydHlJZEluZm8iOnsicGFydHlJZFR5cGUiOiJNU0lTRE4iLCJwYXJ0eUlkZW50aWZpZXIiOiIyNTYxMjM0NTYiLCJmc3BJZCI6IjIxIn19LCJwYXllciI6eyJwYXJ0eUlkSW5mbyI6eyJwYXJ0eUlkVHlwZSI6Ik1TSVNETiIsInBhcnR5SWRlbnRpZmllciI6IjI1NjIwMTAwMDAxIiwiZnNwSWQiOiIyMCJ9LCJwZXJzb25hbEluZm8iOnsiY29tcGxleE5hbWUiOnsiZmlyc3ROYW1lIjoiTWF0cyIsImxhc3ROYW1lIjoiSGFnbWFuIn0sImRhdGVPZkJpcnRoIjoiMTk4My0xMC0yNSJ9fSwiYW1vdW50Ijp7ImFtb3VudCI6IjEwMCIsImN1cnJlbmN5IjoiVVNEIn0sInRyYW5zYWN0aW9uVHlwZSI6eyJzY2VuYXJpbyI6IlRSQU5TRkVSIiwiaW5pdGlhdG9yIjoiUEFZRVIiLCJpbml0aWF0b3JUeXBlIjoiQ09OU1VNRVIifSwibm90ZSI6ImhlaiJ9',
            payeeFsp: 'dfsp1',
            payerFsp: 'dfsp2',
            transferId: transferId
          }
        },
        to: 'dfsp2',
        from: 'dfsp1',
        id: transferId,
        type: 'application/json'
      }

      const topicConfig = {
        topicName: Utility.getNotificationTopicName()
      }

      await Kafka.Producer.produceMessage(messageProtocol, topicConfig, kafkaConfig)
      sleep(10)
      const response = await getNotifications(messageProtocol.from, transferId)
      test.equal(response, JSON.stringify(messageProtocol.content.payload), 'Notification sent successfully to Payer')
      test.end()
    })

    notificationTest.test('tear down', async test => {
      await Kafka.Producer.disconnect()
      test.end()
    })
 
    notificationTest.end()
  })
  notificationHandlerTest.end()
})


function sleep(seconds) {
  var waitUntil = new Date().getTime() + seconds * 1000;
  while (new Date().getTime() < waitUntil) true;
}

const getNotifications = async (fsp, id) => {
  const requestOptions = {
    url: `${getNotificationUrl}/${fsp}/${id}`,
    method: 'get',
    agentOptions: {
      rejectUnauthorized: false
    }
  }
  return new Promise((resolve, reject) => {
    return request(requestOptions, (error, response, body) => {
      if (error) {
        return reject(error)
      }
      return resolve(response.body)
    })
  })
}