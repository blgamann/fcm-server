# FCM Device API 명세서

## Base URL
```
http://localhost:3000
```

## Endpoints

### 1. 모든 사용자 조회

모든 사용자 목록을 조회합니다 (최신순).

**Endpoint:** `GET /api/users`

**Response:**

성공 (200):
```json
[
  {
    "id": "uuid",
    "fcm_token": "string",
    "nickname": "string",
    "created_at": "timestamp"
  },
  ...
]
```

---

### 2. 단일 사용자 조회

FCM 토큰으로 사용자 정보를 조회합니다.

**Endpoint:** `GET /api/user/:fcm_token`

**Parameters:**
- `fcm_token` (path parameter, required): 사용자의 FCM 토큰

**Response:**

성공 (200):
```json
{
  "id": "uuid",
  "fcm_token": "string",
  "nickname": "string",
  "created_at": "timestamp"
}
```

실패 (404):
```json
{
  "message": "User not found"
}
```

---

### 3. 사용자 생성

새로운 사용자를 생성하거나 기존 사용자를 반환합니다.

**Endpoint:** `POST /api/user`

**Request Body:**
```json
{
  "fcm_token": "string",
  "nickname": "string"
}
```

**Response:**

성공 - 신규 생성 (201):
```json
{
  "id": "uuid",
  "fcm_token": "string",
  "nickname": "string",
  "created_at": "timestamp"
}
```

성공 - 기존 사용자 (200):
```json
{
  "id": "uuid",
  "fcm_token": "string",
  "nickname": "string",
  "created_at": "timestamp"
}
```

실패 (400):
```json
{
  "error": "fcm_token is required"
}
```

---

### 4. 푸시 알림 전송

FCM 토큰으로 푸시 알림을 전송합니다.

**Endpoint:** `POST /api/notification/send`

**Request Body:**
```json
{
  "fcm_token": "string (required)",
  "title": "string (required)",
  "body": "string (required)",
  "data": {
    "key": "value"
  } // optional
}
```

**Response:**

성공 (200):
```json
{
  "success": true,
  "messageId": "string",
  "message": "Notification sent successfully"
}
```

실패 (400):
```json
{
  "error": "fcm_token is required"
}
```
또는
```json
{
  "error": "title and body are required"
}
```

---

### 5. 모든 Ritual 조회

모든 ritual 목록을 참여 user 정보와 함께 조회합니다 (최신순).

**Endpoint:** `GET /api/rituals`

**Response:**

성공 (200):
```json
[
  {
    "id": "uuid",
    "title": "string",
    "default_minutes": "integer",
    "created_at": "timestamp",
    "users": [
      {
        "id": "uuid",
        "fcm_token": "string",
        "nickname": "string",
        "created_at": "timestamp"
      },
      ...
    ]
  },
  ...
]
```

---

### 6. Ritual 생성

새로운 ritual을 생성하고 참여 user들을 연결합니다.

**Endpoint:** `POST /api/ritual`

**Request Body:**
```json
{
  "title": "string (required)",
  "default_minutes": "integer (optional, default: 30)",
  "user_ids": ["uuid", "uuid", ...] // (required, non-empty array)
}
```

**Response:**

성공 (201):
```json
{
  "id": "uuid",
  "title": "string",
  "default_minutes": "integer",
  "created_at": "timestamp"
}
```

실패 (400):
```json
{
  "error": "title is required"
}
```
또는
```json
{
  "error": "user_ids is required and must be a non-empty array"
}
```

---

## 에러 응답

모든 엔드포인트는 서버 오류 발생 시 다음과 같은 응답을 반환할 수 있습니다:

**500 Internal Server Error:**
```json
{
  "error": "error message"
}
```
