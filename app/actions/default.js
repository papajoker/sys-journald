/*
    model for actions

*/

const execSync = require('child_process').execSync
const exec = require('child_process').exec
const consts = require('../consts.js')
const dico = consts.loadDico()

module.exports = {
    MSG: consts.events.LIST_RUN_UNITS,
    response: {},

    run (event) {

        /*
        *   exec server command
        */
        return false
    },

    toHtml (response) {
        this.html = ''
        return this.html
    },

    showDialogModal (dialog) {
        dialog.title = ''
        dialog.body = this.html
        dialog.show()
    },

    showDialogWindow (window) {

    }

}

/*
ipcMain.on(`${module.MSG}`, (event) => {
    require('../app/actions/units').run(event)
})

ipcRenderer.on(`${module.MSG}`, (event, response) => {
    let units = require('../app/actions/units')
    units.toHtml(response)
    units.showDialogModal(dialog)
}
*/
