// Punto de entrada: arma las dependencias reales y levanta el servidor solo en la máquina local.
import Anthropic from '@anthropic-ai/sdk';
import { config } from './config.js';
import { crearLlamadaAgente, ErrorDelModelo } from './agentes.js';
import { crearCategorizador } from './orquestador.js';
import { crearApp } from './app.js';

const hayCredencial = Boolean(process.env.ANTHROPIC_API_KEY);
if (!hayCredencial) {
  console.warn('Aviso: ANTHROPIC_API_KEY está vacía. La consola abrirá, pero no podrá categorizar.');
}

// Sin credencial, el Privacy Vault sigue funcionando; solo la llamada al modelo avisa qué falta.
const llamarAgente = hayCredencial
  ? crearLlamadaAgente(new Anthropic(), config.modelo)
  : async () => {
      throw new ErrorDelModelo('Falta la API key: pégala en el archivo .env y reinicia la demo.');
    };
const categorizar = crearCategorizador(llamarAgente);
const app = crearApp({ categorizar, modelo: config.modelo, limitePorMinuto: config.limitePorMinuto });

app.listen(config.puerto, config.host, () => {
  console.log(`Demo de categorización en http://${config.host}:${config.puerto} (modelo ${config.modelo})`);
});
