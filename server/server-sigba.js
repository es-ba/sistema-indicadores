"use strict";

/*jshint eqnull:true */
/*jshint node:true */
/*eslint-disable no-console */

// APP

var Path = require('path');

var absolutePath = '';

function inlineLog(whatEver){
    console.log(whatEver);
    return whatEver;
}

if(process.argv[2]=='--dir'){
    process.chdir(process.argv[3]);
    console.log('cwd',process.cwd());
}

var FILASXGRAFICO=6;
var COLSPANRELLENO=9;


var {changing, spec, sameValues} = require('best-globals');
var backend = require("backend-plus");
var MiniTools = require("mini-tools");
var jsToHtml=require('js-to-html');
var html=jsToHtml.html;
var Tabulator = require('tabulator');//.Tabulator;
var tabulator = new Tabulator();
var likeAr = require('like-ar');
var fs=require('fs');

class AppSIGBA extends backend.AppBackend{
    constructor(){
        super();
    }
    configList(){
        return super.configList().concat([
            'def-config.yaml',
            'local-config.yaml'
        ]);
    }
    log(condition, f){
        if(new Date(this.config.log[condition])>new Date()){
            console.log(f());
        }
    }
    getProcedures(){
        var be = this;
        return super.getProcedures().then(function(procedures){
            return procedures.concat(
                require('./procedures-sigba.js').map(be.procedureDefCompleter, be)
            );
        });
    }
    decimalesYComa(stringValue,decimales,separador) {
        return !isNaN(Number(stringValue))?Number(stringValue).toFixed(decimales).toString().replace('.',separador):stringValue;
    }
    
