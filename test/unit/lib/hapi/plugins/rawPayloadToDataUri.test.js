const Hapi = require('hapi')
const Test = require('tapes')(require('tape'))
const Joi = require('joi')
const init = async (options) => {
  const server = await new Hapi.Server(options)

  await server.register([
    { plugin: require('../../../../../src/lib/hapi/plugins/rawPayloadToDataUri') }
  ])

  server.route({
    method: 'POST',
    path: '/',
    handler: (request, h) => {
      return request.payload
    },
    options: {
      validate: {
        payload: {
          errorInformation: Joi.object()
        }
      }
    }
  })
  await server.start()
  console.log(`Server running at: ${server.info.uri}`)
  return server
}

Test('rawPayloadToDataUri plugin test', async (pluginTest) => {
  let okOptions = {
    host: 'localhost',
    port: 8800,
    routes: {
      payload: {
        parse: true,
        output: 'stream'
      }
    }
  }

  let nokOptions = {
    host: 'localhost',
    port: 8800
  }

  await pluginTest.test('send request and get raw data back', async assert => {
    try {
      let server = await init(okOptions)
      const requestOptions = {
        method: 'POST',
        url: '/',
        payload: {
          'errorInformation': { 'errorCode': '5200', 'errorDescription': 'Generic limit error, amount \u0026 payments threshold.' }
        }
      }
      let response = await server.inject(requestOptions)
      assert.equal(response.statusCode, 200, 'status code is correct')
      assert.equal(response.payload, 'data:application/json;base64,eyJlcnJvckluZm9ybWF0aW9uIjp7ImVycm9yQ29kZSI6IjUyMDAiLCJlcnJvckRlc2NyaXB0aW9uIjoiR2VuZXJpYyBsaW1pdCBlcnJvciwgYW1vdW50ICYgcGF5bWVudHMgdGhyZXNob2xkLiJ9fQ', 'payload is base64 encoded dataUri')
      await server.stop()
      assert.end()
    } catch (e) {
      console.log(e)
      assert.fail()
      assert.end()
    }
  })

  await pluginTest.test('send request and get back parsed payload if the options are not correct', async assert => {
    try {
      let server = await init(nokOptions)
      const requestOptions = {
        method: 'POST',
        url: '/',
        payload: {
          'errorInformation': { 'errorCode': '5200', 'errorDescription': 'Generic limit error, amount \u0026 payments threshold.' }
        }
      }
      let response = await server.inject(requestOptions)
      assert.equal(response.statusCode, 200, 'status code is correct')
      assert.equal(response.payload, JSON.stringify(requestOptions.payload), 'payload is equal')
      await server.stop()
      assert.end()
    } catch (e) {
      console.log(e)
      assert.fail()
      assert.end()
    }
  })

  await pluginTest.test('send wrong content type', async assert => {
    try {
      let server = await init(okOptions)
      const requestOptions = {
        method: 'POST',
        url: '/',
        payload: {
          'errorInformation': { 'errorCode': '5200', 'errorDescription': 'Generic limit error, amount \u0026 payments threshold.' }
        },
        headers: {
          'content-type': 'application/xml'
        }
      }
      let response = await server.inject(requestOptions)
      assert.equal(response.statusCode, 400, 'status code is correct')
      await server.stop()
      assert.end()
    } catch (e) {
      console.log(e)
      assert.fail()
      assert.end()
    }
  })

  await pluginTest.end()
})
