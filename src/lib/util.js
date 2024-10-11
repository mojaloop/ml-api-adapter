const util = require('util')
const Path = require('path')
const Enum = require('@mojaloop/central-services-shared').Enum
const { HeaderValidation, Hapi } = require('@mojaloop/central-services-shared').Util
const Config = require('../lib/config')

const getSpanTags = ({ headers }, transactionType, transactionAction) => {
  const tags = {
    transactionType,
    transactionAction
  }
  if (headers && headers[Enum.Http.Headers.FSPIOP.SOURCE]) {
    tags.source = headers[Enum.Http.Headers.FSPIOP.SOURCE]
  }
  if (headers && headers[Enum.Http.Headers.FSPIOP.DESTINATION]) {
    tags.destination = headers[Enum.Http.Headers.FSPIOP.DESTINATION]
  }
  return tags
}
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
/**
 * @function getStackOrInspect
 * @description Gets the error stack, or uses util.inspect to inspect the error
 * @param {*} err - An error object
 */
function getStackOrInspect (err) {
  return err?.stack || util.inspect(err)
}
module.exports = {
  getSpanTags,
  pathForInterface,
  getStackOrInspect,
  hubNameConfig: {
    hubName: Config.HUB_NAME,
    hubNameRegex: HeaderValidation.getHubNameRegex(Config.HUB_NAME)
  }
}
