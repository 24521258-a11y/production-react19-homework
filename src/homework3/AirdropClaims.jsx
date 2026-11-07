
import {
  useEffect,
  useReducer,
  useRef,
  useState,
} from 'react';

import { simulateAirdropRequest } from './airdropApi';
import './AirdropClaims.css';

const INITIAL_STATE = {
  tickets: 0,
  cratesOpened: 0,
  pending: false,
  status: 'Ready to claim an airdrop ticket.',
  error: '',
};

function claimReducer(state, action) {
  switch (action.type) {
    case 'CLAIM_OPTIMISTIC':
      return {
        ...state,
        tickets: state.tickets + 1,
        pending: true,
        status: 'Claim pending — optimistic +1 ticket.',
        error: '',
      };

    case 'OPEN_OPTIMISTIC':
      return {
        ...state,
        tickets: state.tickets - 1,
        cratesOpened: state.cratesOpened + 1,
        pending: true,
        status: 'Crate opening — optimistic update.',
        error: '',
      };

    case 'CONFIRMED':
      return {
        ...state,
        pending: false,
        status: `${action.name} confirmed by demo server.`,
        error: '',
      };

    case 'ROLLBACK':
      return {
        ...state,
        tickets: action.snapshot.tickets,
        cratesOpened: action.snapshot.cratesOpened,
        pending: false,
        status: `${action.name} rolled back.`,
        error: action.message,
      };

    case 'CANCELLED':
      return {
        ...state,
        tickets: action.snapshot.tickets,
        cratesOpened: action.snapshot.cratesOpened,
        pending: false,
        status: 'Pending request cancelled and rolled back.',
        error: '',
      };

    default:
      return state;
  }
}

export default function AirdropClaims() {
  const [state, dispatch] = useReducer(
    claimReducer,
    INITIAL_STATE
  );

  const [outcome, setOutcome] = useState('success');

  const stateRef = useRef(state);
  const pendingRef = useRef(null);

  // Keep latest balances available to request handlers.
  stateRef.current = state;

  useEffect(() => {
    return () => {
      pendingRef.current?.abort();
      pendingRef.current = null;
    };
  }, []);

  async function runTransaction(actionName) {
    // Only one pending request at a time.
    // Avoids stale snapshots and rollback races.
    if (pendingRef.current) return;

    const current = stateRef.current;

    if (actionName === 'Open Crate' && current.tickets < 1) {
      dispatch({
        type: 'ROLLBACK',
        name: actionName,
        snapshot: current,
        message: 'You need at least one ticket to open a crate.',
      });
      return;
    }

    const controller = new AbortController();
    pendingRef.current = controller;

    const snapshot = {
      tickets: current.tickets,
      cratesOpened: current.cratesOpened,
    };

    dispatch({
      type:
        actionName === 'Claim Ticket'
          ? 'CLAIM_OPTIMISTIC'
          : 'OPEN_OPTIMISTIC',
    });

    try {
      await simulateAirdropRequest({
        action: actionName,
        outcome,
        signal: controller.signal,
      });

      if (pendingRef.current !== controller) return;

      dispatch({
        type: 'CONFIRMED',
        name: actionName,
      });
    } catch (error) {
      if (pendingRef.current !== controller) return;

      if (error.name === 'AbortError') {
        dispatch({
          type: 'CANCELLED',
          snapshot,
        });
      } else {
        dispatch({
          type: 'ROLLBACK',
          name: actionName,
          snapshot,
          message:
            error.status === 409
              ? 'HTTP 409 Conflict — previous balance restored.'
              : 'Request failed — previous balance restored.',
        });
      }
    } finally {
      if (pendingRef.current === controller) {
        pendingRef.current = null;
      }
    }
  }

  function cancelPending() {
    pendingRef.current?.abort();
  }

  return (
    <section
      className="claim-panel"
      aria-labelledby="claim-heading"
    >
      <div className="claim-heading">
        <div>
          <p className="pubg-kicker">
            AIRDROP REWARDS
          </p>
          <h2 id="claim-heading">
            Ticket & Crate Arena
          </h2>
          <p>
            Optimistic updates with simulated
            server confirmation and 409 rollback.
          </p>
        </div>
        <span className="claim-demo-tag">
          MOCK API
        </span>
      </div>

      <div className="claim-stats">
        <article>
          <span>Available Tickets</span>
          <strong>{state.tickets}</strong>
        </article>

        <article>
          <span>Crates Opened</span>
          <strong>{state.cratesOpened}</strong>
        </article>

        <article>
          <span>Request</span>
          <strong>
            {state.pending ? 'PENDING' : 'IDLE'}
          </strong>
        </article>
      </div>

      <div className="claim-controls">
        <label htmlFor="claim-outcome">
          Simulated server response
          <select
            id="claim-outcome"
            value={outcome}
            disabled={state.pending}
            onChange={(event) =>
              setOutcome(event.target.value)
            }
          >
            <option value="success">
              200 OK — Success
            </option>
            <option value="conflict">
              409 Conflict — Rollback
            </option>
          </select>
        </label>

        <div className="claim-actions">
          <button
            type="button"
            className="claim-primary"
            onClick={() => runTransaction('Claim Ticket')}
            disabled={state.pending}
          >
            Claim Ticket
          </button>

          <button
            type="button"
            className="claim-primary"
            onClick={() => runTransaction('Open Crate')}
            disabled={state.pending || state.tickets < 1}
          >
            Open Crate (1 Ticket)
          </button>

          <button
            type="button"
            className="claim-secondary"
            onClick={cancelPending}
            disabled={!state.pending}
          >
            Cancel Request
          </button>
        </div>
      </div>

      <div
        className="claim-status"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        <strong>
          {state.pending ? 'Processing' : 'Status'}
        </strong>
        <p>{state.status}</p>
        {state.error && (
          <p className="claim-error">
            {state.error}
          </p>
        )}
      </div>

      <p className="claim-note">
        Demo only: rewards and balances are stored in
        React state, not in a real PUBG account.
      </p>
    </section>
  );
}
