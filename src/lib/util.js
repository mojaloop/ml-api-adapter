const Path = require('path')
const { Hapi } = require('@mojaloop/central-services-shared').Util
const Config = require('../lib/config')

const pathForInterface = ({ isHandlerInterface }) => {
  let apiFile
  const pathFolder = '../interface/'
  if (isHandlerInterface) {
    apiFile = 'handler-swagger.yaml'
  } else {
    apiFile = Config.API_TYPE === Hapi.API_TYPES.iso20022
      ? 'api-swagger-iso20022-transfers.yaml'
      : 'api-swagger.yaml'
  }
  return Path.resolve(__dirname, pathFolder + apiFile)
}

module.exports = {
  pathForInterface
}
