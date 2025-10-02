require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const admin = require('firebase-admin');

const app = express();
const PORT = process.env.PORT || 3000;

// Supabase 클라이언트 초기화
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// Firebase Admin 초기화
admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    privateKeyId: process.env.FIREBASE_PRIVATE_KEY_ID,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    clientId: process.env.FIREBASE_CLIENT_ID,
  }),
});

// 미들웨어
app.use(cors());
app.use(express.json());

// GET /api/user/:fcm_token - FCM 토큰으로 사용자 조회
app.get('/api/user/:fcm_token', async (req, res) => {
  try {
    const { fcm_token } = req.params;

    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('fcm_token', fcm_token)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // 사용자를 찾을 수 없음
        return res.status(404).json({ message: 'User not found' });
      }
      throw error;
    }

    res.json(data);
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/user - 새로운 사용자 생성 또는 기존 사용자 반환
app.post('/api/user', async (req, res) => {
  try {
    const { fcm_token, nickname } = req.body;

    if (!fcm_token) {
      return res.status(400).json({ error: 'fcm_token is required' });
    }

    // 먼저 기존 사용자 확인
    const { data: existingUser, error: selectError } = await supabase
      .from('users')
      .select('*')
      .eq('fcm_token', fcm_token)
      .single();

    // 기존 사용자가 있으면 반환
    if (existingUser) {
      return res.json(existingUser);
    }

    // 기존 사용자가 없으면 새로 생성
    const { data, error } = await supabase
      .from('users')
      .insert([{ fcm_token, nickname }])
      .select()
      .single();

    if (error) {
      throw error;
    }

    res.status(201).json(data);
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/notification/send - FCM 토큰으로 푸시 알림 전송
app.post('/api/notification/send', async (req, res) => {
  try {
    const { fcm_token, title, body, data } = req.body;

    if (!fcm_token) {
      return res.status(400).json({ error: 'fcm_token is required' });
    }

    if (!title || !body) {
      return res.status(400).json({ error: 'title and body are required' });
    }

    // FCM 메시지 구성
    const message = {
      token: fcm_token,
      notification: {
        title,
        body,
      },
      data: data || {},
    };

    // Firebase Admin SDK를 통해 메시지 전송
    const response = await admin.messaging().send(message);

    res.json({
      success: true,
      messageId: response,
      message: 'Notification sent successfully',
    });
  } catch (error) {
    console.error('Error sending notification:', error);
    res.status(500).json({ error: error.message });
  }
});

// 서버 시작
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
