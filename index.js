const functions = require('firebase-functions');
const admin = require('firebase-admin');
const express = require('express');

admin.initializeApp();

const app = express();

app.use(express.json());

// Middleware to verify Firebase Auth token
const authenticate = async (req, res, next) => {
  const idToken = req.headers.authorization?.split('Bearer ')[1];
  if (!idToken) {
    return res.status(401).send('Unauthorized');
  }
  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    req.user = decodedToken;
    next();
  } catch (error) {
    res.status(401).send('Unauthorized');
  }
};

// Submit or update score
app.post('/score', authenticate, async (req, res) => {
  const { score } = req.body;
  const userId = req.user.uid;
  const userEmail = req.user.email || req.user.displayName || 'Anonymous';

  // Validate score
  if (typeof score !== 'number' || score < 0 || score > 1000000) {
    return res.status(400).send('Invalid score');
  }

  try {
    const docRef = admin.firestore().collection('scores').doc(userId);
    const doc = await docRef.get();
    if (!doc.exists || doc.data().score < score) {
      await docRef.set({
        score,
        email: userEmail,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    }
    res.send({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal server error');
  }
});

// Get ranking
app.get('/ranking', async (req, res) => {
  try {
    const snapshot = await admin.firestore().collection('scores')
      .orderBy('score', 'desc')
      .limit(10)
      .get();
    const ranking = snapshot.docs.map(doc => ({
      id: doc.id,
      score: doc.data().score,
      email: doc.data().email
    }));
    res.send(ranking);
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal server error');
  }
});

exports.api = functions.https.onRequest(app);