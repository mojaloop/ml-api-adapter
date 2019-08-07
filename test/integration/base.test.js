'use strict'

const Test = require('tapes')(require('tape'))
const Producer = require('@mojaloop/central-services-stream').Kafka.Producer
const Enum = require('@mojaloop/central-services-shared').Enum
const KafkaUtil = require('@mojaloop/central-services-shared').Util.Kafka
const Config = require('../../src/lib/config')

let kafkaProducer

Test('setup', async setupTest => {
  setupTest.test('connect to kafka', async test => {
    const kafkaConfig = KafkaUtil.getKafkaConfig(Config.KAFKA_CONFIG, Enum.Kafka.Config.PRODUCER, Enum.Kafka.Topics.TRANSFER.toUpperCase(), Enum.Events.Event.Action.PREPARE.toUpperCase())

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
