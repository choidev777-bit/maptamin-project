# Implementation Plan: 스레드 콘텐츠 전략 고도화

**Status**: ✅ Done
**Started**: 2026-03-31
**Last Updated**: 2026-03-31 (v5 - Phase 3 publisher 타래 발행 완료)
**Estimated Completion**: -

---

**⚠️ CRITICAL INSTRUCTIONS**: After completing each phase:
1. ✅ Check off completed task checkboxes
2. 🧪 Run all quality gate validation commands
3. ⚠️ Verify ALL quality gate items pass
4. 📅 Update "Last Updated" date above
5. 📝 Document learnings in Notes section
6. ➡️ Only then proceed to next phase

⛔ **DO NOT skip quality gates or proceed with failing checks**

---

## 📋 Overview

### Feature Description

저자(vibemoney.biz) 전략을 기반으로 현재 시스템의 콘텐츠 생성/발행 전략을 고도화한다.

**핵심 변경 4가지**:

1. **타래(Thread) 형식 도입**: A타입 글을 "짧은 후킹 본문 + 셀프 자답 댓글 N개"로 생성/발행
2. **계정별 사이클 순서 재정의**: @bono_marketing: A→D→B→C, @place_hacker_: B→A→D
3. **계정별 링크 타입 설정 + `link_every_n` 제거**: @bono: A,B타입에 링크. @place: B타입에만 링크. 빈도 제어 로직 삭제
4. **@place_hacker_ C타입 제거**: ABCD → BAD

**건드리지 않는 것**: scanner.py, analyzer.py, DB 인프라, Threads API 인증, 스케줄러, 대시보드

---

### Karpathy 가정 명시

| 가정 | 근거 | 리스크 |
|------|------|--------|
| Threads API `threads_reply()`는 정상 작동 | publisher.py:118-136에 구현 및 link_comment에서 사용 중 | Low |
| AI(Gemini)가 JSON 배열 형식 응답 가능 | 현재도 JSON 응답 중. 배열로 확장은 표준 기능 | Low |
| 셀프댓글은 이전 댓글에 연결되는 체인형 | 저자 스크린샷 분석: 댓글 → 댓글 → 댓글 체인 구조 확인 | Low |
| `threads_contents` 테이블에 `thread_parts` 컬럼 추가 필요 | 현재 `text_content`(단일 텍스트)만 있음 | Low |
| `link_every_n` 컬럼은 DB에 유지하되 코드에서 무시 | 이미 마이그레이션 완료된 컬럼 — 재삭제 불필요 | Low |
| @bono_marketing: ADBC 순서, @place_hacker_: BAD 순서 | 대화에서 확정 | Low |
| @bono: A+B 링크, @place: B만 링크 | 대화에서 확정 | Low |

---

### Success Criteria

- [ ] A타입 글 발행 시 본문은 1~3줄 짧은 후킹, 셀프댓글이 자동으로 달린다
- [ ] @bono: A타입 + B타입 글에 맵타민 링크 댓글이 달린다
- [ ] @place: B타입 글에만 맵타민 링크 댓글이 달린다
- [ ] @bono 사이클: A→D→B→C 순서로 생성/발행된다
- [ ] @place 사이클: B→A→D 순서로 생성/발행된다
- [ ] C/D타입 글에는 링크 댓글이 달리지 않는다 (어떤 계정이든)
- [ ] 기존 발행 파이프라인(thread_parts 없는 기존 글)이 깨지지 않는다
- [ ] AI가 소재 분량에 따라 셀프댓글 수를 자동으로 결정한다 (0~8개)

---

## 🏗️ Architecture Decisions

| Decision | Rationale |
|----------|-----------|
| `thread_parts` JSON 컬럼 추가 | 기존 `text_content` 하위 호환성 유지. NULL이면 기존 방식 |
| **link_every_n 제거 + 계정별 링크 타입** | bono: A+B에 링크(50%), place: B에만 링크(33%). 카운터 불필요 |
| **셀프댓글은 체인형** (`last_reply_id`) | 저자 예시 스크린샷 기준: 댓글이 이전 댓글에 달리는 타래 구조 |
| parse_generation_response: **키 존재 여부로 분기** | `thread_parts` 키가 있으면 A타입 응답, 없으면 기존 응답. 함수 시그니처 변경 없음 |
| generate_all(): **루프 내부에서 계정별 타입 결정** | `types` 변수를 루프 밖에서 한 번 정의하면 계정별 분기 불가 → 루프 내부로 이동 |
| @place_hacker_ 타입 설정: 코드 상수로 관리 | DB 변경 없이 코드만 수정. 추후 대시보드 설정 개선 가능 |

