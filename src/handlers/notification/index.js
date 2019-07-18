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

 * Georgi Georgiev <georgi.georgiev@modusbox.com>
 * Shashikant Hirugade <shashikant.hirugade@modusbox.com>

 --------------
 ******/
'use strict'

const Consumer = require('@mojaloop/central-services-stream').Kafka.Consumer
const Logger = require('@mojaloop/central-services-shared').Logger
const Participant = require('../../domain/participant')
const Utility = require('../../lib/utility')
const Callback = require('./callbacks.js')

const NOTIFICATION = 'notification'
const EVENT = 'event'
const FSPIOP_CALLBACK_URL_TRANSFER_POST = 'FSPIOP_CALLBACK_URL_TRANSFER_POST'
const FSPIOP_CALLBACK_URL_TRANSFER_PUT = 'FSPIOP_CALLBACK_URL_TRANSFER_PUT'
const FSPIOP_CALLBACK_URL_TRANSFER_ERROR = 'FSPIOP_CALLBACK_URL_TRANSFER_ERROR'
let notificationConsumer = {}
let autoCommitEnabled = true
const Metrics = require('@mojaloop/central-services-metrics')
const ENUM = require('../../lib/enum')
const decodePayload = require('@mojaloop/central-services-stream').Kafka.Protocol.decodePayload

/**
 * @module src/handlers/notification
 */

/**
* @function consumeMessage
* @async
* @description This is the callback function for the kafka consumer, this will receive the message from kafka, commit the message and send it for processing
* processMessage - called to process the message received from kafka
* @param {object} error - the error message received form kafka in case of error
* @param {object} message - the message received form kafka

* @returns {boolean} Returns true on success or false on failure
*/

const consumeMessage = async (error, message) => {
  Logger.info('Notification::consumeMessage')
  return new Promise(async (resolve, reject) => {
    const histTimerEnd = Metrics.getHistogram(
      'notification_event',
      'Consume a notification message from the kafka topic and process it accordingly',
      ['success']
    ).startTimer()
    if (error) {
      Logger.error(`Error while reading message from kafka ${error}`)
      return reject(error)
    }
    Logger.info(`Notification:consumeMessage message: - ${JSON.stringify(message)}`)

    message = (!Array.isArray(message) ? [message] : message)
    let combinedResult = true
    for (const msg of message) {
      Logger.info('Notification::consumeMessage::processMessage')
      let res = await processMessage(msg).catch(err => {
        Logger.error(`Error processing the kafka message - ${err}`)
        if (!autoCommitEnabled) {
          notificationConsumer.commitMessageSync(msg)
        }
        return resolve(err) // We return 'resolved' since we have dealt with the error here
      })
      if (!autoCommitEnabled) {
        notificationConsumer.commitMessageSync(msg)
      }
      Logger.debug(`Notification:consumeMessage message processed: - ${res}`)
      combinedResult = (combinedResult && res)
    }
    histTimerEnd({ success: true })
    return resolve(combinedResult)
  })
}

/**
* @function startConsumer
* @async
* @description This will create a kafka consumer which will listen to the notification topics configured in the config
*
* @returns {boolean} Returns true on sucess and throws error on failure
*/
const startConsumer = async () => {
  Logger.info('Notification::startConsumer')
  let topicName
  try {
    topicName = Utility.getNotificationTopicName()
    Logger.info(`Notification::startConsumer - starting Consumer for topicNames: [${topicName}]`)
    let config = Utility.getKafkaConfig(Utility.ENUMS.CONSUMER, NOTIFICATION.toUpperCase(), EVENT.toUpperCase())
    config.rdkafkaConf['client.id'] = topicName

    if (config.rdkafkaConf['enable.auto.commit'] !== undefined) {
      autoCommitEnabled = config.rdkafkaConf['enable.auto.commit']
    }
    notificationConsumer = new Consumer([topicName], config)
    await notificationConsumer.connect()
    Logger.info(`Notification::startConsumer - Kafka Consumer connected for topicNames: [${topicName}]`)
    await notificationConsumer.consume(consumeMessage)
    Logger.info(`Notification::startConsumer - Kafka Consumer created for topicNames: [${topicName}]`)
    return true
  } catch (err) {
    Logger.error(`Notification::startConsumer - error for topicNames: [${topicName}] - ${err}`)
    throw err
  }
}

