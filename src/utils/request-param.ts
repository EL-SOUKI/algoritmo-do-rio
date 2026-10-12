export function requiredParam(
  value: string | string[] | undefined,
  name: string,
): string {
  const resolved = Array.isArray(value)
    ? value[0]
    : value;

  if (!resolved) {
    throw new Error(
      `Missing required route parameter: ${name}`,
    );
  }

  return resolved;
}
