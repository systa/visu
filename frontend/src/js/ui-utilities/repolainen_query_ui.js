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

var REPOLAINEN_QUERY_UI = function(states, callback){
   
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
        //console.log("[demo_query_ui]Debug onClick");
        
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
        filters.events = eventFilters;
        
        var constructFilters = {};
        filters.constructs = constructFilters;

        var mapping = {};
        
        var rowId = "source_id"; //document.getElementById("rowId").value;
        rowId = rowId.replace(/\s/g,'');
        if(rowId.length === 0){
            rowId = false;
        }
        mapping.rowId = rowId;
        var rowIdIsFromOrigin = true; //document.getElementById("rowIdIsFromOrigin").checked;
        if(!rowId){
            rowIdIsFromOrigin = false;
        }
        mapping.rowIdIsFromOrigin = rowIdIsFromOrigin;
        
        if(_states === "full"){
            var initial = parseStates("open, opened, to do, created, reopened"); // parseStates(document.getElementById("initial").value);
            var intermediate = parseStates("Ready to start, Doing Next, Doing, In review"); //parseStates(document.getElementById("intermediate").value);
            var resolution = parseStates("closed, resolved, done, fixed, cancelled, won't fix, won't do, cannot reproduce"); //parseStates(document.getElementById("resolution").value);
            mapping.states = {resolution : resolution, start : initial, intermediate : intermediate};
        }
        else if(_states === "limited"){
            var resolution =  parseStates("closed, resolved, done, fixed, cancelled, won't fix, won't do, cannot reproduce"); //parseStates(document.getElementById("resolution").value);
            mapping.states = {resolution : resolution};
        }
        
        document.getElementById("queryui").style.display = "none";
        document.getElementById("loader").style.display = "block";

        var tag = document.getElementById("tagging");
        if(tag !== null){
            filters.tag = parseTextValue(tag.value);
        }
       
        //console.log("[demo_query_ui]Callback");
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