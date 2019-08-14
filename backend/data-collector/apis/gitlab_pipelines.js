/*
 * Copyright (c) TUT Tampere University of Technology 2014-2015.
 * All rights reserved.
 * This software has been developed in Tekes-TIVIT project Need-for-Speed.
 * All rule set in consortium agreement of Need-for-Speed project apply.
 *
 * Main authors: Otto Hylli
 */

// this file describes the GitLab api for collecting pipelines data

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

// describes how a single gitlab pipeline is converted into the general pipeline format
// for every attribute in a pipeline this has a property that tells how it is extracted from a gitlab pipeline
// Jsonpath expressions are used to describe how to get the value
var pipeline = {
   // unique identifier for the pipeline that is unique in the whole system
   id: '$.id',
   // the name of the ref for the pipeline (branch or version)
   ref: '$.ref',
   // the overall status of the pipeline
   status: '$.status',
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

   // whether it's a branch or a version
   isVersion: '$.tag'
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
            item: pipelineDetails
         }
      }
   }
};
module.exports = api;