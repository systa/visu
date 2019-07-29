/*
 * Copyright (c) TUT Tampere University of Technology 2014-2015.
 * All rights reserved.
 * This software has been developed in Tekes-TIVIT project Need-for-Speed.
 * All rule set in consortium agreement of Need-for-Speed project apply.
 *
 * Main authors: Antti Luoto, Anna-Liisa Mattila, Henri Terho
 */

var debug = true;

//Data processor for amount timeline chart
//Filters can be used to query data based on e.g. origin or time frame. NOT YET IMPLEMENTED!
//mapping is to determine which field of construct is used as a Y axis index values
//if anonymize flag is set to true the Y axis index values are anonymized using the base string provided
//in astring parameter and order number. If no base string is provided only order numbers are used to anonymize the ids.
var AMOUNT_CHART_PROCESSOR = function (par) {

    var p = par || {};
    var _states = p.states !== undefined ? p.states : {};

    if (!_states) {
        _states = {};
    }
    if (!_states.start) {
        _states.start = [];
    }
    if (!_states.resolution) {
        _states.resolution = [];
    }

    //Sorts event based on time
    // if the timestamps are the same start events are allways smaller than other events
    // and close events are allways larger than other events
    // if both events have the same timestamp and are both start or close events or neither of them
    // the ordering is done based on rowid (alphabetically)
    var eventSortFunction = function (e1, e2) {
        var t1 = new Date(e1.time).getTime();
        var t2 = new Date(e2.time).getTime();
        return t1 - t2;
    };

    var labelSort = function (l1, l2) {
        if(l1 === 'Unlabelled'){
            return -1;
        }else if (l2 === 'Unlabelled'){
            return 1;
        }

        return l1.localeCompare(l2);
    };

    var assignSort = function (l1, l2) {
        if(l1 === 'Unassigned'){
            return -1;
        }else if (l2 === 'Unassigned'){
            return 1;
        }

        return l1.localeCompare(l2);
    };

    var cloneEvent = function (ev) {
        var tmp = {};
        for (var property in ev) {
            if (ev.hasOwnProperty(property)) {
                tmp[property] = ev[property];
            }
        }
        return tmp;
    };


    var getCreated = function (startEvents, startDate) {
        var data = [];

        var count = 0;
        var date = {};
        date.y = startDate.getUTCFullYear();
        date.m = startDate.getMonth();
        date.d = startDate.getDate();


        startEvents.forEach(function (ev) {
            ev.time = new Date(ev.time);
            var y = ev.time.getUTCFullYear();
            var m = ev.time.getMonth();
            var d = ev.time.getDate();

            var obj = {};
            if (date.y === y && date.m === m && date.d === d) {
                ++count;
            } else {
                obj = {
                    date: new Date(date.y, date.m, date.d),
                    opened: count
                };
                data.push(obj);

                date.y = ev.time.getUTCFullYear();
                date.m = ev.time.getMonth();
                date.d = ev.time.getDate();

                count = 1;
            }
            if (ev == startEvents[startEvents.length - 1]) {
                obj = {
                    date: new Date(date.y, date.m, date.d),
                    opened: count
                };
                data.push(obj);
            }
        });
        return data;
    };

    var getClosed = function (endEvents, startDate) {
        var data = [];

        var count = 0;
        var date = {};
        date.y = startDate.getUTCFullYear();
        date.m = startDate.getMonth();
        date.d = startDate.getDate();

        endEvents.forEach(function (ev) {
            ev.time = new Date(ev.time);
            var y = ev.time.getUTCFullYear();
            var m = ev.time.getMonth();
            var d = ev.time.getDate();

            var obj = {};
            if (date.y === y && date.m === m && date.d === d) {
                ++count;
            } else {
                obj = {
                    date: new Date(date.y, date.m, date.d),
                    closed: count
                };
                data.push(obj);

                date.y = ev.time.getUTCFullYear();
                date.m = ev.time.getMonth();
                date.d = ev.time.getDate();

                count = 1;
            }
            if (ev == endEvents[endEvents.length - 1]) {
                obj = {
                    date: new Date(date.y, date.m, date.d),
                    closed: count
                };
                data.push(obj);
            }
        });
        return data;
    };


    var getAmount = function (timeframe, startEvents, endEvents, tag, previous) {

        var start = new Date(timeframe[0].getUTCFullYear(), timeframe[0].getMonth(), timeframe[0].getDate());
        var end = new Date(timeframe[1].getUTCFullYear(), timeframe[1].getMonth(), timeframe[1].getDate());

        var opened = getCreated(startEvents, start);
        var closed = getClosed(endEvents, start);

        var date = start;

        var data = [];
        var amount = 0;
        var maxAmount = 0;
        var minAmount = 0;
        var i = 0;
        var k = 0;
        var x = 0;
        while (date <= end) {
            if (i < opened.length && opened[i].date.getTime() == date.getTime()) {
                amount += opened[i].opened;
                ++i;
            }
            if (k < closed.length && closed[k].date.getTime() == date.getTime()) {
                amount -= closed[k].closed;
                ++k;
            }

            if (amount > maxAmount) {
                maxAmount = amount;
            }

            if (amount < minAmount) {
                minAmount = amount;
            }

            var prev = 0;
            if (previous !== false) {
                prev = previous[x].count + previous[x].previous;
            }

            var obj = {
                date: new Date(date),
                count: amount,
                tag: tag,
                previous: prev
            };
            data.push(obj);
            x++;
            date.setDate(date.getDate() + 1);
        }
        console.log(x, i, k);
        return {
            data: data,
            max: maxAmount,
            min: minAmount
        };
    };

    var getAssigned = function (events, assignee) {
        var parsed = [];
        events.forEach(function (e) {
            if (e.assignee === assignee)
                parsed.push(e);
        });

        return parsed;
    }

    var getLabeled = function (events, label) {
        var parsed = [];
        events.forEach(function (e) {
            if (e.label === label)
                parsed.push(e);
        });

        return parsed;
    }

    var getAmountAssigned = function (timeframe, startEvents, endEvents, assignees) {

        var amounts = [];
        var max = false;
        var min = false;
        var previous = false;
        assignees.forEach(function (assignee) {
            var startAssigned = getAssigned(startEvents, assignee);
            var endAssigned = getAssigned(endEvents, assignee);

            var result = getAmount(timeframe, startAssigned, endAssigned, assignee, previous)
            amounts.push({
                assignee: assignee,
                min: result.min,
                max: result.max,
                data: result.data
            });
            if (max === false || result.max > max) {
                max = result.max;
            }

            if (min === false || result.min < min) {
                min = result.min;
            }

            previous = result.data;
        });

        return {
            amounts: amounts,
            max: max,
            min: min
        };
    };

    var getAmountLabeled = function (timeframe, startEvents, endEvents, labels) {

        var amounts = [];
        var max = false;
        var min = false;
        var previous = false;
        labels.forEach(function (label) {
            var startLabeled = getLabeled(startEvents, label);
            var endLabeled = getLabeled(endEvents, label);

            var result = getAmount(timeframe, startLabeled, endLabeled, label, previous)
            amounts.push({
                label: label,
                min: result.min,
                max: result.max,
                data: result.data
            });
            if (max === false || result.max > max) {
                max = result.max;
            }

            if (min === false || result.min < min) {
                min = result.min;
            }

            previous = result.data;
        });

        return {
            amounts: amounts,
            max: max,
            min: min
        };
    };

    var getAmountNotag = function(timeframe, startEvents, endEvents){
        
        var start = new Date(timeframe[0].getUTCFullYear(), timeframe[0].getMonth(), timeframe[0].getDate());
        var end = new Date(timeframe[1].getUTCFullYear(), timeframe[1].getMonth(), timeframe[1].getDate());
        
        var opened = getCreated(startEvents, start);
        var closed = getClosed(endEvents, start);

        var date = start;

        var data = [];
        var amount = 0;
        var maxAmount = 0;
        var minAmount = 0;
        var i = 0;
        var k = 0;
        while(date <= end){
            if(i < opened.length && opened[i].date.getTime() == date.getTime()){
                amount += opened[i].opened;
                ++i;
            }
            if(k < closed.length && closed[k].date.getTime() == date.getTime()){
                amount -= closed[k].closed;
                ++k;
            }

            if(amount > maxAmount){
                maxAmount = amount;
            }
            
            if(amount < minAmount){
                minAmount = amount;
            }

            var obj = {date : new Date(date), count : amount};
            data.push(obj);

            date.setDate(date.getDate() +1);
        }

        var amounts = [];
        amounts.push({
            data: data,
            max: maxAmount,
            min: minAmount
        });

        return {amounts: amounts, max: maxAmount, min: minAmount};
    };

    //Parses the link to related constructs into events and forms the id list ordered sorted by the event time stamp so that
    //the topmost drawn row in the visualization is the row where the first event happened and so on. This is the default ordering of rows for the visualization.
    //Construct map is a helper data structure which contains all constructs in a object where the key is the construct _id (MongoDB). The helper has been formed in
    //parseConstructs function --> parseConstructs NEEDS TO BE CALLED BEFORE THIS FUNCTION (PRECONDITION)!
    var parseEvents = function (events, constructMap) {

        events.sort(eventSortFunction);

        var startEvents = [];
        var endEvents = [];
        var interEvents = [];

        var start = false;
        var end = false;

        var identity_helper = [];

        //To ensure that one construct has only one start and only one end event
        var start_helper = [];
        var end_helper = [];

        if (debug) {
            console.log("[amout_chart_processor]Helper:", constructMap);
        }

        events.forEach(function (ev) {
            //Ignoring duplicates
            if (identity_helper.indexOf(ev._id) === -1) {
                if (debug) {
                    //console.log("[amout_chart_processor]event:", ev);
                }

                identity_helper.push(ev._id);

                var time = new Date(ev.time).getTime();

                //detecting the timeframe
                if (time < start || start === false) {
                    start = time;
                }
                if (time > end || end === false) {
                    end = time;
                }

                for (var i = 0; i < ev.related_constructs.length; ++i) {
                    if (ev.related_constructs[i] === null || ev.related_constructs[i] === undefined) {
                        continue;
                    }

                    if (ev.isStatechange) {
                        if (ev.state === "" || ev.state === null || ev.state === undefined || ev.state === false)
                            //ev.state = ev.statechange.from;
                            ev.state = ev.type;
                    }

                    //storing states for calculating lifespans
                    if (ev.state !== "" && ev.state !== null && ev.state !== undefined && ev.state !== false) {

                        var trimmedState = ev.state.replace(/\s/g, '');
                        var tmp = {};

                        if (_states.start.indexOf(trimmedState) !== -1) { //If it's a starting state
                            if (start_helper.indexOf(ev.related_constructs[i]) === -1) {
                                tmp = cloneEvent(ev);
                                tmp.rowId = ev.related_constructs[i].toString();

                                var x = constructMap[ev.related_constructs[i].toString()];
                                if (x === undefined || x === null)
                                    return;

                                tmp.label = constructMap[ev.related_constructs[i].toString()].data.label;
                                tmp.assignee = constructMap[ev.related_constructs[i].toString()].data.assignee;

                                startEvents.push(tmp);
                                start_helper.push(ev.related_constructs[i]);
                            }

                        } else if (_states.resolution.indexOf(trimmedState) !== -1) { //If it's a resolution state
                            if (end_helper.indexOf(ev.related_constructs[i]) === -1) {
                                tmp = cloneEvent(ev);
                                tmp.rowId = ev.related_constructs[i].toString();

                                var x = constructMap[ev.related_constructs[i].toString()];
                                if (x === undefined || x === null)
                                    return;

                                tmp.label = constructMap[ev.related_constructs[i].toString()].data.label;
                                tmp.assignee = constructMap[ev.related_constructs[i].toString()].data.assignee;

                                endEvents.push(tmp);
                                end_helper.push(ev.related_constructs[i]);
                            }
                        } else if (_states.intermediate.indexOf(trimmedState) !== -1) { //If it's an intermediate state
                            if (inter_helper.indexOf(ev.related_constructs[i]) === -1) {
                                tmp = cloneEvent(ev);
                                tmp.rowId = ev.related_constructs[i].toString();

                                var x = constructMap[ev.related_constructs[i].toString()];
                                if (x === undefined || x === null)
                                    return;

                                tmp.label = constructMap[ev.related_constructs[i].toString()].data.label;
                                tmp.assignee = constructMap[ev.related_constructs[i].toString()].data.assignee;

                                interEvents.push(tmp);
                                inter_helper.push(ev.related_constructs[i]);

                                if (debug) {
                                    console.log("[amout_chart_processor]Other event:", ev);
                                }
                            }
                        }
                    }
                }
            }

        });

        //to get the ids sorted by the event time, we need to go through the sorted event array!
        //this needs to be done in order thus for loop instead of forEach function is used.
        //For each does not preserve order!
        startEvents.sort(eventSortFunction);
        endEvents.sort(eventSortFunction);

        return {
            startEvents: startEvents,
            endEvents: endEvents,
            timeframe: [new Date(start), new Date(end)]
        };
    };

    var parseConstructs = function (constructs, tag) {
        var cList = [];
        var constructHelpper = {};
        var labels = [];
        var assignees = [];

        constructs.forEach(function (construct) {
            var c = construct;

            if (c.type !== "issue"){
                return;
            }

            if (c.data.label) {
                //console.log("[amout_chart_processor]Label found:", c.data.label);
            } else {
                c.data.label = 'Unlabelled';
            }

            if (labels.indexOf(c.data.label) === -1) {
                labels.push(c.data.label);
            }

            if (c.data.assignee) {
                //console.log("[amout_chart_processor]Label found:", c.data.label);
            } else {
                c.data.assignee = 'Unassigned';
            }

            if (assignees.indexOf(c.data.assignee) === -1) {
                assignees.push(c.data.assignee);
            }

            constructHelpper[c._id.toString()] = c;
            cList.push(c);
        });

        labels.sort(labelSort);
        assignees.sort(assignSort);

        return {
            constructs: cList,
            helper: constructHelpper,
            labels: labels,
            assignees: assignees
        };
    };

    var parseData = function (events, constructs, states, tag) {
        if (debug) {
            console.log("[amout_chart_processor]Data for processor:", events, constructs, states);
        }

        //object for the processed data
        var data = {};

        var constructData = parseConstructs(constructs, tag);
        if (debug) {
            console.log("[amout_chart_processor]Parsed constructs:", constructData);
        }
        //from constructs we parse ids and constructs that are used
        //it also adds property rowID to constructs in _constructs list!

        var eventData = parseEvents(events, constructData.helper);
        if (debug) {
            console.log("[amout_chart_processor]Parsed events:", eventData);
        }

        data.timeframe = [new Date(eventData.timeframe[0].getFullYear(), eventData.timeframe[0].getMonth(), eventData.timeframe[0].getDate()),
            new Date(eventData.timeframe[1].getFullYear(), eventData.timeframe[1].getMonth(), eventData.timeframe[1].getDate() + 1)
        ];
        if (debug) {
            console.log("[amout_chart_processor]Parsed timeframe:", data.timeframe);
        }

        var result;
        if (tag === "assigned") {
            result = getAmountAssigned(eventData.timeframe, eventData.startEvents, eventData.endEvents, constructData.assignees);
        } else if (tag === "label") {
            result = getAmountLabeled(eventData.timeframe, eventData.startEvents, eventData.endEvents, constructData.labels);
        } 
        
        var notag = getAmountNotag(eventData.timeframe, eventData.startEvents, eventData.endEvents);
        if (debug) {
            console.log("[amout_chart_processor]Amounts", result);
        }

        data.amounts = result.amounts;
        data.max = notag.max;
        data.min = notag.min;

        if (tag === "assigned") {
            data.tags = constructData.assignees;
        } else if (tag === "label") {
            data.tags = constructData.labels;
        } else {
            data.tags = false;
        }


        //giving the data to who needs it
        return data;
    };

    return parseData;
};