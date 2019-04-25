"use strict";

var html=require('js-to-html').html;

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

myOwn.clientSides.nuevaFaltaGenerar={
    update: true,
    prepare: function(depot, fieldName){
        depot.rowControls[fieldName].style.backgroundColor='#FAE';
        depot.rowControls[fieldName].title='No se pueden cargar valores todavía, hay que generar variables';
    }
};
myOwn.clientSides.quitarFaltaGenerar={
    update: true,
    prepare: function(depot, fieldName){
        depot.rowControls[fieldName].style.backgroundColor='#FAA';
        depot.rowControls[fieldName].title='Esta columna será borrada. Hay que quitar las filas que contengan valores en ella';
    }
};

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

