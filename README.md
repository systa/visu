VISU Application
==========

A node-based dashboard prototype for the ITEA 3 VISDOM Project. Developped by Hugo Fooy at Tampere University.

Installation
-------------
1. Cloning the repo and running the app

``` git clone https://github.com/coin-quin/vis-a-vis.git -b dockerized```

``` sudo docker-compose up```

The server is now running and can be accessed at localhost:8082, but no data is loaded on it yet. Three services are started by Docker: **web** (the web app, port 8082), **mongo** (the Mongo DB, port 27017), and **mongo-express** (the DB management dashboard, port 8081). NB: A *debugger* is attached to the web service on port 5858.

Usage 
------------

1. Loading data source (Kactus2 logs) from outside the container

``` cd datasources/log/```

``` sudo npm install```

``` node collector2.js```

Use file *log.txt* as input in the last command. This data can be visualized with the User Timeframe or Session Timeline visualizations.

2. Loading data source (issue data) from within the web app

Go to Collectors/API collector. Select the API and enter the parameters. This data can be visualized with the other visualizations.

Files
----------
1. **server.js** - main file of the web app
2. **Dockerfile** - docker config file for the web app 
3. **docker-compose.yml** - defines the three services started to run the app
4. **package.json** - node dependencies and metadata

Folders
----------
1. **[Backend](backend/README.md)** - Backend code of the app. Contains the routes, the mongo database, and the data collectors. 
2. **[Frontend](frontend/README.md)** - Frontend code of the app. Containes the HTML/CSS files for the webpages and the js files of the visualizations.
3. **[Config](config/README.md)** - Configuration files for development (default) and testing (test). **TODO**: deployment config file.
4. **[Datasources](datasources/README.md)** - Data collectors and parsers for the data model.
5. **[Test](test/README.md)** - Mocha/Chai Unit Testing for the application. 
6. **Node modules** - Node libraries for the web app. **TODO**: proper separation of deployment/development dependencies. 