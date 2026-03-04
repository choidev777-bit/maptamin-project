import * as Sentry from "@sentry/nextjs";

Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

    // 개발 환경에서는 100%, 프로덕션에서는 10% 성능 추적
    tracesSampleRate: process.env.NODE_ENV === "development" ? 1.0 : 0.1,

    // 디버그 모드 (개발 중에만 활성화)
    debug: false,
});
