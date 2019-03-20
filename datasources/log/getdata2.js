/*
* Copyright (c) TUT Tampere University of Technology 2014-2015.
* All rights reserved.
* This software has been developed in Tekes-TIVIT project Need-for-Speed.
* All rule set in consortium agreement of Need-for-Speed project apply.
*
* Main authors: (prev. Otto Hylli) Hugo Fooy
*/

// module that gets the issue data from the given source using the given parameters

// library for dealing with url templates
var template = require( 'url-template' );
var _ = require( 'underscore' );
// library for parsing link headers that contain pagination info
var parse = require( 'parse-link-header' );
// for evaluating JsonPaths
var jsonPath = require( 'JSONPath' );

var crypto = require('crypto');

function hashCode(string) {
   var shasum = crypto.createHash('sha1');
   shasum.update(string);
   return shasum.digest('base64');
}

// Creates a hash for a given string 
// TODO check validity of hash function
function hashCode2(string) {
    var hash = 0, i, chr;
    if (string.length === 0) return hash;
    
    for (i = 0; i < string.length; i++) {
        chr   = string.charCodeAt(i);
        hash  = ((hash << 5) - hash) + chr;
        hash |= 0; // Convert to 32bit integer
    }
    return parseInt(hash);
} //end hashCode()

/* parseLog will get the content of the log file
* and parse return a data object
*/
function parseLog( content ) {
    //All the data
    var data = [];
    var session = {};
    session.entries = [];
    
    // By lines
    var lines = content.split('\n');
    for(var n_line = 0; n_line < lines.length - 1; n_line++){
          
        var line = lines[n_line];
        var entry = {};
        var words = line.split(' ');

        entry = {date: words[0], time: words[1], user_id: hashCode(words[3]), session_id: hashCode(words[6].substring(0, words[6].length-1)), action: words[7]};
        for(var n_words = 8; n_words < words.length; n_words++) {
            entry.action = entry.action + " " + words[n_words];
        }
      
        entry.hash = hashCode(line + n_line);
                        
        //Session detection
        if (session.entries.length>0) {
            if (session.id != entry.session_id) {
                var toPush = {id: session.id, user_id: session.user_id, entries: session.entries};
                data.push(toPush); //Add previous session to data
                
                session = {id: entry.session_id, user_id: entry.user_id, entries: []};
            }
        }else{ //First session
            session = {id: entry.session_id, user_id: entry.user_id, entries: []};
        }
  
        //Create new entry and add it to the list
        session.entries.push(entry);
    }

    var toPush = {id: session.id, user_id: session.user_id, entries: session.entries};
    data.push(toPush); //Add last session to data
    
    return data;
}

//Returns true if document is not in documents
function notIn(documents, document) {
    for(var i = 0; i < documents.length; i++)
        if (documents[i].hash == document.hash) return false;
     
    return true;
}

//Returns true if user_id is not in users
function notIn2(users, user_id) {
    var str = new String(user_id);
    for(var i = 0; i < users.length; i++){
        var str2 = new String(users[i]);
        if (str.localeCompare(str2) == 0)
            return false;
    }
    
    return true;
}

//Returns true if page is not in pages
function notIn3(pages, page) {
    for(var i = 0; i < pages.length; i++)
        if (pages[i].name == page.name) return false;
     
    return true;
}

//Returns true if session is not in sessions
function notIn4(sessions, session_id) {
    for(var i = 0; i < sessions.length; i++)
        if (sessions[i].session_id == session_id) return false;
     
    return true;
}

