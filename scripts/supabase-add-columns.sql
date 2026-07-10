-- Adiciona colunas partner e promotion na tabela products
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS partner boolean DEFAULT false;

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS promotion boolean DEFAULT false;

-- Opcional: atualiza cache de esquema do PostgREST (pode ser necessário)
-- SELECT pg_reload_conf();

-- Observação: execute estas queries no Supabase SQL Editor (SQL) do projeto remoto.
-- Após aplicar, re-teste o POST/GET da API para confirmar que os produtos com
-- campos "partner" e "promotion" são aceitos e retornados.
