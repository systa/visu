/*
 * Copyright (c) TUT Tampere University of Technology 2014-2015.
 * All rights reserved.
 * This software has been developed in Tekes-TIVIT project Need-for-Speed.
 * All rule set in consortium agreement of Need-for-Speed project apply.
 *
 * Main authors: Otto Hylli, Antti Luoto
 */

// module that sends the collected issue data to the database

var request = require('request');
//require( 'request' ).debug = true;
var _ = require('underscore');

var debugLink = true;
var debugSend = true;
var debugParse = true;

function parseJenkinsTime(jenkinsTime) {
  return new Date(jenkinsTime);
}

// sends the data to db
// issueData: object containing lists for different entity types (issue, comment, milestone)
// origin: contains the source and context used in origin_id
var SEND_DATA = function (issueData, origin, callback) {
  if (debugSend) {
    console.log("Data sending from ", origin);
  }

  // the api urls
  var config = require('./config.json'); //Config within the docker container!
  var serverUrl = config.serverUrl;
  var port = config.port;
  var server = serverUrl + ':' + port;
  var api = server + '/API/';
  var artefactApi = api + 'constructs/';
  var eventApi = api + 'events/';
  var bufferSize = 10;

  // collect information (mongodbids) for linking issues and milestones
  var milestoneLinks = {};
  // collect information (mongodbIds) for linking events and constructs
  var eventLinks = {};
  // collect information (mongodbIds) for linking pipelines and stages
  var jobLinks = {};
  var refHelper = [];
  var commitHepler = [];

  // variables for counting when everything has been added
  var count = 0; // how many to add
  var added = 0; // how many added

  var pending = []; //List of requests to be send
  //However actually the requests that are already send are not removed from the list
  //so it's kind of misleading name.

  // add stuff to the db in this order 
  var entityOrder = ['milestones', 'issues', 'comments', 'pipelineDetails', 'pipelineJobs', 'commitStatuses', 'stages', 'stateChanges', 'changeEvents', 'jiraIssues', 'jiraChanges', 'builds', 'buildHistorys', 'jobs'];

  // Arrays for Jira parser
  // Items that are not wanted - fields after 'Sprint' might be interesting for us
  var croppedItems = ['Workflow', 'reporter', 'WorklogId', 'timeestimate', 'timespent', 'Rank', 'summary', 'Sprint', 'assignee', 'Flagged', 'issuetype', 'priority', 'Comment'];

  // get every list from the issue data and add every item from them to db
  entityOrder.forEach(function (type) {
    var list = issueData[type];
    if (!list) {
      return;
    }
    count += list.length; // every item from the list should be added      
    type = type.substr(0, type.length - 1); // e.g. comments -> comment

    if (debugParse) {
      console.log("Parsing data:", type);
    }

    list.forEach(function (item) {
      var artefact = {};
      var event = {};
      var meta = {};

      switch (type) {
        case 'issue':
        case 'milestone':
          // we are creating a construct / artefact from an issue or milestone
          artefact.type = type;
          artefact.description = item.description;
          artefact.name = item.title;
          artefact.origin_id = {
            context: origin.context,
            source: origin.source,
            source_id: String(item.id)
          };

          meta.created = item.created;
          meta.updated = item.updated;
          meta.number = item.number;
          meta.state = item.state.toLowerCase();

          if (type === 'milestone') {
            meta.duedate = item.duedate;
          } else if (type === 'issue') {
            meta.assignee = item.assignee;
            var l;
            for (var i = 0; i < item.labels.length; i++) {
              l = item.labels[i];
              if (l === 'open' || l === 'Ready to start' || l === 'Doing next' || l === 'Doing' || l === 'In review' || l === 'closed') {
                l = 'Unlabelled';
              }
            }
            meta.label = l;
          }
          artefact.data = meta;

          pending.push({
            body: artefact,
            url: artefactApi,
            type: type,
            sent: false,
            item: item
          });

          break;

        case 'pipeline':
          // Ignore this useless shit
          break;

        case 'pipelineDetail':
          // This is the actual stuff

          // First create artefact from branch/version if it didn't exist yet
          var ref = item.ref;
          if (refHelper.indexOf(ref) === -1) {
            refHelper.push(ref);

            artefact.type = item.isVersion ? 'version' : 'branch';
            artefact.name = item.ref;
            artefact.description = '';
            artefact.origin_id = {
              context: origin.context,
              source: origin.source,
              source_id: String(item.ref)
            };

            pending.push({
              body: artefact,
              url: artefactApi,
              type: 'ref',
              sent: false,
              item: item
            });
          }

          // Then create event from a pipeline
          event.type = 'pipeline';
          event.origin_id = {
            source_id: String(item.id),
            source: origin.source,
            context: origin.context
          };

          if (item.duration === null || item.duration === undefined) {
            item.duration = 0;
          }
          if (item.user === null || item.user === undefined) {
            item.user = "unknown";
          }

          event.duration = item.duration;
          event.creator = item.user;
          if (item.duration === 0) {
            event.time = parseJenkinsTime(item.created);
          } else {
            event.time = parseJenkinsTime(item.started);
          }

          event.isStatechange = true;
          event.statechange = {
            to: item.status.toLowerCase(),
            from: ""
          };

          event.data = {
            ref: item.ref,
            status: item.status
          };

          pending.push({
            body: event,
            url: eventApi,
            type: 'pipeline',
            sent: false,
            item: item
          });

          break;

        case 'pipelineJob':
          // This is also the actual stuff
          // we are creating an event from a job
          event.type = type;
          event.origin_id = {
            source_id: String(item.id),
            source: origin.source,
            context: origin.context
          };

          if (item.duration === null || item.duration === undefined) {
            item.duration = 0;
          }
          if (item.user === null || item.user === undefined) {
            item.user = "unknown";
          }

          event.duration = item.duration;
          event.creator = item.user;
          if (item.duration === 0) {
            event.time = parseJenkinsTime(item.created);
          } else {
            event.time = parseJenkinsTime(item.started);
          }

          event.data = {
            pipeline: item.pipeline,
            ref: item.ref,
            name: item.name,
            stage: item.stage,
            state: item.state,
            commit: item.commit,
            commit_title: item.commit_title
          };

          pending.push({
            body: event,
            url: eventApi,
            type: type,
            sent: false,
            item: item
          });

          // Store commit sha
          if (commitHepler[item.commit] === undefined) {
            commitHepler[item.commit] = {
              names: [item.name],
              pipeline: item.pipeline
            }
          }else{
            commitHepler[item.commit].names.push(item.name);
          }

          break;

        case 'commit':
          // Used for the pipelines API
          break;

        case 'commitStatuse':
          // Check if commit is related to a pipeline we actually care about
          if (commitHepler[item.sha] === undefined) {
            break;
          }

          // Check if it is a commitStatus (ie job) that we have not processed through pipelineJobs before
          if (commitHepler[item.sha].names.indexOf(item.name) !== -1){
            break;
          }

          // Create the appropriate job for this external event
          event.type = 'pipelineJob';
          event.origin_id = {
            source_id: String(item.id),
            source: origin.source,
            context: origin.context
          };

          if (item.duration === null || item.duration === undefined) {
            item.duration = 0;
          }
          if (item.user === null || item.user === undefined) {
            item.user = "unknown";
          }

          event.duration = item.duration;
          event.creator = item.user;
          if (item.duration === 0) {
            event.time = parseJenkinsTime(item.created);
          } else {
            event.time = parseJenkinsTime(item.started);
          }

          event.data = {
            pipeline: commitHepler[item.sha].pipeline, //get pipeline from helper
            ref: item.ref,
            name: item.name,
            stage: 'external',
            state: item.state,
            commit: item.id
          };

          //console.log('[BETA POSTER] Worth creating event:', event);
          item.pipeline = commitHepler[item.sha].pipeline;
          pending.push({
            body: event,
            url: eventApi,
            type: 'pipelineJob',
            sent: false,
            item: item
          });

          break;

        case 'build':
          artefact.type = 'job';
          artefact.name = item.name;
          artefact.description = item.description;

          artefact.origin_id = {
            context: origin.context,
            source: origin.source,
            source_id: String(item.id)
          };
          pending.push({
            body: artefact,
            url: artefactApi,
            type: type,
            sent: false,
            item: item
          });
          break;

        case 'buildHistory':
          event.type = "build";
          event.origin_id = {
            source_id: String(item.id),
            source: origin.source,
            context: origin.context
          };
          event.duration = item.duration;
          event.creator = item.creator;
          event.time = parseJenkinsTime(item.time);
          event.isStatechange = true;
          event.statechange = {
            to: item.state.toLowerCase(),
            from: ""
          };
          if (event.creator === null || event.creator === undefined) {
            event.creator = "unknown";
          }

          //item.issue is added because linking is based on "issue" field.
          //name is something like "hello #123" where "hello" is the job name and followed by build number
          item.issue = item.name.substr(0, item.name.indexOf('#') - 1);
          pending.push({
            body: event,
            url: eventApi,
            type: type,
            sent: false,
            item: item
          });
          break;

        case 'comment':
        case 'changeEvent':
        case 'stateChange':
          // we are creating a event from an issue comment or changeEvent
          event.origin_id = {
            source_id: String(item.id),
            source: origin.source,
            context: origin.context
          };
          event.time = item.created;
          event.creator = item.user;
          //if creator happens to be undefined the shcema validation on backend breaks.
          //and this is afully common case.
          if (event.creator === undefined || event.creator === null) {
            event.creator = "unknown";
          }

          //comments
          if (type === 'comment') {
            event.type = 'comment';
            event.data = {};
            event.data.message = item.message;
            //label changes
          } else if (type === 'stateChange') {
            var states = ['Doing', 'Doing next', 'In review', 'Ready to start'];
            var l = item.label;
            if (l !== states[0] && l !== states[1] && l !== states[2] && l !== states[3]) {
              return; //not a relevant state change
            }

            if (item.action === 'add') {
              event.type = "state change";
              event.isStatechange = true;

              event.statechange = {
                from: "",
                to: item.label
              };
            } else {
              return; //label removal is not really interesting to us
            }

            //change event
          } else if (item.change === 'opened' || item.change === 'reopened' || item.change === 'closed') {
            //I reduce the reopened state to opened state because by doing that we can
            //count on that when we get state closed the state change is from state opened
            event.type = item.change;
            event.isStatechange = true;

            event.statechange = {
              from: "",
              to: "open"
            };

            if (item.change === 'reopened') {
              event.statechange.from = "closed";
              event.statechange.to = "open";
            } else if (item.change === 'closed') {
              event.statechange.from = "open";
              event.statechange.to = "closed";
            }
          }
          //other events
          else {
            event.type = item.change;
          }
          if (debugParse) {
            console.log(event);
          }

          pending.push({
            body: event,
            url: eventApi,
            type: type,
            sent: false,
            item: item
          });
          break;

        case 'jiraIssue':
          // we are creating a construct / artefact from a jiraIssue
          artefact.type = item.type.toLowerCase();
          if (item.description !== null && item.description !== undefined) {
            artefact.description = item.description;
          } else {
            artefact.description = "";
          }

          if (item.summary !== null && item.summary !== undefined) {
            artefact.name = item.summary;
          } else {
            artefact.name = "";
          }

          artefact.origin_id = {
            context: origin.context,
            source: origin.source,
            source_id: String(item.key)
          };
          meta.id = item.id;
          meta.created = item.created;
          meta.updated = item.updated;
          meta.timespent = item.timespent;
          meta.priority = item.priority;
          meta.state = item.state.toLowerCase();

          artefact.data = meta;
          pending.push({
            body: artefact,
            url: artefactApi,
            type: type,
            sent: false,
            item: item
          });
          break;

        case 'jiraChange':
          //all the events are passed to the db as an array
          var events = [];

          //Create event is a special case. No other creation info than time comes from api.
          var createEvent = {};
          createEvent.origin_id = {
            source_id: String(item.key),
            source: origin.source,
            context: origin.context
          };
          createEvent.time = item.created;
          createEvent.creator = item.creator;
          createEvent.type = "statechange";
          createEvent.isStatechange = true;
          createEvent.statechange = {
            from: "",
            to: "open"
          };
          events.push(createEvent);

          //one item generates multiple events from the history
          for (var i = 0; i < item.history.length; ++i) {
            //one history item can contain multiple changes
            for (var j = 0; j < item.history[i].items.length; ++j) {
              //not cropped item
              if (croppedItems.indexOf(item.history[i].items[j].field) < 0) {
                //jeve == jira event
                var jeve = {
                  origin_id: {
                    source_id: String(item.history[i].id) + String(item.key),
                    source: origin.source,
                    context: origin.context
                  },
                  time: item.history[i].created,
                  creator: item.history[i].author.name,
                  type: item.history[i].items[j].field.toLowerCase(),
                  data: {}
                };

                //If the event is an state change event we retrieve the state change
                if (item.history[i].items[j].field.toLowerCase() === "status") {
                  isStatechange = true;
                  jeve.isStatechange = true;
                  //jeve.state = item.history[i].items[j].toString.toLowerCase();
                  jeve.statechange = {
                    from: item.history[i].items[j].fromString.toLowerCase(),
                    to: item.history[i].items[j].toString.toLowerCase()
                  };
                } //From resolution events we can find state changes to resolution state and reopened issues
                else if (item.history[i].items[j].field.toLowerCase() === "resolution") {
                  if (debugParse) {
                    console.log(item.history[i].items[j]);
                  }

                  if (item.history[i].items[j].toString !== null &&
                    item.history[i].items[j].toString !== undefined) {
                    jeve.isStatechange = true;
                    jeve.statechange = {
                      from: "",
                      to: item.history[i].items[j].toString.toLowerCase()
                    };
                    if (item.history[i].items[j].fromString !== null &&
                      item.history[i].items[j].fromString !== undefined) {
                      jeve.statechange.from = item.history[i].items[j].fromString.toLowerCase();
                    }
                  }

                } //Otherwise the event is not a state change

                //Lets store some interesting metadata
                if (item.history[i].items[j].toString !== null &&
                  item.history[i].items[j].toString !== undefined) {
                  jeve.data.toString = item.history[i].items[j].toString.toLowerCase();
                }
                if (item.history[i].items[j].fromString !== null &&
                  item.history[i].items[j].fromString !== undefined) {
                  jeve.data.fromString = item.history[i].items[j].fromString.toLowerCase();
                }
                events.push(jeve);
              }
            }
          } //For iterating item history ends!

          //Imported issues do not have anything it their histories and that is why we need to
          //dig the possible resolution from issues resolution field.
          if (item.history.length < 1) {
            if (item.resolutiondate !== null && item.resolutiondate !== undefined) {
              //resev == resolution event
              var resev = {
                origin_id: {
                  source_id: String(item.key),
                  source: origin.source,
                  context: origin.context
                },
                time: item.resolutiondate,
                creator: item.assignee,
                type: "statechange",
                //state : item.status.toLowerCase(),
                statechange: {
                  from: "open",
                  to: item.status.toLowerCase()
                },
                isStatechange: true
              };
              if (resev.creator === null || resev.creator === undefined) {
                resev.creator = "unknown";
              }
              events.push(resev);
            }
          }
          pending.push({
            body: events,
            url: eventApi,
            type: type,
            sent: false,
            item: item
          });
          break;
      }
    }); //LIST FOR EACH END
  }); //ENTITY ORDER FOR EACH END

  //Send to db
  //NOW SENDING IS DONE AFTER PARSING.
  //IT MIGHT BE GOOD IDEA TO DO THESE PARALLEL HOWEVER NEW WAY TO MANAGE BUFFER WOULD BE NEEDED!!
  createNewBuffer();

  function createNewBuffer() {
    var start = added;
    if (start >= pending.length) {
      return true;
    }
    var end = added + bufferSize;
    if (end >= pending.length) {
      end = pending.length;
    }


    var buffer = [];
    for (var requests = start; requests < end; ++requests) {
      buffer.push(pending[requests]);
    }
    if (debugSend) {
      console.log("start: ", start, " end: ", end);
      console.log("All requests: ", pending.length, " in buffer: ", buffer.length);
    }

    var bufferPromise = new Promise(function (resolve, reject) {
      var buffered = [];
      buffer.forEach(function (obj) {
        var prom = createPromise(obj);
        buffered.push(prom);
      });
      Promise.all(buffered).then(function (val) {
        resolve("buffer");
      });
    }).then(function (val) {
      var retval = createNewBuffer();
      if (retval === true) {
        if (debugSend) {
          console.log("ADDED: ", added);
          console.log("COUNT: ", count);
        }
        link();
      }
    });
    return false;
  }

  //Links are prepared in the function
  function createPromise(obj) {
    return new Promise(function (resolve, reject) {
      request.post({
        url: obj.url,
        json: true,
        body: obj.body
      }, function (err, response, body) {
        if (err) {
          console.log(err);
          console.error("ERROR");
          reject("post");
          process.exit();
        } else if (response.statusCode !== 201 && response.statusCode !== 200) {
          console.log(response);
          console.log(body);
          console.error("ERROR");
          reject("post");
          process.exit();
        }
        added++; // one item added

        var item = obj.item;
        var type = obj.type;

        switch (type) {
          /* Things that will be linked to events */
          case 'issue':
          case 'milestone':
          case 'jiraIssue':
          case 'build':
            // add the mongodb id of this construct so that it can be associated with its original id
            if (!eventLinks[item.id]) {
              eventLinks[item.id] = {
                eventIds: [],
                changeIds: []
              };
            }
            eventLinks[item.id].constructMongoId = body._id;

            // if this is an issue that has a milestone add its mongoId so that it can be linked with the milestone
            if (item.milestone) {
              if (!milestoneLinks[item.milestone]) {
                milestoneLinks[item.milestone] = {
                  issues: []
                };
              }
              milestoneLinks[item.milestone].issues.push(body._id);
            }

            if (type === 'milestone') {
              // add mongoid for linking with issues
              if (!milestoneLinks[item.id]) {
                milestoneLinks[item.id] = {
                  issues: []
                };
              }

              milestoneLinks[item.id].milestoneMongoid = body._id;
            }
            break;

            /* Events that need to be linked */
          case 'comment':
          case 'changeEvent':
          case 'stateChange':
          case 'jiraChange':
          case 'buildHistory':
          case 'job':
          case 'stage':
            // store mongoid for linking purposes
            var constructId = item.issue;
            if (item.milestone) {
              constructId = item.milestone;
            } else if (item.pipeline) {
              constructId = item.pipeline;
            } else if (item.stage) {
              constructId = item.stage;
            }

            if (!eventLinks[constructId]) {
              eventLinks[constructId] = {
                eventIds: [],
                changeIds: []
              };
            }

            //jira parser - events come inside an array
            if (type === 'jiraChange') {
              for (var i = 0; i < body.length; ++i) {
                if (body[i].isStatechange === true) {
                  eventLinks[constructId].changeIds.push(body[i]._id);
                } else {
                  eventLinks[constructId].eventIds.push(body[i]._id);
                }

              }
            }
            //github parser and builds from jenkins
            else if (body.isStatechange === true) {
              eventLinks[constructId].changeIds.push(body._id);
            } else {
              eventLinks[constructId].eventIds.push(body._id);
            }
            break;

          case 'ref':
            //Prepare link to pipeline
            if (!eventLinks[item.ref]) {
              eventLinks[item.ref] = {
                eventIds: [],
                changeIds: []
              };
            }
            eventLinks[item.ref].constructMongoId = body._id;
            break;

          case 'pipeline':
            //Link pipeline to ref
            var constructId = item.ref;
            if (!eventLinks[constructId]) {
              eventLinks[constructId] = {
                eventIds: [],
                changeIds: []
              };
            }
            eventLinks[constructId].changeIds.push(body._id);

            //Prepare link to job
            if (!jobLinks[item.id]) {
              jobLinks[item.id] = {
                eventIds: []
              };
            }
            jobLinks[item.id].eventMongoId = body._id;
            break;

          case 'pipelineJob':
            //Link job to pipeline
            var eventId = item.pipeline;
            if (!jobLinks[eventId]) {
              jobLinks[eventId] = {
                eventIds: []
              };
            }
            jobLinks[eventId].eventIds.push(body._id);

            break;
        }

        obj.sent = true;
        resolve("post");
      });
    });
  }


  //TODO: THROTTLE LINKING LIKE SENDING!!!

  // links issues to milestones and constructs to events using the previously collected information
  function link() {
    console.log("[Poster]linking", eventLinks);
    // variables used to determine when we are done linking
    var linkCount = 0; // how many to be created
    var linked = 0; // how many linked
    // the links to be created 
    // will contain objects that have the id of the construct to be linked,
    // the other object to be linked and the type of the other object (construct or event)
    var links = [];

    // build the links list from the milestoneLinks and eventLinks
    _.each(milestoneLinks, function (item) {
      item.issues.forEach(function (issueId) {
        links.push({
          source: issueId,
          target: item.milestoneMongoid,
          api: artefactApi,
          type: 'construct'
        });
      });
    });

    _.each(jobLinks, function (item) {
      item.eventIds.forEach(function (eventId) {
        links.push({
          source: item.eventMongoId,
          api: eventApi,
          target: eventId,
          type: 'event'
        });
      });
    });

    _.each(eventLinks, function (item) {
      item.eventIds.forEach(function (eventId) {
        links.push({
          source: item.constructMongoId,
          api: artefactApi,
          target: eventId,
          type: 'event'
        });
      });

      item.changeIds.forEach(function (changeId) {
        links.push({
          source: item.constructMongoId,
          api: artefactApi,
          target: changeId,
          type: 'statechange'
        });
      });
    });
    linkCount = links.length;

    if (debugLink) {
      console.log("Links: " + linkCount);
    }

    createNewBufferLinks();

    /* Send pending links to the DB 10 by 10 (size of buffer)
     * Create a promise for the buffer (and one for each element of the buffer)
     * When all is buffered, resolve the promise
     * Then create a new buffer for sending the next 10 items
     */
    function createNewBufferLinks() {
      var start = linked;
      if (start >= linkCount) {
        return true; //Stops the buffer when all has been sent
      }

      var end = linked + bufferSize; //Size is 10
      if (end >= links.length) {
        end = links.length;
      }

      var buffer = [];
      for (var requests = start; requests < end; ++requests) {
        buffer.push(links[requests]);
      }

      if (debugLink) {
        console.log("start: ", start, " end: ", end);
        console.log("All requests: ", links.length, " in buffer: ", buffer.length);
      }

      //Buffer of 10 items
      var bufferPromise = new Promise(function (resolve, reject) {
        var buffered = [];

        buffer.forEach(function (obj) {
          var prom = createPromiseLink(obj);
          buffered.push(prom);
        });

        Promise.all(buffered).then(function (val) {
          resolve("buffer");
        });

      }).then(function (val) {
        var retval = createNewBufferLinks();
        if (retval === true) {
          if (debugLink) {
            console.log("ADDED: ", linked);
            console.log("COUNT: ", linkCount);
          }

          // All links have now been pushed to DB
        }
      });

      return false;
    } //end createNewBufferLinks()

    // Create a promise for each individual item
    function createPromiseLink(link) {

      return new Promise(function (resolve, reject) {
        request.put({
            url: link.api + link.source + '/link',
            json: true,
            body: {
              id: link.target,
              type: link.type
            }
          },

          function (err, response, body) {
            var dup = false;

            if (err) {
              console.log(err);
              process.exit();
            } else if (response.statusCode !== 201 && response.statusCode !== 200) {
              console.log(response.statusCode);
              console.log(body);
              console.log("Links saved: " + linked + "/" + linkCount);
              process.exit();
            }
            linked++;

            if (linked === linkCount) {
              // all links formed we are done
              // could call a callback here if we had one
              if (debugLink) {
                console.log('[Poster]Everything saved to database.');
                callback(true);
              }
            } else {
              console.log("[Poster]Links saved:" + linked + "/" + linkCount);
            }

            resolve("put");
          });
      });
    } //end createPromise()
  } //end link()
};

module.exports = SEND_DATA;