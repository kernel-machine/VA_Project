import { Graph } from "./Graph.js";
import { range } from "../common/utils.js";

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

        const margin = { top: 20, right: 0, bottom: 20, left: 45 }

        const bboxSize = d3.select("#columnPlot").node().getBoundingClientRect()
        this.width = (bboxSize.width * 0.9)
        this.height = (this.width / 2)

        let svg = d3.select("#columnPlot")
            .append("svg")
            .attr("width", bboxSize.width + margin.right + margin.left)
            .attr("height", this.height + margin.top + margin.bottom)
            .append("g")
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")")

        let clip = svg.append("defs").append("SVG:clipPath")
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

    animateScale(svg, selectionEvent = null) {

        const xSelect = document.getElementById("columnXSelect")
        const xSelectedField = this.keys[xSelect.value]
        const selectedElements = [...new Set(this.movies.map(x => x[xSelectedField]))]

        let bounds = d3.extent(selectedElements);

        if (selectionEvent && selectionEvent.selection)
            if (this.newXScale)
                bounds = selectionEvent.selection.map(e => this.newXScale.invert(Math.trunc(e)))
            else
                bounds = selectionEvent.selection.map(e => this.xScaleLinear.invert(Math.trunc(e)))

        this.newXScale = d3.scaleLinear()
            .domain(bounds)
            .range([0, this.width]);

        const filteredElements = selectedElements.filter(x => x > bounds[0] && x < bounds[1])
        const numberOfElements = Number.isInteger(filteredElements[0]) ? (Math.trunc(bounds[1]) - Math.trunc(bounds[0])) : filteredElements.length

        const width = Math.max(Math.floor((this.width / numberOfElements) * 0.9), 1)

        if (xSelectedField === "release_year" || xSelectedField === "runtime")
            this.xAxis.call(d3.axisBottom(this.newXScale).tickFormat(d3.format("d")).ticks(Math.min(19, numberOfElements)))

        else
            this.xAxis.call(d3.axisBottom(this.newXScale).tickFormat(this.tickValuesFormatter))

        //Computation for y Axis
        const genreGrouped = filteredElements
            .sort()
            .map(selElement => {
                let obj = {
                    selElement: selElement,
                    sum: 0
                }
                this.genres.forEach(x => {
                    obj[x.name] = x.movies.filter(x => x[xSelectedField] === selElement).length
                    obj.sum += obj[x.name]
                    return obj
                })
                return obj
            });

        console.log(genreGrouped)
        const maxValue = d3.max(genreGrouped.map(x => x.sum))

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

    updateGraph(svg) {
        const xSelect = document.getElementById("columnXSelect")
        const xSelectedField = this.keys[xSelect.value]

        this.newXScale = undefined

        d3.selectAll(".columnAxis")
            .remove()

        const genreGrouped = [...new Set(this.movies.map(x => x[xSelectedField])
            .sort())]
            .map(selElement => {
                let obj = {
                    selElement: selElement,
                    sum: 0
                }
                this.genres.forEach(x => {
                    obj[x.name] = x.movies.filter(x => x[xSelectedField] === selElement).length
                    obj.sum += obj[x.name]
                    return obj
                })
                return obj
            })

        const maxValue = d3.max(genreGrouped.map(x => x.sum))

        let values = genreGrouped.map(e => e.selElement)
        const bounds = d3.extent(values)
        this.xScaleLinear = d3.scaleLinear()
            .domain(bounds)
            .range([0, this.width]);

        const numberOfElements = Math.trunc(bounds[1]) - Math.trunc(bounds[0])
        this.xAxis =
            svg.append("g")
                .attr("class", "columnAxis")
                .attr("transform", "translate(0," + this.height + ")")
        if (xSelectedField === "release_year")
            this.xAxis.call(d3.axisBottom(this.xScaleLinear).tickFormat(d3.format("d")).ticks(Math.min(20, numberOfElements)))

        else
            this.xAxis.call(d3.axisBottom(this.xScaleLinear).tickFormat(this.tickValuesFormatter))

        this.yAxisLinear = d3.scaleLinear()
            .domain([0, maxValue])
            .range([this.height, 0])

        this.yAxis = svg.append("g")
            .attr("class", "columnAxis")
            .call(d3.axisLeft(this.yAxisLinear))

        let a = d3.stack().keys(this.genres.map(x => x.name))(genreGrouped)

        const colorScheme = d3.scaleOrdinal().domain(this.genres.map(x => x.name))
            //Colors generated by http://vrl.cs.brown.edu/color
            .range(["#52ef99", "#fd048f", "#80de1a", "#8138fc", "#5e9222", "#e376d4", "#18441b", "#f0b6d0", "#441f5d", "#cddb9b", "#1607a3", "#d3cb04", "#5064be", "#ef972d", "#043255", "#8ae1f9", "#9e211d", "#2c928b", "#f5603a", "#4c270a"])

        svg.selectAll(".bars").remove()
        const width = Math.max((this.width / genreGrouped.length) - 2, 3)
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