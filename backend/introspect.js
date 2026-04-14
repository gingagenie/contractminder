require("dotenv").config();
const postgres = require("postgres");

async function run() {
  // Get token from db
  const sql = postgres(process.env.DATABASE_URL, { prepare: false });
  const [org] = await sql`SELECT access_token FROM cm_jobber_orgs LIMIT 1`;
  sql.end();

  const res = await fetch("https://api.getjobber.com/api/graphql", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${org.access_token}`,
      "X-JOBBER-GRAPHQL-VERSION": "2025-04-16",
    },
    body: JSON.stringify({
      query: `{
        billing: __type(name: "BillingStrategy") { enumValues { name } }
        frequency: __type(name: "BillingFrequencyEnum") { enumValues { name } }
      }`,
    }),
  });

  const body = await res.json();
  console.log("BillingStrategy:", body.data.billing?.enumValues?.map(e => e.name));
  console.log("BillingFrequencyEnum:", body.data.frequency?.enumValues?.map(e => e.name));

  // Fetch Emma Wilson's first property ID
  const clientId = "Z2lkOi8vSm9iYmVyL0NsaWVudC8xMzYxMzA2Mzg=";
  const propRes = await fetch("https://api.getjobber.com/api/graphql", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${org.access_token}`,
      "X-JOBBER-GRAPHQL-VERSION": "2025-04-16",
    },
    body: JSON.stringify({
      query: `{ client(id: "${clientId}") { clientProperties { nodes { id address { street1 } } } } }`,
    }),
  });
  const propBody = await propRes.json();
  console.log("Emma Wilson clientProperties:", JSON.stringify(propBody.data?.client?.clientProperties?.nodes, null, 2));
}

run().catch(console.error);
