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