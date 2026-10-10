# Security Policy

The Apex LMS maintainers take the security and integrity of academic library data seriously. We appreciate responsible disclosure of potential security vulnerabilities.

---

## 🛡️ Supported Versions

We provide security updates and patches for the following versions:

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |
| < 1.0   | :x:                |

---

## 🔒 Reporting a Vulnerability

**Please do not report security vulnerabilities via public GitHub Issues or Discussions.**

If you discover a security vulnerability in Apex LMS, please report it privately:

1. **Email Disclosure**: Send details to **<!-- TODO: your.email@example.com -->** with the subject line `[SECURITY] Apex LMS Vulnerability Report`.
2. **GitHub Security Advisory**: Alternatively, submit a private advisory via GitHub's **Security Advisories** tab on the repository.

### What to Include in Your Report:
- Detailed description of the vulnerability.
- Step-by-step instructions or Proof of Concept (PoC) script to reproduce the issue.
- Potential impact and affected components/routes.
- Any suggested fixes or mitigations.

### Our Commitment:
- We will acknowledge receipt of your report within **48 hours**.
- We will provide an initial assessment and timeline for a patch within **5 business days**.
- Once a fix is verified, we will release a security patch release and credit the reporter (unless anonymity is requested).

---

## 🛡️ Built-in Security Design Principles

Apex LMS implements the following security measures out of the box:

- **Password Protection**: Passwords hashed using bcrypt (10 salt rounds).
- **Brute Force Protection**: IP-based in-memory sliding window rate limiter on `/api/auth/*`.
- **Role-Based Access Control (RBAC)**: Token-verified authorization guarding all sensitive librarian and admin endpoints.
- **SQL Injection Prevention**: 100% parameterized SQL queries using SQLite prepared statements.
- **Audit Trails**: Non-repudiation audit logging for all critical circulation, fine collection, and book mutation events.
- **Privacy & Anonymization**: Automatic retention and anonymization policies for expired event guest passes and student loan histories.
