import { network } from "hardhat";

/**
 * Deploys OddOrEvenFactory to the selected network and prints the address to
 * paste into frontend/.env.local as NEXT_PUBLIC_FACTORY_ADDRESS.
 *
 *   npx hardhat node                              # terminal 1
 *   npx hardhat run scripts/deploy.ts --network local   # terminal 2
 */
async function main() {
  const { ethers } = await network.connect();
  const [deployer] = await ethers.getSigners();

  console.log("Deploying with:", deployer.address);
  console.log("Balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH");

  const factory = await ethers.deployContract("OddOrEvenFactory");
  await factory.waitForDeployment();

  const address = await factory.getAddress();
  console.log("\n✅ OddOrEvenFactory deployed to:", address);
  console.log("\nAdd this to frontend/.env.local:");
  console.log(`NEXT_PUBLIC_FACTORY_ADDRESS=${address}\n`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
