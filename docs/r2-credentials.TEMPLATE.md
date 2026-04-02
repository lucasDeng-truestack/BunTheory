# Cloudflare R2 — credential reference

**Do not commit this file with real values.**  
Copy this file to `r2-credentials.local.md` (same folder) and paste your secrets there.  
`r2-credentials.local.md` is gitignored.

---

## Cloudflare API Token

Used for Cloudflare REST API (not always needed for S3-style uploads from the app).

| Field        | Your value |
| ------------ | ---------- |
| API Token    | `paste cfat_... here` |

---

## S3-compatible client (R2)

Use these with any S3 SDK pointed at R2 (e.g. AWS SDK `PutObject`).

| Field              | Your value |
| ------------------ | ---------- |
| Access Key ID      | `paste here` |
| Secret Access Key  | `paste here` |
| Endpoint URL       | `https://....r2.cloudflarestorage.com` |
| Bucket name        | `your-bucket-name` |
| Region (for SDKs)  | Often `auto` for R2 |

---

## Map to `backend/.env`

When the backend is wired for R2, align with:

| Env variable     | Source |
| ---------------- | ------ |
| `S3_ENDPOINT`    | Endpoint URL |
| `S3_ACCESS_KEY`  | Access Key ID |
| `S3_SECRET_KEY`  | Secret Access Key |
| `S3_BUCKET`      | Bucket name |
| `S3_REGION`      | `auto` (typical for R2) |
| `PUBLIC_URL`     | Public base URL for files (R2 custom domain or public bucket URL) |

---

## Bucket settings (reference)

These match **R2 → `bun-theory-uploads` → Settings → General**:

| Field | Value |
| ----- | ----- |
| Name | `bun-theory-uploads` |
| Location | Asia-Pacific (APAC) |
| Default storage class | Standard |
| **Public access** | **Disabled** (default) |

**S3 API URL:** Use the **copy** control next to “S3 API” in the bucket settings. For most S3 clients (e.g. AWS SDK), set:

- `S3_ENDPOINT` = account endpoint only, e.g. `https://<account-id>.r2.cloudflarestorage.com` (no trailing bucket path).
- `S3_BUCKET` = `bun-theory-uploads`.

**Serving images in the browser:** With public access off, objects are not anonymously readable until you either:

1. **Settings → Public Development URL** (simplest for dev), or  
2. **Settings → Custom Domains** (production-friendly), or  
3. Proxy or **presigned URLs** from your API.

Then set `PUBLIC_URL` in `.env` to that public base URL (so returned image URLs work in the storefront).

---

## After Cloudflare shows credentials once

If you lose them, **revoke** the old token in the dashboard and **create new** credentials — you cannot retrieve the secret again.
