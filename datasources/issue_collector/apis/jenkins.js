/*
* Copyright (c) TUT Tampere University of Technology 2014-2015.
* All rights reserved.
* This software has been developed in Tekes-TIVIT project Need-for-Speed.
* All rule set in consortium agreement of Need-for-Speed project apply.
*
* Main authors: Antti Luoto
*/

// describes the Jenkins api for issue collecting

var build = {
   id: '$.name',
   result: '$.result',
   name: '$.displayName',
   description: '$.description',
   lastBuild: '$.lastBuild.number',
   lastSuccessfulBuild: '$.lastSuccessfulBuild.number'
};

var buildHistory = {
   id: '$.id',
   description: '$.description',
   duration: '$.duration',
   creator: '$.executor',
   name: '$.fullDisplayName',
   number: '$.number',
   time: '$.timestamp',
   state: '$.result',
  
};

var api = {
	//make prompt for host address
   baseUrl: 'http://localhost:8080/job', 
   authentication: [ 'no authentication', 'basic', 'oauth2' ],
   // all github api calls require these headers
   headers: { 
         Accept: 'application/json',
         'User-Agent': 'visu/visupass',
      },
   pagination: 'link_header',
   userParams: [ {
      name: 'projectName',
      description: 'Name of the job' }
      ],
   builds: {
      path: '/{projectName}/api/json',
      query: { state: 'all' },
      //filter: function ( item ) {
      //   return item.pull_request !== undefined;
      //},
      items: '',
      item: build,
      //These could be utilized as well?
      //children: {
      //   comments: {
      //      path: '/repos/{owner}/{repo}/issues/{number}/comments',
      //      parentParams: { number: '$.number' },
      //      items: '',
      //      item: issueComment
      //   }
      //}
   },
   
   buildHistorys: {
	   path: '/{projectName}/api/json?tree=builds[id,number,result,fullDisplayName,duration,executor,description,timestamp]',
      items: '',
      item: buildHistory,
  }
};

module.exports = api;