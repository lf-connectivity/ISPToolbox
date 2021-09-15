FROM node:12
WORKDIR /usr/src/app
COPY package.json /usr/src/app/package.json
RUN npm install
ADD . /usr/src/app
CMD /bin/sh -c scripts/dev.sh