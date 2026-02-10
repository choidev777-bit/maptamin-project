import React from 'react'

export function FractionOneFifty({ className }: { className?: string }) {
    return (
        <svg
            width="40"
            height="40"
            viewBox="0 0 40 40"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={className}
        >
            <text
                x="20"
                y="16"
                fontSize="16"
                fontWeight="bold"
                fill="currentColor"
                textAnchor="middle"
                style={{ fontFamily: 'inherit' }}
            >
                1
            </text>
            <line
                x1="8"
                y1="22"
                x2="32"
                y2="22"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
            />
            <text
                x="20"
                y="36"
                fontSize="14"
                fontWeight="bold"
                fill="currentColor"
                textAnchor="middle"
                style={{ fontFamily: 'inherit' }}
            >
                50
            </text>
        </svg>
    )
}
