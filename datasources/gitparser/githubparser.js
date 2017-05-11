/*
* Copyright (c) TUT Tampere University of Technology 2014-2015.
* All rights reserved.
* This software has been developed in Tekes-TIVIT project Need-for-Speed.
* All rule set in consortium agreement of Need-for-Speed project apply.
*
* Main authors: Otto Hylli
*/

var GitHubApi = require('github');
var request = require('request');
var _ = require( 'underscore' );
var EventEmitter = require('events').EventEmitter;

var config = require('./config.json');
var serverUrl = config.serverUrl;
var port = config.port;
var server = serverUrl + ':' + port;
var apiUrl = server + '/API/';
var eventsApi = apiUrl +'events/';
var constructsApi = apiUrl +'constructs/';

// the api url base.
var apiUrl = server + '/api/';

// Get a GitHub API client based on the configuration.
function getClient( config ) {
    // create a github client for accessing github. the version parameter is required.
    // The version specifies what version of the GitHub API will be used
    var github = new GitHubApi( { version: '3.0.0' } );
    if ( config.token ) {
        // use for authentication
        github.authenticate( { type: 'oauth', token: config.token } );
    }

    return github;
}

// Gives the repository url based on the config.
function getRepoUrl( config ) {
    return 'https://www.github.com/' +config.user +'/' +config.repo;
}

// gets stuff from github for processing, Parameters:
// github: a github API client
// getter: a GitHub API client's method for getting something from github (commits, issues...)
// config: getter method's first parameter, a object
// result: object for storing information about the processed stuff.
// processor: a function for processing a single item fetched from github
// callback: function that is called when everything has been processed
function getFromGitHub( github, getter, config, result, processor, callback ) {
    result.count = result.count || 0; // how many items we will create
    result.addedCount = result.addedCount || 0; // how many items we actually managed to add to db
    result.constructIds = result.constructIds || []; // the mongodb ids of the constructs we added
    result.eventIds = result.eventIds || []; // the mongodb ids of the events we added
    result.statechangeIds = result.statechangeIds || []; // the mongodb ids of the events we added
    result.commentIds = result.commentIds || []; // the mongodb ids of the comments we added
    result.failedCount = result.failedCount || 0; // how many db insertions failed
    result.linkCount = result.linkCount || 0; // how many links we have to create
    result.eventLinkCount = result.eventLinkCount || 0;
    result.statechangeLinkCount = result.statechangeLinkCount || 0;
    result.linked = result.linked || 0; // how many links we managed to create
    result.failedLinks = result.failedLinks || 0; // how many link creations failed
    result.commentLinks = result.commentLinks || 0; // how many comment links were confirmed during the link counting
    result.commitChanges = result.commitChanges || 0; // how many commit changes succeeded
    result.failedCommitChanges = result.failedCommitChanges || 0; // how many commit changes failed
    result.source = getRepoUrl( config ) || result.source; // the source for origin_id
    result.context = config.user +'/' +config.repo; // context for origin_id
    result.hasNextPage = false; // is there more items available from github

    // process the items from one github API call.
    // if there are more items after that gets the next page
    function  processPage( err, data ) {
        if ( err ) {
            // did not get more items. cannot continue
            callback( err, result );
            return;
        }

        if ( data.length === 0 ) {
            // nothing to process
            callback( null, result );
        }

         // how many items we have now fetched i.e. how many items we have to add to db
        if (data.length !== undefined)
            result.count += data.length;

        // are there more items after this
        result.hasNextPage = github.hasNextPage( data );
        // setup buffering for database inserts
        var processingIterator = 0;

        //remove the old listener if it's there
        if (result.bufferEventHandler)
            result.dataBuffer.removeListener('processor done', result.bufferEventHandler);
        //create the new handler with this data context
        result.bufferEventHandler = function(currentCount) {
            //all items from this page are processed
            if ( result.hasNextPage && currentCount == -1) {
                 // there are more items so get them and use this method to process them
                 github.getNextPage( data, processPage );
            }
            else //more items to process on this page
            {
                var initialIterator = processingIterator;
                result.processingBatch = currentCount+30;
                if (result.processingBatch > result.count) {
                    result.processingBatch = result.count;
                }

                // process each item with the given function, in sets of 30
                if (data.length === undefined)
                    processor( data, result, callback );
                else
                {
                    while (processingIterator < initialIterator+30 && processingIterator < data.length) {
                         processor( data[processingIterator], result, callback );
                         processingIterator++;
                    }
                }
            }
        };
        //add the new listener
        result.dataBuffer.on('processor done', result.bufferEventHandler);
        //start processing with the first event
        result.dataBuffer.emit('processor done', result.count-data.length);
     }

     //setup the data buffer
     result.dataBuffer = new EventEmitter();
     result.bufferEventHandler = null;

     // get the first page of items
     getter( config, processPage );
}

