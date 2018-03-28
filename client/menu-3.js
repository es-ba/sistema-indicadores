"use strict";


var my = myOwn;
var eventosBotones={
    validar:function(parametros){
        my.ajax.tabulado.validar(parametros).then(function(result){
            console.log("result",result)
            return alertPromise("se validaron "+ result.toString()+" registros");
        });
    },
    estaValidado:function(parametros){
        return my.ajax.tabulado['esta-validado'](parametros).then(function(result){
            return result;
        });
    },
    habilitar:function(parametros){
        my.ajax.tabulado.habilitar(parametros).then(function(result){
            return alertPromise(cartelHabilitar(parametros.habilitar)).then(function(){
                window.location.reload(true);
            });
        });
    }
}

function moreInfoAParametros(parametros){
    parametros=JSON.parse(parametros);
    var parametrosParaAjax={};
    for(var parametro in parametros){
        parametrosParaAjax[parametro]=parametros[parametro];
    }
    return parametrosParaAjax;
}

function activarBoton(id, nombreEvento){
    var elemento = document.getElementById(id);
    if(elemento){
        var parametros=elemento.getAttribute('more-info'); 
        parametros=moreInfoAParametros(parametros);
        if(nombreEvento=='validar'){
            eventosBotones['estaValidado'](parametros).then(function(result){
                if(result){
                    elemento.disabled = true;
                    elemento.textContent='tabulado validado';
                }else{
                    elemento.addEventListener('click',function(){
                        eventosBotones[nombreEvento](parametros);
                        elemento.disabled = true;
                        elemento.textContent='tabulado validado';
                    });
                }
            });
        }
        if(nombreEvento=='habilitar'){
            elemento.textContent= cartelHabilitar(parametros.habilitar); 
            elemento.addEventListener('click',function(){
                 eventosBotones[nombreEvento](parametros);
            })

        }
    }
}
function cartelHabilitar(habilitar){
    return (habilitar?'Habilitar':'Inhabilitar')+' tabulado ';
}
/*
function deshabilitarTabulado(id,nombreEvento){
    var elemento=document.getElementById(id);
    if(elemento){
        elemento.addEventListener('click',function(){
            
        });
    }
}*/
window.addEventListener('load',function(){
    my.autoSetup().then(function(){
        activarBoton('validacion-tabulado', 'validar');
        activarBoton('habilitacion-tabulado', 'habilitar');
    });
});