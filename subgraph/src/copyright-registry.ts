import { BigInt, Bytes } from "@graphprotocol/graph-ts"
import {
  IPNFTMinted,
  Transfer,
  IPVerified
} from "../generated/CopyrightRegistry/CopyrightRegistry"
import { IPNFT, Creator, Transfer as TransferEntity } from "../generated/schema"

export function handleIPNFTMinted(event: IPNFTMinted): void {
  let nft = new IPNFT(event.params.tokenId.toString())
  nft.tokenId = event.params.tokenId
  nft.owner = event.params.creator
  nft.contentHash = event.params.contentHash
  nft.metadataURI = event.params.metadataURI
  nft.category = event.params.category
  nft.royaltyPercent = event.params.royaltyPercent
  nft.verified = false
  nft.mintedAt = event.block.timestamp
  
  // Create or update creator
  let creator = Creator.load(event.params.creator.toHexString())
  if (creator == null) {
    creator = new Creator(event.params.creator.toHexString())
    creator.address = event.params.creator
    creator.totalNFTs = BigInt.fromI32(0)
    creator.totalVolume = BigInt.fromI32(0)
    creator.createdAt = event.block.timestamp
  }
  creator.totalNFTs = creator.totalNFTs.plus(BigInt.fromI32(1))
  creator.save()
  
  nft.creator = creator.id
  nft.save()
}

export function handleTransfer(event: Transfer): void {
  let nft = IPNFT.load(event.params.tokenId.toString())
  if (nft != null) {
    nft.owner = event.params.to
    nft.save()
  }
  
  let transfer = new TransferEntity(
    event.transaction.hash.toHex() + "-" + event.logIndex.toString()
  )
  transfer.nft = event.params.tokenId.toString()
  transfer.from = event.params.from
  transfer.to = event.params.to
  transfer.timestamp = event.block.timestamp
  transfer.transactionHash = event.transaction.hash
  transfer.save()
}

export function handleIPVerified(event: IPVerified): void {
  let nft = IPNFT.load(event.params.tokenId.toString())
  if (nft != null) {
    nft.verified = event.params.verified
    nft.save()
  }
}
