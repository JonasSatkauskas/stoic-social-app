# Less Phone, More Life

One small real-life challenge a day. Do it, write it on paper, grow a tree. A local-first PWA: no accounts, nothing readable leaves the phone.

## Run

```bash
npm install
npm run dev        # http://localhost:5173 (also exposed on your LAN)
npm test           # Vitest: crypto, friend crypto, safety, talk machine, domain logic
npm run build      # production build in dist/
npm run preview    # serve dist/ locally
```

Phones need HTTPS for encryption, the camera and the service worker. Two options:

- **Local network, self-signed cert:** create a cert for your laptop's IP, then `npm run dev` serves HTTPS.
  ```bash
  mkdir -p .cert && openssl req -x509 -newkey rsa:2048 -nodes -days 30 \
    -keyout .cert/key.pem -out .cert/cert.pem -subj "/CN=less-phone-dev" \
    -addext "subjectAltName=IP:<your-laptop-ip>,DNS:localhost,IP:127.0.0.1"
  ```
  Open `https://<your-laptop-ip>:5173` on the phone and accept the warning once (Advanced → Proceed).
  Offline mode and install do not work with a self-signed cert; use a deploy for that.
- **Tunnel:** `cloudflared tunnel --url http://localhost:5173` (delete `.cert/` first so the dev server speaks plain HTTP).

## Grove relay (Firebase Firestore, optional)

Without config the Grove still works: friends are planted by QR, and their tree updates when you scan again. With the relay, updates arrive after every Done.

1. Create a Firebase project (Analytics off). Build → Firestore Database → Create (production mode).
2. Add a Web app, copy `apiKey`, `authDomain`, `projectId`, `appId` into `.env.local` (see `.env.example`).
3. Deploy the rules: `npx firebase-tools login` then `npx firebase-tools deploy --only firestore:rules --project <id>`
   (or paste `firestore.rules` into the console's Rules tab).
4. TTL (30-day expiry): Console → Firestore → TTL policies → Create: collection group `msgs`, field `exp`.
5. For hosting, set the same four `VITE_FIREBASE_*` variables in Vercel/Netlify.

Firestore only ever receives `{ c, iv, t, exp }`: AES-GCM ciphertext at a random 128-bit mailbox path.

## Deploy

Any static HTTPS host. Vercel: import the repo, framework Vite, build `npm run build`, output `dist`.
Add a SPA rewrite if the host needs one (all routes → `/index.html`); the app itself has no routes.

## Demo helpers

- Tap the invisible square in the top-left of Today five times quickly: adds five past days of challenges and writing, so the tree, visitors and trunk rings fill in.
- Crisis path test: in Talk, type "I do not want to live anymore". The help screen appears and the flow ends.

## Privacy model

- Device key: non-extractable AES-GCM key in IndexedDB. Notes, day log, tree, friends are all stored encrypted. Only the streak is plain.
- Friends: ECDH P-256 identity (private key non-extractable). HKDF derives mailbox id, update key and the three check words. Live QR refreshes every 20 s, rejected after 60 s.
- Backups: PBKDF2-SHA-256, 600 000 iterations, AES-GCM. Friends are not in backups (the identity key cannot leave the device).
- Talk text is never stored unless you tap "Save to notes". The optional Chrome on-device AI never leaves the device.
