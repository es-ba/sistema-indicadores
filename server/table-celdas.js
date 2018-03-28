"use strict";

module.exports = function(context){
    return context.be.tableDefAdapt({
        name:'celdas',
        editable: false,
        fields: [
            /* CUIDADO CON EL ORDEN, DEBE SER EL MISMO QUE ESTÁ EN EL INSERT DE TRIGGER valores_cortes ...\yeah\fuentes\node\sigba\install\para-install.sql */
            {name:'indicador'      ,               label:'Código indicador'                      , typeName:'text' ,nullable:false},
            {name:'cortes'         ,isSlicer:true, label:'Cortes'                                , typeName:'jsonb', allow:{select: true,insert:false, update:false}},
            {name:'valor'          ,               label:'Valor'                                 , typeName:'text'},
            {name:'cv'             ,               label:'Coeficiente de variación'              , typeName:'text'},
            {name:'num'            ,               label:'Numerador'                             , typeName:'text'},
            {name:'dem'            ,               label:'Denominador'                           , typeName:'text'},
            {name:'cortantes'      ,isSlicer:true, label:'Cortantes'                             , typeName:'jsonb', allow:{select: true,insert:false, update:false}},
            {name:'usu_validacion'                                                               , typeName:'text' , allow:{select: true,insert:false, update:false}},
            {name:'fecha_validacion'                                                             , typeName:'timestamp', allow:{select: true,insert:false, update:false}},
            {name:'origen_validacion'                                                            , typeName:'text'     , allow:{select: true,insert:false, update:false}},
            {name:'es_automatico'                                                                , typeName:'boolean'  , allow:{select: true,insert:false, update:false}}
        ],
        slicerField:'cortes',
        primaryKey:['indicador','cortes'], // poner acá el autonumérico
        foreignKeys:[
            {references:'indicadores', fields:['indicador']},
            {references:'valores', fields:['indicador', 'cortes'], onDelete:'cascade'},
        ]
    },context);
}