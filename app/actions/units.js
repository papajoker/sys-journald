/*
*   get actives units
*/

const execSync = require('child_process').execSync
const exec = require('child_process').exec
const consts = require('../consts.js')
const dico = consts.loadDico()

module.exports = {
    MSG: consts.events.LIST_RUN_UNITS,
    response: {},

    run (event) {
        let response = {}
        response.displayManager = execSync("systemctl show display-manager.service | awk -F=  '/^Id/ {print $2}'", {
            encoding: 'utf8'
        })
        let bash = `systemctl list-units --state running -t service --no-pager --no-legend |` +
            `awk '{printf $1":";for(i=5;i<=NF;++i)printf $i" ";print ","}'`
        console.log(bash)
        exec(bash, (err, stdout, stderr) => {
            if (!err) {
                stdout = '{"' + stdout.replace(/:/g, '":"').replace(/,\n/g, "\",\"").slice(0, -2) + '}'
                try {
                    response.units = JSON.parse(stdout)
                    event.sender.send(`${this.MSG}`, response)
                    return true
                } catch (e) {
                    console.log('json ERROR', e, stdout)
                }
            } else {
                console.log('bash ERROR', bash, stderr)
            }
        })
        return false
    },

    toHtml (response) {
        this.html = ''
        for (let key in response.units) {
            this.html += `<i class="fa fa-info-circle catunit" aria-hidden="true" data-unit="${key}"></i>
                    <span class="text-info">${key}</span> = ${response.units[key]}<br />`
        }
        if (response.displayManager) {
            this.html += `<br /><i class="text-muted">display-manager.service == ${response.displayManager}</i>`
        }
        console.log('html', this.html)
        return this.html
    },

    showDialogModal (dialog) {
        dialog.title = dico.logs.active_units
        dialog.body = this.html
        dialog.show()
    }

}

/*

ipcMain.on(require(`${module.MSG}`).MSG, (event) => {
    require('../app/actions/units').run(event)
})


ipcRenderer.on(`${module.MSG}`, (event, response) => {
    let units = require('../app/actions/units')
    units.toHtml(response)
    units.showDialogModal(dialog)
}
*/
