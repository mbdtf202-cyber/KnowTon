import axios from 'axios';
import FormData from 'form-data';
import { logger } from './logger';

export class IPFSClient {
  private pinataApiKey: string;
  private pinataSecretKey: string;
  private pinataUrl: string;

  constructor() {
    this.pinataApiKey = process.env.PINATA_API_KEY || '';
    this.pinataSecretKey = process.env.PINATA_SECRET_KEY || '';
    this.pinataUrl = 'https://api.pinata.cloud';
  }

  async upload(buffer: Buffer, filename: string): Promise<string> {
    try {
      const formData = new FormData();
      formData.append('file', buffer, filename);

      const metadata = JSON.stringify({
        name: filename,
        keyvalues: {
          uploadedAt: new Date().toISOString(),
        },
      });
      formData.append('pinataMetadata', metadata);

      const response = await axios.post(
        `${this.pinataUrl}/pinning/pinFileToIPFS`,
        formData,
        {
          headers: {
            'Content-Type': `multipart/form-data; boundary=${formData.getBoundary()}`,
            pinata_api_key: this.pinataApiKey,
            pinata_secret_api_key: this.pinataSecretKey,
          },
          maxBodyLength: Infinity,
        }
      );

      const ipfsHash = response.data.IpfsHash;
      logger.info(`File uploaded to IPFS: ${ipfsHash}`);

      return ipfsHash;
    } catch (error) {
      logger.error('IPFS upload failed:', error);
      throw new Error('Failed to upload to IPFS');
    }
  }

  async uploadJSON(data: any): Promise<string> {
    try {
      const response = await axios.post(
        `${this.pinataUrl}/pinning/pinJSONToIPFS`,
        data,
        {
          headers: {
            'Content-Type': 'application/json',
            pinata_api_key: this.pinataApiKey,
            pinata_secret_api_key: this.pinataSecretKey,
          },
        }
      );

      const ipfsHash = response.data.IpfsHash;
      logger.info(`JSON uploaded to IPFS: ${ipfsHash}`);

      return ipfsHash;
    } catch (error) {
      logger.error('IPFS JSON upload failed:', error);
      throw new Error('Failed to upload JSON to IPFS');
    }
  }

  getGatewayUrl(ipfsHash: string): string {
    return `https://gateway.pinata.cloud/ipfs/${ipfsHash}`;
  }
}
