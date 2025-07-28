# Credential Management & Security Guide

## 🔒 Overview

This guide outlines best practices for managing credentials and sensitive information in the Dhruva Platform to prevent security vulnerabilities and credential exposure.

## ⚠️ Critical Security Rules

### 1. NEVER Commit Credentials to Git

**❌ NEVER DO THIS:**
```bash
# Bad - committing actual credentials
git add .env
git commit -m "Add environment configuration"
```

**✅ ALWAYS DO THIS:**
```bash
# Good - use .env.example templates
git add .env.example
git commit -m "Add environment configuration template"
```

### 2. Use Environment Variables

**❌ NEVER hardcode credentials:**
```python
# Bad
client = MongoClient('mongodb://dhruvaadmin:dhruva123@localhost:27017')
```

**✅ ALWAYS use environment variables:**
```python
# Good
import os
username = os.getenv('MONGO_APP_DB_USERNAME')
password = os.getenv('MONGO_APP_DB_PASSWORD')
client = MongoClient(f'mongodb://{username}:{password}@localhost:27017')
```

### 3. Secure .env File Management

1. **Copy template to create your .env:**
   ```bash
   cp .env.example .env
   ```

2. **Fill in actual values in .env (never commit this file)**

3. **Verify .env is gitignored:**
   ```bash
   git status  # .env should NOT appear in untracked files
   ```

## 🛡️ Security Checklist

### Before Every Commit

- [ ] Check that no .env files are staged: `git status`
- [ ] Verify no hardcoded passwords in code: `git diff --cached | grep -i password`
- [ ] Ensure all credentials use environment variables
- [ ] Run security scan: `git secrets --scan` (if available)

### Environment File Structure

```
Dhruva-Platform-2/
├── .env                          # ❌ NEVER COMMIT (actual credentials)
├── .env.example                  # ✅ COMMIT (template with placeholders)
├── .env.email_verification       # ⚠️  Only if contains placeholders
└── .env.email_verification_example # ✅ COMMIT (template)
```

## 🔧 Implementation Guide

### 1. Setting Up Secure Environment

```bash
# 1. Copy template
cp .env.example .env

# 2. Edit with your actual credentials
nano .env

# 3. Verify it's gitignored
git status  # Should not show .env as untracked

# 4. Test your application
docker-compose up
```

### 2. Creating New Environment Variables

When adding new credentials:

1. **Add to .env.example with placeholder:**
   ```bash
   # New service API key
   NEW_SERVICE_API_KEY=your-api-key-here
   ```

2. **Add to your local .env with actual value:**
   ```bash
   # New service API key
   NEW_SERVICE_API_KEY=sk-1234567890abcdef
   ```

3. **Update code to use environment variable:**
   ```python
   api_key = os.getenv('NEW_SERVICE_API_KEY')
   if not api_key:
       raise ValueError("NEW_SERVICE_API_KEY environment variable is required")
   ```

### 3. Rotating Compromised Credentials

If credentials are accidentally committed:

1. **Immediately rotate all exposed credentials**
2. **Remove from git history** (see Git History Cleanup section)
3. **Update all environments with new credentials**
4. **Force push clean history**

## 🚨 Emergency Response

### If Credentials Are Exposed

1. **IMMEDIATE ACTIONS:**
   - Rotate all exposed credentials immediately
   - Revoke API keys/tokens
   - Change database passwords
   - Update all deployment environments

2. **CLEANUP ACTIONS:**
   - Remove credentials from git history
   - Force push clean history
   - Notify team members
   - Update documentation

### Git History Cleanup

```bash
# Remove file from entire git history
git filter-branch --force --index-filter \
  'git rm --cached --ignore-unmatch path/to/file' \
  --prune-empty --tag-name-filter cat -- --all

# Force push to remote (DANGEROUS - coordinate with team)
git push origin --force --all
```

## 📋 Credential Types & Management

### Database Credentials
- **MongoDB**: `MONGO_APP_DB_USERNAME`, `MONGO_APP_DB_PASSWORD`
- **Redis**: `REDIS_PASSWORD`
- **TimescaleDB**: `TIMESCALE_PASSWORD`

### API Keys & Tokens
- **GitHub**: `GITHUB_PAT` (Personal Access Token)
- **JWT**: `JWT_SECRET_KEY`
- **External APIs**: Service-specific API keys

### Service Credentials
- **RabbitMQ**: `RABBITMQ_DEFAULT_PASS`
- **Grafana**: `GRAFANA_ADMIN_PASSWORD`
- **SMTP**: `SMTP_PASSWORD`

## 🔍 Security Monitoring

### Regular Security Audits

1. **Weekly**: Scan for hardcoded credentials in codebase
2. **Monthly**: Review and rotate long-term credentials
3. **Quarterly**: Full security assessment

### Automated Checks

Consider implementing:
- Pre-commit hooks to prevent credential commits
- Automated credential scanning in CI/CD
- Secret management tools (HashiCorp Vault, AWS Secrets Manager)

## 📚 Additional Resources

- [OWASP Secrets Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html)
- [GitHub Secret Scanning](https://docs.github.com/en/code-security/secret-scanning)
- [Git Secrets Tool](https://github.com/awslabs/git-secrets)

## 🆘 Support

If you discover a security vulnerability or need help with credential management:

1. **DO NOT** create a public issue
2. Contact the security team immediately
3. Follow responsible disclosure practices

---

**Remember: Security is everyone's responsibility. When in doubt, ask for help rather than risk exposure.**
