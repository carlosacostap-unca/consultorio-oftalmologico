"use client";

import { useEffect, useState } from "react";
import { pb } from "@/lib/pocketbase";
import Link from "next/link";

export default function Home() {
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    setUser(pb.authStore.record);
    
    // Escuchar cambios en la autenticación
    const unsubscribe = pb.authStore.onChange((token, record) => {
      setUser(record);
    }, true);

    return () => {
      unsubscribe();
    };
  }, []);

  const loginWithGoogle = async () => {
    setIsLoading(true);
    try {
      // Iniciar sesión con Google usando OAuth2
      await pb.collection("users").authWithOAuth2({ provider: "google" });
    } catch (error) {
      console.error("Error al iniciar sesión con Google:", error);
      alert("Hubo un error al intentar iniciar sesión. Verifica la consola.");
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    pb.authStore.clear();
  };

  if (!isMounted) {
    return null; // O un spinner de carga
  }

  if (user) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 p-4 sm:p-8">
        <div className="max-w-5xl mx-auto">
          {/* Cabecera */}
          <div className="flex flex-col sm:flex-row items-center justify-between bg-white dark:bg-zinc-900 rounded-2xl shadow-sm p-6 mb-8 border border-zinc-200 dark:border-zinc-800">
            <div className="flex items-center gap-4 mb-4 sm:mb-0">
              {user.avatar ? (
                <img 
                  src={pb.files.getURL(user, user.avatar)} 
                  alt="Avatar" 
                  className="w-16 h-16 rounded-full border-2 border-blue-500 object-cover"
                />
              ) : (
                <div className="w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center text-blue-600 dark:text-blue-400 text-2xl font-bold">
                  {user.name?.charAt(0) || user.email?.charAt(0) || "U"}
                </div>
              )}
              <div>
                <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
                  ¡Bienvenido/a, {user.name || "Usuario"}!
                </h1>
                <p className="text-zinc-500 dark:text-zinc-400 text-sm">
                  {user.email}
                </p>
              </div>
            </div>
            <button
              onClick={logout}
              className="py-2.5 px-5 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 rounded-xl font-medium transition-colors"
            >
              Cerrar sesión
            </button>
          </div>

          {/* Panel de Control */}
          <h2 className="text-2xl font-bold text-zinc-800 dark:text-zinc-200 mb-6">Panel de Control</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            
            {/* Gestión de Pacientes */}
            <Link 
              href="/pacientes" 
              className="group bg-white dark:bg-zinc-900 p-6 rounded-2xl shadow-sm border border-zinc-200 dark:border-zinc-800 hover:border-blue-500 dark:hover:border-blue-500 transition-all hover:shadow-md flex flex-col h-full"
            >
              <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 mb-2">Gestión de Pacientes</h3>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 flex-grow">Registra nuevos pacientes, actualiza sus datos personales y mantén su historial al día.</p>
            </Link>

            {/* Gestión de Turnos */}
            <Link 
              href="/turnos" 
              className="group bg-white dark:bg-zinc-900 p-6 rounded-2xl shadow-sm border border-zinc-200 dark:border-zinc-800 hover:border-green-500 dark:hover:border-green-500 transition-all hover:shadow-md flex flex-col h-full"
            >
              <div className="w-12 h-12 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 rounded-xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 mb-2">Gestión de Turnos</h3>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 flex-grow">Agenda, reprograma o cancela citas médicas. Visualiza el calendario de atenciones.</p>
            </Link>

            {/* Gestión de Consultas */}
            <Link 
              href="/consultas" 
              className="group bg-white dark:bg-zinc-900 p-6 rounded-2xl shadow-sm border border-zinc-200 dark:border-zinc-800 hover:border-purple-500 dark:hover:border-purple-500 transition-all hover:shadow-md flex flex-col h-full"
            >
              <div className="w-12 h-12 bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 rounded-xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 mb-2">Gestión de Consultas</h3>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 flex-grow">Registra diagnósticos, recetas, órdenes de estudios y la evolución clínica detallada.</p>
            </Link>

            {/* Gestión de Recetas */}
            <Link 
              href="/recetas" 
              className="group bg-white dark:bg-zinc-900 p-6 rounded-2xl shadow-sm border border-zinc-200 dark:border-zinc-800 hover:border-orange-500 dark:hover:border-orange-500 transition-all hover:shadow-md flex flex-col h-full"
            >
              <div className="w-12 h-12 bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 rounded-xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9.5a2.5 2.5 0 00-2.5-2.5H15" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 mb-2">Gestión de Recetas</h3>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 flex-grow">Emite y administra recetas médicas vinculadas a las consultas de los pacientes.</p>
            </Link>

          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-zinc-50 dark:bg-zinc-900 p-4">
      <div className="max-w-md w-full bg-white dark:bg-black rounded-2xl shadow-lg p-8 text-center border border-zinc-200 dark:border-zinc-800">
        <div className="mb-8 flex justify-center">
          <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/30">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-8 h-8 text-white">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
            </svg>
          </div>
        </div>
        
        <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100 mb-3">
          Consultorio Oftalmológico
        </h1>
        <p className="text-zinc-500 dark:text-zinc-400 mb-10">
          Inicia sesión para acceder a tu portal de paciente y gestionar tus turnos.
        </p>

        <button
          onClick={loginWithGoogle}
          disabled={isLoading}
          className="w-full flex items-center justify-center gap-3 py-3 px-4 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200 rounded-xl font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <div className="w-5 h-5 border-2 border-zinc-400 border-t-transparent rounded-full animate-spin"></div>
          ) : (
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
          )}
          <span>{isLoading ? "Conectando..." : "Continuar con Google"}</span>
        </button>
      </div>
    </div>
  );
}
