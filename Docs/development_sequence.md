# Development Sequence: Local SEO Rank Tracker SaaS

A step-by-step guide for building the rank tracker. Each step includes:
- **File(s)**: Exact files to create or modify
- **Action**: What to do
- **Test**: How to verify it works before moving on

> [!TIP]
> Complete each step and verify it works before proceeding to the next.

---

## Phase 1: Project Setup

### 1.1 Create Next.js Project
```bash
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --yes
```
**Test**: Run `npm run dev` → See default page at `localhost:3000`

---

### 1.2 Create Folder Structure
```bash
mkdir -p src/components/auth src/components/search src/components/results src/components/ui src/components/maps
mkdir -p src/lib/supabase src/lib/dataforseo src/lib/utils src/lib/types
mkdir -p supabase/migrations
```
**Test**: Folders exist in file explorer

---

### 1.3 Create Environment Variables
**File**: `.env.local`
```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Google Maps
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=

# DataForSEO
DATAFORSEO_LOGIN=
DATAFORSEO_PASSWORD=
```
**File**: `.env.example` (same structure, no values, committed to git)

**Test**: Files exist, `.env.local` is in `.gitignore`

---

### 1.4 Install Dependencies
```bash
npm install @supabase/supabase-js @supabase/ssr
npm install @vis.gl/react-google-maps
npm install lucide-react
```
**Test**: No npm errors, packages in `package.json`

---

## Phase 2: Supabase & Database

### 2.1 Create Supabase Browser Client
**File**: `src/lib/supabase/client.ts`
```typescript
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```
**Test**: Import in any file → No TypeScript errors

---

### 2.2 Create Supabase Server Client
**File**: `src/lib/supabase/server.ts`
```typescript
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()
  
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        },
      },
    }
  )
}
```
**Test**: Import in API route → No errors

---

### 2.3 Create Middleware
**File**: `src/middleware.ts`
```typescript
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  // Protect dashboard routes
  if (request.nextUrl.pathname.startsWith('/dashboard') && !user) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
```
**Test**: Add console.log → See log on page navigation

---

### 2.4 Create TypeScript Types
**File**: `src/lib/types/index.ts`
```typescript
export interface GridPoint {
  row: number
  col: number
  lat: number
  lng: number
  enabled: boolean
}

export interface Search {
  id: string
  user_id: string
  place_id: string
  place_name: string
  place_address: string | null
  place_lat: number
  place_lng: number
  keywords: string[]
  grid_points: GridPoint[]
  grid_distance: number
  distance_unit: 'km' | 'mile'
  status: 'pending' | 'processing' | 'completed' | 'failed'
  created_at: string
}

export interface SearchResult {
  id: string
  search_id: string
  keyword: string
  grid_index: number
  grid_lat: number
  grid_lng: number
  rank: number | null
  competitors: Competitor[] | null
  created_at: string
}

export interface Competitor {
  name: string
  rank: number
  place_id: string
}

export interface DailyUsage {
  id: string
  user_id: string
  usage_date: string
  search_count: number
}
```
**Test**: Import types elsewhere → No TypeScript errors

---

