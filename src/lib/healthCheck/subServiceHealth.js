
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

 * Lewis Daly <lewis@vesselstech.com>
 --------------
 ******/
'use strict'

const { statusEnum, serviceName } = require('@mojaloop/central-services-shared').HealthCheck.HealthCheckEnums
const Logger = require('@mojaloop/central-services-shared').Logger

const Config = require('../../lib/config')
const Notification = require('../../handlers/notification')
const request = require('request-promise-native')

/**
 * @function getSubServiceHealthBroker
 *
 * @description Gets the health for the Notification broker
 * @returns Promise<SubServiceHealth> The SubService health object for the broker
 */
const getSubServiceHealthBroker = async () => {
  let status = statusEnum.OK
  try {
    await Notification.isConnected()
  } catch (err) {
    Logger.debug(`getSubServiceHealthBroker failed with error: ${err.message}.`)
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
  const options = {
    url: Config.ENDPOINT_HEALTH_URL,
    json: true
  }

  let status = statusEnum.DOWN
  try {
    /* Consider any 2XX response as healthy */
    await request.get(options)
  } catch (err) {
    Logger.debug(`getSubServiceHealthCentralLedger failed with error: ${err.message}.`)
    status = statusEnum.DOWN
  }

  return {
    name: serviceName.participantEndpointService,
    status
  }
}

/*
So in participantEndpoint.js, we hit the central-ledger to get the participant endpoints.

We should so something similar, but hit the health check of the central-ledger to make sure it's up!
*/

module.exports = {
  getSubServiceHealthBroker,
  getSubServiceHealthCentralLedger
}
