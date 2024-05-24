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
export PAGE_SERVICE_NAME="${PAGE_SERVICE_NAME:-this service}"

# If there PAGE_ADMINISTRATOR_EMAIL is not set, set the PAGE_ADMINISTRATOR_TEXT to "Contact the administrator"
if [ -z "$PAGE_ADMINISTRATOR_EMAIL" ]; then
  export PAGE_ADMINISTRATOR_EMAIL=""
  export PAGE_ADMINISTRATOR_TEXT="Contact the administrator"
else
  export PAGE_ADMINISTRATOR_TEXT="Contact the administrator at <a href='mailto:$PAGE_ADMINISTRATOR_EMAIL'>$PAGE_ADMINISTRATOR_EMAIL</a>"
fi

# Substitute environment variables in the NGINX configuration template
envsubst '$UPSTREAM_HOST $UPSTREAM_PORT $API_PATH' < /etc/nginx/nginx.conf.template > /etc/nginx/nginx.conf
envsubst '$UPSTREAM_HOST $UPSTREAM_PORT $API_PATH $PAGE_SERVICE_NAME $PAGE_ADMINISTRATOR_TEXT' < /usr/share/nginx/html/login.html.template > /usr/share/nginx/html/login.html

# Wait for the upstream service to be available
echo "Waiting for upstream to be available..."
while ! curl -s $UPSTREAM_HOST:$UPSTREAM_PORT > /dev/null; do
  sleep 5
done

# Start Supervisor
/usr/bin/supervisord