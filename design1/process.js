var rawData;
var allDots;
var dataByYear;
var countries;
var countryInitCenter;
var simulation;
var countryInfo;
var nodes;
var initialFinish = 0;
var currentYear = 1960;
var animation = true;
var timeout = 3000;

var circleR = 8;
var BasicUnit = 1e11;

var flagWidth = 200;

// scales
var countryColor;

process();

function process() {
	
	"use strict"

	d3.dsv(",", "GDP.csv").then(function(data){
		DataParse(data);
		LoadFlagsSqr(countries);
		DefineFlag(countries);
		DrawSVG(dataByYear, countries);
		initialFinish = 1;
		setTimeout(animate, timeout);
	});

	function findById(d) {
		return d.id == this;
	}

	function DataParse(data) {
		rawData = data;
        allDots = new Array;
        dataByYear = new Object;
        var othersByYear = new Object;
        for (var year = 1960; year <= 2017; year++) {
            dataByYear[year] = new Object;
            dataByYear[year].nodes = new Array;
            dataByYear[year].links = new Array;
            othersByYear[year] = 0;
        }
        countries = new Array;
        // Deal with big parts
        data.forEach(element => {
        	countries.push(element["Country Code"]);
            for (var year = 1960; year <= 2017; year++) {
                var dotsThisYear = new Array;
                // insert all the nodes
                if (element[year] != "") {
                    var dataDots = Math.round(element[year]/BasicUnit);
                    if (dataDots == 0) othersByYear[year] = othersByYear[year] + parseInt(element[year]);
                    for (var i = 0; i < dataDots; i++) {
                        var id = element["Country Code"]+i;
                        var dot = allDots.find(findById, id);
                        if (dot == undefined) {
                            dot = new Object;
                            dot.id = id;
                            dot.code = element["Country Code"];
                            dot.fx = null;
                            dot.fy = null;
                            allDots.push(dot);
                            dataByYear[year].nodes.push(dot);
                            dotsThisYear.push(id);
                        } else {
                            dataByYear[year].nodes.push(dot);
                            dotsThisYear.push(id);
                        }
                    }
                }
                // insert all the links
                for (var i = 0; i < dotsThisYear.length; i++) {
                    for (var j = i+1; j < dotsThisYear.length; j++) {
                        var link = new Object;
                        link.source = dotsThisYear[i];
                        link.target = dotsThisYear[j];
                        dataByYear[year].links.push(link);
                    }
                }
            }
        });
        // Deal with others
        countries.push("Others");
        for (var year = 1960; year <= 2017; year++) {
        	var dotsThisYear = new Array;
            var otherDots = Math.ceil(othersByYear[year]/BasicUnit);
            // insert all the nodes
			for (var i = 0; i < otherDots; i++) {
				var id = "Others"+i;
				var dot = allDots.find(findById, id);
				if (dot == undefined) {
					dot = new Object;
					dot.id = id;
					dot.code = "Others";
					dot.fx = null;
                    dot.fy = null;
					allDots.push(dot);
					dataByYear[year].nodes.push(dot);
					dotsThisYear.push(id);
				} else {
					dataByYear[year].nodes.push(dot);
					dotsThisYear.push(id);
				}
			}
			// insert all the links
			for (var i = 0; i < dotsThisYear.length; i++) {
				for (var j = i+1; j < dotsThisYear.length; j++) {
					var link = new Object;
					link.source = dotsThisYear[i];
					link.target = dotsThisYear[j];
					dataByYear[year].links.push(link);
				}
			}
        }
	}

	function LoadFlagsSqr(countries) {
		var flagArray = new Array;
		countries.forEach(country => {
			flagArray.push(GetFlagSqure(country));
		})
		preloadImages(flagArray);
	}

	function DefineFlag(countries) {
		var defs = d3.select("#svg").select("defs");
		defs.selectAll(".flagSqr").data(countries).enter()
			.append("pattern")
			.attr("id", function(d){return "flagSqr-"+d;})
			.attr("class", "flagSqr")
			.attr('patternUnits', 'userSpaceOnUse')
			.attr('width', circleR*2)
     		.attr('height', circleR*2)
     		.insert("image")
     		.attr("xlink:href", function(d){return GetFlagSqure(d);})
     		.attr('width', circleR*2)
     		.attr('height', circleR*2);
	}

	function CountryCenterGen(countries) {
		var rt = new Object;
		countries.forEach(country => {
			var randX = (Math.random()-0.5)*10;
			var randY = (Math.random()-0.5)*10;
			rt[country] = new Object;
			rt[country].x = randX;
			rt[country].y = randY;
		});
		return rt;
	}

	function DrawSVG(data, countries) {
		// Geth the actural size of countrysvg
		var countrysvg = document.getElementById('countrysvg')
		var countryWidth = countrysvg.clientWidth;
		var countryHeight = countrysvg.clientHeight;

		// The country info
		var countrysvg = d3.select("#countrysvg")
		countryInfo = countrysvg.append('g')
			.attr("id", "countrysvg")
			.attr("transform", "translate("+countryWidth/2+", "+countryHeight/2+")");
		countryInfo.append("image")
			.attr("id", "countryflag")
			.attr("x", -flagWidth/2)
			.attr("y", -flagWidth/4*3)
			.attr("width", flagWidth)
			.attr("height", flagWidth/4*3);
		countryInfo.append("text")
			.attr("id", "countryname")
			.attr("x", 0)
			.attr("y", 20)
			.attr("text-anchor", "middle");

		// Get the actural size of svg
		var svg = document.getElementById('svg');
		var width = svg.clientWidth;
		var height = svg.clientHeight;

		// Generate initial poistion
        countryInitCenter = CountryCenterGen(countries);
        allDots.forEach(dot => {
        	dot.x = countryInitCenter[dot.code].x + (Math.random()-0.5) + width/2;
        	dot.y = countryInitCenter[dot.code].y + (Math.random()-0.5) + height/2;
        });

        // scales
        countryColor = d3.scaleOrdinal()
			.domain(countries)
			.range(d3.schemeSet3);

		//The nodes
		var svg = d3.select('#svg');
		var nodeArea = svg.append('g')
			.attr("id", "nodeArea");
		nodes = nodeArea.selectAll(".node")
			.data(data[currentYear].nodes, function(d){return d.id})
			.enter()
			.append("circle")
			.attr("id", function(d){return d.id})
			.attr("class", "node")
			.attr("fill", function(d){return "url(#flagSqr-"+d.code+")";})
			.attr("stroke", "#bdbdbd")
			.attr("stroke-width", "1px")
			.attr("r", circleR)
			.attr("cx",function(d){return d.x;})
      		.attr("cy",function(d){return d.y;})
      		.on("mouseover", nodeMouseOver);
		
		
		// the simulation
		simulation = d3.forceSimulation()
			.force("link", d3.forceLink().id(function(d){return d.id;}).strength(2))
			.force("collide", d3.forceCollide(function(d){return circleR;}).iterations(16))
			//.force("charge", d3.forceManyBody().strength(-2))
			.force("center", d3.forceCenter(width/2, height/2))
			.force("y", d3.forceY(0))
            .force("x", d3.forceX(0));
        //simulation.alphaDecay(0.01);
      	simulation.nodes(data[currentYear].nodes)
      		.on("tick", function(){
      			nodes
      				.attr("cx",function(d){return d.x;})
      				.attr("cy",function(d){return d.y;});
      		});
      	simulation.force("link").links(data[currentYear].links);

	}
}

