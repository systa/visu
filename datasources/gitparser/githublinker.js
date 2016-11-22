/*
* Copyright (c) TUT Tampere University of Technology 2014-2015.
* All rights reserved.
* This software has been developed in Tekes-TIVIT project Need-for-Speed.
* All rule set in consortium agreement of Need-for-Speed project apply.
*
* Main authors: Otto Hylli
*/

var request = require( 'request' );
var _ = require( 'underscore' );
var gitHubParser = require( './githubparser' );

var config = require('./config.json');
var serverUrl = config.serverUrl;
var port = config.port;
var server = serverUrl + ':' + port;
var apiUrl = server + '/API/';
var eventsApi = apiUrl +'events/';
var constructsApi = apiUrl +'constructs/';

// get those issue events that are associated with a commit
// source is the source in origin_id
function getCommitIssueEvents( source, callback ) {
     // these events have a commit_id attribute in their metadata
    request.get( {
       url: eventsApi +'origin/' +encodeURIComponent( source ) +'?metadata.commit_id',
       json: true
    }, function ( err, response, body ) {
        if ( err ) {
            callback( err );
        }
        
        if ( response.statusCode != 200 ) {
            callback( new Error( 'get commit issue events HTTP status code ' +String( response.statusCode ) ) );
        }
        
        callback( null, body );
    });
}

// get commits and issues from github and link them
// config has the user, repo and possibly token for authentication
function link( config, callback ) {
    var linkResult = {}; // results of the operation
    // get commits and parse as events
    gitHubParser.parseCommits( config, function( err, commitResult ) {
        if ( err ) {
            callback( err, linkResult );
            return;
        }
        
        console.log( 'Commits fetched. Fetching issues ', Date() );
        // get issues and parse as constructs and related events
        gitHubParser.parseIssues( config, function ( err, issueResult ) {
            if ( err ) {
                callback( err, linkResult );
            }
            
            console.log( 'Fetched issues, issue events and comments. Next linking issues and related commits ', Date() );
            // add the ids of the created items to linkresult
            linkResult.constructIds = commitResult.constructIds.concat( issueResult.constructIds );
            linkResult.eventIds = commitResult.eventIds.concat( issueResult.eventIds );
            linkResult.commentIds = issueResult.commentIds;
            
            // the source for origin_id for all the created items
            var source = 'https://www.github.com/' +config.user +'/' +config.repo;
            
            // link commmits and related issues
            // first get events related to issues that reference a commit
            getCommitIssueEvents( source, function ( err, issueEvents ) {
                if ( err ) {
                    callback( err, linkResult );
                }
                
                linkResult.commitIssueEvents = issueEvents;
                
                var count = 0; // how many links were created
                var skipped = 0; // how many links could not be created
                
                // get the issue related to the event
                function getRelatedIssue( event ) {
                    request.get( {
                        url: constructsApi +event.related_constructs[0],
                        json: true
                    }, function ( err, response, issue ) {
                        if ( err || response.statusCode != 200 ) {
                            skipped++;
                            // was this the last processed linking operation
                            return isReady();
                        }
                        
                        // get the actual commit (event) that the issue event refers to 
                        getCommit( issue, event );
                    });
                }
                
                // gets the commit that the issue event refers to
                function getCommit( issue, event ) {
                    request.get( {
                       url: eventsApi +'origin/' +encodeURIComponent( source ) +'/' +event.metadata.commit_id,
                       json: true
                    }, function ( err, response, commits ) {
                        if ( err || response.statusCode != 200 ) {
                            skipped++;
                            // was this the last processed linking operation
                            return isReady();
                        }
                        
                        // link the issue and commit directly
                        linkIssueAndCommit( commits[0], issue );
                    });
                }
                
                // create a link between the given issue (construct) and commit (event)
                function linkIssueAndCommit( commit, issue ) {
                    request.put( {
                        url: constructsApi +issue._id +'/link',
                        json: true,
                        body: { id: commit._id, type: 'event' }
                    }, function ( err, response, body ) {
                        if ( err || response.statusCode != 200 ) {
                            skipped++;
                        }
                        
                        else {
                            count++;
                        }
                        
                        // was this the last processed linking operation
                        isReady();
                    });
                }
                
                // check if we have linked everything if yes call the callback
                function isReady() {
                    if ( skipped +count == issueEvents.length ) {
                        callback( null, linkResult );
                    }
                }
                
                // link the issue related to the issue event to the referenced commit
                _.each( issueEvents, function( issueEvent ) {
                    if ( issueEvent.related_constructs &&  issueEvent.related_constructs[0] ) {
                        getRelatedIssue( issueEvent );
                    }
                    
                    else {
                        skipped++;
                        isReady();
                    }
                });
            });
        });
    });
}

module.exports.link = link;