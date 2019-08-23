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

//extend the router.routes in these files and read them all in in the initializer part.
//remember that these routes are written so that the root node for routing here is /api/constructs/
var debug = false;
var express = require('express');
var router = express.Router();
var mongoose = require('mongoose');
var request = require('request');
var config = require('config');
var Promise = require('promise');
var _ = require('underscore');

// helper function for using query parameters in database queries
var getFilteringQuery = require( './utils.js' ).getFilteringQuery;

var ConstructModel = mongoose.model('Construct');
var EventModel = mongoose.model('Event');

//API ENDPOINT: GET ALL WITH FILTERING
router.get('/', function(req,res){
    var query = req.query;

    //Warning: reserving words from objects.
    if (query.hasOwnProperty("freeText")) {
        //Add a text search object to query. The search utilizes text index declared in constructSchema.
        //Search all the fields in the text index with freeText.
        query.$text = {$search: query.freeText};
        
        //delete freeText property from query so that ConstructModel.find works
        delete query.freeText;

    }

    //Both the start and end times are required now.
    //Warning: reserving words from objects.
    //Note that if clause for time range filtering need to be last one of the filters.
    //If no time range filter exists all queries skip this "if" branch.
    if (query.hasOwnProperty("startTime") && query.hasOwnProperty("endTime")){
        //filtering is targeted to time attribute. it must be greater or equal to startTime and less than endTime.
        var eventQuery = {};
        eventQuery.time = {$gte: new Date(query.startTime), $lt: new Date(query.endTime)};

        //delete start and end times from query so that find works
        delete query.startTime;
        delete query.endTime;

        var relatedPromises = [];
        var related = [];
        var error = false;
        var errormsg = "";

        var promises = [];
        var results = [];

        //The function that concatenates results of query into dest array.
        //Using this function we can create the functions that handle query results.
        var  getResult = function(err, ress){
            if(err){
                console.log("READ ERROR: ", err);
                error = true;
                errormsg = err;
                return false;
            }
            else{
                results = results.concat(ress);
                return true;
            }
        };

        var promEvents = getFilteringQuery( EventModel.find(eventQuery), {}).exec(function(err, ress){
            if(err){
                console.log("READ ERROR: ", err);
                error = true;
                errormsg = err;
                return false;
            }
            else{
                related = related.concat(ress);
                return true;
            }
        });
        relatedPromises.push(promEvents);

        /*var promStatechanges = getFilteringQuery( StatechangeModel.find(eventQuery), {}).exec(function(err, ress){
            if(err){
                console.log("READ ERROR: ", err);
                error = true;
                errormsg = err;
                return false;
            }
            else{
                related = related.concat(ress);
                return true;
            }
        });
        relatedPromises.push(promStatechanges);*/

        Promise.all(relatedPromises).then(function(val){
            if(error){
                return res.status(500).send(errormsg);
            }
            else{
                var alreadySeenConstructs = [];
                for(var i = 0; i < related.length; ++i){
                    var found = false;
                    for (var j = 0; j < related[i].related_constructs.length; ++j){
                        var newId = related[i].related_constructs[j].toString();

                        //check if construct id is already used
                        if(_.contains(alreadySeenConstructs, newId) === false){
                            alreadySeenConstructs.push(newId);
                            query._id = newId;
                            var prom = getFilteringQuery(ConstructModel.find( query ), {} ).exec(getResult);
                            promises.push(prom);
                        }
                    }
                }

                Promise.all(promises).then(function(val){
                    if(error){
                        return res.status(500).send(errormsg);
                    }
                    else{
                        return res.status(200).send(results);
                    }
                });
            }
        });
    }//If time query ends
    else{
        // use a helper function for filtering the db query based on query string parameters
        return getFilteringQuery( ConstructModel.find( query ), {} ).exec(function(err, constructs){
            if(!err){
                return res.status(200).send(constructs);
            } else{
                 console.log(err);
                 return res.status(500).send(err);
            }
        });
    }
});


