import { Graph } from "./Graph.js";
import {hideMovieInfo, showMovieInfo} from "../common/utils.js";


export class MDSGraph extends Graph {

    Mode = {
        ZoomMode: 0,
        SelectMode: 1
    }

    constructor(movies) {
        super("MDS Graph")
        this.movies = movies
        this.mouseMode = this.Mode.ZoomMode

        const margin = { top: 20, right: 20, bottom: 20, left: 25 }

        const bboxSize = d3.select("#mdsPlot").node().getBoundingClientRect()
        this.width = bboxSize.width - margin.left - margin.bottom
        this.height = (this.width / 2.1)

        this.svg = d3.select("#mdsPlot")
            .append("svg")
            .attr("width", this.width)
            .attr("height", this.height + margin.top + margin.bottom)
            .call(d3.zoom()
                .scaleExtent([1, 8])
                .on("zoom", (transform) => this.handleZoom(transform))
            )
        this.graph = this.svg
            .append("g")
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")")


        this.xScaleLinear = d3.scaleLinear()
            .domain([-1, 1])
            .range([0, this.width])

        this.yScaleLinear = d3.scaleLinear()
            .domain([-1, 1])
            .range([0, this.height])

        this.xScaleLinearZoomed = this.xScaleLinear;
        this.yScaleLinearZoomed = this.yScaleLinear;

        this.xAxis = this.graph.append("g")
            .attr("transform", "translate(0," + this.height + ")")
            .call(d3.axisBottom(this.xScaleLinear));

        this.yAxis = this.graph.append("g")
            .call(d3.axisLeft(this.yScaleLinear))


        this.graph.append("defs").append("SVG:clipPath")
            .attr("id", "clip")
            .append("SVG:rect")
            .attr("width", this.width)
            .attr("height", this.height)
            .attr("x", 0)
            .attr("y", 0);

        const zoomButton = d3.select("#zoomMode")
        const selectButton = d3.select("#selectMode")

        zoomButton.on("change", e => {
            this.mouseMode = this.Mode.ZoomMode
            d3.selectAll(".mdsBrushArea").remove()
            this.xScaleLinearZoomed = this.xScaleLinear;
            this.yScaleLinearZoomed = this.yScaleLinear;
        })
        selectButton.on("change", e => {
            this.mouseMode = this.Mode.SelectMode
            this.enableBrush()
        })

        this.drawPoints()
    }

    enableBrush() {
        //d3.selectAll(".mdsZoomArea").remove()
        d3.selectAll(".mdsBrushArea").remove()

        this.graph
            .append("g")
            .attr("class", "mdsBrushArea")
            .call(d3.brush()
                .on("brush", (e) => this.onBrush(e))
                .on("end", (e) => {
                    if (e.selection == null) {
                        this.clearSelection()
                    }
                }))
    }

    drawPoints() {
        this.graph.append("g").attr("clip-path", "url(#clip)")
            .selectAll("circle")
            .data(this.movies)
            .enter()
            .append("circle")
            .attr("id", d => "mdsDot" + d.id)
            .attr("class", "mdsDot")
            .attr("cx", d => this.xScaleLinear(d.mds[0]))
            .attr("cy", d => this.yScaleLinear(d.mds[1]))
            .attr("r", 2)
            .style("fill", this.defaultColor)
            .on('mouseover', e => {
                const filmId = e.target.id.replace("mdsDot", "")
                this.hoverAnElement(filmId)
                showMovieInfo(this.movies.find(x=>x.id==filmId),e.pageX,e.pageY)
            })
            .on('mouseleave', e => {
                const filmId = e.target.id.replace("mdsDot", "")
                this.leaveAnElement(filmId)
                hideMovieInfo()
            })
    }

    handleZoom(e) {
        if (this.mouseMode != this.Mode.ZoomMode)
            return

            // recover the new scale
        this.xScaleLinearZoomed = e.transform.rescaleX(this.xScaleLinear);
        this.yScaleLinearZoomed = e.transform.rescaleY(this.yScaleLinear);

        // update axes with these new boundaries
        this.xAxis.call(d3.axisBottom(this.xScaleLinearZoomed))
        this.yAxis.call(d3.axisLeft(this.yScaleLinearZoomed))

        // update circle position
        this.graph
            .selectAll("circle")
            .attr('cx', d => this.xScaleLinearZoomed(d.mds[0]))
            .attr('cy', d => this.yScaleLinearZoomed(d.mds[1]))
    }

    onBrush(e) {
        const topLeft = e.selection[0]
        const bottomRight = e.selection[1]
        const xValues = [this.xScaleLinearZoomed.invert(topLeft[0]), this.xScaleLinearZoomed.invert(bottomRight[0])]
        const yValues = [this.yScaleLinearZoomed.invert(topLeft[1]), this.yScaleLinearZoomed.invert(bottomRight[1])]

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