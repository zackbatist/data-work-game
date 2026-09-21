# Decisions and Actions at the Trowel's Edge

A set of interactive role-playing scenes about archaeological data work, drawn from published research on how archaeologists actually make decisions in the field.

A measurement or a database entry is the product of a specific decision someone made in the field. The record rarely shows what that decision was, or why. These scenes put you in that position: an assistant deciding whether a change in soil counts as a new stratigraphic unit, a database manager deciding what belongs in a formal record and what gets left out, a team debating how to publish a colleague's field notes.

## Playing it

Open `index.html` through a local web server (not by double-clicking the file, since it fetches `content.json` at runtime, which requires HTTP). From the project folder:

```
python3 -m http.server 8000
```

Then visit `http://localhost:8000`.

Also live at `https://zackbatist.info/data-work-game/`.

## Structure

- `index.html` — page shell
- `style.css` — styling, including light/dark theme support
- `script.js` — rendering logic and interactivity
- `content.json` — all scene text, quotes, choices, and citations
- `images/` — photographs and figures from the source research
