# World Cup Challenge

A static GitHub Pages app for a six-person World Cup pool.

## What it does

- Assigns 48 teams to 6 players.
- Keeps the draw fair by giving each player 2 teams from each of the 4 World Cup pots.
- Pulls match scores automatically from ESPN's public FIFA World Cup scoreboard feed.
- Calculates wins, draws, goals, clean sheets, and knockout progress without manual score entry.
- Uses `data/challenge-state.json` only for player names, assignments, scoring rules, and optional side-bet awards.

## Run locally

From this folder:

```powershell
python -m http.server 4173
```

Open:

```text
http://localhost:4173
```

Commissioner mode:

```text
http://localhost:4173?admin=1
```

## First setup

1. Open Commissioner mode.
2. Replace `Player 1` through `Player 6` with your friend names.
3. Click `Randomize teams`.
4. Download the setup file.
5. Replace `data/challenge-state.json` with the downloaded file.

## Publish on GitHub Pages

1. Create a GitHub repo.
2. Put these files at the repo root, or keep the folder and point Pages at the folder if your repo setup supports it.
3. In GitHub, go to `Settings` then `Pages`.
4. Set the source to your main branch.
5. Send everyone the published GitHub Pages URL.

## Scores during the tournament

No manual score entry is needed. The page fetches ESPN's World Cup scoreboard feed directly from each browser and refreshes every 30 seconds by default.

If you change names or assignments later, open the public site with `?admin=1`, download the setup file, replace `data/challenge-state.json` in GitHub, and commit it.

GitHub Pages is static, but the scoring feed is live because the browser pulls ESPN directly. If ESPN changes or removes the public endpoint, the app will keep showing the setup and report that the live feed is offline.
