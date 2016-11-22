/*
* Copyright (c) TUT Tampere University of Technology 2014-2015.
* All rights reserved.
* This software has been developed in Tekes-TIVIT project Need-for-Speed.
* All rule set in consortium agreement of Need-for-Speed project apply.
*
* Main authors: Antti Luoto, Anna-Liisa Mattila, Henri Terho
*/

//Contains all the common requirements for all tests
//This file should be required in all other test files.

//set NODE_ENV to test so that the proper config file is loaded by mocha
process.env.NODE_ENV = 'test';
process.env.TZ = 'Europe/Helsinki';

var JSONValidator = require('tv4');
var request = require('request');
var expect = require('chai').expect;
var config = require('config');
var server = require('../server.js');
var assert = require('chai').assert;

//Id generator
var getId = function(){
	var id = 0;
	return function(){
		id += 1;
		return id.toString();
	};
};
var id = getId();


var cloneObject = function(obj){
	var tmp = {};
	for(var property in obj){
        if(obj.hasOwnProperty(property)){
            tmp[property] = obj[property];
        }
    }
    tmp.origin_id.source_id = id();
    return tmp;
};

var constructSchema = {
	"type": "object",
	"properties": {
		"_id": { "type": "string" },
		"origin_id": {"type": "array"},
		"type": {"type": "string"},
		"name": {"type": "string"},
		"description": {"type": "string"},			
		"related_events": {"type": "array"},
        "related_statechanges": {"type": "array"},
		"related_constructs": {"type": "array"},
		"data": {"type": "object"},
        "updated" : {"type": "string"}
	},
	"required": ["_id", "origin_id", "type",
		"related_events", "related_constructs", "related_statechanges"]
};

var eventSchema = {
	"type": "object",
	"properties": {
		"_id": { "type": "string" },
		"origin_id": {"type": "array"},
		"type": {"type": "string"},
		"time": {"type": "string"},
		"duration": {"type": "number"},
		"creator": {"type": "string"},			
		"related_constructs": {"type": "array"},
		"related_events": {"type": "array"},

		"isStatechange": {"type" : "boolean"},

		"statechange": {"type": "object"},

		"data": {"type": "object"},
	},
	"required": ["_id", "origin_id", "type", "time", "duration", "creator", "isStatechange",
		"related_constructs", "related_events"]
};


//TODO refactor event and statechange schema 
//This is not used by the tests now
var statechangeSchema = {
	"type": "object",
	"properties": {
		"_id": { "type": "string" },
		"origin_id": {"type": "array"},
		"type": {"type": "string"},
		"time": {"type": "string"},
		"statechange": {"type": "object"},
		"creator": {"type": "string"},			
		"related_constructs": {"type": "array"},
		"related_events": {"type": "array"},
		"related_statechanges": {"type": "array"},
		"data": {"type": "object"},
	},
	"required": ["_id", "origin_id", "type", "time", "statechange", "creator",
		"related_constructs", "related_events", "related_statechanges"]
};




exports.request = request;
exports.expect = expect;
exports.config = config;
exports.server = server;
exports.assert = assert;
exports.cloneObject = cloneObject;
exports.constructSchema = constructSchema;
exports.eventSchema = eventSchema;
exports.statechangeSchema = statechangeSchema;
exports.JSONValidator = JSONValidator;