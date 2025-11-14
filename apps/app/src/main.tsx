import React from "react";
import ReactDOM from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";

import App from "./App";
import { AuthCallbackPage } from "./routes/auth-callback";
import "./index.css";
import { ensureGroupsConfigured } from "./lib/groups/configure-groups";

ensureGroupsConfigured();

const router = createBrowserRouter( [
    { path: "/", element: <App /> },
    { path: "/auth/callback", element: <AuthCallbackPage /> },
] );

ReactDOM.createRoot( document.getElementById( "root" ) as HTMLElement ).render(
    <React.StrictMode>
        <RouterProvider router={router} />
    </React.StrictMode>
);
