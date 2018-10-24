'use strict'
/**
 * Created by pedro barreto on 24/Oct/2018.
 */

const Handler = require('./handler')
const tags = ['api', 'metrics']

module.exports = [
  {
    method: 'GET',
    path: '/metrics',
    handler: Handler.metrics,
    config: {
      tags: tags,
      description: 'Prometheus metrics endpoint',
      id: 'metrics'
    }
  }
]
