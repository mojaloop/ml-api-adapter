#!/bin/sh
# wait-for-mockserver.sh

source /opt/wait-for/wait-for.env

MOCKSERVER_URL="http://$WAIT_FOR_MOCK_HOST:$WAIT_FOR_MOCK_PORT"

health_check() {
  curl --fail --silent -X GET "$MOCKSERVER_URL" # NOSONAR -- isolated Docker test network
  return $?
}

command() {
  curl --fail --silent -X PUT "$MOCKSERVER_URL/expectation" -d '{ "httpRequest": { "method": ".*", "path": "/.*transfers.*" }, "times" : { "remainingTimes" : 0,	"unlimited" : true }, "timeToLive" : { "unlimited" : true }, "httpResponse": { "statusCode": 200, "body": "{}" } }' # NOSONAR -- isolated Docker test network
  return $?
}

until health_check; do
  >&2 echo "mockserver is unavailable - sleeping"
  sleep 1
done

>&2 echo "mockserver is up - executing command"
command
