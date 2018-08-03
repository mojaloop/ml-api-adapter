'use strict'

const Test = require('tapes')(require('tape'))
const Sinon = require('sinon')
const P = require('bluebird')
const Config = require('../../../src/lib/config')
const Proxyquire = require('proxyquire')
const Plugin = require('../../../src/handlers/api/plugin')

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
        initialize: sandbox.stub().returns(P.resolve())
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
      var argv = [
        'node',
        'index.js',
        'handler',
        '--notification'
      ]

      process.argv = argv

      var Index = Proxyquire('../../../src/handlers/index', {
        '../shared/setup': SetupStub
      })

      var notificationHandler = {
        type: 'notification',
        enabled: true
      }

      var modulesList = [
        notificationHandler
      ]

      var initOptions = {
        service: 'handler',
        port: Config.PORT,
        modules: [Plugin],
        handlers: modulesList,
        runHandlers: true
      }

      test.ok(Index)
      test.ok(SetupStub.initialize.calledWith(initOptions))
      test.end()
    })

    commanderTest.test('start all prepare Handlers with no flags provided', async test => {
      var argv = [
        'node',
        'index.js',
        'handler'
      ]

      process.argv = argv

      var Index = Proxyquire('../../../src/handlers/index', {
        '../shared/setup': SetupStub
      })

      var modulesList = [
      ]

      var initOptions = {
        service: 'handler',
        port: Config.PORT,
        modules: [Plugin],
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

      var argv = [
        'node',
        'index.js'
      ]

      process.argv = argv

      var Index = Proxyquire('../../../src/handlers/index', {
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
