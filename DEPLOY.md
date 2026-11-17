# Shipping SHITTOWN

The game is a static site. `python3 tools/build_site.py` produces `site/` with
`index.html`, `404.html`, and `assets/`.

## Option A — Cloudflare Pages or Netlify (free, keeps the repo private)

Both free tiers can deploy from a **private** GitHub repo and give you a public
URL. This is the recommended path if you do not have GitHub Pro.

### Cloudflare Pages
1. Push this folder to a **private** GitHub repo (commands below).
2. Cloudflare dashboard → Workers & Pages → Create → Pages → Connect to Git.
3. Pick the private repo.
4. Build command: `python3 tools/build_site.py`
5. Build output directory: `site`
6. Save and deploy. Share the `*.pages.dev` URL.

### Netlify
1. Push the private repo to GitHub.
2. Netlify → Add new site → Import an existing project → GitHub.
3. Build command: `python3 tools/build_site.py`
4. Publish directory: `site`
5. Deploy.

No code changes needed for either.

## Option B — GitHub Pages

GitHub Pages from a **private** repository requires GitHub Pro, Team, or
Enterprise. If you have it:

1. Create the private repo and push.
2. Settings → Pages → Build and deployment → Source: **GitHub Actions**.
3. The included workflow (`.github/workflows/pages.yml`) builds `site/` and
   deploys it on every push to `main`.
4. The public URL is `https://<username>.github.io/<repo>/`.

If you are on GitHub Free, Pages will not publish from a private repo. Use
Option A, or keep the source private in one repo and deploy a copy to a second
**public** repo with Pages enabled.

## Push the repo

```sh
cd shittown
git init -b main
git add .
git commit -m "SHITTOWN: open world pimp sandbox"
git remote add origin git@github.com:kelllar/shittown.git
git push -u origin main
```

Create `kelllar/shittown` on GitHub first, set it to **Private**, and do not
initialise it with a README.

## Multiplayer on a static host

GitHub Pages / Netlify / Cloudflare only serve files. The relay is a separate
Python process:

```sh
python3 multiplayer_server.py 4353
```

- **Same LAN:** `python3 serve.py --online` handles both HTTP and the relay.
- **Across the internet from a static site:** host `multiplayer_server.py`
  somewhere that can keep a TCP port open, or run it at home behind a tunnel.
  A Cloudflare Tunnel works and gives you `wss://`:

  ```sh
  cloudflared tunnel --url http://localhost:4353
  ```

  Then share `https://your-site/?online=1&ws=wss://your-tunnel.trycloudflare.com`
  (the `ws` value accepts a full `ws://` or `wss://` URL).

HTTPS pages cannot connect to `ws://`; they need `wss://`. That is why the
tunnel/hosted relay matters for a public site.

## Tests before shipping

```sh
./tests/run.sh
```

118 game checks + relay checks. Must print `ALL CHECKS PASSED` and
`WS CHECKS PASSED`.
