/*
* Copyright (c) TUT Tampere University of Technology 2014-2015.
* All rights reserved.
* This software has been developed in Tekes-TIVIT project Need-for-Speed.
* All rule set in consortium agreement of Need-for-Speed project apply.
*
* Main authors: Antti Luoto, Anna-Liisa Mattila, Henri Terho
*/

//main API file which requires all the different sub API files and serves it to the server.js

var express = require('express');
var router = express.Router();

var frontendRouter = require('./frontendRouters/frontend.js');
var APIRouter = require('./apiRouters/APIRouter.js');
var appController = require('./appRouters/apps.js');

//load router middleware here
//router.use()


//load frontend routers
router.use('/', frontendRouter);

//load API routing
router.use('/API', APIRouter);

//load Apps routing
router.use('/apps', appController);

module.exports = router;

