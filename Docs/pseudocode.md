# 맵타민 핵심 비즈니스 로직 수도코드

> **Version**: 1.2 (솔라피 연동 반영)  
> **Date**: 2026-02-13  
> **기반**: erd_design.md (v2.2), user_flow_design.md, 기존 서비스 코드

---

## 1. 실시간 진단 티켓 사용 로직

> **파일**: `src/lib/services/search-service.ts` (기존 `SearchService.executeSearch` 대체)  
> **Supabase RPC**: `deduct_ticket(platform)`, `refund_ticket(platform, search_id)`

```
함수 executeRealtimeDiagnosis(userId, platform, selectedKeywordIds[]):
  // selectedKeywordIds: 사용자가 선택한 관리 키워드 ID 목록
  // (user_flow_design.md L306: "관리 키워드 중 선택")

  // ── 0. 사용자 구독 정보 조회 ──
  subscription = DB.from('user_subscriptions')
    .select('plan_id, remaining_tickets_naver, remaining_tickets_google')
    .eq('user_id', userId)
    .single()

  IF subscription 없음 → 에러("구독 정보 없음")

  plan = DB.from('plans').select('*').eq('id', subscription.plan_id).single()
  IF plan 없음 → 에러("요금제 정보 없음")

  // ── 1. 채널 접근 권한 검증 ──
  IF platform == 'google' AND plan.channels != 'naver+google':
    에러("현재 요금제에서 구글 지도를 지원하지 않습니다. Premium으로 업그레이드하세요.")

  // ── 2. 티켓 잔량 확인 (차감 전 사전 검증) ──
  remainingTickets = (platform == 'naver')
    ? subscription.remaining_tickets_naver
    : subscription.remaining_tickets_google

  IF remainingTickets <= 0:
    에러("이번 달 실시간 진단 티켓이 모두 소진되었습니다.")

  // ── 3. 선택된 키워드 검증 (관리 키워드에 존재하는지) ──
  managedKeywords = DB.from('managed_keywords')
    .select('id, keyword')
    .eq('user_id', userId)
    .eq('platform', platform)

  IF managedKeywords.length == 0:
    에러("등록된 관리 키워드가 없습니다. 설정에서 키워드를 등록하세요.")

  // selectedKeywordIds가 없으면 전체 사용 (기본 동작)
  IF selectedKeywordIds가 비어있음:
    selectedKeywords = managedKeywords
  ELSE:
    selectedKeywords = managedKeywords.filter(k => selectedKeywordIds.includes(k.id))
    IF selectedKeywords.length != selectedKeywordIds.length:
      에러("선택한 키워드 중 관리 키워드에 없는 항목이 있습니다.")

  // ── 4. 관리 가게 조회 ──
  managedPlace = DB.from('managed_places')
    .select('*')
    .eq('user_id', userId)
    .eq('platform', platform)
    .single()

  IF managedPlace 없음:
    에러("등록된 가게가 없습니다. 설정에서 가게를 등록하세요.")

  // ── 5. 그리드 크기 계산 & 검증 ──
  gridSize = plan.max_grid_size  // 플랜에 따라 3, 5, 7
  gridDistance = 0.5  // 기본값 0.5km (향후 사용자 설정 가능하도록 확장 예정)
  gridPoints = generateGridPoints(managedPlace.lat, managedPlace.lng, gridSize, gridDistance)

  // ── 6. 티켓 차감 (Supabase RPC — 원자적) ──
  result = DB.rpc('deduct_ticket', { p_platform: platform })
  IF result.error:
    에러("티켓 차감 실패: " + result.error.message)

  // ── 7. 검색 레코드 생성 ──
  search = DB.from('searches').insert({
    user_id: userId,
    place_id: managedPlace.place_id,
    place_name: managedPlace.place_name,
    place_address: managedPlace.address,
    place_lat: managedPlace.lat,
    place_lng: managedPlace.lng,
    keywords: selectedKeywords.map(k => k.keyword),  // ← 선택된 키워드만
    grid_points: gridPoints,
    grid_distance: gridDistance,
    platform: platform,
    status: 'pending',
    report_type: 'realtime'
  }).select('id').single()

  // ── 8. 스크래퍼 실행 ──
  TRY:
    IF platform == 'naver':
      scraperResult = await NaverScraper.run(search.id, managedPlace, selectedKeywords, gridPoints)
    ELSE:
      scraperResult = await DataForSEO.run(search.id, managedPlace, selectedKeywords, gridPoints)

    DB.from('searches').update({ status: 'completed' }).eq('id', search.id)

    반환 { success: true, searchId: search.id }

  CATCH(error):
    // ── 9. 실패 시 티켓 환불 (Supabase RPC) ──
    refundResult = DB.rpc('refund_ticket', {
      p_platform: platform,
      p_search_id: search.id
    })

    IF refundResult.error:
      console.error("⚠️ CRITICAL: 티켓 환불 실패 — 관리자 알림 필요", refundResult.error)

    DB.from('searches').update({ status: 'failed' }).eq('id', search.id)

    에러("검색 실패: " + error.message + ". 티켓이 환불되었습니다.")
```

