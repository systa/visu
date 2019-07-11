/*
* Copyright (c) TUT Tampere University of Technology 2014-2015.
* All rights reserved.
* This software has been developed in Tekes-TIVIT project Need-for-Speed.
* All rule set in consortium agreement of Need-for-Speed project apply.
*
* Main authors: Antti Luoto, Anna-Liisa Mattila, Henri Terho
*/

//test for the event API functionality

//include the common requires from common.js in all test files. 
var common = require('../common.js');
var request = common.request;
var expect = common.expect;
var config = common.config;
var assert = common.assert;
var JSONValidator = common.JSONValidator;

var constructSchema = common.constructSchema;
var eventSchema = common.eventSchema;

var cloneObject = common.cloneObject;

//var server = require('../../server.js');
describe('Event API tests', function() {

	var serverUrl = config.get('serverUrl');
	var port = config.get('port');

	JSONValidator.addSchema(constructSchema);
	JSONValidator.addSchema(eventSchema);

	//for tests expecting list as result
	var listSchema = {
		"type": "array",
		"properties": { 
			"items": {"$ref":"constructSchema"}
		}
	};
	JSONValidator.addSchema(listSchema);

	//USE SAME TIME FOR ALL DUPLICATES!!!
    var time = new Date();
	var source = "unknown";

	var event = {
		origin_id: {source: source, source_id: "0", context: "Unit test"},
		type: 'test event', 
		time: new Date(2011, 10, 10, 10, 10, 10, 0),
		duration: 1,
        creator : "mocha tests"
	};
    

//TESTS
	it('Should be able to query the DB for events', function(done){
		request.get(serverUrl + ':' + port + '/api/events/', function(err,res,body) {

			expect(res.statusCode).to.equal(200);

			if(JSONValidator.validate(JSON.parse(res.body), listSchema)){
				done();
			}
			else{
				console.log(JSONValidator.error);
				assert.fail();
			}
		});
	});

	it('Should create a new event to the DB', function(done){

		var ev = cloneObject(event);
		ev.origin_id.source_id = "1";

		request({url: serverUrl + ':' + port + '/api/events/',
			method: "POST",
			json: true,   
			body: ev,
		}, function (error, res, body){

			expect(res.statusCode).to.equal(201);
			//example how to check properties of body
			//expect(res.body.type).to.equal(artifact.type);

			if(JSONValidator.validate(res.body, eventSchema)){
				done();
			}
			else {
				console.log(JSONValidator.error);
				assert.fail();
			}
		});
	});
    
    it('Shouldn\'t be able to post duplicate events', function(done){

    	var ev = cloneObject(event);
		ev.origin_id.source_id = "1";
		ev.type = "unit test - duplicate detection";
		ev.origin_id.context = "duplicate detection";

		request({url: serverUrl + ':' + port + '/api/events/',
			method: "POST",
			json: true,   
			body: ev,
		}, function (error, res, body){


			request({url: serverUrl + ':' + port + '/api/events/',
				method: "POST",
				json: true,   
				body: ev,
			}, function (error, res, body){

				expect(res.statusCode).to.equal(200);
				if(JSONValidator.validate(res.body, eventSchema)){
                    done();
                }
                else {
                    console.log(JSONValidator.error);
                    assert.fail();
                }
            });
		});
	});

	it('Should create new events to the DB from list', function(done){
		var events =[
            { 
				origin_id: {source: "unknown", source_id: "2", context: "Unit test"},
				type: 'test event', 
				time: time,
				duration: 1,
                creator : "mocha tests",
				related_constructs: [] } ,
			{
				origin_id: {source: "unknown", source_id: "3", context: "Unit test"},
				type: 'test event', 
				time: time,
				duration: 1,
                creator : "mocha tests",
				related_constructs: []
            }
        ];

		request({url: serverUrl + ':' + port + '/api/events/',
			method: "POST",
			json: true,   
			body: events,
		}, function (error, res, body){

			expect(res.statusCode).to.equal(201);

			if(JSONValidator.validate(res.body, listSchema)){
				done();
			}
			else {
				console.log(JSONValidator.error);
				assert.fail();
			}
		});
	});
    
    it('Shouldn\'t create duplicate set of events to the DB from list', function(done){
		var events =[
            { 
				origin_id: {source: "unknown", source_id: "2", context: "Unit test"},
				type: 'test event', 
				time: time,
				duration: 1,
                creator : "mocha tests",
				related_constructs: [] } ,
			{
				origin_id: {source: "unknown", source_id: "3", context: "Unit test"},
				type: 'test event', 
				time: time,
				duration: 1,
                creator : "mocha tests",
				related_constructs: []
            } 
        ];

		request({url: serverUrl + ':' + port + '/api/events/',
			method: "POST",
			json: true,   
			body: events,
		}, function (error, res, body){

			expect(res.statusCode).to.equal(200);

			if(JSONValidator.validate(res.body, listSchema)){
				done();
			}
			else {
				console.log(JSONValidator.error);
				assert.fail();
			}
		});
	});
    
    it('Shouldn\'t create duplicate events when adding events to the DB from list', function(done){
		var events =[
            { 
				origin_id: {source: "unknown", source_id: "2", context: "Unit test"},
				type: 'test event', 
				time: time,
				duration: 1,
                creator : "mocha tests",
				related_constructs: [] } ,
			{
				origin_id: {source: "unknown", source_id: "3", context: "Unit test"},
				type: 'test event', 
				time: time,
				duration: 1,
                creator : "mocha tests",
				related_constructs: []
            },
            {
                origin_id: {source: "unknown", source_id: "12", context: "Unit test"},
				type: 'test event', 
				time: time,
				duration: 2,
                creator : "mocha tests",
				related_constructs: []
            }
        ];

		request({url: serverUrl + ':' + port + '/api/events/',
			method: "POST",
			json: true,   
			body: events,
		}, function (error, res, body){

			expect(res.statusCode).to.equal(201);

			if(JSONValidator.validate(res.body, listSchema)){
				done();
			}
			else {
				console.log(JSONValidator.error);
				assert.fail();
			}
		});
	});

	it('Should be able to update the event', function(done){

		var ev = cloneObject(event);
		ev.origin_id.source_id = "4";

		request({url: serverUrl + ':' + port + '/api/events/',
			method: "POST",
			json: true,   
			body: ev,
		}, function (error, response, body){
			
			var updated = cloneObject(ev);
			updated.origin_id.source_id = "4";
			updated.description = "unit test - updated artifact";			

			request({url: serverUrl + ':' + port + '/api/events/' + response.body._id,
				method: "PUT",
				json: true,   
				body: updated,
			}, function (error, res, body){

				expect(res.statusCode).to.equal(200);

				if(JSONValidator.validate(res.body, eventSchema)){
					done();
				}
				else {
					console.log(JSONValidator.error);
					assert.fail();
				}
			});
		});
	});
	
	it('Should be able to delete an event', function(done){

		var ev = cloneObject(event);
		ev.origin_id.source_id = "5";

		request({url: serverUrl + ':' + port + '/api/events/',
			method: "POST",
			json: true,   
			body: ev,
		}, function (error, response, body){
			
			request({url: serverUrl + ':' + port + '/api/events/' + response.body._id,
				method: "DELETE",
				json: true,   
				body: {},
			}, function (error, res, body){

				expect(res.statusCode).to.equal(200);

				if(JSONValidator.validate(res.body, eventSchema)){
					done();
				}
				else {
					console.log(JSONValidator.error);
					assert.fail();
				}
			});
		});
	});
	
	it('Should be able to get by source', function(done){

		request({url: serverUrl + ':' + port + '/api/events/origin/' + source,
			method: "GET",
			json: true,   
			body: {},
		}, function (error, res, body){

			expect(res.statusCode).to.equal(200);

			if(JSONValidator.validate(res.body, listSchema)){
				done();
			}
			else {
				console.log(JSONValidator.error);
				assert.fail();
			}
		});
	});

	it('Should be able to get by source id', function(done){
		
		request({url: serverUrl + ':' + port + '/api/events/origin/' + source + "/4",
			method: "GET",
			json: true,   
			body: {},
		}, function (error, res, body){

			expect(res.statusCode).to.equal(200);

			if(JSONValidator.validate(res.body, listSchema)){
				done();
			}
			else {
				console.log(JSONValidator.error);
				assert.fail();
			}
		});
	});

	it('Should be able to get related constructs', function(done){
		request({url: serverUrl + ':' + port + '/api/events/origin/' + source + "/1",
			method: "GET",
			json: true,   
			body: {},
		}, function (error, response, body){

			request({url: serverUrl + ':' + port + '/api/events/' + body[0]._id + "/relatedconstructs",
				method: "GET",
				json: true,   
				body: {},
			}, function (error, res, body){

				expect(res.statusCode).to.equal(200);

				if(JSONValidator.validate(res.body, listSchema)){
					done();
				}
				else {
					console.log(JSONValidator.error);
					assert.fail();
				}
			});
		});
	});

	it('Should be able to query the DB for events with multiple filters', function(done){

        request({url: serverUrl + ':' + port + '/api/events/?type=test+event&duration=2',
            method: "GET",
            json: true,
            body: {duration: "1"},
            }, function (error, res, body){
                if (error) throw error;

				expect(res.statusCode).to.equal(200);

				if(JSONValidator.validate(res.body, listSchema) && res.body.length === 1){
					done();
				}
				else {
					console.log(JSONValidator.error);
					assert.fail();
				}
        });
	});

	it('Should be able to query the DB for events within time range and other free filter.', function(done){
		var timeRangeEvents = 
			[ { 
				origin_id: {source: "unknown", source_id: "6", context: "Unit test"},
				type: 'test event - early in time range', 
				time: new Date(2011, 10, 10, 10, 10, 10, 0),
				duration: 1,
				creator : "mocha tests",
				related_constructs: [] } ,
			{
				origin_id: {source: "unknown", source_id: "7", context: "Unit test"},
				type: 'test event - present time in time range', 
				time: new Date(2015, 10, 10, 10, 10, 10, 0),
				duration: 1,
				creator : "mocha tests",
				related_constructs: [] } ,
			{
				origin_id: {source: "unknown", source_id: "8", context: "Unit test"},
				type: 'test event - later in time range', 
				time: new Date(2019, 10, 10, 10, 10, 10, 0),
				duration: 2,
				creator : "mocha tests",
				related_constructs: [] }
			];

		request({url: serverUrl + ':' + port + '/api/events/',
			method: "POST",
			json: true,   
			body: timeRangeEvents,
		}, function (error, res, body) {
                request({url: serverUrl + ':' + port + '/api/events/?duration=2&startTime=' + new Date(2012, 10, 10, 10, 10, 10, 0) + '&endTime=' + new Date(2020, 10, 10, 10, 10, 10, 0),
                method: "GET",
                json: true,
                body: {},
                }, function (error, res, body){
                    if (error) throw error;

					expect(res.statusCode).to.equal(200);

					if(JSONValidator.validate(res.body, listSchema)){
						done();
					}
					else {
						console.log(JSONValidator.error);
						assert.fail();
					}
            });
		});
	});

	it('Should be able to query the DB for events within time range and return empty array', function(done){

        request({url: serverUrl + ':' + port + '/api/events/?startTime=' + new Date(1990, 10, 10, 10, 10, 10, 0) + '&endTime=' + new Date(2000, 10, 10, 10, 10, 10, 0),
            method: "GET",
            json: true,
            body: {},
        }, function (error, res, body){
            if (error) throw error;

            expect(res.statusCode).to.equal(200);

            if(JSONValidator.validate(res.body, listSchema) && res.body.length === 0){
                done();
            }
            else {
                console.log(JSONValidator.error);
                assert.fail();
            }
        });
	});

	it('Should be able to query the DB for events with free text', function(done){

        request({url: serverUrl + ':' + port + '/api/events/?freeText=early',
            method: "GET",
            json: true,
            body: {/*freeText: "Changed"*/},
        }, function (error, res, body){
            if (error) throw error;

            expect(res.statusCode).to.equal(200);

            if(JSONValidator.validate(res.body, listSchema) && res.body[0].type === "test event - early in time range") {
                done();
            }
            else {
                console.log(JSONValidator.error);
                assert.fail();
            }
        });
	});

	it('Should be able to query the DB for events filtering with origin id context', function(done){

		var ev = cloneObject(event);
        ev.origin_id.source_id = "9";
        ev.type = "unit test - origin_id context filtering test";
        ev.origin_id.context = "context test";

        request({url: serverUrl + ':' + port + '/api/events',
                method: "POST",
                json: true,   
                body: ev,
        }, function (error, response, body){
            request({url: serverUrl + ':' + port + '/api/events/?origin_id.context=context+test',
                method: "GET",
                json: true,
                body: {/*"origin_id.context": "context test"*/},
            }, function (error, res, body){
                if (error) throw error;

                expect(res.statusCode).to.equal(200);

                if(JSONValidator.validate(res.body, listSchema) && res.body.length === 1) {
                    done();
                }
                else {
                    console.log(JSONValidator.error);
                    assert.fail();
                }
            });
        });
	});

	it('Should be able to query the DB for events filtering with origin id free text search', function(done){

		var ev = cloneObject(event);
        ev.origin_id.source_id = "10";
        ev.type = "unit test - origin_id free text filtering test";
        ev.origin_id.context = "search me with string abrakadabra";

        request({url: serverUrl + ':' + port + '/api/events',
                method: "POST",
                json: true,   
                body: ev,
        }, function (error, response, body){

            request({url: serverUrl + ':' + port + '/api/events?freeText=abrakadabra',
                method: "GET",
                json: true,
                body: {},
            }, function (error, res, body){
                if (error) throw error;

                expect(res.statusCode).to.equal(200);

                if(JSONValidator.validate(res.body, listSchema) && res.body.length === 1) {
                    done();
                }
                else {
                    console.log(JSONValidator.error);
                    assert.fail();
                }
            });
        });
	});

	it('Should be able to query the DB for events filtering with time range and free text search', function(done){
		var ev = cloneObject(event);
		ev.origin_id.source_id = "11";
		ev.type = "unit test - origin_id free text filtering test 2";
		ev.origin_id.context = "search me with string abrakadabra2";

		request({url: serverUrl + ':' + port + '/api/events',
			method: "POST",
			json: true,   
			body: ev,
		},function (error, response, body){

        	request({
        		url: serverUrl + ':' + port + '/api/events?freeText=abrakadabra2' +
        		'&startTime=' + new Date(2010, 10, 10, 10, 10, 10, 0) +
        		'&endTime=' + new Date(2020, 10, 10, 10, 10, 10, 0),
            	method: "GET",
            	json: true,
            	body: {},
            }, function (error, res, body){
                if (error) throw error;

				expect(res.statusCode).to.equal(200);

				if(JSONValidator.validate(res.body, listSchema) && res.body.length === 1) {
					done();
				}
				else {
					console.log(JSONValidator.error);
					assert.fail();
				}

            });
		});
	});

	//TODO: MOVE STATECHANGE TESTS FOR OWN FILE
	//DO TESTS THAT MIX STATECHANGES AND EVENTS AND SEE IF IT WORKS RIGHT!
	it('Should create a new statechange event to the DB', function(done){

		var ev = cloneObject(event);
		ev.origin_id.source_id = "12";
		ev.isStatechange = true;
		ev.statechange = {
			to: "testing",
			from: "not tested"
		};

		request({url: serverUrl + ':' + port + '/api/events/',
			method: "POST",
			json: true,   
			body: ev,
		}, function (error, res, body){

			expect(res.statusCode).to.equal(201);
			//example how to check properties of body
			//expect(res.body.type).to.equal(artifact.type);

			if(JSONValidator.validate(res.body, eventSchema)){
				done();
			}
			else {
				console.log(JSONValidator.error);
				assert.fail();
			}
		});
	});
    
    it('Shouldn\'t be able to post duplicate statechange events', function(done){

    	var ev = cloneObject(event);
		ev.origin_id.source_id = "12";
		ev.isStatechange = true;
		ev.statechange = {
			to: "testing",
			from: "not tested"
		};

		request({url: serverUrl + ':' + port + '/api/events/',
			method: "POST",
			json: true,   
			body: ev,
		}, function (error, res, body){


			request({url: serverUrl + ':' + port + '/api/events/',
				method: "POST",
				json: true,   
				body: ev,
			}, function (error, res, body){

				expect(res.statusCode).to.equal(200);
				if(JSONValidator.validate(res.body, eventSchema)){
                    done();
                }
                else {
                    console.log(JSONValidator.error);
                    assert.fail();
                }
            });
		});
	});

    //TESTS END
});