/**
* @function processMessage
* @async
* @description This is the function that will process the message received from kafka, it determined the action and status from the message and sends calls to appropriate fsp
* Callback.sendCallback - called to send the notification callback
* @param {object} message - the message received form kafka

* @returns {boolean} Returns true on sucess and throws error on failure
*/

const processMessage = async (msg) => {
  try {
    Logger.info('Notification::processMessage')

    if (!msg.value || !msg.value.content || !msg.value.content.headers || !msg.value.content.payload) {
      throw new Error('Invalid message received from kafka')
    }

    const { metadata, from, to, content } = msg.value
    const { action, state } = metadata.event
    const status = state.status

    const actionLower = action.toLowerCase()
    const statusLower = status.toLowerCase()

    Logger.info('Notification::processMessage action: ' + action)
    Logger.info('Notification::processMessage status: ' + status)
    const decodedPayload = decodePayload(content.payload, { asParsed: false })
    const id = JSON.parse(decodedPayload.body.toString()).transferId || (content.uriParams && content.uriParams.id)
    const payloadForCallback = decodedPayload.body.toString()

    if (actionLower === ENUM.transferEventAction.PREPARE && statusLower === ENUM.messageStatus.SUCCESS) {
      const callbackURLTo = await Participant.getEndpoint(to, FSPIOP_CALLBACK_URL_TRANSFER_POST, id)
      const methodTo = ENUM.methods.FSPIOP_CALLBACK_URL_TRANSFER_POST
      Logger.debug(`Notification::processMessage - Callback.sendCallback(${callbackURLTo}, ${methodTo}, ${JSON.stringify(content.headers)}, ${payloadForCallback}, ${id}, ${from}, ${to})`)
      return Callback.sendCallback(callbackURLTo, methodTo, content.headers, payloadForCallback, id, from, to)
    }

    if (actionLower === ENUM.transferEventAction.PREPARE && statusLower !== ENUM.messageStatus.SUCCESS) {
      const callbackURLTo = await Participant.getEndpoint(to, FSPIOP_CALLBACK_URL_TRANSFER_ERROR, id)
      const methodFrom = ENUM.methods.FSPIOP_CALLBACK_URL_TRANSFER_ERROR
      Logger.debug(`Notification::processMessage - Callback.sendCallback(${callbackURLTo}, ${methodFrom}, ${JSON.stringify(content.headers)}, ${payloadForCallback}, ${id}, ${from}, ${to})`)
      return Callback.sendCallback(callbackURLTo, methodFrom, content.headers, payloadForCallback, id, from, to)
    }

    if (actionLower === ENUM.transferEventAction.PREPARE_DUPLICATE && statusLower === ENUM.messageStatus.SUCCESS) {
      const callbackURLTo = await Participant.getEndpoint(to, FSPIOP_CALLBACK_URL_TRANSFER_PUT, id)
      const methodFrom = ENUM.methods.FSPIOP_CALLBACK_URL_TRANSFER_PUT
      Logger.debug(`Notification::processMessage - Callback.sendCallback(${callbackURLTo}, ${methodFrom}, ${JSON.stringify(content.headers)}, ${payloadForCallback}, ${id}, ${from}, ${to})`)
      return Callback.sendCallback(callbackURLTo, methodFrom, content.headers, payloadForCallback, id, from, to)
    }

    if (actionLower === ENUM.transferEventAction.COMMIT && statusLower === ENUM.messageStatus.SUCCESS) {
      const callbackURLFrom = await Participant.getEndpoint(from, FSPIOP_CALLBACK_URL_TRANSFER_PUT, id)
      const callbackURLTo = await Participant.getEndpoint(to, FSPIOP_CALLBACK_URL_TRANSFER_PUT, id)
      const methodFrom = ENUM.methods.FSPIOP_CALLBACK_URL_TRANSFER_PUT
      const methodTo = ENUM.methods.FSPIOP_CALLBACK_URL_TRANSFER_PUT
      // forward the fulfil to the destination
      Logger.debug(`Notification::processMessage - Callback.sendCallback(${callbackURLTo}, ${methodTo}, ${JSON.stringify(content.headers)}, ${payloadForCallback}, ${id}, ${from}, ${to})`)
      await Callback.sendCallback(callbackURLTo, methodTo, content.headers, payloadForCallback, id, from, to)

      // send an extra notification back to the original sender.
      Logger.debug(`Notification::processMessage - Callback.sendCallback(${callbackURLFrom}, ${methodFrom}, ${JSON.stringify(content.headers)}, ${payloadForCallback}, ${id}, ${ENUM.headers.FSPIOP.SWITCH.value}, ${from})`)
      return Callback.sendCallback(callbackURLFrom, methodFrom, content.headers, payloadForCallback, id, ENUM.headers.FSPIOP.SWITCH.value, from)
    }

    if (actionLower === ENUM.transferEventAction.COMMIT && statusLower !== ENUM.messageStatus.SUCCESS) {
      const callbackURLTo = await Participant.getEndpoint(to, FSPIOP_CALLBACK_URL_TRANSFER_ERROR, id)
      const methodFrom = ENUM.methods.FSPIOP_CALLBACK_URL_TRANSFER_ERROR
      Logger.debug(`Notification::processMessage - Callback.sendCallback(${callbackURLTo}, ${methodFrom}, ${JSON.stringify(content.headers)}, ${payloadForCallback}, ${id}, ${from}, ${to})`)
      return Callback.sendCallback(callbackURLTo, 'put', content.headers, payloadForCallback, id, from, to)
    }

    if (actionLower === ENUM.transferEventAction.REJECT) {
      const callbackURLFrom = await Participant.getEndpoint(from, FSPIOP_CALLBACK_URL_TRANSFER_PUT, id)
      const callbackURLTo = await Participant.getEndpoint(to, FSPIOP_CALLBACK_URL_TRANSFER_PUT, id)
      const methodFrom = ENUM.methods.FSPIOP_CALLBACK_URL_TRANSFER_PUT
      const methodTo = ENUM.methods.FSPIOP_CALLBACK_URL_TRANSFER_PUT
      // forward the reject to the destination
      Logger.debug(`Notification::processMessage - Callback.sendCallback(${callbackURLTo}, ${methodTo}, ${JSON.stringify(content.headers)}, ${payloadForCallback}, ${id}, ${from}, ${to})`)
      await Callback.sendCallback(callbackURLTo, methodTo, content.headers, payloadForCallback, id, from, to)
      // send an extra notification back to the original sender.
      Logger.debug(`Notification::processMessage - Callback.sendCallback(${callbackURLFrom}, ${methodTo}, ${JSON.stringify(content.headers)}, ${payloadForCallback}, ${id}, ${ENUM.headers.FSPIOP.SWITCH.value}, ${from})`)
      return Callback.sendCallback(callbackURLFrom, methodFrom, content.headers, payloadForCallback, id, ENUM.headers.FSPIOP.SWITCH.value, from)
    }

    if (actionLower === ENUM.transferEventAction.ABORT) {
      const callbackURLFrom = await Participant.getEndpoint(from, FSPIOP_CALLBACK_URL_TRANSFER_ERROR, id)
      const callbackURLTo = await Participant.getEndpoint(to, FSPIOP_CALLBACK_URL_TRANSFER_ERROR, id)
      const methodFrom = ENUM.methods.FSPIOP_CALLBACK_URL_TRANSFER_ERROR
      const methodTo = ENUM.methods.FSPIOP_CALLBACK_URL_TRANSFER_ERROR
      // forward the abort to the destination
      Logger.debug(`Notification::processMessage - Callback.sendCallback(${callbackURLTo}, ${methodTo}, ${JSON.stringify(content.headers)}, ${payloadForCallback}, ${id}, ${from}, ${to})`)
      await Callback.sendCallback(callbackURLTo, methodTo, content.headers, payloadForCallback, id, from, to)
      // send an extra notification back to the original sender.
      Logger.debug(`Notification::processMessage - Callback.sendCallback(${callbackURLFrom}, ${methodTo}, ${JSON.stringify(content.headers)}, ${payloadForCallback}, ${id}, ${ENUM.headers.FSPIOP.SWITCH.value}, ${from})`)
      return Callback.sendCallback(callbackURLFrom, methodFrom, content.headers, payloadForCallback, id, ENUM.headers.FSPIOP.SWITCH.value, from)
    }

    if (actionLower === ENUM.transferEventAction.FULFIL_DUPLICATE && statusLower === ENUM.messageStatus.SUCCESS) {
      const callbackURLTo = await Participant.getEndpoint(to, FSPIOP_CALLBACK_URL_TRANSFER_PUT, id)
      const methodFrom = ENUM.methods.FSPIOP_CALLBACK_URL_TRANSFER_PUT
      Logger.debug(`Notification::processMessage - Callback.sendCallback(${callbackURLTo}, ${methodFrom}, ${JSON.stringify(content.headers)}, ${payloadForCallback}, ${id}, ${from}, ${to})`)
      return Callback.sendCallback(callbackURLTo, methodFrom, content.headers, payloadForCallback, id, from, to)
    }

    if (actionLower === ENUM.transferEventAction.FULFIL_DUPLICATE && statusLower !== ENUM.messageStatus.SUCCESS) {
      const callbackURLTo = await Participant.getEndpoint(to, FSPIOP_CALLBACK_URL_TRANSFER_ERROR, id)
      const methodFrom = ENUM.methods.FSPIOP_CALLBACK_URL_TRANSFER_ERROR
      Logger.debug(`Notification::processMessage - Callback.sendCallback(${callbackURLTo}, ${methodFrom}, ${JSON.stringify(content.headers)}, ${payloadForCallback}, ${id}, ${from}, ${to})`)
      return Callback.sendCallback(callbackURLTo, methodFrom, content.headers, payloadForCallback, id, from, to)
    }

    if (actionLower === ENUM.transferEventAction.ABORT_DUPLICATE && statusLower === ENUM.messageStatus.SUCCESS) {
      const callbackURLTo = await Participant.getEndpoint(to, FSPIOP_CALLBACK_URL_TRANSFER_PUT, id)
      const methodFrom = ENUM.methods.FSPIOP_CALLBACK_URL_TRANSFER_PUT
      Logger.debug(`Notification::processMessage - Callback.sendCallback(${callbackURLTo}, ${methodFrom}, ${JSON.stringify(content.headers)}, ${payloadForCallback}, ${id}, ${from}, ${to})`)
      return Callback.sendCallback(callbackURLTo, methodFrom, content.headers, payloadForCallback, id, from, to)
    }

    if (actionLower === ENUM.transferEventAction.ABORT_DUPLICATE && statusLower !== ENUM.messageStatus.SUCCESS) {
      const callbackURLTo = await Participant.getEndpoint(to, FSPIOP_CALLBACK_URL_TRANSFER_ERROR, id)
      const methodFrom = ENUM.methods.FSPIOP_CALLBACK_URL_TRANSFER_ERROR
      Logger.debug(`Notification::processMessage - Callback.sendCallback(${callbackURLTo}, ${methodFrom}, ${JSON.stringify(content.headers)}, ${payloadForCallback}, ${id}, ${from}, ${to})`)
      return Callback.sendCallback(callbackURLTo, methodFrom, content.headers, payloadForCallback, id, from, to)
    }

    if (actionLower === ENUM.transferEventAction.TIMEOUT_RECEIVED) {
      const callbackURLTo = await Participant.getEndpoint(to, FSPIOP_CALLBACK_URL_TRANSFER_ERROR, id)
      const methodFrom = ENUM.methods.FSPIOP_CALLBACK_URL_TRANSFER_ERROR
      Logger.debug(`Notification::processMessage - Callback.sendCallback(${callbackURLTo}, ${methodFrom}, ${JSON.stringify(content.headers)}, ${payloadForCallback}, ${id}, ${to}, ${from})`)
      return Callback.sendCallback(callbackURLTo, methodFrom, content.headers, payloadForCallback, id, from, to)
    }

    if (actionLower === ENUM.transferEventAction.GET && statusLower === ENUM.messageStatus.SUCCESS) {
      const callbackURLTo = await Participant.getEndpoint(to, FSPIOP_CALLBACK_URL_TRANSFER_PUT, id)
      const methodTo = ENUM.methods.FSPIOP_CALLBACK_URL_TRANSFER_PUT
      Logger.debug(`Notification::processMessage - Callback.sendCallback(${callbackURLTo}, ${methodTo}, ${JSON.stringify(content.headers)}, ${payloadForCallback}, ${id}, ${from}, ${to})`)
      return Callback.sendCallback(callbackURLTo, methodTo, content.headers, payloadForCallback, id, from, to)
    }

    if (actionLower === ENUM.transferEventAction.GET && statusLower !== ENUM.messageStatus.SUCCESS) {
      const callbackURLTo = await Participant.getEndpoint(to, FSPIOP_CALLBACK_URL_TRANSFER_ERROR, id)
      const methodTo = ENUM.methods.FSPIOP_CALLBACK_URL_TRANSFER_ERROR
      Logger.debug(`Notification::processMessage - Callback.sendCallback(${callbackURLTo}, ${methodTo}, ${JSON.stringify(content.headers)}, ${payloadForCallback}, ${id}, ${from}, ${to})`)
      return Callback.sendCallback(callbackURLTo, methodTo, content.headers, payloadForCallback, id, from, to)
    }

    Logger.warn(`Unknown action received from kafka: ${action}`)
  } catch (e) {
    Logger.error(`Error processing the message - ${e}`)
    throw e
  }
}

