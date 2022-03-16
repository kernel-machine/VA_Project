import {Graph} from "./Graph.js";

class BubblePlot extends Graph{

    niceNames = {
        'popularity': "Popularity",
        'vote_avg': "Average rate",
        'vote_count': "Number of rates",
        'revenue': "Revenue",
        "runtime": "Runtime",
        "release_year": "Release year",
        'budget': "Budget"
    }

    constructor(movies) {
        super();
        this.movies = movies
        this.keys = this.makeUI()
        this.selectedMovies = [];

        const margin = {top: 20, right: 0, bottom: 20, left: 45}

        const bboxSize = d3.select("#bubblePlot").node().getBoundingClientRect()
        this.width = (bboxSize.width * 0.9)
        this.height = (this.width / 2)

        let svg = d3.select("#bubblePlot")
            .append("svg")
            .attr("width", bboxSize.width + margin.right + margin.left)
            .attr("height", this.height + margin.top + margin.bottom)
            .append("g")
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")")
            .call(d3.brush().on("brush", (e) => this.onBrush(e)))

        let yearText = svg.append("text")
            .attr("x", this.width / 2)
            .attr("y", this.height / 1.6)
            .attr("id", "yearText")
            .attr("opacity", 1)

        this.updateGraph(svg)
        const xSelect = d3.select("#bubbleXSelect")
        const ySelect = d3.select("#bubbleYSelect")
        const radiusSelect = d3.select("#bubbleRadiusSelect")
        const checkboxByYear = d3.select("#filterByYear")
        const graphRefresh = () => {
            this.updateGraph(svg)
        }
        xSelect.on('change', graphRefresh)
        ySelect.on('change', graphRefresh)
        radiusSelect.on('change', graphRefresh)

        const yearRange = d3.select("#yearRange")
        yearRange.on('input', function (e) {
            yearText.html(e.target.value)
            graphRefresh()
        })
        yearText.html(yearRange.property('value'))

        const yearPlayButton = d3.select("#yearPlay")
        yearPlayButton.on('click', () => {
            this.animateSlider(graphRefresh)
        })

