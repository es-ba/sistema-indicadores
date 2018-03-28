"use strict";

module.exports = function(context){
    var puedeEditar = context.user.usu_rol === 'ingresador'  || context.user.usu_rol ==='admin'  || context.user.usu_rol ==='programador';
    return context.be.tableDefAdapt({
        name:'diferencia_totales',
        editable: false,
        fields:[
            {name:'val'          ,title:'valor manual'     , typeName:'text'    },
            {name:'val_cal'      ,title:'valor automático' , typeName:'text'    },
            {name:'denominacion'                           , typeName:'text'    },
            {name:'indicador'                              , typeName:'text'    },
            {name:'cortes'                                 , typeName:'jsonb'   },
        ],
        primaryKey:['val','cortes'],
        sql:{
            isTable:false
        }
    },context);
}
