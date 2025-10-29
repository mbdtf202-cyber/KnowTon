import { ethers } from 'ethers';
import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

interface FractionalizeInput {
  nftContract: string;
  tokenId: string;
  owner: string;
  totalSupply: string;
  name: string;
  symbol: string;
  reservePrice: string;
}

export class FractionalizationService {
  private provider: ethers.JsonRpcProvider;
  private wallet: ethers.Wallet;
  private vaultContract: ethers.Contract;

  constructor() {
    this.provider = new ethers.JsonRpcProvider(
      process.env.ARBITRUM_RPC_URL || 'https://arb1.arbitrum.io/rpc'
    );

    this.wallet = new ethers.Wallet(process.env.PRIVATE_KEY || '', this.provider);

    const contractAddress = process.env.FRACTIONALIZATION_VAULT_ADDRESS || '';
    const abi = [
      'function fractionalize(address nftContract, uint256 tokenId, uint256 totalSupply, string name, string symbol, uint256 reservePrice) external returns (uint256)',
      'function getVaultInfo(uint256 vaultId) external view returns (address nftContract, uint256 tokenId, address curator, uint256 totalSupply, uint256 reservePrice, bool redeemed)',
      'function buyout(uint256 vaultId) external payable',
      'function redeem(uint256 vaultId, uint256 amount) external',
      'function updateReservePrice(uint256 vaultId, uint256 newPrice) external',
      'event Fractionalized(uint256 indexed vaultId, address indexed nftContract, uint256 indexed tokenId, uint256 totalSupply)',
      'event Buyout(uint256 indexed vaultId, address indexed buyer, uint256 price)',
      'event Redeemed(uint256 indexed vaultId, address indexed redeemer, uint256 amount)',
    ];

    this.vaultContract = new ethers.Contract(contractAddress, abi, this.wallet);
  }

  async fractionalize(input: FractionalizeInput) {
    const { nftContract, tokenId, owner, totalSupply, name, symbol, reservePrice } = input;

    try {
      // Verify NFT ownership
      const nftAbi = ['function ownerOf(uint256 tokenId) external view returns (address)'];
      const nft = new ethers.Contract(nftContract, nftAbi, this.provider);
      const nftOwner = await nft.ownerOf(tokenId);

      if (nftOwner.toLowerCase() !== owner.toLowerCase()) {
        throw new Error('Not NFT owner');
      }

      // Call fractionalize
      const tx = await this.vaultContract.fractionalize(
        nftContract,
        tokenId,
        totalSupply,
        name,
        symbol,
        reservePrice,
        {
          gasLimit: 1000000,
        }
      );

      logger.info(`Fractionalization tx submitted: ${tx.hash}`);

      const receipt = await tx.wait();

      // Extract vaultId from event
      const event = receipt.logs.find((log: any) => {
        try {
          const parsed = this.vaultContract.interface.parseLog(log);
          return parsed?.name === 'Fractionalized';
        } catch {
          return false;
        }
      });

      const vaultId = event ? ethers.toNumber(event.topics[1]) : null;

      if (!vaultId) {
        throw new Error('Failed to extract vaultId');
      }

      // Store in database
      await prisma.fractionalVault.create({
        data: {
          vaultId: vaultId.toString(),
          nftContract,
          tokenId,
          curator: owner,
          totalSupply,
          name,
          symbol,
          reservePrice,
          status: 'active',
          txHash: receipt.hash,
          createdAt: new Date(),
        },
      });

      logger.info(`Fractionalization completed: vaultId=${vaultId}, tx=${receipt.hash}`);

      return {
        vaultId,
        txHash: receipt.hash,
        totalSupply,
        name,
        symbol,
      };
    } catch (error) {
      logger.error('Error fractionalizing NFT:', error);
      throw error;
    }
  }

  async getVaultInfo(vaultId: string) {
    try {
      const onChainInfo = await this.vaultContract.getVaultInfo(vaultId);

      const dbVault = await prisma.fractionalVault.findUnique({
        where: { vaultId },
      });

      return {
        vaultId,
        nftContract: onChainInfo.nftContract,
        tokenId: onChainInfo.tokenId.toString(),
        curator: onChainInfo.curator,
        totalSupply: onChainInfo.totalSupply.toString(),
        reservePrice: onChainInfo.reservePrice.toString(),
        redeemed: onChainInfo.redeemed,
        name: dbVault?.name,
        symbol: dbVault?.symbol,
        status: dbVault?.status,
        createdAt: dbVault?.createdAt,
      };
    } catch (error) {
      logger.error(`Error getting vault info for vaultId=${vaultId}:`, error);
      throw error;
    }
  }

  async buyout(vaultId: string, buyer: string, price: string) {
    try {
      const tx = await this.vaultContract.buyout(vaultId, {
        value: price,
        gasLimit: 500000,
      });

      await tx.wait();

      await prisma.fractionalVault.update({
        where: { vaultId },
        data: {
          status: 'bought_out',
          updatedAt: new Date(),
        },
      });

      logger.info(`Buyout completed: vaultId=${vaultId}, buyer=${buyer}, tx=${tx.hash}`);

      return {
        txHash: tx.hash,
        vaultId,
        buyer,
        price,
      };
    } catch (error) {
      logger.error(`Error buying out vault ${vaultId}:`, error);
      throw error;
    }
  }

  async redeem(vaultId: string, redeemer: string, amount: string) {
    try {
      const tx = await this.vaultContract.redeem(vaultId, amount, {
        gasLimit: 500000,
      });

      await tx.wait();

      logger.info(`Redemption completed: vaultId=${vaultId}, redeemer=${redeemer}, amount=${amount}, tx=${tx.hash}`);

      return {
        txHash: tx.hash,
        vaultId,
        redeemer,
        amount,
      };
    } catch (error) {
      logger.error(`Error redeeming from vault ${vaultId}:`, error);
      throw error;
    }
  }

  async updateReservePrice(vaultId: string, curator: string, newPrice: string) {
    try {
      const vault = await prisma.fractionalVault.findUnique({
        where: { vaultId },
      });

      if (!vault) {
        throw new Error('Vault not found');
      }

      if (vault.curator.toLowerCase() !== curator.toLowerCase()) {
        throw new Error('Not curator');
      }

      const tx = await this.vaultContract.updateReservePrice(vaultId, newPrice, {
        gasLimit: 200000,
      });

      await tx.wait();

      await prisma.fractionalVault.update({
        where: { vaultId },
        data: {
          reservePrice: newPrice,
          updatedAt: new Date(),
        },
      });

      logger.info(`Reserve price updated: vaultId=${vaultId}, newPrice=${newPrice}, tx=${tx.hash}`);

      return {
        txHash: tx.hash,
        vaultId,
        newPrice,
      };
    } catch (error) {
      logger.error(`Error updating reserve price for vault ${vaultId}:`, error);
      throw error;
    }
  }

  async getUserVaults(address: string) {
    return await prisma.fractionalVault.findMany({
      where: { curator: address },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getAllVaults(limit: number = 50, offset: number = 0) {
    const vaults = await prisma.fractionalVault.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    });

    const total = await prisma.fractionalVault.count();

    return {
      vaults,
      total,
      limit,
      offset,
    };
  }
}
