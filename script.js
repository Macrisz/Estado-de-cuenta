/* ===== FUNCIÓN PARA LEER DATOS DEL CSV DE INVERSIÓN ===== */
async function loadCSVData() {
    const response = await fetch('data/datos_inversion.csv');
    const csvText = await response.text();
    
    const lines = csvText.trim().split('\n');
    const data = lines.slice(1).map(line => {
        const values = line.split(',');
        return {
            semana: parseInt(values[0]),
            prima_semanal: parseInt(values[1]),
            rentabilidad_porcentaje: parseFloat(values[2]),
            valorizacion_acumulada: parseFloat(values[3]),
            ahorros_brutos: parseInt(values[4]),
            proyeccion_total: parseFloat(values[5])
        };
    });
    
    return data;
}

/* ===== FUNCIÓN PRINCIPAL PARA CREAR EL GRÁFICO DE INVERSIÓN ===== */
async function createChart() {
    const metadata = await loadMetadata();
    const data = await loadCSVData();
    const ctx = document.getElementById('growthChart').getContext('2d');
    
    const primasPagadas = parseInt(metadata.primas_pagadas) || 27;
    const primasPendientes = parseInt(metadata.primas_pendientes) || 23;
    const semanasTotal = primasPagadas + primasPendientes;
    
    const semanas = data.map(d => d.semana);
    const ahorrosBrutos = data.map(d => d.ahorros_brutos);
    const proyeccionTotal = data.map(d => d.proyeccion_total);
    const rentabilidades = data.map(d => d.rentabilidad_porcentaje);
    
    const semanasCompletas = Array.from({length: semanasTotal}, (_, i) => i + 1);
    const semanasReales = semanasCompletas.slice(0, primasPagadas);
    const semanasProyectadas = semanasCompletas.slice(primasPagadas);
    
    const ahorrosBrutosReales = ahorrosBrutos.slice(0, primasPagadas);
    const valorizacionReal = proyeccionTotal.slice(0, primasPagadas);
    
    const rentabilidadesReales = rentabilidades.slice(0, primasPagadas);
    const minRentabilidad = Math.min(...rentabilidadesReales);
    const maxRentabilidad = Math.max(...rentabilidadesReales);
    const rentabilidadPromedio = rentabilidadesReales.reduce((a, b) => a + b, 0) / rentabilidadesReales.length;
    
    const ahorrosBrutosCompletos = [...ahorrosBrutosReales];
    
    const primaSemanal = parseInt(metadata.prima_semanal) || 540;
    for (let i = primasPagadas; i < semanasTotal; i++) {
        ahorrosBrutosCompletos.push((i + 1) * primaSemanal);
    }
    
    const ultimaValorizacionReal = valorizacionReal[valorizacionReal.length - 1];
    const ultimaValorizacionAcumulada = data[primasPagadas - 1].valorizacion_acumulada;
    
    const lineaSuperior = [...valorizacionReal];
    const lineaInferior = [...valorizacionReal];
    const lineaMedia = [...valorizacionReal];
    
    let valorizacionAcumuladaOptimista = ultimaValorizacionAcumulada;
    let valorizacionAcumuladaPesimista = ultimaValorizacionAcumulada;
    let valorizacionAcumuladaMedia = ultimaValorizacionAcumulada;
    
    for (let i = primasPagadas; i < semanasTotal; i++) {
        const ahorroSemana = (i + 1) * primaSemanal;
        
        const rentabilidadOptimista = Math.min(rentabilidadPromedio * 1.5, 4.0);
        const rentabilidadPesimista = Math.max(rentabilidadPromedio * 0.5, -1.0);
        
        const totalAnteriorOptimista = (i * primaSemanal) + valorizacionAcumuladaOptimista;
        const totalAnteriorPesimista = (i * primaSemanal) + valorizacionAcumuladaPesimista;
        const totalAnteriorMedia = (i * primaSemanal) + valorizacionAcumuladaMedia;
        
        const incrementoOptimista = totalAnteriorOptimista * (rentabilidadOptimista / 100);
        const incrementoPesimista = totalAnteriorPesimista * (rentabilidadPesimista / 100);
        const incrementoMedia = totalAnteriorMedia * (rentabilidadPromedio / 100);
        
        valorizacionAcumuladaOptimista += incrementoOptimista;
        valorizacionAcumuladaPesimista += incrementoPesimista;
        valorizacionAcumuladaMedia += incrementoMedia;
        
        const valorOptimista = ahorroSemana + valorizacionAcumuladaOptimista;
        const valorPesimista = ahorroSemana + valorizacionAcumuladaPesimista;
        const valorMedio = ahorroSemana + valorizacionAcumuladaMedia;
        
        lineaSuperior.push(valorOptimista);
        lineaInferior.push(valorPesimista);
        lineaMedia.push(valorMedio);
    }
    
    const minProyeccion = Math.min(...ahorrosBrutosCompletos, ...lineaInferior);
    const maxProyeccion = Math.max(...ahorrosBrutosCompletos, ...lineaSuperior);
    const rangoProyeccion = maxProyeccion - minProyeccion;
    const margenSuperior = rangoProyeccion * 0.1;
    
    const walkerExists = document.getElementById('walkerProgressFill') !== null;
    const espacioInferior = walkerExists ? rangoProyeccion * 0.15 : rangoProyeccion * 0.05;
    
    if (walkerExists) {
        const progreso = (primasPagadas / semanasTotal) * 100;
        updateWalker(progreso, primasPagadas, semanasTotal);
    }
    
    const growthChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: semanasCompletas,
            datasets: [
                {
                    label: 'Ahorros Brutos (Sin Rendimientos)',
                    data: ahorrosBrutosCompletos,
                    borderColor: '#1976D2',
                    backgroundColor: 'transparent',
                    borderWidth: 2,
                    fill: false,
                    tension: 0,
                    pointRadius: 0,
                    pointHoverRadius: 4,
                    order: 4
                },
                {
                    label: 'Valorización Real',
                    data: [...valorizacionReal, ...Array(semanasProyectadas.length).fill(null)],
                    borderColor: '#2E7D32',
                    backgroundColor: 'transparent',
                    borderWidth: 3,
                    fill: false,
                    tension: 0.4,
                    pointRadius: function(context) {
                        return context.dataIndex === primasPagadas - 1 ? 6 : 0;
                    },
                    pointBackgroundColor: '#FF9800',
                    pointBorderColor: '#2E7D32',
                    pointBorderWidth: 2,
                    pointHoverRadius: 6,
                    order: 1,
                    spanGaps: false
                },
                {
                    label: 'Proyección Pesimista',
                    data: lineaInferior,
                    borderColor: '#FF7043',
                    backgroundColor: 'transparent',
                    borderWidth: 2,
                    fill: false,
                    tension: 0.4,
                    pointRadius: function(context) {
                        return context.dataIndex === primasPagadas - 1 ? 5 : 0;
                    },
                    pointBackgroundColor: function(context) {
                        return context.dataIndex === primasPagadas - 1 ? '#FF9800' : '#FF7043';
                    },
                    pointHoverRadius: 5,
                    order: 3,
                    segment: {
                        borderDash: function(ctx) {
                            return ctx.p0DataIndex >= primasPagadas - 1 ? [6, 3] : undefined;
                        }
                    }
                },
                {
                    label: 'Proyección Optimista',
                    data: lineaSuperior,
                    borderColor: '#4CAF50',
                    backgroundColor: 'rgba(76, 175, 80, 0.2)',
                    borderWidth: 2,
                    fill: '-1',
                    tension: 0.4,
                    pointRadius: function(context) {
                        return context.dataIndex === primasPagadas - 1 ? 5 : 0;
                    },
                    pointBackgroundColor: function(context) {
                        return context.dataIndex === primasPagadas - 1 ? '#FF9800' : '#4CAF50';
                    },
                    pointHoverRadius: 5,
                    order: 2,
                    segment: {
                        borderDash: function(ctx) {
                            return ctx.p0DataIndex >= primasPagadas - 1 ? [6, 3] : undefined;
                        }
                    }
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    position: 'bottom',
                    labels: {
                        font: {
                            size: 11
                        },
                        padding: 15,
                        usePointStyle: true
                    }
                },
                title: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        afterLabel: function(context) {
                            const dataIndex = context.dataIndex;
                            const semana = semanasCompletas[dataIndex];
                            const datasetLabel = context.dataset.label;
                            
                            if (datasetLabel.includes('Ahorros Brutos')) {
                                return `Prima semanal: $${primaSemanal}`;
                            }
                            
                            if (datasetLabel.includes('Proyección Optimista')) {
                                if (semana <= primasPagadas) {
                                    return `Datos históricos reales`;
                                } else {
                                    const rentabilidadOptimista = Math.min(rentabilidadPromedio * 1.5, 4.0);
                                    return `Escenario optimista\nRentabilidad: ${rentabilidadOptimista.toFixed(1)}%`;
                                }
                            }
                            
                            if (datasetLabel.includes('Proyección Pesimista')) {
                                if (semana <= primasPagadas) {
                                    return `Datos históricos reales`;
                                } else {
                                    const rentabilidadPesimista = Math.max(rentabilidadPromedio * 0.5, -1.0);
                                    return `Escenario pesimista\nRentabilidad: ${rentabilidadPesimista.toFixed(1)}%`;
                                }
                            }
                            
                            if (datasetLabel.includes('Valorización Real')) {
                                if (dataIndex < rentabilidadesReales.length) {
                                    const rentabilidad = rentabilidadesReales[dataIndex];
                                    return `Rentabilidad real: ${rentabilidad}%`;
                                } else {
                                    return `Datos históricos reales`;
                                }
                            }
                            
                            return `Semana ${semana}`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    beginAtZero: false,
                    min: minProyeccion - espacioInferior,
                    max: maxProyeccion + margenSuperior,
                    ticks: {
                        font: {
                            size: 10
                        },
                        callback: function(value) {
                            return '$' + (value / 1000).toFixed(0) + 'K';
                        },
                        color: '#666'
                    },
                    grid: {
                        color: 'rgba(0,0,0,0.1)',
                        drawBorder: false
                    },
                    border: {
                        display: false
                    },
                    title: {
                        display: true,
                        text: 'Valor de Inversión',
                        font: {
                            size: 12
                        },
                        color: '#666'
                    }
                },
                x: {
                    ticks: {
                        font: {
                            size: 10
                        },
                        color: function(context) {
                            const semana = context.tick.value + 1;
                            return semana > primasPagadas ? '#999' : '#666';
                        },
                        maxTicksLimit: 12,
                        callback: function(value, index) {
                            const semana = this.getLabelForValue(value);
                            if (semana === primasPagadas) {
                                return 'Sem ' + semana + ' ✓';
                            }
                            if (semana === primasPagadas + 1) {
                                return 'Sem ' + semana + ' ⟶';
                            }
                            if (semana === semanasTotal) {
                                return 'Sem ' + semana + ' (Meta)';
                            }
                            return 'Sem ' + semana;
                        }
                    },
                    grid: {
                        color: function(context) {
                            const semana = context.tick.value + 1;
                            if (semana === primasPagadas + 1) {
                                return 'rgba(255, 152, 0, 0.5)';
                            }
                            return 'rgba(0,0,0,0.1)';
                        },
                        lineWidth: function(context) {
                            const semana = context.tick.value + 1;
                            return semana === primasPagadas + 1 ? 2 : 1;
                        }
                    },
                    border: {
                        display: false
                    }
                }
            },
            elements: {
                point: {
                    radius: 0,
                    hoverRadius: 4
                }
            },
            interaction: {
                intersect: false,
                mode: 'index'
            }
        }
    });
}

