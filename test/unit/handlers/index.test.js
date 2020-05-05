'use strict'

const Test = require('tapes')(require('tape'))
const Sinon = require('sinon')
const Config = require('../../../src/lib/config')
const Proxyquire = require('proxyquire')
const HealthPlugin = require('../../../src/handlers/api/plugin')
const MetricsPlugin = require('../../../src/api/metrics/plugin')

Test('cli', async (cliTest) => {
  cliTest.beforeEach(test => {
    console.log('start')
    test.end()
  })

  cliTest.afterEach(test => {
    console.log('end')
    test.end()
  })

  cliTest.test('yes', async (test) => {
    test.end()
  })

  cliTest.test('Commander should', async (commanderTest) => {
    let sandbox
    // let Index
    let SetupStub

    commanderTest.beforeEach(test => {
      sandbox = Sinon.createSandbox()

      SetupStub = {
        initialize: sandbox.stub().returns(Promise.resolve())
      }

      process.argv = []
      Proxyquire.noPreserveCache() // enable no caching for module requires

      test.end()
    })

    commanderTest.afterEach(test => {
      sandbox.restore()
      Proxyquire.preserveCache()

      test.end()
    })

    commanderTest.test('start all Handlers up via all switches', async test => {
      const argv = [
        'node',
        'index.js',
        'handler',
        '--notification'
      ]

      process.argv = argv

      const Index = Proxyquire('../../../src/handlers/index', {
        '../shared/setup': SetupStub
      })

      const notificationHandler = {
        type: 'notification',
        enabled: true
      }

      const modulesList = [
        notificationHandler
      ]

      const initOptions = {
        service: 'handler',
        port: Config.PORT,
        modules: [HealthPlugin, MetricsPlugin],
        handlers: modulesList,
        runHandlers: true
      }

      test.ok(Index)
      test.ok(SetupStub.initialize.calledWith(initOptions))
      test.end()
    })

    commanderTest.test('start all prepare Handlers with no flags provided', async test => {
      const argv = [
        'node',
        'index.js',
        'handler'
      ]

      process.argv = argv

      const Index = Proxyquire('../../../src/handlers/index', {
        '../shared/setup': SetupStub
      })

      const modulesList = []

      const initOptions = {
        service: 'handler',
        port: Config.PORT,
        modules: [HealthPlugin, MetricsPlugin],
        handlers: modulesList,
        runHandlers: true
      }

      test.ok(Index)
      test.ok(SetupStub.initialize.calledWith(initOptions))
      test.end()
    })

    commanderTest.test('start all prepare Handlers up with invalid args', async test => {
      // stub process.exit
      sandbox.stub(process, 'exit')

      const argv = [
        'node',
        'index.js'
      ]

      process.argv = argv

      const Index = Proxyquire('../../../src/handlers/index', {
        '../shared/setup': SetupStub
      })

      test.ok(Index)
      test.notOk(SetupStub.initialize.called)
      test.ok(process.exit.called)
      test.end()
    })

    commanderTest.end()
  })

  cliTest.end()
})
