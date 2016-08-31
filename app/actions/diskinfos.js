/*
*   get disk informations
*/

const exec = require('child_process').exec
const consts = require('../consts.js')

module.exports = {
    MSG: consts.events.BASH_DF,
    response: {},

    run (event) {
        exec(`df -lh --output="source,fstype,size,used,avail,pcent,target" -x tmpfs -x devtmpfs| tail -n +2`, (err, stdout) => {
            let response = { caption: '', items: [] }
            let items = []
            let lines = stdout.split("\n")
            lines.forEach((line) => {
                items = line.match(/\S+/g)
                if (items) response.items.push({
                    source: items[0],
                    fstype: items[1],
                    size: items[2],
                    used: items[3],
                    avail: items[4],
                    pcent: items[5],
                    target: items[6]
                })
            })
            exec(`lsblk --output="NAME,SIZE,MOUNTPOINT" -lJ`, (err, stdout) => {
                response.lsblk = JSON.parse(stdout)
                return event.sender.send(this.MSG, response)
            })
        })
        return false
    },

    toHtml (response) {
        let html = `<div class="row">
                    <span class="col-xs-3 df-source"></span>
                    <span class="col-xs-1 df-fstype">fs&nbsp;type</span>
                    <span class="col-xs-1 df-size">size</span>
                    <span class="col-xs-1 df-used">used</span>
                    <span class="col-xs-1 df-avail">avail</span>
                    <span class="col-xs-1 df-pcent">%</span>
                    <span class="col-xs-3 df-target">target</span>
                </div>`
        response.items.forEach((line) => {
            html += `<div class="row">
                    <span class="col-xs-3 df-source">${line.source}</span>
                    <span class="col-xs-1 df-fstype">${line.fstype}</span>
                    <span class="col-xs-1 df-size">${line.size}</span>
                    <span class="col-xs-1 df-used">${line.used}</span>
                    <span class="col-xs-1 df-avail">${line.avail}</span>
                    <span class="col-xs-1 df-pcent">${line.pcent}</span>
                    <span class="col-xs-3 df-target">${line.target}</span>
                </div>`
        })

        let html2 = ''
        response.lsblk.blockdevices.forEach((line) => {
            html2 += `<div class="row">
                    <span class="col-xs-4 df-source">${line.name}</span>
                    <span class="col-xs-1 df-size">${line.size}</span>
                    <span class="col-xs-3 col-xs-offset-3 df-mountpoint">${(line.mountpoint) ? line.mountpoint : '&nbsp;'}</span>
                </div>`
        })
        this.html = `<div class="df">${html}</div>
            <hr />
            <div class="df">${html2}</div>`
        return this.html
    },

    showDialogModal (dialog) {
        dialog.title = 'df -h / lsblk'
        dialog.body = this.html
        dialog.show()
    }

}
