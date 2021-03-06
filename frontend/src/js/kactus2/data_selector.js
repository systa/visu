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

//Function for querying sessions related to a user
//PARAMETERS:
//user : user that serves as a filter
//sessions : session list from which to get the related sessions
function getRelatedSessions(user, sessions) {
    var relatedSessions = [];

    for (var i in sessions) {
        var sess = sessions[i];
        if (sess.user_id === user._id) {
            relatedSessions.push(sess);
        }
    }

    return relatedSessions;
}

//Variable that holds the current session selected
var currentSession = false;

/*PARAMETERS:
    onSessionChange : callback function that is triggered when a session gets selected
    users : user list
    sessions : session list
*/
var DataSelector = function (par) {
    //PARSING PARAMETERS
    var p = par || {};

    var _changeCallback = p.onSessionChange !== undefined ? p.onSessionChange : function () {
        console.log("[DataSelector]No session change fct defined...");
    };
    var _users = p.users !== undefined ? p.users : ["User 1", "User 2", "User 3"];
    var _sessions = p.sessions !== undefined ? p.sessions : ["Session 1", "Session 2", "Session 3"];

    var _currentSessions = getRelatedSessions(_users[0], _sessions);
    currentSession = _currentSessions[0];

    /* SELECTORS */
    var _selectUser = d3.select('#usersContainer')
        .append('div').attr('id', 'userSelectDIV')
        .append("text").text("Select user: ")
        .append('select').attr('id', 'userSelect')
        .attr('class', 'select')
        .on('change', onUserChange);

    var _selectSession = d3.select('#usersContainer')
        .append('div').attr('id', 'sessionSelectDIV')
        .append("text").text("Select session: ")
        .append('select').attr('id', 'sessionSelect')
        .attr('class', 'select')
        .on('change', onSessionChange);

    /* OPTIONS */
    var userOptions = _selectUser
        .selectAll('option')
        .data(_users).enter()
        .append('option')
        .text(function (d) {
            return ".." + d._id.substring(20);
        });

    var SessionOptions = _selectSession
        .selectAll('option')
        .data(_currentSessions).enter()
        .append('option')
        .text(function (d) {
            return ".." + d._id.substring(20);
        });

    /* ON CHANGE */
    function onUserChange() {
        userValue = d3.select('#userSelect').property('value');
        console.log("Selected user:", userValue);
        var user;
        for (var i in _users) {
            var subid = userValue.substring(2);
            if (_users[i]._id.substring(20) === subid) {
                user = _users[i];
            }
        }

        _currentSessions = getRelatedSessions(user, _sessions);
        _selectSession.selectAll('option').remove();

        SessionOptions = _selectSession
            .selectAll('option')
            .data(_currentSessions).enter()
            .append('option')
            .text(function (d) {
                return ".." + d._id.substring(20);
            });

        currentSession = _currentSessions[0];
        _changeCallback();
    };

    function onSessionChange() {
        sessionValue = d3.select('#sessionSelect').property('value');

        var session;
        for (var i in _currentSessions) {
            var subid = sessionValue.substring(2);
            if (_currentSessions[i]._id.substring(20) === subid) {
                session = _currentSessions[i];
            }
        }

        currentSession = session;
        _changeCallback();
    };

    //public methods
    var pub = {};

    pub.draw = function () {
        //console.log("[DataSelector]Drawing the data selector.");
    };

    pub.getSession = function () {
        return currentSession;
    };

    return pub;
};