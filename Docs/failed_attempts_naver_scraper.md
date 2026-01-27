# Failed Attempts: Naver Map Location-Based Scraping

이 문서는 네이버 지도에서 특정 위/경도 좌표를 강제로 설정하여 검색 순위를 추적하기 위해 시도했던 방법들과 실패 원인을 정리합니다.

---

## 1. Local Storage 좌표 주입 방식 (PC)

네이버 지도가 클라이언트 측에 저장하는 위치 정보를 조작하여 위치를 변경하려던 시도.

### 수도코드 (Pseudo-Code)
```typescript
FUNCTION SCRAPE_V1(lat, lng):
    browser = LAUNCH()
    page = browser.NEW_PAGE()
    
    // 1. 네이버 지도 접속
    page.GOTO('https://map.naver.com/p')
    
    // 2. Local Storage 조작
    DATA = JSON.STRINGIFY({ lng: lng, lat: lat })
    page.EVALUATE(() => {
        localStorage.setItem('NM_INITIAL_LOCATION_KEY', DATA)
        // 기타 관련 키들도 시도
    })
    
    // 3. 페이지 새로고침 또는 검색 이동
    page.GOTO(`https://map.naver.com/p/search/${keyword}`)
    
    // 4. 결과 파싱
    PARSE_RESULTS()
```

### 실패 원인 ❌
- **서버 우선 정책**: 네이버 지도는 페이지 로드 시 `localStorage` 값보다 서버에서 판단한 위치(IP 기반)를 우선시함.
- **초기화**: 페이지가 새로고침되면 서버 데이터로 덮어씌워짐.

---

## 2. Geolocation API 스푸핑 방식 (PC)

브라우저의 `navigator.geolocation` API를 가로채서 가짜 좌표를 반환하도록 하는 방식.

### 수도코드 (Pseudo-Code)
```typescript
FUNCTION SCRAPE_V2(lat, lng):
    // 1. 브라우저 컨텍스트에 Geolocation 권한 및 좌표 설정
    context = browser.NEW_CONTEXT({
        geolocation: { latitude: lat, longitude: lng },
        permissions: ['geolocation']
    })
    
    page = context.NEW_PAGE()
    
    // 2. 네이버 지도 접속
    page.GOTO('https://map.naver.com/p')
    
    // 3. "현위치" 버튼 클릭 시도 (선택적)
    // page.CLICK('.btn_my_location')
    
    // 4. 검색
    page.TYPE(keyword) + ENTER
```

### 실패 원인 ❌
- **PC 브라우저 무시**: PC 웹 버전의 네이버 지도는 HTML5 Geolocation API를 적극적으로 사용하지 않음.
- **IP 기반 우선**: 여전히 IP 주소 기반의 대략적인 위치(ISP 위치)가 우선 적용됨.

---

## 3. 설정 페이지 UI 조작 방식 (PC)

네이버 지도의 "설정 > 내 위치" 메뉴를 스크립트로 직접 조작하려던 시도.

### 수도코드 (Pseudo-Code)
```typescript
FUNCTION SCRAPE_V_UI(lat, lng):
    page.GOTO('https://map.naver.com/p/entry/settings')
    
    // 1. 지도 객체(map instance) 찾기
    page.EVALUATE(() => {
        // window.naver.maps.map 등의 객체 탐색
        mapInstance = FIND_MAP_INSTANCE()
        mapInstance.setCenter(lat, lng)
    })
