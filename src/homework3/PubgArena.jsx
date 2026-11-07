
import { useMemo, useState } from 'react';
import { usePubgAirdropTimer } from './usePubgAirdropTimer';
import AirdropClaims from './AirdropClaims';
import './PubgArena.css';

const INITIAL_SQUADS = [
  { id: 1, name: 'CES Alpha', group: 'CES', kills: 24, placement: 32 },
  { id: 2, name: 'TE Phoenix', group: 'TE', kills: 21, placement: 30 },
  { id: 3, name: 'GE Titans', group: 'GE', kills: 19, placement: 28 },
  { id: 4, name: 'AG Storm', group: 'AG', kills: 18, placement: 26 },
  { id: 5, name: 'CES Vortex', group: 'CES', kills: 16, placement: 25 },
  { id: 6, name: 'TE Nova', group: 'TE', kills: 15, placement: 23 },
  { id: 7, name: 'GE Eclipse', group: 'GE', kills: 13, placement: 21 },
  { id: 8, name: 'AG Legends', group: 'AG', kills: 11, placement: 20 },
];

const GROUPS = ['ALL', 'CES', 'TE', 'GE', 'AG'];

export default function PubgArena() {
  const [group, setGroup] = useState('ALL');
  const [targetEpochMs, setTargetEpochMs] = useState(
    () => Date.now() + 5 * 60 * 1000
  );

  const timer = usePubgAirdropTimer(targetEpochMs);

  const squads = useMemo(() => {
    return INITIAL_SQUADS
      .filter(
        (squad) =>
          group === 'ALL' || squad.group === group
      )
      .map((squad) => ({
        ...squad,
        total: squad.kills + squad.placement,
      }))
      .sort((a, b) => b.total - a.total);
  }, [group]);

  return (
    <main className="pubg-arena">
      <header className="pubg-hero">
        <p className="pubg-kicker">
          HOMEWORK 03 · REACT 19
        </p>

        <h1>
          PUBG Vietnam
          <span> Championship Arena</span>
        </h1>

        <p>
          Tournament dashboard, squad leaderboard,
          airdrop timer and reward simulation.
        </p>

        <p className="pubg-demo-label">
          Educational demonstration · Simulated data
        </p>
      </header>

      <section
        className="pubg-summary"
        aria-label="Tournament statistics"
      >
        <article>
          <span>Teams</span>
          <strong>08</strong>
        </article>

        <article>
          <span>Groups</span>
          <strong>04</strong>
        </article>

        <article>
          <span>Match Status</span>
          <strong>DEMO</strong>
        </article>
      </section>

      <section
        className="pubg-airdrop"
        aria-labelledby="airdrop-heading"
      >
        <div>
          <p className="pubg-kicker">
            AIRDROP ARENA
          </p>

          <h2 id="airdrop-heading">
            Next Supply Drop
          </h2>

          <p>
            Countdown based on an absolute timestamp.
          </p>
        </div>

        <div className="pubg-timer">
          <strong
            aria-label={`${Math.ceil(
              timer.remainingMs / 1000
            )} seconds remaining`}
          >
            {timer.formatted}
          </strong>

          <span>
            {timer.isExpired
              ? 'DROP AVAILABLE'
              : 'UNTIL DROP'}
          </span>
        </div>

        <button
          type="button"
          className="pubg-button"
          onClick={() => {
            setTargetEpochMs(
              Date.now() + 5 * 60 * 1000
            );
          }}
        >
          Restart Demo Timer
        </button>
      </section>

      <AirdropClaims />

      <section
        className="pubg-leaderboard"
        aria-labelledby="leaderboard-heading"
      >
        <div className="pubg-section-heading">
          <div>
            <p className="pubg-kicker">
              TOURNAMENT STANDINGS
            </p>

            <h2 id="leaderboard-heading">
              Squad Leaderboard
            </h2>
          </div>

          <label htmlFor="group-filter">
            Filter Group
            <select
              id="group-filter"
              value={group}
              onChange={(event) =>
                setGroup(event.target.value)
              }
            >
              {GROUPS.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="pubg-table-scroll">
          <table>
            <caption>
              Demonstration tournament standings
            </caption>

            <thead>
              <tr>
                <th scope="col">Rank</th>
                <th scope="col">Squad</th>
                <th scope="col">Group</th>
                <th scope="col">Kills</th>
                <th scope="col">Placement</th>
                <th scope="col">Total</th>
              </tr>
            </thead>

            <tbody>
              {squads.map((squad, index) => (
                <tr key={squad.id}>
                  <td>#{index + 1}</td>

                  <td className="pubg-squad-name">
                    {squad.name}
                  </td>

                  <td>{squad.group}</td>
                  <td>{squad.kills}</td>
                  <td>{squad.placement}</td>

                  <td className="pubg-score">
                    {squad.total}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <footer className="pubg-footer">
        <p>
          Created by Dinh Nhat Bao Nhi
        </p>

        <p>
          React 19 · Optimistic UI · AbortController
        </p>
      </footer>
    </main>
  );
}
