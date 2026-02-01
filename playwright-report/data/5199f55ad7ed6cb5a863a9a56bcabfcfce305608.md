# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e2]:
    - banner [ref=e3]:
      - generic [ref=e5]:
        - link "RankTracker" [ref=e6] [cursor=pointer]:
          - /url: /dashboard
          - img "RankTracker" [ref=e7]
        - generic [ref=e9]:
          - navigation [ref=e10]:
            - link "대시보드" [ref=e11] [cursor=pointer]:
              - /url: /dashboard
              - img [ref=e12]
              - text: 대시보드
            - button "내 순위 검색" [ref=e16]:
              - img [ref=e17]
              - text: 내 순위 검색
              - img [ref=e20]
            - button "경쟁사 순위 검색" [ref=e23]:
              - img [ref=e24]
              - text: 경쟁사 순위 검색
              - img [ref=e27]
            - button "자동 검색 예약" [ref=e30]:
              - img [ref=e31]
              - text: 자동 검색 예약
              - img [ref=e35]
            - link "설정" [ref=e37] [cursor=pointer]:
              - /url: /settings
              - img [ref=e38]
              - text: 설정
          - generic [ref=e43]: e2e-dash-1769917047868@example.com
    - main [ref=e44]
  - button "Open Next.js Dev Tools" [ref=e90] [cursor=pointer]:
    - img [ref=e91]
  - alert [ref=e94]
```