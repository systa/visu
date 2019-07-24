/*
 * Copyright (c) TUT Tampere University of Technology 2014-2015.
 * All rights reserved.
 * This software has been developed in Tekes-TIVIT project Need-for-Speed.
 * All rule set in consortium agreement of Need-for-Speed project apply.
 *
 * Main authors: Antti Luoto, Anna-Liisa Mattila, Henri Terho
 */
var express = require('express');
var router = express.Router();
const querystring = require('querystring');    

var collector = require("../../../backend/data-collector/collector.js");

router.post('/', function (req, res) {
    res.setHeader('Content-Type', 'text/plain');
    console.log("TEST DATA RECEIVED: ", req.body);
    
    //TODO: indicate to user that data has been processed (or not)

    var data = parse_data(req.body);
    collector(data, function(e, err, type) {
        var error;
        var etype;

        if (e === true) {//all went well
            error = false;
            etype = false;
        }else{
            if (type === true) { // GET DATA error
                etype = 'getdata';
                var code = err.body.message !== undefined ? err.body.message : err.res;
                error = "Error during data collection: " + code + " at " + err.url + ".";
            }else { //SEND DATA error
                etype = 'senddata';
                error = "Error during data sending: " + err;
            }

            console.log("TEST DATA RECEIVED: ", error);
            
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

    var userParams = body.projectName;
      
    var baseURL = body.url;
    var auth = {
        user: body.userName,
        password: body.pwd,
        token: body.token,
        method: body.authMethod
    }
    var origin = {
        source: body.source,
        context: body.context
    }

    var filters = {
        userParams: userParams,
        baseURL: baseURL,
        auth: auth,
        origin: origin
    };

    return {
        filters: filters,
        api: api
    };
}

module.exports = router;