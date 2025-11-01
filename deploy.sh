#!/bin/bash

# ============================================
# KnowTon Platform - 一键部署
# ============================================

set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
PURPLE='\033[0;35m'
NC='\033[0m'

clear

echo -e "${PURPLE}"
cat << "EOF"
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   ██╗  ██╗███╗   ██╗ ██████╗ ██╗    ██╗████████╗ ██████╗ ║
║   ██║ ██╔╝████╗  ██║██╔═══██╗██║    ██║╚══██╔══╝██╔═══██╗║
║   █████╔╝ ██╔██╗ ██║██║   ██║██║ █╗ ██║   ██║   ██║   ██║║
║   ██╔═██╗ ██║╚██╗██║██║   ██║██║███╗██║   ██║   ██║   ██║║
║   ██║  ██╗██║ ╚████║╚██████╔╝╚███╔███╔╝   ██║   ╚██████╔╝║
║   ╚═╝  ╚═╝╚═╝  ╚═══╝ ╚═════╝  ╚══╝╚══╝    ╚═╝    ╚═════╝ ║
║                                                           ║
║            Web3 知识产权平台 - 一键部署工具                ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
EOF
echo -e "${NC}"

echo ""
echo -e "${BLUE}请选择部署方式:${NC}"
echo ""
echo "  1) 🚀 快速部署 (本地开发环境)"
echo "     - 启动本地区块链"
echo "     - 部署合约到本地网络"
echo "     - 启动前端和后端"
echo "     - 预计时间: 3-5 分钟"
echo ""
echo "  2) 🏗️  完整部署 (包含所有服务)"
echo "     - 启动所有基础设施"
echo "     - 部署智能合约"
echo "     - 构建并启动所有服务"
echo "     - 预计时间: 10-15 分钟"
echo ""
echo "  3) 🌐 测试网部署 (Arbitrum Sepolia)"
echo "     - 部署到公共测试网"
echo "     - 需要测试网 ETH"
echo "     - 预计时间: 15-20 分钟"
echo ""
echo "  4) 🔍 验证部署状态"
echo "     - 检查所有服务是否正常运行"
echo ""
echo "  5) 🛑 停止所有服务"
echo "     - 停止所有运行中的服务"
echo ""
echo "  6) 📚 查看部署指南"
echo "     - 打开详细的部署文档"
echo ""
echo "  0) 退出"
echo ""

read -p "请输入选项 (0-6): " choice

case $choice in
    1)
        echo ""
        echo -e "${GREEN}🚀 开始快速部署...${NC}"
        echo ""
        ./scripts/quick-deploy.sh
        ;;
    2)
        echo ""
        echo -e "${GREEN}🏗️  开始完整部署...${NC}"
        echo ""
        ./scripts/full-deployment.sh
        ;;
    3)
        echo ""
        echo -e "${YELLOW}⚠️  测试网部署需要:${NC}"
        echo "  1. 钱包私钥"
        echo "  2. 测试网 ETH (从水龙头获取)"
        echo "  3. Arbiscan API Key (可选)"
        echo ""
        read -p "是否已准备好? (y/n) " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            echo ""
            echo -e "${GREEN}🌐 开始测试网部署...${NC}"
            echo ""
            
            # 检查私钥是否配置
            if grep -q "PRIVATE_KEY=$" .env 2>/dev/null || ! grep -q "PRIVATE_KEY=" .env 2>/dev/null; then
                echo -e "${YELLOW}请输入你的钱包私钥:${NC}"
                read -s PRIVATE_KEY
                echo ""
                
                # 更新 .env 文件
                if [ -f .env ]; then
                    sed -i.bak "s/PRIVATE_KEY=.*/PRIVATE_KEY=$PRIVATE_KEY/" .env
                else
                    cp .env.example .env
                    sed -i.bak "s/PRIVATE_KEY=.*/PRIVATE_KEY=$PRIVATE_KEY/" .env
                fi
                
                echo -e "${GREEN}✓ 私钥已配置${NC}"
            fi
            
            ./scripts/full-deployment.sh
        else
            echo ""
            echo -e "${BLUE}请先准备好以下内容:${NC}"
            echo "  1. 访问 https://faucet.quicknode.com/arbitrum/sepolia 获取测试网 ETH"
            echo "  2. 在 .env 文件中配置 PRIVATE_KEY"
            echo "  3. (可选) 在 https://arbiscan.io/myapikey 获取 API Key"
            echo ""
        fi
        ;;
    4)
        echo ""
        echo -e "${GREEN}🔍 验证部署状态...${NC}"
        echo ""
        ./scripts/verify-deployment.sh
        ;;
    5)
        echo ""
        echo -e "${YELLOW}🛑 停止所有服务...${NC}"
        echo ""
        ./scripts/stop-services.sh
        ;;
    6)
        echo ""
        echo -e "${BLUE}📚 打开部署指南...${NC}"
        echo ""
        if command -v less &> /dev/null; then
            less DEPLOYMENT_GUIDE.md
        else
            cat DEPLOYMENT_GUIDE.md
        fi
        ;;
    0)
        echo ""
        echo -e "${GREEN}再见！${NC}"
        exit 0
        ;;
    *)
        echo ""
        echo -e "${YELLOW}无效的选项${NC}"
        exit 1
        ;;
esac

echo ""
echo -e "${GREEN}════════════════════════════════════════${NC}"
echo -e "${GREEN}操作完成！${NC}"
echo -e "${GREEN}════════════════════════════════════════${NC}"
echo ""

if [ "$choice" != "5" ] && [ "$choice" != "6" ]; then
    echo -e "${BLUE}有用的命令:${NC}"
    echo "  • 查看服务状态: ./deploy.sh (选择选项 4)"
    echo "  • 停止服务: ./deploy.sh (选择选项 5)"
    echo "  • 查看日志: docker-compose -f docker-compose.simple.yml logs -f"
    echo ""
    
    echo -e "${BLUE}访问地址:${NC}"
    echo "  • 前端: http://localhost:5173"
    echo "  • 后端: http://localhost:3000"
    echo "  • Grafana: http://localhost:3001"
    echo ""
fi

echo -e "${BLUE}需要帮助?${NC}"
echo "  • 查看部署指南: ./deploy.sh (选择选项 6)"
echo "  • 查看 README: cat README.md"
echo ""
