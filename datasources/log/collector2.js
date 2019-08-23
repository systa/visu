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

var debug = false;

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
    console.log( '[Collector]Fetching usage data from [' + result.source + '].\n');
   
    var file = result.source;
    
    getData( result.source, function ( result ) {
        // print debug information how many items of each type we got and what is the last item
        console.log( '[Collector]Usage data fetched from source.' );
        
        if (debug) {
           _.each( result, function ( value, key ) {
              console.log( value.length +' ' +key +' last of which is:');
               console.log( value[value.length -1] );
            });
        }
       
        // send the issue data to the db
        console.log( '[Collector]Sending data to database.\n' );
        poster( result, file);
    });
}
