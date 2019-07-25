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
 * Rajiv Mothilal <rajiv.mothilal@modusbox.com>

 --------------
 ******/
'use strict'

const Logger = require('@mojaloop/central-services-shared').Logger
const KafkaUtil = require('@mojaloop/central-services-shared').Util.Kafka
const ErrorHandler = require('@mojaloop/central-services-error-handling')
const Config = require('../../lib/config')
const generalEnum = require('@mojaloop/central-services-shared').Enum

/**
 * @module src/domain/transfer
 */

/**
* @function prepare
* @async
* @description This will produce a transfer prepare message to transfer prepare kafka topic. It gets the kafka configuration from config. It constructs the message and published to kafka
*
* @param {object} request - the http request from HAPI server
*
* @returns {boolean} Returns true on successful publishing of message to kafka, throws error on failures
*/
const prepare = async (request) => {
  Logger.debug('domain::transfer::prepare::start(%s, %s)', request.headers, request.payload)
  try {
    const messageProtocol = KafkaUtil.Utility.generateStreamingMessageFromRequest(request, request.payload.payeeFsp, request.payload.payerFsp, generalEnum.Events.Event.Type.PREPARE, generalEnum.Events.Event.Type.PREPARE)
    const topicConfig = KafkaUtil.Utility.createGeneralTopicConf(Config.KAFKA_CONFIG.TOPIC_TEMPLATES.GENERAL_TOPIC_TEMPLATE.TEMPLATE, generalEnum.Events.Event.Action.TRANSFER, generalEnum.Events.Event.Action.PREPARE)
    const kafkaConfig = KafkaUtil.Utility.getKafkaConfig(Config.KAFKA_CONFIG, generalEnum.Kafka.Config.PRODUCER, generalEnum.Events.Event.Action.TRANSFER.toUpperCase(), generalEnum.Events.Event.Action.PREPARE.toUpperCase())
    Logger.debug(`domain::transfer::prepare::messageProtocol - ${messageProtocol}`)
    Logger.debug(`domain::transfer::prepare::topicConfig - ${topicConfig}`)
    Logger.debug(`domain::transfer::prepare::kafkaConfig - ${kafkaConfig}`)
    await KafkaUtil.Producer.produceMessage(messageProtocol, topicConfig, kafkaConfig)
    return true
  } catch (err) {
    Logger.error(`domain::transfer::prepare::Kafka error:: ERROR:'${err}'`)
    const fspiopError = ErrorHandler.Factory.reformatFSPIOPError(err)
    Logger.error(fspiopError)
    throw fspiopError
  }
}

/**
* @function fulfil
* @async
* @description This will produce a transfer fulfil message to transfer fulfil kafka topic. It gets the kafka configuration from config. It constructs the message and published to kafka
*
* @param {object} request - the http request from HAPI
*
* @returns {boolean} Returns true on successful publishing of message to kafka, throws error on failures
*/
const fulfil = async (request) => {
  Logger.debug('domain::transfer::fulfil::start(%s, %s, %s)', request.params.is, request.headers, request.payload)
  try {
    const headers = request.headers
    const action = request.payload.transferState === generalEnum.Transfers.TransferState.ABORTED ? generalEnum.Events.Event.Action.REJECT : generalEnum.Events.Event.Action.REJECT
    const messageProtocol = KafkaUtil.Utility.generateStreamingMessageFromRequest(request, headers[generalEnum.Http.Headers.FSPIOP.DESTINATION], headers[generalEnum.Http.Headers.FSPIOP.SOURCE], generalEnum.Events.Event.Type.FULFIL, action)
    const topicConfig = KafkaUtil.Utility.createGeneralTopicConf(Config.KAFKA_CONFIG.TOPIC_TEMPLATES.GENERAL_TOPIC_TEMPLATE.TEMPLATE, generalEnum.Events.Event.Action.TRANSFER, generalEnum.Events.Event.Action.FULFIL)
    const kafkaConfig = KafkaUtil.Utility.getKafkaConfig(Config.KAFKA_CONFIG, generalEnum.Kafka.Config.PRODUCER, generalEnum.Events.Event.Action.TRANSFER.toUpperCase(), generalEnum.Events.Event.Action.FULFIL.toUpperCase())
    Logger.debug(`domain::transfer::fulfil::messageProtocol - ${messageProtocol}`)
    Logger.debug(`domain::transfer::fulfil::topicConfig - ${topicConfig}`)
    Logger.debug(`domain::transfer::fulfil::kafkaConfig - ${kafkaConfig}`)
    await KafkaUtil.Producer.produceMessage(messageProtocol, topicConfig, kafkaConfig)
    return true
  } catch (err) {
    Logger.error(`domain::transfer::fulfil::Kafka error:: ERROR:'${err}'`)
    const fspiopError = ErrorHandler.Factory.reformatFSPIOPError(err)
    Logger.error(fspiopError)
    throw fspiopError
  }
}

