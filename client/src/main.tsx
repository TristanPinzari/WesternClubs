// WHAT: The frontend's entry point. It starts React, turns on routing (BrowserRouter),
//   loads the global CSS, and renders <App /> into index.html.
// WITHOUT IT: Nothing would render. The page would stay blank.
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router";
import App from "./App";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
);
