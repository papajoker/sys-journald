// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// All of the Node.js APIs are available in this process.

'use strict'

const {
    remote,
    ipcRenderer,
    shell,
    protocol
} = require('electron')
const {
    Menu,
    MenuItem
} = remote

const consts = require('../app/consts.js')
const MessageItem = require('./messageitem.js')
const plus = (process.argv.indexOf('--plus') > 0 || process.env['PLUS'] == 'true')
    // load const and dico files
const dico = consts.loadDico() //navigator.language.slice(0, 2))
//console.log('dico', dico, consts)

const dialog = require('./dialog.js')


const AppMenu = require('./menus.js')
const mainMenu = new AppMenu()

/*----------- SEARCH ACTION --------------*/

/*
 *   send message get logs to (server)
 *   inputs : main form
 */
document.getElementById('send-btn').addEventListener('click', () => {
    event.preventDefault();
    ipcRenderer.send(consts.events.JOURNALCTL, {
        'search': document.getElementById('search').value,
        'type': document.getElementById('searchtype').value,
        'boot': document.getElementById('boot').value,
        'date': document.getElementById('date').value,
        'level': document.getElementById('level').value
    })
    console.log('client send: ' + consts.events.JOURNALCTL)
})

/*
 *   recept messages log from (serveur)
 *   input: json
 */
ipcRenderer.on(consts.events.JOURNALCTL_REPLY, (event, response) => {

    $('#content').prepend(`<pre>` + /*${response.txt}+*/ `</pre><h4>${response.error}</h4>`)
    $('#commandbash').html(response.bash)
    $('#logs').text('')

    let items = []
    try {
        items = JSON.parse(response.txt)
        console.log(items.length, ' JSON.parse Items .length')
        response = null
        if (items.length > 5) {
            new Notification(`${dico.app.message}`, {
                body: `${items.length} ${dico.app.message}.`,
                icon: __dirname + '/img/icon.png'
            })
        }
    } catch (e) {
        console.error('JSON journal response Parsing error:', e)
    }

    // show messages
    console.log(items.length, ' items.length')
    items.forEach((item, key) => {
        delete item.__CURSOR
        item = new MessageItem(item, dico)
        $('#logs').append(item.render())
    })

    document.querySelectorAll('span.unit').forEach((el) => {
        el.addEventListener('click', function(event) {
            let unit = event.srcElement.getAttribute('data-unit')
            ipcRenderer.send(consts.events.CAT_UNIT, unit)
        }, false)
    })

    document.querySelectorAll('span.executable').forEach((el) => {
        el.addEventListener('click', function(event) {
            ipcRenderer.send(consts.events.PACMAN_QO, {
                lang: navigator.language.slice(0, 2),
                exe: event.srcElement.textContent
            })
        }, false)
    })

    document.querySelectorAll('span.time').forEach((el) => {
        el.addEventListener('click', function(event) {
            let logtime = event.srcElement.textContent
            let response = event.srcElement.parentNode.querySelector('.cache').textContent
            let item = JSON.parse(response)
            response = `<p bg-info><div class="well well-sm"><b>${item['MESSAGE']}</b></div></p><hr />`
            for (let key in item) {
                (key != 'MESSAGE') && (response += `<span class="text-info">${key}</span> = ${item[key]}<br />`)
            }
            $('#dialog .modal-title').html(`<h5 class="text-muted">${logtime}</h5>`)
            document.querySelector('#dialog .modal-body').innerHTML = response
            $('#dialog').modal('show')
        })
    })
})

/*----------- ACTIONS MENU --------------*/

/*
 *   dialog systemctl
 *           systemctl cat unit
 *           systemctl show unit
 */
