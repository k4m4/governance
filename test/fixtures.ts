import { artifacts, ethers, waffle } from 'hardhat'
import chai, { expect } from 'chai'
const { Contract, Wallet, providers } = ethers
import type { Contract as ContractType, Wallet as WalletType, providers as providersType } from 'ethers'
const { solidity, deployContract } = waffle
import type { Artifact } from 'hardhat/types'

//import Uni from '../build/Uni.json'
//import Timelock from '../build/Timelock.json'
//import GovernorAlpha from '../build/GovernorAlpha.json'

import { DELAY } from './utils'

chai.use(solidity)

interface GovernanceFixture {
  uni: ContractType
  timelock: ContractType
  governorAlpha: ContractType
}

export async function governanceFixture(
  [wallet]: WalletType[],
  provider: providersType.Web3Provider
): Promise<GovernanceFixture> {
  // deploy UNI, sending the total supply to the deployer
  const { timestamp: now } = await provider.getBlock('latest')
  const timelockAddress = Contract.getContractAddress({ from: wallet.address, nonce: 1 })
  const Uni: Artifact = await artifacts.readArtifact("Uni");
  const uni = await deployContract(wallet, Uni, [wallet.address, timelockAddress, now + 60 * 60])

  // deploy timelock, controlled by what will be the governor
  const governorAlphaAddress = Contract.getContractAddress({ from: wallet.address, nonce: 2 })
  const Timelock: Artifact = await artifacts.readArtifact("Timelock");
  const timelock = await deployContract(wallet, Timelock, [governorAlphaAddress, DELAY])
  //expect(timelock.address).to.be.eq(timelockAddress)

  // deploy governorAlpha
  const GovernorAlpha: Artifact = await artifacts.readArtifact("GovernorAlpha");
  const governorAlpha = await deployContract(wallet, GovernorAlpha, [timelock.address, uni.address])
  //expect(governorAlpha.address).to.be.eq(governorAlphaAddress)

  return { uni, timelock, governorAlpha }
}
