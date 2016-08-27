
const consts = require('./consts.js')

const ipcMain = require('electron').ipcMain
const fs = require('fs')
const exec = require('child_process').exec
// const dico = consts.loadDico()

const plus = (process.argv.indexOf('--plus') > 0 || process.env['PLUS'] == 'true')

ipcMain.on(consts.events.JOURNALCTL, (event, query) => {

    const maxItems = parseInt(consts.packageInfos.maxitems)

    let searchtype = '-t '
    let params = ''
    if (query.search) {
        console.log('find by string')
        if (query.type == 0) {
            searchtype = '-u'
            console.log('unit find')
        }
        if (query.search.substring(0, 1) == '/') {
            searchtype = ''
            console.log('program find with path')
        }
        query.search = `"${query.search}"`
    } else {
        searchtype = ''
    }
    if (query.boot) {
        params += ' -b ' + query.boot
    } else {
        console.log('date:', query.date) // format 2015-12-31
        if (query.date) {
            console.log('find by date')
            params += ` --since "${query.date}"`
        }
    }
    if (query.level) {
        params += ' -p ' + query.level
    }

    let command = `journalctl ${params} ${searchtype} ${query.search} --no-pager -n${maxItems} -o json | sed 's/}$/},/g'`
    console.log(command)
    exec(command, {
        maxBuffer: maxItems * 40096,
        shell: '/bin/sh'
    }, (err, stdout, stderr) => {

        stdout = stdout.slice(0, -2) // limite texte !!!
        console.log('return sizing: ', stdout.length)

        if (plus) {
            fs.writeFile(`${consts.tmp}stdout.json`, stdout, 'utf8', (err) => {
                if (err) console.log('fs.writeFileSync error: ', err)
            })
        }

        event.sender.send(consts.events.JOURNALCTL_REPLY, {
            'txt': '[' + stdout + ']',
            'error': stderr,
            'bash': command.slice(0, -25)
        })
    })
})

ipcMain.on(consts.events.JOURNAL_GET_EXES, (event) => {
    let response = {}
    exec(`journalctl -F _EXE | awk -F'/' '{print $NF}' | sort`, {
        encoding: 'utf8'},
    (err, stdout) => {
        if (!err) {
            response.exe = stdout
            exec(`journalctl -F UNIT --no-pager | grep -Ev "\\x2" | sort`, {
                encoding: 'utf8'
            },
            (err, stdout) => {
                if (!err) {
                    response.unit = stdout
                    exec(`journalctl -F _COMM --no-pager | grep -v "("  | sort`, {
                        encoding: 'utf8'},
                    (err, stdout) => {
                        if (!err) {
                            response.comm = stdout
                            event.sender.send(consts.events.JOURNAL_GET_EXES_REPLY, response)
                        }
                    })
                }
            }
            )
        }
    })
})

ipcMain.on(consts.events.JOURNAL_GET_BOOTS, (event) => {
    let items, response = {}
    response.items = []
    exec(`journalctl --list-boots --no-pager | ` +
        `tail -n -40 | sort -gr | ` +
        `awk '{print $1","$3","$4","$5}'`, {
            encoding: 'utf8'},
            (err, stdout, stderr) => {
                if (!err) {
                    let lines = stdout.split("\n")
                    lines.forEach((line) => {
                        items = line.split(',')
                        if (items.length == 4) response.items.push({
                            id: items[0],
                            day: items[1],
                            date: items[2].slice(5),
                            time: items[3]
                        })
                    })
                    event.sender.send(consts.events.JOURNAL_GET_BOOTS_REPLY, response)
                }
            }
    )
})

ipcMain.on(consts.events.CAT_UNIT, (event, unit) => {
    let response = {}
    exec(`systemctl cat ${unit}`, {
        env: {
            TERM: 'xterm' // no colors
        }
    },
    (err, stdout, stderr) => {
        if (!err) {
            response.txt = stdout
            exec(`systemctl show ${unit} --no-pager`, (err, stdout, stderr) => {
                if (!err) {
                    response.detail = stdout
                    event.sender.send(consts.events.CAT_UNIT_REPLY, response)
                } else {
                    console.log('bash ERROR', stderr)
                }
            })
        } else {
            console.log('bash ERROR', stderr)
        }
    })
})

ipcMain.on(require('../app/actions/plotboot').MSG, (event) => {
    require('../app/actions/plotboot').run(event)
})

ipcMain.on(require('../app/actions/units').MSG, (event) => {
    require('../app/actions/units').run(event)
})

ipcMain.on(consts.events.PACMAN_QI, (event, request) => {
    return runPacmanQi(event, request)
})

