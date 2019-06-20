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
 * Miguel de Barros <georgi.debarros@modusbox.com>
 --------------
 ******/
'use strict'

const mongoose = require('../../lib/mongodb').Mongoose

const TransferResult = {
  transferId: {
    type: String, required: true
  },
  fulfilment: {
    type: String
  },
  errorInformation: {
    errorCode: String,
    errorDescription: String
  },
  extensionList: {
    extension: [{
      _id: false,
      key: String,
      value: String
    }]
  }
}

let IndividualTransferResultSchema = null

const getIndividualTransferResultSchema = () => {
  if (!IndividualTransferResultSchema) {
    IndividualTransferResultSchema = new mongoose.Schema(Object.assign({}, { payload: TransferResult },
      { _id_bulkTransferResponses: { type: mongoose.Schema.Types.ObjectId, ref: 'bulkTransferResponses' },
        messageId: { type: String, required: true },
        destination: { type: String, required: true },
        bulkTransferId: { type: String, required: true },
        payload: { type: Object, required: true }
      }))
    IndividualTransferResultSchema.index({ messageId: 1, destination: 1 })
  }
  return IndividualTransferResultSchema
}

module.exports = {
  TransferResult,
  getIndividualTransferResultSchema
}
