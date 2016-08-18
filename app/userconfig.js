/*
*   Save datas for one user in ~/.config/***rc
*/

const fs = require('fs')
//const homedir = require('os')
const homedir =require('os').homedir
const consts = require('./consts.js')

module.exports= class UserConfig {
    constructor() {
        this.path = `${homedir()}/.config/${consts.name}rc`
        this.data = {
            w : consts.ui.windowDefaultWidth,
            h : consts.ui.windowDefaultHeight,
            theme : 'flatly'
        }
    }

    setItem(key,value) {
        this.data[key] = value
    }

    getItem(key) {
        return (this.data[key]) ? this.data[key] : ''
    }    

    load () {
        try {
            let data= fs.readFileSync(this.path, 'utf8')
            this.data =JSON.parse(data)
            console.log('user loaded',data)
            return true
        } catch (e) {
            console.log('UserConfig error:', e)
            this.save()
        }
        return false
    }

    save () {
        try {
            fs.writeFile(this.path, JSON.stringify(this.data), (err) => {
                console.log('user saved',JSON.stringify(this.data))
                return true
            })
        } catch (e) {
            console.log('UserConfig error:', e)
        }
        return false
    }
}   
