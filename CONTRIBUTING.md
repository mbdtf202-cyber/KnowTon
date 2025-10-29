# Contributing to KnowTon Platform

Thank you for your interest in contributing to KnowTon! This document provides guidelines and instructions for contributing.

## Code of Conduct

By participating in this project, you agree to abide by our Code of Conduct. Please be respectful and constructive in all interactions.

## Getting Started

### Prerequisites

- Node.js >= 18.0.0
- npm >= 9.0.0
- Git
- Docker & Docker Compose
- Kubernetes (Minikube or Kind)

### Setup Development Environment

1. Fork the repository
2. Clone your fork:
   ```bash
   git clone https://github.com/YOUR_USERNAME/knowton-platform.git
   cd knowton-platform
   ```

3. Install dependencies:
   ```bash
   npm install
   ```

4. Set up Git hooks:
   ```bash
   npm run prepare
   ```

5. Copy environment variables:
   ```bash
   cp .env.example .env
   ```

6. Start development services:
   ```bash
   docker-compose up -d
   ```

## Development Workflow

### Branch Naming Convention

- `feat/feature-name` - New features
- `fix/bug-description` - Bug fixes
- `docs/description` - Documentation updates
- `refactor/description` - Code refactoring
- `test/description` - Test additions or updates
- `chore/description` - Maintenance tasks

### Commit Message Convention

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <subject>

<body>

<footer>
```

Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation
- `style`: Code style (formatting, missing semicolons, etc.)
- `refactor`: Code refactoring
- `perf`: Performance improvement
- `test`: Adding tests
- `chore`: Maintenance tasks
- `ci`: CI/CD changes

Examples:
```bash
feat(contracts): add royalty distribution contract
fix(backend): resolve database connection timeout
docs(readme): update installation instructions
```

### Making Changes

1. Create a new branch:
   ```bash
   git checkout -b feat/your-feature-name
   ```

2. Make your changes

3. Run tests:
   ```bash
   npm test
   ```

4. Run linting:
   ```bash
   npm run lint
   ```

5. Format code:
   ```bash
   npm run format
   ```

6. Commit your changes:
   ```bash
   git add .
   git commit -m "feat: add new feature"
   ```

7. Push to your fork:
   ```bash
   git push origin feat/your-feature-name
   ```

8. Create a Pull Request

## Pull Request Process

1. Update the README.md or relevant documentation with details of changes
2. Update the CHANGELOG.md if applicable
3. Ensure all tests pass
4. Ensure code coverage is maintained or improved
5. Request review from maintainers
6. Address review comments
7. Once approved, your PR will be merged

### PR Checklist

- [ ] Code follows project style guidelines
- [ ] Self-review completed
- [ ] Comments added for complex code
- [ ] Documentation updated
- [ ] Tests added/updated
- [ ] All tests passing
- [ ] No new warnings
- [ ] Breaking changes documented

## Testing Guidelines

### Unit Tests

```bash
# Run all tests
npm test

# Run tests for specific package
cd packages/contracts && npm test
cd packages/backend && npm test
cd packages/frontend && npm test
```

### Integration Tests

```bash
# Run integration tests
npm run test:integration
```

### E2E Tests

```bash
# Run E2E tests
npm run test:e2e
```

### Test Coverage

Maintain minimum 80% code coverage:

```bash
npm run test:coverage
```

## Smart Contract Development

### Security Guidelines

1. Follow [Solidity Best Practices](https://consensys.github.io/smart-contract-best-practices/)
2. Use OpenZeppelin contracts when possible
3. Run security analysis:
   ```bash
   cd packages/contracts
   npm run slither
   npm run mythril
   ```
4. Ensure gas optimization
5. Add comprehensive tests (>90% coverage)

### Contract Testing

```bash
cd packages/contracts
npm test
npm run test:gas
```

## Code Style

### TypeScript/JavaScript

- Use TypeScript for all new code
- Follow ESLint configuration
- Use Prettier for formatting
- Prefer functional programming patterns
- Use async/await over promises
- Add JSDoc comments for public APIs

### Solidity

- Follow [Solidity Style Guide](https://docs.soliditylang.org/en/latest/style-guide.html)
- Use NatSpec comments
- Optimize for gas efficiency
- Use latest stable Solidity version

## Documentation

- Update README.md for user-facing changes
- Add JSDoc/NatSpec comments for code
- Update API documentation
- Add examples for new features
- Keep CHANGELOG.md updated

## Issue Reporting

### Bug Reports

Use the bug report template and include:
- Clear description
- Steps to reproduce
- Expected vs actual behavior
- Environment details
- Screenshots if applicable

### Feature Requests

Use the feature request template and include:
- Problem statement
- Proposed solution
- Use cases
- Benefits
- Technical considerations

## Community

- [Discord](https://discord.gg/knowton)
- [Twitter](https://twitter.com/knowton_io)
- [Forum](https://forum.knowton.io)

## Questions?

Feel free to ask questions in:
- GitHub Discussions
- Discord #dev-help channel
- Email: dev@knowton.io

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

Thank you for contributing to KnowTon! 🚀
