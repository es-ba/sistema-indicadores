"use strict";

module.exports = function(context){
    var puedeEditar = context.user.usu_rol === 'ingresador'  || context.user.usu_rol ==='admin'  || context.user.usu_rol ==='programador';
    return context.be.tableDefAdapt({
        name:'indicadores_variables',
        editable: puedeEditar,
        fields: [
            {name: 'indicador'    ,typeName:'text'      ,nullable:false},        
            {name: 'variable'     ,typeName:'text'      ,nullable:false},
            {name: 'ctrl_totales' ,typeName:'text'  /*, label: 'control totales'*/},
            {name: 'ubicacion'    ,typeName:'text'      },
            {name: 'orden'        ,typeName:'integer'   },
        ],
        primaryKey:['indicador','variable'],
        foreignKeys:[{references:'indicadores'    , fields:['indicador']},
                    {references:'variables'       , fields:['variable' ]} ],
        constraints:[
            {constraintType:'check' , consName:"valor invalido en ubicacion", expr:"ubicacion in ('fil', 'col')"},
        ]
    },context);
}