
// Global page state
let currentMatchIndex = null;
let totalMatches = 0;

document.addEventListener('DOMContentLoaded', async () => {
  const urlParams = new URLSearchParams(window.location.search);
  const indexParam = urlParams.get('index');
  
  // Set up navbar next match link
  setupNavbarLink();
  
  if (indexParam === null) {
    // No index specified, fetch next match index and redirect
    try {
      const res = await fetch('/api/next-match');
      if (!res.ok) throw new Error();
      const data = await res.json();
      const nextIndex = data.index !== undefined ? data.index : 0;
      window.location.replace(`next-match.html?index=${nextIndex}`);
    } catch (err) {
      // Fallback to 0 if next match endpoint fails
      window.location.replace(`next-match.html?index=0`);
    }
    return;
  }
  
  currentMatchIndex = parseInt(indexParam);
  if (isNaN(currentMatchIndex)) {
    currentMatchIndex = 0;
  }
  
  // Load match details and predictions
  await loadMatchDetails(currentMatchIndex);
  await loadPredictions(currentMatchIndex);
  
  // Set up navigation event listeners
  document.getElementById('btn-prev-match').addEventListener('click', () => {
    if (currentMatchIndex > 0) {
      window.location.href = `next-match.html?index=${currentMatchIndex - 1}`;
    }
  });
  
  document.getElementById('btn-next-match').addEventListener('click', () => {
    if (currentMatchIndex < totalMatches - 1) {
      window.location.href = `next-match.html?index=${currentMatchIndex + 1}`;
    }
  });
});

async function setupNavbarLink() {
  const navNextMatch = document.getElementById('nav-next-match');
  if (navNextMatch) {
    try {
      const res = await fetch('/api/next-match');
      if (res.ok) {
        const data = await res.json();
        if (data.index !== undefined) {
          navNextMatch.href = `next-match.html?index=${data.index}`;
        }
      }
    } catch (e) {
      // Ignore
    }
  }
}

function getMatchOutcome(match) {
  const homeGoals = match.goals.home;
  const awayGoals = match.goals.away;
  if (homeGoals === null || awayGoals === null) return null;
  if (homeGoals > awayGoals) return "1";
  if (homeGoals === awayGoals) return "X";
  return "2";
}

