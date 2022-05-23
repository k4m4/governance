import chai, { expect } from 'chai'
import { artifacts, ethers, waffle } from 'hardhat'
import type { Artifact } from 'hardhat/types'
const { Contract, BigNumber } = ethers
import type { Contract as ContractType, BigNumber as BigNumberType } from 'ethers'
const { solidity, createFixtureLoader, deployContract } = waffle
import { MockProvider } from 'ethereum-waffle'

//import TreasuryVester from '../../build/TreasuryVester.json'

import { governanceFixture } from '../fixtures'
import { mineBlock, expandTo18Decimals } from '../utils'

chai.use(solidity)

describe('scenario:TreasuryVester', () => {
  const provider = waffle.provider
  const [wallet] = provider.getWallets()
  const loadFixture = createFixtureLoader([wallet], provider)

  let uni: ContractType
  let timelock: ContractType
  beforeEach(async () => {
    // @ts-ignore
    const fixture = await loadFixture(governanceFixture)
    uni = fixture.uni
    timelock = fixture.timelock
  })

  let treasuryVester: ContractType
  let vestingAmount: BigNumberType
  let vestingBegin: number
  let vestingCliff: number
  let vestingEnd: number
  beforeEach('deploy treasury vesting contract', async () => {
    const { timestamp: now } = await provider.getBlock('latest')
    vestingAmount = expandTo18Decimals(100)
    vestingBegin = now + 60
    vestingCliff = vestingBegin + 60
    vestingEnd = vestingBegin + 60 * 60 * 24 * 365
    const TreasuryVester: Artifact = await artifacts.readArtifact("TreasuryVester")
    // @ts-ignore
    treasuryVester = await deployContract(wallet, TreasuryVester, [
      uni.address,
      timelock.address,
      vestingAmount,
      vestingBegin,
      vestingCliff,
      vestingEnd,
    ])

    // fund the treasury
    await uni.transfer(treasuryVester.address, vestingAmount)
  })

  it('setRecipient:fail', async () => {
    await expect(treasuryVester.setRecipient(wallet.address)).to.be.revertedWith(
      'TreasuryVester::setRecipient: unauthorized'
    )
  })

  it('claim:fail', async () => {
    await expect(treasuryVester.claim()).to.be.revertedWith('TreasuryVester::claim: not time yet')
    // @ts-ignore
    await mineBlock(provider, vestingBegin + 1)
    await expect(treasuryVester.claim()).to.be.revertedWith('TreasuryVester::claim: not time yet')
  })

  it('claim:~half', async () => {
    // @ts-ignore
    await mineBlock(provider, vestingBegin + Math.floor((vestingEnd - vestingBegin) / 2))
    await treasuryVester.claim()
    const balance = await uni.balanceOf(timelock.address)
    expect(vestingAmount.div(2).sub(balance).abs().lte(vestingAmount.div(2).div(10000))).to.be.true
  })

  it('claim:all', async () => {
    // @ts-ignore
    await mineBlock(provider, vestingEnd)
    await treasuryVester.claim()
    const balance = await uni.balanceOf(timelock.address)
    expect(balance).to.be.eq(vestingAmount)
  })
})