### 엣지 케이스

| 상황 | 처리 |
|------|------|
| 동시 요청 (race condition) | `deduct_ticket` RPC 내 `FOR UPDATE` 락으로 방지 |
| 스크래퍼 타임아웃 | 60초 타임아웃 → catch 블록에서 환불 처리 |
| 구독 기간 만료 상태 | 티켓 잔량 0이므로 Step 2에서 차단 |
| 부분 실패 (일부 키워드만 실패) | 전체 실패 처리 → 환불 (부분 성공은 불허) |

---

## 2. 30일 락 검증 로직

> **파일**: `src/lib/services/lock-validator.ts` (신규)  
> **구현 위치**: 앱 레벨 (DB RPC 아님)

```
함수 validateLockBeforeChange(userId, entityType, platform, newItems[]):
  // entityType: 'place' | 'keyword' | 'competitor'

  subscription = DB.from('user_subscriptions')
    .select('plan_id')
    .eq('user_id', userId).single()

  plan = DB.from('plans').select('*').eq('id', subscription.plan_id).single()

  // ── 1. 현재 등록된 항목 조회 ──
  테이블명 = entityType에 따라 'managed_places' | 'managed_keywords' | 'managed_competitors'

  existingItems = DB.from(테이블명)
    .select('*')
    .eq('user_id', userId)
    .eq('platform', platform)

  // ── 2. 락 상태 확인 ──
  now = 현재시각()

  FOR item IN existingItems:
    IF item.locked_until IS NOT NULL AND item.locked_until > now:
      남은일수 = (item.locked_until - now).일수()
      에러("변경 불가: " + item.이름 + "은(는) " + 남은일수 + "일 후 변경 가능합니다.")

  // ── 3. 수량 제한 검증 ──
  IF entityType == 'place':
    maxCount = 1  // 플랫폼당 1곳 고정
  ELIF entityType == 'keyword':
    maxCount = (platform == 'naver') ? plan.max_keywords_naver : plan.max_keywords_google
  ELIF entityType == 'competitor':
    maxCount = plan.max_competitors

  IF newItems.length > maxCount:
    에러("현재 요금제에서 최대 " + maxCount + "개까지 등록 가능합니다.")

  // ── 4. Place 전용: Premium 락 면제 ──
  IF entityType == 'place' AND plan.place_lock == false:
    locked_until = NULL  // Premium은 가게 변경 시 락 없음
  ELSE:
    locked_until = now + 30일

  // ── 5. 경쟁사 일괄 락 (Premium 특별 규칙) ──
  IF entityType == 'competitor' AND newItems.length > 0:
    locked_until = now + 30일
    // 신규 + 기존 모든 경쟁사에 동일한 locked_until 설정
    // → 30일 후 전체 슬롯 일괄 변경 가능

  반환 { valid: true, locked_until: locked_until }
```

### 등록/변경 실행 함수

```
함수 registerItems(userId, entityType, platform, items[], locked_until):

  테이블명 = entityType에 따라 결정

  // ── 기존 항목 삭제 (락 해제된 것만) ──
  DB.from(테이블명)
    .delete()
    .eq('user_id', userId)
    .eq('platform', platform)
    .or('locked_until.is.null, locked_until.lte.' + 현재시각())

  // ── 신규 항목 삽입 ──
  FOR item IN items:
    DB.from(테이블명).insert({
      user_id: userId,
      platform: platform,
      ...item의 속성들,  // place_id, place_name, keyword 등
      locked_until: locked_until
    })

  // ── 경쟁사 일괄 락: 기존 항목도 갱신 ──
  IF entityType == 'competitor':
    DB.from('managed_competitors')
      .update({ locked_until: locked_until })
      .eq('user_id', userId)
      .eq('platform', platform)
```

