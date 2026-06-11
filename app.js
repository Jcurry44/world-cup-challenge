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

const TEAM_INFO = {
  mex: { confederation: "CONCACAF", rankNov: 15, rankJune: 14, qualification: "Co-host", qualified: "February 14, 2023", appearance: "18th", last: "2022", best: "Quarter-finals (1970, 1986)" },
  rsa: { confederation: "CAF", rankNov: 61, rankJune: 60, qualification: "CAF Group C winner", qualified: "October 14, 2025", appearance: "4th", last: "2010", best: "Group stage" },
  kor: { confederation: "AFC", rankNov: 22, rankJune: 25, qualification: "AFC third round Group B winner", qualified: "June 5, 2025", appearance: "12th", last: "2022", best: "Fourth place (2002)" },
  cze: { confederation: "UEFA", rankNov: 44, rankJune: 40, qualification: "UEFA second round Path D winner", qualified: "March 31, 2026", appearance: "10th", last: "2006", best: "Runner-up (1934, 1962)" },
  can: { confederation: "CONCACAF", rankNov: 27, rankJune: 30, qualification: "Co-host", qualified: "February 14, 2023", appearance: "3rd", last: "2022", best: "Group stage" },
  bih: { confederation: "UEFA", rankNov: 71, rankJune: 64, qualification: "UEFA second round Path A winner", qualified: "March 31, 2026", appearance: "2nd", last: "2014", best: "Group stage" },
  qat: { confederation: "AFC", rankNov: 51, rankJune: 56, qualification: "AFC fourth round Group A winner", qualified: "October 14, 2025", appearance: "2nd", last: "2022", best: "Group stage" },
  sui: { confederation: "UEFA", rankNov: 17, rankJune: 19, qualification: "UEFA Group B winner", qualified: "November 18, 2025", appearance: "13th", last: "2022", best: "Quarterfinals (1934, 1938, 1954)" },
  bra: { confederation: "CONMEBOL", rankNov: 5, rankJune: 6, qualification: "CONMEBOL round robin fifth place", qualified: "June 10, 2025", appearance: "23rd", last: "2022", best: "Winner (1958, 1962, 1970, 1994, 2002)" },
  mar: { confederation: "CAF", rankNov: 11, rankJune: 7, qualification: "CAF Group E winner", qualified: "September 5, 2025", appearance: "7th", last: "2022", best: "Fourth place (2022)" },
  hai: { confederation: "CONCACAF", rankNov: 84, rankJune: 83, qualification: "CONCACAF Group C winner", qualified: "November 18, 2025", appearance: "2nd", last: "1974", best: "Group stage" },
  sco: { confederation: "UEFA", rankNov: 36, rankJune: 42, qualification: "UEFA Group C winner", qualified: "November 18, 2025", appearance: "9th", last: "1998", best: "Group stage" },
  usa: { confederation: "CONCACAF", rankNov: 14, rankJune: 17, qualification: "Co-host", qualified: "February 14, 2023", appearance: "12th", last: "2022", best: "Third place (1930)" },
  par: { confederation: "CONMEBOL", rankNov: 39, rankJune: 41, qualification: "CONMEBOL round robin sixth place", qualified: "September 4, 2025", appearance: "9th", last: "2010", best: "Quarterfinals (2010)" },
  aus: { confederation: "AFC", rankNov: 26, rankJune: 27, qualification: "AFC third round Group C runner-up", qualified: "June 10, 2025", appearance: "7th", last: "2022", best: "Round of 16 (2006, 2022)" },
  tur: { confederation: "UEFA", rankNov: 25, rankJune: 22, qualification: "UEFA second round Path C winner", qualified: "March 31, 2026", appearance: "3rd", last: "2002", best: "Third place (2002)" },
  ger: { confederation: "UEFA", rankNov: 9, rankJune: 10, qualification: "UEFA Group A winner", qualified: "November 17, 2025", appearance: "21st", last: "2022", best: "Winner (1954, 1974, 1990, 2014)" },
  cuw: { confederation: "CONCACAF", rankNov: 82, rankJune: 82, qualification: "CONCACAF Group B winner", qualified: "November 18, 2025", appearance: "1st", last: "Debut", best: "Debut" },
  civ: { confederation: "CAF", rankNov: 42, rankJune: 33, qualification: "CAF Group F winner", qualified: "October 14, 2025", appearance: "4th", last: "2014", best: "Group stage" },
  ecu: { confederation: "CONMEBOL", rankNov: 23, rankJune: 23, qualification: "CONMEBOL round robin runner-up", qualified: "June 10, 2025", appearance: "5th", last: "2022", best: "Round of 16 (2006)" },
  ned: { confederation: "UEFA", rankNov: 7, rankJune: 8, qualification: "UEFA Group G winner", qualified: "November 17, 2025", appearance: "12th", last: "2022", best: "Runner-up (1974, 1978, 2010)" },
  jpn: { confederation: "AFC", rankNov: 18, rankJune: 18, qualification: "AFC third round Group C winner", qualified: "March 20, 2025", appearance: "8th", last: "2022", best: "Round of 16" },
  swe: { confederation: "UEFA", rankNov: 43, rankJune: 38, qualification: "UEFA second round Path B winner", qualified: "March 31, 2026", appearance: "13th", last: "2018", best: "Runner-up (1958)" },
  tun: { confederation: "CAF", rankNov: 40, rankJune: 45, qualification: "CAF Group H winner", qualified: "September 8, 2025", appearance: "7th", last: "2022", best: "Group stage" },
  bel: { confederation: "UEFA", rankNov: 8, rankJune: 9, qualification: "UEFA Group J winner", qualified: "November 18, 2025", appearance: "15th", last: "2022", best: "Third place (2018)" },
  egy: { confederation: "CAF", rankNov: 34, rankJune: 29, qualification: "CAF Group A winner", qualified: "October 8, 2025", appearance: "4th", last: "2018", best: "First round / group stage" },
  irn: { confederation: "AFC", rankNov: 20, rankJune: 20, qualification: "AFC third round Group A winner", qualified: "March 25, 2025", appearance: "7th", last: "2022", best: "Group stage" },
  nzl: { confederation: "OFC", rankNov: 86, rankJune: 85, qualification: "OFC third round winner", qualified: "March 24, 2025", appearance: "3rd", last: "2010", best: "Group stage" },
  esp: { confederation: "UEFA", rankNov: 1, rankJune: 2, qualification: "UEFA Group E winner", qualified: "November 18, 2025", appearance: "17th", last: "2022", best: "Winner (2010)" },
  cpv: { confederation: "CAF", rankNov: 68, rankJune: 67, qualification: "CAF Group D winner", qualified: "October 13, 2025", appearance: "1st", last: "Debut", best: "Debut" },
  ksa: { confederation: "AFC", rankNov: 60, rankJune: 61, qualification: "AFC fourth round Group B winner", qualified: "October 14, 2025", appearance: "7th", last: "2022", best: "Round of 16 (1994)" },
  uru: { confederation: "CONMEBOL", rankNov: 16, rankJune: 16, qualification: "CONMEBOL round robin fourth place", qualified: "September 4, 2025", appearance: "15th", last: "2022", best: "Winner (1930, 1950)" },
  fra: { confederation: "UEFA", rankNov: 3, rankJune: 3, qualification: "UEFA Group D winner", qualified: "November 13, 2025", appearance: "17th", last: "2022", best: "Winner (1998, 2018)" },
  sen: { confederation: "CAF", rankNov: 19, rankJune: 15, qualification: "CAF Group B winner", qualified: "October 14, 2025", appearance: "4th", last: "2022", best: "Quarterfinals (2002)" },
  irq: { confederation: "AFC", rankNov: 58, rankJune: 57, qualification: "Inter-confederation playoff Path 2 winner", qualified: "March 31, 2026", appearance: "2nd", last: "1986", best: "Group stage" },
  nor: { confederation: "UEFA", rankNov: 29, rankJune: 31, qualification: "UEFA Group I winner", qualified: "November 16, 2025", appearance: "4th", last: "1998", best: "Round of 16 (1998)" },
  arg: { confederation: "CONMEBOL", rankNov: 2, rankJune: 1, qualification: "CONMEBOL round robin winner", qualified: "March 25, 2025", appearance: "19th", last: "2022", best: "Winner (1978, 1986, 2022)" },
  alg: { confederation: "CAF", rankNov: 35, rankJune: 28, qualification: "CAF Group G winner", qualified: "October 9, 2025", appearance: "5th", last: "2014", best: "Round of 16 (2014)" },
  aut: { confederation: "UEFA", rankNov: 24, rankJune: 24, qualification: "UEFA Group H winner", qualified: "November 18, 2025", appearance: "8th", last: "1998", best: "Third place (1954)" },
  jor: { confederation: "AFC", rankNov: 66, rankJune: 63, qualification: "AFC third round Group B runner-up", qualified: "June 5, 2025", appearance: "1st", last: "Debut", best: "Debut" },
  por: { confederation: "UEFA", rankNov: 6, rankJune: 5, qualification: "UEFA Group F winner", qualified: "November 16, 2025", appearance: "9th", last: "2022", best: "Third place (1966)" },
  cod: { confederation: "CAF", rankNov: 56, rankJune: 46, qualification: "Inter-confederation playoff Path 1 winner", qualified: "March 31, 2026", appearance: "2nd", last: "1974", best: "Group stage" },
  uzb: { confederation: "AFC", rankNov: 50, rankJune: 50, qualification: "AFC third round Group A runner-up", qualified: "June 5, 2025", appearance: "1st", last: "Debut", best: "Debut" },
  col: { confederation: "CONMEBOL", rankNov: 13, rankJune: 13, qualification: "CONMEBOL round robin third place", qualified: "September 4, 2025", appearance: "7th", last: "2018", best: "Quarterfinals (2014)" },
  eng: { confederation: "UEFA", rankNov: 4, rankJune: 4, qualification: "UEFA Group K winner", qualified: "October 14, 2025", appearance: "17th", last: "2022", best: "Winner (1966)" },
  cro: { confederation: "UEFA", rankNov: 10, rankJune: 11, qualification: "UEFA Group L winner", qualified: "November 14, 2025", appearance: "7th", last: "2022", best: "Runner-up (2018)" },
  gha: { confederation: "CAF", rankNov: 72, rankJune: 73, qualification: "CAF Group I winner", qualified: "October 12, 2025", appearance: "5th", last: "2022", best: "Quarterfinals (2010)" },
  pan: { confederation: "CONCACAF", rankNov: 30, rankJune: 34, qualification: "CONCACAF Group A winner", qualified: "November 18, 2025", appearance: "2nd", last: "2018", best: "Group stage" }
};

