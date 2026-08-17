## 1. Imagen Docker reproducible

- [x] 1.1 Crear un Dockerfile multi-etapa con Node.js 22 que compile y ejecute la salida standalone de Next.js como usuario sin privilegios.
- [x] 1.2 Crear `.dockerignore` para excluir credenciales, configuración local, dependencias y artefactos generados del contexto de build.

## 2. Operación en Dokploy

- [x] 2.1 Documentar la configuración de staging y producción con builder Dockerfile, puerto 3000, variables de ejecución, verificación de SHA y rollback.

## 3. Verificación y despliegue

- [ ] 3.1 Construir la imagen desde un contexto limpio y comprobar que contiene los recursos standalone sin declarar secretos como argumentos de build.
- [x] 3.2 Ejecutar lint, TypeScript, build de producción, validación OpenSpec estricta y comprobaciones de formato del diff.
- [ ] 3.3 Integrar en `develop`, configurar staging con Dockerfile y completar un smoke test no destructivo.
- [ ] 3.4 Integrar en `main`, configurar producción con Dockerfile y verificar el SHA desplegado sin ejecutar migraciones ni modificar datos.
- [ ] 3.5 Reanudar la publicación de escritorio `0.1.10` sólo en `pilot` después de confirmar producción; mantener `stable` sin cambios.
