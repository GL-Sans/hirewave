import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import { applyTheme, getTheme } from "./utils/theme";
import { disableZoom } from "./utils/disableZoom";

// Prima del render, per non mostrare un lampo di tema chiaro
applyTheme(getTheme());
disableZoom();

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <App />
);