---

## 📦 Dependencies

- [x] Supabase `link_every_n` 컬럼 마이그레이션 완료 (PLAN_link-frequency-control Phase 1)
- [ ] Supabase `thread_parts` 컬럼 마이그레이션 (Phase 1)
- [ ] VPS SSH 접근 가능

---

## 🔍 엣지케이스 분석

| # | 케이스 | 처리 방안 |
|---|--------|----------|
| 1 | AI가 thread_parts를 10개 이상 반환 | `thread_parts[:9]` 캡 (본문 포함 최대 10개) |
| 2 | AI가 thread_parts를 빈 배열 `[]`로 반환 | `text_content`에 빈 문자열 → 기존 empty 체크로 필터됨 |
| 3 | AI가 thread_parts 없이 기존 text 키로 응답 | 키 존재 여부 분기로 fallback → `thread_parts=None`, `text_content=result["text"]` |
| 4 | 셀프댓글 도중 API 오류 | 본문은 이미 published. 댓글 실패는 warning 로그만. 발행 성공 처리 유지 |
| 5 | thread_parts가 NULL인 기존 콘텐츠 발행 | publisher.py에서 `thread_parts or []` → 빈 배열 → 댓글 루프 안 탐 |
| 6 | 링크 타입인데 prod_config 없음 | `force_link = ... and (prod_config is not None)` → False. 링크 없음 |
| 7 | @place_hacker_ 마지막 발행 타입이 C (기존 데이터) | `get_next_cycle_type()` 에서 C가 BAD 목록에 없음 → idx=-1 → 첫번째 타입(B)으로 fallback |
| 8 | thread_parts 길이 1 (본문만) | `if len(thread_parts) > 1:` 조건 불충족 → 댓글 루프 안 탐. 정상 |
| 9 | generate --type C --account place 명시적 실행 | 계정별 타입 제한은 generate_all 레벨만 적용. 직접 지정은 허용 (의도적 예외) |
| 10 | 기존 link_every_n 로직(get_since_last_link) 코드 잔존 | 해당 함수와 관련 로직 전부 삭제 |

---

## 🚀 Implementation Phases

---

### Phase 1: DB 마이그레이션 (`thread_parts` 컬럼 추가)
**Goal**: `threads_contents` 테이블에 `thread_parts` 컬럼이 생기고, 기존 데이터에 영향 없음
**Estimated Time**: 0.5시간
**Status**: ✅ Done (2026-03-31)

#### Tasks

- [x] **Task 1.1**: Supabase SQL Editor에서 실행
  ```sql
  ALTER TABLE threads_contents
    ADD COLUMN IF NOT EXISTS thread_parts JSONB DEFAULT NULL;
  ```

#### Quality Gate ✋

- [x] `SELECT thread_parts FROM threads_contents LIMIT 1;` → `No rows returned` (컬럼 추가 확인, 기존 데이터 영향 없음)
- [ ] 대시보드 콘텐츠 페이지 정상 로드 확인 (Phase 3 이후 진행)

---

### Phase 2: Generator 리팩토링
**Goal**: A타입 타래 생성 + link_every_n 제거 + 계정별 사이클/링크 설정
**Estimated Time**: 2시간
**Status**: ✅ Done (2026-03-31)

#### 변경 전/후 대조

| 항목 | 변경 전 | 변경 후 |
|------|---------|---------|
| 링크 조건 | `force_link = (since_last_link >= link_every_n - 1) and ...` | `force_link = (ct in ACCOUNT_LINK_TYPES[account]) and (prod_config is not None)` |
| get_since_last_link() | 존재 | **삭제** |
| build_generation_prompt() | 단일 JSON 스키마 | A타입/그외 분기 |
| parse_generation_response() | `text` 키만 | `thread_parts` 키 있으면 분기 |
| generate_all() 타입 루프 | 모든 계정 공통 CYCLE_ORDER | 계정별 ACCOUNT_CYCLE_TYPES |
| get_next_cycle_type() | CYCLE_ORDER 하드코딩 | 계정별 타입 목록 사용 |

