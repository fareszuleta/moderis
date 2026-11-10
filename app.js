'use strict';
/* Mendis web — control de gastos. Datos en localStorage (centavos). */

// ───────── utilidades ─────────
const DIAS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MESES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const LETRAS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const p2 = (n) => String(n).padStart(2, '0');
const aIso = (d) => d.toISOString().slice(0, 10);
const aFecha = (s) => { const p = s.split('-').map(Number); return new Date(Date.UTC(p[0], p[1] - 1, p[2])); };
const sumarDias = (s, n) => { const d = aFecha(s); d.setUTCDate(d.getUTCDate() + n); return aIso(d); };
const primeroDeMes = (s) => s.slice(0, 8) + '01';
const sumarMeses = (s, n) => { const d = aFecha(primeroDeMes(s)); d.setUTCMonth(d.getUTCMonth() + n); return aIso(d); };
function mesesDespues(s, k) {
  const d = aFecha(s);
  const ult = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + k + 1, 0)).getUTCDate();
  return aIso(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + k, Math.min(d.getUTCDate(), ult))));
}
const hoyLocal = () => { const d = new Date(); return d.getFullYear() + '-' + p2(d.getMonth() + 1) + '-' + p2(d.getDate()); };
const difDias = (a, b) => Math.round((aFecha(a) - aFecha(b)) / 864e5);
const cap = (s) => s[0].toUpperCase() + s.slice(1);
function dinero(c) {
  const e = Math.floor(c / 100).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return '$' + e + '.' + String(c % 100).padStart(2, '0');
}
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
function centavos(txt) {
  const t = String(txt || '').replace(/[\s,$]/g, '');
  const m = /^(\d{0,9})(?:\.(\d{0,2}))?$/.exec(t);
  if (!m || (!m[1] && !m[2])) return null;
  return (m[1] ? parseInt(m[1], 10) : 0) * 100 + parseInt((m[2] || '').padEnd(2, '0'), 10);
}
function formatoFecha(v) {
  const d = String(v || '').replace(/\D/g, '').slice(0, 6);
  if (d.length <= 2) return d;
  if (d.length <= 4) return d.slice(0, 2) + '/' + d.slice(2);
  return d.slice(0, 2) + '/' + d.slice(2, 4) + '/' + d.slice(4);
}
function fechaValida(v) {
  const m = /^(\d{2})\/(\d{2})\/(\d{2})$/.exec(v || '');
  if (!m) return false;
  const dia = +m[1], mes = +m[2], anio = 2000 + +m[3];
  if (mes < 1 || mes > 12 || dia < 1) return false;
  return dia <= new Date(anio, mes, 0).getDate();
}
const fechaIso = (v) => { const m = v.split('/'); return '20' + m[2] + '-' + m[1] + '-' + m[0]; };
const corto = (f) => { const d = aFecha(f); return MESES[d.getUTCMonth()].slice(0, 3) + ' ' + d.getUTCDate(); };
function proxima(iso) { let k = 0, f = iso; while (f < HOY && k < 600) { k++; f = mesesDespues(iso, k); } return f; }

let HOY = hoyLocal();

// ───────── iconos ─────────
const sv = (d, s = 20, sw = 2, ex = '') => `<svg aria-hidden="true" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round" ${ex}><path d="${d}"></path></svg>`;
const IC = {
  ojoOff: 'M3 3l18 18M10.6 5.1A10.9 10.9 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-3.2 4.1M6.6 6.6C3.9 8.4 2 12 2 12s3.5 7 10 7a9.7 9.7 0 0 0 5.4-1.6M9.9 9.9a3 3 0 0 0 4.2 4.2',
  ojo: 'M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12zM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z',
  sync: 'M21 12a9 9 0 0 1-15.5 6.2L3 16M3 21v-5h5M3 12a9 9 0 0 1 15.5-6.2L21 8M21 3v5h-5',
  mas: 'M12 5v14M5 12h14', der: 'M9 6l6 6-6 6', izq: 'M15 6l-6 6 6 6', abajo: 'M6 9l6 6 6-6',
  alcancia: 'M19 7c-1-1.5-3-3-7-3C6.5 4 3 7.5 3 11.5c0 2.3 1.1 4.3 3 5.6V20h3v-1.5h4V20h3v-2.9c1.2-.8 2.1-1.8 2.6-3.1H21v-4h-1.6c-.2-.7-.5-1.3-.9-1.9M16 11h.01M9 7.5h4',
  check: 'M5 12l5 5L19 7', cerrar: 'M6 6l12 12M18 6L6 18',
  efectivo: 'M4 6h16a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2zM12 9.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5zM6 12h.01M18 12h.01',
  candado: 'M6 11h12a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-6a2 2 0 0 1 2-2zM8 11V7a4 4 0 0 1 8 0v4',
  calendario: 'M4 6h16v14H4zM4 10h16M8 3v4M16 3v4', calVacio: 'M4 6h16v14H4zM4 10h16M8 3v4M16 3v4M9 15h6',
  paleta: 'M12 3a9 9 0 1 0 0 18c1 0 1.5-.7 1.5-1.5 0-.4-.2-.8-.4-1.1-.3-.3-.4-.6-.4-1 0-.8.7-1.5 1.5-1.5H16a5 5 0 0 0 5-5c0-4.4-4-8-9-8zM7.5 11h.01M10 7.5h.01M14.5 7.5h.01M17 11h.01',
  lapiz: 'M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4',
  puntos: 'M12 5h.01M12 12h.01M12 19h.01', qr: 'M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h2v2h-2zM18 18h2v2h-2zM14 18h2',
  alerta: 'M12 8v5M12 16.5h.01', girar: 'M12 3a9 9 0 1 0 9 9',
  telefono: 'M8 2h8a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2zM11 18h2',
  tablet: 'M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2zM11 18h2',
  laptop: 'M5 5h14a1 1 0 0 1 1 1v9H4V6a1 1 0 0 1 1-1zM2 18.5h20'
};
const TAB_IC = {
  inicio: 'M3 11l9-7 9 7M5 10v10h5v-6h4v6h5V10',
  movimientos: 'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01',
  tarjetas: 'M4 5h16a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1zM3 10h18M7 15h4',
  ahorro: IC.alcancia
};
const ICON_MOV = {
  Food: 'M7 3v8M5 3v4a2 2 0 0 0 4 0V3M7 11v10M17 3c-2 0-3 2-3 5s1 4 3 4v9',
  Grocery: 'M3 4h2l2.4 11h10.2L20 8H6.2M9 20h.01M17 20h.01',
  Transport: 'M6 4h12a2 2 0 0 1 2 2v10H4V6a2 2 0 0 1 2-2zM4 11h16M7 19v-3M17 19v-3',
  Utilities: 'M13 2L4 14h7l-1 8 9-12h-7z', Entertainment: 'M6 4l13 8-13 8z',
  Clothing: 'M8 3L3 6l2 4 3-1v12h8V9l3 1 2-4-5-3a4 4 0 0 1-8 0z',
  Subscriptions: 'M20 11a8 8 0 0 0-14.5-4.5L4 8M4 3v5h5M4 13a8 8 0 0 0 14.5 4.5L20 16M20 21v-5h-5',
  Health: 'M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z',
  Salary: 'M7 17L17 7M9 7h8v8', Extra: 'M7 17L17 7M9 7h8v8',
  pago: 'M3 6h18v12H3zM3 10h18M7 15h4', transferencia: 'M4 8h15l-3-3M20 16H5l3 3'
};
const ICON_REG = {
  Food: 'M7 3v8M5 3v5a2 2 0 0 0 4 0V3M7 11v10M17 3c-2 1-3 3.5-3 6.5V13h3v8',
  Grocery: 'M3 4h2l2.4 10.2a1 1 0 0 0 1 .8h8.9a1 1 0 0 0 1-.8L20 8H6.2M9.5 19.5h.01M17 19.5h.01',
  Transport: 'M6 17V6a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v11M4 11h16M6 17h12v2M7.5 14h.01M16.5 14h.01',
  Utilities: 'M13 2L4 14h7l-1 8 9-12h-7l1-8z', Housing: 'M3 11l9-7 9 7M5 10v10h14V10M10 20v-6h4v6',
  Health: 'M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z',
  Entertainment: 'M4 6h16v4a2 2 0 0 0 0 4v4H4v-4a2 2 0 0 0 0-4V6zM14 6v12',
  Clothing: 'M8 4L4 7l2 4 2-1v10h8V10l2 1 2-4-4-3c-.5 1.5-2 2.5-4 2.5S8.5 5.5 8 4z',
  Education: 'M4 5a2 2 0 0 1 2-2h13v15H6a2 2 0 0 0-2 2V5zM4 20a2 2 0 0 0 2 2h13v-4',
  Subscriptions: 'M17 2l3 3-3 3M4 11V9a4 4 0 0 1 4-4h12M7 22l-3-3 3-3M20 13v2a4 4 0 0 1-4 4H4',
  Other: 'M6 12h.01M12 12h.01M18 12h.01'
};
const iconoCat = (c) => ICON_MOV[c] || ICON_REG[c] || ICON_REG.Other;

const BANCOS = [
  { id: 'bbva', nombre: 'BBVA', sigla: 'BBVA', color: '#072146' }, { id: 'santander', nombre: 'Santander', sigla: 'SAN', color: '#B91C1C' },
  { id: 'banorte', nombre: 'Banorte', sigla: 'BNT', color: '#9F1239' }, { id: 'hsbc', nombre: 'HSBC', sigla: 'HSBC', color: '#7F1D1D' },
  { id: 'banamex', nombre: 'Banamex', sigla: 'BMX', color: '#0B4F8A' }, { id: 'scotiabank', nombre: 'Scotiabank', sigla: 'SCO', color: '#A11B22' },
  { id: 'azteca', nombre: 'Azteca', sigla: 'AZ', color: '#166534' }, { id: 'bancoppel', nombre: 'BanCoppel', sigla: 'BC', color: '#7A5A12' },
  { id: 'inbursa', nombre: 'Inbursa', sigla: 'INB', color: '#1E3A8A' }, { id: 'nu', nombre: 'Nu', sigla: 'Nu', color: '#6D28D9' },
  { id: 'mercadopago', nombre: 'Mercado Pago', sigla: 'MP', color: '#0369A1' }, { id: 'hey', nombre: 'Hey Banco', sigla: 'HEY', color: '#111827' },
  { id: 'otro', nombre: 'Otro', sigla: '+', color: null }
];
const COLORES = [['Navy', '#1E3A8A'], ['Blue', '#2F5BEA'], ['Sky blue', '#0369A1'], ['Teal', '#0F766E'], ['Green', '#166534'], ['Gold', '#7A5A12'],
  ['Orange', '#C2410C'], ['Red', '#B91C1C'], ['Pink', '#BE185D'], ['Purple', '#6D28D9'], ['Gray', '#3F3F46'], ['Black', '#111827']];
const tamSigla = (s) => (s.length >= 4 ? '10px' : s.length === 3 ? '12px' : '14px');
const siglaDe = (t) => {
  const p = t.trim().split(/\s+/).filter(Boolean);
  if (!p.length) return '?';
  if (p.length === 1) return p[0].slice(0, 3).toUpperCase();
  return p.slice(0, 3).map((x) => x[0].toUpperCase()).join('');
};

// ───────── datos ─────────
const KEY = 'mendis.web.v1';
function semilla() {
  const d = (n) => sumarDias(HOY, -n);
  const tj = [
    { id: 'nomina', tipo: 'debito', nombre: 'Payroll', ultimos4: '7712', color: '#3F3F46', objetivo: 1585000 },
    { id: 'digital', tipo: 'debito', nombre: 'Digital', ultimos4: '2290', color: '#6D28D9', objetivo: 320000 },
    { id: 'azul', tipo: 'credito', nombre: 'Blue', ultimos4: '4821', color: '#1E3A8A', limite: 2000000, objetivo: 1200000, aPagar: 315000, corte: sumarDias(HOY, 12), pago: sumarDias(HOY, 32) },
    { id: 'oro', tipo: 'credito', nombre: 'Gold', ultimos4: '0937', color: '#7A5A12', limite: 3500000, objetivo: 425050, aPagar: 425050, corte: sumarDias(HOY, 25), pago: sumarDias(HOY, 45) },
    { id: 'depa', tipo: 'credito', nombre: 'Store', ultimos4: '5560', color: '#134E4A', limite: 800000, objetivo: 712000, aPagar: 248000, corte: sumarDias(HOY, 2), pago: sumarDias(HOY, 22) }
  ];
  const lista = [
    [0, 'gasto', 'Food', '', 'efectivo', 8550], [0, 'gasto', 'Grocery', '', 'nomina', 64230], [0, 'gasto', 'Transport', 'Bus', 'efectivo', 3500],
    [0, 'pago', '', 'Blue payment', 'nomina', 150000, 'azul'], [1, 'ingreso', 'Salary', 'Biweekly salary', 'nomina', 850000],
    [1, 'gasto', 'Subscriptions', 'Streaming', 'azul', 19900], [1, 'gasto', 'Food', 'Tacos with friends', 'azul', 23000],
    [2, 'gasto', 'Entertainment', 'Cinema', 'efectivo', 18000], [3, 'gasto', 'Clothing', 'Jacket', 'azul', 129900, null, 3],
    [4, 'gasto', 'Utilities', 'Electric bill', 'nomina', 48000], [4, 'transferencia', '', 'Cash withdrawal', 'nomina', 100000, 'efectivo'],
    [6, 'gasto', 'Health', 'Pharmacy', 'efectivo', 15000], [7, 'ingreso', 'Extra', 'Bike sale', 'efectivo', 60000]
  ];
  const n = lista.length;
  const D = {
    sec: n, efectivoInicial: 0, nombreDisp: '',
    tarjetas: tj.map((t) => ({ id: t.id, tipo: t.tipo, nombre: t.nombre, ultimos4: t.ultimos4, color: t.color, banco: null, sigla: '', inicial: 0, limite: t.limite || 0, aPagarBase: 0, corte: t.corte || null, pago: t.pago || null })),
    movs: lista.map((x, i) => ({ id: n - i, f: d(x[0]), tipo: x[1], cat: x[2], desc: x[3], cuenta: x[4], c: x[5], destino: x[6] || null, msi: x[7] || 0 })),
    metas: [{ id: 'm1', nombre: 'Emergency fund', meta: 2000000, saldoInicial: 450000, tarjetaId: null, color: '#0F766E', oculto: true, abonos: [] }]
  };
  D.efectivoInicial = 191500 - (saldoDe('efectivo', D) - 0);
  for (const t of tj) {
    const tar = D.tarjetas.find((x) => x.id === t.id);
    if (t.tipo === 'debito') tar.inicial = t.objetivo - (saldoDe(t.id, D) - tar.inicial);
    else {
      tar.inicial = t.objetivo - (deudaDe(t.id, D) - tar.inicial);
      tar.aPagarBase = t.aPagar + D.movs.filter((m) => m.tipo === 'pago' && m.destino === t.id).reduce((a, m) => a + m.c, 0);
    }
  }
  return D;
}
function cargar() {
  try { const r = JSON.parse(localStorage.getItem(KEY)); if (r && r.data && r.data.tarjetas) { S0.oculto = !!r.oculto; return r.data; } } catch (e) {}
  return semilla();
}
function guardar() { try { localStorage.setItem(KEY, JSON.stringify({ data: D, oculto: S.oculto })); } catch (e) {} }

