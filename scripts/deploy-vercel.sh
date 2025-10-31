#!/bin/bash

# Vercel 部署脚本
# 使用方法: ./scripts/deploy-vercel.sh [--prod]

set -e

echo "🚀 开始部署到 Vercel..."

# 检查是否安装了 Vercel CLI
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI 未安装"
    echo "请运行: npm install -g vercel"
    exit 1
fi

# 检查是否在项目根目录
if [ ! -f "package.json" ]; then
    echo "❌ 请在项目根目录运行此脚本"
    exit 1
fi

# 构建前端项目
echo "📦 构建前端项目..."
npm run build:frontend

if [ $? -ne 0 ]; then
    echo "❌ 前端构建失败"
    exit 1
fi

echo "✅ 前端构建成功"

# 部署到 Vercel
if [ "$1" = "--prod" ]; then
    echo "🌐 部署到生产环境..."
    vercel --prod
else
    echo "🧪 部署到预览环境..."
    vercel
fi

if [ $? -eq 0 ]; then
    echo "🎉 部署成功！"
    echo ""
    echo "📋 下一步："
    echo "1. 在 Vercel Dashboard 中配置环境变量"
    echo "2. 设置自定义域名（可选）"
    echo "3. 配置后端 API 地址"
    echo ""
    echo "📖 详细说明请查看 VERCEL_DEPLOYMENT.md"
else
    echo "❌ 部署失败"
    exit 1
fi