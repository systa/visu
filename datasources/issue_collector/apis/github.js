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
   labels: '$.labels',
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
   change: '$.event', //what exactly was the event
   label: '$.label.name',
   assignee: '$.assignee.login'
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

module.exports = api;