### 엣지 케이스

| 상황 | 처리 |
|------|------|
| 일부만 락 해제된 상태 | 모든 항목의 locked_until > now이면 변경 불가 |
| Premium 경쟁사 0→1 등록 | 1개만 등록해도 전체 슬롯에 locked_until 동일 설정 |
| 경쟁사 슬롯 미등록 분 | 30일 후 나머지 슬롯 추가 등록 가능 |
| Premium→Pro 다운그레이드 후 | 초과 경쟁사는 `is_active=false`, 락은 유지 |

---

## 3. 웰컴 리포트 자동 실행 로직

> **트리거 시점**: 온보딩 완료 직후 (STEP 4 스케줄 설정 완료 시)  
> **파일**: `src/lib/services/welcome-report.ts` (신규)

```
함수 executeWelcomeReport(userId):

  // ── 0. 중복 실행 방지 (원자적 락) ──
  // Race condition 방지: SELECT FOR UPDATE로 원자적 체크
  lockResult = DB.rpc('try_lock_welcome_report', { p_user_id: userId })
  // RPC 내부: SELECT welcome_report_sent FROM user_subscriptions
  //           WHERE user_id = p_user_id FOR UPDATE;
  //           IF already sent → RETURN false;
  //           ELSE → UPDATE SET welcome_report_sent = true; RETURN true;

  IF lockResult == false:
    로그("웰컴 리포트 이미 발송됨 또는 진행 중 — 스킵")
    반환

  subscription = DB.from('user_subscriptions')
    .select('plan_id, onboarding_completed')
    .eq('user_id', userId).single()

  IF subscription.onboarding_completed == false:
    // 락 해제 (welcome_report_sent를 다시 false로)
    DB.from('user_subscriptions')
      .update({ welcome_report_sent: false })
      .eq('user_id', userId)
    에러("온보딩이 완료되지 않았습니다.")

  plan = DB.from('plans').select('*').eq('id', subscription.plan_id).single()

  // ── 1. 등록 정보 조회 ──
  플랫폼목록 = (plan.channels == 'naver+google') ? ['naver', 'google'] : ['naver']
  successCount = 0
  totalAttempts = 0

  FOR platform IN 플랫폼목록:
    place = DB.from('managed_places')
      .select('*')
      .eq('user_id', userId)
      .eq('platform', platform)
      .single()

    IF place 없음:
      CONTINUE  // 해당 플랫폼 미등록 → 스킵

    keywords = DB.from('managed_keywords')
      .select('keyword')
      .eq('user_id', userId)
      .eq('platform', platform)

    IF keywords.length == 0:
      CONTINUE

    totalAttempts++

    // ── 2. 무료 검색 실행 (티켓 미차감!) ──
    gridSize = plan.max_grid_size
    gridDistance = 0.5  // 기본값
    gridPoints = generateGridPoints(place.lat, place.lng, gridSize, gridDistance)

    search = DB.from('searches').insert({
      user_id: userId,
      place_id: place.place_id,
      place_name: place.place_name,
      place_address: place.address,
      place_lat: place.lat,
      place_lng: place.lng,
      keywords: keywords.map(k => k.keyword),
      grid_points: gridPoints,
      grid_distance: gridDistance,
      platform: platform,
      status: 'pending',
      report_type: 'welcome'
    }).select('id').single()

    TRY:
      // 스크래퍼 실행
      IF platform == 'naver':
        await NaverScraper.run(search.id, place, keywords, gridPoints)
      ELSE:
        await DataForSEO.run(search.id, place, keywords, gridPoints)

      DB.from('searches').update({ status: 'completed' }).eq('id', search.id)

      // ── 3. 카카오 알림톡 발송 ──
      await sendKakaoNotification(userId, {
        type: 'welcome',
        searchId: search.id,
        placeName: place.place_name,
        resultUrl: SITE_URL + '/search/' + search.id
      })

      // 알림 로그 기록
      DB.from('notification_logs').insert({
        user_id: userId,
        search_id: search.id,
        type: 'welcome',
        status: 'sent',
        sent_at: 현재시각()
      })

      // 감사 추적: ticket_ledger에 웰컴 보너스 기록
      DB.from('ticket_ledger').insert({
        user_id: userId,
        platform: platform,
        amount: 0,
        type: 'welcome_bonus',
        description: '웰컴 리포트 (무료)',
        search_id: search.id
      })

      successCount++

    CATCH(error):
      DB.from('searches').update({ status: 'failed' }).eq('id', search.id)

      DB.from('notification_logs').insert({
        user_id: userId,
        search_id: search.id,
        type: 'welcome',
        status: 'failed',
        error_message: error.message
      })

      console.error("웰컴 리포트 실패 (" + platform + "):", error)

  // ── 4. 전체 실패 시 재시도 가능하도록 플래그 복원 ──
  IF totalAttempts > 0 AND successCount == 0:
    // 모든 플랫폼 실패 → welcome_report_sent를 false로 복원 → 재시도 가능
    DB.from('user_subscriptions')
      .update({ welcome_report_sent: false })
      .eq('user_id', userId)
    로그("⚠️ 웰컴 리포트 전체 실패 — 재시도 가능 상태로 복원")
  // ELSE: 1개라도 성공 → welcome_report_sent = true 유지 (Step 0에서 이미 설정)
```

