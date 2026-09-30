import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Bar, Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, PointElement, LineElement, Tooltip } from 'chart.js';
import { Activity, FilePlus, CheckCircle, ArrowRight } from 'lucide-react';
import { mensagemErro } from '../services/api';
import { Feedback, Spinner } from '../components/ui';
import { PageHeader } from '../components/layout';
import { aprovado, dataBR, moeda } from '../services/format';
import { useDashboard } from '../hooks/useDashboard';
ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement, Tooltip);
function MiniGrafico({ series, label, line = false }) {
  const Component = line ? Line : Bar;
  const data = { labels: series.map(s => `Sem. ${s.semana}`), datasets: [{ label, data: series.map(s => s.valor), borderColor: '#333', backgroundColor: series.map((_, i) => i === series.length - 1 ? '#333' : '#999'), borderWidth: line ? 3 : 0, pointRadius: 3, barThickness: 28 }] };
  return <div className="mini-chart"><Component aria-label={label} role="img" data={data} options={{ maintainAspectRatio: false, animation: false, plugins: { legend: { display: false } }, scales: { x: { grid: { display: false }, ticks: { font: { size: 10 } } }, y: { beginAtZero: true, ticks: { maxTicksLimit: 3, font: { size: 10 } }, border: { display: false } } } }} /></div>;
}
export default function Dashboard() {
  const [mes, setMes] = useState(() => { const now = new Date(); return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2,'0')}`; });
  
  const { data: dados, isLoading, error } = useDashboard(mes);
  const errorMessage = error ? mensagemErro(error) : '';
  const series = (key, divider = 1) => (dados?.semanas || []).map(s => ({ semana: s.semana, valor: s[key] / divider }));
  return <><PageHeader title="Dashboard" subtitle="Visão geral dos orçamentos da Gráfica Máxima." /><div className="dashboard-period"><span>Orçamentos criados no período selecionado</span><input aria-label="Mês do dashboard" type="month" value={mes} onChange={e => e.target.value && setMes(e.target.value)} /></div><Feedback error={errorMessage} />
    {isLoading ? <div className="panel" style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}><Spinner /> <span style={{marginLeft: '1rem'}}>Carregando indicadores...</span></div> : !dados ? null : <><div className="metric-grid">
      <article className="panel metric-card"><h2 className="flex align-center gap-2"><Activity size={18} /> Orçamentos ativos</h2><strong>{moeda(dados.valorAtivo)}</strong><small>{dados.ativos} orçamentos · valor total ativo</small><MiniGrafico line label="Valor ativo por semana de criação" series={series('ativos', 1000)} /><small>Valor atualmente ativo por semana · R$ mil</small></article>
      <article className="panel metric-card"><h2 className="flex align-center gap-2"><FilePlus size={18} /> Novos orçamentos</h2><strong>{dados.novos}</strong><small>Orçamentos criados neste mês</small><MiniGrafico label="Novos orçamentos por semana" series={series('novos')} /><small>Quantidade por semana</small></article>
      <article className="panel metric-card"><h2 className="flex align-center gap-2"><CheckCircle size={18} /> Orçamentos aprovados</h2><strong>{dados.aprovados}</strong><small>{(dados.novos ? 100 * dados.aprovados / dados.novos : 0).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}% dos {dados.novos} novos orçamentos</small><MiniGrafico label="Aprovados por semana de criação" series={series('aprovados')} /><small>Atualmente aprovados por semana de criação</small></article>
    </div><section className="panel recent-quotes"><header><h2>Últimos orçamentos</h2><Link className="button button-subtle gap-2" to="/orcamentos">Ver todos <ArrowRight size={18} /></Link></header><div className="table-scroll"><table><thead><tr><th>ID</th><th>Cliente</th><th>Data de criação</th><th>Validade</th><th>Status</th><th>Valor</th></tr></thead><tbody>{dados.recentes.map(item => <tr key={item.id_orcamento}><td><Link to={`/status-orcamento/${item.id_orcamento}`}>#{item.id_orcamento}</Link></td><td>{item.nome_cliente || 'Cliente não vinculado'}</td><td>{dataBR(item.data_criacao)}</td><td>{dataBR(item.data_validade)}</td><td>{aprovado(item.status) ? 'Aprovado' : item.status}</td><td>{moeda(item.valor_total)}</td></tr>)}{!dados.recentes.length && <tr><td colSpan="6">Nenhum orçamento cadastrado.</td></tr>}</tbody></table></div></section></>}
  </>;
}
