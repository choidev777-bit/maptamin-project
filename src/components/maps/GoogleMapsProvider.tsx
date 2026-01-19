'use client'

import { APIProvider } from '@vis.gl/react-google-maps'

interface Props {
    children: React.ReactNode
}

export function GoogleMapsProvider({ children }: Props) {
    return (
        <APIProvider apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!}>
            {children}
        </APIProvider>
    )
}