const tarjeta = (id, DD = D) => DD.tarjetas.find((t) => t.id === id);
function saldoDe(id, DD = D) {
  let s = id === 'efectivo' ? DD.efectivoInicial : tarjeta(id, DD).inicial;
  for (const m of DD.movs) {
    if (m.cuenta === id) { if (m.tipo === 'ingreso') s += m.c; else s -= m.c; }
    if (m.tipo === 'transferencia' && m.destino === id) s += m.c;
  }
  return s;
}
function deudaDe(id, DD = D) {
  let s = tarjeta(id, DD).inicial;
  for (const m of DD.movs) {
    if (m.cuenta === id) { if (m.tipo === 'gasto') s += m.c; else if (m.tipo === 'ingreso') s -= m.c; }
    if (m.tipo === 'pago' && m.destino === id) s -= m.c;
  }
  return s;
}
function aPagarDe(t) {
  const pagos = D.movs.filter((m) => m.tipo === 'pago' && m.destino === t.id).reduce((a, m) => a + m.c, 0);
  return Math.max(0, Math.min(deudaDe(t.id), t.aPagarBase - pagos));
}
const enMeta = (id) => D.metas.some((m) => m.tarjetaId === id);
function vistaTarjeta(t) {
  if (t.tipo === 'debito') return { ...t, saldo: saldoDe(t.id) };
  const cp = proxima(t.corte);
  return { ...t, deuda: deudaDe(t.id), aPagar: aPagarDe(t), corteTxt: corto(cp), pagoTxt: corto(proxima(t.pago)), corteProximo: difDias(cp, HOY) <= 3 };
}
const debitos = () => D.tarjetas.filter((t) => t.tipo === 'debito' && !enMeta(t.id)).map(vistaTarjeta);
const creditos = () => D.tarjetas.filter((t) => t.tipo === 'credito').map(vistaTarjeta);
function saldoMeta(m) {
  const base = m.tarjetaId && tarjeta(m.tarjetaId) ? saldoDe(m.tarjetaId) : m.saldoInicial;
  return base + m.abonos.reduce((a, b) => a + b, 0);
}
const nombreCuenta = (id) => (id === 'efectivo' ? 'Cash' : (tarjeta(id) || { nombre: 'Deleted account' }).nombre);
const etiquetaCuenta = (id) => (id === 'efectivo' ? 'Cash' : tarjeta(id) ? tarjeta(id).nombre + ' •••• ' + tarjeta(id).ultimos4 : 'Deleted account');
function origenDe(m) {
  if (m.tipo === 'pago') return 'From ' + etiquetaCuenta(m.cuenta);
  if (m.tipo === 'transferencia') return nombreCuenta(m.cuenta) + ' → ' + nombreCuenta(m.destino);
  const t = tarjeta(m.cuenta);
  if (t && t.tipo === 'credito') return m.msi > 1 ? t.nombre + ' · ' + m.msi + ' months' : t.nombre + ' •••• ' + t.ultimos4 + ' · credit';
  return etiquetaCuenta(m.cuenta);
}

// ───────── estado ─────────
const S0 = { oculto: false };
let D = cargar();
const S = {
  modo: 'telefono', tab: 'inicio', oculto: S0.oculto, panel: null,
  aviso: null, saliendo: false,
  mov: { sel: HOY, mesVista: primeroDeMes(HOY), cal: false, vista: 'dia' },
  metaUI: {}, f: {}, anim: {},
  disp: { otros: [], sinc: null, panel: null, modo: 'qr', olvidar: null, aviso: null, tipoAviso: 'ok', saliendo: false }
};
const oc = (c) => (S.oculto ? '$ •••••' : dinero(c));

// ───────── piezas visuales ─────────
const btnRedondo = (act, label, icon, arg = '') => `<button type="button" class="btn-round" data-act="${act}" ${arg ? `data-arg="${arg}"` : ''} aria-label="${label}" style="width:44px;height:44px;border-radius:22px">${icon}</button>`;
const labelOjo = () => (S.oculto ? 'Show balances' : 'Hide balances');
const iconoOjo = (s) => sv(S.oculto ? IC.ojoOff : IC.ojo, s);

function bancoInsignia(t, tam = 'g') {
  return `<span aria-hidden="true" style="flex:none;width:34px;height:34px;border-radius:10px;background:#fff;color:${t.color};display:flex;align-items:center;justify-content:center;font-family:'Space Grotesk',sans-serif;font-size:${tamSigla(t.sigla)};font-weight:700;letter-spacing:-.02em">${esc(t.sigla)}</span>`;
}
const FONDO_TARJ = `<svg aria-hidden="true" viewBox="0 0 340 214" preserveAspectRatio="xMidYMid slice" style="position:absolute;inset:0;width:100%;height:100%;pointer-events:none"><circle cx="300" cy="8" r="122" fill="#fff" fill-opacity=".08"></circle><circle cx="350" cy="214" r="86" fill="#fff" fill-opacity=".06"></circle><path d="M-10 172 C 60 132, 120 212, 200 162 S 320 122, 360 152" fill="none" stroke="#fff" stroke-opacity=".12" stroke-width="1.5"></path><path d="M-10 188 C 60 148, 120 228, 200 178 S 320 138, 360 168" fill="none" stroke="#fff" stroke-opacity=".08" stroke-width="1.5"></path></svg>`;
const CHIP = `<svg aria-hidden="true" width="34" height="26" viewBox="0 0 34 26" fill="none" stroke="#fff" stroke-opacity=".85" stroke-width="1.4"><rect x="1" y="1" width="32" height="24" rx="5"></rect><path d="M1 9h10M1 17h10M23 9h10M23 17h10M11 1v24M23 1v24"></path></svg>`;
const NFC = `<svg aria-hidden="true" width="18" height="22" viewBox="0 0 18 22" fill="none" stroke="#fff" stroke-opacity=".85" stroke-width="1.8" stroke-linecap="round"><path d="M2 7a6 6 0 0 1 0 8"></path><path d="M7 4a10 10 0 0 1 0 14"></path><path d="M12 1a14 14 0 0 1 0 20"></path></svg>`;
const ETQ = 'font-size:10px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:rgba(255,255,255,.82)';

function tarjetaDigital(t) {
  const cr = t.tipo !== 'debito';
  const pct = cr && t.limite > 0 ? Math.round((t.deuda / t.limite) * 100) : 0;
  const cabeza = t.banco
    ? `<div style="display:flex;align-items:center;gap:10px;min-width:0">${bancoInsignia(t)}<div style="display:flex;flex-direction:column;gap:1px;min-width:0"><span style="font-size:15px;font-weight:800;letter-spacing:.02em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(t.banco)}</span><span style="font-size:12px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(t.nombre)}</span><span style="${ETQ}">${cr ? 'Credit' : 'Debit'}</span></div></div>`
    : `<div style="display:flex;flex-direction:column;gap:1px"><span style="font-size:15px;font-weight:800;letter-spacing:.01em">${esc(t.nombre)}</span><span style="${ETQ}">${cr ? 'Credit' : 'Debit'}</span></div>`;
  const cuerpo = cr
    ? `<div style="position:relative;display:flex;flex-direction:column;gap:5px"><span style="${ETQ}">Available</span><span style="font-family:'Space Grotesk',sans-serif;font-size:25px;font-weight:600;line-height:1">${oc(t.limite - t.deuda)}</span><div style="height:6px;border-radius:3px;background:rgba(255,255,255,.22);overflow:hidden;margin-top:3px"><div style="height:100%;border-radius:3px;width:${Math.min(Math.max(pct, 0), 100)}%;background:${pct >= 80 ? '#FDBA74' : '#fff'}"></div></div><span style="font-size:11px;font-weight:600;color:rgba(255,255,255,.85)">Used ${pct}% of ${oc(t.limite)}</span></div>`
    : `<div style="position:relative;display:flex;flex-direction:column;gap:6px"><span style="${ETQ}">Balance</span><span style="font-family:'Space Grotesk',sans-serif;font-size:30px;font-weight:600;line-height:1">${oc(t.saldo)}</span></div>`;
  const pie = cr ? `<div style="background:var(--surf);border:1px solid var(--line);border-radius:14px;padding:10px 14px;display:flex;justify-content:space-between;align-items:center;gap:8px"><div style="display:flex;flex-direction:column;gap:2px"><span style="font-size:12px;font-weight:600;color:var(--muted)">Due now</span><span style="font-family:'Space Grotesk',sans-serif;font-size:17px;font-weight:600">${oc(t.aPagar)}</span></div><div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px">${t.corteProximo ? `<span style="font-size:11px;font-weight:800;padding:3px 8px;border-radius:999px;background:var(--orange-soft);color:var(--orange)">Closing soon</span>` : ''}<span style="font-size:12px;font-weight:600;color:var(--muted)">Pay before ${t.pagoTxt}</span></div></div>` : '';
  return `<div style="width:100%;display:flex;flex-direction:column;gap:8px"><div style="position:relative;aspect-ratio:1.586/1;border-radius:18px;overflow:hidden;padding:16px 18px;color:#fff;background:${t.color};display:flex;flex-direction:column;justify-content:space-between;box-shadow:0 12px 24px -14px rgba(16,21,31,.55)">${FONDO_TARJ}
    <div style="position:relative;display:flex;justify-content:space-between;align-items:flex-start">${cabeza}<div style="display:flex;align-items:center;gap:10px">${CHIP}${NFC}</div></div>
    ${cuerpo}
    <div style="position:relative;display:flex;justify-content:space-between;align-items:center"><span style="font-family:'Space Grotesk',sans-serif;font-size:14px;font-weight:500;letter-spacing:.12em">•••• ${esc(t.ultimos4)}</span>${cr ? `<span style="font-size:12px;font-weight:700">Corte ${t.corteTxt}</span>` : ''}</div></div>${pie}</div>`;
}

// ───────── INICIO ─────────
const fechaLarga = () => { const d = aFecha(HOY); return cap(DIAS[d.getUTCDay()]) + ', ' + MESES[d.getUTCMonth()] + ' ' + d.getUTCDate(); };
function inicioHTML() {
  const m = S.modo, tel = m === 'telefono', lap = m === 'laptop';
  const deb = debitos(), cre = creditos();
  const efectivo = saldoDe('efectivo');
  const totalDinero = efectivo + deb.reduce((a, t) => a + t.saldo, 0);
  const totalDeuda = cre.reduce((a, t) => a + t.deuda, 0), totalPagar = cre.reduce((a, t) => a + t.aPagar, 0);
  const P = tel ? { pad: '20px 20px 180px', gap: 24, h1: 26, fecha: 13 } : lap ? { pad: '0', gap: 28, h1: 32, fecha: 14 } : { pad: '32px 32px 190px', gap: 28, h1: 32, fecha: 14 };
  const h1txt = lap ? 'Home' : 'My finances';
  const botonesCab = tel
    ? `<div style="display:flex;gap:8px">${btnRedondo('ojo', labelOjo(), iconoOjo(20))}${btnRedondo('irDisp', 'Sincronizar', sv(IC.sync, 20))}</div>`
    : lap
      ? `<div style="display:flex;gap:10px;align-items:center"><button type="button" class="btn-pill" data-act="ojo" style="gap:8px">${iconoOjo(18)}${labelOjo()}</button><button type="button" data-act="abrir" data-arg="registrar" style="height:44px;border:0;border-radius:22px;background:var(--accent-fixed);color:#fff;display:flex;align-items:center;gap:8px;padding:0 20px 0 16px;font-size:14px;font-weight:800;cursor:pointer">${sv(IC.mas, 18, 2.5)}Add transaction</button></div>`
      : `<div style="display:flex;gap:10px"><button type="button" class="btn-round" data-act="ojo" aria-label="${labelOjo()}" style="width:48px;height:48px;border-radius:24px">${iconoOjo(20)}</button><button type="button" class="btn-pill" data-act="irDisp" style="height:48px;border-radius:24px;gap:8px;padding:0 18px">${sv(IC.sync, 18)}Sync</button></div>`;
  const ef = tel ? { pad: '18px 20px 16px', r: 20, ic: 38, t1: 16, t2: 12, n: 38 } : lap ? { pad: '26px 32px', r: 22, ic: 42, t1: 18, t2: 13, n: 48 } : { pad: '24px 28px', r: 22, ic: 42, t1: 18, t2: 13, n: 46 };
  const efHTML = `<section aria-label="Cash" style="position:relative;overflow:hidden;border-radius:${ef.r}px;background:#166534;color:#fff;padding:${ef.pad};box-shadow:0 12px 24px -14px rgba(22,101,52,.6)">
    <svg aria-hidden="true" viewBox="0 0 700 170" preserveAspectRatio="xMaxYMid slice" style="position:absolute;inset:0;width:100%;height:100%;pointer-events:none"><g transform="rotate(-10 560 70)" fill="none" stroke="#fff" stroke-width="1.5"><rect x="470" y="10" width="190" height="100" rx="12" stroke-opacity=".16"></rect><circle cx="565" cy="60" r="25" stroke-opacity=".16"></circle><rect x="492" y="34" width="190" height="100" rx="12" stroke-opacity=".09"></rect></g></svg>
    <div style="position:relative;display:flex;flex-direction:column;gap:14px"><div style="display:flex;align-items:center;gap:${tel ? 10 : 12}px"><div style="width:${ef.ic}px;height:${ef.ic}px;border-radius:12px;background:rgba(255,255,255,.16);display:flex;align-items:center;justify-content:center;flex:none">${sv(IC.efectivo, tel ? 20 : 22)}</div><div style="display:flex;flex-direction:column;gap:1px"><span style="font-size:${ef.t1}px;font-weight:800">Cash</span><span style="font-size:${ef.t2}px;font-weight:600;color:rgba(255,255,255,.85)">Cash in your wallet</span></div></div><span style="font-family:'Space Grotesk',sans-serif;font-size:${ef.n}px;font-weight:600;line-height:1">${oc(efectivo)}</span></div></section>`;
  const caja = (t, v) => `<div style="background:var(--surf);border-radius:${tel ? 16 : 18}px;padding:${tel ? '14px 16px' : lap ? '18px 22px' : '18px 20px'};display:flex;flex-direction:column;gap:${tel ? 4 : 6}px"><span style="font-size:${tel ? 12 : 13}px;font-weight:600;color:var(--muted)">${t}</span><span style="font-family:'Space Grotesk',sans-serif;font-size:${tel ? 20 : lap ? 26 : 24}px;font-weight:600">${oc(v)}</span></div>`;
  const stats = `<section style="display:grid;grid-template-columns:repeat(${tel ? 2 : 3},minmax(0,1fr));gap:${tel ? 12 : lap ? 20 : 16}px">${caja('My money', totalDinero)}${caja('Card debt', totalDeuda)}${tel ? '' : caja('Due this period', totalPagar)}</section>`;
  const seccion = (titulo, tipo, lista) => {
    const add = tel ? `<button type="button" class="btn-round" data-act="abrir" data-arg="${tipo}" aria-label="Add ${tipo === 'debito' ? 'debit' : 'credit'} card" style="width:44px;height:44px;border-radius:22px">${sv(IC.mas, 20, 2.5)}</button>` : `<button type="button" class="btn-pill" data-act="abrir" data-arg="${tipo}" aria-label="Add ${tipo === 'debito' ? 'debit' : 'credit'} card">${sv(IC.mas, 18, 2.5)}Add</button>`;
    const cuerpo = tel
      ? `<div class="scroll-x" data-keep="sc-${tipo}" style="display:flex;gap:12px;overflow-x:auto;margin:0 -20px;padding:0 20px 6px;scroll-snap-type:x mandatory">${lista.map((t) => `<div style="width:300px;flex:none;scroll-snap-align:start">${tarjetaDigital(t)}</div>`).join('')}</div>`
      : `<div style="display:grid;grid-template-columns:repeat(${lap ? 3 : 2},minmax(0,1fr));gap:${lap ? 24 : 20}px;align-items:start">${lista.map(tarjetaDigital).join('')}</div>`;
    return `<section style="display:flex;flex-direction:column;gap:${tel ? 12 : 14}px"><div style="display:flex;align-items:center;justify-content:space-between"><h2 style="font-size:${tel ? 18 : 20}px;font-weight:700">${titulo}</h2><div style="display:flex;align-items:center;gap:${tel ? 4 : 8}px">${add}<button type="button" class="link-btn" data-act="tab" data-arg="tarjetas" style="font-size:${tel ? 14 : 15}px">See all</button></div></div>${lista.length ? cuerpo : `<p style="font-size:14px;font-weight:600;color:var(--muted)">No ${tipo === 'debito' ? 'debit' : 'credit'} cards yet.</p>`}</section>`;
  };
  const n = D.metas.length;
  const ah = `<button type="button" data-act="tab" data-arg="ahorro" aria-label="Savings: view my goals" style="width:100%;min-height:${tel ? 84 : lap ? 92 : 96}px;border:0;border-radius:${tel ? 18 : 20}px;background:var(--inv);color:var(--inv-ink);padding:${tel ? '16px 18px' : lap ? '20px 26px' : '20px 24px'};display:flex;align-items:center;gap:${tel ? 14 : 16}px;text-align:left;cursor:pointer"><div style="width:${tel ? 48 : 50}px;height:${tel ? 48 : 50}px;border-radius:14px;background:var(--inv-soft);display:flex;align-items:center;justify-content:center;flex:none">${sv(IC.alcancia, 24)}</div><div style="display:flex;flex-direction:column;gap:3px;flex:1"><span style="font-size:${tel ? 16 : 17}px;font-weight:800">Savings</span><span style="font-size:${tel ? 13 : 14}px;font-weight:500;color:var(--inv-mute)">Set money aside and lock it</span></div><span style="font-size:${tel ? 11 : 12}px;font-weight:700;padding:4px 10px;border-radius:999px;background:var(--inv-chip)">${n === 0 ? 'New goal' : n === 1 ? '1 goal' : n + ' goals'}</span>${sv(IC.der, tel ? 20 : 22)}</button>`;
  return `<div style="padding:${P.pad};display:flex;flex-direction:column;gap:${P.gap}px">
    <header style="display:flex;align-items:center;justify-content:space-between;gap:${tel ? 12 : 16}px"><div style="display:flex;flex-direction:column;gap:2px"><span style="font-size:${P.fecha}px;font-weight:600;color:var(--muted)">${fechaLarga()}</span><h1 style="font-size:${P.h1}px;font-weight:800;letter-spacing:-.02em">${h1txt}</h1></div>${botonesCab}</header>
    ${efHTML}${stats}${seccion('Debit cards', 'debito', deb)}${seccion('Credit cards', 'credito', cre)}${ah}</div>`;
}

