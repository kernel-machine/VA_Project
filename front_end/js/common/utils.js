export function range(start, end, step = 1) {
    let ris = []
    for (let i = start; i < end; i += step)
        ris.push(i)

    return ris
}

export function tickValuesFormatter(value) {
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

export function showMovieInfo(movie, x, y) {
    d3.select("#title").html(movie.title)
    d3.select("#director").html(movie.release_year + " | " + movie.director)
    d3.select("#infoBox")
        .style("top", y + 3 + "px")
        .style("left", x + 3 + "px")
        .style("opacity", 1)
}

export function hideMovieInfo() {
    d3.select("#infoBox")
        .style("opacity", 0)
}