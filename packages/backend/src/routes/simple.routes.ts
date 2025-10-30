import { Router } from 'express';

const router = Router();

// Mock data for testing
const mockCreators = [
  {
    id: '1',
    walletAddress: '0x1234567890123456789012345678901234567890',
    displayName: 'Alice Creator',
    bio: 'Digital artist and NFT creator',
    avatar: 'https://via.placeholder.com/150',
    createdAt: new Date().toISOString(),
  },
  {
    id: '2',
    walletAddress: '0x0987654321098765432109876543210987654321',
    displayName: 'Bob Artist',
    bio: 'Photographer and visual storyteller',
    avatar: 'https://via.placeholder.com/150',
    createdAt: new Date().toISOString(),
  },
];

const mockNFTs = [
  {
    id: '1',
    tokenId: '1',
    title: 'Digital Sunset',
    description: 'A beautiful digital sunset artwork',
    image: 'https://via.placeholder.com/400x400',
    price: '0.5',
    creator: mockCreators[0],
    createdAt: new Date().toISOString(),
  },
  {
    id: '2',
    tokenId: '2',
    title: 'Abstract Dreams',
    description: 'An abstract representation of dreams',
    image: 'https://via.placeholder.com/400x400',
    price: '1.2',
    creator: mockCreators[1],
    createdAt: new Date().toISOString(),
  },
];

const mockContent = [
  {
    id: '1',
    title: 'Photography Tutorial',
    description: 'Learn advanced photography techniques',
    category: 'education',
    fileType: 'video',
    creator: mockCreators[1],
    createdAt: new Date().toISOString(),
  },
];

// Creators routes
router.get('/creators', (req, res) => {
  res.json({
    success: true,
    data: mockCreators,
    total: mockCreators.length,
  });
});

router.get('/creators/:address', (req, res) => {
  const { address } = req.params;
  const creator = mockCreators.find(c => c.walletAddress.toLowerCase() === address.toLowerCase());
  
  if (!creator) {
    return res.status(404).json({ error: 'Creator not found' });
  }
  
  res.json({
    success: true,
    data: creator,
  });
});

router.post('/creators/register', (req, res) => {
  const { walletAddress, displayName, bio } = req.body;
  
  if (!walletAddress) {
    return res.status(400).json({ error: 'Wallet address is required' });
  }
  
  const newCreator = {
    id: String(mockCreators.length + 1),
    walletAddress,
    displayName: displayName || 'Anonymous Creator',
    bio: bio || '',
    avatar: 'https://via.placeholder.com/150',
    createdAt: new Date().toISOString(),
  };
  
  mockCreators.push(newCreator);
  
  res.status(201).json({
    success: true,
    data: newCreator,
  });
});

// NFTs routes
router.get('/nfts', (req, res) => {
  const { page = 1, limit = 10, sortBy = 'newest' } = req.query;
  
  let sortedNFTs = [...mockNFTs];
  
  if (sortBy === 'price_low') {
    sortedNFTs.sort((a, b) => parseFloat(a.price) - parseFloat(b.price));
  } else if (sortBy === 'price_high') {
    sortedNFTs.sort((a, b) => parseFloat(b.price) - parseFloat(a.price));
  }
  
  const startIndex = (Number(page) - 1) * Number(limit);
  const endIndex = startIndex + Number(limit);
  const paginatedNFTs = sortedNFTs.slice(startIndex, endIndex);
  
  res.json({
    success: true,
    data: paginatedNFTs,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total: mockNFTs.length,
      totalPages: Math.ceil(mockNFTs.length / Number(limit)),
    },
  });
});

router.get('/nfts/:tokenId', (req, res) => {
  const { tokenId } = req.params;
  const nft = mockNFTs.find(n => n.tokenId === tokenId);
  
  if (!nft) {
    return res.status(404).json({ error: 'NFT not found' });
  }
  
  res.json({
    success: true,
    data: nft,
  });
});

// Content routes
router.get('/content', (req, res) => {
  res.json({
    success: true,
    data: mockContent,
    total: mockContent.length,
  });
});

router.post('/content/upload', (req, res) => {
  const { title, description, category } = req.body;
  
  if (!title) {
    return res.status(400).json({ error: 'Title is required' });
  }
  
  const newContent = {
    id: String(mockContent.length + 1),
    title,
    description: description || '',
    category: category || 'other',
    fileType: 'unknown',
    creator: mockCreators[0], // Default to first creator
    createdAt: new Date().toISOString(),
  };
  
  mockContent.push(newContent);
  
  res.status(201).json({
    success: true,
    data: newContent,
  });
});

// Analytics routes
router.get('/analytics/summary', (req, res) => {
  res.json({
    success: true,
    data: {
      totalCreators: mockCreators.length,
      totalNFTs: mockNFTs.length,
      totalContent: mockContent.length,
      totalVolume: '15.7',
      averagePrice: '0.85',
    },
  });
});

// Marketplace routes
router.get('/marketplace/featured', (req, res) => {
  res.json({
    success: true,
    data: mockNFTs.slice(0, 3),
  });
});

// Staking routes
router.get('/staking/stats', (req, res) => {
  res.json({
    success: true,
    data: {
      totalStaked: '1000000',
      apy: '12.5',
      userStaked: '0',
      rewards: '0',
    },
  });
});

// Governance routes
router.get('/governance/proposals', (req, res) => {
  res.json({
    success: true,
    data: [
      {
        id: '1',
        title: 'Increase Creator Royalties',
        description: 'Proposal to increase default royalty percentage',
        status: 'active',
        votes: { for: 150, against: 50 },
        createdAt: new Date().toISOString(),
      },
    ],
  });
});

export default router;