        checkboxByYear.on('change', (e) => {
            yearText.attr("opacity", e.target.checked ? 1 : 0)
            yearPlayButton.node().disabled = !e.target.checked
            yearRange.node().disabled = !e.target.checked
            graphRefresh()
        })
        checkboxByYear.dispatch("change")
        graphRefresh()
    }

    makeUI() {
        const xSelect = document.getElementById("bubbleXSelect")
        const ySelect = document.getElementById("bubbleYSelect")
        const radiusSelect = document.getElementById("bubbleRadiusSelect")
        const yearRange = document.getElementById("yearRange")

        const keys = Object.keys(this.movies[0])
            .filter(key => (typeof this.movies[0][key]) == "number")
            .filter(key => key !== "id")

        for (let i in keys) {
            let optionX = document.createElement("option")
            let optionY = document.createElement("option")
            let optionRadius = document.createElement("option")
            const name = this.niceNames[keys[i]]
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

        const yearLimit = d3.extent(this.movies.map(x => x['release_year']))
        yearRange.min = yearLimit[0]
        yearRange.max = yearLimit[1]
        yearRange.value = yearRange.min

        return keys
    }


    tickValuesFormatter(value, index) {
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


    animateSlider(graphRefreshFunction) {
        const yearRange = d3.select("#yearRange")
        const yearPlayButton = d3.select("#yearPlay")
        const yearText = d3.select("#yearText")
        const durationCoefficient = 1 -
            (yearRange.property("value") - yearRange.attr('min')) / (yearRange.attr('max') - yearRange.attr('min'))
        /*
            This coefficient is need to guarantee that the speed of the slider is always the same
            also when it doesn't start from the starting point.
            For example without it, if the animation start from 1950, it took 5s to reach the end,
            but it took always 5s when it starts from 2000 and goes until the end.
         */

        if (yearPlayButton.text() === "Play") {
            yearPlayButton.html("Stop")
            yearRange
                .transition()
                .duration(5000 * durationCoefficient)
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

//Create the graph, if there is still a graph, it deletes and create a new one


    updateGraph(svg) {

        const xSelect = document.getElementById("bubbleXSelect")
        const ySelect = document.getElementById("bubbleYSelect")
        const radiusSelect = document.getElementById("bubbleRadiusSelect")
        const checkboxByYear = document.getElementById("filterByYear")

        const xSelectedField = this.keys[xSelect.value]
        const ySelectedField = this.keys[ySelect.value]
        const radiusSelectedField = this.keys[radiusSelect.value]

        d3.selectAll(".bubbleAxis")
            .remove()
        d3.selectAll(".bubbleDot")
            .remove()

        this.xScaleLinear = d3.scaleLinear()
            .domain(d3.extent(this.movies.map(movie => movie[xSelectedField])))
            .range([0, this.width]);
        let xAxis =
            svg.append("g")
                .attr("class", "bubbleAxis")
                .attr("transform", "translate(0," + this.height + ")")
        if (xSelectedField === "release_year")
            xAxis.call(d3.axisBottom(this.xScaleLinear));
        else
            xAxis.call(d3.axisBottom(this.xScaleLinear).tickFormat(this.tickValuesFormatter))


        // Add Y axis
        this.yScaleLinear = d3.scaleLinear()
            .domain(d3.extent(this.movies.map(movie => movie[ySelectedField])))
            .range([this.height, 0]);
        let yAxis =
            svg.append("g")
                .attr("class", "bubbleAxis")
        if (ySelectedField === "release_year")
            yAxis.call(d3.axisLeft(this.yScaleLinear))
        else
            yAxis.call(d3.axisLeft(this.yScaleLinear).tickFormat(this.tickValuesFormatter))

        let z;
        if (radiusSelectedField === undefined) {//Disabled
            z = function (a) {
                return 2;
            };
        }
        else {
            z = d3.scaleLinear()
                .domain(d3.extent(this.movies.map(movie => movie[radiusSelectedField])))
                .range([1, 20]);
        }

        const yearRange = document.getElementById("yearRange")
        let filteredData = checkboxByYear.checked ?
            this.movies.filter(x => x.release_year == yearRange.value) : this.movies

        // Add dots
        let dots = svg.append('g')
            .attr("class", "bubbleDot")
            .selectAll("dot")
            .data(filteredData)
            .enter()
            .append("circle")
            .attr("cx", (d) => {
                return this.xScaleLinear(d[xSelectedField])
            })
            .attr("cy", (d) => {
                return this.yScaleLinear(d[ySelectedField])
            })
            .attr("id", (d) => {
                return "dot" + d['id']
            })
            .attr("r", (d) => {
                return z(d[radiusSelectedField]);
            })
            .attr("stroke", "black")
            .on('mouseover', e => {
                const filmId = e.target.id.replace("dot", "")
                const selectedFilm = this.movies.find(x => x.id == filmId)
                console.log(selectedFilm.title)
            })

    }


    onBrush(e) {
        const xSelect = document.getElementById("bubbleXSelect")
        const ySelect = document.getElementById("bubbleYSelect")

        const xSelectedField = this.keys[xSelect.value]
        const ySelectedField = this.keys[ySelect.value]

        const topLeft = e.selection[0]
        const bottomRight = e.selection[1]
        const xValues = [this.xScaleLinear.invert(topLeft[0]), this.xScaleLinear.invert(bottomRight[0])]
        const yValues = [this.yScaleLinear.invert(topLeft[1]), this.yScaleLinear.invert(bottomRight[1])]

        const checkboxByYear = d3.select("#filterByYear")
        const yearRange = d3.select("#yearRange")
        const filterByYearEnabled = checkboxByYear.node().checked
        const selectedYear = yearRange.node().value

        this.selectedMovies = this.movies.filter(movie => {
            const filterByYear = (filterByYearEnabled ? movie['release_year'] == selectedYear : true)

            return xValues[0] < movie[xSelectedField] && movie[xSelectedField] < xValues[1]
                && yValues[1] < movie[ySelectedField] && movie[ySelectedField] < yValues[0]
               && filterByYear
        })
        this.highLightSelected(this.selectedMovies.map(x=>x.id))
        this.updateSelection();
    }

    highLightSelected(selectedIds){
        this.movies.forEach(movie=>{
            if(selectedIds.includes(movie.id))
                d3.selectAll("#dot"+movie.id).attr("class","bubbleSelectedDot")
            else
                d3.selectAll("#dot"+movie.id).attr("class","bubbleDot")
        })
    }

    getSelected() {
        super.getSelected();
        return this.selectedMovies.map(x=>x.id);
    }

    setSelection(selection) {
        super.setSelection(selection);
        this.highLightSelected(selection)
    }

}

export {BubblePlot}