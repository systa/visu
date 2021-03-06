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

var debug = true;

var ISSUE_TIMELINE_MAIN = function(par){
    console.log("[ISSUE_TIMELINE_MAIN]");
//-----------------------------------------
//  DRAWING RELATED STUFF
//-----------------------------------------
    var _timeSelectorHeight = 40;
    
    //The left and right margin as well as width should be the same
    //for all the charts if we want to align the draw areas vertically
    var _issueChartMargins = {top: 20, bottom: 4, left: 0, right: 0};
    var _timeSelectorMargins = {top: 20, bottom: 10, left: 0, right: 0};
    
    var _width = 0;
    var _height = 0;
    
    //Div positioning variables
    var _containerMargins = {top:60, left:60, right:60};
    var _containerWidth = 0;
    
    //The chart objects will be here
    var _issueChart = false;
    var _timeSelector = false;
    
    //Initializing the module that helps with cerating the HTML and SVG elements
    var _parent = document.getElementById("visuParent");
    var _layout = DEMO_TEMPLATE({parent: _parent});
    
    //Function for resize event
    var onResize = function(){
        var container = _layout.getContainer();

        _containerWidth = window.innerWidth-_containerMargins.left-_containerMargins.right;
        _width = _containerWidth;
        
        //The height that the two charts can use in maximum (total)
        _height = (window.innerHeight-(_timeSelectorHeight +
            _issueChartMargins.top + _issueChartMargins.bottom +
            _timeSelectorMargins.top + _timeSelectorMargins.bottom +
            _containerMargins.top));
            
        container.style.position = "absolute";
        container.style.width = _containerWidth.toString() + "px";
        container.style.left = _containerMargins.left.toString() + "px";
        container.style.top = _containerMargins.top.toString() + "px";
        
        //Setting the size of charts
        if(_issueChart !== false){
            //We should not exceed the total height
            var min = _issueChart.getMinHeight();
            var height = _height*0.75;
            if(height < min){
                height = min;
            }
            _issueChart.onResize(_width, height, _issueChartMargins);
        }
        if(_timeSelector !== false){
            _timeSelector.onResize(_width, _timeSelectorHeight, _timeSelectorMargins);
        }
    };
    
    
    var createLegend = function(types){
        var scale = _issueChart.getColorScale();
        for(var i = 0; i < types.length; ++i){
            var color = scale(types[i]);
            _layout.appendLabel({bgcolor: color, text: types[i]+" "});
        }
    };
    
    //Initializes the chart template and draws the visualization.
    var initCharts = function(data, timeframe){
        console.log("[ISSUE_TIMELINE_MAIN]initCharts", data);
        
        var elements = _layout.createLayout();
        
        if(!timeframe){
            timeframe = data.timeframe;
        }
        
        _issueChartMargins.left = _layout.getSVGTextWidth(data.longestId)+2;
        _issueChartMargins.right = _layout.getSVGTextWidth(data.longestType)+2;
        _timeSelectorMargins.left =  _issueChartMargins.left;
        _timeSelectorMargins.right = _issueChartMargins.right;
        
        _issueChart = EventTimeline({
            svg : elements.chartSVG,
            margins : _issueChartMargins,
            timeframe : timeframe,
            ids : data.ids,
            events : data.events,
            lifespans : data.lifespans,
            constructs : data.constructs,
            stateColors :   data.types,
            colorScale : d3.scale.category20c()
        });

        var onBrush= function(timeRange){
            _issueChart.onBrush(timeRange);
        };

        _timeSelector = TimeSelector({
            svg : elements.brushSVG,
            margins : _timeSelectorMargins,
            timeframe : timeframe,
            onBrushFunction : onBrush,
            linear: false
        });
        
        createLegend(data.types);
        onResize();
        
        _layout.getSearchButton().addEventListener('click', function(){
            var input = _layout.getSearchTextField().value;
            input = input.trim();
            if(input.length !== 0){
                var events = _search.searchFromData(input, _events);
                var states = _search.searchFromData(input, _states);
                var constructs = _search.searchFromData(input, _constructs);
                
                constructs = constructs.concat(_search.findRelatedConstructs(constructs, _constructs));
                constructs = constructs.concat(_search.findRelatedConstructs(events, _constructs));
                constructs = constructs.concat(_search.findRelatedConstructs(states, _constructs));
                events = events.concat(_search.findRelatedEvents(constructs, _events));
                states = states.concat(_search.findRelatedStatechanges(constructs, _states));
                
                var parsed_data = _parser(constructs, events, states);
                
                _issueChart.updateData({
                    ids : parsed_data.ids,
                    events : parsed_data.events,
                    lifespans : parsed_data.lifespans,
                    constructs : parsed_data.constructs
                });
            }//empty string clear filtering
            else{
                _issueChart.updateData({
                    ids : data.ids,
                    events : data.events,
                    lifespans : data.lifespans,
                    constructs : data.constructs
                });
            }
            //The chart should be resized as it has different amount of data
            onResize();
        });
        
        window.addEventListener('resize', onResize);

        document.getElementById("loader").style.display = "none";
        _layout.show();

        _timeSelector.draw();
        _issueChart.draw();
    };

//-----------------------------------------
// DATA RELATED STUFF
//-----------------------------------------

    //parsing the parameters from user to query data and select timeframe
    var p = par || {};
    
    var _mapping = p.mapping !== undefined ? p.mapping : false;
    
    var _filters = p.filters !== undefined ? p.filters : false;
    var _timeframe = false;
    if(_filters.startTime && _filters.endTime){
        _timeframe = [new Date(_filters.startTime), new Date(_filters.endTime)];
    }

    console.log("[ISSUE_TIMELINE_MAIN]Loading modules");
    
    var _parser = LIFSPAN_TIMELINE_PROCESSOR(_mapping);
    var _queryFilters = QUERY_UTILITIES().formatFilters(_filters);
    var _search = PROCESSOR_UTILITES();

    //Initializing the dataquery module for fetching the data
    var _query= DATA_QUERY();
    var _events = false;
    var _states = false;
    var _constructs = false;
    
    var whenLoaded = function(){
        if(_events && _constructs && _states){
            console.log("[ISSUE_TIMELINE_MAIN]Data for issue parser:", _constructs, _events, _states);
            var parsed_data = _parser(_constructs, _events, _states);
            initCharts(parsed_data, _timeframe);
        }
        return false;
    };
    
    var eventsLoaded = function(data){
        _events = data;
        console.log("[ISSUE_TIMELINE_MAIN]Events: ", _events);
        whenLoaded();
    };
    
    var constructsLoaded = function(data){
        _constructs = data;
        whenLoaded();
    };
    var statesLoaded = function(data){
        _states = data;
        console.log("[ISSUE_TIMELINE_MAIN]Statechanges: ", _states);
        whenLoaded();
    };
       
    console.log("[ISSUE_TIMELINE_MAIN]Query data:", _queryFilters);
    _query.getFilteredConstructs(_queryFilters.constructFilters, constructsLoaded);
    _query.getFilteredStatechanges(_queryFilters.eventFilters, statesLoaded);
    _query.getFilteredEvents(_queryFilters.eventFilters, eventsLoaded);
};
