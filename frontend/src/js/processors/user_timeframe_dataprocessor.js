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
var USER_TIMEFRAME_PROCESSOR = function(par){
   
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
    
    var typeSelect = function(statelist, type){
        var states = [];
        
        for(var i in statelist){
            var state = statelist[i];
            
            switch(type){
                case "session":
                    if(state.type == "start/end")
                        states.push(state);
                    break;
                case "document":
                    if(state.type == "doc")
                        states.push(state);
                    break;
                case "page":
                    if(state.type == "help")
                        states.push(state);
                    break;
            }
        }
        
        return states;
    }
    
    var parseLifespans = function(statelist){
        var lifespans = [];
        //Looping through all constructs
        for(var rid in statelist){            
            if(statelist.hasOwnProperty(rid)){
                var statechanges = typeSelect(statelist[rid].evs, statelist[rid].type);
                var type = statelist[rid].type;
                statechanges.sort(stSortFunction);
                
                //console.log("[dataprocessor]States of ", rid, ":", statechanges);
                
                switch (type){
                   case "session":
                        lifespans.push({
                            rowId : rid,
                            start : statechanges[0].time,
                            state : statechanges[0].statechange.to,
                            end : statechanges[1].time
                        });

                        break;
                    
                    case "document":
                        var st = statechanges[0].time; //start time
                        var state = statechanges[0].statechange.to; //state we are in
                        var rt = false;//resolution time
                    
                        for(var i = 0; i < statechanges.length; ++i){
                            sc = statechanges[i];   
                            if (sc.statechange.to.includes("close")){
                                rt = sc.time;  
                                
                                lifespans.push({
                                    rowId : rid,
                                    start : st,
                                    state : state,
                                    end : rt
                                });
                            }
                        }
                        
                        break;
                    /*
                    case "page":
                        if (sc.statechange.to.includes("open") && i > 0)
                            lifespans[i-1].end = sc.time;

                        break; */
                }
                
                /*
                //The first state in the array is the first statechange taken into account
                var st = statechanges[0].time; //start time
                var state = statechanges[0].statechange.to; //state we are in
                var rt = false;//resolution time
                
                //skip flag which is used for not to draw states
                //between resolution state and next start state e.g. in cases of reopened issues
                var skip = false;

                //Looping through state changes of one construct
                var sc;
                for(var i = 0; i < statechanges.length; ++i){
                    sc = statechanges[i];
                    
                    switch(type){
                        case "session":
                            if (sc.statechange.to.includes("close"))
                                rt = sc.time;
                            
                        
                            break;
                        case "document":
                            if (sc.statechange.to.includes("close"))
                                rt = sc.time;    
                            break;
                        case "page":
                            if (sc.statechange.to.includes("open") && i > 0)
                                lifespans[i-1].end = sc.time;
                                
                            break;
                    }

                    lifespans.push({
                        rowId : rid,
                        start : st,
                        state : sc.statechange.to,
                        end : rt
                    });
                    
                }*/
            }
        }
        
        console.log("[dataprocessor]Output:", lifespans);
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
                
                var time = new Date(ev.time).getTime();
                
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
                        
                        //tmp.type = ev.type; //type of construct treated here
                        if(!states[tmp.rowId]){
                            var tmp_type = constructMap[ev.related_constructs[i].toString()].type;
                            states[tmp.rowId] = {type: tmp_type, evs: []};
                        }
                        states[tmp.rowId].evs.push(tmp);
                    }
                }//for related_constructs ends
                
            }//if id is found ends
        });//For each statechange ends
        //getting the lifespans from state data
        var lifespans = parseLifespans(states);
        
        return {
            lifespans : lifespans,
            timeframe:[new Date(start - 1000), new Date(end)], //Timeframe of states... irrelevant if not per session
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
                
                var time = new Date(ev.time).getTime();
                
                //detecting the timeframe
                if(time < start || start === false){
                    start = time;
                }
                if(time > end || end === false){
                    end = time;
                }

                if(types.indexOf(ev.type) === -1){
                    types.push(ev.type);
                }
                
                if (ev.related_constructs.length === 0){
                    console.log("[user_timeframe_dataprocessor]Event has no related constructs:", ev);
                }
                else if(constructMap[ev.related_constructs[0].toString()] !== undefined){
                    //Find best related construct
                    var num = 0;
                    for(var i in ev.related_constructs){
                        var rel = constructMap[ev.related_constructs[i].toString()];
                        
                        switch(ev.type){
                            case "help":
                                if (rel.type === "page")
                                    num = i;
                                break;
                            case "doc":
                                if (rel.type === "document")
                                    num = i;
                                break;
                            case "feature":
                                if (rel.type === "session")
                                    num = i;
                                break;
                        }
                    }

                    ev.rowId = constructMap[ev.related_constructs[num].toString()].rowId;
                    evs.push(ev); 
                }
                
                /*
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
                }*/
            }
            
        });
        return {
            events: evs, 
            timeframe:[new Date(start), new Date(end)], //Timeframe of events... irrelevant if not per session
            types : types
        };
    };
    
    //Splits the constructs into the different types
    //And add user_id to constructs
    var splitConstructs = function(constructs){
    
        //Separate the constructs
        var _users = [];
        var _sessions = [];
        var _docs = [];
        var _pages = [];

        var identity_helper = [];
                
        var constructHelpper = {};
        constructs.forEach(function(item){
            //Ignoring duplicates
            if(identity_helper.indexOf(item._id) === -1){
                identity_helper.push(item._id);
                
                var id = item;
                if(_fromOrigin){
                    id = item.origin_id[0];
                }
                for(var m = 0; m < _rowId.length; ++m){
                    id = id[_rowId[m].toString()];
                }
                item.rowId = id;
                
                switch (item.type) {
                    case "user":
                        _users.push(item);
                        break;
                    case "session":
                        item.user_id = item.related_constructs[0]; //Link to user
                        _sessions.push(item);
                        break;
                    case "document":
                        item.user_id = item.related_constructs[0]; //Link to user
                        _docs.push(item);
                        break;
                    case "page":
                        //Take care of linking pages later
                        //item.user_id = item.related_constructs[0];
                        _pages.push(item);
                        break;
                    /*default:
                        console.log("[user_timeframe_dataprocessor]Error: Unkown construct type.");
                        break;*/
                }
                
                constructHelpper[item._id.toString()] = item;
            }
        });
            
        return{
            helper  : constructHelpper,
            users   : _users,
            sessions: _sessions,
            docs    : _docs,
            pages   : _pages      
        };
    };

    var sortRows = function(constructs_split){
        var tmp = [];
        
        var ids = []; //Only the ids
        var ids_names = []; //IDs used in yDomain and names used in display
        
        var constructs = [];
        constructs = constructs_split.users.concat(constructs_split.sessions).concat(constructs_split.docs).concat(constructs_split.pages);
        
        for(var i in constructs){
            var obj = constructs[i];
            var name = obj.name;
            if (obj.type === "page"){
                name = name.split("kactus2.2.0")[1];
            }else if (obj.type === "session"){
                name = "Session";
            }
            tmp.push({name : name, rowId : obj.rowId, user : obj.related_constructs[0]});
        }
        
        //Not sorting shit
        /*
        console.log("sorting");
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
        */
        var longestName = "";
        for(var i = 0; i < tmp.length; ++i){
            ids_names.push({id: tmp[i].rowId, name: tmp[i].name});
            ids.push(tmp[i].rowId);
            
            if(longestName.length < tmp[i].name.length)
                longestName = tmp[i].name;
        }
        
        if(longestName.length > 25)
            longestName = "wwwwwwwwwwwwwwwwwwwwwwwww";
        
        return {ids: ids, all: ids_names, longestName: longestName};
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
        console.log("[user_timeframe_dataprocessor]parsing...", constructs, events, statechanges);

        //object for the processed data
        var data = {};
        
        //from constructs we parse ids and constructs that are used
        //it also adds property rowID to constructs in _constructs list!
        var constructData = false;
        var eventData = false;
        var stateData = false;
        
        try{ constructData = splitConstructs(constructs); } catch (e) {console.log("[user_timeframe_dataprocessor]Error 1:", e);}
        try{ eventData = parseEvents(events, constructData.helper); } catch (e) {console.log("[user_timeframe_dataprocessor]Error 2:", e);}
        try{ stateData = parseStates(statechanges, constructData.helper); } catch (e) {console.log("[user_timeframe_dataprocessor]Error 3:", e);}
        
        //users/sessions/pages/docs
        data.constructs = constructData;
        data.events = eventData.events;
        data.lifespans = stateData.lifespans;
        
        data.types = eventData.types.concat(stateData.types); //state/event types for legend
        data.types.splice(data.types.length - 2, 2);//removes session open/closed states of legend
        data.types.sort();

        var tmpId = sortRows(data.constructs);
        data.ids = tmpId.ids;
        data.names = tmpId.all;
        data.longestId = tmpId.longestName;
        
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
        
        //Define the actual timeframe ???
        var t_start = +(new Date(start.getFullYear(), start.getMonth(), start.getDate(), start.getHours(), start.getMinutes(), start.getSeconds()));
        var t_end = +(new Date(end.getFullYear(), end.getMonth(), end.getDate(), end.getHours(), end.getMinutes()+1, end.getSeconds()));
        
        data.timeframe = [t_start, t_end];
    
        console.log("[user_timeframe_dataprocessor]Parsed:", data);
        
        //Giving the data to who needs it
        return data;
    };
    
    return parseData;
};