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

const Producer = require('@mojaloop/central-services-shared').Kafka.Producer
const Logger = require('@mojaloop/central-services-shared').Logger
const Uuid = require('uuid4')
const Utility = require('../../../lib/utility')

const TRANSFER = 'transfer'
const PREPARE = 'prepare'
const FULFILL = 'fulfill'

const publishPrepare = async (headers, message) => {
  Logger.debug('publishPrepare::start')
  try {
    let kafkaConfig = Utility.getKafkaConfig(Utility.ENUMS.PRODUCER, TRANSFER.toUpperCase(), PREPARE.toUpperCase())

    var kafkaProducer = new Producer(kafkaConfig)
    await kafkaProducer.connect()
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
    return await kafkaProducer.sendMessage(messageProtocol, topicConfig)
  } catch (err) {
    Logger.error(`Kafka error:: ERROR:'${err}'`)
    throw err
  }
}

const publishFulfill = async (id, headers, message) => {
  Logger.debug('publishFulfill::start')
  try {
    let kafkaConfig = Utility.getKafkaConfig(Utility.ENUMS.PRODUCER, TRANSFER.toUpperCase(), FULFILL.toUpperCase())

    var kafkaProducer = new Producer(kafkaConfig)
    await kafkaProducer.connect()
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
          type: 'fulfill',
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
      topicName: Utility.getParticipantTopicName(headers['fspiop-source'], TRANSFER, FULFILL) // `topic-${message.payerFsp}-transfer-prepare`
    }
    return await kafkaProducer.sendMessage(messageProtocol, topicConfig)
  } catch (err) {
    Logger.error(`Kafka error:: ERROR:'${err}'`)
    throw err
  }
}
module.exports = {
  publishPrepare,
  publishFulfill
}
