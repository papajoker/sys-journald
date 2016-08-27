/*
 *   class for set / show dialog
 */

const ipcRenderer = require('electron').ipcRenderer
const consts = require('../consts.js')

var dialog = null

class Dialog {
    constructor () {
        this.title = ''
        this.isHistory = false
        this.body = ''
        this.large = true
        this._save = []
    }

    set large (big = false) {
        this._large = big
        $('#dialog .modal-dialog').removeClass('modal-lg')
        this._large && $('#dialog .modal-dialog').addClass('modal-lg')
    }

    show (attach = null) {
        // save in history
        if ($('#dialog .modal-title').html() != '') {
            this._save.push({
                title: $('#dialog .modal-title').html() + '',
                content: $('#dialog .modal-body').html() + ''
            })
            if (this._save.length > 10) this._save.shift()
        }

        $('#dialog .modal-title').html(this.title)
        $('#dialog .modal-body').html(this.body)
        attach && attach()
        this.setBack()
        this.setAttach()
        $('#dialog').modal('show')
        $('#dialog').animate({
            scrollTop: 0
        }, 200)
    }

    back () {
        if (this._save.length < 1) return false
        let history = this._save.pop()
        $('#dialog .modal-title').html(history.title)
        $('#dialog .modal-body').html(history.content)

        this.setBack()
        this.setAttach()
        $('#dialog').modal('show')
    }

    setBack () {
        this.isHistory = (this._save.length > 0)
        $('#dialog .back').css('visibility', (this.isHistory) ? 'inherit' : 'hidden')
        $('#dialog .back').html(this._save.length)
    }

    setAttach () {
        document.querySelectorAll('#dialog a.man').forEach((el) => {
            el.addEventListener('click', (event) => {
                ipcRenderer.send(consts.events.CAT_MAN, event.srcElement.textContent)
            }, false)
        })
        document.querySelectorAll('#dialog a.getQI').forEach((el) => {
            el.addEventListener('click', (event) => {
                event.preventDefault()
                ipcRenderer.send(consts.events.PACMAN_QI, {
                    lang: navigator.language.slice(0, 2),
                    unit: event.srcElement.textContent
                })
            }, false)
        })
        document.querySelectorAll('#dialog i.catunit').forEach((el) => {
            el.addEventListener('click', (event) => {
                ipcRenderer.send(consts.events.CAT_UNIT, event.srcElement.getAttribute('data-unit'))
            }, false)
        })

    }

    clear () {
        this._save = []
        this.title = ''
        this.body = ''
        $('#dialog .modal-title').html('')
        $('#dialog .modal-body').html('')
    }

    init () {
        $('body').append(`
    <!-- Modal -->
	<div id="dialog" class="modal fade" id="myModal" tabindex="-1" role="dialog" aria-labelledby="myModalLabel">
	 <div class="modal-dialog modal-lg" role="document">
	  <div class="modal-content">
		<div class="modal-header">
			<span class="back fa fa-chevron-left"></span>
			<button type="button" class="close" data-dismiss="modal" aria-label="Close"><span aria-hidden="true">&times;</span></button>
			<h4 class="modal-title" id="myModalLabel"></h4>
		</div>
		<div class="modal-body"></div>
		<!--div class="modal-footer">
			<button type="button" class="btn btn-default" data-dismiss="modal">Close</button>
		</div-->
	  </div>
	 </div>
    </div>
        `)
        $('#dialog').on('hidden.bs.modal', function () {
            dialog.clear()
                // $('#dialog .modal-dialog').removeClass('modal-lg')
        })
        $('.modal').on('shown.bs.modal', function () {
            $(this).find('input:first').focus()
        })
        document.querySelectorAll('#dialog .back').forEach((el) => {
            el.addEventListener('click', () => {
                dialog.back()
            }, false)
        })
        return dialog
    }

}

dialog = new Dialog()
module.exports = dialog
