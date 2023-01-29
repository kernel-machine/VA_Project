import {Graph} from "./Graph.js";
import {range, tickValuesFormatter, tickValuesFormatterSimple} from "../common/utils.js";

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
        'revenue_inflated': "Revenue (Inf.)",
        "runtime": "Runtime",
        "release_year": "Release year",
        'budget': "Budget",
        'budget_inflated': "Budget (Inf.)"
    }

    measureUnits = {
        'popularity': "",
        'vote_avg': "",
        'vote_count': "",
        'revenue': "($)",
        'revenue_inflated': "($)",
        "runtime": "(Minutes)",
        "release_year": "",
        'budget': "($)",
        'budget_inflated': "($)"
    }

    selectedGenre = undefined

    constructor(movies) {
        super("Column plot");
        this.movies = movies.map(x => {
            x.popularity = Math.round(x.popularity)
            return x
        })

        const margin = {top: 10, right: 45, bottom: 80, left: 45}

        const bboxSize = d3.select("#columnPlot").node().getBoundingClientRect()
        this.width = bboxSize.width - margin.right - margin.left
        this.height = (this.width / 2.25)

        this.svg = d3.select("#columnPlot")
            .append("svg")
            .attr("width", bboxSize.width)
            .attr("height", this.height + margin.top + margin.bottom)
            .append("g")
            .attr("transform", "translate(" + (margin.left + margin.right) / 2 + "," + margin.top + ")")

        this.svg.append("defs").append("SVG:clipPath")
            .attr("id", "clipColumn")
            .append("SVG:rect")
            .attr("width", this.width)
            .attr("height", this.height)
            .attr("x", 0)
            .attr("y", 0);

        this.drawBrush()

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

        this.genres = this.genres.map(x => {
            if (x.name === "Science Fiction") x.name = "Sci-Fi"
            return x
        })

        this.colorScheme = d3.scaleOrdinal().domain(this.genres.map(x => x.name))
            //Colors generated by http://vrl.cs.brown.edu/color
            .range(["#52ef99", "#fd048f", "#80de1a", "#8138fc", "#5e9222", "#e376d4", "#18441b", "#f0b6d0", "#441f5d", "#cddb9b", "#1607a3", "#d3cb04", "#5064be", "#ef972d", "#043255", "#8ae1f9", "#9e211d", "#2c928b", "#f5603a", "#4c270a"])

        this.keys = this.makeUI()
        const xSelect = d3.select("#columnXSelect")
        const ySelect = d3.select("#columnYSelect")
        const onSelectChange = () => {
            this.updateGraph(this.movies)
        }
        xSelect.on('change', onSelectChange)
        ySelect.on('change', onSelectChange)

        this.updateGraph(this.movies)
    }

    //Draw the brush area used to zoom
    drawBrush() {
        this.brush = d3.brushX()
            .extent([[0, 0], [this.width, this.height]])
            .on("end", (e) => {
                this.animateScale(e)
            })

        this.svg.append("g")
            .attr("class", "brush_column")
            .call(this.brush)
    }

    //Called on zoom
    animateScale(selectionEvent = null) {
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

        const selectedMovies = this.movies.filter(m => m[xSelectedField] > bounds[0] && m[xSelectedField] < bounds[1])
        this.updateGraph(selectedMovies)
        d3.selectAll(".brush_column").remove()
        //Draw new brush area
        this.drawBrush()
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
                    textElement: tickValuesFormatter(selElement[0]) + "-" + tickValuesFormatter(selElement[1]),
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
                //obj.sum=Math.round(obj.sum)
                return obj
            })
    }

    /**
     * Groups the movies by the selected field
     *
     * @param {array} fieldsToProcess array with the fields of the x axis
     * @param selectedField
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
        if (selectedField == "vote_count" && genreGrouped.some(e => e.rangeElement != undefined)) {
            values = genreGrouped.map(e => e.rangeElement).reduce((prev, curr) => {
                if (curr) {
                    prev.push(curr[0])
                    prev.push(curr[1])
                }
                return prev
            }, [])
        }
        else {
            values = genreGrouped.map(e => e.selElement)
        }

        return d3.extent(values)
    }

    updateAxisLabels(xSelectedField) {
        let spaceTaken = 0
        this.xAxis.selectAll("text")
            .attr("transform", (d, i) => {
                    let label = this.groupedMovies?.result[i]?.textElement
                    if (!label)
                        label = tickValuesFormatterSimple(d)
                    if (label && xSelectedField != "vote_avg") {
                        const length = label.length * 7
                        const offset = length / 2
                        spaceTaken = Math.max(offset, spaceTaken)
                        return "rotate(30),translate(" + offset + ",-2)"
                    }
                    else
                        return "rotate(0),translate(0,0)"
                }
            )

        this.xAxis.append("text")
            .text(this.niceNames [xSelectedField] + " " + this.measureUnits[xSelectedField])
            .style("fill", "black")
            .attr("transform", "rotate(0)")
            .attr("y", 30 + spaceTaken)
            .attr("x", this.width / 2)
    }

    updateGraph(movies) {
        const xSelect = document.getElementById("columnXSelect")
        const xSelectedField = this.keys[xSelect.value]

        this.newXScale = undefined

        d3.selectAll(".columnAxis")
            .remove()

        let genreGrouped = [...new Set(movies.map(x => x[xSelectedField]).sort())]
        this.groupedMovies = this.groupMoviesBySelectedField(genreGrouped, xSelectedField)
        let maxValue
        if (this.selectedGenre === undefined)
            maxValue = d3.max(this.groupedMovies.result.map(x => x.sum))
        else
            maxValue = d3.max(this.groupedMovies.result.map(x => x[this.selectedGenre]))

        let bounds = this.getXBoundsByGropedMovies(this.groupedMovies.result, xSelectedField)

        if (xSelectedField == "release_year") {
            bounds[1] += 0.5
            bounds[0] -= 0.5
        }

        const isProportional = document.getElementById("columnYSelect").value == 1
        if (isProportional) {
            //Normalize
            this.groupedMovies.result = this.groupedMovies.result.map(e => {
                const ratio = maxValue / e.sum
                e.sum = 0
                this.genres.map(x => x.name).forEach(genre => {
                    e[genre] *= ratio
                    e.sum += e[genre]
                })
                return e
            }).map(e => {
                e.sum = 0
                this.genres.map(x => x.name).forEach(genre => {
                    e[genre] = (e[genre] / maxValue) * 100
                    e.sum += e[genre]
                })
                return e
            })
        }


        this.xScaleLinear = d3.scaleLinear()
            .domain(bounds)
            .range([0, this.width])

        this.xAxis =
            this.svg.append("g")
                .attr("class", "columnAxis")
                .attr("transform", "translate(0," + this.height + ")")

        if (!this.groupedMovies.isGrouped) {
            const numberOfElements = Math.trunc(bounds[1]) - Math.trunc(bounds[0])
            this.xAxis.call(d3.axisBottom(this.xScaleLinear)
                .tickFormat(d => {
                    if (xSelectedField == "release_year")
                        return d3.format("d")(d)
                    else
                        return tickValuesFormatterSimple(d)
                })
                .ticks(Math.min(20, numberOfElements)))
        }
        else {
            this.xAxis.call(d3.axisBottom(this.xScaleLinear)
                .tickValues(this.groupedMovies.result.map(x => x.selElement))
                .tickFormat((d => {
                        return this.groupedMovies.result.find(x => x.rangeElement[0] <= d && d < x.rangeElement[1]).textElement
                    })
                )
            )
        }

        let a;
        if (this.selectedGenre == undefined)
            a = d3.stack().keys(this.genres.map(x => x.name))(this.groupedMovies.result)
        else
            a = d3.stack().keys([this.selectedGenre])(this.groupedMovies.result)

        this.yAxisLinear = d3.scaleLinear()
            .domain([0, isProportional ? 100 : maxValue])
            .range([this.height, 0])

        this.yAxis = this.svg.append("g")
            .attr("class", "columnAxis")
            .call(d3.axisLeft(this.yAxisLinear).tickFormat(d => {
                if (d > 1000) return Math.floor(d / 1000) + "k"
                if (isProportional) d = d + "%"
                    return d
                }
            ))

        this.updateAxisLabels(xSelectedField)

        this.yAxis.append("text")
            .text(isProportional ? "Percentage" : "Amount")
            .style("fill", "black")
            .attr("transform", "rotate(90)")
            .attr("y", 40)
            .attr("x", this.height / 2)
            .attr("text-anchor", "middle")

        this.svg.selectAll(".bars").remove()
        const minDistance = this.groupedMovies.result.map(x => x.selElement).reduce((accumulator, currentValue, currentIndex, array) => {
            const nextIndex = currentIndex + 1;
            const nextValue = array[nextIndex]
            if (nextValue) {
                const interval = Math.abs(this.xScaleLinear(nextValue) - this.xScaleLinear(currentValue))
                accumulator = Math.min(interval, accumulator)
            }
            return accumulator
        }, Infinity)
        const spaceBetweenGroups = (this.width / this.groupedMovies.result.length) - 2
        let width;
        if (this.groupedMovies.isGrouped) {
            width = spaceBetweenGroups
        }
        else {
            width = minDistance * 0.95
        }
        width = Math.max(width, 3)
        this.bars = this.svg.append("g").attr("clip-path", "url(#clipColumn)")
        this.bars
            .selectAll("g")
            .data(a)
            .enter().append("g")
            .attr("fill", d => this.colorScheme(d.key))
            .selectAll("rect")
            .data(d => d)
            .enter().append("rect")
            .attr("x", d => this.xScaleLinear(d.data.selElement) - width / 2)
            .attr("y", d => this.yAxisLinear(d[1]))
            .transition().duration(400)
            .attr("height", d => this.yAxisLinear(d[0]) - this.yAxisLinear(d[1]))
            .attr("width", width)
            .attr("class", "bars")

        this.drawLegend()
    }


    drawLegend() {
        const legendWidth = d3.select("#columnPlot").node().getBoundingClientRect().width
        d3.selectAll(".legend").remove()
        let legend = d3.select("#column_legend")
            //.attr("transform", "translate(0,30)")
            .append("svg")
            .attr("class", "legend")
            .attr("width", legendWidth)
            .attr("height", 30)
            .append("g")
            .attr("transform", "translate(" + 7 + "," + 5 + ")")
            .selectAll("g")

        const spaceBetweenElements = 2 * legendWidth / this.genres.length
        legend.data(this.genres.map(x => x.name))
            .enter()
            .append("circle")
            .attr("cx", (d, i) => (i % 10) * spaceBetweenElements)
            .attr("cy", (d, i) => i < 10 ? 0 : 15) // 100 is where the first dot appears. 25 is the distance between dots
            .attr("r", 4)
            .style("fill", d => this.colorScheme(d))

        legend.data(this.genres.map(x => x.name))
            .enter()
            .append("text")
            .attr("id", (d) => d)
            .attr("x", (d, i) => 5 + (i % 10) * spaceBetweenElements)
            .attr("y", (d, i) => 2.5 + (i < 10 ? 0 : 15)) // 100 is where the first dot appears. 25 is the distance between dots
            .style("fill", "black")
            .text(d => d)
            .style("font-weight", (d) => d == this.selectedGenre ? "bold" : "initial")
            .style("text-decoration", (d) => d == this.selectedGenre ? "underline" : "initial")
            .attr("text-anchor", "left")
            .style("alignment-baseline", "start")
            .attr("font-size", 9)
            .on("click", e => {
                const newId = e.target.id
                if (this.selectedGenre == newId) {
                    this.selectedGenre = undefined
                }
                else
                    this.selectedGenre = e.target.id
                this.updateGraph(this.movies)
            })
    }

    makeUI() {
        const xSelect = document.getElementById("columnXSelect")

        const keys = Object.keys(this.movies[0])
            .filter(key => (typeof this.movies[0][key]) == "number")
            .filter(key => key !== "id")

        for (let i in keys) {
            let optionX = document.createElement("option")
            optionX.text = this.niceNames[keys[i]]
            optionX.value = i
            xSelect.add(optionX)
        }

        return keys
    }
}