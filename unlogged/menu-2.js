"use strict";

/* jshint browser: true */

var changing = window.bestGlobals.changing;

//Curados y validaciones particulares a sigba/sistema de indicadores 
function curarMatrix(matrix) {
    matrix = borrarTotales(matrix);
    matrix.dataVariables.splice(matrix.dataVariables.indexOf('cv', 1)); //descarto coeficiente de variación
    return matrix;
}

//TODO: si graficar totales depende de tabulado o indicador -> ponerle un campo en tabulado o indicador donde lo especifiquen, si depende del tipo de gráfico -> hacerlo en graphicator
//no se grafican los totales actualmente
function borrarTotales(matrix) {
    if (matrix.lines.length > 1 && matrix.lines[0].titles[0] == null) {
        matrix.lines.shift(); // borro linea totales
    }
    if (matrix.columns.length > 1 && matrix.columns[0].titles[0] == null) {
        matrix.columns.shift();
        matrix.lines.forEach(function (line) {
            line.cells.shift(); //borro la primera celda de cada uno (de totales)
        });
    }
    return matrix;
}

window.charts = []; //after render we can change charts changing its c3 config and reloading with chart[i].load

function generateChart(elementWithMatrix, svgWidth) {
    var tabulatorMatrix = getMatrix(elementWithMatrix);
    var tabuladoInfo = getTabuladoInfo(elementWithMatrix);
    if (!tabuladoInfo.grafico && tabuladoInfo.tipo_grafico != 'piramide') {
        throw new Error('gráfico deshabilitado en tabla tabulados campo mostrar_grafico');
    }

    //se muestran como máximo 10 gráficos
    var zMatrices = tabulatorMatrix.z;
    if (tabulatorMatrix.z.length > 10 && tabuladoInfo.graf_ult_annios) {
        zMatrices = tabulatorMatrix.z.slice(0, 10);
    }
    if (tabulatorMatrix.z.length > 10 && tabuladoInfo.graf_cada_cinco) {
        if (Number(tabulatorMatrix.z[0].caption) && (Number(tabulatorMatrix.z[0].caption) % 5 != 0)) {
            zMatrices = [tabulatorMatrix.z[0]];
        }
        tabulatorMatrix.z.forEach(function (matrixElegida) {
            if (matrixElegida.caption && Number(matrixElegida.caption) && (Number(matrixElegida.caption) % 5 == 0)) {
                zMatrices.push(matrixElegida);
            }
        });
        if (Number(tabulatorMatrix.z[tabulatorMatrix.z.length - 1].caption) && (Number(tabulatorMatrix.z[tabulatorMatrix.z.length - 1].caption) % 5 != 0)) {
            zMatrices.push(tabulatorMatrix.z[tabulatorMatrix.z.length - 1]);
        }
    }
    var minZYValue = Number.MAX_VALUE;
    var maxZYValue = Number.MIN_VALUE;
    zMatrices.forEach(function (zMatrix) {
        //si es apilado dejo la matrix con los totales para calcular el max, sino curo la matrix
        var mtx = (tabuladoInfo.apilado || tabuladoInfo.tipo_grafico == 'piramide') ? zMatrix : curarMatrix(zMatrix);
        var minMax = window.Graphicator.calcularMinMax(mtx);
        minZYValue = Math.min(minMax.min, minZYValue);
        maxZYValue = Math.max(minMax.max, maxZYValue);
    });

    var chartContainer = generateChartContainer(elementWithMatrix, tabuladoInfo);
    zMatrices.forEach(function (matrix, indexChart) {
        matrix = curarMatrix(matrix);
        // ver interfaz graph-configuration.d.ts en graphicator
        var generalConfig = {
            matrix: matrix,
            tipo: tabuladoInfo.tipo_grafico,
            idElemParaBindear: generateChartElementId(matrix, tabuladoInfo, indexChart, chartContainer),
            apilado: tabuladoInfo.apilado,
            um: tabuladoInfo.um_denominacion || '',
            c3Config: {
                size: { width: svgWidth },
                axis: {
                    rotated: tabuladoInfo.orientacion == 'vertical' ? true : false,
                    y: {
                        //siempre la misma escala para distintos graficos de variable z
                        min: minZYValue,
                        max: maxZYValue
                    },
                }
            }
        };

        // TODO: pensar cual es la mejor estrategia
        var specificConfig = {};
        // para lineas de años pongo los ticks de costado
        if (tabuladoInfo.tipo_grafico == 'linea' && matrix.columnVariables[0] == 'annio') {
            specificConfig = {
                c3Config: {
                    axis: {
                        x: {
                            type: 'indexed',
                            tick: {
                                rotate: -50, // rota el label del tick //sacar
                                multiline: false, //sacar
                                culling: {
                                    max: 25 // cant de ticks que se muestran
                                }
                            },
                            height: 50 // el tamaño que deja para el label del axis y las legendas //sacar
                        }
                    }
                }
            };
        }
        if (tabuladoInfo.tipo_grafico == 'barra') {
            specificConfig = {
                c3Config: {
                    axis: {
                        y: {
                            // si es porcentaje min = 0
                            min: 0,//maxZYValue==100? 0: Math.trunc(minZYValue),
                            max: maxZYValue
                        }
                    }
                }
            };
        }
        if (tabuladoInfo.tipo_grafico == 'piramide') {
            specificConfig = {
                c3Config: {
                    size: { width: 620 },//Emilio pidió un ancho menor al automático para que no se vean tan anchas las pirámides
                    axis: {
                        y: {
                            //esto es para que las piramides con variables en ubicación z tengan la misma escala
                            min: -maxZYValue,
                            max: maxZYValue
                        }
                    }
                }
            };
        }
        window.charts.push(window.Graphicator.render(changing(generalConfig, specificConfig)));
        indexChart++;
    });
    chartContainer.style.display = 'block';
}