/* ===== FUNCIÓN PARA ACTUALIZAR EL CAMINANTE ===== */
function updateWalker(progreso, semanaActual, semanasTotal) {
    const progressFill = document.getElementById('walkerProgressFill');
    const walkerIcon = document.getElementById('walkerIcon');
    const walkerText = document.getElementById('walkerText');
    const progressLine = document.querySelector('.walker-progress-line');
    
    if (!progressFill || !walkerIcon || !walkerText || !progressLine) {
        return;
    }
    
    progressFill.style.width = progreso + '%';
    
    const containerWidth = progressLine.offsetWidth;
    const walkerPosition = (containerWidth * progreso / 100) - 15;
    
    walkerIcon.style.left = Math.max(0, walkerPosition) + 'px';
    walkerText.textContent = `${Math.round(progreso)}%`;
}

/* ===== INICIALIZACIÓN COMPLETA DEL PROYECTO ===== */
async function initializeProject() {
    try {
        const metadata = await loadMetadata();
        updateHTMLWithMetadata(metadata);
        await createChart();
    } catch (error) {
        await createChart();
    }
}

document.addEventListener('DOMContentLoaded', initializeProject);

/* ===== FUNCIÓN PARA LEER METADATOS DEL CSV ===== */
async function loadMetadata() {
    try {
        const response = await fetch('data/metadata_proyecto.csv');
        const csvText = await response.text();
        
        const lines = csvText.trim().split('\n');
        const metadata = {};
        
        lines.slice(1).forEach(line => {
            const [campo, valor] = line.split(',');
            metadata[campo] = valor;
        });
        
        return metadata;
    } catch (error) {
        return {};
    }
}

