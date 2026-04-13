const BASE = "http://localhost:3001";
const ACCOUNT_ID = "Z2lkOi8vSm9iYmVyL0FjY291bnQvMjMwNzgxMw==";
const CLIENT_ID = "Z2lkOi8vSm9iYmVyL0NsaWVudC8xMzYxMzA2Mzg=";

async function run() {
  // 1. Confirm
  console.log("--- CONFIRM ---");
  const confirm = await fetch(`${BASE}/api/contracts/confirm`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jobberAccountId: ACCOUNT_ID,
      contracts: [{
        jobberClientId: CLIENT_ID,
        clientName: "Emma Wilson",
        jobTitle: "annual service",
        detectedFrequency: "annual",
        lastJobDate: "2026-04-13",
        suggestedRenewalDate: "2027-04-13",
      }],
    }),
  });
  console.log(await confirm.json());

  // 2. List confirmed contracts
  console.log("\n--- LIST CONTRACTS ---");
  const list = await fetch(`${BASE}/api/contracts?jobberAccountId=${ACCOUNT_ID}`);
  console.log(JSON.stringify(await list.json(), null, 2));
}

run().catch(console.error);
