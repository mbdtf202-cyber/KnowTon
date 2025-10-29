import { useState } from 'react'

interface SummaryMetric {
  label: string
  value: string
  change: number
  icon: string
}

interface RevenueDataPoint {
  date: string
  revenue: number
  royalties: number
  sales: number
}

interface ContentMetrics {
  tokenId: string
  title: string
  category: string
  thumbnail: string
  views: number
  likes: number
  shares: number
  revenue: string
  royalties: string
  sales: number
  avgPrice: string
  holders: number
  engagement: number
}

export function useAnalytics() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const getSummaryMetrics = async (
    _address: string,
    _timeRange: string
  ): Promise<SummaryMetric[]> => {
    setLoading(true)
    setError(null)
    
    try {
      // Mock data for demonstration
      // In production, this would call: await api.get(`/analytics/${address}/summary?timeRange=${timeRange}`)
      
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      return [
        {
          label: '总收益',
          value: '12.45 ETH',
          change: 15.3,
          icon: '💰'
        },
        {
          label: '总浏览量',
          value: '45.2K',
          change: 8.7,
          icon: '👁️'
        },
        {
          label: '内容数量',
          value: '24',
          change: 12.5,
          icon: '📁'
        },
        {
          label: '平均互动率',
          value: '6.8%',
          change: -2.1,
          icon: '❤️'
        }
      ]
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load summary metrics')
      throw err
    } finally {
      setLoading(false)
    }
  }

  const getRevenueData = async (
    _address: string,
    timeRange: string
  ): Promise<RevenueDataPoint[]> => {
    setLoading(true)
    setError(null)
    
    try {
      // Mock data for demonstration
      // In production: await api.get(`/analytics/${address}/revenue?timeRange=${timeRange}`)
      
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : timeRange === '90d' ? 90 : 365
      const data: RevenueDataPoint[] = []
      
      for (let i = days - 1; i >= 0; i--) {
        const date = new Date()
        date.setDate(date.getDate() - i)
        
        data.push({
          date: date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' }),
          revenue: Math.random() * 0.5 + 0.1,
          royalties: Math.random() * 0.3,
          sales: Math.random() * 0.2
        })
      }
      
      return data
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load revenue data')
      throw err
    } finally {
      setLoading(false)
    }
  }

  const getContentMetrics = async (
    _address: string,
    _timeRange: string
  ): Promise<ContentMetrics[]> => {
    setLoading(true)
    setError(null)
    
    try {
      // Mock data for demonstration
      // In production: await api.get(`/analytics/${address}/content?timeRange=${timeRange}`)
      
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      const categories = ['音乐', '视频', '电子书', '课程', '艺术品']
      const titles = [
        '数字艺术作品 #1',
        '原创音乐专辑',
        '区块链技术课程',
        '摄影作品集',
        '独立游戏资产',
        '设计模板包',
        '编程教程系列',
        '3D 模型资源'
      ]
      
      return Array.from({ length: 8 }, (_, i) => ({
        tokenId: `${1000 + i}`,
        title: titles[i],
        category: categories[Math.floor(Math.random() * categories.length)],
        thumbnail: '',
        views: Math.floor(Math.random() * 10000) + 1000,
        likes: Math.floor(Math.random() * 500) + 50,
        shares: Math.floor(Math.random() * 200) + 20,
        revenue: (Math.random() * 5 + 0.5).toFixed(4),
        royalties: (Math.random() * 2).toFixed(4),
        sales: Math.floor(Math.random() * 50) + 5,
        avgPrice: (Math.random() * 0.5 + 0.1).toFixed(4),
        holders: Math.floor(Math.random() * 100) + 10,
        engagement: Math.random() * 10 + 2
      }))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load content metrics')
      throw err
    } finally {
      setLoading(false)
    }
  }

  const exportReport = async (
    address: string,
    timeRange: string,
    format: 'csv' | 'pdf' | 'json'
  ): Promise<Blob> => {
    setLoading(true)
    setError(null)
    
    try {
      // In production: await api.get(`/analytics/${address}/export?timeRange=${timeRange}&format=${format}`, { responseType: 'blob' })
      
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      // Generate mock report data
      const summaryMetrics = await getSummaryMetrics(address, timeRange)
      const revenueData = await getRevenueData(address, timeRange)
      const contentMetrics = await getContentMetrics(address, timeRange)
      
      let content: string
      let mimeType: string
      
      if (format === 'csv') {
        // Generate CSV
        content = 'Date,Revenue,Royalties,Sales\n'
        revenueData.forEach(point => {
          content += `${point.date},${point.revenue},${point.royalties},${point.sales}\n`
        })
        content += '\n\nContent Performance\n'
        content += 'Token ID,Title,Category,Views,Revenue,Sales\n'
        contentMetrics.forEach(item => {
          content += `${item.tokenId},${item.title},${item.category},${item.views},${item.revenue},${item.sales}\n`
        })
        mimeType = 'text/csv'
      } else if (format === 'json') {
        // Generate JSON
        content = JSON.stringify({
          address,
          timeRange,
          generatedAt: new Date().toISOString(),
          summary: summaryMetrics,
          revenue: revenueData,
          content: contentMetrics
        }, null, 2)
        mimeType = 'application/json'
      } else {
        // Generate simple PDF-like text (in production, use a proper PDF library)
        content = `KnowTon Analytics Report\n\n`
        content += `Address: ${address}\n`
        content += `Time Range: ${timeRange}\n`
        content += `Generated: ${new Date().toLocaleString()}\n\n`
        content += `Summary Metrics:\n`
        summaryMetrics.forEach(metric => {
          content += `${metric.label}: ${metric.value} (${metric.change > 0 ? '+' : ''}${metric.change}%)\n`
        })
        content += `\n\nRevenue Data:\n`
        revenueData.forEach(point => {
          content += `${point.date}: ${point.revenue.toFixed(4)} ETH\n`
        })
        mimeType = 'application/pdf'
      }
      
      return new Blob([content], { type: mimeType })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to export report')
      throw err
    } finally {
      setLoading(false)
    }
  }

  return {
    loading,
    error,
    getSummaryMetrics,
    getRevenueData,
    getContentMetrics,
    exportReport
  }
}
