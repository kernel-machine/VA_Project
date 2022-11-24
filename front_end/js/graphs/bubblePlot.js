import {Graph} from "./Graph.js";
import {
    groupBy,
    hideMovieInfo,
    invertedColor,
    range,
    showMovieInfo,
    tickValuesFormatterSimple
} from "../common/utils.js";
import {Group} from "../common/Group.js";

const defaultColor = "#2c7bb6"

class BubblePlot extends Graph {

    niceNames = {
        'popularity': "Popularity",
        'vote_avg': "Average rate",
        'vote_count': "Number of rates",
        'revenue': "Revenue",
        "runtime": "Runtime",
        "release_year": "Release year",
        'budget': "Budget"
    }

    measureUnits = {
        'popularity': "",
        'vote_avg': "",
        'vote_count': "",
        'revenue': "($)",
        "runtime": "(Minutes)",
        "release_year": "",
        'budget': "($)"
    }

    constructor(movies) {
        super("Bubble Plot")
        this.movies = movies
        this.keys = this.makeUI()
        this.selectedMovies = [];
        this.highlightedIds = []

        this.margin = {top: 20, right: 180, bottom: 40, left: 50}

        const bboxSize = d3.select("#bubblePlot").node().getBoundingClientRect()
        this.width = bboxSize.width - this.margin.right - this.margin.left
        this.height = (this.width / 2)

        this.svg = d3.select("#bubblePlot")
            .append("svg")
            .attr("width", bboxSize.width)
            .attr("height", this.height + this.margin.top + this.margin.bottom)
            .append("g")
            .attr("transform", "translate(" + this.margin.left + "," + this.margin.top + ")")
            .call(d3.brush()
                .on("brush", (e) => this.onBrush(e))
                .on("end", (e) => {
                    if (e.selection == null) {
                        this.clearSelection()
                    }
                }))

        let yearText = this.svg.append("text")
            .attr("x", this.width / 2)
            .attr("y", this.height / 1.6)
            .attr("id", "yearText")
            .attr("opacity", 1)

        this.updateGraph()
        const xSelect = d3.select("#bubbleXSelect")
        const ySelect = d3.select("#bubbleYSelect")
        const radiusSelect = d3.select("#bubbleRadiusSelect")
        const checkboxByYear = d3.select("#filterByYear")
        const graphRefresh = () => {
            this.updateGraph(true)
        }
        xSelect.on('change', graphRefresh)
        ySelect.on('change', graphRefresh)
        radiusSelect.on('change', graphRefresh)

        const yearRange = d3.select("#yearRange")
        yearRange.on('input', (e) => {
            yearText.html(e.target.value)
            this.updateGraph(false)
        })
        yearText.html(yearRange.property('value'))

        const yearPlayButton = d3.select("#yearPlay")
        yearPlayButton.on('click', () => {
            this.animateSlider(() => {
                this.updateGraph(false)
            })
        })

        checkboxByYear.on('change', (e) => {
            yearText.attr("opacity", e.target.checked ? 1 : 0)
            yearPlayButton.node().disabled = !e.target.checked
            yearRange.node().disabled = !e.target.checked
            this.updateGraph(false)

        })
        checkboxByYear.dispatch("change")
        this.updateGraph(false)
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
    updateGraph(isAnUpdate = false, filtered_elements = []) {

        const xSelect = document.getElementById("bubbleXSelect")
        const ySelect = document.getElementById("bubbleYSelect")
        const radiusSelect = document.getElementById("bubbleRadiusSelect")
        const checkboxByYear = document.getElementById("filterByYear")

        const xSelectedField = this.keys[xSelect.value]
        const ySelectedField = this.keys[ySelect.value]
        const groupSelectedField = this.keys[radiusSelect.value]

        if (radiusSelect.value >= 0) {
            this.svg.attr("transform", "translate(" + this.margin.left + "," + this.margin.top + ")")
        }
        else
            this.svg.attr("transform", "translate(" + ((this.margin.left / 2) + (this.margin.right / 2)) + "," + this.margin.top + ")")


        d3.selectAll(".bubbleAxis")
            .remove()

        this.xScaleLinear = d3.scaleLinear()
            .domain(d3.extent(this.movies.map(movie => movie[xSelectedField])))
            .range([0, this.width]);
        let xAxis =
            this.svg.append("g")
                .attr("class", "bubbleAxis")
                .attr("transform", "translate(0," + this.height + ")")
        if (xSelectedField === "release_year")
            xAxis.call(d3.axisBottom(this.xScaleLinear));
        else
            xAxis.call(d3.axisBottom(this.xScaleLinear).tickFormat(tickValuesFormatterSimple))


        // Add Y axis
        this.yScaleLinear = d3.scaleLinear()
            .domain(d3.extent(this.movies.map(movie => movie[ySelectedField])))
            .range([this.height, 0]);
        let yAxis =
            this.svg.append("g")
                .attr("class", "bubbleAxis")
        if (ySelectedField === "release_year")
            yAxis.call(d3.axisLeft(this.yScaleLinear))
        else
            yAxis.call(d3.axisLeft(this.yScaleLinear).tickFormat(tickValuesFormatterSimple))


        this.svg.selectAll(".labels").remove()
        const yLabel = this.niceNames[ySelectedField] + " " + this.measureUnits[ySelectedField]
        yAxis.append("text")
            .attr("class", "labels")
            .text(yLabel)
            .style("fill", "black")
            .attr("transform", "rotate(90)")
            .attr("y", 47.5)
            .attr("x", (this.height / 2) + (yLabel.length / 2) * 2.8)

        const xLabel = this.niceNames[xSelectedField] + " " + this.measureUnits[xSelectedField]
        xAxis.append("text")
            .attr("class", "labels")
            .text(xLabel)
            .style("fill", "black")
            .attr("y", 35)
            .attr("x", this.width / 2)

        const yearRange = document.getElementById("yearRange")
        let filteredData = checkboxByYear.checked ?
            this.movies.filter(x => x.release_year == yearRange.value) : this.movies

        if (groupSelectedField === undefined) {//Disabled
            // Add dots
            const dots = this.svg.selectAll(".bubbleDot")
            const dotsAreGroup = dots.nodes().map(x => x.id).some(x => x.includes("dotGroup"))
            if (isAnUpdate && !dotsAreGroup) {
                dots
                    .transition().duration(1000)
                    .attr("cx", d => {
                        return this.xScaleLinear(d[xSelectedField])
                    })
                    .attr("cy", (d) => {
                        return this.yScaleLinear(d[ySelectedField])
                    })
            }
            else {
                dots.remove()
                this.svg.selectAll(".bubbleLegend").remove()
                this.svg.append('g')
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
                    .attr("r", "5")
                    .style("stroke", "black")
                    .style("fill", defaultColor)
                    .attr("class", "bubbleDot")
                    .on('mouseover', e => {
                        const filmId = e.target.id.replace("dot", "")
                        this.hoverAnElement(filmId)
                        const movie = this.movies.find(x => x.id == filmId)
                        showMovieInfo(movie, e.pageX, e.pageY)
                    })
                    .on('mouseleave', e => {
                        const filmId = e.target.id.replace("dot", "")
                        this.leaveAnElement(filmId)
                        hideMovieInfo()
                    })
            }
        }
        else {
            this.svg.selectAll(".bubbleDot").remove()
            this.svg.selectAll(".bubbleLegend").remove()
            const groupsNumber = 10
            const extent = d3.extent(this.movies.map(movie => movie[groupSelectedField]))
            const startValue = extent[0]
            const endValue = extent[1]
            const stepAmount = (endValue - startValue) / groupsNumber
            const groups = []
            for (let i = startValue; i < endValue; i += stepAmount) {
                const intervalStart = Math.floor(i)
                const intervalEnd = Math.floor(i + stepAmount)
                let filteredMovie = filteredData.filter(x => x[groupSelectedField] >= intervalStart && x[groupSelectedField] < intervalEnd)
                if (filtered_elements.length > 0) {
                    filteredMovie = filteredMovie.filter(x => filtered_elements.includes(x.id))
                }
                if (filteredMovie.length > 0) {
                    const group = new Group(intervalStart, intervalEnd, filteredMovie)
                    groups.push(group)
                }
            }

            const output = [5, 10, 17.5, 25, 35]
            const radiusScale = d3.scaleQuantile()
                .domain(groups.map(x => x.getElementCount()))
                .range(output)

            const colorScale = d3.scaleSequential()
                .domain(d3.extent(range(0, groups.length)))
                .interpolator(filtered_elements.length > 0 ? d3.interpolateReds : d3.interpolateGnBu);

            // Add dots
            this.svg.append('g')
                .selectAll("dot")
                .data(groups)
                .enter()
                .append("circle")
                .attr("cx", (d) => {
                    return this.xScaleLinear(d.getAvgField(xSelectedField))
                })
                .attr("cy", (d) => {
                    return this.yScaleLinear(d.getAvgField(ySelectedField))
                })
                .attr("id", (d) => {
                    return "dotGroup" + d.getIntervalString(true)
                })
                .attr("r", (d) => {
                    return radiusScale(d.getElementCount());
                })
                .style("stroke", "black")
                .attr("class", "bubbleDot")
                .style("fill", (d) => {
                    const color = d3.color(colorScale(groups.indexOf(d)))
                    return color.formatHex()
                })

            const a = groups.map(x => {
                let out = {}
                out.amount = x.getElementCount()
                out.radius = radiusScale(x.getElementCount())
                return out
            }).sort((a, b) => a.radius - b.radius).reverse()
            const grouped = groupBy(a, e => e.radius)

            //Draw circles
            let yOffset = 20
            const largerRadius = d3.max(Array.from(grouped.keys()))
            grouped.forEach((val, key) => {
                const radius = key
                this.svg.append("circle")
                    .attr("class", "bubbleLegend")
                    .style("stroke", "black")
                    .attr("cx", this.width + 50)
                    .attr("cy", yOffset)
                    .attr("r", radius)
                this.svg.append("text")
                    .attr("class", "bubbleLegend")
                    .attr("text-anchor", "middle")
                    .text(d3.extent(val.map(x => x.amount)).join("-"))
                    .style("fill", "black")
                    .attr("x", this.width + 15 + largerRadius)
                    .attr("y", yOffset + radius + 15)
                yOffset += 2 * radius + 20
            })

            //Draw colors
            const height = this.height / 10
            this.svg.append("g").selectAll(".bubbleLegend")
                .data(groups)
                .enter()
                .append("rect")
                .attr("class", "bubbleLegend")
                .style("stroke", "black")
                .style("fill", (d) => d3.color(colorScale(groups.indexOf(d))).formatHex())
                .attr("width", 80)
                .attr("height", height)
                .attr("x", this.width + 60 + largerRadius)
                .attr("y", (d) => groups.indexOf(d) * height)
            this.svg.append("g")
                .selectAll(".bubbleLegend")
                .data(groups)
                .enter()
                .append("text")
                .text(d => d.getIntervalString(groupSelectedField !== "release_year"))
                .attr("class", "bubbleLegend")
                .style("font-size", "8pt")
                .style("fill", d => invertedColor(d3.color(colorScale(groups.indexOf(d))).formatHex()))
                .attr("text-anchor", "middle")
                .attr("x", this.width + 60 + largerRadius + 40)
                .attr("y", (d) => groups.indexOf(d) * height + height / 2 + 4)
        }
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
        this.selectElements(this.selectedMovies.map(x => x.id))
    }


    colorElement(movieId, color) {
        d3.select("#dot" + movieId).style("fill", color)
            .raise()
    }

    colorAllElements(color) {
        d3.selectAll(".bubbleDot").style("fill", color)
    }

    highlightElements(idElements) {
        if (document.getElementById("bubbleRadiusSelect") < 0) {
            super.highlightElements(idElements);
        }
        else {
            this.updateGraph(false, idElements)
        }
    }
}

export {BubblePlot}