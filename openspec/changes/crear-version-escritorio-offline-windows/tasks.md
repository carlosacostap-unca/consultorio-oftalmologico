## 1. Baseline y contratos

- [x] 1.1 Confirmar la versión/esquema de PocketBase central y documentar las variables de URL central sin exponer secretos
- [x] 1.2 Leer las guías locales de Next.js para configuración, Route Handlers, runtime Node y despliegue standalone
- [x] 1.3 Incorporar tipos compartidos para dispositivo, operación, cursor, conflicto, estado y resultados de sincronización
- [x] 1.4 Implementar y probar utilidades puras de IDs, fichas provisorias, comparación de versiones, campos cambiados y orden de dependencias

## 2. Esquema central y API autoritativa

- [x] 2.1 Crear un script idempotente de esquema para metadatos/bajas lógicas en pacientes, consultas y recetas y para colecciones de dispositivos, operaciones aplicadas y conflictos
- [x] 2.2 Extender el bootstrap del PocketBase de test con el esquema de sincronización
- [x] 2.3 Implementar autenticación y autorización común para `/api/desktop-sync/v1`
- [x] 2.4 Implementar registro/activación de dispositivo y bootstrap paginado de usuarios, referencias y datos clínicos
- [x] 2.5 Implementar push idempotente con validación, orden, asignación de ficha definitiva y confirmaciones por operación
- [x] 2.6 Implementar detección de duplicados y conflictos por versión/campos con política conservadora para consultas y recetas
- [x] 2.7 Implementar pull incremental estable por colección y propagación de bajas lógicas
- [x] 2.8 Implementar listado y resolución autorizada/auditada de conflictos
- [x] 2.9 Agregar pruebas de API para autorización, idempotencia, cursores, fichas, duplicados, fusión y conflictos

## 3. Runtime de escritorio y base local

- [x] 3.1 Agregar Electron, electron-builder y scripts de desarrollo, empaquetado e instalador Windows
- [x] 3.2 Configurar Next.js standalone y crear proceso principal, preload tipado y ventana aislada
- [x] 3.3 Incorporar el binario PocketBase Windows con versión fijada y verificación de checksum en el proceso de preparación
- [x] 3.4 Crear migraciones PocketBase locales compatibles y hooks que registren operaciones sin producir eco durante pull
- [x] 3.5 Implementar directorios durables, identidad/código de equipo, puertos loopback, health checks y cierre ordenado
- [x] 3.6 Proteger token central y credenciales técnicas con `safeStorage` y sanitizar logs rotados
- [x] 3.7 Implementar una pantalla de error/diagnóstico cuando los servicios locales no puedan iniciar

## 4. Activación, autenticación y selección de datos

- [x] 4.1 Hacer que `lib/pocketbase.ts` resuelva PocketBase central en web y PocketBase local desde preload en escritorio
- [x] 4.2 Implementar el asistente de activación online, registro de equipo y bootstrap reanudable
- [x] 4.3 Replicar el usuario activado en PocketBase local sin almacenar contraseña reversible
- [x] 4.4 Implementar login online/offline, renovación de token central, estado de última validación y reautenticación
- [x] 4.5 Bloquear con explicación las mutaciones offline de módulos fuera de pacientes, consultas y recetas
- [ ] 4.6 Probar activación interrumpida, usuario no activado, usuario sin contraseña y revocación al reconectar

## 5. Motor de sincronización

- [x] 5.1 Implementar repositorio local de operaciones/cursos/conflictos y transiciones de estado atómicas
- [x] 5.2 Implementar push FIFO por dependencias, lotes, reintentos y backoff sin ejecuciones concurrentes
- [x] 5.3 Implementar pull por cursores y upsert/baja local con supresión de eco
- [x] 5.4 Aplicar confirmaciones, actualizar fichas definitivas y cerrar operaciones idempotentemente
- [x] 5.5 Integrar sincronización al iniciar, periódica, por reconexión y manual
- [ ] 5.6 Probar reinicio con pendientes, respuesta perdida, corte durante lote y dos sincronizaciones solicitadas a la vez

## 6. Flujos clínicos offline

- [x] 6.1 Adaptar pacientes para listar/buscar/crear/editar localmente, generar ficha provisoria y usar bajas lógicas
- [x] 6.2 Adaptar consultas para lectura/alta/edición offline con médico, límites de edición, auditoría y bajas lógicas
- [x] 6.3 Adaptar recetas para lectura/alta/edición offline con relaciones, médico y bajas lógicas
- [ ] 6.4 Marcar fichas provisorias y estados pendiente/error/conflicto en listados, detalles e impresiones
- [ ] 6.5 Verificar que paciente-consulta-receta creados offline conservan IDs y relaciones tras sincronizar
- [ ] 6.6 Verificar impresiones locales de ficha, consulta, anteojos y receta sin Internet

## 7. Estado, conflictos y diagnóstico

- [x] 7.1 Agregar indicador de conectividad/pendientes y acceso a sincronización en la barra lateral de escritorio
- [x] 7.2 Crear `/sincronizacion` con resumen, última ejecución, pendientes, errores, conflictos y acción manual
- [x] 7.3 Implementar comparación de versiones y acciones autorizadas para conservar central, aplicar local o vincular paciente duplicado
- [x] 7.4 Implementar exportación de diagnóstico sanitizado sin contenido clínico narrativo ni secretos
- [ ] 7.5 Probar conflictos de mismo campo, campos disjuntos, consulta/receta concurrente y paciente duplicado entre equipos

## 8. Instalador, seguridad y entrega

- [x] 8.1 Configurar instalador NSIS, acceso directo, icono, nombre de producto y exclusión del directorio de datos al actualizar/desinstalar
- [x] 8.2 Documentar configuración central, activación de equipos, copias de seguridad, BitLocker, recuperación y firma opcional
- [ ] 8.3 Ejecutar lint, TypeScript, build Next.js y pruebas unitarias/integración/Playwright
- [ ] 8.4 Generar el instalador y realizar smoke test en Windows 11: instalar, activar, trabajar offline, reconectar y actualizar preservando datos
- [ ] 8.5 Ejecutar piloto controlado contra PocketBase de test y registrar conteos/ejemplos antes y después de sincronizar
- [x] 8.6 Verificar `openspec validate --all` y completar la lista sólo con evidencia reproducible
