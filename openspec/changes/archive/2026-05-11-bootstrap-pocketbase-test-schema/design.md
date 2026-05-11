## Context

La instancia PocketBase de testing puede iniciar con una base limpia que solo contiene colecciones del sistema y `users`. Los seeds de agenda y Playwright necesitan colecciones clinicas (`pacientes`, `disponibilidades`, `turnos`, entre otras) con el mismo esquema que desarrollo/produccion, pero sin copiar datos reales.

## Goals / Non-Goals

**Goals:**

- Proveer un script idempotente para crear o actualizar colecciones faltantes en PocketBase test.
- Copiar solamente definiciones de colecciones, reglas, campos e indices.
- Validar que el destino sea una URL de testing antes de hacer cambios.
- Permitir usar `.env.local` como fuente de esquema y `.env.test.local` como destino.

**Non-Goals:**

- No copiar registros clinicos, usuarios reales ni archivos.
- No provisionar PocketBase en el VPS.
- No modificar la instancia fuente.
- No reemplazar backups o migraciones oficiales de PocketBase.

## Decisions

- Crear un script administrativo Node bajo `scripts/` para mantener el flujo junto a seeds y migraciones existentes.
- Leer dos archivos de entorno: fuente (`--source-env`) y destino (`--target-env`) para evitar mezclar credenciales.
- Exigir `--require-test-pocketbase` para operaciones sobre el destino.
- Copiar colecciones no-sistema desde la fuente, excluyendo `users` por defecto porque ya existe y puede tener credenciales demo creadas.
- Preservar ids de coleccion cuando sea posible para que los campos relation apunten correctamente.

## Risks / Trade-offs

- [Risk] La API de PocketBase puede rechazar algun campo de sistema al crear colecciones. -> Mitigacion: limpiar metadatos no editables antes de enviar definiciones.
- [Risk] La instancia test puede quedar a mitad de bootstrap si falla una coleccion. -> Mitigacion: script idempotente; se puede volver a ejecutar.
- [Risk] Divergencia futura del esquema. -> Mitigacion: documentar que el bootstrap debe correrse antes de seeds y pruebas cuando cambie el esquema.
