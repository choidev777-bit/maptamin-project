---
name: threads-automation
description: Contabo VPS에서 Threads 공식 API를 활용한 마케팅 자동화 인프라 구축 및 운영 가이드. API 기반 포스팅, 토큰 자동 갱신, 다중 계정 관리를 포함합니다.
---

# Threads 마케팅 자동화 인프라 가이드

## 1. 시스템 환경

| 항목 | 값 |
|------|------|
| 서버 | Contabo VPS |
| IP | 46.250.237.24 |
| OS | Ubuntu (Linux) |
| 포스팅 방식 | **Threads 공식 API** (2026-03-28 전환) |
| 이전 방식 | ~~Openclaw + Chrome CDP~~ (계정 정지 위험으로 폐기) |

---

## 2. 아키텍처 구조

```
┌─────────────────────────────────────────────────────┐
│                  Contabo VPS                         │
│                                                      │
│  ┌─────────────────────────────────┐                 │
│  │ /root/threads-api/              │  ← API 포스팅   │
│  │ ├── .env          (토큰 저장)   │                 │
│  │ ├── post.py       (포스팅)      │                 │
│  │ ├── refresh_token.py (갱신)     │                 │
│  │ └── refresh.log   (갱신 로그)   │                 │
│  └─────────────────────────────────┘                 │
│                                                      │
│  ┌─────────────────────────────────┐                 │
│  │ Cron Job                        │  ← 자동 갱신    │
│  │ 매월 1일 03:00 → refresh_token  │                 │
│  └─────────────────────────────────┘                 │
│                                                      │
│  ┌─────────────────────────────────┐                 │
│  │ Telegram Bot 알림               │  ← 갱신 결과    │
│  │ 성공/실패 시 텔레그램 메시지    │                 │
│  └─────────────────────────────────┘                 │
└─────────────────────────────────────────────────────┘
```

---

## 3. 계정 정보

| 계정 | Threads User ID | 용도 | 상태 |
|------|----------------|------|------|
| @bono_marketing | 26381093298223633 | 마케팅 | ✅ API 연동 완료 |
| @place_hacker_ | 27425047850429010 | 장소 리뷰 | ✅ API 연동 완료 |
| ~~@place_hackerr~~ | - | - | ❌ 계정 정지됨 (브라우저 자동화 탐지) |

### Meta 앱 정보

| 항목 | 값 |
|------|------|
| Threads 앱 ID | 843513322096207 |
| 앱 이름 | Threads_1 |
| 리디렉션 콜백 URL | https://maptamin.com |

---

## 4. 파일 구조

```
/root/threads-api/
├── .env                ← 토큰 저장 (chmod 600, root만 접근)
├── post.py             ← 포스팅 스크립트
├── refresh_token.py    ← 토큰 자동 갱신 스크립트
└── refresh.log         ← 갱신 로그
```

### .env 구조

```env
BONO_USER_ID=26381093298223633
BONO_ACCESS_TOKEN=실제_토큰
PLACE_USER_ID=27425047850429010
PLACE_ACCESS_TOKEN=실제_토큰
TELEGRAM_BOT_TOKEN=봇_토큰
TELEGRAM_CHAT_ID=5596902099
```

---

## 5. 포스팅 방법

### CLI로 직접 포스팅

```bash
# bono_marketing 계정으로 포스팅
python3 /root/threads-api/post.py bono "포스팅할 내용"

# place_hacker_ 계정으로 포스팅
python3 /root/threads-api/post.py place "포스팅할 내용"
```

### API 동작 원리 (2단계)

```bash
# 1단계: 미디어 컨테이너 생성
curl -s -X POST "https://graph.threads.net/v1.0/{user_id}/threads" \
  -d "media_type=TEXT" \
  -d "text=내용" \
  -d "access_token=토큰"
# → {"id":"컨테이너_ID"}

# 2단계: 게시
curl -s -X POST "https://graph.threads.net/v1.0/{user_id}/threads_publish" \
  -d "creation_id=컨테이너_ID" \
  -d "access_token=토큰"
# → {"id":"게시물_ID"}
```

---

## 6. 토큰 관리

### 토큰 유형

| 유형 | 유효기간 | 획득 방법 |
|------|---------|----------|
| 단기 토큰 | 1시간 | OAuth 인증 |
| **장기 토큰** | **60일** | 단기 토큰 교환 또는 대시보드 발급 |

### 토큰 상태 확인

```bash
curl -s "https://graph.threads.net/v1.0/me?fields=id,username&access_token=토큰"
```

### 수동 토큰 갱신

```bash
curl -s "https://graph.threads.net/refresh_access_token?grant_type=th_refresh_token&access_token=현재_토큰"
```

### 자동 갱신 (Cron)

