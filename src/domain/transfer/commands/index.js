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
const Producer = require('@mojaloop/central-services-shared').Kafka.Producer

const publishPrepare = async (message) => {
  var kafkaProducer = new Producer()
  var connectionResult = await kafkaProducer.connect().catch(err => false)
  Logger.info(`Connected result=${connectionResult}`)
  if (connectionResult) {
    let messageProtocol = {
      content: message,
      id: message.transferId,
      to: message.payeeFsp,
      from: message.payerFsp,
      metadata: {
        date: new Date()
      },
      type: 'application/json'
    }
    let topicConfig = {
      topicName: 'transfer'
    }
    return await kafkaProducer.sendMessage(messageProtocol, topicConfig)
      .then(result => {
        kafkaProducer.disconnect()
        return result
      })
      .catch(err => {
        Logger.error(`Kafka error:: ERROR:'${err}'`)
        kafkaProducer.disconnect()
        throw err
      })
  } else {
    reject('Not succesful in connecting to kafka cluster')
  }
}

module.exports = {
  publishPrepare
}
