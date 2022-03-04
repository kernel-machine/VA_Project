import {drawParallelCoordinates} from "./graphs/parallelCoordinates.js";
import {drawBubblePlot} from "./graphs/bubblePlot.js";

const DATASET_PATH = "./resources/dataset/dataset.json"

function init() {
    d3.json(DATASET_PATH)
        .then((response) => {
            const movies = response.movies
            drawParallelCoordinates(movies)
            drawBubblePlot(movies)
        })
}

init()