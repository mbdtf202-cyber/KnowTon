module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      [
        'feat',     // 新功能
        'fix',      // 修复bug
        'docs',     // 文档更新
        'style',    // 代码格式（不影响代码运行的变动）
        'refactor', // 重构（既不是新增功能，也不是修改bug的代码变动）
        'perf',     // 性能优化
        'test',     // 增加测试
        'chore',    // 构建过程或辅助工具的变动
        'revert',   // 回滚
        'build',    // 构建系统或外部依赖的变动
        'ci',       // CI配置文件和脚本的变动
      ],
    ],
    'subject-case': [0],
  },
};