    puntosEnMiles(value){
        var str=value;
        if(typeof value!='string'){
            str = value===null?'':value.toString();
        }
       return str.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    }
    // FALTA IMPLEMENTAR ESTO
    parametrosSistema(client){
        return Promise.resolve([]).then(function(){
            return client.query('SELECT * FROM parametros').fetchOneRowIfExists().then(function(result){
                return result.row
            });
        });
    }
    reporteBonito(client, defTables, annios, where,color,controles) {
        var be = this;
        var skin=be.config['client-setup'].skin;
        var skinUrl=(skin?skin+'/':'');
        var urlYClasesTabulados;
        if(!defTables.length){
            return Promise.resolve([]);
        }
        var table=defTables[0].tabla;
        return be.parametrosSistema(client).then(function(parametros){
            urlYClasesTabulados=parametros.nombre_principal;
            return client.query(
                'SELECT * FROM '+be.db.quoteIdent(table)+
                ' WHERE '+(where||'true')+
                ' ORDER BY '+(defTables[0].orderBy||["orden", "denominacion"]).map(function(campoOrden){ return be.db.quoteIdent(campoOrden); }).join(',')
            ).fetchAll();
        }).then(function(result){
            var tablaHija=(defTables[1]||{}).tabla;
            return Promise.all(result.rows.map(function(registro){
                if(defTables[0].color){
                        color=registro.agrupacion_principal;
                }
                var whereHija=(defTables[0].joinSiguiente||[]).map(function(nombreCampo){
                    return be.db.quoteIdent(nombreCampo)+" = "+be.db.quoteLiteral(registro[nombreCampo]);
                }).join(" and ").concat((defTables[0].condicion)?' and '+defTables[0].condicion:'');
                return be.reporteBonito(client, defTables.slice(1), annios, whereHija,color,controles).then(function(listaTrHijos){
                    var listaTd;
                    var result;
                    var paraFicha;
                    return client.query(
                        `SELECT  count(distinct cortantes) cant_cortantes 
                            FROM celdas 
                            WHERE indicador=$1`
                            ,[registro.indicador]
                    ).fetchOneRowIfExists().then(function(resultCortantes){
                        result=resultCortantes;
                        return client.query(`
                        SELECT i.dimension,i.indicador,i.denominacion,i.def_con,i.def_ope,i.cob,i.desagregaciones,i.uso_alc_lim,
                               i.universo,i.metas,f.denominacion fte,u.denominacion um,i.nuevo
                            FROM indicadores i LEFT JOIN fte f ON i.fte=f.fte LEFT JOIN um u ON u.um=i.um
                            WHERE i.indicador=$1
                            ORDER BY i.indicador,i.dimension
                        `,[registro.indicador]).fetchOneRowIfExists().then(function(resultado){
                            registro.ficha=resultado.row;
                    })}).then(function(){
                        listaTd=[
                            html.td({class:'td-'+urlYClasesTabulados+'-renglones',colspan:4-defTables.length},[html.div({class:'espacio-reserva'},'-')])
                        ].concat(
                            defTables[0].camposAMostrar.map(function(nombreCampo,i){
                                var id=registro[defTables[0].campoId];
                                var attributes={colspan:i?1:defTables.length+1+(defTables[0].tabla=='indicadores'?0:6),class:'campo_'+nombreCampo};
                                if(registro.nuevo){
                                    attributes["nuevo-registro"]='nuevo';
                                }
                                if(registro.indicador ){
                                    attributes.id=id;
                                    if(registro.def_con){
                                        attributes.title=registro.def_con;
                                    }
                                    var informacionIndicador=html.span({id:'ficha_'+registro.indicador,class:'info-indicador','ficha-indicador':JSON.stringify(registro.ficha)},[
                                        html.a({class:'link-info-indicador',href:''+absolutePath+''+urlYClasesTabulados+'-info-indicador?indicador='+registro.indicador,title:'Ficha técnica'},[
                                            html.img({class:'img-info-indicador', src:skinUrl+'img/img-info-indicador.png'})
                                        ]),
                                    ])
                                }
                                if(registro.agrupacion_principal ){
                                    if(registro.descripcion){
                                        attributes.title=registro.descripcion
                                    }
                                    var ley=registro.leyes;
                                    if(ley){
                                        var informacionAgrupacionPrincipal=html.span({id:'ley_'+registro.agrupacion_principal,class:'ley-agrupacion_principal'},[
                                            html.a({class:'link-ley-agrupacion_principal',href:''+absolutePath+''+urlYClasesTabulados+'-ley-agrupacion_principal?agrupacion_principal='+registro.agrupacion_principal,title:'Leyes'},[
                                                html.img({class:'img-ley-agrupacion_principal', src:skinUrl+'img/img-ley-agrupacion_principal.png'})
                                            ])
                                        ]);
                                    }
                                }
                                var sufijoTab=defTables[0].tabla||'';
                                var htmlIcono= html.span(
                                    {class:'span-img-icono'+sufijoTab},
                                    registro.icono?html.img({class:'img-icono-'+sufijoTab,src:skinUrl+'img/'+registro.icono}):null
                                );
                                var htmlA={class:'es-link'};
                                if(registro.indicador){
                                    htmlA.href=''+absolutePath+''+urlYClasesTabulados+'-indicador?indicador='+(registro.indicador||'');
                                    htmlA['cant-cortantes']=result.row.cant_cortantes;
                                }
                                return html.td(attributes,[
                                    htmlIcono,
                                    html.span({id:id, class:'ancla'},"\u00a0"),
                                    html.a(htmlA,registro.denominacion_principal?registro.denominacion_principal:registro[nombreCampo]),
                                    registro.indicador?informacionIndicador:null,
                                    registro.agrupacion_principal?informacionAgrupacionPrincipal:null
                                ]);
                            })
                        );
                    }).then(function(){
                        if(defTables[0].color){
                            color=registro.agrupacion_principal;
                        }
                        if(listaTrHijos.length==0 && defTables.length==3){
                            listaTrHijos=[html.tr({class:'renglon-vacio'},[
                                html.td({colspan:5,class:'renglon-vacio'}),
                                html.td({colspan:likeAr(annios).array().length,class:'renglon-vacio'})])];
                        }
                        var recienElegido;
                        var obtenerValoresPrincipal=Promise.resolve([]);
                        var annioPrincipal;
                        if(table==='indicadores'){
                            var listaTdValores=[];
                            var ultimoAnnioDisponible;
                            if(be.hayCortantePrincipal){
                                var cortantesEnPrincipalObj;
                            }
                            obtenerValoresPrincipal=client.query(
                                `select max(cortes->>'annio') annio from celdas where indicador=$1`,[registro.indicador]
                            ).fetchOneRowIfExists().then(function(result){
                                ultimoAnnioDisponible=result.row.annio;
                                cortantesEnPrincipalObj={
                                    variablesPrincipal:[{"annio":true}],
                                    cortes:[{"annio":ultimoAnnioDisponible}]
                                };
                                if(be.hayCortantePrincipal){
                                    be.cortantesEnPrincipal.cortantesPrincipalesArr.forEach(function(variable){
                                        var variablePrincipal={"annio":true};
                                        variablePrincipal[variable.variable_principal]=true;
                                        cortantesEnPrincipalObj.variablesPrincipal.push(variablePrincipal);
                                    })
                                }
                                if(registro.indicador && registro.corte_principal){
                                    var test={}
                                    test[registro.corte_principal]=registro.valor_principal;
                                    cortantesEnPrincipalObj.cortes.push(test)
                                    cortantesEnPrincipalObj.variablesPrincipal=cortantesEnPrincipalObj.variablesPrincipal.map(function(cortPrinc){
                                        cortPrinc[registro.corte_principal]=true;
                                        return cortPrinc;
                                    })
                                }
                                
                            }).then(function(){
                                var sqlPrincipal=`
                                    SELECT indicador,cortes,coalesce(valor::text,valor_esp) valor,cv,num,dem,cortantes,usu_validacion,
                                           fecha_validacion,origen_validacion,es_automatico,valor_esp 
                                        FROM celdas 
                                        WHERE indicador=$1 AND cortantes in ( `+
                                        cortantesEnPrincipalObj.variablesPrincipal.map(function(crt){
                                            return be.db.quoteLiteral(JSON.stringify(crt));
                                        }).join(',')+") AND "+cortantesEnPrincipalObj.cortes.map(function(crt,i){
                                            for(var key in crt){
                                                return "cortes->> "+be.db.quoteNullable(key)+" = "+be.db.quoteNullable(crt[key]);
                                            }
                                        }).join(' AND ');
                                return client.query(
                                    sqlPrincipal
                                    ,[registro.indicador]
                                ).fetchAll().then(function(result){
                                    var filasValoresAPrincipal=result.rows;
                                    var valCeldasPrincipal=[];
                                    var indiceCeldasPrincipal={'null': 0};
                                    valCeldasPrincipal[indiceCeldasPrincipal['null']]={valor:null};
                                    if(be.hayCortantePrincipal){
                                        be.cortantesEnPrincipal.categoriasPrincipalArr.forEach(function(categoria,i){
                                            indiceCeldasPrincipal[categoria.valor]=i+1; 
                                            valCeldasPrincipal[i+1]={valor:null};
                                        });
                                    
                                        var crtPrincArr=be.cortantesEnPrincipal.cortantesPrincipalesArr.map(function(crt){
                                                return crt.variable_principal;
                                        });
                                        filasValoresAPrincipal.forEach(function(filaAPrincipal){
                                            var test=Object.keys(filaAPrincipal.cortes).some(function(element){
                                                return crtPrincArr.indexOf(element)>=0
                                            });
                                            be.cortantesEnPrincipal.cortantesPrincipalesArr.forEach(function(variable){
                                                var posicionCeldas;
                                                if(!test){
                                                    posicionCeldas='null';
                                                }else{
                                                    posicionCeldas=filaAPrincipal.cortes[variable.variable_principal];
                                                }
                                                valCeldasPrincipal[indiceCeldasPrincipal[posicionCeldas]]=filaAPrincipal;
                                            });
                                        });
                                    }else{
                                        if(filasValoresAPrincipal[0]){
                                            valCeldasPrincipal[indiceCeldasPrincipal['null']]=filasValoresAPrincipal[0];
                                        }
                                    }
                                    annioPrincipal=ultimoAnnioDisponible;
                                    listaTdValores.push(html.td({class:'td-valores'},annioPrincipal));
                                    return valCeldasPrincipal;
                                }).then(function(valoresPrincipal){
                                    valoresPrincipal.forEach(function(valorPrincipal){
                                        var indicadorAnnio;
                                        var valorReporteBonito=
                                            (valorPrincipal.valor==null)?
                                            '///':
                                            be.puntosEnMiles(be.decimalesYComa(valorPrincipal.valor,registro.decimales,','));
                                        listaTdValores.push(html.td({class:'td-valores'},valorReporteBonito));
                                    })
                                    controles.filasEnDimension[registro.dimension]=controles.filasEnDimension[registro.dimension]||[];
                                    if(!controles.elegidoEnDimension[registro.dimension] && registro.grafico_principal){
                                        listaTdValores.push(html.td({class:'sennial-indicador-elegido-grafico'}));
                                        controles.elegidoEnDimension[registro.dimension]=true;
                                        controles.posicionEnDimension[registro.dimension]=controles.filasEnDimension[registro.dimension].length;
                                        recienElegido=true;
                                    }else{ 
                                        listaTdValores.push(html.td({class:'sin-sennial-indicador-elegido-grafico'}));
                                    }
                                    return listaTdValores;
                                })
                            })
                        }
                        return obtenerValoresPrincipal.then(function(listaDeseada){
                            var estaFila=html.tr(
                                {class:'nivel-titulo',"nivel-titulo": defTables.length, "color-agrupacion_principal":color||'otro'},
                                listaTd.concat(listaDeseada)
                            )
                            var obtenerTabuladoPrincipal=Promise.resolve([]);
                            if(table==='indicadores'){
                                controles.filasEnDimension[registro.dimension].push(estaFila);
                                if(recienElegido){
                                    obtenerTabuladoPrincipal=client.query(
                                        `SELECT * from tabulados WHERE indicador=$1 AND tabulado_principal IS TRUE`,
                                        [registro.indicador]
                                    ).fetchOneRowIfExists().then(function(result){
                                        if(result.row){
                                            var annioPrincipalTabulado=result.row.principal_es_serie?annioPrincipalTabulado:annioPrincipal;
                                            var cortantes=result.row.cortantes;
                                            var cantidad_cortantes=Object.keys(cortantes).length;
                                            var tabulado={
                                                indicador:registro.indicador,
                                                cortantes:cortantes,
                                                cantidad_cortantes:cantidad_cortantes
                                            }
                                            return be.traerInfoTabulado(client,registro.indicador, annioPrincipal,tabulado).then(function(tabulado){
                                                return be.armaMatrices(client, tabulado,annioPrincipalTabulado, registro.indicador)
                                            }).then(function(matrix){
                                                var matrixGrafico=matrix.matrixGraf;
                                                return be.traeInfoMatrix(client,registro.indicador).then(function(infoMatrixGraf){
                                                    tabulado=changing(tabulado,infoMatrixGraf);
                                                    /* TODO: si hay dos gráficos en la misma dimensión hay que controlar también en qué lugar
                                                             se agregó el último gráfico
                                                    */
                                                    var dondeAgregar=Math.max(0, controles.posicionEnDimension[registro.dimension]-FILASXGRAFICO)
                                                    var filasEnEstaDimension=controles.filasEnDimension[registro.dimension];
                                                    var renglonesDeRelleno=0;
                                                    if(filasEnEstaDimension.length<FILASXGRAFICO){
                                                        /* que este valor sea igual al height de [nivel-titulo=1] */
                                                        var renglonesDeRelleno=(FILASXGRAFICO-filasEnEstaDimension.length-1);
                                                        var alturaDelRelleno=55*(FILASXGRAFICO-filasEnEstaDimension.length-1);
                                                    }
                                                    controles.filasEnDimension[registro.dimension][
                                                        dondeAgregar
                                                    ].content.push(html.td({
                                                        rowspan:FILASXGRAFICO-renglonesDeRelleno, 
                                                        class:'box-grafico-principal',
                                                    },html.div({
                                                        class:'tabulado-html',
                                                        'para-graficador':JSON.stringify(matrixGrafico),
                                                        'info-tabulado':JSON.stringify(tabulado)
                                                    })));
                                                    /* la siguente condición vale solo si se puede poner un gráfico por dimensión */
                                                    if(filasEnEstaDimension.length<FILASXGRAFICO){
                                                        if(!be.hayCortantePrincipal){
                                                            COLSPANRELLENO=7;
                                                        }
                                                        filasEnEstaDimension[controles.filasEnDimension[registro.dimension].length-1].content.push(
                                                            html.tr({
                                                                class:'nivel-titulo',
                                                                "nivel-titulo": defTables.length, 
                                                                "color-agrupacion_principal":color||'otro'
                                                            },[
                                                                html.td({class:'td-principal-renglones',colspan:COLSPANRELLENO},[html.div({style:'height:'+alturaDelRelleno+'px;'})])
                                                            ])
                                                        )
                                                    }
                                                    return matrixGrafico;
                                                })
                                            });
                                        }
                                    })
                                }
                            }
                            return obtenerTabuladoPrincipal.then(function(){
                                return [estaFila].concat(listaTrHijos);
                            })
                        })
                    })
                });
            })).then(function(listaDeListaTr){
                return [].concat.apply([], listaDeListaTr);
            });
        });
    }
    armaUnDatum(vDatum,client, fila,annio,indicador){
        var be=this;
        var variables=vDatum.variables;
        var ubicacion=vDatum.ubicacion;
        var denominacion=vDatum.denominacion;
        var datum=vDatum.datum;
        var usoSeteo=vDatum.usoSeteo;
        var cantVariablesCol=0;
        var armaVars= function armaVars(){
            var vars=[];
            var cambio_place={col:'top',fil:'left',z:'left'};
            for(var i=0;i<denominacion.length;i++){
                var atributos={
                    name: variables[i],
                    label:denominacion[i],
                    place:usoSeteo?cambio_place[ubicacion[i]]:((i===denominacion.length-1)?'top':'left'),
                }
                if(atributos.place=='top' && variables[i]!='annio'){cantVariablesCol++}
                
                if(ubicacion[i]=='z'){
                    atributos.isZ=true
                }
                vars.push(atributos);
            }
            return vars;
        };
        datum.vars=armaVars();
        return Promise.all(
            datum.vars.map(function(info){
                return (client.query(
                    "SELECT * FROM cortes c WHERE c.variable = $1 ORDER BY orden", [info.name]
                ).fetchAll().then(function(result){
                    var filaValores=result.rows
                    var vValores={};
                    filaValores.forEach(function(fila){
                        vValores[fila.valor_corte]={label:fila.denominacion,color:fila.color,signo_piramide:fila.signo_piramide}; 
                    });
                    vValores[null]={label:'TOTAL'};
                    return vValores;
                }));
            })
        ).then(function(valuesOfVars){
            datum.vars.forEach(function(variable,i){
                variable.values=valuesOfVars[i];
            });
        }).then(function(){
            return client.query(
                "SELECT "+ variables.map(function(varInv){
                    if(! /^\w+$/.test(varInv) ){
                        throw new Error("invalid varInv");
                    }
                    return 'cc_'+varInv+'.valor_corte '+varInv;
                }).join(',') +", coalesce(valor::text,valor_esp) valor, cv " + 
                    "\n  FROM celdas v  LEFT JOIN "+ variables.map(function(varInv){
                        return (" cortes_celdas cc_"+varInv +
                            " ON v.indicador=cc_"+varInv+".indicador AND v.cortes=cc_"+varInv+".cortes AND cc_"+varInv+".variable='"+varInv+"'" +
                            "\n LEFT JOIN cortes corte_"+varInv+" ON cc_"+varInv+".variable=corte_"+varInv+".variable AND cc_"+varInv+".valor_corte=corte_"+varInv+".valor_corte");
                    }).join('\n    LEFT JOIN ')+
                    "\n  WHERE v.indicador=$1 AND "+be.defs_annio(annio).cortantes+" <@ $2 AND "+be.defs_annio(annio).cond_annio_en_cortante+
                    "\n  ORDER BY " + variables.map(function(varInv){
                            return ((varInv!='annio')?'corte_'+varInv+'.orden NULLS FIRST':varInv+' desc');
                    }).join(' , '),
                be.defs_annio(annio).f_param_cortantes_posibles([indicador,fila.cortantes,annio])
            ).fetchAll().then(function(result){
                datum.list=result.rows;
                datum.vars.push({name:'valor', place:'data'});
                datum.vars.push({name:'cv', place:'data'});
                datum.list.forEach(function(row){
                    if(row.desagr=='tcaba'){
                        row.desagr=null;
                    }
                });
                datum.list=annio?result.rows.map(function(row){delete row.annio;return row;}):result.rows;
                datum.vars=annio?datum.vars.filter(e_var => e_var.name !=='annio'):datum.vars;
                datum.oneColumnTitle=(annio && cantVariablesCol==0)?annio:'';
            })
        })
    }
    armaMatrices(client, fila,annio,indicador){
        var be = this;
        return Promise.resolve().then(function(){
            var tab={
                datum:{},
                variables:fila.var_tab.split(','),
                ubicacion:fila.ubi_tab.split(','),
                denominacion:fila.denom_tab.split('|'),
                usoSeteo:fila.uso_seteo_iv||fila.uso_seteotab_tv
            }
            var graf={
                datum:{},
                variables:fila.var_graf.split(','),
                ubicacion:fila.ubi_graf.split(','),
                denominacion:fila.denom_graf.split('|'),
                usoSeteo:fila.uso_seteo_iv||fila.uso_seteograf_tv
            }
            return Promise.all([tab,graf].map(function(paraDatum){
                return be.armaUnDatum(paraDatum,client, fila,annio,indicador);
            })).then(function(){
                tabulator.defaultShowAttribute='valor';
                var matrixTab=tabulator.toMatrix(tab.datum);
                var matrixGraf=tabulator.toMatrix(graf.datum);
                return {matrixTab,matrixGraf,datum:tab.datum};
            })
        })
    }
    
    
    
    
    traeInfoMatrix(client,indicador){
        return client.query(
            `SELECT i.denominacion as i_denom ,i.con_nota_pie con_nota,f.fte as fte, f.denominacion as f_denom,
                    f.graf_ult_annios as graf_ult_annios, 
                    f.graf_cada_cinco as graf_cada_cinco, 
                    u.denominacion as u_denom,u.um as um,u.nota_pie nota_pie, i.decimales, i.annios_ocultables 
                FROM indicadores i 
                    LEFT JOIN fte f ON f.fte=i.fte 
                    LEFT JOIN um u ON u.um=i.um 
                WHERE indicador=$1`,
            [indicador]
        ).fetchOneRowIfExists().then(function(result){
            var infoIndicador=result.row;
            return {
                i_denom:infoIndicador.i_denom,
                con_nota:infoIndicador.con_nota,
                f_denom:infoIndicador.f_denom,
                u_denom:infoIndicador.u_denom,
                um_denominacion:infoIndicador.u_denom,
                um:infoIndicador.um,
                nota_pie:infoIndicador.nota_pie,
                decimales:infoIndicador.decimales,
                fte:infoIndicador.fte,
                graf_ult_annios:infoIndicador.graf_ult_annios,
                graf_cada_cinco:infoIndicador.graf_cada_cinco,
                annios_ocultables:infoIndicador.annios_ocultables,
            }
        })
    }
    
    
    
    
    anniosCortantes(client,annios,anniosA,indicador){
        var sql = "SELECT distinct valor_corte annio FROM cortes_celdas "+
            "WHERE variable = 'annio'"+ (indicador?" and indicador = $1": "")+
            "ORDER BY annio desc";
        return client.query(sql,indicador?[indicador]:[]).fetchAll().then(function(result){
            result.rows.forEach(function(row,i){
                annios[row.annio]=i;
                anniosA.push(row.annio);
            });
        });
    }
    cortantesPrincipal(client){
        var sql = "SELECT variable_principal FROM variables_principales ORDER BY orden";
        return client.query(sql).fetchAll().then(function(result){
            var cortantesPrincipalesArr=result.rows;
            return cortantesPrincipalesArr;
        }).then(function(cortantesPrincipalesArr){
            if(cortantesPrincipalesArr.length){
                return client.query(
                    "select valor_corte,denominacion,orden from cortes where variable=$1 order by orden",
                    [cortantesPrincipalesArr[0].variable_principal]
                ).fetchAll().then(function(result){
                    var categoriasPrincipalArr=result.rows.map(function(categorias){
                        return {valor:categorias.valor_corte,denominacion:categorias.denominacion}
                    });
                    return {cortantesPrincipalesArr,categoriasPrincipalArr};
                })
            }else{
                return false;
            }
        });
    }
    defs_annio(annio){
        if(annio){
            return {
                cortantes:"v.cortantes - 'annio'", 
                cond_cortantes_posibles:"cortes ->> 'annio' = $2", 
                cond_annio_en_cortante:" cc_annio.valor_corte=$3",
                f_param_cortantes_posibles: function(arra){return arra;}
            };
        }else{
            return {
                cortantes:'v.cortantes', 
                cond_cortantes_posibles:"TRUE", 
                cond_annio_en_cortante:"TRUE",
                f_param_cortantes_posibles: function(arra){return arra.slice(0,-1)}
            };
        }
    }
    esAdminSigba(req){
        return (req && req.user && (req.user.usu_rol=='admin'|| req.user.usu_rol=='programador') && req.user.active==true);
    }

