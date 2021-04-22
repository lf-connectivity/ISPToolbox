"use strict";
/**
 * Nodejs Server used for high-throughput websocket connections
 *
 * Django-Channels was not working for high throughput, low latency operations
 */
var socketIOPort = 8080;
var io = require('socket.io')();
io.on('connection', function (client) { console.log(client); });
console.log("Listening for connections on port: " + socketIOPort);
io.listen(socketIOPort);
