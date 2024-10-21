#!/bin/bash

BASE_DIR=$(dirname "$0")
DEFAULT_CONFIG_FILE="$BASE_DIR/../../docker/central-ledger/default.json"

export HUB_NAME=$(cat "$DEFAULT_CONFIG_FILE" | jq -r '.HUB_PARTICIPANT.NAME')

export FSPList=("dfsp1" "dfsp2" "proxied2")
export DEFAULT_NET_DEBIT_CAP=5000
export CENTRAL_LEDGER_ADMIN_URI_PREFIX=http
export CENTRAL_LEDGER_ADMIN_HOST=127.0.0.1
export CENTRAL_LEDGER_ADMIN_PORT=3001
export CENTRAL_LEDGER_ADMIN_BASE=/

export MIGRATION_TIMEOUT=60
