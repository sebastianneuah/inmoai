// Finanzas: estado de resultados, flujo de caja, balance, deuda, presupuesto y patrocinadores.
import React, { useState } from 'react';
import { useGame } from '../store';
import { Card, Empty, KPI, Money, Tabs } from '../components';
import { userClub } from '../../engine/queries';
import { CAT_LABEL, INCOME_CATS, EXPENSE_CATS, annualProjection, balanceSheet, loanOffer, takeLoan, refinance, prepayLoan, totalDebt, institutionCash, creditLine } from '../../engine/economy';
import { setTicketMult, setFeeMult, setTransferBudget, setWageCap, toggleEmergency, reduceCosts, sellAsset, seekInvestors, approveBudget, publishBalance } from '../../engine/actions';
import { personalContribution } from '../../engine/game';
import { acceptSponsor, negotiateSponsor, rejectSponsor, terminateSponsor, SLOT_INFO, controversyText } from '../../engine/sponsors';
import { money } from '../../engine/util';
import { rngOf } from '../../engine/rng';
import { squadWageAnnual } from '../../engine/valuation';
import type { LedgerCat } from '../../engine/types';

export function Finance() {
  const { s } = useGame();
  const club = s.president.pos === 'club';
  const [tab, setTab] = useState<'resultados' | 'flujo' | 'balance' | 'deuda' | 'presupuesto' | 'sponsors'>('resultados');
  return (
    <>
      <div className="page-h"><div><h1>Finanzas</h1><div className="sub">El dinero del club y tu patrimonio personal (<Money v={s.president.wealth} />) están separados.</div></div></div>
      <Tabs tabs={[{ id: 'resultados', label: 'Estado de resultados' }, { id: 'flujo', label: 'Flujo de caja', hidden: !club }, { id: 'balance', label: 'Balance', hidden: !club }, { id: 'deuda', label: 'Deuda y préstamos', hidden: !club }, { id: 'presupuesto', label: 'Presupuesto y medidas', hidden: !club }, { id: 'sponsors', label: 'Patrocinadores', hidden: !club }]} value={club ? tab : 'resultados'} onChange={setTab} />
      {(tab === 'resultados' || !club) && <Results />}
      {club && tab === 'flujo' && <CashFlow />}
      {club && tab === 'balance' && <Balance />}
      {club && tab === 'deuda' && <Debt />}
      {club && tab === 'presupuesto' && <Budget />}
      {club && tab === 'sponsors' && <Sponsors />}
    </>
  );
}

