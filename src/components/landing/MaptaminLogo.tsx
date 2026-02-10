import React from 'react'

export function MaptaminLogo() {
    const squareSize = 32
    const gap = 8
    const cornerRadius = squareSize * 0.15
    const tealGreen = "#00C896"
    const deepNavy = "#002959"

    const squares = []
    for (let row = 0; row < 3; row++) {
        for (let col = 0; col < 3; col++) {
            const index = row * 3 + col
            const isCenterSquare = index === 4
            const x = col * (squareSize + gap)
            const y = row * (squareSize + gap)
            const fill = isCenterSquare ? tealGreen : deepNavy

            squares.push(
                <rect
                    key={index}
                    x={x}
                    y={y}
                    width={squareSize}
                    height={squareSize}
                    rx={cornerRadius}
                    ry={cornerRadius}
                    fill={fill}
                />
            )
        }
    }

    const totalWidth = 3 * squareSize + 2 * gap
    const totalHeight = 3 * squareSize + 2 * gap

    return (
        <div className="flex items-center gap-3 sm:gap-4">
            {/* Logo Grid - scaled down for navbar */}
            <svg
                viewBox={`0 0 ${totalWidth} ${totalHeight}`}
                xmlns="http://www.w3.org/2000/svg"
                className="h-10 w-auto sm:h-12"
            >
                {squares}
            </svg>

            {/* Text - responsive sizing */}
            <div
                className="text-xl font-bold tracking-tight sm:text-2xl"
                style={{ color: deepNavy }}
            >
                Maptamin
            </div>
        </div>
    )
}
