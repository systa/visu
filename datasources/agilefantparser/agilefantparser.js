var http = require('http');
var request = require('request');

var config = require('./config.json');
var serverUrl = config.serverUrl;
var port = config.port;
var server = serverUrl + ':' + port;
var apiUrl = server + '/API/';
var eventsApi = apiUrl +'events/';
var constructsApi = apiUrl +'constructs/';
var request = require('request');

//var path = process.argv[2];
//var repo = process.argv[4];
//var token = process.argv[5];
var agileRepo = process.argv[2];//"https://app.agilefant.com/TTY-TIE";
//console.log(path);
var username = process.argv[3];
var password = process.argv[4];
if(process.argv[4] == null) {
    console.log("usage: node agilefantparser.js <repo_url> <username> <password>")
    return;
}
var url = agileRepo + "/api/v1/" + "/stories/search" + "?templates=Update";
var auth = "Basic " + new Buffer(username + ":" + password).toString("base64");

var backlogCount = 0;
var storyCount = 0;

// posts a single item to the db. Parameters:
// url: where to post
// item: object to be posted
// result: save information if the operation succeeded. or failed
// idList: add the mongodb id of the created item here
// processNewItem: called to process the posted item i.e. the thing the API returned
function postToDb( url, item, result, idList, processNewItem ) {
    request.post( {
                url: url,
                body: item,
                json: true
            }, function ( err, response, body ) {
                if ( err || response.statusCode != 201 ) {
                    // just note that we didn't manage to post this item
                    // possibly should add more information why failed and what item failed
                    // or maybe instead should abort and not continue posting items
                    result.failedCount += 1;

                    console.log('Failed to add: ' + item.type + ' ' + item.origin_id[0].source_id);
                    console.log(response);
                } else {
                    processNewItem( body );
                }

            });
}

function getStories() {
    request(
        {
            url : agileRepo + "/api/v1/stories/search" + "?templates=Update",
            headers : {
                "Authorization" : auth
        }
        },
        function (error, response, body) {
            o = JSON.parse(body);
            var item = {};
            for(var i = 0; i < o.length; i++) {

                item = {};
                item = o[i];
                var constructResult = {};
                var construct = {};
                construct.type = 'story'
                construct.origin_id = [ { 'source_id': String( item.id ), 'source': agileRepo, context: item.name } ];
                construct.name = item.name;
                var meta = {};
                meta.startTime = item.startDate;
                meta.endTime = item.endDate;
                meta.id = item.id;
                construct.data = meta;


                postToDb(constructsApi, construct, constructResult, constructResult.eventIds, function ( newConstruct ) {
                    
                    createStateChangeEvents(newConstruct);
                    getComments(newConstruct);
                });

            }
        }
    );
}

function getComments(construct) {
    request(
        {
            url : agileRepo + "/api/v1/stories/" + construct.origin_id[0].source_id + "/comments?templates=Update",
            headers : {
                "Authorization" : auth
        }
        },
        function (error, response, body) {
            o = JSON.parse(body);
            //console.log(o.length);
            var item = {};
            for(var i = 0; i < o.length; i++) {

                var storyResult = {};
                item = {};
                item = o[i];
                if(item.content != null) {
                    var event = {};
                    event.type = 'comment'
                    event.origin_id = [ { 'source_id': String( item.id ), 'source': agileRepo, context: agileRepo } ];
                    event.creator = "agilefant";
                    event.time = item.createDate;
                    event.data = {};
                    event.data.comment = item.content;
                    event.isStatechange = false;

                    postToDb(eventsApi, event, storyResult, storyResult.eventIds, function ( newEvent ) {
                        console.log("added comment " + newEvent.data.comment + " " + construct.origin_id[0].source_id);
                        linkEventToConstruct(newEvent._id, construct._id);
                    });
                }

            }
        }
    );
}

function createStateChangeEvents(construct) {
    var storyResult = {};
    var event = {};
    event.origin_id = [ { 'source_id': String( construct.data.id ), 'source': agileRepo, context: agileRepo } ];
    event.creator = "agilefant";
    if(construct.data.startTime != null) {
        event.type = 'open'
        event.time = construct.data.startTime;
        event.isStatechange = true;
        event.statechange = {
            from : "",
            to : "open"
        };

        postToDb(eventsApi, event, storyResult, storyResult.eventIds, function ( newEvent ) {
            linkEventToConstruct(newEvent._id, construct._id);
        });
    }

    if(construct.data.endTime != null) {
        event.type = 'closed'
        event.time = construct.data.endTime;
        event.statechange = {
            from : "open",
            to : "closed"
        };

        postToDb(eventsApi, event, storyResult, storyResult.eventIds, function ( newEvent ) {
            linkEventToConstruct(newEvent._id, construct._id);
        });
    }
}

function getBacklogs() {
    request(
        {
            url : agileRepo + "/api/v1/" + "/backlogs/all" + "?templates=Update,Name",
            headers : {
                "Authorization" : auth
        }
        },
        function (error, response, body) {
            o = JSON.parse(body);
            var item = {};
            for(var i = 0; i < o.length; i++) {
                item = {};
                item = o[i];
                var result = {};
                var construct = {};
                construct.type = 'backlog'
                construct.origin_id = [ { 'source_id': String( item.id ), 'source': agileRepo, context: item.name } ];
                construct.name = item.name;


                postToDb(constructsApi, construct, result, result.eventIds, function ( newBacklog ) {
                    backlogCount++;
                    getStories(newBacklog)
                });

            }
        }

    );
}

function linkEventToConstruct(eventId, constructId) {
    request.put( {
        url: constructsApi + constructId +'/link',
        json: true,
        body: { id: eventId, type: 'event' }
    }, function ( err, response, body ) {
        if ( err || response.statusCode != 200 ) {
        }
        
        else {
            console.log("linked " + eventId + " to " + constructId);
        }
        
    });
}

getStories();