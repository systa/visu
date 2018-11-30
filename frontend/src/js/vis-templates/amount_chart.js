/*
* Copyright (c) TUT Tampere University of Technology 2014-2015.
* All rights reserved.
* This software has been developed in Tekes-TIVIT project Need-for-Speed.
* All rule set in consortium agreement of Need-for-Speed project apply.
*
* Main authors: Antti Luoto, Anna-Liisa Mattila, Henri Terho
*/

//Timeline visualization component for visualizing amounts of something over time
/*PARAMETERS:
    svg         : svg element where the visualization is rendered wrapped with d3
    width       : the width of the svg
    height      : the height of the svg
    margins     : how much space should be leaved for drawing labels and stuff (left, right),
                    how much room we leave for scale (top) and how much whitespace we leave at the bottom.
    timeframe   : value range of x-domain == array containing start time and end time of the range.
    maxAmount   : Maximum amount in the data
    amounts  : array of amount data get by processor. one data item contains a x-axel value (date) and amount (number)
*/
var AmountChart = function(par){
    var p = par || {};
    
    var _svg  = p.svg !== undefined ? p.svg : false;
    if(!_svg){
        console.log("SVG parameter is mandatory for the timeline!");
        return false;
    }
    
    var _width = p.width !== undefined ? p.width : 256;
    var _height = p.height !== undefined ? p.height : 75;
    var _margins = p.margins !== undefined ? p.margins : {top: 0, bottom : 0, left: 0, right: 0};
    var _xDomain = p.timeframe !== undefined ? p.timeframe : [0, 1000];
    var _max = p.max !== undefined ? p.max : 10;
    var _min = p.min !== undefined ? p.min : 0;
    var _amountData = p.amounts !== undefined ? p.amounts : [];
    
    var _yDomain = [_min, _max+10];
    
    _svg.attr("width", _width);
    _svg.attr("height", _height);
  
    var _amountScale = d3.scale.linear().domain(_yDomain).range([_height-_margins.bottom, _margins.top]);
    var _amountAxis = d3.svg.axis().orient("right").scale(_amountScale).tickSize(_width-(_margins.left+_margins.right));
    
    var _timeScale = d3.time.scale().domain(_xDomain).range([_margins.left, _width-_margins.right]);
    var _timeAxis = d3.svg.axis().orient("top").scale(_timeScale).tickSize(-_height+_margins.top+_margins.bottom);

    //In SVG the draw order is reverse order of defining the nodes
    var _yAxisGraphic = _svg.append("g").attr("class", "y axis");
    
    var _amountGroup = _svg.append("g");
    var _amounts = _amountGroup.selectAll("rect").data(_amountData).enter().append("rect");
    
    var _xAxisGraphic = _svg.append("g").attr("class", "x axis");
    
    var _tooltip = d3.select("body").append("div").attr('class', "tooltip");
    
    var mapDataToX = function(data){
        var domain = _timeScale.domain();
        var start = data.date;

        if((start.getUTCFullYear() < domain[0].getUTCFullYear() &&
        start.getMonth() < domain[0].getMonth() &&
        start.getDate() < domain[0].getDate()) ||
        start > domain[domain.length-1]){
            return 0;
        }
        else if(start < domain[0]){
            start = domain[0];
        }
        return _timeScale(start);
    };
    
    var mapDataToWidth = function(data){
        var domain = _timeScale.domain();
        var start = data.date;

        //If the data is not in the domain range it is discarded
        if((start.getUTCFullYear() < domain[0].getUTCFullYear() &&
        start.getMonth() < domain[0].getMonth() &&
        start.getDate() < domain[0].getDate()) ||
        start > domain[domain.length-1]){
            return 0;
        }

        var date = new Date(start);
        date.setDate(start.getDate() + 1);

        if(date < domain[0]){
            return 0;
        }

        if(start < domain[0]){
            start = domain[0];
        }

        if(date > domain[domain.length-1]){
            date = domain[domain.length-1];
        }

        return _timeScale(date)-_timeScale(start);
    };
    
    var mapAmountToY = function(data){
        return _amountScale(data.count);
    };
    
    var mapAmounToHeight = function(data){
        return _amountScale.range()[0]-mapAmountToY(data);
    };
    
    var onMouseOver = function(data){
        var dispstring = "";
        for(var atr in data){
            if(data.hasOwnProperty(atr)){
                if(!$.isPlainObject(data[atr]) && !$.isArray(data[atr])){
                    dispstring += atr+": "+data[atr].toString()+"</br>";
                }
            }
        }
        _tooltip.html(dispstring);
        return _tooltip.style("visibility", "visible");
    };
    
    var onMouseMove = function(data){
        return _tooltip.style("top", (event.pageY-30)+"px").style("left",(event.pageX+15)+"px");
    };
    
    var onMouseOut = function(data){
        return _tooltip.style("visibility", "hidden");
    };

    //public methods
    var pub = {};
    
    pub.clear = function(){
        _svg.selectAll("*").remove();
    };
    pub.draw = function(){

        //background and y-axis
        _yAxisGraphic.attr("transform","translate("+_margins.left+","+0+")").call(_amountAxis);
            
        _amounts.attr('fill', "#0000FF")
            .attr('x', mapDataToX)
            .attr('width', mapDataToWidth)
            .attr('y', mapAmountToY)
            .attr('height', mapAmounToHeight)
            .on("mouseover", onMouseOver)
            .on("mousemove", onMouseMove)
            .on("mouseout", onMouseOut);

        //x-axis
        _xAxisGraphic.attr("transform", "translate(0,"+(_margins.top)+")")
            .call(_timeAxis)
            .selectAll(".tick text")
            .style("text-anchor", "start");
    };
    
    pub.onBrush = function(timeRange){
        _timeScale.domain(timeRange);        
        pub.draw();
    };
    
    pub.onResize = function(width, height, margins){
        _width = width;
        _height = height;
        _margins = margins;
        
        _timeScale.range([_margins.left, _width-_margins.right]);
        _timeAxis.tickSize(-_height+_margins.top+_margins.bottom);
        _amountScale.range([_height-_margins.bottom, _margins.top]);
        _amountAxis.tickSize(_width-(_margins.left+_margins.right));
        
        _svg.attr("width", _width);
        _svg.attr("height", _height);
        
        pub.draw();
    };
    
    pub.getMinHeight = function(){
       return 30;
    };
    
    pub.updateData = function(ud){
        //Clear the chart before new bindings
        pub.clear();
        var u = ud || {};
        
        _xDomain = p.timeframe !== undefined ? p.timeframe : _xDomain;
        _max = p.max !== undefined ? p.max : _max;
        _min = p.min !== undefined ? p.min : _min;
        _amountData = p.amounts !== undefined ? p.amounts : _amountData;
        
        _yDomain = [_min, _max+10];

        _amountScale.domain(_yDomain).range([_height-_margins.bottom, _margins.top]);  
        _timeScale.domain(_xDomain).range([_margins.left, _width-_margins.right]);

        //In SVG the draw order is reverse order of defining the nodes
        _yAxisGraphic = _svg.append("g").attr("class", "y axis");
        
        _amountGroup = _svg.append("g");
        _amounts = _amountGroup.selectAll("rect").data(_amountData).enter().append("rect");
        
        _xAxisGraphic = _svg.append("g").attr("class", "x axis");
    };
    
    
    return pub;
};