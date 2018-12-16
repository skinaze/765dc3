var rawData;
var dataByCountry;
var countries;
var currentSelectedCountries = null;
var width = 1600;
var height = 700;
var leftPadding = 40;
var rightPadding = 200;
var topPadding = 20;
var bottomPadding = 20;
var flagPos = 10;
var flagHeight = 6;
var BasicUnit = 1e6;
var yearParse = d3.timeParse("%Y");
var rectRound = 1;
var rectNum = 0;
var yearMin = 1960;
var yearMax = 2017;
var yMin = 1e0;
var yMax = 1e8;
var dragCircleR = 10;
var dataDotR = 4;

//scales
var xScale;
var yScale;
var countryColor;
var xInverse;
var yInverse;

process();

function process() {
	
	"use strict"
    

    d3.dsv(",", "GDP.csv").then(function(data){
		DataParse(data);
		DrawSVG(dataByCountry, countries);
		Drag();
		ShowData()
	});

	function DataParse(data) {
        dataByCountry = new Array;
        countries = new Array;
        data.forEach(country => {
            var countryDetial = new Object;
            countryDetial.name = country["Country Name"];
            countryDetial.code = country["Country Code"];
            countryDetial.lastValue = null;
            countryDetial.dataArray = new Array;
            for (var year = yearMin; year <= yearMax; year++) {
                var dataPoint = new Object;
                if (country[year] == "") {
                    dataPoint.year = yearParse(year);
                    dataPoint.data = null;
                } else {
                    dataPoint.year = yearParse(year);
                    dataPoint.data = country[year]/BasicUnit;
                    countryDetial.lastValue = dataPoint.data;
                }
                countryDetial.dataArray.push(dataPoint);
            }
            if (countryDetial.lastValue) {
                dataByCountry.push(countryDetial);
                countries.push(countryDetial.code);
            }
        });
	}

	function DrawSVG(data, countries) {
        // scales
        xScale = d3.scaleTime()
            .domain([new Date(yearMin, 0), new Date(yearMax, 0)])
            .range([leftPadding, width+leftPadding]);

        yScale = d3.scaleLog()
            .domain([yMin, yMax])
            .range([height+topPadding, topPadding]);

        countryColor = d3.scaleOrdinal()
			.domain(countries)
			.range(d3.schemeCategory10);

		// Inverse scales
		xInverse = d3.scaleLinear()
			.domain([leftPadding, width+leftPadding])
			.range([yearMin, yearMax]);
		yInverse = function(value) {
			var linear = d3.scaleLinear()
				.domain([height+topPadding,topPadding])
				.range([Math.log10(yMin),Math.log10(yMax)]);
			return Math.pow(10, linear(value));
		}

        // curve generator
        var line = d3.line()
            .defined(function(d) {return (d.data != null);})
            .x(function(d) {return xScale(d.year);})
            .y(function(d) {return yScale(d.data);});
        
        // draw svg
	    var svg = d3.select("#svg")
            .attr("width", width+leftPadding+rightPadding)
            .attr("height", height+topPadding+bottomPadding);
       
        // draw axis
        var xAxis = d3.axisBottom(xScale)
            .ticks(yearMax-yearMin+1)
            .tickFormat(null,"%Y");
        var yAxis = d3.axisLeft(yScale)
            .ticks(10);
        svg.append('g')
            .attr('id', 'x-axis')
            .attr('transform', "translate(0,"+(height+topPadding)+")")
            .call(xAxis);
        svg.append('g')
            .attr('id', 'y-axis')
            .attr('transform', "translate("+(leftPadding)+",0)")
            .call(yAxis);

        // draw curves
        var curveArea = svg.append('g')
            .attr('id', 'curveArea');
        curveArea.selectAll(".gdp").data(dataByCountry, function(d) {return d.code;})
            .enter().append('path')
            .attr('class', 'gdp')
            .attr('id', function(d) {return 'gdp-'+d.code;})
            .attr('d', function(d) {return line(d.dataArray);})
            .attr('fill', 'none')
            .attr('stroke', function(d) {return countryColor(d.code)})
            .attr("stroke-width", "1px")
            .attr("stroke-opacity", 0.2)
            .attr("style", "hover{stroke-width: 5;}");

        // draw label
        var flagArea = svg.append('g')
            .attr('id', 'flagArea');
        flagArea.selectAll('.flag').data(dataByCountry, function(d) {return d.code;})
            .enter().append('image')
            .attr('class', '.flag')
            .attr('id', function(d) {return 'flag-'+d.code;})
            .attr('x', leftPadding+width+flagPos)
            .attr('y', function(d) {return yScale(d.lastValue);})
            .attr('width', flagHeight/3*4)
            .attr('height', flagHeight)
            .attr('opacity', 0.1)
            .attr('xlink:href', function(d) {return GetFlag(d.code);});

        // Add info box
        svg.append('text').attr('id', 'text');

	}

	function Drag() {
        var svg = d3.select("#svg");
        var rects = svg.insert('g', ":first-child")
            .attr('id', 'rects');
	    var drag = d3.drag()
	        .on("start", StartFunc)
	        .on("drag", DragFunc)
	        .on("end", EndFunc);
	    svg.call(drag);
	    var cleanButton = d3.select("#canvas")
	    	.append('button')
	    	.attr('type', 'button')
	    	.text('Reset Selection')
	    	.on('click', CleanRect);
	    var dragDotArea = svg.append('g')
	    	.attr('id', 'dragDotArea');
	    var dragCircle = dragDotArea.append('circle')
	    	.attr('id', "dragCircle")
	    	.attr('fill', "#3182bd")
	    	.attr('cx', leftPadding+width+rightPadding/2)
	    	.attr('cy', topPadding+height)
	    	.attr('r', dragCircleR);

	    var startPos = null;
	    var lastPos = null;
	    var event = null;

	    function StartFunc() {
	        var p = d3.mouse(this);
	        console.log("canvas start");
	        console.log("Pos: "+p[0]+", "+p[1]);

	        startPos = p;
	        lastPos = startPos;
	        var checkInCicle = function(x, y) {
				var cx = leftPadding+width+rightPadding/2;
				var cy = topPadding+height;
				if ((Math.pow(cx-x, 2)+Math.pow(cy-y,2)) < Math.pow(dragCircleR,2)) return true;
				else return false;
	        }
	        if (checkInCicle(p[0],p[1])) {
				event = "dragDot";
	        } else {
	        	event = "rect";
	        }
	    }

	    function DragFunc() {
	        var p = d3.mouse(this);
	        console.log("canvas move");
	        console.log("Pos: "+p[0]+", "+p[1]);
            
            if (event == "rect") {
            	var current = rects.select("#current");
				if (current._groups[0][0]) {
					var rectPos = GetRectInfo(p[0], p[1], startPos[0], startPos[1])
					current.attr('x', rectPos.x)
						.attr('y', rectPos.y)
						.attr('width', rectPos.width)
						.attr('height', rectPos.height);
				} else {
					var rectPos = GetRectInfo(p[0], p[1], startPos[0], startPos[1])
					rects.append('rect')
						.attr('id', "current")
						.attr('class', "rect")
						.attr('x', rectPos.x)
						.attr('y', rectPos.y)
						.attr('width', rectPos.width)
						.attr('height', rectPos.height)
						.attr('stroke', 'none')
						.attr('fill', '#9ecae1')
						.attr('fill-opacity', '0.4')
						.on("click", rectClick);
				}
            } else {
            	// change dragCircle and dragLine
            	var cx = parseFloat(dragCircle.attr('cx'));
            	var cy = parseFloat(dragCircle.attr('cy'));
            	dragCircle.attr('cx', cx + p[0] - lastPos[0])
	    			.attr('cy', cy + p[1] - lastPos[1]);

	    		// change rect locations
	    		d3.selectAll(".rect")
	    			.attr("x", function(d){return parseFloat(d3.select(this).attr("x")) + p[0] - lastPos[0];})
	    			.attr("y", function(d){return parseFloat(d3.select(this).attr("y")) + p[1] - lastPos[1];});
            }

            lastPos = p;
	    }

	    function EndFunc() {
	        var p = d3.mouse(this);
	        console.log("canvas end");
	        console.log("Pos: "+p[0]+", "+p[1]);

	        if (event == "rect") {
				var current = rects.select("#current")
				if ((current._groups[0][0]) && Math.floor(current.attr('width')) && Math.floor(current.attr('height'))) {
					current.attr('id', '');
					rectNum ++;
					CheckSelection(current);
				} else {
					current.remove();
				}
	        } else {
	        	// change dragCircle and dragLine
	        	dragCircle.attr('cx', leftPadding+width+rightPadding/2)
	    			.attr('cy', topPadding+height);
	    		
	    		// update lines
	    		if (currentSelectedCountries) {
	    			currentSelectedCountries.forEach(country => {
						d3.select('#gdp-'+country.code)
							.attr("stroke-opacity", 0.2)
							.attr("stroke-width", 1)
							.on("mouseover", null)
							.on("mousemove", null)
							.on("mouseout", null);
						d3.select('#flag-'+country.code)
							.attr("opacity", 0.1);
					});
	    		}
	    		rectNum = 0;
	    		d3.selectAll(".rect").each(function(){
	    			rectNum++;
	    			CheckSelection(d3.select(this));
	    		});
	        }
	    }

	    function GetRectInfo(x1, y1, x2, y2) {
	        var rt = new Object;
	        if (x1 > x2) {
                rt.x = x2;
                rt.width = x1 - x2;
	        } else {
	            rt.x = x1;
	            rt.width = x2 - x1;
	        }
	        if (y1 > y2) {
	            rt.y = y2;
	            rt.height = y1 - y2;
	        } else {
	            rt.y = y1;
	            rt.height = y2 - y1;
	        }
	        return rt;
	    }

	    function InverseRectInfo(x, y, width, height) {
	        return {
	            x1: x,
	            x2: x+width,
	            y1: y,
	            y2: y+height
	        };
	    }

	    function CheckSelection(currentRect) {
	        var rectArea = InverseRectInfo(Math.floor(currentRect.attr('x')), 
	            Math.floor(currentRect.attr('y')), 
	            Math.floor(currentRect.attr('width')), 
	            Math.floor(currentRect.attr('height')));
	        var rectRange = {
	        	yearMin: xInverse(rectArea.x1),
	        	yearMax: xInverse(rectArea.x2),
	        	gdpMin: yInverse(rectArea.y2),
	        	gdpMax: yInverse(rectArea.y1)
	        }
	        
	        if (rectNum > 1) {
	        	var index = currentSelectedCountries.length;
	        	while (index) {
	        		index -=1;
	        		var country = currentSelectedCountries[index];
	        		var cross = false;
                	country.dataArray.forEach(dataPoint => {
						if ((dataPoint.year < new Date(rectRange.yearMax,0)) && (dataPoint.year > new Date(rectRange.yearMin,0))) {
							if ((dataPoint.data) && (dataPoint.data < rectRange.gdpMax) && (dataPoint.data > rectRange.gdpMin)) {
								cross = true;
							}
						}
                    });
                    if (!cross) {
                    	currentSelectedCountries.splice(index, 1);
                    	d3.select('#gdp-'+country.code)
                    		.attr("stroke-opacity", 0.2)
                    		.attr("stroke-width", 1)
                    		.on("mouseover", null)
                    		.on("mousemove", null)
							.on("mouseout", null);
                    	d3.select('#flag-'+country.code)
                    		.attr("opacity", 0.1);
                    }
	        	}
	        } else {
	        	currentSelectedCountries = new Array;
	            dataByCountry.forEach(country => {
                    var cross = false;
                    country.dataArray.forEach(dataPoint => {
						if ((dataPoint.year < new Date(rectRange.yearMax,0)) && (dataPoint.year > new Date(rectRange.yearMin,0))) {
							if ((dataPoint.data) && (dataPoint.data < rectRange.gdpMax) && (dataPoint.data > rectRange.gdpMin)) {
								cross = true;
							}
						}
                    });
                    if (cross) {
                    	currentSelectedCountries.push(country);
                    	d3.select('#gdp-'+country.code)
                    		.attr("stroke-opacity", 0.8)
                    		.attr("stroke-width", 2)
                    		.on("click", function(){
                    			var p = d3.mouse(this);
								console.log("line click");
								console.log("Pos: "+p[0]+", "+p[1]);
                    		})
                    		.on("mouseover", lineMouseOver)
							.on("mouseout", lineMouseOut);
                    	d3.select('#flag-'+country.code)
                    		.attr("opacity", 1);
                    }
	            });
	        }
	    }
		
		var rectClickWaiting = null;
	    function rectClick() {
	    	var p = d3.mouse(this);
			console.log("line click rect");
			console.log("Pos: "+p[0]+", "+p[1]);

			var rect = d3.select(this);

			if (rectClickWaiting) {
                window.clearTimeout(rectClickWaiting);
                rectClickWaiting = null;
                //doubleClickAction();
            } else {
                window.setTimeout(function(){
                    rectClickWaiting = null;
                }, 300);
            }
	    }

	    function lineMouseOver(){
			var p = d3.mouse(this);
			console.log("line mouseover");
			console.log("Pos: "+p[0]+", "+p[1]);
			
			var countryCode = this.id.slice(4);
			var country = dataByCountry.find(function(d) {return d.code == countryCode});
			var curve = d3.select(this)
				.attr("stroke-width", 8)
				.attr("stroke-opacity", 1);
			var flag = d3.select("#flag-"+countryCode)
				.attr("transform", "translate(10 0)")
				.attr('width', flagHeight*5/3*4)
            	.attr('height', flagHeight*5);
            var text = d3.select('#text')
				.text(country.name)
				.attr("fill", "#3182bd")
				.attr("x", Math.floor(flag.attr("x"))+flagHeight*5/3*4+20)
				.attr("y", Math.floor(flag.attr("y"))+flagHeight*3);
		}

		function lineMouseOut(){
			var p = d3.mouse(this);
			console.log("line mouseout");
			console.log("Pos: "+p[0]+", "+p[1]);

			var countryCode = this.id.slice(4);
			var curve = d3.select(this)
				.attr("stroke-width", 2)
				.attr("stroke-opacity", 0.8);
			var flag = d3.select("#flag-"+countryCode)
				.attr("transform", "")
				.attr('width', flagHeight/3*4)
            	.attr('height', flagHeight);
            var text = d3.select('#text')
				.text("")
				.attr("fill", "none")
				.attr("x", "")
				.attr("y", "");
		}

		function CleanRect() {
			currentSelectedCountries.forEach(country => {
				d3.select('#gdp-'+country.code)
					.attr("stroke-opacity", 0.2)
					.attr("stroke-width", 1)
					.on("mouseover", null)
					.on("mousemove", null)
					.on("mouseout", null);
				d3.select('#flag-'+country.code)
					.attr("opacity", 0.1);
			});
			currentSelectedCountries = null;
			rectNum = 0;
			d3.selectAll(".rect").remove();
		}
	}

	function ShowData() {
		var svg = d3.select("svg");
		/*var lineBox = svg.insert('rect', ":first-child")
        	.attr('id','lineBox')
        	.attr('fill', 'black')
        	.attr('fill-opacity', 0)
        	.attr('stroke', 'none')
        	.attr('x', leftPadding)
        	.attr('y', topPadding)
        	.attr('width', width)
        	.attr('height', height);*/
		var showDataArea = svg.append("g")
			.attr('id', 'showDataArea');
		var scanLine = showDataArea.append("line")
			.attr("id", "scanLine")
			.attr("stroke", "black")
			.attr("stroke-width", 2)
			.attr("stroke-opacity", 0)
			.attr("y1", topPadding)
			.attr("y2", topPadding+height);
		svg
			.on("mousemove", function(){
				var p = d3.mouse(this);
				if ((p[0] < leftPadding) || (p[0] > leftPadding+width) || (p[1] < topPadding) || (p[1] > topPadding+height)) {
					scanLine.attr("stroke-opacity", 0)
						.attr("x1", 0)
						.attr("x2", 0);
					showDataArea.selectAll(".dataDot").remove();
					showDataArea.selectAll(".dataValue").remove();
				} else {
					scanLine.attr("stroke-opacity", 1)
						.attr("x1", p[0]+5)
						.attr("x2", p[0]+5);
					if (currentSelectedCountries) {
						var dataDots = showDataArea.selectAll(".dataDot")
							.attr("cx", xScale(new Date(Math.round(xInverse(p[0])),0)))
							.attr("cy", function(d){
								var dataPair = d.dataArray.find(function(d){return d.year.getFullYear() == Math.round(xInverse(p[0]))});
								if (dataPair.data) return yScale(dataPair.data)
							});
						dataDots.data(currentSelectedCountries, function(d){return d.code;})
							.enter().append("circle")
							.attr("id", function(d){return "dataDot-"+d.code;})
							.attr("class", "dataDot")
							.attr("fill", function(d){return countryColor(d.code);})
							.attr("cx", xScale(new Date(Math.round(xInverse(p[0])),0)))
							.attr("cy", function(d){
								var dataPair = d.dataArray.find(function(d){return d.year.getFullYear() == Math.round(xInverse(p[0]))});
								if (dataPair.data) return yScale(dataPair.data);
								else return Number.MAX_SAFE_INTEGER;
							})
							.attr("r", dataDotR);
						dataDots.data(currentSelectedCountries, function(d){return d.code;}).exit().remove();
						var dataValues = showDataArea.selectAll(".dataValue")
							.attr("x", xScale(new Date(Math.round(xInverse(p[0])),0)))
							.attr("y", function(d){
								var dataPair = d.dataArray.find(function(d){return d.year.getFullYear() == Math.round(xInverse(p[0]))});
								if (dataPair.data) return yScale(dataPair.data);
								else return Number.MAX_SAFE_INTEGER;
							})
							.text(function(d){
								var dataPair = d.dataArray.find(function(d){return d.year.getFullYear() == Math.round(xInverse(p[0]))});
								if (dataPair) return " $ "+Number.parseFloat(dataPair.data*BasicUnit).toPrecision(4);
								else return "";
							});
						dataValues.data(currentSelectedCountries, function(d){return d.code;})
							.enter().append("text")
							.attr("id", function(d){return "dataValue-"+d.code;})
							.attr("class", "dataValue")
							.attr("x", xScale(new Date(Math.round(xInverse(p[0])),0)))
							.attr("y", function(d){
								var dataPair = d.dataArray.find(function(d){return d.year.getFullYear() == Math.round(xInverse(p[0]))});
								if (dataPair.data) return yScale(dataPair.data);
								else return Number.MAX_SAFE_INTEGER;
							})
							.text(function(d){
								var dataPair = d.dataArray.find(function(d){return d.year.getFullYear() == Math.round(xInverse(p[0]))});
								if (dataPair) return " $ "+Number.parseFloat(dataPair.data*BasicUnit).toPrecision(4);
								else return "";
							});
						dataValues.data(currentSelectedCountries, function(d){return d.code;}).exit().remove();
					}
					
				}
			});
			
	}
}