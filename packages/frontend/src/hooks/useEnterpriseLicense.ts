import { useState, useCallback } from 'react';
import { ethers } from 'ethers';
import { useAuth } from './useAuth';

// ABI for EnterpriseLicensing contract (minimal for frontend use)
const ENTERPRISE_LICENSING_ABI = [
  'function issueLicense(uint256 _contentId, address _enterprise, uint256 _seats, uint256 _duration) external payable returns (bytes32)',
  'function verifyLicense(bytes32 _licenseId) external view returns (bool)',
  'function renewLicense(bytes32 _licenseId, uint256 _duration) external payable',
  'function assignSeat(bytes32 _licenseId, address _user) external',
  'function revokeSeat(bytes32 _licenseId, address _user) external',
  'function trackUsage(bytes32 _licenseId, address _user) external',
  'function increaseSeats(bytes32 _licenseId, uint256 _additionalSeats) external payable',
  'function getLicense(bytes32 _licenseId) external view returns (tuple(uint256 contentId, address enterprise, uint256 seats, uint256 usedSeats, uint256 pricePerSeat, uint256 expiresAt, bool isActive, uint256 createdAt))',
  'function getEnterpriseLicenses(address _enterprise) external view returns (bytes32[])',
  'function hasSeat(bytes32 _licenseId, address _user) external view returns (bool)',
  'function getLastUsage(bytes32 _licenseId, address _user) external view returns (uint256)',
  'function getAvailableSeats(bytes32 _licenseId) external view returns (uint256)',
  'event LicenseIssued(bytes32 indexed licenseId, address indexed enterprise, uint256 contentId, uint256 seats, uint256 expiresAt, uint256 totalCost)',
  'event LicenseRenewed(bytes32 indexed licenseId, uint256 newExpiresAt, uint256 renewalCost)',
  'event SeatAssigned(bytes32 indexed licenseId, address indexed user, uint256 timestamp)',
  'event SeatRevoked(bytes32 indexed licenseId, address indexed user, uint256 timestamp)',
];

const CONTRACT_ADDRESS = process.env.REACT_APP_ENTERPRISE_LICENSING_CONTRACT || '';

interface License {
  contentId: bigint;
  enterprise: string;
  seats: bigint;
  usedSeats: bigint;
  pricePerSeat: bigint;
  expiresAt: bigint;
  isActive: boolean;
  createdAt: bigint;
}

