FROM nginx:1.27-alpine
COPY apps/admin/ /usr/share/nginx/html/
COPY deploy/nginx-admin.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
