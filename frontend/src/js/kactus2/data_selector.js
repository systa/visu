/*
 * Developped at Tampere University, 2019
 * All rights reserved.
 * 
 * Developped for a Master's Thesis by Hugo Fooy
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