// ───────── TARJETAS ─────────
function tarjetasHTML() {
  const m = S.modo, v = m;
  const deb = debitos(), cre = creditos();
  const cols = v === 'telefono' ? 1 : v === 'tablet' ? 2 : 3;
  const sec = (t, tipo, l) => `<section style="display:flex;flex-direction:column;gap:14px"><div style="display:flex;align-items:center;justify-content:space-between;gap:12px"><h2 style="font-size:${v === 'telefono' ? 18 : 20}px;font-weight:700">${t}</h2><button type="button" class="btn-pill" data-act="abrir" data-arg="${tipo}" aria-label="Add ${t === 'Debit' ? 'debit' : 'credit'} card">${sv(IC.mas, 18, 2.5)}Add</button></div><div style="display:grid;grid-template-columns:repeat(${cols},minmax(0,1fr));gap:16px;align-items:start">${l.map(tarjetaDigital).join('')}</div></section>`;
  return `<div style="padding:${v === 'telefono' ? '20px 20px 180px' : v === 'tablet' ? '32px 32px 190px' : '0'};display:flex;flex-direction:column;gap:${v === 'telefono' ? 24 : 28}px">
    <header style="display:flex;flex-direction:column;gap:2px"><h1 style="font-size:${v === 'telefono' ? 26 : 32}px;font-weight:800;letter-spacing:-.02em">Cards</h1><span style="font-size:14px;font-weight:600;color:var(--muted)">${deb.length} debit · ${cre.length} credit</span></header>${sec('Debit', 'debito', deb)}${sec('Credit', 'credito', cre)}</div>`;
}

