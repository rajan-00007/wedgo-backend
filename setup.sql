-- 🧱 1. PostgreSQL Table Queries

-- ✅ users
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone_number VARCHAR(15) UNIQUE NOT NULL,
    is_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ✅ otp_verifications
CREATE TABLE IF NOT EXISTS otp_verifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL,
    phone_number VARCHAR(15) NOT NULL,
    otp_code VARCHAR(6) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    is_used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ✅ couple_profiles
CREATE TABLE IF NOT EXISTS couple_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    partner1_name VARCHAR(100) NOT NULL,
    partner2_name VARCHAR(100) NOT NULL,
    event_date DATE NOT NULL,
    wallpaper_type VARCHAR(10), -- 'preset' | 'custom'
    wallpaper_id UUID REFERENCES wallpapers(id),
    custom_wallpaper_urls TEXT[],
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ✅ wallpapers (preset images)
CREATE TABLE IF NOT EXISTS wallpapers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    image_url TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


CREATE TABLE IF NOT EXISTS events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    couple_id UUID NOT NULL REFERENCES couple_profiles(id) ON DELETE CASCADE,

    name VARCHAR(100) NOT NULL,              -- Haldi, Mehendi, Wedding
    event_date DATE NOT NULL,

    start_time TIME,
    end_time TIME,

    dress_code VARCHAR(100),
    description TEXT,
    location TEXT,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


CREATE TABLE IF NOT EXISTS event_access (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    couple_id UUID NOT NULL REFERENCES couple_profiles(id) ON DELETE CASCADE,

    token TEXT UNIQUE NOT NULL,   -- access key (used in URL)

    access_type VARCHAR(20) DEFAULT 'custom', 
    -- 'all' | 'custom'

    allowed_event_ids UUID[],     -- array of event IDs

    expires_at TIMESTAMP,         -- optional expiry

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


CREATE TABLE IF NOT EXISTS event_access_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    access_id UUID REFERENCES event_access(id) ON DELETE CASCADE,
    event_id UUID REFERENCES events(id) ON DELETE CASCADE
);