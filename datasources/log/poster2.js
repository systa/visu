/*
* Copyright (c) TUT Tampere University of Technology 2014-2015.
* All rights reserved.
* This software has been developed in Tekes-TIVIT project Need-for-Speed.
* All rule set in consortium agreement of Need-for-Speed project apply.
*
* Main authors: Otto Hylli, Antti Luoto
*/

// module that sends the collected issue data to the database

var request = require( 'request' );
var _ = require( 'underscore' );

var debugLink = false;
var debugSend = false;
var debugParse = true;

function parseJenkinsTime(jenkinsTime){
    //var d = new Date(year, month, day, hours, minutes, seconds, milliseconds); 
    var time = new Date(jenkinsTime.substr(0,4), jenkinsTime.substr(5,2)-1, jenkinsTime.substr(8,2),
        jenkinsTime.substr(11,2), jenkinsTime.substr(14,2), jenkinsTime.substr(17,2), "000");
    return time;
}

// sends the data to db
// logData : parsed log content
function sendToDb( logData ) {
   console.log("[Poster]sendToDb()");

   // the api urls
   var config = require('./config.json');
   var serverUrl = config.serverUrl;
   var port = config.port;
   var server = serverUrl + ':' + port;
   var api = server + '/API/';
   var artefactApi = api +'constructs/';
   var eventApi = api +'events/';
   var bufferSize = 10;
   
   var pending = [];//List of requests to be send
   //However actually the requests that are already send are not moved away from the list
   //so it's kind of misleading name.
    
   var count = 0;
   var added = 0;
   
   // add stuff to the db in this order 
   var entityOrder = [ 'users', 'sessions', 'documents', 'pages', 'events', 'state-changes' ];
   
   // create an origin
   origin = { context: "kactus2", source: "logs"};
   
   // get every list from the issue data and add every item from them to db
   entityOrder.forEach( function ( type ) {
        var list = logData[type];
        if ( !list ) {
            return;
        }
        count += list.length; // every item from the list should be added      
        type = type.substr( 0, type.length -1 ); // e.g. comments -> comment
      
        list.forEach( function ( item ) {
            var artefact = {};
            var event = {};
            var state_change = {};
            var meta = {};
           
            if ( type === "user" || type === "session" || type === "document" || type === "page" ) {
                // we are creating a construct / artefact from a user, session, document or page
                artefact.type = type;
                //artefact.description = item.description;
               
                if ( type === "user" ) artefact.name = item.user_id;
                else if ( type === "session" ) artefact.name = item.session_id;
                else artefact.name = item.name;
                  
                artefact.origin_id = { context: origin.context, source: origin.source, source_id: String( artefact.name ) };
               
                if ( type == "document" ) {
                   meta.hash = item.hash;
                   artefact.data = meta;
                }
               
                pending.push({body: artefact, url: artefactApi, type: type, sent: false, item : item});
            }

            else if ( type === "event" ) {
               event.type = type;
               event.time = item.date + "@" + item.time;
               event.duration = 0;
               event.creator = item.session_id;
               event.data = {hash: item.hash, action: item.action};
               
               pending.push({body: events, url: eventApi, type: type, sent: false, item : item});
            }
           
           
            else if ( type === "state-change" ) {
               state_change.event = item.event;
               state_change.from = item.from;
               state_change.to = item.to;
               
               //Add state-change to event
               for (var i = 0; i < events.length; i++) {
                  if (events[i].data.hash === item.event) {
                     events[i].isStatechange = true;
                     events[i].statechange = {from: item.from, to: item.to};
                  }
               }
            }
           
            else {
               console.log("[ERROR]Unknown data type:" + type);
            }

            //// OLD 
           /*
            else if ( type === 'comment' || type === 'changeEvent' ) {
                // we are creating a event from an issue comment or changeEvent
                event.origin_id = {
                    source_id: String( item.id ),
                    source: origin.source,
                    context: origin.context
                };
                event.time = item.created;
                event.creator = item.user;
                //if creator happens to be undefined the shcema validation on backend breaks.
                //and this is afully common case.
                if(event.creator === undefined || event.creator === null){
                    event.creator = "unknown";
                }
                
                //comments
                if ( type === 'comment' ) {
                    event.type = 'comment';
                    event.data = {};
                    event.data.message = item.message;
                }
                //change event
                else if ( item.change === 'opened' || item.change === 'reopened' || item.change === 'closed' ) {
                    //I reduce the reopened state to opened state because by doing that we can
                    //count on that when we get state closed the state change is from state opened
                    event.type = item.change;
                    event.isStatechange = true;

                    event.statechange = {
                        from : "",
                        to: "open"
                    };

                    if(item.change ==='reopened'){
                        event.statechange.from = "closed";
                        event.statechange.to = "open";
                    }
                    else if(item.change === 'closed'){
                        event.statechange.from = "open";
                        event.statechange.to = "closed";
                    }
                }
                //other events
                else{
                    event.type = item.change;
                }
                if(debugParse){
                    console.log(event);
                }
                
                pending.push({body: event, url: eventApi, type: type, sent: false, item : item});
            }
            */
           
        });//LIST FOR EACH END
    });//ENTITY ORDER FOR EACH END
    
    //Send to db
    //NOW SENDING IS DONE AFTER PARSING.
    //IT MIGHT BE GOOD IDEA TO DO THESE PARALLEL HOWEVER NEW WAY TO MANAGE BUFFER WOULD BE NEEDED!!
    createNewBuffer();
    
    function createNewBuffer(){
        var start = added;
        if(start >= pending.length){
            return true;
        }
        var end = added+bufferSize;
        if(end >= pending.length){
            end = pending.length;
        }
        
        
        var buffer = [];
        for(var requests = start; requests < end; ++requests){
            buffer.push(pending[requests]);
        }
        if(debugSend){
            console.log("start: ", start, " end: ", end);
            console.log("All requests: ",pending.length, " in buffer: ", buffer.length);
        }
        
        var bufferPromise = new Promise(function(resolve, reject){
            var buffered = [];
            buffer.forEach(function(obj){
                var prom = createPromise(obj);
                buffered.push(prom);
            });
            Promise.all(buffered).then(function(val){
                resolve("buffer");
            });
        }).then(function(val){
            var retval = createNewBuffer();
            if(retval === true){
                if(debugSend){
                    console.log("ADDED: ", added);
                    console.log("COUNT: ", count);
                }
                link();
            }
        });
        return false;
    }//end createNewBuffer()
    
    function createPromise(obj){
        return new Promise(function(resolve, reject){
            request.post({
                url: obj.url,
                json: true,
                body: obj.body
            },function ( err, response, body ) {
                if ( err ) {
                    console.log( err );
                    reject("post");
                    process.exit();
                }
                else if( response.statusCode !== 201  && response.statusCode !== 200) {
                    console.log( response.statusCode );
                    console.log( body );
                    reject("post");
                    process.exit();
                }
                added++; // one item added
                
                var item = obj.item;
                var type = obj.type;
                
                if (type === 'issue' || type === 'milestone' || type === 'jiraIssue' || type === 'build' ) {
                    // add the mongodb id of this construct so that it can be associated with its original id
                    if ( !eventLinks[item.id] ) {
                        eventLinks[item.id] = { eventIds: [], changeIds: []};
                    }
                    eventLinks[item.id].constructMongoId = body._id;

                    // if this is an issue that has a milestone add its mongoId so that it can be linked with the milestone
                    if ( item.milestone  ) {
                        if ( !milestoneLinks[item.milestone] ) {
                            milestoneLinks[item.milestone] = { issues: [] };
                        }
                        milestoneLinks[item.milestone].issues.push( body._id );
                    }

                    if ( type === 'milestone' ) {
                        // add mongoid for linking with issues
                        if ( !milestoneLinks[item.id] ) {
                            milestoneLinks[item.id] = { issues: [] };
                        }

                        milestoneLinks[item.id].milestoneMongoid = body._id;
                    }
                }
                else if ( type === 'comment' || type === 'changeEvent' || type === 'jiraChange' || type === 'buildHistory' ){

                    if(debugLink){
                        console.log(body);
                    }

                    // store mongoid for linking purposes
                    var constructId = item.issue;
                    if ( item.milestone ) {
                        constructId = item.milestone;
                    }
                    if ( !eventLinks[constructId] ) {
                        eventLinks[constructId] = { eventIds: [], changeIds: []};
                    }

                    //jira parser - events come inside an array
                    if(type === 'jiraChange') {
                        for(var i = 0; i < body.length; ++i) {
                            if(body[i].isStatechange === true){
                                eventLinks[constructId].changeIds.push( body[i]._id);
                            }
                            else{
                                eventLinks[constructId].eventIds.push( body[i]._id );
                            }
                            
                        }
                    }
                    //github parser and builds from jenkins
                    else if(body.isStatechange === true){

                        eventLinks[constructId].changeIds.push( body._id );
                    }
                    else{
                       eventLinks[constructId].eventIds.push( body._id ); 
                    }
                }
                obj.sent = true;
                resolve("post");
            });
        });
    }//end createPromise()
    

    //TODO: THROTTLE LINKING LIKE SENDING!!!

    // links issues to milestones and constructs to events using the previously collected information
    function link() {
        console.log("[Poster]linking");
        // variables used to determine when we are done linking
        var linkCount = 0; // how many to be created
        var linked = 0; // how many linked
        // the links to be created 
        // will contain objects that have the id of the construct to be linked,
        // the other object to be linked and the type of the other object (construct or event)
        var links = [];

        // build the links list from the milestoneLinks and eventLinks
        _.each( milestoneLinks, function ( item ) {
            item.issues.forEach( function ( issueId ) {
                links.push( { construct: issueId, target: item.milestoneMongoid, type: 'construct' } );
            });
        });

        _.each( eventLinks, function ( item ) {
            item.eventIds.forEach( function ( eventId ) {
                links.push( { construct: item.constructMongoId, target: eventId, type: 'event' } );
            });

            item.changeIds.forEach(function(changeId){
                links.push( {construct: item.constructMongoId, target: changeId, type: 'statechange'} );
            });
        });
        linkCount = links.length;
      
        // create all of the links.
        links.forEach( function ( link ) {
            if(debugLink){
                console.log("target: "+link.target, " type: "+link.type);
            }
            
            request.put( {
                url: artefactApi +link.construct +'/link',
                json: true,
                body: { id: link.target, type: link.type }
            }, function ( err, response, body ) {
                var dup = false;
                if ( err ) {
                    console.log( err );
                    process.exit();
                    
                }
                else if ( response.statusCode !== 201 && response.statusCode !== 200) {
                    console.log( response.statusCode );
                    console.log( body );
                    process.exit();
                }
                linked++;
                if ( linked === linkCount ) {
                    // all links formed we are done
                    // could call a callback here if we had one
                    console.log( '[Poster]Everything saved to database.' );
                }
            });
        });
    }//end link()
}

module.exports = sendToDb;
