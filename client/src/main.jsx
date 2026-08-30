import React from "react";
import ReactDOM from "react-dom/client";

import Chat from "./chat/Chat";
import Call from "./call/Call";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <Chat />
    <Call room="general" />
  </React.StrictMode>
);