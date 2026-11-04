// js/app.js
import { db } from './firebase-config.js';
import { adicionalesOpciones } from './constants.js';
import { mostrarAuth, verificarLogin, cerrarSesion, currentUserRole } from './auth.js';

// Exponer funciones necesarias al objeto global (window)
window.mostrarAuth = mostrarAuth;
window.verificarLogin = (tipo) => verificarLogin(tipo, () => {
    escucharDatosNube();
    obtenerSiguienteNumeroPresupuesto();
});
window.cerrarSesion = cerrarSesion;
window.registrarMovimientoStock = registrarMovimientoStock;
window.guardarStockInicial = guardarStockInicial;
window.eliminarMovimientoStock = eliminarMovimientoStock;
window.cambiarDivisionPresupuesto = cambiarDivisionPresupuesto;
window.generarPdfPresupuesto = generarPdfPresupuesto;
window.copiarTextoPresupuestoWhatsApp = copiarTextoPresupuestoWhatsApp;

let orders = [];
let camionesSecuenciaActual = [];
let adminVistaPlantista = false;

const appBody = document.getElementById('app-body');
const orderForm = document.getElementById('order-form');
const ordersList = document.getElementById('orders-list');
const filterDateInput = document.getElementById('filter-date');
const monthlyTotalEl = document.getElementById('monthly-total');
const monthlyCountEl = document.getElementById('monthly-count');
const dailyTotalEl = document.getElementById('daily-total');
const dailyMoneyTotalEl = document.getElementById('daily-money-total');
const aditivosContainer = document.getElementById('aditivos-container');
const selectClientHistory = document.getElementById('select-client-history');
const clientHistoryResults = document.getElementById('client-history-results');

const clienteSelect = document.getElementById('cliente-select');
const clienteInput = document.getElementById('cliente-input');
const clientContainerSelect = document.getElementById('client-container-select');
const clientContainerInput = document.getElementById('client-container-input');
const esFacturadoCheckbox = document.getElementById('es-facturado');
const condicionPagoSelect = document.getElementById('condicionPago');

const selectNuevoCamion = document.getElementById('select-nuevo-camion');
const secuenciaListaContainer = document.getElementById('secuencia-lista-container');
const printDateTitle = document.getElementById('print-date-title');

const formTitle = document.getElementById('form-title');
const btnSubmit = document.getElementById('btn-submit');
const btnCancel = document.getElementById('btn-cancel');
const editIdInput = document.getElementById('edit-id');

const todayStr = new Date().toISOString().split('T')[0];
document.getElementById('fecha').value = todayStr;
filterDateInput.value = todayStr;

window.alternarVistaAdmin = function() {
    if (currentUserRole !== 'admin') return;
    adminVistaPlantista = !adminVistaPlantista;
    const btnToggle = document.getElementById('btn-toggle-vista');
    if (adminVistaPlantista) {
        appBody.classList.add('operator-mode-temp');
        btnToggle.textContent = "👁️ Ver con Precios (Facturación)";
        btnToggle.style.backgroundColor = "#27ae60";
    } else {
        appBody.classList.remove('operator-mode-temp');
        btnToggle.textContent = "👁️ Cambiar a Vista Plantista";
        btnToggle.style.backgroundColor = "#2980b9";
    }
};

window.dispararImpresion = function() {
    setTimeout(() => { window.print(); }, 100);
};

window.cambiarPestaña = function(nombreTab, elementoBtn) {
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById(`tab-${nombreTab}`).classList.add('active');
    if (elementoBtn) elementoBtn.classList.add('active');
};

window.habilitarNuevoCliente = function() {
    clientContainerSelect.style.display = 'none';
    clientContainerInput.style.display = 'flex';
    clienteInput.value = '';
    clienteInput.focus();
};

window.cancelarNuevoCliente = function() {
    clientContainerInput.style.display = 'none';
    clientContainerSelect.style.display = 'flex';
    clienteInput.value = '';
};

