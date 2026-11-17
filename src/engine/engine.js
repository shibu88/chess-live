// Stockfish 19 lite (single-threaded) over one Web Worker, speaking UCI (SPEC
// §5.5). Adapted from the chess-hub engine wrapper. Streaming API: init(),
// analyse(fen,{depth}), stop(), onInfo(cb), terminate().

export const ENGINE_URL = '/engine/stockfish-19-lite-single.js';

function parseScore(line) {
  const m = line.match(/score (cp|mate) (-?\d+)/);
  return m ? { type: m[1], value: Number(m[2]) } : null;
}

// `info … depth D … score cp|mate V … pv m1 m2 …` → { depth, score, pvUci }.
// Ignores info lines without a score+pv (score is from the side to move).
function parseInfoLine(line) {
  if (!line.startsWith('info ')) return null;
  const score = parseScore(line);
  const pvM = line.match(/\bpv (.+)$/);
  if (!score || !pvM) return null;
  const depthM = line.match(/\bdepth (\d+)/);
  return {
    depth: depthM ? Number(depthM[1]) : 0,
    score,
    pvUci: pvM[1].trim().split(/\s+/),
  };
}

export class Engine {
  constructor() {
    this.worker = null;
    this.ready = false;
    this.searching = false;
    this.currentFen = null;
    this._rawListeners = new Set(); // for the handshake _await
    this._infoCbs = new Set();
    this._bestmoveWaiters = [];
    this._lastInfo = null;
    this._searchResolve = null;
  }

  _emit(line) {
    for (const fn of [...this._rawListeners]) fn(line);
  }

  _await(pred, timeoutMs) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        off();
        reject(new Error('Engine timed out'));
      }, timeoutMs);
      const off = (() => {
        const fn = (line) => {
          if (pred(line)) {
            clearTimeout(timer);
            this._rawListeners.delete(fn);
            resolve(line);
          }
        };
        this._rawListeners.add(fn);
        return () => this._rawListeners.delete(fn);
      })();
    });
  }

  _awaitBestmove() {
    return new Promise((res) => {
      if (!this.searching) return res();
      this._bestmoveWaiters.push(res);
    });
  }

  send(cmd) {
    if (this.worker) this.worker.postMessage(cmd);
  }

  _handleLine(line) {
    this._emit(line);
    if (line.startsWith('info ')) {
      const info = parseInfoLine(line);
      if (info) {
        this._lastInfo = info;
        for (const cb of [...this._infoCbs]) {
          cb({ depth: info.depth, score: info.score, pvUci: info.pvUci, fen: this.currentFen });
        }
      }
    } else if (line.startsWith('bestmove')) {
      this.searching = false;
      const info = this._lastInfo;
      const resolve = this._searchResolve;
      this._searchResolve = null;
      const waiters = this._bestmoveWaiters;
      this._bestmoveWaiters = [];
      for (const w of waiters) w();
      if (resolve) resolve(info);
    }
  }

  /** Start the worker and complete the UCI handshake. */
  async init() {
    if (this.worker) return;
    this.worker = new Worker(ENGINE_URL);
    this.worker.onmessage = (e) => {
      const line = typeof e.data === 'string' ? e.data : (e.data && e.data.data) || '';
      if (line) this._handleLine(line);
    };
    this.worker.onerror = () => this._emit('__error__');

    this.send('uci');
    await this._await((l) => l === 'uciok' || l === '__error__', 20000);
    this.send('isready');
    await this._await((l) => l === 'readyok' || l === '__error__', 20000);
    this.send('ucinewgame');
    this.send('isready');
    await this._await((l) => l === 'readyok' || l === '__error__', 20000);
    this.ready = true;
  }

  /**
   * Analyse `fen` to `depth`. Stops any running search first. Streams info via
   * onInfo; the returned promise resolves with the final { depth, score, pvUci }
   * on `bestmove`.
   */
  async analyse(fen, { depth = 22 } = {}) {
    if (this.searching) {
      this.send('stop');
      await this._awaitBestmove();
    }
    this.currentFen = fen;
    this.searching = true;
    this._lastInfo = null;
    const done = new Promise((res) => {
      this._searchResolve = res;
    });
    this.send(`position fen ${fen}`);
    this.send(`go depth ${depth}`);
    return done;
  }

  /** Stop the active search (bestmove still arrives). */
  async stop() {
    if (this.searching) {
      this.send('stop');
      await this._awaitBestmove();
    }
  }

  /** Register an info listener; returns an unsubscribe fn. */
  onInfo(cb) {
    this._infoCbs.add(cb);
    return () => this._infoCbs.delete(cb);
  }

  terminate() {
    if (!this.worker) return;
    try {
      this.send('quit');
    } catch {
      /* ignore */
    }
    this.worker.terminate();
    this.worker = null;
    this.ready = false;
    this.searching = false;
    this._rawListeners.clear();
    this._infoCbs.clear();
    this._bestmoveWaiters = [];
  }
}
