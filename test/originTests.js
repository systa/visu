/*
* Copyright (c) TUT Tampere University of Technology 2014-2015.
* All rights reserved.
* This software has been developed in Tekes-TIVIT project Need-for-Speed.
* All rule set in consortium agreement of Need-for-Speed project apply.
*
* Main authors: Antti Luoto, Anna-Liisa Mattila, Henri Terho
*/

var common = require('./common.js');
var request = common.request;
var expect = common.expect;
var config = common.config;
var assert = common.assert;
var JSONValidator = common.JSONValidator;

//var server = require('../server.js');
describe('Origin tests', function(){
	before(function(){
        //run something before the whole test set, for example if the database needs some global initial settings etc.
        //console.log("was");
    });
	var serverUrl = config.get('serverUrl');
	var port = config.get('port');

    var originSchema = {
        "type": "object",
        "properties": {
            "_id": { "type": "string" },
            "source": {"type": "string"},
            "source_id": {"type": "string"},
            "context": {"type": "string"}
        },
        "required": ["_id", "source", "source_id", "context"]
    };    

    JSONValidator.addSchema(originSchema);
    
    //for tests expecting list as result
    var listSchema = {
        "type": "array",
        "properties": { 
            "items": {"$ref":"originSchema"}
        }
    };

    JSONValidator.addSchema(listSchema);
        
    var artifact = {
        type: 'Suite', 
        description: "unit test", 
        state: "Succeeded", 
        related_events: [],
        related_statechanges: [],
        related_constructs: []
    };
    var event = {
        type: 'test event - invalid origin_id', 
        time: new Date(),
        duration: 1,
        creator : "mocha tests",
        related_constructs: []
    };
    
    var source = "origin tests";
    var context = "Unit test";
    
    var invalid_source_id = {source: source, id: "0", context: context};
    var valid_origin = {source: source, source_id : "0", context : context};
    
    it('Should get valid origin_id when construct added has valid origin_id', function(done){
        var validArtifact = artifact;
        validArtifact.origin_id = valid_origin;
        
        request({url: serverUrl + ':' + port + '/api/constructs',
			method: "POST",
			json: true,   
			body: validArtifact,
        },
        function(error, res, body){
                expect(res.statusCode).to.equal(201);
                
                request({url:serverUrl + ':' + port + '/api/constructs/'+ body._id,
                    method: "GET",
                    json: true,   
                    body: {},
                },
                function (error, res, body){
                    expect(res.statusCode).to.equal(200);

                    if(JSONValidator.validate(res.body.origin_id, listSchema)){
                        done();
                    }
                    else {
                        console.log("test failed");
                        assert.fail();
                    }
                });
        });
    });
    
    it('Should get valid origin_id when event added has valid origin_id', function(done){
        var validEvent = event;
        validEvent.origin_id = valid_origin;
        
        request({url: serverUrl + ':' + port + '/api/events',
			method: "POST",
			json: true,   
			body: validEvent,
        },
        function(error, res, body){
                expect(res.statusCode).to.equal(201);
                
                request({url:serverUrl + ':' + port + '/api/events/'+ body._id,
                    method: "GET",
                    json: true,   
                    body: {},
                },
                function (error, res, body){
                    expect(res.statusCode).to.equal(200);

                    if(JSONValidator.validate(res.body.origin_id, listSchema)){
                        done();
                    }
                    else {
                        console.log("test failed");
                        assert.fail();
                    }
                });
        });
    });

    it('Should not be able to create construct with invalid source_id field', function(done){
        
        var invalidArtifact = artifact;
        invalidArtifact.origin_id = invalid_source_id;
        
        request({url: serverUrl + ':' + port + '/api/constructs',
			method: "POST",
			json: true,   
			body: invalidArtifact,
        }, function(error, res, body){
            expect(res.statusCode).to.equal(500);
            done();
        });
    });
    
    it('Should not be able to create event with invalid source_id field', function(done){
        
        var invalidEvent = event;
        invalidEvent.origin_id = invalid_source_id;
        
        request({url: serverUrl + ':' + port + '/api/events',
			method: "POST",
			json: true,   
			body: invalidEvent,
        }, function(error, res, body){
            expect(res.statusCode).to.equal(500);
            done();
        });
    });
});