let state = null;
let isAdmin = ADMIN_PARAM === "1";
let localDirty = false;
let activeView = isAdmin ? "admin" : "scoreboard";
let teamFilters = { pot: "all", owner: "all", group: "all" };
let matchFilters = { stage: "all", team: "all", status: "all" };
let adminFilters = { pot: "all", owner: "all", group: "all" };
let setupPollTimer = null;
let livePollTimer = null;
let live = createLiveState();
let selectedTeamId = QUERY.get("team") || "";
let scorecardOpen = false;
let githubPushTimer = null;
let githubSync = loadGithubSyncSettings();

const els = {
  syncState: document.getElementById("sync-state"),
  syncDetail: document.getElementById("sync-detail"),
  footerUpdated: document.getElementById("footer-updated"),
  draftNotice: document.getElementById("draft-notice"),
  leaderboard: document.getElementById("leaderboard"),
  scoreSummary: document.getElementById("score-summary"),
  teamFilters: document.getElementById("team-filters"),
  teamTableBody: document.getElementById("team-table-body"),
  matchFilters: document.getElementById("match-filters"),
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
  loadPublishedButton: document.getElementById("load-published-button"),
  githubOwner: document.getElementById("github-owner"),
  githubRepo: document.getElementById("github-repo"),
  githubBranch: document.getElementById("github-branch"),
  githubToken: document.getElementById("github-token"),
  githubRemember: document.getElementById("github-remember"),
  githubAutoPush: document.getElementById("github-auto-push"),
  githubPushButton: document.getElementById("github-push-button"),
  githubSyncStatus: document.getElementById("github-sync-status"),
  teamScorecard: document.getElementById("team-scorecard"),
  scorecardBody: document.getElementById("scorecard-body"),
  scorecardClose: document.getElementById("scorecard-close")
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
  els.githubPushButton.addEventListener("click", () => pushSetupToGithub({ manual: true }));
  els.scorecardClose.addEventListener("click", closeTeamScorecard);
  els.teamScorecard.addEventListener("click", (event) => {
    if (event.target === els.teamScorecard) closeTeamScorecard();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && scorecardOpen) closeTeamScorecard();
  });

  [els.githubOwner, els.githubRepo, els.githubBranch, els.githubToken].forEach((input) => {
    input.addEventListener("change", updateGithubSettingsFromForm);
  });
  [els.githubRemember, els.githubAutoPush].forEach((input) => {
    input.addEventListener("change", updateGithubSettingsFromForm);
  });

  document.body.addEventListener("click", (event) => {
    const trigger = event.target.closest("[data-team-id]");
    if (!trigger) return;
    const teamId = trigger.dataset.teamId;
    if (!teamId) return;
    openTeamScorecard(teamId);
  });
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
  renderMatchFilters();
  renderMatchTable();
  renderRules();
  renderAdmin();
  renderTeamScorecard();

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
            .map(
              (team) => `
                <button class="team-chip team-chip--button" type="button" data-pot="${team.pot}" data-team-id="${team.id}">
                  <span>${escapeHtml(team.name)}</span>
                  <strong>${teamScore(team)}</strong>
                  <small>${escapeHtml(scoreShortLabel(team))}</small>
                </button>
              `
            )
            .join("");
          return `
            <div class="pot-row">
              <span class="pot-label">P${pot}</span>
              <div class="team-chip-wrap">${chips || `<span class="team-chip" data-pot="${pot}">Unassigned</span>`}</div>
            </div>
          `;
        })
        .join("");

      return `
        <article class="player-card" data-rank="${index + 1}">
          <div class="player-card__top">
            <span class="rank-badge">${index + 1}</span>
            <div>
              <h3>${escapeHtml(entry.player.name)}</h3>
              <p>${entry.teams.length} teams assigned</p>
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
      label: "Top team",
      value: topTeam ? topTeam.name : "None",
      note: topTeam ? `${teamScore(topTeam)} points, owned by ${ownerName(topTeam.ownerId)}` : "No scores yet"
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

function renderMatchFilters() {
  const stages = [...new Set(live.matches.map((match) => match.stage))].filter(Boolean);
  const teamOptions = state.teams
    .map((team) => `<option value="${team.id}" ${matchFilters.team === team.id ? "selected" : ""}>${escapeHtml(team.name)}</option>`)
    .join("");

  els.matchFilters.innerHTML = `
    <select aria-label="Filter matches by stage" data-match-filter="stage">
      <option value="all">All stages</option>
      ${stages.map((stage) => `<option value="${stage}" ${matchFilters.stage === stage ? "selected" : ""}>${escapeHtml(stage)}</option>`).join("")}
    </select>
    <select aria-label="Filter matches by team" data-match-filter="team">
      <option value="all">All teams</option>
      ${teamOptions}
    </select>
    <select aria-label="Filter matches by status" data-match-filter="status">
      <option value="all">All statuses</option>
      <option value="live" ${matchFilters.status === "live" ? "selected" : ""}>Live</option>
      <option value="final" ${matchFilters.status === "final" ? "selected" : ""}>Final</option>
      <option value="scheduled" ${matchFilters.status === "scheduled" ? "selected" : ""}>Scheduled</option>
    </select>
  `;

  els.matchFilters.querySelectorAll("select").forEach((select) => {
    select.addEventListener("change", () => {
      matchFilters[select.dataset.matchFilter] = select.value;
      render();
    });
  });
}

function openTeamScorecard(teamId) {
  selectedTeamId = teamId;
  scorecardOpen = true;
  renderTeamScorecard();
}

function closeTeamScorecard() {
  scorecardOpen = false;
  els.teamScorecard.classList.add("is-hidden");
  els.scorecardBody.innerHTML = "";
}

function renderTeamScorecard() {
  if (!scorecardOpen) {
    els.teamScorecard.classList.add("is-hidden");
    return;
  }

  const team = state.teams.find((item) => item.id === selectedTeamId);
  if (!team) {
    closeTeamScorecard();
    return;
  }

  const info = TEAM_INFO[team.id] || {};
  const stats = computedTeam(team);
  const schedule = teamSchedule(team.id);
  els.teamScorecard.classList.remove("is-hidden");
  els.scorecardBody.innerHTML = `
    <div class="scorecard-layout">
      <div class="scorecard-title-row">
        <div>
          <p class="eyebrow">Group ${escapeHtml(team.group)} / Pot ${team.pot}</p>
          <h3 id="scorecard-title">${escapeHtml(team.name)}</h3>
          <p class="scorecard-sub">${escapeHtml(ownerName(team.ownerId))} owns this team.</p>
        </div>
        <div class="score-badge">
          <strong>${teamScore(team)}</strong>
          <span>points</span>
        </div>
      </div>
      <p class="team-note">${escapeHtml(teamHook(team, info))}</p>
      <div class="detail-grid">
        ${detailStat("Live points", teamScore(team))}
        ${detailStat("Record", `${stats.groupWins}-${stats.groupDraws}-${stats.groupLosses}`)}
        ${detailStat("Goals", stats.goalsFor)}
        ${detailStat("Stage", stats.stage)}
        ${detailStat("June ranking", rankText(info.rankJune))}
        ${detailStat("Draw ranking", rankText(info.rankNov))}
        ${detailStat("Qualified", info.qualification || "Unknown")}
        ${detailStat("Best finish", info.best || "Unknown")}
        ${detailStat("Appearance", info.appearance || "Unknown")}
        ${detailStat("Last World Cup", info.last || "Unknown")}
        ${detailStat("Confederation", info.confederation || "Unknown")}
        ${detailStat("Qualified date", info.qualified || "Unknown")}
      </div>
      <div class="scorecard-section">
        <h4>Score breakdown</h4>
        ${renderScoreBreakdown(team)}
      </div>
      <div class="scorecard-section">
        <h4>${escapeHtml(team.name)} schedule</h4>
        <div class="schedule-list">
          ${schedule.length ? schedule.map((match) => renderTeamMatchCard(team.id, match)).join("") : "<p>No known scheduled matches loaded yet.</p>"}
        </div>
      </div>
    </div>
  `;
}

function detailStat(label, value) {
  return `
    <div class="detail-stat">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(String(value))}</strong>
    </div>
  `;
}

function renderScoreBreakdown(team) {
  const rows = scoreBreakdown(team);
  return `
    <div class="score-breakdown">
      ${rows
        .map(
          (row) => `
            <div class="score-breakdown__row">
              <span>${escapeHtml(row.label)}</span>
              <small>${escapeHtml(row.formula)}</small>
              <strong>${row.points}</strong>
            </div>
          `
        )
        .join("")}
      <div class="score-breakdown__row score-breakdown__row--total">
        <span>Total</span>
        <small>${escapeHtml(team.name)}</small>
        <strong>${teamScore(team)}</strong>
      </div>
    </div>
  `;
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
              <button class="team-link" type="button" data-team-id="${team.id}">${escapeHtml(team.name)}</button>
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
  const rows = filteredMatches()
    .map(
      (match) => `
        <tr>
          <td>${escapeHtml(formatMatchDate(match.date))}</td>
          <td>${escapeHtml(match.stage)}</td>
          <td>
            <div class="team-name">
              <strong>${renderMatchTeam(match.homeId, match.homeName)} vs ${renderMatchTeam(match.awayId, match.awayName)}</strong>
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

