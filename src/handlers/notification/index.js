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
const request = require('request')

const startConsumer = async () => {
  Logger.info('Instantiate consumer')
  var c = new Consumer(['notifications'], {
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
            let url = getUrl(msg)

            if (url == null) {
              // reject('Cant determine the destination of notification')
              resolve(false)
            }
            const { content } = msg.value
            sendNotification(url, content.headers, content.payload)
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

// const sendNotification = async (url, headers, message) => {
//   delete headers['Content-Length']
//   const options = {
//     url,
//     method: 'put',
//     headers,

//     body: JSON.stringify(message)
//   }
//   request(options, (error, response, body) => {
//     if (error) {
//       return 400
//     }
//     return response.statusCode
//   })
// }

const sendNotification = async (url, headers, message) => {
  delete headers['Content-Length']
  const options = {
    url,
    method: 'put',
    headers,

    body: JSON.stringify(message)
  }

  return new Promise((resolve, reject) => {
    return request(options, (error, response, body) => {
      if (error) {
        return resolve(400)
      }
      return resolve(response.statusCode)
    })
  })
}

const getUrl = (msg) => {
  if (!msg.value || !msg.value.content || !msg.value.content.headers || !msg.value.content.payload) {
    // reject('Invalid message format received from Kafka!')
    return null
  }
  const { metadata, from, to } = msg.value
  const { type, action, status } = metadata.event
  let url
  if (action === 'prepare' && type === 'prepare' && status === 'success') {
    url = Config.DFSP_URLS[to]
  } else if (action === 'prepare' && type === 'prepare' && status !== 'success') {
    url = Config.DFSP_URLS[from]
  }
  return url
}

module.exports = {
  startConsumer,
  sendNotification,
  getUrl
}
