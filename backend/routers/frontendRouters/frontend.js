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

router.get('/duration-timeline', function(req, res) {
  res.sendfile('./frontend/views/duration-timeline.html');
});

router.get('/issue-timeline', function(req, res) {
  res.sendfile('./frontend/views/issue-timeline.html');
});

router.get('/amount-timeline', function(req, res) {
  res.sendfile('./frontend/views/amount-timeline.html');
});

router.get('/backlog-timeline', function(req, res) {
  res.sendfile('./frontend/views/backlog-timeline.html');
});

router.get('/custom-timeline', function(req, res) {
  res.sendfile('./frontend/views/custom-timeline.html');
});


module.exports = router;