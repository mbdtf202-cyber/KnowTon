# KnowTon Platform - 端口分配表

## 📊 端口分配总览

### 数据库服务
| 服务 | 端口 | 用途 | 状态 |
|------|------|------|------|
| PostgreSQL | 5432 | 主数据库 | ✅ 正常 |
| PostgreSQL (Simple) | 5433 | 简化版 | ✅ 正常 |
| MongoDB | 27017 | 文档数据库 | ✅ 正常 |
| MongoDB (Simple) | 27018 | 简化版 | ✅ 正常 |
| Redis | 6379 | 缓存 | ✅ 正常 |
| Redis (Simple) | 6380 | 简化版 | ✅ 正常 |
| ClickHouse HTTP | 8123 | 分析数据库 | ✅ 正常 |
| ClickHouse Native | 9000 | 原生协议 | ✅ 正常 |
| Elasticsearch HTTP | 9200 | 搜索引擎 | ✅ 正常 |
| Elasticsearch Transport | 9300 | 节点通信 | ✅ 正常 |

### 消息队列
| 服务 | 端口 | 用途 | 状态 |
|------|------|------|------|
| Zookeeper | 2181 | Kafka 协调 | ✅ 正常 |
| Kafka | 9092 | 内部通信 | ✅ 正常 |
| Kafka External | 29092 | 外部访问 | ✅ 正常 |

### 存储服务
| 服务 | 端口 | 用途 | 状态 |
|------|------|------|------|
| IPFS Swarm | 4001 | P2P 网络 | ✅ 正常 |
| IPFS API | 5001 | HTTP API | ✅ 正常 |
| IPFS Gateway | 8080 | HTTP 网关 | ⚠️ 冲突风险 |

### 应用服务
| 服务 | 端口 | 用途 | 状态 |
|------|------|------|------|
| Backend API | 3000 | 后端服务 | ✅ 正常 |
| Frontend Dev | 5173 | 前端开发 | ✅ 正常 |
| Oracle Adapter | 8000 | AI 服务 | ✅ 正常 |
| Bonding Service | 50051 | gRPC 服务 | ✅ 正常 |

### 管理工具
| 服务 | 端口 | 用途 | 状态 |
|------|------|------|------|
| Adminer | 8081 | 数据库管理 | ✅ 正常 |
| Redis Commander | 8082 | Redis 管理 | ✅ 正常 |

### 监控服务
| 服务 | 端口 | 用途 | 状态 |
|------|------|------|------|
| Prometheus | 9090 | 指标收集 | 📝 待配置 |
| Grafana | 3001 | 可视化 | 📝 待配置 |

## ⚠️ 潜在冲突

### 1. IPFS Gateway (8080) vs 其他服务
**问题**: 8080 是常用端口，可能与其他服务冲突

**解决方案**: 
```yaml
# 修改 IPFS Gateway 端口为 8090
ports:
  - "8090:8080"
```

### 2. 开发环境端口占用
**问题**: 多个开发服务器可能同时运行

**解决方案**:
- Backend: 3000
- Frontend: 5173 (Vite 默认)
- Oracle Adapter: 8000
- Bonding Service: 50051 (gRPC)

## 🔧 端口配置文件位置

### Docker Compose
- `docker-compose.yml` - 完整版
- `docker-compose.simple.yml` - 简化版

### 服务配置
- Backend: `packages/backend/.env` → `PORT=3000`
- Frontend: `packages/frontend/vite.config.ts` → `port: 5173`
- Oracle Adapter: `packages/oracle-adapter/src/config.py` → `port=8000`
- Bonding Service: `packages/bonding-service/.env` → `GRPC_PORT=50051`

## 📝 推荐端口分配策略

### 开发环境
```bash
# 数据库层 (5000-6999)
PostgreSQL: 5432
MongoDB: 27017
Redis: 6379

# 应用层 (3000-4999)
Backend: 3000
Frontend: 5173

# AI/ML 层 (8000-8999)
Oracle Adapter: 8000
Bonding Service: 50051

# 存储层 (4000-5000, 8000-9000)
IPFS API: 5001
IPFS Gateway: 8090 (修改后)

# 监控层 (9000-9999)
Prometheus: 9090
Grafana: 3001
ClickHouse: 8123, 9000
Elasticsearch: 9200, 9300

# 管理工具 (8080-8099)
Adminer: 8081
Redis Commander: 8082
```

## 🚀 快速检查命令

```bash
# 检查端口占用
lsof -i :3000  # Backend
lsof -i :5173  # Frontend
lsof -i :8000  # Oracle Adapter
lsof -i :50051 # Bonding Service

# 检查所有 Docker 端口
docker-compose ps

# 停止所有服务
docker-compose down

# 启动特定服务
docker-compose up -d postgres redis mongodb
```

## ✅ 验证清单

- [ ] 所有端口无冲突
- [ ] Docker Compose 服务正常启动
- [ ] 应用服务可以连接数据库
- [ ] 前端可以访问后端 API
- [ ] Oracle Adapter 健康检查通过
- [ ] Bonding Service gRPC 连接正常

---

*最后更新: 2025-10-31*
