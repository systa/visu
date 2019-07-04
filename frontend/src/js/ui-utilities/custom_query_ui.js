/*
 * Developped at Tampere University, 2019
 * All rights reserved.
 * 
 * Developped for a Master's Thesis by Hugo Fooy
 */

var CUSTOM_QUERY_UI = function (callback) {

    var parseTextValue = function (val) {
        val = val.replace(/\s/g, '');
        if (val.length === 0) {
            return false;
        }
        return val;
    };

    var onClick = function () {

        var filters = {};

        var startDate = parseTextValue(document.getElementById("startDate").value);
        var startTime = parseTextValue(document.getElementById("startTime").value);
        if (startDate !== false && startTime !== false) {
            filters.startTime = new Date(startDate + "T" + startTime);
        } else {
            filters.startTime = startDate;
        }

        var endDate = parseTextValue(document.getElementById("endDate").value);
        var endTime = parseTextValue(document.getElementById("endTime").value);
        if (endDate !== false && endTime !== false) {
            filters.endTime = new Date(endDate + "T" + endTime);
        } else {
            filters.endTime = endDate;
        }

        filters.context = false;
        filters.source = parseTextValue(document.getElementById("source").value);
        filters.source_id = parseTextValue(document.getElementById("source_id").value);

        var eventFilters = {};

        eventFilters.creator = false;
        eventFilters.type = false;
        eventFilters.duration = false;

        eventFilters.time = false;
        filters.events = eventFilters;

        var constructFilters = {};

        constructFilters.name = false;
        constructFilters.type = "session";
        constructFilters.description = false;

        filters.constructs = constructFilters;

        var mapping = {};

        mapping.rowId = "source_id";
        mapping.rowIdIsFromOrigin = true;
        mapping.states = {
            resolution: ["(session)closed"]
        };

        document.getElementById("queryui").style.display = "none";
        var loading = document.createTextNode("LOADING");
        document.getElementById("loader").appendChild(loading);
        callback({
            filters: filters,
            mapping: mapping
        });
    };

    var _button = document.createElement("button");
    var _text = document.createTextNode("Visualize");
    var _class = document.createAttribute("class");  
    _class.value = "btn btn-primary btn-lg btn-block";
    _button.setAttributeNode(_class);
    _button.appendChild(_text);

    _button.addEventListener("click", onClick);
    document.getElementById("buttonplacer").appendChild(_button);
};