// ───────── AHORRO ─────────
function metaHTML(m) {
  const u = S.metaUI[m.id] || (S.metaUI[m.id] = { abierto: false, abonando: false, monto: '', aviso: null, saliendo: false });
  const saldo = saldoMeta(m), pct = m.meta > 0 ? Math.min(100, Math.floor((saldo * 100) / m.meta)) : 0, falta = Math.max(0, m.meta - saldo);
  const col = m.tarjetaId && tarjeta(m.tarjetaId) ? tarjeta(m.tarjetaId).color : m.color;
  const u4 = m.tarjetaId && tarjeta(m.tarjetaId) ? tarjeta(m.tarjetaId).ultimos4 : null;
  const cent = centavos(u.monto), ok = cent !== null && cent > 0, mal = u.monto.trim() !== '' && !ok;
  const an = S.anim.sub ? 'a-desplegar' : '';
  return `<div style="width:100%;border-radius:16px;background:var(--surf);color:var(--ink);overflow:hidden">
  <div style="display:flex;align-items:center;gap:4px;padding-right:12px">
    <button type="button" data-act="metaAbrir" data-arg="${m.id}" aria-expanded="${u.abierto}" style="flex:1;min-width:0;min-height:76px;border:0;background:transparent;color:inherit;padding:12px 8px 12px 14px;display:flex;align-items:center;gap:12px;text-align:left;cursor:pointer">
      <span aria-hidden="true" style="position:relative;width:56px;height:36px;border-radius:7px;background:${col};color:#fff;flex:none;overflow:hidden;display:flex;flex-direction:column;justify-content:space-between;padding:5px 6px;box-shadow:0 4px 10px -6px rgba(16,21,31,.6)"><svg viewBox="0 0 56 36" preserveAspectRatio="none" style="position:absolute;inset:0;width:100%;height:100%"><circle cx="50" cy="0" r="22" fill="#fff" fill-opacity=".12"></circle></svg><svg width="12" height="9" viewBox="0 0 34 26" fill="none" stroke="#fff" stroke-opacity=".9" stroke-width="2.5" style="position:relative"><rect x="1" y="1" width="32" height="24" rx="5"></rect></svg><span style="position:relative;font-family:'Space Grotesk',sans-serif;font-size:8px;font-weight:600;letter-spacing:.08em">${u4 ? '•••• ' + u4 : 'SAVINGS'}</span></span>
      <span style="flex:1;min-width:0;display:flex;flex-direction:column;gap:2px"><span style="font-size:15px;font-weight:800;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(m.nombre)}</span><span style="display:flex;align-items:center;gap:5px;font-size:12px;font-weight:600;color:var(--muted);white-space:nowrap;overflow:hidden">${m.oculto && !u.abierto ? sv(IC.candado, 13, 2.2) : ''}${u.abierto ? 'Tap to hide' : m.oculto ? 'Hidden · tap to see' : pct + '% of your goal'}</span></span>
      ${sv(IC.abajo, 20, 2.2, `style="color:var(--muted);transform:${u.abierto ? 'rotate(180deg)' : 'none'};transition:transform 220ms ease"`)}</button>
    <button type="button" data-act="abonarAbrir" data-arg="${m.id}" aria-label="Deposit to ${esc(m.nombre)}" style="flex:none;min-height:44px;padding:0 14px;border:0;border-radius:12px;background:#166534;color:#fff;font-size:13px;font-weight:800;cursor:pointer;display:flex;align-items:center;gap:5px">${sv(IC.mas, 15, 3)}Deposit</button></div>
  ${u.aviso ? `<div role="status" style="${u.saliendo ? 'animation:desvanecer 300ms ease-in forwards' : 'animation:desplegar 220ms ease-out'};margin:0 14px 12px;padding:10px 12px;border-radius:12px;background:var(--green-soft);color:var(--green);font-size:13px;font-weight:700;display:flex;align-items:center;gap:8px">${sv(IC.check, 16, 3)}${esc(u.aviso)}</div>` : ''}
  ${u.abonando ? `<div class="${an}" style="padding:12px 14px 14px;border-top:1px solid var(--sep);display:flex;flex-direction:column;gap:10px"><label for="ab-${m.id}" style="font-size:13px;font-weight:800">How much are you depositing?</label><div style="display:flex;align-items:center;height:52px;padding:0 14px;border-radius:14px;border:1px solid ${mal ? 'var(--warn)' : 'var(--line)'};background:var(--field);gap:6px"><span aria-hidden="true" style="font-family:'Space Grotesk',sans-serif;font-size:20px;font-weight:600;color:var(--muted)">$</span><input id="ab-${m.id}" type="text" inputmode="decimal" autocomplete="off" placeholder="0.00" value="${esc(u.monto)}" data-in="abono" data-arg="${m.id}" style="flex:1;min-width:0;border:0;outline:none;background:transparent;color:var(--ink);font-family:'Space Grotesk',sans-serif;font-size:20px;font-weight:600;padding:0"></div><span style="font-size:12px;font-weight:600;color:var(--muted)">Your total savings will stay hidden.</span><div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px"><button type="button" data-act="abonarCancelar" data-arg="${m.id}" style="min-height:46px;border-radius:12px;border:1px solid var(--line2);background:var(--surf);color:var(--ink);font-size:14px;font-weight:800;cursor:pointer">Cancel</button><button type="button" data-act="abonarOk" data-arg="${m.id}" ${ok ? '' : 'disabled'} style="min-height:46px;border-radius:12px;border:0;background:#166534;color:#fff;font-size:14px;font-weight:800;opacity:${ok ? 1 : .4};cursor:${ok ? 'pointer' : 'not-allowed'}">Deposit</button></div></div>` : ''}
  ${u.abierto ? `<div class="${an}" style="padding:4px 16px 16px;display:flex;flex-direction:column;gap:14px;border-top:1px solid var(--sep)"><div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;padding-top:12px"><div style="display:flex;flex-direction:column;gap:2px"><span style="font-size:12px;font-weight:600;color:var(--muted)">Saved</span><span style="font-family:'Space Grotesk',sans-serif;font-size:20px;font-weight:600">${dinero(saldo)}</span></div><div style="display:flex;flex-direction:column;gap:2px"><span style="font-size:12px;font-weight:600;color:var(--muted)">Goal</span><span style="font-family:'Space Grotesk',sans-serif;font-size:20px;font-weight:600">${dinero(m.meta)}</span></div></div><div style="display:flex;flex-direction:column;gap:6px"><div role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct}" aria-label="Goal progress" style="height:10px;border-radius:5px;background:var(--track);overflow:hidden"><div style="height:100%;border-radius:5px;width:${pct}%;background:#166534"></div></div><div style="display:flex;justify-content:space-between;font-size:12px;font-weight:700;color:var(--muted)"><span>${pct}% of your goal</span><span>${falta > 0 ? 'Still need ' + dinero(falta) : 'Goal reached'}</span></div></div><div style="display:flex;align-items:center;justify-content:space-between;gap:10px;font-size:13px;font-weight:600;color:var(--muted)"><span style="font-family:'Space Grotesk',sans-serif;letter-spacing:.08em">${u4 ? 'Card •••• ' + u4 : 'Savings account'}</span><button type="button" data-act="metaAbrir" data-arg="${m.id}" style="min-height:40px;padding:0 14px;border-radius:10px;border:1px solid var(--line2);background:var(--surf);color:var(--ink);font-size:13px;font-weight:800;cursor:pointer;display:flex;align-items:center;gap:6px">${sv(IC.ojoOff, 16)}Hide</button></div></div>` : ''}</div>`;
}
function ahorroHTML() {
  const v = S.modo, n = D.metas.length;
  return `<div style="padding:${v === 'telefono' ? '20px 20px 120px' : v === 'tablet' ? '32px 32px 130px' : '0'};display:flex;flex-direction:column;gap:${v === 'telefono' ? 20 : 24}px">
  <header style="display:flex;flex-direction:column;gap:2px"><h1 style="font-size:${v === 'telefono' ? 26 : 32}px;font-weight:800;letter-spacing:-.02em">Savings</h1><span style="font-size:14px;font-weight:600;color:var(--muted)">Your saved money. Amounts are hidden until you tap a goal.</span></header>
  <section aria-label="Savings goals" style="border-radius:20px;background:var(--inv);color:var(--inv-ink);padding:18px 20px;display:flex;align-items:center;gap:14px;flex-wrap:wrap"><div style="width:48px;height:48px;border-radius:14px;background:var(--inv-soft);display:flex;align-items:center;justify-content:center;flex:none">${sv(IC.alcancia, 24)}</div><div style="display:flex;flex-direction:column;gap:2px;flex:1;min-width:140px"><span style="font-size:16px;font-weight:800">Savings goals</span><span style="font-size:13px;font-weight:500;color:var(--inv-mute)">${n === 0 ? 'No goals yet' : n === 1 ? '1 goal' : n + ' goals'}</span></div><button type="button" data-act="abrir" data-arg="ahorro" style="min-height:44px;padding:0 16px;border:0;border-radius:12px;background:var(--surf);color:var(--ink);font-size:14px;font-weight:800;cursor:pointer;display:flex;align-items:center;gap:6px">${sv(IC.mas, 16, 2.5)}New goal</button></section>
  ${n > 0 ? `<div style="display:grid;grid-template-columns:repeat(${v === 'telefono' ? 1 : v === 'tablet' ? 2 : 3},minmax(0,1fr));gap:12px;align-items:start">${D.metas.map(metaHTML).join('')}</div>`
    : `<div style="border-radius:20px;border:2px dashed var(--line2);padding:32px 24px;display:flex;flex-direction:column;align-items:center;gap:10px;text-align:center">${sv(IC.alcancia, 40, 1.6, 'style="color:var(--muted)"')}<span style="font-size:16px;font-weight:800">No goals yet</span><span style="font-size:13px;font-weight:600;color:var(--muted)">Create one to start setting money aside.</span></div>`}</div>`;
}

// ───────── MOVIMIENTOS ─────────
function resumenDe(lunes) {
  const domingo = sumarDias(lunes, 6), dentro = (f) => f >= lunes && f <= domingo;
  const r = { gastaste: 0, comprado: 0, ganaste: 0, porCat: {}, porDia: [0, 0, 0, 0, 0, 0, 0] };
  const sumar = (f, cat, c) => { r.gastaste += c; r.porCat[cat] = (r.porCat[cat] || 0) + c; r.porDia[Math.round((aFecha(f) - aFecha(lunes)) / 864e5)] += c; };
  for (const m of D.movs) {
    if (m.tipo === 'ingreso' && dentro(m.f)) r.ganaste += m.c;
    if (m.tipo !== 'gasto') continue;
    if (dentro(m.f)) r.comprado += m.c;
    if (m.msi > 1) {
      for (let k = 0; k < m.msi; k++) {
        const f = mesesDespues(m.f, k), cuota = Math.floor(m.c / m.msi) + (k === 0 ? m.c % m.msi : 0);
        if (dentro(f)) sumar(f, m.cat, cuota);
      }
    } else if (dentro(m.f)) sumar(m.f, m.cat, m.c);
  }
  return r;
}
function movimientosHTML() {
  const v = S.modo, lap = v === 'laptop', M = S.mov;
  const sel = M.sel, fSel = aFecha(sel), CON = new Set(D.movs.map((m) => m.f));
  const dia = (s) => {
    const el = s === sel, esHoy = s === HOY, fut = s > HOY, d = aFecha(s);
    return { s, el, fut, esHoy, con: CON.has(s), et: DIAS[d.getUTCDay()] + ', ' + MESES[d.getUTCMonth()] + ' ' + d.getUTCDate() + (CON.has(s) ? ', with transactions' : '') };
  };
  const lunes = sumarDias(sel, -((fSel.getUTCDay() + 6) % 7)), domingo = sumarDias(lunes, 6);
  const fL = aFecha(lunes), fD = aFecha(domingo), c3 = (d) => MESES[d.getUTCMonth()].slice(0, 3);
  const rango = fL.getUTCMonth() === fD.getUTCMonth() ? fL.getUTCDate() + ' – ' + fD.getUTCDate() + ' ' + c3(fD) : fL.getUTCDate() + ' ' + c3(fL) + ' – ' + fD.getUTCDate() + ' ' + c3(fD);
  const sinSig = sumarDias(lunes, 7) > HOY;
  const semanaVista = M.vista === 'semana';
  const lunesHoy = sumarDias(HOY, -((aFecha(HOY).getUTCDay() + 6) % 7));
  const flecha = (act, lab, ic, dis, tam) => `<button type="button" data-act="${act}" ${dis ? 'disabled' : ''} aria-label="${lab}" style="width:${tam}px;height:${tam}px;border:0;border-radius:${tam / 2}px;background:transparent;color:var(--muted);cursor:pointer;display:flex;align-items:center;justify-content:center;padding:0;opacity:${dis ? .3 : 1}">${sv(ic, 20, 2.2)}</button>`;
  const seg = (on) => `border:0;border-radius:10px;min-height:40px;background:${on ? '#2F5BEA' : 'transparent'};color:${on ? '#fff' : 'var(--muted)'};font-size:14px;font-weight:800;cursor:pointer;transition:background 200ms ease`;
  const card = 'background:var(--surf);border:1px solid var(--line);border-radius:20px';
  const noEsHoy = sel !== HOY, conBotonCal = !lap && !semanaVista;
  const encabezado = `<div style="display:flex;align-items:center;gap:8px;margin-bottom:16px"><div style="flex:1 1 auto;min-width:0"><h1 style="font-size:${lap || v === 'tablet' ? 30 : 26}px;font-weight:800;letter-spacing:-.02em">Transactions</h1><p style="margin:2px 0 0;font-size:13px;font-weight:600;color:var(--muted)">${semanaVista ? 'Your spending and income from Monday to Sunday' : 'Pick a day to see only that day'}</p></div>
    ${noEsHoy ? `<button type="button" data-act="irHoy" style="min-height:44px;padding:0 16px;border-radius:22px;border:1px solid var(--line);background:var(--surf);color:var(--ink);font-size:14px;font-weight:800;cursor:pointer;white-space:nowrap">${semanaVista ? 'This week' : 'Today'}</button>` : ''}
    ${conBotonCal ? `<button type="button" data-act="alternarCal" aria-label="${M.cal ? 'Hide calendar' : 'View calendar'}" aria-pressed="${M.cal}" style="width:44px;height:44px;border-radius:22px;border:1px solid ${M.cal ? 'var(--accent-soft)' : 'var(--line)'};background:${M.cal ? 'var(--accent-soft)' : 'var(--surf)'};color:${M.cal ? 'var(--accent-text)' : 'var(--ink)'};display:flex;align-items:center;justify-content:center;cursor:pointer;padding:0">${sv(IC.calendario, 20)}</button>` : ''}</div>
    <div role="group" aria-label="View by" style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:4px;padding:4px;max-width:360px;${card.replace('border-radius:20px', 'border-radius:14px')};margin-bottom:16px"><button type="button" data-act="verDia" aria-pressed="${!semanaVista}" style="${seg(!semanaVista)}">Day</button><button type="button" data-act="verSemana" aria-pressed="${semanaVista}" style="${seg(semanaVista)}">Week</button></div>`;
  const col1 = `flex:1 1 300px;max-width:${lap ? '380px' : '100%'};min-width:0;display:flex;flex-direction:column;gap:12px`;
  let cuerpo = '';
  if (semanaVista) {
    const rs = resumenDe(lunes), ant = resumenDe(sumarDias(lunes, -7)), quedo = rs.ganaste - rs.gastaste, dif = rs.gastaste - ant.gastaste;
    const maxDia = Math.max(1, ...rs.porDia);
    const barras = rs.porDia.map((c, i) => {
      const s = sumarDias(lunes, i), dd = aFecha(s), fut = s > HOY, esMax = c > 0 && c === maxDia;
      return `<button type="button" data-act="irDiaBarra" data-arg="${s}" ${fut ? 'disabled' : ''} aria-label="${DIAS[dd.getUTCDay()]} ${dd.getUTCDate()}: gastaste ${dinero(c)}" style="border:0;background:transparent;padding:0;cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:6px;opacity:${fut ? .35 : 1}"><span style="font-size:10px;font-weight:700;color:var(--muted);height:14px;white-space:nowrap">${c > 0 ? '$' + Math.round(c / 100).toLocaleString('es-MX') : ''}</span><span style="width:100%;height:110px;display:flex;align-items:flex-end;justify-content:center"><span style="width:70%;max-width:32px;height:${Math.round((c / maxDia) * 100)}%;min-height:3px;border-radius:8px;background:${esMax ? '#2F5BEA' : 'var(--bar)'};transition:height 300ms ease"></span></span><span style="font-size:12px;font-weight:800;color:${s === HOY ? 'var(--accent-text)' : 'var(--muted)'}">${LETRAS[i]}</span></button>`;
    }).join('');
    const total = Math.max(1, rs.gastaste);
    const cats = Object.keys(rs.porCat).map((k) => ({ k, c: rs.porCat[k] })).sort((a, b) => b.c - a.c);
    let comp = 'Same as last week'; if (dif < 0) comp = dinero(-dif) + ' less than last week'; if (dif > 0) comp = dinero(dif) + ' more than last week';
    cuerpo = `<div class="a-aparecer-sube" style="display:flex;flex-wrap:wrap;gap:16px;align-items:flex-start"><div style="${col1}">
      <section aria-label="Week totals" style="${card};padding:10px 18px 18px"><div style="display:flex;align-items:center;justify-content:space-between;margin:0 -10px">${flecha('semanaAnt', 'Previous week', IC.izq, false, 44)}<div style="text-align:center"><div style="font-size:15px;font-weight:800">${rango}</div><div style="font-size:12px;font-weight:700;color:var(--muted)">${lunes === lunesHoy ? 'This week' : lunes === sumarDias(lunesHoy, -7) ? 'Last week' : fL.getUTCFullYear()}</div></div>${flecha('semanaSig', 'Next week', IC.der, sinSig, 44)}</div>
        <div style="margin-top:10px"><div style="font-size:13px;font-weight:700;color:var(--muted)">Spent</div><div style="font-family:'Space Grotesk',sans-serif;font-size:40px;font-weight:700;letter-spacing:-.02em;line-height:1.1;margin-top:2px">${dinero(rs.gastaste)}</div>${rs.comprado !== rs.gastaste ? `<div style="font-size:13px;font-weight:600;color:var(--muted);margin-top:4px">Total charged: <strong style="color:var(--ink)">${dinero(rs.comprado)}</strong> · installment plans count monthly payment only</div>` : ''}</div>
        <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-top:14px"><div style="background:var(--bg);border-radius:14px;padding:12px 14px"><div style="font-size:12px;font-weight:700;color:var(--muted)">Earned</div><div style="font-family:'Space Grotesk',sans-serif;font-size:20px;font-weight:700;margin-top:2px;color:var(--green);white-space:nowrap">+${dinero(rs.ganaste)}</div></div><div style="background:var(--bg);border-radius:14px;padding:12px 14px"><div style="font-size:12px;font-weight:700;color:var(--muted)">Left over</div><div style="font-family:'Space Grotesk',sans-serif;font-size:20px;font-weight:700;margin-top:2px;color:${quedo < 0 ? 'var(--red)' : 'var(--green)'};white-space:nowrap">${quedo < 0 ? '−' : '+'}${dinero(Math.abs(quedo))}</div></div></div>
        <p style="margin:12px 0 0;font-size:13px;font-weight:700;color:${dif > 0 ? 'var(--red)' : dif < 0 ? 'var(--green)' : 'var(--muted)'}">${comp}</p><p style="margin:6px 0 0;font-size:12px;font-weight:600;color:var(--muted)">Card payments, transfers, and savings deposits are excluded.</p></section>
      <section aria-label="Day by day" style="${card};padding:16px 14px 12px"><div style="display:flex;justify-content:space-between;align-items:baseline;padding:0 4px 12px"><h2 style="font-size:15px;font-weight:800">Day by day</h2><span style="font-size:12px;font-weight:600;color:var(--muted)">Tap a day to see it</span></div><div style="display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:6px">${barras}</div></section></div>
      <section aria-label="Where did it go" style="flex:999 1 340px;min-width:0;${card};overflow:hidden"><div style="display:flex;align-items:center;justify-content:space-between;padding:14px 18px;border-bottom:1px solid var(--line)"><span style="font-size:15px;font-weight:800">Where did it go?</span><span style="font-size:13px;font-weight:700;color:var(--muted)">${dinero(rs.gastaste)}</span></div>
      ${cats.length ? `<ul style="padding:4px 0">${cats.map((x) => { const pc = Math.round((x.c / total) * 100); return `<li style="display:flex;align-items:center;gap:12px;padding:12px 18px"><span style="flex:none;width:40px;height:40px;border-radius:13px;background:var(--accent-soft);color:var(--accent-text);display:flex;align-items:center;justify-content:center">${sv(iconoCat(x.k), 19)}</span><div style="flex:1 1 auto;min-width:0"><div style="display:flex;justify-content:space-between;gap:8px;align-items:baseline"><span style="font-size:15px;font-weight:800;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(x.k)}</span><span style="font-family:'Space Grotesk',sans-serif;font-size:15px;font-weight:700;white-space:nowrap">${dinero(x.c)}</span></div><div style="display:flex;align-items:center;gap:10px;margin-top:6px"><span style="flex:1 1 auto;height:8px;border-radius:4px;background:var(--bg);overflow:hidden"><span style="display:block;height:100%;width:${Math.max(2, pc)}%;border-radius:4px;background:#2F5BEA"></span></span><span style="flex:none;width:36px;text-align:right;font-size:12px;font-weight:700;color:var(--muted)">${pc}%</span></div></div></li>`; }).join('')}</ul>`
        : `<div style="padding:48px 24px;text-align:center"><div style="font-size:16px;font-weight:800">No expenses this week</div><div style="font-size:13px;font-weight:600;color:var(--muted);margin-top:6px">Once you log expenses, they'll appear here by category.</div></div>`}</section></div>`;
  } else {
    const estiloDia = (d, grande) => `border:${d.esHoy && !d.el ? '1.5px solid #2F5BEA' : '1.5px solid transparent'};background:${d.el ? '#2F5BEA' : 'transparent'};color:${d.el ? '#fff' : 'var(--ink)'};opacity:${d.fut ? .35 : 1};cursor:pointer;padding:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:${grande ? 3 : 2}px`;
    const punto = (d, s) => `<span style="width:${s}px;height:${s}px;border-radius:${s / 2}px;background:${d.con ? (d.el ? '#fff' : '#2F5BEA') : 'transparent'}"></span>`;
    const tira = !lap ? `<section aria-label="Week" style="${card};padding:10px 8px 12px"><div style="display:flex;align-items:center;justify-content:space-between;padding:0 4px 8px">${flecha('semanaAnt', 'Previous week', IC.izq, false, 40)}<span style="font-size:14px;font-weight:800">${rango}</span>${flecha('semanaSig', 'Next week', IC.der, sinSig, 40)}</div><div style="display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:4px">${[0, 1, 2, 3, 4, 5, 6].map((i) => { const d = dia(sumarDias(lunes, i)); return `<button type="button" data-act="elegirDia" data-arg="${d.s}" ${d.fut ? 'disabled' : ''} aria-pressed="${d.el}" aria-label="${d.et}" style="min-height:64px;border-radius:16px;${estiloDia(d, true)}"><span style="font-size:11px;font-weight:700;color:${d.el ? 'rgba(255,255,255,.85)' : 'var(--muted)'}">${LETRAS[i]}</span><span style="font-family:'Space Grotesk',sans-serif;font-size:18px;font-weight:700">${aFecha(d.s).getUTCDate()}</span>${punto(d, 5)}</button>`; }).join('')}</div></section>` : '';
    let calHTML = '';
    if (lap || M.cal) {
      const mv = M.mesVista, fMes = aFecha(mv), blancos = (fMes.getUTCDay() + 6) % 7, nd = new Date(Date.UTC(fMes.getUTCFullYear(), fMes.getUTCMonth() + 1, 0)).getUTCDate();
      let celdas = '<span style="height:44px"></span>'.repeat(blancos);
      for (let n = 1; n <= nd; n++) { const d = dia(mv.slice(0, 8) + p2(n)); celdas += `<button type="button" data-act="elegirDia" data-arg="${d.s}" ${d.fut ? 'disabled' : ''} aria-pressed="${d.el}" aria-label="${d.et}" style="height:44px;border-radius:14px;${estiloDia(d, false)};font-family:'Space Grotesk',sans-serif;font-size:15px;font-weight:600">${n}${punto(d, 4)}</button>`; }
      const sinMes = sumarMeses(mv, 1) > HOY;
      calHTML = `<section aria-label="Calendario" style="${card};padding:10px 12px 14px"><div style="display:flex;align-items:center;justify-content:space-between;padding-bottom:6px">${flecha('mesAnt', 'Mes anterior', IC.izq, false, 40)}<span style="font-size:15px;font-weight:800">${cap(MESES[fMes.getUTCMonth()])} ${fMes.getUTCFullYear()}</span>${flecha('mesSig', 'Mes siguiente', IC.der, sinMes, 40)}</div><div style="display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:2px;text-align:center;padding-bottom:4px">${LETRAS.map((l) => `<span style="font-size:11px;font-weight:700;color:var(--muted);padding:4px 0">${l}</span>`).join('')}</div><div style="display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:2px">${celdas}</div></section>`;
    }
    const delDia = D.movs.filter((m) => m.f === sel).sort((a, b) => b.id - a.id);
    const gastado = delDia.filter((m) => m.tipo === 'gasto').reduce((a, m) => a + m.c, 0), entro = delDia.filter((m) => m.tipo === 'ingreso').reduce((a, m) => a + m.c, 0);
    const nombreDia = DIAS[fSel.getUTCDay()];
    let titulo = cap(nombreDia) + ', ' + MESES[fSel.getUTCMonth()] + ' ' + fSel.getUTCDate();
    if (fSel.getUTCFullYear() !== aFecha(HOY).getUTCFullYear()) titulo += ', ' + fSel.getUTCFullYear();
    const chip = sel === HOY ? 'Today' : sel === sumarDias(HOY, -1) ? 'Yesterday' : '';
    const filas = delDia.map((m, i) => {
      const ult = i === delDia.length - 1; let t, et = '', ic, fi, ci, mo, cm;
      if (m.tipo === 'gasto') { t = m.desc || m.cat; et = m.desc ? m.cat : ''; ic = iconoCat(m.cat); fi = 'var(--accent-soft)'; ci = 'var(--accent-text)'; mo = '−' + dinero(m.c); cm = 'var(--ink)'; }
      else if (m.tipo === 'ingreso') { t = m.desc || 'Ingreso'; et = m.desc ? 'Ingreso' : ''; ic = iconoCat(m.cat); fi = 'var(--green-soft)'; ci = 'var(--green)'; mo = '+' + dinero(m.c); cm = 'var(--green)'; }
      else { t = m.desc; ic = ICON_MOV[m.tipo]; fi = 'var(--neutral-soft)'; ci = 'var(--muted)'; mo = dinero(m.c); cm = 'var(--muted)'; }
      return `<li style="display:flex;align-items:center;gap:12px;padding:12px 18px;border-bottom:${ult ? 0 : '1px solid var(--line)'}"><span style="flex:none;width:42px;height:42px;border-radius:14px;background:${fi};color:${ci};display:flex;align-items:center;justify-content:center">${sv(ic, 20)}</span><div style="flex:1 1 auto;min-width:0"><div style="display:flex;align-items:baseline;gap:6px;min-width:0"><span style="font-size:15px;font-weight:800;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0">${esc(t)}</span>${et ? `<span style="flex:none;font-size:12px;font-weight:700;color:var(--muted)">${esc(et)}</span>` : ''}</div><div style="font-size:13px;font-weight:600;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:1px">${esc(origenDe(m))}</div></div><span style="flex:none;font-family:'Space Grotesk',sans-serif;font-size:16px;font-weight:700;color:${cm}">${mo}</span></li>`;
    }).join('');
    cuerpo = `<div class="a-aparecer-sube" style="display:flex;flex-wrap:wrap;gap:16px;align-items:flex-start"><div style="${col1}">${tira}${calHTML}
      <section aria-label="Day summary" style="${card};padding:16px 18px"><div style="display:flex;align-items:baseline;gap:8px;flex-wrap:wrap"><h2 style="font-size:18px;font-weight:800">${titulo}</h2>${chip ? `<span style="font-size:12px;font-weight:800;color:var(--accent-text);background:var(--accent-soft);padding:3px 10px;border-radius:10px">${chip}</span>` : ''}</div><div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-top:14px"><div style="background:var(--bg);border-radius:14px;padding:12px 14px"><div style="font-size:12px;font-weight:700;color:var(--muted)">Spent</div><div style="font-family:'Space Grotesk',sans-serif;font-size:22px;font-weight:700;margin-top:2px;white-space:nowrap">${dinero(gastado)}</div></div><div style="background:var(--bg);border-radius:14px;padding:12px 14px"><div style="font-size:12px;font-weight:700;color:var(--muted)">Received</div><div style="font-family:'Space Grotesk',sans-serif;font-size:22px;font-weight:700;margin-top:2px;color:var(--green);white-space:nowrap">${dinero(entro)}</div></div></div>${delDia.some((m) => m.tipo === 'pago' || m.tipo === 'transferencia') ? `<p style="margin:10px 0 0;font-size:12px;font-weight:600;color:var(--muted)">Card payments and transfers are not counted as expenses.</p>` : ''}</section></div>
      <section aria-label="Transactions" style="flex:999 1 340px;min-width:0;${card};overflow:hidden"><div style="display:flex;align-items:center;justify-content:space-between;padding:14px 18px;border-bottom:1px solid var(--line)"><span style="font-size:15px;font-weight:800">${sel === HOY ? 'Today' : 'That day'}</span><span style="font-size:13px;font-weight:700;color:var(--muted)">${delDia.length === 1 ? '1 transaction' : delDia.length + ' transactions'}</span></div>
      ${delDia.length ? `<ul style="padding:4px 0">${filas}</ul>` : `<div style="padding:48px 24px;display:flex;flex-direction:column;align-items:center;text-align:center;gap:10px"><span style="width:56px;height:56px;border-radius:28px;background:var(--bg);color:var(--muted);display:flex;align-items:center;justify-content:center">${sv(IC.calVacio, 26)}</span><div style="font-size:16px;font-weight:800">No transactions this day</div><div style="font-size:13px;font-weight:600;color:var(--muted);max-width:240px">Once you log something with this date, it'll appear here.</div></div>`}</section></div>`;
  }
  return `<div style="width:100%;padding:${lap ? '0' : v === 'tablet' ? '32px 32px 190px' : '20px 20px 180px'}">${encabezado}${cuerpo}</div>`;
}

