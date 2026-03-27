import { ImageResponse } from 'next/og'

export const size = { width: 180, height: 180 }
export const contentType = 'image/png'

export default function AppleIcon() {
    const tealGreen = '#00C896'
    const deepNavy = '#002959'
    const sq = 48
    const gap = 10
    const totalGrid = sq * 3 + gap * 2 // 164
    const offset = (180 - totalGrid) / 2 // 8

    const positions = [0, 1, 2].flatMap(row =>
        [0, 1, 2].map(col => ({
            x: offset + col * (sq + gap),
            y: offset + row * (sq + gap),
            color: row === 1 && col === 1 ? tealGreen : deepNavy,
        }))
    )

    return new ImageResponse(
        (
            <div style={{
                display: 'flex',
                position: 'relative',
                width: 180,
                height: 180,
                background: 'white',
                borderRadius: 36,
            }}>
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
                            borderRadius: 7,
                        }}
                    />
                ))}
            </div>
        ),
        { width: 180, height: 180 }
    )
}
