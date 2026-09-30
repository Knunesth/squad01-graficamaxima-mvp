-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Jun 10, 2026 at 10:30 PM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `graficamaxima`
--

-- --------------------------------------------------------

--
-- Table structure for table `acabamento`
--

CREATE TABLE `acabamento` (
  `id_acabamento` int(11) NOT NULL,
  `nome` varchar(50) DEFAULT NULL,
  `tipo` varchar(30) DEFAULT NULL,
  `descricao` text DEFAULT NULL,
  `custo` decimal(18,4) DEFAULT NULL,
  `tipo_cobranca` varchar(20) DEFAULT NULL,
  `custo_fixo` decimal(18,4) DEFAULT 0.0000,
  `lucro_fixo` decimal(18,4) DEFAULT 0.0000,
  `lucro_unitario` decimal(18,4) DEFAULT 0.0000
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `acabamento`
--

INSERT INTO `acabamento` (`id_acabamento`, `nome`, `tipo`, `descricao`, `custo`, `tipo_cobranca`, `custo_fixo`, `lucro_fixo`, `lucro_unitario`) VALUES
(1, 'Laminação Fosca', 'Papel', 'Laminação Foscqe', 0.5000, 'unitario', 0.0000, 0.0000, 0.0000),
(2, 'Geral', 'Unit', 'testesrtesteeee', 0.0000, 'Unit', 0.0000, 0.0000, 0.0000),
(4, 'Geral', '7', 'teste3', 87.0000, 'Unit', 0.0000, 0.0000, 0.0000),
(11, 'Geral', '0', 'Estilete', 0.3000, 'Unit', 0.0000, 0.0000, 10.0000);

-- --------------------------------------------------------

--
-- Table structure for table `acabamento_item`
--

CREATE TABLE `acabamento_item` (
  `id_acabamento_item` int(11) NOT NULL,
  `id_acabamento` int(11) DEFAULT NULL,
  `id_item` int(11) DEFAULT NULL,
  `quantidade` int(11) DEFAULT NULL,
  `custo_aplicado` decimal(18,4) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `acabamento_item`
--

INSERT INTO `acabamento_item` (`id_acabamento_item`, `id_acabamento`, `id_item`, `quantidade`, `custo_aplicado`) VALUES
(1, 1, 1, 1000, 20.0000),
(2, 1, 4, 6, 3.0000),
(3, 2, 4, 7, 0.0000),
(4, NULL, 4, 5, 435.0000),
(5, NULL, 4, 8, 184.0000),
(6, NULL, 4, 9, 108.0000),
(7, 11, 5, 5, 1.5000);

-- --------------------------------------------------------

--
-- Table structure for table `cliente`
--

CREATE TABLE `cliente` (
  `id_cliente` int(11) NOT NULL,
  `nome` varchar(100) NOT NULL,
  `cpf_cnpj` varchar(20) DEFAULT NULL,
  `telefone` varchar(20) DEFAULT NULL,
  `email` varchar(100) DEFAULT NULL,
  `endereco` text DEFAULT NULL,
  `data_cadastro` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `cliente`
--

INSERT INTO `cliente` (`id_cliente`, `nome`, `cpf_cnpj`, `telefone`, `email`, `endereco`, `data_cadastro`) VALUES
(1, 'João da Silva', '123.456.789-00', '61999999999', 'joao@cliente.com', 'QNN 01 Conjunto B', '2026-04-23 14:15:25'),
(2, 'testestesa', NULL, NULL, NULL, NULL, '2026-05-21 11:28:26'),
(3, 'Willian Minerva', NULL, NULL, NULL, NULL, '2026-05-21 11:37:09'),
(4, 'Willian Minerva', NULL, NULL, NULL, NULL, '2026-05-21 11:41:08'),
(5, 'sa', NULL, NULL, NULL, NULL, '2026-05-21 11:42:13'),
(6, 'Teste', NULL, NULL, NULL, NULL, '2026-05-21 12:02:25'),
(7, 'testandooo', NULL, NULL, NULL, NULL, '2026-05-21 12:06:07'),
(8, 'Paulo', NULL, NULL, NULL, NULL, '2026-05-21 12:22:25'),
(9, 'Paulo', NULL, NULL, NULL, NULL, '2026-05-21 14:05:57'),
(10, 'teste', NULL, NULL, NULL, NULL, '2026-05-21 15:32:13'),
(11, 'JoaoJoao', NULL, NULL, NULL, NULL, '2026-05-27 12:32:05'),
(12, 'fgdagfdagfd', NULL, NULL, NULL, NULL, '2026-05-27 12:36:38'),
(13, 'teste', NULL, NULL, NULL, NULL, '2026-05-28 22:54:18'),
(14, 'testandolunguinhocode', NULL, NULL, NULL, NULL, '2026-06-01 17:26:55'),
(15, 'Paulo Araújo', NULL, NULL, NULL, NULL, '2026-06-10 16:36:10'),
(18, 'Paulo', '00.000.000/0000-00', '9999999999999', 'testeo@gmail.com', 'CEP: 00000-000, Brasília, Ceilândia Norte, QNM 10', '2026-06-10 16:50:03'),
(19, 'Cliente Sem Nome', NULL, NULL, NULL, 'CEP: , , , ', '2026-06-10 17:17:17');

-- --------------------------------------------------------

--
-- Table structure for table `corte`
--

CREATE TABLE `corte` (
  `id_corte` int(11) NOT NULL,
  `tipo` varchar(50) DEFAULT NULL,
  `descricao` text DEFAULT NULL,
  `valor_fixo` decimal(18,4) DEFAULT NULL,
  `custo_unitario` decimal(18,4) DEFAULT 0.0000,
  `lucro_fixo` decimal(18,4) DEFAULT 0.0000,
  `lucro_unitario` decimal(18,4) DEFAULT 0.0000
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `corte`
--

INSERT INTO `corte` (`id_corte`, `tipo`, `descricao`, `valor_fixo`, `custo_unitario`, `lucro_fixo`, `lucro_unitario`) VALUES
(1, 'Corte Reto', 'Corte simples guilhotina', 10.0000, 0.0000, 0.0000, 0.0000);

-- --------------------------------------------------------

--
-- Table structure for table `documento`
--

CREATE TABLE `documento` (
  `id_documento` int(11) NOT NULL,
  `id_orcamento` int(11) DEFAULT NULL,
  `tipo` varchar(30) DEFAULT NULL,
  `caminho_arquivo` varchar(255) DEFAULT NULL,
  `data_geracao` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `historico_log`
--

CREATE TABLE `historico_log` (
  `id_log` int(11) NOT NULL,
  `id_usuario` int(11) DEFAULT NULL,
  `tabela_afetada` varchar(50) DEFAULT NULL,
  `id_registro` int(11) DEFAULT NULL,
  `acao` varchar(50) DEFAULT NULL,
  `campo_alterado` varchar(50) DEFAULT NULL,
  `valor_antigo` text DEFAULT NULL,
  `valor_novo` text DEFAULT NULL,
  `data_hora` datetime DEFAULT NULL,
  `descricao` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `impressao`
--

CREATE TABLE `impressao` (
  `id_impressao` int(11) NOT NULL,
  `tipo` varchar(50) DEFAULT NULL,
  `custo_por_folha` decimal(18,4) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `impressao`
--

INSERT INTO `impressao` (`id_impressao`, `tipo`, `custo_por_folha`) VALUES
(1, 'Offset Colorido', 0.8000);

-- --------------------------------------------------------

--
-- Table structure for table `item`
--

CREATE TABLE `item` (
  `id_item` int(11) NOT NULL,
  `id_orcamento` int(11) DEFAULT NULL,
  `id_papel` int(11) DEFAULT NULL,
  `id_impressao` int(11) DEFAULT NULL,
  `tipo_produto` varchar(100) DEFAULT NULL,
  `quantidade` int(11) DEFAULT NULL,
  `largura` decimal(10,2) DEFAULT NULL,
  `altura` decimal(10,2) DEFAULT NULL,
  `valor_unitario` decimal(18,4) DEFAULT NULL,
  `valor_total` decimal(18,4) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `item`
--

INSERT INTO `item` (`id_item`, `id_orcamento`, `id_papel`, `id_impressao`, `tipo_produto`, `quantidade`, `largura`, `altura`, `valor_unitario`, `valor_total`) VALUES
(1, NULL, NULL, 1, 'Cartão de Visita', 1000, NULL, NULL, NULL, 300.0000),
(4, 29, 1, 1, 'Banner', 3500, 0.00, 0.00, 0.2086, 730.0000),
(5, 30, 1, 1, 'Impressão Digital', 1, 0.00, 0.00, 0.0000, 1.5000);

-- --------------------------------------------------------

--
-- Table structure for table `item_corte`
--

CREATE TABLE `item_corte` (
  `id_item_corte` int(11) NOT NULL,
  `id_item` int(11) DEFAULT NULL,
  `id_corte` int(11) DEFAULT NULL,
  `quantidade` int(11) DEFAULT NULL,
  `custo_aplicado` decimal(18,4) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `item_corte`
--

INSERT INTO `item_corte` (`id_item_corte`, `id_item`, `id_corte`, `quantidade`, `custo_aplicado`) VALUES
(1, 1, 1, 1, 10.0000);

-- --------------------------------------------------------

--
-- Table structure for table `orcamento`
--

CREATE TABLE `orcamento` (
  `id_orcamento` int(11) NOT NULL,
  `id_usuario` int(11) DEFAULT NULL,
  `id_cliente` int(11) DEFAULT NULL,
  `data_criacao` datetime DEFAULT current_timestamp(),
  `data_validade` datetime DEFAULT NULL,
  `valor_total` decimal(18,4) DEFAULT NULL,
  `valor_unitario` decimal(18,4) DEFAULT NULL,
  `status` varchar(30) DEFAULT NULL,
  `prazo_entrega` date DEFAULT NULL,
  `observacoes` text DEFAULT NULL,
  `quantidade` int(11) DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `orcamento`
--

INSERT INTO `orcamento` (`id_orcamento`, `id_usuario`, `id_cliente`, `data_criacao`, `data_validade`, `valor_total`, `valor_unitario`, `status`, `prazo_entrega`, `observacoes`, `quantidade`) VALUES
(22, 1, 11, '2026-05-27 12:32:06', NULL, 0.0000, 0.0000, 'Aberto', NULL, 'Impressão Digital', 1),
(23, 1, 12, '2026-05-27 12:36:38', NULL, 0.0000, 0.0000, 'Aberto', NULL, 'Impressão Digital', 1),
(24, 1, NULL, '2026-05-28 22:54:18', NULL, 0.0000, 0.0000, 'Em análise', '1899-11-30', 'Pedido via Painel', 1),
(25, 1, 14, '2026-06-01 17:26:55', NULL, 0.0000, 0.0000, 'Aprovado', NULL, 'Impressão Digital', 1),
(26, 1, 15, '2026-06-10 16:36:10', NULL, 704.5000, 0.0000, 'Aprovado', '2026-06-13', '[Panfleto] Panfleto', 5000),
(29, 1, 18, '2026-06-10 16:50:03', NULL, 730.0000, 0.2086, 'Aprovado', '2026-06-15', 'Acabamento', 1),
(30, 1, 19, '2026-06-10 17:17:17', NULL, 1.5000, 0.0000, 'Aprovado', NULL, 'Pedido via Painel', 1);

-- --------------------------------------------------------

--
-- Table structure for table `papel`
--

CREATE TABLE `papel` (
  `id_papel` int(11) NOT NULL,
  `nome` varchar(100) DEFAULT NULL,
  `tipo` varchar(50) DEFAULT NULL,
  `largura_folha` decimal(10,2) DEFAULT NULL,
  `altura_folha` decimal(10,2) DEFAULT NULL,
  `custo_por_folha` decimal(18,4) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `papel`
--

INSERT INTO `papel` (`id_papel`, `nome`, `tipo`, `largura_folha`, `altura_folha`, `custo_por_folha`) VALUES
(1, 'Couchê Brilho', 'Papel', 21.00, 29.70, 0.5000);

-- --------------------------------------------------------

--
-- Table structure for table `servico`
--

CREATE TABLE `servico` (
  `id_servico` int(11) NOT NULL,
  `nome` varchar(100) DEFAULT NULL,
  `descricao` text DEFAULT NULL,
  `tipo` varchar(30) DEFAULT NULL,
  `tipo_cobranca` varchar(20) DEFAULT NULL,
  `custo_fixo` decimal(18,4) DEFAULT NULL,
  `custo_unitario` decimal(18,4) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `servico`
--

INSERT INTO `servico` (`id_servico`, `nome`, `descricao`, `tipo`, `tipo_cobranca`, `custo_fixo`, `custo_unitario`) VALUES
(1, 'Design de Arte', 'Criação de layout', 'design', 'fixo', 50.0000, 0.0000);

-- --------------------------------------------------------

--
-- Table structure for table `servico_item`
--

CREATE TABLE `servico_item` (
  `id_servico_item` int(11) NOT NULL,
  `id_servico` int(11) DEFAULT NULL,
  `id_item` int(11) DEFAULT NULL,
  `quantidade` int(11) DEFAULT NULL,
  `custo_aplicado` decimal(18,4) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `servico_item`
--

INSERT INTO `servico_item` (`id_servico_item`, `id_servico`, `id_item`, `quantidade`, `custo_aplicado`) VALUES
(1, 1, 1, 1, 50.0000);

-- --------------------------------------------------------

--
-- Table structure for table `usuario`
--

CREATE TABLE `usuario` (
  `id_usuario` int(11) NOT NULL,
  `nome` varchar(100) NOT NULL,
  `email` varchar(100) NOT NULL,
  `senha_hash` varchar(255) NOT NULL,
  `tipo` varchar(30) NOT NULL,
  `data_criacao` datetime DEFAULT current_timestamp(),
  `ativo` tinyint(1) DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `usuario`
--

INSERT INTO `usuario` (`id_usuario`, `nome`, `email`, `senha_hash`, `tipo`, `data_criacao`, `ativo`) VALUES
(1, 'Admin Principal', 'admin@grafica.com', 'hash_seguro_123', 'admin', '2026-04-23 14:15:25', 1);

--
-- Indexes for dumped tables
--

--
-- Indexes for table `acabamento`
--
ALTER TABLE `acabamento`
  ADD PRIMARY KEY (`id_acabamento`);

--
-- Indexes for table `acabamento_item`
--
ALTER TABLE `acabamento_item`
  ADD PRIMARY KEY (`id_acabamento_item`),
  ADD KEY `id_acabamento` (`id_acabamento`),
  ADD KEY `id_item` (`id_item`);

--
-- Indexes for table `cliente`
--
ALTER TABLE `cliente`
  ADD PRIMARY KEY (`id_cliente`);

--
-- Indexes for table `corte`
--
ALTER TABLE `corte`
  ADD PRIMARY KEY (`id_corte`);

--
-- Indexes for table `documento`
--
ALTER TABLE `documento`
  ADD PRIMARY KEY (`id_documento`),
  ADD KEY `id_orcamento` (`id_orcamento`);

--
-- Indexes for table `historico_log`
--
ALTER TABLE `historico_log`
  ADD PRIMARY KEY (`id_log`),
  ADD KEY `id_usuario` (`id_usuario`);

--
-- Indexes for table `impressao`
--
ALTER TABLE `impressao`
  ADD PRIMARY KEY (`id_impressao`);

--
-- Indexes for table `item`
--
ALTER TABLE `item`
  ADD PRIMARY KEY (`id_item`),
  ADD KEY `id_orcamento` (`id_orcamento`),
  ADD KEY `id_papel` (`id_papel`),
  ADD KEY `id_impressao` (`id_impressao`);

--
-- Indexes for table `item_corte`
--
ALTER TABLE `item_corte`
  ADD PRIMARY KEY (`id_item_corte`),
  ADD KEY `id_item` (`id_item`),
  ADD KEY `id_corte` (`id_corte`);

--
-- Indexes for table `orcamento`
--
ALTER TABLE `orcamento`
  ADD PRIMARY KEY (`id_orcamento`),
  ADD KEY `id_usuario` (`id_usuario`),
  ADD KEY `id_cliente` (`id_cliente`);

--
-- Indexes for table `papel`
--
ALTER TABLE `papel`
  ADD PRIMARY KEY (`id_papel`);

--
-- Indexes for table `servico`
--
ALTER TABLE `servico`
  ADD PRIMARY KEY (`id_servico`);

--
-- Indexes for table `servico_item`
--
ALTER TABLE `servico_item`
  ADD PRIMARY KEY (`id_servico_item`),
  ADD KEY `id_servico` (`id_servico`),
  ADD KEY `id_item` (`id_item`);

--
-- Indexes for table `usuario`
--
ALTER TABLE `usuario`
  ADD PRIMARY KEY (`id_usuario`),
  ADD UNIQUE KEY `email` (`email`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `acabamento`
--
ALTER TABLE `acabamento`
  MODIFY `id_acabamento` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=12;

--
-- AUTO_INCREMENT for table `acabamento_item`
--
ALTER TABLE `acabamento_item`
  MODIFY `id_acabamento_item` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- AUTO_INCREMENT for table `cliente`
--
ALTER TABLE `cliente`
  MODIFY `id_cliente` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=20;

--
-- AUTO_INCREMENT for table `corte`
--
ALTER TABLE `corte`
  MODIFY `id_corte` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `documento`
--
ALTER TABLE `documento`
  MODIFY `id_documento` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `historico_log`
--
ALTER TABLE `historico_log`
  MODIFY `id_log` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `impressao`
--
ALTER TABLE `impressao`
  MODIFY `id_impressao` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `item`
--
ALTER TABLE `item`
  MODIFY `id_item` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `item_corte`
--
ALTER TABLE `item_corte`
  MODIFY `id_item_corte` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `orcamento`
--
ALTER TABLE `orcamento`
  MODIFY `id_orcamento` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=31;

--
-- AUTO_INCREMENT for table `papel`
--
ALTER TABLE `papel`
  MODIFY `id_papel` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT for table `servico`
--
ALTER TABLE `servico`
  MODIFY `id_servico` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `servico_item`
--
ALTER TABLE `servico_item`
  MODIFY `id_servico_item` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `usuario`
--
ALTER TABLE `usuario`
  MODIFY `id_usuario` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `acabamento_item`
--
ALTER TABLE `acabamento_item`
  ADD CONSTRAINT `acabamento_item_ibfk_1` FOREIGN KEY (`id_acabamento`) REFERENCES `acabamento` (`id_acabamento`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `acabamento_item_ibfk_2` FOREIGN KEY (`id_item`) REFERENCES `item` (`id_item`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Constraints for table `documento`
--
ALTER TABLE `documento`
  ADD CONSTRAINT `documento_ibfk_1` FOREIGN KEY (`id_orcamento`) REFERENCES `orcamento` (`id_orcamento`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Constraints for table `historico_log`
--
ALTER TABLE `historico_log`
  ADD CONSTRAINT `historico_log_ibfk_1` FOREIGN KEY (`id_usuario`) REFERENCES `usuario` (`id_usuario`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Constraints for table `item`
--
ALTER TABLE `item`
  ADD CONSTRAINT `item_ibfk_1` FOREIGN KEY (`id_orcamento`) REFERENCES `orcamento` (`id_orcamento`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `item_ibfk_2` FOREIGN KEY (`id_papel`) REFERENCES `papel` (`id_papel`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `item_ibfk_3` FOREIGN KEY (`id_impressao`) REFERENCES `impressao` (`id_impressao`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Constraints for table `item_corte`
--
ALTER TABLE `item_corte`
  ADD CONSTRAINT `item_corte_ibfk_1` FOREIGN KEY (`id_item`) REFERENCES `item` (`id_item`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `item_corte_ibfk_2` FOREIGN KEY (`id_corte`) REFERENCES `corte` (`id_corte`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Constraints for table `orcamento`
--
ALTER TABLE `orcamento`
  ADD CONSTRAINT `orcamento_ibfk_1` FOREIGN KEY (`id_usuario`) REFERENCES `usuario` (`id_usuario`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `orcamento_ibfk_2` FOREIGN KEY (`id_cliente`) REFERENCES `cliente` (`id_cliente`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Constraints for table `servico_item`
--
ALTER TABLE `servico_item`
  ADD CONSTRAINT `servico_item_ibfk_1` FOREIGN KEY (`id_servico`) REFERENCES `servico` (`id_servico`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `servico_item_ibfk_2` FOREIGN KEY (`id_item`) REFERENCES `item` (`id_item`) ON DELETE SET NULL ON UPDATE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;


/* MIGRAÇÕES ADICIONADAS */

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