// ───────── DISPOSITIVOS ─────────
const TIPO_TXT = { telefono: 'Phone', tablet: 'Tablet', laptop: 'Laptop' };
function nombreEste() { return D.nombreDisp || (S.modo === 'laptop' ? 'My laptop' : S.modo === 'tablet' ? 'My tablet' : 'My phone'); }
function qrMuestra() {
  const out = [];
  const esq = (r, c, r0, c0) => { const y = r - r0, x = c - c0; if (y < 0 || x < 0 || y > 6 || x > 6) return null; if (y === 0 || y === 6 || x === 0 || x === 6) return true; return y >= 2 && y <= 4 && x >= 2 && x <= 4; };
  for (let r = 0; r < 21; r++) for (let c = 0; c < 21; c++) {
    let v = esq(r, c, 0, 0); if (v === null) v = esq(r, c, 0, 14); if (v === null) v = esq(r, c, 14, 0);
    if (v === null) { const cerca = (r < 8 && c < 8) || (r < 8 && c > 12) || (r > 12 && c < 8); v = cerca ? false : ((r * 7 + c * 13 + r * c) % 5 < 2); }
    out.push(`<span style="background:${v ? '#10151F' : '#fff'}"></span>`);
  }
  return out.join('');
}
function dispositivosHTML() {
  const X = S.disp, lap = S.modo === 'laptop', ocu = X.sinc !== null;
  const alc = X.otros.filter((o) => o.enWifi && !o.reemparejar), fuera = X.otros.length - alc.length;
  const tipoEste = S.modo;
  const lista = X.otros.map((o, i) => {
    const sincEste = X.sinc === o.id || (X.sinc === 'todos' && o.enWifi && !o.reemparejar);
    let estado, ce, cp;
    if (o.reemparejar) { estado = 'Rescan code to keep syncing'; ce = cp = 'var(--orange)'; }
    else if (!o.enWifi) { estado = 'Not on your Wi-Fi'; ce = 'var(--muted)'; cp = 'var(--grey)'; }
    else if (o.atrasado) { estado = 'On Wi-Fi · falling behind'; ce = 'var(--orange)'; cp = 'var(--green)'; }
    else { estado = 'On your Wi-Fi'; ce = cp = 'var(--green)'; }
    const principal = o.reemparejar || o.enWifi;
    return `<li style="display:flex;align-items:center;gap:12px;padding:14px 12px 14px 18px;border-bottom:${i === X.otros.length - 1 ? 0 : '1px solid var(--line)'}"><span style="flex:none;width:46px;height:46px;border-radius:14px;background:var(--accent-soft);color:var(--accent-text);display:flex;align-items:center;justify-content:center;position:relative">${sv(IC[o.tipo], 23)}<span aria-hidden="true" style="position:absolute;right:-2px;bottom:-2px;width:12px;height:12px;border-radius:6px;background:${cp};border:2px solid var(--surf)"></span></span>
      <div style="flex:1 1 auto;min-width:0"><div style="display:flex;align-items:baseline;gap:6px;min-width:0"><span style="font-size:15px;font-weight:800;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(o.nombre)}</span><span style="flex:none;font-size:12px;font-weight:700;color:var(--muted)">${TIPO_TXT[o.tipo]}</span></div><div style="font-size:13px;font-weight:600;color:var(--muted);margin-top:2px">Last synced: <strong style="color:${o.atrasado ? 'var(--orange)' : 'var(--ink)'};font-weight:800">${esc(o.ultima)}</strong></div><div style="font-size:12px;font-weight:700;color:${sincEste ? 'var(--accent-text)' : ce};margin-top:3px">${sincEste ? 'Syncing…' : estado}</div></div>
      <div style="flex:none;display:flex;align-items:center;gap:2px"><button type="button" data-act="dSync" data-arg="${o.id}" ${ocu ? 'disabled' : ''} style="min-height:40px;padding:0 12px;border-radius:12px;border:1px solid ${principal ? 'var(--accent-soft)' : 'var(--line)'};background:${principal ? 'var(--accent-soft)' : 'transparent'};color:${principal ? 'var(--accent-text)' : 'var(--muted)'};font-size:13px;font-weight:800;display:flex;align-items:center;gap:6px;cursor:pointer;white-space:nowrap">${sv(o.reemparejar ? IC.qr : IC.sync, 16, 2.4, sincEste ? 'class="a-girar"' : '')}${o.reemparejar ? 'Pair' : 'Sync'}</button><button type="button" data-act="dOlvidar" data-arg="${o.id}" aria-label="More options for ${esc(o.nombre)}" style="width:40px;height:40px;border-radius:20px;border:0;background:transparent;color:var(--muted);display:flex;align-items:center;justify-content:center;cursor:pointer;padding:0">${sv(IC.puntos, 20, 3)}</button></div></li>`;
  }).join('');
  let overlay = '';
  if (X.panel === 'agregar') {
    const sb = (on) => `min-height:40px;border:0;border-radius:10px;background:${on ? '#2F5BEA' : 'transparent'};color:${on ? '#fff' : 'var(--muted)'};font-size:14px;font-weight:800;cursor:pointer`;
    const esquinas = ['left:28px;top:28px;border-left:4px solid #fff;border-top:4px solid #fff;border-radius:8px 0 0 0', 'right:28px;top:28px;border-right:4px solid #fff;border-top:4px solid #fff;border-radius:0 8px 0 0', 'left:28px;bottom:28px;border-left:4px solid #fff;border-bottom:4px solid #fff;border-radius:0 0 0 8px', 'right:28px;bottom:28px;border-right:4px solid #fff;border-bottom:4px solid #fff;border-radius:0 0 8px 0'];
    overlay = `<div style="position:fixed;inset:0;z-index:60;display:flex;align-items:${lap ? 'center' : 'flex-end'};justify-content:center"><button type="button" aria-label="Close" data-act="dCerrar" style="position:absolute;inset:0;width:100%;height:100%;border:0;padding:0;background:rgba(11,15,23,.5);cursor:pointer;animation:aparecer 220ms ease-out"></button>
      <div role="dialog" aria-label="Add device" style="position:relative;width:100%;max-width:${lap ? 440 : 640}px;max-height:96vh;overflow-y:auto;background:var(--surf);border-radius:${lap ? '24px' : '24px 24px 0 0'};padding:22px 22px 24px;animation:${lap ? 'acercar2 240ms' : 'subir 300ms'} cubic-bezier(.2,.8,.2,1)">
      <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:4px;padding:4px;background:var(--bg);border-radius:14px"><button type="button" data-act="dModo" data-arg="qr" aria-pressed="${X.modo === 'qr'}" style="${sb(X.modo === 'qr')}">Show my code</button><button type="button" data-act="dModo" data-arg="escaner" aria-pressed="${X.modo === 'escaner'}" style="${sb(X.modo === 'escaner')}">Scan code</button></div>
      ${X.modo === 'qr' ? `<div style="display:flex;flex-direction:column;align-items:center;text-align:center;gap:12px;padding-top:18px"><div style="background:#fff;padding:14px;border-radius:18px;border:1px solid #E3E7EE"><div role="img" aria-label="QR code to pair" style="width:189px;height:189px;display:grid;grid-template-columns:repeat(21,minmax(0,1fr))">${qrMuestra()}</div></div><div style="font-size:17px;font-weight:800">Scan it from your other device</div><div style="font-size:13px;font-weight:600;color:var(--muted);max-width:300px;line-height:1.5">On the other, open Mendis → Devices → Add device → <strong>Scan code</strong>.</div><div style="display:flex;align-items:center;gap:8px;font-size:13px;font-weight:700;color:var(--accent-text)">${sv(IC.girar, 16, 2.4, 'style="animation:girar 1s linear infinite"')}Waiting for the other device…</div><button type="button" data-act="dSimular" style="min-height:44px;padding:0 16px;border-radius:12px;border:1px solid var(--line);background:var(--bg);color:var(--muted);font-size:12px;font-weight:700;cursor:pointer">Simulate: other device scanned it</button></div>`
        : `<div style="display:flex;flex-direction:column;align-items:center;text-align:center;gap:12px;padding-top:18px"><div style="width:217px;height:217px;border-radius:18px;background:#0B0F17;position:relative;overflow:hidden">${esquinas.map((e) => `<span style="position:absolute;width:34px;height:34px;${e}"></span>`).join('')}<span style="position:absolute;left:36px;right:36px;top:107px;height:2px;background:#4ADE80"></span></div><div style="font-size:17px;font-weight:800">Point at the other device's code</div><div style="font-size:13px;font-weight:600;color:var(--muted);max-width:300px;line-height:1.5">Use this on the <strong>new</strong> device. On the already-paired one, tap "Show my code".</div></div>`}
      <button type="button" data-act="dCerrar" style="margin-top:18px;width:100%;min-height:48px;border-radius:14px;border:1px solid var(--line);background:var(--surf);color:var(--ink);font-size:15px;font-weight:800;cursor:pointer">Close</button></div></div>`;
  }
  const obj = X.otros.find((o) => o.id === X.olvidar);
  if (obj) {
    const rest = X.otros.filter((o) => o.id !== obj.id).map((o) => o.nombre);
    overlay += `<div style="position:fixed;inset:0;z-index:70;display:flex;align-items:center;justify-content:center;padding:20px"><button type="button" aria-label="Cancel" data-act="dCerrar" style="position:absolute;inset:0;width:100%;height:100%;border:0;padding:0;background:rgba(11,15,23,.5);cursor:pointer;animation:aparecer 220ms ease-out"></button><div role="alertdialog" aria-label="Forget device" style="position:relative;width:100%;max-width:400px;background:var(--surf);border-radius:22px;padding:22px;animation:acercar2 240ms cubic-bezier(.2,.8,.2,1)"><div style="font-size:19px;font-weight:800">Forget "${esc(obj.nombre)}"?</div><p style="margin:10px 0 0;font-size:14px;font-weight:600;color:var(--muted);line-height:1.5">A new key will be created and <strong style="color:var(--ink)">${esc(obj.nombre)}</strong> will no longer sync with you. What's already saved on that device won't be deleted.</p>${rest.length ? `<p style="margin:10px 0 0;font-size:14px;font-weight:600;color:var(--muted);line-height:1.5">You'll need to re-scan the code on: <strong style="color:var(--ink)">${esc(rest.join(', '))}</strong>.</p>` : ''}<div style="display:flex;gap:10px;margin-top:20px"><button type="button" data-act="dCerrar" style="flex:1 1 0;min-height:48px;border-radius:14px;border:1px solid var(--line);background:var(--surf);color:var(--ink);font-size:15px;font-weight:800;cursor:pointer">Cancel</button><button type="button" data-act="dConfirmar" style="flex:1 1 0;min-height:48px;border-radius:14px;border:0;background:var(--danger-btn);color:#fff;font-size:15px;font-weight:800;cursor:pointer">Forget</button></div></div></div>`;
  }
  const aviso = X.aviso ? `<div role="status" style="position:fixed;left:16px;right:16px;top:12px;z-index:80;display:flex;justify-content:center;pointer-events:none;animation:${X.saliendo ? 'desvanecer 300ms ease forwards' : 'bajar 240ms ease-out'}"><div style="max-width:460px;padding:13px 16px;border-radius:14px;background:var(--toast-bg);color:var(--toast-ink);font-size:14px;font-weight:700;display:flex;align-items:center;gap:10px;box-shadow:0 12px 24px -12px rgba(0,0,0,.5)">${sv(X.tipoAviso === 'error' ? IC.alerta : IC.check, 18, 3, `style="color:${X.tipoAviso === 'error' ? '#F87171' : '#4ADE80'}"`)}${esc(X.aviso)}</div></div>` : '';
  return `<div style="padding:${lap ? '0' : S.modo === 'tablet' ? '28px 32px 40px' : '18px 16px 32px'}">
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:20px">${lap ? '' : `<button type="button" class="btn-round" data-act="tab" data-arg="inicio" aria-label="Back" style="width:44px;height:44px;border-radius:22px">${sv(IC.izq, 20, 2.2)}</button>`}<div style="flex:1 1 auto;min-width:0"><h1 style="font-size:${lap || S.modo === 'tablet' ? 32 : 26}px;font-weight:800;letter-spacing:-.02em">Dispositivos</h1><p style="margin:2px 0 0;font-size:13px;font-weight:600;color:var(--muted)">Sincroniza por Wi-Fi, sin nube</p></div></div>
    <div style="display:flex;flex-wrap:wrap;gap:16px;align-items:flex-start"><div style="flex:1 1 300px;max-width:${lap ? '380px' : '100%'};min-width:0;display:flex;flex-direction:column;gap:12px">
      <section aria-label="Este dispositivo" style="background:var(--inv);color:var(--inv-ink);border-radius:22px;padding:18px"><div style="display:flex;align-items:center;gap:14px"><span style="flex:none;width:52px;height:52px;border-radius:16px;background:var(--inv-soft);display:flex;align-items:center;justify-content:center">${sv(IC[tipoEste], 26)}</span><div style="flex:1 1 auto;min-width:0"><div style="font-size:12px;font-weight:700;opacity:.75">This device · ${TIPO_TXT[tipoEste]}</div><div style="font-size:18px;font-weight:800;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(nombreEste())}</div></div><button type="button" data-act="dRenombrar" aria-label="Rename" style="flex:none;width:40px;height:40px;border-radius:20px;border:0;background:var(--inv-soft);color:var(--inv-ink);display:flex;align-items:center;justify-content:center;cursor:pointer;padding:0">${sv(IC.lapiz, 18)}</button></div>
      <button type="button" data-act="dSync" data-arg="todos" ${ocu || !alc.length ? 'disabled' : ''} style="margin-top:16px;width:100%;min-height:52px;border:0;border-radius:16px;background:#2F5BEA;color:#fff;font-size:16px;font-weight:800;display:flex;align-items:center;justify-content:center;gap:10px;cursor:pointer;opacity:${ocu || !alc.length ? .6 : 1}">${sv('M20 11a8 8 0 0 0-14.5-4.5L4 8M4 3v5h5M4 13a8 8 0 0 0 14.5 4.5L20 16M20 21v-5h-5', 20, 2.2, X.sinc === 'todos' ? 'class="a-girar"' : '')}${X.sinc === 'todos' ? 'Syncing…' : 'Sync now'}</button></section>
      <button type="button" data-act="dAgregar" style="min-height:52px;border-radius:16px;border:1.5px dashed var(--line3);background:var(--surf);color:var(--ink);font-size:15px;font-weight:800;display:flex;align-items:center;justify-content:center;gap:8px;cursor:pointer">${sv(IC.mas, 20, 2.4)}Add device</button>
      <p style="margin:0 4px;font-size:12px;font-weight:600;color:var(--muted);line-height:1.5">To sync, both devices must be on the same Wi-Fi with Mendis open. All data travels encrypted.</p></div>
      <section aria-label="Your other devices" style="flex:999 1 340px;min-width:0;background:var(--surf);border:1px solid var(--line);border-radius:20px;overflow:hidden"><div style="display:flex;align-items:center;justify-content:space-between;padding:14px 18px;border-bottom:1px solid var(--line)"><span style="font-size:15px;font-weight:800">Your other devices</span><span style="font-size:13px;font-weight:700;color:var(--muted)">${X.otros.length === 1 ? '1 device' : X.otros.length + ' devices'}</span></div><ul>${lista}</ul>${X.otros.length === 0 ? `<div style="padding:40px 24px;text-align:center"><div style="font-size:16px;font-weight:800">No other devices yet</div><div style="font-size:13px;font-weight:600;color:var(--muted);margin-top:6px">Tap "Add device" and scan the code from the other one.</div></div>` : ''}</section></div></div>${overlay}${aviso}`;
}

// ───────── PANELES ─────────
const F = () => S.f;
const campoTxt = 'height:52px;padding:0 16px;border-radius:14px;border:1px solid var(--line);background:var(--field);color:var(--ink);font-size:16px;font-weight:600;outline-color:var(--accent)';
function marco(titulo, cuerpo, pie) {
  const m = S.modo, hoja = m === 'telefono';
  const anim = S.anim.panel ? (hoja ? 'animation:subir 320ms cubic-bezier(.2,.8,.2,1);' : 'animation:acercar 260ms cubic-bezier(.2,.8,.2,1);') : '';
  const cont = hoja ? 'position:absolute;left:0;right:0;bottom:0;' : `position:relative;width:${m === 'laptop' ? 640 : 560}px;max-width:calc(100% - 32px);`;
  return `<div style="position:fixed;inset:0;z-index:50;display:flex;align-items:center;justify-content:center"><button type="button" aria-label="Close" data-act="cerrar" style="position:absolute;inset:0;width:100%;height:100%;border:0;padding:0;background:rgba(16,21,31,.45);cursor:pointer;${S.anim.panel ? 'animation:aparecer 220ms ease-out' : ''}"></button>
  <div role="dialog" aria-label="${titulo}" style="${cont}max-height:${hoja ? 'min(804px,94vh)' : '92vh'};display:flex;flex-direction:column;overflow:hidden;border-radius:${hoja ? '28px 28px 0 0' : '24px'};background:var(--surf);color:var(--ink);box-shadow:var(--shadow-panel);${anim}">
  ${hoja ? `<div aria-hidden="true" style="display:flex;justify-content:center;padding-top:10px"><span style="width:40px;height:5px;border-radius:3px;background:var(--line)"></span></div>` : ''}
  <div style="display:flex;align-items:center;justify-content:space-between;padding:14px 20px 6px 24px"><h2 style="font-size:22px;font-weight:800;letter-spacing:-.01em">${titulo}</h2><button type="button" aria-label="Close" data-act="cerrar" style="width:44px;height:44px;border:0;border-radius:22px;background:var(--field);color:var(--ink);display:flex;align-items:center;justify-content:center;cursor:pointer;padding:0">${sv(IC.cerrar, 18, 2.5)}</button></div>
  <div data-keep="panel-body" style="flex:1;min-height:0;overflow-y:auto;padding:12px 24px 16px;display:flex;flex-direction:column;gap:20px">${cuerpo}</div>
  <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;padding:14px 24px 24px;border-top:1px solid var(--line)"><button type="button" data-act="cerrar" style="min-height:54px;border-radius:16px;border:1px solid var(--line);background:transparent;color:var(--ink);font-size:16px;font-weight:800;cursor:pointer">Cancel</button>${pie}</div></div></div>`;
}
const btnOk = (ok, txt) => `<button type="button" data-act="aceptar" ${ok ? '' : 'disabled'} style="min-height:54px;border-radius:16px;border:0;background:var(--accent-fixed);color:#fff;font-size:16px;font-weight:800;cursor:${ok ? 'pointer' : 'not-allowed'};opacity:${ok ? 1 : .4}">${txt}</button>`;
const destinoBtn = (d, sel, act) => `<button type="button" data-act="${act}" data-arg="${d.id}" aria-pressed="${sel}" aria-label="${esc(d.nombre)}, ${d.tipoTxt}${d.ultimos4 ? ', terminación ' + d.ultimos4 : ''}" style="position:relative;flex:none;width:132px;height:84px;border:0;border-radius:14px;padding:10px 12px;background:${d.color};color:#fff;display:flex;flex-direction:column;justify-content:space-between;text-align:left;cursor:pointer;outline:${sel ? '3px solid var(--accent)' : '0 solid transparent'};outline-offset:3px;overflow:hidden"><svg aria-hidden="true" viewBox="0 0 132 84" preserveAspectRatio="none" style="position:absolute;inset:0;width:100%;height:100%;pointer-events:none"><circle cx="122" cy="2" r="48" fill="#fff" fill-opacity=".09"></circle></svg><span style="position:relative;display:flex;flex-direction:column;gap:1px"><span style="font-size:13px;font-weight:800;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(d.nombre)}</span><span style="font-size:10px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:rgba(255,255,255,.85)">${d.tipoTxt}</span></span><span style="position:relative;font-family:'Space Grotesk',sans-serif;font-size:12px;font-weight:500;letter-spacing:.1em">${d.ultimos4 ? '•••• ' + d.ultimos4 : 'En la cartera'}</span>${sel ? `<span style="position:absolute;top:8px;right:8px;width:22px;height:22px;border-radius:11px;background:#fff;color:var(--accent-fixed);display:flex;align-items:center;justify-content:center">${sv(IC.check, 13, 3.5)}</span>` : ''}</button>`;
function destinosRegistro() {
  const l = [{ id: 'efectivo', nombre: 'Cash', tipoTxt: 'Cash', ultimos4: null, color: '#166534' }];
  for (const t of D.tarjetas) if (!enMeta(t.id)) l.push({ id: t.id, nombre: t.nombre, tipoTxt: t.tipo === 'debito' ? 'Debit' : 'Credit', ultimos4: t.ultimos4, color: t.color });
  return l;
}
function panelRegistro() {
  const f = F().reg, resta = f.tipo === 'resta', otros = f.concepto === 'Other', cent = centavos(f.monto);
  const dest = tarjeta(f.destino), credito = dest && dest.tipo === 'credito';
  const valido = cent !== null && cent > 0 && (!resta || (f.concepto !== null && (!otros || f.otro.trim() !== '')));
  const cols = S.modo === 'laptop' ? 6 : 4;
  const sombra = '0 1px 3px rgba(16,21,31,.12)';
  const seg = (on, act, col, ic, txt) => `<button type="button" data-act="${act}" aria-pressed="${on}" style="transition:background 180ms ease;min-height:52px;border:0;border-radius:12px;background:${on ? 'var(--surf)' : 'transparent'};color:var(--ink);box-shadow:${on ? sombra : 'none'};display:flex;align-items:center;justify-content:center;gap:8px;cursor:pointer;font-size:15px;font-weight:800"><span style="width:26px;height:26px;border-radius:13px;background:${col};color:#fff;display:flex;align-items:center;justify-content:center">${sv(ic, 14, 3)}</span>${txt}</button>`;
  const cuerpo = `<div role="group" aria-label="Transaction type" style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px;padding:5px;border-radius:16px;background:var(--field)">${seg(resta, 'regTipo', 'var(--red)', 'M5 12h14', 'Expense').replace('data-act="regTipo"', 'data-act="regTipo" data-arg="resta"')}${seg(!resta, 'regTipo', 'var(--suma)', IC.mas, 'Income').replace('data-act="regTipo"', 'data-act="regTipo" data-arg="suma"')}</div>
  <div style="display:flex;flex-direction:column;align-items:center;gap:6px"><label for="monto" style="font-size:13px;font-weight:700;color:var(--muted)">Amount</label><div style="display:flex;align-items:baseline;justify-content:center;gap:4px;width:100%;border-bottom:2px solid ${f.monto.trim() ? 'var(--accent)' : 'var(--line)'};padding-bottom:6px"><span aria-hidden="true" style="font-family:'Space Grotesk',sans-serif;font-size:40px;font-weight:600;color:${resta ? 'var(--red)' : 'var(--suma)'}">${resta ? '−' : '+'}</span><span aria-hidden="true" style="font-family:'Space Grotesk',sans-serif;font-size:40px;font-weight:600;color:var(--muted)">$</span><input id="monto" type="text" inputmode="decimal" autocomplete="off" placeholder="0.00" value="${esc(f.monto)}" data-in="regMonto" style="width:200px;max-width:60vw;border:0;outline:none;background:transparent;color:var(--ink);font-family:'Space Grotesk',sans-serif;font-size:44px;font-weight:600;text-align:left;padding:0"></div>${f.monto.trim() && (cent === null || cent === 0) ? `<span style="font-size:12px;font-weight:700;color:var(--red)">Enter a valid amount (up to 2 decimal places)</span>` : ''}</div>
  <div style="display:flex;flex-direction:column;gap:10px"><span style="font-size:14px;font-weight:800">${resta ? 'From which account?' : 'To which account?'}</span><div class="scroll-x" data-keep="dest" style="display:flex;gap:12px;overflow-x:auto;margin:0 -24px;padding:6px 24px 8px">${destinosRegistro().map((d) => destinoBtn(d, d.id === f.destino, 'regDestino')).join('')}</div></div>
  ${resta && credito ? `<div style="display:flex;flex-direction:column;gap:10px"><span style="font-size:14px;font-weight:800">How are you paying?</span><div style="display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px">${[[0, 'Full payment'], [3, '3 months'], [6, '6 months'], [12, '12 months']].map(([n, t]) => { const s = f.msi === n; return `<button type="button" data-act="regMsi" data-arg="${n}" aria-pressed="${s}" style="min-height:48px;border-radius:14px;border:2px solid ${s ? 'var(--accent)' : 'transparent'};background:${s ? 'var(--accent-soft)' : 'var(--field)'};color:${s ? 'var(--accent)' : 'var(--ink)'};font-size:12px;font-weight:700;cursor:pointer;padding:4px">${t}</button>`; }).join('')}</div>${f.msi > 0 && cent ? `<span style="font-size:12px;font-weight:600;color:var(--muted)">${f.msi} payments of ${dinero(Math.floor(cent / f.msi))} interest-free</span>` : ''}</div>` : ''}
  ${resta ? `<div style="display:flex;flex-direction:column;gap:10px"><span style="font-size:14px;font-weight:800">Category</span>${otros ? `<div class="a-desplegar" style="display:flex;flex-direction:column;gap:10px"><div style="display:flex;align-items:center;justify-content:space-between;gap:10px;padding:10px 10px 10px 14px;border-radius:14px;border:2px solid var(--accent);background:var(--accent-soft);color:var(--accent)"><span style="display:flex;align-items:center;gap:8px;font-size:14px;font-weight:800">${sv(IC_OTROS, 20, 3)}Other</span><button type="button" data-act="regVolver" style="min-height:40px;padding:0 14px;border-radius:10px;border:1px solid var(--line);background:var(--surf);color:var(--ink);font-size:13px;font-weight:800;cursor:pointer">Change</button></div><label for="otro" style="font-size:13px;font-weight:700;color:var(--muted)">Enter category</label><input id="otro" type="text" maxlength="40" autocomplete="off" placeholder="E.g. Birthday gift" value="${esc(f.otro)}" data-in="regOtro" style="${campoTxt}"></div>`
    : `<div style="display:grid;grid-template-columns:repeat(${cols},minmax(0,1fr));gap:8px">${Object.keys(ICON_REG).map((n) => { const s = n === f.concepto; return `<button type="button" data-act="regConcepto" data-arg="${esc(n)}" aria-pressed="${s}" style="transition:background 160ms ease;min-height:76px;border-radius:14px;border:2px solid ${s ? 'var(--accent)' : 'transparent'};background:${s ? 'var(--accent-soft)' : 'var(--field)'};color:${s ? 'var(--accent)' : 'var(--ink)'};display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;padding:8px 4px;cursor:pointer;font-size:12px;font-weight:700">${sv(ICON_REG[n], 22, n === 'Otros' ? 3 : 2)}${n}</button>`; }).join('')}</div>`}</div>` : ''}
  ${!resta || (f.concepto !== null && !otros) ? `<div class="${S.anim.sub ? 'a-desplegar' : ''}" style="display:flex;flex-direction:column;gap:8px"><label for="nombre-mov" style="font-size:14px;font-weight:800">${resta ? 'Expense name (optional)' : 'Income name (optional)'}</label><input id="nombre-mov" type="text" maxlength="40" autocomplete="off" placeholder="${resta ? 'E.g. Tacos with friends' : 'E.g. Bike sale'}" value="${esc(f.nombre)}" data-in="regNombre" style="${campoTxt}"></div>` : ''}`;
  return marco('New transaction', cuerpo, btnOk(valido, 'Confirm'));
}
const IC_OTROS = 'M6 12h.01M12 12h.01M18 12h.01';
function panelTarjeta(tipo) {
  const f = F().tar, cr = tipo === 'credito';
  const cent = centavos(f.monto), nombreOk = f.nombre.trim().length > 0, u4Ok = /^\d{4}$/.test(f.ultimos4), u4Mal = f.ultimos4 !== '' && !u4Ok;
  const montoOk = cent !== null, montoMal = f.monto.trim() !== '' && !montoOk;
  const corteOk = fechaValida(f.corte), pagoOk = fechaValida(f.pago), corteMal = f.corte.length === 8 && !corteOk, pagoMal = f.pago.length === 8 && !pagoOk;
  const valido = nombreOk && u4Ok && montoOk && (!cr || (corteOk && pagoOk));
  const bSel = BANCOS.find((b) => b.id === f.banco) || null, otroB = f.banco === 'otro';
  const bNombre = otroB ? f.bancoOtro.trim() : bSel ? bSel.nombre : '';
  const color = f.color || (bSel && bSel.color) || (cr ? '#1E3A8A' : '#3F3F46');
  const sigla = otroB ? siglaDe(f.bancoOtro) : bSel ? bSel.sigla : '';
  const err = (c) => (c ? 'var(--err)' : 'var(--line)');
  const prev = `<div style="display:flex;flex-direction:column;align-items:center;gap:10px"><button type="button" data-act="tColores" aria-label="Cambiar el color de la tarjeta" aria-expanded="${!!f.verColores}" style="position:relative;width:100%;max-width:280px;aspect-ratio:1.586/1;border:0;border-radius:16px;overflow:hidden;padding:14px 16px;background:${color};color:#fff;display:flex;flex-direction:column;justify-content:space-between;text-align:left;cursor:pointer;transition:background 220ms ease;box-shadow:0 12px 24px -14px rgba(16,21,31,.55)">${FONDO_TARJ}
    <div style="position:relative;display:flex;justify-content:space-between;align-items:flex-start"><div style="display:flex;align-items:center;gap:10px;min-width:0">${bNombre ? `<span aria-hidden="true" style="flex:none;width:34px;height:34px;border-radius:10px;background:#fff;color:${color};display:flex;align-items:center;justify-content:center;font-family:'Space Grotesk',sans-serif;font-size:${tamSigla(sigla)};font-weight:700;letter-spacing:-.02em">${esc(sigla)}</span>` : ''}<div style="display:flex;flex-direction:column;gap:1px;min-width:0">${bNombre ? `<span style="font-size:15px;font-weight:800;letter-spacing:.02em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(bNombre)}</span>` : ''}<span style="font-size:${bNombre ? 12 : 14}px;font-weight:${bNombre ? 700 : 800};opacity:${nombreOk ? 1 : .6};white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(nombreOk ? f.nombre : 'Card name')}</span><span style="${ETQ}">${cr ? 'Credit' : 'Debit'}</span></div></div><svg width="30" height="23" viewBox="0 0 34 26" fill="none" stroke="#fff" stroke-opacity=".85" stroke-width="1.4"><rect x="1" y="1" width="32" height="24" rx="5"></rect><path d="M1 9h10M1 17h10M23 9h10M23 17h10M11 1v24M23 1v24"></path></svg></div>
    <div style="position:relative;display:flex;flex-direction:column;gap:4px"><span style="${ETQ}">${cr ? 'Limit' : 'Balance'}</span><span style="font-family:'Space Grotesk',sans-serif;font-size:24px;font-weight:600;line-height:1">${dinero(cent ?? 0)}</span></div>
    <div style="position:relative;display:flex;justify-content:space-between;align-items:center"><span style="font-family:'Space Grotesk',sans-serif;font-size:13px;font-weight:500;letter-spacing:.12em">•••• ${f.ultimos4 === '' ? '••••' : f.ultimos4.padEnd(4, '•')}</span>${cr ? `<span style="font-size:11px;font-weight:700">Closes ${corteOk ? f.corte.slice(0, 5) : 'DD/MM'}</span>` : ''}</div>
    <span aria-hidden="true" style="position:absolute;right:10px;bottom:34px;width:28px;height:28px;border-radius:14px;background:rgba(255,255,255,.22);display:flex;align-items:center;justify-content:center">${sv(IC.paleta, 15, 2.2, 'style="color:#fff"')}</span></button>
    <span style="font-size:12px;font-weight:600;color:var(--muted)">${f.verColores ? 'Choose a color' : 'Tap the card to change its color'}</span>
    ${f.verColores ? `<div role="radiogroup" aria-label="Color de la tarjeta" class="a-desplegar" style="display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:10px;width:100%;max-width:300px">${COLORES.map(([n, v]) => { const s = v === color; return `<button type="button" role="radio" aria-checked="${s}" aria-label="${n}" data-act="tColor" data-arg="${v}" style="width:40px;height:40px;justify-self:center;border-radius:20px;border:3px solid ${s ? 'var(--accent)' : 'transparent'};background:${v};cursor:pointer;padding:0;display:flex;align-items:center;justify-content:center;color:#fff">${s ? sv(IC.check, 16, 3.5) : ''}</button>`; }).join('')}</div>` : ''}</div>`;
  const bancos = `<div role="group" aria-labelledby="banco-titulo" style="display:flex;flex-direction:column;gap:8px"><span id="banco-titulo" style="font-size:14px;font-weight:800">Bank</span><div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px">${BANCOS.map((b) => { const s = b.id === f.banco; const sg = b.id === 'otro' && otroB && f.bancoOtro.trim() ? siglaDe(f.bancoOtro) : b.sigla; return `<button type="button" data-act="tBanco" data-arg="${b.id}" aria-pressed="${s}" aria-label="${b.nombre}" style="min-height:76px;border-radius:14px;border:2px solid ${s ? 'var(--accent)' : 'transparent'};background:${s ? 'var(--accent-soft)' : 'var(--field)'};color:${s ? 'var(--accent)' : 'var(--ink)'};font-size:12px;font-weight:800;cursor:pointer;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;padding:8px 4px;transition:background 160ms ease"><span aria-hidden="true" style="flex:none;width:34px;height:34px;border-radius:10px;background:${b.color || (b.id === 'otro' && otroB ? color : 'var(--muted)')};color:#fff;display:flex;align-items:center;justify-content:center;font-family:'Space Grotesk',sans-serif;font-size:${b.id === 'otro' && sg === '+' ? '18px' : tamSigla(sg)};font-weight:700;letter-spacing:-.02em">${esc(sg)}</span><span style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%">${b.nombre}</span></button>`; }).join('')}</div>${otroB ? `<div class="a-desplegar" style="display:flex;flex-direction:column;gap:6px;margin-top:4px"><label for="banco-otro" style="font-size:13px;font-weight:700;color:var(--muted)">Bank name</label><input id="banco-otro" type="text" maxlength="24" autocomplete="off" placeholder="Ej. Banregio" value="${esc(f.bancoOtro)}" data-in="tBancoOtro" style="${campoTxt}"></div>` : ''}</div>`;
  const fecha = (id, lab, k, mal, ej) => `<div style="display:flex;flex-direction:column;gap:6px;min-width:0"><label for="${id}" style="font-size:14px;font-weight:800">${lab}</label><input id="${id}" type="text" inputmode="numeric" maxlength="8" autocomplete="off" placeholder="DD/MM/YY" value="${esc(f[k])}" data-in="${k === 'corte' ? 'tCorte' : 'tPago'}" style="${campoTxt};padding:0 14px;border-color:${err(mal)};font-family:'Space Grotesk',sans-serif;font-size:17px;letter-spacing:.04em"><span style="font-size:12px;font-weight:600;color:${mal ? 'var(--err)' : 'var(--muted)'}">${mal ? 'Invalid date' : ej}</span></div>`;
  const cuerpo = `${prev}${bancos}
  <div style="display:flex;flex-direction:column;gap:6px"><label for="nombre" style="font-size:14px;font-weight:800">Name</label><input id="nombre" type="text" autocomplete="off" placeholder="${cr ? 'E.g. Blue' : 'E.g. Payroll'}" value="${esc(f.nombre)}" data-in="tNombre" style="${campoTxt}"></div>
  <div style="display:flex;flex-direction:column;gap:6px"><label for="ultimos4" style="font-size:14px;font-weight:800">Last 4 digits</label><input id="ultimos4" type="text" inputmode="numeric" maxlength="4" autocomplete="off" placeholder="1234" value="${esc(f.ultimos4)}" data-in="tU4" style="${campoTxt};border-color:${err(u4Mal)};font-family:'Space Grotesk',sans-serif;font-size:18px;letter-spacing:.3em"><span style="font-size:12px;font-weight:600;color:${u4Mal ? 'var(--err)' : 'var(--muted)'}">${u4Mal ? 'Must be exactly 4 digits' : 'Last 4 digits only. Never the full number.'}</span></div>
  <div style="display:flex;flex-direction:column;gap:6px"><label for="monto" style="font-size:14px;font-weight:800">${cr ? 'Credit limit' : 'Current balance'}</label><div style="display:flex;align-items:center;height:52px;padding:0 16px;border-radius:14px;border:1px solid ${err(montoMal)};background:var(--field);gap:6px"><span aria-hidden="true" style="font-family:'Space Grotesk',sans-serif;font-size:18px;font-weight:600;color:var(--muted)">$</span><input id="monto" type="text" inputmode="decimal" autocomplete="off" placeholder="0.00" value="${esc(f.monto)}" data-in="tMonto" style="flex:1;min-width:0;border:0;outline:none;background:transparent;color:var(--ink);font-family:'Space Grotesk',sans-serif;font-size:18px;font-weight:600;padding:0"></div>${montoMal ? `<span style="font-size:12px;font-weight:700;color:var(--err)">Enter a valid amount (up to 2 decimal places)</span>` : ''}</div>
  ${cr ? `<div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px">${fecha('corte', 'Statement date', 'corte', corteMal, 'E.g. 15/11/26')}${fecha('pago', 'Payment due', 'pago', pagoMal, 'E.g. 05/12/26')}</div>` : ''}`;
  return marco(cr ? 'New credit card' : 'New debit card', cuerpo, btnOk(valido, 'Add'));
}
function panelAhorro() {
  const f = F().aho, libres = D.tarjetas.filter((t) => t.tipo === 'debito' && !enMeta(t.id));
  const tar = libres.find((t) => t.id === f.destino) || null;
  const cm = centavos(f.meta), cs = f.saldo.trim() === '' ? 0 : centavos(f.saldo);
  const metaMal = f.meta.trim() !== '' && (cm === null || cm === 0);
  const valido = f.nombre.trim() !== '' && cm !== null && cm > 0 && (tar !== null || cs !== null);
  const opciones = libres.map((t) => { const s = t.id === f.destino; return `<button type="button" data-act="aDestino" data-arg="${t.id}" aria-pressed="${s}" aria-label="${s ? 'Quitar ' : 'Usar '}${esc(t.nombre)}, terminación ${t.ultimos4}" style="position:relative;flex:none;width:132px;height:84px;border:0;border-radius:14px;padding:10px 12px;background:${t.color};color:#fff;display:flex;flex-direction:column;justify-content:space-between;text-align:left;cursor:pointer;outline:${s ? '3px solid var(--accent)' : '0 solid transparent'};outline-offset:3px;overflow:hidden"><span style="display:flex;flex-direction:column;gap:1px"><span style="font-size:13px;font-weight:800;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(t.nombre)}</span><span style="font-size:10px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;opacity:.85">Débito</span></span><span style="font-family:'Space Grotesk',sans-serif;font-size:12px;font-weight:600;letter-spacing:.06em">•••• ${t.ultimos4}</span>${s ? `<span style="position:absolute;top:8px;right:8px;width:22px;height:22px;border-radius:11px;background:#fff;color:var(--accent-fixed);display:flex;align-items:center;justify-content:center">${sv(IC.check, 13, 3.5)}</span>` : ''}</button>`; }).join('');
  const cuerpo = `<div style="display:flex;flex-direction:column;gap:6px"><label for="nombre-meta" style="font-size:14px;font-weight:800">Goal name</label><input id="nombre-meta" type="text" maxlength="30" autocomplete="off" placeholder="E.g. Emergency fund" value="${esc(f.nombre)}" data-in="aNombre" style="${campoTxt}"></div>
  <div style="display:flex;flex-direction:column;gap:10px"><div style="display:flex;flex-direction:column;gap:2px"><span style="font-size:14px;font-weight:800">Link a card <span style="font-weight:600;color:var(--muted)">(optional)</span></span><span style="font-size:12px;font-weight:600;color:var(--muted)">If none selected, goal is saved without a card.</span></div>${libres.length ? `<div class="scroll-x" data-keep="aho-tj" style="display:flex;gap:12px;overflow-x:auto;margin:0 -24px;padding:6px 24px 8px">${opciones}</div>` : ''}
  ${tar ? `<div class="a-desplegar" style="display:flex;align-items:flex-start;gap:10px;padding:12px 14px;border-radius:14px;background:var(--field);font-size:13px;font-weight:600;color:var(--muted)">${sv(IC.ojoOff, 18, 2, 'style="margin-top:1px"')}<span><strong style="color:var(--ink)">${esc(tar.nombre)}</strong> se moverá a Ahorro y dejará de verse en Inicio. Su saldo actual (${dinero(saldoDe(tar.id))}) cuenta para la meta.</span></div>`
    : `<div class="a-desplegar" style="display:flex;flex-direction:column;gap:6px"><label for="saldo-ahorro" style="font-size:13px;font-weight:800">I already have <span style="font-weight:600;color:var(--muted)">(optional)</span></label><div style="display:flex;align-items:center;height:52px;padding:0 14px;border-radius:14px;border:1px solid ${cs === null ? 'var(--warn)' : 'var(--line)'};background:var(--field);gap:6px"><span aria-hidden="true" style="font-family:'Space Grotesk',sans-serif;font-size:17px;font-weight:600;color:var(--muted)">$</span><input id="saldo-ahorro" type="text" inputmode="decimal" autocomplete="off" placeholder="0.00" value="${esc(f.saldo)}" data-in="aSaldo" style="flex:1;min-width:0;border:0;outline:none;background:transparent;color:var(--ink);font-family:'Space Grotesk',sans-serif;font-size:17px;font-weight:600;padding:0"></div></div>`}</div>
  <div style="display:flex;flex-direction:column;gap:6px"><label for="meta" style="font-size:14px;font-weight:800">Savings target</label><div style="display:flex;align-items:center;height:60px;padding:0 16px;border-radius:14px;border:1px solid ${metaMal ? 'var(--warn)' : 'var(--line)'};background:var(--field);gap:6px"><span aria-hidden="true" style="font-family:'Space Grotesk',sans-serif;font-size:24px;font-weight:600;color:var(--muted)">$</span><input id="meta" type="text" inputmode="decimal" autocomplete="off" placeholder="0.00" value="${esc(f.meta)}" data-in="aMeta" style="flex:1;min-width:0;border:0;outline:none;background:transparent;color:var(--ink);font-family:'Space Grotesk',sans-serif;font-size:24px;font-weight:600;padding:0"></div><span style="font-size:12px;font-weight:600;color:${metaMal ? 'var(--warn)' : 'var(--muted)'}">${metaMal ? 'Enter a valid amount (up to 2 decimal places)' : 'How much do you want to save in total?'}</span></div>
  <div style="display:flex;align-items:center;justify-content:space-between;gap:16px;padding:14px 16px;border-radius:14px;background:var(--field)"><div style="display:flex;flex-direction:column;gap:2px"><span id="etq-oculto" style="font-size:15px;font-weight:800">Keep hidden</span><span style="font-size:12px;font-weight:600;color:var(--muted)">Amounts hidden on Home screen; tap to reveal.</span></div><button type="button" role="switch" aria-checked="${f.oculto}" aria-labelledby="etq-oculto" data-act="aOculto" style="flex:none;width:56px;height:34px;border:0;border-radius:17px;padding:3px;background:${f.oculto ? 'var(--accent-fixed)' : 'var(--off)'};display:flex;justify-content:${f.oculto ? 'flex-end' : 'flex-start'};cursor:pointer;transition:background 200ms ease"><span style="width:28px;height:28px;border-radius:14px;background:#fff;box-shadow:0 1px 3px rgba(0,0,0,.3)"></span></button></div>`;
  return marco('New savings goal', cuerpo, btnOk(valido, 'Create goal'));
}
function panelHTML() {
  if (S.panel === 'registrar') return panelRegistro();
  if (S.panel === 'debito') return panelTarjeta('debito');
  if (S.panel === 'credito') return panelTarjeta('credito');
  if (S.panel === 'ahorro') return panelAhorro();
  return '';
}

