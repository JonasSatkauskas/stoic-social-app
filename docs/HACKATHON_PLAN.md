# Less Phone, More Life: 2-Day Hackathon Plan

Build with Claude Code. Goal: a working, installable web app that judges can open on their own phones.

---

## 1. The demo in one sentence

Open a link, do one real-life challenge, **write about it with a pen on paper**, **watch your tree grow**, talk to a Stoic AI that sends you outside, **plant a friendship by scanning each other's phones in person**, and prove that **nothing readable ever leaves the device**.

---

## 2. Scope: what's in, what's out

| In (must have) | Stretch (only if time) | Out (say "next version" in the pitch) |
|---|---|---|
| **Daily challenge** (3 levels + indoor option): the heart of the app | Built-in AI in Chrome | Accounts and login |
| "Done" button + streak | Dark mode | Circles, group challenges |
| **Pen moment** after each challenge: one prompt, a writing timer, written on paper | Printable weekly pen sheet | Photo or scan of paper pages |
| **Growing tree:** branches from challenges, roots from writing | Tree seasons and extra visitors | Pets or multiple trees |
| Talk it out, then go (guided Stoic flow) | Shareable weekly recap image | Payments |
| Encrypted digital notes (fallback for paper) | Second language | Native apps |
| Encrypted backup file (export / import) | | Push notifications |
| Installable PWA, works offline | | Printed Less Phone Journal |
| **The Grove** (social): add friends only by scanning live QR codes in person, see their trees and completed challenges | Pebbles, "meet again" watering | Chat, friend search, usernames, remote invites |

**Key decision: no accounts, almost no backend.** Everything personal stays on the device. The only server is a *blind relay* for the Grove: it passes end-to-end encrypted friend updates it cannot read. No emails, no phone numbers, no usernames, no contact lists.

**Pitch promise:** "Nothing readable ever leaves your phone. Your friends are people you've actually met."

---

## 3. Stack (fast and simple)

