FROM python:3.8.6-slim-buster

# Install Conda for PDAL
ENV LANG=C.UTF-8 LC_ALL=C.UTF-8
ENV PATH /opt/conda/bin:$PATH

RUN apt-get update --fix-missing && \
    apt-get install -y wget bzip2 ca-certificates curl git && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

RUN wget --quiet https://repo.anaconda.com/miniconda/Miniconda3-4.5.11-Linux-x86_64.sh -O ~/miniconda.sh && \
    /bin/bash ~/miniconda.sh -b -p /opt/conda && \
    rm ~/miniconda.sh && \
    /opt/conda/bin/conda clean -tipsy && \
    ln -s /opt/conda/etc/profile.d/conda.sh /etc/profile.d/conda.sh && \
    echo ". /opt/conda/etc/profile.d/conda.sh" >> ~/.bashrc && \
    echo "conda activate base" >> ~/.bashrc

ENV TINI_VERSION v0.16.1
ADD https://github.com/krallin/tini/releases/download/${TINI_VERSION}/tini /usr/bin/tini
RUN chmod +x /usr/bin/tini

ENTRYPOINT [ "/usr/bin/tini", "--" ]
CMD [ "/bin/bash" ]

# Install ISP Toolbox Dependencies

RUN apt-get update && apt-get install -y \
binutils libproj-dev gdal-bin python3-gdal libglib2.0-0 libsm6 libxext6 libxrender-dev python3-pip procps
RUN mkdir -p /usr/src/app

WORKDIR /usr/src/app

# Install pdal from conda-forge in the base conda image
RUN conda install -c conda-forge -y pdal=2.2.0 python-pdal=2.3.5 gdal

ADD requirements.txt  /usr/src/app
# Build PDAL for point cloud operations
RUN pip3 install -r requirements.txt

ADD . /usr/src/app

EXPOSE 8000
CMD ["gunicorn webserver.wsgi -b 0.0.0.0 -w 6"]