```

### 실패 원인 ❌
- **객체 숨김/난독화**: 네이버 지도는 외부에서 접근 가능한 지도 인스턴스를 전역 변수(`window` 객체 등)에 노출하지 않음.
- **보안 차단**: 콘솔/스크립트로 강제 조작 시 "페이지를 열 수 없음" 에러 페이지로 리다이렉트되거나 차단됨.

---

## 4. 쿠키 주입 방식 (BUC / NMAP_CJ)

위치 설정 시 브라우저 쿠키가 변경되는 것을 포착하여, 이를 역이용하려던 시도.

### 관찰 내용
- 사용자가 위치를 수동으로 변경하면 `BUC`라는 이름의 쿠키 값이 해시 형태(예: `718...`)로 변경됨을 확인.
- 다른 개발자 조언에 따르면 `NMAP_CJ`, `NV_WETR_LOCATION` 등의 쿠키도 관련이 있음.

### 시도 및 실패 원인 ❌
- **암호화/토큰화**: `BUC` 값은 단순 좌표가 아니라 서버에서 발급한 암호화된 세션 토큰으로 추정됨. 임의로 생성하거나 조작할 수 없음.
- **복잡한 의존성**: 단일 쿠키만으로는 작동하지 않으며, 여러 쿠키가 상호 검증되는(Signature) 구조로 보임.
- **생성 로직 부재**: 해당 쿠키를 생성하려면 결국 프론트엔드에서 "위치 저장" 버튼을 눌러야 하는데, 이는 자동화 탐지에 매우 취약함.

---

## 5. 모바일 웹 Geolocation 스푸핑 (Mobile)

모바일 웹(`m.map.naver.com`)이 GPS 정보를 더 잘 받아줄 것이라는 가설 하에 시도.

### 수도코드 (Pseudo-Code)
```typescript
FUNCTION SCRAPE_V3_MOBILE(lat, lng):
    // 1. 모바일 디바이스 에뮬레이션 (iPhone 13)
    iphone13 = devices['iPhone 13']
    context = browser.NEW_CONTEXT({
        ...iphone13,
        geolocation: { latitude: lat, longitude: lng },
        permissions: ['geolocation']
    })
    
    // 2. 모바일 웹 접속
    page.GOTO('https://m.map.naver.com')
    
    // 3. 검색창 상호작용 (JS 강제 실행)
    // 터치/탭 이벤트가 잘 안 먹혀서 JS로 직접 value 설정
    page.EVALUATE(() => {
        input = document.querySelector('input')
        input.value = keyword
        form.submit()
    })
    
    // 4. 모바일 결과 파싱
    PARSE_MOBILE_RESULTS() // PC와 다른 셀렉터 사용
```

### 실패 원인 ❌
- **여전한 IP 우선**: 모바일 에뮬레이션 상태에서도 브라우저가 제공하는 가짜 좌표보다 네이버 서버가 인식하는 IP 위치(일산/서울시청 등)가 우선됨.
- **파싱은 성공했으나**: 검색 결과 데이터는 잘 가져오지만, 위치가 사용자의 실제 물리적 위치(또는 데이터센터 위치)로 고정됨.

---

## 최종 결론 및 권장 사항

**네이버 지도의 위치 기반 검색은 클라이언트 사이드(브라우저) 조작만으로는 불가능합니다.**

### 유일한 해결책:
[프로세스]

1. 각 그리드들의 좌표 계산

2. 네이버 지도 열기, 우선 지도 최대 zoom-in하기

3. 검색창에 각 그리드 좌표 입력하고 검색.

5. 그러면 그 좌표의 장소가 검색됨. 바로 지도 최대로 zoom-in (그래야 검색했을 때 장소 결과가 제대로 나옴. zoom-out인 상태로 검색하면 그 지역 전체 기준으로 검색되기 때문에 부정확함) zoom-in 할 때 절대 마우스 휠로 하면 안되고, 키보드의 '+'를 누르거나, 지도에 있는 zoom-in/out UI 사용해서 해야함. 마우스 휠로 하면 마우스가 위치한 곳 중심으로 확대가 되기 때문에 부정확해진다.

6. 그대로 다시 검색창에 검색 키워드 검색 (예: '쌀국수')


7. 검색 결과 추출

8. 그 다음 바로 다음 그리드 위치 검색창에 입력하고 검색 (예시: 37.5295 126.9645)

9. 지도 최대로 zoom-in (이 zoom-in은 매번 반복되어야함. 새로 검색하면 최대 zoom-in이 풀리기 때문이다.)
