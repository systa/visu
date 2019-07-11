/*
* Copyright (c) TUT Tampere University of Technology 2014-2015.
* All rights reserved.
* This software has been developed in Tekes-TIVIT project Need-for-Speed.
* All rule set in consortium agreement of Need-for-Speed project apply.
*
* Main authors: Antti Luoto, Anna-Liisa Mattila, Henri Terho
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