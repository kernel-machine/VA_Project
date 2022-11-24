//Each graph MUST implements these methods
export class Graph {

    //https://colorbrewer2.org/#type=diverging&scheme=RdYlBu&n=5
    defaultColor = "#2c7bb6"
    selectedColor = "#d7191c"
    hoverColor = "#fdae61"
    unselectedColor = "#abd9e9"

    selectionTool = undefined;
    highlightedElements = []
    selectedElements = []
    selectionIsActive = false

    constructor(name) {
        this.name = name
    }

    /**
     * returns the selected movies by the graph
     *
     * @returns {array} array of movies ids
     */
    getSelected() {
        return this.selectedElements
    }

    /**
     * Highlights the selected movies in the graph
     * Call when the graph made the selection by itself
     *
     * @param {array} selection array of movie ids
     */
    selectElements(selection) {
        this.selectedElements = selection
        this.selectionIsActive = true
        this.updateSelection()
    }

    /**
     * Call it when you want to cancel the whole selection
     *
     */
    clearSelection() {
        this.selectedElements = []
        this.selectionIsActive = false
        this.highlightElements([])
        this.updateSelection()
    }

    /**
     * Highlights the selected movies in the graph
     * Call when the selection is made by another graph
     *
     * @param {array} idElements array of movie ids
     */
    highlightElements(idElements) {
        this.highlightedElements = idElements
        if (this.selectionIsActive || this.highlightedElements.length > 0)
            this.colorAllElements(this.unselectedColor)
        else
            this.colorAllElements(this.defaultColor)

        this.highlightedElements.forEach(x => {
            this.colorElement(x, this.selectedColor)
        })
    }

    hoverAnElement(filmId, send_event = true) {
        this.colorElement(filmId, this.hoverColor)
        if (send_event)
            this.selectionTool.setHoveredElement(filmId, this)
    }

    leaveAnElement(filmId, send_event = true) {
        if (this.highlightedElements.some(x => x == filmId)) {
            this.colorElement(filmId, this.selectedColor)
        }
        else if (this.selectionIsActive || this.highlightedElements.length > 0) {
            this.colorElement(filmId, this.unselectedColor)
        }
        else {
            this.colorElement(filmId, this.defaultColor)
        }
        if (send_event)
            this.selectionTool.unsetHoveredElement(filmId)
    }


    colorElement(movieId, color) {
        console.error("Missing implementation")
    }

    colorAllElements(color) {
        console.error("Missing implementation")
    }

    /**
     * sets the selected movies in the graph
     *
     * @param {SelectionTool} selectionTool array of movie ids
     */
    set selectionTool(tool) {
        this.selectionTool = tool;
    }

    /**
     * sets is a selection is active
     *
     * @param {boolean} isActive indicates if a selection is active
     */
    set selectionIsActive(isActive) {
        this.selectionIsActive = isActive;
    }

    //You must call this method every time you make a selection on the graph
    updateSelection() {
        if (this.selectionTool) {
            this.selectionTool.update();
        }
    }
}
