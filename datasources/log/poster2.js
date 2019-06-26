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
var debugSend = false;

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
   
   // create artifacts and events -> pending list
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
         var meta = {};

         // If the item is a construct, create the artefact
         if ( type === "user" || type === "session" || type === "document" || type === "page" ) {
            
            artefact.type = type;
            
            if (type === "user") {
               artefact.name = String(item.id); //Name is simply the hash
            }else if (type === "session") {
               artefact.name = item.id; //Name is simply the hash
            }else if (type === "document" || type === "page") {
               artefact.name = item.name; //Name is the doc or page name
               item.id = item.hash;
               meta.hash = item.hash;
               artefact.data = meta;
            }

            artefact.origin_id = { context: origin.context, source: origin.source, source_id: String(item.id) };
            
            // Add the artefact to the pending list
            pending.push({body: artefact, url: artefactApi, type: type, sent: false, item : item});
         }

         // If the item is an event, create the event 
         else if ( type === "event" ) {
            event.time = parseMyTime(item.time, item.date);
            event.duration = 0;
            event.creator = item.session_id;
            event.data = {hash: item.hash, action: item.action, first_time: item.first_time, collide: item.collide, name: false};
            event.id = item.hash;
            
            item.id = item.hash;
            event.origin_id =  { context: origin.context, source: origin.source, source_id: String(item.hash) };
            
            if(item.statechange){
               event.isStatechange = true;
               event.statechange = {from: item.statechange.from, to: item.statechange.to};
            }
             
            //Seperate event types in categories
            var action = String(item.action);
            var event_type;
            if (action.includes("Document") || action.includes("Locked") || action.includes("Unlocked")){
                event_type = "doc";
                event.data.name = item.name;
            }else if (action.includes("Help") || action.includes("Switched")){
                event_type = "help";
                event.data.name = item.name;
            }else if (action.includes("Program") || action.includes("Exit")){
                event_type = "start/end";                
            }else if (action.includes("Clicked on")|| action.includes("Library")){
                event_type = "feature";
            }else {
                event_type = "other";
            }
            event.type = event_type;
            
            // Add the event to the pending list
            pending.push({body: event, url: eventApi, type: event_type, sent: false, item : item});
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
         return true; //Stops the buffer when all has been sent
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
        
      //Buffer of 10 items
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

                  // After all has been pushed to DB, start linking
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
               if (!idToID[item.id]){
                  idToID[item.id] = body._id;
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
         console.log("[Poster]Linking");
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
         console.log("[Poster]Linking sessions: "+ logData.sessions.length);
      }
      //var sessions = logData[sessions];
      var sessions = logData.sessions;
      
      _.each(sessions, function (session){
         links.push( { construct: idToID[session.id], target: idToID[session.user_id], type: 'construct' } );
      });
      
      //await sleep(1000);
      // Link events to session & document/help page (if needed)
      if(debugLink){
         console.log("[Poster]Linking events: "+ logData.events.length);
      }
      var events = logData.events;
      _.each(events, function (event){
         links.push( { construct: idToID[event.session_id], target: idToID[event.id], type: 'event' } );
          
         if(event.document) {
            links.push( { construct: idToID[event.document], target: idToID[event.id], type: 'event' } );  
         } else if(event.page) {
            links.push( { construct: idToID[event.page], target: idToID[event.id], type: 'event' } ); 
         }
         
      });
       
      console.log("[Poster]Linking pages: "+ logData.pages.length);
      var pages = logData.pages;
      console.log("[Poster]Page 1 ", logData.pages[0]);
       try{
          _.each(pages, function (page){
             links.push( { construct: idToID[page.id], target: idToID[page.user_id], type: 'construct' } );
             links.push( { construct: idToID[page.id], target: idToID[page.session_id], type: 'construct' } );
          });
       }catch(e){
           console.log('Error linking pages:', e);
       }
      
      // Link documents to users
      if(debugLink){
         console.log("[Poster]Linking documents: "+ logData.documents.length);
      }
      var documents = logData.documents;
      _.each(documents, function (document){
         links.push( { construct: idToID[document.hash], target: idToID[document.user_id], type: 'construct' } );
         links.push( { construct: idToID[document.hash], target: idToID[document.session_id], type: 'construct' } );
      });
      
      linkCount = links.length;
      if(debugLink){
         console.log("Links: " + linkCount);
      }
      
      createNewBufferLinks();
   
      /* Send pending links to the DB 10 by 10 (size of buffer)
      * Create a promise for the buffer (and one for each element of the buffer)
      * When all is buffered, resolve the promise
      * Then create a new buffer for sending the next 10 items
      */
      function createNewBufferLinks(){
         var start = linked;
         if(start >= linkCount){
            return true; //Stops the buffer when all has been sent
         }
         
         var end = linked+bufferSize; //Size is 10
         if(end >= links.length){
            end = links.length;
         }
               
         var buffer = [];
         for(var requests = start; requests < end; ++requests){
            buffer.push(links[requests]);
         }
         
         if(debugLink){
            console.log("start: ", start, " end: ", end);
            console.log("All requests: ",links.length, " in buffer: ", buffer.length);
         }
         
         //Buffer of 10 items
         var bufferPromise = new Promise(function(resolve, reject){
               var buffered = [];

               buffer.forEach(function(obj){
                  var prom = createPromiseLink(obj);
                  buffered.push(prom);
               });

               Promise.all(buffered).then(function(val){
                  resolve("buffer");
               });
            
            }).then(function(val){
                  var retval = createNewBufferLinks();
                  if(retval === true){
                     if(debugLink){
                        console.log("ADDED: ", linked);
                        console.log("COUNT: ", linkCount);
                     }

                     // All links have now been pushed to DB
                  }
               });
         
         return false;
      }//end createNewBufferLinks()
      
      // Create a promise for each individual item
      function createPromiseLink(link){
               
         return new Promise(function(resolve, reject){
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
               }else{
                  console.log("[Poster]Links saved:" + linked + "/" + linkCount);
               }

               resolve("put");
            });
         });
      }//end createPromise()
   }//end link()
}

module.exports = sendToDb;