window.agregarCamionSecuencia = function() {
    const val = selectNuevoCamion.value;
    if (!val) return;
    camionesSecuenciaActual.push(val);
    selectNuevoCamion.value = "";
    renderizarSecuenciaUI();
};

window.quitarCamionSecuencia = function(index) {
    camionesSecuenciaActual.splice(index, 1);
    renderizarSecuenciaUI();
};

function renderizarSecuenciaUI() {
    secuenciaListaContainer.innerHTML = '';
    if (camionesSecuenciaActual.length === 0) {
        secuenciaListaContainer.innerHTML = `<em style="color: #7f8c8d; font-size: 11px;" id="secuencia-vacia-msg">Sin camiones asignados.</em>`;
        return;
    }
    camionesSecuenciaActual.forEach((camion, idx) => {
        const div = document.createElement('div');
        div.className = 'secuencia-item';
        div.innerHTML = `
            <span>${idx + 1}º: <strong>${camion}</strong></span>
            <button type="button" class="btn-remove-secuencia" onclick="window.quitarCamionSecuencia(${idx})">X</button>
        `;
        secuenciaListaContainer.appendChild(div);
    });
}

function escucharDatosNube() {
    db.collection("pedidos_hormigon").onSnapshot((snapshot) => {
        orders = [];
        snapshot.forEach((doc) => { orders.push({ firebaseId: doc.id, ...doc.data() }); });
        render();
    });

    db.collection("stock_movimientos").onSnapshot((snapshot) => {
        stockMovimientos.length = 0;
        snapshot.forEach((doc) => { stockMovimientos.push({ firebaseId: doc.id, ...doc.data() }); });
        renderizarStockMovimientos();
    });

    db.collection("stock_iniciales").onSnapshot((snapshot) => {
        snapshot.forEach((doc) => { stockIniciales[doc.id] = doc.data().cantidad || 0; });
        renderizarStockMovimientos();
    });
}

window.agregarFilaAditivo = function(nombre = '', cantidad = '', precio = '') {
    let opcionesHtml = `<option value="">-- Seleccionar Adicional / Servicio --</option>`;
    adicionalesOpciones.forEach(op => {
        opcionesHtml += `<option value="${op}" ${nombre === op ? 'selected' : ''}>${op}</option>`;
    });
    const card = document.createElement('div');
    card.className = 'aditivo-card';
    card.innerHTML = `
        <div class="aditivo-card-header">
            <span>Subproducto / Servicio Adicional</span>
            <button type="button" class="btn-remove-item" onclick="this.closest('.aditivo-card').remove()">X</button>
        </div>
        <div class="subproducto-field"><label>Descripción</label><select class="aditivo-nombre">${opcionesHtml}</select></div>
        <div class="subproducto-field"><label>Cantidad Consumida</label><input type="number" step="0.01" class="aditivo-cantidad" value="${cantidad}"></div>
        <div class="subproducto-field"><label>Precio Unitario ($ + IVA)</label><input type="number" step="0.01" class="aditivo-precio" value="${precio}"></div>
    `;
    aditivosContainer.appendChild(card);
};

