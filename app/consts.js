/*
*   constantes
*/

module.exports = {
    events: {
        LIST_RUN_UNITS: 'list_units',
        PLOT: 'plot_boot',
        CAT_UNIT: 'cat_unit',
        JOURNALCTL: 'journalctl',
        PACMAN_QI: 'pacman_qi',
        PACMAN_QO: 'pacman_qo',
        RELEASE: 'getRealease',
        UNAME: 'getUname',
        CAT_MAN: 'show_man',
        MAN_SEARCH: 'man_search',
        BASH_DF: 'df',
        JOURNAL_GET_BOOTS: 'get_boots',
        JOURNAL_GET_EXES: 'get_list_executables',
        WINDOW_CREATE: 'create_other_window',
        // responses
        LIST_RUN_UNITS_REPLY: 'list_units_response',
        PLOT_REPLY: 'plot_boot_response',
        CAT_UNIT_REPLY: 'cat_unit_response',
        JOURNALCTL_REPLY: 'journalctl_response',
        PACMAN_QI_REPLY: 'pacman_qi_response',
        PACMAN_QO_REPLY: 'pacman_qo_response',
        RELEASE_REPLY: 'getRealease_response',
        UNAME_REPLY: 'getUname_response',
        CAT_MAN_REPLY: 'show_man_response',
        MAN_SEARCH_REPLY: 'man_search_response',
        BASH_DF_REPLY: 'df_response',
        JOURNAL_GET_BOOTS_REPLY: 'get_boots_response',
        JOURNAL_GET_EXES_REPLY: 'get_list_executables_response'
    },
    name: process.env['npm_package_name'],
    tmp: '/tmp/e-journald/',
    ui: {
        windowDefaultWidth: 900,
        windowDefaultHeight: 620
    },
    LANG: 'en',
    packageInfos: { }
}

let lg = process.env['LANG']
// let lg=require('child_process').execSync("locale | awk -F'=' '/^LANG/ {print $2}'",{ encoding:'utf8'})
module.exports.LANG = lg.slice(0, 2)
// console.log(`consts.lang`,module.exports.LANG)

module.exports.packageInfos = JSON.parse(require('fs').readFileSync(`${__dirname}/../package.json`, 'utf8'))
module.exports.name = module.exports.packageInfos.name


function loadDico (lang) {
    lang && (module.exports.LANG = lang)

    try {
        console.log(`./locales/${module.exports.LANG}.js`)
        return require(`./locales/${module.exports.LANG}.js`)
    } catch (e) {
        module.exports.LANG = 'en'
        return require('./locales/en.js')
    }
}
module.exports.loadDico = loadDico
