// Supabase Auth returns English messages; map the ones users can hit to Portuguese.
const MESSAGES: [RegExp, string][] = [
  [/already registered|already exists/i, "Esse e-mail já tem conta. Use “Fazer login”."],
  [/invalid login credentials/i, "E-mail ou senha incorretos."],
  [/email not confirmed/i, "Confirme seu e-mail antes de entrar (veja sua caixa de entrada)."],
  [/signups not allowed for otp|user not found/i, "Não encontramos essa conta. Entrou com convite?"],
  [/rate limit|too many/i, "Muitas tentativas de e-mail agora. Entre com senha ou tente mais tarde."],
  [/sending .*email|error sending/i, "Não foi possível enviar o e-mail agora. Entre com senha."],
  [/password should be|weak password/i, "Senha fraca: use pelo menos 6 caracteres."],
  [/invalid email|unable to validate email/i, "E-mail inválido."],
];

export function authErrorPt(message: string, fallback = "Não foi possível continuar. Tente de novo."): string {
  return MESSAGES.find(([re]) => re.test(message))?.[1] ?? fallback;
}
