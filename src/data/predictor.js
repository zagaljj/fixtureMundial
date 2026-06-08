import { teamRatings } from './ratings.js';

// --- Home Host Countries ---
const HOSTS = ['MÉXICO', 'ESTADOS UNIDOS', 'CANADÁ'];

// --- Helper: Factorial ---
function factorial(n) {
  if (n <= 1) return 1;
  let res = 1;
  for (let i = 2; i <= n; i++) res *= i;
  return res;
}

// --- Helper: Poisson Probability ---
function poisson(k, lambda) {
  return (Math.pow(lambda, k) * Math.exp(-lambda)) / factorial(k);
}

// --- Get Adjusted Elo Rating ---
export function getAdjustedRating(teamName) {
  if (!teamName) return 1400; // default rating
  
  const cleanName = teamName.trim().toUpperCase();
  const data = teamRatings[cleanName];
  if (!data) return 1400; // default for unknown team
  
  let rating = data.initialRating;
  
  // 1. Host Country Advantage (+100 ELO)
  if (HOSTS.includes(cleanName)) {
    rating += 100;
  }
  
  // 2. Recent Form Coefficient Adjustment (+100 * (formCoefficient - 0.5))
  rating += 100 * (data.formCoefficient - 0.5);
  
  return rating;
}

// --- Predict Match Outcomes ---
export function predictMatch(team1, team2) {
  // Return early for placeholder teams
  const isPlaceholder1 = !team1 || team1.includes('º') || team1.startsWith('Ganador') || team1.startsWith('Por definir') || team1.startsWith('Falta');
  const isPlaceholder2 = !team2 || team2.includes('º') || team2.startsWith('Ganador') || team2.startsWith('Por definir') || team2.startsWith('Falta');
  
  if (isPlaceholder1 || isPlaceholder2) {
    return {
      win1: 33.3,
      draw: 33.3,
      win2: 33.3,
      score1: '-',
      score2: '-',
      racha1: [],
      racha2: []
    };
  }
  
  const rating1 = getAdjustedRating(team1);
  const rating2 = getAdjustedRating(team2);
  
  const data1 = teamRatings[team1.trim().toUpperCase()] || { recentForm: [] };
  const data2 = teamRatings[team2.trim().toUpperCase()] || { recentForm: [] };
  
  // 1. Elo win expectation (logistic function)
  const diff = rating2 - rating1;
  const expectedProb1 = 1 / (Math.pow(10, diff / 400) + 1);
  
  // 2. Calculate Draw Probability (higher draw prob for closer teams, peak at 28%)
  const maxDrawProb = 0.28;
  const drawProb = maxDrawProb * (1 - Math.abs(expectedProb1 - 0.5) * 2);
  
  // 3. Distribute remaining probability proportionally
  const remaining = 1 - drawProb;
  const win1 = expectedProb1 * remaining;
  const win2 = (1 - expectedProb1) * remaining;
  
  // Convert to percentages rounded to 1 decimal
  const pct1 = Math.round(win1 * 1000) / 10;
  const pctDraw = Math.round(drawProb * 1000) / 10;
  const pct2 = Math.round((1.0 - win1 - drawProb) * 1000) / 10;
  
  // 4. Score prediction using Poisson distribution
  // Estimate expected goals (lambdas) for both teams
  const baseAvgGoals = 1.35;
  const ratingDiffFactor = (rating1 - rating2) / 400; // range typical -1.5 to 1.5
  
  let lambda1 = baseAvgGoals + ratingDiffFactor * 0.75;
  let lambda2 = baseAvgGoals - ratingDiffFactor * 0.75;
  
  // Clamp values
  lambda1 = Math.max(0.3, Math.min(3.5, lambda1));
  lambda2 = Math.max(0.3, Math.min(3.5, lambda2));
  
  // Find highest joint probability score (up to 5 goals)
  let maxProb = -1;
  let bestScore1 = 1;
  let bestScore2 = 1;
  
  for (let g1 = 0; g1 <= 5; g1++) {
    for (let g2 = 0; g2 <= 5; g2++) {
      const p1 = poisson(g1, lambda1);
      const p2 = poisson(g2, lambda2);
      const jointProb = p1 * p2;
      
      if (jointProb > maxProb) {
        maxProb = jointProb;
        bestScore1 = g1;
        bestScore2 = g2;
      }
    }
  }
  
  // If the ratings are extremely close, draw could be 1-1 or 0-0
  return {
    win1: pct1,
    draw: pctDraw,
    win2: pct2,
    score1: bestScore1,
    score2: bestScore2,
    racha1: data1.recentForm,
    racha2: data2.recentForm
  };
}

// --- Format Racha HTML ---
export function formatRachaHTML(racha) {
  if (!racha || racha.length === 0) return '';
  
  return racha.map(r => {
    let circleClass = '';
    if (r === 'G') circleClass = 'form-green';
    else if (r === 'E') circleClass = 'form-yellow';
    else if (r === 'P') circleClass = 'form-red';
    
    return `<span class="form-circle ${circleClass}" title="${r === 'G' ? 'Ganó' : r === 'E' ? 'Empató' : 'Perdió'}">${r}</span>`;
  }).join('');
}
