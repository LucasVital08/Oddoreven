// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import "./Keccak256Utils.sol";

contract OddOrEvenSession {

    enum RoundState { IDLE, COMMITTED, ACCEPTED }

    struct Round {
        address proposer;
        bytes32 hashOption;
        bool isOdd;
        uint256 bet;
        RoundState state;
        int8 optionAcceptor;
        uint256 startTime;
        uint256 acceptTime;
    }

    struct RoundRecord {
        address winner;
        uint256 bet;
        int8 optionProposer;
        int8 optionAcceptor;
        bool byTimeout;
        uint256 timestamp;
    }

    Round public currentRound;
    RoundRecord[] private _roundHistory;

    address payable public immutable player1;
    address payable public immutable player2;
    address payable public immutable platformOwner;

    uint256 public balance1;
    uint256 public balance2;

    bool public sessionClosed;
    bool public player2Joined;

    uint64 public constant TIMEOUT = 60 * 20; // 20 minutes
    uint8 public constant COMMISSION = 1;      // 1%

    event SessionJoined(uint256 deposit);
    event TopUp(address indexed player, uint256 amount);
    event RoundStarted(address indexed proposer, uint256 bet, bool isOdd);
    event RoundAccepted(address indexed acceptor, int8 option);
    event RoundResult(address indexed winner, uint256 netGain, int8 optionProposer, int8 optionAcceptor, bool byTimeout);
    event RoundRejected(address indexed rejector);
    event RoundCancelledByTimeout(address indexed proposer);
    event SessionClosed(uint256 finalBalance1, uint256 finalBalance2);

    constructor(address payable _player2, address payable _platformOwner) payable {
        require(msg.value > 0, "Initial deposit required");
        require(_player2 != msg.sender, "Cannot play against yourself");
        require(_player2 != address(0), "Invalid player2");
        player1 = payable(msg.sender);
        player2 = _player2;
        platformOwner = _platformOwner;
        balance1 = msg.value;
    }

    modifier onlyPlayers() {
        require(msg.sender == player1 || msg.sender == player2, "Not a player");
        _;
    }

    modifier active() {
        require(!sessionClosed, "Session is closed");
        _;
    }

    function joinSession() external payable active {
        require(msg.sender == player2, "Only player2 can join");
        require(!player2Joined, "Already joined");
        require(msg.value > 0, "Initial deposit required");
        player2Joined = true;
        balance2 = msg.value;
        emit SessionJoined(msg.value);
    }

    function topUp() external payable onlyPlayers active {
        require(msg.value > 0, "Deposit must be positive");
        if (msg.sender == player1) balance1 += msg.value;
        else balance2 += msg.value;
        emit TopUp(msg.sender, msg.value);
    }

    function startRound(bool isOdd, bytes32 hashOption, uint256 bet) external onlyPlayers active {
        require(player2Joined, "Waiting for player2 to join");
        require(currentRound.state == RoundState.IDLE, "Round already in progress");
        require(bet > 0, "Bet must be positive");
        require(balance1 >= bet && balance2 >= bet, "Insufficient balance for this bet");

        currentRound = Round({
            proposer: msg.sender,
            hashOption: hashOption,
            isOdd: isOdd,
            bet: bet,
            state: RoundState.COMMITTED,
            optionAcceptor: -1,
            startTime: block.timestamp,
            acceptTime: 0
        });

        emit RoundStarted(msg.sender, bet, isOdd);
    }

    function acceptRound(int8 option) external active {
        require(
            (msg.sender == player1 && currentRound.proposer == player2) ||
            (msg.sender == player2 && currentRound.proposer == player1),
            "Not the acceptor"
        );
        require(currentRound.state == RoundState.COMMITTED, "No pending round");
        require(option >= 0, "Option must be non-negative");
        require(block.timestamp > currentRound.startTime, "Locktime violation");
        require(block.timestamp <= currentRound.startTime + TIMEOUT, "Round proposal expired");

        currentRound.optionAcceptor = option;
        currentRound.state = RoundState.ACCEPTED;
        currentRound.acceptTime = block.timestamp;

        emit RoundAccepted(msg.sender, option);
    }

    function revealRound(bytes memory keygame, int8 optionProposer) external active {
        require(msg.sender == currentRound.proposer, "Not the proposer");
        require(currentRound.state == RoundState.ACCEPTED, "Round not accepted");

        uint8 oddness = currentRound.isOdd ? 1 : 0;
        uint256 bet = currentRound.bet;
        int8 optAcc = currentRound.optionAcceptor;

        bool proposerWins = (
            keccak256(Keccak256Utils.appendByteToBytes(keygame, optionProposer)) == currentRound.hashOption &&
            uint8(optionProposer + optAcc) % 2 == oddness &&
            optionProposer >= 0
        );

        address winnerAddr = proposerWins ? currentRound.proposer : _opponent(currentRound.proposer);

        if (winnerAddr == player1) {
            balance1 += bet;
            balance2 -= bet;
        } else {
            balance2 += bet;
            balance1 -= bet;
        }

        _roundHistory.push(RoundRecord({
            winner: winnerAddr,
            bet: bet,
            optionProposer: optionProposer,
            optionAcceptor: optAcc,
            byTimeout: false,
            timestamp: block.timestamp
        }));

        emit RoundResult(winnerAddr, bet, optionProposer, optAcc, false);
        delete currentRound;
    }

    function rejectRound() external active {
        require(
            (msg.sender == player1 && currentRound.proposer == player2) ||
            (msg.sender == player2 && currentRound.proposer == player1),
            "Not the acceptor"
        );
        require(currentRound.state == RoundState.COMMITTED, "No pending round to reject");
        emit RoundRejected(msg.sender);
        delete currentRound;
    }

    function cancelRoundByTimeout() external active {
        require(msg.sender == currentRound.proposer, "Not the proposer");
        require(currentRound.state == RoundState.COMMITTED, "Round not in COMMITTED state");
        require(block.timestamp > currentRound.startTime + TIMEOUT, "Timeout not reached");
        emit RoundCancelledByTimeout(msg.sender);
        delete currentRound;
    }

    function claimRoundByTimeout() external active {
        require(
            (msg.sender == player1 && currentRound.proposer == player2) ||
            (msg.sender == player2 && currentRound.proposer == player1),
            "Not the acceptor"
        );
        require(currentRound.state == RoundState.ACCEPTED, "Round not accepted");
        require(block.timestamp > currentRound.acceptTime + (2 * TIMEOUT), "Timeout not reached");

        uint256 bet = currentRound.bet;
        int8 optAcc = currentRound.optionAcceptor;
        address claimant = msg.sender;

        if (claimant == player1) {
            balance1 += bet;
            balance2 -= bet;
        } else {
            balance2 += bet;
            balance1 -= bet;
        }

        _roundHistory.push(RoundRecord({
            winner: claimant,
            bet: bet,
            optionProposer: -1,
            optionAcceptor: optAcc,
            byTimeout: true,
            timestamp: block.timestamp
        }));

        emit RoundResult(claimant, bet, -1, optAcc, true);
        delete currentRound;
    }

    function closeSession() external onlyPlayers active {
        require(currentRound.state == RoundState.IDLE, "Round in progress");
        sessionClosed = true;
        uint256 b1 = balance1;
        uint256 b2 = balance2;
        balance1 = 0;
        balance2 = 0;

        uint256 totalPot = b1 + b2;
        uint256 commission = (totalPot * COMMISSION) / 100;
        uint256 net = totalPot - commission;
        uint256 payout1 = totalPot > 0 ? (net * b1) / totalPot : 0;
        uint256 payout2 = net - payout1;

        emit SessionClosed(payout1, payout2);
        if (commission > 0) platformOwner.transfer(commission);
        if (payout1 > 0) player1.transfer(payout1);
        if (payout2 > 0) player2.transfer(payout2);
    }

    function getRoundHistory() external view returns (RoundRecord[] memory) {
        return _roundHistory;
    }

    function getRoundsCount() external view returns (uint256) {
        return _roundHistory.length;
    }

    function getBalances() external view returns (uint256 bal1, uint256 bal2) {
        return (balance1, balance2);
    }

    function _opponent(address player) internal view returns (address) {
        return player == player1 ? address(player2) : address(player1);
    }
}