### 엣지 케이스

| 상황 | 처리 |
|------|------|
| 네이버 성공 + 구글 실패 (Premium) | 네이버만 발송, 구글은 실패 로그. `welcome_report_sent` = true 유지 |
| 모든 플랫폼 실패 | `welcome_report_sent = false`로 복원 → 재시도 가능 |
| 카카오 토큰 만료 | 알림 발송 실패 → `notification_logs`에 `failed` 기록 |
| 동시 호출 (race condition) | RPC `try_lock_welcome_report`로 원자적 락 → 중복 방지 |

---

## 4. 주간 자동 검색 + 카톡 발송 로직

> **트리거**: Vercel CRON 또는 Supabase pg_cron (매 1시간 실행)  
> **파일**: `src/lib/services/schedule-manager.ts` (기존 대체)

```
함수 runWeeklySearches():
  // KST 기준 현재 요일/시간
  nowKST = 현재시각_KST()
  currentDay = nowKST.요일()       // 0(일) ~ 6(토)
  currentTime = nowKST.시간형식()  // "09:00:00"

  로그("[WeeklySearch] KST 요일=" + currentDay + " 시간=" + currentTime)

  // ── 1. 해당 시간대 스케줄 조회 ──
  schedules = DB.from('search_schedules')
    .select('*')
    .eq('is_active', true)
    .eq('crawling_day', currentDay)
    .eq('crawling_time', currentTime)

  IF schedules.length == 0:
    로그("실행할 스케줄 없음")
    반환

  // ── 2. 각 스케줄 실행 ──
  FOR schedule IN schedules:

    TRY:
      // 2-a. 관리 가게 확인 (삭제됐을 수 있음)
      place = DB.from('managed_places')
        .select('*')
        .eq('user_id', schedule.user_id)
        .eq('platform', schedule.platform)
        .eq('place_id', schedule.place_id)
        .single()

      IF place 없음:
        로그("가게 삭제됨 — 스케줄 비활성화: " + schedule.id)
        DB.from('search_schedules')
          .update({ is_active: false })
          .eq('id', schedule.id)
        CONTINUE

      // 2-b. 관리 키워드 조회 (최신 상태)
      keywords = DB.from('managed_keywords')
        .select('keyword')
        .eq('user_id', schedule.user_id)
        .eq('platform', schedule.platform)

      IF keywords.length == 0:
        로그("키워드 없음 — 스킵: " + schedule.id)
        CONTINUE

      // 2-c. 검색 레코드 생성 (티켓 미차감 — 주간 리포트는 무료)
      searchId = null  // CATCH 블록 안전 참조를 위해 미리 선언

      search = DB.from('searches').insert({
        user_id: schedule.user_id,
        place_id: place.place_id,
        place_name: place.place_name,
        place_address: place.address,
        place_lat: place.lat,
        place_lng: place.lng,
        keywords: keywords.map(k => k.keyword),
        grid_points: schedule.grid_config,
        grid_distance: schedule.grid_distance,
        platform: schedule.platform,
        status: 'pending',
        report_type: 'weekly'
      }).select('id').single()

      searchId = search.id  // INSERT 성공 시 ID 저장

      // 2-d. 스크래퍼 실행
      IF schedule.platform == 'naver':
        await NaverScraper.run(searchId, place, keywords, schedule.grid_config)
      ELSE:
        await DataForSEO.run(searchId, place, keywords, schedule.grid_config)

      DB.from('searches').update({ status: 'completed' }).eq('id', searchId)
      DB.from('search_schedules')
        .update({ last_run_at: 현재시각() })
        .eq('id', schedule.id)

      // ── 3. 알림 발송 처리 ──
      notifSchedule = DB.from('notification_schedules')
        .select('*')
        .eq('search_schedule_id', schedule.id)
        .single()

      IF notifSchedule 없음 OR notifSchedule.is_immediate == true:
        // 즉시 발송
        await sendKakaoWeeklyReport(schedule.user_id, searchId, place.place_name)
      ELSE:
        // 예약 발송 큐에 등록 (notification_schedule_id 포함)
        DB.from('notification_logs').insert({
          user_id: schedule.user_id,
          search_id: searchId,
          type: 'weekly',
          status: 'pending'
        })

    CATCH(error):
      console.error("[WeeklySearch] 실패:", schedule.id, error.message)
      IF searchId != null:
        DB.from('searches').update({ status: 'failed' }).eq('id', searchId)
      // 주간 리포트는 티켓 미차감이므로 환불 불필요


함수 sendKakaoWeeklyReport(userId, searchId, placeName):
  // 카카오 알림톡 발송
  TRY:
    resultUrl = SITE_URL + '/search/' + searchId
    await KakaoAlimtalk.send(userId, {
      templateCode: 'WEEKLY_REPORT',
      placeName: placeName,
      resultUrl: resultUrl
    })

    DB.from('notification_logs').insert({
      user_id: userId,
      search_id: searchId,
      type: 'weekly',
      status: 'sent',
      sent_at: 현재시각()
    })

  CATCH(error):
    DB.from('notification_logs').insert({
      user_id: userId,
      search_id: searchId,
      type: 'weekly',
      status: 'failed',
      error_message: error.message
    })


함수 dispatchPendingNotifications():
  // 별도 CRON (매 1시간): 예약된 알림 발송
  nowKST = 현재시각_KST()
  currentDay = nowKST.요일()
  currentTime = nowKST.시간형식()

  // 1. 현재 시간에 발송해야 할 notification_schedules 조회
  activeNotifSchedules = DB.from('notification_schedules')
    .select('user_id, search_schedule_id')
    .eq('is_immediate', false)
    .eq('notify_day', currentDay)
    .eq('notify_time', currentTime)

  // 2. 해당 스케줄에 연결된 pending 알림 로그 조회
  FOR ns IN activeNotifSchedules:
    pendingLogs = DB.from('notification_logs')
      .select('*')
      .eq('user_id', ns.user_id)
      .eq('status', 'pending')
      .eq('type', 'weekly')

    FOR log IN pendingLogs:
      // 해당 search의 place_name 조회
      search = DB.from('searches').select('place_name').eq('id', log.search_id).single()
      await sendKakaoWeeklyReport(log.user_id, log.search_id, search.place_name)
```

