/*
*   get init systemd info
*/

const exec = require('child_process').exec
const consts = require('../consts.js')
const dico = consts.loadDico()

module.exports = {
    MSG: consts.events.CAT_UNIT,
    response: {},

    run (event, unit) {
        let response = {}
        exec(`systemctl cat ${unit}`, {
            env: {
                TERM: 'xterm' // no colors
            }
        },
        (err, stdout, stderr) => {
            if (!err) {
                response.caption = unit
                response.txt = stdout
                exec(`systemctl show ${unit} --no-pager`, (err, stdout, stderr) => {
                    if (!err) {
                        response.detail = stdout
                        return event.sender.send(this.MSG, response)
                    } else {
                        console.log('bash ERROR', stderr)
                    }
                })
            } else {
                console.log('bash ERROR', stderr)
            }
        })
        return false
    },

    toHtml (response) {
        this.response.caption = response.caption
        response.txt = response.txt.replace(/^#(.*)\n/gm, '<i class="text-muted">#$1</i>' + '\n')
        response.txt = response.txt.replace(/^\[(.*)\]$/gm, '[<em class="text-primary">$1</em>]')
        response.txt = response.txt.replace(/^(\w.*?)=/gm, '<span class="text-info">$1</span>=')
        response.txt = response.txt.replace(/\n/gm, '<br />')

        response.detail = response.detail.replace(/^(\w.*?)=/gm, '<span class="text-info">$1</span>=')
        response.detail = response.detail.replace(/\n/gm, '<br />')

        this.html = `${response.txt}<hr /><h4>${dico.app.details}</h4><hr />${response.detail}`
        return this.html
    },

    showDialogModal (dialog) {
        dialog.title = this.response.caption
        dialog.body = this.html
        dialog.show()
    }

}
