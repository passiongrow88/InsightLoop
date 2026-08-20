import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import V5App from "./V5App";

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <V5App />
  </React.StrictMode>,
);