function Results() {
  const { s } = useGame();
  const proj = annualProjection(s);
  const L = s.ledger;
  const inc = INCOME_CATS.reduce((a, k) => a + Math.max(0, L[k] ?? 0), 0);
  const exp = EXPENSE_CATS.reduce((a, k) => a + Math.min(0, L[k] ?? 0), 0);
  const prev = s.ledgerHistory[s.ledgerHistory.length - 1];
  const Row = ({ k }: { k: LedgerCat }) => {
    const v = L[k] ?? 0;
    const p = prev?.data[k] ?? 0;
    if (!v && !p) return null;
    return <tr><td>{CAT_LABEL[k]}</td><td className="r"><Money v={v} className={v > 0 ? 'pos' : v < 0 ? 'neg' : ''} /></td><td className="r muted"><Money v={p} /></td></tr>;
  };
  return (
    <div className="stack-m">
      <div className="grid g4">
        <KPI label="Ingresos (temporada)" value={<Money v={inc} />} color="var(--green)" />
        <KPI label="Egresos (temporada)" value={<Money v={exp} />} color="var(--red)" />
        <KPI label="Resultado" value={<Money v={inc + exp} sign />} />
        <KPI label="Caja actual" value={<Money v={institutionCash(s)} />} color={institutionCash(s) < 0 ? 'var(--red)' : undefined} />
      </div>
      <div className="grid g2 stack">
        <Card title="Ingresos">
          <div className="table-wrap"><table className="t"><thead><tr><th>Concepto</th><th className="r">{s.season}</th><th className="r">{prev?.season ?? 'Anterior'}</th></tr></thead><tbody>{INCOME_CATS.map((k) => <Row key={k} k={k} />)}</tbody></table></div>
        </Card>
        <Card title="Egresos">
          <div className="table-wrap"><table className="t"><thead><tr><th>Concepto</th><th className="r">{s.season}</th><th className="r">{prev?.season ?? 'Anterior'}</th></tr></thead><tbody>{EXPENSE_CATS.map((k) => <Row key={k} k={k} />)}</tbody></table></div>
        </Card>
      </div>
      {proj && (
        <Card title="Proyección anual (presupuesto base)">
          <div className="grid g2 stack">
            <div>{Object.entries(proj.incomes).map(([k, v]) => <div key={k} className="list-row small"><span className="grow">{CAT_LABEL[k as LedgerCat]}</span><Money v={v} className="pos" /></div>)}<div className="list-row"><b className="grow">Total ingresos recurrentes</b><b><Money v={proj.inc} /></b></div></div>
            <div>{Object.entries(proj.expenses).map(([k, v]) => <div key={k} className="list-row small"><span className="grow">{CAT_LABEL[k as LedgerCat]}</span><Money v={-v} className="neg" /></div>)}<div className="list-row"><b className="grow">Total egresos estructurales</b><b><Money v={-proj.exp} /></b></div></div>
          </div>
          <div className="row between mt"><span className="muted small">No incluye premios, ventas de jugadores, fichajes, viajes, seguridad ni acontecimientos.</span><b>Resultado proyectado: <Money v={proj.net} sign /></b></div>
          <div className="small muted mt-s">Masa salarial anual: {money(squadWageAnnual(s, userClub(s)!.id))} ({Math.round((squadWageAnnual(s, userClub(s)!.id) / Math.max(1, proj.inc)) * 100)}% de los ingresos recurrentes).</div>
        </Card>
      )}
    </div>
  );
}

function CashFlow() {
  const { s } = useGame();
  const h = s.cashHistory.slice(-60);
  if (h.length < 2) return <Card><Empty>El flujo de caja se grafica a medida que avanzan las semanas.</Empty></Card>;
  const W = 600, H = 180, P = 8;
  const vals = h.flatMap((x) => [x.cash, -x.debt]);
  const min = Math.min(0, ...vals), max = Math.max(1, ...vals);
  const X = (i: number) => P + (i / (h.length - 1)) * (W - 2 * P);
  const Y = (v: number) => H - P - ((v - min) / (max - min)) * (H - 2 * P);
  const path = (f: (x: (typeof h)[0]) => number) => h.map((x, i) => `${i ? 'L' : 'M'}${X(i).toFixed(1)},${Y(f(x)).toFixed(1)}`).join(' ');
  return (
    <div className="stack-m">
      <Card title="Caja y deuda (últimas semanas)" right={<span className="row gap-s small"><span className="chip green">Caja</span><span className="chip red">Deuda</span></span>}>
        <svg className="spark" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" role="img" aria-label="Evolución de caja y deuda">
          <line x1={P} x2={W - P} y1={Y(0)} y2={Y(0)} stroke="rgba(255,255,255,.15)" strokeDasharray="4 4" />
          <path d={path((x) => x.cash)} fill="none" stroke="var(--green)" strokeWidth="2.2" vectorEffect="non-scaling-stroke" />
          <path d={path((x) => -x.debt)} fill="none" stroke="var(--red)" strokeWidth="2" vectorEffect="non-scaling-stroke" />
        </svg>
        <div className="row between small muted"><span>Mín. {money(min)}</span><span>Máx. {money(max)}</span></div>
      </Card>
      <Card title="Movimientos por temporada">
        <div className="table-wrap"><table className="t"><thead><tr><th>Temporada</th><th className="r">Ingresos</th><th className="r">Egresos</th><th className="r">Resultado</th></tr></thead><tbody>
          {[...s.ledgerHistory].reverse().map((x) => {
            const i = Object.values(x.data).filter((v) => (v ?? 0) > 0).reduce((a, v) => a + (v ?? 0), 0);
            const e = Object.values(x.data).filter((v) => (v ?? 0) < 0).reduce((a, v) => a + (v ?? 0), 0);
            return <tr key={x.season}><td>{x.season}</td><td className="r pos">{money(i)}</td><td className="r neg">{money(e)}</td><td className="r"><Money v={i + e} sign /></td></tr>;
          })}
          {s.ledgerHistory.length === 0 && <tr><td colSpan={4} className="muted">Aún no cerró ninguna temporada.</td></tr>}
        </tbody></table></div>
      </Card>
    </div>
  );
}

