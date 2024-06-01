# Docker Swarm example

This file contains an example of how to deploy the authentication proxy in a Docker Swarm environment.

## Prerequisites

- A Docker Swarm cluster
- A reverse proxy (e.g. Traefik) to route traffic to the authentication proxy

## Stack definition

The following is an example of a stack definition for the authentication proxy:

```yaml
services:
  traefik:
    image: traefik:2.11
    command:
      - --providers.docker
      - --providers.docker.exposedbydefault=false
      - --providers.docker.swarmmode
      - --entrypoints.http.address=:80
      - --entrypoints.https.address=:443
      - --certificatesresolvers.le.acme.tlschallenge=true
      - --accesslog
      - --log
      - --api
    ports:
      - 80:80
      - 443:443
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
    networks:
      - traefik
    deploy:
      placement:
        constraints:
          - node.role == manager
      labels:
        - traefik.enable=true
        - traefik.docker.network=traefik
        # Catch all http requests and redirect to https
        - traefik.http.routers.http-catchall.rule=HostRegexp(`{host:.+}`)
        - traefik.http.routers.http-catchall.entrypoints=http
        - traefik.http.routers.http-catchall.middlewares=https-redirect
        - traefik.http.routers.http-catchall.priority=1
        - traefik.http.middlewares.https-redirect.redirectscheme.scheme=https
        - traefik.http.middlewares.https-redirect.redirectscheme.permanent=true
        # Traefik dashboard
        - traefik.http.routers.traefik-https.rule=Host(`traefik.x.x`)
        - traefik.http.routers.traefik-https.entrypoints=https
        - traefik.http.routers.traefik-https.tls=true
        - traefik.http.routers.traefik-https.tls.certresolver=le
        - traefik.http.routers.traefik-https.service=api@internal
        - traefik.http.routers.traefik-https.middlewares=auth
        - traefik.http.services.traefik.loadbalancer.server.port=8080

  auth:
    image: pixnyb/authentication-proxy:latest
    environment:
      - AUTH_HOST=auth.x.x
      - COOKIE_HOSTS=auth.x.x,auth.x.y
      - COOKIE_HOSTS_USE_ROOT=true
      - ACCESS_TOKEN_SECRET=x
      - REFRESH_TOKEN_SECRET=x
      - LOCAL_LOCAL_USERS=x
      - GOOGLE_GOOGLE_CLIENT_ID=x
      - GOOGLE_GOOGLE_CLIENT_SECRET=x
      - GOOGLE_GOOGLE_USER_WHITELIST=x
      - OAUTH2_GITHUB_AUTH_URL=https://github.com/login/oauth/authorize
      - OAUTH2_GITHUB_TOKEN_URL=https://github.com/login/oauth/access_token
      - OAUTH2_GITHUB_USER_URL=https://api.github.com/user
      - OAUTH2_GITHUB_CLIENT_ID=x
      - OAUTH2_GITHUB_CLIENT_SECRET=x
      - OAUTH2_GITHUB_DOMAIN_WHITELIST=x.x
      - OAUTH2_GITHUB_ICON=fab fa-github
    networks:
      - traefik
    deploy:
      mode: replicated
      replicas: 1
      labels:
        - traefik.enable=true
        - traefik.docker.network=traefik
        - traefik.http.routers.auth.rule=Host(`auth.x.x`) || Host(`auth.x.y`)
        - traefik.http.routers.auth.tls=true
        - traefik.http.routers.auth.tls.certresolver=le
        - traefik.http.routers.auth.entrypoints=https
        - traefik.http.middlewares.auth.forwardauth.address=http://auth:3000
        - traefik.http.middlewares.auth.forwardauth.trustForwardHeader=true
        - traefik.http.middlewares.auth.forwardauth.authResponseHeaders=X-Forwarded-User
        - traefik.http.services.auth.loadbalancer.server.port=3000

  whoami:
    image: containous/whoami
    networks:
      - traefik
    deploy:
      mode: replicated
      replicas: 1
      labels:
        - traefik.enable=true
        - traefik.docker.network=traefik
        - traefik.http.routers.whoami.rule=Host(`whoami.x.x`) || Host(`whoami.x.y`)
        - traefik.http.routers.whoami.entrypoints=https
        - traefik.http.routers.whoami.tls=true
        - traefik.http.routers.whoami.tls.certresolver=le
        - traefik.http.routers.whoami.service=whoami
        - traefik.http.routers.whoami.middlewares=auth
        - traefik.http.services.whoami.loadbalancer.server.port=80
```

> [!WARNING]
> Currently setting the auth middleware on the auth service will cause the service to be unable to authenticate anyone. This is because the auth service will try to authenticate itself, which will cause an infinite loop. This will be fixed in a future release.
