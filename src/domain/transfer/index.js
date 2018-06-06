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

const Logger = require('@mojaloop/central-services-shared').Logger
const Uuid = require('uuid4')
const Utility = require('../../lib/utility')
const Kafka = require('../../lib/kafka')

const TRANSFER = 'transfer'
const PREPARE = 'prepare'
const FULFIL = 'fulfil'

const prepare = async (headers, message) => {
  Logger.debug('prepare::start(%s, %s)', headers, message)
  try {
    const kafkaConfig = Utility.getKafkaConfig(Utility.ENUMS.PRODUCER, TRANSFER.toUpperCase(), PREPARE.toUpperCase())
    const messageProtocol = {
      id: message.transferId,
      to: message.payeeFsp,
      from: message.payerFsp,
      type: 'application/json',
      content: {
        headers: headers,
        payload: message
      },
      metadata: {
        event: {
          id: Uuid(),
          type: 'prepare',
          action: 'prepare',
          createdAt: new Date(),
          status: 'success'
        }
      }
    }
    const topicConfig = {
      topicName: Utility.getParticipantTopicName(message.payerFsp, TRANSFER, PREPARE) // `topic-${message.payerFsp}-transfer-prepare`
    }
    await Kafka.Producer.produceMessage(messageProtocol, topicConfig, kafkaConfig)
    await Kafka.Producer.disconnect()
    return true
  } catch (err) {
    Logger.error(`Kafka error:: ERROR:'${err}'`)
    await Kafka.Producer.disconnect()
    throw err
  }
}
const fulfil = async (id, headers, message) => {
  Logger.debug('prepare::start(%s, %s, %s)', id, headers, message)
  try {
    const kafkaConfig = Utility.getKafkaConfig(Utility.ENUMS.PRODUCER, TRANSFER.toUpperCase(), FULFIL.toUpperCase())
    const messageProtocol = {
      id,
      to: headers['fspiop-destination'],
      from: headers['fspiop-source'],
      type: 'application/json',
      content: {
        headers: headers,
        payload: message
      },
      metadata: {
        event: {
          id: Uuid(),
          type: 'fulfil',
          action: 'commit',
          createdAt: new Date(),
          state: {
            status: 'success',
            code: 0
          }
        }
      }
    }
    const topicConfig = {
      topicName: Utility.getFulfilTopicName() // `topic-${message.payerFsp}-transfer-prepare`
    }
    await Kafka.Producer.produceMessage(messageProtocol, topicConfig, kafkaConfig)
    return Kafka.Producer.disconnect()
  } catch (err) {
    Logger.error(`Kafka error:: ERROR:'${err}'`)
    await Kafka.Producer.disconnect()
    throw err
  }
}

module.exports = {
  prepare,
  fulfil
}