// ───────── armazón ─────────
const MENU = [['inicio', 'Home'], ['movimientos', 'Transactions'], ['resumen', 'Weekly summary'], ['tarjetas', 'Cards'], ['ahorro', 'Savings']];
function contenido() {
  switch (S.tab) {
    case 'movimientos': case 'resumen': return movimientosHTML();
    case 'tarjetas': return tarjetasHTML();
    case 'ahorro': return ahorroHTML();
    case 'dispositivos': return dispositivosHTML();
    default: return inicioHTML();
  }
}
function appHTML() {
  const lap = S.modo === 'laptop', anim = S.anim.main ? 'a-aparecer' : '';
  if (lap) {
    const nav = MENU.map(([id, t]) => { const a = S.tab === id; return `<button type="button" data-act="tab" data-arg="${id}" aria-current="${a ? 'page' : 'false'}" style="transition:background 200ms ease;height:44px;border:0;border-radius:12px;padding:0 12px;display:flex;align-items:center;gap:12px;font-size:14px;font-weight:700;text-align:left;cursor:pointer;background:${a ? 'var(--inv)' : 'transparent'};color:${a ? 'var(--inv-ink)' : 'var(--ink)'}"><span style="width:8px;height:8px;border-radius:4px;background:${a ? 'var(--accent)' : 'var(--line)'};flex:none"></span>${t}</button>`; }).join('');
    const dis = S.tab === 'dispositivos';
    return `<div style="display:flex;min-height:100vh"><nav aria-label="Principal" style="width:248px;flex:none;position:sticky;top:0;height:100vh;background:var(--surf);border-right:1px solid var(--line);padding:28px 18px;display:flex;flex-direction:column;gap:28px"><div style="display:flex;align-items:center;gap:10px;padding:0 8px"><div style="width:36px;height:36px;border-radius:11px;background:var(--accent-fixed);color:#fff;display:flex;align-items:center;justify-content:center">${sv('M5 5h14a3 3 0 0 1 3 3v8a3 3 0 0 1-3 3H5a3 3 0 0 1-3-3V8a3 3 0 0 1 3-3zM2 10h20M6 15h4', 20)}</div><span style="font-size:18px;font-weight:800;letter-spacing:-.01em">Mendis</span></div><div style="display:flex;flex-direction:column;gap:4px">${nav}</div><div style="margin-top:auto"><button type="button" data-act="irDisp" aria-current="${dis ? 'page' : 'false'}" style="width:100%;height:44px;border-radius:12px;border:${dis ? 0 : '1px solid var(--line2)'};background:${dis ? 'var(--inv)' : 'var(--surf)'};color:${dis ? 'var(--inv-ink)' : 'var(--ink)'};display:flex;align-items:center;justify-content:center;gap:8px;font-size:14px;font-weight:700;cursor:pointer">${sv(IC.laptop, 18)}Devices</button></div></nav><main class="${anim}" style="flex:1;min-width:0;padding:36px 40px 40px">${contenido()}</main></div>`;
  }
  const dis = S.tab === 'dispositivos', grande = S.modo === 'tablet';
  const tabs = ['inicio', 'movimientos', 'tarjetas', 'ahorro'], nom = { inicio: 'Home', movimientos: 'Transactions', tarjetas: 'Cards', ahorro: 'Savings' };
  const act = S.tab === 'resumen' ? 'movimientos' : S.tab;
  const barra = dis ? '' : `<nav aria-label="Secciones" style="position:fixed;left:0;right:0;bottom:0;z-index:30;min-height:${grande ? 84 : 76}px;padding:6px 12px calc(10px + env(safe-area-inset-bottom));background:var(--surf);border-top:1px solid var(--line);display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:2px">${tabs.map((t) => { const a = act === t; return `<button type="button" data-act="tab" data-arg="${t}" aria-current="${a ? 'page' : 'false'}" style="border:0;background:transparent;min-height:52px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;color:${a ? 'var(--ink)' : 'var(--muted)'};font-size:12px;font-weight:${a ? 800 : 600};cursor:pointer;padding:0"><span style="width:56px;height:30px;border-radius:15px;background:${a ? 'var(--accent-soft)' : 'transparent'};display:flex;align-items:center;justify-content:center;transition:background 200ms ease">${sv(TAB_IC[t], 22)}</span>${nom[t]}</button>`; }).join('')}</nav>`;
  const fab = dis || act === 'ahorro' ? '' : `<button type="button" class="fab" data-act="abrir" data-arg="registrar" style="right:${grande ? 32 : 20}px;bottom:calc(${grande ? 104 : 92}px + env(safe-area-inset-bottom));height:${grande ? 58 : 56}px;padding:0 ${grande ? '26px 0 20px' : '22px 0 18px'};border-radius:29px;background:var(--accent-fixed);font-size:${grande ? 16 : 15}px">${sv(IC.mas, 20, 2.5)}${grande ? 'Add transaction' : 'Add'}</button>`;
  return `<div class="${anim}" style="max-width:${grande ? 'none' : '640px'};margin:0 auto">${contenido()}</div>${barra}${fab}`;
}
function toastHTML() {
  if (!S.aviso || S.tab === 'dispositivos') return '';
  const m = S.modo, pos = m === 'telefono' ? 'left:20px;right:20px;bottom:calc(164px + env(safe-area-inset-bottom))' : m === 'tablet' ? 'left:0;right:0;bottom:calc(180px + env(safe-area-inset-bottom))' : 'left:248px;right:0;bottom:40px';
  return `<div role="status" style="position:fixed;${pos};z-index:90;display:flex;justify-content:${m === 'telefono' ? 'stretch' : 'center'};pointer-events:none"><div style="${m === 'telefono' ? 'flex:1;' : ''}animation:${S.saliendo ? 'desvanecer 300ms ease-in forwards' : 'avisoEntra 240ms ease-out'};padding:14px ${m === 'telefono' ? 16 : 20}px;border-radius:14px;background:var(--toast-bg);color:var(--toast-ink);font-size:${m === 'telefono' ? 14 : 15}px;font-weight:700;display:flex;align-items:center;gap:10px">${sv(IC.check, 18, 3, 'style="color:#4ADE80"')}${esc(S.aviso)}</div></div>`;
}

