"use strict";

module.exports = function(context){
    var puedeEditar = context.user.usu_rol === 'ingresador'  || context.user.usu_rol ==='admin'  || context.user.usu_rol ==='programador';
    return context.be.tableDefAdapt({
        name:'tabulados_variables',
        editable: puedeEditar,
        allow:{
            insert:false,
            delete:false,
            update:puedeEditar,
        },
        fields: [
            {name: 'indicador'                  ,typeName:'text'    ,nullable:false,allow:{update:false}},
            {name: 'cortantes'                  ,typeName:'jsonb'   ,nullable:false,allow:{update:false}},
            {name: 'variable'                   ,typeName:'text'    ,nullable:false,allow:{update:false}},
            {name: 'ubicacion_tabulado'         ,typeName:'text'    },
            {name: 'orden_tabulado'             ,typeName:'integer' },
            {name: 'ubicacion_tabulado_serie'   ,typeName:'text'    },
            {name: 'orden_tabulado_serie'       ,typeName:'integer' },
            {name: 'ubicacion_grafico'          ,typeName:'text'    },
            {name: 'ubicacion_grafico_serie'    ,typeName:'text'    },
        ],
        primaryKey:['indicador','cortantes','variable'],
        foreignKeys:[{references:'tabulados', fields:['indicador','cortantes']},
                    {references:'indicadores_variables'   , fields:['indicador','variable' ]} ],
        constraints:[
            {constraintType:'check' , consName:"valor invalido en ubicacion_tabulado", expr:"ubicacion_tabulado in ('fil', 'col')"},
            {constraintType:'check' , consName:"valor invalido en ubicacion_grafico" , expr:"ubicacion_grafico in ('fil', 'col','z')"},
            {constraintType:'check' , consName:"valor invalido en ubicacion_tabulado_serie", expr:"ubicacion_tabulado_serie in ('fil', 'col')"},
            {constraintType:'check' , consName:"valor invalido en ubicacion_grafico_serie" , expr:"ubicacion_grafico_serie in ('fil', 'col','z')"},
        ]
    },context);
}