function display(result) {
    console.log("1. Users");
    for (var i=0; i<result.users.length; i++) {
        var user = result.users[i];
        console.log("User ID: " + user);
    }
    
    console.log("\n2. Sessions");
    for (var i=0; i<result.sessions.length; i++) {
        var session = result.sessions[i];
        console.log("Session ID: "+ session.session_id+", User ID: "+session.user_id);
    }
    
    console.log("\n3. Documents");
    for (var i=0; i<result.documents.length; i++) {
        var document = result.documents[i];
        console.log("Document Name: "+ document.name + ", User ID: " + document.user_id + ", Hash: " + document.hash);
    }
    
    console.log("\n4. Pages");
    for (var i=0; i<result.pages.length; i++) {
        var page = result.pages[i];
        console.log("Page Name: "+ page.name);
    }    
    
    console.log("\n5. State changes");
    for (var i=0; i<result.stateChanges.length; i++) {
        var sc = result.stateChanges[i];
        console.log("Event Hash: "+ sc.event + ", From: " + sc.from + ", To: " + sc.to);
    }
    
    console.log("\n6. Events");
    for (var i=0; i<result.events.length; i++) {
        var event = result.events[i];
        console.log("Date: "+event.date+", Time: "+event.time+", Session ID: "+event.session_id+", Action: "+event.action+", Hash: "+event.hash+", Document: "+event.document+", Page: "+event.page);
    }
}

function parseMyTime(myTime, myDate){
   var time = new Date(myDate.substr(6,4), //year
                      myDate.substr(3,2)-1,//month
                      myDate.substr(0,2),  //day
                      myTime.substr(0,2),  //hour
                      myTime.substr(3,2),  //min
                      myTime.substr(6,2),  //sec
                      "000"); //millisec
   return time;
}

