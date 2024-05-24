FROM nginx:latest

RUN apt-get update && apt-get install -y gettext-base supervisor curl
RUN curl -sL https://deb.nodesource.com/setup_22.x | bash -
RUN apt-get install -y nodejs

COPY config/nginx.conf.template /etc/nginx/nginx.conf.template
COPY form.html.template /usr/share/nginx/html/login.html.template

RUN mkdir /app
COPY authenticator/package*.json /app
COPY authenticator/index.js /app

RUN cd /app && npm install

COPY config/supervisord.conf /etc/supervisor/conf.d/supervisord.conf

COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]

HEALTHCHECK --interval=5s --timeout=5s --start-period=1s --retries=15 CMD curl -f http://localhost:85 || exit 1

EXPOSE 80
