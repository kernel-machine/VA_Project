export class SelectionTool {
    constructor() {
        this.graphs = [];
    }

    addGraph(graph) {
        this.graphs.push(graph)
    }

    update() {
        let selection = this.graphs.map(x => {
            console.log("NOW", x.name, "HAS", x.getSelected().length)
            return x.getSelected()
        }).filter(x => x.length > 0)

        if (selection.length > 0) {
            selection = selection.reduce((previous, current) => {
                return previous.filter(x => current.includes(x));
            })
        }
        else {
            selection=[]
        }
        this.graphs.forEach(graph => {
            graph.setSelection(selection)
        });
    }
}
