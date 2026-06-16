const fs = require('fs');
const path = require('path');

const DATA_PATH = path.join(__dirname, 'Data', 'data.json');
const GAMES_PATH = path.join(__dirname, 'Data', 'games.json');
const INITIAL_GAMES_PATH = path.join(__dirname, 'Data', 'initial_games.json');

// Initialize games.json if it doesn't exist
function initGamesFile() {
  if (!fs.existsSync(GAMES_PATH)) {
    if (fs.existsSync(INITIAL_GAMES_PATH)) {
      fs.copyFileSync(INITIAL_GAMES_PATH, GAMES_PATH);
      console.log('Initialized games.json from initial_games.json');
    } else {
      fs.writeFileSync(GAMES_PATH, JSON.stringify([], null, 2), 'utf8');
      console.log('Created empty games.json');
    }
  }
}

// Calculate outcome of a fixture: "1", "X", or "2"
function getMatchOutcome(game) {
  const homeGoals = game.goals.home;
  const awayGoals = game.goals.away;
  
  if (homeGoals === null || awayGoals === null) {
    return null;
  }
  
  if (homeGoals > awayGoals) {
    return "1";
  } else if (homeGoals === awayGoals) {
    return "X";
  } else {
    return "2";
  }
}

// Check if a match status is finished
function isMatchFinished(game) {
  const status = game.fixture.status.short;
  return status === "FT" || status === "AET" || status === "PEN";
}

// Calculate and update players' scores
function updateScores() {
  initGamesFile();
  
  if (!fs.existsSync(DATA_PATH)) {
    console.error('Player data.json file not found.');
    return [];
  }
  
  const players = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
  const games = JSON.parse(fs.readFileSync(GAMES_PATH, 'utf8'));
  
  // Sort games chronologically (by timestamp, then by fixture ID)
  const sortedGames = [...games].sort((a, b) => {
    if (a.fixture.timestamp !== b.fixture.timestamp) {
      return a.fixture.timestamp - b.fixture.timestamp;
    }
    return a.fixture.id - b.fixture.id;
  });
  
  // Update scores
  const updatedPlayers = players.map(player => {
    let score = 0;
    const predictions = player.Predictions || [];
    
    predictions.forEach((pred, index) => {
      // If we don't have this match in our games data, skip
      if (index >= sortedGames.length) return;
      
      const game = sortedGames[index];
      if (isMatchFinished(game)) {
        const outcome = getMatchOutcome(game);
        if (outcome && pred === outcome) {
          score++;
        }
      }
    });
    
    return {
      ...player,
      Score: score
    };
  });
  
  // Write back to data.json
  fs.writeFileSync(DATA_PATH, JSON.stringify(updatedPlayers, null, 2), 'utf8');
  console.log('Scores updated in data.json');
  return updatedPlayers;
}

// Get the next upcoming match (chronologically first match with status not finished)
function getNextMatch() {
  initGamesFile();
  if (!fs.existsSync(GAMES_PATH)) return null;
  
  const games = JSON.parse(fs.readFileSync(GAMES_PATH, 'utf8'));
  
  // Sort games chronologically
  const sortedGames = [...games].sort((a, b) => {
    if (a.fixture.timestamp !== b.fixture.timestamp) {
      return a.fixture.timestamp - b.fixture.timestamp;
    }
    return a.fixture.id - b.fixture.id;
  });
  
  // Find the first match that is not finished
  const nextMatchIndex = sortedGames.findIndex(game => !isMatchFinished(game));
  
  if (nextMatchIndex === -1) {
    // If all matches are finished, return the last match or null
    return {
      match: sortedGames[sortedGames.length - 1] || null,
      index: sortedGames.length - 1
    };
  }
  
  return {
    match: sortedGames[nextMatchIndex],
    index: nextMatchIndex
  };
}

module.exports = {
  updateScores,
  getNextMatch,
  initGamesFile,
  getMatchOutcome,
  isMatchFinished,
  DATA_PATH,
  GAMES_PATH,
  INITIAL_GAMES_PATH
};
