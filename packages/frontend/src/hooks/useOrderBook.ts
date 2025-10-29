import { useState, useEffect, useCallback, useRef } from 'react'
import type { OrderBook, Order, Trade, OrderBookUpdate } from '../types'

interface UseOrderBookOptions {
  tokenId: string
  autoConnect?: boolean
}

export function useOrderBook({ tokenId, autoConnect = true }: UseOrderBookOptions) {
  const [orderBook, setOrderBook] = useState<OrderBook | null>(null)
  const [recentTrades, setRecentTrades] = useState<Trade[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [connected, setConnected] = useState(false)
  
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined)
  const reconnectAttemptsRef = useRef(0)
  const maxReconnectAttempts = 5

  // Fetch initial order book data
  const fetchOrderBook = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      // Mock API call - replace with actual endpoint
      const mockOrderBook = generateMockOrderBook(tokenId)
      setOrderBook(mockOrderBook)
      
      const mockTrades = generateMockTrades(tokenId, 20)
      setRecentTrades(mockTrades)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch order book')
    } finally {
      setLoading(false)
    }
  }, [tokenId])

  // Connect to WebSocket
  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return
    }

    try {
      // Mock WebSocket URL - replace with actual endpoint
      const wsUrl = `ws://localhost:3001/orderbook?tokenId=${tokenId}`
      const ws = new WebSocket(wsUrl)

      ws.onopen = () => {
        console.log('WebSocket connected')
        setConnected(true)
        setError(null)
        reconnectAttemptsRef.current = 0

        // Subscribe to order book updates
        ws.send(JSON.stringify({
          type: 'SUBSCRIBE_ORDERBOOK',
          tokenId,
        }))
      }

      ws.onmessage = (event) => {
        try {
          const update: OrderBookUpdate = JSON.parse(event.data)
          handleOrderBookUpdate(update)
        } catch (err) {
          console.error('Failed to parse WebSocket message:', err)
        }
      }

      ws.onerror = (event) => {
        console.error('WebSocket error:', event)
        setError('WebSocket connection error')
      }

      ws.onclose = () => {
        console.log('WebSocket disconnected')
        setConnected(false)
        wsRef.current = null

        // Attempt to reconnect
        if (reconnectAttemptsRef.current < maxReconnectAttempts) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000)
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttemptsRef.current++
            connect()
          }, delay)
        } else {
          setError('Failed to connect to real-time updates')
        }
      }

      wsRef.current = ws
    } catch (err) {
      console.error('Failed to create WebSocket:', err)
      setError('Failed to establish WebSocket connection')
    }
  }, [tokenId])

  // Disconnect from WebSocket
  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
    }
    
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }
    
    setConnected(false)
  }, [])

  // Handle order book updates
  const handleOrderBookUpdate = useCallback((update: OrderBookUpdate) => {
    switch (update.type) {
      case 'order_added':
        if (update.order) {
          setOrderBook(prev => {
            if (!prev) return prev
            
            const newOrderBook = { ...prev }
            if (update.order!.side === 'buy') {
              newOrderBook.bids = [...prev.bids, update.order!].sort((a, b) => b.price - a.price)
            } else {
              newOrderBook.asks = [...prev.asks, update.order!].sort((a, b) => a.price - b.price)
            }
            return newOrderBook
          })
        }
        break

      case 'order_cancelled':
        if (update.order) {
          setOrderBook(prev => {
            if (!prev) return prev
            
            const newOrderBook = { ...prev }
            if (update.order!.side === 'buy') {
              newOrderBook.bids = prev.bids.filter(o => o.id !== update.order!.id)
            } else {
              newOrderBook.asks = prev.asks.filter(o => o.id !== update.order!.id)
            }
            return newOrderBook
          })
        }
        break

      case 'order_filled':
        if (update.order) {
          setOrderBook(prev => {
            if (!prev) return prev
            
            const newOrderBook = { ...prev }
            const orders = update.order!.side === 'buy' ? newOrderBook.bids : newOrderBook.asks
            const index = orders.findIndex(o => o.id === update.order!.id)
            
            if (index !== -1) {
              if (update.order!.status === 'filled') {
                orders.splice(index, 1)
              } else {
                orders[index] = update.order!
              }
            }
            
            return newOrderBook
          })
        }
        break

      case 'trade_executed':
        if (update.trade) {
          setRecentTrades(prev => [update.trade!, ...prev].slice(0, 50))
          
          setOrderBook(prev => {
            if (!prev) return prev
            return {
              ...prev,
              lastPrice: update.trade!.price,
            }
          })
        }
        break
    }
  }, [])

  // Place order
  const placeOrder = useCallback(async (order: Omit<Order, 'id' | 'timestamp' | 'filled' | 'status'>) => {
    try {
      // Mock API call - replace with actual endpoint
      const newOrder: Order = {
        ...order,
        id: `order_${Date.now()}_${Math.random().toString(36).slice(2)}`,
        timestamp: Date.now(),
        filled: 0,
        status: 'open',
      }

      // Send via WebSocket if connected
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: 'PLACE_ORDER',
          order: newOrder,
        }))
      }

      return { success: true, order: newOrder }
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to place order',
      }
    }
  }, [])

  // Cancel order
  const cancelOrder = useCallback(async (orderId: string) => {
    try {
      // Send via WebSocket if connected
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: 'CANCEL_ORDER',
          orderId,
        }))
      }

      return { success: true }
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to cancel order',
      }
    }
  }, [])

  // Initial fetch
  useEffect(() => {
    fetchOrderBook()
  }, [fetchOrderBook])

  // Auto-connect WebSocket
  useEffect(() => {
    if (autoConnect) {
      connect()
    }

    return () => {
      disconnect()
    }
  }, [autoConnect, connect, disconnect])

  return {
    orderBook,
    recentTrades,
    loading,
    error,
    connected,
    connect,
    disconnect,
    placeOrder,
    cancelOrder,
    refetch: fetchOrderBook,
  }
}

