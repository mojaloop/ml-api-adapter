'use strict'

const Test = require('tape')
const Utility = require('../../src/lib/utility')
const Producer = require('@mojaloop/central-services-shared').Kafka.Producer
const kafkaHost = process.env.KAFKA_HOST // || Config.KAFKA_HOST || 'localhost'
const kafkaPort = process.env.KAFKA_BROKER_PORT // || Config.KAFKA_BROKER_PORT || '9092'

let kafkaProducer

Test('setup', setupTest => {
  setupTest.test('connect to kafka', test => {
    const kafkaConfig = Utility.getKafkaConfig(Utility.ENUMS.PRODUCER, 'TRANSFER', 'PREPARE')

    kafkaConfig.rdkafkaConf['metadata.broker.list'] = `${kafkaHost}:${kafkaPort}`

    kafkaProducer = new Producer(kafkaConfig)
    kafkaProducer.connect().then((result) => {
      test.pass('this is a connect test')
      test.end()
    })
  })
  setupTest.end()
})

Test.onFinish(function () {
  kafkaProducer.disconnect()
  process.exit(0)
})
