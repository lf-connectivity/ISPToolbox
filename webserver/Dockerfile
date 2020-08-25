FROM python:3.8.0-slim-buster
RUN mkdir -p /usr/src/app
ADD requirements.txt  /usr/src/app
WORKDIR /usr/src/app
RUN apt-get update && apt-get install -y \
gdal-bin python-gdal python3-gdal libglib2.0-0 libsm6 libxext6 libxrender-dev
RUN pip install -r requirements.txt

ADD . /usr/src/app

CMD ["/usr/src/app/run_django_server.sh"]

EXPOSE 80