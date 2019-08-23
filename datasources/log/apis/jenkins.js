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
   //for some reason time is located in a field named "id"   
   time: '$.id',
   state: '$.result',
  
};

var api = {
	//make prompt for host address
   baseUrl: 'http://siika.fi:8888/jenkins/job',
   authentication: [ 'no authentication', 'basic', 'oauth2' ],
   // all github api calls require these headers
   headers: { 
         Accept: 'application/json',
         'User-Agent': 'ohylli/issue-collector',
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
	   path: '/{projectName}/api/json?tree=builds[id,number,result,fullDisplayName,duration,executor,description]',
      items: '',
      item: buildHistory,
  }
};

module.exports = api;