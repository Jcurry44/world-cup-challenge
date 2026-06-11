const QUERY = new URLSearchParams(window.location.search);
const SETUP_URL = new URL(QUERY.get("state") || "./data/challenge-state.json", window.location.href);
const ESPN_SCOREBOARD_URL = "https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard?dates=20260611-20260719&limit=300";
const ADMIN_PARAM = QUERY.get("admin");
const STAGES = ["Group stage", "Round of 32", "Round of 16", "Quarterfinals", "Semifinals", "Final", "Champion"];
const NEXT_STAGE = {
  "Round of 32": "Round of 16",
  "Round of 16": "Quarterfinals",
  Quarterfinals: "Semifinals",
  Semifinals: "Final",
  Final: "Champion"
};

const TEAM_ALIASES = new Map(
  Object.entries({
    "south korea": "kor",
    "korea republic": "kor",
    "united states": "usa",
    "usa": "usa",
    "czech republic": "cze",
    "czechia": "cze",
    "cote divoire": "civ",
    "cote d'ivoire": "civ",
    "ivory coast": "civ",
    "turkey": "tur",
    "turkiye": "tur",
    "dr congo": "cod",
    "congo dr": "cod",
    "congo democratic republic": "cod",
    "cabo verde": "cpv",
    "cape verde": "cpv",
    "curacao": "cuw",
    "iran": "irn",
    "ir iran": "irn",
    "saudi arabia": "ksa"
  }).map(([name, id]) => [normalizeName(name), id])
);

let state = null;
let isAdmin = ADMIN_PARAM === "1";
let localDirty = false;
let activeView = isAdmin ? "admin" : "scoreboard";
let teamFilters = { pot: "all", owner: "all", group: "all" };
let adminFilters = { pot: "all", owner: "all", group: "all" };
let setupPollTimer = null;
let livePollTimer = null;
let live = createLiveState();

const els = {
  syncState: document.getElementById("sync-state"),
  syncDetail: document.getElementById("sync-detail"),
  footerUpdated: document.getElementById("footer-updated"),
  draftNotice: document.getElementById("draft-notice"),
  leaderboard: document.getElementById("leaderboard"),
  scoreSummary: document.getElementById("score-summary"),
  teamFilters: document.getElementById("team-filters"),
  teamTableBody: document.getElementById("team-table-body"),
  matchTableBody: document.getElementById("match-table-body"),
  rulesGrid: document.getElementById("rules-grid"),
  adminToggle: document.getElementById("admin-toggle"),
  playerEditor: document.getElementById("player-editor"),
  adminFilters: document.getElementById("admin-filters"),
  adminTeamTableBody: document.getElementById("admin-team-table-body"),
  refreshButton: document.getElementById("refresh-button"),
  refreshLiveButton: document.getElementById("refresh-live-button"),
  randomizeButton: document.getElementById("randomize-button"),
  clearAssignmentsButton: document.getElementById("clear-assignments-button"),
  downloadJsonButton: document.getElementById("download-json-button"),
  copyJsonButton: document.getElementById("copy-json-button"),
  importJsonInput: document.getElementById("import-json-input"),
  loadPublishedButton: document.getElementById("load-published-button")
};

document.addEventListener("DOMContentLoaded", init);

async function init() {
  bindEvents();
  setView(activeView);
  await loadPublishedState({ force: true });
  await loadLiveScores();
  startPolling();
}

function bindEvents() {
  document.querySelectorAll("[data-view]").forEach((button) => {
    button.addEventListener("click", () => setView(button.dataset.view));
  });

  els.adminToggle.addEventListener("click", () => {
    isAdmin = true;
    setView("admin");
    render();
  });

  els.refreshButton.addEventListener("click", () => {
    loadPublishedState({ force: !localDirty });
    loadLiveScores();
  });
  els.refreshLiveButton.addEventListener("click", loadLiveScores);
  els.loadPublishedButton.addEventListener("click", () => loadPublishedState({ force: true }));
  els.randomizeButton.addEventListener("click", randomizeAssignments);
  els.clearAssignmentsButton.addEventListener("click", clearAssignments);
  els.downloadJsonButton.addEventListener("click", downloadState);
  els.copyJsonButton.addEventListener("click", copyStateJson);
  els.importJsonInput.addEventListener("change", importStateJson);
}