### 엣지 케이스

| 상황 | 처리 |
|------|------|
| 주간 리포트와 실시간 진단 동시 실행 | `report_type`으로 구분, 별도 프로세스 |
| 스케줄 미설정 사용자 | `search_schedules` 자체가 없으므로 자연스럽게 스킵 |
| CRON 실행 누락 (서버 장애) | `last_run_at` 비교로 감지 가능, 관리자 대시보드에서 수동 트리거 |
| 가게 삭제 후 스케줄 잔존 | Step 2-a에서 자동 비활성화 |

---

## 5. 플랜별 접근 제한 로직

> **파일**: `src/lib/services/plan-gate.ts` (신규)  
> **호출 위치**: 각 API route의 앞단에서 미들웨어처럼 사용

```
함수 getPlanGate(userId):
  subscription = DB.from('user_subscriptions')
    .select('plan_id')
    .eq('user_id', userId).single()

  IF subscription 없음 → 에러("구독 정보 없음")

  plan = DB.from('plans').select('*').eq('id', subscription.plan_id).single()
  IF plan 없음 → 에러("요금제 정보 없음")

  반환 plan


함수 checkChannelAccess(plan, platform):
  IF platform == 'google' AND plan.channels != 'naver+google':
    에러("구글 지도는 프리미엄 플랜에서만 사용 가능합니다.")


함수 checkGridSize(plan, requestedSize):
  IF requestedSize > plan.max_grid_size:
    에러("현재 플랜은 최대 " + plan.max_grid_size + "x" + plan.max_grid_size + " 그리드를 지원합니다.")


함수 checkKeywordLimit(plan, platform, currentCount, addCount):
  maxKeywords = (platform == 'naver') ? plan.max_keywords_naver : plan.max_keywords_google

  IF currentCount + addCount > maxKeywords:
    에러("키워드는 최대 " + maxKeywords + "개까지 등록 가능합니다. (현재 " + currentCount + "개)")


함수 checkCompetitorLimit(plan, currentCount, addCount):
  IF plan.max_competitors == 0:
    에러("현재 플랜에서는 경쟁사 분석을 지원하지 않습니다. Pro 이상으로 업그레이드하세요.")

  IF currentCount + addCount > plan.max_competitors:
    에러("경쟁사는 최대 " + plan.max_competitors + "곳까지 등록 가능합니다.")


함수 checkTicketAvailability(subscription, platform):
  remaining = (platform == 'naver')
    ? subscription.remaining_tickets_naver
    : subscription.remaining_tickets_google

  반환 {
    available: remaining > 0,
    remaining: remaining,
    message: remaining > 0
      ? "남은 티켓: " + remaining + "개"
      : "이번 달 티켓이 소진되었습니다."
  }
```

