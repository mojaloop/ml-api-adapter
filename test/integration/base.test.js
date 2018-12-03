'use strict'

const Test = require('tapes')(require('tape'))
const Utility = require('../../src/lib/utility')
const Producer = require('@mojaloop/central-services-stream').Kafka.Producer

let kafkaProducer

Test('setup', async setupTest => {
  setupTest.test('connect to kafka', async test => {
    const kafkaConfig = Utility.getKafkaConfig(Utility.ENUMS.PRODUCER, 'TRANSFER', 'PREPARE')

    kafkaProducer = new Producer(kafkaConfig)
    const result = await kafkaProducer.connect()
    test.equal(result, true, 'Connected to kafka successfully')
    test.end()
  })

  setupTest.test('disconnect from kafka', async test => {
    await kafkaProducer.disconnect()
    test.end()
  })

  setupTest.end()
})
