# Security Policy

## 🔒 Report a Vulnerability

If you discover a security issue, please email **security@knowton.io** and include:

- Affected component (smart contract, backend, frontend, infrastructure)
- Steps to reproduce
- Impact assessment
- Suggested fix (if any)

**Please do not** open public issues for security vulnerabilities.

### PGP Key
```
[PGP key will be published here]
```

## 💰 Bug Bounty Program

### Scope
- Smart contracts (all deployed contracts on Arbitrum)
- Backend authentication & authorization
- Key management & encryption systems
- Critical public APIs
- Payment processing flows

### Rewards
- **Critical**: up to $50,000 (remote code execution, fund theft, complete auth bypass)
- **High**: up to $10,000 (privilege escalation, data breach, contract vulnerabilities)
- **Medium**: up to $2,000 (information disclosure, DoS, logic errors)
- **Low**: up to $500 (minor issues, best practice violations)

### Not in Scope
- Social engineering attacks
- Third-party infrastructure misconfigurations
- Low-risk information leaks
- Issues in dependencies (report to upstream)
- Rate limiting bypasses without demonstrated impact

## 📋 Security Audits

### Smart Contract Audits
- **Status**: Scheduled for Q1 2026
- **Planned auditors**: [To be announced]
- **Reports**: Will be published in `/AUDIT_REPORTS/`

### Backend Security Assessment
- **Status**: Internal review completed
- **External audit**: Planned for Q2 2026

## 🛡️ Security Measures

### Smart Contract Security
- **MultiSig**: Admin actions require Gnosis Safe 3-of-5 multisig
- **Timelock**: Protocol upgrades subject to 48-hour timelock
- **Static Analysis**: Slither, MythX integrated in CI/CD
- **Fuzzing**: Echidna and Foundry invariant testing
- **Pull Payments**: All payouts use withdraw pattern to prevent reentrancy

### Backend Security
- **Authentication**: JWT with refresh tokens, wallet signature verification
- **Authorization**: Role-based access control (RBAC)
- **Encryption**: AES-256 for sensitive data at rest, TLS 1.3 for data in transit
- **Rate Limiting**: Implemented on all public endpoints
- **Input Validation**: Comprehensive validation and sanitization
- **SQL Injection**: Parameterized queries and ORM usage
- **CSRF Protection**: Token-based protection on state-changing operations

### Infrastructure Security
- **Network**: VPC isolation, security groups, WAF
- **Secrets**: AWS Secrets Manager / HashiCorp Vault
- **Monitoring**: Real-time security event monitoring
- **Backups**: Encrypted daily backups with 30-day retention
- **DDoS Protection**: Cloudflare Pro with rate limiting

## 🔄 Incident Response

### Response Timeline
- **Critical**: 4 hours acknowledgment, 24 hours initial response
- **High**: 24 hours acknowledgment, 72 hours initial response
- **Medium**: 72 hours acknowledgment, 1 week initial response
- **Low**: 1 week acknowledgment, 2 weeks initial response

### Process
1. **Report received** → Triage and severity assessment
2. **Investigation** → Root cause analysis
3. **Mitigation** → Immediate fixes deployed
4. **Communication** → Affected users notified
5. **Post-mortem** → Public disclosure (if appropriate)

## 📊 Security Metrics

- **Last security audit**: Pending
- **Known vulnerabilities**: 0 critical, 0 high
- **Average response time**: TBD
- **Bug bounty payouts**: $0 (program launching soon)

## 🔐 Responsible Disclosure

We follow a 90-day disclosure policy:
1. Report received and acknowledged
2. Fix developed and tested
3. Fix deployed to production
4. 90 days after fix deployment, public disclosure (coordinated with reporter)

## 📞 Contact

- **Security email**: security@knowton.io
- **General inquiries**: contact@knowton.io
- **Emergency hotline**: [To be established]

---

**Last updated**: November 2, 2025