### 사용 예시 (API Route)

```
// src/app/api/naver/search/route.ts
async POST(request):
  plan = await getPlanGate(userId)
  checkChannelAccess(plan, 'naver')
  checkGridSize(plan, requestedGridSize)
  // ... 검색 실행
```

---

## 6. 경쟁사 비교 데이터 추출 로직

> **구현 위치**: 프론트엔드 (서버 컴포넌트 또는 클라이언트 컴포넌트)  
> **추가 API 호출 없음** — 기존 `search_results.competitors` 활용

```
함수 getCompetitorComparison(searchResults[], competitorPlaceId):
  // searchResults: 특정 키워드의 모든 그리드 포인트 결과

  comparisonData = []

  FOR result IN searchResults:
    myRank = result.rank  // 내 가게 순위 (없으면 null)

    // competitors 배열에서 선택된 경쟁사 찾기
    competitor = result.competitors.find(c => c.place_id == competitorPlaceId)
    competitorRank = competitor ? competitor.rank : null

    // ── 승/패 판정 ──
    IF myRank == null AND competitorRank == null:
      verdict = 'DRAW'       // 둘 다 미노출
    ELIF myRank == null:
      verdict = 'LOSE'       // 나만 미노출
    ELIF competitorRank == null:
      verdict = 'WIN'        // 경쟁사만 미노출
    ELIF myRank < competitorRank:
      verdict = 'WIN'        // 내가 더 상위
    ELIF myRank > competitorRank:
      verdict = 'LOSE'       // 내가 더 하위
    ELSE:
      verdict = 'DRAW'       // 동일 순위

    comparisonData.push({
      gridIndex: result.grid_index,
      gridLat: result.grid_lat,
      gridLng: result.grid_lng,
      myRank: myRank,
      competitorRank: competitorRank,
      verdict: verdict        // 'WIN' | 'LOSE' | 'DRAW'
    })

  // ── 요약 통계 ──
  winCount = comparisonData.filter(d => d.verdict == 'WIN').length
  loseCount = comparisonData.filter(d => d.verdict == 'LOSE').length
  drawCount = comparisonData.filter(d => d.verdict == 'DRAW').length
  totalPoints = comparisonData.length

  반환 {
    points: comparisonData,
    summary: {
      totalPoints: totalPoints,
      wins: winCount,
      losses: loseCount,
      draws: drawCount,
      winRate: Math.round(winCount / totalPoints * 100) + '%'
    }
  }


함수 getRegisteredCompetitors(userId, platform):
  // 드롭다운에 표시할 등록된 경쟁사 목록 조회
  competitors = DB.from('managed_competitors')
    .select('place_id, place_name')
    .eq('user_id', userId)
    .eq('platform', platform)

  반환 competitors
```

### 프론트엔드 렌더링 분기

