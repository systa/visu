/*
 * Copyright (c) TUT Tampere University of Technology 2014-2015.
 * All rights reserved.
 * This software has been developed in Tekes-TIVIT project Need-for-Speed.
 * All rule set in consortium agreement of Need-for-Speed project apply.
 *
 * Main authors: Antti Luoto, Anna-Liisa Mattila, Henri Terho
 */

var DASHBOARD_MAIN = function (par) {
    console.log("[dashboard_main]");
    //-----------------------------------------
    //  DRAWING RELATED STUFF
    //-----------------------------------------
    var _timeSelectorHeight = 60;

    //The left and right margin as well as width should be the same
    //for all the charts if we want to align the draw areas vertically
    var _ChartMargins = {
        top: 20,
        bottom: 4,
        left: 0,
        right: 0
    };
    var _timeSelectorMargins = {
        top: 20,
        bottom: 10,
        left: 0,
        right: 0
    };

    var _width = 0;
    var _height = 0;

    //Div positioning variables
    var _containerMargins = {
        top: 60,
        left: 60,
        right: 60
    };

    //The chart objects will be here
    var _issueChart = false;
    var _amountChartLabel = false;
    var _amountChartAuthor = false;
    var _timeSelector = false;

    //Colorscales
    var _colorScaleEvents = d3.scale.category20();
    var _colorScaleLabels = d3.scale.category20c();
    var _colorScaleAuthors = d3.scale.category20c();

    var elements = false;

    //Initializing the module that helps with cerating the HTML and SVG elements
    var _parent = document.getElementById("visuParent");
    var _layout = DASHBOARD_TEMPLATE({
        parent: _parent
    });
    _layout.hide();

    //Function for resize event
    var onResize = function () {
        var _containerWidth = window.innerWidth
            || document.documentElement.clientWidth
            || document.body.clientWidth;

        _width = (_containerWidth - _containerMargins.left - _containerMargins.right) * 0.98;

        //The height that the two charts can use in maximum (total)
        _height = (window.innerHeight - (_timeSelectorHeight +
            _ChartMargins.top + _ChartMargins.bottom +
            _timeSelectorMargins.top + _timeSelectorMargins.bottom +
            _containerMargins.top));

        //Setting the size of charts
        if (_issueChart !== false) {
            //We should not exceed the total height
            var min = _issueChart.getMinHeight();
            var height = _height * 0.3;
            if (height < min) {
                height = min;
            }
            _issueChart.onResize(_width, height, _ChartMargins);
        }

        if (_amountChartAuthor !== false) {
            //We should not exceed the total height
            var min = _amountChartAuthor.getMinHeight();
            var height = _height * 0.3;
            if (height < min) {
                height = min;
            }
            _amountChartAuthor.onResize(_width, height, _ChartMargins);
        }

        if (_amountChartLabel !== false) {
            //We should not exceed the total height
            var min = _amountChartLabel.getMinHeight();
            var height = _height * 0.3;
            if (height < min) {
                height = min;
            }
            _amountChartLabel.onResize(_width, height, _ChartMargins);
        }

        if (_timeSelector !== false) {
            _timeSelector.onResize(_width, _timeSelectorHeight, _timeSelectorMargins);
        }

    };


    var createLegend = function (chart, legend, types) {
        var scale = _colorScaleLabels;
        for (var i = 0; i < types.length; ++i) {
            var color;
            if (types[i] === 'Unlabelled' || types[i] === 'Unassigned' )
                color = '#909090';
            else
                color = scale(types[i]);

            _layout.appendLabel({
                legend: legend,
                bgcolor: color,
                text: types[i] + " "
            });
        }
    };

    //Initializes the chart template and draws the visualization.
    var initCharts = function (chart, data, timeframe, callback) {
        console.log("[dashboard_main]initCharts:", data);

        if (!timeframe) {
            timeframe = data.timeframe;
        }

        if (!elements) {
            elements = _layout.createLayout();

            _ChartMargins.left = _layout.getSVGTextWidth("0000");
            _ChartMargins.right = _layout.getSVGTextWidth("Unassigned c    c");
            _timeSelectorMargins.left = _ChartMargins.left;
            _timeSelectorMargins.right = _ChartMargins.right;

            console.log("[dashboard_main]Margins:", _ChartMargins);

            var onBrush = function (timeRange) {
                _issueChart.onBrush(timeRange);
                _amountChartAuthor.onBrush(timeRange);
                _amountChartLabel.onBrush(timeRange);
            };

            _timeSelector = TimeSelector({
                svg: elements.brush.svg,
                margins: _timeSelectorMargins,
                timeframe: timeframe,
                onBrushFunction: onBrush,
                linear: false
            });
        }

        switch (chart) {
            case "issue":
                _colorScaleEvents.domain(data.types);
                _issueChart = EventTimeline({
                    svg: elements.issueChart.svg,
                    margins: _ChartMargins,
                    timeframe: timeframe,
                    ids: data.ids,
                    events: data.events,
                    lifespans: data.lifespans,
                    constructs: data.constructs,
                    colorScaleEvents: _colorScaleEvents,
                    colorScaleAuthors: _colorScaleAuthors,
                    colorScaleLabels: _colorScaleLabels
                });
                createLegend(_issueChart, elements.issueChart.legend1, data.types);
                createLegend(_issueChart, elements.issueChart.legend2, data.tags);
                break;
            case "assigned":
                _colorScaleAuthors.domain(data.tags);
                _amountChartAuthor = AmountChart({
                    svg: elements.amountChartAuthor.svg,
                    margins: _ChartMargins,
                    timeframe: timeframe,
                    max: data.max,
                    min: data.min,
                    amounts: data.amounts,
                    colorScale: _colorScaleAuthors
                });
                createLegend(_amountChartAuthor, elements.amountChartAuthor.legend, data.tags);
                break;
            case "label":
                _colorScaleLabels.domain(data.tags);
                _amountChartLabel = AmountChart({
                    svg: elements.amountChartLabel.svg,
                    margins: _ChartMargins,
                    timeframe: timeframe,
                    max: data.max,
                    min: data.min,
                    amounts: data.amounts,
                    colorScale: _colorScaleLabels
                });
                createLegend(_amountChartLabel, elements.amountChartLabel.legend, data.tags);
                break;
        }


        window.addEventListener('resize', onResize);

        if (_issueChart && _amountChartAuthor && _amountChartLabel) {
            onResize();

            document.getElementById("loader").style.display = "none";
            _layout.show();

            _timeSelector.draw();
            _issueChart.draw();
            _amountChartAuthor.draw();
            _amountChartLabel.draw();
        }

        if(callback){
            callback();
        }
    };

    //-----------------------------------------
    // DATA RELATED STUFF
    //-----------------------------------------

    //parsing the parameters from user to query data and select timeframe
    var p = par || {};

    var _mapping = p.mapping !== undefined ? p.mapping : false;
    var _filters = p.filters !== undefined ? p.filters : false;
    var _timeframe = false;
    if (_filters.startTime && _filters.endTime) {
        _timeframe = [new Date(_filters.startTime), new Date(_filters.endTime)];
    }

    var createIssueTimeline = function (mapping, filters, timeframe, tag) {
        var _parser = LIFSPAN_TIMELINE_PROCESSOR(mapping);
        var _queryFilters = QUERY_UTILITIES().formatFilters(filters);

        //Initializing the dataquery module for fetching the data
        var _query = DATA_QUERY();
        var _events = false;
        var _states = false;
        var _constructs = false;

        var whenLoaded = function () {
            if (_events && _constructs && _states) {
                var parsed_data = _parser(_constructs, _events, _states, tag);

                initCharts("issue", parsed_data, timeframe, false);
            }
            return false;
        };

        var eventsLoaded = function (data) {
            _events = data;
            whenLoaded();
        };

        var constructsLoaded = function (data) {
            _constructs = data;
            whenLoaded();
        };
        var statesLoaded = function (data) {
            _states = data;
            whenLoaded();
        };

        _query.getFilteredConstructs(_queryFilters.constructFilters, constructsLoaded);
        _query.getFilteredStatechanges(_queryFilters.eventFilters, statesLoaded);
        _query.getFilteredEvents(_queryFilters.eventFilters, eventsLoaded);
    };

    var createAmountTimeline = function (mapping, filters, timeframe, tag, callback) {
        filters.tag = tag;

        console.log("Data for parer:", mapping, filters, timeframe);

        var _parser = AMOUNT_CHART_PROCESSOR(mapping);
        var _queryFilters = QUERY_UTILITIES().formatFilters(filters);

        //Initializing the dataquery module for fetching the data
        var _query = DATA_QUERY();
        var _events = false;
        var _states = false;
        var _constructs = false;

        var whenLoaded = function () {
            if (_events && _constructs && _states) {
                console.log("Data for parer:", _constructs, _events, _states);
                var parsed_data = _parser(_events, _constructs, _states, tag);

                initCharts(tag, parsed_data, timeframe, callback);
            }
            return false;
        };

        var eventsLoaded = function (data) {
            _events = data;
            whenLoaded();
        };

        var constructsLoaded = function (data) {
            _constructs = data;
            whenLoaded();
        };
        var statesLoaded = function (data) {
            _states = data;
            whenLoaded();
        };

        _query.getFilteredConstructs(_queryFilters.constructFilters, constructsLoaded);
        _query.getFilteredStatechanges(_queryFilters.eventFilters, statesLoaded);
        _query.getFilteredEvents(_queryFilters.eventFilters, eventsLoaded);
    };

    // AMOUNT TIMELINE 1
    createAmountTimeline(_mapping, _filters, _timeframe, "assigned", function () {
        // AMOUNT TIMELINE 2
        createAmountTimeline(_mapping, _filters, _timeframe, "label", function () {
            // ISSUE TIMELINE
            createIssueTimeline(_mapping, _filters, _timeframe, "label");
        });
    });
};