- **주기**: 매월 1일 새벽 3시
- **스크립트**: `/root/threads-api/refresh_token.py`
- **알림**: 성공/실패 시 텔레그램 메시지 전송
- **로그**: `/root/threads-api/refresh.log`

```bash
# cron 확인
crontab -l
# 출력: 0 3 1 * * python3 /root/threads-api/refresh_token.py
```

### 토큰 재발급이 필요한 경우 (60일 만료 시)

1. Meta 개발자 대시보드 접속: https://developers.facebook.com
2. 앱 선택 → 이용 사례 → 맞춤 설정 → 설정
3. 사용자 토큰 생성기에서 새 토큰 발급
4. `.env` 파일 업데이트

---

## 7. API 제한사항

| 항목 | 제한 |
|------|------|
| 포스팅 | 24시간당 250개 |
| 답글 | 24시간당 1,000개 |
| 삭제 | 24시간당 100개 |

### 사용량 확인

```bash
curl -s "https://graph.threads.net/v1.0/{user_id}/threads_publishing_limit?fields=quota_usage,config&access_token=토큰"
```

---

## 8. 새 계정 추가 체크리스트

새 Threads 계정을 API에 연결할 때:

1. ☐ Instagram에서 **크리에이터 계정**으로 전환
2. ☐ Meta 개발자 대시보드 → 앱 역할 → **Threads 테스터에 추가**
3. ☐ Instagram 앱에서 **초대 수락** (설정 → 계정 → 개발자로서 앱 및 웹사이트)
4. ☐ 이용 사례 → 맞춤 설정 → 설정 → **토큰 생성**
5. ☐ User ID 확인: `curl -s "https://graph.threads.net/v1.0/me?fields=id,username&access_token=토큰"`
6. ☐ `.env`에 `{PREFIX}_USER_ID`, `{PREFIX}_ACCESS_TOKEN` 추가
7. ☐ `post.py`의 ACCOUNTS에 계정 추가
8. ☐ `refresh_token.py`의 prefix 목록에 추가

---

## 9. 브라우저 인프라 (레거시 — 피드 분석용으로만 유지)

> ⚠️ **포스팅에는 절대 사용하지 않음!** 브라우저 자동화로 포스팅하면 계정 정지 위험.
> 피드 읽기/분석용으로만 사용.

| 프로필 | Chrome 포트 | VNC 포트 | noVNC 포트 | 디스플레이 |
|--------|-------------|----------|-----------|-----------| 
| bono-marketing | 9223 | 5998 | 6082 | :100 |

### VNC 접속

| 계정 | URL |
|------|-----|
| bono-marketing | `http://46.250.237.24:6082/vnc.html` |

---

## 10. 트러블슈팅

### 포스팅 실패 시
```bash
# 토큰 유효성 확인
curl -s "https://graph.threads.net/v1.0/me?fields=id,username&access_token=토큰"

# 에러 응답이 OAuthException이면 → 토큰 갱신 또는 재발급 필요
python3 /root/threads-api/refresh_token.py
```

### 토큰 갱신 실패 시
```bash
# 로그 확인
cat /root/threads-api/refresh.log

# 토큰이 완전히 만료된 경우 → Meta 대시보드에서 재발급
# https://developers.facebook.com → 앱 → 이용 사례 → 설정 → 토큰 생성
```

### cron 동작 확인
```bash
# cron 등록 확인
crontab -l

# 최근 로그 확인
tail -20 /root/threads-api/refresh.log
```

---

## 11. 보안 주의사항

1. **`.env` 파일**: `chmod 600` 유지 (root만 읽기/쓰기)
2. **GitHub에 토큰 커밋 금지**: `.env`는 VPS에만 존재
3. **앱 시크릿 코드**: 서버 사이드에서만 사용, 클라이언트에 노출 금지
4. **CDP 포트 (9222, 9223)**: 외부에 열지 않음 (localhost만 접근)

---

## 12. 방식 전환 기록

| 날짜 | 변경 내용 |
|------|----------|
| 2026-03-26 | Openclaw + Chrome CDP 기반 브라우저 자동화 구축 |
| 2026-03-27 | place_hackerr 계정 정지 (자동화 패턴 탐지) |
| 2026-03-28 | **Threads 공식 API로 전면 전환** |
| 2026-03-28 | bono_marketing, place_hacker_ API 연동 완료 |
| 2026-03-28 | 토큰 자동 갱신 + 텔레그램 알림 구축 |

---

## 13. 향후 구현 예정

1. **AI 글 생성 파이프라인** (GLM API → Threads API 포스팅)
2. **Python 피드 분석 스크립트** (Playwright + CDP, 읽기 전용)
3. **텔레그램 봇 연동** (텔레그램에서 명령 → API 포스팅)
4. **Cron Job 정기 포스팅** (시간대별 자동 발행)
5. **이미지 포스팅** (media_type=IMAGE 활용)
