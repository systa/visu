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

// module that gets the issue data from the given source using the given parameters

// library for dealing with url templates
var template = require('url-template');
var _ = require('underscore');
// library for parsing link headers that contain pagination info
var parse = require('parse-link-header');
// for evaluating JsonPaths
var jsonPath = require('JSONPath');

// gets the issue data
// baseRequest request with default values used as a basis for the API calls
// api: the issue source api description
// userParams: the parameter values from the user input
var GET_DATA = function (baseRequest, api, userParams, callback) {
   // save the issue data here
   var result = {};
   // information about the progress
   var status = {};
   // used to count when we have fetched everything
   // first we have issues
   status.count = 0;
   // if a new entity doesn't have an id use this
   // this uses negative numbers to separate these from ids from the source systems
   status.newId = -1;

   
      // get the issues
      if (api.issues) {
//	  console.log("\nGET api.issues");
          status.count++;
         getItems(baseRequest, api, 'issues', api.issues, userParams, result, status, callback);
      }

      if (api.milestones) {
//	  console.log("\nGET api.milestones");
         // get milestones if the api has them
         status.count++;
         getItems(baseRequest, api, 'milestones', api.milestones, userParams, result, status, callback);
      }

    if (api.changeEvents) {
//	console.log("\nGET api.changeEvents");
         // get changeEvents if the api has them
         status.count++;
         getItems(baseRequest, api, 'changeEvents', api.changeEvents, userParams, result, status, callback);
      }

    if (api.jiraIssues) {
//	console.log("\nGET api.jiraIssues");
         // get changes if the api has them
         status.count++;
         getItems(baseRequest, api, 'jiraIssues', api.jiraIssues, userParams, result, status, callback);
      }

    if (api.jiraChanges) {
//	console.log("\nGET api.jiraChanges");

         // get changes if the api has them
         status.count++;
         getItems(baseRequest, api, 'jiraChanges', api.jiraChanges, userParams, result, status, callback);
      }

      if (api.builds) {
//	console.log("\nGET api.builds");
         // get changes if the api has them
         status.count++;
         getItems(baseRequest, api, 'builds', api.builds, userParams, result, status, callback);
      }

      if (api.buildHistorys) {
//	console.log("\nGET api.buildHistorys");

          // get changes if the api has them
         status.count++;
         getItems(baseRequest, api, 'buildHistorys', api.buildHistorys, userParams, result, status, callback);
      }

    if (api.jobs) {
//	console.log("\nGET api.jobs");

         // get jobs if the api has them
         status.count++;
         getItems(baseRequest, api, 'jobs', api.jobs, userParams, result, status, callback);
      }

    if (api.pipelines) {
//	console.log("\nGET api.pipelines");

         // get pipelines if the api has them
         status.count++;
         getItems(baseRequest, api, 'pipelines', api.pipelines, userParams, result, status, callback);
      }
  
}

