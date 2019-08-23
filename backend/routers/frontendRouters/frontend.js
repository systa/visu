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
router.get('/pipeline-timeline', function(req, res) {
  res.sendfile('./frontend/views/visualizations/pipeline-timeline.html');
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