orderForm.addEventListener('submit', function(e) {
    e.preventDefault();
    if (currentUserRole !== 'admin') return;
    const idEditing = editIdInput.value;
    let clienteFinal = clientContainerInput.style.display === 'flex' ? clienteInput.value.trim() : clienteSelect.value;
    if (!clienteFinal) { alert("Por favor, seleccioná o ingresá un cliente."); return; }

    const aditivosCards = document.querySelectorAll('.aditivo-card');
    let aditivosList = [];
    aditivosCards.forEach(card => {
        let nombre = card.querySelector('.aditivo-nombre').value.trim();
        let cantidad = parseFloat(card.querySelector('.aditivo-cantidad').value) || 0;
        let precio = parseFloat(card.querySelector('.aditivo-precio').value) || 0;
        if (nombre !== '') aditivosList.push({ nombre, cantidad, precio });
    });

    const orderData = {
        fecha: document.getElementById('fecha').value,
        hora: document.getElementById('hora').value,
        cliente: clienteFinal,
        facturado: esFacturadoCheckbox.checked,
        camiones: [...camionesSecuenciaActual],
        tipoHormigon: document.getElementById('tipoHormigon').value.trim(),
        condicionPago: condicionPagoSelect.value,
        precioUnitario: parseFloat(document.getElementById('precioUnitario').value) || 0,
        aditivos: aditivosList,
        ubicacion: document.getElementById('ubicacion').value.trim(),
        cantidad: document.getElementById('cantidad').value.trim(),
        observaciones: document.getElementById('observaciones').value.trim(),
        entregado: false
    };

    if (idEditing) {
        db.collection("pedidos_hormigon").doc(idEditing).update(orderData).then(() => {
            window.resetForm();
            alert("¡Pedido actualizado!");
            window.cambiarPestaña('despacho', document.querySelector('.tab-btn'));
        });
    } else {
        orderData.id = Date.now();
        db.collection("pedidos_hormigon").add(orderData).then(() => {
            window.cancelarNuevoCliente();
            esFacturadoCheckbox.checked = false;
            camionesSecuenciaActual = [];
            renderizarSecuenciaUI();
            document.getElementById('tipoHormigon').value = '';
            document.getElementById('precioUnitario').value = '';
            condicionPagoSelect.value = 'normal';
            document.getElementById('cantidad').value = '';
            document.getElementById('observaciones').value = '';
            aditivosContainer.innerHTML = '';
            alert("¡Pedido guardado!");
            window.cambiarPestaña('despacho', document.querySelector('.tab-btn'));
        });
    }
});

window.editOrder = function(firebaseId) {
    const orderToEdit = orders.find(order => order.firebaseId === firebaseId);
    if (!orderToEdit) return;
    if (currentUserRole === 'plantista') {
        let nuevoVolumen = prompt("Modificar Volumen / m³ del pedido:", orderToEdit.cantidad);
        if (nuevoVolumen !== null && nuevoVolumen.trim() !== "") {
            db.collection("pedidos_hormigon").doc(firebaseId).update({ cantidad: nuevoVolumen.trim() });
        }
        return;
    }
    if (currentUserRole === 'factura') {
        let nuevoPrecioH = prompt(`Precio Unitario Hormigón (${orderToEdit.tipoHormigon}) [+ IVA]:`, orderToEdit.precioUnitario || 0);
        if (nuevoPrecioH !== null && !isNaN(nuevoPrecioH)) {
            db.collection("pedidos_hormigon").doc(firebaseId).update({ precioUnitario: parseFloat(nuevoPrecioH) });
        }
        return;
    }
    editIdInput.value = orderToEdit.firebaseId;
    document.getElementById('fecha').value = orderToEdit.fecha;
    document.getElementById('hora').value = orderToEdit.hora;
    window.cancelarNuevoCliente();
    clienteSelect.value = orderToEdit.cliente;
    esFacturadoCheckbox.checked = !!orderToEdit.facturado;
    camionesSecuenciaActual = orderToEdit.camiones ? [...orderToEdit.camiones] : [];
    renderizarSecuenciaUI();
    document.getElementById('tipoHormigon').value = orderToEdit.tipoHormigon;
    condicionPagoSelect.value = orderToEdit.condicionPago || 'normal';
    document.getElementById('precioUnitario').value = orderToEdit.precioUnitario || '';
    document.getElementById('ubicacion').value = orderToEdit.ubicacion;
    document.getElementById('cantidad').value = orderToEdit.cantidad;
    document.getElementById('observaciones').value = orderToEdit.observaciones;
    aditivosContainer.innerHTML = '';
    if (orderToEdit.aditivos && Array.isArray(orderToEdit.aditivos)) {
        orderToEdit.aditivos.forEach(item => {
            if (typeof item === 'string') window.agregarFilaAditivo(item, 1, 0);
            else window.agregarFilaAditivo(item.nombre, item.cantidad, item.precio);
        });
    }
    formTitle.textContent = "Editar Turno / Pedido";
    btnSubmit.textContent = "Actualizar Pedido";
    btnCancel.style.display = "block";
    window.cambiarPestaña('carga', document.querySelectorAll('.tab-btn')[1]);
};

