/*
* Copyright (c) TUT Tampere University of Technology 2014-2015.
* All rights reserved.
* This software has been developed in Tekes-TIVIT project Need-for-Speed.
* All rule set in consortium agreement of Need-for-Speed project apply.
*
* Main authors: Antti Luoto, Anna-Liisa Mattila, Henri Terho
*/

var USER_TIMEFRAME_MAIN = function(par){
//-----------------------------------------
//  DRAWING RELATED STUFF
//-----------------------------------------
    //console.log("user_timeframe_main");
   
    var _timeSelectorHeight = 50;
    
    //The left and right margin as well as width should be the same
    //for all the charts if we want to align the draw areas vertically
    var _mainChartMargins = {top: 20, bottom: 4, left: 50, right: 50};
    var _timeSelectorMargins = {top: 20, bottom: 10, left: 50, right: 50};
    
    var _width = 0;
    var _height = 0;
    
    //Div positioning variables
    var _containerMargins = {top:10, left:60, right:60};
    var _containerWidth = 0;
    
    //The chart objects will be here
    var _eventChart = false;    //Shows events related to session
    var _docChart = false;      //Shows documents used during session
    var _pageChart = false;     //Shows pages opened during session
    var _timeSelector = false;
    var _dataSelector = false;
    
    var _currentSession = false;
    
    //Initializing the module that helps with cerating the HTML and SVG elements
    var _layout = USER_TEMPLATE();
    
    //Function for resize event
    var onResize = function(){
        var container = _layout.getContainer();
        _containerWidth = window.innerWidth-_containerMargins.left-_containerMargins.right;
        _width = _containerWidth;
        //The height that the two charts can use in maximum (total)
        _height = (window.innerHeight-(_timeSelectorHeight +
            _mainChartMargins.top + _mainChartMargins.bottom +
            _timeSelectorMargins.top + _timeSelectorMargins.bottom +
            _containerMargins.top));
        container.style.position = "absolute";
        container.style.width = _containerWidth.toString() + "px";
        container.style.left = _containerMargins.left.toString() + "px";
        container.style.top = _containerMargins.top.toString() + "px";
        //Setting the size of charts
        if(_mainChart !== false){
            //We should not exceed the total height
            var min = _mainChart.getMinHeight();
            var height = _height*0.75;
            if(height < min){
                height = min;
            }
            _mainChart.onResize(_width, height, _mainChartMargins);
        }
        if(_timeSelector !== false){
            _timeSelector.onResize(_width, _timeSelectorHeight, _timeSelectorMargins);
        }
    };
    
    //Legend on top of visu
    var createLegend = function(types){
        //console.log("[user_timeframe_main]Appending labels");
        var scale = _mainChart.getColorScale2();
        for(var i = 0; i < types.length; ++i){
            var color = scale(types[i]);
            _layout.appendLabel({bgcolor: color, text: types[i]+" "});
        }
    };
    
    var updateData = function(){
        /* TODO: Select constructs related to the session
         * That is: the session itself, and the pages/docs linked to the session */
        _currentSession = _dataSelector.getSession();
        console.log("[user_timeframe_main]onSessionChange: ", _currentSession);

        var res = _search.filterSession(_currentSession, _constructs, _states, _events);

        var parsed_data = _parser(res.constructs, res.events, res.states);

        console.log("[user_timeframe_main]Parsed & Filtered:", parsed_data);

        _mainChart.updateData({
            ids : parsed_data.ids,
            events : parsed_data.events,
            lifespans : parsed_data.lifespans,
            constructs : parsed_data.constructs,
            timeframe : parsed_data.timeframe
        });

        _timeSelector.changeDomain(parsed_data.timeframe);
    };
    
    //Initializes the chart template and draws the visualization.
    var initCharts = function(data, timeframe){
        //console.log("[user_timeframe_main]initChart function");
        var elements = _layout.createLayout();
        
        if(!timeframe){
            timeframe = data.timeframe;
        }
        
        _mainChartMargins.left = _layout.getSVGTextWidth(data.longestId)+12;
        _mainChartMargins.right = 60; //_layout.getSVGTextWidth(data.longestUser)+12;
        _timeSelectorMargins.left =  _mainChartMargins.left;
        _timeSelectorMargins.right = _mainChartMargins.right;
        
        console.log("[user_timeframe_main]DataSelector");
        _dataSelector = DataSelector({
            users : data.constructs.users,
            sessions : data.constructs.sessions,
            onSessionChange : updateData
        });
        _dataSelector.draw();

        console.log("[user_timeframe_main]UserTimeframe");
        _mainChart = UserTimeframe({
            svg : elements.chartSVG,
            margins : _mainChartMargins,
            timeframe : timeframe,
            ids : data.ids,
            names : data.names,
            events : data.events,
            lifespans : data.lifespans,
            constructs : data.constructs,
            stateColors :   data.types,
            colorScale : d3.scale.category20c(),
            displayTypes : true
        });

        var onBrush= function(timeRange){
            _mainChart.onBrush(timeRange);
        };

        console.log("[user_timeframe_main]TimeSelector");
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
        
        window.addEventListener('resize', onResize);

        document.getElementById("loader").style.display = "none";
        
        _layout.show();
        
        //Draws the time selector from time_selector.js
        _timeSelector.draw();
        
        //Draws the main chart from user_timeframe.js
        _mainChart.draw();
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
         //Filters based on time
        _timeframe = [+(new Date(_filters.startTime)), +(new Date(_filters.endTime))];
    }
    
    _mapping.anonymize = true;
    var _parser = USER_TIMEFRAME_PROCESSOR(_mapping);
    var _queryFilters = QUERY_UTILITIES().formatFilters(_filters);
    var _search = PROCESSOR_UTILITES();

    //Initializing the dataquery module for fetching the data
    var _query = DATA_QUERY();
    var _events = false;
    var _states = false;
    var _constructs = false;

    var whenLoaded = function(){
        if(_events && _constructs && _states){
            try{
                var parsed_data = _parser(_constructs, _events, _states);
            }catch(e1){
                console.log("[user_timeframe_main]Error1: ", e1);
            }
            console.log("[user_timeframe_main]Parsed Data: ", parsed_data);
            
            try{
                initCharts(parsed_data, _timeframe); //timeframe of the filters
                console.log("[user_timeframe_main]Current session:", _currentSession);
                
            }catch(e2){
                console.log("[user_timeframe_main]Error2: ", e2);
            }
            
            updateData();
            onResize();
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
 