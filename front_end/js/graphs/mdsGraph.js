import { Graph } from "./Graph.js";


export class MDSGraph extends Graph {

    constructor(movies) {
        super()
        this.movies = movies

        const margin = { top: 20, right: 10, bottom: 20, left: 25 }

        const bboxSize = d3.select("#mdsPlot").node().getBoundingClientRect()
        this.width = (bboxSize.width) - margin.left - margin.bottom
        this.height = (this.width / 2.1)

        this.svg = d3.select("#mdsPlot")
            .append("svg")
            .attr("width", this.width)
            .attr("height", this.height + margin.top + margin.bottom)
            .append("g")
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")")
            .call(d3.brush()
                .on("brush", (e) => this.onBrush(e))
                .on("end", (e) => {
                    if (e.selection == null) {
                        this.clearSelection()
                    }
                }))
            .call(d3.zoom()
                .scaleExtent([1, 8])
                //.on("zoom", (transform) => console.log(transform.transform))
            )



        this.xScaleLinear = d3.scaleLinear()
            .domain([-1, 1])
            .range([0, this.width])

        this.yScaleLinear = d3.scaleLinear()
            .domain([-1, 1])
            .range([0, this.height])

        this.svg.append("g")
            .attr("transform", "translate(0," + this.height + ")")
            .call(d3.axisBottom(this.xScaleLinear));

        this.svg.append("g")
            .call(d3.axisLeft(this.yScaleLinear))

        console.log(this.movies.map(x => x.mds))

        this.svg.append("g")
            .selectAll("dot")
            .data(this.movies)
            .enter()
            .append("circle")
            .attr("cx", d => this.xScaleLinear(d.mds[0]))
            .attr("cy", d => this.yScaleLinear(d.mds[1]))
            .attr("r", 2)
            .style("fill", this.defaultColor)
            .attr("id", d => "mdsDot" + d.id)
            .attr("class", "mdsDot")
            .on('mouseover', e => {
                const filmId = e.target.id.replace("mdsDot", "")
                this.hoverAnElement(filmId)
            })
            .on('mouseleave', e => {
                const filmId = e.target.id.replace("mdsDot", "")
                this.leaveAnElement(filmId)
            })



    }

    onBrush(e) {

        const topLeft = e.selection[0]
        const bottomRight = e.selection[1]
        const xValues = [this.xScaleLinear.invert(topLeft[0]), this.xScaleLinear.invert(bottomRight[0])]
        const yValues = [this.yScaleLinear.invert(topLeft[1]), this.yScaleLinear.invert(bottomRight[1])]

        this.selectedMovies = this.movies.filter(movie => {
            return xValues[0] < movie.mds[0] && movie.mds[0] < xValues[1]
                && yValues[0] < movie.mds[1] && movie.mds[1] < yValues[1]
        })
        this.selectElements(this.selectedMovies.map(x => x.id))
        this.updateSelection();

    }

    colorElement(movieId, color) {
        d3.select("#mdsDot" + movieId).style("fill", color)
    }

    colorAllElements(color) {
        d3.selectAll(".mdsDot").style("fill", color)
    }
}