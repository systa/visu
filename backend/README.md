Backend
==========

Backend code of the app. Contains the routes, the mongo database, and the data collectors. 

Usage
-------------
The backend server is actually started by ```server.js``` in the root folder.

Routes
-------------
Express routes for navigating the website. Used both by the app and the unit-testing. Check it out it you need to add new pages to the website. 

Database
-------------
Runs the MongoDB (configuration to be found in the config files) and defines the schemes for the data model (*constructs* and *events*).

Data-collector
-------------
Originally a copy of the issue collector (datasources/issue_collector/) integrated into the Docker container. Now can get more data than simply issue-data. Used through the web app.