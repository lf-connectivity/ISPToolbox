FROM debian/snapshot:bookworm-20220316
RUN apt-get update --fix-missing && \
    apt-get install -y wget bzip2 ca-certificates curl git && \
    apt-get clean
RUN apt-get update && \
    apt-get install -y build-essential libssl-dev libffi-dev python3 python3-dev
# Install ISP Toolbox Dependencies
RUN apt-get update && apt-get install -y \
    binutils libproj-dev gdal-bin python3-gdal libglib2.0-0 libsm6 libxext6 libxrender-dev python3-pip procps \
    xmlsec1 python3-dev libssl-dev libsasl2-dev
RUN apt-get update && apt-get install -y libgdal-dev
RUN apt-get update && apt-get install -y pdal libpdal-dev
RUN apt-get update && apt-get install -y postgresql postgresql-contrib libgeos-dev
RUN apt-get update && apt-get install -y gfortran apt-utils cmake libpython3-dev

# Create Python virtual env
RUN apt-get update && apt-get install -y python3-venv
ENV VIRTUAL_ENV=/opt/venv
RUN python3 -m venv $VIRTUAL_ENV
ENV PATH="$VIRTUAL_ENV/bin:$PATH"

# Use TINI to avoid zombie processes
RUN apt-get install -y tini
ENTRYPOINT [ "/usr/bin/tini", "--" ]

RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app

ADD requirements.txt  /usr/src/app
RUN pip3 install -r requirements.txt

ADD . /usr/src/app

EXPOSE 8000
CMD ["gunicorn webserver.wsgi -b 0.0.0.0 -w 6"]