- **Vite + React + TypeScript**
- **vite-plugin-pwa** for install and offline (uses Workbox)
- **idb** for IndexedDB
- **Web Crypto API** (built into browsers): AES-GCM for encryption, PBKDF2 for backup passphrases, ECDH + HKDF for friend keys
- **qrcode** (generate QR) and **qr-scanner** (camera scanning; uses the browser's native barcode detector where available)
- **Firebase Firestore** as the blind relay only: no Firebase Auth, no accounts, stores only encrypted blobs
- **Plain CSS** with CSS variables (light and dark)
- **Deploy:** Vercel, Netlify or Firebase Hosting (any static host with HTTPS). Connect the GitHub repo once; every push deploys in about a minute.
- **No Expo, no APK, no app store builds.** It's a web app: phones open a link and install it from the browser.

### Testing on your phone while building
- Camera and service workers need **HTTPS** (only `localhost` is exempt), so a phone opening `http://192.168.x.x:5173` won't get the camera.
- **Option A (easiest): deploy previews.** Push to a branch, and Vercel or Netlify gives an HTTPS preview link in about a minute.
- **Option B (instant): a tunnel.** Run `npm run dev`, then `cloudflared tunnel --url http://localhost:5173` (or ngrok) and open the HTTPS link on your phone. Changes appear live.
- Do the camera test on a real iPhone and Android early, using one of these HTTPS links.

No other libraries unless truly needed.

### Interaction style (whole app)
- **No dropdowns, no forms, no settings lists, no feeds, no numbers to compete on.**
- **Choices are objects:** the level picker is three stepping stones (Easy, Medium, Brave). The writing timer is an ink line that slowly draws across the screen.
- **Gestures over buttons where it feels natural:** tap a tree to visit it, long-press to leave a pebble.
- **Every screen is a scene,** not a page of controls.

---

## 4. Voice and vibe: Stoic calm, rational psychology

The app feels like a calm, clear-headed mentor: Stoic in attitude, grounded in rational psychology and Janette Rainwater's self-therapy methods. Not cute, not preachy, not "wellness fluff".

### Tone rules
- **Calm and direct.** Short sentences. No exclamation marks, no emojis, no hype.
- **Reason over feelings-talk.** Separate facts from judgments. Ask what is up to you.
- **Responsibility without blame.** You choose; you are not judged.
- **Observation before interpretation.** Notice first, conclude later (Rainwater's self-observation).
- **Respect.** The user is a capable adult. Invite, never scold or guilt.

### Copy examples
| Instead of | Write |
|---|---|
| "Amazing job! You crushed it!" | "Done. That was yours to do, and you did it." |
| "Oh no, you missed a day!" | "Your tree is resting. Today is enough." |
| "Let's journal about your feelings!" | "Write what happened. Then write what you think about it. Keep them apart." |
| "You've got this!" | "What part of this is up to you?" |

### Where the two sources show up
| Source | Ideas used | Example in the app |
|---|---|---|
| **Stoicism** | What is up to me; judgments vs facts; evening review; view from above; voluntary discomfort; preparing for difficulty | Pen prompt: "What went well today? What didn't? What will you do differently?" |
| **Janette Rainwater** (self-observation, responsibility, writing as self-help) | Awareness in the present; "I choose" instead of "I have to"; unsent letters; written dialogues | Pen prompt: "Write three 'I have to' sentences. Rewrite each as 'I choose to' or 'I won't'. Notice the difference." |
| **Rational psychology** (CBT, behavioral activation) | Thought, then a more accurate thought; action before motivation | Talk question: "What is the fact here, and what is the story you're adding?" |

### Pen prompt types (rotate them)
1. **Awareness:** "For two minutes, write sentences starting with 'Right now I notice...'"
2. **Responsibility:** "I have to" rewritten as "I choose to" or "I won't".
3. **Fact vs judgment:** what happened, then what you told yourself about it.
4. **Control:** two columns, up to me and not up to me.
5. **Evening review:** what went well, what didn't, what next time.
6. **Unsent letter:** a few lines to someone, never sent.
7. **View from above:** describe today as if seen from far away.

### Visual vibe
- **Stone and parchment palette:** warm off-white, stone grey, deep olive green, ink black. Dark mode: charcoal and soft parchment text.
- **Typography:** a serif for headings and quotes (system serif stack such as Georgia, no external fonts), clean sans-serif for interface text.
- **Lots of empty space.** One idea per screen. Thin lines, no gradients, no confetti.
- **The tree** drawn like a simple ink sketch, calm rather than cartoonish.

### Sources and quotes
- Stoic quotes only from public-domain translations (e.g. George Long's Marcus Aurelius and Epictetus, Gummere's Seneca), quoted as written, with author and work.
- Rainwater's methods described in your own words, with credit. Never copy text from her books.
- The app's own voice adds no religious or spiritual framing.

---

## 5. Features in detail

### 5.1 Today: the daily challenge (the heart of the app)
- **Home screen = the challenge.** Nothing else competes for attention: the tree on top, the challenge below, one big Done button.
- One challenge per day from a bundled `challenges.json` (about 30 challenges). Everyone gets the same challenge on the same day, which is great for the demo: all judges see the same one.
- Each challenge: title, category, easy / medium / brave text, indoor option, one-line "why".
- **Swap once a day:** if the challenge doesn't fit, the user can get one other challenge. Only once, so it stays a challenge.
- **Done** with level picker (Easy / Medium / Brave), then the **pen moment** (5.2), then the tree grows.
- The full daily loop: **do it → write it → grow**.
- Streak counts days with any level done. Easy always counts.
- After Done, the screen says: "Done for today. See you tomorrow." No more content to scroll.
- **Spend real time on challenge quality.** Let Claude Code draft them, then rewrite them yourself until each one makes you want to do it.

### 5.2 The pen moment (analog writing)
Writing by hand is a core part of the app, not an extra. The app guides; the paper holds the words.

- **Every challenge has one pen prompt,** e.g. "What did you notice that you'd usually miss?"
- **Pen moment screen** after Done: the prompt in large text, "Grab a pen and paper", and a timer choice (2, 5 or 10 minutes).
- **"Put your phone face down. We'll wait."** The timer screen is calm and nearly empty; a soft sound or vibration (where supported) when time is up.
- **"I wrote it" button.** The app never asks what you wrote and never asks you to type it. Your words stay on paper, the most private storage there is.
- **Skipping is allowed** ("Not today"). The challenge still counts; only the roots don't grow.
- **No paper nearby?** A small link to the digital notes (5.6) as a fallback, not the default.

### 5.3 Your tree
A small tree that grows only from real-life actions.

- **Branches grow from doing, roots grow from writing.** Each "I wrote it" adds root growth, visible under a soil line. A tree with deep roots shows a writing habit at a glance.
- **Branch growth per challenge:** Easy = 1 growth point, Medium = 2, Brave = 3.
- **About 8 stages:** seed, sprout, sapling, young tree, tree with leaves, flowering tree, fruit tree, big old tree. Stage thresholds roughly every 5 to 8 points, so a new stage arrives about weekly.
- **Category leaves a mark:** People challenges bring a bird, Outside adds leaves, Notice adds flowers, Body makes the trunk stronger, Create adds fruit, Unplug adds a small bench under the tree.
- **It never dies and never looks sad.** Missed days: the tree simply waits, maybe with "Your tree is resting." No guilt, no punishment. This fits the friendly, non-preachy tone.
- **Drawn in SVG,** built from simple shapes, with a gentle grow animation on Done.
- Stored locally (growth points, stage, visitors). Not sensitive, but still never sent anywhere.

**Why a tree, not a pet:** it matches the "go outside" message, it grows slowly like a real habit, and it avoids pet-guilt mechanics. Note: the Forest app also grows trees, but for *not* using your phone. Your tree grows from *doing* real things. That's a clean difference to mention in the pitch.

### 5.4 The Grove (social, Briar-style)
Friends are added **only in person**, by scanning each other's live QR codes. No search, no invite links, no usernames. Your grove holds only people you have actually met.

#### The scene
- **The Grove tab is one calm landscape,** not a list. Your tree stands in the middle; friends' trees stand around it on a gentle horizon. Swipe sideways to walk through the grove.
- **A small lantern glows** under the trees of friends who completed today's challenge. Everyone has the same challenge each day, so a lit lantern means "they did it too".
- **Closeness means meeting:** trees of friends you met recently stand close; friends you haven't seen for a while stand further back in light mist. Never gone, never sad, just further away. Meeting again brings them close.
- **No counts, no streak numbers, no rankings.** You see trees, not scores.

#### Planting a friendship (the in-person ritual)
1. **Tap the empty patch of soil** in the grove: "Plant together."
2. **The screen becomes a card that flips.** One side shows your **live QR code** inside a slowly breathing ring; the other side is the camera. Text: "Show yours. Then scan theirs."
3. **One phone shows, the other scans.** After a successful scan the card flips by itself: now the other person scans you.
4. **The live QR refreshes every 20 seconds and expires after 60.** A photo or screenshot sent remotely won't work.
5. **The word check:** both screens show the same three words, e.g. *oak · river · lantern*. "Read your words out loud. Do they match?" Two stones: *They match* / *They don't*.
6. **A seed drops and a sapling rises** between the two trees: "Planted. You met in person today."

#### A friend's profile: their trunk
- **Tap a friend's tree** and the camera moves close, then the view turns into a **cross-section of their trunk**.
- **Growth rings show their challenges:** each ring is a week, each segment a day. A filled segment means a completed challenge, its colour shows the category and its thickness the level (Easy, Medium, Brave).
- **Tap a segment** and a small card rises: the challenge title, the level, and "You did this one too" when you both completed it.
- **The centre shows today:** "Done today, Brave" or "Resting today".
- **Their roots** show their writing habit (depth only, never content).
- **"Last met in person: 12 days ago."** Below it: "Meet again to water this friendship."

#### Small gestures (stretch)
- **Pebbles:** long-press a friend's tree to leave a pebble at its base. It means "I see you". One per friend per day. No text, no chat.
- **Watering:** when you meet again and re-scan each other, both trees get a growth point and the friendship moves close in the grove.
- **Let go:** long-press, then "Let this tree go" removes the friend and their keys.

#### How it works technically
- **Identity:** each device creates an ECDH P-256 key pair on first launch (private key non-extractable, stored in IndexedDB). No account.
- **Live QR payload:** public key, display name, a random nonce, a timestamp, and a small snapshot (tree stage and the last 7 days of completions), so the friend's profile appears instantly, even offline.
- **Shared secret:** after both scans, each phone derives the same secret with ECDH, then HKDF derives three things: the mailbox ID, the encryption key, and the three check words.
- **Blind relay:** each friendship has a mailbox in Firestore at a random 128-bit path. Updates (completions, tree stage, pebbles) are encrypted with AES-GCM before upload. The relay stores only ciphertext and expires it after 30 days.
- **Sync:** after Done, the app posts one encrypted update to each friend's mailbox. When the Grove opens, it fetches new updates. Offline changes wait and sync later.
- **Shared with friends:** display name, tree stage and look, root depth, completions (date, challenge, level), pebbles, last meeting date.
- **Never shared:** pen writing (it's on paper), notes, Talk conversations.

#### Honest limits (say them if asked)
- The app can't *prove* physical presence. The live, expiring QR plus the spoken word check make adding someone remotely impractical, and the words also catch a swapped code.
- The relay can see encrypted blobs, mailbox IDs, timing and IP addresses, but not content or names.
- Removing a friend stops future updates; it can't take back what they already received.

### 5.5 Talk it out, then go
Fixed flow, enforced in code:

1. **Listen:** user writes what's on their mind.
2. **Safety check:** crisis keywords trigger a help screen (link to local crisis resources) and the flow ends.
3. **Ask:** one Stoic question from a curated question bank, picked by simple topic keywords (work, relationships, worry, anger, tired, other).
4. **Answer:** user replies.
5. **Ask again:** one follow-up question (max 2 questions, then stop).
6. **Close screen (no "continue" button):**
   - Write your answer on paper.
   - Today's challenge.
   - "Tell one real person": a drafted message sent via the Web Share API.

Text is discarded on close unless the user taps "Save to notes". The close screen leads with the pen: "Write your answer on paper."

**Stretch:** if Chrome's built-in AI (Prompt API) is available, use it to rephrase the chosen question in the user's context. Check the API's current status on day 1. The guided flow is the guaranteed demo path.

Label everywhere: "reflection partner, not a therapist".

### 5.6 Digital notes (when there's no paper)
Paper comes first. Digital notes are the fallback, and for saving a Talk reflection.

- Entries encrypted with AES-GCM before saving to IndexedDB.
- Key: non-extractable CryptoKey stored in IndexedDB.
- Call `navigator.storage.persist()` on first save.

### 5.7 Backup
- Export: ask passphrase twice, derive key with PBKDF2 (SHA-256, 600,000 iterations, random salt), encrypt all entries, download a `.lpml` file.
- Import: pick file, ask passphrase, decrypt, merge entries.

### 5.8 PWA
- Manifest (name, icons 192 / 512, standalone, theme color).
- Precache everything; challenges are bundled, so the whole app works offline.
- "Install app" button on Android; short "Share → Add to Home Screen" guide on iPhone.

---

## 6. Schedule

### Day 1: core app
| Time | Task |
|---|---|
| 0:00-0:30 | Create repo, add CLAUDE.md, scaffold Vite app with Claude Code |
| 0:30-2:30 | Daily challenge: 30 challenges with pen prompts (rewrite them yourself), Today screen, swap once, Done, pen moment with timer, streak |
| 2:30-4:00 | The tree: SVG stages, branches and roots, category visitors, grow animation |
| 4:00-5:30 | Encrypted digital notes (crypto module + tests first, then UI) |
| 5:30-6:30 | PWA: manifest, icons, offline, install button and iPhone guide |
| 6:30-7:00 | Deploy first version. Test on a real Android and iPhone, including a 10-minute camera test: can the installed app open the camera and read a QR code? |

### Day 2: the shiny part
| Time | Task |
|---|---|
| 0:00-2:00 | Talk it out, then go: question bank, flow, safety check, close screen, Web Share |
| 2:00-3:00 | Grove foundations: friend crypto (ECDH, HKDF, AES-GCM) with tests, Firestore relay and rules |
| 3:00-4:30 | Planting ritual: live QR, camera scan, flip card, word check. Test on two real phones immediately |
| 4:30-5:30 | Grove scene, friend trunk with growth rings, lanterns, sync after Done |
| 5:30-6:00 | Final deploy; test two phones, airplane mode, and an iPhone home-screen install |
| 6:00-7:00 | Print pen cards, rehearse the pitch and the two-phone demo 3 times |

**Moved to stretch:** encrypted backup (export first), pebbles, watering, Chrome AI. Fix bugs and polish in any gap.

**Biggest risk:** camera scanning inside an installed iPhone web app. Test it on Day 1 evening with a tiny prototype, before building the rest of the Grove.

**Cut order if behind:** Chrome AI → dark mode → backup import → pebbles and watering → mist and closeness in the grove → tree visitors (keep stages) → install guide polish.

**Minimum Grove for the demo:** plant a friend by mutual scan with the word check, see their tree in the grove, open their trunk rings.

**Never cut:** the daily challenge, the pen moment, and the tree growing. That's the core loop: do it, write it, grow.

---

## 7. Claude Code prompts (copy one at a time)

Use **plan mode** first for bigger steps, review the plan, then let it build. Commit after each step. Use `/clear` between features.

**Step 1: scaffold**
> Read CLAUDE.md. Scaffold a Vite + React + TypeScript app with vite-plugin-pwa. Create the folder structure from CLAUDE.md, a basic layout with a quiet bottom navigation of four symbols (Today, Talk, Grove, Notes), no labels-heavy menus, and CSS variables for light and dark themes following the visual vibe in CLAUDE.md (stone and parchment palette, serif headings from the system serif stack, lots of empty space). No other libraries.

**Step 2: challenges**
> Create src/data/challenges.json with 30 challenges across six categories: outside, people, unplug, notice, body, create. Each has id, title, category, easy, medium, brave, indoor, why, and pen (one short handwriting prompt, rotating the 7 pen prompt types in CLAUDE.md). Voice: Stoic calm and rational psychology based on Janette Rainwater's methods, as described in CLAUDE.md. No exclamation marks, no emojis, no hype. Then build the Today screen: pick the challenge by day number, show three levels and the indoor option, one swap per day, a Done button with level choice, and a streak stored in IndexedDB. After Done, show the pen moment screen: the pen prompt in large text, "Grab a pen and paper", timer options 2, 5 and 10 minutes, "Put your phone face down. We'll wait.", a gentle signal when time is up (vibration where supported), an "I wrote it" button and a "Not today" link. Never ask the user to type what they wrote.

**Step 2b: the tree**
> Build src/features/tree/: an SVG tree with 8 growth stages (seed, sprout, sapling, young tree, leafy tree, flowering tree, fruit tree, big old tree), drawn from simple shapes in calm greens and warm browns. Two kinds of growth: branch points from challenges (easy 1, medium 2, brave 3) and root points from each "I wrote it" in the pen moment; draw roots below a soil line so a writing habit is visible. Stage thresholds in one config object so I can tune them. Category visitors: people = bird, outside = extra leaves, notice = flowers, body = thicker trunk, create = fruit, unplug = small bench. Store points, stage and visitors in IndexedDB. Animate growth after Done (respect prefers-reduced-motion). The tree never dies or looks sad; after missed days show "Your tree is resting." Add a hidden dev button to add points quickly for testing and the demo.

**Step 3: crypto first**
> Write src/lib/crypto.ts using only the Web Crypto API: create and store a non-extractable AES-GCM key in IndexedDB (use idb), encrypt and decrypt JSON with a random 12-byte IV, and PBKDF2-based passphrase encryption for backups (SHA-256, 600000 iterations, random 16-byte salt). Add unit tests with Vitest: round trip works, wrong passphrase fails, IV is never reused.

**Step 4: digital notes**
> Build the Notes screen (fallback for when there's no paper): list, create, delete entries. Top of the screen reminds: "Paper first. Notes are here when you have no pen." Every entry is encrypted with crypto.ts before saving. Nothing is ever sent over the network. Request persistent storage on first save.

**Step 5: PWA**
> Configure vite-plugin-pwa: manifest, generated icons, precache all assets, prompt-style update ("New version available, tap to refresh"). Add an Install button using beforeinstallprompt on Android, and a short Add to Home Screen guide for iOS Safari.

**Step 6: Talk it out, then go**
> Build the Talk flow as a state machine in src/features/talk/: listen → safety → ask → answer → ask → close. Max 2 questions, enforced in code. Create src/data/questions.json with questions grouped by topic and simple keyword matching. Draw on Stoic reasoning (what is up to me, fact vs judgment, view from above) and Rainwater's methods (self-observation, "I choose" language, written dialogue). Calm, direct, one sentence each. Create src/lib/safety.ts that checks for crisis signs and shows a help screen that ends the flow. The close screen shows: write on paper, today's challenge, and "tell one real person" with a drafted message via the Web Share API (copy-to-clipboard fallback). Discard text on close unless the user taps Save to notes. Add tests for safety.ts and the state machine.

**Step G1: friend crypto (do this first, with tests)**
> Read CLAUDE.md and section 5.4 of docs/HACKATHON_PLAN.md. Write src/lib/friendCrypto.ts using only Web Crypto: create and store an ECDH P-256 identity key pair in IndexedDB (private key non-extractable), export the public key as base64, derive a shared secret from our private key and their public key, then use HKDF (SHA-256, salt = SHA-256 of both public keys sorted, so both phones get the same result) to derive a 128-bit mailbox ID, an AES-GCM key, and three check words from src/data/words.json (256 calm nature words). Add encrypt/decrypt for update messages. Vitest tests: two simulated devices derive the same mailbox ID, key and words; a third device cannot decrypt.

**Step G2: blind relay**
> Add Firebase (Firestore only, no Auth). src/lib/relay.ts: post an encrypted update to boxes/{mailboxId}/msgs, fetch updates newer than a timestamp. Write firestore.rules: only get and list on a known mailbox path, create only with fields c (ciphertext, under 8 KB), iv, t (must equal request.time) and exp; no update, no delete, no collection-group rule, deny everything else. Document how to enable a Firestore TTL policy on exp (30 days). Never send plain text or names to the relay.

**Step G3: planting ritual**
> Build src/features/grove/plant/: a flip card. Front: my live QR (qrcode library) inside a slowly breathing ring, payload = public key, display name, nonce, timestamp, snapshot (tree stage, last 7 days of completions); refresh every 20 seconds; reject scanned codes older than 60 seconds. Back: camera scanner (qr-scanner library). After I scan them, flip automatically so they can scan me. When both keys are known, show the three check words large in serif, "Read your words out loud. Do they match?" with two stones: They match / They don't. On match: save the friend, show a seed dropping and a sapling rising, "Planted. You met in person today." No dropdowns, no forms; the only text input in the whole flow is a one-time display name the first time.

**Step G4: the grove and the trunk**
> Build the Grove tab as one horizontal landscape scene in SVG: my tree in the centre, friends' trees around it on a gentle horizon; swipe to move. Distance and light mist depend on days since last in-person scan (never hide a friend). A lantern glows under trees of friends who completed today's challenge. Tap a tree: zoom in, then transition to a cross-section of their trunk with weekly growth rings; each day is a segment coloured by category, thickness by level; tap a segment for a small card (challenge title, level, "You did this one too"). Centre shows today's status; show root depth and "Last met in person: X days ago. Meet again to water this friendship." After Done on Today, post one encrypted update per friend; fetch updates when the Grove opens. No counts, no rankings. Respect prefers-reduced-motion and add accessible labels (screen readers get a simple list of friends and their recent challenges).

**Step G5 (stretch): pebbles, watering, let go**
> Long-press a friend's tree: leave a pebble (one per friend per day, shown at the base of their tree on their phone). Re-scanning a friend in person waters the friendship: both trees +1 growth point and closeness resets. Long-press then "Let this tree go" removes the friend and deletes their keys.

**Step 7 (stretch): backup**
> Add Settings with Export backup (passphrase twice, encrypt all entries with the PBKDF2 method, download .lpml file) and Import backup (file picker, passphrase, decrypt, merge). Clear warning: a lost passphrase means lost data.

**Step 7b (stretch): printable pen sheet**
> Add "Print this week's pen sheet" in Settings: a print stylesheet that lays out the next 7 days, each with the challenge title, the pen prompt and empty lines for handwriting, on one A4 page. Use window.print(); no PDF libraries.

**Step 8 (stretch): Chrome AI**
> Check if Chrome's built-in Prompt API is available in this browser. If yes, add an optional engine in src/lib/ai.ts that rephrases the selected question to fit the user's words in one short sentence, with a 200-character limit and fallback to the original question on any error. If not available, do nothing; the guided flow stays the default.

**Step 9: security review**
> Review the whole codebase: confirm the only network requests are loading the app and encrypted updates to the relay (never plain text, names or notes), no third-party scripts, no dangerouslySetInnerHTML, no personal text in console logs. List any issues and fix them.

---

## 8. Demo script (inside the 2-minute pitch)

1. Hand each judge a small paper card and a pen. The card has today's pen prompt and a QR code. They scan it; the app opens on their phones, all with the same challenge.
2. Show Today's challenge, tap Done on Brave, then the pen moment: "Put your phone face down." Ask the judges to write one line on their card. Tap "I wrote it" and **watch the roots and branches grow**. Then show a tree from a "two weeks later" demo state with birds and flowers (use the dev button).
3. Run "Talk it out, then go" live: type a real worry, get a Stoic question, reach the close screen.
4. **Plant a friendship live** with a judge or your teammate: one shows, one scans, the card flips, scan back. Both read the three words out loud: "oak, river, lantern". The sapling rises, and their tree appears in your grove with its lantern lit.
5. Tap their tree: the trunk rings show the challenges they completed, including today's. "You did this one too."
6. **The wow moment:** open DevTools → Network tab. The only requests go to the relay, and they contain unreadable ciphertext. No names, no accounts. IndexedDB: notes are encrypted. And the pen writing? It's on paper. The app never had it.
7. Switch on airplane mode. The app still works, and you can still plant a friendship: the QR code carries everything needed.

---

## 9. Safety note for the demo

- Show "Reflection partner, not a therapist" on the Talk screen.
- Test the crisis path once before the demo, so the help screen works.
- Don't use real personal stories in the live demo.
- Prepare two phones with the app installed and a few days of demo data, in case a judge's phone camera is slow.