// Mock data generators
function generateMockOrderBook(tokenId: string): OrderBook {
  const basePrice = 1.5 + Math.random() * 2
  const spread = 0.01
  
  const bids: Order[] = Array.from({ length: 15 }, (_, i) => ({
    id: `bid_${i}`,
    tokenId,
    maker: `0x${Math.random().toString(16).slice(2, 42)}`,
    side: 'buy',
    price: basePrice - spread - (i * 0.01),
    amount: Math.random() * 5 + 0.1,
    filled: 0,
    status: 'open',
    timestamp: Date.now() - Math.random() * 3600000,
  }))

  const asks: Order[] = Array.from({ length: 15 }, (_, i) => ({
    id: `ask_${i}`,
    tokenId,
    maker: `0x${Math.random().toString(16).slice(2, 42)}`,
    side: 'sell',
    price: basePrice + spread + (i * 0.01),
    amount: Math.random() * 5 + 0.1,
    filled: 0,
    status: 'open',
    timestamp: Date.now() - Math.random() * 3600000,
  }))

  return {
    tokenId,
    bids: bids.sort((a, b) => b.price - a.price),
    asks: asks.sort((a, b) => a.price - b.price),
    lastPrice: basePrice,
    priceChange24h: (Math.random() - 0.5) * 0.2,
    volume24h: Math.random() * 100 + 10,
    high24h: basePrice * 1.1,
    low24h: basePrice * 0.9,
  }
}

function generateMockTrades(tokenId: string, count: number): Trade[] {
  const basePrice = 1.5 + Math.random() * 2
  
  return Array.from({ length: count }, (_, i) => ({
    id: `trade_${i}`,
    tokenId,
    buyer: `0x${Math.random().toString(16).slice(2, 42)}`,
    seller: `0x${Math.random().toString(16).slice(2, 42)}`,
    price: basePrice + (Math.random() - 0.5) * 0.2,
    amount: Math.random() * 3 + 0.1,
    timestamp: Date.now() - i * 60000,
    txHash: `0x${Math.random().toString(16).slice(2, 66)}`,
  }))
}
