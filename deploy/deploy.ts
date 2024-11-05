import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  const name = "ConfidentialToken";
  const symbol = "CFT";

  const deployed = await deploy("ConfidentialToken", {
    from: deployer,
    args: [name, symbol],
    log: true,
  });

  console.log(`ConfidentialToken contract deployed at: ${deployed.address}`);
};

export default func;
func.id = "deploy_confidentialERC20";
func.tags = ["ConfidentialToken"];
