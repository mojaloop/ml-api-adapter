'use strict'

const Test = require('tapes')(require('tape'))
const Sinon = require('sinon')
const P = require('bluebird')
const Config = require('../../../src/lib/config')
const Proxyquire = require('proxyquire')
const Cache = require('../../../src/models/lib/cache')

Test('setup', setupTest => {
  let sandbox
  let oldHostName
  let hostName = 'http://test.com'
  let Setup
  let RegisterHandlersStub
  let PluginsStub
  let HapiStub
  let serverStub

  setupTest.beforeEach(test => {
    sandbox = Sinon.createSandbox()
    sandbox.stub(Cache, 'initializeCache').returns(P.resolve(true))

    PluginsStub = {
      registerPlugins: sandbox.stub().returns(P.resolve())
    }

    serverStub = {
      connection: sandbox.stub(),
      register: sandbox.stub(),
      ext: sandbox.stub(),
      start: sandbox.stub(),
      method: sandbox.stub(),
      info: {
        uri: sandbox.stub()
      }
    }

    HapiStub = {
      Server: sandbox.stub().returns(serverStub)
    }

    RegisterHandlersStub = {
      registerAllHandlers: sandbox.stub().returns(P.resolve()),
      registerNotificationHandler: sandbox.stub().returns(P.resolve())
    }

    Setup = Proxyquire('../../../src/shared/setup', {
      '../handlers/register': RegisterHandlersStub,
      './plugins': PluginsStub,
      'hapi': HapiStub,
      '../lib/config': Config
    })

    oldHostName = Config.HOSTNAME
    Config.HOSTNAME = hostName

    test.end()
  })

  setupTest.afterEach(test => {
    sandbox.restore()

    Config.HOSTNAME = oldHostName

    test.end()
  })

  setupTest.test('createServer should', async (createServerTest) => {
    createServerTest.test('throw Boom error on fail', async (test) => {
      var errorToThrow = new Error('Throw Boom error')

      var HapiStubThrowError = {
        Server: sandbox.stub().callsFake((opt) => {
          opt.routes.validate.failAction(sandbox.stub(), sandbox.stub(), errorToThrow)
        })
      }

      Setup = Proxyquire('../../../src/shared/setup', {
        '../handlers/register': RegisterHandlersStub,
        './plugins': PluginsStub,
        'hapi': HapiStubThrowError,
        '../lib/config': Config
      })

      Setup.createServer(200, []).then(() => {
        test.fail('Should not have successfully created server')
        test.end()
      }).catch(err => {
        test.ok(err instanceof Error)
        test.end()
      })
    })
    createServerTest.end()
  })

  setupTest.test('initialize should', async (initializeTest) => {
    initializeTest.test('return hapi server for "api"', async (test) => {
      const service = 'api'

      Setup.initialize({ service }).then(s => {
        test.equal(s, serverStub)
        test.end()
      }).catch(err => {
        test.fail(`Should have not received an error: ${err}`)
        test.end()
      })
    })

    initializeTest.test('return hapi server for "handler"', async (test) => {
      const service = 'handler'

      Setup.initialize({ service }).then(s => {
        test.equal(s, serverStub)
        test.end()
      }).catch(err => {
        test.fail(`Should have not received an error: ${err}`)
        test.end()
      })
    })

    initializeTest.test('return throw an exception for server "undefined"', async (test) => {
      const service = 'undefined'

      Setup.initialize({ service }).then(s => {
        test.equal(s, serverStub)
        test.end()
      }).catch(err => {
        test.ok(err.message === `No valid service type ${service} found!`)
        test.end()
      })
    })

    initializeTest.test('run Handlers if runHandlers flag enabled and start API', async (test) => {
      const service = 'handler'

      Setup.initialize({ service, runHandlers: true }).then((s) => {
        test.ok(RegisterHandlersStub.registerAllHandlers.called)
        test.equal(s, serverStub)
        test.end()
      }).catch(err => {
        test.fail(`Should have not received an error: ${err}`)
        test.end()
      })
    })

    initializeTest.test('run Handlers if runHandlers flag enabled and DONT start API', async (test) => {
      var ConfigStub = Config
      ConfigStub.HANDLERS_API_DISABLED = true

      Setup = Proxyquire('../../../src/shared/setup', {
        '../handlers/register': RegisterHandlersStub,
        './plugins': PluginsStub,
        'hapi': HapiStub,
        '../lib/config': ConfigStub
      })

      const service = 'handler'

      sandbox.stub(Config, 'HANDLERS_API_DISABLED').returns(true)
      Setup.initialize({ service, runHandlers: true }).then((s) => {
        test.ok(RegisterHandlersStub.registerAllHandlers.called)
        test.equal(s, undefined)
        test.end()
      }).catch(err => {
        test.fail(`Should have not received an error: ${err}`)
        test.end()
      })
    })

    initializeTest.test('run invalid Handler if runHandlers flag enabled with handlers[] populated', async (test) => {
      const service = 'api'

      var notificationHandler = {
        type: 'notification',
        enabled: true
      }

      var unknownHandler = {
        type: 'undefined',
        enabled: true
      }

      var modulesList = [
        notificationHandler,
        unknownHandler
      ]

      Setup.initialize({ service, runHandlers: true, handlers: modulesList }).then(() => {
        test.fail('Expected exception to be thrown')
        test.end()
      }).catch(err => {
        console.log(err)
        test.ok(RegisterHandlersStub.registerNotificationHandler.called)
        test.notOk(RegisterHandlersStub.registerAllHandlers.called)
        test.ok(err.message === `Handler Setup - ${JSON.stringify(unknownHandler)} is not a valid handler to register!`)
        test.end()
      })
    })

    initializeTest.test('run Handler if runHandlers flag enabled with handlers[] populated', async (test) => {
      const service = 'api'

      var notificationHandler = {
        type: 'notification',
        enabled: true
      }

      var modulesList = [
        notificationHandler
      ]

      Setup.initialize({ service, runHandlers: true, handlers: modulesList }).then(() => {
        test.ok(RegisterHandlersStub.registerNotificationHandler.called)
        test.notOk(RegisterHandlersStub.registerAllHandlers.called)
        test.end()
      }).catch(err => {
        test.fail(`Should have not received an error: ${err}`)
        test.end()
      })
    })

    initializeTest.test('run no Handlers if runHandlers flag enabled with handlers[] populated and the notificationHandler is disabled', async (test) => {
      const service = 'api'

      var notificationHandler = {
        type: 'notification',
        enabled: false
      }

      var modulesList = [
        notificationHandler
      ]

      Setup.initialize({ service, runHandlers: true, handlers: modulesList }).then(() => {
        test.notOk(RegisterHandlersStub.registerNotificationHandler.called)
        test.notOk(RegisterHandlersStub.registerAllHandlers.called)
        test.end()
      }).catch(err => {
        test.fail(`Should have not received an error: ${err}`)
        test.end()
      })
    })

    initializeTest.test('run all Handlers if runHandlers flag enabled with handlers[] is empty', async (test) => {
      const service = 'api'

      var modulesList = [
      ]

      Setup.initialize({ service, runHandlers: true, handlers: modulesList }).then(() => {
        test.notOk(RegisterHandlersStub.registerNotificationHandler.called)
        test.ok(RegisterHandlersStub.registerAllHandlers.called)
        test.end()
      }).catch(err => {
        test.fail(`Should have not received an error: ${err}`)
        test.end()
      })
    })

    initializeTest.end()
  })

  // setupTest.test('fetchEndpoints should', async (fetchEndpointsTest) => {
  //   fetchEndpointsTest.test('return the array of endpoints', async (test) => {
  //     const fsp = 'fsp'

  //     const requestOptions = {
  //       url: Mustache.render(Config.ENDPOINT_CACHE.url, { fsp }),
  //       method: 'get',
  //       agentOptions: {
  //         rejectUnauthorized: false
  //       }
  //     }

  //     const expected = [
  //       {
  //         type: 'FSPIOP_CALLBACK_URL_TRANSFER_POST',
  //         value: 'http://localhost:1080/transfers'
  //       },
  //       {
  //         type: 'FSPIOP_CALLBACK_URL_TRANSFER_PUT',
  //         value: 'http://localhost:1080/transfers/{{transferId}}'
  //       },
  //       {
  //         type: 'FSPIOP_CALLBACK_URL_TRANSFER_ERROR',
  //         value: 'http://localhost:1080/transfers/{{transferId}}/error'
  //       }
  //     ]
  //     request.withArgs(requestOptions).yields(null, { statusCode: 200, body: JSON.stringify(expected) }, null)
  //     Setup = proxyquire('../../../src/shared/setup.js', { 'request': request })

  //     try {
  //       const result = await Setup.fetchEndpoints(fsp)
  //       test.deepEqual(result, expected, 'The results match')
  //       test.end()
  //     } catch (err) {
  //       test.fail('Error thrown', err)
  //       test.end()
  //     }
  //   })

  //   fetchEndpointsTest.test('throw error', async (test) => {
  //     const fsp = 'fsp'

  //     const requestOptions = {
  //       url: Mustache.render(Config.ENDPOINT_CACHE.url, { fsp }),
  //       method: 'get',
  //       agentOptions: {
  //         rejectUnauthorized: false
  //       }
  //     }

  //     request.withArgs(requestOptions).yields(new Error(), null, null)
  //     Setup = proxyquire('../../../src/shared/setup.js', { 'request': request })

  //     try {
  //       await Setup.fetchEndpoints(fsp)
  //       test.fail('should throw error')
  //       test.end()
  //     } catch (e) {
  //       test.ok(e instanceof Error)
  //       test.end()
  //     }
  //   })

  //   fetchEndpointsTest.end()
  // })

  // setupTest.test('getEndpoints should', async (getEndpointsTest) => {
  //   getEndpointsTest.test('return the array of endpoints', async (test) => {
  //     const fsp = 'fsp'

  //     const requestOptions = {
  //       url: Mustache.render(Config.ENDPOINT_CACHE.url, { fsp }),
  //       method: 'get',
  //       agentOptions: {
  //         rejectUnauthorized: false
  //       }
  //     }

  //     const endpoints = [
  //       {
  //         type: 'FSPIOP_CALLBACK_URL_TRANSFER_POST',
  //         value: 'http://localhost:1080/transfers'
  //       },
  //       {
  //         type: 'FSPIOP_CALLBACK_URL_TRANSFER_PUT',
  //         value: 'http://localhost:1080/transfers/{{transferId}}'
  //       },
  //       {
  //         type: 'FSPIOP_CALLBACK_URL_TRANSFER_ERROR',
  //         value: 'http://localhost:1080/transfers/{{transferId}}/error'
  //       }
  //     ]

  //     let endpointMap = {}

  //     if (Array.isArray(endpoints)) {
  //       endpoints.forEach(item => {
  //         endpointMap[item.type] = item.value
  //       })
  //     }

  //     request.withArgs(requestOptions).yields(null, { statusCode: 200, body: JSON.stringify(endpoints) }, null)
  //     Setup = proxyquire('../../../src/shared/setup.js', { 'request': request })

  //     try {
  //       const result = await Setup.getEndpoints(fsp)
  //       console.log(result)
  //       test.deepEqual(result, endpointMap, 'The results match')
  //       test.end()
  //     } catch (err) {
  //       test.fail('Error thrown', err)
  //       test.end()
  //     }
  //   })

  //   getEndpointsTest.test('does not return the array', async (test) => {
  //     const fsp = 'fsp'

  //     const requestOptions = {
  //       url: Mustache.render(Config.ENDPOINT_CACHE.url, { fsp }),
  //       method: 'get',
  //       agentOptions: {
  //         rejectUnauthorized: false
  //       }
  //     }

  //     request.withArgs(requestOptions).yields(null, { statusCode: 200, body: JSON.stringify('{}') }, null)
  //     Setup = proxyquire('../../../src/shared/setup.js', { 'request': request })

  //     try {
  //       const result = await Setup.getEndpoints(fsp)
  //       console.log(result)
  //       test.deepEqual(result, {}, 'The results match')
  //       test.end()
  //     } catch (err) {
  //       test.fail('Error thrown', err)
  //       test.end()
  //     }
  //   })

  //   getEndpointsTest.end()
  // })

  setupTest.end()
})
