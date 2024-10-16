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

const { logger } = require('../../src/shared/logger')

/**
 * unwrapResponse
 *
 * Use this function to unwrap the inner response body and code from an async Handler
 */
const unwrapResponse = async (asyncFunction) => {
  let responseBody
  let responseCode
  const nestedReply = {
    response: (response) => {
      responseBody = response
      return {
        code: statusCode => {
          responseCode = statusCode
        }
      }
    }
  }
  await asyncFunction(nestedReply)

  return {
    responseBody,
    responseCode
  }
}

function createRequest (routes) {
  const value = routes || []
  return {
    server: {
      table: () => {
        return value
      }
    }
  }
}

/**
 * @function sleep
 *
 * @description A hacky method to sleep in JS. Please use for testing only.
 *
 * @param {number} seconds - The number of seconds to sleep for
 * @returns {Promise<>}
 */
async function sleep (seconds) {
  return new Promise(resolve => setTimeout(resolve, seconds * 1000))
}

async function wrapWithRetries (func, remainingRetries = 10, timeout = 2) {
  logger.warn(`wrapWithRetries remainingRetries:${remainingRetries}, timeout:${timeout}`)

  try {
    const result = await func()
    if (!result) {
      throw new Error('wrapWithRetries returned false of undefined response')
    }
    return result
  } catch (err) {
    if (remainingRetries === 0) {
      logger.warn('wrapWithRetries ran out of retries')
      throw err
    }

    await sleepPromise(timeout)
    return wrapWithRetries(func, remainingRetries - 1, timeout)
  }
}

/**
 * @function sleepPromise
 *
 * @description A hacky method to sleep in JS. For testing purposes only.
 *
 * @param {number} seconds - The number of seconds to sleep for
 *
 * @returns {Promise<>}
 */
async function sleepPromise (seconds) {
  return new Promise(resolve => setTimeout(resolve, seconds * 1000))
}

module.exports = {
  createRequest,
  sleep,
  unwrapResponse,
  wrapWithRetries
}
