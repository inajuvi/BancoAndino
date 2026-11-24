// Consola del asesor: llena el formulario, llama a la API y pinta el resultado.
// Todo lo que viene del servidor o del usuario pasa por esc() antes de insertarse en el HTML.
const EJEMPLOS = [
  { etiqueta: 'Llamada con fraude', id: 'CASO-0005', canal: 'CALL_CENTER', tono: 'Urgente',
    texto: 'Asesor: Banco Andino, buenas tardes, ¿con quién tengo el gusto? Cliente: Soy Andrés Felipe Gómez, cédula 1.020.456.789. Mire, ayer me llamaron supuestamente del banco, me dijeron que había un problema con mi cuenta y me pidieron el código que me llegó al celular 315 678 9012. Yo se lo di, y hoy veo dos transferencias de $800.000 que yo no hice. Además me llegó un correo a andres.gomez@gmail.com diciendo que mi clave fue cambiada. ¡Necesito que me ayuden ya, por favor!',
    resumen: 'El cliente entregó un código a una llamada que decía ser del banco y ahora ve transferencias que no reconoce.', datos: [['monto por transferencia', '800000'], ['número de transferencias', '2']] },
  { etiqueta: 'Compra no reconocida', id: 'CASO-0001', canal: 'WHATSAPP', tono: 'Urgente',
    texto: 'Buenas tardes, me llamo Carolina Restrepo. Hoy me llegó una notificación de una compra por $1.250.000 en una tienda de tecnología que yo no hice. Mi tarjeta es 4512 3456 7890 1234 y mi celular 310 555 1234. ¿Me pueden ayudar urgente?',
    resumen: 'La cliente reporta una compra que no reconoce en su tarjeta de crédito.', datos: [['monto', '1250000'], ['comercio', 'Tienda de tecnología']] },
  { etiqueta: 'Cobro doble', id: 'CASO-0002', canal: 'CALL_CENTER', tono: 'Molesto',
    texto: 'Asesor: Banco Andino, buenas tardes. Cliente: Hola, mire, el lunes pagué la cuota de la tarjeta por PSE y me la descontaron dos veces de la cuenta de ahorros. Necesito que me devuelvan esa plata porque me quedé sin saldo.',
    resumen: 'El cliente pagó la cuota de la tarjeta por PSE y el débito salió dos veces.', datos: [['medio de pago', 'PSE'], ['fecha', 'lunes']] },
  { etiqueta: 'Mensaje sospechoso', id: 'CASO-0003', canal: 'REDES_SOCIALES', tono: 'Preocupado',
    texto: 'Me escribieron por WhatsApp diciendo que eran del banco y que tenía que actualizar mis datos en un link para que no me bloquearan la cuenta. No sé si es real, ¿ustedes mandan esos mensajes?',
    resumen: 'El cliente recibió un mensaje que pide actualizar datos en un enlace.', datos: [] },
  { etiqueta: 'Certificado', id: 'CASO-0004', canal: 'WHATSAPP', tono: 'Neutro',
    texto: 'Hola, buenos días. Necesito un certificado bancario de mi cuenta de ahorros para presentarlo en mi nuevo trabajo. ¿Cómo lo puedo sacar?',
    resumen: 'El cliente pide un certificado bancario de su cuenta de ahorros.', datos: [] },
];

const $ = (s) => document.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const pct = (x) => `${Math.round((x ?? 0) * 100)} %`;
const seg = (ms) => `${(ms / 1000).toFixed(1)} s`;

fetch('/api/info').then((r) => r.json()).then((i) => { $('#modelo').textContent = `Modelo: ${i.modelo}`; });

// Datos extraídos (pares nombre / valor)
function agregarFila(clave = '', valor = '') {
  const fila = document.createElement('div');
  fila.className = 'datos__fila';
  fila.innerHTML = `<input placeholder="Nombre (ej. monto)" maxlength="50" value="${esc(clave)}"><input placeholder="Valor (ej. 150000)" maxlength="500" value="${esc(valor)}"><button type="button" class="btn btn--ghost">Quitar</button>`;
  fila.querySelector('button').onclick = () => fila.remove();
  $('#filas').append(fila);
}
$('#agregar').onclick = () => agregarFila();

