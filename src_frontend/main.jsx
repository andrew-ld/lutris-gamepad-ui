import { render } from "preact";

import App from "./App.jsx";
import "./styles/main.css";
import { playStartupSound } from "./utils/sound.js";

const root = document.querySelector("#root");
playStartupSound();
render(<App />, root);
