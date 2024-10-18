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

// Safely set nested property in an object
const setProp = (obj, path, value) => {
  const pathParts = path.split('.')
  let current = obj

  for (let i = 0; i < pathParts.length - 1; i++) {
    const part = pathParts[i]
    if (!current[part]) {
      current[part] = {}
    }
    current = current[part]
  }
  current[pathParts[pathParts.length - 1]] = value
}

// Safely get nested property from an object
const getProp = (obj, path) => {
  const pathParts = path.split('.')
  let current = obj

  for (const part of pathParts) {
    if (typeof current === 'object' && current !== null && part in current) {
      current = (current)[part]
    } else {
      return undefined
    }
  }

  return current
}

module.exports = {
  pathForInterface,
  setProp,
  getProp
}
