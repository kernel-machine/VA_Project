import {drawParallelCoordinates} from "./parallelCoordinates.js";

const DATASET_PATH = "./resources/dataset/dataset.json"

function init() {
    d3.json(DATASET_PATH)
        .then((response) => {
            const movies = response.movies
        drawParallelCoordinates(movies)
    })
}

init()