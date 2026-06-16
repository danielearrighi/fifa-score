document.addEventListener('DOMContentLoaded', () => {
  setupNavbarLink();
  
  const consoleEl = document.getElementById('status-console');
  const apiKeyInput = document.getElementById('api-key-input');
  const providerSelect = document.getElementById('api-provider-select');
  
  const btnSync = document.getElementById('btn-sync-api');
  const btnSimulate = document.getElementById('btn-simulate');
  const btnReset = document.getElementById('btn-reset-games');
  const btnClear = document.getElementById('btn-clear-console');

  // Simulation controls elements
  const simNextMatchContainer = document.getElementById('sim-next-match-container');
  const simNoMatches = document.getElementById('sim-no-matches');
  const simHomeLogo = document.getElementById('sim-home-logo');
  const simHomeName = document.getElementById('sim-home-name');
  const simAwayLogo = document.getElementById('sim-away-logo');
  const simAwayName = document.getElementById('sim-away-name');
  const simHomeGoalsInput = document.getElementById('sim-home-goals');
  const simAwayGoalsInput = document.getElementById('sim-away-goals');
  
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
  
  // Load next match details for simulation
  async function loadNextMatchForSimulation() {
    if (!simNextMatchContainer || !simNoMatches) return;
    
    try {
      const res = await fetch('/api/next-match');
      if (!res.ok) {
        throw new Error('Impossibile recuperare il prossimo match.');
      }
      
      const data = await res.json();
      const match = data.match;
      
      const isFinished = match && (
        match.fixture.status.short === 'FT' || 
        match.fixture.status.short === 'AET' || 
        match.fixture.status.short === 'PEN'
      );
      
      if (!match || isFinished) {
        simNextMatchContainer.style.display = 'none';
        simNoMatches.style.display = 'block';
        btnSimulate.disabled = true;
        btnSimulate.innerHTML = '<i class="fa-solid fa-ban"></i> Nessun match da simulare';
        btnSimulate.style.backgroundColor = 'var(--text-secondary)';
      } else {
        simNextMatchContainer.style.display = 'block';
        simNoMatches.style.display = 'none';
        btnSimulate.disabled = false;
        btnSimulate.innerHTML = '<i class="fa-solid fa-play"></i> Simula Risultato Prossima Partita';
        btnSimulate.style.backgroundColor = 'var(--accent-green)';
        
        simHomeLogo.src = match.teams.home.logo || '';
        simHomeLogo.alt = match.teams.home.name || '';
        simHomeName.textContent = match.teams.home.name || '';
        
        simAwayLogo.src = match.teams.away.logo || '';
        simAwayLogo.alt = match.teams.away.name || '';
        simAwayName.textContent = match.teams.away.name || '';
        
        // Reset inputs
        simHomeGoalsInput.value = '';
        simAwayGoalsInput.value = '';
      }
    } catch (err) {
      console.error(err);
      simNextMatchContainer.style.display = 'none';
      simNoMatches.style.display = 'block';
      simNoMatches.textContent = 'Errore nel caricamento del prossimo match.';
    }
  }

  // Load next match simulation on startup
  loadNextMatchForSimulation();

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
      log('Suggerimento: Controlla che la tua API Key sia corretta o prova a simulare una partita offline.', 'info');
    } finally {
      btnSync.disabled = false;
      loadNextMatchForSimulation(); // Refresh next match simulation view
    }
  });
  
  // 2. Simulate next match
  btnSimulate.addEventListener('click', async () => {
    const homeGoals = simHomeGoalsInput.value.trim();
    const awayGoals = simAwayGoalsInput.value.trim();
    
    // Validate: must provide both or neither
    if ((homeGoals !== '' && awayGoals === '') || (homeGoals === '' && awayGoals !== '')) {
      alert('Per inserire un risultato manuale, specifica entrambi i gol (Casa e Trasferta), altrimenti lasciali vuoti per un risultato casuale.');
      return;
    }
    
    log('Simulazione del prossimo incontro in corso...', 'loading');
    btnSimulate.disabled = true;
    
    try {
      const response = await fetch('/api/simulate-match', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ homeGoals, awayGoals })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Nessuna partita da simulare.');
      }
      
      log(`Simulazione completata con successo!`, 'success');
      log(`Risultato: ${data.message}`, 'success');
      log(`I punteggi dei partecipanti e la classifica sono stati aggiornati!`, 'info');
    } catch (err) {
      log(`Errore di simulazione: ${err.message}`, 'error');
    } finally {
      btnSimulate.disabled = false;
      setupNavbarLink(); // Refresh next match link in navbar
      loadNextMatchForSimulation(); // Refresh next match simulation view
    }
  });
  
  // 3. Reset database
  btnReset.addEventListener('click', async () => {
    if (!confirm('Sei sicuro di voler resettare il database dei match e i punteggi? Tutti i risultati simulati andranno persi.')) {
      return;
    }
    
    log('Reset del database dei match e dei punteggi in corso...', 'loading');
    btnReset.disabled = true;
    
    try {
      const response = await fetch('/api/reset-games', {
        method: 'POST'
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Impossibile resettare.');
      }
      
      log(`Database ripristinato allo stato iniziale!`, 'success');
      log(`Tutti i punteggi sono stati ricalcolati ed azzerati.`, 'info');
    } catch (err) {
      log(`Errore durante il reset: ${err.message}`, 'error');
    } finally {
      btnReset.disabled = false;
      setupNavbarLink(); // Refresh next match link in navbar
      loadNextMatchForSimulation(); // Refresh next match simulation view
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