```
IF plan.max_competitors == 0:
  // Starter: 경쟁사 분석 섹션 숨김
  표시하지_않음()

ELIF plan.max_competitors == 1:
  // Pro: 드롭다운 없이 자동 표시
  competitor = registeredCompetitors[0]
  comparisonData = getCompetitorComparison(results, competitor.place_id)
  렌더링(comparisonData)

ELSE:
  // Premium: 드롭다운으로 경쟁사 선택
  selectedCompetitor = registeredCompetitors[0]  // 기본값: 첫 번째
  드롭다운(registeredCompetitors, onChange: (selected) => {
    comparisonData = getCompetitorComparison(results, selected.place_id)
    렌더링(comparisonData)
  })
```

### 히트맵 색상 매핑

```
함수 getMarkerColor(verdict):
  SWITCH verdict:
    'WIN'  → { color: '#22c55e', text: '승', icon: '🟢' }
    'LOSE' → { color: '#ef4444', text: '패', icon: '🔴' }
    'DRAW' → { color: '#9ca3af', text: '무', icon: '⚪' }
```

---

## 7. 주간 순위 변동 계산 로직

> **구현 위치**: API route (서버) + Recharts (클라이언트)  
> **핵심**: `report_type = 'weekly'`만 필터, 실시간 진단 결과 제외

```
함수 getWeeklyTrendData(userId, platform, weeks = 12):
  // ── 1. 주간 리포트 검색 + 결과를 한번에 조회 (N+1 방지) ──
  cutoffDate = 현재시각() - (weeks * 7일)

  // JOIN 쿼리: searches + search_results를 한 번에
  searchesWithResults = DB.from('searches')
    .select('id, created_at, search_results(keyword, rank)')
    .eq('user_id', userId)
    .eq('platform', platform)
    .eq('report_type', 'weekly')     // ← 핵심: weekly만!
    .eq('status', 'completed')
    .gte('created_at', cutoffDate)
    .order('created_at', ascending: true)

  IF searchesWithResults.length == 0:
    반환 { keywords: [], weeks: [], data: [] }

  // ── 2. 각 검색의 결과에서 키워드별 평균 순위 계산 ──
  trendMap = {}  // { keyword: [ { week: '2/3주차', avgRank: 3.2 }, ... ] }

  FOR search IN searchesWithResults:
    weekLabel = 주차라벨(search.created_at)

    results = search.search_results  // ← JOIN으로 이미 가져옴 (추가 쿼리 없음)

    // 키워드별 그룹핑
    keywordGroups = results.groupBy('keyword')

    FOR keyword, gridResults IN keywordGroups:
      // 순위가 있는 그리드 포인트만 필터 (미노출 = null 제외)
      rankedResults = gridResults.filter(r => r.rank != null AND r.rank > 0)

      IF rankedResults.length == 0:
        avgRank = null  // 해당 주 전체 미노출
      ELSE:
        avgRank = rankedResults.map(r => r.rank).평균()
        avgRank = Math.round(avgRank * 10) / 10  // 소수점 1자리

      IF trendMap[keyword] == undefined:
        trendMap[keyword] = []

      trendMap[keyword].push({
        week: weekLabel,
        searchDate: search.created_at,
        avgRank: avgRank,
        totalPoints: gridResults.length,
        rankedPoints: rankedResults.length
      })

  // ── 3. 응답 포맷팅 (Recharts용) ──
  allKeywords = Object.keys(trendMap)
  allWeeks = trendMap의 모든 weekLabel 중복 제거하여 정렬

  // Recharts 데이터 형식으로 변환
  chartData = []
  FOR week IN allWeeks:
    row = { week: week }
    FOR keyword IN allKeywords:
      weekData = trendMap[keyword].find(d => d.week == week)
      row[keyword] = weekData ? weekData.avgRank : null
    chartData.push(row)

  반환 {
    keywords: allKeywords,
    chartData: chartData
    // chartData 예시:
    // [
    //   { week: '2/3주차', '강남 맛집': 3.2, '강남 카페': 5.1 },
    //   { week: '2/10주차', '강남 맛집': 2.8, '강남 카페': 4.7 },
    //   ...
    // ]
  }


함수 주차라벨(date):
  month = date.월()
  weekOfMonth = Math.ceil(date.일() / 7)
  반환 month + '/' + (weekOfMonth * 7 - 6) + '주차'
  // → "2/3주차" (2월 첫째주 = 1~7일 중 기준일)
  // 또는 간단하게: "M/D" 형식으로 해당 주의 월요일 날짜
```

