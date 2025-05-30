 /* ===== FUNCIÓN PARA LEER DATOS DEL CSV ===== */
        // Lee el archivo CSV y convierte los datos a objetos JavaScript
        async function loadCSVData() {
            const response = await fetch('datos_ahorro.csv');
            const csvText = await response.text();
            
            const lines = csvText.trim().split('\n');
            // Convierte cada línea del CSV en un objeto con las 5 columnas
            const data = lines.slice(1).map(line => {
                const values = line.split(',');
                return {
                    semana: parseInt(values[0]),
                    aportes: parseInt(values[1]),
                    ahorros_voluntarios: parseInt(values[2]),
                    rendimientos: parseInt(values[3]),
                    acumulado: parseInt(values[4])
                };
            });
            
            return data;
        }
        
        /* ===== FUNCIÓN PRINCIPAL PARA CREAR EL GRÁFICO ===== */
        // Crea el gráfico con montaña gris, línea de rendimientos y línea de ahorros voluntarios
        async function createChart() {
            const data = await loadCSVData();
            const ctx = document.getElementById('growthChart').getContext('2d');
            
            // Extrae los datos para cada línea del gráfico
            const semanas = data.map(d => d.semana);
            const acumulado = data.map(d => d.acumulado);
            const rendimientos = data.map(d => d.rendimientos);
            const ahorrosVoluntarios = data.map(d => d.ahorros_voluntarios);
            
            // ===== CÁLCULO DINÁMICO DE RANGOS PARA EJES Y =====
            // Calcula rangos para eje izquierdo (acumulado)
            const minAcumulado = Math.min(...acumulado);
            const maxAcumulado = Math.max(...acumulado);
            const rangoAcumulado = maxAcumulado - minAcumulado;
            const margenAcumulado = rangoAcumulado * 0.1; // 10% de margen superior
            const espacioCaminante = rangoAcumulado * 0.15; // 15% extra inferior para el caminante
            
            // Calcula rangos para eje derecho (rendimientos y ahorros voluntarios)
            const maxRendimientos = Math.max(...rendimientos);
            const maxAhorrosVoluntarios = Math.max(...ahorrosVoluntarios);
            const maxEjeDerecho = Math.max(maxRendimientos, maxAhorrosVoluntarios);
            const margenDerecho = maxEjeDerecho * 0.1; // 10% de margen
            
            // ===== CÁLCULO DEL PROGRESO DEL CAMINANTE =====
            // Encuentra la última semana con datos (semana actual)
            const ultimaSemana = Math.max(...semanas);
            const semanasTotal = 1150; // Total de semanas del plan
            const progreso = (ultimaSemana / semanasTotal) * 100;
            
            // Actualiza el caminante
            updateWalker(progreso, ultimaSemana, semanasTotal);
            
            const growthChart = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: semanas,
                    datasets: [
                        /* ===== MONTAÑA GRIS (AHORRO ACUMULADO TOTAL) ===== */
                        {
                            label: 'Mi ahorro acumulado',
                            data: acumulado,
                            borderColor: 'rgba(200, 200, 200, 0.8)',
                            backgroundColor: 'rgba(200, 200, 200, 0.3)', // Relleno gris translúcido
                            borderWidth: 1,
                            fill: true, // Crea el área rellena (montaña)
                            tension: 0.4,
                            pointRadius: 0,
                            pointHoverRadius: 4,
                            yAxisID: 'y', // Usa eje izquierdo (escala alta)
                            order: 3 // Se dibuja al fondo
                        },
                        /* ===== LÍNEA AZUL (RENDIMIENTOS GENERADOS) ===== */
                        {
                            label: 'Rendimientos generados',
                            data: rendimientos,
                            borderColor: '#1E88E5', // Azul vibrante
                            backgroundColor: 'transparent',
                            borderWidth: 4, // Línea gruesa para visibilidad
                            fill: false, // Solo línea, sin relleno
                            tension: 0.4,
                            pointRadius: 0,
                            pointHoverRadius: 6,
                            yAxisID: 'y1', // Usa eje derecho (escala baja)
                            order: 1 // Se dibuja al frente
                        },
                        /* ===== LÍNEA VERDE PUNTEADA (AHORROS VOLUNTARIOS) ===== */
                        {
                            label: 'Ahorros voluntarios',
                            data: ahorrosVoluntarios,
                            borderColor: '#43A047', // Verde
                            backgroundColor: 'transparent',
                            borderWidth: 3,
                            fill: false,
                            tension: 0.4,
                            pointRadius: 0,
                            pointHoverRadius: 5,
                            borderDash: [8, 4], // Línea punteada
                            yAxisID: 'y1', // Usa eje derecho (escala baja)
                            order: 2 // Se dibuja en el medio
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
                                    size: 10
                                },
                                padding: 10,
                                usePointStyle: true
                            }
                        },
                        title: {
                            display: false
                        }
                    },
                    scales: {
                        /* ===== EJE IZQUIERDO (Y) - PARA MONTAÑA GRIS ===== */
                        // Escala dinámica para el ahorro acumulado total
                        y: {
                            type: 'linear',
                            display: true,
                            position: 'left',
                            beginAtZero: false,
                            min: minAcumulado - espacioCaminante, // Mínimo dinámico con espacio para caminante
                            max: maxAcumulado + margenAcumulado, // Máximo dinámico con margen
                            ticks: {
                                font: {
                                    size: 10
                                },
                                callback: function(value) {
                                    return '$' + (value / 1000000).toFixed(0) + 'M';
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
                                text: 'Acumulado Total',
                                font: {
                                    size: 11
                                },
                                color: '#666'
                            }
                        },
                        /* ===== EJE DERECHO (Y1) - PARA LÍNEAS DE RENDIMIENTOS Y AHORROS ===== */
                        // Escala dinámica para rendimientos y ahorros voluntarios
                        y1: {
                            type: 'linear',
                            display: true,
                            position: 'right',
                            beginAtZero: true, // Empieza desde $0
                            max: maxEjeDerecho + margenDerecho, // Máximo dinámico con margen
                            ticks: {
                                font: {
                                    size: 10
                                },
                                callback: function(value) {
                                    return '$' + (value / 1000000).toFixed(0) + 'M';
                                },
                                color: '#1E88E5' // Color azul para coincidir con línea de rendimientos
                            },
                            grid: {
                                drawOnChartArea: false, // No dibuja grid para evitar confusión
                            },
                            border: {
                                display: false
                            },
                            title: {
                                display: true,
                                text: 'Rendimientos y Ahorros',
                                font: {
                                    size: 11
                                },
                                color: '#1E88E5'
                            }
                        },
                        x: {
                            ticks: {
                                font: {
                                    size: 10
                                },
                                color: '#666',
                                maxTicksLimit: 8,
                                callback: function(value, index) {
                                    const semana = this.getLabelForValue(value);
                                    return 'Sem ' + semana;
                                }
                            },
                            grid: {
                                display: false
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
        // Actualiza la posición y texto del caminante basándose en el progreso
        function updateWalker(progreso, semanaActual, semanasTotal) {
            const progressFill = document.getElementById('walkerProgressFill');
            const walkerIcon = document.getElementById('walkerIcon');
            const walkerText = document.getElementById('walkerText');
            
            // Actualiza el ancho de la barra de progreso
            progressFill.style.width = progreso + '%';
            
            // Calcula la posición del caminante dentro del contenedor del gráfico
            const containerWidth = document.querySelector('.walker-progress-line').offsetWidth;
            const walkerPosition = (containerWidth * progreso / 100) - 15; // -15 para centrar el icono
            
            // Actualiza la posición del caminante
            walkerIcon.style.left = walkerPosition + 'px';
            
            // Actualiza el texto del progreso
            walkerText.textContent = `${Math.round(progreso)}%`;
            
            // Agrega información adicional en consola para debug
            console.log(`Progreso: ${progreso.toFixed(1)}% (${semanaActual}/${semanasTotal} semanas)`);
        }
        
        /* ===== INICIALIZACIÓN DEL GRÁFICO ===== */
        // Ejecuta la función createChart cuando se carga completamente la página
        document.addEventListener('DOMContentLoaded', createChart);