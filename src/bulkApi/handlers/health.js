'use strict';

const Boom = require('boom');

/**
 * Operations on /health
 */
module.exports = {
    /**
     * summary: Status of adapter
     * description: 
     * parameters: 
     * produces: 
     * responses: default
     */
    get: function getHealth(request, h) {
        return 'bla'
    }
};