function renderMatchTeam(teamId, name) {
  return teamId
    ? `<button class="team-link" type="button" data-team-id="${teamId}">${escapeHtml(name)}</button>`
    : escapeHtml(name);
}

function renderTeamMatchCard(teamId, match) {
  const opponentName = match.homeId === teamId ? match.awayName : match.homeName;
  const opponentId = match.homeId === teamId ? match.awayId : match.homeId;
  const side = match.homeId === teamId ? "vs" : "at";
  return `
    <article class="match-card">
      <span class="match-card__date">${escapeHtml(formatMatchDate(match.date))}</span>
      <span class="match-card__main">
        <strong>${escapeHtml(side)} ${renderMatchTeam(opponentId, opponentName)}</strong>
        <span>${escapeHtml(match.stage)} / ${escapeHtml(match.venue || "Venue TBD")}</span>
      </span>
      <span class="match-card__status">${escapeHtml(match.scoreLine)} / ${escapeHtml(match.statusDetail)}</span>
    </article>
  `;
}

function filteredMatches() {
  return live.matches.filter((match) => {
    if (matchFilters.stage !== "all" && match.stage !== matchFilters.stage) return false;
    if (matchFilters.team !== "all" && match.homeId !== matchFilters.team && match.awayId !== matchFilters.team) return false;
    if (matchFilters.status === "live" && !match.inProgress) return false;
    if (matchFilters.status === "final" && !match.completed) return false;
    if (matchFilters.status === "scheduled" && (match.completed || match.inProgress)) return false;
    return true;
  });
}

