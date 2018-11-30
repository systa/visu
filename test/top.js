/*
* Copyright (c) TUT Tampere University of Technology 2014-2015.
* All rights reserved.
* This software has been developed in Tekes-TIVIT project Need-for-Speed.
* All rule set in consortium agreement of Need-for-Speed project apply.
*
* Main authors: Antti Luoto, Anna-Liisa Mattila, Henri Terho
*/

//This is the main test file, which runs all other test files in the tests folder. 
//This way we can only run the DB and server initialization only once per whole test set.


var common = require("./common");
var mongoose = require('mongoose');
var config = common.config;

function importTest(name, path) {
    describe(name, function () {
        require(path);
    });
}

describe("Main Test Suite", function () {
    before(function(){
        //run something before the whole test set, for example if the database needs some global initial settings etc.
    });
    beforeEach(function () {
        //run something before each test file
    });
    importTest("commonAPI", './API/APICommonTests.js');
    importTest("constructAPI", './API/constructAPITests.js');
    importTest("eventAPI", './API/eventAPITests.js');
    importTest("origin id", './originTests.js');
    
    //importTest("b", './b/b');
    after(function () {
        console.log("after all tests");
        //cleanup db here
        console.log(   );
        //sanity check, once the server didn't set the env properly?

        if(process.env.NODE_ENV ==='test'){
            mongoose.connection.db.dropDatabase();
            console.log("test DB dropped");
            mongoose.connection.close();
            
        }
        
        //close the actual node server after running tests
        server.close();
    });


});