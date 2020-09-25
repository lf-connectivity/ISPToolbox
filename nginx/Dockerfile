FROM nginx:latest
COPY nginx.default /etc/nginx/conf.d/default.conf
ADD static /var/www/html/test-static/
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]