/**
 * @function getMetadataPromise
 *
 * @description a Promisified version of getMetadata on the kafka consumer
 *
 * @param {Kafka.Consumer} consumer The consumer
 * @param {string} topic The topic name
 * @returns {Promise<object>} Metadata response
 */
const getMetadataPromise = (consumer, topic) => {
  return new Promise((resolve, reject) => {
    const cb = (err, metadata) => {
      if (err) {
        return reject(new Error(`Error connecting to consumer: ${err}`))
      }

      return resolve(metadata)
    }

    consumer.getMetadata({ topic, timeout: 3000 }, cb)
  })
}

/**
 * @function isConnected
 *
 *
 * @description Use this to determine whether or not we are connected to the broker. Internally, it calls `getMetadata` to determine
 * if the broker client is connected.
 *
 * @returns {true} - if connected
 * @throws {Error} - if we can't find the topic name, or the consumer is not connected
 */
const isConnected = async () => {
  const topicName = Utility.getNotificationTopicName()
  const metadata = await getMetadataPromise(notificationConsumer, topicName)

  const foundTopics = metadata.topics.map(topic => topic.name)
  if (foundTopics.indexOf(topicName) === -1) {
    Logger.debug(`Connected to consumer, but ${topicName} not found.`)
    throw new Error(`Connected to consumer, but ${topicName} not found.`)
  }

  return true
}

/**
 * @function disconnect
 *
 *
 * @description Disconnect from the notificationConsumer
 *
 * @returns Promise<*> - Passes on the Promise from Consumer.disconnect()
 * @throws {Error} - if the consumer hasn't been initialized, or disconnect() throws an error
 */
const disconnect = async () => {
  if (!notificationConsumer || !notificationConsumer.disconnect) {
    throw new Error('Tried to disconnect from notificationConsumer, but notificationConsumer is not initialized')
  }

  return notificationConsumer.disconnect()
}

module.exports = {
  disconnect,
  startConsumer,
  processMessage,
  consumeMessage,
  isConnected
}
