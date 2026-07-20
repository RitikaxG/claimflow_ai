export function normalizeEmail(value: unknown) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

export function validEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254;
}

export function validPassword(password: unknown) {
  return typeof password === "string" && password.length >= 8 && password.length <= 128;
}

export function validName(name: unknown) {
  return typeof name === "string" && name.trim().length >= 2 && name.trim().length <= 80;
}
