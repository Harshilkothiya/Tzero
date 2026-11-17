# Tzero

Tzero is a countdown lock-screen generator that keeps you focused on your deadline. Set a goal and a deadline, define T-minus milestones with five-word titles, and export a crisp frosted-glass wallpaper to your phone's lock screen. Everything runs in the browser — no backend, no API, no account.

## Features

- **Live countdown** — Days, hours, minutes and seconds tick down on the page while you work.
- **Editable goal and deadline** — Type your goal title and pick your deadline; the wallpaper updates instantly.
- **T-minus milestones** — Up to 7 milestones, each anchored a fixed number of days before the deadline. Dates are computed automatically and move with your deadline. Titles are limited to five words so they stay readable on the wallpaper.
- **Daily checklist** — A personal task list that resets itself every day. It is not on the wallpaper — it is for you alone.
- **Frosted-glass wallpaper export** — A static PNG with the Ignition design: midnight sky, ember glow, a frosted card, the **T-MINUS** wordmark, and your milestone checklist with icons. Android (9:16, 20:9) and iPhone (19.5:9, Pro Max) presets are built in.
- **Persistent state** — Everything is saved in `localStorage`; nothing leaves your browser.

---

## Run locally

Open `index.html` in any modern browser. No build step required.

---

## How the wallpaper works

The wallpaper is a **static PNG snapshot**. It shows your milestone titles, their fixed T-minus dates, and their checkbox state at the moment of export. It does not tick or update on its own. Re-export whenever you tick a milestone or change your goal.

---

## Structure

```
index.html            Main app
css/style.css         Ignition theme stylesheet
js/script.js          App logic, state, canvas drawing
design/
  wallpaper-reference.png     Visual reference (1080 × 1920)
  wallpaper-reference.html    Reference HTML with exact CSS values
  lockscreen-preview.png      Wallpaper on a phone with clock
  *.woff2                     Font files for the reference page only
README.md
```

