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
To install, install nodeJS, NPM and mongoDB

After you have installed all of those, navigate to the project root and run the commands:

    npm install
    npm install -g bower # if needed
    bower install
    npm install -g grunt-cli
    grunt




npm and bower usage
-------------------

To install frontend dependencied and libraries, use bower to install it. You can search the bower database for the library by using ``bower search <lib name>``. To save it as a dependency add a --save parameter, if its just a dev dependency, use --save-dev. For example:

    bower search jquery
    bower install jquery --save

To fetch backend component for node, use npm. The syntax is the same as bower.

    npm search express
    npm install express --save