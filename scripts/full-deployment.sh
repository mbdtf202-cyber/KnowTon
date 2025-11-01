#!/bin/bash

# ============================================
# KnowTon Platform - 全面部署脚本
# ============================================
# 此脚本将完成：
# 1. 环境检查和配置
# 2. 智能合约部署到测试网
# 3. 构建所有服务的 Docker 镜像
# 4. 启动所有基础设施和服务
# 5. 运行验证测试
# ============================================

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m'

# 日志函数
log_header() {
    echo ""
    echo -e "${PURPLE}============================================${NC}"
    echo -e "${PURPLE}  $1${NC}"
    echo -e "${PURPLE}============================================${NC}"
    echo ""
}

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[✓]${NC} $1"
}

log_error() {
    echo -e "${RED}[✗]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[!]${NC} $1"
}

log_step() {
    echo ""
    echo -e "${CYAN}▶ $1${NC}"
    echo ""
}

# 错误处理
handle_error() {
    log_error "部署失败于第 $1 行"
    log_error "错误信息: $2"
    exit 1
}

trap 'handle_error $LINENO "$BASH_COMMAND"' ERR

# 开始部署
clear
log_header "KnowTon Platform - 全面部署"
log_info "开始时间: $(date '+%Y-%m-%d %H:%M:%S')"
log_info "部署模式: 测试网 (Arbitrum Sepolia)"
echo ""

# ============================================
# 阶段 1: 环境检查
# ============================================
log_header "阶段 1/6: 环境检查"

log_step "检查必需的工具..."

# 检查 Node.js
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    log_success "Node.js: $NODE_VERSION"
else
    log_error "Node.js 未安装"
    exit 1
fi

# 检查 npm
if command -v npm &> /dev/null; then
    NPM_VERSION=$(npm --version)
    log_success "npm: $NPM_VERSION"
else
    log_error "npm 未安装"
    exit 1
fi

# 检查 Docker
if command -v docker &> /dev/null; then
    DOCKER_VERSION=$(docker --version | cut -d' ' -f3 | cut -d',' -f1)
    log_success "Docker: $DOCKER_VERSION"
else
    log_error "Docker 未安装"
    exit 1
fi

# 检查 Docker Compose
if command -v docker-compose &> /dev/null; then
    COMPOSE_VERSION=$(docker-compose --version | cut -d' ' -f4 | cut -d',' -f1)
    log_success "Docker Compose: $COMPOSE_VERSION"
else
    log_error "Docker Compose 未安装"
    exit 1
fi

log_step "检查环境配置文件..."

# 检查 .env 文件
if [ ! -f ".env" ]; then
    log_warning ".env 文件不存在，从模板创建..."
    cp .env.example .env
    log_success "已创建 .env 文件"
    log_warning "请编辑 .env 文件并填入必要的配置"
    log_warning "特别是 PRIVATE_KEY 和 ARBISCAN_API_KEY"
    read -p "按 Enter 继续编辑 .env 文件..." 
    ${EDITOR:-nano} .env
else
    log_success ".env 文件存在"
fi

# 加载环境变量
source .env

# 检查关键配置
log_step "验证关键配置..."

if [ -z "$PRIVATE_KEY" ] || [ "$PRIVATE_KEY" = "" ]; then
    log_warning "PRIVATE_KEY 未设置"
    log_info "对于本地测试，我们将使用 Hardhat 的默认账户"
    USE_LOCAL_NETWORK=true
else
    log_success "PRIVATE_KEY 已配置"
    USE_LOCAL_NETWORK=false
fi

# 检查合约目录的 .env
if [ ! -f "packages/contracts/.env" ]; then
    log_warning "packages/contracts/.env 不存在，创建中..."
    cat > packages/contracts/.env << EOF
ARBITRUM_SEPOLIA_RPC_URL=https://sepolia-rollup.arbitrum.io/rpc
PRIVATE_KEY=${PRIVATE_KEY}
ARBISCAN_API_KEY=${ARBISCAN_API_KEY}
EOF
    log_success "已创建 packages/contracts/.env"
fi

log_success "环境检查完成"

