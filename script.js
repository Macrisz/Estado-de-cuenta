/* ===== FUNCIÓN PARA LEER DATOS DEL CSV DE INVERSIÓN ===== */
async function loadCSVData() {
    const response = await fetch('data/datos_inversion.csv');
    const csvText = await response.text();
    
    const lines = csvText.trim().split('\n');
    const data = lines.slice(1).map(line => {
        const values = line.split(',');
        return {
            mes: parseInt(values[0]),
            prima_mensual: parseInt(values[1]),
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
    const data = await loadCSVData();
    const ctx = document.getElementById('growthChart').getContext('2d');
    
    const primasPagadas = 10;
    const mesesTotal = 60;
    const primaMensual = 540;
    
    const ahorrosBrutos = data.map(d => d.ahorros_brutos);
    const proyeccionTotal = data.map(d => d.proyeccion_total);
    
    const mesesCompletos = Array.from({length: mesesTotal}, (_, i) => i + 1);
    const mesesProyectados = mesesCompletos.slice(primasPagadas);
    
    const ahorrosBrutosReales = ahorrosBrutos.slice(0, primasPagadas);
    const valorizacionReal = proyeccionTotal.slice(0, primasPagadas);
    
    const ahorrosBrutosCompletos = [...ahorrosBrutosReales];
    
    for (let i = primasPagadas; i < mesesTotal; i++) {
        ahorrosBrutosCompletos.push((i + 1) * primaMensual);
    }
    
    const ultimaValorizacionReal = valorizacionReal[valorizacionReal.length - 1];
    
    // ===== PROYECCIÓN NARANJA HASTA $40,786 =====
    const valorObjetivo = 40786;
    const lineaProyeccionNaranja = [...valorizacionReal];
    
    // Calcular proyección lineal desde el último punto real hasta el objetivo
    for (let i = primasPagadas; i < mesesTotal; i++) {
        const progreso = (i - primasPagadas + 1) / (mesesTotal - primasPagadas);
        const valorProyectado = ultimaValorizacionReal + (valorObjetivo - ultimaValorizacionReal) * progreso;
        lineaProyeccionNaranja.push(valorProyectado);
    }
    
    // Calcular rango del gráfico
    const maxProyeccion = Math.max(...ahorrosBrutosCompletos, ...lineaProyeccionNaranja);
    const margenSuperior = maxProyeccion * 0.1;
    
    const growthChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: mesesCompletos,
            datasets: [
                {
                    label: 'Ahorro bruto',
                    data: ahorrosBrutosCompletos,
                    borderColor: '#43A047',
                    backgroundColor: 'transparent',
                    borderWidth: 2,
                    fill: false,
                    tension: 0,
                    pointRadius: 0,
                    pointHoverRadius: 4,
                    order: 4
                },
                {
                    label: 'Primas aportadas',
                    data: [...valorizacionReal, ...Array(mesesProyectados.length).fill(null)],
                    borderColor: '#1976D2',
                    backgroundColor: 'transparent',
                    borderWidth: 3,
                    fill: false,
                    tension: 0.4,
                    pointRadius: function(context) {
                        return context.dataIndex === primasPagadas - 1 ? 6 : 0;
                    },
                    pointBackgroundColor: '#1976D2',
                    pointBorderColor: '#1976D2',
                    pointBorderWidth: 2,
                    pointHoverRadius: 6,
                    order: 1,
                    spanGaps: false
                },
                {
                    label: 'Proyección',
                    data: lineaProyeccionNaranja,
                    borderColor: '#FF9800',
                    backgroundColor: 'transparent',
                    borderWidth: 2,
                    fill: false,
                    tension: 0.4,
                    pointRadius: function(context) {
                        if (context.dataIndex === primasPagadas - 1) return 0;
                        if (context.dataIndex === mesesTotal - 1) return 6;
                        return 0;
                    },
                    pointBackgroundColor: '#FF9800',
                    pointBorderColor: '#FF9800',
                    pointBorderWidth: 2,
                    pointHoverRadius: 6,
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
                            const datasetLabel = context.dataset.label;
                            
                            if (datasetLabel === 'Ahorro bruto') {
                                return `Prima mensual: $${primaMensual}`;
                            }
                            
                            if (datasetLabel === 'Primas aportadas') {
                                return `Datos históricos reales`;
                            }
                            
                            if (datasetLabel === 'Proyección') {
                                return `Proyección al objetivo`;
                            }
                            
                            return '';
                        }
                    }
                }
            },
            scales: {
                y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    beginAtZero: true,
                    min: 0,
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
                        lineWidth: 1
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
                            const mes = context.tick.value + 1;
                            return mes > primasPagadas ? '#999' : '#666';
                        },
                        maxTicksLimit: 12,
                        callback: function(value, index) {
                            const mes = this.getLabelForValue(value);
                            if (mes === primasPagadas) {
                                return 'Mes ' + mes + ' ✓';
                            }
                            if (mes === mesesTotal) {
                                return 'Mes ' + mes + ' (Meta)';
                            }
                            return 'Mes ' + mes;
                        }
                    },
                    grid: {
                        color: 'rgba(0,0,0,0.1)',
                        lineWidth: 1
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

// Inicializar el gráfico cuando se carga la página
document.addEventListener('DOMContentLoaded', createChart); 