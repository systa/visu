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

//Timeline visualization component for visualizing events and states of artifacts
/*PARAMETERS:
    svg         : svg element where the visualization is rendered wrapped with d3
    width       : the width of the svg
    height      : the height of the svg
    margins     : how much space should be leaved for drawing labels and stuff (left, right),
                    how much room we leave for scale (top) and how much whitespace we leave at the bottom.
    timeframe   : value range of x-domain == array containing start time and end time of the range.
    labelColors : array that contains all label values that are mapped to colors
    stateColors : array that contains all state values that are mapped to colors
    ids         : id data used in y-axis, an array that defines the value range of y-axis. should contain each value of y-axis no more than once.
                    This is formed by the data processor.
    events      : event data formed by the data processor.
    lifespans   : lifespan data formed by the data processor.
    constructs  : construct data formed by the data processor.
    displayTypes: Should we display the types of constructs in right side? (default true)
    colorScale  : d3.js color scale used in showing states, events and labels. if not specified d3.scale.category20 is used.
*/
var PipelineChart = function(par){
    var p = par || {};
    
    var _svg  = p.svg !== undefined ? p.svg : false;
    if(!_svg){
        console.log("SVG parameter is mandatory for the timeline!");
        return false;
    }

    var _failedColor = '#ff1100'; //red
    var _canceledColor = '#ff8400'; //orange
    var _skippedColor = '#242424'; //grey
    var _successColor = '#00c20a'; //green
    
    var _width = p.width !== undefined ? p.width : 256;
    var _height = p.height !== undefined ? p.height : 32;
    var _margins = p.margins !== undefined ? p.margins : {top: 0, bottom : 0, left: 0, right: 0};
    var _xDomain = p.timeframe !== undefined ? p.timeframe : [0, 1000];
    var _yDomain = p.ids !== undefined ? p.ids : [];
    var _eventData = p.events !== undefined ? p.events : [];
    var _lifespanData = p.lifespans !== undefined ? p.lifespans : [];
    var _constructData = p.constructs !== undefined ? p.constructs : false;
    //If we want to display the construct types or not?
    var _displayTypes = p.displayTypes !== undefined ? p.displayTypes : true;
    
    var _timeScale = d3.time.scale().domain(_xDomain);
    _timeScale.range([_margins.left, _width-_margins.right]);
    
    //the tick size is negative because the orient of the axis is top. This reverts the axis...
    var _timeAxis = d3.svg.axis().orient("top").scale(_timeScale).tickSize(-_height+_margins.top+_margins.bottom);

    //building ordinal scale for test sets based on the build id
    var _scaleY = d3.scale.ordinal().rangeBands([_margins.top, _height-_margins.bottom]).domain(_yDomain);

    //calculaiting height for one row now that we know how many rows we will have
    var _rowHeight = ((_height-_margins.bottom-_margins.top)/_yDomain.length);
    var _minRowHeight = 15;//12;
    var _maxRowHeight = 20;//16;
    if(_rowHeight < _minRowHeight){
        _rowHeight = _minRowHeight;
    }
    else if(_rowHeight > _maxRowHeight){
        _rowHeight = _maxRowHeight;
    }
    _height = (_rowHeight * _yDomain.length) + _margins.bottom+_margins.top;
    
    _svg.attr("width", _width);
    _svg.attr("height", _height);

    //In SVG the draw order is reverse order of defining the nodes
    
    //Y-axis is constructed from rect and text SVG-elements. d3 axis is not used.
    //the _bgGroup, _bg and _names are the "Y-axis" graphical presentation.
    var _bgGroup = _svg.append("g");
    var _bg = _bgGroup.selectAll("rect").data(_constructData).enter().append("rect");
    var _names = _bgGroup.selectAll("text").data(_yDomain).enter().append("text");
    
    //Status group is related to the "Y-axis". It shows the status of the test if it failed or passed.
    if(_displayTypes){
        var _stateGroup = _svg.append("g");
        var _states = _stateGroup.selectAll("rect").data(_constructData).enter().append("rect");
        var _labels = _stateGroup.selectAll("text").data(_constructData).enter().append("text");
    }
    //Defining the data!
    //Lifespan data
    
    var _lifespanGroup = _svg.append("g");
    var _lifespans = _lifespanGroup.selectAll("line").data(_lifespanData).enter().append("line");

    //The event times
    var _outerEventGroup = _svg.append("g");
    var _innerEventGroup = _svg.append("g");

    var _outerEventData = [];
    var _innerEventData = [];
    _eventData.forEach(function (ev) {
        if (ev.type === 'opened' || ev.type === 'closed') {
            _outerEventData.push(ev);
        } else {
            _innerEventData.push(ev);
        }
    });

    var _innerEvents = _innerEventGroup.selectAll("rect").data(_innerEventData).enter().append("circle");
    var _outerEvents = _outerEventGroup.selectAll("circle").data(_outerEventData).enter().append("rect");

    var _xAxisGraphic = _svg.append("g").attr("class", "x axis");
    var _tooltip = d3.select("#tooltipC");
    
    var getLpStart = function(data){
        var domain = _timeScale.domain();
        var start = new Date(data.start);
        var end = new Date(data.end);
        
        //if end is false...
        //data endpoint is mapped to the domain end point
        if(!data.end){
            end = domain[domain.length-1];
        }

        //clipping the coordinates to brush selection
        if(start <= domain[0] && end >= domain[0]){
            start = domain[0];
        }
        else if((start < domain[0] && end < domain[0]) || start > domain[domain.length-1]){
            start = domain[0];
        }

        return _timeScale(start);
    };
    
    var getLpEnd = function(data){
        var domain = _timeScale.domain();
        var start = new Date(data.start);
        var end = new Date(data.end);

        //if end is false...
        //data endpoint is mapped to the domain end point
        if(!data.end){
            end = domain[domain.length-1]; 
        }
        //If the start date is not in the selection range we draw nothing.
        if(start > domain[domain.length-1] || end < domain[0]){
            return _timeScale(domain[0]);
        }
        //clipping the line to the current selection
        if(start <= domain[0] && end >= domain[0]){
            start = domain[0];
        }
        if(end >= domain[domain.length-1] && start <= domain[domain.length-1]){
            end = domain[domain.length-1];
        }
        var w = _timeScale(end);
        
        return w;
        
    };
    
    //Gets the timeline bars start point
    //The start point is the x-coordinate of the runtime bar
    var getX = function(data){
        var domain = _timeScale.domain();
        var start = new Date(data.time);
        var circleDiameter = _rowHeight*0.33*2;

        //clipping the coordinates to brush selection
        if(start <= domain[0] || start >= domain[domain.length-1]){
            return -circleDiameter;
        }

        var x = _timeScale(start);
        return x;
    };

    var getX2 = function (data) {
        var domain = _timeScale.domain();
        var start = new Date(data.time);
        var circleDiameter = _rowHeight * 0.33 * 2;

        //clipping the coordinates to brush selection
        if (start <= domain[0] || start >= domain[domain.length - 1]) {
            return -circleDiameter;
        }

        var x = _timeScale(start) - (_rowHeight * 0.25);
        return x;
    };
  
    //Gets the data row based on buildId
    var getY = function(data){
        return _scaleY(data.rowId);
    };
    
    var getLineY = function(data){
        var y = getY(data);
        y += _rowHeight*0.5;
        if (data.data && data.data.collide && data.data.collide !== 0){
            //console.log("[custom_timeline.js]Data collides:", data.data.collide);
            y += (_rowHeight*0.2) * data.data.collide;
        }
        return y;
    };

    var getLineY2 = function (data) {
        var y = getY(data) + (_rowHeight * 0.05);

        return y;
    };
    
    var onMouseOverEvent = function (data) {
        var dispstring = "<h5>Pipeline</h5>";

        //Pipeline data
        dispstring += "<strong>_id:</strong> " + data._id + "<br>";
        dispstring += "<strong>Row id:</strong> " + data.rowId + "<br>";
        dispstring += "<strong>Trigger:</strong> " + data.creator + "<br>";

        if (data.statechange.to === 'canceled'){
            dispstring += "<strong>Status:</strong> <span style='color: " + _canceledColor + "'>" + data.statechange.to + "</span><br>";
        }else if (data.statechange.to === 'failed'){
            dispstring += "<strong>Status:</strong> <span style='color: " + _failedColor + "'>" + data.statechange.to + "</span><br>";
        }else if (data.statechange.to === 'success'){
            dispstring += "<strong>Status:</strong> <span style='color: " + _successColor + "'>" + data.statechange.to + "</span><br>";
        }

        dispstring += "<strong>Original ID:</strong> " + data.origin_id[0].source_id + "<br>";

        var date = new Date(data.time);
        var time = date.getUTCDate() + "/" + (date.getUTCMonth() + 1) + "/" + date.getUTCFullYear() + " " + date.getUTCHours() + ":" + date.getUTCMinutes() + ":" + date.getUTCSeconds() + "." + date.getUTCMilliseconds();
        dispstring += "<strong>Time:</strong> " + time + "<br>";

        if (data.related_constructs)
            dispstring += "<strong>Related constructs:</strong> " + data.related_constructs.length + "<br>";

        if (data.related_events)
            dispstring += "<strong>Related events:</strong> " + data.related_events.length + "<br>";

        //Commit indication
        if ( data.stages[Object.keys(data.stages)[0]] !== undefined){
            var commit = data.stages[Object.keys(data.stages)[0]].jobs[0];
            dispstring += "<strong>Commit:</strong> " + commit.commit_title + "<br>";
            dispstring += "<strong>Commit ID:</strong> " + commit.commit + "<br>";
        }

        //Stages data
        dispstring += "<h5>Stages</h5> <ol>";
        for (var i in data.stages) {
            var stage = data.stages[i];
            if (stage.status === 'canceled'){
                dispstring += "<li><strong>" + i + "</strong>: <span style='color: " + _canceledColor + "'>" + stage.status + "</span><br>";
            }else if (stage.status === 'failed'){
                dispstring += "<li><strong>" + i + "</strong>: <span style='color: " + _failedColor + "'>" + stage.status + "</span><br>";
            }else if (stage.status === 'passed'){
                dispstring += "<li><strong>" + i + "</strong>: <span style='color: " + _successColor + "'>" + stage.status + "</span><br>";
            }else if (stage.status === 'skipped'){
                dispstring += "<li><strong>" + i + "</strong>: <span style='color: " + _skippedColor + "'>" + stage.status + "</span><br>";
            }

            dispstring += "<ul>";
            stage.jobs.forEach(function(job){
                if (job.state === 'canceled'){
                    dispstring += "<li>" + job.name + ":  <span style='color: " + _canceledColor + "'>" + job.state + "</span><br>";
                }else if (job.state === 'failed'){
                    dispstring += "<li>" + job.name + ":  <span style='color: " + _failedColor + "'>" + job.state + "</span><br>";
                }else if (job.state === 'success'){
                    dispstring += "<li>" + job.name + ":  <span style='color: " + _successColor + "'>" + job.state + "</span><br>";
                }else if (job.state === 'skipped'){
                    dispstring += "<li>" + job.name + ":  <span style='color: " + _skippedColor + "'>" + job.state + "</span><br>";
                }
            });

            dispstring += "</ul></li>";
        }
        dispstring += "</ol>";

        _tooltip.html(dispstring);
        return _tooltip.style("visibility", "visible");
    };

    var onMouseOverLifespan = function (data) {
        var dispstring = "<h5>Lifespan</h5>";

        //dispstring += "<strong>Tag:</strong> " + data.tag + "<br>";
        if (data.state === 'canceled'){
            dispstring += "<strong>State:</strong>  <span style='color: " + _canceledColor + "'>" + data.state + "</span><br>";
        }else if (data.state === 'failed'){
            dispstring += "<strong>State:</strong>  <span style='color: " + _failedColor + "'>" + data.state + "</span><br>";
        }else if (data.state === 'success'){
            dispstring += "<strong>State:</strong>  <span style='color: " + _successColor + "'>" + data.state + "</span><br>";
        }

        dispstring += "<strong>Row id:</strong> " + data.rowId + "<br>";

        var date = new Date(data.start);
        var start = date.getUTCDate() + "/" + (date.getUTCMonth() + 1) + "/" + date.getUTCFullYear() + " " + date.getUTCHours() + ":" + date.getUTCMinutes() + ":" + date.getUTCSeconds() + "." + date.getUTCMilliseconds();
        dispstring += "<strong>Start:</strong> " + start + "<br>";

        if (data.end) {
            date = new Date(data.end);
            var end = date.getUTCDate() + "/" + (date.getUTCMonth() + 1) + "/" + date.getUTCFullYear() + " " + date.getUTCHours() + ":" + date.getUTCMinutes() + ":" + date.getUTCSeconds() + "." + date.getUTCMilliseconds();
            dispstring += "<strong>End:</strong> " + end + "<br>";
        } else {
            dispstring += "<strong>End:</strong> " + "ongoing" + "<br>";
        }

        _tooltip.html(dispstring);
        return _tooltip.style("visibility", "visible");
    };

    var onMouseOverConstruct = function (data) {
        var dispstring;
        if (data.type === 'version'){
            dispstring = "<h5>Version</h5>";
        }else{
            dispstring = "<h5>Branch</h5>";
        }

        dispstring += "<strong>_id:</strong> " + data._id + "<br>";
        dispstring += "<strong>Row id:</strong> " + data.rowId + "<br>";
        dispstring += "<strong>Pipelines:</strong> " + data.related_statechanges.length + "<br>";

        _tooltip.html(dispstring);
        return _tooltip.style("visibility", "visible");
    };

    var onMouseMove = function (data) {
        return _tooltip.style("top", (event.clientY) + "px").style("left", (event.clientX + 15) + "px");
    };

    var onMouseOut = function (data) {
        return _tooltip.style("visibility", "hidden");
    };

    //public methods
    var pub = {};
    
    pub.clear = function(){
        _svg.selectAll("*").remove();
    };
    
    //Helper function for data mapping
    //maps data.state to color scale used.
    pub.getColor = function(data){
        var v = data.state !== undefined ? data.state : data.statechange.to;
        switch(v){
            case 'success': case 'passed': return _successColor;
            case 'failed': return _failedColor;
            case 'canceled': return _canceledColor;
            case 'skipped':  return _skippedColor;
        }
    };
    
    pub.getStateColor = function(data){
        switch(data){
            case 'success': case 'passed': return _successColor;
            case 'failed': return _failedColor;
            case 'canceled': return _canceledColor;
            case 'skipped':  return _skippedColor;
        }
    };
    
    //Returns the state text from data
    pub.getLabel = function(data){
        return data.type;
    };
    
    pub.draw = function(){

        //background and y-axis
        _bg.attr('fill', "#FCFCFC")
            .attr('x', 0)
            .attr('width', _width-_margins.right)
            .attr('y', getY)
            .attr('height', _rowHeight)
            .on("mouseover", onMouseOverConstruct)
            .on("mousemove", onMouseMove)
            .on("mouseout", onMouseOut);

        _names.attr('x', 2)
            .attr('y', function (d) {
                return _scaleY(d) + _rowHeight * 0.75;
            })
            .text(function (d) {
                var str= d
                if (str.length > 11) {
                    str = str.substring(0, 7) + "[..]";
                }
    
                return str;
            });
            
        _lifespans.attr('x1', getLpStart)
            .attr('x2', getLpEnd)
            .attr('y1', getLineY)
            .attr('y2', getLineY)
            .attr('stroke', pub.getColor)
            .attr('stroke-width', 1)
            //.attr('stroke-dasharray', "10,5")
            .on("mouseover", onMouseOverLifespan)
            .on("mousemove", onMouseMove)
            .on("mouseout", onMouseOut);

        _outerEvents.attr('fill', pub.getColor)
            .attr('x', getX2)
            .attr('y', getLineY2)
            .attr('width', _rowHeight * 0.5)
            .attr('height', _rowHeight * 0.95)
            .on("mouseover", onMouseOverEvent)
            .on("mousemove", onMouseMove)
            .on("mouseout", onMouseOut);

        _innerEvents.attr('fill', pub.getColor)
            .attr('cx', getX)
            .attr('cy', getLineY)
            .attr('r', _rowHeight * 0.3)
            .on("mouseover", onMouseOverEvent)
            .on("mousemove", onMouseMove)
            .on("mouseout", onMouseOut);

        //state data
        if(_displayTypes){
            _states.attr('fill', '#f3f3f3')
                .attr('x', _width-_margins.right)
                .attr('width', _margins.right)
                .attr('y', getY)
                .attr('height', _rowHeight);
            _labels.attr('x', _width-_margins.right)
                .attr('y', function(d){return getY(d)+_rowHeight*0.75;})
                .text(pub.getLabel);
        }

        //x-axis
        _xAxisGraphic.attr("transform", "translate(0,"+(_margins.top)+")")
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
    
    pub.updateData = function(ud){
        //Clear the chart before new bindings
        pub.clear();
        
        var u = ud || {};
        
        _xDomain = u.timeframe !== undefined ? u.timeframe : _xDomain;
        _yDomain = u.ids !== undefined ? u.ids : _yDomain;
        _eventData = u.events !== undefined ? u.events : _eventData;
        _lifespanData = u.lifespans !== undefined ? u.lifespans : _lifespanData;
        _constructData = u.constructs !== undefined ? u.constructs : _constructData;
        //type data can be left out by setting displayTypes parameter to false
        _displayTypes = p.displayTypes !== undefined ? p.displayTypes : _displayTypes;
        
        //reassigning scales
        _timeScale.domain(_xDomain);
        _timeScale.range([_margins.left, _width-_margins.right]);
        //building ordinal scale for test sets based on the build id
        _scaleY.domain(_yDomain);

        //calculaiting height for one row now that we know how many rows we will have
        _rowHeight = ((_height-_margins.bottom-_margins.top)/_yDomain.length);
        if(_rowHeight < _minRowHeight){
            _rowHeight = _minRowHeight;
        }
        else if(_rowHeight > _maxRowHeight){
            _rowHeight = _maxRowHeight;
        }
        _height = (_rowHeight * _yDomain.length) + _margins.bottom+_margins.top;

        //The data update
        
        //Y-axis is constructed from rect and text SVG-elements. d3 axis is not used.
        //the _bgGroup, _bg and _names are the "Y-axis" graphical presentation.
        _bgGroup = _svg.append("g");
        _bg = _bgGroup.selectAll("rect").data(_constructData).enter().append("rect");
        _names = _bgGroup.selectAll("text").data(_yDomain).enter().append("text");
        
        //Status group is related to the "Y-axis". It shows the status of the test if it failed or passed.
        if(_displayTypes){
            _stateGroup = _svg.append("g");
            _states = _stateGroup.selectAll("rect").data(_constructData).enter().append("rect");
            _labels = _stateGroup.selectAll("text").data(_constructData).enter().append("text");
        }
        //Defining the data!
        //Lifespan data
        
        _lifespanGroup = _svg.append("g");
        _lifespans = _lifespanGroup.selectAll("line").data(_lifespanData).enter().append("line");
        
        //The event times
        _eventGroup = _svg.append("g");
        _events = _eventGroup.selectAll("circle").data(_eventData).enter().append("circle");
        
        _xAxisGraphic = _svg.append("g").attr("class", "x axis");
    };
    
    
    return pub;
};