# ============================================
# 阶段 2: 安装依赖
# ============================================
log_header "阶段 2/6: 安装依赖"

log_step "安装项目依赖..."

if [ ! -d "node_modules" ]; then
    log_info "首次安装，这可能需要几分钟..."
    npm install --legacy-peer-deps
    log_success "依赖安装完成"
else
    log_info "更新依赖..."
    npm install --legacy-peer-deps
    log_success "依赖更新完成"
fi

# ============================================
# 阶段 3: 启动基础设施
# ============================================
log_header "阶段 3/6: 启动基础设施服务"

log_step "启动 Docker 基础设施..."

# 停止可能存在的旧容器
log_info "清理旧容器..."
docker-compose -f docker-compose.simple.yml down -v 2>/dev/null || true

# 启动基础设施
log_info "启动数据库和消息队列..."
docker-compose -f docker-compose.simple.yml up -d postgres mongodb redis kafka

# 等待服务就绪
log_step "等待服务启动..."
sleep 10

# 检查服务状态
log_info "检查服务状态..."
docker-compose -f docker-compose.simple.yml ps

log_success "基础设施服务已启动"

# ============================================
# 阶段 4: 部署智能合约
# ============================================
log_header "阶段 4/6: 部署智能合约"

cd packages/contracts

log_step "编译智能合约..."
npm run compile
log_success "合约编译完成"

if [ "$USE_LOCAL_NETWORK" = true ]; then
    log_step "启动本地 Hardhat 网络..."
    
    # 在后台启动 Hardhat 节点
    npx hardhat node > ../../hardhat-node.log 2>&1 &
    HARDHAT_PID=$!
    echo $HARDHAT_PID > ../../hardhat-node.pid
    
    log_info "Hardhat 节点 PID: $HARDHAT_PID"
    log_info "等待节点启动..."
    sleep 5
    
    log_step "部署合约到本地网络..."
    npm run deploy:local
    
    NETWORK_NAME="localhost"
    CHAIN_ID="31337"
else
    log_step "部署合约到 Arbitrum Sepolia..."
    log_warning "这将消耗真实的测试网 ETH"
    log_warning "确保你的钱包有足够的 Sepolia ETH"
    
    read -p "继续部署? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log_error "用户取消部署"
        exit 1
    fi
    
    npm run deploy:sepolia
    
    NETWORK_NAME="arbitrumSepolia"
    CHAIN_ID="421614"
fi

log_success "智能合约部署完成"

