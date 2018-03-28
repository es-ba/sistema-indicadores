"use strict";

module.exports = function(context){
    var puedeEditar = context.user.usu_rol === 'ingresador'  || context.user.usu_rol ==='admin'  || context.user.usu_rol ==='programador';
    return context.be.tableDefAdapt({
        name: 'tabulados',
        editable: puedeEditar,
        allow:{
            insert:false,
            update:puedeEditar,
        },
        fields: [
            {name:'indicador'                  , label:'Código indicador', typeName:'text'     , allow:{ update:false}},
            {name:'cortantes'                  , label:'Cortantes'       , typeName:'jsonb'    , allow:{ update:false}},
            {name:'habilitado'                 , label:'Habilitado'      , typeName:'boolean'  , defaultValue:true},
            {name:'invalido'                   , label:'Inválido'        , typeName:'boolean'  , defaultValue:false},
            {name:'mostrar_cuadro'             , label:'Mostrar Cuadro'  , typeName:'boolean'  , defaultValue:true, visible:false},
            {name:'mostrar_grafico'            , label:'Mostrar Gráfico' , typeName:'boolean'  , defaultValue:true},
            {name:'tipo_grafico'               , label:'Tipo Gráfico'    , typeName:'text'     , defaultValue:'linea', },
            {name:'orientacion'                , label:'Orientación'     , typeName:'text'     , defaultValue:'horizontal'},
            {name:'apilado'                    , label:'Apilado'         , typeName:'boolean'  , defaultValue:'false'},
            {name:'tabulado_principal'         , label:'Se muestra tabulado en el principal'   , typeName:'boolean'  , defaultValue:'false'},
            {name:'principal_es_serie'         , label:'En principal se muestra serie'         , typeName:'boolean'  , defaultValue:'false'},
            {name:'denominacion'               , label:'Denominación'    , typeName:'text'     },
            {name:'nota_pie'                   , label:'Nota al pie'     , typeName:'text'     },
        ], 
        primaryKey:['indicador','cortantes'],
        foreignKeys:[
            {references:'indicadores', fields:['indicador']},
        ],
        constraints:[
            {constraintType:'check' , consName:"tipo de gráfico", expr:"tipo_grafico in ('linea', 'barra', 'piramide')"},
            {constraintType:'check' , consName:"orientación", expr:"orientacion in ('horizontal', 'vertical')"},
        ],
        detailTables:[
            {table: 'valores', fields:['indicador', 'cortantes'], abr:'V', label:'valores'}
        ]
    },context);
}