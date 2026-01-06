const crypto = require('crypto');

// Clave secreta (misma que servidor y Godot)
const SECRET_KEY = 'AstroBlaster_SecureKey_2026_v1';

// Generar firma HMAC
function generateSignature(userId, userName, score, timestamp) {
  const data = `${userId}|${userName}|${score}|${timestamp}`;
  const hmacInput = data + SECRET_KEY;
  return crypto.createHash('sha256').update(hmacInput).digest('hex');
}

// Datos de prueba
const userId = "test-user-123";
const userName = "TestPlayer";
const score = 1000;
const timestamp = Math.floor(Date.now() / 1000);

console.log('=== Test Data ===');
console.log('userId:', userId);
console.log('userName:', userName);
console.log('score:', score);
console.log('timestamp:', timestamp);
console.log('');

// Generar firma válida
const validSignature = generateSignature(userId, userName, score, timestamp);
console.log('=== Valid Signature ===');
console.log(validSignature);
console.log('');

// Preparar payload para cURL
const payload = {
  userId,
  userName,
  score,
  timestamp,
  signature: validSignature
};

console.log('=== Valid Request Payload ===');
console.log(JSON.stringify(payload, null, 2));
console.log('');

// Firma inválida (para probar rechazo)
const invalidSignature = 'invalid_signature_12345';
const invalidPayload = {
  userId,
  userName,
  score,
  timestamp,
  signature: invalidSignature
};

console.log('=== Invalid Request Payload ===');
console.log(JSON.stringify(invalidPayload, null, 2));
console.log('');

console.log('=== cURL Commands ===');
console.log('\nValid request (should succeed):');
console.log(`curl -X POST https://us-central1-astro-blaster-api.cloudfunctions.net/api/score -H "Content-Type: application/json" -d '${JSON.stringify(payload)}'`);

console.log('\nInvalid request (should fail):');
console.log(`curl -X POST https://us-central1-astro-blaster-api.cloudfunctions.net/api/score -H "Content-Type: application/json" -d '${JSON.stringify(invalidPayload)}'`);