function nodeMouseOver() {
	var countryCode = this.id.match("[A-Za-z]+")[0];
	var country = rawData.find(function(d) {return d["Country Code"] == countryCode});
	var countryName = (country == undefined)?"Others":country["Country Name"];
	countryInfo.select("#countryflag")
		.attr('xlink:href', GetFlag(countryCode));
	countryInfo.select("#countryname")
		.text(countryName);
}

function animate() {
	while (initialFinish == 0) {}
	if (animation) {
		if (currentYear < 2017) {
			currentYear++;

			// The year field
			var yearField = document.getElementById('year');
			yearField.innerHTML = currentYear;

			// The slider
			var inputField = document.getElementById('yearSlider');
			inputField.value = currentYear;

			// The nodes
			nodes = nodes.data(dataByYear[currentYear].nodes, function(d){return d.id});
			nodes.exit().remove();
			nodes = nodes.enter()
				.append("circle")
				.attr("id", function(d){return d.id})
				.attr("class", "node")
				.attr("fill", function(d){return "url(#flagSqr-"+d.code+")";})
				.attr("stroke", "#bdbdbd")
				.attr("stroke-width", "1px")
				.attr("r", circleR)
				.attr("cx",function(d){return d.x;})
				.attr("cy",function(d){return d.y;})
				.on("mouseover", nodeMouseOver)
				.merge(nodes);
			
			// the simulation
			simulation.nodes(dataByYear[currentYear].nodes);
      		simulation.force("link").links(dataByYear[currentYear].links);

      		simulation.alpha(0.3).restart();

			setTimeout(animate, timeout);
		} else {
			animation = false;
			playButton();
		}
		
	}
}

function animateStart() {
	animation = true;
	animate();
}

function animateStop() {
	animation = false;
}

function changeToYear(year) {
	currentYear = year;

	// The nodes
	nodes = nodes.data(dataByYear[currentYear].nodes, function(d){return d.id});
	nodes.exit().remove();
	nodes = nodes.enter()
		.append("circle")
		.attr("id", function(d){return d.id})
		.attr("class", "node")
		.attr("fill", function(d){return "url(#flagSqr-"+d.code+")";})
		.attr("stroke", "#bdbdbd")
		.attr("stroke-width", "1px")
		.attr("r", circleR)
		.attr("cx",function(d){return d.x;})
		.attr("cy",function(d){return d.y;})
		.merge(nodes);

	
	// the simulation
	simulation.nodes(dataByYear[currentYear].nodes);
	simulation.force("link").links(dataByYear[currentYear].links);

	simulation.alpha(0.3).restart();
}