function Balance() {
  const { s } = useGame();
  const b = balanceSheet(s)!;
  return (
    <div className="grid g2 stack">
      <Card title="Activo">
        <div className="list-row"><span className="grow">Estadio</span><Money v={b.stadium} /></div>
        <div className="list-row"><span className="grow">Instalaciones</span><Money v={b.facilities} /></div>
        <div className="list-row"><span className="grow">Plantel (valor contable)</span><Money v={b.players} /></div>
        <div className="list-row"><span className="grow">Caja</span><Money v={b.cash} /></div>
        <div className="list-row"><b className="grow">Total activo</b><b><Money v={b.assets} /></b></div>
      </Card>
      <Card title="Pasivo y patrimonio">
        <div className="list-row"><span className="grow">Préstamos</span><Money v={b.loans} /></div>
        <div className="list-row"><span className="grow">Deudas comerciales</span><Money v={b.payables} /></div>
        <div className="list-row"><span className="grow">Descubierto bancario</span><Money v={b.overdraft} /></div>
        <div className="list-row"><b className="grow">Total pasivo</b><b><Money v={b.liabilities} /></b></div>
        <div className="list-row"><b className="grow gold">Patrimonio institucional</b><b><Money v={b.equity} className={b.equity < 0 ? 'neg' : 'pos'} /></b></div>
      </Card>
    </div>
  );
}

function Debt() {
  const { s, act } = useGame();
  const off = loanOffer(s);
  const c = userClub(s)!;
  const [amt, setAmt] = useState(off ? Math.round(off.max / 2 / 50_000) * 50_000 : 0);
  return (
    <div className="stack-m">
      <div className="grid g3">
        <KPI label="Deuda total" value={<Money v={totalDebt(s)} />} />
        <KPI label="Descubierto disponible" value={<Money v={creditLine(s, c)} />} sub="Más allá, los sueldos se atrasan" />
        <KPI label="Estabilidad financiera" value={Math.round(s.ind.estabilidad)} sub="Define tasa y monto de crédito" />
      </div>
      <Card title="Préstamos vigentes">
        {s.loans.length === 0 && <Empty>Sin préstamos.</Empty>}
        {s.loans.map((l) => (
          <div key={l.id} className="list-row wrap">
            <div className="grow"><b>{l.lender}</b><div className="small muted">Saldo {money(l.balance)} · Tasa {(l.rate * 100).toFixed(1)}% · {l.weeksLeft} semanas · cuota {money(l.payment)}/sem.</div></div>
            <button className="btn sm" onClick={() => act((g) => refinance(g, l.id), { toast: true })}>Refinanciar</button>
            <button className="btn sm" onClick={() => act((g) => prepayLoan(g, l.id, Math.min(l.balance, Math.max(0, g.clubs[g.president.clubId!].fin.cash * 0.5))), { toast: true })}>Cancelar parte</button>
          </div>
        ))}
      </Card>
      <Card title="Solicitar un préstamo">
        {off && off.max > 0 ? (
          <>
            <div className="small muted">{off.lender} ofrece hasta {money(off.max)} al {(off.rate * 100).toFixed(1)}% anual, a {off.weeks} semanas.</div>
            <label className="field mt">Monto: {money(amt)}<input type="range" min={50_000} max={Math.max(50_000, off.max)} step={50_000} value={Math.min(amt, off.max)} onChange={(e) => setAmt(Number(e.target.value))} /></label>
            <button className="btn gold mt" onClick={() => act((g) => takeLoan(g, Math.min(amt, off.max)), { toast: true })}>Tomar préstamo</button>
          </>
        ) : <div className="neg small">Ningún banco presta dinero con la estabilidad financiera actual.</div>}
      </Card>
    </div>
  );
}

