import { useContext, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api, { mensagemErro } from "../../services/api.js";
import { SessionContext } from "../../services/session.js";
import { Button, Feedback, InputField } from "../../components/ui";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowUpRight, BarChart3, Check, PackageCheck } from "lucide-react";

const loginSchema = z.object({
  login: z.string().min(3, "Mínimo 3 caracteres"),
  senha: z.string().min(1, "A senha é obrigatória"),
});

const cadastroSchema = z.object({
  login: z.string().min(3, "Mínimo 3 caracteres"),
  senha: z.string().min(12, "A senha deve ter no mínimo 12 caracteres"),
});

export default function Acesso({ cadastro = false }) {
  const { setUsuario } = useContext(SessionContext);
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(cadastro ? cadastroSchema : loginSchema),
  });

  const onSubmit = async (data) => {
    setError("");
    setMessage("");
    try {
      const response = await api.post(
        `/api/auth/${cadastro ? "register" : "login"}`,
        data,
      );
      if (cadastro) setMessage(response.data.message);
      else {
        setUsuario(response.data.usuario);
        navigate("/");
      }
    } catch (e) {
      setError(mensagemErro(e));
    }
  };

  return (
    <div className="access-page">
      <aside className="access-brand">
        <div className="access-brand-top">
          <img src="/logomarca-grafica-maxima.png" alt="Gráfica Máxima" />
          <span>GESTÃO PARA QUEM FAZ ACONTECER</span>
        </div>
        <div className="access-brand-copy">
          <span className="access-eyebrow">DA IDEIA À IMPRESSÃO</span>
          <h1>Sua gráfica, no ritmo da sua criatividade.</h1>
          <p>
            Orçamentos e operação em um só lugar. Mais clareza para cuidar de
            cada detalhe e fazer bons trabalhos acontecerem.
          </p>
        </div>
        <div className="access-brand-features" aria-label="Recursos do sistema">
          <span><Check size={15} aria-hidden="true" /> Orçamentos organizados</span>
          <span><PackageCheck size={15} aria-hidden="true" /> Materiais à mão</span>
          <span><BarChart3 size={15} aria-hidden="true" /> Resultados em foco</span>
        </div>
        <div className="access-brand-footer">
          <span>BOAS IDEIAS MERECEM UMA GRANDE IMPRESSÃO.</span>
          <ArrowUpRight size={18} aria-hidden="true" />
        </div>
      </aside>
      <section className="access-content">
        <form className="access-form" onSubmit={handleSubmit(onSubmit)}>
          <small className="access-form-kicker">
            <span aria-hidden="true" />
            {cadastro ? "NOVO POR AQUI?" : "BEM-VINDO DE VOLTA"}
          </small>
          <h1>{cadastro ? "Crie sua conta" : "Entre na sua conta"}</h1>
          <p>
            {cadastro
              ? "Escolha seus dados de acesso para começar."
              : "Acesse seu espaço de trabalho da Gráfica Máxima."}
          </p>
          <InputField
            label="Login"
            {...register("login")}
            error={errors.login?.message}
            maxLength={80}
            autoComplete="username"
            placeholder={
              cadastro ? "Escolha seu nome de usuário" : "Seu nome de usuário"
            }
          />
          <InputField
            label="Senha"
            {...register("senha")}
            type="password"
            error={errors.senha?.message}
            maxLength={256}
            autoComplete={cadastro ? "new-password" : "current-password"}
            placeholder={cadastro ? "Crie sua senha" : "Sua senha"}
          />
          <Feedback error={error} message={message} />
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting
              ? "Aguarde..."
              : cadastro
                ? "Criar minha conta"
                : "Entrar no sistema"}
          </Button>
          <Link className="access-link" to={cadastro ? "/login" : "/cadastro"}>
            {cadastro ? "Já tem uma conta? Entre" : "Primeiro acesso? Criar conta"}
          </Link>
          <small className="access-privacy">Seu espaço de trabalho, simples e seguro.</small>
        </form>
      </section>
    </div>
  );
}
