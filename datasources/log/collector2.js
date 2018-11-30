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
var _ = require( 'underscore' );

// the module that actually gets the data
var getData = require( './getdata2.js' );
// module that sends the data to db
var poster = require( './poster2' );

// the text shown to the user
var text = 'Collect logs from?\n' ;

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
    message: 'give a filename that corresponds to a logfile',
    // what type the input should be
    type: 'string'  
    // todo: check that the input number is actuallu one of the choices given
    // conform function 
} ];

// get the source from the user
prompt.get( properties, sourceSelected );

// callback when the source is selected
// result contains the user input i.e. the selected source
function sourceSelected( err, result ) {
    if ( err ) {
        console.log( err );
        process.exit();
    }
     
    // get the usage data
    console.log( '[Collector]Fetching usage data from [' + result.source + '].');
    
    getData( result.source, function ( result ) {
        // print debug information how many items of each type we got and what is the last item
        console.log( '[Collector]Usage data fetched from source.' );
        
        _.each( result, function ( value, key ) {
            console.log( value.length +' ' +key +' last of which is:');
            console.log( value[value.length -1] );
        });

        // send the issue data to the db
        console.log( '[Collector]Sending data to database.\n\n' );
        poster( result );
    });
}
