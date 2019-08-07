/*
 * Copyright (c) TUT Tampere University of Technology 2014-2015.
 * All rights reserved.
 * This software has been developed in Tekes-TIVIT project Need-for-Speed.
 * All rule set in consortium agreement of Need-for-Speed project apply.
 *
 * Main authors: Antti Luoto, Anna-Liisa Mattila, Henri Terho
 */

//Data processor for amount timeline chart
//Filters can be used to query data based on e.g. origin or time frame. NOT YET IMPLEMENTED!
//mapping is to determine which field of construct is used as a Y axis index values
//if anonymize flag is set to true the Y axis index values are anonymized using the base string provided
//in astring parameter and order number. If no base string is provided only order numbers are used to anonymize the ids.
var STATES_CHART_PROCESSOR = function (par) {

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

    var _rowId = p.rowId !== undefined ? p.rowId : "_id";
    var _fromOrigin = p.rowIdIsFromOrigin !== undefined ? p.rowIdIsFromOrigin : false;
    var _anonymize = p.anonymize !== undefined ? p.anonymize : true;
    //var _anonymize = p.anonymize !== undefined ? p.anonymize : false;
    var _astring = p.astring !== undefined ? p.astring : "";
    _rowId = _rowId.split(".");

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

    var getAmounts = function (timeframe, lifespans, states) {
        var start = new Date(timeframe[0].getUTCFullYear(), timeframe[0].getMonth(), timeframe[0].getDate());
        var end = new Date(timeframe[1].getUTCFullYear(), timeframe[1].getMonth(), timeframe[1].getDate());

        var amounts = [];
        var maxAmount = 0;
        var minAmount = 0;

        //Prepare the amounts data structure
        states.forEach(function (st) { //Create the metadata for each state
            var obj = {
                data: [],
                state: st,
                max: 0,
                min: 0
            };

            amounts.push(obj);
        });

        var date = start; //Each day
        while (date <= end) {
            var dayCount = [];
            lifespans.forEach(function (ls) { //Go through all lifespans

                var s;
                switch (ls.state) {
                    case 'open':
                        s = 0;
                        break;
                    case 'Ready to start':
                        s = 1;
                        break;
                    case 'Doing next':
                        s = 2;
                        break;
                    case 'Doing':
                        s = 3;
                        break;
                    case 'In review':
                        s = 4;
                        break;
                }

                //Keep only lifespans that exist at this day
                var _start = new Date(ls.start);
                var startDay = new Date(_start.getUTCFullYear(), _start.getMonth(), _start.getDate());

                var _end = ls.end === false ? false : new Date(ls.end);
                var endDay = _end === false ? false : new Date(_end.getUTCFullYear(), _end.getMonth(), _end.getDate());
                if ((+_start) > ((+date) + (1000 * 60 * 60 * 24))) {
                    //Lifespan has not started yet
                    if (dayCount[s] === undefined) {
                        dayCount[s] = 0;
                    }

                    return;
                } else if (!_end) {
                    //Lifespan has not ended at all

                } else if (_end < ((+date) + (1000 * 60 * 60 * 24))) {
                    //Lifespan has ended already
                    if (dayCount[s] === undefined) {
                        dayCount[s] = 0;
                    }

                    return;
                } else if (_end === _start) {
                    if (dayCount[s] === undefined) {
                        dayCount[s] = 0;
                    }

                    return;
                }

                //Register the state of the open lifespan in the counter
                if (dayCount[s] === undefined) {
                    dayCount[s] = 1;
                } else {
                    dayCount[s]++;
                }
            });

            var prev = 0;
            var x = 0;
            var previous = [];
            states.forEach(function (st) { //Update the data for each state
                if (x > 0) {
                    prev = previous[x - 1].count + previous[x - 1].previous;
                } else {
                    prev = 0; //opened is the baseline
                }

                var s;
                switch (st) {
                    case 'opened':
                        s = 0;
                        break;
                    case 'Ready to start':
                        s = 1;
                        break;
                    case 'Doing next':
                        s = 2;
                        break;
                    case 'Doing':
                        s = 3;
                        break;
                    case 'In review':
                        s = 4;
                        break;
                }

                var obj = {
                    date: new Date(date),
                    count: dayCount[s],
                    tag: st,
                    previous: prev
                };

                amounts[x].data.push(obj);

                previous[x] = {
                    count: dayCount[s],
                    previous: prev
                };

                if (prev + obj.count > maxAmount) {
                    maxAmount = prev + obj.count;
                }

                x++;
            });


            date.setDate(date.getDate() + 1);
        }

        return {
            amounts: amounts,
            max: maxAmount,
            min: minAmount
        };
    };

    var parseLifespans = function (statelist) {
        var lifespans = [];
        //Looping through all constructs
        for (var rid in statelist) {
            if (statelist.hasOwnProperty(rid)) {
                var statechanges = statelist[rid];

                statechanges.sort(eventSortFunction);
                //statechanges.sort(stSortFunction);

                //The first state in the array is the first statechange taken into account
                var st = statechanges[0].time; //start time
                var state = statechanges[0].statechange.to; //state we are in
                var rt = false; //resolution time

                //skip flag which is used for not to draw states
                //between resolution state and next start state e.g. in cases of reopened issues
                var skip = false;

                //Looping through state changes of one construct
                for (var i = 0; i < statechanges.length; ++i) {
                    var sc = statechanges[i];
                    var trimmedState = sc.statechange.to.replace(/\s/g, '');

                    if (!skip) {
                        var tmp = {
                            rowId: rid,
                            start: st,
                            state: state,
                            end: sc.time,
                            tag: sc.tag
                        };
                        lifespans.push(tmp);
                        st = sc.time;
                        state = sc.statechange.to;
                    } else {
                        st = sc.time;
                        state = sc.statechange.to;
                        skip = false;
                    }

                    //if the final statechange is a resolution event we store the resolution time
                    //otherwise the resolution time is left open --> construct's lifespan has not ended
                    if (i === statechanges.length - 1 && _states.resolution.indexOf(trimmedState) !== -1) {
                        rt = sc.time;
                    } else if (_states.resolution.indexOf(trimmedState) !== -1) {
                        //if there were resolution event in between we don't want to draw line from it
                        //to the start state but end the line. thus we need to skip next push
                        skip = true;
                    }

                }
                if (!skip) {
                    lifespans.push({
                        rowId: rid,
                        start: st,
                        state: state,
                        end: rt,
                        tag: sc.tag
                    });
                }
            }
        }
        return lifespans;
    };

    //Parses the link to related constructs into events and forms the id list ordered sorted by the event time stamp so that
    //the topmost drawn row in the visualization is the row where the first event happened and so on. This is the default ordering of rows for the visualization.
    //Construct map is a helper data structure which contains all constructs in a object where the key is the construct _id (MongoDB). The helper has been formed in
    //parseConstructs function --> parseConstructs NEEDS TO BE CALLED BEFORE THIS FUNCTION (PRECONDITION)!
    var parseStates = function (statechangeEvents, constructMap, tag) {
        var types = [];

        //helper datastructure for parsing lifespans
        var states = {};

        var start = false;
        var end = false;

        var identity_helper = [];

        statechangeEvents.forEach(function (ev) {
            //Ignoring duplicates
            if (identity_helper.indexOf(ev._id) === -1) {
                identity_helper.push(ev._id);

                var time = new Date(ev.time).getTime();

                //detecting the timeframe
                if (time < start || start === false) {
                    start = time;
                }
                if (time > end || end === false) {
                    end = time;
                }

                if (types.indexOf(ev.statechange.to) === -1) {
                    types.push(ev.statechange.to);
                }

                for (var i = 0; i < ev.related_constructs.length; ++i) {
                    if (ev.related_constructs[i] === null || ev.related_constructs[i] === undefined) {
                        continue;
                    }
                    var tmp = {};
                    //Cloning the event object as it can have multiple constructs it is related to.
                    //as we want to visualize all events related to a construct in a single line
                    //we need to clone the event for all the constructs it relates to.
                    for (var property in ev) {
                        if (ev.hasOwnProperty(property)) {
                            tmp[property] = ev[property];
                        }
                    }
                    //Storing the link between events and constructs so that the visualization understands it.
                    if (constructMap[ev.related_constructs[i].toString()] !== undefined) {
                        tmp.rowId = constructMap[ev.related_constructs[i].toString()].rowId;
                        if (tag === "label")
                            tmp.tag = constructMap[ev.related_constructs[i].toString()].data.label;
                        else if (tag === "assigned")
                            tmp.tag = constructMap[ev.related_constructs[i].toString()].data.assigned;
                        else tmp.tag = "notag";

                        if (!states[tmp.rowId]) {
                            states[tmp.rowId] = [];
                        }
                        states[tmp.rowId].push(tmp);
                    }
                } //for related_constructs ends
            } //if id is found ends
        }); //For each statechange ends
        //getting the lifespans from state data
        var lifespans = parseLifespans(states);
        return {
            lifespans: lifespans,
            timeframe: [new Date(start), new Date(end)],
            types: types
        };
    };

    //Parses construct data and state option data from constructs.
    //Adds rowId attribute to the constructs as it is needed for the visualization.
    //Forms helper data structure for event parsing.
    var parseConstructs = function (constructs) {
        var ids_help = [];
        var anonymized = [];
        var processedConstructs = [];

        var ids = [];
        var lenId = 0;
        var longestId = "";

        var lenType = 0;
        var longestType = "";

        var labels = [];
        var assignees = [];

        var identity_helper = [];

        var counter = 1;
        //The helper data structure is for linking construct origin_id.source_id to events
        var constructHelpper = {};
        constructs.forEach(function (construct) {
            if (construct.type !== "issue") {
                return;
            }

            //To ignore duplicates
            if (identity_helper.indexOf(construct._id) === -1) {
                identity_helper.push(construct._id);
                //Finding the right attribute of a construct for y axis indetifier
                var id = construct;
                if (_fromOrigin) {
                    id = construct.origin_id[0];
                }
                for (var m = 0; m < _rowId.length; ++m) {
                    id = id[_rowId[m].toString()];
                }

                //Anonymizing the row ids using the _astring base and a order number
                //Better method where anonymization function/map could be given as a parameter
                //for anonymization should be done next.
                var aid = _astring;
                //If the id is not in the list we add it and the anonymized correspondent
                //the anonymization is done even if it is not used at the moment. However,
                //as it is done in the same loop, it's not at the moment performance issue and
                //can be here as long as we come up with better method.
                if (ids_help.indexOf(id) === -1) {
                    ids_help.push(id);
                    aid += counter.toString();
                    anonymized.push(aid);
                    ++counter;
                } else {
                    aid = anonymized[ids_help.indexOf(id)];
                }

                if (!construct.data.label) {
                    construct.data.label = 'Unlabelled';
                }
                if (labels.indexOf(construct.data.label) === -1) {
                    labels.push(construct.data.label);
                }

                if (!construct.data.assignee) {
                    construct.data.assignee = 'Unassigned';
                }
                if (assignees.indexOf(construct.data.assignee) === -1) {
                    assignees.push(construct.data.assignee);
                }

                //row id is a visualization specific thing that is used in duration timeline chart
                //as Y-axis identified and everything that should be associated to a same line
                //should have same row id. If we use the anonymized ids we address the anonymized id to
                //the construct. Otherwise we use the non anonymized identifier.
                if (_anonymize) {
                    construct.rowId = aid;
                } else {
                    construct.rowId = id;
                }
                constructHelpper[construct._id.toString()] = construct;
                processedConstructs.push(construct);
                if (construct.type.length > lenType) {
                    lenType = construct.type.length;
                    longestType = construct.type;
                }

                if (ids.indexOf(construct.rowId) === -1) {
                    ids.push(construct.rowId);

                    if (construct.rowId.length > lenId) {
                        lenId = construct.rowId.length;
                        longestId = construct.rowId;
                    }
                }
            }

        });
        return {
            helper: constructHelpper,
            processedConstructs: processedConstructs,
            ids: ids,
            longestId: longestId,
            longestType: longestType,
            labels: labels,
            assignees: assignees
        };
    };

    var parseData = function (events, constructs, states, tag) {
        if (debug) {
            console.log("[STATES_CHART_PROCESSOR]parseData", events, constructs, states);
        }

        //object for the processed data
        var data = {};

        //from constructs we parse ids and constructs that are used
        //it also adds property rowID to constructs in _constructs list!
        var constructData = parseConstructs(constructs, tag);
        var stateData = parseStates(states, constructData.helper);
        data.lifespans = stateData.lifespans;

        data.timeframe = [new Date(stateData.timeframe[0].getFullYear(), stateData.timeframe[0].getMonth(), stateData.timeframe[0].getDate()),
            new Date(stateData.timeframe[1].getFullYear(), stateData.timeframe[1].getMonth(), stateData.timeframe[1].getDate() + 1)
        ];
        if (debug) {
            console.log("[STATES_CHART_PROCESSOR]Parsed constructs:", constructData);
            console.log("[STATES_CHART_PROCESSOR]Lifespan:", data.lifespans);
            console.log("[STATES_CHART_PROCESSOR]Parsed timeframe:", data.timeframe);
        }

        constructData.states = ['opened', 'Ready to start', 'Doing next', 'Doing', 'In review'];
        var result = getAmounts(stateData.timeframe, stateData.lifespans, constructData.states);

        data.amounts = result.amounts;
        data.max = result.max;
        data.min = 0;

        data.tags = stateData.types;

        return data;
    };

    return parseData;
};