function generateChartElementId(matrix, tabuladoInfo, indexChart, chartContainer) {
    var chartElementId = 'chartElement-' + tabuladoInfo.indicador + '-' + indexChart;
    var chartElement = document.createElement('div');
    chartElement.className = 'chartElement ' + tabuladoInfo.tipo_grafico;
    chartElement.setAttribute('id', chartElementId);

    if (matrix.caption) {
        var chartTitle = document.createElement('h3');
        chartTitle.innerText = matrix.caption;
        chartTitle.style.textAlign = 'center';
        chartTitle.className = 'titulo-grafico-z';
        chartContainer.appendChild(chartTitle);
    }
    chartContainer.appendChild(chartElement);

    return chartElementId;
}

function generateChartContainer(elementWithMatrix, tabuladoInfo) {
    var chartTitle = document.createElement('h3');
    chartTitle.innerText = tabuladoInfo.i_denom;
    chartTitle.style.textAlign = 'center';
    chartTitle.className = 'titulo-contenedor-graficos';

    var chartContainer = document.createElement('div');
    chartContainer.setAttribute('id', 'chartContainer-' + tabuladoInfo.indicador);
    chartContainer.className = 'chartContainer';
    chartContainer.appendChild(chartTitle);
    chartContainer.style.display = 'none';
    elementWithMatrix.parentNode.insertBefore(chartContainer, elementWithMatrix.nextElementSibling);
    return chartContainer;
}

function getMatrix(element) {
    return JSON.parse(element.getAttribute('para-graficador'));
}

function getTabuladoInfo(element) {
    return JSON.parse(element.getAttribute('info-tabulado'));
}

function getChartContainer(indicador) {
    return document.getElementById('chartContainer-' + indicador);
}

function getTabuladoElement() {
    return document.getElementById('tabulado-html');
}

function toggleChartTabuladoDisplay() {
    //changing url accordingly without reolading page
    if (window.location.search.match(window.displayChartParamName)) {
        toggleToTabulado();
    } else {
        toggleToChart();
    }
    updateVisualization();
    refreshChartsRender();
}

function toggleToTabulado() {
    var newUrl = window.location.search.match(window.displayChartParamName) ? location.href.replace(window.displayChartParamName, '') : location.href;
    updateUrlState(newUrl, "pushState");
}

function toggleToChart() {
    var newUrl = window.location.search.match(window.displayChartParamName) ? location.href : location.href + window.displayChartParamName;
    updateUrlState(newUrl, "replaceState");
}

function updateUrlState(newUrl, method) {
    window.history[method]("Cambiar visualización entre gráfico y tabulado", "Visualización", newUrl);
}

window.addEventListener('load', function(){
    // when browser back or next button are used
    if(document.body.getAttribute("que-pantalla")=='indicador'){
        window.onpopstate = function (event) {
            updateVisualization();
        };
    }
});

function updateVisualization() {
    if (getTabuladoElement()){
        var tglBtn = document.getElementById('toogleButton');
        if (window.location.search.match(window.displayChartParamName)) {
            document.querySelector('.chartContainer').style.display = 'block';
            getTabuladoElement().style.display = 'none';
            if (tglBtn) {tglBtn.src = 'img/tabulado.png';}
        } else {
            document.querySelector('.chartContainer').style.display = 'none';
            getTabuladoElement().style.display = 'block';
            if (tglBtn) {tglBtn.src = 'img/grafico.png';}
        }
    }
}

window.displayChartParamName = '&type=grafico';

