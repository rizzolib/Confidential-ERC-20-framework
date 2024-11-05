import { ethers } from "hardhat";

import type { ConfidentialToken } from "../../types";
import { getSigners } from "../signers";

export async function deployConfidentialERC20Fixture(): Promise<ConfidentialToken> {
  const signers = await getSigners();

  const contractFactory = await ethers.getContractFactory("ConfidentialToken");
  const contract = await contractFactory.connect(signers.alice).deploy("TestToken", "TestToken");
  await contract.waitForDeployment();

  return contract;
}
