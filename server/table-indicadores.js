"use strict";

module.exports = function(context){
    var puedeEditar = context.user.usu_rol === 'ingresador'  || context.user.usu_rol ==='admin'  || context.user.usu_rol ==='programador';
    return context.be.tableDefAdapt({
        name:'indicadores',
        editable: puedeEditar,
        fields: [
            {name:'dimension'                , label:'Dimensión'                             , typeName:'text' },
            {name:'indicador'                , label:'Código indicador'                      , typeName:'text' ,nullable:false},
            {name:'denominacion'             , label:'Denominación'                          , typeName:'text' },
            {name:'orden'                    , label:'Orden'                                 , typeName:'integer' },
            {name:'variable_principal'       , label:'Variable principal'                    , typeName:'text'  , defaultValue:'n'},
            {name:'fte'                      , label:'Fuente'                                , typeName:'text'},
            {name:'um'                       , label:'Unidad de medida'                      , typeName:'text'},
            {name:'universo'                 , label:'Universo'                              , typeName:'text'},
            {name:'def_con'                  , label:'Definición conceptual'                 , typeName:'text'},
            {name:'def_ope'                  , label:'Definición operativa'                  , typeName:'text'},
            {name:'cob'                      , label:'Cobertura'                             , typeName:'text'},
            {name:'desagregaciones'          , label:'Desagregaciones'                       , typeName:'text'},
            {name:'uso_alc_lim'              , label:'Uso - Alcance - Limitaciones'          , typeName:'text'},
            {name:'decimales'                , label:'Cantidad decimales'                    , typeName:'integer'},
            {name:'nohabilitados'            , label:'Tabulado no habilitado'                , typeName:'jsonb', allow:{update:false}},
            {name:'con_nota_pie'             , label:'Con nota al pie'                       , typeName:'boolean'},
            {name:'despliegue_especial'      , label:'Despligue especial'                    , typeName:'boolean'},
            {name:'var_despliegue_especial'  , label:'var de despliegue esp'                 , typeName:'text'},
            {name:'icono'                    , label:'Archivo contenedor del Icono ODS'      , typeName:'text'},
            {name:'metas'                    , label:'Metas'                                 , typeName:'text'},
            {name:'ods'                      , label:'ODS'                                   , typeName:'text'},
            {name:'ocultar'                  , label:'ocultar indicador'                     , typeName:'boolean'},
            {name:'especial_principal'       , label:'Valor especial en principal'           , typeName:'boolean', defaultValue:false},
            {name:'denominacion_principal'   , label:'Denominacion indicador en principal'   , typeName:'text'},
            {name:'corte_principal'          , label:'Variable en principal'                 , typeName:'text'},
            {name:'valor_principal'          , label:'Categoria en principal'                , typeName:'text'},
            {name:'grafico_principal'        , label:'Se muestra gráfico en el principal'    , typeName:'boolean', defaultValue:false},
            {name:'annios_ocultables'        , label:'ocultar annios distinto de 0 o 5'      , typeName:'boolean', defaultValue:false},
            {name:'nuevo'                    , label:'nuevo'                                 , typeName:'boolean', defaultValue:false},
        ],
        primaryKey:['indicador'],
        foreignKeys:[{references:'dimension', fields:['dimension']},
            {references:'fte'  , fields:['fte']},
            {references:'um'   , fields:['um']}
        ],
        detailTables:[
            {table: 'valores', fields:[{source:'indicador', target:'indicador'}], abr:'V', label:'valores'},
            {table: 'tabulados', fields:[{source:'indicador', target: 'indicador'}], abr: 'T', label: 'tabulados'}
        ]
    },context);
}