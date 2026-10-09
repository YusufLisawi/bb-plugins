FROM nginx:1.27-alpine
COPY apps/web/ /usr/share/nginx/html/
COPY deploy/nginx-web.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
