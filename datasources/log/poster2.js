/*
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

var debugLink = true;
var debugSend = true;
var debugParse = false;

function parseJenkinsTime(jenkinsTime){
   //var d = new Date(year, month, day, hours, minutes, seconds, milliseconds); 
   var time = new Date(jenkinsTime.substr(0,4), jenkinsTime.substr(5,2)-1, jenkinsTime.substr(8,2),
                       jenkinsTime.substr(11,2), jenkinsTime.substr(14,2), jenkinsTime.substr(17,2), "000");
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
   var neweventlist = [];
   //However actually the requests that are already send are not moved away from the list
   //so it's kind of misleading name.
    
   var count = 0;
   var added = 0;
   
   // add stuff to the db in this order 
   var entityOrder = [ 'users', 'sessions', 'documents', 'pages', 'events', 'statechanges' ];
   
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
            //artefact.description = item.description;

            if ( type === "user" ) artefact.name = item.user_id;
            else if ( type === "session" ) artefact.name = item.session_id;
            else artefact.name = item.name;

            artefact.origin_id = { context: origin.context, source: origin.source, source_id: String( artefact.name ) };

            if ( type == "document" ) {
               meta.hash = item.hash;
               artefact.data = meta;
               artefact.origin_id.source_id = item.hash; //override s previous source_id
            }

            // Add the artefact to the pending list
            pending.push({body: artefact, url: artefactApi, type: type, sent: false, item : item});
         }

         // If the item is an event, create the event 
         else if ( type === "event" ) {
            event.type = type;
            //TODO solve time formatting
            event.time = 0;
            //event.time = item.date + "-" + item.time;
            event.duration = 0;
            event.creator = item.session_id;
            event.data = {hash: item.hash, action: item.action};
            event.origin_id =  { context: origin.context, source: origin.source, source_id: String( item.hash ) };
            
            if(item.statechange){
               console.log("Event is a state-change");
               event.isStatechange = true;
               event.statechange = {from: item.statechange.from, to: item.statechange.to};
            }

            pending.push({body: event, url: eventApi, type: type, sent: false, item : item});
            //neweventlist.push(event);
         }

         
         // TODO Check that this actually adds correctly the state-change to the event
         // If the item is an state-change, add it to the event 
         else if ( type === "statechange" ) {
            /*
            state_change.event = item.event;
            state_change.from = item.from;
            state_change.to = item.to;

            //Add state-change to event
            events = neweventlist;
            for (var i = 0; i < events.length; i++) {
               //console.log("Event:"+events[i].data);
               if (events[i].data.hash === item.event) {
                  console.log("Event is a state change");
                  events[i].isStatechange = true;
                  events[i].statechange = {from: item.from, to: item.to};
               }else{
                  //console.log("Event is not a state change");
               }
            }
            */
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

                  //link(logData);
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
         links.push( { construct: session.session_id, target: session.user_id, type: 'construct' } );
      });
      
      // Link events to session & document/help page (if needed)
      /*
      if(debugLink){
         console.log("[Poster]Linking events"+ logData.events.length);
      }
      var events = logData.events;
      _.each(events, function (event){
         links.push( { construct: event.id, target: event.session_id, type: 'construct' } );
         
         if(event.document) {
            links.push( { construct: event.id, target: event.document, type: 'construct' } );   
         }
         else if(event.page) {
            links.push( { construct: event.id, target: event.page, type: 'construct' } );   
         }
         
      });
      */
      // Link documents to users
      /*
      if(debugLink){
         console.log("[Poster]Linking documents: "+ logData.documents.length);
      }
      var documents = logData.documents;
      _.each(documents, function (document){
         links.push( { construct: document.hash, target: document.user_id, type: 'construct' } );
      });
      */
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
