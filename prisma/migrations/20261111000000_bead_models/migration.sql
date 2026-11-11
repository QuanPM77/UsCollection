ALTER TABLE public.bead_product_details ADD COLUMN IF NOT EXISTS model_3d jsonb;
CREATE TABLE IF NOT EXISTS public.product_model_assets (
  id uuid PRIMARY KEY,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  created_by uuid NOT NULL,
  original_path text NOT NULL,
  candidate_path text NOT NULL,
  web_path text,
  original_bytes integer NOT NULL,
  web_bytes integer NOT NULL,
  status text NOT NULL DEFAULT 'uploading',
  config jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT model_asset_sizes CHECK (original_bytes > 0 AND web_bytes > 0),
  CONSTRAINT model_asset_status CHECK (status IN ('uploading', 'published'))
);
CREATE INDEX IF NOT EXISTS product_model_assets_product_id_created_at_idx ON public.product_model_assets(product_id, created_at);
ALTER TABLE public.product_model_assets ENABLE ROW LEVEL SECURITY;
-- App server uses its existing trusted database connection; no browser table grants.
REVOKE ALL ON public.product_model_assets FROM anon, authenticated;
