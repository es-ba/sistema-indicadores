"use strict";

module.exports = function(context){
    var puedeEditar = context.user.usu_rol === 'ingresador'  || context.user.usu_rol ==='admin'  || context.user.usu_rol ==='programador';
    return context.be.tableDefAdapt({
        name:'agrupacion_principal',
        editable: puedeEditar,
        fields: [
            {name: 'agrupacion_principal'         ,typeName:'text'          ,nullable:false         },
            {name: 'denominacion'    ,typeName:'text'                                  },
            {name: 'orden'           ,typeName:'integer'                               },
            {name: 'descripcion'     ,typeName:'text'                                  },
            {name: 'leyes'           ,typeName:'text'          ,label:'Leyes asociadas'},
            {name: 'ocultar'         ,typeName:'boolean'                               },
            {name: 'color'           ,typeName:'text'                                  },
            {name: 'icono'           ,typeName:'text'                                  },
        ],
        primaryKey:['agrupacion_principal'],
        detailTables:[
            {table: 'dimension', fields:['agrupacion_principal'], abr:'Di', label:'dimension'}
        ]
    },context);
}