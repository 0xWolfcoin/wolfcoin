import { expect } from "chai"
import { ethers } from "hardhat"
import { BigNumber } from 'ethers'
import { Wolfcoin } from "../typechain"
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers"

describe("Airdrop claim", function () {
  // A common pattern is to declare some variables, and assign them in the
  // `before` and `beforeEach` callbacks.
  let wolfcoin: Wolfcoin
  let owner: SignerWithAddress
  let addr1: SignerWithAddress
  
  // `beforeEach` will run before each test, re-deploying the contract every
  // time. It receives a callback, which can be async.
  beforeEach(async function () {
    // Get the ContractFactory and Signers here.
    const WolfcoinContractFactory = await ethers.getContractFactory("Wolfcoin");
    [owner, addr1] = await ethers.getSigners()
    // To deploy our contract, we just have to call Token.deploy() and await
    // for it to be deployed(), which happens once its transaction has been mined.
    wolfcoin = await WolfcoinContractFactory.deploy()
    await wolfcoin.deployed()
  })

  it("Should claim the 1st amount of the airdrop supply", async function () {
    const expectedAirdropAmount = BigNumber.from("2674138840000000000000000000")
    expect(await wolfcoin.callStatic.claimAirdrop()).to.equal(expectedAirdropAmount)
  })

  it("Should claim the 2nd amount of the remaining airdrop supply", async function () {
    // Owner claims 1st.
    const claimAirdropTx = await wolfcoin.connect(owner).claimAirdrop()
    await claimAirdropTx.wait()
    // Other address claims 2nd.
    const expectedAirdropAmount = BigNumber.from("2647132711854840000000000000")
    expect(await wolfcoin.connect(addr1).callStatic.claimAirdrop()).to.equal(expectedAirdropAmount)
  })

  it("Should reject the 2nd claim from the same address", async function () {
    // Owner claims 1st.
    const claim1stAirdropTx = await wolfcoin.claimAirdrop()
    await claim1stAirdropTx.wait()
    // Owner claims 2nd.
    await expect(wolfcoin.claimAirdrop()).to.be.revertedWith("Wolfcoin: Already claimed.")
  })

  it("Should reject a claim from an address with a low balance", async function () {
    // Generate random claimant.
    let newWallet = ethers.Wallet.createRandom()
    newWallet = newWallet.connect(ethers.provider)
    // Send ETH to the new wallet so it can perform a tx
    await addr1.sendTransaction({to: newWallet.address, value: ethers.utils.parseEther("0.2")})
    // Try claim
    await expect(wolfcoin.connect(newWallet).claimAirdrop()).to.be.revertedWith("Wolfcoin: Balance too low.")
  })
})

describe("Airdrop percent", function () {
  let wolfcoin: Wolfcoin

  beforeEach(async function () {
    const WolfcoinContractFactory = await ethers.getContractFactory("Wolfcoin")
    wolfcoin = await WolfcoinContractFactory.deploy()
    await wolfcoin.deployed()
  })

  it("Should be 1% for 1st claim percent", async function () {
    // 1e18 represents 1% as the starting claim percentage.
    expect(await wolfcoin.callStatic.claimRatio()).to.equal(BigNumber.from("1000000000000000000"))
  })

  it("Should be 0.9999% for 2nd claim percent", async function () {
    // Address claims 1st.
    const claimAirdropTx = await wolfcoin.claimAirdrop()
    await claimAirdropTx.wait()
    // 1e18 represents 1% - this is 9.999e17 
    expect(await wolfcoin.callStatic.claimRatio()).to.equal(BigNumber.from("999900000000000000"))
  })
})

