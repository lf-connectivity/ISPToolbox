FROM python:3-onbuild
COPY . /usr/src/app
# RUN apt-get update && apt-get install nginx vim -y --no-install-recommends
COPY nginx.default /etc/nginx/sites-available/default
# RUN ln -sf /dev/stdout /var/log/nginx/access.log \
#     && ln -sf /dev/stderr /var/log/nginx/error.log
CMD ["/usr/scr/app/run_django_server.sh"]

EXPOSE 80