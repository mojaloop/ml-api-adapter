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

const Logger = require('@mojaloop/central-services-shared').Logger
const Uuid = require('uuid4')
const Utility = require('../../lib/utility')
const Kafka = require('../../lib/kafka')

const TRANSFER = 'transfer'
const PREPARE = 'prepare'
const FULFIL = 'fulfil'
const GET = 'get'

/**
 * @module src/domain/transfer
 */

/**
* @function prepare
* @async
* @description This will produce a transfer prepare message to transfer prepare kafka topic. It gets the kafka configuration from config. It constructs the message and published to kafka
*
* @param {object} headers - the http header from the request
* @param {object} message - the transfer prepare message
*
* @returns {boolean} Returns true on successful publishing of message to kafka, throws error on falires
*/
const prepare = async (headers, message, dataUri) => {
  Logger.debug('domain::transfer::prepare::start(%s, %s)', headers, message)
  try {
    const messageId = Uuid()
    const messageProtocol = {
      id: messageId,
      to: message.payeeFsp,
      from: message.payerFsp,
      type: 'application/json',
      content: {
        headers: headers,
        payload: dataUri
      },
      metadata: {
        event: {
          id: Uuid(),
          type: 'prepare',
          action: 'prepare',
          createdAt: new Date(),
          state: {
            status: 'success',
            code: 0
          }
        }
      }
    }
    const topicConfig = Utility.createGeneralTopicConf(TRANSFER, PREPARE)
    const kafkaConfig = Utility.getKafkaConfig(Utility.ENUMS.PRODUCER, TRANSFER.toUpperCase(), PREPARE.toUpperCase())
    Logger.debug(`domain::transfer::prepare::messageProtocol - ${messageProtocol}`)
    Logger.debug(`domain::transfer::prepare::topicConfig - ${topicConfig}`)
    Logger.debug(`domain::transfer::prepare::kafkaConfig - ${kafkaConfig}`)
    await Kafka.Producer.produceMessage(messageProtocol, topicConfig, kafkaConfig)
    return true
  } catch (err) {
    Logger.error(`domain::transfer::prepare::Kafka error:: ERROR:'${err}'`)
    throw err
  }
}

/**
* @function fulfil
* @async
* @description This will produce a transfer fulfil message to transfer fulfil kafka topic. It gets the kafka configuration from config. It constructs the message and published to kafka
*
* @param {string} transferId - transferId
* @param {object} headers - the http header from the request
* @param {object} message - the transfer fulfil message
*
* @returns {boolean} Returns true on successful publishing of message to kafka, throws error on falires
*/
const fulfil = async (transferId, headers, message, dataUri) => {
  Logger.debug('domain::transfer::fulfil::start(%s, %s, %s)', transferId, headers, message)
  try {
    const messageId = Uuid()
    const action = message.transferState === 'ABORTED' ? 'reject' : 'commit'
    const messageProtocol = {
      id: messageId,
      to: headers['fspiop-destination'],
      from: headers['fspiop-source'],
      type: 'application/json',
      content: {
        uriParams: { id: transferId },
        headers: headers,
        payload: dataUri
      },
      metadata: {
        event: {
          id: Uuid(),
          type: 'fulfil',
          action,
          createdAt: new Date(),
          state: {
            status: 'success',
            code: 0
          }
        }
      }
    }
    const topicConfig = Utility.createGeneralTopicConf(TRANSFER, FULFIL)
    const kafkaConfig = Utility.getKafkaConfig(Utility.ENUMS.PRODUCER, TRANSFER.toUpperCase(), FULFIL.toUpperCase())
    Logger.debug(`domain::transfer::fulfil::messageProtocol - ${messageProtocol}`)
    Logger.debug(`domain::transfer::fulfil::topicConfig - ${topicConfig}`)
    Logger.debug(`domain::transfer::fulfil::kafkaConfig - ${kafkaConfig}`)
    await Kafka.Producer.produceMessage(messageProtocol, topicConfig, kafkaConfig)
    return true
  } catch (err) {
    Logger.error(`domain::transfer::fulfil::Kafka error:: ERROR:'${err}'`)
    throw err
  }
}