### 2.5 Create Database Migration
**File**: `supabase/migrations/001_initial_schema.sql`
```sql
-- Searches table
CREATE TABLE searches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  place_id TEXT NOT NULL,
  place_name TEXT NOT NULL,
  place_address TEXT,
  place_lat DECIMAL(10, 8) NOT NULL,
  place_lng DECIMAL(11, 8) NOT NULL,
  keywords TEXT[] NOT NULL,
  grid_points JSONB NOT NULL,
  grid_distance DECIMAL NOT NULL,
  distance_unit TEXT DEFAULT 'km',
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Search results table
CREATE TABLE search_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  search_id UUID REFERENCES searches(id) ON DELETE CASCADE NOT NULL,
  keyword TEXT NOT NULL,
  grid_index INTEGER NOT NULL,
  grid_lat DECIMAL(10, 8) NOT NULL,
  grid_lng DECIMAL(11, 8) NOT NULL,
  rank INTEGER,
  competitors JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Daily usage table
CREATE TABLE daily_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  usage_date DATE NOT NULL,
  search_count INTEGER DEFAULT 0,
  UNIQUE(user_id, usage_date)
);

-- Indexes
CREATE INDEX idx_searches_user_id ON searches(user_id);
CREATE INDEX idx_searches_place_id ON searches(place_id);
CREATE INDEX idx_search_results_search_id ON search_results(search_id);
CREATE INDEX idx_daily_usage_user_date ON daily_usage(user_id, usage_date);

-- Row Level Security
ALTER TABLE searches ENABLE ROW LEVEL SECURITY;
ALTER TABLE search_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_usage ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view own searches"
  ON searches FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own searches"
  ON searches FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own searches"
  ON searches FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own results"
  ON search_results FOR SELECT
  USING (search_id IN (SELECT id FROM searches WHERE user_id = auth.uid()));

CREATE POLICY "Service role can insert results"
  ON search_results FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can view own usage"
  ON daily_usage FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can upsert own usage"
  ON daily_usage FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own usage"
  ON daily_usage FOR UPDATE USING (auth.uid() = user_id);

-- Function to increment daily usage
CREATE OR REPLACE FUNCTION increment_daily_usage(p_user_id UUID, p_date DATE)
RETURNS void AS $$
BEGIN
  INSERT INTO daily_usage (user_id, usage_date, search_count)
  VALUES (p_user_id, p_date, 1)
  ON CONFLICT (user_id, usage_date)
  DO UPDATE SET search_count = daily_usage.search_count + 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```
**Test**: File exists (apply to Supabase later via dashboard)

---

## Phase 3: Authentication

### 3.1 Create Login Page
**File**: `src/app/(auth)/login/page.tsx`
```typescript
import { GoogleLoginButton } from '@/components/auth/GoogleLoginButton'

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-xl shadow-lg">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900">Welcome</h2>
          <p className="mt-2 text-gray-600">Sign in to track your local rankings</p>
        </div>
        <GoogleLoginButton />
      </div>
    </div>
  )
}
```
**Test**: Navigate to `/login` → See login page

---

### 3.2 Create Google Login Button
**File**: `src/components/auth/GoogleLoginButton.tsx`
```typescript
'use client'

import { createClient } from '@/lib/supabase/client'

export function GoogleLoginButton() {
  const handleLogin = async () => {
    const supabase = createClient()
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
  }

  return (
    <button
      onClick={handleLogin}
      className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
    >
      <svg className="w-5 h-5" viewBox="0 0 24 24">
        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
      </svg>
      <span className="text-gray-700 font-medium">Continue with Google</span>
    </button>
  )
}
```
**Test**: Click button → Redirects to Google OAuth

---

### 3.3 Create Auth Callback Route
**File**: `src/app/(auth)/auth/callback/route.ts`
```typescript
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_failed`)
}
```
**Test**: After Google login → Redirected to `/dashboard`

---

### 3.4 Configure Google OAuth in Supabase
1. Go to Supabase Dashboard → Authentication → Providers
2. Enable Google provider
3. Add Client ID and Secret from Google Cloud Console
4. Set Redirect URL: `https://your-project.supabase.co/auth/v1/callback`

**Test**: Full OAuth flow works end-to-end

---

## Phase 4: Core UI & Layout

### 4.1 Create Dashboard Layout
**File**: `src/app/(dashboard)/layout.tsx`
```typescript
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/dashboard" className="text-xl font-bold">
            RankTracker
          </Link>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">{user.email}</span>
            <form action="/auth/signout" method="post">
              <button className="text-sm text-gray-500 hover:text-gray-700">
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  )
}
```
**Test**: Login → See header with email and sign out

---

### 4.2 Create Dashboard Home Page
**File**: `src/app/(dashboard)/page.tsx`
```typescript
import Link from 'next/link'

export default function DashboardPage() {
  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold">Your Searches</h1>
        <Link
          href="/search/new"
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          New Search
        </Link>
      </div>
      
      {/* Empty state - will add SearchHistory later */}
      <div className="text-center py-12 bg-white rounded-lg border">
        <p className="text-gray-500">No searches yet. Start your first search!</p>
      </div>
    </div>
  )
}
```
**Test**: See dashboard with "New Search" button