async function loadMatchDetails(index) {
  const headerContainer = document.getElementById('match-header-container');
  try {
    const res = await fetch(`/api/match/${index}`);
    if (!res.ok) throw new Error('Dettagli partita non trovati.');
    
    const data = await res.json();
    const match = data.match;
    totalMatches = data.totalMatches;
    
    // Update navigation button states
    const btnPrev = document.getElementById('btn-prev-match');
    const btnNext = document.getElementById('btn-next-match');
    
    btnPrev.disabled = index === 0;
    btnNext.disabled = index === totalMatches - 1;
    
    // Style disabled buttons
    if (btnPrev.disabled) btnPrev.style.opacity = '0.5';
    if (btnNext.disabled) btnNext.style.opacity = '0.5';
    
    const dateObj = new Date(match.fixture.date);
    const options = { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' };
    const formattedDate = dateObj.toLocaleDateString('it-IT', options);
    
    const homeFlag = getFlagUrl(match.teams.home.name, match.teams.home.logo);
    const awayFlag = getFlagUrl(match.teams.away.name, match.teams.away.logo);
    
    const isFinished = match.fixture.status.short === "FT" || match.fixture.status.short === "AET" || match.fixture.status.short === "PEN";
    const isLive = match.fixture.status.short === "LIVE";
    const statusText = isFinished ? 'Terminata' : (isLive ? 'In Corso' : 'Non Iniziata');
    const statusClass = isFinished ? 'status-success' : (isLive ? 'status-warning' : 'status-error');
    
    // Build score display
    let scoreDisplay = '<span class="match-vs">VS</span>';
    if (isFinished) {
      scoreDisplay = `
        <div style="display: flex; flex-direction: column; align-items: center; gap: 0.25rem;">
          <div style="font-family: var(--font-display); font-size: 2.2rem; font-weight: 800; color: var(--accent-gold); letter-spacing: 0.1em; background-color: var(--bg-tertiary); padding: 0.2rem 1.2rem; border-radius: 0.75rem; border: 1px solid var(--border-color);">
            ${match.goals.home} - ${match.goals.away}
          </div>
          <span style="font-size: 0.75rem; text-transform: uppercase; color: var(--accent-green); font-weight: 600; letter-spacing: 0.05em;">Risultato Finale</span>
        </div>
      `;
    } else if (isLive && match.goals.home !== null && match.goals.away !== null) {
      scoreDisplay = `
        <div style="display: flex; flex-direction: column; align-items: center; gap: 0.25rem;">
          <div style="font-family: var(--font-display); font-size: 2.2rem; font-weight: 800; color: #ff4757; letter-spacing: 0.1em; background-color: var(--bg-tertiary); padding: 0.2rem 1.2rem; border-radius: 0.75rem; border: 1px solid #ff4757; animation: pulse-live 2s infinite;">
            ${match.goals.home} - ${match.goals.away}
          </div>
          <span style="font-size: 0.75rem; text-transform: uppercase; color: #ff4757; font-weight: 600; letter-spacing: 0.05em; display: flex; align-items: center; gap: 0.25rem;">
            <span style="display: inline-block; width: 6px; height: 6px; background-color: #ff4757; border-radius: 50%; animation: blink 1s infinite;"></span>
            In Corso
          </span>
        </div>
      `;
    }
    
    headerContainer.innerHTML = `
      <div class="prediction-details-header">
        <div class="pred-header-vs">
          <div style="display: flex; flex-direction: column; align-items: center; gap: 0.5rem; width: 100px;">
            <div class="pred-header-flag">
              <img src="${homeFlag}" alt="${match.teams.home.name}" onerror="this.src='${match.teams.home.logo}'">
            </div>
            <span style="font-family: var(--font-display); font-weight: 700; font-size: 0.95rem; text-align: center;">${match.teams.home.name}</span>
          </div>
          
          ${scoreDisplay}
          
          <div style="display: flex; flex-direction: column; align-items: center; gap: 0.5rem; width: 100px;">
            <div class="pred-header-flag">
              <img src="${awayFlag}" alt="${match.teams.away.name}" onerror="this.src='${match.teams.away.logo}'">
            </div>
            <span style="font-family: var(--font-display); font-weight: 700; font-size: 0.95rem; text-align: center;">${match.teams.away.name}</span>
          </div>
        </div>
        
        <div style="text-align: right; display: flex; flex-direction: column; gap: 0.4rem;">
          <span style="font-size: 0.85rem; color: var(--text-secondary);"><i class="fa-regular fa-clock"></i> ${formattedDate}</span>
          <span style="font-size: 0.8rem; color: var(--text-secondary);">Match #${index + 1} &bull; Gruppo</span>
          <div>
            <span class="rank-badge ${statusClass}" style="width: auto; height: auto; border-radius: 0.5rem; padding: 0.25rem 0.75rem; font-size: 0.75rem; font-weight: 600;">
              ${statusText}
            </span>
          </div>
        </div>
      </div>
    `;
    
    // Save match outcome globally for checker
    window.currentMatchOutcome = getMatchOutcome(match);
    window.isCurrentMatchFinished = isFinished;
  } catch (err) {
    headerContainer.innerHTML = `
      <div class="prediction-details-header" style="justify-content: center; border-color: var(--accent-red);">
        <div class="empty-state" style="color: var(--accent-red);">
          <i class="fa-solid fa-circle-exclamation"></i> ${err.message}
        </div>
      </div>
    `;
  }
}

async function loadPredictions(index) {
  const grid = document.getElementById('predictions-grid-body');
  try {
    const res = await fetch(`/api/match/${index}/predictions`);
    if (!res.ok) throw new Error('Pronostici non trovati.');
    
    const predictions = await res.json();
    
    if (predictions.length === 0) {
      grid.innerHTML = `<div class="empty-state" style="grid-column: 1 / -1;">Nessun pronostico disponibile per questo match.</div>`;
      const statsContainer = document.getElementById('predictions-stats-container');
      if (statsContainer) statsContainer.style.display = 'none';
      return;
    }
    
    // Calculate stats
    const validPredictions = predictions.filter(p => ['1', 'X', '2'].includes(p.prediction));
    const totalValid = validPredictions.length;
    const statsContainer = document.getElementById('predictions-stats-container');
    
    if (totalValid > 0 && statsContainer) {
      const count1 = predictions.filter(p => p.prediction === '1').length;
      const countX = predictions.filter(p => p.prediction === 'X').length;
      const count2 = predictions.filter(p => p.prediction === '2').length;
      
      const pct1 = Math.round((count1 / totalValid) * 100);
      const pctX = Math.round((countX / totalValid) * 100);
      const pct2 = Math.round((count2 / totalValid) * 100);
      
      statsContainer.innerHTML = `
        <div class="stats-box">
          <div class="stats-title">
            <span><i class="fa-solid fa-chart-pie"></i> Distribuzione Pronostici</span>
          </div>
          <div class="stats-bar-container">
            <div class="stats-bar-segment stats-bar-1" style="width: ${pct1}%" title="1: ${pct1}%"></div>
            <div class="stats-bar-segment stats-bar-X" style="width: ${pctX}%" title="X: ${pctX}%"></div>
            <div class="stats-bar-segment stats-bar-2" style="width: ${pct2}%" title="2: ${pct2}%"></div>
          </div>
          <div class="stats-legend">
            <div class="legend-item">
              <span class="legend-badge legend-badge-1">1</span>
              <span class="legend-pct">${pct1}%</span>
              <span class="legend-count">(${count1})</span>
            </div>
            <div class="legend-item">
              <span class="legend-badge legend-badge-X">X</span>
              <span class="legend-pct">${pctX}%</span>
              <span class="legend-count">(${countX})</span>
            </div>
            <div class="legend-item">
              <span class="legend-badge legend-badge-2">2</span>
              <span class="legend-pct">${pct2}%</span>
              <span class="legend-count">(${count2})</span>
            </div>
          </div>
        </div>
      `;
      statsContainer.style.display = 'block';
    } else if (statsContainer) {
      statsContainer.style.display = 'none';
    }

    grid.innerHTML = '';
    
    const outcome = window.currentMatchOutcome;
    const isFinished = window.isCurrentMatchFinished;
    
    predictions.forEach(p => {
      const pred = p.prediction;
      
      let badgeClass = 'pred-other';
      if (pred === '1') badgeClass = 'pred-1';
      else if (pred === 'X') badgeClass = 'pred-X';
      else if (pred === '2') badgeClass = 'pred-2';
      
      let feedbackDisplay = '';
      let borderStyle = '';
      
      if (isFinished && outcome !== null) {
        if (pred === outcome) {
          feedbackDisplay = `<span style="color: var(--accent-green); font-size: 0.8rem; font-weight: 700; display: flex; align-items: center; gap: 0.25rem;"><i class="fa-solid fa-circle-check"></i> Indovinato</span>`;
          borderStyle = 'border-color: rgba(16, 185, 129, 0.4); background: linear-gradient(135deg, var(--bg-secondary) 80%, rgba(16, 185, 129, 0.05) 100%);';
        } else {
          feedbackDisplay = `<span style="color: var(--accent-red); font-size: 0.8rem; font-weight: 700; display: flex; align-items: center; gap: 0.25rem;"><i class="fa-solid fa-circle-xmark"></i> Sbagliato</span>`;
          borderStyle = 'border-color: rgba(239, 68, 68, 0.2);';
        }
      }
      
      const card = document.createElement('div');
      card.className = 'prediction-card';
      card.style = borderStyle;
      card.innerHTML = `
        <div style="display: flex; flex-direction: column; gap: 0.25rem;">
          <span class="player-name">${p.player}</span>
          <span style="font-size: 0.75rem; color: var(--text-secondary);">Score: ${p.score} pt</span>
          ${feedbackDisplay}
        </div>
        <div class="prediction-val ${badgeClass}">
          ${pred}
        </div>
      `;
      grid.appendChild(card);
    });
  } catch (err) {
    grid.innerHTML = `<div class="empty-state" style="grid-column: 1 / -1; color: var(--accent-red);"><i class="fa-solid fa-circle-exclamation"></i> ${err.message}</div>`;
  }
}

// Update the page data when the tab is reactivated/resumed/focused
let lastUpdate = Date.now(); // Initialize with the page load time
function updateData() {
  if (currentMatchIndex === null) return;
  const now = Date.now();
  const fiveMinutes = 5 * 60 * 1000;
  if (now - lastUpdate < fiveMinutes) {
    const elapsedSeconds = Math.round((now - lastUpdate) / 1000);
    console.log(`[FIFA SCORE] Dati caricati di recente (${elapsedSeconds}s fa). Salto l'aggiornamento.`);
    return;
  }
  lastUpdate = now;
  console.log('[FIFA SCORE] Sono passati più di 5 minuti dall\'ultimo caricamento. Aggiornamento in corso...');
  loadMatchDetails(currentMatchIndex);
  loadPredictions(currentMatchIndex);
  setupNavbarLink();
}

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    updateData();
  }
});

window.addEventListener('focus', () => {
  updateData();
});