# 读取部署的合约地址
DEPLOYMENT_FILE="deployments/${NETWORK_NAME}-latest.json"
if [ -f "$DEPLOYMENT_FILE" ]; then
    log_info "读取合约地址..."
    
    # 提取合约地址（使用 node 来解析 JSON）
    CONTRACT_ADDRESSES=$(node -e "
        const fs = require('fs');
        const data = JSON.parse(fs.readFileSync('$DEPLOYMENT_FILE', 'utf8'));
        console.log(JSON.stringify(data.contracts, null, 2));
    ")
    
    echo "$CONTRACT_ADDRESSES"
    
    # 保存到根目录
    cp "$DEPLOYMENT_FILE" "../../deployed-contracts.json"
    log_success "合约地址已保存到 deployed-contracts.json"
else
    log_error "未找到部署文件: $DEPLOYMENT_FILE"
fi

cd ../..

# ============================================
# 阶段 5: 更新配置并构建服务
# ============================================
log_header "阶段 5/6: 构建应用服务"

log_step "更新前端配置..."

# 从部署文件读取合约地址并更新前端 .env
if [ -f "deployed-contracts.json" ]; then
    node -e "
        const fs = require('fs');
        const deployment = JSON.parse(fs.readFileSync('deployed-contracts.json', 'utf8'));
        const contracts = deployment.contracts;
        
        let envContent = \`VITE_CHAIN_ID=${CHAIN_ID}
VITE_NETWORK_NAME=${NETWORK_NAME}
VITE_RPC_URL=\${deployment.rpcUrl || 'http://localhost:8545'}
\`;
        
        for (const [name, address] of Object.entries(contracts)) {
            const envName = name.replace(/([A-Z])/g, '_\$1').toUpperCase();
            envContent += \`VITE_\${envName}_ADDRESS=\${address}\n\`;
        }
        
        fs.writeFileSync('packages/frontend/.env.local', envContent);
        console.log('前端配置已更新');
    "
    log_success "前端配置已更新"
fi

log_step "构建前端应用..."
cd packages/frontend
npm run build
log_success "前端构建完成"
cd ../..

log_step "构建后端服务..."
cd packages/backend
npm run build
log_success "后端构建完成"
cd ../..

# ============================================
# 阶段 6: 启动所有服务
# ============================================
log_header "阶段 6/6: 启动所有服务"

log_step "启动完整的服务栈..."

# 启动所有服务
docker-compose -f docker-compose.simple.yml up -d

log_info "等待服务完全启动..."
sleep 15

# 显示服务状态
log_step "服务状态:"
docker-compose -f docker-compose.simple.yml ps

log_success "所有服务已启动"

# ============================================
# 部署完成
# ============================================
log_header "部署完成！"

log_success "KnowTon Platform 已成功部署"
echo ""

log_info "部署信息:"
echo "  • 网络: $NETWORK_NAME"
echo "  • Chain ID: $CHAIN_ID"
echo "  • 部署时间: $(date '+%Y-%m-%d %H:%M:%S')"
echo ""

log_info "服务访问地址:"
echo "  • 前端应用: http://localhost:5173"
echo "  • 后端 API: http://localhost:3000"
echo "  • API 文档: http://localhost:3000/api-docs"
echo "  • Grafana: http://localhost:3001 (admin/admin)"
echo "  • Prometheus: http://localhost:9090"
echo ""

if [ "$USE_LOCAL_NETWORK" = true ]; then
    log_info "本地区块链:"
    echo "  • Hardhat 节点: http://localhost:8545"
    echo "  • Chain ID: 31337"
    echo "  • 日志文件: hardhat-node.log"
    echo ""
fi

log_info "合约地址:"
if [ -f "deployed-contracts.json" ]; then
    node -e "
        const fs = require('fs');
        const data = JSON.parse(fs.readFileSync('deployed-contracts.json', 'utf8'));
        for (const [name, address] of Object.entries(data.contracts)) {
            console.log(\`  • \${name}: \${address}\`);
        }
    "
fi
echo ""

log_info "有用的命令:"
echo "  • 查看日志: docker-compose -f docker-compose.simple.yml logs -f [service]"
echo "  • 停止服务: docker-compose -f docker-compose.simple.yml down"
echo "  • 重启服务: docker-compose -f docker-compose.simple.yml restart [service]"
echo "  • 查看合约: cat deployed-contracts.json"
echo ""

if [ "$USE_LOCAL_NETWORK" = true ]; then
    log_info "停止本地区块链:"
    echo "  • kill \$(cat hardhat-node.pid)"
    echo ""
fi

log_info "下一步:"
echo "  1. 访问 http://localhost:5173 查看前端应用"
echo "  2. 连接 MetaMask 到本地网络或测试网"
echo "  3. 开始测试平台功能"
echo "  4. 查看 Grafana 监控面板"
echo ""

log_success "祝你使用愉快！🎉"
echo ""

# 保存部署信息
cat > deployment-info.txt << EOF
KnowTon Platform 部署信息
========================

部署时间: $(date '+%Y-%m-%d %H:%M:%S')
网络: $NETWORK_NAME
Chain ID: $CHAIN_ID

服务地址:
- 前端: http://localhost:5173
- 后端: http://localhost:3000
- Grafana: http://localhost:3001
- Prometheus: http://localhost:9090

合约部署文件: deployed-contracts.json

日志文件:
- Hardhat 节点: hardhat-node.log (如果使用本地网络)
- Docker 日志: docker-compose -f docker-compose.simple.yml logs

停止服务:
docker-compose -f docker-compose.simple.yml down

重启服务:
docker-compose -f docker-compose.simple.yml up -d
EOF

log_info "部署信息已保存到 deployment-info.txt"
