/*
 * Copyright (c) TUT Tampere University of Technology 2014-2015.
 * All rights reserved.
 * This software has been developed in Tekes-TIVIT project Need-for-Speed.
 * All rule set in consortium agreement of Need-for-Speed project apply.
 *
 * Main authors: Antti Luoto, Anna-Liisa Mattila, Henri Terho
 */

//Main debug variable for repolainen dashboard
var debug = true;

var DASHBOARD_MAIN = function (par) {
    if (debug) {
        console.log("[DASHBOARD_MAIN]", par);
    }

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

    //Contains the HTML (mailny div and svg) elements of the layout
    var _elements = false;

    //The chart objects
    var _issueChart = false;
    var _amountChartLabel = false;
    var _amountChartAuthor = false;
    var _amountChartState = false;
    var _durationChart = false;
    var _timeSelector = false;

    //Colorscales
    /*D3.js in v3 supports natively 4 color scales:
     * category10 - 10 different colours (most constrast, but looks terrible)
     * category20 - 10 different colours (1 in dark and 1 in light)
     * category20b - 5 different colours (4 shades each)
     * category20c - 5 different colours (4 shades each)
     */
    var _colorScaleEvents = d3.scale.category20c();
    var _colorScaleLabels = d3.scale.category10();
    var _colorScaleAuthors = d3.scale.category10();
    var _colorScaleDurations = d3.scale.category10();
    var _colorScaleStates = d3.scale.category10();

    //Initializing the module that helps with cerating the HTML and SVG elements
    var _layout = DASHBOARD_TEMPLATE({
        parent: document.getElementById("visuParent"),
        hidden: true
    });

    //Function for resize event
    var onResize = function () {
        var _containerWidth = window.innerWidth ||
            document.documentElement.clientWidth ||
            document.body.clientWidth;

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

        if (_amountChartState !== false) {
            //We should not exceed the total height
            var min = _amountChartState.getMinHeight();
            var height = _height * 0.3;
            if (height < min) {
                height = min;
            }
            _amountChartState.onResize(_width, height, _ChartMargins);
        }

        if (_durationChart !== false) {
            //We should not exceed the total height
            var min = _durationChart.getMinHeight();
            var height = _height * 0.3;
            if (height < min) {
                height = min;
            }
            _durationChart.onResize(_width, height, _ChartMargins);
        }

        if (_timeSelector !== false) {
            _timeSelector.onResize(_width, _timeSelectorHeight, _timeSelectorMargins);
        }

    };

    var createLegend = function (colorScale, legend, elements) {
        elements.forEach(function (elem) {
            var color = colorScale(elem);
            var text = elem.charAt(0).toUpperCase() + elem.slice(1) + " ";

            _layout.appendLabel({
                legend: legend,
                bgcolor: color,
                text: text
            });
        })
    };

    //Initializes the chart template and draws the visualization.
    var initCharts = function (chart, data, timeframe, callback) {
        //console.log("[dashboard_main]initCharts:", data);

        //Custom timeframe used if defined
        if (!timeframe) {
            timeframe = data.timeframe;
        }

        if (!_elements) {
            _elements = _layout.createLayout();

            //TODO: fix margins
            _ChartMargins.left = _layout.getSVGTextWidth("000000");
            _ChartMargins.right = _layout.getSVGTextWidth("Unassigned c    c");
            _timeSelectorMargins.left = _ChartMargins.left;
            _timeSelectorMargins.right = _ChartMargins.right;

            var onBrush = function (timeRange) {
                _issueChart.onBrush(timeRange);
                _amountChartAuthor.onBrush(timeRange);
                _amountChartLabel.onBrush(timeRange);
                _amountChartState.onBrush(timeRange);
                _durationChart.onBrush(timeRange);
            };

            _timeSelector = TimeSelector({
                svg: _elements.brush.svg,
                margins: _timeSelectorMargins,
                timeframe: timeframe,
                onBrushFunction: onBrush,
                linear: false
            });
        }

        switch (chart) {
            case "issue":
                _colorScaleEvents.domain(data.types); //event types
                createLegend(_colorScaleEvents, _elements.issueChart.legend1, data.types);

                //_colorScaleStates.domain(data.states); //defined by the states chart!
                createLegend(_colorScaleStates, _elements.issueChart.legend2, data.states);

                _issueChart = LifespanChart({
                    svg: _elements.issueChart.svg,
                    margins: _ChartMargins,
                    timeframe: timeframe,
                    ids: data.ids,
                    events: data.events,
                    lifespans: data.lifespans,
                    constructs: data.constructs,
                    colorScaleEvents: _colorScaleEvents,
                    colorScaleAuthors: _colorScaleAuthors,
                    colorScaleLabels: _colorScaleLabels,
                    colorScaleStates: _colorScaleStates,
                    lifespanColor: 'state' //'label' //'assignee'
                });
                break;

            case "assigned":
                _colorScaleAuthors.domain(data.tags);
                createLegend(_colorScaleAuthors, _elements.amountChartAuthor.legend, data.tags);

                _amountChartAuthor = AmountChart({
                    svg: _elements.amountChartAuthor.svg,
                    margins: _ChartMargins,
                    timeframe: timeframe,
                    max: data.max,
                    min: data.min,
                    amounts: data.amounts,
                    colorScale: _colorScaleAuthors
                });
                break;

            case "label":
                _colorScaleLabels.domain(data.tags);
                createLegend(_colorScaleLabels, _elements.amountChartLabel.legend, data.tags);

                _amountChartLabel = AmountChart({
                    svg: _elements.amountChartLabel.svg,
                    margins: _ChartMargins,
                    timeframe: timeframe,
                    max: data.max,
                    min: data.min,
                    amounts: data.amounts,
                    colorScale: _colorScaleLabels
                });
                break;

            case "state":
                _colorScaleStates.domain(data.tags); 
                createLegend(_colorScaleStates, _elements.amountChartState.legend, data.tags);

                //NB: State chart uses AmountChart (as do the labels and authors charts, but a different data-processor)
                _amountChartState = AmountChart({
                    svg: _elements.amountChartState.svg,
                    margins: _ChartMargins,
                    timeframe: timeframe,
                    max: data.max,
                    min: data.min,
                    amounts: data.amounts,
                    colorScale: _colorScaleStates
                });
                break;

            case "duration":
                _colorScaleDurations.domain(data.states);
                createLegend(_colorScaleDurations, _elements.durationChart.legend, data.states);

                _durationChart = DurationChart({
                    svg: _elements.durationChart.svg,
                    margins: _ChartMargins,
                    timeframe: timeframe,
                    ids: data.ids,
                    data: data.events,
                    colors: data.states
                });
                break;

            default:
                console.log("Chart type not valid.");
                return;
        }

        if (_issueChart && _amountChartAuthor && _amountChartLabel && _amountChartState && _durationChart) {
            window.addEventListener('resize', onResize);
            onResize();

            document.getElementById("loader").style.display = "none";
            _layout.show();

            _timeSelector.draw();
            _issueChart.draw();
            _amountChartAuthor.draw();
            _amountChartLabel.draw();
            _amountChartState.draw();
            _durationChart.draw();
        }

        if (callback) {
            callback();
        }
    };

    //-----------------------------------------
    // DATA RELATED STUFF
    //-----------------------------------------
    var p = par || {};

    var _mapping = p.mapping !== undefined ? p.mapping : false;
    var _filters = p.filters !== undefined ? p.filters : false;
    var _timeframe = false;
    if (_filters.startTime && _filters.endTime) {
        _timeframe = [new Date(_filters.startTime), new Date(_filters.endTime)];
    } else if (_filters.startTime) {
        _timeframe = [new Date(_filters.startTime), new Date()];
    }

    var createIssueTimeline = function (mapping, filters, timeframe, callback) {
        var _parser = LIFESPAN_CHART_PROCESSOR(mapping);
        var _query = DATA_QUERY();
        var _queryFilters = QUERY_UTILITIES().formatFilters(filters);

        var _events = false;
        var _states = false;
        var _constructs = false;

        var whenLoaded = function () {
            if (_events && _constructs && _states) {
                var parsed_data = _parser(_constructs, _events, _states);
                if (debug) {
                    console.log("[IssueTimeline]Parsed data:", parsed_data);
                }
                initCharts("issue", parsed_data, timeframe, callback);
            }
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

    var createAmountTimelines = function (mapping, filters, timeframe, callback) {

        var _parser = AMOUNT_CHART_PROCESSOR(mapping);
        var _query = DATA_QUERY();
        var _queryFilters = QUERY_UTILITIES().formatFilters(filters);

        var _events = false;
        var _states = false;
        var _constructs = false;

        var whenLoaded = function () {
            if (_events && _constructs && _states) {
                var parsed_data = _parser(_events, _constructs, _states);
                if (debug) {
                    console.log("[AmountTimeline]Parsed data:", parsed_data);
                }

                //Only do the callback after the 2nd chart is initialized!
                initCharts("assigned", parsed_data[0], timeframe, false);
                initCharts("label", parsed_data[1], timeframe, callback);
            }
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

    var createStatesTimeline = function (mapping, filters, timeframe, tag, callback) {
        filters.tag = tag;
        var _parser = STATES_CHART_PROCESSOR(mapping);
        var _query = DATA_QUERY();
        var _queryFilters = QUERY_UTILITIES().formatFilters(filters);

        var _events = false;
        var _states = false;
        var _constructs = false;

        var whenLoaded = function () {
            if (_events && _constructs && _states) {
                var parsed_data = _parser(_events, _constructs, _states, tag);
                if (debug) {
                    console.log("[StatesTimeline]Parsed data:", parsed_data);
                }
                initCharts(tag, parsed_data, timeframe, callback);
            }
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

    var createDurationTimeline = function (mapping, filters, timeframe) {
        filters.constructs.type = 'stage';

        var _parser = DURATION_CHART_PROCESSOR(mapping);
        var _query = DATA_QUERY();
        var _queryFilters = QUERY_UTILITIES().formatFilters(filters);

        var _events = false;
        var _constructs = false;
        var whenLoaded = function () {
            if (_events && _constructs) {
                var parsed_data = _parser(_constructs, _events);
                if (debug) {
                    console.log("[DurationTimeline]Parsed data:", parsed_data);
                }
                initCharts("duration", parsed_data, timeframe, false);
            }
        };

        var eventsLoaded = function (data) {
            _events = data;
            whenLoaded();
        };
        var constructsLoaded = function (data) {
            _constructs = data;
            whenLoaded();
        };

        _query.getFilteredConstructs(_queryFilters.constructFilters, constructsLoaded);
        _query.getFilteredEvents(_queryFilters.eventFilters, eventsLoaded);
    };

    /*
     * Warning: the order of creation of the charts matter. e.g. to keep coloscales coherent between charts.
     */

    // AMOUNT TIMELINE 1
    createAmountTimelines(_mapping, _filters, _timeframe, function () {
        // AMOUNT TIMELINE 3
        createStatesTimeline(_mapping, _filters, _timeframe, "state", function () {
            // ISSUE TIMELINE
            createIssueTimeline(_mapping, _filters, _timeframe, function () {
                // DURATION TIMELINE
                createDurationTimeline(_mapping, _filters, _timeframe, false);
            });
        });
    });
};