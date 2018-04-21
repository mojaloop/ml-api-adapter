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

/**
 * Notes:
 *  - I have done it this way to make the JSON flattening and to CSV as generic as possible. As long as you use a list of JSON objects, the below code will work.
 *  - The other option is to use the json2csv component to handle the conversion, where one can stipulate the mapping directly in the options. This will work, but it will no longer be generic.
 */
JSON.flatten = require('flat')
const json2csv = require('json2csv')

// Helper function to flatten each a list
function flattenJsonObjectList (jsonList) {
  const flatOptions = {delimiter: '_'}
  return jsonList.map(json => JSON.flatten(json, flatOptions))
}

module.exports = {
  flattenedTransfersJson: function flattendTransfersJson (settleTransfers) {
    return flattenJsonObjectList(settleTransfers)
  },
  flattenedFeesJson: function flattendFeesJson (settleFees) {
    return flattenJsonObjectList(settleFees)
  },
  joinedSettlementJson: function joinedSettlementJson (flattenedTransfersJson, flattenedFeesJson) {
    return flattenedTransfersJson.concat(flattenedFeesJson)
  },
  keys: function keys (joinedSettlementJson) {
    return Object.keys(joinedSettlementJson[0])
  },
  convertJsonToCsv: function convertJsonToCsv (joinedSettlementJson, keys) {
    try {
      return json2csv({
        data: joinedSettlementJson,
        fields: keys,
        del: '',
        doubleQuotes: '\'',
        hasCSVColumnTitle: true
      })
    } catch (err) {
      // Errors are thrown for bad options, or if the data is empty and no fields are provided.
      // Be sure to provide fields if it is possible that your data array will be empty.
      return err
    }
  }
}
