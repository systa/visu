/*
 * Developped at Tampere University, 2019
 * All rights reserved.
 * 
 * Developped for a Master's Thesis by Hugo Fooy
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
var UserTimeframe = function (par) {
    console.log("[user_timeframe]Parameters:", par);

    var p = par || {};

    var _svg = p.svg !== undefined ? p.svg : false;
    if (!_svg) {
        console.log("SVG parameter is mandatory for the timeline!");
        return false;
    }

    var _width = p.width !== undefined ? p.width : 256;
    var _height = p.height !== undefined ? p.height : 32;
    var _margins = p.margins !== undefined ? p.margins : {
        top: 0,
        bottom: 0,
        left: 0,
        right: 0
    };

    var _xDomain = p.timeframe !== undefined ? p.timeframe : [0, 1000];
    var _yDomain = p.ids !== undefined ? p.ids : ["no ids"];

    var _yNames = p.names !== undefined ? p.names : ["no names"];

    var _eventData = p.events !== undefined ? p.events : [];
    var _lifespanData = p.lifespans !== undefined ? p.lifespans : [];
    var _constructData = p.constructs !== undefined ? p.constructs : [];

    //Timescale in the graph
    var _timeScale = d3.time.scale().domain(_xDomain);
    _timeScale.domain(_xDomain);
    _timeScale.range([_margins.left, _width - _margins.right]);

    //The tick size is negative because the orient of the axis is top. This reverts the axis...
    var _timeAxis = d3.svg.axis().orient("top").scale(_timeScale).tickSize(-_height + _margins.top + _margins.bottom);

    //Building ordinal scale for test sets based on the build id
    // (???)
    var _scaleY = d3.scale.ordinal().rangeBands([_margins.top, _height - _margins.bottom]).domain(_yDomain);

    //Calculaiting height for one row now that we know how many rows we will have
    var _rowHeight = 40;
    _height = (_rowHeight * _yDomain.length) + _margins.bottom + _margins.top;

    _svg.attr("width", _width);
    _svg.attr("height", _height);

    //In SVG the draw order is reverse order of defining the nodes

    //Y-axis is constructed from rect and text SVG-elements. d3 axis is not used.
    //the _bgGroup, _bg and _names are the "Y-axis" graphical presentation.
    var _bgGroup = _svg.append("g");
    var _bg = _bgGroup.selectAll("rect").data(_constructData).enter().append("rect");

    //Displayed names of constructs
    //var _namesData = {ids: _yDomain, text: _yNames};
    var _names = _bgGroup.selectAll("text").data(_yNames).enter().append("text");

    //Defining the data!

    //Lifespan data
    var _lifespanGroup = _svg.append("g");
    var _lifespans = _lifespanGroup.selectAll("line").data(_lifespanData).enter().append("line");

    //The event times
    var _eventGroup = _svg.append("g");

    var _events = _eventGroup.selectAll("circle").data(_eventData).enter().append("circle");

    var _xAxisGraphic = _svg.append("g").attr("class", "x axis");

    var _tooltip = d3.select("body").append("div").attr('class', "tooltip");
    /*var _tooltipL = d3.select("body").append("div").attr('class', "tooltipL");
    var _tooltipR = d3.select("body").append("div").attr('class', "tooltipR");*/

    //Lifespan start
    var getLpStart = function (data) {
        var domain = _timeScale.domain();
        var start = new Date(data.start);
        var end = new Date(data.end);

        //if end is false...
        //data endpoint is mapped to the domain end point
        if (!data.end) {
            end = domain[domain.length - 1];
        }

        //clipping the coordinates to brush selection
        if (start <= domain[0] && end >= domain[0]) {
            start = domain[0];
        } else if ((start < domain[0] && end < domain[0]) || start > domain[domain.length - 1]) {
            start = domain[0];
        }

        return _timeScale(start);
    };

    //Lifespan end
    var getLpEnd = function (data) {
        var domain = _timeScale.domain();
        var start = new Date(data.start);
        var end = new Date(data.end);

        //if end is false...
        //data endpoint is mapped to the domain end point
        if (!data.end) {
            end = domain[domain.length - 1];
        }
        //If the start date is not in the selection range we draw nothing.
        if (start > domain[domain.length - 1] || end < domain[0]) {
            return _timeScale(domain[0]);
        }
        //clipping the line to the current selection
        if (start <= domain[0] && end >= domain[0]) {
            start = domain[0];
        }
        if (end >= domain[domain.length - 1] && start <= domain[domain.length - 1]) {
            end = domain[domain.length - 1];
        }
        var w = _timeScale(end);

        return w;

    };

    //Gets the timeline bars start point
    //The start point is the x-coordinate of the runtime bar
    var getX = function (data) {
        var domain = _timeScale.domain();
        var start = new Date(data.time);
        var circleDiameter = _rowHeight * 0.33 * 2;

        //clipping the coordinates to brush selection
        if (start <= domain[0] || start >= domain[domain.length - 1]) {
            return -circleDiameter;
        }

        return _timeScale(start);
    };

    //Gets the data row based on buildId
    var getY = function (data) {
        return _scaleY(data.rowId);
    };

    var getLineY = function (data) {
        var y = getY(data);
        y += _rowHeight * 0.6;

        if (data.type === "doc" && data.data && data.data.collide !== 0) {
            y += (_rowHeight * 0.1) * data.data.collide;
        }

        return y;
    };

    //WHAT IS DISPLAYED ON MOUSE OVER !!!
    var onMouseOver = function (data) {
        var dispstring = "DETAILS:<br>";

        try {
            for (var atr in data) {
                if (typeof data[atr] !== "undefined" && data.hasOwnProperty(atr)) {
                    if (!$.isPlainObject(data[atr]) && !$.isArray(data[atr])) {
                        dispstring += atr + ": " + data[atr].toString() + "</br>";

                    } else if ($.isArray(data[atr])) {
                        for (var atr2 in data[atr]) {
                            if (!$.isPlainObject(data[atr]) && !$.isArray(data[atr])) {
                                if (data[atr].hasOwnProperty(atr2)) {
                                    dispstring += "tab(" + atr2 + "): " + data[atr][atr2].toString() + "</br>";
                                }
                            }
                        }
                    } else if ($.isPlainObject(data[atr])) {
                        for (var atr2 in data[atr]) {
                            if (data[atr].hasOwnProperty(atr2)) {
                                dispstring += "object(" + atr2 + "): " + data[atr][atr2].toString() + "</br>";
                            }
                        }
                    }
                }
            }
        } catch (e) {
            console.log(data, e);
        }

        /*
        var domain = _timeScale.domain();
        //Display left
        if(data.time && getX(data) > _timeScale(domain[domain.length-1]/2)){
            _tooltipL.html(dispstring);
            return _tooltipL.style("visibility", "visible");
        
        //Display right
        }else{
            _tooltipR.html(dispstring);
            return _tooltipR.style("visibility", "visible");
        }*/
        _tooltip.html(dispstring);
        return _tooltip.style("visibility", "visible");
    };

    var onMouseOut = function (data) {
        return _tooltip.style("visibility", "hidden");
        /*var domain = _timeScale.domain();
        //Display left
        if(data.time && getX(data) > _timeScale(domain[domain.length-1]/2)){
            return _tooltipL.style("visibility", "hidden");
        
        //Display right
        }else{
            return _tooltipR.style("visibility", "hidden");
        }*/
    };

    //public methods
    var pub = {};

    pub.clear = function () {
        _svg.selectAll("*").remove();
    };

    //Lifespan colors:
    var cDoc1 = "#abe8ff"; //Open
    var cDoc2 = "#526099"; //Locked
    var cDoc3 = "#648def"; //Unlocked
    var cPage = "#ffed4c";
    var cSession = "#ffc1c2";

    //Event colors:
    var cFeature = "#d84587";
    var cStartEnd = "#ffb2ad";

    var cPageOpen = "#ffed4c";
    var cPageSwitch = "#ff9544";

    var cDocOpen = "#abe8ff";
    var cDocLock = "#526099";
    var cDocUnlock = "#648def";
    var cDocClose = "#293955";

    //Color for events
    pub.getEventColor = function (data) {
        var action = data.data.action;
        switch (data.type) {
            case "doc":
                if (action.includes("Open")) return cDocOpen;
                if (action.includes("Locked")) return cDocLock;
                if (action.includes("Unlocked")) return cDocUnlock;
                if (action.includes("Close")) return cDocClose;

            case "help":
                if (action.includes("Clicked")) return cPageOpen;
                if (action.includes("Switched")) return cPageSwitch;

            case "feature":
                return cFeature;

            case "start/end":
                return cStartEnd;
        }
    };

    //Color for lifespans
    pub.getStateColor = function (data) {
        switch (data.state) {
            case "(doc) opened":
                return cDoc1;
            case "(doc) locked":
                return cDoc2;
            case "(doc) unlocked":
                return cDoc3;
            case "(help) opened":
                return cPage;
            case "(session) open":
                return cSession;
        }
    };

    pub.getColorType = function (type) {
        switch (type) {
            case "(doc) open":
                return cDoc1;
            case "(doc) locked":
                return cDoc2;
            case "(doc) unlocked":
                return cDoc3;
            case "(page) opened":
                return cPageOpen;
            case "(page) closed":
                return cPageSwitch;
            case "start/end":
                return cStartEnd;
            case "feature":
                return cFeature;
        }
    }

    pub.draw = function () {

        //background and y-axis
        _bg.attr('fill', "#FCFCFC")
            .attr('x', 0)
            .attr('width', _width - _margins.right)
            .attr('y', getY)
            .attr('height', _rowHeight)
            .on("mouseover", onMouseOver)
            .on("mouseout", onMouseOut);

        //Displayed names on the left
        _names.attr('x', 2);
        _names.attr('y', function (d) {
            return _scaleY(d.id) + _rowHeight * 0.75;
        });
        _names.text(function (d) {
            var str = "";
            if (d) {
                var tmp = d.name.split("/");

                if (tmp[1] === "doc")
                    str = tmp[tmp.length - 1];
                else
                    str = d.name.toString();
            }

            if (str.length > 20) {
                str = str.substring(0, 15) + "[...]";
            }

            return str;
        });
        _names.on("mouseover", onMouseOver)
            .on("mouseout", onMouseOut);

        //construct lifespans
        _lifespans.attr('x1', getLpStart)
            .attr('x2', getLpEnd)
            .attr('y1', getLineY)
            .attr('y2', getLineY)
            .attr('stroke', pub.getStateColor)
            .on("mouseover", onMouseOver)
            .on("mouseout", onMouseOut);

        //Event circles
        _events.attr('fill', pub.getEventColor)
            .attr('cx', getX) //X coordinate
            .attr('cy', getLineY) //Y coordinate
            .attr('r', _rowHeight * 0.33 * 0.5) //Ray of event circle
            .on("mouseover", onMouseOver)
            .on("mouseout", onMouseOut);

        //x-axis
        _xAxisGraphic.attr("transform", "translate(0," + (_margins.top) + ")")
            .call(_timeAxis)
            .selectAll(".tick text")
            .style("text-anchor", "start");
    };

    pub.onBrush = function (timeRange) {
        _timeScale.domain(timeRange);
        pub.draw();
    };

    pub.onResize = function (width, height, margins) {
        _width = width;
        _height = height;
        _margins = margins;

        _height = (_rowHeight * _yDomain.length) + _margins.bottom + _margins.top;

        _timeScale.range([_margins.left, _width - _margins.right]);
        _timeAxis.tickSize(-_height + _margins.top + _margins.bottom);
        _scaleY.rangeBands([_margins.top, _height - _margins.bottom]);

        _svg.attr("width", _width);
        _svg.attr("height", _height);

        pub.draw();
    };

    pub.onResize2 = function () {
        _height = (_rowHeight * _yDomain.length) + _margins.bottom + _margins.top;

        _timeScale.range([_margins.left, _width - _margins.right]);
        _timeAxis.tickSize(-_height + _margins.top + _margins.bottom);
        _scaleY.rangeBands([_margins.top, _height - _margins.bottom]);

        _svg.attr("width", _width);
        _svg.attr("height", _height);

        pub.draw();
    };

    pub.getMinHeight = function () {
        return _rowHeight * _yDomain.length + _margins.top + _margins.bottom;
    };

    pub.updateData = function (ud) {
        //Clear the chart before new bindings
        pub.clear();

        var u = ud || {};

        _xDomain = u.timeframe !== undefined ? u.timeframe : _xDomain;
        _yDomain = u.ids !== undefined ? u.ids : _yDomain;
        _yNames = u.names !== undefined ? u.names : _yNames;

        _eventData = u.events !== undefined ? u.events : _eventData;
        _lifespanData = u.lifespans !== undefined ? u.lifespans : _lifespanData;
        _constructData = u.constructs !== undefined ? u.constructs : _constructData;
        //type data can be left out by setting displayTypes parameter to false
        _displayTypes = p.displayTypes !== undefined ? p.displayTypes : _displayTypes;

        console.log("[user_timeframe]Constructs:", _constructData);

        //reassigning scales
        _timeScale.domain(_xDomain);
        _timeScale.range([_margins.left, _width - _margins.right]);
        //building ordinal scale for test sets based on the build id
        _scaleY.domain(_yDomain);

        _height = (_rowHeight * _yDomain.length) + _margins.bottom + _margins.top;

        //The data update

        //Y-axis is constructed from rect and text SVG-elements. d3 axis is not used.
        //the _bgGroup, _bg and _names are the "Y-axis" graphical presentation.
        _bgGroup = _svg.append("g");
        _bg = _bgGroup.selectAll("rect").data(_constructData).enter().append("rect");

        //var _namesData = {ids: _yDomain, text: _yNames};
        _names = _bgGroup.selectAll("text").data(_yNames).enter().append("text");

        //Lifespan data
        _lifespanGroup = _svg.append("g");
        _lifespans = _lifespanGroup.selectAll("line").data(_lifespanData).enter().append("line");

        //The event times
        _eventGroup = _svg.append("g");
        _events = _eventGroup.selectAll("circle").data(_eventData).enter().append("circle");

        _xAxisGraphic = _svg.append("g").attr("class", "x axis");

        pub.onResize2();
    };


    return pub;
};