## 1. Data Model And Helpers

- [x] 1.1 Read the relevant Next.js App Router route-handler/client-component docs under `node_modules/next/dist/docs/` before changing app code.
- [x] 1.2 Add shared role helpers in `lib/permissions.ts` to normalize legacy `role` and canonical `roles`, validate multi-role input, detect admin membership, and derive effective permission unions.
- [x] 1.3 Update `AppUser` and related local types to expose `roles?: UserRole[]` while keeping `role?: UserRole` for migration compatibility.

## 2. PocketBase Migration

- [x] 2.1 Update `scripts/migrar_roles_permisos.mjs` to ensure `users.roles` exists as a multi-select field with `admin`, `medico`, and `secretaria`.
- [x] 2.2 Make the migration copy each existing legacy `role` value into `roles` when `roles` is empty, preserving idempotent reruns.
- [x] 2.3 Keep `role_permissions` initialization unchanged for administrable roles and verify the script does not remove legacy `users.role`.

## 3. Server APIs And Authorization

- [x] 3.1 Update `requireAdmin` to authorize users whose normalized roles include `admin`.
- [x] 3.2 Update `POST /api/usuarios` to accept `roles` and legacy `role`, validate at least one valid role, persist canonical roles, and return normalized roles.
- [x] 3.3 Update `PATCH /api/usuarios/role` to accept multi-role updates, reject invalid or empty lists, persist canonical roles, and return normalized roles.
- [x] 3.4 Update `GET /api/permisos` to return normalized roles per user and keep role-permission payloads normalized by administrable role.

## 4. UI Updates

- [x] 4.1 Update `/permisos` create-user form to choose multiple roles and submit `roles`.
- [x] 4.2 Update `/permisos` user table to display and edit multiple roles without allowing an empty selection.
- [x] 4.3 Update `/permisos` admin gate and `components/Sidebar.tsx` to use normalized roles and show Permisos when `admin` is included.

## 5. Verification

- [x] 5.1 Run `npm.cmd run lint` and fix issues introduced by the change.
- [x] 5.2 Run `npm.cmd run build` and fix build/type errors.
- [x] 5.3 Manually verify an admin can create or update a user with `medico` and `secretaria`, and that `admin` plus another role still shows `/permisos`.
- [x] 5.4 Manually verify a non-admin multi-role user does not see `/permisos` and receives `403` from admin APIs.
