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
 should be listed in the first column. People who have contributed from an organization can be listed under the organization that actually holds the copyright for their contributions (see Mojaloop Foundation for an example). Those individuals should have their names indented and be marked with a '-'. Email address can be added optionally within square brackets <email>.

 * Mojaloop Foundation
 - Kalent
 --------------
 ******/

'use strict'

const Path = require('path')
const Hapi = require('@hapi/hapi')
const test = require('tapes')(require('tape'))
const APIDocumentation = require('@mojaloop/central-services-shared').Util.Hapi.APIDocumentation

// ISO 20022 defines GrpHdr.NbOfTxs as Max15NumericText, a numeric *string*.
// The ISO 20022 OpenAPI examples must use "1", not 1, so that DFSPs copying them
// do not send a JSON number that strict ISO 20022 parsers reject.
// See https://github.com/mojaloop/ml-api-adapter/issues/693
const loadIsoSpec = async () => {
  const server = Hapi.server()
  const pathToSwaggerFile = Path.resolve(__dirname, '../../../src/interface/fspiop-rest-v2.0-ISO20022_transfers.yaml')
  try {
    await server.register({ plugin: APIDocumentation.plugin, options: { pathToSwaggerFile } })
    const res = await server.inject('/swagger.json')
    return JSON.parse(res.payload)
  } finally {
    await server.stop()
  }
}

// Collect literal NbOfTxs values (examples), skipping schema definitions, which are objects.
const findNbOfTxsValues = (node, found = []) => {
  if (Array.isArray(node)) {
    node.forEach(item => findNbOfTxsValues(item, found))
  } else if (node !== null && typeof node === 'object') {
    for (const [key, value] of Object.entries(node)) {
      if (key === 'NbOfTxs' && (value === null || typeof value !== 'object')) {
        found.push(value)
      } else {
        findNbOfTxsValues(value, found)
      }
    }
  }
  return found
}

test('ISO 20022 OpenAPI document - NbOfTxs (Max15NumericText)', async isoTest => {
  const spec = await loadIsoSpec()

  isoTest.test('defines Max15NumericText as a string with a string example', async t => {
    const schema = spec.components.schemas.Max15NumericText
    t.equal(schema.type, 'string', 'Max15NumericText is a string type')
    t.equal(typeof schema.example, 'string', 'Max15NumericText example is a string')
    t.end()
  })

  isoTest.test('uses a string for every NbOfTxs example', async t => {
    const values = findNbOfTxsValues(spec)
    t.ok(values.length > 0, 'NbOfTxs examples are present')
    values.forEach(value => t.equal(typeof value, 'string', `NbOfTxs example ${JSON.stringify(value)} is a string`))
    t.end()
  })

  isoTest.end()
})
