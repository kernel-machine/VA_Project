import { Graph } from "./Graph.js";

const defaultColor = "#2c7bb6"
const selectedColor = "#d7191c"
const hoverColor = "#fdae61"

export class MDSGraph extends Graph {

    constructor(movies) {
        super();
        this.movies = movies
        this.selectedMovies = []

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
                        this.selectedMovies = []
                        this.setSelection([])
                        this.updateSelection()
                    }
                }))

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
            .style("fill", defaultColor)
            .attr("id", d => "mdsDot" + d.id)
            .on('mouseover', e => {
                const filmId = e.target.id.replace("mdsDot", "")
                //const selectedFilm = this.movies.find(x => x.id == filmId)
                //console.log(selectedFilm.title,selectedFilm)
                if (!this.selectedMovies.includes(filmId))
                    d3.select("#mdsDot" + filmId).style("fill", hoverColor)
            })
            .on('mouseleave', e => {
                const filmId = e.target.id.replace("mdsDot", "")
                if (this.selectedMovies.includes(filmId))
                    d3.select("#mdsDot" + filmId).style("fill", selectedColor)
                else
                    d3.select("#mdsDot" + filmId).style("fill", defaultColor)
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
        this.highLightSelected(this.selectedMovies.map(x => x.id))
        this.updateSelection();

    }

    highLightSelected(selectedIds) {
        this.movies.forEach(movie => {
            if (selectedIds.includes(movie.id))
                d3.selectAll("#mdsDot" + movie.id).style("fill", selectedColor)
            else
                d3.selectAll("#mdsDot" + movie.id).style("fill", defaultColor)
        })
    }

    getSelected() {
        return this.selectedMovies.map(x => x.id);
    }

    setSelection(selection) {
        this.highLightSelected(selection)
    }
}