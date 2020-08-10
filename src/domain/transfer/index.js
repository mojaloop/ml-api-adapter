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

const Logger = require('@mojaloop/central-services-logger')
const Kafka = require('@mojaloop/central-services-stream').Util
const KafkaUtil = require('@mojaloop/central-services-shared').Util.Kafka
const StreamingProtocol = require('@mojaloop/central-services-shared').Util.StreamingProtocol
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
* @param {object} headers - the http request headers
* @param {object} dataUri - the encoded payload message
* @param {object} payload - the http request payload
* @param {object} span - the parent event span
*
* @returns {boolean} Returns true on successful publishing of message to kafka, throws error on failures
*/
const prepare = async (headers, dataUri, payload, span) => {
  Logger.isDebugEnabled && Logger.debug('domain::transfer::prepare::start(%s, %s)', headers, payload)
  try {
    const state = StreamingProtocol.createEventState(generalEnum.Events.EventStatus.SUCCESS.status, generalEnum.Events.EventStatus.SUCCESS.code, generalEnum.Events.EventStatus.SUCCESS.description)
    const event = StreamingProtocol.createEventMetadata(generalEnum.Events.Event.Type.PREPARE, generalEnum.Events.Event.Type.PREPARE, state)
    const metadata = StreamingProtocol.createMetadata(payload.transferId, event)
    let messageProtocol = StreamingProtocol.createMessageFromRequest(payload.transferId, { headers, dataUri, params: { id: payload.transferId } }, payload.payeeFsp, payload.payerFsp, metadata)
    const topicConfig = KafkaUtil.createGeneralTopicConf(Config.KAFKA_CONFIG.TOPIC_TEMPLATES.GENERAL_TOPIC_TEMPLATE.TEMPLATE, generalEnum.Events.Event.Action.TRANSFER, generalEnum.Events.Event.Action.PREPARE)
    const kafkaConfig = KafkaUtil.getKafkaConfig(Config.KAFKA_CONFIG, generalEnum.Kafka.Config.PRODUCER, generalEnum.Events.Event.Action.TRANSFER.toUpperCase(), generalEnum.Events.Event.Action.PREPARE.toUpperCase())
    Logger.isDebugEnabled && Logger.debug(`domain::transfer::prepare::messageProtocol - ${messageProtocol}`)
    Logger.isDebugEnabled && Logger.debug(`domain::transfer::prepare::topicConfig - ${topicConfig}`)
    Logger.isDebugEnabled && Logger.debug(`domain::transfer::prepare::kafkaConfig - ${kafkaConfig}`)
    // TODO: re-enable once we are able to configure the log-level
    // await span.debug({
    //   messageProtocol,
    //   topicName: topicConfig.topicName,
    //   clientId: kafkaConfig.rdkafkaConf['client.id']
    // })
    messageProtocol = await span.injectContextToMessage(messageProtocol)
    await Kafka.Producer.produceMessage(messageProtocol, topicConfig, kafkaConfig)
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
* @param {object} headers - the http request headers
* @param {object} dataUri - the encoded payload message
* @param {object} payload - the http request payload
* @param {object} params - the http request uri parameters
* @param {object} span - the parent event span
*
* @returns {boolean} Returns true on successful publishing of message to kafka, throws error on failures
*/
const fulfil = async (headers, dataUri, payload, params, span) => {
  Logger.isDebugEnabled && Logger.debug('domain::transfer::fulfil::start(%s, %s, %s)', params.id, headers, payload)
  try {
    const action = payload.transferState === generalEnum.Transfers.TransferState.ABORTED ? generalEnum.Events.Event.Action.REJECT : (payload.transferState === generalEnum.Transfers.TransferState.RESERVED) ? generalEnum.Events.Event.Action.RESERVE : generalEnum.Events.Event.Action.COMMIT
    const state = StreamingProtocol.createEventState(generalEnum.Events.EventStatus.SUCCESS.status, generalEnum.Events.EventStatus.SUCCESS.code, generalEnum.Events.EventStatus.SUCCESS.description)
    const event = StreamingProtocol.createEventMetadata(generalEnum.Events.Event.Type.FULFIL, action, state)
    const metadata = StreamingProtocol.createMetadata(params.id, event)
    let messageProtocol = StreamingProtocol.createMessageFromRequest(params.id, { headers, dataUri, params }, headers[generalEnum.Http.Headers.FSPIOP.DESTINATION], headers[generalEnum.Http.Headers.FSPIOP.SOURCE], metadata)
    const topicConfig = KafkaUtil.createGeneralTopicConf(Config.KAFKA_CONFIG.TOPIC_TEMPLATES.GENERAL_TOPIC_TEMPLATE.TEMPLATE, generalEnum.Events.Event.Action.TRANSFER, generalEnum.Events.Event.Action.FULFIL)
    const kafkaConfig = KafkaUtil.getKafkaConfig(Config.KAFKA_CONFIG, generalEnum.Kafka.Config.PRODUCER, generalEnum.Events.Event.Action.TRANSFER.toUpperCase(), generalEnum.Events.Event.Action.FULFIL.toUpperCase())
    Logger.isDebugEnabled && Logger.debug(`domain::transfer::fulfil::messageProtocol - ${messageProtocol}`)
    Logger.isDebugEnabled && Logger.debug(`domain::transfer::fulfil::topicConfig - ${topicConfig}`)
    Logger.isDebugEnabled && Logger.debug(`domain::transfer::fulfil::kafkaConfig - ${kafkaConfig}`)
    await span.debug({
      messageProtocol,
      topicName: topicConfig.topicName,
      clientId: kafkaConfig.rdkafkaConf['client.id']
    })
    messageProtocol = await span.injectContextToMessage(messageProtocol)
    await Kafka.Producer.produceMessage(messageProtocol, topicConfig, kafkaConfig)
    return true
  } catch (err) {
    Logger.error(`domain::transfer::fulfil::Kafka error:: ERROR:'${err}'`)
    const fspiopError = ErrorHandler.Factory.reformatFSPIOPError(err)
    Logger.error(fspiopError)
    throw fspiopError
  }
}

/**
 * @function byId
 * @async
 * @description This will produce a transfer fulfil message to transfer fulfil kafka topic. It gets the kafka configuration from config. It constructs the message and published to kafka
 *
 * @param {object} headers - the http request headers
 * @param {object} params - the http request uri parameters
 * @param {object} span - the parent event span
 *
 * @returns {boolean} Returns true on successful publishing of message to kafka, throws error on failures
 */
const getTransferById = async (headers, params, span) => {
  Logger.isInfoEnabled && Logger.info('domain::transfer::transferById::start(%s, %s, %s)', params.id, headers)
  try {
    const state = StreamingProtocol.createEventState(generalEnum.Events.EventStatus.SUCCESS.status, generalEnum.Events.EventStatus.SUCCESS.code, generalEnum.Events.EventStatus.SUCCESS.description)
    const event = StreamingProtocol.createEventMetadata(generalEnum.Events.Event.Type.GET, generalEnum.Events.Event.Type.GET, state)
    const metadata = StreamingProtocol.createMetadata(params.id, event)
    let messageProtocol = StreamingProtocol.createMessageFromRequest(params.id, { headers, dataUri: undefined, params }, headers[generalEnum.Http.Headers.FSPIOP.DESTINATION], headers[generalEnum.Http.Headers.FSPIOP.SOURCE], metadata)
    const topicConfig = KafkaUtil.createGeneralTopicConf(Config.KAFKA_CONFIG.TOPIC_TEMPLATES.GENERAL_TOPIC_TEMPLATE.TEMPLATE, generalEnum.Events.Event.Action.TRANSFER, generalEnum.Events.Event.Action.GET)
    const kafkaConfig = KafkaUtil.getKafkaConfig(Config.KAFKA_CONFIG, generalEnum.Kafka.Config.PRODUCER, generalEnum.Events.Event.Action.TRANSFER.toUpperCase(), generalEnum.Events.Event.Action.GET.toUpperCase())
    Logger.isInfoEnabled && Logger.info(`domain::transfer::get::messageProtocol - ${messageProtocol}`)
    Logger.isInfoEnabled && Logger.info(`domain::transfer::get::topicConfig - ${topicConfig}`)
    Logger.isInfoEnabled && Logger.info(`domain::transfer::get::kafkaConfig - ${kafkaConfig}`)
    // TODO: re-enable once we are able to configure the log-level
    // await span.debug({
    //   messageProtocol,
    //   topicName: topicConfig.topicName,
    //   clientId: kafkaConfig.rdkafkaConf['client.id']
    // })
    messageProtocol = await span.injectContextToMessage(messageProtocol)
    await Kafka.Producer.produceMessage(messageProtocol, topicConfig, kafkaConfig)
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
* @param {object} headers - the http request headers
* @param {object} dataUri - the encoded payload message
* @param {object} payload - the http request payload
* @param {object} params - the http request uri parameters
* @param {object} span - the parent event span
*
* @returns {boolean} Returns true on successful publishing of message to kafka, throws error on failures
*/
const transferError = async (headers, dataUri, payload, params, span) => {
  Logger.isDebugEnabled && Logger.debug('domain::transfer::abort::start(%s, %s, %s)', params.id, headers, payload)
  try {
    const state = StreamingProtocol.createEventState(generalEnum.Events.EventStatus.SUCCESS.status, generalEnum.Events.EventStatus.SUCCESS.code, generalEnum.Events.EventStatus.SUCCESS.description)
    const event = StreamingProtocol.createEventMetadata(generalEnum.Events.Event.Type.FULFIL, generalEnum.Events.Event.Action.ABORT, state)
    const metadata = StreamingProtocol.createMetadata(params.id, event)
    let messageProtocol = StreamingProtocol.createMessageFromRequest(params.id, { headers, dataUri, params }, headers[generalEnum.Http.Headers.FSPIOP.DESTINATION], headers[generalEnum.Http.Headers.FSPIOP.SOURCE], metadata)
    const topicConfig = KafkaUtil.createGeneralTopicConf(Config.KAFKA_CONFIG.TOPIC_TEMPLATES.GENERAL_TOPIC_TEMPLATE.TEMPLATE, generalEnum.Events.Event.Action.TRANSFER, generalEnum.Events.Event.Action.FULFIL)
    const kafkaConfig = KafkaUtil.getKafkaConfig(Config.KAFKA_CONFIG, generalEnum.Kafka.Config.PRODUCER, generalEnum.Events.Event.Action.TRANSFER.toUpperCase(), generalEnum.Events.Event.Action.FULFIL.toUpperCase())
    Logger.isDebugEnabled && Logger.debug(`domain::transfer::abort::messageProtocol - ${messageProtocol}`)
    Logger.isDebugEnabled && Logger.debug(`domain::transfer::abort::topicConfig - ${topicConfig}`)
    Logger.isDebugEnabled && Logger.debug(`domain::transfer::abort::kafkaConfig - ${kafkaConfig}`)
    // TODO: re-enable once we are able to configure the log-level
    // await span.debug({
    //   messageProtocol,
    //   topicName: topicConfig.topicName,
    //   clientId: kafkaConfig.rdkafkaConf['client.id']
    // })
    messageProtocol = await span.injectContextToMessage(messageProtocol)
    await Kafka.Producer.produceMessage(messageProtocol, topicConfig, kafkaConfig)
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
