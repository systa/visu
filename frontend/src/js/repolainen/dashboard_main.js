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
    var _amountChartState = false;
    var _durationChart = false;
    var _timeSelector = false;

    //Colorscales
    var _colorScaleEvents = d3.scale.category20b();
    var _colorScaleLabels = d3.scale.category20c();
    var _colorScaleAuthors = d3.scale.category20c();
    var _colorScaleDurations = d3.scale.category10();
    var _colorScaleStates = d3.scale.category20c();

    var elements = false;

    //Initializing the module that helps with cerating the HTML and SVG elements
    var _parent = document.getElementById("visuParent");
    var _layout = DASHBOARD_TEMPLATE({
        parent: _parent
    });
    _layout.hide();

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


    var createLegend = function (chart, legend, types) {
        var scale;
        if (chart === "label") {
            scale = _colorScaleLabels;
        } else if (chart = "state") {
            scale = _colorScaleStates;
        } else if (chart = "event") {
            scale = _colorScaleEvents;
        } else {
            scale = _colorScaleAuthors;
        }

        for (var i = 0; i < types.length; ++i) {
            var color = scale(types[i]);
            if (types[i] === 'Unlabelled' || types[i] === 'Unassigned') {
                color = '#909090';
            } else if (types[i] === 'opened') {
                color = scale('opened');
                types[i] = 'Open';
            }

            _layout.appendLabel({
                legend: legend,
                bgcolor: color,
                text: jsUcfirst(types[i]) + " "
            });
        }
    };

    function jsUcfirst(string)  {
        return string.charAt(0).toUpperCase() + string.slice(1);
    }

    var createLegendTests = function (chart, legend, types) {
        var scale = _colorScaleDurations;
        for (var i = 0; i < 2; ++i) {
            var color = scale(types[i] + "2");
        }

        for (var i = 0; i < types.length; ++i) {
            var color = scale(types[i]);

            _layout.appendLabel({
                legend: legend,
                bgcolor: color,
                text: types[i] + " "
            });
        }
    };

    //Initializes the chart template and draws the visualization.
    var initCharts = function (chart, data, timeframe, callback) {
        //console.log("[dashboard_main]initCharts:", data);

        if (!timeframe) {
            timeframe = data.timeframe;
        }

        if (!elements) {
            elements = _layout.createLayout();

            _ChartMargins.left = _layout.getSVGTextWidth("0000");
            _ChartMargins.right = _layout.getSVGTextWidth("Unassigned c    c");
            _timeSelectorMargins.left = _ChartMargins.left;
            _timeSelectorMargins.right = _ChartMargins.right;

            //console.log("[dashboard_main]Margins:", _ChartMargins);

            var onBrush = function (timeRange) {
                _issueChart.onBrush(timeRange);
                _amountChartAuthor.onBrush(timeRange);
                _amountChartLabel.onBrush(timeRange);
                _amountChartState.onBrush(timeRange);
                _durationChart.onBrush(timeRange);
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
                _colorScaleStates.domain(data.states.slice(0, data.tags.length))
                _issueChart = LifespanChart({
                    svg: elements.issueChart.svg,
                    margins: _ChartMargins,
                    timeframe: timeframe,
                    ids: data.ids,
                    events: data.events,
                    lifespans: data.lifespans,
                    constructs: data.constructs,
                    colorScaleEvents: _colorScaleEvents,
                    colorScaleAuthors: _colorScaleAuthors,
                    colorScaleLabels: _colorScaleLabels,
                    colorScaleStates: _colorScaleStates
                });
                createLegend("event", elements.issueChart.legend1, data.types);
                createLegend("state", elements.issueChart.legend2, data.states.slice(0, data.tags.length));
                break;
            case "assigned":
                _colorScaleAuthors.domain(data.tags.slice(1, data.tags.length));
                _amountChartAuthor = AmountChart({
                    svg: elements.amountChartAuthor.svg,
                    margins: _ChartMargins,
                    timeframe: timeframe,
                    max: data.max,
                    min: data.min,
                    amounts: data.amounts,
                    colorScale: _colorScaleAuthors
                });
                createLegend(chart, elements.amountChartAuthor.legend, data.tags);
                break;
            case "label":
                _colorScaleLabels.domain(data.tags.slice(1, data.tags.length));
                _amountChartLabel = AmountChart({
                    svg: elements.amountChartLabel.svg,
                    margins: _ChartMargins,
                    timeframe: timeframe,
                    max: data.max,
                    min: data.min,
                    amounts: data.amounts,
                    colorScale: _colorScaleLabels
                });
                createLegend(chart, elements.amountChartLabel.legend, data.tags);
                break;
            case "state":
                _colorScaleStates.domain(data.tags);
                _amountChartState = AmountChart({
                    svg: elements.amountChartState.svg,
                    margins: _ChartMargins,
                    timeframe: timeframe,
                    max: data.max,
                    min: data.min,
                    amounts: data.amounts,
                    colorScale: _colorScaleStates
                });
                createLegend(chart, elements.amountChartState.legend, data.tags);
                break;
            case "duration":
                _durationChart = DurationChart({
                    svg: elements.durationChart.svg,
                    margins: _ChartMargins,
                    timeframe: data.timeframe,
                    ids: data.ids,
                    data: data.events,
                    colors: data.states,
                    linear: false
                    //constructs : data.constructs
                });
                createLegendTests(_durationChart, elements.durationChart.legend, data.states);
                break;
        }


        window.addEventListener('resize', onResize);

        if (_issueChart && _amountChartAuthor && _amountChartLabel && _amountChartState) {
            onResize();

            document.getElementById("loader").style.display = "none";
            _layout.show();

            _timeSelector.draw();
            _issueChart.draw();
            _amountChartAuthor.draw();
            _amountChartLabel.draw();
            _amountChartState.draw();
        }

        if (callback) {
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
    } else if (_filters.startTime) {
        _timeframe = [new Date(_filters.startTime), new Date()];
    }

    var createIssueTimeline = function (mapping, filters, timeframe, tag, callback) {
        var _parser = LIFSPAN_CHART_PROCESSOR(mapping);
        var _queryFilters = QUERY_UTILITIES().formatFilters(filters);
        filters.constructs.type = "issue";

        //Initializing the dataquery module for fetching the data
        var _query = DATA_QUERY();
        var _events = false;
        var _states = false;
        var _constructs = false;

        var whenLoaded = function () {
            if (_events && _constructs && _states) {
                var parsed_data = _parser(_constructs, _events, _states, tag);

                initCharts("issue", parsed_data, timeframe, callback);
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
        //_query.getAllConstructs(constructsLoaded);
        _query.getFilteredStatechanges(_queryFilters.eventFilters, statesLoaded);
        _query.getFilteredEvents(_queryFilters.eventFilters, eventsLoaded);
    };

    var createAmountTimeline = function (mapping, filters, timeframe, tag, callback) {
        filters.tag = tag;

        console.log("Parameters for amount parser:", mapping, filters, timeframe);

        var _parser = AMOUNT_CHART_PROCESSOR(mapping);
        var _queryFilters = QUERY_UTILITIES().formatFilters(filters);

        //Initializing the dataquery module for fetching the data
        var _query = DATA_QUERY();
        var _events = false;
        var _states = false;
        var _constructs = false;

        var whenLoaded = function () {
            if (_events && _constructs && _states) {
                console.log("Data for amount parser:", _constructs, _events, _states);
                var parsed_data = _parser(_events, _constructs, _states, tag);
                console.log("Data from amount parser:", parsed_data);
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

        console.log("Construct filters:", _queryFilters.constructFilters);
        _query.getFilteredConstructs(_queryFilters.constructFilters, constructsLoaded);
        //_query.getAllConstructs(constructsLoaded);
        _query.getFilteredStatechanges(_queryFilters.eventFilters, statesLoaded);
        _query.getFilteredEvents(_queryFilters.eventFilters, eventsLoaded);
    };

    var createStatesTimeline = function (mapping, filters, timeframe, tag, callback) {
        filters.tag = tag;

        console.log("Parameters for amount parser:", mapping, filters, timeframe);

        var _parser = STATES_CHART_PROCESSOR(mapping);
        var _queryFilters = QUERY_UTILITIES().formatFilters(filters);

        //Initializing the dataquery module for fetching the data
        var _query = DATA_QUERY();
        var _events = false;
        var _states = false;
        var _constructs = false;

        var whenLoaded = function () {
            if (_events && _constructs && _states) {
                console.log("Data for amount parser:", _constructs, _events, _states);
                var parsed_data = _parser(_events, _constructs, _states, tag);
                console.log("Data from amount parser:", parsed_data);
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

        console.log("Construct filters:", _queryFilters.constructFilters);
        _query.getFilteredConstructs(_queryFilters.constructFilters, constructsLoaded);
        //_query.getAllConstructs(constructsLoaded);
        _query.getFilteredStatechanges(_queryFilters.eventFilters, statesLoaded);
        _query.getFilteredEvents(_queryFilters.eventFilters, eventsLoaded);
    };

    var createDurationTimeline = function (mapping, filters, timeframe) {
        //console.log('Filters: ', filters)
        filters.constructs.type = 'stage';

        var _parser = DURATION_CHART_PROCESSOR(mapping);
        var _queryFilters = QUERY_UTILITIES().formatFilters(filters);

        //Initializing the dataquery module for fetching the data
        var _query = DATA_QUERY();
        var _events = false;
        var _constructs = false;

        var whenLoaded = function () {
            if (_events && _constructs) {
                var parsed_data = _parser(_constructs, _events);

                initCharts("duration", parsed_data, false, false);
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

        _query.getFilteredConstructs(_queryFilters.constructFilters, constructsLoaded);
        _query.getFilteredEvents(_queryFilters.eventFilters, eventsLoaded);
    };

    // AMOUNT TIMELINE 1
    createAmountTimeline(_mapping, _filters, _timeframe, "assigned", function () {
        // AMOUNT TIMELINE 2
        createAmountTimeline(_mapping, _filters, _timeframe, "label", function () {
            // AMOUNT TIMELINE 3
            createStatesTimeline(_mapping, _filters, _timeframe, "state", function () {
                // ISSUE TIMELINE
                createIssueTimeline(_mapping, _filters, _timeframe, "label", function () {
                    // DURATION TIMELINE
                    createDurationTimeline(_mapping, _filters, _timeframe);
                });
            });
        });
    });
};