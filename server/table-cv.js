
module.exports = function(context){
    var puedeEditar = context.user.usu_rol === 'ingresador'  || context.user.usu_rol ==='admin'  || context.user.usu_rol ==='programador';
    return context.be.tableDefAdapt({
        name:'cv',
        editable: puedeEditar,
        fields: [
            {name: 'cv'           ,typeName:'text'          ,nullable:false},
            {name: 'denominacion'      ,typeName:'text'     },
            {name: 'descripcion'       ,typeName:'text'     },
            {name: 'orden'             ,typeName:'integer'  },
        ],
        primaryKey:['cv'],
        detailTables:[
            {table: 'valores', fields:['cv'], abr:'V', label:'valores'}
        ]
    },context);
}