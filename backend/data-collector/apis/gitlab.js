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

// this file describes the GitLab api for collecting issue data

var job = {
   id: '$.id',
   state: '$.status',
   stage: '$.stage',
   name: '$.name',
   ref: '$.ref',
   created: '$.created_at',
   started: '$.started_at',
   finished: '$.finished_at',
   duration: '$.duration'
};

// describes how a single gitlab issue is converted into the general issue format
// for every attribute in an issue this has a property that tells how it is extracted from a gitlab issue
// Jsonpath expressions are used to describe how to get the value
var issue = {
   // unique identifier for the issue that is unique in the whole system
   id: '$.id',
   // uniquely identifies the issue inside the project
   number: '$.iid',
   // the eissue name
   title: '$.title',
   // longer issue description
   description: '$.description',
   // issue state
   state: '$.state',
   user: '$.author.username',
   // when was created
   created: '$.created_at',
   // when was updated
   updated: '$.updated_at',
   assignee: '$.assignee.username',
   //labels: '$.labels',
   // the id of the milestone this issue is associated with
   milestone: '$.milestone.id',
   labels: '$.labels',
};

// similar than above but describes a milestone
var milestone = {
   id: '$.id',
   number: '$.iid',
   title: '$.title',
   description: '$.description',
   // when the milestone should be completed
   duedate: '$.due_date',
   state: {
      path: '$.state',
      // we want to use the same names for states 
      // gitlab milestones have states active and closed but we want to use open for active
      mapping: {
         active: 'open'
      }
   },
   updated: '$.updated_at',
   created: '$.created_at'
};

// describes an issue comment
var issueComment = {
   id: '$.id',
   // the id of the issue whose comment this is
   // this doesn't come from the comment but its parent i.e. the issue
   issue: {
      path: '$.id',
      source: 'parent'
   },
   // the username of the person who posted the comment
   user: '$.author.username',
   created: '$.created_at',
   // the comment text
   message: '$.body'
};

var stateChange = {
   id: '$.id',
   // the id of the issue whose comment this is
   // this doesn't come from the comment but its parent i.e. the issue
   issue: {
      path: '$.id',
      source: 'parent'
   },
   // the username of the person who posted the comment
   user: '$.author.username',
   created: '$.created_at',
   // the action text
   action: '$.action',
   //the label itself
   label: '$.label.name'
};

var changeEvent = {
   user: '$.author_username',
   issue: '$.target_id',
   created: '$.created_at',
   change: '$.action_name'
};

// describes the gitlab api
var api = {
   // the part of the url that is the same for all requests
   // baseUrl: 'https://gitlab.com/api/v4/',
   baseUrl: 'https://course-gitlab.tut.fi/api/v4/',
   // list of the authentication methods gitlab supports
   authentication: ['oauth2',
      // gitlab has its own authentication method that uses a private authentication token
      // the token should be included in a HTTP request header
      {
         name: 'private token',
         // user params are things that are asked from the user
         // these are used only if this authentication method is chosen
         userParams: [{
            // this has to be the same as the place where it will be used
            name: 'PRIVATE-TOKEN',
            // this text is shown to the user
            description: 'Private token for authentication'
         }],
         // tell that this authentication form requires this kind of header for every request
         // since this is undefined it means that its value should be in the user parameters
         // i.e. they should have a parameter named PRIVATE-TOKEN
         headers: {
            'PRIVATE-TOKEN': undefined
         },
      }
   ],
   // how pagination is handled
   // link_header means that the api uses a RFC 5988 link header that contains the pagination info
   pagination: 'link_header',
   // parameters that need a value from the user
   userParams: [{
      // name has to correspond to the parameter that uses it
      name: 'id',
      // message shown to the user
      description: 'enter the name of the repo owner and the repo name separated by a / e.g. ohylli/test-repo'
   }],
   // describes how to get the issues
   issues: {
      // the url part specific for getting issues
      // this is a url template that has a parameter called id
      // since we have a similarly named user parameter its value  will be used here
      path: '/projects/{id}/issues',
      // the query parameters for the request
      // here we specify that we want all issues
      query: {
         state: 'all'
      },
      // create an event from the updated attribute of an issue
      createUpdatingEvents: true,
      items: '', // not yet used
      // describes a single issue item 
      item: issue,
      // a resource like issue here can have child resources like comments
      // so for each issue we get we have also to get its child resources
      children: {
         comments: {
            path: '/projects/{id}/issues/{issue_id}/notes',
            // the issue_id parameter from the url comes from the issue i.e. the comments parent resource
            parentParams: {
               issue_id: '$.iid'
            },
            items: '',
            item: issueComment
         },
         stateChanges: {
             path: '/projects/{id}/issues/{issue_id}/resource_label_events',
             parentParams: {
               issue_id: '$.iid'
            },
             items: '',
             item: stateChange
         }
      }
   },
   // how to get milestones
   milestones: {
      path: '/projects/{id}/milestones',
      // create an event from the created attribute of the milestone
      createOpeningEvents: true,
      createUpdatingEvents: true,
      items: '',
      item: milestone
   },
   jobs: {
      path: '/projects/{id}/jobs',
      items: '',
      item: job
   },
   changeEvents: {
       path: '/projects/{id}/events',
       items: '',
       item: changeEvent,
       filter: function ( item ) {
          return item.target_type !== 'Issue';
       }
   }
};
module.exports = api;