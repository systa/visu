/*
 * Copyright (c) TUT Tampere University of Technology 2014-2015.
 * All rights reserved.
 * This software has been developed in Tekes-TIVIT project Need-for-Speed.
 * All rule set in consortium agreement of Need-for-Speed project apply.
 *
 * Main authors: Antti Luoto, Anna-Liisa Mattila, Henri Terho, Hugo Fooy
 */

var QUERY_UTILITIES = function () {

    var pub = {};

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

        for (var cf in constructs) {
            if (constructs.hasOwnProperty(cf)) {
                var ctmp = constructs[cf];
                if (ctmp !== false && ctmp !== undefined) {
                    constructFilters[cf] = ctmp;
                }
            }
        }

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