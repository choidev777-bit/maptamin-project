import React, { useMemo } from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, random, Img, staticFile } from "remotion";


const INITIAL_GRID = [
    [17, 21, 11, 23, 13],    // Row 1 (all edge)
    [18, 6, 8, 10, 12],      // Row 2 (edges: col 0, 4)
    [10, 9, 5, 7, 20],       // Row 3 (edges: col 0, 4) modified
    [10, 10, 6, 8, 22],      // Row 4 (edges: col 0, 4) modified
    [15, 19, 10, 22, 18],    // Row 5 (all edge) modified
];


const getColor = (val: number) => {
    if (val <= 5) return "#2ecc71"; // green
    if (val <= 10) return "#eab308"; // yellow
    return "#ef4444"; // red
};


function deterministicShuffle<T>(array: T[], seed: string): T[] {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(random(`${seed}-${i}`) * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}


const GRID_MAP = (() => {
    const list: { r: number, c: number, initial: number }[] = [];
    for (let r = 0; r < 5; r++) {
        for (let c = 0; c < 5; c++) {
            list.push({ r, c, initial: INITIAL_GRID[r][c] });
        }
    }


    // 타겟 계산 로직
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


    const map = new Map<string, { frame: number, value: number, pop?: boolean }[]>();


    list.forEach((item, i) => {
        const target = targets.get(`${item.r}-${item.c}`)!;
        const diff = item.initial - target;


        const activeBuckets = [];
        if (m1[i]) activeBuckets.push(1);
        if (m2[i]) activeBuckets.push(2);
        if (m3[i]) activeBuckets.push(3);


        const drops = { 1: 0, 2: 0, 3: 0 };
        let remaining = diff;


        for (const b of activeBuckets) {
            if (remaining > 0) {
                drops[b as 1 | 2 | 3] += 1;
                remaining -= 1;
            }
        }


        while (remaining > 0) {
            for (const b of activeBuckets) {
                if (remaining > 0) {
                    const maxAdd = Math.max(1, Math.min(remaining, Math.ceil(diff / activeBuckets.length)));
                    const add = Math.min(remaining, Math.floor(random(`add-${item.initial}-${remaining}`) * maxAdd) + 1);
                    drops[b as 1 | 2 | 3] += add;
                    remaining -= add;
                }
            }
        }


        /*
           순서 재배치 로직
           요청: 4 -> 1 -> 2 -> 3 의 순서로 재생되도록 변경.
           
           기존 논리상:
             - Phase 1 (1번): 초기값 (1~20초대, 빨강 위주)
             - Phase 2 (2번): 첫 번째 drop 이후 (5초)
             - Phase 3 (3번): 두 번째 drop 이후 (10초)
             - Phase 4 (4번): 최종 타겟 (15초 지점 도달 시 완성된 초록/노랑 위주)
             
           루프 영상을 만들기 위해 시간대를 매핑:
             - 0초 ~ 5초     (기존의 4번, 즉 제일 많이 깎인 형태)
             - 5초 지점      모든 구슬 팝업 효과와 함께 (기존 1번, 가장 처음의 초기값) 형태로 리셋
             - 10초 지점     기존의 첫 번째 떨어짐 (2번 상태)
             - 15초 지점     기존의 두 번째 떨어짐 (3번 상태)
             - 20초 지점     기존의 세 번째 떨어짐 (4번 상태, 0초 형태와 완전 동일해짐 = 루프 완성!)
             - 21초          루프를 1초간 유지
        */


        let phase1 = item.initial;
        let phase2 = phase1 - drops[1];
        let phase3 = phase2 - drops[2];
        let phase4 = phase3 - drops[3];


        // Ensure phase4 exactly hits target due to rounding
        if (phase4 !== target) {
            phase4 = target;
        }


        // 15초(frame 900) 구간에 정가운데 동그라미(r=2, c=2) 값을 무조건 3으로 고정
        if (item.r === 2 && item.c === 2) {
            phase3 = 3;
        }


        const steps = [
            { frame: 0, value: phase4, pop: false },             // 시작: 이미 완성된 형태
            { frame: 180, value: phase1, pop: true },            // 3초: 초기값으로 돌아옴 (모두 팝 효과 발생)
            { frame: 360, value: phase2, pop: drops[1] > 0 },    // 6초: 1차 하락
            { frame: 540, value: phase3, pop: drops[2] > 0 || (item.r === 2 && item.c === 2) },    // 9초: 2차 하락 - 가운데 동그라미는 확정적으로 변경되므로 팝 발동
            { frame: 720, value: phase4, pop: drops[3] > 0 }    // 12초: 3차 하락 (완성본 복귀)
        ];


        map.set(`${item.r}-${item.c}`, steps);
    });


    return map;
})();


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
    // 팝(pop) 플래그가 true일 경우에만 스프링 애니메이션 발동
    if (currentStep.pop) {
        if (frame - currentStep.frame >= 45) {
            // 애니메이션이 시간이 지나면 서브픽셀 렌더링 흔들림 방지를 위해 강제 1로 고정
            bumpScale = 1;
        } else {
            const bounceInterpolation = spring({
                frame: frame - currentStep.frame,
                fps,
                config: {
                    damping: 12,
                    mass: 0.5,
                    stiffness: 150,
                }
            });
            bumpScale = 1.15 - 0.15 * bounceInterpolation;
        }
    }


    const val = currentStep.value;
    const bgColor = getColor(val);


    const isCenter = row === 2 && col === 2;
    const borderColor = isCenter ? "#2563eb" : "#e0e0e0";


    return (
        <div style={{
            width: 90,
            height: 90,
            borderRadius: '50%',
            backgroundColor: "#ffffff",
            border: `3px solid ${borderColor}`,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            position: 'relative'
        }}>
            {isCenter && (
                <div style={{
                    position: 'absolute',
                    top: -65,
                    backgroundColor: '#ffffff',
                    border: '3px solid #e0e0e0', // subtle border
                    borderRadius: 30, // Left and right very rounded, top bottom flat visually (it's a pill shape)
                    padding: '8px 20px',
                    display: 'flex',
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    zIndex: 30,
                    boxShadow: '0 8px 16px rgba(0,0,0,0.1)'
                }}>
                    <div style={{
                        display: 'flex',
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 8,
                        opacity: 0.75 + 0.25 * Math.sin(frame / 12) // text and indicator pulse only
                    }}>
                        {/* Blue circle indicator */}
                        <div style={{ width: 14, height: 14, backgroundColor: '#2563eb', borderRadius: '50%' }} />
                        <span style={{ color: '#333333', fontSize: 20, fontWeight: 'bold', fontFamily: 'Arial, sans-serif', paddingBottom: 2, whiteSpace: 'nowrap' }}>내 매장</span>
                    </div>
                    {/* Speech bubble tail */}
                    <div style={{
                        position: 'absolute',
                        bottom: -8,
                        left: '50%',
                        transform: 'translateX(-50%) rotate(45deg)',
                        width: 12,
                        height: 12,
                        backgroundColor: '#ffffff',
                        borderRight: '3px solid #e0e0e0',
                        borderBottom: '3px solid #e0e0e0'
                    }} />
                </div>
            )}
            <div style={{
                position: 'absolute',
                width: 80,
                height: 80,
                borderRadius: '50%',
                backgroundColor: bgColor,
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                transform: `scale(${bumpScale})`,
                willChange: "transform",
                backfaceVisibility: "hidden",
            }}>
                <span style={{
                    color: "white",
                    fontSize: 34,
                    fontWeight: "bold",
                    fontFamily: "Arial, sans-serif",
                    margin: 0,
                    padding: 0
                }}>
                    {val}
                </span>
            </div>
        </div>
    );
};