window.duplicateOrder = function(firebaseId) {
    if (currentUserRole !== 'admin') return;
    const orderToDuplicate = orders.find(order => order.firebaseId === firebaseId);
    if (!orderToDuplicate) return;
    editIdInput.value = '';
    document.getElementById('fecha').value = todayStr;
    document.getElementById('hora').value = orderToDuplicate.hora;
    window.cancelarNuevoCliente();
    clienteSelect.value = orderToDuplicate.cliente;
    esFacturadoCheckbox.checked = !!orderToDuplicate.facturado;
    camionesSecuenciaActual = orderToDuplicate.camiones ? [...orderToDuplicate.camiones] : [];
    renderizarSecuenciaUI();
    document.getElementById('tipoHormigon').value = orderToDuplicate.tipoHormigon;
    condicionPagoSelect.value = orderToDuplicate.condicionPago || 'normal';
    document.getElementById('precioUnitario').value = orderToDuplicate.precioUnitario || '';
    document.getElementById('ubicacion').value = orderToDuplicate.ubicacion;
    document.getElementById('cantidad').value = orderToDuplicate.cantidad;
    document.getElementById('observaciones').value = orderToDuplicate.observaciones;
    aditivosContainer.innerHTML = '';
    if (orderToDuplicate.aditivos && Array.isArray(orderToDuplicate.aditivos)) {
        orderToDuplicate.aditivos.forEach(item => {
            if (typeof item === 'string') window.agregarFilaAditivo(item, 1, 0);
            else window.agregarFilaAditivo(item.nombre, item.cantidad, item.precio);
        });
    }
    formTitle.textContent = "Duplicar Turno / Pedido";
    btnSubmit.textContent = "Guardar como Nuevo Pedido";
    btnCancel.style.display = "block";
    window.cambiarPestaña('carga', document.querySelectorAll('.tab-btn')[1]);
};

window.resetForm = function() {
    editIdInput.value = '';
    orderForm.reset();
    document.getElementById('fecha').value = filterDateInput.value;
    window.cancelarNuevoCliente();
    esFacturadoCheckbox.checked = false;
    condicionPagoSelect.value = 'normal';
    camionesSecuenciaActual = [];
    renderizarSecuenciaUI();
    aditivosContainer.innerHTML = '';
    formTitle.textContent = "Cargar Nuevo Turno / Pedido";
    btnSubmit.textContent = "Guardar Pedido";
    btnCancel.style.display = "none";
};

window.deleteOrder = function(firebaseId) {
    if (currentUserRole !== 'admin') return;
    if (confirm('¿Estás seguro de que deseas eliminar este pedido?')) {
        db.collection("pedidos_hormigon").doc(firebaseId).delete();
    }
};

window.toggleEntregado = function(firebaseId) {
    const orden = orders.find(o => o.firebaseId === firebaseId);
    if (!orden) return;
    const nuevoEstado = !orden.entregado;
    db.collection("pedidos_hormigon").doc(firebaseId).update({ entregado: nuevoEstado });
};

function actualizarListasClientes() {
    if (currentUserRole !== 'admin') return;
    const clientesSet = [...new Set(orders.map(o => o.cliente))].filter(Boolean).sort();
    clienteSelect.innerHTML = `<option value="">-- Seleccionar Cliente --</option>`;
    clientesSet.forEach(c => {
        const opt = document.createElement('option'); opt.value = c; opt.textContent = c; clienteSelect.appendChild(opt);
    });
    selectClientHistory.innerHTML = `<option value="">-- Seleccionar Cliente --</option>`;
    clientesSet.forEach(c => {
        const opt = document.createElement('option'); opt.value = c; opt.textContent = c; selectClientHistory.appendChild(opt);
    });
}

