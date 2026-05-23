import React from "react";
import { createRoot } from "react-dom/client";
import ThreeCarGame from "./ThreeCarGame.jsx";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ThreeCarGame />
  </React.StrictMode>
);