ipcRenderer.on(consts.events.CAT_UNIT_REPLY, (event, response) => {

    response.txt = response.txt.replace(/^#(.*)\n/gm, '<i class="text-muted">#$1</i>' + '\n')
    response.txt = response.txt.replace(/^\[(.*)\]$/gm, '[<em class="text-primary">$1</em>]')
    response.txt = response.txt.replace(/^(\w.*?)=/gm, '<span class="text-info">$1</span>=')
    response.txt = response.txt.replace(/\n/gm, '<br />')

    response.detail = response.detail.replace(/^(\w.*?)=/gm, '<span class="text-info">$1</span>=')
    response.detail = response.detail.replace(/\n/gm, '<br />')


    dialog.title = dico.html.unit
    dialog.body = `${response.txt}<hr /><h4>${dico.app.details}</h4><hr />${response.detail}`
    dialog.show()
        /*dialog.showMessageBox({
                    "type": "info",
                    "buttons": ["ok"],
                    "title": "systemd logs",
                    "message": "systemctl cat: "+response
        });*/
})

ipcRenderer.on(consts.events.PLOT_REPLY, (event, src) => {
    $('#dialog .modal-dialog').addClass('modal-lg')
    $('#dialog .modal-title').html('systemd-analyze plot')
    document.querySelector('#dialog .modal-body').innerHTML = `
        <div id="scroll" class="dragscroll" style="width:100%; height:${$(window).height()-150}px; overflow:scroll;">
        <img src="${src}" style="width:2600px;">
        </div>
    `
    dragscroll.reset()
    $('#dialog').modal('show')
})

/*
 *   Dialog: active units
 *   input: response.units object
 */
ipcRenderer.on(consts.events.LIST_RUN_UNITS_REPLY, (event, response) => {
    let html = ''
    for (let key in response.units) {
        html += `<i class="fa fa-info-circle catunit" aria-hidden="true" data-unit="${key}"></i>
                <span class="text-info">${key}</span> = ${response.units[key]}<br />`
    }
    if (response.displayManager) {
        html += `<br /><i class="text-muted">display-manager.service == ${response.displayManager}</i>`
    }

    dialog.title = dico.logs.active_units
    dialog.body = html
    dialog.show()


    $('#dialog').modal('show')
})

/*
 *   Dialog: pacman -Qi
 *           pacman -Ql
 *           man -k
 */
function showDialogPacmanInfo(event, response) {
    response.qi = response.qi.replace(/^(\w.*?):/gm, '<span class="text-info">$1</span>=')

    function setLink(link) {
        let ret = (link.charAt(link.length - 1) == "\n") ? "\n" : ''
        let linkc = link.trim()
        link = linkc
        let plus = ''
        let pos = link.indexOf('>')
        if (pos > -1) {
            link = link.slice(0, pos)
            plus = linkc.slice(pos)
        }
        return ` <a href="pacman://ql/${link}" class="getQI">${link}</a>${plus}&nbsp;&nbsp; ${ret}`
    }

    response.links.forEach(function(value) {
        response.qi = response.qi.replace(new RegExp(` (${value})[ |\n]`, 'g'), setLink)
    })
    response.qi = response.qi.replace(
        new RegExp('(https?://[-a-z0-9:%_\+.~#;?&//=]{4,})', 'gmi'), 
        `<a href="$1" title="$1" class="fa fa-external-link">&nbsp;$1</a>`
    )    
    response.qi = response.qi.replace(/\n/g, '<br />')

//TODO: web href    

    response.ql = response.ql.replace(/^(\/usr\/bin\/\w.*)/gm, '<span class="text-info">$1</span>')
    response.ql = response.ql.replace(/^(\/etc\/\w.*)/gm, '<span class="text-info">$1</span>')
    response.ql = response.ql.replace(/(\.desktop)$/gm, '<span class="text-info">$1</span>')
    response.ql = response.ql.replace(/\n/g, '<br />')

    try {
        response.mans = response.mans.replace(/^(.*)\([\d|\)]/gm, '<a class="fa fa-info-circle man" aria-hidden="true" href="#"> $1</a> (')
        response.mans = response.mans.replace(/\n/g, '<br />')
    } catch (e) {;
    }


    dialog.title = `${response.caption}, ${response.unit}`
    dialog.body = `
        <ul class="nav nav-tabs" role="tablist">
        <li role="presentation" class="active"><a href="#qi" aria-controls="qi" role="tab" data-toggle="tab">-Qi</a></li>
        <li role="presentation"><a href="#ql" aria-controls="ql" role="tab" data-toggle="tab">-Ql</a></li>
        <li role="presentation"><a href="#mans" aria-controls="mans" role="tab" data-toggle="tab">man(s)</a></li>
        </ul>
        <div class="tab-content">
            <div role="tabpanel" class="tab-pane active" id="qi">
            ${response.qi}
            </div>
            <div role="tabpanel" class="tab-pane" id="ql">
            ${response.ql}
            </div>
            <div role="tabpanel" class="tab-pane" id="mans">
                ${response.mans}
                <hr />
                <form>
                <div class="row" class="">
                    <div class="col-lg-8">
                        <div class="input-group" id="man-search-form">
                        <input type="text" class="form-control" placeholder="Search in man" value="${response.unit}">
                        <span class="input-group-btn">
                            <button class="btn btn-primary" type="submit"><span class="fa fa-search"></span></button>
                        </span>
                        </div>
                    </div>
                </div>
                </form>
            </div>            
        </div>
        `

    dialog.show()

    document.querySelectorAll('#man-search-form button').forEach((el) => {
        el.addEventListener('click', (event) => {
            event.preventDefault();
            ipcRenderer.send(consts.events.MAN_SEARCH, document.querySelector('#man-search-form input').value)
        }, false)
    })
}

ipcRenderer.on(consts.events.PACMAN_QO_REPLY, (event, response) => {
    showDialogPacmanInfo(event, response)
})
ipcRenderer.on(consts.events.PACMAN_QI_REPLY, (event, response) => {
    showDialogPacmanInfo(event, response)
})

/*
 *   show html man page in dialog box
 *   make links to man and web
 */
ipcRenderer.on(consts.events.CAT_MAN_REPLY, (event, response) => {
    response.txt = response.txt.replace(/^#(.*)[<br>|<\/p>]/gm, '<i class="text-muted">#$1</i>' + '<br>')

    function setLink(link) {
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

    function setLinkhtml(link) {
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

    dialog.title = response.caption
    dialog.body = response.txt
    dialog.show()
})

/*
 *   show dialog find string in man
 */
function showDialogMan(response) {
    response.txt = response.txt.replace(/^(.*)\([\d|\)]/gm, '<a class="fa fa-info-circle man" aria-hidden="true" href="#"> $1</a> (')
    response.txt = response.txt.replace(/\n/g, '<br />')

    dialog.title = response.caption
    dialog.body = response.txt + `
                <hr />
                <form>
                <div class="row" class="">
                    <div class="col-lg-8">
                        <div class="input-group" id="man-search-form">
                        <input type="text" class="form-control" value="${response.caption}" placeholder="Search in man" autofocus>
                        <span class="input-group-btn">
                            <button class="btn btn-primary" type="submit"><span class="fa fa-search"></span></button>
                        </span>
                        </div>
                    </div>
                </div>
                </form>`
    dialog.show()

    document.querySelectorAll('#man-search-form button').forEach((el) => {
        el.addEventListener('click', (event) => {
            event.preventDefault();
            ipcRenderer.send(consts.events.MAN_SEARCH, document.querySelector('#man-search-form input').value)
        }, false)
    })
}

ipcRenderer.on(consts.events.MAN_SEARCH_REPLY, (event, response) => {
    showDialogMan(response)
})

/*
 *   show partitions
 *   input: response : array of object
 */
ipcRenderer.on(consts.events.BASH_DF_REPLY, (event, response) => {
    dialog.title = 'df -h / lsblk'
    let line
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
                <span class="col-xs-3 col-xs-offset-3 df-mountpoint">${(line.mountpoint)? line.mountpoint: '&nbsp;'}</span>
            </div>`
    })
    dialog.body = `<div class="df">${html}</div>
        <HR>
        <div class="df">${html2}</div>`
    dialog.show()
})

function showAbout() {
    let env = (process.env['npm_lifecycle_event'] == 'start') ? `process.env:<pre>${JSON.stringify(process.env).replace(/,/g,"<br>")}</pre>` : ''

    dialog.title = consts.packageInfos.name
    dialog.body = `
        <div class="about">
            <div class="center">
                ${consts.packageInfos.name} ${consts.packageInfos.version}<br />
                <a href="${consts.packageInfos.homepage}" target="web">web</a>
            </div>
            <hr>
            By <em class="text-info">${consts.packageInfos.author.name}</em>
            <a href="https://forum.manjaro.org/users/papajoke"><img src="https://forum.manjaro.org/user_avatar/forum.manjaro.org/papajoke/48/38_1.png" alt="papajoke"/></a>
            <hr />
            <pre>Memory used: ${Math.round(process.getProcessMemoryInfo().workingSetSize /1024)} Mo</pre>
            <pre>Total memory: ${Math.round(process.getSystemMemoryInfo().total /1024)} Mo</pre>
            <hr />
            <div class="center">
		        <div class="release"></div>
		        <div class="uname"></div>
		        <div class="nodeinfos"></div>
	        </div>
        </div>
        ${env}
        `
    dialog.show()
    setInfos()
}

/*----------- GENERAL HTML --------------*/

function setInfos() {
    ipcRenderer.send(consts.events.RELEASE)
    ipcRenderer.send(consts.events.UNAME)
    document.querySelectorAll('.nodeinfos').forEach((el) => {
        el.innerHTML = `
        NodeJs ${process.versions.node} -
		Chromium ${process.versions.chrome} &nbsp; ${navigator.language} -
		Electron ${process.versions.electron}`
    })
}

window.addEventListener('load', (e) => {
    dialog.init()
    setInfos()
})

ipcRenderer.on(consts.events.UNAME_REPLY, (event, response) => {
    document.querySelectorAll('.uname').forEach((el) => {
        el.innerHTML = response
    })
})

ipcRenderer.on(consts.events.RELEASE_REPLY, (event, response) => {
    document.querySelectorAll('.release').forEach((el) => {
        el.innerHTML = response
    })
})



function applyTheme(theme = 'superhero') {
    $('head').prepend('<link href="./assets/css/themes/' + theme + '/bootstrap.css" type="text/css" rel="stylesheet"/>')
    $(`link[href*="themes"]:not(link[href*="${theme}"])`).remove()
    ipcRenderer.send('THEME_CHANGE', theme)
        //require('electron').remote.app.mainWindow.userConfig.setItem('theme',theme)
}

/*
 *  receve message from main.js (set theme from userconfig)
 */
ipcRenderer.on('SET_THEME', (event, theme) => {
    if (!theme) return false
    applyTheme(theme)
    mainMenu.update({ 'theme' : theme })
})

/*
 *  receve messages from application menu
 */
mainMenu.on('action', (event, param) => {
    switch(event) {
        case 'SET_THEME' : 
            return applyTheme(param)
            //mainMenu.update({ 'theme' : param })
        case 'MAN' :
            return showDialogMan({
                caption: '',
                txt: ''
            })
        case 'ABOUT' :
            return showAbout()
    }
})


/*
 * traductions  
 * replace block in main.js#createWindow() break
 */
$('option, span, label').text(function(i, value) {
    var ok = value.match(/::(.*)::/)
    if (ok != null) {
        try {
            let match = ok[0].slice(2, -2)
            let newvalue = eval(`dico.${match}`)
            $(this).text(value.replace(/::(.*)::/, newvalue))
        } catch (e) {
            console.log('error replace ', match, 'by', newvalue, e)
        }
    }
})


$(document).on('click', 'a[href^="http"]', function(event) {
    event.preventDefault();
    shell.openExternal(this.href);
});