# CLAUDE.md: Less Phone, More Life (hackathon build)

## What this is
A local-first PWA built around a daily loop: **do it, write it, grow**. One small real-life challenge a day (the heart of the app), a pen moment where the user writes by hand on paper, a small tree that grows from both, encrypted digital notes as a fallback for paper, a Stoic "Talk it out, then go" flow that ends by sending the user to paper, a challenge and a real person, and the Grove: friends added only in person by scanning each other's live QR codes (Briar-style), shown as trees in a shared landscape. Built in 2 days for a hackathon.

## Hard rules
- **No accounts. Almost no backend.** The only network traffic: loading the app, and AES-GCM-encrypted Grove updates to the Firestore blind relay. Never send plain text, names, notes, Talk messages or anything about pen writing to any server. Never add analytics, trackers, fonts from CDNs or third-party scripts.
- **Friends only in person.** Adding a friend requires mutual scanning of live QR codes (refresh 20 s, expire 60 s) plus the three-word check. Never add invite links, friend search, usernames or contact import.
- **Grove shares only:** display name, tree stage and look, root depth, completions (date, challenge id, level), pebbles, last meeting date. **Never shared:** notes, Talk text, anything written by pen.
- **No chat, no counts, no rankings** in the Grove.
- **Private data is always encrypted** with src/lib/crypto.ts before it is stored. Never store plain text in IndexedDB, localStorage or sessionStorage.
- **Never log personal text** (notes, talk messages) to the console.
- **Only Web Crypto** for cryptography (AES-GCM, PBKDF2, ECDH P-256, HKDF). No custom crypto, no crypto libraries.
- **Talk flow limit:** max 2 questions, enforced in the state machine, not in prompts. The close screen has no "continue" button.
- **Safety:** every user message in the Talk flow passes src/lib/safety.ts first. Crisis signs end the flow and show the help screen.
- **Wording:** "reflection partner", never "therapist", "therapy", "counselor" or "diagnosis". No religious or spiritual framing in the app's own text.
- **The daily challenge is the core.** Today is the home screen: tree on top, challenge below, one Done button. After Done, no more content to scroll.
- **Pen and paper come first.** After every challenge comes the pen moment (prompt + timer + "I wrote it"). The app never asks the user to type what they wrote on paper and never stores it. Digital notes are a fallback, never the default.
- **Branches grow from challenges, roots grow from writing.**
- **The tree never dies, wilts or looks sad.** Missed days only show "Your tree is resting." No guilt mechanics, no punishment, no loss of progress.
- **No dangerouslySetInnerHTML.**
- Keep dependencies minimal: React, vite-plugin-pwa, idb, qrcode, qr-scanner, firebase (Firestore only), Vitest. Ask before adding anything else.

## Stack
Web app only: no Expo, no React Native, no APK or native builds. Deployed as a static PWA over HTTPS.
Vite, React, TypeScript (strict), vite-plugin-pwa, idb, Web Crypto API, qrcode, qr-scanner, Firebase Firestore (blind relay only, no Auth), plain CSS with variables (light and dark), Vitest.

## Structure
```
src/
  data/challenges.json      30 challenges: id, title, category, easy, medium, brave, indoor, why, pen
  data/questions.json       Stoic questions grouped by topic, with keywords
  data/words.json           256 calm nature words for the three-word friend check
  lib/crypto.ts             AES-GCM (device key), PBKDF2 (backups)
  lib/db.ts                 IndexedDB access via idb (stores only encrypted data, plus streak)
  lib/friendCrypto.ts       ECDH identity key, HKDF (mailbox ID, key, check words), update encryption
  lib/relay.ts              Firestore blind relay: post and fetch encrypted updates only
  lib/safety.ts             crisis check
  lib/ai.ts                 optional Chrome built-in AI engine (stretch)
  features/today/           challenge of the day, swap once, done, streak
  features/pen/             pen moment: prompt, timer, I wrote it, printable pen sheet
  features/tree/            SVG tree, 8 stages, branches (challenges), roots (writing), category visitors
  features/talk/            state machine and screens
  features/grove/           landscape scene, lanterns, mist, friend trunk rings, pebbles
  features/grove/plant/     live QR, scanner, flip card, word check, planting animation
  features/notes/           encrypted digital notes (fallback when there's no paper)
  features/settings/        backup export and import, install guide
```

## Voice and vibe (applies to all copy, content and design)
Stoic calm and rational psychology, based on Janette Rainwater's self-therapy methods. A clear-headed mentor, not a cheerleader.

- Calm, direct, short sentences. No exclamation marks, no emojis, no hype, no "wellness fluff".
- Reason first: separate facts from judgments, ask what is up to the user.
- Responsibility without blame: "I choose" language, never guilt or scolding.
- Observation before interpretation (Rainwater's self-observation).
- Examples: "Done. That was yours to do, and you did it." / "Your tree is resting. Today is enough." / "What part of this is up to you?" / "Planted. You met in person today." / "Meet again to water this friendship."
- Pen prompt types to rotate: awareness ("Right now I notice..."), responsibility ("I have to" → "I choose to"), fact vs judgment, control (up to me / not up to me), evening review, unsent letter, view from above.
- Stoic quotes only from public-domain translations, quoted faithfully with author and work. Rainwater's methods in our own words, credited, never copied from her books.
- No religious or spiritual framing in the app's own voice.

### Visual
- Palette: warm off-white, stone grey, deep olive green, ink black. Dark mode: charcoal with soft parchment text.
- Serif headings and quotes from the system serif stack (Georgia, etc.); sans-serif interface text. No external fonts.
- Lots of empty space, one idea per screen, thin lines, no gradients, no confetti.
- The tree looks like a simple ink sketch: calm, not cartoonish.
- Mobile-first, one-handed use, large tap targets.

### Interaction style
- No dropdowns, no forms, no settings lists, no feeds, no numbers to compete on.
- Choices are objects: three stepping stones for Easy / Medium / Brave; two stones for yes / no.
- The writing timer is an ink line slowly drawing across the screen.
- Every screen is a scene: the Grove is a landscape, a friend's profile is a cross-section of their trunk with weekly growth rings.
- Gestures where natural: tap a tree to visit, long-press to leave a pebble.
- Always respect prefers-reduced-motion and give screen readers a plain, accessible version.

## Workflow
- Small steps. Run tests after each change (`npm test`).
- Commit after each working feature with a clear message.
- When unsure about scope, choose the simpler option and say so.
