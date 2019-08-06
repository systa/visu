/*
* Copyright (c) TUT Tampere University of Technology 2014-2015.
* All rights reserved.
* This software has been developed in Tekes-TIVIT project Need-for-Speed.
* All rule set in consortium agreement of Need-for-Speed project apply.
*
* Main authors: Antti Luoto, Anna-Liisa Mattila, Henri Terho
*/

//Stacked timeline visualization component
/*PARAMETERS:
    svg         : svg element where the visualization is rendered wrapped with d3
    linear: wether x-axis is linear numerical scale or time scale, default value is linear numerical scale
    width       : the width of the svg
    height      : the height of the svg
    margins     : how much space should be leaved for drawing labels and stuff (left, right),
                    how much room we leave for scale (top) and how much whitespace we leave at the bottom.
    timeframe   : value range of x-domain == array containing start time and end time of the range. If linear scale is used
                    the values should be numerical values.
    colors      : array that contains all state values that are mapped to colors
    ids         : id data used in y-axis, an array that defines the value range of y-axis. should contain each value of y-axis no more than once.
                    This is formed by the data processor.
    data        : event data formed by the data processor.
    lifespans   : lifespan data formed by the data processor.
    states      : status data formed by the data processor. 
*/
var DurationChart = function(par){
    var p = par || {};
    
    var _svg  = p.svg !== undefined ? p.svg : false;
    if(!_svg){
        console.log("SVG parameter is mandatory for the duration timeline!");
        return false;
    }
    
    var _width = p.width !== undefined ? p.width : 256;
    var _height = p.height !== undefined ? p.height : 32;
    var _margins = p.margins !== undefined ? p.margins : {top: 0, bottom : 0, left: 0, right: 0};
    
    var _xDomain = p.timeframe !== undefined ? p.timeframe : [0, 1000];
    var _linear = p.linear !== undefined ? p.linear : true;
    
    var _colorDomain = p.colors !== undefined ? p.colors : [];
    var _yDomain = p.ids !== undefined ? p.ids : [];
    
    var _durationData = p.data !== undefined ? p.data : [];
    
    /* Status data can be left out by setting the parameter to false or passing an empty array. 
    * Could also be used to display construct type instead of state (see issue timeline visu)
    * with minimal modifications
    */
    var _stateData = p.constructs !== undefined ? p.constructs : false;
    
    if (debug){
        console.log("[duration_timeline]Data (durations, states):", _durationData, _stateData);
    }
    
    var _range = 0;
    var _timeScale;
    //dynamic scale for showing timeframe
    if(_linear){
        _range = _xDomain[1]-_xDomain[0];
        _timeScale = d3.scale.linear().domain([0, _range]);
    }
    else{
        _timeScale = d3.time.scale().domain(_xDomain);
    }
    _timeScale.range([_margins.left, _width-_margins.right]);
    
    //the tick size is negative because the orient of the axis is top. This reverts the axis...
    var _timeAxis = d3.svg.axis().orient("top").scale(_timeScale).tickSize(-_height+_margins.top+_margins.bottom);

    //building ordinal scale for test sets based on the build id
    var _scaleY = d3.scale.ordinal().rangeBands([_margins.top, _height-_margins.bottom]).domain(_yDomain);

    //calculaiting height for one row now that we know how many rows we will have
    var _rowHeight = ((_height-_margins.bottom-_margins.top)/_yDomain.length);
    var _minRowHeight = 15;
    var _maxRowHeight = 30;
    if(_rowHeight < _minRowHeight){
        _rowHeight = _minRowHeight;
    }
    else if(_rowHeight > _maxRowHeight){
        _rowHeight = _maxRowHeight;
    }
    _height = (_rowHeight * _yDomain.length) + _margins.bottom+_margins.top;

    //building color scale
    var _colorScale = d3.scale.category10().domain(_colorDomain);
    //In SVG the draw order is reverse order of defining the nodes
    
    //Y-axis is constructed from rect and text SVG-elements. d3 axis is not used.
    //the _bgGroup, _bg and _names are the "Y-axis" graphical presentation.
    var _bgGroup = _svg.append("g");
    var _bg = _bgGroup.selectAll("rect").data(_yDomain).enter().append("rect");
    var _names = _bgGroup.selectAll("text").data(_yDomain).enter().append("text");
    
    //Status group is related to the "Y-axis". It shows the status of the test if it failed or passed.
    if(_stateData !== false){
        var _stateGroup = _svg.append("g");
        var _states = _stateGroup.selectAll("rect").data(_stateData).enter().append("rect");
        var _labels = _stateGroup.selectAll("text").data(_stateData).enter().append("text");
    }

    //Defining the data!
    //The actual runtimes of the tests are bound to rectangular elements here.
    var _timeGroup = _svg.append("g");
    var _runtimes = _timeGroup.selectAll("rect").data(_durationData).enter().append("rect");
    
    var _xAxisGrpahic = _svg.append("g").attr("class", "x axis");
    
    var _tooltip = d3.select("#tooltipC");
    
    //Helper function for data mapping
    //maps data.state to color scale used.
    var getColor = function(data){
        if(data.isStatechange){
            return _colorScale(data.statechange.to);
        }
        else{
            return "#000000";
        }
        
    };
    
    //Returns the state text from data
    var getStatusLabel = function(data){
        return data.state;
    };
  
    //Gets the timeline bars start point
    //The start point is the x-coordinate of the runtime bar
    var getStart = function(data){
        var domain = _timeScale.domain();

        //http://stackoverflow.com/questions/6525538/convert-utc-date-time-to-local-date-time-using-javascript
        var date = new Date(data.time);
        var start = new Date(date.getTime()+date.getTimezoneOffset()*60*1000);
        var end;
        
        if(_linear){
            start =  start.getTime() - _xDomain[0];
            end = start+parseInt(data.duration);
        }
        else{
            end = new Date(start.getTime()+parseInt(data.duration));
        }
        
        //if end is false...
        //data endpoint is mapped to the domain end point
        if(!end){
            end = domain[domain.length-1];
        }

        //clipping the coordinates to brush selection
        if(start <= domain[0] && end >= domain[0]){
            start = domain[0];
        }
        else if(start < domain[0] && end < domain[0]){
            return -1;
        }

        return _timeScale(start);
    };
      
    //Gets the timeline bars width
    //The return value is the width of runtime bar
    var getWidth = function(data){

        // Only show events that have a duration (it's called duration timeline for a reason)
        if(data.duration === 0){
            return 0;
        }

        var domain = _timeScale.domain();
        
        var date = new Date(data.time);
        var start = new Date(date.getTime()+date.getTimezoneOffset()*60*1000);
        var end;
        
        if(_linear){
            start =  start.getTime() - _xDomain[0];
            end = start+parseInt(data.duration);
        }
        else{
            end = new Date(start.getTime()+parseInt(data.duration)*1000);
        }

        //if end is false...
        //data endpoint is mapped to the domain end point
        if(!end){
            end = domain[domain.length-1]; 
        }
        //If the start date is not in the selection range we draw nothing.
        if(start > domain[domain.length-1] || end < domain[0]){
            return 0;
        }
        //clipping the bar to the current selection
        if(start <= domain[0] && end >= domain[0]){
            start = domain[0];
        }
        if(end >= domain[domain.length-1] && start <= domain[domain.length-1]){
            end = domain[domain.length-1];
        }
        var w = _timeScale(end)-_timeScale(start);

        return w ;
    };
  
    //Gets the data row based on buildId
    var getY = function(data){
        return _scaleY(data.rowId);
    };
    
    var onMouseOver = function(data){
        var dispstring = "";
        for(var atr in data){
            if(data.hasOwnProperty(atr)){
                if(!$.isPlainObject(data[atr]) && !$.isArray(data[atr])){
                    dispstring += atr+": "+data[atr].toString()+"</br>";
                }
            }
        }
        if(data.isStatechange){
            dispstring += "status: " + data.statechange.to.toString()+"</br>";
        }
        _tooltip.html(dispstring);
        return _tooltip.style("visibility", "visible");
    };
    
    var onMouseMove = function(data){
        return _tooltip.style("top", (event.pageY-30)+"px").style("left",(event.pageX+15)+"px");
    };
    
    var onMouseOut = function(data){
        return _tooltip.style("visibility", "hidden");
    };

    //public methods
    var pub = {};
    
    pub.clear = function(){
        _svg.selectAll("*").remove();
    };
    
    pub.draw = function(){

        //background and y-axis
        _bg.attr('fill', "#FCFCFC")
            .attr('x', 0)
            .attr('width', _width-_margins.right)
            .attr('y', function(d){return _scaleY(d);})
            .attr('height', _rowHeight);

        _names.attr('x', 2)
            .attr('y', function(d){return _scaleY(d)+_rowHeight*0.75;})
            .text(function(d){return d.toString();});
        
        //test _runtimes
        _runtimes.attr('fill', getColor)
            .attr('x', getStart)
            .attr('width',getWidth)
            .attr('y', getY)
            .attr('height', _rowHeight*0.9)
            .on("mouseover", onMouseOver)
            .on("mousemove", onMouseMove)
            .on("mouseout", onMouseOut);

        //state data
        if(_stateData !== false){
            _states.attr('fill', getColor)
                .attr('x', _width-_margins.right)
                .attr('width', _margins.right)
                .attr('y', getY)
                .attr('height', _rowHeight)
                .on("mouseover", onMouseOver)
                .on("mousemove", onMouseMove)
                .on("mouseout", onMouseOut);
                
            _labels.attr('x', _width-_margins.right)
                .attr('y', function(d){return getY(d)+_rowHeight*0.75;})
                .text(getStatusLabel)
                .on("mouseover", onMouseOver)
                .on("mousemove", onMouseMove)
                .on("mouseout", onMouseOut);
        }
        //x-axis
        _xAxisGrpahic.attr("transform", "translate(0,"+(_margins.top)+")")
            .call(_timeAxis)
            .selectAll(".tick text")
            .style("text-anchor", "start");
    };
    
    pub.onBrush = function(timeRange){
        _timeScale.domain(timeRange);        
        pub.draw();
    };
    
    pub.onResize = function(width, height, margins){
        _width = width;
        _height = height;
        _margins = margins;
        
        _rowHeight = ((_height-_margins.bottom-_margins.top)/_yDomain.length);
        if(_rowHeight < _minRowHeight){
            _rowHeight = _minRowHeight;
        }
        else if(_rowHeight > _maxRowHeight){
            _rowHeight = _maxRowHeight;
        }
        _height = (_rowHeight * _yDomain.length) + _margins.bottom+_margins.top;
        
        _timeScale.range([_margins.left, _width-_margins.right]);
        _timeAxis.tickSize(-_height+_margins.top+_margins.bottom);
        _scaleY.rangeBands([_margins.top, _height-_margins.bottom]);
        
        _svg.attr("width", _width);
        _svg.attr("height", _height);
        
        pub.draw();
    };
    
    pub.getMinHeight = function(){
       return _rowHeight*_yDomain.length+_margins.top+_margins.bottom;
    };
    
    pub.getColorScale = function(){
       return _colorScale; 
    };
    
    pub.updateData = function(ud){
        //Clear the chart before new bindings
        pub.clear();
        
        var u = ud || {};
        
        _xDomain = u.timeframe !== undefined ? u.timeframe : _xDomain;
        _linear = u.linear !== undefined ? u.linear : _linear;
        
        _yDomain = u.ids !== undefined ? u.ids : _yDomain;
        _durationData = u.data !== undefined ? u.data : _durationData;
        //status data can be left out by setting the parameter to false or passing an empty array.
        _stateData = u.statuses !== undefined ? u.statuses : _stateData;
        
        //Updating scales and axis
        if(_linear){
            _range = _xDomain[1]-_xDomain[0];
            _timeScale = d3.scale.linear().domain([0, _range]);
        }
        else{
            _timeScale = d3.time.scale().domain(_xDomain);
        }
        _timeScale.range([_margins.left, _width-_margins.right]);
        _timeAxis.scale(_timeScale);
        
        _scaleY.rangeBands([_margins.top, _height-_margins.bottom]).domain(_yDomain);
        _rowHeight = ((_height-_margins.bottom-_margins.top)/_yDomain.length);
        if(_rowHeight < _minRowHeight){
            _rowHeight = _minRowHeight;
        }
        else if(_rowHeight > _maxRowHeight){
            _rowHeight = _maxRowHeight;
        }
        _height = (_rowHeight * _yDomain.length) + _margins.bottom+_margins.top;
        
        //Updating the data bindings
        
        //Y-axis is constructed from rect and text SVG-elements. d3 axis is not used.
        //the _bgGroup, _bg and _names are the "Y-axis" graphical presentation.
        _bgGroup = _svg.append("g");
        _bg = _bgGroup.selectAll("rect").data(_yDomain).enter().append("rect");
        _names = _bgGroup.selectAll("text").data(_yDomain).enter().append("text");
        
        //Status group is related to the "Y-axis". It shows the status of the test if it failed or passed.
        if(_stateData !== false){
            _stateGroup = _svg.append("g");
            _states = _stateGroup.selectAll("rect").data(_stateData).enter().append("rect");
            _labels = _stateGroup.selectAll("text").data(_stateData).enter().append("text");
        }

        //Defining the data!
        //The actual runtimes of the tests are bound to rectangular elements here.
        _timeGroup = _svg.append("g");
        _runtimes = _timeGroup.selectAll("rect").data(_durationData).enter().append("rect");
        
        //the x-axis graphics
        _xAxisGrpahic = _svg.append("g").attr("class", "x axis");
    };
    
    return pub;
};