import {Graph} from "./Graph.js";

class ParallelCoordinates extends Graph {

    name="Parallel coordinates plot"

    prettyDimensionsName = {
        'genres': "Genres",
        "year": "Year",
        "vote_avg": "Average rate",
        "num_votes": "Number of rates",
        "runtime": "Runtime (m)",
        "languages": "Languages"
    }

    constructor(movies) {
        super();
        this.originalData = movies;
        this.filtered_data = movies.map(x => {
            return {
                "id": x.id,
                "genres": x.genres.map(x => x.name),
                "year": x.release_year,
                "vote_avg": x.vote_avg,
                "num_votes": x.vote_count,
                "runtime": x.runtime,
                "languages": x.spoken_languages.map(x => x.iso_639_1)
            }
        }).filter(x => x.languages.length > 0)
        this.selectedMovies = [];

        const margin = {top: 30, right: 10, bottom: 10, left: 0}

        const bboxSize = d3.select("#parrallelCoords").node().getBoundingClientRect()
        this.width = (bboxSize.width) + margin.left + margin.bottom
        this.height = (this.width / 2.3)

        this.plt = d3.select("#parrallelCoords")
            .append("svg")
            .attr("width", this.width)
            .attr("height", this.height + margin.top + margin.bottom)
            .append("g")
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

        const all_genres = this.filtered_data.map(x => x.genres).flat() //With duplicates
        this.genres = Array.from(new Set(all_genres)).sort() //Without duplicates

        const all_languages = this.filtered_data.map(x => x.languages).flat() //With duplicates
        this.languages = Array.from(new Set(all_languages)).sort() //Without duplicates

        this.dimensions = Object.keys(this.filtered_data[0])
            .filter(x => x !== "id") //Id must be not showed

        this.selectedIdsBins = []
        this.dimensions.forEach(e => {
            this.selectedIdsBins[e] = new Set()
        })

        this.yDomain = {}
        for (let i in this.dimensions) {
            name = this.dimensions[i]
            if (name === "genres") {
                this.yDomain[name] = d3.scalePoint()
                    .domain(this.genres)
                    .range([0, this.height])
            }
            else if (name === "languages") {
                this.yDomain[name] = d3.scalePoint()
                    .domain(this.languages)
                    .range([0, this.height])
            }
            else {
                this.yDomain[name] = d3.scaleLinear()
                    .domain(d3.extent(this.filtered_data, function (d) {
                        return d[name];
                    }))
                    .range([this.height, 0])
            }
        }

        this.xScalePoint = d3.scalePoint()
            .range([0, this.width])
            .padding(1)
            .domain(this.dimensions);

        this.drawGraph();
        this.createSelectableArea();
    } //Constructor end

    //  The path function take a row of the json as input, and return x and y coordinates of the line to draw for this raw.
    // Genres and languages are processed in a different way to guarantee the 1-n visualization
    path(data) {
        let points = []

        //Points for genres and year
        const genres = data['genres']
        for (let j = 0; j < genres.length; j++) {
            points.push([this.xScalePoint('genres'), this.yDomain['genres'](genres[j])])
            points.push([this.xScalePoint('year'), this.yDomain['year'](data['year'])])
        }

        //Points for vote_avg, #votes and runtime
        for (let i = 2; i < this.dimensions.length - 2; i++) {
            const dim = this.dimensions[i]
            const point = [this.xScalePoint(dim), this.yDomain[dim](data[dim])]
            points.push(point)
        }

        //Points for runtime and languages
        const languages = data['languages']
        for (let j = 0; j < languages.length; j++) {
            points.push([this.xScalePoint('runtime'), this.yDomain['runtime'](data['runtime'])])
            points.push([this.xScalePoint('languages'), this.yDomain['languages'](languages[j])])
        }

        return d3.line()(points)
    }

    //Raise the axis, in this wey they overlap the other graphic elements
    raiseAxis() {
        this.plt.selectAll(".axis").raise()
    }

    drawGraph() {
        //Draw movies lines
        this.plt.selectAll("myAxis")
            .data(this.filtered_data)
            .enter()
            .append("path")
            .attr("id", x => {
                return "line" + x.id
            })
            .attr("d", (data) => {
                return this.path(data);
            })
            .attr("class", "line")
            .on("mouseover", d => {
                const selectedLine = d.target.id
                const film_id = selectedLine.replace("line", "")
                const selection = this.plt.selectAll("#" + selectedLine)
                if (selection.attr("class") !== "lineMultipleSelection") {
                    selection.attr("class", "lineHover")
                        .raise() //The element raise on top of the list to overlap the others
                }
                //Print in the console the selected movie
                const selectedMovie = this.originalData.find(x => x.id == film_id)
                console.log(selectedMovie)
                this.raiseAxis()
            })
            .on("mouseleave", d => {
                const selectedLine = d.target.id
                const selection = this.plt.selectAll("#" + selectedLine)
                if (selection.attr("class") !== "lineMultipleSelection")
                    selection.attr("class", "line")
            })


        //Draw axes
        this.axes =
            this.plt.selectAll("myAxis")
                .data(this.dimensions)
                .enter()
                .append("g")
                .attr("transform", (d) => {
                    return "translate(" + this.xScalePoint(d) + ")";
                })
                .attr("class", "axis")
                .attr("id", (d) => {
                    return "axis" + d
                })
                .each((d) => {
                    if ((d === "genres" || d === "year" || d === "vote_avg"))
                        d3.select("#axis" + d).call(d3.axisLeft(this.yDomain[d]))//.tickFormat(d3.format("d")))
                    else
                        d3.select("#axis" + d).call(d3.axisRight(this.yDomain[d]));
                })

        //Text on top of each bar
        this.axes.append("text")
            .attr("class", "parallelDimensionsText")
            .attr("y", -9)
            .text((d) => {
                return this.prettyDimensionsName[d]
            })

        //Alternates languages between left and right
        d3.selectAll("#axislanguages g > line")
            .filter((e, i) => i % 2 === 0)
            .each((d, i, n) => {
                const x2 = d3.select(n[i]).attr("x2")
                d3.select(n[i]).attr("x2", Number(x2) * -1)
            })
        d3.selectAll("#axislanguages g > text")
            .filter((e, i) => i % 2 === 0)
            .each((d, i, n) => {
                const x2 = -d3.select(n[i]).attr("x")
                d3.select(n[i]).attr("x", Number(x2) - 9)
            })
    }

