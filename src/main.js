import { rawMatches } from './data/matches.js';
import { tmt } from './data/tmt.js';
import { predictMatch, formatRachaHTML } from './data/predictor.js';
import fallbackRealScores from './data/real-scores.json';
import { teamDetails } from './data/team-details.js';

// --- State Store ---
export const state = {
  matches: {}, // matchId -> { homeScore: null, awayScore: null, winnerOverride: null }
  timezone: 'auto', // 'auto' or explicit timezone string
  activeTab: 'portada', // 'portada', 'ingreso', 'grupos', 'fase-final'
  groupStandings: {}, // groupLetter -> array of team standings
  bestThirds: [], // array of ranked third place teams
  resolvedKnockoutMatches: {}, // matchId -> { team1, team2, winner, isTied }
  favorites: [], // list of favorite team names (uppercase)
  filters: {
    view: 'all', // 'all' | 'favorites'
    selectedTeam: 'all' // 'all' | specific team name (raw)
  },
  realScores: {}, // matchId -> { homeScore, awayScore, played }
  prodePoints: 0,
  prodeExacts: 0,
  prodeOutcome: 0,
  prodeTotalPlayed: 0,
  expandedMatches: new Set() // set of matchIds currently expanded to show details
};

// --- Team Flags Map ---
const teamFlags = {
  'ALEMANIA': '🇩🇪',
  'ARABIA SAUDITA': '🇸🇦',
  'ARGELIA': '🇩🇿',
  'ARGENTINA': '🇦🇷',
  'AUSTRALIA': '🇦🇺',
  'AUSTRIA': '🇦🇹',
  'BOSNIA Y HERZEG.': '🇧🇦',
  'BRASIL': '🇧🇷',
  'BÉLGICA': '🇧🇪',
  'CABO VERDE': '🇨🇻',
  'CANADÁ': '🇨🇦',
  'CATAR': '🇶🇦',
  'COLOMBIA': '🇨🇴',
  'COREA DEL SUR': '🇰🇷',
  'COSTA DE MARFIL': '🇨🇮',
  'CROACIA': '🇭🇷',
  'CURAZAO': '🇨🇼',
  'ECUADOR': '🇪🇨',
  'EGIPTO': '🇪🇬',
  'ESCOCIA': '🏴󠁧󠁢󠁳󠁣󠁴󠁿',
  'ESPAÑA': '🇪🇸',
  'ESTADOS UNIDOS': '🇺🇸',
  'FRANCIA': '🇫🇷',
  'GHANA': '🇬🇭',
  'HAITÍ': '🇭🇹',
  'INGLATERRA': '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
  'IRAK': '🇮🇶',
  'IRÁN': '🇮🇷',
  'JAPÓN': '🇯🇵',
  'JORDANIA': '🇯🇴',
  'MARRUECOS': '🇲🇦',
  'MÉXICO': '🇲🇽',
  'NORUEGA': '🇳🇴',
  'NUEVA ZELANDA': '🇳🇿',
  'PANAMÁ': '🇵🇦',
  'PARAGUAY': '🇵🇾',
  'PAÍSES BAJOS': '🇳🇱',
  'PORTUGAL': '🇵🇹',
  'REP. CHECA': '🇨🇿',
  'REP. DEL CONGO': '🇨🇬',
  'SENEGAL': '🇸🇳',
  'SUDÁFRICA': '🇿🇦',
  'SUECIA': '🇸🇪',
  'SUIZA': '🇨🇭',
  'TURQUÍA': '🇹🇷',
  'TÚNEZ': '🇹🇳',
  'URUGUAY': '🇺🇾',
  'UZBEKISTÁN': '🇺🇿'
};

export function getTeamFlagAndName(teamName) {
  if (!teamName) return '';
  const cleanName = teamName.trim().toUpperCase();
  const flag = teamFlags[cleanName];
  return flag ? `${flag} ${teamName}` : teamName;
}

export function getTeamDisplayName(teamName) {
  if (!teamName) return '';
  const cleanName = teamName.trim().toUpperCase();
  const flag = teamFlags[cleanName];
  if (!flag) return teamName;
  
  const isFav = state.favorites.includes(cleanName);
  const favClass = isFav ? 'active' : '';
  
  return `
    <span class="team-display">
      <button class="fav-btn ${favClass}" onclick="event.stopPropagation(); toggleFavorite('${cleanName}')" title="Marcar como favorito">${isFav ? '★' : '☆'}</button>
      <span class="flag-emoji">${flag}</span>
      <span class="team-label">${teamName}</span>
    </span>
  `;
}

// Window level helper to toggle favorite status
window.toggleFavorite = function(teamName) {
  const cleanName = teamName.trim().toUpperCase();
  const idx = state.favorites.indexOf(cleanName);
  if (idx === -1) {
    state.favorites.push(cleanName);
  } else {
    state.favorites.splice(idx, 1);
  }
  saveState();
  renderActiveTab();
};

// --- Group Definitions ---
export const groupTeams = {};

export function initializeGroupTeams() {
  const groups = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];
  groups.forEach(g => {
    groupTeams[g] = [];
  });
  
  rawMatches.forEach(m => {
    if (m.group && m.group.startsWith('Grupo ')) {
      const gLetter = m.group.split(' ')[1];
      if (groups.includes(gLetter)) {
        if (!groupTeams[gLetter].includes(m.team1)) groupTeams[gLetter].push(m.team1);
        if (!groupTeams[gLetter].includes(m.team2)) groupTeams[gLetter].push(m.team2);
      }
    }
  });
}

// --- Persistence Helpers ---
export function loadState() {
  try {
    const saved = localStorage.getItem('world_cup_2026_state');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed) {
        state.matches = parsed.matches || {};
        state.timezone = parsed.timezone || 'auto';
        state.activeTab = parsed.activeTab || 'portada';
        state.favorites = parsed.favorites || [];
        state.filters = parsed.filters || { view: 'all', selectedTeam: 'all' };
        
        // Ensure all matches exist in state.matches
        rawMatches.forEach(m => {
          if (!state.matches[m.id]) {
            state.matches[m.id] = { homeScore: null, awayScore: null, winnerOverride: null };
          }
        });
      }
    } else {
      rawMatches.forEach(m => {
        state.matches[m.id] = { homeScore: null, awayScore: null, winnerOverride: null };
      });
    }
  } catch (e) {
    console.error('Error loading state from localStorage:', e);
    rawMatches.forEach(m => {
      state.matches[m.id] = { homeScore: null, awayScore: null, winnerOverride: null };
    });
  }
}