    clientIncludes(req, hideBEPlusInclusions) {
        var ownIncludes=[
            { type: 'js', module: 'graphicator', path:'graphicator'},
            { type: 'js', module: 'best-globals', path:'best-globals'},
            { type: 'js', module: 'require-bro'},
            { type: 'js', module: 'codenautas-xlsx', modPath: 'dist', file:'xlsx.full.min.js'},
            { type: 'js', module: 'like-ar' },
            { type: 'js', module: 'file-saver' },
            { type: 'js', module: 'js-to-html' },
            { type: 'js', module: 'tabulator', path:'tabulator'},
            { type: 'css', module: 'c3' },
            { type: 'css', module: 'graphicator' }
        ]
        return ownIncludes.concat(super.clientIncludes(req, hideBEPlusInclusions));
    }

    headSigba(esPrincipal,req,title){
        var be=this;
        var esAdmin=be.esAdminSigba(req);
        var hideBEPlusInclusions = !this.esAdminSigba(req);
        var listaJS=be.clientModules(req, hideBEPlusInclusions).scripts.map(function(module){ return html.script(module); });
        listaJS.push(html.script({src:'menu-2.js'}));
        if(esAdmin){
            listaJS.push(html.script({src:'menu-3.js'}));
        }
        var listaHead=[
            html.meta({name:'viewport', content:'width=device-width'}),
            html.meta({name:'viewport', content:'initial-scale=1.0'}),
            html.title(title),
           // html.title(esPrincipal?'Tabulados':'Tabulado'),
            html.link({rel:"stylesheet", type:"text/css", href:"css/tabulados.css"}),
        ];
        if(this.config["client-setup"].css){
            listaHead.push(html.link({rel:"stylesheet", type:"text/css", href:"css/"+this.config["client-setup"].css}))
        }
        var listaCSS = be.csss(hideBEPlusInclusions);
        return html.head(listaHead.concat(listaJS).concat(listaCSS.map(function(css){
            return html.link({href: css, rel: "stylesheet"});
        })).concat(listaCSS.map(function(css){
            var skin=be.config['client-setup'].skin;
            var skinUrl=(skin?skin+'/':'');
            return esAdmin && skin?html.link({href: skinUrl+css, rel: "stylesheet"}):null;
        })));
    }
    mostrarError(admin,mensajeError,res){
        return res.send(html.div(admin?mensajeError:'').toHtmlText({pretty:true}));
    }
    
