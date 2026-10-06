'use strict'

const Test = require('tape')
const { readFileSync } = require('node:fs')
const { resolve } = require('node:path')
const { runInNewContext } = require('node:vm')

const wait4 = 'docker/wait4/wait4.js'
const waitAll = 'scripts/_wait4_all.js'

// Isolate CLI exits and external services without starting Docker or a database.
async function runScript (script, { config, execSync, log = () => {} } = {}) {
  const exits = []
  const errors = []
  const source = readFileSync(resolve(__dirname, '../../..', script), 'utf8')
  await runInNewContext(source, {
    process: {
      argv: ['node', script, 'test-service'],
      env: {},
      exit: code => exits.push(code)
    },
    console: { log, info: () => {}, error: message => errors.push(message) },
    setTimeout: callback => callback(),
    require: id => {
      if (id === './wait4.config.js') {
        if (!config) throw new Error('Missing wait configuration')
        return config
      }
      if (id === 'node:child_process') return { execSync }
      if (id === 'node:util') return require('node:util')
      throw new Error(`Unexpected module: ${id}`)
    }
  }, { filename: script })
  return { exits, errors }
}

Test('wait4 exits successfully when no prerequisites are needed', async test => {
  const result = await runScript(wait4, {
    config: { services: [{ name: 'test-service', wait4: [] }] }
  })
  test.deepEqual(result.exits, [0])
  test.deepEqual(result.errors, [])
  test.end()
})

Test('wait4 reports a configuration error and exits unsuccessfully', async test => {
  const result = await runScript(wait4)
  test.deepEqual(result.exits, [1])
  test.deepEqual(result.errors, ['wait4 Error: Error: Missing wait configuration'])
  test.end()
})

Test('wait4 handles a rejection before loading configuration', async test => {
  const result = await runScript(wait4, {
    log: () => { throw new Error('Startup logging failed') }
  })
  test.deepEqual(result.exits, [1])
  test.deepEqual(result.errors, ['wait4 Error: Error: Startup logging failed'])
  test.end()
})

Test('wait4 handles rejected prerequisite checks after retries', async test => {
  let attempts = 0
  const result = await runScript(wait4, {
    config: {
      retries: 1,
      services: [{ name: 'test-service', wait4: [{ method: 'ncat', uri: 'localhost:1234' }] }]
    },
    execSync: () => {
      attempts++
      throw new Error('Connection refused')
    }
  })
  test.equal(attempts, 2)
  test.deepEqual(result.exits, [1])
  test.equal(result.errors.at(-1), 'wait4 Error: Error: Connection refused')
  test.end()
})

Test('wait4_all exits successfully when all containers are healthy', async test => {
  const result = await runScript(waitAll, {
    execSync: () => Buffer.from('"healthy"\n')
  })
  test.deepEqual(result.exits, [0])
  test.deepEqual(result.errors, [])
  test.end()
})

Test('wait4_all handles a rejected container status check', async test => {
  const result = await runScript(waitAll, {
    execSync: () => { throw new Error('Docker unavailable') }
  })
  test.deepEqual(result.exits, [1])
  test.deepEqual(result.errors, ['_wait4_all: Error: Docker unavailable'])
  test.end()
})

Test('wait4_all reports unhealthy containers and exits unsuccessfully', async test => {
  const result = await runScript(waitAll, {
    execSync: () => Buffer.from('"unhealthy"\n')
  })
  test.deepEqual(result.exits, [1])
  test.equal(result.errors.length, 1)
  test.match(result.errors[0], /_wait4_all: Error: One or more services went to unhealthy/)
  test.end()
})
