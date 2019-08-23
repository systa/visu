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

var QUERY_UTILITIES = function () {

    //PUBLIC INTERFACE
    var pub = {};

    /*PARAMETERS: filters for events and constructs
    startTime   : starting time (constructs)
    endTime     : ending time (constructs)
    context     : context from the origin_id attribute 
    source      : source from the origin_id attribute
    source_id   : source_id from the origin_id attribute
    metadata    : metadata formatted as an array of pairs containing the attribute name and the value searched
    constructs  : other construct properties
    events      : other event properties
    */
    pub.formatFilters = function (par) {
        var p = par || {};

        //timeframe
        var startTime = p.startTime !== undefined ? p.startTime : false;
        var endTime = p.endTime !== undefined ? p.endTime : false;
        //origin id attributes
        var context = p.context !== undefined ? p.context : false;
        var source = p.source !== undefined ? p.source : false;
        var source_id = p.source_id !== undefined ? p.source_id : false;
        //metadata attributes
        //should be formatted as a array of pairs containing the attribute name and the value searched
        var metadata = p.metadata !== undefined ? p.metadata : false;
        //other attributes
        var constructs = p.constructs !== undefined ? p.constructs : {};
        var events = p.events !== undefined ? p.events : {};

        var constructFilters = {};
        var eventFilters = {};

        //Parsing the timeframe for constructs
        if (startTime !== false) {
            constructFilters.startTime = startTime;
        }
        if (endTime !== false) {
            constructFilters.endTime = endTime;
        } else if (startTime !== false && endTime === false) {
            constructFilters.endTime = new Date();
        }

        //parsing the origin id filters
        var origin = "origin_id.";
        if (context !== false) {
            constructFilters[origin + "context"] = context;
            eventFilters[origin + "context"] = context;
        }
        if (source !== false) {
            constructFilters[origin + "source"] = source;
            eventFilters[origin + "source"] = source;
        }
        if (source_id !== false) {
            constructFilters[origin + "source_id"] = source_id;
            eventFilters[origin + "source_id"] = source_id;
        }

        //parsing the metadata filters
        var metadataString = "data.";
        if (metadata !== false) {
            metada.forEach(function (pair) {
                constructFilters[metadataString + pair.name.toString()] = pair.val;
                eventFilters[metadataString + pair.name.toString()] = pair.val;
            });
        }

        //parsing the construct properties filters
        for (var cf in constructs) {
            if (constructs.hasOwnProperty(cf)) {
                var ctmp = constructs[cf];
                if (ctmp !== false && ctmp !== undefined) {
                    constructFilters[cf] = ctmp;
                }
            }
        }

        //parsing the construct properties filters
        for (var ef in events) {
            if (events.hasOwnProperty(ef)) {
                var etmp = events[ef];
                if (etmp !== false && etmp !== undefined) {
                    eventFilters[ef] = etmp;
                }
            }
        }
        return {
            constructFilters: constructFilters,
            eventFilters: eventFilters
        };
    };

    return pub;
};