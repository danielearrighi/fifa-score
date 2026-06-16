document.addEventListener('DOMContentLoaded', () => {
  setupNavbarLink();
  
  const consoleEl = document.getElementById('status-console');
  const apiKeyInput = document.getElementById('api-key-input');
  const providerSelect = document.getElementById('api-provider-select');
  
  const btnSync = document.getElementById('btn-sync-api');
  const btnSaveResult = document.getElementById('btn-save-result');
  const btnSimulate = document.getElementById('btn-simulate');
  const btnResetMatch = document.getElementById('btn-reset-match');
  const btnClear = document.getElementById('btn-clear-console');
  const btnRecalculate = document.getElementById('btn-recalculate');

  // Manual result entry DOM elements
  const manualMatchSelect = document.getElementById('manual-match-select');
  const simNextMatchContainer = document.getElementById('sim-next-match-container');
  const simHomeLogo = document.getElementById('sim-home-logo');
  const simHomeName = document.getElementById('sim-home-name');
  const simAwayLogo = document.getElementById('sim-away-logo');
  const simAwayName = document.getElementById('sim-away-name');
  const simHomeGoalsInput = document.getElementById('sim-home-goals');
  const simAwayGoalsInput = document.getElementById('sim-away-goals');

  let allGames = [];
  
  function log(message, type = 'info') {
    const timestamp = new Date().toLocaleTimeString('it-IT');
    let colorStyle = '';
    if (type === 'success') colorStyle = 'color: #34d399; font-weight: 600;';
    else if (type === 'error') colorStyle = 'color: #f87171; font-weight: 600;';
    else if (type === 'loading') colorStyle = 'color: var(--accent-gold);';
    
    const logLine = `<div style="${colorStyle}">[${timestamp}] ${message}</div>`;
    
    if (consoleEl.innerHTML === 'In attesa di comandi...') {
      consoleEl.innerHTML = logLine;
    } else {
      consoleEl.innerHTML += logLine;
    }
    consoleEl.scrollTop = consoleEl.scrollHeight;
  }
  
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

  // Populate matches dropdown
  function populateMatchSelect(games) {
    const currentValue = manualMatchSelect.value;
    manualMatchSelect.innerHTML = '<option value="" disabled selected>Scegli una partita...</option>';
    
    games.forEach((game, index) => {
      const home = game.teams.home.name;
      const away = game.teams.away.name;
      const isFinished = game.fixture.status.short === 'FT' || game.fixture.status.short === 'AET' || game.fixture.status.short === 'PEN';
      const score = isFinished ? `(${game.goals.home}-${game.goals.away})` : '(Non Iniziata)';
      
      const option = document.createElement('option');
      option.value = game.fixture.id;
      option.textContent = `Match #${index + 1}: ${home} - ${away} ${score}`;
      manualMatchSelect.appendChild(option);
    });

    if (currentValue && games.some(g => g.fixture.id === parseInt(currentValue, 10))) {
      manualMatchSelect.value = currentValue;
    }
  }

  // Load all matches from backend
  async function loadAllMatches(selectUnfinished = false) {
    try {
      const res = await fetch('/api/matches');
      if (!res.ok) throw new Error('Impossibile caricare le partite.');
      allGames = await res.json();
      
      populateMatchSelect(allGames);
      
      if (selectUnfinished) {
        // Select the first unfinished match by default
        const nextUnfinished = allGames.find(g => {
          const s = g.fixture.status.short;
          return s !== 'FT' && s !== 'AET' && s !== 'PEN';
        });
        
        if (nextUnfinished) {
          manualMatchSelect.value = nextUnfinished.fixture.id;
          handleMatchSelection(nextUnfinished.fixture.id);
        } else if (allGames.length > 0) {
          manualMatchSelect.value = allGames[allGames.length - 1].fixture.id;
          handleMatchSelection(allGames[allGames.length - 1].fixture.id);
        }
      } else if (manualMatchSelect.value) {
        handleMatchSelection(parseInt(manualMatchSelect.value, 10));
      }
    } catch (err) {
      log(`Errore nel caricamento delle partite: ${err.message}`, 'error');
    }
  }

  // Handle selected match details
  function handleMatchSelection(matchId) {
    const game = allGames.find(g => g.fixture.id === matchId);
    if (!game) {
      simNextMatchContainer.style.display = 'none';
      btnSaveResult.disabled = true;
      btnSimulate.disabled = true;
      btnResetMatch.disabled = true;
      return;
    }

    simNextMatchContainer.style.display = 'block';
    btnSaveResult.disabled = false;
    btnSimulate.disabled = false;
    btnResetMatch.disabled = false;

    const homeFlag = getFlagUrl(game.teams.home.name, game.teams.home.logo);
    const awayFlag = getFlagUrl(game.teams.away.name, game.teams.away.logo);

    simHomeLogo.src = homeFlag;
    simHomeLogo.alt = game.teams.home.name;
    simHomeName.textContent = game.teams.home.name;

    simAwayLogo.src = awayFlag;
    simAwayLogo.alt = game.teams.away.name;
    simAwayName.textContent = game.teams.away.name;

    const isFinished = game.fixture.status.short === 'FT' || game.fixture.status.short === 'AET' || game.fixture.status.short === 'PEN';
    if (isFinished) {
      simHomeGoalsInput.value = game.goals.home !== null ? game.goals.home : '';
      simAwayGoalsInput.value = game.goals.away !== null ? game.goals.away : '';
      btnResetMatch.style.display = 'inline-block';
    } else {
      simHomeGoalsInput.value = '';
      simAwayGoalsInput.value = '';
      btnResetMatch.style.display = 'none'; // Only show reset button if match is finished
    }
  }

  // Dropdown change listener
  manualMatchSelect.addEventListener('change', (e) => {
    handleMatchSelection(parseInt(e.target.value, 10));
  });

  // Load matches on startup (and pre-select first unfinished)
  loadAllMatches(true);

  btnClear.addEventListener('click', () => {
    consoleEl.innerHTML = 'In attesa di comandi...';
  });
  
  // 1. Sync from API
  btnSync.addEventListener('click', async () => {
    const apiKey = apiKeyInput.value.trim();
    const provider = providerSelect.value;
    
    log('Avvio sincronizzazione con API-Football...', 'loading');
    btnSync.disabled = true;
    
    try {
      const response = await fetch('/api/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ apiKey, provider })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Errore sconosciuto durante la sincronizzazione.');
      }
      
      log(`Sincronizzazione completata! ${data.message}`, 'success');
    } catch (err) {
      log(`Errore di sincronizzazione: ${err.message}`, 'error');
      log('Suggerimento: Controlla che la tua API Key sia corretta o inserisci i risultati manualmente.', 'info');
    } finally {
      btnSync.disabled = false;
      loadAllMatches(); // Refresh matches list
    }
  });
  
  // 2. Save manual result
  btnSaveResult.addEventListener('click', async () => {
    const matchId = manualMatchSelect.value;
    if (!matchId) return;

    const homeGoals = simHomeGoalsInput.value.trim();
    const awayGoals = simAwayGoalsInput.value.trim();
    
    if (homeGoals === '' || awayGoals === '') {
      alert('Per salvare un risultato, specifica entrambi i gol (Casa e Trasferta).');
      return;
    }

    const homeParsed = parseInt(homeGoals, 10);
    const awayParsed = parseInt(awayGoals, 10);

    if (isNaN(homeParsed) || homeParsed < 0 || isNaN(awayParsed) || awayParsed < 0) {
      alert('I gol devono essere numeri interi non negativi.');
      return;
    }
    
    log(`Salvataggio del risultato per il match #${matchId} in corso...`, 'loading');
    
    try {
      const response = await fetch('/api/update-match', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ matchId, homeGoals: homeParsed, awayGoals: awayParsed, status: 'FT' })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Errore durante il salvataggio.');
      }
      
      log(`Risultato salvato con successo!`, 'success');
      log(`${data.message}: ${homeParsed} - ${awayParsed}`, 'success');
      log(`Classifica e punteggi ricalcolati!`, 'info');
    } catch (err) {
      log(`Errore durante il salvataggio: ${err.message}`, 'error');
    } finally {
      setupNavbarLink(); // Refresh next match link in navbar
      loadAllMatches();  // Reload matches
    }
  });

  // 3. Simulate random result
  btnSimulate.addEventListener('click', async () => {
    const matchId = manualMatchSelect.value;
    if (!matchId) return;

    const homeGoals = Math.floor(Math.random() * 5);
    const awayGoals = Math.floor(Math.random() * 5);

    simHomeGoalsInput.value = homeGoals;
    simAwayGoalsInput.value = awayGoals;
    
    log(`Simulazione del risultato per il match #${matchId} in corso...`, 'loading');
    
    try {
      const response = await fetch('/api/update-match', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ matchId, homeGoals, awayGoals, status: 'FT' })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Errore durante la simulazione.');
      }
      
      log(`Simulazione completata con successo!`, 'success');
      log(`${data.message}: ${homeGoals} - ${awayGoals}`, 'success');
      log(`Classifica e punteggi ricalcolati!`, 'info');
    } catch (err) {
      log(`Errore durante la simulazione: ${err.message}`, 'error');
    } finally {
      setupNavbarLink(); // Refresh next match link in navbar
      loadAllMatches();  // Reload matches
    }
  });
  
  // 4. Reset match to Not Started
  btnResetMatch.addEventListener('click', async () => {
    const matchId = manualMatchSelect.value;
    if (!matchId) return;

    if (!confirm('Sei sicuro di voler resettare il risultato di questa partita? Verrà contrassegnata come "Non Iniziata" e i punteggi verranno ricalcolati.')) {
      return;
    }
    
    log(`Ripristino del match #${matchId} allo stato iniziale...`, 'loading');
    
    try {
      const response = await fetch('/api/update-match', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ matchId, status: 'NS' })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Errore durante il reset.');
      }
      
      log(`Match riportato allo stato non iniziato con successo!`, 'success');
      log(`Classifica e punteggi ricalcolati!`, 'info');
    } catch (err) {
      log(`Errore durante il reset del match: ${err.message}`, 'error');
    } finally {
      setupNavbarLink(); // Refresh next match link in navbar
      loadAllMatches();  // Reload matches
    }
  });

  // 5. Recalculate all scores
  btnRecalculate.addEventListener('click', async () => {
    log('Avvio ricalcolo manuale di tutti i punteggi...', 'loading');
    btnRecalculate.disabled = true;

    try {
      const response = await fetch('/api/recalculate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Errore durante il ricalcolo.');
      }

      log('Ricalcolo completato con successo!', 'success');
      log(data.message, 'success');
    } catch (err) {
      log(`Errore durante il ricalcolo: ${err.message}`, 'error');
    } finally {
      btnRecalculate.disabled = false;
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
