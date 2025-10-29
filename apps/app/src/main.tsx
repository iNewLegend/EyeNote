import React from "react";
import ReactDOM from "react-dom/client";

import App from "./app";
import "./index.css";
import { AuthCallback } from "./pages/auth-callback";

const rootElement = document.getElementById( "root" ) as HTMLElement;
const isAuthCallback = window.location.pathname.startsWith( "/auth/callback" );

ReactDOM.createRoot( rootElement ).render(
    <React.StrictMode>
        {isAuthCallback ? <AuthCallback /> : <App />}
    </React.StrictMode>
);
