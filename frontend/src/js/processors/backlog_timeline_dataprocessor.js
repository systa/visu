
//Data processor for backlog timeline chart
//Filters can be used to query data based on e.g. origin or time frame. NOT YET IMPLEMENTED!
//mapping is to determine which field of construct is used as a Y axis index values
//if anonymize flag is set to true the Y axis index values are anonymized using the base string provided
//in astring parameter and order number. If no base string is provided only order numbers are used to anonymize the ids.
var BACKLOG_TIMELINE_PROCESSOR = function(par){
    
    var p = par || {};
    
    var _rowId = p.rowId !== undefined ? p.rowId : "_id";
    var _fromOrigin = p.rowIdIsFromOrigin !== undefined ? p.rowIdIsFromOrigin : false;
    var _anonymize = p.anonymize !== undefined ? p.anonymize : false;
    var _astring = p.astring !== undefined ? p.astring : "";
    
    //Splitting the Y-index mapping from . so we can do the mapping properly
    //even if it is a field of nested object.
    _rowId = _rowId.split(".");
    
    var eventSortFunction = function(e1, e2){
        var t1 = new Date(e1.time).getTime();
        var t2 = new Date(e2.time).getTime();
        //If the time is same we order the events alphabetically based on the row identifier
        if(t1 === t2){
            if(e1.rowId !== undefined && e2.rowId !== undefined){
                return e1.rowId.localeCompare(e2.rowId);
            }
            else if(e1.rowId !== undefined){
                return -1;
            }
            else if(e2.rowId !== undefined){
                return 1;
            }
            else{
                return 0;
            }
        }
        return t1-t2;
    };
    
    //Parses the link to related constructs into events and forms the id list ordered sorted by the event time stamp so that
    //the topmost drawn row in the visualization is the row where the first event happened and so on. This is the default ordering of rows for the visualization.
    //Construct map is a helper data structure which contains all constructs in a object where the key is the construct _id (MongoDB). The helper has been formed in
    //parseConstructs function --> parseConstructs NEEDS TO BE CALLED BEFORE THIS FUNCTION (PRECONDITION)!
    var parseEvents = function(events, constructMap){
        var evs = [];
        var states = [];
        var start = false;
        var end = false;
        
        var identity_helper = [];
        
        events.forEach(function(ev){
            //ignoring duplicates
            if(identity_helper.indexOf(ev._id) === -1){
                identity_helper.push(ev._id);
                
                var st = new Date(ev.time).getTime();
                var et = st + parseInt(ev.duration);
                
                if(st < start || start === false){
                    start = st;
                }
                if(et > end || end === false){
                    end = et;
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
                        evs.push(tmp);
                    }

                    if(ev.isStatechange){
                        if(states.indexOf(ev.statechange.to) === -1){
                            states.push(ev.statechange.to);
                        }
                    }      
                }
            }
        });
        
        evs.sort(eventSortFunction);
        
        //to get the ids sorted by the event time, we need to go through the sorted event array!
        //this needs to be done in order thus for loop instead of forEach function is used. For each does
        //nor preserve order!
        var ids = [];
        for(var k = 0; k < evs.length; ++k){
            var id = evs[k].rowId;
            if(ids.indexOf(id) === -1){
                ids.push(id);
            }
        }
        
        return {events:evs, timeframe:[start, end], ids : ids, states: states};
    };
    
    //Parses construct data and state option data from constructs.
    //Adds rowId attribute to the constructs as it is needed for the visualization.
    //Forms helper data structure for event parsing.
    //Returns: helper object for event parsing.
    var parseConstructs = function(constructs){
        var ids_help = [];
        var anonymized = [];
        var identity_helper = [];

        var lenId = 0;
        var longestId = "";

        var counter = 1;
        //The helper data structure is for linking construct origin_id.source_id to events
        var constructHelpper = {};
        constructs.forEach(function(construct){
            //To ignore duplicates
            if(identity_helper.indexOf(construct._id) === -1){
                identity_helper.push(construct._id);
                //var id = construct.origin_id.source_id);
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

                if(construct.rowId.length > lenId){
                    lenId = construct.rowId.length;
                    longestId = construct.rowId;
                }
            }
        });
        return{helper:constructHelpper, longestId : longestId};
    };
    
    var parseData = function(constructs, events){
        //object for the processed data
        var data = {};
        
        //from constructs we parse ids and stateOptions
        //it also adds property rowID to constructs in _constructs list!
        var constructData = parseConstructs(constructs);
        data.longestId = constructData.longestId;
        
        var eventData = parseEvents(events, constructData.helper);
        data.events = eventData.events;
        data.ids = eventData.ids;
        data.states = eventData.states;
        
        //increasing the timeframe a bit so that the visualization doesn't end
        //to the same pixel the data ends (it may be seen as cutting the data)
        var tmp = new Date(eventData.timeframe[1]).getTime();
        var correction = (tmp+1000)%1000;
        eventData.timeframe[1] = tmp+(1000-correction);
        data.timeframe = eventData.timeframe;
        
        //giving the data to who needs it
        return data;
    };
    
    return parseData;
};