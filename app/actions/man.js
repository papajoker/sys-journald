/*
    show mhtml man pages

*/

const ipcRenderer = require('electron').ipcRenderer
const exec = require('child_process').exec
const consts = require('../consts.js')

module.exports = {
    MSG: consts.events.CAT_MAN,
    response: {},

    run (event, key) {
        exec(`man -H ${key} | sed -n '/body/,/body/p'  `, {
            env: {
                TERM: 'xterm-256',
                MANWIDTH: 1024,
                BROWSER: 'cat'
            }
        },
        (err, stdout, stderr) => {
            if (!err) {
                this.response.caption = key
                this.response.txt = stdout
                if (stderr) this.response.txt += stderr
                return event.sender.send(this.MSG, this.response)
            } else {
                console.log('bash ERROR', stderr, stdout)
            }
        })
        return false
    },

    toHtml (response = '') {
        if (response) this.response = response
        response.txt = response.txt.replace(/^#(.*)[<br>|<\/p>]/gm, '<i class="text-muted">#$1</i>' + '<br>')

        function setLink (link) {
            // links to man
            let linkc = link.trim()
            link = linkc
            let plus = ''
            let pos = link.indexOf('(')
            if (pos > -1) {
                link = link.slice(0, pos)
                plus = linkc.slice(pos)
            }
            if (link == '') return linkc
            return `<a href="#" class="man fa fa-info-circle"> ${link}</a>${plus} `
        }

        function setLinkhtml (link) {
            // links to http
            let linkc = link.trim()
            link = linkc
            let plus = ''
            if (link.slice(-4) == '&gt;') {
                link = link.slice(0, -4)
                plus = '&gt'
            }
            if (link == '') return linkc
            return `<a href="${link}" title="${link}" class="fa fa-external-link">&nbsp;${link}</a>${plus}`
        }

        response.txt = response.txt.replace(/(<b>[a-z0-9\-\._]*<\/b>\([\d]\))/gm, setLink)
        response.txt = response.txt.replace(/(<i>[a-z0-9\-\._]*<\/i>\([\d]\))/gm, setLink)
        response.txt = response.txt.replace(/(<tt>[a-z0-9\-\._]*<\/tt>\([\d]\))/gm, setLink)
        response.txt = response.txt.replace(/([a-z0-9\-\._]*\([\d]\))/gm, setLink)
        response.txt = response.txt.replace(new RegExp('(https?://[-a-z0-9:%_\+.~#;?&//=]{4,})', 'gmi'), setLinkhtml)
        this.response = response
        return response.txt
    },

    showDialogModal (dialog) {
        dialog.title = this.response.caption
        dialog.body = this.response.txt
        dialog.show()
    },

    showDialogWindow () {
        ipcRenderer.send(consts.events.WINDOW_CREATE, {
            model: 'app/man.html',
            response: this.response,
            debug: true,
            modal: true
        })
    }

}
