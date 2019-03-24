/*
* Copyright (c) TUT Tampere University of Technology 2014-2015.
* All rights reserved.
* This software has been developed in Tekes-TIVIT project Need-for-Speed.
* All rule set in consortium agreement of Need-for-Speed project apply.
*
* Main authors: Antti Luoto, Anna-Liisa Mattila, Henri Terho
*/

var SESSION_TIMEFRAME_MAIN = function(par){
//-----------------------------------------
//  DRAWING RELATED STUFF
//-----------------------------------------
    console.log("session_timeframe_main");
   
    var _timeSelectorHeight = 50;
    
    //The left and right margin as well as width should be the same
    //for all the charts if we want to align the draw areas vertically
    var _issueChartMargins = {top: 20, bottom: 4, left: 50, right: 50};
    var _timeSelectorMargins = {top: 20, bottom: 10, left: 50, right: 50};
    
    var _width = 0;
    var _height = 0;
    
    //Div positioning variables
    var _containerMargins = {top:10, left:60, right:60};
    var _containerWidth = 0;
    
    //The chart objects will be here
    var _issueChart = false;
    var _timeSelector = false;
    
    //Initializing the module that helps with cerating the HTML and SVG elements
    var _layout = SESSION_TEMPLATE();
    
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
    
    //Legend on top of visu
    var createLegend = function(types){
        var scale = _issueChart.getColorScale();
        for(var i = 0; i < types.length; ++i){
            var color = scale(types[i]);
            _layout.appendLabel({bgcolor: color, text: types[i]+" "});
        }
    };
    
    //Initializes the chart template and draws the visualization.
    var initCharts = function(data, timeframe){
        var elements = _layout.createLayout();
        
        if(!timeframe){
            timeframe = data.timeframe;
        }
        
        _issueChartMargins.left = _layout.getSVGTextWidth(data.longestId)+12;
        _issueChartMargins.right = 60; //_layout.getSVGTextWidth(data.longestUser)+12;
        _timeSelectorMargins.left =  _issueChartMargins.left;
        _timeSelectorMargins.right = _issueChartMargins.right;
        
        _issueChart = SessionTimeframe({
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
            linear: false,
            customTime: false
        });
        
        createLegend(data.types);
        onResize();
        
        //Search button used to filter by user ID
        _layout.getSearchButton().addEventListener('click', function(){
            var result = _layout.getSearchTextField();
            var input = result.userid.value;
            var input2 = result.type.value;
            
            console.log("[processor_utilities]inputs:", input, input2);
            
            if(input.length !== 0 || input2.length !== 0){
                input = input.length !== 0 ? input.trim().split(',') : false;
                input2 = input2.length !== 0 ? input2.trim().split(',') : false;
                
                //Force display of start/end
                if(input2){
                    input2[input2.length] = "start/end";
                }
                
                var res; 
                if(input){
                    var filters = {ids: input, types: input2};
                    res = _search.filterUserID(filters, _constructs, _states, _events);
                }else{
                    res = _search.filterNoID(input2, _constructs, _states, _events);
                }
                var parsed_data = _parser(res.constructs, res.events, res.states);
                console.log("[processor_utilities]Parsed & Filtered:", parsed_data);
                
                _issueChart.updateData({
                    ids : parsed_data.ids,
                    events : parsed_data.events,
                    lifespans : parsed_data.lifespans,
                    constructs : parsed_data.constructs
                });
                
            }//empty string clear filtering
            else{
                var parsed_data = _parser(_constructs, _events, _states);
                console.log("[processor_utilities]Parsed:", parsed_data);
                
                _issueChart.updateData({
                    ids : parsed_data.ids,
                    events : parsed_data.events,
                    lifespans : parsed_data.lifespans,
                    constructs : parsed_data.constructs
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
    
    console.log("[session_timeframe_main]mappings: ", _mapping);
    console.log("[session_timeframe_main]filters: ", _filters);
    
    var _timeframe = false;
    if(_filters.startTime && _filters.endTime){
         //Filters based on time
        _timeframe = [+(new Date(_filters.startTime)), +(new Date(_filters.endTime))];
    }
    
    _mapping.anonymize = true;
    var _parser = SESSION_TIMEFRAME_PROCESSOR(_mapping);
    var _queryFilters = QUERY_UTILITIES().formatFilters(_filters);
    var _search = PROCESSOR_UTILITES();

    //Initializing the dataquery module for fetching the data
    var _query= DATA_QUERY();
    var _events = false;
    var _states = false;
    var _constructs = false;
    
    var whenLoaded = function(){
        if(_events && _constructs && _states){
            var parsed_data = _parser(_constructs, _events, _states);
           
           console.log("[session_timeframe_main]Parsed Data: ", parsed_data);
                      
            try{
                initCharts(parsed_data, _timeframe); //timeframe of the filters
            }catch(e){
                console.log(e);
            }
        }
        return false;
    };
    
    var eventsLoaded = function(data){
        _events = data;
        whenLoaded();
    };
    
    var constructsLoaded = function(data){
        _constructs = data;
        whenLoaded();
    };
    var statesLoaded = function(data){
        _states = data;
        whenLoaded();
    };
       
    _query.getFilteredConstructs(_queryFilters.constructFilters, constructsLoaded);
    _query.getFilteredStatechanges(_queryFilters.eventFilters, statesLoaded);
    _query.getFilteredEvents(_queryFilters.eventFilters, eventsLoaded);
};
 