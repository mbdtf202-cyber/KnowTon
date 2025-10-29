import { ethers } from 'ethers';
import { CopyrightRegistryClient } from './contracts/CopyrightRegistry';
import { RoyaltyDistributorClient } from './contracts/RoyaltyDistributor';
import { FractionalizationVaultClient } from './contracts/FractionalizationVault';
import { StakingRewardsClient } from './contracts/StakingRewards';

export interface KnowTonSDKConfig {
  provider: ethers.Provider;
  signer?: ethers.Signer;
  contracts: {
    copyrightRegistry: string;
    royaltyDistributor: string;
    fractionalizationVault: string;
    stakingRewards: string;
  };
}

export class KnowTonSDK {
  public provider: ethers.Provider;
  public signer?: ethers.Signer;
  public copyrightRegistry: CopyrightRegistryClient;
  public royaltyDistributor: RoyaltyDistributorClient;
  public fractionalizationVault: FractionalizationVaultClient;
  public stakingRewards: StakingRewardsClient;

  constructor(config: KnowTonSDKConfig) {
    this.provider = config.provider;
    this.signer = config.signer;

    this.copyrightRegistry = new CopyrightRegistryClient(
      config.contracts.copyrightRegistry,
      this.provider,
      this.signer
    );

    this.royaltyDistributor = new RoyaltyDistributorClient(
      config.contracts.royaltyDistributor,
      this.provider,
      this.signer
    );

    this.fractionalizationVault = new FractionalizationVaultClient(
      config.contracts.fractionalizationVault,
      this.provider,
      this.signer
    );

    this.stakingRewards = new StakingRewardsClient(
      config.contracts.stakingRewards,
      this.provider,
      this.signer
    );
  }

  connect(signer: ethers.Signer): KnowTonSDK {
    this.signer = signer;
    this.copyrightRegistry.connect(signer);
    this.royaltyDistributor.connect(signer);
    this.fractionalizationVault.connect(signer);
    this.stakingRewards.connect(signer);
    return this;
  }
}
