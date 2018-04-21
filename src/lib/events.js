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

const Events = require('events')
const ledgerEmitter = new Events()

const transferRejected = 'transferRejected'
const transferPrepared = 'transferPrepared'
const transferExecuted = 'transferExecuted'
const publishMessage = 'publish.message'
const messageSend = 'message.send'
const emailSettlementCsvSend = 'emailSettlementCsv'

const publish = (path, message) => {
  ledgerEmitter.emit(path, message)
}

const listen = (path, callback) => {
  ledgerEmitter.on(path, (message) => {
    callback(message)
  })
}

module.exports = {
  onTransferPrepared: (callback) => {
    listen(transferPrepared, callback)
  },
  onTransferExecuted: (callback) => {
    listen(transferExecuted, callback)
  },
  onTransferRejected: (callback) => {
    listen(transferRejected, callback)
  },
  onMessageSent: (callback) => {
    listen(messageSend, callback)
  },
  onEmailSettlementCsv: (callback) => {
    listen(emailSettlementCsvSend, callback)
  },
  onPublishMessage: (callback) => {
    listen(publishMessage, callback)
  },
  emitTransferPrepared: (transfer) => {
    publish(transferPrepared, {
      resource: transfer
    })
  },
  emitPublishMessage: (topic, key, msg) => {
    publish(publishMessage, {
      topic: topic,
      key: key,
      msg: msg
    })
  },
  emitTransferExecuted: (resource, relatedResources) => {
    publish(transferExecuted, {
      resource: resource,
      related_resources: relatedResources
    })
  },
  emitTransferRejected: (resource, relatedResources) => {
    publish(transferRejected, {
      resource: resource,
      related_resources: relatedResources
    })
  },
  sendMessage: (message) => {
    publish(messageSend, message)
  },
  emailSettlementCsv: (csv) => {
    publish(emailSettlementCsvSend, csv)
  }
}
