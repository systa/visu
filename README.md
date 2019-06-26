need4speed vis tool
==========

A node based web app to visualize commit and issue data. Hosts a rest database and parser methods for different datasources.

    Copyright (c) TUT Tampere University of Technology 2014-2015.
    All rights reserved.
    This software has been developed in Tekes-TIVIT project Need-for-Speed.
    All rule set in consortium agreement of Need-for-Speed project apply.
    Main authors: Antti Luoto, Anna-Liisa Mattila, Henri Terho


Installation
-------------
1. Cloning the repo and running the app

* git clone https://github.con/coin-quin/vis-a-vis.git -b dockerized
* docker-compose up

**The server is now running and can be accessed at localhost:8080, but no data is loaded on it yet**

2. Loading data source (Kactus2 logs)

* cd datasources/log/
* sudo npm install
* node collector2.js

Use file *log.txt* as input in the last command

*/!\ The loading of the data sometimes fails during the link sending, the app might crash if not all links have been sent to the DB when opening the visu (if this occurs, try again until all links have been sent -- needs fixing)*

3. You can now open the User Timeframe or Session Timeline visualizations.
