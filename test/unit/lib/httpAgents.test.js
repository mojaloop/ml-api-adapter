/*****
 License
 --------------
 Copyright © 2020-2025 Mojaloop Foundation
 The Mojaloop files are made available by the Mojaloop Foundation under the Apache License, Version 2.0 (the "License") and you may not use these files except in compliance with the License. You may obtain a copy of the License at

 http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, the Mojaloop files are distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.

 * Infitx
 - Kevin Leyow <kevin.leyow@infitx.com>

 ******/

'use strict'

const test = require('tape')
const http = require('http')
const https = require('https')
const httpAgents = require('../../../src/lib/httpAgents')

test('httpAgents', async (t) => {
  // Cleanup after all tests
  const cleanup = () => {
    try {
      httpAgents.destroyAgents()
    } catch (err) {
      // ignore
    }
  }

  t.teardown(cleanup)

  await t.test('should initialize agents with default configuration', (st) => {
    try {
      cleanup() // Ensure clean state

      const agents = httpAgents.initializeAgents()

      st.ok(agents, 'should return agents object')
      st.ok(agents.httpAgent, 'should have httpAgent')
      st.ok(agents.httpsAgent, 'should have httpsAgent')
      st.equal(agents.httpAgent.options.keepAlive, true, 'httpAgent should have keepAlive enabled')
      st.equal(agents.httpsAgent.options.keepAlive, true, 'httpsAgent should have keepAlive enabled')
      st.equal(agents.httpAgent.options.maxSockets, 256, 'httpAgent should have default maxSockets of 256')
      st.equal(agents.httpAgent.options.maxFreeSockets, 256, 'httpAgent should have default maxFreeSockets of 256')
      st.equal(agents.httpAgent.options.timeout, 60000, 'httpAgent should have default timeout of 60000ms')
      st.end()
    } catch (err) {
      st.fail(`Initialization failed: ${err.message}`)
      st.end()
    }
  })

  await t.test('should initialize agents with custom configuration', (st) => {
    try {
      cleanup() // Ensure clean state

      const customConfig = {
        maxSockets: 128,
        maxFreeSockets: 64,
        socketTimeout: 30000
      }

      const agents = httpAgents.initializeAgents(customConfig)

      st.equal(agents.httpAgent.options.maxSockets, 128, 'should set custom maxSockets')
      st.equal(agents.httpAgent.options.maxFreeSockets, 64, 'should set custom maxFreeSockets')
      st.equal(agents.httpAgent.options.timeout, 30000, 'should set custom timeout')
      st.equal(agents.httpsAgent.options.maxSockets, 128, 'httpsAgent should have same maxSockets')
      st.equal(agents.httpsAgent.options.maxFreeSockets, 64, 'httpsAgent should have same maxFreeSockets')
      st.equal(agents.httpsAgent.options.timeout, 30000, 'httpsAgent should have same timeout')
      st.end()
    } catch (err) {
      st.fail(`Custom initialization failed: ${err.message}`)
      st.end()
    }
  })

  await t.test('should initialize agents with partial configuration', (st) => {
    try {
      cleanup() // Ensure clean state

      const partialConfig = {
        maxSockets: 512
      }

      const agents = httpAgents.initializeAgents(partialConfig)

      st.equal(agents.httpAgent.options.maxSockets, 512, 'should use provided maxSockets')
      st.equal(agents.httpAgent.options.maxFreeSockets, 256, 'should use default maxFreeSockets')
      st.equal(agents.httpAgent.options.timeout, 60000, 'should use default timeout')
      st.end()
    } catch (err) {
      st.fail(`Partial initialization failed: ${err.message}`)
      st.end()
    }
  })

  await t.test('should enable TCP keepAlive with proper intervals', (st) => {
    try {
      cleanup() // Ensure clean state

      const agents = httpAgents.initializeAgents()

      st.equal(agents.httpAgent.options.keepAlive, true, 'httpAgent should have keepAlive enabled')
      st.equal(agents.httpAgent.options.keepAliveMsecs, 30000, 'httpAgent should have keepAliveMsecs set to 30000')
      st.equal(agents.httpsAgent.options.keepAlive, true, 'httpsAgent should have keepAlive enabled')
      st.equal(agents.httpsAgent.options.keepAliveMsecs, 30000, 'httpsAgent should have keepAliveMsecs set to 30000')
      st.end()
    } catch (err) {
      st.fail(`Keep-alive configuration failed: ${err.message}`)
      st.end()
    }
  })

  await t.test('getHttpAgent should return shared HTTP agent', (st) => {
    try {
      cleanup() // Ensure clean state

      const agent1 = httpAgents.getHttpAgent()
      const agent2 = httpAgents.getHttpAgent()

      st.ok(agent1, 'should return HTTP agent')
      st.ok(agent1 instanceof http.Agent, 'should return an http.Agent instance')
      st.equal(agent1, agent2, 'should return same instance on multiple calls')
      st.end()
    } catch (err) {
      st.fail(`getHttpAgent failed: ${err.message}`)
      st.end()
    }
  })

  await t.test('getHttpsAgent should return shared HTTPS agent', (st) => {
    try {
      cleanup() // Ensure clean state

      const agent1 = httpAgents.getHttpsAgent()
      const agent2 = httpAgents.getHttpsAgent()

      st.ok(agent1, 'should return HTTPS agent')
      st.ok(agent1 instanceof https.Agent, 'should return an https.Agent instance')
      st.equal(agent1, agent2, 'should return same instance on multiple calls')
      st.end()
    } catch (err) {
      st.fail(`getHttpsAgent failed: ${err.message}`)
      st.end()
    }
  })

  await t.test('getAgents should return both HTTP and HTTPS agents', (st) => {
    try {
      cleanup() // Ensure clean state

      const agents = httpAgents.getAgents()

      st.ok(agents, 'should return agents object')
      st.ok(agents.httpAgent, 'should have httpAgent')
      st.ok(agents.httpsAgent, 'should have httpsAgent')
      st.ok(agents.httpAgent instanceof http.Agent, 'httpAgent should be http.Agent')
      st.ok(agents.httpsAgent instanceof https.Agent, 'httpsAgent should be https.Agent')
      st.end()
    } catch (err) {
      st.fail(`getAgents failed: ${err.message}`)
      st.end()
    }
  })

  await t.test('getHttpAgent should auto-initialize if not already initialized', (st) => {
    try {
      cleanup() // Ensure clean state

      const agent = httpAgents.getHttpAgent()

      st.ok(agent, 'should initialize and return HTTP agent')
      st.ok(agent instanceof http.Agent, 'should be an http.Agent instance')
      st.equal(agent.options.maxSockets, 256, 'should have default maxSockets')
      st.end()
    } catch (err) {
      st.fail(`Auto-initialization failed: ${err.message}`)
      st.end()
    }
  })

  await t.test('getHttpsAgent should auto-initialize if not already initialized', (st) => {
    try {
      cleanup() // Ensure clean state

      const agent = httpAgents.getHttpsAgent()

      st.ok(agent, 'should initialize and return HTTPS agent')
      st.ok(agent instanceof https.Agent, 'should be an https.Agent instance')
      st.equal(agent.options.maxSockets, 256, 'should have default maxSockets')
      st.end()
    } catch (err) {
      st.fail(`Auto-initialization failed: ${err.message}`)
      st.end()
    }
  })

  await t.test('destroyAgents should destroy all agents', (st) => {
    try {
      cleanup() // Ensure clean state

      // Initialize agents
      const initialAgents = httpAgents.initializeAgents()
      st.ok(initialAgents.httpAgent, 'should have initialized httpAgent')
      st.ok(initialAgents.httpsAgent, 'should have initialized httpsAgent')

      // Destroy agents
      httpAgents.destroyAgents()

      // After destroying, getting new agents should work
      const newAgents = httpAgents.getAgents()
      st.ok(newAgents, 'should be able to get agents after destroy')
      st.ok(newAgents.httpAgent, 'should have new httpAgent')
      st.ok(newAgents.httpsAgent, 'should have new httpsAgent')

      st.end()
    } catch (err) {
      st.fail(`destroyAgents failed: ${err.message}`)
      st.end()
    }
  })

  await t.test('should handle multiple initialization cycles', (st) => {
    try {
      cleanup() // Ensure clean state

      // First cycle
      const agents1 = httpAgents.initializeAgents({ maxSockets: 100 })
      st.equal(agents1.httpAgent.options.maxSockets, 100, 'first init should use custom config')

      httpAgents.destroyAgents()

      // Second cycle
      const agents2 = httpAgents.initializeAgents({ maxSockets: 200 })
      st.equal(agents2.httpAgent.options.maxSockets, 200, 'second init should use new config')

      st.end()
    } catch (err) {
      st.fail(`Multiple initialization failed: ${err.message}`)
      st.end()
    }
  })

  await t.test('HTTP and HTTPS agents should have different instances', (st) => {
    try {
      cleanup() // Ensure clean state

      const httpAgent = httpAgents.getHttpAgent()
      const httpsAgent = httpAgents.getHttpsAgent()

      st.notEqual(httpAgent, httpsAgent, 'HTTP and HTTPS agents should be different instances')
      st.ok(httpAgent instanceof http.Agent, 'httpAgent should be http.Agent')
      st.ok(httpsAgent instanceof https.Agent, 'httpsAgent should be https.Agent')
      st.end()
    } catch (err) {
      st.fail(`Agent type failed: ${err.message}`)
      st.end()
    }
  })

  await t.test('should handle edge case: large socket configuration', (st) => {
    try {
      cleanup() // Ensure clean state

      const agents = httpAgents.initializeAgents({
        maxSockets: 10000,
        maxFreeSockets: 5000,
        socketTimeout: 300000
      })

      st.equal(agents.httpAgent.options.maxSockets, 10000, 'should accept large maxSockets')
      st.equal(agents.httpAgent.options.maxFreeSockets, 5000, 'should accept large maxFreeSockets')
      st.equal(agents.httpAgent.options.timeout, 300000, 'should accept large timeout')
      st.end()
    } catch (err) {
      st.fail(`Large config edge case failed: ${err.message}`)
      st.end()
    }
  })

  await t.test('agents should have toJSON method to prevent accidental logging of internals', (st) => {
    try {
      cleanup() // Ensure clean state

      const agents = httpAgents.initializeAgents()

      st.ok(agents.httpAgent.toJSON, 'httpAgent should have toJSON method')
      st.ok(agents.httpsAgent.toJSON, 'httpsAgent should have toJSON method')

      const httpJson = agents.httpAgent.toJSON()
      const httpsJson = agents.httpsAgent.toJSON()

      st.ok(typeof httpJson === 'object', 'httpAgent.toJSON should return object')
      st.ok(typeof httpsJson === 'object', 'httpsAgent.toJSON should return object')
      st.ok(httpJson.type, 'httpAgent toJSON should have type field')
      st.ok(httpsJson.type, 'httpsAgent toJSON should have type field')
      st.ok(httpJson.keepAlive !== undefined, 'httpAgent toJSON should have keepAlive field')
      st.ok(httpsJson.keepAlive !== undefined, 'httpsAgent toJSON should have keepAlive field')
      st.ok(httpJson.maxSockets !== undefined, 'httpAgent toJSON should have maxSockets field')
      st.ok(httpsJson.maxSockets !== undefined, 'httpsAgent toJSON should have maxSockets field')

      st.end()
    } catch (err) {
      st.fail(`toJSON method failed: ${err.message}`)
      st.end()
    }
  })

  await t.test('should maintain agent state across getter calls', (st) => {
    try {
      cleanup() // Ensure clean state

      const agents1 = httpAgents.initializeAgents({ maxSockets: 150 })
      const httpAgent1 = agents1.httpAgent

      // Get through different methods
      const httpAgent2 = httpAgents.getHttpAgent()
      const agents2 = httpAgents.getAgents()
      const httpAgent3 = agents2.httpAgent

      st.equal(httpAgent1, httpAgent2, 'initializeAgents and getHttpAgent should return same instance')
      st.equal(httpAgent2, httpAgent3, 'getHttpAgent and getAgents should return same instance')
      st.equal(httpAgent1.options.maxSockets, 150, 'state should be maintained across calls')

      st.end()
    } catch (err) {
      st.fail(`State maintenance failed: ${err.message}`)
      st.end()
    }
  })

  await t.test('should handle sequential destroy and reinitialize', (st) => {
    try {
      cleanup() // Ensure clean state

      // First init and destroy
      httpAgents.initializeAgents({ maxSockets: 100 })
      httpAgents.destroyAgents()

      // Verify can reinitialize with different config
      const agents = httpAgents.initializeAgents({ maxSockets: 200 })
      st.equal(agents.httpAgent.options.maxSockets, 200, 'should reinitialize with new config after destroy')

      st.end()
    } catch (err) {
      st.fail(`Sequential destroy/reinit failed: ${err.message}`)
      st.end()
    }
  })

  await t.test('getAgents should return different agents before and after destroy', (st) => {
    try {
      cleanup() // Ensure clean state

      const agents1 = httpAgents.getAgents()
      const httpAgent1Id = agents1.httpAgent

      httpAgents.destroyAgents()

      const agents2 = httpAgents.getAgents()
      const httpAgent2Id = agents2.httpAgent

      st.notEqual(httpAgent1Id, httpAgent2Id, 'agents should be different instances before and after destroy')

      st.end()
    } catch (err) {
      st.fail(`Pre/post destroy comparison failed: ${err.message}`)
      st.end()
    }
  })

  await t.test('should support null/undefined config values (use defaults)', (st) => {
    try {
      cleanup() // Ensure clean state

      const agents = httpAgents.initializeAgents({
        maxSockets: undefined,
        maxFreeSockets: undefined,
        socketTimeout: undefined
      })

      st.equal(agents.httpAgent.options.maxSockets, 256, 'should use default for undefined maxSockets')
      st.equal(agents.httpAgent.options.maxFreeSockets, 256, 'should use default for undefined maxFreeSockets')
      st.equal(agents.httpAgent.options.timeout, 60000, 'should use default for undefined timeout')

      st.end()
    } catch (err) {
      st.fail(`Undefined config handling failed: ${err.message}`)
      st.end()
    }
  })

  await t.test('should properly initialize TCP keep-alive for all agents', (st) => {
    try {
      cleanup() // Ensure clean state

      const agents = httpAgents.initializeAgents()

      // Check HTTP agent
      st.equal(agents.httpAgent.options.keepAlive, true, 'httpAgent keepAlive should be true')
      st.equal(agents.httpAgent.options.keepAliveMsecs, 30000, 'httpAgent keepAliveMsecs should be 30000')

      // Check HTTPS agent
      st.equal(agents.httpsAgent.options.keepAlive, true, 'httpsAgent keepAlive should be true')
      st.equal(agents.httpsAgent.options.keepAliveMsecs, 30000, 'httpsAgent keepAliveMsecs should be 30000')

      st.end()
    } catch (err) {
      st.fail(`TCP keep-alive initialization failed: ${err.message}`)
      st.end()
    }
  })
})
