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
const Callback = require('@mojaloop/central-services-shared').Util.Request
const ErrorHandler = require('@mojaloop/central-services-error-handling')
const KafkaUtil = require('@mojaloop/central-services-shared').Util.Kafka

const Metrics = require('@mojaloop/central-services-metrics')
const ENUM = require('@mojaloop/central-services-shared').Enum
const decodePayload = require('@mojaloop/central-services-stream').Kafka.Protocol.decodePayload
const Config = require('../../lib/config')

let notificationConsumer = {}
let autoCommitEnabled = true

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
  const histTimerEnd = Metrics.getHistogram(
    'notification_event',
    'Consume a notification message from the kafka topic and process it accordingly',
    ['success']
  ).startTimer()
  try {
    if (error) {
      const fspiopError = ErrorHandler.Factory.createInternalServerFSPIOPError(`Error while reading message from kafka ${error}`, error)
      Logger.error(fspiopError)
      throw fspiopError
    }
    Logger.info(`Notification:consumeMessage message: - ${JSON.stringify(message)}`)

    message = (!Array.isArray(message) ? [message] : message)
    let combinedResult = true
    for (const msg of message) {
      Logger.info('Notification::consumeMessage::processMessage')
      const res = await processMessage(msg).catch(err => {
        const fspiopError = ErrorHandler.Factory.createInternalServerFSPIOPError('Error processing notification message', err)
        Logger.error(fspiopError)
        if (!autoCommitEnabled) {
          notificationConsumer.commitMessageSync(msg)
        }
        throw fspiopError // We return 'resolved' since we have dealt with the error here
      })
      if (!autoCommitEnabled) {
        notificationConsumer.commitMessageSync(msg)
      }
      Logger.debug(`Notification:consumeMessage message processed: - ${res}`)
      combinedResult = (combinedResult && res)
    }
    histTimerEnd({ success: true })
    return combinedResult
  } catch (err) {
    histTimerEnd({ success: false })
    const fspiopError = ErrorHandler.Factory.reformatFSPIOPError(err)
    Logger.error(fspiopError)
    throw fspiopError
  }
}

/**
 * @function startConsumer
 * @async
 * @description This will create a kafka consumer which will listen to the notification topics configured in the config
 *
 * @returns {boolean} Returns true on success and throws error on failure
 */
