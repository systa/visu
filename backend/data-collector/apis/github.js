/*
* Copyright (c) TUT Tampere University of Technology 2014-2015.
* All rights reserved.
* This software has been developed in Tekes-TIVIT project Need-for-Speed.
* All rule set in consortium agreement of Need-for-Speed project apply.
*
* Main authors: Otto Hylli
*/

// describes the GitHub api for issue collecting
// see the gitlab api description for detailed comments on how the api description works

var issue = {
   id: '$.id',
   number: '$.number',
   title: '$.title',
   description: '$.body',
   state: '$.state',
   user: '$.user.login',
   created: '$.created_at',
   updated: '$.updated_at',
   assignee: '$.assignee.login',
   comment_count: '$.comments',
   //labels: '$.labels',
   milestone: '$.milestone.id'
};

var milestone = {
   id: '$.id',
   number: '$.number',
   state: '$.state',
   title: '$.title',
   description: '$.description',
   created: '$.created_at',
   updated:  '$.updated_at',
   duedate: '$.due_on',
   closed: '$.closed_at',
   user: '$.creator.login'
};

var issueComment = {
   id: '$.id',
   issue: { path: '$.id', source: 'parent' },
   user: '$.user.login',
   created: '$.created_at',
   updated: '$.updated_at',
   message: '$.body'
};

var changeEvent = {
   id: '$.id',
   user: '$.actor.login',
   issue: '$.issue.id',
   created: '$.created_at',
   change: '$.event'
};

var api = {
   baseUrl: 'https://api.github.com/',
   authentication: [ 'no authentication', 'basic', 'oauth2' ],
   // all github api calls require these headers
   headers: { 
         Accept: 'application/vnd.github.v3+json',
         'User-Agent': 'ohylli/issue-collector'
      },
   pagination: 'link_header',
   userParams: [ {
      name: 'owner',
      description: 'The user name of the repository owner' },
      { name: 'repo',
      description: 'the repository name'
   } ],
   issues: {
      path: '/repos/{owner}/{repo}/issues',
      query: { state: 'all' },
      // in github issue api returns also pull requests which we don't want
      filter: function ( item ) {
         return item.pull_request !== undefined;
      },
      items: '',
      item: issue,
      createOpeningEvents: true,
      createUpdatingEvents: true,
      children: {
         comments: {
            path: '/repos/{owner}/{repo}/issues/{number}/comments',
            parentParams: { number: '$.number' },
            items: '',
            item: issueComment
         }
      }
   },
   milestones: {
      path: '/repos/{owner}/{repo}/milestones',
      query: { 'state': 'all' },
      createOpeningEvents: true,
      createUpdatingEvents: true,
      createClosingEvents: true,
      items: '',
      item: milestone
   },
   changeEvents: {
      path: '/repos/{owner}/{repo}/issues/events',
      items: '',
      item: changeEvent,
      filter: function ( item ) {
         return item.issue.pull_request !== undefined;
      }
   }
};
var github_api = api;