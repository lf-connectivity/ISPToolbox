FROM nginx:latest
COPY nginx.default /etc/nginx/conf.d/default.conf
ADD static /var/www/html/static/
CMD ["nginx", "-g", "daemon off;"]
EXPOSE 80