window.limpiarFiltroFechasCliente = function() {
    document.getElementById('client-start-date').value = '';
    document.getElementById('client-end-date').value = '';
    window.verHistorialCliente();
};

window.verHistorialCliente = function() {
    const clienteBuscado = selectClientHistory.value;
    if (!clienteBuscado) { clientHistoryResults.innerHTML = ''; return; }
    
    const fechaDesde = document.getElementById('client-start-date').value;
    const fechaHasta = document.getElementById('client-end-date').value;

    let pedidosCliente = orders.filter(o => o.cliente && o.cliente.toLowerCase() === clienteBuscado.toLowerCase());

    if (fechaDesde) pedidosCliente = pedidosCliente.filter(o => o.fecha >= fechaDesde);
    if (fechaHasta) pedidosCliente = pedidosCliente.filter(o => o.fecha <= fechaHasta);

    pedidosCliente.sort((a, b) => b.fecha.localeCompare(a.fecha));

    if (pedidosCliente.length === 0) { 
        clientHistoryResults.innerHTML = `<em>No hay registros en el período seleccionado.</em>`; 
        return; 
    }
    
    let totalMetrosCuadrados = 0, totalDineroCliente = 0;
    
    let html = `<div id="pdf-historial-content" style="background: #fff; padding: 10px; border-radius: 4px;">`;
    html += `<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">`;
    html += `<strong style="font-size: 14px; color: var(--primary-color);">Historial de ${clienteBuscado}</strong>`;
    html += `<span style="font-size: 11px; color: #555;">Período: ${fechaDesde || 'Inicio'} al ${fechaHasta || 'Actualidad'}</span></div>`;
    
    html += `<div style="max-height: 250px; overflow-y: auto; border: 1px solid #a9cce3; background: #fff; padding: 8px; border-radius: 4px;">`;
    html += `<table style="margin:0; font-size:12px;"><thead><tr><th>Fecha</th><th>Hora</th><th>Obra</th><th>H° / Extras</th><th>Volumen</th><th>Condición</th><th>Total Pedido</th></tr></thead><tbody>`;
    
    pedidosCliente.forEach(p => {
        let vol = parseFloat(p.cantidad) || 0;
        totalMetrosCuadrados += vol;
        let precioU = p.precioUnitario || 0;
        let subHormigon = vol * precioU;
        let subExtras = 0;
        if (p.aditivos && Array.isArray(p.aditivos)) {
            p.aditivos.forEach(item => {
                if (typeof item === 'object') subExtras += (parseFloat(item.cantidad) || 0) * (parseFloat(item.precio) || 0);
            });
        }
        let cond = p.condicionPago || 'normal';
        let totalItem = (cond === 'normal') ? (subHormigon + subExtras) : 0;
        if (cond === 'normal') totalDineroCliente += totalItem;
        let condTexto = cond === 'compensacion' ? 'Trueque' : (cond === 'acopio' ? 'Acopio' : 'Cta. Cte.');
        html += `<tr><td>${p.fecha}</td><td>${p.hora}</td><td>${p.ubicacion}</td><td><strong>${p.tipoHormigon}</strong></td><td>${p.cantidad}</td><td>${condTexto}</td><td><strong>$${totalItem.toLocaleString()}</strong></td></tr>`;
    });
    html += `</tbody></table></div>`;
    
    html += `<div style="margin-top: 10px; background: #d4efdf; padding: 8px 12px; border-radius: 4px; display: flex; justify-content: space-between; font-weight: bold; font-size: 13px; color: #145a32;">`;
    html += `<span>Volumen Total: ${totalMetrosCuadrados.toFixed(2)} m³</span>`;
    html += `<span>Total a Cobrar (+ IVA): $${totalDineroCliente.toLocaleString()}</span>`;
    html += `</div></div>`;

    html += `<div style="margin-top: 12px; display: flex; gap: 10px; justify-content: flex-end; flex-wrap: wrap;">`;
    html += `<button type="button" class="btn-print" onclick="window.exportarHistorialPDF('${clienteBuscado}')" style="background: #2980b9; padding: 8px 15px; font-size: 12px;">📥 Descargar Historial en PDF</button>`;
    html += `<button type="button" class="btn-print" onclick="window.enviarHistorialWhatsApp('${clienteBuscado}', ${totalMetrosCuadrados.toFixed(2)}, ${totalDineroCliente})" style="background: #27ae60; padding: 8px 15px; font-size: 12px;">💬 Enviar Resumen por WhatsApp</button>`;
    html += `</div>`;

    clientHistoryResults.innerHTML = html;
};