    highlightSelectedLines(moviesId) {
        console.log("HIGH",moviesId.length)
        this.filtered_data.forEach(movie => {
            const needSelection = moviesId.includes(movie.id)
            const sel = d3.selectAll("#line" + movie.id)
            if (needSelection) {
                sel.attr("class", "lineMultipleSelection")
                sel.raise()
            }
            else
                sel.attr("class", "line")
        })
        this.raiseAxis()
    }

    //Called when an area is selected
    brushStart(e) {
        const upperBoundRect = e.selection[0]
        const lowerBoundRect = e.selection[1]
        let selectedX = this.xScalePoint.domain()
            .find((d) => {
                return e.target === this.yDomain[d].brush;
            });
        let selectedElements = []
        if (selectedX === "genres") {
            const selectedElement = this.genres.filter(g => {
                const yPosition = this.yDomain['genres'](g)
                return upperBoundRect < yPosition && yPosition < lowerBoundRect
            })
            selectedElements[selectedX] = {
                isDiscrete: true,
                selection: selectedElement
            }
        }
        else if (selectedX === "languages") {
            const selectedElement = this.languages.filter(g => {
                const yPosition = this.yDomain['languages'](g)
                return upperBoundRect < yPosition && yPosition < lowerBoundRect
            })
            selectedElements[selectedX] = {
                isDiscrete: true,
                selection: selectedElement
            }
        }
        else {
            const lowerBound = this.yDomain[selectedX].invert(lowerBoundRect)
            const upperBound = this.yDomain[selectedX].invert(upperBoundRect)
            selectedElements[selectedX] = {
                isDiscrete: false,
                selection: [lowerBound, upperBound]
            }
        }

        this.filtered_data.forEach(movie => {
            this.dimensions
                .filter(dim => selectedElements[dim] !== undefined)
                .forEach(dimension => {
                    if (selectedElements[dimension].isDiscrete) {
                        if (dimension === 'genres') {
                            if (selectedElements[dimension].selection.every(selectionGenre => movie.genres.some(mg => mg === selectionGenre)))
                                this.selectedIdsBins[dimension].add(movie.id)
                            else
                                this.selectedIdsBins[dimension].delete(movie.id)
                        }
                        else if (dimension === 'languages') {
                            if (selectedElements[dimension].selection.every(selectionLanguage => movie.languages.some(ml => ml === selectionLanguage)))
                                this.selectedIdsBins[dimension].add(movie.id)
                            else
                                this.selectedIdsBins[dimension].delete(movie.id)
                        }
                    }
                    else {
                        if (selectedElements[dimension].selection[0] <= movie[dimension] &&
                            movie[dimension] <= selectedElements[dimension].selection[1])
                            this.selectedIdsBins[dimension].add(movie.id)
                        else
                            this.selectedIdsBins[dimension].delete(movie.id)
                    }
                })
        })

        const notEmptyBins = this.dimensions.filter(d => this.selectedIdsBins[d].size > 0).map(d => this.selectedIdsBins[d])
        if (notEmptyBins.length === 0)
            return
        this.selectedMovies = this.filtered_data.map(x => x.id).filter(x => notEmptyBins.every(bin => bin.has(x)))
        this.highlightSelectedLines(this.selectedMovies)
        this.updateSelection();
    }


    //Create te selectable area for each axis
    createSelectableArea() {
        d3.selectAll(".axis")
            .append("g")
            .attr("class", "brush")
            .attr("id", (d) => {
                return "brush" + d
            })
            .enter()
        this.dimensions.forEach(d => {
            d3.select("#brush" + d).call(
                this.yDomain[d].brush =
                    d3.brushY()
                        .extent([[-10, 0], [10, this.height]])
                        .on("brush", (e) => this.brushStart(e))
                        .on("end", (e) => {
                            if (e.selection == null) {
                                this.selectedMovies=[]
                                this.setSelection([])
                                this.updateSelection()
                            }
                        })
            )
        })
    }

    getSelected() {
        return this.selectedMovies;
    }

    setSelection(selection) {
        //super.setSelection(selection);
        this.highlightSelectedLines(selection);

    }

}

export {ParallelCoordinates}