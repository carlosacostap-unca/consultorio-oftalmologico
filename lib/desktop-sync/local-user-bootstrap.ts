export async function additionalLocalUserNeedsCreation(
  id: string,
  userExists: (id: string) => Promise<boolean>,
): Promise<boolean> {
  return !(await userExists(id));
}
