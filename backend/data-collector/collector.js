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

var fs = require('fs');
//console.log(" - #collector: : fs");
var path = require('path');
//console.log(" - #collector: : path");
// prompt is a library for getting user input
var request = require('request');
//console.log(" - #collector: : request");

var _ = require('underscore');
//console.log(" - #collector: : underscore");


// the module that actually gets the data
var GET_DATA = require('./getdata.js');
//console.log(" - #collector: : getdata");

// module that sends the data to db
var SEND_DATA = require('./poster.js');
//console.log(" - #collector: : poster");


var collector = function (p, callback) {
  var par = p || {};

  var _filters = par.filters !== undefined ? par.filters : console.log("[collector]Filters undefined!");
  var _api = par.api !== undefined ? par.api : console.log("[collector]API undefined!");

  // the api i.e. source description used in getting the data
  var _API = null;
  // request defaults used to make HTTP requests to the source api
  var _baseRequest = request;
  // the authentication method used with the HTTP requests
  var _auth = null;
  // The parameters asked from the user used in the HTTP requests
  var _userParams = null;

  // 1. Get base api
  switch (_api) {
    case 'jenkins':
      _API = require('./apis/jenkins.js');
      _auth = _API.authentication[1]; //Force auth method to be basic

      break;
    case 'jira':
      _API = require('./apis/jira.js');

      break;
    case 'github':
      _API = require('./apis/github.js');
      _auth = _API.authentication[1]; //Force auth method to be basic

      break;
    case 'gitlab':
      _API = require('./apis/gitlab.js');
//      console.log(" - #collector: : using gitlab");
      _auth = _API.authentication[1]; //Force auth method to be token
      _API.baseUrl = _filters.baseURL;

      break;

    case 'gitlab_pipelines':
      _API = require('./apis/gitlab_pipelines.js');
      _auth = _API.authentication[1]; //Force auth method to be token
      _API.baseUrl = _filters.baseURL;

      break;
  }

  //TODO: make switch of auth method work

  // 2. Get auth method
//  console.log('#[Collector]_auth:', _auth);

  // 3. Get auth params
  if (_auth === 'basic') {
//    console.log('[Collector]Basic auth');
    //Need username and password
    _baseRequest = _baseRequest.defaults({
      auth: {
        username: _filters.auth.user,
        password: _filters.auth.password
      }
    });

  } else if (_auth === 'oauth2') {
//    console.log(_auth + ' not yet supported');
    process.exit();

  } else if (_auth !== 'no authentication') {
    // a custom authentication method that requires some input defined in the api description 
    // add the auth methods user parameters to the apis normal parameters
    _API.userParams = _API.userParams.concat(_auth.userParams);
    // add the headers required by the auth method to the apis normal headers
    if (!_API.headers) {
      // by default the api might not have any headers
      _API.headers = {};
    }

    _.extend(_API.headers, _auth.headers);
  }

  // 4. Get user params
  switch (_api) {
    case 'jenkins':
      _userParams = _filters.userParams;

      break;
    case 'jira':

      break;
    case 'github':

        _userParams = {
          'owner': _filters.userParams.repo_owner,
          'repo': _filters.userParams.repo_name
        }

      break;
    case 'gitlab':
    case 'gitlab_pipelines':
      _userParams = {
        id: _filters.userParams,
        'PRIVATE-TOKEN': _filters.auth.token
      }

      break;
  }

  // 5. Get origin
  var origin = _filters.origin;

  // if a header in the api description has an undefined value check if the userParams contains a value for it
  var headers = {};
  _.each(_API.headers, function (value, key) {
      if (value === undefined) {
//	  console.log(" - #collector: : " + key + " is undefined");
      headers[key] = _userParams[key];
    } else {
//	  console.log(" - #collector: : " + key + " is " + value);
      headers[key] = value;
    }
  });

  /* ******* BASE REQUEST ******* */

  // set default values for the request to be used in the api calls
  _baseRequest = _baseRequest.defaults({
    baseUrl: _API.baseUrl,
    headers: headers,
    json: true
  });

  //console.log('[Collector]Fetching issue management data...');
  //console.log( '[Collector]baseRequest:', _baseRequest);
//  console.log('[Collector]api:', _API);
//  console.log('[Collector]userParams:', _userParams);

  var errorHandler = false;
  GET_DATA(_baseRequest, _API, _userParams, function (err, result) {
      if (errorHandler) {
	  return;
      }
      if (err) {
	  errorHandler = true;
	  console.log('[Collector]Error detected in the data collection', err);
	  callback(false, err, true);
	  return;
      }
      
      // print debug information how many items of each type we got and what is the last item
      console.log('#[Collector]Issue management data fetched from source.');
      _.each(result, function (value, key) {
	  console.log("#[Collector]" + value.length + ' ' + key + ' last of which is:');
	  console.log("#[Collector]", value[value.length - 1]);
      });
      
      // DEBUG: issues
/*
      _.each(result, function (value, key) {
	  if (key == "issues") {
	      for (var i=0; i<value.length; ++ i) {
		  console.log("issue " + i + ", id= " + value[i].id + ", created=" + value[i].created);
	      }
	  }
      });
*/
    /*
    console.log('[Collector]Not sending data to database.');
    callback(true);
    */

    // send the issue data to the db
    console.log('#[Collector]Sending data to database.');
    SEND_DATA(result, origin, function () {
      console.log("#Data collection and sending successful.");
      callback(true);
    });

  });



};

module.exports = collector;
