#!/bin/bash

echo "🔍 检查部署准备状态"
echo "===================="
echo ""

# Check .env file
if [ ! -f .env ]; then
    echo "❌ .env 文件不存在"
    echo "   运行: cp .env.example .env"
    exit 1
fi

source .env

# Check PRIVATE_KEY
if [ -z "$PRIVATE_KEY" ]; then
    echo "❌ PRIVATE_KEY 未设置"
    echo "   在 .env 中设置你的钱包私钥"
    exit 1
fi

if [ "$PRIVATE_KEY" = "your_private_key_here" ]; then
    echo "❌ PRIVATE_KEY 未更新"
    echo "   请在 .env 中填入真实的私钥"
    exit 1
fi

echo "✅ PRIVATE_KEY 已配置"

# Check ARBISCAN_API_KEY
if [ -z "$ARBISCAN_API_KEY" ]; then
    echo "⚠️  ARBISCAN_API_KEY 未设置（可选）"
    echo "   从 https://arbiscan.io/myapikey 获取"
else
    echo "✅ ARBISCAN_API_KEY 已配置"
fi

# Check RPC URL
if [ -z "$ARBITRUM_SEPOLIA_RPC_URL" ]; then
    echo "⚠️  使用默认 RPC: https://sepolia-rollup.arbitrum.io/rpc"
else
    echo "✅ RPC URL: $ARBITRUM_SEPOLIA_RPC_URL"
fi

echo ""
echo "🎯 准备就绪！可以执行部署："
echo "   npm run deploy:sepolia"
echo ""
