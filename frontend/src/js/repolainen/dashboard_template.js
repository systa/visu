/*
 * Copyright (c) TUT Tampere University of Technology 2014-2015.
 * All rights reserved.
 * This software has been developed in Tekes-TIVIT project Need-for-Speed.
 * All rule set in consortium agreement of Need-for-Speed project apply.
 *
 * Main authors: Antti Luoto, Anna-Liisa Mattila, Henri Terho
 */

var DASHBOARD_TEMPLATE = function (mpar) {

    //The main container parameters
    var _mainParameters = mpar || {};
    var _containerParent = _mainParameters.parent !== undefined ? _mainParameters.parent : document.body;
    var _hidden = _mainParameters.hidden !== undefined ? _mainParameters.hidden : true;
    
    //Canvas for text width calculus
    var _canvas = document.createElement('canvas');
    _canvas.style.display = "none";
    var _context = _canvas.getContext('2d');

    //Private variables for HTML & SVG elements
    var _brush = {
        div: false,
        svg: false
    };

    var _issueChart = {
        div: false,
        svg: false,
        legend1: false,
        legend2: false
    };

    var _amountChartLabel = {
        div: false,
        svg: false,
        legend: false
    };

    var _amountChartAuthor = {
        div: false,
        svg: false,
        legend: false
    };

    var _amountChartState = {
        div: false,
        svg: false,
        legend: false
    };

    var _pipelineChart = {
        div: false,
        svg: false,
        legend: false
    };

    //----------------------------------
    //    CREATE HTML & SVG ELEMENTS
    //----------------------------------
    //creates div elemet for ledgend
    var createLegendContainer = function (par) {
        var _legend;

        var p = par || {};

        var className = p.className !== undefined ? p.className : "legend";
        var id = p.id !== undefined ? p.id : "legendContainer";
        var parent = p.parent !== undefined ? p.parent : _containerParent;

        _legend = document.createElement("div");
        _legend.className = className;
        _legend.id = id;
        parent.appendChild(_legend);

        return _legend;
    };

    //creates contrainer div and svg element for brush component
    //returns SVG element with d3 binding
    var createBrushSVG = function (par) {
        if (!_brush.svg) {
            var p = par || {};

            var className = p.className !== undefined ? p.className : "brush";
            var id = p.id !== undefined ? p.id : "brushContainer";
            var svgId = p.svgId !== undefined ? p.svgId : "brush";
            var parent = p.parent !== undefined ? p.parent : _containerParent;

            //time selector container
            _brush.div = document.createElement("div");
            _brush.div.className = className;
            _brush.div.id = id;
            parent.appendChild(_brush.div);

            //time selector svg element
            var svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
            svg.className = className;
            svg.id = svgId;
            _brush.div.appendChild(svg);
            _brush.svg = d3.select(svg);
        } else {
            console.log("Time selector's SVG element already exists");
        }

        return _brush.svg;
    };

    //creates contrainer div and svg element for chart component
    //returns SVG element with d3 binding
    var createChartSVG = function (par) {
        var p = par || {};
        var source = p.source;

        if (!source.svg) {
            var p = par || {};

            var className = p.className !== undefined ? p.className : "chart";
            var id = p.id !== undefined ? p.id : "chartContainer";
            var svgId = p.svgId !== undefined ? p.svgId : "chart";
            var parent = p.parent !== undefined ? p.parent : _containerParent;


            //legend
            if (source.legend !== undefined){
                source.legend = createLegendContainer({
                    className: "legend",
                    id: id + "Legend",
                    parent: parent
                });
            }else{
                source.legend1 = createLegendContainer({
                    className: "legend",
                    id: id + "Legend1",
                    parent: parent
                });

                source.legend2 = createLegendContainer({
                    className: "legend",
                    id: id + "Legend2",
                    parent: parent
                });
            }
           
            //timeline containers
            source.div = document.createElement("div");
            source.div.className = className;
            source.div.id = id;
            parent.appendChild(source.div);

            //timeline svg element
            var svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
            svg.className = className;
            svg.id = svgId;
            source.div.appendChild(svg);
            source.svg = d3.select(svg);
        } else {
            console.log("Chart's SVG element already exists");
        }

        return source.svg;
    };

    //---------------------------------------
    //    PUBLIC METHODS
    //---------------------------------------
    var pub = {}; 

    //---------------------------------------
    //    GETTERS FOR SVG & HTML ELEMENTS
    //---------------------------------------
    pub.getBrushContainer = function () {
        return _brush.div;
    };
    pub.getBrushSVG = function () {
        return _brush.svg;
    };
    pub.getContainer = function () {
        return _containerParent;
    };

    //-------------------------------
    //    VISIBILITY MANIPULATORS
    //-------------------------------
    pub.hide = function () {
        if (!_hidden) {
            _containerParent.style.display = "none";
            _hidden = true;
        }
    };
    pub.show = function () {
        if (_hidden) {
            _containerParent.style.display = "block";
            _hidden = false;
        }
    };

    //--------------------------
    //    CREATION OF LAYOUT
    //-------------------------- 

    //creates the HTML and SVG elements for the layout and appends those into the document
    //if hierarchy parameter is not defined the layout will be created using default parameters
    //and the order of the elements in the document is the default (from top: legend, brush, chart)
    //Parameters : 
    //  hierarchy (optional), Array of Objects containing: {parameters : {}, type: STRING}
    //      "parameters" contains the parameters for the created chart elements (id, svgid, className, parent).
    //      "type" is the type of the element to be created (note that one element type can be created only once).
    //          type options are "legend", "brush" and "chart" if the type does not match any
    //          of these the dafault type is "chart".
    //      The order of the array defines the order where the elements are added to their parents
    //          (will affect the layout if the elements have the same parent).
    pub.createLayout = function () {

        //Create the timeline brush
        createBrushSVG({
            className: "brush",
            id: "brushContainer",
            svgId: "brush",
            parent: document.getElementById("brushParent"),
            source: _brush
        });

        //Create the issue timeline
        createChartSVG({
            className: "chart",
            id: "issueContainer",
            svgId: "chart",
            parent: document.getElementById("issueParent"),
            source: _issueChart
        });

        //Create the amount timeline 1
        createChartSVG({
            className: "chart",
            id: "amountContainer1",
            svgId: "chart",
            parent:  document.getElementById("amountParent1"),
            source: _amountChartAuthor
        });

        //Create the amount timeline 2
        createChartSVG({
            className: "chart",
            id: "amountContainer2",
            svgId: "chart",
            parent: document.getElementById("amountParent2"),
            source: _amountChartLabel
        });

        //Create the amount timeline 3
        createChartSVG({
            className: "chart",
            id: "amountContainer3",
            svgId: "chart",
            parent: document.getElementById("amountParent3"),
            source: _amountChartState
        });

        //Create the piepeline timeline
        createChartSVG({
            className: "chart",
            id: "pipelineContainer",
            svgId: "chart",
            parent: document.getElementById("pipelineParent"),
            source: _pipelineChart
        });

        return {
            container: _containerParent,
            brush: _brush,
            issueChart: _issueChart,
            amountChartAuthor: _amountChartAuthor,
            amountChartLabel: _amountChartLabel,
            amountChartState: _amountChartState,
            pipelineChart: _pipelineChart
        };
    };

    //Appends a label to legend element
    //parameters:
    //bgcolor : background color for the label text, the default is legend background color.
    //text : the label text
    pub.appendLabel = function (par) {
        var p = par || {};

        var _legend = p.legend;
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
        var style = window.getComputedStyle(_issueChart.div);
        _context.font = style.font;
        var len = _context.measureText(text).width;
        return len;
    };

    pub.getSVGTextHeight = function (text) {
        var style = window.getComputedStyle(_issueChart.div);
        _context.font = style.font;
        return _context.measureText(text).height;
    };

    return pub;
};