'use strict';
var fs = require('fs');

var empty_tile;

function loadEmptyTile(){
    if(!empty_tile){
        empty_tile = fs.readFileSync('./empty-tile.png');
    }
}

exports.handler = (event, context, callback) => {
    const response = event.Records[0].cf.response;

    /**
     * This function updates the response status to 204 if object is not available
     */

    if (response.status == 404) {
        loadEmptyTile();
        response.status = 200;
        response.statusDescription = "Tile not found"
        response.headers['content-type'] = [{key: 'Content-Type', value: "image/png"}]; 
        response.body = empty_tile.toString('base64');
        response.bodyEncoding = 'base64';
    }

    callback(null, response);
};