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

const Kafka = require('@mojaloop/central-services-stream').Util
const KafkaUtil = require('@mojaloop/central-services-shared').Util.Kafka
const StreamingProtocol = require('@mojaloop/central-services-shared').Util.StreamingProtocol
const ErrorHandler = require('@mojaloop/central-services-error-handling')
const generalEnum = require('@mojaloop/central-services-shared').Enum

const Config = require('../../lib/config')
const { logger } = require('../../shared/logger')
const dto = require('./dto')

const { Action, Type } = generalEnum.Events.Event

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
  const logPrefix = `domain::${payload.transferId ? 'transfer' : 'fxTransfer'}::prepare`
  logger.debug(`${logPrefix}::start`, { headers, payload })

  try {
    let messageProtocol = dto.prepareMessageDto({ headers, dataUri, payload, logPrefix })
    messageProtocol = await span.injectContextToMessage(messageProtocol)
    const { topicConfig, kafkaConfig } = dto.producerConfigDto(Action.TRANSFER, Action.PREPARE, logPrefix)

    await Kafka.Producer.produceMessage(messageProtocol, topicConfig, kafkaConfig)
    return true
  } catch (err) {
    logger.error(`${logPrefix}::Kafka error:: ERROR:'${err}'`)
    const fspiopError = ErrorHandler.Factory.reformatFSPIOPError(err)
    logger.error(fspiopError)
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
  const logPrefix = `domain::${payload.transferState ? 'transfer' : 'fxTransfer'}::fulfil`
  logger.debug(`${logPrefix}::start(${params.id})`, { headers, payload })

  try {
    let messageProtocol = dto.fulfilMessageDto({ headers, dataUri, payload, params, logPrefix })
    messageProtocol = await span.injectContextToMessage(messageProtocol)
    const { topicConfig, kafkaConfig } = dto.producerConfigDto(Action.TRANSFER, Action.FULFIL, logPrefix)

    await Kafka.Producer.produceMessage(messageProtocol, topicConfig, kafkaConfig)
    return true
  } catch (err) {
    logger.error(`${logPrefix}::Kafka error:: ERROR:'${err}'`)
    const fspiopError = ErrorHandler.Factory.reformatFSPIOPError(err)
    logger.error(fspiopError)
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
  logger.debug(`domain::transfer::transferById::start(${params.id}, ${JSON.stringify(headers)}`)
  try {
    const state = dto.eventStateDto()
    const event = StreamingProtocol.createEventMetadata(Type.GET, Type.GET, state)
    const metadata = StreamingProtocol.createMetadata(params.id, event)
    let messageProtocol = StreamingProtocol.createMessageFromRequest(params.id, { headers, dataUri: undefined, params }, headers[generalEnum.Http.Headers.FSPIOP.DESTINATION], headers[generalEnum.Http.Headers.FSPIOP.SOURCE], metadata)
    const topicConfig = KafkaUtil.createGeneralTopicConf(Config.KAFKA_CONFIG.TOPIC_TEMPLATES.GENERAL_TOPIC_TEMPLATE.TEMPLATE, Action.TRANSFER, Action.GET)
    const kafkaConfig = KafkaUtil.getKafkaConfig(Config.KAFKA_CONFIG, generalEnum.Kafka.Config.PRODUCER, Action.TRANSFER.toUpperCase(), Action.GET.toUpperCase())
    logger.info(`domain::transfer::get::messageProtocol - ${messageProtocol}`)
    logger.info(`domain::transfer::get::topicConfig - ${topicConfig}`)
    logger.info(`domain::transfer::get::kafkaConfig - ${kafkaConfig}`)

    messageProtocol = await span.injectContextToMessage(messageProtocol)
    await Kafka.Producer.produceMessage(messageProtocol, topicConfig, kafkaConfig)
    return true
  } catch (err) {
    logger.error(`domain::transfer::fulfil::Kafka error:: ERROR:'${err}'`)
    const fspiopError = ErrorHandler.Factory.reformatFSPIOPError(err)
    logger.error(fspiopError)
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
* @param {boolean} isFx - is fxTransfer
*
* @returns {boolean} Returns true on successful publishing of message to kafka, throws error on failures
*/
const transferError = async (headers, dataUri, payload, params, span, isFx = false) => {
  const logPrefix = `domain::${isFx ? 'fx_' : ''}transfer::abort`
  logger.debug(`${logPrefix}::start(${params.id})`, { headers, payload })

  try {
    let messageProtocol = dto.fulfilErrorMessageDto({ headers, dataUri, payload, params, isFx, logPrefix })
    messageProtocol = await span.injectContextToMessage(messageProtocol)
    const { topicConfig, kafkaConfig } = dto.producerConfigDto(Action.TRANSFER, Action.FULFIL, logPrefix)

    await Kafka.Producer.produceMessage(messageProtocol, topicConfig, kafkaConfig)
    return true
  } catch (err) {
    logger.error(`${logPrefix}::Kafka error:: ERROR:'${err}'`)
    const fspiopError = ErrorHandler.Factory.reformatFSPIOPError(err)
    logger.error(fspiopError)
    throw fspiopError
  }
}

module.exports = {
  fulfil,
  getTransferById,
  prepare,
  transferError
}
