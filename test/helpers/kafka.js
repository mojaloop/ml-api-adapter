// /*****
//  License
//  --------------
//  Copyright © 2020 Mojaloop Foundation
//  The Mojaloop files are made available by the Mojaloop Foundation under the Apache License, Version 2.0
//  (the "License") and you may not use these files except in compliance with the [License](http://www.apache.org/licenses/LICENSE-2.0).
//  You may obtain a copy of the License at [http://www.apache.org/licenses/LICENSE-2.0](http://www.apache.org/licenses/LICENSE-2.0)
//  Unless required by applicable law or agreed to in writing, the Mojaloop files are distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND,
//  either express or implied. See the License for the specific language governing permissions and limitations under the [License](http://www.apache.org/licenses/LICENSE-2.0).

//  Contributors
//  --------------
//  This is the official list of the Mojaloop project contributors for this file.
//  Names of the original copyright holders (individuals or organizations)
//  should be listed with a '*' in the first column. People who have
//  contributed from an organization can be listed under the organization
//  that actually holds the copyright for their contributions (see the
//  Gates Foundation organization for an example). Those individuals should have
//  their names indented and be marked with a '-'. Email address can be added
//  optionally within square brackets <email>.
//  * Gates Foundation
//  - Name Surname <name.surname@gatesfoundation.com>

//  * Infitx
//  - Steven Oderayi <steven.oderayi@infitx.com>
//  --------------
//  ******/

// const Producer = require('@mojaloop/central-services-stream').Util.Producer
// const { getProducerTopics } = require('../../src/lib/kafka/producer')

// const producers = {
//   // connect: async (assert = undefined) => {
//   //   for (const topic of getProducerTopics()) {
//   //     try {
//   //       if (await Producer.isConnected(topic)) {
//   //         console.log(`Producer already connected to topic: ${topic}`)
//   //       } else {
//   //         try {
//   //           await Producer.getProducer(topic).connect()
//   //           console.log(`Producer connected to topic: ${topic}`)
//   //           assert && assert.pass(`Producer connected to topic: ${topic}`)
//   //         } catch (error) {
//   //           console.error(`Error connecting producer to topic: ${topic}`)
//   //           assert && assert.fail(`Error connecting producer to topic: ${topic}`)
//   //           console.error(error)
//   //         }
//   //       }
//   //     } catch (error) {
//   //       console.error(`Error checking producer connection to topic: ${topic}`)
//   //       assert && assert.fail(`Error checking producer connection to topic: ${topic}`)
//   //       console.error(error)
//   //     }
//   //   }
//   // },
//   disconnectAll: async (assert = undefined) => {
//     for (const topic of getProducerTopics()) {
//       try {
//         if (await Producer.isConnected(topic)) {
//           try {
//             await Producer.getProducer(topic).disconnect()
//             console.log(`Producer disconnected from topic: ${topic}`)
//             assert && assert.pass(`Producer disconnected from topic: ${topic}`)
//           } catch (error) {
//             console.error(`Error disconnecting producer from topic: ${topic}`)
//             assert && assert.fail(`Error disconnecting producer from topic: ${topic}`)
//             console.error(error)
//           }
//         } else {
//           console.log(`Producer already disconnected from topic: ${topic}`)
//         }
//       } catch (error) {
//         console.error(`Error checking producer connection to topic: ${topic}`)
//         assert && assert.fail(`Error checking producer connection to topic: ${topic}`)
//         console.error(error)
//       }
//     }
//   }
// }

// module.exports = { producers }