export function saveState() {
  try {
    localStorage.setItem('world_cup_2026_state', JSON.stringify({
      matches: state.matches,
      timezone: state.timezone,
      activeTab: state.activeTab,
      favorites: state.favorites,
      filters: state.filters
    }));
  } catch (e) {
    console.error('Error saving state to localStorage:', e);
  }
}

// --- Timezone Conversion Helper ---
export function formatMatchDateTime(dateStr, timeStr) {
  if (!dateStr || !timeStr) return { date: '', time: '' };
  
  // Format Eastern Time/New York as base date representation
  const dtStr = `${dateStr}T${timeStr}`;
  const d = new Date(dtStr);
  if (isNaN(d.getTime())) return { date: dateStr, time: timeStr };
  
  const tz = state.timezone === 'auto' ? Intl.DateTimeFormat().resolvedOptions().timeZone : state.timezone;
  
  try {
    const formatterDate = new Intl.DateTimeFormat('es-AR', {
      timeZone: tz,
      weekday: 'long',
      day: 'numeric',
      month: 'long'
    });
    const formatterTime = new Intl.DateTimeFormat('es-AR', {
      timeZone: tz,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
    
    return {
      date: capitalizeFirst(formatterDate.format(d)),
      time: formatterTime.format(d)
    };
  } catch (e) {
    return { date: dateStr, time: timeStr };
  }
}

function capitalizeFirst(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// --- Recalculation Engine ---
export function recalculateTournament() {
  // 1. Calculate Group Standings
  const groups = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];
  state.groupStandings = {};
  
  groups.forEach(gLetter => {
    const teams = groupTeams[gLetter] || [];
    const standings = teams.map(team => ({
      name: team,
      pj: 0, pg: 0, pe: 0, pp: 0, gf: 0, gc: 0, dg: 0, pts: 0,
      initialOrder: teams.indexOf(team)
    }));
    
    const groupMatches = rawMatches.filter(m => m.group === `Grupo ${gLetter}`);
    
    groupMatches.forEach(m => {
      const pred = state.matches[m.id];
      if (pred && pred.homeScore !== null && pred.awayScore !== null && pred.homeScore !== '' && pred.awayScore !== '') {
        const hs = parseInt(pred.homeScore);
        const as = parseInt(pred.awayScore);
        
        const homeTeam = standings.find(t => t.name === m.team1);
        const awayTeam = standings.find(t => t.name === m.team2);
        
        if (homeTeam && awayTeam) {
          homeTeam.pj += 1;
          awayTeam.pj += 1;
          homeTeam.gf += hs;
          awayTeam.gf += as;
          homeTeam.gc += as;
          awayTeam.gc += hs;
          
          if (hs > as) {
            homeTeam.pg += 1;
            homeTeam.pts += 3;
            awayTeam.pp += 1;
          } else if (hs < as) {
            awayTeam.pg += 1;
            awayTeam.pts += 3;
            homeTeam.pp += 1;
          } else {
            homeTeam.pe += 1;
            homeTeam.pts += 1;
            awayTeam.pe += 1;
            awayTeam.pts += 1;
          }
        }
      }
    });
    
    standings.forEach(t => {
      t.dg = t.gf - t.gc;
    });
    
    // Sort Standings: Pts -> GD -> GF -> spreadsheet initial index
    standings.sort((t1, t2) => {
      if (t2.pts !== t1.pts) return t2.pts - t1.pts;
      if (t2.dg !== t1.dg) return t2.dg - t1.dg;
      if (t2.gf !== t1.gf) return t2.gf - t1.gf;
      return t1.initialOrder - t2.initialOrder;
    });
    
    state.groupStandings[gLetter] = standings;
  });
  
  // 2. Compile Third-Place Standings
  const thirds = [];
  groups.forEach(gLetter => {
    const standings = state.groupStandings[gLetter];
    if (standings && standings.length >= 3) {
      const thirdTeam = standings[2];
      thirds.push({
        name: thirdTeam.name,
        group: gLetter,
        pj: thirdTeam.pj,
        pg: thirdTeam.pg,
        pe: thirdTeam.pe,
        pp: thirdTeam.pp,
        gf: thirdTeam.gf,
        gc: thirdTeam.gc,
        dg: thirdTeam.dg,
        pts: thirdTeam.pts
      });
    }
  });
  
  thirds.sort((t1, t2) => {
    if (t2.pts !== t1.pts) return t2.pts - t1.pts;
    if (t2.dg !== t1.dg) return t2.dg - t1.dg;
    if (t2.gf !== t1.gf) return t2.gf - t1.gf;
    return t1.group.localeCompare(t2.group);
  });
  
  state.bestThirds = thirds.map((t, idx) => ({
    ...t,
    rank: idx + 1,
    qualified: idx < 8
  }));
  
  // 3. Resolve Best Thirds Bitmask and Knockout opponents
  const advancingThirds = state.bestThirds.filter(t => t.qualified).map(t => t.group).sort();
  const bitmaskMap = { A: 1, B: 2, C: 4, D: 8, E: 16, F: 32, G: 64, H: 128, I: 256, J: 512, K: 1024, L: 2048 };
  const bitmaskSum = advancingThirds.reduce((sum, g) => sum + (bitmaskMap[g] || 0), 0);
  const thirdsMatchups = tmt[bitmaskSum] || null;
  
  const getTeam = (groupLetter, rank) => {
    const st = state.groupStandings[groupLetter];
    return (st && st[rank - 1]) ? st[rank - 1].name : `Falta ${rank}º ${groupLetter}`;
  };
  
  const getThirdTeamOfGroup = (groupLetter) => {
    return getTeam(groupLetter, 3);
  };
  
  state.resolvedKnockoutMatches = {};
  
  const resolveRoundOf32 = () => {
    const r32Defs = {
      73: { t1: () => getTeam('A', 2), t2: () => getTeam('B', 2) },
      74: { t1: () => getTeam('C', 1), t2: () => getTeam('F', 2) },
      75: { t1: () => getTeam('E', 1), t2: () => thirdsMatchups ? getThirdTeamOfGroup(thirdsMatchups['1E']) : '3º Grupo E/F/G/H' },
      76: { t1: () => getTeam('F', 1), t2: () => getTeam('C', 2) },
      77: { t1: () => getTeam('E', 2), t2: () => getTeam('I', 2) },
      78: { t1: () => getTeam('I', 1), t2: () => thirdsMatchups ? getThirdTeamOfGroup(thirdsMatchups['1I']) : '3º Grupo G/H/I/J' },
      79: { t1: () => getTeam('A', 1), t2: () => thirdsMatchups ? getThirdTeamOfGroup(thirdsMatchups['1A']) : '3º Grupo A/B/C/D' },
      80: { t1: () => getTeam('L', 1), t2: () => thirdsMatchups ? getThirdTeamOfGroup(thirdsMatchups['1L']) : '3º Grupo K/L' },
      81: { t1: () => getTeam('G', 1), t2: () => thirdsMatchups ? getThirdTeamOfGroup(thirdsMatchups['1G']) : '3º Grupo H/I/J/K' },
      82: { t1: () => getTeam('D', 1), t2: () => thirdsMatchups ? getThirdTeamOfGroup(thirdsMatchups['1D']) : '3º Grupo D/E/F/G' },
      83: { t1: () => getTeam('H', 1), t2: () => getTeam('J', 2) },
      84: { t1: () => getTeam('K', 2), t2: () => getTeam('L', 2) },
      85: { t1: () => getTeam('B', 1), t2: () => thirdsMatchups ? getThirdTeamOfGroup(thirdsMatchups['1B']) : '3º Grupo B/C/D/E' },
      86: { t1: () => getTeam('D', 2), t2: () => getTeam('G', 2) },
      87: { t1: () => getTeam('J', 1), t2: () => getTeam('H', 2) },
      88: { t1: () => getTeam('K', 1), t2: () => thirdsMatchups ? getThirdTeamOfGroup(thirdsMatchups['1K']) : '3º Grupo J/K/L' },
    };
    
    Object.keys(r32Defs).forEach(mId => {
      const matchId = parseInt(mId);
      const def = r32Defs[matchId];
      const t1 = def.t1();
      const t2 = def.t2();
      const pred = state.matches[matchId] || { homeScore: null, awayScore: null, winnerOverride: null };
      
      let winner = null;
      let isTied = false;
      
      if (pred.homeScore !== null && pred.awayScore !== null && pred.homeScore !== '' && pred.awayScore !== '') {
        const hs = parseInt(pred.homeScore);
        const as = parseInt(pred.awayScore);
        if (hs > as) {
          winner = t1;
        } else if (hs < as) {
          winner = t2;
        } else {
          isTied = true;
          winner = pred.winnerOverride || null;
        }
      }
      
      state.resolvedKnockoutMatches[matchId] = {
        team1: t1,
        team2: t2,
        winner,
        isTied
      };
    });
  };
  
  resolveRoundOf32();
  
  const getWinner = (matchId) => {
    const rm = state.resolvedKnockoutMatches[matchId];
    return rm ? rm.winner : null;
  };
  
  const getLoser = (matchId) => {
    const rm = state.resolvedKnockoutMatches[matchId];
    if (!rm || !rm.winner) return null;
    return rm.winner === rm.team1 ? rm.team2 : rm.team1;
  };
  
  const resolveStage = (matchDefs) => {
    Object.keys(matchDefs).forEach(mId => {
      const matchId = parseInt(mId);
      const def = matchDefs[matchId];
      const t1 = def.t1();
      const t2 = def.t2();
      const pred = state.matches[matchId] || { homeScore: null, awayScore: null, winnerOverride: null };
      
      let winner = null;
      let isTied = false;
      
      if (t1 && t2 && pred.homeScore !== null && pred.awayScore !== null && pred.homeScore !== '' && pred.awayScore !== '') {
        const hs = parseInt(pred.homeScore);
        const as = parseInt(pred.awayScore);
        if (hs > as) {
          winner = t1;
        } else if (hs < as) {
          winner = t2;
        } else {
          isTied = true;
          winner = pred.winnerOverride || null;
        }
      }
      
      state.resolvedKnockoutMatches[matchId] = {
        team1: t1,
        team2: t2,
        winner,
        isTied
      };
    });
  };
  
  // 4. Resolve Round of 16 (Octavos)
  resolveStage({
    89: { t1: () => getWinner(73), t2: () => getWinner(75) },
    90: { t1: () => getWinner(74), t2: () => getWinner(77) },
    91: { t1: () => getWinner(76), t2: () => getWinner(78) },
    92: { t1: () => getWinner(79), t2: () => getWinner(80) },
    93: { t1: () => getWinner(83), t2: () => getWinner(84) },
    94: { t1: () => getWinner(81), t2: () => getWinner(82) },
    95: { t1: () => getWinner(86), t2: () => getWinner(88) },
    96: { t1: () => getWinner(85), t2: () => getWinner(87) }
  });
  
  // 5. Resolve Quarterfinals (Cuartos)
  resolveStage({
    97: { t1: () => getWinner(89), t2: () => getWinner(90) },
    98: { t1: () => getWinner(93), t2: () => getWinner(94) },
    99: { t1: () => getWinner(91), t2: () => getWinner(92) },
    100: { t1: () => getWinner(95), t2: () => getWinner(96) }
  });
  
  // 6. Resolve Semifinals
  resolveStage({
    101: { t1: () => getWinner(97), t2: () => getWinner(98) },
    102: { t1: () => getWinner(99), t2: () => getWinner(100) }
  });
  
  // 7. Resolve Third Place (Match 103) & Final (Match 104)
  resolveStage({
    103: { t1: () => getLoser(101), t2: () => getLoser(102) },
    104: { t1: () => getWinner(101), t2: () => getWinner(102) }
  });
}

// --- DOM Rendering Engine ---
export function renderActiveTab() {
  // Hide all views
  document.querySelectorAll('.view-container').forEach(v => {
    v.classList.remove('active');
  });
  
  // Show active view
  const activeContainer = document.getElementById(`${state.activeTab}-view`);
  if (activeContainer) {
    activeContainer.classList.add('active');
  }
  
  // Update navbar styling
  document.querySelectorAll('.nav-btn').forEach(btn => {
    if (btn.dataset.tab === state.activeTab) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });
  
  // Run specific view renders
  if (state.activeTab === 'portada') renderPortada();
  if (state.activeTab === 'ingreso') renderIngreso();
  if (state.activeTab === 'grupos') renderGrupos();
  if (state.activeTab === 'fase-final') renderFaseFinal();
}

function renderPortada() {
  const container = document.getElementById('portada-view');
  if (!container) return;
  
  // Count stats
  let totalGoals = 0;
  let matchesPlayed = 0;
  
  Object.keys(state.matches).forEach(mId => {
    const m = state.matches[mId];
    if (m.homeScore !== null && m.awayScore !== null && m.homeScore !== '' && m.awayScore !== '') {
      totalGoals += (parseInt(m.homeScore) + parseInt(m.awayScore));
      matchesPlayed += 1;
    }
  });
  
  // Prode Score Card HTML
  let prodeCard = '';
  if (state.prodeTotalPlayed > 0) {
    const totalAcc = state.prodeExacts + state.prodeOutcome;
    const eff = (totalAcc / state.prodeTotalPlayed * 100).toFixed(0);
    prodeCard = `
      <div class="prode-stats-box glass-panel">
        <h4>🏆 TU RENDIMIENTO PRODE</h4>
        <div class="prode-row">
          <div class="prode-col">
            <span class="prode-val text-gold">${state.prodePoints} <small>pts</small></span>
            <span class="prode-lbl">Puntos Totales</span>
          </div>
          <div class="prode-col">
            <span class="prode-val">${state.prodeExacts}</span>
            <span class="prode-lbl">Exactos (+3)</span>
          </div>
          <div class="prode-col">
            <span class="prode-val">${state.prodeOutcome}</span>
            <span class="prode-lbl">Ganador (+1)</span>
          </div>
          <div class="prode-col">
            <span class="prode-val">${eff}%</span>
            <span class="prode-lbl">Efectividad</span>
          </div>
        </div>
      </div>
    `;
  }
  
  container.innerHTML = `
    <div class="welcome-card glass">
      <h1>Copa Mundial de la FIFA 2026™</h1>
      <p class="subtitle">Simulador de Fixture Interactivo</p>
      <div class="divider"></div>
      
      <div class="stats-grid">
        <div class="stat-card">
          <span class="stat-num">${matchesPlayed} / 104</span>
          <span class="stat-label">Partidos Jugados</span>
        </div>
        <div class="stat-card">
          <span class="stat-num">${totalGoals}</span>
          <span class="stat-label">Goles Anotados</span>
        </div>
        <div class="stat-card">
          <span class="stat-num">${matchesPlayed > 0 ? (totalGoals / matchesPlayed).toFixed(2) : '0.00'}</span>
          <span class="stat-label">Promedio de Gol</span>
        </div>
      </div>
      
      ${prodeCard}
      
      <div class="info-section">
        <h3>Información del Torneo</h3>
        <p>El Mundial de 2026 se jugará con <strong>48 selecciones</strong> divididas en <strong>12 grupos de 4</strong> en Canadá, Estados Unidos y México.</p>
        <p>Los <strong>2 mejores de cada grupo</strong> y los <strong>8 mejores terceros</strong> avanzarán a la nueva ronda de <strong>Dieciseisavos de Final</strong>.</p>
      </div>
    </div>
  `;
}

function renderIngreso() {
  const container = document.getElementById('ingreso-view');
  if (!container) return;
  
  // Compile all unique teams for the team filter selector
  const allTeams = [];
  Object.values(groupTeams).forEach(teams => {
    teams.forEach(t => {
      if (!allTeams.includes(t)) allTeams.push(t);
    });
  });
  allTeams.sort();
  
  // Filter matches based on favorites and selected team
  const filteredMatches = rawMatches.filter(m => {
    const resolved = state.resolvedKnockoutMatches[m.id] || null;
    
    const t1 = (resolved ? resolved.team1 : m.team1) || '';
    const t2 = (resolved ? resolved.team2 : m.team2) || '';
    
    const cleanT1 = t1.trim().toUpperCase();
    const cleanT2 = t2.trim().toUpperCase();
    
    // 1. Favorites filter
    if (state.filters.view === 'favorites') {
      const isT1Fav = state.favorites.includes(cleanT1);
      const isT2Fav = state.favorites.includes(cleanT2);
      if (!isT1Fav && !isT2Fav) return false;
    }
    
    // 2. Specific Team filter
    if (state.filters.selectedTeam !== 'all') {
      if (cleanT1 !== state.filters.selectedTeam && cleanT2 !== state.filters.selectedTeam) {
        return false;
      }
    }
    
    return true;
  });
  
  // Group matches by group/stage header
  const matchesByGroup = {};
  filteredMatches.forEach(m => {
    if (!matchesByGroup[m.group]) {
      matchesByGroup[m.group] = [];
    }
    matchesByGroup[m.group].push(m);
  });
  
  let html = `
    <div class="header-row">
      <h2>Ingreso de Resultados</h2>
      <p>Carga los resultados de todos los partidos del fixture para calcular el torneo en tiempo real.</p>
    </div>
    
    <div class="filter-bar glass">
      <div class="filter-views">
        <button class="filter-btn ${state.filters.view === 'all' ? 'active' : ''}" id="filter-view-all">Todos los Partidos</button>
        <button class="filter-btn ${state.filters.view === 'favorites' ? 'active' : ''}" id="filter-view-favs">⭐ Favoritos</button>
      </div>
      
      <div class="filter-team">
        <label for="team-filter-select" class="filter-select-label">Selección:</label>
        <select id="team-filter-select" class="glass-select">
          <option value="all" ${state.filters.selectedTeam === 'all' ? 'selected' : ''}>Todas</option>
          ${allTeams.map(team => `
            <option value="${team.trim().toUpperCase()}" ${state.filters.selectedTeam === team.trim().toUpperCase() ? 'selected' : ''}>
              ${getTeamFlagAndName(team)}
            </option>
          `).join('')}
        </select>
      </div>
    </div>
    
    <div class="matches-list-container">
  `;
  
  if (filteredMatches.length === 0) {
    html += `
      <div class="empty-matches glass">
        <p>No se encontraron partidos para los filtros aplicados.</p>
      </div>
    `;
  } else {
    Object.keys(matchesByGroup).forEach(groupHeading => {
      html += `
        <div class="stage-section glass">
          <h3 class="stage-title">${groupHeading}</h3>
          <div class="stage-matches">
      `;
      
      matchesByGroup[groupHeading].forEach(m => {
        const pred = state.matches[m.id];
        const resolved = state.resolvedKnockoutMatches[m.id] || null;
        const dt = formatMatchDateTime(m.dateStr, m.timeStr);
        
        let t1Name = m.team1;
        let t2Name = m.team2;
        let isClickableTie = false;
        
        if (resolved) {
          t1Name = resolved.team1 || `Por definir (G${m.id})`;
          t2Name = resolved.team2 || `Por definir (G${m.id})`;
          isClickableTie = resolved.isTied;
        }
        
        const hsVal = pred.homeScore !== null ? pred.homeScore : '';
        const asVal = pred.awayScore !== null ? pred.awayScore : '';
        
        const t1Class = (resolved && resolved.winner === t1Name && resolved.winner) ? 'winner' : '';
        const t2Class = (resolved && resolved.winner === t2Name && resolved.winner) ? 'winner' : '';
        
        // Mapear el resultado real
        const real = state.realScores[m.id] || { homeScore: null, awayScore: null, played: false };
        let realBadgeHtml = '';
        let cardClass = '';
        
        if (real.played) {
          const rhs = parseInt(real.homeScore);
          const ras = parseInt(real.awayScore);
          
          let pointsLabel = '0 pts';
          let badgeClass = 'prode-fail';
          cardClass = 'match-card-fail';
          
          if (pred.homeScore !== null && pred.awayScore !== null && pred.homeScore !== '' && pred.awayScore !== '') {
            const phs = parseInt(pred.homeScore);
            const pas = parseInt(pred.awayScore);
            
            if (phs === rhs && pas === ras) {
              pointsLabel = '+3 pts (Exacto)';
              badgeClass = 'prode-exact';
              cardClass = 'match-card-exact';
            } else {
              const predDiff = phs - pas;
              const realDiff = rhs - ras;
              if ((predDiff > 0 && realDiff > 0) || (predDiff < 0 && realDiff < 0) || (predDiff === 0 && realDiff === 0)) {
                pointsLabel = '+1 pt (Acierto)';
                badgeClass = 'prode-outcome';
                cardClass = 'match-card-outcome';
              }
            }
          }
          
          realBadgeHtml = `
            <div class="real-score-badge-row">
              <span class="real-score-label">Resultado Real: <strong>${rhs} - ${ras}</strong></span>
              <span class="prode-points-badge ${badgeClass}">${pointsLabel}</span>
            </div>
          `;
        }
        
        // Predict match probabilities and score
        const predInfo = predictMatch(t1Name, t2Name);
        const hasPred = predInfo.score1 !== '-';
        
        html += `
          <div class="match-card ${cardClass}" data-match-id="${m.id}">
            <div class="match-meta">
              <span class="match-num">Partido #${m.id}</span>
              <span class="match-date">${dt.date} - ${dt.time} hs</span>
              <span class="match-stadium">${m.stadiumAbbrev}</span>
            </div>
            
            <div class="match-teams-row">
              <div class="team-col team-home ${t1Class}">
                <span class="team-name">${getTeamDisplayName(t1Name)}</span>
              </div>
              
              <div class="score-col">
                <input type="number" min="0" class="score-input home-input" data-match-id="${m.id}" value="${hsVal}" placeholder="-" />
                <span class="score-sep">-</span>
                <input type="number" min="0" class="score-input away-input" data-match-id="${m.id}" value="${asVal}" placeholder="-" />
              </div>
              
              <div class="team-col team-away ${t2Class}">
                <span class="team-name">${getTeamDisplayName(t2Name)}</span>
              </div>
            </div>
        `;
        
        // If draw resolution is needed, render buttons
        if (isClickableTie) {
          html += `
            <div class="draw-resolution-box">
              <p>Partido empatado. Seleccioná el equipo que avanza a la siguiente ronda:</p>
              <div class="draw-btns">
                <button class="draw-btn ${pred.winnerOverride === t1Name ? 'selected' : ''}" data-match-id="${m.id}" data-winner="${t1Name}">${getTeamFlagAndName(t1Name)}</button>
                <button class="draw-btn ${pred.winnerOverride === t2Name ? 'selected' : ''}" data-match-id="${m.id}" data-winner="${t2Name}">${getTeamFlagAndName(t2Name)}</button>
              </div>
            </div>
          `;
        }
        
        // Prediction Widget (solo si el partido no se jugó)
        if (hasPred && !real.played) {
          html += `
            <div class="match-predictions glass-panel">
              <div class="predictions-header">
                <span class="pred-title">Predicción (Historial & Elo)</span>
                <span class="pred-score">Sugerido: <strong>${predInfo.score1} - ${predInfo.score2}</strong></span>
              </div>
              
              <div class="prob-bar-container">
                <div class="prob-segment win1-seg" style="width: ${predInfo.win1}%" title="Ganará ${t1Name}: ${predInfo.win1}%">
                  <span class="prob-val">${predInfo.win1}%</span>
                </div>
                <div class="prob-segment draw-seg" style="width: ${predInfo.draw}%" title="Empate: ${predInfo.draw}%">
                  <span class="prob-val">${predInfo.draw}%</span>
                </div>
                <div class="prob-segment win2-seg" style="width: ${predInfo.win2}%" title="Ganará ${t2Name}: ${predInfo.win2}%">
                  <span class="prob-val">${predInfo.win2}%</span>
                </div>
              </div>
              
              <div class="rachas-row">
                <div class="team-racha">
                  <span class="racha-label">Racha:</span>
                  ${formatRachaHTML(predInfo.racha1)}
                </div>
                <div class="team-racha">
                  <span class="racha-label">Racha:</span>
                  ${formatRachaHTML(predInfo.racha2)}
                </div>
              </div>
            </div>
          `;
        }
        
        // Badge de resultado real (si el partido ya finalizó)
        if (real.played) {
          html += realBadgeHtml;
        }
        
        // Ficha de Detalle de Selecciones (Plantilla, DT, Historial)
        const det1 = teamDetails[t1Name.trim().toUpperCase()];
        const det2 = teamDetails[t2Name.trim().toUpperCase()];
        if (det1 || det2) {
          const isExpanded = state.expandedMatches.has(m.id);
          const activeClass = isExpanded ? 'active' : '';
          
          html += `
            <div class="match-details-drawer ${activeClass}">
              <div class="drawer-grid">
                <div class="drawer-team-col">
                  <h5>${t1Name}</h5>
                  <p><strong>DT:</strong> ${det1 ? det1.dt : 'Por definir'}</p>
                  <p><strong>Figura:</strong> ${det1 ? det1.figura : 'Por definir'}</p>
                  <p><strong>Historial:</strong> ${det1 ? det1.historial : 'N/A'}</p>
                  <div class="drawer-squad">
                    <strong>Plantilla convocada:</strong>
                    <ul>
                      ${det1 ? det1.plantilla.map(p => `<li>${p}</li>`).join('') : '<li>No disponible</li>'}
                    </ul>
                  </div>
                </div>
                <div class="drawer-divider"></div>
                <div class="drawer-team-col">
                  <h5>${t2Name}</h5>
                  <p><strong>DT:</strong> ${det2 ? det2.dt : 'Por definir'}</p>
                  <p><strong>Figura:</strong> ${det2 ? det2.figura : 'Por definir'}</p>
                  <p><strong>Historial:</strong> ${det2 ? det2.historial : 'N/A'}</p>
                  <div class="drawer-squad">
                    <strong>Plantilla convocada:</strong>
                    <ul>
                      ${det2 ? det2.plantilla.map(p => `<li>${p}</li>`).join('') : '<li>No disponible</li>'}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          `;
        }
        
        html += `</div>`;
      });
      
      html += `</div></div>`;
    });
  }
  
  html += `</div></div></div>`;
  container.innerHTML = html;
  
  // Bind events
  container.querySelectorAll('.match-card').forEach(card => {
    card.addEventListener('click', e => {
      // Don't toggle drawer if clicking input, fav button, draw button or anything inside them
      if (e.target.closest('.score-input') || e.target.closest('.fav-btn') || e.target.closest('.draw-btn')) {
        return;
      }
      
      const matchId = parseInt(card.dataset.matchId);
      const drawer = card.querySelector('.match-details-drawer');
      if (drawer) {
        const isExpanded = drawer.classList.contains('active');
        if (isExpanded) {
          state.expandedMatches.delete(matchId);
          drawer.classList.remove('active');
        } else {
          state.expandedMatches.add(matchId);
          drawer.classList.add('active');
        }
      }
    });
  });

  const viewAllBtn = container.querySelector('#filter-view-all');
  if (viewAllBtn) {
    viewAllBtn.addEventListener('click', () => {
      state.filters.view = 'all';
      saveState();
      renderIngreso();
    });
  }
  
  const viewFavsBtn = container.querySelector('#filter-view-favs');
  if (viewFavsBtn) {
    viewFavsBtn.addEventListener('click', () => {
      state.filters.view = 'favorites';
      saveState();
      renderIngreso();
    });
  }
  
  const teamSelect = container.querySelector('#team-filter-select');
  if (teamSelect) {
    teamSelect.addEventListener('change', (e) => {
      state.filters.selectedTeam = e.target.value;
      saveState();
      renderIngreso();
    });
  }
  
  container.querySelectorAll('.score-input').forEach(input => {
    input.addEventListener('input', e => {
      const matchId = parseInt(e.target.dataset.matchId);
      const isHome = e.target.classList.contains('home-input');
      const val = e.target.value;
      
      if (!state.matches[matchId]) {
        state.matches[matchId] = { homeScore: null, awayScore: null, winnerOverride: null };
      }
      
      if (isHome) {
        state.matches[matchId].homeScore = val !== '' ? parseInt(val) : null;
      } else {
        state.matches[matchId].awayScore = val !== '' ? parseInt(val) : null;
      }
      
      state.matches[matchId].winnerOverride = null;
      
      recalculateTournament();
      calculateProdeStats();
      saveState();
      
      debounce(() => {
        renderIngreso();
        // Re-renderizar portada para actualizar puntos
        const navPortada = document.getElementById('nav-portada');
        if (navPortada && state.activeTab === 'portada') renderPortada();
      }, 800)();
    });
  });
  
  container.querySelectorAll('.draw-btn').forEach(btn => {
    btn.addEventListener('click', e => {
      const matchId = parseInt(e.target.dataset.matchId);
      const winner = e.target.dataset.winner;
      
      state.matches[matchId].winnerOverride = winner;
      
      recalculateTournament();
      calculateProdeStats();
      saveState();
      renderIngreso();
    });
  });
}

function renderGrupos() {
  const container = document.getElementById('grupos-view');
  if (!container) return;
  
  const groups = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];
  let html = `
    <div class="header-row">
      <h2>Fase de Grupos</h2>
      <p>Consultá las tablas de posiciones y partidos de cada grupo del mundial.</p>
    </div>
    <div class="groups-grid">
  `;
  
  groups.forEach(gLetter => {
    const standings = state.groupStandings[gLetter] || [];
    const groupMatches = rawMatches.filter(m => m.group === `Grupo ${gLetter}`);
    
    html += `
      <div class="group-card glass">
        <h3>Grupo ${gLetter}</h3>
        
        <table class="standings-table">
          <thead>
            <tr>
              <th>Pos</th>
              <th class="team-th">Equipo</th>
              <th>PJ</th>
              <th>GF</th>
              <th>GC</th>
              <th>DG</th>
              <th>Pts</th>
            </tr>
          </thead>
          <tbody>
    `;
    
    standings.forEach((t, idx) => {
      let rankClass = '';
      if (idx < 2) rankClass = 'rank-qualified'; // Top 2
      else if (idx === 2) rankClass = 'rank-third'; // 3rd place candidate
      
      html += `
        <tr class="${rankClass}">
          <td class="pos-col">${idx + 1}</td>
          <td class="team-name-col">${getTeamDisplayName(t.name)}</td>
          <td>${t.pj}</td>
          <td>${t.gf}</td>
          <td>${t.gc}</td>
          <td>${t.dg >= 0 ? '+' + t.dg : t.dg}</td>
          <td class="pts-col">${t.pts}</td>
        </tr>
      `;
    });
    
    html += `
          </tbody>
        </table>
        
        <div class="group-matches-list">
          <h4>Partidos</h4>
    `;
    
    groupMatches.forEach(m => {
      const pred = state.matches[m.id];
      const hs = pred.homeScore !== null && pred.homeScore !== '' ? pred.homeScore : '-';
      const as = pred.awayScore !== null && pred.awayScore !== '' ? pred.awayScore : '-';
      
      html += `
        <div class="group-match-row">
          <span class="gm-team">${getTeamDisplayName(m.team1)}</span>
          <span class="gm-score">${hs} - ${as}</span>
          <span class="gm-team">${getTeamDisplayName(m.team2)}</span>
        </div>
      `;
    });
    
    html += `
        </div>
      </div>
    `;
  });
  
  html += `</div>`;
  container.innerHTML = html;
}

function renderFaseFinal() {
  const container = document.getElementById('fase-final-view');
  if (!container) return;
  
  let html = `
    <div class="header-row">
      <h2>Llaves y Fase Final</h2>
      <p>Visualizá la tabla de mejores terceros y el desarrollo del bracket de eliminación directa.</p>
    </div>
    
    <div class="best-thirds-section glass">
      <h3>Tabla de Mejores Terceros</h3>
      <table class="thirds-table">
        <thead>
          <tr>
            <th>Pos</th>
            <th>Grupo</th>
            <th>Equipo</th>
            <th>PJ</th>
            <th>GF</th>
            <th>GC</th>
            <th>DG</th>
            <th>Pts</th>
            <th>Estado</th>
          </tr>
        </thead>
        <tbody>
  `;
  
  state.bestThirds.forEach(t => {
    html += `
      <tr class="${t.qualified ? 'third-ok' : 'third-eliminated'}">
          <td>${t.rank}</td>
          <td>Grupo ${t.group}</td>
          <td class="team-th">${getTeamDisplayName(t.name)}</td>
          <td>${t.pj}</td>
          <td>${t.gf}</td>
          <td>${t.gc}</td>
          <td>${t.dg >= 0 ? '+' + t.dg : t.dg}</td>
          <td class="pts-col">${t.pts}</td>
          <td><span class="badge">${t.qualified ? 'Clasificado' : 'Eliminado'}</span></td>
        </tr>
    `;
  });
  
  html += `
        </tbody>
      </table>
    </div>
    
    <div class="bracket-wrapper">
      <h3>Bracket de Fase de Eliminación Directa</h3>
      <div class="bracket-grid">
  `;
  
  // Render Brackets Column by Column
  const stages = [
    { title: 'Dieciseisavos de Final', matches: [73, 74, 75, 76, 77, 78, 79, 80, 81, 82, 83, 84, 85, 86, 87, 88] },
    { title: 'Octavos de Final', matches: [89, 90, 91, 92, 93, 94, 95, 96] },
    { title: 'Cuartos de Final', matches: [97, 98, 99, 100] },
    { title: 'Semifinales', matches: [101, 102] },
    { title: 'Final y 3º Puesto', matches: [104, 103] }
  ];
  
  stages.forEach(stage => {
    html += `
      <div class="bracket-col">
        <h4 class="bracket-stage-title">${stage.title}</h4>
        <div class="bracket-matches">
    `;
    
    stage.matches.forEach(mId => {
      const rm = state.resolvedKnockoutMatches[mId];
      const pred = state.matches[mId];
      const dt = formatMatchDateTime(rawMatches.find(m => m.id === mId).dateStr, rawMatches.find(m => m.id === mId).timeStr);
      
      const t1 = rm ? rm.team1 : `Ganador ${mId}`;
      const t2 = rm ? rm.team2 : `Ganador ${mId}`;
      
      const hs = pred.homeScore !== null && pred.homeScore !== '' ? pred.homeScore : '-';
      const as = pred.awayScore !== null && pred.awayScore !== '' ? pred.awayScore : '-';
      
      const isFinal = mId === 104;
      const isThirdPlace = mId === 103;
      
      let titleLabel = `Partido #${mId}`;
      if (isFinal) titleLabel = '★ GRAN FINAL ★';
      if (isThirdPlace) titleLabel = 'Tercer Puesto';
      
      const t1WinnerClass = (rm && rm.winner && rm.winner === t1) ? 'bracket-winner' : '';
      const t2WinnerClass = (rm && rm.winner && rm.winner === t2) ? 'bracket-winner' : '';
      
      html += `
        <div class="bracket-match-card glass">
          <div class="bm-title">${titleLabel}</div>
          <div class="bm-meta">${dt.date} - ${dt.time}hs</div>
          
          <div class="bm-team-row ${t1WinnerClass}">
            <span class="bm-team-name">${getTeamDisplayName(t1)}</span>
            <span class="bm-team-score">${hs}</span>
          </div>
          <div class="bm-team-row ${t2WinnerClass}">
            <span class="bm-team-name">${getTeamDisplayName(t2)}</span>
            <span class="bm-team-score">${as}</span>
          </div>
      `;
      
      // If draw resolution is needed and we are in bracket tab, allow resolving it here too!
      if (rm && rm.isTied) {
        html += `
          <div class="bm-resolver">
            <button class="bm-res-btn" onclick="resolveBracketTie(${mId}, '${t1}')">🏆 ${getTeamFlagAndName(t1)}</button>
            <button class="bm-res-btn" onclick="resolveBracketTie(${mId}, '${t2}')">🏆 ${getTeamFlagAndName(t2)}</button>
          </div>
        `;
      }
      
      html += `</div>`;
    });
    
    html += `</div></div>`;
  });
  
  html += `</div></div>`;
  container.innerHTML = html;
}

// Window level helper to resolve ties from bracket clicks
window.resolveBracketTie = function(matchId, winnerName) {
  state.matches[matchId].winnerOverride = winnerName;
  recalculateTournament();
  saveState();
  renderFaseFinal();
};

// --- Debounce Helper for Text Input ---
let debounceTimeout;
function debounce(func, delay) {
  return function(...args) {
    clearTimeout(debounceTimeout);
    debounceTimeout = setTimeout(() => {
      func.apply(this, args);
    }, delay);
  };
}

// --- Timezone Populate ---
function populateTimezones() {
  const select = document.getElementById('timezone-select');
  if (!select) return;
  
  const tzs = [
    { value: 'auto', label: 'Detectar automáticamente' },
    { value: 'America/Argentina/Buenos_Aires', label: 'Argentina (UTC-3)' },
    { value: 'America/Santiago', label: 'Chile (UTC-4)' },
    { value: 'America/Bogota', label: 'Colombia (UTC-5)' },
    { value: 'America/Mexico_City', label: 'México (UTC-6)' },
    { value: 'Europe/Madrid', label: 'España (UTC+2)' },
    { value: 'America/New_York', label: 'Estados Unidos (Este - UTC-4)' },
    { value: 'America/Los_Angeles', label: 'Estados Unidos (Pacífico - UTC-7)' },
    { value: 'UTC', label: 'Hora UTC (Greenwich)' }
  ];
  
  select.innerHTML = tzs.map(tz => `
    <option value="${tz.value}" ${state.timezone === tz.value ? 'selected' : ''}>${tz.label}</option>
  `).join('');
  
  select.addEventListener('change', e => {
    state.timezone = e.target.value;
    saveState();
    renderActiveTab();
  });
}

// --- Prode Score Calculations ---
export function calculateProdeStats() {
  let points = 0;
  let exacts = 0;
  let outcomes = 0;
  let totalPlayed = 0;
  
  Object.keys(state.realScores).forEach(mId => {
    const matchId = parseInt(mId);
    const real = state.realScores[matchId];
    
    if (real && real.played) {
      totalPlayed += 1;
      const pred = state.matches[matchId];
      
      if (pred && pred.homeScore !== null && pred.awayScore !== null && pred.homeScore !== '' && pred.awayScore !== '') {
        const phs = parseInt(pred.homeScore);
        const pas = parseInt(pred.awayScore);
        const rhs = parseInt(real.homeScore);
        const ras = parseInt(real.awayScore);
        
        // Exact match check (+3 pts)
        if (phs === rhs && pas === ras) {
          points += 3;
          exacts += 1;
        } else {
          // Outcome check (winner/draw) (+1 pt)
          const predDiff = phs - pas;
          const realDiff = rhs - ras;
          
          if ((predDiff > 0 && realDiff > 0) || (predDiff < 0 && realDiff < 0) || (predDiff === 0 && realDiff === 0)) {
            points += 1;
            outcomes += 1;
          }
        }
      }
    }
  });
  
  state.prodePoints = points;
  state.prodeExacts = exacts;
  state.prodeOutcome = outcomes;
  state.prodeTotalPlayed = totalPlayed;
}

// --- Fetch Real Scores from API with local Fallback ---
export async function fetchRealScores() {
  // 1. Initialize fallback scores first
  state.realScores = { ...fallbackRealScores };
  
  try {
    // We try to fetch the community worldcup json endpoint or an open-source mirror
    // During 2026 World Cup, this URL will be live. As a backup, we fallback to local file.
    const res = await fetch('https://worldcupjson.net/matches');
    if (!res.ok) throw new Error('API down');
    const apiMatches = await res.json();
    
    const nameMap = {
      'MEXICO': 'MÉXICO',
      'SOUTH AFRICA': 'SUDÁFRICA',
      'SOUTH KOREA': 'COREA DEL SUR',
      'CZECH REPUBLIC': 'REP. CHECA',
      'CANADA': 'CANADÁ',
      'BOSNIA AND HERZEGOVINA': 'BOSNIA Y HERZEG.',
      'USA': 'ESTADOS UNIDOS',
      'UNITED STATES': 'ESTADOS UNIDOS',
      'PARAGUAY': 'PARAGUAY',
      'QATAR': 'CATAR',
      'SWITZERLAND': 'SUIZA',
      'BRAZIL': 'BRASIL',
      'MOROCCO': 'MARRUECOS',
      'HAITI': 'HAITÍ',
      'SCOTLAND': 'ESCOCIA',
      'AUSTRALIA': 'AUSTRALIA',
      'TURKEY': 'TURQUÍA',
      'GERMANY': 'ALEMANIA',
      'CURACAO': 'CURAZAO',
      'SPAIN': 'ESPAÑA',
      'FRANCE': 'FRANCIA',
      'GHANA': 'GHANA',
      'ENGLAND': 'INGLATERRA',
      'IRAQ': 'IRAK',
      'IRAN': 'IRÁN',
      'JAPAN': 'JAPÓN',
      'JORDAN': 'JORDANIA',
      'COLOMBIA': 'COLOMBIA',
      'SENEGAL': 'SENEGAL',
      'NORWAY': 'NORUEGA',
      'NEW ZEALAND': 'NUEVA ZELANDA',
      'PANAMA': 'PANAMÁ',
      'NETHERLANDS': 'PAÍSES BAJOS',
      'PORTUGAL': 'PORTUGAL',
      'REPUBLIC OF CONGO': 'REP. DEL CONGO',
      'CONGO': 'REP. DEL CONGO',
      'SWEDEN': 'SUECIA',
      'TUNISIA': 'TÚNEZ',
      'URUGUAY': 'URUGUAY',
      'UZBEKISTAN': 'UZBEKISTÁN',
      'ARGENTINA': 'ARGENTINA',
      'BELGIUM': 'BÉLGICA',
      'CROATIA': 'CROACIA',
      'ECUADOR': 'ECUADOR',
      'EGYPT': 'EGIPTO',
      'COTE D\'IVOIRE': 'COSTA DE MARFIL',
      'IVORY COAST': 'COSTA DE MARFIL',
      'CABO VERDE': 'CABO VERDE',
      'CAPE VERDE': 'CABO VERDE',
      'AUSTRIA': 'AUSTRIA',
      'ALGERIA': 'ARGELIA'
    };
    
    apiMatches.forEach(apiMatch => {
      if (apiMatch.status === 'completed' || apiMatch.status === 'finished') {
        const homeName = apiMatch.home_team.name.trim().toUpperCase();
        const awayName = apiMatch.away_team.name.trim().toUpperCase();
        
        const translatedHome = nameMap[homeName] || homeName;
        const translatedAway = nameMap[awayName] || awayName;
        
        // Find local match
        const localMatch = rawMatches.find(m => {
          if (m.id <= 72) {
            return (m.team1.trim().toUpperCase() === translatedHome && m.team2.trim().toUpperCase() === translatedAway) ||
                   (m.team1.trim().toUpperCase() === translatedAway && m.team2.trim().toUpperCase() === translatedHome);
          } else {
            const resolved = state.resolvedKnockoutMatches[m.id];
            if (resolved && resolved.team1 && resolved.team2) {
              const resHome = resolved.team1.trim().toUpperCase();
              const resAway = resolved.team2.trim().toUpperCase();
              return (resHome === translatedHome && resAway === translatedAway) ||
                     (resHome === translatedAway && resAway === translatedHome);
            }
            return false;
          }
        });
        
        if (localMatch) {
          const isHomeOriginal = localMatch.team1.trim().toUpperCase() === translatedHome;
          state.realScores[localMatch.id] = {
            homeScore: isHomeOriginal ? apiMatch.home_team.goals : apiMatch.away_team.goals,
            awayScore: isHomeOriginal ? apiMatch.away_team.goals : apiMatch.home_team.goals,
            played: true
          };
        }
      }
    });
    console.log('Successfully loaded scores from API.');
  } catch (e) {
    console.warn('API fetch failed, utilizing local fallbackScores database:', e);
  }
  
  calculateProdeStats();
  renderActiveTab();
}

// --- App Initialization ---
export function initApp() {
  initializeGroupTeams();
  loadState();
  recalculateTournament();
  populateTimezones();
  
  // Set up navbar listeners
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', e => {
      state.activeTab = e.target.dataset.tab;
      saveState();
      renderActiveTab();
    });
  });
  
  // Async fetch real world cup results
  fetchRealScores();
  
  renderActiveTab();
}

// Initialize immediately (module scripts run after DOM is parsed)
initApp();
