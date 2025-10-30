import { AuthService } from '../../services/auth.service';
import { prisma } from '../setup';

describe('AuthService', () => {
  let authService: AuthService;

  beforeEach(() => {
    authService = new AuthService();
  });

  afterEach(async () => {
    // Clean up test data
    await prisma.user.deleteMany({
      where: {
        email: {
          contains: 'test'
        }
      }
    });
  });

  describe('validateWalletSignature', () => {
    it('should validate a correct wallet signature', async () => {
      const mockAddress = '0x1234567890123456789012345678901234567890';
      const mockMessage = 'Sign in to KnowTon';
      const mockSignature = '0xabcdef...'; // Mock signature

      // Mock the signature validation
      jest.spyOn(authService as any, 'verifySignature').mockResolvedValue(true);

      const result = await authService.validateWalletSignature(
        mockAddress,
        mockMessage,
        mockSignature
      );

      expect(result).toBe(true);
    });

    it('should reject an invalid wallet signature', async () => {
      const mockAddress = '0x1234567890123456789012345678901234567890';
      const mockMessage = 'Sign in to KnowTon';
      const mockSignature = '0xinvalid';

      jest.spyOn(authService as any, 'verifySignature').mockResolvedValue(false);

      const result = await authService.validateWalletSignature(
        mockAddress,
        mockMessage,
        mockSignature
      );

      expect(result).toBe(false);
    });
  });

  describe('generateJWT', () => {
    it('should generate a valid JWT token', async () => {
      const mockUser = {
        id: '1',
        address: '0x1234567890123456789012345678901234567890',
        email: 'test@example.com',
        role: 'USER'
      };

      const token = await authService.generateJWT(mockUser);

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3); // JWT has 3 parts
    });
  });

  describe('verifyJWT', () => {
    it('should verify a valid JWT token', async () => {
      const mockUser = {
        id: '1',
        address: '0x1234567890123456789012345678901234567890',
        email: 'test@example.com',
        role: 'USER'
      };

      const token = await authService.generateJWT(mockUser);
      const decoded = await authService.verifyJWT(token);

      expect(decoded).toBeDefined();
      expect(decoded.address).toBe(mockUser.address);
      expect(decoded.role).toBe(mockUser.role);
    });

    it('should reject an invalid JWT token', async () => {
      const invalidToken = 'invalid.jwt.token';

      await expect(authService.verifyJWT(invalidToken)).rejects.toThrow();
    });
  });

  describe('createOrUpdateUser', () => {
    it('should create a new user', async () => {
      const userData = {
        address: '0x1234567890123456789012345678901234567890',
        email: 'newuser@test.com',
        username: 'testuser'
      };

      const user = await authService.createOrUpdateUser(userData);

      expect(user).toBeDefined();
      expect(user.address).toBe(userData.address);
      expect(user.email).toBe(userData.email);
      expect(user.username).toBe(userData.username);
    });

    it('should update an existing user', async () => {
      const userData = {
        address: '0x1234567890123456789012345678901234567890',
        email: 'existing@test.com',
        username: 'existinguser'
      };

      // Create user first
      await authService.createOrUpdateUser(userData);

      // Update user
      const updatedData = {
        ...userData,
        email: 'updated@test.com'
      };

      const updatedUser = await authService.createOrUpdateUser(updatedData);

      expect(updatedUser.email).toBe('updated@test.com');
      expect(updatedUser.address).toBe(userData.address);
    });
  });

  describe('getUserByAddress', () => {
    it('should return user by address', async () => {
      const userData = {
        address: '0x1234567890123456789012345678901234567890',
        email: 'findme@test.com',
        username: 'findme'
      };

      await authService.createOrUpdateUser(userData);

      const foundUser = await authService.getUserByAddress(userData.address);

      expect(foundUser).toBeDefined();
      expect(foundUser?.address).toBe(userData.address);
      expect(foundUser?.email).toBe(userData.email);
    });

    it('should return null for non-existent address', async () => {
      const nonExistentAddress = '0x9999999999999999999999999999999999999999';

      const user = await authService.getUserByAddress(nonExistentAddress);

      expect(user).toBeNull();
    });
  });
});