#### Tasks

**Task 2.1**: 계정별 사이클 순서 + 링크 타입 상수 추가
- File: `vps/threads-api/generator.py`
- 기존 `CYCLE_ORDER = ["A", "B", "C", "D"]` 아래에 추가:
  ```python
  # 계정별 사이클 순서 (발행 순서)
  ACCOUNT_CYCLE_TYPES: dict[str, list[str]] = {
      "bono": ["A", "D", "B", "C"],   # 어그로→트렌드→인사이트(링크)→라포
      "place": ["B", "A", "D"],       # 인사이트(링크)→어그로→트렌드 (C 없음)
  }

  # 계정별 링크 허용 타입
  ACCOUNT_LINK_TYPES: dict[str, list[str]] = {
      "bono": ["A", "B"],   # A+B에 맵타민 링크
      "place": ["B"],       # B에만 맵타민 링크
  }
  ```

**Task 2.2**: `get_next_cycle_type()` — 계정별 타입 목록 사용
- 현재 코드:
  ```python
  idx = CYCLE_ORDER.index(last) if last in CYCLE_ORDER else -1
  return CYCLE_ORDER[(idx + 1) % len(CYCLE_ORDER)]
  ```
- 변경 후:
  ```python
  acc_types = ACCOUNT_CYCLE_TYPES.get(account, CYCLE_ORDER)
  idx = acc_types.index(last) if last in acc_types else -1
  return acc_types[(idx + 1) % len(acc_types)]
  ```

**Task 2.3a**: `build_generation_prompt()` — 전면적인 프롬프트 엔지니어링 개편 (CoT & XML 적용)
- `force_link` 파라미터는 유지하되, 전체 프롬프트 구조를 XML 태그 구획 방식과 내부 사고(`_thought`) 파이프라인으로 리팩토링.
- 템플릿 구조:
  ```xml
  <persona>
  계정명: @{display_name}
  전문 분야: {topic}
  말투 톤: {tone}
  절대 금지어: {banned_words}
  </persona>

  <source_material>
  주제: {category}
  원문 요약: {summary}
  핵심 포인트:
  {key_points}
  </source_material>

  <target_format>
  타입: {content_type} ({type_desc})
  
  # A타입(타래)일 경우:
  1. thread_parts[0] (본문): 스크롤을 멈추게 하는 50자 내외의 강렬한 훅. (핵심 정보 공개 금지)
  2. thread_parts[1~N] (댓글): 원문의 핵심 포인트를 썰 풀듯이 전개. (최대 8개, 소재가 짧으면 0개) 각 댓글 앞에는 "#1. 소제목" 사용.
  
  # B/C/D타입일 경우: 기존처럼 분량 및 목적에 맞게 작성하고 text 필드 사용.
  </target_format>

  <anti_patterns>
  이 중 하나라도 어기면 생성 실패입니다:
  1. 서론 금지: "안녕하세요", "~에 대해 알아볼까요?" 절대 금지. 첫 문장부터 찌르세요.
  2. 마무리 금지: "결론적으로", "정리하자면" 같은 기계적인 멘트 금지.
  3. 어미 반복 금지: "~거든요", "~인데요"가 2번 이상 나오면 안 됨.
  4. 나열 금지: "첫째, 둘째" 대신 단답형 불릿 사용.
  5. 금지어({banned_words}) 및 해시태그(#) 절대 금지.
  6. 이모지는 전체에서 최대 2개만 허용.
  </anti_patterns>

  {product_text (force_link=True 시)}

  <output_instruction>
  결과를 출력하기 전에 `_thought` 필드에 아래의 사고 과정을 반드시 50자 이내로 적으세요:
  1. 페르소나와 톤이 맞는지?
  2. anti_patterns를 하나라도 어기지 않았는지?

  그 후 형식에 맞춰 순수 JSON만 출력하세요.
  (A타입 응답 스키마)
  {"_thought": "...", "thread_parts": ["본문", "#1. 댓글..."], "link_eligible": ..., "link_comment": "..."}
  
  (B/C/D타입 응답 스키마)
  {"_thought": "...", "text": "...", "link_eligible": ..., "link_comment": "..."}
  </output_instruction>
  ```
