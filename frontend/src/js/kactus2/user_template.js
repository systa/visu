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

var USER_TEMPLATE = function (mpar) {

    //The main container parameters
    var _mainParameters = mpar || {};

    var _mclassName = _mainParameters.className !== undefined ? _mainParameters.className : "container";
    var _containerId = _mainParameters.id !== undefined ? _mainParameters.id : "container";
    var _containerParent = _mainParameters.parent !== undefined ? _mainParameters.parent : document.body;
    var _hidden = _mainParameters.hidden !== undefined ? _mainParameters.hidden : true;

    var _container = document.createElement("div");
    _container.className = _mclassName;
    _container.id = _containerId;
    if (_hidden) {
        _container.style.display = "none";
    } else {
        _container.style.display = "block";
    }

    //Canvas for text width calculus
    var _canvas = document.createElement('canvas');
    _canvas.style.display = "none";
    var _context = _canvas.getContext('2d');

    var _legend = false;
    var _users = false; //User/session selection list

    //Private variables for HTML & SVG elements

    //Timeselector
    var _brushDIV = false;
    var _brushSVG = false;

    //Chart
    var _chartDIV = false;
    var _chartSVG = false;

    //----------------------------------
    //    CREATE HTML & SVG ELEMENTS
    //----------------------------------
    //creates div elemet for ledgend
    var createLegendContainer = function (par) {
        if (!_legend) {
            var p = par || {};

            var className = p.className !== undefined ? p.className : "legend";
            var id = p.id !== undefined ? p.id : "legendContainer";
            var parent = p.parent !== undefined ? p.parent : _container;

            _legend = document.createElement("div");
            _legend.className = className;
            _legend.id = id;
            parent.appendChild(_legend);
        } else {
            console.log("Container for legend already exists!");
        }
        return _legend;
    };

    //creates contrainer div and svg element for users component
    //returns SVG element with d3 binding
    var createUsersContainer = function (par) {
        if (!_users) {
            var p = par || {};

            var className = p.className !== undefined ? p.className : "dataselection";
            var id = p.id !== undefined ? p.id : "usersContainer";
            var parent = p.parent !== undefined ? p.parent : _container;

            //user selector container
            _users = document.createElement("div");
            _users.className = className;
            _users.id = id;
            parent.appendChild(_users);
        } else {
            console.log("Container for user selection already exists!");
        }

        return _users;
    };

    //creates contrainer div and svg element for brush component
    //returns SVG element with d3 binding
    var createBrushSVG = function (par) {
        if (!_brushSVG) {
            var p = par || {};

            var className = p.className !== undefined ? p.className : "brush";
            var id = p.id !== undefined ? p.id : "brushContainer";
            var id = p.id !== undefined ? p.id : "brushContainer";
            var svgId = p.svgId !== undefined ? p.svgId : "brush";
            var parent = p.parent !== undefined ? p.parent : _container;

            //time selector container
            _brushDIV = document.createElement("div");
            _brushDIV.className = className;
            _brushDIV.id = id;
            parent.appendChild(_brushDIV);

            //time selector svg element
            var svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
            svg.className = className;
            svg.id = svgId;
            _brushDIV.appendChild(svg);
            _brushSVG = d3.select(svg);
        } else {
            console.log("Time selector's SVG element already exists");
        }

        return _brushSVG;
    };

    //creates contrainer div and svg element for chart component
    //returns SVG element with d3 binding
    var createChartSVG = function (par) {
        if (!_chartSVG) {
            var p = par || {};

            var className = p.className !== undefined ? p.className : "chart";
            var id = p.id !== undefined ? p.id : "chartContainer";
            var svgId = p.svgId !== undefined ? p.svgId : "chart";
            var parent = p.parent !== undefined ? p.parent : _container;

            //timeline containers
            _chartDIV = document.createElement("div");
            _chartDIV.className = className;
            _chartDIV.id = id;
            parent.appendChild(_chartDIV);

            //timeline svg element
            var svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
            svg.className = className;
            svg.id = svgId;
            _chartDIV.appendChild(svg);
            _chartSVG = d3.select(svg);
        } else {
            console.log("Chart's SVG element already exists");
        }

        return _chartSVG;
    };

    //---------------------------------------
    //    PUBLIC METHODS
    //---------------------------------------
    var pub = {}; //Public methods are used in InitChart by custom_timeline_main.js

    //---------------------------------------
    //    GETTERS FOR SVG & HTML ELEMENTS
    //---------------------------------------

    pub.getUsersContainer = function () {
        return _users;
    };
    pub.getBrushContainer = function () {
        return _brushDIV;
    };
    pub.getBrushSVG = function () {
        return _brushSVG;
    };
    pub.getChartContainer = function () {
        return _chartDIV;
    };
    pub.getChartSVG = function () {
        return _chartSVG;
    };
    pub.getContainer = function () {
        return _container;
    };

    //-------------------------------
    //    VISIBILITY MANIPULATORS
    //-------------------------------
    pub.hide = function () {
        if (!_hidden) {
            _container.style.display = "none";
            _hidden = true;
        }
    };
    pub.show = function () {
        if (_hidden) {
            _container.style.display = "block";
            _hidden = false;
        }
    };

    //--------------------------
    //    CREATION OF LAYOUT
    //-------------------------- 

    //creates the HTML and SVG elements for the layout and appends those into the document
    //if hierarchy parameter is not defined the layout will be created using default parameters
    //and the order of the elements in the document is the default (from top: legend, brush, chart)
    pub.createLayout = function () {

        createUsersContainer();
        createLegendContainer();
        createBrushSVG();
        createChartSVG();

        _containerParent.appendChild(_container);
        return {
            container: _container,
            brushContainer: _brushDIV,
            chartContainer: _chartDIV,
            brushSVG: _brushSVG,
            chartSVG: _chartSVG
        };
    };

    //Appends a label to users element
    //parameters:
    //bgcolor : background color for the label text, the default is legend background color.
    //text : the label text
    pub.appendLabel = function (par) {
        var p = par || {};
        var bgcolor = p.bgcolor !== undefined ? p.bgcolor : _legend.style.backgroundColor;
        var color = p.color !== undefined ? p.color : _legend.style.color;
        var text = p.text !== undefined ? p.text : false;

        if (!_legend) {
            console.log("Layout has to be created first!");
            return false;
        }
        var span = document.createElement("span");
        span.style.backgroundColor = bgcolor;
        span.style.color = color;
        if (text !== false) {
            span.innerHTML = text;
            span.id = text.replace(/\s+/g, '');
        }
        _legend.appendChild(span);
    };

    pub.getSVGTextWidth = function (text) {
        var style = window.getComputedStyle(_chartDIV);
        _context.font = style.font;
        var len = _context.measureText(text).width;
        return len;
    };

    pub.getSVGTextHeight = function (text) {
        var style = window.getComputedStyle(_chartDIV);
        _context.font = style.font;
        return _context.measureText(text).height;
    };

    return pub;
};