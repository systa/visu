/*PARAMETERS:
    svg : svg element where the visualization is rendered wrapped with d3
    width : the width of the draw area
    height : the height of the draw area
    margins : how much whitespace whould be left to svg (right, left, top, bottom)
        NOTE: the left and right margin should be the same for time selector as for the charts the time selector is used with
        if we want that the time axis is in same x-position than the charts time axis.
    onBrushFunction : the timerange selection callback that gives the new xDomain as parameter.
    users : user list
    sessions : session list
*/
function getRelatedSessions(user, sessions){
    var relatedSessions = [];
    
    for(var i in sessions){
        var sess = sessions[i];
        if(sess.user_id === user._id){
            relatedSessions.push(sess);
        }
    }
    
    return relatedSessions;
}

var DataSelector = function(par){
    console.log("[data_selector.js]DataSelector");
    
    //PARSING PARAMETERS
    var p = par || {};

    var _width = p.width !== undefined ? p.width : 1000;
    var _height = p.height !== undefined ? p.height : 40;
    var _margins = p.margins !== undefined ? p.margins : {top: 0, bottom : 0, left: 0, right: 0};
    var _brushCallback = p.onBrushFunction !== undefined ? p.onBrushFunction : function(){console.log("[time_selector.js]No brush fct defined...");};
    
    var _users = p.users !== undefined ? p.users : ["User 1", "User 2", "User 3"];
    var _sessions = p.sessions !== undefined ? p.sessions : ["Session 1", "Session 2", "Session 3"];
    
    console.log("Sessions:", _sessions);
    console.log("Users:", _users);
    var _currentSessions = getRelatedSessions(_users[0], _sessions);
    
    /* SELECTORS */
    var _selectUser = d3.select('#usersContainer')
        .append('div').attr('id','userSelectDIV')
        
        .append('select').attr('id','userSelect')
  	    .attr('class','select')
        .on('change', onUserChange);

    var _selectSession = d3.select('#usersContainer')
        .append('div').attr('id','sessionSelectDIV')
        
        .append('select').attr('id','sessionSelect')
  	    .attr('class','select')
        .on('change', onSessionChange);
    
    /* OPTIONS */
    var userOptions = _selectUser
        .selectAll('option')
	    .data(_users).enter()
	    .append('option')
		.text(function (d) { return d.name; });
    
    var SessionOptions = _selectSession
        .selectAll('option')
	    .data(_currentSessions).enter()
	    .append('option')
		.text(function (d) { return d._id; });

    /* ON CHANGE */
    function onUserChange() {
        userValue = d3.select('#userSelect').property('value');
	    console.log("Selected user:", userValue);
        var user;
        for(var i in _users){
            if(_users[i].name === userValue){
                user = _users[i];
            }
        }
        
        //Todo: change session list
        _currentSessions = getRelatedSessions(user, _sessions);
        
        _selectSession.selectAll('option').remove();
                
        SessionOptions = _selectSession
            .selectAll('option')
            .data(_currentSessions).enter()
            .append('option')
            .text(function (d) { return d._id; });
    };
    
    function onSessionChange() {
        sessionValue = d3.select('#sessionSelect').property('value');
	    d3.select('#sessionSelectDIV').append('p').text(sessionValue + ' is the last selected session.');
        
        //Todo: change diagram
    };

    //public methods
    var pub = {};

    pub.draw = function(){
        //console.log("[data_selector.js]Drawing the data selector.");
    };
  
    return pub;
};