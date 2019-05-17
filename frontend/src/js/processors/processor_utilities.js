/*
* Copyright (c) TUT Tampere University of Technology 2014-2015.
* All rights reserved.
* This software has been developed in Tekes-TIVIT project Need-for-Speed.
* All rule set in consortium agreement of Need-for-Speed project apply.
*
* Main authors: Antti Luoto, Anna-Liisa Mattila, Henri Terho
*/

var PROCESSOR_UTILITES = function(){
    
    //NOTE: THESE METHODS DO NOT WORK WITH OBJECTS
    //CREATED USING CUSTOM CONSTRUCTORS (UNLESS THEY SERIALIZE NICELY WITH toString() -method)
    var searchIndices = function(arr, sstring){
        var found = false;
        for(var i = 0; i < arr.length; ++i){
            var element = arr[i];
            if(element === null || element === undefined){
                continue;
            }
            else if($.isArray(element)){
                found = searchIndices(element, sstring);
                if(found){
                    break;
                }
            }
            else if($.isPlainObject(element)){
                found = searchProperties(element, sstring);
                if(found){
                    break;
                }
            }
            else if(element.toString().indexOf(sstring) !== -1){
                found = true;
                break;
            }
        }
        return found;
    };
    
    var searchProperties = function(obj, sstring){
        var found = false;
        for(var property in obj){
            if(obj.hasOwnProperty(property)){
                if(property.toString().indexOf(sstring) !== -1){
                    found = true;
                    break;
                }
                var element = obj[property];
                if(element === null || element === undefined){
                    continue;
                }
                else if($.isArray(element)){
                    found = searchIndices(element, sstring);
                    if(found){
                        break;
                    }
                }
                else if($.isPlainObject(element)){
                    found = searchProperties(element, sstring);
                    if(found){
                        break;
                    }
                }
                else if(element.toString().indexOf(sstring) !== -1){
                    found = true;
                    break;
                }
            }
        }
        return found;
    };
    
    var pub = {};
    
    pub.searchFromData = function(sstring, data){
        var containing = [];
        data.forEach(function(item){
           if(searchProperties(item, sstring)){
               containing.push(item);
           } 
        });
        return containing;
    };
    
    pub.findRelatedEvents = function(data, allevents){
        var related = [];

        data.forEach(function(item){
            for(var i = 0; i < item.related_events.length; ++i){
                for(var j = 0; j < allevents.length; ++j){
                    if(item.related_events[i] === allevents[j]._id){
                        related.push(allevents[j]);
                    }
                }
            }
        });
        return related;
    };

    pub.findRelatedStatechanges = function(data, allstatechanges){
        var related = [];
        data.forEach(function(item){
            for(var i = 0; i < item.related_events.length ; ++i){
                for(var j = 0; j < allstatechanges.length; ++j){
                    if(item.related_events[i] === allstatechanges[j]._id){
                        related.push(allstatechanges[j]);
                    }
                }
            }
        });
        return related;
    };
    
    //data = input
    pub.findRelatedConstructs = function(data, allconstructs){
        var related = [];
        data.forEach(function(item){
            for(var i = 0; i < item.related_constructs.length ; ++i){
                for(var j = 0; j < allconstructs.length; ++j){
                    if(item.related_constructs[i] === allconstructs[j]._id){
                        related.push(allconstructs[j]);
                    }
                }
            }
        });
        return related;
    };
    
    pub.findRelatedConstructs2 = function(data, allconstructs){
        var related = [];
        data.forEach(function(item){
            for(var i = 0; i < item.related_constructs.length ; ++i){
                for(var j = 0; j < allconstructs.length; ++j){
                    if(item.related_constructs[i] === allconstructs[j]._id){
                        if(allconstructs[j].type === "page" || allconstructs[j].type === "document"){
                            related.push(allconstructs[j]);
                        }
                    }
                }
            }
        });
        return related;
    };
    
    pub.filterSession = function(session, allconstructs, allstates, allevents){
        var related = {constructs: [], events: [], states: []};
    
        //Gets all docs and pages related to the user
        //var user = pub.findRelatedConstructs([session], allconstructs);
        
        related.constructs = pub.findRelatedConstructs2([session], allconstructs);
        //console.log("[processor_utilities]related:", related.constructs);
        
        //Add the session itself
        related.constructs.push(session);
        
        related.events = pub.findRelatedEvents(related.constructs, allevents);
        related.states = pub.findRelatedStatechanges(related.constructs, allstates);
        
        return related;
    };
    
    //data = ids, types
    pub.filterUserID = function(data, allconstructs, allstates, allevents){
        var related = {constructs: [], events: [], states: []};
        
        var ids = data.ids;
        var types = data.types;
        
        ids.forEach(function(userId){
            userId = userId.trim();
            //Find the constructs with correct user
            for(var k = 0; k < allconstructs.length ; ++k){
                var c;
                
                var tmpID = allconstructs[k].related_constructs[0]; //first related construct is user
                tmpID = tmpID.substring(20); //trim to last 4 digits
                
                if (tmpID === userId){
                    c = allconstructs[k];
                    related.constructs.push(c);
                                        
                    //Get events & state changes
                    for(var i = 0; i < c.related_events.length; ++i){
                        for(var j = 0; j < allevents.length; ++j){
                            if(c.related_events[i] === allevents[j]._id){
                                //console.log(types);
                                //Filter event types
                                if(types === false){
                                    related.events.push(allevents[j]);
                                
                                    if(allevents[j].isStatechange === true){
                                        related.states.push(allevents[j]);
                                    }
                                }else{
                                    types.forEach(function(type){
                                        if (allevents[j].type === type){
                                            related.events.push(allevents[j]);
                                
                                            if(allevents[j].isStatechange === true){
                                                related.states.push(allevents[j]);
                                            }
                                        }
                                    });
                                }
                            }
                        }
                    }
                }
            }
        });
        
        return related;
    };
    
    //data = types
    pub.filterNoID = function(types, allconstructs, allstates, allevents){
        var related = {constructs: [], events: [], states: []};
        
        for(var k = 0; k < allconstructs.length ; ++k){
            var c = allconstructs[k];
            related.constructs.push(c);
                                        
            //Get events & state changes
            for(var i = 0; i < c.related_events.length; ++i){
                for(var j = 0; j < allevents.length; ++j){
                    if(c.related_events[i] === allevents[j]._id){
                        types.forEach(function(type){
                            if (allevents[j].type === type){
                                related.events.push(allevents[j]);

                                if(allevents[j].isStatechange === true){
                                    related.states.push(allevents[j]);
                                }
                            }
                        });
                    }
                }
            }
        }
        
        return related;
    };
    
    return pub;
};
