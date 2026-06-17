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

// Function to sync only the next match (and any simultaneous matches)
async function syncNextMatch() {
  const nextMatchInfo = scoreManager.getNextMatch();
  if (!nextMatchInfo || !nextMatchInfo.match || scoreManager.isMatchFinished(nextMatchInfo.match)) {
    return {
      updated: false,
      message: 'All matches are finished. No matches left to sync.'
    };
  }

  const targetMatch = nextMatchInfo.match;
  const targetTimestamp = targetMatch.fixture.timestamp;

  // Load existing games
  scoreManager.initGamesFile();
  let localGames = [];
  try {
    localGames = JSON.parse(fs.readFileSync(scoreManager.GAMES_PATH, 'utf8'));
  } catch (err) {
    console.error('Error reading games.json', err);
    throw err;
  }

  // Find all matches with the same timestamp
  const targets = localGames.filter(g => g.fixture.timestamp === targetTimestamp);
  const targetIds = targets.map(t => t.fixture.id);

  console.log(`Syncing next match(es) from API. Target IDs: ${targetIds.join(', ')}`);

  // Fetch games from API
  const apiGames = await fetchFixturesFromApi();
  
  // Map API games by their numeric ID
  const apiGamesMap = {};
  apiGames.forEach(g => {
    apiGamesMap[parseInt(g.id, 10)] = g;
  });

  let updatedCount = 0;
  let hasChanges = false;
  const updatedMatchesInfo = [];

  // Update local games based on matching ID
  const updatedGames = localGames.map(localGame => {
    const matchId = localGame.fixture.id;
    
    if (targetIds.includes(matchId)) {
      const apiGame = apiGamesMap[matchId];
      
      if (apiGame) {
        const isFinished = apiGame.finished === "TRUE";
        
        if (!isFinished) {
          // If the match is not finished yet, do not update anything
          return localGame;
        }

        const wasFinished = scoreManager.isMatchFinished(localGame);
        const parsedHome = parseInt(apiGame.home_score, 10);
        const parsedAway = parseInt(apiGame.away_score, 10);
        const homeGoals = !isNaN(parsedHome) ? parsedHome : null;
        const awayGoals = !isNaN(parsedAway) ? parsedAway : null;
        const statusLong = "Match Finished";
        const statusShort = "FT";

        // Check if anything actually changed
        const goalsChanged = localGame.goals.home !== homeGoals || localGame.goals.away !== awayGoals;
        const statusChanged = localGame.fixture.status.short !== statusShort;

        if (goalsChanged || statusChanged) {
          hasChanges = true;
          if (!wasFinished && isFinished) {
            updatedCount++;
          }
          
          updatedMatchesInfo.push({
            id: matchId,
            teams: `${localGame.teams.home.name} vs ${localGame.teams.away.name}`,
            oldStatus: localGame.fixture.status.short,
            newStatus: statusShort,
            oldScore: `${localGame.goals.home}-${localGame.goals.away}`,
            newScore: `${homeGoals}-${awayGoals}`
          });

          return {
            ...localGame,
            fixture: {
              ...localGame.fixture,
              status: {
                long: statusLong,
                short: statusShort
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
      }
    }
    
    return localGame;
  });

  if (hasChanges) {
    // Save the updated games back to games.json
    fs.writeFileSync(scoreManager.GAMES_PATH, JSON.stringify(updatedGames, null, 2), 'utf8');
    console.log(`Synced games database. Updated status/score for target matches.`);
    
    // Recalculate scores ONLY if at least one match was finished
    let updatedPlayers = [];
    if (updatedCount > 0) {
      updatedPlayers = scoreManager.updateScores();
    } else {
      try {
        updatedPlayers = JSON.parse(fs.readFileSync(scoreManager.DATA_PATH, 'utf8'));
      } catch (err) {
        console.error('Error reading data.json', err);
      }
    }
    
    return {
      updated: true,
      updatedCount,
      updatedMatches: updatedMatchesInfo,
      players: updatedPlayers
    };
  }

  return {
    updated: false,
    message: 'No changes detected for the active match(es).',
    targetIds
  };
}

module.exports = {
  fetchFixturesFromApi,
  syncWithApi,
  syncNextMatch
};
