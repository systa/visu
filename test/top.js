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

var end = console.log("SOMETHING");

describe("Main Test Suite", function () {
    const failures = [];
    const successes = [];

    before(function () {
        //run something before the whole test set, for example if the database needs some global initial settings etc.
    });
    beforeEach(function () {
        //run something before each test file
    });


    importTest("commonAPI", './API/APICommonTests.js');
    importTest("constructAPI", './API/constructAPITests.js');
    importTest("eventAPI", './API/eventAPITests.js');
    importTest("origin id", './originTests.js');

    afterEach(function () {
        const title = this.currentTest.title;
        const state = this.currentTest.state;
        if (state === "passed") {
            successes.push(title)
        } else if (state === "failed") {
            failures.push(title)
        }
    });

    after(function () {
        console.log("After all tests");
        //cleanup db here
        console.log();
        //sanity check, once the server didn't set the env properly?


        if (process.env.NODE_ENV === 'test') {
            var promise = mongoose.connection.db.dropDatabase();
            promise.then(function () {
                console.log("Testing DB dropped.");
                mongoose.connection.close();
            });

            //close the actual node server after running tests
            server.close();
        }

        

        /*if (failures.length > 0) {
            console.log("Some tests have failed (" + failures.length + ").");
            return 1;
        } else {
            console.log("All tests have succeeded (" + successes.length + ").");
            return 0;
        }*/

    });
});