window.exportarHistorialPDF = async function(nombreCliente) {
    const elemento = document.getElementById('pdf-historial-content');
    if (!elemento) return;
    const scrollableDiv = elemento.querySelector('div[style*="max-height"]');
    const originalMaxHeight = scrollableDiv ? scrollableDiv.style.maxHeight : '';
    const originalOverflow = scrollableDiv ? scrollableDiv.style.overflowY : '';
    
    if (scrollableDiv) {
        scrollableDiv.style.maxHeight = 'none';
        scrollableDiv.style.overflowY = 'visible';
    }

    try {
        const canvas = await html2canvas(elemento, { scale: 2, useCORS: true });
        if (scrollableDiv) {
            scrollableDiv.style.maxHeight = originalMaxHeight;
            scrollableDiv.style.overflowY = originalOverflow;
        }

        const imgData = canvas.toDataURL('image/jpeg', 0.95);
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        const imgHeight = (canvas.height * pdfWidth) / canvas.width;
        
        let heightLeft = imgHeight;
        let position = 35;

        pdf.setFontSize(16);
        pdf.text("GyE S.R.L. - División Hormigón", 14, 15);
        pdf.setFontSize(11);
        pdf.text(`Resumen de Cuenta / Historial: ${nombreCliente}`, 14, 22);
        pdf.text(`Fecha de emisión: ${new Date().toLocaleDateString('es-AR')}`, 14, 28);

        pdf.addImage(imgData, 'JPEG', 14, position, pdfWidth - 28, imgHeight);
        heightLeft -= (pdfHeight - position);

        while (heightLeft >= 0) {
            position = heightLeft - imgHeight;
            pdf.addPage();
            pdf.addImage(imgData, 'JPEG', 14, position, pdfWidth - 28, imgHeight);
            heightLeft -= pdfHeight;
        }

        pdf.save(`Historial_${nombreCliente.replace(/\s+/g, '_')}.pdf`);
    } catch (e) {
        if (scrollableDiv) {
            scrollableDiv.style.maxHeight = originalMaxHeight;
            scrollableDiv.style.overflowY = originalOverflow;
        }
        console.error(e);
        alert("Hubo un error al generar el PDF del historial.");
    }
};

window.enviarHistorialWhatsApp = function(nombreCliente, totalMetros, totalDinero) {
    const fechaDesde = document.getElementById('client-start-date').value || 'Inicio';
    const fechaHasta = document.getElementById('client-end-date').value || 'Actualidad';

    let mensaje = `🏗️ *RESUMEN DE CUENTA - GYE S.R.L.*\n`;
    mensaje += `👤 *Cliente:* ${nombreCliente}\n`;
    mensaje += `📅 *Período:* ${fechaDesde} al ${fechaHasta}\n\n`;
    mensaje += `📦 *Volumen Total:* ${totalMetros} m³\n`;
    mensaje += `💰 *Total a Cobrar:* $${totalDinero.toLocaleString('es-AR')} (+ IVA)\n\n`;
    mensaje += `Quedamos a disposición por cualquier consulta. ¡Saludos!`;

    navigator.clipboard.writeText(mensaje).then(() => {
        alert("¡Resumen copiado al portapapeles! Ya podés pegarlo en el chat de WhatsApp.");
    });
};

