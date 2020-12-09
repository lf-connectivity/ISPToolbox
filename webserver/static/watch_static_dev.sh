npm install -g sass
cd /usr/src/app/mmwave
npm install
cd /usr/src/app/potree
npm install
(cd /usr/src/app/potree; npm run start) &
(cd /usr/src/app/mmwave; npm run watch) & 
(cd /usr/src/app/mmwave; sass --watch src/sass:build/stylesheets)