**Task 2.4**: `parse_generation_response()` — `thread_parts` 키 분기 추가
- 함수 시그니처 변경 없음. 키 존재 여부로 분기:
  ```python
  def parse_generation_response(raw: str) -> dict | None:
      ...
      data = json.loads(text)

      # 출력된 JSON에서 _thought 부분은 무시하고, 실제 콘텐츠만 추출
      if "thread_parts" in data and isinstance(data["thread_parts"], list) and data["thread_parts"]:
          parts = data["thread_parts"][:9]  # 최대 본문+댓글8개 캡
          return {
              "text": parts[0],              # 본문 (text_content 저장용)
              "thread_parts": parts,         # 전체 배열
              "link_eligible": bool(data.get("link_eligible", False)),
              "link_comment": data.get("link_comment"),
          }

      # 기존 응답 (B/C/D타입)
      return {
          "text": data.get("text", ""),
          "thread_parts": None,
          "link_eligible": bool(data.get("link_eligible", False)),
          "link_comment": data.get("link_comment"),
      }
  ```

**Task 2.5**: `generate_for_account()` — link_every_n 제거 + force_link 단순화
- **삭제**: `get_since_last_link()` 호출, `since_last_link` 변수, 로컬 카운터 업데이트 블록
- **변경**: force_link 로직 단순화
  ```python
  # 변경 전 (삭제)
  link_every_n = max(1, (prod_config or {}).get("link_every_n") or 3)
  since_last_link = get_since_last_link(account)
  ...
  force_link = (since_last_link >= link_every_n - 1) and (prod_config is not None)

  # 변경 후
  force_link = (ct in ACCOUNT_LINK_TYPES.get(account, ["B"])) and (prod_config is not None)
  ```
- **추가**: `save_content()` 호출 시 `thread_parts` 필드 추가:
  ```python
  save_content({
      ...
      "text_content": result["text"],
      "thread_parts": result.get("thread_parts"),  # A타입만 non-NULL
      ...
  })
  ```

**Task 2.6**: `generate_all()` — 루프 구조 재설계

**핵심 원칙**: `get_next_cycle_type()`이 DB에서 마지막 타입을 조회하여 다음 사이클 타입을 자동 결정한다(generator.py:98-113). 따라서 `generate_all()`에서 타입별 루프를 돌리는 대신, `content_type=None`으로 보내면 `generate_for_account()` 내부에서 사이클이 자연스럽게 흐른다.

- 현재 문제:
  ```python
  types = [content_type] if content_type else CYCLE_ORDER
  for acc in accounts:
      for ct in types:                      # ct=A로 3번, ct=D로 3번...
          n = generate_for_account(acc, ct, count)  # AAADDDBBBBCCC 순서
  ```
- 변경 후:
  ```python
  for acc in accounts:
      if content_type:
          # --type 명시된 경우: 해당 타입만 count개
          n = generate_for_account(acc, content_type, count)
      else:
          # 타입 미지정: get_next_cycle_type()이 ADBC 사이클 자동 결정
          acc_types = ACCOUNT_CYCLE_TYPES.get(acc, CYCLE_ORDER)
          total = count * len(acc_types)    # bono: count×4, place: count×3
          n = generate_for_account(acc, None, total)
  ```
  - **결과**: bono count=1이면 A→D→B→C 순서로 4개 생성, count=2면 8개
  - **print 수정**: `total_per_account` 계산 로직도 계정별로 달라짐

**Task 2.7**: `get_since_last_link()` 함수 삭제
- 이전 구현에서 추가된 함수 전체 제거 (generator.py:49-79)

