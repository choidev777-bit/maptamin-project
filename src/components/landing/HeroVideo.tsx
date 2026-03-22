'use client'

import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, random, Img, staticFile } from "remotion";

// ── 그리드 초기값 ──────────────────────────────────────────────
const INITIAL_GRID = [
    [17, 21, 11, 23, 13],
    [18, 6, 8, 10, 12],
    [10, 9, 5, 7, 20],
    [10, 10, 6, 8, 22],
    [15, 19, 10, 22, 18],
];

const getColor = (val: number) => {
    if (val <= 5) return "#2ecc71";
    if (val <= 10) return "#eab308";
    return "#ef4444";
};

function deterministicShuffle<T>(array: T[], seed: string): T[] {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(random(`${seed}-${i}`) * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

// ── GRID_MAP 사전 계산 ─────────────────────────────────────────
const GRID_MAP = (() => {
    const list: { r: number; c: number; initial: number }[] = [];
    for (let r = 0; r < 5; r++) {
        for (let c = 0; c < 5; c++) {
            list.push({ r, c, initial: INITIAL_GRID[r][c] });
        }
    }

    const sorted = [...list].sort((a, b) => b.initial - a.initial);
    const targets = new Map<string, number>();

    sorted.forEach((item, index) => {
        let target;
        if (index < 7) {
            const tVals = [10, 9, 9, 8, 7, 6, 6];
            target = tVals[index];
        } else {
            const rank = index - 7;
            if (rank < 4) target = 5;
            else if (rank < 8) target = 4;
            else if (rank < 12) target = 3;
            else if (rank < 15) target = 2;
            else target = 1;
        }
        targets.set(`${item.r}-${item.c}`, Math.min(target, item.initial));
    });

    const m1 = deterministicShuffle([...Array(18).fill(1), ...Array(7).fill(0)], "m1");
    const m2 = deterministicShuffle([...Array(18).fill(1), ...Array(7).fill(0)], "m2");
    const m3 = deterministicShuffle([...Array(18).fill(1), ...Array(7).fill(0)], "m3");

    for (let i = 0; i < 25; i++) {
        if (!m1[i] && !m2[i] && !m3[i]) m2[i] = 1;
    }

    const map = new Map<string, { frame: number; value: number; pop?: boolean }[]>();

    list.forEach((item, i) => {
        const target = targets.get(`${item.r}-${item.c}`)!;
        const diff = item.initial - target;

        const activeBuckets: number[] = [];
        if (m1[i]) activeBuckets.push(1);
        if (m2[i]) activeBuckets.push(2);
        if (m3[i]) activeBuckets.push(3);

        const drops: Record<number, number> = { 1: 0, 2: 0, 3: 0 };
        let remaining = diff;

        for (const b of activeBuckets) {
            if (remaining > 0) {
                drops[b] += 1;
                remaining -= 1;
            }
        }

        while (remaining > 0) {
            for (const b of activeBuckets) {
                if (remaining > 0) {
                    const maxAdd = Math.max(1, Math.min(remaining, Math.ceil(diff / activeBuckets.length)));
                    const add = Math.min(remaining, Math.floor(random(`add-${item.initial}-${remaining}`) * maxAdd) + 1);
                    drops[b] += add;
                    remaining -= add;
                }
            }
        }

        let phase1 = item.initial;
        let phase2 = phase1 - drops[1];
        let phase3 = phase2 - drops[2];
        let phase4 = phase3 - drops[3];

        if (phase4 !== target) {
            phase4 = target;
        }

        if (item.r === 2 && item.c === 2) {
            phase3 = 3;
        }

        const steps = [
            { frame: 0, value: phase4, pop: false },
            { frame: 180, value: phase1, pop: true },
            { frame: 360, value: phase2, pop: drops[1] > 0 },
            { frame: 540, value: phase3, pop: drops[2] > 0 || (item.r === 2 && item.c === 2) },
            { frame: 720, value: phase4, pop: drops[3] > 0 },
        ];

        map.set(`${item.r}-${item.c}`, steps);
    });

    return map;
})();

// ── Circle 컴포넌트 ────────────────────────────────────────────
interface CircleProps {
    row: number;
    col: number;
}

const Circle: React.FC<CircleProps> = ({ row, col }) => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();

    const sequence = GRID_MAP.get(`${row}-${col}`)!;

    let currentStepIndex = 0;
    for (let i = sequence.length - 1; i >= 0; i--) {
        if (frame >= sequence[i].frame) {
            currentStepIndex = i;
            break;
        }
    }

    const currentStep = sequence[currentStepIndex];

    let bumpScale = 1;
    if (currentStep.pop) {
        if (frame - currentStep.frame >= 45) {
            bumpScale = 1;
        } else {
            const bounceInterpolation = spring({
                frame: frame - currentStep.frame,
                fps,
                config: {
                    damping: 12,
                    mass: 0.5,
                    stiffness: 150,
                },
            });
            bumpScale = 1.15 - 0.15 * bounceInterpolation;
        }
    }

    const val = currentStep.value;
    const bgColor = getColor(val);

    const isCenter = row === 2 && col === 2;
    const borderColor = isCenter ? "#2563eb" : "#e0e0e0";

    return (
        <div
            style={{
                width: 90,
                height: 90,
                borderRadius: "50%",
                backgroundColor: "#ffffff",
                border: `3px solid ${borderColor}`,
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                position: "relative",
            }}
        >
            {isCenter && (
                <div
                    style={{
                        position: "absolute",
                        top: -65,
                        backgroundColor: "#ffffff",
                        border: "3px solid #e0e0e0",
                        borderRadius: 30,
                        padding: "8px 20px",
                        display: "flex",
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 8,
                        zIndex: 30,
                        boxShadow: "0 8px 16px rgba(0,0,0,0.1)",
                    }}
                >
                    <div
                        style={{
                            display: "flex",
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 8,
                            opacity: 0.75 + 0.25 * Math.sin(frame / 12),
                        }}
                    >
                        <div style={{ width: 14, height: 14, backgroundColor: "#2563eb", borderRadius: "50%" }} />
                        <span
                            style={{
                                color: "#333333",
                                fontSize: 20,
                                fontWeight: "bold",
                                fontFamily: "Arial, sans-serif",
                                paddingBottom: 2,
                                whiteSpace: "nowrap",
                            }}
                        >
                            내 매장
                        </span>
                    </div>
                    <div
                        style={{
                            position: "absolute",
                            bottom: -8,
                            left: "50%",
                            transform: "translateX(-50%) rotate(45deg)",
                            width: 12,
                            height: 12,
                            backgroundColor: "#ffffff",
                            borderRight: "3px solid #e0e0e0",
                            borderBottom: "3px solid #e0e0e0",
                        }}
                    />
                </div>
            )}
            <div
                style={{
                    position: "absolute",
                    width: 80,
                    height: 80,
                    borderRadius: "50%",
                    backgroundColor: bgColor,
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    transform: `scale(${bumpScale})`,
                    willChange: "transform",
                    backfaceVisibility: "hidden",
                }}
            >
                <span
                    style={{
                        color: "white",
                        fontSize: 34,
                        fontWeight: "bold",
                        fontFamily: "Arial, sans-serif",
                        margin: 0,
                        padding: 0,
                    }}
                >
                    {val}
                </span>
            </div>
        </div>
    );
};

// ── 메인 Remotion 컴포넌트 ─────────────────────────────────────
export const NewVideoSequence: React.FC = () => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();

    let rank = 2;
    let prevRank = 2;
    let animFrame = 0;

    if (frame >= 210 && frame < 390) {
        rank = 17;
        prevRank = 2;
        animFrame = 210;
    } else if (frame >= 390 && frame < 570) {
        rank = 9;
        prevRank = 17;
        animFrame = 390;
    } else if (frame >= 570 && frame < 750) {
        rank = 6;
        prevRank = 9;
        animFrame = 570;
    } else if (frame >= 750) {
        rank = 2;
        prevRank = 6;
        animFrame = 750;
    }

    let animProgress = spring({
        frame: frame - animFrame,
        fps,
        config: {
            damping: 14,
            mass: 0.8,
            stiffness: 120,
        },
    });

    if (frame - animFrame >= 45) {
        animProgress = 1;
    }

    const rankColor = getColor(rank);
    const prevRankColor = getColor(prevRank);

    const isDropping = rank > prevRank;
    const isAtRest = frame < 210 || frame >= 795;

    const currentTranslateY = isAtRest
        ? null
        : isDropping
            ? `${-100 * (1 - animProgress)}%`
            : `${100 * (1 - animProgress)}%`;

    const prevTranslateY = isAtRest
        ? null
        : isDropping
            ? `${100 * animProgress}%`
            : `${-100 * animProgress}%`;

    return (
        <AbsoluteFill style={{ backgroundColor: "#ffffff", justifyContent: "center", alignItems: "center" }}>
            <div
                style={{
                    width: 900,
                    height: 1125,
                    backgroundColor: "#ffffff",
                    borderRadius: 40,
                    overflow: "hidden",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    boxShadow: "0px 20px 50px rgba(0,0,0,0.1)",
                    position: "relative",
                }}
            >
                {/* 상단 텍스트 및 로고 영역 */}
                <div
                    style={{
                        width: "100%",
                        height: 225,
                        display: "flex",
                        flexDirection: "row",
                        justifyContent: "space-between",
                        alignItems: "center",
                        paddingLeft: 60,
                        paddingRight: 60,
                    }}
                >
                    {/* 왼쪽 영역 */}
                    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <Img src={staticFile("images/house-icon.svg")} style={{ width: 24, height: 24 }} />
                            <span style={{ fontSize: 19, fontWeight: "bold", fontFamily: "Arial, sans-serif" }}>
                                <span style={{ color: "#00c986" }}>내 매장:</span>
                                <span style={{ color: "#001011" }}> 맵타민 카페 홍대점</span>
                            </span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <Img src={staticFile("images/search-icon.svg")} style={{ width: 24, height: 24 }} />
                            <span style={{ fontSize: 22, fontWeight: "bold", fontFamily: "Arial, sans-serif" }}>
                                <span style={{ color: "#00c986" }}>분석 키워드:</span>
                                <span style={{ color: "#001011" }}> 카페</span>
                            </span>
                        </div>
                    </div>

                    {/* 오른쪽 영역 (순위) */}
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 8 }}>
                        <span style={{ fontSize: 20, color: "#555555", fontFamily: "Arial, sans-serif", fontWeight: "bold" }}>
                            &ldquo;홍대 카페&rdquo; 검색 시 플레이스 순위
                        </span>
                        <div
                            style={{
                                fontSize: 26,
                                fontWeight: "bold",
                                fontFamily: "Arial, sans-serif",
                                color: "#001011",
                                display: "flex",
                                alignItems: "center",
                            }}
                        >
                            맵타민 카페 홍대점 :
                            <div
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    paddingLeft: 8,
                                    height: 80,
                                    overflow: "hidden",
                                    position: "relative",
                                }}
                            >
                                <div style={{ position: "relative", width: 140, height: 80 }}>
                                    {/* 현재 랭크 */}
                                    <div
                                        style={{
                                            position: "absolute",
                                            top: 0,
                                            left: 0,
                                            width: "100%",
                                            height: "100%",
                                            transform: currentTranslateY ? `translateY(${currentTranslateY})` : undefined,
                                            display: "flex",
                                            alignItems: "center",
                                        }}
                                    >
                                        <span style={{ color: rankColor, fontSize: 50 }}>{rank}위</span>
                                        {rank === 2 && (
                                            <span style={{ marginLeft: 8, fontSize: 36, transform: "translateY(-4px)" }}>🏆</span>
                                        )}
                                    </div>
                                    {/* 이전 랭크 (나가는 방향) */}
                                    {frame >= 210 && frame > animFrame && animProgress < 1 && (
                                        <div
                                            style={{
                                                position: "absolute",
                                                top: 0,
                                                left: 0,
                                                width: "100%",
                                                height: "100%",
                                                transform: prevTranslateY ? `translateY(${prevTranslateY})` : undefined,
                                                display: "flex",
                                                alignItems: "center",
                                            }}
                                        >
                                            <span style={{ color: prevRankColor, fontSize: 50 }}>{prevRank}위</span>
                                            {prevRank === 2 && (
                                                <span style={{ marginLeft: 8, fontSize: 36, transform: "translateY(-4px)" }}>
                                                    🏆
                                                </span>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 지도 영역 (1:1) */}
                <div
                    style={{
                        width: 900,
                        height: 900,
                        position: "relative",
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                        overflow: "hidden",
                    }}
                >
                    <AbsoluteFill>
                        <Img
                            src={staticFile("images/hongdae-map.png")}
                            style={{
                                width: "100%",
                                height: "100%",
                                objectFit: "cover",
                            }}
                        />
                    </AbsoluteFill>
                    <div
                        style={{
                            display: "grid",
                            gridTemplateColumns: "repeat(5, 110px)",
                            gridTemplateRows: "repeat(5, 110px)",
                            gap: "20px",
                            padding: "40px",
                            zIndex: 10,
                        }}
                    >
                        {INITIAL_GRID.map((rowArr, rowIdx) =>
                            rowArr.map((_, colIdx) => <Circle key={`${rowIdx}-${colIdx}`} row={rowIdx} col={colIdx} />)
                        )}
                    </div>
                </div>
            </div>
        </AbsoluteFill>
    );
};
