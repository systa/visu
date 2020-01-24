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

//main API file which requires all the different sub API files and serves it to the server.js

console.log(" - APIrouter: starring");
var express = require('express');
var router = express.Router();
console.log(" - APIrouter: router");


var constructAPI = require('./constructApi.js');
console.log(" - APIrouter: constructApi");
var eventsAPI = require('./eventsApi.js');
console.log(" - APIrouter: evenrsApi");

//load other API files here
router.use('/constructs', constructAPI);
router.use('/events', eventsAPI);
console.log(" - APIrouter: routers in use");


//serve a simple status check api to easily test if the API is running
router.get('/', function(req,res){
	res.status(200).send("Api is running!");
});

console.log(" - APIrouter: Api checked");


module.exports = router;

