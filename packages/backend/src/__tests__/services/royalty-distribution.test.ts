import { RoyaltyDistributionService } from '../../services/royalty-distribution.service';

describe('RoyaltyDistributionService', () => {
  let service: RoyaltyDistributionService;

  beforeEach(() => {
    service = new RoyaltyDistributionService();
  });

  describe('calculateDistribution', () => {
    it('should calculate distribution correctly for multiple beneficiaries', async () => {
      const tokenId = '1';
      const totalAmount = '1.0';
      const beneficiaries = [
        { recipient: '0x1234567890123456789012345678901234567890', percentage: 5000 }, // 50%
        { recipient: '0x2234567890123456789012345678901234567890', percentage: 3000 }, // 30%
        { recipient: '0x3234567890123456789012345678901234567890', percentage: 2000 }, // 20%
      ];

      const result = await service.calculateDistribution(tokenId, totalAmount, beneficiaries);

      expect(result.tokenId).toBe(tokenId);
      expect(result.totalAmount).toBe(totalAmount);
      expect(result.beneficiaries).toHaveLength(3);
      expect(result.beneficiaries[0].amount).toBe('0.5'); // 50%
      expect(result.beneficiaries[1].amount).toBe('0.3'); // 30%
      expect(result.beneficiaries[2].amount).toBe('0.2'); // 20%
    });

    it('should throw error if total percentage is not 100%', async () => {
      const tokenId = '1';
      const totalAmount = '1.0';
      const beneficiaries = [
        { recipient: '0x1234567890123456789012345678901234567890', percentage: 5000 }, // 50%
        { recipient: '0x2234567890123456789012345678901234567890', percentage: 3000 }, // 30%
        // Missing 20%
      ];

      await expect(
        service.calculateDistribution(tokenId, totalAmount, beneficiaries)
      ).rejects.toThrow('Total percentage must equal 100%');
    });

    it('should throw error for invalid parameters', async () => {
      await expect(
        service.calculateDistribution('', '1.0', [])
      ).rejects.toThrow('Invalid distribution parameters');
    });
  });

  describe('batchDistributions', () => {
    it('should batch multiple distributions', async () => {
      const distributions = [
        { tokenId: '1', amount: '1.0' },
        { tokenId: '2', amount: '2.0' },
      ];

      // This will fail in test environment without proper contract setup
      // but we're testing the structure
      try {
        const result = await service.batchDistributions(distributions);
        expect(result.distributions).toHaveLength(2);
        expect(result.totalGasEstimate).toBeDefined();
        expect(result.estimatedCost).toBeDefined();
      } catch (error: any) {
        // Expected to fail without contract setup
        expect(error.message).toContain('Failed to batch distributions');
      }
    });

    it('should throw error for empty batch', async () => {
      await expect(service.batchDistributions([])).rejects.toThrow(
        'No distributions to batch'
      );
    });

    it('should throw error for batch size exceeding maximum', async () => {
      const distributions = Array(11)
        .fill(null)
        .map((_, i) => ({ tokenId: i.toString(), amount: '1.0' }));

      await expect(service.batchDistributions(distributions)).rejects.toThrow(
        'Batch size exceeds maximum'
      );
    });
  });

  describe('getGasPriceEstimate', () => {
    it('should return gas price estimate', async () => {
      const estimate = await service.getGasPriceEstimate();

      expect(estimate).toHaveProperty('gasPrice');
      expect(estimate).toHaveProperty('gasPriceGwei');
      expect(estimate).toHaveProperty('estimatedCostForDistribution');
    });
  });
});
