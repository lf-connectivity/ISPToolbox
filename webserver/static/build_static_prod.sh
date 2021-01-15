npm install -g sass
cd /usr/src/app/isptoolbox
npm install
cd /usr/src/app/potree
npm install
cd /usr/src/app/potree
npm run build
cd /usr/src/app/isptoolbox
npm run build
cd /usr/src/app/isptoolbox
sass --no-source-map src/sass:build/stylesheets