---

### 4.3 Create Sign Out Route
**File**: `src/app/(auth)/auth/signout/route.ts`
```typescript
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  await supabase.auth.signOut()
  return NextResponse.redirect(new URL('/', request.url))
}
```
**Test**: Click sign out → Redirected to home, session cleared

---

## Phase 5: Search Flow - Place Search

### 5.1 Create Google Maps Provider
**File**: `src/components/maps/GoogleMapsProvider.tsx`
```typescript
'use client'

import { APIProvider } from '@vis.gl/react-google-maps'

export function GoogleMapsProvider({ children }: { children: React.ReactNode }) {
  return (
    <APIProvider apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!}>
      {children}
    </APIProvider>
  )
}
```
**Test**: Import and use → No API errors

---

### 5.2 Create Place Search Input
**File**: `src/components/search/PlaceSearchInput.tsx`
```typescript
'use client'

import { useState, useCallback } from 'react'
import { useMapsLibrary } from '@vis.gl/react-google-maps'

interface Place {
  placeId: string
  name: string
  address: string
  lat: number
  lng: number
}

interface Props {
  onPlaceSelect: (place: Place) => void
}

export function PlaceSearchInput({ onPlaceSelect }: Props) {
  const [inputValue, setInputValue] = useState('')
  const [suggestions, setSuggestions] = useState<google.maps.places.AutocompletePrediction[]>([])
  const places = useMapsLibrary('places')

  const handleInput = useCallback(async (value: string) => {
    setInputValue(value)
    if (!places || value.length < 3) {
      setSuggestions([])
      return
    }

    const service = new places.AutocompleteService()
    const response = await service.getPlacePredictions({
      input: value,
      types: ['establishment'],
    })
    setSuggestions(response?.predictions || [])
  }, [places])

  const handleSelect = useCallback(async (placeId: string) => {
    if (!places) return

    const service = new places.PlacesService(document.createElement('div'))
    service.getDetails(
      { placeId, fields: ['name', 'formatted_address', 'geometry'] },
      (result, status) => {
        if (status === 'OK' && result) {
          onPlaceSelect({
            placeId,
            name: result.name || '',
            address: result.formatted_address || '',
            lat: result.geometry?.location?.lat() || 0,
            lng: result.geometry?.location?.lng() || 0,
          })
          setInputValue(result.name || '')
          setSuggestions([])
        }
      }
    )
  }, [places, onPlaceSelect])

  return (
    <div className="relative">
      <input
        type="text"
        value={inputValue}
        onChange={(e) => handleInput(e.target.value)}
        placeholder="Search for a business..."
        className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
      />
      {suggestions.length > 0 && (
        <ul className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-60 overflow-auto">
          {suggestions.map((suggestion) => (
            <li
              key={suggestion.place_id}
              onClick={() => handleSelect(suggestion.place_id)}
              className="px-4 py-3 hover:bg-gray-50 cursor-pointer"
            >
              <div className="font-medium">{suggestion.structured_formatting.main_text}</div>
              <div className="text-sm text-gray-500">{suggestion.structured_formatting.secondary_text}</div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
```
**Test**: Type business name → See autocomplete suggestions

---

