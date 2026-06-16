// Flag mapping helper
const countryToCode = {
  "mexico": "mx", "messico": "mx",
  "south africa": "za", "sud africa": "za", "sudafrica": "za",
  "south korea": "kr", "corea del sud": "kr",
  "czechia": "cz", "repubblica ceca": "cz",
  "canada": "ca",
  "bosnia and herzegovina": "ba", "bosnia ed erzegovina": "ba", "bosnia": "ba",
  "usa": "us", "stati uniti": "us", "united states": "us",
  "paraguay": "py",
  "qatar": "qa",
  "switzerland": "ch", "svizzera": "ch",
  "brazil": "br", "brasile": "br",
  "morocco": "ma", "marocco": "ma",
  "scotland": "gb-sct", "scozia": "gb-sct",
  "haiti": "ht",
  "australia": "au",
  "türkiye": "tr", "turkey": "tr", "turchia": "tr",
  "germany": "de", "germania": "de",
  "curaçao": "cw", "curacao": "cw",
  "netherlands": "nl", "paesi bassi": "nl", "olanda": "nl",
  "japan": "jp", "giappone": "jp",
  "ivory coast": "ci", "costa d'avorio": "ci",
  "ecuador": "ec",
  "sweden": "se", "svezia": "se",
  "tunisia": "tn",
  "spain": "es", "spagna": "es",
  "cape verde": "cv", "capo verde": "cv",
  "belgium": "be", "belgio": "be",
  "egypt": "eg", "egitto": "eg",
  "saudi arabia": "sa", "arabia saudita": "sa",
  "uruguay": "uy",
  "iran": "ir",
  "new zealand": "nz", "nuova zelanda": "nz",
  "france": "fr", "francia": "fr",
  "senegal": "sn",
  "argentina": "ar",
  "algeria": "dz",
  "norway": "no", "norvegia": "no",
  "iraq": "iq",
  "austria": "at",
  "jordan": "jo", "giordania": "jo",
  "england": "gb-eng", "inghilterra": "gb-eng",
  "croatia": "hr", "croazia": "hr",
  "italy": "it", "italia": "it",
  "cameroon": "cm", "camerun": "cm",
  "colombia": "co",
  "uzbekistan": "uz",
  "denmark": "dk", "danimarca": "dk",
  "angola": "ao",
  "portugal": "pt", "portogallo": "pt",
  "panama": "pa"
};

function getFlagUrl(countryName, fallbackUrl) {
  const normalized = countryName.toLowerCase().trim();
  const code = countryToCode[normalized];
  if (code) {
    return `https://flagcdn.com/w80/${code}.png`;
  }
  return fallbackUrl || 'https://media.api-sports.io/football/teams/0.png';
}

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
      return;
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
