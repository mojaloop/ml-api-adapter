/*****
 License
 --------------
 Copyright © 2017 Bill & Melinda Gates Foundation
 The Mojaloop files are made available by the Bill & Melinda Gates Foundation under the Apache License, Version 2.0 (the "License") and you may not use these files except in compliance with the License. You may obtain a copy of the License at
 http://www.apache.org/licenses/LICENSE-2.0
 Unless required by applicable law or agreed to in writing, the Mojaloop files are distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 Contributors
 --------------
 This is the official list of the Mojaloop project contributors for this file.
 Names of the original copyright holders (individuals or organizations)
 should be listed with a '*' in the first column. People who have
 contributed from an organization can be listed under the organization
 that actually holds the copyright for their contributions (see the
 Gates Foundation organization for an example). Those individuals should have
 their names indented and be marked with a '-'. Email address can be added
 optionally within square brackets <email>.
 * Gates Foundation
 - Name Surname <name.surname@gatesfoundation.com>
 --------------
 ******/
'use strict'

const Handler = require('./handler')
const tags = ['test', 'transfers']

module.exports = [{
  method: 'GET',
  path: '/notification/{fsp}/{operation}/{id}',
  handler: Handler.getNotification,
  options: {
    id: 'test-getNotification',
    tags,
    description: 'Get Notification Details'
  }
},
{
  method: 'GET',
  path: '/participants/{fsp}/endpoints',
  handler: Handler.getEndpoints,
  options: {
    id: 'test-getEndpoints',
    tags,
    description: 'Get Endpoint Details'
  }
},
{
  method: 'GET',
  path: '/',
  handler: Handler.getNotification,
  options: {
    id: 'test-get',
    tags,
    description: 'test endpoint'
  }
},
...['dfsp1', 'dfsp2', 'dfsp3', 'dfsp4'].map(fsp =>
  [{
    method: 'POST',
    path: `/${fsp}/transfers`,
    handler: Handler.receiveNotificationPost,
    options: {
      id: `${fsp}-transfers`,
      tags,
      description: `receive -transfers for ${fsp}`,
      payload: {
        failAction: 'error'
      }
    }
  },
  {
    method: 'PUT',
    path: `/${fsp}/transfers/{transferId}`,
    handler: Handler.receiveNotificationPut,
    options: {
      id: `${fsp}-put`,
      tags,
      description: `receive put notification for ${fsp}`,
      payload: {
        allow: 'application/json',
        failAction: 'error'
      }
    }
  },
  {
    method: 'PATCH',
    path: `/${fsp}/transfers/{transferId}`,
    handler: Handler.receiveNotificationPatch,
    options: {
      id: `${fsp}-patch`,
      tags,
      description: `receive patch notification for ${fsp}`,
      payload: {
        allow: 'application/json',
        failAction: 'error'
      }
    }
  },
  {
    method: 'PUT',
    path: `/${fsp}/transfers/{transferId}/error`,
    handler: Handler.receiveNotificationPut,
    options: {
      id: `${fsp}-error`,
      tags,
      description: `receive error notification for ${fsp}`,
      payload: {
        failAction: 'error'
      }
    }
  },
  {
    method: 'PUT',
    path: `/${fsp}/fxTransfers/{commitRequestId}`,
    handler: Handler.receiveNotificationPut,
    options: {
      id: `${fsp}-fx-put`,
      tags,
      description: `receive put notification for ${fsp}`,
      payload: {
        failAction: 'error'
      }
    }
  },
  {
    method: 'PUT',
    path: `/${fsp}/fxTransfers/{commitRequestId}/error`,
    handler: Handler.receiveNotificationPut,
    options: {
      id: `${fsp}-fx-error`,
      tags,
      description: `receive error notification for ${fsp}`,
      payload: {
        failAction: 'error'
      }
    }
  },
  {
    method: 'PATCH',
    path: `/${fsp}/fxTransfers/{commitRequestId}`,
    handler: Handler.receiveNotificationPatch,
    options: {
      id: `${fsp}-fx-patch`,
      tags,
      description: `receive patch notification for ${fsp}`,
      payload: {
        failAction: 'error'
      }
    }
  }]).flat(),
{
  method: 'PUT',
  path: '/fxp1/fxTransfers/{transferId}/error',
  handler: Handler.receiveNotificationPut,
  options: {
    id: 'fxp1-fx-error',
    tags,
    description: 'receive error notification for fxp1',
    payload: {
      failAction: 'error'
    }
  }
},
{
  method: 'POST',
  path: '/fxp1/fxTransfers',
  handler: Handler.receiveNotificationPost,
  options: {
    id: 'fxp1-fx-transfers',
    tags,
    description: 'receive fx transfers for fxp1',
    payload: {
      failAction: 'error'
    }
  }
},
{
  method: 'PUT',
  path: '/fxp1/fxTransfers/{transferId}',
  handler: Handler.receiveNotificationPut,
  options: {
    id: 'fxp1-fx-put',
    tags,
    description: 'receive put notification for fxp1',
    payload: {
      allow: 'application/json',
      failAction: 'error'
    }
  }
},
{
  method: 'PATCH',
  path: '/fxp1/fxTransfers/{transferId}',
  handler: Handler.receiveNotificationPatch,
  options: {
    id: 'fxp1-fx-patch',
    tags,
    description: 'receive patch notification for fxp1',
    payload: {
      allow: 'application/json',
      failAction: 'error'
    }
  }
},
{
  method: 'POST',
  path: '/proxyFsp/transfers',
  handler: Handler.receiveNotificationPost,
  options: {
    id: 'proxyFsp-transfers',
    tags,
    description: 'receive -transfers for proxyFsp',
    payload: {
      failAction: 'error'
    }
  }
},
{
  method: 'PUT',
  path: '/proxyFsp/transfers/{transferId}/error',
  handler: Handler.receiveNotificationPut,
  options: {
    id: 'proxyFsp-error',
    tags,
    description: 'receive error notification for proxyFsp',
    payload: {
      failAction: 'error'
    }
  }
},
{
  method: 'PUT',
  path: '/proxyFsp/transfers/{transferId}',
  handler: Handler.receiveNotificationPut,
  options: {
    id: 'proxyFsp-put',
    tags,
    description: 'receive put notification for proxyFsp',
    payload: {
      failAction: 'error'
    }
  }
}
]