### 5.3 Create New Search Page
**File**: `src/app/(dashboard)/search/new/page.tsx`
```typescript
'use client'

import { useState } from 'react'
import { GoogleMapsProvider } from '@/components/maps/GoogleMapsProvider'
import { PlaceSearchInput } from '@/components/search/PlaceSearchInput'

interface Place {
  placeId: string
  name: string
  address: string
  lat: number
  lng: number
}

export default function NewSearchPage() {
  const [step, setStep] = useState(1)
  const [place, setPlace] = useState<Place | null>(null)

  return (
    <GoogleMapsProvider>
      <div className="max-w-2xl mx-auto">
        {/* Step Indicator */}
        <div className="flex items-center justify-center mb-8">
          {[1, 2, 3, 4].map((s) => (
            <div key={s} className="flex items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                step >= s ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'
              }`}>
                {s}
              </div>
              {s < 4 && <div className={`w-16 h-1 ${step > s ? 'bg-blue-600' : 'bg-gray-200'}`} />}
            </div>
          ))}
        </div>

        {/* Step 1: Place Search */}
        {step === 1 && (
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-bold mb-4">Step 1: Select Business</h2>
            <PlaceSearchInput onPlaceSelect={(p) => setPlace(p)} />
            
            {place && (
              <div className="mt-4 p-4 bg-green-50 rounded-lg">
                <p className="font-medium">{place.name}</p>
                <p className="text-sm text-gray-600">{place.address}</p>
              </div>
            )}
            
            <button 
              onClick={() => setStep(2)}
              disabled={!place}
              className="mt-6 w-full py-3 bg-blue-600 text-white rounded-lg disabled:opacity-50"
            >
              Next: Keywords
            </button>
          </div>
        )}

        {/* Steps 2, 3, 4 placeholders */}
        {step === 2 && <div className="bg-white p-6 rounded-lg shadow">Step 2: Keywords (TODO)</div>}
        {step === 3 && <div className="bg-white p-6 rounded-lg shadow">Step 3: Grid (TODO)</div>}
        {step === 4 && <div className="bg-white p-6 rounded-lg shadow">Step 4: Confirm (TODO)</div>}
      </div>
    </GoogleMapsProvider>
  )
}
```
**Test**: Select place → Click Next → Moves to step 2

---

## Phase 6: Search Flow - Keywords

### 6.1 Create Keyword Input Component
**File**: `src/components/search/KeywordInput.tsx`
```typescript
'use client'

import { X, Plus } from 'lucide-react'

interface Props {
  keywords: string[]
  onChange: (keywords: string[]) => void
  maxKeywords?: number
}

export function KeywordInput({ keywords, onChange, maxKeywords = 3 }: Props) {
  const addKeyword = () => {
    if (keywords.length < maxKeywords) {
      onChange([...keywords, ''])
    }
  }

  const updateKeyword = (index: number, value: string) => {
    const updated = [...keywords]
    updated[index] = value
    onChange(updated)
  }

  const removeKeyword = (index: number) => {
    onChange(keywords.filter((_, i) => i !== index))
  }

  return (
    <div className="space-y-3">
      {keywords.map((keyword, index) => (
        <div key={index} className="flex gap-2">
          <input
            type="text"
            value={keyword}
            onChange={(e) => updateKeyword(index, e.target.value)}
            placeholder={`Keyword ${index + 1} (e.g., "coffee shop")`}
            className="flex-1 px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
          />
          {keywords.length > 1 && (
            <button
              onClick={() => removeKeyword(index)}
              className="p-3 text-red-500 hover:bg-red-50 rounded-lg"
            >
              <X size={20} />
            </button>
          )}
        </div>
      ))}
      
      {keywords.length < maxKeywords && (
        <button
          onClick={addKeyword}
          className="flex items-center gap-2 text-blue-600 hover:text-blue-700"
        >
          <Plus size={20} />
          Add keyword ({keywords.length}/{maxKeywords})
        </button>
      )}
    </div>
  )
}
```
**Test**: Add/remove keywords → Max 3 enforced

---

### 6.2 Integrate Keywords into Wizard
**Update**: `src/app/(dashboard)/search/new/page.tsx`

Add to state:
```typescript
const [keywords, setKeywords] = useState<string[]>([''])
```

Add step 2 content:
```typescript
{step === 2 && (
  <div className="bg-white p-6 rounded-lg shadow">
    <h2 className="text-xl font-bold mb-4">Step 2: Enter Keywords</h2>
    <p className="text-gray-600 mb-4">
      Enter keywords that customers use to find your business
    </p>
    <KeywordInput keywords={keywords} onChange={setKeywords} />
    
    <div className="flex gap-4 mt-6">
      <button onClick={() => setStep(1)} className="flex-1 py-3 border rounded-lg">
        Back
      </button>
      <button 
        onClick={() => setStep(3)}
        disabled={!keywords.some(k => k.trim())}
        className="flex-1 py-3 bg-blue-600 text-white rounded-lg disabled:opacity-50"
      >
        Next: Grid
      </button>
    </div>
  </div>
)}
```
**Test**: Enter keywords → Next button enables when valid

---

## Phase 7: Search Flow - Grid Configuration

### 7.1 Create Grid Calculator
**File**: `src/lib/utils/grid-calculator.ts`
```typescript
import { GridPoint } from '@/lib/types'

