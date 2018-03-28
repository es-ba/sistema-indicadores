"use strict";

module.exports = function(context){
    var puedeEditar = context.user.usu_rol === 'ingresador'  || context.user.usu_rol ==='admin'  || context.user.usu_rol ==='programador';
    return context.be.tableDefAdapt({
        name:'fte',
        editable: puedeEditar,
        fields: [
            {name: 'fte'             ,typeName:'text'          ,nullable:false},
            {name: 'denominacion'    ,typeName:'text'          },
            {name: 'descripcion'     ,typeName:'text'          },
            {name: 'graf_ult_annios' ,typeName:'boolean'       },
            {name: 'graf_cada_cinco' ,typeName:'boolean'       },
        ],
        primaryKey:['fte'],
        detailTables:[
            {table: 'indicadores', fields:['fte'], abr:'I', label:'indicadores'}
        ]
    },context);
}