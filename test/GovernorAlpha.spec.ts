import chai, { expect } from 'chai'
import { ethers, waffle } from 'hardhat'
const { Contract, constants } = ethers
import type { Wallet as WalletType, Contract as ContractType, constants as constantsType } from 'ethers'
const { loadFixture, solidity, createFixtureLoader } = waffle
import { MockProvider } from 'ethereum-waffle'
import type { MockProvider as MockProviderType } from 'ethereum-waffle'

export type Fixture<T> = (wallets: WalletType[], provider: MockProviderType) => Promise<T>;

import { governanceFixture } from './fixtures'
import { DELAY } from './utils'

chai.use(solidity)

describe('GovernorAlpha', () => {
  const provider = waffle.provider
  const [wallet] = provider.getWallets()
  const loadFixture = createFixtureLoader([wallet], provider)

  let uni: ContractType
  let timelock: ContractType
  let governorAlpha: ContractType
  beforeEach(async () => {
    // @ts-ignore
    const fixture = await loadFixture(governanceFixture as Fixture<GovernanceFixture>)
    uni = fixture.uni
    timelock = fixture.timelock
    governorAlpha = fixture.governorAlpha
  })

  it('uni', async () => {
    const balance = await uni.balanceOf(wallet.address)
    const totalSupply = await uni.totalSupply()
    expect(balance).to.be.eq(totalSupply)
  })

  it('timelock', async () => {
    const admin = await timelock.admin()
    expect(admin).to.be.eq(governorAlpha.address)
    const pendingAdmin = await timelock.pendingAdmin()
    expect(pendingAdmin).to.be.eq(constants.AddressZero)
    const delay = await timelock.delay()
    expect(delay).to.be.eq(DELAY)
  })

  it('governor', async () => {
    const votingPeriod = await governorAlpha.votingPeriod()
    expect(votingPeriod).to.be.eq(40320)
    const timelockAddress = await governorAlpha.timelock()
    expect(timelockAddress).to.be.eq(timelock.address)
    const uniFromGovernor = await governorAlpha.uni()
    expect(uniFromGovernor).to.be.eq(uni.address)
  })
})
