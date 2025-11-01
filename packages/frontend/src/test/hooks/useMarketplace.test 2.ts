import { renderHook, act } from '@testing-library/react';
import { useMarketplace } from '../../hooks/useMarketplace';

// Mock API
const mockApi = {
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  delete: jest.fn(),
};

jest.mock('../../services/api', () => ({
  api: mockApi,
}));

// Mock Web3 provider
const mockProvider = {
  request: jest.fn(),
  on: jest.fn(),
  removeListener: jest.fn(),
};

Object.defineProperty(window, 'ethereum', {
  value: mockProvider,
  writable: true,
});

describe('useMarketplace Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('initializes with default state', () => {
    const { result } = renderHook(() => useMarketplace());

    expect(result.current.listings).toEqual([]);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('fetches listings successfully', async () => {
    const mockListings = [
      {
        id: '1',
        nftId: 'nft1',
        price: '1.5',
        currency: 'ETH',
        seller: { address: '0x123' },
        nft: { title: 'Test NFT 1' },
      },
      {
        id: '2',
        nftId: 'nft2',
        price: '2.0',
        currency: 'ETH',
        seller: { address: '0x456' },
        nft: { title: 'Test NFT 2' },
      },
    ];

    mockApi.get.mockResolvedValue({ data: mockListings });

    const { result } = renderHook(() => useMarketplace());

    await act(async () => {
      await result.current.fetchListings();
    });

    expect(result.current.listings).toEqual(mockListings);
    expect(result.current.isLoading).toBe(false);
    expect(mockApi.get).toHaveBeenCalledWith('/marketplace/listings');
  });

  it('handles fetch listings error', async () => {
    const errorMessage = 'Failed to fetch listings';
    mockApi.get.mockRejectedValue(new Error(errorMessage));

    const { result } = renderHook(() => useMarketplace());

    await act(async () => {
      await result.current.fetchListings();
    });

    expect(result.current.listings).toEqual([]);
    expect(result.current.error).toBe(errorMessage);
    expect(result.current.isLoading).toBe(false);
  });

  it('creates listing successfully', async () => {
    const newListing = {
      id: '3',
      nftId: 'nft3',
      price: '3.0',
      currency: 'ETH',
      seller: { address: '0x789' },
      nft: { title: 'New NFT' },
    };

    mockApi.post.mockResolvedValue({ data: newListing });

    const { result } = renderHook(() => useMarketplace());

    await act(async () => {
      await result.current.createListing({
        nftId: 'nft3',
        price: '3.0',
        currency: 'ETH',
      });
    });

    expect(mockApi.post).toHaveBeenCalledWith('/marketplace/listings', {
      nftId: 'nft3',
      price: '3.0',
      currency: 'ETH',
    });
  });

  it('handles create listing error', async () => {
    const errorMessage = 'Failed to create listing';
    mockApi.post.mockRejectedValue(new Error(errorMessage));

    const { result } = renderHook(() => useMarketplace());

    await act(async () => {
      try {
        await result.current.createListing({
          nftId: 'nft3',
          price: '3.0',
          currency: 'ETH',
        });
      } catch (error) {
        // Expected to throw
      }
    });

    expect(result.current.error).toBe(errorMessage);
  });

  it('purchases NFT successfully', async () => {
    const purchaseResult = {
      success: true,
      transactionHash: '0xabc123',
      blockNumber: 12345,
    };

    mockApi.post.mockResolvedValue({ data: purchaseResult });
    mockProvider.request.mockResolvedValue('0xabc123');

    const { result } = renderHook(() => useMarketplace());

    await act(async () => {
      await result.current.purchaseNFT('listing1');
    });

    expect(mockApi.post).toHaveBeenCalledWith('/marketplace/listings/listing1/purchase');
  });

  it('handles purchase NFT error', async () => {
    const errorMessage = 'Purchase failed';
    mockApi.post.mockRejectedValue(new Error(errorMessage));

    const { result } = renderHook(() => useMarketplace());

    await act(async () => {
      try {
        await result.current.purchaseNFT('listing1');
      } catch (error) {
        // Expected to throw
      }
    });

    expect(result.current.error).toBe(errorMessage);
  });

  it('cancels listing successfully', async () => {
    mockApi.delete.mockResolvedValue({ data: { success: true } });

    const { result } = renderHook(() => useMarketplace());

    await act(async () => {
      await result.current.cancelListing('listing1');
    });

    expect(mockApi.delete).toHaveBeenCalledWith('/marketplace/listings/listing1');
  });

  it('updates listing price successfully', async () => {
    const updatedListing = {
      id: '1',
      nftId: 'nft1',
      price: '2.5',
      currency: 'ETH',
    };

    mockApi.put.mockResolvedValue({ data: updatedListing });

    const { result } = renderHook(() => useMarketplace());

    await act(async () => {
      await result.current.updateListingPrice('listing1', '2.5');
    });

    expect(mockApi.put).toHaveBeenCalledWith('/marketplace/listings/listing1/price', {
      price: '2.5',
    });
  });

  it('searches listings successfully', async () => {
    const searchResults = [
      {
        id: '1',
        nftId: 'nft1',
        price: '1.5',
        currency: 'ETH',
        nft: { title: 'Searchable NFT' },
      },
    ];

    mockApi.get.mockResolvedValue({ data: searchResults });

    const { result } = renderHook(() => useMarketplace());

    await act(async () => {
      await result.current.searchListings('Searchable');
    });

    expect(result.current.listings).toEqual(searchResults);
    expect(mockApi.get).toHaveBeenCalledWith('/marketplace/search', {
      params: { query: 'Searchable' },
    });
  });

  it('filters listings by price range', async () => {
    const filteredResults = [
      {
        id: '1',
        nftId: 'nft1',
        price: '1.5',
        currency: 'ETH',
      },
    ];

    mockApi.get.mockResolvedValue({ data: filteredResults });

    const { result } = renderHook(() => useMarketplace());

    await act(async () => {
      await result.current.filterListings({
        minPrice: '1.0',
        maxPrice: '2.0',
      });
    });

    expect(mockApi.get).toHaveBeenCalledWith('/marketplace/listings', {
      params: {
        minPrice: '1.0',
        maxPrice: '2.0',
      },
    });
  });

  it('gets market statistics', async () => {
    const mockStats = {
      totalListings: 100,
      totalVolume: '1000.5',
      averagePrice: '5.2',
      topCollections: [],
    };

    mockApi.get.mockResolvedValue({ data: mockStats });

    const { result } = renderHook(() => useMarketplace());

    await act(async () => {
      const stats = await result.current.getMarketStats();
      expect(stats).toEqual(mockStats);
    });

    expect(mockApi.get).toHaveBeenCalledWith('/marketplace/stats');
  });

  it('handles loading states correctly', async () => {
    let resolvePromise: (value: any) => void;
    const promise = new Promise((resolve) => {
      resolvePromise = resolve;
    });

    mockApi.get.mockReturnValue(promise);

    const { result } = renderHook(() => useMarketplace());

    act(() => {
      result.current.fetchListings();
    });

    expect(result.current.isLoading).toBe(true);

    await act(async () => {
      resolvePromise({ data: [] });
      await promise;
    });

    expect(result.current.isLoading).toBe(false);
  });

  it('clears error when new operation starts', async () => {
    // First, set an error
    mockApi.get.mockRejectedValue(new Error('Initial error'));

    const { result } = renderHook(() => useMarketplace());

    await act(async () => {
      await result.current.fetchListings();
    });

    expect(result.current.error).toBe('Initial error');

    // Then, start a new successful operation
    mockApi.get.mockResolvedValue({ data: [] });

    await act(async () => {
      await result.current.fetchListings();
    });

    expect(result.current.error).toBeNull();
  });

  it('handles concurrent requests correctly', async () => {
    const mockListings1 = [{ id: '1', nftId: 'nft1' }];
    const mockListings2 = [{ id: '2', nftId: 'nft2' }];

    mockApi.get
      .mockResolvedValueOnce({ data: mockListings1 })
      .mockResolvedValueOnce({ data: mockListings2 });

    const { result } = renderHook(() => useMarketplace());

    await act(async () => {
      // Start two concurrent requests
      const promise1 = result.current.fetchListings();
      const promise2 = result.current.searchListings('test');

      await Promise.all([promise1, promise2]);
    });

    // Should have the results from the search (last operation)
    expect(result.current.listings).toEqual(mockListings2);
  });
});