/* ----------- APP MENU -------------- */

const {
    remote,
    ipcRenderer
} = require('electron')
const {
    Menu,
    MenuItem
} = remote
const fs = require('fs')
const path = require('path')
const EventEmitter = require('events').EventEmitter

const consts = require('../consts.js')
const plus = (process.argv.indexOf('--plus') > 0 || process.env['PLUS'] == 'true')
const dico = consts.loadDico() // navigator.language.slice(0, 2))



class AppMenu extends EventEmitter {

    constructor () {
        super()
        Menu.setApplicationMenu (remote.Menu.buildFromTemplate(
            this.setTemplate()
        ))
        this.themeitems = {}
    }

    setThemes () {
        let self = this
        let themeMenu = new Menu()
        fs.readdir(path.join(__dirname, '../../assets/css/themes'), function (err, files) {
            files.forEach(function (file) {
                fs.stat(path.join(__dirname, '../../assets/css/themes/', file), function (err, stats) {
                    if (err) throw err
                    if (stats.isDirectory()) {
                        themeMenu.append(new MenuItem({
                            type: 'radio',
                            label: file,
                            id: `mnu_${file}`,
                            click: () => {
                                self.emit('action', 'SET_THEME', file)
                            }
                        }))
                    }
                })
            })
        })
        this.themeitems = themeMenu
        return themeMenu
    }

    setTemplate () {
        let self = this
        return [{
            label: dico.menu.file,
            submenu: [{
                label: dico.menu.plot,
                accelerator: 'CmdOrCtrl+P',
                click: () => {
                    ipcRenderer.send(consts.events.PLOT)
                }
            }, {
                label: dico.menu.units,
                accelerator: 'CmdOrCtrl+U',
                click: () => {
                    ipcRenderer.send(consts.events.LIST_RUN_UNITS)
                }
            }, {
                label: 'ma&n',
                accelerator: 'CmdOrCtrl+N',
                click: () => {
                    self.emit('action', 'MAN')
                }
            }, {
                label: 'Partitions &df',
                accelerator: 'CmdOrCtrl+D',
                visible: true, // plus
                click: () => {
                    ipcRenderer.send(consts.events.BASH_DF)
                }
            }, {
                type: 'separator'
            }, {
                role: 'quit'
            }]
        }, {
            label: dico.menu.edit,
            submenu: [{
                label: dico.menu.copy,
                // accelerator: 'CmdOrCtrl+C',
                role: 'copy'
            }, {
                label: dico.menu.paste,
                // accelerator: 'CmdOrCtrl+V',
                role: 'paste'
            }]
        }, {
            label: dico.menu.view,
            submenu: [{
                label: 'Themes',
                submenu: this.setThemes()
            }, {
                type: 'separator'
            }, {
                label: 'Zoom',
                visible: plus,
                submenu: [{
                    label: 'Reset',
                    accelerator: 'CmdOrCtrl+0',
                    role: 'resetzoom',
                    click: () => {
                        ipcRenderer.send('ZOOM_RESET')
                    }
                }, {
                    label: 'Plus',
                    accelerator: 'CmdOrCtrl+Right',
                    role: 'zoomin',
                    click: () => {
                        ipcRenderer.send('ZOOM_IN')
                    }
                }, {
                    label: 'Moins',
                    accelerator: 'CmdOrCtrl+Left',
                    role: 'zoomout',
                    click: () => {
                        ipcRenderer.send('ZOOM_OUT')
                    }
                }]
            }, {
                label: 'Toggle full screen',
                role: 'togglefullscreen'
            }, {
                label: 'Debug',
                visible: plus,
                submenu: [{
                    label: 'Toggle Dev tool',
                    accelerator: 'CmdOrCtrl+Shift+I',
                    click: () => {
                        ipcRenderer.send('DEV_OPEN')
                    },
                    id: 'menu_devtool'
                }]
            }, {
                label: 'Reload',
                accelerator: 'F5',
                click (item, focusedWindow) {
                    if (focusedWindow) focusedWindow.reload()
                },
                visible: plus,
                id: 'menu_reload'
            }, {
                label: 'Home',
                visible: plus,
                accelerator: 'F2',
                click () {
                    ipcRenderer.send('GO_HOME')
                }
            }]
        }, {
            label: dico.menu.window,
            submenu: [{
                label: 'Minimize',
                role: 'minimize'
            }, {
                label: 'Close',
                role: 'close'
            }, {
                type: 'separator'
            }, {
                label: 'About',
                click () {
                    self.emit('action', 'ABOUT')
                }
            }]
        }]
    }

    update (options) {

        function changeTheme (menu, mnuid) {
            menu.items.forEach((item) => {
                if (item.label == 'Themes') {
                    changeTheme(item.submenu, mnuid)
                    return
                }
                if (item.submenu) {
                    changeTheme(item.submenu, mnuid)
                }
                else if (item.id == mnuid) {
                    item.checked = true
                    return true
                }
            })
            return false
        }

        // console.log('debut update menu',options.theme)
        if (options.theme) {
            let menu = Menu.getApplicationMenu()
            changeTheme(menu, 'mnu_' + options.theme)
        }
    }

}

module.exports = AppMenu

/*
const menu = new Menu()
menu.append(new MenuItem({
    label: dico.menu.plot,
    click(menuItem, browserWindow, event) {
        ipcRenderer.send(consts.events.PLOT)
    }
}))
menu.append(new MenuItem({
    label: dico.menu.units,
    click(menuItem, browserWindow, event) {
        ipcRenderer.send(consts.events.LIST_RUN_UNITS)
    }
}))
window.addEventListener('contextmenu', (e) => {
    e.preventDefault()
    menu.popup(remote.getCurrentWindow())
}, false)
*/
