const Joi = require('@hapi/joi')
const Handler = require('./handler')
const tags = ['api', 'metadata']

module.exports = [
  {
    method: 'GET',
    path: '/health',
    handler: Handler.getHealth,
    options: {
      tags: tags,
      description: 'Status of adapter',
      id: 'health',
      validate: {
        query: Joi.object({
          simple: [
            Joi.string().max(0).allow(''),
            Joi.boolean()
          ]
        })
      }
    }
  },
  {
    method: 'GET',
    path: '/',
    handler: Handler.metadata,
    options: {
      tags: tags,
      description: 'Metadata'
    }
  }
]
