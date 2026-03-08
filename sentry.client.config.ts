import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // 개발 환경에서는 100%, 프로덕션에서는 10% 성능 추적
  tracesSampleRate: process.env.NODE_ENV === "development" ? 1.0 : 0.1,

  // 디버그 모드 비활성화
  debug: false,


  // 세션 리플레이: 에러 발생 시 100% 캡처, 일반 세션 10% 캡처
  replaysOnErrorSampleRate: 1.0,
  replaysSessionSampleRate: 0.1,

  integrations: [
    Sentry.replayIntegration({
      // 일반 세션에서는 DOM만 캡처 (개인정보 보호)
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],
});
