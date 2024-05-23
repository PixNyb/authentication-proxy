# Dockerised Authentication Proxy

This is a Dockerised authentication for use cases where basic authentication doesn't cut it.
It uses Nginx as a reverse proxy to authenticate users with a username and password using a html form and a Node.js server to issue access and refresh tokens.

## Usage

### Build the Docker image

```bash
docker build -t authentication-proxy .
```

### Run the Docker container

To run the Docker container, you can use the following command:

```bash
docker run \
    -p 8000:80 \
    -e UPSTREAM_HOST=service \
    -e UPSTREAM_PORT=80 \
    -e AUTHORISED_USERS=user:password-hash \
    pixnyb/
```

This command will start the container and expose ports `80` for the web server. It will also proxy requests to the `service` host on port `80` and authenticate users with the username `user` and password `password`.

The image is availlable on [Docker Hub](https://hub.docker.com/r/pixnyb/authentication-proxy).

#### Environment Variables

When running the container, you can pass the following environment variables to customise the container:

- `UPSTREAM_HOST`: The host to proxy requests to. (Required)
- `UPSTREAM_PORT`: The port to proxy requests to. (Required)
- `ACCESS_TOKEN_SECRET`: The secret key to use for signing the access token. (Required)
- `REFRESH_TOKEN_SECRET`: The secret key to use for signing the refresh token. (Required)
- `API_PATH`: The prefix path for the API. (Optional, default: `/`)
- `COOKIE_PREFIX`: The prefix for the cookie name. (Optional, default: ``)
- `AUTHORISED_USERS`: A list of authorised users in the format `username:password-hash` delimited by a comma. (Optional)
- `AUTHORIZED_USERS_FILE`: The path to a file containing authorised users in the format `username:password-hash` *Same format as a `.htpasswd` file*. (Optional)

> [!NOTE]
> The `AUTHORISED_USERS` and `AUTHORIZED_USERS_FILE` environment variables are mutually exclusive. You can only use one of them at a time. If both are provided, the `AUTHORIZED_USERS_FILE` variable will take precedence.

## Example

To demonstrate how to use the Dockerised authentication proxy, we will create an authenticated proxy for a [vscode instance](https://hub.docker.com/r/pixnyb/code).

```yaml
services:
  proxy:
    image: pixnyb/authentication-proxy
    hostname: proxy
    ports:
      - 8000:80
    environment:
      - UPSTREAM_HOST=code
      - UPSTREAM_PORT=8000
      - ACCESS_TOKEN_SECRET=secret
      - REFRESH_TOKEN_SECRET=secret
      - AUTHORISED_USERS=user:<password-hash>
  code:
    image: pixnyb/code
    hostname: code
    environment:
      - VSCODE_KEYRING_PASS=password
      - GIT_GLOBAL_USER_NAME=PixNyb
      - GIT_GLOBAL_USER_EMAIL=contact@roelc.me
      - GH_TOKEN=<...>
      - GPG_SECRET_KEY=<...>
      - REPO_URL=<...>
      - INIT_SCRIPT_URL=https://example.com/init.sh
    volumes:
      - /etc/localtime:/etc/localtime:ro
      - /var/run/docker.sock:/var/run/docker.sock:ro
```

In this example, we have a `proxy` service that proxies requests to the `code` service. The `code` service is a vscode instance that is authenticated with the `AUTHORISED_USERS` environment variable.