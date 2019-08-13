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

//Serve HTML content 
router.get('/', function(req, res) {
  res.sendfile('./frontend/views/index.html');
});

//Visualizations
router.get('/issue-timeline', function(req, res) {
  res.sendfile('./frontend/views/visualizations/issue-timeline.html');
});
router.get('/amount-timeline', function(req, res) {
  res.sendfile('./frontend/views/visualizations/amount-timeline.html');
});
router.get('/duration-timeline', function(req, res) {
  res.sendfile('./frontend/views/visualizations/duration-timeline.html');
});
router.get('/session-timeframe', function(req, res) {
  res.sendfile('./frontend/views/visualizations/session-timeframe.html');
});
router.get('/user-timeframe', function(req, res) {
  res.sendfile('./frontend/views/visualizations/user-timeframe.html');
});
router.get('/dashboard', function(req, res) {
  res.sendfile('./frontend/views/visualizations/combined-dashboard.html');
});


//Data collectors
router.get('/api-collector', function(req, res) {
  //var e = req.query.valid;
  res.sendfile('./frontend/views/collectors/api-collector.html');
});
router.get('/jenkins', function(req, res) {
  res.sendfile('./frontend/views/collectors/jenkins.html');
});
router.get('/jira', function(req, res) {
  res.sendfile('./frontend/views/collectors/jira.html');
});
router.get('/github', function(req, res) {
  res.sendfile('./frontend/views/collectors/github.html');
});
router.get('/gitlab', function(req, res) {
  res.sendfile('./frontend/views/collectors/gitlab.html');
});
router.get('/gitlab-pipe', function(req, res) {
  res.sendfile('./frontend/views/collectors/gitlab-pipe.html');
});

//Database
router.get('/database', function(req, res) {
  var url = 'http://' + req.rawHeaders[1].split(':')[0] + ':8081/db/visu';
  console.log(url);
  res.redirect(url);
});


module.exports = router;