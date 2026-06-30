export function validatePasswordPair(
  password: string,
  confirmPassword: string,
  minLength = 8,
): string | null {
  if (password.length < minLength) {
    return `A senha deve ter pelo menos ${minLength} caracteres.`;
  }
  if (password !== confirmPassword) {
    return "As senhas não coincidem.";
  }
  return null;
}
