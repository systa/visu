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

var debugLink = true;
var debugSend = true;
var debugParse = true;


function parseJenkinsTime(jenkinsTime){
    //var d = new Date(year, month, day, hours, minutes, seconds, milliseconds); 
    var time = new Date(jenkinsTime.substr(0,4), jenkinsTime.substr(5,2)-1, jenkinsTime.substr(8,2),
        jenkinsTime.substr(11,2), jenkinsTime.substr(14,2), jenkinsTime.substr(17,2), "000");
    return time;
}

// sends the data to db
// issueData: object containing lists for different entity types (issue, comment, milestone)
// origin: contains the source and context used in origin_id
function sendToDb( issueData, origin ) {
    if(debugSend){
        console.log("Data sending from ", origin);
    }

   // the api urls
   var config = require('./config.json');
   var serverUrl = config.serverUrl;
   var port = config.port;
   var server = serverUrl + ':' + port;
   var api = server + '/API/';
   var artefactApi = api +'constructs/';
   var eventApi = api +'events/';
   var bufferSize = 10;
   
   // collect information (mongodbids) for linking issues and milestones
   var milestoneLinks = {};
   // collect information (mongodbIds) for linking events and constructs
   var eventLinks = {};
   // variables for counting when everything has been added
   var count = 0; // how many to add
   var added = 0; // how many added
   
   var pending = [];//List of requests to be send
   //However actually the requests that are already send are not moved away from the list
   //so it's kind of misleading name.
   
   
   // add stuff to the db in this order 
   var entityOrder = [ 'milestones', 'issues', 'comments', 'changeEvents', 'jiraIssues', 'jiraChanges', 'builds', 'buildHistorys'  ];
   
   // Arrays for Jira parser
   // Items that are not wanted - fields after 'Sprint' might be interesting for us
   var croppedItems = ['Workflow', 'reporter', 'WorklogId', 'timeestimate', 'timespent', /*'Rank', 'summary', 'Sprint', 'assignee','Flagged',*/ 'issuetype'/*, 'priority', 'Comment'*/];

   // get every list from the issue data and add every item from them to db
    entityOrder.forEach( function ( type ) {
        var list = issueData[type];
        if ( !list ) {
            return;
        }
        count += list.length; // every item from the list should be added      
        type = type.substr( 0, type.length -1 ); // e.g. comments -> comment

        list.forEach( function ( item ) {
            var artefact = {};
            var event = {};
            var meta = {};

            if ( type === 'issue' || type === 'milestone' ) {
                // we are creating a construct / artefact from an issue or milestone
                artefact.type = type;
                artefact.description = item.description;
                artefact.name = item.title;
                artefact.origin_id = { context: origin.context, source: origin.source, source_id: String( item.id ) };

                meta.created = item.created;
                meta.updated = item.updated;
                meta.number = item.number;
                meta.state = item.state.toLowerCase();
                if ( type === 'milestone' ) {
                    meta.duedate = item.duedate;
                }

                else if ( type === 'issue' ) {
                    meta.assignee = item.assignee;
                }

                artefact.data = meta;

                //body = artefact;
                //url = artefactApi;
                pending.push({body: artefact, url: artefactApi, type: type, sent: false, item : item});
            }
            else if( type === 'jiraIssue' ) {
                // we are creating a construct / artefact from a jiraIssue
                artefact.type = item.type.toLowerCase();
                if(item.description !== null && item.description !== undefined) {
                    artefact.description = item.description;
                } else {
                    artefact.description = "";
                }

                if(item.summary !== null && item.summary !== undefined){
                    artefact.name = item.summary;
                }
                else{
                    artefact.name = "";
                }
                
                artefact.origin_id = {
                    context: origin.context,
                    source: origin.source,
                    source_id: String( item.key )
                };
                meta.id = item.id;
                meta.created = item.created;
                meta.updated = item.updated;
                meta.timespent = item.timespent;
                meta.priority = item.priority;
                meta.state = item.state.toLowerCase();

                artefact.data = meta;
                pending.push({body: artefact, url: artefactApi, type: type, sent: false, item : item});
            }
            else if( type === 'jiraChange'){

                //all the events are passed to the db as an array
                var events = [];

                //Create event is a special case. No other creation info than time comes from api.
                var createEvent = {};
                createEvent.origin_id = {
                    source_id: String( item.key ),
                    source: origin.source,
                    context: origin.context
                };
                createEvent.time = item.created;
                createEvent.creator = item.creator;
                createEvent.type = "statechange";
                createEvent.isStatechange = true;
                createEvent.statechange = {
                    from : "",
                    to: "open"
                };
                events.push(createEvent);
                
                //one item generates multiple events from the history
                for(var i = 0; i < item.history.length; ++i){
                    //one history item can contain multiple changes
                    for(var j = 0; j < item.history[i].items.length; ++j){
                        //not cropped item
                        if(croppedItems.indexOf(item.history[i].items[j].field) < 0 ){
                            //jeve == jira event
                            var jeve = {
                                origin_id : {
                                    source_id: String(item.history[i].id)+String(item.key),
                                    source: origin.source,
                                    context: origin.context
                                },
                                time : item.history[i].created,
                                creator : item.history[i].author.name,
                                type : item.history[i].items[j].field.toLowerCase(),
                                data : {}
                            };
                            
                            //If the event is an state change event we retrieve the state change
                            if(item.history[i].items[j].field.toLowerCase() === "status"){
                                isStatechange = true;
                                jeve.isStatechange = true;
                                //jeve.state = item.history[i].items[j].toString.toLowerCase();
                                jeve.statechange = {
                                    from : item.history[i].items[j].fromString.toLowerCase(),
                                    to: item.history[i].items[j].toString.toLowerCase()
                                };
                            }//From resolution events we can find state changes to resolution state and reopened issues
                            else if(item.history[i].items[j].field.toLowerCase() === "resolution"){
                                if(debugParse){
                                    console.log(item.history[i].items[j]);
                                }
                                
                                if(item.history[i].items[j].toString !== null &&
                                item.history[i].items[j].toString !== undefined){
                                    jeve.isStatechange = true; 
                                    jeve.statechange = {
                                        from : "",
                                        to: item.history[i].items[j].toString.toLowerCase()
                                    };
                                    if(item.history[i].items[j].fromString !== null &&
                                        item.history[i].items[j].fromString !== undefined){
                                        jeve.statechange.from = item.history[i].items[j].fromString.toLowerCase();
                                    }
                                }
                                
                            }//Otherwise the event is not a state change
                            
                            //Lets store some interesting metadata
                            if(item.history[i].items[j].toString !== null &&
                            item.history[i].items[j].toString !== undefined){
                                jeve.data.toString = item.history[i].items[j].toString.toLowerCase();
                            }
                            if(item.history[i].items[j].fromString !== null &&
                            item.history[i].items[j].fromString !== undefined){
                                jeve.data.fromString = item.history[i].items[j].fromString.toLowerCase();
                            }
                            events.push(jeve);
                        } 
                    }
                }//For iterating item history ends!

                //Imported issues do not have anything it their histories and that is why we need to
                //dig the possible resolution from issues resolution field.
                if(item.history.length < 1){
                    if(item.resolutiondate !== null && item.resolutiondate !== undefined){
                        //resev == resolution event
                        var resev = {
                            origin_id : {
                                source_id: String(item.key),
                                source: origin.source,
                                context: origin.context
                            },
                            time : item.resolutiondate,
                            creator : item.assignee,
                            type : "statechange",
                            //state : item.status.toLowerCase(),
                            statechange : {
                                from : "open",
                                to : item.status.toLowerCase()
                            },
                            isStatechange : true
                        };
                        if(resev.creator === null || resev.creator === undefined){
                            resev.creator = "unknown";
                        }
                        events.push(resev);
                    }
                }
                pending.push({body: events, url: eventApi, type: type, sent: false, item : item});
            }
            else if ( type === 'build') {
                artefact.type = 'job';
                artefact.name = item.name;
                artefact.description = item.description;
                
                artefact.origin_id = { context: origin.context, source: origin.source, source_id: String( item.id ) };
                pending.push({body: artefact, url: artefactApi, type: type, sent: false, item : item});
            }
            else if ( type === 'buildHistory') {

                event.type = "build";
                event.origin_id = {
                    source_id: String( item.id ),
                    source: origin.source,
                    context: origin.context
                };
                event.duration = item.duration;
                event.creator = item.creator;
                event.time = parseJenkinsTime(item.time);
                event.isStatechange = true;
                event.statechange = {
                    to : item.state.toLowerCase(),
                    from : ""
                };
                if( event.creator === null || event.creator === undefined)  {
                    event.creator = "unknown";
                }

                //item.issue is added because linking is based on "issue" field.
                //name is something like "hello #123" where "hello" is the job name and followed by build number
                item.issue = item.name.substr(0, item.name.indexOf('#') - 1);
                pending.push({body: event, url: eventApi, type: type, sent: false, item : item});
            }
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
    }
    
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
    }
    

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
    }
}

module.exports = sendToDb;
