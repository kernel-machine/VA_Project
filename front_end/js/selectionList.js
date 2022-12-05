export class SelectionList {
    constructor(movies) {
        this.movies = movies
        console.log(this.movies)
        const listDiv = d3.select("#selectedMovie")
        const parentDiv = d3.select(".selected_movies_list").node().getBoundingClientRect()
        listDiv.style("height", parentDiv.height * 0.85 + "px")
    }

    movieComparator(a, b) {
        if (a.title < b.title) return -1
        if (a.title > b.title) return 1
        else return 0
    }

    addMovies(list) {
        const nameList = this.movies.filter(x => list.includes(x.id)).sort(this.movieComparator).map(x => {
            //console.log(x.title, x.id, x.keywords.map(x => x.name))
            return "<b>" + x.title + "</b> | " + x.director// + " " + x.id
        })
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