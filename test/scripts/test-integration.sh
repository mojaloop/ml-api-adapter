#!/bin/bash
set -euxo pipefail

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
# $CWD/populateTestData.sh

INTEGRATION_TEST_EXIT_CODE=0
npm run test:xint || INTEGRATION_TEST_EXIT_CODE="$?"
echo "==> integration tests exited with code: $INTEGRATION_TEST_EXIT_CODE"

docker-compose down
exit $INTEGRATION_TEST_EXIT_CODE