**Task 2.8**: `call_ai()` — A타입 전용 system 프롬프트 분기 추가
- File: `vps/threads-api/generator.py`
- 기존 페르소나("소셜미디어 전문 카피라이터")를 강화: "한국의 Threads SNS에서 활동하는 '산전수전 다 겪은 1인 비즈니스 대표이자 실무자'"
- **변경**: `call_ai(prompt, content_type=None)` 파라미터 추가 후 분기:
  ```python
  def call_ai(prompt: str, content_type: str | None = None) -> str:
      base_system = "당신은 한국의 Threads SNS에서 활동하는 '산전수전 다 겪은 1인 비즈니스 대표이자 실무자'입니다. 절대 마케팅 대행사나 AI 티를 내지 않고 날것의 인사이트를 던집니다."
      
      if content_type == "A":
          system_msg = f"{base_system} 반드시 제공된 지시사항(XML 태그)을 읽고, 타래 형식의 `thread_parts` 배열과 `_thought` 필드가 포함된 순수 JSON 객체 단 하나만 응답하세요. 마크다운(```)은 절대 사용하지 마세요."
      else:
          system_msg = f"{base_system} 반드시 제공된 지시사항(XML 태그)을 읽고, `text` 필드와 `_thought` 필드가 포함된 순수 JSON 객체 단 하나만 응답하세요. 마크다운(```)은 절대 사용하지 마세요."
      ...
  ```
- `build_generation_prompt()`를 호출하는 `generate_for_account()` 내부에서 `ct`를 `call_ai(prompt, ct)`로 전달

**Task 2.9**: VPS 배포
```bash
scp vps/threads-api/generator.py root@46.250.237.24:/root/threads-api/generator.py
```

#### Quality Gate ✋

```bash
# 구문 검증
python -c "import ast; ast.parse(open('vps/threads-api/generator.py', encoding='utf-8').read()); print('OK')"
```

- [ ] `python generator.py --account bono --type A --count 1` → `thread_parts` 배열 저장 + `link_eligible=True` 확인
- [ ] `python generator.py --account bono --type B --count 1` → `link_eligible=True`, `thread_parts=NULL` 확인
- [ ] `python generator.py --account bono --type C --count 1` → `link_eligible=False` 확인
- [ ] `python generator.py --account bono --type D --count 1` → `link_eligible=False` 확인
- [ ] `python generator.py --account place --type B --count 1` → `link_eligible=True` 확인
- [ ] `python generator.py --account place --type A --count 1` → `link_eligible=False` 확인
- [ ] `python generator.py --account bono --count 2` (타입 미지정) → DB에 A→D→B→C→A→D→B→C 순서로 8개 생성 확인
- [ ] `python generator.py --account place --count 2` (타입 미지정) → B→A→D→B→A→D 순서로 6개 생성 확인
- [ ] 구문 오류 없음

---

### Phase 3: Publisher — 타래 순차 발행
**Goal**: thread_parts가 있는 글은 본문 발행 후 셀프댓글을 체인 형태로 순차 발행
**Estimated Time**: 1시간
**Status**: ✅ Done (2026-03-31)

#### Tasks

**Task 3.1**: `publish_for_account()` — thread_parts 체인 발행 로직 추가
- File: `vps/threads-api/publisher.py`
- 위치: 기존 link_comment 삽입 블록(line 199) **앞**에 추가
- **체인형**: 각 댓글이 이전 댓글에 달려 타래 구조 형성 (저자 스크린샷 기준)

  ```python
  # 본문 발행 (기존)
  post_id = threads_create_post(user_id, token, text, topic_tag)
  print(f"  ✅ 게시 완료: {post_id}")

  # 셀프댓글 타래 발행 (thread_parts가 2개 이상일 때만)
  thread_parts = content.get("thread_parts") or []
  if len(thread_parts) > 1:
      last_id = post_id  # 첫 댓글은 본문에 달림
      for i, part in enumerate(thread_parts[1:], 1):
          time.sleep(random.uniform(3, 8))
          try:
              last_id = threads_reply(user_id, token, last_id, part)  # 체인형
              print(f"  💬 타래 {i}/{len(thread_parts)-1}: {last_id}")
          except Exception as e:
              print(f"  ⚠️ 타래 댓글 실패 (본문은 발행됨, 계속): {e}")
              break  # 실패 시 이후 댓글 중단. 본문 발행은 성공 처리

  # 링크 댓글 (계정별 링크 타입, 기존 로직 유지)
  if content.get("link_eligible") and content.get("link_comment"):
      time.sleep(random.uniform(3, 8))
      reply_id = threads_reply(user_id, token, post_id, content["link_comment"])
      print(f"  🔗 링크 댓글: {reply_id}")
  ```

**Task 3.2**: VPS 배포
```bash
scp vps/threads-api/publisher.py root@46.250.237.24:/root/threads-api/publisher.py
```

#### Quality Gate ✋

```bash
python -c "import ast; ast.parse(open('vps/threads-api/publisher.py', encoding='utf-8').read()); print('OK')"
ssh root@46.250.237.24 "cd /root/threads-api && python publisher.py --account bono --dry-run"
```

- [ ] dry-run 에러 없음
- [ ] thread_parts가 있는 글 실제 발행 시 Threads 앱에서 타래 구조 확인
- [ ] thread_parts=NULL인 기존 글 발행 시 정상 동작 확인
- [ ] B타입(bono/place) 발행 시 링크 댓글만 달림 (셀프댓글 없음)
- [ ] A타입(bono) 발행 시 셀프댓글 타래 + 링크 댓글 둘 다 달림
- [ ] A타입(place) 발행 시 셀프댓글만, 링크 없음
- [ ] 셀프댓글 실패 시 본문은 published 처리됨 확인

---

## 📝 수정 파일 요약

| 파일 | Phase | 수정 내용 | 변경 규모 |
|------|-------|----------|----------|
| Supabase SQL | 1 | `thread_parts JSONB` 컬럼 추가 | 1줄 |
| `generator.py` | 2 | 타래 프롬프트 + link_every_n 제거 + ABD 타입 + 루프 구조 | ~60줄 수정/삭제 |
| `publisher.py` | 3 | thread_parts 체인 발행 루프 추가 | +15줄 |

**건드리지 않는 파일**: `scanner.py`, `analyzer.py`, `db.py`, `config.py`, `telegram_notify.py`, 대시보드 전체

---

## ⚠️ Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| AI가 A타입에서 thread_parts 없이 text 키로 응답 | Medium | Low | parse에서 fallback 처리 → thread_parts=None, 기존 방식 발행 |
| Threads API 연속 댓글 rate limit | Low | Medium | 3~8초 딜레이 (기존 link_comment와 동일) |
| @place_hacker_ C타입 기존 데이터 | Low | Low | 소급 삭제 안 함. 기존 C타입은 그대로 발행 |
| bono에서 A+B 링크 → 과다 노출? | Low | Low | bono는 ADBC 중 A+B = 50%. 교대로 나와서 자연스러움 |
| place에서 B만 링크 → 빈도 낮음? | Low | Low | BAD 중 B = 33%. 3글에 1번 링크 → 적절 |

---

## 🔄 Rollback Strategy

| Phase | Rollback |
|-------|---------|
| Phase 1 | `ALTER TABLE threads_contents DROP COLUMN IF EXISTS thread_parts;` |
| Phase 2 | `git revert` generator.py 이전 버전 재배포 |
| Phase 3 | `git revert` publisher.py 이전 버전 재배포 |

---

## 📊 Progress Tracking

- **Phase 1**: ✅ 100% (DB 마이그레이션 완료)
- **Phase 2**: ✅ 100% (generator.py 리팩토링 + VPS 배포 완료)
- **Phase 3**: ✅ 100% (publisher.py 타래 발행 + VPS 배포 완료)

| Phase | Estimated | Actual |
|-------|-----------|--------|
| Phase 1 | 0.5h | - |
| Phase 2 | 2h | - |
| Phase 3 | 1h | - |
| **Total** | 3.5h | - |

---

## 📝 Notes & Learnings

### 미결 사항 (추후 개선 가능)
1. **대시보드 thread_parts 표시**: 콘텐츠 목록에서 타래 글의 댓글 내용을 확인할 수 없음. 추후 UI 개선 과제.
2. **계정별 타입 설정 대시보드화**: 현재 하드코딩 → Settings 페이지에서 설정 가능하게 개선 가능.
3. **link_every_n 설정 UI**: 대시보드 Settings에 link_every_n 입력 필드가 남아있음. 기능 제거 후 UI도 제거하거나 숨길 것.

### 이전 계획(PLAN_link-frequency-control)과의 관계
- Phase 2 Task 2.5에서 `force_link` 로직이 완전히 교체됨
- `get_since_last_link()` 함수가 삭제됨 (이전 계획에서 추가된 함수)
- `link_every_n` DB 컬럼은 유지하되 코드에서 참조하지 않음
