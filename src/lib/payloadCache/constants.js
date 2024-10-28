const PAYLOAD_STORAGES = Object.freeze({
  redis: 'redis',
  kafka: 'kafka',
  none: ''
})

const CACHE_TYPES = Object.freeze({
  redis: 'redis',
  redisCluster: 'redis-cluster'
})

module.exports = {
  CACHE_TYPES,
  PAYLOAD_STORAGES
}
