// 驗算 PMT / PV / FV:三種算法互相代回,結果必須一致。
const fs = require('fs');
const path = require('path');
const assert = require('assert');

const src = fs.readFileSync(path.join(__dirname, '../public/app.js'), 'utf8');
const calc = src.match(/\/\/ <calc>([\s\S]*?)\/\/ <\/calc>/)[1];
const { solve, path: growth, retireTarget } = new Function(
  calc + '; return { solve, path, retireTarget };'
)();

const near = (a, b, tol = 0.5) => assert.ok(Math.abs(a - b) <= tol, `${a} vs ${b}`);

for (const due of [0, 1]) {
  const T = 25_000_000, n = 300, a = 0.05, pv0 = 1_000_000;
  const p = solve('pmt', a, n, due, T, pv0, 0);
  near(solve('fv', a, n, due, T, pv0, p.pmt).fv, T);
  near(solve('pv', a, n, due, T, 0, p.pmt).pv, pv0);
  near(growth(pv0, p.pmt, a, n, due)[n].bal, T);
}

near(solve('pmt', 0, 120, 0, 1_200_000, 0, 0).pmt, 10_000, 1e-6); // 零利率
const r = retireTarget(50000, 0.02, 0.03, 25, 30);
assert.ok(r.target > 0 && r.months === 360);

console.log('全部測試通過');
