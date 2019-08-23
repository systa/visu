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

//Timeline visualization component for visualizing amounts of something over time
/*PARAMETERS:
    svg         : svg element where the visualization is rendered wrapped with d3
    width       : the width of the svg
    height      : the height of the svg
    margins     : how much space should be leaved for drawing labels and stuff (left, right),
                    how much room we leave for scale (top) and how much whitespace we leave at the bottom.
    timeframe   : value range of x-domain == array containing start time and end time of the range.
    maxAmount   : Maximum amount in the data
    amounts  : array of amount data get by processor. one data item contains a x-axel value (date) and amount (number)
*/
var AmountChart = function (par) {
    var p = par || {};

    var _svg = p.svg !== undefined ? p.svg : false;
    if (!_svg) {
        console.log("SVG parameter is mandatory for the timeline!");
        return false;
    }

    var _width = p.width !== undefined ? p.width : 256;
    var _height = p.height !== undefined ? p.height : 75;
    var _margins = p.margins !== undefined ? p.margins : {
        top: 0,
        bottom: 0,
        left: 0,
        right: 0
    };
    var _xDomain = p.timeframe !== undefined ? p.timeframe : [0, 1000];
    var _max = p.max !== undefined ? p.max : 10;
    var _min = p.min !== undefined ? p.min : 0;
    var _amountData = p.amounts !== undefined ? p.amounts : [];

    var _yDomain = [_min, Math.ceil(_max / 10) * 10];

    _svg.attr("width", _width);
    _svg.attr("height", _height + 10);

    var _amountScale = d3.scale.linear().domain(_yDomain).range([_height - _margins.bottom, _margins.top]);
    var _amountAxis = d3.svg.axis().orient("right").scale(_amountScale).tickSize(_width - (_margins.left + _margins.right));

    var _timeScale = d3.time.scale().domain(_xDomain).range([_margins.left, _width - _margins.right]);
    var _timeAxis = d3.svg.axis().orient("top").scale(_timeScale).tickSize(-_height + _margins.top + _margins.bottom);

    var _colorScale = p.colorScale !== undefined ? p.colorScale : d3.scale.category20b();

    //In SVG the draw order is reverse order of defining the nodes
    var _yAxisGraphic = _svg.append("g").attr("class", "y axis");

    //var _colorDomain = [];
    var _amountGroups = [];
    var _amounts = [];
    _amountData.forEach(function (array) {
        var group = _svg.append("g");
        var amounts = group.selectAll("rect").data(array.data).enter().append("rect");

        _amountGroups.push(group);
        _amounts.push(amounts);
    });

    var _xAxisGraphic = _svg.append("g").attr("class", "x axis");
    var _tooltip = d3.select("#tooltipC");

    //Horizontal position of the bar
    var mapDataToX = function (data) {
        var domain = _timeScale.domain();
        var start = data.date;

        if ((start.getUTCFullYear() < domain[0].getUTCFullYear() &&
                start.getMonth() < domain[0].getMonth() &&
                start.getDate() < domain[0].getDate()) ||
            start > domain[domain.length - 1]) {
            return 0;
        } else if (start < domain[0]) {
            start = domain[0];
        }
        return _timeScale(start);
    };

    //Width of the bar
    var mapDataToWidth = function (data) {
        var domain = _timeScale.domain();
        var start = data.date;

        //If the data is not in the domain range it is discarded
        if ((start.getUTCFullYear() < domain[0].getUTCFullYear() &&
                start.getMonth() < domain[0].getMonth() &&
                start.getDate() < domain[0].getDate()) ||
            start > domain[domain.length - 1]) {
            return 0;
        }

        var date = new Date(start);
        date.setDate(start.getDate() + 1);

        if (date < domain[0]) {
            return 0;
        }

        if (start < domain[0]) {
            start = domain[0];
        }

        if (date > domain[domain.length - 1]) {
            date = domain[domain.length - 1];
        }

        return _timeScale(date) - _timeScale(start);
    };

    //Vertical position of the bar
    var mapAmountToY = function (data) {
        if (!data.previous) data.previous = 0;

        return _amountScale(data.count + data.previous);
    };

    //Height of the bar
    var mapAmounToHeight = function (data) {
        return _amountScale.range()[0] - _amountScale(data.count);
    };

    var onMouseOver = function (data) {
        var dispstring = "<h5>Issues</h5>";

        dispstring += "<strong>Tag:</strong> " + data.tag + "<br>";
        dispstring += "<strong>Amount:</strong> " + data.count + "<br>";
        var date = (data.date.getUTCDate() + 1) + "/" + (data.date.getUTCMonth() + 1) + "/" + data.date.getUTCFullYear();
        dispstring += "<strong>Date:</strong> " + date + "<br>";
        //dispstring += "<strong>Previous:</strong> " + data.previous + "<br>";

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

    pub.clear = function () {
        _svg.selectAll("*").remove();
    };

    pub.draw = function () {
        //background and y-axis
        _yAxisGraphic.attr("transform", "translate(" + _margins.left + "," + 0 + ")").call(_amountAxis);

        //all amount bars
        _amounts.forEach(function (tag) {
            //amount bars of a specific tag
            tag.attr('fill', pub.getColor)
                .attr('x', mapDataToX)
                .attr('width', mapDataToWidth)
                .attr('y', mapAmountToY)
                .attr('height', mapAmounToHeight)
                .on("mouseover", onMouseOver)
                .on("mousemove", onMouseMove)
                .on("mouseout", onMouseOut);
        });

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

        _timeScale.range([_margins.left, _width - _margins.right]);
        _timeAxis.tickSize(-_height + _margins.top + _margins.bottom);
        _amountScale.range([_height - _margins.bottom, _margins.top]);
        _amountAxis.tickSize(_width - (_margins.left + _margins.right));

        _svg.attr("width", _width);
        _svg.attr("height", _height + 10);

        pub.draw();
    };

    pub.getMinHeight = function () {
        return 30;
    };

    pub.updateData = function (ud) {
        //Clear the chart before new bindings
        pub.clear();
        var u = ud || {};

        _xDomain = p.timeframe !== undefined ? p.timeframe : _xDomain;
        _max = p.max !== undefined ? p.max : _max;
        _min = p.min !== undefined ? p.min : _min;
        _amountData = p.amounts !== undefined ? p.amounts : _amountData;

        _yDomain = [_min, _max + 10];

        _amountScale.domain(_yDomain).range([_height - _margins.bottom, _margins.top]);
        _timeScale.domain(_xDomain).range([_margins.left, _width - _margins.right]);

        //In SVG the draw order is reverse order of defining the nodes
        _yAxisGraphic = _svg.append("g").attr("class", "y axis");

        _amountGroup = _svg.append("g");
        _amounts = [];
        _amountData.forEach(function (tag) {
            _amounts[tag] = _amountGroup.selectAll("rect").data(_amountData[tag]).enter().append("rect");
        })

        _xAxisGraphic = _svg.append("g").attr("class", "x axis");
    };

    pub.getColor = function (data) {
        var color;

        //This is to keep the same colorsheme as the lifespan chart, which uses 'open' instead of 'opnned'
        if (data.tag === 'opened'){
            data.tag = 'open';
        }

        var day = data.date.getDay();
        if (day == 0 || day == 6) {
            var tmp = d3.rgb(_colorScale(data.tag));
            color = "rgba(" + tmp.r + "," + tmp.g + "," + tmp.b + ", 0.75)";
        } else {
            color = _colorScale(data.tag);
        }

        return color;
    };

    pub.getColorScale = function () {
        return _colorScale;
    };

    return pub;
};