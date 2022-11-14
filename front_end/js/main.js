import {ParallelCoordinates} from "./graphs/parallelCoordinates.js";
import {BubblePlot} from "./graphs/bubblePlot.js";
import {ColumnPlot} from "./graphs/columnPlot.js";
import {SelectionTool} from "./common/selectionTool.js";
import {MDSGraph} from "./graphs/mdsGraph.js";
import {SelectionList} from "./selectionList.js";

const DATASET_PATH = "./resources/dataset/dataset.json"

function init() {
    const selectionTool = new SelectionTool();

    d3.json(DATASET_PATH)
        .then((response) => {
            const movies = response.movies
            const parallelCoordinates = new ParallelCoordinates(movies)
            const bubblePlot = new BubblePlot(movies)
            const columnPlot = new ColumnPlot(movies)
            const mdsGraph = new MDSGraph(movies)
            const listView = new SelectionList(movies);
            selectionTool.addGraph(parallelCoordinates);
            selectionTool.addGraph(bubblePlot);
            selectionTool.addGraph(mdsGraph);
            selectionTool.addSelectionList(listView);
            parallelCoordinates.selectionTool = selectionTool;
            bubblePlot.selectionTool = selectionTool;
            mdsGraph.selectionTool = selectionTool;
            document.getElementById("loadingDiv").style.display = "none"
            let opacity = 0
            const intervalId = setInterval(() => {
                opacity += 0.2
                document.getElementById("mainContainer").style.opacity = opacity
                if (opacity >= 1)
                    clearInterval(intervalId)
            }, 50)

        })
}

init()