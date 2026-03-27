import { ImageResponse } from 'next/og'

export const size = { width: 48, height: 48 }
export const contentType = 'image/png'

export default function Icon() {
    const tealGreen = '#00C896'
    const deepNavy = '#002959'
    const sq = 13
    const gap = 3
    const offset = 1.5

    const positions = [0, 1, 2].flatMap(row =>
        [0, 1, 2].map(col => ({
            x: offset + col * (sq + gap),
            y: offset + row * (sq + gap),
            color: row === 1 && col === 1 ? tealGreen : deepNavy,
        }))
    )

    return new ImageResponse(
        (
            <div style={{ display: 'flex', position: 'relative', width: 48, height: 48, background: 'transparent' }}>
                {positions.map((pos, i) => (
                    <div
                        key={i}
                        style={{
                            position: 'absolute',
                            left: pos.x,
                            top: pos.y,
                            width: sq,
                            height: sq,
                            backgroundColor: pos.color,
                            borderRadius: 2,
                        }}
                    />
                ))}
            </div>
        ),
        { width: 48, height: 48 }
    )
}