const contar = () => { $('#contador').textContent = `${5000 - $('#texto').value.length} caracteres disponibles`; };
$('#texto').addEventListener('input', contar);

function limpiar() {
  for (const id of ['id_caso', 'canal', 'texto', 'resumen', 'tono']) $('#' + id).value = '';
  $('#filas').innerHTML = ''; contar();
}
$('#limpiar').onclick = limpiar;

for (const e of EJEMPLOS) {
  const b = document.createElement('button');
  b.type = 'button'; b.textContent = e.etiqueta;
  b.onclick = () => {
    limpiar();
    $('#id_caso').value = e.id; $('#canal').value = e.canal; $('#texto').value = e.texto;
    $('#resumen').value = e.resumen; $('#tono').value = e.tono;
    e.datos.forEach(([k, v]) => agregarFila(k, v)); contar();
  };
  $('#ejemplos').append(b);
}

function pasos(estado) {
  const orden = ['vault', 'agentes', 'validador', 'orq'];
  document.querySelectorAll('.paso').forEach((el) => {
    const i = orden.indexOf(el.dataset.p);
    el.className = 'paso' + (estado === 'fin' || i < orden.indexOf(estado) ? ' listo' : i === orden.indexOf(estado) ? ' activo' : '');
  });
}

$('#form').addEventListener('submit', async (ev) => {
  ev.preventDefault();
  const cuerpo = {
    id_caso: $('#id_caso').value.trim(), canal: $('#canal').value, texto: $('#texto').value.trim(),
    resumen: $('#resumen').value.trim(), tono: $('#tono').value,
    datos: [...document.querySelectorAll('.datos__fila')].map((f) => { const [k, v] = f.querySelectorAll('input'); return [k.value.trim(), v.value.trim()]; }).filter(([k, v]) => k && v),
  };
  if (!cuerpo.id_caso || !cuerpo.canal || !cuerpo.texto) {
    $('#resultado').innerHTML = '<div class="banner banner--error">Completa el identificador del caso, el canal y el texto del cliente.</div>';
    return;
  }
  const btn = $('#enviar');
  btn.disabled = true; btn.innerHTML = '<span class="spinner" aria-hidden="true"></span>Categorizando…';
  $('#resultado').innerHTML = '<div class="vacio">Procesando la solicitud…</div>';
  pasos('vault');
  const t1 = setTimeout(() => pasos('agentes'), 400);
  const t2 = setTimeout(() => pasos('validador'), 2500);
  try {
    const r = await fetch('/api/categorizar', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(cuerpo) });
    const data = await r.json();
    if (!r.ok) throw new Error(data.campos ? `${data.error} Revisa: ${data.campos.join(', ')}.` : data.error || 'Error');
    pasos('fin'); pintar(data);
  } catch (e) {
    pasos('');
    $('#resultado').innerHTML = `<div class="banner banner--error">${esc(e.message)}</div>`;
  } finally {
    clearTimeout(t1); clearTimeout(t2);
    btn.disabled = false; btn.textContent = 'Registrar y categorizar';
  }
});

function resaltar(t) { return esc(t).replace(/\[([A-Z]+_\d+)\]/g, '<span class="tok">[$1]</span>'); }

