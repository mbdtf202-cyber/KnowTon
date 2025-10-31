import { useWriteContract, useReadContract, useWaitForTransactionReceipt } from 'wagmi'
import { parseEther } from 'viem'

const IP_BOND_ADDRESS = import.meta.env.VITE_IP_BOND_ADDRESS as `0x${string}`
const MOCK_TOKEN_ADDRESS = import.meta.env.VITE_MOCK_TOKEN_ADDRESS as `0x${string}`

const IP_BOND_ABI = [
  {
    inputs: [
      { name: 'principal', type: 'uint256' },
      { name: 'interestRate', type: 'uint256' },
      { name: 'duration', type: 'uint256' }
    ],
    name: 'issueBond',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [
      { name: 'bondId', type: 'uint256' },
      { name: 'amount', type: 'uint256' }
    ],
    name: 'invest',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [{ name: 'bondId', type: 'uint256' }],
    name: 'redeem',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [{ name: 'bondId', type: 'uint256' }],
    name: 'getBond',
    outputs: [{
      components: [
        { name: 'bondId', type: 'uint256' },
        { name: 'issuer', type: 'address' },
        { name: 'principal', type: 'uint256' },
        { name: 'interestRate', type: 'uint256' },
        { name: 'maturityDate', type: 'uint256' },
        { name: 'status', type: 'uint8' },
        { name: 'totalInvested', type: 'uint256' },
        { name: 'totalRedeemed', type: 'uint256' }
      ],
      name: '',
      type: 'tuple'
    }],
    stateMutability: 'view',
    type: 'function'
  }
] as const

const ERC20_ABI = [
  {
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' }
    ],
    name: 'approve',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
    type: 'function'
  }
] as const

export function useIssueBond() {
  const { data: hash, writeContract, isPending, error } = useWriteContract()
  
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  })

  const issueBond = async (principal: string, interestRate: number, durationDays: number) => {
    const principalWei = parseEther(principal)
    const durationSeconds = BigInt(durationDays * 24 * 60 * 60)
    
    return writeContract({
      address: IP_BOND_ADDRESS,
      abi: IP_BOND_ABI,
      functionName: 'issueBond',
      args: [principalWei, BigInt(interestRate), durationSeconds]
    })
  }

  return {
    issueBond,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    error
  }
}

export function useInvestBond() {
  const { data: hash, writeContract, isPending, error } = useWriteContract()
  
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  })

  const invest = async (bondId: number, amount: string) => {
    const amountWei = parseEther(amount)
    
    return writeContract({
      address: IP_BOND_ADDRESS,
      abi: IP_BOND_ABI,
      functionName: 'invest',
      args: [BigInt(bondId), amountWei]
    })
  }

  return {
    invest,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    error
  }
}

export function useRedeemBond() {
  const { data: hash, writeContract, isPending, error } = useWriteContract()
  
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  })

  const redeem = async (bondId: number) => {
    return writeContract({
      address: IP_BOND_ADDRESS,
      abi: IP_BOND_ABI,
      functionName: 'redeem',
      args: [BigInt(bondId)]
    })
  }

  return {
    redeem,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    error
  }
}

export function useBondInfo(bondId?: number) {
  const { data, isLoading, error, refetch } = useReadContract({
    address: IP_BOND_ADDRESS,
    abi: IP_BOND_ABI,
    functionName: 'getBond',
    args: bondId !== undefined ? [BigInt(bondId)] : undefined,
  })

  return {
    bond: data,
    isLoading,
    error,
    refetch
  }
}

export function useApproveToken() {
  const { data: hash, writeContract, isPending, error } = useWriteContract()
  
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  })

  const approve = async (amount: string) => {
    const amountWei = parseEther(amount)
    
    return writeContract({
      address: MOCK_TOKEN_ADDRESS,
      abi: ERC20_ABI,
      functionName: 'approve',
      args: [IP_BOND_ADDRESS, amountWei]
    })
  }

  return {
    approve,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    error
  }
}
