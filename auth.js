// js/auth.js
import { PASSWORDS } from './constants.js';

export let currentUserRole = 'admin';
export let adminVistaPlantista = false;

const appBody = document.getElementById('app-body');
const loginScreen = document.getElementById('login-screen');
const mainApp = document.getElementById('main-app');
const userDisplayRole = document.getElementById('user-display-role');

export function mostrarAuth(tipo) {
    document.getElementById('auth-box-admin').style.display = 'none';
    document.getElementById('auth-box-factura').style.display = 'none';
    document.getElementById('auth-box-porteria').style.display = 'none';
    document.getElementById('auth-box-plantista').style.display = 'none';
    document.getElementById(`auth-box-${tipo}`).style.display = 'block';
    document.getElementById(`pass-${tipo}`).focus();
}

export function verificarLogin(tipo, callbackExito) {
    const pass = document.getElementById(`pass-${tipo}`).value;
    if (pass === PASSWORDS[tipo]) {
        currentUserRole = tipo;
        configurarInterfazRol(callbackExito);
    } else {
        document.getElementById('login-error').textContent = "Contraseña incorrecta.";
    }
}

function configurarInterfazRol(callbackExito) {
    appBody.className = '';
    adminVistaPlantista = false;
    const filterDateInput = document.getElementById('filter-date');

    if (currentUserRole === 'plantista') {
        userDisplayRole.textContent = "Perfil: Plantista / Operador";
        appBody.classList.add('operator-mode');
    } else if (currentUserRole === 'porteria') {
        userDisplayRole.textContent = "Perfil: Portería / Báscula";
        appBody.classList.add('porteria-mode');
    } else if (currentUserRole === 'factura') {
        userDisplayRole.textContent = "Perfil: Facturación";
        appBody.classList.add('factura-mode');
        let ayer = new Date();
        ayer.setDate(ayer.getDate() - 1);
        filterDateInput.value = ayer.toISOString().split('T')[0];
        filterDateInput.max = ayer.toISOString().split('T')[0];
    } else {
        userDisplayRole.textContent = "Perfil: Administración";
        appBody.classList.add('admin-mode');
    }
    
    loginScreen.style.display = 'none';
    mainApp.style.display = 'block';
    
    if (typeof callbackExito === 'function') callbackExito();
}

export function cerrarSesion() {
    loginScreen.style.display = 'block';
    mainApp.style.display = 'none';
    document.getElementById('pass-admin').value = '';
    document.getElementById('pass-factura').value = '';
    document.getElementById('pass-porteria').value = '';
    document.getElementById('pass-plantista').value = '';
    document.querySelectorAll('.auth-box').forEach(b => b.style.display = 'none');
    document.getElementById('login-error').textContent = '';
}