describe("Airdrop supply", function () {
  const aggregateSupply = BigNumber.from("1337069420000000000000000000000")
  const marketSupply = BigNumber.from("1069655536000000000000000000000")
  const startingAirdropSupply = aggregateSupply.sub(marketSupply)
  let wolfcoin: Wolfcoin
  let owner: SignerWithAddress
  let addr1: SignerWithAddress

  beforeEach(async function () {
    const WolfcoinContractFactory = await ethers.getContractFactory("Wolfcoin");
    [owner, addr1] = await ethers.getSigners()
    wolfcoin = await WolfcoinContractFactory.deploy()
    await wolfcoin.deployed()
  })

  it("Should contain initial airdrop supply", async function () {
    expect(await wolfcoin.airdropSupply()).to.equal(startingAirdropSupply)
  })

  it("Should contain 1st claim less of the total supply", async function () {
    // Claim the 1st airdrop.
    const claimAirdropTx = await wolfcoin.claimAirdrop()
    await claimAirdropTx.wait()
    // Check airdrop supply after 1st claim.
    const expectedSupplyAmount = BigNumber.from("264739745160000000000000000000")
    expect(await wolfcoin.airdropSupply()).to.equal(expectedSupplyAmount)
  })

  it("Should contain 2nd claim less of the remaining supply", async function () {
    // Owner claims 1st.
    const claim1stAirdropTx = await wolfcoin.connect(owner).claimAirdrop()
    await claim1stAirdropTx.wait()
    // Other address claims 2nd.
    const claim2ndAirdropTx = await wolfcoin.connect(addr1).claimAirdrop()
    await claim2ndAirdropTx.wait()
    // Check airdrop supply after 2nd claim.
    const expectedSupplyAmount = BigNumber.from("262092612448145160000000000000")
    expect(await wolfcoin.callStatic.airdropSupply()).to.equal(expectedSupplyAmount)
  })
})

describe("Airdrop simulation", function () { 
  let wolfcoin: Wolfcoin
  let owner: SignerWithAddress
  let addr1: SignerWithAddress

  beforeEach(async function () {
    const WolfcoinContractFactory = await ethers.getContractFactory("Wolfcoin");
    [owner, addr1] = await ethers.getSigners()
    wolfcoin = await WolfcoinContractFactory.deploy()
    await wolfcoin.deployed()
  })

  it("Should have the expected claim ratio and airdrop supply for the 10th claim", async function () { 
    // Simulate 9 airdrop claims.
    for (let i=0; i<9; i++) {
      // Generate random claimant.
      let newWallet = ethers.Wallet.createRandom()
      newWallet = newWallet.connect(ethers.provider)
      // Send ETH to the new wallet so it can perform a tx
      await addr1.sendTransaction({to: newWallet.address, value: ethers.utils.parseEther("0.4")})
      // Claim
      await wolfcoin.connect(newWallet).claimAirdrop()
    }
    
    // Claim ratio is updated within the 9th claim.
    const expectedClaimRatio = BigNumber.from("999100359916012600")
    expect(await wolfcoin.callStatic.claimRatio()).to.equal(expectedClaimRatio)
    // Make the 10th claim.
    const claimTx = await wolfcoin.connect(addr1).claimAirdrop()
    await claimTx.wait()
    // Supply after 10th claim.
    const expectedSupplyAmount = BigNumber.from("241855313505503851255745294976")
    expect(await wolfcoin.callStatic.airdropSupply()).to.equal(expectedSupplyAmount)
  })
  
  it("Should have the expected claim ratio and claim amount for the 100th claim", async function () { 
    // Simulate 99 airdrop claims.
    for (let i=0; i<99; i++) {
      // Generate random claimant.
      let newWallet = ethers.Wallet.createRandom()
      newWallet = newWallet.connect(ethers.provider)
      // Send ETH to the new wallet so it can perform a tx
      await addr1.sendTransaction({to: newWallet.address, value: ethers.utils.parseEther("0.4")})
      // Claim
      await wolfcoin.connect(newWallet).claimAirdrop()
    }
    
    // Claim ratio is updated within the 100th claim.
    const expectedClaimRatio = BigNumber.from("990148353526723530")
    expect(await wolfcoin.callStatic.claimRatio()).to.equal(expectedClaimRatio)
    // Make the 100th claim.
    const expectedAirdropAmount = BigNumber.from('983760986152099727526920669')
    const airdropAmount = await wolfcoin.connect(addr1).callStatic.claimAirdrop()
    expect(airdropAmount).to.equal(expectedAirdropAmount)
  })
})

