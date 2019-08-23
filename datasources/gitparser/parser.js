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

// this file offers a command line interface for the github parser
// it uses the appropriate linker or parser method based on the user input

var gitHubParser = require('./githubparser.js');
var gitHubLinker = require( './githublinker.js' );

// get commandline arguments: command, username, repository name (required) and OAuth token (optional)
var command = process.argv[2];
var user = process.argv[3];
var repo = process.argv[4];
var token = process.argv[5];

if ( !command || !user || !repo ) {
    console.log( "Give a command, the owner's username and the name of a Github repository as command line arguments." );
    return;
}

var config = { user: user, repo: repo, token: token };
if ( command == 'commits' ) {
    gitHubParser.parseCommits( config, function( err, result ) {
        if ( err ) {
            console.log( "An error occurred with message:" );
            console.log( err.message );
        }

        console.log( result.count +" commits fetched. Added " +result.addedCount +" to database. Failed to add " +result.failedCount +"." );
        console.log('A total of '+ result.commitChanges +' commits were updated successfully while '+ result.failedCommitChanges +' failed.');
    });
}

else if ( command == 'issues' ) {
    gitHubParser.parseIssues( config, function ( err, result ) {
        if ( err ) {
            console.log( "An error occurred:" );
            console.log( err.message );
        }

        console.log( result.count +" items to be created. " +result.addedCount +" added. Failed to add " +result.failedCount +"." );
        console.log( result.linkCount +" items to be linked of which " + result.commentLinks + " are comments. Linked " +result.linked +". Failed to link " +result.failedLinks +"." );
        console.log( result.statechangeIds.length +" statechanges created." );
        console.log( result.eventIds.length +" events created." );
        console.log( result.commentIds.length +" comments created." );
        console.log( result.constructIds.length +" constructs created." );
    });
}

else if ( command == 'link' ) {
    console.log( 'started ', Date() );
    gitHubLinker.link( config, function ( err, result ) {
         if ( err ) {
             console.log( "an error occurred: " );
             console.log( err.message );
         }

         console.log( 'Finished ', Date() );
         console.log( result.constructIds.length +" constructs created." );
         console.log( result.statechangeIds.length +" statechanges created." );
         console.log( result.eventIds.length +" events created." );
         console.log( result.commentIds.length +" comments created." );
    });
}

else {
    console.log( "Unrecognized command. Accepted commands are commits, issues or link." );
}
