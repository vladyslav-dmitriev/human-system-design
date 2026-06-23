export async function getMessages(locale: string) {
  const common = (await import(`../messages/${locale}/common.json`)).default;
  const profile = (await import(`../messages/${locale}/profile.json`)).default;
  const auth = (await import(`../messages/${locale}/auth.json`)).default;
  const todo = (await import(`../messages/${locale}/todo.json`)).default;
  const pricing = (await import(`../messages/${locale}/pricing.json`)).default;
  const checkout = (await import(`../messages/${locale}/checkout.json`))
    .default;

  return {
    ...common,
    ...profile,
    ...auth,
    ...todo,
    ...pricing,
    ...checkout,
  };
}
