#!/bin/bash

# KnowTon Platform - Kubernetes 本地开发环境设置脚本

set -e

echo "🚀 Setting up KnowTon Kubernetes Development Environment..."

# 检查必要工具
check_tool() {
    if ! command -v $1 &> /dev/null; then
        echo "❌ $1 is not installed. Please install it first."
        exit 1
    fi
    echo "✅ $1 is installed"
}

echo "📋 Checking required tools..."
check_tool kubectl
check_tool helm

# 检查 Minikube 或 Kind
if command -v minikube &> /dev/null; then
    K8S_TOOL="minikube"
    echo "✅ Using Minikube"
elif command -v kind &> /dev/null; then
    K8S_TOOL="kind"
    echo "✅ Using Kind"
else
    echo "❌ Neither Minikube nor Kind is installed."
    echo "Please install one of them:"
    echo "  Minikube: https://minikube.sigs.k8s.io/docs/start/"
    echo "  Kind: https://kind.sigs.k8s.io/docs/user/quick-start/"
    exit 1
fi

# 启动 Kubernetes 集群
echo ""
echo "🔧 Starting Kubernetes cluster..."
if [ "$K8S_TOOL" = "minikube" ]; then
    if ! minikube status &> /dev/null; then
        echo "Starting Minikube..."
        minikube start --cpus=4 --memory=8192 --driver=docker
        minikube addons enable ingress
        minikube addons enable metrics-server
    else
        echo "Minikube is already running"
    fi
elif [ "$K8S_TOOL" = "kind" ]; then
    if ! kind get clusters | grep -q "kind"; then
        echo "Creating Kind cluster..."
        cat <<EOF | kind create cluster --config=-
kind: Cluster
apiVersion: kind.x-k8s.io/v1alpha4
nodes:
- role: control-plane
  kubeadmConfigPatches:
  - |
    kind: InitConfiguration
    nodeRegistration:
      kubeletExtraArgs:
        node-labels: "ingress-ready=true"
  extraPortMappings:
  - containerPort: 80
    hostPort: 80
    protocol: TCP
  - containerPort: 443
    hostPort: 443
    protocol: TCP
EOF
        # Install NGINX Ingress Controller for Kind
        kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/main/deploy/static/provider/kind/deploy.yaml
    else
        echo "Kind cluster is already running"
    fi
fi

# 等待集群就绪
echo ""
echo "⏳ Waiting for cluster to be ready..."
kubectl wait --for=condition=Ready nodes --all --timeout=300s

# 创建命名空间和资源
echo ""
echo "📦 Creating Kubernetes resources..."
kubectl apply -f k8s/dev/namespace.yaml
kubectl apply -f k8s/dev/configmap.yaml
kubectl apply -f k8s/dev/secrets.yaml

# 部署数据库和服务
echo ""
echo "🗄️  Deploying databases..."
kubectl apply -f k8s/dev/postgres.yaml
kubectl apply -f k8s/dev/redis.yaml

# 等待数据库就绪
echo ""
echo "⏳ Waiting for databases to be ready..."
kubectl wait --for=condition=Ready pod -l app=postgres -n knowton-dev --timeout=300s
kubectl wait --for=condition=Ready pod -l app=redis -n knowton-dev --timeout=300s

# 部署应用服务
echo ""
echo "🚀 Deploying application services..."
kubectl apply -f k8s/dev/backend-deployment.yaml
kubectl apply -f k8s/dev/frontend-deployment.yaml
kubectl apply -f k8s/dev/ingress.yaml

# 等待应用就绪
echo ""
echo "⏳ Waiting for applications to be ready..."
kubectl wait --for=condition=Ready pod -l app=backend -n knowton-dev --timeout=300s || true
kubectl wait --for=condition=Ready pod -l app=frontend -n knowton-dev --timeout=300s || true

# 显示状态
echo ""
echo "📊 Cluster Status:"
kubectl get all -n knowton-dev

# 获取访问信息
echo ""
echo "🌐 Access Information:"
if [ "$K8S_TOOL" = "minikube" ]; then
    echo "Frontend URL: http://$(minikube ip)"
    echo "Backend API: http://$(minikube ip)/api"
    echo ""
    echo "To access services, run: minikube tunnel"
elif [ "$K8S_TOOL" = "kind" ]; then
    echo "Frontend URL: http://localhost"
    echo "Backend API: http://localhost/api"
    echo ""
    echo "Add to /etc/hosts: 127.0.0.1 knowton.local"
fi

echo ""
echo "✅ Kubernetes development environment is ready!"
echo ""
echo "Useful commands:"
echo "  kubectl get pods -n knowton-dev          # List all pods"
echo "  kubectl logs -f <pod-name> -n knowton-dev # View logs"
echo "  kubectl describe pod <pod-name> -n knowton-dev # Pod details"
echo "  kubectl port-forward <pod-name> 3000:3000 -n knowton-dev # Port forward"
echo ""
if [ "$K8S_TOOL" = "minikube" ]; then
    echo "  minikube dashboard                       # Open Kubernetes dashboard"
    echo "  minikube stop                            # Stop cluster"
    echo "  minikube delete                          # Delete cluster"
fi
