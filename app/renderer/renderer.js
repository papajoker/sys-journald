// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// All of the Node.js APIs are available in this process.

const {
    ipcRenderer,
    shell,
} = require('electron')


const consts = require('../consts.js')
const MessageItem = require('./messageitem.js')
// const plus = (process.argv.indexOf('--plus') > 0 || process.env['PLUS'] == 'true')
    // load const and dico files
const dico = consts.loadDico() // navigator.language.slice(0, 2))
// console.log('dico', dico, consts)

const dialog = require('./dialog.js')
const AppMenu = require('./menus.js')
const mainMenu = new AppMenu()

/* ----------- SEARCH ACTION -------------- */

/*
 *   send message get logs to (server)
 *   inputs : main form
 */
document.getElementById('send-btn').addEventListener('click', () => {
    event.preventDefault()
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

    $('#content').prepend(`<pre>` + /* ${response.txt}+*/ `</pre><h4>${response.error}</h4>`)
    $('#commandbash').html(response.bash)
    $('#logs').text('')

    let items = []
    try {
        items = JSON.parse(response.txt)
        console.log(items.length, ' JSON.parse Items .length')
        response = null
        if (items.length > 25) {
            new Notification(`${dico.app.message}`, {
                'body': `${items.length} ${dico.app.message}.`,
                'icon': __dirname + '../../assets/img/icon.png'
            })
        }
    } catch (e) {
        console.error('JSON journal response Parsing error:', e)
    }

    // show messages
    console.log(items.length, ' items.length')
    items.forEach((item) => {
        delete item.__CURSOR
        item = new MessageItem(item, dico)
        $('#logs').append(item.render())
    })

    document.querySelectorAll('span.unit').forEach((el) => {
        el.addEventListener('click', (event) => {
            let unit = event.srcElement.getAttribute('data-unit')
            ipcRenderer.send(consts.events.CAT_UNIT, unit)
        }, false)
    })

    document.querySelectorAll('span.executable').forEach((el) => {
        el.addEventListener('click', (event) => {
            ipcRenderer.send(consts.events.PACMAN_QO, {
                'lang': navigator.language.slice(0, 2),
                'exe': event.srcElement.textContent
            })
        }, false)
    })

    document.querySelectorAll('span.time').forEach((el) => {
        el.addEventListener('click', (event) => {
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

/* ----------- ACTIONS MENU -------------- */

/*
 *   dialog systemctl
 *           systemctl cat unit
 *           systemctl show unit
 */
ipcRenderer.on(require('../actions/unit').MSG, (event, response) => {
    let unit = require('../actions/unit')
    unit.toHtml(response)
    unit.showDialogModal(dialog)
})

ipcRenderer.on(require('../actions/plotboot').MSG, (event, src) => {
    let boot = require('../actions/plotboot')
    boot.toHtml(src)
    // boot.showDialogModal(dialog)
    boot.showDialogWindow()
})

/*
 *   Dialog: active units
 *   input: response.units object
 */
ipcRenderer.on(require('../actions/units').MSG, (event, response) => {
    let units = require('../actions/units')
    units.toHtml(response)
    units.showDialogModal(dialog)
})

/*
 *   Dialog: pacman -Qi
 *           pacman -Ql
 *           man -k
 */
function showDialogPacmanInfo (event, response) {
    response.qi = response.qi.replace(/^(\w.*?):/gm, '<span class="text-info">$1</span>=')

    function setLink (link) {
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

    response.links.forEach((value) => {
        response.qi = response.qi.replace(new RegExp(` (${value})[ |\n]`, 'g'), setLink)
    })
    response.qi = response.qi.replace(
        new RegExp('(https?://[-a-z0-9:%_\+.~#;?&//=]{4,})', 'gmi'),
        `<a href="$1" title="$1" class="fa fa-external-link">&nbsp;$1</a>`
    )
    response.qi = response.qi.replace(/\n/g, '<br />')

    response.ql = response.ql.replace(/^(\/usr\/bin\/\w.*)/gm, '<span class="text-info">$1</span>')
    response.ql = response.ql.replace(/^(\/usr\/share\/doc.*index\.html$)/gm, '<span class="text-info"><a href="file://$1" target="web" class="fa fa-external-link">$1</a></span>')
    response.ql = response.ql.replace(/^(\/etc\/.*\.conf$)/gm, '<a target="edit" href="file://$1">$1</a>')
    response.ql = response.ql.replace(/^(\/etc\/\w.*)/gm, '<span class="text-info">$1</span>')
    response.ql = response.ql.replace(/(\.desktop)$/gm, '<span class="text-info">$1</span>')
    response.ql = response.ql.replace(/\n/g, '<br />')

    response.mans = response.mans.replace(/^(.*)\([\d|\)]/gm, '<a class="fa fa-info-circle man" aria-hidden="true" href="#"> $1</a> (')
    response.mans = response.mans.replace(/\n/g, '<br />')

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
                        <input type="text" class="form-control input-sm" placeholder="Search in man" value="${response.unit}">
                        <span class="input-group-btn">
                            <button class="btn btn-primary btn-sm" type="submit"><span class="fa fa-search"></span></button>
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
            event.preventDefault()
            ipcRenderer.send(consts.events.MAN_SEARCH, document.querySelector('#man-search-form input').value)
        }, false)
    })
}

/*
 *   Dialog: list program and units in journald
 *   input: response.unit string
 *          response.exe string
 *          response.comm string
 */
ipcRenderer.on(consts.events.JOURNAL_GET_EXES_REPLY, (event, response) => {
    dialog.title = 'search input'
    dialog.body = `
        <ul class="nav nav-tabs" role="tablist">
        <li role="presentation" class="active"><a href="#units" aria-controls="units" role="tab" data-toggle="tab">${dico.html.type.unit}</a></li>
        <li role="presentation"><a href="#exe" aria-controls="exe" role="tab" data-toggle="tab">${dico.html.type.program}</a></li>
        <!--li role="presentation"><a href="#comm" aria-controls="comm" role="tab" data-toggle="tab">Comm</a></li-->
        </ul>
        <div class="tab-content">
            <div role="tabpanel" class="tab-pane active" id="units">
            ${response.unit.replace(/(.*)\.service$/gm, '$1').replace(/\n/g, '<br />')}
            </div>
            <div role="tabpanel" class="tab-pane" id="exe">
            ${response.exe.replace(/\n/g, '<br />')}
            </div>
            <!--div role="tabpanel" class="tab-pane" id="comm">
                ${response.comm.replace(/\n/g, '<br />')}
            </div-->
        </div>
        `
    dialog.show()
})

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
ipcRenderer.on(require('../actions/man').MSG, (event, response) => {
    let man = require('../actions/man')
    man.toHtml(response)
    man.showDialogModal(dialog)
})

/*
 *   show dialog find string in man
 */
function showDialogMan (response) {
    response.txt = response.txt.replace(/^(.*)\([\d|\)]/gm, '<a class="fa fa-info-circle man" aria-hidden="true" href="#"> $1</a> (')
    response.txt = response.txt.replace(/\n/g, '<br />')

    dialog.title = response.caption
    dialog.body = response.txt + `
                <hr />
                <form>
                <div class="row" class="">
                    <div class="col-lg-8">
                        <div class="input-group" id="man-search-form">
                        <input type="text" class="form-control input-sm" value="${response.caption}" placeholder="Search in man" autofocus>
                        <span class="input-group-btn">
                            <button class="btn btn-primary btn-sm" type="submit"><span class="fa fa-search"></span></button>
                        </span>
                        </div>
                    </div>
                </div>
                </form>`
    dialog.show()

    document.querySelectorAll('#man-search-form button').forEach((el) => {
        el.addEventListener('click', (event) => {
            event.preventDefault()
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
ipcRenderer.on(require('../actions/diskinfos').MSG, (event, response) => {
    let df = require('../actions/diskinfos')
    df.toHtml(response)
    df.showDialogModal(dialog)
})

function showAbout () {
    let env = (process.env['npm_lifecycle_event'] == 'start') ? `process.env:<pre>${JSON.stringify(process.env).replace(/,/g, "<br>")}</pre>` : ''

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
            <pre>Memory used: ${Math.round(process.getProcessMemoryInfo().workingSetSize / 1024)} Mo</pre>
            <pre>Total memory: ${Math.round(process.getSystemMemoryInfo().total / 1024)} Mo</pre>
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

/* ----------- GENERAL HTML -------------- */

function setInfos () {
    ipcRenderer.send(consts.events.RELEASE)
    ipcRenderer.send(consts.events.UNAME)
    document.querySelectorAll('.nodeinfos').forEach((el) => {
        el.innerHTML = `
        NodeJs ${process.versions.node} -
		Chromium ${process.versions.chrome} &nbsp; ${navigator.language} -
		Electron ${process.versions.electron}`
    })
}

window.addEventListener('load', () => {
    dialog.init()
    setInfos()
    ipcRenderer.send(consts.events.JOURNAL_GET_BOOTS)

    document.getElementById('search-exe').addEventListener('click', (event) => {
        event.preventDefault()
        ipcRenderer.send(consts.events.JOURNAL_GET_EXES)
    }, false)

    document.getElementById('search').addEventListener('blur', () => {
        if (document.getElementById('search').value.slice(0, 1) == '/') {
            document.getElementById('searchtype').selectedIndex = 1
        }
    }, false)
})

ipcRenderer.on(consts.events.JOURNAL_GET_BOOTS_REPLY, (event, response) => {
    let selected = 'selected'
    response.items.forEach((item) => {
        $('#boot').append(`<option ${selected} value="${item.id}">${item.date} &nbsp;&nbsp; ${item.time.slice(0, -3)} &nbsp;&nbsp; ${item.day}</option>`)
        selected = ''
    })
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



function applyTheme (theme = 'superhero') {
    $('head').prepend('<link href="./assets/css/themes/' + theme + '/bootstrap.css" type="text/css" rel="stylesheet"/>')
    $(`link[href*="themes"]:not(link[href*="${theme}"])`).remove()
    ipcRenderer.send('THEME_CHANGE', theme)
        // require('electron').remote.app.mainWindow.userConfig.setItem('theme',theme)
}

/*
 *  receve message from main.js (set theme from userconfig)
 */
ipcRenderer.on('SET_THEME', (event, theme) => {
    if (!theme) return false
    applyTheme(theme)
    mainMenu.update({ 'theme': theme })
})

/*
 *  receve messages from application menu
 */
mainMenu.on('action', (event, param) => {
    switch (event) {
    case 'SET_THEME' :
        return applyTheme(param)
            // mainMenu.update({ 'theme' : param })
    case 'MAN' :
        return showDialogMan({
            'caption': '',
            'txt': ''
        })
    case 'ABOUT' :
        return showAbout()
    }
})


/*
 * traductions
 * replace block in main.js#createWindow() break
 */
$('option, span, label').text(function (i, value) {
    var matchs = value.match(/::(.*)::/)
    if (matchs != null) {
        try {
            var match = matchs[0].slice(2, -2)
            var newvalue = eval(`dico.${match}`)
            $(this).text(value.replace(/::(.*)::/, newvalue))
        } catch (e) {
            console.log('error replace ', match, 'by', newvalue, e)
        }
    }
})


$(document).on('click', 'a[href^="http"]', (event) => {
    event.preventDefault()
    shell.openExternal(event.target.href)
})

$(document).on('click', 'a[target^="web"]', (event) => {
    // for html in /usr/share/doc
    event.preventDefault()
    shell.openExternal(event.target.href)
})

$(document).on('click', 'a[target^="edit"]', (event) => {
    // open self editor
    event.preventDefault()
    let href = event.target.href
    if (href.slice(0, 7) == 'file://') href = href.slice(7)
    ipcRenderer.send(consts.events.WINDOW_CREATE, {
        model: 'app/ace-builds/editor.html',
        file: href,
        debug: false,
        modal: true,
        readonly: true
    })
})