export function calculateGridPoints(
  centerLat: number,
  centerLng: number,
  gridSize: number,
  distanceKm: number
): GridPoint[] {
  const points: GridPoint[] = []
  const halfGrid = Math.floor(gridSize / 2)
  
  const latDegreePerKm = 1 / 111.32
  const lngDegreePerKm = 1 / (111.32 * Math.cos(centerLat * Math.PI / 180))
  
  for (let row = -halfGrid; row <= halfGrid; row++) {
    for (let col = -halfGrid; col <= halfGrid; col++) {
      points.push({
        row,
        col,
        lat: centerLat + (row * distanceKm * latDegreePerKm),
        lng: centerLng + (col * distanceKm * lngDegreePerKm),
        enabled: true,
      })
    }
  }
  
  return points
}

export function milesToKm(miles: number): number {
  return miles * 1.60934
}

export function kmToMiles(km: number): number {
  return km / 1.60934
}
```
**Test**: Call with known values → Correct coordinates returned

---

### 7.2 Create Grid Configurator
**File**: `src/components/search/GridConfigurator.tsx`
```typescript
'use client'

import { useState } from 'react'

interface GridPoint {
  row: number
  col: number
  enabled: boolean
}

interface Props {
  selectedPoints: GridPoint[]
  onPointsChange: (points: GridPoint[]) => void
  maxPoints?: number
}

export function GridConfigurator({ selectedPoints, onPointsChange, maxPoints = 49 }: Props) {
  const gridSize = 15
  const halfGrid = Math.floor(gridSize / 2)

  const isPointEnabled = (row: number, col: number) => {
    return selectedPoints.some(p => p.row === row && p.col === col && p.enabled)
  }

  const togglePoint = (row: number, col: number) => {
    const existingIndex = selectedPoints.findIndex(p => p.row === row && p.col === col)
    
    if (existingIndex >= 0) {
      const updated = [...selectedPoints]
      updated[existingIndex].enabled = !updated[existingIndex].enabled
      onPointsChange(updated)
    } else {
      const enabledCount = selectedPoints.filter(p => p.enabled).length
      if (enabledCount < maxPoints) {
        onPointsChange([...selectedPoints, { row, col, enabled: true }])
      }
    }
  }

  const applyPreset = (size: number) => {
    const newPoints: GridPoint[] = []
    const presetHalf = Math.floor(size / 2)
    
    for (let row = -presetHalf; row <= presetHalf; row++) {
      for (let col = -presetHalf; col <= presetHalf; col++) {
        newPoints.push({ row, col, enabled: true })
      }
    }
    onPointsChange(newPoints)
  }

  const enabledCount = selectedPoints.filter(p => p.enabled).length

  return (
    <div>
      {/* Presets */}
      <div className="flex gap-2 mb-4">
        {[3, 5, 7].map(size => (
          <button
            key={size}
            onClick={() => applyPreset(size)}
            className="px-4 py-2 border rounded-lg hover:bg-gray-50"
          >
            {size}x{size}
          </button>
        ))}
      </div>

      {/* Grid */}
      <div 
        className="inline-grid gap-1 p-4 bg-gray-100 rounded-lg"
        style={{ gridTemplateColumns: `repeat(${gridSize}, 1fr)` }}
      >
        {Array.from({ length: gridSize }).map((_, rowIndex) =>
          Array.from({ length: gridSize }).map((_, colIndex) => {
            const row = rowIndex - halfGrid
            const col = colIndex - halfGrid
            const isCenter = row === 0 && col === 0
            const isEnabled = isPointEnabled(row, col)
            
            return (
              <button
                key={`${row}-${col}`}
                onClick={() => !isCenter && togglePoint(row, col)}
                className={`w-6 h-6 rounded-full border-2 transition-colors ${
                  isCenter 
                    ? 'bg-blue-600 border-blue-600 cursor-default'
                    : isEnabled
                      ? 'bg-orange-500 border-orange-500'
                      : 'bg-white border-gray-300 hover:border-gray-400'
                }`}
              />
            )
          })
        )}
      </div>

      <p className="mt-4 text-sm text-gray-600">
        Selected: {enabledCount} / {maxPoints} points
      </p>
    </div>
  )
}
```
**Test**: Click cells to toggle → Presets work → Count updates

---

### 7.3 Create Distance Settings
**File**: `src/components/search/DistanceSettings.tsx`
```typescript
'use client'

