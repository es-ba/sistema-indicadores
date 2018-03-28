"use strict";

module.exports = function(context){
    var puedeEditar = context.user.usu_rol === 'ingresador'  || context.user.usu_rol ==='admin'  || context.user.usu_rol ==='programador';
    return context.be.tableDefAdapt({
        name:'variables_principales',
        editable: puedeEditar,
        fields: [
            {name:'variable_principal' , label:'Variable en Principal'   , typeName:'text'    },
            {name:'orden'              , label:'Orden'                   , typeName:'integer' },
        ],
        primaryKey:['variable_principal'],
        foreignKeys:[
            {references:'variables', fields:[{source:'variable_principal', target:'variable'}]}
        ]
    },context);
}