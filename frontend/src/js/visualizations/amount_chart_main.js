/*
* Copyright (c) TUT Tampere University of Technology 2014-2015.
* All rights reserved.
* This software has been developed in Tekes-TIVIT project Need-for-Speed.
* All rule set in consortium agreement of Need-for-Speed project apply.
*
* Main authors: Antti Luoto, Anna-Liisa Mattila, Henri Terho
*/

var debug = true;

var AMOUNT_CHART_MAIN = function(par){
//-----------------------------------------
//  DRAWING RELATED STUFF
//-----------------------------------------
    var _timeSelectorHeight = 40;
    
    //The left and right margin as well as width should be the same
    //for all the charts if we want to align the draw areas vertically
    var _amountChartMargins = {top: 40, bottom: 20, left: 20, right: 140};
    var _timeSelectorMargins = {top: 20, bottom: 10, left: 20, right: 140};
    
    var _width = 0;
    var _height = 0;
    
    //Div positioning variables
    var _containerMargins ={top:60, left:60, right:60};
    var _containerWidth = 0;
    
    //The chart objects will be here
    var _amountChart = false;
    var _timeSelector = false;
    
    //Initializing the module that helps with cerating the HTML and SVG elements
    var _layout = DEMO_TEMPLATE();
    
    //Function for resize event
    var onResize = function(){
        var container = _layout.getContainer();

        _containerWidth = window.innerWidth-_containerMargins.left-_containerMargins.right;
        _width = _containerWidth;
        
        //The height that the two charts can use in maximum (total)
        _height = (window.innerHeight-(_timeSelectorHeight +
            _amountChartMargins.top + _amountChartMargins.bottom +
            _timeSelectorMargins.top + _timeSelectorMargins.bottom +
            _containerMargins.top));
            
        container.style.position = "absolute";
        container.style.width = _containerWidth.toString() + "px";
        container.style.left = _containerMargins.left.toString() + "px";
        container.style.top = _containerMargins.top.toString() + "px";
        
        //Setting the size of charts
        if(_amountChart !== false){
            //We should not exceed the total height
            var height = _height*0.75;
            _amountChart.onResize(_width, height, _amountChartMargins);
        }
        if(_timeSelector !== false){
            _timeSelector.onResize(_width, _timeSelectorHeight, _timeSelectorMargins);
        }
    };

    var createLegend = function(types){
        var scale = _amountChart.getColorScale();
        for(var i = 0; i < types.length; ++i){
            var color = scale(types[i]);
            _layout.appendLabel({bgcolor: color, text: types[i]+" "});
        }
    };
    
    //Initializes the chart template and draws the visualization.
    var initCharts = function(data, timeframe){

        if (debug) {
            console.log("[AMOUNT_CHART_MAIN]Data for initCharts:", data);
        }
        
        var elements = _layout.createLayout([
            {
                parameters : {},
                type : "legend"
            },
            {
                parameters : {},
                type : "brush"
            },
            {
                parameters : {},
                type : "chart"
            }
            
        ]);
        
        if(!timeframe){
            timeframe = data.timeframe;
        }
        
        _amountChart = AmountChart({
            svg : elements.chartSVG,
            margins : _amountChartMargins,
            timeframe : timeframe,
            max : data.max,
            min : data.min,
            amounts : data.amounts
        });

        createLegend(data.tags);

        var onBrush= function(timeRange){
            _amountChart.onBrush(timeRange);
        };

        _timeSelector = TimeSelector({
            svg : elements.brushSVG,
            margins : _timeSelectorMargins,
            timeframe : timeframe,
            onBrushFunction : onBrush,
            linear: false
        });
        
        onResize();
        window.addEventListener('resize', onResize);

        document.getElementById("loader").style.display = "none";
        _layout.show();

        _timeSelector.draw();
        _amountChart.draw();
    };

//-----------------------------------------
// DATA RELATED STUFF
//-----------------------------------------

    //parsing the parameters from user to query data and select timeframe
    var p = par || {};

    if (debug) {
        console.log("[AMOUNT_CHART_MAIN]Init data:", p);
    }
    
    var _mapping = p.mapping !== undefined ? p.mapping : false;
    
    var _filters = p.filters !== undefined ? p.filters : false;
    var _timeframe = false;
    if(_filters.startTime && _filters.endTime){
        _timeframe = [new Date(_filters.startTime), new Date(_filters.endTime)];
    }
    
    console.log("[AMOUNT_CHART_MAIN]Data for parer:", _mapping, _filters, _timeframe);

    var _parser;
    if(_filters.tag === 'state'){
        _parser = STATES_CHART_PROCESSOR(_mapping);
    }else{
        _parser = AMOUNT_CHART_PROCESSOR(_mapping);
    }

    var _queryFilters = QUERY_UTILITIES().formatFilters(_filters);
    var _search = PROCESSOR_UTILITES();

    //Initializing the dataquery module for fetching the data
    var _query= DATA_QUERY();
    var _events = false;
    var _states = false;
    var _constructs = false;
    
    var whenLoaded = function(){
        if(_events && _constructs && _states){
            console.log("[AMOUNT_CHART_MAIN]Data for parer:", _constructs, _events, _states);
            var parsed_data = _parser(_events, _constructs, _states, _filters.tag); //assigned, label

            if (debug) {
                console.log("[AMOUNT_CHART_MAIN]Parsed data", parsed_data);
            }
            initCharts(parsed_data, _timeframe);
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