function runPacmanQi (event, request, callback) {
    let response = {
        caption: '',
        unit: request.unit,
        qi: '',
        links: [],
        ql: '',
        err: ''
    }

    request.lang = request.lang + '_' + request.lang.toUpperCase() + '.utf8'
    console.log(`LANG=${request.lang} pacman -Qi "${response.unit}";`)
    exec(`pacman -Qi "${response.unit}"| grep -v "[--]$" `, {
        env: {
            TERM: 'xterm',
            LANG: request.lang
        }
    },
        (err, stdout, stderr) => {
            if (!err) {
                response.qi = stdout
                console.log(`echo -n $(LANG=C pacman -Qi ${response.unit} | awk -F: '/^Requi|Depend/{print $2}')`)
                exec(`echo -n $(LANG=C pacman -Qi ${response.unit} | awk -F: '/^Requi|Depend/{print $2}')`, (err, stdout, stderr) => {
                    response.links = stdout.split(' ')
                    exec(`pacman -Ql "${response.unit}"| grep -v "\/$"|awk '{print $2}'`,
                        (err, stdout, stderr) => {
                            if (!err) {
                                response.ql = stdout

                                let find = request.unit.match(/\w+$/)[0]
                                console.log('man -k', find)
                                exec(`man -k "${find}"`, (err, stdout, stderr) => {
                                    if (!err) response.mans = stdout
                                    if (event) {
                                        event.sender.send(consts.events.PACMAN_QI_REPLY, response)
                                    }
                                    if (callback) callback(response)
                                })
                            } else {
                                response.err = stderr
                                console.log('bash ERROR', stderr)
                            }
                        })
                })
            } else {
                console.log('bash ERROR', stderr)
            }
        })
}
module.exports.runPacmanQi = runPacmanQi

// ipcMain.on(consts.events.PACMAN_QO, (event, request) => {
ipcMain.on(consts.events.PACMAN_QO, (event, request) => {
    return runPacman(event, request)
})

function runPacman (event, request, callback) {
    let response = {
        caption: request.exe,
        unit: '',
        qi: '',
        links: [],
        ql: '',
        err: ''
    }
    exec(`pacman -Qoq ${request.exe}`, (err, stdout, stderr) => {
        if (!err) {
            stdout = stdout.slice(0, -1)
            response.caption = request.exe
            response.unit = stdout
            request.lang = request.lang + '_' + request.lang.toUpperCase() + '.utf8'
            console.log(`LANG=${request.lang} pacman -Qi "${response.unit}";echo '<hr /><hr />'; pacman -Ql "${response.unit}"|grep -v "/\/$/"|awk '!/\/$/ {print $2}'`)
            exec(`pacman -Qi "${response.unit}"| grep -v "[--]$" `, {
                env: {
                    TERM: 'xterm',
                    LANG: request.lang
                }
            },
                (err, stdout, stderr) => {
                    if (!err) {
                        response.qi = stdout
                        console.log(`echo -n $(LANG=C pacman -Qi ${response.unit} | awk -F: '/^Requi|Depend/{print $2}')`)
                        exec(`echo -n $(LANG=C pacman -Qi ${response.unit} | awk -F: '/^Requi|Depend/{print $2}')`, (err, stdout, stderr) => {
                            response.links = stdout.split(' ')
                            exec(`pacman -Ql "${response.unit}"| grep -v "\/$"|awk '{print $2}'`,
                                (err, stdout, stderr) => {
                                    if (!err) {
                                        response.ql = stdout

                                        let find = request.exe.match(/\w+$/)[0]
                                        console.log('man -k', find)
                                        exec(`man -k "${find}"`, (err, stdout, stderr) => {
                                            if (!err) response.mans = stdout
                                            if (event) {
                                                event.sender.send(consts.events.PACMAN_QO_REPLY, response)
                                            }
                                            if (callback) callback(response)
                                        })
                                    } else {
                                        response.err = stderr
                                        console.log('bash ERROR', stderr)
                                    }
                                })
                        })
                    } else {
                        console.log('bash ERROR', stderr)
                    }
                })
        } else {
            console.log('bash ERROR', stderr)
        }
    })
}
module.exports.runPacman = runPacman



ipcMain.on(consts.events.CAT_MAN, (event, item) => {
    exec(`man -H ${item} | sed -n '/body/,/body/p'  `, {
            // exec(`man ${item} | groff -man -E -T html | sed -n '/body/,/body/p'  `, {
        env: {
            TERM: 'xterm-256',
            MANWIDTH: 1024,
            BROWSER: 'cat'
        }
    },
        (err, stdout, stderr) => {
            if (!err) {
                let response = {}
                response.caption = item
                response.txt = stdout
                if (stderr) response.txt += stderr
                event.sender.send(consts.events.CAT_MAN_REPLY, response)
            } else {
                console.log('bash ERROR', stderr, stdout)
            }
        })
})

ipcMain.on(consts.events.MAN_SEARCH, (event, item) => {
    exec(`man -k "${item}"`, (err, stdout, stderr) => {
        let response = {}
        response.caption = item
        response.txt = stdout
        if (stderr) response.txt = stderr
        event.sender.send(consts.events.MAN_SEARCH_REPLY, response)
    })
})

ipcMain.on(consts.events.BASH_DF, (event) => {
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
            event.sender.send(consts.events.BASH_DF_REPLY, response)
        })
    })
})

ipcMain.on(consts.events.UNAME, (event) => {
    exec(`uname -a`,
        (err, stdout, stderr) => {
            if (!err) {
                event.sender.send(consts.events.UNAME_REPLY, stdout)
            } else {
                console.log('bash ERROR', stderr)
            }
        })
})

ipcMain.on(consts.events.RELEASE, (event) => {
    exec(`awk -F'=' '/^DISTRIB_DESCRIPTION/ {print $2}' /etc/lsb-release`,
        (err, stdout, stderr) => {
            if (!err) {
                event.sender.send(consts.events.RELEASE_REPLY, stdout)
            } else {
                console.log('bash ERROR', stderr)
            }
        })
})
