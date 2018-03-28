"use strict";

module.exports = function(context){
    var puedeEditar = context.user.usu_rol === 'ingresador'  || context.user.usu_rol ==='admin'  || context.user.usu_rol ==='programador';
    return context.be.tableDefAdapt({
        name:'um',
        editable: puedeEditar,
        fields: [
            {name: 'um'           ,typeName:'text'        ,nullable:false},
            {name: 'denominacion' ,typeName:'text'      },
            {name: 'descripcion'  ,typeName:'text'      },
            {name: 'nota_pie'     ,typeName:'text'      },
        ],
        primaryKey:['um'],
        detailTables:[
            {table: 'indicadores', fields:['um'], abr:'I', label:'indicadores'}
        ]
    },context);
}