import {ParallelCoordinates} from "./graphs/parallelCoordinates.js";
import {BubblePlot} from "./graphs/bubblePlot.js";

const DATASET_PATH = "./resources/dataset/dataset.json"

function init() {
    d3.json(DATASET_PATH)
        .then((response) => {
            const movies = response.movies
            const parallelCoordinates = new ParallelCoordinates(movies)
            const bubblePlot = new BubblePlot(movies)
        })
}

init()