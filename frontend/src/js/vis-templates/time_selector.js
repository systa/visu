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

//Time selector visualization component: The brush !

/*PARAMETERS:
    svg : svg element where the visualization is rendered wrapped with d3
    linear: wether x-axis is linear numerical scale or time scale, default value is linear numerical scale
    width : the width of the draw area
    height : the height of the draw area
    margins : how much whitespace whould be left to svg (right, left, top, bottom)
        NOTE: the left and right margin should be the same for time selector as for the charts the time selector is used with
        if we want that the time axis is in same x-position than the charts time axis.
    timeframe : value range of x-domain, if the scale is date based time scale the start time and end time should be used as a
        time scale values. If the scale should be linear numerical scale use the start and end number of the scale.
    onBrushFunction : the timerange selection callback that gives the new xDomain as parameter.
*/
var TimeSelector = function (par) {

    //PARSING PARAMETERS
    var p = par || {};

    var _svg = p.svg !== undefined ? p.svg : false;
    var _linear = p.linear !== undefined ? p.linear : true;
    var _customTime = p.customTime !== undefined ? p.customTime : false;
    if (!_svg) {
        console.log("SVG parameter is mandatory for TimeSelector -chart!");
        return false;
    }

    var _width = p.width !== undefined ? p.width : 256;
    var _height = p.height !== undefined ? p.height : 40;
    var _margins = p.margins !== undefined ? p.margins : {
        top: 0,
        bottom: 0,
        left: 0,
        right: 0
    };
    var _xDomain = p.timeframe !== undefined ? p.timeframe : [0, 1000];
    var _brushCallback = p.onBrushFunction !== undefined ? p.onBrushFunction : function () {
        console.log("[time_selector.js]No brush fct defined...");
    };

    //static scale for selecting data shown
    var _scale = _linear ? d3.scale.linear().domain(_xDomain) : _scale = d3.time.scale().domain(_xDomain);
    _scale.range([_margins.left, _width - _margins.right]);

    var _brushAxis = d3.svg.axis().orient("bottom").tickSize((_height - (_margins.top + _margins.bottom)) * 0.7).scale(_scale);

    //On brush axis
    if (_customTime) {
        _brushAxis.tickFormat(d3.time.format("%S")); //Seconds
        //_brushAxis.tickFormat(d3.time.format("%X")); //Full time
    }

    //event listener for brush events
    var onBrush = function () {
        _brushCallback(_brush.empty() ? _scale.domain() : _brush.extent());
    };
    var _brush = d3.svg.brush().x(_scale).on("brush", onBrush);

    var _brushGraphic = _svg.append("g").attr("class", "brush");
    var _axisGraphic = _svg.append("g").attr("class", "selection axis");

    //public methods
    var pub = {};

    pub.changeDomain = function (domain) {
        //console.log("[time_selector.js]New domain: ", domain);

        _xDomain = domain;
        _scale = _linear ? d3.scale.linear().domain(_xDomain) : _scale = d3.time.scale().domain(_xDomain);
        _scale.range([_margins.left, _width - _margins.right]);

        _brush.x(_scale);

        _brushAxis.scale(_scale);

        _axisGraphic.selectAll("*").remove();
        _axisGraphic = _svg.append("g").attr("class", "selection axis");

        pub.draw();
    }

    pub.draw = function () {
        //console.log("[time_selector.js]Drawing the time selector.");
        _axisGraphic.attr("transform", "translate(0," + _margins.top + ")")
            .call(_brushAxis)
            .selectAll(".tick text")
            .style("text-anchor", "start");

        //brush
        _brushGraphic.call(_brush).selectAll("rect").attr("height", _height);
    };

    pub.onResize = function (width, height, margins) {
        //console.log("[time_selector.js]Resize on the time selector.");
        _width = width;
        _height = height;
        _margins = margins;

        _scale.range([_margins.left, _width - _margins.right]);
        _brushAxis.tickSize((_height - (_margins.top + _margins.bottom)) * 0.5).scale(_scale);

        _svg.attr("width", _width);
        _svg.attr("height", _height);

        pub.draw();
    };

    return pub;
};