function setView(view) {
  activeView = view;
  document.querySelectorAll(".view").forEach((panel) => panel.classList.remove("is-active"));
  document.querySelectorAll(".nav-button").forEach((button) => button.classList.remove("is-active"));

  const panel = document.getElementById(`${view}-view`);
  if (panel) panel.classList.add("is-active");

  const navButton = document.querySelector(`[data-view="${view}"]`);
  if (navButton) navButton.classList.add("is-active");

  if (view === "admin") {
    els.adminToggle.classList.add("is-active");
  }
}

async function loadPublishedState({ force = false } = {}) {
  try {
    const response = await fetch(withCacheBust(SETUP_URL), { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`Setup file returned ${response.status}`);
    }

    const nextState = normalizeState(await response.json());
    if (!localDirty || force || !state) {
      state = nextState;
      localDirty = false;
      render();
    }
  } catch (error) {
    if (!state) {
      state = createEmptyState();
      render();
    }
  }
}

async function loadLiveScores() {
  setSync("Updating", "Pulling ESPN match data...");
  try {
    const response = await fetch(withCacheBust(new URL(ESPN_SCOREBOARD_URL)), { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`ESPN feed returned ${response.status}`);
    }

    const data = await response.json();
    live = buildLiveState(data);
    const liveText = live.inProgressCount
      ? `${live.inProgressCount} live, ${live.completedCount} final`
      : `${live.completedCount} final matches loaded`;
    setSync("Connected", `${liveText}. Updated ${formatDateTime(live.loadedAt)}.`);
    render();
  } catch (error) {
    live.error = error;
    setSync("Feed offline", "Could not reach ESPN. Showing latest loaded setup.");
    render();
  }
}

function startPolling() {
  window.clearInterval(setupPollTimer);
  window.clearInterval(livePollTimer);

  setupPollTimer = window.setInterval(() => {
    if (!localDirty) loadPublishedState();
  }, 60 * 1000);

  livePollTimer = window.setInterval(loadLiveScores, Math.max(15, state?.meta?.livePollSeconds || 30) * 1000);
}

function render() {
  if (!state) return;
  const hasAssignments = state.teams.some((team) => team.ownerId);
  els.draftNotice.classList.toggle("is-hidden", hasAssignments);

  renderLeaderboard();
  renderSummary();
  renderFilters(els.teamFilters, teamFilters, "team");
  renderTeamTable();
  renderMatchTable();
  renderRules();
  renderAdmin();

  const setupStatus = localDirty ? "Local setup changes not published" : `Setup loaded from ${SETUP_URL.pathname}`;
  const liveStatus = live.loadedAt ? `ESPN feed updated ${formatDateTime(live.loadedAt)}` : "Waiting for ESPN feed";
  els.footerUpdated.textContent = `${setupStatus}. ${liveStatus}.`;
}

function renderLeaderboard() {
  const standings = getStandings();
  els.leaderboard.innerHTML = standings
    .map((entry, index) => {
      const teamsByPot = [1, 2, 3, 4]
        .map((pot) => {
          const chips = entry.teams
            .filter((team) => team.pot === pot)
            .sort(sortTeamsByScore)
            .map((team) => `<span class="team-chip" data-pot="${team.pot}">${escapeHtml(team.name)} ${teamScore(team)}</span>`)
            .join("");
          return `
            <div class="pot-row">
              <span class="pot-label">Pot ${pot}</span>
              <div class="team-chip-wrap">${chips || `<span class="team-chip" data-pot="${pot}">Unassigned</span>`}</div>
            </div>
          `;
        })
        .join("");

      return `
        <article class="player-card">
          <div class="player-card__top">
            <div>
              <span class="player-card__rank">Rank ${index + 1}</span>
              <h3>${escapeHtml(entry.player.name)}</h3>
            </div>
            <div class="score-badge">
              <strong>${entry.score}</strong>
              <span>points</span>
            </div>
          </div>
          <div class="player-card__teams">${teamsByPot}</div>
        </article>
      `;
    })
    .join("");
}