// ───────── render ─────────
function conservar(fn) {
  const a = document.activeElement, id = a && a.id, ss = a && a.selectionStart, se = a && a.selectionEnd;
  const sc = {}; document.querySelectorAll('[data-keep]').forEach((e) => { sc[e.dataset.keep] = [e.scrollTop, e.scrollLeft]; });
  fn();
  document.querySelectorAll('[data-keep]').forEach((e) => { const s = sc[e.dataset.keep]; if (s) { e.scrollTop = s[0]; e.scrollLeft = s[1]; } });
  if (id) { const n = document.getElementById(id); if (n && n !== document.activeElement) { n.focus({ preventScroll: true }); try { n.setSelectionRange(ss, se); } catch (e) {} } }
}
function rApp() { conservar(() => { document.getElementById('app').innerHTML = appHTML(); S.anim.main = false; S.anim.sub = false; }); }
function rPanel() { conservar(() => { document.getElementById('panel').innerHTML = panelHTML(); S.anim.panel = false; S.anim.sub = false; }); }
function rToast() { document.getElementById('toast').innerHTML = toastHTML(); }
function render() { rApp(); rPanel(); rToast(); document.body.style.overflow = S.panel ? 'hidden' : ''; }

// ───────── acciones ─────────
let tAviso1, tAviso2;
function avisar(txt) {
  clearTimeout(tAviso1); clearTimeout(tAviso2);
  S.aviso = txt; S.saliendo = false; rToast();
  tAviso1 = setTimeout(() => { S.saliendo = true; rToast(); }, 4700);
  tAviso2 = setTimeout(() => { S.aviso = null; S.saliendo = false; rToast(); }, 5000);
}
const formVacio = {
  reg: () => ({ tipo: 'resta', destino: 'efectivo', concepto: null, otro: '', nombre: '', monto: '', msi: 0 }),
  tar: () => ({ nombre: '', ultimos4: '', monto: '', corte: '', pago: '', banco: null, bancoOtro: '', color: null, verColores: false }),
  aho: () => ({ nombre: '', destino: null, saldo: '', meta: '', oculto: true })
};
const setF = (k, c) => { Object.assign(S.f[k], c); rPanel(); };
function cerrarPanel() { S.panel = null; render(); }
const ACT = {
  tab(t) { S.tab = t; if (t === 'resumen') S.mov.vista = 'semana'; else if (t === 'movimientos' && S.modo === 'laptop') S.mov.vista = 'dia'; S.panel = null; S.anim.main = true; render(); window.scrollTo(0, 0); },
  irDisp() { ACT.tab('dispositivos'); },
  ojo() { S.oculto = !S.oculto; guardar(); rApp(); },
  abrir(p) { S.panel = p; S.anim.panel = true; S.aviso = null; S.f.reg = formVacio.reg(); S.f.tar = formVacio.tar(); S.f.aho = formVacio.aho(); render(); const i = document.querySelector('#panel input'); },
  cerrar() { cerrarPanel(); },
  // movimientos
  verDia() { S.mov.vista = 'dia'; rApp(); }, verSemana() { S.mov.vista = 'semana'; S.mov.cal = false; rApp(); },
  irHoy() { S.mov.sel = HOY; S.mov.mesVista = primeroDeMes(HOY); rApp(); },
  alternarCal() { S.mov.cal = !S.mov.cal; S.mov.mesVista = primeroDeMes(S.mov.sel); rApp(); },
  semanaAnt() { S.mov.sel = sumarDias(S.mov.sel, -7); S.mov.mesVista = primeroDeMes(S.mov.sel); rApp(); },
  semanaSig() { const s = sumarDias(S.mov.sel, 7); S.mov.sel = s > HOY ? HOY : s; S.mov.mesVista = primeroDeMes(S.mov.sel); rApp(); },
  mesAnt() { S.mov.mesVista = sumarMeses(S.mov.mesVista, -1); rApp(); }, mesSig() { S.mov.mesVista = sumarMeses(S.mov.mesVista, 1); rApp(); },
  elegirDia(s) { S.mov.sel = s; S.mov.mesVista = primeroDeMes(s); rApp(); },
  irDiaBarra(s) { S.mov.sel = s; S.mov.mesVista = primeroDeMes(s); S.mov.vista = 'dia'; rApp(); },
  // registro
  regTipo(t) { S.anim.sub = true; setF('reg', { tipo: t, concepto: null, otro: '', msi: 0 }); },
  regDestino(id) { setF('reg', { destino: id, msi: 0 }); },
  regMsi(n) { setF('reg', { msi: +n }); },
  regConcepto(n) { S.anim.sub = true; setF('reg', { concepto: n }); },
  regVolver() { setF('reg', { concepto: null, otro: '' }); },
  // tarjeta
  tColores() { setF('tar', { verColores: !S.f.tar.verColores }); }, tColor(v) { setF('tar', { color: v }); },
  tBanco(id) { setF('tar', { banco: S.f.tar.banco === id ? null : id }); },
  // ahorro
  aDestino(id) { setF('aho', { destino: S.f.aho.destino === id ? null : id }); },
  aOculto() { setF('aho', { oculto: !S.f.aho.oculto }); },
  aceptar() {
    if (S.panel === 'registrar') {
      const f = S.f.reg, c = centavos(f.monto), resta = f.tipo === 'resta', dest = tarjeta(f.destino);
      if (!(c > 0)) return;
      const otros = f.concepto === 'Other';
      D.movs.push(resta
        ? { id: ++D.sec, f: HOY, tipo: 'gasto', cat: f.concepto, desc: otros ? f.otro.trim() : f.nombre.trim(), cuenta: f.destino, c, destino: null, msi: dest && dest.tipo === 'credito' ? f.msi : 0 }
        : { id: ++D.sec, f: HOY, tipo: 'ingreso', cat: 'Extra', desc: f.nombre.trim(), cuenta: f.destino, c, destino: null, msi: 0 });
      guardar(); S.panel = null; S.mov.sel = HOY; S.mov.mesVista = primeroDeMes(HOY); render(); avisar('Transaction saved');
    } else if (S.panel === 'debito' || S.panel === 'credito') {
      const f = S.f.tar, cr = S.panel === 'credito', c = centavos(f.monto);
      const b = BANCOS.find((x) => x.id === f.banco), otro = f.banco === 'otro';
      const bn = otro ? f.bancoOtro.trim() : b ? b.nombre : '';
      D.tarjetas.push({ id: 't' + Date.now(), tipo: S.panel, nombre: f.nombre.trim(), ultimos4: f.ultimos4, color: f.color || (b && b.color) || (cr ? '#1E3A8A' : '#3F3F46'), banco: bn || null, sigla: otro ? siglaDe(f.bancoOtro) : b ? b.sigla : '', inicial: cr ? 0 : c, limite: cr ? c : 0, aPagarBase: 0, corte: cr ? fechaIso(f.corte) : null, pago: cr ? fechaIso(f.pago) : null });
      guardar(); S.panel = null; render(); avisar('Card added');
    } else if (S.panel === 'ahorro') {
      const f = S.f.aho, tar = D.tarjetas.find((t) => t.id === f.destino && t.tipo === 'debito');
      D.metas.push({ id: 'm' + Date.now(), nombre: f.nombre.trim(), meta: centavos(f.meta), saldoInicial: tar ? 0 : (f.saldo.trim() === '' ? 0 : centavos(f.saldo) || 0), tarjetaId: tar ? tar.id : null, color: tar ? tar.color : '#0F766E', oculto: f.oculto, abonos: [] });
      guardar(); S.panel = null; render(); avisar('Savings goal created');
    }
  },
  // metas
  metaAbrir(id) { const u = S.metaUI[id]; u.abierto = !u.abierto; u.abonando = false; u.aviso = null; S.anim.sub = true; rApp(); },
  abonarAbrir(id) { const u = S.metaUI[id]; Object.assign(u, { abonando: true, abierto: false, aviso: null, monto: '' }); S.anim.sub = true; rApp(); const i = document.getElementById('ab-' + id); if (i) i.focus(); },
  abonarCancelar(id) { Object.assign(S.metaUI[id], { abonando: false, monto: '' }); rApp(); },
  abonarOk(id) {
    const u = S.metaUI[id], c = centavos(u.monto), m = D.metas.find((x) => x.id === id);
    if (!(c > 0) || !m) return;
    m.abonos.push(c); guardar();
    clearTimeout(u.t1); clearTimeout(u.t2);
    Object.assign(u, { abonando: false, monto: '', aviso: 'Deposited ' + dinero(c) + '. Your savings stay hidden.', saliendo: false }); rApp();
    u.t1 = setTimeout(() => { u.saliendo = true; rApp(); }, 4700);
    u.t2 = setTimeout(() => { u.aviso = null; u.saliendo = false; rApp(); }, 5000);
  },
  // dispositivos
  dAgregar() { Object.assign(S.disp, { panel: 'agregar', modo: 'qr' }); rApp(); },
  dCerrar() { Object.assign(S.disp, { panel: null, olvidar: null }); rApp(); },
  dModo(m) { S.disp.modo = m; rApp(); },
  dOlvidar(id) { S.disp.olvidar = id; rApp(); },
  dRenombrar() { const n = window.prompt('Device name', nombreEste()); if (n && n.trim()) { D.nombreDisp = n.trim().slice(0, 30); guardar(); rApp(); dAvisar('Name updated', 'ok'); } },
  dSync(id) {
    const X = S.disp, ids = id === 'todos' ? X.otros.filter((o) => o.enWifi && !o.reemparejar).map((o) => o.id) : [id];
    const o = X.otros.find((x) => x.id === id);
    if (o && o.reemparejar) return ACT.dAgregar();
    if (o && !o.enWifi) return dAvisar('"' + o.nombre + '" not found. Open it on the same Wi-Fi.', 'error');
    const fuera = X.otros.length - X.otros.filter((x) => x.enWifi && !x.reemparejar).length;
    X.sinc = id === 'todos' ? 'todos' : id; rApp();
    setTimeout(() => {
      X.sinc = null; X.otros.forEach((x) => { if (ids.includes(x.id)) { x.ultima = 'Just now'; x.atrasado = false; } }); rApp();
      dAvisar(id === 'todos' ? 'Synced with ' + (ids.length === 1 ? '1 device' : ids.length + ' devices') + (fuera > 0 ? ' · ' + fuera + ' not found' : '') : 'Synced with ' + o.nombre, 'ok');
    }, 1600);
  },
  dSimular() {
    const X = S.disp, re = X.otros.some((o) => o.reemparejar);
    X.panel = null;
    if (re) X.otros.forEach((o) => { if (o.reemparejar) { o.reemparejar = false; o.ultima = 'Ahora mismo'; } });
    else X.otros.push({ id: 'n' + Date.now(), tipo: 'tablet', nombre: 'Home tablet', ultima: 'Just now', enWifi: true, atrasado: false, reemparejar: false });
    rApp(); dAvisar(re ? 'Paired again' : 'Device added', 'ok');
  },
  dConfirmar() {
    const X = S.disp, o = X.otros.find((x) => x.id === X.olvidar); if (!o) return;
    X.otros = X.otros.filter((x) => x.id !== o.id); X.otros.forEach((x) => { x.reemparejar = true; }); X.olvidar = null; rApp();
    dAvisar('"' + o.nombre + '" forgotten. New key created.', 'ok');
  }
};
let tD1, tD2;
function dAvisar(txt, tipo) {
  const X = S.disp; clearTimeout(tD1); clearTimeout(tD2);
  Object.assign(X, { aviso: txt, tipoAviso: tipo, saliendo: false }); rApp();
  tD1 = setTimeout(() => { X.saliendo = true; rApp(); }, 4700);
  tD2 = setTimeout(() => { X.aviso = null; X.saliendo = false; rApp(); }, 5000);
}
const num = (v) => v.replace(/[^0-9.,]/g, '');
const IN = {
  regMonto: (v) => setF('reg', { monto: num(v) }), regOtro: (v) => setF('reg', { otro: v.slice(0, 40) }), regNombre: (v) => setF('reg', { nombre: v.slice(0, 40) }),
  tNombre: (v) => setF('tar', { nombre: v.slice(0, 30) }), tU4: (v) => setF('tar', { ultimos4: v.replace(/\D/g, '').slice(0, 4) }), tMonto: (v) => setF('tar', { monto: num(v) }),
  tCorte: (v) => setF('tar', { corte: formatoFecha(v) }), tPago: (v) => setF('tar', { pago: formatoFecha(v) }), tBancoOtro: (v) => setF('tar', { bancoOtro: v.slice(0, 24) }),
  aNombre: (v) => setF('aho', { nombre: v.slice(0, 30) }), aSaldo: (v) => setF('aho', { saldo: num(v) }), aMeta: (v) => setF('aho', { meta: num(v) }),
  abono: (v, el) => { S.metaUI[el.dataset.arg].monto = num(v); rApp(); }
};

