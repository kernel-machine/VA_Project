import {ParallelCoordinates} from "./graphs/parallelCoordinates.js";
import {BubblePlot} from "./graphs/bubblePlot.js";
import {SelectionTool} from "./common/selectionTool.js";

const DATASET_PATH = "./resources/dataset/dataset.json"

function init() {
    const selectionTool = new SelectionTool();
    d3.json(DATASET_PATH)
        .then((response) => {
            const movies = response.movies
            const parallelCoordinates = new ParallelCoordinates(movies)
            const bubblePlot = new BubblePlot(movies)
            selectionTool.addGraph(parallelCoordinates);
            selectionTool.addGraph(bubblePlot);
            parallelCoordinates.selectionTool = selectionTool;
            bubblePlot.selectionTool = selectionTool;
        })
}

init()