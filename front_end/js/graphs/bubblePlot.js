const niceNames = {
    'popularity': "Popularity",
    'vote_avg': "Average rate",
    'vote_count': "Number of rates",
    'revenue': "Revenue",
    "runtime": "Runtime",
    "release_year": "Release year",
    'budget': "Budget"
}

function makeUI(movies) {
    const xSelect = document.getElementById("bubbleXSelect")
    const ySelect = document.getElementById("bubbleYSelect")
    const radiusSelect = document.getElementById("bubbleRadiusSelect")
    const yearRange = document.getElementById("yearRange")

    const keys = Object.keys(movies[0])
        .filter(key => (typeof movies[0][key]) == "number")
        .filter(key => key !== "id")

    for (let i in keys) {
        let optionX = document.createElement("option")
        let optionY = document.createElement("option")
        let optionRadius = document.createElement("option")
        const name = niceNames[keys[i]]
        optionX.text = name
        optionX.value = i
        optionY.text = name
        optionY.value = i
        optionRadius.text = name
        optionRadius.value = i
        xSelect.add(optionX)
        ySelect.add(optionY)
        radiusSelect.add(optionRadius)
    }

    const yearLimit = d3.extent(movies.map(x => x['release_year']))
    yearRange.min = yearLimit[0]
    yearRange.max = yearLimit[1]
    yearRange.value = yearRange.min

    return keys
}

function tickValuesFormatter(value, index) {
    let strValue
    if (value / 1000000000 > 1)
        strValue = (value / 1000000000).toFixed(1) + "B"
    else if (value / 1000000 > 1)
        strValue = (value / 1000000).toFixed(1) + "M"
    else if (value / 1000 > 1)
        strValue = (value / 1000).toFixed(1) + "K"
    else
        strValue = value.toFixed(1)
    return strValue.replace(/\.0/, '');
}

function animateSlider(graphRefreshFunction) {
    const yearRange = d3.select("#yearRange")
    const yearPlayButton = d3.select("#yearPlay")
    const yearText = d3.select("#yearText")

    if (yearPlayButton.text() === "Play") {
        yearPlayButton.html("Stop")
        yearRange
            .transition()
            .duration(5000)
            .ease(d3.easeLinear)
            .tween("my-tween", function () {
                const i = d3.interpolateRound(this.value, this.max);
                return function (t) {
                    this.value = i(t);
                    yearText.html(this.value)
                    graphRefreshFunction()
                };
            })
            .on("end", () => {
                yearPlayButton.html("Play")
            })
    }
    else {
        yearPlayButton.html("Play")
        yearRange.transition().end()
    }
}

function drawGraph(svg, width, height, movies, keys) {

    const xSelect = document.getElementById("bubbleXSelect")
    const ySelect = document.getElementById("bubbleYSelect")
    const radiusSelect = document.getElementById("bubbleRadiusSelect")

    const xSelectedField = keys[xSelect.value]
    const ySelectedField = keys[ySelect.value]
    const radiusSelectedField = keys[radiusSelect.value]

    d3.selectAll(".bubbleAxis")
        .remove()
    d3.selectAll(".bubbleDot")
        .remove()

    let x = d3.scaleLinear()
        .domain(d3.extent(movies.map(movie => movie[xSelectedField])))
        .range([0, width]);
    let xAxis =
        svg.append("g")
            .attr("class", "bubbleAxis")
            .attr("transform", "translate(0," + height + ")")
            .call(d3.axisBottom(x).tickFormat(tickValuesFormatter));

    // Add Y axis
    let y = d3.scaleLinear()
        .domain(d3.extent(movies.map(movie => movie[ySelectedField])))
        .range([height, 0]);
    let yAxis =
        svg.append("g")
            .attr("class", "bubbleAxis")
            .call(d3.axisLeft(y).tickFormat(tickValuesFormatter));

    if (radiusSelectedField === undefined) {//Disabled
        var z = function (a) {
            return 2;
        }
    }
    else {
        var z = d3.scaleLinear()
            .domain(d3.extent(movies.map(movie => movie[radiusSelectedField])))
            .range([1, 20]);
    }

    const yearRange = document.getElementById("yearRange")

    // Add dots
    let dots = svg.append('g')
        .attr("class", "bubbleDot")
        .selectAll("dot")
        .data(movies.filter(x => x.release_year == yearRange.value))
        .enter()
        .append("circle")
        .attr("cx", function (d) {
            return x(d[xSelectedField])
        })
        .attr("cy", function (d) {
            return y(d[ySelectedField])
        })
        .attr("id", function (d) {
            return "dot" + d['id']
        })
        .attr("r", function (d) {
            return z(d[radiusSelectedField]);
        })
        .style("fill", "#69b3a2")
        .style("opacity", "0.7")
        .attr("stroke", "black")

}

function drawBubblePlot(movies) {
    movies.forEach(movie => {
        movie['release_year'] = (new Date(movie['relase_data'])).getFullYear()
    })
    let keys = makeUI(movies)

    const margin = {top: 20, right: 0, bottom: 20, left: 45}

    const bboxSize = d3.select("#bubblePlot").node().getBoundingClientRect()
    const width = (bboxSize.width * 0.9)
    const height = (width / 2)

    let svg = d3.select("#bubblePlot")
        .append("svg")
        .attr("width", bboxSize.width + margin.right + margin.left)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")")

    let yearText = svg.append("text")
        .attr("x", width / 2)
        .attr("y", height / 1.6)
        .attr("id", "yearText")

    drawGraph(svg, width, height, movies, keys)
    const xSelect = document.getElementById("bubbleXSelect")
    const ySelect = document.getElementById("bubbleYSelect")
    const radiusSelect = document.getElementById("bubbleRadiusSelect")
    const graphRefresh = function () {
        drawGraph(svg, width, height, movies, keys)
    }
    xSelect.onchange = graphRefresh
    ySelect.onchange = graphRefresh
    radiusSelect.onchange = graphRefresh

    const yearRange = document.getElementById("yearRange")
    yearRange.oninput = function (e) {
        yearText.html(e.target.value)
        graphRefresh()
    }
    yearText.html(yearRange.value)

    const yearPlayButton = document.getElementById("yearPlay")
    yearPlayButton.onclick = function () {
        animateSlider(graphRefresh)
    }
}

export {drawBubblePlot}