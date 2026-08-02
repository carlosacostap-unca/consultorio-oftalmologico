export type LocalSystemSettingInput = {
  id: string;
  key: string;
  value: unknown;
};

type LocalBootstrapHandlers = {
  upsertRecord(collection: string, item: Record<string, unknown>): Promise<void>;
  upsertSystemSetting(input: LocalSystemSettingInput): Promise<unknown>;
};

export async function upsertLocalBootstrapRecord(
  collection: string,
  item: Record<string, unknown>,
  handlers: LocalBootstrapHandlers,
): Promise<void> {
  if (collection === "system_settings") {
    await handlers.upsertSystemSetting({
      id: String(item.id ?? ""),
      key: String(item.key ?? ""),
      value: item.value,
    });
    return;
  }
  await handlers.upsertRecord(collection, item);
}