interface Props {
  distance: number
  unit: 'km' | 'mile'
  onDistanceChange: (distance: number) => void
  onUnitChange: (unit: 'km' | 'mile') => void
}

export function DistanceSettings({ distance, unit, onDistanceChange, onUnitChange }: Props) {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-2">Distance between points</label>
        <div className="flex items-center gap-4">
          <input
            type="range"
            min="0.5"
            max="5"
            step="0.5"
            value={distance}
            onChange={(e) => onDistanceChange(parseFloat(e.target.value))}
            className="flex-1"
          />
          <span className="w-20 text-right font-medium">
            {distance} {unit}
          </span>
        </div>
      </div>
      
      <div className="flex gap-2">
        <button
          onClick={() => onUnitChange('km')}
          className={`px-4 py-2 rounded-lg ${
            unit === 'km' ? 'bg-blue-600 text-white' : 'border'
          }`}
        >
          Kilometers
        </button>
        <button
          onClick={() => onUnitChange('mile')}
          className={`px-4 py-2 rounded-lg ${
            unit === 'mile' ? 'bg-blue-600 text-white' : 'border'
          }`}
        >
          Miles
        </button>
      </div>
    </div>
  )
}
```
**Test**: Slider works → Unit toggle works

---

## Phase 8: DataForSEO Integration

### 8.1 Create DataForSEO Client
**File**: `src/lib/dataforseo/client.ts`
```typescript
interface MapRankResult {
  rank: number | null
  competitors: Array<{ name: string; rank: number; placeId: string }>
}

export async function fetchMapRank(
  keyword: string,
  lat: number,
  lng: number
): Promise<MapRankResult> {
  const auth = Buffer.from(
    `${process.env.DATAFORSEO_LOGIN}:${process.env.DATAFORSEO_PASSWORD}`
  ).toString('base64')

  const response = await fetch(
    'https://api.dataforseo.com/v3/serp/google/maps/live/advanced',
    {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify([
        {
          keyword,
          location_coordinate: `${lat},${lng},100`,
          language_code: 'en',
          device: 'desktop',
          depth: 20,
        },
      ]),
    }
  )

  const data = await response.json()
  
  if (data.tasks?.[0]?.result?.[0]?.items) {
    const items = data.tasks[0].result[0].items
    const competitors = items.map((item: any, index: number) => ({
      name: item.title,
      rank: index + 1,
      placeId: item.place_id || '',
    }))
    
    return { rank: null, competitors }
  }

  return { rank: null, competitors: [] }
}
```
**Test**: Call with test data → See response (costs $0.002)

---

### 8.2 Create Search API Route
**File**: `src/app/api/search/route.ts`
```typescript
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { calculateGridPoints } from '@/lib/utils/grid-calculator'

