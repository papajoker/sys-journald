/*
*   renderer for message log
*/

module.exports = class MessageItem {
    constructor (item, dico) {
        this.items = item
        this.dico = dico
        this.items.date = new Date(item.__REALTIME_TIMESTAMP / 1000).toLocaleString()
        this.items.level = this.dico.html.levels[this.items.PRIORITY]
    }

    get isUnit () {
        return (this.items._SYSTEMD_UNIT != undefined)
    }
    get isExe () {
        return (this.items._EXE != undefined)
    }
    get _SYSTEMD_UNIT () {
        return (this.isUnit) ? `<span class="unit label label-default" title="${this.dico.logs.unit}" data-unit="${this.items._SYSTEMD_UNIT}">${this.items._SYSTEMD_UNIT}</span>` : '<span></span>'
    }
    get _UID () {
        return (this.items._UID != undefined) ? `<span class="uid badge" title="UID" >${this.items._UID}</span>` : ''
    }
    get level () {
        return this.dico.html.levels[this.items.PRIORITY]
    }
    get EXE () {
        return `<span class="exe label label-info${(this.isExe) ? ' executable' : ''}">${(this.items._EXE == undefined) ? ((this.items._COMM == undefined) ? this.items.SYSLOG_IDENTIFIER : this.items._COMM) : this.items._EXE}</span>`
    }
    toJson () {
        return JSON.stringify(this.items)
    }

    render () {
        return `<li class="priority${this.items.PRIORITY}">
                <span class="time label label-default" title="${this.dico.logs.detail}">${this.items.date}</span>
                ${this.EXE}
                <span class="priority badge" title="${this.items.level}">${this.items.PRIORITY}</span>
                <em class="msg">${this.items.MESSAGE}</em>
                ${this._SYSTEMD_UNIT}
                ${this._UID}
                <div class="cache">${JSON.stringify(this.items)}</div>
            </li>`
    }
}

