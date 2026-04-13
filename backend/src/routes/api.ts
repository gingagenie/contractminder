import { Router, Request, Response } from "express";
import { getValidToken } from "../lib/jobberToken";

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
    res.status(401).json({ error: String(err) });
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
    res.status(502).json({ error: "Jobber GraphQL error", detail });
    return;
  }

  const body = (await gqlRes.json()) as {
    data?: { account?: { id: string; name: string } };
    errors?: unknown[];
  };

  if (body.errors || !body.data?.account) {
    res.status(502).json({ error: "Unexpected GraphQL response", detail: body });
    return;
  }

  res.json(body.data.account);
});

export default router;
