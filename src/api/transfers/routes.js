const Handler = require('./handler')
const Joi = require('joi')
const Auth = require('../auth')
const tags = ['api', 'transfers']

module.exports = [{
  method: 'POST',
  path: '/transfers',
  handler: Handler.create,
  config: {
    id: 'transfers',
    tags: tags,
    auth: null,
    description: 'Transfer API.',
    payload: {
      allow: 'application/json',
      failAction: 'error',
      output: 'data'
    },
    validate: {
      payload: {
        transferId: Joi.string().guid().required().description('Id of transfer'),
        payeeFsp: Joi.number().required().description('Financial Service Provider of Payee'),
        payerFsp: Joi.number().required().description('Financial Service Provider of Payer'),
        amount: Joi.object().keys({
          currency: Joi.string().required().description('Currency of the transfer'),
          amount: Joi.number().required().description('Amount of the transfer')
        }).required().description('Amount of the transfer'),
        ilpPacket: Joi.string().required().description('ilp packet'),
        extensionList: Joi.object().keys({
          extension: Joi.array().items(Joi.object().keys({
            key: Joi.string().required().description('Key'),
            value: Joi.string().required().description('Value')
          })).required().description('extension')
        }).required().description('Extention list'),
        condition: Joi.string().trim().max(65535).optional().description('Condition of transfer'),
        expiration: Joi.string().isoDate().optional().description('When the transfer expires')
      }
    }
  }
}
]
