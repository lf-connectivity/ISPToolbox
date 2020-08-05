FROM python:3.8.0-slim-buster
RUN mkdir -p /usr/src/app
ADD requirements.txt  /usr/src/app
WORKDIR /usr/src/app
RUN pip install -r requirements.txt
RUN apt-get update && apt-get install -y \
gdal-bin python-gdal python3-gdal libglib2.0-0 libsm6 libxext6 libxrender-dev
# RUN apt-get update && apt-get install nginx vim -y --no-install-recommends
# RUN ln -sf /dev/stdout /var/log/nginx/access.log \
#     && ln -sf /dev/stderr /var/log/nginx/error.log
ADD . /usr/src/app

CMD ["/usr/src/app/run_django_server.sh"]

EXPOSE 80