    traerInfoTabulado(client,indicador, annio,tabulado){
        var be=this;   
        var arr_cortantes=Object.keys(tabulado.cortantes)
        return client.query(
            "select string_agg(v.denominacion,'|' ORDER BY v.orden, v.variable) as denom_default, "+
                "string_agg(iv.variable, ',' ORDER BY v.orden, v.variable) AS var_default, "+
                "string_agg( iv.variable ,',' ORDER BY iv.ubicacion,iv.orden, iv.variable) AS var_iv, "+
                "string_agg(v.denominacion,'|' ORDER BY iv.ubicacion,iv.orden, iv.variable) as denom_iv, "+
                "string_agg( iv.ubicacion,',' ORDER BY iv.ubicacion,iv.orden, iv.variable) AS ubi_iv, "+
                "count(iv.ubicacion) AS cant_iv  "+
            "from indicadores_variables iv left join variables v on iv.variable=v.variable "+
            "where iv.indicador=$1 "+
            "and iv.variable in ("+arr_cortantes.map(function(cortante){return be.db.quoteLiteral(cortante)}).join(',')+")",
            [indicador]
        ).fetchOneRowIfExists().then(function(result){
            var rowInfo=result.row;
            tabulado.cant_iv=rowInfo.cant_iv;
            var uso_seteo_iv=rowInfo.cant_iv==tabulado.cantidad_cortantes;
            tabulado.uso_seteo_iv=uso_seteo_iv;
            tabulado.denom_tab=uso_seteo_iv?rowInfo.denom_iv:rowInfo.denom_default;
            tabulado.denom_graf=uso_seteo_iv?rowInfo.denom_iv:rowInfo.denom_default;
            tabulado.var_tab=uso_seteo_iv?rowInfo.var_iv:rowInfo.var_default; 
            tabulado.var_graf=uso_seteo_iv?rowInfo.var_iv:rowInfo.var_default; 
            tabulado.ubi_tab=uso_seteo_iv?rowInfo.ubi_iv:'';
            return tabulado;
        }).then(function(tabulado){
            return client.query(
            "SELECT "+
            "string_agg( tv.variable ,',' ORDER BY tv.ubicacion_tabulado,tv.orden_tabulado, tv.variable) AS var_tab_tv, "+
            "string_agg(v.denominacion,'|' ORDER BY tv.ubicacion_tabulado,tv.orden_tabulado, tv.variable) as denom_tab_tv, "+
            "string_agg( tv.ubicacion_tabulado,',' ORDER BY tv.ubicacion_tabulado,tv.orden_tabulado, tv.variable) AS ubi_tab_tv, "+
            "count(tv.ubicacion_tabulado) AS cant_tab_tv , "+
            "string_agg( tv.variable ,',' ORDER BY tv.ubicacion_tabulado_serie,tv.orden_tabulado_serie, tv.variable) AS var_tabserie_tv, "+
            "string_agg(v.denominacion,'|' ORDER BY tv.ubicacion_tabulado_serie,tv.orden_tabulado_serie, tv.variable) as denom_tabserie_tv, "+
            "string_agg( tv.ubicacion_tabulado_serie,',' ORDER BY tv.ubicacion_tabulado_serie,tv.orden_tabulado_serie, tv.variable) AS ubi_tabserie_tv, "+
            "count(tv.ubicacion_tabulado_serie) AS cant_tabserie_tv , "+
            "string_agg( tv.variable ,',' ORDER BY tv.ubicacion_grafico, tv.variable) AS var_graf_tv, "+
            "string_agg(v.denominacion,'|' ORDER BY tv.ubicacion_grafico, tv.variable) as denom_graf_tv, "+
            "string_agg( tv.ubicacion_grafico,',' ORDER BY tv.ubicacion_grafico, tv.variable) AS ubi_graf_tv, "+
            "count(tv.ubicacion_grafico) AS cant_graf_tv , "+
            "string_agg( tv.variable ,',' ORDER BY tv.ubicacion_grafico_serie, tv.variable) AS var_grafserie_tv, "+
            "string_agg(v.denominacion,'|' ORDER BY tv.ubicacion_grafico_serie, tv.variable) as denom_grafserie_tv, "+
            "string_agg( tv.ubicacion_grafico_serie,',' ORDER BY tv.ubicacion_grafico_serie, tv.variable) AS ubi_grafserie_tv, "+
            "count(tv.ubicacion_grafico_serie) AS cant_grafserie_tv "+
            "from tabulados_variables tv left join variables v on tv.variable=v.variable "+
            "where tv.indicador=$1 and tv.cortantes= $2 ",
            [indicador, tabulado.cortantes] ).fetchOneRowIfExists().then(function(result){
                var rowInfoTv=result.row;
                tabulado.cant_tab_tv=rowInfoTv.cant_tab_tv;
                tabulado.cant_tabserie_tv=rowInfoTv.cant_tabserie_tv;
                tabulado.cant_graf_tv=rowInfoTv.cant_graf_tv;
                tabulado.cant_grafserie_tv=rowInfoTv.cant_grafserie_tv;
                var uso_seteotab_tv=rowInfoTv.cant_tab_tv==tabulado.cantidad_cortantes;
                var uso_seteograf_tv=rowInfoTv.cant_graf_tv==tabulado.cantidad_cortantes;
                var uso_seteografserie_tv=rowInfoTv.cant_grafserie_tv==tabulado.cantidad_cortantes;
                var uso_seteotabserie_tv=rowInfoTv.cant_tabserie_tv==tabulado.cantidad_cortantes;
                tabulado.uso_tab_tv =annio?uso_seteotab_tv: uso_seteotabserie_tv;
                tabulado.uso_graf_tv=annio?uso_seteograf_tv: uso_seteografserie_tv;
                tabulado.denom_tab=uso_seteotab_tv?
                    (annio && uso_seteotabserie_tv? rowInfoTv.denom_tabserie_tv:rowInfoTv.denom_tab_tv)
                    :tabulado.denom_tab;
                tabulado.denom_graf=uso_seteograf_tv?
                    (annio && uso_seteografserie_tv? rowInfoTv.denom_grafserie_tv:rowInfoTv.denom_graf_tv)
                    :tabulado.denom_graf;
                tabulado.var_tab=uso_seteotab_tv?
                    (annio && uso_seteotabserie_tv? rowInfoTv.var_tabserie_tv:rowInfoTv.var_tab_tv)
                    :tabulado.var_tab; 
                tabulado.var_graf=uso_seteograf_tv?
                    (annio && uso_seteografserie_tv? rowInfoTv.var_grafserie_tv:rowInfoTv.var_graf_tv)
                    :tabulado.var_graf; 
                tabulado.ubi_tab=uso_seteotab_tv?
                    (annio && uso_seteotabserie_tv? rowInfoTv.ubi_tabserie_tv:rowInfoTv.ubi_tab_tv)
                    :tabulado.ubi_tab;
                tabulado.ubi_graf=uso_seteograf_tv?
                    (annio && uso_seteografserie_tv? rowInfoTv.ubi_grafserie_tv:rowInfoTv.ubi_graf_tv)
                :tabulado.ubi_tab;
                
                return tabulado;
            
            }).then(function(){
                return client.query(
                    "SELECT habilitado,mostrar_cuadro cuadro,mostrar_grafico grafico, tipo_grafico,orientacion,apilado "+
                    "FROM tabulados WHERE indicador=$1 AND cortantes=$2"
                ,[indicador,tabulado.cortantes]).fetchOneRowIfExists().then(function(result){
                    var caracteristicasTabulado=result.row;
                        tabulado.habilitado=caracteristicasTabulado.habilitado;
                        tabulado.cuadro=caracteristicasTabulado.cuadro;
                        tabulado.grafico=caracteristicasTabulado.grafico;
                        tabulado.tipo_grafico=caracteristicasTabulado.tipo_grafico;
                        tabulado.orientacion=caracteristicasTabulado.orientacion;
                        tabulado.apilado=caracteristicasTabulado.apilado;
                
                    return tabulado;
                })
            })
        });
    }
    servirTabuladoEspecifico(req, res, funEntregarDatos){
        var be=this;
        var annio=req.query.annio;
        var indicador=req.query.indicador;
        return be.inDbClient(req, function(client){
            var esAdmin=be.esAdminSigba(req);
            var usuarioRevisor=false; // true si tiene permiso de revisor
            var queryStr=
                "select indicador,c.cor cortantes , count(*) as cantidad_cortantes,c.count,c.var arr_cortantes from ( "+
                    "select indicador, cortantes cor,jsonb_object_keys(cortantes) cor_keys,count(*),ARRAY(select jsonb_object_keys(cortantes)) var  "+
                    "from celdas where indicador=$1 group by indicador, cortantes "+
                ") c group by indicador,cortantes, c.count,arr_cortantes order by cortantes"
            return client.query(queryStr, [indicador]).fetchAll().then(function(result){
                var tabuladosPorIndicador=result.rows
                return Promise.all(tabuladosPorIndicador.map(function(tabulado){
                    var arr_cortantes=tabulado.arr_cortantes
                    return be.traerInfoTabulado(client,indicador, annio,tabulado);
                })).then(function(){
                    var cortantesPosibles = tabuladosPorIndicador.filter(row => (row.habilitado || esAdmin));
                    if (cortantesPosibles.length > 1){
                        cortantesPosibles = cortantesPosibles.filter(row => row.cortantes != '{"annio":true}');
                    }
                    //parametro GET (CSV con todos los cortantes que hay que mostrar, lo cual define un tabulado) //cortantes por defecto son las del primer tabulado
                    var cortante = !req.query.cortante?JSON.stringify(cortantesPosibles[0].cortantes):req.query.cortante;
                    // tabulado que se va as mostrar
                    var fila = cortantesPosibles.filter(function(tabulado){
                        return sameValues(tabulado.cortantes, JSON.parse(cortante)); 
                    })[0];
                    return be.armaMatrices(client, fila, annio, indicador).then(function(matrices){
                        return funEntregarDatos(res, matrices, client, indicador, annio, fila, result, cortantesPosibles, cortante, esAdmin);
                    });
                });
            }).catch(MiniTools.serveErr(req,res));
        });
    }
    servirIndicadores(req, res, funEntregarDatos){
        var be = this;
        return be.inDbClient(req, function(client){
            var queryStr=`
                select d.dimension, i.indicador, i.denominacion , i.variable_principal, i.fte, i.um, i.universo, i.def_con, 
                        i.def_ope, i.cob, i.desagregaciones, i.uso_alc_lim, i.decimales, i.con_nota_pie, i.ods, i.especial_principal, i.denominacion_principal,
                        i.corte_principal, i.valor_principal, i.annios_ocultables, u.um, u.denominacion, u.descripcion, u.nota_pie, f.fte, f.denominacion, f.descripcion,
                        f.graf_ult_annios,f.graf_cada_cinco, d.denominacion, d.agrupacion_principal, ap.denominacion,
                        coalesce(tab.tabulados,array[]::text[]) as tabulados
                    from indicadores i left join dimension d using (dimension) left join agrupacion_principal ap using(agrupacion_principal) 
                        left join fte f using (fte) left join um u using (um) 
                        left join (select indicador,  array_agg(t.cortantes::text) as tabulados from indicadores i left join tabulados t using(indicador) where t.invalido =false and t.habilitado=true group by indicador) tab on tab.indicador=i.indicador
                    where i.ocultar is not false
            `
            return client.query(queryStr).fetchAll().then(function(result){
                var listaInd=result.rows;
                return funEntregarDatos(res,listaInd)
            })
        })
    }
    addSchrödingerServices(mainApp, baseUrl){
        var be = this;
        mainApp.use(baseUrl+'/',function(req, res, next) {
            if (req.path.substr(-1) == '/' && req.path.length > 1) {
                var query = req.url.slice(req.path.length);
                res.redirect(301, req.path.slice(0, -1) + query);
            } else {
                next();
            }
        });
        var urlYClasesTabulados='principal';
        super.addSchrödingerServices(mainApp, baseUrl);
        mainApp.get(baseUrl+'/api_provisorio', function(req,res){
            var version=req.query.version;
            if(version!='0.1'){
                res.send({ok:false, version, error:'version incorrecta de la API'});
                res.end()
            }
            var es=spec;
            var _=spec;
            switch(req.query.traer){
                case 'tabulado':
                    be.servirTabuladoEspecifico(req,res, function funEntregarDatos(res, matrices){
                        var result=
                        es("el conjunto de datos correspondientes a un indicador",{
                            ok:es("true ó false según el éxito del pedido"),
                            version:es("el nombre de la versión de la API"),
                            datos:es("la respuesta de la API a traer=tabulado",{
                                vars:es.indexedObject("con las variables que cortan el tabulado",{
                                    name:es("el nombre de la variable que se usa internamente"),
                                    label:es("el nombre de la variable que debe mostrarse al usuario"),
                                    values:es.indexedObject("con los valores posibles que puede contener la variable en el tabulado",{
                                        label:es("la etiqueta del valor que debe ver el usuario")
                                    })
                                }),
                                list:es.array("es el conjunto de datos que conforma el tabulado",
                                    es.exclude("celda del tabulado, con las variables mencionadas en vars y el value",{cv:true})
                                )
                            })
                        })({ok:true, version, datos:matrices.datum});
                        res.send(result);
                        res.end()
                    });
                break;
                case 'principal':
                    be.servirIndicadores(req,res, function (res, indicadores){
                        var result=
                        es("la información general sobre cada uno de los indicadores del sistema de indicadores y sus posibles tabulados",{
                            ok:es("true ó false según el éxito del pedido"),
                            version:es("el nombre de la versión de la API"),
                            datos:es("la respuesta de la API a traer=principal",{
                                indicadores:es.array("cada uno de los indicadores",es({
                                    "dimension":_,
                                    "indicador":es("código interno del indicador dentro del sistema"),
                                    "denominacion":es("denominación del indicador (nombre a desplegar al usuario)"),
                                    "fte":es("la fuente"),
                                    "um":es("la unidad de medida"),
                                    "universo":es("el universo"),
                                    "def_con":es("la definición conceptual"),
                                    "def_ope":es("la definición operativa"),
                                    "cob":es("la cobertura"),
                                    "desagregaciones":es("la desagregación"),
                                    "uso_alc_lim":es("el uso, el alcance y sus limitaciones"),
                                    "ods":es("la indicación de si forma parte de los ODS"),
                                    "tabulados":_ // es.array("la lista de los tabulados disponibles para el indicador",_)
                                }))
                            })
                        })
                        ({ok:true, version, datos:{indicadores}});
                        res.send(result)
                        res.end()
                    })
                    break;
                default:
                    res.send({ok:false, error:'valor del campo traer no válido'})
                    res.end();
                    break;
            }       
        });
        mainApp.get(baseUrl+'/'+urlYClasesTabulados+'-indicador', function(req,res){
            be.servirTabuladoEspecifico(req,res, function funEntregarDatos(res,matrices, client, indicador, annio, fila, result, cortantesPosibles, cortante, esAdmin){
                var contieneAnnioOcultable=false;
                return Promise.resolve().then(function(){
                    return be.traeInfoMatrix(client,indicador).then(function(infoParaTabulado){
                        var descripcionTabulado={};
                        descripcionTabulado={
                            indicador:indicador,
                            camposCortantes:be.defs_annio(annio).cortantes,
                            cortantes: fila.cortantes,
                            annioCortante:annio?annio:'TRUE',
                            cuadro:fila.cuadro,
                            grafico:fila.grafico,
                            tipo_grafico:fila.tipo_grafico,
                            orientacion:fila.orientacion,
                            apilado:fila.apilado,
                            i_denom:infoParaTabulado.i_denom,
                            nota_pie:infoParaTabulado.con_nota?infoParaTabulado.nota_pie:null,
                            fuente:infoParaTabulado.f_denom,
                            um_denominacion:infoParaTabulado.u_denom,
                            um:infoParaTabulado.um,
                            decimales:infoParaTabulado.decimales,
                            fte:infoParaTabulado.fte,
                            graf_ult_annios:infoParaTabulado.graf_ult_annios,
                            graf_cada_cinco:infoParaTabulado.graf_cada_cinco,
                            annios_ocultables:infoParaTabulado.annios_ocultables,
                        };
                        matrices.matrixTab.caption=infoParaTabulado.i_denom;
                        matrices.matrixGraf.caption=infoParaTabulado.i_denom;
                        return {matrices,descripcionTabulado};
                    }).then(function(matricesYDescripcion){
                        var matrices=matricesYDescripcion.matrices;
                        var descripcion=matricesYDescripcion.descripcionTabulado;
                        var toCellColumnHeaderPrevious = tabulator.toCellColumnHeader;
                        function calcularAnniosOcultables(attrs, varValue){
                            if(descripcion.annios_ocultables){
                                if(varValue && varValue.annio){
                                    if(varValue.annio<2010 && varValue.annio % 5 !=0){
                                        attrs['annio-ocultable']='si';
                                        contieneAnnioOcultable=true;
                                    }
                                }
                            }
                        }
                        tabulator.toCellColumnHeader=function (titleCellAttrs, varName, labelValue, varValue){
                            calcularAnniosOcultables(titleCellAttrs, {[varName]:varValue})
                            var th = toCellColumnHeaderPrevious.apply(this, arguments);
                            return th;
                        }
                        tabulator.toCellTable=function(cell, varValues){
                            var attrs={class:'tabulator-cell'};
                            calcularAnniosOcultables(attrs, varValues)
                            var cellValor=(cell && cell.valor)?cellValor=be.decimalesYComa(cell.valor,descripcion.decimales,','):(cell?cell.valor:cell)
                            return html.td(attrs,[
                                html.div({id:'valor-cv'},[
                                    html.div({id:'valor-en-tabulado'},cell?be.puntosEnMiles(cellValor):'///'),
                                    html.div({id:'cv-en-tabulado'},(cell && cell.cv)?cell.cv:null)
                                ])
                            ]);
                        };
                        var tabuladoHtml=tabulator.toHtmlTable(matrices.matrixTab)
                        return {tabuladoHtml,descripcionTabulado:descripcion, matrix:matrices.matrixGraf};
                    })
                }).then(function(tabuladoDescripcionMatriz){
                    var tabuladoHtmlYDescripcion=result;
                    var tabuladoHtml=tabuladoDescripcionMatriz.tabuladoHtml;
                    var descripcion=tabuladoDescripcionMatriz.descripcionTabulado;
                    var matrix=tabuladoDescripcionMatriz.matrix;
                    var trCortantes=cortantesPosibles.map(function(cortanteAElegir){
                        var denominaciones=cortanteAElegir.denom_tab.split('|');
                        var href=''+absolutePath+''+urlYClasesTabulados+'-indicador?'+(annio?'annio='+annio+'&':'')+'indicador='+indicador+'&cortante='+JSON.stringify(cortanteAElegir.cortantes)
                        return html.tr({class:'tr-cortante-posible','esta-habilitado':cortanteAElegir.habilitado?'si':'no'},[
                            html.td({class:'td-cortante-posible', 'menu-item-selected':JSON.stringify(cortanteAElegir.cortantes)==cortante},[
                                html.a({class:'a-cortante-posible',href:href},denominaciones.join('-'))
                            ])
                        ]);
                    });
                    var annios={};
                    var anniosA=[];
                    var anniosLinks=[];
                    descripcion.usuario=req.user?req.user.usu_usu:{};
                    descripcion.habilitar=!fila.habilitado;
                    descripcion.cortante_orig=fila.cortante_orig;
                    var validationButton=html.button({id:'validacion-tabulado',type:'button','more-info':JSON.stringify(descripcion)},'Validar tabulado')
                    var habilitationButton=html.button({id:'habilitacion-tabulado',type:'button','more-info':JSON.stringify(descripcion)}/*,bb*/);
                    return be.anniosCortantes(client,annios,anniosA,indicador).then(function(){
                        anniosLinks=anniosA.map(function(annioAElegir){
                            var href=''+absolutePath+''+urlYClasesTabulados+'-indicador?annio='+annioAElegir+'&indicador='+indicador+
                            '&cortante='+cortante;
                            return html.span([
                                html.a({class:'annio-cortante-posible',href:href,'menu-item-selected':annioAElegir==annio},annioAElegir),
                            ]);
                        }).concat(
                            html.span([
                                html.a({class:'annio-cortante-posible',href:''+absolutePath+''+urlYClasesTabulados+'-indicador?indicador='+indicador+"&cortante="+cortante,'menu-item-selected':annio?false:true},'Serie')
                            ])
                        );
                    }).then(function(){
                        var skin=be.config['client-setup'].skin;
                        var skinUrl=(skin?skin+'/':'');
                        return be.encabezado(skinUrl,false,req,client).then(function(encabezadoHtml){
                            var pantalla=html.div({id:'total-layout','menu-type':'hidden'},[
                                encabezadoHtml,
                                html.div({class:'annios-links-container',id:'annios-links'},[
                                    html.div({id:'barra-annios'},anniosLinks),
                                    html.div({id:'link-signos-convencionales'},[html.a({id:'signos_convencionales-link',href:''+absolutePath+'principal-signos_convencionales'},'Signos convencionales')]),
                                    html.div({class:'float-clear'})
                                ]),
                                html.table({class:'tabla-links-tabulado-grafico'},[
                                    html.tr({class:'tr-links-tabulado-grafico'},[
                                        html.td({class:'td-links'},[
                                            html.div({class:'div-pantallas',id:'div-pantalla-izquierda'},[
                                                html.h2('Tabulados'),
                                                html.table({id:'tabla-izquierda'},trCortantes)
                                            ]),
                                        ]),
                                        html.td({class:'td-tabulado-grafico'},[
                                            html.div({class:'div-pantallas',id:'div-pantalla-derecha'},[
                                                html.h2({class:'tabulado-descripcion',id:'para-botones'},[
                                                    html.div({class:'tabulado-descripcion-annio'},annio),
                                                    html.div({class:'botones-tabulado-descripcion'})
                                                ]),
                                                ((fila.habilitado) || esAdmin)?html.div({
                                                    id:'tabulado-html',
                                                    class: tabuladoDescripcionMatriz.descripcionTabulado.tipo_grafico == 'piramide' ? 'hide-tabulado-cuadro': '',
                                                    'para-graficador':JSON.stringify(matrix),
                                                    'info-tabulado':JSON.stringify(descripcion)
                                                },[tabuladoHtml]):null,
                                                esAdmin?html.div([
                                                    validationButton,
                                                    habilitationButton
                                                ]):null,
                                                html.div({class:'tabulado-descripcion',id:'tabulado-descripcion-um'},[
                                                    (fila.habilitado || esAdmin)?html.span({id:"tabulado-um"},"Unidad de medida: "):null,
                                                    (fila.habilitado || esAdmin)?html.span({id:"tabulado-um-descripcion"},descripcion.um_denominacion):null
                                                ]),
                                                html.div({class:'tabulado-descripcion',id:'tabulado-descripcion-nota'},[
                                                    ((fila.habilitado || esAdmin)&&descripcion.nota_pie)?html.span({id:"nota-porcentaje-label"},'Nota: '):null,
                                                    ((fila.habilitado || esAdmin)&&descripcion.nota_pie)?html.span({id:"nota-porcentaje"},descripcion.nota_pie):null,
                                                ]),
                                                html.div({class:'tabulado-descripcion',id:'tabulado-descripcion-fuente'},[
                                                    (fila.habilitado || esAdmin)?html.span({id:"tabulado-fuente"},'Fuente: '):null,
                                                    (fila.habilitado || esAdmin)?html.span({id:"tabulado-fuente-descripcion"},descripcion.fuente):null,
                                                ]),
                                                (contieneAnnioOcultable?
                                                    html.div({class:'aclaracion-annios-ocultos'},[
                                                        html.span({class:'nota'},"Nota: "),
                                                        " se muestran los datos correspondientes a los años terminados en 0 y 5 y, con correlatividad anual, desde 2010 en adelante ",
                                                        html.a({href:"#ver-todo"}, "(ver todos)")
                                                    ])
                                                :null)
                                            ])
                                        ])
                                    ])
                                ])
                            ]);
                            var pagina=html.html([
                                be.headSigba(false,req,descripcion.i_denom),
                                html.body({"que-pantalla": 'indicador'},[pantalla,be.foot(skinUrl)])
                            ]);
                            res.send(pagina.toHtmlText({pretty:true}));
                            res.end();
                        })
                    })
                });
            })
        });
        mainApp.get(baseUrl+'/principal', function(req,res){
            var annios={};
            var client;
            var categoriasPrincipalLista;
            //var cortantePrincipal;
            var encabezado;
            var skin=be.config['client-setup'].skin;
            var skinUrl=(skin?skin+'/':'');
            
            return be.getDbClient(req).then(function(cli){
                client=cli;
                return be.cortantesPrincipal(client).then(function(cortanteEnPrincipal){
                    if(cortanteEnPrincipal){
                        be.hayCortantePrincipal=true;
                        be.cortantesEnPrincipal=cortanteEnPrincipal;
                        categoriasPrincipalLista=cortanteEnPrincipal.categoriasPrincipalArr;
                        //cortantePrincipal=cortanteEnPrincipal;
                    }else{
                        be.hayCortantePrincipal=false;
                    }
                }).then(function(){
                    return be.encabezado(skinUrl,true,req,client).then(function(encabezadoHtml){
                        encabezado=encabezadoHtml;
                        var controles={
                            elegidoEnDimension:{},
                            filasEnDimension:{},
                            posicionEnDimension:{}
                        };
                        return be.reporteBonito(client,[{
                            tabla:"agrupacion_principal",
                            campoId:"agrupacion_principal",
                            camposAMostrar:["denominacion"],
                            joinSiguiente:["agrupacion_principal"],
                            color:true,
                            condicion: ['ocultar IS NOT TRUE']
                        },{
                            tabla:"dimension",
                            campoId:"dimension",
                            camposAMostrar:["denominacion"],
                            joinSiguiente:["dimension"],
                            condicion: ['ocultar IS NOT TRUE'],
                        },{
                            tabla:"indicadores",
                            campoId:"indicador",
                            camposAMostrar:["denominacion"],
                            mostrarIndicadoresYLinks:true,
                        }], annios,'ocultar IS NOT TRUE',null,controles);
                    })
                });
            }).then(function(listaDeTr){
                var htmlTag=html.html([
                    be.headSigba(false,req,'Indicadores'),
                    html.body({"que-pantalla": 'principal'},[
                        html.div({id:'total-layout', 'menu-type':'hidden'},[
                            encabezado,
                            html.div({id:'div-encabezado-titulo-tabulado',class:'titulo-tabulados'},[
                                html.a({class:'encabezado-titulo-tabulado',href:''+absolutePath+'principal'},[
                                    html.div({id:'indicadores-titulo',class:'titulo-tabulados'},'Indicadores'),
                                    html.div({id:'titulo-signos_convencionales',class:'titulo-tabulados'},[html.a({id:'signos_convencionales-link',href:''+absolutePath+'principal-signos_convencionales'},'Signos convencionales')]),
                                    html.div({class:'float-clear'},"")
                                ]),
                            ]),
                            html.table({class:'tabla-inicio', id:'tabla-inicio'},[
                                html.thead([
                                    html.tr([
                                        html.th(""),
                                        html.th({class:'head-inicio',style:"text-align:left" },be.config['client-setup'].labels['agrupacion-principal']),
                                        html.th({class:'head-inicio',style:"text-align:left" },"Dimensión"),
                                        html.th({class:'head-inicio',style:"text-align:left" },"Indicador"),
                                        html.th({class:'head-inicio',style:"text-align:right"},""),
                                        html.th('Año'),
                                        html.th('Total')
                                    ].concat(
                                        be.hayCortantePrincipal?categoriasPrincipalLista.map(function(categoria){
                                            return html.th(categoria.denominacion)
                                        }):null
                                    ).concat([
                                        html.th({class:'th-vacio',}),
                                        html.th({class:'th-vacio',})
                                    ]))
                                ]),
                                html.tbody(listaDeTr)
                            ]),
                            be.foot(skinUrl)
                        ])
                    ])
                ]);
                res.send(
                    htmlTag.toHtmlText({pretty:true})
                );
                res.end();
            }).catch(MiniTools.serveErr(req,res)).then(function(){
                client.done();
            });
        });
        mainApp.get(baseUrl+'/principal-info-indicador', function(req,res){
            var indicador=req.query.indicador;
            return be.getDbClient(req).then(function(cli){
                var skin=be.config['client-setup'].skin;
                var skinUrl=(skin?skin+'/':'');
                var client=cli;
                var filasDeVariablesPrincipales={};
                var variablePrincipal={};
                var infoIndicador={};
                return client.query(
                    "SELECT i.dimension,i.indicador,i.denominacion,i.def_con,i.def_ope,i.cob,i.desagregaciones,i.uso_alc_lim,i.universo, i.metas, v.variable variable_principal, "+
                           "f.denominacion fte,u.denominacion um "+
                        "FROM indicadores i LEFT JOIN fte f ON i.fte=f.fte LEFT JOIN um u ON u.um=i.um LEFT JOIN variables v ON i.variable_principal=v.variable "+
                        "WHERE i.indicador=$1 ORDER BY i.indicador,i.dimension",[indicador]
                ).fetchOneRowIfExists().then(function(result){
                    infoIndicador=result.row||{};
                    variablePrincipal=infoIndicador.variable_principal;
                }).then(function(){
                    if(variablePrincipal){
                        return client.query(
                            "select denominacion, descripcion from cortes c WHERE c.variable = ORDER BY orden",
                            [variablePrincipal]
                        ).fetchAll().then(function(result){
                            filasDeVariablesPrincipales=result.rows;
                            return filasDeVariablesPrincipales;
                        })
                    }else{
                        return [];
                    }
                }).then(function(filasDeVariablesPrincipales){
                    var camposAFicha=['denominacion','def_con','def_ope','um','universo','cob','fte','uso_alc_lim','metas'];
                    var camposLabels=['Nombre del indicador','Definición conceptual','Definición operativa','Unidad de medida','Universo','Cobertura','Fuente','Uso, alcances, limitaciones','Metas ODS'];
                    var objetosCamposDef={};
                    camposAFicha.forEach(function(campo,icampo){
                        objetosCamposDef[campo]={
                            label:camposLabels[icampo], 
                            value:infoIndicador[camposAFicha[icampo]],
                            variablePrincipal:filasDeVariablesPrincipales,
                            tienePrinc:(campo=='def_con')?true:false
                        }
                    });
                    var arrayCamposDef=[];
                    for(var elemento in objetosCamposDef){
                        arrayCamposDef.push(objetosCamposDef[elemento])
                    }
                    var tablaVariablesPrincipales=html.table({id:'tabla-var-princ-id',class:'tabla-var-princ-class'},
                        filasDeVariablesPrincipales.map(function(variable){
                            return html.tr({class:'fila-variables-princ-tr'},[
                                html.td({class:'fila-variables-princ-td'},[
                                    html.span({class:'span-var-princ',id:'denominacion-var-princ-id'},variable.denominacion+': '),
                                    html.span({class:'span-var-princ',id:'descripcion-var-princ-id'},variable.descripcion)
                                ])
                            ])
                        })
                    )
                    var tablaFicha=html.table({id:'info-ind-dim'},
                        arrayCamposDef.map(function(campoDef){
                            return html.tr({class:'fila-info-ind-dim'},[
                                campoDef.value?html.td({class:'ficha-label'},[campoDef.label]):null,
                                campoDef.value?html.td({class:'ficha-value'},[
                                    html.div({id:'info-ind-ficha-div'},[
                                        html.div({class:'fila-info-ind-dim',id:'fila-info-ind-dim-id'},campoDef.value),
                                        campoDef.tienePrinc?tablaVariablesPrincipales:null
                                    ])
                                ]):null
                            ])
                        })
                    );
                    return be.encabezado(skinUrl,false,req,client).then(function(encabezadoHtml){
                        var paginaInfoIndicador=html.html([
                            be.headSigba(false,req,'Ficha técnica'),
                            html.body({"que-pantalla": 'info-indicador'},[
                                html.div({id:'total-layout', 'menu-type':'hidden'},[
                                    encabezadoHtml,
                                    tablaFicha
                                ]),
                                be.foot(skinUrl)
                            ])
                        ]);
                        res.send(paginaInfoIndicador.toHtmlText({pretty:true}));
                        res.end();
                    })
                }).catch(MiniTools.serveErr(req,res)).then(function(){client.done()});
            })
        });
        mainApp.get(baseUrl+'/principal-ley-agrupacion_principal', function(req,res){
            var agrupacion_principal=req.query.agrupacion_principal;
            var skin=be.config['client-setup'].skin;
            var skinUrl=(skin?skin+'/':'');
            return be.getDbClient(req).then(function(cli){
                var client=cli;
                return be.encabezado(skinUrl,false,req,client).then(function(encabezado){
                    return client.query(`SELECT denominacion,leyes FROM agrupacion_principal WHERE agrupacion_principal=$1`,[agrupacion_principal]).fetchOneRowIfExists().then(function(result){
                        var arregloLeyes=result.row.leyes.split('; ');
                        var paginaLey=html.html([
                            be.headSigba(false,req,'Leyes'),
                            html.body({"que-pantalla": 'ley'},[
                                html.div({id:'total-layout','menu-type':'hidden'},[
                                    encabezado,
                                    html.h2({id:'agrupacion_principal_'+agrupacion_principal},result.row.denominacion),
                                    html.div({id:'ley_agrupacion_principal_'+agrupacion_principal},
                                        arregloLeyes.map(function(ley){
                                            return html.div({class:'leyes'},ley);
                                        })
                                    ),
                                    be.foot(skinUrl)
                                ])
                            ])
                        ]);
                        res.send(paginaLey.toHtmlText({pretty:true}));
                        res.end();
                    })
                }).catch(MiniTools.serveErr(req,res)).then(function(){client.done()});
            })
        });
        mainApp.get(baseUrl+'/principal-signos_convencionales',function(req,res){
            return be.inDbClient(req,function(client){
                var skin=be.config['client-setup'].skin;
                var skinUrl=(skin?skin+'/':'');
                return client.query(`SELECT signo,denominacion,orden FROM signos_convencionales ORDER BY orden`).fetchAll().then(function(result){
                    var filasSignos=result.rows;
                    return be.encabezado(skinUrl,false,req,client).then(function(encabezadoHtml){
                        var pantalla=html.html([
                            be.headSigba(false,req,'Signos convencionales'),
                            html.body({"que-pantalla": 'signos'},[
                                encabezadoHtml,
                                html.div({id:'total-layout','menu-type':'hidden'},[
                                    html.table({id:'tabla-signos_convencionales',class:'signos-convencionales-encabezado'},[
                                        html.caption({id:'caption-signos_convencionales',class:'signos-convencionales-encabezado'},'SIGNOS CONVENCIONALES'),
                                        html.thead({id:'thead-signos_convencionales',class:'signos-convencionales-encabezado'},[
                                            html.tr({id:'thead-tr-signos_convencionales',class:'signos-convencionales-encabezado'},[
                                                html.th({id:'th-signo',class:'signos_convencionales-encabezado'},'Signo'),
                                                html.th({id:'th-dnominacion',class:'signos_convencionales-encabezado'},'Descripción')
                                            ])
                                        ]),
                                        html.tbody({id:'tbody-signos-convencionales'},
                                            filasSignos.map(function(filaSigno){
                                                return html.tr({class:'fila-signos_convencionales'},[
                                                    html.td({class:'td-signos_convencionales'},[filaSigno.signo]),
                                                    html.td({class:'td-signos_convencionales'},[filaSigno.denominacion]),
                                                ])
                                            })
                                        )
                                    ]),
                                    be.foot(skinUrl)
                                ])
                            ])
                        ])
                        res.send(pantalla.toHtmlText({pretty:true}));
                        res.end();
                    })
                })
            })
        })
    }
    
