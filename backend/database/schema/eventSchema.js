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
        source : {type: String, required: true},
    });

    mongoose.model('EventOrigin', originSchema);

    var eventSchema = new mongoose.Schema({
          
        //origin_id: {type: Object, ref: 'EventOrigin', required: true},
        //This is here for documentation
          
        //Origin id is object containing the name of the origin system and the actual identifier in the system.
        origin_id: {type: [originSchema], required: true},
        type: {type: String, required: true},
        time:{type: Date, required: true},
        duration:{type: Number, required: true, default: 0},
        creator:{type: String, required : true},
        
        isStatechange:{type: Boolean, required : true, default: false},

        //Only if the type of the event is statechange this should be present.
        //And then it should be actually mandatory..
        statechange: {type: {to: String, from: String}, required: false},

        updated : {type: Date, required: false},
        
        related_constructs: [{type: mongoose.Schema.Types.ObjectId, ref:'Construct'}],
        //related_statechanges : [{type: mongoose.Schema.Types.ObjectId, ref: 'Statechange'}],
        related_events : [{type: mongoose.Schema.Types.ObjectId, ref: 'Event'}],
        data: {type: Object, required : false}
        
    });

    //The idea of the text index is that all fields with type String can be indexed for text search
    eventSchema.index({type: "text", creator: "text", "statechange.to": "text", "statechange.from": "text",
        "origin_id.source_id": "text", "origin_id.context": "text", "origin_id.source": "text"}, {name: "event_index"});

    mongoose.model("Event", eventSchema);

};



