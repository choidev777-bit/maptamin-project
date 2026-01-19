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

-- Policies for searches
CREATE POLICY "Users can view own searches"
  ON searches FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own searches"
  ON searches FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own searches"
  ON searches FOR UPDATE USING (auth.uid() = user_id);

-- Policies for search_results
CREATE POLICY "Users can view own results"
  ON search_results FOR SELECT
  USING (search_id IN (SELECT id FROM searches WHERE user_id = auth.uid()));

CREATE POLICY "Service role can insert results"
  ON search_results FOR INSERT WITH CHECK (true);

-- Policies for daily_usage
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
