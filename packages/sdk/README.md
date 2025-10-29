# @knowton/sdk

KnowTon Platform JavaScript/TypeScript SDK

## 安装

```bash
npm install @knowton/sdk
# or
yarn add @knowton/sdk
```

## 使用

```typescript
import { KnowTonSDK } from '@knowton/sdk';

// 初始化 SDK
const sdk = new KnowTonSDK({
  rpcUrl: 'https://arb1.arbitrum.io/rpc',
  contractAddress: '0x...',
  apiUrl: 'https://api.knowton.io',
});

// 连接钱包
await sdk.connect(window.ethereum);

// 铸造 NFT
const tx = await sdk.mintNFT({
  contentHash: 'QmHash...',
  metadataURI: 'ipfs://...',
  category: 'music',
  royalty: {
    recipients: ['0x...'],
    percentages: [1000], // 10%
  },
});

// 碎片化 NFT
await sdk.fractionalizeNFT(tokenId, {
  supply: 1000000,
  name: 'Fractional Token',
  symbol: 'FT',
});

// 查询 NFT 信息
const nft = await sdk.getNFT(tokenId);
```

## API 文档

详见 [API Documentation](./docs/api.md)
