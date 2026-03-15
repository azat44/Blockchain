// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract FakeUSDC is ERC20 {
    uint8 private constant _DECIMALS = 6;

    constructor() ERC20("Fake USDC", "fUSDC") {
        _mint(msg.sender, 10_000 * 10 ** _DECIMALS);
    }

    function decimals() public pure override returns (uint8) {
        return _DECIMALS;
    }

    function faucet() external {
        _mint(msg.sender, 1_000 * 10 ** _DECIMALS);
    }
}