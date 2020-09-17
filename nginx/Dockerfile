FROM nginx:latest
COPY nginx.default /etc/nginx/conf.d/default.conf
ADD static /var/www/html/static/
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]