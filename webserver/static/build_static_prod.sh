npm install -g sass
cd /usr/src/app/mmwave
npm install
cd /usr/src/app/potree
npm install
(cd /usr/src/app/potree; npm run build) &
(cd /usr/src/app/mmwave; npm run build) &
(cd /usr/src/app/mmwave; sass --no-source-map src/sass:build/stylesheets)