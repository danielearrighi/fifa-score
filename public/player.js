
function isMatchFinished(game) {
  const status = game.fixture.status.short;
  return status === "FT" || status === "AET" || status === "PEN";
}

function getMatchOutcome(game) {
  const homeGoals = game.goals.home;
  const awayGoals = game.goals.away;
  if (homeGoals === null || awayGoals === null) return null;
  if (homeGoals > awayGoals) return "1";
  if (homeGoals === awayGoals) return "X";
  return "2";
}

let currentPlayerName = null;

document.addEventListener('DOMContentLoaded', () => {
  const urlParams = new URLSearchParams(window.location.search);
  currentPlayerName = urlParams.get('player');
  
  if (!currentPlayerName) {
    showError('Nessun giocatore specificato.');
    return;
  }
  
  loadPlayerData(currentPlayerName);
});

async function loadPlayerData(playerName) {
  const tbody = document.getElementById('player-predictions-body');
  const playerTitle = document.getElementById('player-title');
  const playerSubtitle = document.getElementById('player-subtitle');
  
  try {
    // 1. Fetch all players to find score, ranking position, and predictions
    const playersRes = await fetch('/api/players');
    if (!playersRes.ok) throw new Error('Impossibile caricare i dati dei giocatori.');
    const players = await playersRes.json();
    
    // Find index (rank) and player object
    const playerIndex = players.findIndex(p => p.Player.toLowerCase() === playerName.toLowerCase());
    if (playerIndex === -1) {
      throw new Error(`Giocatore "${playerName}" non trovato.`);
    }
    
    const player = players[playerIndex];
    
    // Calculate standard competition ranking (ties get the same rank)
    let rank = 1;
    for (let i = 0; i < playerIndex; i++) {
      if (players[i].Score > player.Score) {
        rank++;
      }
    }
    
    // Update titles
    playerTitle.textContent = player.Player;
    
    let rankBadgeClass = 'rank-other';
    if (rank === 1) rankBadgeClass = 'rank-1';
    
    playerSubtitle.innerHTML = `
      <span class="player-score-badge" style="margin-right: 10px;">${player.Score} pt</span>
      <span>Posizione in classifica: <span class="rank-badge ${rankBadgeClass}" style="vertical-align: middle; margin-left: 2px;">${rank}</span></span>
    `;
    
    // 2. Fetch all matches to display side-by-side with predictions
    const matchesRes = await fetch('/api/matches');
    if (!matchesRes.ok) throw new Error('Impossibile caricare l\'elenco dei match.');
    const sortedGames = await matchesRes.json();
    
    tbody.innerHTML = '';
    
    const predictions = player.Predictions || [];
    
    const gamesToShow = sortedGames.slice(0, 50);
    
    gamesToShow.forEach((game, index) => {
      const matchNumber = index + 1;
      const homeFlag = getFlagUrl(game.teams.home.name, game.teams.home.logo);
      const awayFlag = getFlagUrl(game.teams.away.name, game.teams.away.logo);
      
      const isFinished = isMatchFinished(game);
      const outcome = getMatchOutcome(game);
      const pred = predictions[index] !== undefined ? predictions[index] : '-';
      
      // Format actual result display
      let resultDisplay = '-';
      if (game.goals.home !== null && game.goals.away !== null) {
        if (game.fixture.status.short === 'LIVE') {
          resultDisplay = `<span style="font-weight: 700; color: #ff4757;">${game.goals.home} - ${game.goals.away}</span> <span style="font-size: 0.7rem; color: #ff4757; font-weight: bold; margin-left: 2px; animation: blink 1s infinite;">LIVE</span>`;
        } else {
          resultDisplay = `${game.goals.home} - ${game.goals.away}`;
        }
      } else if (game.fixture.status.short === 'NS') {
        resultDisplay = `<span style="font-size: 0.8rem; color: var(--text-secondary); opacity: 0.7;">NS</span>`;
      } else {
        resultDisplay = `<span style="font-size: 0.8rem; color: var(--text-secondary); opacity: 0.7;">${game.fixture.status.short}</span>`;
      }
      
      // Format prediction badge class
      let badgeClass = 'pred-other';
      if (pred === '1') badgeClass = 'pred-1';
      else if (pred === 'X') badgeClass = 'pred-X';
      else if (pred === '2') badgeClass = 'pred-2';
      
      // Determine verification icon (V or X)
      let outcomeIcon = '';
      let rowStyle = '';
      if (isFinished && outcome !== null && pred !== '-') {
        if (pred === outcome) {
          outcomeIcon = `<span class="outcome-badge-success" title="Indovinato"><i class="fa-solid fa-circle-check"></i></span>`;
          rowStyle = 'background-color: rgba(16, 185, 129, 0.02);';
        } else {
          outcomeIcon = `<span class="outcome-badge-danger" title="Sbagliato"><i class="fa-solid fa-circle-xmark"></i></span>`;
          rowStyle = 'background-color: rgba(239, 68, 68, 0.01);';
        }
      } else if (isFinished && pred === '-') {
        outcomeIcon = `<span style="color: var(--text-secondary); font-size: 0.85rem;" title="Nessun Pronostico">-</span>`;
      } else {
        // Pending match
        outcomeIcon = `<span style="color: var(--text-secondary); opacity: 0.4; font-size: 0.85rem;" title="In attesa"><i class="fa-regular fa-clock"></i></span>`;
      }
      
      const tr = document.createElement('tr');
      if (rowStyle) tr.style = rowStyle;
      
      tr.innerHTML = `
        <td class="td-num" style="color: var(--text-secondary); font-size: 0.85rem; font-weight: 500;">
          #${matchNumber}
        </td>
        <td class="td-match">
          <div class="match-teams-compact">
            <div class="team-compact-item home-team">
              <span class="team-name-small">${game.teams.home.name}</span>
              <img src="${homeFlag}" alt="${game.teams.home.name}" class="team-flag-small" onerror="this.src='${game.teams.home.logo}'">
            </div>
            <span class="vs-compact">vs</span>
            <div class="team-compact-item away-team">
              <img src="${awayFlag}" alt="${game.teams.away.name}" class="team-flag-small" onerror="this.src='${game.teams.away.logo}'">
              <span class="team-name-small">${game.teams.away.name}</span>
            </div>
          </div>
        </td>
        <td class="td-result" style="text-align: center; font-weight: 700; font-family: var(--font-display);">
          ${resultDisplay}
        </td>
        <td class="td-prono" style="text-align: center;">
          <div class="prediction-val-small ${badgeClass}">
            ${pred}
          </div>
        </td>
        <td class="td-outcome" style="text-align: center;">
          ${outcomeIcon}
        </td>
      `;
      tbody.appendChild(tr);
    });
    
  } catch (err) {
    showError(err.message);
  }
}

function showError(message) {
  const tbody = document.getElementById('player-predictions-body');
  if (tbody) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5" class="empty-state" style="color: var(--accent-red);">
          <i class="fa-solid fa-circle-exclamation"></i> Errore: ${message}
        </td>
      </tr>
    `;
  }
}

// Update the page data when the tab is reactivated/resumed/focused
let lastUpdate = 0;
function updateData() {
  if (!currentPlayerName) return;
  const now = Date.now();
  if (now - lastUpdate < 2000) return; // Limit updates to once every 2 seconds
  lastUpdate = now;
  console.log('[FIFA SCORE] Aggiornamento pronostici giocatore...');
  loadPlayerData(currentPlayerName);
}

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    updateData();
  }
});

window.addEventListener('focus', () => {
  updateData();
});
