# Kubernetes Deployment Example

This document demonstrates how to deploy the authentication proxy in a Kubernetes environment.

## Prerequisites

- kubectl configured to communicate with your cluster

## Kubernetes Manifests

Below is an example Kubernetes manifest that deploys:
- The authentication proxy service
- Traefik as an ingress controller
- A sample protected application (whoami)
- Required secrets and configuration

```yaml
---
# Create a namespace for our authentication setup
apiVersion: v1
kind: Namespace
metadata:
  name: auth-system

---
# Secrets for authentication configuration
apiVersion: v1
kind: Secret
metadata:
  name: auth-secrets
  namespace: auth-system
type: Opaque
stringData:
  ACCESS_TOKEN_SECRET: "replace-with-a-secure-random-string"
  REFRESH_TOKEN_SECRET: "replace-with-a-different-secure-random-string"
  SESSION_SECRET: "replace-with-another-secure-random-string"
  # Local user credentials (user:password - encrypted as md5 hash)
  LOCAL_LOCAL_USERS: "user:$$apr1$$PJ3UdeuW$$sdScbEB7d/HK0mFIx/oN1."
  # OAuth2 GitHub configuration
  OAUTH2_GITHUB_CLIENT_ID: "your-github-client-id"
  OAUTH2_GITHUB_CLIENT_SECRET: "your-github-client-secret"
  # Google OAuth configuration
  GOOGLE_GOOGLE_CLIENT_ID: "your-google-client-id"
  GOOGLE_GOOGLE_CLIENT_SECRET: "your-google-client-secret"

---
# ConfigMap for non-sensitive configuration
apiVersion: v1
kind: ConfigMap
metadata:
  name: auth-config
  namespace: auth-system
data:
  AUTH_HOST: "auth.example.com"
  COOKIE_HOSTS: "auth.example.com"
  COOKIE_HOSTS_USE_ROOT: "true"
  COOKIE_SECURE: "true"
  FORM_TITLE: "Authentication Portal"
  # GitHub OAuth configuration
  OAUTH2_GITHUB_AUTH_URL: "https://github.com/login/oauth/authorize"
  OAUTH2_GITHUB_TOKEN_URL: "https://github.com/login/oauth/access_token"
  OAUTH2_GITHUB_USER_URL: "https://api.github.com/user"
  OAUTH2_GITHUB_DOMAIN_WHITELIST: "example.com"
  OAUTH2_GITHUB_ICON: "fab fa-github"
  OAUTH2_GITHUB_DISPLAY_NAME: "GitHub"
  # Google OAuth configuration
  GOOGLE_GOOGLE_DISPLAY_NAME: "Google"
  GOOGLE_GOOGLE_USER_WHITELIST: "user@example.com"

---
# Authentication Proxy Deployment
apiVersion: apps/v1
kind: Deployment
metadata:
  name: auth-proxy
  namespace: auth-system
spec:
  replicas: 2
  selector:
    matchLabels:
      app: auth-proxy
  template:
    metadata:
      labels:
        app: auth-proxy
    spec:
      containers:
      - name: auth-proxy
        image: pixnyb/authentication-proxy:latest
        ports:
        - containerPort: 3000
        envFrom:
        - secretRef:
            name: auth-secrets
        - configMapRef:
            name: auth-config
        resources:
          requests:
            memory: "128Mi"
            cpu: "100m"
          limits:
            memory: "256Mi"
            cpu: "500m"
        readinessProbe:
          httpGet:
            path: /
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 10
        livenessProbe:
          httpGet:
            path: /
            port: 3000
          initialDelaySeconds: 15
          periodSeconds: 20

---
# Authentication Proxy Service
apiVersion: v1
kind: Service
metadata:
  name: auth-proxy
  namespace: auth-system
spec:
  selector:
    app: auth-proxy
  ports:
  - port: 3000
    targetPort: 3000
    name: http

---
# Traefik Middleware for Forward Authentication
apiVersion: traefik.containo.us/v1alpha1
kind: Middleware
metadata:
  name: forward-auth
  namespace: auth-system
spec:
  forwardAuth:
    address: http://auth-proxy:3000
    trustForwardHeader: true
    authResponseHeaders:
    - X-Forwarded-User

---
# Traefik IngressRoute for the Authentication Proxy
apiVersion: traefik.containo.us/v1alpha1
kind: IngressRoute
metadata:
  name: auth-proxy-route
  namespace: auth-system
spec:
  entryPoints:
    - websecure
  routes:
  - match: Host(`auth.example.com`)
    kind: Rule
    services:
    - name: auth-proxy
      port: 3000
  tls:
    certResolver: le

---
# Example whoami application
apiVersion: apps/v1
kind: Deployment
metadata:
  name: whoami
  namespace: auth-system
spec:
  replicas: 1
  selector:
    matchLabels:
      app: whoami
  template:
    metadata:
      labels:
        app: whoami
    spec:
      containers:
      - name: whoami
        image: containous/whoami
        ports:
        - containerPort: 80

---
# Service for whoami
apiVersion: v1
kind: Service
metadata:
  name: whoami
  namespace: auth-system
spec:
  selector:
    app: whoami
  ports:
  - port: 80
    targetPort: 80

---
# Protected IngressRoute for whoami
apiVersion: traefik.containo.us/v1alpha1
kind: IngressRoute
metadata:
  name: whoami-route
  namespace: auth-system
spec:
  entryPoints:
    - websecure
  routes:
  - match: Host(`whoami.example.com`)
    kind: Rule
    services:
    - name: whoami
      port: 80
    middlewares:
    - name: forward-auth
      namespace: auth-system
  tls:
    certResolver: le
```

## Installation Instructions

1. Save the above YAML to a file named `auth-proxy-k8s.yaml`

2. Replace placeholder values in the manifest:
   - Update domains (`auth.example.com`, `whoami.example.com`)
   - Replace secret values with secure strings
   - Configure OAuth credentials for your providers

3. Apply the manifest to your cluster:
   ```bash
   kubectl apply -f auth-proxy-k8s.yaml
   ```

4. Ensure Traefik is configured with TLS support and the Let's Encrypt certificate resolver.

## Notes

- This example assumes Traefik CRDs are already installed in your cluster. If using a different ingress controller, modify the ingress configuration accordingly.
- For production deployments, consider using an external secrets management solution like HashiCorp Vault or AWS Secrets Manager.
- Scale the auth-proxy deployment based on your expected load.
