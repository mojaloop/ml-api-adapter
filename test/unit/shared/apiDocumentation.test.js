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
 - Name Surname <name.surname@mojaloop.io>
 --------------
 ******/

'use strict'

const Path = require('path')
const Hapi = require('@hapi/hapi')
const Test = require('tapes')(require('tape'))
const APIDocumentation = require('@mojaloop/central-services-shared').Util.Hapi.APIDocumentation

Test('API documentation dependency', async test => {
  const server = Hapi.server()
  const pathToSwaggerFile = Path.resolve(__dirname, '../../../src/interface/api-swagger.yaml')

  try {
    await server.register({ plugin: APIDocumentation.plugin, options: { pathToSwaggerFile } })

    const docs = await server.inject('/documentation')
    const spec = await server.inject('/swagger.json')

    test.equal(docs.statusCode, 200, 'documentation page is available')
    test.ok(docs.payload.includes('/swagger.json'), 'documentation page references the API specification')
    test.equal(spec.statusCode, 200, 'Swagger JSON is available')
    test.equal(JSON.parse(spec.payload).openapi, '3.0.2', 'Swagger JSON is generated from the YAML document')
  } finally {
    await server.stop()
    test.end()
  }
})
