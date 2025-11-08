import { Server as HTTPServer } from 'http';
import WebSocket, { WebSocketServer } from 'ws';
import { realtimeMetricsService, RealtimeMetrics } from './realtime-metrics.service';
import { logger } from '../utils/logger';

export class WebSocketService {
  private wss: WebSocketServer | null = null;
  private clients: Set<WebSocket> = new Set();

  initialize(server: HTTPServer): void {
    this.wss = new WebSocketServer({ 
      server,
      path: '/ws/metrics'
    });

    this.wss.on('connection', (ws: WebSocket, req) => {
      logger.info('WebSocket client connected', { 
        ip: req.socket.remoteAddress 
      });

      this.clients.add(ws);

      // Send initial metrics
      this.sendMetrics(ws);

      ws.on('message', (message: string) => {
        try {
          const data = JSON.parse(message.toString());
          this.handleMessage(ws, data);
        } catch (error) {
          logger.error('Error parsing WebSocket message', { error });
        }
      });

      ws.on('close', () => {
        logger.info('WebSocket client disconnected');
        this.clients.delete(ws);
      });

      ws.on('error', (error) => {
        logger.error('WebSocket error', { error });
        this.clients.delete(ws);
      });

      // Send ping every 30 seconds to keep connection alive
      const pingInterval = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.ping();
        } else {
          clearInterval(pingInterval);
        }
      }, 30000);
    });

    // Listen for metrics updates
    realtimeMetricsService.on('metrics-updated', (metrics: RealtimeMetrics) => {
      this.broadcastMetrics(metrics);
    });

    // Start metrics updates
    realtimeMetricsService.startMetricsUpdates();

    logger.info('WebSocket server initialized');
  }

  private async sendMetrics(ws: WebSocket): Promise<void> {
    try {
      const metrics = await realtimeMetricsService.getMetrics();
      this.send(ws, {
        type: 'metrics',
        data: metrics,
      });
    } catch (error) {
      logger.error('Error sending metrics', { error });
    }
  }

  private broadcastMetrics(metrics: RealtimeMetrics): void {
    this.broadcast({
      type: 'metrics',
      data: metrics,
    });
  }

  private handleMessage(ws: WebSocket, message: any): void {
    switch (message.type) {
      case 'subscribe':
        // Handle subscription to specific channels
        logger.info('Client subscribed', { channel: message.channel });
        break;
      case 'ping':
        this.send(ws, { type: 'pong' });
        break;
      default:
        logger.warn('Unknown message type', { type: message.type });
    }
  }

  private send(ws: WebSocket, data: any): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(data));
    }
  }

  private broadcast(data: any): void {
    const message = JSON.stringify(data);
    this.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  }

  shutdown(): void {
    realtimeMetricsService.stopMetricsUpdates();
    
    this.clients.forEach((client) => {
      client.close();
    });
    
    if (this.wss) {
      this.wss.close();
    }
    
    logger.info('WebSocket server shut down');
  }
}

export const websocketService = new WebSocketService();
