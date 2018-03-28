"use strict";

module.exports = function(context){
    return context.be.tableDefAdapt({
        name:'cortes_celdas',
        editable: false,
        fields: [
            {name:'indicador'     ,               label:'Código indicador'         , typeName:'text' ,nullable:false},
            {name:'cortes'        ,isSlicer:true, label:'Cortes'                   , typeName:'jsonb', allow:{select: true,insert:false, update:false}},
            {name:'variable'      ,               label:'Coeficiente de variación' , typeName:'text'},
            {name:'valor_corte'   ,               label:'Numerador'                , typeName:'text'},
        ],
        slicerField:'cortes',
        primaryKey:['indicador','cortes', 'variable'], // poner acá el autonumérico
        foreignKeys:[
            {references:'celdas'                  , fields:['indicador', 'cortes'], onDelete:'cascade'},
            {references:'cortes'                  , fields:['variable', 'valor_corte']},
            {references:'indicadores_variables'   , fields:['indicador','variable' ], onDelete:'cascade'}
        ]
    },context);
}
