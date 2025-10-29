import { Request, Response, NextFunction } from 'express';
import { NFTService } from '../services/nft.service';
import { logger } from '../utils/logger';

export class NFTController {
  private nftService: NFTService;

  constructor() {
    this.nftService = new NFTService();
  }

  mint = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { contentId, metadataURI, royaltyPercentage, price } = req.body;
      const creatorAddress = req.user?.address;

      if (!creatorAddress) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const result = await this.nftService.mintNFT({
        creatorAddress,
        contentId,
        metadataURI,
        royaltyPercentage,
        price,
      });

      logger.info(`NFT minted: ${result.tokenId}`);
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  };

  batchMint = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { nfts } = req.body;
      const creatorAddress = req.user?.address;

      if (!creatorAddress) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const results = await this.nftService.batchMintNFTs(creatorAddress, nfts);

      res.status(201).json(results);
    } catch (error) {
      next(error);
    }
  };

  getMetadata = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tokenId } = req.params;

      const metadata = await this.nftService.getNFTMetadata(tokenId);

      res.json(metadata);
    } catch (error) {
      next(error);
    }
  };

  updateMetadata = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tokenId } = req.params;
      const updates = req.body;
      const creatorAddress = req.user?.address;

      const result = await this.nftService.updateNFTMetadata(
        tokenId,
        creatorAddress!,
        updates
      );

      res.json(result);
    } catch (error) {
      next(error);
    }
  };

  getStatus = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tokenId } = req.params;

      const status = await this.nftService.getNFTStatus(tokenId);

      res.json(status);
    } catch (error) {
      next(error);
    }
  };
}
