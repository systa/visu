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

// this file contains helper functions used in the API controllers

// helper function for dealing with filtering parameters in url's query string
// baseDbQuery the database query before filtering e.g. EventModel.find()
// queryParams: request's query parameters as an object with the parameters as attributes (express' req.query)
// returns a mongoDb query that can be executed
// example with query string ?foo db query that gives every item that has an attribute foo
// with query string ?foo=bar the db query returns those items whose foo attribute has the value bar
function getFilteringQuery( baseDbQuery, queryParams ) {
    // what query parameter keys do we have
    var queryKeys = Object.keys( queryParams );
    var dbQuery  = baseDbQuery; // this will be returned
    
    // if there are no query parameters just return the baseDbQuery
    // if there are query parameters add filtering to the db query
    if ( queryKeys.length > 0 ) {
        // use the first query parameter for filtering
        // get the key and value
        var key = queryKeys[0];
        var value = queryParams[key];
        
        // if there if no value e.g. we had query string ?foo the value is an empty string
        // to be sure check also for null and undefined
        if ( value !== null && value !== undefined && value !== '' ) {
            // there is a value. filter by key and value.
            // value is a string but it could also be a number
            // with boolean values this doesn't work but since value is a string it works
            value = isNaN( value ) ? value : Number( value );
            dbQuery = baseDbQuery.where( key, value );
        }
        
        else {
            // no value just the key
            dbQuery = baseDbQuery.where( key ).exists();
        }
    }
    
    return dbQuery;
}

module.exports.getFilteringQuery = getFilteringQuery;