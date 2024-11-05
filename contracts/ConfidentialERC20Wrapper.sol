// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

import "fhevm/lib/TFHE.sol";
import "fhevm/gateway/GatewayCaller.sol";
import { ConfidentialToken } from "./ConfidentialERC20/ConfidentialToken.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract ConfidentialERC20Wrapper is ConfidentialToken {
    IERC20 public baseERC20;
    mapping(address => bool) public unwrapDisabled;
    event Wrap(address indexed account, uint64 amount);
    event Unwrap(address indexed account, uint64 amount);
    event Burn(address indexed account, uint64 amount);

    error UnwrapNotAllowed(address account);

    constructor(address _baseERC20) ConfidentialToken("Wrapped cERC20", "wcERC20") {
        baseERC20 = IERC20(_baseERC20);
    }

    function wrap(uint64 amount) external {
        uint256 _amount = uint256(amount);
        uint256 allowance = baseERC20.allowance(msg.sender, address(this));
        require(allowance >= _amount, "Not enough allowance");
        baseERC20.transferFrom(msg.sender, address(this), _amount);
        _mint(msg.sender, uint64(amount));
        emit Wrap(msg.sender, amount);
    }

    function unwrap(uint256 amount) external {
        if (unwrapDisabled[msg.sender]) {
            revert UnwrapNotAllowed(msg.sender);
        }

        _requestBurn(msg.sender, uint64(amount));
    }

    function _burnCallback(uint256 requestID, bool decryptedInput) public virtual override onlyGateway {
        BurnRq memory burnRequest = burnRqs[requestID];
        address account = burnRequest.account;
        uint64 amount = burnRequest.amount;

        if (!decryptedInput) {
            revert("Decryption failed");
        }

        // Call base ERC20 transfer and emit Unwrap event
        baseERC20.transfer(account, amount);
        emit Unwrap(account, amount);

        // Continue with the burn logic
        _totalSupply -= amount;
        _balances[account] = TFHE.sub(_balances[account], amount);
        TFHE.allow(_balances[account], address(this));
        TFHE.allow(_balances[account], account);
        delete burnRqs[requestID];
    }
}
