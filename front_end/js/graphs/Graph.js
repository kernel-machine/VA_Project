//Each graph MUST implements these methods for the selection tool
export class Graph {
    selectionTool=undefined;
    /**
     * returns the selected movies by the graph
     *
     * @returns {array} array of movies ids
     */
    getSelected() {
    }

    /**
     * sets the selected movies in the graph
     *
     * @param {array} selection array of movie ids
     */
    setSelection(selection) {
       // console.log("selection",selection)
    }

    /**
     * sets the selected movies in the graph
     *
     * @param {SelectionTool} selectionTool array of movie ids
     */
    set selectionTool(tool){
        this.selectionTool = tool;
    }

    //You must call this method every time you make a selection on the graph
    updateSelection(){
        if(this.selectionTool){
            this.selectionTool.update();
        }
    }
}
