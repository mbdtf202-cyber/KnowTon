import { useWriteContract, useReadContract, useWaitForTransactionReceipt } from 'wagmi'

const IP_NFT_ADDRESS = import.meta.env.VITE_IP_NFT_ADDRESS as `0x${string}`

const IP_NFT_ABI = [
  {
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'uri', type: 'string' },
      { name: 'title', type: 'string' },
      { name: 'royaltyBps', type: 'uint256' }
    ],
    name: 'mint',
    outputs: [{ name: 'tokenId', type: 'uint256' }],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    name: 'tokenURI',
    outputs: [{ name: '', type: 'string' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [{ name: 'owner', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function'
  }
] as const

export function useIPNFTMint() {
  const { data: hash, writeContract, isPending, error } = useWriteContract()
  
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  })

  const mint = async (to: string, uri: string, title: string, royaltyBps: number) => {
    return writeContract({
      address: IP_NFT_ADDRESS,
      abi: IP_NFT_ABI,
      functionName: 'mint',
      args: [to as `0x${string}`, uri, title, BigInt(royaltyBps)]
    })
  }

  return {
    mint,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    error
  }
}

export function useIPNFTBalance(address?: string) {
  const { data, isLoading, error } = useReadContract({
    address: IP_NFT_ADDRESS,
    abi: IP_NFT_ABI,
    functionName: 'balanceOf',
    args: address ? [address as `0x${string}`] : undefined,
  })

  return {
    balance: data ? Number(data) : 0,
    isLoading,
    error
  }
}

export function useIPNFTTokenURI(tokenId?: number) {
  const { data, isLoading, error } = useReadContract({
    address: IP_NFT_ADDRESS,
    abi: IP_NFT_ABI,
    functionName: 'tokenURI',
    args: tokenId !== undefined ? [BigInt(tokenId)] : undefined,
  })

  return {
    tokenURI: data as string,
    isLoading,
    error
  }
}
