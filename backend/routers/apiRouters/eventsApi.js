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
//remember that these routes are written so that the root node for routing here is /api/events/

var express = require('express');
var router = express.Router();
var mongoose = require('mongoose');
var _ = require('underscore');

// helper function for using query parameters in database queries
var getFilteringQuery = require( './utils.js' ).getFilteringQuery;

var EventModel = mongoose.model('Event');

//load router specific (API specific)middleware (nothing yet)

//router.use()


//API ENDPOINT: GET ALL WITH FILTERING
router.get('/', function(req,res){
    
    var query = req.query;

    //both the start and end times are required now
    if (query.hasOwnProperty("startTime") && query.hasOwnProperty("endTime"))
    {
       //filtering is targeted to "time" attribute. it must be greater or equal to startTime and less than endTime.
       query.time = {$gte: new Date(query.startTime), $lt: new Date(query.endTime)};
       
       //delete start and end times from query so that EventModel.find works
       delete query.startTime;
       delete query.endTime;
       filter = true;
    }
    if (query.hasOwnProperty("freeText")) {
        
        //Add a text search object to query. The search utilizes text index declared in constructSchema.
        //Search all the fields in the text index with freeText.
        query.$text = {$search: query.freeText};
        
        //delete freeText property from query so that EventModel.find works
        delete query.freeText;
        filter = true;
    }
    
    return getFilteringQuery( EventModel.find( query ), {} ).exec(function(err, events){
        if(!err){
            return res.status(200).send(events);
        } else{
            console.log(err);
            return res.status(500).send(err);
        }
    });

});


//API ENDPOINT: CREATE AND MASS CREATE
router.post('/', function(req,res){
    
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
    
    //First we check if the events is allready in the db
    //The unique set of parameters is origin_id + type + time for events and
    //origin_id + type + time + statechange.to for statechanges
    requests.forEach(function(request){
        var query = {
            'origin_id.source': request.origin_id.source,
            'origin_id.context': request.origin_id.context,
            'origin_id.source_id': request.origin_id.source_id,
            'type' : request.type,
            'time' : request.time,
            'isStatechange' : false //default
        };

        //However if we actually have a statechange we add some more properties
        //to check the uniqueness of the event
        if(request.isStatechange === true){

            if(request.statechange === undefined){
                //ERROR STATECHANGE IS REQUIRED FOR STATECHANGE
                return res.status(500).send("statechange object is required for statechange events!");
            }
            else if(request.statechange.to === undefined || request.statechange.from === undefined){
                return res.status(500).send("statechange.to and statechange.from are required for statechange events!");
            }
            query.isStatechange = true;
            query['statechange.to'] = request.statechange.to;
            query['statechange.from'] = request.statechange.from;
        }
        
        var promise = getFilteringQuery( EventModel.find( query ), {}).exec(function (errfind, events ){
            if(errfind){
                console.log("READ ERROR: ", errfind);
                error = true;
                errormsg = errfind;
                return false;
            }
            else{
                found = found.concat(events);
                return true;
            }
        });
        promises.push(promise);
    });
    
    //When the get is done we move to here and check if we need to add some events
    Promise.all(promises).then(function(val){
        
        if(error){
            return res.status(500).send(errormsg);
        }
        
        var toBeAdded = [];
        
        //If we had an error in reading we return 500
        if(!masscreate && found.length > 0){
            //console.log("FOUND FOR SINGLE ADD: ", found);
            return res.status(200).send( found[0]);
        }
        //All the events were already added, return 200
        else if(masscreate && found.length == requests.length){
            //console.log("ALL FOUND: ", found);
            return res.status(200).send(found);
        }
        //For masscreate we clean those events that are allready in the db and add only those which aren't
        else if(masscreate){
            //console.log("FOUND FOR MASS CREATE: ", found);
            //console.log("SHOULD BE ADDED: ", requests);
            
            //Even if we didn't find any duplicates we still need to do the outer loop as we need to add the update time.
            for(var i = 0; i < requests.length; ++i){
                var add = true;
                for(j = 0; j < found.length; ++j){
                    if(found[j].origin_id.source === requests[i].origin_id.souce &&
                    found[j].origin_id.context === requests[i].origin_id.context &&
                    found[j].origin_id.source_id === requests[i].origin_id.source_id &&
                    found[j].type === requests[i].type && found[j].time === requests[i].time){

                        //At this point we know that the common event properties are matching.
                        //Now we want to check the statechange specifics.
                        if(request[i].isStatechange === true){
                            //statechange  is dublicate only if the to and from string matches
                            if(found[j].statechange.to === request[i].statechange.to &&
                                found[j].statechange.from === request[i].statechange.from){

                                add = false;
                                break;
                            }
                        }//Otherwise we know already that we have dublicate event
                        else{
                            add = false;
                            break;
                        }

                       
                    }
                }
                if(add){
                    requests[i].updated = updated;
                    toBeAdded.push(requests[i]);
                }
            }
        }
        //otherwise we add just one event
        else{
            requests[0].updated = updated;
            toBeAdded = requests[0];
        }
        //console.log("ADD: ", toBeAdded);
        //If event is not found we add new event
        //works with a single object or a list of objects
        EventModel.create( toBeAdded, function(err){
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
                return res.status(201).send( result );
            }
        });
    });
});


