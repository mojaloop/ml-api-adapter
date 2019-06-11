'use strict'

const Hapi = require('hapi')
const HapiOpenAPI = require('hapi-openapi')
const Path = require('path')
const Mongoose = require('./lib/mongodb/db').Mongoose

const connectMongoose = async () => {
  let db = await Mongoose.connect(`mongodb://localhost:27017/bulk_transfers`, {
    promiseLibrary: global.Promise
  })
  return db
}

const init = async function (options) {
  const { port } = options
  const server = new Hapi.Server({ port })
  let db = await connectMongoose()
  server.app.db = db
  await server.register({
    plugin: HapiOpenAPI,
    options: {
      api: Path.resolve(__dirname, './config/swagger.yaml'),
      handlers: Path.resolve(__dirname, './handlers')
    }
  })

  await server.start()

  return server
}

const initialize = (options) => {
  init(options).then((server) => {
    server.plugins.openapi.setHost(server.info.host + ':' + server.info.port)
    server.log(['info'], `Server running on ${server.info.host}:${server.info.port}`)
    return server
  })
}

module.exports = ({ initialize })
