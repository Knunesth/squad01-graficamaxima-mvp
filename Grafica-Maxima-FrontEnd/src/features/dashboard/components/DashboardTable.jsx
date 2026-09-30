import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { moeda } from '../../../services/format';
import { PlusCircle } from 'lucide-react';

export function DashboardTable({ orcamentosPeriodo = [], filtroStatus, statusCounts = {}, totalNovos = 0, mes }) {
  const lista = filtroStatus 
    ? orcamentosPeriodo.filter(item => item.status === filtroStatus)
    : orcamentosPeriodo;

  const totalItemCount = filtroStatus ? (statusCounts[filtroStatus]?.count || 0) : totalNovos;

  const monthLabel = useMemo(() => {
    if (!mes) return '';
    const [y, m] = mes.split('-');
    const dt = new Date(y, m - 1, 1);
    const mName = format(dt, "MMMM 'de' yyyy", { locale: ptBR });
    return mName.charAt(0).toUpperCase() + mName.slice(1);
  }, [mes]);

  const Badge = ({ status }) => {
    let classes = "px-2 py-0.5 rounded text-xs font-medium relative z-10 ";
    switch (status) {
      case 'Aberto': classes += 'bg-slate-100 text-slate-700 border border-slate-200'; break;
      case 'Em análise': classes += 'bg-blue-50 text-blue-700 border border-blue-200'; break;
      case 'Aprovado': classes += 'bg-green-50 text-green-700 border border-green-200'; break;
      case 'Inativo': classes += 'bg-red-50 text-red-700 border border-red-200'; break;
      case 'Finalizado': classes += 'bg-purple-50 text-purple-700 border border-purple-200'; break;
      default: classes += 'bg-gray-100 text-gray-700 border border-gray-200';
    }
    return <span className={classes}>{status || 'Sem status'}</span>;
  };

  return (
    <section>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-3 gap-2">
        <h2 className="text-sm font-semibold tracking-wide text-[var(--ink-muted)] uppercase">
          Orçamentos do Período
        </h2>
        {lista.length === 50 && totalItemCount > 50 && (
          <span className="text-xs text-[var(--ink-light)] bg-[var(--surface)] px-2 py-1 rounded border border-[var(--line)]">
            Mostrando 50 de {totalItemCount}
          </span>
        )}
      </div>

      <div className="bg-[var(--surface)] border border-[var(--line)] rounded-xl overflow-hidden shadow-sm">
        {lista.length === 0 ? (
          <div className="p-16 text-center flex flex-col items-center justify-center bg-[var(--paper)] m-4 rounded-md border border-dashed border-[var(--line-strong)]">
            <span className="text-[var(--ink)] font-medium mb-1">
              {filtroStatus 
                ? `Nenhum orçamento com status "${filtroStatus}" em ${monthLabel}.` 
                : `Nenhum orçamento em ${monthLabel}.`}
            </span>
            <span className="text-sm text-[var(--ink-light)] mb-6">
              {filtroStatus ? 'Tente limpar o filtro do pipeline.' : 'Crie um novo orçamento para começar.'}
            </span>
            {!filtroStatus && (
              <Link to="/orcamentos/novo" className="button button-primary gap-2">
                <PlusCircle size={18} />
                Criar orçamento
              </Link>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-[var(--surface)] text-[var(--ink-light)] border-b border-[var(--line)] uppercase text-xs tracking-wider relative z-20">
                <tr>
                  <th className="px-6 py-4 font-medium">ID</th>
                  <th className="px-6 py-4 font-medium">Cliente</th>
                  <th className="px-6 py-4 font-medium">Criação</th>
                  <th className="px-6 py-4 font-medium">Validade</th>
                  <th className="px-6 py-4 font-medium">Status</th>
                  <th className="px-6 py-4 font-medium text-right">Valor Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--line)]">
                {lista.map((orc) => (
                  <tr 
                    key={orc.id_orcamento}
                    className="hover:bg-[var(--surface-hover)] transition-colors group relative"
                  >
                    <td className="px-6 py-4 font-mono font-medium text-[var(--ink)]">
                      <Link 
                        to={`/orcamentos/${orc.id_orcamento}/editar`}
                        className="before:absolute before:inset-0 before:content-[''] focus:outline-none focus:before:ring-2 focus:before:ring-inset focus:before:ring-[var(--accent)]"
                        aria-label={`Ver orçamento ORC-${String(orc.id_orcamento).padStart(4, '0')}`}
                      >
                        ORC-{String(orc.id_orcamento).padStart(4, '0')}
                      </Link>
                    </td>
                    <td className="px-6 py-4 relative z-10 pointer-events-none">
                      {orc.nome_cliente ? (
                        <span className="font-medium text-[var(--ink)]">{orc.nome_cliente}</span>
                      ) : (
                        <span className="text-gray-400 italic">Sem cliente</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-[var(--ink-light)] relative z-10 pointer-events-none">
                      {orc.data_criacao ? format(parseISO(orc.data_criacao), "dd/MM/yyyy HH:mm") : '-'}
                    </td>
                    <td className="px-6 py-4 text-[var(--ink-light)] relative z-10 pointer-events-none">
                      {orc.data_validade ? (
                        format(parseISO(orc.data_validade), "dd/MM/yyyy")
                      ) : (
                        <span className="text-gray-400 italic">Sem validade</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <Badge status={orc.status} />
                    </td>
                    <td className="px-6 py-4 text-right font-mono font-medium text-[var(--ink)] relative z-10 pointer-events-none">
                      {moeda(Number(orc.valor_total || 0))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
