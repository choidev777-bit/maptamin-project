import * as Sentry from "@sentry/nextjs";

Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

    // 개발 환경에서는 100%, 프로덕션에서는 10% 성능 추적
    tracesSampleRate: process.env.NODE_ENV === "development" ? 1.0 : 0.1,

    // 디버그 모드 (확인 후 false로 변경)
    debug: true,

    // 세션 리플레이: 에러 발생 시 100% 캡처, 일반 세션 10% 캡처
    replaysOnErrorSampleRate: 1.0,
    replaysSessionSampleRate: 0.1,

    integrations: [
        Sentry.replayIntegration({
            maskAllText: true,
            blockAllMedia: true,
        }),
    ],
});

// 라우터 전환 추적 (Next.js 15+ 필요)
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
