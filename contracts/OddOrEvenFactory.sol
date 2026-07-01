// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import "./OddOrEvenSession.sol";

contract OddOrEvenFactory {

    address payable public immutable owner;
    address[] private _sessions;

    mapping(address => address[]) private _sessionsByPlayer;

    event SessionCreated(
        address indexed sessionAddress,
        address indexed player1,
        address indexed player2,
        uint256 initialDeposit
    );

    constructor() {
        owner = payable(msg.sender);
    }

    function createSession(address payable player2) external payable returns (address) {
        require(msg.value > 0, "Initial deposit required");
        require(player2 != msg.sender, "Cannot play against yourself");
        require(player2 != address(0), "Invalid player2 address");

        OddOrEvenSession session = new OddOrEvenSession{value: msg.value}(player2, owner);

        address sessionAddr = address(session);
        _sessions.push(sessionAddr);
        _sessionsByPlayer[msg.sender].push(sessionAddr);
        _sessionsByPlayer[player2].push(sessionAddr);

        emit SessionCreated(sessionAddr, msg.sender, player2, msg.value);
        return sessionAddr;
    }

    function getAllSessions() external view returns (address[] memory) {
        return _sessions;
    }

    function getSessionsByPlayer(address player) external view returns (address[] memory) {
        return _sessionsByPlayer[player];
    }

    function getSessionsCount() external view returns (uint256) {
        return _sessions.length;
    }
}
