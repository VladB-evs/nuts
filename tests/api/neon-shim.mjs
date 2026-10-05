// Stands in for @neondatabase/serverless: same tagged-template + .transaction() surface, backed by PGlite.
// Every statement runs as the restricted `nuts_app` role, exactly like production.
const toText = (strings) => strings.reduce((acc, s, i) => acc + s + (i < strings.length - 1 ? `$${i + 1}` : ''), '');

const run = async (runner, strings, values) => {
  const res = await runner.query(toText(strings), values);
  return res.rows;
};

export const neon = () => {
  const mk = (strings, ...values) => {
    const q = { __strings: strings, __values: values };
    q.then = (res, rej) => run(globalThis.__db, strings, values).then(res, rej);
    q.catch = (rej) => q.then(undefined, rej);
    return q;
  };
  mk.transaction = async (queries) => {
    return globalThis.__db.transaction(async (tx) => {
      await tx.exec('SET LOCAL ROLE nuts_app');
      const out = [];
      for (const q of queries) out.push(await run(tx, q.__strings, q.__values));
      return out;
    });
  };
  return mk;
};
