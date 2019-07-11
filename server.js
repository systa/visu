/*
* Copyright (c) TUT Tampere University of Technology 2014-2015.
* All rights reserved.
* This software has been developed in Tekes-TIVIT project Need-for-Speed.
* All rule set in consortium agreement of Need-for-Speed project apply.
*
* Main authors: Antti Luoto, Anna-Liisa Mattila, Henri Terho
*/

//require separate db module
//var db = require()

var express = require('express');
var app     = express();
var mongoose = require('mongoose');
var bodyParser = require('body-parser');
var methodOverride = require('method-override');
var errorHandler = require('errorhandler');
var config = require('config');


//config
app.use(bodyParser.urlencoded({
    extended: true,
    limit: '50mb'
  }));
app.use(bodyParser.json());
app.use(methodOverride());
app.use(express.static(__dirname + '/frontend'));
app.use(errorHandler({dumpExceptions: true, showStack: true}));

//DATABASE 
var db = require("./backend/database/database.js");

//-------------
//----ROUTES---
//-------------
//require the routers
var routing = require('./backend/routers/routes.js');
app.use('/', routing);

server = app.listen(config.get('port'));
console.log("[server.js]Server listening on port " + config.get('port'));