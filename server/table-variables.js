"use strict";

module.exports = function(context){
    var puedeEditar = context.user.usu_rol === 'ingresador'  || context.user.usu_rol ==='admin'  || context.user.usu_rol ==='programador';
    return context.be.tableDefAdapt({
        name:'variables',
        editable: puedeEditar,
        allow:{
            insert:true,
            delete:true
        },    
        fields: [
            {name: 'variable'             ,typeName:'text'   ,nullable:false},
            {name: 'denominacion'         ,typeName:'text'   },
            {name: 'corte'                ,typeName:'boolean',allow:{select:false}, defaultValue:true},
            {name: 'orden'                ,typeName:'integer'},
            {name: 'estado_tabla_valores' ,typeName:'text'   ,allow:{select:false}, defaultValue:'nueva'},
        ],
        primaryKey:['variable'],
        detailTables:[
            {table:'cortes', fields:['variable'], abr:'C', label:'cortes'},
        ],
        constranints:[
            {constraintType:'check', consName:'nueva o quitar', expr:"estado_tabla_valores in ('nueva','quitar')"}
        ],
        sql:{
            logicalDeletes:{
                fieldName:'estado_tabla_valores',
                valueToDelete:'quitar'
            },
            where:"corte",
        }
    },context);
}