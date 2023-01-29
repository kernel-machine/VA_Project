import {tickValuesFormatter} from "./utils.js";

export class Group {
    intervalBegin = 0
    intervalEnd = 0
    #elements = []

    constructor(intervalBegin, intervalEnd, elements) {
        this.intervalBegin = intervalBegin
        this.intervalEnd = intervalEnd
        this.#elements = elements
    }

    getAvgValue() {
        return (this.intervalEnd - this.intervalBegin) / 2
    }

    getAvgField(fieldName) {
        return d3.mean(this.#elements.map(x => x[fieldName]))
    }

    getElementCount() {
        return this.#elements.length
    }

    getIntervalString(formatting = false) {
        if (formatting)
            return tickValuesFormatter(this.intervalBegin, 1) + "-" + tickValuesFormatter(this.intervalEnd, 1)
        else
            return this.intervalBegin + "-" + this.intervalEnd
    }
}