    obtenerGruposPrincipales(client){
        return client.query("SELECT * FROM agrupacion_principal WHERE ocultar is not true ORDER BY orden").fetchAll().then(function(result){
            var gruposFilas=result.rows;
            var grupos=gruposFilas.map(function(fila){
                return {
                    codigo:fila.agrupacion_principal,
                    denominacion:fila.denominacion,
                    color:fila.color
                }
            })
            return grupos;
        })
    }
    
    encabezado(skinUrl,esPrincipal,req,client){
        var be = this;
        return be.parametrosSistema(client).then(function(parametros){
            var srcLogoSistema='img/img-logo.png';
            if(parametros && parametros.nombre_sistema){
                srcLogoSistema='img/img-logo'+'-'+parametros.nombre_sistema+'.png'
            }
            return be.obtenerGruposPrincipales(client).then(function(grupos){
                if(parametros.texto_sistema){
                    var textoLey=html.div({id:'texto'},parametros.texto_sistema)
                }
                var encabezadoCompletoHtml=html.div({id:'id-encabezado'},[
                    html.a({class:'encabezado',id:'barra-superior',href:''+absolutePath+'principal'},[
                        html.div({class:'encabezado-interno'},[
                            html.img({class:'encabezado',id:'bs-izq',src:skinUrl+'img/logo-ciudad.png'}),
                            html.img({class:'encabezado',id:'bs-der',src:skinUrl+'img/logo-BA.png'})
                        ]),
                    ]),
                    html.div({class:'encabezado',id:'barra-inferior'},
                        [].concat([
                            html.a({class:'a-principal',href:''+absolutePath+'principal'},[html.img(
                                {class:'encabezado',id:'img-logo',src:skinUrl+srcLogoSistema}
                            )])
                        ]).concat(be.config['client-setup'].logos.map(function(logoName){
                                return html.a({class:'a-principal',href:''+absolutePath+'principal'},[html.img({class:'encabezado',id:'logo-'+logoName,src:skinUrl+'img/img-logo-'+logoName+'.png'})]);
                        }).concat([be.config['client-setup'].conTextoPrincipal?html.div({class:'encabezado',id:'texto-encabezado-grande'}):null]).concat(
                            esPrincipal?textoLey?textoLey:html.div({class:'contiene-grupos'},grupos.map(function(grupo){
                                var href=''+absolutePath+'principal#'+grupo.codigo;
                                var src=skinUrl+'img/'+grupo.codigo+'.png';
                                return html.a({class:'grupo-a',href:href,title:grupo.denominacion},[html.img({class:'grupo-img',src:src})])
                            })):null
                        ))
                    )
                ])
                return encabezadoCompletoHtml;
            })
        })
    }
    foot(skinUrl){
        return html.div({class:'footer',id:'foot'},[
            html.div({class:'footer',id:'foot-div-img'},[html.img({class:'footer',id:'foot-img',src:skinUrl+'img/foot-logo-BA.png'})]),
            html.div({class:'footer',id:'contiene-textos-foot'},[
                html.div({class:'footer',id:'foot-texto'}),
                html.div({class:'footer',id:'foot-texto-2'})
            ])
        ])
    }
    
