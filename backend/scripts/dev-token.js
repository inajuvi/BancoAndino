// Emite un token de DESARROLLO (HS256, 8 h). Uso: npm run token [rol] [id]
// El inicio de sesión real con Cognito corresponde a la HU-10.
import jwt from 'jsonwebtoken';
import { loadConfig } from '../src/config.js';

const { jwtSecret } = loadConfig();
const [rol = 'asesor', id = 'asesor-demo'] = process.argv.slice(2);

console.log(jwt.sign({ rol }, jwtSecret, { subject: id, expiresIn: '8h', algorithm: 'HS256' }));
