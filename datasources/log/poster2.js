﻿/*
* Copyright (c) TUT Tampere University of Technology 2014-2015.
* All rights reserved.
* This software has been developed in Tekes-TIVIT project Need-for-Speed.
* All rule set in consortium agreement of Need-for-Speed project apply.
*
* Main authors: Otto Hylli, Antti Luoto
*/

// module that sends the collected issue data to the database

var request = require( 'request' );
var _ = require( 'underscore' );

var crypto = require('crypto');

var debugLink = false;
var debugSend = false;
var debugParse = true;

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

// sends the data to db
// logData : parsed log content
function sendToDb( logData, source ) {
   if (debugSend) {
      console.log("[Poster]sendToDb()");
      console.log("[Poster]Source:" + source);
   }
   
   // the api urls
   var config = require('./config.json');
   var serverUrl = config.serverUrl;
   var port = config.port;
   var server = serverUrl + ':' + port;
   var api = server + '/API/';
   var artefactApi = api +'constructs/';
   var eventApi = api +'events/';
   var bufferSize = 10;
   
   var pending = [];//List of requests to be send
   //However actually the requests that are already send are not moved away from the list
   //so it's kind of misleading name.
    
   var count = 0;
   var added = 0;
   
   var idToID = {};
   
   // add stuff to the db in this order 
   var entityOrder = [ 'users', 'sessions', 'documents', 'pages', 'events'/*, 'statechanges' */];
   
   // create an origin
   origin = { context: "kactus2", source: source};
   
   // get every list from the issue data and add every item from them to db
   entityOrder.forEach( function ( type ) {
      if(debugSend){
         console.log("[Poster]Processing " + type);
      }
      
      var list = logData[type];
      if ( !list ) {
         if(debugSend){
            console.log("[Poster]List empty");
         }
         return;
      }
      
      if(type === "events"){
         eventlist = list;
      }
      
      count += list.length; // every item from the list should be added      
      type = type.substr( 0, type.length -1 ); // e.g. comments -> comment
      
      list.forEach( function ( item ) {
         var artefact = {};
         var event = {};
         var state_change = {};
         var meta = {};

         // If the item is a construct, create the artefact
         if ( type === "user" || type === "session" || type === "document" || type === "page" ) {
            
            artefact.type = type;
            
            if (type === "user") {
               artefact.name = String(item.id); //Name is simply the hash
            }else if (type === "session") {
               artefact.name = item.id; //Name is simply the hash
            }else if (type === "document") {
               artefact.name = item.name; //Name is the doc name
               item.id = item.hash;
               meta.hash = item.hash;
               artefact.data = meta;
            }else if (type === "page") {
               artefact.name = item.name; //Name is the page name
               item.id = hashCode(item.name);
               //item.id = item.name;
            }

            artefact.origin_id = { context: origin.context, source: origin.source, source_id: String(item.id) };
            
            // Add the artefact to the pending list
            pending.push({body: artefact, url: artefactApi, type: type, sent: false, item : item});
         }

         // If the item is an event, create the event 
         else if ( type === "event" ) {
            event.type = type;
            event.time = parseMyTime(item.time, item.date);
            event.duration = 0;
            event.creator = item.session_id;
            event.data = {hash: item.hash, action: item.action};
            event.id = item.hash;
            
            item.id = item.hash;
            event.origin_id =  { context: origin.context, source: origin.source, source_id: String(item.hash) };
            
            if(item.statechange){
               //console.log("Event is a state-change");
               event.isStatechange = true;
               event.statechange = {from: item.statechange.from, to: item.statechange.to};
            }

            pending.push({body: event, url: eventApi, type: type, sent: false, item : item});
         }

         else {
            console.log("[ERROR]Unknown data type:" + type);
         }

      });//LIST FOR EACH END
   });//ENTITY ORDER FOR EACH END
   
   if(debugSend){
      console.log("[POSTER]Data pushed into pending, will now be sent...");
   }
   
   //Send to db
   //NOW SENDING IS DONE AFTER PARSING.
   //IT MIGHT BE GOOD IDEA TO DO THESE PARALLEL HOWEVER NEW WAY TO MANAGE BUFFER WOULD BE NEEDED!!
   createNewBuffer(logData);
   
   /* Send pending items to the DB 10 by 10 (size of buffer)
   * Create a promise for the buffer (and one for each element of the buffer)
   * When all is buffered, resolve the promise
   * Then create a new buffer for sending the next 10 items
   */
   function createNewBuffer(logData){
      var start = added;
      if(start >= pending.length){
         return true;
      }
      
      var end = added+bufferSize; //Size is 10
      if(end >= pending.length){
         end = pending.length;
      }
              
      var buffer = [];
      for(var requests = start; requests < end; ++requests){
         buffer.push(pending[requests]);
      }
      
      if(debugSend){
         console.log("start: ", start, " end: ", end);
         console.log("All requests: ",pending.length, " in buffer: ", buffer.length);
      }
        
      var bufferPromise = new Promise(function(resolve, reject){
            var buffered = [];

            buffer.forEach(function(obj){
               var prom = createPromise(obj);
               buffered.push(prom);
            });

            Promise.all(buffered).then(function(val){
               resolve("buffer");
            });
         
         }).then(function(val){
               var retval = createNewBuffer(logData);
               if(retval === true){
                  if(debugSend){
                     console.log("ADDED: ", added);
                     console.log("COUNT: ", count);
                  }

                  link(logData);
               }
            });
      
      return false;
    }//end createNewBuffer()
    
   // Create a promise for each individual item
   function createPromise(obj){
            
      return new Promise(function(resolve, reject){
         request.post(
            {url: obj.url, json: true, body: obj.body},
            
            function ( err, response, body ) {
               if ( err ) {
                  console.log( err );
                  reject("post");
                  process.exit();
               }
               
               else if( response.statusCode !== 201  && response.statusCode !== 200) {
                  console.log("[ERROR]In creating new promise for " + obj.type);
                  console.log(obj.item);
                  console.log( response.statusCode );
                  console.log( body );
                  reject("post");
                  process.exit();
               }
         
               added++; // one item added
               
               var item = obj.item;
               var type = obj.type;
               
               if (!idToID[item.id]){
                  idToID[item.id] = body._id;
               } 
               
               if(debugLink){
                  console.log("[Poster]"+ type +": idToID["+item.id+"] = "+idToID[item.id]);
               }
               
               obj.sent = true;
               resolve("post");
            });
      });
   }//end createPromise()
    
   //TODO: THROTTLE LINKING LIKE SENDING!!!
   // links issues to milestones and constructs to events using the previously collected information
   function link(logData) {
      if(debugLink){
         console.log("[Poster]Linking...");
      }
      // variables used to determine when we are done linking
      var linkCount = 0; // how many to be created
      var linked = 0; // how many linked
      // the links to be created 
      // will contain objects that have the id of the construct to be linked,
      // the other object to be linked and the type of the other object (construct or event)
      var links = [];
      
      // Link sessions to user
      if(debugLink){
         console.log("[Poster]Linking sessions"+ logData.sessions.length);
      }
      //var sessions = logData[sessions];
      var sessions = logData.sessions;
      
      _.each(sessions, function (session){
         links.push( { construct: idToID[session.id], target: idToID[session.user_id], type: 'construct' } );
      });
      
      
      // Link events to session & document/help page (if needed)
      
      if(debugLink){
         console.log("[Poster]Linking events"+ logData.events.length);
      }
      var events = logData.events;
      _.each(events, function (event){
         links.push( { construct: idToID[event.session_id], target: idToID[event.id], type: 'event' } );
         
         if(event.document) {
            links.push( { construct: idToID[event.document], target: idToID[event.id], type: 'event' } );   
         }
         else if(event.page) {
            links.push( { construct: idToID[hashCode(event.page)], target: idToID[event.id], type: 'event' } );   
         }
         
      });
      
      // Link documents to users
      
      if(debugLink){
         console.log("[Poster]Linking documents: "+ logData.documents.length);
      }
      var documents = logData.documents;
      _.each(documents, function (document){
         links.push( { construct: idToID[document.hash], target: idToID[document.user_id], type: 'construct' } );
      });
      
      linkCount = links.length;
      if(debugLink){
         console.log("Links: " + linkCount);
      }
      
      // create all of the links.
      links.forEach( function ( link ) {
         if(debugLink){
            console.log("construct: "+ link.construct+ " target: "+link.target, " type: "+link.type);
         }

         request.put( {
            url: artefactApi +link.construct +'/link',
            json: true,
            body: { id: link.target, type: link.type }
         }, 
                  
         function ( err, response, body ) {
            var dup = false;

            if ( err ) {
               console.log( err );
               process.exit();
            }
            else if ( response.statusCode !== 201 && response.statusCode !== 200) {
               console.log( response.statusCode );
               console.log( body );
               console.log( "Links saved: " + linked + "/" + linkCount);
               process.exit();
            }
            linked++;
            if ( linked === linkCount ) {
               // all links formed we are done
               // could call a callback here if we had one
               if(debugLink){
                  console.log( '[Poster]Everything saved to database.' );
               }
            }
         });
      });
   }//end link()
}

module.exports = sendToDb;
