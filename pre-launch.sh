#!/usr/bin/env bash

# Assumes the following:
# 1. A local and **fresh** fhEVM node is already running.
# 2. All test addresses are funded (e.g. via the fund_test_addresses.sh script).
npx hardhat clean
mkdir -p fhevmTemp
cp -L -r node_modules/fhevm fhevmTemp/
npx hardhat compile:specific --contract fhevmTemp/fhevm/lib
npx hardhat compile:specific --contract fhevmTemp/fhevm/gateway
mkdir -p abi
cp artifacts/fhevmTemp/fhevm/lib/TFHEExecutor.sol/TFHEExecutor.json abi/TFHEExecutor.json

PRIVATE_KEY_GATEWAY_DEPLOYER=$(grep PRIVATE_KEY_GATEWAY_DEPLOYER .env | cut -d '"' -f 2)
npx hardhat task:computePredeployAddress --private-key "$PRIVATE_KEY_GATEWAY_DEPLOYER"

npx hardhat compile:specific --contract contracts