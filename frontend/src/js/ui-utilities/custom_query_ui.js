/*
* Copyright (c) TUT Tampere University of Technology 2014-2015.
* All rights reserved.
* This software has been developed in Tekes-TIVIT project Need-for-Speed.
* All rule set in consortium agreement of Need-for-Speed project apply.
*
* Main authors: Antti Luoto, Anna-Liisa Mattila, Henri Terho
*/

var CUSTOM_QUERY_UI = function(callback){
   
    var parseTextValue = function(val){
        val = val.replace(/\s/g,'');
        if(val.length === 0){
            return false;
        }
        return val;
    };
    
    var onClick = function(){
        
        var filters = {};
        
        var startDate = parseTextValue(document.getElementById("startDate").value);
        var startTime = parseTextValue(document.getElementById("startTime").value);
        if(startDate !== false && startTime !== false){
            filters.startTime = new Date(startDate+"T"+startTime);
        }
        else{
            filters.startTime = startDate;
        }
        
        var endDate = parseTextValue(document.getElementById("endDate").value);
        var endTime = parseTextValue(document.getElementById("endTime").value);
        if(endDate !== false && endTime !== false){
            filters.endTime = new Date(endDate+"T"+endTime);
        }
        else{
            filters.endTime = endDate;
        }
        
        filters.context = false; 
        filters.source = parseTextValue(document.getElementById("source").value);
        filters.source_id = parseTextValue(document.getElementById("source_id").value);
        
        var eventFilters = {};
        
        eventFilters.creator = false;
        eventFilters.type = false; 
        eventFilters.duration = false; 

        eventFilters.time = false;
        filters.events = eventFilters;
        
        var constructFilters = {};
        
        constructFilters.name = false; 
        constructFilters.type = "session"; 
        constructFilters.description = false; 
        
        filters.constructs = constructFilters;

        var mapping = {};
        
        mapping.rowId = "source_id"; 
        mapping.rowIdIsFromOrigin = true; 
        mapping.states = {resolution : ["(session)closed"]};
        
        document.getElementById("queryui").style.display = "none";
        var loading = document.createTextNode("LOADING");
        document.getElementById("loader").appendChild(loading);
        callback({filters:filters, mapping:mapping});
    };
    
    var _button = document.createElement("button");
    var _text = document.createTextNode("visualize");
    _button.appendChild(_text);
    
    _button.addEventListener("click", onClick);
    document.getElementById("queryui").appendChild(_button);
};