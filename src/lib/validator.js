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

 - Georgi Georgiev <georgi.georgiev@modusbox.com>
--------------
 ******/

'use strict'

const Config = require('../lib/config')

const BAD_REQUEST_ERROR_CODE = 400
const BAD_REQUEST_ERROR_DESC = 'Bad Request'
const DEFAULT_LAG_SECONDS = 300

const fulfilTransfer = (request) => {
  let validationPassed = true
  let errorInformation = {
    errorCode: BAD_REQUEST_ERROR_CODE,
    errorDescription: BAD_REQUEST_ERROR_DESC,
    extensionList: {
      extension: []
    }
  }

  const maxLag = (Config.MAX_FULFIL_TIMEOUT_DURATION_SECONDS || DEFAULT_LAG_SECONDS) * 1000
  const completedTimestamp = new Date(request.payload.completedTimestamp)
  const now = new Date()
  if (completedTimestamp > now) {
    errorInformation.extensionList.extension.push({
      key: 'customValidationError',
      value: 'completedTimestamp fails because future timestamp was provided'
    })
    validationPassed = false
  } else if (completedTimestamp < now - maxLag) {
    errorInformation.extensionList.extension.push({
      key: 'customValidationError',
      value: 'completedTimestamp fails because provided timestamp exceeded the maximum timeout duration'
    })
    validationPassed = false
  }

  return {
    validationPassed,
    reason: errorInformation
  }
}

module.exports = {
  fulfilTransfer
}
