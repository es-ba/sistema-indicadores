"use strict";

module.exports = function(context){
    var puedeEditar = context.user.usu_rol === 'ingresador'  || context.user.usu_rol ==='admin'  || context.user.usu_rol ==='programador';
    var be=context.be;
    return be.tableDefAdapt({
        name:'valores',
        editable: puedeEditar,
        fields: [
            {name: 'indicador'     ,               label:'Código indicador'                      , typeName:'text' ,nullable:false},
        ].concat(be.variablesDinamicas||[]).concat([
            
            {name:'valor'          ,               label:'Valor'                                 , typeName:'decimal'},
            {name:'valor_esp'          ,           label:'Valor especial'                        , typeName:'text'   },
            {name:'cv'                 ,           label:'coeficiente de variación'              , typeName:'text'   },
            {name:'num'                ,           label:'Numerador'                             , typeName:'text'   },
            {name:'dem'                ,           label:'Denominador'                           , typeName:'text'   },
            {name:'cortes'         ,isSlicer:true, label:'Cortes'                                , typeName:'jsonb', nullable:true, allow:{select: true,insert:false, update:false}},
            {name:'cortantes'      ,isSlicer:true, label:'Cortantes'                             , typeName:'jsonb'    , allow:{select: true,insert:false, update:false}},
            {name:'usu_validacion'                                                               , typeName:'text'     , allow:{select: true,insert:false, update:false}},
            {name:'fecha_validacion'                                                             , typeName:'timestamp', allow:{select: true,insert:false, update:false}},
            {name:'origen_validacion'                                                            , typeName:'text'     , allow:{select: true,insert:false, update:false}},
            {name:'es_automatico'                                                                , typeName:'boolean'  , allow:{select: true,insert:false, update:false}},
        ]),
        slicerField:'cortes',
        primaryKey:['indicador','cortes'], // poner acá el autonumérico
        //constraints: [
        //    { constraintType: 'check', consName:'la columna valor no debe contener comas', expr: "valor not like '%,%'" },
        //],
        foreignKeys:[
            {references:'indicadores'      , fields:['indicador']},
        ]
    },context);
}