document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-act]');
  if (!el || el.disabled) return;
  const fn = ACT[el.dataset.act];
  if (fn) fn(el.dataset.arg, el);
});
document.addEventListener('input', (e) => { const el = e.target; if (el.dataset && el.dataset.in && IN[el.dataset.in]) IN[el.dataset.in](el.value, el); });
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  if (S.disp.olvidar || S.disp.panel) ACT.dCerrar(); else if (S.panel) cerrarPanel();
});

// ───────── responsive ─────────
function modoActual() { const w = window.innerWidth; return w >= 1100 ? 'laptop' : w >= 700 ? 'tablet' : 'telefono'; }
function ajustarModo() {
  const m = modoActual(); if (m === S.modo) return;
  const antes = S.modo; S.modo = m;
  if (m === 'laptop' && S.tab === 'movimientos') S.mov.vista = S.mov.vista;
  if (antes && S.tab === 'resumen' && m !== 'laptop') S.tab = 'movimientos';
  render();
}
window.addEventListener('resize', ajustarModo);
document.addEventListener('visibilitychange', () => { if (!document.hidden && hoyLocal() !== HOY) { const eraHoy = S.mov.sel === HOY; HOY = hoyLocal(); if (eraHoy) { S.mov.sel = HOY; S.mov.mesVista = primeroDeMes(HOY); } render(); } });

S.modo = modoActual();
S.f.reg = formVacio.reg(); S.f.tar = formVacio.tar(); S.f.aho = formVacio.aho();
S.anim.main = true;
render();
