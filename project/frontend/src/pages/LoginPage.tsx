import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "@/store/authStore";
import { Utensils } from "lucide-react";

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isRegistering, setIsRegistering] = useState(false);
  const [name, setName] = useState("");

  const { login, register, isLoading, error, isAuthenticated, clearError } =
    useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) {
      navigate("/dashboard");
    }
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    return () => clearError();
  }, [clearError]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (isRegistering) {
        await register(email, password, name);
      } else {
        await login(email, password);
      }
    } catch (error) {
      // c8 ignore next
      console.error("Authentication error:", error);
    }
  };

  return (
    <div className="min-h-screen w-screen grid place-items-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 px-4">
      <div
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 w-full max-w-md border border-transparent"
        role="main"
        aria-labelledby="login-title"
      >
        <div id="login-title" className="flex items-center justify-center gap-3 mb-2">
          <Utensils className="w-10 h-10 text-primary-600" />
          <h1 className="text-28 font-bold text-gray-900 dark:text-white m-0">Restaurant Intelligence</h1>
        </div>
        <p className="text-gray-600 dark:text-gray-400 text-center mb-6">
          {isRegistering ? "Crie sua conta e acelere seus insights" : "Entre com suas credenciais"}
        </p>

        <form
          onSubmit={handleSubmit}
          className="space-y-4"
          aria-label={isRegistering ? "Registration form" : "Login form"}
        >
          {isRegistering && (
            <div>
              <label htmlFor="name" className="label">
                Nome
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="input"
                required
                placeholder="Chef Ana Martins"
                aria-required="true"
              />
            </div>
          )}

          <div>
            <label htmlFor="email" className="label">
              E-mail
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input"
              required
              placeholder="contato@pizzaria-da-vila.com"
              aria-required="true"
              autoComplete="email"
            />
          </div>

          <div>
            <label htmlFor="password" className="label">
              Senha
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input"
              required
              placeholder="******"
              minLength={6}
              aria-required="true"
              aria-describedby={
                isRegistering ? "password-requirements" : undefined
              }
              autoComplete={isRegistering ? "new-password" : "current-password"}
            />
            {isRegistering && (
              <p
                id="password-requirements" className="text-12 text-gray-500 dark:text-gray-400 mt-1">Mínimo de 6 caracteres
              </p>
            )}
          </div>

          {/* c8 ignore start */}
          {error && (
            <div
              className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 p-3 rounded-lg text-16"
              role="alert"
              aria-live="polite"
            >
              {error}
            </div>
          )}
          {/* c8 ignore stop */}

          <button
            type="submit"
            disabled={isLoading}
            className="btn-primary w-full"
            aria-busy={isLoading}
          >
            {isLoading
              ? "Carregando..."
              : isRegistering
              ? "Criar conta" : "Entrar"}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => {
              setIsRegistering(!isRegistering);
              clearError();
            }}
            className="text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 text-16"
            aria-label={
              isRegistering ? "Switch to sign in" : "Switch to registration"
            }
          >
            {isRegistering
              ? "Já tem uma conta? Entrar" : "Não tem uma conta? Cadastre-se"}
          </button>
        </div>
      </div>
    </div>
  );
};