window.calcularRangoFechas = function() {
    const startStr = document.getElementById('range-start-date').value;
    const endStr = document.getElementById('range-end-date').value;
    const resultsEl = document.getElementById('range-results');
    if (!startStr || !endStr) { alert("Seleccioná ambas fechas."); return; }
    const pedidosRango = orders.filter(o => o.fecha >= startStr && o.fecha <= endStr).sort((a, b) => a.fecha.localeCompare(b.fecha));
    if (pedidosRango.length === 0) { resultsEl.innerHTML = `<em>No se encontraron pedidos en el rango.</em>`; return; }
    
    let totalMetros = 0, totalDinero = 0;
    pedidosRango.forEach(p => {
        let vol = parseFloat(p.cantidad) || 0;
        totalMetros += vol;
        let subH = vol * (p.precioUnitario || 0);
        let subE = 0;
        if (p.aditivos) p.aditivos.forEach(i => { if(typeof i==='object') subE += (i.cantidad||0)*(i.precio||0); });
        if ((p.condicionPago || 'normal') === 'normal') totalDinero += (subH + subE);
    });
    resultsEl.innerHTML = `<strong>Total Volumen: ${totalMetros.toFixed(2)} m³ | Facturación: $${totalDinero.toLocaleString()} (+ IVA)</strong>`;
};

