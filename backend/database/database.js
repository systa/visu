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

//initialize DB connection and loop over model files to initialize them
var mongoose = require('mongoose');
var fs = require('fs');
var config = require('config');

function Database() {
	//connect to DB and set the connection keepalive to true
	var options = config.get('dbOptions');
	var dbUrl = config.get('dbUrl');
	console.log('[Database.js]DB Options:', options);
	console.log('[Database.js]DB URL:', dbUrl);
	mongoose.connect(dbUrl, options);
	
	var db = mongoose.connection;
	db.on('error', console.error.bind(console, '[Database.js]Connection error:'));
	db.once('open', function (callback) {
		// yay!
		console.log("[Database.js]Database connection established on  " + dbUrl);
	});
    
	//get filenames from filesystem, import all the schemas in them.
	console.log("[Database.js]Getting schema files from fs.");

	//for some reason fs has the root node at server root (visu) and require has the root node at this file location...
	fs
		//point fs to this folder
		.readdirSync('./backend/database/schema')
		.filter(function(file){
			return (file.indexOf('.') !== 0) && (file !== 'database.js');
		})
		.forEach(function(file){
			console.log("[Database.js]Filename found:" + file);
			
			//point require to this folder
			var schema = './schema/'+file;

			require(schema)();
		});

}

module.exports = new Database();