function Budget() {
  const { s, act, push } = useGame();
  const c = userClub(s)!;
  const [contrib, setContrib] = useState(Math.min(500_000, Math.round(s.president.wealth / 4 / 50_000) * 50_000));
  const Action = ({ title, desc, label, onClick, danger }: { title: string; desc: string; label: string; onClick: () => void; danger?: boolean }) => (
    <div className="list-row wrap"><div className="grow"><b>{title}</b><div className="small muted">{desc}</div></div><button className={`btn sm ${danger ? 'danger' : ''}`} onClick={onClick}>{label}</button></div>
  );
  return (
    <div className="stack-m">
      <div className="grid g2 stack">
        <Card title="Precios">
          <label className="field">Precio de entradas: {Math.round(s.economy.ticketMult * 100)}% del valor base<input type="range" min={0.5} max={2} step={0.05} value={s.economy.ticketMult} onChange={(e) => act((g) => setTicketMult(g, Number(e.target.value)))} /></label>
          <div className="small muted">Más caro: más recaudación por espectador, menos público y menos apoyo de los hinchas.</div>
          <label className="field mt">Cuota social: {Math.round(s.economy.feeMult * 100)}% del valor base<input type="range" min={0.5} max={2} step={0.05} value={s.economy.feeMult} onChange={(e) => act((g) => setFeeMult(g, Number(e.target.value)))} /></label>
          <div className="small muted">Más cara: más ingresos, pero baja el cobro efectivo y el apoyo de los socios.</div>
        </Card>
        <Card title="Fútbol profesional">
          <label className="field">Presupuesto de fichajes: {money(s.economy.transferBudget)}<input type="range" min={0} max={Math.max(100_000, Math.round(Math.max(0, c.fin.cash) / 10_000) * 10_000)} step={10_000} value={Math.min(s.economy.transferBudget, Math.max(100_000, c.fin.cash))} onChange={(e) => act((g) => setTransferBudget(g, Number(e.target.value)))} /></label>
          <div className="small muted">Lo usa el director deportivo cuando delegás el mercado.</div>
          <label className="field mt">Tope salarial por jugador: {s.economy.wageCap ? `${money(s.economy.wageCap)}/mes` : 'sin tope'}<input type="range" min={0} max={200_000} step={1_000} value={s.economy.wageCap} onChange={(e) => act((g) => setWageCap(g, Number(e.target.value)))} /></label>
        </Card>
      </div>
      <Card title="Medidas presidenciales">
        <Action title="Aprobar el presupuesto anual" desc={s.economy.budgetApproved === s.season ? 'Ya aprobado esta temporada.' : 'Requiere el apoyo de la comisión directiva. Refuerza la gobernabilidad.'} label="Someter a votación" onClick={() => act((g) => approveBudget(g), { toast: true })} />
        <Action title="Publicar balances" desc="Transparencia: suma integridad; los socios juzgan los números." label="Publicar" onClick={() => act((g) => publishBalance(g), { toast: true })} />
        <Action title="Reducir gastos de estructura" desc="−10% en sueldos de empleados. Malestar gremial." label="Recortar" onClick={() => act((g) => reduceCosts(g), { toast: true })} />
        <Action title="Vender un activo inmobiliario" desc="Ingreso inmediato; los socios lo rechazan y se pierde un nivel de instalaciones sociales." label="Vender" onClick={() => push({ type: 'confirm', title: 'Vender un activo', body: 'Venderás un predio del club. Los socios lo tomarán muy mal.', ok: 'Vender', danger: true, onOk: () => act((g) => sellAsset(g), { toast: true }) })} />
        <Action title="Buscar inversores" desc="Abrís la puerta a fondos privados. Puede derivar en un gerenciamiento." label="Convocar" onClick={() => act((g) => seekInvestors(g, rngOf(g)), { toast: true })} />
        <Action title={s.economy.emergency ? 'Levantar la emergencia económica' : 'Declarar la emergencia económica'} desc="Sueldos de jugadores −10% y congelamiento de aumentos. Impacto en el plantel, empleados y patrocinadores." label={s.economy.emergency ? 'Levantar' : 'Declarar'} danger={!s.economy.emergency} onClick={() => act((g) => toggleEmergency(g), { toast: true })} />
      </Card>
      <Card title="Aporte de tu patrimonio personal">
        <div className="small muted">Patrimonio disponible: {money(s.president.wealth)}. El aporte es una donación al club.</div>
        {s.president.wealth >= 50_000 ? (
          <>
            <label className="field mt">Monto: {money(contrib)}<input type="range" min={50_000} max={Math.max(50_000, Math.round(s.president.wealth / 50_000) * 50_000)} step={50_000} value={contrib} onChange={(e) => setContrib(Number(e.target.value))} /></label>
            <button className="btn gold mt" onClick={() => act((g) => personalContribution(g, contrib), { toast: true })}>Aportar</button>
          </>
        ) : <div className="small neg mt-s">Tu patrimonio no alcanza para un aporte.</div>}
      </Card>
    </div>
  );
}

