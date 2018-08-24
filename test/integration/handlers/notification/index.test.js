'use strict'

const src = '../../../../src'
const Test = require('tapes')(require('tape'))
const Uuid = require('uuid4')
const Sinon = require('sinon')
const Notification = require(`${src}/handlers/notification`)
// const Proxyquire = require('proxyquire')

const Kafka = require(`${src}/lib/kafka`)
const Utility = require(`${src}/lib/utility`)

const TRANSFER = 'transfer'
const PREPARE = 'prepare'
const FULFIL = 'fulfil'

// let url = process.env.ENDPOINT_URL

Test('Notification Handler', async notificationHandlerTest => {
  let sandbox

  notificationHandlerTest.beforeEach(test => {
    sandbox = Sinon.createSandbox()
    test.end()
  })

  notificationHandlerTest.afterEach(test => {
    sandbox.restore()
    test.end()
  })

  notificationHandlerTest.test('should', async notificationTest => {
    notificationTest.test('consume a message and send callback', async test => {
      let spy = sandbox.spy(Notification)
      // let spy = sandbox.spy()
      // Notification.processMessage(spy)


      const kafkaConfig = Utility.getKafkaConfig(Utility.ENUMS.PRODUCER, TRANSFER.toUpperCase(), PREPARE.toUpperCase())

      const messageProtocol = {
        value: {
          metadata: {
            event: {
              id: Uuid(),
              createdAt: new Date(),
              type: 'prepare',
              action: 'prepare',
              state: {
                status: 'success',
                code: 0
                // code: 3100,
                // description: 'Generic validation error',
                // status: 'error'
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
              transferId: '9136780b-37e2-457c-8c05-f15dbb033b30'

            }
            // payload: {
            //   errorInformation: {
            //     errorCode: 3100,
            //     errorDescription: 'Generic validation error'
            //   }
            // }
          },
          to: 'dfsp2',
          from: 'dfsp1',
          id: '9136780b-37e2-457c-8c05-f15dbb033b10',
          type: 'application/json'
        }
      }

      const topicConfig = {
        topicName: Utility.getNotificationTopicName()
      }
  
      let result = await Kafka.Producer.produceMessage(messageProtocol, topicConfig, kafkaConfig)
      
      console.log('RESULT:::::', result)
      await Notification.startConsumer()


      const method = 'post'
      const headers = {}

      // CallbackService.sendCallback(url, method, headers, message).then(result => {
      //   test.equal(result, 200)
      //   test.end()
      // })
      sleep(10)
      let call = spy.getCall(0)
      console.log(call)
      test.ok(spy.called, 'processMessage called once ')

      test.end()
    })

   await notificationTest.end()
  })
  await notificationHandlerTest.end()
})


function sleep(seconds){
  var waitUntil = new Date().getTime() + seconds*1000;
  while(new Date().getTime() < waitUntil) true;
}