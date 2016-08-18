'use strict'

module.exports = {
    html : {
        program : "Programme",
        type : {
            unit : "unité",
            program : "programme"
        },
        boot : {
            caption : "Boot",
            notice : "(0) actuel (-1) précédent"
        },
        date : "Date de début",
        level : "Niveaux",
        levels : [
            "urgence","alerte", "critique", "erreur","attention","notice","information","debug"
        ],
        find: "Recherche",
        welcome : "Bienvenue"
    },
    app :{
        error : "Erreur",
        details : "Détails",
        messages :"Messages dans journald",
        message :"Messages",
        pacman : 'Pacman Informations'
    },
    menu : {
        file : "&Fichier",
        edit : "&Edition",
        whitetheme : "style Clair flatly",
        blacktheme : "style Sombre superhero",
        units : "Unités",
        plot : "Graphique de boot",
        copy : "Copier",
        paste : "Coller",
        view : "&Affichage",
        window : "Fe&netre"
    },
    logs : {
        unit : "systemd unité",
        detail : "voir détails",
        priority : "Priorité",
        active_units : "unités actives"
    }
}