/* ===== FUNCIÓN PARA ACTUALIZAR HTML CON METADATOS ===== */
function updateHTMLWithMetadata(metadata) {
    const updateElement = (selector, value) => {
        const element = document.querySelector(selector);
        if (element && value !== undefined) {
            element.textContent = value;
        }
    };

    const detailValues = document.querySelectorAll('.detail-value');
    if (detailValues.length >= 7) {
        detailValues[0].textContent = metadata.tomador || 'Nombres y Apellidos';
        detailValues[1].textContent = metadata.tipo_identificacion_tomador || 'CC 000000000';
        detailValues[2].textContent = metadata.asegurado || 'Nombres y Apellidos';
        detailValues[3].textContent = metadata.tipo_identificacion_asegurado || 'CC 000000000';
        detailValues[4].textContent = metadata.cuenta_poliza || '00000';
        detailValues[5].textContent = metadata.producto || 'Previsional';
        detailValues[6].textContent = metadata.portafolio || 'Conservador';
        if (detailValues[7]) detailValues[7].textContent = metadata.fecha_efecto || 'Enero 5 de 2025';
        if (detailValues[8]) detailValues[8].textContent = metadata.fecha_fin_periodo || 'Enero 5 de 2030';
        if (detailValues[9]) detailValues[9].textContent = metadata.estado_poliza || 'Activa';
        if (detailValues[10]) detailValues[10].textContent = metadata.fecha_primer_vencimiento || 'Mayo 31 de 2025';
    }

    updateElement('.bubble-aportes span:last-child', `$${metadata.primas_recaudadas || '14,580'}`);
    updateElement('.bubble-rendimientos span:last-child', `$${metadata.valorizacion_acumulada_corte || '1,175.8'}`);
    updateElement('.bubble-acumulado span:last-child', `$${metadata.saldo_actual || '15,755.8'}`);
    
    const chartValues = document.querySelectorAll('.value-amount');
    if (chartValues.length >= 8) {
        chartValues[0].textContent = `$ ${metadata.valor_objetivo_inversion || '29,160'}`;
        chartValues[1].textContent = `$ ${metadata.valor_asegurado_fallecimiento || '350.000.000'}`;
        chartValues[2].textContent = metadata.forma_pago || 'Semanal';
        chartValues[3].textContent = metadata.primas_pagadas || '27';
        chartValues[4].textContent = metadata.primas_pendientes || '23';
        chartValues[5].textContent = metadata.primas_en_mora || '0';
        chartValues[6].textContent = `$ ${metadata.primas_recaudadas || '14,580'}`;
        chartValues[7].textContent = `$ ${metadata.valorizacion_acumulada_corte || '1,175.8'}`;
        if (chartValues[8]) chartValues[8].textContent = `$ ${metadata.saldo_actual || '15,755.8'}`;
        if (chartValues[9]) chartValues[9].textContent = `${metadata.rentabilidad_promedio_obtenida || '2.8'}%`;
    }

    const performanceValues = document.querySelectorAll('.performace-row .value-amount');
    if (performanceValues.length >= 2) {
        performanceValues[0].textContent = `${metadata.rentabilidad_acumulada || '8.06'}%`;
        performanceValues[1].textContent = `${metadata.rentabilidad_promedio_semanal || '2.8'}%`;
    }

    const notaElement = document.querySelector('.nota');
    if (notaElement && metadata.nota_rentabilidad) {
        notaElement.textContent = `Nota: ${metadata.nota_rentabilidad}`;
    }

    const bonoValueElement = document.querySelector('.fidelity-text:last-child');
    if (bonoValueElement && metadata.bono_fidelidad_proyectado) {
        bonoValueElement.textContent = `$ ${parseFloat(metadata.bono_fidelidad_proyectado).toLocaleString('es-CO')},00`;
    }
}