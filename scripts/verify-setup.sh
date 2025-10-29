#!/bin/bash

# KnowTon Platform - 验证项目设置脚本

set -e

echo "🔍 Verifying KnowTon Platform Setup..."
echo ""

# 颜色定义
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 检查函数
check_file() {
    if [ -f "$1" ]; then
        echo -e "${GREEN}✓${NC} $1"
        return 0
    else
        echo -e "${RED}✗${NC} $1 (missing)"
        return 1
    fi
}

check_dir() {
    if [ -d "$1" ]; then
        echo -e "${GREEN}✓${NC} $1/"
        return 0
    else
        echo -e "${RED}✗${NC} $1/ (missing)"
        return 1
    fi
}

ERRORS=0

# 检查根目录文件
echo "📁 Root Configuration Files:"
check_file "package.json" || ((ERRORS++))
check_file "turbo.json" || ((ERRORS++))
check_file "tsconfig.json" || ((ERRORS++))
check_file ".eslintrc.json" || ((ERRORS++))
check_file ".prettierrc.json" || ((ERRORS++))
check_file ".gitignore" || ((ERRORS++))
check_file "docker-compose.yml" || ((ERRORS++))
check_file ".env.example" || ((ERRORS++))
check_file "README.md" || ((ERRORS++))
check_file "CONTRIBUTING.md" || ((ERRORS++))
check_file "LICENSE" || ((ERRORS++))
echo ""

# 检查包目录
echo "📦 Package Directories:"
check_dir "packages/contracts" || ((ERRORS++))
check_dir "packages/backend" || ((ERRORS++))
check_dir "packages/frontend" || ((ERRORS++))
check_dir "packages/sdk" || ((ERRORS++))
echo ""

# 检查 Contracts 包
echo "🔗 Contracts Package:"
check_file "packages/contracts/package.json" || ((ERRORS++))
check_file "packages/contracts/tsconfig.json" || ((ERRORS++))
check_file "packages/contracts/hardhat.config.ts" || ((ERRORS++))
check_file "packages/contracts/Dockerfile" || ((ERRORS++))
check_file "packages/contracts/.env.example" || ((ERRORS++))
echo ""

# 检查 Backend 包
echo "⚙️  Backend Package:"
check_file "packages/backend/package.json" || ((ERRORS++))
check_file "packages/backend/tsconfig.json" || ((ERRORS++))
check_file "packages/backend/Dockerfile" || ((ERRORS++))
check_file "packages/backend/.env.example" || ((ERRORS++))
echo ""

# 检查 SDK 包
echo "📚 SDK Package:"
check_file "packages/sdk/package.json" || ((ERRORS++))
check_file "packages/sdk/tsconfig.json" || ((ERRORS++))
echo ""

# 检查 Docker 配置
echo "🐳 Docker Configuration:"
check_file "docker-compose.yml" || ((ERRORS++))
check_file ".dockerignore" || ((ERRORS++))
check_file "packages/frontend/nginx.conf" || ((ERRORS++))
echo ""

# 检查 Kubernetes 配置
echo "☸️  Kubernetes Configuration:"
check_dir "k8s/dev" || ((ERRORS++))
check_file "k8s/dev/namespace.yaml" || ((ERRORS++))
check_file "k8s/dev/configmap.yaml" || ((ERRORS++))
check_file "k8s/dev/secrets.yaml" || ((ERRORS++))
check_file "k8s/dev/postgres.yaml" || ((ERRORS++))
check_file "k8s/dev/redis.yaml" || ((ERRORS++))
check_file "k8s/dev/backend-deployment.yaml" || ((ERRORS++))
check_file "k8s/dev/frontend-deployment.yaml" || ((ERRORS++))
check_file "k8s/dev/ingress.yaml" || ((ERRORS++))
echo ""

# 检查脚本
echo "📜 Scripts:"
check_file "scripts/init-db.sql" || ((ERRORS++))
check_file "scripts/clickhouse-init.sql" || ((ERRORS++))
check_file "scripts/setup-k8s-dev.sh" || ((ERRORS++))
echo ""

# 检查 GitHub Actions
echo "🔄 GitHub Actions:"
check_dir ".github/workflows" || ((ERRORS++))
check_file ".github/workflows/ci.yml" || ((ERRORS++))
check_file ".github/workflows/build-and-push.yml" || ((ERRORS++))
check_file ".github/workflows/deploy.yml" || ((ERRORS++))
check_file ".github/workflows/contract-security.yml" || ((ERRORS++))
check_file ".github/workflows/sonarqube.yml" || ((ERRORS++))
check_file ".github/dependabot.yml" || ((ERRORS++))
echo ""

# 检查 Git Hooks
echo "🪝 Git Hooks:"
check_dir ".husky" || ((ERRORS++))
check_file ".husky/pre-commit" || ((ERRORS++))
check_file ".husky/commit-msg" || ((ERRORS++))
check_file "commitlint.config.js" || ((ERRORS++))
check_file ".lintstagedrc.json" || ((ERRORS++))
echo ""

# 检查 Issue 模板
echo "📋 Issue Templates:"
check_file ".github/PULL_REQUEST_TEMPLATE.md" || ((ERRORS++))
check_file ".github/ISSUE_TEMPLATE/bug_report.md" || ((ERRORS++))
check_file ".github/ISSUE_TEMPLATE/feature_request.md" || ((ERRORS++))
echo ""

# 总结
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [ $ERRORS -eq 0 ]; then
    echo -e "${GREEN}✅ All checks passed! Setup is complete.${NC}"
    echo ""
    echo "Next steps:"
    echo "  1. npm install              # Install dependencies"
    echo "  2. npm run prepare          # Setup Git hooks"
    echo "  3. docker-compose up -d     # Start development services"
    echo "  4. npm run dev              # Start development"
else
    echo -e "${RED}❌ Found $ERRORS missing files or directories.${NC}"
    echo ""
    echo "Please review the errors above and ensure all files are created."
    exit 1
fi
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
