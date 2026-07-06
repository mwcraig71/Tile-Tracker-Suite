import { createRoot } from "react-dom/client";
import { setAuthTokenGetter } from "@workspace/api-client-react";
import App from "./App";
import { getAppKey } from "./lib/app-key";
import "./index.css";

// Attach the app access key (Settings → App Access Key) to every API call.
setAuthTokenGetter(() => getAppKey());

createRoot(document.getElementById("root")!).render(<App />);
