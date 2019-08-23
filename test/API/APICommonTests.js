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

//test for the basic API functionality
var common = require('../common.js');
var request = common.request;
var expect = common.expect;
var config = common.config;



//var server = require('../../server.js');
describe('Common API tests', function() {

	var serverUrl = config.get('serverUrl');
	var port = config.get('port');

	it('Should return "Api is running!"', function(done){

		request.get(serverUrl + ':' + port + '/api', function(err,res,body) {
			console.log(serverUrl + ':' + port + '/api');
			expect(res.statusCode).to.equal(200);
			expect(res.body).to.equal('Api is running!');
			done();
		});
	});


	it('Should return status code 404', function(done){

		request.post(serverUrl + ':' + port + '/api', function(err,res,body) {
			expect(res.statusCode).to.equal(404);
			done();
		});
	});
});