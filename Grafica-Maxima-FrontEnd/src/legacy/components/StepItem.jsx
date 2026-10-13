const StepItem = ({ label, index, ativo, concluido, isLast }) => (
  <div className="step-item">
    <div className="step-content">
      <div className={`circle-icon ${concluido ? "done" : ""} ${ativo ? "active" : ""}`}>
        {index === 0 && "📋"}
        {index === 1 && "⚙️"}
        {index >= 2 && "✅"}
      </div>
      <div className="step-text">
        <span className="step-passo">Passo {index + 1}</span>
        <span className="step-nome">{label}</span>
      </div>
    </div>
    {!isLast && (
      <div className={`step-line ${concluido ? "line-active" : ""}`}></div>
    )}
  </div>
);

export default StepItem;