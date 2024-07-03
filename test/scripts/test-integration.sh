#!/bin/bash

docker load -i /tmp/docker-image.tar
docker-compose up -d
docker-compose ps

npm run wait-4-docker

curl localhost:3000/health && npm run test:xint | tee ./test/results/test-int.log
docker-compose down