function teamSchedule(teamId) {
  return live.matches.filter((match) => match.homeId === teamId || match.awayId === teamId);
}

function rankText(value) {
  return value ? `No. ${value}` : "Unknown";
}

function teamHook(team, info) {
  if (info.qualification === "Co-host") return "Home pressure, home crowds, and a free ticket into the tournament.";
  if (String(info.best || "").includes("Winner")) return "Former World Cup champion. Expectations are baked in.";
  if (info.appearance === "1st" || info.best === "Debut") return "Tournament debut team, which makes every point feel loud.";
  if (String(info.best || "").includes("Runner-up")) return "They have been close enough to know how much the final step hurts.";
  if (String(info.best || "").includes("Third place") || String(info.best || "").includes("Fourth place")) return "A real history of deep-tournament troublemaking.";
  if (team.pot === 4) return "Classic sleeper profile. Anything beyond the group stage can swing the pool.";
  if (team.pot === 1) return "Top-pot team with pressure to carry a roster.";
  return "Solid tournament profile with enough upside to matter in the standings.";
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
  renderGithubSync();
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

function renderGithubSync() {
  els.githubOwner.value = githubSync.owner;
  els.githubRepo.value = githubSync.repo;
  els.githubBranch.value = githubSync.branch;
  els.githubToken.value = githubSync.token;
  els.githubRemember.checked = githubSync.remember;
  els.githubAutoPush.checked = githubSync.autoPush;
  els.githubSyncStatus.textContent = githubSync.status || (githubSync.token ? "Ready" : "Not connected");
}

function updateGithubSettingsFromForm() {
  githubSync = {
    owner: els.githubOwner.value.trim() || "Jcurry44",
    repo: els.githubRepo.value.trim() || "world-cup-challenge",
    branch: els.githubBranch.value.trim() || "main",
    token: els.githubToken.value.trim(),
    remember: els.githubRemember.checked,
    autoPush: els.githubAutoPush.checked,
    status: githubSync.status
  };
  saveGithubSyncSettings();
  renderGithubSync();
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
              <button class="team-link" type="button" data-team-id="${team.id}">${escapeHtml(team.name)}</button>
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

async function pushSetupToGithub({ manual = false } = {}) {
  updateGithubSettingsFromForm();
  if (!githubSync.token || !githubSync.owner || !githubSync.repo || !githubSync.branch) {
    githubSync.status = "Add repo details and token first";
    renderGithubSync();
    return;
  }

  els.githubPushButton.disabled = true;
  githubSync.status = "Pushing setup...";
  renderGithubSync();

  const path = "data/challenge-state.json";
  const apiBase = `https://api.github.com/repos/${encodeURIComponent(githubSync.owner)}/${encodeURIComponent(githubSync.repo)}/contents/${path}`;
  const headers = {
    Accept: "application/vnd.github+json",
    Authorization: `Bearer ${githubSync.token}`,
    "X-GitHub-Api-Version": "2022-11-28"
  };

  try {
    stampUpdate();
    const currentResponse = await fetch(`${apiBase}?ref=${encodeURIComponent(githubSync.branch)}`, { headers });
    if (!currentResponse.ok) {
      throw new Error(`Could not read current GitHub file (${currentResponse.status})`);
    }
    const currentFile = await currentResponse.json();
    const body = {
      message: `Update World Cup Challenge setup`,
      content: base64Encode(stableStringify(state)),
      sha: currentFile.sha,
      branch: githubSync.branch
    };

    const updateResponse = await fetch(apiBase, {
      method: "PUT",
      headers: {
        ...headers,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    });

    if (!updateResponse.ok) {
      const errorText = await updateResponse.text();
      throw new Error(`GitHub push failed (${updateResponse.status}): ${errorText.slice(0, 160)}`);
    }

    localDirty = false;
    githubSync.status = `Pushed ${formatDateTime(new Date().toISOString())}`;
    saveGithubSyncSettings();
    setSync("Published", "Setup pushed to GitHub.");
    render();
  } catch (error) {
    githubSync.status = manual ? error.message : "Auto-push failed";
    renderGithubSync();
  } finally {
    els.githubPushButton.disabled = false;
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
    homeId: home.id,
    awayId: away.id,
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
  return scoreBreakdown(team).reduce((sum, row) => sum + row.points, 0);
}

function scoreBreakdown(team) {
  const scoring = state.scoring;
  const stats = computedTeam(team);
  const stagePoints = Number(scoring.stage[stats.stage] || 0);
  return [
    {
      label: "Group wins",
      formula: `${Number(stats.groupWins || 0)} x ${scoring.groupWin}`,
      points: Number(stats.groupWins || 0) * scoring.groupWin
    },
    {
      label: "Group draws",
      formula: `${Number(stats.groupDraws || 0)} x ${scoring.groupDraw}`,
      points: Number(stats.groupDraws || 0) * scoring.groupDraw
    },
    {
      label: "Goals",
      formula: `${Number(stats.goalsFor || 0)} x ${scoring.goal}`,
      points: Number(stats.goalsFor || 0) * scoring.goal
    },
    {
      label: "Clean sheets",
      formula: `${Number(stats.cleanSheets || 0)} x ${scoring.cleanSheet}`,
      points: Number(stats.cleanSheets || 0) * scoring.cleanSheet
    },
    {
      label: "Stage bonus",
      formula: `${stats.stage}`,
      points: stagePoints
    },
    {
      label: "Awards",
      formula: `${Number(stats.awards || 0)} x ${scoring.award}`,
      points: Number(stats.awards || 0) * scoring.award
    }
  ];
}

function scoreShortLabel(team) {
  const stats = computedTeam(team);
  const parts = [`${stats.groupWins}-${stats.groupDraws}-${stats.groupLosses}`];
  if (stats.goalsFor) parts.push(`${stats.goalsFor}G`);
  if (stats.cleanSheets) parts.push(`${stats.cleanSheets}CS`);
  if (Number(state.scoring.stage[stats.stage] || 0)) parts.push(stats.stage.replace("Round of ", "R"));
  if (stats.awards) parts.push(`${stats.awards}A`);
  return parts.join(" / ");
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
  scheduleGithubAutoPush();
}

function scheduleGithubAutoPush() {
  window.clearTimeout(githubPushTimer);
  if (!githubSync.autoPush || !githubSync.token) return;
  githubPushTimer = window.setTimeout(() => pushSetupToGithub(), 2500);
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

function base64Encode(value) {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  const chunkSize = 0x8000;
  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.slice(index, index + chunkSize));
  }
  return btoa(binary);
}

function loadGithubSyncSettings() {
  try {
    const saved = JSON.parse(localStorage.getItem("worldCupGithubSync") || "{}");
    return {
      owner: saved.owner || "Jcurry44",
      repo: saved.repo || "world-cup-challenge",
      branch: saved.branch || "main",
      token: saved.remember ? saved.token || "" : "",
      remember: Boolean(saved.remember),
      autoPush: Boolean(saved.autoPush),
      status: ""
    };
  } catch (error) {
    return {
      owner: "Jcurry44",
      repo: "world-cup-challenge",
      branch: "main",
      token: "",
      remember: false,
      autoPush: false,
      status: ""
    };
  }
}

function saveGithubSyncSettings() {
  const safeSettings = {
    owner: githubSync.owner,
    repo: githubSync.repo,
    branch: githubSync.branch,
    remember: githubSync.remember,
    autoPush: githubSync.autoPush,
    token: githubSync.remember ? githubSync.token : ""
  };
  localStorage.setItem("worldCupGithubSync", JSON.stringify(safeSettings));
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
