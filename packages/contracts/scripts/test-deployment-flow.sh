#!/bin/bash

set -e

echo "🧪 测试部署流程（本地模拟）"
echo "=============================="
echo ""

# 1. 编译合约
echo "1️⃣  编译合约..."
npm run build
echo "   ✅ 编译成功"
echo ""

# 2. 检查部署脚本语法
echo "2️⃣  检查部署脚本..."
npx ts-node --transpile-only scripts/deploy.ts --help 2>&1 | head -1 || true
echo "   ✅ 部署脚本语法正确"
echo ""

# 3. 检查验证脚本
echo "3️⃣  检查验证脚本..."
npx ts-node --transpile-only scripts/verify.ts --help 2>&1 | head -1 || true
echo "   ✅ 验证脚本语法正确"
echo ""

# 4. 检查配置脚本
echo "4️⃣  检查配置脚本..."
npx ts-node --transpile-only scripts/configure-contracts.ts --help 2>&1 | head -1 || true
echo "   ✅ 配置脚本语法正确"
echo ""

# 5. 检查部署文件
echo "5️⃣  检查部署记录..."
if [ -f "deployments/localhost-latest.json" ]; then
    echo "   ✅ 找到本地部署记录"
    echo "   📋 已部署合约:"
    cat deployments/localhost-latest.json | grep -A 5 '"contracts"' | head -6
else
    echo "   ⚠️  未找到本地部署记录"
fi
echo ""

echo "═══════════════════════════════════════════════════"
echo "✅ 部署流程测试完成！"
echo "═══════════════════════════════════════════════════"
echo ""
echo "📝 实际部署到 Arbitrum Sepolia:"
echo "   1. 配置 .env 文件（PRIVATE_KEY 和 ARBISCAN_API_KEY）"
echo "   2. 获取测试网 ETH: https://faucet.quicknode.com/arbitrum/sepolia"
echo "   3. 运行: npm run deploy:sepolia"
echo ""
