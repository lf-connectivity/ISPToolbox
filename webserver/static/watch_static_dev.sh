# (c) Meta Platforms, Inc. and affiliates. Copyright
npm install -g sass@1.32.8
cd /usr/src/app/isptoolbox
npm install
cd /usr/src/app/potree
npm install
(cd /usr/src/app/potree; npm run start) &
(cd /usr/src/app/isptoolbox; npm run watch) & 
(cd /usr/src/app/isptoolbox; sass --watch src/sass:build/stylesheets)