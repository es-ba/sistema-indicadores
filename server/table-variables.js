"use strict";

module.exports = function(context){
    var puedeEditar = context.user.usu_rol === 'ingresador'  || context.user.usu_rol ==='admin'  || context.user.usu_rol ==='programador';
    return context.be.tableDefAdapt({
        name:'variables',
        editable: puedeEditar,
        allow:{
            insert:true,
            delete:false
        },    
        fields: [
            {name: 'variable'       ,typeName:'text'   ,nullable:false},
            {name: 'denominacion'   ,typeName:'text'   },
            {name: 'corte'          ,typeName:'boolean'},
            {name: 'orden'          ,typeName:'integer'},
        ],
        primaryKey:['variable'],
        detailTables:[
            {table:'cortes', fields:['variable'], abr:'C', label:'cortes'},
        ],
    },context);
}