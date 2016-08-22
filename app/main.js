'use strict'

const electron = require('electron')
const {
    app,
    Tray,
    ipcMain,
    BrowserWindow,
    protocol
} = require('electron')


const exec = require('child_process').exec
const fs = require('fs')

const consts = require('./consts.js')
const dico = consts.loadDico()
const UserConfig = require('./userconfig.js')
const plus= ( process.argv.indexOf('--plus')>0 || process.env['PLUS']=='true' )


const path = require('path')

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow
let tray = null

require('./app.js')

protocol.registerStandardSchemes(['pacman'])


function createWindow() {

    const userconfig = new UserConfig()
    userconfig.load()

    // Create the browser window.
    mainWindow = new BrowserWindow({
        width: userconfig.getItem('w'),
        height: userconfig.getItem('h'),
        minWidth: 450,
        minHeight: 470,
        show: false,
        icon: __dirname + '/../assets/img/icon.png',
        title: consts.name,
        webPreferences: {
            zoomFactor: 1,
            defaultFontSize: 16,
            webSecurity: false,
            webaudio: false
        }
    })
    app.mainWindow = mainWindow
    app.mainWindow.zlevel = 1
    mainWindow.userconfig = userconfig


    // load the model.html of the app.
    /*
    fs.readFile(`${__dirname}/../model.htm`, 'utf8', (err, data) => {
        // work only in dev
        if (err) throw err
        data = data.replace(/::(.*)::/g, (match) => {
            match = match.slice(2, -2)
            let newvalue = eval(`dico.${match}`)
            //console.log('replace ', match, 'by', newvalue)
            return eval(`dico.${match}`)
        })

        fs.writeFile(`${__dirname}/../index.html`, data, (err) => {
            // TODO : test, ok this AppImage but with classical install in /opt/ ????
            if (err) throw err
            console.log('finished translation')
            mainWindow.loadURL(`file://${__dirname}/../index.html`)
        })
    })*/
    mainWindow.loadURL(`file://${__dirname}/../model.htm`)
    //mainWindow.openDevTools()


    // Emitted when the window is closed.
    mainWindow.on('closed', () => {
        // Dereference the window object, usually you would store windows
        // in an array if your app supports multi windows, this is the time
        // when you should delete the corresponding element.
        mainWindow = null
    })

    mainWindow.on('close', () => {
        mainWindow.userconfig.setItem('w', app.mainWindow.getSize()[0])
        mainWindow.userconfig.setItem('h', app.mainWindow.getSize()[1])
        mainWindow.userconfig.save()
        console.log('usrConfig',mainWindow.userconfig)
    })

    mainWindow.webContents.on('dom-ready', () => {
        mainWindow.webContents.send('SET_THEME',mainWindow.userconfig.getItem('theme'));
        mainWindow.show()
    })

    if (!fs.existsSync(consts.tmp)) {
        fs.mkdir(consts.tmp)
    }

    // tests
    protocol.registerStringProtocol('pacman', (request, callback) => {
        console.log('pacman://',request)
        let req= { exe:'sudo', lang:'fr' }
        let response= require('./app.js').runPacman(null,req, (response)=>{
            console.log('pacman:// response',response)
            let html=`<!DOCTYPE html><html>
                <h3>pacman://</h3>
                <h4>${request.url}</h4>
                ${response.qi}<hr>
                ${response.links.join('<br />')}
                </html>`
            callback({data: html, mimeType:'text/html'})
        })
    }, (error) => {
        if (error) console.error('Failed to register protocol')
    })


}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow) // original

// Quit when all windows are closed.
app.on('window-all-closed', function() {
    // On OS X it is common for applications and their menu bar
    // to stay active until the user quits explicitly with Cmd + Q
    if (process.platform !== 'darwin') {
        if (fs.existsSync(consts.tmp)) {
            exec(`rm -rf ${consts.tmp}`)
        }
        exec(`rm ${__dirname}/../index.html`)
        app.quit()
    }
})

app.on('activate', function() {
    // On OS X it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (mainWindow === null) {
        createWindow()
    }
})

app.on('open-url', function (ev, url) {
    //console.log('open-url',url)
});

ipcMain.on('GO_HOME', (event)=>{
    mainWindow.loadURL(`file://${__dirname}/../model.htm`)
    mainWindow.webContents.send('SET_THEME',mainWindow.userconfig.getItem('theme'));
})

ipcMain.on('APP_QUIT', (event) => {
    console.log('APP_QUIT')
    app.quit()
})

ipcMain.on('DEV_OPEN', (event) => {
    mainWindow.toggleDevTools()
})

ipcMain.on('ZOOM_RESET', (event) => {
    mainWindow.webContents.setZoomLevel(0)
})

ipcMain.on('ZOOM_IN', (event) => {
    console.log(require.resolve('electron'))
    mainWindow.zlevel -= 1
    mainWindow.webContents.setZoomLevel(mainWindow.zlevel)
})

ipcMain.on('ZOOM_OUT', (event) => {
    console.log(require.resolve('electron'))
    mainWindow.zlevel += 1
    mainWindow.webContents.setZoomLevel(mainWindow.zlevel)
})

ipcMain.on('THEME_CHANGE', (event, newtheme) => {
    mainWindow.userconfig.setItem('theme', newtheme)
})

