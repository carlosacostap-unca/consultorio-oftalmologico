export interface ConflictPresentationInput {
  entity: string;
  recordId: string;
  operationAction?: string;
  differingFieldCount: number;
}

export interface ConflictPresentation {
  isDelete: boolean;
  summary: string;
  detail: string;
  keepCentralLabel: string;
  applyLocalLabel: string;
}

export function presentConflict(input: ConflictPresentationInput): ConflictPresentation {
  if (input.operationAction === "delete") {
    return {
      isDelete: true,
      summary: `Baja pendiente · ${input.entity} · registro ${input.recordId}`,
      detail: "La versión local solicita eliminar este registro. Elegí si querés cancelar o confirmar la baja.",
      keepCentralLabel: "Cancelar baja y conservar central",
      applyLocalLabel: "Confirmar baja local",
    };
  }

  const singular = input.differingFieldCount === 1;
  return {
    isDelete: false,
    summary: `${input.entity} · registro ${input.recordId} · ${input.differingFieldCount} campo${singular ? "" : "s"} diferente${singular ? "" : "s"}`,
    detail: "Compará ambas versiones antes de elegir cuál conservar.",
    keepCentralLabel: "Conservar central",
    applyLocalLabel: "Aplicar versión local",
  };
}
