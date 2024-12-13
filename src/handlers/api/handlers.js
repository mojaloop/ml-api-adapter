const { getHealth } = require('../../../src/api/metadata/handler')
const OpenapiBackend = require('@mojaloop/central-services-shared').Util.OpenapiBackend

module.exports.KafkaModeHandlerApiHandlers = {
  HealthGet: getHealth,
  validationFail: OpenapiBackend.validationFail,
  notFound: OpenapiBackend.notFound,
  methodNotAllowed: OpenapiBackend.methodNotAllowed
}
