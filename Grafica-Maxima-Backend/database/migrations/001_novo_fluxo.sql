-- Migração aditiva. Executar com npm run migrate após importar o banco original.
ALTER TABLE usuario ADD COLUMN login VARCHAR(80) NULL;
ALTER TABLE usuario ADD UNIQUE KEY usuario_login_unique (login);
ALTER TABLE usuario MODIFY email VARCHAR(100) NULL;

CREATE TABLE material (
  id_material INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  categoria VARCHAR(50) NOT NULL,
  nome VARCHAR(100) NOT NULL,
  custo_fixo DECIMAL(18,4) NOT NULL DEFAULT 0,
  custo_unitario DECIMAL(18,4) NOT NULL DEFAULT 0,
  lucro_fixo DECIMAL(18,4) NOT NULL DEFAULT 0,
  lucro_unitario DECIMAL(18,4) NOT NULL DEFAULT 0,
  ativo TINYINT NOT NULL DEFAULT 1,
  origem VARCHAR(30) NULL,
  origem_id INT NULL,
  UNIQUE KEY material_origem (origem, origem_id),
  KEY material_categoria (categoria, ativo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO material (categoria, nome, custo_unitario, origem, origem_id)
SELECT CASE WHEN nome LIKE '%Couch%' THEN 'Couchê 64' ELSE 'Offset' END,
       nome, COALESCE(custo_por_folha, 0), 'papel', id_papel FROM papel WHERE nome IS NOT NULL;
INSERT INTO material (categoria, nome, custo_fixo, custo_unitario, lucro_fixo, lucro_unitario, origem, origem_id)
SELECT CASE WHEN nome IN ('Laminação','Vinco','Serrilha','Furo','Grampo','Cantos Arredondados','Bloco') THEN nome ELSE 'Laminação' END,
       LEFT(COALESCE(NULLIF(descricao,''), nome),100), COALESCE(custo_fixo,0), COALESCE(custo,0),
       COALESCE(lucro_fixo,0), COALESCE(lucro_unitario,0), 'acabamento', id_acabamento FROM acabamento;
INSERT INTO material (categoria, nome, custo_fixo, custo_unitario, lucro_fixo, lucro_unitario, origem, origem_id)
SELECT 'Corte. Esp', COALESCE(tipo,'Corte'), COALESCE(valor_fixo,0), COALESCE(custo_unitario,0),
       COALESCE(lucro_fixo,0), COALESCE(lucro_unitario,0), 'corte', id_corte FROM corte;

CREATE TABLE preco_m2 (
  tipo VARCHAR(50) NOT NULL PRIMARY KEY,
  preco_base_m2 DECIMAL(18,4) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

ALTER TABLE orcamento ADD COLUMN desconto_tipo VARCHAR(12) NOT NULL DEFAULT 'percentual';
ALTER TABLE orcamento ADD COLUMN desconto_valor DECIMAL(18,4) NOT NULL DEFAULT 0;
ALTER TABLE orcamento ADD COLUMN subtotal DECIMAL(18,4) NULL;
ALTER TABLE orcamento ADD COLUMN versao INT NOT NULL DEFAULT 1;
UPDATE orcamento SET subtotal = valor_total;
ALTER TABLE item ADD COLUMN id_material INT NULL;
ALTER TABLE item ADD COLUMN precificacao_snapshot TEXT NULL;
ALTER TABLE item ADD CONSTRAINT item_material_fk FOREIGN KEY (id_material) REFERENCES material(id_material);
ALTER TABLE orcamento ADD INDEX orcamento_data_status (data_criacao, status);
ALTER TABLE cliente ADD INDEX cliente_email (email);
ALTER TABLE cliente ADD INDEX cliente_documento (cpf_cnpj);
