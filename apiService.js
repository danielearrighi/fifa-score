const scoreManager = require('./scoreManager');
const fs = require('fs');

async function fetchFixturesFromApi() {
  const url = 'https://worldcup26.ir/get/games';
  console.log(`Fetching games from ${url}...`);
  
  const response = await fetch(url, {
    method: 'GET'
  });

  if (!response.ok) {
    throw new Error(`API Request failed with status ${response.status}: ${response.statusText}`);
  }

  const data = await response.json();

  if (!data.games || !Array.isArray(data.games)) {
    throw new Error('No games returned from API.');
  }

  return data.games;
}

// Function to update the games.json file with new data from API
async function syncWithApi(apiKey, provider) {
  const apiGames = await fetchFixturesFromApi();
  
  // Load existing games
  scoreManager.initGamesFile();
  let localGames = [];
  try {
    localGames = JSON.parse(fs.readFileSync(scoreManager.GAMES_PATH, 'utf8'));
  } catch (err) {
    console.error('Error reading games.json, resetting to empty array', err);
  }

  let updatedCount = 0;
  
  // Map API games by their numeric ID
  const apiGamesMap = {};
  apiGames.forEach(g => {
    apiGamesMap[parseInt(g.id, 10)] = g;
  });

  // Update local games based on matching ID
  const updatedGames = localGames.map(localGame => {
    const matchId = localGame.fixture.id;
    const apiGame = apiGamesMap[matchId];
    
    if (apiGame) {
      const wasFinished = scoreManager.isMatchFinished(localGame);
      const isFinished = apiGame.finished === "TRUE";
      
      if (!wasFinished && isFinished) {
        updatedCount++;
      }
      
      // Update local game details with API details
      const homeGoals = isFinished ? parseInt(apiGame.home_score, 10) : null;
      const awayGoals = isFinished ? parseInt(apiGame.away_score, 10) : null;
      
      return {
        ...localGame,
        fixture: {
          ...localGame.fixture,
          status: {
            long: isFinished ? "Match Finished" : "Not Started",
            short: isFinished ? "FT" : "NS"
          }
        },
        goals: {
          home: homeGoals,
          away: awayGoals
        },
        score: {
          fulltime: {
            home: homeGoals,
            away: awayGoals
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
