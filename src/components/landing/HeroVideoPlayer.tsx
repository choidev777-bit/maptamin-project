'use client'

import { Player } from '@remotion/player'
import { NewVideoSequence } from './HeroVideo'

export default function HeroVideoPlayer() {
    return (
        // compositionWidth:compositionHeight = 900:1125 = 4:5 비율
        // @remotion/player는 height:'auto' 미지원 → 래퍼로 비율 고정 후 Player를 absolute fill
        <div style={{ position: 'relative', width: '100%', aspectRatio: '4 / 5' }}>
            <Player
                component={NewVideoSequence}
                durationInFrames={840}
                fps={60}
                compositionWidth={900}
                compositionHeight={1125}
                style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    borderRadius: '16px',
                    overflow: 'hidden',
                    boxShadow: '0 30px 60px -12px rgba(15,35,30,0.1)',
                }}
                autoPlay
                loop
            />
        </div>
    )
}

