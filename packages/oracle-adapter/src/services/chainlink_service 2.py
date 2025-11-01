"""Chainlink Oracle Integration Service"""

import structlog
from web3 import Web3
from eth_account import Account
from typing import Dict, Any, Optional
import time

from src.config import settings

logger = structlog.get_logger()


class ChainlinkOracleService:
    """Service for submitting data to Chainlink Oracle"""
    
    def __init__(self):
        self.w3 = None
        self.oracle_contract = None
        self.account = None
        self.initialized = False
        
    async def initialize(self):
        """Initialize Chainlink Oracle connection"""
        try:
            if not settings.arbitrum_rpc_url:
                logger.warning("Arbitrum RPC URL not configured, Chainlink integration disabled")
                return
            
            if not settings.chainlink_oracle_address:
                logger.warning("Chainlink Oracle address not configured, integration disabled")
                return
            
            # Initialize Web3 connection
            self.w3 = Web3(Web3.HTTPProvider(settings.arbitrum_rpc_url))
            
            if not self.w3.is_connected():
                logger.error("Failed to connect to Arbitrum network")
                return
            
            logger.info("Connected to Arbitrum network", 
                       chain_id=self.w3.eth.chain_id,
                       block_number=self.w3.eth.block_number)
            
            # Load Oracle contract
            self.oracle_contract = self.w3.eth.contract(
                address=Web3.to_checksum_address(settings.chainlink_oracle_address),
                abi=self._get_oracle_abi()
            )
            
            # Initialize account if private key is provided
            if settings.oracle_private_key:
                self.account = Account.from_key(settings.oracle_private_key)
                logger.info("Oracle account initialized", address=self.account.address)
            else:
                logger.warning("Oracle private key not configured, submissions disabled")
            
            self.initialized = True
            logger.info("Chainlink Oracle service initialized successfully")
            
        except Exception as e:
            logger.error("Failed to initialize Chainlink Oracle service", error=str(e))
            self.initialized = False
    
    async def submit_valuation(
        self,
        token_id: str,
        estimated_value: float,
        confidence_score: float,
        metadata: Optional[Dict[str, Any]] = None
    ) -> Optional[str]:
        """
        Submit valuation result to Chainlink Oracle
        
        Args:
            token_id: NFT token ID
            estimated_value: Estimated value in USD
            confidence_score: Confidence score (0-1)
            metadata: Additional metadata
            
        Returns:
            Transaction hash if successful, None otherwise
        """
        if not self.initialized or not self.account:
            logger.warning("Chainlink Oracle not initialized or no account configured")
            return None
        
        try:
            # Convert value to wei (assuming 18 decimals)
            value_wei = self.w3.to_wei(estimated_value, 'ether')
            
            # Convert confidence to basis points (0-10000)
            confidence_bp = int(confidence_score * 10000)
            
            # Prepare transaction
            nonce = self.w3.eth.get_transaction_count(self.account.address)
            gas_price = self.w3.eth.gas_price
            
            # Build transaction
            tx = self.oracle_contract.functions.submitValuation(
                int(token_id) if token_id.isdigit() else int(token_id, 16),
                value_wei,
                confidence_bp
            ).build_transaction({
                'from': self.account.address,
                'nonce': nonce,
                'gas': 200000,
                'gasPrice': gas_price,
                'chainId': self.w3.eth.chain_id,
            })
            
            # Sign transaction
            signed_tx = self.account.sign_transaction(tx)
            
            # Send transaction
            tx_hash = self.w3.eth.send_raw_transaction(signed_tx.rawTransaction)
            tx_hash_hex = tx_hash.hex()
            
            logger.info(
                "Valuation submitted to Chainlink Oracle",
                token_id=token_id,
                value=estimated_value,
                confidence=confidence_score,
                tx_hash=tx_hash_hex
            )
            
            # Wait for transaction receipt (optional, can be done async)
            # receipt = self.w3.eth.wait_for_transaction_receipt(tx_hash, timeout=120)
            # if receipt.status == 1:
            #     logger.info("Transaction confirmed", tx_hash=tx_hash_hex, block=receipt.blockNumber)
            # else:
            #     logger.error("Transaction failed", tx_hash=tx_hash_hex)
            
            return tx_hash_hex
            
        except Exception as e:
            logger.error("Failed to submit valuation to Chainlink Oracle", 
                        token_id=token_id, error=str(e))
            return None
    
    async def get_latest_valuation(self, token_id: str) -> Optional[Dict[str, Any]]:
        """
        Get the latest valuation from Chainlink Oracle
        
        Args:
            token_id: NFT token ID
            
        Returns:
            Valuation data if available, None otherwise
        """
        if not self.initialized:
            logger.warning("Chainlink Oracle not initialized")
            return None
        
        try:
            # Call contract view function
            result = self.oracle_contract.functions.getLatestValuation(
                int(token_id) if token_id.isdigit() else int(token_id, 16)
            ).call()
            
            # Parse result (assuming it returns: value, confidence, timestamp)
            value_wei, confidence_bp, timestamp = result
            
            return {
                "value_usd": float(self.w3.from_wei(value_wei, 'ether')),
                "confidence": confidence_bp / 10000.0,
                "timestamp": timestamp,
                "age_seconds": int(time.time()) - timestamp
            }
            
        except Exception as e:
            logger.error("Failed to get valuation from Chainlink Oracle", 
                        token_id=token_id, error=str(e))
            return None
    
    async def submit_fingerprint(
        self,
        content_hash: str,
        fingerprint: str,
        content_type: str
    ) -> Optional[str]:
        """
        Submit content fingerprint to Chainlink Oracle
        
        Args:
            content_hash: IPFS content hash
            fingerprint: Generated fingerprint
            content_type: Type of content
            
        Returns:
            Transaction hash if successful, None otherwise
        """
        if not self.initialized or not self.account:
            logger.warning("Chainlink Oracle not initialized or no account configured")
            return None
        
        try:
            # Prepare transaction
            nonce = self.w3.eth.get_transaction_count(self.account.address)
            gas_price = self.w3.eth.gas_price
            
            # Build transaction
            tx = self.oracle_contract.functions.submitFingerprint(
                content_hash,
                fingerprint,
                content_type
            ).build_transaction({
                'from': self.account.address,
                'nonce': nonce,
                'gas': 150000,
                'gasPrice': gas_price,
                'chainId': self.w3.eth.chain_id,
            })
            
            # Sign and send
            signed_tx = self.account.sign_transaction(tx)
            tx_hash = self.w3.eth.send_raw_transaction(signed_tx.rawTransaction)
            tx_hash_hex = tx_hash.hex()
            
            logger.info(
                "Fingerprint submitted to Chainlink Oracle",
                content_hash=content_hash,
                tx_hash=tx_hash_hex
            )
            
            return tx_hash_hex
            
        except Exception as e:
            logger.error("Failed to submit fingerprint to Chainlink Oracle", 
                        content_hash=content_hash, error=str(e))
            return None
    
    def _get_oracle_abi(self) -> list:
        """Get Chainlink Oracle contract ABI"""
        return [
            {
                "inputs": [
                    {"name": "tokenId", "type": "uint256"},
                    {"name": "value", "type": "uint256"},
                    {"name": "confidence", "type": "uint256"}
                ],
                "name": "submitValuation",
                "outputs": [],
                "stateMutability": "nonpayable",
                "type": "function"
            },
            {
                "inputs": [
                    {"name": "tokenId", "type": "uint256"}
                ],
                "name": "getLatestValuation",
                "outputs": [
                    {"name": "value", "type": "uint256"},
                    {"name": "confidence", "type": "uint256"},
                    {"name": "timestamp", "type": "uint256"}
                ],
                "stateMutability": "view",
                "type": "function"
            },
            {
                "inputs": [
                    {"name": "contentHash", "type": "string"},
                    {"name": "fingerprint", "type": "string"},
                    {"name": "contentType", "type": "string"}
                ],
                "name": "submitFingerprint",
                "outputs": [],
                "stateMutability": "nonpayable",
                "type": "function"
            },
            {
                "anonymous": False,
                "inputs": [
                    {"indexed": True, "name": "tokenId", "type": "uint256"},
                    {"indexed": False, "name": "value", "type": "uint256"},
                    {"indexed": False, "name": "confidence", "type": "uint256"},
                    {"indexed": False, "name": "timestamp", "type": "uint256"}
                ],
                "name": "ValuationSubmitted",
                "type": "event"
            },
            {
                "anonymous": False,
                "inputs": [
                    {"indexed": True, "name": "contentHash", "type": "string"},
                    {"indexed": False, "name": "fingerprint", "type": "string"},
                    {"indexed": False, "name": "timestamp", "type": "uint256"}
                ],
                "name": "FingerprintSubmitted",
                "type": "event"
            }
        ]
    
    def is_ready(self) -> bool:
        """Check if the service is ready to submit data"""
        return self.initialized and self.account is not None
    
    async def health_check(self) -> Dict[str, Any]:
        """Perform health check on Chainlink Oracle connection"""
        if not self.initialized:
            return {
                "status": "not_initialized",
                "connected": False,
                "account_configured": False
            }
        
        try:
            is_connected = self.w3.is_connected() if self.w3 else False
            block_number = self.w3.eth.block_number if is_connected else 0
            
            return {
                "status": "healthy" if is_connected else "disconnected",
                "connected": is_connected,
                "account_configured": self.account is not None,
                "account_address": self.account.address if self.account else None,
                "chain_id": self.w3.eth.chain_id if is_connected else None,
                "block_number": block_number,
                "oracle_address": settings.chainlink_oracle_address
            }
        except Exception as e:
            return {
                "status": "error",
                "error": str(e),
                "connected": False,
                "account_configured": self.account is not None
            }


# Global instance
chainlink_oracle = ChainlinkOracleService()