//Returns the list of users, sessions, documents, etc
function getData( source, callback ) {
    console.log('[GetData]Parsing...');

    var fs = require("fs");
    var file = fs.readFileSync(source);
    var data = parseLog(file.toString());
    
    var users = []; //List of user ids
    var sessions = []; //List of sessions: <session_id, user_id>
    var documents = []; //List of documents: <file_name, user_id, hash>
    var events = []; //List of events
    var pages = []; //List of help pages 
    var stateChanges = []; //List of state changes

    for (var i = 0; i < data.length; i++) {
        var session = data[i];
        var previous_document;
        
        //User list
        if (notIn2(users, session.user_id)) {
            var toPush = {id: session.user_id};
            users.push(toPush);
        }
        
        //Session list
        if (notIn4(sessions, session.id)) {
            var toPush = {id: session.id, user_id: session.user_id};
            sessions.push(toPush);
        }
        
        //The rest
        var entries = session.entries;
        var first_event_time = parseMyTime(entries[0].time, entries[0].date);
        //var collide = 0; 
        for (var j = 0; j <= entries.length; j++) {
           var str;
           var double = false;
           
            if (j < entries.length){
               entry = entries[j];
               str = new String(entry.action);
               
               //Ignore duplicate entries
               if (j > 0){
                  prev_entry = entries[j-1];
                  if (prev_entry.action === entry.action){
                     double = true;
                  }  
               }
            }
            
            entry.collide = 0; //Number of other entries that happen at the same time
            if (j > 0){
                if (entry.time == entries[j-1].time){
                    entry.collide = entries[j-1].collide + 1;
                }
            }
            
            //Force last entry to be Exit
            if(j == entries.length) {
               console.log("All entries processed...");
               //Add event
               entry = entries[j-1]; //No real way to know how long the session has lasted before ending, hence copy previous time
               
               if (entry.action != "Clicked on Exit."){
                  console.log("Last entry is not Exit: ", entry.action);
                  
                  var event = {date: entry.date, time: entry.time, session_id: entry.session_id, action: "Clicked on Exit", hash: entry.hash, document: null, page: null, first_time: first_event_time, collide: entry.collide};
                  events.push(event);

                  //Add statechange
                  var stateChange = {event: entry.hash, from: "(session) open", to: "(session) closed"}; 
                  stateChanges.push(stateChange);
                  event.statechange = stateChange;
                  
                  console.log("Forced Exit Action !");
               }
            }else if (double) { //ignore duplicate entries
               //console.log("DOUBLE ENTRY: " + entry.action);
            }else if (str.includes("Document")) {
                //Isolate document name
                words = str.split(' ');
                var document = {name: words[1], user_id: session.user_id, hash: hashCode(words[1]+session.user_id)};
                previous_document = document.hash;
                
                for (var k = 2; k < words.length-1; k++) {document.name = document.name + words[k];} 
                
                //Create construct document
                if (notIn(documents, document)) {
                    var toPush = {name: document.name, user_id: document.user_id, hash: document.hash};
                    documents.push(toPush);
                }
                
                //Create state change
                var detail = words[words.length-1]; //Opened, closed, locked, unlocked
                var stateChange = {event: entry.hash}; //Link to related event
                switch(detail){
                    case "locked.": 
                        stateChange.from = "(doc) unlocked"; stateChange.to = "(doc) locked";
                        break;
                    case "unlocked.": 
                        stateChange.from = "(doc) locked"; stateChange.to = "(doc) unlocked";
                        break;
                    case "opened.":
                        var event = {date: entry.date, time: entry.time, session_id: entry.session_id, action: "Clicked on Open Document", hash: entry.hash, document: document.hash, page: null, statechange:stateChange, first_time: first_event_time, collide: entry.collide};
                        events.push(event);
                        
                        stateChange.from = "(doc) closed"; stateChange.to = "(doc) opened";  
                        break;
                    case "closed.":
                        var event = {date: entry.date, time: entry.time, session_id: entry.session_id, action: "Clicked on Close Document", hash: entry.hash, document: document.hash, page: null, statechange:stateChange, first_time: first_event_time, collide: entry.collide};
                        events.push(event);
                        
                        stateChange.from = "(doc) opened"; stateChange.to = "(doc) closed";  
                        break;
                    default:
                        console.log("/!\ Unknown action: "+detail);
                        break;
                }
                
                stateChanges.push(stateChange);
            }
            
            //Page list
            else if (str.includes("Help")) {
                //Isolate page name
                words = str.split(' ');
                var page = {name: words[2]};
                var stateChange;
               
                if (words.length > 2) {
                    //Create construct page
                    if (notIn3(pages, page)) {
                        var toPush = {name: page.name};
                        pages.push(toPush);
                    }
                    
                    //Create state change
                    var detail = words[words.length-1]; //Opened, closed, locked, unlocked
                    stateChange = {event: entry.hash, from: "(help) closed", to:"(help) opened"}; //Link to related event
                    stateChanges.push(stateChange);
                    event.statechange = stateChange;
                    
                    //TODO: close previous help when a new one is opened
                }
                
                //Create event
                var event = {date: entry.date, time: entry.time, session_id: entry.session_id, action: "Clicked on Help", hash: entry.hash, document: null, statechange:stateChange, first_time: first_event_time, collide: entry.collide};
                if (str.includes("Clicked"))
                    event.page = "Help";
                else
                    event.page = page.name;
                              
                events.push(event);    
            }
            
            else if (str.includes("Clicked on")) {
                var event = {date: entry.date, time: entry.time, session_id: entry.session_id, action: entry.action, hash: entry.hash, document: null, page: null, first_time: first_event_time, collide: entry.collide};
                var stateChange;
                                        
                words = str.split(' ');
                switch(words[2]){
                    case "Unlocked.":
                        event.document = previous_document;
                        break;
                    case "Locked.":
                        event.document = previous_document;
                        break;
                    case "Exit.":
                        //Create state change
                        stateChange = {event: entry.hash, from: "(session) open", to: "(session) closed"}; 
                        stateChanges.push(stateChange);
                        
                        event.statechange = stateChange;
                        break;
                    default:
                        break;     
                }
                
                events.push(event);
            }
          
            else if (str.includes("Program started.")) {
                //Create state change
                var stateChange = {event: entry.hash, from: "(session) closed", to: "(session) open"}; 
                stateChanges.push(stateChange);
               
                //Create event
                var event = {date: entry.date, time: entry.time, session_id: entry.session_id, action: entry.action, hash: entry.hash, document: null, page: null, statechange:stateChange, first_time: first_event_time, collide: entry.collide};
                events.push(event);
                
            }
            
            else if (str.includes("Library path added")) {
                //Create event
                var event = {date: entry.date, time: entry.time, session_id: entry.session_id, action: entry.action, hash: entry.hash, document: null, page: null, first_time: first_event_time, collide: entry.collide};
                events.push(event);
            }
          
        }
        
    }
    
    //TODO force close all pages/documents at the end of session
    
    var result = {events: events, users: users, sessions: sessions, documents:documents, statechanges: stateChanges, pages: pages};
    //display(result);

    callback(result);
}

module.exports = getData;
