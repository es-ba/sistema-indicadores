"use strict";

// var html=require('js-to-html').html;
var html=jsToHtml.html;

var my = myOwn;

function prepareTableButtons(){
    var buttons = document.querySelectorAll("button.tables");
    Array.prototype.forEach.call(buttons, function(button){
        button.addEventListener('click', function(){
            var layout = document.getElementById('table_layout');
            my.tableGrid(this.getAttribute('id-table'),layout);
        });
    });
}

myOwn.wScreens.calculaTotales=function(addrParams){
    var filasCalculadas;
    my.ajax.calcular.totales().then(function(result){
        filasCalculadas=result;
        var msg=filasCalculadas?'Se insertaron '+result+' registros':'No hay totales para calcular. Se muestran las discrepancias del último cálculo de totales'
        return alertPromise(msg);
    });
};
 
window.addEventListener('load', function(){
    my.autoSetup().then(prepareTableButtons);
});

