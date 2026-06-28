import { rawMatches } from './data/matches.js';
import { tmt } from './data/tmt.js';
import { predictMatch, formatRachaHTML } from './data/predictor.js';
import fallbackRealScores from './data/real-scores.json' with { type: 'json' };
import { teamDetails } from './data/team-details.js';
import { teamRatings } from './data/ratings.js';

// --- State Store ---
export const state = {
  matches: {}, // matchId -> { homeScore: null, awayScore: null, winnerOverride: null }
  timezone: 'auto', // 'auto' or explicit timezone string
  activeTab: 'portada', // 'portada', 'grupos', 'fase-final', 'selecciones'
  groupStandings: {}, // groupLetter -> array of team standings
  bestThirds: [], // array of ranked third place teams
  resolvedKnockoutMatches: {}, // matchId -> { team1, team2, winner, isTied }
  favorites: [], // list of favorite team names (uppercase)
  filters: {
    selectedGroup: 'all', // 'all' | 'A'-'L'
    selectedConf: 'all', // 'all' | specific confederation
    calendarPhase: 'all', // 'all' | 'groups' | 'knockout'
    calendarTeam: 'all', // 'all' | specific team name (uppercase)
    calendarFavoritesOnly: false // boolean
  },
  realScores: {}, // matchId -> { homeScore, awayScore, played }
  prodePoints: 0,
  prodeExacts: 0,
  prodeOutcome: 0,
  prodeTotalPlayed: 0,
  selectedTeamDetails: 'ARGENTINA' // default team to show detail modal for
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
  'ESCOCIA': '🏴&zwj;☠️', // Will display Scotland flag or fallback emoji
  'ESPAÑA': '🇪🇸',
  'ESTADOS UNIDOS': '🇺🇸',
  'FRANCIA': '🇫🇷',
  'GHANA': '🇬🇭',
  'HAITÍ': '🇭🇹',
  'INGLATERRA': '🏴&zwj;☠️',
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

// Handle UK flag lookups specifically
teamFlags['ESCOCIA'] = '🏴󠁧󠁢󠁳󠁣󠁴󠁿';
teamFlags['INGLATERRA'] = '🏴󠁧󠁢󠁥󠁮󠁧󠁿';

const teamConfederations = {
  'MÉXICO': 'CONCACAF', 'SUDÁFRICA': 'CAF', 'COREA DEL SUR': 'AFC', 'REP. CHECA': 'UEFA',
  'CANADÁ': 'CONCACAF', 'SUIZA': 'UEFA', 'CATAR': 'AFC', 'BOSNIA Y HERZEG.': 'UEFA',
  'BRASIL': 'CONMEBOL', 'MARRUECOS': 'CAF', 'HAITÍ': 'CONCACAF', 'ESCOCIA': 'UEFA',
  'ESTADOS UNIDOS': 'CONCACAF', 'PARAGUAY': 'CONMEBOL', 'AUSTRALIA': 'AFC', 'TURQUÍA': 'UEFA',
  'ALEMANIA': 'UEFA', 'CURAZAO': 'CONCACAF', 'COSTA DE MARFIL': 'CAF', 'ECUADOR': 'CONMEBOL',
  'PAÍSES BAJOS': 'UEFA', 'JAPÓN': 'AFC', 'TÚNEZ': 'CAF', 'SUECIA': 'UEFA',
  'BÉLGICA': 'UEFA', 'EGIPTO': 'CAF', 'IRÁN': 'AFC', 'NUEVA ZELANDA': 'OFC',
  'ESPAÑA': 'UEFA', 'CABO VERDE': 'CAF', 'ARABIA SAUDITA': 'AFC', 'URUGUAY': 'CONMEBOL',
  'FRANCIA': 'UEFA', 'SENEGAL': 'CAF', 'NORUEGA': 'UEFA', 'IRAK': 'AFC',
  'ARGENTINA': 'CONMEBOL', 'ARGELIA': 'CAF', 'AUSTRIA': 'UEFA', 'JORDANIA': 'AFC',
  'PORTUGAL': 'UEFA', 'COLOMBIA': 'CONMEBOL', 'UZBEKISTÁN': 'AFC', 'REP. DEL CONGO': 'CAF',
  'INGLATERRA': 'UEFA', 'CROACIA': 'UEFA', 'GHANA': 'CAF', 'PANAMÁ': 'CONCACAF'
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
  return flag ? `${flag} ${teamName}` : teamName;
}

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
  // Deshabilitado por pedido del usuario para evitar conflictos con data vieja
  return;
}

export function saveState() {
  return;
}

