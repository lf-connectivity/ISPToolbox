FROM node:12
RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app
ADD . /usr/src/app
RUN npm install
CMD /bin/sh -c scripts/dev.sh