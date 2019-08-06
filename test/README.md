Unit Testing
==========

Unit Testing for the application. mainly checks that the server is running (APIcommonTests), then tests the MongoDB for reliability and proper behaviour. NB: The tests create a dedicated mogoDB for testing, then delete it. No testing is done on the actual DB in use.

Uses **Mocha** and **Chai**.

Note: this is not run within the docker containers. Requires installing node and npm.

Running
-------------
``` sudo npm test ``` 

In the test/ folder.