// --- Timezone Conversion Helper ---
export function formatMatchDateTime(dateStr, timeStr) {
  if (!dateStr || !timeStr) return { date: '', time: '' };
  
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
      const real = state.realScores[m.id];
      const pred = state.matches[m.id];
      const hasReal = real && real.played;
      const hasPred = pred && pred.homeScore !== null && pred.awayScore !== null;
      
      if (hasReal || hasPred) {
        const hs = parseInt(hasReal ? real.homeScore : pred.homeScore);
        const as = parseInt(hasReal ? real.awayScore : pred.awayScore);
        
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
      const real = state.realScores[matchId] || { played: false, homeScore: null, awayScore: null, winnerOverride: null };
      const pred = state.matches[matchId] || null;
      
      let winner = null;
      let isTied = false;
      
      if (real.played) {
        const hs = parseInt(real.homeScore);
        const as = parseInt(real.awayScore);
        if (hs > as) {
          winner = t1;
        } else if (hs < as) {
          winner = t2;
        } else {
          isTied = true;
          winner = real.winnerOverride || null;
        }
      } else if (pred && pred.homeScore !== null && pred.awayScore !== null && pred.homeScore !== '' && pred.awayScore !== '') {
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
      const real = state.realScores[matchId] || { played: false, homeScore: null, awayScore: null, winnerOverride: null };
      const pred = state.matches[matchId] || null;
      
      let winner = null;
      let isTied = false;
      
      if (t1 && t2) {
        if (real.played) {
          const hs = parseInt(real.homeScore);
          const as = parseInt(real.awayScore);
          if (hs > as) {
            winner = t1;
          } else if (hs < as) {
            winner = t2;
          } else {
            isTied = true;
            winner = real.winnerOverride || null;
          }
        } else if (pred && pred.homeScore !== null && pred.awayScore !== null && pred.homeScore !== '' && pred.awayScore !== '') {
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
  if (state.activeTab === 'calendario') renderCalendario();
  if (state.activeTab === 'grupos') renderGrupos();
  if (state.activeTab === 'fase-final') renderFaseFinal();
  if (state.activeTab === 'selecciones') renderSelecciones();
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
      <div class="prode-stats-box">
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
    <div class="welcome-card">
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

export function getMatchTeamsInfo(matchId) {
  const m = rawMatches.find(x => x.id === matchId);
  if (!m) return { t1Name: '', t2Name: '', t1Flag: '🏳️', t2Flag: '🏳️', t1Label: '', t2Label: '', isUnresolved1: true, isUnresolved2: true };
  
  let t1Name = m.team1;
  let t2Name = m.team2;
  const isKnockout = matchId >= 73 && matchId <= 104;
  
  if (isKnockout) {
    const resolved = state.resolvedKnockoutMatches[matchId];
    if (resolved) {
      t1Name = resolved.team1;
      t2Name = resolved.team2;
    }
  }
  
  const isUnresolved = (name) => {
    return !name || name.startsWith('Falta') || name.startsWith('3º') || name.startsWith('Por definir');
  };
  
  const getSeedText = (mId, side) => {
    const seeds = {
      73: ['2°A', '2°B'], 74: ['1°C', '2°F'], 75: ['1°E', '3°E/F/G/H'], 76: ['1°F', '2°C'],
      77: ['2°E', '2°I'], 78: ['1°I', '3°G/H/I/J'], 79: ['1°A', '3°A/B/C/D'], 80: ['1°L', '3°K/L'],
      81: ['1°G', '3°H/I/J/K'], 82: ['1°D', '3°D/E/F/G'], 83: ['1°H', '2°J'], 84: ['2°K', '2°L'],
      85: ['1°B', '3°B/C/D/E'], 86: ['2°D', '2°G'], 87: ['1°J', '2°H'], 88: ['1°K', '3°J/K/L']
    };
    if (seeds[mId]) {
      return side === 1 ? seeds[mId][0] : seeds[mId][1];
    }
    const matchParents = {
      89: ['Ganador 73', 'Ganador 75'],
      90: ['Ganador 74', 'Ganador 77'],
      91: ['Ganador 76', 'Ganador 78'],
      92: ['Ganador 79', 'Ganador 80'],
      93: ['Ganador 83', 'Ganador 84'],
      94: ['Ganador 81', 'Ganador 82'],
      95: ['Ganador 86', 'Ganador 88'],
      96: ['Ganador 85', 'Ganador 87'],
      97: ['Ganador 89', 'Ganador 90'],
      98: ['Ganador 93', 'Ganador 94'],
      99: ['Ganador 91', 'Ganador 92'],
      100: ['Ganador 95', 'Ganador 96'],
      101: ['Ganador 97', 'Ganador 98'],
      102: ['Ganador 99', 'Ganador 100'],
      103: ['Perdedor 101', 'Perdedor 102'],
      104: ['Ganador 101', 'Ganador 102']
    };
    if (matchParents[mId]) {
      return side === 1 ? matchParents[mId][0] : matchParents[mId][1];
    }
    return '';
  };
  
  const isUn1 = isUnresolved(t1Name);
  const isUn2 = isUnresolved(t2Name);
  
  const t1Label = isUn1 ? getSeedText(matchId, 1) : t1Name;
  const t2Label = isUn2 ? getSeedText(matchId, 2) : t2Name;
  
  const t1Flag = isUn1 ? '🏳️' : (teamFlags[t1Name.toUpperCase()] || '🏳️');
  const t2Flag = isUn2 ? '🏳️' : (teamFlags[t2Name.toUpperCase()] || '🏳️');
  
  return {
    t1Name: isUn1 ? '' : t1Name,
    t2Name: isUn2 ? '' : t2Name,
    t1Label: t1Label || 'Por definir',
    t2Label: t2Label || 'Por definir',
    t1Flag,
    t2Flag,
    isUnresolved1: isUn1,
    isUnresolved2: isUn2
  };
}

export function renderCalendario() {
  const container = document.getElementById('calendario-view');
  if (!container) return;

  const currentPhase = state.filters.calendarPhase || 'all';
  const currentTeam = state.filters.calendarTeam || 'all';
  const favoritesOnly = state.filters.calendarFavoritesOnly || false;

  const allTeamsSet = new Set();
  rawMatches.forEach(m => {
    if (m.team1) allTeamsSet.add(m.team1);
    if (m.team2) allTeamsSet.add(m.team2);
  });
  const allTeams = Array.from(allTeamsSet).sort();

  const filteredMatches = [];
  rawMatches.forEach(m => {
    const teamsInfo = getMatchTeamsInfo(m.id);

    if (currentPhase === 'groups' && m.id >= 73) return;
    if (currentPhase === 'knockout' && m.id < 73) return;

    const isTeam1Match = teamsInfo.t1Name && teamsInfo.t1Name.toUpperCase() === currentTeam;
    const isTeam2Match = teamsInfo.t2Name && teamsInfo.t2Name.toUpperCase() === currentTeam;
    if (currentTeam !== 'all' && !isTeam1Match && !isTeam2Match) return;

    if (favoritesOnly) {
      const isT1Fav = teamsInfo.t1Name && state.favorites.includes(teamsInfo.t1Name.toUpperCase());
      const isT2Fav = teamsInfo.t2Name && state.favorites.includes(teamsInfo.t2Name.toUpperCase());
      if (!isT1Fav && !isT2Fav) return;
    }

    const dtStr = `${m.dateStr}T${m.timeStr}`;
    const dateObj = new Date(dtStr);
    const formatted = formatMatchDateTime(m.dateStr, m.timeStr);

    filteredMatches.push({
      match: m,
      teamsInfo,
      dateObj,
      localDate: formatted.date,
      localTime: formatted.time
    });
  });

  filteredMatches.sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime());

  const dayGroups = {};
  filteredMatches.forEach(fm => {
    if (!dayGroups[fm.localDate]) {
      dayGroups[fm.localDate] = [];
    }
    dayGroups[fm.localDate].push(fm);
  });

  let html = `
    <div class="header-row">
      <h2>Calendario de Partidos</h2>
      <p>Copa Mundial FIFA 2026™ · Cronograma por día y horarios adaptados a tu zona horaria</p>
    </div>

    <div class="filter-bar">
      <button class="f-btn ${currentPhase === 'all' ? 'active' : ''}" data-phase="all">Todos</button>
      <button class="f-btn ${currentPhase === 'groups' ? 'active' : ''}" data-phase="groups">Fase de Grupos</button>
      <button class="f-btn ${currentPhase === 'knockout' ? 'active' : ''}" data-phase="knockout">Fase Final</button>
      <button class="f-btn favs-btn ${favoritesOnly ? 'active' : ''}" id="calFavsBtn">⭐ Favoritos</button>

      <div class="filter-team" style="display: flex; align-items: center; gap: 8px; margin-left: 12px;">
        <label for="calTeamSelect" class="tz-label" style="font-size: 11px;">Selección:</label>
        <select id="calTeamSelect" class="tz-select glass-select" style="padding: 4px 8px;">
          <option value="all">Todas</option>
          ${allTeams.map(t => `
            <option value="${t.toUpperCase()}" ${currentTeam === t.toUpperCase() ? 'selected' : ''}>${t}</option>
          `).join('')}
        </select>
      </div>

      <button class="reset-btn" id="calResetBtn">Borrar filtros</button>
    </div>

    <div class="calendar-list">
  `;

  const dateKeys = Object.keys(dayGroups);
  if (dateKeys.length === 0) {
    html += `
      <div class="empty-favorites" style="text-align: center; padding: 60px 40px; color: var(--text2);">
        <p style="font-size: 16px; margin-bottom: 10px; font-weight: 600;">⚽ No se encontraron partidos con los filtros seleccionados.</p>
        <p style="font-size: 13px;">Intentá restablecer los filtros para ver la lista completa.</p>
      </div>
    `;
  } else {
    dateKeys.forEach(dateStr => {
      html += `
        <div class="day-group">
          <div class="day-header glass-day-header">${dateStr}</div>
          <div class="day-matches">
      `;

      dayGroups[dateStr].forEach(fm => {
        const m = fm.match;
        const ti = fm.teamsInfo;
        const pred = state.matches[m.id];
        const played = pred && pred.homeScore !== null && pred.awayScore !== null;
        const prodeCls = getProdeMatchClass(m.id);

        const sc = played
          ? `<span class="sv">${pred.homeScore}</span><span class="ss"> – </span><span class="sv">${pred.awayScore}</span>`
          : `<span class="sv">VS</span>`;

        const isT1Fav = ti.t1Name && state.favorites.includes(ti.t1Name.toUpperCase());
        const isT2Fav = ti.t2Name && state.favorites.includes(ti.t2Name.toUpperCase());
        const t1Star = isT1Fav ? '<span class="fav-star">★</span>' : '';
        const t2Star = isT2Fav ? '<span class="fav-star">★</span>' : '';

        let stageTag = m.group || '';
        if (m.id >= 73 && m.id <= 88) stageTag = 'Dieciseisavos';
        else if (m.id >= 89 && m.id <= 96) stageTag = 'Octavos';
        else if (m.id >= 97 && m.id <= 100) stageTag = 'Cuartos';
        else if (m.id === 101 || m.id === 102) stageTag = 'Semifinal';
        else if (m.id === 103) stageTag = 'Tercer Puesto';
        else if (m.id === 104) stageTag = 'Final';

        const real = state.realScores[m.id];
        const hasReal = real && real.played;
        const realScoreHtml = hasReal
          ? `<span class="m-real-score-badge">Real: ${real.homeScore}-${real.awayScore}</span>`
          : '';

        html += `
          <div class="cal-row ${prodeCls}" data-match-id="${m.id}">
            <div class="cal-time-col">
              <span class="cal-time">${fm.localTime}</span>
              <span class="cal-stage">${stageTag}</span>
            </div>
            
            <div class="cal-team home ${ti.isUnresolved1 ? 'tbd' : ''}">
              <span class="cal-name" ${!ti.isUnresolved1 ? `onclick="event.stopPropagation(); window.openSquadModal('${ti.t1Name.toUpperCase()}')" style="cursor: pointer;" title="Ver plantel"` : ''}>
                ${ti.t1Label} ${t1Star}
              </span>
              <span class="cal-flag">${ti.t1Flag}</span>
            </div>
            
            <div class="m-score-wrapper">
              <div class="m-score ${played ? 'done' : 'pending'}">${sc}</div>
              ${realScoreHtml}
            </div>
            
            <div class="cal-team away ${ti.isUnresolved2 ? 'tbd' : ''}">
              <span class="cal-flag">${ti.t2Flag}</span>
              <span class="cal-name" ${!ti.isUnresolved2 ? `onclick="event.stopPropagation(); window.openSquadModal('${ti.t2Name.toUpperCase()}')" style="cursor: pointer;" title="Ver plantel"` : ''}>
                ${ti.t2Label} ${t2Star}
              </span>
            </div>
            
            <div class="cal-stadium" title="${m.stadium}">
              ${m.stadiumAbbrev}
            </div>
          </div>
        `;
      });

      html += `
          </div>
        </div>
      `;
    });
  }

  html += `</div>`;
  container.innerHTML = html;

  container.querySelectorAll('.filter-bar button[data-phase]').forEach(btn => {
    btn.addEventListener('click', e => {
      state.filters.calendarPhase = e.target.dataset.phase;
      saveState();
      renderCalendario();
    });
  });

  const favBtn = container.querySelector('#calFavsBtn');
  if (favBtn) {
    favBtn.addEventListener('click', () => {
      state.filters.calendarFavoritesOnly = !state.filters.calendarFavoritesOnly;
      saveState();
      renderCalendario();
    });
  }

  const teamSelect = container.querySelector('#calTeamSelect');
  if (teamSelect) {
    teamSelect.addEventListener('change', e => {
      state.filters.calendarTeam = e.target.value;
      saveState();
      renderCalendario();
    });
  }

  const resetBtn = container.querySelector('#calResetBtn');
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      state.filters.calendarPhase = 'all';
      state.filters.calendarTeam = 'all';
      state.filters.calendarFavoritesOnly = false;
      saveState();
      renderCalendario();
    });
  }

  container.querySelectorAll('.cal-row').forEach(row => {
    row.addEventListener('click', () => {
      const matchId = parseInt(row.dataset.matchId);
      openMatchModal(matchId);
    });
  });
}

function getProdeMatchClass(matchId) {
  const pred = state.matches[matchId];
  const real = state.realScores[matchId];
  if (!real || !real.played || !pred) return '';
  if (pred.homeScore === null || pred.awayScore === null) return '';
  
  const phs = parseInt(pred.homeScore);
  const pas = parseInt(pred.awayScore);
  const rhs = parseInt(real.homeScore);
  const ras = parseInt(real.awayScore);
  
  if (phs === rhs && pas === ras) {
    return 'match-card-exact';
  }
  
  const predDiff = phs - pas;
  const realDiff = rhs - ras;
  if ((predDiff > 0 && realDiff > 0) || (predDiff < 0 && realDiff < 0) || (predDiff === 0 && realDiff === 0)) {
    return 'match-card-outcome';
  }
  
  return 'match-card-fail';
}

function renderGrupos() {
  const container = document.getElementById('grupos-view');
  if (!container) return;
  
  const groups = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];
  const currentFilter = state.filters.selectedGroup || 'all';
  
  // Render Filter Bar
  let filterBarHtml = `
    <div class="filter-bar">
      <button class="f-btn all-btn ${currentFilter === 'all' ? 'active' : ''}" data-g="all">Todos</button>
      <button class="f-btn favs-btn ${currentFilter === 'favorites' ? 'active' : ''}" data-g="favorites">⭐ Favoritos</button>
      ${groups.map(g => `
        <button class="f-btn ${currentFilter === g ? 'active' : ''}" data-g="${g}">${g}</button>
      `).join('')}
      <button class="reset-btn" id="groupsResetBtn">Borrar todo</button>
    </div>
  `;
  
  let html = `
    <div class="header-row">
      <h2>Fase de Grupos</h2>
      <p>Copa Mundial FIFA 2026™ · 11–27 junio · 12 grupos · 48 selecciones — Haz clic en un partido para ingresar el resultado</p>
    </div>
    
    ${filterBarHtml}
    
    <div class="groups-grid ${currentFilter !== 'all' ? 'single' : ''}">
  `;
  
  const filteredGroups = currentFilter === 'all'
    ? groups
    : currentFilter === 'favorites'
      ? groups.filter(gLetter => {
          const teams = groupTeams[gLetter] || [];
          return teams.some(t => state.favorites.includes(t.toUpperCase()));
        })
      : [currentFilter];
      
  if (filteredGroups.length === 0 && currentFilter === 'favorites') {
    html += `
      <div class="empty-favorites" style="grid-column: 1 / -1; text-align: center; padding: 60px 40px; color: var(--text2);">
        <p style="font-size: 16px; margin-bottom: 10px; font-weight: 600;">⭐ No tenés selecciones favoritas marcadas.</p>
        <p style="font-size: 13px;">Hacé clic en el nombre de cualquier país (ej. en las tablas o selecciones) para abrir su ficha y marcarlo como favorito.</p>
      </div>
    `;
  }
  
  filteredGroups.forEach(gLetter => {
    const standings = state.groupStandings[gLetter] || [];
    const groupMatches = rawMatches.filter(m => m.group === `Grupo ${gLetter}`);
    
    // Count played matches
    let playedCount = 0;
    groupMatches.forEach(m => {
      const pred = state.matches[m.id];
      if (pred && pred.homeScore !== null && pred.awayScore !== null) {
        playedCount++;
      }
    });
    
    html += `
      <div class="g-card">
        <div class="g-card-head">
          <span class="g-title">Grupo ${gLetter}</span>
          <span class="g-meta">${playedCount}/6 jugados</span>
        </div>
        
        <div class="st-head">
          <div></div><div>Equipo</div>
          <div>PJ</div><div>G</div><div>E</div><div>P</div>
          <div>GF:GA</div><div>Pts</div>
        </div>
    `;
    
    standings.forEach((t, idx) => {
      const isHost = t.name === 'MÉXICO' || t.name === 'CANADÁ' || t.name === 'ESTADOS UNIDOS';
      const qc = idx === 0 ? 'q1' : idx === 1 ? 'q2' : idx === 2 ? 'q3' : 'q4';
      const flag = teamFlags[t.name.toUpperCase()] || '🏳️';
      const isFav = state.favorites.includes(t.name.toUpperCase());
      const favStar = isFav ? '<span class="fav-star">★</span>' : '';
      
      html += `
        <div class="st-row ${qc}">
          <div class="s-pos">${idx + 1}</div>
          <div class="s-team">
            <span class="s-flag">${flag}</span>
            <span class="s-name" onclick="event.stopPropagation(); window.openSquadModal('${t.name.toUpperCase()}')" style="cursor: pointer;" title="Ver plantel">${t.name} ${favStar}</span>
            ${isHost ? '<span class="s-host">Local</span>' : ''}
          </div>
          <div class="s-stat">${t.pj}</div>
          <div class="s-stat">${t.pg}</div>
          <div class="s-stat">${t.pe}</div>
          <div class="s-stat">${t.pp}</div>
          <div class="s-stat gfga">${t.pj > 0 ? t.gf + ':' + t.gc : '—'}</div>
          <div class="s-stat pts">${t.pts}</div>
        </div>
      `;
    });
    
    html += `
        <div class="m-section">
          <div class="m-label">Partidos</div>
    `;
    
    groupMatches.forEach(m => {
      const real = state.realScores[m.id];
      const hasReal = real && real.played;
      
      const pred = state.matches[m.id];
      const playedPred = pred && pred.homeScore !== null && pred.awayScore !== null;
      
      const t1Flag = teamFlags[m.team1.toUpperCase()] || '🏳️';
      const t2Flag = teamFlags[m.team2.toUpperCase()] || '🏳️';
      
      const isHomeFav = state.favorites.includes(m.team1.toUpperCase());
      const isAwayFav = state.favorites.includes(m.team2.toUpperCase());
      const homeStar = isHomeFav ? '<span class="fav-star">★</span>' : '';
      const awayStar = isAwayFav ? '<span class="fav-star">★</span>' : '';
      const prodeCls = getProdeMatchClass(m.id);
      
      let sc = '';
      let isDone = false;
      
      if (hasReal) {
        sc = `<span class="sv">${real.homeScore}</span><span class="ss"> – </span><span class="sv">${real.awayScore}</span>`;
        isDone = true;
      } else if (playedPred) {
        sc = `<span class="sv">${pred.homeScore}</span><span class="ss"> – </span><span class="sv">${pred.awayScore}</span>`;
        isDone = true;
      } else {
        sc = `<span class="sv">VS</span>`;
      }
      
      const realScoreHtml = (hasReal && playedPred)
        ? `<span class="m-real-score-badge" style="background: #ffffff20; color: #aaa;">Tu Prode: ${pred.homeScore}-${pred.awayScore}</span>`
        : (hasReal ? `<span class="m-real-score-badge" style="background: var(--gold); color: #000;">FINALIZADO</span>` : '');
        
      html += `
        <div class="m-row ${prodeCls}" data-match-id="${m.id}" ${hasReal ? 'style="cursor: default; opacity: 0.8;"' : ''}>
          <div class="m-team home">
            <span class="m-name">${m.team1} ${homeStar}</span>
            <span class="m-flag">${t1Flag}</span>
          </div>
          <div class="m-score-wrapper">
            <div class="m-score ${isDone ? 'done' : 'pending'}">${sc}</div>
            ${realScoreHtml}
          </div>
          <div class="m-team away">
            <span class="m-flag">${t2Flag}</span>
            <span class="m-name">${m.team2} ${awayStar}</span>
          </div>
        </div>
      `;
    });
    
    html += `
        </div>
      </div>
    `;
  });
  
  html += `
    </div>
    <div class="legend">
      <div class="leg-item"><div class="leg-dot green"></div>Clasificado directo (1° y 2°)</div>
      <div class="leg-item"><div class="leg-dot gold"></div>Posible mejor 3° (8 avanzan)</div>
    </div>
  `;
  
  container.innerHTML = html;
  
  // Bind events
  container.querySelectorAll('.f-btn').forEach(btn => {
    btn.addEventListener('click', e => {
      state.filters.selectedGroup = e.target.dataset.g;
      saveState();
      renderGrupos();
    });
  });
  
  const resetBtn = container.querySelector('#groupsResetBtn');
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      if (confirm('¿Borrar todos los resultados del simulador?')) {
        Object.keys(state.matches).forEach(mId => {
          state.matches[mId] = { homeScore: null, awayScore: null, winnerOverride: null };
        });
        recalculateTournament();
        calculateProdeStats();
        saveState();
        renderActiveTab();
      }
    });
  }
  
  container.querySelectorAll('.m-row').forEach(row => {
    row.addEventListener('click', () => {
      const matchId = parseInt(row.dataset.matchId);
      openMatchModal(matchId);
    });
  });
}

