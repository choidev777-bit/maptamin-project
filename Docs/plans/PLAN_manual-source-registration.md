# 소재 시스템 고도화 계획서

**CRITICAL INSTRUCTIONS**: After completing each phase:
1. ✅ Check off completed task checkboxes
2. 🧪 Run all quality gate validation commands
3. ⚠️ Verify ALL quality gate items pass
4. 📅 Update "Last Updated" date
5. 📝 Document learnings in Notes section
6. ➡️ Only then proceed to next phase

⛔ DO NOT skip quality gates or proceed with failing checks

---

**Feature**: 소재 시스템 고도화 (수동 등록 + 라이브러리 분류 + 글 생성 연동)
**Created**: 2026-03-30
**Last Updated**: 2026-03-30
**Status**: 📋 계획 수립

## 1. 개요

### 목적
소재 수집 → 분류 → 글 생성까지의 전체 파이프라인을 고도화합니다.

### 핵심 변경점 3가지

1. **수동 소재 등록**: URL 또는 텍스트를 직접 입력하여 소재 등록 (역할 선택 포함)
2. **소재 역할 분류**: 소재를 "내용 소재"와 "패턴 소재"로 분리 (자동 스캔→AI 판단, 수동→사용자 선택)
3. **라이브러리 페이지**: 분류된 소재를 내용/패턴 탭으로 관리, 글 생성 시 내용 소재 활용 후 자동 삭제

### 현재 상태 (AS-IS)

```
소재 페이지: 좋아요/조회수 필터만 있는 원본 글 목록
패턴 페이지: 빈 페이지 (패턴 등록 로직 미구현)
글 생성: 소재의 "스타일"만 참고, "내용"은 AI 자체 지식에 의존
분석기: ABCD 타입 + 훅 스타일 분류만 수행
```

### 목표 상태 (TO-BE)

```
소재 페이지: 수집 + 수동 등록 + AI 분석 (source_role 분류 포함)
     ↓ 분석 완료 시 자동 분류
라이브러리 페이지:
  ├── 내용 소재 탭: 글 생성의 "주제/내용" 바탕 → 사용 후 자동 삭제
  └── 패턴 소재 탭: 글 생성의 "구조/스타일" 참고 → 재사용 가능
     ↓
글 생성: 내용 소재의 "내용" + 패턴 소재의 "스타일" = 새 글
```

## 2. 아키텍처 결정

| 결정 사항 | 선택 | 근거 |
|-----------|------|------|
| 소재 역할 분류 (자동) | AI 분석 시 `source_role` 판단 | 계정 주제와의 관련성 기반 |
| 소재 역할 분류 (수동) | 등록 시 사용자 선택 | 모달에서 내용/패턴/둘다 선택 |
| URL 본문 추출 | VPS job으로 처리 | YouTube API, Playwright 크롤링 모두 VPS에서만 가능 |
| 내용 소재 소비 | 글 생성 후 DB에서 삭제 | 같은 내용 반복 생성 방지 |
| 패턴 소재 저장 | `threads_patterns` 테이블 활용 | 기존 테이블 구조 재사용 |
| 기존 패턴 페이지 | 라이브러리로 대체 후 삭제 | 역할 중복 제거 |
| 분석 트리거 | 사용자가 "AI 분석" 버튼 수동 클릭 | 여러 소재 쌓아놓고 한 번에 분석 |

## 3. 전체 데이터 흐름

```
[수집]
  자동 스캔 (피드/키워드/YouTube) ──→ threads_raw_sources (analyzed_at=NULL)
  수동 등록 (URL/텍스트 + 역할 선택) ──→ threads_raw_sources (source_role 사전 지정)

[분석] - 사용자가 "AI 분석" 버튼 클릭
  미분석 소재 배치 조회 → AI 분류:
    ├── content_type: A/B/C/D
    ├── hook_style: 질문형/충격형 등
    ├── source_role: content/pattern/both/none (자동 스캔만, 수동은 이미 지정됨)
    └── 패턴 소재 → threads_patterns 테이블에 훅/구조/CTA 추출 등록

[라이브러리]
  내용 소재 탭: source_role = content 또는 both
  패턴 소재 탭: threads_patterns 테이블 (훅 템플릿, 본문 구조, CTA)

[글 생성]
  1. 내용 소재에서 주제 선택 → "이 내용을 바탕으로 글을 써라"
  2. 패턴에서 스타일 선택 → "이 구조/훅으로 써라"
  3. 생성 완료 → 사용된 내용 소재 자동 삭제
```

## 4. 영향 범위

