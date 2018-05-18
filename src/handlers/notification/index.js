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
const Consumer = require('@mojaloop/central-services-shared').Kafka.Consumer
const ConsumerEnums = require('@mojaloop/central-services-shared').Kafka.Consumer.ENUMS
const Logger = require('@mojaloop/central-services-shared').Logger
const Config = require('../../lib/config')
const Callback = require('./callbacks.js')
const kafkaHost = process.env.KAFKA_HOST || Config.KAFKA.KAFKA_HOST || 'localhost'
const kafkaPort = process.env.KAFKA_BROKER_PORT || Config.KAFKA.KAFKA_BROKER_PORT || '9092'
const batchSize = Config.KAFKA.KAFKA_CONSUMER_BATCH_SIZE || 1
let topicList = Config.KAFKA.KAFKA_NOTIFICATION_TOPICS || ['notifications']

const startConsumer = async () => {
  Logger.info('Instantiate the kafka consumer')

  topicList = (!Array.isArray(topicList) ? [topicList] : topicList)

  var c = new Consumer(topicList, {
    options: {
      mode: ConsumerEnums.CONSUMER_MODES.recursive,
      batchSize,
      recursiveTimeout: 100,
      messageCharset: 'utf8',
      messageAsJSON: true,
      sync: true,
      consumeTimeout: 1000
    },
    rdkafkaConf: {
      'group.id': 'kafka-ml-api-adapter',
      'metadata.broker.list': `${kafkaHost}:${kafkaPort}`,
      'enable.auto.commit': false
    },
    topicConf: {},
    logger: Logger
  })

  await c.connect().catch(err => {
    Logger.error(`error connecting to kafka - ${err}`)
    throw err
  })

  c.consume((error, message) => {
    return new Promise((resolve, reject) => {
      if (error) {
        Logger.debug(`WTDSDSD!!! error ${error}`)
        reject(error)
      }
      if (message) {
        Logger.debug(`Message Received from kafka - ${JSON.stringify(message)}`)

        message = (!Array.isArray(message) ? [message] : message)

        if (Array.isArray(message) && message.length != null && message.length > 0) {
          message.forEach(async msg => {
            c.commitMessage(msg)
            let res = await processMessage(msg).catch(err => {
              Logger.error(`error posting to the callback - ${err}`)
              throw err
            })
            resolve(res)
          })
        } else {
          c.commitMessage(message)
        }
        resolve(message)
      } else {
        resolve(false)
      }
    })
  })

  // consume 'ready' event
  c.on('ready', arg => Logger.debug(`onReady: ${JSON.stringify(arg)}`))
  // consume 'message' event
  c.on('message', message => Logger.debug(`onMessage: ${message.offset}, ${JSON.stringify(message.value)}`))
  // consume 'batch' event
  c.on('batch', message => Logger.debug(`onBatch: ${JSON.stringify(message)}`))
}

const processMessage = async (msg) => {
  if (!msg.value || !msg.value.content || !msg.value.content.headers || !msg.value.content.payload) {
    throw new Error('Invalid message received from kafka')
  }
  const { metadata, from, to, content } = msg.value
  const { action, status } = metadata.event
  if (action === 'prepare' && status === 'success') {
    return await Callback.sendCallback(Config.DFSP_URLS[to].transfers, 'post', content.headers, content.payload).catch(err => {
      Logger.error(`error posting to the callback - ${err}`)
      throw err
    })
  } else if (action === 'prepare' && status !== 'success') {
    return await Callback.sendCallback(Config.DFSP_URLS[from].error, 'put', content.headers, content.payload).catch(err => {
      Logger.error(`error sending notification to the callback - ${err}`)
      throw err
    })
  }
}

module.exports = {
  startConsumer,
  processMessage
}
