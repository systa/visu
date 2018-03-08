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
                    //console.log("added " + item.id + "to " + url);
                    processNewItem( body );
                }

            });
}

function getStories(backlog) {
    request(
        {
            url : agileRepo + "/api/v1/backlogs/" + backlog.origin_id[0].source_id + "/stories" + "?templates=Update",
            headers : {
                "Authorization" : auth
        }
        },
        function (error, response, body) {
            o = JSON.parse(body);
            //console.log(o.length);
            var item = {};
            for(var i = 0; i < o.length; i++) {
                item = {};
                item = o[i];
                var result = {};
                var storyEvent = {};
                storyEvent.type = 'story'
                storyEvent.origin_id = [ { 'source_id': String( item.id ), 'source': agileRepo, context: item.backlog.name } ];
                storyEvent.creator = "agilefant";
                storyEvent.time = item.startDate;
                var start = new Date(item.startDate);
                var end = new Date(item.endDate);
                storyEvent.duration = end.getTime() - start.getTime();                                                                                                                                                                                          

                storyEvent.data = { 'name': item.name };

                storyEvent.data.additions = "0"; //defaults to be updated later
                storyEvent.data.deletions = "0";
                storyEvent.data.total = "0";

                postToDb(eventsApi, storyEvent, result, result.eventIds, function ( newEvent ) {
                    storyCount++;
                    linkEventToConstruct(newEvent._id, backlog._id);
                });

            }
        }
    );
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
            //console.log(o.length);
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

getBacklogs();