### 수정 파일
| 파일 | 변경 내용 |
|------|-----------|
| `threads-dashboard/src/app/api/sources/route.ts` | POST 핸들러 추가 (수동 등록) |
| `threads-dashboard/src/app/(dashboard)/sources/page.tsx` | 수동 등록 UI 폼 추가 (모달 + 역할 선택) |
| `threads-dashboard/src/app/(dashboard)/layout.tsx` | 사이드바 NAV에서 "패턴" → "라이브러리" 변경 |
| `vps/threads-api/analyzer.py` | source_role 분류 + 패턴 테이블 insert 로직 추가 |
| `vps/threads-api/generator.py` | 내용 소재 활용 프롬프트 변경 + 사용 후 삭제 |
| `vps/threads-api/job_runner.py` | extract_youtube/threads/web job 타입 + url params 추가 |
| `vps/threads-api/requirements.txt` | beautifulsoup4 추가 |

### 신규 파일
| 파일 | 내용 |
|------|------|
| `threads-dashboard/src/app/(dashboard)/library/page.tsx` | 라이브러리 페이지 (내용 소재 탭 + 패턴 소재 탭) |
| `threads-dashboard/src/app/api/library/route.ts` | 라이브러리 API (내용 소재 조회, 패턴 조회) |
| `vps/threads-api/extractor.py` | URL별 본문 추출 (YouTube/Threads/웹) |

### 삭제 파일
| 파일 | 이유 |
|------|------|
| `threads-dashboard/src/app/(dashboard)/patterns/page.tsx` | 라이브러리 페이지로 대체 |
| `threads-dashboard/src/app/api/patterns/route.ts` | 라이브러리 API로 대체 |

### DB 스키마 변경
| 테이블 | 변경 |
|--------|------|
| `threads_raw_sources` | `source_role` 컬럼 추가 (`content`/`pattern`/`both`/`none`, default NULL) |
| `threads_raw_sources` | `ai_key_points` 컬럼 추가 (JSONB, 내용 소재의 핵심 포인트 배열) |

## 5. Phase 상세

---

### Phase 1: DB 스키마 + 수동 등록 API
**Goal**: 수동 소재 등록의 백엔드 완성
**소요 시간**: ~40분

#### Tasks
- [ ] Supabase에서 `threads_raw_sources`에 컬럼 추가
  - `source_role` (text, default NULL): `content`/`pattern`/`both`/`none`
  - `ai_key_points` (jsonb, default NULL): 내용 소재의 핵심 포인트 배열
- [ ] `route.ts`에 POST 핸들러 추가
  - 입력: `{ text_content: string, source_url?: string, source_role: string }`
  - URL 패턴으로 source_type 자동 감지 (threads/youtube/web/manual)
  - content_hash 생성 (SHA-256, 공백 정규화)
    - 텍스트 입력 시: `SHA-256(text_content)` (기존 방식과 동일)
    - URL 입력 시: `SHA-256(url)` (본문 미추출 상태이므로 URL 기반 hash)
  - 중복 체크 (content_hash 기준)
  - `input_method: "manual"` 설정
  - URL 입력 시 → 해당 extract job을 `threads_job_queue`에 등록

#### Quality Gate
- [ ] DB 마이그레이션 성공
- [ ] POST 요청으로 텍스트 소재 저장 확인
- [ ] 중복 요청 시 에러 응답 확인
- [ ] URL 입력 시 extract job 등록 확인

---

### Phase 2: 수동 등록 UI (소재 페이지)
**Goal**: 소재 페이지에 수동 등록 모달 추가
**소요 시간**: ~40분
**의존성**: Phase 1

#### Tasks
- [ ] 소재 페이지에 "수동 등록" 버튼 추가
- [ ] 클릭 시 모달 표시:
  - textarea: URL 또는 텍스트 입력
  - 역할 선택: ○ 내용 소재 / ○ 패턴 소재 / ○ 둘 다
  - 등록 버튼
- [ ] URL vs 텍스트 자동 감지 (http 시작 여부)
- [ ] 성공/실패/중복 메시지 표시
- [ ] 등록 후 소재 목록 자동 새로고침

#### Quality Gate
- [ ] `npm run build` 성공
- [ ] 모달 열기/닫기 정상 동작
- [ ] 텍스트 입력 + 역할 선택 → 등록 성공
- [ ] URL 입력 → extract job 등록 확인

---

### Phase 3: URL 본문 추출 (VPS)
**Goal**: YouTube/Threads/웹 URL 입력 시 본문 자동 추출
**소요 시간**: ~1시간
**의존성**: Phase 1

#### Tasks
- [ ] `extractor.py` 신규 생성
  - `extract_youtube(url)`: video_id 파싱 → YouTube API 제목+설명 → `get_transcript()` 재사용 → DB 저장
  - `extract_threads(url)`: Playwright + `asyncio.run()` → 글 페이지 방문 → 본문 추출 → DB 저장
  - `extract_web(url)`: requests + BeautifulSoup → 본문 추출 → DB 저장