function buildToggleButton() {
    var toggleButton = document.createElement('input');
    toggleButton.type = 'image';
    toggleButton.id = 'toogleButton';
    toggleButton.className += "boton_tabulados";
    toggleButton.width = '40';
    toggleButton.style.margin = '5';
    toggleButton.onclick = function () {
        toggleChartTabuladoDisplay();
    };
    return toggleButton;
}

function copyInputToClipboard(inputToCopy) {
    inputToCopy.value = window.location.href;
    inputToCopy.focus();
    inputToCopy.select();
    document.execCommand("Copy");
}

function buildCopyUrlButton() {
    var copyUrlButton = document.createElement('input');
    copyUrlButton.type = 'image';
    copyUrlButton.src = 'img/copiarlink.png';
    copyUrlButton.className += "boton_tabulados";
    copyUrlButton.width = "40";
    copyUrlButton.style.margin = '5';
    copyUrlButton.onclick = copyUrlFunc;
    return copyUrlButton;
}

function copyUrlFunc() {
    var inputUrl = document.getElementById("pasteBox");
    inputUrl.hidden = false;
    copyInputToClipboard(inputUrl);
    inputUrl.hidden = true;
}

function buildHiddenInputUrl() {
    var inputUrl = document.createElement('input');
    inputUrl.type = 'text';
    inputUrl.id = 'pasteBox';
    inputUrl.hidden = true;
    return inputUrl;
}

function insertNewButton(newButton, inElement) {
    if (inElement) {
        inElement.appendChild(newButton);
    } else {
        getTabuladoElement().parentNode.insertBefore(newButton, getTabuladoElement());
    }
}

function buildExportExcelButton() {
    var exportButton = document.createElement('input');
    exportButton.type = 'image';
    exportButton.src = 'img/exportar.png';
    exportButton.className += "boton_tabulados";
    exportButton.style.margin = '5';
    exportButton.width = "40";
    exportButton.onclick = function () {
        var t = new window.Tabulator();
        t.toExcel(getTabuladoElement(), {
            filename: getMatrix(getTabuladoElement()).caption,
            username: (window.my) ? window.my.config.username : null
        });
    };
    return exportButton;
}

function insertCopyUrlButton() {
    var inElement = document.getElementById('para-botones');
    insertNewButton(buildHiddenInputUrl(), inElement);
    insertNewButton(buildCopyUrlButton(), inElement);
}

function refreshChartsRender(){
    window.charts.forEach(function(chart){
        chart.chartAPI.show();
    });
}

window.addEventListener('load', function () {
    renderHomeCharts();
    var tabuladoElem = getTabuladoElement();
    if (tabuladoElem) {
        var inElement = document.getElementById('para-botones');
        //TODO: pasar el try catch adentro de 'generateChart' como está ahora el catch también ataja errores que no son del grafico
        try {
            generateChart(tabuladoElem, window.innerWidth - document.getElementById("div-pantalla-izquierda").offsetWidth - 32);
            if (getTabuladoInfo(tabuladoElem).tipo_grafico == 'piramide') {
                toggleToChart();
            } else {
                insertNewButton(buildToggleButton(), inElement);
            }
            updateVisualization();
        } catch (error) {
            window.console.error('No es posible graficar el tabulado. ' + error);
        }
        insertNewButton(buildExportExcelButton(), inElement);
        insertCopyUrlButton();
    }
    //le hago un load para que c3 acomode algunas cosas visuales como los labels
    refreshChartsRender();
    var foot = document.getElementById('foot-texto');
    var footOtroRenglon = document.getElementById('foot-texto-2');
    if (foot) {
        foot.textContent = 'Dirección General de Estadística y Censos';
    }
    if (footOtroRenglon) {
        footOtroRenglon.textContent = 'Gobierno de la Ciudad de Buenos Aires';
    }
    window.addEventListener('scroll', function () {
        ["id-encabezado", "div-encabezado-titulo-tabulado", "foot", "annios-links"].forEach(function (id) {
            var div = document.getElementById(id);
            if (div) {
                if (div.offsetLeft > window.scrollX) {
                    div.style.left = window.scrollX + 'px';
                } else if (
                    div.offsetLeft + div.clientWidth < window.innerWidth + window.scrollX
                ) {
                    div.style.position = 'relative';
                    div.style.left = window.innerWidth + window.scrollX - div.offsetWidth + 'px';
                }
                if (div.offsetLeft > window.scrollX) {
                    div.style.left = window.scrollX + 'px';
                }
            }
        });
    });
});

function renderHomeCharts() {
    Array.prototype.forEach.call(getChartBoxes(), function (box) {
        generateChart(box);
    });
}

function getChartBoxes() {
    return document.querySelectorAll('.box-grafico-principal [para-graficador]');
}