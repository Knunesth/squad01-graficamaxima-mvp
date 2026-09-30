const { numero, texto, dinheiro } = require('../utils/validation');
function calcularMetroQuadrado(dados, precos) {
  try {
    const tipo = texto(dados?.tipo_servico, 'Tipo de serviço', 50, true).toLowerCase();
    if (!Object.hasOwn(precos, tipo)) return { sucesso: false, erros: [{ campo: 'tipo_servico', mensagem: 'Tipo de serviço inválido.' }] };
    const largura = numero(dados.largura, 'Largura', { min: 0.001, max: 1000 });
    const altura = numero(dados.altura, 'Altura', { min: 0.001, max: 1000 });
    const quantidade = numero(dados.quantidade, 'Quantidade', { min: 1, max: 1000000, inteiro: true });
    const preco = numero(dados.preco_por_m2 ?? precos[tipo], 'Preço por m²', { min: 0.0001, max: 1000000 });
    const margem = numero(dados.margem_lucro ?? 0, 'Acréscimo percentual', { max: 1000 });
    const area = largura * altura;
    const custo = numero(area * preco * quantidade, 'Custo total', { max: 1e12 });
    const total = dinheiro(numero(custo * (1 + margem / 100), 'Valor total', { max: 1e12 }));
    return { sucesso: true, resultado: {
      tipo_servico: tipo, dimensoes: { largura_m: largura, altura_m: altura, area_por_peca_m2: dinheiro(area) },
      quantidade, area_total_m2: dinheiro(area * quantidade), preco_por_m2: preco,
      custo_por_peca: dinheiro(area * preco), custo_total: dinheiro(custo), margem_lucro_pct: margem,
      valor_margem: dinheiro(total - custo), valor_unitario: dinheiro(total / quantidade), valor_total: total,
    } };
  } catch (error) { return { sucesso: false, erros: [{ campo: 'dados', mensagem: error.message }] }; }
}
module.exports = { calcularMetroQuadrado };
