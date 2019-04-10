/*
* Copyright (c) TUT Tampere University of Technology 2014-2015.
* All rights reserved.
* This software has been developed in Tekes-TIVIT project Need-for-Speed.
* All rule set in consortium agreement of Need-for-Speed project apply.
*
* Main authors: Antti Luoto, Anna-Liisa Mattila, Henri Terho
*/

//Data processor for event timeline chart
//Filters can be used to query data based on e.g. origin or time frame. NOT YET IMPLEMENTED!
//mapping is to determine which field of construct is used as a Y axis index values
//if anonymize flag is set to true the Y axis index values are anonymized using the base string provided
//in astring parameter and order number. If no base string is provided only order numbers are used to anonymize the ids.
var SESSION_TIMEFRAME_PROCESSOR = function(par){
   
    var p = par || {};
    
    var _rowId = p.rowId !== undefined ? p.rowId : "source_id";
    var _fromOrigin = p.rowIdIsFromOrigin !== undefined ? p.rowIdIsFromOrigin : true;
    var _anonymize = p.anonymize !== undefined ? p.anonymize : true;
    var _astring = p.astring !== undefined ? p.astring : "";
    var _states = p.states !== undefined ? p.states : {};

    var _resolution = _states.resolution !== undefined ? _states.resolution : ["(session)closed"];
    
    //Splitting the Y-index mapping from . so we can do the mapping properly
    //even if it is a field of nested object.
    _rowId = _rowId.split(".");
    
    //Sorts event based on time
    // if the timestamps are the same start events are allways smaller than other events
    // and close events are allways larger than other events
    // if both events have the same timestamp and are both start or close events or neither of them
    // the ordering is done based on rowid (alphabetically)
    var stSortFunction = function(e1, e2){
        var t1 = new Date(e1.time).getTime();
        var t2 = new Date(e2.time).getTime();

        if(t1 === t2){

            if(e1.statechange === undefined || e2.statechange === undefined){
                //console.log("o1: ", e1, " o2: ", e2);
                return 0;
            }

            if(e1.statechange.from === "" || e1.statechange.from === null || e1.statechange.from === undefined){
                return 1;
            }
            else if(e2.statechange.from === "" || e2.statechange.from === null || e2.statechange.from === undefined){
                return -1;
            }
        }

        return t1-t2;
    };
    
    var eventSortFunction = function(e1, e2){
        var t1 = new Date(e1.time).getTime();
        var t2 = new Date(e2.time).getTime();
        return t1-t2;
    };
    
    var parseLifespans = function(statelist){
        var lifespans = [];
        //Looping through all constructs
        for(var rid in statelist){            
            if(statelist.hasOwnProperty(rid)){
                var statechanges = statelist[rid];
                //console.log(rid, statechanges);
                statechanges.sort(stSortFunction);

                //The first state in the array is the first statechange taken into account
                var st = statechanges[0].time; //start time
                var state = statechanges[0].statechange.to; //state we are in
                var rt = false;//resolution time
                
                //skip flag which is used for not to draw states
                //between resolution state and next start state e.g. in cases of reopened issues
                var skip = false;

                //Looping through state changes of one construct
                var first_time = statechanges[0].time;
                var sc;
                for(var i = 0; i < statechanges.length; ++i){
                    //Only consider states linked to session
                    sc = statechanges[i];
                    if (sc.statechange && sc.statechange.to.includes("session")) {
                        
                        if (sc.statechange.to.includes("close")){
                            rt = sc.time;
                        }
                        
                        lifespans.push({
                            rowId : rid,
                            start : st.time,
                            state : sc.statechange.to,
                            end : rt,
                            first_time : first_time
                        });
                    }
                }
            }
        }
        return lifespans;
    };
    
    //Parses the link to related constructs into events and forms the id list ordered sorted by the event time stamp so that
    //the topmost drawn row in the visualization is the row where the first event happened and so on. This is the default ordering of rows for the visualization.
    //Construct map is a helper data structure which contains all constructs in a object where the key is the construct _id (MongoDB). The helper has been formed in
    //parseConstructs function --> parseConstructs NEEDS TO BE CALLED BEFORE THIS FUNCTION (PRECONDITION)!
    var parseStates = function(statechangeEvents, constructMap){
        var types = [];
        
        //helper datastructure for parsing lifespans
        var states = {};
        
        var start = false;
        var end = false;
        
        var identity_helper = [];
        
        statechangeEvents.forEach(function(ev){
            //Ignoring duplicates
            if(identity_helper.indexOf(ev._id) === -1){
                identity_helper.push(ev._id);
                
                var first_time = new Date(ev.data.first_time).getTime();
                var time = new Date(ev.time).getTime() - first_time;
                
                //detecting the timeframe
                if(time < start || start === false){
                    start = time;
                }
                if(time > end || end === false){
                    end = time;
                }

                //Include session-related state types only
                if(types.indexOf(ev.statechange.to) === -1){
                    //Only push state types of sessions
                    if (ev.statechange.to.includes("session")){
                        types.push(ev.statechange.to);
                    }
                }
                if(types.indexOf(ev.statechange.from) === -1){
                    //Only push state types of sessions
                    if (ev.statechange.from.includes("session")){
                        types.push(ev.statechange.from);
                    }
                }
                
                for(var i = 0; i < ev.related_constructs.length; ++i){
                    if(ev.related_constructs[i] === null || ev.related_constructs[i] === undefined){
                        continue;
                    }
                    var tmp  = {};
                    //Cloning the event object as it can have multiple constructs it is related to.
                    //as we want to visualize all events related to a construct in a single line
                    //we need to clone the event for all the constructs it relates to.
                    for(var property in ev){
                        if(ev.hasOwnProperty(property)){
                            tmp[property] = ev[property];
                        }
                    }
                    //Storing the link between events and constructs so that the visualization understands it.
                    if(constructMap[ev.related_constructs[i].toString()] !== undefined){
                        tmp.rowId = constructMap[ev.related_constructs[i].toString()].rowId;
                    
                        if(!states[tmp.rowId]){
                            states[tmp.rowId] = [];
                        }
                        states[tmp.rowId].push(tmp);
                    }
                }//for related_constructs ends
            }//if id is found ends
        });//For each statechange ends
        //getting the lifespans from state data
        var lifespans = parseLifespans(states);
        return {
            lifespans : lifespans,
            timeframe:[new Date(start), new Date(end)],
            types : types
        };
    };

    var parseEvents = function(events, constructMap){
        var evs = [];
        var types = [];
        
        var start = false;
        var end = false;
        
        var identity_helper = [];
        
        events.forEach(function(ev){
            //Ignoring duplicates
            if(identity_helper.indexOf(ev._id) === -1){
                identity_helper.push(ev._id);
                
                var first_time = new Date(ev.data.first_time).getTime();
                var time = new Date(ev.time).getTime() - first_time;
                
                //detecting the timeframe
                if(time < start || start === false){
                    start = time;
                    //console.log("new end time: ",start,"=",new Date(ev.time).getTime(),"-",first_time);
                }
                if(time > end || end === false){
                    end = time;
                    //console.log("new end time: ",end,"=",new Date(ev.time).getTime(),"-",first_time);
                }

                if(types.indexOf(ev.type) === -1){
                    types.push(ev.type);
                }
                
                for(var i = 0; i < ev.related_constructs.length; ++i){
                    if(ev.related_constructs[i] !== null || ev.related_constructs[i] !== undefined){
                        var tmp  = {};
                        //Cloning the event object as it can have multiple constructs it is related to.
                        //as we want to visualize all events related to a construct in a single line
                        //we need to clone the event for all the constructs it relates to.
                        for(var property in ev){
                            if(ev.hasOwnProperty(property)){
                                tmp[property] = ev[property];
                            }
                        }
                        //Storing the link between events and constructs so that the visualization understands it.
                        if(constructMap[ev.related_constructs[i].toString()] !== undefined){
                            tmp.rowId = constructMap[ev.related_constructs[i].toString()].rowId;
                            evs.push(tmp); 
                        }
                    }
                }
            }
            
        });
        return {events: evs, timeframe:[new Date(start), new Date(end)], types : types};
    };
    
    //Parses construct data and state option data from constructs.
    //Adds rowId attribute to the constructs as it is needed for the visualization.
    //Forms helper data structure for event parsing.
    var parseConstructs = function(constructs){
        var ids_help = [];
        var anonymized = [];
        var processedConstructs = [];

        var ids = [];
        var lenId = 0;
        var longestId = "";

        var lenUser = 0;
        var longestUser = "";
        
        var identity_helper = [];
        
        var counter = 1;
        //The helper data structure is for linking construct origin_id.source_id to events
        var constructHelpper = {};
        constructs.forEach(function(construct){
            //To ignore duplicates
            if(identity_helper.indexOf(construct._id) === -1){
                identity_helper.push(construct._id);
                //Finding the right attribute of a construct for y axis indetifier
                var id = construct;
                if(_fromOrigin){
                    id = construct.origin_id[0];
                }
                for(var m = 0; m < _rowId.length; ++m){
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
                if(ids_help.indexOf(id) === -1){
                    ids_help.push(id);
                    aid += counter.toString();
                    anonymized.push(aid);
                    ++counter;
                }
                else{
                    aid = anonymized[ids_help.indexOf(id)];
                }
                
                //row id is a visualization specific thing that is used in duration timeline chart
                //as Y-axis identified and everything that should be associated to a same line
                //should have same row id. If we use the anonymized ids we address the anonymized id to
                //the construct. Otherwise we use the non anonymized identifier.
                if(_anonymize){
                    construct.rowId = aid;
                }
                else{
                    construct.rowId = id;
                }
                constructHelpper[construct._id.toString()] = construct;
                processedConstructs.push(construct);
                if(construct.related_constructs[0].length > lenUser){
                    lenUser = construct.related_constructs[0].length;
                    longestUser = construct.related_constructs[0];
                }

                if(ids.indexOf(construct.rowId) === -1){
                    ids.push(construct.rowId);

                    if(construct.rowId.length > lenId){
                        lenId = construct.rowId.length;
                        longestId = construct.rowId;
                    }
                }
            }
            
        });
        return{
            helper:constructHelpper,
            processedConstructs : processedConstructs,
            ids : ids,
            longestId : longestId,
            longestUser: longestUser
        };
    };

    var sortRows = function(constructs){
        var tmp = [];
        var ids = [];

        //console.log("[dataprocessor]Contructs: ", constructs);

        for(var i in constructs){
            var obj = constructs[i];
            tmp.push({name : obj.name, rowId : obj.rowId, user : obj.related_constructs[0]});
        }
        //console.log(tmp);
        try{
            //Sort constructs -> will define the row of each construct (not rowID!)
            tmp.sort(function(c1, c2){
                //console.log(c1);
                //console.log(c2);
                
                var u1 = c1.user;
                var u2 = c2.user;
                
                var tmp = u1.localeCompare(u2);
                
                if(tmp !== 0){
                    return tmp; //Sort by user name
                }else {
                    var n1 = c1.name;
                    var n2 = c2.name;
                    return n1.localeCompare(n2); //Then by session name
                }
            });
        
        }catch(e){
            console.log(e);
        }
        
        for(var i = 0; i < tmp.length; ++i){
            ids.push(tmp[i].rowId);
        }
        
        return ids;
    };

    var mergeIdLists = function(stateId, constructId){
        for(var i = 0; i < constructId.length; ++i){
            if(stateId.indexOf(constructId[i]) === -1){
                stateId.push(constructId);
            }
        }
        return stateId;
    };
    
    var parseData = function(constructs, events, statechanges){
        //object for the processed data
        var data = {};
        
        //from constructs we parse ids and constructs that are used
        //it also adds property rowID to constructs in _constructs list!
        var constructData = parseConstructs(constructs);
        var eventData = parseEvents(events, constructData.helper);
        var stateData = parseStates(statechanges, constructData.helper);

        data.constructs = constructData.processedConstructs;
        data.longestId = constructData.longestId;
        data.longestUser = constructData.longestUser; //construct user 
        data.events = eventData.events;

        //HERE
        data.lifespans = stateData.lifespans;
        
        data.types = eventData.types; //.concat(stateData.types); //state/event types for legend
        data.types.sort();

        //var scId = sortRows(stateData.lifespans);
        var scId = sortRows(data.constructs);

        data.ids = mergeIdLists(scId, constructData.ids);

        var start = eventData.timeframe[0];
        var s1 = eventData.timeframe[0].getTime();
        var s2 = stateData.timeframe[0].getTime();
        if(s2 < s1){
            start = stateData.timeframe[0];
        } //Gets start from min(stateData, eventData)

        var end = eventData.timeframe[1];
        var e1 = eventData.timeframe[1].getTime();
        var e2 = stateData.timeframe[1].getTime();
        if(e2 > e1){
            end = stateData.timeframe[1];
        } //Gets end from max(stateData, eventData)
        //console.log("[session_timeframe_dataprocessor]end time: max(", e1, ",", e2, ")");

        //Define the actual timeframe ???
        var t_start = +(new Date(start.getFullYear(), start.getMonth(), start.getDate(), start.getHours(), start.getMinutes(), start.getSeconds()));
        var t_end = +(new Date(end.getFullYear(), end.getMonth(), end.getDate(), end.getHours(), end.getMinutes()+1, end.getSeconds()));
        data.timeframe = [0, t_end - t_start];
        
        //giving the data to who needs it
        return data;
    };
    
    return parseData;
};