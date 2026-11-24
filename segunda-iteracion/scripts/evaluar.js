// Prueba preliminar: corre los 20 mensajes ficticios por el sistema multiagente y calcula
// las mediciones de la Tabla 2 del Hito 1. No reemplaza el gate 1 (5.000 solicitudes reales).
// Uso: npm run evaluar -- claude-haiku-5-5   (cada corrida llama 60 veces al modelo y tiene costo)
import fs from 'node:fs';
import Anthropic from '@anthropic-ai/sdk';
import { crearLlamadaAgente } from '../src/agentes.js';
import { crearCategorizador } from '../src/orquestador.js';
import { evaluarFila, calcularMetricas } from '../src/evaluacion.js';

const modelo = process.argv[2] || process.env.MODELO || 'claude-haiku-5-5';
const categorizar = crearCategorizador(crearLlamadaAgente(new Anthropic(), modelo));
const mensajes = JSON.parse(fs.readFileSync(new URL('../data/mensajes.json', import.meta.url), 'utf8'));

const filas = [];
for (const m of mensajes) {
  const inicio = Date.now();
  const resultado = await categorizar({ id_caso: m.id, canal: m.canal, texto: m.texto });
  const fila = { ...evaluarFila(m, resultado), ms: Date.now() - inicio };
  filas.push(fila);
  console.log(`${m.id}  esperado ${m.esperado}  sugerida ${fila.sugerida}  ${fila.acierto ? 'OK' : 'X '}  complejo ${m.complejo ?? '-'} -> ${fila.complejo_detectado ?? '-'}`);
}

const metricas = { ...calcularMetricas(filas, modelo), segundos_promedio: filas.reduce((t, f) => t + f.ms, 0) / filas.length / 1000 };
const fmt = (x) => (x === null ? 'n/a' : `${Math.round(x * 100)} %`);
console.log(`\nResultados de la prueba preliminar · ${modelo}`);
console.log(`Acierto de la categoría sugerida ...... ${fmt(metricas.acierto_sugerida)}  (meta >= 80 %)`);
console.log(`Correcta entre sugerida + alternativas  ${fmt(metricas.acierto_entre_alternativas)}  (meta >= 95 %)`);
console.log(`Casos complejos detectados ............ ${fmt(metricas.deteccion_casos_complejos)}  (meta >= 95 %)`);
console.log(`Fraudes detectados como fraude ........ ${fmt(metricas.deteccion_fraudes)}  (meta 100 %)`);
console.log(`Errores enviados al asesor ............ ${fmt(metricas.errores_enviados_al_asesor)}`);
console.log(`Falsas alarmas de caso complejo ....... ${metricas.falsas_alarmas}`);
console.log(`Costo: US$ ${metricas.costo_usd_total.toFixed(3)} · COP ${Math.round(metricas.costo_cop_por_solicitud)} por solicitud · ${metricas.segundos_promedio.toFixed(1)} s promedio`);

const carpeta = new URL('../resultados/', import.meta.url);
fs.mkdirSync(carpeta, { recursive: true });
const archivo = new URL(`evaluacion-${modelo}.json`, carpeta);
fs.writeFileSync(archivo, JSON.stringify({ metricas, filas }, null, 2));
console.log(`\nDetalle guardado en resultados/evaluacion-${modelo}.json`);