function pintar(d) {
  if (d.bloqueado) {
    $('#resultado').innerHTML = `<div class="cabecera"><h2>Envío bloqueado</h2><span class="badge badge--danger">Privacy Vault</span></div>
      <p>${esc(d.motivo)}</p><div class="protegido">${resaltar(d.texto_protegido)}</div>`;
    return;
  }
  const s = d.salida, a = d.agentes;
  const tipo = { fraude: 'Posible fraude', conciliacion: 'Conciliación', falla_tecnica: 'Falla técnica' }[s.tipo_caso_complejo];
  const caja = s.tipo_caso_complejo === 'fraude' ? 'banner--error' : s.es_caso_complejo ? 'banner--warn' : 'banner--success';
  const complejo = s.es_caso_complejo
    ? `<div class="banner ${caja}"><span class="titulo titulo--heredado">Caso complejo</span><strong>${esc(tipo)} → ${esc(s.area_sugerida)}</strong>${d.reglas.regla_prevalece ? '<div class="nota-regla">El motor de reglas lo marcó aunque el detector no; prevalece la regla.</div>' : ''}</div>`
    : `<div class="banner banner--success"><span class="titulo titulo--heredado">Caso complejo</span><strong>No · atención normal</strong></div>`;

  $('#resultado').innerHTML = `
    <div class="cabecera">
      <h2>${esc(s.id_caso)}</h2>
      <span class="badge ${d.requiere_asesor ? 'badge--warn' : 'badge--ok'}">${d.requiere_asesor ? 'Requiere revisión del asesor' : 'Sugerencia de alta confianza'}</span>
      <span class="tiempo">${seg(d.ms_total)}</span>
    </div>
    <div class="dos">
      <div>
        <p class="titulo">Categoría sugerida</p>
        <p class="categoria">${esc(s.categoria_sugerida.nombre)}</p>
        <span class="codigo">${esc(s.categoria_sugerida.codigo)} · confianza ${pct(s.confianza)}</span>
        <div class="barra"><span data-ancho="${Math.round((s.confianza ?? 0) * 100)}"></span></div>
        <div class="alternativas">${s.alternativas.map((x) => `<div class="alt"><span>${esc(x.nombre)}</span><span class="codigo">${pct(x.confianza)}</span></div>`).join('')}</div>
      </div>
      <div>${complejo}
        <div class="justificacion"><p class="titulo">Justificación</p><div>${esc(s.justificacion)}</div></div>
      </div>
    </div>

    <div class="bloque">
      <p class="titulo">Agentes</p>
      <div class="agentes">
        <div class="agente"><b>Clasificador</b>${esc(a.clasificador.categoria_codigo)} · ${pct(a.clasificador.confianza)}<div class="nota">${seg(a.clasificador.ms)}</div></div>
        <div class="agente"><b>Detector</b>${a.detector.es_caso_complejo ? esc(a.detector.tipo_caso_complejo.replace('_', ' ')) : 'sin caso complejo'}<div class="nota">${seg(a.detector.ms)}</div></div>
        <div class="agente"><b>Validador</b>${a.validador.categoria_valida ? 'categoría válida' : 'revisar categoría'} · ${pct(a.validador.confianza_final)}<div class="nota">${esc(a.validador.observacion)}</div></div>
      </div>
    </div>

    <div class="bloque">
      <p class="titulo">Motor de reglas antifraude (sin IA)</p>
      <div class="reglas">${d.reglas.reglas_activadas.length ? d.reglas.reglas_activadas.map((r) => `<span class="badge badge--danger">${esc(r.id)}</span>${esc(r.descripcion)}`).join('<br>') : 'Sin señales de fraude.'}</div>
    </div>

    <div class="bloque">
      <p class="titulo">Lo que recibió el modelo (Privacy Vault)</p>
      <div class="protegido">${resaltar(d.texto_protegido)}</div>
    </div>

    <div class="actions">
      <button class="btn btn--ok" id="confirmar">Confirmar categoría</button>
      <button class="btn btn--ghost" id="corregir">Corregir</button>
      <details class="json"><summary>Ver JSON de salida</summary><pre>${esc(JSON.stringify(s, null, 2))}</pre></details>
    </div>`;

  document.querySelectorAll('[data-ancho]').forEach((el) => { el.style.width = `${el.dataset.ancho}%`; });
  $('#confirmar').onclick = () => { $('#confirmar').outerHTML = '<span class="badge badge--ok">Confirmada por el asesor</span>'; $('#corregir').remove(); };
  $('#corregir').onclick = () => { $('#corregir').outerHTML = '<span class="badge badge--warn">El asesor elige otra categoría; la corrección queda registrada</span>'; $('#confirmar').remove(); };
}