- [ ] `job_runner.py` 업데이트
  - `JOB_COMMANDS`에 `extract_youtube`, `extract_threads`, `extract_web` 추가
  - params에서 `url` 파라미터 처리 추가: `cmd + ["--url", params["url"]]`
- [ ] `requirements.txt`에 `beautifulsoup4` 추가 + VPS에 pip install

#### Quality Gate
- [ ] YouTube URL → 자막 추출 → DB 저장 확인
- [ ] Threads URL → 본문 추출 → DB 저장 확인
- [ ] 웹 URL → 본문 추출 → DB 저장 확인

---

### Phase 4: AI 분석기 고도화
**Goal**: source_role 자동 분류 + 패턴 테이블 자동 등록
**소요 시간**: ~1시간
**의존성**: Phase 1 (DB 스키마)

#### Tasks
- [ ] `analyzer.py` 모델을 `glm-4.5-air` → `glm-4.7`로 변경
  - source_role 분류는 주제 관련성 + 품질 판단이 필요하여 air 모델로는 정확도 부족
  - 기존 ABCD/훅 분류도 함께 glm-4.7로 통합 (분석 호출 빈도가 낮아 비용 차이 미미)
- [ ] `analyzer.py` 프롬프트에 source_role 분류 추가
  - AI에게 계정 주제 정보 전달
  - 각 소재가 `content`(내용) / `pattern`(패턴) / `both` / `none`인지 판단
  - 기존 content_type/hook_style 분류와 함께 한 번에 처리
  - ⚠️ 내용 소재 판단 시 `TEXT_MAX_LENGTH = 800`으로 잘리는 문제 → 내용 소재 후보는 전문 전달 검토
- [ ] 내용 소재(`source_role = content/both`)는 `ai_key_points` 추출
  - AI 응답 JSON에 `"key_points": ["핵심1", "핵심2", ...]` 필드 추가
  - 패턴 소재는 key_points 빈 배열
  - DB에 JSONB로 저장
- [ ] source_role이 `pattern` 또는 `both`인 소재 → `threads_patterns` 테이블에 insert
  - AI가 훅 템플릿, 본문 구조, CTA 양식 추출
  - 기존 patterns 테이블 구조 활용
- [ ] source_role DB 업데이트 (수동 등록 소재는 이미 지정되어 있으므로 스킵)

#### Quality Gate
- [ ] 마케팅 관련 소재 → source_role = content 또는 both 확인
- [ ] 비관련 고조회수 소재 → source_role = pattern 확인
- [ ] 패턴 소재 → threads_patterns 테이블에 등록 확인

---

### Phase 5: 라이브러리 페이지
**Goal**: 내용 소재 + 패턴 소재를 한 곳에서 관리하는 라이브러리 페이지
**소요 시간**: ~1시간
**의존성**: Phase 4

#### Tasks
- [ ] `library/page.tsx` 신규 생성
  - 탭 UI: [내용 소재] [패턴 소재]
  - 내용 소재 탭: `threads_raw_sources`에서 `source_role = content 또는 both` 조회
  - 패턴 소재 탭: `threads_patterns` 테이블 조회 (훅/구조/CTA 표시)
- [ ] `api/library/route.ts` 신규 생성
  - GET: 내용 소재 또는 패턴 목록 반환 (tab 파라미터로 구분)
- [ ] 사이드바 업데이트 (`layout.tsx`의 NAV 배열)
  - "패턴" 메뉴 → "라이브러리" 메뉴로 변경
  - 기존 patterns 페이지/API 삭제
- [ ] 성과 페이지(`analytics`)의 "패턴 성과" 섹션은 유지
  - `threads_patterns` 테이블을 직접 조회하므로 패턴 페이지 삭제와 무관
  - 라이브러리에서 패턴이 정상 등록되어야 성과 페이지에도 표시됨

#### Quality Gate
- [ ] `npm run build` 성공
- [ ] 내용 소재 탭에 content/both 소재 표시 확인
- [ ] 패턴 소재 탭에 패턴 템플릿 표시 확인
- [ ] 기존 패턴 페이지 URL 접근 시 404 확인
- [ ] 성과 페이지 "패턴 성과" 섹션 정상 표시 확인

---

### Phase 6: 글 생성기 연동
**Goal**: 내용 소재 + 패턴을 결합하여 글 생성, 사용된 내용 소재 자동 삭제
**소요 시간**: ~1시간
**의존성**: Phase 4, Phase 5

