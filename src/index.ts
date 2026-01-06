import { onRequest } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import express from 'express';
import * as crypto from 'crypto';

admin.initializeApp();

const app = express();
app.use(express.json());

// Clave secreta (debe coincidir con Godot)
const SECRET_KEY = 'AstroBlaster_SecureKey_2026_v1';
const MAX_TIMESTAMP_DIFF = 300; // 5 minutos en segundos

// Generar firma HMAC
function generateSignature(userId: string, userName: string, score: number, timestamp: number): string {
  const data = `${userId}|${userName}|${score}|${timestamp}`;
  const hmacInput = data + SECRET_KEY;
  return crypto.createHash('sha256').update(hmacInput).digest('hex');
}

// Validar timestamp para prevenir replay attacks
function isValidTimestamp(timestamp: number): boolean {
  const currentTime = Math.floor(Date.now() / 1000);
  const diff = Math.abs(currentTime - timestamp);
  return diff <= MAX_TIMESTAMP_DIFF;
}

// Submit or update score (con validación HMAC)
app.post('/score', async (req: express.Request, res: express.Response): Promise<void> => {
  console.log('Received POST /score:', req.body);
  const { score, userId, userName, timestamp, signature } = req.body;

  // Validar inputs
  if (typeof score !== 'number' || score < 0 || score > 1000000) {
    console.log('Invalid score:', score);
    res.status(400).send('Invalid score');
    return;
  }
  if (!userId || typeof userId !== 'string') {
    console.log('Invalid userId:', userId);
    res.status(400).send('Invalid userId');
    return;
  }
  if (!timestamp || typeof timestamp !== 'number') {
    console.log('Invalid timestamp:', timestamp);
    res.status(400).send('Invalid timestamp');
    return;
  }
  if (!signature || typeof signature !== 'string') {
    console.log('Missing signature');
    res.status(400).send('Missing signature');
    return;
  }

  // Validar timestamp (prevenir replay attacks)
  if (!isValidTimestamp(timestamp)) {
    console.log('Timestamp expired or invalid:', timestamp);
    res.status(401).send('Request expired');
    return;
  }

  const name = userName || 'Anonymous';

  // Verificar firma HMAC
  const expectedSignature = generateSignature(userId, name, score, timestamp);
  if (signature !== expectedSignature) {
    console.log('Invalid signature. Expected:', expectedSignature, 'Got:', signature);
    res.status(401).send('Invalid signature');
    return;
  }

  try {
    const docRef = admin.firestore().collection('scores').doc(userId);
    const doc = await docRef.get();
    if (!doc.exists || doc.data()!.score < score) {
      await docRef.set({
        score,
        userName: name,
        updatedAt: FieldValue.serverTimestamp()
      });
      console.log('Score updated for userId:', userId);
    } else {
      console.log('Score not better for userId:', userId);
    }
    res.send({ success: true });
  } catch (error) {
    console.error('Error in /score:', error);
    res.status(500).send('Internal server error');
  }
});

// Get ranking
app.get('/ranking', async (req: express.Request, res: express.Response): Promise<void> => {
  try {
    const snapshot = await admin.firestore().collection('scores')
      .orderBy('score', 'desc')
      .limit(10)
      .get();
    const ranking = snapshot.docs.map(doc => ({
      id: doc.id,
      score: doc.data().score,
      userName: doc.data().userName
    }));
    res.send(ranking);
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal server error');
  }
});

export const api = onRequest(app);
