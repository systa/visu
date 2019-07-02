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
    var _amountChartMargins = {top: 40, bottom: 20, left: 20, right: 40};
    var _timeSelectorMargins = {top: 20, bottom: 10, left: 20, right: 40};
    
    var _width = 0;
    var _height = 0;
    
    //Div positioning variables
    var _containerMargins = {top:10, left:60, right:60};
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
    
    //Initializes the chart template and draws the visualization.
    var initCharts = function(data, timeframe){

        if (debug) {
            console.log("[amout_chart_main]Data for initCharts:", data);
        }
        
        var elements = _layout.createLayout([
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
        console.log("[amout_chart_main]Init data:", p);
    }
    
    var _mapping = p.mapping !== undefined ? p.mapping : false;
    
    var _filters = p.filters !== undefined ? p.filters : false;
    var _timeframe = false;
    if(_filters.startTime && _filters.endTime){
        _timeframe = [new Date(_filters.startTime), new Date(_filters.endTime)];
    }
    
    var _parser = AMOUNT_CHART_PROCESSOR(_mapping);
    var _queryFilters = QUERY_UTILITIES().formatFilters(_filters);
    var _search = PROCESSOR_UTILITES();

    //Initializing the dataquery module for fetching the data
    var _query= DATA_QUERY();
    var _events = false;

    var eventsLoaded = function(data){
        _events = data;
        var parsed_data = _parser(_events);
        initCharts(parsed_data, _timeframe);
        return false;
    };
    
    _query.getFilteredEvents(_queryFilters.eventFilters, eventsLoaded);
};