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