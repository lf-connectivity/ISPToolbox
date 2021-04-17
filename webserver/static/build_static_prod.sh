npm install -g sass@1.32.8
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