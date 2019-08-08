/*
* Copyright (c) TUT Tampere University of Technology 2014-2015.
* All rights reserved.
* This software has been developed in Tekes-TIVIT project Need-for-Speed.
* All rule set in consortium agreement of Need-for-Speed project apply.
*
* Main authors: Otto Hylli
*/

// the main file
// takes care of asking for user input i.e. selecting the issue source and its required parameters

var fs = require( 'fs' );
var path = require( 'path' );
// prompt is a library for getting user input
var prompt = require( 'prompt' );
var request = require( 'request' );
require('request').debug = false;

var _ = require( 'underscore' );

// the module that actually gets the data
var getData = require( './getdata.js' );
// module that sends the data to db
var poster = require( './poster.js' );

// first ask what issue source the user wants to use
// find the sources that are available
// issue source descriptions are in the apis folder in .js files
var files = fs.readdirSync( './apis' );
var apiFiles = files.filter( function ( file ) {
    return path.extname( file ) === '.js';
});

// the text shown to the user
var text = 'Collect issues from?\n' ;
apiFiles.forEach( function ( file, index  ) {
    // the file name without the extension is the source name
    // user inputs a number to indicate their choice
    text += index +1 +' ' +path.basename( file, path.extname( file ) ) +'\n';
});

// start the prompt
prompt.start();
// by default prompt prints prompt before the question
// we don't want that
prompt.message = '';

// define for prompt what to ask
var properties = [ {
    // the attribute we are prompting
    name: 'source',
    // this is shown to the user
    // if not given the name is shown
    description: text,
    // if the user gives an invalid input this is printed
    message: 'give a number that corresponds to a choice',
    // what type the input should be
    type: 'number'  
    // todo: check that the input number is actuallu one of the choices given
    // conform function 
} ];

// the api i.e. source description used in getting the data
var api = null;
// request defaults used to make HTTP requests to the source api
var baseRequest = request;
// the authentication method used with the HTTP requests
var auth = null;
// The parameters asked from the user used in the HTTP requests
var userParams = null;

// get the source from the user
prompt.get( properties, sourceSelected );

// callback when the source is selected
// result contains the user input i.e. the selected source
function sourceSelected( err, result ) {
    if ( err ) {
        console.log( err );
        process.exit();
    }

    // require the api chosen
    api = require( './apis/' +apiFiles[ result.source -1 ] );

    // apis can suppport multiple authetication methods
    // ask the user what method to use
    var question = 'Choose authentication method\n';
    api.authentication.forEach( function ( choice, index ) {
        if ( typeof choice !== 'string' ) {
            // choice can be an object containing additional information if the auth method is a custom one
            choice = choice.name;
        }

        question += index +1 +' ' +choice +'\n';
    });

    console.log( question );
    properties = [ {
        name: 'auth',
        description: ' ',
        type: 'number',
        message: 'give a number that corresponds to a choice.' 
    } ];

    prompt.get( properties, authSelected );
}

// callback when the authentication method has been chosen
function authSelected( err, result ) {
    if ( err ) {
        console.log( err );
        process.exit();
    }

    auth = api.authentication[ result.auth -1 ];
    if ( auth === 'basic' ) {
        // use http basic that requires a username and a password from the user
        console.log( 'Information for authentication.' );
        properties = [ {
            name: 'username', },
            { name: 'password',
            // don't show the input when user types the password
            hidden: true } ];
            
        return prompt.get( properties, authenticated );
    }

    else if ( auth === 'oauth2' ) {
        console.log( auth +' not yet supported' );
        process.exit();
    }

    else if ( auth !== 'no authentication' ) {
        // a custom authentication method that requires some input defined in the api description 
        // add the auth methods user parameters to the apis normal parameters
        api.userParams = api.userParams.concat( auth.userParams );
        // add the headers required by the auth method to the apis normal headers
        if ( !api.headers ) {
            // by default the api might not have any headers
            api.headers = {};
        }

        _.extend( api.headers, auth.headers );
        // todo: should do the same for query parameters
    }

    // if no authentication or custom authentication go directly to next step
    authenticated( null, null );
}

function authenticated ( err, result ) {
    if ( err ) {
        console.log( err );
        process.exit();
    }

    // if basic authentication add the authentication information to the request
    if ( auth === 'basic' ) {
        baseRequest = baseRequest.defaults( { 
            auth: {
                username: result.username,
                password: result.password
            }
        });
    }

    // get the parameters that the api requires from the user
    prompt.get( api.userParams, gotUserParams );
}

// callback after we have the user parameters
function gotUserParams( err, result ) {
    if ( err ) {
        console.log( err );
        process.exit();
    }

    userParams = result;

    // get the information used in the origin_id: (source, context) from the user
    var origin = [ 
        { name: 'source' },
        { name: 'context' } 
    ];

    console.log( 'Information for origin_id.' );
    prompt.get( origin, gotOrigin );
}

// callback for the origin_id input
function gotOrigin( err, origin ) {
    if ( err ) {
        console.log( err );
        process.exit();
    }
   
    // if a header in the api description has an undefined value check if the userParams contains a value for it
    var headers = {};
    _.each( api.headers, function ( value, key ) {
        if ( value === undefined ) {
            headers[key] = userParams[key];
        }

        else {
            headers[key] = value;
        }
    });
   
    console.log('[Collector]headers:', headers);

   // todo: do the same for query parameters
   
   // set default values for the request to be used in the api calls
   baseRequest = baseRequest.defaults ( {
        baseUrl: api.baseUrl,
        headers: headers,
        json: true
    });
    

    // get the issue data
    //console.log( '[Collector]Fetching issue management data...' );
    //console.log( '[Collector]baseRequest:', baseRequest);
    //console.log( '[Collector]api:',  api);
    console.log( '[Collector]userParams:', userParams);

    getData( baseRequest, api, userParams, function ( result ) {
        // print debug information how many items of each type we got and what is the last item
        console.log( '[Collector]Issue management data fetched from source.' );
        _.each( result, function ( value, key ) {
            console.log("[Collector]" + value.length +' ' +key +' last of which is:');
            console.log("[Collector]", value[value.length -1] );
        });

        // send the issue data to the db
        console.log( '[Collector]Sending data to database.' );
        poster( result, origin );
    });
};
