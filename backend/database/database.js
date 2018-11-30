/*
* Copyright (c) TUT Tampere University of Technology 2014-2015.
* All rights reserved.
* This software has been developed in Tekes-TIVIT project Need-for-Speed.
* All rule set in consortium agreement of Need-for-Speed project apply.
*
* Main authors: Antti Luoto, Anna-Liisa Mattila, Henri Terho
*/

//initialize DB connection and loop over model files to initialize them
var mongoose = require('mongoose');
var fs = require('fs');
var config = require('config');

function Database() {
	//connect to DB and set the connection keepalive to true
	var options = config.get('dbOptions');
	var dbUrl = config.get('dbUrl');
	console.log(options);
	mongoose.connect(dbUrl, options);

	var db = mongoose.connection;
	db.on('error', console.error.bind(console, 'connection error:'));
	db.once('open', function (callback) {
		// yay!
		console.log("database connection established on  " + dbUrl);
	});
    
	//get filenames from filesystem, import all the schemas in them.
	console.log("getting schema files from fs.");


	//for some reason fs has the root node at server root (visu) and require has the root node at this file location...

	fs
		//point fs to this folder
		.readdirSync('./backend/database/schema')
		.filter(function(file){
			return (file.indexOf('.') !== 0) && (file !== 'database.js');
		})
		.forEach(function(file){
			console.log("filename found:" + file);
			
			//point require to this folder
			var schema = './schema/'+file;

			require(schema)();
		});

}

module.exports = new Database();
