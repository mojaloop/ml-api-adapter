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

const Path = require('path')
const { Hapi } = require('@mojaloop/central-services-shared').Util
const Config = require('../lib/config')

const pathForInterface = ({ isHandlerInterface }) => {
  let apiFile
  const pathFolder = '../interface/'
  if (isHandlerInterface) {
    apiFile = 'handler-swagger.yaml'
  } else {
    apiFile = Config.API_TYPE === Hapi.API_TYPES.iso20022
      ? 'api-swagger-iso20022-transfers.yaml'
      : 'api-swagger.yaml'
  }
  return Path.resolve(__dirname, pathFolder + apiFile)
}

// Safely set nested property in an object
const setProp = (obj, path, value) => {
  const pathParts = path.split('.')
  let current = obj

  for (let i = 0; i < pathParts.length - 1; i++) {
    const part = pathParts[i]
    if (part === '__proto__' || part === 'constructor') {
      return
    }
    if (!current[part]) {
      current[part] = {}
    }
    current = current[part]
  }
  const lastPart = pathParts[pathParts.length - 1]
  if (lastPart !== '__proto__' && lastPart !== 'constructor') {
    current[lastPart] = value
  }
}

module.exports = {
  pathForInterface,
  setProp
}
