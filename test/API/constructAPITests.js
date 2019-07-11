/*
* Copyright (c) TUT Tampere University of Technology 2014-2015.
* All rights reserved.
* This software has been developed in Tekes-TIVIT project Need-for-Speed.
* All rule set in consortium agreement of Need-for-Speed project apply.
*
* Main authors: Antti Luoto, Anna-Liisa Mattila, Henri Terho
*/

//test for the construct API functionality

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

var source = "test";
var listArtifacts = [];
for(var i = 0; i < 5 ; ++i){
	listArtifacts.push(cloneObject({
		origin_id: {source: source, source_id: "0", context: "Unit test"},
		type: 'Suite',
		description: "unit test"
	}));
}

//Artifacts to test with. This object is used to reference the artifacts
// to avoid harcoding the id's and unique artifacts inside test functions.
var testArtifacts = {
	singleArtifact : {
		origin_id: {source: source, source_id: "0", context: "Unit test"},
		type: 'Suite',
		description: "unit test"
	},
	listArtifacts : listArtifacts,
	artifactAppend : cloneObject({origin_id: {source: source, source_id: "0", context: "Unit test"},
		type: 'Suite',
		description: "unit test"
	}),
	artifactUpdate : cloneObject({origin_id: {source: source, source_id: "0", context: "Unit test"},
		type: 'Suite',
		description: "unit test"
	}),
	artifactDelete : cloneObject({origin_id: {source: source, source_id: "0", context: "Unit test"},
		type: 'Suite',
		description: "unit test"
	}),
	linkToEvent : cloneObject({origin_id: {source: source, source_id: "0", context: "Unit test"},
		type: 'Suite',
		description: "unit test"
	}),
	linkToStatechange : cloneObject({origin_id: {source: source, source_id: "0", context: "Unit test"},
		type: 'Suite',
		description: "unit test"
	}),
	linkToArtifact : [cloneObject({origin_id: {source: source, source_id: "0", context: "Unit test"},
		type: 'Suite',
		description: "unit test"
	}), cloneObject({origin_id: {source: source, source_id: "0", context: "Unit test"},
		type: 'Suite',
		description: "unit test"
	})],
	multipleFilters : cloneObject({origin_id: {source: source, source_id: "0", context: "Unit test"},
		type: 'Suite',
		description : "multiple filters test"
	}),
	contextFilter : cloneObject({origin_id: {source: source, source_id: "0", context: "context test"},
		type: 'Suite',
		description : "unit test - origin_id context filtering test"
	}),
	freeTextOrigin : cloneObject({
		origin_id: {source: source, source_id: "0", context: "search me with string abrakadabra"},
		type: 'Suite',
		description: "unit test - origin_id free text filtering test"
	}),
	freeTextTime : cloneObject({
		origin_id: {source: source, source_id: "0", context: "Unit test"},
		type: 'Suite',
		description : "unit test - artifact to be searched with time and free text - abrakadabra"
	})
};


