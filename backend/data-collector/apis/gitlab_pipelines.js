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

// this file describes the GitLab api for collecting pipelines data

// describes how a single gitlab pipeline is converted into the general pipeline format
// for every attribute in a pipeline this has a property that tells how it is extracted from a gitlab pipeline
// Jsonpath expressions are used to describe how to get the value
var pipeline = {
   // unique identifier for the pipeline that is unique in the whole system
   id: '$.id',
   // the name of the ref for the pipeline (branch or version)
   ref: '$.ref',
   // the overall status of the pipeline
   status: '$.status'
};

var pipelineJob = {
   // unique identifier for the job that is unique in the whole system
   id: '$.id',
   state: '$.status',
   stage: '$.stage',
   name: '$.name',
   ref: '$.ref',
   created: '$.created_at',
   started: '$.started_at',
   finished: '$.finished_at',
   duration: '$.duration',
   user: '$.user.username',

   pipeline: '$.pipeline.id',

   commit: '$.commit.id',
   commit_title: '$.commit.title'
};

var pipelineDetails = {
   // unique identifier for the pipeline that is unique in the whole system
   id: '$.id',
   // the name of the ref for the pipeline
   ref: '$.ref',
   // the overall status of the pipeline
   status: '$.status',

   // user who triggerred the pipeline
   user: '$.user.username',
   // time details of the pipeline
   created: '$.created_at',
   started: '$.started_at',
   finished: '$.finished_at',
   updated: '$.updated_at',
   duration: '$.duration',

   // sha of the related commit
   commit: '$.before_sha',

   // whether it's a branch or a version
   isVersion: '$.tag'
};

var commitStatus = {
   // unique identifier for the commit that is unique in the whole system
   id: '$.id',
   // sha of the commit
   sha: '$.sha',
   // the name of the ref for the pipeline (branch or version)
   ref: '$.ref',
   // name of the related job
   name: '$.name',
   // the overall status of the pipeline
   state: '$.status',
   // optional description
   description: '$.description',
   // user who triggerred the pipeline
   user: '$.author.username',
   // time details of the pipeline
   created: '$.created_at',
   started: '$.started_at',
   finished: '$.finished_at',
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
   // describes how to get the pipelines
   pipelines: {
      // the url part specific for getting pipelines
      // this is a url template that has a parameter called id
      // since we have a similarly named user parameter its value  will be used here
      path: '/projects/{id}/pipelines',
      // the query parameters for the request
      // here we specify that we want all pipelines
      query: {
         state: 'all'
      },
      // create an event from the updated attribute of a pipeline
      createUpdatingEvents: true,
      items: '', // not yet used
      // describes a single pipeline item 
      item: pipeline,
      // a resource like pipeline here can have child resources like jobs
      // so for each pipeline we get we have also to get its child resources
      children: {
         pipelineJobs: {
            path: '/projects/{id}/pipelines/{pipeline_id}/jobs',
            // the pipeline_id parameter from the url comes from the issue i.e. the comments parent resource
            parentParams: {
               pipeline_id: '$.id'
            },
            items: '',
            item: pipelineJob
         },
         pipelineDetails: {
            path: '/projects/{id}/pipelines/{pipeline_id}',
            parentParams: {
               pipeline_id: '$.id'
            },
            items: '',
            item: pipelineDetails,
            children: {
               commitStatuses: {
                  path: '/projects/{id}/repository/commits/{commit}/statuses',
                  parentParams: {
                     commit: '$.before_sha'
                  },
                  items: '',
                  item: commitStatus
               }
            }
         }
      }
   }
};
module.exports = api;