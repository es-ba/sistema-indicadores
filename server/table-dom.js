"use strict";

module.exports = function(context){
    var puedeEditar = context.user.usu_rol === 'ingresador'  || context.user.usu_rol ==='admin'  || context.user.usu_rol ==='programador';
    return context.be.tableDefAdapt({
        name:'dom',
        editable: puedeEditar,
        fields: [
            {name: 'dom'             ,typeName:'text'          ,nullable:false},
            {name: 'denominacion'    ,typeName:'text'          },
            {name: 'descripcion'     ,typeName:'text'          },
            {name: 'orden'           ,typeName:'integer'       },
        ],
        primaryKey:['dom'],
        detailTables:[
            {table: 'valores', fields:['dom'], abr:'V', label:'valores'}
        ]
    },context);
}