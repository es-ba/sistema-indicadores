"use strict";

module.exports = function(context){
    var puedeEditar = context.user.usu_rol === 'ingresador'  || context.user.usu_rol ==='admin'  || context.user.usu_rol ==='programador';
    return context.be.tableDefAdapt({
        name:'totales_calculados',
        editable: puedeEditar,
        //allow:{
        //    insert:true,
        //    delete:true
        //},    
        fields: [
            {name: 'indicador'            ,typeName:'text'   },
            {name: 'cortante'             ,typeName:'jsonb'  },
            {name: 'corte'                ,typeName:'jsonb'  },
            {name: 'valor_sum'            ,typeName:'decimal'},
            {name: 'valor_sum_esp'        ,typeName:'text'   },
        ],
        primaryKey:['indicador','corte'],
    },context);
}