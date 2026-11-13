import { useMemo } from "react";

import TimeSeriesChart from "../../../components/charts/TimeSeriesChart.jsx";
import { formatCurrency } from "../../../utils/currency.utils.js";
import { toAccountValueLine } from "../utils/portfolio.utils.js";

// Axis labels as rupees with Indian digit grouping. A module constant: the chart rebuilds its series when this changes.
const PRICE_FORMAT = {
  type: "custom",
  formatter: (value) => formatCurrency(value),
  minMove: 0.01,
};

// The account value chart's drawing part, loaded on demand by AccountValueChart: an area line of the account value
// (holdings + cash), one point per trading day, drawn by the shared TimeSeriesChart.
//   points   the server's history points     range  the loaded range (zoom resets to fit when it changes)
//   isUp     green line when the value rose over the range, red when it fell
//   onHover  called with { time (UTC seconds), value } under the crosshair, or null when it leaves
export default function AccountValueChartCanvas({ points, range, isUp, onHover }) {
  const data = useMemo(() => toAccountValueLine(points), [points]);

  return (
    <TimeSeriesChart
      kind="area"
      data={data}
      isUp={isUp}
      fitKey={range}
      priceFormat={PRICE_FORMAT}
      onHover={onHover}
      className="account-chart__canvas"
      ariaLabel={`Account value chart, ${range} range`}
    />
  );
}
