import axios from 'axios'

// Fetch live standings (existing endpoint)
export async function getStandings(websiteId) {
  const res = await axios.get(`/fixtures/standings/${websiteId}`)
  return res.data.standings
}

// Fetch persisted player stats (new endpoint)
// Optional: pass teamName to filter by team
export async function getPlayerStats(websiteId, teamName = '') {
  const q = teamName ? `?teamName=${encodeURIComponent(teamName)}` : ''
  const res = await axios.get(`/fixtures/player-stats/${websiteId}${q}`)
  return res.data.players
}

// Example usage in a React component
// import { useEffect, useState } from 'react'
// import { getPlayerStats, getStandings } from '../api/fixturesApi'
//
// function Example({ websiteId }) {
//   const [players, setPlayers] = useState([])
//   const [standings, setStandings] = useState([])
//
//   useEffect(() => {
//     async function load() {
//       try {
//         const p = await getPlayerStats(websiteId) // all teams
//         setPlayers(p)
//
//         const s = await getStandings(websiteId)
//         setStandings(s)
//       } catch (err) {
//         console.error(err)
//       }
//     }
//     load()
//   }, [websiteId])
//
//   return (
//     <div>
//       <h3>Top Scorers</h3>
//       <ul>
//         {players.map(pl => (
//           <li key={`${pl.teamName}-${pl.playerName}`}>
//             <strong>{pl.playerName}</strong> — {pl.goals} goals ({pl.teamName})
//           </li>
//         ))}
//       </ul>
//
//       <h3>Standings</h3>
//       <ol>
//         {standings.map(s => (
//           <li key={s.teamName}>{s.position}. {s.teamName} — {s.points} pts</li>
//         ))}
//       </ol>
//     </div>
//   )
// }

export default { getPlayerStats, getStandings }
