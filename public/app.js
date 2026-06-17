
document.addEventListener('DOMContentLoaded', () => {
  loadLeaderboard();
  loadNextMatch();
});

// Fetch and load leaderboard rankings
async function loadLeaderboard() {
  const tbody = document.getElementById('leaderboard-body');
  try {
    const res = await fetch('/api/players');
    if (!res.ok) throw new Error('Impossibile caricare la classifica.');
    
    const players = await res.json();
    
    if (players.length === 0) {
      tbody.innerHTML = `<tr><td colspan="3" class="empty-state">Nessun giocatore registrato.</td></tr>`;
      return;
    }
    
    tbody.innerHTML = '';
    players.forEach((player, index) => {
      // Calculate standard competition ranking (ties get the same rank)
      let rank = 1;
      for (let i = 0; i < index; i++) {
        if (players[i].Score > player.Score) {
          rank++;
        }
      }
      
      let rankClass = 'rank-other';
      if (rank === 1) rankClass = 'rank-1';
      
      const tr = document.createElement('tr');
      tr.style.cursor = 'pointer';
      tr.addEventListener('click', () => {
        window.location.href = `player.html?player=${encodeURIComponent(player.Player)}`;
      });
      tr.innerHTML = `
        <td>
          <span class="rank-badge ${rankClass}">${rank}</span>
        </td>
        <td>
          <span class="player-name">${player.Player}</span>
        </td>
        <td style="text-align: right;">
          <span class="player-score-badge">${player.Score} pt</span>
        </td>
      `;
      tbody.appendChild(tr);
    });
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="3" class="empty-state" style="color: var(--accent-red);"><i class="fa-solid fa-circle-exclamation"></i> Errore: ${err.message}</td></tr>`;
  }
}

// Fetch and load the next upcoming match
async function loadNextMatch() {
  const container = document.getElementById('next-match-container');
  try {
    const res = await fetch('/api/next-match');
    if (!res.ok) throw new Error('Impossibile caricare il prossimo incontro.');
    
    const data = await res.json();
    const match = data.match;
    const index = data.index;
    
    if (!match) {
      container.innerHTML = `<div class="empty-state">Nessuna prossima partita programmata. Il torneo potrebbe essere terminato!</div>`;
      return;
    }
    
    const dateObj = new Date(match.fixture.date);
    const options = { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' };
    const formattedDate = dateObj.toLocaleDateString('it-IT', options);
    
    const homeFlag = getFlagUrl(match.teams.home.name, match.teams.home.logo);
    const awayFlag = getFlagUrl(match.teams.away.name, match.teams.away.logo);
    
    container.innerHTML = `
      <div class="match-card-content">
        <div class="match-info-meta">
          <span class="match-date">${formattedDate}</span>
          <span class="match-round">Match #${index + 1} &bull; Gruppi</span>
        </div>
        
        <div class="match-teams">
          <div class="team">
            <div class="team-flag-container">
              <img src="${homeFlag}" alt="${match.teams.home.name}" class="team-flag" onerror="this.src='${match.teams.home.logo}'">
            </div>
            <span class="team-name">${match.teams.home.name}</span>
          </div>
          
          <div class="match-vs">VS</div>
          
          <div class="team">
            <div class="team-flag-container">
              <img src="${awayFlag}" alt="${match.teams.away.name}" class="team-flag" onerror="this.src='${match.teams.away.logo}'">
            </div>
            <span class="team-name">${match.teams.away.name}</span>
          </div>
        </div>
        
        <a href="next-match.html?index=${index}" class="btn btn-gold">
          <i class="fa-solid fa-eye"></i> Vedi Pronostici Partecipanti
        </a>
      </div>
    `;
    
    // Also update the navbar next match link to go directly to this match index
    const navNextMatch = document.getElementById('nav-next-match');
    if (navNextMatch) {
      navNextMatch.href = `next-match.html?index=${index}`;
    }
  } catch (err) {
    container.innerHTML = `
      <div class="empty-state" style="color: var(--accent-red);">
        <i class="fa-solid fa-circle-exclamation"></i> Errore nel caricamento della partita: ${err.message}
      </div>
    `;
  }
}