export const NewVideoSequence: React.FC = () => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();


    // Determine the current step's rank and previous rank for animation direction
    let rank = 2; // Default for 0~3.5s (0~210 frames) and 12.5~14s (750~840 frames)
    let prevRank = 2;
    let animFrame = 0; // The threshold passing point


    if (frame >= 210 && frame < 390) {
        // 3.5s~6.5s: Rank dropped from 2 to 17
        rank = 17;
        prevRank = 2;
        animFrame = 210;
    } else if (frame >= 390 && frame < 570) {
        // 6.5s~9.5s: Rank improved from 17 to 9
        rank = 9;
        prevRank = 17;
        animFrame = 390;
    } else if (frame >= 570 && frame < 750) {
        // 9.5s~12.5s: Rank improved from 9 to 6
        rank = 6;
        prevRank = 9;
        animFrame = 570;
    } else if (frame >= 750) {
        // 12.5s+: Rank improved from 6 to 2
        rank = 2;
        prevRank = 6;
        animFrame = 750;
    }


    // Calculate animation progression (0 to 1)
    let animProgress = spring({
        frame: frame - animFrame,
        fps,
        config: {
            damping: 14,
            mass: 0.8,
            stiffness: 120,
        }
    });


    // Sub-pixel 렌더링 방지: 애니메이션 시간이 충분히 지나면(약 0.75초 후) 강제로 1.0으로 고정하여
    // 21초 -> 0초 루프 시 미세한 1~2px 흔들림을 원천 차단
    if (frame - animFrame >= 45) {
        animProgress = 1;
    }


    const rankColor = getColor(rank);
    const prevRankColor = getColor(prevRank);


    // Direction: If rank number decreases (e.g. 17 -> 9, improving), we want numbers to slide UP.
    // So current number slides from BOTTOM to CENTER, previous from CENTER to TOP.
    // If rank number increases (e.g. 2 -> 17, dropping), we want numbers to slide DOWN.
    // So current number slides from TOP to CENTER, previous from CENTER to BOTTOM.
    const isDropping = rank > prevRank;


    // Disable animation completely for the first 0~3.5s (frames 0~209)
    // And for the final static loop end (frames 795~839) safely remove transform to avoid GPU fractional offset
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
        <AbsoluteFill style={{ backgroundColor: "#f3f4f6", justifyContent: "center", alignItems: "center" }}>
            {/* 4:5 비율의 모서리가 둥근 컨테이너 */}
            <div style={{
                width: 900,
                height: 1125, // 900 * 5/4 = 1125 (4:5 비율)
                backgroundColor: "#ffffff",
                borderRadius: 40,
                overflow: "hidden",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                boxShadow: "0px 20px 50px rgba(0,0,0,0.1)",
                position: "relative"
            }}>
                {/* 상단 텍스트 및 로고 영역 */}
                <div style={{
                    width: '100%',
                    height: 225,
                    display: 'flex',
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    paddingLeft: 60,
                    paddingRight: 60,
                }}>
                    {/* 왼쪽 영역 */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        {/* 첫째 줄 */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <Img src={staticFile("vectors/집 모양.svg")} style={{ width: 24, height: 24 }} />
                            <span style={{ fontSize: 22, fontWeight: 'bold', fontFamily: 'Arial, sans-serif' }}>
                                <span style={{ color: '#00c986' }}>내 매장</span>
                                <span style={{ color: '#001011' }}>: 맵타민네 카페</span>
                            </span>
                        </div>
                        {/* 둘째 줄 */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <Img src={staticFile("vectors/돋보기.svg")} style={{ width: 24, height: 24 }} />
                            <span style={{ fontSize: 22, fontWeight: 'bold', fontFamily: 'Arial, sans-serif' }}>
                                <span style={{ color: '#00c986' }}>분석 키워드</span>
                                <span style={{ color: '#001011' }}>: 근처 카페</span>
                            </span>
                        </div>
                    </div>


                    {/* 오른쪽 영역 (순위 모음) */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 8 }}>
                        <span style={{ fontSize: 20, color: '#555555', fontFamily: 'Arial, sans-serif', fontWeight: 'bold' }}>
                            "홍대 카페" 검색 시 플레이스 순위
                        </span>
                        <div style={{ fontSize: 32, fontWeight: 'bold', fontFamily: 'Arial, sans-serif', color: '#001011', display: 'flex', alignItems: 'center' }}>
                            맵타민네 카페 :
                            <div style={{ display: 'flex', alignItems: 'center', paddingLeft: 8, height: 80, overflow: 'hidden', position: 'relative' }}>
                                <div style={{ position: 'relative', width: 140, height: 80 }}>
                                    {/* 현재 랭크 (들어오는 방향) */}
                                    <div style={{
                                        position: 'absolute',
                                        top: 0,
                                        left: 0,
                                        width: '100%',
                                        height: '100%',
                                        transform: currentTranslateY ? `translateY(${currentTranslateY})` : undefined,
                                        display: 'flex',
                                        alignItems: 'center'
                                    }}>
                                        <span style={{ color: rankColor, fontSize: 50 }}>{rank}위</span>
                                        {rank === 2 && <span style={{ marginLeft: 8, fontSize: 36, transform: 'translateY(-4px)' }}>🏆</span>}
                                    </div>
                                    {/* 이전 랭크 (나가는 방향) - 애니메이션 진행중일때만 보임 */}
                                    {frame >= 210 && frame > animFrame && animProgress < 1 && (
                                        <div style={{
                                            position: 'absolute',
                                            top: 0,
                                            left: 0,
                                            width: '100%',
                                            height: '100%',
                                            transform: prevTranslateY ? `translateY(${prevTranslateY})` : undefined,
                                            display: 'flex',
                                            alignItems: 'center'
                                        }}>
                                            <span style={{ color: prevRankColor, fontSize: 50 }}>{prevRank}위</span>
                                            {prevRank === 2 && <span style={{ marginLeft: 8, fontSize: 36, transform: 'translateY(-4px)' }}>🏆</span>}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>


                {/* 1:1 비율로 남는 부분을 자른 실제 영상 영역 */}
                <div style={{
                    width: 900,
                    height: 900, // 1:1 정사각형 영역
                    position: "relative",
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    overflow: "hidden" // 1:1 밖으로 나가는 배경/요소 자름
                }}>
                    <AbsoluteFill>
                        <Img
                            src={staticFile("png/지도 배경.png")}
                            style={{
                                width: "100%",
                                height: "100%",
                                objectFit: "cover"
                            }}
                        />
                    </AbsoluteFill>
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(5, 110px)',
                        gridTemplateRows: 'repeat(5, 110px)',
                        gap: '20px',
                        padding: '40px',
                        zIndex: 10 // ensure grid is above the image
                    }}>
                        {INITIAL_GRID.map((rowArr, rowIdx) =>
                            rowArr.map((_, colIdx) => (
                                <Circle
                                    key={`${rowIdx}-${colIdx}`}
                                    row={rowIdx}
                                    col={colIdx}
                                />
                            ))
                        )}
                    </div>
                </div >
            </div >
        </AbsoluteFill >
    );
};



