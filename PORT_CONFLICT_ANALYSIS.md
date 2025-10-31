# KnowTon Platform - 端口冲突分析与修复

## 🔍 发现的端口冲突

### 冲突 1: TorchServe vs IPFS (端口 8080)
- **TorchServe**: 8080 (AI 模型服务)
- **IPFS Gateway**: 8080 (IPFS 网关)
- **冲突**: 两个服务使用相同端口

### 冲突 2: Weaviate vs TorchServe (端口 8080)
- **Weaviate**: 8080 (向量数据库)
- **TorchServe**: 8080 (AI 模型服务)
- **冲突**: 配置文件中指向同一端口

### 冲突 3: Adminer vs TorchServe Management (端口 8081)
- **Adminer**: 8081 (数据库管理)
- **TorchServe Management**: 8081 (模型管理)
- **冲突**: 管理端口冲突

### 冲突 4: Redis Commander (端口 8082)
- **Redis Commander**: 8082 (Redis 管理)
- **TorchServe Metrics**: 8082 (可能的指标端口)
- **潜在冲突**

## ✅ 修复方案 - 新的端口分配

### 核心服务端口
```
PostgreSQL:      5432  ✅ (标准端口)
Redis:           6379  ✅ (标准端口)
MongoDB:         27017 ✅ (标准端口)
Elasticsearch:   9200  ✅ (标准端口)
Kafka:           9092  ✅ (内部)
Kafka External:  29092 ✅ (外部访问)
ClickHouse HTTP: 8123  ✅ (标准端口)
ClickHouse TCP:  9000  ✅ (标准端口)
```

### 应用服务端口
```
Backend API:           3000  ✅
Frontend Dev:          5173  ✅ (Vite 默认)
Oracle Adapter:        8000  ✅
Bonding Service gRPC:  50051 ✅
```

### AI/ML 服务端口 (修复后)
```
TorchServe Inference:  8090  🔧 (从 8080 改为 8090)
TorchServe Management: 8091  🔧 (从 8081 改为 8091)
TorchServe Metrics:    8092  🔧 (从 8082 改为 8092)
Weaviate:              8088  🔧 (从 8080 改为 8088)
```

### IPFS 端口
```
IPFS Swarm:    4001  ✅
IPFS API:      5001  ✅
IPFS Gateway:  8080  ✅ (保持，因为是独立容器)
```

### 管理工具端口
```
Adminer:         8081  ✅ (保持)
Redis Commander: 8082  ✅ (保持)
Prometheus:      9090  ✅
Grafana:         3001  🔧 (从 3000 改为 3001，避免与 Backend 冲突)
```

### 监控服务端口
```
Prometheus:           9090  ✅
Grafana:              3001  🔧
Node Exporter:        9100  ✅
Kafka Exporter:       9308  ✅
Postgres Exporter:    9187  ✅
Redis Exporter:       9121  ✅
```

## 📝 需要修改的文件

### 1. Oracle Adapter 配置
文件: `packages/oracle-adapter/.env.example`
```env
# 修改前
TORCHSERVE_URL=http://localhost:8080
WEAVIATE_URL=http://localhost:8080

# 修改后
TORCHSERVE_URL=http://localhost:8090
TORCHSERVE_MANAGEMENT_URL=http://localhost:8091
TORCHSERVE_METRICS_URL=http://localhost:8092
WEAVIATE_URL=http://localhost:8088
```

### 2. 根目录配置
文件: `.env.example`
```env
# 修改前
TORCHSERVE_URL=http://localhost:8080

# 修改后
TORCHSERVE_URL=http://localhost:8090
TORCHSERVE_MANAGEMENT_URL=http://localhost:8091
WEAVIATE_URL=http://localhost:8088
```

### 3. Docker Compose (如果添加 TorchServe)
需要添加 TorchServe 服务配置，使用新端口

### 4. Kubernetes 配置
文件: `k8s/ai-models/torchserve.yaml`
需要更新端口映射

## 🔧 实施步骤

1. **更新环境变量文件**
2. **更新 Docker Compose 配置**
3. **更新 Kubernetes 配置**
4. **更新应用代码中的硬编码端口**
5. **测试所有服务启动**

## ✅ 验证清单

- [ ] 所有服务可以同时启动
- [ ] 没有端口冲突错误
- [ ] 服务间通信正常
- [ ] 健康检查通过
- [ ] 前端可以访问后端 API
- [ ] 后端可以访问所有数据库
- [ ] AI 服务可以正常响应
- [ ] 监控服务可以收集指标

## 🚨 注意事项

1. **IPFS 端口 8080**: 保持不变，因为它在独立容器中运行
2. **Grafana 端口**: 改为 3001，避免与 Backend (3000) 冲突
3. **TorchServe**: 如果不使用，可以不启动，Oracle Adapter 会使用内置模型
4. **Weaviate**: 如果不使用，Vector DB 会使用内存实现

## 📊 最终端口映射表

| 服务 | 端口 | 协议 | 用途 |
|------|------|------|------|
| PostgreSQL | 5432 | TCP | 主数据库 |
| Redis | 6379 | TCP | 缓存 |
| MongoDB | 27017 | TCP | 文档数据库 |
| Kafka | 29092 | TCP | 消息队列 (外部) |
| ClickHouse | 8123 | HTTP | 分析数据库 |
| Elasticsearch | 9200 | HTTP | 搜索引擎 |
| Backend API | 3000 | HTTP | 后端服务 |
| Frontend | 5173 | HTTP | 前端开发服务器 |
| Oracle Adapter | 8000 | HTTP | AI 服务 |
| Bonding Service | 50051 | gRPC | 债券服务 |
| IPFS Gateway | 8080 | HTTP | IPFS 网关 |
| IPFS API | 5001 | HTTP | IPFS API |
| Adminer | 8081 | HTTP | 数据库管理 |
| Redis Commander | 8082 | HTTP | Redis 管理 |
| TorchServe | 8090 | HTTP | AI 模型推理 |
| TorchServe Mgmt | 8091 | HTTP | 模型管理 |
| Weaviate | 8088 | HTTP | 向量数据库 |
| Prometheus | 9090 | HTTP | 监控 |
| Grafana | 3001 | HTTP | 可视化 |

## 🎯 优先级

**P0 - 立即修复**:
- ✅ TorchServe 端口冲突
- ✅ Weaviate 端口冲突
- ✅ Grafana 端口冲突

**P1 - 建议修复**:
- 统一所有配置文件
- 添加端口验证脚本
- 文档化端口使用

**P2 - 可选**:
- 使用环境变量动态配置所有端口
- 添加端口冲突检测工具
