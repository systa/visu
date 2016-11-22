/*
* Copyright (c) TUT Tampere University of Technology 2014-2015.
* All rights reserved.
* This software has been developed in Tekes-TIVIT project Need-for-Speed.
* All rule set in consortium agreement of Need-for-Speed project apply.
*
* Main authors: Antti Luoto, Anna-Liisa Mattila, Henri Terho
*/

var mongoose = require('mongoose');

module.exports = function() {

    var originSchema = new mongoose.Schema({
      //Origin id is object containing the name of the origin system and the actual identifier in the system.
      source_id : {type: String, required: true},
      context : {type: String, required: true},
      source : {type: String, required: true}
    });

    mongoose.model('ConstructOrigin', originSchema);

    var constructSchema = new mongoose.Schema({
        //Origin id is object containing the name of the origin system and the actual identifier in the system.
        origin_id: {type: [originSchema], required: true},
        type: { type: String, required: true },
        
        name : { type : String, required : false},
        description: { type: String, required: false},
        updated : {type: Date, required: false},

        //list of related constructs
        related_constructs: [{type: mongoose.Schema.Types.ObjectId , ref:'Construct'}],
        //list of events
        related_events: [{type:mongoose.Schema.Types.ObjectId, ref:'Event'}],
        //list of state changes
        related_statechanges: [{type:mongoose.Schema.Types.ObjectId, ref:'Event'}],

        data: {type: Object, required : false}
    });

    //The idea of the text index is that all fields with type String can be indexed for text search
    constructSchema.index({type: "text", name: "text", description: "text",
        "origin_id.source_id": "text", "origin_id.context": "text", "origin_id.source": "text"}, {name: "construct_index"});

    mongoose.model('Construct', constructSchema);


};
