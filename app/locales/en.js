'use strict'

module.exports = {
    html : {
        program : "Program",
        type : {
            unit : "unit",
            program : "program"
        },
        boot : {
            caption : "Boot",
            notice : "(0) current (-1) previous"
        },
        date : "Start date",
        level : "Level",
        levels : [
            "urgency","alert", "critical", "error","warning","notice","information","debug"
        ],
        find: "Find",
        welcome : "Welcome"
    },
    app :{
        error : "Error",
        details : "Details",
        messages :"Journald items",
        message :"items",
        pacman : 'Pacman infos'
    },
    menu : {
        file : "&File",
        edit : "&Edit",
        whitetheme : "White style flatly",
        blacktheme : "Black style superhero",
        units : "Units",
        plot : "Graphical boot",
        copy : "Copy",
        paste : "Paste",
        view : "&View",
        window : "&Window"
    },
    logs : {
        unit : "systemd unit",
        detail : "details",
        priority : "Priority",
        active_units : "active units"
    }
}