function renderSummary() {
  const standings = getStandings();
  const allTeams = [...state.teams].sort(sortTeamsByScore);
  const leader = standings[0];
  const topTeam = allTeams[0];
  const assignedCount = state.teams.filter((team) => team.ownerId).length;
  const currentMatches = live.matches.filter((match) => match.inProgress);
  const nextMatch = live.matches.find((match) => !match.completed && !match.inProgress && new Date(match.date) > new Date());

  const cards = [
    {
      label: "Leader",
      value: leader ? leader.player.name : "None",
      note: leader ? `${leader.score} points from ${leader.teams.length} teams` : "Assign teams to start"
    },
    {
      label: "Top team",
      value: topTeam ? topTeam.name : "None",
      note: topTeam ? `${teamScore(topTeam)} points, owned by ${ownerName(topTeam.ownerId)}` : "No scores yet"
    },
    {
      label: "Live now",
      value: currentMatches.length || "None",
      note: currentMatches[0] ? currentMatches[0].shortName : nextMatch ? `Next: ${nextMatch.shortName}` : "Waiting for schedule"
    },
    {
      label: "Completed",
      value: live.completedCount,
      note: `${live.matches.length} matches in feed`
    },
    {
      label: "Assigned teams",
      value: `${assignedCount}/48`,
      note: "Two teams per pot per player"
    },
    {
      label: "Scoring source",
      value: "ESPN",
      note: live.error ? "Feed currently unavailable" : "Autonomous browser refresh"
    }
  ];

  els.scoreSummary.innerHTML = cards
    .map(
      (card) => `
        <article class="metric-card">
          <span class="eyebrow">${escapeHtml(card.label)}</span>
          <strong>${escapeHtml(String(card.value))}</strong>
          <p>${escapeHtml(card.note)}</p>
        </article>
      `
    )
    .join("");
}

function renderFilters(container, filters, scope) {
  const players = state.players
    .map((player) => `<option value="${player.id}" ${filters.owner === player.id ? "selected" : ""}>${escapeHtml(player.name)}</option>`)
    .join("");
  const groups = [...new Set(state.teams.map((team) => team.group))].sort();
  container.innerHTML = `
    <select aria-label="Filter by pot" data-filter="pot" data-scope="${scope}">
      <option value="all">All pots</option>
      ${[1, 2, 3, 4].map((pot) => `<option value="${pot}" ${filters.pot === String(pot) ? "selected" : ""}>Pot ${pot}</option>`).join("")}
    </select>
    <select aria-label="Filter by owner" data-filter="owner" data-scope="${scope}">
      <option value="all">All owners</option>
      <option value="none" ${filters.owner === "none" ? "selected" : ""}>Unassigned</option>
      ${players}
    </select>
    <select aria-label="Filter by group" data-filter="group" data-scope="${scope}">
      <option value="all">All groups</option>
      ${groups.map((group) => `<option value="${group}" ${filters.group === group ? "selected" : ""}>Group ${group}</option>`).join("")}
    </select>
  `;

  container.querySelectorAll("select").forEach((select) => {
    select.addEventListener("change", () => {
      const target = select.dataset.scope === "admin" ? adminFilters : teamFilters;
      target[select.dataset.filter] = select.value;
      render();
    });
  });
}

function renderTeamTable() {
  els.teamTableBody.innerHTML = filteredTeams(teamFilters)
    .sort((a, b) => a.pot - b.pot || a.group.localeCompare(b.group) || a.name.localeCompare(b.name))
    .map((team) => {
      const stats = computedTeam(team);
      return `
        <tr>
          <td>
            <div class="team-name">
              <strong>${escapeHtml(team.name)}</strong>
              <span>${escapeHtml(team.id.toUpperCase())}</span>
            </div>
          </td>
          <td>Pot ${team.pot}</td>
          <td>${escapeHtml(team.group)}</td>
          <td>${escapeHtml(ownerName(team.ownerId))}</td>
          <td>${stats.groupWins}-${stats.groupDraws}-${stats.groupLosses}</td>
          <td>${stats.goalsFor}</td>
          <td><span class="stage-pill">${escapeHtml(stats.stage)}</span></td>
          <td><strong>${teamScore(team)}</strong></td>
        </tr>
      `;
    })
    .join("");
}

