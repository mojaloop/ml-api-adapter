#!/bin/bash
set -euxo pipefail

source ./docker/env.sh

export ENDPOINT_URL=http://localhost:4545/notification

docker load -i /tmp/docker-image.tar

docker-compose up -d
docker-compose ps

npm run wait-4-docker
curl localhost:3000/health

CWD="${0%/*}"

if [[ "$CWD" =~ ^(.*)\.sh$ ]];
then
    CWD="."
fi
$CWD/populateTestData.sh

# Run tests with FSPIOP ml-api-adapter
docker-compose stop ml-api-adapter-iso
sleep 5

echo "==> running integration tests with fspiop ml-api-adapter"

export API_TYPE=fspiop

INTEGRATION_TEST_EXIT_CODE=0
npm run test:xint || INTEGRATION_TEST_EXIT_CODE="$?"
echo "==> integration tests with fspiop adapter exited with code: $INTEGRATION_TEST_EXIT_CODE"

# Run tests with ISO ml-api-adapter
docker-compose start ml-api-adapter-iso
docker-compose stop ml-api-adapter
sleep 5

echo "==> running integration tests with ISO ml-api-adapter"

export API_TYPE=iso20022

npm run test:xint || INTEGRATION_TEST_EXIT_CODE="$?"
echo "==> integration tests with ISO adapter exited with code: $INTEGRATION_TEST_EXIT_CODE"

docker-compose down
exit $INTEGRATION_TEST_EXIT_CODE
