export class SelectionTool {
    constructor() {
        this.graphs = [];
    }

    addGraph(graph) {
        this.graphs.push(graph)
    }

    addSelectionList(selectionList) {
        this.selectionList = selectionList
    }

    setHoveredElement(movieId) {
        this.graphs.forEach(g => {
            g.hoverAnElement(movieId, false)
        })
    }

    unsetHoveredElement(movieId) {
        this.graphs.forEach(g => {
            g.leaveAnElement(movieId, false)
        })
    }

    update() {

        let selection = this.graphs.map(x => {
            return x.getSelected()
        }).filter(x => x.length > 0)

        if (selection.length > 0) {
            selection = selection.reduce((previous, current) => {
                return previous.filter(x => current.includes(x));
            })
        }
        else {
            selection = []
        }
        this.graphs.forEach(graph => {
            graph.highlightElements(selection)
        })

        if (this.selectionList) {
            this.selectionList.addMovies(selection)
        }
    }
}