    getMenu(context){
        var be = this;
        return {menu:[
            //{menuType:'menu', name:'configuracion',  menuContent:[
                {menuType:'menu', name:'particiones'              , label:'división temática' , menuContent:[
                    {menuType:'table', name:'agrupacion_principal', label:be.config['client-setup'].labels['agrupacion-principal'], },
                    {menuType:'table', name:'dimension'   },
                    {menuType:'table', name:'indicadores' },
                ]},
                {menuType:'menu', name:'atributos', label:'atributos de indicadores', menuContent:[
                    {menuType:'table', name:'fte'             , label:'fuente de datos '                          },
                    {menuType:'table', name:'um'              , label:'unidad de medida'                          },
                    {menuType:'table', name:'cv'              , label:'coeficientes de variación'                 },
                    {menuType:'table', name:'indicador_annio' , label:'cobertura'                                 },
                    {menuType:'table'    , name:'signos_convencionales', label:'signos convencionales'            },
                    {menuType:'table'    , name:'variables_principales', label:'variables principales del sistema'},
                ]},
                {menuType:'menu'    , name:'variables' , menuContent:[
                    {menuType:'table', name:'variables'                                              },
                    {menuType:'table', name:'cortes'                                                 },
                    {menuType:'table', name:'indicadores-variables'   , table:'indicadores_variables'},
                    {menuType:'proc' , name:'generar'                 , label:'generar-variables' , proc:'variables/generar'},
                    {menuType:'table', name:'tabulados-variables'     , table:'tabulados_variables'  },
                ]},
                {menuType:'menu', name:'tabulados', menuContent:[
                   {menuType:'table', name:'tabulados'                                               },
                   {menuType:'proc' , name:'alta/tabulados'  , label:'generar tabulados'             },
                ]},
                {menuType:'menu'     , name:'valores'        , label:'datos'           , menuContent:[
                    {menuType:'table'    , name:'valores'                 , table:'valores'},
                    {menuType:'proc', label:'borrar datos valores', name:'borrar/valores'  },
                    {menuType:'calculaTotales' , name:'calcular totales'},
                    {menuType:'table'          , name:'discrepancias'         , table:'diferencia_totales'},
                ]},
                {menuType:'path'     , name:'principal'  , path:'/principal' },
                {menuType:'menu'     , name:'sistema'    , menuContent:[
                    {menuType:'table'    , name:'usuarios'}
                ]},
        ]}
    }
    getTables(){
        return super.getTables().concat([
            'parametros',
            'variables_principales',
            'usuarios',
            'fte',
            'um',
            'cv',
            'indicador_annio',
            'agrupacion_principal',
            'dimension',
            'indicadores',
            'variables',
            'indicadores_variables',
            'cortes',
            'valores',
            'celdas',
            'tabulados',
            'cortes_celdas',
            'tabulados_variables',
            'diferencia_totales',
            'signos_convencionales',
            'totales_calculados'
        ]);
    }
    releerEstructuraBaseDeDatos(client){
        var be = this;
        return client.query(
            `SELECT *
            FROM variables v LEFT JOIN (
                SELECT column_name 
                FROM information_schema.columns WHERE table_name ='valores' 
                    AND column_name NOT IN ('valor','cortantes','cortes','es_automatico','fecha_validacion','indicador','origen_validacion','usu_validacion')
                ) x ON v.variable = x.column_name`
        ).fetchAll().then(function(result){
            be.variablesDinamicas=result.rows.map(function(row){
                return {
                    name:row.variable,
                    isSlicer:row.corte,
                    label:row.denominacion, 
                    typeName:'text',
                    clientSide:!row.column_name?'nuevaFaltaGenerar':(
                        row.estado_tabla_valores=='quitar'?'quitarFaltaGenerar':null
                    ),
                    serverSide:row.column_name && row.estado_tabla_valores=='quitar'?true:null
                };
            });
            return true;
        })
    }
    postConfig(){
        super.postConfig();
        var be=this;
        var be = this;
        return be.inDbClient({},function(client){
           return be.releerEstructuraBaseDeDatos(client);
        }).then(function(){
            return be.inDbClient({},function(client){
                return client.query(`SELECT valor_esp from celdas;`).execute();
            })
        }).catch(function(err){
            console.log("*********************  AGREGAR LA COLUMN valor_esp en tablas valor y celdas********************")
        })
    }
    
}

process.on('uncaughtException', function(err){
  console.log("Caught exception:",err);
  console.log(err.stack);
  process.exit(1);
});

process.on('unhandledRejection', function(err){
  console.log("unhandledRejection:",err);
  console.log(err.stack);
});

new AppSIGBA().start();
