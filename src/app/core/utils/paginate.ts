/**
 * Recorre TODAS las páginas de un `list()` de Amplify Data.
 *
 * Amplify/DynamoDB aplica el `filter` DESPUÉS de paginar (escanea ~100 ítems por
 * página), así que un `list({ filter })` de una sola llamada puede devolver menos
 * resultados de los que existen —o ninguno— cuando la tabla crece. Este helper
 * sigue el `nextToken` hasta agotar los resultados.
 *
 * Uso:
 *   const data = await listAll((args) =>
 *     client.models.Foo.list({ filter: { barId: { eq: id } }, ...args }));
 */
export async function listAll<T>(
  listFn: (args: { nextToken?: string | null; limit?: number }) => Promise<{
    data: T[];
    nextToken?: string | null;
    errors?: { message: string }[] | null;
  }>,
): Promise<T[]> {
  const all: T[] = [];
  let nextToken: string | null | undefined = undefined;
  do {
    const res = await listFn({ nextToken, limit: 1000 });
    if (res.errors) {
      throw new Error(res.errors.map((e) => e.message).join(', '));
    }
    if (res.data) all.push(...res.data);
    nextToken = res.nextToken;
  } while (nextToken);
  return all;
}
