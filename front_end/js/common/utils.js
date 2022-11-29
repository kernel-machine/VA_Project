export function range(start, end, step = 1) {
    let ris = []
    for (let i = start; i < end; i += step)
        ris.push(i)

    return ris
}

export function tickValuesFormatter(value, decimalValue = 1) {
    if (value == undefined)
        return undefined
    let strValue
    if (value / 1000000000 > 1)
        strValue = (value / 1000000000).toFixed(decimalValue) + "B"
    else if (value / 1000000 > 1)
        strValue = (value / 1000000).toFixed(decimalValue) + "M"
    else if (value / 1000 > 1)
        strValue = (value / 1000).toFixed(decimalValue) + "K"
    else
        strValue = value.toFixed(decimalValue)
    return strValue.replace(/\.0/, '');
}

export function tickValuesFormatterSimple(value) {
    return tickValuesFormatter(value, 1)
}

export function showMovieInfo(movie, x, y) {
    d3.select("#title").html(movie.title)
    d3.select("#director").html(movie.release_year + " | " + movie.director)
    d3.select("#infoBox")
        .style("top", y + 3 + "px")
        .style("left", x + 3 + "px")
        .style("display", "table")
}

export function hideMovieInfo() {
    d3.select("#infoBox")
        .style("display", "none")
}

export function groupBy(list, keyGetter) {
    const map = new Map();
    list.forEach((item) => {
        const key = keyGetter(item);
        const collection = map.get(key);
        if (!collection) {
            map.set(key, [item]);
        }
        else {
            collection.push(item);
        }
    });
    return map;
}

/**
 * Returns the inverted color
 *
 * @param {String} color input color as hex #aabbcc
 * @return {String} the inverted color as hex "#aabbcc
 */
export function invertedColor(color) {
    const newColor = d3.color(color)
    if (newColor.r + newColor.g + newColor.b > 500)
        return d3.color("black").formatHex()
    else return d3.color("white").formatHex()
}
