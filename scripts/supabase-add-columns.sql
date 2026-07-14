-- Adiciona colunas partner e promotion na tabela products
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS partner boolean DEFAULT false;

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS promotion boolean DEFAULT false;

-- Cria a tabela de configurações simples do site (ex.: link do vídeo e imagem da home)
CREATE TABLE IF NOT EXISTS public.site_settings (
  key text PRIMARY KEY,
  value text NOT NULL DEFAULT '',
  updated_at timestamptz DEFAULT now()
);

-- Garante a entrada de configuração para o vídeo da home
INSERT INTO public.site_settings (key, value)
VALUES ('homeVideoUrl', '')
ON CONFLICT (key) DO NOTHING;

-- Garante a entrada de configuração para a imagem da home
INSERT INTO public.site_settings (key, value)
VALUES ('homeImageUrl', '')
ON CONFLICT (key) DO NOTHING;

-- Adiciona colunas de mídia para os produtos (imagem/vídeo do card e da modal)
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS media_url text DEFAULT '';

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS media_type text DEFAULT 'image';

-- Adiciona a mensagem destacada para o cliente nas páginas de acompanhamento do pedido
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS adminmessage text DEFAULT '';

-- Opcional: atualiza cache de esquema do PostgREST (pode ser necessário)
-- SELECT pg_reload_conf();

-- Cria a tabela de entradas de caixa / receitas manuais do admin
CREATE TABLE IF NOT EXISTS public.revenue_entries (
  id text PRIMARY KEY,
  description text NOT NULL DEFAULT '',
  amount numeric NOT NULL DEFAULT 0,
  category text NOT NULL DEFAULT '',
  received_at date DEFAULT CURRENT_DATE,
  status text NOT NULL DEFAULT 'recebida',
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Observação: execute estas queries no Supabase SQL Editor (SQL) do projeto remoto.
-- Após aplicar, re-teste o POST/GET da API para confirmar que os produtos com
-- campos "partner", "promotion" e as novas colunas de mídia são aceitos e retornados.
