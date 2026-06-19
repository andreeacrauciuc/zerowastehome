import React from "react";
import{ createRoot } from "react-dom/client" ;
import App from "./app/App.jsx";  
import './styles/main.scss';
import './styles/App.scss';

createRoot(document.getElementById("root")).render(<React.StrictMode>
  <App />
</React.StrictMode>
);
