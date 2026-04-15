import { Router, Request, Response } from "express";
import { getValidToken } from "../lib/jobberToken";
import { syncOrg } from "../lib/sync";
import { detectRecurringContracts } from "../lib/detectContracts";
import { deleteOrgData } from "../lib/deleteOrg";

const router = Router();

const JOBBER_API_VERSION = "2025-04-16";

router.get("/me", async (req: Request, res: Response) => {
  const jobberAccountId = req.query.jobberAccountId as string | undefined;

  if (!jobberAccountId) {
    res.status(400).json({ error: "Missing jobberAccountId query param" });
    return;
  }

  let token: string;
  try {
    token = await getValidToken(jobberAccountId);
  } catch (err) {
    console.error("[me] getValidToken failed:", err);
    res.status(401).json({ error: "Not authorised" });
    return;
  }

  const gqlRes = await fetch("https://api.getjobber.com/api/graphql", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      "X-JOBBER-GRAPHQL-VERSION": JOBBER_API_VERSION,
    },
    body: JSON.stringify({
      query: `{ account { id name } }`,
    }),
  });

  if (!gqlRes.ok) {
    const detail = await gqlRes.text();
    console.error("[me] Jobber GraphQL HTTP error:", gqlRes.status, detail);
    res.status(502).json({ error: "Jobber GraphQL error" });
    return;
  }

  const body = (await gqlRes.json()) as {
    data?: { account?: { id: string; name: string } };
    errors?: unknown[];
  };

  if (body.errors || !body.data?.account) {
    console.error("[me] Unexpected GraphQL response:", body);
    res.status(502).json({ error: "Unexpected GraphQL response" });
    return;
  }

  res.json(body.data.account);
});

router.post("/sync", async (req: Request, res: Response) => {
  const { jobberAccountId } = req.body as { jobberAccountId?: string };

  if (!jobberAccountId) {
    res.status(400).json({ error: "Missing jobberAccountId" });
    return;
  }

  try {
    const result = await syncOrg(jobberAccountId);
    res.json(result);
  } catch (err) {
    console.error("[sync] error:", err);
    res.status(500).json({ error: "Sync failed" });
  }
});

router.get("/detect-contracts", async (req: Request, res: Response) => {
  const jobberAccountId = req.query.jobberAccountId as string | undefined;

  if (!jobberAccountId) {
    res.status(400).json({ error: "Missing jobberAccountId query param" });
    return;
  }

  try {
    const suggestions = await detectRecurringContracts(jobberAccountId);
    res.json(suggestions);
  } catch (err) {
    console.error("[detect-contracts] error:", err);
    res.status(500).json({ error: "Contract detection failed" });
  }
});

router.post("/disconnect", async (req: Request, res: Response) => {
  const { jobberAccountId } = req.body as { jobberAccountId?: string };

  if (!jobberAccountId) {
    res.status(400).json({ error: "Missing jobberAccountId" });
    return;
  }

  try {
    // Best-effort: revoke OAuth tokens via Jobber's appDisconnect mutation
    const accessToken = await getValidToken(jobberAccountId).catch(() => null);
    if (accessToken) {
      await fetch("https://api.getjobber.com/api/graphql", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
          "X-JOBBER-GRAPHQL-VERSION": JOBBER_API_VERSION,
        },
        body: JSON.stringify({ query: "mutation { appDisconnect { success } }" }),
      }).catch((err: unknown) =>
        console.warn("[disconnect] appDisconnect mutation failed:", err)
      );
    }

    await deleteOrgData(jobberAccountId);
    res.json({ ok: true });
  } catch (err) {
    console.error("[disconnect] error:", err);
    res.status(500).json({ error: "Disconnect failed" });
  }
});

export default router;
