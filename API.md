# FCM Device API Documentation

## Base URL
```
http://localhost:3000
```

## Endpoints

### 1. 사용자 생성 또는 조회

FCM 토큰과 닉네임으로 새로운 사용자를 생성하거나, 이미 존재하는 사용자를 반환합니다.

**Endpoint:** `POST /api/user`

**Request Body:**
```json
{
  "fcm_token": "string (required)",
  "nickname": "string (optional)"
}
```

**Response:**
- **201 Created** - 새로운 사용자 생성됨
- **200 OK** - 기존 사용자 반환
- **400 Bad Request** - fcm_token이 누락됨

**Example Request (curl):**
```bash
curl -X POST http://localhost:3000/api/user \
  -H "Content-Type: application/json" \
  -d '{
    "fcm_token": "test_token_123",
    "nickname": "홍길동"
  }'
```

**Example Response:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "fcm_token": "test_token_123",
  "nickname": "홍길동",
  "created_at": "2025-10-02T12:34:56.789Z"
}
```

---

### 2. FCM 토큰으로 사용자 조회

FCM 토큰을 사용하여 기존 사용자 정보를 조회합니다.

**Endpoint:** `GET /api/user/:fcm_token`

**URL Parameters:**
- `fcm_token` (required) - 조회할 사용자의 FCM 토큰

**Response:**
- **200 OK** - 사용자 정보 반환
- **404 Not Found** - 사용자를 찾을 수 없음

**Example Request (curl):**
```bash
curl http://localhost:3000/api/user/test_token_123
```

**Example Response:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "fcm_token": "test_token_123",
  "nickname": "홍길동",
  "created_at": "2025-10-02T12:34:56.789Z"
}
```

**Example 404 Response:**
```json
{
  "message": "User not found"
}
```

---

### 3. 푸시 알림 전송

특정 FCM 토큰으로 푸시 알림을 전송합니다.

**Endpoint:** `POST /api/notification/send`

**Request Body:**
```json
{
  "fcm_token": "string (required)",
  "title": "string (required)",
  "body": "string (required)",
  "data": "object (optional)"
}
```

**Response:**
- **200 OK** - 알림 전송 성공
- **400 Bad Request** - 필수 필드 누락
- **500 Internal Server Error** - 전송 실패

**Example Request (curl):**
```bash
curl -X POST http://localhost:3000/api/notification/send \
  -H "Content-Type: application/json" \
  -d '{
    "fcm_token": "test_token_123",
    "title": "새로운 알림",
    "body": "알림 메시지 내용입니다.",
    "data": {
      "type": "message",
      "id": "12345"
    }
  }'
```

**Example Response:**
```json
{
  "success": true,
  "messageId": "projects/myproject/messages/0:1234567890",
  "message": "Notification sent successfully"
}
```

**Example Error Response:**
```json
{
  "error": "fcm_token is required"
}
```

---

## Error Responses

모든 엔드포인트는 서버 오류 발생 시 다음 형식으로 응답합니다:

**500 Internal Server Error:**
```json
{
  "error": "Error message here"
}
```

---

## 사용 시나리오

### 시나리오 1: 새로운 사용자 등록
```bash
curl -X POST http://localhost:3000/api/user \
  -H "Content-Type: application/json" \
  -d '{
    "fcm_token": "new_device_token_456",
    "nickname": "김철수"
  }'
```

### 시나리오 2: 기존 사용자 재등록 (동일한 fcm_token)
```bash
# 이미 존재하는 fcm_token으로 다시 POST 요청
curl -X POST http://localhost:3000/api/user \
  -H "Content-Type: application/json" \
  -d '{
    "fcm_token": "new_device_token_456",
    "nickname": "김철수"
  }'
# → 기존 사용자 정보를 그대로 반환 (중복 생성 방지)
```

### 시나리오 3: FCM 토큰으로 사용자 조회
```bash
curl http://localhost:3000/api/user/new_device_token_456
```

### 시나리오 4: 특정 사용자에게 푸시 알림 전송
```bash
curl -X POST http://localhost:3000/api/notification/send \
  -H "Content-Type: application/json" \
  -d '{
    "fcm_token": "new_device_token_456",
    "title": "환영합니다!",
    "body": "회원가입을 축하합니다.",
    "data": {
      "screen": "home"
    }
  }'
```

---

## JavaScript/Fetch 예제

### 사용자 생성/조회
```javascript
const createOrGetUser = async (fcmToken, nickname) => {
  const response = await fetch('http://localhost:3000/api/user', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      fcm_token: fcmToken,
      nickname: nickname,
    }),
  });

  const data = await response.json();
  return data;
};

// 사용 예시
createOrGetUser('my_fcm_token', '사용자이름')
  .then(user => console.log(user));
```

### FCM 토큰으로 사용자 조회
```javascript
const getUserByToken = async (fcmToken) => {
  const response = await fetch(`http://localhost:3000/api/user/${fcmToken}`);

  if (response.status === 404) {
    console.log('User not found');
    return null;
  }

  const data = await response.json();
  return data;
};

// 사용 예시
getUserByToken('my_fcm_token')
  .then(user => console.log(user));
```

### 푸시 알림 전송
```javascript
const sendNotification = async (fcmToken, title, body, data = {}) => {
  const response = await fetch('http://localhost:3000/api/notification/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      fcm_token: fcmToken,
      title,
      body,
      data,
    }),
  });

  const result = await response.json();
  return result;
};

// 사용 예시
sendNotification(
  'my_fcm_token',
  '새로운 메시지',
  '안녕하세요, 새 메시지가 도착했습니다.',
  { type: 'message', id: '123' }
).then(result => console.log(result));
```