function renderMatchTable() {
  const now = new Date();
  const rows = live.matches
    .filter((match) => {
      const matchDate = new Date(match.date);
      return match.inProgress || match.completed || matchDate >= new Date(now.getTime() - 36 * 60 * 60 * 1000);
    })
    .slice(0, 120)
    .map(
      (match) => `
        <tr>
          <td>${escapeHtml(formatMatchDate(match.date))}</td>
          <td>${escapeHtml(match.stage)}</td>
          <td>
            <div class="team-name">
              <strong>${escapeHtml(match.homeName)} vs ${escapeHtml(match.awayName)}</strong>
              <span>${escapeHtml(match.venue || "Venue TBD")}</span>
            </div>
          </td>
          <td>${escapeHtml(match.statusDetail)}</td>
          <td><strong>${escapeHtml(match.scoreLine)}</strong></td>
        </tr>
      `
    )
    .join("");

  els.matchTableBody.innerHTML = rows || `<tr><td colspan="5">No ESPN matches loaded yet.</td></tr>`;
}

function renderRules() {
  const scoring = state.scoring;
  const stageRules = STAGES.map((stage) => `${stage}: ${scoring.stage[stage] || 0}`).join(", ");
  const cards = [
    {
      title: "Team Assignment",
      text: "Each of the six players gets exactly eight teams: two from Pot 1, two from Pot 2, two from Pot 3, and two from Pot 4."
    },
    {
      title: "Automatic Match Points",
      text: `ESPN supplies match status and scores. Group win ${scoring.groupWin}, group draw ${scoring.groupDraw}, each goal ${scoring.goal}, each final clean sheet ${scoring.cleanSheet}.`
    },
    {
      title: "Progress Bonus",
      text: stageRules
    },
    {
      title: "Live Behavior",
      text: "Goals count while matches are live. Wins, draws, clean sheets, and knockout advancement lock in after ESPN marks a match final."
    },
    {
      title: "Setup Updates",
      text: "Only names and team ownership live in the GitHub setup file. Scores are recalculated in every browser from the live feed."
    },
    {
      title: "Winner",
      text: "Add up all team scores for each player. Highest total after the final wins the pool."
    }
  ];

  els.rulesGrid.innerHTML = cards
    .map(
      (card) => `
        <article class="rule-card">
          <h3>${escapeHtml(card.title)}</h3>
          <p>${escapeHtml(card.text)}</p>
        </article>
      `
    )
    .join("");
}

function renderAdmin() {
  els.adminToggle.hidden = false;
  document.getElementById("admin-view").classList.toggle("is-hidden", !isAdmin && activeView !== "admin");
  renderPlayerEditor();
  renderFilters(els.adminFilters, adminFilters, "admin");
  renderAdminTeamTable();
}

function renderPlayerEditor() {
  els.playerEditor.innerHTML = state.players
    .map(
      (player, index) => `
        <div class="field">
          <label for="player-${index}">Player ${index + 1}</label>
          <input id="player-${index}" type="text" value="${escapeAttribute(player.name)}" data-player-id="${player.id}" />
        </div>
      `
    )
    .join("");

  els.playerEditor.querySelectorAll("input").forEach((input) => {
    input.addEventListener("change", () => {
      const player = state.players.find((item) => item.id === input.dataset.playerId);
      player.name = input.value.trim() || `Player ${state.players.indexOf(player) + 1}`;
      markDirty();
      render();
    });
  });
}

function renderAdminTeamTable() {
  const ownerOptions = [`<option value="">Unassigned</option>`]
    .concat(state.players.map((player) => `<option value="${player.id}">${escapeHtml(player.name)}</option>`))
    .join("");

  els.adminTeamTableBody.innerHTML = filteredTeams(adminFilters)
    .sort((a, b) => a.pot - b.pot || a.group.localeCompare(b.group) || a.name.localeCompare(b.name))
    .map((team) => {
      const stats = computedTeam(team);
      return `
        <tr>
          <td>
            <div class="team-name">
              <strong>${escapeHtml(team.name)}</strong>
              <span>Pot ${team.pot} / Group ${escapeHtml(team.group)}</span>
            </div>
          </td>
          <td>
            <select class="editor-select" data-team-id="${team.id}" data-field="ownerId">
              ${ownerOptions.replace(`value="${team.ownerId || ""}"`, `value="${team.ownerId || ""}" selected`)}
            </select>
          </td>
          <td>
            <input class="editor-input" type="number" min="0" step="1" value="${Number(team.awards || 0)}" data-team-id="${team.id}" data-field="awards" />
          </td>
          <td>${stats.groupWins}-${stats.groupDraws}-${stats.groupLosses}, ${stats.goalsFor} GF</td>
          <td><span class="stage-pill">${escapeHtml(stats.stage)}</span></td>
          <td><strong>${teamScore(team)}</strong></td>
        </tr>
      `;
    })
    .join("");

  els.adminTeamTableBody.querySelectorAll("input, select").forEach((control) => {
    control.addEventListener("change", () => updateTeamField(control));
  });
}