//API ENDPOINT: CREATE AND MASS CREATE
router.post('/', function(req,res){
    if(debug){
        console.log("------------- POSTING -------------");
    }
    var found = [];
    var promises = [];
    var requests = [];
    var error = false;
    var errormsg = "";
    var updated = new Date().getTime();
    
    var masscreate = false;
    if(_.isArray(req.body)){
        masscreate = true;
        requests = req.body;
        //console.log("MASS CREATE");
    }
    else{
        requests.push(req.body);
    }
    
    //First we check if the construct is allready in the db
    //The unique set of parameters is origin_id + type.
    requests.forEach(function(request){
        var query = {
            'origin_id.source': request.origin_id.source,
            'origin_id.context': request.origin_id.context,
            'origin_id.source_id': request.origin_id.source_id,
            'type' : request.type
        };
        
        var promise = getFilteringQuery( ConstructModel.find( query ), {}).exec(function (errfind, constructs){
            if(errfind){
                console.log("READ ERROR: ", errfind);
                error = true;
                errormsg = errfind;
                return false;
            }
            else{
                found = found.concat(constructs);
                if(debug){
                    console.log("READ FOUND: ", found);
                }
                return true;
            }
        });
        promises.push(promise);
    });

    //When the get is done we move to here and check if we need to add some constructs
    Promise.all(promises).then(function(val){
        if(error){
            return res.status(500).send(errormsg);
        }
        
        var toBeAdded = [];
        
        //If we had an error in reading we return 500
        if(!masscreate && found.length > 0){
            if(debug){
                console.log("FOUND FOR SINGLE ADD: ", found);
            }
            return res.status(200).send( found[0]);
        }
        //All the constructs were already added, return 200
        else if(masscreate && found.length == requests.length){
            if(debug){
                console.log("ALL FOUND: ", found);
            }
            return res.status(200).send(found);
        }
        //For masscreate we clean those constructs that are allready in the db and add only those which aren't
        else if(masscreate){
            if(debug){
                console.log("FOUND FOR MASS CREATE: ", found);
                console.log("SHOULD BE ADDED: ", requests);
            }
            //Even if we didn't find any duplicates we still need to do the outer loop as we need to add the update time.
            for(var i = 0; i < requests.length; ++i){
                var add = true;
                for(j = 0; j < found.length; ++j){
                    if(found[j].origin_id.source === requests[i].origin_id.souce &&
                    found[j].origin_id.context === requests[i].origin_id.context &&
                    found[j].origin_id.source_id === requests[i].origin_id.source_id &&
                    found[j].type === requests[i].type){
                        add = false;
                        break;
                    }
                }
                if(add){
                    requests[i].updated = updated;
                    toBeAdded.push(requests[i]);
                }
            }
        }
        //otherwise we add just one construct
        else{
            requests[0].updated = updated;
            toBeAdded = requests[0];

            if(debug){
                console.log("NOT FOUND: ", found.length, masscreate);
            }
        }
        if(debug){
            console.log("ADD: ", toBeAdded);
        }
        //If construct is not found we add new construct
        //works with a single object or a list of objects
        ConstructModel.create( toBeAdded, function(err){
            if ( err ) {
                console.log(err);
                return res.status(500).send(err);
            }
            else{
                // return this to the user
                var result = arguments["1"];
                if(masscreate){
                    // create a list of created documents
                    // first argument (key "0") is err which we don't want
                    // the result is in key slot "1"
                    result = arguments["1"];
                    //We need to return all objects, the added and found
                    result = result.concat(found);
                }
                if(debug){
                    console.log("RESULT: ", result);
                }
                return res.status(201).send( result );
            }
        });
    });
});

//API ENDPOINT: READ
router.get('/:id', function(req, res){

    return ConstructModel.findById(req.params.id,function (err, construct) {
        if(!err && construct) {
            return res.status(200).send(construct);
        } 

        else if ( !err && !construct ) {
            return res.status(404).send( { 'message': 'not found' } );
        }

        else {
            //console.log(err);
            return res.status(500).send(err);
        }
    }); 

});


//API ENDPOINT: UPDATE
router.put('/:id', function(req,res) {
    // remove _id attribute which would cause an error with mongodb 
    // since it doesn't permit the _id to be updated
    // note this will not cause an error if the body doesn't have a _id attribute

    delete req.body._id;
    req.body.updated = new Date().getTime();

    // use the option new: true to get the updated version of the document for the callback
    // by default mongoose gives the old version
    ConstructModel.findByIdAndUpdate(req.params.id, req.body, { new: true }, function (err, construct) {
        if ( err ) {
            //console.log( err );
            return res.status( 500 ).send( err );
        }
        else if( !construct ) {
            return res.status( 404 ).send( { 'message': 'not found' } );
        }
        return res.status( 200 ).send( construct );
    });
});

