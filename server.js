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

// GET /api/users - 모든 사용자 조회
app.get('/api/users', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    res.json(data);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: error.message });
  }
});

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

// GET /api/rituals - 모든 ritual 조회
app.get('/api/rituals', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('ritual')
      .select(`
        *,
        ritual_users(
          users(*)
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    // ritual_users를 users 배열로 변환
    const ritualsWithUsers = data.map(ritual => ({
      ...ritual,
      users: ritual.ritual_users?.map(ru => ru.users) || [],
      ritual_users: undefined
    }));

    res.json(ritualsWithUsers);
  } catch (error) {
    console.error('Error fetching rituals:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/ritual - 새로운 ritual 생성
app.post('/api/ritual', async (req, res) => {
  try {
    const { title, default_minutes, user_ids, rule, start_date, end_date } = req.body;

    if (!title) {
      return res.status(400).json({ error: 'title is required' });
    }

    if (!user_ids || !Array.isArray(user_ids) || user_ids.length === 0) {
      return res.status(400).json({ error: 'user_ids is required and must be a non-empty array' });
    }

    // Ritual 생성
    const ritualData = {
      title,
      default_minutes: default_minutes || 30
    };

    // 선택적 필드 추가
    if (rule !== undefined) ritualData.rule = rule;
    if (start_date !== undefined) ritualData.start_date = start_date;
    if (end_date !== undefined) ritualData.end_date = end_date;

    const { data: ritual, error: ritualError } = await supabase
      .from('ritual')
      .insert([ritualData])
      .select()
      .single();

    if (ritualError) {
      throw ritualError;
    }

    // Ritual-User 관계 생성
    const ritualUsers = user_ids.map(user_id => ({
      ritual_id: ritual.id,
      user_id: user_id
    }));

    const { error: ritualUsersError } = await supabase
      .from('ritual_users')
      .insert(ritualUsers);

    if (ritualUsersError) {
      // Ritual은 생성되었지만 user 연결 실패 시 ritual 삭제
      await supabase.from('ritual').delete().eq('id', ritual.id);
      throw ritualUsersError;
    }

    res.status(201).json(ritual);
  } catch (error) {
    console.error('Error creating ritual:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/ritual-record - 새로운 ritual 완료 기록 생성
app.post('/api/ritual-record', async (req, res) => {
  try {
    const { ritual_id, user_id, image_url, review } = req.body;

    if (!ritual_id) {
      return res.status(400).json({ error: 'ritual_id is required' });
    }

    if (!user_id) {
      return res.status(400).json({ error: 'user_id is required' });
    }

    // Ritual record 생성
    const recordData = {
      ritual_id,
      user_id,
    };

    // 선택적 필드 추가
    if (image_url !== undefined) recordData.image_url = image_url;
    if (review !== undefined) recordData.review = review;

    const { data: record, error } = await supabase
      .from('ritual_record')
      .insert([recordData])
      .select()
      .single();

    if (error) {
      throw error;
    }

    res.status(201).json(record);
  } catch (error) {
    console.error('Error creating ritual record:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/ritual/:ritual_id/records - 특정 ritual의 완료 기록 조회
app.get('/api/ritual/:ritual_id/records', async (req, res) => {
  try {
    const { ritual_id } = req.params;

    const { data, error } = await supabase
      .from('ritual_record')
      .select(`
        *,
        users(*)
      `)
      .eq('ritual_id', ritual_id)
      .order('completed_at', { ascending: false });

    if (error) {
      throw error;
    }

    res.json(data);
  } catch (error) {
    console.error('Error fetching ritual records:', error);
    res.status(500).json({ error: error.message });
  }
});

// 서버 시작
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
