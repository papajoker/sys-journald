/*
    systemd boot graph

*/
const ipcRenderer = require('electron').ipcRenderer
const exec = require('child_process').exec
const consts = require('../consts.js')


module.exports = {
    MSG: consts.events.PLOT,
    html: null,
    src: `${consts.tmp}plot.svg`,

    run (event) {
        exec(`systemd-analyze plot > ${this.src}`,
        (err, stdout, stderr) => {
            if (!err) {
                event.sender.send(this.MSG, this.src)
            } else {
                console.log('bash ERROR', stderr)
            }
        })
        return false
    },

    toHtml () {
        this.html = `
            <div id="scroll" class="dragscroll" style="width:100%; height:${$(window).height() - 150}px; overflow:scroll;">
            <img src="${this.src}" style="width:2000px;">
            </div>
        `
        return this.html
    },

    showDialogModal () {
        $('#dialog .modal-dialog').addClass('modal-lg')
        $('#dialog .modal-title').html('systemd-analyze plot')
        document.querySelector('#dialog .modal-body').innerHTML = this.html
        dragscroll.reset()
        $('#dialog').modal('show')
    },

    showDialogWindow () {
        ipcRenderer.send(consts.events.WINDOW_CREATE, {
            model: 'app/boot-graph.html',
            file: this.src,
            debug: true,
            modal: true
        })
    }

}


