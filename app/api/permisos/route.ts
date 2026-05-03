import { NextRequest } from "next/server";
import { pbAdmin, requireAdmin } from "@/lib/pocketbase-admin";
import { ALL_PERMISSION_KEYS, DEFAULT_ROLE_PERMISSIONS, MANAGED_ROLES } from "@/lib/permissions";
import type { ManagedRole, PermissionKey, UserRole } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const admin = await requireAdmin(request);
    if (!admin) {
      return Response.json({ error: "No autorizado" }, { status: 403 });
    }

    const [usersResult, permissionsResult] = await Promise.all([
      pbAdmin("/api/collections/users/records?page=1&perPage=200&sort=email"),
      pbAdmin("/api/collections/role_permissions/records?page=1&perPage=50&sort=role"),
    ]);

    return Response.json({
      users: (usersResult.items || []).map((user: any) => ({
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role || "secretaria",
      })),
      rolePermissions: normalizeRolePermissions(permissionsResult.items || []),
    });
  } catch (error) {
    console.error("Error al cargar permisos:", error);
    return Response.json({ error: "No se pudieron cargar los permisos" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const admin = await requireAdmin(request);
    if (!admin) {
      return Response.json({ error: "No autorizado" }, { status: 403 });
    }

    const body = await request.json();
    const role = body.role as UserRole;
    const permissions = sanitizePermissions(body.permissions);

    if (!isManagedRole(role)) {
      return Response.json({ error: "Rol no administrable" }, { status: 400 });
    }

    const existingResult = await pbAdmin(
      `/api/collections/role_permissions/records?page=1&perPage=1&filter=${encodeURIComponent(`role = "${role}"`)}`
    );
    const existing = existingResult.items?.[0];

    const record = existing
      ? await pbAdmin(`/api/collections/role_permissions/records/${existing.id}`, {
          method: "PATCH",
          body: JSON.stringify({ permissions }),
        })
      : await pbAdmin("/api/collections/role_permissions/records", {
          method: "POST",
          body: JSON.stringify({ role, permissions }),
        });

    return Response.json({
      role: record.role,
      permissions: sanitizePermissions(record.permissions),
    });
  } catch (error) {
    console.error("Error al guardar permisos:", error);
    return Response.json({ error: "No se pudieron guardar los permisos" }, { status: 500 });
  }
}

function normalizeRolePermissions(records: any[]) {
  const result: Record<string, PermissionKey[]> = {};

  for (const role of MANAGED_ROLES) {
    const record = records.find((item) => item.role === role);
    result[role] = sanitizePermissions(record?.permissions || DEFAULT_ROLE_PERMISSIONS[role]);
  }

  return result;
}

function isManagedRole(role: UserRole): role is ManagedRole {
  return MANAGED_ROLES.includes(role as ManagedRole);
}

function sanitizePermissions(value: unknown) {
  const permissions = Array.isArray(value) ? value : [];
  return permissions.filter((permission): permission is PermissionKey =>
    ALL_PERMISSION_KEYS.includes(permission as PermissionKey)
  );
}