// to do
/**
 * @function byId
 * @async
 * @description This will produce a transfer fulfil message to transfer fulfil kafka topic. It gets the kafka configuration from config. It constructs the message and published to kafka
 *
 * @param {object} request - the http request from HAPI
 *
 * @returns {boolean} Returns true on successful publishing of message to kafka, throws error on failures
 */
const getTransferById = async (request) => {
  Logger.info('domain::transfer::transferById::start(%s, %s, %s)', request.params.id, request.headers)
  try {
    const headers = request.headers
    const messageProtocol = KafkaUtil.Utility.generateStreamingMessageFromRequest(request, headers[generalEnum.Http.Headers.FSPIOP.DESTINATION], headers[generalEnum.Http.Headers.FSPIOP.SOURCE], generalEnum.Events.Event.Type.GET, generalEnum.Events.Event.Type.GET)
    const topicConfig = KafkaUtil.Utility.createGeneralTopicConf(Config.KAFKA_CONFIG.TOPIC_TEMPLATES.GENERAL_TOPIC_TEMPLATE.TEMPLATE, generalEnum.Events.Event.Action.TRANSFER, generalEnum.Events.Event.Action.GET)
    const kafkaConfig = KafkaUtil.Utility.getKafkaConfig(Config.KAFKA_CONFIG, generalEnum.Kafka.Config.PRODUCER, generalEnum.Events.Event.Action.TRANSFER.toUpperCase(), generalEnum.Events.Event.Action.GET.toUpperCase())
    Logger.info(`domain::transfer::get::messageProtocol - ${messageProtocol}`)
    Logger.info(`domain::transfer::get::topicConfig - ${topicConfig}`)
    Logger.info(`domain::transfer::get::kafkaConfig - ${kafkaConfig}`)
    await KafkaUtil.Producer.produceMessage(messageProtocol, topicConfig, kafkaConfig)
    return true
  } catch (err) {
    Logger.error(`domain::transfer::fulfil::Kafka error:: ERROR:'${err}'`)
    const fspiopError = ErrorHandler.Factory.reformatFSPIOPError(err)
    Logger.error(fspiopError)
    throw fspiopError
  }
}

/**
* @function transferError
* @async
* @description This will produce a transfer error message to transfer fulfil kafka topic. It gets the kafka configuration from config. It constructs the message and published to kafka
*
* @param {object} request - the http request from HAPI
*
* @returns {boolean} Returns true on successful publishing of message to kafka, throws error on failures
*/
const transferError = async (request) => {
  Logger.debug('domain::transfer::abort::start(%s, %s, %s)', request.params.id, request.headers, request.payload)
  try {
    const headers = request.headers
    const messageProtocol = KafkaUtil.Utility.generateStreamingMessageFromRequest(request, headers[generalEnum.Http.Headers.FSPIOP.DESTINATION], headers[generalEnum.Http.Headers.FSPIOP.SOURCE], generalEnum.Events.Event.Type.FULFIL, generalEnum.Events.Event.Action.ABORT)
    const topicConfig = KafkaUtil.Utility.createGeneralTopicConf(Config.KAFKA_CONFIG.TOPIC_TEMPLATES.GENERAL_TOPIC_TEMPLATE.TEMPLATE, generalEnum.Events.Event.Action.TRANSFER, generalEnum.Events.Event.Action.FULFIL)
    const kafkaConfig = KafkaUtil.Utility.getKafkaConfig(Config.KAFKA_CONFIG, generalEnum.Kafka.Config.PRODUCER, generalEnum.Events.Event.Action.TRANSFER.toUpperCase(), generalEnum.Events.Event.Action.FULFIL.toUpperCase())
    Logger.debug(`domain::transfer::abort::messageProtocol - ${messageProtocol}`)
    Logger.debug(`domain::transfer::abort::topicConfig - ${topicConfig}`)
    Logger.debug(`domain::transfer::abort::kafkaConfig - ${kafkaConfig}`)
    await KafkaUtil.Producer.produceMessage(messageProtocol, topicConfig, kafkaConfig)
    return true
  } catch (err) {
    Logger.error(`domain::transfer::abort::Kafka error:: ERROR:'${err}'`)
    const fspiopError = ErrorHandler.Factory.reformatFSPIOPError(err)
    Logger.error(fspiopError)
    throw fspiopError
  }
}
module.exports = {
  fulfil,
  getTransferById,
  prepare,
  transferError
}
