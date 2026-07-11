-- Adiciona colunas partner e promotion na tabela products
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS partner boolean DEFAULT false;

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS promotion boolean DEFAULT false;

-- Cria a tabela de configurações simples do site (ex.: link do vídeo da home)
CREATE TABLE IF NOT EXISTS public.site_settings (
  key text PRIMARY KEY,
  value text NOT NULL DEFAULT '',
  updated_at timestamptz DEFAULT now()
);

-- Garante a entrada de configuração para o vídeo da home
INSERT INTO public.site_settings (key, value)
VALUES ('homeVideoUrl', '')
ON CONFLICT (key) DO NOTHING;

-- Opcional: atualiza cache de esquema do PostgREST (pode ser necessário)
-- SELECT pg_reload_conf();

-- Observação: execute estas queries no Supabase SQL Editor (SQL) do projeto remoto.
-- Após aplicar, re-teste o POST/GET da API para confirmar que os produtos com
-- campos "partner" e "promotion" são aceitos e retornados, e que o link do vídeo
-- pode ser salvo em public.site_settings.