// posts a single item to the db. Parameters:
// url: where to post
// item: object to be posted
// result: save information if the operation succeeded. or failed
// idList: add the mongodb id of the created item here
// callback: called when everything is finished
// processNewItem: called to process the posted item i.e. the thing the API returned
function postToDb( url, item, result, idList, callback, processNewItem ) {
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
                }

                else {
                    // save the mongodb id of the just created item
                    idList.push( body._id );
                    // managed to add a new item
                    result.addedCount += 1;
                    // addititional processing for the new item.
                    processNewItem( body );
                }

                if ( !result.hasNextPage && result.count == result.addedCount + result.failedCount ) {
                    // this is the last page of items and we have processed them all so we can call the callback
                    result.dataBuffer = null;
                    callback( null, result );
                }
                else if (result.dataBuffer && result.processingBatch == result.addedCount + result.failedCount) {
                    if (result.processingBatch == result.count)
                        result.dataBuffer.emit('processor done', -1);
                    else
                        result.dataBuffer.emit('processor done', result.processingBatch);
                }
            });
}

// gets commits of a Github repository and saves them as events to the database
// config is a object containing the repo name, owner's username and possibly an oauth token for authentication
// callback is called when all commits are processed or an error occurs when communicating with github
// callback's parameters are an error object and a results object (see the readme)
function parseCommits( config, callback ) {
    // get a GitHub client for making API calls
    var github = getClient( config );
    // will be given to the callbakc when finished.
    var result = {};
    //save commit sha-numbers and DB ids so that commit additions/deletions can be added later
    result.commits = {};
    result.commitIterator = -1;

    // function for processing a single commit got from github
    function processCommit( item, result, callback ) {
            // build a commit event from a github commit
            var commitEvent = {};
            commitEvent.type = 'commit';
            commitEvent.origin_id = [ { 'source_id': String( item.sha ), 'source': result.source, context: result.context } ];
            commitEvent.creator = item.commit.author.name;
            commitEvent.time = item.commit.author.date;

            commitEvent.data = { 'message': item.commit.message };
            commitEvent.data.parents = _.pluck( item.parents, 'sha' );
            commitEvent.data.committer = item.commit.committer;
            commitEvent.data.comment_count = item.commit.comment_count;
            if ( item.author ) {
                commitEvent.data.author_username = item.author.login;
            }

            if ( item.committer ) {
                commitEvent.data.committer_username = item.committer.login;
            }
            commitEvent.data.additions = "0"; //defaults to be updated later
            commitEvent.data.deletions = "0";
            commitEvent.data.total = "0";

            // post the new event to the database
            // no need to do anything after posting
            postToDb( apiUrl +'events/', commitEvent, result, result.eventIds, callback, function ( newEvent ) {
                result.commits[newEvent.origin_id[0].source_id] = { id: newEvent._id };
            });
    }

    // updates a single commit's changes data
    function processCommitChanges( item, result, callback ) {
        var body = {'data.additions': item.stats.additions, 'data.deletions': item.stats.deletions, 'data.total': item.stats.total};
        request.put( {
            url: apiUrl +'events/' + result.commits[item.sha].id,
            json: true,
            body: body
        }, function ( reqErr, response ) {
            if ( reqErr || response.statusCode != 200 ) {
                // maybe should do something else
                result.failedCommitChanges += 1;
                console.log('Failed to update changes to commit: '+ item.sha);
            }
            else {
                result.commitChanges += 1;
            }

            result.dataBuffer = null;
            callback(null, result);
        });
    }

    //gets one commit's additions/deletions/total and stores them to the database. When all commits have been processed, calls callback
    function getCommitChanges(err, result) {
        if ( err ) {
            callback( err, result );
            return;
        }
        if (result.commitIterator == -1)
        {
            console.log("Getting commit changes from GitHub");
            result.commitKeys = Object.keys(result.commits);
        }

        result.commitIterator++;

        if (result.commitIterator < Object.keys(result.commits).length )
            getFromGitHub( github, github.repos.getCommit, { user: config.user, repo: config.repo, sha: result.commitKeys[result.commitIterator]  }, result, processCommitChanges, getCommitChanges);
        else
        {
            console.log("Processing finished");
            callback(null, result);
        }
    }

    console.log('Getting commits from GitHub');
    // get the commits and start processing them
    getFromGitHub( github, github.repos.getCommits, { user: config.user, repo: config.repo }, result, processCommit, getCommitChanges );
}

