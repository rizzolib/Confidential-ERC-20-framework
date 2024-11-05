import { expect } from "chai";

import { awaitAllDecryptionResults } from "../asyncDecrypt";
import { createInstances } from "../instance";
import { getSigners, initSigners } from "../signers";
import { deployEncryptedERC20Fixture } from "./ConfidentialWrapper.fixture";

describe("ConfidentialERC20Wrapper - Wrap Functionality", function () {
  before(async function () {
    await initSigners();
    this.signers = await getSigners();
  });

  beforeEach(async function () {
    const { contract, erc20 } = await deployEncryptedERC20Fixture();
    this.wrapperContract = contract; // The ConfidentialERC20Wrapper contract
    this.normalERC = erc20; // The base ERC20 contract (normal ERC20)
    this.wrapperAddress = await this.wrapperContract.getAddress(); // Wrapper contract address
    this.instances = await createInstances(this.signers); // Create encryption instances for signers
  });

  it("should successfully wrap tokens and allow transfer", async function () {
    const wrapAmount = 100;

    // Set allowance for wrapping
    const allowanceTx = await this.normalERC.connect(this.signers.alice).approve(this.wrapperAddress, wrapAmount); // Correct reference to wrapper address
    await allowanceTx.wait();

    // Verify the allowance is set correctly
    const allowance = await this.normalERC.allowance(this.signers.alice.address, this.wrapperAddress); // Correct reference
    expect(allowance).to.equal(wrapAmount);

    // Call wrap function on the wrapper contract
    const wrapTx = await this.wrapperContract.connect(this.signers.alice).wrap(wrapAmount);
    await wrapTx.wait();

    const balance = await this.normalERC.balanceOf(this.signers.alice.address);
    expect(balance).to.equal(900);

    // Proceed with encrypted transfer logic
    const input = this.instances.alice.createEncryptedInput(this.wrapperAddress, this.signers.alice.address);
    input.add64(50);
    const encryptedTransferAmount = input.encrypt();

    const transferTx = await this.wrapperContract["transfer(address,bytes32,bytes)"](
      this.signers.bob.address, // Correct Bob's address
      encryptedTransferAmount.handles[0],
      encryptedTransferAmount.inputProof,
    );
    await transferTx.wait();

    // Reencrypt Alice's balance in the wrapper contract
    const balanceHandleAlice = await this.wrapperContract.balanceOf(this.signers.alice.address);
    const { publicKey: publicKeyAlice, privateKey: privateKeyAlice } = this.instances.alice.generateKeypair();

    const eip712 = this.instances.alice.createEIP712(publicKeyAlice, this.wrapperAddress);
    const signatureAlice = await this.signers.alice.signTypedData(
      eip712.domain,
      { Reencrypt: eip712.types.Reencrypt },
      eip712.message,
    );
    const balanceAlice = await this.instances.alice.reencrypt(
      balanceHandleAlice,
      privateKeyAlice,
      publicKeyAlice,
      signatureAlice.replace("0x", ""),
      this.wrapperAddress,
      this.signers.alice.address,
    );

    expect(balanceAlice).to.equal(50);
  });

  it("should successfully unwrap tokens", async function () {
    const wrapAmount = 100;

    // Set allowance for wrapping
    const allowanceTx = await this.normalERC.connect(this.signers.alice).approve(this.wrapperAddress, wrapAmount); // Correct reference to wrapper address
    await allowanceTx.wait();

    // Verify the allowance is set correctly
    const allowance = await this.normalERC.allowance(this.signers.alice.address, this.wrapperAddress); // Correct reference
    expect(allowance).to.equal(wrapAmount);

    // Call wrap function on the wrapper contract
    const wrapTx = await this.wrapperContract.connect(this.signers.alice).wrap(wrapAmount);
    await wrapTx.wait();

    const balance = await this.normalERC.balanceOf(this.signers.alice.address);
    expect(balance).to.equal(900);

    // Proceed with encrypted transfer logic
    const input = this.instances.alice.createEncryptedInput(this.wrapperAddress, this.signers.alice.address);
    input.add64(50);
    const encryptedTransferAmount = input.encrypt();

    const transferTx = await this.wrapperContract["transfer(address,bytes32,bytes)"](
      this.signers.bob.address, // Correct Bob's address
      encryptedTransferAmount.handles[0],
      encryptedTransferAmount.inputProof,
    );
    await transferTx.wait();
    // ---------------- Unwrap---------------------
    const unwrapTrx = await this.wrapperContract.connect(this.signers.alice).unwrap(20);
    await unwrapTrx.wait();
    const decrypt = await awaitAllDecryptionResults();
    await decrypt;
    console.log(decrypt);
    const newbalance = await this.normalERC.balanceOf(this.signers.alice.address);
    expect(newbalance).to.equal(920);
  });
});
