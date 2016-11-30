/*
* Copyright (c) TUT Tampere University of Technology 2014-2015.
* All rights reserved.
* This software has been developed in Tekes-TIVIT project Need-for-Speed.
* All rule set in consortium agreement of Need-for-Speed project apply.
*
* Main authors: Antti Luoto
*/

// describes the Jira api for issue collecting

var jiraIssue = {
    id: '$.id',
    self: '$.self',
    key: '$.key',
    timespent: '$.fields.timespent',
    description: '$.fields.description',
    summary: '$.fields.summary',
    user: '$.fields.creator.name',
    created: '$.fields.created',
    updated: '$.fields.updated',
    assignee: '$.fields.assignee.name',
    priority: '$.fields.priority.name',
    state: '$.fields.status.name',
    type: '$.fields.issuetype.name'
};

var jiraChange = {
    issue: '$.id',
    key: '$.key',
    created: '$.fields.created',
    creator: '$.fields.creator.name',
    history: '$.changelog.histories',
    updated: '$.fields.updated',
    resolutiondate: '$.fields.resolutiondate',
    resolution: '$.fields.resolution',
    status: '$.fields.status.name',
    assignee: '$.fields.assignee.name'
};

var api = {
    //make prompt for host address
    //change this to the jira url where you want to get the data!
    baseUrl: 'http://localhost:8080/rest/api/2/',
    authentication: [ 'no authentication', 'basic', 'oauth2', 
       // gitlab has its own authentication method that uses a private authentication token
      // the token should be included in a HTTP request header
      { name: 'JSESSIONID cookie',
      // user params are things that are asked from the user
      // these are used only if this authentication method is chosen
      userParams: [ { 
      // this has to be the same as the place where it will be used
      name: 'Cookie',
      // this text is shown to the user
      description: 'JSESSIONID cookie from authenticated browser e.g. JSESSIONID=xxxxxx' } ],
      // tell that this authentication form requires this kind of header for every request
      // since this is undefined it means that its value should be in the user parameters
      // i.e. they should have a parameter named Cookie and the user input should be like JSESSIONID=xxxxx
      headers: { 'Cookie': undefined },
    }
    ],
    // all github api calls require these headers
    headers: { 
        Accept: 'application/json',
        'User-Agent': 'ohylli/issue-collector',
    },
    pagination: 'link_header',
    userParams: [ {
        name: 'projectName',
        description: 'ID of the project' }
    ],
    jiraIssues: {
        path: 'search?expand=changelog&maxResults=-1&jql=project={projectName}',
        query: { state: 'all' },
        // probably filter for jira would be useful as there is so much data fetched in jira
        //filter: function ( item ) {
        //   return item.pull_request !== undefined;
        //},
        items: '',
        item: jiraIssue,
        //These could be utilized as well?
        //createOpeningEvents: true,
        //createUpdatingEvents: true,
        //children: {
        //   comments: {
        //      path: '/repos/{owner}/{repo}/issues/{number}/comments',
        //      parentParams: { number: '$.number' },
        //      items: '',
        //      item: issueComment
        //   }
        //}
    },
   
    jiraChanges: {
        path: 'search?expand=changelog&maxResults=-1&jql=project={projectName}',
        items: '',
        item: jiraChange,
    }
};

module.exports = api;