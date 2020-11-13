FROM nginx:latest
COPY nginx.default /etc/nginx/conf.d/default.conf
COPY nginx.htpasswd /etc/nginx/conf.d/nginx.htpasswd
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]