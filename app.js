const FILES = {
  krEquity: "data/kr_equity.csv",
  krPositions: "data/kr_positions.json",
  pmEquity: "data/pm_equity.csv",
  pmTrades: "data/pm_trades.json",
};

const KR_BASELINE_SUFFIX = "-10-16";

const chartFont = '"Pretendard", "Apple SD Gothic Neo", "Noto Sans KR", sans-serif';

function h(tag, props, ...children) {
  const node = document.createElement(tag);
  if (props) {
    for (const [key, value] of Object.entries(props)) {
      if (value == null || value === false) continue;
      if (key === "class") node.className = value;
      else if (key === "text") node.textContent = String(value);
      else node.setAttribute(key, String(value));
    }
  }
  for (const child of children.flat()) {
    if (child == null || child === false) continue;
    node.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
  return node;
}

async function fetchText(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`${url} 을 읽지 못했습니다 (${response.status}).`);
  }
  return response.text();
}

function parseCsv(text) {
  const lines = text.replace(/^\uFEFF/, "").trim().split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map((cell) => cell.trim());
  return lines.slice(1).map((line) => {
    const cols = line.split(",");
    const row = {};
    headers.forEach((header, index) => {
      const raw = (cols[index] ?? "").trim();
      const numeric = Number(raw);
      row[header] = raw !== "" && Number.isFinite(numeric) ? numeric : raw;
    });
    return row;
  });
}

function fmtDate(value) {
  const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);
  return match ? `${match[1]}.${match[2]}.${match[3]}` : String(value ?? "—");
}

function fmtShort(value) {
  const match = String(value).match(/^\d{4}-(\d{2})-(\d{2})/);
  return match ? `${match[1]}-${match[2]}` : String(value ?? "—");
}

function fmtDateTime(value) {
  const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}:\d{2}))?/);
  if (!match) return String(value ?? "—");
  const day = `${match[1]}.${match[2]}.${match[3]}`;
  return match[4] ? `${day} ${match[4]}` : day;
}