#### Tasks
- [ ] `generator.py` 참고 소재 조회 변경
  - 기존: `get_reference_sources(content_type)` → 해당 타입의 engagement_score 상위 (스타일 참고만)
  - 변경: 내용 소재 1개 선택 (`source_role = content 또는 both`, 미사용, **ABCD 타입 무관**) + 해당 타입 패턴 조회
  - ⚠️ 내용 소재는 ABCD 분류 불필요 (주제/내용이므로 타입과 무관), 패턴만 타입별 매칭
- [ ] 내용 소재 텍스트: 전문 대신 `ai_key_points` 전달
  - 기존: `text_content[:200]` → 200자만 전달 (내용 손실)
  - 변경: `ai_key_points` 배열 전달 (핵심만 정리되어 있으므로 토큰 효율적)
  - 폴백: key_points가 없으면 `text_content` 전문 전달
- [ ] 프롬프트 변경
  - 기존: "이 스타일을 참고하되 베끼지 마세요"
  - 변경: "아래 소재의 내용을 바탕으로, 아래 패턴 스타일로 글을 작성하세요"
- [ ] 글 생성 완료 후 사용된 내용 소재 자동 삭제 (또는 `used_at` 표시)
- [ ] 내용 소재가 0개일 때 → 기존 방식(계정 주제 + AI 자체 지식)으로 폴백

#### Quality Gate
- [ ] 내용 소재 있을 때 → 해당 주제의 글 생성 확인
- [ ] 생성 후 사용된 내용 소재 삭제 확인
- [ ] 내용 소재 없을 때 → 기존 방식으로 글 생성 확인 (폴백)

---

### Phase 7: 배포 + 통합 검증
**Goal**: Vercel + VPS 배포 및 전체 흐름 E2E 테스트
**소요 시간**: ~30분
**의존성**: Phase 6

#### Tasks
- [ ] git commit + push (Vercel 자동 배포)
- [ ] VPS에 `extractor.py`, `analyzer.py`, `generator.py`, `job_runner.py` 동기화
- [ ] E2E 테스트:
  1. 텍스트 수동 등록 (내용 소재) → 소재 목록에 표시
  2. YouTube URL 수동 등록 (패턴 소재) → 자막 추출 → 소재 목록에 표시
  3. "AI 분석" 클릭 → source_role 분류 + 패턴 등록
  4. 라이브러리 페이지에서 내용/패턴 확인
  5. "콘텐츠 생성" 클릭 → 내용 소재 바탕 글 생성 → 내용 소재 삭제 확인
- [ ] 기존 자동 스캔/분석/발행 정상 동작 확인 (회귀 테스트)

#### Quality Gate
- [ ] Vercel 배포 성공
- [ ] VPS 파일 동기화 완료
- [ ] E2E 5단계 전부 성공
- [ ] 기존 기능 회귀 없음

---

## 6. 리스크 평가

| 리스크 | 확률 | 영향 | 대응 |
|--------|------|------|------|
| AI가 source_role을 잘못 분류 | 중간 | 중간 | 라이브러리에서 수동으로 역할 변경 기능 (향후) |
| YouTube 자막 없는 영상 | 중간 | 낮음 | 제목+설명만으로 저장 |
| Threads 크롤링 차단 | 중간 | 중간 | 공개 글만 대상, 실패 시 에러 반환 |
| 내용 소재 0개 상태에서 글 생성 | 확실 | 낮음 | 기존 방식(AI 자체 지식)으로 폴백 |
| 패턴 테이블 기존 데이터와 충돌 | 낮음 | 낮음 | 기존 데이터 비어있음 (미구현 상태) |
| beautifulsoup4 VPS 설치 실패 | 낮음 | 낮음 | pip install로 간단 설치 |

## 7. 롤백 전략

| Phase | 롤백 방법 |
|-------|-----------|
| Phase 1 | DB 컬럼 drop + POST 핸들러 삭제 |
| Phase 2 | 소재 페이지에서 모달 코드 삭제 |
| Phase 3 | extractor.py 삭제 + job_runner 원복 |
| Phase 4 | analyzer.py 프롬프트 원복 |
| Phase 5 | library 페이지 삭제 + patterns 페이지 복원 |
| Phase 6 | generator.py 프롬프트 원복 + 삭제 로직 제거 |

## 8. 향후 확장 (이번 범위 밖)

- 라이브러리에서 소재 역할 수동 변경 기능
- 내용 소재 engagement_score 수동 설정
- 한 번에 여러 URL 일괄 등록
- 소재 삭제/수정 기능
- Open Graph 메타데이터 추출 (썸네일, 작성자 등)

---

## Notes & Learnings
_(Phase 완료 시 기록)_