// get issues and their events from github and add them to db
// parameters are the same as parseCommmit's
function parseIssues( config, callback ) {
    var github = getClient( config );

    var result = {};
    // save created issue ids and events associated with it
    // used when connecting issues and related events
    result.issues = {};

    // process a single issue fetched from github
    function processIssue( item, result, callback ) {
        // create a construct from the issue
        var construct = {};
        construct.origin_id = [{
            source_id: String( item.number ),
            source: result.source,
            context: result.context
        }];
        //construct.state = item.state;
        if ( item.pull_request  ) {
            construct.type = 'pull request';
        }

        else {
            construct.type = 'issue';
        }

        construct.name = item.title;
        construct.description = item.body;

        var meta = {};
        meta.id = item.id;
        if ( item.labels ) {
            meta.labels = _.pluck( item.labels, 'name' );
        }

        if ( item.assignee ) {
            meta.assignee = item.assignee.login;
        }

        meta.comments = item.comments;
        construct.data = meta;

        // post the new construct to the db
        postToDb( constructsApi, construct, result, result.constructIds, callback, function ( newConstruct ) {
            // save the issues mongodb id for future use
            // the event ids of related issues will also be saved here
            result.issues[newConstruct.origin_id[0].source_id] = { id: newConstruct._id, eventIds: [], statechangeIds : [], commentIds: [], commentCount: item.comments };

            // add a event that represents the creation / opening of this issue
            // github doesn't save the initial opening as a event so this has to be created manually
            result.count += 1;
            var event = {};
            event.type = 'open';
            // use the issue's id in origin id
            event.origin_id = [ { source_id: String( item.number ), source: result.source, context: result.context  } ];
            event.time = item.created_at;
            event.creator = item.user.login;
            //event.state = 'open';
            event.isStatechange = true;
            event.statechange = {
                from : "",
                to : "open"
            };

            // post the event
            postToDb( eventsApi, event, result, result.statechangeIds, callback, function ( newEvent ) {
                // save the id of this new event so that it can be later associated with the construct
                 result.issues[newConstruct.origin_id[0].source_id].statechangeIds.push( newEvent._id );
            });
        });
    }

    // process a single issue event
    function processIssueEvent( item, result, callback ) {
        var event = {};
        event.origin_id = [ { source_id: String( item.id ), source: result.source, context: result.context  } ];
        event.time = item.created_at;

        // this can be null maybe cause the user account has been deleted
        if ( item.actor ) {
            event.creator =  item.actor.login;
        }

        else {
            event.creator = null;
        }

        event.type = item.event;

        if( item.event == 'open') {
            event.isStatechange = true;
            //event.state = item.event;
            event.statechange = {
                from : "",
                to : "open"
            };
        }
        else if(item.event == 'closed' ){
            event.isStatechange = true;
            //event.state = item.event;
            event.statechange = {
                from : "open",
                to : "closed"
            };
        }
        else if ( item.event === 'reopened' ) {
            event.isStatechange = true;
            event.statechange = {
                from : "closed",
                to: "open"
            };
            //event.state = 'open';
        }

        // general note: seems that events can point to issues that no longer exists i.e. have been deleted

        var meta = {};
        if ( item.commit_id ) {
            meta.commit_id = item.commit_id;
        }

        if ( item.milestone ) {
            meta.milestone = item.milestone.title;
        }

        if ( item.assignee ) {
            meta.assignee = item.assignee.login;
        }

        if ( item.label ) {
            meta.label = item.label.name;
        }

        if ( item.rename ) {
            meta.rename = item.rename;
        }

        event.data = meta;
        if(event.isStatechange === true){
            postToDb( apiUrl +'events/', event, result, result.statechangeIds, callback, function ( newEvent ) {
                // save the id of the new event so that it can be associated to the issue construct
                // seems that events can point to issues that no longer exists i.e. have been deleted
                if ( item.issue && result.issues[ item.issue.number ] ) {
                    result.issues[ item.issue.number ].statechangeIds.push( newEvent._id );
                }
            });
        }
        else{
            postToDb( apiUrl +'events/', event, result, result.eventIds, callback, function ( newEvent ) {
                // save the id of the new event so that it can be associated to the issue construct
                // seems that events can point to issues that no longer exists i.e. have been deleted
                if ( item.issue && result.issues[ item.issue.number ] ) {
                    result.issues[ item.issue.number ].eventIds.push( newEvent._id );
                }
            });
        }

    }

    // process a single issue comment
    function processComment( item, result, callback ) {
        var comment = {};

        comment.origin_id = [ { source_id: String( item.id ), source: result.source, context: result.context  } ];
        comment.type = 'comment';
        comment.time = item.created_at;
        comment.updated = item.updated_at;

        // this can be null maybe cause the user account has been deleted
        if ( item.user ) {
            comment.creator =  item.user.login;
        }
        else {
            comment.creator = null;
        }

        var meta = {};
        meta.message = item.body;
        comment.data = meta;

        postToDb( apiUrl + 'events/', comment, result, result.commentIds, callback, function ( newComment ) {
            // save the id of the new comment so that it can be associated to the issue construct later
            result.issues[result.issueKeys[result.issueIterator]].commentIds.push(newComment._id);
        });
    }

    //gets one issue's comments and stores them to the database. If all issues have been processed, links issues and comments and calls callback
    function getIssueComments(err, result) {
        if ( err ) {
            callback( err, result );
            return;
        }

        result.issueIterator++;

        if (result.issueIterator < Object.keys(result.issues).length ) {
            //issue has comments to fetch?
            if (result.issues[result.issueKeys[result.issueIterator]].commentCount > 0)
                getFromGitHub( github, github.issues.getComments, { user: config.user, repo: config.repo, number: result.issueKeys[result.issueIterator]  }, result, processComment, getIssueComments);
            else
                getIssueComments(null, result);
        }
        else {
            //all issue comments saved, move on to linking them

            // initialize variables for buffered linking of issue constructs and related comments
            result.commentIterator = 0;
            result.issueCommentLinks = [];

            // add the required comment-issue links to the total link count
            _.each( result.issues, function ( item ) {
               result.linkCount += item.commentIds.length;
               result.commentLinks += item.commentIds.length;

               if (item.commentIds.length > 0) {
                    _.each( item.commentIds, function ( commentId ) {
                        result.issueCommentLinks.push({issueID: item.id, commentID: commentId});
                    });
               }
            });

            if ( result.linkCount == result.linked + result.failedLinks ) {
                console.log('No need to link issues to comments, processing finished');
                // no need to do anything, we're done here.
                callback(null, result);
            }

            console.log('Linking issues to comments');
            //start the comment linking process
            linkIssuesToComments(result);
        }
    }

    //buffers the linking process so that the server gets 20 requests at a time until all are processed
    function linkIssuesToEvents(result) {
        var initialIterator = result.eventIterator;
        var initialLinks = result.linked+result.failedLinks;

        var resFunction = function( reqErr, response ){
            if ( reqErr || response.statusCode != 200 ) {
                // maybe should do something else
                result.failedLinks += 1;
                console.log('Failed to link: issue/event, initial links: ' + initialLinks);
            }
            else {
                result.linked += 1;
            }

            if ( result.linkCount == result.linked + result.failedLinks ) {
                console.log('Getting comments from GitHub');
                // all updates done. move on to processing comments
                getIssueComments(null, result);
            }
            else if (result.linked + result.failedLinks == initialLinks+20) {
                linkIssuesToEvents(result);
            }
        };

        while(result.eventIterator < initialIterator+20 && result.eventIterator < result.issueEventLinks.length) {
            var body = { id: result.issueEventLinks[result.eventIterator].eventID, type: 'event' };
            request.put( {
                url: apiUrl +'constructs/' + result.issueEventLinks[result.eventIterator].issueID +'/link',
                json: true,
                body: body
            }, resFunction);

            result.eventIterator++;
        }
    }

    //buffers the linking process so that the server gets 20 requests at a time until all are processed
    function linkIssuesToStatechanges(result) {
        var initialIterator = result.statechangeIterator;
        var initialLinks = result.linked+result.failedLinks;

        var resFunction = function( reqErr, response ){
            if ( reqErr || response.statusCode != 200 ) {
                // maybe should do something else
                result.failedLinks += 1;
                console.log('Failed to link: issue/statechange, initial links: ' + initialLinks);
            }
            else {
                result.linked += 1;
            }

            if ( result.statechangeLinkCount == result.linked + result.failedLinks ) {
                console.log('Linking events.');
                // all updates done. move on to linking events
                linkIssuesToEvents(result);
            }
            else if (result.linked + result.failedLinks == initialLinks+20) {
                linkIssuesToStatechanges(result);
            }
        };

        while(result.statechangeIterator < initialIterator+20 && result.statechangeIterator < result.issueStatechangeLinks.length) {
            var body = { id: result.issueStatechangeLinks[result.statechangeIterator].eventID, type: 'statechange' };
            request.put( {
                url: apiUrl +'constructs/' + result.issueStatechangeLinks[result.statechangeIterator].issueID +'/link',
                json: true,
                body: body
            }, resFunction);

            result.statechangeIterator++;
        }
    }

    //buffers the linking process so that the server gets 20 requests at a time until all are processed
    function linkIssuesToComments(result) {
        var initialIterator = result.commentIterator;
        var initialLinks = result.linked+result.failedLinks;

        var resFunction = function ( reqErr, response ) {
            if ( reqErr || response.statusCode != 200 ) {
                // maybe should do something else
                result.failedLinks += 1;
                console.log('Failed to link: issue/comment, initial links: ' + initialLinks);
            }
            else {
                result.linked += 1;
            }

            if ( result.linkCount == result.linked + result.failedLinks ) {
                console.log('Processing finished');
                // no need to do anything, we're done here.
                callback(null, result);
            }
            else if (result.linked + result.failedLinks == initialLinks+20) {
                linkIssuesToComments(result);
            }
        };

        while(result.commentIterator < initialIterator+20 && result.commentIterator < result.issueCommentLinks.length) {
            var body = { id: result.issueCommentLinks[result.commentIterator].commentID, type: 'event' };
            request.put( {
                url: apiUrl +'constructs/' + result.issueCommentLinks[result.commentIterator].issueID +'/link',
                json: true,
                body: body
            }, resFunction);

            result.commentIterator++;
        }
    }

    console.log('Getting issues from GitHub');
    // get issues from github and save them as constructs
    getFromGitHub( github, github.issues.repoIssues, { user: config.user, repo: config.repo, state: 'all'  }, result, processIssue, function ( err, result ) {
        if ( err ) {
            callback( err, result );
            return;
        }

        console.log('Getting issue events from GitHub');
        // now we have all issues. Next get all the events associated with this repo's issues
        getFromGitHub( github, github.issues.getRepoEvents, { user: config.user, repo: config.repo }, result, processIssueEvent, function ( err, result ) {
            if ( err ) {
                callback( err, result );
                return;
            }

            // now we have saved all issue events.

            //store issue numbers as a basic array for comment fetching later
            result.issueIterator = -1;
            result.issueKeys = Object.keys(result.issues);

            // initialize variables for buffered linking of issue constructs and related events
            result.eventIterator = 0;
            result.issueEventLinks = [];
            result.statechangeIterator = 0;
            result.issueStatechangeLinks = [];

            // how many links between issues and their events need to be created i.e. how many issue events do we have
            // there are at least as many issue events as there are issues since every issue has an opening event
            //also collect links to a bufferarray for processing
            _.each( result.issues, function ( item ) {
               result.statechangeLinkCount += item.statechangeIds.length;
               result.eventLinkCount += item.eventIds.length;

               if (item.eventIds.length > 0) {
                    _.each( item.eventIds, function ( eventId ) {
                        result.issueEventLinks.push({issueID: item.id, eventID: eventId});
                    });
               }
               if (item.statechangeIds.length > 0) {
                    _.each( item.statechangeIds, function ( eventId ) {
                        result.issueStatechangeLinks.push({issueID: item.id, eventID: eventId});
                    });
               }
            });
            result.linkCount += result.statechangeLinkCount;
            result.linkCount += result.eventLinkCount;

            if ( result.linkCount === 0 ) {
                console.log('No need to link issues to events, getting comments from GitHub');
                // no need to do anything, move on to processing comments
                getIssueComments(null, result);
            }

            console.log('Linking issues to statechanges');
            //start the linking process
            //linkIssuesToEvents(result);
            linkIssuesToStatechanges(result);
        });
    });
}

module.exports.parseCommits = parseCommits;
module.exports.parseIssues = parseIssues;