//API ENDPOINT: READ
router.get('/:id', function(req, res) {

    return EventModel.findById(req.params.id,function (err, ev) {
        if(!err && ev) {
            return res.status(200).send(ev);
        } 

        else if ( !err && !ev ) {
            return res.status(404).send( { 'message': 'not found' } );
        }

        else {
            console.log(err);
            return res.status(500).send(err);
        }
    });
});

//API ENDPOINT: UPDATE
router.put('/:id', function(req,res){

    // remove _id attribute which would cause an error with mongodb 
    // since it doesn't permit the _id to be updated
    // note this will not cause an error if the body doesn't have a _id attribute
    delete req.body._id;
    req.body.updated = new Date().getTime();
    
    // use the option new: true to get the updated version of the document for the callback
    // by default mongoose gives the old version
    EventModel.findByIdAndUpdate(req.params.id, req.body, { new: true }, function (err, ev) {
        if ( err ) {
            console.log( err );
            return res.status( 500 ).send( err );
        }
        else if( !ev ) {
            return res.status( 404 ).send( { 'message': 'not found' } );
        }

        return res.status( 200 ).send( ev );
    });
});

//API ENDPOINT: DELETE
router.delete('/:id', function(req, res){
    EventModel.findByIdAndRemove( req.params.id, function ( err, ev ) {
        if ( err ) {
            return res.status( 500 ).send( err );
        }
        
        else if ( !ev ) {
            return res.status( 404 ).send( { message: 'not found' } );
        }
        
        res.status( 200 ).send( ev );
    });
});

//API ENDPOINT: GET BY SOURCE
router.get('/origin/:source', function(req,res){
    // data base query for geting all with the source
    var query = { 'origin_id.source': req.params.source };
    // use the helper function to add filtering to the query based on query string parameters
    getFilteringQuery( EventModel.find( query ), req.query  ).exec(  function ( err, evs ) {
        if ( err ) {
            return res.status( 500 ).send( err );
        }
        
        else if ( !evs || evs.length === 0 ) {
            return res.status( 404 ).send( { message: 'not found' } );
        }
        
        return res.status( 200 ).send( evs );
    });
});

//API ENDPOINT: GET BY SOURCE ID
router.get('/origin/:source/:source_id', function(req,res){
    // origin_id.id can probably be a string or an integer
    var query = { 'origin_id.source': req.params.source, $or: [ { 'origin_id.source_id': Number( req.params.source_id ) }, 
     { 'origin_id.source_id': req.params.source_id }  ] };
    getFilteringQuery( EventModel.find( query ), req.query ).exec(  function ( err, evs ) {
        if ( err ) {
            return res.status( 500 ).send( err );
        }
        
        else if ( !evs || evs.length === 0 ) {
            return res.status( 404 ).send( { message: 'not found' } );
        }
        
        return res.status( 200 ).send( evs );
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

    EventModel.findById( req.params.id )
    .populate( {  path: 'related_constructs', match: match } )
    .exec( function ( err, ev ) {
        if ( err ) {
            return res.status( 500 ).send( err );
        }
        
        else if ( !ev ) {
            return res.status( 404 ).send( { message: 'not found' } );
        }
        
        return res.status( 200 ).send( ev.related_constructs );
    });
});

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

    EventModel.findById( req.params.id )
    .populate( {  path: 'related_events', match: match } )
    .exec( function ( err, event ) {
        if ( err ) {
            return res.status( 500 ).send( err );
        }
        else if ( !event ) {
            return res.status( 404 ).send( { message: 'not found' } );
        }
        
        return res.status( 200 ).send( event.related_events );
    });
});


//Links event to event
router.put('/:id/link', function(req,res){
    var id = req.params.id;
    var id_other = req.body.id;
    //test if the objects exist to prevent adding non-existing
    //object ids
    var testRead = EventModel.findById(id).exec();
    var testOther = EventModel.findById(id_other).exec();
    var found;
    
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
            return res.status(404).send("[EventAPI]Invalid ID: "+"ID 1: " + id + " ID 2: " + id_other);
        }

        //do findByIdAndUpdate with addToSet as update to
        //avoid parallelism problems such as duplicates added
        //to the list.
        var readCon = EventModel.findByIdAndUpdate(id,
            { '$addToSet':  {
                'related_events': id_other }
            }).exec();
        var readOther = EventModel.findByIdAndUpdate(id_other,
            { '$addToSet': {
                'related_events': id }
            }).exec();

        //use promises to send back the response when done
        var _events;
        readCon.then(function(con) {
            _events = con;
            return readOther;
        }).then(function(other) {
            return res.status(200).send([_events, other]);
        }, function(err) {
            //error if promise not fulfilled
            return res.status(404).send("Unknown error when linking");
        });
    }, function(err) {
        //if promises are not fulfilled, send error
        return res.status(404).send("Unknown error when linking");
    });
});


module.exports = router;