/**
 * Verification script for max items (burgers) per day limit.
 * Run: npx ts-node scripts/verify-max-orders.ts
 *
 * Requires: API running at localhost:3001, menu items in DB
 */
const API = process.env.API_URL || 'http://localhost:3001';

async function getCanOrder() {
  const res = await fetch(`${API}/orders/can-order`);
  return res.json();
}

async function getMenu() {
  const res = await fetch(`${API}/menu`);
  const items = await res.json();
  return items;
}

async function createOrder(quantity = 1) {
  const menu = await getMenu();
  if (!menu.length) throw new Error('No menu items');
  const item = menu[0];
  const slug = item.slug ?? 'signature-roast-bun';

  const res = await fetch(`${API}/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      customerName: 'Test User',
      phone: '+60123456789',
      type: 'PICKUP',
      items: [{ slug, quantity }],
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || res.statusText);
  }
  return res.json();
}

async function main() {
  console.log('Verifying max items (burgers) per day limit...\n');

  const { current, max, canOrder } = await getCanOrder();
  console.log(`Initial state: ${current}/${max} items sold today, canOrder=${canOrder}`);

  // Test 1: Single order exceeding capacity (e.g. 16 burgers when max is 15)
  console.log('\n--- Test 1: Order of 16 items when max is 15 ---');
  try {
    await createOrder(16);
    console.log('  ❌ BUG: Should have rejected 16-item order!');
    process.exit(1);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('exceeds') || msg.includes('capacity')) {
      console.log('  ✓ Correctly rejected: ' + msg.slice(0, 70) + '...');
    } else {
      console.log('  Rejected with: ' + msg.slice(0, 80));
    }
  }

  // Test 2: Place orders until limit reached
  const itemsToPlace = Math.max(0, max - current + 2);
  console.log(`\n--- Test 2: Placing ${itemsToPlace} single-item orders ---`);

  let successCount = 0;
  let blockedCount = 0;

  for (let i = 0; i < itemsToPlace; i++) {
    try {
      await createOrder(1);
      successCount++;
      const state = await getCanOrder();
      console.log(`  Order ${i + 1}: SUCCESS (${state.current}/${state.max} items)`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('limit') || msg.includes('capacity') || msg.includes('Ordering is closed')) {
        blockedCount++;
        console.log(`  Order ${i + 1}: BLOCKED (expected) - ${msg.slice(0, 55)}...`);
      } else {
        console.log(`  Order ${i + 1}: ERROR - ${msg}`);
      }
    }
  }

  const final = await getCanOrder();
  console.log(`\nFinal state: ${final.current}/${final.max} items sold`);
  console.log(`Placed: ${successCount}, Blocked: ${blockedCount}`);

  if (final.current > final.max && successCount > 0) {
    console.log('\n❌ BUG: New orders exceeded the limit!');
    process.exit(1);
  }
  console.log('\n✓ Limit enforced correctly.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
