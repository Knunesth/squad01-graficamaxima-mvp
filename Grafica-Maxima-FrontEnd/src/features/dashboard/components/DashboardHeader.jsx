import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { PlusCircle, Calendar, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { format, addMonths, subMonths, setMonth, setYear } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function DashboardHeader({ mes, setMes }) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  // Parse current selected month
  const currentDate = useMemo(() => {
    if (!mes) return new Date();
    const [y, m] = mes.split('-');
    return new Date(y, m - 1, 1);
  }, [mes]);

  // Handle outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const formattedMonth = format(currentDate, "MMMM 'de' yyyy", { locale: ptBR });

  const handlePrevMonth = () => {
    const prev = subMonths(currentDate, 1);
    setMes(format(prev, 'yyyy-MM'));
  };

  const handleNextMonth = () => {
    const next = addMonths(currentDate, 1);
    setMes(format(next, 'yyyy-MM'));
  };

  const selectSpecificMonth = (monthIndex) => {
    const next = setMonth(currentDate, monthIndex);
    setMes(format(next, 'yyyy-MM'));
    setIsOpen(false);
  };

  return (
    <header className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--ink)]">Dashboard</h1>
        <p className="text-sm text-[var(--ink-light)] mt-1">Visão geral dos orçamentos e performance comercial.</p>
      </div>

      <div className="flex flex-wrap items-center gap-3 w-full md:w-auto relative" ref={containerRef}>
        <div className="flex items-center">
          <button 
            type="button"
            onClick={handlePrevMonth}
            className="p-1.5 border border-[var(--line)] rounded-l-md bg-[var(--paper)] hover:bg-[var(--surface)] text-[var(--ink-light)] transition-colors"
            aria-label="Mês anterior"
          >
            <ChevronLeft size={16} />
          </button>
          
          <button 
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="flex items-center justify-between gap-2 border-y border-[var(--line)] bg-[var(--paper)] px-3 py-1.5 min-w-[160px] hover:bg-[var(--surface)] transition-colors focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
            aria-label="Seletor de mês"
            aria-expanded={isOpen}
          >
            <span className="flex items-center gap-2 text-sm font-medium text-[var(--ink)] capitalize">
              <Calendar size={16} className="text-[var(--ink-light)]" />
              {formattedMonth}
            </span>
            <ChevronDown size={14} className="text-[var(--ink-light)]" />
          </button>
          
          <button 
            type="button"
            onClick={handleNextMonth}
            className="p-1.5 border border-[var(--line)] rounded-r-md bg-[var(--paper)] hover:bg-[var(--surface)] text-[var(--ink-light)] transition-colors"
            aria-label="Mês seguinte"
          >
            <ChevronRight size={16} />
          </button>
        </div>

        {isOpen && (
          <div className="absolute top-full right-0 md:right-auto md:left-8 mt-1 w-64 bg-[var(--paper)] border border-[var(--line)] rounded-lg shadow-lg z-10 p-4">
            <div className="flex items-center justify-between mb-4">
              <button type="button" onClick={() => setMes(format(setYear(currentDate, currentDate.getFullYear() - 1), 'yyyy-MM'))} className="p-1 hover:bg-[var(--surface)] rounded"><ChevronLeft size={16} /></button>
              <strong className="text-sm">{currentDate.getFullYear()}</strong>
              <button type="button" onClick={() => setMes(format(setYear(currentDate, currentDate.getFullYear() + 1), 'yyyy-MM'))} className="p-1 hover:bg-[var(--surface)] rounded"><ChevronRight size={16} /></button>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {Array.from({ length: 12 }).map((_, i) => {
                const monthName = format(new Date(2000, i, 1), 'MMM', { locale: ptBR });
                const isSelected = currentDate.getMonth() === i;
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => selectSpecificMonth(i)}
                    className={`text-xs p-2 rounded-md capitalize transition-colors ${isSelected ? 'bg-[var(--accent)] text-white font-bold' : 'hover:bg-[var(--surface)] text-[var(--ink)]'}`}
                  >
                    {monthName}
                  </button>
                );
              })}
            </div>
          </div>
        )}
        
        <Link to="/orcamentos/novo" className="button button-primary gap-2 whitespace-nowrap ml-2">
          <PlusCircle size={18} />
          Criar orçamento
        </Link>
      </div>
    </header>
  );
}
