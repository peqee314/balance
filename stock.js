// js/stock.js
import { db } from './firebase-config.js';
import { materialesConfig } from './constants.js';
import { currentUserRole } from './auth.js';

export let stockMovimientos = [];
export let stockIniciales = {};

export function registrarMovimientoStock(e, tipo) {
    e.preventDefault();
    let material, cantidad, obs;
    if (tipo === 'ingreso') {
        material = document.getElementById('ingreso-material').value;
        cantidad = parseFloat(document.getElementById('ingreso-cantidad').value) || 0;
        obs = document.getElementById('ingreso-remito').value.trim() || 'Sin remito';
    } else {
        material = document.getElementById('egreso-material').value;
        cantidad = parseFloat(document.getElementById('egreso-cantidad').value) || 0;
        obs = document.getElementById('egreso-obs').value.trim() || 'Consumo planta';
    }
    if (!material || cantidad <= 0) {
        alert("Seleccioná un material válido e ingresá una cantidad mayor a 0.");
        return;
    }
    const movimientoData = { fechaHora: new Date().toISOString(), tipo: tipo, material: material, cantidad: cantidad, observacion: obs };
    db.collection("stock_movimientos").add(movimientoData)
        .then(() => {
            if (tipo === 'ingreso') {
                document.getElementById('ingreso-material').value = '';
                document.getElementById('ingreso-cantidad').value = '';
                document.getElementById('ingreso-remito').value = '';
                alert("¡Ingreso de stock registrado con éxito!");
            } else {
                document.getElementById('egreso-material').value = '';
                document.getElementById('egreso-cantidad').value = '';
                document.getElementById('egreso-obs').value = '';
                alert("¡Consumo registrado con éxito!");
            }
        })
        .catch(() => { alert("Error al guardar en la base de datos."); });
}

export function guardarStockInicial(e) {
    e.preventDefault();
    if (currentUserRole !== 'admin') return;
    const material = document.getElementById('inicial-material').value;
    const cantidad = parseFloat(document.getElementById('inicial-cantidad').value) || 0;
    if (!material) { alert("Seleccioná un material."); return; }
    db.collection("stock_iniciales").doc(material).set({ cantidad: cantidad })
        .then(() => {
            document.getElementById('inicial-material').value = '';
            document.getElementById('inicial-cantidad').value = '';
            alert(`¡Stock inicial actualizado!`);
        });
}

export function eliminarMovimientoStock(firebaseId) {
    if (currentUserRole !== 'admin') return;
    if (confirm("¿Estás seguro de eliminar este registro?")) {
        db.collection("stock_movimientos").doc(firebaseId).delete();
    }
}

export function calcularStockActual() {
    let totalesIngresos = {}, totalesEgresos = {};
    materialesConfig.forEach(m => { totalesIngresos[m.nombre] = 0; totalesEgresos[m.nombre] = 0; });
    stockMovimientos.forEach(item => {
        if (item.tipo === 'ingreso' && totalesIngresos[item.material] !== undefined) {
            totalesIngresos[item.material] += parseFloat(item.cantidad) || 0;
        } else if (item.tipo === 'egreso' && totalesEgresos[item.material] !== undefined) {
            totalesEgresos[item.material] += parseFloat(item.cantidad) || 0;
        }
    });
    let tbody = document.getElementById('stock-summary-table-body');
    if (!tbody) return;
    tbody.innerHTML = '';
    materialesConfig.forEach(m => {
        let inicial = stockIniciales[m.nombre] || 0;
        let ingresado = totalesIngresos[m.nombre] || 0;
        let consumido = totalesEgresos[m.nombre] || 0;
        let actual = (inicial + ingresado) - consumido;
        let tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${m.nombre}</strong></td>
            <td>${m.unidad}</td>
            <td style="color: #2980b9; font-weight: bold;">${inicial.toFixed(2)}</td>
            <td style="color: #27ae60; font-weight: bold;">+${ingresado.toFixed(2)}</td>
            <td style="color: #e74c3c; font-weight: bold;">-${consumido.toFixed(2)}</td>
            <td style="font-weight: bold; color: ${actual < 0 ? '#e74c3c' : '#2c3e50'};">${actual.toFixed(2)} ${m.unidad}</td>
        `;
        tbody.appendChild(tr);
    });
}

export function renderizarStockMovimientos() {
    let listEl = document.getElementById('stock-history-list');
    if (!listEl) return;
    listEl.innerHTML = '';
    if (stockMovimientos.length === 0) {
        listEl.innerHTML = `<tr><td colspan="6" style="text-align: center; color: #7f8c8d;">Sin movimientos recientes.</td></tr>`;
        return;
    }
    const movsOrdenados = [...stockMovimientos].sort((a, b) => b.fechaHora.localeCompare(a.fechaHora));
    movsOrdenados.forEach(item => {
        let fechaFormateada = item.fechaHora.replace('T', ' ').substring(0, 16);
        let tipoBadge = item.tipo === 'ingreso' 
            ? `<span style="background: #27ae60; color: white; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: bold;">INGRESO</span>` 
            : `<span style="background: #d35400; color: white; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: bold;">CONSUMO</span>`;
        let tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${fechaFormateada}</td><td>${tipoBadge}</td>
            <td><strong>${item.material}</strong></td>
            <td style="font-weight: bold; color: ${item.tipo === 'ingreso' ? '#27ae60' : '#d35400'};">${item.tipo === 'ingreso' ? '+' : '-'}${item.cantidad}</td>
            <td>${item.observacion}</td>
            <td><button type="button" class="btn-delete" onclick="window.eliminarMovimientoStock('${item.firebaseId}')" style="padding: 2px 6px; font-size: 10px;">Borrar</button></td>
        `;
        listEl.appendChild(tr);
    });
    calcularStockActual();
}