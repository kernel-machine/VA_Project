import {ParallelCoordinates} from "./graphs/parallelCoordinates.js";
import {BubblePlot} from "./graphs/bubblePlot.js";
import {ColumnPlot} from "./graphs/columnPlot.js";
import {SelectionTool} from "./common/selectionTool.js";
import {MDSGraph} from "./graphs/mdsGraph.js";
import {SelectionList} from "./selectionList.js";

const DATASET_PATH = "./resources/dataset/dataset.json"

function createUI(movies) {
    const selectionTool = new SelectionTool();
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
}

function init() {

    const queryString = window.location.search;
    const urlParams = new URLSearchParams(queryString);
    const type = urlParams.get('type')
    if (type == "top1000")
        document.getElementById("datasetType").value = 1
    else
        document.getElementById("datasetType").value = 0

    d3.json(DATASET_PATH)
        .then((response) => {
            let movies = response.movies
            if (type === "top1000")
                movies = movies.sort((a, b) => a['popularity'] - b['popularity']).slice(0, 1000)
            createUI(movies)

            d3.select("#datasetType").on('change', (e) => {
                const value = document.getElementById("datasetType")
                const params = new URLSearchParams(location.search);
                if (value.value == 1)
                    params.set('type', 'top1000');
                else
                    params.set('type', 'full');
                window.location.search = params.toString();

            })

        })
}

init()