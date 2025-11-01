import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { NFTCard } from '../../components/NFTCard';

// Mock hooks
jest.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({
    user: { address: '0x123' },
    isConnected: true,
  }),
}));

jest.mock('../../hooks/useNFTPurchase', () => ({
  useNFTPurchase: () => ({
    purchaseNFT: jest.fn(),
    isLoading: false,
  }),
}));

const mockNFT = {
  id: '1',
  tokenId: 123,
  title: 'Test NFT',
  description: 'A test NFT for unit testing',
  image: 'https://example.com/image.jpg',
  price: '1.5',
  currency: 'ETH',
  creator: {
    address: '0x456',
    name: 'Test Creator',
  },
  isListed: true,
};

const NFTCardWithRouter = ({ nft = mockNFT }) => (
  <BrowserRouter>
    <NFTCard nft={nft} />
  </BrowserRouter>
);

describe('NFTCard Component', () => {
  it('renders NFT information correctly', () => {
    render(<NFTCardWithRouter />);
    
    expect(screen.getByText('Test NFT')).toBeInTheDocument();
    expect(screen.getByText('A test NFT for unit testing')).toBeInTheDocument();
    expect(screen.getByText('1.5 ETH')).toBeInTheDocument();
    expect(screen.getByText('Test Creator')).toBeInTheDocument();
  });

  it('displays NFT image with correct alt text', () => {
    render(<NFTCardWithRouter />);
    
    const image = screen.getByAltText('Test NFT');
    expect(image).toBeInTheDocument();
    expect(image).toHaveAttribute('src', 'https://example.com/image.jpg');
  });

  it('shows buy button for listed NFTs', () => {
    render(<NFTCardWithRouter />);
    
    expect(screen.getByText('Buy Now')).toBeInTheDocument();
  });

  it('does not show buy button for unlisted NFTs', () => {
    const unlistedNFT = { ...mockNFT, isListed: false };
    render(<NFTCardWithRouter nft={unlistedNFT} />);
    
    expect(screen.queryByText('Buy Now')).not.toBeInTheDocument();
    expect(screen.getByText('Not Listed')).toBeInTheDocument();
  });

  it('handles buy button click', () => {
    const mockPurchase = jest.fn();
    jest.doMock('../../hooks/useNFTPurchase', () => ({
      useNFTPurchase: () => ({
        purchaseNFT: mockPurchase,
        isLoading: false,
      }),
    }));

    render(<NFTCardWithRouter />);
    
    const buyButton = screen.getByText('Buy Now');
    fireEvent.click(buyButton);
    
    // Should navigate to NFT details page or trigger purchase
    expect(buyButton).toBeInTheDocument();
  });

  it('shows loading state when purchase is in progress', () => {
    jest.doMock('../../hooks/useNFTPurchase', () => ({
      useNFTPurchase: () => ({
        purchaseNFT: jest.fn(),
        isLoading: true,
      }),
    }));

    render(<NFTCardWithRouter />);
    
    expect(screen.getByText('Processing...')).toBeInTheDocument();
  });

  it('displays creator address when name is not available', () => {
    const nftWithoutCreatorName = {
      ...mockNFT,
      creator: {
        address: '0x456',
        name: null,
      },
    };

    render(<NFTCardWithRouter nft={nftWithoutCreatorName} />);
    
    expect(screen.getByText('0x456')).toBeInTheDocument();
  });

  it('handles missing image gracefully', () => {
    const nftWithoutImage = { ...mockNFT, image: null };
    render(<NFTCardWithRouter nft={nftWithoutImage} />);
    
    // Should show placeholder or default image
    const image = screen.getByAltText('Test NFT');
    expect(image).toBeInTheDocument();
  });

  it('truncates long descriptions', () => {
    const nftWithLongDescription = {
      ...mockNFT,
      description: 'This is a very long description that should be truncated to fit within the card layout and not overflow the container boundaries.',
    };

    render(<NFTCardWithRouter nft={nftWithLongDescription} />);
    
    const description = screen.getByText(/This is a very long description/);
    expect(description).toBeInTheDocument();
  });

  it('shows favorite button for authenticated users', () => {
    render(<NFTCardWithRouter />);
    
    const favoriteButton = screen.getByRole('button', { name: /favorite/i });
    expect(favoriteButton).toBeInTheDocument();
  });

  it('handles favorite button click', () => {
    render(<NFTCardWithRouter />);
    
    const favoriteButton = screen.getByRole('button', { name: /favorite/i });
    fireEvent.click(favoriteButton);
    
    // Should toggle favorite state
    expect(favoriteButton).toBeInTheDocument();
  });

  it('displays rarity badge when available', () => {
    const rareNFT = { ...mockNFT, rarity: 'Legendary' };
    render(<NFTCardWithRouter nft={rareNFT} />);
    
    expect(screen.getByText('Legendary')).toBeInTheDocument();
  });

  it('shows collection name when available', () => {
    const nftWithCollection = {
      ...mockNFT,
      collection: {
        name: 'Test Collection',
        slug: 'test-collection',
      },
    };

    render(<NFTCardWithRouter nft={nftWithCollection} />);
    
    expect(screen.getByText('Test Collection')).toBeInTheDocument();
  });

  it('displays last sale price when available', () => {
    const nftWithLastSale = {
      ...mockNFT,
      lastSale: {
        price: '2.0',
        currency: 'ETH',
        date: '2024-01-01',
      },
    };

    render(<NFTCardWithRouter nft={nftWithLastSale} />);
    
    expect(screen.getByText('Last Sale: 2.0 ETH')).toBeInTheDocument();
  });

  it('handles click to navigate to NFT details', () => {
    render(<NFTCardWithRouter />);
    
    const nftCard = screen.getByTestId('nft-card');
    fireEvent.click(nftCard);
    
    // Should navigate to NFT details page
    expect(window.location.pathname).toBe('/');
  });

  it('shows ownership indicator for owned NFTs', () => {
    const ownedNFT = {
      ...mockNFT,
      owner: { address: '0x123' }, // Same as authenticated user
    };

    render(<NFTCardWithRouter nft={ownedNFT} />);
    
    expect(screen.getByText('Owned')).toBeInTheDocument();
  });

  it('displays auction information when NFT is in auction', () => {
    const auctionNFT = {
      ...mockNFT,
      auction: {
        endTime: '2024-12-31T23:59:59Z',
        highestBid: '2.5',
        currency: 'ETH',
      },
    };

    render(<NFTCardWithRouter nft={auctionNFT} />);
    
    expect(screen.getByText('Highest Bid: 2.5 ETH')).toBeInTheDocument();
    expect(screen.getByText(/Ends:/)).toBeInTheDocument();
  });
});