# Deploying winwithfred.com to DigitalOcean

Quick overview: Your files live on GitHub → DigitalOcean watches GitHub → any update you push auto-deploys live.

---

## Step 1 — Create a GitHub Account (5 min)

1. Go to **https://github.com/signup**
2. Enter your email, create a password, pick a username (e.g. `fredowencoaching`)
3. Verify your email when prompted

---

## Step 2 — Create the GitHub Repo (3 min)

1. Once logged in, click the **+** button (top right) → **New repository**
2. Name it: `winwithfred`
3. Set it to **Public**
4. Leave everything else as-is, click **Create repository**

You'll land on an empty repo page. Leave that tab open.

---

## Step 3 — Upload Your Files to GitHub (5 min)

1. On your empty repo page, click **uploading an existing file**
2. Drag ALL the files from your WinWithFred folder into the upload area:
   - `index.html`, `style.css`, `firebase-config.js`
   - `goal-tracker.html`, `habit-builder.html`, `journal.html`, `quiz.html`, `login.html`
   - The `.do/` folder (app.yaml)
3. Scroll down, click **Commit changes**

Your site code is now on GitHub.

---

## Step 4 — Create a DigitalOcean Account (5 min)

1. Go to **https://digitalocean.com**
2. Click **Sign Up**
3. Sign up with your Google account (fredowencoaching@gmail.com) for speed
4. You'll need to add a credit card — App Platform static sites are **free** but a card is required to verify your account

---

## Step 5 — Deploy on App Platform (5 min)

1. In DigitalOcean, click **Create** → **Apps**
2. Select **GitHub** as the source
3. Click **Authorize DigitalOcean** and connect your GitHub account
4. Select the `winwithfred` repo, branch `main`
5. DigitalOcean will auto-detect it as a static site
6. Under **Plan**, select **Static Site** → it should show **Free**
7. Click **Next** through the remaining screens, then **Create Resources**

Your site will deploy in ~2 minutes. You'll get a URL like `winwithfred-abc123.ondigitalocean.app`.

---

## Step 6 — Connect Your Domain winwithfred.com (10 min)

1. In your App settings, go to **Domains** → **Add Domain**
2. Enter `winwithfred.com` and click **Add**
3. DigitalOcean will show you DNS records to add — typically:
   - An **A record** pointing `@` to DigitalOcean's IP
   - A **CNAME record** pointing `www` to your app URL
4. Log in to wherever your domain is registered (GoDaddy, Namecheap, etc.)
5. Go to **DNS settings** and add those records
6. Wait 15–60 minutes for DNS to propagate
7. DigitalOcean will auto-provision a free SSL certificate (HTTPS)

---

## That's It

Once DNS propagates, `winwithfred.com` will be live.

**Future updates:** Edit any HTML file → upload to GitHub → site redeploys automatically within ~1 minute.
