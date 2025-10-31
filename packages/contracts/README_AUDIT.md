# 智能合约安全审计

## 快速开始

```bash
# 安装工具
pip3 install slither-analyzer mythril
npm install -g solhint

# 运行审计
npm run audit

# 或运行快速审计（只用已安装的工具）
./scripts/quick-audit.sh
```

## 可用命令

```bash
npm run audit          # 完整审计
npm run audit:slither  # Slither 静态分析
npm run audit:mythril  # Mythril 符号执行
npm run audit:echidna  # Echidna 模糊测试
npm run test:gas       # Gas 分析
npm run size           # 合约大小检查
```

## 审计报告

报告保存在 `audit-reports/audit_TIMESTAMP/` 目录下。

## CI/CD

GitHub Actions 会在 PR 时自动运行安全审计。
