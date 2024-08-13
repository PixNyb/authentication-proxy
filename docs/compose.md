# Docker Compose example

This directory contains examples of how to deploy the authentication proxy in a Docker compose environment.

## Prerequisites

- Docker compose

## Compose definition

The following is an example of a compose definition for the authentication proxy:

```yaml
services:
  traefik:
    image: traefik:v2.2
    command:
      - "--api.insecure=true"
      - "--providers.docker=true"
      - "--providers.docker.exposedbydefault=false"
      - "--entrypoints.web.address=:80"
    ports:
      - "80:80"
    volumes:
      - "/var/run/docker.sock:/var/run/docker.sock"
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.traefik.rule=Host(`traefik.x.y`)"
      - "traefik.http.services.traefik.loadbalancer.server.port=8080"
      - "traefik.http.routers.traefik.entrypoints=web"
      - "traefik.http.routers.traefik.middlewares=auth"
      - "traefik.http.middlewares.auth.forwardauth.address=http://auth:3000"

  auth:
    build: .
    environment:
      - AUTH_HOST=auth.x.y
      - COOKIE_HOSTS=auth.x.y
      - COOKIE_HOSTS_USE_ROOT=true
      - ACCESS_TOKEN_SECRET=x
      - REFRESH_TOKEN_SECRET=x
      - LOCAL_LOCAL_USERS=user:$$apr1$$PJ3UdeuW$$sdScbEB7d/HK0mFIx/oN1. # user:password
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.auth.rule=Host(`auth.x.y`)"
      - "traefik.http.services.auth.loadbalancer.server.port=3000"
      - "traefik.http.routers.auth.entrypoints=web"

  whoami:
    image: containous/whoami
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.whoami.rule=Host(`whoami.x.y`)"
      - "traefik.http.services.whoami.loadbalancer.server.port=80"
      - "traefik.http.routers.whoami.entrypoints=web"
      - "traefik.http.routers.whoami.middlewares=auth"
```
