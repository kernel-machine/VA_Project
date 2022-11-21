export class SelectionList {
    constructor(movies) {
        this.movies = movies
        console.log(this.movies)
        const listDiv = d3.select("#selectedMovie")
        const parentDiv = d3.select(".selected_movies_list").node().getBoundingClientRect()
        listDiv.style("height", parentDiv.height * 0.85 + "px")
    }

    addMovies(list) {
        const nameList = this.movies.filter(x => list.includes(x.id)).map(x => "<b>" + x.title + "</b> | " + x.director)
        d3.select("#ulMovieList").selectAll("li").remove()
        if (nameList.length == 0) {
            d3.select("#noMovieSelected").style("display", "")
            d3.select("#ulMovieList").style("display", "none")
        }
        else {
            d3.select("#ulMovieList")
                .style("display", "")
                .selectAll("li")
                .data(nameList)
                .enter()
                .append("li")
                .html(String)

            d3.select("#noMovieSelected").style("display", "none")

        }

    }
}