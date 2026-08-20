# The Accord of Nine Banners — Table

A mobile-first D&D **story companion** the whole group opens on their phones while they play together at a real table. Illustrated scenes, a shared caption, party tracker, and a level-up coach. Not a video game you walk around on the phone.

Static HTML/CSS/JS. No build step. No accounts.

## Open locally

From this folder:

```bash
python3 -m http.server 8765
```

Then open [http://127.0.0.1:8765/](http://127.0.0.1:8765/) on the computer, or `http://<that-machine-lan-ip>:8765/` on phones on the same wifi.

You can also open `index.html` directly as a file. Scripts are classic tags (not modules) so `file://` works.

Hosting (a public URL the whole table shares) comes next.

## Sit down

- **Open as DM** — set a table PIN (default `9BANNERS`).
- **Join as player** — type a name. A blade is created for you.
- Table code: `9B-PELLANE`.
- Role chip toggles DM ↔ player (PIN required to become DM).
- Query params: `?dm=1`, `?name=Kade`.

State lives in `localStorage` under `nb-table-state`. Same-browser tabs sync with `BroadcastChannel`. Different phones do not share state until this is hosted with a real sync later.

## What you get

- **Stage** — a living storybook page. Full-bleed pixel scene art, a cast strip of who is present, and a caption for the current beat (typewriter; tap to continue). Tap a portrait to hear that person. Nobody steers an avatar.
- **Face-off** (DM) — a tense beat the table looks at together: two figures, bars, Speak · Look · Act (or Fight) · Leave. Start or end from the DM tools.
- **Party** — HP thumbs, AC, skills, conditions. Coach lists what that class+level should have claimed (2014 PHB): HP, proficiency, subclass timing, ASI/feat, Extra Attack, slot jumps.
- **People** — player-safe dossiers. No campaign twists.
- **Dice** — d4–d20, last roll on the table.

## Art in this folder

| File | Use |
|---|---|
| `art/inn.png` | Low Quay inn |
| `art/quay.png` | Pellane quay / procession / streets |
| `art/hall.png` | Granary-hall petitions |
| `art/faceoff.png` | Face-off / banquet atmosphere |
| `art/cast.png` | Sprite sheet (magenta `#FF00FF` key): sellsword, Sera, Aldren, Dreth |

### Still missing (placeholders / reused art)

Generate these if you want unique rooms and the rest of the cast:

- `art/bridge.png`
- `art/banquet.png` (unique; currently reuses faceoff)
- `art/procession.png`
- `art/pellane.png`
- Cast frames for Ise Calren, Brann Orswick, Tolla, Speaker Kell, Ysolde Thane, Corin Ivola, Pava Rell, Durne, Lir, Mara Quell

JPG aliases (`quay.jpg`, `inn.jpg`, …) are not required; the app loads the PNGs above.