function render() {
    let selectedDate = filterDateInput.value;
    if (currentUserRole === 'factura' && selectedDate >= todayStr) {
        let ayer = new Date(); ayer.setDate(ayer.getDate() - 1);
        selectedDate = ayer.toISOString().split('T')[0];
        filterDateInput.value = selectedDate;
    }
    printDateTitle.textContent = selectedDate;
    ordersList.innerHTML = '';

    const filteredOrders = orders.filter(order => order.fecha === selectedDate).sort((a, b) => a.hora.localeCompare(b.hora));
    let dailySum = 0, dailyMoneySum = 0;

    if (filteredOrders.length === 0) {
        ordersList.innerHTML = `<tr><td colspan="10" style="text-align: center; color: #7f8c8d;">No hay pedidos cargados para esta fecha.</td></tr>`;
    } else {
        filteredOrders.forEach(order => {
            let numVal = parseFloat(order.cantidad);
            if (!isNaN(numVal)) dailySum += numVal;
            let precioU = order.precioUnitario || 0;
            let subHormigon = (!isNaN(numVal) ? numVal : 0) * precioU;
            let subExtras = 0;
            
            let aditivosHtml = '';
            if (order.aditivos && Array.isArray(order.aditivos) && order.aditivos.length > 0) {
                aditivosHtml = '<div style="margin-top: 4px; font-size: 11px; color: #d35400;"><strong>Extras:</strong><ul style="margin: 0; padding-left: 15px;">';
                order.aditivos.forEach(item => {
                    if (typeof item === 'object') {
                        let costoItem = (parseFloat(item.cantidad) || 0) * (parseFloat(item.precio) || 0);
                        subExtras += costoItem;
                        aditivosHtml += `<li>${item.nombre} (Cant: ${item.cantidad}) ${item.precio > 0 ? '- $' + costoItem.toLocaleString() + ' + IVA' : ''}</li>`;
                    } else if (typeof item === 'string') {
                        aditivosHtml += `<li>${item}</li>`;
                    }
                });
                aditivosHtml += '</ul></div>';
            }

            let condicion = order.condicionPago || 'normal';
            let totalItem = 0;
            if (condicion === 'normal') {
                totalItem = subHormigon + subExtras;
                dailyMoneySum += totalItem;
            }
            
            let facturaBadge = order.facturado ? `<span class="print-badge-factura" style="background: #27ae60; color: white; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: bold;">FACTURADO</span>` : `<span class="print-badge-factura" style="background: #95a5a6; color: white; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: bold;">SIN FACTURA</span>`;
            let camionesBadges = (order.camiones && order.camiones.length > 0) ? order.camiones.map((c, idx) => `<span class="print-badge-camion" style="background: #2c3e50; color: white; padding: 2px 6px; border-radius: 4px; font-size: 11px; font-weight: bold; display: inline-block; margin: 1px;">${idx + 1}º ${c}</span>`).join(' ') : `<span style="color: #95a5a6; font-style: italic;">Sin asignar</span>`;

            let accionesHtml = '';
            let btnEntregadoHtml = `<button type="button" class="btn-edit" onclick="window.toggleEntregado('${order.firebaseId}')" style="background-color: ${order.entregado ? '#7f8c8d' : '#27ae60'}; padding: 4px 8px; font-size: 11px; margin-bottom: 3px;">${order.entregado ? '↩️ Deshacer' : '✅ Entregado'}</button>`;

            if (currentUserRole === 'admin') {
                accionesHtml = `<div class="action-buttons">${btnEntregadoHtml}<button class="btn-edit" onclick="window.editOrder('${order.firebaseId}')">Editar</button><button class="btn-duplicate" onclick="window.duplicateOrder('${order.firebaseId}')">Duplicar</button><button class="btn-delete" onclick="window.deleteOrder('${order.firebaseId}')">Borrar</button></div>`;
            } else if (currentUserRole === 'plantista') {
                accionesHtml = `<div class="action-buttons">${btnEntregadoHtml}<button class="btn-edit" onclick="window.editOrder('${order.firebaseId}')">Editar Vol.</button></div>`;
            } else if (currentUserRole === 'factura') {
                accionesHtml = `<button class="btn-edit" onclick="window.editOrder('${order.firebaseId}')" style="background-color: #27ae60;">Asignar Precio</button>`;
            } else {
                accionesHtml = `<button class="btn-edit" onclick="window.editOrder('${order.firebaseId}')">Editar Vol.</button>`;
            }

            const row = document.createElement('tr');
            if (order.entregado) row.className = 'pedido-entregado';

            row.innerHTML = `
                <td><strong>${order.hora}</strong></td>
                <td style="text-align: center;">${camionesBadges}</td>
                <td>${order.cliente}<br>${facturaBadge}</td>
                <td><strong>${order.tipoHormigon}</strong>${aditivosHtml}</td>
                <td>${order.ubicacion}</td>
                <td><strong>${order.cantidad}</strong></td>
                <td class="factura-only">H°: $${precioU.toLocaleString()} + IVA ${subExtras > 0 ? '<br><small>Extras: $' + subExtras.toLocaleString() + '</small>' : ''}</td>
                <td class="factura-only" style="font-weight: bold; color: ${condicion === 'normal' ? '#27ae60' : '#7f8c8d'};">${condicion === 'normal' ? '$' + totalItem.toLocaleString() + ' + IVA' : 'Compensado'}</td>
                <td><span class="print-obs" style="font-size: 12px; color: #e67e22;">${order.observaciones || '-'}</span></td>
                <td class="col-acciones">${accionesHtml}</td>
            `;
            ordersList.appendChild(row);
        });
    }
    dailyTotalEl.textContent = dailySum.toFixed(2);
    dailyMoneyTotalEl.textContent = dailyMoneySum.toLocaleString();

    if (currentUserRole === 'admin') {
        const currentMonth = selectedDate.substring(0, 7);
        let monthlySum = 0, monthlyCount = 0;
        orders.forEach(order => {
            if (!isNaN(parseFloat(order.cantidad)) && order.fecha.startsWith(currentMonth)) monthlySum += parseFloat(order.cantidad);
            if (order.fecha.startsWith(currentMonth)) monthlyCount++;
        });
        monthlyTotalEl.textContent = monthlySum.toFixed(2);
        monthlyCountEl.textContent = monthlyCount;
        actualizarListasClientes();
        if (selectClientHistory.value) window.verHistorialCliente();
    }
}
filterDateInput.addEventListener('change', render);

setTimeout(() => {
    agregarFilaItemPresupuesto();
}, 800);