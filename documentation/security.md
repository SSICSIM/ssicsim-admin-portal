## 8. Production Setup: Supabase & File Storage

### Supabase Integration
- Create a Supabase project at https://app.supabase.com/.
- In your project, go to Project Settings > API and copy the `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`.
- Add these to your backend `.env`:
	- `SUPABASE_URL=your_supabase_url`
	- `SUPABASE_SERVICE_ROLE_KEY=your_service_role_key`
- (Optional) Set `SUPABASE_BUCKET` to the name of your storage bucket (e.g., `uploads`).
- (Optional) Set `SUPABASE_PUBLIC_BASE_URL` if using a custom CDN/domain for public file access.

### File Uploads & S3 Storage
- Use Supabase Storage as your S3-compatible file store for uploaded files (e.g., delegate documents, images).
- Configure your backend to upload files to the Supabase bucket using the service role key.
- Store only file URLs in your database, not the files themselves.
- Restrict file upload endpoints to authenticated/admin users only.
- Set appropriate CORS and access policies in Supabase Storage to allow only your backend to write, and your frontend to read public files.

### Downloading Files
- To download files, use the public URL from Supabase Storage (or your custom CDN if configured).
- For private files, generate signed URLs with limited expiry using Supabase's API.

### Security Best Practices
- Never expose your Supabase service role key to the frontend or public clients.
- Use environment variables for all Supabase credentials and bucket names.
- Regularly review Supabase Storage policies and logs for unauthorized access.
- Rotate service keys if you suspect they are compromised.

---
# Security Practices for SSICSim Admin Portal

## 1. Authentication & Authorization
- All admin routes are protected using Google SSO (NextAuth/Auth.js) with an email allowlist.
- Only users with emails in the allowlist can access the admin portal.
- All API requests from the frontend to the backend are proxied and include an `X-Admin-Token` header. The backend validates this token for every admin API route.

## 2. API Protection
- Backend enforces an `ADMIN_API_TOKEN` for all protected endpoints. Requests without the correct token are rejected.
- CORS is configured to only allow requests from the trusted frontend domain (e.g., `http://localhost:3000` for local, your production domain for prod).
- FOR DEVELOPMENT: make sure that your backend and frontend .env files match

## 3. Environment Variables & Secrets
- Sensitive values (API tokens, secrets, OAuth credentials) are stored in `.env` files and never committed to version control.
- `NEXTAUTH_SECRET` is generated securely and required for NextAuth to function.
- `GOOGLE_CLIENT_SECRET` and `ADMIN_API_TOKEN` must be rotated if exposed.

## 4. Secure Deployment
- Only trusted domains are allowed in CORS and OAuth settings.
- Docker images are rebuilt with updated dependencies and secrets as needed.
- Environment variables are set per environment (local, staging, production) and not hardcoded.

## 5. Incident Response & Best Practices
- If a secret is exposed, immediately rotate it in Google Cloud Console (for OAuth) or regenerate (`openssl rand -base64 32` for secrets).
- Review and restrict CORS origins to only trusted domains.
- Monitor logs for unauthorized access attempts or failed token checks.
- Use strong, unique values for all secrets and tokens.

## 6. Summary of Security Measures Implemented
- Google SSO with allowlist for admin access
- NextAuth secret for session integrity
- Backend API token for all admin API calls
- CORS restricted to frontend domain
- All secrets managed via environment variables
- Documentation and rotation procedures for all sensitive values


## 7. Production Security Checklist

- Set all secrets and environment variables using your cloud provider’s environment variable management (not hardcoded or in the repo).
- Use strong, unique values for `NEXTAUTH_SECRET`, `ADMIN_API_TOKEN`, and OAuth credentials.
- Set `NEXTAUTH_URL` to your production domain (e.g., `https://admin.yourdomain.com`).
- Set CORS origins to your production frontend domain only.
- Restrict Google OAuth to your organization’s domain and production callback URLs.
- Use HTTPS for all frontend and backend endpoints.
- Rotate secrets immediately if exposed or when team members leave.
- Monitor logs for suspicious activity and failed authentication attempts.
- Regularly update dependencies and rebuild Docker images.
- Limit admin email allowlist to trusted users only.

---

**Always review and update this document as new security features or risks are identified.**
