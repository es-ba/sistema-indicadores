"use strict";

module.exports = function(context){
    var puedeEditar = context.user.usu_rol ==='ingresador'  || context.user.usu_rol ==='admin'  || context.user.usu_rol ==='programador' // */;
    var admin = context.user.usu_rol ==='admin'  || context.user.usu_rol ==='programador' // */;
    return context.be.tableDefAdapt({
        name:'parametros',
        allow:{
            update: admin,
        },
        fields:[
            {name:'unique_row'         , label:'Fila Única'        , typeName:'boolean' , nullable:false },
            {name:'nombre_principal'   , label:'Nombre del Home'   , typeName:'text'                     },
            {name:'cortante_principal' , label:'Cortante del Home' , typeName:'text'    , nullable:false },
        ],
        primaryKey:['unique_row'],
        constraints:[
            {constraintType:'check', expr:'unique_row'}
        ]
    },context);
}