// gets one type of items from the source
// baseRequest: contains defaults for the api requests
// api: the api description
// type: string what kind of items we are fetching (issues, milestones ...)
// itemDesc: the part of the api description that describes the resource we are fetching
// userParams: the user input used in the requests
// result: the items are saved here
// status: the count attribute of this object is used to count when we are done
// callback: called when we have got everything from the resource
// parent: if this is a child resource of some item
// e.g. if the resource is a issue comment then the parent is the issue
function getItems(baseRequest, api, type, itemDesc, userParams, result, status, callback, parent) {
//   console.log("@[Getdata]Getting items:" + type);

   // save the stuff we get here
   var items = [];
   // resolve the uri template in to actual url using the user input that contains the values for the template parameters
   var url = template.parse(itemDesc.path);

    var params = userParams;  // TODO: Meaningless init
/*
    _.each(userParams, function (value, key) {
	console.log("UserParam " + key + " = " + value);
    });
*/
   // use also the possible parent parameters
   // for example when getting the comments of an issue the url contains
   // the id of the issue i.e. the id of the parent resource
   if (itemDesc.parentParams) {
      params = {};
      // use json path to get the values for the parameters from the parent
 //      console.log("@params: ");
      _.each(itemDesc.parentParams, function (value, key) {
          params[key] = jsonPath.eval(parent, value);
//	  console.log(" - " + key + ":" + params[key] + ", value=" + value);
      });

      // combine parent parameters and the user parameters
      params = _.extend(params, userParams);
   }

   // get the url for the resource
   url = url.expand(params);

//   console.log("GET1:" + url + "\n" + itemDesc.query);
   // get stuff from the source
   baseRequest.get({
      url: url,
      // the query parameters from the api description
      qs: itemDesc.query
   }, processPage);

   // processes the items the response from the source contains
   function processPage(err, response, body) {
      if (err) {
         console.log(err);
         //console.log(response);
         //console.log(body);

         callback({err:err, res:response.statusCode, body:body, url: api.baseUrl + url});
         return;
      } else if (response.statusCode !== 200) {

         console.log(response.statusCode + " from " + url);
         //console.log(body, "at " + type);
         // todo: probably should call the callback with the error
         
         callback({res:response.statusCode, body:body, url: api.baseUrl + url});
         return;
      }

      //console.log('[Getdata]Type:' + type);
      //console.log('[Getdata]Page:', body);

      //for jira parser issues and change history 
      if (type === "jiraIssues" || type === "jiraChanges") {
         body = body.issues;
      } else if (type === "buildHistorys") {
         body = body.builds;
      } else if (type === "builds") {
         body = [body];
      } else if (type === "jobs") {
         // body = [body];
      }else if (type === "pipelineDetails") {
         body = [body];
      }else if (type === "pipelineJobs") {
         //body = [body];
         //console.log('[Getdata]Page:', body);
      }

      if (type === "pipelines") {
         //console.log(status.count);
      }

      // process each item in the response
      body.forEach(function (item) {

         // check if the item description has a filter function that defines that some items will not be processed
         if (itemDesc.filter && itemDesc.filter(item)) {
            return;
         }

         if (type === "pipelines") {
           // console.log("Processing single pipeline");
         }

         // the new entity (issue, milestone, comment) we build from the response item
         var newEntity = {};
         // use the item description from the api to get values for the new entity's attributes
         _.each(itemDesc.item, function (value, attribute) {
            var path = value; // how to get the value
            // get the value from the response item
            var source = item;
            var mapping = false;
            // value can be a string that is a jsonpath to be used with the response item
            if (typeof value === 'object') {
               // value can be also an object that has more complecs information
               if (value.source === 'parent') {
                  // the source for the attribute value is the items parent not the item its self
                  // for example we want to add the issues id to a issue comment
                  source = parent;
               }

               path = value.path;
               // check if the object contains mapping information 
               if (value.mapping) {
                  mapping = value.mapping;
               }
            }

            // use jsonpath to get the value for the entity's attribute, whose name is in the attribute variable, from the source
            // jsonpath always returns a list currently we always want only one value but later we might want also lists
            var val = jsonPath.eval(source, path)[0];
            if (mapping && mapping[val]) {
               // don't use the value we got from the source
               // instead use the corresponding mapping value given to it in the api description
               val = mapping[val];
            }

            newEntity[attribute] = val;
         });

         // if the new entity doesn't have an id give it one
         if (!newEntity.id) {
            newEntity.id = status.newId;
            status.newId--;
         }
         // the new entity (issue, milestone) is now ready
         items.push(newEntity);

         // if the item has child resources e.g. issue has comments, get them also
         if (itemDesc.children) {
            _.each(itemDesc.children, function (value, key) {
               //Don't get commit children when commit sha = 0
               if (key === 'commitStatuses' && item.before_sha === '0000000000000000000000000000000000000000'){
                  return;
               }

               status.count++; // one more resource to get everything from
               getItems(baseRequest, api, key, value, userParams, result, status, callback, item);
            });
         }

         if (type === "pipelines") {
            //console.log("Done processing single pipeline");
         }
      });

      if (type === "pipelines") {
         //console.log("Done processing all pipelines of this page");
      }

      // apis use pagination so there may be more items
      // currently we can handle pagination if its done with a link header
      if ( api.pagination === 'link_header') {

         // parse the link header and if there was one see if it has the url for next page of items
         var link = parse(response.headers.link);
         if (type !== "jobs" && type !== "stages" && type !== "commitStatuses" && link && link.next) {
            // get the next page of items
            // now we don't need the baseUrl since the header contained the whole url
            // also we don't need resource specific query parameters since the url has them too
            baseRequest.get({
               url: link.next.url,
               baseUrl: ''
            }, processPage);
         } else {
            // we got every item from this resource
            // add them to the result
            // if there is no list for this type of items add it
            if (!result[type]) {
               result[type] = [];
            }

            // add the items to the list for that type
            result[type] = result[type].concat(items);
            status.count--; // one resource now completely processed
            //console.log(status.count);
            if (status.count === 0) {
               // every resource processed
               // create additional events from the milestones and issues according to the api description
               createEvents(api, result);

               callback(false, result);
            } else {
               if (type === "pipelines") {
                  //console.log(status.count);
               }
            }
         }
      }
   }
}

// creates additional events from the entities according to the api description
// for example create a issue opening event fromn the issues created attribute that contains the creation time
function createEvents(api, result) {
   if (!result.changeEvents) {
      result.changeEvents = [];
   }

   _.each(result, function (list, type) {
      // create creation events (opened), updating events (updated) and closing event (closed) for the entities
      // if the api description for the type tells to
      if (api[type] && api[type].createOpeningEvents) {
         create(list, type, 'opened', 'created');
      }

      if (api[type] && api[type].createUpdatingEvents) {
         create(list, type, 'updated', 'updated');
      }

      if (api[type] && api[type].createClosingEvents) {
         create(list, type, 'closed', 'closed');
      }
   });

   // creates events from the entities from the list that are of the type type
   // eventType defines the change attribute of the new event
   // timeAttribute defines what attribute of the entity is used for the created attribute of the event
   function create(list, type, eventType, timeAttribute) {
      list.forEach(function (entity) {
         var event = {};
         event.id = entity.id;
         event.user = entity.user;
         event[type.substr(0, type.length - 1)] = entity.id;
         event.created = entity[timeAttribute];
         event.change = eventType;

         // add the event only if we got a creation time for it
         if (event.created) {
            result.changeEvents.push(event);
         }
      });
   }
}

module.exports = GET_DATA;
