const scoreManager = require('./scoreManager');
const fs = require('fs');

async function fetchFixturesFromApi(apiKey, provider = 'api-sports') {
  if (!apiKey) {
    throw new Error('API Key is missing. Please configure your API-Football Key.');
  }

  let url = '';
  let headers = {};

  if (provider === 'rapidapi') {
    url = 'https://api-football-v1.p.rapidapi.com/v3/fixtures?league=1&season=2026';
    headers = {
      'x-rapidapi-host': 'api-football-v1.p.rapidapi.com',
      'x-rapidapi-key': apiKey
    };
  } else {
    // Direct API-Sports endpoint
    url = 'https://v3.football.api-sports.io/fixtures?league=1&season=2026';
    headers = {
      'x-apisports-key': apiKey
    };
  }

  console.log(`Fetching fixtures from API-Football (${provider})...`);
  
  const response = await fetch(url, {
    method: 'GET',
    headers: headers
  });

  if (!response.ok) {
    throw new Error(`API Request failed with status ${response.status}: ${response.statusText}`);
  }

  const data = await response.json();

  if (data.errors && Object.keys(data.errors).length > 0) {
    const errorMsg = JSON.stringify(data.errors);
    throw new Error(`API-Football returned errors: ${errorMsg}`);
  }

  if (!data.response || !Array.isArray(data.response) || data.response.length === 0) {
    throw new Error('No fixtures returned from API-Football.');
  }

  return data.response;
}

// Function to update the games.json file with new data from API
async function syncWithApi(apiKey, provider = 'api-sports') {
  const apiFixtures = await fetchFixturesFromApi(apiKey, provider);
  
  // Load existing games
  scoreManager.initGamesFile();
  let localGames = [];
  try {
    localGames = JSON.parse(fs.readFileSync(scoreManager.GAMES_PATH, 'utf8'));
  } catch (err) {
    console.error('Error reading games.json, resetting to empty array', err);
  }

  // Create a map of API fixtures by team names or other identifier
  // API-Football matches are identified by fixture.id. Let's map them.
  // We want to update local matches that have matching home/away teams, or fixture ID.
  // Since we populated initial_games with dummy IDs starting from 100001, let's match by team names!
  // Matching by team names is extremely robust for combining mock scheduling with live API data.
  
  let updatedCount = 0;
  
  // Sort API fixtures chronologically
  const sortedApiFixtures = [...apiFixtures].sort((a, b) => a.fixture.timestamp - b.fixture.timestamp);
  
  // Update local games based on team names or index
  // The first element corresponds to first match of World Cup, and so on.
  // So we can align them by chronological index!
  const updatedGames = localGames.map((localGame, index) => {
    if (index >= sortedApiFixtures.length) return localGame;
    
    const apiGame = sortedApiFixtures[index];
    
    // Check if the teams match (case-insensitive, basic check)
    const localHome = localGame.teams.home.name.toLowerCase();
    const localAway = localGame.teams.away.name.toLowerCase();
    const apiHome = apiGame.teams.home.name.toLowerCase();
    const apiAway = apiGame.teams.away.name.toLowerCase();
    
    // If teams match or we assume they correspond due to chronological order
    const isSameMatch = localHome === apiHome || localHome.includes(apiHome) || apiHome.includes(localHome);
    
    if (isSameMatch || index < 48) { // Align by index for the group stage
      // Check if status changed to finished
      const wasFinished = scoreManager.isMatchFinished(localGame);
      const isFinished = scoreManager.isMatchFinished(apiGame);
      
      if (!wasFinished && isFinished) {
        updatedCount++;
      }
      
      // Update local game details with API details
      return {
        ...localGame,
        fixture: {
          ...localGame.fixture,
          id: apiGame.fixture.id,
          date: apiGame.fixture.date,
          timestamp: apiGame.fixture.timestamp,
          status: apiGame.fixture.status
        },
        goals: apiGame.goals,
        score: apiGame.score,
        // Keep local team names if they are cleaner, or overwrite with API names
        teams: {
          home: {
            ...localGame.teams.home,
            name: apiGame.teams.home.name,
            logo: apiGame.teams.home.logo
          },
          away: {
            ...localGame.teams.away,
            name: apiGame.teams.away.name,
            logo: apiGame.teams.away.logo
          }
        }
      };
    }
    
    return localGame;
  });

  // Save the updated games back to games.json
  fs.writeFileSync(scoreManager.GAMES_PATH, JSON.stringify(updatedGames, null, 2), 'utf8');
  console.log(`Synced games database. Updated status for ${updatedCount} matches.`);
  
  // Recalculate scores
  const updatedPlayers = scoreManager.updateScores();
  
  return {
    updatedCount,
    players: updatedPlayers,
    games: updatedGames
  };
}

module.exports = {
  fetchFixturesFromApi,
  syncWithApi
};
