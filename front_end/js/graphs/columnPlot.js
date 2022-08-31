import { Graph } from "./Graph.js";
import { range } from "../common/utils.js";

class MoviesResult {
    isGrouped = false
    result = []
}

export class ColumnPlot extends Graph {

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

        const margin = { top: 20, right: 0, bottom: 50, left: 45 }

        const bboxSize = d3.select("#columnPlot").node().getBoundingClientRect()
        this.width = (bboxSize.width * 0.9)
        this.height = (this.width / 2.2)

        let svg = d3.select("#columnPlot")
            .append("svg")
            .attr("width", bboxSize.width + margin.right + margin.left)
            .attr("height", this.height + margin.top + margin.bottom)
            .append("g")
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")")

        svg.append("defs").append("SVG:clipPath")
            .attr("id", "clipColumn")
            .append("SVG:rect")
            .attr("width", this.width)
            .attr("height", this.height)
            .attr("x", 0)
            .attr("y", 0);

        this.drawBrush(svg)

        const uniqueIds = []
        this.genres = this.movies.map(m => m.genres)
            .reduce((prev, curr) => prev.concat(curr))
            .filter(genre => {
                const isDuplicate = uniqueIds.includes(genre.id);
                if (!isDuplicate) {
                    uniqueIds.push(genre.id)
                    return true
                }
                return false
            })
            .map(x => {
                x.movies = this.movies.filter(m => m.genres.map(genre => genre.id).includes(x.id));
                x.moviesLength = x.movies.length
                return x;
            })

        this.keys = this.makeUI()
        const xSelect = d3.select("#columnXSelect")
        const onSelectChange = () => {
            this.updateGraph(svg)
        }
        xSelect.on('change', onSelectChange)

        this.updateGraph(svg)
    }

    //Draw the brush area used to zoom
    drawBrush(svg) {
        this.brush = d3.brushX()
            .extent([[0, 0], [this.width, this.height]])
            .on("end", (e) => {
                this.animateScale(svg, e)
            })

        svg.append("g")
            .attr("class", "brush_column")
            .call(this.brush)
    }

    //Called on zoom
    animateScale(svg, selectionEvent = null) {
        const xSelect = document.getElementById("columnXSelect")
        const xSelectedField = this.keys[xSelect.value]
        const selectedElements = [...new Set(this.movies.map(x => x[xSelectedField]))]

        let bounds = d3.extent(selectedElements);

        // If it is a selection, get min and max bounds
        if (selectionEvent && selectionEvent.selection)
            if (this.newXScale)
                bounds = selectionEvent.selection.map(e => this.newXScale.invert(e))
            else
                bounds = selectionEvent.selection.map(e => this.xScaleLinear.invert(e))

        this.newXScale = d3.scaleLinear()
            .domain(bounds)
            .range([0, this.width]);

        const filteredElements = selectedElements.filter(x => x > bounds[0] && x < bounds[1])

        //Computation for y Axis
        const groupedMovies = this.groupMoviesBySelectedField(filteredElements, xSelectedField)
        const maxValue = d3.max(groupedMovies.result.map(x => x.sum))
        const numberOfElements = groupedMovies.result.length

        console.log("ARE GROUPED?",groupedMovies.isGrouped, numberOfElements,maxValue)
        const width = Math.max(Math.floor((this.width / numberOfElements) * 0.9), 1)

        console.log("GROUPED MOVIES", groupedMovies.result)
        if (!groupedMovies.isGrouped) {
            console.log("QUI1")
            const numberOfElements = Math.trunc(bounds[1]) - Math.trunc(bounds[0])
            this.xAxis.call(d3.axisBottom(this.newXScale)
                .tickFormat(d3.format("d"))
                .ticks(Math.min(20, numberOfElements)))
        }
        else {
            console.log("QUI2")
            this.xAxis.call(d3.axisBottom(this.newXScale)
                .tickValues(groupedMovies.result.map(x => x.selElement))
                .tickFormat((d => groupedMovies.result.find(x => x.rangeElement[0] <= d && d < x.rangeElement[1]).textElement))
            )
        }


        let newYScale = d3.scaleLinear()
            .domain([0, maxValue])
            .range([this.height, 0])

        d3.selectAll(".bars")
            .transition().duration(1000)
            .attr("x", d => this.newXScale(d.data.selElement) - width / 2)
            .attr("y", d => newYScale(d[1]))
            .attr("height", d => newYScale(d[0]) - newYScale(d[1]))
            .attr("width", width)

        this.yAxis.transition().duration(1000).call(d3.axisLeft(newYScale))

        //Remove brushed rectangle
        d3.selectAll(".brush_column").remove()
        //Draw new brush area
        this.drawBrush(svg)

    }

    /*
    Groups by the {selectedFiled} in order to have at maximum {maxElements} of groups.
    {genreGrouped} is an array with the all fields that will be used to do the computation, 
    this parameter is used only to computer the lower and upper bounds
    */
    groupMovies(selectedField, genreGrouped, maxElements) {
        let a = []
        const bounds = d3.extent(genreGrouped)
        const rangeElements = range(bounds[0], bounds[1], Math.ceil(bounds[1] / maxElements))
        let length = rangeElements.length
        for (let i = 0; i < length - 1; i += 1) {
            a.push([rangeElements[i], rangeElements[i + 1]])
        }

        return a
            .map(selElement => {
                let obj = {
                    selElement: selElement[0],
                    rangeElement: [selElement[0], selElement[1]],
                    textElement: this.tickValuesFormatter(selElement[0]) + "-" + this.tickValuesFormatter(selElement[1]),
                    //textElement: (selElement[0]) + "-" + (selElement[1]),
                    sum: 0
                }
                this.genres.forEach(x => {
                    const min = selElement[0]
                    const max = selElement[1]
                    obj[x.name] = x.movies.filter(x => min < x[selectedField] && x[selectedField] < max).length
                    obj.sum += obj[x.name]
                })
                return obj
            })
    }

    /*
    Groups the movies by vote_avg, the movies are grouped using integer interval
    */
    groupMoviesForVoteAvg() {
        return range(0, 11, 1).map(selElement => {
            let obj = {
                selElement: selElement,
                sum: 0
            }
            this.genres.forEach(x => {
                obj[x.name] = x.movies.filter(x => Math.trunc(x.vote_avg) === selElement).length
                obj.sum += obj[x.name]
                return obj
            })
            return obj
        })
    }

    /*
    Groups the movies by {selectedField} but using all the values of this field
    */
    moviesByGroup(selectedField, genreGrouped) {
        return genreGrouped
            .map(selElement => {
                let obj = {
                    selElement: selElement,
                    sum: 0
                }
                this.genres.forEach(x => {
                    obj[x.name] = x.movies.filter(x => x[selectedField] === selElement).length
                    obj.sum += obj[x.name]
                    return obj
                })
                return obj
            })
    }

    /**
     * Groups the movies by the selected field 
     *
     * @param {array} fieldsToProcess array with the fields of the x axis
     */

    groupMoviesBySelectedField(fieldsToProcess, selectedField) {
        let genreGrouped = new MoviesResult()

        if (selectedField == "vote_avg") {
            genreGrouped.result = this.groupMoviesForVoteAvg()
            genreGrouped.isGrouped = false
        }
        else if (fieldsToProcess.length > 100) {
            genreGrouped.result = this.groupMovies(selectedField, fieldsToProcess, 20)
            genreGrouped.isGrouped = true
        }
        else {
            genreGrouped.result = this.moviesByGroup(selectedField, fieldsToProcess)
            genreGrouped.isGrouped = false

        }

        return genreGrouped
    }

    getXBoundsByGropedMovies(genreGrouped, selectedField) {
        let values;
        if (selectedField == "vote_count") {
            values = genreGrouped.map(e => e.rangeElement).reduce((prev, curr) => {
                prev.push(curr[0])
                prev.push(curr[1])
                return prev
            }, [])
        }
        else {
            values = genreGrouped.map(e => e.selElement)
        }

        return d3.extent(values)
    }

    updateGraph(svg) {
        const xSelect = document.getElementById("columnXSelect")
        const xSelectedField = this.keys[xSelect.value]

        this.newXScale = undefined

        d3.selectAll(".columnAxis")
            .remove()

        let genreGrouped = [...new Set(this.movies.map(x => x[xSelectedField]).sort())]
        let groupMovies = this.groupMoviesBySelectedField(genreGrouped, xSelectedField)
        const maxValue = d3.max(groupMovies.result.map(x => x.sum))
        const bounds = this.getXBoundsByGropedMovies(groupMovies.result, xSelectedField)

        this.xScaleLinear = d3.scaleLinear()
            .domain(bounds)
            .range([0, this.width]);

        this.xAxis =
            svg.append("g")
                .attr("class", "columnAxis")
                .attr("transform", "translate(0," + this.height + ")")

        if (!groupMovies.isGrouped) {
            const numberOfElements = Math.trunc(bounds[1]) - Math.trunc(bounds[0])
            this.xAxis.call(d3.axisBottom(this.xScaleLinear)
                .tickFormat(d3.format("d"))
                .ticks(Math.min(20, numberOfElements)))
        }
        else {
            this.xAxis.call(d3.axisBottom(this.xScaleLinear)
                .tickValues(groupMovies.result.map(x => x.selElement))
                .tickFormat((d => groupMovies.result.find(x => x.rangeElement[0] <= d && d < x.rangeElement[1]).textElement))
            )
        }

        /*
        this.xAxis.selectAll("text")
            .style("font-size", 20)
            .style("text-anchor", "end")
            .attr("dx", "-8px")
            .attr("dy", "2px")
            .attr("transform", function (d) {
                return "rotate(-45)"
            })
            */
        this.yAxisLinear = d3.scaleLinear()
            .domain([0, maxValue])
            .range([this.height, 0])

        this.yAxis = svg.append("g")
            .attr("class", "columnAxis")
            .call(d3.axisLeft(this.yAxisLinear))

        let a = d3.stack().keys(this.genres.map(x => x.name))(groupMovies.result)

        const colorScheme = d3.scaleOrdinal().domain(this.genres.map(x => x.name))
            //Colors generated by http://vrl.cs.brown.edu/color
            .range(["#52ef99", "#fd048f", "#80de1a", "#8138fc", "#5e9222", "#e376d4", "#18441b", "#f0b6d0", "#441f5d", "#cddb9b", "#1607a3", "#d3cb04", "#5064be", "#ef972d", "#043255", "#8ae1f9", "#9e211d", "#2c928b", "#f5603a", "#4c270a"])

        svg.selectAll(".bars").remove()
        const width = Math.max((this.width / groupMovies.result.length) - 2, 3)
        this.bars = svg.append("g").attr("clip-path", "url(#clipColumn)")
        this.bars
            .selectAll("g")
            .data(a)
            .enter().append("g")
            .attr("fill", d => colorScheme(d.key))
            .selectAll("rect")
            .data(d => d)
            .enter().append("rect")
            .attr("x", d => this.xScaleLinear(d.data.selElement) - width / 2)
            .attr("y", d => this.yAxisLinear(d[1]))
            .attr("height", d => this.yAxisLinear(d[0]) - this.yAxisLinear(d[1]))
            .attr("width", width)
            .attr("class", "bars")
            .enter()

        d3.selectAll(".legend").remove()
        let legend = d3.select("#column_legend")
            .append("svg")
            .attr("class", "legend")
            .attr("width", svg.attr("width"))
            .attr("height", 40)
            .append("g")
            .attr("transform", "translate(" + 7 + "," + 12 + ")")
            .selectAll("g")

        legend.data(this.genres.map(x => x.name))
            .enter()
            .append("circle")
            .attr("cx", (d, i) => (i % 10) * 65)
            .attr("cy", (d, i) => i < 10 ? 0 : 20) // 100 is where the first dot appears. 25 is the distance between dots
            .attr("r", 4)
            .style("fill", d => colorScheme(d))

        legend.data(this.genres.map(x => x.name))
            .enter()
            .append("text")
            .attr("x", (d, i) => 5 + (i % 10) * 65)
            .attr("y", (d, i) => 2.5 + (i < 10 ? 0 : 20)) // 100 is where the first dot appears. 25 is the distance between dots
            .style("fill", "black")
            .text(d => d)
            .attr("text-anchor", "left")
            .style("alignment-baseline", "start")
            .attr("font-size", 9)

    }

    tickValuesFormatter(value) {
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

    makeUI() {
        const xSelect = document.getElementById("columnXSelect")

        const keys = Object.keys(this.movies[0])
            .filter(key => (typeof this.movies[0][key]) == "number")
            .filter(key => key !== "id")

        for (let i in keys) {
            let optionX = document.createElement("option")
            const name = this.niceNames[keys[i]]
            optionX.text = name
            optionX.value = i
            xSelect.add(optionX)
        }

        return keys
    }
}