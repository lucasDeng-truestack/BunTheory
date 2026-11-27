/**
 * A customer signed in with an emailed code has no name yet. The first order they place while
 * signed in gives the account that name, so the site can greet them. Never overwrites a name they
 * already have, and never touches staff.
 */
export async function nameCustomerFromOrder(
  prisma: { user: { updateMany: (args: object) => Promise<unknown> } },
  userId: string,
  name: string,
): Promise<void> {
  const clean = name.trim().slice(0, 80);
  if (!clean) return;
  await prisma.user
    .updateMany({
      where: { id: userId, role: 'CUSTOMER', OR: [{ displayName: '' }, { displayName: { contains: '@' } }] },
      data: { displayName: clean },
    })
    .catch(() => {
      /* A missing name only means the site shows the email; never fail an order over it. */
    });
}
