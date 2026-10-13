import { useContext, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api, { mensagemErro } from "../../services/api.js";
import { SessionContext } from "../../services/session.js";
import { Button, Feedback, InputField } from "../../components/ui";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

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
        <div className="logo-placeholder">LOGO DA GRÁFICA</div>
        <h1>Gráfica Máxima</h1>
        <h2>Sua gestão em um só lugar.</h2>
        <p>
          Organize orçamentos, acompanhe o estoque e analise seus resultados.
        </p>
        <strong>ORÇAMENTOS / ESTOQUE / DASHBOARDS</strong>
      </aside>
      <section className="access-content">
        <form className="access-form" onSubmit={handleSubmit(onSubmit)}>
          <small>{cadastro ? "CADASTRO" : "ACESSO"}</small>
          <h1>{cadastro ? "Crie sua conta" : "Entre na sua conta"}</h1>
          <p>
            {cadastro
              ? "Defina seu login e sua senha para acessar o sistema da Gráfica Máxima."
              : "Acesse seus orçamentos e o catálogo da Gráfica Máxima."}
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
            {isSubmitting ? "Aguarde..." : cadastro ? "Criar conta" : "Entrar"}
          </Button>
          <Link className="access-link" to={cadastro ? "/login" : "/cadastro"}>
            {cadastro ? "Já tenho uma conta" : "Criar uma conta"}
          </Link>
        </form>
      </section>
    </div>
  );
}
