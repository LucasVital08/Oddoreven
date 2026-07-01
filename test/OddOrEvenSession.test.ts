import { expect } from "chai";
import { network } from "hardhat";

const { ethers } = await network.connect();

function hexStringToUint8Array(hexString: string): Uint8Array {
  if (hexString.length % 2 !== 0) {
    throw new Error("Hex string must have an even length");
  }
  const byteArray = new Uint8Array(hexString.length / 2);
  for (let i = 0; i < byteArray.length; i++) {
    const byte = hexString.substr(i * 2, 2);
    byteArray[i] = parseInt(byte, 16);
  }
  return byteArray;
}

let keySeed = hexStringToUint8Array(
  "abcddbe576b4818846aa77e82f4ed5fa78f92766b141f282d36703886d196df39322abcddbe576b4818846aa77e82f4ed5fa78f92766b141f282d36703886d196df39322"
);
let gameKey = ethers.keccak256(keySeed);

const DEFAULT_BID = ethers.parseEther("0.05");
const TIMEOUT = 60 * 20; // 20 minutes in seconds

/**
 * Build a hash the same way the contract does:
 *   keccak256(appendByteToBytes(keygame_bytes, optionProposer))
 */
function buildHash(keygameHex: string, option: number): string {
  let optStr = option < 0
    ? (option & 0xff).toString(16).padStart(2, "0")
    : option.toString(16).padStart(2, "0");
  return ethers.keccak256(hexStringToUint8Array(keygameHex + optStr));
}