//API ENDPOINT: DELETE
router.delete('/:id', function(req,res){
    ConstructModel.findByIdAndRemove( req.params.id, function ( err, construct ) {
        if ( err ) {
            return res.status( 500 ).send( err );
        }
        
        else if ( !construct ) {
            return res.status( 404 ).send( { message: 'not found' } );
        }
        
        res.status( 200 ).send( construct );
    });
});

//API ENDPOINT: GET BY SOURCE
router.get('/origin/:source', function(req,res){
    // data base query for geting all with the source
    var query = { 'origin_id.source': req.params.source };
    // use the helper function to add filtering to the query based on query string parameters
    getFilteringQuery( ConstructModel.find( query ), req.query  ).exec(  function ( err, constructs ) {
        if ( err ) {
            return res.status( 500 ).send( err );
        }
        
        else if ( !constructs || !constructs.length ) {
            return res.status( 404 ).send( { message: 'not found' } );
        }
        
        return res.status( 200 ).send( constructs );
    });
});


//API ENDPOINT: GET BY SOURCE ID
router.get('/origin/:source/:source_id', function(req,res){
    // origin_id.id can probably be a string or an integer
    var query = {
        'origin_id.source': req.params.source,
        $or: [ { 'origin_id.source_id': Number( req.params.source_id ) },
            { 'origin_id.source_id': req.params.source_id }  ]
    };
    getFilteringQuery( ConstructModel.find( query ), req.query ).exec(  function ( err, constructs ) {
        if ( err ) {
            return res.status( 500 ).send( err );
        }
        else if ( !constructs || !constructs.length ) {
            return res.status( 404 ).send( { message: 'not found' } );
        }
        return res.status( 200 ).send( constructs );
    });
});

//TODO: MERGE FUNCTION BODIES OF GET RELATED THINGS AND USE PARAMETERS TO SPECIALIZE WHICH MODEL IS TO BE USED
//TODO: create function to get the current state of construct

//API ENDPOINT: GET RELATED EVENTS
router.get('/:id/relatedevents', function(req,res){
    var match = {}; // query for filtering related_events
    var queryKeys = Object.keys( req.query );
    
    if ( queryKeys.length !== 0 )  {
        var key = queryKeys[0];
        var value = req.query[key];
        if ( value !== '' ) {
            // filter by key and value.
            // value is a string but it could also be a number
            value = isNaN( value ) ? value : Number( value );
            match[key] = value;
        }
        else {
            // no value just the key
            match[key] = { $exists: true };
        }
    }

    ConstructModel.findById( req.params.id )
    .populate( {  path: 'related_events', match: match } )
    .exec( function ( err, construct ) {
        if ( err ) {
            return res.status( 500 ).send( err );
        }
        else if ( !construct ) {
            return res.status( 404 ).send( { message: 'not found' } );
        }
        
        return res.status( 200 ).send( construct.related_events );
    });
});

//API ENDPOINT: GET RELATED STATECHANGES
router.get('/:id/relatedstatechanges', function(req,res){
    var match = {}; // query for filtering related_events
    var queryKeys = Object.keys( req.query );
    
    if ( queryKeys.length !== 0 )  {
        var key = queryKeys[0];
        var value = req.query[key];
        if ( value !== '' ) {
            // filter by key and value.
            // value is a string but it could also be a number
            value = isNaN( value ) ? value : Number( value );
            match[key] = value;
        }
        else {
            // no value just the key
            match[key] = { $exists: true };
        }
    }

    ConstructModel.findById( req.params.id )
    .populate( {  path: 'related_statechanges', match: match } )
    .exec( function ( err, construct ) {
        if ( err ) {
            return res.status( 500 ).send( err );
        }
        else if ( !construct ) {
            return res.status( 404 ).send( { message: 'not found' } );
        }
        
        return res.status( 200 ).send( construct.related_statechanges );
    });
});