function Sponsors() {
  const { s, act } = useGame();
  return (
    <div className="stack-m">
      <Card title="Contratos vigentes">
        {s.sponsors.length === 0 && <Empty>No hay patrocinadores. Revisá las ofertas.</Empty>}
        {s.sponsors.map((sc) => {
          const co = s.companies[sc.companyId];
          return (
            <div key={sc.id} className="list-row wrap">
              <div className="grow"><b>{co.name}</b> <span className="chip">{SLOT_INFO[sc.slot].name}</span><div className="small muted">{co.sector} · {money(sc.annual)}/año · hasta {sc.until} · bono por título {money(sc.bonus)} · {controversyText(co)}</div></div>
              <button className="btn sm danger" onClick={() => act((g) => terminateSponsor(g, sc.id), { toast: true })}>Rescindir ({money(sc.penalty)})</button>
            </div>
          );
        })}
      </Card>
      <Card title="Ofertas recibidas">
        {s.sponsorOffers.length === 0 && <Empty>No hay ofertas por ahora. Llegan al comienzo de temporada y cada pocas semanas; mejoran con tu reputación y la confianza de los patrocinadores.</Empty>}
        {s.sponsorOffers.map((o) => {
          const co = s.companies[o.companyId];
          return (
            <div key={o.id} className="list-row wrap" style={{ alignItems: 'flex-start' }}>
              <div className="grow">
                <b>{co.name}</b> <span className="chip">{SLOT_INFO[o.slot].name}</span> <span className={`chip ${co.controversy >= 50 ? 'red' : co.reputation >= 75 ? 'green' : ''}`}>{controversyText(co)}</span>
                <div className="small muted">{co.sector} · <b className="gold">{money(o.annual)}/año</b> por {o.years} {o.years === 1 ? 'año' : 'años'} · bono {money(o.bonus)} · penalidad {money(o.penalty)}</div>
                <div className="small muted">{co.demand}</div>
              </div>
              <div className="row gap-s">
                <button className="btn sm success" disabled={s.sponsors.some((x) => x.slot === o.slot)} onClick={() => act((g) => acceptSponsor(g, o.id), { toast: true })}>Firmar</button>
                <button className="btn sm" disabled={o.negotiated} onClick={() => act((g) => negotiateSponsor(g, rngOf(g), o.id), { toast: true })}>Negociar</button>
                <button className="btn sm ghost" onClick={() => act((g) => rejectSponsor(g, o.id), { toast: true })}>Rechazar</button>
              </div>
            </div>
          );
        })}
      </Card>
    </div>
  );
}