const startConsumer = async () => {
  Logger.info('Notification::startConsumer')
  let topicName
  try {
    const topicConfig = KafkaUtil.createGeneralTopicConf(Config.KAFKA_CONFIG.TOPIC_TEMPLATES.GENERAL_TOPIC_TEMPLATE.TEMPLATE, ENUM.Events.Event.Type.NOTIFICATION, ENUM.Events.Event.Action.EVENT)
    topicName = topicConfig.topicName
    Logger.info(`Notification::startConsumer - starting Consumer for topicNames: [${topicName}]`)
    const config = KafkaUtil.getKafkaConfig(Config.KAFKA_CONFIG, ENUM.Kafka.Config.CONSUMER, ENUM.Events.Event.Type.NOTIFICATION.toUpperCase(), ENUM.Events.Event.Action.EVENT.toUpperCase())
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
    const fspiopError = ErrorHandler.Factory.reformatFSPIOPError(err)
    Logger.error(fspiopError)
    throw fspiopError
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
  Logger.info('Notification::processMessage')

  if (!msg.value || !msg.value.content || !msg.value.content.headers || !msg.value.content.payload) {
    throw ErrorHandler.Factory.createInternalServerFSPIOPError('Invalid message received from kafka')
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
  let payloadForCallback
  if (isDataUri(content.payload)) {
    payloadForCallback = decodedPayload.body.toString()
  } else {
    const parsedPayload = JSON.parse(decodedPayload.body)
    if (parsedPayload.errorInformation) {
      payloadForCallback = JSON.stringify(ErrorHandler.CreateFSPIOPErrorFromErrorInformation(parsedPayload.errorInformation, null, null).toApiErrorObject(Config.ERROR_HANDLING))
    }
  }

  if (actionLower === ENUM.Events.Event.Action.PREPARE && statusLower === ENUM.Events.EventStatus.SUCCESS.status) {
    const callbackURLTo = await Participant.getEndpoint(to, ENUM.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_TRANSFER_POST, id)
    Logger.debug(`Notification::processMessage - Callback.sendRequest(${callbackURLTo}, ${ENUM.Http.RestMethods.POST}, ${JSON.stringify(content.headers)}, ${payloadForCallback}, ${id}, ${from}, ${to})`)
    return Callback.sendRequest(callbackURLTo, content.headers, from, to, ENUM.Http.RestMethods.POST, payloadForCallback)
  }

  if (actionLower === ENUM.Events.Event.Action.PREPARE && statusLower !== ENUM.Events.EventStatus.SUCCESS.status) {
    const callbackURLTo = await Participant.getEndpoint(to, ENUM.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_TRANSFER_ERROR, id)
    Logger.debug(`Notification::processMessage - Callback.sendRequest(${callbackURLTo}, ${ENUM.Http.RestMethods.PUT}, ${JSON.stringify(content.headers)}, ${payloadForCallback}, ${id}, ${from}, ${to})`)
    return Callback.sendRequest(callbackURLTo, content.headers, from, to, ENUM.Http.RestMethods.PUT, payloadForCallback)
  }

  if (actionLower === ENUM.Events.Event.Action.PREPARE_DUPLICATE && statusLower === ENUM.Events.EventStatus.SUCCESS.status) {
    const callbackURLTo = await Participant.getEndpoint(to, ENUM.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_TRANSFER_PUT, id)
    Logger.debug(`Notification::processMessage - Callback.sendRequest(${callbackURLTo}, ${ENUM.Http.RestMethods.PUT}, ${JSON.stringify(content.headers)}, ${payloadForCallback}, ${id}, ${from}, ${to})`)
    return Callback.sendRequest(callbackURLTo, content.headers, from, to, ENUM.Http.RestMethods.PUT, payloadForCallback)
  }

  if (actionLower === ENUM.Events.Event.Action.COMMIT && statusLower === ENUM.Events.EventStatus.SUCCESS.status) {
    const callbackURLFrom = await Participant.getEndpoint(from, ENUM.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_TRANSFER_PUT, id)
    const callbackURLTo = await Participant.getEndpoint(to, ENUM.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_TRANSFER_PUT, id)
    // forward the fulfil to the destination
    Logger.debug(`Notification::processMessage - Callback.sendRequest(${callbackURLTo}, ${ENUM.Http.RestMethods.PUT}, ${JSON.stringify(content.headers)}, ${payloadForCallback}, ${id}, ${from}, ${to})`)
    await Callback.sendRequest(callbackURLTo, content.headers, from, to, ENUM.Http.RestMethods.PUT, payloadForCallback)

    // send an extra notification back to the original sender.
    Logger.debug(`Notification::processMessage - Callback.sendRequest(${callbackURLFrom}, ${ENUM.Http.RestMethods.PUT}, ${JSON.stringify(content.headers)}, ${payloadForCallback}, ${id}, ${ENUM.Http.Headers.FSPIOP.SWITCH.value}, ${from})`)
    return Callback.sendRequest(callbackURLFrom, content.headers, ENUM.Http.Headers.FSPIOP.SWITCH.value, from, ENUM.Http.RestMethods.PUT, payloadForCallback)
  }

  if (actionLower === ENUM.Events.Event.Action.COMMIT && statusLower !== ENUM.Events.EventStatus.SUCCESS.status) {
    const callbackURLTo = await Participant.getEndpoint(to, ENUM.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_TRANSFER_ERROR, id)
    Logger.debug(`Notification::processMessage - Callback.sendRequest(${callbackURLTo}, ${ENUM.Http.RestMethods.PUT}, ${JSON.stringify(content.headers)}, ${payloadForCallback}, ${id}, ${from}, ${to})`)
    return Callback.sendRequest(callbackURLTo, content.headers, from, to, ENUM.Http.RestMethods.PUT, payloadForCallback)
  }

  if (actionLower === ENUM.Events.Event.Action.REJECT) {
    const callbackURLFrom = await Participant.getEndpoint(from, ENUM.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_TRANSFER_PUT, id)
    const callbackURLTo = await Participant.getEndpoint(to, ENUM.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_TRANSFER_PUT, id)
    // forward the reject to the destination
    Logger.debug(`Notification::processMessage - Callback.sendRequest(${callbackURLTo}, ${ENUM.Http.RestMethods.PUT}, ${JSON.stringify(content.headers)}, ${payloadForCallback}, ${id}, ${from}, ${to})`)
    await Callback.sendRequest(callbackURLTo, content.headers, from, to, ENUM.Http.RestMethods.PUT, payloadForCallback)
    // send an extra notification back to the original sender.
    Logger.debug(`Notification::processMessage - Callback.sendRequest(${callbackURLFrom}, ${ENUM.Http.RestMethods.PUT}, ${JSON.stringify(content.headers)}, ${payloadForCallback}, ${id}, ${ENUM.Http.Headers.FSPIOP.SWITCH.value}, ${from})`)
    return Callback.sendRequest(callbackURLFrom, content.headers, ENUM.Http.Headers.FSPIOP.SWITCH.value, from, ENUM.Http.RestMethods.PUT, payloadForCallback)
  }

  if (actionLower === ENUM.Events.Event.Action.ABORT) {
    const callbackURLFrom = await Participant.getEndpoint(from, ENUM.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_TRANSFER_ERROR, id)
    const callbackURLTo = await Participant.getEndpoint(to, ENUM.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_TRANSFER_ERROR, id)
    // forward the abort to the destination
    Logger.debug(`Notification::processMessage - Callback.sendRequest(${callbackURLTo}, ${ENUM.Http.RestMethods.PUT}, ${JSON.stringify(content.headers)}, ${payloadForCallback}, ${id}, ${from}, ${to})`)
    await Callback.sendRequest(callbackURLTo, content.headers, from, to, ENUM.Http.RestMethods.PUT, payloadForCallback)
    // send an extra notification back to the original sender.
    Logger.debug(`Notification::processMessage - Callback.sendRequest(${callbackURLFrom}, ${ENUM.Http.RestMethods.PUT}, ${JSON.stringify(content.headers)}, ${payloadForCallback}, ${id}, ${ENUM.Http.Headers.FSPIOP.SWITCH.value}, ${from})`)
    return Callback.sendRequest(callbackURLFrom, content.headers, ENUM.Http.Headers.FSPIOP.SWITCH.value, from, ENUM.Http.RestMethods.PUT, payloadForCallback)
  }

  if (actionLower === ENUM.Events.Event.Action.FULFIL_DUPLICATE && statusLower === ENUM.Events.EventStatus.SUCCESS.status) {
    const callbackURLTo = await Participant.getEndpoint(to, ENUM.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_TRANSFER_PUT, id)
    Logger.debug(`Notification::processMessage - Callback.sendRequest(${callbackURLTo}, ${ENUM.Http.RestMethods.PUT}, ${JSON.stringify(content.headers)}, ${payloadForCallback}, ${id}, ${from}, ${to})`)
    return Callback.sendRequest(callbackURLTo, content.headers, from, to, ENUM.Http.RestMethods.PUT, payloadForCallback)
  }

  if (actionLower === ENUM.Events.Event.Action.FULFIL_DUPLICATE && statusLower !== ENUM.Events.EventStatus.SUCCESS.status) {
    const callbackURLTo = await Participant.getEndpoint(to, ENUM.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_TRANSFER_ERROR, id)
    Logger.debug(`Notification::processMessage - Callback.sendRequest(${callbackURLTo}, ${ENUM.Http.RestMethods.PUT}, ${JSON.stringify(content.headers)}, ${payloadForCallback}, ${id}, ${from}, ${to})`)
    return Callback.sendRequest(callbackURLTo, content.headers, from, to, ENUM.Http.RestMethods.PUT, payloadForCallback)
  }

  if (actionLower === ENUM.Events.Event.Action.ABORT_DUPLICATE && statusLower === ENUM.Events.EventStatus.SUCCESS.status) {
    const callbackURLTo = await Participant.getEndpoint(to, ENUM.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_TRANSFER_PUT, id)
    Logger.debug(`Notification::processMessage - Callback.sendRequest(${callbackURLTo}, ${ENUM.Http.RestMethods.PUT}, ${JSON.stringify(content.headers)}, ${payloadForCallback}, ${id}, ${from}, ${to})`)
    return Callback.sendRequest(callbackURLTo, content.headers, from, to, ENUM.Http.RestMethods.PUT, payloadForCallback)
  }

  if (actionLower === ENUM.Events.Event.Action.ABORT_DUPLICATE && statusLower !== ENUM.Events.EventStatus.SUCCESS.status) {
    const callbackURLTo = await Participant.getEndpoint(to, ENUM.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_TRANSFER_ERROR, id)
    Logger.debug(`Notification::processMessage - Callback.sendRequest(${callbackURLTo}, ${ENUM.Http.RestMethods.PUT}, ${JSON.stringify(content.headers)}, ${payloadForCallback}, ${id}, ${from}, ${to})`)
    return Callback.sendRequest(callbackURLTo, content.headers, from, to, ENUM.Http.RestMethods.PUT, payloadForCallback)
  }

  if (actionLower === ENUM.Events.Event.Action.TIMEOUT_RECEIVED) {
    const callbackURLTo = await Participant.getEndpoint(to, ENUM.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_TRANSFER_ERROR, id)
    Logger.debug(`Notification::processMessage - Callback.sendRequest(${callbackURLTo}, ${ENUM.Http.RestMethods.PUT}, ${JSON.stringify(content.headers)}, ${payloadForCallback}, ${id}, ${to}, ${from})`)
    return Callback.sendRequest(callbackURLTo, content.headers, from, to, ENUM.Http.RestMethods.PUT, payloadForCallback)
  }

  if (actionLower === ENUM.Events.Event.Action.GET && statusLower === ENUM.Events.EventStatus.SUCCESS.status) {
    const callbackURLTo = await Participant.getEndpoint(to, ENUM.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_TRANSFER_PUT, id)
    Logger.debug(`Notification::processMessage - Callback.sendRequest(${callbackURLTo}, ${ENUM.Http.RestMethods.PUT}, ${JSON.stringify(content.headers)}, ${payloadForCallback}, ${id}, ${from}, ${to})`)
    return Callback.sendRequest(callbackURLTo, content.headers, from, to, ENUM.Http.RestMethods.PUT, payloadForCallback)
  }

  if (actionLower === ENUM.Events.Event.Action.GET && statusLower !== ENUM.Events.EventStatus.SUCCESS.status) {
    const callbackURLTo = await Participant.getEndpoint(to, ENUM.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_TRANSFER_ERROR, id)
    Logger.debug(`Notification::processMessage - Callback.sendRequest(${callbackURLTo}, ${ENUM.Http.RestMethods.PUT}, ${JSON.stringify(content.headers)}, ${payloadForCallback}, ${id}, ${from}, ${to})`)
    return Callback.sendRequest(callbackURLTo, content.headers, from, to, ENUM.Http.RestMethods.PUT, payloadForCallback)
  }

  Logger.warn(`Unknown action received from kafka: ${action}`)
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
  const topicConfig = KafkaUtil.createGeneralTopicConf(Config.KAFKA_CONFIG.TOPIC_TEMPLATES.GENERAL_TOPIC_TEMPLATE.TEMPLATE, ENUM.Events.Event.Type.NOTIFICATION, ENUM.Events.Event.Action.EVENT)
  const topicName = topicConfig.topicName
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
