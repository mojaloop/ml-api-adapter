/*****
 License
 --------------
 Copyright © 2020-2025 Mojaloop Foundation
 The Mojaloop files are made available by the Mojaloop Foundation under the Apache License, Version 2.0 (the "License") and you may not use these files except in compliance with the License. You may obtain a copy of the License at

 http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, the Mojaloop files are distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.

 Contributors
 --------------
 This is the official list of the Mojaloop project contributors for this file.
 Names of the original copyright holders (individuals or organizations)
 should be listed with a '*' in the first column. People who have
 contributed from an organization can be listed under the organization
 that actually holds the copyright for their contributions (see the
 Mojaloop Foundation for an example). Those individuals should have
 their names indented and be marked with a '-'. Email address can be added
 optionally within square brackets <email>.

 * Mojaloop Foundation
 - Name Surname <name.surname@mojaloop.io>

 * Lewis Daly <lewis@vesselstech.com>
 --------------
 ******/
'use strict'

const { statusEnum, serviceName } = require('@mojaloop/central-services-shared').HealthCheck.HealthCheckEnums
const Logger = require('@mojaloop/central-services-logger')

const Config = require('../../lib/config')
const Notification = require('../../handlers/notification')
const Producer = require('@mojaloop/central-services-stream').Util.Producer
const axios = require('axios')
const http = require('http')

axios.defaults.httpAgent = new http.Agent({ keepAlive: true })

/**
 * @function getSubServiceHealthBroker
 *
 * @description Gets the health for the Notification broker
 * @returns Promise<object> The SubService health object for the broker
 */
const getSubServiceHealthBroker = async () => {
  let status = statusEnum.OK
  try {
    if (!Config.HANDLERS_DISABLED) {
      const notificationStatus = Notification.isConnected()
      if (!notificationStatus) {
        throw new Error('Not connected!')
      }
    }
    await Producer.allConnected() // returns true or throws error
    status = statusEnum.OK
  } catch (err) {
    Logger.isDebugEnabled && Logger.debug(`getSubServiceHealthBroker failed with error: ${err.message}.`)
    status = statusEnum.DOWN
  }

  return {
    name: serviceName.broker,
    status
  }
}

/**
 * @function getSubServiceHealthCentralLedger
 *
 * @description Gets the health of the central-ledger service
 * @returns Promise<SubServiceHealth> The SubService health object for the central-ledger service
 */
const getSubServiceHealthCentralLedger = async () => {
  const url = Config.ENDPOINT_HEALTH_URL
  let status = statusEnum.DOWN

  try {
    const response = await axios.get(url)
    const responseStatus = response.data && response.data.status
    switch (responseStatus) {
      case statusEnum.OK:
      case statusEnum.DOWN:
        status = responseStatus
        break
      default:
        throw new Error(`getSubServiceHealthCentralLedger request failed with unknown status: ${response.status}`)
    }
  } catch (err) {
    Logger.isDebugEnabled && Logger.debug(`getSubServiceHealthCentralLedger failed with error: ${err.message}.`)
    status = statusEnum.DOWN
  }

  return {
    name: serviceName.participantEndpointService,
    status
  }
}

module.exports = {
  getSubServiceHealthBroker,
  getSubServiceHealthCentralLedger
}
