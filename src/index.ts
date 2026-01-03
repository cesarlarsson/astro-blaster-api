import { onRequest } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import express from 'express';

admin.initializeApp();

const app = express();
app.use(express.json());

// Submit or update score (sin auth, usa userId del body)
app.post('/score', async (req: express.Request, res: express.Response): Promise<void> => {
  console.log('Received POST /score:', req.body);
  const { score, userId, userName } = req.body;

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
  const name = userName || 'Anonymous';

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
