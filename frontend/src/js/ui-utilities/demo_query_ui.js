/*
* Copyright (c) TUT Tampere University of Technology 2014-2015.
* All rights reserved.
* This software has been developed in Tekes-TIVIT project Need-for-Speed.
* All rule set in consortium agreement of Need-for-Speed project apply.
*
* Main authors: Antti Luoto, Anna-Liisa Mattila, Henri Terho
*/

var DEMO_QUERY_UI = function(states, callback){
   
    var _states = states;
    
    var parseStates = function(states){
        states = states.replace(/\s/g,'');
        if(states.length === 0){
            states = false;
        }
        else{
            states = states.split(",");
        }
        return states;
    };
    
    var parseTextValue = function(val){
        val = val.replace(/\s/g,'');
        if(val.length === 0){
            return false;
        }
        return val;
    };
    
    var onClick = function(){

        console.log("[demo_query_ui]Debug onClick");
        
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
        
        filters.context = parseTextValue(document.getElementById("context").value);
        filters.source = parseTextValue(document.getElementById("source").value);
        filters.source_id = parseTextValue(document.getElementById("source_id").value);
        
        var eventFilters = {};
        
        eventFilters.creator = parseTextValue(document.getElementById("eventCreator").value);
        eventFilters.type = parseTextValue(document.getElementById("eventType").value);
        //eventFilters.state = parseTextValue(document.getElementById("eventState").value);
        
        var evDuration = parseFloat(document.getElementById("eventDuration").value);
        if(isNaN(evDuration)){
            evDuration = false;
        }
        eventFilters.duration = evDuration;

        var evDate = parseTextValue(document.getElementById("eventDate").value);
        var evTime = parseTextValue(document.getElementById("eventTime").value);
        if(!evDate || !evTime){
            eventFilters.time = false;
        }
        else{
            eventFilters.time = new Date(evDate+"T"+evTime);
        }
        filters.events = eventFilters;
        
        var constructFilters = {};
        
        constructFilters.name = parseTextValue(document.getElementById("constructName").value);
        constructFilters.type = parseTextValue(document.getElementById("constructType").value);
        //constructFilters.state = parseTextValue(document.getElementById("constructState").value);
        var conDescription = document.getElementById("constructDescription").value;
        conDescription = conDescription.trim();
        if(conDescription.length === 0){
            conDescription = false;
        }
        constructFilters.description = conDescription;
        
        filters.constructs = constructFilters;

        var mapping = {};
        
        var rowId = document.getElementById("rowId").value;
        rowId = rowId.replace(/\s/g,'');
        if(rowId.length === 0){
            rowId = false;
        }
        mapping.rowId = rowId;
        var rowIdIsFromOrigin = document.getElementById("rowIdIsFromOrigin").checked;
        if(!rowId){
            rowIdIsFromOrigin = false;
        }
        mapping.rowIdIsFromOrigin = rowIdIsFromOrigin;
        
        if(_states === "full"){
            var initial = parseStates(document.getElementById("initial").value);
            var intermediate = parseStates(document.getElementById("intermediate").value);
            var resolution = parseStates(document.getElementById("resolution").value);
            mapping.states = {resolution : resolution, start : initial, intermediate : intermediate};
        }
        else if(_states === "limited"){
            var resolution = parseStates(document.getElementById("resolution").value);
            mapping.states = {resolution : resolution};
        }
        
        document.getElementById("queryui").style.display = "none";
        document.getElementById("loader").style.display = "block";

        console.log("[demo_query_ui]Callback");
        callback({filters:filters, mapping:mapping});
    };
    
    var _button = document.createElement("button");
    var _text = document.createTextNode("Visualize");
    
    var _class = document.createAttribute("class");  
    _class.value = "btn btn-primary btn-lg btn-block";
    _button.setAttributeNode(_class);
    _button.appendChild(_text);

    _button.addEventListener("click", onClick);
    document.getElementById("buttonplacer").appendChild(_button);
};