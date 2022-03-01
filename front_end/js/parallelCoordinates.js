function drawParallelCoordinates(jsonData) {

    const filtered_data = jsonData.map(x => {
        const date = new Date(x.relase_data)
        return {
            "id": x.id,
            "genres": x.genres.map(x => x.name),
            "year": date.getFullYear(),
            "vote_avg": x.vote_avg,
            "#votes": x.vote_count,
            "runtime": x.runtime,
            "languages": x.spoken_languages.map(x => x.iso_639_1)
        }
    })
    console.log(filtered_data.length)
    const margin = {top: 30, right: 10, bottom: 10, left: 0}

    const bboxSize = d3.select("#parrallelCoords").node().getBoundingClientRect()
    const width = (bboxSize.width * 0.9) + margin.left + margin.bottom
    const height = (width / 2)

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

    let dimensions = Object.keys(filtered_data[0])
        .filter(x => x !== "id") //Id must be not showed

    let y = {}
    for (let i in dimensions) {
        name = dimensions[i]
        if (name === "genres") {
            y[name] = d3.scalePoint()
                .domain(genres)
                .range([0, height])
        }
        else if (name === "languages") {
            y[name] = d3.scalePoint()
                .domain(languages)
                .range([0, height])
        }
        else {
            y[name] = d3.scaleLinear()
                .domain(d3.extent(filtered_data, function (d) {
                    return d[name];
                }))
                .range([height, 0])
        }
    }

    let x = d3.scalePoint()
        .range([0, width])
        .padding(1)
        .domain(dimensions);

    // The path function take a row of the json as input, and return x and y coordinates of the line to draw for this raw.
    // Genres and languages are processed in a different way to guarantee the 1-n visualization
    function path(data) {
        let points = []

        //Points for genres and year
        const genres = data['genres']
        for (let j = 0; j < genres.length; j++) {
            points.push([x('genres'), y['genres'](genres[j])])
            points.push([x('year'), y['year'](data['year'])])
        }

        //Points for vote_avg, #votes and runtime
        for (let i = 2; i < dimensions.length - 2; i++) {
            const dim = dimensions[i]
            const point = [x(dim), y[dim](data[dim])]
            points.push(point)
        }

        //Points for runtime and languages
        const languages = data['languages']
        for (let j = 0; j < languages.length; j++) {
            points.push([x('runtime'), y['runtime'](data['runtime'])])
            points.push([x('languages'), y['languages'](languages[j])])
        }

        return d3.line()(points)
    }

    //Draw axes
    plt.selectAll("myAxis")
        .data(dimensions)
        .enter()
        .append("g")
        .attr("transform", function (d) {
            return "translate(" + x(d) + ")";
        })
        .each(function (d) {
            if (d === "genres" || d === "year" || d === "vote_avg")
                d3.select(this).call(d3.axisLeft().scale(y[d]));
            else
                d3.select(this).call(d3.axisRight().scale(y[d]));
        })
        .append("text")
        .style("text-anchor", "middle")
        .attr("y", -9)
        .text((d) => {
            return d;
        })
        .style("fill", "black")

    //Draw lines
    plt.selectAll("myAxis")
        .data(filtered_data)
        .enter()
        .append("path")
        .attr("id", x => {
            return "line" + x.id
        })
        .attr("d", path)
        .style("fill", "none")
        .style("stroke", "#69b3a2")
        .style("opacity", 0.2)
        .on("mouseover", d => {
            const selectedLine = d.target.id
            const film_id = selectedLine.replace("line", "")

            plt.select("#" + selectedLine)
                .style("stroke", "red")
                .style("stroke-width", 2)
                .style("opacity", 1)
            const selectedMovie = jsonData.find(x => x.id == film_id)
            console.log("SELECTED", selectedMovie['title'], "(" + (new Date(selectedMovie['relase_data'])).getFullYear() + ")");
        })
        .on("mouseleave", d => {
            const selectedLine = d.target.id
            plt.select("#" + selectedLine)
                .style("stroke", "#69b3a2")
                .style("opacity", 0.5)
                .style("stroke-width", 0.2)
        })


}

export {drawParallelCoordinates}