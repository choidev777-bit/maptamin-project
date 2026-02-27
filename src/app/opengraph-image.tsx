import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = '맵타민 | 플레이스 상위노출의 시작'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function Image() {
    const squareSize = 80
    const gap = 20
    const cornerRadius = squareSize * 0.15
    const tealGreen = '#00C896'
    const deepNavy = '#002959'

    const gridSquares = []
    for (let row = 0; row < 3; row++) {
        for (let col = 0; col < 3; col++) {
            const index = row * 3 + col
            const isCenterSquare = index === 4
            const x = col * (squareSize + gap)
            const y = row * (squareSize + gap)

            gridSquares.push(
                <div
                    key={index}
                    style={{
                        position: 'absolute',
                        left: x,
                        top: y,
                        width: squareSize,
                        height: squareSize,
                        borderRadius: cornerRadius,
                        backgroundColor: isCenterSquare ? tealGreen : deepNavy,
                    }}
                />
            )
        }
    }

    const totalGridSize = 3 * squareSize + 2 * gap

    return new ImageResponse(
        (
            <div
                style={{
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: '#F8FAFC',
                }}
            >
                {/* Logo + Text */}
                <div
                    style={{
                        display: 'flex',
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 48,
                    }}
                >
                    {/* Grid Logo */}
                    <div
                        style={{
                            position: 'relative',
                            width: totalGridSize,
                            height: totalGridSize,
                            display: 'flex',
                        }}
                    >
                        {gridSquares}
                    </div>

                    {/* Brand Name */}
                    <div
                        style={{
                            fontSize: 120,
                            fontWeight: 700,
                            color: deepNavy,
                            letterSpacing: '-2px',
                        }}
                    >
                        Maptamin
                    </div>
                </div>
            </div>
        ),
        {
            ...size,
        }
    )
}
