'use strict'

const Test = require('tape')
const Config = require('../../src/lib/config')
const Producer = require('@mojaloop/central-services-shared').Kafka.Producer
const kafkaHost = process.env.KAFKA_HOST || Config.KAFKA_HOST || 'localhost'
const kafkaPort = process.env.KAFKA_BROKER_PORT || Config.KAFKA_BROKER_PORT || '9092'

let kafkaProducer
Test('setup', setupTest => {
  setupTest.test('connect to kafka', test => {
    const kafkaConfig = {
      rdkafkaConf: {
        'metadata.broker.list': `${kafkaHost}:${kafkaPort}`,
        'client.id': 'default-client',
        'event_cb': true,
        'compression.codec': 'none',
        'retry.backoff.ms': 100,
        'message.send.max.retries': 2,
        'socket.keepalive.enable': true,
        'queue.buffering.max.messages': 10,
        'queue.buffering.max.ms': 50,
        'batch.num.messages': 100,
        'api.version.request': true,
        'dr_cb': true
      }
    }
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
