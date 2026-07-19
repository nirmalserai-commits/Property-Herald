-- Add property segments to listings and profiles
ALTER TABLE listings ADD COLUMN property_types TEXT[] DEFAULT ARRAY['residential', 'commercial'];
ALTER TABLE listings ADD COLUMN deal_types TEXT[] DEFAULT ARRAY['buy', 'rent'];

-- Add categories for better organization
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  property_type TEXT NOT NULL CHECK (property_type IN ('residential', 'commercial')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert property categories
INSERT INTO categories (name, slug, property_type) VALUES
-- Residential
('Apartments', 'apartments', 'residential'),
('Villas', 'villas', 'residential'),
('Independent Houses', 'independent-houses', 'residential'),
('Plots', 'residential-plots', 'residential'),
('Farmhouses', 'farmhouses', 'residential'),
('Penthouses', 'penthouses', 'residential'),
('Row Houses', 'row-houses', 'residential'),
('Builder Floors', 'builder-floors', 'residential'),
('Kothis', 'kothis', 'residential'),
('Holiday Homes', 'holiday-homes', 'residential'),
('Senior Living', 'senior-living', 'residential'),
('Student Housing', 'student-housing', 'residential'),
-- Commercial
('Office Spaces', 'office-spaces', 'commercial'),
('Retail Shops', 'retail-shops', 'commercial'),
('Showrooms', 'showrooms', 'commercial'),
('Warehouses', 'warehouses', 'commercial'),
('Industrial Plots', 'industrial-plots', 'commercial'),
('Commercial Plots', 'commercial-plots', 'commercial'),
('Co-working Spaces', 'coworking-spaces', 'commercial'),
('Business Parks', 'business-parks', 'commercial'),
('Hotels', 'hotels', 'commercial'),
('Restaurants', 'restaurants', 'commercial'),
('Medical Spaces', 'medical-spaces', 'commercial'),
('Educational Spaces', 'educational-spaces', 'commercial');

-- Update RLS for categories (public read)
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "categories_public_read" ON categories FOR SELECT TO public USING (true);

-- Create index for better performance
CREATE INDEX idx_listings_property_types ON listings USING GIN(property_types);
CREATE INDEX idx_listings_deal_types ON listings USING GIN(deal_types);