export async function POST(request: Request) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Check daily usage
  const today = new Date().toISOString().split('T')[0]
  const { data: usage } = await supabase
    .from('daily_usage')
    .select('search_count')
    .eq('user_id', user.id)
    .eq('usage_date', today)
    .single()

  if (usage && usage.search_count >= 1) {
    return NextResponse.json({ error: 'Daily limit reached' }, { status: 429 })
  }

  const body = await request.json()
  const { place, keywords, gridPoints, distance, distanceUnit } = body

  // Create search record
  const { data: search, error } = await supabase
    .from('searches')
    .insert({
      user_id: user.id,
      place_id: place.placeId,
      place_name: place.name,
      place_address: place.address,
      place_lat: place.lat,
      place_lng: place.lng,
      keywords,
      grid_points: gridPoints,
      grid_distance: distance,
      distance_unit: distanceUnit,
      status: 'processing',
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Increment usage
  await supabase.rpc('increment_daily_usage', {
    p_user_id: user.id,
    p_date: today,
  })

  // TODO: Trigger background processing here
  // For now, we'll process inline in a separate step

  return NextResponse.json({ searchId: search.id })
}

export async function GET(request: Request) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: searches } = await supabase
    .from('searches')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  return NextResponse.json({ searches })
}
```
**Test**: POST creates search record → GET returns searches

---

## Phase 9: Results Visualization

### 9.1 Create Rank Color Utility
**File**: `src/lib/utils/rank-colors.ts`
```typescript
export function getRankColor(rank: number | null): string {
  if (rank === null) return '#888888'
  if (rank <= 3) return '#22c55e'   // Green
  if (rank <= 6) return '#84cc16'   // Light green
  if (rank <= 10) return '#f97316'  // Orange
  if (rank <= 15) return '#ef4444'  // Red
  return '#991b1b'                   // Dark red
}

export function getRankLabel(rank: number | null): string {
  if (rank === null) return '-'
  return rank.toString()
}
```

---

### 9.2 Create Search Results Page
**File**: `src/app/(dashboard)/search/[id]/page.tsx`
```typescript
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { RankHeatmap } from '@/components/results/RankHeatmap'
import { AverageRankCard } from '@/components/results/AverageRankCard'
import { KeywordTabs } from '@/components/results/KeywordTabs'

export default async function SearchResultsPage({
  params,
}: {
  params: { id: string }
}) {
  const supabase = await createClient()
  
  const { data: search } = await supabase
    .from('searches')
    .select('*')
    .eq('id', params.id)
    .single()

  if (!search) {
    notFound()
  }

  const { data: results } = await supabase
    .from('search_results')
    .select('*')
    .eq('search_id', params.id)

  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">{search.place_name}</h1>
      <p className="text-gray-600 mb-6">{search.place_address}</p>

      {search.status === 'processing' && (
        <div className="p-8 text-center bg-yellow-50 rounded-lg">
          <p className="text-yellow-800">Processing... Please wait.</p>
        </div>
      )}

      {search.status === 'completed' && results && (
        <>
          <AverageRankCard results={results} />
          <KeywordTabs keywords={search.keywords} results={results} />
          <RankHeatmap 
            center={{ lat: search.place_lat, lng: search.place_lng }}
            results={results}
          />
        </>
      )}
    </div>
  )
}
```
**Test**: Navigate to search results → See results page

---

## Phase 10: Final Steps

### 10.1 Update Dashboard with History
Update `src/app/(dashboard)/page.tsx` to fetch and display search history.

### 10.2 Add Responsive Styles
Test and adjust all components for mobile screens.

### 10.3 Error Handling
Add try/catch and user-friendly error messages throughout.

### 10.4 Deploy to Vercel
1. Push to GitHub
2. Connect repository to Vercel
3. Add environment variables
4. Deploy

---

## Checklist Summary

| Phase | Steps | Checkpoint |
|-------|-------|------------|
| 1. Setup | 1.1 - 1.4 | App runs at localhost:3000 |
| 2. Supabase | 2.1 - 2.5 | Types import without errors |
| 3. Auth | 3.1 - 3.4 | Full OAuth flow works |
| 4. UI | 4.1 - 4.3 | Dashboard layout shows |
| 5. Place | 5.1 - 5.3 | Place search autocomplete works |
| 6. Keywords | 6.1 - 6.2 | Keywords input works |
| 7. Grid | 7.1 - 7.3 | Grid selection works |
| 8. DataFor | 8.1 - 8.2 | Search creates record |
| 9. Results | 9.1 - 9.2 | Results display on map |
| 10. Polish | 10.1 - 10.4 | Deployed to production |
