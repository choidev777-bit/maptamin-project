/**
 * TypeScript declarations for Naver Maps JavaScript API v3
 * @see https://navermaps.github.io/maps.js.ncp/docs/
 */

declare namespace naver {
    namespace maps {
        class Map {
            constructor(mapDiv: string | HTMLElement, options?: MapOptions);
            setCenter(latlng: LatLng | LatLngLiteral): void;
            getCenter(): LatLng;
            setZoom(zoom: number, animate?: boolean): void;
            getZoom(): number;
            panTo(latlng: LatLng | LatLngLiteral, options?: PanOptions): void;
            fitBounds(bounds: LatLngBounds, options?: FitBoundsOptions): void;
            getBounds(): LatLngBounds;
            destroy(): void;
        }

        class LatLng {
            constructor(lat: number, lng: number);
            lat(): number;
            lng(): number;
            equals(latlng: LatLng): boolean;
            toString(): string;
        }

        class LatLngBounds {
            constructor(sw: LatLng, ne: LatLng);
            extend(latlng: LatLng): LatLngBounds;
            getCenter(): LatLng;
            getSW(): LatLng;
            getNE(): LatLng;
        }

        class Marker {
            constructor(options: MarkerOptions);
            setMap(map: Map | null): void;
            getMap(): Map | null;
            setPosition(position: LatLng | LatLngLiteral): void;
            getPosition(): LatLng;
            setIcon(icon: string | ImageIcon | SymbolIcon | HtmlIcon): void;
            setTitle(title: string): void;
            setVisible(visible: boolean): void;
        }

        class InfoWindow {
            constructor(options: InfoWindowOptions);
            open(map: Map, anchor?: Marker | LatLng): void;
            close(): void;
            setContent(content: string | HTMLElement): void;
        }

        class Circle {
            constructor(options: CircleOptions);
            setMap(map: Map | null): void;
            setCenter(center: LatLng | LatLngLiteral): void;
            setRadius(radius: number): void;
        }

        interface MapOptions {
            center?: LatLng | LatLngLiteral;
            zoom?: number;
            minZoom?: number;
            maxZoom?: number;
            mapTypeId?: string;
            draggable?: boolean;
            scrollWheel?: boolean;
            keyboardShortcuts?: boolean;
            disableDoubleClickZoom?: boolean;
            zoomControl?: boolean;
            zoomControlOptions?: ZoomControlOptions;
            mapDataControl?: boolean;
            scaleControl?: boolean;
            logoControl?: boolean;
            background?: string;
        }

        interface LatLngLiteral {
            lat: number;
            lng: number;
        }

        interface MarkerOptions {
            position: LatLng | LatLngLiteral;
            map?: Map;
            icon?: string | ImageIcon | SymbolIcon | HtmlIcon;
            title?: string;
            clickable?: boolean;
            draggable?: boolean;
            visible?: boolean;
            zIndex?: number;
        }

        interface ImageIcon {
            url: string;
            size?: Size;
            scaledSize?: Size;
            origin?: Point;
            anchor?: Point;
        }

        interface SymbolIcon {
            path: SymbolPath | string;
            style?: string;
            radius?: number;
            fillColor?: string;
            fillOpacity?: number;
            strokeColor?: string;
            strokeWeight?: number;
            strokeOpacity?: number;
            anchor?: Point;
        }

        interface HtmlIcon {
            content: string | HTMLElement;
            size?: Size;
            anchor?: Point;
        }

        interface InfoWindowOptions {
            content?: string | HTMLElement;
            position?: LatLng | LatLngLiteral;
            maxWidth?: number;
            backgroundColor?: string;
            borderColor?: string;
            borderWidth?: number;
            anchorSize?: Size;
            anchorSkew?: boolean;
            pixelOffset?: Point;
        }

        interface CircleOptions {
            map?: Map;
            center: LatLng | LatLngLiteral;
            radius: number;
            strokeColor?: string;
            strokeOpacity?: number;
            strokeWeight?: number;
            fillColor?: string;
            fillOpacity?: number;
            clickable?: boolean;
            zIndex?: number;
        }

        interface ZoomControlOptions {
            position?: Position;
            style?: ZoomControlStyle;
        }

        interface PanOptions {
            duration?: number;
            easing?: string;
        }

        interface FitBoundsOptions {
            padding?: number | Padding;
            maxZoom?: number;
        }

        interface Padding {
            top?: number;
            right?: number;
            bottom?: number;
            left?: number;
        }

        class Size {
            constructor(width: number, height: number);
            width: number;
            height: number;
        }

        class Point {
            constructor(x: number, y: number);
            x: number;
            y: number;
        }

        enum Position {
            TOP_LEFT,
            TOP_CENTER,
            TOP_RIGHT,
            LEFT_CENTER,
            LEFT_TOP,
            LEFT_BOTTOM,
            CENTER,
            RIGHT_TOP,
            RIGHT_CENTER,
            RIGHT_BOTTOM,
            BOTTOM_LEFT,
            BOTTOM_CENTER,
            BOTTOM_RIGHT
        }

        enum ZoomControlStyle {
            LARGE,
            SMALL
        }

        enum SymbolPath {
            CIRCLE,
            FORWARD_CLOSED_ARROW,
            FORWARD_OPEN_ARROW,
            BACKWARD_CLOSED_ARROW,
            BACKWARD_OPEN_ARROW
        }

        namespace Event {
            function addListener(
                target: Map | Marker | Circle,
                eventName: string,
                handler: (...args: any[]) => void
            ): any;
            function removeListener(listener: any): void;
            function clearListeners(target: Map | Marker | Circle, eventName?: string): void;
        }
    }
}

interface Window {
    naver?: typeof naver;
}
