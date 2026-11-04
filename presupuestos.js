// js/presupuestos.js
import { db } from './firebase-config.js';

export let numeroPresupuestoActual = 1001;

export function obtenerSiguienteNumeroPresupuesto() {
    db.collection("configuracion").doc("contador_presupuestos").get().then((doc) => {
        if (doc.exists) {
            numeroPresupuestoActual = doc.data().ultimoNumero || 1001;
        } else {
            db.collection("configuracion").doc("contador_presupuestos").set({ ultimoNumero: 1001 });
            numeroPresupuestoActual = 1001;
        }
        document.getElementById('out-num-presupuesto').textContent = `#PRE-${numeroPresupuestoActual}`;
        document.getElementById('preview-num').textContent = `#PRE-${numeroPresupuestoActual}`;
    });
}

export function cambiarDivisionPresupuesto() {
    const division = document.getElementById('presupuesto-division').value;
    const logoImg = document.getElementById('preview-logo-img');
    
    if (division === 'hormigon') {
        logoImg.src = "gyehormigon.png";
    } else if (division === 'materiales') {
        logoImg.src = "gyemateriales.png";
    } else if (division === 'suelos') {
        logoImg.src = "gyesuelos.png";
    }
}

export function agregarFilaItemPresupuesto(desc = '', qty = '', price = '') {
    const container = document.getElementById('presupuesto-items-container');
    const row = document.createElement('div');
    row.className = 'item-edit-row';
    row.style.cssText = "display: grid; grid-template-columns: 3fr 1fr 1.2fr 40px; gap: 10px; margin-bottom: 8px;";
    row.innerHTML = `
        <input type="text" class="p-desc" placeholder="Descripción del ítem..." value="${desc}" oninput="actualizarVistaPreviaPresupuesto()">
        <input type="number" class="p-qty" placeholder="Cant." value="${qty}" oninput="actualizarVistaPreviaPresupuesto()">
        <input type="number" step="0.01" class="p-price" placeholder="Neto Unit. $" value="${price}" oninput="actualizarVistaPreviaPresupuesto()">
        <button type="button" class="btn-remove-item" onclick="this.closest('.item-edit-row').remove(); actualizarVistaPreviaPresupuesto()">X</button>
    `;
    container.appendChild(row);
}

export function actualizarVistaPreviaPresupuesto() {
    document.getElementById('prev-cliente').textContent = document.getElementById('pres-cliente').value || "---";
    document.getElementById('prev-localidad').textContent = document.getElementById('pres-localidad').value || "---";
    document.getElementById('prev-obra').textContent = document.getElementById('pres-obra').value || "---";
    
    const hoy = new Date();
    document.getElementById('preview-fecha').textContent = hoy.toLocaleDateString('es-AR');
    
    const diasValidez = parseInt(document.getElementById('pres-validez').value) || 5;
    document.getElementById('prev-validez').textContent = `${diasValidez} días`;
    
    const fechaVencimiento = new Date();
    fechaVencimiento.setDate(hoy.getDate() + diasValidez);
    document.getElementById('prev-fecha-vencimiento').textContent = fechaVencimiento.toLocaleDateString('es-AR');

    const obs = document.getElementById('pres-obs').value.trim();
    const obsBox = document.getElementById('prev-obs-container');
    if (obs) {
        document.getElementById('prev-obs').textContent = obs;
        obsBox.style.display = "block";
    } else {
        obsBox.style.display = "none";
    }

    const descs = document.querySelectorAll('.p-desc');
    const qtys = document.querySelectorAll('.p-qty');
    const prices = document.querySelectorAll('.p-price');
    
    let html = "", netoTotal = 0;
    for (let i = 0; i < descs.length; i++) {
        let d = descs[i].value;
        let q = parseFloat(qtys[i].value) || 0;
        let p = parseFloat(prices[i].value) || 0;
        if (d) {
            let subNeto = q * p;
            netoTotal += subNeto;
            html += `
                <tr>
                    <td style="padding: 8px; border-bottom: 1px solid #eee;">${d}</td>
                    <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: center;">${q}</td>
                    <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">$${p.toLocaleString('es-AR', {minimumFractionDigits: 2})}</td>
                    <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">$${(p * 1.21).toLocaleString('es-AR', {minimumFractionDigits: 2})}</td>
                    <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right; font-weight: bold;">$${(subNeto * 1.21).toLocaleString('es-AR', {minimumFractionDigits: 2})}</td>
                </tr>
            `;
        }
    }
    if (html === "") html = `<tr><td colspan="5" style="text-align: center; color: #777; padding: 10px;">Sin ítems cargados.</td></tr>`;

    document.getElementById('prev-table-body').innerHTML = html;
    let ivaTotal = netoTotal * 0.21;
    let totalFinal = netoTotal + ivaTotal;

    document.getElementById('prev-neto').textContent = `$${netoTotal.toLocaleString('es-AR', {minimumFractionDigits: 2})}`;
    document.getElementById('prev-iva').textContent = `$${ivaTotal.toLocaleString('es-AR', {minimumFractionDigits: 2})}`;
    document.getElementById('prev-total').textContent = `$${totalFinal.toLocaleString('es-AR', {minimumFractionDigits: 2})}`;
}

export async function generarPdfPresupuesto() {
    const element = document.getElementById('presupuesto-preview-box');
    try {
        const canvas = await html2canvas(element, { scale: 2, useCORS: true });
        const imgData = canvas.toDataURL('image/jpeg', 0.95);
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
        
        pdf.addImage(imgData, 'JPEG', 0, 10, pdfWidth, pdfHeight);
        let clienteNombre = document.getElementById('pres-cliente').value.trim() || "Cliente";
        clienteNombre = clienteNombre.replace(/\s+/g, '_');
        
        pdf.save(`Presupuesto_${numeroPresupuestoActual}_${clienteNombre}.pdf`);

        numeroPresupuestoActual++;
        db.collection("configuracion").doc("contador_presupuestos").set({ ultimoNumero: numeroPresupuestoActual })
          .then(() => { obtenerSiguienteNumeroPresupuesto(); });
    } catch (e) {
        console.error(e);
        alert("Error al generar el PDF.");
    }
}

export function copiarTextoPresupuestoWhatsApp() {
    const cliente = document.getElementById('pres-cliente').value || "Cliente";
    const total = document.getElementById('prev-total').textContent;
    const validez = document.getElementById('pres-validez').value;
    const vencimiento = document.getElementById('prev-fecha-vencimiento').textContent;
    
    let mensaje = `🏗️ *PRESUPUESTO GYE S.R.L. (#PRE-${numeroPresupuestoActual})*\n`;
    mensaje += `👤 *Cliente:* ${cliente}\n`;
    mensaje += `💰 *TOTAL FINAL:* ${total} (IVA incluido)\n`;
    mensaje += `⏳ *Validez:* ${validez} días (Vence el ${vencimiento})\n\n`;
    mensaje += `Adjunto PDF con el detalle. ¡Quedamos a disposición!`;

    navigator.clipboard.writeText(mensaje);
    alert("¡Texto copiado para WhatsApp!");
}