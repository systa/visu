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


//Returns true if page is not in pages
function notIn3(pages, page) {
    for(var i = 0; i < pages.length; i++)
        if (pages[i].hash == page.hash) return false;
     
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

    var user_helper = [];
    var session_helper = [];
    var doc_helper = [];
    var page_helper = [];
    
    var previous_page = false;
    
    //For each session
    for (var i = 0; i < data.length; i++) {
        var session = data[i];
        var previous_document;
        previous_page = false;
        
        if(user_helper.indexOf(session.user_id) === -1){
            user_helper.push(session.user_id);
            
            var toPush = {id: session.user_id};
            users.push(toPush);
        }
        
        if(session_helper.indexOf(session.id) === -1){
            session_helper.push(session.id);
            
            var toPush = {id: session.id, user_id: session.user_id};
            sessions.push(toPush);
        }
        
        var event = null;
        var stateChange = null;
        
        //For each entry in the session
        var entries = session.entries;
        var first_event_time = parseMyTime(entries[0].time, entries[0].date); //Session starting time
        for (var j = 0; j <= entries.length; j++) {
           var str;
           var double = false;
           
            //Ignore duplicates
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
            
            //Detect collision (entries that happen at the same time)
            entry.collide = 0; //Number of other entries that happen at the same time
            if (j > 0){
                if (entry.time == entries[j-1].time){
                    entry.collide = entries[j-1].collide + 1;
                }
            }
            
            //Force last entry to be Exit
            if(j == entries.length) {
               //No real way to know how long the session has lasted before ending, hence copy previous time
               entry = entries[j-1]; 
               
               if (! entry.action.includes("Exit")){
                  //TODO: create new hash for this entry
                  event = {date: entry.date, time: entry.time, session_id: entry.session_id, action: "Clicked on Exit", hash: entry.hash, document: null, page: null, first_time: first_event_time, collide: entry.collide};
                  events.push(event);

                  //Add statechange
                  stateChange = {event: entry.hash, from: "(session) open", to: "(session) closed"}; 
                  stateChanges.push(stateChange);
                  event.statechange = stateChange;
               }
               
            //Ignore duplicate entries
            }else if (double) { 
               
            //Entries linked to documents    
            }else if (str.includes("Document")) {
                //Isolate document name
                words = str.split(' ');
                var document = {name: words[1], user_id: session.user_id, session_id: session.id, hash: hashCode(words[1]+session.id)};
                previous_document = document.hash;
                
                for (var k = 2; k < words.length-1; k++) {document.name = document.name + words[k];} 
                
                //Create construct document
                if(doc_helper.indexOf(document.hash) === -1){
                    doc_helper.push(document.hash);
                    
                    var toPush = {name: document.name, user_id: document.user_id, session_id: document.session_id, hash: document.hash};
                    documents.push(toPush);
                }
                
                //Create state change
                var detail = words[words.length-1]; //Opened, closed, locked, unlocked
                stateChange = {event: entry.hash}; //Link to related event
                var push = true;
                switch(detail){
                    case "locked.": 
                        event = {date: entry.date, time: entry.time, session_id: entry.session_id, action: "Clicked on Locked", hash: entry.hash, document: document.hash, page: null, statechange:stateChange, first_time: first_event_time, collide: entry.collide, name: document.name};
                        
                        stateChange.from = "(doc) unlocked"; stateChange.to = "(doc) locked";
                        break;
                        
                    case "unlocked.": 
                        event = {date: entry.date, time: entry.time, session_id: entry.session_id, action: "Clicked on Unlocked", hash: entry.hash, document: document.hash, page: null, statechange:stateChange, first_time: first_event_time, collide: entry.collide, name: document.name};
                        
                        stateChange.from = "(doc) locked"; stateChange.to = "(doc) unlocked";
                        break;
                        
                    case "opened.":
                        event = {date: entry.date, time: entry.time, session_id: entry.session_id, action: "Clicked on Open Document", hash: entry.hash, document: document.hash, page: null, statechange:stateChange, first_time: first_event_time, collide: entry.collide, name: document.name};
                        
                        stateChange.from = "(doc) closed"; stateChange.to = "(doc) opened"; 
                        break;
                        
                    case "closed.":
                        event = {date: entry.date, time: entry.time, session_id: entry.session_id, action: "Clicked on Close Document", hash: entry.hash, document: document.hash, page: null, statechange:stateChange, first_time: first_event_time, collide: entry.collide, name: document.name};
                        
                        stateChange.from = "(doc) opened"; stateChange.to = "(doc) closed";  
                        break;
                        
                    default:
                        console.log("/!\ Unknown action: ", detail);
                        push = false;
                        break;
                }
                
                if(push){
                    events.push(event);
                    stateChanges.push(stateChange);
                }
            }
            
            //Entries linked to help pages
            else if (str.includes("Help")) {
                //Isolate page name
                words = str.split(' ');
                var page = {name: words[2], hash: hashCode(words[2]+session.id)};
                
                //Close previous page
                if(previous_page){
                    //Create event
                    event = {date: entry.date, time: entry.time, session_id: entry.session_id, action: "Switched help page", hash: entry.hash+1, document: null, first_time: first_event_time, collide: entry.collide, name: previous_page.name, page: previous_page.hash};
                    
                    stateChange = {event: entry.hash+1, from: "(help) opened", to:"(help) closed"}; //Link to related event
                    stateChanges.push(stateChange);
                    
                    event.statechange = stateChange;
                    events.push(event);  
                }
                
                previous_page = page;
                
                //Create event
                event = {date: entry.date, time: entry.time, session_id: entry.session_id, action: "Clicked on Help", hash: entry.hash, document: null, first_time: first_event_time, collide: entry.collide, name: page.name};
               
                //Create construct page
                if(page_helper.indexOf(page.hash) === -1){
                    page_helper.push(page.hash);   
                    
                    var toPush = {name: page.name, user_id: session.user_id, session_id: session.id, hash: page.hash};
                    pages.push(toPush);
                }

                //Create state change
                var detail = words[words.length-1]; //Opened, closed, locked, unlocked
                stateChange = {event: entry.hash, from: "(help) closed", to:"(help) opened"}; //Link to related event
                stateChanges.push(stateChange);
                
                event.statechange = stateChange;
                
                if (str.includes("Clicked"))
                    event.page = "Help";
                else
                    event.page = page.hash;
                              
                events.push(event);    
            }
            
            //Entries linked to features
            else if (str.includes("Clicked on")) {
                event = {date: entry.date, time: entry.time, session_id: entry.session_id, action: entry.action, hash: entry.hash, document: null, page: null, first_time: first_event_time, collide: entry.collide};
                                        
                words = str.split(' ');
                switch(words[2]){
                    case "Unlocked.": case "Locked.":
                        //event.document = previous_document;
                        //Action has already been recorded
                        break;
                        
                    //End of session
                    case "Exit": case "Exit.":
                        //Create state change
                        stateChange = {event: entry.hash, from: "(session) open", to: "(session) closed"}; 
                        stateChanges.push(stateChange);
                        
                        event.statechange = stateChange;
                        events.push(event);
                        break;
                        
                    //All other features
                    default:
                        events.push(event);
                        break;     
                }
            }
          
            //Program started entry
            else if (str.includes("Program started.")) {
                //Create state change
                stateChange = {event: entry.hash, from: "(session) closed", to: "(session) open"}; 
               
                //Create event
                event = {date: entry.date, time: entry.time, session_id: entry.session_id, action: entry.action, hash: entry.hash, document: null, page: null, statechange: stateChange, first_time: first_event_time, collide: entry.collide};
                
                events.push(event);
                stateChanges.push(stateChange);
            }
            
            //Other feature entries
            else if (str.includes("Library path added")) {
                //Create event
                event = {date: entry.date, time: entry.time, session_id: entry.session_id, action: entry.action, hash: entry.hash, document: null, page: null, first_time: first_event_time, collide: entry.collide};
                events.push(event);
            }
          
        }
        
    }
    
    //TODO force close all pages/documents at the end of session
    //Close previous page
    if(previous_page){
        //Create event
        event = {date: entry.date, time: entry.time, session_id: entry.session_id, action: "Switched help page", hash: entry.hash+1, document: null, first_time: first_event_time, collide: entry.collide, name: previous_page.name, page: previous_page.hash};

        stateChange = {event: entry.hash+1, from: "(help) opened", to:"(help) closed"}; //Link to related event
        stateChanges.push(stateChange);

        event.statechange = stateChange;
        events.push(event);  
    }
    
    var result = {events: events, users: users, sessions: sessions, documents:documents, statechanges: stateChanges, pages: pages};
    //display(result);

    console.log("[Getdata]Users: ", users.length);
    console.log("[Getdata]Sessions: ", sessions.length);
    
    callback(result);
}

module.exports = getData;