//API ENDPOINT: GET RELATED CONSTRUCTS
router.get('/:id/relatedconstructs', function(req,res){
    var match = {}; // query for filtering related_constructs
    var queryKeys = Object.keys( req.query );
    
    if ( queryKeys.length !== 0 )  {
        var key = queryKeys[0];
        var value = req.query[key];
        if ( value !== '' ) {
            // filter by key and value.
            // value is a string but it could also be a number
            value = isNaN( value ) ? value : Number( value );
            match[key] = value;
        }
        else {
            // no value just the key
            match[key] = { $exists: true };
        }
    }

    ConstructModel.findById( req.params.id )
    .populate( {  path: 'related_constructs', match: match } )
    .exec( function ( err, construct ) {
        if ( err ) {
            return res.status( 500 ).send( err );
        }
        else if ( !construct ) {
            return res.status( 404 ).send( { message: 'not found' } );
        }
        
        return res.status( 200 ).send( construct.related_constructs );
    });
});


//TODO: REFACTOR ELSE IF STRUCTURES SO THAT THOSE DETERMINE WHICH MODEL IS USED TO TEST, UPDATE AND SO ON...
//THIS WOULD MAKE IT EASIER TO EXTEND IN FUTURE AND IT ALSO SAVES ONE ERRORPRONE ELSE IF BRANCH.

//API ENDPOINT: LINK
router.put('/:id/link', function(req,res){
    var id = req.params.id;
    var id_other = req.body.id;
    //test if the objects exist to prevent adding non-existing
    //object ids
    var testRead = ConstructModel.findById(id).exec();
    var testOther;
    var found;
    if (req.body.type === "event"){
        testOther = EventModel.findById(id_other).exec();
    }  
    else if (req.body.type === "construct"){
        testOther = ConstructModel.findById(id_other).exec();
    }
    else if(req.body.type === "statechange"){
        //Statechanges are events
        testOther = EventModel.findById(id_other).exec();
    }
    else {
        console.log("Error in linking: type not valid");
        return res.status(404).send("Type is not valid");
    }
    
    //in promises check if object ids valid, if they are,
    //start linking
    testRead.then(function(con) {
        if (!con) {
            found = false;
            return testOther;
        }
        else {
            found = true;
            return testOther;
        }
    }).then(function(other) {
        if (!other || !found) {
            //console.log("Error in linking: Invalid ID");
            return res.status(404).send("[ConstructAPI]Invalid ID: "+"ID 1: " + id + " ID 2: " + id_other);
        }
    
        var readCon;
        var readOther;

        //check what type the other object is, and update accordingly
        //this assumes that Mongo IDs and type are correct
        if (req.body.type === "event") {
            //do findByIdAndUpdate with addToSet as update to
            //avoid parallelism problems such as duplicates added
            //to the list.
            readCon = ConstructModel.findByIdAndUpdate(id,{
                '$addToSet':  {'related_events': id_other }
            }).exec();
            readOther = EventModel.findByIdAndUpdate(id_other,{
                '$addToSet': {'related_constructs': id }
            }).exec();
        }//Statechanges are also linked also to events!!
        else if (req.body.type === "statechange") {
            readCon = ConstructModel.findByIdAndUpdate(id,{
                '$addToSet':  {
                    'related_statechanges': id_other,
                    'related_events': id_other
                }
            }).exec();

            //Statechanges are events
            readOther = EventModel.findByIdAndUpdate(id_other,{ 
                '$addToSet': {'related_constructs': id }
            }).exec();
        }
        else if (req.body.type === "construct" ) {
            readCon = ConstructModel.findByIdAndUpdate(id,{
                '$addToSet':  {'related_constructs': id_other }
            }).exec();
            readOther = ConstructModel.findByIdAndUpdate(id_other,{
                '$addToSet': {'related_constructs': id }
            }).exec();
        }

        //use promises to send back the response when done
        var _construct;

        readCon.then(function(con) {
            _construct = con;
            return readOther;
        }).then(function(other) {
            return res.status(200).send([_construct, other]);
        }, function(err) {
            //error if promise not fulfilled
            return res.status(404).send("Unknown error when linking");
        });
    },function(err) {
        //if promises are not fulfilled, send error
        return res.status(404).send("Unknown error when linking");
    });
});


module.exports = router;
