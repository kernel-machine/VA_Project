export class SelectionTool {
    constructor() {
        this.graphs = [];
    }

    addGraph(graph) {
        this.graphs.push(graph)
    }

    update() {
        let selection = this.graphs.map(x=>x.getSelected()).filter(x=>x.length>0)
        if(selection.length>0) {
            selection = selection.reduce((previous, current) => {
                return previous.filter(x => current.includes(x));
            })
            this.graphs.forEach(graph=>graph.setSelection(selection));
        }
    }
}
