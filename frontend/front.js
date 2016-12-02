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

//serve HTML content 
router.get('/', function(req, res) {
  res.sendfile('./frontend/views/index.html');
});

router.get('/test-data-vis', function(req, res) {
	res.sendfile('./frontend/views/test-data-vis.html');
});

router.get('/stacked-timeline-vis', function(req, res) {
	res.sendfile('./frontend/views/stacked-timeline.html');
});

module.exports = router;