#!/bin/bash
set -euxo pipefail

source ./docker/env.sh

export ENDPOINT_URL=http://localhost:4545/notification

function dump_docker_logs {
    local exit_code="$?"
    echo "==> integration script failed; dumping docker compose status and service logs"
    docker compose ps || true
    docker compose logs central-ledger || true
    docker compose logs ml-api-adapter || true
    exit "$exit_code"
}

trap dump_docker_logs ERR

docker load -i /tmp/docker-image.tar

docker compose up -d
docker compose stop ml-api-adapter-iso
docker compose ps

npm run wait-4-docker
curl localhost:3000/health

CWD="${0%/*}"

if [[ "$CWD" =~ ^(.*)\.sh$ ]];
then
    CWD="."
fi
$CWD/populateTestData.sh

echo "==> running integration tests with fspiop ml-api-adapter"
export API_TYPE=fspiop

INTEGRATION_TEST_EXIT_CODE=0
npm run test:xint || INTEGRATION_TEST_EXIT_CODE="$?"
echo "==> integration tests with fspiop adapter exited with code: $INTEGRATION_TEST_EXIT_CODE"

# Run tests with ISO ml-api-adapter
docker compose stop ml-api-adapter
sleep 2

docker compose start ml-api-adapter-iso
ML_API_CONTAINER=ml_ml-api-adapter-iso  npm run wait-4-docker
curl localhost:4000/health

echo "==> running integration tests with ISO ml-api-adapter"
export API_TYPE=iso20022

npm run test:xint || INTEGRATION_TEST_EXIT_CODE="$?"
echo "==> integration tests with ISO adapter exited with code: $INTEGRATION_TEST_EXIT_CODE"

docker compose down
exit $INTEGRATION_TEST_EXIT_CODE
