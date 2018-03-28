"use strict";

module.exports = function(context){
    var puedeEditar = context.user.usu_rol === 'ingresador'  || context.user.usu_rol ==='admin'  || context.user.usu_rol ==='programador';
    return context.be.tableDefAdapt({
        name:'dimension',
        editable: puedeEditar,
        fields: [
            {name: 'agrupacion_principal'      ,typeName:'text'      ,nullable:false},
            {name: 'dimension'    ,typeName:'text'      },
            {name: 'denominacion' ,typeName:'text'      },
            {name: 'orden'        ,typeName:'integer'   },
            {name: 'ocultar'      ,typeName:'boolean'   },
            {name: 'icono'        ,typeName:'text'      },
        ],
        primaryKey:['dimension'],
        foreignKeys:[{references:'agrupacion_principal', fields:['agrupacion_principal']}],
        detailTables:[
            {table: 'indicadores', fields:['dimension'], abr:'I', label:'indicadores'}
        ]
    },context);
}