# AWS static hosting for Expenditrack

Replaces GitHub Pages hosting with S3 + CloudFront. Supabase is untouched — the
app keeps calling the same project over HTTPS from the browser.

The GitHub Pages workflow (`.github/workflows/deploy-pages.yml`) is left in
place, so both deploy in parallel until you're ready to delete it.

## 1. Deploy the stack

Region can be anything (`us-east-1` below); CloudFront itself is global.

```bash
aws cloudformation deploy --template-file infra/aws/static-site.yml --stack-name expenditrack-site --capabilities CAPABILITY_NAMED_IAM --region us-east-1
```

If the account already has the GitHub Actions OIDC provider (only one is allowed
per account), add:
`--parameter-overrides CreateOidcProvider=false`

For a custom domain, request the certificate in **us-east-1** first, then add:
`--parameter-overrides DomainName=app.example.com AcmCertificateArn=arn:aws:acm:us-east-1:...`

Read the outputs:

```bash
aws cloudformation describe-stacks --stack-name expenditrack-site --region us-east-1 --query "Stacks[0].Outputs" --output table
```

## 2. Create the GitHub environment

Settings → Environments → **New environment** named `aws-production` (matching
the `GitHubEnvironment` stack parameter).

Under its **Deployment branches** rule, select "Selected branches" and add
`react-rewrite`. This is what restricts the deploy role to one branch — the IAM
trust policy matches on the environment, because GitHub swaps the OIDC subject
from a branch claim to an environment claim as soon as a job declares
`environment:`. Skipping this rule means any branch could deploy.

## 3. Set the repo variables

From the stack outputs (Settings → Secrets and variables → Actions → Variables).
These are `vars`, not `secrets` — none of them is confidential. The Supabase
anon key is meant to be public in a client bundle; RLS is what protects the data.

| Variable | Value |
|---|---|
| `AWS_REGION` | the region you deployed to |
| `AWS_BUCKET_NAME` | `BucketName` output |
| `AWS_DISTRIBUTION_ID` | `DistributionId` output |
| `AWS_DEPLOY_ROLE_ARN` | `DeployRoleArn` output |
| `AWS_SITE_URL` | `SiteUrl` output |
| `VITE_SUPABASE_URL` | same value the Pages workflow hardcodes |
| `VITE_SUPABASE_ANON_KEY` | same value the Pages workflow hardcodes |

## 4. Point Supabase at the new origin

In the Supabase dashboard → Authentication → URL Configuration, add the
`SiteUrl` to **Redirect URLs**. Without this, sign-in redirects fail on the
CloudFront domain even though the database works.

## 5. Deploy

Push to `react-rewrite`, or run the workflow manually. First CloudFront
deployment takes ~5 minutes to propagate.

## What changes in the app

Nothing in `src/`. Two things stop mattering:

- **`base: '/Expenditrack1/'`** — only applied when `GITHUB_PAGES=true`, which
  the AWS workflow does not set. The app serves from the domain root, and
  `BrowserRouter basename={import.meta.env.BASE_URL}` follows automatically.
- **`404.html`** — the spa-github-pages redirect hack. CloudFront does a real
  server-side rewrite of 403/404 to `/index.html`, so deep links load directly
  instead of bouncing through `/?/path`. The file still ships; it is never hit.

`sw.js` needs no change: it derives paths from `self.registration.scope`, which
resolves to `/` on CloudFront instead of `/Expenditrack1/`.

## Cost

At this app's size, expect roughly $0.50–2/month: S3 storage is cents, and
CloudFront's perpetual free tier covers 1 TB egress and 10M requests per month.
The 1,951 asset files are small individually — the request count, not bandwidth,
is the thing to watch.
