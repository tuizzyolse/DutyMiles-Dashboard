import { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { db } from "./firebaseConfig";

const THRESHOLD = 30;

function fmtTime(ts) {
  if (!ts) return "-";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleString();
}
const num = (v, digits = 2) => (typeof v === "number" ? v.toFixed(digits) : "-");

function resultOf(s) {
  if (s.flagged === true) return { label: "FLAGGED", cls: "flagged" };
  if (s.status === "ON_DUTY") return { label: "On duty", cls: "duty" };
  if (s.status === "AWAITING_MILEAGE") return { label: "Awaiting mileage", cls: "other" };
  if (s.status === "COMPLETED" && typeof s.reportedKm === "number")
    return { label: "OK", cls: "ok" };
  return { label: "No report", cls: "other" };
}

export default function App() {
  const [shifts, setShifts] = useState([]);
  const [filter, setFilter] = useState("all");
  const [error, setError] = useState("");

  useEffect(() => {
    const q = query(collection(db, "shifts"), orderBy("startTime", "desc"));
    return onSnapshot(
      q,
      (snap) => setShifts(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
      (err) => setError(err.message)
    );
  }, []);

  const stats = useMemo(() => {
    const checked = shifts.filter((s) => typeof s.reportedKm === "number");
    const flagged = checked.filter((s) => s.flagged === true);
    return {
      total: shifts.length,
      onDuty: shifts.filter((s) => s.status === "ON_DUTY").length,
      checked: checked.length,
      flagged: flagged.length,
      rate: checked.length ? Math.round((flagged.length / checked.length) * 100) : 0,
      gpsKm: checked.reduce((a, s) => a + (s.gpsDistanceKm || 0), 0),
      reportedKm: checked.reduce((a, s) => a + s.reportedKm, 0),
    };
  }, [shifts]);

  const rows = useMemo(() => {
    if (filter === "flagged") return shifts.filter((s) => s.flagged === true);
    if (filter === "ok")
      return shifts.filter((s) => s.status === "COMPLETED" && s.flagged === false);
    if (filter === "duty") return shifts.filter((s) => s.status === "ON_DUTY");
    return shifts;
  }, [shifts, filter]);

  return (
    <div className="wrap">
      <h1>DutyMiles Manager Dashboard</h1>
      <p className="sub">
        Live shifts from riders. Entries are flagged when reported mileage differs from
        the GPS-based reference by more than {THRESHOLD}%.
      </p>

      <div className="stats">
        <div className="stat"><div className="label">Total shifts</div><div className="value">{stats.total}</div></div>
        <div className="stat"><div className="label">On duty now</div><div className="value">{stats.onDuty}</div></div>
        <div className="stat"><div className="label">Mileage checked</div><div className="value">{stats.checked}</div></div>
        <div className={"stat" + (stats.flagged ? " alert" : "")}><div className="label">Flagged</div><div className="value">{stats.flagged}</div></div>
        <div className="stat"><div className="label">Flag rate</div><div className="value">{stats.rate}%</div></div>
        <div className="stat"><div className="label">Reported / GPS km</div><div className="value">{stats.reportedKm.toFixed(1)} / {stats.gpsKm.toFixed(1)}</div></div>
      </div>

      <div className="filters">
        {[
          ["all", "All"],
          ["flagged", "Flagged"],
          ["ok", "OK"],
          ["duty", "On duty"],
        ].map(([key, label]) => (
          <button key={key} className={filter === key ? "active" : ""} onClick={() => setFilter(key)}>
            {label}
          </button>
        ))}
      </div>

      <div className="tablewrap">
        {error && <div className="error">Could not load shifts: {error}</div>}
        {!error && rows.length === 0 && <div className="empty">No shifts to show yet.</div>}
        {rows.length > 0 && (
          <table>
            <thead>
              <tr>
                <th>Rider</th>
                <th>Started</th>
                <th>GPS km</th>
                <th>Reported km</th>
                <th>Reference km</th>
                <th>Gap</th>
                <th>Result</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((s) => {
                const r = resultOf(s);
                return (
                  <tr key={s.id} className={s.flagged ? "flagged" : ""}>
                    <td>{s.riderEmail || s.riderId || "-"}</td>
                    <td>{fmtTime(s.startTime)}</td>
                    <td>{num(s.gpsDistanceKm)}</td>
                    <td>{num(s.reportedKm)}</td>
                    <td>
                      {num(s.referenceKm)}
                      {s.isRoundTrip ? " (round trip)" : ""}
                    </td>
                    <td>{typeof s.gapPct === "number" ? s.gapPct.toFixed(0) + "%" : "-"}</td>
                    <td><span className={"badge " + r.cls}>{r.label}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
      <p className="note">
        Round trips (start and end at nearly the same place) are checked against distance
        estimated from shift duration, because GPS distance is near zero.
      </p>
    </div>
  );
}