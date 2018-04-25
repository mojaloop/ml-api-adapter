const Consumer = require('@mojaloop/central-services-shared').Kafka.Consumer
const ConsumerEnums = require('@mojaloop/central-services-shared').Kafka.Consumer.ENUMS
const Logger = require('@mojaloop/central-services-shared').Logger

const testConsumer = async () => {
  Logger.info('Instantiate consumer')
  var c = new Consumer(['transfer-5678-prepare'], {
    options: {
      mode: ConsumerEnums.CONSUMER_MODES.recursive,
      batchSize: 1,
      recursiveTimeout: 100,
      messageCharset: 'utf8',
      messageAsJSON: true,
      sync: true,
      consumeTimeout: 1000
    },
    rdkafkaConf: {
      'group.id': 'kafka-test',
      'metadata.broker.list': 'localhost:9092',
      'enable.auto.commit': false
    },
    topicConf: {},
    logger: Logger
  })

  Logger.debug('Connect consumer')
  var connectionResult = await c.connect()

  Logger.debug(`Connected result=${connectionResult}`)

  Logger.debug('Consume messages')

  c.consume((error, message) => {
    return new Promise((resolve, reject) => {
      if (error) {
        Logger.debug(`WTDSDSD!!! error ${error}`)
        // resolve(false)
        reject(error)
      }
      if (message) { // check if there is a valid message comming back
        Logger.debug(`Message Received by callback function - ${JSON.stringify(message)}`)
        // lets check if we have received a batch of messages or single. This is dependant on the Consumer Mode
        if (Array.isArray(message) && message.length != null && message.length > 0) {
          message.forEach(msg => {
            c.commitMessage(msg)
          })
        } else {
          c.commitMessage(message)
        }
        resolve(message)
      } else {
        resolve(false)
      }
      // resolve(true)
    })
  })

  // consume 'ready' event
  c.on('ready', arg => Logger.debug(`onReady: ${JSON.stringify(arg)}`))
  // consume 'message' event
  c.on('message', message => Logger.debug(`onMessage: ${message.offset}, ${JSON.stringify(message.value)}`))
  // consume 'batch' event
  c.on('batch', message => Logger.debug(`onBatch: ${JSON.stringify(message)}`))

  Logger.debug('testConsumer::end')
}

module.exports = {
  testConsumer
}