function updateTeamField(control) {
  const team = state.teams.find((item) => item.id === control.dataset.teamId);
  const field = control.dataset.field;
  if (!team) return;
  team[field] = control.type === "number" ? Math.max(0, Number(control.value || 0)) : control.value;
  markDirty();
  render();
}

function randomizeAssignments() {
  const playerIds = state.players.map((player) => player.id);
  state.teams.forEach((team) => {
    team.ownerId = "";
  });

  [1, 2, 3, 4].forEach((pot) => {
    const teams = shuffle(state.teams.filter((team) => team.pot === pot));
    const slots = shuffle(playerIds.flatMap((id) => [id, id]));
    teams.forEach((team, index) => {
      team.ownerId = slots[index];
    });
  });

  stampUpdate();
  markDirty();
  render();
}

function clearAssignments() {
  state.teams.forEach((team) => {
    team.ownerId = "";
  });
  stampUpdate();
  markDirty();
  render();
}

function downloadState() {
  stampUpdate();
  const blob = new Blob([stableStringify(state)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "challenge-state.json";
  link.click();
  URL.revokeObjectURL(url);
}

async function copyStateJson() {
  stampUpdate();
  const text = stableStringify(state);
  try {
    await navigator.clipboard.writeText(text);
    setSync("Copied", "Setup JSON copied to clipboard.");
  } catch (error) {
    setSync("Copy failed", "Use Download setup file instead.");
  }
}

async function importStateJson(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  try {
    const imported = JSON.parse(await file.text());
    state = normalizeState(imported);
    stampUpdate();
    markDirty();
    render();
    setSync("Imported", "Review assignments, then publish the setup file.");
  } catch (error) {
    setSync("Import failed", "That file was not valid challenge JSON.");
  } finally {
    event.target.value = "";
  }
}

function buildLiveState(scoreboard) {
  const next = createLiveState();
  const knownTeamIds = new Set(state.teams.map((team) => team.id));
  state.teams.forEach((team) => next.teamStats.set(team.id, blankTeamStats()));

  (scoreboard.events || []).forEach((event) => {
    const competition = event.competitions?.[0];
    const competitors = competition?.competitors || [];
    if (competitors.length < 2) return;

    const parsed = competitors.map((competitor) => parseCompetitor(competitor, knownTeamIds));
    const known = parsed.filter((team) => team.id && knownTeamIds.has(team.id));
    if (!known.length) return;

    const status = competition.status || event.status || {};
    const statusType = status.type || {};
    const completed = Boolean(statusType.completed);
    const inProgress = statusType.state === "in";
    const stage = stageFromEvent(event);
    const match = toMatch(event, competition, parsed, stage, completed, inProgress, statusType);
    next.matches.push(match);
    if (completed) next.completedCount += 1;
    if (inProgress) next.inProgressCount += 1;

    if (known.length !== 2) return;
    const [first, second] = known;
    applyGoals(next.teamStats.get(first.id), first.score, completed || inProgress);
    applyGoals(next.teamStats.get(second.id), second.score, completed || inProgress);

    if (stage !== "Group stage" && stage !== "Third place") {
      upgradeStage(next.teamStats.get(first.id), stage);
      upgradeStage(next.teamStats.get(second.id), stage);
    }

    if (!completed) return;

    if (second.score === 0) next.teamStats.get(first.id).cleanSheets += 1;
    if (first.score === 0) next.teamStats.get(second.id).cleanSheets += 1;

    if (stage === "Group stage") {
      applyGroupResult(next.teamStats.get(first.id), next.teamStats.get(second.id), first.score, second.score);
    } else if (stage !== "Third place") {
      const winner = first.winner ? first : second.winner ? second : first.score > second.score ? first : second;
      upgradeStage(next.teamStats.get(winner.id), NEXT_STAGE[stage] || stage);
      if (stage === "Final") {
        const loser = winner.id === first.id ? second : first;
        upgradeStage(next.teamStats.get(loser.id), "Final");
      }
    }
  });

  next.matches.sort((a, b) => new Date(a.date) - new Date(b.date));
  next.loadedAt = new Date().toISOString();
  return next;
}

function toMatch(event, competition, parsed, stage, completed, inProgress, statusType) {
  const home = parsed.find((team) => team.homeAway === "home") || parsed[0];
  const away = parsed.find((team) => team.homeAway === "away") || parsed[1];
  return {
    id: event.id,
    date: event.date,
    shortName: event.shortName || `${home.name} vs ${away.name}`,
    stage,
    completed,
    inProgress,
    statusDetail: statusType.shortDetail || statusType.detail || statusType.description || "Scheduled",
    homeName: home.name,
    awayName: away.name,
    venue: competition.venue?.fullName || competition.venue?.displayName || event.venue?.displayName || "",
    scoreLine: completed || inProgress ? `${home.score} - ${away.score}` : "Scheduled"
  };
}

function parseCompetitor(competitor, knownTeamIds) {
  const team = competitor.team || {};
  const id = identifyTeam(team, knownTeamIds);
  return {
    id,
    name: id ? state.teams.find((item) => item.id === id)?.name || team.displayName : team.displayName || team.shortDisplayName || "TBD",
    score: Number(competitor.score || 0),
    winner: Boolean(competitor.winner),
    homeAway: competitor.homeAway
  };
}

function identifyTeam(team, knownTeamIds) {
  const abbr = String(team.abbreviation || "").toLowerCase();
  if (knownTeamIds.has(abbr)) return abbr;

  const candidates = [team.displayName, team.shortDisplayName, team.name, team.location]
    .filter(Boolean)
    .map(normalizeName);

  for (const candidate of candidates) {
    if (TEAM_ALIASES.has(candidate)) return TEAM_ALIASES.get(candidate);
    const exact = state.teams.find((item) => normalizeName(item.name) === candidate);
    if (exact) return exact.id;
  }

  return "";
}

function stageFromEvent(event) {
  const slug = String(event.season?.slug || "").toLowerCase();
  if (slug.includes("group")) return "Group stage";
  if (slug.includes("32")) return "Round of 32";
  if (slug.includes("16")) return "Round of 16";
  if (slug.includes("quarter")) return "Quarterfinals";
  if (slug.includes("semi")) return "Semifinals";
  if (slug.includes("3rd")) return "Third place";
  if (slug.includes("final")) return "Final";
  return "Group stage";
}

function applyGoals(stats, goals, shouldCount) {
  if (stats && shouldCount) stats.goalsFor += Number(goals || 0);
}

function applyGroupResult(firstStats, secondStats, firstScore, secondScore) {
  if (firstScore > secondScore) {
    firstStats.groupWins += 1;
    secondStats.groupLosses += 1;
  } else if (secondScore > firstScore) {
    secondStats.groupWins += 1;
    firstStats.groupLosses += 1;
  } else {
    firstStats.groupDraws += 1;
    secondStats.groupDraws += 1;
  }
}

function upgradeStage(stats, stage) {
  if (!stats || !STAGES.includes(stage)) return;
  if (stageValue(stage) > stageValue(stats.stage)) stats.stage = stage;
}

function computedTeam(team) {
  const stats = live.teamStats.get(team.id) || blankTeamStats();
  return {
    ...stats,
    awards: Number(team.awards || 0)
  };
}

function filteredTeams(filters) {
  return state.teams.filter((team) => {
    if (filters.pot !== "all" && String(team.pot) !== filters.pot) return false;
    if (filters.group !== "all" && team.group !== filters.group) return false;
    if (filters.owner === "none" && team.ownerId) return false;
    if (filters.owner !== "all" && filters.owner !== "none" && team.ownerId !== filters.owner) return false;
    return true;
  });
}

function getStandings() {
  return state.players
    .map((player) => {
      const teams = state.teams.filter((team) => team.ownerId === player.id);
      const score = teams.reduce((sum, team) => sum + teamScore(team), 0);
      return { player, teams, score };
    })
    .sort((a, b) => b.score - a.score || b.teams.length - a.teams.length || a.player.name.localeCompare(b.player.name));
}

function teamScore(team) {
  const scoring = state.scoring;
  const stats = computedTeam(team);
  return (
    Number(stats.groupWins || 0) * scoring.groupWin +
    Number(stats.groupDraws || 0) * scoring.groupDraw +
    Number(stats.goalsFor || 0) * scoring.goal +
    Number(stats.cleanSheets || 0) * scoring.cleanSheet +
    Number(stats.awards || 0) * scoring.award +
    Number(scoring.stage[stats.stage] || 0)
  );
}

function sortTeamsByScore(a, b) {
  return teamScore(b) - teamScore(a) || a.pot - b.pot || a.name.localeCompare(b.name);
}

function stageValue(stage) {
  return STAGES.indexOf(stage);
}

function ownerName(ownerId) {
  if (!ownerId) return "Unassigned";
  return state.players.find((player) => player.id === ownerId)?.name || "Unassigned";
}

function normalizeState(input) {
  const base = createEmptyState();
  const next = {
    ...base,
    ...input,
    meta: { ...base.meta, ...(input.meta || {}) },
    scoring: {
      ...base.scoring,
      ...(input.scoring || {}),
      stage: { ...base.scoring.stage, ...((input.scoring && input.scoring.stage) || {}) }
    },
    players: Array.isArray(input.players) && input.players.length === 6 ? input.players : base.players,
    teams: Array.isArray(input.teams) && input.teams.length ? input.teams : base.teams
  };

  next.teams = next.teams.map((team) => ({
    id: team.id,
    name: team.name,
    pot: Number(team.pot),
    group: team.group,
    ownerId: team.ownerId || "",
    awards: Number(team.awards || 0),
    groupWins: Number(team.groupWins || 0),
    groupDraws: Number(team.groupDraws || 0),
    groupLosses: Number(team.groupLosses || 0),
    goalsFor: Number(team.goalsFor || 0),
    cleanSheets: Number(team.cleanSheets || 0),
    stage: STAGES.includes(team.stage) ? team.stage : "Group stage"
  }));

  return next;
}

function createEmptyState() {
  return {
    meta: {
      title: "World Cup Challenge",
      updatedAt: new Date().toISOString(),
      pollSeconds: 20,
      livePollSeconds: 30
    },
    players: [1, 2, 3, 4, 5, 6].map((number) => ({
      id: `player-${number}`,
      name: `Player ${number}`,
      color: "#1f6f55"
    })),
    scoring: {
      groupWin: 3,
      groupDraw: 1,
      goal: 1,
      cleanSheet: 1,
      award: 10,
      stage: {
        "Group stage": 0,
        "Round of 32": 3,
        "Round of 16": 5,
        Quarterfinals: 8,
        Semifinals: 12,
        Final: 18,
        Champion: 25
      }
    },
    teams: []
  };
}

function createLiveState() {
  return {
    loadedAt: "",
    error: null,
    completedCount: 0,
    inProgressCount: 0,
    matches: [],
    teamStats: new Map()
  };
}

function blankTeamStats() {
  return {
    groupWins: 0,
    groupDraws: 0,
    groupLosses: 0,
    goalsFor: 0,
    cleanSheets: 0,
    stage: "Group stage"
  };
}

function markDirty() {
  localDirty = true;
  stampUpdate();
  setSync("Setup draft", "Publish the setup file once assignments are ready.");
}

function stampUpdate() {
  state.meta.updatedAt = new Date().toISOString();
}

function setSync(status, detail) {
  els.syncState.textContent = status;
  els.syncDetail.textContent = detail;
}

function withCacheBust(url) {
  const next = new URL(url);
  next.searchParams.set("_", Date.now().toString());
  return next;
}

function shuffle(items) {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }
  return copy;
}

function stableStringify(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function formatDateTime(value) {
  if (!value) return "unknown";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "unknown";
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(date);
}

function formatMatchDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "TBD";
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(date);
}

function normalizeName(value) {
  return String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttribute(value) {
  return escapeHtml(value);
}
