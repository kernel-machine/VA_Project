function drawParallelCoordinates(jsonData) {

    const filtered_data = jsonData.map(x => {
        return {
            "id": x.id,
            "genres": x.genres.map(x => x.name),
            "year": x.release_year,
            "vote_avg": x.vote_avg,
            "#votes": x.vote_count,
            "runtime": x.runtime,
            "languages": x.spoken_languages.map(x => x.iso_639_1)
        }
    }).filter(x => x.languages.length > 0)
    //console.log("total", filtered_data)

    const margin = {top: 30, right: 10, bottom: 10, left: 0}

    const bboxSize = d3.select("#parrallelCoords").node().getBoundingClientRect()
    const width = (bboxSize.width) + margin.left + margin.bottom
    const height = (width / 2.3)

    let plt = d3.select("#parrallelCoords")
        .append("svg")
        .attr("width", width)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    const all_genres = filtered_data.map(x => x.genres).flat() //With duplicates
    const genres = Array.from(new Set(all_genres)).sort() //Without duplicates

    const all_languages = filtered_data.map(x => x.languages).flat() //With duplicates
    const languages = Array.from(new Set(all_languages)).sort() //Without duplicates

    const prettyDimensionsName = {
        'genres': "Genres",
        "year": "Year",
        "vote_avg": "Average rate",
        "#votes": "Number of rates",
        "runtime": "Runtime (m)",
        "languages": "Languages"
    }

    let dimensions = Object.keys(filtered_data[0])
        .filter(x => x !== "id") //Id must be not showed

    let selectedIdsBins = []
    dimensions.forEach(e => {
        selectedIdsBins[e] = new Set()
    })

    let yDomain = {}
    for (let i in dimensions) {
        name = dimensions[i]
        if (name === "genres") {
            yDomain[name] = d3.scalePoint()
                .domain(genres)
                .range([0, height])
        }
        else if (name === "languages") {
            yDomain[name] = d3.scalePoint()
                .domain(languages)
                .range([0, height])
        }
        else {
            yDomain[name] = d3.scaleLinear()
                .domain(d3.extent(filtered_data, function (d) {
                    return d[name];
                }))
                .range([height, 0])
        }
    }

    let xDomain = d3.scalePoint()
        .range([0, width])
        .padding(1)
        .domain(dimensions);

    //  The path function take a row of the json as input, and return x and y coordinates of the line to draw for this raw.
    // Genres and languages are processed in a different way to guarantee the 1-n visualization
    function path(data) {
        let points = []

        //Points for genres and year
        const genres = data['genres']
        for (let j = 0; j < genres.length; j++) {
            points.push([xDomain('genres'), yDomain['genres'](genres[j])])
            points.push([xDomain('year'), yDomain['year'](data['year'])])
        }

        //Points for vote_avg, #votes and runtime
        for (let i = 2; i < dimensions.length - 2; i++) {
            const dim = dimensions[i]
            const point = [xDomain(dim), yDomain[dim](data[dim])]
            points.push(point)
        }

        //Points for runtime and languages
        const languages = data['languages']
        for (let j = 0; j < languages.length; j++) {
            points.push([xDomain('runtime'), yDomain['runtime'](data['runtime'])])
            points.push([xDomain('languages'), yDomain['languages'](languages[j])])
        }

        return d3.line()(points)
    }

    //Raise the axis, in this wey they overlap the other graphic elements
    function raiseAxis() {
        plt.selectAll(".axis").raise()
    }

    //Draw lines
    plt.selectAll("myAxis")
        .data(filtered_data)
        .enter()
        .append("path")
        .attr("id", x => {
            return "line" + x.id
        })
        .attr("d", path)
        .attr("class", "line")
        .on("mouseover", d => {
            const selectedLine = d.target.id
            const film_id = selectedLine.replace("line", "")
            const selection = plt.selectAll("#" + selectedLine)
            if (selection.attr("class") !== "lineMultipleSelection") {
                selection.attr("class", "lineHover")
                    .raise() //The element raise on top of the list to overlap the others
            }
            //Print in the console the selected movie
            const selectedMovie = jsonData.find(x => x.id == film_id)
            console.log(selectedMovie)
            raiseAxis()
        })
        .on("mouseleave", d => {
            const selectedLine = d.target.id
            const selection = plt.selectAll("#" + selectedLine)
            if (selection.attr("class") !== "lineMultipleSelection")
                selection.attr("class", "line")
        })

    //Draw axes
    const axes =
        plt.selectAll("myAxis")
            .data(dimensions)
            .enter()
            .append("g")
            .attr("transform", function (d) {
                return "translate(" + xDomain(d) + ")";
            })
            .each(function (d) {
                if (d === "genres" || d === "year" || d === "vote_avg")
                    d3.select(this).call(d3.axisLeft(yDomain[d]));
                else
                    d3.select(this).call(d3.axisRight(yDomain[d]));
            })
            .attr("class", "axis")
            .attr("id", function (d) {
                return "axis" + d
            })

    //Text on top of each bar
    axes.append("text")
        .attr("class", "parallelDimensionsText")
        .attr("y", -9)
        .text((d) => {
            return prettyDimensionsName[d]
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

    function highlightSelectedLines() {
        const notEmptyBins = dimensions.filter(d => selectedIdsBins[d].size > 0).map(d => selectedIdsBins[d])
        if (notEmptyBins.length === 0)
            return

        const intersection = filtered_data.map(x => x.id).filter(x => notEmptyBins.every(bin => bin.has(x)))

        filtered_data.forEach(movie => {
            const needSelection = intersection.some(x => x === movie.id)
            const sel = d3.selectAll("#line" + movie.id)
            if (needSelection) {
                sel.attr("class", "lineMultipleSelection")
                sel.raise()
            }
            else
                sel.attr("class", "line")
        })
        raiseAxis()
    }

    //Called when an area is selected
    function brushStart(e) {
        const upperBoundRect = e.selection[0]
        const lowerBoundRect = e.selection[1]
        let selectedX = xDomain.domain()
            .find((d) => {
                return e.target === yDomain[d].brush;
            });
        let selectedElements = []
        if (selectedX === "genres") {
            const selectedElement = genres.filter(g => {
                const yPosition = yDomain['genres'](g)
                return upperBoundRect < yPosition && yPosition < lowerBoundRect
            })
            selectedElements[selectedX] = {
                isDiscrete: true,
                selection: selectedElement
            }
            console.log(selectedElements[selectedX])
        }
        else if (selectedX === "languages") {
            const selectedElement = languages.filter(g => {
                const yPosition = yDomain['languages'](g)
                return upperBoundRect < yPosition && yPosition < lowerBoundRect
            })
            selectedElements[selectedX] = {
                isDiscrete: true,
                selection: selectedElement
            }
            console.log(selectedElements[selectedX])
        }
        else {
            const lowerBound = yDomain[selectedX].invert(lowerBoundRect)
            const upperBound = yDomain[selectedX].invert(upperBoundRect)
            selectedElements[selectedX] = {
                isDiscrete: false,
                selection: [lowerBound, upperBound]
            }
            console.log(selectedX, selectedElements[selectedX])
        }

        filtered_data.forEach(movie => {
            dimensions
                .filter(dim => selectedElements[dim] !== undefined)
                .forEach(dimension => {
                    if (selectedElements[dimension].isDiscrete) {
                        if (dimension === 'genres') {
                            if (selectedElements[dimension].selection.every(selectionGenre => movie.genres.some(mg => mg === selectionGenre)))
                                selectedIdsBins[dimension].add(movie.id)
                            else
                                selectedIdsBins[dimension].delete(movie.id)
                        }
                        else if (dimension === 'languages') {
                            if (selectedElements[dimension].selection.every(selectionLanguage => movie.languages.some(ml => ml === selectionLanguage)))
                                selectedIdsBins[dimension].add(movie.id)
                            else
                                selectedIdsBins[dimension].delete(movie.id)
                        }
                    }
                    else {
                        if (selectedElements[dimension].selection[0] <= movie[dimension] &&
                            movie[dimension] <= selectedElements[dimension].selection[1])
                            selectedIdsBins[dimension].add(movie.id)
                        else
                            selectedIdsBins[dimension].delete(movie.id)
                    }
                })
        })
        console.log(selectedIdsBins)
        highlightSelectedLines()
    }


    //Create te selectable area for each axis
    axes.append("g")
        .attr("class", "brush")
        .each(function (d) {
            d3.select(this).call(yDomain[d].brush =
                d3.brushY()
                    .extent([[-10, 0], [10, height]])
                    .on("brush", brushStart)
            )
        })

}

export {drawParallelCoordinates}