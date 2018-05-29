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

const src = '../../../src'
const Test = require('tapes')(require('tape'))
const Sinon = require('sinon')
const Mustache = require('mustache')
const Logger = require('@mojaloop/central-services-shared').Logger
const Utility = require(`${src}/lib/utility`)
const Config = require(`${src}/lib/config.js`)

Test('utility', utilityTest => {
  let sandbox

  utilityTest.beforeEach(t => {
    sandbox = Sinon.sandbox.create()
    sandbox.stub(Mustache, 'render')
    sandbox.stub(Logger)

    t.end()
  })

  utilityTest.afterEach(t => {
    sandbox.restore()
    t.end()
  })

  utilityTest.test('getParticipantTopicName should', getParticipantTopicNameTest => {
    getParticipantTopicNameTest.test('throw error on error in rendering', test => {
      const error = new Error()
      Mustache.render.withArgs(Config.KAFKA_CONFIG.TOPIC_TEMPLATES.PARTICIPANT_TOPIC_TEMPLATE.TEMPLATE,
        {
          participantName: 'dfsp1',
          functionality: 'transfer',
          action: 'prepare'
        }).throws(error)

      try {
        Utility.getParticipantTopicName('dfsp1', 'transfer', 'prepare')
      } catch (e) {
        test.ok(e instanceof Error)
        test.end()
      }
    })

    getParticipantTopicNameTest.end()
  })

  utilityTest.test('getNotificationTopicName should', getNotificationTopicNameTest => {
    getNotificationTopicNameTest.test('throw error on error in rendering', test => {
      const error = new Error()
      Mustache.render.withArgs(Config.KAFKA_CONFIG.TOPIC_TEMPLATES.NOTIFICATION_TOPIC_TEMPLATE.TEMPLATE).throws(error)

      try {
        Utility.getNotificationTopicName()
      } catch (e) {
        test.ok(e instanceof Error)
        test.end()
      }
    })

    getNotificationTopicNameTest.end()
  })

  utilityTest.test('getKafkaConfig should', getKafkaConfigTest => {
    getKafkaConfigTest.test('throw error on error in rendering', test => {
      try {
        Utility.getKafkaConfig('dummy')
      } catch (e) {
        test.ok(e instanceof Error)
        test.end()
      }
    })

    getKafkaConfigTest.end()
  })

  utilityTest.end()
})