describe("OddOrEvenSession", function () {

  let session: any;
  let factory: any;
  let platformOwner: any;
  let player1: any;
  let player2: any;
  let other: any;

  // keygame is the raw hex (no 0x prefix) of the keccak256 of keySeed
  let keygame: string;

  beforeEach(async () => {
    [platformOwner, player1, player2, other] = await ethers.getSigners();

    keygame = gameKey.substring(2); // strip "0x"

    // Deploy the session directly so player1 signer is the actual player1 in the contract
    const SessionFactory = await ethers.getContractFactory("OddOrEvenSession", player1);
    session = await SessionFactory.deploy(player1.address, player2.address, platformOwner.address, {
      value: DEFAULT_BID,
    });

    // Deploy factory for factory-specific tests
    factory = await ethers.deployContract("OddOrEvenFactory");
  });

  // ─── Construction ────────────────────────────────────────────────────────────

  it("should deploy with correct players and initial balance", async function () {
    expect(await session.player1()).to.equal(player1.address);
    expect(await session.player2()).to.equal(player2.address);
    expect(await session.platformOwner()).to.equal(platformOwner.address);
    const [b1, b2] = await session.getBalances();
    expect(b1).to.equal(DEFAULT_BID);
    expect(b2).to.equal(0n);
    expect(await session.sessionClosed()).to.equal(false);
    expect(await session.player2Joined()).to.equal(false);
  });

  it("should revert construction with zero deposit", async function () {
    await expect(
      factory.connect(player1).createSession(player2.address, { value: 0n })
    ).to.be.revertedWith("Initial deposit required");
  });

  it("should revert construction when player2 == player1", async function () {
    await expect(
      factory.connect(player1).createSession(player1.address, { value: DEFAULT_BID })
    ).to.be.revertedWith("Cannot play against yourself");
  });

  it("should revert construction with zero address for player2", async function () {
    await expect(
      factory
        .connect(player1)
        .createSession(ethers.ZeroAddress, { value: DEFAULT_BID })
    ).to.be.revertedWith("Invalid player2 address");
  });

  // ─── joinSession ─────────────────────────────────────────────────────────────

  it("should allow player2 to join with a deposit", async function () {
    await session.connect(player2).joinSession({ value: DEFAULT_BID });
    expect(await session.player2Joined()).to.equal(true);
    const [, b2] = await session.getBalances();
    expect(b2).to.equal(DEFAULT_BID);
  });

  it("should revert when non-player2 tries to join", async function () {
    await expect(
      session.connect(other).joinSession({ value: DEFAULT_BID })
    ).to.be.revertedWith("Only player2 can join");
  });

  it("should revert when player2 tries to join twice", async function () {
    await session.connect(player2).joinSession({ value: DEFAULT_BID });
    await expect(
      session.connect(player2).joinSession({ value: DEFAULT_BID })
    ).to.be.revertedWith("Already joined");
  });

  it("should revert joinSession with zero value", async function () {
    await expect(
      session.connect(player2).joinSession({ value: 0n })
    ).to.be.revertedWith("Initial deposit required");
  });

  // ─── topUp ───────────────────────────────────────────────────────────────────

  it("should allow player1 to top up their balance", async function () {
    const topUpAmount = ethers.parseEther("0.01");
    await session.connect(player1).topUp({ value: topUpAmount });
    const [b1] = await session.getBalances();
    expect(b1).to.equal(DEFAULT_BID + topUpAmount);
  });

  it("should allow player2 to top up their balance after joining", async function () {
    await session.connect(player2).joinSession({ value: DEFAULT_BID });
    const topUpAmount = ethers.parseEther("0.01");
    await session.connect(player2).topUp({ value: topUpAmount });
    const [, b2] = await session.getBalances();
    expect(b2).to.equal(DEFAULT_BID + topUpAmount);
  });

  it("should revert topUp from non-player", async function () {
    await expect(
      session.connect(other).topUp({ value: ethers.parseEther("0.01") })
    ).to.be.revertedWith("Not a player");
  });

  // ─── startRound ──────────────────────────────────────────────────────────────

  it("should allow player1 to start a round", async function () {
    await session.connect(player2).joinSession({ value: DEFAULT_BID });

    const optionProposer = 3;
    const hashOption = buildHash(keygame, optionProposer);
    const bet = ethers.parseEther("0.01");

    await session.connect(player1).startRound(false, hashOption, bet);

    const round = await session.currentRound();
    expect(round.proposer).to.equal(player1.address);
    expect(round.bet).to.equal(bet);
    expect(round.state).to.equal(1); // COMMITTED
  });

  it("should allow player2 to start a round", async function () {
    await session.connect(player2).joinSession({ value: DEFAULT_BID });

    const optionProposer = 5;
    const hashOption = buildHash(keygame, optionProposer);
    const bet = ethers.parseEther("0.01");

    await session.connect(player2).startRound(true, hashOption, bet);

    const round = await session.currentRound();
    expect(round.proposer).to.equal(player2.address);
    expect(round.state).to.equal(1); // COMMITTED
  });

  it("should revert startRound before player2 joins", async function () {
    const hashOption = buildHash(keygame, 3);
    await expect(
      session.connect(player1).startRound(false, hashOption, ethers.parseEther("0.01"))
    ).to.be.revertedWith("Waiting for player2 to join");
  });

  it("should revert startRound with zero bet", async function () {
    await session.connect(player2).joinSession({ value: DEFAULT_BID });
    const hashOption = buildHash(keygame, 3);
    await expect(
      session.connect(player1).startRound(false, hashOption, 0n)
    ).to.be.revertedWith("Bet must be positive");
  });

  it("should revert startRound when another round is in progress", async function () {
    await session.connect(player2).joinSession({ value: DEFAULT_BID });
    const hashOption = buildHash(keygame, 3);
    const bet = ethers.parseEther("0.01");
    await session.connect(player1).startRound(false, hashOption, bet);
    await expect(
      session.connect(player2).startRound(true, hashOption, bet)
    ).to.be.revertedWith("Round already in progress");
  });

  // ─── acceptRound ─────────────────────────────────────────────────────────────

  it("should allow the acceptor to accept a round", async function () {
    await session.connect(player2).joinSession({ value: DEFAULT_BID });

    const optionProposer = 3;
    const hashOption = buildHash(keygame, optionProposer);
    const bet = ethers.parseEther("0.01");

    await session.connect(player1).startRound(false, hashOption, bet);

    // Advance time by 1 second so block.timestamp > startTime
    const round = await session.currentRound();
    await ethers.provider.send("evm_setNextBlockTimestamp", [Number(round.startTime) + 1]);
    await ethers.provider.send("evm_mine", []);

    await session.connect(player2).acceptRound(5);

    const roundAfter = await session.currentRound();
    expect(roundAfter.state).to.equal(2); // ACCEPTED
    expect(Number(roundAfter.optionAcceptor)).to.equal(5);
  });

  it("should revert acceptRound when called by the proposer", async function () {
    await session.connect(player2).joinSession({ value: DEFAULT_BID });
    const hashOption = buildHash(keygame, 3);
    await session.connect(player1).startRound(false, hashOption, ethers.parseEther("0.01"));

    const round = await session.currentRound();
    await ethers.provider.send("evm_setNextBlockTimestamp", [Number(round.startTime) + 1]);
    await ethers.provider.send("evm_mine", []);

    await expect(session.connect(player1).acceptRound(5)).to.be.revertedWith("Not the acceptor");
  });

  it("should revert acceptRound with negative option", async function () {
    await session.connect(player2).joinSession({ value: DEFAULT_BID });
    const hashOption = buildHash(keygame, 3);
    await session.connect(player1).startRound(false, hashOption, ethers.parseEther("0.01"));

    const round = await session.currentRound();
    await ethers.provider.send("evm_setNextBlockTimestamp", [Number(round.startTime) + 1]);
    await ethers.provider.send("evm_mine", []);

    await expect(session.connect(player2).acceptRound(-1)).to.be.revertedWith("Option must be non-negative");
  });

  it("should revert acceptRound when round proposal has expired", async function () {
    await session.connect(player2).joinSession({ value: DEFAULT_BID });
    const hashOption = buildHash(keygame, 3);
    await session.connect(player1).startRound(false, hashOption, ethers.parseEther("0.01"));

    const round = await session.currentRound();
    // Advance past the TIMEOUT
    await ethers.provider.send("evm_setNextBlockTimestamp", [Number(round.startTime) + TIMEOUT + 1]);
    await ethers.provider.send("evm_mine", []);

    await expect(session.connect(player2).acceptRound(5)).to.be.revertedWith("Round proposal expired");
  });

  // ─── revealRound ─────────────────────────────────────────────────────────────

  it("should give victory to player1 as proposer (3 + 5 = 8, even)", async function () {
    await session.connect(player2).joinSession({ value: DEFAULT_BID });

    const optionProposer = 3;
    const optionAcceptor = 5;
    const isOdd = false; // even wins
    const hashOption = buildHash(keygame, optionProposer);
    const bet = ethers.parseEther("0.01");

    await session.connect(player1).startRound(isOdd, hashOption, bet);

    let round = await session.currentRound();
    await ethers.provider.send("evm_setNextBlockTimestamp", [Number(round.startTime) + 1]);
    await ethers.provider.send("evm_mine", []);

    await session.connect(player2).acceptRound(optionAcceptor);

    const [b1Before] = await session.getBalances();

    await session.connect(player1).revealRound(hexStringToUint8Array(keygame), optionProposer);

    const [b1After, b2After] = await session.getBalances();
    expect(b1After).to.be.gt(b1Before); // player1 gained
    expect(await session.getRoundsCount()).to.equal(1n);
  });

  it("should give victory to player2 as acceptor when proposer sends wrong key", async function () {
    await session.connect(player2).joinSession({ value: DEFAULT_BID });

    const optionProposer = 3;
    const hashOption = buildHash(keygame, optionProposer);
    const bet = ethers.parseEther("0.01");

    await session.connect(player1).startRound(false, hashOption, bet);

    let round = await session.currentRound();
    await ethers.provider.send("evm_setNextBlockTimestamp", [Number(round.startTime) + 1]);
    await ethers.provider.send("evm_mine", []);

    await session.connect(player2).acceptRound(5);

    const [, b2Before] = await session.getBalances();

    // Reveal with wrong keygame
    const badKeygame = keygame.substring(0, keygame.length - 2) + "ab";
    await session.connect(player1).revealRound(hexStringToUint8Array(badKeygame), optionProposer);

    const [, b2After] = await session.getBalances();
    expect(b2After).to.be.gt(b2Before);
  });

  it("should give victory to player2 when proposer reveals wrong option", async function () {
    await session.connect(player2).joinSession({ value: DEFAULT_BID });

    const optionProposer = 3;
    const hashOption = buildHash(keygame, optionProposer);
    const bet = ethers.parseEther("0.01");

    await session.connect(player1).startRound(false, hashOption, bet);

    let round = await session.currentRound();
    await ethers.provider.send("evm_setNextBlockTimestamp", [Number(round.startTime) + 1]);
    await ethers.provider.send("evm_mine", []);

    await session.connect(player2).acceptRound(5);

    const [, b2Before] = await session.getBalances();

    // Reveal with wrong option (2 instead of 3)
    await session.connect(player1).revealRound(hexStringToUint8Array(keygame), optionProposer - 1);

    const [, b2After] = await session.getBalances();
    expect(b2After).to.be.gt(b2Before);
  });

  it("should give victory to player2 when proposer reveals negative option", async function () {
    await session.connect(player2).joinSession({ value: DEFAULT_BID });

    const optionProposer = -2;
    const hashOption = buildHash(keygame, optionProposer);
    const bet = ethers.parseEther("0.01");

    await session.connect(player1).startRound(true, hashOption, bet);

    let round = await session.currentRound();
    await ethers.provider.send("evm_setNextBlockTimestamp", [Number(round.startTime) + 1]);
    await ethers.provider.send("evm_mine", []);

    await session.connect(player2).acceptRound(5);

    const [, b2Before] = await session.getBalances();

    await session.connect(player1).revealRound(hexStringToUint8Array(keygame), optionProposer);

    const [, b2After] = await session.getBalances();
    expect(b2After).to.be.gt(b2Before);
  });

  it("should revert revealRound when caller is not the proposer", async function () {
    await session.connect(player2).joinSession({ value: DEFAULT_BID });

    const optionProposer = 3;
    const hashOption = buildHash(keygame, optionProposer);
    await session.connect(player1).startRound(false, hashOption, ethers.parseEther("0.01"));

    let round = await session.currentRound();
    await ethers.provider.send("evm_setNextBlockTimestamp", [Number(round.startTime) + 1]);
    await ethers.provider.send("evm_mine", []);

    await session.connect(player2).acceptRound(5);

    await expect(
      session.connect(player2).revealRound(hexStringToUint8Array(keygame), optionProposer)
    ).to.be.revertedWith("Not the proposer");
  });

  it("should revert revealRound when round is not in ACCEPTED state", async function () {
    await session.connect(player2).joinSession({ value: DEFAULT_BID });

    const optionProposer = 3;
    const hashOption = buildHash(keygame, optionProposer);
    await session.connect(player1).startRound(false, hashOption, ethers.parseEther("0.01"));

    await expect(
      session.connect(player1).revealRound(hexStringToUint8Array(keygame), optionProposer)
    ).to.be.revertedWith("Round not accepted");
  });

  // ─── rejectRound ─────────────────────────────────────────────────────────────

  it("should allow the acceptor to reject a round", async function () {
    await session.connect(player2).joinSession({ value: DEFAULT_BID });

    const hashOption = buildHash(keygame, 3);
    await session.connect(player1).startRound(false, hashOption, ethers.parseEther("0.01"));

    await session.connect(player2).rejectRound();

    const round = await session.currentRound();
    expect(round.state).to.equal(0); // IDLE
  });

  it("should revert rejectRound when called by proposer", async function () {
    await session.connect(player2).joinSession({ value: DEFAULT_BID });
    const hashOption = buildHash(keygame, 3);
    await session.connect(player1).startRound(false, hashOption, ethers.parseEther("0.01"));

    await expect(session.connect(player1).rejectRound()).to.be.revertedWith("Not the acceptor");
  });

  it("should revert rejectRound when no pending round exists (state is IDLE)", async function () {
    await session.connect(player2).joinSession({ value: DEFAULT_BID });

    // Start a round by player2 so player1 would be acceptor, then check reject with wrong state
    const hash = buildHash(keygame, 3);
    await session.connect(player2).startRound(false, hash, ethers.parseEther("0.01"));
    // Accept it first so state becomes ACCEPTED (not COMMITTED)
    let round = await session.currentRound();
    await ethers.provider.send("evm_setNextBlockTimestamp", [Number(round.startTime) + 1]);
    await ethers.provider.send("evm_mine", []);
    await session.connect(player1).acceptRound(5);

    // Now state is ACCEPTED, not COMMITTED — reject should revert
    await expect(session.connect(player1).rejectRound()).to.be.revertedWith("No pending round to reject");
  });

  // ─── cancelRoundByTimeout ────────────────────────────────────────────────────

  it("should allow proposer to cancel round after timeout when not accepted", async function () {
    await session.connect(player2).joinSession({ value: DEFAULT_BID });

    const hashOption = buildHash(keygame, 3);
    await session.connect(player1).startRound(false, hashOption, ethers.parseEther("0.01"));

    const round = await session.currentRound();
    await ethers.provider.send("evm_setNextBlockTimestamp", [Number(round.startTime) + TIMEOUT + 1]);
    await ethers.provider.send("evm_mine", []);

    await session.connect(player1).cancelRoundByTimeout();

    const roundAfter = await session.currentRound();
    expect(roundAfter.state).to.equal(0); // IDLE
  });

  it("should revert cancelRoundByTimeout before timeout elapses", async function () {
    await session.connect(player2).joinSession({ value: DEFAULT_BID });

    const hashOption = buildHash(keygame, 3);
    await session.connect(player1).startRound(false, hashOption, ethers.parseEther("0.01"));

    const round = await session.currentRound();
    await ethers.provider.send("evm_setNextBlockTimestamp", [Number(round.startTime) + TIMEOUT - 1]);
    await ethers.provider.send("evm_mine", []);

    await expect(session.connect(player1).cancelRoundByTimeout()).to.be.revertedWith("Timeout not reached");
  });

  it("should revert cancelRoundByTimeout when called by non-proposer", async function () {
    await session.connect(player2).joinSession({ value: DEFAULT_BID });

    const hashOption = buildHash(keygame, 3);
    await session.connect(player1).startRound(false, hashOption, ethers.parseEther("0.01"));

    const round = await session.currentRound();
    await ethers.provider.send("evm_setNextBlockTimestamp", [Number(round.startTime) + TIMEOUT + 1]);
    await ethers.provider.send("evm_mine", []);

    await expect(session.connect(player2).cancelRoundByTimeout()).to.be.revertedWith("Not the proposer");
  });

  // ─── claimRoundByTimeout ─────────────────────────────────────────────────────

  it("should allow acceptor to claim victory when proposer does not reveal in time", async function () {
    await session.connect(player2).joinSession({ value: DEFAULT_BID });

    const hashOption = buildHash(keygame, 3);
    const bet = ethers.parseEther("0.01");
    await session.connect(player1).startRound(false, hashOption, bet);

    let round = await session.currentRound();
    await ethers.provider.send("evm_setNextBlockTimestamp", [Number(round.startTime) + 1]);
    await ethers.provider.send("evm_mine", []);

    await session.connect(player2).acceptRound(5);

    round = await session.currentRound();
    const [, b2Before] = await session.getBalances();

    // Advance past 2 * TIMEOUT after accept
    await ethers.provider.send("evm_setNextBlockTimestamp", [Number(round.acceptTime) + 2 * TIMEOUT + 1]);
    await ethers.provider.send("evm_mine", []);

    await session.connect(player2).claimRoundByTimeout();

    const [, b2After] = await session.getBalances();
    expect(b2After).to.be.gt(b2Before);
    expect(await session.getRoundsCount()).to.equal(1n);
  });

  it("should revert claimRoundByTimeout before the timeout has elapsed", async function () {
    await session.connect(player2).joinSession({ value: DEFAULT_BID });

    const hashOption = buildHash(keygame, 3);
    await session.connect(player1).startRound(false, hashOption, ethers.parseEther("0.01"));

    let round = await session.currentRound();
    await ethers.provider.send("evm_setNextBlockTimestamp", [Number(round.startTime) + 1]);
    await ethers.provider.send("evm_mine", []);

    await session.connect(player2).acceptRound(5);

    round = await session.currentRound();
    await ethers.provider.send("evm_setNextBlockTimestamp", [Number(round.acceptTime) + 2 * TIMEOUT - 1]);
    await ethers.provider.send("evm_mine", []);

    await expect(session.connect(player2).claimRoundByTimeout()).to.be.revertedWith("Timeout not reached");
  });

  it("should revert claimRoundByTimeout when called by proposer", async function () {
    await session.connect(player2).joinSession({ value: DEFAULT_BID });

    const hashOption = buildHash(keygame, 3);
    await session.connect(player1).startRound(false, hashOption, ethers.parseEther("0.01"));

    let round = await session.currentRound();
    await ethers.provider.send("evm_setNextBlockTimestamp", [Number(round.startTime) + 1]);
    await ethers.provider.send("evm_mine", []);

    await session.connect(player2).acceptRound(5);

    round = await session.currentRound();
    await ethers.provider.send("evm_setNextBlockTimestamp", [Number(round.acceptTime) + 2 * TIMEOUT + 1]);
    await ethers.provider.send("evm_mine", []);

    await expect(session.connect(player1).claimRoundByTimeout()).to.be.revertedWith("Not the acceptor");
  });

  // ─── closeSession ────────────────────────────────────────────────────────────

  it("should allow player1 to close the session and receive funds back", async function () {
    await session.connect(player2).joinSession({ value: DEFAULT_BID });

    const balBefore = await ethers.provider.getBalance(player1.address);
    const tx = await session.connect(player1).closeSession();
    const receipt = await tx.wait();
    const fee = receipt!.gasUsed * tx.gasPrice;
    const balAfter = await ethers.provider.getBalance(player1.address);

    expect(balAfter + fee).to.be.gte(balBefore); // player1 got at least their deposit back minus gas
    expect(await session.sessionClosed()).to.equal(true);
  });

  it("should allow player2 to close the session", async function () {
    await session.connect(player2).joinSession({ value: DEFAULT_BID });

    const balBefore = await ethers.provider.getBalance(player2.address);
    const tx = await session.connect(player2).closeSession();
    const receipt = await tx.wait();
    const fee = receipt!.gasUsed * tx.gasPrice;
    const balAfter = await ethers.provider.getBalance(player2.address);

    expect(balAfter + fee).to.be.gte(balBefore);
    expect(await session.sessionClosed()).to.equal(true);
  });

  it("should revert closeSession when a round is in progress", async function () {
    await session.connect(player2).joinSession({ value: DEFAULT_BID });

    const hashOption = buildHash(keygame, 3);
    await session.connect(player1).startRound(false, hashOption, ethers.parseEther("0.01"));

    await expect(session.connect(player1).closeSession()).to.be.revertedWith("Round in progress");
  });

  it("should revert any action after session is closed", async function () {
    await session.connect(player2).joinSession({ value: DEFAULT_BID });
    await session.connect(player1).closeSession();

    await expect(
      session.connect(player1).topUp({ value: ethers.parseEther("0.01") })
    ).to.be.revertedWith("Session is closed");
  });

  it("should revert closeSession when called by non-player", async function () {
    await session.connect(player2).joinSession({ value: DEFAULT_BID });
    await expect(session.connect(other).closeSession()).to.be.revertedWith("Not a player");
  });

  // ─── Multiple rounds in sequence ─────────────────────────────────────────────

  it("should correctly track history across multiple rounds", async function () {
    await session.connect(player2).joinSession({ value: DEFAULT_BID });

    // Round 1: player1 proposes, wins (3+5=8 even)
    {
      const optP = 3;
      const optA = 5;
      const hash = buildHash(keygame, optP);
      const bet = ethers.parseEther("0.005");
      await session.connect(player1).startRound(false, hash, bet);
      let round = await session.currentRound();
      await ethers.provider.send("evm_setNextBlockTimestamp", [Number(round.startTime) + 1]);
      await ethers.provider.send("evm_mine", []);
      await session.connect(player2).acceptRound(optA);
      await session.connect(player1).revealRound(hexStringToUint8Array(keygame), optP);
    }

    // Round 2: player2 proposes, wins (3+4=7 odd)
    {
      const optP = 3;
      const optA = 4;
      const hash = buildHash(keygame, optP);
      const bet = ethers.parseEther("0.005");
      await session.connect(player2).startRound(true, hash, bet);
      let round = await session.currentRound();
      await ethers.provider.send("evm_setNextBlockTimestamp", [Number(round.startTime) + 1]);
      await ethers.provider.send("evm_mine", []);
      await session.connect(player1).acceptRound(optA);
      await session.connect(player2).revealRound(hexStringToUint8Array(keygame), optP);
    }

    expect(await session.getRoundsCount()).to.equal(2n);

    const history = await session.getRoundHistory();
    expect(history[0].winner).to.equal(player1.address);
    expect(history[1].winner).to.equal(player2.address);
  });

  it("should allow a new round to start after a round is rejected", async function () {
    await session.connect(player2).joinSession({ value: DEFAULT_BID });

    const hash1 = buildHash(keygame, 3);
    await session.connect(player1).startRound(false, hash1, ethers.parseEther("0.01"));
    await session.connect(player2).rejectRound();

    // Should be able to start a new round
    const hash2 = buildHash(keygame, 5);
    await session.connect(player2).startRound(true, hash2, ethers.parseEther("0.01"));

    const round = await session.currentRound();
    expect(round.proposer).to.equal(player2.address);
    expect(round.state).to.equal(1); // COMMITTED
  });

  // ─── Factory tests ────────────────────────────────────────────────────────────

  it("should track sessions in factory getAllSessions", async function () {
    // Create a session via factory
    const tx = await factory.connect(player1).createSession(player2.address, { value: DEFAULT_BID });
    const receipt = await tx.wait();
    const iface = factory.interface;
    let sessionAddr: string | undefined;
    for (const log of receipt.logs) {
      try {
        const parsed = iface.parseLog(log);
        if (parsed && parsed.name === "SessionCreated") {
          sessionAddr = parsed.args.sessionAddress;
          break;
        }
      } catch {}
    }
    const allSessions = await factory.getAllSessions();
    expect(allSessions.length).to.equal(1);
    expect(allSessions[0]).to.equal(sessionAddr);
  });

  it("should track sessions by player in factory", async function () {
    const tx = await factory.connect(player1).createSession(player2.address, { value: DEFAULT_BID });
    const receipt = await tx.wait();
    const iface = factory.interface;
    let sessionAddr: string | undefined;
    for (const log of receipt.logs) {
      try {
        const parsed = iface.parseLog(log);
        if (parsed && parsed.name === "SessionCreated") {
          sessionAddr = parsed.args.sessionAddress;
          break;
        }
      } catch {}
    }
    const p1Sessions = await factory.getSessionsByPlayer(player1.address);
    const p2Sessions = await factory.getSessionsByPlayer(player2.address);
    expect(p1Sessions).to.include(sessionAddr);
    expect(p2Sessions).to.include(sessionAddr);
  });

  it("should return correct session count from factory", async function () {
    expect(await factory.getSessionsCount()).to.equal(0n);
    // Create a session
    await factory.connect(player1).createSession(player2.address, { value: DEFAULT_BID });
    expect(await factory.getSessionsCount()).to.equal(1n);
    // Create another session
    await factory.connect(player2).createSession(player1.address, { value: DEFAULT_BID });
    expect(await factory.getSessionsCount()).to.equal(2n);
  });

  // ─── Commission ──────────────────────────────────────────────────────────────

  it("should send commission to platformOwner only at closeSession", async function () {
    await session.connect(player2).joinSession({ value: DEFAULT_BID });

    const bet = ethers.parseEther("0.01");
    const optP = 3;
    const optA = 5;
    const hash = buildHash(keygame, optP);

    await session.connect(player1).startRound(false, hash, bet);
    let round = await session.currentRound();
    await ethers.provider.send("evm_setNextBlockTimestamp", [Number(round.startTime) + 1]);
    await ethers.provider.send("evm_mine", []);
    await session.connect(player2).acceptRound(optA);

    // No commission on reveal
    const ownerBalBeforeReveal = await ethers.provider.getBalance(platformOwner.address);
    await session.connect(player1).revealRound(hexStringToUint8Array(keygame), optP);
    const ownerBalAfterReveal = await ethers.provider.getBalance(platformOwner.address);
    expect(ownerBalAfterReveal).to.equal(ownerBalBeforeReveal); // no commission yet

    // Commission taken at closeSession: 1% of total pot (DEFAULT_BID * 2)
    const ownerBalBefore = await ethers.provider.getBalance(platformOwner.address);
    await session.connect(player1).closeSession();
    const ownerBalAfter = await ethers.provider.getBalance(platformOwner.address);

    const totalPot = DEFAULT_BID * 2n;
    const expectedCommission = (totalPot * 1n) / 100n;
    expect(ownerBalAfter - ownerBalBefore).to.equal(expectedCommission);
  });
});
