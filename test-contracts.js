const BASE = "http://localhost:3001";
const ACCOUNT_ID = "Z2lkOi8vSm9iYmVyL0FjY291bnQvMjMwNzgxMw==";

async function run() {
  // 1. Get the contract ID for Emma Wilson
  console.log("--- LIST CONTRACTS ---");
  const list = await fetch(`${BASE}/api/contracts?jobberAccountId=${ACCOUNT_ID}`);
  const contracts = await list.json();
  console.log(JSON.stringify(contracts, null, 2));

  const contract = contracts[0];
  if (!contract) { console.log("No contracts found"); return; }

  // 2. Renew single contract
  console.log("\n--- RENEW ---");
  const renew = await fetch(`${BASE}/api/contracts/${contract.id}/renew`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jobberAccountId: ACCOUNT_ID }),
  });
  console.log(JSON.stringify(await renew.json(), null, 2));

  // 3. List again to confirm dates updated
  console.log("\n--- LIST AFTER RENEWAL ---");
  const list2 = await fetch(`${BASE}/api/contracts?jobberAccountId=${ACCOUNT_ID}`);
  console.log(JSON.stringify(await list2.json(), null, 2));
}

run().catch(console.error);
