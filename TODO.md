# Security

1. Rate limiting
   - Login attempt rate limiting
   - General API rate limiting
   - Failed login attempt tracking

2. Input validation
   - Validate user & password inputs
   - Request body size limits
   - E-mail format validation for OAuth

3. Security headers
   - CORS configuration
   - Adding security headers (e.g., X-Content-Type-Options)

# Authentication & Session Management

1. Session management improvements
   - Session timeout handling
   - Concurrent session limiting per user

2. OAuth
   - Allow the authentication server to act as an OAuth provider*

# Authorization

1. Role-based access control (RBAC)*
   - Define roles and permissions
   - Assign roles to users

# Observability

1. Enhanced logging
   - Security event logging
   - Audit logging
   - User activity logging

2. Health & Status monitoring
   - Provider health checks
   - Performance metrics

# User Experience

1. Self-service features*
   - Password reset functionality for local/LDAP users
   - User profile management
   - Login history view

2. Additional provider support
   - SAML support

3. MFA (Multi-Factor Authentication)*
   - Support for TOTP (Time-based One-Time Password)
   - Support for WebAuthn

# Configuration & Deployment

1. Runtime configuration
   - Configuration hot-reloading
   - Configuration options in the UI(*?)

* Indicates features that will most likely require a storage backend, such as a database or key-value store, to persist data across restarts. Decision on storage backend and if this will be implemented at all is still pending.