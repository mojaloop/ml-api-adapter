/*****
 * @file This registers all handlers for the central-ledger API
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
 * Miguel de Barros <miguel.debarros@modusbox.com>
 --------------
 ******/
'use strict'

const headers = {
  FSPIOP: {
    SWITCH: {
      regex: /^switch$/i,
      value: 'switch'
    },
    SOURCE: 'fspiop-source',
    DESTINATION: 'fspiop-destination',
    HTTP_METHOD: 'fspiop-http-method',
    SIGNATURE: 'fspiop-signature',
    URI: 'fspiop-uri'
  },
  GENERAL: {
    ACCEPT: 'accept',
    DATE: 'date',
    CONTENT_LENGTH: 'content-length'
  }
}

const methods = {
  FSPIOP_CALLBACK_URL_TRANSFER_POST: 'post',
  FSPIOP_CALLBACK_URL_TRANSFER_ERROR: 'put',
  FSPIOP_CALLBACK_URL_TRANSFER_PUT: 'put',
  FSPIOP_CALLBACK_URL_BULK_TRANSFER_POST: 'post',
  FSPIOP_CALLBACK_URL_BULK_TRANSFER_ERROR: 'put',
  FSPIOP_CALLBACK_URL_BULK_TRANSFER_PUT: 'put'
}

// Code specific (non-DB) enumerations sorted alphabetically
const transferEventType = {
  PREPARE: 'prepare',
  POSITION: 'position',
  TRANSFER: 'transfer',
  FULFIL: 'fulfil',
  NOTIFICATION: 'notification',
  ADMIN: 'admin',
  GET: 'get'
}

const transferEventAction = {
  BULK_PREPARE: 'bulk-prepare',
  BULK_COMMIT: 'bulk-commit',
  PREPARE: 'prepare',
  PREPARE_DUPLICATE: 'prepare-duplicate',
  FULFIL_DUPLICATE: 'fulfil-duplicate',
  ABORT_DUPLICATE: 'abort-duplicate',
  TRANSFER: 'transfer',
  COMMIT: 'commit',
  ABORT: 'abort',
  TIMEOUT_RECEIVED: 'timeout-received',
  TIMEOUT_RESERVED: 'timeout-reserved',
  REJECT: 'reject',
  FAIL: 'fail',
  EVENT: 'event',
  FULFIL: 'fulfil',
  POSITION: 'position',
  GET: 'get'
}

const messageStatus = {
  SUCCESS: 'success',
  ERROR: 'error'
}

const errorMessages = {
  MISSINGFUNCTIONPARAMETERS: 'Missing parameters for function'
}

module.exports = {
  headers,
  methods,
  transferEventType,
  transferEventAction,
  messageStatus,
  errorMessages
}
