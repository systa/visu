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