### Recharts 렌더링 (클라이언트)

```jsx
<LineChart data={chartData}>
  <XAxis dataKey="week" />
  <YAxis reversed={true} domain={[1, 'auto']} />  // 순위는 낮을수록 좋음
  <Tooltip />
  <Legend />
  
  {keywords.map(keyword => (
    <Line
      key={keyword}
      type="monotone"
      dataKey={keyword}
      stroke={색상팔레트[index]}
      connectNulls={false}    // 미노출 주차는 끊김 표시
    />
  ))}
</LineChart>
```

### 엣지 케이스

| 상황 | 처리 |
|------|------|
| 첫 주 (데이터 1개) | 점 하나만 표시, 선 없음 |
| 키워드 변경 (30일 후) | 새 키워드는 새로운 라인으로 추가, 이전 키워드 라인은 그대로 유지 |
| 전체 미노출 주차 | `avgRank = null` → 차트에서 끊김(gap) 표시 |
| 실시간 진단 결과 혼입 방지 | `report_type = 'weekly'` 필터로 완벽 분리 |
| 스케줄 누락 (해당 주 미실행) | 해당 주차 데이터 자체가 없으므로 자연스럽게 gap 처리 |

---

## 부록: 유틸리티 함수

```
함수 generateGridPoints(centerLat, centerLng, gridSize, distance = 0.5, unit = 'km'):
  // gridSize: 3, 5, 7 → 정사각형 그리드 생성
  // distance: 각 포인트 간 거리
  // 반환: GridPoint[] (그리드 인덱스, 위도, 경도)

  points = []
  offset = Math.floor(gridSize / 2)  // 3→1, 5→2, 7→3

  FOR row = 0 TO gridSize-1:
    FOR col = 0 TO gridSize-1:
      latOffset = (row - offset) * distance * (1/111.32)  // 약 111.32km = 1도
      lngOffset = (col - offset) * distance * (1/(111.32 * cos(centerLat)))

      points.push({
        index: row * gridSize + col,
        lat: centerLat + latOffset,
        lng: centerLng + lngOffset,
        isCenter: (row == offset AND col == offset)
      })

  반환 points


함수 sendKakaoNotification(userId, params):
  // ── 솔라피(Solapi) SDK를 통한 카카오 알림톡 발송 ──
  // 의존성: npm install solapi
  // 환경 변수: SOLAPI_API_KEY, SOLAPI_API_SECRET
  // 환경 변수: SOLAPI_PFID (카카오 채널 연동 후 발급되는 발신프로필 ID)
  // 환경 변수: KAKAO_TEMPLATE_WELCOME, KAKAO_TEMPLATE_WEEKLY

  import { SolapiMessageService } from 'solapi'
  messageService = new SolapiMessageService(
    process.env.SOLAPI_API_KEY,
    process.env.SOLAPI_API_SECRET
  )

  // ── 1. 사용자 전화번호 조회 (user_subscriptions.phone) ──
  subscription = DB.from('user_subscriptions')
    .select('phone')
    .eq('user_id', userId).single()

  IF subscription.phone 없음 OR subscription.phone == '':
    에러("전화번호 미등록 — 알림톡 발송 불가. 설정에서 전화번호를 등록하세요.")

  // ── 2. 템플릿 코드 결정 ──
  templateId = (params.type == 'welcome')
    ? process.env.KAKAO_TEMPLATE_WELCOME
    : process.env.KAKAO_TEMPLATE_WEEKLY

  // ── 3. 솔라피 알림톡 발송 ──
  TRY:
    result = await messageService.send({
      to: subscription.phone,        // 수신자 전화번호 (01012345678)
      from: process.env.SOLAPI_SENDER_NUMBER,  // 발신 번호
      kakaoOptions: {
        pfId: process.env.SOLAPI_PFID,          // 발신프로필 ID
        templateId: templateId,                  // 심사 승인된 템플릿 코드
        variables: {                             // 템플릿 치환 변수
          '#{가게명}': params.placeName,
          '#{리포트URL}': params.resultUrl
        }
      }
    })

    로그("알림톡 발송 성공: " + result.statusCode)

  CATCH(error):
    // 솔라피 발송 실패 시 에러 전파 (호출한 쪽에서 notification_logs에 기록)
    에러("알림톡 발송 실패: " + error.message)
```
