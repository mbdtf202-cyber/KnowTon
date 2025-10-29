# Kubernetes 配置

KnowTon 平台的 Kubernetes 部署配置。

## 目录结构

```
k8s/
├── dev/                    # 开发环境配置
│   ├── namespace.yaml
│   ├── configmap.yaml
│   ├── secrets.yaml
│   ├── postgres.yaml
│   ├── redis.yaml
│   ├── backend-deployment.yaml
│   ├── frontend-deployment.yaml
│   └── ingress.yaml
├── staging/                # 预发布环境配置
└── production/             # 生产环境配置
```

## 快速开始

### 前置要求

- kubectl
- Minikube 或 Kind
- Helm (可选)

### 安装 Minikube

```bash
# macOS
brew install minikube

# Linux
curl -LO https://storage.googleapis.com/minikube/releases/latest/minikube-linux-amd64
sudo install minikube-linux-amd64 /usr/local/bin/minikube
```

### 安装 Kind

```bash
# macOS
brew install kind

# Linux
curl -Lo ./kind https://kind.sigs.k8s.io/dl/v0.20.0/kind-linux-amd64
chmod +x ./kind
sudo mv ./kind /usr/local/bin/kind
```

## 部署

### 自动部署（推荐）

```bash
# 运行设置脚本
./scripts/setup-k8s-dev.sh
```

### 手动部署

```bash
# 1. 启动 Minikube
minikube start --cpus=4 --memory=8192

# 2. 启用插件
minikube addons enable ingress
minikube addons enable metrics-server

# 3. 创建命名空间
kubectl apply -f k8s/dev/namespace.yaml

# 4. 创建 ConfigMap 和 Secrets
kubectl apply -f k8s/dev/configmap.yaml
kubectl apply -f k8s/dev/secrets.yaml

# 5. 部署数据库
kubectl apply -f k8s/dev/postgres.yaml
kubectl apply -f k8s/dev/redis.yaml

# 6. 部署应用
kubectl apply -f k8s/dev/backend-deployment.yaml
kubectl apply -f k8s/dev/frontend-deployment.yaml
kubectl apply -f k8s/dev/ingress.yaml

# 7. 查看状态
kubectl get all -n knowton-dev
```

## 访问服务

### Minikube

```bash
# 获取 Minikube IP
minikube ip

# 启动隧道（在新终端）
minikube tunnel

# 访问服务
# Frontend: http://<minikube-ip>
# Backend API: http://<minikube-ip>/api
```

### Kind

```bash
# 添加到 /etc/hosts
echo "127.0.0.1 knowton.local" | sudo tee -a /etc/hosts

# 访问服务
# Frontend: http://knowton.local
# Backend API: http://knowton.local/api
```

## 常用命令

```bash
# 查看所有资源
kubectl get all -n knowton-dev

# 查看 Pods
kubectl get pods -n knowton-dev

# 查看日志
kubectl logs -f <pod-name> -n knowton-dev

# 进入容器
kubectl exec -it <pod-name> -n knowton-dev -- /bin/sh

# 端口转发
kubectl port-forward <pod-name> 3000:3000 -n knowton-dev

# 查看 Pod 详情
kubectl describe pod <pod-name> -n knowton-dev

# 删除资源
kubectl delete -f k8s/dev/

# 重启 Deployment
kubectl rollout restart deployment/backend -n knowton-dev
```

## 监控

```bash
# 查看资源使用
kubectl top nodes
kubectl top pods -n knowton-dev

# 查看事件
kubectl get events -n knowton-dev --sort-by='.lastTimestamp'

# Minikube Dashboard
minikube dashboard
```

## 故障排查

### Pod 无法启动

```bash
# 查看 Pod 状态
kubectl describe pod <pod-name> -n knowton-dev

# 查看日志
kubectl logs <pod-name> -n knowton-dev

# 查看事件
kubectl get events -n knowton-dev
```

### 服务无法访问

```bash
# 检查 Service
kubectl get svc -n knowton-dev

# 检查 Ingress
kubectl get ingress -n knowton-dev
kubectl describe ingress knowton-ingress -n knowton-dev

# 测试服务连接
kubectl run -it --rm debug --image=busybox --restart=Never -- wget -O- http://backend-service/health
```

### 数据库连接问题

```bash
# 测试 PostgreSQL 连接
kubectl run -it --rm psql --image=postgres:16-alpine --restart=Never -- psql -h postgres-service -U knowton -d knowton

# 测试 Redis 连接
kubectl run -it --rm redis --image=redis:7-alpine --restart=Never -- redis-cli -h redis-service -a knowton_redis_password ping
```

## 清理

```bash
# 删除所有资源
kubectl delete namespace knowton-dev

# 停止 Minikube
minikube stop

# 删除 Minikube 集群
minikube delete

# 删除 Kind 集群
kind delete cluster
```

## Helm Charts (未来)

计划使用 Helm 简化部署：

```bash
# 安装
helm install knowton ./helm/knowton -n knowton-dev

# 升级
helm upgrade knowton ./helm/knowton -n knowton-dev

# 卸载
helm uninstall knowton -n knowton-dev
```
