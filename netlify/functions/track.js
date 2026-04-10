const admin = require('firebase-admin');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId:    process.env.FIREBASE_PROJECT_ID,
      clientEmail:  process.env.FIREBASE_CLIENT_EMAIL,
      privateKey:   process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

const db = admin.firestore();

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };

  try {
    const body = JSON.parse(event.body || '{}');

    const payload = {
      timestamp:    admin.firestore.FieldValue.serverTimestamp(),
      utm_source:   String(body.utm_source   || '').slice(0, 200),
      utm_campaign: String(body.utm_campaign || '').slice(0, 200),
      utm_content:  String(body.utm_content  || '').slice(0, 200),
      utm_medium:   String(body.utm_medium   || '').slice(0, 200),
      click_id:     String(body.click_id     || '').slice(0, 200),
      referrer:     String(body.referrer     || '').slice(0, 500),
      user_agent:   event.headers['user-agent']?.slice(0, 300) || '',
      ip_hash:      hashIP(event.headers['x-forwarded-for'] || ''),
    };

    const docRef = await db.collection('leads').add(payload);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, id: docRef.id }),
    };

  } catch (err) {
    console.error('Track error:', err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ success: false, error: 'Internal error' }),
    };
  }
};

function hashIP(ip) {
  const clean = ip.split(',')[0].trim();
  let hash = 0;
  for (let i = 0; i < clean.length; i++) {
    hash = ((hash << 5) - hash) + clean.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}