export const useEnterpriseLicense = () => {
  const { walletAddress } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getContract = useCallback(async (needsSigner = false) => {
    if (!window.ethereum) {
      throw new Error('MetaMask is not installed');
    }

    const provider = new ethers.BrowserProvider(window.ethereum);
    
    if (needsSigner) {
      const signer = await provider.getSigner();
      return new ethers.Contract(CONTRACT_ADDRESS, ENTERPRISE_LICENSING_ABI, signer);
    }
    
    return new ethers.Contract(CONTRACT_ADDRESS, ENTERPRISE_LICENSING_ABI, provider);
  }, []);

  const issueLicense = useCallback(
    async (
      contentId: number,
      enterpriseAddress: string,
      seats: number,
      durationInDays: number,
      pricePerSeat: string
    ) => {
      try {
        setLoading(true);
        setError(null);

        const contract = await getContract(true);
        const duration = durationInDays * 24 * 60 * 60; // Convert days to seconds
        const totalCost = ethers.parseEther(pricePerSeat) * BigInt(seats);

        const tx = await contract.issueLicense(
          contentId,
          enterpriseAddress,
          seats,
          duration,
          { value: totalCost }
        );

        const receipt = await tx.wait();

        // Extract licenseId from event
        const event = receipt.logs.find((log: any) => {
          try {
            return contract.interface.parseLog(log)?.name === 'LicenseIssued';
          } catch {
            return false;
          }
        });

        if (event) {
          const parsedEvent = contract.interface.parseLog(event);
          return parsedEvent?.args[0]; // licenseId
        }

        return null;
      } catch (err: any) {
        setError(err.message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [getContract]
  );

  const verifyLicense = useCallback(
    async (licenseId: string) => {
      try {
        setLoading(true);
        setError(null);

        const contract = await getContract(false);
        const isValid = await contract.verifyLicense(licenseId);

        return isValid;
      } catch (err: any) {
        setError(err.message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [getContract]
  );

  const renewLicense = useCallback(
    async (licenseId: string, durationInDays: number, renewalCost: string) => {
      try {
        setLoading(true);
        setError(null);

        const contract = await getContract(true);
        const duration = durationInDays * 24 * 60 * 60;
        const cost = ethers.parseEther(renewalCost);

        const tx = await contract.renewLicense(licenseId, duration, { value: cost });
        await tx.wait();

        return true;
      } catch (err: any) {
        setError(err.message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [getContract]
  );

  const assignSeat = useCallback(
    async (licenseId: string, userAddress: string) => {
      try {
        setLoading(true);
        setError(null);

        const contract = await getContract(true);
        const tx = await contract.assignSeat(licenseId, userAddress);
        await tx.wait();

        return true;
      } catch (err: any) {
        setError(err.message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [getContract]
  );

  const revokeSeat = useCallback(
    async (licenseId: string, userAddress: string) => {
      try {
        setLoading(true);
        setError(null);

        const contract = await getContract(true);
        const tx = await contract.revokeSeat(licenseId, userAddress);
        await tx.wait();

        return true;
      } catch (err: any) {
        setError(err.message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [getContract]
  );

  const trackUsage = useCallback(
    async (licenseId: string, userAddress: string) => {
      try {
        setLoading(true);
        setError(null);

        const contract = await getContract(true);
        const tx = await contract.trackUsage(licenseId, userAddress);
        await tx.wait();

        return true;
      } catch (err: any) {
        setError(err.message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [getContract]
  );

  const increaseSeats = useCallback(
    async (licenseId: string, additionalSeats: number, costPerSeat: string) => {
      try {
        setLoading(true);
        setError(null);

        const contract = await getContract(true);
        const additionalCost = ethers.parseEther(costPerSeat) * BigInt(additionalSeats);

        const tx = await contract.increaseSeats(licenseId, additionalSeats, {
          value: additionalCost,
        });
        await tx.wait();

        return true;
      } catch (err: any) {
        setError(err.message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [getContract]
  );

  const getLicense = useCallback(
    async (licenseId: string): Promise<License | null> => {
      try {
        setLoading(true);
        setError(null);

        const contract = await getContract(false);
        const license = await contract.getLicense(licenseId);

        return {
          contentId: license[0],
          enterprise: license[1],
          seats: license[2],
          usedSeats: license[3],
          pricePerSeat: license[4],
          expiresAt: license[5],
          isActive: license[6],
          createdAt: license[7],
        };
      } catch (err: any) {
        setError(err.message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [getContract]
  );

  const getEnterpriseLicenses = useCallback(
    async (enterpriseAddress: string): Promise<string[]> => {
      try {
        setLoading(true);
        setError(null);

        const contract = await getContract(false);
        const licenseIds = await contract.getEnterpriseLicenses(enterpriseAddress);

        return licenseIds;
      } catch (err: any) {
        setError(err.message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [getContract]
  );

  const hasSeat = useCallback(
    async (licenseId: string, userAddress: string): Promise<boolean> => {
      try {
        setLoading(true);
        setError(null);

        const contract = await getContract(false);
        const hasAssignedSeat = await contract.hasSeat(licenseId, userAddress);

        return hasAssignedSeat;
      } catch (err: any) {
        setError(err.message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [getContract]
  );

  const getAvailableSeats = useCallback(
    async (licenseId: string): Promise<number> => {
      try {
        setLoading(true);
        setError(null);

        const contract = await getContract(false);
        const availableSeats = await contract.getAvailableSeats(licenseId);

        return Number(availableSeats);
      } catch (err: any) {
        setError(err.message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [getContract]
  );

  return {
    loading,
    error,
    issueLicense,
    verifyLicense,
    renewLicense,
    assignSeat,
    revokeSeat,
    trackUsage,
    increaseSeats,
    getLicense,
    getEnterpriseLicenses,
    hasSeat,
    getAvailableSeats,
  };
};
