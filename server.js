const express = require('express');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const scoreManager = require('./scoreManager');
const apiService = require('./apiService');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Initialize files on start
scoreManager.initGamesFile();
scoreManager.updateScores(); // Run once on startup to make sure scores are accurate

// API Routes

// 1. Get all players sorted by Score descending (Leaderboard)
app.get('/api/players', (req, res) => {
  try {
    if (!fs.existsSync(scoreManager.DATA_PATH)) {
      return res.status(404).json({ error: 'Player database not found' });
    }
    const players = JSON.parse(fs.readFileSync(scoreManager.DATA_PATH, 'utf8'));
    // Sort players by Score descending
    const sortedPlayers = [...players].sort((a, b) => b.Score - a.Score);
    res.json(sortedPlayers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. Get next match
app.get('/api/next-match', (req, res) => {
  try {
    const nextMatchInfo = scoreManager.getNextMatch();
    if (!nextMatchInfo || !nextMatchInfo.match) {
      return res.status(404).json({ error: 'No upcoming matches found' });
    }
    res.json(nextMatchInfo);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2b. Get match by index
app.get('/api/match/:index', (req, res) => {
  try {
    const index = parseInt(req.params.index);
    if (isNaN(index)) {
      return res.status(400).json({ error: 'Invalid match index' });
    }
    
    const games = JSON.parse(fs.readFileSync(scoreManager.GAMES_PATH, 'utf8'));
    const sortedGames = [...games].sort((a, b) => {
      if (a.fixture.timestamp !== b.fixture.timestamp) {
        return a.fixture.timestamp - b.fixture.timestamp;
      }
      return a.fixture.id - b.fixture.id;
    });
    
    if (index < 0 || index >= sortedGames.length) {
      return res.status(404).json({ error: 'Match index out of bounds' });
    }
    
    res.json({
      match: sortedGames[index],
      index: index,
      totalMatches: sortedGames.length
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. Get predictions for a specific match index
app.get('/api/match/:index/predictions', (req, res) => {
  try {
    const index = parseInt(req.params.index);
    if (isNaN(index)) {
      return res.status(400).json({ error: 'Invalid match index' });
    }
    
    if (!fs.existsSync(scoreManager.DATA_PATH)) {
      return res.status(404).json({ error: 'Player database not found' });
    }
    
    const players = JSON.parse(fs.readFileSync(scoreManager.DATA_PATH, 'utf8'));
    
    const predictions = players.map(p => {
      const pred = p.Predictions && p.Predictions[index] ? p.Predictions[index] : '-';
      return {
        player: p.Player,
        prediction: pred,
        score: p.Score
      };
    });
    
    res.json(predictions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4. On-demand sync with API
app.post('/api/sync', async (req, res) => {
  try {
    const result = await apiService.syncWithApi();
    res.json({
      success: true,
      message: `Database successfully synced. ${result.updatedCount} matches updated.`,
      updatedCount: result.updatedCount
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4b. Sync only the next match (and simultaneous matches) from the API - designed for automated schedules
app.all('/api/update-next-match', async (req, res) => {
  try {
    const nextMatchInfo = scoreManager.getNextMatch();
    if (!nextMatchInfo || !nextMatchInfo.match) {
      return res.json({
        success: true,
        updated: false,
        message: 'No upcoming matches found'
      });
    }

    if (scoreManager.isMatchFinished(nextMatchInfo.match)) {
      return res.json({
        success: true,
        updated: false,
        message: 'All matches are finished. No matches left to sync.'
      });
    }

    const targetMatch = nextMatchInfo.match;
    const targetTimestamp = targetMatch.fixture.timestamp;
    const nowInSeconds = Math.floor(Date.now() / 1000);
    const elapsedSeconds = nowInSeconds - targetTimestamp;

    if (elapsedSeconds >= 115 * 60) {
      // Fetch from external API only if match started at least 115 minutes ago
      const result = await apiService.syncNextMatch();
      res.json({
        success: true,
        ...result
      });
    } else if (nowInSeconds < targetTimestamp) {
      // Match not started yet, leave it as is
      res.json({
        success: true,
        updated: false,
        message: 'Match has not started yet. Left as is.'
      });
    } else {
      // Match started but within 115 minutes, set status to "LIVE"
      const games = JSON.parse(fs.readFileSync(scoreManager.GAMES_PATH, 'utf8'));
      let hasChanges = false;
      const updatedGames = games.map(game => {
        if (game.fixture.timestamp === targetTimestamp && !scoreManager.isMatchFinished(game)) {
          if (game.fixture.status.short !== 'LIVE') {
            hasChanges = true;
            return {
              ...game,
              fixture: {
                ...game.fixture,
                status: {
                  long: "In Progress",
                  short: "LIVE"
                }
              }
            };
          }
        }
        return game;
      });

      if (hasChanges) {
        fs.writeFileSync(scoreManager.GAMES_PATH, JSON.stringify(updatedGames, null, 2), 'utf8');
        res.json({
          success: true,
          updated: true,
          message: 'Match is in progress. Status set to LIVE.'
        });
      } else {
        res.json({
          success: true,
          updated: false,
          message: 'Match is in progress and already set to LIVE.'
        });
      }
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 5. Simulation route - Completes the next match with a random or user-specified score
app.post('/api/simulate-match', (req, res) => {
  try {
    const nextMatchInfo = scoreManager.getNextMatch();
    if (!nextMatchInfo || !nextMatchInfo.match || scoreManager.isMatchFinished(nextMatchInfo.match)) {
      return res.status(400).json({ error: 'No matches left to simulate.' });
    }
    
    const games = JSON.parse(fs.readFileSync(scoreManager.GAMES_PATH, 'utf8'));
    
    // Find index of this match in the main array
    const matchId = nextMatchInfo.match.fixture.id;
    const matchIndexInGames = games.findIndex(g => g.fixture.id === matchId);
    
    if (matchIndexInGames === -1) {
      return res.status(404).json({ error: 'Match not found in games list.' });
    }
    
    // Parse specified goals if provided
    let homeGoals;
    let awayGoals;
    
    const reqHome = req.body.homeGoals;
    const reqAway = req.body.awayGoals;
    
    if (reqHome !== undefined && reqHome !== null && reqHome !== '' &&
        reqAway !== undefined && reqAway !== null && reqAway !== '') {
      const parsedHome = parseInt(reqHome, 10);
      const parsedAway = parseInt(reqAway, 10);
      
      if (!isNaN(parsedHome) && parsedHome >= 0 && !isNaN(parsedAway) && parsedAway >= 0) {
        homeGoals = parsedHome;
        awayGoals = parsedAway;
      }
    }
    
    // Fallback to random simulation (home: 0-4, away: 0-4) if not specified or invalid
    if (homeGoals === undefined || awayGoals === undefined) {
      homeGoals = Math.floor(Math.random() * 5);
      awayGoals = Math.floor(Math.random() * 5);
    }
    
    games[matchIndexInGames].goals = { home: homeGoals, away: awayGoals };
    games[matchIndexInGames].score = {
      fulltime: { home: homeGoals, away: awayGoals }
    };
    games[matchIndexInGames].fixture.status = {
      long: "Match Finished",
      short: "FT"
    };
    
    // Save updated games
    fs.writeFileSync(scoreManager.GAMES_PATH, JSON.stringify(games, null, 2), 'utf8');
    
    // Re-calculate scores
    scoreManager.updateScores();
    
    res.json({
      success: true,
      message: `Simulated match: ${nextMatchInfo.match.teams.home.name} ${homeGoals} - ${awayGoals} ${nextMatchInfo.match.teams.away.name}`,
      match: games[matchIndexInGames]
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 6. Get all matches sorted chronologically
app.get('/api/matches', (req, res) => {
  try {
    const games = JSON.parse(fs.readFileSync(scoreManager.GAMES_PATH, 'utf8'));
    const sortedGames = [...games].sort((a, b) => {
      if (a.fixture.timestamp !== b.fixture.timestamp) {
        return a.fixture.timestamp - b.fixture.timestamp;
      }
      return a.fixture.id - b.fixture.id;
    });
    res.json(sortedGames);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 7. Update match result manually
app.post('/api/update-match', (req, res) => {
  try {
    const { matchId, homeGoals, awayGoals, status } = req.body;
    
    if (matchId === undefined) {
      return res.status(400).json({ error: 'Match ID is required' });
    }
    
    const games = JSON.parse(fs.readFileSync(scoreManager.GAMES_PATH, 'utf8'));
    const matchIndex = games.findIndex(g => g.fixture.id === parseInt(matchId, 10));
    
    if (matchIndex === -1) {
      return res.status(404).json({ error: 'Match not found' });
    }
    
    if (status === 'NS') {
      games[matchIndex].goals = { home: null, away: null };
      games[matchIndex].score = { fulltime: { home: null, away: null } };
      games[matchIndex].fixture.status = { long: "Not Started", short: "NS" };
    } else {
      const parsedHome = parseInt(homeGoals, 10);
      const parsedAway = parseInt(awayGoals, 10);
      
      if (isNaN(parsedHome) || parsedHome < 0 || isNaN(parsedAway) || parsedAway < 0) {
        return res.status(400).json({ error: 'Invalid goals specified. They must be non-negative numbers.' });
      }
      
      games[matchIndex].goals = { home: parsedHome, away: parsedAway };
      games[matchIndex].score = { fulltime: { home: parsedHome, away: parsedAway } };
      games[matchIndex].fixture.status = { long: "Match Finished", short: "FT" };
    }
    
    fs.writeFileSync(scoreManager.GAMES_PATH, JSON.stringify(games, null, 2), 'utf8');
    scoreManager.updateScores();
    
    res.json({
      success: true,
      message: `Updated match: ${games[matchIndex].teams.home.name} vs ${games[matchIndex].teams.away.name}`,
      match: games[matchIndex]
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 8. Recalculate scores manually
app.post('/api/recalculate', (req, res) => {
  try {
    const updatedPlayers = scoreManager.updateScores();
    res.json({
      success: true,
      message: 'Classifica ricalcolata con successo.',
      players: updatedPlayers
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Fallback to index.html for undefined routes (supporting routing if needed)
app.get('/*splat', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`FIFA Score Server running on port ${PORT}`);
  console.log(`URL: http://localhost:${PORT}`);
});