describe('Construct API tests', function() {
	before(function(){
        //run something before the whole test set, for example if the database needs some global initial settings etc.
        //console.log("was");
    });

	var serverUrl = config.get('serverUrl');
	var port = config.get('port');

	//JSON validator schema usage http://spacetelescope.github.io/understanding-json-schema/basics.html
	//Doing reusable schemas: http://spacetelescope.github.io/understanding-json-schema/structuring.html#structuring

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


//TESTS

	it('Should be able to query the DB for constructs', function(done){
		request.get(serverUrl + ':' + port + '/api/constructs', function(err,res,body) {
			if (err) throw err;

			expect(res.statusCode).to.equal(200);
			if(JSONValidator.validate(JSON.parse(res.body), listSchema) ){
				done();
			}
			else{
				console.log(JSONValidator.error);
				assert.fail();
			}
		});
	});
	
	it('Should create a new object to the DB', function(done){

		//would be nice to clean test data from database automatically if needed.
		request({url: serverUrl + ':' + port + '/api/constructs',
			method: "POST",
			json: true,   
			body: testArtifacts.singleArtifact,
		}, function (error, res, body){
			if (error) throw error;
			expect(res.statusCode).to.equal(201);
			//example how to check properties of body
			//expect(res.body.type).to.equal(artifact.type);

			if(JSONValidator.validate(res.body, constructSchema)){
				done();
			}
			else {
				console.log(JSONValidator.error);
				assert.fail();
			}
		});
	});
    
    it('Shouldn\'t be able to post duplicate constructs', function(done){
        request({url: serverUrl + ':' + port + '/api/constructs',
            method: "POST",
            json: true,
            body: testArtifacts.singleArtifact,
        }, function (error, res, body){
            if (error) throw error;

            expect(res.statusCode).to.equal(200);
            if(JSONValidator.validate(res.body, constructSchema)){
                done();
            }
            else {
                console.log(JSONValidator.error);
                assert.fail();
            }
        });
	});
    
	it('Should create new objects to the DB from list', function(done){

		request({url: serverUrl + ':' + port + '/api/constructs',
			method: "POST",
			json: true,   
			body: testArtifacts.listArtifacts,
		}, function (error, res, body){
			if (error) throw error;
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
    
    it('Shouldn\'t create duplicate set of constructs to the DB from list', function(done){

		request({url: serverUrl + ':' + port + '/api/constructs',
			method: "POST",
			json: true,   
			body: testArtifacts.listArtifacts,
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
    
    it('Shouldn\'t add duplicate constructs when creating constructs from list', function(done){
        var artifacts = [];
        artifacts.concat(testArtifacts.listArtifacts);
        artifacts.push(testArtifacts.artifactAppend);

		request({url: serverUrl + ':' + port + '/api/constructs',
			method: "POST",
			json: true,   
			body: artifacts,
		}, function (error, res, body){
			if (error) throw error;
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

	it('Should be able to update the constructs', function(done){

		request({url: serverUrl + ':' + port + '/api/constructs',
			method: "POST",
			json: true,   
			body: testArtifacts.artifactUpdate,
		}, function (error, response, body){
			if (error) throw error;
			expect(response.statusCode).to.equal(201);

			var updatedArtifact = testArtifacts.artifactUpdate;
			updatedArtifact.description = "unit test - updated artifact";			

			request({url: serverUrl + ':' + port + '/api/constructs/' + response.body._id,
				method: "PUT",
				json: true,   
				body: updatedArtifact,
			}, function (error, res, body){

				expect(res.statusCode).to.equal(200);

				if(JSONValidator.validate(res.body, constructSchema)){
					done();
				}
				else {
					console.log(JSONValidator.error);
					assert.fail();
				}
			});
		});
	});
	
	it('Should be able to delete the constructs', function(done){
		request({url: serverUrl + ':' + port + '/api/constructs',
			method: "POST",
			json: true,   
			body: testArtifacts.artifactDelete,
		}, function (error, response, body){
			if (error) throw error;
			expect(response.statusCode).to.equal(201);

			request({url: serverUrl + ':' + port + '/api/constructs/' + response.body._id,
				method: "DELETE",
				json: true,   
				body: {},
			}, function (error, res, body){
				if (error) throw error;
				expect(res.statusCode).to.equal(200);

				if(JSONValidator.validate(res.body, constructSchema)){
					done();
				}
				else {
					console.log(JSONValidator.error);
					assert.fail();
				}

			});
		});
	});

	it('Should be able to link constructs and events', function(done){

		request({url: serverUrl + ':' + port + '/api/constructs',
			method: "POST",
			json: true,   
			body: testArtifacts.linkToEvent,
		}, function (error, response, bodyArtifact){
			if (error) throw error;
			expect(response.statusCode).to.equal(201);

			var event = {
				origin_id: {source: "unknown", source_id: "1", context: "Unit test"},
				type: 'test event - old date', 
				time: new Date(2011, 10, 10, 10, 10, 10, 0),
				duration: 1,
                creator: "mocha tests"
			};

			request({url: serverUrl + ':' + port + '/api/events',
				method: "POST",
				json: true,   
				body: event,
			}, function (error, response, bodyEvent){
				if (error) throw error;
				expect(response.statusCode).to.equal(201);

                request({
                    url: serverUrl + ':' + port + '/api/constructs/'.concat(bodyArtifact._id).concat("/link"),
                    method: "PUT",
                    json: true,   
                    body: {id: bodyEvent._id, type: "event"},
                }, function (error, res, body){
                    if (error) throw error;
                    
					expect(res.statusCode).to.equal(200);
					//expect(res.body).to.equal([artifact, event]);
					//done();						
					// Placeholder for test if the api returns an object instead of "OK"
					if(JSONValidator.validate(res.body[0], constructSchema) &&
                    JSONValidator.validate(res.body[1], eventSchema)){
						done();
					}
					else {
						console.log(JSONValidator.error);
						assert.fail();
					}
                });
			});
		});
	});

	it('Should be able to link constructs and statechanges', function(done){

		request({url: serverUrl + ':' + port + '/api/constructs',
			method: "POST",
			json: true,   
			body: testArtifacts.linkToStatechange,
		}, function (error, response, bodyArtifact){
			if (error) throw error;
			expect(response.statusCode).to.equal(201);

			var statechange = {
				origin_id: {source: "unknown", source_id: "1", context: "Unit test"},
				type: 'statechange', 
				time: new Date(2011, 10, 10, 10, 10, 10, 0),
                creator: "mocha tests",
                isStatechange : true,
                statechange : {
                	to : "tested",
                	from : "not tested"
                }
			};

			request({url: serverUrl + ':' + port + '/api/events/',
				method: "POST",
				json: true,   
				body: statechange,
			}, function (error, response, bodyEvent){
				if (error) throw error;
				expect(response.statusCode).to.equal(201);

                request({
                    url: serverUrl + ':' + port + '/api/constructs/'.concat(bodyArtifact._id).concat("/link"),
                    method: "PUT",
                    json: true,   
                    body: {id: bodyEvent._id, type: "statechange"},
                }, function (error, res, body){
                    if (error) throw error;
                    
					expect(res.statusCode).to.equal(200);

					if(JSONValidator.validate(res.body[0], constructSchema) &&
                    JSONValidator.validate(res.body[1], eventSchema)){
						done();
					}
					else {
						console.log(JSONValidator.error);
						assert.fail();
					}
                });
			});
		});
	});

	it('Should be able to link constructs and constructs', function(done){

		request({url: serverUrl + ':' + port + '/api/constructs',
			method: "POST",
			json: true,   
			body: testArtifacts.linkToArtifact[0],
		}, function (error, response, bodyArtifact){
			if (error) throw error;
			expect(response.statusCode).to.equal(201);

			var linkedArtifact = testArtifacts.linkToArtifact[1];

			request({url: serverUrl + ':' + port + '/api/constructs',
				method: "POST",
				json: true,   
				body: linkedArtifact,
			}, function (error, response, bodyLinked){
				if (error) throw error;
				expect(response.statusCode).to.equal(201);

                request({
                    url: serverUrl + ':' + port + '/api/constructs/'.concat(bodyArtifact._id).concat("/link"),
                    method: "PUT",
                    json: true,   
                    body: {id: bodyLinked._id, type: "construct"},
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
	});

	it('Should be able to get by source', function(done){

		request({url: serverUrl + ':' + port + '/api/constructs/origin/' + source,
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

	it('Should be able to get by source id', function(done){

		var id = testArtifacts.singleArtifact.origin_id.source_id;
		request({url: serverUrl + ':' + port + '/api/constructs/?origin_id.source_id='+id,
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

	it('Should be able to get related constructs', function(done){

		var id = testArtifacts.linkToArtifact[0].origin_id.source_id;
		request({url: serverUrl + ':' + port + '/api/constructs/origin/' + source + "/" + id,
			method: "GET",
			json: true,   
			body: {},
		}, function (error, response, body){
			if (error) throw error;
			expect(response.statusCode).to.equal(200);

			request({url: serverUrl + ':' + port + '/api/constructs/' + body[0]._id + "/relatedconstructs",
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

	it('Should be able to get related events', function(done){
		var id = testArtifacts.linkToEvent.origin_id.source_id;
		request({url: serverUrl + ':' + port + '/api/constructs/origin/' + source + "/" + id,
			method: "GET",
			json: true,   
			body: {},
		}, function (error, response, body){
			if (error) throw error;
			expect(response.statusCode).to.equal(200);

			request({url: serverUrl + ':' + port + '/api/constructs/' + body[0]._id + "/relatedevents",
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

	it('Should be able to get related statechanges', function(done){
		var id = testArtifacts.linkToEvent.origin_id.source_id;
		request({url: serverUrl + ':' + port + '/api/constructs/origin/' + source + "/" + id,
			method: "GET",
			json: true,   
			body: {},
		}, function (error, response, body){
			if (error) throw error;
			expect(response.statusCode).to.equal(200);

			request({url: serverUrl + ':' + port + '/api/constructs/' + body[0]._id + "/relatedstatechanges",
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

	it('Should be able to query the DB for constructs with multiple filters', function(done){

		request({
			url: serverUrl+':'+port+'/api/constructs/',
			method: "POST",
			json: true,
			body: testArtifacts.multipleFilters
		},function(errorpost, respost, bodypost){
			if(errorpost) throw errorpost;
			expect(respost.statusCode).to.equal(201);

			request({
				url: serverUrl + ':' + port + '/api/constructs/',
            	method: "GET",
            	json: true,
            	body: {
            		type: testArtifacts.multipleFilters.type, 
            		description : testArtifacts.multipleFilters.description
            	},
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

	it('Should be able to query the DB for constructs with events and statechanges within time range', function(done){

        request({
        	url: serverUrl + ':' + port + '/api/constructs/?type=Suite&startTime=' +
        		new Date(2010, 10, 10, 10, 10, 10, 0) +
        		'&endTime=' + new Date(2013, 10, 10, 10, 10, 10, 0),
            method: "GET",
            json: true,
            body: {},
        }, function (error, res, body){
            if (error) throw error;

			expect(res.statusCode).to.equal(200);

			if(JSONValidator.validate(res.body, listSchema) && res.body.length === 2){
				done();
			}
			else {
				console.log(JSONValidator.error);
				assert.fail();
			}
        });
	});

	it('Should be able to query the DB for constructs with events within time range and return empty array', function(done){

        request({
        	url: serverUrl + ':' + port + '/api/constructs/?type=Suite&startTime='+
        		new Date(2000, 10, 10, 10, 10, 10, 0) +
        		'&endTime=' + new Date(2001, 10, 10, 10, 10, 10, 0),
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

	it('Should be able to query the DB for constructs with free text', function(done){

        request({url: serverUrl + ':' + port + '/api/constructs/?freeText=filters',
            method: "GET",
            json: true,
            body: {},
            }, function (error, res, body){
                if (error) throw error;

				expect(res.statusCode).to.equal(200);

				if(JSONValidator.validate(res.body, listSchema) &&
				res.body[0].description.indexOf('filters') !== -1){
					done();
				}
				else {
					console.log(JSONValidator.error);
					assert.fail();
				}
        });
	});

	it('Should be able to query the DB for constructs filtering with origin id context', function(done){

		request({url: serverUrl + ':' + port + '/api/constructs',
			method: "POST",
			json: true,   
			body: testArtifacts.contextFilter,
		}, function (error, response, body){
			if (error) throw error;
			expect(response.statusCode).to.equal(201);

        	request({url: serverUrl + ':' + port + '/api/constructs/?origin_id.context=context+test',
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

	it('Should be able to query the DB for constructs filtering with origin id free text search', function(done){

		request({url: serverUrl + ':' + port + '/api/constructs',
			method: "POST",
			json: true,   
			body: testArtifacts.freeTextOrigin,
		}, function (error, response, body){
			if (error) throw error;
			expect(response.statusCode).to.equal(201);

        	request({url: serverUrl + ':' + port + '/api/constructs?freeText=abrakadabra',
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

	it('Should be able to query the DB for constructs filtering with time range and free text search', function(done){

		request({url: serverUrl + ':' + port + '/api/constructs',
			method: "POST",
			json: true,   
			body: testArtifacts.freeTextTime,
		}, function (error, response, bodyArtifact){
			if (error) throw error;
			expect(response.statusCode).to.equal(201);

			var event = {
				origin_id: {source: "unknown", source_id: "2", context: "Unit test"},
				type: 'test event', 
				time: new Date(2011, 10, 10, 10, 10, 10, 0),
				duration: 1,
                creator: "mocha test"
			};

			request({url: serverUrl + ':' + port + '/api/events',
				method: "POST",
				json: true,   
				body: event,
			}, function (error, response, bodyEvent){
				if (error) throw error;
				expect(response.statusCode).to.equal(201);

                request({
                    url: serverUrl + ':' + port + '/api/constructs/'.concat(bodyArtifact._id).concat("/link"),
                    method: "PUT",
                    json: true,   
                    body: {id: bodyEvent._id, type: "event"},
                }, function (error, res, body){
                	if (error) throw error;
                	expect(res.statusCode).to.equal(200);

                    request({
                    	url: serverUrl + ':' + port + '/api/constructs/?startTime=' +
                    		new Date(2010, 10, 10, 10, 10, 10, 0) +
                    		'&endTime=' + new Date(2013, 10, 10, 10, 10, 10, 0) +
                    		'&freeText=abrakadabra',
                        method: "GET",
                        json: true,
                        body: {},
                    }, function (error, res, body){
                        if (error) throw error;

						expect(res.statusCode).to.equal(200);

						if(JSONValidator.validate(res.body, listSchema) && res.body.length === 1 &&
						res.body[0].description.indexOf("abrakadabra") !== -1){
							done();
						}
						else {
							console.log(JSONValidator.error);
							assert.fail();
						}
					});
                });
            });
        });
	});
    //TESTS END
});