function renderFaseFinal() {
  const container = document.getElementById('fase-final-view');
  if (!container) return;
  
  // Best Thirds Table
  let thirdsHtml = `
    <div class="best-thirds-section">
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
    const flag = teamFlags[t.name.toUpperCase()] || '🏳️';
    thirdsHtml += `
      <tr class="${t.qualified ? 'third-ok' : 'third-eliminated'}">
        <td>${t.rank}</td>
        <td>Grupo ${t.group}</td>
        <td class="team-th">${flag} ${t.name}</td>
        <td>${t.pj}</td>
        <td>${t.gf}</td>
        <td>${t.gc}</td>
        <td>${t.dg >= 0 ? '+' + t.dg : t.dg}</td>
        <td class="pts-col">${t.pts}</td>
        <td><span class="badge">${t.qualified ? 'Clasificado' : 'Eliminado'}</span></td>
      </tr>
    `;
  });
  
  thirdsHtml += `
        </tbody>
      </table>
    </div>
  `;
  
  // Symmetrical Bracket Render
  const columns = [
    { title: 'Ronda de 32', matches: [73, 75, 74, 77, 76, 78, 79, 80], extraClass: '' },
    { title: 'Octavos', matches: [89, 90, 91, 92], extraClass: '' },
    { title: 'Cuartos', matches: [97, 99], extraClass: '' },
    { title: 'Semis', matches: [101], extraClass: '' },
    { title: '★ Final', matches: [104], extraClass: ' fc' },
    { title: 'Semis', matches: [102], extraClass: '' },
    { title: 'Cuartos', matches: [98, 100], extraClass: '' },
    { title: 'Octavos', matches: [93, 94, 95, 96], extraClass: '' },
    { title: 'Ronda de 32', matches: [83, 84, 81, 82, 86, 88, 85, 87], extraClass: '' }
  ];
  
  const getBracketRowHtml = (mId, side, team, score, oppositeScore) => {
    const hasPlayed = score !== null && oppositeScore !== null;
    let cls = '';
    if (hasPlayed) {
      if (score > oppositeScore) cls = ' winner';
      else if (score < oppositeScore) cls = ' loser';
      else {
        // It was a draw, check who won by shootout
        const rm = state.resolvedKnockoutMatches[mId];
        if (rm && rm.winner === team) cls = ' winner';
        else cls = ' loser';
      }
    }
    
    const sc = score !== null ? `<span class="br-score">${score}</span>` : '';
    
    if (!team || team.startsWith('Falta') || team.startsWith('3º')) {
      const sl = mId <= 88 ? getSeedLabel(mId, side) : '';
      return `<div class="br-row tbd${cls}">${sl ? `<span class="br-seed">${sl}</span>` : ''}<span class="br-name">Por definir</span>${sc}</div>`;
    }
    
    const flag = teamFlags[team.toUpperCase()] || '🏳️';
    const isFav = state.favorites.includes(team.toUpperCase());
    const favStar = isFav ? '<span class="fav-star">★</span>' : '';
    return `<div class="br-row${cls}"><span class="br-flag">${flag}</span><span class="br-name" onclick="event.stopPropagation(); window.openSquadModal('${team.toUpperCase()}')" style="cursor: pointer;" title="Ver plantel">${team} ${favStar}</span>${sc}</div>`;
  };
  
  const getSeedLabel = (matchId, side) => {
    const seeds = {
      73: ['2°A', '2°B'], 74: ['1°C', '2°F'], 75: ['1°E', '3°E/F/G/H'], 76: ['1°F', '2°C'],
      77: ['2°E', '2°I'], 78: ['1°I', '3°G/H/I/J'], 79: ['1°A', '3°A/B/C/D'], 80: ['1°L', '3°K/L'],
      81: ['1°G', '3°H/I/J/K'], 82: ['1°D', '3°D/E/F/G'], 83: ['1°H', '2°J'], 84: ['2°K', '2°L'],
      85: ['1°B', '3°B/C/D/E'], 86: ['2°D', '2°G'], 87: ['1°J', '2°H'], 88: ['1°K', '3°J/K/L']
    };
    if (seeds[matchId]) {
      return side === 1 ? seeds[matchId][0] : seeds[matchId][1];
    }
    return '';
  };
  
  const renderBracketMatch = (mId) => {
    const rm = state.resolvedKnockoutMatches[mId];
    const pred = state.matches[mId] || { homeScore: null, awayScore: null, winnerOverride: null };
    
    const t1 = rm ? rm.team1 : null;
    const t2 = rm ? rm.team2 : null;
    
    const sA = pred.homeScore;
    const sB = pred.awayScore;
    
    const isFinal = mId === 104;
    const played = sA !== null && sB !== null;
    const prodeCls = getProdeMatchClass(mId);
    
    const real = state.realScores[mId];
    const hasReal = real && real.played;
    const realScoreHtml = hasReal
      ? `<div class="m-real-score-badge" style="font-size:10px;text-align:center;margin-top:2px;opacity:0.9;">Real: ${real.homeScore}-${real.awayScore}</div>`
      : '';
    
    return `
      <div class="br-match ${played ? 'played' : ''} ${isFinal && played ? 'final-played' : ''} ${prodeCls}" data-match-id="${mId}" style="height: auto; padding-bottom:4px;">
        ${getBracketRowHtml(mId, 1, t1, sA, sB)}
        ${getBracketRowHtml(mId, 2, t2, sB, sA)}
        ${realScoreHtml}
      </div>
    `;
  };
  
  let bracketColsHtml = columns.map(col => `
    <div class="br-col${col.extraClass}">
      <div class="br-col-hd">${col.title}</div>
      <div class="br-matches">
        ${col.matches.map(renderBracketMatch).join('')}
      </div>
    </div>
  `).join('');
  
  // Render Third Place block
  const thirdMatchId = 103;
  const tm = state.resolvedKnockoutMatches[thirdMatchId];
  const tpScore = state.matches[thirdMatchId] || { homeScore: null, awayScore: null, winnerOverride: null };
  const tPlay = tpScore.homeScore !== null && tpScore.awayScore !== null;
  const realThird = state.realScores[thirdMatchId];
  const thirdRealHtml = realThird && realThird.played
    ? `<div class="m-real-score-badge" style="font-size:10px;text-align:center;margin-top:2px;opacity:0.9;">Real: ${realThird.homeScore}-${realThird.awayScore}</div>`
    : '';
  const thirdMatchHtml = `
    <div class="br-match ${tPlay ? 'played' : ''}" data-match-id="${thirdMatchId}" style="width: 200px; height: auto; padding-bottom:4px; cursor: pointer;">
      ${getBracketRowHtml(thirdMatchId, 1, tm ? tm.team1 : null, tpScore.homeScore, tpScore.awayScore)}
      ${getBracketRowHtml(thirdMatchId, 2, tm ? tm.team2 : null, tpScore.awayScore, tpScore.homeScore)}
      ${thirdRealHtml}
    </div>
  `;
  
  // Champion block
  const finalMatch = state.resolvedKnockoutMatches[104];
  const finalScore = state.matches[104] || { homeScore: null, awayScore: null, winnerOverride: null };
  const hasChampion = finalMatch && finalMatch.winner;
  
  let champBlockHtml = `
    <div class="champ-block ${hasChampion ? 'show' : ''}" id="champBlock">
      <div class="champ-lbl">🏆 Campeón del Mundo 2026</div>
      <div class="champ-team" id="champTeam">
        ${hasChampion ? `<span class="champ-flag">${teamFlags[finalMatch.winner.toUpperCase()] || '🏳️'}</span><span>${finalMatch.winner}</span>` : ''}
      </div>
    </div>
  `;
  
  container.innerHTML = `
    <div class="page-hd">
      <h1>Fase <strong>Final</strong></h1>
      <p>Copa Mundial FIFA 2026™ · Los clasificados se auto-completan desde la Fase de Grupos · Haz clic en un partido para ingresar resultado</p>
    </div>
    
    ${thirdsHtml}
    
    <div class="bracket-outer">
      <div class="bracket-wrap" id="bracket">
        ${bracketColsHtml}
      </div>
    </div>
    
    <div class="bottom-section">
      <div class="third-block">
        <div class="section-lbl">Tercer Lugar</div>
        <div id="thirdMatch">
          ${thirdMatchHtml}
        </div>
      </div>
      ${champBlockHtml}
    </div>
  `;
  
  // Bind click listeners on all match cards
  container.querySelectorAll('.br-match').forEach(card => {
    card.addEventListener('click', () => {
      const matchId = parseInt(card.dataset.matchId);
      openMatchModal(matchId);
    });
  });
}

// --- RESULTS MODAL SYSTEM ---
let currentEditingMatchId = null;
let tempWinnerOverride = null;

export function openMatchModal(matchId) {
  currentEditingMatchId = matchId;
  tempWinnerOverride = null;
  
  const m = rawMatches.find(x => x.id === matchId);
  if (!m) return;
  
  const isKnockout = matchId >= 73 && matchId <= 104;
  
  // Resolve team names
  let t1Name = m.team1;
  let t2Name = m.team2;
  
  if (isKnockout) {
    const resolved = state.resolvedKnockoutMatches[matchId];
    if (resolved) {
      t1Name = resolved.team1 || `Por definir (G${matchId})`;
      t2Name = resolved.team2 || `Por definir (G${matchId})`;
    }
  }
  
  const t1Flag = teamFlags[t1Name.toUpperCase()] || '🏳️';
  const t2Flag = teamFlags[t2Name.toUpperCase()] || '🏳️';
  
  const pred = state.matches[matchId] || { homeScore: null, awayScore: null, winnerOverride: null };
  tempWinnerOverride = pred.winnerOverride;
  
  const moOverlay = document.getElementById('moOverlay');
  const moTag = document.getElementById('moTag');
  const moTitle = document.getElementById('moTitle');
  const moFlagA = document.getElementById('moFlagA');
  const moNameA = document.getElementById('moNameA');
  const moFlagB = document.getElementById('moFlagB');
  const moNameB = document.getElementById('moNameB');
  const scA = document.getElementById('scA');
  const scB = document.getElementById('scB');
  
  moTag.textContent = isKnockout ? (m.group || 'Fase Final') : m.group;
  moTitle.textContent = `${t1Name} vs ${t2Name}`;
  moFlagA.textContent = t1Flag;
  moNameA.textContent = t1Name;
  moFlagB.textContent = t2Flag;
  moNameB.textContent = t2Name;
  
  const real = state.realScores[matchId];
  const hasReal = real && real.played;
  
  if (hasReal) {
    scA.value = real.homeScore;
    scB.value = real.awayScore;
    scA.disabled = true;
    scB.disabled = true;
    document.getElementById('moSave').style.display = 'none';
    document.getElementById('moDel').style.display = 'none';
    moTitle.textContent = `Resultado Oficial`;
  } else {
    scA.value = pred.homeScore !== null ? pred.homeScore : '';
    scB.value = pred.awayScore !== null ? pred.awayScore : '';
    scA.disabled = false;
    scB.disabled = false;
    document.getElementById('moSave').style.display = 'inline-block';
    document.getElementById('moDel').style.display = 'inline-block';
    moTitle.textContent = `${t1Name} vs ${t2Name}`;
  }
  
  // Predict match probabilities and score
  const predInfo = predictMatch(t1Name, t2Name);
  const hasPred = predInfo && predInfo.score1 !== '-';
  
  const moPrediction = document.getElementById('moPrediction');
  if (hasPred && (!real || !real.played)) {
    moPrediction.style.display = 'block';
    moPrediction.innerHTML = `
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
    `;
  } else {
    moPrediction.style.display = 'none';
  }
  
  // Render Prode
  updateProdeUI(matchId);
  
  // Tie-breaker resolution box visibility check
  updateTieResolutionUI(matchId, t1Name, t2Name);
  
  moOverlay.classList.add('open');
  setTimeout(() => scA.focus(), 150);
}

function updateProdeUI(matchId) {
  const moRealScore = document.getElementById('moRealScore');
  const real = state.realScores[matchId];
  if (!real || !real.played) {
    moRealScore.style.display = 'none';
    return;
  }
  
  const rhs = parseInt(real.homeScore);
  const ras = parseInt(real.awayScore);
  
  const valA = document.getElementById('scA').value;
  const valB = document.getElementById('scB').value;
  
  let pointsLabel = '0 pts';
  let badgeClass = 'prode-fail';
  
  if (valA !== '' && valB !== '') {
    const phs = parseInt(valA);
    const pas = parseInt(valB);
    
    if (phs === rhs && pas === ras) {
      pointsLabel = '+3 pts (Exacto)';
      badgeClass = 'prode-exact';
    } else {
      const predDiff = phs - pas;
      const realDiff = rhs - ras;
      if ((predDiff > 0 && realDiff > 0) || (predDiff < 0 && realDiff < 0) || (predDiff === 0 && realDiff === 0)) {
        pointsLabel = '+1 pt (Acierto)';
        badgeClass = 'prode-outcome';
      }
    }
  }
  
  moRealScore.style.display = 'flex';
  moRealScore.innerHTML = `
    <span class="real-score-label">Resultado Real: <strong>${rhs} - ${ras}</strong></span>
    <span class="prode-points-badge ${badgeClass}">${pointsLabel}</span>
  `;
}

function updateTieResolutionUI(matchId, t1Name, t2Name) {
  const isKnockout = matchId >= 73 && matchId <= 104;
  const tieBox = document.getElementById('moTieResolution');
  const winBtnA = document.getElementById('moWinnerBtnA');
  const winBtnB = document.getElementById('moWinnerBtnB');
  
  if (!isKnockout) {
    tieBox.style.display = 'none';
    return;
  }
  
  const valA = parseInt(document.getElementById('scA').value);
  const valB = parseInt(document.getElementById('scB').value);
  
  if (!isNaN(valA) && !isNaN(valB) && valA === valB) {
    tieBox.style.display = 'block';
    winBtnA.innerHTML = `${teamFlags[t1Name.toUpperCase()] || '🏳️'} ${t1Name}`;
    winBtnB.innerHTML = `${teamFlags[t2Name.toUpperCase()] || '🏳️'} ${t2Name}`;
    
    // Toggle active state
    winBtnA.classList.toggle('selected', tempWinnerOverride === t1Name);
    winBtnB.classList.toggle('selected', tempWinnerOverride === t2Name);
  } else {
    tieBox.style.display = 'none';
  }
}

export function closeMatchModal() {
  document.getElementById('moOverlay').classList.remove('open');
  currentEditingMatchId = null;
  tempWinnerOverride = null;
}

function saveMatchResult() {
  if (!currentEditingMatchId) return;
  const valA = document.getElementById('scA').value;
  const valB = document.getElementById('scB').value;
  
  if (valA === '' || valB === '') {
    alert('Ingresá el resultado de ambos equipos.');
    return;
  }
  
  const a = parseInt(valA);
  const b = parseInt(valB);
  
  if (isNaN(a) || isNaN(b) || a < 0 || b < 0) {
    alert('Ingresá un resultado válido.');
    return;
  }
  
  const isKnockout = currentEditingMatchId >= 73 && currentEditingMatchId <= 104;
  if (isKnockout && a === b && !tempWinnerOverride) {
    alert('Partido empatado en fase eliminatoria. Elegí el equipo que avanza antes de guardar.');
    return;
  }
  
  state.matches[currentEditingMatchId] = {
    homeScore: a,
    awayScore: b,
    winnerOverride: isKnockout && a === b ? tempWinnerOverride : null
  };
  
  recalculateTournament();
  calculateProdeStats();
  saveState();
  closeMatchModal();
  renderActiveTab();
}

function deleteMatchResult() {
  if (!currentEditingMatchId) return;
  
  state.matches[currentEditingMatchId] = {
    homeScore: null,
    awayScore: null,
    winnerOverride: null
  };
  
  recalculateTournament();
  calculateProdeStats();
  saveState();
  closeMatchModal();
  renderActiveTab();
}

// --- SQUAD MODAL SYSTEM ---
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

window.openSquadModal = function(teamName) {
  const cleanName = teamName.trim().toUpperCase();
  const det = teamDetails[cleanName];
  if (!det) return;
  
  const ratingData = teamRatings[cleanName] || { initialRating: 'N/A', formCoefficient: 0, recentForm: [] };
  const flag = teamFlags[cleanName] || '🏳️';
  
  const squadOverlay = document.getElementById('squadOverlay');
  const squadTitle = document.getElementById('squadTitle');
  const squadDetailsContent = document.getElementById('squadDetailsContent');
  
  const isFav = state.favorites.includes(cleanName);
  const starChar = isFav ? '★' : '☆';
  const starColor = isFav ? 'var(--gold)' : 'var(--text3)';
  
  squadTitle.innerHTML = `
    ${flag} ${cleanName}
    <button class="squad-fav-btn" onclick="event.stopPropagation(); window.toggleFavorite('${cleanName}'); window.openSquadModal('${cleanName}')" style="color: ${starColor}; border: none; background: none; font-size: 22px; cursor: pointer; vertical-align: middle; margin-left: 8px;" title="Marcar como favorito">
      ${starChar}
    </button>
  `;
  
  squadDetailsContent.innerHTML = `
    <div class="squad-meta-info">
      <div class="squad-meta-item">
        <span class="squad-meta-lbl">Director Técnico (DT)</span>
        <span class="squad-meta-val text-cyan">${det.dt}</span>
      </div>
      <div class="squad-meta-item">
        <span class="squad-meta-lbl">Jugador Figura</span>
        <span class="squad-meta-val text-gold">${det.figura}</span>
      </div>
      <div class="squad-meta-item">
        <span class="squad-meta-lbl">Mejor Historial</span>
        <span class="squad-meta-val">${det.historial}</span>
      </div>
      <div class="squad-meta-item">
        <span class="squad-meta-lbl">FIFA Elo Rating</span>
        <span class="squad-meta-val">${ratingData.initialRating}</span>
      </div>
    </div>
    
    <div class="squad-grid">
      <div class="squad-pos-section">
        <h5>🧤 Arqueros</h5>
        <ul>
          ${det.arqueros.map(p => `<li>${p}</li>`).join('')}
        </ul>
      </div>
      <div class="squad-pos-section">
        <h5>🛡️ Defensores</h5>
        <ul>
          ${det.defensores.map(p => `<li>${p}</li>`).join('')}
        </ul>
      </div>
      <div class="squad-pos-section">
        <h5>⚙️ Mediocampistas</h5>
        <ul>
          ${det.mediocampistas.map(p => `<li>${p}</li>`).join('')}
        </ul>
      </div>
      <div class="squad-pos-section">
        <h5>⚽ Delanteros</h5>
        <ul>
          ${det.delanteros.map(p => `<li>${p}</li>`).join('')}
        </ul>
      </div>
    </div>
  `;
  
  squadOverlay.classList.add('open');
};

window.closeSquadModal = function() {
  document.getElementById('squadOverlay').classList.remove('open');
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
  state.realScores = { ...fallbackRealScores };
  console.log('Successfully loaded official realistic scores from local database.');
  calculateProdeStats();
  recalculateTournament();
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
  
  // Set up modal listeners
  document.getElementById('moSave').addEventListener('click', saveMatchResult);
  document.getElementById('moDel').addEventListener('click', deleteMatchResult);
  document.getElementById('moCancel').addEventListener('click', closeMatchModal);
  document.getElementById('moOverlay').addEventListener('click', e => {
    if (e.target === document.getElementById('moOverlay')) closeMatchModal();
  });
  
  document.getElementById('scA').addEventListener('input', () => {
    if (currentEditingMatchId) {
      const m = rawMatches.find(x => x.id === currentEditingMatchId);
      let t1Name = m.team1;
      let t2Name = m.team2;
      if (currentEditingMatchId >= 73) {
        const resolved = state.resolvedKnockoutMatches[currentEditingMatchId];
        t1Name = resolved.team1 || 'Equipo A';
        t2Name = resolved.team2 || 'Equipo B';
      }
      updateTieResolutionUI(currentEditingMatchId, t1Name, t2Name);
      updateProdeUI(currentEditingMatchId);
    }
  });
  document.getElementById('scB').addEventListener('input', () => {
    if (currentEditingMatchId) {
      const m = rawMatches.find(x => x.id === currentEditingMatchId);
      let t1Name = m.team1;
      let t2Name = m.team2;
      if (currentEditingMatchId >= 73) {
        const resolved = state.resolvedKnockoutMatches[currentEditingMatchId];
        t1Name = resolved.team1 || 'Equipo A';
        t2Name = resolved.team2 || 'Equipo B';
      }
      updateTieResolutionUI(currentEditingMatchId, t1Name, t2Name);
      updateProdeUI(currentEditingMatchId);
    }
  });
  
  document.getElementById('moWinnerBtnA').addEventListener('click', () => {
    if (currentEditingMatchId) {
      const m = rawMatches.find(x => x.id === currentEditingMatchId);
      let t1Name = m.team1;
      if (currentEditingMatchId >= 73) {
        const resolved = state.resolvedKnockoutMatches[currentEditingMatchId];
        t1Name = resolved.team1 || 'Equipo A';
      }
      tempWinnerOverride = t1Name;
      document.getElementById('moWinnerBtnA').classList.add('selected');
      document.getElementById('moWinnerBtnB').classList.remove('selected');
    }
  });
  document.getElementById('moWinnerBtnB').addEventListener('click', () => {
    if (currentEditingMatchId) {
      const m = rawMatches.find(x => x.id === currentEditingMatchId);
      let t2Name = m.team2;
      if (currentEditingMatchId >= 73) {
        const resolved = state.resolvedKnockoutMatches[currentEditingMatchId];
        t2Name = resolved.team2 || 'Equipo B';
      }
      tempWinnerOverride = t2Name;
      document.getElementById('moWinnerBtnB').classList.add('selected');
      document.getElementById('moWinnerBtnA').classList.remove('selected');
    }
  });
  
  // Squad modal listeners
  document.getElementById('squadCancel').addEventListener('click', window.closeSquadModal);
  document.getElementById('squadOverlay').addEventListener('click', e => {
    if (e.target === document.getElementById('squadOverlay')) window.closeSquadModal();
  });
  
  // Set up header logo click to go back to portada
  const brandLink = document.getElementById('brandLink');
  if (brandLink) {
    brandLink.addEventListener('click', (e) => {
      e.preventDefault();
      state.activeTab = 'portada';
      saveState();
      renderActiveTab();
    });
  }
  
  // Async fetch real world cup results
  fetchRealScores();
  
  renderActiveTab();
}

function renderSelecciones() {
  const container = document.getElementById('selecciones-view');
  if (!container) return;
  
  const confColors = {
    UEFA: '#3b82f6', CONMEBOL: '#f59e0b', CONCACAF: '#10b981',
    CAF: '#ef4444', AFC: '#8b5cf6', OFC: '#64748b'
  };
  
  const confLabels = {
    UEFA: 'UEFA', CONMEBOL: 'CONMEBOL', CONCACAF: 'CONCACAF',
    CAF: 'CAF (África)', AFC: 'AFC (Asia)', OFC: 'OFC (Oceanía)'
  };
  
  const confs = ['UEFA', 'CONMEBOL', 'CONCACAF', 'CAF', 'AFC', 'OFC'];
  const currentConf = state.filters.selectedConf || 'all';
  
  // Compile all 48 teams
  const allTeamsList = [];
  Object.keys(groupTeams).forEach(gLetter => {
    groupTeams[gLetter].forEach(team => {
      const cleanTeam = team.trim().toUpperCase();
      const conf = teamConfederations[cleanTeam] || 'UEFA';
      const isHost = cleanTeam === 'MÉXICO' || cleanTeam === 'CANADÁ' || cleanTeam === 'ESTADOS UNIDOS';
      allTeamsList.push({
        name: team,
        cleanName: cleanTeam,
        group: gLetter,
        conf,
        isHost
      });
    });
  });
  
  // Sort teams alphabetically
  allTeamsList.sort((a, b) => a.name.localeCompare(b.name));
  
  const filteredTeams = currentConf === 'all' ? allTeamsList : allTeamsList.filter(t => t.conf === currentConf);
  
  // Filter Bar
  const counts = { all: 48 };
  confs.forEach(c => {
    counts[c] = allTeamsList.filter(t => t.conf === c).length;
  });
  
  let filterBarHtml = `
    <div class="filter-bar">
      <button class="f-btn ${currentConf === 'all' ? 'active' : ''}" data-c="all">
        Todas <span class="f-count">${counts.all}</span>
      </button>
      ${confs.map(c => `
        <button class="f-btn ${currentConf === c ? 'active' : ''}" data-c="${c}">
          ${c} <span class="f-count">${counts[c]}</span>
        </button>
      `).join('')}
    </div>
  `;
  
  let contentHtml = '';
  
  const renderCard = (t) => {
    const flag = teamFlags[t.cleanName] || '🏳️';
    const pos = getTeamGroupPosition(t.name, t.group);
    const cc = confColors[t.conf] || '#888';
    
    let posHtml = '';
    let qualifiedClass = '';
    
    if (pos !== null) {
      const pClass = (pos === 1 || pos === 2) ? 'p1' : pos === 3 ? 'p3' : 'p4';
      posHtml = `<div class="tc-pos ${pClass}"><div class="tc-pos-dot"></div>${pos}° Grupo ${t.group}</div>`;
      if (pos === 1 || pos === 2) qualifiedClass = ' qualified';
    } else {
      posHtml = `<div class="tc-pos"></div>`;
    }
    
    const isFav = state.favorites.includes(t.cleanName);
    const favStar = isFav ? '<span class="fav-star" style="margin-left: 4px;">★</span>' : '';
    
    return `
      <div class="tc-card${qualifiedClass}" onclick="event.stopPropagation(); window.openSquadModal('${t.cleanName}')">
        ${t.isHost ? '<span class="tc-host-badge">Local</span>' : ''}
        <span class="tc-flag">${flag}</span>
        <div class="tc-name">${t.name} ${favStar}</div>
        <div class="tc-tags">
          <span class="tc-group">Grupo ${t.group}</span>
          <span class="tc-conf" style="color:${cc};background:${cc}1a;border:1px solid ${cc}40">${t.conf}</span>
        </div>
        ${posHtml}
      </div>
    `;
  };
  
  if (currentConf !== 'all') {
    // Single confederation grid
    contentHtml = `
      <div class="conf-header">
        <span class="conf-title" style="color:${confColors[currentConf]}">${confLabels[currentConf]}</span>
        <span class="conf-count">${filteredTeams.length} selecciones</span>
      </div>
      <div class="teams-grid">
        ${filteredTeams.map(renderCard).join('')}
      </div>
    `;
  } else {
    // Grouped by confederation
    contentHtml = confs.map(c => {
      const confTeams = allTeamsList.filter(t => t.conf === c);
      return `
        <div class="conf-section">
          <div class="conf-header">
            <span class="conf-title" style="color:${confColors[c]}">${confLabels[c]}</span>
            <span class="conf-count">${confTeams.length} selecciones</span>
          </div>
          <div class="teams-grid">
            ${confTeams.map(renderCard).join('')}
          </div>
        </div>
      `;
    }).join('');
  }
  
  container.innerHTML = `
    <div class="page-hd">
      <h1>Selec<strong>ciones</strong></h1>
      <p>Copa Mundial FIFA 2026™ · 48 selecciones clasificadas · 6 confederaciones · Haz clic en un país para ver su plantel</p>
    </div>
    
    ${filterBarHtml}
    
    <div id="selecciones-content">
      ${contentHtml}
    </div>
  `;
  
  // Bind filters
  container.querySelectorAll('.f-btn').forEach(btn => {
    btn.addEventListener('click', e => {
      state.filters.selectedConf = btn.dataset.c;
      saveState();
      renderSelecciones();
    });
  });
}

function getTeamGroupPosition(teamName, groupLetter) {
  const standings = state.groupStandings[groupLetter];
  if (!standings) return null;
  
  // Check if any match in this group has been played
  const groupMatches = rawMatches.filter(m => m.group === `Grupo ${groupLetter}`);
  const hasPlayed = groupMatches.some(m => {
    const pred = state.matches[m.id];
    return pred && pred.homeScore !== null && pred.awayScore !== null;
  });
  
  if (!hasPlayed) return null;
  
  const idx = standings.findIndex(t => t.name.toUpperCase() === teamName.toUpperCase());
  return idx >= 0 ? idx + 1 : null;
}

// Initialize immediately (module scripts run after DOM is parsed)
initApp();