// to do
/**
 * @function byId
 * @async
 * @description This will produce a transfer fulfil message to transfer fulfil kafka topic. It gets the kafka configuration from config. It constructs the message and published to kafka
 *
 * @param {string} id - the transferId
 * @param {object} headers - the http header from the request
 * @param {object} message - the transfer fulfil message
 *
 * @returns {boolean} Returns true on successful publishing of message to kafka, throws error on falires
 */
const getTransferById = async (transferId, headers) => {
  Logger.info('domain::transfer::transferById::start(%s, %s, %s)', transferId, headers)
  try {
    const messageId = Uuid()
    const messageProtocol = {
      id: messageId,
      to: headers['fspiop-destination'],
      from: headers['fspiop-source'],
      type: 'application/json',
      content: {
        uriParams: { id: transferId },
        headers: headers,
        payload: {}
      },
      metadata: {
        event: {
          id: Uuid(),
          type: 'get',
          action: 'get',
          createdAt: new Date(),
          state: {
            status: 'success',
            code: 0
          }
        }
      }
    }
    const topicConfig = { topicName: Utility.getTransferByIdTopicName() }
    const kafkaConfig = Utility.getKafkaConfig(Utility.ENUMS.PRODUCER, TRANSFER.toUpperCase(), GET.toUpperCase())
    Logger.info(`domain::transfer::get::messageProtocol - ${messageProtocol}`)
    Logger.info(`domain::transfer::get::topicConfig - ${topicConfig}`)
    Logger.info(`domain::transfer::get::kafkaConfig - ${kafkaConfig}`)
    await Kafka.Producer.produceMessage(messageProtocol, topicConfig, kafkaConfig)
    return true
  } catch (err) {
    Logger.error(`domain::transfer::fulfil::Kafka error:: ERROR:'${err}'`)
    throw err
  }
}

/**
* @function transferError
* @async
* @description This will produce a transfer error message to transfer fulfil kafka topic. It gets the kafka configuration from config. It constructs the message and published to kafka
*
* @param {string} id - the transferId
* @param {object} headers - the http header from the request
* @param {object} message - the transfer fulfil message
*
* @returns {boolean} Returns true on successful publishing of message to kafka, throws error on falires
*/
const transferError = async (transferId, headers, message, dataUri) => {
  Logger.debug('domain::transfer::abort::start(%s, %s, %s)', transferId, headers, message)
  try {
    const messageId = Uuid()
    const messageProtocol = {
      id: messageId,
      to: headers['fspiop-destination'],
      from: headers['fspiop-source'],
      type: 'application/json',
      content: {
        uriParams: { id: transferId },
        headers: headers,
        payload: dataUri
      },
      metadata: {
        event: {
          id: Uuid(),
          type: 'fulfil',
          action: 'abort',
          createdAt: new Date(),
          state: {
            status: 'success',
            code: 0
          }
        }
      }
    }
    const topicConfig = Utility.createGeneralTopicConf(TRANSFER, FULFIL)
    const kafkaConfig = Utility.getKafkaConfig(Utility.ENUMS.PRODUCER, TRANSFER.toUpperCase(), FULFIL.toUpperCase())
    Logger.debug(`domain::transfer::abort::messageProtocol - ${messageProtocol}`)
    Logger.debug(`domain::transfer::abort::topicConfig - ${topicConfig}`)
    Logger.debug(`domain::transfer::abort::kafkaConfig - ${kafkaConfig}`)
    await Kafka.Producer.produceMessage(messageProtocol, topicConfig, kafkaConfig)
    return true
  } catch (err) {
    Logger.error(`domain::transfer::abort::Kafka error:: ERROR:'${err}'`)
    throw err
  }
}
module.exports = {
  fulfil,
  getTransferById,
  prepare,
  transferError
}
