// beschattung-steuerung v1.0.0
// Einzeln installierbares Modul (Home Assistant Marketplace / HACS, Kategorie Dashboard).
window.customCards = window.customCards || [];
window.customCardFeatures = window.customCardFeatures || [];
// Eigener Block: Namen bleiben lokal, auch wenn mehrere Karten zusammen geladen werden.
{
// ---------------------------------------------------------------------------
// Beschattung Steuerung: Automatik-Taste + Auf / Stopp / Ab in einer Zeile
// (eine Tile-Karte zeigt inline nur ein Feature, deshalb alles in einem Element).
//
//   features_position: inline
//   features:
//     - type: custom:beschattung-steuerung
//       automatik: switch.essbereichtuer   # optional, ohne Eintrag keine Automatik-Taste

const TYPE2 = "beschattung-steuerung";

class BeschattungSteuerung extends HTMLElement {
  setConfig(config) {
    if (!config) throw new Error("Ungueltige Konfiguration");
    if (config.automatik && !String(config.automatik).startsWith("switch.") && !String(config.automatik).startsWith("input_boolean."))
      throw new Error("automatik muss eine switch- oder input_boolean-Entitaet sein");
    this._config = { automatik: config.automatik || null };
    this._render();
  }

  set hass(hass) { this._hass = hass; this._update(); }
  set context(ctx) { this._context = ctx; this._update(); }
  set stateObj(s) { this._stateObj = s; this._update(); }
  set color(c) { this._color = c; this._update(); }

  get _entity() {
    const id = this._context?.entity_id;
    if (id && this._hass) return this._hass.states[id];
    return this._stateObj;
  }

  _render() {
    if (!this.shadowRoot) this.attachShadow({ mode: "open" });
    const auto = this._config.automatik
      ? `<ha-control-button class="auto" data-a="auto"><ha-icon icon="mdi:window-shutter-auto"></ha-icon></ha-control-button>`
      : "";
    this.shadowRoot.innerHTML = `
      <style>
        :host { display: block; }
        ha-control-button-group {
          --control-button-group-spacing: var(--beschattung-tasten-abstand, 12px);
          --control-button-group-thickness: var(--feature-height, 42px);
          height: var(--feature-height, 42px);
        }
        ha-control-button {
          --control-button-border-radius: var(--feature-border-radius, 12px);
          --control-button-padding: 0;
        }
        ha-control-button.auto.an {
          --control-button-icon-color: var(--green-color, #4caf50);
          --control-button-background-color: var(--green-color, #4caf50);
          --control-button-background-opacity: 0.25;
        }
        ha-control-button.auto:not(.an) { --control-button-icon-color: var(--disabled-text-color); }
      </style>
      <ha-control-button-group>
        ${auto}
        <ha-control-button data-a="open"><ha-icon icon="mdi:arrow-up"></ha-icon></ha-control-button>
        <ha-control-button data-a="stop"><ha-icon icon="mdi:stop"></ha-icon></ha-control-button>
        <ha-control-button data-a="close"><ha-icon icon="mdi:arrow-down"></ha-icon></ha-control-button>
      </ha-control-button-group>`;
    this._btn = {};
    this.shadowRoot.querySelectorAll("ha-control-button").forEach((b) => {
      this._btn[b.dataset.a] = b;
      b.addEventListener("click", (ev) => { ev.stopPropagation(); this._klick(b.dataset.a); });
    });
    this._update();
  }

  _klick(a) {
    const e = this._entity;
    if (!this._hass) return;
    if (a === "auto") {
      if (this._config.automatik) this._hass.callService(this._config.automatik.split(".")[0], "toggle", { entity_id: this._config.automatik });
      return;
    }
    if (!e) return;
    const svc = { open: "open_cover", stop: "stop_cover", close: "close_cover" }[a];
    this._hass.callService("cover", svc, { entity_id: e.entity_id });
  }

  _update() {
    if (!this._btn) return;
    const e = this._entity;
    if (!e) return;
    const weg = e.state === "unavailable";
    const pos = e.attributes?.current_position;
    const ganzOffen = pos != null ? pos >= 100 : e.state === "open";
    const ganzZu = pos != null ? pos <= 0 : e.state === "closed";
    this._btn.open.disabled = weg || (ganzOffen && e.state !== "closing") || e.state === "opening";
    this._btn.close.disabled = weg || (ganzZu && e.state !== "opening") || e.state === "closing";
    this._btn.stop.disabled = weg;
    this._btn.open.label = "Auf";
    this._btn.stop.label = "Stopp";
    this._btn.close.label = "Ab";
    if (this._btn.auto && this._hass) {
      const s = this._hass.states[this._config.automatik];
      const an = s?.state === "on";
      this._btn.auto.classList.toggle("an", an);
      this._btn.auto.disabled = !s || s.state === "unavailable";
      this._btn.auto.label = an ? "Automatik an" : "Automatik aus";
      this._btn.auto.title = an ? "Automatik an" : "Automatik aus";
    }
  }

  static getStubConfig() { return { type: `custom:${TYPE2}` }; }
}

if (!customElements.get(TYPE2)) customElements.define(TYPE2, BeschattungSteuerung);
if (!window.customCardFeatures.some((f) => f.type === TYPE2)) {
  window.customCardFeatures.push({
    type: TYPE2,
    name: "Beschattung Steuerung (Automatik + Auf/Stopp/Ab)",
    configurable: true,
    supported: (stateObj) => stateObj?.entity_id?.startsWith("cover."),
  });
}
}

console.info("%c beschattung-steuerung %c v1.0.0 ", "color:#fff;background:#03a9f4;font-weight:700", "color:#03a9f4");
