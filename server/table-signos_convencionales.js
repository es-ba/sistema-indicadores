"use strict";

module.exports = function(context){
    var puedeEditar = context.user.usu_rol === 'ingresador'  || context.user.usu_rol ==='admin'  || context.user.usu_rol ==='programador';
    return context.be.tableDefAdapt({
        name:'signos_convencionales',
        editable: puedeEditar,
        fields: [
            {name: 'signo'           ,typeName:'text'          ,nullable:false      ,title:'Signo'   },
            {name: 'denominacion'    ,typeName:'text'                               ,title:'Denominación'   },
            {name: 'orden'           ,typeName:'integer'                               },
        ],
        primaryKey:['signo']
    },context);
}