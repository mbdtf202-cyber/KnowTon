import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useAuth } from '../../hooks/useAuth';

// Mock ethers
vi.mock('ethers', () => ({
  BrowserProvider: vi.fn().mockImplementation(() => ({
    getSigner: vi.fn().mockResolvedValue({
      getAddress: vi.fn().mockResolvedValue('0x1234567890123456789012345678901234567890'),
      signMessage: vi.fn().mockResolvedValue('0xsignature'),
    }),
  })),
  verifyMessage: vi.fn().mockReturnValue('0x1234567890123456789012345678901234567890'),
}));

// Mock API service
vi.mock('../../services/api', () => ({
  api: {
    post: vi.fn(),
    get: vi.fn(),
  },
}));

describe('useAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    
    // Mock window.ethereum
    Object.defineProperty(window, 'ethereum', {
      value: {
        isMetaMask: true,
        request: vi.fn(),
        on: vi.fn(),
        removeListener: vi.fn(),
      },
      writable: true,
    });
  });

  it('initializes with default state', () => {
    const { result } = renderHook(() => useAuth());

    expect(result.current.user).toBeNull();
    expect(result.current.isConnected).toBe(false);
    expect(result.current.isLoading).toBe(false);
  });

  it('connects wallet successfully', async () => {
    // Mock successful wallet connection
    window.ethereum.request = vi.fn()
      .mockResolvedValueOnce(['0x1234567890123456789012345678901234567890']) // eth_requestAccounts
      .mockResolvedValueOnce('0x1'); // eth_chainId

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.connect();
    });

    expect(result.current.isConnected).toBe(true);
    expect(result.current.user).toBeTruthy();
    expect(result.current.user?.address).toBe('0x1234567890123456789012345678901234567890');
  });

  it('handles wallet connection rejection', async () => {
    // Mock user rejection
    window.ethereum.request = vi.fn()
      .mockRejectedValueOnce(new Error('User rejected the request'));

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      try {
        await result.current.connect();
      } catch (error) {
        // Expected to throw
      }
    });

    expect(result.current.isConnected).toBe(false);
    expect(result.current.user).toBeNull();
  });

  it('disconnects wallet', async () => {
    // First connect
    window.ethereum.request = vi.fn()
      .mockResolvedValueOnce(['0x1234567890123456789012345678901234567890'])
      .mockResolvedValueOnce('0x1');

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.connect();
    });

    expect(result.current.isConnected).toBe(true);

    // Then disconnect
    await act(async () => {
      result.current.disconnect();
    });

    expect(result.current.isConnected).toBe(false);
    expect(result.current.user).toBeNull();
  });

  it('handles account change events', async () => {
    const { result } = renderHook(() => useAuth());

    // Simulate account change event
    const accountChangeHandler = vi.fn();
    window.ethereum.on = vi.fn((event, handler) => {
      if (event === 'accountsChanged') {
        accountChangeHandler.mockImplementation(handler);
      }
    });

    // Trigger account change
    await act(async () => {
      accountChangeHandler(['0x9999999999999999999999999999999999999999']);
    });

    // Should handle the account change appropriately
    expect(window.ethereum.on).toHaveBeenCalledWith('accountsChanged', expect.any(Function));
  });

  it('handles chain change events', async () => {
    const { result } = renderHook(() => useAuth());

    const chainChangeHandler = vi.fn();
    window.ethereum.on = vi.fn((event, handler) => {
      if (event === 'chainChanged') {
        chainChangeHandler.mockImplementation(handler);
      }
    });

    // Trigger chain change
    await act(async () => {
      chainChangeHandler('0x89'); // Polygon
    });

    expect(window.ethereum.on).toHaveBeenCalledWith('chainChanged', expect.any(Function));
  });

  it('persists authentication state in localStorage', async () => {
    window.ethereum.request = vi.fn()
      .mockResolvedValueOnce(['0x1234567890123456789012345678901234567890'])
      .mockResolvedValueOnce('0x1');

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.connect();
    });

    // Check if auth state is saved to localStorage
    const savedAuth = localStorage.getItem('knowton_auth');
    expect(savedAuth).toBeTruthy();
    
    if (savedAuth) {
      const parsedAuth = JSON.parse(savedAuth);
      expect(parsedAuth.address).toBe('0x1234567890123456789012345678901234567890');
    }
  });

  it('restores authentication state from localStorage', () => {
    // Pre-populate localStorage
    const mockAuthState = {
      address: '0x1234567890123456789012345678901234567890',
      isConnected: true,
      user: {
        id: '1',
        address: '0x1234567890123456789012345678901234567890',
        username: 'testuser',
      },
    };
    localStorage.setItem('knowton_auth', JSON.stringify(mockAuthState));

    const { result } = renderHook(() => useAuth());

    expect(result.current.isConnected).toBe(true);
    expect(result.current.user?.address).toBe('0x1234567890123456789012345678901234567890');
  });
});