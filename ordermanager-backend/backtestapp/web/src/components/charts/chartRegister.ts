import {
  BarController,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  ScatterController,
  TimeScale,
  TimeSeriesScale,
  Title,
  Tooltip,
} from "chart.js";
import "chartjs-adapter-luxon";
import { CandlestickController, CandlestickElement } from "chartjs-chart-financial";

let registered = false;

export function registerCharts() {
  if (registered) return;
  registered = true;
  ChartJS.register(
    CategoryScale,
    LinearScale,
    TimeScale,
    TimeSeriesScale,
    PointElement,
    LineElement,
    BarController,
    BarElement,
    ScatterController,
    CandlestickController,
    CandlestickElement,
    Title,
    Tooltip,
    Legend,
    Filler,
  );
}
