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

 - Shashikant Hirugade <shashikant.hirugade@modusbox.com>
 --------------
 ******/

'use strict'
const Consumer = require('@mojaloop/central-services-shared').Kafka.Consumer
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

const startConsumer = async () => {
  Logger.info('Notification::startConsumer')
  try {
    let topicName = Utility.getNotificationTopicName()
    Logger.info('Notification::startConsumer::topicName: ' + topicName)
    let config = Utility.getKafkaConfig(Utility.ENUMS.CONSUMER, NOTIFICATION.toUpperCase(), EVENT.toUpperCase())
    config.rdkafkaConf['client.id'] = topicName

    if (config.rdkafkaConf['enable.auto.commit'] !== undefined) {
      autoCommitEnabled = config.rdkafkaConf['enable.auto.commit']
    }
    notificationConsumer = new Consumer([topicName], config)
    Logger.info('Notification::startConsumer::Consumer: new')

    await notificationConsumer.connect()
    Logger.info('Kafka Consumer connected')
    await notificationConsumer.consume(consumeMessage)
    Logger.info('Kafka Consumer handler created')
    return true
  } catch (err) {
    Logger.error(`error consuming kafka messages- ${err}`)
    throw err
  }
}
const consumeMessage = async (error, message) => {
  Logger.info('Notification::consumeMessage')
  return new Promise(async (resolve, reject) => {
    if (error) {
      Logger.error(`Error while reading message from kafka ${error}`)
      return reject(error)
    }
    Logger.info(`Notification:consumeMessage message: - ${JSON.stringify(message)}`)

    message = (!Array.isArray(message) ? [message] : message)

    for (let msg of message) {
      Logger.info('Notification::consumeMessage::processMessage')
      let res = await processMessage(msg).catch(err => {
        Logger.error(`Error processing the kafka message - ${err}`)
        if (!autoCommitEnabled) {
          notificationConsumer.commitMessageSync(msg)
        }
        // return reject(err) // This is not handled correctly as we need to deal with the error here
        return resolve(err) // We return 'resolved' since we have dealt with the error here
      })
      if (!autoCommitEnabled) {
        notificationConsumer.commitMessageSync(msg)
      }
      return resolve(res)
    }
  })
}

const processMessage = async (msg) => {
  try {
    Logger.info('Notification::processMessage')
    if (!msg.value || !msg.value.content || !msg.value.content.headers || !msg.value.content.payload) {
      throw new Error('Invalid message received from kafka')
    }
    const { metadata, from, to, content, id } = msg.value
    const { action, state } = metadata.event
    const status = state.status
    let headers
    Logger.info('Notification::processMessage action: ' + action)
    Logger.info('Notification::processMessage status: ' + status)
    if (action === 'prepare' && status === 'success') {
      let callbackURL = await Participant.getEndpoint(to, FSPIOP_CALLBACK_URL_TRANSFER_POST, id)
      return Callback.sendCallback(callbackURL, 'post', content.headers, content.payload, id, to)
    } else if (action.toLowerCase() === 'prepare' && status.toLowerCase() !== 'success') {
      let callbackURL = await Participant.getEndpoint(from, FSPIOP_CALLBACK_URL_TRANSFER_ERROR, id)
      return Callback.sendCallback(callbackURL, 'put', content.headers, content.payload, id, from)
    } else if (action.toLowerCase() === 'commit' && status.toLowerCase() === 'success') {
      let callbackURLFrom = await Participant.getEndpoint(from, FSPIOP_CALLBACK_URL_TRANSFER_PUT, id)
      let callbackURLTo = await Participant.getEndpoint(to, FSPIOP_CALLBACK_URL_TRANSFER_PUT, id)
      headers = Object.assign({}, content.headers, { 'FSPIOP-Destination': from })
      await Callback.sendCallback(callbackURLFrom, 'put', headers, content.payload, id, from)
      headers = Object.assign({}, content.headers, { 'FSPIOP-Destination': to })
      return Callback.sendCallback(callbackURLTo, 'put', headers, content.payload, id, to)
    } else if (action.toLowerCase() === 'commit' && status.toLowerCase() !== 'success') {
      let callbackURL = await Participant.getEndpoint(from, FSPIOP_CALLBACK_URL_TRANSFER_ERROR, id)
      return Callback.sendCallback(callbackURL, 'put', content.headers, content.payload, id, from)
    } else if (action.toLowerCase() === 'reject') {
      let callbackURLFrom = await Participant.getEndpoint(from, FSPIOP_CALLBACK_URL_TRANSFER_PUT, id)
      let callbackURLTo = await Participant.getEndpoint(to, FSPIOP_CALLBACK_URL_TRANSFER_PUT, id)
      headers = Object.assign({}, content.headers, { 'FSPIOP-Destination': from })
      await Callback.sendCallback(callbackURLFrom, 'put', headers, content.payload, id, from)
      headers = Object.assign({}, content.headers, { 'FSPIOP-Destination': to })
      return Callback.sendCallback(callbackURLTo, 'put', headers, content.payload, id, to)
    } else if (action.toLowerCase() === 'abort') {
      let callbackURLFrom = await Participant.getEndpoint(from, FSPIOP_CALLBACK_URL_TRANSFER_ERROR, id)
      let callbackURLTo = await Participant.getEndpoint(to, FSPIOP_CALLBACK_URL_TRANSFER_ERROR, id)
      headers = Object.assign({}, content.headers, { 'FSPIOP-Destination': from })
      await Callback.sendCallback(callbackURLFrom, 'put', headers, content.payload, id, from)
      headers = Object.assign({}, content.headers, { 'FSPIOP-Destination': to })
      return Callback.sendCallback(callbackURLTo, 'put', headers, content.payload, id, to)
    } else if (action.toLowerCase() === 'timeout-received') {
      let callbackURL = await Participant.getEndpoint(from, FSPIOP_CALLBACK_URL_TRANSFER_ERROR, id)
      return Callback.sendCallback(callbackURL, 'put', content.headers, content.payload, id, from)
    } else if (action === 'prepare-duplicate') {
      let callbackURL = await Participant.getEndpoint(from, FSPIOP_CALLBACK_URL_TRANSFER_PUT, id)
      return Callback.sendCallback(callbackURL, 'put', content.headers, content.payload, id, from)
    } else {
      const err = new Error('invalid action received from kafka')
      Logger.error(`error sending notification to the callback - ${err}`)
      // @TODO: Handle error for invalid action received failure
      throw err
    }
  } catch (e) {
    // @TODO: Handle error for callback failure
    throw e
  }
}

module.exports = {
  startConsumer,
  processMessage,
  consumeMessage
}
