/*
* Copyright 2018-2019 Tampere University
* 
* Main authors: Anna-Liisa Mattila, Henri Terho, Antti Luoto, Hugo Fooy
* 
* Permission is hereby granted, free of charge, to any person obtaining a copy of
* this software and associated documentation files (the "Software"), to deal in 
* the Software without restriction, including without limitation the rights to 
* use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
* the Software, and to permit persons to whom the Software is furnished to do so, 
* subject to the following conditions:
* 
* The above copyright notice and this permission notice shall be included in all
* copies or substantial portions of the Software.
* 
* THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR 
* IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS 
* FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR 
* COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
* IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN 
* CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/

var express = require('express');
var router = express.Router();
const querystring = require('querystring');

var collector = require("../../../backend/data-collector/collector.js");

router.post('/', function (req, res) {
    res.setHeader('Content-Type', 'text/plain');
    console.log("DATA RECEIVED: ", req.body);

    var data = parse_data(req.body);
    console.log("Parsed data:", data);

    collector(data, function (e, err, type) {
        var error;
        var etype;

        if (e === true) { //all went well
            error = false;
            etype = false;
        } else {
            if (type === true) { // GET DATA error
                etype = 'getdata';
                var code = err.body.message !== undefined ? err.body.message : err.res;
                error = "Error during data collection: " + code + " at " + err.url + ".";
            } else { //SEND DATA error
                etype = 'senddata';
                error = "Error during data sending: " + err;
            }

            console.log("Error: ", error);
        }

        const query = querystring.stringify({
            "valid": e,
            "error": error,
            "type": etype
        });

        res.redirect('/api-collector?' + query);
        res.end('Data received.');
    });


});

var parse_data = function (body) {
    var api = body.api;
    var filters = {};

    switch (api) {
        case 'gitlab':
        case 'gitlab_pipelines':
            var userParams = body.projectName;
            var baseURL = body.url;
            var auth = {
                user: body.userName,
                password: body.pwd,
                token: body.token,
                method: body.authMethod
            };
            var origin = {
                source: body.source,
                context: body.context
            };

            filters = {
                userParams: userParams,
                baseURL: baseURL,
                auth: auth,
                origin: origin
            };

            break;

        case 'github':
            var userParams = {
                repo_owner: body.user,
                repo_name: body.repo
            };
            var auth = {
                user: body.userName,
                password: body.pwd,
                method: body.authMethod
            };
            var origin = {
                source: body.source,
                context: body.context
            };

            filters = {
                userParams: userParams,
                baseURL: baseURL,
                auth: auth,
                origin: origin
            };

            break;

        case 'jira':
            break;

        case 'jenkins':
            break;
    }


    return {
        filters: filters,
        api: api
    };
}

module.exports = router;