#!/bin/sh

# If the UPSTREAM_HOST and UPSTREAM_PORT environment variables are not set, exit
if [ -z "$UPSTREAM_HOST" ] || [ -z "$UPSTREAM_PORT" ]; then
  echo "UPSTREAM_HOST and UPSTREAM_PORT environment variables are required"
  exit 1
fi

# If set, make sure API_PATH is a valid path, starts with / and does not end with /.
if [ -n "$API_PATH" ]; then
  if [ "${API_PATH:0:1}" != "/" ]; then
    API_PATH="/$API_PATH"
  fi
  if [ "${API_PATH: -1}" == "/" ]; then
    API_PATH="${API_PATH%?}"
  fi
fi

export API_PATH

# Substitute environment variables in the NGINX configuration template
envsubst '$UPSTREAM_HOST $UPSTREAM_PORT $API_PATH' < /etc/nginx/nginx.conf.template > /etc/nginx/nginx.conf
envsubst '$UPSTREAM_HOST $UPSTREAM_PORT $API_PATH' < /usr/share/nginx/html/login.html.template > /usr/share/nginx/html/login.html

# Start Supervisor
/usr/bin/supervisord