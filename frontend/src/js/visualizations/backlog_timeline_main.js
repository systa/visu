
var BACKLOG_TIMELINE_MAIN = function(par){
//-----------------------------------------
//  DRAWING RELATED STUFF
//-----------------------------------------
    var _timeSelectorHeight = 40;
    //The left and right margin as well as width should be the same
    //for all the charts if we want to align the draw areas vertically  
    var _runtimeChartMargins = {top: 20, bottom: 2, left: 0, right: 0};
    var _timeSelectorMargins = {top: 20, bottom: 10, left: 0, right: 0};
    
    var _width = 0;
    var _height = 0;
    
    //Div positioning variables
    var _containerMargins = {top:10, left:60, right: 60};
    var _containerWidth = 0;
    
    //The chart objects will be here
    var _eventTimesChart = false;
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
            _runtimeChartMargins.top + _runtimeChartMargins.bottom +
            _timeSelectorMargins.top + _timeSelectorMargins.bottom +
            _containerMargins.top));
            
        container.style.position = "absolute";
        container.style.width = _containerWidth.toString() + "px";
        container.style.left = _containerMargins.left.toString() + "px";
        container.style.top = _containerMargins.top.toString() + "px";
        
        //Setting the size of charts
        if(_eventTimesChart !== false){
            //We should not exceed the total height
            var min = _eventTimesChart.getMinHeight();
            var height = _height*0.75;
            if(height < min){
                height = min;
            }
            _eventTimesChart.onResize(_width, height, _runtimeChartMargins);
        }
        if(_timeSelector !== false){
            _timeSelector.onResize(_width, _timeSelectorHeight, _timeSelectorMargins);
        }
    };
    
    var createLegend = function(){
        var scale = _eventTimesChart.getColorScale();
        var domain = scale.domain();
        var parent = document.getElementById("legendContainer");
        for(var i = 0; i < domain.length; ++i){
            var color = scale(domain[i]);
            _layout.appendLabel({bgcolor: color, text: domain[i]});
        }
    };
    
    //Initializes the chart template and draws the visualization.
    var initCharts = function(data, timeframe){
        var elements = _layout.createLayout();
        if(!timeframe){
            var date1 = new Date(data.timeframe[0]);
            var start = new Date(date1.getTime()+date1.getTimezoneOffset()*60*1000);
            var date2 = new Date(data.timeframe[1]);
            var end = new Date(date2.getTime()+date2.getTimezoneOffset()*60*1000);
            
            timeframe = [start, end];
        }
        
        _runtimeChartMargins.left = _layout.getSVGTextWidth(data.longestId)*2;
        _runtimeChartMargins.right = 5;
        _timeSelectorMargins.left =  _runtimeChartMargins.left;
        _timeSelectorMargins.right = _runtimeChartMargins.right;
        
        _eventTimesChart = BacklogTimeline({
            svg : elements.chartSVG,
            timeframe : timeframe,
            ids : data.ids,
            data : data.events,
            colors : ["PASS", "FAIL"],
            linear : false
        });

        var onBrush= function(timeRange){
            _eventTimesChart.onBrush(timeRange);
        };

        _timeSelector = TimeSelector({
            svg : elements.brushSVG,
            timeframe : timeframe,
            onBrushFunction : onBrush,
            linear : false
        });
        
        //createLegend();
        onResize();
        
        _layout.getSearchButton().addEventListener('click', function(){
            var input = _layout.getSearchTextField().value;
            input = input.trim();
            if(input.length !== 0){
                var events = _search.searchFromData(input, _events);
                var constructs = _search.searchFromData(input, _constructs);
                
                constructs = constructs.concat(_search.findRelatedConstructs(constructs, _constructs));
                constructs = constructs.concat(_search.findRelatedConstructs(events, _constructs));
                events = events.concat(_search.findRelatedEvents(constructs, _events));
                
                var parsed_data = _parser(constructs, events);
                
                _eventTimesChart.updateData({
                    ids : parsed_data.ids,
                    data : parsed_data.events
                });
            }/*empty string clear filtering*/
            else{
                _eventTimesChart.updateData({
                    ids : data.ids,
                    data : data.events
                });
            }
            //The chart should be resized as it has different amount of data
            onResize();
        });
        
        window.addEventListener('resize', onResize);

        document.getElementById("loader").style.display = "none";
        _layout.show();

        _timeSelector.draw();
        _eventTimesChart.draw();
    };
    
//-----------------------------------------
// DATA RELATED STUFF
//-----------------------------------------
    
    var p = par || {};
    
    var _mapping = p.mapping !== undefined ? p.mapping : false;
    var _filters = p.filters !== undefined ? p.filters : false;
    var _timeframe = false;
    if(_filters.startTime && _filters.endTime){
        //_filters already contains dates
        var st = new Date(_filters.startTime);
        var et = new Date(_filters.endTime);
        var start = new Date(st.getTime()+st.getTimezoneOffset()*60*1000);
        var end = new Date(et.getTime()+et.getTimezoneOffset()*60*1000);
        _timeframe = [start, end];
    }
    
    var _parser = BACKLOG_TIMELINE_PROCESSOR(_mapping);
    var _queryFilters = QUERY_UTILITIES().formatFilters(_filters);
    var _search = PROCESSOR_UTILITES();
    
    //Initializing the dataquery module for fetching the data
    var _query= DATA_QUERY();
    var _events = false;
    var _constructs = false;
    
    var whenLoaded = function(){
        if(_events && _constructs){
            var parsed_data = _parser(_constructs, _events);
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
    
    _query.getFilteredConstructs(_queryFilters.constructFilters,constructsLoaded);
    _query.getFilteredEvents(_queryFilters.eventFilters, eventsLoaded);
};