function fmtPct(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return "—";
  const sign = number > 0 ? "+" : "";
  const body = number.toLocaleString("ko-KR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${sign}${body}%`;
}

function fmtKrw(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return "—";
  return `${Math.round(number).toLocaleString("ko-KR")}원`;
}

function fmtUsd(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return "—";
  return number.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

function fmtPlain(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return "—";
  if (Number.isInteger(number)) return number.toLocaleString("ko-KR");
  return number.toLocaleString("ko-KR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function toneClass(value) {
  const number = Number(value);
  if (number > 0) return "up";
  if (number < 0) return "down";
  return "flat";
}

function toneColor(value) {
  const number = Number(value);
  if (number > 0) return "#ef4b4b";
  if (number < 0) return "#4c8fe0";
  return "#a7ad9e";
}

function sum(rows, key) {
  return rows.reduce((total, row) => total + Number(row[key] || 0), 0);
}

function latestDate(rows) {
  return rows.map((row) => String(row.date)).sort().at(-1) ?? "";
}

function dayNumber(iso) {
  const [year, month, day] = String(iso).split("-").map(Number);
  return Math.floor(Date.UTC(year, month - 1, day) / 86400000);
}

function shortFromDay(day) {
  const date = new Date(day * 86400000);
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const dayOfMonth = String(date.getUTCDate()).padStart(2, "0");
  return `${month}-${dayOfMonth}`;
}

function hasCalendarGap(rows) {
  for (let index = 1; index < rows.length; index += 1) {
    if (dayNumber(rows[index].date) - dayNumber(rows[index - 1].date) > 1) return true;
  }
  return false;
}

function chip(label, value) {
  return h("p", { class: "chip" }, `${label} `, h("strong", { text: value }));
}

function stat(label, value, tone, hint, hero) {
  return h(
    "article",
    { class: hero ? "stat hero" : "stat" },
    h("span", { text: label }),
    h("b", { class: tone || "flat", text: value }),
    hint ? h("small", { text: hint }) : null,
  );
}

function nameCell(name, code, meta) {
  return h(
    "div",
    { class: "name" },
    h("span", { class: "name-main", text: name }),
    h("span", { class: "code", text: code }),
    meta ? h("span", { class: "name-meta", text: meta }) : null,
  );
}

function pill(text, kind) {
  return h("span", { class: `pill pill-${kind}`, text });
}

function block(title, count, ...body) {
  return h(
    "section",
    { class: "block" },
    h("div", { class: "block-title" }, h("h3", { text: title }), h("span", { class: "count", text: count })),
    ...body,
  );
}

function renderTable(caption, headers, rows, wide) {
  const wrap = h("div", { class: "table-wrap" });
  const table = h("table", wide ? { class: "wide" } : null);
  table.append(h("caption", { class: "sr-only", text: caption }));
  table.append(
    h(
      "thead",
      null,
      h(
        "tr",
        null,
        headers.map((header) =>
          h("th", { scope: "col", class: header.className || "", text: header.text }),
        ),
      ),
    ),
  );
  const tbody = h("tbody");
  if (rows.length === 0) {
    tbody.append(
      h("tr", null, h("td", { class: "empty", colspan: String(headers.length), text: "없음" })),
    );
  } else {
    for (const row of rows) {
      tbody.append(
        h(
          "tr",
          { class: row.className || "" },
          row.cells.map((cell) => {
            const td = h("td", { class: cell.className || "" });
            td.append(cell.node ?? document.createTextNode(cell.text ?? ""));
            return td;
          }),
        ),
      );
    }
  }
  table.append(tbody);
  wrap.append(table);
  if (!wide) return wrap;
  return h(
    "div",
    { class: "wide-block" },
    h("p", { class: "scroll-hint", text: "표를 가로로 밀면 나머지 열이 보입니다." }),
    wrap,
  );
}

function textCell(text, className) {
  return { text: text ?? "—", className };
}

function nodeCell(node, className) {
  return { node, className };
}

function bookLine(fmt, bankroll, realized, marked, equity, markedLabel) {
  const implied = Number(bankroll) + Number(realized) + Number(marked);
  const gap = implied - Number(equity);
  const tolerance = fmt === fmtUsd ? 0.01 : 1;
  const sentence = `시작 원금 ${fmt(bankroll)} + 실현 ${fmt(realized)} + ${markedLabel} ${fmt(marked)} = ${fmt(implied)}`;
  if (!Number.isFinite(gap) || Math.abs(gap) >= tolerance) {
    return `${sentence}. 장부 평가금액 ${fmt(equity)}과 어긋납니다.`;
  }
  return `${sentence}. 장부 평가금액과 같습니다.`;
}

function makeBaselinePlugin(index) {
  return {
    id: "baselineMarker",
    afterDatasetsDraw(chart) {
      const point = chart.getDatasetMeta(0).data[index];
      if (!point) return;
      const { ctx, chartArea } = chart;
      ctx.save();
      ctx.beginPath();
      ctx.setLineDash([3, 3]);
      ctx.strokeStyle = "rgba(230, 179, 90, 0.9)";
      ctx.lineWidth = 1;
      ctx.moveTo(point.x, chartArea.top);
      ctx.lineTo(point.x, chartArea.bottom);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.font = `600 12px ${chartFont}`;
      ctx.fillStyle = "#e6b35a";
      ctx.textAlign = "left";
      ctx.textBaseline = "bottom";
      const x = Math.min(point.x + 8, chartArea.right - 28);
      const y = Math.max(chartArea.top + 12, point.y - 8);
      ctx.fillText("기준", x, y);
      ctx.restore();
    },
  };
}

function drawReturnChart(canvas, rows, moneyKeys, baselineIndex, dashed) {
  const points = rows.map((row) => ({ x: dayNumber(row.date), y: Number(row.return_pct) }));
  const plotWidth = Math.max((canvas.parentElement?.clientWidth || canvas.clientWidth || 320) - 64, 140);
  const values = points.map((point) => point.y);
  const min = Math.min(0, ...values);
  const max = Math.max(0, ...values);
  const span = Math.max(max - min, 1);
  const xValues = points.map((point) => point.x);
  const xMin = Math.min(...xValues);
  const xMax = Math.max(...xValues);
  const xPad = Math.max(0.8, (xMax - xMin) * 0.04);
  const colors = rows.map((row, index) =>
    index === baselineIndex ? "#e6b35a" : toneColor(row.return_pct),
  );
  const radii = rows.map((_, index) => (index === baselineIndex ? 7 : 4));

  return new Chart(canvas, {
    type: "line",
    data: {
      datasets: [
        {
          data: points,
          tension: 0,
          fill: false,
          borderColor: dashed ? "rgba(217, 211, 197, 0.55)" : "rgba(217, 211, 197, 0.92)",
          borderDash: dashed ? [5, 5] : [],
          borderWidth: 2,
          pointBackgroundColor: colors,
          pointBorderColor: colors,
          pointRadius: radii,
          pointHoverRadius: radii.map((radius) => radius + 2),
          pointHitRadius: 16,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      interaction: { mode: "nearest", intersect: false },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: "#191c16",
          borderColor: "#34392d",
          borderWidth: 1,
          titleColor: "#f4f1e8",
          bodyColor: "#f4f1e8",
          padding: 10,
          displayColors: false,
          callbacks: {
            title(items) {
              return fmtDate(rows[items[0].dataIndex].date);
            },
            label(item) {
              return `수익률 ${fmtPct(rows[item.dataIndex].return_pct)}`;
            },
            afterBody(items) {
              const row = rows[items[0].dataIndex];
              return [
                `평가금액 ${moneyKeys.equity(row[moneyKeys.equityField])}`,
                `현금 ${moneyKeys.equity(row[moneyKeys.cashField])}`,
              ];
            },
          },
        },
      },
      scales: {
        x: {
          type: "linear",
          min: xMin - xPad,
          max: xMax + xPad,
          afterBuildTicks(axis) {
            const width = Math.max(axis.right - axis.left, plotWidth);
            const span = Math.max(xMax - xMin, 1);
            const pxPerDay = width / span;
            const minGapDays = 56 / pxPerDay;
            const required = new Set([xValues[0], xValues[xValues.length - 1]]);
            if (baselineIndex >= 0) required.add(xValues[baselineIndex]);
            const kept = [];
            for (const value of xValues) {
              const previous = kept.at(-1);
              if (previous == null || required.has(value) || value - previous >= minGapDays) {
                kept.push(value);
              }
            }
            if (kept.length >= 2) {
              const last = kept.at(-1);
              const previous = kept.at(-2);
              if (last - previous < minGapDays && !required.has(previous)) kept.splice(-2, 1);
            }
            axis.ticks = kept.map((value) => ({ value }));
          },
          grid: { display: false },
          ticks: {
            color: "#a7ad9e",
            maxRotation: 0,
            autoSkip: false,
            font: { family: chartFont },
            callback: (value) => shortFromDay(value),
          },
          border: { display: false },
        },
        y: {
          suggestedMin: min - span * 0.18,
          suggestedMax: max + span * 0.28,
          ticks: {
            color: "#a7ad9e",
            font: { family: chartFont },
            callback: (value) => fmtPct(value),
          },
          grid: {
            color: (context) =>
              Math.abs(context.tick.value) < 1e-8
                ? "rgba(244, 241, 232, 0.38)"
                : "rgba(244, 241, 232, 0.06)",
          },
          border: { display: false },
        },
      },
    },
    plugins: baselineIndex >= 0 ? [makeBaselinePlugin(baselineIndex)] : [],
  });
}

function seriesCards(rows, fmtMoney, equityKey, cashKey, baselineIndex) {
  return h(
    "div",
    { class: "series-cards" },
    rows.map((row, index) => {
      const baseline = index === baselineIndex;
      const date = h("div", { class: "date-cell" }, h("span", { text: fmtDate(row.date) }));
      if (baseline) date.append(pill("기준", "base"));
      return h(
        "article",
        { class: baseline ? "series-card baseline" : "series-card" },
        date,
        h("p", null, h("span", { text: "평가금액" }), h("b", { text: fmtMoney(row[equityKey]) })),
        h("p", null, h("span", { text: "현금" }), h("b", { text: fmtMoney(row[cashKey]) })),
        h("p", null, h("span", { text: "수익률" }), h("b", { class: toneClass(row.return_pct), text: fmtPct(row.return_pct) })),
      );
    }),
  );
}

function seriesBlock(title, rows, fmtMoney, equityKey, cashKey, baselineIndex) {
  return block(
    title,
    String(rows.length),
    h("div", { class: "series-table" }, seriesTable(rows, fmtMoney, equityKey, cashKey, baselineIndex)),
    seriesCards(rows, fmtMoney, equityKey, cashKey, baselineIndex),
  );
}

function seriesTable(rows, fmtMoney, equityKey, cashKey, baselineIndex) {
  return renderTable(
    "수익률 시계열",
    [
      { text: "날짜" },
      { text: "평가금액", className: "num" },
      { text: "현금", className: "num" },
      { text: "수익률", className: "num" },
    ],
    rows.map((row, index) => {
      const baseline = index === baselineIndex;
      const date = h("div", { class: "date-cell" }, h("span", { text: fmtDate(row.date) }));
      if (baseline) date.append(pill("기준", "base"));
      return {
        className: baseline ? "baseline" : "",
        cells: [
          nodeCell(date),
          textCell(fmtMoney(row[equityKey]), "num"),
          textCell(fmtMoney(row[cashKey]), "num"),
          textCell(fmtPct(row.return_pct), `num ${toneClass(row.return_pct)}`),
        ],
      };
    }),
  );
}

function sparseCopy(rows) {
  if (rows.length === 0) return "수익률 시계열이 비어 있습니다.";
  if (rows.length >= 5) return "";
  const dates = rows.map((row) => fmtDate(row.date)).join(", ");
  const last = fmtDate(latestDate(rows));
  return `관측 시점은 ${rows.length}개(${dates})뿐입니다. 마지막 업데이트는 ${last}이며, 비어 있는 날짜는 만들지 않았습니다.`;
}

function renderKr(krEquity, book) {
  const baselineIndex = krEquity.findIndex((row) => String(row.date).endsWith(KR_BASELINE_SUFFIX));
  const baseline = baselineIndex >= 0 ? krEquity[baselineIndex] : null;
  const last = krEquity.at(-1);
  const pendingCodes = new Set((book.pending_sells || []).map((row) => row.code));
  const unrealized = sum(book.positions || [], "pnl");
  const closedSum = sum(book.closed || [], "realized");
  const realizedHint =
    closedSum === Number(book.realized) ? "청산 거래 합과 같음" : `청산 합 ${fmtKrw(closedSum)}`;
  const seriesDate = latestDate(krEquity);
  const sameDay = seriesDate === book.asof;

  const intro = baseline
    ? `${fmtDate(baseline.date)} 행을 시작 기준(수익률 ${fmtPct(baseline.return_pct)}, 평가금액 ${fmtKrw(baseline.equity_krw)})으로 표시했습니다.`
    : "10-16 기준 행을 수익률 파일에서 찾지 못했습니다.";

  const panel = h("section", { class: "panel", id: "kr" });
  panel.append(
    h(
      "div",
      { class: "panel-head" },
      h("div", null, h("p", { class: "kicker", text: "국내 주식" }), h("h2", { text: "국장 페이퍼 (워뇨띠 카피)" }), h("p", { class: "sub", text: intro })),
      h(
        "p",
        { class: "asof", text: sameDay ? `기준일 ${fmtDate(book.asof)}` : `장부 ${fmtDate(book.asof)} · 시계열 ${fmtDate(seriesDate)}` },
      ),
    ),
    h(
      "div",
      { class: "stats" },
      stat("수익률", last ? fmtPct(last.return_pct) : "—", last && toneClass(last.return_pct), last ? fmtDate(last.date) : "", true),
      stat("평가금액", fmtKrw(book.equity), null, `시작 원금 ${fmtKrw(book.bankroll)}`),
      stat("현금", fmtKrw(book.cash)),
      stat("실현손익", fmtKrw(book.realized), toneClass(book.realized), realizedHint),
    ),
    h("p", { class: "tie", text: bookLine(fmtKrw, book.bankroll, book.realized, unrealized, book.equity, "평가") }),
  );

  if (last && Number(last.equity_krw) !== Number(book.equity)) {
    panel.append(
      h("p", {
        class: "field-note",
        text: `시계열 마지막 평가금액 ${fmtKrw(last.equity_krw)}과 장부 평가금액 ${fmtKrw(book.equity)}이 다릅니다.`,
      }),
    );
  }

  const chartCard = h("div", { class: "chart-card" });
  const legend = baseline
    ? `노란 점 · ${fmtShort(baseline.date)} 기준 · 관측 ${krEquity.length}일`
    : `관측 ${krEquity.length}일`;
  const gap = hasCalendarGap(krEquity)
    ? "관측일이 아닌 날은 점이 없습니다. 점 사이가 넓으면 그 구간은 비어 있습니다."
    : "";
  chartCard.append(
    h("div", { class: "chart-head" }, h("h3", { text: "수익률" }), h("p", { class: "legend-note", text: legend })),
    h("div", { class: "chart-box" }, h("canvas", { id: "kr-chart", role: "img", "aria-label": "국장 페이퍼 수익률 추이" })),
    gap ? h("p", { class: "field-note", text: gap }) : null,
  );
  panel.append(chartCard);
  panel.append(seriesBlock("일별 기록", krEquity, fmtKrw, "equity_krw", "cash_krw", baselineIndex));

  panel.append(
    block(
      "보유",
      String((book.positions || []).length),
      h("p", {
        class: "field-note",
        text: "손절 거리가 음수이면 현재가가 손절가보다 위에 있습니다. 양수이고 이탈로 표시된 종목은 손절가를 밑돌았습니다.",
      }),
      renderTable(
        "보유 종목",
        [
          { text: "종목" },
          { text: "수량", className: "num" },
          { text: "진입가", className: "num" },
          { text: "현재가", className: "num" },
          { text: "평가손익", className: "num" },
          { text: "수익률", className: "num" },
          { text: "손절", className: "num" },
          { text: "손절 거리", className: "num" },
          { text: "상태" },
          { text: "진입일" },
        ],
        (book.positions || []).map((row) => {
          const pending = pendingCodes.has(row.code);
          const pills = h("div", { class: "pills" });
          if (row.stop_breached) pills.append(pill("손절 이탈", "down"));
          if (pending) pills.append(pill("매도 대기", "warn"));
          if (!row.stop_breached && !pending) pills.append(pill("보유", "hold"));
          const meta = `참고평단 ${fmtPlain(row.ref_avg)} (${row.ref_src}) · 평단 대비 ${fmtPct(row.vs_avg)}`;
          return {
            className: row.stop_breached ? "row-alert" : "",
            cells: [
              nodeCell(nameCell(row.name, row.code, meta)),
              textCell(fmtPlain(row.shares), "num"),
              textCell(fmtPlain(row.entry), "num"),
              textCell(fmtPlain(row.close), "num"),
              textCell(fmtKrw(row.pnl), `num ${toneClass(row.pnl)}`),
              textCell(fmtPct(row.pnl_pct), `num ${toneClass(row.pnl_pct)}`),
              textCell(fmtPlain(row.stop), "num"),
              textCell(fmtPct(row.stop_dist), "num"),
              nodeCell(pills),
              textCell(fmtDate(row.entry_date)),
            ],
          };
        }),
        true,
      ),
    ),
  );

  panel.append(
    block(
      "매도 대기",
      String((book.pending_sells || []).length),
      renderTable(
        "매도 대기",
        [
          { text: "종목" },
          { text: "이탈일" },
          { text: "이탈 종가", className: "num" },
          { text: "손절가", className: "num" },
        ],
        (book.pending_sells || []).map((row) => ({
          cells: [
            nodeCell(nameCell(row.name, row.code)),
            textCell(fmtDate(row.breach_date)),
            textCell(fmtPlain(row.breach_close), "num"),
            textCell(fmtPlain(row.stop), "num"),
          ],
        })),
      ),
    ),
  );

  panel.append(
    block(
      "청산",
      String((book.closed || []).length),
      renderTable(
        "청산 종목",
        [
          { text: "종목" },
          { text: "수량", className: "num" },
          { text: "진입가", className: "num" },
          { text: "청산가", className: "num" },
          { text: "청산일" },
          { text: "실현손익", className: "num" },
          { text: "수익률", className: "num" },
        ],
        (book.closed || []).map((row) => ({
          cells: [
            nodeCell(nameCell(row.name, row.code)),
            textCell(fmtPlain(row.shares), "num"),
            textCell(fmtPlain(row.entry), "num"),
            textCell(fmtPlain(row.exit), "num"),
            textCell(fmtDate(row.exit_date)),
            textCell(fmtKrw(row.realized), `num ${toneClass(row.realized)}`),
            textCell(fmtPct(row.pct), `num ${toneClass(row.pct)}`),
          ],
        })),
        true,
      ),
    ),
  );

  const watch = book.watch || [];
  if (watch.length) {
    panel.append(
      block(
        "관심",
        String(watch.length),
        renderTable(
          "관심 종목",
          [
            { text: "종목" },
            { text: "참고평단", className: "num" },
            { text: "현재가", className: "num" },
            { text: "평단 대비", className: "num" },
            { text: "조건" },
            { text: "손절", className: "num" },
          ],
          watch.map((row) => {
            const versus = row.ref_avg ? (Number(row.close) / Number(row.ref_avg) - 1) * 100 : NaN;
            return {
              cells: [
                nodeCell(nameCell(row.name, row.code)),
                textCell(fmtPlain(row.ref_avg), "num"),
                textCell(fmtPlain(row.close), "num"),
                textCell(fmtPct(versus), `num ${toneClass(versus)}`),
                textCell(row.trigger),
                textCell(fmtPlain(row.stop), "num"),
              ],
            };
          }),
          true,
        ),
      ),
    );
  }

  return { panel, baselineIndex };
}

function sideLabel(side) {
  const known = { Down: "하락", Up: "상승", Yes: "예", No: "아니오" };
  return known[side] ? `${known[side]} (${side})` : String(side ?? "—");
}

function renderPm(pmEquity, book) {
  const last = pmEquity.at(-1);
  const sparse = sparseCopy(pmEquity);
  const panel = h("section", { class: "panel", id: "pm" });
  panel.append(
    h(
      "div",
      { class: "panel-head" },
      h(
        "div",
        null,
        h("p", { class: "kicker", text: "예측 시장" }),
        h("h2", { text: "폴리마켓 페이퍼" }),
        h("p", { class: "sub", text: book.source || "출처 정보 없음" }),
      ),
      h("p", { class: "asof", text: last ? `시계열 ${fmtDate(last.date)}` : "시계열 없음" }),
    ),
  );

  if (sparse) panel.append(h("p", { class: "sparse", text: sparse }));

  panel.append(
    h(
      "div",
      { class: "stats six" },
      stat("수익률", last ? fmtPct(last.return_pct) : "—", last && toneClass(last.return_pct), last ? fmtDate(last.date) : "", true),
      stat("평가금액", fmtUsd(book.equity), null, `시작 원금 ${fmtUsd(book.bankroll)}`),
      stat("현금", fmtUsd(book.cash)),
      stat("실현손익", fmtUsd(book.realized), toneClass(book.realized)),
      stat("미실현 손익", fmtUsd(book.open_pnl), toneClass(book.open_pnl)),
      stat("보유", `${Number(book.open_count).toLocaleString("ko-KR")}건`, "flat", `청산 ${(book.closed || []).length}건`),
    ),
    h("p", { class: "tie", text: bookLine(fmtUsd, book.bankroll, book.realized, book.open_pnl, book.equity, "미실현") }),
  );

  if (last && Number(last.equity_usd) !== Number(book.equity)) {
    panel.append(
      h("p", {
        class: "field-note",
        text: `시계열 마지막 평가금액 ${fmtUsd(last.equity_usd)}과 장부 평가금액 ${fmtUsd(book.equity)}이 다릅니다.`,
      }),
    );
  }

  const chartCard = h("div", { class: "chart-card" });
  chartCard.append(
    h(
      "div",
      { class: "chart-head" },
      h("h3", { text: "수익률" }),
      h("p", { class: "legend-note", text: `관측 ${pmEquity.length}시점 · 점을 이어 보여 주며 중간 값은 없습니다` }),
    ),
    h("div", { class: "chart-box" }, h("canvas", { id: "pm-chart", role: "img", "aria-label": "폴리마켓 페이퍼 수익률 추이" })),
  );
  panel.append(chartCard);
  panel.append(seriesBlock("관측된 수익률", pmEquity, fmtUsd, "equity_usd", "cash_usd", -1));

  panel.append(
    h(
      "div",
      { class: "callout" },
      h("p", {
        class: "note",
        text: `열린 포지션 ${Number(book.open_count).toLocaleString("ko-KR")}건의 종목별 내역은 이 파일에 없습니다. 청산 ${(book.closed || []).length}건만 표로 있습니다.`,
      }),
      book.note ? h("p", { class: "note-raw", text: book.note }) : null,
    ),
  );

  panel.append(
    block(
      "청산",
      String((book.closed || []).length),
      renderTable(
        "폴리마켓 청산",
        [
          { text: "시장" },
          { text: "방향" },
          { text: "수량", className: "num" },
          { text: "가격", className: "num" },
          { text: "비용", className: "num" },
          { text: "실현손익", className: "num" },
          { text: "진입" },
        ],
        (book.closed || []).map((row) => ({
          cells: [
            textCell(row.market),
            textCell(sideLabel(row.side)),
            textCell(fmtPlain(row.shares), "num"),
            textCell(fmtUsd(row.price), "num"),
            textCell(fmtUsd(row.cost), "num"),
            textCell(fmtUsd(row.realized), `num ${toneClass(row.realized)}`),
            textCell(fmtDateTime(row.opened)),
          ],
        })),
        true,
      ),
    ),
  );

  return panel;
}

function renderUpdated(krEquity, krBook, pmEquity) {
  const host = document.getElementById("updated");
  host.replaceChildren();
  const seriesDate = latestDate(krEquity);
  if (krBook.asof && krBook.asof !== seriesDate) {
    host.append(chip("국장 장부", fmtDate(krBook.asof)), chip("국장 시계열", fmtDate(seriesDate)));
  } else {
    host.append(chip("국장", fmtDate(krBook.asof || seriesDate)));
  }
  const pmDate = latestDate(pmEquity);
  if (pmDate) host.append(chip("폴리마켓", fmtDate(pmDate)));
}

function showError(error) {
  const app = document.getElementById("app");
  app.replaceChildren(
    h(
      "p",
      { class: "error", text: error instanceof Error ? error.message : String(error) },
    ),
    h(
      "p",
      {
        class: "field-note",
        text: "data/ 파일을 읽으려면 이 폴더를 정적 서버로 여세요. 예: python3 -m http.server",
      },
    ),
  );
}

async function main() {
  if (typeof Chart === "undefined") {
    throw new Error("Chart.js를 불러오지 못했습니다.");
  }
  Chart.defaults.font.family = chartFont;
  Chart.defaults.color = "#a7ad9e";

  const [krEquityText, krBook, pmEquityText, pmBook] = await Promise.all([
    fetchText(FILES.krEquity),
    fetchText(FILES.krPositions).then((text) => JSON.parse(text)),
    fetchText(FILES.pmEquity),
    fetchText(FILES.pmTrades).then((text) => JSON.parse(text)),
  ]);
  const krEquity = parseCsv(krEquityText);
  const pmEquity = parseCsv(pmEquityText);
  if (krEquity.length === 0) throw new Error("국장 수익률 파일이 비어 있습니다.");
  if (pmEquity.length === 0) throw new Error("폴리마켓 수익률 파일이 비어 있습니다.");

  renderUpdated(krEquity, krBook, pmEquity);
  const kr = renderKr(krEquity, krBook);
  const pm = renderPm(pmEquity, pmBook);
  document.getElementById("app").replaceChildren(kr.panel, pm);

  drawReturnChart(
    document.getElementById("kr-chart"),
    krEquity,
    { equity: fmtKrw, equityField: "equity_krw", cashField: "cash_krw" },
    kr.baselineIndex,
  );
  drawReturnChart(
    document.getElementById("pm-chart"),
    pmEquity,
    { equity: fmtUsd, equityField: "equity_usd", cashField: "cash_usd" },
    -1,
    true,
  );
  document.documentElement.dataset.ready = "1";
}

main().catch((error) => {
  console.error(error);
  document.documentElement.dataset.ready = "error";
  showError(error);
});
