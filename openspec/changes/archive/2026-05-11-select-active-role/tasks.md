## 1. Shared Role State

- [x] 1.1 Read the relevant Next.js App Router client-component and route-handler docs before changing app code.
- [x] 1.2 Add client-safe helpers for active-role storage, validation, selection and change events.
- [x] 1.3 Add server-side helper support for validating an active role from request headers against assigned roles.

## 2. Login And Navigation UI

- [x] 2.1 Update the home page to fetch the fresh authenticated user and auto-select an active role, preferring `medico` when available.
- [x] 2.2 Show the active role in the authenticated home header and clear active role on logout.
- [x] 2.3 Update the sidebar footer to show user avatar/name/email plus a role switcher for multi-role users.
- [x] 2.4 Make the Permisos link depend on active role `admin`, not merely assigned role `admin`.
- [x] 2.5 Group the admin sidebar into Configuracion and Datos sections with Usuarios and Permisos under Configuracion.

## 3. Administrative Authorization

- [x] 3.1 Update `requireAdmin` to require active role `admin` from request headers and validate it is assigned to the authenticated user.
- [x] 3.2 Update client calls to administrative APIs to send the active role header.
- [x] 3.3 Update `/permisos` page gate to redirect unless active role is `admin`.

## 4. Verification

- [x] 4.1 Run `npm.cmd run build` and fix type/build errors.
- [x] 4.2 Run `npm.cmd run lint` and fix issues introduced by this change.
- [x] 4.3 Manually verify a multi-role user logs in without a role-picking screen and defaults to `medico` when assigned.
- [x] 4.4 Manually verify switching from `admin` to an operational role in the sidebar footer hides Permisos and admin APIs return `403`.
