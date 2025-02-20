import chai, { expect } from 'chai'
import { artifacts, waffle, ethers } from 'hardhat'
import type { Artifact } from 'hardhat/types'
const { Contract, constants } = ethers
import type { Contract as ContractType, constants as constantsType } from 'ethers'
const { solidity, createFixtureLoader, deployContract } = waffle
import { MockProvider } from 'ethereum-waffle'
import type { MockProvider as MockProviderType } from 'ethereum-waffle'

import UniswapV2Factory from '@uniswap/v2-core/build/UniswapV2Factory.json'
//import FeeToSetter from '../../build/FeeToSetter.json'

import { governanceFixture } from '../fixtures'
import { mineBlock } from '../utils'

chai.use(solidity)

describe('scenario:FeeToSetter', () => {
  const provider = waffle.provider
  const [wallet, other] = provider.getWallets()
  const loadFixture = createFixtureLoader([wallet], provider)

  beforeEach(async () => {
    // @ts-ignore
    await loadFixture(governanceFixture)
  })

  let factory: ContractType
  beforeEach('deploy uniswap v2', async () => {
    // @ts-ignore
    factory = await deployContract(wallet, UniswapV2Factory, [wallet.address])
  })

  let feeToSetter: ContractType
  let vestingEnd: number
  beforeEach('deploy feeToSetter vesting contract', async () => {
    const { timestamp: now } = await provider.getBlock('latest')
    vestingEnd = now + 60
    // 3rd constructor arg should be timelock, just mocking for testing purposes
    // 4th constructor arg should be feeTo, just mocking for testing purposes
    const FeeToSetter: Artifact = await artifacts.readArtifact("FeeToSetter");
    // @ts-ignore
    feeToSetter = await deployContract(wallet, FeeToSetter, [
      factory.address,
      vestingEnd,
      wallet.address,
      other.address,
    ])

    // set feeToSetter to be the vesting contract
    await factory.setFeeToSetter(feeToSetter.address)
  })

  it('setOwner:fail', async () => {
    // @ts-ignore
    await expect(feeToSetter.connect(other).setOwner(other.address)).to.be.revertedWith(
      'FeeToSetter::setOwner: not allowed'
    )
  })

  it('setOwner', async () => {
    await feeToSetter.setOwner(other.address)
  })

  it('setFeeToSetter:fail', async () => {
    await expect(feeToSetter.setFeeToSetter(other.address)).to.be.revertedWith(
      'FeeToSetter::setFeeToSetter: not time yet'
    )
    // @ts-ignore
    await mineBlock(provider, vestingEnd)
    // @ts-ignore
    await expect(feeToSetter.connect(other).setFeeToSetter(other.address)).to.be.revertedWith(
      'FeeToSetter::setFeeToSetter: not allowed'
    )
  })

  it('setFeeToSetter', async () => {
    // @ts-ignore
    await mineBlock(provider, vestingEnd)
    await feeToSetter.setFeeToSetter(other.address)
  })

  it('toggleFees:fail', async () => {
    await expect(feeToSetter.toggleFees(true)).to.be.revertedWith('FeeToSetter::toggleFees: not time yet')
    // @ts-ignore
    await mineBlock(provider, vestingEnd)
    // @ts-ignore
    await expect(feeToSetter.connect(other).toggleFees(true)).to.be.revertedWith('FeeToSetter::toggleFees: not allowed')
  })

  it('toggleFees', async () => {
    let feeTo = await factory.feeTo()
    expect(feeTo).to.be.eq(constants.AddressZero)

    // @ts-ignore
    await mineBlock(provider, vestingEnd)

    await feeToSetter.toggleFees(true)
    feeTo = await factory.feeTo()
    expect(feeTo).to.be.eq(other.address)

    await feeToSetter.toggleFees(false)
    feeTo = await factory.feeTo()
    expect(feeTo).to.be.eq(constants.AddressZero)
  })
})
