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

//Data processor for event timeline chart
//Filters can be used to query data based on e.g. origin or time frame. NOT YET IMPLEMENTED!
//mapping is to determine which field of construct is used as a Y axis index values
//if anonymize flag is set to true the Y axis index values are anonymized using the base string provided
//in astring parameter and order number. If no base string is provided only order numbers are used to anonymize the ids.
var PIPELINE_CHART_PROCESSOR = function (par) {
    var p = par || {};

    var _rowId = p.rowId !== undefined ? p.rowId : "_id";
    var _fromOrigin = p.rowIdIsFromOrigin !== undefined ? p.rowIdIsFromOrigin : false;
    var _anonymize = p.anonymize !== undefined ? p.anonymize : false;
    var _astring = p.astring !== undefined ? p.astring : "";
    var _states = p.states !== undefined ? p.states : {};

    var _PROCESSOR_UTILITES = PROCESSOR_UTILITES();

    //Splitting the Y-index mapping from . so we can do the mapping properly
    //even if it is a field of nested object.
    _rowId = _rowId.split(".");

    //Sorts event based on time
    var eventSortFunction = function(e1, e2){
        var t1 = new Date(e1.time).getTime();
        var t2 = new Date(e2.time).getTime();
        return t1-t2;
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
                       tmp.tag = constructMap[ev.related_constructs[i].toString()].type;

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

    var parseEvents = function (events, constructMap) {
        var evs = [];
        var types = [];

        var start = false;
        var end = false;

        var identity_helper = [];

        events.forEach(function (ev) {
            //Ignoring duplicates
            if (identity_helper.indexOf(ev._id) === -1) {
                identity_helper.push(ev._id);

                if(ev.type === 'pipeline'){
                    //get related events (these are the pipeline jobs)
                    var jobs = _PROCESSOR_UTILITES.findRelatedEvents([ev], events);
                    var stages = {};

                    //create stages for each pipeline
                    jobs.forEach(function(job){
                        if (stages[job.data.stage] === undefined){
                            stages[job.data.stage] = {};
                            stages[job.data.stage].jobs = [];
                        }
                        var tmp = {
                            _id : job._id,
                            type : job.type,
                            creator : job.creator,
                            time : job.time,
                            name : job.data.name,
                            stage : job.data.stage,
                            duration : job.duration,
                            origin_id : job.origin_id,
                            state: job.data.state,
                            commit: job.data.commit,
                            commit_title: job.data.commit_title
                        }
                        stages[job.data.stage].jobs.push(tmp);
                    });

                    //compute stage status from jobs status
                    for (var i in stages) {
                        var stage = stages[i];
                        var status = 'passed';
                        stage.jobs.forEach(function(job){
                            if (job.state !== 'success' && status !== 'canceled' & status !== 'failed'){
                                status = job.state;
                            }
                        });
                        stage.status = status;
                    }

                    ev.stages = stages;
                }

                var related = false;
                for (var i = 0; i < ev.related_constructs.length; ++i) {
                    if (ev.related_constructs[i] !== null || ev.related_constructs[i] !== undefined) {
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
                            evs.push(tmp);
                            related = true;
                        }
                    }
                }

                //Only consider events related to a construct
                if (related) {
                    var time = new Date(ev.time).getTime();

                    //detecting the timeframe
                    if (time < start || start === false) {
                        start = time;
                    }
                    if (time > end || end === false) {
                        end = time;
                    }

                    //storing the event types
                    if (types.indexOf(ev.type) === -1) {
                        types.push(ev.type);
                    }

                    
                }
            }

        });
        return {
            events: evs,
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
            //Filter constructs not realted to pipelines
            if (construct.type !== "branch" && construct.type !== "version") {
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

                if(construct.type === 'issue'){

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

    var sortRows = function (lifespans) {
        var idHelper = {};
        var lptmp = [];
        var ids = [];
        lifespans.forEach(function (lp) {
            if (idHelper[lp.rowId] === undefined) {
                idHelper[lp.rowId] = {
                    start: lp.start,
                    end: lp.end
                };
            } else {
                var endtmp = idHelper[lp.rowId].end;
                if (endtmp !== false && lp.end !== false) {
                    var e1 = new Date(endtmp).getTime();
                    var e2 = new Date(lp.end).getTime();
                    if (e2 > e1) {
                        idHelper[lp.rowId].end = lp.end;
                    }
                } else {
                    idHelper[lp.rowId].end = false;
                }

                var s1 = new Date(idHelper[lp.rowId].start).getTime();
                var s2 = new Date(lp.start).getTime();
                if (s2 < s1) {
                    idHelper[lp.rowId].start = lp.start;
                }

                idHelper[lp.rowId].tag = lp.tag;
            }
        });

        for (var obj in idHelper) {
            if (idHelper.hasOwnProperty(obj)) {
                lptmp.push({
                    start: idHelper[obj].start,
                    end: idHelper[obj].end,
                    tag: idHelper[obj].tag,
                    rowId: obj
                });
            }
        }

        lptmp.sort(function (lp1, lp2) {
            var s1 = new Date(lp1.start).getTime();
            var s2 = new Date(lp2.start).getTime();

            if (lp1.tag === 'version' && lp2.tag === 'branch'){
                return 1;
            }else if (lp1.tag === 'branch' && lp2.tag === 'version'){
                return -1;
            }
            //return s1 - s2;

            if (lp1.end === false && lp2.end === false) {
                return s1 - s2;
            } else if (lp1.end === false) {
                return 1;
            } else if (lp2.end === false) {
                return -1;
            } else {
                var t1 = new Date(lp1.end);
                var t2 = new Date(lp2.end);

                t1 = new Date(t1.getFullYear(), t1.getMonth(), t1.getDate()).getTime();
                t2 = new Date(t2.getFullYear(), t2.getMonth(), t2.getDate()).getTime();

                var e = t1 - t2;
                if (e === 0) {
                    return s1 - s2;
                } else {
                    return e;
                }
            }
        });

        for (var i = 0; i < lptmp.length; ++i) {
            ids.push(lptmp[i].rowId);
        }

        return ids;
    };

    var mergeIdLists = function (stateId, constructId) {
        for (var i = 0; i < constructId.length; ++i) {
            if (stateId.indexOf(constructId[i]) === -1) {
                stateId.push(constructId);
            }
        }
        return stateId;
    };

    var parseData = function (constructs, events, statechanges, tag) {
        if (debug) {
            console.log("[PIPELINE_CHART_PROCESSOR]Data for processor:", events, constructs, statechanges);
        }
        //object for the processed data
        var data = {};

        //from constructs we parse ids and constructs that are used
        //it also adds property rowID to constructs in _constructs list!
        var constructData = parseConstructs(constructs);
        console.log("[PIPELINE_CHART_PROCESSOR]Construct data:", constructData);

        var eventData = parseEvents(events, constructData.helper);
        console.log("[PIPELINE_CHART_PROCESSOR]Event data:", eventData);

        var stateData = parseStates(statechanges, constructData.helper, tag);

        console.log("[PIPELINE_CHART_PROCESSOR]State data:", stateData);

        data.constructs = constructData.processedConstructs;
        data.longestId = constructData.longestId;
        data.longestType = constructData.longestType;
        data.events = eventData.events;
        data.lifespans = stateData.lifespans;
        data.types = eventData.types; //eventData.types.concat(stateData.types);
        data.types.sort();
        data.states =  ['success', 'failed', 'canceled'];

        var scId = sortRows(stateData.lifespans);
        data.ids = mergeIdLists(scId, constructData.ids);

        var start = eventData.timeframe[0];
        var s1 = eventData.timeframe[0].getTime();
        var s2 = stateData.timeframe[0].getTime();
        if (s2 < s1) {
            start = stateData.timeframe[0];
        }

        var end = eventData.timeframe[1];
        var e1 = eventData.timeframe[1].getTime();
        var e2 = stateData.timeframe[1].getTime();
        if (e2 > e1) {
            end = stateData.timeframe[1];
        }

        data.timeframe = [new Date(start.getFullYear(), start.getMonth(), start.getDate()),
            new Date(end.getFullYear(), end.getMonth(), end.getDate() + 1)
        ];

        data.tags = ['success', 'failed', 'canceled'];
        
        //giving the data to who needs it
        return data;
    };

    return parseData;
};