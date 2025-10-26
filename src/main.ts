import { createApp } from "vue";
import { createRouter, createWebHistory } from "vue-router";
import { routes } from "./router";
import App from "./App.vue";
import "./app.css";

console.log("[main] boot with router...");
const router = createRouter({ history: createWebHistory(), routes });
const app = createApp(App);
app.use(router);
app.mount("#app");
console.log("[main] app mounted with router");
