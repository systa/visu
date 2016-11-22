/*
* Copyright (c) TUT Tampere University of Technology 2014-2015.
* All rights reserved.
* This software has been developed in Tekes-TIVIT project Need-for-Speed.
* All rule set in consortium agreement of Need-for-Speed project apply.
*
* Main authors: Antti Luoto, Anna-Liisa Mattila, Henri Terho
*/

//main API file which requires all the different sub API files and serves it to the server.js

var express = require('express');
var router = express.Router();


var constructAPI = require('./constructApi.js');
var eventsAPI = require('./eventsApi.js');

//load other API files here
router.use('/constructs', constructAPI);
router.use('/events', eventsAPI);

//serve a simple status check api to easily test if the API is running
router.get('/', function(req,res){
	res.status(200).send("Api is running!");
});


module.exports = router;

