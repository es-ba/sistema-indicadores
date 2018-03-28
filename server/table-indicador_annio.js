"use strict";

module.exports = function(context){
    var puedeEditar = context.user.usu_rol === 'ingresador'  || context.user.usu_rol ==='admin'  || context.user.usu_rol ==='programador';
    return context.be.tableDefAdapt({
        name:'indicador_annio',
        editable: puedeEditar,
        fields: [
            {name: 'indicador'            ,typeName:'text'          ,nullable:false},
            {name: 'annio'                ,typeName:'text'          ,nullable:false},
        ],
        primaryKey:['indicador','annio'],
        foreignKeys:[
            {references:'indicadores', fields:['indicador']},
        ]

    },context);
}