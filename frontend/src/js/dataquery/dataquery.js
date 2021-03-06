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

var DATA_QUERY = function () {

    //Private functions and variables
    var _eventPath = "/api/events";
    var _constructPath = "/api/constructs";

    //Sends get request without filters to specified path
    //PARAMETERS:
    //path : Address where the request is sent to.
    //callback : Function that is called when the data is loaded. Gets the data as an argument. user specifies.
    var getAll = function (path, callback) {
        var _data = false;
        var loadAll = new Promise(function (resolve, reject) {
            $.get(path).then(function (data) {
                _data = data;
                resolve("getAll");
            }).catch(function (jqXHR, textStatus, errorThrown) {
                console.log(errorThrown);
                reject(errorThrown);
            });
        });

        loadAll.then(function (val) {
            callback(_data);
        });
    };

    //Sends get request with body containing filters
    //PARAMETERS:
    //path : Address where the request is sent to.
    //body : Object containing the filters.
    //callback : Function that is called when the data is loaded. Gets the data as an argument. user specifies.
    var getFiltered = function (path, body, callback) {
        var _data = false;
        var loadFiltered = new Promise(function (resolve, reject) {
            $.get(path, body).then(function (data) {
                _data = data;
                resolve("getFiltered");
            }).catch(function (jqXHR, textStatus, errorThrown) {
                console.log(errorThrown);
                reject(errorThrown);
            });
        });

        loadFiltered.then(function (val) {
            callback(_data);
        });
    };

    //PUBLIC INTERFACE
    var pub = {};

    //Function for querying all events from the backend
    //PARAMETERS:
    //callback : Function that is called when the data is loaded. Gets the data as an argument. user specifies.
    pub.getAllEvents = function (callback) {
        getAll(_eventPath, callback);
    };

    //Function that gets all events that have happened inside specified timeframe
    //PARAMETERS:
    //timeframe: An array containing the start poin and endpoint of the queried timeframe.
    //callback : Function that is called when the data is loaded. Gets the data as an argument. user specifies.
    pub.getEventLog = function (timeframe, callback) {
        var body = {
            startTime: timeframe[0],
            endTime: timeframe[timeframe.length - 1]
        };
        getFiltered(_eventPath, body, callback);
    };

    //Function that gets all events based on filtered fields
    //PARAMETERS:
    //filters: An object containing the filters
    //callback : Function that is called when the data is loaded. Gets the data as an argument. user specifies.
    pub.getFilteredEvents = function (filters, callback) {
        getFiltered(_eventPath, filters, callback);
    };

    //Function for querying all statechanges from the backend
    //PARAMETERS:
    //callback : Function that is called when the data is loaded. Gets the data as an argument. user specifies.
    pub.getAllStatechanges = function (callback) {
        var filter = {
            isStatechange: true
        };
        getFiltered(_eventPath, filter, callback);
    };

    //Function that gets all statechanges that have happened inside specified timeframe
    //PARAMETERS:
    //timeframe: An array containing the start poin and endpoint of the queried timeframe.
    //callback : Function that is called when the data is loaded. Gets the data as an argument. user specifies.
    pub.getStatechangeLog = function (timeframe, callback) {
        var body = {
            startTime: timeframe[0],
            endTime: timeframe[timeframe.length - 1],
            isStatechange: true
        };
        getFiltered(_eventPath, body, callback);
    };

    //Function that gets all statechanges based on filtered fields
    //PARAMETERS:
    //filters: An object containing the filters
    //callback : Function that is called when the data is loaded. Gets the data as an argument. user specifies.
    pub.getFilteredStatechanges = function (filters, callback) {
        var clone = {};
        for (var f in filters) {
            if (filters.hasOwnProperty(f)) {
                clone[f] = filters[f];
            }
        }
        clone.isStatechange = true;
        getFiltered(_eventPath, clone, callback);
    };

    //Functio for querying all constructs from the backend
    //PARAMETERS:
    //callback : function that is called when the data is loaded.
    pub.getAllConstructs = function (callback) {
        getAll(_constructPath, callback);
    };

    //Function that gets all events based on filtered fields
    //PARAMETERS:
    //filters: An object containing the filters
    //callback : Function that is called when the data is loaded. Gets the data as an argument. user specifies.
    pub.getFilteredConstructs = function (filters, callback) {
        getFiltered(_constructPath, filters, callback);
    };

    /*TODO:
        - Get related events
        - Get related statechanges
        - Get related events for list of constructs
        - Get related statechanges for list of constructs
    */

    return pub;
};