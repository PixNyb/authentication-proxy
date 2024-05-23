FROM nginx:latest
RUN apt-get update && apt-get install -y gettext-base supervisor curl

COPY config/nginx.conf.template /etc/nginx/nginx.conf.template
COPY form.html.template /usr/share/nginx/html/login.html.template

RUN mkdir /app
COPY authenticator/package*.json /app
COPY authenticator/index.js /app

RUN curl -sL https://deb.nodesource.com/setup_22.x | bash -
RUN apt-get install -y nodejs

RUN cd /app && npm install

COPY config/supervisord.conf /etc/supervisor/conf.d/supervisord.conf

COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 80

ENTRYPOINT ["/entrypoint.sh"]