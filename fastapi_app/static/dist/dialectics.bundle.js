import { n as e } from "./chunk-C_CI6nMA.js";
//#region fastapi_app/static/js/dialectics/api.js
var t = {
	async list(e = "") {
		let t = e ? `/api/dialectics?search=${encodeURIComponent(e)}` : "/api/dialectics", n = await fetch(t);
		return n.ok ? await n.json() : [];
	},
	async get(e) {
		let t = await fetch(`/api/dialectics/${e}`);
		return t.ok ? await t.json() : null;
	},
	async save(e, t = null) {
		let n = t ? `/api/dialectics/${t}` : "/api/dialectics/save", r = await fetch(n, {
			method: t ? "PATCH" : "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(e)
		});
		return r.ok ? await r.json() : null;
	},
	async delete(e) {
		return (await fetch(`/api/dialectics/${e}`, { method: "DELETE" })).ok;
	},
	async listCategories() {
		let e = await fetch("/api/dialectics/categories/all");
		return e.ok ? await e.json() : [];
	},
	async createCategory(e) {
		let t = await fetch("/api/dialectics/categories/new", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ name: e })
		});
		return t.ok ? await t.json() : null;
	},
	async searchNotes(e) {
		if (!e || e.length < 2) return [];
		let t = await fetch(`/api/dialectics/search/notes?q=${encodeURIComponent(e)}`);
		return t.ok ? await t.json() : [];
	}
}, n = {
	toggleDisplay(e, t, n = !1) {
		e && (e.style.display = t ? n ? "flex" : "block" : "none");
	},
	setLoading(e, t = "Loading...") {
		e.innerHTML = `<div style="color: #64748b; text-align: center; padding: 20px;">${t}</div>`;
	},
	clearLoading(e) {
		e && (e.innerHTML = "");
	},
	setupDraggable(e, t, n) {
		if (!e || !t) return;
		let r = !1, i = {
			x: 0,
			y: 0
		};
		t.addEventListener("mousedown", (t) => {
			if (n && n.isExpanded || t.target.closest("button, input, textarea, [contenteditable=\"true\"]")) return;
			r = !0;
			let a = e.getBoundingClientRect();
			i = {
				x: t.clientX - a.left,
				y: t.clientY - a.top
			}, e.style.transition = "none";
		}), document.addEventListener("mousemove", (t) => {
			if (!r) return;
			let n = t.clientX - i.x, a = t.clientY - i.y;
			n = Math.max(-200, Math.min(n, window.innerWidth - 100)), a = Math.max(0, Math.min(a, window.innerHeight - 50)), e.style.left = `${n}px`, e.style.top = `${a}px`, e.style.position = "fixed";
		}), document.addEventListener("mouseup", () => {
			r = !1, e.style.transition = "";
		});
	},
	setupResizable(e, t) {
		if (!e || !t) return;
		let n = !1, r, i, a, o;
		t.addEventListener("mousedown", (t) => {
			t.preventDefault(), n = !0, r = e.offsetWidth, i = e.offsetHeight, a = t.clientX, o = t.clientY, e.style.transition = "none";
		}), document.addEventListener("mousemove", (t) => {
			if (!n) return;
			let s = r + (t.clientX - a), c = i + (t.clientY - o);
			s > 350 && s < window.innerWidth * .9 && (e.style.width = `${s}px`), c > 250 && c < window.innerHeight * .9 && (e.style.height = `${c}px`);
		}), document.addEventListener("mouseup", () => {
			n = !1, e.style.transition = "";
		});
	}
};
//#endregion
//#region fastapi_app/static/js/modal_controller.js
function r({ title: e = "Подтверждение", message: t = "Вы уверены?", icon: n = "", buttons: r = [], watermark: i = "", width: a = "" }) {
	return new Promise((o) => {
		try {
			let s = document.getElementById("customConfirmModal"), c = document.getElementById("confirmModalTitle"), l = document.getElementById("confirmModalMessage"), u = document.getElementById("confirmModalIcon"), d = document.getElementById("confirmModalIconWrapper"), f = document.getElementById("confirmModalFooter");
			if (!s || !c || !l || !f) {
				console.warn("[customConfirm] UI elements missing, falling back to native."), o(confirm(t));
				return;
			}
			c.innerText = e, l.innerHTML = t, f.innerHTML = "", d && u && (u.innerHTML = n || "", d.style.display = n ? "flex" : "none");
			let p = s.querySelector(".modal-content");
			if (p && (p.style.position = "relative", p.querySelectorAll(".modal-watermark").forEach((e) => e.remove()), a ? p.style.setProperty("max-width", a, "important") : p.style.removeProperty("max-width"), i)) {
				let e = document.createElement("div");
				e.className = "modal-watermark", e.textContent = i, e.style.position = "absolute", e.style.bottom = "5px", e.style.left = "20px", e.style.fontSize = "14px", e.style.color = "#cbd5e1", e.style.fontWeight = "600", e.style.opacity = "0.6", e.style.pointerEvents = "none", e.style.letterSpacing = "0.5px", p.appendChild(e);
			}
			if (r.length === 0) {
				let e = window._ && window._("modal.cancel") || "Отмена", t = window._ && window._("modal.save_entry") || "ОК";
				r = [{
					label: e,
					value: !1,
					class: "confirm-btn-secondary"
				}, {
					label: t,
					value: !0,
					class: "confirm-btn-primary"
				}];
			}
			r.forEach((e) => {
				let t = document.createElement("button");
				t.innerText = e.label, t.className = "btn " + (e.class || "confirm-btn-secondary"), t.onclick = (t) => {
					t.stopPropagation(), s.classList.remove("active"), setTimeout(() => {
						s.classList.remove("active"), setTimeout(() => {
							s.style.display = "none";
						}, 200), p && (p.style.removeProperty("max-width"), p.querySelectorAll(".modal-watermark").forEach((e) => e.remove()));
					}, 200), o(e.value);
				}, f.appendChild(t);
			}), s.style.display = "flex", s.offsetHeight, s.classList.add("active"), s.offsetHeight, s.classList.add("active");
		} catch (e) {
			console.error("[customConfirm] Error:", e), o(confirm(t));
		}
	});
}
function i({ title: e = "Select Option", messageHTML: t = "", options: n = [], okLabel: r = "", cancelLabel: i = "" }) {
	return new Promise((a) => {
		try {
			let o = document.getElementById("customConfirmModal"), s = document.getElementById("confirmModalTitle"), c = document.getElementById("confirmModalMessage"), l = document.getElementById("confirmModalIconWrapper"), u = document.getElementById("confirmModalFooter");
			if (!o || !s || !c || !u) {
				a(null);
				return;
			}
			l && (l.style.display = "none"), s.innerText = e;
			let d = document.createElement("div");
			if (d.className = "choice-container", t) {
				let e = document.createElement("div");
				e.className = "choice-message", e.innerHTML = t, d.appendChild(e);
			}
			let f = document.createElement("div");
			f.className = "choice-list", n.forEach((e) => {
				let t = document.createElement("label");
				t.className = "choice-item" + (e.checked ? " selected" : "");
				let n = document.createElement("input");
				n.type = "radio", n.name = "customChoiceRadio", n.value = e.value, n.checked = !!e.checked, n.addEventListener("change", () => {
					document.querySelectorAll(".choice-item").forEach((e) => e.classList.remove("selected")), t.classList.add("selected");
				});
				let r = document.createElement("span");
				r.textContent = e.label, t.appendChild(n), t.appendChild(r), f.appendChild(t);
			}), d.appendChild(f), c.innerHTML = "", c.appendChild(d), u.innerHTML = "";
			let p = i || window._ && window._("modal.cancel") || "Отмена", m = r || window._ && window._("modal.save_entry") || "Готово", h = document.createElement("button");
			h.className = "btn btn-secondary", h.innerText = p, h.onclick = (e) => {
				e.stopPropagation(), o.classList.remove("active"), setTimeout(() => {
					o.style.display = "none";
				}, 200), a(null);
			};
			let g = document.createElement("button");
			g.className = "btn btn-primary", g.innerText = m, g.onclick = (e) => {
				e.stopPropagation();
				let t = document.querySelector("input[name=\"customChoiceRadio\"]:checked");
				o.classList.remove("active"), setTimeout(() => {
					o.style.display = "none";
				}, 200), a(t ? t.value : null);
			}, u.appendChild(h), u.appendChild(g), o.style.display = "flex", o.offsetHeight, o.classList.add("active");
		} catch (e) {
			console.error(e), a(null);
		}
	});
}
function a({ title: e = "Input Required", message: t = "", value: n = "", placeholder: r = "", okLabel: i = "", cancelLabel: a = "", watermark: o = "", width: s = "" }) {
	return new Promise((c) => {
		try {
			let l = document.getElementById("customConfirmModal"), u = document.getElementById("confirmModalTitle"), d = document.getElementById("confirmModalMessage"), f = document.getElementById("confirmModalIconWrapper"), p = document.getElementById("confirmModalFooter");
			if (!l || !u || !d || !p) {
				console.warn("[customPrompt] UI elements missing, falling back to native."), c(prompt(t, n));
				return;
			}
			f && (f.style.display = "none"), u.innerText = e, d.innerHTML = "";
			let m = document.createElement("div");
			if (m.className = "prompt-container", m.style.textAlign = "left", t) {
				let e = document.createElement("div");
				e.textContent = t, e.style.marginBottom = "15px", e.style.fontSize = "0.95rem", e.style.color = "var(--color-text-body)", m.appendChild(e);
			}
			let h = document.createElement("input");
			h.type = "text", h.value = n, h.placeholder = r, h.className = "form-input-premium", h.style.width = "100%", m.appendChild(h);
			let g = l.querySelector(".modal-content");
			if (g && (g.style.position = "relative", g.querySelectorAll(".modal-watermark").forEach((e) => e.remove()), s ? g.style.setProperty("max-width", s, "important") : g.style.removeProperty("max-width"), o)) {
				let e = document.createElement("div");
				e.className = "modal-watermark", e.textContent = o, e.style.position = "absolute", e.style.bottom = "5px", e.style.left = "20px", e.style.fontSize = "14px", e.style.color = "#cbd5e1", e.style.fontWeight = "600", e.style.opacity = "0.6", e.style.pointerEvents = "none", e.style.letterSpacing = "0.5px", g.appendChild(e);
			}
			d.appendChild(m), p.innerHTML = "";
			let _ = () => {
				l.classList.remove("active"), setTimeout(() => {
					l.style.display = "none";
				}, 200), g && (g.style.removeProperty("max-width"), g.querySelectorAll(".modal-watermark").forEach((e) => e.remove()));
			}, v = a || window._ && window._("modal.cancel") || "Отмена", y = i || window._ && window._("modal.save_entry") || "Создать", b = document.createElement("button");
			b.className = "btn btn-secondary", b.innerText = v, b.onclick = (e) => {
				e.stopPropagation(), _(), c(null);
			};
			let x = document.createElement("button");
			x.className = "btn btn-primary", x.innerText = y;
			let S = () => {
				_(), c(h.value);
			};
			x.onclick = (e) => {
				e.stopPropagation(), S();
			}, h.onkeydown = (e) => {
				e.key === "Enter" ? (e.preventDefault(), S()) : e.key === "Escape" && (_(), c(null));
			}, p.appendChild(b), p.appendChild(x), l.style.display = "flex", l.offsetHeight, l.classList.add("active"), setTimeout(() => h.focus(), 100);
		} catch (e) {
			console.error("[customPrompt] Error:", e), c(prompt(t, n));
		}
	});
}
function o({ title: e = "Edit formula (LaTeX)", value: t = "", okLabel: n = "Save", cancelLabel: r = "Cancel" }) {
	return new Promise((i) => {
		try {
			let a = document.getElementById("customConfirmModal"), o = document.getElementById("confirmModalTitle"), s = document.getElementById("confirmModalMessage"), c = document.getElementById("confirmModalFooter");
			if (!a || !o || !s || !c) {
				i(prompt(e, t));
				return;
			}
			let l = document.getElementById("confirmModalIconWrapper");
			l && (l.style.display = "none"), o.innerText = e, s.innerHTML = "";
			let u = document.createElement("div");
			u.className = "latex-prompt-container", u.style.textAlign = "left", u.style.display = "flex", u.style.flexDirection = "column", u.style.gap = "10px";
			let d = document.createElement("div");
			d.style.cssText = "display: flex; gap: 8px; align-items: center; width: 100%;";
			let f = document.createElement("input");
			f.type = "text", f.value = t, f.className = "form-input-premium", f.style.flex = "1", f.style.fontFamily = "monospace";
			let p = document.createElement("button");
			p.type = "button", p.title = "Копировать LaTeX", p.innerHTML = "📋", p.style.cssText = "background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 8px 14px; font-size: 1.1rem; cursor: pointer; transition: all 0.2s ease; display: flex; align-items: center; justify-content: center; flex-shrink: 0; box-shadow: 0 1px 2px rgba(0,0,0,0.05);", p.onmouseover = () => {
				p.style.background = "#f1f5f9", p.style.borderColor = "#94a3b8";
			}, p.onmouseout = () => {
				p.style.background = "#f8fafc", p.style.borderColor = "#cbd5e1";
			}, p.onclick = () => {
				navigator.clipboard.writeText(f.value).then(() => {
					let e = p.innerHTML;
					p.innerHTML = "✅", p.style.borderColor = "#22c55e", setTimeout(() => {
						p.innerHTML = e, p.style.borderColor = "#cbd5e1";
					}, 1500);
				}).catch((e) => {
					console.error("Copy failed:", e);
				});
			}, d.appendChild(f), d.appendChild(p);
			let m = document.createElement("input");
			m.type = "text", m.placeholder = "🔍 Search symbol (e.g. fraction, integral, alpha)...", m.className = "form-input-premium", m.style.width = "100%", m.style.fontSize = "0.85rem", m.style.padding = "6px 12px";
			let h = document.createElement("div");
			h.style.display = "grid", h.style.gridTemplateColumns = "repeat(auto-fill, minmax(120px, 1fr))", h.style.gap = "6px", h.style.maxHeight = "150px", h.style.overflowY = "auto", h.style.padding = "4px", h.style.border = "1px solid #e2e8f0", h.style.borderRadius = "6px", h.style.background = "#f8fafc";
			let g = [
				{
					name: "Fraction",
					code: "\\frac{}{}",
					tags: ["fraction", "division"]
				},
				{
					name: "Root",
					code: "\\sqrt{}",
					tags: [
						"root",
						"square",
						"sqrt"
					]
				},
				{
					name: "Power",
					code: "^{}",
					tags: [
						"power",
						"index",
						"upper"
					]
				},
				{
					name: "Subscript",
					code: "_{}",
					tags: [
						"index",
						"lower",
						"subscript"
					]
				},
				{
					name: "Integral",
					code: "\\int",
					tags: ["integral"]
				},
				{
					name: "Sum",
					code: "\\sum_{i=1}^{n}",
					tags: ["sum"]
				},
				{
					name: "Infinity",
					code: "\\infty",
					tags: ["infinity"]
				},
				{
					name: "Multiplication",
					code: "\\cdot",
					tags: ["multiplication", "dot"]
				},
				{
					name: "Cross (mult.)",
					code: "\\times",
					tags: [
						"multiplication",
						"cross",
						"times"
					]
				},
				{
					name: "Less or equal",
					code: "\\le",
					tags: [
						"less",
						"equal",
						"le",
						"leq"
					]
				},
				{
					name: "Greater or equal",
					code: "\\ge",
					tags: [
						"greater",
						"equal",
						"ge",
						"geq"
					]
				},
				{
					name: "Not equal",
					code: "\\neq",
					tags: ["not equal", "neq"]
				},
				{
					name: "Approximately",
					code: "\\approx",
					tags: ["approximately", "approx"]
				},
				{
					name: "Belongs",
					code: "\\in",
					tags: ["belongs", "in"]
				},
				{
					name: "Alpha",
					code: "\\alpha",
					tags: ["alpha", "letter"]
				},
				{
					name: "Beta",
					code: "\\beta",
					tags: ["beta", "letter"]
				},
				{
					name: "Gamma",
					code: "\\gamma",
					tags: ["gamma", "letter"]
				},
				{
					name: "Delta",
					code: "\\delta",
					tags: ["delta", "letter"]
				},
				{
					name: "Pi",
					code: "\\pi",
					tags: ["pi", "letter"]
				},
				{
					name: "Left arrow",
					code: "\\leftarrow",
					tags: ["arrow", "left"]
				},
				{
					name: "Right arrow",
					code: "\\rightarrow",
					tags: ["arrow", "right"]
				}
			], _ = (e = "") => {
				h.innerHTML = "";
				let t = e.toLowerCase().trim(), n = g.filter((e) => e.name.toLowerCase().includes(t) || e.code.toLowerCase().includes(t) || e.tags.some((e) => e.includes(t)));
				if (n.length === 0) {
					h.innerHTML = "<div style=\"font-size:0.8rem; color:#64748b; padding:8px; grid-column: 1 / -1; text-align:center;\">Nothing found</div>";
					return;
				}
				n.forEach((e) => {
					let t = document.createElement("button");
					t.type = "button", t.className = "btn btn-sm btn-secondary", t.style.cssText = "background: white; border: 1px solid #cbd5e1; border-radius: 4px; padding: 4px; font-size: 0.8rem; cursor: pointer; text-align: left; display: flex; flex-direction: column; gap: 2px; transition: all 0.2s;", t.innerHTML = `<span style="font-weight: 600; color: #334155;">${e.name}</span><span style="font-family: monospace; color: #64748b; font-size: 0.75rem;">${e.code}</span>`, t.onmouseover = () => t.style.borderColor = "#6366f1", t.onmouseout = () => t.style.borderColor = "#cbd5e1", t.onclick = (t) => {
						t.preventDefault();
						let n = f.selectionStart, r = f.selectionEnd, i = f.value;
						f.value = i.substring(0, n) + e.code + i.substring(r);
						let a = e.code.length;
						e.code.includes("{}") ? a = e.code.indexOf("{}") + 1 : e.code.includes("\\right)") && (a = e.code.indexOf("\\right)") - 1), f.focus(), f.setSelectionRange(n + a, n + a);
					}, h.appendChild(t);
				});
			};
			m.addEventListener("input", (e) => _(e.target.value)), _();
			let v = document.createElement("div");
			v.style.cssText = "background: linear-gradient(135deg, #1e293b 0%, #334155 100%); padding: 14px 16px; border-radius: 12px; border: 1px solid rgba(139, 92, 246, 0.3); box-shadow: 0 4px 15px rgba(15, 23, 42, 0.15); margin-bottom: 6px; display: flex; flex-direction: column; gap: 10px;";
			let y = document.createElement("div");
			y.style.cssText = "display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 4px;";
			let b = document.createElement("div");
			b.style.cssText = "display: flex; align-items: center; gap: 8px; font-weight: 700; font-size: 0.95rem; background: linear-gradient(90deg, #c084fc, #f472b6); -webkit-background-clip: text; -webkit-text-fill-color: transparent;", b.innerHTML = "<span style=\"-webkit-text-fill-color: initial; font-size: 1.1rem;\">✨</span> ИИ-ассистент формул";
			let x = document.createElement("span");
			x.innerText = "Редактируйте формулы голосом или текстом", x.style.cssText = "font-size: 0.75rem; color: #94a3b8; font-weight: 400;", y.appendChild(b), y.appendChild(x);
			let S = document.createElement("div");
			S.style.cssText = "display: flex; gap: 10px; flex-wrap: wrap;";
			let C = document.createElement("button");
			C.type = "button", C.innerHTML = "✍️ Изменить текстом", C.style.cssText = "flex: 1; min-width: 140px; background: rgba(255, 255, 255, 0.08); border: 1px solid rgba(255, 255, 255, 0.15); border-radius: 8px; padding: 8px 12px; font-size: 0.85rem; cursor: pointer; transition: all 0.2s ease; color: #f8fafc; font-weight: 600; display: flex; align-items: center; justify-content: center; gap: 6px;", C.onmouseover = () => {
				C.style.background = "rgba(255, 255, 255, 0.15)", C.style.borderColor = "#c084fc";
			}, C.onmouseout = () => {
				C.style.background = "rgba(255, 255, 255, 0.08)", C.style.borderColor = "rgba(255, 255, 255, 0.15)";
			};
			let w = document.createElement("button");
			w.type = "button", w.innerHTML = "🎙 Изменить голосом", w.style.cssText = "flex: 1; min-width: 140px; background: linear-gradient(135deg, #6366f1 0%, #a855f7 100%); border: none; border-radius: 8px; padding: 8px 12px; font-size: 0.85rem; cursor: pointer; transition: all 0.2s ease; color: #ffffff; font-weight: 600; display: flex; align-items: center; justify-content: center; gap: 6px; box-shadow: 0 2px 10px rgba(168, 85, 247, 0.25);", w.onmouseover = () => {
				w.style.boxShadow = "0 4px 15px rgba(168, 85, 247, 0.4)";
			}, w.onmouseout = () => {
				w.style.boxShadow = "0 2px 10px rgba(168, 85, 247, 0.25)";
			}, S.appendChild(C), S.appendChild(w);
			let T = document.createElement("div");
			T.style.cssText = "font-size: 0.8rem; color: #cbd5e1; font-style: italic; width: 100%; min-height: 18px; display: flex; align-items: center; justify-content: center; text-align: center;", C.onclick = async (e) => {
				e.preventDefault();
				let t = prompt("Опишите, как изменить формулу (например: \"добавить над суммой фигурную скобку и подпись N\"):");
				if (!(!t || !t.trim())) {
					T.innerHTML = "⏳ ИИ переделывает формулу...", T.style.color = "#94a3b8", C.disabled = !0, w.disabled = !0;
					try {
						let e = await fetch("/api/ai/dialectics/edit-math", {
							method: "POST",
							headers: { "Content-Type": "application/json" },
							body: JSON.stringify({
								current_latex: f.value,
								instruction: t.trim()
							})
						});
						if (!e.ok) throw Error(await e.text());
						let n = await e.json();
						n.latex && (f.value = n.latex, T.innerHTML = "✅ Формула успешно обновлена!", T.style.color = "#34d399");
					} catch (e) {
						console.error(e), T.innerHTML = "❌ Ошибка обновления формулы", T.style.color = "#f87171";
					} finally {
						C.disabled = !1, w.disabled = !1;
					}
				}
			};
			let E = null, ee = null, te = [], ne = () => {
				E && E.state === "recording" && (E.onstop = null, E.stop()), ee && ee.getTracks().forEach((e) => e.stop());
			};
			w.onclick = async (e) => {
				if (e.preventDefault(), E && E.state === "recording") {
					E.stop();
					return;
				}
				try {
					ee = await navigator.mediaDevices.getUserMedia({ audio: !0 }), E = new MediaRecorder(ee), te = [], E.ondataavailable = (e) => te.push(e.data), E.onstop = async () => {
						ee && ee.getTracks().forEach((e) => e.stop()), w.innerHTML = "⏳ Обработка ИИ...", w.style.background = "rgba(255, 255, 255, 0.15)", w.style.color = "#ffffff", T.innerHTML = "⏳ ИИ распознает речь и меняет формулу...", T.style.color = "#94a3b8", C.disabled = !0, w.disabled = !0;
						let e = new Blob(te, { type: "audio/webm" }), t = new FormData();
						t.append("current_latex", f.value), t.append("file", e, "edit-voice-math.webm");
						try {
							let e = await fetch("/api/ai/dialectics/edit-voice-math", {
								method: "POST",
								body: t
							});
							if (!e.ok) throw Error(await e.text());
							let n = await e.json();
							n.latex && (f.value = n.latex, T.innerHTML = `✅ Голос распознан: "${n.transcribed_text}"`, T.style.color = "#34d399");
						} catch (e) {
							console.error(e), T.innerHTML = "❌ Ошибка обработки голоса", T.style.color = "#f87171";
						} finally {
							C.disabled = !1, w.disabled = !1, w.innerHTML = "🎙 Изменить голосом", w.style.background = "linear-gradient(135deg, #6366f1 0%, #a855f7 100%)";
						}
					}, E.start(), w.innerHTML = "🔴 Остановить запись", w.style.background = "linear-gradient(135deg, #ef4444 0%, #f43f5e 100%)", T.innerHTML = "🎙 Говорите инструкцию по изменению формулы...", T.style.color = "#f87171";
				} catch (e) {
					console.error(e), T.innerHTML = "❌ Нет доступа к микрофону", T.style.color = "#f87171";
				}
			}, v.appendChild(y), v.appendChild(S), v.appendChild(T), u.appendChild(v), u.appendChild(d), u.appendChild(m), u.appendChild(h), s.appendChild(u), c.innerHTML = "";
			let D = document.createElement("button");
			D.className = "btn btn-secondary", D.innerText = r, D.onclick = (e) => {
				e.stopPropagation(), ne(), a.classList.remove("active"), setTimeout(() => {
					a.style.display = "none";
				}, 200), i(null);
			};
			let re = document.createElement("button");
			re.className = "btn btn-primary", re.innerText = n;
			let ie = () => {
				ne(), a.classList.remove("active"), setTimeout(() => {
					a.style.display = "none";
				}, 200), i(f.value);
			};
			re.onclick = (e) => {
				e.stopPropagation(), ie();
			}, f.onkeydown = (e) => {
				e.key === "Enter" ? (e.preventDefault(), ie()) : e.key === "Escape" && (a.classList.remove("active"), setTimeout(() => {
					a.style.display = "none";
				}, 200), i(null));
			}, c.appendChild(D), c.appendChild(re), a.style.display = "flex", a.offsetHeight, a.classList.add("active"), setTimeout(() => f.focus(), 100);
		} catch (n) {
			console.error("[customLatexPrompt] Error:", n), i(prompt(e, t));
		}
	});
}
//#endregion
//#region node_modules/katex/dist/katex.mjs
var s = class e extends Error {
	constructor(t, n) {
		var r = "KaTeX parse error: " + t, i, a, o = n && n.loc;
		if (o && o.start <= o.end) {
			var s = o.lexer.input;
			i = o.start, a = o.end, i === s.length ? r += " at end of input: " : r += " at position " + (i + 1) + ": ";
			var c = s.slice(i, a).replace(/[^]/g, "$&̲"), l = i > 15 ? "…" + s.slice(i - 15, i) : s.slice(0, i), u = a + 15 < s.length ? s.slice(a, a + 15) + "…" : s.slice(a);
			r += l + c + u;
		}
		super(r), this.name = "ParseError", this.position = void 0, this.length = void 0, this.rawMessage = void 0, Object.setPrototypeOf(this, e.prototype), this.position = i, i != null && a != null && (this.length = a - i), this.rawMessage = t;
	}
}, c = /([A-Z])/g, l = (e) => e.replace(c, "-$1").toLowerCase(), u = {
	"&": "&amp;",
	">": "&gt;",
	"<": "&lt;",
	"\"": "&quot;",
	"'": "&#x27;"
}, d = /[&><"']/g, f = (e) => String(e).replace(d, (e) => u[e]), p = (e) => e.type === "ordgroup" || e.type === "color" ? e.body.length === 1 ? p(e.body[0]) : e : e.type === "font" ? p(e.body) : e, m = new Set([
	"mathord",
	"textord",
	"atom"
]), h = (e) => m.has(p(e).type), g = (e) => {
	var t = /^[\x00-\x20]*([^\\/#?]*?)(:|&#0*58|&#x0*3a|&colon)/i.exec(e);
	return t ? t[2] !== ":" || !/^[a-zA-Z][a-zA-Z0-9+\-.]*$/.test(t[1]) ? null : t[1].toLowerCase() : "_relative";
}, _ = {
	displayMode: {
		type: "boolean",
		description: "Render math in display mode, which puts the math in display style (so \\int and \\sum are large, for example), and centers the math on the page on its own line.",
		cli: "-d, --display-mode"
	},
	output: {
		type: { enum: [
			"htmlAndMathml",
			"html",
			"mathml"
		] },
		description: "Determines the markup language of the output.",
		cli: "-F, --format <type>"
	},
	leqno: {
		type: "boolean",
		description: "Render display math in leqno style (left-justified tags)."
	},
	fleqn: {
		type: "boolean",
		description: "Render display math flush left."
	},
	throwOnError: {
		type: "boolean",
		default: !0,
		cli: "-t, --no-throw-on-error",
		cliDescription: "Render errors (in the color given by --error-color) instead of throwing a ParseError exception when encountering an error."
	},
	errorColor: {
		type: "string",
		default: "#cc0000",
		cli: "-c, --error-color <color>",
		cliDescription: "A color string given in the format 'rgb' or 'rrggbb' (no #). This option determines the color of errors rendered by the -t option.",
		cliProcessor: (e) => "#" + e
	},
	macros: {
		type: "object",
		cli: "-m, --macro <def>",
		cliDescription: "Define custom macro of the form '\\foo:expansion' (use multiple -m arguments for multiple macros).",
		cliDefault: [],
		cliProcessor: (e, t) => (t.push(e), t)
	},
	minRuleThickness: {
		type: "number",
		description: "Specifies a minimum thickness, in ems, for fraction lines, `\\sqrt` top lines, `{array}` vertical lines, `\\hline`, `\\hdashline`, `\\underline`, `\\overline`, and the borders of `\\fbox`, `\\boxed`, and `\\fcolorbox`.",
		processor: (e) => Math.max(0, e),
		cli: "--min-rule-thickness <size>",
		cliProcessor: parseFloat
	},
	colorIsTextColor: {
		type: "boolean",
		description: "Makes \\color behave like LaTeX's 2-argument \\textcolor, instead of LaTeX's one-argument \\color mode change.",
		cli: "-b, --color-is-text-color"
	},
	strict: {
		type: [
			{ enum: [
				"warn",
				"ignore",
				"error"
			] },
			"boolean",
			"function"
		],
		description: "Turn on strict / LaTeX faithfulness mode, which throws an error if the input uses features that are not supported by LaTeX.",
		cli: "-S, --strict",
		cliDefault: !1
	},
	trust: {
		type: ["boolean", "function"],
		description: "Trust the input, enabling all HTML features such as \\url.",
		cli: "-T, --trust"
	},
	maxSize: {
		type: "number",
		default: Infinity,
		description: "If non-zero, all user-specified sizes, e.g. in \\rule{500em}{500em}, will be capped to maxSize ems. Otherwise, elements and spaces can be arbitrarily large",
		processor: (e) => Math.max(0, e),
		cli: "-s, --max-size <n>",
		cliProcessor: parseInt
	},
	maxExpand: {
		type: "number",
		default: 1e3,
		description: "Limit the number of macro expansions to the specified number, to prevent e.g. infinite macro loops. If set to Infinity, the macro expander will try to fully expand as in LaTeX.",
		processor: (e) => Math.max(0, e),
		cli: "-e, --max-expand <n>",
		cliProcessor: (e) => e === "Infinity" ? Infinity : parseInt(e)
	},
	globalGroup: {
		type: "boolean",
		cli: !1
	}
};
function v(e) {
	if (typeof e != "string") return e.enum[0];
	switch (e) {
		case "boolean": return !1;
		case "string": return "";
		case "number": return 0;
		case "object": return {};
		default: throw Error("Unexpected schema type; settings must declare an explicit default.");
	}
}
function y(e) {
	return e.default === void 0 ? v(Array.isArray(e.type) ? e.type[0] : e.type) : e.default;
}
function b(e, t, n, r) {
	var i = n[t];
	e[t] = i === void 0 ? y(r) : r.processor ? r.processor(i) : i;
}
var x = class {
	constructor(e) {
		e === void 0 && (e = {}), this.displayMode = void 0, this.output = void 0, this.leqno = void 0, this.fleqn = void 0, this.throwOnError = void 0, this.errorColor = void 0, this.macros = void 0, this.minRuleThickness = void 0, this.colorIsTextColor = void 0, this.strict = void 0, this.trust = void 0, this.maxSize = void 0, this.maxExpand = void 0, this.globalGroup = void 0, e ||= {};
		for (var t of Object.keys(_)) {
			var n = _[t];
			n && b(this, t, e, n);
		}
	}
	reportNonstrict(e, t, n) {
		var r = this.strict;
		if (typeof r == "function" && (r = r(e, t, n)), !(!r || r === "ignore")) {
			if (r === !0 || r === "error") throw new s("LaTeX-incompatible input and strict mode is set to 'error': " + (t + " [" + e + "]"), n);
			r === "warn" ? typeof console < "u" && console.warn("LaTeX-incompatible input and strict mode is set to 'warn': " + (t + " [" + e + "]")) : typeof console < "u" && console.warn("LaTeX-incompatible input and strict mode is set to " + ("unrecognized '" + r + "': " + t + " [" + e + "]"));
		}
	}
	useStrictBehavior(e, t, n) {
		var r = this.strict;
		if (typeof r == "function") try {
			r = r(e, t, n);
		} catch {
			r = "error";
		}
		return !r || r === "ignore" ? !1 : r === !0 || r === "error" ? !0 : r === "warn" ? (typeof console < "u" && console.warn("LaTeX-incompatible input and strict mode is set to 'warn': " + (t + " [" + e + "]")), !1) : (typeof console < "u" && console.warn("LaTeX-incompatible input and strict mode is set to " + ("unrecognized '" + r + "': " + t + " [" + e + "]")), !1);
	}
	isTrusted(e) {
		if ("url" in e && e.url && !e.protocol) {
			var t = g(e.url);
			if (t == null) return !1;
			e.protocol = t;
		}
		return !!(typeof this.trust == "function" ? this.trust(e) : this.trust);
	}
}, S = class {
	constructor(e, t, n) {
		this.id = void 0, this.size = void 0, this.cramped = void 0, this.id = e, this.size = t, this.cramped = n;
	}
	sup() {
		return re[ie[this.id]];
	}
	sub() {
		return re[ae[this.id]];
	}
	fracNum() {
		return re[oe[this.id]];
	}
	fracDen() {
		return re[se[this.id]];
	}
	cramp() {
		return re[ce[this.id]];
	}
	text() {
		return re[le[this.id]];
	}
	isTight() {
		return this.size >= 2;
	}
}, C = 0, w = 1, T = 2, E = 3, ee = 4, te = 5, ne = 6, D = 7, re = [
	new S(C, 0, !1),
	new S(w, 0, !0),
	new S(T, 1, !1),
	new S(E, 1, !0),
	new S(ee, 2, !1),
	new S(te, 2, !0),
	new S(ne, 3, !1),
	new S(D, 3, !0)
], ie = [
	ee,
	te,
	ee,
	te,
	ne,
	D,
	ne,
	D
], ae = [
	te,
	te,
	te,
	te,
	D,
	D,
	D,
	D
], oe = [
	T,
	E,
	ee,
	te,
	ne,
	D,
	ne,
	D
], se = [
	E,
	E,
	te,
	te,
	D,
	D,
	D,
	D
], ce = [
	w,
	w,
	E,
	E,
	te,
	te,
	D,
	D
], le = [
	C,
	w,
	T,
	E,
	T,
	E,
	T,
	E
], O = {
	DISPLAY: re[C],
	TEXT: re[T],
	SCRIPT: re[ee],
	SCRIPTSCRIPT: re[ne]
}, ue = [
	{
		name: "latin",
		blocks: [[256, 591], [768, 879]]
	},
	{
		name: "cyrillic",
		blocks: [[1024, 1279]]
	},
	{
		name: "armenian",
		blocks: [[1328, 1423]]
	},
	{
		name: "brahmic",
		blocks: [[2304, 4255]]
	},
	{
		name: "georgian",
		blocks: [[4256, 4351]]
	},
	{
		name: "cjk",
		blocks: [
			[12288, 12543],
			[19968, 40879],
			[65280, 65376]
		]
	},
	{
		name: "hangul",
		blocks: [[44032, 55215]]
	}
];
function de(e) {
	for (var t = 0; t < ue.length; t++) for (var n = ue[t], r = 0; r < n.blocks.length; r++) {
		var i = n.blocks[r];
		if (e >= i[0] && e <= i[1]) return n.name;
	}
	return null;
}
var fe = [];
ue.forEach((e) => e.blocks.forEach((e) => fe.push(...e)));
function pe(e) {
	for (var t = 0; t < fe.length; t += 2) if (e >= fe[t] && e <= fe[t + 1]) return !0;
	return !1;
}
var me = (e) => e + " " + e, he = 80, ge = function(e, t) {
	return "M95," + (622 + e + t) + "\nc-2.7,0,-7.17,-2.7,-13.5,-8c-5.8,-5.3,-9.5,-10,-9.5,-14\nc0,-2,0.3,-3.3,1,-4c1.3,-2.7,23.83,-20.7,67.5,-54\nc44.2,-33.3,65.8,-50.3,66.5,-51c1.3,-1.3,3,-2,5,-2c4.7,0,8.7,3.3,12,10\ns173,378,173,378c0.7,0,35.3,-71,104,-213c68.7,-142,137.5,-285,206.5,-429\nc69,-144,104.5,-217.7,106.5,-221\nl" + e / 2.075 + " -" + e + "\nc5.3,-9.3,12,-14,20,-14\nH400000v" + (40 + e) + "H845.2724\ns-225.272,467,-225.272,467s-235,486,-235,486c-2.7,4.7,-9,7,-19,7\nc-6,0,-10,-1,-12,-3s-194,-422,-194,-422s-65,47,-65,47z\nM" + (834 + e) + " " + t + "h400000v" + (40 + e) + "h-400000z";
}, _e = function(e, t) {
	return "M263," + (601 + e + t) + "c0.7,0,18,39.7,52,119\nc34,79.3,68.167,158.7,102.5,238c34.3,79.3,51.8,119.3,52.5,120\nc340,-704.7,510.7,-1060.3,512,-1067\nl" + e / 2.084 + " -" + e + "\nc4.7,-7.3,11,-11,19,-11\nH40000v" + (40 + e) + "H1012.3\ns-271.3,567,-271.3,567c-38.7,80.7,-84,175,-136,283c-52,108,-89.167,185.3,-111.5,232\nc-22.3,46.7,-33.8,70.3,-34.5,71c-4.7,4.7,-12.3,7,-23,7s-12,-1,-12,-1\ns-109,-253,-109,-253c-72.7,-168,-109.3,-252,-110,-252c-10.7,8,-22,16.7,-34,26\nc-22,17.3,-33.3,26,-34,26s-26,-26,-26,-26s76,-59,76,-59s76,-60,76,-60z\nM" + (1001 + e) + " " + t + "h400000v" + (40 + e) + "h-400000z";
}, ve = function(e, t) {
	return "M983 " + (10 + e + t) + "\nl" + e / 3.13 + " -" + e + "\nc4,-6.7,10,-10,18,-10 H400000v" + (40 + e) + "\nH1013.1s-83.4,268,-264.1,840c-180.7,572,-277,876.3,-289,913c-4.7,4.7,-12.7,7,-24,7\ns-12,0,-12,0c-1.3,-3.3,-3.7,-11.7,-7,-25c-35.3,-125.3,-106.7,-373.3,-214,-744\nc-10,12,-21,25,-33,39s-32,39,-32,39c-6,-5.3,-15,-14,-27,-26s25,-30,25,-30\nc26.7,-32.7,52,-63,76,-91s52,-60,52,-60s208,722,208,722\nc56,-175.3,126.3,-397.3,211,-666c84.7,-268.7,153.8,-488.2,207.5,-658.5\nc53.7,-170.3,84.5,-266.8,92.5,-289.5z\nM" + (1001 + e) + " " + t + "h400000v" + (40 + e) + "h-400000z";
}, ye = function(e, t) {
	return "M424," + (2398 + e + t) + "\nc-1.3,-0.7,-38.5,-172,-111.5,-514c-73,-342,-109.8,-513.3,-110.5,-514\nc0,-2,-10.7,14.3,-32,49c-4.7,7.3,-9.8,15.7,-15.5,25c-5.7,9.3,-9.8,16,-12.5,20\ns-5,7,-5,7c-4,-3.3,-8.3,-7.7,-13,-13s-13,-13,-13,-13s76,-122,76,-122s77,-121,77,-121\ns209,968,209,968c0,-2,84.7,-361.7,254,-1079c169.3,-717.3,254.7,-1077.7,256,-1081\nl" + e / 4.223 + " -" + e + "c4,-6.7,10,-10,18,-10 H400000\nv" + (40 + e) + "H1014.6\ns-87.3,378.7,-272.6,1166c-185.3,787.3,-279.3,1182.3,-282,1185\nc-2,6,-10,9,-24,9\nc-8,0,-12,-0.7,-12,-2z M" + (1001 + e) + " " + t + "\nh400000v" + (40 + e) + "h-400000z";
}, be = function(e, t) {
	return "M473," + (2713 + e + t) + "\nc339.3,-1799.3,509.3,-2700,510,-2702 l" + e / 5.298 + " -" + e + "\nc3.3,-7.3,9.3,-11,18,-11 H400000v" + (40 + e) + "H1017.7\ns-90.5,478,-276.2,1466c-185.7,988,-279.5,1483,-281.5,1485c-2,6,-10,9,-24,9\nc-8,0,-12,-0.7,-12,-2c0,-1.3,-5.3,-32,-16,-92c-50.7,-293.3,-119.7,-693.3,-207,-1200\nc0,-1.3,-5.3,8.7,-16,30c-10.7,21.3,-21.3,42.7,-32,64s-16,33,-16,33s-26,-26,-26,-26\ns76,-153,76,-153s77,-151,77,-151c0.7,0.7,35.7,202,105,604c67.3,400.7,102,602.7,104,\n606zM" + (1001 + e) + " " + t + "h400000v" + (40 + e) + "H1017.7z";
}, xe = function(e) {
	var t = e / 2;
	return "M400000 " + e + " H0 L" + t + " 0 l65 45 L145 " + (e - 80) + " H400000z";
}, Se = function(e, t, n) {
	var r = n - 54 - t - e;
	return "M702 " + (e + t) + "H400000" + (40 + e) + "\nH742v" + r + "l-4 4-4 4c-.667.7 -2 1.5-4 2.5s-4.167 1.833-6.5 2.5-5.5 1-9.5 1\nh-12l-28-84c-16.667-52-96.667 -294.333-240-727l-212 -643 -85 170\nc-4-3.333-8.333-7.667-13 -13l-13-13l77-155 77-156c66 199.333 139 419.667\n219 661 l218 661zM702 " + t + "H400000v" + (40 + e) + "H742z";
}, Ce = function(e, t, n) {
	t = 1e3 * t;
	var r = "";
	switch (e) {
		case "sqrtMain":
			r = ge(t, he);
			break;
		case "sqrtSize1":
			r = _e(t, he);
			break;
		case "sqrtSize2":
			r = ve(t, he);
			break;
		case "sqrtSize3":
			r = ye(t, he);
			break;
		case "sqrtSize4":
			r = be(t, he);
			break;
		case "sqrtTall": r = Se(t, he, n);
	}
	return r;
}, we = function(e, t) {
	switch (e) {
		case "⎜": return me("M291 0 H417 V" + t + " H291z");
		case "∣": return me("M145 0 H188 V" + t + " H145z");
		case "∥": return me("M145 0 H188 V" + t + " H145z") + me("M367 0 H410 V" + t + " H367z");
		case "⎟": return me("M457 0 H583 V" + t + " H457z");
		case "⎢": return me("M319 0 H403 V" + t + " H319z");
		case "⎥": return me("M263 0 H347 V" + t + " H263z");
		case "⎪": return me("M384 0 H504 V" + t + " H384z");
		case "⏐": return me("M312 0 H355 V" + t + " H312z");
		case "‖": return me("M257 0 H300 V" + t + " H257z") + me("M478 0 H521 V" + t + " H478z");
		default: return "";
	}
}, Te = {
	doubleleftarrow: "M262 157\nl10-10c34-36 62.7-77 86-123 3.3-8 5-13.3 5-16 0-5.3-6.7-8-20-8-7.3\n 0-12.2.5-14.5 1.5-2.3 1-4.8 4.5-7.5 10.5-49.3 97.3-121.7 169.3-217 216-28\n 14-57.3 25-88 33-6.7 2-11 3.8-13 5.5-2 1.7-3 4.2-3 7.5s1 5.8 3 7.5\nc2 1.7 6.3 3.5 13 5.5 68 17.3 128.2 47.8 180.5 91.5 52.3 43.7 93.8 96.2 124.5\n 157.5 9.3 8 15.3 12.3 18 13h6c12-.7 18-4 18-10 0-2-1.7-7-5-15-23.3-46-52-87\n-86-123l-10-10h399738v-40H218c328 0 0 0 0 0l-10-8c-26.7-20-65.7-43-117-69 2.7\n-2 6-3.7 10-5 36.7-16 72.3-37.3 107-64l10-8h399782v-40z\nm8 0v40h399730v-40zm0 194v40h399730v-40z",
	doublerightarrow: "M399738 392l\n-10 10c-34 36-62.7 77-86 123-3.3 8-5 13.3-5 16 0 5.3 6.7 8 20 8 7.3 0 12.2-.5\n 14.5-1.5 2.3-1 4.8-4.5 7.5-10.5 49.3-97.3 121.7-169.3 217-216 28-14 57.3-25 88\n-33 6.7-2 11-3.8 13-5.5 2-1.7 3-4.2 3-7.5s-1-5.8-3-7.5c-2-1.7-6.3-3.5-13-5.5-68\n-17.3-128.2-47.8-180.5-91.5-52.3-43.7-93.8-96.2-124.5-157.5-9.3-8-15.3-12.3-18\n-13h-6c-12 .7-18 4-18 10 0 2 1.7 7 5 15 23.3 46 52 87 86 123l10 10H0v40h399782\nc-328 0 0 0 0 0l10 8c26.7 20 65.7 43 117 69-2.7 2-6 3.7-10 5-36.7 16-72.3 37.3\n-107 64l-10 8H0v40zM0 157v40h399730v-40zm0 194v40h399730v-40z",
	leftarrow: "M400000 241H110l3-3c68.7-52.7 113.7-120\n 135-202 4-14.7 6-23 6-25 0-7.3-7-11-21-11-8 0-13.2.8-15.5 2.5-2.3 1.7-4.2 5.8\n-5.5 12.5-1.3 4.7-2.7 10.3-4 17-12 48.7-34.8 92-68.5 130S65.3 228.3 18 247\nc-10 4-16 7.7-18 11 0 8.7 6 14.3 18 17 47.3 18.7 87.8 47 121.5 85S196 441.3 208\n 490c.7 2 1.3 5 2 9s1.2 6.7 1.5 8c.3 1.3 1 3.3 2 6s2.2 4.5 3.5 5.5c1.3 1 3.3\n 1.8 6 2.5s6 1 10 1c14 0 21-3.7 21-11 0-2-2-10.3-6-25-20-79.3-65-146.7-135-202\n l-3-3h399890zM100 241v40h399900v-40z",
	leftbrace: "M6 548l-6-6v-35l6-11c56-104 135.3-181.3 238-232 57.3-28.7 117\n-45 179-50h399577v120H403c-43.3 7-81 15-113 26-100.7 33-179.7 91-237 174-2.7\n 5-6 9-10 13-.7 1-7.3 1-20 1H6z",
	leftbraceunder: "M0 6l6-6h17c12.688 0 19.313.3 20 1 4 4 7.313 8.3 10 13\n 35.313 51.3 80.813 93.8 136.5 127.5 55.688 33.7 117.188 55.8 184.5 66.5.688\n 0 2 .3 4 1 18.688 2.7 76 4.3 172 5h399450v120H429l-6-1c-124.688-8-235-61.7\n-331-161C60.687 138.7 32.312 99.3 7 54L0 41V6z",
	leftgroup: "M400000 80\nH435C64 80 168.3 229.4 21 260c-5.9 1.2-18 0-18 0-2 0-3-1-3-3v-38C76 61 257 0\n 435 0h399565z",
	leftgroupunder: "M400000 262\nH435C64 262 168.3 112.6 21 82c-5.9-1.2-18 0-18 0-2 0-3 1-3 3v38c76 158 257 219\n 435 219h399565z",
	leftharpoon: "M0 267c.7 5.3 3 10 7 14h399993v-40H93c3.3\n-3.3 10.2-9.5 20.5-18.5s17.8-15.8 22.5-20.5c50.7-52 88-110.3 112-175 4-11.3 5\n-18.3 3-21-1.3-4-7.3-6-18-6-8 0-13 .7-15 2s-4.7 6.7-8 16c-42 98.7-107.3 174.7\n-196 228-6.7 4.7-10.7 8-12 10-1.3 2-2 5.7-2 11zm100-26v40h399900v-40z",
	leftharpoonplus: "M0 267c.7 5.3 3 10 7 14h399993v-40H93c3.3-3.3 10.2-9.5\n 20.5-18.5s17.8-15.8 22.5-20.5c50.7-52 88-110.3 112-175 4-11.3 5-18.3 3-21-1.3\n-4-7.3-6-18-6-8 0-13 .7-15 2s-4.7 6.7-8 16c-42 98.7-107.3 174.7-196 228-6.7 4.7\n-10.7 8-12 10-1.3 2-2 5.7-2 11zm100-26v40h399900v-40zM0 435v40h400000v-40z\nm0 0v40h400000v-40z",
	leftharpoondown: "M7 241c-4 4-6.333 8.667-7 14 0 5.333.667 9 2 11s5.333\n 5.333 12 10c90.667 54 156 130 196 228 3.333 10.667 6.333 16.333 9 17 2 .667 5\n 1 9 1h5c10.667 0 16.667-2 18-6 2-2.667 1-9.667-3-21-32-87.333-82.667-157.667\n-152-211l-3-3h399907v-40zM93 281 H400000 v-40L7 241z",
	leftharpoondownplus: "M7 435c-4 4-6.3 8.7-7 14 0 5.3.7 9 2 11s5.3 5.3 12\n 10c90.7 54 156 130 196 228 3.3 10.7 6.3 16.3 9 17 2 .7 5 1 9 1h5c10.7 0 16.7\n-2 18-6 2-2.7 1-9.7-3-21-32-87.3-82.7-157.7-152-211l-3-3h399907v-40H7zm93 0\nv40h399900v-40zM0 241v40h399900v-40zm0 0v40h399900v-40z",
	lefthook: "M400000 281 H103s-33-11.2-61-33.5S0 197.3 0 164s14.2-61.2 42.5\n-83.5C70.8 58.2 104 47 142 47 c16.7 0 25 6.7 25 20 0 12-8.7 18.7-26 20-40 3.3\n-68.7 15.7-86 37-10 12-15 25.3-15 40 0 22.7 9.8 40.7 29.5 54 19.7 13.3 43.5 21\n 71.5 23h399859zM103 281v-40h399897v40z",
	leftlinesegment: me("M40 281 V428 H0 V94 H40 V241 H400000 v40z"),
	leftbracketunder: me("M0 0 h120 V290 H399995 v120 H0z"),
	leftbracketover: me("M0 440 h120 V150 H399995 v-120 H0z"),
	leftmapsto: me("M40 281 V448H0V74H40V241H400000v40z"),
	leftToFrom: "M0 147h400000v40H0zm0 214c68 40 115.7 95.7 143 167h22c15.3 0 23\n-.3 23-1 0-1.3-5.3-13.7-16-37-18-35.3-41.3-69-70-101l-7-8h399905v-40H95l7-8\nc28.7-32 52-65.7 70-101 10.7-23.3 16-35.7 16-37 0-.7-7.7-1-23-1h-22C115.7 265.3\n 68 321 0 361zm0-174v-40h399900v40zm100 154v40h399900v-40z",
	longequal: me("M0 50 h400000 v40H0z m0 194h40000v40H0z"),
	midbrace: "M200428 334\nc-100.7-8.3-195.3-44-280-108-55.3-42-101.7-93-139-153l-9-14c-2.7 4-5.7 8.7-9 14\n-53.3 86.7-123.7 153-211 199-66.7 36-137.3 56.3-212 62H0V214h199568c178.3-11.7\n 311.7-78.3 403-201 6-8 9.7-12 11-12 .7-.7 6.7-1 18-1s17.3.3 18 1c1.3 0 5 4 11\n 12 44.7 59.3 101.3 106.3 170 141s145.3 54.3 229 60h199572v120z",
	midbraceunder: "M199572 214\nc100.7 8.3 195.3 44 280 108 55.3 42 101.7 93 139 153l9 14c2.7-4 5.7-8.7 9-14\n 53.3-86.7 123.7-153 211-199 66.7-36 137.3-56.3 212-62h199568v120H200432c-178.3\n 11.7-311.7 78.3-403 201-6 8-9.7 12-11 12-.7.7-6.7 1-18 1s-17.3-.3-18-1c-1.3 0\n-5-4-11-12-44.7-59.3-101.3-106.3-170-141s-145.3-54.3-229-60H0V214z",
	oiintSize1: "M512.6 71.6c272.6 0 320.3 106.8 320.3 178.2 0 70.8-47.7 177.6\n-320.3 177.6S193.1 320.6 193.1 249.8c0-71.4 46.9-178.2 319.5-178.2z\nm368.1 178.2c0-86.4-60.9-215.4-368.1-215.4-306.4 0-367.3 129-367.3 215.4 0 85.8\n60.9 214.8 367.3 214.8 307.2 0 368.1-129 368.1-214.8z",
	oiintSize2: "M757.8 100.1c384.7 0 451.1 137.6 451.1 230 0 91.3-66.4 228.8\n-451.1 228.8-386.3 0-452.7-137.5-452.7-228.8 0-92.4 66.4-230 452.7-230z\nm502.4 230c0-111.2-82.4-277.2-502.4-277.2s-504 166-504 277.2\nc0 110 84 276 504 276s502.4-166 502.4-276z",
	oiiintSize1: "M681.4 71.6c408.9 0 480.5 106.8 480.5 178.2 0 70.8-71.6 177.6\n-480.5 177.6S202.1 320.6 202.1 249.8c0-71.4 70.5-178.2 479.3-178.2z\nm525.8 178.2c0-86.4-86.8-215.4-525.7-215.4-437.9 0-524.7 129-524.7 215.4 0\n85.8 86.8 214.8 524.7 214.8 438.9 0 525.7-129 525.7-214.8z",
	oiiintSize2: "M1021.2 53c603.6 0 707.8 165.8 707.8 277.2 0 110-104.2 275.8\n-707.8 275.8-606 0-710.2-165.8-710.2-275.8C311 218.8 415.2 53 1021.2 53z\nm770.4 277.1c0-131.2-126.4-327.6-770.5-327.6S248.4 198.9 248.4 330.1\nc0 130 128.8 326.4 772.7 326.4s770.5-196.4 770.5-326.4z",
	rightarrow: "M0 241v40h399891c-47.3 35.3-84 78-110 128\n-16.7 32-27.7 63.7-33 95 0 1.3-.2 2.7-.5 4-.3 1.3-.5 2.3-.5 3 0 7.3 6.7 11 20\n 11 8 0 13.2-.8 15.5-2.5 2.3-1.7 4.2-5.5 5.5-11.5 2-13.3 5.7-27 11-41 14.7-44.7\n 39-84.5 73-119.5s73.7-60.2 119-75.5c6-2 9-5.7 9-11s-3-9-9-11c-45.3-15.3-85\n-40.5-119-75.5s-58.3-74.8-73-119.5c-4.7-14-8.3-27.3-11-40-1.3-6.7-3.2-10.8-5.5\n-12.5-2.3-1.7-7.5-2.5-15.5-2.5-14 0-21 3.7-21 11 0 2 2 10.3 6 25 20.7 83.3 67\n 151.7 139 205zm0 0v40h399900v-40z",
	rightbrace: "M400000 542l\n-6 6h-17c-12.7 0-19.3-.3-20-1-4-4-7.3-8.3-10-13-35.3-51.3-80.8-93.8-136.5-127.5\ns-117.2-55.8-184.5-66.5c-.7 0-2-.3-4-1-18.7-2.7-76-4.3-172-5H0V214h399571l6 1\nc124.7 8 235 61.7 331 161 31.3 33.3 59.7 72.7 85 118l7 13v35z",
	rightbraceunder: "M399994 0l6 6v35l-6 11c-56 104-135.3 181.3-238 232-57.3\n 28.7-117 45-179 50H-300V214h399897c43.3-7 81-15 113-26 100.7-33 179.7-91 237\n-174 2.7-5 6-9 10-13 .7-1 7.3-1 20-1h17z",
	rightgroup: "M0 80h399565c371 0 266.7 149.4 414 180 5.9 1.2 18 0 18 0 2 0\n 3-1 3-3v-38c-76-158-257-219-435-219H0z",
	rightgroupunder: "M0 262h399565c371 0 266.7-149.4 414-180 5.9-1.2 18 0 18\n 0 2 0 3 1 3 3v38c-76 158-257 219-435 219H0z",
	rightharpoon: "M0 241v40h399993c4.7-4.7 7-9.3 7-14 0-9.3\n-3.7-15.3-11-18-92.7-56.7-159-133.7-199-231-3.3-9.3-6-14.7-8-16-2-1.3-7-2-15-2\n-10.7 0-16.7 2-18 6-2 2.7-1 9.7 3 21 15.3 42 36.7 81.8 64 119.5 27.3 37.7 58\n 69.2 92 94.5zm0 0v40h399900v-40z",
	rightharpoonplus: "M0 241v40h399993c4.7-4.7 7-9.3 7-14 0-9.3-3.7-15.3-11\n-18-92.7-56.7-159-133.7-199-231-3.3-9.3-6-14.7-8-16-2-1.3-7-2-15-2-10.7 0-16.7\n 2-18 6-2 2.7-1 9.7 3 21 15.3 42 36.7 81.8 64 119.5 27.3 37.7 58 69.2 92 94.5z\nm0 0v40h399900v-40z m100 194v40h399900v-40zm0 0v40h399900v-40z",
	rightharpoondown: "M399747 511c0 7.3 6.7 11 20 11 8 0 13-.8 15-2.5s4.7-6.8\n 8-15.5c40-94 99.3-166.3 178-217 13.3-8 20.3-12.3 21-13 5.3-3.3 8.5-5.8 9.5\n-7.5 1-1.7 1.5-5.2 1.5-10.5s-2.3-10.3-7-15H0v40h399908c-34 25.3-64.7 57-92 95\n-27.3 38-48.7 77.7-64 119-3.3 8.7-5 14-5 16zM0 241v40h399900v-40z",
	rightharpoondownplus: "M399747 705c0 7.3 6.7 11 20 11 8 0 13-.8\n 15-2.5s4.7-6.8 8-15.5c40-94 99.3-166.3 178-217 13.3-8 20.3-12.3 21-13 5.3-3.3\n 8.5-5.8 9.5-7.5 1-1.7 1.5-5.2 1.5-10.5s-2.3-10.3-7-15H0v40h399908c-34 25.3\n-64.7 57-92 95-27.3 38-48.7 77.7-64 119-3.3 8.7-5 14-5 16zM0 435v40h399900v-40z\nm0-194v40h400000v-40zm0 0v40h400000v-40z",
	righthook: "M399859 241c-764 0 0 0 0 0 40-3.3 68.7-15.7 86-37 10-12 15-25.3\n 15-40 0-22.7-9.8-40.7-29.5-54-19.7-13.3-43.5-21-71.5-23-17.3-1.3-26-8-26-20 0\n-13.3 8.7-20 26-20 38 0 71 11.2 99 33.5 0 0 7 5.6 21 16.7 14 11.2 21 33.5 21\n 66.8s-14 61.2-42 83.5c-28 22.3-61 33.5-99 33.5L0 241z M0 281v-40h399859v40z",
	rightlinesegment: me("M399960 241 V94 h40 V428 h-40 V281 H0 v-40z"),
	rightbracketunder: me("M399995 0 h-120 V290 H0 v120 H400000z"),
	rightbracketover: me("M399995 440 h-120 V150 H0 v-120 H399995z"),
	rightToFrom: "M400000 167c-70.7-42-118-97.7-142-167h-23c-15.3 0-23 .3-23\n 1 0 1.3 5.3 13.7 16 37 18 35.3 41.3 69 70 101l7 8H0v40h399905l-7 8c-28.7 32\n-52 65.7-70 101-10.7 23.3-16 35.7-16 37 0 .7 7.7 1 23 1h23c24-69.3 71.3-125 142\n-167z M100 147v40h399900v-40zM0 341v40h399900v-40z",
	twoheadleftarrow: "M0 167c68 40\n 115.7 95.7 143 167h22c15.3 0 23-.3 23-1 0-1.3-5.3-13.7-16-37-18-35.3-41.3-69\n-70-101l-7-8h125l9 7c50.7 39.3 85 86 103 140h46c0-4.7-6.3-18.7-19-42-18-35.3\n-40-67.3-66-96l-9-9h399716v-40H284l9-9c26-28.7 48-60.7 66-96 12.7-23.333 19\n-37.333 19-42h-46c-18 54-52.3 100.7-103 140l-9 7H95l7-8c28.7-32 52-65.7 70-101\n 10.7-23.333 16-35.7 16-37 0-.7-7.7-1-23-1h-22C115.7 71.3 68 127 0 167z",
	twoheadrightarrow: "M400000 167\nc-68-40-115.7-95.7-143-167h-22c-15.3 0-23 .3-23 1 0 1.3 5.3 13.7 16 37 18 35.3\n 41.3 69 70 101l7 8h-125l-9-7c-50.7-39.3-85-86-103-140h-46c0 4.7 6.3 18.7 19 42\n 18 35.3 40 67.3 66 96l9 9H0v40h399716l-9 9c-26 28.7-48 60.7-66 96-12.7 23.333\n-19 37.333-19 42h46c18-54 52.3-100.7 103-140l9-7h125l-7 8c-28.7 32-52 65.7-70\n 101-10.7 23.333-16 35.7-16 37 0 .7 7.7 1 23 1h22c27.3-71.3 75-127 143-167z",
	tilde1: "M200 55.538c-77 0-168 73.953-177 73.953-3 0-7\n-2.175-9-5.437L2 97c-1-2-2-4-2-6 0-4 2-7 5-9l20-12C116 12 171 0 207 0c86 0\n 114 68 191 68 78 0 168-68 177-68 4 0 7 2 9 5l12 19c1 2.175 2 4.35 2 6.525 0\n 4.35-2 7.613-5 9.788l-19 13.05c-92 63.077-116.937 75.308-183 76.128\n-68.267.847-113-73.952-191-73.952z",
	tilde2: "M344 55.266c-142 0-300.638 81.316-311.5 86.418\n-8.01 3.762-22.5 10.91-23.5 5.562L1 120c-1-2-1-3-1-4 0-5 3-9 8-10l18.4-9C160.9\n 31.9 283 0 358 0c148 0 188 122 331 122s314-97 326-97c4 0 8 2 10 7l7 21.114\nc1 2.14 1 3.21 1 4.28 0 5.347-3 9.626-7 10.696l-22.3 12.622C852.6 158.372 751\n 181.476 676 181.476c-149 0-189-126.21-332-126.21z",
	tilde3: "M786 59C457 59 32 175.242 13 175.242c-6 0-10-3.457\n-11-10.37L.15 138c-1-7 3-12 10-13l19.2-6.4C378.4 40.7 634.3 0 804.3 0c337 0\n 411.8 157 746.8 157 328 0 754-112 773-112 5 0 10 3 11 9l1 14.075c1 8.066-.697\n 16.595-6.697 17.492l-21.052 7.31c-367.9 98.146-609.15 122.696-778.15 122.696\n -338 0-409-156.573-744-156.573z",
	tilde4: "M786 58C457 58 32 177.487 13 177.487c-6 0-10-3.345\n-11-10.035L.15 143c-1-7 3-12 10-13l22-6.7C381.2 35 637.15 0 807.15 0c337 0 409\n 177 744 177 328 0 754-127 773-127 5 0 10 3 11 9l1 14.794c1 7.805-3 13.38-9\n 14.495l-20.7 5.574c-366.85 99.79-607.3 139.372-776.3 139.372-338 0-409\n -175.236-744-175.236z",
	vec: "M377 20c0-5.333 1.833-10 5.5-14S391 0 397 0c4.667 0 8.667 1.667 12 5\n3.333 2.667 6.667 9 10 19 6.667 24.667 20.333 43.667 41 57 7.333 4.667 11\n10.667 11 18 0 6-1 10-3 12s-6.667 5-14 9c-28.667 14.667-53.667 35.667-75 63\n-1.333 1.333-3.167 3.5-5.5 6.5s-4 4.833-5 5.5c-1 .667-2.5 1.333-4.5 2s-4.333 1\n-7 1c-4.667 0-9.167-1.833-13.5-5.5S337 184 337 178c0-12.667 15.667-32.333 47-59\nH213l-171-1c-8.667-6-13-12.333-13-19 0-4.667 4.333-11.333 13-20h359\nc-16-25.333-24-45-24-59z",
	widehat1: "M529 0h5l519 115c5 1 9 5 9 10 0 1-1 2-1 3l-4 22\nc-1 5-5 9-11 9h-2L532 67 19 159h-2c-5 0-9-4-11-9l-5-22c-1-6 2-12 8-13z",
	widehat2: "M1181 0h2l1171 176c6 0 10 5 10 11l-2 23c-1 6-5 10\n-11 10h-1L1182 67 15 220h-1c-6 0-10-4-11-10l-2-23c-1-6 4-11 10-11z",
	widehat3: "M1181 0h2l1171 236c6 0 10 5 10 11l-2 23c-1 6-5 10\n-11 10h-1L1182 67 15 280h-1c-6 0-10-4-11-10l-2-23c-1-6 4-11 10-11z",
	widehat4: "M1181 0h2l1171 296c6 0 10 5 10 11l-2 23c-1 6-5 10\n-11 10h-1L1182 67 15 340h-1c-6 0-10-4-11-10l-2-23c-1-6 4-11 10-11z",
	widecheck1: "M529,159h5l519,-115c5,-1,9,-5,9,-10c0,-1,-1,-2,-1,-3l-4,-22c-1,\n-5,-5,-9,-11,-9h-2l-512,92l-513,-92h-2c-5,0,-9,4,-11,9l-5,22c-1,6,2,12,8,13z",
	widecheck2: "M1181,220h2l1171,-176c6,0,10,-5,10,-11l-2,-23c-1,-6,-5,-10,\n-11,-10h-1l-1168,153l-1167,-153h-1c-6,0,-10,4,-11,10l-2,23c-1,6,4,11,10,11z",
	widecheck3: "M1181,280h2l1171,-236c6,0,10,-5,10,-11l-2,-23c-1,-6,-5,-10,\n-11,-10h-1l-1168,213l-1167,-213h-1c-6,0,-10,4,-11,10l-2,23c-1,6,4,11,10,11z",
	widecheck4: "M1181,340h2l1171,-296c6,0,10,-5,10,-11l-2,-23c-1,-6,-5,-10,\n-11,-10h-1l-1168,273l-1167,-273h-1c-6,0,-10,4,-11,10l-2,23c-1,6,4,11,10,11z",
	baraboveleftarrow: "M400000 620h-399890l3 -3c68.7 -52.7 113.7 -120 135 -202\nc4 -14.7 6 -23 6 -25c0 -7.3 -7 -11 -21 -11c-8 0 -13.2 0.8 -15.5 2.5\nc-2.3 1.7 -4.2 5.8 -5.5 12.5c-1.3 4.7 -2.7 10.3 -4 17c-12 48.7 -34.8 92 -68.5 130\ns-74.2 66.3 -121.5 85c-10 4 -16 7.7 -18 11c0 8.7 6 14.3 18 17c47.3 18.7 87.8 47\n121.5 85s56.5 81.3 68.5 130c0.7 2 1.3 5 2 9s1.2 6.7 1.5 8c0.3 1.3 1 3.3 2 6\ns2.2 4.5 3.5 5.5c1.3 1 3.3 1.8 6 2.5s6 1 10 1c14 0 21 -3.7 21 -11\nc0 -2 -2 -10.3 -6 -25c-20 -79.3 -65 -146.7 -135 -202l-3 -3h399890z\nM100 620v40h399900v-40z M0 241v40h399900v-40zM0 241v40h399900v-40z",
	rightarrowabovebar: "M0 241v40h399891c-47.3 35.3-84 78-110 128-16.7 32\n-27.7 63.7-33 95 0 1.3-.2 2.7-.5 4-.3 1.3-.5 2.3-.5 3 0 7.3 6.7 11 20 11 8 0\n13.2-.8 15.5-2.5 2.3-1.7 4.2-5.5 5.5-11.5 2-13.3 5.7-27 11-41 14.7-44.7 39\n-84.5 73-119.5s73.7-60.2 119-75.5c6-2 9-5.7 9-11s-3-9-9-11c-45.3-15.3-85-40.5\n-119-75.5s-58.3-74.8-73-119.5c-4.7-14-8.3-27.3-11-40-1.3-6.7-3.2-10.8-5.5\n-12.5-2.3-1.7-7.5-2.5-15.5-2.5-14 0-21 3.7-21 11 0 2 2 10.3 6 25 20.7 83.3 67\n151.7 139 205zm96 379h399894v40H0zm0 0h399904v40H0z",
	baraboveshortleftharpoon: "M507,435c-4,4,-6.3,8.7,-7,14c0,5.3,0.7,9,2,11\nc1.3,2,5.3,5.3,12,10c90.7,54,156,130,196,228c3.3,10.7,6.3,16.3,9,17\nc2,0.7,5,1,9,1c0,0,5,0,5,0c10.7,0,16.7,-2,18,-6c2,-2.7,1,-9.7,-3,-21\nc-32,-87.3,-82.7,-157.7,-152,-211c0,0,-3,-3,-3,-3l399351,0l0,-40\nc-398570,0,-399437,0,-399437,0z M593 435 v40 H399500 v-40z\nM0 281 v-40 H399908 v40z M0 281 v-40 H399908 v40z",
	rightharpoonaboveshortbar: "M0,241 l0,40c399126,0,399993,0,399993,0\nc4.7,-4.7,7,-9.3,7,-14c0,-9.3,-3.7,-15.3,-11,-18c-92.7,-56.7,-159,-133.7,-199,\n-231c-3.3,-9.3,-6,-14.7,-8,-16c-2,-1.3,-7,-2,-15,-2c-10.7,0,-16.7,2,-18,6\nc-2,2.7,-1,9.7,3,21c15.3,42,36.7,81.8,64,119.5c27.3,37.7,58,69.2,92,94.5z\nM0 241 v40 H399908 v-40z M0 475 v-40 H399500 v40z M0 475 v-40 H399500 v40z",
	shortbaraboveleftharpoon: "M7,435c-4,4,-6.3,8.7,-7,14c0,5.3,0.7,9,2,11\nc1.3,2,5.3,5.3,12,10c90.7,54,156,130,196,228c3.3,10.7,6.3,16.3,9,17c2,0.7,5,1,9,\n1c0,0,5,0,5,0c10.7,0,16.7,-2,18,-6c2,-2.7,1,-9.7,-3,-21c-32,-87.3,-82.7,-157.7,\n-152,-211c0,0,-3,-3,-3,-3l399907,0l0,-40c-399126,0,-399993,0,-399993,0z\nM93 435 v40 H400000 v-40z M500 241 v40 H400000 v-40z M500 241 v40 H400000 v-40z",
	shortrightharpoonabovebar: "M53,241l0,40c398570,0,399437,0,399437,0\nc4.7,-4.7,7,-9.3,7,-14c0,-9.3,-3.7,-15.3,-11,-18c-92.7,-56.7,-159,-133.7,-199,\n-231c-3.3,-9.3,-6,-14.7,-8,-16c-2,-1.3,-7,-2,-15,-2c-10.7,0,-16.7,2,-18,6\nc-2,2.7,-1,9.7,3,21c15.3,42,36.7,81.8,64,119.5c27.3,37.7,58,69.2,92,94.5z\nM500 241 v40 H399408 v-40z M500 435 v40 H400000 v-40z"
}, Ee = function(e, t) {
	switch (e) {
		case "lbrack": return "M403 1759 V84 H666 V0 H319 V1759 v" + t + " v1759 v84 h347 v-84\nH403z M403 1759 V0 H319 V1759 v" + t + " v1759 v84 h84z";
		case "rbrack": return "M347 1759 V0 H0 V84 H263 V1759 v" + t + " v1759 H0 v84 H347z\nM347 1759 V0 H263 V1759 v" + t + " v1759 h84z";
		case "vert": return "M145 15 v585 v" + t + " v585 c2.667,10,9.667,15,21,15\nc10,0,16.667,-5,20,-15 v-585 v" + -t + " v-585 c-2.667,-10,-9.667,-15,-21,-15\nc-10,0,-16.667,5,-20,15z M188 15 H145 v585 v" + t + " v585 h43z";
		case "doublevert": return "M145 15 v585 v" + t + " v585 c2.667,10,9.667,15,21,15\nc10,0,16.667,-5,20,-15 v-585 v" + -t + " v-585 c-2.667,-10,-9.667,-15,-21,-15\nc-10,0,-16.667,5,-20,15z M188 15 H145 v585 v" + t + " v585 h43z\nM367 15 v585 v" + t + " v585 c2.667,10,9.667,15,21,15\nc10,0,16.667,-5,20,-15 v-585 v" + -t + " v-585 c-2.667,-10,-9.667,-15,-21,-15\nc-10,0,-16.667,5,-20,15z M410 15 H367 v585 v" + t + " v585 h43z";
		case "lfloor": return "M319 602 V0 H403 V602 v" + t + " v1715 h263 v84 H319z\nMM319 602 V0 H403 V602 v" + t + " v1715 H319z";
		case "rfloor": return "M319 602 V0 H403 V602 v" + t + " v1799 H0 v-84 H319z\nMM319 602 V0 H403 V602 v" + t + " v1715 H319z";
		case "lceil": return "M403 1759 V84 H666 V0 H319 V1759 v" + t + " v602 h84z\nM403 1759 V0 H319 V1759 v" + t + " v602 h84z";
		case "rceil": return "M347 1759 V0 H0 V84 H263 V1759 v" + t + " v602 h84z\nM347 1759 V0 h-84 V1759 v" + t + " v602 h84z";
		case "lparen": return "M863,9c0,-2,-2,-5,-6,-9c0,0,-17,0,-17,0c-12.7,0,-19.3,0.3,-20,1\nc-5.3,5.3,-10.3,11,-15,17c-242.7,294.7,-395.3,682,-458,1162c-21.3,163.3,-33.3,349,\n-36,557 l0," + (t + 84) + "c0.2,6,0,26,0,60c2,159.3,10,310.7,24,454c53.3,528,210,\n949.7,470,1265c4.7,6,9.7,11.7,15,17c0.7,0.7,7,1,19,1c0,0,18,0,18,0c4,-4,6,-7,6,-9\nc0,-2.7,-3.3,-8.7,-10,-18c-135.3,-192.7,-235.5,-414.3,-300.5,-665c-65,-250.7,-102.5,\n-544.7,-112.5,-882c-2,-104,-3,-167,-3,-189\nl0,-" + (t + 92) + "c0,-162.7,5.7,-314,17,-454c20.7,-272,63.7,-513,129,-723c65.3,\n-210,155.3,-396.3,270,-559c6.7,-9.3,10,-15.3,10,-18z";
		case "rparen": return "M76,0c-16.7,0,-25,3,-25,9c0,2,2,6.3,6,13c21.3,28.7,42.3,60.3,\n63,95c96.7,156.7,172.8,332.5,228.5,527.5c55.7,195,92.8,416.5,111.5,664.5\nc11.3,139.3,17,290.7,17,454c0,28,1.7,43,3.3,45l0," + (t + 9) + "\nc-3,4,-3.3,16.7,-3.3,38c0,162,-5.7,313.7,-17,455c-18.7,248,-55.8,469.3,-111.5,664\nc-55.7,194.7,-131.8,370.3,-228.5,527c-20.7,34.7,-41.7,66.3,-63,95c-2,3.3,-4,7,-6,11\nc0,7.3,5.7,11,17,11c0,0,11,0,11,0c9.3,0,14.3,-0.3,15,-1c5.3,-5.3,10.3,-11,15,-17\nc242.7,-294.7,395.3,-681.7,458,-1161c21.3,-164.7,33.3,-350.7,36,-558\nl0,-" + (t + 144) + "c-2,-159.3,-10,-310.7,-24,-454c-53.3,-528,-210,-949.7,\n-470,-1265c-4.7,-6,-9.7,-11.7,-15,-17c-0.7,-0.7,-6.7,-1,-18,-1z";
		default: throw Error("Unknown stretchy delimiter.");
	}
};
function De(e) {
	return "toText" in e;
}
var Oe = class {
	constructor(e) {
		this.children = void 0, this.classes = void 0, this.height = void 0, this.depth = void 0, this.maxFontSize = void 0, this.style = void 0, this.children = e, this.classes = [], this.height = 0, this.depth = 0, this.maxFontSize = 0, this.style = {};
	}
	hasClass(e) {
		return this.classes.includes(e);
	}
	toNode() {
		for (var e = document.createDocumentFragment(), t = 0; t < this.children.length; t++) e.appendChild(this.children[t].toNode());
		return e;
	}
	toMarkup() {
		for (var e = "", t = 0; t < this.children.length; t++) e += this.children[t].toMarkup();
		return e;
	}
	toText() {
		return this.children.map((e) => {
			if (De(e)) return e.toText();
			throw Error("Expected MathDomNode with toText, got " + e.constructor.name);
		}).join("");
	}
}, ke = {
	pt: 1,
	mm: 7227 / 2540,
	cm: 7227 / 254,
	in: 72.27,
	bp: 803 / 800,
	pc: 12,
	dd: 1238 / 1157,
	cc: 14856 / 1157,
	nd: 685 / 642,
	nc: 1370 / 107,
	sp: 1 / 65536,
	px: 803 / 800
}, Ae = {
	ex: !0,
	em: !0,
	mu: !0
}, je = function(e) {
	return typeof e != "string" && (e = e.unit), e in ke || e in Ae || e === "ex";
}, Me = function(e, t) {
	var n;
	if (e.unit in ke) n = ke[e.unit] / t.fontMetrics().ptPerEm / t.sizeMultiplier;
	else if (e.unit === "mu") n = t.fontMetrics().cssEmPerMu;
	else {
		var r = t.style.isTight() ? t.havingStyle(t.style.text()) : t;
		if (e.unit === "ex") n = r.fontMetrics().xHeight;
		else if (e.unit === "em") n = r.fontMetrics().quad;
		else throw new s("Invalid unit: '" + e.unit + "'");
		r !== t && (n *= r.sizeMultiplier / t.sizeMultiplier);
	}
	return Math.min(e.number * n, t.maxSize);
}, k = function(e) {
	return +e.toFixed(4) + "em";
}, Ne = function(e) {
	return e.filter((e) => e).join(" ");
}, Pe = function(e) {
	var t = "";
	for (var n of Object.keys(e)) {
		var r = e[n];
		r !== void 0 && (t += l(n) + ":" + r + ";");
	}
	return t;
}, Fe = function(e, t, n) {
	if (this.classes = e || [], this.attributes = {}, this.height = 0, this.depth = 0, this.maxFontSize = 0, this.style = n || {}, t) {
		t.style.isTight() && this.classes.push("mtight");
		var r = t.getColor();
		r && (this.style.color = r);
	}
}, Ie = function(e) {
	var t = document.createElement(e);
	t.className = Ne(this.classes), Object.assign(t.style, this.style);
	for (var n of Object.keys(this.attributes)) t.setAttribute(n, this.attributes[n]);
	for (var r = 0; r < this.children.length; r++) t.appendChild(this.children[r].toNode());
	return t;
}, Le = /[\s"'>/=\x00-\x1f]/, Re = function(e) {
	var t = "<" + e;
	this.classes.length && (t += " class=\"" + f(Ne(this.classes)) + "\"");
	var n = Pe(this.style);
	n && (t += " style=\"" + f(n) + "\"");
	for (var r of Object.keys(this.attributes)) {
		if (Le.test(r)) throw new s("Invalid attribute name '" + r + "'");
		t += " " + r + "=\"" + f(this.attributes[r]) + "\"";
	}
	t += ">";
	for (var i = 0; i < this.children.length; i++) t += this.children[i].toMarkup();
	return t += "</" + e + ">", t;
}, ze = class {
	constructor(e, t, n, r) {
		this.children = void 0, this.attributes = void 0, this.classes = void 0, this.height = void 0, this.depth = void 0, this.width = void 0, this.maxFontSize = void 0, this.style = void 0, this.italic = void 0, Fe.call(this, e, n, r), this.children = t || [];
	}
	setAttribute(e, t) {
		this.attributes[e] = t;
	}
	hasClass(e) {
		return this.classes.includes(e);
	}
	toNode() {
		return Ie.call(this, "span");
	}
	toMarkup() {
		return Re.call(this, "span");
	}
}, Be = class {
	constructor(e, t, n, r) {
		this.children = void 0, this.attributes = void 0, this.classes = void 0, this.height = void 0, this.depth = void 0, this.maxFontSize = void 0, this.style = void 0, Fe.call(this, t, r), this.children = n || [], this.setAttribute("href", e);
	}
	setAttribute(e, t) {
		this.attributes[e] = t;
	}
	hasClass(e) {
		return this.classes.includes(e);
	}
	toNode() {
		return Ie.call(this, "a");
	}
	toMarkup() {
		return Re.call(this, "a");
	}
}, Ve = class {
	constructor(e, t, n) {
		this.src = void 0, this.alt = void 0, this.classes = void 0, this.height = void 0, this.depth = void 0, this.maxFontSize = void 0, this.style = void 0, this.alt = t, this.src = e, this.classes = ["mord"], this.height = 0, this.depth = 0, this.maxFontSize = 0, this.style = n;
	}
	hasClass(e) {
		return this.classes.includes(e);
	}
	toNode() {
		var e = document.createElement("img");
		return e.src = this.src, e.alt = this.alt, e.className = "mord", Object.assign(e.style, this.style), e;
	}
	toMarkup() {
		var e = "<img src=\"" + f(this.src) + "\"" + (" alt=\"" + f(this.alt) + "\""), t = Pe(this.style);
		return t && (e += " style=\"" + f(t) + "\""), e += "'/>", e;
	}
}, He = {
	î: "ı̂",
	ï: "ı̈",
	í: "ı́",
	ì: "ı̀"
}, Ue = class {
	constructor(e, t, n, r, i, a, o, s) {
		this.text = void 0, this.height = void 0, this.depth = void 0, this.italic = void 0, this.skew = void 0, this.width = void 0, this.maxFontSize = void 0, this.classes = void 0, this.style = void 0, this.text = e, this.height = t || 0, this.depth = n || 0, this.italic = r || 0, this.skew = i || 0, this.width = a || 0, this.classes = o || [], this.style = s || {}, this.maxFontSize = 0;
		var c = de(this.text.charCodeAt(0));
		c && this.classes.push(c + "_fallback"), /[îïíì]/.test(this.text) && (this.text = He[this.text]);
	}
	hasClass(e) {
		return this.classes.includes(e);
	}
	toNode() {
		var e = document.createTextNode(this.text), t = null;
		return this.italic > 0 && (t = document.createElement("span"), t.style.marginRight = k(this.italic)), this.classes.length > 0 && (t ||= document.createElement("span"), t.className = Ne(this.classes)), Object.keys(this.style).length > 0 && (t ||= document.createElement("span"), Object.assign(t.style, this.style)), t ? (t.appendChild(e), t) : e;
	}
	toMarkup() {
		var e = !1, t = "<span";
		this.classes.length && (e = !0, t += " class=\"", t += f(Ne(this.classes)), t += "\"");
		var n = "";
		this.italic > 0 && (n += "margin-right:" + k(this.italic) + ";"), n += Pe(this.style), n && (e = !0, t += " style=\"" + f(n) + "\"");
		var r = f(this.text);
		return e ? (t += ">", t += r, t += "</span>", t) : r;
	}
}, We = class {
	constructor(e, t) {
		this.children = void 0, this.attributes = void 0, this.children = e || [], this.attributes = t || {};
	}
	toNode() {
		var e = document.createElementNS("http://www.w3.org/2000/svg", "svg");
		for (var t of Object.keys(this.attributes)) e.setAttribute(t, this.attributes[t]);
		for (var n = 0; n < this.children.length; n++) e.appendChild(this.children[n].toNode());
		return e;
	}
	toMarkup() {
		var e = "<svg xmlns=\"http://www.w3.org/2000/svg\"";
		for (var t of Object.keys(this.attributes)) e += " " + t + "=\"" + f(this.attributes[t]) + "\"";
		e += ">";
		for (var n = 0; n < this.children.length; n++) e += this.children[n].toMarkup();
		return e += "</svg>", e;
	}
}, Ge = class {
	constructor(e, t) {
		this.pathName = void 0, this.alternate = void 0, this.pathName = e, this.alternate = t;
	}
	toNode() {
		var e = document.createElementNS("http://www.w3.org/2000/svg", "path");
		return this.alternate ? e.setAttribute("d", this.alternate) : e.setAttribute("d", Te[this.pathName]), e;
	}
	toMarkup() {
		return this.alternate ? "<path d=\"" + f(this.alternate) + "\"/>" : "<path d=\"" + f(Te[this.pathName]) + "\"/>";
	}
}, Ke = class {
	constructor(e) {
		this.attributes = void 0, this.attributes = e || {};
	}
	toNode() {
		var e = document.createElementNS("http://www.w3.org/2000/svg", "line");
		for (var t of Object.keys(this.attributes)) e.setAttribute(t, this.attributes[t]);
		return e;
	}
	toMarkup() {
		var e = "<line";
		for (var t of Object.keys(this.attributes)) e += " " + t + "=\"" + f(this.attributes[t]) + "\"";
		return e += "/>", e;
	}
};
function qe(e) {
	if (e instanceof Ue) return e;
	throw Error("Expected symbolNode but got " + String(e) + ".");
}
function Je(e) {
	if (e instanceof ze) return e;
	throw Error("Expected span<HtmlDomNode> but got " + String(e) + ".");
}
var Ye = (e) => e instanceof ze || e instanceof Be || e instanceof Oe, Xe = {
	"AMS-Regular": {
		32: [
			0,
			0,
			0,
			0,
			.25
		],
		65: [
			0,
			.68889,
			0,
			0,
			.72222
		],
		66: [
			0,
			.68889,
			0,
			0,
			.66667
		],
		67: [
			0,
			.68889,
			0,
			0,
			.72222
		],
		68: [
			0,
			.68889,
			0,
			0,
			.72222
		],
		69: [
			0,
			.68889,
			0,
			0,
			.66667
		],
		70: [
			0,
			.68889,
			0,
			0,
			.61111
		],
		71: [
			0,
			.68889,
			0,
			0,
			.77778
		],
		72: [
			0,
			.68889,
			0,
			0,
			.77778
		],
		73: [
			0,
			.68889,
			0,
			0,
			.38889
		],
		74: [
			.16667,
			.68889,
			0,
			0,
			.5
		],
		75: [
			0,
			.68889,
			0,
			0,
			.77778
		],
		76: [
			0,
			.68889,
			0,
			0,
			.66667
		],
		77: [
			0,
			.68889,
			0,
			0,
			.94445
		],
		78: [
			0,
			.68889,
			0,
			0,
			.72222
		],
		79: [
			.16667,
			.68889,
			0,
			0,
			.77778
		],
		80: [
			0,
			.68889,
			0,
			0,
			.61111
		],
		81: [
			.16667,
			.68889,
			0,
			0,
			.77778
		],
		82: [
			0,
			.68889,
			0,
			0,
			.72222
		],
		83: [
			0,
			.68889,
			0,
			0,
			.55556
		],
		84: [
			0,
			.68889,
			0,
			0,
			.66667
		],
		85: [
			0,
			.68889,
			0,
			0,
			.72222
		],
		86: [
			0,
			.68889,
			0,
			0,
			.72222
		],
		87: [
			0,
			.68889,
			0,
			0,
			1
		],
		88: [
			0,
			.68889,
			0,
			0,
			.72222
		],
		89: [
			0,
			.68889,
			0,
			0,
			.72222
		],
		90: [
			0,
			.68889,
			0,
			0,
			.66667
		],
		107: [
			0,
			.68889,
			0,
			0,
			.55556
		],
		160: [
			0,
			0,
			0,
			0,
			.25
		],
		165: [
			0,
			.675,
			.025,
			0,
			.75
		],
		174: [
			.15559,
			.69224,
			0,
			0,
			.94666
		],
		240: [
			0,
			.68889,
			0,
			0,
			.55556
		],
		295: [
			0,
			.68889,
			0,
			0,
			.54028
		],
		710: [
			0,
			.825,
			0,
			0,
			2.33334
		],
		732: [
			0,
			.9,
			0,
			0,
			2.33334
		],
		770: [
			0,
			.825,
			0,
			0,
			2.33334
		],
		771: [
			0,
			.9,
			0,
			0,
			2.33334
		],
		989: [
			.08167,
			.58167,
			0,
			0,
			.77778
		],
		1008: [
			0,
			.43056,
			.04028,
			0,
			.66667
		],
		8245: [
			0,
			.54986,
			0,
			0,
			.275
		],
		8463: [
			0,
			.68889,
			0,
			0,
			.54028
		],
		8487: [
			0,
			.68889,
			0,
			0,
			.72222
		],
		8498: [
			0,
			.68889,
			0,
			0,
			.55556
		],
		8502: [
			0,
			.68889,
			0,
			0,
			.66667
		],
		8503: [
			0,
			.68889,
			0,
			0,
			.44445
		],
		8504: [
			0,
			.68889,
			0,
			0,
			.66667
		],
		8513: [
			0,
			.68889,
			0,
			0,
			.63889
		],
		8592: [
			-.03598,
			.46402,
			0,
			0,
			.5
		],
		8594: [
			-.03598,
			.46402,
			0,
			0,
			.5
		],
		8602: [
			-.13313,
			.36687,
			0,
			0,
			1
		],
		8603: [
			-.13313,
			.36687,
			0,
			0,
			1
		],
		8606: [
			.01354,
			.52239,
			0,
			0,
			1
		],
		8608: [
			.01354,
			.52239,
			0,
			0,
			1
		],
		8610: [
			.01354,
			.52239,
			0,
			0,
			1.11111
		],
		8611: [
			.01354,
			.52239,
			0,
			0,
			1.11111
		],
		8619: [
			0,
			.54986,
			0,
			0,
			1
		],
		8620: [
			0,
			.54986,
			0,
			0,
			1
		],
		8621: [
			-.13313,
			.37788,
			0,
			0,
			1.38889
		],
		8622: [
			-.13313,
			.36687,
			0,
			0,
			1
		],
		8624: [
			0,
			.69224,
			0,
			0,
			.5
		],
		8625: [
			0,
			.69224,
			0,
			0,
			.5
		],
		8630: [
			0,
			.43056,
			0,
			0,
			1
		],
		8631: [
			0,
			.43056,
			0,
			0,
			1
		],
		8634: [
			.08198,
			.58198,
			0,
			0,
			.77778
		],
		8635: [
			.08198,
			.58198,
			0,
			0,
			.77778
		],
		8638: [
			.19444,
			.69224,
			0,
			0,
			.41667
		],
		8639: [
			.19444,
			.69224,
			0,
			0,
			.41667
		],
		8642: [
			.19444,
			.69224,
			0,
			0,
			.41667
		],
		8643: [
			.19444,
			.69224,
			0,
			0,
			.41667
		],
		8644: [
			.1808,
			.675,
			0,
			0,
			1
		],
		8646: [
			.1808,
			.675,
			0,
			0,
			1
		],
		8647: [
			.1808,
			.675,
			0,
			0,
			1
		],
		8648: [
			.19444,
			.69224,
			0,
			0,
			.83334
		],
		8649: [
			.1808,
			.675,
			0,
			0,
			1
		],
		8650: [
			.19444,
			.69224,
			0,
			0,
			.83334
		],
		8651: [
			.01354,
			.52239,
			0,
			0,
			1
		],
		8652: [
			.01354,
			.52239,
			0,
			0,
			1
		],
		8653: [
			-.13313,
			.36687,
			0,
			0,
			1
		],
		8654: [
			-.13313,
			.36687,
			0,
			0,
			1
		],
		8655: [
			-.13313,
			.36687,
			0,
			0,
			1
		],
		8666: [
			.13667,
			.63667,
			0,
			0,
			1
		],
		8667: [
			.13667,
			.63667,
			0,
			0,
			1
		],
		8669: [
			-.13313,
			.37788,
			0,
			0,
			1
		],
		8672: [
			-.064,
			.437,
			0,
			0,
			1.334
		],
		8674: [
			-.064,
			.437,
			0,
			0,
			1.334
		],
		8705: [
			0,
			.825,
			0,
			0,
			.5
		],
		8708: [
			0,
			.68889,
			0,
			0,
			.55556
		],
		8709: [
			.08167,
			.58167,
			0,
			0,
			.77778
		],
		8717: [
			0,
			.43056,
			0,
			0,
			.42917
		],
		8722: [
			-.03598,
			.46402,
			0,
			0,
			.5
		],
		8724: [
			.08198,
			.69224,
			0,
			0,
			.77778
		],
		8726: [
			.08167,
			.58167,
			0,
			0,
			.77778
		],
		8733: [
			0,
			.69224,
			0,
			0,
			.77778
		],
		8736: [
			0,
			.69224,
			0,
			0,
			.72222
		],
		8737: [
			0,
			.69224,
			0,
			0,
			.72222
		],
		8738: [
			.03517,
			.52239,
			0,
			0,
			.72222
		],
		8739: [
			.08167,
			.58167,
			0,
			0,
			.22222
		],
		8740: [
			.25142,
			.74111,
			0,
			0,
			.27778
		],
		8741: [
			.08167,
			.58167,
			0,
			0,
			.38889
		],
		8742: [
			.25142,
			.74111,
			0,
			0,
			.5
		],
		8756: [
			0,
			.69224,
			0,
			0,
			.66667
		],
		8757: [
			0,
			.69224,
			0,
			0,
			.66667
		],
		8764: [
			-.13313,
			.36687,
			0,
			0,
			.77778
		],
		8765: [
			-.13313,
			.37788,
			0,
			0,
			.77778
		],
		8769: [
			-.13313,
			.36687,
			0,
			0,
			.77778
		],
		8770: [
			-.03625,
			.46375,
			0,
			0,
			.77778
		],
		8774: [
			.30274,
			.79383,
			0,
			0,
			.77778
		],
		8776: [
			-.01688,
			.48312,
			0,
			0,
			.77778
		],
		8778: [
			.08167,
			.58167,
			0,
			0,
			.77778
		],
		8782: [
			.06062,
			.54986,
			0,
			0,
			.77778
		],
		8783: [
			.06062,
			.54986,
			0,
			0,
			.77778
		],
		8785: [
			.08198,
			.58198,
			0,
			0,
			.77778
		],
		8786: [
			.08198,
			.58198,
			0,
			0,
			.77778
		],
		8787: [
			.08198,
			.58198,
			0,
			0,
			.77778
		],
		8790: [
			0,
			.69224,
			0,
			0,
			.77778
		],
		8791: [
			.22958,
			.72958,
			0,
			0,
			.77778
		],
		8796: [
			.08198,
			.91667,
			0,
			0,
			.77778
		],
		8806: [
			.25583,
			.75583,
			0,
			0,
			.77778
		],
		8807: [
			.25583,
			.75583,
			0,
			0,
			.77778
		],
		8808: [
			.25142,
			.75726,
			0,
			0,
			.77778
		],
		8809: [
			.25142,
			.75726,
			0,
			0,
			.77778
		],
		8812: [
			.25583,
			.75583,
			0,
			0,
			.5
		],
		8814: [
			.20576,
			.70576,
			0,
			0,
			.77778
		],
		8815: [
			.20576,
			.70576,
			0,
			0,
			.77778
		],
		8816: [
			.30274,
			.79383,
			0,
			0,
			.77778
		],
		8817: [
			.30274,
			.79383,
			0,
			0,
			.77778
		],
		8818: [
			.22958,
			.72958,
			0,
			0,
			.77778
		],
		8819: [
			.22958,
			.72958,
			0,
			0,
			.77778
		],
		8822: [
			.1808,
			.675,
			0,
			0,
			.77778
		],
		8823: [
			.1808,
			.675,
			0,
			0,
			.77778
		],
		8828: [
			.13667,
			.63667,
			0,
			0,
			.77778
		],
		8829: [
			.13667,
			.63667,
			0,
			0,
			.77778
		],
		8830: [
			.22958,
			.72958,
			0,
			0,
			.77778
		],
		8831: [
			.22958,
			.72958,
			0,
			0,
			.77778
		],
		8832: [
			.20576,
			.70576,
			0,
			0,
			.77778
		],
		8833: [
			.20576,
			.70576,
			0,
			0,
			.77778
		],
		8840: [
			.30274,
			.79383,
			0,
			0,
			.77778
		],
		8841: [
			.30274,
			.79383,
			0,
			0,
			.77778
		],
		8842: [
			.13597,
			.63597,
			0,
			0,
			.77778
		],
		8843: [
			.13597,
			.63597,
			0,
			0,
			.77778
		],
		8847: [
			.03517,
			.54986,
			0,
			0,
			.77778
		],
		8848: [
			.03517,
			.54986,
			0,
			0,
			.77778
		],
		8858: [
			.08198,
			.58198,
			0,
			0,
			.77778
		],
		8859: [
			.08198,
			.58198,
			0,
			0,
			.77778
		],
		8861: [
			.08198,
			.58198,
			0,
			0,
			.77778
		],
		8862: [
			0,
			.675,
			0,
			0,
			.77778
		],
		8863: [
			0,
			.675,
			0,
			0,
			.77778
		],
		8864: [
			0,
			.675,
			0,
			0,
			.77778
		],
		8865: [
			0,
			.675,
			0,
			0,
			.77778
		],
		8872: [
			0,
			.69224,
			0,
			0,
			.61111
		],
		8873: [
			0,
			.69224,
			0,
			0,
			.72222
		],
		8874: [
			0,
			.69224,
			0,
			0,
			.88889
		],
		8876: [
			0,
			.68889,
			0,
			0,
			.61111
		],
		8877: [
			0,
			.68889,
			0,
			0,
			.61111
		],
		8878: [
			0,
			.68889,
			0,
			0,
			.72222
		],
		8879: [
			0,
			.68889,
			0,
			0,
			.72222
		],
		8882: [
			.03517,
			.54986,
			0,
			0,
			.77778
		],
		8883: [
			.03517,
			.54986,
			0,
			0,
			.77778
		],
		8884: [
			.13667,
			.63667,
			0,
			0,
			.77778
		],
		8885: [
			.13667,
			.63667,
			0,
			0,
			.77778
		],
		8888: [
			0,
			.54986,
			0,
			0,
			1.11111
		],
		8890: [
			.19444,
			.43056,
			0,
			0,
			.55556
		],
		8891: [
			.19444,
			.69224,
			0,
			0,
			.61111
		],
		8892: [
			.19444,
			.69224,
			0,
			0,
			.61111
		],
		8901: [
			0,
			.54986,
			0,
			0,
			.27778
		],
		8903: [
			.08167,
			.58167,
			0,
			0,
			.77778
		],
		8905: [
			.08167,
			.58167,
			0,
			0,
			.77778
		],
		8906: [
			.08167,
			.58167,
			0,
			0,
			.77778
		],
		8907: [
			0,
			.69224,
			0,
			0,
			.77778
		],
		8908: [
			0,
			.69224,
			0,
			0,
			.77778
		],
		8909: [
			-.03598,
			.46402,
			0,
			0,
			.77778
		],
		8910: [
			0,
			.54986,
			0,
			0,
			.76042
		],
		8911: [
			0,
			.54986,
			0,
			0,
			.76042
		],
		8912: [
			.03517,
			.54986,
			0,
			0,
			.77778
		],
		8913: [
			.03517,
			.54986,
			0,
			0,
			.77778
		],
		8914: [
			0,
			.54986,
			0,
			0,
			.66667
		],
		8915: [
			0,
			.54986,
			0,
			0,
			.66667
		],
		8916: [
			0,
			.69224,
			0,
			0,
			.66667
		],
		8918: [
			.0391,
			.5391,
			0,
			0,
			.77778
		],
		8919: [
			.0391,
			.5391,
			0,
			0,
			.77778
		],
		8920: [
			.03517,
			.54986,
			0,
			0,
			1.33334
		],
		8921: [
			.03517,
			.54986,
			0,
			0,
			1.33334
		],
		8922: [
			.38569,
			.88569,
			0,
			0,
			.77778
		],
		8923: [
			.38569,
			.88569,
			0,
			0,
			.77778
		],
		8926: [
			.13667,
			.63667,
			0,
			0,
			.77778
		],
		8927: [
			.13667,
			.63667,
			0,
			0,
			.77778
		],
		8928: [
			.30274,
			.79383,
			0,
			0,
			.77778
		],
		8929: [
			.30274,
			.79383,
			0,
			0,
			.77778
		],
		8934: [
			.23222,
			.74111,
			0,
			0,
			.77778
		],
		8935: [
			.23222,
			.74111,
			0,
			0,
			.77778
		],
		8936: [
			.23222,
			.74111,
			0,
			0,
			.77778
		],
		8937: [
			.23222,
			.74111,
			0,
			0,
			.77778
		],
		8938: [
			.20576,
			.70576,
			0,
			0,
			.77778
		],
		8939: [
			.20576,
			.70576,
			0,
			0,
			.77778
		],
		8940: [
			.30274,
			.79383,
			0,
			0,
			.77778
		],
		8941: [
			.30274,
			.79383,
			0,
			0,
			.77778
		],
		8994: [
			.19444,
			.69224,
			0,
			0,
			.77778
		],
		8995: [
			.19444,
			.69224,
			0,
			0,
			.77778
		],
		9416: [
			.15559,
			.69224,
			0,
			0,
			.90222
		],
		9484: [
			0,
			.69224,
			0,
			0,
			.5
		],
		9488: [
			0,
			.69224,
			0,
			0,
			.5
		],
		9492: [
			0,
			.37788,
			0,
			0,
			.5
		],
		9496: [
			0,
			.37788,
			0,
			0,
			.5
		],
		9585: [
			.19444,
			.68889,
			0,
			0,
			.88889
		],
		9586: [
			.19444,
			.74111,
			0,
			0,
			.88889
		],
		9632: [
			0,
			.675,
			0,
			0,
			.77778
		],
		9633: [
			0,
			.675,
			0,
			0,
			.77778
		],
		9650: [
			0,
			.54986,
			0,
			0,
			.72222
		],
		9651: [
			0,
			.54986,
			0,
			0,
			.72222
		],
		9654: [
			.03517,
			.54986,
			0,
			0,
			.77778
		],
		9660: [
			0,
			.54986,
			0,
			0,
			.72222
		],
		9661: [
			0,
			.54986,
			0,
			0,
			.72222
		],
		9664: [
			.03517,
			.54986,
			0,
			0,
			.77778
		],
		9674: [
			.11111,
			.69224,
			0,
			0,
			.66667
		],
		9733: [
			.19444,
			.69224,
			0,
			0,
			.94445
		],
		10003: [
			0,
			.69224,
			0,
			0,
			.83334
		],
		10016: [
			0,
			.69224,
			0,
			0,
			.83334
		],
		10731: [
			.11111,
			.69224,
			0,
			0,
			.66667
		],
		10846: [
			.19444,
			.75583,
			0,
			0,
			.61111
		],
		10877: [
			.13667,
			.63667,
			0,
			0,
			.77778
		],
		10878: [
			.13667,
			.63667,
			0,
			0,
			.77778
		],
		10885: [
			.25583,
			.75583,
			0,
			0,
			.77778
		],
		10886: [
			.25583,
			.75583,
			0,
			0,
			.77778
		],
		10887: [
			.13597,
			.63597,
			0,
			0,
			.77778
		],
		10888: [
			.13597,
			.63597,
			0,
			0,
			.77778
		],
		10889: [
			.26167,
			.75726,
			0,
			0,
			.77778
		],
		10890: [
			.26167,
			.75726,
			0,
			0,
			.77778
		],
		10891: [
			.48256,
			.98256,
			0,
			0,
			.77778
		],
		10892: [
			.48256,
			.98256,
			0,
			0,
			.77778
		],
		10901: [
			.13667,
			.63667,
			0,
			0,
			.77778
		],
		10902: [
			.13667,
			.63667,
			0,
			0,
			.77778
		],
		10933: [
			.25142,
			.75726,
			0,
			0,
			.77778
		],
		10934: [
			.25142,
			.75726,
			0,
			0,
			.77778
		],
		10935: [
			.26167,
			.75726,
			0,
			0,
			.77778
		],
		10936: [
			.26167,
			.75726,
			0,
			0,
			.77778
		],
		10937: [
			.26167,
			.75726,
			0,
			0,
			.77778
		],
		10938: [
			.26167,
			.75726,
			0,
			0,
			.77778
		],
		10949: [
			.25583,
			.75583,
			0,
			0,
			.77778
		],
		10950: [
			.25583,
			.75583,
			0,
			0,
			.77778
		],
		10955: [
			.28481,
			.79383,
			0,
			0,
			.77778
		],
		10956: [
			.28481,
			.79383,
			0,
			0,
			.77778
		],
		57350: [
			.08167,
			.58167,
			0,
			0,
			.22222
		],
		57351: [
			.08167,
			.58167,
			0,
			0,
			.38889
		],
		57352: [
			.08167,
			.58167,
			0,
			0,
			.77778
		],
		57353: [
			0,
			.43056,
			.04028,
			0,
			.66667
		],
		57356: [
			.25142,
			.75726,
			0,
			0,
			.77778
		],
		57357: [
			.25142,
			.75726,
			0,
			0,
			.77778
		],
		57358: [
			.41951,
			.91951,
			0,
			0,
			.77778
		],
		57359: [
			.30274,
			.79383,
			0,
			0,
			.77778
		],
		57360: [
			.30274,
			.79383,
			0,
			0,
			.77778
		],
		57361: [
			.41951,
			.91951,
			0,
			0,
			.77778
		],
		57366: [
			.25142,
			.75726,
			0,
			0,
			.77778
		],
		57367: [
			.25142,
			.75726,
			0,
			0,
			.77778
		],
		57368: [
			.25142,
			.75726,
			0,
			0,
			.77778
		],
		57369: [
			.25142,
			.75726,
			0,
			0,
			.77778
		],
		57370: [
			.13597,
			.63597,
			0,
			0,
			.77778
		],
		57371: [
			.13597,
			.63597,
			0,
			0,
			.77778
		]
	},
	"Caligraphic-Regular": {
		32: [
			0,
			0,
			0,
			0,
			.25
		],
		65: [
			0,
			.68333,
			0,
			.19445,
			.79847
		],
		66: [
			0,
			.68333,
			.03041,
			.13889,
			.65681
		],
		67: [
			0,
			.68333,
			.05834,
			.13889,
			.52653
		],
		68: [
			0,
			.68333,
			.02778,
			.08334,
			.77139
		],
		69: [
			0,
			.68333,
			.08944,
			.11111,
			.52778
		],
		70: [
			0,
			.68333,
			.09931,
			.11111,
			.71875
		],
		71: [
			.09722,
			.68333,
			.0593,
			.11111,
			.59487
		],
		72: [
			0,
			.68333,
			.00965,
			.11111,
			.84452
		],
		73: [
			0,
			.68333,
			.07382,
			0,
			.54452
		],
		74: [
			.09722,
			.68333,
			.18472,
			.16667,
			.67778
		],
		75: [
			0,
			.68333,
			.01445,
			.05556,
			.76195
		],
		76: [
			0,
			.68333,
			0,
			.13889,
			.68972
		],
		77: [
			0,
			.68333,
			0,
			.13889,
			1.2009
		],
		78: [
			0,
			.68333,
			.14736,
			.08334,
			.82049
		],
		79: [
			0,
			.68333,
			.02778,
			.11111,
			.79611
		],
		80: [
			0,
			.68333,
			.08222,
			.08334,
			.69556
		],
		81: [
			.09722,
			.68333,
			0,
			.11111,
			.81667
		],
		82: [
			0,
			.68333,
			0,
			.08334,
			.8475
		],
		83: [
			0,
			.68333,
			.075,
			.13889,
			.60556
		],
		84: [
			0,
			.68333,
			.25417,
			0,
			.54464
		],
		85: [
			0,
			.68333,
			.09931,
			.08334,
			.62583
		],
		86: [
			0,
			.68333,
			.08222,
			0,
			.61278
		],
		87: [
			0,
			.68333,
			.08222,
			.08334,
			.98778
		],
		88: [
			0,
			.68333,
			.14643,
			.13889,
			.7133
		],
		89: [
			.09722,
			.68333,
			.08222,
			.08334,
			.66834
		],
		90: [
			0,
			.68333,
			.07944,
			.13889,
			.72473
		],
		160: [
			0,
			0,
			0,
			0,
			.25
		]
	},
	"Fraktur-Regular": {
		32: [
			0,
			0,
			0,
			0,
			.25
		],
		33: [
			0,
			.69141,
			0,
			0,
			.29574
		],
		34: [
			0,
			.69141,
			0,
			0,
			.21471
		],
		38: [
			0,
			.69141,
			0,
			0,
			.73786
		],
		39: [
			0,
			.69141,
			0,
			0,
			.21201
		],
		40: [
			.24982,
			.74947,
			0,
			0,
			.38865
		],
		41: [
			.24982,
			.74947,
			0,
			0,
			.38865
		],
		42: [
			0,
			.62119,
			0,
			0,
			.27764
		],
		43: [
			.08319,
			.58283,
			0,
			0,
			.75623
		],
		44: [
			0,
			.10803,
			0,
			0,
			.27764
		],
		45: [
			.08319,
			.58283,
			0,
			0,
			.75623
		],
		46: [
			0,
			.10803,
			0,
			0,
			.27764
		],
		47: [
			.24982,
			.74947,
			0,
			0,
			.50181
		],
		48: [
			0,
			.47534,
			0,
			0,
			.50181
		],
		49: [
			0,
			.47534,
			0,
			0,
			.50181
		],
		50: [
			0,
			.47534,
			0,
			0,
			.50181
		],
		51: [
			.18906,
			.47534,
			0,
			0,
			.50181
		],
		52: [
			.18906,
			.47534,
			0,
			0,
			.50181
		],
		53: [
			.18906,
			.47534,
			0,
			0,
			.50181
		],
		54: [
			0,
			.69141,
			0,
			0,
			.50181
		],
		55: [
			.18906,
			.47534,
			0,
			0,
			.50181
		],
		56: [
			0,
			.69141,
			0,
			0,
			.50181
		],
		57: [
			.18906,
			.47534,
			0,
			0,
			.50181
		],
		58: [
			0,
			.47534,
			0,
			0,
			.21606
		],
		59: [
			.12604,
			.47534,
			0,
			0,
			.21606
		],
		61: [
			-.13099,
			.36866,
			0,
			0,
			.75623
		],
		63: [
			0,
			.69141,
			0,
			0,
			.36245
		],
		65: [
			0,
			.69141,
			0,
			0,
			.7176
		],
		66: [
			0,
			.69141,
			0,
			0,
			.88397
		],
		67: [
			0,
			.69141,
			0,
			0,
			.61254
		],
		68: [
			0,
			.69141,
			0,
			0,
			.83158
		],
		69: [
			0,
			.69141,
			0,
			0,
			.66278
		],
		70: [
			.12604,
			.69141,
			0,
			0,
			.61119
		],
		71: [
			0,
			.69141,
			0,
			0,
			.78539
		],
		72: [
			.06302,
			.69141,
			0,
			0,
			.7203
		],
		73: [
			0,
			.69141,
			0,
			0,
			.55448
		],
		74: [
			.12604,
			.69141,
			0,
			0,
			.55231
		],
		75: [
			0,
			.69141,
			0,
			0,
			.66845
		],
		76: [
			0,
			.69141,
			0,
			0,
			.66602
		],
		77: [
			0,
			.69141,
			0,
			0,
			1.04953
		],
		78: [
			0,
			.69141,
			0,
			0,
			.83212
		],
		79: [
			0,
			.69141,
			0,
			0,
			.82699
		],
		80: [
			.18906,
			.69141,
			0,
			0,
			.82753
		],
		81: [
			.03781,
			.69141,
			0,
			0,
			.82699
		],
		82: [
			0,
			.69141,
			0,
			0,
			.82807
		],
		83: [
			0,
			.69141,
			0,
			0,
			.82861
		],
		84: [
			0,
			.69141,
			0,
			0,
			.66899
		],
		85: [
			0,
			.69141,
			0,
			0,
			.64576
		],
		86: [
			0,
			.69141,
			0,
			0,
			.83131
		],
		87: [
			0,
			.69141,
			0,
			0,
			1.04602
		],
		88: [
			0,
			.69141,
			0,
			0,
			.71922
		],
		89: [
			.18906,
			.69141,
			0,
			0,
			.83293
		],
		90: [
			.12604,
			.69141,
			0,
			0,
			.60201
		],
		91: [
			.24982,
			.74947,
			0,
			0,
			.27764
		],
		93: [
			.24982,
			.74947,
			0,
			0,
			.27764
		],
		94: [
			0,
			.69141,
			0,
			0,
			.49965
		],
		97: [
			0,
			.47534,
			0,
			0,
			.50046
		],
		98: [
			0,
			.69141,
			0,
			0,
			.51315
		],
		99: [
			0,
			.47534,
			0,
			0,
			.38946
		],
		100: [
			0,
			.62119,
			0,
			0,
			.49857
		],
		101: [
			0,
			.47534,
			0,
			0,
			.40053
		],
		102: [
			.18906,
			.69141,
			0,
			0,
			.32626
		],
		103: [
			.18906,
			.47534,
			0,
			0,
			.5037
		],
		104: [
			.18906,
			.69141,
			0,
			0,
			.52126
		],
		105: [
			0,
			.69141,
			0,
			0,
			.27899
		],
		106: [
			0,
			.69141,
			0,
			0,
			.28088
		],
		107: [
			0,
			.69141,
			0,
			0,
			.38946
		],
		108: [
			0,
			.69141,
			0,
			0,
			.27953
		],
		109: [
			0,
			.47534,
			0,
			0,
			.76676
		],
		110: [
			0,
			.47534,
			0,
			0,
			.52666
		],
		111: [
			0,
			.47534,
			0,
			0,
			.48885
		],
		112: [
			.18906,
			.52396,
			0,
			0,
			.50046
		],
		113: [
			.18906,
			.47534,
			0,
			0,
			.48912
		],
		114: [
			0,
			.47534,
			0,
			0,
			.38919
		],
		115: [
			0,
			.47534,
			0,
			0,
			.44266
		],
		116: [
			0,
			.62119,
			0,
			0,
			.33301
		],
		117: [
			0,
			.47534,
			0,
			0,
			.5172
		],
		118: [
			0,
			.52396,
			0,
			0,
			.5118
		],
		119: [
			0,
			.52396,
			0,
			0,
			.77351
		],
		120: [
			.18906,
			.47534,
			0,
			0,
			.38865
		],
		121: [
			.18906,
			.47534,
			0,
			0,
			.49884
		],
		122: [
			.18906,
			.47534,
			0,
			0,
			.39054
		],
		160: [
			0,
			0,
			0,
			0,
			.25
		],
		8216: [
			0,
			.69141,
			0,
			0,
			.21471
		],
		8217: [
			0,
			.69141,
			0,
			0,
			.21471
		],
		58112: [
			0,
			.62119,
			0,
			0,
			.49749
		],
		58113: [
			0,
			.62119,
			0,
			0,
			.4983
		],
		58114: [
			.18906,
			.69141,
			0,
			0,
			.33328
		],
		58115: [
			.18906,
			.69141,
			0,
			0,
			.32923
		],
		58116: [
			.18906,
			.47534,
			0,
			0,
			.50343
		],
		58117: [
			0,
			.69141,
			0,
			0,
			.33301
		],
		58118: [
			0,
			.62119,
			0,
			0,
			.33409
		],
		58119: [
			0,
			.47534,
			0,
			0,
			.50073
		]
	},
	"Main-Bold": {
		32: [
			0,
			0,
			0,
			0,
			.25
		],
		33: [
			0,
			.69444,
			0,
			0,
			.35
		],
		34: [
			0,
			.69444,
			0,
			0,
			.60278
		],
		35: [
			.19444,
			.69444,
			0,
			0,
			.95833
		],
		36: [
			.05556,
			.75,
			0,
			0,
			.575
		],
		37: [
			.05556,
			.75,
			0,
			0,
			.95833
		],
		38: [
			0,
			.69444,
			0,
			0,
			.89444
		],
		39: [
			0,
			.69444,
			0,
			0,
			.31944
		],
		40: [
			.25,
			.75,
			0,
			0,
			.44722
		],
		41: [
			.25,
			.75,
			0,
			0,
			.44722
		],
		42: [
			0,
			.75,
			0,
			0,
			.575
		],
		43: [
			.13333,
			.63333,
			0,
			0,
			.89444
		],
		44: [
			.19444,
			.15556,
			0,
			0,
			.31944
		],
		45: [
			0,
			.44444,
			0,
			0,
			.38333
		],
		46: [
			0,
			.15556,
			0,
			0,
			.31944
		],
		47: [
			.25,
			.75,
			0,
			0,
			.575
		],
		48: [
			0,
			.64444,
			0,
			0,
			.575
		],
		49: [
			0,
			.64444,
			0,
			0,
			.575
		],
		50: [
			0,
			.64444,
			0,
			0,
			.575
		],
		51: [
			0,
			.64444,
			0,
			0,
			.575
		],
		52: [
			0,
			.64444,
			0,
			0,
			.575
		],
		53: [
			0,
			.64444,
			0,
			0,
			.575
		],
		54: [
			0,
			.64444,
			0,
			0,
			.575
		],
		55: [
			0,
			.64444,
			0,
			0,
			.575
		],
		56: [
			0,
			.64444,
			0,
			0,
			.575
		],
		57: [
			0,
			.64444,
			0,
			0,
			.575
		],
		58: [
			0,
			.44444,
			0,
			0,
			.31944
		],
		59: [
			.19444,
			.44444,
			0,
			0,
			.31944
		],
		60: [
			.08556,
			.58556,
			0,
			0,
			.89444
		],
		61: [
			-.10889,
			.39111,
			0,
			0,
			.89444
		],
		62: [
			.08556,
			.58556,
			0,
			0,
			.89444
		],
		63: [
			0,
			.69444,
			0,
			0,
			.54305
		],
		64: [
			0,
			.69444,
			0,
			0,
			.89444
		],
		65: [
			0,
			.68611,
			0,
			0,
			.86944
		],
		66: [
			0,
			.68611,
			0,
			0,
			.81805
		],
		67: [
			0,
			.68611,
			0,
			0,
			.83055
		],
		68: [
			0,
			.68611,
			0,
			0,
			.88194
		],
		69: [
			0,
			.68611,
			0,
			0,
			.75555
		],
		70: [
			0,
			.68611,
			0,
			0,
			.72361
		],
		71: [
			0,
			.68611,
			0,
			0,
			.90416
		],
		72: [
			0,
			.68611,
			0,
			0,
			.9
		],
		73: [
			0,
			.68611,
			0,
			0,
			.43611
		],
		74: [
			0,
			.68611,
			0,
			0,
			.59444
		],
		75: [
			0,
			.68611,
			0,
			0,
			.90138
		],
		76: [
			0,
			.68611,
			0,
			0,
			.69166
		],
		77: [
			0,
			.68611,
			0,
			0,
			1.09166
		],
		78: [
			0,
			.68611,
			0,
			0,
			.9
		],
		79: [
			0,
			.68611,
			0,
			0,
			.86388
		],
		80: [
			0,
			.68611,
			0,
			0,
			.78611
		],
		81: [
			.19444,
			.68611,
			0,
			0,
			.86388
		],
		82: [
			0,
			.68611,
			0,
			0,
			.8625
		],
		83: [
			0,
			.68611,
			0,
			0,
			.63889
		],
		84: [
			0,
			.68611,
			0,
			0,
			.8
		],
		85: [
			0,
			.68611,
			0,
			0,
			.88472
		],
		86: [
			0,
			.68611,
			.01597,
			0,
			.86944
		],
		87: [
			0,
			.68611,
			.01597,
			0,
			1.18888
		],
		88: [
			0,
			.68611,
			0,
			0,
			.86944
		],
		89: [
			0,
			.68611,
			.02875,
			0,
			.86944
		],
		90: [
			0,
			.68611,
			0,
			0,
			.70277
		],
		91: [
			.25,
			.75,
			0,
			0,
			.31944
		],
		92: [
			.25,
			.75,
			0,
			0,
			.575
		],
		93: [
			.25,
			.75,
			0,
			0,
			.31944
		],
		94: [
			0,
			.69444,
			0,
			0,
			.575
		],
		95: [
			.31,
			.13444,
			.03194,
			0,
			.575
		],
		97: [
			0,
			.44444,
			0,
			0,
			.55902
		],
		98: [
			0,
			.69444,
			0,
			0,
			.63889
		],
		99: [
			0,
			.44444,
			0,
			0,
			.51111
		],
		100: [
			0,
			.69444,
			0,
			0,
			.63889
		],
		101: [
			0,
			.44444,
			0,
			0,
			.52708
		],
		102: [
			0,
			.69444,
			.10903,
			0,
			.35139
		],
		103: [
			.19444,
			.44444,
			.01597,
			0,
			.575
		],
		104: [
			0,
			.69444,
			0,
			0,
			.63889
		],
		105: [
			0,
			.69444,
			0,
			0,
			.31944
		],
		106: [
			.19444,
			.69444,
			0,
			0,
			.35139
		],
		107: [
			0,
			.69444,
			0,
			0,
			.60694
		],
		108: [
			0,
			.69444,
			0,
			0,
			.31944
		],
		109: [
			0,
			.44444,
			0,
			0,
			.95833
		],
		110: [
			0,
			.44444,
			0,
			0,
			.63889
		],
		111: [
			0,
			.44444,
			0,
			0,
			.575
		],
		112: [
			.19444,
			.44444,
			0,
			0,
			.63889
		],
		113: [
			.19444,
			.44444,
			0,
			0,
			.60694
		],
		114: [
			0,
			.44444,
			0,
			0,
			.47361
		],
		115: [
			0,
			.44444,
			0,
			0,
			.45361
		],
		116: [
			0,
			.63492,
			0,
			0,
			.44722
		],
		117: [
			0,
			.44444,
			0,
			0,
			.63889
		],
		118: [
			0,
			.44444,
			.01597,
			0,
			.60694
		],
		119: [
			0,
			.44444,
			.01597,
			0,
			.83055
		],
		120: [
			0,
			.44444,
			0,
			0,
			.60694
		],
		121: [
			.19444,
			.44444,
			.01597,
			0,
			.60694
		],
		122: [
			0,
			.44444,
			0,
			0,
			.51111
		],
		123: [
			.25,
			.75,
			0,
			0,
			.575
		],
		124: [
			.25,
			.75,
			0,
			0,
			.31944
		],
		125: [
			.25,
			.75,
			0,
			0,
			.575
		],
		126: [
			.35,
			.34444,
			0,
			0,
			.575
		],
		160: [
			0,
			0,
			0,
			0,
			.25
		],
		163: [
			0,
			.69444,
			0,
			0,
			.86853
		],
		168: [
			0,
			.69444,
			0,
			0,
			.575
		],
		172: [
			0,
			.44444,
			0,
			0,
			.76666
		],
		176: [
			0,
			.69444,
			0,
			0,
			.86944
		],
		177: [
			.13333,
			.63333,
			0,
			0,
			.89444
		],
		184: [
			.17014,
			0,
			0,
			0,
			.51111
		],
		198: [
			0,
			.68611,
			0,
			0,
			1.04166
		],
		215: [
			.13333,
			.63333,
			0,
			0,
			.89444
		],
		216: [
			.04861,
			.73472,
			0,
			0,
			.89444
		],
		223: [
			0,
			.69444,
			0,
			0,
			.59722
		],
		230: [
			0,
			.44444,
			0,
			0,
			.83055
		],
		247: [
			.13333,
			.63333,
			0,
			0,
			.89444
		],
		248: [
			.09722,
			.54167,
			0,
			0,
			.575
		],
		305: [
			0,
			.44444,
			0,
			0,
			.31944
		],
		338: [
			0,
			.68611,
			0,
			0,
			1.16944
		],
		339: [
			0,
			.44444,
			0,
			0,
			.89444
		],
		567: [
			.19444,
			.44444,
			0,
			0,
			.35139
		],
		710: [
			0,
			.69444,
			0,
			0,
			.575
		],
		711: [
			0,
			.63194,
			0,
			0,
			.575
		],
		713: [
			0,
			.59611,
			0,
			0,
			.575
		],
		714: [
			0,
			.69444,
			0,
			0,
			.575
		],
		715: [
			0,
			.69444,
			0,
			0,
			.575
		],
		728: [
			0,
			.69444,
			0,
			0,
			.575
		],
		729: [
			0,
			.69444,
			0,
			0,
			.31944
		],
		730: [
			0,
			.69444,
			0,
			0,
			.86944
		],
		732: [
			0,
			.69444,
			0,
			0,
			.575
		],
		733: [
			0,
			.69444,
			0,
			0,
			.575
		],
		915: [
			0,
			.68611,
			0,
			0,
			.69166
		],
		916: [
			0,
			.68611,
			0,
			0,
			.95833
		],
		920: [
			0,
			.68611,
			0,
			0,
			.89444
		],
		923: [
			0,
			.68611,
			0,
			0,
			.80555
		],
		926: [
			0,
			.68611,
			0,
			0,
			.76666
		],
		928: [
			0,
			.68611,
			0,
			0,
			.9
		],
		931: [
			0,
			.68611,
			0,
			0,
			.83055
		],
		933: [
			0,
			.68611,
			0,
			0,
			.89444
		],
		934: [
			0,
			.68611,
			0,
			0,
			.83055
		],
		936: [
			0,
			.68611,
			0,
			0,
			.89444
		],
		937: [
			0,
			.68611,
			0,
			0,
			.83055
		],
		8211: [
			0,
			.44444,
			.03194,
			0,
			.575
		],
		8212: [
			0,
			.44444,
			.03194,
			0,
			1.14999
		],
		8216: [
			0,
			.69444,
			0,
			0,
			.31944
		],
		8217: [
			0,
			.69444,
			0,
			0,
			.31944
		],
		8220: [
			0,
			.69444,
			0,
			0,
			.60278
		],
		8221: [
			0,
			.69444,
			0,
			0,
			.60278
		],
		8224: [
			.19444,
			.69444,
			0,
			0,
			.51111
		],
		8225: [
			.19444,
			.69444,
			0,
			0,
			.51111
		],
		8242: [
			0,
			.55556,
			0,
			0,
			.34444
		],
		8407: [
			0,
			.72444,
			.15486,
			0,
			.575
		],
		8463: [
			0,
			.69444,
			0,
			0,
			.66759
		],
		8465: [
			0,
			.69444,
			0,
			0,
			.83055
		],
		8467: [
			0,
			.69444,
			0,
			0,
			.47361
		],
		8472: [
			.19444,
			.44444,
			0,
			0,
			.74027
		],
		8476: [
			0,
			.69444,
			0,
			0,
			.83055
		],
		8501: [
			0,
			.69444,
			0,
			0,
			.70277
		],
		8592: [
			-.10889,
			.39111,
			0,
			0,
			1.14999
		],
		8593: [
			.19444,
			.69444,
			0,
			0,
			.575
		],
		8594: [
			-.10889,
			.39111,
			0,
			0,
			1.14999
		],
		8595: [
			.19444,
			.69444,
			0,
			0,
			.575
		],
		8596: [
			-.10889,
			.39111,
			0,
			0,
			1.14999
		],
		8597: [
			.25,
			.75,
			0,
			0,
			.575
		],
		8598: [
			.19444,
			.69444,
			0,
			0,
			1.14999
		],
		8599: [
			.19444,
			.69444,
			0,
			0,
			1.14999
		],
		8600: [
			.19444,
			.69444,
			0,
			0,
			1.14999
		],
		8601: [
			.19444,
			.69444,
			0,
			0,
			1.14999
		],
		8636: [
			-.10889,
			.39111,
			0,
			0,
			1.14999
		],
		8637: [
			-.10889,
			.39111,
			0,
			0,
			1.14999
		],
		8640: [
			-.10889,
			.39111,
			0,
			0,
			1.14999
		],
		8641: [
			-.10889,
			.39111,
			0,
			0,
			1.14999
		],
		8656: [
			-.10889,
			.39111,
			0,
			0,
			1.14999
		],
		8657: [
			.19444,
			.69444,
			0,
			0,
			.70277
		],
		8658: [
			-.10889,
			.39111,
			0,
			0,
			1.14999
		],
		8659: [
			.19444,
			.69444,
			0,
			0,
			.70277
		],
		8660: [
			-.10889,
			.39111,
			0,
			0,
			1.14999
		],
		8661: [
			.25,
			.75,
			0,
			0,
			.70277
		],
		8704: [
			0,
			.69444,
			0,
			0,
			.63889
		],
		8706: [
			0,
			.69444,
			.06389,
			0,
			.62847
		],
		8707: [
			0,
			.69444,
			0,
			0,
			.63889
		],
		8709: [
			.05556,
			.75,
			0,
			0,
			.575
		],
		8711: [
			0,
			.68611,
			0,
			0,
			.95833
		],
		8712: [
			.08556,
			.58556,
			0,
			0,
			.76666
		],
		8715: [
			.08556,
			.58556,
			0,
			0,
			.76666
		],
		8722: [
			.13333,
			.63333,
			0,
			0,
			.89444
		],
		8723: [
			.13333,
			.63333,
			0,
			0,
			.89444
		],
		8725: [
			.25,
			.75,
			0,
			0,
			.575
		],
		8726: [
			.25,
			.75,
			0,
			0,
			.575
		],
		8727: [
			-.02778,
			.47222,
			0,
			0,
			.575
		],
		8728: [
			-.02639,
			.47361,
			0,
			0,
			.575
		],
		8729: [
			-.02639,
			.47361,
			0,
			0,
			.575
		],
		8730: [
			.18,
			.82,
			0,
			0,
			.95833
		],
		8733: [
			0,
			.44444,
			0,
			0,
			.89444
		],
		8734: [
			0,
			.44444,
			0,
			0,
			1.14999
		],
		8736: [
			0,
			.69224,
			0,
			0,
			.72222
		],
		8739: [
			.25,
			.75,
			0,
			0,
			.31944
		],
		8741: [
			.25,
			.75,
			0,
			0,
			.575
		],
		8743: [
			0,
			.55556,
			0,
			0,
			.76666
		],
		8744: [
			0,
			.55556,
			0,
			0,
			.76666
		],
		8745: [
			0,
			.55556,
			0,
			0,
			.76666
		],
		8746: [
			0,
			.55556,
			0,
			0,
			.76666
		],
		8747: [
			.19444,
			.69444,
			.12778,
			0,
			.56875
		],
		8764: [
			-.10889,
			.39111,
			0,
			0,
			.89444
		],
		8768: [
			.19444,
			.69444,
			0,
			0,
			.31944
		],
		8771: [
			.00222,
			.50222,
			0,
			0,
			.89444
		],
		8773: [
			.027,
			.638,
			0,
			0,
			.894
		],
		8776: [
			.02444,
			.52444,
			0,
			0,
			.89444
		],
		8781: [
			.00222,
			.50222,
			0,
			0,
			.89444
		],
		8801: [
			.00222,
			.50222,
			0,
			0,
			.89444
		],
		8804: [
			.19667,
			.69667,
			0,
			0,
			.89444
		],
		8805: [
			.19667,
			.69667,
			0,
			0,
			.89444
		],
		8810: [
			.08556,
			.58556,
			0,
			0,
			1.14999
		],
		8811: [
			.08556,
			.58556,
			0,
			0,
			1.14999
		],
		8826: [
			.08556,
			.58556,
			0,
			0,
			.89444
		],
		8827: [
			.08556,
			.58556,
			0,
			0,
			.89444
		],
		8834: [
			.08556,
			.58556,
			0,
			0,
			.89444
		],
		8835: [
			.08556,
			.58556,
			0,
			0,
			.89444
		],
		8838: [
			.19667,
			.69667,
			0,
			0,
			.89444
		],
		8839: [
			.19667,
			.69667,
			0,
			0,
			.89444
		],
		8846: [
			0,
			.55556,
			0,
			0,
			.76666
		],
		8849: [
			.19667,
			.69667,
			0,
			0,
			.89444
		],
		8850: [
			.19667,
			.69667,
			0,
			0,
			.89444
		],
		8851: [
			0,
			.55556,
			0,
			0,
			.76666
		],
		8852: [
			0,
			.55556,
			0,
			0,
			.76666
		],
		8853: [
			.13333,
			.63333,
			0,
			0,
			.89444
		],
		8854: [
			.13333,
			.63333,
			0,
			0,
			.89444
		],
		8855: [
			.13333,
			.63333,
			0,
			0,
			.89444
		],
		8856: [
			.13333,
			.63333,
			0,
			0,
			.89444
		],
		8857: [
			.13333,
			.63333,
			0,
			0,
			.89444
		],
		8866: [
			0,
			.69444,
			0,
			0,
			.70277
		],
		8867: [
			0,
			.69444,
			0,
			0,
			.70277
		],
		8868: [
			0,
			.69444,
			0,
			0,
			.89444
		],
		8869: [
			0,
			.69444,
			0,
			0,
			.89444
		],
		8900: [
			-.02639,
			.47361,
			0,
			0,
			.575
		],
		8901: [
			-.02639,
			.47361,
			0,
			0,
			.31944
		],
		8902: [
			-.02778,
			.47222,
			0,
			0,
			.575
		],
		8968: [
			.25,
			.75,
			0,
			0,
			.51111
		],
		8969: [
			.25,
			.75,
			0,
			0,
			.51111
		],
		8970: [
			.25,
			.75,
			0,
			0,
			.51111
		],
		8971: [
			.25,
			.75,
			0,
			0,
			.51111
		],
		8994: [
			-.13889,
			.36111,
			0,
			0,
			1.14999
		],
		8995: [
			-.13889,
			.36111,
			0,
			0,
			1.14999
		],
		9651: [
			.19444,
			.69444,
			0,
			0,
			1.02222
		],
		9657: [
			-.02778,
			.47222,
			0,
			0,
			.575
		],
		9661: [
			.19444,
			.69444,
			0,
			0,
			1.02222
		],
		9667: [
			-.02778,
			.47222,
			0,
			0,
			.575
		],
		9711: [
			.19444,
			.69444,
			0,
			0,
			1.14999
		],
		9824: [
			.12963,
			.69444,
			0,
			0,
			.89444
		],
		9825: [
			.12963,
			.69444,
			0,
			0,
			.89444
		],
		9826: [
			.12963,
			.69444,
			0,
			0,
			.89444
		],
		9827: [
			.12963,
			.69444,
			0,
			0,
			.89444
		],
		9837: [
			0,
			.75,
			0,
			0,
			.44722
		],
		9838: [
			.19444,
			.69444,
			0,
			0,
			.44722
		],
		9839: [
			.19444,
			.69444,
			0,
			0,
			.44722
		],
		10216: [
			.25,
			.75,
			0,
			0,
			.44722
		],
		10217: [
			.25,
			.75,
			0,
			0,
			.44722
		],
		10815: [
			0,
			.68611,
			0,
			0,
			.9
		],
		10927: [
			.19667,
			.69667,
			0,
			0,
			.89444
		],
		10928: [
			.19667,
			.69667,
			0,
			0,
			.89444
		],
		57376: [
			.19444,
			.69444,
			0,
			0,
			0
		]
	},
	"Main-BoldItalic": {
		32: [
			0,
			0,
			0,
			0,
			.25
		],
		33: [
			0,
			.69444,
			.11417,
			0,
			.38611
		],
		34: [
			0,
			.69444,
			.07939,
			0,
			.62055
		],
		35: [
			.19444,
			.69444,
			.06833,
			0,
			.94444
		],
		37: [
			.05556,
			.75,
			.12861,
			0,
			.94444
		],
		38: [
			0,
			.69444,
			.08528,
			0,
			.88555
		],
		39: [
			0,
			.69444,
			.12945,
			0,
			.35555
		],
		40: [
			.25,
			.75,
			.15806,
			0,
			.47333
		],
		41: [
			.25,
			.75,
			.03306,
			0,
			.47333
		],
		42: [
			0,
			.75,
			.14333,
			0,
			.59111
		],
		43: [
			.10333,
			.60333,
			.03306,
			0,
			.88555
		],
		44: [
			.19444,
			.14722,
			0,
			0,
			.35555
		],
		45: [
			0,
			.44444,
			.02611,
			0,
			.41444
		],
		46: [
			0,
			.14722,
			0,
			0,
			.35555
		],
		47: [
			.25,
			.75,
			.15806,
			0,
			.59111
		],
		48: [
			0,
			.64444,
			.13167,
			0,
			.59111
		],
		49: [
			0,
			.64444,
			.13167,
			0,
			.59111
		],
		50: [
			0,
			.64444,
			.13167,
			0,
			.59111
		],
		51: [
			0,
			.64444,
			.13167,
			0,
			.59111
		],
		52: [
			.19444,
			.64444,
			.13167,
			0,
			.59111
		],
		53: [
			0,
			.64444,
			.13167,
			0,
			.59111
		],
		54: [
			0,
			.64444,
			.13167,
			0,
			.59111
		],
		55: [
			.19444,
			.64444,
			.13167,
			0,
			.59111
		],
		56: [
			0,
			.64444,
			.13167,
			0,
			.59111
		],
		57: [
			0,
			.64444,
			.13167,
			0,
			.59111
		],
		58: [
			0,
			.44444,
			.06695,
			0,
			.35555
		],
		59: [
			.19444,
			.44444,
			.06695,
			0,
			.35555
		],
		61: [
			-.10889,
			.39111,
			.06833,
			0,
			.88555
		],
		63: [
			0,
			.69444,
			.11472,
			0,
			.59111
		],
		64: [
			0,
			.69444,
			.09208,
			0,
			.88555
		],
		65: [
			0,
			.68611,
			0,
			0,
			.86555
		],
		66: [
			0,
			.68611,
			.0992,
			0,
			.81666
		],
		67: [
			0,
			.68611,
			.14208,
			0,
			.82666
		],
		68: [
			0,
			.68611,
			.09062,
			0,
			.87555
		],
		69: [
			0,
			.68611,
			.11431,
			0,
			.75666
		],
		70: [
			0,
			.68611,
			.12903,
			0,
			.72722
		],
		71: [
			0,
			.68611,
			.07347,
			0,
			.89527
		],
		72: [
			0,
			.68611,
			.17208,
			0,
			.8961
		],
		73: [
			0,
			.68611,
			.15681,
			0,
			.47166
		],
		74: [
			0,
			.68611,
			.145,
			0,
			.61055
		],
		75: [
			0,
			.68611,
			.14208,
			0,
			.89499
		],
		76: [
			0,
			.68611,
			0,
			0,
			.69777
		],
		77: [
			0,
			.68611,
			.17208,
			0,
			1.07277
		],
		78: [
			0,
			.68611,
			.17208,
			0,
			.8961
		],
		79: [
			0,
			.68611,
			.09062,
			0,
			.85499
		],
		80: [
			0,
			.68611,
			.0992,
			0,
			.78721
		],
		81: [
			.19444,
			.68611,
			.09062,
			0,
			.85499
		],
		82: [
			0,
			.68611,
			.02559,
			0,
			.85944
		],
		83: [
			0,
			.68611,
			.11264,
			0,
			.64999
		],
		84: [
			0,
			.68611,
			.12903,
			0,
			.7961
		],
		85: [
			0,
			.68611,
			.17208,
			0,
			.88083
		],
		86: [
			0,
			.68611,
			.18625,
			0,
			.86555
		],
		87: [
			0,
			.68611,
			.18625,
			0,
			1.15999
		],
		88: [
			0,
			.68611,
			.15681,
			0,
			.86555
		],
		89: [
			0,
			.68611,
			.19803,
			0,
			.86555
		],
		90: [
			0,
			.68611,
			.14208,
			0,
			.70888
		],
		91: [
			.25,
			.75,
			.1875,
			0,
			.35611
		],
		93: [
			.25,
			.75,
			.09972,
			0,
			.35611
		],
		94: [
			0,
			.69444,
			.06709,
			0,
			.59111
		],
		95: [
			.31,
			.13444,
			.09811,
			0,
			.59111
		],
		97: [
			0,
			.44444,
			.09426,
			0,
			.59111
		],
		98: [
			0,
			.69444,
			.07861,
			0,
			.53222
		],
		99: [
			0,
			.44444,
			.05222,
			0,
			.53222
		],
		100: [
			0,
			.69444,
			.10861,
			0,
			.59111
		],
		101: [
			0,
			.44444,
			.085,
			0,
			.53222
		],
		102: [
			.19444,
			.69444,
			.21778,
			0,
			.4
		],
		103: [
			.19444,
			.44444,
			.105,
			0,
			.53222
		],
		104: [
			0,
			.69444,
			.09426,
			0,
			.59111
		],
		105: [
			0,
			.69326,
			.11387,
			0,
			.35555
		],
		106: [
			.19444,
			.69326,
			.1672,
			0,
			.35555
		],
		107: [
			0,
			.69444,
			.11111,
			0,
			.53222
		],
		108: [
			0,
			.69444,
			.10861,
			0,
			.29666
		],
		109: [
			0,
			.44444,
			.09426,
			0,
			.94444
		],
		110: [
			0,
			.44444,
			.09426,
			0,
			.64999
		],
		111: [
			0,
			.44444,
			.07861,
			0,
			.59111
		],
		112: [
			.19444,
			.44444,
			.07861,
			0,
			.59111
		],
		113: [
			.19444,
			.44444,
			.105,
			0,
			.53222
		],
		114: [
			0,
			.44444,
			.11111,
			0,
			.50167
		],
		115: [
			0,
			.44444,
			.08167,
			0,
			.48694
		],
		116: [
			0,
			.63492,
			.09639,
			0,
			.385
		],
		117: [
			0,
			.44444,
			.09426,
			0,
			.62055
		],
		118: [
			0,
			.44444,
			.11111,
			0,
			.53222
		],
		119: [
			0,
			.44444,
			.11111,
			0,
			.76777
		],
		120: [
			0,
			.44444,
			.12583,
			0,
			.56055
		],
		121: [
			.19444,
			.44444,
			.105,
			0,
			.56166
		],
		122: [
			0,
			.44444,
			.13889,
			0,
			.49055
		],
		126: [
			.35,
			.34444,
			.11472,
			0,
			.59111
		],
		160: [
			0,
			0,
			0,
			0,
			.25
		],
		168: [
			0,
			.69444,
			.11473,
			0,
			.59111
		],
		176: [
			0,
			.69444,
			0,
			0,
			.94888
		],
		184: [
			.17014,
			0,
			0,
			0,
			.53222
		],
		198: [
			0,
			.68611,
			.11431,
			0,
			1.02277
		],
		216: [
			.04861,
			.73472,
			.09062,
			0,
			.88555
		],
		223: [
			.19444,
			.69444,
			.09736,
			0,
			.665
		],
		230: [
			0,
			.44444,
			.085,
			0,
			.82666
		],
		248: [
			.09722,
			.54167,
			.09458,
			0,
			.59111
		],
		305: [
			0,
			.44444,
			.09426,
			0,
			.35555
		],
		338: [
			0,
			.68611,
			.11431,
			0,
			1.14054
		],
		339: [
			0,
			.44444,
			.085,
			0,
			.82666
		],
		567: [
			.19444,
			.44444,
			.04611,
			0,
			.385
		],
		710: [
			0,
			.69444,
			.06709,
			0,
			.59111
		],
		711: [
			0,
			.63194,
			.08271,
			0,
			.59111
		],
		713: [
			0,
			.59444,
			.10444,
			0,
			.59111
		],
		714: [
			0,
			.69444,
			.08528,
			0,
			.59111
		],
		715: [
			0,
			.69444,
			0,
			0,
			.59111
		],
		728: [
			0,
			.69444,
			.10333,
			0,
			.59111
		],
		729: [
			0,
			.69444,
			.12945,
			0,
			.35555
		],
		730: [
			0,
			.69444,
			0,
			0,
			.94888
		],
		732: [
			0,
			.69444,
			.11472,
			0,
			.59111
		],
		733: [
			0,
			.69444,
			.11472,
			0,
			.59111
		],
		915: [
			0,
			.68611,
			.12903,
			0,
			.69777
		],
		916: [
			0,
			.68611,
			0,
			0,
			.94444
		],
		920: [
			0,
			.68611,
			.09062,
			0,
			.88555
		],
		923: [
			0,
			.68611,
			0,
			0,
			.80666
		],
		926: [
			0,
			.68611,
			.15092,
			0,
			.76777
		],
		928: [
			0,
			.68611,
			.17208,
			0,
			.8961
		],
		931: [
			0,
			.68611,
			.11431,
			0,
			.82666
		],
		933: [
			0,
			.68611,
			.10778,
			0,
			.88555
		],
		934: [
			0,
			.68611,
			.05632,
			0,
			.82666
		],
		936: [
			0,
			.68611,
			.10778,
			0,
			.88555
		],
		937: [
			0,
			.68611,
			.0992,
			0,
			.82666
		],
		8211: [
			0,
			.44444,
			.09811,
			0,
			.59111
		],
		8212: [
			0,
			.44444,
			.09811,
			0,
			1.18221
		],
		8216: [
			0,
			.69444,
			.12945,
			0,
			.35555
		],
		8217: [
			0,
			.69444,
			.12945,
			0,
			.35555
		],
		8220: [
			0,
			.69444,
			.16772,
			0,
			.62055
		],
		8221: [
			0,
			.69444,
			.07939,
			0,
			.62055
		]
	},
	"Main-Italic": {
		32: [
			0,
			0,
			0,
			0,
			.25
		],
		33: [
			0,
			.69444,
			.12417,
			0,
			.30667
		],
		34: [
			0,
			.69444,
			.06961,
			0,
			.51444
		],
		35: [
			.19444,
			.69444,
			.06616,
			0,
			.81777
		],
		37: [
			.05556,
			.75,
			.13639,
			0,
			.81777
		],
		38: [
			0,
			.69444,
			.09694,
			0,
			.76666
		],
		39: [
			0,
			.69444,
			.12417,
			0,
			.30667
		],
		40: [
			.25,
			.75,
			.16194,
			0,
			.40889
		],
		41: [
			.25,
			.75,
			.03694,
			0,
			.40889
		],
		42: [
			0,
			.75,
			.14917,
			0,
			.51111
		],
		43: [
			.05667,
			.56167,
			.03694,
			0,
			.76666
		],
		44: [
			.19444,
			.10556,
			0,
			0,
			.30667
		],
		45: [
			0,
			.43056,
			.02826,
			0,
			.35778
		],
		46: [
			0,
			.10556,
			0,
			0,
			.30667
		],
		47: [
			.25,
			.75,
			.16194,
			0,
			.51111
		],
		48: [
			0,
			.64444,
			.13556,
			0,
			.51111
		],
		49: [
			0,
			.64444,
			.13556,
			0,
			.51111
		],
		50: [
			0,
			.64444,
			.13556,
			0,
			.51111
		],
		51: [
			0,
			.64444,
			.13556,
			0,
			.51111
		],
		52: [
			.19444,
			.64444,
			.13556,
			0,
			.51111
		],
		53: [
			0,
			.64444,
			.13556,
			0,
			.51111
		],
		54: [
			0,
			.64444,
			.13556,
			0,
			.51111
		],
		55: [
			.19444,
			.64444,
			.13556,
			0,
			.51111
		],
		56: [
			0,
			.64444,
			.13556,
			0,
			.51111
		],
		57: [
			0,
			.64444,
			.13556,
			0,
			.51111
		],
		58: [
			0,
			.43056,
			.0582,
			0,
			.30667
		],
		59: [
			.19444,
			.43056,
			.0582,
			0,
			.30667
		],
		61: [
			-.13313,
			.36687,
			.06616,
			0,
			.76666
		],
		63: [
			0,
			.69444,
			.1225,
			0,
			.51111
		],
		64: [
			0,
			.69444,
			.09597,
			0,
			.76666
		],
		65: [
			0,
			.68333,
			0,
			0,
			.74333
		],
		66: [
			0,
			.68333,
			.10257,
			0,
			.70389
		],
		67: [
			0,
			.68333,
			.14528,
			0,
			.71555
		],
		68: [
			0,
			.68333,
			.09403,
			0,
			.755
		],
		69: [
			0,
			.68333,
			.12028,
			0,
			.67833
		],
		70: [
			0,
			.68333,
			.13305,
			0,
			.65277
		],
		71: [
			0,
			.68333,
			.08722,
			0,
			.77361
		],
		72: [
			0,
			.68333,
			.16389,
			0,
			.74333
		],
		73: [
			0,
			.68333,
			.15806,
			0,
			.38555
		],
		74: [
			0,
			.68333,
			.14028,
			0,
			.525
		],
		75: [
			0,
			.68333,
			.14528,
			0,
			.76888
		],
		76: [
			0,
			.68333,
			0,
			0,
			.62722
		],
		77: [
			0,
			.68333,
			.16389,
			0,
			.89666
		],
		78: [
			0,
			.68333,
			.16389,
			0,
			.74333
		],
		79: [
			0,
			.68333,
			.09403,
			0,
			.76666
		],
		80: [
			0,
			.68333,
			.10257,
			0,
			.67833
		],
		81: [
			.19444,
			.68333,
			.09403,
			0,
			.76666
		],
		82: [
			0,
			.68333,
			.03868,
			0,
			.72944
		],
		83: [
			0,
			.68333,
			.11972,
			0,
			.56222
		],
		84: [
			0,
			.68333,
			.13305,
			0,
			.71555
		],
		85: [
			0,
			.68333,
			.16389,
			0,
			.74333
		],
		86: [
			0,
			.68333,
			.18361,
			0,
			.74333
		],
		87: [
			0,
			.68333,
			.18361,
			0,
			.99888
		],
		88: [
			0,
			.68333,
			.15806,
			0,
			.74333
		],
		89: [
			0,
			.68333,
			.19383,
			0,
			.74333
		],
		90: [
			0,
			.68333,
			.14528,
			0,
			.61333
		],
		91: [
			.25,
			.75,
			.1875,
			0,
			.30667
		],
		93: [
			.25,
			.75,
			.10528,
			0,
			.30667
		],
		94: [
			0,
			.69444,
			.06646,
			0,
			.51111
		],
		95: [
			.31,
			.12056,
			.09208,
			0,
			.51111
		],
		97: [
			0,
			.43056,
			.07671,
			0,
			.51111
		],
		98: [
			0,
			.69444,
			.06312,
			0,
			.46
		],
		99: [
			0,
			.43056,
			.05653,
			0,
			.46
		],
		100: [
			0,
			.69444,
			.10333,
			0,
			.51111
		],
		101: [
			0,
			.43056,
			.07514,
			0,
			.46
		],
		102: [
			.19444,
			.69444,
			.21194,
			0,
			.30667
		],
		103: [
			.19444,
			.43056,
			.08847,
			0,
			.46
		],
		104: [
			0,
			.69444,
			.07671,
			0,
			.51111
		],
		105: [
			0,
			.65536,
			.1019,
			0,
			.30667
		],
		106: [
			.19444,
			.65536,
			.14467,
			0,
			.30667
		],
		107: [
			0,
			.69444,
			.10764,
			0,
			.46
		],
		108: [
			0,
			.69444,
			.10333,
			0,
			.25555
		],
		109: [
			0,
			.43056,
			.07671,
			0,
			.81777
		],
		110: [
			0,
			.43056,
			.07671,
			0,
			.56222
		],
		111: [
			0,
			.43056,
			.06312,
			0,
			.51111
		],
		112: [
			.19444,
			.43056,
			.06312,
			0,
			.51111
		],
		113: [
			.19444,
			.43056,
			.08847,
			0,
			.46
		],
		114: [
			0,
			.43056,
			.10764,
			0,
			.42166
		],
		115: [
			0,
			.43056,
			.08208,
			0,
			.40889
		],
		116: [
			0,
			.61508,
			.09486,
			0,
			.33222
		],
		117: [
			0,
			.43056,
			.07671,
			0,
			.53666
		],
		118: [
			0,
			.43056,
			.10764,
			0,
			.46
		],
		119: [
			0,
			.43056,
			.10764,
			0,
			.66444
		],
		120: [
			0,
			.43056,
			.12042,
			0,
			.46389
		],
		121: [
			.19444,
			.43056,
			.08847,
			0,
			.48555
		],
		122: [
			0,
			.43056,
			.12292,
			0,
			.40889
		],
		126: [
			.35,
			.31786,
			.11585,
			0,
			.51111
		],
		160: [
			0,
			0,
			0,
			0,
			.25
		],
		168: [
			0,
			.66786,
			.10474,
			0,
			.51111
		],
		176: [
			0,
			.69444,
			0,
			0,
			.83129
		],
		184: [
			.17014,
			0,
			0,
			0,
			.46
		],
		198: [
			0,
			.68333,
			.12028,
			0,
			.88277
		],
		216: [
			.04861,
			.73194,
			.09403,
			0,
			.76666
		],
		223: [
			.19444,
			.69444,
			.10514,
			0,
			.53666
		],
		230: [
			0,
			.43056,
			.07514,
			0,
			.71555
		],
		248: [
			.09722,
			.52778,
			.09194,
			0,
			.51111
		],
		338: [
			0,
			.68333,
			.12028,
			0,
			.98499
		],
		339: [
			0,
			.43056,
			.07514,
			0,
			.71555
		],
		710: [
			0,
			.69444,
			.06646,
			0,
			.51111
		],
		711: [
			0,
			.62847,
			.08295,
			0,
			.51111
		],
		713: [
			0,
			.56167,
			.10333,
			0,
			.51111
		],
		714: [
			0,
			.69444,
			.09694,
			0,
			.51111
		],
		715: [
			0,
			.69444,
			0,
			0,
			.51111
		],
		728: [
			0,
			.69444,
			.10806,
			0,
			.51111
		],
		729: [
			0,
			.66786,
			.11752,
			0,
			.30667
		],
		730: [
			0,
			.69444,
			0,
			0,
			.83129
		],
		732: [
			0,
			.66786,
			.11585,
			0,
			.51111
		],
		733: [
			0,
			.69444,
			.1225,
			0,
			.51111
		],
		915: [
			0,
			.68333,
			.13305,
			0,
			.62722
		],
		916: [
			0,
			.68333,
			0,
			0,
			.81777
		],
		920: [
			0,
			.68333,
			.09403,
			0,
			.76666
		],
		923: [
			0,
			.68333,
			0,
			0,
			.69222
		],
		926: [
			0,
			.68333,
			.15294,
			0,
			.66444
		],
		928: [
			0,
			.68333,
			.16389,
			0,
			.74333
		],
		931: [
			0,
			.68333,
			.12028,
			0,
			.71555
		],
		933: [
			0,
			.68333,
			.11111,
			0,
			.76666
		],
		934: [
			0,
			.68333,
			.05986,
			0,
			.71555
		],
		936: [
			0,
			.68333,
			.11111,
			0,
			.76666
		],
		937: [
			0,
			.68333,
			.10257,
			0,
			.71555
		],
		8211: [
			0,
			.43056,
			.09208,
			0,
			.51111
		],
		8212: [
			0,
			.43056,
			.09208,
			0,
			1.02222
		],
		8216: [
			0,
			.69444,
			.12417,
			0,
			.30667
		],
		8217: [
			0,
			.69444,
			.12417,
			0,
			.30667
		],
		8220: [
			0,
			.69444,
			.1685,
			0,
			.51444
		],
		8221: [
			0,
			.69444,
			.06961,
			0,
			.51444
		],
		8463: [
			0,
			.68889,
			0,
			0,
			.54028
		]
	},
	"Main-Regular": {
		32: [
			0,
			0,
			0,
			0,
			.25
		],
		33: [
			0,
			.69444,
			0,
			0,
			.27778
		],
		34: [
			0,
			.69444,
			0,
			0,
			.5
		],
		35: [
			.19444,
			.69444,
			0,
			0,
			.83334
		],
		36: [
			.05556,
			.75,
			0,
			0,
			.5
		],
		37: [
			.05556,
			.75,
			0,
			0,
			.83334
		],
		38: [
			0,
			.69444,
			0,
			0,
			.77778
		],
		39: [
			0,
			.69444,
			0,
			0,
			.27778
		],
		40: [
			.25,
			.75,
			0,
			0,
			.38889
		],
		41: [
			.25,
			.75,
			0,
			0,
			.38889
		],
		42: [
			0,
			.75,
			0,
			0,
			.5
		],
		43: [
			.08333,
			.58333,
			0,
			0,
			.77778
		],
		44: [
			.19444,
			.10556,
			0,
			0,
			.27778
		],
		45: [
			0,
			.43056,
			0,
			0,
			.33333
		],
		46: [
			0,
			.10556,
			0,
			0,
			.27778
		],
		47: [
			.25,
			.75,
			0,
			0,
			.5
		],
		48: [
			0,
			.64444,
			0,
			0,
			.5
		],
		49: [
			0,
			.64444,
			0,
			0,
			.5
		],
		50: [
			0,
			.64444,
			0,
			0,
			.5
		],
		51: [
			0,
			.64444,
			0,
			0,
			.5
		],
		52: [
			0,
			.64444,
			0,
			0,
			.5
		],
		53: [
			0,
			.64444,
			0,
			0,
			.5
		],
		54: [
			0,
			.64444,
			0,
			0,
			.5
		],
		55: [
			0,
			.64444,
			0,
			0,
			.5
		],
		56: [
			0,
			.64444,
			0,
			0,
			.5
		],
		57: [
			0,
			.64444,
			0,
			0,
			.5
		],
		58: [
			0,
			.43056,
			0,
			0,
			.27778
		],
		59: [
			.19444,
			.43056,
			0,
			0,
			.27778
		],
		60: [
			.0391,
			.5391,
			0,
			0,
			.77778
		],
		61: [
			-.13313,
			.36687,
			0,
			0,
			.77778
		],
		62: [
			.0391,
			.5391,
			0,
			0,
			.77778
		],
		63: [
			0,
			.69444,
			0,
			0,
			.47222
		],
		64: [
			0,
			.69444,
			0,
			0,
			.77778
		],
		65: [
			0,
			.68333,
			0,
			0,
			.75
		],
		66: [
			0,
			.68333,
			0,
			0,
			.70834
		],
		67: [
			0,
			.68333,
			0,
			0,
			.72222
		],
		68: [
			0,
			.68333,
			0,
			0,
			.76389
		],
		69: [
			0,
			.68333,
			0,
			0,
			.68056
		],
		70: [
			0,
			.68333,
			0,
			0,
			.65278
		],
		71: [
			0,
			.68333,
			0,
			0,
			.78472
		],
		72: [
			0,
			.68333,
			0,
			0,
			.75
		],
		73: [
			0,
			.68333,
			0,
			0,
			.36111
		],
		74: [
			0,
			.68333,
			0,
			0,
			.51389
		],
		75: [
			0,
			.68333,
			0,
			0,
			.77778
		],
		76: [
			0,
			.68333,
			0,
			0,
			.625
		],
		77: [
			0,
			.68333,
			0,
			0,
			.91667
		],
		78: [
			0,
			.68333,
			0,
			0,
			.75
		],
		79: [
			0,
			.68333,
			0,
			0,
			.77778
		],
		80: [
			0,
			.68333,
			0,
			0,
			.68056
		],
		81: [
			.19444,
			.68333,
			0,
			0,
			.77778
		],
		82: [
			0,
			.68333,
			0,
			0,
			.73611
		],
		83: [
			0,
			.68333,
			0,
			0,
			.55556
		],
		84: [
			0,
			.68333,
			0,
			0,
			.72222
		],
		85: [
			0,
			.68333,
			0,
			0,
			.75
		],
		86: [
			0,
			.68333,
			.01389,
			0,
			.75
		],
		87: [
			0,
			.68333,
			.01389,
			0,
			1.02778
		],
		88: [
			0,
			.68333,
			0,
			0,
			.75
		],
		89: [
			0,
			.68333,
			.025,
			0,
			.75
		],
		90: [
			0,
			.68333,
			0,
			0,
			.61111
		],
		91: [
			.25,
			.75,
			0,
			0,
			.27778
		],
		92: [
			.25,
			.75,
			0,
			0,
			.5
		],
		93: [
			.25,
			.75,
			0,
			0,
			.27778
		],
		94: [
			0,
			.69444,
			0,
			0,
			.5
		],
		95: [
			.31,
			.12056,
			.02778,
			0,
			.5
		],
		97: [
			0,
			.43056,
			0,
			0,
			.5
		],
		98: [
			0,
			.69444,
			0,
			0,
			.55556
		],
		99: [
			0,
			.43056,
			0,
			0,
			.44445
		],
		100: [
			0,
			.69444,
			0,
			0,
			.55556
		],
		101: [
			0,
			.43056,
			0,
			0,
			.44445
		],
		102: [
			0,
			.69444,
			.07778,
			0,
			.30556
		],
		103: [
			.19444,
			.43056,
			.01389,
			0,
			.5
		],
		104: [
			0,
			.69444,
			0,
			0,
			.55556
		],
		105: [
			0,
			.66786,
			0,
			0,
			.27778
		],
		106: [
			.19444,
			.66786,
			0,
			0,
			.30556
		],
		107: [
			0,
			.69444,
			0,
			0,
			.52778
		],
		108: [
			0,
			.69444,
			0,
			0,
			.27778
		],
		109: [
			0,
			.43056,
			0,
			0,
			.83334
		],
		110: [
			0,
			.43056,
			0,
			0,
			.55556
		],
		111: [
			0,
			.43056,
			0,
			0,
			.5
		],
		112: [
			.19444,
			.43056,
			0,
			0,
			.55556
		],
		113: [
			.19444,
			.43056,
			0,
			0,
			.52778
		],
		114: [
			0,
			.43056,
			0,
			0,
			.39167
		],
		115: [
			0,
			.43056,
			0,
			0,
			.39445
		],
		116: [
			0,
			.61508,
			0,
			0,
			.38889
		],
		117: [
			0,
			.43056,
			0,
			0,
			.55556
		],
		118: [
			0,
			.43056,
			.01389,
			0,
			.52778
		],
		119: [
			0,
			.43056,
			.01389,
			0,
			.72222
		],
		120: [
			0,
			.43056,
			0,
			0,
			.52778
		],
		121: [
			.19444,
			.43056,
			.01389,
			0,
			.52778
		],
		122: [
			0,
			.43056,
			0,
			0,
			.44445
		],
		123: [
			.25,
			.75,
			0,
			0,
			.5
		],
		124: [
			.25,
			.75,
			0,
			0,
			.27778
		],
		125: [
			.25,
			.75,
			0,
			0,
			.5
		],
		126: [
			.35,
			.31786,
			0,
			0,
			.5
		],
		160: [
			0,
			0,
			0,
			0,
			.25
		],
		163: [
			0,
			.69444,
			0,
			0,
			.76909
		],
		167: [
			.19444,
			.69444,
			0,
			0,
			.44445
		],
		168: [
			0,
			.66786,
			0,
			0,
			.5
		],
		172: [
			0,
			.43056,
			0,
			0,
			.66667
		],
		176: [
			0,
			.69444,
			0,
			0,
			.75
		],
		177: [
			.08333,
			.58333,
			0,
			0,
			.77778
		],
		182: [
			.19444,
			.69444,
			0,
			0,
			.61111
		],
		184: [
			.17014,
			0,
			0,
			0,
			.44445
		],
		198: [
			0,
			.68333,
			0,
			0,
			.90278
		],
		215: [
			.08333,
			.58333,
			0,
			0,
			.77778
		],
		216: [
			.04861,
			.73194,
			0,
			0,
			.77778
		],
		223: [
			0,
			.69444,
			0,
			0,
			.5
		],
		230: [
			0,
			.43056,
			0,
			0,
			.72222
		],
		247: [
			.08333,
			.58333,
			0,
			0,
			.77778
		],
		248: [
			.09722,
			.52778,
			0,
			0,
			.5
		],
		305: [
			0,
			.43056,
			0,
			0,
			.27778
		],
		338: [
			0,
			.68333,
			0,
			0,
			1.01389
		],
		339: [
			0,
			.43056,
			0,
			0,
			.77778
		],
		567: [
			.19444,
			.43056,
			0,
			0,
			.30556
		],
		710: [
			0,
			.69444,
			0,
			0,
			.5
		],
		711: [
			0,
			.62847,
			0,
			0,
			.5
		],
		713: [
			0,
			.56778,
			0,
			0,
			.5
		],
		714: [
			0,
			.69444,
			0,
			0,
			.5
		],
		715: [
			0,
			.69444,
			0,
			0,
			.5
		],
		728: [
			0,
			.69444,
			0,
			0,
			.5
		],
		729: [
			0,
			.66786,
			0,
			0,
			.27778
		],
		730: [
			0,
			.69444,
			0,
			0,
			.75
		],
		732: [
			0,
			.66786,
			0,
			0,
			.5
		],
		733: [
			0,
			.69444,
			0,
			0,
			.5
		],
		915: [
			0,
			.68333,
			0,
			0,
			.625
		],
		916: [
			0,
			.68333,
			0,
			0,
			.83334
		],
		920: [
			0,
			.68333,
			0,
			0,
			.77778
		],
		923: [
			0,
			.68333,
			0,
			0,
			.69445
		],
		926: [
			0,
			.68333,
			0,
			0,
			.66667
		],
		928: [
			0,
			.68333,
			0,
			0,
			.75
		],
		931: [
			0,
			.68333,
			0,
			0,
			.72222
		],
		933: [
			0,
			.68333,
			0,
			0,
			.77778
		],
		934: [
			0,
			.68333,
			0,
			0,
			.72222
		],
		936: [
			0,
			.68333,
			0,
			0,
			.77778
		],
		937: [
			0,
			.68333,
			0,
			0,
			.72222
		],
		8211: [
			0,
			.43056,
			.02778,
			0,
			.5
		],
		8212: [
			0,
			.43056,
			.02778,
			0,
			1
		],
		8216: [
			0,
			.69444,
			0,
			0,
			.27778
		],
		8217: [
			0,
			.69444,
			0,
			0,
			.27778
		],
		8220: [
			0,
			.69444,
			0,
			0,
			.5
		],
		8221: [
			0,
			.69444,
			0,
			0,
			.5
		],
		8224: [
			.19444,
			.69444,
			0,
			0,
			.44445
		],
		8225: [
			.19444,
			.69444,
			0,
			0,
			.44445
		],
		8230: [
			0,
			.123,
			0,
			0,
			1.172
		],
		8242: [
			0,
			.55556,
			0,
			0,
			.275
		],
		8407: [
			0,
			.71444,
			.15382,
			0,
			.5
		],
		8463: [
			0,
			.68889,
			0,
			0,
			.54028
		],
		8465: [
			0,
			.69444,
			0,
			0,
			.72222
		],
		8467: [
			0,
			.69444,
			0,
			.11111,
			.41667
		],
		8472: [
			.19444,
			.43056,
			0,
			.11111,
			.63646
		],
		8476: [
			0,
			.69444,
			0,
			0,
			.72222
		],
		8501: [
			0,
			.69444,
			0,
			0,
			.61111
		],
		8592: [
			-.13313,
			.36687,
			0,
			0,
			1
		],
		8593: [
			.19444,
			.69444,
			0,
			0,
			.5
		],
		8594: [
			-.13313,
			.36687,
			0,
			0,
			1
		],
		8595: [
			.19444,
			.69444,
			0,
			0,
			.5
		],
		8596: [
			-.13313,
			.36687,
			0,
			0,
			1
		],
		8597: [
			.25,
			.75,
			0,
			0,
			.5
		],
		8598: [
			.19444,
			.69444,
			0,
			0,
			1
		],
		8599: [
			.19444,
			.69444,
			0,
			0,
			1
		],
		8600: [
			.19444,
			.69444,
			0,
			0,
			1
		],
		8601: [
			.19444,
			.69444,
			0,
			0,
			1
		],
		8614: [
			.011,
			.511,
			0,
			0,
			1
		],
		8617: [
			.011,
			.511,
			0,
			0,
			1.126
		],
		8618: [
			.011,
			.511,
			0,
			0,
			1.126
		],
		8636: [
			-.13313,
			.36687,
			0,
			0,
			1
		],
		8637: [
			-.13313,
			.36687,
			0,
			0,
			1
		],
		8640: [
			-.13313,
			.36687,
			0,
			0,
			1
		],
		8641: [
			-.13313,
			.36687,
			0,
			0,
			1
		],
		8652: [
			.011,
			.671,
			0,
			0,
			1
		],
		8656: [
			-.13313,
			.36687,
			0,
			0,
			1
		],
		8657: [
			.19444,
			.69444,
			0,
			0,
			.61111
		],
		8658: [
			-.13313,
			.36687,
			0,
			0,
			1
		],
		8659: [
			.19444,
			.69444,
			0,
			0,
			.61111
		],
		8660: [
			-.13313,
			.36687,
			0,
			0,
			1
		],
		8661: [
			.25,
			.75,
			0,
			0,
			.61111
		],
		8704: [
			0,
			.69444,
			0,
			0,
			.55556
		],
		8706: [
			0,
			.69444,
			.05556,
			.08334,
			.5309
		],
		8707: [
			0,
			.69444,
			0,
			0,
			.55556
		],
		8709: [
			.05556,
			.75,
			0,
			0,
			.5
		],
		8711: [
			0,
			.68333,
			0,
			0,
			.83334
		],
		8712: [
			.0391,
			.5391,
			0,
			0,
			.66667
		],
		8715: [
			.0391,
			.5391,
			0,
			0,
			.66667
		],
		8722: [
			.08333,
			.58333,
			0,
			0,
			.77778
		],
		8723: [
			.08333,
			.58333,
			0,
			0,
			.77778
		],
		8725: [
			.25,
			.75,
			0,
			0,
			.5
		],
		8726: [
			.25,
			.75,
			0,
			0,
			.5
		],
		8727: [
			-.03472,
			.46528,
			0,
			0,
			.5
		],
		8728: [
			-.05555,
			.44445,
			0,
			0,
			.5
		],
		8729: [
			-.05555,
			.44445,
			0,
			0,
			.5
		],
		8730: [
			.2,
			.8,
			0,
			0,
			.83334
		],
		8733: [
			0,
			.43056,
			0,
			0,
			.77778
		],
		8734: [
			0,
			.43056,
			0,
			0,
			1
		],
		8736: [
			0,
			.69224,
			0,
			0,
			.72222
		],
		8739: [
			.25,
			.75,
			0,
			0,
			.27778
		],
		8741: [
			.25,
			.75,
			0,
			0,
			.5
		],
		8743: [
			0,
			.55556,
			0,
			0,
			.66667
		],
		8744: [
			0,
			.55556,
			0,
			0,
			.66667
		],
		8745: [
			0,
			.55556,
			0,
			0,
			.66667
		],
		8746: [
			0,
			.55556,
			0,
			0,
			.66667
		],
		8747: [
			.19444,
			.69444,
			.11111,
			0,
			.41667
		],
		8764: [
			-.13313,
			.36687,
			0,
			0,
			.77778
		],
		8768: [
			.19444,
			.69444,
			0,
			0,
			.27778
		],
		8771: [
			-.03625,
			.46375,
			0,
			0,
			.77778
		],
		8773: [
			-.022,
			.589,
			0,
			0,
			.778
		],
		8776: [
			-.01688,
			.48312,
			0,
			0,
			.77778
		],
		8781: [
			-.03625,
			.46375,
			0,
			0,
			.77778
		],
		8784: [
			-.133,
			.673,
			0,
			0,
			.778
		],
		8801: [
			-.03625,
			.46375,
			0,
			0,
			.77778
		],
		8804: [
			.13597,
			.63597,
			0,
			0,
			.77778
		],
		8805: [
			.13597,
			.63597,
			0,
			0,
			.77778
		],
		8810: [
			.0391,
			.5391,
			0,
			0,
			1
		],
		8811: [
			.0391,
			.5391,
			0,
			0,
			1
		],
		8826: [
			.0391,
			.5391,
			0,
			0,
			.77778
		],
		8827: [
			.0391,
			.5391,
			0,
			0,
			.77778
		],
		8834: [
			.0391,
			.5391,
			0,
			0,
			.77778
		],
		8835: [
			.0391,
			.5391,
			0,
			0,
			.77778
		],
		8838: [
			.13597,
			.63597,
			0,
			0,
			.77778
		],
		8839: [
			.13597,
			.63597,
			0,
			0,
			.77778
		],
		8846: [
			0,
			.55556,
			0,
			0,
			.66667
		],
		8849: [
			.13597,
			.63597,
			0,
			0,
			.77778
		],
		8850: [
			.13597,
			.63597,
			0,
			0,
			.77778
		],
		8851: [
			0,
			.55556,
			0,
			0,
			.66667
		],
		8852: [
			0,
			.55556,
			0,
			0,
			.66667
		],
		8853: [
			.08333,
			.58333,
			0,
			0,
			.77778
		],
		8854: [
			.08333,
			.58333,
			0,
			0,
			.77778
		],
		8855: [
			.08333,
			.58333,
			0,
			0,
			.77778
		],
		8856: [
			.08333,
			.58333,
			0,
			0,
			.77778
		],
		8857: [
			.08333,
			.58333,
			0,
			0,
			.77778
		],
		8866: [
			0,
			.69444,
			0,
			0,
			.61111
		],
		8867: [
			0,
			.69444,
			0,
			0,
			.61111
		],
		8868: [
			0,
			.69444,
			0,
			0,
			.77778
		],
		8869: [
			0,
			.69444,
			0,
			0,
			.77778
		],
		8872: [
			.249,
			.75,
			0,
			0,
			.867
		],
		8900: [
			-.05555,
			.44445,
			0,
			0,
			.5
		],
		8901: [
			-.05555,
			.44445,
			0,
			0,
			.27778
		],
		8902: [
			-.03472,
			.46528,
			0,
			0,
			.5
		],
		8904: [
			.005,
			.505,
			0,
			0,
			.9
		],
		8942: [
			.03,
			.903,
			0,
			0,
			.278
		],
		8943: [
			-.19,
			.313,
			0,
			0,
			1.172
		],
		8945: [
			-.1,
			.823,
			0,
			0,
			1.282
		],
		8968: [
			.25,
			.75,
			0,
			0,
			.44445
		],
		8969: [
			.25,
			.75,
			0,
			0,
			.44445
		],
		8970: [
			.25,
			.75,
			0,
			0,
			.44445
		],
		8971: [
			.25,
			.75,
			0,
			0,
			.44445
		],
		8994: [
			-.14236,
			.35764,
			0,
			0,
			1
		],
		8995: [
			-.14236,
			.35764,
			0,
			0,
			1
		],
		9136: [
			.244,
			.744,
			0,
			0,
			.412
		],
		9137: [
			.244,
			.745,
			0,
			0,
			.412
		],
		9651: [
			.19444,
			.69444,
			0,
			0,
			.88889
		],
		9657: [
			-.03472,
			.46528,
			0,
			0,
			.5
		],
		9661: [
			.19444,
			.69444,
			0,
			0,
			.88889
		],
		9667: [
			-.03472,
			.46528,
			0,
			0,
			.5
		],
		9711: [
			.19444,
			.69444,
			0,
			0,
			1
		],
		9824: [
			.12963,
			.69444,
			0,
			0,
			.77778
		],
		9825: [
			.12963,
			.69444,
			0,
			0,
			.77778
		],
		9826: [
			.12963,
			.69444,
			0,
			0,
			.77778
		],
		9827: [
			.12963,
			.69444,
			0,
			0,
			.77778
		],
		9837: [
			0,
			.75,
			0,
			0,
			.38889
		],
		9838: [
			.19444,
			.69444,
			0,
			0,
			.38889
		],
		9839: [
			.19444,
			.69444,
			0,
			0,
			.38889
		],
		10216: [
			.25,
			.75,
			0,
			0,
			.38889
		],
		10217: [
			.25,
			.75,
			0,
			0,
			.38889
		],
		10222: [
			.244,
			.744,
			0,
			0,
			.412
		],
		10223: [
			.244,
			.745,
			0,
			0,
			.412
		],
		10229: [
			.011,
			.511,
			0,
			0,
			1.609
		],
		10230: [
			.011,
			.511,
			0,
			0,
			1.638
		],
		10231: [
			.011,
			.511,
			0,
			0,
			1.859
		],
		10232: [
			.024,
			.525,
			0,
			0,
			1.609
		],
		10233: [
			.024,
			.525,
			0,
			0,
			1.638
		],
		10234: [
			.024,
			.525,
			0,
			0,
			1.858
		],
		10236: [
			.011,
			.511,
			0,
			0,
			1.638
		],
		10815: [
			0,
			.68333,
			0,
			0,
			.75
		],
		10927: [
			.13597,
			.63597,
			0,
			0,
			.77778
		],
		10928: [
			.13597,
			.63597,
			0,
			0,
			.77778
		],
		57376: [
			.19444,
			.69444,
			0,
			0,
			0
		]
	},
	"Math-BoldItalic": {
		32: [
			0,
			0,
			0,
			0,
			.25
		],
		48: [
			0,
			.44444,
			0,
			0,
			.575
		],
		49: [
			0,
			.44444,
			0,
			0,
			.575
		],
		50: [
			0,
			.44444,
			0,
			0,
			.575
		],
		51: [
			.19444,
			.44444,
			0,
			0,
			.575
		],
		52: [
			.19444,
			.44444,
			0,
			0,
			.575
		],
		53: [
			.19444,
			.44444,
			0,
			0,
			.575
		],
		54: [
			0,
			.64444,
			0,
			0,
			.575
		],
		55: [
			.19444,
			.44444,
			0,
			0,
			.575
		],
		56: [
			0,
			.64444,
			0,
			0,
			.575
		],
		57: [
			.19444,
			.44444,
			0,
			0,
			.575
		],
		65: [
			0,
			.68611,
			0,
			0,
			.86944
		],
		66: [
			0,
			.68611,
			.04835,
			0,
			.8664
		],
		67: [
			0,
			.68611,
			.06979,
			0,
			.81694
		],
		68: [
			0,
			.68611,
			.03194,
			0,
			.93812
		],
		69: [
			0,
			.68611,
			.05451,
			0,
			.81007
		],
		70: [
			0,
			.68611,
			.15972,
			0,
			.68889
		],
		71: [
			0,
			.68611,
			0,
			0,
			.88673
		],
		72: [
			0,
			.68611,
			.08229,
			0,
			.98229
		],
		73: [
			0,
			.68611,
			.07778,
			0,
			.51111
		],
		74: [
			0,
			.68611,
			.10069,
			0,
			.63125
		],
		75: [
			0,
			.68611,
			.06979,
			0,
			.97118
		],
		76: [
			0,
			.68611,
			0,
			0,
			.75555
		],
		77: [
			0,
			.68611,
			.11424,
			0,
			1.14201
		],
		78: [
			0,
			.68611,
			.11424,
			0,
			.95034
		],
		79: [
			0,
			.68611,
			.03194,
			0,
			.83666
		],
		80: [
			0,
			.68611,
			.15972,
			0,
			.72309
		],
		81: [
			.19444,
			.68611,
			0,
			0,
			.86861
		],
		82: [
			0,
			.68611,
			.00421,
			0,
			.87235
		],
		83: [
			0,
			.68611,
			.05382,
			0,
			.69271
		],
		84: [
			0,
			.68611,
			.15972,
			0,
			.63663
		],
		85: [
			0,
			.68611,
			.11424,
			0,
			.80027
		],
		86: [
			0,
			.68611,
			.25555,
			0,
			.67778
		],
		87: [
			0,
			.68611,
			.15972,
			0,
			1.09305
		],
		88: [
			0,
			.68611,
			.07778,
			0,
			.94722
		],
		89: [
			0,
			.68611,
			.25555,
			0,
			.67458
		],
		90: [
			0,
			.68611,
			.06979,
			0,
			.77257
		],
		97: [
			0,
			.44444,
			0,
			0,
			.63287
		],
		98: [
			0,
			.69444,
			0,
			0,
			.52083
		],
		99: [
			0,
			.44444,
			0,
			0,
			.51342
		],
		100: [
			0,
			.69444,
			0,
			0,
			.60972
		],
		101: [
			0,
			.44444,
			0,
			0,
			.55361
		],
		102: [
			.19444,
			.69444,
			.11042,
			0,
			.56806
		],
		103: [
			.19444,
			.44444,
			.03704,
			0,
			.5449
		],
		104: [
			0,
			.69444,
			0,
			0,
			.66759
		],
		105: [
			0,
			.69326,
			0,
			0,
			.4048
		],
		106: [
			.19444,
			.69326,
			.0622,
			0,
			.47083
		],
		107: [
			0,
			.69444,
			.01852,
			0,
			.6037
		],
		108: [
			0,
			.69444,
			.0088,
			0,
			.34815
		],
		109: [
			0,
			.44444,
			0,
			0,
			1.0324
		],
		110: [
			0,
			.44444,
			0,
			0,
			.71296
		],
		111: [
			0,
			.44444,
			0,
			0,
			.58472
		],
		112: [
			.19444,
			.44444,
			0,
			0,
			.60092
		],
		113: [
			.19444,
			.44444,
			.03704,
			0,
			.54213
		],
		114: [
			0,
			.44444,
			.03194,
			0,
			.5287
		],
		115: [
			0,
			.44444,
			0,
			0,
			.53125
		],
		116: [
			0,
			.63492,
			0,
			0,
			.41528
		],
		117: [
			0,
			.44444,
			0,
			0,
			.68102
		],
		118: [
			0,
			.44444,
			.03704,
			0,
			.56666
		],
		119: [
			0,
			.44444,
			.02778,
			0,
			.83148
		],
		120: [
			0,
			.44444,
			0,
			0,
			.65903
		],
		121: [
			.19444,
			.44444,
			.03704,
			0,
			.59028
		],
		122: [
			0,
			.44444,
			.04213,
			0,
			.55509
		],
		160: [
			0,
			0,
			0,
			0,
			.25
		],
		915: [
			0,
			.68611,
			.15972,
			0,
			.65694
		],
		916: [
			0,
			.68611,
			0,
			0,
			.95833
		],
		920: [
			0,
			.68611,
			.03194,
			0,
			.86722
		],
		923: [
			0,
			.68611,
			0,
			0,
			.80555
		],
		926: [
			0,
			.68611,
			.07458,
			0,
			.84125
		],
		928: [
			0,
			.68611,
			.08229,
			0,
			.98229
		],
		931: [
			0,
			.68611,
			.05451,
			0,
			.88507
		],
		933: [
			0,
			.68611,
			.15972,
			0,
			.67083
		],
		934: [
			0,
			.68611,
			0,
			0,
			.76666
		],
		936: [
			0,
			.68611,
			.11653,
			0,
			.71402
		],
		937: [
			0,
			.68611,
			.04835,
			0,
			.8789
		],
		945: [
			0,
			.44444,
			0,
			0,
			.76064
		],
		946: [
			.19444,
			.69444,
			.03403,
			0,
			.65972
		],
		947: [
			.19444,
			.44444,
			.06389,
			0,
			.59003
		],
		948: [
			0,
			.69444,
			.03819,
			0,
			.52222
		],
		949: [
			0,
			.44444,
			0,
			0,
			.52882
		],
		950: [
			.19444,
			.69444,
			.06215,
			0,
			.50833
		],
		951: [
			.19444,
			.44444,
			.03704,
			0,
			.6
		],
		952: [
			0,
			.69444,
			.03194,
			0,
			.5618
		],
		953: [
			0,
			.44444,
			0,
			0,
			.41204
		],
		954: [
			0,
			.44444,
			0,
			0,
			.66759
		],
		955: [
			0,
			.69444,
			0,
			0,
			.67083
		],
		956: [
			.19444,
			.44444,
			0,
			0,
			.70787
		],
		957: [
			0,
			.44444,
			.06898,
			0,
			.57685
		],
		958: [
			.19444,
			.69444,
			.03021,
			0,
			.50833
		],
		959: [
			0,
			.44444,
			0,
			0,
			.58472
		],
		960: [
			0,
			.44444,
			.03704,
			0,
			.68241
		],
		961: [
			.19444,
			.44444,
			0,
			0,
			.6118
		],
		962: [
			.09722,
			.44444,
			.07917,
			0,
			.42361
		],
		963: [
			0,
			.44444,
			.03704,
			0,
			.68588
		],
		964: [
			0,
			.44444,
			.13472,
			0,
			.52083
		],
		965: [
			0,
			.44444,
			.03704,
			0,
			.63055
		],
		966: [
			.19444,
			.44444,
			0,
			0,
			.74722
		],
		967: [
			.19444,
			.44444,
			0,
			0,
			.71805
		],
		968: [
			.19444,
			.69444,
			.03704,
			0,
			.75833
		],
		969: [
			0,
			.44444,
			.03704,
			0,
			.71782
		],
		977: [
			0,
			.69444,
			0,
			0,
			.69155
		],
		981: [
			.19444,
			.69444,
			0,
			0,
			.7125
		],
		982: [
			0,
			.44444,
			.03194,
			0,
			.975
		],
		1009: [
			.19444,
			.44444,
			0,
			0,
			.6118
		],
		1013: [
			0,
			.44444,
			0,
			0,
			.48333
		],
		57649: [
			0,
			.44444,
			0,
			0,
			.39352
		],
		57911: [
			.19444,
			.44444,
			0,
			0,
			.43889
		]
	},
	"Math-Italic": {
		32: [
			0,
			0,
			0,
			0,
			.25
		],
		48: [
			0,
			.43056,
			0,
			0,
			.5
		],
		49: [
			0,
			.43056,
			0,
			0,
			.5
		],
		50: [
			0,
			.43056,
			0,
			0,
			.5
		],
		51: [
			.19444,
			.43056,
			0,
			0,
			.5
		],
		52: [
			.19444,
			.43056,
			0,
			0,
			.5
		],
		53: [
			.19444,
			.43056,
			0,
			0,
			.5
		],
		54: [
			0,
			.64444,
			0,
			0,
			.5
		],
		55: [
			.19444,
			.43056,
			0,
			0,
			.5
		],
		56: [
			0,
			.64444,
			0,
			0,
			.5
		],
		57: [
			.19444,
			.43056,
			0,
			0,
			.5
		],
		65: [
			0,
			.68333,
			0,
			.13889,
			.75
		],
		66: [
			0,
			.68333,
			.05017,
			.08334,
			.75851
		],
		67: [
			0,
			.68333,
			.07153,
			.08334,
			.71472
		],
		68: [
			0,
			.68333,
			.02778,
			.05556,
			.82792
		],
		69: [
			0,
			.68333,
			.05764,
			.08334,
			.7382
		],
		70: [
			0,
			.68333,
			.13889,
			.08334,
			.64306
		],
		71: [
			0,
			.68333,
			0,
			.08334,
			.78625
		],
		72: [
			0,
			.68333,
			.08125,
			.05556,
			.83125
		],
		73: [
			0,
			.68333,
			.07847,
			.11111,
			.43958
		],
		74: [
			0,
			.68333,
			.09618,
			.16667,
			.55451
		],
		75: [
			0,
			.68333,
			.07153,
			.05556,
			.84931
		],
		76: [
			0,
			.68333,
			0,
			.02778,
			.68056
		],
		77: [
			0,
			.68333,
			.10903,
			.08334,
			.97014
		],
		78: [
			0,
			.68333,
			.10903,
			.08334,
			.80347
		],
		79: [
			0,
			.68333,
			.02778,
			.08334,
			.76278
		],
		80: [
			0,
			.68333,
			.13889,
			.08334,
			.64201
		],
		81: [
			.19444,
			.68333,
			0,
			.08334,
			.79056
		],
		82: [
			0,
			.68333,
			.00773,
			.08334,
			.75929
		],
		83: [
			0,
			.68333,
			.05764,
			.08334,
			.6132
		],
		84: [
			0,
			.68333,
			.13889,
			.08334,
			.58438
		],
		85: [
			0,
			.68333,
			.10903,
			.02778,
			.68278
		],
		86: [
			0,
			.68333,
			.22222,
			0,
			.58333
		],
		87: [
			0,
			.68333,
			.13889,
			0,
			.94445
		],
		88: [
			0,
			.68333,
			.07847,
			.08334,
			.82847
		],
		89: [
			0,
			.68333,
			.22222,
			0,
			.58056
		],
		90: [
			0,
			.68333,
			.07153,
			.08334,
			.68264
		],
		97: [
			0,
			.43056,
			0,
			0,
			.52859
		],
		98: [
			0,
			.69444,
			0,
			0,
			.42917
		],
		99: [
			0,
			.43056,
			0,
			.05556,
			.43276
		],
		100: [
			0,
			.69444,
			0,
			.16667,
			.52049
		],
		101: [
			0,
			.43056,
			0,
			.05556,
			.46563
		],
		102: [
			.19444,
			.69444,
			.10764,
			.16667,
			.48959
		],
		103: [
			.19444,
			.43056,
			.03588,
			.02778,
			.47697
		],
		104: [
			0,
			.69444,
			0,
			0,
			.57616
		],
		105: [
			0,
			.65952,
			0,
			0,
			.34451
		],
		106: [
			.19444,
			.65952,
			.05724,
			0,
			.41181
		],
		107: [
			0,
			.69444,
			.03148,
			0,
			.5206
		],
		108: [
			0,
			.69444,
			.01968,
			.08334,
			.29838
		],
		109: [
			0,
			.43056,
			0,
			0,
			.87801
		],
		110: [
			0,
			.43056,
			0,
			0,
			.60023
		],
		111: [
			0,
			.43056,
			0,
			.05556,
			.48472
		],
		112: [
			.19444,
			.43056,
			0,
			.08334,
			.50313
		],
		113: [
			.19444,
			.43056,
			.03588,
			.08334,
			.44641
		],
		114: [
			0,
			.43056,
			.02778,
			.05556,
			.45116
		],
		115: [
			0,
			.43056,
			0,
			.05556,
			.46875
		],
		116: [
			0,
			.61508,
			0,
			.08334,
			.36111
		],
		117: [
			0,
			.43056,
			0,
			.02778,
			.57246
		],
		118: [
			0,
			.43056,
			.03588,
			.02778,
			.48472
		],
		119: [
			0,
			.43056,
			.02691,
			.08334,
			.71592
		],
		120: [
			0,
			.43056,
			0,
			.02778,
			.57153
		],
		121: [
			.19444,
			.43056,
			.03588,
			.05556,
			.49028
		],
		122: [
			0,
			.43056,
			.04398,
			.05556,
			.46505
		],
		160: [
			0,
			0,
			0,
			0,
			.25
		],
		915: [
			0,
			.68333,
			.13889,
			.08334,
			.61528
		],
		916: [
			0,
			.68333,
			0,
			.16667,
			.83334
		],
		920: [
			0,
			.68333,
			.02778,
			.08334,
			.76278
		],
		923: [
			0,
			.68333,
			0,
			.16667,
			.69445
		],
		926: [
			0,
			.68333,
			.07569,
			.08334,
			.74236
		],
		928: [
			0,
			.68333,
			.08125,
			.05556,
			.83125
		],
		931: [
			0,
			.68333,
			.05764,
			.08334,
			.77986
		],
		933: [
			0,
			.68333,
			.13889,
			.05556,
			.58333
		],
		934: [
			0,
			.68333,
			0,
			.08334,
			.66667
		],
		936: [
			0,
			.68333,
			.11,
			.05556,
			.61222
		],
		937: [
			0,
			.68333,
			.05017,
			.08334,
			.7724
		],
		945: [
			0,
			.43056,
			.0037,
			.02778,
			.6397
		],
		946: [
			.19444,
			.69444,
			.05278,
			.08334,
			.56563
		],
		947: [
			.19444,
			.43056,
			.05556,
			0,
			.51773
		],
		948: [
			0,
			.69444,
			.03785,
			.05556,
			.44444
		],
		949: [
			0,
			.43056,
			0,
			.08334,
			.46632
		],
		950: [
			.19444,
			.69444,
			.07378,
			.08334,
			.4375
		],
		951: [
			.19444,
			.43056,
			.03588,
			.05556,
			.49653
		],
		952: [
			0,
			.69444,
			.02778,
			.08334,
			.46944
		],
		953: [
			0,
			.43056,
			0,
			.05556,
			.35394
		],
		954: [
			0,
			.43056,
			0,
			0,
			.57616
		],
		955: [
			0,
			.69444,
			0,
			0,
			.58334
		],
		956: [
			.19444,
			.43056,
			0,
			.02778,
			.60255
		],
		957: [
			0,
			.43056,
			.06366,
			.02778,
			.49398
		],
		958: [
			.19444,
			.69444,
			.04601,
			.11111,
			.4375
		],
		959: [
			0,
			.43056,
			0,
			.05556,
			.48472
		],
		960: [
			0,
			.43056,
			.03588,
			0,
			.57003
		],
		961: [
			.19444,
			.43056,
			0,
			.08334,
			.51702
		],
		962: [
			.09722,
			.43056,
			.07986,
			.08334,
			.36285
		],
		963: [
			0,
			.43056,
			.03588,
			0,
			.57141
		],
		964: [
			0,
			.43056,
			.1132,
			.02778,
			.43715
		],
		965: [
			0,
			.43056,
			.03588,
			.02778,
			.54028
		],
		966: [
			.19444,
			.43056,
			0,
			.08334,
			.65417
		],
		967: [
			.19444,
			.43056,
			0,
			.05556,
			.62569
		],
		968: [
			.19444,
			.69444,
			.03588,
			.11111,
			.65139
		],
		969: [
			0,
			.43056,
			.03588,
			0,
			.62245
		],
		977: [
			0,
			.69444,
			0,
			.08334,
			.59144
		],
		981: [
			.19444,
			.69444,
			0,
			.08334,
			.59583
		],
		982: [
			0,
			.43056,
			.02778,
			0,
			.82813
		],
		1009: [
			.19444,
			.43056,
			0,
			.08334,
			.51702
		],
		1013: [
			0,
			.43056,
			0,
			.05556,
			.4059
		],
		57649: [
			0,
			.43056,
			0,
			.02778,
			.32246
		],
		57911: [
			.19444,
			.43056,
			0,
			.08334,
			.38403
		]
	},
	"SansSerif-Bold": {
		32: [
			0,
			0,
			0,
			0,
			.25
		],
		33: [
			0,
			.69444,
			0,
			0,
			.36667
		],
		34: [
			0,
			.69444,
			0,
			0,
			.55834
		],
		35: [
			.19444,
			.69444,
			0,
			0,
			.91667
		],
		36: [
			.05556,
			.75,
			0,
			0,
			.55
		],
		37: [
			.05556,
			.75,
			0,
			0,
			1.02912
		],
		38: [
			0,
			.69444,
			0,
			0,
			.83056
		],
		39: [
			0,
			.69444,
			0,
			0,
			.30556
		],
		40: [
			.25,
			.75,
			0,
			0,
			.42778
		],
		41: [
			.25,
			.75,
			0,
			0,
			.42778
		],
		42: [
			0,
			.75,
			0,
			0,
			.55
		],
		43: [
			.11667,
			.61667,
			0,
			0,
			.85556
		],
		44: [
			.10556,
			.13056,
			0,
			0,
			.30556
		],
		45: [
			0,
			.45833,
			0,
			0,
			.36667
		],
		46: [
			0,
			.13056,
			0,
			0,
			.30556
		],
		47: [
			.25,
			.75,
			0,
			0,
			.55
		],
		48: [
			0,
			.69444,
			0,
			0,
			.55
		],
		49: [
			0,
			.69444,
			0,
			0,
			.55
		],
		50: [
			0,
			.69444,
			0,
			0,
			.55
		],
		51: [
			0,
			.69444,
			0,
			0,
			.55
		],
		52: [
			0,
			.69444,
			0,
			0,
			.55
		],
		53: [
			0,
			.69444,
			0,
			0,
			.55
		],
		54: [
			0,
			.69444,
			0,
			0,
			.55
		],
		55: [
			0,
			.69444,
			0,
			0,
			.55
		],
		56: [
			0,
			.69444,
			0,
			0,
			.55
		],
		57: [
			0,
			.69444,
			0,
			0,
			.55
		],
		58: [
			0,
			.45833,
			0,
			0,
			.30556
		],
		59: [
			.10556,
			.45833,
			0,
			0,
			.30556
		],
		61: [
			-.09375,
			.40625,
			0,
			0,
			.85556
		],
		63: [
			0,
			.69444,
			0,
			0,
			.51945
		],
		64: [
			0,
			.69444,
			0,
			0,
			.73334
		],
		65: [
			0,
			.69444,
			0,
			0,
			.73334
		],
		66: [
			0,
			.69444,
			0,
			0,
			.73334
		],
		67: [
			0,
			.69444,
			0,
			0,
			.70278
		],
		68: [
			0,
			.69444,
			0,
			0,
			.79445
		],
		69: [
			0,
			.69444,
			0,
			0,
			.64167
		],
		70: [
			0,
			.69444,
			0,
			0,
			.61111
		],
		71: [
			0,
			.69444,
			0,
			0,
			.73334
		],
		72: [
			0,
			.69444,
			0,
			0,
			.79445
		],
		73: [
			0,
			.69444,
			0,
			0,
			.33056
		],
		74: [
			0,
			.69444,
			0,
			0,
			.51945
		],
		75: [
			0,
			.69444,
			0,
			0,
			.76389
		],
		76: [
			0,
			.69444,
			0,
			0,
			.58056
		],
		77: [
			0,
			.69444,
			0,
			0,
			.97778
		],
		78: [
			0,
			.69444,
			0,
			0,
			.79445
		],
		79: [
			0,
			.69444,
			0,
			0,
			.79445
		],
		80: [
			0,
			.69444,
			0,
			0,
			.70278
		],
		81: [
			.10556,
			.69444,
			0,
			0,
			.79445
		],
		82: [
			0,
			.69444,
			0,
			0,
			.70278
		],
		83: [
			0,
			.69444,
			0,
			0,
			.61111
		],
		84: [
			0,
			.69444,
			0,
			0,
			.73334
		],
		85: [
			0,
			.69444,
			0,
			0,
			.76389
		],
		86: [
			0,
			.69444,
			.01528,
			0,
			.73334
		],
		87: [
			0,
			.69444,
			.01528,
			0,
			1.03889
		],
		88: [
			0,
			.69444,
			0,
			0,
			.73334
		],
		89: [
			0,
			.69444,
			.0275,
			0,
			.73334
		],
		90: [
			0,
			.69444,
			0,
			0,
			.67223
		],
		91: [
			.25,
			.75,
			0,
			0,
			.34306
		],
		93: [
			.25,
			.75,
			0,
			0,
			.34306
		],
		94: [
			0,
			.69444,
			0,
			0,
			.55
		],
		95: [
			.35,
			.10833,
			.03056,
			0,
			.55
		],
		97: [
			0,
			.45833,
			0,
			0,
			.525
		],
		98: [
			0,
			.69444,
			0,
			0,
			.56111
		],
		99: [
			0,
			.45833,
			0,
			0,
			.48889
		],
		100: [
			0,
			.69444,
			0,
			0,
			.56111
		],
		101: [
			0,
			.45833,
			0,
			0,
			.51111
		],
		102: [
			0,
			.69444,
			.07639,
			0,
			.33611
		],
		103: [
			.19444,
			.45833,
			.01528,
			0,
			.55
		],
		104: [
			0,
			.69444,
			0,
			0,
			.56111
		],
		105: [
			0,
			.69444,
			0,
			0,
			.25556
		],
		106: [
			.19444,
			.69444,
			0,
			0,
			.28611
		],
		107: [
			0,
			.69444,
			0,
			0,
			.53056
		],
		108: [
			0,
			.69444,
			0,
			0,
			.25556
		],
		109: [
			0,
			.45833,
			0,
			0,
			.86667
		],
		110: [
			0,
			.45833,
			0,
			0,
			.56111
		],
		111: [
			0,
			.45833,
			0,
			0,
			.55
		],
		112: [
			.19444,
			.45833,
			0,
			0,
			.56111
		],
		113: [
			.19444,
			.45833,
			0,
			0,
			.56111
		],
		114: [
			0,
			.45833,
			.01528,
			0,
			.37222
		],
		115: [
			0,
			.45833,
			0,
			0,
			.42167
		],
		116: [
			0,
			.58929,
			0,
			0,
			.40417
		],
		117: [
			0,
			.45833,
			0,
			0,
			.56111
		],
		118: [
			0,
			.45833,
			.01528,
			0,
			.5
		],
		119: [
			0,
			.45833,
			.01528,
			0,
			.74445
		],
		120: [
			0,
			.45833,
			0,
			0,
			.5
		],
		121: [
			.19444,
			.45833,
			.01528,
			0,
			.5
		],
		122: [
			0,
			.45833,
			0,
			0,
			.47639
		],
		126: [
			.35,
			.34444,
			0,
			0,
			.55
		],
		160: [
			0,
			0,
			0,
			0,
			.25
		],
		168: [
			0,
			.69444,
			0,
			0,
			.55
		],
		176: [
			0,
			.69444,
			0,
			0,
			.73334
		],
		180: [
			0,
			.69444,
			0,
			0,
			.55
		],
		184: [
			.17014,
			0,
			0,
			0,
			.48889
		],
		305: [
			0,
			.45833,
			0,
			0,
			.25556
		],
		567: [
			.19444,
			.45833,
			0,
			0,
			.28611
		],
		710: [
			0,
			.69444,
			0,
			0,
			.55
		],
		711: [
			0,
			.63542,
			0,
			0,
			.55
		],
		713: [
			0,
			.63778,
			0,
			0,
			.55
		],
		728: [
			0,
			.69444,
			0,
			0,
			.55
		],
		729: [
			0,
			.69444,
			0,
			0,
			.30556
		],
		730: [
			0,
			.69444,
			0,
			0,
			.73334
		],
		732: [
			0,
			.69444,
			0,
			0,
			.55
		],
		733: [
			0,
			.69444,
			0,
			0,
			.55
		],
		915: [
			0,
			.69444,
			0,
			0,
			.58056
		],
		916: [
			0,
			.69444,
			0,
			0,
			.91667
		],
		920: [
			0,
			.69444,
			0,
			0,
			.85556
		],
		923: [
			0,
			.69444,
			0,
			0,
			.67223
		],
		926: [
			0,
			.69444,
			0,
			0,
			.73334
		],
		928: [
			0,
			.69444,
			0,
			0,
			.79445
		],
		931: [
			0,
			.69444,
			0,
			0,
			.79445
		],
		933: [
			0,
			.69444,
			0,
			0,
			.85556
		],
		934: [
			0,
			.69444,
			0,
			0,
			.79445
		],
		936: [
			0,
			.69444,
			0,
			0,
			.85556
		],
		937: [
			0,
			.69444,
			0,
			0,
			.79445
		],
		8211: [
			0,
			.45833,
			.03056,
			0,
			.55
		],
		8212: [
			0,
			.45833,
			.03056,
			0,
			1.10001
		],
		8216: [
			0,
			.69444,
			0,
			0,
			.30556
		],
		8217: [
			0,
			.69444,
			0,
			0,
			.30556
		],
		8220: [
			0,
			.69444,
			0,
			0,
			.55834
		],
		8221: [
			0,
			.69444,
			0,
			0,
			.55834
		]
	},
	"SansSerif-Italic": {
		32: [
			0,
			0,
			0,
			0,
			.25
		],
		33: [
			0,
			.69444,
			.05733,
			0,
			.31945
		],
		34: [
			0,
			.69444,
			.00316,
			0,
			.5
		],
		35: [
			.19444,
			.69444,
			.05087,
			0,
			.83334
		],
		36: [
			.05556,
			.75,
			.11156,
			0,
			.5
		],
		37: [
			.05556,
			.75,
			.03126,
			0,
			.83334
		],
		38: [
			0,
			.69444,
			.03058,
			0,
			.75834
		],
		39: [
			0,
			.69444,
			.07816,
			0,
			.27778
		],
		40: [
			.25,
			.75,
			.13164,
			0,
			.38889
		],
		41: [
			.25,
			.75,
			.02536,
			0,
			.38889
		],
		42: [
			0,
			.75,
			.11775,
			0,
			.5
		],
		43: [
			.08333,
			.58333,
			.02536,
			0,
			.77778
		],
		44: [
			.125,
			.08333,
			0,
			0,
			.27778
		],
		45: [
			0,
			.44444,
			.01946,
			0,
			.33333
		],
		46: [
			0,
			.08333,
			0,
			0,
			.27778
		],
		47: [
			.25,
			.75,
			.13164,
			0,
			.5
		],
		48: [
			0,
			.65556,
			.11156,
			0,
			.5
		],
		49: [
			0,
			.65556,
			.11156,
			0,
			.5
		],
		50: [
			0,
			.65556,
			.11156,
			0,
			.5
		],
		51: [
			0,
			.65556,
			.11156,
			0,
			.5
		],
		52: [
			0,
			.65556,
			.11156,
			0,
			.5
		],
		53: [
			0,
			.65556,
			.11156,
			0,
			.5
		],
		54: [
			0,
			.65556,
			.11156,
			0,
			.5
		],
		55: [
			0,
			.65556,
			.11156,
			0,
			.5
		],
		56: [
			0,
			.65556,
			.11156,
			0,
			.5
		],
		57: [
			0,
			.65556,
			.11156,
			0,
			.5
		],
		58: [
			0,
			.44444,
			.02502,
			0,
			.27778
		],
		59: [
			.125,
			.44444,
			.02502,
			0,
			.27778
		],
		61: [
			-.13,
			.37,
			.05087,
			0,
			.77778
		],
		63: [
			0,
			.69444,
			.11809,
			0,
			.47222
		],
		64: [
			0,
			.69444,
			.07555,
			0,
			.66667
		],
		65: [
			0,
			.69444,
			0,
			0,
			.66667
		],
		66: [
			0,
			.69444,
			.08293,
			0,
			.66667
		],
		67: [
			0,
			.69444,
			.11983,
			0,
			.63889
		],
		68: [
			0,
			.69444,
			.07555,
			0,
			.72223
		],
		69: [
			0,
			.69444,
			.11983,
			0,
			.59722
		],
		70: [
			0,
			.69444,
			.13372,
			0,
			.56945
		],
		71: [
			0,
			.69444,
			.11983,
			0,
			.66667
		],
		72: [
			0,
			.69444,
			.08094,
			0,
			.70834
		],
		73: [
			0,
			.69444,
			.13372,
			0,
			.27778
		],
		74: [
			0,
			.69444,
			.08094,
			0,
			.47222
		],
		75: [
			0,
			.69444,
			.11983,
			0,
			.69445
		],
		76: [
			0,
			.69444,
			0,
			0,
			.54167
		],
		77: [
			0,
			.69444,
			.08094,
			0,
			.875
		],
		78: [
			0,
			.69444,
			.08094,
			0,
			.70834
		],
		79: [
			0,
			.69444,
			.07555,
			0,
			.73611
		],
		80: [
			0,
			.69444,
			.08293,
			0,
			.63889
		],
		81: [
			.125,
			.69444,
			.07555,
			0,
			.73611
		],
		82: [
			0,
			.69444,
			.08293,
			0,
			.64584
		],
		83: [
			0,
			.69444,
			.09205,
			0,
			.55556
		],
		84: [
			0,
			.69444,
			.13372,
			0,
			.68056
		],
		85: [
			0,
			.69444,
			.08094,
			0,
			.6875
		],
		86: [
			0,
			.69444,
			.1615,
			0,
			.66667
		],
		87: [
			0,
			.69444,
			.1615,
			0,
			.94445
		],
		88: [
			0,
			.69444,
			.13372,
			0,
			.66667
		],
		89: [
			0,
			.69444,
			.17261,
			0,
			.66667
		],
		90: [
			0,
			.69444,
			.11983,
			0,
			.61111
		],
		91: [
			.25,
			.75,
			.15942,
			0,
			.28889
		],
		93: [
			.25,
			.75,
			.08719,
			0,
			.28889
		],
		94: [
			0,
			.69444,
			.0799,
			0,
			.5
		],
		95: [
			.35,
			.09444,
			.08616,
			0,
			.5
		],
		97: [
			0,
			.44444,
			.00981,
			0,
			.48056
		],
		98: [
			0,
			.69444,
			.03057,
			0,
			.51667
		],
		99: [
			0,
			.44444,
			.08336,
			0,
			.44445
		],
		100: [
			0,
			.69444,
			.09483,
			0,
			.51667
		],
		101: [
			0,
			.44444,
			.06778,
			0,
			.44445
		],
		102: [
			0,
			.69444,
			.21705,
			0,
			.30556
		],
		103: [
			.19444,
			.44444,
			.10836,
			0,
			.5
		],
		104: [
			0,
			.69444,
			.01778,
			0,
			.51667
		],
		105: [
			0,
			.67937,
			.09718,
			0,
			.23889
		],
		106: [
			.19444,
			.67937,
			.09162,
			0,
			.26667
		],
		107: [
			0,
			.69444,
			.08336,
			0,
			.48889
		],
		108: [
			0,
			.69444,
			.09483,
			0,
			.23889
		],
		109: [
			0,
			.44444,
			.01778,
			0,
			.79445
		],
		110: [
			0,
			.44444,
			.01778,
			0,
			.51667
		],
		111: [
			0,
			.44444,
			.06613,
			0,
			.5
		],
		112: [
			.19444,
			.44444,
			.0389,
			0,
			.51667
		],
		113: [
			.19444,
			.44444,
			.04169,
			0,
			.51667
		],
		114: [
			0,
			.44444,
			.10836,
			0,
			.34167
		],
		115: [
			0,
			.44444,
			.0778,
			0,
			.38333
		],
		116: [
			0,
			.57143,
			.07225,
			0,
			.36111
		],
		117: [
			0,
			.44444,
			.04169,
			0,
			.51667
		],
		118: [
			0,
			.44444,
			.10836,
			0,
			.46111
		],
		119: [
			0,
			.44444,
			.10836,
			0,
			.68334
		],
		120: [
			0,
			.44444,
			.09169,
			0,
			.46111
		],
		121: [
			.19444,
			.44444,
			.10836,
			0,
			.46111
		],
		122: [
			0,
			.44444,
			.08752,
			0,
			.43472
		],
		126: [
			.35,
			.32659,
			.08826,
			0,
			.5
		],
		160: [
			0,
			0,
			0,
			0,
			.25
		],
		168: [
			0,
			.67937,
			.06385,
			0,
			.5
		],
		176: [
			0,
			.69444,
			0,
			0,
			.73752
		],
		184: [
			.17014,
			0,
			0,
			0,
			.44445
		],
		305: [
			0,
			.44444,
			.04169,
			0,
			.23889
		],
		567: [
			.19444,
			.44444,
			.04169,
			0,
			.26667
		],
		710: [
			0,
			.69444,
			.0799,
			0,
			.5
		],
		711: [
			0,
			.63194,
			.08432,
			0,
			.5
		],
		713: [
			0,
			.60889,
			.08776,
			0,
			.5
		],
		714: [
			0,
			.69444,
			.09205,
			0,
			.5
		],
		715: [
			0,
			.69444,
			0,
			0,
			.5
		],
		728: [
			0,
			.69444,
			.09483,
			0,
			.5
		],
		729: [
			0,
			.67937,
			.07774,
			0,
			.27778
		],
		730: [
			0,
			.69444,
			0,
			0,
			.73752
		],
		732: [
			0,
			.67659,
			.08826,
			0,
			.5
		],
		733: [
			0,
			.69444,
			.09205,
			0,
			.5
		],
		915: [
			0,
			.69444,
			.13372,
			0,
			.54167
		],
		916: [
			0,
			.69444,
			0,
			0,
			.83334
		],
		920: [
			0,
			.69444,
			.07555,
			0,
			.77778
		],
		923: [
			0,
			.69444,
			0,
			0,
			.61111
		],
		926: [
			0,
			.69444,
			.12816,
			0,
			.66667
		],
		928: [
			0,
			.69444,
			.08094,
			0,
			.70834
		],
		931: [
			0,
			.69444,
			.11983,
			0,
			.72222
		],
		933: [
			0,
			.69444,
			.09031,
			0,
			.77778
		],
		934: [
			0,
			.69444,
			.04603,
			0,
			.72222
		],
		936: [
			0,
			.69444,
			.09031,
			0,
			.77778
		],
		937: [
			0,
			.69444,
			.08293,
			0,
			.72222
		],
		8211: [
			0,
			.44444,
			.08616,
			0,
			.5
		],
		8212: [
			0,
			.44444,
			.08616,
			0,
			1
		],
		8216: [
			0,
			.69444,
			.07816,
			0,
			.27778
		],
		8217: [
			0,
			.69444,
			.07816,
			0,
			.27778
		],
		8220: [
			0,
			.69444,
			.14205,
			0,
			.5
		],
		8221: [
			0,
			.69444,
			.00316,
			0,
			.5
		]
	},
	"SansSerif-Regular": {
		32: [
			0,
			0,
			0,
			0,
			.25
		],
		33: [
			0,
			.69444,
			0,
			0,
			.31945
		],
		34: [
			0,
			.69444,
			0,
			0,
			.5
		],
		35: [
			.19444,
			.69444,
			0,
			0,
			.83334
		],
		36: [
			.05556,
			.75,
			0,
			0,
			.5
		],
		37: [
			.05556,
			.75,
			0,
			0,
			.83334
		],
		38: [
			0,
			.69444,
			0,
			0,
			.75834
		],
		39: [
			0,
			.69444,
			0,
			0,
			.27778
		],
		40: [
			.25,
			.75,
			0,
			0,
			.38889
		],
		41: [
			.25,
			.75,
			0,
			0,
			.38889
		],
		42: [
			0,
			.75,
			0,
			0,
			.5
		],
		43: [
			.08333,
			.58333,
			0,
			0,
			.77778
		],
		44: [
			.125,
			.08333,
			0,
			0,
			.27778
		],
		45: [
			0,
			.44444,
			0,
			0,
			.33333
		],
		46: [
			0,
			.08333,
			0,
			0,
			.27778
		],
		47: [
			.25,
			.75,
			0,
			0,
			.5
		],
		48: [
			0,
			.65556,
			0,
			0,
			.5
		],
		49: [
			0,
			.65556,
			0,
			0,
			.5
		],
		50: [
			0,
			.65556,
			0,
			0,
			.5
		],
		51: [
			0,
			.65556,
			0,
			0,
			.5
		],
		52: [
			0,
			.65556,
			0,
			0,
			.5
		],
		53: [
			0,
			.65556,
			0,
			0,
			.5
		],
		54: [
			0,
			.65556,
			0,
			0,
			.5
		],
		55: [
			0,
			.65556,
			0,
			0,
			.5
		],
		56: [
			0,
			.65556,
			0,
			0,
			.5
		],
		57: [
			0,
			.65556,
			0,
			0,
			.5
		],
		58: [
			0,
			.44444,
			0,
			0,
			.27778
		],
		59: [
			.125,
			.44444,
			0,
			0,
			.27778
		],
		61: [
			-.13,
			.37,
			0,
			0,
			.77778
		],
		63: [
			0,
			.69444,
			0,
			0,
			.47222
		],
		64: [
			0,
			.69444,
			0,
			0,
			.66667
		],
		65: [
			0,
			.69444,
			0,
			0,
			.66667
		],
		66: [
			0,
			.69444,
			0,
			0,
			.66667
		],
		67: [
			0,
			.69444,
			0,
			0,
			.63889
		],
		68: [
			0,
			.69444,
			0,
			0,
			.72223
		],
		69: [
			0,
			.69444,
			0,
			0,
			.59722
		],
		70: [
			0,
			.69444,
			0,
			0,
			.56945
		],
		71: [
			0,
			.69444,
			0,
			0,
			.66667
		],
		72: [
			0,
			.69444,
			0,
			0,
			.70834
		],
		73: [
			0,
			.69444,
			0,
			0,
			.27778
		],
		74: [
			0,
			.69444,
			0,
			0,
			.47222
		],
		75: [
			0,
			.69444,
			0,
			0,
			.69445
		],
		76: [
			0,
			.69444,
			0,
			0,
			.54167
		],
		77: [
			0,
			.69444,
			0,
			0,
			.875
		],
		78: [
			0,
			.69444,
			0,
			0,
			.70834
		],
		79: [
			0,
			.69444,
			0,
			0,
			.73611
		],
		80: [
			0,
			.69444,
			0,
			0,
			.63889
		],
		81: [
			.125,
			.69444,
			0,
			0,
			.73611
		],
		82: [
			0,
			.69444,
			0,
			0,
			.64584
		],
		83: [
			0,
			.69444,
			0,
			0,
			.55556
		],
		84: [
			0,
			.69444,
			0,
			0,
			.68056
		],
		85: [
			0,
			.69444,
			0,
			0,
			.6875
		],
		86: [
			0,
			.69444,
			.01389,
			0,
			.66667
		],
		87: [
			0,
			.69444,
			.01389,
			0,
			.94445
		],
		88: [
			0,
			.69444,
			0,
			0,
			.66667
		],
		89: [
			0,
			.69444,
			.025,
			0,
			.66667
		],
		90: [
			0,
			.69444,
			0,
			0,
			.61111
		],
		91: [
			.25,
			.75,
			0,
			0,
			.28889
		],
		93: [
			.25,
			.75,
			0,
			0,
			.28889
		],
		94: [
			0,
			.69444,
			0,
			0,
			.5
		],
		95: [
			.35,
			.09444,
			.02778,
			0,
			.5
		],
		97: [
			0,
			.44444,
			0,
			0,
			.48056
		],
		98: [
			0,
			.69444,
			0,
			0,
			.51667
		],
		99: [
			0,
			.44444,
			0,
			0,
			.44445
		],
		100: [
			0,
			.69444,
			0,
			0,
			.51667
		],
		101: [
			0,
			.44444,
			0,
			0,
			.44445
		],
		102: [
			0,
			.69444,
			.06944,
			0,
			.30556
		],
		103: [
			.19444,
			.44444,
			.01389,
			0,
			.5
		],
		104: [
			0,
			.69444,
			0,
			0,
			.51667
		],
		105: [
			0,
			.67937,
			0,
			0,
			.23889
		],
		106: [
			.19444,
			.67937,
			0,
			0,
			.26667
		],
		107: [
			0,
			.69444,
			0,
			0,
			.48889
		],
		108: [
			0,
			.69444,
			0,
			0,
			.23889
		],
		109: [
			0,
			.44444,
			0,
			0,
			.79445
		],
		110: [
			0,
			.44444,
			0,
			0,
			.51667
		],
		111: [
			0,
			.44444,
			0,
			0,
			.5
		],
		112: [
			.19444,
			.44444,
			0,
			0,
			.51667
		],
		113: [
			.19444,
			.44444,
			0,
			0,
			.51667
		],
		114: [
			0,
			.44444,
			.01389,
			0,
			.34167
		],
		115: [
			0,
			.44444,
			0,
			0,
			.38333
		],
		116: [
			0,
			.57143,
			0,
			0,
			.36111
		],
		117: [
			0,
			.44444,
			0,
			0,
			.51667
		],
		118: [
			0,
			.44444,
			.01389,
			0,
			.46111
		],
		119: [
			0,
			.44444,
			.01389,
			0,
			.68334
		],
		120: [
			0,
			.44444,
			0,
			0,
			.46111
		],
		121: [
			.19444,
			.44444,
			.01389,
			0,
			.46111
		],
		122: [
			0,
			.44444,
			0,
			0,
			.43472
		],
		126: [
			.35,
			.32659,
			0,
			0,
			.5
		],
		160: [
			0,
			0,
			0,
			0,
			.25
		],
		168: [
			0,
			.67937,
			0,
			0,
			.5
		],
		176: [
			0,
			.69444,
			0,
			0,
			.66667
		],
		184: [
			.17014,
			0,
			0,
			0,
			.44445
		],
		305: [
			0,
			.44444,
			0,
			0,
			.23889
		],
		567: [
			.19444,
			.44444,
			0,
			0,
			.26667
		],
		710: [
			0,
			.69444,
			0,
			0,
			.5
		],
		711: [
			0,
			.63194,
			0,
			0,
			.5
		],
		713: [
			0,
			.60889,
			0,
			0,
			.5
		],
		714: [
			0,
			.69444,
			0,
			0,
			.5
		],
		715: [
			0,
			.69444,
			0,
			0,
			.5
		],
		728: [
			0,
			.69444,
			0,
			0,
			.5
		],
		729: [
			0,
			.67937,
			0,
			0,
			.27778
		],
		730: [
			0,
			.69444,
			0,
			0,
			.66667
		],
		732: [
			0,
			.67659,
			0,
			0,
			.5
		],
		733: [
			0,
			.69444,
			0,
			0,
			.5
		],
		915: [
			0,
			.69444,
			0,
			0,
			.54167
		],
		916: [
			0,
			.69444,
			0,
			0,
			.83334
		],
		920: [
			0,
			.69444,
			0,
			0,
			.77778
		],
		923: [
			0,
			.69444,
			0,
			0,
			.61111
		],
		926: [
			0,
			.69444,
			0,
			0,
			.66667
		],
		928: [
			0,
			.69444,
			0,
			0,
			.70834
		],
		931: [
			0,
			.69444,
			0,
			0,
			.72222
		],
		933: [
			0,
			.69444,
			0,
			0,
			.77778
		],
		934: [
			0,
			.69444,
			0,
			0,
			.72222
		],
		936: [
			0,
			.69444,
			0,
			0,
			.77778
		],
		937: [
			0,
			.69444,
			0,
			0,
			.72222
		],
		8211: [
			0,
			.44444,
			.02778,
			0,
			.5
		],
		8212: [
			0,
			.44444,
			.02778,
			0,
			1
		],
		8216: [
			0,
			.69444,
			0,
			0,
			.27778
		],
		8217: [
			0,
			.69444,
			0,
			0,
			.27778
		],
		8220: [
			0,
			.69444,
			0,
			0,
			.5
		],
		8221: [
			0,
			.69444,
			0,
			0,
			.5
		]
	},
	"Script-Regular": {
		32: [
			0,
			0,
			0,
			0,
			.25
		],
		65: [
			0,
			.7,
			.22925,
			0,
			.80253
		],
		66: [
			0,
			.7,
			.04087,
			0,
			.90757
		],
		67: [
			0,
			.7,
			.1689,
			0,
			.66619
		],
		68: [
			0,
			.7,
			.09371,
			0,
			.77443
		],
		69: [
			0,
			.7,
			.18583,
			0,
			.56162
		],
		70: [
			0,
			.7,
			.13634,
			0,
			.89544
		],
		71: [
			0,
			.7,
			.17322,
			0,
			.60961
		],
		72: [
			0,
			.7,
			.29694,
			0,
			.96919
		],
		73: [
			0,
			.7,
			.19189,
			0,
			.80907
		],
		74: [
			.27778,
			.7,
			.19189,
			0,
			1.05159
		],
		75: [
			0,
			.7,
			.31259,
			0,
			.91364
		],
		76: [
			0,
			.7,
			.19189,
			0,
			.87373
		],
		77: [
			0,
			.7,
			.15981,
			0,
			1.08031
		],
		78: [
			0,
			.7,
			.3525,
			0,
			.9015
		],
		79: [
			0,
			.7,
			.08078,
			0,
			.73787
		],
		80: [
			0,
			.7,
			.08078,
			0,
			1.01262
		],
		81: [
			0,
			.7,
			.03305,
			0,
			.88282
		],
		82: [
			0,
			.7,
			.06259,
			0,
			.85
		],
		83: [
			0,
			.7,
			.19189,
			0,
			.86767
		],
		84: [
			0,
			.7,
			.29087,
			0,
			.74697
		],
		85: [
			0,
			.7,
			.25815,
			0,
			.79996
		],
		86: [
			0,
			.7,
			.27523,
			0,
			.62204
		],
		87: [
			0,
			.7,
			.27523,
			0,
			.80532
		],
		88: [
			0,
			.7,
			.26006,
			0,
			.94445
		],
		89: [
			0,
			.7,
			.2939,
			0,
			.70961
		],
		90: [
			0,
			.7,
			.24037,
			0,
			.8212
		],
		160: [
			0,
			0,
			0,
			0,
			.25
		]
	},
	"Size1-Regular": {
		32: [
			0,
			0,
			0,
			0,
			.25
		],
		40: [
			.35001,
			.85,
			0,
			0,
			.45834
		],
		41: [
			.35001,
			.85,
			0,
			0,
			.45834
		],
		47: [
			.35001,
			.85,
			0,
			0,
			.57778
		],
		91: [
			.35001,
			.85,
			0,
			0,
			.41667
		],
		92: [
			.35001,
			.85,
			0,
			0,
			.57778
		],
		93: [
			.35001,
			.85,
			0,
			0,
			.41667
		],
		123: [
			.35001,
			.85,
			0,
			0,
			.58334
		],
		125: [
			.35001,
			.85,
			0,
			0,
			.58334
		],
		160: [
			0,
			0,
			0,
			0,
			.25
		],
		710: [
			0,
			.72222,
			0,
			0,
			.55556
		],
		732: [
			0,
			.72222,
			0,
			0,
			.55556
		],
		770: [
			0,
			.72222,
			0,
			0,
			.55556
		],
		771: [
			0,
			.72222,
			0,
			0,
			.55556
		],
		8214: [
			-99e-5,
			.601,
			0,
			0,
			.77778
		],
		8593: [
			1e-5,
			.6,
			0,
			0,
			.66667
		],
		8595: [
			1e-5,
			.6,
			0,
			0,
			.66667
		],
		8657: [
			1e-5,
			.6,
			0,
			0,
			.77778
		],
		8659: [
			1e-5,
			.6,
			0,
			0,
			.77778
		],
		8719: [
			.25001,
			.75,
			0,
			0,
			.94445
		],
		8720: [
			.25001,
			.75,
			0,
			0,
			.94445
		],
		8721: [
			.25001,
			.75,
			0,
			0,
			1.05556
		],
		8730: [
			.35001,
			.85,
			0,
			0,
			1
		],
		8739: [
			-.00599,
			.606,
			0,
			0,
			.33333
		],
		8741: [
			-.00599,
			.606,
			0,
			0,
			.55556
		],
		8747: [
			.30612,
			.805,
			.19445,
			0,
			.47222
		],
		8748: [
			.306,
			.805,
			.19445,
			0,
			.47222
		],
		8749: [
			.306,
			.805,
			.19445,
			0,
			.47222
		],
		8750: [
			.30612,
			.805,
			.19445,
			0,
			.47222
		],
		8896: [
			.25001,
			.75,
			0,
			0,
			.83334
		],
		8897: [
			.25001,
			.75,
			0,
			0,
			.83334
		],
		8898: [
			.25001,
			.75,
			0,
			0,
			.83334
		],
		8899: [
			.25001,
			.75,
			0,
			0,
			.83334
		],
		8968: [
			.35001,
			.85,
			0,
			0,
			.47222
		],
		8969: [
			.35001,
			.85,
			0,
			0,
			.47222
		],
		8970: [
			.35001,
			.85,
			0,
			0,
			.47222
		],
		8971: [
			.35001,
			.85,
			0,
			0,
			.47222
		],
		9168: [
			-99e-5,
			.601,
			0,
			0,
			.66667
		],
		10216: [
			.35001,
			.85,
			0,
			0,
			.47222
		],
		10217: [
			.35001,
			.85,
			0,
			0,
			.47222
		],
		10752: [
			.25001,
			.75,
			0,
			0,
			1.11111
		],
		10753: [
			.25001,
			.75,
			0,
			0,
			1.11111
		],
		10754: [
			.25001,
			.75,
			0,
			0,
			1.11111
		],
		10756: [
			.25001,
			.75,
			0,
			0,
			.83334
		],
		10758: [
			.25001,
			.75,
			0,
			0,
			.83334
		]
	},
	"Size2-Regular": {
		32: [
			0,
			0,
			0,
			0,
			.25
		],
		40: [
			.65002,
			1.15,
			0,
			0,
			.59722
		],
		41: [
			.65002,
			1.15,
			0,
			0,
			.59722
		],
		47: [
			.65002,
			1.15,
			0,
			0,
			.81111
		],
		91: [
			.65002,
			1.15,
			0,
			0,
			.47222
		],
		92: [
			.65002,
			1.15,
			0,
			0,
			.81111
		],
		93: [
			.65002,
			1.15,
			0,
			0,
			.47222
		],
		123: [
			.65002,
			1.15,
			0,
			0,
			.66667
		],
		125: [
			.65002,
			1.15,
			0,
			0,
			.66667
		],
		160: [
			0,
			0,
			0,
			0,
			.25
		],
		710: [
			0,
			.75,
			0,
			0,
			1
		],
		732: [
			0,
			.75,
			0,
			0,
			1
		],
		770: [
			0,
			.75,
			0,
			0,
			1
		],
		771: [
			0,
			.75,
			0,
			0,
			1
		],
		8719: [
			.55001,
			1.05,
			0,
			0,
			1.27778
		],
		8720: [
			.55001,
			1.05,
			0,
			0,
			1.27778
		],
		8721: [
			.55001,
			1.05,
			0,
			0,
			1.44445
		],
		8730: [
			.65002,
			1.15,
			0,
			0,
			1
		],
		8747: [
			.86225,
			1.36,
			.44445,
			0,
			.55556
		],
		8748: [
			.862,
			1.36,
			.44445,
			0,
			.55556
		],
		8749: [
			.862,
			1.36,
			.44445,
			0,
			.55556
		],
		8750: [
			.86225,
			1.36,
			.44445,
			0,
			.55556
		],
		8896: [
			.55001,
			1.05,
			0,
			0,
			1.11111
		],
		8897: [
			.55001,
			1.05,
			0,
			0,
			1.11111
		],
		8898: [
			.55001,
			1.05,
			0,
			0,
			1.11111
		],
		8899: [
			.55001,
			1.05,
			0,
			0,
			1.11111
		],
		8968: [
			.65002,
			1.15,
			0,
			0,
			.52778
		],
		8969: [
			.65002,
			1.15,
			0,
			0,
			.52778
		],
		8970: [
			.65002,
			1.15,
			0,
			0,
			.52778
		],
		8971: [
			.65002,
			1.15,
			0,
			0,
			.52778
		],
		10216: [
			.65002,
			1.15,
			0,
			0,
			.61111
		],
		10217: [
			.65002,
			1.15,
			0,
			0,
			.61111
		],
		10752: [
			.55001,
			1.05,
			0,
			0,
			1.51112
		],
		10753: [
			.55001,
			1.05,
			0,
			0,
			1.51112
		],
		10754: [
			.55001,
			1.05,
			0,
			0,
			1.51112
		],
		10756: [
			.55001,
			1.05,
			0,
			0,
			1.11111
		],
		10758: [
			.55001,
			1.05,
			0,
			0,
			1.11111
		]
	},
	"Size3-Regular": {
		32: [
			0,
			0,
			0,
			0,
			.25
		],
		40: [
			.95003,
			1.45,
			0,
			0,
			.73611
		],
		41: [
			.95003,
			1.45,
			0,
			0,
			.73611
		],
		47: [
			.95003,
			1.45,
			0,
			0,
			1.04445
		],
		91: [
			.95003,
			1.45,
			0,
			0,
			.52778
		],
		92: [
			.95003,
			1.45,
			0,
			0,
			1.04445
		],
		93: [
			.95003,
			1.45,
			0,
			0,
			.52778
		],
		123: [
			.95003,
			1.45,
			0,
			0,
			.75
		],
		125: [
			.95003,
			1.45,
			0,
			0,
			.75
		],
		160: [
			0,
			0,
			0,
			0,
			.25
		],
		710: [
			0,
			.75,
			0,
			0,
			1.44445
		],
		732: [
			0,
			.75,
			0,
			0,
			1.44445
		],
		770: [
			0,
			.75,
			0,
			0,
			1.44445
		],
		771: [
			0,
			.75,
			0,
			0,
			1.44445
		],
		8730: [
			.95003,
			1.45,
			0,
			0,
			1
		],
		8968: [
			.95003,
			1.45,
			0,
			0,
			.58334
		],
		8969: [
			.95003,
			1.45,
			0,
			0,
			.58334
		],
		8970: [
			.95003,
			1.45,
			0,
			0,
			.58334
		],
		8971: [
			.95003,
			1.45,
			0,
			0,
			.58334
		],
		10216: [
			.95003,
			1.45,
			0,
			0,
			.75
		],
		10217: [
			.95003,
			1.45,
			0,
			0,
			.75
		]
	},
	"Size4-Regular": {
		32: [
			0,
			0,
			0,
			0,
			.25
		],
		40: [
			1.25003,
			1.75,
			0,
			0,
			.79167
		],
		41: [
			1.25003,
			1.75,
			0,
			0,
			.79167
		],
		47: [
			1.25003,
			1.75,
			0,
			0,
			1.27778
		],
		91: [
			1.25003,
			1.75,
			0,
			0,
			.58334
		],
		92: [
			1.25003,
			1.75,
			0,
			0,
			1.27778
		],
		93: [
			1.25003,
			1.75,
			0,
			0,
			.58334
		],
		123: [
			1.25003,
			1.75,
			0,
			0,
			.80556
		],
		125: [
			1.25003,
			1.75,
			0,
			0,
			.80556
		],
		160: [
			0,
			0,
			0,
			0,
			.25
		],
		710: [
			0,
			.825,
			0,
			0,
			1.8889
		],
		732: [
			0,
			.825,
			0,
			0,
			1.8889
		],
		770: [
			0,
			.825,
			0,
			0,
			1.8889
		],
		771: [
			0,
			.825,
			0,
			0,
			1.8889
		],
		8730: [
			1.25003,
			1.75,
			0,
			0,
			1
		],
		8968: [
			1.25003,
			1.75,
			0,
			0,
			.63889
		],
		8969: [
			1.25003,
			1.75,
			0,
			0,
			.63889
		],
		8970: [
			1.25003,
			1.75,
			0,
			0,
			.63889
		],
		8971: [
			1.25003,
			1.75,
			0,
			0,
			.63889
		],
		9115: [
			.64502,
			1.155,
			0,
			0,
			.875
		],
		9116: [
			1e-5,
			.6,
			0,
			0,
			.875
		],
		9117: [
			.64502,
			1.155,
			0,
			0,
			.875
		],
		9118: [
			.64502,
			1.155,
			0,
			0,
			.875
		],
		9119: [
			1e-5,
			.6,
			0,
			0,
			.875
		],
		9120: [
			.64502,
			1.155,
			0,
			0,
			.875
		],
		9121: [
			.64502,
			1.155,
			0,
			0,
			.66667
		],
		9122: [
			-99e-5,
			.601,
			0,
			0,
			.66667
		],
		9123: [
			.64502,
			1.155,
			0,
			0,
			.66667
		],
		9124: [
			.64502,
			1.155,
			0,
			0,
			.66667
		],
		9125: [
			-99e-5,
			.601,
			0,
			0,
			.66667
		],
		9126: [
			.64502,
			1.155,
			0,
			0,
			.66667
		],
		9127: [
			1e-5,
			.9,
			0,
			0,
			.88889
		],
		9128: [
			.65002,
			1.15,
			0,
			0,
			.88889
		],
		9129: [
			.90001,
			0,
			0,
			0,
			.88889
		],
		9130: [
			0,
			.3,
			0,
			0,
			.88889
		],
		9131: [
			1e-5,
			.9,
			0,
			0,
			.88889
		],
		9132: [
			.65002,
			1.15,
			0,
			0,
			.88889
		],
		9133: [
			.90001,
			0,
			0,
			0,
			.88889
		],
		9143: [
			.88502,
			.915,
			0,
			0,
			1.05556
		],
		10216: [
			1.25003,
			1.75,
			0,
			0,
			.80556
		],
		10217: [
			1.25003,
			1.75,
			0,
			0,
			.80556
		],
		57344: [
			-.00499,
			.605,
			0,
			0,
			1.05556
		],
		57345: [
			-.00499,
			.605,
			0,
			0,
			1.05556
		],
		57680: [
			0,
			.12,
			0,
			0,
			.45
		],
		57681: [
			0,
			.12,
			0,
			0,
			.45
		],
		57682: [
			0,
			.12,
			0,
			0,
			.45
		],
		57683: [
			0,
			.12,
			0,
			0,
			.45
		]
	},
	"Typewriter-Regular": {
		32: [
			0,
			0,
			0,
			0,
			.525
		],
		33: [
			0,
			.61111,
			0,
			0,
			.525
		],
		34: [
			0,
			.61111,
			0,
			0,
			.525
		],
		35: [
			0,
			.61111,
			0,
			0,
			.525
		],
		36: [
			.08333,
			.69444,
			0,
			0,
			.525
		],
		37: [
			.08333,
			.69444,
			0,
			0,
			.525
		],
		38: [
			0,
			.61111,
			0,
			0,
			.525
		],
		39: [
			0,
			.61111,
			0,
			0,
			.525
		],
		40: [
			.08333,
			.69444,
			0,
			0,
			.525
		],
		41: [
			.08333,
			.69444,
			0,
			0,
			.525
		],
		42: [
			0,
			.52083,
			0,
			0,
			.525
		],
		43: [
			-.08056,
			.53055,
			0,
			0,
			.525
		],
		44: [
			.13889,
			.125,
			0,
			0,
			.525
		],
		45: [
			-.08056,
			.53055,
			0,
			0,
			.525
		],
		46: [
			0,
			.125,
			0,
			0,
			.525
		],
		47: [
			.08333,
			.69444,
			0,
			0,
			.525
		],
		48: [
			0,
			.61111,
			0,
			0,
			.525
		],
		49: [
			0,
			.61111,
			0,
			0,
			.525
		],
		50: [
			0,
			.61111,
			0,
			0,
			.525
		],
		51: [
			0,
			.61111,
			0,
			0,
			.525
		],
		52: [
			0,
			.61111,
			0,
			0,
			.525
		],
		53: [
			0,
			.61111,
			0,
			0,
			.525
		],
		54: [
			0,
			.61111,
			0,
			0,
			.525
		],
		55: [
			0,
			.61111,
			0,
			0,
			.525
		],
		56: [
			0,
			.61111,
			0,
			0,
			.525
		],
		57: [
			0,
			.61111,
			0,
			0,
			.525
		],
		58: [
			0,
			.43056,
			0,
			0,
			.525
		],
		59: [
			.13889,
			.43056,
			0,
			0,
			.525
		],
		60: [
			-.05556,
			.55556,
			0,
			0,
			.525
		],
		61: [
			-.19549,
			.41562,
			0,
			0,
			.525
		],
		62: [
			-.05556,
			.55556,
			0,
			0,
			.525
		],
		63: [
			0,
			.61111,
			0,
			0,
			.525
		],
		64: [
			0,
			.61111,
			0,
			0,
			.525
		],
		65: [
			0,
			.61111,
			0,
			0,
			.525
		],
		66: [
			0,
			.61111,
			0,
			0,
			.525
		],
		67: [
			0,
			.61111,
			0,
			0,
			.525
		],
		68: [
			0,
			.61111,
			0,
			0,
			.525
		],
		69: [
			0,
			.61111,
			0,
			0,
			.525
		],
		70: [
			0,
			.61111,
			0,
			0,
			.525
		],
		71: [
			0,
			.61111,
			0,
			0,
			.525
		],
		72: [
			0,
			.61111,
			0,
			0,
			.525
		],
		73: [
			0,
			.61111,
			0,
			0,
			.525
		],
		74: [
			0,
			.61111,
			0,
			0,
			.525
		],
		75: [
			0,
			.61111,
			0,
			0,
			.525
		],
		76: [
			0,
			.61111,
			0,
			0,
			.525
		],
		77: [
			0,
			.61111,
			0,
			0,
			.525
		],
		78: [
			0,
			.61111,
			0,
			0,
			.525
		],
		79: [
			0,
			.61111,
			0,
			0,
			.525
		],
		80: [
			0,
			.61111,
			0,
			0,
			.525
		],
		81: [
			.13889,
			.61111,
			0,
			0,
			.525
		],
		82: [
			0,
			.61111,
			0,
			0,
			.525
		],
		83: [
			0,
			.61111,
			0,
			0,
			.525
		],
		84: [
			0,
			.61111,
			0,
			0,
			.525
		],
		85: [
			0,
			.61111,
			0,
			0,
			.525
		],
		86: [
			0,
			.61111,
			0,
			0,
			.525
		],
		87: [
			0,
			.61111,
			0,
			0,
			.525
		],
		88: [
			0,
			.61111,
			0,
			0,
			.525
		],
		89: [
			0,
			.61111,
			0,
			0,
			.525
		],
		90: [
			0,
			.61111,
			0,
			0,
			.525
		],
		91: [
			.08333,
			.69444,
			0,
			0,
			.525
		],
		92: [
			.08333,
			.69444,
			0,
			0,
			.525
		],
		93: [
			.08333,
			.69444,
			0,
			0,
			.525
		],
		94: [
			0,
			.61111,
			0,
			0,
			.525
		],
		95: [
			.09514,
			0,
			0,
			0,
			.525
		],
		96: [
			0,
			.61111,
			0,
			0,
			.525
		],
		97: [
			0,
			.43056,
			0,
			0,
			.525
		],
		98: [
			0,
			.61111,
			0,
			0,
			.525
		],
		99: [
			0,
			.43056,
			0,
			0,
			.525
		],
		100: [
			0,
			.61111,
			0,
			0,
			.525
		],
		101: [
			0,
			.43056,
			0,
			0,
			.525
		],
		102: [
			0,
			.61111,
			0,
			0,
			.525
		],
		103: [
			.22222,
			.43056,
			0,
			0,
			.525
		],
		104: [
			0,
			.61111,
			0,
			0,
			.525
		],
		105: [
			0,
			.61111,
			0,
			0,
			.525
		],
		106: [
			.22222,
			.61111,
			0,
			0,
			.525
		],
		107: [
			0,
			.61111,
			0,
			0,
			.525
		],
		108: [
			0,
			.61111,
			0,
			0,
			.525
		],
		109: [
			0,
			.43056,
			0,
			0,
			.525
		],
		110: [
			0,
			.43056,
			0,
			0,
			.525
		],
		111: [
			0,
			.43056,
			0,
			0,
			.525
		],
		112: [
			.22222,
			.43056,
			0,
			0,
			.525
		],
		113: [
			.22222,
			.43056,
			0,
			0,
			.525
		],
		114: [
			0,
			.43056,
			0,
			0,
			.525
		],
		115: [
			0,
			.43056,
			0,
			0,
			.525
		],
		116: [
			0,
			.55358,
			0,
			0,
			.525
		],
		117: [
			0,
			.43056,
			0,
			0,
			.525
		],
		118: [
			0,
			.43056,
			0,
			0,
			.525
		],
		119: [
			0,
			.43056,
			0,
			0,
			.525
		],
		120: [
			0,
			.43056,
			0,
			0,
			.525
		],
		121: [
			.22222,
			.43056,
			0,
			0,
			.525
		],
		122: [
			0,
			.43056,
			0,
			0,
			.525
		],
		123: [
			.08333,
			.69444,
			0,
			0,
			.525
		],
		124: [
			.08333,
			.69444,
			0,
			0,
			.525
		],
		125: [
			.08333,
			.69444,
			0,
			0,
			.525
		],
		126: [
			0,
			.61111,
			0,
			0,
			.525
		],
		127: [
			0,
			.61111,
			0,
			0,
			.525
		],
		160: [
			0,
			0,
			0,
			0,
			.525
		],
		176: [
			0,
			.61111,
			0,
			0,
			.525
		],
		184: [
			.19445,
			0,
			0,
			0,
			.525
		],
		305: [
			0,
			.43056,
			0,
			0,
			.525
		],
		567: [
			.22222,
			.43056,
			0,
			0,
			.525
		],
		711: [
			0,
			.56597,
			0,
			0,
			.525
		],
		713: [
			0,
			.56555,
			0,
			0,
			.525
		],
		714: [
			0,
			.61111,
			0,
			0,
			.525
		],
		715: [
			0,
			.61111,
			0,
			0,
			.525
		],
		728: [
			0,
			.61111,
			0,
			0,
			.525
		],
		730: [
			0,
			.61111,
			0,
			0,
			.525
		],
		770: [
			0,
			.61111,
			0,
			0,
			.525
		],
		771: [
			0,
			.61111,
			0,
			0,
			.525
		],
		776: [
			0,
			.61111,
			0,
			0,
			.525
		],
		915: [
			0,
			.61111,
			0,
			0,
			.525
		],
		916: [
			0,
			.61111,
			0,
			0,
			.525
		],
		920: [
			0,
			.61111,
			0,
			0,
			.525
		],
		923: [
			0,
			.61111,
			0,
			0,
			.525
		],
		926: [
			0,
			.61111,
			0,
			0,
			.525
		],
		928: [
			0,
			.61111,
			0,
			0,
			.525
		],
		931: [
			0,
			.61111,
			0,
			0,
			.525
		],
		933: [
			0,
			.61111,
			0,
			0,
			.525
		],
		934: [
			0,
			.61111,
			0,
			0,
			.525
		],
		936: [
			0,
			.61111,
			0,
			0,
			.525
		],
		937: [
			0,
			.61111,
			0,
			0,
			.525
		],
		8216: [
			0,
			.61111,
			0,
			0,
			.525
		],
		8217: [
			0,
			.61111,
			0,
			0,
			.525
		],
		8242: [
			0,
			.61111,
			0,
			0,
			.525
		],
		9251: [
			.11111,
			.21944,
			0,
			0,
			.525
		]
	}
}, Ze = {
	slant: [
		.25,
		.25,
		.25
	],
	space: [
		0,
		0,
		0
	],
	stretch: [
		0,
		0,
		0
	],
	shrink: [
		0,
		0,
		0
	],
	xHeight: [
		.431,
		.431,
		.431
	],
	quad: [
		1,
		1.171,
		1.472
	],
	extraSpace: [
		0,
		0,
		0
	],
	num1: [
		.677,
		.732,
		.925
	],
	num2: [
		.394,
		.384,
		.387
	],
	num3: [
		.444,
		.471,
		.504
	],
	denom1: [
		.686,
		.752,
		1.025
	],
	denom2: [
		.345,
		.344,
		.532
	],
	sup1: [
		.413,
		.503,
		.504
	],
	sup2: [
		.363,
		.431,
		.404
	],
	sup3: [
		.289,
		.286,
		.294
	],
	sub1: [
		.15,
		.143,
		.2
	],
	sub2: [
		.247,
		.286,
		.4
	],
	supDrop: [
		.386,
		.353,
		.494
	],
	subDrop: [
		.05,
		.071,
		.1
	],
	delim1: [
		2.39,
		1.7,
		1.98
	],
	delim2: [
		1.01,
		1.157,
		1.42
	],
	axisHeight: [
		.25,
		.25,
		.25
	],
	defaultRuleThickness: [
		.04,
		.049,
		.049
	],
	bigOpSpacing1: [
		.111,
		.111,
		.111
	],
	bigOpSpacing2: [
		.166,
		.166,
		.166
	],
	bigOpSpacing3: [
		.2,
		.2,
		.2
	],
	bigOpSpacing4: [
		.6,
		.611,
		.611
	],
	bigOpSpacing5: [
		.1,
		.143,
		.143
	],
	sqrtRuleThickness: [
		.04,
		.04,
		.04
	],
	ptPerEm: [
		10,
		10,
		10
	],
	doubleRuleSep: [
		.2,
		.2,
		.2
	],
	arrayRuleWidth: [
		.04,
		.04,
		.04
	],
	fboxsep: [
		.3,
		.3,
		.3
	],
	fboxrule: [
		.04,
		.04,
		.04
	]
}, Qe = {
	Å: "A",
	Ð: "D",
	Þ: "o",
	å: "a",
	ð: "d",
	þ: "o",
	А: "A",
	Б: "B",
	В: "B",
	Г: "F",
	Д: "A",
	Е: "E",
	Ж: "K",
	З: "3",
	И: "N",
	Й: "N",
	К: "K",
	Л: "N",
	М: "M",
	Н: "H",
	О: "O",
	П: "N",
	Р: "P",
	С: "C",
	Т: "T",
	У: "y",
	Ф: "O",
	Х: "X",
	Ц: "U",
	Ч: "h",
	Ш: "W",
	Щ: "W",
	Ъ: "B",
	Ы: "X",
	Ь: "B",
	Э: "3",
	Ю: "X",
	Я: "R",
	а: "a",
	б: "b",
	в: "a",
	г: "r",
	д: "y",
	е: "e",
	ж: "m",
	з: "e",
	и: "n",
	й: "n",
	к: "n",
	л: "n",
	м: "m",
	н: "n",
	о: "o",
	п: "n",
	р: "p",
	с: "c",
	т: "o",
	у: "y",
	ф: "b",
	х: "x",
	ц: "n",
	ч: "n",
	ш: "w",
	щ: "w",
	ъ: "a",
	ы: "m",
	ь: "a",
	э: "e",
	ю: "m",
	я: "r"
};
function $e(e, t) {
	Xe[e] = t;
}
function et(e, t, n) {
	if (!Xe[t]) throw Error("Font metrics not found for font: " + t + ".");
	var r = e.charCodeAt(0), i = Xe[t][r];
	if (!i && e[0] in Qe && (r = Qe[e[0]].charCodeAt(0), i = Xe[t][r]), !i && n === "text" && pe(r) && (i = Xe[t][77]), i) return {
		depth: i[0],
		height: i[1],
		italic: i[2],
		skew: i[3],
		width: i[4]
	};
}
var tt = {};
function nt(e) {
	var t = e >= 5 ? 0 : e >= 3 ? 1 : 2;
	if (!tt[t]) {
		var n = tt[t] = { cssEmPerMu: Ze.quad[t] / 18 };
		for (var r in Ze) Ze.hasOwnProperty(r) && (n[r] = Ze[r][t]);
	}
	return tt[t];
}
var rt = {
	math: {},
	text: {}
};
function A(e, t, n, r, i, a) {
	rt[e][i] = {
		font: t,
		group: n,
		replace: r
	}, a && r && (rt[e][r] = rt[e][i]);
}
var j = "math", M = "text", N = "main", P = "ams", it = "accent-token", F = "bin", at = "close", ot = "inner", I = "mathord", st = "op-token", ct = "open", lt = "punct", L = "rel", ut = "spacing", R = "textord";
A(j, N, L, "≡", "\\equiv", !0), A(j, N, L, "≺", "\\prec", !0), A(j, N, L, "≻", "\\succ", !0), A(j, N, L, "∼", "\\sim", !0), A(j, N, L, "⊥", "\\perp"), A(j, N, L, "⪯", "\\preceq", !0), A(j, N, L, "⪰", "\\succeq", !0), A(j, N, L, "≃", "\\simeq", !0), A(j, N, L, "∣", "\\mid", !0), A(j, N, L, "≪", "\\ll", !0), A(j, N, L, "≫", "\\gg", !0), A(j, N, L, "≍", "\\asymp", !0), A(j, N, L, "∥", "\\parallel"), A(j, N, L, "⋈", "\\bowtie", !0), A(j, N, L, "⌣", "\\smile", !0), A(j, N, L, "⊑", "\\sqsubseteq", !0), A(j, N, L, "⊒", "\\sqsupseteq", !0), A(j, N, L, "≐", "\\doteq", !0), A(j, N, L, "⌢", "\\frown", !0), A(j, N, L, "∋", "\\ni", !0), A(j, N, L, "∝", "\\propto", !0), A(j, N, L, "⊢", "\\vdash", !0), A(j, N, L, "⊣", "\\dashv", !0), A(j, N, L, "∋", "\\owns"), A(j, N, lt, ".", "\\ldotp"), A(j, N, lt, "⋅", "\\cdotp"), A(j, N, lt, "⋅", "·"), A(M, N, R, "⋅", "·"), A(j, N, R, "#", "\\#"), A(M, N, R, "#", "\\#"), A(j, N, R, "&", "\\&"), A(M, N, R, "&", "\\&"), A(j, N, R, "ℵ", "\\aleph", !0), A(j, N, R, "∀", "\\forall", !0), A(j, N, R, "ℏ", "\\hbar", !0), A(j, N, R, "∃", "\\exists", !0), A(j, N, R, "∇", "\\nabla", !0), A(j, N, R, "♭", "\\flat", !0), A(j, N, R, "ℓ", "\\ell", !0), A(j, N, R, "♮", "\\natural", !0), A(j, N, R, "♣", "\\clubsuit", !0), A(j, N, R, "℘", "\\wp", !0), A(j, N, R, "♯", "\\sharp", !0), A(j, N, R, "♢", "\\diamondsuit", !0), A(j, N, R, "ℜ", "\\Re", !0), A(j, N, R, "♡", "\\heartsuit", !0), A(j, N, R, "ℑ", "\\Im", !0), A(j, N, R, "♠", "\\spadesuit", !0), A(j, N, R, "§", "\\S", !0), A(M, N, R, "§", "\\S"), A(j, N, R, "¶", "\\P", !0), A(M, N, R, "¶", "\\P"), A(j, N, R, "†", "\\dag"), A(M, N, R, "†", "\\dag"), A(M, N, R, "†", "\\textdagger"), A(j, N, R, "‡", "\\ddag"), A(M, N, R, "‡", "\\ddag"), A(M, N, R, "‡", "\\textdaggerdbl"), A(j, N, at, "⎱", "\\rmoustache", !0), A(j, N, ct, "⎰", "\\lmoustache", !0), A(j, N, at, "⟯", "\\rgroup", !0), A(j, N, ct, "⟮", "\\lgroup", !0), A(j, N, F, "∓", "\\mp", !0), A(j, N, F, "⊖", "\\ominus", !0), A(j, N, F, "⊎", "\\uplus", !0), A(j, N, F, "⊓", "\\sqcap", !0), A(j, N, F, "∗", "\\ast"), A(j, N, F, "⊔", "\\sqcup", !0), A(j, N, F, "◯", "\\bigcirc", !0), A(j, N, F, "∙", "\\bullet", !0), A(j, N, F, "‡", "\\ddagger"), A(j, N, F, "≀", "\\wr", !0), A(j, N, F, "⨿", "\\amalg"), A(j, N, F, "&", "\\And"), A(j, N, L, "⟵", "\\longleftarrow", !0), A(j, N, L, "⇐", "\\Leftarrow", !0), A(j, N, L, "⟸", "\\Longleftarrow", !0), A(j, N, L, "⟶", "\\longrightarrow", !0), A(j, N, L, "⇒", "\\Rightarrow", !0), A(j, N, L, "⟹", "\\Longrightarrow", !0), A(j, N, L, "↔", "\\leftrightarrow", !0), A(j, N, L, "⟷", "\\longleftrightarrow", !0), A(j, N, L, "⇔", "\\Leftrightarrow", !0), A(j, N, L, "⟺", "\\Longleftrightarrow", !0), A(j, N, L, "↦", "\\mapsto", !0), A(j, N, L, "⟼", "\\longmapsto", !0), A(j, N, L, "↗", "\\nearrow", !0), A(j, N, L, "↩", "\\hookleftarrow", !0), A(j, N, L, "↪", "\\hookrightarrow", !0), A(j, N, L, "↘", "\\searrow", !0), A(j, N, L, "↼", "\\leftharpoonup", !0), A(j, N, L, "⇀", "\\rightharpoonup", !0), A(j, N, L, "↙", "\\swarrow", !0), A(j, N, L, "↽", "\\leftharpoondown", !0), A(j, N, L, "⇁", "\\rightharpoondown", !0), A(j, N, L, "↖", "\\nwarrow", !0), A(j, N, L, "⇌", "\\rightleftharpoons", !0), A(j, P, L, "≮", "\\nless", !0), A(j, P, L, "", "\\@nleqslant"), A(j, P, L, "", "\\@nleqq"), A(j, P, L, "⪇", "\\lneq", !0), A(j, P, L, "≨", "\\lneqq", !0), A(j, P, L, "", "\\@lvertneqq"), A(j, P, L, "⋦", "\\lnsim", !0), A(j, P, L, "⪉", "\\lnapprox", !0), A(j, P, L, "⊀", "\\nprec", !0), A(j, P, L, "⋠", "\\npreceq", !0), A(j, P, L, "⋨", "\\precnsim", !0), A(j, P, L, "⪹", "\\precnapprox", !0), A(j, P, L, "≁", "\\nsim", !0), A(j, P, L, "", "\\@nshortmid"), A(j, P, L, "∤", "\\nmid", !0), A(j, P, L, "⊬", "\\nvdash", !0), A(j, P, L, "⊭", "\\nvDash", !0), A(j, P, L, "⋪", "\\ntriangleleft"), A(j, P, L, "⋬", "\\ntrianglelefteq", !0), A(j, P, L, "⊊", "\\subsetneq", !0), A(j, P, L, "", "\\@varsubsetneq"), A(j, P, L, "⫋", "\\subsetneqq", !0), A(j, P, L, "", "\\@varsubsetneqq"), A(j, P, L, "≯", "\\ngtr", !0), A(j, P, L, "", "\\@ngeqslant"), A(j, P, L, "", "\\@ngeqq"), A(j, P, L, "⪈", "\\gneq", !0), A(j, P, L, "≩", "\\gneqq", !0), A(j, P, L, "", "\\@gvertneqq"), A(j, P, L, "⋧", "\\gnsim", !0), A(j, P, L, "⪊", "\\gnapprox", !0), A(j, P, L, "⊁", "\\nsucc", !0), A(j, P, L, "⋡", "\\nsucceq", !0), A(j, P, L, "⋩", "\\succnsim", !0), A(j, P, L, "⪺", "\\succnapprox", !0), A(j, P, L, "≆", "\\ncong", !0), A(j, P, L, "", "\\@nshortparallel"), A(j, P, L, "∦", "\\nparallel", !0), A(j, P, L, "⊯", "\\nVDash", !0), A(j, P, L, "⋫", "\\ntriangleright"), A(j, P, L, "⋭", "\\ntrianglerighteq", !0), A(j, P, L, "", "\\@nsupseteqq"), A(j, P, L, "⊋", "\\supsetneq", !0), A(j, P, L, "", "\\@varsupsetneq"), A(j, P, L, "⫌", "\\supsetneqq", !0), A(j, P, L, "", "\\@varsupsetneqq"), A(j, P, L, "⊮", "\\nVdash", !0), A(j, P, L, "⪵", "\\precneqq", !0), A(j, P, L, "⪶", "\\succneqq", !0), A(j, P, L, "", "\\@nsubseteqq"), A(j, P, F, "⊴", "\\unlhd"), A(j, P, F, "⊵", "\\unrhd"), A(j, P, L, "↚", "\\nleftarrow", !0), A(j, P, L, "↛", "\\nrightarrow", !0), A(j, P, L, "⇍", "\\nLeftarrow", !0), A(j, P, L, "⇏", "\\nRightarrow", !0), A(j, P, L, "↮", "\\nleftrightarrow", !0), A(j, P, L, "⇎", "\\nLeftrightarrow", !0), A(j, P, L, "△", "\\vartriangle"), A(j, P, R, "ℏ", "\\hslash"), A(j, P, R, "▽", "\\triangledown"), A(j, P, R, "◊", "\\lozenge"), A(j, P, R, "Ⓢ", "\\circledS"), A(j, P, R, "®", "\\circledR"), A(M, P, R, "®", "\\circledR"), A(j, P, R, "∡", "\\measuredangle", !0), A(j, P, R, "∄", "\\nexists"), A(j, P, R, "℧", "\\mho"), A(j, P, R, "Ⅎ", "\\Finv", !0), A(j, P, R, "⅁", "\\Game", !0), A(j, P, R, "‵", "\\backprime"), A(j, P, R, "▲", "\\blacktriangle"), A(j, P, R, "▼", "\\blacktriangledown"), A(j, P, R, "■", "\\blacksquare"), A(j, P, R, "⧫", "\\blacklozenge"), A(j, P, R, "★", "\\bigstar"), A(j, P, R, "∢", "\\sphericalangle", !0), A(j, P, R, "∁", "\\complement", !0), A(j, P, R, "ð", "\\eth", !0), A(M, N, R, "ð", "ð"), A(j, P, R, "╱", "\\diagup"), A(j, P, R, "╲", "\\diagdown"), A(j, P, R, "□", "\\square"), A(j, P, R, "□", "\\Box"), A(j, P, R, "◊", "\\Diamond"), A(j, P, R, "¥", "\\yen", !0), A(M, P, R, "¥", "\\yen", !0), A(j, P, R, "✓", "\\checkmark", !0), A(M, P, R, "✓", "\\checkmark"), A(j, P, R, "ℶ", "\\beth", !0), A(j, P, R, "ℸ", "\\daleth", !0), A(j, P, R, "ℷ", "\\gimel", !0), A(j, P, R, "ϝ", "\\digamma", !0), A(j, P, R, "ϰ", "\\varkappa"), A(j, P, ct, "┌", "\\@ulcorner", !0), A(j, P, at, "┐", "\\@urcorner", !0), A(j, P, ct, "└", "\\@llcorner", !0), A(j, P, at, "┘", "\\@lrcorner", !0), A(j, P, L, "≦", "\\leqq", !0), A(j, P, L, "⩽", "\\leqslant", !0), A(j, P, L, "⪕", "\\eqslantless", !0), A(j, P, L, "≲", "\\lesssim", !0), A(j, P, L, "⪅", "\\lessapprox", !0), A(j, P, L, "≊", "\\approxeq", !0), A(j, P, F, "⋖", "\\lessdot"), A(j, P, L, "⋘", "\\lll", !0), A(j, P, L, "≶", "\\lessgtr", !0), A(j, P, L, "⋚", "\\lesseqgtr", !0), A(j, P, L, "⪋", "\\lesseqqgtr", !0), A(j, P, L, "≑", "\\doteqdot"), A(j, P, L, "≓", "\\risingdotseq", !0), A(j, P, L, "≒", "\\fallingdotseq", !0), A(j, P, L, "∽", "\\backsim", !0), A(j, P, L, "⋍", "\\backsimeq", !0), A(j, P, L, "⫅", "\\subseteqq", !0), A(j, P, L, "⋐", "\\Subset", !0), A(j, P, L, "⊏", "\\sqsubset", !0), A(j, P, L, "≼", "\\preccurlyeq", !0), A(j, P, L, "⋞", "\\curlyeqprec", !0), A(j, P, L, "≾", "\\precsim", !0), A(j, P, L, "⪷", "\\precapprox", !0), A(j, P, L, "⊲", "\\vartriangleleft"), A(j, P, L, "⊴", "\\trianglelefteq"), A(j, P, L, "⊨", "\\vDash", !0), A(j, P, L, "⊪", "\\Vvdash", !0), A(j, P, L, "⌣", "\\smallsmile"), A(j, P, L, "⌢", "\\smallfrown"), A(j, P, L, "≏", "\\bumpeq", !0), A(j, P, L, "≎", "\\Bumpeq", !0), A(j, P, L, "≧", "\\geqq", !0), A(j, P, L, "⩾", "\\geqslant", !0), A(j, P, L, "⪖", "\\eqslantgtr", !0), A(j, P, L, "≳", "\\gtrsim", !0), A(j, P, L, "⪆", "\\gtrapprox", !0), A(j, P, F, "⋗", "\\gtrdot"), A(j, P, L, "⋙", "\\ggg", !0), A(j, P, L, "≷", "\\gtrless", !0), A(j, P, L, "⋛", "\\gtreqless", !0), A(j, P, L, "⪌", "\\gtreqqless", !0), A(j, P, L, "≖", "\\eqcirc", !0), A(j, P, L, "≗", "\\circeq", !0), A(j, P, L, "≜", "\\triangleq", !0), A(j, P, L, "∼", "\\thicksim"), A(j, P, L, "≈", "\\thickapprox"), A(j, P, L, "⫆", "\\supseteqq", !0), A(j, P, L, "⋑", "\\Supset", !0), A(j, P, L, "⊐", "\\sqsupset", !0), A(j, P, L, "≽", "\\succcurlyeq", !0), A(j, P, L, "⋟", "\\curlyeqsucc", !0), A(j, P, L, "≿", "\\succsim", !0), A(j, P, L, "⪸", "\\succapprox", !0), A(j, P, L, "⊳", "\\vartriangleright"), A(j, P, L, "⊵", "\\trianglerighteq"), A(j, P, L, "⊩", "\\Vdash", !0), A(j, P, L, "∣", "\\shortmid"), A(j, P, L, "∥", "\\shortparallel"), A(j, P, L, "≬", "\\between", !0), A(j, P, L, "⋔", "\\pitchfork", !0), A(j, P, L, "∝", "\\varpropto"), A(j, P, L, "◀", "\\blacktriangleleft"), A(j, P, L, "∴", "\\therefore", !0), A(j, P, L, "∍", "\\backepsilon"), A(j, P, L, "▶", "\\blacktriangleright"), A(j, P, L, "∵", "\\because", !0), A(j, P, L, "⋘", "\\llless"), A(j, P, L, "⋙", "\\gggtr"), A(j, P, F, "⊲", "\\lhd"), A(j, P, F, "⊳", "\\rhd"), A(j, P, L, "≂", "\\eqsim", !0), A(j, N, L, "⋈", "\\Join"), A(j, P, L, "≑", "\\Doteq", !0), A(j, P, F, "∔", "\\dotplus", !0), A(j, P, F, "∖", "\\smallsetminus"), A(j, P, F, "⋒", "\\Cap", !0), A(j, P, F, "⋓", "\\Cup", !0), A(j, P, F, "⩞", "\\doublebarwedge", !0), A(j, P, F, "⊟", "\\boxminus", !0), A(j, P, F, "⊞", "\\boxplus", !0), A(j, P, F, "⋇", "\\divideontimes", !0), A(j, P, F, "⋉", "\\ltimes", !0), A(j, P, F, "⋊", "\\rtimes", !0), A(j, P, F, "⋋", "\\leftthreetimes", !0), A(j, P, F, "⋌", "\\rightthreetimes", !0), A(j, P, F, "⋏", "\\curlywedge", !0), A(j, P, F, "⋎", "\\curlyvee", !0), A(j, P, F, "⊝", "\\circleddash", !0), A(j, P, F, "⊛", "\\circledast", !0), A(j, P, F, "⋅", "\\centerdot"), A(j, P, F, "⊺", "\\intercal", !0), A(j, P, F, "⋒", "\\doublecap"), A(j, P, F, "⋓", "\\doublecup"), A(j, P, F, "⊠", "\\boxtimes", !0), A(j, P, L, "⇢", "\\dashrightarrow", !0), A(j, P, L, "⇠", "\\dashleftarrow", !0), A(j, P, L, "⇇", "\\leftleftarrows", !0), A(j, P, L, "⇆", "\\leftrightarrows", !0), A(j, P, L, "⇚", "\\Lleftarrow", !0), A(j, P, L, "↞", "\\twoheadleftarrow", !0), A(j, P, L, "↢", "\\leftarrowtail", !0), A(j, P, L, "↫", "\\looparrowleft", !0), A(j, P, L, "⇋", "\\leftrightharpoons", !0), A(j, P, L, "↶", "\\curvearrowleft", !0), A(j, P, L, "↺", "\\circlearrowleft", !0), A(j, P, L, "↰", "\\Lsh", !0), A(j, P, L, "⇈", "\\upuparrows", !0), A(j, P, L, "↿", "\\upharpoonleft", !0), A(j, P, L, "⇃", "\\downharpoonleft", !0), A(j, N, L, "⊶", "\\origof", !0), A(j, N, L, "⊷", "\\imageof", !0), A(j, P, L, "⊸", "\\multimap", !0), A(j, P, L, "↭", "\\leftrightsquigarrow", !0), A(j, P, L, "⇉", "\\rightrightarrows", !0), A(j, P, L, "⇄", "\\rightleftarrows", !0), A(j, P, L, "↠", "\\twoheadrightarrow", !0), A(j, P, L, "↣", "\\rightarrowtail", !0), A(j, P, L, "↬", "\\looparrowright", !0), A(j, P, L, "↷", "\\curvearrowright", !0), A(j, P, L, "↻", "\\circlearrowright", !0), A(j, P, L, "↱", "\\Rsh", !0), A(j, P, L, "⇊", "\\downdownarrows", !0), A(j, P, L, "↾", "\\upharpoonright", !0), A(j, P, L, "⇂", "\\downharpoonright", !0), A(j, P, L, "⇝", "\\rightsquigarrow", !0), A(j, P, L, "⇝", "\\leadsto"), A(j, P, L, "⇛", "\\Rrightarrow", !0), A(j, P, L, "↾", "\\restriction"), A(j, N, R, "‘", "`"), A(j, N, R, "$", "\\$"), A(M, N, R, "$", "\\$"), A(M, N, R, "$", "\\textdollar"), A(j, N, R, "%", "\\%"), A(M, N, R, "%", "\\%"), A(j, N, R, "_", "\\_"), A(M, N, R, "_", "\\_"), A(M, N, R, "_", "\\textunderscore"), A(j, N, R, "∠", "\\angle", !0), A(j, N, R, "∞", "\\infty", !0), A(j, N, R, "′", "\\prime"), A(j, N, R, "△", "\\triangle"), A(j, N, R, "Γ", "\\Gamma", !0), A(j, N, R, "Δ", "\\Delta", !0), A(j, N, R, "Θ", "\\Theta", !0), A(j, N, R, "Λ", "\\Lambda", !0), A(j, N, R, "Ξ", "\\Xi", !0), A(j, N, R, "Π", "\\Pi", !0), A(j, N, R, "Σ", "\\Sigma", !0), A(j, N, R, "Υ", "\\Upsilon", !0), A(j, N, R, "Φ", "\\Phi", !0), A(j, N, R, "Ψ", "\\Psi", !0), A(j, N, R, "Ω", "\\Omega", !0), A(j, N, R, "A", "Α"), A(j, N, R, "B", "Β"), A(j, N, R, "E", "Ε"), A(j, N, R, "Z", "Ζ"), A(j, N, R, "H", "Η"), A(j, N, R, "I", "Ι"), A(j, N, R, "K", "Κ"), A(j, N, R, "M", "Μ"), A(j, N, R, "N", "Ν"), A(j, N, R, "O", "Ο"), A(j, N, R, "P", "Ρ"), A(j, N, R, "T", "Τ"), A(j, N, R, "X", "Χ"), A(j, N, R, "¬", "\\neg", !0), A(j, N, R, "¬", "\\lnot"), A(j, N, R, "⊤", "\\top"), A(j, N, R, "⊥", "\\bot"), A(j, N, R, "∅", "\\emptyset"), A(j, P, R, "∅", "\\varnothing"), A(j, N, I, "α", "\\alpha", !0), A(j, N, I, "β", "\\beta", !0), A(j, N, I, "γ", "\\gamma", !0), A(j, N, I, "δ", "\\delta", !0), A(j, N, I, "ϵ", "\\epsilon", !0), A(j, N, I, "ζ", "\\zeta", !0), A(j, N, I, "η", "\\eta", !0), A(j, N, I, "θ", "\\theta", !0), A(j, N, I, "ι", "\\iota", !0), A(j, N, I, "κ", "\\kappa", !0), A(j, N, I, "λ", "\\lambda", !0), A(j, N, I, "μ", "\\mu", !0), A(j, N, I, "ν", "\\nu", !0), A(j, N, I, "ξ", "\\xi", !0), A(j, N, I, "ο", "\\omicron", !0), A(j, N, I, "π", "\\pi", !0), A(j, N, I, "ρ", "\\rho", !0), A(j, N, I, "σ", "\\sigma", !0), A(j, N, I, "τ", "\\tau", !0), A(j, N, I, "υ", "\\upsilon", !0), A(j, N, I, "ϕ", "\\phi", !0), A(j, N, I, "χ", "\\chi", !0), A(j, N, I, "ψ", "\\psi", !0), A(j, N, I, "ω", "\\omega", !0), A(j, N, I, "ε", "\\varepsilon", !0), A(j, N, I, "ϑ", "\\vartheta", !0), A(j, N, I, "ϖ", "\\varpi", !0), A(j, N, I, "ϱ", "\\varrho", !0), A(j, N, I, "ς", "\\varsigma", !0), A(j, N, I, "φ", "\\varphi", !0), A(j, N, F, "∗", "*", !0), A(j, N, F, "+", "+"), A(j, N, F, "−", "-", !0), A(j, N, F, "⋅", "\\cdot", !0), A(j, N, F, "∘", "\\circ", !0), A(j, N, F, "÷", "\\div", !0), A(j, N, F, "±", "\\pm", !0), A(j, N, F, "×", "\\times", !0), A(j, N, F, "∩", "\\cap", !0), A(j, N, F, "∪", "\\cup", !0), A(j, N, F, "∖", "\\setminus", !0), A(j, N, F, "∧", "\\land"), A(j, N, F, "∨", "\\lor"), A(j, N, F, "∧", "\\wedge", !0), A(j, N, F, "∨", "\\vee", !0), A(j, N, R, "√", "\\surd"), A(j, N, ct, "⟨", "\\langle", !0), A(j, N, ct, "∣", "\\lvert"), A(j, N, ct, "∥", "\\lVert"), A(j, N, at, "?", "?"), A(j, N, at, "!", "!"), A(j, N, at, "⟩", "\\rangle", !0), A(j, N, at, "∣", "\\rvert"), A(j, N, at, "∥", "\\rVert"), A(j, N, L, "=", "="), A(j, N, L, ":", ":"), A(j, N, L, "≈", "\\approx", !0), A(j, N, L, "≅", "\\cong", !0), A(j, N, L, "≥", "\\ge"), A(j, N, L, "≥", "\\geq", !0), A(j, N, L, "←", "\\gets"), A(j, N, L, ">", "\\gt", !0), A(j, N, L, "∈", "\\in", !0), A(j, N, L, "", "\\@not"), A(j, N, L, "⊂", "\\subset", !0), A(j, N, L, "⊃", "\\supset", !0), A(j, N, L, "⊆", "\\subseteq", !0), A(j, N, L, "⊇", "\\supseteq", !0), A(j, P, L, "⊈", "\\nsubseteq", !0), A(j, P, L, "⊉", "\\nsupseteq", !0), A(j, N, L, "⊨", "\\models"), A(j, N, L, "←", "\\leftarrow", !0), A(j, N, L, "≤", "\\le"), A(j, N, L, "≤", "\\leq", !0), A(j, N, L, "<", "\\lt", !0), A(j, N, L, "→", "\\rightarrow", !0), A(j, N, L, "→", "\\to"), A(j, P, L, "≱", "\\ngeq", !0), A(j, P, L, "≰", "\\nleq", !0), A(j, N, ut, "\xA0", "\\ "), A(j, N, ut, "\xA0", "\\space"), A(j, N, ut, "\xA0", "\\nobreakspace"), A(M, N, ut, "\xA0", "\\ "), A(M, N, ut, "\xA0", " "), A(M, N, ut, "\xA0", "\\space"), A(M, N, ut, "\xA0", "\\nobreakspace"), A(j, N, ut, "", "\\nobreak"), A(j, N, ut, "", "\\allowbreak"), A(j, N, lt, ",", ","), A(j, N, lt, ";", ";"), A(j, P, F, "⊼", "\\barwedge", !0), A(j, P, F, "⊻", "\\veebar", !0), A(j, N, F, "⊙", "\\odot", !0), A(j, N, F, "⊕", "\\oplus", !0), A(j, N, F, "⊗", "\\otimes", !0), A(j, N, R, "∂", "\\partial", !0), A(j, N, F, "⊘", "\\oslash", !0), A(j, P, F, "⊚", "\\circledcirc", !0), A(j, P, F, "⊡", "\\boxdot", !0), A(j, N, F, "△", "\\bigtriangleup"), A(j, N, F, "▽", "\\bigtriangledown"), A(j, N, F, "†", "\\dagger"), A(j, N, F, "⋄", "\\diamond"), A(j, N, F, "⋆", "\\star"), A(j, N, F, "◃", "\\triangleleft"), A(j, N, F, "▹", "\\triangleright"), A(j, N, ct, "{", "\\{"), A(M, N, R, "{", "\\{"), A(M, N, R, "{", "\\textbraceleft"), A(j, N, at, "}", "\\}"), A(M, N, R, "}", "\\}"), A(M, N, R, "}", "\\textbraceright"), A(j, N, ct, "{", "\\lbrace"), A(j, N, at, "}", "\\rbrace"), A(j, N, ct, "[", "\\lbrack", !0), A(M, N, R, "[", "\\lbrack", !0), A(j, N, at, "]", "\\rbrack", !0), A(M, N, R, "]", "\\rbrack", !0), A(j, N, ct, "(", "\\lparen", !0), A(j, N, at, ")", "\\rparen", !0), A(M, N, R, "<", "\\textless", !0), A(M, N, R, ">", "\\textgreater", !0), A(j, N, ct, "⌊", "\\lfloor", !0), A(j, N, at, "⌋", "\\rfloor", !0), A(j, N, ct, "⌈", "\\lceil", !0), A(j, N, at, "⌉", "\\rceil", !0), A(j, N, R, "\\", "\\backslash"), A(j, N, R, "∣", "|"), A(j, N, R, "∣", "\\vert"), A(M, N, R, "|", "\\textbar", !0), A(j, N, R, "∥", "\\|"), A(j, N, R, "∥", "\\Vert"), A(M, N, R, "∥", "\\textbardbl"), A(M, N, R, "~", "\\textasciitilde"), A(M, N, R, "\\", "\\textbackslash"), A(M, N, R, "^", "\\textasciicircum"), A(j, N, L, "↑", "\\uparrow", !0), A(j, N, L, "⇑", "\\Uparrow", !0), A(j, N, L, "↓", "\\downarrow", !0), A(j, N, L, "⇓", "\\Downarrow", !0), A(j, N, L, "↕", "\\updownarrow", !0), A(j, N, L, "⇕", "\\Updownarrow", !0), A(j, N, st, "∐", "\\coprod"), A(j, N, st, "⋁", "\\bigvee"), A(j, N, st, "⋀", "\\bigwedge"), A(j, N, st, "⨄", "\\biguplus"), A(j, N, st, "⋂", "\\bigcap"), A(j, N, st, "⋃", "\\bigcup"), A(j, N, st, "∫", "\\int"), A(j, N, st, "∫", "\\intop"), A(j, N, st, "∬", "\\iint"), A(j, N, st, "∭", "\\iiint"), A(j, N, st, "∏", "\\prod"), A(j, N, st, "∑", "\\sum"), A(j, N, st, "⨂", "\\bigotimes"), A(j, N, st, "⨁", "\\bigoplus"), A(j, N, st, "⨀", "\\bigodot"), A(j, N, st, "∮", "\\oint"), A(j, N, st, "∯", "\\oiint"), A(j, N, st, "∰", "\\oiiint"), A(j, N, st, "⨆", "\\bigsqcup"), A(j, N, st, "∫", "\\smallint"), A(M, N, ot, "…", "\\textellipsis"), A(j, N, ot, "…", "\\mathellipsis"), A(M, N, ot, "…", "\\ldots", !0), A(j, N, ot, "…", "\\ldots", !0), A(j, N, ot, "⋯", "\\@cdots", !0), A(j, N, ot, "⋱", "\\ddots", !0), A(j, N, R, "⋮", "\\varvdots"), A(M, N, R, "⋮", "\\varvdots"), A(j, N, it, "ˊ", "\\acute"), A(j, N, it, "ˋ", "\\grave"), A(j, N, it, "¨", "\\ddot"), A(j, N, it, "~", "\\tilde"), A(j, N, it, "ˉ", "\\bar"), A(j, N, it, "˘", "\\breve"), A(j, N, it, "ˇ", "\\check"), A(j, N, it, "^", "\\hat"), A(j, N, it, "⃗", "\\vec"), A(j, N, it, "˙", "\\dot"), A(j, N, it, "˚", "\\mathring"), A(j, N, I, "", "\\@imath"), A(j, N, I, "", "\\@jmath"), A(j, N, R, "ı", "ı"), A(j, N, R, "ȷ", "ȷ"), A(M, N, R, "ı", "\\i", !0), A(M, N, R, "ȷ", "\\j", !0), A(M, N, R, "ß", "\\ss", !0), A(M, N, R, "æ", "\\ae", !0), A(M, N, R, "œ", "\\oe", !0), A(M, N, R, "ø", "\\o", !0), A(M, N, R, "Æ", "\\AE", !0), A(M, N, R, "Œ", "\\OE", !0), A(M, N, R, "Ø", "\\O", !0), A(M, N, it, "ˊ", "\\'"), A(M, N, it, "ˋ", "\\`"), A(M, N, it, "ˆ", "\\^"), A(M, N, it, "˜", "\\~"), A(M, N, it, "ˉ", "\\="), A(M, N, it, "˘", "\\u"), A(M, N, it, "˙", "\\."), A(M, N, it, "¸", "\\c"), A(M, N, it, "˚", "\\r"), A(M, N, it, "ˇ", "\\v"), A(M, N, it, "¨", "\\\""), A(M, N, it, "˝", "\\H"), A(M, N, it, "◯", "\\textcircled");
var dt = {
	"--": !0,
	"---": !0,
	"``": !0,
	"''": !0
};
A(M, N, R, "–", "--", !0), A(M, N, R, "–", "\\textendash"), A(M, N, R, "—", "---", !0), A(M, N, R, "—", "\\textemdash"), A(M, N, R, "‘", "`", !0), A(M, N, R, "‘", "\\textquoteleft"), A(M, N, R, "’", "'", !0), A(M, N, R, "’", "\\textquoteright"), A(M, N, R, "“", "``", !0), A(M, N, R, "“", "\\textquotedblleft"), A(M, N, R, "”", "''", !0), A(M, N, R, "”", "\\textquotedblright"), A(j, N, R, "°", "\\degree", !0), A(M, N, R, "°", "\\degree"), A(M, N, R, "°", "\\textdegree", !0), A(j, N, R, "£", "\\pounds"), A(j, N, R, "£", "\\mathsterling", !0), A(M, N, R, "£", "\\pounds"), A(M, N, R, "£", "\\textsterling", !0), A(j, P, R, "✠", "\\maltese"), A(M, P, R, "✠", "\\maltese");
for (var ft = "0123456789/@.\"", pt = 0; pt < ft.length; pt++) {
	var mt = ft.charAt(pt);
	A(j, N, R, mt, mt);
}
for (var ht = "0123456789!@*()-=+\";:?/.,", gt = 0; gt < ht.length; gt++) {
	var _t = ht.charAt(gt);
	A(M, N, R, _t, _t);
}
for (var vt = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz", yt = 0; yt < vt.length; yt++) {
	var bt = vt.charAt(yt);
	A(j, N, I, bt, bt), A(M, N, R, bt, bt);
}
A(j, P, R, "C", "ℂ"), A(M, P, R, "C", "ℂ"), A(j, P, R, "H", "ℍ"), A(M, P, R, "H", "ℍ"), A(j, P, R, "N", "ℕ"), A(M, P, R, "N", "ℕ"), A(j, P, R, "P", "ℙ"), A(M, P, R, "P", "ℙ"), A(j, P, R, "Q", "ℚ"), A(M, P, R, "Q", "ℚ"), A(j, P, R, "R", "ℝ"), A(M, P, R, "R", "ℝ"), A(j, P, R, "Z", "ℤ"), A(M, P, R, "Z", "ℤ"), A(j, N, I, "h", "ℎ"), A(M, N, I, "h", "ℎ");
for (var z, xt = 0; xt < vt.length; xt++) {
	var St = vt.charAt(xt);
	z = String.fromCharCode(55349, 56320 + xt), A(j, N, I, St, z), A(M, N, R, St, z), z = String.fromCharCode(55349, 56372 + xt), A(j, N, I, St, z), A(M, N, R, St, z), z = String.fromCharCode(55349, 56424 + xt), A(j, N, I, St, z), A(M, N, R, St, z), z = String.fromCharCode(55349, 56580 + xt), A(j, N, I, St, z), A(M, N, R, St, z), z = String.fromCharCode(55349, 56684 + xt), A(j, N, I, St, z), A(M, N, R, St, z), z = String.fromCharCode(55349, 56736 + xt), A(j, N, I, St, z), A(M, N, R, St, z), z = String.fromCharCode(55349, 56788 + xt), A(j, N, I, St, z), A(M, N, R, St, z), z = String.fromCharCode(55349, 56840 + xt), A(j, N, I, St, z), A(M, N, R, St, z), z = String.fromCharCode(55349, 56944 + xt), A(j, N, I, St, z), A(M, N, R, St, z), xt < 26 && (z = String.fromCharCode(55349, 56632 + xt), A(j, N, I, St, z), A(M, N, R, St, z), z = String.fromCharCode(55349, 56476 + xt), A(j, N, I, St, z), A(M, N, R, St, z));
}
z = String.fromCharCode(55349, 56668), A(j, N, I, "k", z), A(M, N, R, "k", z);
for (var Ct = 0; Ct < 10; Ct++) {
	var wt = Ct.toString();
	z = String.fromCharCode(55349, 57294 + Ct), A(j, N, I, wt, z), A(M, N, R, wt, z), z = String.fromCharCode(55349, 57314 + Ct), A(j, N, I, wt, z), A(M, N, R, wt, z), z = String.fromCharCode(55349, 57324 + Ct), A(j, N, I, wt, z), A(M, N, R, wt, z), z = String.fromCharCode(55349, 57334 + Ct), A(j, N, I, wt, z), A(M, N, R, wt, z);
}
for (var Tt = "ÐÞþ", Et = 0; Et < Tt.length; Et++) {
	var Dt = Tt.charAt(Et);
	A(j, N, I, Dt, Dt), A(M, N, R, Dt, Dt);
}
var Ot = {
	mathClass: "mathbf",
	textClass: "textbf",
	font: "Main-Bold"
}, kt = {
	mathClass: "mathnormal",
	textClass: "textit",
	font: "Math-Italic"
}, At = {
	mathClass: "boldsymbol",
	textClass: "boldsymbol",
	font: "Main-BoldItalic"
}, jt = {
	mathClass: "mathscr",
	textClass: "textscr",
	font: "Script-Regular"
}, Mt = {
	mathClass: "",
	textClass: "",
	font: ""
}, Nt = {
	mathClass: "mathfrak",
	textClass: "textfrak",
	font: "Fraktur-Regular"
}, Pt = {
	mathClass: "mathbb",
	textClass: "textbb",
	font: "AMS-Regular"
}, Ft = {
	mathClass: "mathboldfrak",
	textClass: "textboldfrak",
	font: "Fraktur-Regular"
}, It = {
	mathClass: "mathsf",
	textClass: "textsf",
	font: "SansSerif-Regular"
}, Lt = {
	mathClass: "mathboldsf",
	textClass: "textboldsf",
	font: "SansSerif-Bold"
}, Rt = {
	mathClass: "mathitsf",
	textClass: "textitsf",
	font: "SansSerif-Italic"
}, zt = {
	mathClass: "mathtt",
	textClass: "texttt",
	font: "Typewriter-Regular"
}, Bt = [
	Ot,
	Ot,
	kt,
	kt,
	At,
	At,
	jt,
	Mt,
	Mt,
	Mt,
	Nt,
	Nt,
	Pt,
	Pt,
	Ft,
	Ft,
	It,
	It,
	Lt,
	Lt,
	Rt,
	Rt,
	Mt,
	Mt,
	zt,
	zt
], Vt = [
	Ot,
	Mt,
	It,
	Lt,
	zt
], Ht = (e) => {
	var t = e.charCodeAt(0), n = e.charCodeAt(1), r = (t - 55296) * 1024 + (n - 56320) + 65536;
	if (119808 <= r && r < 120484) return Bt[Math.floor((r - 119808) / 26)];
	if (120782 <= r && r <= 120831) return Vt[Math.floor((r - 120782) / 10)];
	if (r === 120485 || r === 120486) return Bt[0];
	if (120486 < r && r < 120782) return Mt;
	throw new s("Unsupported character: " + e);
}, Ut = function(e, t, n) {
	if (rt[n][e]) {
		var r = rt[n][e].replace;
		r && (e = r);
	}
	return {
		value: e,
		metrics: et(e, t, n)
	};
}, Wt = function(e, t, n, r, i) {
	var a = Ut(e, t, n), o = a.metrics;
	e = a.value;
	var s;
	if (o) {
		var c = o.italic;
		(n === "text" || r && r.font === "mathit") && (c = 0), s = new Ue(e, o.height, o.depth, c, o.skew, o.width, i);
	} else typeof console < "u" && console.warn("No character metrics " + ("for '" + e + "' in style '" + t + "' and mode '" + n + "'")), s = new Ue(e, 0, 0, 0, 0, 0, i);
	if (r) {
		s.maxFontSize = r.sizeMultiplier, r.style.isTight() && s.classes.push("mtight");
		var l = r.getColor();
		l && (s.style.color = l);
	}
	return s;
}, Gt = function(e, t, n, r) {
	return r === void 0 && (r = []), n.font === "boldsymbol" && Ut(e, "Main-Bold", t).metrics ? Wt(e, "Main-Bold", t, n, r.concat(["mathbf"])) : e === "\\" || rt[t][e].font === "main" ? Wt(e, "Main-Regular", t, n, r) : Wt(e, "AMS-Regular", t, n, r.concat(["amsrm"]));
}, Kt = function(e, t, n) {
	return n !== "textord" && Ut(e, "Math-BoldItalic", t).metrics ? {
		fontName: "Math-BoldItalic",
		fontClass: "boldsymbol"
	} : {
		fontName: "Main-Bold",
		fontClass: "mathbf"
	};
}, qt = function(e, t) {
	var n = e.type === "mathord" ? "mathord" : "textord", r = e.mode, i = e.text, a = ["mord"], { font: o, fontFamily: s, fontWeight: c, fontShape: l } = t, u = r === "math" || r === "text" && !!o, d = u ? o : s, f = "", p = "";
	if (i.charCodeAt(0) === 55349) {
		var m = Ht(i);
		f = m.font, p = m[r + "Class"];
	}
	if (f) return Wt(i, f, r, t, a.concat(p));
	if (d) {
		var h, g;
		if (d === "boldsymbol") {
			var _ = Kt(i, r, n);
			h = _.fontName, g = [_.fontClass];
		} else u ? (h = on[o].fontName, g = [o]) : (h = an(s, c, l), g = [
			s,
			c,
			l
		]);
		if (Ut(i, h, r).metrics) return Wt(i, h, r, t, a.concat(g));
		if (dt.hasOwnProperty(i) && h.slice(0, 10) === "Typewriter") {
			for (var v = [], y = 0; y < i.length; y++) v.push(Wt(i[y], h, r, t, a.concat(g)));
			return en(v);
		}
	}
	if (n === "mathord") return Wt(i, "Math-Italic", r, t, a.concat(["mathnormal"]));
	if (n === "textord") {
		var b = rt[r][i] && rt[r][i].font;
		if (b === "ams") return Wt(i, an("amsrm", c, l), r, t, a.concat("amsrm", c, l));
		if (b === "main" || !b) return Wt(i, an("textrm", c, l), r, t, a.concat(c, l));
		var x = an(b, c, l);
		return Wt(i, x, r, t, a.concat(x, c, l));
	} else throw Error("unexpected type: " + n + " in makeOrd");
}, Jt = (e, t) => {
	if (Ne(e.classes) !== Ne(t.classes) || e.skew !== t.skew || e.maxFontSize !== t.maxFontSize || e.italic !== 0 && e.hasClass("mathnormal")) return !1;
	if (e.classes.length === 1) {
		var n = e.classes[0];
		if (n === "mbin" || n === "mord") return !1;
	}
	for (var r of Object.keys(e.style)) if (e.style[r] !== t.style[r]) return !1;
	for (var i of Object.keys(t.style)) if (e.style[i] !== t.style[i]) return !1;
	return !0;
}, Yt = (e) => {
	for (var t = 0; t < e.length - 1; t++) {
		var n = e[t], r = e[t + 1];
		n instanceof Ue && r instanceof Ue && Jt(n, r) && (n.text += r.text, n.height = Math.max(n.height, r.height), n.depth = Math.max(n.depth, r.depth), n.italic = r.italic, e.splice(t + 1, 1), t--);
	}
	return e;
}, Xt = function(e) {
	for (var t = 0, n = 0, r = 0, i = 0; i < e.children.length; i++) {
		var a = e.children[i];
		a.height > t && (t = a.height), a.depth > n && (n = a.depth), a.maxFontSize > r && (r = a.maxFontSize);
	}
	e.height = t, e.depth = n, e.maxFontSize = r;
}, B = function(e, t, n, r) {
	var i = new ze(e, t, n, r);
	return Xt(i), i;
}, Zt = (e, t, n, r) => new ze(e, t, n, r), Qt = function(e, t, n) {
	var r = B([e], [], t);
	return r.height = Math.max(n || t.fontMetrics().defaultRuleThickness, t.minRuleThickness), r.style.borderBottomWidth = k(r.height), r.maxFontSize = 1, r;
}, $t = function(e, t, n, r) {
	var i = new Be(e, t, n, r);
	return Xt(i), i;
}, en = function(e) {
	var t = new Oe(e);
	return Xt(t), t;
}, tn = function(e, t) {
	return e instanceof Oe ? B([], [e], t) : e;
}, nn = function(e) {
	if (e.positionType === "individualShift") {
		for (var t = e.children, n = [t[0]], r = -t[0].shift - t[0].elem.depth, i = r, a = 1; a < t.length; a++) {
			var o = -t[a].shift - i - t[a].elem.depth, s = o - (t[a - 1].elem.height + t[a - 1].elem.depth);
			i += o, n.push({
				type: "kern",
				size: s
			}), n.push(t[a]);
		}
		return {
			children: n,
			depth: r
		};
	}
	var c;
	if (e.positionType === "top") {
		for (var l = e.positionData, u = 0; u < e.children.length; u++) {
			var d = e.children[u];
			l -= d.type === "kern" ? d.size : d.elem.height + d.elem.depth;
		}
		c = l;
	} else if (e.positionType === "bottom") c = -e.positionData;
	else {
		var f = e.children[0];
		if (f.type !== "elem") throw Error("First child must have type \"elem\".");
		if (e.positionType === "shift") c = -f.elem.depth - e.positionData;
		else if (e.positionType === "firstBaseline") c = -f.elem.depth;
		else throw Error("Invalid positionType " + e.positionType + ".");
	}
	return {
		children: e.children,
		depth: c
	};
}, V = function(e, t) {
	for (var { children: n, depth: r } = nn(e), i = 0, a = 0; a < n.length; a++) {
		var o = n[a];
		if (o.type === "elem") {
			var s = o.elem;
			i = Math.max(i, s.maxFontSize, s.height);
		}
	}
	i += 2;
	var c = B(["pstrut"], []);
	c.style.height = k(i);
	for (var l = [], u = r, d = r, f = r, p = 0; p < n.length; p++) {
		var m = n[p];
		if (m.type === "kern") f += m.size;
		else {
			var h = m.elem, g = m.wrapperClasses || [], _ = m.wrapperStyle || {}, v = B(g, [c, h], void 0, _);
			v.style.top = k(-i - f - h.depth), m.marginLeft && (v.style.marginLeft = m.marginLeft), m.marginRight && (v.style.marginRight = m.marginRight), l.push(v), f += h.height + h.depth;
		}
		u = Math.min(u, f), d = Math.max(d, f);
	}
	var y = B(["vlist"], l);
	y.style.height = k(d);
	var b;
	if (u < 0) {
		var x = B(["vlist"], [B([], [])]);
		x.style.height = k(-u), b = [B(["vlist-r"], [y, B(["vlist-s"], [new Ue("​")])]), B(["vlist-r"], [x])];
	} else b = [B(["vlist-r"], [y])];
	var S = B(["vlist-t"], b);
	return b.length === 2 && S.classes.push("vlist-t2"), S.height = d, S.depth = -u, S;
}, rn = (e, t) => {
	var n = B(["mspace"], [], t), r = Me(e, t);
	return n.style.marginRight = k(r), n;
}, an = (e, t, n) => {
	var r, i;
	switch (e) {
		case "amsrm":
			r = "AMS";
			break;
		case "textrm":
			r = "Main";
			break;
		case "textsf":
			r = "SansSerif";
			break;
		case "texttt":
			r = "Typewriter";
			break;
		default: r = e;
	}
	return i = t === "textbf" && n === "textit" ? "BoldItalic" : t === "textbf" ? "Bold" : n === "textit" ? "Italic" : "Regular", r + "-" + i;
}, on = {
	mathbf: {
		variant: "bold",
		fontName: "Main-Bold"
	},
	mathrm: {
		variant: "normal",
		fontName: "Main-Regular"
	},
	textit: {
		variant: "italic",
		fontName: "Main-Italic"
	},
	mathit: {
		variant: "italic",
		fontName: "Main-Italic"
	},
	mathnormal: {
		variant: "italic",
		fontName: "Math-Italic"
	},
	mathsfit: {
		variant: "sans-serif-italic",
		fontName: "SansSerif-Italic"
	},
	mathbb: {
		variant: "double-struck",
		fontName: "AMS-Regular"
	},
	mathcal: {
		variant: "script",
		fontName: "Caligraphic-Regular"
	},
	mathfrak: {
		variant: "fraktur",
		fontName: "Fraktur-Regular"
	},
	mathscr: {
		variant: "script",
		fontName: "Script-Regular"
	},
	mathsf: {
		variant: "sans-serif",
		fontName: "SansSerif-Regular"
	},
	mathtt: {
		variant: "monospace",
		fontName: "Typewriter-Regular"
	}
}, sn = {
	vec: [
		"vec",
		.471,
		.714
	],
	oiintSize1: [
		"oiintSize1",
		.957,
		.499
	],
	oiintSize2: [
		"oiintSize2",
		1.472,
		.659
	],
	oiiintSize1: [
		"oiiintSize1",
		1.304,
		.499
	],
	oiiintSize2: [
		"oiiintSize2",
		1.98,
		.659
	]
}, cn = function(e, t) {
	var [n, r, i] = sn[e], a = Zt(["overlay"], [new We([new Ge(n)], {
		width: k(r),
		height: k(i),
		style: "width:" + k(r),
		viewBox: "0 0 " + 1e3 * r + " " + 1e3 * i,
		preserveAspectRatio: "xMinYMin"
	})], t);
	return a.height = i, a.style.height = k(i), a.style.width = k(r), a;
}, ln = {
	number: 3,
	unit: "mu"
}, un = {
	number: 4,
	unit: "mu"
}, dn = {
	number: 5,
	unit: "mu"
}, fn = {
	mord: {
		mop: ln,
		mbin: un,
		mrel: dn,
		minner: ln
	},
	mop: {
		mord: ln,
		mop: ln,
		mrel: dn,
		minner: ln
	},
	mbin: {
		mord: un,
		mop: un,
		mopen: un,
		minner: un
	},
	mrel: {
		mord: dn,
		mop: dn,
		mopen: dn,
		minner: dn
	},
	mopen: {},
	mclose: {
		mop: ln,
		mbin: un,
		mrel: dn,
		minner: ln
	},
	mpunct: {
		mord: ln,
		mop: ln,
		mrel: dn,
		mopen: ln,
		mclose: ln,
		mpunct: ln,
		minner: ln
	},
	minner: {
		mord: ln,
		mop: ln,
		mbin: un,
		mrel: dn,
		mopen: ln,
		mpunct: ln,
		minner: ln
	}
}, pn = {
	mord: { mop: ln },
	mop: {
		mord: ln,
		mop: ln
	},
	mbin: {},
	mrel: {},
	mopen: {},
	mclose: { mop: ln },
	mpunct: {},
	minner: { mop: ln }
}, mn = {}, hn = {}, gn = {};
function H(e) {
	for (var { type: t, names: n, htmlBuilder: r, mathmlBuilder: i } = e, a = 0; a < n.length; ++a) mn[n[a]] = e;
	t && (r && (hn[t] = r), i && (gn[t] = i));
}
function _n(e) {
	var { type: t, htmlBuilder: n, mathmlBuilder: r } = e;
	n && (hn[t] = n), r && (gn[t] = r);
}
var vn = function(e) {
	return e.type === "ordgroup" && e.body.length === 1 ? e.body[0] : e;
}, yn = function(e) {
	return e.type === "ordgroup" ? e.body : [e];
}, bn = new Set([
	"leftmost",
	"mbin",
	"mopen",
	"mrel",
	"mop",
	"mpunct"
]), xn = new Set([
	"rightmost",
	"mrel",
	"mclose",
	"mpunct"
]), Sn = {
	display: O.DISPLAY,
	text: O.TEXT,
	script: O.SCRIPT,
	scriptscript: O.SCRIPTSCRIPT
}, Cn = {
	mord: "mord",
	mop: "mop",
	mbin: "mbin",
	mrel: "mrel",
	mopen: "mopen",
	mclose: "mclose",
	mpunct: "mpunct",
	minner: "minner"
}, wn = function(e, t, n, r) {
	r === void 0 && (r = [null, null]);
	for (var i = [], a = 0; a < e.length; a++) {
		var o = U(e[a], t);
		if (o instanceof Oe) {
			var s = o.children;
			i.push(...s);
		} else i.push(o);
	}
	if (Yt(i), !n) return i;
	var c = t;
	if (e.length === 1) {
		var l = e[0];
		l.type === "sizing" ? c = t.havingSize(l.size) : l.type === "styling" && (c = t.havingStyle(Sn[l.style]));
	}
	var u = B([r[0] || "leftmost"], [], t), d = B([r[1] || "rightmost"], [], t), f = n === "root";
	return Tn(i, (e, t) => {
		var n = t.classes[0], r = e.classes[0];
		n === "mbin" && xn.has(r) ? t.classes[0] = "mord" : r === "mbin" && bn.has(n) && (e.classes[0] = "mord");
	}, { node: u }, d, f), Tn(i, (e, t) => {
		var n = On(t), r = On(e), i = n && r ? e.hasClass("mtight") ? pn[n]?.[r] : fn[n]?.[r] : null;
		if (i) return rn(i, c);
	}, { node: u }, d, f), i;
}, Tn = function(e, t, n, r, i) {
	r && e.push(r);
	for (var a = 0; a < e.length; a++) {
		var o = e[a], s = En(o);
		if (s) {
			Tn(s.children, t, n, null, i);
			continue;
		}
		var c = !o.hasClass("mspace");
		if (c) {
			var l = t(o, n.node);
			l && (n.insertAfter ? n.insertAfter(l) : (e.unshift(l), a++));
		}
		c ? n.node = o : i && o.hasClass("newline") && (n.node = B(["leftmost"])), n.insertAfter = ((t) => (n) => {
			e.splice(t + 1, 0, n), a++;
		})(a);
	}
	r && e.pop();
}, En = function(e) {
	return e instanceof Oe || e instanceof Be || e instanceof ze && e.hasClass("enclosing") ? e : null;
}, Dn = function(e, t) {
	var n = En(e);
	if (n) {
		var r = n.children;
		if (r.length) {
			if (t === "right") return Dn(r[r.length - 1], "right");
			if (t === "left") return Dn(r[0], "left");
		}
	}
	return e;
}, On = function(e, t) {
	return e ? (t && (e = Dn(e, t)), Cn[e.classes[0]] || null) : null;
}, kn = function(e, t) {
	var n = ["nulldelimiter"].concat(e.baseSizingClasses());
	return B(t.concat(n));
}, U = function(e, t, n) {
	if (!e) return B();
	if (hn[e.type]) {
		var r = hn[e.type](e, t);
		if (n && t.size !== n.size) {
			r = B(t.sizingClasses(n), [r], t);
			var i = t.sizeMultiplier / n.sizeMultiplier;
			r.height *= i, r.depth *= i;
		}
		return r;
	} else throw new s("Got group of unknown type: '" + e.type + "'");
};
function An(e, t) {
	var n = B(["base"], e, t), r = B(["strut"]);
	return r.style.height = k(n.height + n.depth), n.depth && (r.style.verticalAlign = k(-n.depth)), n.children.unshift(r), n;
}
function jn(e, t) {
	var n = null;
	e.length === 1 && e[0].type === "tag" && (n = e[0].tag, e = e[0].body);
	var r = wn(e, t, "root"), i;
	r.length === 2 && r[1].hasClass("tag") && (i = r.pop());
	for (var a = [], o = [], s = 0; s < r.length; s++) if (o.push(r[s]), r[s].hasClass("mbin") || r[s].hasClass("mrel") || r[s].hasClass("allowbreak")) {
		for (var c = !1; s < r.length - 1 && r[s + 1].hasClass("mspace") && !r[s + 1].hasClass("newline");) s++, o.push(r[s]), r[s].hasClass("nobreak") && (c = !0);
		c || (a.push(An(o, t)), o = []);
	} else r[s].hasClass("newline") && (o.pop(), o.length > 0 && (a.push(An(o, t)), o = []), a.push(r[s]));
	o.length > 0 && a.push(An(o, t));
	var l;
	n ? (l = An(wn(n, t, !0), t), l.classes = ["tag"], a.push(l)) : i && a.push(i);
	var u = B(["katex-html"], a);
	if (u.setAttribute("aria-hidden", "true"), l) {
		var d = l.children[0];
		d.style.height = k(u.height + u.depth), u.depth && (d.style.verticalAlign = k(-u.depth));
	}
	return u;
}
function Mn(e) {
	return new Oe(e);
}
var W = class {
	constructor(e, t, n) {
		this.type = void 0, this.attributes = void 0, this.children = void 0, this.classes = void 0, this.type = e, this.attributes = {}, this.children = t || [], this.classes = n || [];
	}
	setAttribute(e, t) {
		this.attributes[e] = t;
	}
	getAttribute(e) {
		return this.attributes[e];
	}
	toNode() {
		var e = document.createElementNS("http://www.w3.org/1998/Math/MathML", this.type);
		for (var t in this.attributes) Object.prototype.hasOwnProperty.call(this.attributes, t) && e.setAttribute(t, this.attributes[t]);
		this.classes.length > 0 && (e.className = Ne(this.classes));
		for (var n = 0; n < this.children.length; n++) if (this.children[n] instanceof Nn && this.children[n + 1] instanceof Nn) {
			for (var r = this.children[n].toText() + this.children[++n].toText(); this.children[n + 1] instanceof Nn;) r += this.children[++n].toText();
			e.appendChild(new Nn(r).toNode());
		} else e.appendChild(this.children[n].toNode());
		return e;
	}
	toMarkup() {
		var e = "<" + this.type;
		for (var t in this.attributes) Object.prototype.hasOwnProperty.call(this.attributes, t) && (e += " " + t + "=\"", e += f(this.attributes[t]), e += "\"");
		this.classes.length > 0 && (e += " class =\"" + f(Ne(this.classes)) + "\""), e += ">";
		for (var n = 0; n < this.children.length; n++) e += this.children[n].toMarkup();
		return e += "</" + this.type + ">", e;
	}
	toText() {
		return this.children.map((e) => e.toText()).join("");
	}
}, Nn = class {
	constructor(e) {
		this.text = void 0, this.text = e;
	}
	toNode() {
		return document.createTextNode(this.text);
	}
	toMarkup() {
		return f(this.toText());
	}
	toText() {
		return this.text;
	}
}, Pn = class {
	constructor(e) {
		this.width = void 0, this.character = void 0, this.width = e, e >= .05555 && e <= .05556 ? this.character = " " : e >= .1666 && e <= .1667 ? this.character = " " : e >= .2222 && e <= .2223 ? this.character = " " : e >= .2777 && e <= .2778 ? this.character = "  " : e >= -.05556 && e <= -.05555 ? this.character = " ⁣" : e >= -.1667 && e <= -.1666 ? this.character = " ⁣" : e >= -.2223 && e <= -.2222 ? this.character = " ⁣" : e >= -.2778 && e <= -.2777 ? this.character = " ⁣" : this.character = null;
	}
	toNode() {
		if (this.character) return document.createTextNode(this.character);
		var e = document.createElementNS("http://www.w3.org/1998/Math/MathML", "mspace");
		return e.setAttribute("width", k(this.width)), e;
	}
	toMarkup() {
		return this.character ? "<mtext>" + this.character + "</mtext>" : "<mspace width=\"" + k(this.width) + "\"/>";
	}
	toText() {
		return this.character ? this.character : " ";
	}
}, Fn = new Set(["\\imath", "\\jmath"]), In = new Set(["mrow", "mtable"]), Ln = function(e, t, n) {
	return rt[t][e] && rt[t][e].replace && e.charCodeAt(0) !== 55349 && !(dt.hasOwnProperty(e) && n && (n.fontFamily && n.fontFamily.slice(4, 6) === "tt" || n.font && n.font.slice(4, 6) === "tt")) && (e = rt[t][e].replace), new Nn(e);
}, Rn = function(e) {
	return e.length === 1 ? e[0] : new W("mrow", e);
}, zn = {
	mathit: "italic",
	boldsymbol: (e) => e.type === "textord" ? "bold" : "bold-italic",
	mathbf: "bold",
	mathbb: "double-struck",
	mathsfit: "sans-serif-italic",
	mathfrak: "fraktur",
	mathscr: "script",
	mathcal: "script",
	mathsf: "sans-serif",
	mathtt: "monospace"
}, Bn = (e, t) => {
	if (e.mode === "text") {
		if (t.fontFamily === "texttt") return "monospace";
		if (t.fontFamily === "textsf") return t.fontShape === "textit" && t.fontWeight === "textbf" ? "sans-serif-bold-italic" : t.fontShape === "textit" ? "sans-serif-italic" : t.fontWeight === "textbf" ? "bold-sans-serif" : "sans-serif";
		if (t.fontShape === "textit" && t.fontWeight === "textbf") return "bold-italic";
		if (t.fontShape === "textit") return "italic";
		if (t.fontWeight === "textbf") return "bold";
	}
	var n = t.font;
	if (!n || n === "mathnormal") return null;
	var r = e.mode, i = zn[n];
	if (i) return typeof i == "function" ? i(e) : i;
	var a = e.text;
	if (Fn.has(a)) return null;
	if (rt[r][a]) {
		var o = rt[r][a].replace;
		o && (a = o);
	}
	var s = on[n].fontName;
	return et(a, s, r) ? on[n].variant : null;
};
function Vn(e) {
	if (!e) return !1;
	if (e.type === "mi" && e.children.length === 1) {
		var t = e.children[0];
		return t instanceof Nn && t.text === ".";
	} else if (e.type === "mo" && e.children.length === 1 && e.getAttribute("separator") === "true" && e.getAttribute("lspace") === "0em" && e.getAttribute("rspace") === "0em") {
		var n = e.children[0];
		return n instanceof Nn && n.text === ",";
	} else return !1;
}
var Hn = function(e, t, n) {
	if (e.length === 1) {
		var r = Wn(e[0], t);
		return n && r instanceof W && r.type === "mo" && (r.setAttribute("lspace", "0em"), r.setAttribute("rspace", "0em")), [r];
	}
	for (var i = [], a, o = 0; o < e.length; o++) {
		var s = Wn(e[o], t);
		if (s instanceof W && a instanceof W) {
			if (s.type === "mtext" && a.type === "mtext" && s.getAttribute("mathvariant") === a.getAttribute("mathvariant")) {
				a.children.push(...s.children);
				continue;
			} else if (s.type === "mn" && a.type === "mn") {
				a.children.push(...s.children);
				continue;
			} else if (Vn(s) && a.type === "mn") {
				a.children.push(...s.children);
				continue;
			} else if (s.type === "mn" && Vn(a)) s.children = [...a.children, ...s.children], i.pop();
			else if ((s.type === "msup" || s.type === "msub") && s.children.length >= 1 && (a.type === "mn" || Vn(a))) {
				var c = s.children[0];
				c instanceof W && c.type === "mn" && (c.children = [...a.children, ...c.children], i.pop());
			} else if (a.type === "mi" && a.children.length === 1) {
				var l = a.children[0];
				if (l instanceof Nn && l.text === "̸" && (s.type === "mo" || s.type === "mi" || s.type === "mn")) {
					var u = s.children[0];
					u instanceof Nn && u.text.length > 0 && (u.text = u.text.slice(0, 1) + "̸" + u.text.slice(1), i.pop());
				}
			}
		}
		i.push(s), a = s;
	}
	return i;
}, Un = function(e, t, n) {
	return Rn(Hn(e, t, n));
}, Wn = function(e, t) {
	if (!e) return new W("mrow");
	if (gn[e.type]) return gn[e.type](e, t);
	throw new s("Got group of unknown type: '" + e.type + "'");
};
function Gn(e, t, n, r, i) {
	var a = Hn(e, n), o = a.length === 1 && a[0] instanceof W && In.has(a[0].type) ? a[0] : new W("mrow", a), s = new W("annotation", [new Nn(t)]);
	s.setAttribute("encoding", "application/x-tex");
	var c = new W("math", [new W("semantics", [o, s])]);
	return c.setAttribute("xmlns", "http://www.w3.org/1998/Math/MathML"), r && c.setAttribute("display", "block"), B([i ? "katex" : "katex-mathml"], [c]);
}
var Kn = [
	[
		1,
		1,
		1
	],
	[
		2,
		1,
		1
	],
	[
		3,
		1,
		1
	],
	[
		4,
		2,
		1
	],
	[
		5,
		2,
		1
	],
	[
		6,
		3,
		1
	],
	[
		7,
		4,
		2
	],
	[
		8,
		6,
		3
	],
	[
		9,
		7,
		6
	],
	[
		10,
		8,
		7
	],
	[
		11,
		10,
		9
	]
], qn = [
	.5,
	.6,
	.7,
	.8,
	.9,
	1,
	1.2,
	1.44,
	1.728,
	2.074,
	2.488
], Jn = function(e, t) {
	return t.size < 2 ? e : Kn[e - 1][t.size - 1];
}, Yn = class e {
	constructor(t) {
		this.style = void 0, this.color = void 0, this.size = void 0, this.textSize = void 0, this.phantom = void 0, this.font = void 0, this.fontFamily = void 0, this.fontWeight = void 0, this.fontShape = void 0, this.sizeMultiplier = void 0, this.maxSize = void 0, this.minRuleThickness = void 0, this._fontMetrics = void 0, this.style = t.style, this.color = t.color, this.size = t.size || e.BASESIZE, this.textSize = t.textSize || this.size, this.phantom = !!t.phantom, this.font = t.font || "", this.fontFamily = t.fontFamily || "", this.fontWeight = t.fontWeight || "", this.fontShape = t.fontShape || "", this.sizeMultiplier = qn[this.size - 1], this.maxSize = t.maxSize, this.minRuleThickness = t.minRuleThickness, this._fontMetrics = void 0;
	}
	extend(t) {
		var n = {
			style: this.style,
			size: this.size,
			textSize: this.textSize,
			color: this.color,
			phantom: this.phantom,
			font: this.font,
			fontFamily: this.fontFamily,
			fontWeight: this.fontWeight,
			fontShape: this.fontShape,
			maxSize: this.maxSize,
			minRuleThickness: this.minRuleThickness
		};
		return Object.assign(n, t), new e(n);
	}
	havingStyle(e) {
		return this.style === e ? this : this.extend({
			style: e,
			size: Jn(this.textSize, e)
		});
	}
	havingCrampedStyle() {
		return this.havingStyle(this.style.cramp());
	}
	havingSize(e) {
		return this.size === e && this.textSize === e ? this : this.extend({
			style: this.style.text(),
			size: e,
			textSize: e,
			sizeMultiplier: qn[e - 1]
		});
	}
	havingBaseStyle(t) {
		t ||= this.style.text();
		var n = Jn(e.BASESIZE, t);
		return this.size === n && this.textSize === e.BASESIZE && this.style === t ? this : this.extend({
			style: t,
			size: n
		});
	}
	havingBaseSizing() {
		var e;
		switch (this.style.id) {
			case 4:
			case 5:
				e = 3;
				break;
			case 6:
			case 7:
				e = 1;
				break;
			default: e = 6;
		}
		return this.extend({
			style: this.style.text(),
			size: e
		});
	}
	withColor(e) {
		return this.extend({ color: e });
	}
	withPhantom() {
		return this.extend({ phantom: !0 });
	}
	withFont(e) {
		return this.extend({ font: e });
	}
	withTextFontFamily(e) {
		return this.extend({
			fontFamily: e,
			font: ""
		});
	}
	withTextFontWeight(e) {
		return this.extend({
			fontWeight: e,
			font: ""
		});
	}
	withTextFontShape(e) {
		return this.extend({
			fontShape: e,
			font: ""
		});
	}
	sizingClasses(e) {
		return e.size === this.size ? [] : [
			"sizing",
			"reset-size" + e.size,
			"size" + this.size
		];
	}
	baseSizingClasses() {
		return this.size === e.BASESIZE ? [] : [
			"sizing",
			"reset-size" + this.size,
			"size" + e.BASESIZE
		];
	}
	fontMetrics() {
		return this._fontMetrics ||= nt(this.size), this._fontMetrics;
	}
	getColor() {
		return this.phantom ? "transparent" : this.color;
	}
};
Yn.BASESIZE = 6;
var Xn = function(e) {
	return new Yn({
		style: e.displayMode ? O.DISPLAY : O.TEXT,
		maxSize: e.maxSize,
		minRuleThickness: e.minRuleThickness
	});
}, Zn = function(e, t) {
	if (t.displayMode) {
		var n = ["katex-display"];
		t.leqno && n.push("leqno"), t.fleqn && n.push("fleqn"), e = B(n, [e]);
	}
	return e;
}, Qn = function(e, t, n) {
	var r = Xn(n), i;
	return n.output === "mathml" ? Gn(e, t, r, n.displayMode, !0) : (i = n.output === "html" ? B(["katex"], [jn(e, r)]) : B(["katex"], [Gn(e, t, r, n.displayMode, !1), jn(e, r)]), Zn(i, n));
}, $n = function(e, t, n) {
	return Zn(B(["katex"], [jn(e, Xn(n))]), n);
}, er = {
	widehat: "^",
	widecheck: "ˇ",
	widetilde: "~",
	utilde: "~",
	overleftarrow: "←",
	underleftarrow: "←",
	xleftarrow: "←",
	overrightarrow: "→",
	underrightarrow: "→",
	xrightarrow: "→",
	underbrace: "⏟",
	overbrace: "⏞",
	underbracket: "⎵",
	overbracket: "⎴",
	overgroup: "⏠",
	undergroup: "⏡",
	overleftrightarrow: "↔",
	underleftrightarrow: "↔",
	xleftrightarrow: "↔",
	Overrightarrow: "⇒",
	xRightarrow: "⇒",
	overleftharpoon: "↼",
	xleftharpoonup: "↼",
	overrightharpoon: "⇀",
	xrightharpoonup: "⇀",
	xLeftarrow: "⇐",
	xLeftrightarrow: "⇔",
	xhookleftarrow: "↩",
	xhookrightarrow: "↪",
	xmapsto: "↦",
	xrightharpoondown: "⇁",
	xleftharpoondown: "↽",
	xrightleftharpoons: "⇌",
	xleftrightharpoons: "⇋",
	xtwoheadleftarrow: "↞",
	xtwoheadrightarrow: "↠",
	xlongequal: "=",
	xtofrom: "⇄",
	xrightleftarrows: "⇄",
	xrightequilibrium: "⇌",
	xleftequilibrium: "⇋",
	"\\cdrightarrow": "→",
	"\\cdleftarrow": "←",
	"\\cdlongequal": "="
}, tr = function(e) {
	var t = new W("mo", [new Nn(er[e.replace(/^\\/, "")])]);
	return t.setAttribute("stretchy", "true"), t;
}, nr = {
	overrightarrow: [
		["rightarrow"],
		.888,
		522,
		"xMaxYMin"
	],
	overleftarrow: [
		["leftarrow"],
		.888,
		522,
		"xMinYMin"
	],
	underrightarrow: [
		["rightarrow"],
		.888,
		522,
		"xMaxYMin"
	],
	underleftarrow: [
		["leftarrow"],
		.888,
		522,
		"xMinYMin"
	],
	xrightarrow: [
		["rightarrow"],
		1.469,
		522,
		"xMaxYMin"
	],
	"\\cdrightarrow": [
		["rightarrow"],
		3,
		522,
		"xMaxYMin"
	],
	xleftarrow: [
		["leftarrow"],
		1.469,
		522,
		"xMinYMin"
	],
	"\\cdleftarrow": [
		["leftarrow"],
		3,
		522,
		"xMinYMin"
	],
	Overrightarrow: [
		["doublerightarrow"],
		.888,
		560,
		"xMaxYMin"
	],
	xRightarrow: [
		["doublerightarrow"],
		1.526,
		560,
		"xMaxYMin"
	],
	xLeftarrow: [
		["doubleleftarrow"],
		1.526,
		560,
		"xMinYMin"
	],
	overleftharpoon: [
		["leftharpoon"],
		.888,
		522,
		"xMinYMin"
	],
	xleftharpoonup: [
		["leftharpoon"],
		.888,
		522,
		"xMinYMin"
	],
	xleftharpoondown: [
		["leftharpoondown"],
		.888,
		522,
		"xMinYMin"
	],
	overrightharpoon: [
		["rightharpoon"],
		.888,
		522,
		"xMaxYMin"
	],
	xrightharpoonup: [
		["rightharpoon"],
		.888,
		522,
		"xMaxYMin"
	],
	xrightharpoondown: [
		["rightharpoondown"],
		.888,
		522,
		"xMaxYMin"
	],
	xlongequal: [
		["longequal"],
		.888,
		334,
		"xMinYMin"
	],
	"\\cdlongequal": [
		["longequal"],
		3,
		334,
		"xMinYMin"
	],
	xtwoheadleftarrow: [
		["twoheadleftarrow"],
		.888,
		334,
		"xMinYMin"
	],
	xtwoheadrightarrow: [
		["twoheadrightarrow"],
		.888,
		334,
		"xMaxYMin"
	],
	overleftrightarrow: [
		["leftarrow", "rightarrow"],
		.888,
		522
	],
	overbrace: [
		[
			"leftbrace",
			"midbrace",
			"rightbrace"
		],
		1.6,
		548
	],
	underbrace: [
		[
			"leftbraceunder",
			"midbraceunder",
			"rightbraceunder"
		],
		1.6,
		548
	],
	underleftrightarrow: [
		["leftarrow", "rightarrow"],
		.888,
		522
	],
	xleftrightarrow: [
		["leftarrow", "rightarrow"],
		1.75,
		522
	],
	xLeftrightarrow: [
		["doubleleftarrow", "doublerightarrow"],
		1.75,
		560
	],
	xrightleftharpoons: [
		["leftharpoondownplus", "rightharpoonplus"],
		1.75,
		716
	],
	xleftrightharpoons: [
		["leftharpoonplus", "rightharpoondownplus"],
		1.75,
		716
	],
	xhookleftarrow: [
		["leftarrow", "righthook"],
		1.08,
		522
	],
	xhookrightarrow: [
		["lefthook", "rightarrow"],
		1.08,
		522
	],
	overlinesegment: [
		["leftlinesegment", "rightlinesegment"],
		.888,
		522
	],
	underlinesegment: [
		["leftlinesegment", "rightlinesegment"],
		.888,
		522
	],
	overbracket: [
		["leftbracketover", "rightbracketover"],
		1.6,
		440
	],
	underbracket: [
		["leftbracketunder", "rightbracketunder"],
		1.6,
		410
	],
	overgroup: [
		["leftgroup", "rightgroup"],
		.888,
		342
	],
	undergroup: [
		["leftgroupunder", "rightgroupunder"],
		.888,
		342
	],
	xmapsto: [
		["leftmapsto", "rightarrow"],
		1.5,
		522
	],
	xtofrom: [
		["leftToFrom", "rightToFrom"],
		1.75,
		528
	],
	xrightleftarrows: [
		["baraboveleftarrow", "rightarrowabovebar"],
		1.75,
		901
	],
	xrightequilibrium: [
		["baraboveshortleftharpoon", "rightharpoonaboveshortbar"],
		1.75,
		716
	],
	xleftequilibrium: [
		["shortbaraboveleftharpoon", "shortrightharpoonabovebar"],
		1.75,
		716
	]
}, rr = new Set([
	"widehat",
	"widecheck",
	"widetilde",
	"utilde"
]), ir = function(e, t) {
	function n() {
		var n = 4e5, r = e.label.slice(1);
		if (rr.has(r) && "base" in e) {
			var i = e.base.type === "ordgroup" ? e.base.body.length : 1, a, o, s;
			if (i > 5) r === "widehat" || r === "widecheck" ? (a = 420, n = 2364, s = .42, o = r + "4") : (a = 312, n = 2340, s = .34, o = "tilde4");
			else {
				var c = [
					1,
					1,
					2,
					2,
					3,
					3
				][i];
				r === "widehat" || r === "widecheck" ? (n = [
					0,
					1062,
					2364,
					2364,
					2364
				][c], a = [
					0,
					239,
					300,
					360,
					420
				][c], s = [
					0,
					.24,
					.3,
					.3,
					.36,
					.42
				][c], o = r + c) : (n = [
					0,
					600,
					1033,
					2339,
					2340
				][c], a = [
					0,
					260,
					286,
					306,
					312
				][c], s = [
					0,
					.26,
					.286,
					.3,
					.306,
					.34
				][c], o = "tilde" + c);
			}
			return {
				span: Zt([], [new We([new Ge(o)], {
					width: "100%",
					height: k(s),
					viewBox: "0 0 " + n + " " + a,
					preserveAspectRatio: "none"
				})], t),
				minWidth: 0,
				height: s
			};
		} else {
			var l = [], u = nr[r];
			if (!u) throw Error("No SVG data for \"" + r + "\".");
			var [d, f, p] = u, m = p / 1e3, h = d.length, g, _;
			if (h === 1) {
				if (u.length !== 4) throw Error("Expected 4-tuple for single-path SVG data \"" + r + "\".");
				g = ["hide-tail"], _ = [u[3]];
			} else if (h === 2) g = ["halfarrow-left", "halfarrow-right"], _ = ["xMinYMin", "xMaxYMin"];
			else if (h === 3) g = [
				"brace-left",
				"brace-center",
				"brace-right"
			], _ = [
				"xMinYMin",
				"xMidYMin",
				"xMaxYMin"
			];
			else throw Error("Correct katexImagesData or update code here to support\n                    " + h + " children.");
			for (var v = 0; v < h; v++) {
				var y = new We([new Ge(d[v])], {
					width: "400em",
					height: k(m),
					viewBox: "0 0 " + n + " " + p,
					preserveAspectRatio: _[v] + " slice"
				}), b = Zt([g[v]], [y], t);
				if (h === 1) return {
					span: b,
					minWidth: f,
					height: m
				};
				b.style.height = k(m), l.push(b);
			}
			return {
				span: B(["stretchy"], l, t),
				minWidth: f,
				height: m
			};
		}
	}
	var { span: r, minWidth: i, height: a } = n();
	return r.height = a, r.style.height = k(a), i > 0 && (r.style.minWidth = k(i)), r;
}, ar = function(e, t, n, r, i) {
	var a, o = e.height + e.depth + n + r;
	if (/fbox|color|angl/.test(t)) {
		if (a = B(["stretchy", t], [], i), t === "fbox") {
			var s = i.color && i.getColor();
			s && (a.style.borderColor = s);
		}
	} else {
		var c = [];
		/^[bx]cancel$/.test(t) && c.push(new Ke({
			x1: "0",
			y1: "0",
			x2: "100%",
			y2: "100%",
			"stroke-width": "0.046em"
		})), /^x?cancel$/.test(t) && c.push(new Ke({
			x1: "0",
			y1: "100%",
			x2: "100%",
			y2: "0",
			"stroke-width": "0.046em"
		})), a = Zt([], [new We(c, {
			width: "100%",
			height: k(o)
		})], i);
	}
	return a.height = o, a.style.height = k(o), a;
}, or = {
	bin: 1,
	close: 1,
	inner: 1,
	open: 1,
	punct: 1,
	rel: 1
}, sr = {
	"accent-token": 1,
	mathord: 1,
	"op-token": 1,
	spacing: 1,
	textord: 1
};
function cr(e) {
	return e in or;
}
function G(e, t) {
	if (!e || e.type !== t) throw Error("Expected node of type " + t + ", but got " + (e ? "node of type " + e.type : String(e)));
	return e;
}
function lr(e) {
	var t = ur(e);
	if (!t) throw Error("Expected node of symbol group type, but got " + (e ? "node of type " + e.type : String(e)));
	return t;
}
function ur(e) {
	return e && (e.type === "atom" || sr.hasOwnProperty(e.type)) ? e : null;
}
var dr = (e) => {
	if (e instanceof Ue) return e;
	if (Ye(e) && e.children.length === 1) return dr(e.children[0]);
}, fr = (e, t) => {
	var n, r, i;
	e && e.type === "supsub" ? (r = G(e.base, "accent"), n = r.base, e.base = n, i = Je(U(e, t)), e.base = r) : (r = G(e, "accent"), n = r.base);
	var a = U(n, t.havingCrampedStyle()), o = r.isShifty && h(n), s = 0;
	o && (s = dr(a)?.skew ?? 0);
	var c = r.label === "\\c", l = c ? a.height + a.depth : Math.min(a.height, t.fontMetrics().xHeight), u;
	if (r.isStretchy) u = ir(r, t), u = V({
		positionType: "firstBaseline",
		children: [{
			type: "elem",
			elem: a
		}, {
			type: "elem",
			elem: u,
			wrapperClasses: ["svg-align"],
			wrapperStyle: s > 0 ? {
				width: "calc(100% - " + k(2 * s) + ")",
				marginLeft: k(2 * s)
			} : void 0
		}]
	});
	else {
		var d, f;
		r.label === "\\vec" ? (d = cn("vec", t), f = sn.vec[1]) : (d = qt({
			type: "textord",
			mode: r.mode,
			text: r.label
		}, t), d = qe(d), d.italic = 0, f = d.width, c && (l += d.depth)), u = B(["accent-body"], [d]);
		var p = r.label === "\\textcircled";
		p && (u.classes.push("accent-full"), l = a.height);
		var m = s;
		p || (m -= f / 2), u.style.left = k(m), r.label === "\\textcircled" && (u.style.top = ".2em"), u = V({
			positionType: "firstBaseline",
			children: [
				{
					type: "elem",
					elem: a
				},
				{
					type: "kern",
					size: -l
				},
				{
					type: "elem",
					elem: u
				}
			]
		});
	}
	var g = B(["mord", "accent"], [u], t);
	return i ? (i.children[0] = g, i.height = Math.max(g.height, i.height), i.classes[0] = "mord", i) : g;
}, pr = (e, t) => {
	var n = e.isStretchy ? tr(e.label) : new W("mo", [Ln(e.label, e.mode)]), r = new W("mover", [Wn(e.base, t), n]);
	return r.setAttribute("accent", "true"), r;
}, mr = new RegExp([
	"\\acute",
	"\\grave",
	"\\ddot",
	"\\tilde",
	"\\bar",
	"\\breve",
	"\\check",
	"\\hat",
	"\\vec",
	"\\dot",
	"\\mathring"
].map((e) => "\\" + e).join("|"));
H({
	type: "accent",
	names: [
		"\\acute",
		"\\grave",
		"\\ddot",
		"\\tilde",
		"\\bar",
		"\\breve",
		"\\check",
		"\\hat",
		"\\vec",
		"\\dot",
		"\\mathring",
		"\\widecheck",
		"\\widehat",
		"\\widetilde",
		"\\overrightarrow",
		"\\overleftarrow",
		"\\Overrightarrow",
		"\\overleftrightarrow",
		"\\overgroup",
		"\\overlinesegment",
		"\\overleftharpoon",
		"\\overrightharpoon"
	],
	numArgs: 1,
	handler: (e, t) => {
		var n = vn(t[0]), r = !mr.test(e.funcName), i = !r || e.funcName === "\\widehat" || e.funcName === "\\widetilde" || e.funcName === "\\widecheck";
		return {
			type: "accent",
			mode: e.parser.mode,
			label: e.funcName,
			isStretchy: r,
			isShifty: i,
			base: n
		};
	},
	htmlBuilder: fr,
	mathmlBuilder: pr
}), H({
	type: "accent",
	names: [
		"\\'",
		"\\`",
		"\\^",
		"\\~",
		"\\=",
		"\\u",
		"\\.",
		"\\\"",
		"\\c",
		"\\r",
		"\\H",
		"\\v",
		"\\textcircled"
	],
	numArgs: 1,
	allowedInText: !0,
	allowedInMath: !0,
	argTypes: ["primitive"],
	handler: (e, t) => {
		var n = t[0], r = e.parser.mode;
		return r === "math" && (e.parser.settings.reportNonstrict("mathVsTextAccents", "LaTeX's accent " + e.funcName + " works only in text mode"), r = "text"), {
			type: "accent",
			mode: r,
			label: e.funcName,
			isStretchy: !1,
			isShifty: !0,
			base: n
		};
	}
}), H({
	type: "accentUnder",
	names: [
		"\\underleftarrow",
		"\\underrightarrow",
		"\\underleftrightarrow",
		"\\undergroup",
		"\\underlinesegment",
		"\\utilde"
	],
	numArgs: 1,
	handler: (e, t) => {
		var { parser: n, funcName: r } = e, i = t[0];
		return {
			type: "accentUnder",
			mode: n.mode,
			label: r,
			base: i
		};
	},
	htmlBuilder: (e, t) => {
		var n = U(e.base, t), r = ir(e, t), i = e.label === "\\utilde" ? .12 : 0;
		return B(["mord", "accentunder"], [V({
			positionType: "top",
			positionData: n.height,
			children: [
				{
					type: "elem",
					elem: r,
					wrapperClasses: ["svg-align"]
				},
				{
					type: "kern",
					size: i
				},
				{
					type: "elem",
					elem: n
				}
			]
		})], t);
	},
	mathmlBuilder: (e, t) => {
		var n = tr(e.label), r = new W("munder", [Wn(e.base, t), n]);
		return r.setAttribute("accentunder", "true"), r;
	}
});
var hr = (e) => {
	var t = new W("mpadded", e ? [e] : []);
	return t.setAttribute("width", "+0.6em"), t.setAttribute("lspace", "0.3em"), t;
};
H({
	type: "xArrow",
	names: [
		"\\xleftarrow",
		"\\xrightarrow",
		"\\xLeftarrow",
		"\\xRightarrow",
		"\\xleftrightarrow",
		"\\xLeftrightarrow",
		"\\xhookleftarrow",
		"\\xhookrightarrow",
		"\\xmapsto",
		"\\xrightharpoondown",
		"\\xrightharpoonup",
		"\\xleftharpoondown",
		"\\xleftharpoonup",
		"\\xrightleftharpoons",
		"\\xleftrightharpoons",
		"\\xlongequal",
		"\\xtwoheadrightarrow",
		"\\xtwoheadleftarrow",
		"\\xtofrom",
		"\\xrightleftarrows",
		"\\xrightequilibrium",
		"\\xleftequilibrium",
		"\\\\cdrightarrow",
		"\\\\cdleftarrow",
		"\\\\cdlongequal"
	],
	numArgs: 1,
	numOptionalArgs: 1,
	handler(e, t, n) {
		var { parser: r, funcName: i } = e;
		return {
			type: "xArrow",
			mode: r.mode,
			label: i,
			body: t[0],
			below: n[0]
		};
	},
	htmlBuilder(e, t) {
		var n = t.style, r = t.havingStyle(n.sup()), i = tn(U(e.body, r, t), t), a = e.label.slice(0, 2) === "\\x" ? "x" : "cd";
		i.classes.push(a + "-arrow-pad");
		var o;
		e.below && (r = t.havingStyle(n.sub()), o = tn(U(e.below, r, t), t), o.classes.push(a + "-arrow-pad"));
		var s = ir(e, t), c = -t.fontMetrics().axisHeight + .5 * s.height, l = -t.fontMetrics().axisHeight - .5 * s.height - .111;
		(i.depth > .25 || e.label === "\\xleftequilibrium") && (l -= i.depth);
		var u;
		if (o) {
			var d = -t.fontMetrics().axisHeight + o.height + .5 * s.height + .111;
			u = V({
				positionType: "individualShift",
				children: [
					{
						type: "elem",
						elem: i,
						shift: l
					},
					{
						type: "elem",
						elem: s,
						shift: c,
						wrapperClasses: ["svg-align"]
					},
					{
						type: "elem",
						elem: o,
						shift: d
					}
				]
			});
		} else u = V({
			positionType: "individualShift",
			children: [{
				type: "elem",
				elem: i,
				shift: l
			}, {
				type: "elem",
				elem: s,
				shift: c,
				wrapperClasses: ["svg-align"]
			}]
		});
		return B(["mrel", "x-arrow"], [u], t);
	},
	mathmlBuilder(e, t) {
		var n = tr(e.label);
		n.setAttribute("minsize", e.label.charAt(0) === "x" ? "1.75em" : "3.0em");
		var r;
		if (e.body) {
			var i = hr(Wn(e.body, t));
			r = e.below ? new W("munderover", [
				n,
				hr(Wn(e.below, t)),
				i
			]) : new W("mover", [n, i]);
		} else e.below ? r = new W("munder", [n, hr(Wn(e.below, t))]) : (r = hr(), r = new W("mover", [n, r]));
		return r;
	}
});
function gr(e, t) {
	var n = wn(e.body, t, !0);
	return B([e.mclass], n, t);
}
function _r(e, t) {
	var n, r = Hn(e.body, t);
	return e.mclass === "minner" ? n = new W("mpadded", r) : e.mclass === "mord" ? e.isCharacterBox ? (n = r[0], n.type = "mi") : n = new W("mi", r) : (e.isCharacterBox ? (n = r[0], n.type = "mo") : n = new W("mo", r), e.mclass === "mbin" ? (n.attributes.lspace = "0.22em", n.attributes.rspace = "0.22em") : e.mclass === "mpunct" ? (n.attributes.lspace = "0em", n.attributes.rspace = "0.17em") : (e.mclass === "mopen" || e.mclass === "mclose") && (n.attributes.lspace = "0em", n.attributes.rspace = "0em")), n;
}
H({
	type: "mclass",
	names: [
		"\\mathord",
		"\\mathbin",
		"\\mathrel",
		"\\mathopen",
		"\\mathclose",
		"\\mathpunct",
		"\\mathinner"
	],
	numArgs: 1,
	primitive: !0,
	handler(e, t) {
		var { parser: n, funcName: r } = e, i = t[0];
		return {
			type: "mclass",
			mode: n.mode,
			mclass: "m" + r.slice(5),
			body: yn(i),
			isCharacterBox: h(i)
		};
	},
	htmlBuilder: gr,
	mathmlBuilder: _r
});
var vr = (e) => {
	var t = e.type === "ordgroup" && e.body.length ? e.body[0] : e;
	return t.type === "atom" && (t.family === "bin" || t.family === "rel") ? "m" + t.family : "mord";
};
H({
	type: "mclass",
	names: ["\\@binrel"],
	numArgs: 2,
	handler(e, t) {
		var { parser: n } = e;
		return {
			type: "mclass",
			mode: n.mode,
			mclass: vr(t[0]),
			body: yn(t[1]),
			isCharacterBox: h(t[1])
		};
	}
}), H({
	type: "mclass",
	names: [
		"\\stackrel",
		"\\overset",
		"\\underset"
	],
	numArgs: 2,
	handler(e, t) {
		var { parser: n, funcName: r } = e, i = t[1], a = t[0], o = r === "\\stackrel" ? "mrel" : vr(i), s = {
			type: "op",
			mode: i.mode,
			limits: !0,
			alwaysHandleSupSub: !0,
			parentIsSupSub: !1,
			symbol: !1,
			suppressBaseShift: r !== "\\stackrel",
			body: yn(i)
		}, c = r === "\\underset" ? {
			type: "supsub",
			mode: a.mode,
			base: s,
			sub: a
		} : {
			type: "supsub",
			mode: a.mode,
			base: s,
			sup: a
		};
		return {
			type: "mclass",
			mode: n.mode,
			mclass: o,
			body: [c],
			isCharacterBox: h(c)
		};
	}
}), H({
	type: "pmb",
	names: ["\\pmb"],
	numArgs: 1,
	allowedInText: !0,
	handler(e, t) {
		var { parser: n } = e;
		return {
			type: "pmb",
			mode: n.mode,
			mclass: vr(t[0]),
			body: yn(t[0])
		};
	},
	htmlBuilder(e, t) {
		var n = wn(e.body, t, !0), r = B([e.mclass], n, t);
		return r.style.textShadow = "0.02em 0.01em 0.04px", r;
	},
	mathmlBuilder(e, t) {
		var n = new W("mstyle", Hn(e.body, t));
		return n.setAttribute("style", "text-shadow: 0.02em 0.01em 0.04px"), n;
	}
});
var yr = {
	">": "\\\\cdrightarrow",
	"<": "\\\\cdleftarrow",
	"=": "\\\\cdlongequal",
	A: "\\uparrow",
	V: "\\downarrow",
	"|": "\\Vert",
	".": "no arrow"
}, br = () => ({
	type: "styling",
	body: [],
	mode: "math",
	style: "display",
	resetFont: !0
}), xr = (e) => e.type === "textord" && e.text === "@", Sr = (e, t) => (e.type === "mathord" || e.type === "atom") && e.text === t;
function Cr(e, t, n) {
	var r = yr[e];
	switch (r) {
		case "\\\\cdrightarrow":
		case "\\\\cdleftarrow": return n.callFunction(r, [t[0]], [t[1]]);
		case "\\uparrow":
		case "\\downarrow":
			var i = n.callFunction("\\\\cdleft", [t[0]], []), a = {
				type: "atom",
				text: r,
				mode: "math",
				family: "rel"
			}, o = {
				type: "ordgroup",
				mode: "math",
				body: [
					i,
					n.callFunction("\\Big", [a], []),
					n.callFunction("\\\\cdright", [t[1]], [])
				]
			};
			return n.callFunction("\\\\cdparent", [o], []);
		case "\\\\cdlongequal": return n.callFunction("\\\\cdlongequal", [], []);
		case "\\Vert": return n.callFunction("\\Big", [{
			type: "textord",
			text: "\\Vert",
			mode: "math"
		}], []);
		default: return {
			type: "textord",
			text: " ",
			mode: "math"
		};
	}
}
function wr(e) {
	var t = [];
	for (e.gullet.beginGroup(), e.gullet.macros.set("\\cr", "\\\\\\relax"), e.gullet.beginGroup();;) {
		t.push(e.parseExpression(!1, "\\\\")), e.gullet.endGroup(), e.gullet.beginGroup();
		var n = e.fetch().text;
		if (n === "&" || n === "\\\\") e.consume();
		else if (n === "\\end") {
			t[t.length - 1].length === 0 && t.pop();
			break;
		} else throw new s("Expected \\\\ or \\cr or \\end", e.nextToken);
	}
	for (var r = [], i = [r], a = 0; a < t.length; a++) {
		for (var o = t[a], c = br(), l = 0; l < o.length; l++) if (!xr(o[l])) c.body.push(o[l]);
		else {
			r.push(c), l += 1;
			var u = lr(o[l]).text, d = [, ,];
			if (d[0] = {
				type: "ordgroup",
				mode: "math",
				body: []
			}, d[1] = {
				type: "ordgroup",
				mode: "math",
				body: []
			}, !"=|.".includes(u)) if ("<>AV".includes(u)) for (var f = 0; f < 2; f++) {
				for (var p = !0, m = l + 1; m < o.length; m++) {
					if (Sr(o[m], u)) {
						p = !1, l = m;
						break;
					}
					if (xr(o[m])) throw new s("Missing a " + u + " character to complete a CD arrow.", o[m]);
					d[f].body.push(o[m]);
				}
				if (p) throw new s("Missing a " + u + " character to complete a CD arrow.", o[l]);
			}
			else throw new s("Expected one of \"<>AV=|.\" after @", o[l]);
			var h = {
				type: "styling",
				body: [Cr(u, d, e)],
				mode: "math",
				style: "display",
				resetFont: !0
			};
			r.push(h), c = br();
		}
		a % 2 == 0 ? r.push(c) : r.shift(), r = [], i.push(r);
	}
	return e.gullet.endGroup(), e.gullet.endGroup(), {
		type: "array",
		mode: "math",
		body: i,
		arraystretch: 1,
		addJot: !0,
		rowGaps: [null],
		cols: Array(i[0].length).fill({
			type: "align",
			align: "c",
			pregap: .25,
			postgap: .25
		}),
		colSeparationType: "CD",
		hLinesBeforeRow: Array(i.length + 1).fill([])
	};
}
H({
	type: "cdlabel",
	names: ["\\\\cdleft", "\\\\cdright"],
	numArgs: 1,
	handler(e, t) {
		var { parser: n, funcName: r } = e;
		return {
			type: "cdlabel",
			mode: n.mode,
			side: r.slice(4),
			label: t[0]
		};
	},
	htmlBuilder(e, t) {
		var n = t.havingStyle(t.style.sup()), r = tn(U(e.label, n, t), t);
		return r.classes.push("cd-label-" + e.side), r.style.bottom = k(.8 - r.depth), r.height = 0, r.depth = 0, r;
	},
	mathmlBuilder(e, t) {
		var n = new W("mrow", [Wn(e.label, t)]);
		return n = new W("mpadded", [n]), n.setAttribute("width", "0"), e.side === "left" && n.setAttribute("lspace", "-1width"), n.setAttribute("voffset", "0.7em"), n = new W("mstyle", [n]), n.setAttribute("displaystyle", "false"), n.setAttribute("scriptlevel", "1"), n;
	}
}), H({
	type: "cdlabelparent",
	names: ["\\\\cdparent"],
	numArgs: 1,
	handler(e, t) {
		var { parser: n } = e;
		return {
			type: "cdlabelparent",
			mode: n.mode,
			fragment: t[0]
		};
	},
	htmlBuilder(e, t) {
		var n = tn(U(e.fragment, t), t);
		return n.classes.push("cd-vert-arrow"), n;
	},
	mathmlBuilder(e, t) {
		return new W("mrow", [Wn(e.fragment, t)]);
	}
}), H({
	type: "textord",
	names: ["\\@char"],
	numArgs: 1,
	allowedInText: !0,
	handler(e, t) {
		for (var { parser: n } = e, r = G(t[0], "ordgroup").body, i = "", a = 0; a < r.length; a++) {
			var o = G(r[a], "textord");
			i += o.text;
		}
		var c = parseInt(i), l;
		if (isNaN(c)) throw new s("\\@char has non-numeric argument " + i);
		if (c < 0 || c >= 1114111) throw new s("\\@char with invalid code point " + i);
		return c <= 65535 ? l = String.fromCharCode(c) : (c -= 65536, l = String.fromCharCode((c >> 10) + 55296, (c & 1023) + 56320)), {
			type: "textord",
			mode: n.mode,
			text: l
		};
	}
}), H({
	type: "color",
	names: ["\\textcolor"],
	numArgs: 2,
	allowedInText: !0,
	argTypes: ["color", "original"],
	handler(e, t) {
		var { parser: n } = e, r = G(t[0], "color-token").color, i = t[1];
		return {
			type: "color",
			mode: n.mode,
			color: r,
			body: yn(i)
		};
	},
	htmlBuilder: (e, t) => en(wn(e.body, t.withColor(e.color), !1)),
	mathmlBuilder: (e, t) => {
		var n = new W("mstyle", Hn(e.body, t.withColor(e.color)));
		return n.setAttribute("mathcolor", e.color), n;
	}
}), H({
	type: "color",
	names: ["\\color"],
	numArgs: 1,
	allowedInText: !0,
	argTypes: ["color"],
	handler(e, t) {
		var { parser: n, breakOnTokenText: r } = e, i = G(t[0], "color-token").color;
		n.gullet.macros.set("\\current@color", i);
		var a = n.parseExpression(!0, r);
		return {
			type: "color",
			mode: n.mode,
			color: i,
			body: a
		};
	}
}), H({
	type: "cr",
	names: ["\\\\"],
	numArgs: 0,
	numOptionalArgs: 0,
	allowedInText: !0,
	handler(e, t, n) {
		var { parser: r } = e, i = r.gullet.future().text === "[" ? r.parseSizeGroup(!0) : null, a = !r.settings.displayMode || !r.settings.useStrictBehavior("newLineInDisplayMode", "In LaTeX, \\\\ or \\newline does nothing in display mode");
		return {
			type: "cr",
			mode: r.mode,
			newLine: a,
			size: i && G(i, "size").value
		};
	},
	htmlBuilder(e, t) {
		var n = B(["mspace"], [], t);
		return e.newLine && (n.classes.push("newline"), e.size && (n.style.marginTop = k(Me(e.size, t)))), n;
	},
	mathmlBuilder(e, t) {
		var n = new W("mspace");
		return e.newLine && (n.setAttribute("linebreak", "newline"), e.size && n.setAttribute("height", k(Me(e.size, t)))), n;
	}
});
var Tr = {
	"\\global": "\\global",
	"\\long": "\\\\globallong",
	"\\\\globallong": "\\\\globallong",
	"\\def": "\\gdef",
	"\\gdef": "\\gdef",
	"\\edef": "\\xdef",
	"\\xdef": "\\xdef",
	"\\let": "\\\\globallet",
	"\\futurelet": "\\\\globalfuture"
}, Er = (e) => {
	var t = e.text;
	if (/^(?:[\\{}$&#^_]|EOF)$/.test(t)) throw new s("Expected a control sequence", e);
	return t;
}, Dr = (e) => {
	var t = e.gullet.popToken();
	return t.text === "=" && (t = e.gullet.popToken(), t.text === " " && (t = e.gullet.popToken())), t;
}, Or = (e, t, n, r) => {
	var i = e.gullet.macros.get(n.text);
	i ??= (n.noexpand = !0, {
		tokens: [n],
		numArgs: 0,
		unexpandable: !e.gullet.isExpandable(n.text)
	}), e.gullet.macros.set(t, i, r);
};
H({
	type: "internal",
	names: [
		"\\global",
		"\\long",
		"\\\\globallong"
	],
	numArgs: 0,
	allowedInText: !0,
	handler(e) {
		var { parser: t, funcName: n } = e;
		t.consumeSpaces();
		var r = t.fetch();
		if (Tr[r.text]) return (n === "\\global" || n === "\\\\globallong") && (r.text = Tr[r.text]), G(t.parseFunction(), "internal");
		throw new s("Invalid token after macro prefix", r);
	}
}), H({
	type: "internal",
	names: [
		"\\def",
		"\\gdef",
		"\\edef",
		"\\xdef"
	],
	numArgs: 0,
	allowedInText: !0,
	primitive: !0,
	handler(e) {
		var { parser: t, funcName: n } = e, r = t.gullet.popToken(), i = r.text;
		if (/^(?:[\\{}$&#^_]|EOF)$/.test(i)) throw new s("Expected a control sequence", r);
		for (var a = 0, o, c = [[]]; t.gullet.future().text !== "{";) if (r = t.gullet.popToken(), r.text === "#") {
			if (t.gullet.future().text === "{") {
				o = t.gullet.future(), c[a].push("{");
				break;
			}
			if (r = t.gullet.popToken(), !/^[1-9]$/.test(r.text)) throw new s("Invalid argument number \"" + r.text + "\"");
			if (parseInt(r.text) !== a + 1) throw new s("Argument number \"" + r.text + "\" out of order");
			a++, c.push([]);
		} else if (r.text === "EOF") throw new s("Expected a macro definition");
		else c[a].push(r.text);
		var { tokens: l } = t.gullet.consumeArg();
		return o && l.unshift(o), (n === "\\edef" || n === "\\xdef") && (l = t.gullet.expandTokens(l), l.reverse()), t.gullet.macros.set(i, {
			tokens: l,
			numArgs: a,
			delimiters: c
		}, n === Tr[n]), {
			type: "internal",
			mode: t.mode
		};
	}
}), H({
	type: "internal",
	names: ["\\let", "\\\\globallet"],
	numArgs: 0,
	allowedInText: !0,
	primitive: !0,
	handler(e) {
		var { parser: t, funcName: n } = e, r = Er(t.gullet.popToken());
		return t.gullet.consumeSpaces(), Or(t, r, Dr(t), n === "\\\\globallet"), {
			type: "internal",
			mode: t.mode
		};
	}
}), H({
	type: "internal",
	names: ["\\futurelet", "\\\\globalfuture"],
	numArgs: 0,
	allowedInText: !0,
	primitive: !0,
	handler(e) {
		var { parser: t, funcName: n } = e, r = Er(t.gullet.popToken()), i = t.gullet.popToken(), a = t.gullet.popToken();
		return Or(t, r, a, n === "\\\\globalfuture"), t.gullet.pushToken(a), t.gullet.pushToken(i), {
			type: "internal",
			mode: t.mode
		};
	}
});
var kr = function(e, t, n) {
	var r = et(rt.math[e] && rt.math[e].replace || e, t, n);
	if (!r) throw Error("Unsupported symbol " + e + " and font size " + t + ".");
	return r;
}, Ar = function(e, t, n, r) {
	var i = n.havingBaseStyle(t), a = B(r.concat(i.sizingClasses(n)), [e], n), o = i.sizeMultiplier / n.sizeMultiplier;
	return a.height *= o, a.depth *= o, a.maxFontSize = i.sizeMultiplier, a;
}, jr = function(e, t, n) {
	var r = t.havingBaseStyle(n), i = (1 - t.sizeMultiplier / r.sizeMultiplier) * t.fontMetrics().axisHeight;
	e.classes.push("delimcenter"), e.style.top = k(i), e.height -= i, e.depth += i;
}, Mr = function(e, t, n, r, i, a) {
	var o = Ar(Wt(e, "Main-Regular", i, r), t, r, a);
	return n && jr(o, r, t), o;
}, Nr = function(e, t, n, r) {
	return Wt(e, "Size" + t + "-Regular", n, r);
}, Pr = function(e, t, n, r, i, a) {
	var o = Nr(e, t, i, r), s = Ar(B(["delimsizing", "size" + t], [o], r), O.TEXT, r, a);
	return n && jr(s, r, O.TEXT), s;
}, Fr = function(e, t, n) {
	return {
		type: "elem",
		elem: B(["delimsizinginner", t === "Size1-Regular" ? "delim-size1" : "delim-size4"], [B([], [Wt(e, t, n)])])
	};
}, Ir = function(e, t, n) {
	var r = Xe["Size4-Regular"][e.charCodeAt(0)] ? Xe["Size4-Regular"][e.charCodeAt(0)][4] : Xe["Size1-Regular"][e.charCodeAt(0)][4], i = Zt([], [new We([new Ge("inner", we(e, Math.round(1e3 * t)))], {
		width: k(r),
		height: k(t),
		style: "width:" + k(r),
		viewBox: "0 0 " + 1e3 * r + " " + Math.round(1e3 * t),
		preserveAspectRatio: "xMinYMin"
	})], n);
	return i.height = t, i.style.height = k(t), i.style.width = k(r), {
		type: "elem",
		elem: i
	};
}, Lr = .008, Rr = {
	type: "kern",
	size: -1 * Lr
}, zr = new Set([
	"|",
	"\\lvert",
	"\\rvert",
	"\\vert"
]), Br = new Set([
	"\\|",
	"\\lVert",
	"\\rVert",
	"\\Vert"
]), Vr = function(e, t, n, r, i, a) {
	var o, s, c, l, u = "", d = 0;
	o = c = l = e, s = null;
	var f = "Size1-Regular";
	e === "\\uparrow" ? c = l = "⏐" : e === "\\Uparrow" ? c = l = "‖" : e === "\\downarrow" ? o = c = "⏐" : e === "\\Downarrow" ? o = c = "‖" : e === "\\updownarrow" ? (o = "\\uparrow", c = "⏐", l = "\\downarrow") : e === "\\Updownarrow" ? (o = "\\Uparrow", c = "‖", l = "\\Downarrow") : zr.has(e) ? (c = "∣", u = "vert", d = 333) : Br.has(e) ? (c = "∥", u = "doublevert", d = 556) : e === "[" || e === "\\lbrack" ? (o = "⎡", c = "⎢", l = "⎣", f = "Size4-Regular", u = "lbrack", d = 667) : e === "]" || e === "\\rbrack" ? (o = "⎤", c = "⎥", l = "⎦", f = "Size4-Regular", u = "rbrack", d = 667) : e === "\\lfloor" || e === "⌊" ? (c = o = "⎢", l = "⎣", f = "Size4-Regular", u = "lfloor", d = 667) : e === "\\lceil" || e === "⌈" ? (o = "⎡", c = l = "⎢", f = "Size4-Regular", u = "lceil", d = 667) : e === "\\rfloor" || e === "⌋" ? (c = o = "⎥", l = "⎦", f = "Size4-Regular", u = "rfloor", d = 667) : e === "\\rceil" || e === "⌉" ? (o = "⎤", c = l = "⎥", f = "Size4-Regular", u = "rceil", d = 667) : e === "(" || e === "\\lparen" ? (o = "⎛", c = "⎜", l = "⎝", f = "Size4-Regular", u = "lparen", d = 875) : e === ")" || e === "\\rparen" ? (o = "⎞", c = "⎟", l = "⎠", f = "Size4-Regular", u = "rparen", d = 875) : e === "\\{" || e === "\\lbrace" ? (o = "⎧", s = "⎨", l = "⎩", c = "⎪", f = "Size4-Regular") : e === "\\}" || e === "\\rbrace" ? (o = "⎫", s = "⎬", l = "⎭", c = "⎪", f = "Size4-Regular") : e === "\\lgroup" || e === "⟮" ? (o = "⎧", l = "⎩", c = "⎪", f = "Size4-Regular") : e === "\\rgroup" || e === "⟯" ? (o = "⎫", l = "⎭", c = "⎪", f = "Size4-Regular") : e === "\\lmoustache" || e === "⎰" ? (o = "⎧", l = "⎭", c = "⎪", f = "Size4-Regular") : (e === "\\rmoustache" || e === "⎱") && (o = "⎫", l = "⎩", c = "⎪", f = "Size4-Regular");
	var p = kr(o, f, i), m = p.height + p.depth, h = kr(c, f, i), g = h.height + h.depth, _ = kr(l, f, i), v = _.height + _.depth, y = 0, b = 1;
	if (s !== null) {
		var x = kr(s, f, i);
		y = x.height + x.depth, b = 2;
	}
	var S = m + v + y, C = S + Math.max(0, Math.ceil((t - S) / (b * g))) * b * g, w = r.fontMetrics().axisHeight;
	n && (w *= r.sizeMultiplier);
	var T = C / 2 - w, E = [];
	if (u.length > 0) {
		var ee = C - m - v, te = Math.round(C * 1e3), ne = Ee(u, Math.round(ee * 1e3)), D = new Ge(u, ne), re = k(d / 1e3), ie = k(te / 1e3), ae = Zt([], [new We([D], {
			width: re,
			height: ie,
			viewBox: "0 0 " + d + " " + te
		})], r);
		ae.height = te / 1e3, ae.style.width = re, ae.style.height = ie, E.push({
			type: "elem",
			elem: ae
		});
	} else {
		if (E.push(Fr(l, f, i)), E.push(Rr), s === null) {
			var oe = C - m - v + 2 * Lr;
			E.push(Ir(c, oe, r));
		} else {
			var se = (C - m - v - y) / 2 + 2 * Lr;
			E.push(Ir(c, se, r)), E.push(Rr), E.push(Fr(s, f, i)), E.push(Rr), E.push(Ir(c, se, r));
		}
		E.push(Rr), E.push(Fr(o, f, i));
	}
	var ce = r.havingBaseStyle(O.TEXT);
	return Ar(B(["delimsizing", "mult"], [V({
		positionType: "bottom",
		positionData: T,
		children: E
	})], ce), O.TEXT, r, a);
}, Hr = 80, Ur = .08, Wr = function(e, t, n, r, i) {
	return Zt(["hide-tail"], [new We([new Ge(e, Ce(e, r, n))], {
		width: "400em",
		height: k(t),
		viewBox: "0 0 400000 " + n,
		preserveAspectRatio: "xMinYMin slice"
	})], i);
}, Gr = function(e, t) {
	var n = t.havingBaseSizing(), r = ti("\\surd", e * n.sizeMultiplier, $r, n), i = n.sizeMultiplier, a = Math.max(0, t.minRuleThickness - t.fontMetrics().sqrtRuleThickness), o, s, c, l, u;
	return r.type === "small" ? (l = 1e3 + 1e3 * a + Hr, e < 1 ? i = 1 : e < 1.4 && (i = .7), s = (1 + a + Ur) / i, c = (1 + a) / i, o = Wr("sqrtMain", s, l, a, t), o.style.minWidth = "0.853em", u = .833 / i) : r.type === "large" ? (l = (1e3 + Hr) * Yr[r.size], c = (Yr[r.size] + a) / i, s = (Yr[r.size] + a + Ur) / i, o = Wr("sqrtSize" + r.size, s, l, a, t), o.style.minWidth = "1.02em", u = 1 / i) : (s = e + a + Ur, c = e + a, l = Math.floor(1e3 * e + a) + Hr, o = Wr("sqrtTall", s, l, a, t), o.style.minWidth = "0.742em", u = 1.056), o.height = c, o.style.height = k(s), {
		span: o,
		advanceWidth: u,
		ruleWidth: (t.fontMetrics().sqrtRuleThickness + a) * i
	};
}, Kr = new Set([
	"(",
	"\\lparen",
	")",
	"\\rparen",
	"[",
	"\\lbrack",
	"]",
	"\\rbrack",
	"\\{",
	"\\lbrace",
	"\\}",
	"\\rbrace",
	"\\lfloor",
	"\\rfloor",
	"⌊",
	"⌋",
	"\\lceil",
	"\\rceil",
	"⌈",
	"⌉",
	"\\surd"
]), qr = new Set([
	"\\uparrow",
	"\\downarrow",
	"\\updownarrow",
	"\\Uparrow",
	"\\Downarrow",
	"\\Updownarrow",
	"|",
	"\\|",
	"\\vert",
	"\\Vert",
	"\\lvert",
	"\\rvert",
	"\\lVert",
	"\\rVert",
	"\\lgroup",
	"\\rgroup",
	"⟮",
	"⟯",
	"\\lmoustache",
	"\\rmoustache",
	"⎰",
	"⎱"
]), Jr = new Set([
	"<",
	">",
	"\\langle",
	"\\rangle",
	"/",
	"\\backslash",
	"\\lt",
	"\\gt"
]), Yr = [
	0,
	1.2,
	1.8,
	2.4,
	3
], Xr = function(e, t, n, r, i) {
	if (e === "<" || e === "\\lt" || e === "⟨" ? e = "\\langle" : (e === ">" || e === "\\gt" || e === "⟩") && (e = "\\rangle"), Kr.has(e) || Jr.has(e)) return Pr(e, t, !1, n, r, i);
	if (qr.has(e)) return Vr(e, Yr[t], !1, n, r, i);
	throw new s("Illegal delimiter: '" + e + "'");
}, Zr = [
	{
		type: "small",
		style: O.SCRIPTSCRIPT
	},
	{
		type: "small",
		style: O.SCRIPT
	},
	{
		type: "small",
		style: O.TEXT
	},
	{
		type: "large",
		size: 1
	},
	{
		type: "large",
		size: 2
	},
	{
		type: "large",
		size: 3
	},
	{
		type: "large",
		size: 4
	}
], Qr = [
	{
		type: "small",
		style: O.SCRIPTSCRIPT
	},
	{
		type: "small",
		style: O.SCRIPT
	},
	{
		type: "small",
		style: O.TEXT
	},
	{ type: "stack" }
], $r = [
	{
		type: "small",
		style: O.SCRIPTSCRIPT
	},
	{
		type: "small",
		style: O.SCRIPT
	},
	{
		type: "small",
		style: O.TEXT
	},
	{
		type: "large",
		size: 1
	},
	{
		type: "large",
		size: 2
	},
	{
		type: "large",
		size: 3
	},
	{
		type: "large",
		size: 4
	},
	{ type: "stack" }
], ei = function(e) {
	if (e.type === "small") return "Main-Regular";
	if (e.type === "large") return "Size" + e.size + "-Regular";
	if (e.type === "stack") return "Size4-Regular";
	var t = e.type;
	throw Error("Add support for delim type '" + t + "' here.");
}, ti = function(e, t, n, r) {
	for (var i = Math.min(2, 3 - r.style.size); i < n.length; i++) {
		var a = n[i];
		if (a.type === "stack") break;
		var o = kr(e, ei(a), "math"), s = o.height + o.depth;
		if (a.type === "small") {
			var c = r.havingBaseStyle(a.style);
			s *= c.sizeMultiplier;
		}
		if (s > t) return a;
	}
	return n[n.length - 1];
}, ni = function(e, t, n, r, i, a) {
	e === "<" || e === "\\lt" || e === "⟨" ? e = "\\langle" : (e === ">" || e === "\\gt" || e === "⟩") && (e = "\\rangle");
	var o = Jr.has(e) ? Zr : Kr.has(e) ? $r : Qr, s = ti(e, t, o, r);
	return s.type === "small" ? Mr(e, s.style, n, r, i, a) : s.type === "large" ? Pr(e, s.size, n, r, i, a) : Vr(e, t, n, r, i, a);
}, ri = function(e, t, n, r, i, a) {
	var o = r.fontMetrics().axisHeight * r.sizeMultiplier, s = 901, c = 5 / r.fontMetrics().ptPerEm, l = Math.max(t - o, n + o);
	return ni(e, Math.max(l / 500 * s, 2 * l - c), !0, r, i, a);
}, ii = {
	"\\bigl": {
		mclass: "mopen",
		size: 1
	},
	"\\Bigl": {
		mclass: "mopen",
		size: 2
	},
	"\\biggl": {
		mclass: "mopen",
		size: 3
	},
	"\\Biggl": {
		mclass: "mopen",
		size: 4
	},
	"\\bigr": {
		mclass: "mclose",
		size: 1
	},
	"\\Bigr": {
		mclass: "mclose",
		size: 2
	},
	"\\biggr": {
		mclass: "mclose",
		size: 3
	},
	"\\Biggr": {
		mclass: "mclose",
		size: 4
	},
	"\\bigm": {
		mclass: "mrel",
		size: 1
	},
	"\\Bigm": {
		mclass: "mrel",
		size: 2
	},
	"\\biggm": {
		mclass: "mrel",
		size: 3
	},
	"\\Biggm": {
		mclass: "mrel",
		size: 4
	},
	"\\big": {
		mclass: "mord",
		size: 1
	},
	"\\Big": {
		mclass: "mord",
		size: 2
	},
	"\\bigg": {
		mclass: "mord",
		size: 3
	},
	"\\Bigg": {
		mclass: "mord",
		size: 4
	}
}, ai = new Set(/* @__PURE__ */ "(,\\lparen,),\\rparen,[,\\lbrack,],\\rbrack,\\{,\\lbrace,\\},\\rbrace,\\lfloor,\\rfloor,⌊,⌋,\\lceil,\\rceil,⌈,⌉,<,>,\\langle,⟨,\\rangle,⟩,\\lt,\\gt,\\lvert,\\rvert,\\lVert,\\rVert,\\lgroup,\\rgroup,⟮,⟯,\\lmoustache,\\rmoustache,⎰,⎱,/,\\backslash,|,\\vert,\\|,\\Vert,\\uparrow,\\Uparrow,\\downarrow,\\Downarrow,\\updownarrow,\\Updownarrow,.".split(","));
function oi(e) {
	return "isMiddle" in e;
}
function si(e, t) {
	var n = ur(e);
	if (n && ai.has(n.text)) return n;
	throw n ? new s("Invalid delimiter '" + n.text + "' after '" + t.funcName + "'", e) : new s("Invalid delimiter type '" + e.type + "'", e);
}
H({
	type: "delimsizing",
	names: [
		"\\bigl",
		"\\Bigl",
		"\\biggl",
		"\\Biggl",
		"\\bigr",
		"\\Bigr",
		"\\biggr",
		"\\Biggr",
		"\\bigm",
		"\\Bigm",
		"\\biggm",
		"\\Biggm",
		"\\big",
		"\\Big",
		"\\bigg",
		"\\Bigg"
	],
	numArgs: 1,
	argTypes: ["primitive"],
	handler: (e, t) => {
		var n = si(t[0], e);
		return {
			type: "delimsizing",
			mode: e.parser.mode,
			size: ii[e.funcName].size,
			mclass: ii[e.funcName].mclass,
			delim: n.text
		};
	},
	htmlBuilder: (e, t) => e.delim === "." ? B([e.mclass]) : Xr(e.delim, e.size, t, e.mode, [e.mclass]),
	mathmlBuilder: (e) => {
		var t = [];
		e.delim !== "." && t.push(Ln(e.delim, e.mode));
		var n = new W("mo", t);
		e.mclass === "mopen" || e.mclass === "mclose" ? n.setAttribute("fence", "true") : n.setAttribute("fence", "false"), n.setAttribute("stretchy", "true");
		var r = k(Yr[e.size]);
		return n.setAttribute("minsize", r), n.setAttribute("maxsize", r), n;
	}
});
function ci(e) {
	if (!e.body) throw Error("Bug: The leftright ParseNode wasn't fully parsed.");
}
H({
	type: "leftright-right",
	names: ["\\right"],
	numArgs: 1,
	primitive: !0,
	handler: (e, t) => {
		var n = e.parser.gullet.macros.get("\\current@color");
		if (n && typeof n != "string") throw new s("\\current@color set to non-string in \\right");
		return {
			type: "leftright-right",
			mode: e.parser.mode,
			delim: si(t[0], e).text,
			color: n
		};
	}
}), H({
	type: "leftright",
	names: ["\\left"],
	numArgs: 1,
	primitive: !0,
	handler: (e, t) => {
		var n = si(t[0], e), r = e.parser;
		++r.leftrightDepth;
		var i = r.parseExpression(!1);
		--r.leftrightDepth, r.expect("\\right", !1);
		var a = G(r.parseFunction(), "leftright-right");
		return {
			type: "leftright",
			mode: r.mode,
			body: i,
			left: n.text,
			right: a.delim,
			rightColor: a.color
		};
	},
	htmlBuilder: (e, t) => {
		ci(e);
		for (var n = wn(e.body, t, !0, ["mopen", "mclose"]), r = 0, i = 0, a = !1, o = 0; o < n.length; o++) {
			var s = n[o];
			oi(s) ? a = !0 : (r = Math.max(n[o].height, r), i = Math.max(n[o].depth, i));
		}
		r *= t.sizeMultiplier, i *= t.sizeMultiplier;
		var c = e.left === "." ? kn(t, ["mopen"]) : ri(e.left, r, i, t, e.mode, ["mopen"]);
		if (n.unshift(c), a) for (var l = 1; l < n.length; l++) {
			var u = n[l];
			if (oi(u)) {
				var d = u.isMiddle;
				n[l] = ri(d.delim, r, i, d.options, e.mode, []);
			}
		}
		var f;
		if (e.right === ".") f = kn(t, ["mclose"]);
		else {
			var p = e.rightColor ? t.withColor(e.rightColor) : t;
			f = ri(e.right, r, i, p, e.mode, ["mclose"]);
		}
		return n.push(f), B(["minner"], n, t);
	},
	mathmlBuilder: (e, t) => {
		ci(e);
		var n = Hn(e.body, t);
		if (e.left !== ".") {
			var r = new W("mo", [Ln(e.left, e.mode)]);
			r.setAttribute("fence", "true"), n.unshift(r);
		}
		if (e.right !== ".") {
			var i = new W("mo", [Ln(e.right, e.mode)]);
			i.setAttribute("fence", "true"), e.rightColor && i.setAttribute("mathcolor", e.rightColor), n.push(i);
		}
		return Rn(n);
	}
}), H({
	type: "middle",
	names: ["\\middle"],
	numArgs: 1,
	primitive: !0,
	handler: (e, t) => {
		var n = si(t[0], e);
		if (!e.parser.leftrightDepth) throw new s("\\middle without preceding \\left", n);
		return {
			type: "middle",
			mode: e.parser.mode,
			delim: n.text
		};
	},
	htmlBuilder: (e, t) => {
		var n;
		return e.delim === "." ? n = kn(t, []) : (n = Xr(e.delim, 1, t, e.mode, []), n.isMiddle = {
			delim: e.delim,
			options: t
		}), n;
	},
	mathmlBuilder: (e, t) => {
		var n = new W("mo", [e.delim === "\\vert" || e.delim === "|" ? Ln("|", "text") : Ln(e.delim, e.mode)]);
		return n.setAttribute("fence", "true"), n.setAttribute("lspace", "0.05em"), n.setAttribute("rspace", "0.05em"), n;
	}
}), H({
	type: "enclose",
	names: ["\\colorbox"],
	numArgs: 2,
	allowedInText: !0,
	argTypes: ["color", "hbox"],
	handler(e, t, n) {
		var { parser: r, funcName: i } = e, a = G(t[0], "color-token").color, o = t[1];
		return {
			type: "enclose",
			mode: r.mode,
			label: i,
			backgroundColor: a,
			body: o
		};
	},
	htmlBuilder: (e, t) => {
		var n = tn(U(e.body, t), t), r = e.label.slice(1), i = t.sizeMultiplier, a, o, s = h(e.body);
		if (r === "sout") a = B(["stretchy", "sout"]), a.height = t.fontMetrics().defaultRuleThickness / i, o = -.5 * t.fontMetrics().xHeight;
		else if (r === "phase") {
			var c = Me({
				number: .6,
				unit: "pt"
			}, t), l = Me({
				number: .35,
				unit: "ex"
			}, t), u = t.havingBaseSizing();
			i /= u.sizeMultiplier;
			var d = n.height + n.depth + c + l;
			n.style.paddingLeft = k(d / 2 + c);
			var f = Math.floor(1e3 * d * i);
			a = Zt(["hide-tail"], [new We([new Ge("phase", xe(f))], {
				width: "400em",
				height: k(f / 1e3),
				viewBox: "0 0 400000 " + f,
				preserveAspectRatio: "xMinYMin slice"
			})], t), a.style.height = k(d), o = n.depth + c + l;
		} else {
			/cancel/.test(r) ? s || n.classes.push("cancel-pad") : r === "angl" ? n.classes.push("anglpad") : n.classes.push("boxpad");
			var p, m, g = 0;
			/box/.test(r) ? (g = Math.max(t.fontMetrics().fboxrule, t.minRuleThickness), p = t.fontMetrics().fboxsep + (r === "colorbox" ? 0 : g), m = p) : r === "angl" ? (g = Math.max(t.fontMetrics().defaultRuleThickness, t.minRuleThickness), p = 4 * g, m = Math.max(0, .25 - n.depth)) : (p = s ? .2 : 0, m = p), a = ar(n, r, p, m, t), /fbox|boxed|fcolorbox/.test(r) ? (a.style.borderStyle = "solid", a.style.borderWidth = k(g)) : r === "angl" && g !== .049 && (a.style.borderTopWidth = k(g), a.style.borderRightWidth = k(g)), o = n.depth + m, e.backgroundColor && (a.style.backgroundColor = e.backgroundColor, e.borderColor && (a.style.borderColor = e.borderColor));
		}
		var _;
		if (e.backgroundColor) _ = V({
			positionType: "individualShift",
			children: [{
				type: "elem",
				elem: a,
				shift: o
			}, {
				type: "elem",
				elem: n,
				shift: 0
			}]
		});
		else {
			var v = /cancel|phase/.test(r) ? ["svg-align"] : [];
			_ = V({
				positionType: "individualShift",
				children: [{
					type: "elem",
					elem: n,
					shift: 0
				}, {
					type: "elem",
					elem: a,
					shift: o,
					wrapperClasses: v
				}]
			});
		}
		return /cancel/.test(r) && (_.height = n.height, _.depth = n.depth), /cancel/.test(r) && !s ? B(["mord", "cancel-lap"], [_], t) : B(["mord"], [_], t);
	},
	mathmlBuilder: (e, t) => {
		var n, r = new W(e.label.includes("colorbox") ? "mpadded" : "menclose", [Wn(e.body, t)]);
		switch (e.label) {
			case "\\cancel":
				r.setAttribute("notation", "updiagonalstrike");
				break;
			case "\\bcancel":
				r.setAttribute("notation", "downdiagonalstrike");
				break;
			case "\\phase":
				r.setAttribute("notation", "phasorangle");
				break;
			case "\\sout":
				r.setAttribute("notation", "horizontalstrike");
				break;
			case "\\fbox":
				r.setAttribute("notation", "box");
				break;
			case "\\angl":
				r.setAttribute("notation", "actuarial");
				break;
			case "\\fcolorbox":
			case "\\colorbox":
				if (n = t.fontMetrics().fboxsep * t.fontMetrics().ptPerEm, r.setAttribute("width", "+" + 2 * n + "pt"), r.setAttribute("height", "+" + 2 * n + "pt"), r.setAttribute("lspace", n + "pt"), r.setAttribute("voffset", n + "pt"), e.label === "\\fcolorbox") {
					var i = Math.max(t.fontMetrics().fboxrule, t.minRuleThickness);
					r.setAttribute("style", "border: " + k(i) + " solid " + e.borderColor);
				}
				break;
			case "\\xcancel":
				r.setAttribute("notation", "updiagonalstrike downdiagonalstrike");
				break;
		}
		return e.backgroundColor && r.setAttribute("mathbackground", e.backgroundColor), r;
	}
}), H({
	type: "enclose",
	names: ["\\fcolorbox"],
	numArgs: 3,
	allowedInText: !0,
	argTypes: [
		"color",
		"color",
		"hbox"
	],
	handler(e, t, n) {
		var { parser: r, funcName: i } = e, a = G(t[0], "color-token").color, o = G(t[1], "color-token").color, s = t[2];
		return {
			type: "enclose",
			mode: r.mode,
			label: i,
			backgroundColor: o,
			borderColor: a,
			body: s
		};
	}
}), H({
	type: "enclose",
	names: ["\\fbox"],
	numArgs: 1,
	argTypes: ["hbox"],
	allowedInText: !0,
	handler(e, t) {
		var { parser: n } = e;
		return {
			type: "enclose",
			mode: n.mode,
			label: "\\fbox",
			body: t[0]
		};
	}
}), H({
	type: "enclose",
	names: [
		"\\cancel",
		"\\bcancel",
		"\\xcancel",
		"\\phase"
	],
	numArgs: 1,
	handler(e, t) {
		var { parser: n, funcName: r } = e, i = t[0];
		return {
			type: "enclose",
			mode: n.mode,
			label: r,
			body: i
		};
	}
}), H({
	type: "enclose",
	names: ["\\sout"],
	numArgs: 1,
	allowedInText: !0,
	handler(e, t) {
		var { parser: n, funcName: r } = e;
		n.mode === "math" && n.settings.reportNonstrict("mathVsSout", "LaTeX's \\sout works only in text mode");
		var i = t[0];
		return {
			type: "enclose",
			mode: n.mode,
			label: r,
			body: i
		};
	}
}), H({
	type: "enclose",
	names: ["\\angl"],
	numArgs: 1,
	argTypes: ["hbox"],
	allowedInText: !1,
	handler(e, t) {
		var { parser: n } = e;
		return {
			type: "enclose",
			mode: n.mode,
			label: "\\angl",
			body: t[0]
		};
	}
});
var li = {};
function ui(e) {
	for (var { type: t, names: n, props: r, handler: i, htmlBuilder: a, mathmlBuilder: o } = e, s = {
		type: t,
		numArgs: r.numArgs || 0,
		allowedInText: !1,
		numOptionalArgs: 0,
		handler: i
	}, c = 0; c < n.length; ++c) li[n[c]] = s;
	a && (hn[t] = a), o && (gn[t] = o);
}
var di = {};
function K(e, t) {
	di[e] = t;
}
var fi = class e {
	constructor(e, t, n) {
		this.lexer = void 0, this.start = void 0, this.end = void 0, this.lexer = e, this.start = t, this.end = n;
	}
	static range(t, n) {
		return n ? !t || !t.loc || !n.loc || t.loc.lexer !== n.loc.lexer ? null : new e(t.loc.lexer, t.loc.start, n.loc.end) : t && t.loc;
	}
}, pi = class e {
	constructor(e, t) {
		this.text = void 0, this.loc = void 0, this.noexpand = void 0, this.treatAsRelax = void 0, this.text = e, this.loc = t;
	}
	range(t, n) {
		return new e(n, fi.range(this, t));
	}
};
function mi(e) {
	var t = [];
	e.consumeSpaces();
	var n = e.fetch().text;
	for (n === "\\relax" && (e.consume(), e.consumeSpaces(), n = e.fetch().text); n === "\\hline" || n === "\\hdashline";) e.consume(), t.push(n === "\\hdashline"), e.consumeSpaces(), n = e.fetch().text;
	return t;
}
var hi = (e) => {
	if (!e.parser.settings.displayMode) throw new s("{" + e.envName + "} can be used only in display mode.");
}, gi = new Set(["gather", "gather*"]);
function _i(e) {
	if (!e.includes("ed")) return !e.includes("*");
}
function vi(e, t, n) {
	var { hskipBeforeAndAfter: r, addJot: i, cols: a, arraystretch: o, colSeparationType: c, autoTag: l, singleRow: u, emptySingleRow: d, maxNumCols: f, leqno: p } = t;
	if (e.gullet.beginGroup(), u || e.gullet.macros.set("\\cr", "\\\\\\relax"), !o) {
		var m = e.gullet.expandMacroAsText("\\arraystretch");
		if (m == null) o = 1;
		else if (o = parseFloat(m), !o || o < 0) throw new s("Invalid \\arraystretch: " + m);
	}
	e.gullet.beginGroup();
	var h = [], g = [h], _ = [], v = [], y = l == null ? void 0 : [];
	function b() {
		l && e.gullet.macros.set("\\@eqnsw", "1", !0);
	}
	function x() {
		y && (e.gullet.macros.get("\\df@tag") ? (y.push(e.subparse([new pi("\\df@tag")])), e.gullet.macros.set("\\df@tag", void 0, !0)) : y.push(!!l && e.gullet.macros.get("\\@eqnsw") === "1"));
	}
	for (b(), v.push(mi(e));;) {
		var S = e.parseExpression(!1, u ? "\\end" : "\\\\");
		e.gullet.endGroup(), e.gullet.beginGroup();
		var C = {
			type: "ordgroup",
			mode: e.mode,
			body: S
		};
		n && (C = {
			type: "styling",
			mode: e.mode,
			style: n,
			resetFont: !0,
			body: [C]
		}), h.push(C);
		var w = e.fetch().text;
		if (w === "&") {
			if (f && h.length === f) {
				if (u || c) throw new s("Too many tab characters: &", e.nextToken);
				e.settings.reportNonstrict("textEnv", "Too few columns specified in the {array} column argument.");
			}
			e.consume();
		} else if (w === "\\end") {
			x(), h.length === 1 && C.type === "styling" && C.body.length === 1 && C.body[0].type === "ordgroup" && C.body[0].body.length === 0 && (g.length > 1 || !d) && g.pop(), v.length < g.length + 1 && v.push([]);
			break;
		} else if (w === "\\\\") {
			e.consume();
			var T = void 0;
			e.gullet.future().text !== " " && (T = e.parseSizeGroup(!0)), _.push(T ? T.value : null), x(), v.push(mi(e)), h = [], g.push(h), b();
		} else throw new s("Expected & or \\\\ or \\cr or \\end", e.nextToken);
	}
	return e.gullet.endGroup(), e.gullet.endGroup(), {
		type: "array",
		mode: e.mode,
		addJot: i,
		arraystretch: o,
		body: g,
		cols: a,
		rowGaps: _,
		hskipBeforeAndAfter: r,
		hLinesBeforeRow: v,
		colSeparationType: c,
		tags: y,
		leqno: p
	};
}
function yi(e) {
	return e.slice(0, 1) === "d" ? "display" : "text";
}
var bi = function(e, t) {
	var n, r, i = e.body.length, a = e.hLinesBeforeRow, o = 0, c = Array(i), l = [], u = Math.max(t.fontMetrics().arrayRuleWidth, t.minRuleThickness), d = 1 / t.fontMetrics().ptPerEm, f = 5 * d;
	e.colSeparationType && e.colSeparationType === "small" && (f = .2778 * (t.havingStyle(O.SCRIPT).sizeMultiplier / t.sizeMultiplier));
	var p = e.colSeparationType === "CD" ? Me({
		number: 3,
		unit: "ex"
	}, t) : 12 * d, m = 3 * d, h = e.arraystretch * p, g = .7 * h, _ = .3 * h, v = 0;
	function y(e) {
		for (var t = 0; t < e.length; ++t) t > 0 && (v += .25), l.push({
			pos: v,
			isDashed: e[t]
		});
	}
	for (y(a[0]), n = 0; n < e.body.length; ++n) {
		var b = e.body[n], x = g, S = _;
		o < b.length && (o = b.length);
		var C = {
			cells: Array(b.length),
			height: 0,
			depth: 0,
			pos: 0
		};
		for (r = 0; r < b.length; ++r) {
			var w = U(b[r], t);
			S < w.depth && (S = w.depth), x < w.height && (x = w.height), C.cells[r] = w;
		}
		var T = e.rowGaps[n], E = 0;
		T && (E = Me(T, t), E > 0 && (E += _, S < E && (S = E), E = 0)), e.addJot && n < e.body.length - 1 && (S += m), C.height = x, C.depth = S, v += x, C.pos = v, v += S + E, c[n] = C, y(a[n + 1]);
	}
	var ee = v / 2 + t.fontMetrics().axisHeight, te = e.cols || [], ne = [], D, re, ie = [];
	if (e.tags && e.tags.some((e) => e)) for (n = 0; n < i; ++n) {
		var ae = c[n], oe = ae.pos - ee, se = e.tags[n], ce = void 0;
		ce = se === !0 ? B(["eqn-num"], [], t) : se === !1 ? B([], [], t) : B([], wn(se, t, !0), t), ce.depth = ae.depth, ce.height = ae.height, ie.push({
			type: "elem",
			elem: ce,
			shift: oe
		});
	}
	for (r = 0, re = 0; r < o || re < te.length; ++r, ++re) {
		for (var le = te[re], ue = !0; (de = le)?.type === "separator";) {
			var de;
			if (ue || (D = B(["arraycolsep"], []), D.style.width = k(t.fontMetrics().doubleRuleSep), ne.push(D)), le.separator === "|" || le.separator === ":") {
				var fe = le.separator === "|" ? "solid" : "dashed", pe = B(["vertical-separator"], [], t);
				pe.style.height = k(v), pe.style.borderRightWidth = k(u), pe.style.borderRightStyle = fe, pe.style.margin = "0 " + k(-u / 2);
				var me = v - ee;
				me && (pe.style.verticalAlign = k(-me)), ne.push(pe);
			} else throw new s("Invalid separator type: " + le.separator);
			re++, le = te[re], ue = !1;
		}
		if (!(r >= o)) {
			var he = void 0;
			(r > 0 || e.hskipBeforeAndAfter) && (he = le?.pregap ?? f, he !== 0 && (D = B(["arraycolsep"], []), D.style.width = k(he), ne.push(D)));
			var ge = [];
			for (n = 0; n < i; ++n) {
				var _e = c[n], ve = _e.cells[r];
				if (ve) {
					var ye = _e.pos - ee;
					ve.depth = _e.depth, ve.height = _e.height, ge.push({
						type: "elem",
						elem: ve,
						shift: ye
					});
				}
			}
			var be = V({
				positionType: "individualShift",
				children: ge
			}), xe = B(["col-align-" + (le?.align || "c")], [be]);
			ne.push(xe), (r < o - 1 || e.hskipBeforeAndAfter) && (he = le?.postgap ?? f, he !== 0 && (D = B(["arraycolsep"], []), D.style.width = k(he), ne.push(D)));
		}
	}
	var Se = B(["mtable"], ne);
	if (l.length > 0) {
		for (var Ce = Qt("hline", t, u), we = Qt("hdashline", t, u), Te = [{
			type: "elem",
			elem: Se,
			shift: 0
		}]; l.length > 0;) {
			var Ee = l.pop(), De = Ee.pos - ee;
			Ee.isDashed ? Te.push({
				type: "elem",
				elem: we,
				shift: De
			}) : Te.push({
				type: "elem",
				elem: Ce,
				shift: De
			});
		}
		Se = V({
			positionType: "individualShift",
			children: Te
		});
	}
	if (ie.length === 0) return B(["mord"], [Se], t);
	var Oe = B(["tag"], [V({
		positionType: "individualShift",
		children: ie
	})], t);
	return en([Se, Oe]);
}, xi = {
	c: "center ",
	l: "left ",
	r: "right "
}, Si = function(e, t) {
	for (var n = [], r = new W("mtd", [], ["mtr-glue"]), i = new W("mtd", [], ["mml-eqn-num"]), a = 0; a < e.body.length; a++) {
		for (var o = e.body[a], s = [], c = 0; c < o.length; c++) s.push(new W("mtd", [Wn(o[c], t)]));
		e.tags && e.tags[a] && (s.unshift(r), s.push(r), e.leqno ? s.unshift(i) : s.push(i)), n.push(new W("mtr", s));
	}
	var l = new W("mtable", n), u = e.arraystretch === .5 ? .1 : .16 + e.arraystretch - 1 + (e.addJot ? .09 : 0);
	l.setAttribute("rowspacing", k(u));
	var d = "", f = "";
	if (e.cols && e.cols.length > 0) {
		var p = e.cols, m = "", h = !1, g = 0, _ = p.length;
		p[0].type === "separator" && (d += "top ", g = 1), p[p.length - 1].type === "separator" && (d += "bottom ", --_);
		for (var v = g; v < _; v++) {
			var y = p[v];
			y.type === "align" ? (f += xi[y.align], h && (m += "none "), h = !0) : y.type === "separator" && (h &&= (m += y.separator === "|" ? "solid " : "dashed ", !1));
		}
		l.setAttribute("columnalign", f.trim()), /[sd]/.test(m) && l.setAttribute("columnlines", m.trim());
	}
	if (e.colSeparationType === "align") {
		for (var b = e.cols || [], x = "", S = 1; S < b.length; S++) x += S % 2 ? "0em " : "1em ";
		l.setAttribute("columnspacing", x.trim());
	} else e.colSeparationType === "alignat" || e.colSeparationType === "gather" ? l.setAttribute("columnspacing", "0em") : e.colSeparationType === "small" ? l.setAttribute("columnspacing", "0.2778em") : e.colSeparationType === "CD" ? l.setAttribute("columnspacing", "0.5em") : l.setAttribute("columnspacing", "1em");
	var C = "", w = e.hLinesBeforeRow;
	d += w[0].length > 0 ? "left " : "", d += w[w.length - 1].length > 0 ? "right " : "";
	for (var T = 1; T < w.length - 1; T++) C += w[T].length === 0 ? "none " : w[T][0] ? "dashed " : "solid ";
	return /[sd]/.test(C) && l.setAttribute("rowlines", C.trim()), d !== "" && (l = new W("menclose", [l]), l.setAttribute("notation", d.trim())), e.arraystretch && e.arraystretch < 1 && (l = new W("mstyle", [l]), l.setAttribute("scriptlevel", "1")), l;
}, Ci = function(e, t) {
	e.envName.includes("ed") || hi(e);
	var n = [], r = e.envName === "split", i = vi(e.parser, {
		cols: n,
		addJot: !0,
		autoTag: r ? void 0 : _i(e.envName),
		emptySingleRow: !0,
		colSeparationType: e.envName.includes("at") ? "alignat" : "align",
		maxNumCols: r ? 2 : void 0,
		leqno: e.parser.settings.leqno
	}, "display"), a = 0, o = 0, c = {
		type: "ordgroup",
		mode: e.mode,
		body: []
	};
	if (t[0] && t[0].type === "ordgroup") {
		for (var l = "", u = 0; u < t[0].body.length; u++) {
			var d = G(t[0].body[u], "textord");
			l += d.text;
		}
		a = Number(l), o = a * 2;
	}
	var f = !o;
	i.body.forEach(function(e) {
		for (var t = 1; t < e.length; t += 2) G(G(e[t], "styling").body[0], "ordgroup").body.unshift(c);
		if (f) o < e.length && (o = e.length);
		else {
			var n = e.length / 2;
			if (a < n) throw new s("Too many math in a row: " + ("expected " + a + ", but got " + n), e[0]);
		}
	});
	for (var p = 0; p < o; ++p) {
		var m = "r", h = 0;
		p % 2 == 1 ? m = "l" : p > 0 && f && (h = 1), n[p] = {
			type: "align",
			align: m,
			pregap: h,
			postgap: 0
		};
	}
	return i.colSeparationType = f ? "align" : "alignat", i;
};
ui({
	type: "array",
	names: ["array", "darray"],
	props: { numArgs: 1 },
	handler(e, t) {
		var n = (ur(t[0]) ? [t[0]] : G(t[0], "ordgroup").body).map(function(e) {
			var t = lr(e).text;
			if ("lcr".includes(t)) return {
				type: "align",
				align: t
			};
			if (t === "|") return {
				type: "separator",
				separator: "|"
			};
			if (t === ":") return {
				type: "separator",
				separator: ":"
			};
			throw new s("Unknown column alignment: " + t, e);
		}), r = {
			cols: n,
			hskipBeforeAndAfter: !0,
			maxNumCols: n.length
		};
		return vi(e.parser, r, yi(e.envName));
	},
	htmlBuilder: bi,
	mathmlBuilder: Si
}), ui({
	type: "array",
	names: [
		"matrix",
		"pmatrix",
		"bmatrix",
		"Bmatrix",
		"vmatrix",
		"Vmatrix",
		"matrix*",
		"pmatrix*",
		"bmatrix*",
		"Bmatrix*",
		"vmatrix*",
		"Vmatrix*"
	],
	props: { numArgs: 0 },
	handler(e) {
		var t = {
			matrix: null,
			pmatrix: ["(", ")"],
			bmatrix: ["[", "]"],
			Bmatrix: ["\\{", "\\}"],
			vmatrix: ["|", "|"],
			Vmatrix: ["\\Vert", "\\Vert"]
		}[e.envName.replace("*", "")], n = "c", r = {
			hskipBeforeAndAfter: !1,
			cols: [{
				type: "align",
				align: n
			}]
		};
		if (e.envName.charAt(e.envName.length - 1) === "*") {
			var i = e.parser;
			if (i.consumeSpaces(), i.fetch().text === "[") {
				if (i.consume(), i.consumeSpaces(), n = i.fetch().text, !"lcr".includes(n)) throw new s("Expected l or c or r", i.nextToken);
				i.consume(), i.consumeSpaces(), i.expect("]"), i.consume(), r.cols = [{
					type: "align",
					align: n
				}];
			}
		}
		var a = vi(e.parser, r, yi(e.envName)), o = Math.max(0, ...a.body.map((e) => e.length));
		return a.cols = Array(o).fill({
			type: "align",
			align: n
		}), t ? {
			type: "leftright",
			mode: e.mode,
			body: [a],
			left: t[0],
			right: t[1],
			rightColor: void 0
		} : a;
	},
	htmlBuilder: bi,
	mathmlBuilder: Si
}), ui({
	type: "array",
	names: ["smallmatrix"],
	props: { numArgs: 0 },
	handler(e) {
		var t = vi(e.parser, { arraystretch: .5 }, "script");
		return t.colSeparationType = "small", t;
	},
	htmlBuilder: bi,
	mathmlBuilder: Si
}), ui({
	type: "array",
	names: ["subarray"],
	props: { numArgs: 1 },
	handler(e, t) {
		var n = (ur(t[0]) ? [t[0]] : G(t[0], "ordgroup").body).map(function(e) {
			var t = lr(e).text;
			if ("lc".includes(t)) return {
				type: "align",
				align: t
			};
			throw new s("Unknown column alignment: " + t, e);
		});
		if (n.length > 1) throw new s("{subarray} can contain only one column");
		var r = {
			cols: n,
			hskipBeforeAndAfter: !1,
			arraystretch: .5
		}, i = vi(e.parser, r, "script");
		if (i.body.length > 0 && i.body[0].length > 1) throw new s("{subarray} can contain only one column");
		return i;
	},
	htmlBuilder: bi,
	mathmlBuilder: Si
}), ui({
	type: "array",
	names: [
		"cases",
		"dcases",
		"rcases",
		"drcases"
	],
	props: { numArgs: 0 },
	handler(e) {
		var t = vi(e.parser, {
			arraystretch: 1.2,
			cols: [{
				type: "align",
				align: "l",
				pregap: 0,
				postgap: 1
			}, {
				type: "align",
				align: "l",
				pregap: 0,
				postgap: 0
			}]
		}, yi(e.envName));
		return {
			type: "leftright",
			mode: e.mode,
			body: [t],
			left: e.envName.includes("r") ? "." : "\\{",
			right: e.envName.includes("r") ? "\\}" : ".",
			rightColor: void 0
		};
	},
	htmlBuilder: bi,
	mathmlBuilder: Si
}), ui({
	type: "array",
	names: [
		"align",
		"align*",
		"aligned",
		"split"
	],
	props: { numArgs: 0 },
	handler: Ci,
	htmlBuilder: bi,
	mathmlBuilder: Si
}), ui({
	type: "array",
	names: [
		"gathered",
		"gather",
		"gather*"
	],
	props: { numArgs: 0 },
	handler(e) {
		gi.has(e.envName) && hi(e);
		var t = {
			cols: [{
				type: "align",
				align: "c"
			}],
			addJot: !0,
			colSeparationType: "gather",
			autoTag: _i(e.envName),
			emptySingleRow: !0,
			leqno: e.parser.settings.leqno
		};
		return vi(e.parser, t, "display");
	},
	htmlBuilder: bi,
	mathmlBuilder: Si
}), ui({
	type: "array",
	names: [
		"alignat",
		"alignat*",
		"alignedat"
	],
	props: { numArgs: 1 },
	handler: Ci,
	htmlBuilder: bi,
	mathmlBuilder: Si
}), ui({
	type: "array",
	names: ["equation", "equation*"],
	props: { numArgs: 0 },
	handler(e) {
		hi(e);
		var t = {
			autoTag: _i(e.envName),
			emptySingleRow: !0,
			singleRow: !0,
			maxNumCols: 1,
			leqno: e.parser.settings.leqno
		};
		return vi(e.parser, t, "display");
	},
	htmlBuilder: bi,
	mathmlBuilder: Si
}), ui({
	type: "array",
	names: ["CD"],
	props: { numArgs: 0 },
	handler(e) {
		return hi(e), wr(e.parser);
	},
	htmlBuilder: bi,
	mathmlBuilder: Si
}), K("\\nonumber", "\\gdef\\@eqnsw{0}"), K("\\notag", "\\nonumber"), H({
	type: "text",
	names: ["\\hline", "\\hdashline"],
	numArgs: 0,
	allowedInText: !0,
	allowedInMath: !0,
	handler(e, t) {
		throw new s(e.funcName + " valid only within array environment");
	}
});
var wi = li;
H({
	type: "environment",
	names: ["\\begin", "\\end"],
	numArgs: 1,
	argTypes: ["text"],
	handler(e, t) {
		var { parser: n, funcName: r } = e, i = t[0];
		if (i.type !== "ordgroup") throw new s("Invalid environment name", i);
		for (var a = "", o = 0; o < i.body.length; ++o) a += G(i.body[o], "textord").text;
		if (r === "\\begin") {
			if (!wi.hasOwnProperty(a)) throw new s("No such environment: " + a, i);
			var c = wi[a], { args: l, optArgs: u } = n.parseArguments("\\begin{" + a + "}", c), d = {
				mode: n.mode,
				envName: a,
				parser: n
			}, f = c.handler(d, l, u);
			n.expect("\\end", !1);
			var p = n.nextToken, m = G(n.parseFunction(), "environment");
			if (m.name !== a) throw new s("Mismatch: \\begin{" + a + "} matched by \\end{" + m.name + "}", p);
			return f;
		}
		return {
			type: "environment",
			mode: n.mode,
			name: a,
			nameGroup: i
		};
	}
});
var Ti = (e, t) => {
	var n = e.font, r = t.withFont(n);
	return U(e.body, r);
}, Ei = (e, t) => {
	var n = e.font, r = t.withFont(n);
	return Wn(e.body, r);
}, Di = {
	"\\Bbb": "\\mathbb",
	"\\bold": "\\mathbf",
	"\\frak": "\\mathfrak"
};
H({
	type: "font",
	names: [
		"\\mathrm",
		"\\mathit",
		"\\mathbf",
		"\\mathnormal",
		"\\mathsfit",
		"\\mathbb",
		"\\mathcal",
		"\\mathfrak",
		"\\mathscr",
		"\\mathsf",
		"\\mathtt",
		"\\Bbb",
		"\\bold",
		"\\frak"
	],
	numArgs: 1,
	allowedInArgument: !0,
	handler: (e, t) => {
		var { parser: n, funcName: r } = e, i = vn(t[0]), a = r in Di ? Di[r] : r;
		return {
			type: "font",
			mode: n.mode,
			font: a.slice(1),
			body: i
		};
	},
	htmlBuilder: Ti,
	mathmlBuilder: Ei
}), H({
	type: "mclass",
	names: ["\\boldsymbol", "\\bm"],
	numArgs: 1,
	handler: (e, t) => {
		var { parser: n } = e, r = t[0];
		return {
			type: "mclass",
			mode: n.mode,
			mclass: vr(r),
			body: [{
				type: "font",
				mode: n.mode,
				font: "boldsymbol",
				body: r
			}],
			isCharacterBox: h(r)
		};
	}
}), H({
	type: "font",
	names: [
		"\\rm",
		"\\sf",
		"\\tt",
		"\\bf",
		"\\it",
		"\\cal"
	],
	numArgs: 0,
	allowedInText: !0,
	handler: (e, t) => {
		var { parser: n, funcName: r, breakOnTokenText: i } = e, { mode: a } = n, o = n.parseExpression(!0, i);
		return {
			type: "font",
			mode: a,
			font: "math" + r.slice(1),
			body: {
				type: "ordgroup",
				mode: n.mode,
				body: o
			}
		};
	}
});
var Oi = (e, t) => {
	var n = t.style, r = n.fracNum(), i = n.fracDen(), a = t.havingStyle(r), o = U(e.numer, a, t);
	if (e.continued) {
		var s = 8.5 / t.fontMetrics().ptPerEm, c = 3.5 / t.fontMetrics().ptPerEm;
		o.height = o.height < s ? s : o.height, o.depth = o.depth < c ? c : o.depth;
	}
	a = t.havingStyle(i);
	var l = U(e.denom, a, t), u, d, f;
	e.hasBarLine ? (e.barSize ? (d = Me(e.barSize, t), u = Qt("frac-line", t, d)) : u = Qt("frac-line", t), d = u.height, f = u.height) : (u = null, d = 0, f = t.fontMetrics().defaultRuleThickness);
	var p, m, h;
	n.size === O.DISPLAY.size ? (p = t.fontMetrics().num1, m = d > 0 ? 3 * f : 7 * f, h = t.fontMetrics().denom1) : (d > 0 ? (p = t.fontMetrics().num2, m = f) : (p = t.fontMetrics().num3, m = 3 * f), h = t.fontMetrics().denom2);
	var g;
	if (u) {
		var _ = t.fontMetrics().axisHeight;
		p - o.depth - (_ + .5 * d) < m && (p += m - (p - o.depth - (_ + .5 * d))), _ - .5 * d - (l.height - h) < m && (h += m - (_ - .5 * d - (l.height - h)));
		var v = -(_ - .5 * d);
		g = V({
			positionType: "individualShift",
			children: [
				{
					type: "elem",
					elem: l,
					shift: h
				},
				{
					type: "elem",
					elem: u,
					shift: v
				},
				{
					type: "elem",
					elem: o,
					shift: -p
				}
			]
		});
	} else {
		var y = p - o.depth - (l.height - h);
		y < m && (p += .5 * (m - y), h += .5 * (m - y)), g = V({
			positionType: "individualShift",
			children: [{
				type: "elem",
				elem: l,
				shift: h
			}, {
				type: "elem",
				elem: o,
				shift: -p
			}]
		});
	}
	a = t.havingStyle(n), g.height *= a.sizeMultiplier / t.sizeMultiplier, g.depth *= a.sizeMultiplier / t.sizeMultiplier;
	var b = n.size === O.DISPLAY.size ? t.fontMetrics().delim1 : n.size === O.SCRIPTSCRIPT.size ? t.havingStyle(O.SCRIPT).fontMetrics().delim2 : t.fontMetrics().delim2, x = e.leftDelim == null ? kn(t, ["mopen"]) : ni(e.leftDelim, b, !0, t.havingStyle(n), e.mode, ["mopen"]), S = e.continued ? B([]) : e.rightDelim == null ? kn(t, ["mclose"]) : ni(e.rightDelim, b, !0, t.havingStyle(n), e.mode, ["mclose"]);
	return B(["mord"].concat(a.sizingClasses(t)), [
		x,
		B(["mfrac"], [g]),
		S
	], t);
}, ki = (e, t) => {
	var n = new W("mfrac", [Wn(e.numer, t), Wn(e.denom, t)]);
	if (!e.hasBarLine) n.setAttribute("linethickness", "0px");
	else if (e.barSize) {
		var r = Me(e.barSize, t);
		n.setAttribute("linethickness", k(r));
	}
	if (e.leftDelim != null || e.rightDelim != null) {
		var i = [];
		if (e.leftDelim != null) {
			var a = new W("mo", [new Nn(e.leftDelim.replace("\\", ""))]);
			a.setAttribute("fence", "true"), i.push(a);
		}
		if (i.push(n), e.rightDelim != null) {
			var o = new W("mo", [new Nn(e.rightDelim.replace("\\", ""))]);
			o.setAttribute("fence", "true"), i.push(o);
		}
		return Rn(i);
	}
	return n;
}, Ai = (e, t) => t ? {
	type: "styling",
	mode: e.mode,
	style: t,
	body: [e]
} : e;
H({
	type: "genfrac",
	names: [
		"\\cfrac",
		"\\dfrac",
		"\\frac",
		"\\tfrac",
		"\\dbinom",
		"\\binom",
		"\\tbinom",
		"\\\\atopfrac",
		"\\\\bracefrac",
		"\\\\brackfrac"
	],
	numArgs: 2,
	allowedInArgument: !0,
	handler: (e, t) => {
		var { parser: n, funcName: r } = e, i = t[0], a = t[1], o, s = null, c = null;
		switch (r) {
			case "\\cfrac":
			case "\\dfrac":
			case "\\frac":
			case "\\tfrac":
				o = !0;
				break;
			case "\\\\atopfrac":
				o = !1;
				break;
			case "\\dbinom":
			case "\\binom":
			case "\\tbinom":
				o = !1, s = "(", c = ")";
				break;
			case "\\\\bracefrac":
				o = !1, s = "\\{", c = "\\}";
				break;
			case "\\\\brackfrac":
				o = !1, s = "[", c = "]";
				break;
			default: throw Error("Unrecognized genfrac command");
		}
		var l = r === "\\cfrac", u = null;
		return l || r.startsWith("\\d") ? u = "display" : r.startsWith("\\t") && (u = "text"), Ai({
			type: "genfrac",
			mode: n.mode,
			numer: i,
			denom: a,
			continued: l,
			hasBarLine: o,
			leftDelim: s,
			rightDelim: c,
			barSize: null
		}, u);
	},
	htmlBuilder: Oi,
	mathmlBuilder: ki
}), H({
	type: "infix",
	names: [
		"\\over",
		"\\choose",
		"\\atop",
		"\\brace",
		"\\brack"
	],
	numArgs: 0,
	infix: !0,
	handler(e) {
		var { parser: t, funcName: n, token: r } = e, i;
		switch (n) {
			case "\\over":
				i = "\\frac";
				break;
			case "\\choose":
				i = "\\binom";
				break;
			case "\\atop":
				i = "\\\\atopfrac";
				break;
			case "\\brace":
				i = "\\\\bracefrac";
				break;
			case "\\brack":
				i = "\\\\brackfrac";
				break;
			default: throw Error("Unrecognized infix genfrac command");
		}
		return {
			type: "infix",
			mode: t.mode,
			replaceWith: i,
			token: r
		};
	}
});
var ji = [
	"display",
	"text",
	"script",
	"scriptscript"
], Mi = function(e) {
	var t = null;
	return e.length > 0 && (t = e, t = t === "." ? null : t), t;
};
H({
	type: "genfrac",
	names: ["\\genfrac"],
	numArgs: 6,
	allowedInArgument: !0,
	argTypes: [
		"math",
		"math",
		"size",
		"text",
		"math",
		"math"
	],
	handler(e, t) {
		var { parser: n } = e, r = t[4], i = t[5], a = vn(t[0]), o = a.type === "atom" && a.family === "open" ? Mi(a.text) : null, s = vn(t[1]), c = s.type === "atom" && s.family === "close" ? Mi(s.text) : null, l = G(t[2], "size"), u, d = null;
		l.isBlank ? u = !0 : (d = l.value, u = d.number > 0);
		var f = null, p = t[3];
		if (p.type === "ordgroup") {
			if (p.body.length > 0) {
				var m = G(p.body[0], "textord");
				f = ji[Number(m.text)];
			}
		} else p = G(p, "textord"), f = ji[Number(p.text)];
		return Ai({
			type: "genfrac",
			mode: n.mode,
			numer: r,
			denom: i,
			continued: !1,
			hasBarLine: u,
			barSize: d,
			leftDelim: o,
			rightDelim: c
		}, f);
	}
}), H({
	type: "infix",
	names: ["\\above"],
	numArgs: 1,
	argTypes: ["size"],
	infix: !0,
	handler(e, t) {
		var { parser: n, funcName: r, token: i } = e;
		return {
			type: "infix",
			mode: n.mode,
			replaceWith: "\\\\abovefrac",
			size: G(t[0], "size").value,
			token: i
		};
	}
}), H({
	type: "genfrac",
	names: ["\\\\abovefrac"],
	numArgs: 3,
	argTypes: [
		"math",
		"size",
		"math"
	],
	handler: (e, t) => {
		var { parser: n, funcName: r } = e, i = t[0], a = G(t[1], "infix").size;
		if (!a) throw Error("\\\\abovefrac expected size, but got " + String(a));
		var o = t[2], s = a.number > 0;
		return {
			type: "genfrac",
			mode: n.mode,
			numer: i,
			denom: o,
			continued: !1,
			hasBarLine: s,
			barSize: a,
			leftDelim: null,
			rightDelim: null
		};
	}
});
var Ni = (e, t) => {
	var n = t.style, r, i;
	e.type === "supsub" ? (r = e.sup ? U(e.sup, t.havingStyle(n.sup()), t) : U(e.sub, t.havingStyle(n.sub()), t), i = G(e.base, "horizBrace")) : i = G(e, "horizBrace");
	var a = U(i.base, t.havingBaseStyle(O.DISPLAY)), o = ir(i, t), s = i.isOver ? V({
		positionType: "firstBaseline",
		children: [
			{
				type: "elem",
				elem: a
			},
			{
				type: "kern",
				size: .1
			},
			{
				type: "elem",
				elem: o,
				wrapperClasses: ["svg-align"]
			}
		]
	}) : V({
		positionType: "bottom",
		positionData: a.depth + .1 + o.height,
		children: [
			{
				type: "elem",
				elem: o,
				wrapperClasses: ["svg-align"]
			},
			{
				type: "kern",
				size: .1
			},
			{
				type: "elem",
				elem: a
			}
		]
	});
	if (r) {
		var c = B(["minner", i.isOver ? "mover" : "munder"], [s], t);
		s = i.isOver ? V({
			positionType: "firstBaseline",
			children: [
				{
					type: "elem",
					elem: c
				},
				{
					type: "kern",
					size: .2
				},
				{
					type: "elem",
					elem: r
				}
			]
		}) : V({
			positionType: "bottom",
			positionData: c.depth + .2 + r.height + r.depth,
			children: [
				{
					type: "elem",
					elem: r
				},
				{
					type: "kern",
					size: .2
				},
				{
					type: "elem",
					elem: c
				}
			]
		});
	}
	return B(["minner", i.isOver ? "mover" : "munder"], [s], t);
};
H({
	type: "horizBrace",
	names: [
		"\\overbrace",
		"\\underbrace",
		"\\overbracket",
		"\\underbracket"
	],
	numArgs: 1,
	handler(e, t) {
		var { parser: n, funcName: r } = e;
		return {
			type: "horizBrace",
			mode: n.mode,
			label: r,
			isOver: r.includes("\\over"),
			base: t[0]
		};
	},
	htmlBuilder: Ni,
	mathmlBuilder: (e, t) => {
		var n = tr(e.label);
		return new W(e.isOver ? "mover" : "munder", [Wn(e.base, t), n]);
	}
}), H({
	type: "href",
	names: ["\\href"],
	numArgs: 2,
	argTypes: ["url", "original"],
	allowedInText: !0,
	handler: (e, t) => {
		var { parser: n } = e, r = t[1], i = G(t[0], "url").url;
		return n.settings.isTrusted({
			command: "\\href",
			url: i
		}) ? {
			type: "href",
			mode: n.mode,
			href: i,
			body: yn(r)
		} : n.formatUnsupportedCmd("\\href");
	},
	htmlBuilder: (e, t) => {
		var n = wn(e.body, t, !1);
		return $t(e.href, [], n, t);
	},
	mathmlBuilder: (e, t) => {
		var n = Un(e.body, t);
		return n instanceof W || (n = new W("mrow", [n])), n.setAttribute("href", e.href), n;
	}
}), H({
	type: "href",
	names: ["\\url"],
	numArgs: 1,
	argTypes: ["url"],
	allowedInText: !0,
	handler: (e, t) => {
		var { parser: n } = e, r = G(t[0], "url").url;
		if (!n.settings.isTrusted({
			command: "\\url",
			url: r
		})) return n.formatUnsupportedCmd("\\url");
		for (var i = [], a = 0; a < r.length; a++) {
			var o = r[a];
			o === "~" && (o = "\\textasciitilde"), i.push({
				type: "textord",
				mode: "text",
				text: o
			});
		}
		var s = {
			type: "text",
			mode: n.mode,
			font: "\\texttt",
			body: i
		};
		return {
			type: "href",
			mode: n.mode,
			href: r,
			body: yn(s)
		};
	}
}), H({
	type: "hbox",
	names: ["\\hbox"],
	numArgs: 1,
	argTypes: ["text"],
	allowedInText: !0,
	primitive: !0,
	handler(e, t) {
		var { parser: n } = e;
		return {
			type: "hbox",
			mode: n.mode,
			body: yn(t[0])
		};
	},
	htmlBuilder(e, t) {
		return en(wn(e.body, t.withFont(""), !1));
	},
	mathmlBuilder(e, t) {
		return new W("mrow", Hn(e.body, t.withFont("")));
	}
}), H({
	type: "html",
	names: [
		"\\htmlClass",
		"\\htmlId",
		"\\htmlStyle",
		"\\htmlData"
	],
	numArgs: 2,
	argTypes: ["raw", "original"],
	allowedInText: !0,
	handler: (e, t) => {
		var { parser: n, funcName: r, token: i } = e, a = G(t[0], "raw").string, o = t[1];
		n.settings.strict && n.settings.reportNonstrict("htmlExtension", "HTML extension is disabled on strict mode");
		var c, l = {};
		switch (r) {
			case "\\htmlClass":
				l.class = a, c = {
					command: "\\htmlClass",
					class: a
				};
				break;
			case "\\htmlId":
				l.id = a, c = {
					command: "\\htmlId",
					id: a
				};
				break;
			case "\\htmlStyle":
				l.style = a, c = {
					command: "\\htmlStyle",
					style: a
				};
				break;
			case "\\htmlData":
				for (var u = a.split(","), d = 0; d < u.length; d++) {
					var f = u[d], p = f.indexOf("=");
					if (p < 0) throw new s("\\htmlData key/value '" + f + "' missing equals sign");
					var m = f.slice(0, p), h = f.slice(p + 1);
					l["data-" + m.trim()] = h;
				}
				c = {
					command: "\\htmlData",
					attributes: l
				};
				break;
			default: throw Error("Unrecognized html command");
		}
		return n.settings.isTrusted(c) ? {
			type: "html",
			mode: n.mode,
			attributes: l,
			body: yn(o)
		} : n.formatUnsupportedCmd(r);
	},
	htmlBuilder: (e, t) => {
		var n = wn(e.body, t, !1), r = ["enclosing"];
		e.attributes.class && r.push(...e.attributes.class.trim().split(/\s+/));
		var i = B(r, n, t);
		for (var a in e.attributes) a !== "class" && e.attributes.hasOwnProperty(a) && i.setAttribute(a, e.attributes[a]);
		return i;
	},
	mathmlBuilder: (e, t) => Un(e.body, t)
}), H({
	type: "htmlmathml",
	names: ["\\html@mathml"],
	numArgs: 2,
	allowedInArgument: !0,
	allowedInText: !0,
	handler: (e, t) => {
		var { parser: n } = e;
		return {
			type: "htmlmathml",
			mode: n.mode,
			html: yn(t[0]),
			mathml: yn(t[1])
		};
	},
	htmlBuilder: (e, t) => en(wn(e.html, t, !1)),
	mathmlBuilder: (e, t) => Un(e.mathml, t)
});
var Pi = function(e) {
	if (/^[-+]? *(\d+(\.\d*)?|\.\d+)$/.test(e)) return {
		number: +e,
		unit: "bp"
	};
	var t = /([-+]?) *(\d+(?:\.\d*)?|\.\d+) *([a-z]{2})/.exec(e);
	if (!t) throw new s("Invalid size: '" + e + "' in \\includegraphics");
	var n = {
		number: +(t[1] + t[2]),
		unit: t[3]
	};
	if (!je(n)) throw new s("Invalid unit: '" + n.unit + "' in \\includegraphics.");
	return n;
};
H({
	type: "includegraphics",
	names: ["\\includegraphics"],
	numArgs: 1,
	numOptionalArgs: 1,
	argTypes: ["raw", "url"],
	allowedInText: !1,
	handler: (e, t, n) => {
		var { parser: r } = e, i = {
			number: 0,
			unit: "em"
		}, a = {
			number: .9,
			unit: "em"
		}, o = {
			number: 0,
			unit: "em"
		}, c = "";
		if (n[0]) for (var l = G(n[0], "raw").string.split(","), u = 0; u < l.length; u++) {
			var d = l[u].split("=");
			if (d.length === 2) {
				var f = d[1].trim();
				switch (d[0].trim()) {
					case "alt":
						c = f;
						break;
					case "width":
						i = Pi(f);
						break;
					case "height":
						a = Pi(f);
						break;
					case "totalheight":
						o = Pi(f);
						break;
					default: throw new s("Invalid key: '" + d[0] + "' in \\includegraphics.");
				}
			}
		}
		var p = G(t[0], "url").url;
		return c === "" && (c = p, c = c.replace(/^.*[\\/]/, ""), c = c.substring(0, c.lastIndexOf("."))), r.settings.isTrusted({
			command: "\\includegraphics",
			url: p
		}) ? {
			type: "includegraphics",
			mode: r.mode,
			alt: c,
			width: i,
			height: a,
			totalheight: o,
			src: p
		} : r.formatUnsupportedCmd("\\includegraphics");
	},
	htmlBuilder: (e, t) => {
		var n = Me(e.height, t), r = 0;
		e.totalheight.number > 0 && (r = Me(e.totalheight, t) - n);
		var i = 0;
		e.width.number > 0 && (i = Me(e.width, t));
		var a = { height: k(n + r) };
		i > 0 && (a.width = k(i)), r > 0 && (a.verticalAlign = k(-r));
		var o = new Ve(e.src, e.alt, a);
		return o.height = n, o.depth = r, o;
	},
	mathmlBuilder: (e, t) => {
		var n = new W("mglyph", []);
		n.setAttribute("alt", e.alt);
		var r = Me(e.height, t), i = 0;
		if (e.totalheight.number > 0 && (i = Me(e.totalheight, t) - r, n.setAttribute("valign", k(-i))), n.setAttribute("height", k(r + i)), e.width.number > 0) {
			var a = Me(e.width, t);
			n.setAttribute("width", k(a));
		}
		return n.setAttribute("src", e.src), n;
	}
}), H({
	type: "kern",
	names: [
		"\\kern",
		"\\mkern",
		"\\hskip",
		"\\mskip"
	],
	numArgs: 1,
	argTypes: ["size"],
	primitive: !0,
	allowedInText: !0,
	handler(e, t) {
		var { parser: n, funcName: r } = e, i = G(t[0], "size");
		if (n.settings.strict) {
			var a = r[1] === "m", o = i.value.unit === "mu";
			a ? (o || n.settings.reportNonstrict("mathVsTextUnits", "LaTeX's " + r + " supports only mu units, " + ("not " + i.value.unit + " units")), n.mode !== "math" && n.settings.reportNonstrict("mathVsTextUnits", "LaTeX's " + r + " works only in math mode")) : o && n.settings.reportNonstrict("mathVsTextUnits", "LaTeX's " + r + " doesn't support mu units");
		}
		return {
			type: "kern",
			mode: n.mode,
			dimension: i.value
		};
	},
	htmlBuilder(e, t) {
		return rn(e.dimension, t);
	},
	mathmlBuilder(e, t) {
		return new Pn(Me(e.dimension, t));
	}
}), H({
	type: "lap",
	names: [
		"\\mathllap",
		"\\mathrlap",
		"\\mathclap"
	],
	numArgs: 1,
	allowedInText: !0,
	handler: (e, t) => {
		var { parser: n, funcName: r } = e, i = t[0];
		return {
			type: "lap",
			mode: n.mode,
			alignment: r.slice(5),
			body: i
		};
	},
	htmlBuilder: (e, t) => {
		var n;
		e.alignment === "clap" ? (n = B([], [U(e.body, t)]), n = B(["inner"], [n], t)) : n = B(["inner"], [U(e.body, t)]);
		var r = B(["fix"], []), i = B([e.alignment], [n, r], t), a = B(["strut"]);
		return a.style.height = k(i.height + i.depth), i.depth && (a.style.verticalAlign = k(-i.depth)), i.children.unshift(a), i = B(["thinbox"], [i], t), B(["mord", "vbox"], [i], t);
	},
	mathmlBuilder: (e, t) => {
		var n = new W("mpadded", [Wn(e.body, t)]);
		if (e.alignment !== "rlap") {
			var r = e.alignment === "llap" ? "-1" : "-0.5";
			n.setAttribute("lspace", r + "width");
		}
		return n.setAttribute("width", "0px"), n;
	}
}), H({
	type: "styling",
	names: ["\\(", "$"],
	numArgs: 0,
	allowedInText: !0,
	allowedInMath: !1,
	handler(e, t) {
		var { funcName: n, parser: r } = e, i = r.mode;
		r.switchMode("math");
		var a = n === "\\(" ? "\\)" : "$", o = r.parseExpression(!1, a);
		return r.expect(a), r.switchMode(i), {
			type: "styling",
			mode: r.mode,
			style: "text",
			resetFont: !0,
			body: o
		};
	}
}), H({
	type: "text",
	names: ["\\)", "\\]"],
	numArgs: 0,
	allowedInText: !0,
	allowedInMath: !1,
	handler(e, t) {
		throw new s("Mismatched " + e.funcName);
	}
});
var Fi = (e, t) => {
	switch (t.style.size) {
		case O.DISPLAY.size: return e.display;
		case O.TEXT.size: return e.text;
		case O.SCRIPT.size: return e.script;
		case O.SCRIPTSCRIPT.size: return e.scriptscript;
		default: return e.text;
	}
};
H({
	type: "mathchoice",
	names: ["\\mathchoice"],
	numArgs: 4,
	primitive: !0,
	handler: (e, t) => {
		var { parser: n } = e;
		return {
			type: "mathchoice",
			mode: n.mode,
			display: yn(t[0]),
			text: yn(t[1]),
			script: yn(t[2]),
			scriptscript: yn(t[3])
		};
	},
	htmlBuilder: (e, t) => en(wn(Fi(e, t), t, !1)),
	mathmlBuilder: (e, t) => Un(Fi(e, t), t)
});
var Ii = (e, t, n, r, i, a, o) => {
	e = B([], [e]);
	var s = n && h(n), c, l;
	if (t) {
		var u = U(t, r.havingStyle(i.sup()), r);
		l = {
			elem: u,
			kern: Math.max(r.fontMetrics().bigOpSpacing1, r.fontMetrics().bigOpSpacing3 - u.depth)
		};
	}
	if (n) {
		var d = U(n, r.havingStyle(i.sub()), r);
		c = {
			elem: d,
			kern: Math.max(r.fontMetrics().bigOpSpacing2, r.fontMetrics().bigOpSpacing4 - d.height)
		};
	}
	var f;
	if (l && c) f = V({
		positionType: "bottom",
		positionData: r.fontMetrics().bigOpSpacing5 + c.elem.height + c.elem.depth + c.kern + e.depth + o,
		children: [
			{
				type: "kern",
				size: r.fontMetrics().bigOpSpacing5
			},
			{
				type: "elem",
				elem: c.elem,
				marginLeft: k(-a)
			},
			{
				type: "kern",
				size: c.kern
			},
			{
				type: "elem",
				elem: e
			},
			{
				type: "kern",
				size: l.kern
			},
			{
				type: "elem",
				elem: l.elem,
				marginLeft: k(a)
			},
			{
				type: "kern",
				size: r.fontMetrics().bigOpSpacing5
			}
		]
	});
	else if (c) f = V({
		positionType: "top",
		positionData: e.height - o,
		children: [
			{
				type: "kern",
				size: r.fontMetrics().bigOpSpacing5
			},
			{
				type: "elem",
				elem: c.elem,
				marginLeft: k(-a)
			},
			{
				type: "kern",
				size: c.kern
			},
			{
				type: "elem",
				elem: e
			}
		]
	});
	else if (l) f = V({
		positionType: "bottom",
		positionData: e.depth + o,
		children: [
			{
				type: "elem",
				elem: e
			},
			{
				type: "kern",
				size: l.kern
			},
			{
				type: "elem",
				elem: l.elem,
				marginLeft: k(a)
			},
			{
				type: "kern",
				size: r.fontMetrics().bigOpSpacing5
			}
		]
	});
	else return e;
	var p = [f];
	if (c && a !== 0 && !s) {
		var m = B(["mspace"], [], r);
		m.style.marginRight = k(a), p.unshift(m);
	}
	return B(["mop", "op-limits"], p, r);
}, Li = new Set(["\\smallint"]), Ri = (e, t) => {
	var n, r, i = !1, a;
	e.type === "supsub" ? (n = e.sup, r = e.sub, a = G(e.base, "op"), i = !0) : a = G(e, "op");
	var o = t.style, s = !1;
	o.size === O.DISPLAY.size && a.symbol && !Li.has(a.name) && (s = !0);
	var c, l;
	if (a.symbol) {
		var u = s ? "Size2-Regular" : "Size1-Regular", d = "";
		if ((a.name === "\\oiint" || a.name === "\\oiiint") && (d = a.name.slice(1), a.name = d === "oiint" ? "\\iint" : "\\iiint"), c = Wt(a.name, u, "math", t, [
			"mop",
			"op-symbol",
			s ? "large-op" : "small-op"
		]), l = c.italic, d.length > 0) {
			var f = cn(d + "Size" + (s ? "2" : "1"), t);
			c = V({
				positionType: "individualShift",
				children: [{
					type: "elem",
					elem: c,
					shift: 0
				}, {
					type: "elem",
					elem: f,
					shift: s ? .08 : 0
				}]
			}), a.name = "\\" + d, c.classes.unshift("mop"), c.italic = l;
		}
	} else if (a.body) {
		var p = wn(a.body, t, !0);
		p.length === 1 && p[0] instanceof Ue ? (c = p[0], c.classes[0] = "mop") : c = B(["mop"], p, t);
	} else {
		for (var m = [], h = 1; h < a.name.length; h++) m.push(Gt(a.name[h], a.mode, t));
		c = B(["mop"], m, t);
	}
	var g = 0, _ = 0;
	return (c instanceof Ue || a.name === "\\oiint" || a.name === "\\oiiint") && !a.suppressBaseShift && (g = (c.height - c.depth) / 2 - t.fontMetrics().axisHeight, _ = c.italic ?? 0), i ? Ii(c, n, r, t, o, _, g) : (g && (c.style.position = "relative", c.style.top = k(g)), c);
}, zi = (e, t) => {
	var n;
	if (e.symbol) n = new W("mo", [Ln(e.name, e.mode)]), Li.has(e.name) && n.setAttribute("largeop", "false");
	else if (e.body) n = new W("mo", Hn(e.body, t));
	else {
		n = new W("mi", [new Nn(e.name.slice(1))]);
		var r = new W("mo", [Ln("⁡", "text")]);
		n = e.parentIsSupSub ? new W("mrow", [n, r]) : Mn([n, r]);
	}
	return n;
}, Bi = {
	"∏": "\\prod",
	"∐": "\\coprod",
	"∑": "\\sum",
	"⋀": "\\bigwedge",
	"⋁": "\\bigvee",
	"⋂": "\\bigcap",
	"⋃": "\\bigcup",
	"⨀": "\\bigodot",
	"⨁": "\\bigoplus",
	"⨂": "\\bigotimes",
	"⨄": "\\biguplus",
	"⨆": "\\bigsqcup"
};
H({
	type: "op",
	names: /* @__PURE__ */ "\\coprod.\\bigvee.\\bigwedge.\\biguplus.\\bigcap.\\bigcup.\\intop.\\prod.\\sum.\\bigotimes.\\bigoplus.\\bigodot.\\bigsqcup.\\smallint.∏.∐.∑.⋀.⋁.⋂.⋃.⨀.⨁.⨂.⨄.⨆".split("."),
	numArgs: 0,
	handler: (e, t) => {
		var { parser: n, funcName: r } = e, i = r;
		return i.length === 1 && (i = Bi[i]), {
			type: "op",
			mode: n.mode,
			limits: !0,
			parentIsSupSub: !1,
			symbol: !0,
			name: i
		};
	},
	htmlBuilder: Ri,
	mathmlBuilder: zi
}), H({
	type: "op",
	names: ["\\mathop"],
	numArgs: 1,
	primitive: !0,
	handler: (e, t) => {
		var { parser: n } = e, r = t[0];
		return {
			type: "op",
			mode: n.mode,
			limits: !1,
			parentIsSupSub: !1,
			symbol: !1,
			body: yn(r)
		};
	}
});
var Vi = {
	"∫": "\\int",
	"∬": "\\iint",
	"∭": "\\iiint",
	"∮": "\\oint",
	"∯": "\\oiint",
	"∰": "\\oiiint"
};
H({
	type: "op",
	names: /* @__PURE__ */ "\\arcsin.\\arccos.\\arctan.\\arctg.\\arcctg.\\arg.\\ch.\\cos.\\cosec.\\cosh.\\cot.\\cotg.\\coth.\\csc.\\ctg.\\cth.\\deg.\\dim.\\exp.\\hom.\\ker.\\lg.\\ln.\\log.\\sec.\\sin.\\sinh.\\sh.\\tan.\\tanh.\\tg.\\th".split("."),
	numArgs: 0,
	handler(e) {
		var { parser: t, funcName: n } = e;
		return {
			type: "op",
			mode: t.mode,
			limits: !1,
			parentIsSupSub: !1,
			symbol: !1,
			name: n
		};
	}
}), H({
	type: "op",
	names: [
		"\\det",
		"\\gcd",
		"\\inf",
		"\\lim",
		"\\max",
		"\\min",
		"\\Pr",
		"\\sup"
	],
	numArgs: 0,
	handler(e) {
		var { parser: t, funcName: n } = e;
		return {
			type: "op",
			mode: t.mode,
			limits: !0,
			parentIsSupSub: !1,
			symbol: !1,
			name: n
		};
	}
}), H({
	type: "op",
	names: [
		"\\int",
		"\\iint",
		"\\iiint",
		"\\oint",
		"\\oiint",
		"\\oiiint",
		"∫",
		"∬",
		"∭",
		"∮",
		"∯",
		"∰"
	],
	numArgs: 0,
	allowedInArgument: !0,
	handler(e) {
		var { parser: t, funcName: n } = e, r = n;
		return r.length === 1 && (r = Vi[r]), {
			type: "op",
			mode: t.mode,
			limits: !1,
			parentIsSupSub: !1,
			symbol: !0,
			name: r
		};
	}
});
var Hi = (e, t) => {
	var n, r, i = !1, a;
	e.type === "supsub" ? (n = e.sup, r = e.sub, a = G(e.base, "operatorname"), i = !0) : a = G(e, "operatorname");
	var o;
	if (a.body.length > 0) {
		for (var s = wn(a.body.map((e) => {
			var t = "text" in e ? e.text : void 0;
			return typeof t == "string" ? {
				type: "textord",
				mode: e.mode,
				text: t
			} : e;
		}), t.withFont("mathrm"), !0), c = 0; c < s.length; c++) {
			var l = s[c];
			l instanceof Ue && (l.text = l.text.replace(/\u2212/, "-").replace(/\u2217/, "*"));
		}
		o = B(["mop"], s, t);
	} else o = B(["mop"], [], t);
	return i ? Ii(o, n, r, t, t.style, 0, 0) : o;
};
H({
	type: "operatorname",
	names: ["\\operatorname@", "\\operatornamewithlimits"],
	numArgs: 1,
	handler: (e, t) => {
		var { parser: n, funcName: r } = e, i = t[0];
		return {
			type: "operatorname",
			mode: n.mode,
			body: yn(i),
			alwaysHandleSupSub: r === "\\operatornamewithlimits",
			limits: !1,
			parentIsSupSub: !1
		};
	},
	htmlBuilder: Hi,
	mathmlBuilder: (e, t) => {
		for (var n = Hn(e.body, t.withFont("mathrm")), r = !0, i = 0; i < n.length; i++) {
			var a = n[i];
			if (!(a instanceof Pn)) if (a instanceof W) switch (a.type) {
				case "mi":
				case "mn":
				case "mspace":
				case "mtext": break;
				case "mo":
					var o = a.children[0];
					a.children.length === 1 && o instanceof Nn ? o.text = o.text.replace(/\u2212/, "-").replace(/\u2217/, "*") : r = !1;
					break;
				default: r = !1;
			}
			else r = !1;
		}
		r && (n = [new Nn(n.map((e) => e.toText()).join(""))]);
		var s = new W("mi", n);
		s.setAttribute("mathvariant", "normal");
		var c = new W("mo", [Ln("⁡", "text")]);
		return e.parentIsSupSub ? new W("mrow", [s, c]) : Mn([s, c]);
	}
}), K("\\operatorname", "\\@ifstar\\operatornamewithlimits\\operatorname@"), _n({
	type: "ordgroup",
	htmlBuilder(e, t) {
		return e.semisimple ? en(wn(e.body, t, !1)) : B(["mord"], wn(e.body, t, !0), t);
	},
	mathmlBuilder(e, t) {
		return Un(e.body, t, !0);
	}
}), H({
	type: "overline",
	names: ["\\overline"],
	numArgs: 1,
	handler(e, t) {
		var { parser: n } = e, r = t[0];
		return {
			type: "overline",
			mode: n.mode,
			body: r
		};
	},
	htmlBuilder(e, t) {
		var n = U(e.body, t.havingCrampedStyle()), r = Qt("overline-line", t), i = t.fontMetrics().defaultRuleThickness;
		return B(["mord", "overline"], [V({
			positionType: "firstBaseline",
			children: [
				{
					type: "elem",
					elem: n
				},
				{
					type: "kern",
					size: 3 * i
				},
				{
					type: "elem",
					elem: r
				},
				{
					type: "kern",
					size: i
				}
			]
		})], t);
	},
	mathmlBuilder(e, t) {
		var n = new W("mo", [new Nn("‾")]);
		n.setAttribute("stretchy", "true");
		var r = new W("mover", [Wn(e.body, t), n]);
		return r.setAttribute("accent", "true"), r;
	}
}), H({
	type: "phantom",
	names: ["\\phantom"],
	numArgs: 1,
	allowedInText: !0,
	handler: (e, t) => {
		var { parser: n } = e, r = t[0];
		return {
			type: "phantom",
			mode: n.mode,
			body: yn(r)
		};
	},
	htmlBuilder: (e, t) => en(wn(e.body, t.withPhantom(), !1)),
	mathmlBuilder: (e, t) => new W("mphantom", Hn(e.body, t))
}), K("\\hphantom", "\\smash{\\phantom{#1}}"), H({
	type: "vphantom",
	names: ["\\vphantom"],
	numArgs: 1,
	allowedInText: !0,
	handler: (e, t) => {
		var { parser: n } = e, r = t[0];
		return {
			type: "vphantom",
			mode: n.mode,
			body: r
		};
	},
	htmlBuilder: (e, t) => B(["mord", "rlap"], [B(["inner"], [U(e.body, t.withPhantom())]), B(["fix"], [])], t),
	mathmlBuilder: (e, t) => {
		var n = new W("mpadded", [new W("mphantom", Hn(yn(e.body), t))]);
		return n.setAttribute("width", "0px"), n;
	}
}), H({
	type: "raisebox",
	names: ["\\raisebox"],
	numArgs: 2,
	argTypes: ["size", "hbox"],
	allowedInText: !0,
	handler(e, t) {
		var { parser: n } = e, r = G(t[0], "size").value, i = t[1];
		return {
			type: "raisebox",
			mode: n.mode,
			dy: r,
			body: i
		};
	},
	htmlBuilder(e, t) {
		var n = U(e.body, t);
		return V({
			positionType: "shift",
			positionData: -Me(e.dy, t),
			children: [{
				type: "elem",
				elem: n
			}]
		});
	},
	mathmlBuilder(e, t) {
		var n = new W("mpadded", [Wn(e.body, t)]), r = e.dy.number + e.dy.unit;
		return n.setAttribute("voffset", r), n;
	}
}), H({
	type: "internal",
	names: ["\\relax"],
	numArgs: 0,
	allowedInText: !0,
	allowedInArgument: !0,
	handler(e) {
		var { parser: t } = e;
		return {
			type: "internal",
			mode: t.mode
		};
	}
}), H({
	type: "rule",
	names: ["\\rule"],
	numArgs: 2,
	numOptionalArgs: 1,
	allowedInText: !0,
	allowedInMath: !0,
	argTypes: [
		"size",
		"size",
		"size"
	],
	handler(e, t, n) {
		var { parser: r } = e, i = n[0], a = G(t[0], "size"), o = G(t[1], "size");
		return {
			type: "rule",
			mode: r.mode,
			shift: i && G(i, "size").value,
			width: a.value,
			height: o.value
		};
	},
	htmlBuilder(e, t) {
		var n = B(["mord", "rule"], [], t), r = Me(e.width, t), i = Me(e.height, t), a = e.shift ? Me(e.shift, t) : 0;
		return n.style.borderRightWidth = k(r), n.style.borderTopWidth = k(i), n.style.bottom = k(a), n.width = r, n.height = i + a, n.depth = -a, n.maxFontSize = i * 1.125 * t.sizeMultiplier, n;
	},
	mathmlBuilder(e, t) {
		var n = Me(e.width, t), r = Me(e.height, t), i = e.shift ? Me(e.shift, t) : 0, a = t.color && t.getColor() || "black", o = new W("mspace");
		o.setAttribute("mathbackground", a), o.setAttribute("width", k(n)), o.setAttribute("height", k(r));
		var s = new W("mpadded", [o]);
		return i >= 0 ? s.setAttribute("height", k(i)) : (s.setAttribute("height", k(i)), s.setAttribute("depth", k(-i))), s.setAttribute("voffset", k(i)), s;
	}
});
function Ui(e, t, n) {
	for (var r = wn(e, t, !1), i = t.sizeMultiplier / n.sizeMultiplier, a = 0; a < r.length; a++) {
		var o = r[a].classes.indexOf("sizing");
		o < 0 ? Array.prototype.push.apply(r[a].classes, t.sizingClasses(n)) : r[a].classes[o + 1] === "reset-size" + t.size && (r[a].classes[o + 1] = "reset-size" + n.size), r[a].height *= i, r[a].depth *= i;
	}
	return en(r);
}
var Wi = [
	"\\tiny",
	"\\sixptsize",
	"\\scriptsize",
	"\\footnotesize",
	"\\small",
	"\\normalsize",
	"\\large",
	"\\Large",
	"\\LARGE",
	"\\huge",
	"\\Huge"
];
H({
	type: "sizing",
	names: Wi,
	numArgs: 0,
	allowedInText: !0,
	handler: (e, t) => {
		var { breakOnTokenText: n, funcName: r, parser: i } = e, a = i.parseExpression(!1, n);
		return {
			type: "sizing",
			mode: i.mode,
			size: Wi.indexOf(r) + 1,
			body: a
		};
	},
	htmlBuilder: (e, t) => {
		var n = t.havingSize(e.size);
		return Ui(e.body, n, t);
	},
	mathmlBuilder: (e, t) => {
		var n = t.havingSize(e.size), r = new W("mstyle", Hn(e.body, n));
		return r.setAttribute("mathsize", k(n.sizeMultiplier)), r;
	}
}), H({
	type: "smash",
	names: ["\\smash"],
	numArgs: 1,
	numOptionalArgs: 1,
	allowedInText: !0,
	handler: (e, t, n) => {
		var { parser: r } = e, i = !1, a = !1, o = n[0] && G(n[0], "ordgroup");
		if (o) for (var s, c = 0; c < o.body.length; ++c) {
			var l = o.body[c];
			if (s = lr(l).text, s === "t") i = !0;
			else if (s === "b") a = !0;
			else {
				i = !1, a = !1;
				break;
			}
		}
		else i = !0, a = !0;
		var u = t[0];
		return {
			type: "smash",
			mode: r.mode,
			body: u,
			smashHeight: i,
			smashDepth: a
		};
	},
	htmlBuilder: (e, t) => {
		var n = B([], [U(e.body, t)]);
		if (!e.smashHeight && !e.smashDepth) return n;
		if (e.smashHeight && (n.height = 0), e.smashDepth && (n.depth = 0), e.smashHeight && e.smashDepth) return B(["mord", "smash"], [n], t);
		if (n.children) for (var r = 0; r < n.children.length; r++) e.smashHeight && (n.children[r].height = 0), e.smashDepth && (n.children[r].depth = 0);
		return B(["mord"], [V({
			positionType: "firstBaseline",
			children: [{
				type: "elem",
				elem: n
			}]
		})], t);
	},
	mathmlBuilder: (e, t) => {
		var n = new W("mpadded", [Wn(e.body, t)]);
		return e.smashHeight && n.setAttribute("height", "0px"), e.smashDepth && n.setAttribute("depth", "0px"), n;
	}
}), H({
	type: "sqrt",
	names: ["\\sqrt"],
	numArgs: 1,
	numOptionalArgs: 1,
	handler(e, t, n) {
		var { parser: r } = e, i = n[0], a = t[0];
		return {
			type: "sqrt",
			mode: r.mode,
			body: a,
			index: i
		};
	},
	htmlBuilder(e, t) {
		var n = U(e.body, t.havingCrampedStyle());
		n.height === 0 && (n.height = t.fontMetrics().xHeight), n = tn(n, t);
		var r = t.fontMetrics().defaultRuleThickness, i = r;
		t.style.id < O.TEXT.id && (i = t.fontMetrics().xHeight);
		var a = r + i / 4, { span: o, ruleWidth: s, advanceWidth: c } = Gr(n.height + n.depth + a + r, t), l = o.height - s;
		l > n.height + n.depth + a && (a = (a + l - n.height - n.depth) / 2);
		var u = o.height - n.height - a - s;
		n.style.paddingLeft = k(c);
		var d = V({
			positionType: "firstBaseline",
			children: [
				{
					type: "elem",
					elem: n,
					wrapperClasses: ["svg-align"]
				},
				{
					type: "kern",
					size: -(n.height + u)
				},
				{
					type: "elem",
					elem: o
				},
				{
					type: "kern",
					size: s
				}
			]
		});
		if (e.index) {
			var f = t.havingStyle(O.SCRIPTSCRIPT), p = U(e.index, f, t);
			return B(["mord", "sqrt"], [B(["root"], [V({
				positionType: "shift",
				positionData: -(.6 * (d.height - d.depth)),
				children: [{
					type: "elem",
					elem: p
				}]
			})]), d], t);
		} else return B(["mord", "sqrt"], [d], t);
	},
	mathmlBuilder(e, t) {
		var { body: n, index: r } = e;
		return r ? new W("mroot", [Wn(n, t), Wn(r, t)]) : new W("msqrt", [Wn(n, t)]);
	}
});
var Gi = {
	display: O.DISPLAY,
	text: O.TEXT,
	script: O.SCRIPT,
	scriptscript: O.SCRIPTSCRIPT
};
function Ki(e) {
	return e in Gi;
}
H({
	type: "styling",
	names: [
		"\\displaystyle",
		"\\textstyle",
		"\\scriptstyle",
		"\\scriptscriptstyle"
	],
	numArgs: 0,
	allowedInText: !0,
	primitive: !0,
	handler(e, t) {
		var { breakOnTokenText: n, funcName: r, parser: i } = e, a = i.parseExpression(!0, n), o = r.slice(1, r.length - 5);
		if (!Ki(o)) throw Error("Unknown style: " + o);
		return {
			type: "styling",
			mode: i.mode,
			style: o,
			body: a
		};
	},
	htmlBuilder(e, t) {
		var n = Gi[e.style], r = t.havingStyle(n);
		return e.resetFont && (r = r.withFont("")), Ui(e.body, r, t);
	},
	mathmlBuilder(e, t) {
		var n = Gi[e.style], r = t.havingStyle(n);
		e.resetFont && (r = r.withFont(""));
		var i = new W("mstyle", Hn(e.body, r)), a = {
			display: ["0", "true"],
			text: ["0", "false"],
			script: ["1", "false"],
			scriptscript: ["2", "false"]
		}[e.style];
		return i.setAttribute("scriptlevel", a[0]), i.setAttribute("displaystyle", a[1]), i;
	}
});
var qi = function(e, t) {
	var n = e.base;
	return n ? n.type === "op" ? n.limits && (t.style.size === O.DISPLAY.size || n.alwaysHandleSupSub) ? Ri : null : n.type === "operatorname" ? n.alwaysHandleSupSub && (t.style.size === O.DISPLAY.size || n.limits) ? Hi : null : n.type === "accent" ? h(n.base) ? fr : null : n.type === "horizBrace" && !e.sub === n.isOver ? Ni : null : null;
};
_n({
	type: "supsub",
	htmlBuilder(e, t) {
		var n = qi(e, t);
		if (n) return n(e, t);
		var { base: r, sup: i, sub: a } = e, o = U(r, t), s, c, l = t.fontMetrics(), u = 0, d = 0, f = r && h(r);
		if (i) {
			var p = t.havingStyle(t.style.sup());
			s = U(i, p, t), f || (u = o.height - p.fontMetrics().supDrop * p.sizeMultiplier / t.sizeMultiplier);
		}
		if (a) {
			var m = t.havingStyle(t.style.sub());
			c = U(a, m, t), f || (d = o.depth + m.fontMetrics().subDrop * m.sizeMultiplier / t.sizeMultiplier);
		}
		var g = t.style === O.DISPLAY ? l.sup1 : t.style.cramped ? l.sup3 : l.sup2, _ = t.sizeMultiplier, v = k(.5 / l.ptPerEm / _), y = null;
		if (c) {
			var b = e.base && e.base.type === "op" && e.base.name && (e.base.name === "\\oiint" || e.base.name === "\\oiiint");
			(o instanceof Ue || b) && (y = k(-(o.italic ?? 0)));
		}
		var x;
		if (s && c) {
			u = Math.max(u, g, s.depth + .25 * l.xHeight), d = Math.max(d, l.sub2);
			var S = 4 * l.defaultRuleThickness;
			if (u - s.depth - (c.height - d) < S) {
				d = S - (u - s.depth) + c.height;
				var C = .8 * l.xHeight - (u - s.depth);
				C > 0 && (u += C, d -= C);
			}
			x = V({
				positionType: "individualShift",
				children: [{
					type: "elem",
					elem: c,
					shift: d,
					marginRight: v,
					marginLeft: y
				}, {
					type: "elem",
					elem: s,
					shift: -u,
					marginRight: v
				}]
			});
		} else if (c) d = Math.max(d, l.sub1, c.height - .8 * l.xHeight), x = V({
			positionType: "shift",
			positionData: d,
			children: [{
				type: "elem",
				elem: c,
				marginLeft: y,
				marginRight: v
			}]
		});
		else if (s) u = Math.max(u, g, s.depth + .25 * l.xHeight), x = V({
			positionType: "shift",
			positionData: -u,
			children: [{
				type: "elem",
				elem: s,
				marginRight: v
			}]
		});
		else throw Error("supsub must have either sup or sub.");
		return B([On(o, "right") || "mord"], [o, B(["msupsub"], [x])], t);
	},
	mathmlBuilder(e, t) {
		var n = !1, r, i;
		e.base && e.base.type === "horizBrace" && (i = !!e.sup, i === e.base.isOver && (n = !0, r = e.base.isOver)), e.base && (e.base.type === "op" || e.base.type === "operatorname") && (e.base.parentIsSupSub = !0);
		var a = [Wn(e.base, t)];
		e.sub && a.push(Wn(e.sub, t)), e.sup && a.push(Wn(e.sup, t));
		var o;
		if (n) o = r ? "mover" : "munder";
		else if (!e.sub) {
			var s = e.base;
			o = s && s.type === "op" && s.limits && (t.style === O.DISPLAY || s.alwaysHandleSupSub) || s && s.type === "operatorname" && s.alwaysHandleSupSub && (s.limits || t.style === O.DISPLAY) ? "mover" : "msup";
		} else if (e.sup) {
			var c = e.base;
			o = c && c.type === "op" && c.limits && t.style === O.DISPLAY || c && c.type === "operatorname" && c.alwaysHandleSupSub && (t.style === O.DISPLAY || c.limits) ? "munderover" : "msubsup";
		} else {
			var l = e.base;
			o = l && l.type === "op" && l.limits && (t.style === O.DISPLAY || l.alwaysHandleSupSub) || l && l.type === "operatorname" && l.alwaysHandleSupSub && (l.limits || t.style === O.DISPLAY) ? "munder" : "msub";
		}
		return new W(o, a);
	}
}), _n({
	type: "atom",
	htmlBuilder(e, t) {
		return Gt(e.text, e.mode, t, ["m" + e.family]);
	},
	mathmlBuilder(e, t) {
		var n = new W("mo", [Ln(e.text, e.mode)]);
		if (e.family === "bin") {
			var r = Bn(e, t);
			r === "bold-italic" && n.setAttribute("mathvariant", r);
		} else e.family === "punct" ? n.setAttribute("separator", "true") : (e.family === "open" || e.family === "close") && n.setAttribute("stretchy", "false");
		return n;
	}
});
var Ji = {
	mi: "italic",
	mn: "normal",
	mtext: "normal"
};
_n({
	type: "mathord",
	htmlBuilder(e, t) {
		return qt(e, t);
	},
	mathmlBuilder(e, t) {
		var n = new W("mi", [Ln(e.text, e.mode, t)]), r = Bn(e, t) || "italic";
		return r !== Ji[n.type] && n.setAttribute("mathvariant", r), n;
	}
}), _n({
	type: "textord",
	htmlBuilder(e, t) {
		return qt(e, t);
	},
	mathmlBuilder(e, t) {
		var n = Ln(e.text, e.mode, t), r = Bn(e, t) || "normal", i = e.mode === "text" ? new W("mtext", [n]) : /[0-9]/.test(e.text) ? new W("mn", [n]) : e.text === "\\prime" ? new W("mo", [n]) : new W("mi", [n]);
		return r !== Ji[i.type] && i.setAttribute("mathvariant", r), i;
	}
});
var Yi = {
	"\\nobreak": "nobreak",
	"\\allowbreak": "allowbreak"
}, Xi = {
	" ": {},
	"\\ ": {},
	"~": { className: "nobreak" },
	"\\space": {},
	"\\nobreakspace": { className: "nobreak" }
};
_n({
	type: "spacing",
	htmlBuilder(e, t) {
		if (Xi.hasOwnProperty(e.text)) {
			var n = Xi[e.text].className || "";
			if (e.mode === "text") {
				var r = qt(e, t);
				return r.classes.push(n), r;
			} else return B(["mspace", n], [Gt(e.text, e.mode, t)], t);
		} else if (Yi.hasOwnProperty(e.text)) return B(["mspace", Yi[e.text]], [], t);
		else throw new s("Unknown type of space \"" + e.text + "\"");
	},
	mathmlBuilder(e, t) {
		var n;
		if (Xi.hasOwnProperty(e.text)) n = new W("mtext", [new Nn("\xA0")]);
		else if (Yi.hasOwnProperty(e.text)) return new W("mspace");
		else throw new s("Unknown type of space \"" + e.text + "\"");
		return n;
	}
});
var Zi = () => {
	var e = new W("mtd", []);
	return e.setAttribute("width", "50%"), e;
};
_n({
	type: "tag",
	mathmlBuilder(e, t) {
		var n = new W("mtable", [new W("mtr", [
			Zi(),
			new W("mtd", [Un(e.body, t)]),
			Zi(),
			new W("mtd", [Un(e.tag, t)])
		])]);
		return n.setAttribute("width", "100%"), n;
	}
});
var Qi = {
	"\\text": void 0,
	"\\textrm": "textrm",
	"\\textsf": "textsf",
	"\\texttt": "texttt",
	"\\textnormal": "textrm"
}, $i = {
	"\\textbf": "textbf",
	"\\textmd": "textmd"
}, ea = {
	"\\textit": "textit",
	"\\textup": "textup"
}, ta = (e, t) => {
	var n = e.font;
	return n ? Qi[n] ? t.withTextFontFamily(Qi[n]) : $i[n] ? t.withTextFontWeight($i[n]) : n === "\\emph" ? t.fontShape === "textit" ? t.withTextFontShape("textup") : t.withTextFontShape("textit") : t.withTextFontShape(ea[n]) : t;
};
H({
	type: "text",
	names: [
		"\\text",
		"\\textrm",
		"\\textsf",
		"\\texttt",
		"\\textnormal",
		"\\textbf",
		"\\textmd",
		"\\textit",
		"\\textup",
		"\\emph"
	],
	numArgs: 1,
	argTypes: ["text"],
	allowedInArgument: !0,
	allowedInText: !0,
	handler(e, t) {
		var { parser: n, funcName: r } = e, i = t[0];
		return {
			type: "text",
			mode: n.mode,
			body: yn(i),
			font: r
		};
	},
	htmlBuilder(e, t) {
		var n = ta(e, t);
		return B(["mord", "text"], wn(e.body, n, !0), n);
	},
	mathmlBuilder(e, t) {
		var n = ta(e, t);
		return Un(e.body, n);
	}
}), H({
	type: "underline",
	names: ["\\underline"],
	numArgs: 1,
	allowedInText: !0,
	handler(e, t) {
		var { parser: n } = e;
		return {
			type: "underline",
			mode: n.mode,
			body: t[0]
		};
	},
	htmlBuilder(e, t) {
		var n = U(e.body, t), r = Qt("underline-line", t), i = t.fontMetrics().defaultRuleThickness;
		return B(["mord", "underline"], [V({
			positionType: "top",
			positionData: n.height,
			children: [
				{
					type: "kern",
					size: i
				},
				{
					type: "elem",
					elem: r
				},
				{
					type: "kern",
					size: 3 * i
				},
				{
					type: "elem",
					elem: n
				}
			]
		})], t);
	},
	mathmlBuilder(e, t) {
		var n = new W("mo", [new Nn("‾")]);
		n.setAttribute("stretchy", "true");
		var r = new W("munder", [Wn(e.body, t), n]);
		return r.setAttribute("accentunder", "true"), r;
	}
}), H({
	type: "vcenter",
	names: ["\\vcenter"],
	numArgs: 1,
	argTypes: ["original"],
	allowedInText: !1,
	handler(e, t) {
		var { parser: n } = e;
		return {
			type: "vcenter",
			mode: n.mode,
			body: t[0]
		};
	},
	htmlBuilder(e, t) {
		var n = U(e.body, t), r = t.fontMetrics().axisHeight;
		return V({
			positionType: "shift",
			positionData: .5 * (n.height - r - (n.depth + r)),
			children: [{
				type: "elem",
				elem: n
			}]
		});
	},
	mathmlBuilder(e, t) {
		return new W("mrow", [new W("mpadded", [Wn(e.body, t)], ["vcenter"])]);
	}
}), H({
	type: "verb",
	names: ["\\verb"],
	numArgs: 0,
	allowedInText: !0,
	handler(e, t, n) {
		throw new s("\\verb ended by end of line instead of matching delimiter");
	},
	htmlBuilder(e, t) {
		for (var n = na(e), r = [], i = t.havingStyle(t.style.text()), a = 0; a < n.length; a++) {
			var o = n[a];
			o === "~" && (o = "\\textasciitilde"), r.push(Wt(o, "Typewriter-Regular", e.mode, i, ["mord", "texttt"]));
		}
		return B(["mord", "text"].concat(i.sizingClasses(t)), Yt(r), i);
	},
	mathmlBuilder(e, t) {
		var n = new W("mtext", [new Nn(na(e))]);
		return n.setAttribute("mathvariant", "monospace"), n;
	}
});
var na = (e) => e.body.replace(/ /g, e.star ? "␣" : "\xA0"), ra = mn, ia = "[ \r\n	]", aa = "\\\\[a-zA-Z@]+", oa = "\\\\[^\ud800-\udfff]", sa = "(" + aa + ")" + ia + "*", ca = "\\\\(\n|[ \r	]+\n?)[ \r	]*", la = "[̀-ͯ]", ua = RegExp(la + "+$"), da = "(" + ia + "+)|" + (ca + "|") + "([!-\\[\\]-‧‪-퟿豈-￿]" + (la + "*") + "|[\ud800-\udbff][\udc00-\udfff]" + (la + "*") + "|\\\\verb\\*([^]).*?\\4|\\\\verb([^*a-zA-Z]).*?\\5" + ("|" + sa) + ("|" + oa + ")"), fa = class {
	constructor(e, t) {
		this.input = void 0, this.settings = void 0, this.tokenRegex = void 0, this.catcodes = void 0, this.input = e, this.settings = t, this.tokenRegex = new RegExp(da, "g"), this.catcodes = {
			"%": 14,
			"~": 13
		};
	}
	setCatcode(e, t) {
		this.catcodes[e] = t;
	}
	lex() {
		var e = this.input, t = this.tokenRegex.lastIndex;
		if (t === e.length) return new pi("EOF", new fi(this, t, t));
		var n = this.tokenRegex.exec(e);
		if (n === null || n.index !== t) throw new s("Unexpected character: '" + e[t] + "'", new pi(e[t], new fi(this, t, t + 1)));
		var r = n[6] || n[3] || (n[2] ? "\\ " : " ");
		if (this.catcodes[r] === 14) {
			var i = e.indexOf("\n", this.tokenRegex.lastIndex);
			return i === -1 ? (this.tokenRegex.lastIndex = e.length, this.settings.reportNonstrict("commentAtEnd", "% comment has no terminating newline; LaTeX would fail because of commenting the end of math mode (e.g. $)")) : this.tokenRegex.lastIndex = i + 1, this.lex();
		}
		return new pi(r, new fi(this, t, this.tokenRegex.lastIndex));
	}
}, pa = class {
	constructor(e, t) {
		e === void 0 && (e = {}), t === void 0 && (t = {}), this.current = void 0, this.builtins = void 0, this.undefStack = void 0, this.current = t, this.builtins = e, this.undefStack = [];
	}
	beginGroup() {
		this.undefStack.push({});
	}
	endGroup() {
		if (this.undefStack.length === 0) throw new s("Unbalanced namespace destruction: attempt to pop global namespace; please report this as a bug");
		var e = this.undefStack.pop();
		for (var t in e) e.hasOwnProperty(t) && (e[t] == null ? delete this.current[t] : this.current[t] = e[t]);
	}
	endGroups() {
		for (; this.undefStack.length > 0;) this.endGroup();
	}
	has(e) {
		return this.current.hasOwnProperty(e) || this.builtins.hasOwnProperty(e);
	}
	get(e) {
		return this.current.hasOwnProperty(e) ? this.current[e] : this.builtins[e];
	}
	set(e, t, n) {
		if (n === void 0 && (n = !1), n) {
			for (var r = 0; r < this.undefStack.length; r++) delete this.undefStack[r][e];
			this.undefStack.length > 0 && (this.undefStack[this.undefStack.length - 1][e] = t);
		} else {
			var i = this.undefStack[this.undefStack.length - 1];
			i && !i.hasOwnProperty(e) && (i[e] = this.current[e]);
		}
		t == null ? delete this.current[e] : this.current[e] = t;
	}
}, ma = di;
K("\\noexpand", function(e) {
	var t = e.popToken();
	return e.isExpandable(t.text) && (t.noexpand = !0, t.treatAsRelax = !0), {
		tokens: [t],
		numArgs: 0
	};
}), K("\\expandafter", function(e) {
	var t = e.popToken();
	return e.expandOnce(!0), {
		tokens: [t],
		numArgs: 0
	};
}), K("\\@firstoftwo", function(e) {
	return {
		tokens: e.consumeArgs(2)[0],
		numArgs: 0
	};
}), K("\\@secondoftwo", function(e) {
	return {
		tokens: e.consumeArgs(2)[1],
		numArgs: 0
	};
}), K("\\@ifnextchar", function(e) {
	var t = e.consumeArgs(3);
	e.consumeSpaces();
	var n = e.future();
	return t[0].length === 1 && t[0][0].text === n.text ? {
		tokens: t[1],
		numArgs: 0
	} : {
		tokens: t[2],
		numArgs: 0
	};
}), K("\\@ifstar", "\\@ifnextchar *{\\@firstoftwo{#1}}"), K("\\TextOrMath", function(e) {
	var t = e.consumeArgs(2);
	return e.mode === "text" ? {
		tokens: t[0],
		numArgs: 0
	} : {
		tokens: t[1],
		numArgs: 0
	};
});
var ha = {
	0: 0,
	1: 1,
	2: 2,
	3: 3,
	4: 4,
	5: 5,
	6: 6,
	7: 7,
	8: 8,
	9: 9,
	a: 10,
	A: 10,
	b: 11,
	B: 11,
	c: 12,
	C: 12,
	d: 13,
	D: 13,
	e: 14,
	E: 14,
	f: 15,
	F: 15
};
K("\\char", function(e) {
	var t = e.popToken(), n, r = 0;
	if (t.text === "'") n = 8, t = e.popToken();
	else if (t.text === "\"") n = 16, t = e.popToken();
	else if (t.text === "`") if (t = e.popToken(), t.text[0] === "\\") r = t.text.charCodeAt(1);
	else if (t.text === "EOF") throw new s("\\char` missing argument");
	else r = t.text.charCodeAt(0);
	else n = 10;
	if (n) {
		if (r = ha[t.text], r == null || r >= n) throw new s("Invalid base-" + n + " digit " + t.text);
		for (var i; (i = ha[e.future().text]) != null && i < n;) r *= n, r += i, e.popToken();
	}
	return "\\@char{" + r + "}";
});
var ga = (e, t, n, r) => {
	var i = e.consumeArg().tokens;
	if (i.length !== 1) throw new s("\\newcommand's first argument must be a macro name");
	var a = i[0].text, o = e.isDefined(a);
	if (o && !t) throw new s("\\newcommand{" + a + "} attempting to redefine " + (a + "; use \\renewcommand"));
	if (!o && !n) throw new s("\\renewcommand{" + a + "} when command " + a + " does not yet exist; use \\newcommand");
	var c = 0;
	if (i = e.consumeArg().tokens, i.length === 1 && i[0].text === "[") {
		for (var l = "", u = e.expandNextToken(); u.text !== "]" && u.text !== "EOF";) l += u.text, u = e.expandNextToken();
		if (!l.match(/^\s*[0-9]+\s*$/)) throw new s("Invalid number of arguments: " + l);
		c = parseInt(l), i = e.consumeArg().tokens;
	}
	return o && r || e.macros.set(a, {
		tokens: i,
		numArgs: c
	}), "";
};
K("\\newcommand", (e) => ga(e, !1, !0, !1)), K("\\renewcommand", (e) => ga(e, !0, !1, !1)), K("\\providecommand", (e) => ga(e, !0, !0, !0)), K("\\message", (e) => {
	var t = e.consumeArgs(1)[0];
	return console.log(t.reverse().map((e) => e.text).join("")), "";
}), K("\\errmessage", (e) => {
	var t = e.consumeArgs(1)[0];
	return console.error(t.reverse().map((e) => e.text).join("")), "";
}), K("\\show", (e) => {
	var t = e.popToken(), n = t.text;
	return console.log(t, e.macros.get(n), ra[n], rt.math[n], rt.text[n]), "";
}), K("\\bgroup", "{"), K("\\egroup", "}"), K("~", "\\nobreakspace"), K("\\lq", "`"), K("\\rq", "'"), K("\\aa", "\\r a"), K("\\AA", "\\r A"), K("\\textcopyright", "\\html@mathml{\\textcircled{c}}{\\char`©}"), K("\\copyright", "\\TextOrMath{\\textcopyright}{\\text{\\textcopyright}}"), K("\\textregistered", "\\html@mathml{\\textcircled{\\scriptsize R}}{\\char`®}"), K("ℬ", "\\mathscr{B}"), K("ℰ", "\\mathscr{E}"), K("ℱ", "\\mathscr{F}"), K("ℋ", "\\mathscr{H}"), K("ℐ", "\\mathscr{I}"), K("ℒ", "\\mathscr{L}"), K("ℳ", "\\mathscr{M}"), K("ℛ", "\\mathscr{R}"), K("ℭ", "\\mathfrak{C}"), K("ℌ", "\\mathfrak{H}"), K("ℨ", "\\mathfrak{Z}"), K("\\Bbbk", "\\Bbb{k}"), K("\\llap", "\\mathllap{\\textrm{#1}}"), K("\\rlap", "\\mathrlap{\\textrm{#1}}"), K("\\clap", "\\mathclap{\\textrm{#1}}"), K("\\mathstrut", "\\vphantom{(}"), K("\\underbar", "\\underline{\\text{#1}}"), K("\\not", "\\html@mathml{\\mathrel{\\mathrlap\\@not}\\nobreak}{\\char\"338}"), K("\\neq", "\\html@mathml{\\mathrel{\\not=}}{\\mathrel{\\char`≠}}"), K("\\ne", "\\neq"), K("≠", "\\neq"), K("\\notin", "\\html@mathml{\\mathrel{{\\in}\\mathllap{/\\mskip1mu}}}{\\mathrel{\\char`∉}}"), K("∉", "\\notin"), K("≘", "\\html@mathml{\\mathrel{=\\kern{-1em}\\raisebox{0.4em}{$\\scriptsize\\frown$}}}{\\mathrel{\\char`≘}}"), K("≙", "\\html@mathml{\\stackrel{\\tiny\\wedge}{=}}{\\mathrel{\\char`≘}}"), K("≚", "\\html@mathml{\\stackrel{\\tiny\\vee}{=}}{\\mathrel{\\char`≚}}"), K("≛", "\\html@mathml{\\stackrel{\\scriptsize\\star}{=}}{\\mathrel{\\char`≛}}"), K("≝", "\\html@mathml{\\stackrel{\\tiny\\mathrm{def}}{=}}{\\mathrel{\\char`≝}}"), K("≞", "\\html@mathml{\\stackrel{\\tiny\\mathrm{m}}{=}}{\\mathrel{\\char`≞}}"), K("≟", "\\html@mathml{\\stackrel{\\tiny?}{=}}{\\mathrel{\\char`≟}}"), K("⟂", "\\perp"), K("‼", "\\mathclose{!\\mkern-0.8mu!}"), K("∌", "\\notni"), K("⌜", "\\ulcorner"), K("⌝", "\\urcorner"), K("⌞", "\\llcorner"), K("⌟", "\\lrcorner"), K("©", "\\copyright"), K("®", "\\textregistered"), K("\\ulcorner", "\\html@mathml{\\@ulcorner}{\\mathop{\\char\"231c}}"), K("\\urcorner", "\\html@mathml{\\@urcorner}{\\mathop{\\char\"231d}}"), K("\\llcorner", "\\html@mathml{\\@llcorner}{\\mathop{\\char\"231e}}"), K("\\lrcorner", "\\html@mathml{\\@lrcorner}{\\mathop{\\char\"231f}}"), K("\\vdots", "{\\varvdots\\rule{0pt}{15pt}}"), K("⋮", "\\vdots"), K("\\varGamma", "\\mathit{\\Gamma}"), K("\\varDelta", "\\mathit{\\Delta}"), K("\\varTheta", "\\mathit{\\Theta}"), K("\\varLambda", "\\mathit{\\Lambda}"), K("\\varXi", "\\mathit{\\Xi}"), K("\\varPi", "\\mathit{\\Pi}"), K("\\varSigma", "\\mathit{\\Sigma}"), K("\\varUpsilon", "\\mathit{\\Upsilon}"), K("\\varPhi", "\\mathit{\\Phi}"), K("\\varPsi", "\\mathit{\\Psi}"), K("\\varOmega", "\\mathit{\\Omega}"), K("\\substack", "\\begin{subarray}{c}#1\\end{subarray}"), K("\\colon", "\\nobreak\\mskip2mu\\mathpunct{}\\mathchoice{\\mkern-3mu}{\\mkern-3mu}{}{}{:}\\mskip6mu\\relax"), K("\\boxed", "\\fbox{$\\displaystyle{#1}$}"), K("\\iff", "\\DOTSB\\;\\Longleftrightarrow\\;"), K("\\implies", "\\DOTSB\\;\\Longrightarrow\\;"), K("\\impliedby", "\\DOTSB\\;\\Longleftarrow\\;"), K("\\dddot", "{\\overset{\\raisebox{-0.1ex}{\\normalsize ...}}{#1}}"), K("\\ddddot", "{\\overset{\\raisebox{-0.1ex}{\\normalsize ....}}{#1}}");
var _a = {
	",": "\\dotsc",
	"\\not": "\\dotsb",
	"+": "\\dotsb",
	"=": "\\dotsb",
	"<": "\\dotsb",
	">": "\\dotsb",
	"-": "\\dotsb",
	"*": "\\dotsb",
	":": "\\dotsb",
	"\\DOTSB": "\\dotsb",
	"\\coprod": "\\dotsb",
	"\\bigvee": "\\dotsb",
	"\\bigwedge": "\\dotsb",
	"\\biguplus": "\\dotsb",
	"\\bigcap": "\\dotsb",
	"\\bigcup": "\\dotsb",
	"\\prod": "\\dotsb",
	"\\sum": "\\dotsb",
	"\\bigotimes": "\\dotsb",
	"\\bigoplus": "\\dotsb",
	"\\bigodot": "\\dotsb",
	"\\bigsqcup": "\\dotsb",
	"\\And": "\\dotsb",
	"\\longrightarrow": "\\dotsb",
	"\\Longrightarrow": "\\dotsb",
	"\\longleftarrow": "\\dotsb",
	"\\Longleftarrow": "\\dotsb",
	"\\longleftrightarrow": "\\dotsb",
	"\\Longleftrightarrow": "\\dotsb",
	"\\mapsto": "\\dotsb",
	"\\longmapsto": "\\dotsb",
	"\\hookrightarrow": "\\dotsb",
	"\\doteq": "\\dotsb",
	"\\mathbin": "\\dotsb",
	"\\mathrel": "\\dotsb",
	"\\relbar": "\\dotsb",
	"\\Relbar": "\\dotsb",
	"\\xrightarrow": "\\dotsb",
	"\\xleftarrow": "\\dotsb",
	"\\DOTSI": "\\dotsi",
	"\\int": "\\dotsi",
	"\\oint": "\\dotsi",
	"\\iint": "\\dotsi",
	"\\iiint": "\\dotsi",
	"\\iiiint": "\\dotsi",
	"\\idotsint": "\\dotsi",
	"\\DOTSX": "\\dotsx"
}, va = new Set(["bin", "rel"]);
K("\\dots", function(e) {
	var t = "\\dotso", n = e.expandAfterFuture().text;
	return n in _a ? t = _a[n] : (n.slice(0, 4) === "\\not" || n in rt.math && va.has(rt.math[n].group)) && (t = "\\dotsb"), t;
});
var ya = {
	")": !0,
	"]": !0,
	"\\rbrack": !0,
	"\\}": !0,
	"\\rbrace": !0,
	"\\rangle": !0,
	"\\rceil": !0,
	"\\rfloor": !0,
	"\\rgroup": !0,
	"\\rmoustache": !0,
	"\\right": !0,
	"\\bigr": !0,
	"\\biggr": !0,
	"\\Bigr": !0,
	"\\Biggr": !0,
	$: !0,
	";": !0,
	".": !0,
	",": !0
};
K("\\dotso", function(e) {
	return e.future().text in ya ? "\\ldots\\," : "\\ldots";
}), K("\\dotsc", function(e) {
	var t = e.future().text;
	return t in ya && t !== "," ? "\\ldots\\," : "\\ldots";
}), K("\\cdots", function(e) {
	return e.future().text in ya ? "\\@cdots\\," : "\\@cdots";
}), K("\\dotsb", "\\cdots"), K("\\dotsm", "\\cdots"), K("\\dotsi", "\\!\\cdots"), K("\\dotsx", "\\ldots\\,"), K("\\DOTSI", "\\relax"), K("\\DOTSB", "\\relax"), K("\\DOTSX", "\\relax"), K("\\tmspace", "\\TextOrMath{\\kern#1#3}{\\mskip#1#2}\\relax"), K("\\,", "\\tmspace+{3mu}{.1667em}"), K("\\thinspace", "\\,"), K("\\>", "\\mskip{4mu}"), K("\\:", "\\tmspace+{4mu}{.2222em}"), K("\\medspace", "\\:"), K("\\;", "\\tmspace+{5mu}{.2777em}"), K("\\thickspace", "\\;"), K("\\!", "\\tmspace-{3mu}{.1667em}"), K("\\negthinspace", "\\!"), K("\\negmedspace", "\\tmspace-{4mu}{.2222em}"), K("\\negthickspace", "\\tmspace-{5mu}{.277em}"), K("\\enspace", "\\kern.5em "), K("\\enskip", "\\hskip.5em\\relax"), K("\\quad", "\\hskip1em\\relax"), K("\\qquad", "\\hskip2em\\relax"), K("\\tag", "\\@ifstar\\tag@literal\\tag@paren"), K("\\tag@paren", "\\tag@literal{({#1})}"), K("\\tag@literal", (e) => {
	if (e.macros.get("\\df@tag")) throw new s("Multiple \\tag");
	return "\\gdef\\df@tag{\\text{#1}}";
}), K("\\bmod", "\\mathchoice{\\mskip1mu}{\\mskip1mu}{\\mskip5mu}{\\mskip5mu}\\mathbin{\\rm mod}\\mathchoice{\\mskip1mu}{\\mskip1mu}{\\mskip5mu}{\\mskip5mu}"), K("\\pod", "\\allowbreak\\mathchoice{\\mkern18mu}{\\mkern8mu}{\\mkern8mu}{\\mkern8mu}(#1)"), K("\\pmod", "\\pod{{\\rm mod}\\mkern6mu#1}"), K("\\mod", "\\allowbreak\\mathchoice{\\mkern18mu}{\\mkern12mu}{\\mkern12mu}{\\mkern12mu}{\\rm mod}\\,\\,#1"), K("\\newline", "\\\\\\relax"), K("\\TeX", "\\textrm{\\html@mathml{T\\kern-.1667em\\raisebox{-.5ex}{E}\\kern-.125emX}{TeX}}");
var ba = k(Xe["Main-Regular"][84][1] - .7 * Xe["Main-Regular"][65][1]);
K("\\LaTeX", "\\textrm{\\html@mathml{" + ("L\\kern-.36em\\raisebox{" + ba + "}{\\scriptstyle A}") + "\\kern-.15em\\TeX}{LaTeX}}"), K("\\KaTeX", "\\textrm{\\html@mathml{" + ("K\\kern-.17em\\raisebox{" + ba + "}{\\scriptstyle A}") + "\\kern-.15em\\TeX}{KaTeX}}"), K("\\hspace", "\\@ifstar\\@hspacer\\@hspace"), K("\\@hspace", "\\hskip #1\\relax"), K("\\@hspacer", "\\rule{0pt}{0pt}\\hskip #1\\relax"), K("\\ordinarycolon", ":"), K("\\vcentcolon", "\\mathrel{\\mathop\\ordinarycolon}"), K("\\dblcolon", "\\html@mathml{\\mathrel{\\vcentcolon\\mathrel{\\mkern-.9mu}\\vcentcolon}}{\\mathop{\\char\"2237}}"), K("\\coloneqq", "\\html@mathml{\\mathrel{\\vcentcolon\\mathrel{\\mkern-1.2mu}=}}{\\mathop{\\char\"2254}}"), K("\\Coloneqq", "\\html@mathml{\\mathrel{\\dblcolon\\mathrel{\\mkern-1.2mu}=}}{\\mathop{\\char\"2237\\char\"3d}}"), K("\\coloneq", "\\html@mathml{\\mathrel{\\vcentcolon\\mathrel{\\mkern-1.2mu}\\mathrel{-}}}{\\mathop{\\char\"3a\\char\"2212}}"), K("\\Coloneq", "\\html@mathml{\\mathrel{\\dblcolon\\mathrel{\\mkern-1.2mu}\\mathrel{-}}}{\\mathop{\\char\"2237\\char\"2212}}"), K("\\eqqcolon", "\\html@mathml{\\mathrel{=\\mathrel{\\mkern-1.2mu}\\vcentcolon}}{\\mathop{\\char\"2255}}"), K("\\Eqqcolon", "\\html@mathml{\\mathrel{=\\mathrel{\\mkern-1.2mu}\\dblcolon}}{\\mathop{\\char\"3d\\char\"2237}}"), K("\\eqcolon", "\\html@mathml{\\mathrel{\\mathrel{-}\\mathrel{\\mkern-1.2mu}\\vcentcolon}}{\\mathop{\\char\"2239}}"), K("\\Eqcolon", "\\html@mathml{\\mathrel{\\mathrel{-}\\mathrel{\\mkern-1.2mu}\\dblcolon}}{\\mathop{\\char\"2212\\char\"2237}}"), K("\\colonapprox", "\\html@mathml{\\mathrel{\\vcentcolon\\mathrel{\\mkern-1.2mu}\\approx}}{\\mathop{\\char\"3a\\char\"2248}}"), K("\\Colonapprox", "\\html@mathml{\\mathrel{\\dblcolon\\mathrel{\\mkern-1.2mu}\\approx}}{\\mathop{\\char\"2237\\char\"2248}}"), K("\\colonsim", "\\html@mathml{\\mathrel{\\vcentcolon\\mathrel{\\mkern-1.2mu}\\sim}}{\\mathop{\\char\"3a\\char\"223c}}"), K("\\Colonsim", "\\html@mathml{\\mathrel{\\dblcolon\\mathrel{\\mkern-1.2mu}\\sim}}{\\mathop{\\char\"2237\\char\"223c}}"), K("∷", "\\dblcolon"), K("∹", "\\eqcolon"), K("≔", "\\coloneqq"), K("≕", "\\eqqcolon"), K("⩴", "\\Coloneqq"), K("\\ratio", "\\vcentcolon"), K("\\coloncolon", "\\dblcolon"), K("\\colonequals", "\\coloneqq"), K("\\coloncolonequals", "\\Coloneqq"), K("\\equalscolon", "\\eqqcolon"), K("\\equalscoloncolon", "\\Eqqcolon"), K("\\colonminus", "\\coloneq"), K("\\coloncolonminus", "\\Coloneq"), K("\\minuscolon", "\\eqcolon"), K("\\minuscoloncolon", "\\Eqcolon"), K("\\coloncolonapprox", "\\Colonapprox"), K("\\coloncolonsim", "\\Colonsim"), K("\\simcolon", "\\mathrel{\\sim\\mathrel{\\mkern-1.2mu}\\vcentcolon}"), K("\\simcoloncolon", "\\mathrel{\\sim\\mathrel{\\mkern-1.2mu}\\dblcolon}"), K("\\approxcolon", "\\mathrel{\\approx\\mathrel{\\mkern-1.2mu}\\vcentcolon}"), K("\\approxcoloncolon", "\\mathrel{\\approx\\mathrel{\\mkern-1.2mu}\\dblcolon}"), K("\\notni", "\\html@mathml{\\not\\ni}{\\mathrel{\\char`∌}}"), K("\\limsup", "\\DOTSB\\operatorname*{lim\\,sup}"), K("\\liminf", "\\DOTSB\\operatorname*{lim\\,inf}"), K("\\injlim", "\\DOTSB\\operatorname*{inj\\,lim}"), K("\\projlim", "\\DOTSB\\operatorname*{proj\\,lim}"), K("\\varlimsup", "\\DOTSB\\operatorname*{\\overline{lim}}"), K("\\varliminf", "\\DOTSB\\operatorname*{\\underline{lim}}"), K("\\varinjlim", "\\DOTSB\\operatorname*{\\underrightarrow{lim}}"), K("\\varprojlim", "\\DOTSB\\operatorname*{\\underleftarrow{lim}}"), K("\\gvertneqq", "\\html@mathml{\\@gvertneqq}{≩}"), K("\\lvertneqq", "\\html@mathml{\\@lvertneqq}{≨}"), K("\\ngeqq", "\\html@mathml{\\@ngeqq}{≱}"), K("\\ngeqslant", "\\html@mathml{\\@ngeqslant}{≱}"), K("\\nleqq", "\\html@mathml{\\@nleqq}{≰}"), K("\\nleqslant", "\\html@mathml{\\@nleqslant}{≰}"), K("\\nshortmid", "\\html@mathml{\\@nshortmid}{∤}"), K("\\nshortparallel", "\\html@mathml{\\@nshortparallel}{∦}"), K("\\nsubseteqq", "\\html@mathml{\\@nsubseteqq}{⊈}"), K("\\nsupseteqq", "\\html@mathml{\\@nsupseteqq}{⊉}"), K("\\varsubsetneq", "\\html@mathml{\\@varsubsetneq}{⊊}"), K("\\varsubsetneqq", "\\html@mathml{\\@varsubsetneqq}{⫋}"), K("\\varsupsetneq", "\\html@mathml{\\@varsupsetneq}{⊋}"), K("\\varsupsetneqq", "\\html@mathml{\\@varsupsetneqq}{⫌}"), K("\\imath", "\\html@mathml{\\@imath}{ı}"), K("\\jmath", "\\html@mathml{\\@jmath}{ȷ}"), K("\\llbracket", "\\html@mathml{\\mathopen{[\\mkern-3.2mu[}}{\\mathopen{\\char`⟦}}"), K("\\rrbracket", "\\html@mathml{\\mathclose{]\\mkern-3.2mu]}}{\\mathclose{\\char`⟧}}"), K("⟦", "\\llbracket"), K("⟧", "\\rrbracket"), K("\\lBrace", "\\html@mathml{\\mathopen{\\{\\mkern-3.2mu[}}{\\mathopen{\\char`⦃}}"), K("\\rBrace", "\\html@mathml{\\mathclose{]\\mkern-3.2mu\\}}}{\\mathclose{\\char`⦄}}"), K("⦃", "\\lBrace"), K("⦄", "\\rBrace"), K("\\minuso", "\\mathbin{\\html@mathml{{\\mathrlap{\\mathchoice{\\kern{0.145em}}{\\kern{0.145em}}{\\kern{0.1015em}}{\\kern{0.0725em}}\\circ}{-}}}{\\char`⦵}}"), K("⦵", "\\minuso"), K("\\darr", "\\downarrow"), K("\\dArr", "\\Downarrow"), K("\\Darr", "\\Downarrow"), K("\\lang", "\\langle"), K("\\rang", "\\rangle"), K("\\uarr", "\\uparrow"), K("\\uArr", "\\Uparrow"), K("\\Uarr", "\\Uparrow"), K("\\N", "\\mathbb{N}"), K("\\R", "\\mathbb{R}"), K("\\Z", "\\mathbb{Z}"), K("\\alef", "\\aleph"), K("\\alefsym", "\\aleph"), K("\\Alpha", "\\mathrm{A}"), K("\\Beta", "\\mathrm{B}"), K("\\bull", "\\bullet"), K("\\Chi", "\\mathrm{X}"), K("\\clubs", "\\clubsuit"), K("\\cnums", "\\mathbb{C}"), K("\\Complex", "\\mathbb{C}"), K("\\Dagger", "\\ddagger"), K("\\diamonds", "\\diamondsuit"), K("\\empty", "\\emptyset"), K("\\Epsilon", "\\mathrm{E}"), K("\\Eta", "\\mathrm{H}"), K("\\exist", "\\exists"), K("\\harr", "\\leftrightarrow"), K("\\hArr", "\\Leftrightarrow"), K("\\Harr", "\\Leftrightarrow"), K("\\hearts", "\\heartsuit"), K("\\image", "\\Im"), K("\\infin", "\\infty"), K("\\Iota", "\\mathrm{I}"), K("\\isin", "\\in"), K("\\Kappa", "\\mathrm{K}"), K("\\larr", "\\leftarrow"), K("\\lArr", "\\Leftarrow"), K("\\Larr", "\\Leftarrow"), K("\\lrarr", "\\leftrightarrow"), K("\\lrArr", "\\Leftrightarrow"), K("\\Lrarr", "\\Leftrightarrow"), K("\\Mu", "\\mathrm{M}"), K("\\natnums", "\\mathbb{N}"), K("\\Nu", "\\mathrm{N}"), K("\\Omicron", "\\mathrm{O}"), K("\\plusmn", "\\pm"), K("\\rarr", "\\rightarrow"), K("\\rArr", "\\Rightarrow"), K("\\Rarr", "\\Rightarrow"), K("\\real", "\\Re"), K("\\reals", "\\mathbb{R}"), K("\\Reals", "\\mathbb{R}"), K("\\Rho", "\\mathrm{P}"), K("\\sdot", "\\cdot"), K("\\sect", "\\S"), K("\\spades", "\\spadesuit"), K("\\sub", "\\subset"), K("\\sube", "\\subseteq"), K("\\supe", "\\supseteq"), K("\\Tau", "\\mathrm{T}"), K("\\thetasym", "\\vartheta"), K("\\weierp", "\\wp"), K("\\Zeta", "\\mathrm{Z}"), K("\\argmin", "\\DOTSB\\operatorname*{arg\\,min}"), K("\\argmax", "\\DOTSB\\operatorname*{arg\\,max}"), K("\\plim", "\\DOTSB\\mathop{\\operatorname{plim}}\\limits"), K("\\bra", "\\mathinner{\\langle{#1}|}"), K("\\ket", "\\mathinner{|{#1}\\rangle}"), K("\\braket", "\\mathinner{\\langle{#1}\\rangle}"), K("\\Bra", "\\left\\langle#1\\right|"), K("\\Ket", "\\left|#1\\right\\rangle");
var xa = (e) => (t) => {
	var n = t.consumeArg().tokens, r = t.consumeArg().tokens, i = t.consumeArg().tokens, a = t.consumeArg().tokens, o = t.macros.get("|"), s = t.macros.get("\\|");
	t.macros.beginGroup();
	var c = (t) => (n) => {
		e && (n.macros.set("|", o), i.length && n.macros.set("\\|", s));
		var a = t;
		return !t && i.length && n.future().text === "|" && (n.popToken(), a = !0), {
			tokens: a ? i : r,
			numArgs: 0
		};
	};
	t.macros.set("|", c(!1)), i.length && t.macros.set("\\|", c(!0));
	var l = t.consumeArg().tokens, u = t.expandTokens([
		...a,
		...l,
		...n
	]);
	return t.macros.endGroup(), {
		tokens: u.reverse(),
		numArgs: 0
	};
};
K("\\bra@ket", xa(!1)), K("\\bra@set", xa(!0)), K("\\Braket", "\\bra@ket{\\left\\langle}{\\,\\middle\\vert\\,}{\\,\\middle\\vert\\,}{\\right\\rangle}"), K("\\Set", "\\bra@set{\\left\\{\\:}{\\;\\middle\\vert\\;}{\\;\\middle\\Vert\\;}{\\:\\right\\}}"), K("\\set", "\\bra@set{\\{\\,}{\\mid}{}{\\,\\}}"), K("\\angln", "{\\angl n}"), K("\\blue", "\\textcolor{##6495ed}{#1}"), K("\\orange", "\\textcolor{##ffa500}{#1}"), K("\\pink", "\\textcolor{##ff00af}{#1}"), K("\\red", "\\textcolor{##df0030}{#1}"), K("\\green", "\\textcolor{##28ae7b}{#1}"), K("\\gray", "\\textcolor{gray}{#1}"), K("\\purple", "\\textcolor{##9d38bd}{#1}"), K("\\blueA", "\\textcolor{##ccfaff}{#1}"), K("\\blueB", "\\textcolor{##80f6ff}{#1}"), K("\\blueC", "\\textcolor{##63d9ea}{#1}"), K("\\blueD", "\\textcolor{##11accd}{#1}"), K("\\blueE", "\\textcolor{##0c7f99}{#1}"), K("\\tealA", "\\textcolor{##94fff5}{#1}"), K("\\tealB", "\\textcolor{##26edd5}{#1}"), K("\\tealC", "\\textcolor{##01d1c1}{#1}"), K("\\tealD", "\\textcolor{##01a995}{#1}"), K("\\tealE", "\\textcolor{##208170}{#1}"), K("\\greenA", "\\textcolor{##b6ffb0}{#1}"), K("\\greenB", "\\textcolor{##8af281}{#1}"), K("\\greenC", "\\textcolor{##74cf70}{#1}"), K("\\greenD", "\\textcolor{##1fab54}{#1}"), K("\\greenE", "\\textcolor{##0d923f}{#1}"), K("\\goldA", "\\textcolor{##ffd0a9}{#1}"), K("\\goldB", "\\textcolor{##ffbb71}{#1}"), K("\\goldC", "\\textcolor{##ff9c39}{#1}"), K("\\goldD", "\\textcolor{##e07d10}{#1}"), K("\\goldE", "\\textcolor{##a75a05}{#1}"), K("\\redA", "\\textcolor{##fca9a9}{#1}"), K("\\redB", "\\textcolor{##ff8482}{#1}"), K("\\redC", "\\textcolor{##f9685d}{#1}"), K("\\redD", "\\textcolor{##e84d39}{#1}"), K("\\redE", "\\textcolor{##bc2612}{#1}"), K("\\maroonA", "\\textcolor{##ffbde0}{#1}"), K("\\maroonB", "\\textcolor{##ff92c6}{#1}"), K("\\maroonC", "\\textcolor{##ed5fa6}{#1}"), K("\\maroonD", "\\textcolor{##ca337c}{#1}"), K("\\maroonE", "\\textcolor{##9e034e}{#1}"), K("\\purpleA", "\\textcolor{##ddd7ff}{#1}"), K("\\purpleB", "\\textcolor{##c6b9fc}{#1}"), K("\\purpleC", "\\textcolor{##aa87ff}{#1}"), K("\\purpleD", "\\textcolor{##7854ab}{#1}"), K("\\purpleE", "\\textcolor{##543b78}{#1}"), K("\\mintA", "\\textcolor{##f5f9e8}{#1}"), K("\\mintB", "\\textcolor{##edf2df}{#1}"), K("\\mintC", "\\textcolor{##e0e5cc}{#1}"), K("\\grayA", "\\textcolor{##f6f7f7}{#1}"), K("\\grayB", "\\textcolor{##f0f1f2}{#1}"), K("\\grayC", "\\textcolor{##e3e5e6}{#1}"), K("\\grayD", "\\textcolor{##d6d8da}{#1}"), K("\\grayE", "\\textcolor{##babec2}{#1}"), K("\\grayF", "\\textcolor{##888d93}{#1}"), K("\\grayG", "\\textcolor{##626569}{#1}"), K("\\grayH", "\\textcolor{##3b3e40}{#1}"), K("\\grayI", "\\textcolor{##21242c}{#1}"), K("\\kaBlue", "\\textcolor{##314453}{#1}"), K("\\kaGreen", "\\textcolor{##71B307}{#1}");
var Sa = {
	"^": !0,
	_: !0,
	"\\limits": !0,
	"\\nolimits": !0
}, Ca = class {
	constructor(e, t, n) {
		this.settings = void 0, this.expansionCount = void 0, this.lexer = void 0, this.macros = void 0, this.stack = void 0, this.mode = void 0, this.settings = t, this.expansionCount = 0, this.feed(e), this.macros = new pa(ma, t.macros), this.mode = n, this.stack = [];
	}
	feed(e) {
		this.lexer = new fa(e, this.settings);
	}
	switchMode(e) {
		this.mode = e;
	}
	beginGroup() {
		this.macros.beginGroup();
	}
	endGroup() {
		this.macros.endGroup();
	}
	endGroups() {
		this.macros.endGroups();
	}
	future() {
		return this.stack.length === 0 && this.pushToken(this.lexer.lex()), this.stack[this.stack.length - 1];
	}
	popToken() {
		return this.future(), this.stack.pop();
	}
	pushToken(e) {
		this.stack.push(e);
	}
	pushTokens(e) {
		this.stack.push(...e);
	}
	scanArgument(e) {
		var t, n, r;
		if (e) {
			if (this.consumeSpaces(), this.future().text !== "[") return null;
			t = this.popToken(), {tokens: r, end: n} = this.consumeArg(["]"]);
		} else ({tokens: r, start: t, end: n} = this.consumeArg());
		return this.pushToken(new pi("EOF", n.loc)), this.pushTokens(r), new pi("", fi.range(t, n));
	}
	consumeSpaces() {
		for (; this.future().text === " ";) this.stack.pop();
	}
	consumeArg(e) {
		var t = [], n = e && e.length > 0;
		n || this.consumeSpaces();
		var r = this.future(), i, a = 0, o = 0;
		do {
			if (i = this.popToken(), t.push(i), i.text === "{") ++a;
			else if (i.text === "}") {
				if (--a, a === -1) throw new s("Extra }", i);
			} else if (i.text === "EOF") throw new s("Unexpected end of input in a macro argument, expected '" + (e && n ? e[o] : "}") + "'", i);
			if (e && n) if ((a === 0 || a === 1 && e[o] === "{") && i.text === e[o]) {
				if (++o, o === e.length) {
					t.splice(-o, o);
					break;
				}
			} else o = 0;
		} while (a !== 0 || n);
		return r.text === "{" && t[t.length - 1].text === "}" && (t.pop(), t.shift()), t.reverse(), {
			tokens: t,
			start: r,
			end: i
		};
	}
	consumeArgs(e, t) {
		if (t) {
			if (t.length !== e + 1) throw new s("The length of delimiters doesn't match the number of args!");
			for (var n = t[0], r = 0; r < n.length; r++) {
				var i = this.popToken();
				if (n[r] !== i.text) throw new s("Use of the macro doesn't match its definition", i);
			}
		}
		for (var a = [], o = 0; o < e; o++) a.push(this.consumeArg(t && t[o + 1]).tokens);
		return a;
	}
	countExpansion(e) {
		if (this.expansionCount += e, this.expansionCount > this.settings.maxExpand) throw new s("Too many expansions: infinite loop or need to increase maxExpand setting");
	}
	expandOnce(e) {
		var t = this.popToken(), n = t.text, r = t.noexpand ? null : this._getExpansion(n);
		if (r == null || e && r.unexpandable) {
			if (e && r == null && n[0] === "\\" && !this.isDefined(n)) throw new s("Undefined control sequence: " + n);
			return this.pushToken(t), !1;
		}
		this.countExpansion(1);
		var i = r.tokens, a = this.consumeArgs(r.numArgs, r.delimiters);
		if (r.numArgs) {
			i = i.slice();
			for (var o = i.length - 1; o >= 0; --o) {
				var c = i[o];
				if (c.text === "#") {
					if (o === 0) throw new s("Incomplete placeholder at end of macro body", c);
					if (c = i[--o], c.text === "#") i.splice(o + 1, 1);
					else if (/^[1-9]$/.test(c.text)) i.splice(o, 2, ...a[c.text - 1]);
					else throw new s("Not a valid argument number", c);
				}
			}
		}
		return this.pushTokens(i), i.length;
	}
	expandAfterFuture() {
		return this.expandOnce(), this.future();
	}
	expandNextToken() {
		for (;;) if (this.expandOnce() === !1) {
			var e = this.stack.pop();
			return e.treatAsRelax && (e.text = "\\relax"), e;
		}
	}
	expandMacro(e) {
		return this.macros.has(e) ? this.expandTokens([new pi(e)]) : void 0;
	}
	expandTokens(e) {
		var t = [], n = this.stack.length;
		for (this.pushTokens(e); this.stack.length > n;) if (this.expandOnce(!0) === !1) {
			var r = this.stack.pop();
			r.treatAsRelax &&= (r.noexpand = !1, !1), t.push(r);
		}
		return this.countExpansion(t.length), t;
	}
	expandMacroAsText(e) {
		var t = this.expandMacro(e);
		return t && t.map((e) => e.text).join("");
	}
	_getExpansion(e) {
		var t = this.macros.get(e);
		if (t == null) return t;
		if (e.length === 1) {
			var n = this.lexer.catcodes[e];
			if (n != null && n !== 13) return;
		}
		var r = typeof t == "function" ? t(this) : t;
		if (typeof r == "string") {
			var i = 0;
			if (r.includes("#")) for (var a = r.replace(/##/g, ""); a.includes("#" + (i + 1));) ++i;
			for (var o = new fa(r, this.settings), s = [], c = o.lex(); c.text !== "EOF";) s.push(c), c = o.lex();
			return s.reverse(), {
				tokens: s,
				numArgs: i
			};
		}
		return r;
	}
	isDefined(e) {
		return this.macros.has(e) || ra.hasOwnProperty(e) || rt.math.hasOwnProperty(e) || rt.text.hasOwnProperty(e) || Sa.hasOwnProperty(e);
	}
	isExpandable(e) {
		var t = this.macros.get(e);
		return t == null ? ra.hasOwnProperty(e) && !ra[e].primitive : typeof t == "string" || typeof t == "function" || !t.unexpandable;
	}
}, wa = /^[₊₋₌₍₎₀₁₂₃₄₅₆₇₈₉ₐₑₕᵢⱼₖₗₘₙₒₚᵣₛₜᵤᵥₓᵦᵧᵨᵩᵪ]/, Ta = Object.freeze({
	"₊": "+",
	"₋": "-",
	"₌": "=",
	"₍": "(",
	"₎": ")",
	"₀": "0",
	"₁": "1",
	"₂": "2",
	"₃": "3",
	"₄": "4",
	"₅": "5",
	"₆": "6",
	"₇": "7",
	"₈": "8",
	"₉": "9",
	ₐ: "a",
	ₑ: "e",
	ₕ: "h",
	ᵢ: "i",
	ⱼ: "j",
	ₖ: "k",
	ₗ: "l",
	ₘ: "m",
	ₙ: "n",
	ₒ: "o",
	ₚ: "p",
	ᵣ: "r",
	ₛ: "s",
	ₜ: "t",
	ᵤ: "u",
	ᵥ: "v",
	ₓ: "x",
	ᵦ: "β",
	ᵧ: "γ",
	ᵨ: "ρ",
	ᵩ: "ϕ",
	ᵪ: "χ",
	"⁺": "+",
	"⁻": "-",
	"⁼": "=",
	"⁽": "(",
	"⁾": ")",
	"⁰": "0",
	"¹": "1",
	"²": "2",
	"³": "3",
	"⁴": "4",
	"⁵": "5",
	"⁶": "6",
	"⁷": "7",
	"⁸": "8",
	"⁹": "9",
	ᴬ: "A",
	ᴮ: "B",
	ᴰ: "D",
	ᴱ: "E",
	ᴳ: "G",
	ᴴ: "H",
	ᴵ: "I",
	ᴶ: "J",
	ᴷ: "K",
	ᴸ: "L",
	ᴹ: "M",
	ᴺ: "N",
	ᴼ: "O",
	ᴾ: "P",
	ᴿ: "R",
	ᵀ: "T",
	ᵁ: "U",
	ⱽ: "V",
	ᵂ: "W",
	ᵃ: "a",
	ᵇ: "b",
	ᶜ: "c",
	ᵈ: "d",
	ᵉ: "e",
	ᶠ: "f",
	ᵍ: "g",
	ʰ: "h",
	ⁱ: "i",
	ʲ: "j",
	ᵏ: "k",
	ˡ: "l",
	ᵐ: "m",
	ⁿ: "n",
	ᵒ: "o",
	ᵖ: "p",
	ʳ: "r",
	ˢ: "s",
	ᵗ: "t",
	ᵘ: "u",
	ᵛ: "v",
	ʷ: "w",
	ˣ: "x",
	ʸ: "y",
	ᶻ: "z",
	ᵝ: "β",
	ᵞ: "γ",
	ᵟ: "δ",
	ᵠ: "ϕ",
	ᵡ: "χ",
	ᶿ: "θ"
}), Ea = {
	"́": {
		text: "\\'",
		math: "\\acute"
	},
	"̀": {
		text: "\\`",
		math: "\\grave"
	},
	"̈": {
		text: "\\\"",
		math: "\\ddot"
	},
	"̃": {
		text: "\\~",
		math: "\\tilde"
	},
	"̄": {
		text: "\\=",
		math: "\\bar"
	},
	"̆": {
		text: "\\u",
		math: "\\breve"
	},
	"̌": {
		text: "\\v",
		math: "\\check"
	},
	"̂": {
		text: "\\^",
		math: "\\hat"
	},
	"̇": {
		text: "\\.",
		math: "\\dot"
	},
	"̊": {
		text: "\\r",
		math: "\\mathring"
	},
	"̋": { text: "\\H" },
	"̧": { text: "\\c" }
}, Da = {
	á: "á",
	à: "à",
	ä: "ä",
	ǟ: "ǟ",
	ã: "ã",
	ā: "ā",
	ă: "ă",
	ắ: "ắ",
	ằ: "ằ",
	ẵ: "ẵ",
	ǎ: "ǎ",
	â: "â",
	ấ: "ấ",
	ầ: "ầ",
	ẫ: "ẫ",
	ȧ: "ȧ",
	ǡ: "ǡ",
	å: "å",
	ǻ: "ǻ",
	ḃ: "ḃ",
	ć: "ć",
	ḉ: "ḉ",
	č: "č",
	ĉ: "ĉ",
	ċ: "ċ",
	ç: "ç",
	ď: "ď",
	ḋ: "ḋ",
	ḑ: "ḑ",
	é: "é",
	è: "è",
	ë: "ë",
	ẽ: "ẽ",
	ē: "ē",
	ḗ: "ḗ",
	ḕ: "ḕ",
	ĕ: "ĕ",
	ḝ: "ḝ",
	ě: "ě",
	ê: "ê",
	ế: "ế",
	ề: "ề",
	ễ: "ễ",
	ė: "ė",
	ȩ: "ȩ",
	ḟ: "ḟ",
	ǵ: "ǵ",
	ḡ: "ḡ",
	ğ: "ğ",
	ǧ: "ǧ",
	ĝ: "ĝ",
	ġ: "ġ",
	ģ: "ģ",
	ḧ: "ḧ",
	ȟ: "ȟ",
	ĥ: "ĥ",
	ḣ: "ḣ",
	ḩ: "ḩ",
	í: "í",
	ì: "ì",
	ï: "ï",
	ḯ: "ḯ",
	ĩ: "ĩ",
	ī: "ī",
	ĭ: "ĭ",
	ǐ: "ǐ",
	î: "î",
	ǰ: "ǰ",
	ĵ: "ĵ",
	ḱ: "ḱ",
	ǩ: "ǩ",
	ķ: "ķ",
	ĺ: "ĺ",
	ľ: "ľ",
	ļ: "ļ",
	ḿ: "ḿ",
	ṁ: "ṁ",
	ń: "ń",
	ǹ: "ǹ",
	ñ: "ñ",
	ň: "ň",
	ṅ: "ṅ",
	ņ: "ņ",
	ó: "ó",
	ò: "ò",
	ö: "ö",
	ȫ: "ȫ",
	õ: "õ",
	ṍ: "ṍ",
	ṏ: "ṏ",
	ȭ: "ȭ",
	ō: "ō",
	ṓ: "ṓ",
	ṑ: "ṑ",
	ŏ: "ŏ",
	ǒ: "ǒ",
	ô: "ô",
	ố: "ố",
	ồ: "ồ",
	ỗ: "ỗ",
	ȯ: "ȯ",
	ȱ: "ȱ",
	ő: "ő",
	ṕ: "ṕ",
	ṗ: "ṗ",
	ŕ: "ŕ",
	ř: "ř",
	ṙ: "ṙ",
	ŗ: "ŗ",
	ś: "ś",
	ṥ: "ṥ",
	š: "š",
	ṧ: "ṧ",
	ŝ: "ŝ",
	ṡ: "ṡ",
	ş: "ş",
	ẗ: "ẗ",
	ť: "ť",
	ṫ: "ṫ",
	ţ: "ţ",
	ú: "ú",
	ù: "ù",
	ü: "ü",
	ǘ: "ǘ",
	ǜ: "ǜ",
	ǖ: "ǖ",
	ǚ: "ǚ",
	ũ: "ũ",
	ṹ: "ṹ",
	ū: "ū",
	ṻ: "ṻ",
	ŭ: "ŭ",
	ǔ: "ǔ",
	û: "û",
	ů: "ů",
	ű: "ű",
	ṽ: "ṽ",
	ẃ: "ẃ",
	ẁ: "ẁ",
	ẅ: "ẅ",
	ŵ: "ŵ",
	ẇ: "ẇ",
	ẘ: "ẘ",
	ẍ: "ẍ",
	ẋ: "ẋ",
	ý: "ý",
	ỳ: "ỳ",
	ÿ: "ÿ",
	ỹ: "ỹ",
	ȳ: "ȳ",
	ŷ: "ŷ",
	ẏ: "ẏ",
	ẙ: "ẙ",
	ź: "ź",
	ž: "ž",
	ẑ: "ẑ",
	ż: "ż",
	Á: "Á",
	À: "À",
	Ä: "Ä",
	Ǟ: "Ǟ",
	Ã: "Ã",
	Ā: "Ā",
	Ă: "Ă",
	Ắ: "Ắ",
	Ằ: "Ằ",
	Ẵ: "Ẵ",
	Ǎ: "Ǎ",
	Â: "Â",
	Ấ: "Ấ",
	Ầ: "Ầ",
	Ẫ: "Ẫ",
	Ȧ: "Ȧ",
	Ǡ: "Ǡ",
	Å: "Å",
	Ǻ: "Ǻ",
	Ḃ: "Ḃ",
	Ć: "Ć",
	Ḉ: "Ḉ",
	Č: "Č",
	Ĉ: "Ĉ",
	Ċ: "Ċ",
	Ç: "Ç",
	Ď: "Ď",
	Ḋ: "Ḋ",
	Ḑ: "Ḑ",
	É: "É",
	È: "È",
	Ë: "Ë",
	Ẽ: "Ẽ",
	Ē: "Ē",
	Ḗ: "Ḗ",
	Ḕ: "Ḕ",
	Ĕ: "Ĕ",
	Ḝ: "Ḝ",
	Ě: "Ě",
	Ê: "Ê",
	Ế: "Ế",
	Ề: "Ề",
	Ễ: "Ễ",
	Ė: "Ė",
	Ȩ: "Ȩ",
	Ḟ: "Ḟ",
	Ǵ: "Ǵ",
	Ḡ: "Ḡ",
	Ğ: "Ğ",
	Ǧ: "Ǧ",
	Ĝ: "Ĝ",
	Ġ: "Ġ",
	Ģ: "Ģ",
	Ḧ: "Ḧ",
	Ȟ: "Ȟ",
	Ĥ: "Ĥ",
	Ḣ: "Ḣ",
	Ḩ: "Ḩ",
	Í: "Í",
	Ì: "Ì",
	Ï: "Ï",
	Ḯ: "Ḯ",
	Ĩ: "Ĩ",
	Ī: "Ī",
	Ĭ: "Ĭ",
	Ǐ: "Ǐ",
	Î: "Î",
	İ: "İ",
	Ĵ: "Ĵ",
	Ḱ: "Ḱ",
	Ǩ: "Ǩ",
	Ķ: "Ķ",
	Ĺ: "Ĺ",
	Ľ: "Ľ",
	Ļ: "Ļ",
	Ḿ: "Ḿ",
	Ṁ: "Ṁ",
	Ń: "Ń",
	Ǹ: "Ǹ",
	Ñ: "Ñ",
	Ň: "Ň",
	Ṅ: "Ṅ",
	Ņ: "Ņ",
	Ó: "Ó",
	Ò: "Ò",
	Ö: "Ö",
	Ȫ: "Ȫ",
	Õ: "Õ",
	Ṍ: "Ṍ",
	Ṏ: "Ṏ",
	Ȭ: "Ȭ",
	Ō: "Ō",
	Ṓ: "Ṓ",
	Ṑ: "Ṑ",
	Ŏ: "Ŏ",
	Ǒ: "Ǒ",
	Ô: "Ô",
	Ố: "Ố",
	Ồ: "Ồ",
	Ỗ: "Ỗ",
	Ȯ: "Ȯ",
	Ȱ: "Ȱ",
	Ő: "Ő",
	Ṕ: "Ṕ",
	Ṗ: "Ṗ",
	Ŕ: "Ŕ",
	Ř: "Ř",
	Ṙ: "Ṙ",
	Ŗ: "Ŗ",
	Ś: "Ś",
	Ṥ: "Ṥ",
	Š: "Š",
	Ṧ: "Ṧ",
	Ŝ: "Ŝ",
	Ṡ: "Ṡ",
	Ş: "Ş",
	Ť: "Ť",
	Ṫ: "Ṫ",
	Ţ: "Ţ",
	Ú: "Ú",
	Ù: "Ù",
	Ü: "Ü",
	Ǘ: "Ǘ",
	Ǜ: "Ǜ",
	Ǖ: "Ǖ",
	Ǚ: "Ǚ",
	Ũ: "Ũ",
	Ṹ: "Ṹ",
	Ū: "Ū",
	Ṻ: "Ṻ",
	Ŭ: "Ŭ",
	Ǔ: "Ǔ",
	Û: "Û",
	Ů: "Ů",
	Ű: "Ű",
	Ṽ: "Ṽ",
	Ẃ: "Ẃ",
	Ẁ: "Ẁ",
	Ẅ: "Ẅ",
	Ŵ: "Ŵ",
	Ẇ: "Ẇ",
	Ẍ: "Ẍ",
	Ẋ: "Ẋ",
	Ý: "Ý",
	Ỳ: "Ỳ",
	Ÿ: "Ÿ",
	Ỹ: "Ỹ",
	Ȳ: "Ȳ",
	Ŷ: "Ŷ",
	Ẏ: "Ẏ",
	Ź: "Ź",
	Ž: "Ž",
	Ẑ: "Ẑ",
	Ż: "Ż",
	ά: "ά",
	ὰ: "ὰ",
	ᾱ: "ᾱ",
	ᾰ: "ᾰ",
	έ: "έ",
	ὲ: "ὲ",
	ή: "ή",
	ὴ: "ὴ",
	ί: "ί",
	ὶ: "ὶ",
	ϊ: "ϊ",
	ΐ: "ΐ",
	ῒ: "ῒ",
	ῑ: "ῑ",
	ῐ: "ῐ",
	ό: "ό",
	ὸ: "ὸ",
	ύ: "ύ",
	ὺ: "ὺ",
	ϋ: "ϋ",
	ΰ: "ΰ",
	ῢ: "ῢ",
	ῡ: "ῡ",
	ῠ: "ῠ",
	ώ: "ώ",
	ὼ: "ὼ",
	Ύ: "Ύ",
	Ὺ: "Ὺ",
	Ϋ: "Ϋ",
	Ῡ: "Ῡ",
	Ῠ: "Ῠ",
	Ώ: "Ώ",
	Ὼ: "Ὼ"
}, Oa = class e {
	constructor(e, t) {
		this.mode = void 0, this.gullet = void 0, this.settings = void 0, this.leftrightDepth = void 0, this.nextToken = void 0, this.mode = "math", this.gullet = new Ca(e, t, this.mode), this.settings = t, this.leftrightDepth = 0, this.nextToken = null;
	}
	expect(e, t) {
		if (t === void 0 && (t = !0), this.fetch().text !== e) throw new s("Expected '" + e + "', got '" + this.fetch().text + "'", this.fetch());
		t && this.consume();
	}
	consume() {
		this.nextToken = null;
	}
	fetch() {
		return this.nextToken ??= this.gullet.expandNextToken(), this.nextToken;
	}
	switchMode(e) {
		this.mode = e, this.gullet.switchMode(e);
	}
	parse() {
		this.settings.globalGroup || this.gullet.beginGroup(), this.settings.colorIsTextColor && this.gullet.macros.set("\\color", "\\textcolor");
		try {
			var e = this.parseExpression(!1);
			return this.expect("EOF"), this.settings.globalGroup || this.gullet.endGroup(), e;
		} finally {
			this.gullet.endGroups();
		}
	}
	subparse(e) {
		var t = this.nextToken;
		this.consume(), this.gullet.pushToken(new pi("}")), this.gullet.pushTokens(e);
		var n = this.parseExpression(!1);
		return this.expect("}"), this.nextToken = t, n;
	}
	parseExpression(t, n) {
		for (var r = [];;) {
			this.mode === "math" && this.consumeSpaces();
			var i = this.fetch();
			if (e.endOfExpression.has(i.text) || n && i.text === n || t && ra[i.text] && ra[i.text].infix) break;
			var a = this.parseAtom(n);
			if (!a) break;
			a.type !== "internal" && r.push(a);
		}
		return this.mode === "text" && this.formLigatures(r), this.handleInfixNodes(r);
	}
	handleInfixNodes(e) {
		for (var t = -1, n, r = 0; r < e.length; r++) {
			var i = e[r];
			if (i.type === "infix") {
				if (t !== -1) throw new s("only one infix operator per group", i.token);
				t = r, n = i.replaceWith;
			}
		}
		if (t !== -1 && n) {
			var a, o, c = e.slice(0, t), l = e.slice(t + 1);
			return a = c.length === 1 && c[0].type === "ordgroup" ? c[0] : {
				type: "ordgroup",
				mode: this.mode,
				body: c
			}, o = l.length === 1 && l[0].type === "ordgroup" ? l[0] : {
				type: "ordgroup",
				mode: this.mode,
				body: l
			}, [n === "\\\\abovefrac" ? this.callFunction(n, [
				a,
				e[t],
				o
			], []) : this.callFunction(n, [a, o], [])];
		} else return e;
	}
	handleSupSubscript(e) {
		var t = this.fetch(), n = t.text;
		this.consume(), this.consumeSpaces();
		var r;
		do
			r = this.parseGroup(e);
		while (r?.type === "internal");
		if (!r) throw new s("Expected group after '" + n + "'", t);
		return r;
	}
	formatUnsupportedCmd(e) {
		for (var t = [], n = 0; n < e.length; n++) t.push({
			type: "textord",
			mode: "text",
			text: e[n]
		});
		var r = {
			type: "text",
			mode: this.mode,
			body: t
		};
		return {
			type: "color",
			mode: this.mode,
			color: this.settings.errorColor,
			body: [r]
		};
	}
	parseAtom(e) {
		var t = this.parseGroup("atom", e);
		if (t?.type === "internal" || this.mode === "text") return t;
		for (var n, r;;) {
			this.consumeSpaces();
			var i = this.fetch();
			if (i.text === "\\limits" || i.text === "\\nolimits") {
				if (t && t.type === "op") t.limits = i.text === "\\limits", t.alwaysHandleSupSub = !0;
				else if (t && t.type === "operatorname") t.alwaysHandleSupSub && (t.limits = i.text === "\\limits");
				else throw new s("Limit controls must follow a math operator", i);
				this.consume();
			} else if (i.text === "^") {
				if (n) throw new s("Double superscript", i);
				n = this.handleSupSubscript("superscript");
			} else if (i.text === "_") {
				if (r) throw new s("Double subscript", i);
				r = this.handleSupSubscript("subscript");
			} else if (i.text === "'") {
				if (n) throw new s("Double superscript", i);
				var a = {
					type: "textord",
					mode: this.mode,
					text: "\\prime"
				}, o = [a];
				for (this.consume(); this.fetch().text === "'";) o.push(a), this.consume();
				this.fetch().text === "^" && o.push(this.handleSupSubscript("superscript")), n = {
					type: "ordgroup",
					mode: this.mode,
					body: o
				};
			} else if (Ta[i.text]) {
				var c = wa.test(i.text), l = [];
				for (l.push(new pi(Ta[i.text])), this.consume();;) {
					var u = this.fetch().text;
					if (!Ta[u] || wa.test(u) !== c) break;
					l.unshift(new pi(Ta[u])), this.consume();
				}
				var d = this.subparse(l);
				c ? r = {
					type: "ordgroup",
					mode: "math",
					body: d
				} : n = {
					type: "ordgroup",
					mode: "math",
					body: d
				};
			} else break;
		}
		return n && r ? {
			type: "supsub",
			mode: this.mode,
			base: t,
			sup: n,
			sub: r
		} : n ? {
			type: "supsub",
			mode: this.mode,
			base: t,
			sup: n
		} : r ? {
			type: "supsub",
			mode: this.mode,
			base: t,
			sub: r
		} : t;
	}
	parseFunction(e, t) {
		var n = this.fetch(), r = n.text, i = ra[r];
		if (!i) return null;
		if (this.consume(), t && t !== "atom" && !i.allowedInArgument) throw new s("Got function '" + r + "' with no arguments" + (t ? " as " + t : ""), n);
		if (this.mode === "text" && !i.allowedInText) throw new s("Can't use function '" + r + "' in text mode", n);
		if (this.mode === "math" && i.allowedInMath === !1) throw new s("Can't use function '" + r + "' in math mode", n);
		var { args: a, optArgs: o } = this.parseArguments(r, i);
		return this.callFunction(r, a, o, n, e);
	}
	callFunction(e, t, n, r, i) {
		var a = {
			funcName: e,
			parser: this,
			token: r,
			breakOnTokenText: i
		}, o = ra[e];
		if (o && o.handler) return o.handler(a, t, n);
		throw new s("No function handler for " + e);
	}
	parseArguments(e, t) {
		var n = t.numOptionalArgs ?? 0, r = t.numArgs + n;
		if (r === 0) return {
			args: [],
			optArgs: []
		};
		for (var i = [], a = [], o = 0; o < r; o++) {
			var c = t.argTypes?.[o], l = o < n;
			("primitive" in t && t.primitive && c == null || t.type === "sqrt" && o === 1 && a[0] == null) && (c = "primitive");
			var u = this.parseGroupOfType("argument to '" + e + "'", c, l);
			if (l) a.push(u);
			else if (u != null) i.push(u);
			else throw new s("Null argument, please report this as a bug");
		}
		return {
			args: i,
			optArgs: a
		};
	}
	parseGroupOfType(e, t, n) {
		switch (t) {
			case "color": return this.parseColorGroup(n);
			case "size": return this.parseSizeGroup(n);
			case "url": return this.parseUrlGroup(n);
			case "math":
			case "text": return this.parseArgumentGroup(n, t);
			case "hbox":
				var r = this.parseArgumentGroup(n, "text");
				return r == null ? null : {
					type: "styling",
					mode: r.mode,
					body: [r],
					style: "text",
					resetFont: !0
				};
			case "raw":
				var i = this.parseStringGroup(n);
				return i == null ? null : {
					type: "raw",
					mode: "text",
					string: i.text
				};
			case "primitive":
				if (n) throw new s("A primitive argument cannot be optional");
				var a = this.parseGroup(e);
				if (a == null) throw new s("Expected group as " + e, this.fetch());
				return a;
			case "original":
			case void 0: return this.parseArgumentGroup(n);
			default: throw new s("Unknown group type as " + e, this.fetch());
		}
	}
	consumeSpaces() {
		for (; this.fetch().text === " ";) this.consume();
	}
	parseStringGroup(e) {
		var t = this.gullet.scanArgument(e);
		if (t == null) return null;
		for (var n = "", r; (r = this.fetch()).text !== "EOF";) n += r.text, this.consume();
		return this.consume(), t.text = n, t;
	}
	parseRegexGroup(e, t) {
		for (var n = this.fetch(), r = n, i = "", a; (a = this.fetch()).text !== "EOF" && e.test(i + a.text);) r = a, i += r.text, this.consume();
		if (i === "") throw new s("Invalid " + t + ": '" + n.text + "'", n);
		return n.range(r, i);
	}
	parseColorGroup(e) {
		var t = this.parseStringGroup(e);
		if (t == null) return null;
		var n = /^(#[a-f0-9]{3,4}|#[a-f0-9]{6}|#[a-f0-9]{8}|[a-f0-9]{6}|[a-z]+)$/i.exec(t.text);
		if (!n) throw new s("Invalid color: '" + t.text + "'", t);
		var r = n[0];
		return /^[0-9a-f]{6}$/i.test(r) && (r = "#" + r), {
			type: "color-token",
			mode: this.mode,
			color: r
		};
	}
	parseSizeGroup(e) {
		var t, n = !1;
		if (this.gullet.consumeSpaces(), t = !e && this.gullet.future().text !== "{" ? this.parseRegexGroup(/^[-+]? *(?:$|\d+|\d+\.\d*|\.\d*) *[a-z]{0,2} *$/, "size") : this.parseStringGroup(e), !t) return null;
		!e && t.text.length === 0 && (t.text = "0pt", n = !0);
		var r = /([-+]?) *(\d+(?:\.\d*)?|\.\d+) *([a-z]{2})/.exec(t.text);
		if (!r) throw new s("Invalid size: '" + t.text + "'", t);
		var i = {
			number: +(r[1] + r[2]),
			unit: r[3]
		};
		if (!je(i)) throw new s("Invalid unit: '" + i.unit + "'", t);
		return {
			type: "size",
			mode: this.mode,
			value: i,
			isBlank: n
		};
	}
	parseUrlGroup(e) {
		this.gullet.lexer.setCatcode("%", 13), this.gullet.lexer.setCatcode("~", 12);
		var t = this.parseStringGroup(e);
		if (this.gullet.lexer.setCatcode("%", 14), this.gullet.lexer.setCatcode("~", 13), t == null) return null;
		var n = t.text.replace(/\\([#$%&~_^{}])/g, "$1");
		return {
			type: "url",
			mode: this.mode,
			url: n
		};
	}
	parseArgumentGroup(e, t) {
		var n = this.gullet.scanArgument(e);
		if (n == null) return null;
		var r = this.mode;
		t && this.switchMode(t), this.gullet.beginGroup();
		var i = this.parseExpression(!1, "EOF");
		this.expect("EOF"), this.gullet.endGroup();
		var a = {
			type: "ordgroup",
			mode: this.mode,
			loc: n.loc,
			body: i
		};
		return t && this.switchMode(r), a;
	}
	parseGroup(e, t) {
		var n = this.fetch(), r = n.text, i;
		if (r === "{" || r === "\\begingroup") {
			this.consume();
			var a = r === "{" ? "}" : "\\endgroup";
			this.gullet.beginGroup();
			var o = this.parseExpression(!1, a), c = this.fetch();
			this.expect(a), this.gullet.endGroup(), i = {
				type: "ordgroup",
				mode: this.mode,
				loc: fi.range(n, c),
				body: o,
				semisimple: r === "\\begingroup" || void 0
			};
		} else if (i = this.parseFunction(t, e) || this.parseSymbol(), i == null && r[0] === "\\" && !Sa.hasOwnProperty(r)) {
			if (this.settings.throwOnError) throw new s("Undefined control sequence: " + r, n);
			i = this.formatUnsupportedCmd(r), this.consume();
		}
		return i;
	}
	formLigatures(e) {
		for (var t = e.length - 1, n = 0; n < t; ++n) {
			var r = e[n];
			if (r.type === "textord") {
				var i = r.text, a = e[n + 1];
				if (!(!a || a.type !== "textord")) {
					if (i === "-" && a.text === "-") {
						var o = e[n + 2];
						n + 1 < t && o && o.type === "textord" && o.text === "-" ? (e.splice(n, 3, {
							type: "textord",
							mode: "text",
							loc: fi.range(r, o),
							text: "---"
						}), t -= 2) : (e.splice(n, 2, {
							type: "textord",
							mode: "text",
							loc: fi.range(r, a),
							text: "--"
						}), --t);
					}
					(i === "'" || i === "`") && a.text === i && (e.splice(n, 2, {
						type: "textord",
						mode: "text",
						loc: fi.range(r, a),
						text: i + i
					}), --t);
				}
			}
		}
	}
	parseSymbol() {
		var e = this.fetch(), t = e.text;
		if (/^\\verb[^a-zA-Z]/.test(t)) {
			this.consume();
			var n = t.slice(5), r = n.charAt(0) === "*";
			if (r && (n = n.slice(1)), n.length < 2 || n.charAt(0) !== n.slice(-1)) throw new s("\\verb assertion failed --\n                    please report what input caused this bug");
			return n = n.slice(1, -1), {
				type: "verb",
				mode: "text",
				body: n,
				star: r
			};
		}
		Da.hasOwnProperty(t[0]) && !rt[this.mode][t[0]] && (this.settings.strict && this.mode === "math" && this.settings.reportNonstrict("unicodeTextInMathMode", "Accented Unicode text character \"" + t[0] + "\" used in math mode", e), t = Da[t[0]] + t.slice(1));
		var i = ua.exec(t);
		i && (t = t.substring(0, i.index), t === "i" ? t = "ı" : t === "j" && (t = "ȷ"));
		var a;
		if (rt[this.mode][t]) {
			this.settings.strict && this.mode === "math" && Tt.includes(t) && this.settings.reportNonstrict("unicodeTextInMathMode", "Latin-1/Unicode text character \"" + t[0] + "\" used in math mode", e);
			var o = rt[this.mode][t].group, c = fi.range(e);
			a = cr(o) ? {
				type: "atom",
				mode: this.mode,
				family: o,
				loc: c,
				text: t
			} : {
				type: o,
				mode: this.mode,
				loc: c,
				text: t
			};
		} else if (t.charCodeAt(0) >= 128) this.settings.strict && (pe(t.charCodeAt(0)) ? this.mode === "math" && this.settings.reportNonstrict("unicodeTextInMathMode", "Unicode text character \"" + t[0] + "\" used in math mode", e) : this.settings.reportNonstrict("unknownSymbol", "Unrecognized Unicode character \"" + t[0] + "\"" + (" (" + t.charCodeAt(0) + ")"), e)), a = {
			type: "textord",
			mode: "text",
			loc: fi.range(e),
			text: t
		};
		else return null;
		if (this.consume(), i) for (var l = 0; l < i[0].length; l++) {
			var u = i[0][l];
			if (!Ea[u]) throw new s("Unknown accent ' " + u + "'", e);
			var d = Ea[u][this.mode] || Ea[u].text;
			if (!d) throw new s("Accent " + u + " unsupported in " + this.mode + " mode", e);
			a = {
				type: "accent",
				mode: this.mode,
				loc: fi.range(e),
				label: d,
				isStretchy: !1,
				isShifty: !0,
				base: a
			};
		}
		return a;
	}
};
Oa.endOfExpression = new Set([
	"}",
	"\\endgroup",
	"\\end",
	"\\right",
	"&"
]);
var ka = function(e, t) {
	if (!(typeof e == "string" || e instanceof String)) throw TypeError("KaTeX can only parse string typed expression");
	var n = new Oa(e, t);
	delete n.gullet.macros.current["\\df@tag"];
	var r = n.parse();
	if (delete n.gullet.macros.current["\\current@color"], delete n.gullet.macros.current["\\color"], n.gullet.macros.get("\\df@tag")) {
		if (!t.displayMode) throw new s("\\tag works only in display equations");
		r = [{
			type: "tag",
			mode: "text",
			body: r,
			tag: n.subparse([new pi("\\df@tag")])
		}];
	}
	return r;
}, Aa = function(e, t, n) {
	t.textContent = "";
	var r = Pa(e, n).toNode();
	t.appendChild(r);
};
typeof document < "u" && document.compatMode !== "CSS1Compat" && (typeof console < "u" && console.warn("Warning: KaTeX doesn't work in quirks mode. Make sure your website has a suitable doctype."), Aa = function() {
	throw new s("KaTeX doesn't work in quirks mode.");
});
var ja = function(e, t) {
	return Pa(e, t).toMarkup();
}, Ma = function(e, t) {
	return ka(e, new x(t));
}, Na = function(e, t, n) {
	if (n.throwOnError || !(e instanceof s)) throw e;
	var r = B(["katex-error"], [new Ue(t)]);
	return r.setAttribute("title", e.toString()), r.setAttribute("style", "color:" + n.errorColor), r;
}, Pa = function(e, t) {
	var n = new x(t);
	try {
		return Qn(ka(e, n), e, n);
	} catch (t) {
		return Na(t, e, n);
	}
}, Fa = {
	version: "0.17.0",
	render: Aa,
	renderToString: ja,
	ParseError: s,
	SETTINGS_SCHEMA: _,
	__parse: Ma,
	__renderToDomTree: Pa,
	__renderToHTMLTree: function(e, t) {
		var n = new x(t);
		try {
			return $n(ka(e, n), e, n);
		} catch (t) {
			return Na(t, e, n);
		}
	},
	__setFontMetrics: $e,
	__defineSymbol: A,
	__defineFunction: H,
	__defineMacro: K,
	__domTree: {
		Span: ze,
		Anchor: Be,
		SymbolNode: Ue,
		SvgNode: We,
		PathNode: Ge,
		LineNode: Ke
	}
};
window.DIALECTICS_HINTS = null, fetch("/api/ai/dialectics/hints").then((e) => e.json()).then((e) => {
	window.DIALECTICS_HINTS = e;
}).catch((e) => console.warn("Failed to load dialectics hints:", e));
var Ia = {
	blue: {
		bg: "linear-gradient(135deg, #ffffff 0%, #eff6ff 100%)",
		accent: "#3b82f6"
	},
	green: {
		bg: "linear-gradient(135deg, #ffffff 0%, #f0fdf4 100%)",
		accent: "#10b981"
	},
	red: {
		bg: "linear-gradient(135deg, #ffffff 0%, #fff1f2 100%)",
		accent: "#ef4444"
	},
	yellow: {
		bg: "linear-gradient(135deg, #ffffff 0%, #fffbeb 100%)",
		accent: "#f59e0b"
	},
	purple: {
		bg: "linear-gradient(135deg, #ffffff 0%, #faf5ff 100%)",
		accent: "#8b5cf6"
	}
}, La = {
	renderMath(e) {
		e.querySelectorAll("span[data-type=\"mathNode\"]").forEach((e) => {
			let t = e.getAttribute("latex");
			if (t) try {
				Fa.render(t, e, { throwOnError: !1 });
			} catch {
				e.textContent = t, e.style.color = "red";
			}
		});
	},
	render(e, t, n = {}) {
		if (!e) return;
		let i = document.getElementById("canvasDivider");
		e.innerHTML = "", i && e.appendChild(i);
		let a = (e, t) => {
			let n = e.replace("dialectics.hints.", "");
			if (window.DIALECTICS_HINTS && window.DIALECTICS_HINTS[n]) return window.DIALECTICS_HINTS[n];
			if (typeof window._ == "function") {
				let n = window._(e);
				return n === e ? t : n;
			}
			return t;
		}, o = {
			id: "anchor",
			side: "left",
			text: a("dialectics.hints.anchor", "Что вам нужно понять?"),
			title: a("dialectics.hints.anchor", "Что вам нужно понять?")
		}, s = [
			{
				id: "step1",
				side: "left",
				text: a("dialectics.hints.step1", "<div style=\"font-size:1.02em; font-weight:500; color:#1e293b; margin-bottom:8px;\">Опишите простейший процесс, который, по вашему мнению, лежит в основе проблемы, которую вы хотите понять.</div><div style=\"font-size:0.85em; color:#64748b; font-weight:400; line-height:1.35;\">Примером простейшего процесса может быть суммирование. Если вы затрудняетесь, то нажмите кнопку Помощь ИИ. Помните, что ИИ не способен к пониманию, но может предоставить вам знания.</div>"),
				title: a("dialectics.hints.step1_title", "Простейший процесс")
			},
			{
				id: "step2",
				side: "right",
				text: a("dialectics.hints.step2", "<div style=\"font-size:1.02em; font-weight:500; color:#1e293b; margin-bottom:8px;\">Опишите, как развивается этот простейший процесс.</div><div style=\"font-size:0.85em; color:#64748b; font-weight:400; line-height:1.35;\">Развитие – это взаимодействие процесса с другими процессами в мире. Например, если простейшим является суммирование, то его развитием будет суммирование пяти, десяти и т.п. единиц, использование суммирования в торговле, праве, науке. Если вы сомневаетесь или не знаете, то можете нажать кнопку Помощь ИИ. Однако помните, что ИИ не может заменить человека в понимании процессов, ИИ может только предоставить знания.</div>"),
				title: a("dialectics.hints.step2_title", "Опишите как развивается этот простейший процесс")
			},
			{
				id: "step3",
				side: "left",
				text: a("dialectics.hints.step3", "<div style=\"font-size:1.02em; font-weight:500; color:#1e293b; margin-bottom:8px;\">Вы уже нашли простейший процесс, посмотрели, как он развивается. В этом развитии вы должны отыскать противоположный процесс.</div><div style=\"font-size:0.85em; color:#64748b; font-weight:400; line-height:1.35;\">Вы можете сделать это через специальный ИИ под кнопкой ✨. А можете сделать это самостоятельно. Противоположным является такой процесс, который сам остается самостоятельным, но полностью исключает другой.</div>"),
				title: a("dialectics.hints.step3_title", "Найти противоположный процесс")
			},
			{
				id: "step4",
				side: "right",
				text: a("dialectics.hints.step4", "Опишите развитие противоположного процесса"),
				title: a("dialectics.hints.step4", "Опишите развитие противоположного процесса")
			},
			{
				id: "step5",
				side: "center",
				text: a("dialectics.hints.step5", "Объедините оба противоположных процесса в одно общее развитие. К каким противоречиям это приводит? Как могут быть разрешены противоречия?"),
				title: a("dialectics.hints.step5", "Объедините оба противоположных процесса в одно общее развитие. К каким противоречиям это приводит? Как могут быть разрешены противоречия?")
			}
		], c = {}, l = [];
		t.forEach((e) => {
			e.role ? (c[e.role] = e, e.role !== "anchor" && l.push(e)) : l.push(e);
		});
		let u = {
			step1: 1,
			step2: 2,
			step3: 3,
			step4: 4,
			step5: 5
		}, d = [];
		if (!c.anchor) l.forEach((e) => d.push({
			type: "block",
			data: e
		})), d.push({
			type: "hint",
			data: o
		});
		else {
			let e = null;
			for (let t of s) if (!c[t.id]) {
				e = t;
				break;
			}
			let t = !1;
			l.forEach((n) => {
				e && !t && n.role && u[n.role] && u[n.role] > u[e.id] && (d.push({
					type: "hint",
					data: e
				}), t = !0), d.push({
					type: "block",
					data: n
				});
			}), e && !t && d.push({
				type: "hint",
				data: e
			}), d.push({
				type: "block",
				data: c.anchor
			});
		}
		let f = (e) => {
			let t = document.createElement("div");
			return t.className = "block-insert-row", [
				"left",
				"right",
				"center"
			].forEach((r) => {
				let i = document.createElement("div");
				if (i.className = `insert-wrap insert-wrap--${r}`, r === "center") i.innerHTML = "<button class=\"btn-insert-block btn-insert-square\" title=\"Add summary\">+</button>", i.querySelector("button").onclick = (t) => {
					t.stopPropagation(), n.onInsertAfter("center", e - 1);
				};
				else if (r === "right") {
					i.style.display = "flex", i.style.gap = "8px", i.style.alignItems = "center", i.style.justifyContent = "center", i.innerHTML = "\n                        <button class=\"btn-insert-block btn-insert-round\" title=\"Добавить блок\">+</button>\n                        <button class=\"btn-insert-block btn-insert-section\" title=\"Добавить раздел\">📑 Раздел</button>\n                    ";
					let t = i.querySelectorAll("button");
					t[0].onclick = (t) => {
						t.stopPropagation(), n.onInsertAfter("right", e - 1);
					}, t[1].onclick = (t) => {
						t.stopPropagation(), n.onInsertAfter("section", e - 1);
					};
				} else {
					i.style.display = "flex", i.style.alignItems = "center", i.style.justifyContent = "center", i.innerHTML = "\n                        <button class=\"btn-insert-block btn-insert-round\" title=\"Добавить блок\">+</button>\n                    ";
					let t = i.querySelector("button");
					t && (t.onclick = (t) => {
						t.stopPropagation(), n.onInsertAfter("left", e - 1);
					});
				}
				t.appendChild(i);
			}), t;
		};
		n.onInsertAfter && e.appendChild(f(0));
		let p = 0;
		d.forEach((t) => {
			if (t.type === "hint") {
				if (e.classList.contains("mode-no-dialectics") || document.getElementById("toggleDialecticsMode") && !document.getElementById("toggleDialecticsMode").checked) return;
				let r = t.data, i = document.createElement("div");
				i.className = `dialectics-hint-block block-${r.side}`, i.dataset.hintId = r.id, i.dataset.side = r.side;
				let o = r.id === "step3" ? a("dialectics.ai_opposites", "ИИ-противоположности") : a("dialectics.ai_help", "Помощь ИИ");
				i.innerHTML = `
                    <div class="dialectics-hint-text">${r.text}</div>
                    <button class="btn-hint-ai" title="${o}" style="position:absolute; right: 12px; top: 12px; background:rgba(255,255,255,0.7); border:1px solid #cbd5e1; border-radius:14px; padding:3px 10px; cursor:pointer; opacity:0.85; transition:all 0.2s; font-size: 0.82rem; display:flex; align-items:center; gap:5px; color:#334155; font-weight:500; box-shadow: 0 1px 2px rgba(0,0,0,0.05);"><span style="font-size:1rem;">✨</span> <span>${o}</span></button>
                `, i.onclick = (e) => {
					e.stopPropagation(), n.onHintClick && n.onHintClick(r);
				};
				let s = i.querySelector(".btn-hint-ai");
				s && (s.onmouseover = () => s.style.opacity = "1", s.onmouseout = () => s.style.opacity = "0.6", s.onclick = (e) => {
					e.stopPropagation(), n.onHintAI && n.onHintAI(r);
				}), e.appendChild(i);
			} else {
				let i = t.data;
				i.id ||= "block_" + Math.random().toString(36).substring(2, 9);
				let a = i.isSection === !0 || i.side === "section", c = document.createElement("div");
				c.className = `dialectics-block block-${i.side || "left"}${a ? " block-section" : ""}`, c.dataset.blockId = i.id, i.role && (c.dataset.role = i.role), a && (c.dataset.isSection = "true");
				let l = i.title || "";
				if (a) {
					if (l ||= "Раздел", c.className = "dialectics-block block-section", c.dataset.title = l, c.innerHTML = `
                        <div class="section-chapter-container" style="display: flex; align-items: baseline; justify-content: space-between; padding: 16px 8px 10px 8px; border-bottom: 2px solid #ea580c; cursor: pointer;" title="Нажмите, чтобы изменить название раздела">
                            <div style="display: flex; align-items: baseline; gap: 12px;">
                                <span style="color: #ea580c; font-size: 1.5rem; line-height: 1;">📑</span>
                                <h2 class="block-title-text" style="margin: 0; font-size: 1.6rem; font-weight: 800; color: #0f172a; letter-spacing: -0.02em; line-height: 1.2;">${l}</h2>
                            </div>
                            <div class="section-actions" style="display: flex; gap: 8px; opacity: 0; transition: opacity 0.2s;">
                                <button class="btn-section-edit" title="Изменить название" style="background: #fff7ed; border: 1px solid #fed7aa; border-radius: 6px; padding: 4px 10px; font-size: 0.85rem; font-weight: 600; color: #ea580c; cursor: pointer;">✎ Изменить</button>
                                <button class="btn-section-del" title="Удалить раздел" style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 6px; padding: 4px 10px; font-size: 0.85rem; font-weight: 600; color: #dc2626; cursor: pointer;">🗑️</button>
                            </div>
                        </div>
                    `, c.onmouseenter = () => {
						let e = c.querySelector(".section-actions");
						e && (e.style.opacity = "1");
					}, c.onmouseleave = () => {
						let e = c.querySelector(".section-actions");
						e && (e.style.opacity = "0");
					}, n) {
						let e = c.querySelector(".section-chapter-container");
						e && n.onEdit && (e.onclick = (e) => {
							e.stopPropagation(), n.onEdit(c);
						});
						let t = c.querySelector(".btn-section-edit");
						t && (t.onclick = (e) => {
							e.stopPropagation(), n.onEdit && n.onEdit(c);
						});
						let r = c.querySelector(".btn-section-del");
						r && (r.onclick = (e) => {
							if (e.stopPropagation(), n.onDelete) {
								let e = c.nextElementSibling;
								e && e.classList.contains("block-insert-row") && e.remove(), c.remove(), n.onDelete();
							}
						});
					}
					e.appendChild(c), n.onInsertAfter && e.appendChild(f(p + 1)), p++;
					return;
				}
				if (!l && i.role) if (i.role === "anchor") l = o.title;
				else {
					let e = s.find((e) => e.id === i.role);
					e && (l = e.title);
				}
				l ||= a ? "Раздел" : i.side === "center" ? "Связующий блок" : "Блок";
				let u = "";
				if (i.role) {
					let e = "";
					if (i.role === "anchor") e = o.text;
					else {
						let t = s.find((e) => e.id === i.role);
						t && (e = t.text);
					}
					u = `<span class="dialectics-step-info-trigger" title="${e.replace(/<[^>]*>/g, "").trim()}" style="cursor:help; margin-left:6px; color:#94a3b8; font-size:0.9rem; font-weight:normal; vertical-align:middle; transition:color 0.2s;" onmouseover="this.style.color='#64748b'" onmouseout="this.style.color='#94a3b8'">ℹ️</span>`;
				}
				let d = i.collapsed === !0;
				if (d && c.classList.add("is-collapsed"), c.dataset.collapsed = d ? "true" : "false", i.title && (c.dataset.title = i.title), i.color) {
					c.dataset.color = i.color;
					let e = Ia[i.color];
					e && (c.style.setProperty("--block-custom-bg", e.bg), c.style.setProperty("--block-custom-accent", e.accent));
				} else delete c.dataset.color, c.style.removeProperty("--block-custom-bg"), c.style.removeProperty("--block-custom-accent");
				let m = `
                    <div class="dialectics-block-header" style="display:flex; align-items:center; justify-content:space-between; font-size: 0.8rem; color: #64748b; font-weight: 700; padding: 12px 14px 6px 14px; border-bottom:1px solid #f1f5f9; text-transform: uppercase; background:#f8fafc; border-top-left-radius:12px; border-top-right-radius:12px; cursor: grab;" title="Зажмите заголовок для перетаскивания блока">
                        <div style="display:flex; align-items:center; gap:4px; overflow:hidden;">
                            ${`<button class="btn-block-fold-toggle" title="Свернуть/Развернуть" style="background:none; border:none; cursor:pointer; font-size:0.75rem; color:#64748b; padding:2px 6px; line-height:1; display:inline-flex; align-items:center; justify-content:center; border-radius:4px; transition:background 0.2s;" onmouseover="this.style.background='#f1f5f9'" onmouseout="this.style.background='transparent'">${d ? "▶" : "▼"}</button>`}
                            <span class="block-title-text" style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${l}</span>
                            ${u}
                        </div>
                    </div>
                `, h = "";
				i.sources && i.sources.length > 0 && (h = `<span style="font-size:0.7rem; font-weight:bold; background:#e2e8f0; border-radius:10px; padding:2px 5px; margin-left:4px;">${i.sources.length}</span>`);
				let g = "";
				i.words && i.words.length > 0 && (g = `<span style="font-size:0.7rem; font-weight:bold; background:#e2e8f0; border-radius:10px; padding:2px 5px; margin-left:4px;">${i.words.length}</span>`);
				let _ = "";
				i.words && i.words.length > 0 && (_ = "<div class=\"dialectics-block-words-row\" style=\"margin-top: 4px; display: flex; flex-wrap: wrap; gap: 6px; padding: 0 14px 10px 14px;\">", i.words.forEach((e) => {
					_ += `<span class="dialectics-word-badge" onclick="event.stopPropagation(); window.app && window.app.showWordDefinition('${e.word.replace(/'/g, "\\'")}')" style="cursor: pointer; background: #eff6ff; border: 1px solid #bfdbfe; color: #1e40af; border-radius: 12px; padding: 2px 8px; font-size: 0.8rem; font-weight: 500; display: inline-flex; align-items: center; gap: 4px;" title="Нажмите для просмотра определения">📖 ${e.word}</span>`;
				}), _ += "</div>");
				let v = 0;
				window.app && window.app.state && window.app.state.blockStickersCount && (v = window.app.state.blockStickersCount[i.id] || 0);
				let y = v > 0 ? `<span style="font-size:0.7rem; font-weight:bold; background:#fde68a; border-radius:10px; padding:2px 5px; margin-left:4px; color:#b45309;">${v}</span>` : "";
				c.innerHTML = `
                    <div class="dialectics-block-actions">
                        <button class="btn-block-edit" title="Edit">✎</button>
                        ${i.role === "step3" ? "<button class=\"btn-block-ai\" title=\"Поиск противоположностей\">✨</button>" : ""}
                        <button class="btn-block-sources" title="Sources">🔗${h}</button>
                        <button class="btn-block-words" title="Словарь">📖${g}</button>
                        <button class="btn-block-sticker" title="Stickers" style="display: flex; align-items: center; justify-content: center; gap: 2px;"><div class="sticker-icon-mini" style="transform: scale(0.65); margin: 0;"></div>${y}</button>
                        <button class="btn-block-color" title="Цвет">🎨</button>
                        <button class="btn-block-del" title="Delete">🗑️</button>
                        <button class="btn-block-hacks" title="${window._ ? window._("dialectics.hacks_title") : "Хаки понимания"}">💡</button>
                    </div>
                    ${m}
                    <div class="dialectics-content-inner">${i.html}</div>
                    ${_}
                `, this.renderMath(c);
				let b = c.querySelector(".dialectics-block-header");
				b && (b.addEventListener("mouseenter", () => {
					c.setAttribute("draggable", "true");
				}), b.addEventListener("mouseleave", () => {
					c.classList.contains("is-dragging") || c.setAttribute("draggable", "false");
				}), b.addEventListener("mousedown", (e) => {
					e.target.closest("button") || e.target.closest(".dialectics-step-info-trigger") ? (c.setAttribute("draggable", "false"), c._preventDrag = !0) : (c.setAttribute("draggable", "true"), c._preventDrag = !1);
				}));
				let x = c.querySelector(".btn-block-fold-toggle");
				x && (x.onclick = (e) => {
					e.stopPropagation(), c.classList.contains("is-collapsed") ? (c.classList.remove("is-collapsed"), x.innerHTML = "▼", c.dataset.collapsed = "false") : (c.classList.add("is-collapsed"), x.innerHTML = "▶", c.dataset.collapsed = "true"), n.onFoldToggle && n.onFoldToggle();
				});
				let S = c.querySelector(".btn-block-ai");
				S && (S.onclick = (e) => {
					e.stopPropagation(), n.onAI && n.onAI(c);
				}), c.querySelector(".btn-block-edit").onclick = (e) => {
					e.stopPropagation(), n.onEdit(c);
				}, c.querySelector(".btn-block-sticker").onclick = (e) => {
					e.stopPropagation(), window.app && window.app.openStickersForCurrent(i.id);
				}, i.sources && (c.dataset.sources = JSON.stringify(i.sources)), i.words && (c.dataset.words = JSON.stringify(i.words)), c.querySelector(".btn-block-sources").onclick = (e) => {
					e.stopPropagation(), n.onSources && n.onSources(c);
				}, c.querySelector(".btn-block-words").onclick = (e) => {
					e.stopPropagation(), n.onWords && n.onWords(c);
				};
				let C = c.querySelector(".btn-block-color");
				C && (C.onclick = (e) => {
					e.stopPropagation(), n.onColor && n.onColor(c);
				}), c.querySelector(".btn-block-del").onclick = async (e) => {
					if (e.stopPropagation(), await r({
						title: window._ ? window._("dialectics.delete_block_title") : "Удаление блока",
						message: window._ ? window._("dialectics.delete_block_msg") : "Вы уверены, что хотите удалить этот блок?",
						icon: "🗑️",
						buttons: [{
							label: window._ ? window._("dialectics.cancel") : "Отмена",
							value: !1,
							class: "confirm-btn-secondary"
						}, {
							label: window._ ? window._("dialectics.delete") : "Удалить",
							value: !0,
							class: "confirm-btn-danger"
						}]
					})) {
						let e = c.nextElementSibling;
						e && e.classList.contains("block-insert-row") && e.remove(), c.remove(), n.onDelete && n.onDelete();
					}
				};
				let w = c.querySelector(".btn-block-hacks");
				w && (w.onclick = (e) => {
					e.stopPropagation(), n.onHacks && n.onHacks(c);
				}), e.appendChild(c), n.onInsertAfter && e.appendChild(f(p + 1)), p++;
			}
		}), typeof window.applyCanvasModes == "function" && window.applyCanvasModes();
	},
	getBlocks(e) {
		if (!e) return [];
		let t = [];
		return e.querySelectorAll(".dialectics-block").forEach((e) => {
			if (e.dataset.isSection === "true" || e.classList.contains("block-section") || e.dataset.side === "section") {
				let n = e.querySelector(".block-title-text"), r = e.dataset.title || (n ? n.innerText : "Раздел");
				t.push({
					id: e.dataset.blockId || e.dataset.id || "block_" + Math.random().toString(36).substring(2, 9),
					side: "section",
					isSection: !0,
					title: r,
					html: `<p>${r}</p>`
				});
				return;
			}
			let n = e.querySelector(".dialectics-content-inner");
			if (n) {
				let r = [];
				try {
					e.dataset.sources && (r = JSON.parse(e.dataset.sources));
				} catch {}
				let i = [];
				try {
					e.dataset.words && (i = JSON.parse(e.dataset.words));
				} catch {}
				t.push({
					id: e.dataset.blockId || "block_" + Math.random().toString(36).substring(2, 9),
					side: e.classList.contains("block-left") ? "left" : e.classList.contains("block-center") ? "center" : "right",
					isSection: !1,
					html: n.innerHTML,
					role: e.dataset.role || void 0,
					sources: r,
					title: e.dataset.title || void 0,
					collapsed: e.dataset.collapsed === "true",
					words: i,
					color: e.dataset.color || void 0
				});
			}
		}), t;
	},
	getLastSide(e) {
		if (!e) return null;
		let t = e.querySelectorAll(".dialectics-block");
		return t.length === 0 ? null : t[t.length - 1].classList.contains("block-left") ? "left" : "right";
	}
}, Ra = { init(e, t) {
	if (!e) return;
	let n = (n) => {
		let r = n.target || n.changedTouches && n.changedTouches[0].target;
		if (!r || r.closest("button, .resize-handle, .block-actions") || r.closest(".dialectics-block")) return;
		let i = e.getBoundingClientRect(), a = n.clientX || n.changedTouches && n.changedTouches[0].clientX, o = i.left + i.width / 2;
		t.onClick(a, o);
	};
	e.addEventListener("click", n), e.addEventListener("touchend", (e) => {
		e.cancelable && e.preventDefault(), n(e.changedTouches[0]);
	}), e.addEventListener("dblclick", (e) => {
		let n = e.target.closest(".dialectics-block");
		n && t.onDoubleClick(n);
	});
} };
//#endregion
//#region node_modules/orderedmap/dist/index.js
function za(e) {
	this.content = e;
}
za.prototype = {
	constructor: za,
	find: function(e) {
		for (var t = 0; t < this.content.length; t += 2) if (this.content[t] === e) return t;
		return -1;
	},
	get: function(e) {
		var t = this.find(e);
		return t == -1 ? void 0 : this.content[t + 1];
	},
	update: function(e, t, n) {
		var r = n && n != e ? this.remove(n) : this, i = r.find(e), a = r.content.slice();
		return i == -1 ? a.push(n || e, t) : (a[i + 1] = t, n && (a[i] = n)), new za(a);
	},
	remove: function(e) {
		var t = this.find(e);
		if (t == -1) return this;
		var n = this.content.slice();
		return n.splice(t, 2), new za(n);
	},
	addToStart: function(e, t) {
		return new za([e, t].concat(this.remove(e).content));
	},
	addToEnd: function(e, t) {
		var n = this.remove(e).content.slice();
		return n.push(e, t), new za(n);
	},
	addBefore: function(e, t, n) {
		var r = this.remove(t), i = r.content.slice(), a = r.find(e);
		return i.splice(a == -1 ? i.length : a, 0, t, n), new za(i);
	},
	forEach: function(e) {
		for (var t = 0; t < this.content.length; t += 2) e(this.content[t], this.content[t + 1]);
	},
	prepend: function(e) {
		return e = za.from(e), e.size ? new za(e.content.concat(this.subtract(e).content)) : this;
	},
	append: function(e) {
		return e = za.from(e), e.size ? new za(this.subtract(e).content.concat(e.content)) : this;
	},
	subtract: function(e) {
		var t = this;
		e = za.from(e);
		for (var n = 0; n < e.content.length; n += 2) t = t.remove(e.content[n]);
		return t;
	},
	toObject: function() {
		var e = {};
		return this.forEach(function(t, n) {
			e[t] = n;
		}), e;
	},
	get size() {
		return this.content.length >> 1;
	}
}, za.from = function(e) {
	if (e instanceof za) return e;
	var t = [];
	if (e) for (var n in e) t.push(n, e[n]);
	return new za(t);
};
//#endregion
//#region node_modules/prosemirror-model/dist/index.js
function Ba(e, t, n) {
	for (let r = 0;; r++) {
		if (r == e.childCount || r == t.childCount) return e.childCount == t.childCount ? null : n;
		let i = e.child(r), a = t.child(r);
		if (i == a) {
			n += i.nodeSize;
			continue;
		}
		if (!i.sameMarkup(a)) return n;
		if (i.isText && i.text != a.text) {
			for (let e = 0; i.text[e] == a.text[e]; e++) n++;
			return n;
		}
		if (i.content.size || a.content.size) {
			let e = Ba(i.content, a.content, n + 1);
			if (e != null) return e;
		}
		n += i.nodeSize;
	}
}
function Va(e, t, n, r) {
	for (let i = e.childCount, a = t.childCount;;) {
		if (i == 0 || a == 0) return i == a ? null : {
			a: n,
			b: r
		};
		let o = e.child(--i), s = t.child(--a), c = o.nodeSize;
		if (o == s) {
			n -= c, r -= c;
			continue;
		}
		if (!o.sameMarkup(s)) return {
			a: n,
			b: r
		};
		if (o.isText && o.text != s.text) {
			let e = 0, t = Math.min(o.text.length, s.text.length);
			for (; e < t && o.text[o.text.length - e - 1] == s.text[s.text.length - e - 1];) e++, n--, r--;
			return {
				a: n,
				b: r
			};
		}
		if (o.content.size || s.content.size) {
			let e = Va(o.content, s.content, n - 1, r - 1);
			if (e) return e;
		}
		n -= c, r -= c;
	}
}
var q = class e {
	constructor(e, t) {
		if (this.content = e, this.size = t || 0, t == null) for (let t = 0; t < e.length; t++) this.size += e[t].nodeSize;
	}
	nodesBetween(e, t, n, r = 0, i) {
		for (let a = 0, o = 0; o < t; a++) {
			let s = this.content[a], c = o + s.nodeSize;
			if (c > e && n(s, r + o, i || null, a) !== !1 && s.content.size) {
				let i = o + 1;
				s.nodesBetween(Math.max(0, e - i), Math.min(s.content.size, t - i), n, r + i);
			}
			o = c;
		}
	}
	descendants(e) {
		this.nodesBetween(0, this.size, e);
	}
	textBetween(e, t, n, r) {
		let i = "", a = !0;
		return this.nodesBetween(e, t, (o, s) => {
			let c = o.isText ? o.text.slice(Math.max(e, s) - s, t - s) : o.isLeaf ? r ? typeof r == "function" ? r(o) : r : o.type.spec.leafText ? o.type.spec.leafText(o) : "" : "";
			o.isBlock && (o.isLeaf && c || o.isTextblock) && n && (a ? a = !1 : i += n), i += c;
		}, 0), i;
	}
	append(t) {
		if (!t.size) return this;
		if (!this.size) return t;
		let n = this.lastChild, r = t.firstChild, i = this.content.slice(), a = 0;
		for (n.isText && n.sameMarkup(r) && (i[i.length - 1] = n.withText(n.text + r.text), a = 1); a < t.content.length; a++) i.push(t.content[a]);
		return new e(i, this.size + t.size);
	}
	cut(t, n = this.size) {
		if (t == 0 && n == this.size) return this;
		let r = [], i = 0;
		if (n > t) for (let e = 0, a = 0; a < n; e++) {
			let o = this.content[e], s = a + o.nodeSize;
			s > t && ((a < t || s > n) && (o = o.isText ? o.cut(Math.max(0, t - a), Math.min(o.text.length, n - a)) : o.cut(Math.max(0, t - a - 1), Math.min(o.content.size, n - a - 1))), r.push(o), i += o.nodeSize), a = s;
		}
		return new e(r, i);
	}
	cutByIndex(t, n) {
		return t == n ? e.empty : t == 0 && n == this.content.length ? this : new e(this.content.slice(t, n));
	}
	replaceChild(t, n) {
		let r = this.content[t];
		if (r == n) return this;
		let i = this.content.slice(), a = this.size + n.nodeSize - r.nodeSize;
		return i[t] = n, new e(i, a);
	}
	addToStart(t) {
		return new e([t].concat(this.content), this.size + t.nodeSize);
	}
	addToEnd(t) {
		return new e(this.content.concat(t), this.size + t.nodeSize);
	}
	eq(e) {
		if (this.content.length != e.content.length) return !1;
		for (let t = 0; t < this.content.length; t++) if (!this.content[t].eq(e.content[t])) return !1;
		return !0;
	}
	get firstChild() {
		return this.content.length ? this.content[0] : null;
	}
	get lastChild() {
		return this.content.length ? this.content[this.content.length - 1] : null;
	}
	get childCount() {
		return this.content.length;
	}
	child(e) {
		let t = this.content[e];
		if (!t) throw RangeError("Index " + e + " out of range for " + this);
		return t;
	}
	maybeChild(e) {
		return this.content[e] || null;
	}
	forEach(e) {
		for (let t = 0, n = 0; t < this.content.length; t++) {
			let r = this.content[t];
			e(r, n, t), n += r.nodeSize;
		}
	}
	findDiffStart(e, t = 0) {
		return Ba(this, e, t);
	}
	findDiffEnd(e, t = this.size, n = e.size) {
		return Va(this, e, t, n);
	}
	findIndex(e) {
		if (e == 0) return Ua(0, e);
		if (e == this.size) return Ua(this.content.length, e);
		if (e > this.size || e < 0) throw RangeError(`Position ${e} outside of fragment (${this})`);
		for (let t = 0, n = 0;; t++) {
			let r = this.child(t), i = n + r.nodeSize;
			if (i >= e) return i == e ? Ua(t + 1, i) : Ua(t, n);
			n = i;
		}
	}
	toString() {
		return "<" + this.toStringInner() + ">";
	}
	toStringInner() {
		return this.content.join(", ");
	}
	toJSON() {
		return this.content.length ? this.content.map((e) => e.toJSON()) : null;
	}
	static fromJSON(t, n) {
		if (!n) return e.empty;
		if (!Array.isArray(n)) throw RangeError("Invalid input for Fragment.fromJSON");
		return new e(n.map(t.nodeFromJSON));
	}
	static fromArray(t) {
		if (!t.length) return e.empty;
		let n, r = 0;
		for (let e = 0; e < t.length; e++) {
			let i = t[e];
			r += i.nodeSize, e && i.isText && t[e - 1].sameMarkup(i) ? (n ||= t.slice(0, e), n[n.length - 1] = i.withText(n[n.length - 1].text + i.text)) : n && n.push(i);
		}
		return new e(n || t, r);
	}
	static from(t) {
		if (!t) return e.empty;
		if (t instanceof e) return t;
		if (Array.isArray(t)) return this.fromArray(t);
		if (t.attrs) return new e([t], t.nodeSize);
		throw RangeError("Can not convert " + t + " to a Fragment" + (t.nodesBetween ? " (looks like multiple versions of prosemirror-model were loaded)" : ""));
	}
};
q.empty = new q([], 0);
var Ha = {
	index: 0,
	offset: 0
};
function Ua(e, t) {
	return Ha.index = e, Ha.offset = t, Ha;
}
function Wa(e, t) {
	if (e === t) return !0;
	if (!(e && typeof e == "object") || !(t && typeof t == "object")) return !1;
	let n = Array.isArray(e);
	if (Array.isArray(t) != n) return !1;
	if (n) {
		if (e.length != t.length) return !1;
		for (let n = 0; n < e.length; n++) if (!Wa(e[n], t[n])) return !1;
	} else {
		for (let n in e) if (!(n in t) || !Wa(e[n], t[n])) return !1;
		for (let n in t) if (!(n in e)) return !1;
	}
	return !0;
}
var Ga = class e {
	constructor(e, t) {
		this.type = e, this.attrs = t;
	}
	addToSet(e) {
		let t, n = !1;
		for (let r = 0; r < e.length; r++) {
			let i = e[r];
			if (this.eq(i)) return e;
			if (this.type.excludes(i.type)) t ||= e.slice(0, r);
			else if (i.type.excludes(this.type)) return e;
			else !n && i.type.rank > this.type.rank && (t ||= e.slice(0, r), t.push(this), n = !0), t && t.push(i);
		}
		return t ||= e.slice(), n || t.push(this), t;
	}
	removeFromSet(e) {
		for (let t = 0; t < e.length; t++) if (this.eq(e[t])) return e.slice(0, t).concat(e.slice(t + 1));
		return e;
	}
	isInSet(e) {
		for (let t = 0; t < e.length; t++) if (this.eq(e[t])) return !0;
		return !1;
	}
	eq(e) {
		return this == e || this.type == e.type && Wa(this.attrs, e.attrs);
	}
	toJSON() {
		let e = { type: this.type.name };
		for (let t in this.attrs) {
			e.attrs = this.attrs;
			break;
		}
		return e;
	}
	static fromJSON(e, t) {
		if (!t) throw RangeError("Invalid input for Mark.fromJSON");
		let n = e.marks[t.type];
		if (!n) throw RangeError(`There is no mark type ${t.type} in this schema`);
		let r = n.create(t.attrs);
		return n.checkAttrs(r.attrs), r;
	}
	static sameSet(e, t) {
		if (e == t) return !0;
		if (e.length != t.length) return !1;
		for (let n = 0; n < e.length; n++) if (!e[n].eq(t[n])) return !1;
		return !0;
	}
	static setFrom(t) {
		if (!t || Array.isArray(t) && t.length == 0) return e.none;
		if (t instanceof e) return [t];
		let n = t.slice();
		return n.sort((e, t) => e.type.rank - t.type.rank), n;
	}
};
Ga.none = [];
var Ka = class extends Error {}, J = class e {
	constructor(e, t, n) {
		this.content = e, this.openStart = t, this.openEnd = n;
	}
	get size() {
		return this.content.size - this.openStart - this.openEnd;
	}
	insertAt(t, n) {
		let r = Ja(this.content, t + this.openStart, n);
		return r && new e(r, this.openStart, this.openEnd);
	}
	removeBetween(t, n) {
		return new e(qa(this.content, t + this.openStart, n + this.openStart), this.openStart, this.openEnd);
	}
	eq(e) {
		return this.content.eq(e.content) && this.openStart == e.openStart && this.openEnd == e.openEnd;
	}
	toString() {
		return this.content + "(" + this.openStart + "," + this.openEnd + ")";
	}
	toJSON() {
		if (!this.content.size) return null;
		let e = { content: this.content.toJSON() };
		return this.openStart > 0 && (e.openStart = this.openStart), this.openEnd > 0 && (e.openEnd = this.openEnd), e;
	}
	static fromJSON(t, n) {
		if (!n) return e.empty;
		let r = n.openStart || 0, i = n.openEnd || 0;
		if (typeof r != "number" || typeof i != "number") throw RangeError("Invalid input for Slice.fromJSON");
		return new e(q.fromJSON(t, n.content), r, i);
	}
	static maxOpen(t, n = !0) {
		let r = 0, i = 0;
		for (let e = t.firstChild; e && !e.isLeaf && (n || !e.type.spec.isolating); e = e.firstChild) r++;
		for (let e = t.lastChild; e && !e.isLeaf && (n || !e.type.spec.isolating); e = e.lastChild) i++;
		return new e(t, r, i);
	}
};
J.empty = new J(q.empty, 0, 0);
function qa(e, t, n) {
	let { index: r, offset: i } = e.findIndex(t), a = e.maybeChild(r), { index: o, offset: s } = e.findIndex(n);
	if (i == t || a.isText) {
		if (s != n && !e.child(o).isText) throw RangeError("Removing non-flat range");
		return e.cut(0, t).append(e.cut(n));
	}
	if (r != o) throw RangeError("Removing non-flat range");
	return e.replaceChild(r, a.copy(qa(a.content, t - i - 1, n - i - 1)));
}
function Ja(e, t, n, r) {
	let { index: i, offset: a } = e.findIndex(t), o = e.maybeChild(i);
	if (a == t || o.isText) return r && !r.canReplace(i, i, n) ? null : e.cut(0, t).append(n).append(e.cut(t));
	let s = Ja(o.content, t - a - 1, n, o);
	return s && e.replaceChild(i, o.copy(s));
}
function Ya(e, t, n) {
	if (n.openStart > e.depth) throw new Ka("Inserted content deeper than insertion position");
	if (e.depth - n.openStart != t.depth - n.openEnd) throw new Ka("Inconsistent open depths");
	return Xa(e, t, n, 0);
}
function Xa(e, t, n, r) {
	let i = e.index(r), a = e.node(r);
	if (i == t.index(r) && r < e.depth - n.openStart) {
		let o = Xa(e, t, n, r + 1);
		return a.copy(a.content.replaceChild(i, o));
	} else if (!n.content.size) return to(a, ro(e, t, r));
	else if (!n.openStart && !n.openEnd && e.depth == r && t.depth == r) {
		let r = e.parent, i = r.content;
		return to(r, i.cut(0, e.parentOffset).append(n.content).append(i.cut(t.parentOffset)));
	} else {
		let { start: i, end: o } = io(n, e);
		return to(a, no(e, i, o, t, r));
	}
}
function Za(e, t) {
	if (!t.type.compatibleContent(e.type)) throw new Ka("Cannot join " + t.type.name + " onto " + e.type.name);
}
function Qa(e, t, n) {
	let r = e.node(n);
	return Za(r, t.node(n)), r;
}
function $a(e, t) {
	let n = t.length - 1;
	n >= 0 && e.isText && e.sameMarkup(t[n]) ? t[n] = e.withText(t[n].text + e.text) : t.push(e);
}
function eo(e, t, n, r) {
	let i = (t || e).node(n), a = 0, o = t ? t.index(n) : i.childCount;
	e && (a = e.index(n), e.depth > n ? a++ : e.textOffset && ($a(e.nodeAfter, r), a++));
	for (let e = a; e < o; e++) $a(i.child(e), r);
	t && t.depth == n && t.textOffset && $a(t.nodeBefore, r);
}
function to(e, t) {
	return e.type.checkContent(t), e.copy(t);
}
function no(e, t, n, r, i) {
	let a = e.depth > i && Qa(e, t, i + 1), o = r.depth > i && Qa(n, r, i + 1), s = [];
	return eo(null, e, i, s), a && o && t.index(i) == n.index(i) ? (Za(a, o), $a(to(a, no(e, t, n, r, i + 1)), s)) : (a && $a(to(a, ro(e, t, i + 1)), s), eo(t, n, i, s), o && $a(to(o, ro(n, r, i + 1)), s)), eo(r, null, i, s), new q(s);
}
function ro(e, t, n) {
	let r = [];
	return eo(null, e, n, r), e.depth > n && $a(to(Qa(e, t, n + 1), ro(e, t, n + 1)), r), eo(t, null, n, r), new q(r);
}
function io(e, t) {
	let n = t.depth - e.openStart, r = t.node(n).copy(e.content);
	for (let e = n - 1; e >= 0; e--) r = t.node(e).copy(q.from(r));
	return {
		start: r.resolveNoCache(e.openStart + n),
		end: r.resolveNoCache(r.content.size - e.openEnd - n)
	};
}
var ao = class e {
	constructor(e, t, n) {
		this.pos = e, this.path = t, this.parentOffset = n, this.depth = t.length / 3 - 1;
	}
	resolveDepth(e) {
		return e == null ? this.depth : e < 0 ? this.depth + e : e;
	}
	get parent() {
		return this.node(this.depth);
	}
	get doc() {
		return this.node(0);
	}
	node(e) {
		return this.path[this.resolveDepth(e) * 3];
	}
	index(e) {
		return this.path[this.resolveDepth(e) * 3 + 1];
	}
	indexAfter(e) {
		return e = this.resolveDepth(e), this.index(e) + (e == this.depth && !this.textOffset ? 0 : 1);
	}
	start(e) {
		return e = this.resolveDepth(e), e == 0 ? 0 : this.path[e * 3 - 1] + 1;
	}
	end(e) {
		return e = this.resolveDepth(e), this.start(e) + this.node(e).content.size;
	}
	before(e) {
		if (e = this.resolveDepth(e), !e) throw RangeError("There is no position before the top-level node");
		return e == this.depth + 1 ? this.pos : this.path[e * 3 - 1];
	}
	after(e) {
		if (e = this.resolveDepth(e), !e) throw RangeError("There is no position after the top-level node");
		return e == this.depth + 1 ? this.pos : this.path[e * 3 - 1] + this.path[e * 3].nodeSize;
	}
	get textOffset() {
		return this.pos - this.path[this.path.length - 1];
	}
	get nodeAfter() {
		let e = this.parent, t = this.index(this.depth);
		if (t == e.childCount) return null;
		let n = this.pos - this.path[this.path.length - 1], r = e.child(t);
		return n ? e.child(t).cut(n) : r;
	}
	get nodeBefore() {
		let e = this.index(this.depth), t = this.pos - this.path[this.path.length - 1];
		return t ? this.parent.child(e).cut(0, t) : e == 0 ? null : this.parent.child(e - 1);
	}
	posAtIndex(e, t) {
		t = this.resolveDepth(t);
		let n = this.path[t * 3], r = t == 0 ? 0 : this.path[t * 3 - 1] + 1;
		for (let t = 0; t < e; t++) r += n.child(t).nodeSize;
		return r;
	}
	marks() {
		let e = this.parent, t = this.index();
		if (e.content.size == 0) return Ga.none;
		if (this.textOffset) return e.child(t).marks;
		let n = e.maybeChild(t - 1), r = e.maybeChild(t);
		if (!n) {
			let e = n;
			n = r, r = e;
		}
		let i = n.marks;
		for (var a = 0; a < i.length; a++) i[a].type.spec.inclusive === !1 && (!r || !i[a].isInSet(r.marks)) && (i = i[a--].removeFromSet(i));
		return i;
	}
	marksAcross(e) {
		let t = this.parent.maybeChild(this.index());
		if (!t || !t.isInline) return null;
		let n = t.marks, r = e.parent.maybeChild(e.index());
		for (var i = 0; i < n.length; i++) n[i].type.spec.inclusive === !1 && (!r || !n[i].isInSet(r.marks)) && (n = n[i--].removeFromSet(n));
		return n;
	}
	sharedDepth(e) {
		for (let t = this.depth; t > 0; t--) if (this.start(t) <= e && this.end(t) >= e) return t;
		return 0;
	}
	blockRange(e = this, t) {
		if (e.pos < this.pos) return e.blockRange(this);
		for (let n = this.depth - (this.parent.inlineContent || this.pos == e.pos ? 1 : 0); n >= 0; n--) if (e.pos <= this.end(n) && (!t || t(this.node(n)))) return new lo(this, e, n);
		return null;
	}
	sameParent(e) {
		return this.pos - this.parentOffset == e.pos - e.parentOffset;
	}
	max(e) {
		return e.pos > this.pos ? e : this;
	}
	min(e) {
		return e.pos < this.pos ? e : this;
	}
	toString() {
		let e = "";
		for (let t = 1; t <= this.depth; t++) e += (e ? "/" : "") + this.node(t).type.name + "_" + this.index(t - 1);
		return e + ":" + this.parentOffset;
	}
	static resolve(t, n) {
		if (!(n >= 0 && n <= t.content.size)) throw RangeError("Position " + n + " out of range");
		let r = [], i = 0, a = n;
		for (let e = t;;) {
			let { index: t, offset: n } = e.content.findIndex(a), o = a - n;
			if (r.push(e, t, i + n), !o || (e = e.child(t), e.isText)) break;
			a = o - 1, i += n + 1;
		}
		return new e(n, r, a);
	}
	static resolveCached(t, n) {
		let r = co.get(t);
		if (r) for (let e = 0; e < r.elts.length; e++) {
			let t = r.elts[e];
			if (t.pos == n) return t;
		}
		else co.set(t, r = new oo());
		let i = r.elts[r.i] = e.resolve(t, n);
		return r.i = (r.i + 1) % so, i;
	}
}, oo = class {
	constructor() {
		this.elts = [], this.i = 0;
	}
}, so = 12, co = /* @__PURE__ */ new WeakMap(), lo = class {
	constructor(e, t, n) {
		this.$from = e, this.$to = t, this.depth = n;
	}
	get start() {
		return this.$from.before(this.depth + 1);
	}
	get end() {
		return this.$to.after(this.depth + 1);
	}
	get parent() {
		return this.$from.node(this.depth);
	}
	get startIndex() {
		return this.$from.index(this.depth);
	}
	get endIndex() {
		return this.$to.indexAfter(this.depth);
	}
}, uo = Object.create(null), fo = class e {
	constructor(e, t, n, r = Ga.none) {
		this.type = e, this.attrs = t, this.marks = r, this.content = n || q.empty;
	}
	get children() {
		return this.content.content;
	}
	get nodeSize() {
		return this.isLeaf ? 1 : 2 + this.content.size;
	}
	get childCount() {
		return this.content.childCount;
	}
	child(e) {
		return this.content.child(e);
	}
	maybeChild(e) {
		return this.content.maybeChild(e);
	}
	forEach(e) {
		this.content.forEach(e);
	}
	nodesBetween(e, t, n, r = 0) {
		this.content.nodesBetween(e, t, n, r, this);
	}
	descendants(e) {
		this.nodesBetween(0, this.content.size, e);
	}
	get textContent() {
		return this.isLeaf && this.type.spec.leafText ? this.type.spec.leafText(this) : this.textBetween(0, this.content.size, "");
	}
	textBetween(e, t, n, r) {
		return this.content.textBetween(e, t, n, r);
	}
	get firstChild() {
		return this.content.firstChild;
	}
	get lastChild() {
		return this.content.lastChild;
	}
	eq(e) {
		return this == e || this.sameMarkup(e) && this.content.eq(e.content);
	}
	sameMarkup(e) {
		return this.hasMarkup(e.type, e.attrs, e.marks);
	}
	hasMarkup(e, t, n) {
		return this.type == e && Wa(this.attrs, t || e.defaultAttrs || uo) && Ga.sameSet(this.marks, n || Ga.none);
	}
	copy(t = null) {
		return t == this.content ? this : new e(this.type, this.attrs, t, this.marks);
	}
	mark(t) {
		return t == this.marks ? this : new e(this.type, this.attrs, this.content, t);
	}
	cut(e, t = this.content.size) {
		return e == 0 && t == this.content.size ? this : this.copy(this.content.cut(e, t));
	}
	slice(e, t = this.content.size, n = !1) {
		if (e == t) return J.empty;
		let r = this.resolve(e), i = this.resolve(t), a = n ? 0 : r.sharedDepth(t), o = r.start(a);
		return new J(r.node(a).content.cut(r.pos - o, i.pos - o), r.depth - a, i.depth - a);
	}
	replace(e, t, n) {
		return Ya(this.resolve(e), this.resolve(t), n);
	}
	nodeAt(e) {
		for (let t = this;;) {
			let { index: n, offset: r } = t.content.findIndex(e);
			if (t = t.maybeChild(n), !t) return null;
			if (r == e || t.isText) return t;
			e -= r + 1;
		}
	}
	childAfter(e) {
		let { index: t, offset: n } = this.content.findIndex(e);
		return {
			node: this.content.maybeChild(t),
			index: t,
			offset: n
		};
	}
	childBefore(e) {
		if (e == 0) return {
			node: null,
			index: 0,
			offset: 0
		};
		let { index: t, offset: n } = this.content.findIndex(e);
		if (n < e) return {
			node: this.content.child(t),
			index: t,
			offset: n
		};
		let r = this.content.child(t - 1);
		return {
			node: r,
			index: t - 1,
			offset: n - r.nodeSize
		};
	}
	resolve(e) {
		return ao.resolveCached(this, e);
	}
	resolveNoCache(e) {
		return ao.resolve(this, e);
	}
	rangeHasMark(e, t, n) {
		let r = !1;
		return t > e && this.nodesBetween(e, t, (e) => (n.isInSet(e.marks) && (r = !0), !r)), r;
	}
	get isBlock() {
		return this.type.isBlock;
	}
	get isTextblock() {
		return this.type.isTextblock;
	}
	get inlineContent() {
		return this.type.inlineContent;
	}
	get isInline() {
		return this.type.isInline;
	}
	get isText() {
		return this.type.isText;
	}
	get isLeaf() {
		return this.type.isLeaf;
	}
	get isAtom() {
		return this.type.isAtom;
	}
	toString() {
		if (this.type.spec.toDebugString) return this.type.spec.toDebugString(this);
		let e = this.type.name;
		return this.content.size && (e += "(" + this.content.toStringInner() + ")"), mo(this.marks, e);
	}
	contentMatchAt(e) {
		let t = this.type.contentMatch.matchFragment(this.content, 0, e);
		if (!t) throw Error("Called contentMatchAt on a node with invalid content");
		return t;
	}
	canReplace(e, t, n = q.empty, r = 0, i = n.childCount) {
		let a = this.contentMatchAt(e).matchFragment(n, r, i), o = a && a.matchFragment(this.content, t);
		if (!o || !o.validEnd) return !1;
		for (let e = r; e < i; e++) if (!this.type.allowsMarks(n.child(e).marks)) return !1;
		return !0;
	}
	canReplaceWith(e, t, n, r) {
		if (r && !this.type.allowsMarks(r)) return !1;
		let i = this.contentMatchAt(e).matchType(n), a = i && i.matchFragment(this.content, t);
		return a ? a.validEnd : !1;
	}
	canAppend(e) {
		return e.content.size ? this.canReplace(this.childCount, this.childCount, e.content) : this.type.compatibleContent(e.type);
	}
	check() {
		this.type.checkContent(this.content), this.type.checkAttrs(this.attrs);
		let e = Ga.none;
		for (let t = 0; t < this.marks.length; t++) {
			let n = this.marks[t];
			n.type.checkAttrs(n.attrs), e = n.addToSet(e);
		}
		if (!Ga.sameSet(e, this.marks)) throw RangeError(`Invalid collection of marks for node ${this.type.name}: ${this.marks.map((e) => e.type.name)}`);
		this.content.forEach((e) => e.check());
	}
	toJSON() {
		let e = { type: this.type.name };
		for (let t in this.attrs) {
			e.attrs = this.attrs;
			break;
		}
		return this.content.size && (e.content = this.content.toJSON()), this.marks.length && (e.marks = this.marks.map((e) => e.toJSON())), e;
	}
	static fromJSON(e, t) {
		if (!t) throw RangeError("Invalid input for Node.fromJSON");
		let n;
		if (t.marks) {
			if (!Array.isArray(t.marks)) throw RangeError("Invalid mark data for Node.fromJSON");
			n = t.marks.map(e.markFromJSON);
		}
		if (t.type == "text") {
			if (typeof t.text != "string") throw RangeError("Invalid text node in JSON");
			return e.text(t.text, n);
		}
		let r = q.fromJSON(e, t.content), i = e.nodeType(t.type).create(t.attrs, r, n);
		return i.type.checkAttrs(i.attrs), i;
	}
};
fo.prototype.text = void 0;
var po = class e extends fo {
	constructor(e, t, n, r) {
		if (super(e, t, null, r), !n) throw RangeError("Empty text nodes are not allowed");
		this.text = n;
	}
	toString() {
		return this.type.spec.toDebugString ? this.type.spec.toDebugString(this) : mo(this.marks, JSON.stringify(this.text));
	}
	get textContent() {
		return this.text;
	}
	textBetween(e, t) {
		return this.text.slice(e, t);
	}
	get nodeSize() {
		return this.text.length;
	}
	mark(t) {
		return t == this.marks ? this : new e(this.type, this.attrs, this.text, t);
	}
	withText(t) {
		return t == this.text ? this : new e(this.type, this.attrs, t, this.marks);
	}
	cut(e = 0, t = this.text.length) {
		return e == 0 && t == this.text.length ? this : this.withText(this.text.slice(e, t));
	}
	eq(e) {
		return this.sameMarkup(e) && this.text == e.text;
	}
	toJSON() {
		let e = super.toJSON();
		return e.text = this.text, e;
	}
};
function mo(e, t) {
	for (let n = e.length - 1; n >= 0; n--) t = e[n].type.name + "(" + t + ")";
	return t;
}
var ho = class e {
	constructor(e) {
		this.validEnd = e, this.next = [], this.wrapCache = [];
	}
	static parse(t, n) {
		let r = new go(t, n);
		if (r.next == null) return e.empty;
		let i = _o(r);
		r.next && r.err("Unexpected trailing text");
		let a = Do(wo(i));
		return Oo(a, r), a;
	}
	matchType(e) {
		for (let t = 0; t < this.next.length; t++) if (this.next[t].type == e) return this.next[t].next;
		return null;
	}
	matchFragment(e, t = 0, n = e.childCount) {
		let r = this;
		for (let i = t; r && i < n; i++) r = r.matchType(e.child(i).type);
		return r;
	}
	get inlineContent() {
		return this.next.length != 0 && this.next[0].type.isInline;
	}
	get defaultType() {
		for (let e = 0; e < this.next.length; e++) {
			let { type: t } = this.next[e];
			if (!(t.isText || t.hasRequiredAttrs())) return t;
		}
		return null;
	}
	compatible(e) {
		for (let t = 0; t < this.next.length; t++) for (let n = 0; n < e.next.length; n++) if (this.next[t].type == e.next[n].type) return !0;
		return !1;
	}
	fillBefore(e, t = !1, n = 0) {
		let r = [this];
		function i(a, o) {
			let s = a.matchFragment(e, n);
			if (s && (!t || s.validEnd)) return q.from(o.map((e) => e.createAndFill()));
			for (let e = 0; e < a.next.length; e++) {
				let { type: t, next: n } = a.next[e];
				if (!(t.isText || t.hasRequiredAttrs()) && r.indexOf(n) == -1) {
					r.push(n);
					let e = i(n, o.concat(t));
					if (e) return e;
				}
			}
			return null;
		}
		return i(this, []);
	}
	findWrapping(e) {
		for (let t = 0; t < this.wrapCache.length; t += 2) if (this.wrapCache[t] == e) return this.wrapCache[t + 1];
		let t = this.computeWrapping(e);
		return this.wrapCache.push(e, t), t;
	}
	computeWrapping(e) {
		let t = Object.create(null), n = [{
			match: this,
			type: null,
			via: null
		}];
		for (; n.length;) {
			let r = n.shift(), i = r.match;
			if (i.matchType(e)) {
				let e = [];
				for (let t = r; t.type; t = t.via) e.push(t.type);
				return e.reverse();
			}
			for (let e = 0; e < i.next.length; e++) {
				let { type: a, next: o } = i.next[e];
				!a.isLeaf && !a.hasRequiredAttrs() && !(a.name in t) && (!r.type || o.validEnd) && (n.push({
					match: a.contentMatch,
					type: a,
					via: r
				}), t[a.name] = !0);
			}
		}
		return null;
	}
	get edgeCount() {
		return this.next.length;
	}
	edge(e) {
		if (e >= this.next.length) throw RangeError(`There's no ${e}th edge in this content match`);
		return this.next[e];
	}
	toString() {
		let e = [];
		function t(n) {
			e.push(n);
			for (let r = 0; r < n.next.length; r++) e.indexOf(n.next[r].next) == -1 && t(n.next[r].next);
		}
		return t(this), e.map((t, n) => {
			let r = n + (t.validEnd ? "*" : " ") + " ";
			for (let n = 0; n < t.next.length; n++) r += (n ? ", " : "") + t.next[n].type.name + "->" + e.indexOf(t.next[n].next);
			return r;
		}).join("\n");
	}
};
ho.empty = new ho(!0);
var go = class {
	constructor(e, t) {
		this.string = e, this.nodeTypes = t, this.inline = null, this.pos = 0, this.tokens = e.split(/\s*(?=\b|\W|$)/), this.tokens[this.tokens.length - 1] == "" && this.tokens.pop(), this.tokens[0] == "" && this.tokens.shift();
	}
	get next() {
		return this.tokens[this.pos];
	}
	eat(e) {
		return this.next == e && (this.pos++ || !0);
	}
	err(e) {
		throw SyntaxError(e + " (in content expression '" + this.string + "')");
	}
};
function _o(e) {
	let t = [];
	do
		t.push(vo(e));
	while (e.eat("|"));
	return t.length == 1 ? t[0] : {
		type: "choice",
		exprs: t
	};
}
function vo(e) {
	let t = [];
	do
		t.push(yo(e));
	while (e.next && e.next != ")" && e.next != "|");
	return t.length == 1 ? t[0] : {
		type: "seq",
		exprs: t
	};
}
function yo(e) {
	let t = Co(e);
	for (;;) if (e.eat("+")) t = {
		type: "plus",
		expr: t
	};
	else if (e.eat("*")) t = {
		type: "star",
		expr: t
	};
	else if (e.eat("?")) t = {
		type: "opt",
		expr: t
	};
	else if (e.eat("{")) t = xo(e, t);
	else break;
	return t;
}
function bo(e) {
	/\D/.test(e.next) && e.err("Expected number, got '" + e.next + "'");
	let t = Number(e.next);
	return e.pos++, t;
}
function xo(e, t) {
	let n = bo(e), r = n;
	return e.eat(",") && (r = e.next == "}" ? -1 : bo(e)), e.eat("}") || e.err("Unclosed braced range"), {
		type: "range",
		min: n,
		max: r,
		expr: t
	};
}
function So(e, t) {
	let n = e.nodeTypes, r = n[t];
	if (r) return [r];
	let i = [];
	for (let e in n) {
		let r = n[e];
		r.isInGroup(t) && i.push(r);
	}
	return i.length == 0 && e.err("No node type or group '" + t + "' found"), i;
}
function Co(e) {
	if (e.eat("(")) {
		let t = _o(e);
		return e.eat(")") || e.err("Missing closing paren"), t;
	} else if (/\W/.test(e.next)) e.err("Unexpected token '" + e.next + "'");
	else {
		let t = So(e, e.next).map((t) => (e.inline == null ? e.inline = t.isInline : e.inline != t.isInline && e.err("Mixing inline and block content"), {
			type: "name",
			value: t
		}));
		return e.pos++, t.length == 1 ? t[0] : {
			type: "choice",
			exprs: t
		};
	}
}
function wo(e) {
	let t = [[]];
	return i(a(e, 0), n()), t;
	function n() {
		return t.push([]) - 1;
	}
	function r(e, n, r) {
		let i = {
			term: r,
			to: n
		};
		return t[e].push(i), i;
	}
	function i(e, t) {
		e.forEach((e) => e.to = t);
	}
	function a(e, t) {
		if (e.type == "choice") return e.exprs.reduce((e, n) => e.concat(a(n, t)), []);
		if (e.type == "seq") for (let r = 0;; r++) {
			let o = a(e.exprs[r], t);
			if (r == e.exprs.length - 1) return o;
			i(o, t = n());
		}
		else if (e.type == "star") {
			let o = n();
			return r(t, o), i(a(e.expr, o), o), [r(o)];
		} else if (e.type == "plus") {
			let o = n();
			return i(a(e.expr, t), o), i(a(e.expr, o), o), [r(o)];
		} else if (e.type == "opt") return [r(t)].concat(a(e.expr, t));
		else if (e.type == "range") {
			let o = t;
			for (let t = 0; t < e.min; t++) {
				let t = n();
				i(a(e.expr, o), t), o = t;
			}
			if (e.max == -1) i(a(e.expr, o), o);
			else for (let t = e.min; t < e.max; t++) {
				let t = n();
				r(o, t), i(a(e.expr, o), t), o = t;
			}
			return [r(o)];
		} else if (e.type == "name") return [r(t, void 0, e.value)];
		else throw Error("Unknown expr type");
	}
}
function To(e, t) {
	return t - e;
}
function Eo(e, t) {
	let n = [];
	return r(t), n.sort(To);
	function r(t) {
		let i = e[t];
		if (i.length == 1 && !i[0].term) return r(i[0].to);
		n.push(t);
		for (let e = 0; e < i.length; e++) {
			let { term: t, to: a } = i[e];
			!t && n.indexOf(a) == -1 && r(a);
		}
	}
}
function Do(e) {
	let t = Object.create(null);
	return n(Eo(e, 0));
	function n(r) {
		let i = [];
		r.forEach((t) => {
			e[t].forEach(({ term: t, to: n }) => {
				if (!t) return;
				let r;
				for (let e = 0; e < i.length; e++) i[e][0] == t && (r = i[e][1]);
				Eo(e, n).forEach((e) => {
					r || i.push([t, r = []]), r.indexOf(e) == -1 && r.push(e);
				});
			});
		});
		let a = t[r.join(",")] = new ho(r.indexOf(e.length - 1) > -1);
		for (let e = 0; e < i.length; e++) {
			let r = i[e][1].sort(To);
			a.next.push({
				type: i[e][0],
				next: t[r.join(",")] || n(r)
			});
		}
		return a;
	}
}
function Oo(e, t) {
	for (let n = 0, r = [e]; n < r.length; n++) {
		let e = r[n], i = !e.validEnd, a = [];
		for (let t = 0; t < e.next.length; t++) {
			let { type: n, next: o } = e.next[t];
			a.push(n.name), i && !(n.isText || n.hasRequiredAttrs()) && (i = !1), r.indexOf(o) == -1 && r.push(o);
		}
		i && t.err("Only non-generatable nodes (" + a.join(", ") + ") in a required position (see https://prosemirror.net/docs/guide/#generatable)");
	}
}
function ko(e) {
	let t = Object.create(null);
	for (let n in e) {
		let r = e[n];
		if (!r.hasDefault) return null;
		t[n] = r.default;
	}
	return t;
}
function Ao(e, t) {
	let n = Object.create(null);
	for (let r in e) {
		let i = t && t[r];
		if (i === void 0) {
			let t = e[r];
			if (t.hasDefault) i = t.default;
			else throw RangeError("No value supplied for attribute " + r);
		}
		n[r] = i;
	}
	return n;
}
function jo(e, t, n, r) {
	for (let r in t) if (!(r in e)) throw RangeError(`Unsupported attribute ${r} for ${n} of type ${r}`);
	for (let n in e) {
		let r = e[n];
		r.validate && r.validate(t[n]);
	}
}
function Mo(e, t) {
	let n = Object.create(null);
	if (t) for (let r in t) n[r] = new Fo(e, r, t[r]);
	return n;
}
var No = class e {
	constructor(e, t, n) {
		this.name = e, this.schema = t, this.spec = n, this.markSet = null, this.groups = n.group ? n.group.split(" ") : [], this.attrs = Mo(e, n.attrs), this.defaultAttrs = ko(this.attrs), this.contentMatch = null, this.inlineContent = null, this.isBlock = !(n.inline || e == "text"), this.isText = e == "text";
	}
	get isInline() {
		return !this.isBlock;
	}
	get isTextblock() {
		return this.isBlock && this.inlineContent;
	}
	get isLeaf() {
		return this.contentMatch == ho.empty;
	}
	get isAtom() {
		return this.isLeaf || !!this.spec.atom;
	}
	isInGroup(e) {
		return this.groups.indexOf(e) > -1;
	}
	get whitespace() {
		return this.spec.whitespace || (this.spec.code ? "pre" : "normal");
	}
	hasRequiredAttrs() {
		for (let e in this.attrs) if (this.attrs[e].isRequired) return !0;
		return !1;
	}
	compatibleContent(e) {
		return this == e || this.contentMatch.compatible(e.contentMatch);
	}
	computeAttrs(e) {
		return !e && this.defaultAttrs ? this.defaultAttrs : Ao(this.attrs, e);
	}
	create(e = null, t, n) {
		if (this.isText) throw Error("NodeType.create can't construct text nodes");
		return new fo(this, this.computeAttrs(e), q.from(t), Ga.setFrom(n));
	}
	createChecked(e = null, t, n) {
		return t = q.from(t), this.checkContent(t), new fo(this, this.computeAttrs(e), t, Ga.setFrom(n));
	}
	createAndFill(e = null, t, n) {
		if (e = this.computeAttrs(e), t = q.from(t), t.size) {
			let e = this.contentMatch.fillBefore(t);
			if (!e) return null;
			t = e.append(t);
		}
		let r = this.contentMatch.matchFragment(t), i = r && r.fillBefore(q.empty, !0);
		return i ? new fo(this, e, t.append(i), Ga.setFrom(n)) : null;
	}
	validContent(e) {
		let t = this.contentMatch.matchFragment(e);
		if (!t || !t.validEnd) return !1;
		for (let t = 0; t < e.childCount; t++) if (!this.allowsMarks(e.child(t).marks)) return !1;
		return !0;
	}
	checkContent(e) {
		if (!this.validContent(e)) throw RangeError(`Invalid content for node ${this.name}: ${e.toString().slice(0, 50)}`);
	}
	checkAttrs(e) {
		jo(this.attrs, e, "node", this.name);
	}
	allowsMarkType(e) {
		return this.markSet == null || this.markSet.indexOf(e) > -1;
	}
	allowsMarks(e) {
		if (this.markSet == null) return !0;
		for (let t = 0; t < e.length; t++) if (!this.allowsMarkType(e[t].type)) return !1;
		return !0;
	}
	allowedMarks(e) {
		if (this.markSet == null) return e;
		let t;
		for (let n = 0; n < e.length; n++) this.allowsMarkType(e[n].type) ? t && t.push(e[n]) : t ||= e.slice(0, n);
		return t ? t.length ? t : Ga.none : e;
	}
	static compile(t, n) {
		let r = Object.create(null);
		t.forEach((t, i) => r[t] = new e(t, n, i));
		let i = n.spec.topNode || "doc";
		if (!r[i]) throw RangeError("Schema is missing its top node type ('" + i + "')");
		if (!r.text) throw RangeError("Every schema needs a 'text' type");
		for (let e in r.text.attrs) throw RangeError("The text node type should not have attributes");
		return r;
	}
};
function Po(e, t, n) {
	let r = n.split("|");
	return (n) => {
		let i = n === null ? "null" : typeof n;
		if (r.indexOf(i) < 0) throw RangeError(`Expected value of type ${r} for attribute ${t} on type ${e}, got ${i}`);
	};
}
var Fo = class {
	constructor(e, t, n) {
		this.hasDefault = Object.prototype.hasOwnProperty.call(n, "default"), this.default = n.default, this.validate = typeof n.validate == "string" ? Po(e, t, n.validate) : n.validate;
	}
	get isRequired() {
		return !this.hasDefault;
	}
}, Io = class e {
	constructor(e, t, n, r) {
		this.name = e, this.rank = t, this.schema = n, this.spec = r, this.attrs = Mo(e, r.attrs), this.excluded = null;
		let i = ko(this.attrs);
		this.instance = i ? new Ga(this, i) : null;
	}
	create(e = null) {
		return !e && this.instance ? this.instance : new Ga(this, Ao(this.attrs, e));
	}
	static compile(t, n) {
		let r = Object.create(null), i = 0;
		return t.forEach((t, a) => r[t] = new e(t, i++, n, a)), r;
	}
	removeFromSet(e) {
		for (var t = 0; t < e.length; t++) e[t].type == this && (e = e.slice(0, t).concat(e.slice(t + 1)), t--);
		return e;
	}
	isInSet(e) {
		for (let t = 0; t < e.length; t++) if (e[t].type == this) return e[t];
	}
	checkAttrs(e) {
		jo(this.attrs, e, "mark", this.name);
	}
	excludes(e) {
		return this.excluded.indexOf(e) > -1;
	}
}, Lo = class {
	constructor(e) {
		this.linebreakReplacement = null, this.cached = Object.create(null);
		let t = this.spec = {};
		for (let n in e) t[n] = e[n];
		t.nodes = za.from(e.nodes), t.marks = za.from(e.marks || {}), this.nodes = No.compile(this.spec.nodes, this), this.marks = Io.compile(this.spec.marks, this);
		let n = Object.create(null);
		for (let e in this.nodes) {
			if (e in this.marks) throw RangeError(e + " can not be both a node and a mark");
			let t = this.nodes[e], r = t.spec.content || "", i = t.spec.marks;
			if (t.contentMatch = n[r] || (n[r] = ho.parse(r, this.nodes)), t.inlineContent = t.contentMatch.inlineContent, t.spec.linebreakReplacement) {
				if (this.linebreakReplacement) throw RangeError("Multiple linebreak nodes defined");
				if (!t.isInline || !t.isLeaf) throw RangeError("Linebreak replacement nodes must be inline leaf nodes");
				this.linebreakReplacement = t;
			}
			t.markSet = i == "_" ? null : i ? Ro(this, i.split(" ")) : i == "" || !t.inlineContent ? [] : null;
		}
		for (let e in this.marks) {
			let t = this.marks[e], n = t.spec.excludes;
			t.excluded = n == null ? [t] : n == "" ? [] : Ro(this, n.split(" "));
		}
		this.nodeFromJSON = (e) => fo.fromJSON(this, e), this.markFromJSON = (e) => Ga.fromJSON(this, e), this.topNodeType = this.nodes[this.spec.topNode || "doc"], this.cached.wrappings = Object.create(null);
	}
	node(e, t = null, n, r) {
		if (typeof e == "string") e = this.nodeType(e);
		else if (!(e instanceof No)) throw RangeError("Invalid node type: " + e);
		else if (e.schema != this) throw RangeError("Node type from different schema used (" + e.name + ")");
		return e.createChecked(t, n, r);
	}
	text(e, t) {
		let n = this.nodes.text;
		return new po(n, n.defaultAttrs, e, Ga.setFrom(t));
	}
	mark(e, t) {
		return typeof e == "string" && (e = this.marks[e]), e.create(t);
	}
	nodeType(e) {
		let t = this.nodes[e];
		if (!t) throw RangeError("Unknown node type: " + e);
		return t;
	}
};
function Ro(e, t) {
	let n = [];
	for (let r = 0; r < t.length; r++) {
		let i = t[r], a = e.marks[i], o = a;
		if (a) n.push(a);
		else for (let t in e.marks) {
			let r = e.marks[t];
			(i == "_" || r.spec.group && r.spec.group.split(" ").indexOf(i) > -1) && n.push(o = r);
		}
		if (!o) throw SyntaxError("Unknown mark type: '" + t[r] + "'");
	}
	return n;
}
function zo(e) {
	return e.tag != null;
}
function Bo(e) {
	return e.style != null;
}
var Vo = class e {
	constructor(e, t) {
		this.schema = e, this.rules = t, this.tags = [], this.styles = [];
		let n = this.matchedStyles = [];
		t.forEach((e) => {
			if (zo(e)) this.tags.push(e);
			else if (Bo(e)) {
				let t = /[^=]*/.exec(e.style)[0];
				n.indexOf(t) < 0 && n.push(t), this.styles.push(e);
			}
		}), this.normalizeLists = !this.tags.some((t) => {
			if (!/^(ul|ol)\b/.test(t.tag) || !t.node) return !1;
			let n = e.nodes[t.node];
			return n.contentMatch.matchType(n);
		});
	}
	parse(e, t = {}) {
		let n = new Xo(this, t, !1);
		return n.addAll(e, Ga.none, t.from, t.to), n.finish();
	}
	parseSlice(e, t = {}) {
		let n = new Xo(this, t, !0);
		return n.addAll(e, Ga.none, t.from, t.to), J.maxOpen(n.finish());
	}
	matchTag(e, t, n) {
		for (let r = n ? this.tags.indexOf(n) + 1 : 0; r < this.tags.length; r++) {
			let n = this.tags[r];
			if (Qo(e, n.tag) && (n.namespace === void 0 || e.namespaceURI == n.namespace) && (!n.context || t.matchesContext(n.context))) {
				if (n.getAttrs) {
					let t = n.getAttrs(e);
					if (t === !1) continue;
					n.attrs = t || void 0;
				}
				return n;
			}
		}
	}
	matchStyle(e, t, n, r) {
		for (let i = r ? this.styles.indexOf(r) + 1 : 0; i < this.styles.length; i++) {
			let r = this.styles[i], a = r.style;
			if (!(a.indexOf(e) != 0 || r.context && !n.matchesContext(r.context) || a.length > e.length && (a.charCodeAt(e.length) != 61 || a.slice(e.length + 1) != t))) {
				if (r.getAttrs) {
					let e = r.getAttrs(t);
					if (e === !1) continue;
					r.attrs = e || void 0;
				}
				return r;
			}
		}
	}
	static schemaRules(e) {
		let t = [];
		function n(e) {
			let n = e.priority == null ? 50 : e.priority, r = 0;
			for (; r < t.length; r++) {
				let e = t[r];
				if ((e.priority == null ? 50 : e.priority) < n) break;
			}
			t.splice(r, 0, e);
		}
		for (let t in e.marks) {
			let r = e.marks[t].spec.parseDOM;
			r && r.forEach((e) => {
				n(e = $o(e)), e.mark || e.ignore || e.clearMark || (e.mark = t);
			});
		}
		for (let t in e.nodes) {
			let r = e.nodes[t].spec.parseDOM;
			r && r.forEach((e) => {
				n(e = $o(e)), e.node || e.ignore || e.mark || (e.node = t);
			});
		}
		return t;
	}
	static fromSchema(t) {
		return t.cached.domParser || (t.cached.domParser = new e(t, e.schemaRules(t)));
	}
}, Ho = {
	address: !0,
	article: !0,
	aside: !0,
	blockquote: !0,
	canvas: !0,
	dd: !0,
	div: !0,
	dl: !0,
	fieldset: !0,
	figcaption: !0,
	figure: !0,
	footer: !0,
	form: !0,
	h1: !0,
	h2: !0,
	h3: !0,
	h4: !0,
	h5: !0,
	h6: !0,
	header: !0,
	hgroup: !0,
	hr: !0,
	li: !0,
	noscript: !0,
	ol: !0,
	output: !0,
	p: !0,
	pre: !0,
	section: !0,
	table: !0,
	tfoot: !0,
	ul: !0
}, Uo = {
	head: !0,
	noscript: !0,
	object: !0,
	script: !0,
	style: !0,
	title: !0
}, Wo = {
	ol: !0,
	ul: !0
}, Go = 1, Ko = 2, qo = 4;
function Jo(e, t, n) {
	return t == null ? e && e.whitespace == "pre" ? Go | Ko : n & ~qo : (t ? Go : 0) | (t === "full" ? Ko : 0);
}
var Yo = class {
	constructor(e, t, n, r, i, a) {
		this.type = e, this.attrs = t, this.marks = n, this.solid = r, this.options = a, this.content = [], this.activeMarks = Ga.none, this.match = i || (a & qo ? null : e.contentMatch);
	}
	findWrapping(e) {
		if (!this.match) {
			if (!this.type) return [];
			let t = this.type.contentMatch.fillBefore(q.from(e));
			if (t) this.match = this.type.contentMatch.matchFragment(t);
			else {
				let t = this.type.contentMatch, n;
				return (n = t.findWrapping(e.type)) ? (this.match = t, n) : null;
			}
		}
		return this.match.findWrapping(e.type);
	}
	finish(e) {
		if (!(this.options & Go)) {
			let e = this.content[this.content.length - 1], t;
			if (e && e.isText && (t = /[ \t\r\n\u000c]+$/.exec(e.text))) {
				let n = e;
				e.text.length == t[0].length ? this.content.pop() : this.content[this.content.length - 1] = n.withText(n.text.slice(0, n.text.length - t[0].length));
			}
		}
		let t = q.from(this.content);
		return !e && this.match && (t = t.append(this.match.fillBefore(q.empty, !0))), this.type ? this.type.create(this.attrs, t, this.marks) : t;
	}
	inlineContext(e) {
		return this.type ? this.type.inlineContent : this.content.length ? this.content[0].isInline : e.parentNode && !Ho.hasOwnProperty(e.parentNode.nodeName.toLowerCase());
	}
}, Xo = class {
	constructor(e, t, n) {
		this.parser = e, this.options = t, this.isOpen = n, this.open = 0, this.localPreserveWS = !1;
		let r = t.topNode, i, a = Jo(null, t.preserveWhitespace, 0) | (n ? qo : 0);
		i = r ? new Yo(r.type, r.attrs, Ga.none, !0, t.topMatch || r.type.contentMatch, a) : n ? new Yo(null, null, Ga.none, !0, null, a) : new Yo(e.schema.topNodeType, null, Ga.none, !0, null, a), this.nodes = [i], this.find = t.findPositions, this.needsBlock = !1;
	}
	get top() {
		return this.nodes[this.open];
	}
	addDOM(e, t) {
		e.nodeType == 3 ? this.addTextNode(e, t) : e.nodeType == 1 && this.addElement(e, t);
	}
	addTextNode(e, t) {
		let n = e.nodeValue, r = this.top, i = r.options & Ko ? "full" : this.localPreserveWS || (r.options & Go) > 0, { schema: a } = this.parser;
		if (i === "full" || r.inlineContext(e) || /[^ \t\r\n\u000c]/.test(n)) {
			if (!i) {
				if (n = n.replace(/[ \t\r\n\u000c]+/g, " "), /^[ \t\r\n\u000c]/.test(n) && this.open == this.nodes.length - 1) {
					let t = r.content[r.content.length - 1], i = e.previousSibling;
					(!t || i && i.nodeName == "BR" || t.isText && /[ \t\r\n\u000c]$/.test(t.text)) && (n = n.slice(1));
				}
			} else if (i === "full") n = n.replace(/\r\n?/g, "\n");
			else if (a.linebreakReplacement && /[\r\n]/.test(n) && this.top.findWrapping(a.linebreakReplacement.create())) {
				let e = n.split(/\r?\n|\r/);
				for (let n = 0; n < e.length; n++) n && this.insertNode(a.linebreakReplacement.create(), t, !0), e[n] && this.insertNode(a.text(e[n]), t, !/\S/.test(e[n]));
				n = "";
			} else n = n.replace(/\r?\n|\r/g, " ");
			n && this.insertNode(a.text(n), t, !/\S/.test(n)), this.findInText(e);
		} else this.findInside(e);
	}
	addElement(e, t, n) {
		let r = this.localPreserveWS, i = this.top;
		(e.tagName == "PRE" || /pre/.test(e.style && e.style.whiteSpace)) && (this.localPreserveWS = !0);
		let a = e.nodeName.toLowerCase(), o;
		Wo.hasOwnProperty(a) && this.parser.normalizeLists && Zo(e);
		let s = this.options.ruleFromNode && this.options.ruleFromNode(e) || (o = this.parser.matchTag(e, this, n));
		out: if (s ? s.ignore : Uo.hasOwnProperty(a)) this.findInside(e), this.ignoreFallback(e, t);
		else if (!s || s.skip || s.closeParent) {
			s && s.closeParent ? this.open = Math.max(0, this.open - 1) : s && s.skip.nodeType && (e = s.skip);
			let n, r = this.needsBlock;
			if (Ho.hasOwnProperty(a)) i.content.length && i.content[0].isInline && this.open && (this.open--, i = this.top), n = !0, i.type || (this.needsBlock = !0);
			else if (!e.firstChild) {
				this.leafFallback(e, t);
				break out;
			}
			let o = s && s.skip ? t : this.readStyles(e, t);
			o && this.addAll(e, o), n && this.sync(i), this.needsBlock = r;
		} else {
			let n = this.readStyles(e, t);
			n && this.addElementByRule(e, s, n, s.consuming === !1 ? o : void 0);
		}
		this.localPreserveWS = r;
	}
	leafFallback(e, t) {
		e.nodeName == "BR" && this.top.type && this.top.type.inlineContent && this.addTextNode(e.ownerDocument.createTextNode("\n"), t);
	}
	ignoreFallback(e, t) {
		e.nodeName == "BR" && (!this.top.type || !this.top.type.inlineContent) && this.findPlace(this.parser.schema.text("-"), t, !0);
	}
	readStyles(e, t) {
		let n = e.style;
		if (n && n.length) for (let e = 0; e < this.parser.matchedStyles.length; e++) {
			let r = this.parser.matchedStyles[e], i = n.getPropertyValue(r);
			if (i) for (let e;;) {
				let n = this.parser.matchStyle(r, i, this, e);
				if (!n) break;
				if (n.ignore) return null;
				if (t = n.clearMark ? t.filter((e) => !n.clearMark(e)) : t.concat(this.parser.schema.marks[n.mark].create(n.attrs)), n.consuming === !1) e = n;
				else break;
			}
		}
		return t;
	}
	addElementByRule(e, t, n, r) {
		let i, a;
		if (t.node) if (a = this.parser.schema.nodes[t.node], a.isLeaf) this.insertNode(a.create(t.attrs), n, e.nodeName == "BR") || this.leafFallback(e, n);
		else {
			let e = this.enter(a, t.attrs || null, n, t.preserveWhitespace);
			e && (i = !0, n = e);
		}
		else {
			let e = this.parser.schema.marks[t.mark];
			n = n.concat(e.create(t.attrs));
		}
		let o = this.top;
		if (a && a.isLeaf) this.findInside(e);
		else if (r) this.addElement(e, n, r);
		else if (t.getContent) this.findInside(e), t.getContent(e, this.parser.schema).forEach((e) => this.insertNode(e, n, !1));
		else {
			let r = e;
			typeof t.contentElement == "string" ? r = e.querySelector(t.contentElement) : typeof t.contentElement == "function" ? r = t.contentElement(e) : t.contentElement && (r = t.contentElement), this.findAround(e, r, !0), this.addAll(r, n), this.findAround(e, r, !1);
		}
		i && this.sync(o) && this.open--;
	}
	addAll(e, t, n, r) {
		let i = n || 0;
		for (let a = n ? e.childNodes[n] : e.firstChild, o = r == null ? null : e.childNodes[r]; a != o; a = a.nextSibling, ++i) this.findAtPoint(e, i), this.addDOM(a, t);
		this.findAtPoint(e, i);
	}
	findPlace(e, t, n) {
		let r, i;
		for (let t = this.open, a = 0; t >= 0; t--) {
			let o = this.nodes[t], s = o.findWrapping(e);
			if (s && (!r || r.length > s.length + a) && (r = s, i = o, !s.length)) break;
			if (o.solid) {
				if (n) break;
				a += 2;
			}
		}
		if (!r) return null;
		this.sync(i);
		for (let e = 0; e < r.length; e++) t = this.enterInner(r[e], null, t, !1);
		return t;
	}
	insertNode(e, t, n) {
		if (e.isInline && this.needsBlock && !this.top.type) {
			let e = this.textblockFromContext();
			e && (t = this.enterInner(e, null, t));
		}
		let r = this.findPlace(e, t, n);
		if (r) {
			this.closeExtra();
			let t = this.top;
			t.match &&= t.match.matchType(e.type);
			let n = Ga.none;
			for (let i of r.concat(e.marks)) (t.type ? t.type.allowsMarkType(i.type) : es(i.type, e.type)) && (n = i.addToSet(n));
			return t.content.push(e.mark(n)), !0;
		}
		return !1;
	}
	enter(e, t, n, r) {
		let i = this.findPlace(e.create(t), n, !1);
		return i &&= this.enterInner(e, t, n, !0, r), i;
	}
	enterInner(e, t, n, r = !1, i) {
		this.closeExtra();
		let a = this.top;
		a.match = a.match && a.match.matchType(e);
		let o = Jo(e, i, a.options);
		a.options & qo && a.content.length == 0 && (o |= qo);
		let s = Ga.none;
		return n = n.filter((t) => (a.type ? a.type.allowsMarkType(t.type) : es(t.type, e)) ? (s = t.addToSet(s), !1) : !0), this.nodes.push(new Yo(e, t, s, r, null, o)), this.open++, n;
	}
	closeExtra(e = !1) {
		let t = this.nodes.length - 1;
		if (t > this.open) {
			for (; t > this.open; t--) this.nodes[t - 1].content.push(this.nodes[t].finish(e));
			this.nodes.length = this.open + 1;
		}
	}
	finish() {
		return this.open = 0, this.closeExtra(this.isOpen), this.nodes[0].finish(!!(this.isOpen || this.options.topOpen));
	}
	sync(e) {
		for (let t = this.open; t >= 0; t--) if (this.nodes[t] == e) return this.open = t, !0;
		else this.localPreserveWS && (this.nodes[t].options |= Go);
		return !1;
	}
	get currentPos() {
		this.closeExtra();
		let e = 0;
		for (let t = this.open; t >= 0; t--) {
			let n = this.nodes[t].content;
			for (let t = n.length - 1; t >= 0; t--) e += n[t].nodeSize;
			t && e++;
		}
		return e;
	}
	findAtPoint(e, t) {
		if (this.find) for (let n = 0; n < this.find.length; n++) this.find[n].node == e && this.find[n].offset == t && (this.find[n].pos = this.currentPos);
	}
	findInside(e) {
		if (this.find) for (let t = 0; t < this.find.length; t++) this.find[t].pos == null && e.nodeType == 1 && e.contains(this.find[t].node) && (this.find[t].pos = this.currentPos);
	}
	findAround(e, t, n) {
		if (e != t && this.find) for (let r = 0; r < this.find.length; r++) this.find[r].pos == null && e.nodeType == 1 && e.contains(this.find[r].node) && t.compareDocumentPosition(this.find[r].node) & (n ? 2 : 4) && (this.find[r].pos = this.currentPos);
	}
	findInText(e) {
		if (this.find) for (let t = 0; t < this.find.length; t++) this.find[t].node == e && (this.find[t].pos = this.currentPos - (e.nodeValue.length - this.find[t].offset));
	}
	matchesContext(e) {
		if (e.indexOf("|") > -1) return e.split(/\s*\|\s*/).some(this.matchesContext, this);
		let t = e.split("/"), n = this.options.context, r = !this.isOpen && (!n || n.parent.type == this.nodes[0].type), i = -(n ? n.depth + 1 : 0) + +!r, a = (e, o) => {
			for (; e >= 0; e--) {
				let s = t[e];
				if (s == "") {
					if (e == t.length - 1 || e == 0) continue;
					for (; o >= i; o--) if (a(e - 1, o)) return !0;
					return !1;
				} else {
					let e = o > 0 || o == 0 && r ? this.nodes[o].type : n && o >= i ? n.node(o - i).type : null;
					if (!e || e.name != s && !e.isInGroup(s)) return !1;
					o--;
				}
			}
			return !0;
		};
		return a(t.length - 1, this.open);
	}
	textblockFromContext() {
		let e = this.options.context;
		if (e) for (let t = e.depth; t >= 0; t--) {
			let n = e.node(t).contentMatchAt(e.indexAfter(t)).defaultType;
			if (n && n.isTextblock && n.defaultAttrs) return n;
		}
		for (let e in this.parser.schema.nodes) {
			let t = this.parser.schema.nodes[e];
			if (t.isTextblock && t.defaultAttrs) return t;
		}
	}
};
function Zo(e) {
	for (let t = e.firstChild, n = null; t; t = t.nextSibling) {
		let e = t.nodeType == 1 ? t.nodeName.toLowerCase() : null;
		e && Wo.hasOwnProperty(e) && n ? (n.appendChild(t), t = n) : e == "li" ? n = t : e && (n = null);
	}
}
function Qo(e, t) {
	return (e.matches || e.msMatchesSelector || e.webkitMatchesSelector || e.mozMatchesSelector).call(e, t);
}
function $o(e) {
	let t = {};
	for (let n in e) t[n] = e[n];
	return t;
}
function es(e, t) {
	let n = t.schema.nodes;
	for (let r in n) {
		let i = n[r];
		if (!i.allowsMarkType(e)) continue;
		let a = [], o = (e) => {
			a.push(e);
			for (let n = 0; n < e.edgeCount; n++) {
				let { type: r, next: i } = e.edge(n);
				if (r == t || a.indexOf(i) < 0 && o(i)) return !0;
			}
		};
		if (o(i.contentMatch)) return !0;
	}
}
var ts = class e {
	constructor(e, t) {
		this.nodes = e, this.marks = t;
	}
	serializeFragment(e, t = {}, n) {
		n ||= rs(t).createDocumentFragment();
		let r = n, i = [];
		return e.forEach((e) => {
			if (i.length || e.marks.length) {
				let n = 0, a = 0;
				for (; n < i.length && a < e.marks.length;) {
					let t = e.marks[a];
					if (!this.marks[t.type.name]) {
						a++;
						continue;
					}
					if (!t.eq(i[n][0]) || t.type.spec.spanning === !1) break;
					n++, a++;
				}
				for (; n < i.length;) r = i.pop()[1];
				for (; a < e.marks.length;) {
					let n = e.marks[a++], o = this.serializeMark(n, e.isInline, t);
					o && (i.push([n, r]), r.appendChild(o.dom), r = o.contentDOM || o.dom);
				}
			}
			r.appendChild(this.serializeNodeInner(e, t));
		}), n;
	}
	serializeNodeInner(e, t) {
		let { dom: n, contentDOM: r } = cs(rs(t), this.nodes[e.type.name](e), null, e.attrs);
		if (r) {
			if (e.isLeaf) throw RangeError("Content hole not allowed in a leaf node spec");
			this.serializeFragment(e.content, t, r);
		}
		return n;
	}
	serializeNode(e, t = {}) {
		let n = this.serializeNodeInner(e, t);
		for (let r = e.marks.length - 1; r >= 0; r--) {
			let i = this.serializeMark(e.marks[r], e.isInline, t);
			i && ((i.contentDOM || i.dom).appendChild(n), n = i.dom);
		}
		return n;
	}
	serializeMark(e, t, n = {}) {
		let r = this.marks[e.type.name];
		return r && cs(rs(n), r(e, t), null, e.attrs);
	}
	static renderSpec(e, t, n = null, r) {
		return cs(e, t, n, r);
	}
	static fromSchema(t) {
		return t.cached.domSerializer || (t.cached.domSerializer = new e(this.nodesFromSchema(t), this.marksFromSchema(t)));
	}
	static nodesFromSchema(e) {
		let t = ns(e.nodes);
		return t.text ||= (e) => e.text, t;
	}
	static marksFromSchema(e) {
		return ns(e.marks);
	}
};
function ns(e) {
	let t = {};
	for (let n in e) {
		let r = e[n].spec.toDOM;
		r && (t[n] = r);
	}
	return t;
}
function rs(e) {
	return e.document || window.document;
}
var is = /* @__PURE__ */ new WeakMap();
function as(e) {
	let t = is.get(e);
	return t === void 0 && is.set(e, t = ss(e)), t;
}
function ss(e) {
	let t = null;
	function n(e) {
		if (e && typeof e == "object") if (Array.isArray(e)) if (typeof e[0] == "string") t ||= [], t.push(e);
		else for (let t = 0; t < e.length; t++) n(e[t]);
		else for (let t in e) n(e[t]);
	}
	return n(e), t;
}
function cs(e, t, n, r) {
	if (typeof t == "string") return { dom: e.createTextNode(t) };
	if (t.nodeType != null) return { dom: t };
	if (t.dom && t.dom.nodeType != null) return t;
	let i = t[0], a;
	if (typeof i != "string") throw RangeError("Invalid array passed to renderSpec");
	if (r && (a = as(r)) && a.indexOf(t) > -1) throw RangeError("Using an array from an attribute object as a DOM spec. This may be an attempted cross site scripting attack.");
	let o = i.indexOf(" ");
	o > 0 && (n = i.slice(0, o), i = i.slice(o + 1));
	let s, c = n ? e.createElementNS(n, i) : e.createElement(i), l = t[1], u = 1;
	if (l && typeof l == "object" && l.nodeType == null && !Array.isArray(l)) {
		u = 2;
		for (let e in l) if (l[e] != null) {
			let t = e.indexOf(" ");
			t > 0 ? c.setAttributeNS(e.slice(0, t), e.slice(t + 1), l[e]) : e == "style" && c.style ? c.style.cssText = l[e] : c.setAttribute(e, l[e]);
		}
	}
	for (let i = u; i < t.length; i++) {
		let a = t[i];
		if (a === 0) {
			if (i < t.length - 1 || i > u) throw RangeError("Content hole must be the only child of its parent node");
			return {
				dom: c,
				contentDOM: c
			};
		} else {
			let { dom: t, contentDOM: i } = cs(e, a, n, r);
			if (c.appendChild(t), i) {
				if (s) throw RangeError("Multiple content holes");
				s = i;
			}
		}
	}
	return {
		dom: c,
		contentDOM: s
	};
}
//#endregion
//#region node_modules/prosemirror-transform/dist/index.js
var ls = 65535, us = 2 ** 16;
function ds(e, t) {
	return e + t * us;
}
function fs(e) {
	return e & ls;
}
function ps(e) {
	return (e - (e & ls)) / us;
}
var ms = 1, hs = 2, gs = 4, _s = 8, vs = class {
	constructor(e, t, n) {
		this.pos = e, this.delInfo = t, this.recover = n;
	}
	get deleted() {
		return (this.delInfo & _s) > 0;
	}
	get deletedBefore() {
		return (this.delInfo & (ms | gs)) > 0;
	}
	get deletedAfter() {
		return (this.delInfo & (hs | gs)) > 0;
	}
	get deletedAcross() {
		return (this.delInfo & gs) > 0;
	}
}, ys = class e {
	constructor(t, n = !1) {
		if (this.ranges = t, this.inverted = n, !t.length && e.empty) return e.empty;
	}
	recover(e) {
		let t = 0, n = fs(e);
		if (!this.inverted) for (let e = 0; e < n; e++) t += this.ranges[e * 3 + 2] - this.ranges[e * 3 + 1];
		return this.ranges[n * 3] + t + ps(e);
	}
	mapResult(e, t = 1) {
		return this._map(e, t, !1);
	}
	map(e, t = 1) {
		return this._map(e, t, !0);
	}
	_map(e, t, n) {
		let r = 0, i = this.inverted ? 2 : 1, a = this.inverted ? 1 : 2;
		for (let o = 0; o < this.ranges.length; o += 3) {
			let s = this.ranges[o] - (this.inverted ? r : 0);
			if (s > e) break;
			let c = this.ranges[o + i], l = this.ranges[o + a], u = s + c;
			if (e <= u) {
				let i = c ? e == s ? -1 : e == u ? 1 : t : t, a = s + r + (i < 0 ? 0 : l);
				if (n) return a;
				let d = e == (t < 0 ? s : u) ? null : ds(o / 3, e - s), f = e == s ? hs : e == u ? ms : gs;
				return (t < 0 ? e != s : e != u) && (f |= _s), new vs(a, f, d);
			}
			r += l - c;
		}
		return n ? e + r : new vs(e + r, 0, null);
	}
	touches(e, t) {
		let n = 0, r = fs(t), i = this.inverted ? 2 : 1, a = this.inverted ? 1 : 2;
		for (let t = 0; t < this.ranges.length; t += 3) {
			let o = this.ranges[t] - (this.inverted ? n : 0);
			if (o > e) break;
			let s = this.ranges[t + i];
			if (e <= o + s && t == r * 3) return !0;
			n += this.ranges[t + a] - s;
		}
		return !1;
	}
	forEach(e) {
		let t = this.inverted ? 2 : 1, n = this.inverted ? 1 : 2;
		for (let r = 0, i = 0; r < this.ranges.length; r += 3) {
			let a = this.ranges[r], o = a - (this.inverted ? i : 0), s = a + (this.inverted ? 0 : i), c = this.ranges[r + t], l = this.ranges[r + n];
			e(o, o + c, s, s + l), i += l - c;
		}
	}
	invert() {
		return new e(this.ranges, !this.inverted);
	}
	toString() {
		return (this.inverted ? "-" : "") + JSON.stringify(this.ranges);
	}
	static offset(t) {
		return t == 0 ? e.empty : new e(t < 0 ? [
			0,
			-t,
			0
		] : [
			0,
			0,
			t
		]);
	}
};
ys.empty = new ys([]);
var bs = class e {
	constructor(e, t, n = 0, r = e ? e.length : 0) {
		this.mirror = t, this.from = n, this.to = r, this._maps = e || [], this.ownData = !(e || t);
	}
	get maps() {
		return this._maps;
	}
	slice(t = 0, n = this.maps.length) {
		return new e(this._maps, this.mirror, t, n);
	}
	appendMap(e, t) {
		this.ownData ||= (this._maps = this._maps.slice(), this.mirror = this.mirror && this.mirror.slice(), !0), this.to = this._maps.push(e), t != null && this.setMirror(this._maps.length - 1, t);
	}
	appendMapping(e) {
		for (let t = 0, n = this._maps.length; t < e._maps.length; t++) {
			let r = e.getMirror(t);
			this.appendMap(e._maps[t], r != null && r < t ? n + r : void 0);
		}
	}
	getMirror(e) {
		if (this.mirror) {
			for (let t = 0; t < this.mirror.length; t++) if (this.mirror[t] == e) return this.mirror[t + (t % 2 ? -1 : 1)];
		}
	}
	setMirror(e, t) {
		this.mirror ||= [], this.mirror.push(e, t);
	}
	appendMappingInverted(e) {
		for (let t = e.maps.length - 1, n = this._maps.length + e._maps.length; t >= 0; t--) {
			let r = e.getMirror(t);
			this.appendMap(e._maps[t].invert(), r != null && r > t ? n - r - 1 : void 0);
		}
	}
	invert() {
		let t = new e();
		return t.appendMappingInverted(this), t;
	}
	map(e, t = 1) {
		if (this.mirror) return this._map(e, t, !0);
		for (let n = this.from; n < this.to; n++) e = this._maps[n].map(e, t);
		return e;
	}
	mapResult(e, t = 1) {
		return this._map(e, t, !1);
	}
	_map(e, t, n) {
		let r = 0;
		for (let n = this.from; n < this.to; n++) {
			let i = this._maps[n].mapResult(e, t);
			if (i.recover != null) {
				let t = this.getMirror(n);
				if (t != null && t > n && t < this.to) {
					n = t, e = this._maps[t].recover(i.recover);
					continue;
				}
			}
			r |= i.delInfo, e = i.pos;
		}
		return n ? e : new vs(e, r, null);
	}
}, xs = Object.create(null), Ss = class {
	getMap() {
		return ys.empty;
	}
	merge(e) {
		return null;
	}
	static fromJSON(e, t) {
		if (!t || !t.stepType) throw RangeError("Invalid input for Step.fromJSON");
		let n = xs[t.stepType];
		if (!n) throw RangeError(`No step type ${t.stepType} defined`);
		return n.fromJSON(e, t);
	}
	static jsonID(e, t) {
		if (e in xs) throw RangeError("Duplicate use of step JSON ID " + e);
		return xs[e] = t, t.prototype.jsonID = e, t;
	}
}, Cs = class e {
	constructor(e, t) {
		this.doc = e, this.failed = t;
	}
	static ok(t) {
		return new e(t, null);
	}
	static fail(t) {
		return new e(null, t);
	}
	static fromReplace(t, n, r, i) {
		try {
			return e.ok(t.replace(n, r, i));
		} catch (t) {
			if (t instanceof Ka) return e.fail(t.message);
			throw t;
		}
	}
};
function ws(e, t, n) {
	let r = [];
	for (let i = 0; i < e.childCount; i++) {
		let a = e.child(i);
		a.content.size && (a = a.copy(ws(a.content, t, a))), a.isInline && (a = t(a, n, i)), r.push(a);
	}
	return q.fromArray(r);
}
var Ts = class e extends Ss {
	constructor(e, t, n) {
		super(), this.from = e, this.to = t, this.mark = n;
	}
	apply(e) {
		let t = e.slice(this.from, this.to), n = e.resolve(this.from), r = n.node(n.sharedDepth(this.to)), i = new J(ws(t.content, (e, t) => !e.isAtom || !t.type.allowsMarkType(this.mark.type) ? e : e.mark(this.mark.addToSet(e.marks)), r), t.openStart, t.openEnd);
		return Cs.fromReplace(e, this.from, this.to, i);
	}
	invert() {
		return new Es(this.from, this.to, this.mark);
	}
	map(t) {
		let n = t.mapResult(this.from, 1), r = t.mapResult(this.to, -1);
		return n.deleted && r.deleted || n.pos >= r.pos ? null : new e(n.pos, r.pos, this.mark);
	}
	merge(t) {
		return t instanceof e && t.mark.eq(this.mark) && this.from <= t.to && this.to >= t.from ? new e(Math.min(this.from, t.from), Math.max(this.to, t.to), this.mark) : null;
	}
	toJSON() {
		return {
			stepType: "addMark",
			mark: this.mark.toJSON(),
			from: this.from,
			to: this.to
		};
	}
	static fromJSON(t, n) {
		if (typeof n.from != "number" || typeof n.to != "number") throw RangeError("Invalid input for AddMarkStep.fromJSON");
		return new e(n.from, n.to, t.markFromJSON(n.mark));
	}
};
Ss.jsonID("addMark", Ts);
var Es = class e extends Ss {
	constructor(e, t, n) {
		super(), this.from = e, this.to = t, this.mark = n;
	}
	apply(e) {
		let t = e.slice(this.from, this.to), n = new J(ws(t.content, (e) => e.mark(this.mark.removeFromSet(e.marks)), e), t.openStart, t.openEnd);
		return Cs.fromReplace(e, this.from, this.to, n);
	}
	invert() {
		return new Ts(this.from, this.to, this.mark);
	}
	map(t) {
		let n = t.mapResult(this.from, 1), r = t.mapResult(this.to, -1);
		return n.deleted && r.deleted || n.pos >= r.pos ? null : new e(n.pos, r.pos, this.mark);
	}
	merge(t) {
		return t instanceof e && t.mark.eq(this.mark) && this.from <= t.to && this.to >= t.from ? new e(Math.min(this.from, t.from), Math.max(this.to, t.to), this.mark) : null;
	}
	toJSON() {
		return {
			stepType: "removeMark",
			mark: this.mark.toJSON(),
			from: this.from,
			to: this.to
		};
	}
	static fromJSON(t, n) {
		if (typeof n.from != "number" || typeof n.to != "number") throw RangeError("Invalid input for RemoveMarkStep.fromJSON");
		return new e(n.from, n.to, t.markFromJSON(n.mark));
	}
};
Ss.jsonID("removeMark", Es);
var Ds = class e extends Ss {
	constructor(e, t) {
		super(), this.pos = e, this.mark = t;
	}
	apply(e) {
		let t = e.nodeAt(this.pos);
		if (!t) return Cs.fail("No node at mark step's position");
		let n = t.type.create(t.attrs, null, this.mark.addToSet(t.marks));
		return Cs.fromReplace(e, this.pos, this.pos + 1, new J(q.from(n), 0, +!t.isLeaf));
	}
	invert(t) {
		let n = t.nodeAt(this.pos);
		if (n) {
			let t = this.mark.addToSet(n.marks);
			if (t.length == n.marks.length) {
				for (let r = 0; r < n.marks.length; r++) if (!n.marks[r].isInSet(t)) return new e(this.pos, n.marks[r]);
				return new e(this.pos, this.mark);
			}
		}
		return new Os(this.pos, this.mark);
	}
	map(t) {
		let n = t.mapResult(this.pos, 1);
		return n.deletedAfter ? null : new e(n.pos, this.mark);
	}
	toJSON() {
		return {
			stepType: "addNodeMark",
			pos: this.pos,
			mark: this.mark.toJSON()
		};
	}
	static fromJSON(t, n) {
		if (typeof n.pos != "number") throw RangeError("Invalid input for AddNodeMarkStep.fromJSON");
		return new e(n.pos, t.markFromJSON(n.mark));
	}
};
Ss.jsonID("addNodeMark", Ds);
var Os = class e extends Ss {
	constructor(e, t) {
		super(), this.pos = e, this.mark = t;
	}
	apply(e) {
		let t = e.nodeAt(this.pos);
		if (!t) return Cs.fail("No node at mark step's position");
		let n = t.type.create(t.attrs, null, this.mark.removeFromSet(t.marks));
		return Cs.fromReplace(e, this.pos, this.pos + 1, new J(q.from(n), 0, +!t.isLeaf));
	}
	invert(e) {
		let t = e.nodeAt(this.pos);
		return !t || !this.mark.isInSet(t.marks) ? this : new Ds(this.pos, this.mark);
	}
	map(t) {
		let n = t.mapResult(this.pos, 1);
		return n.deletedAfter ? null : new e(n.pos, this.mark);
	}
	toJSON() {
		return {
			stepType: "removeNodeMark",
			pos: this.pos,
			mark: this.mark.toJSON()
		};
	}
	static fromJSON(t, n) {
		if (typeof n.pos != "number") throw RangeError("Invalid input for RemoveNodeMarkStep.fromJSON");
		return new e(n.pos, t.markFromJSON(n.mark));
	}
};
Ss.jsonID("removeNodeMark", Os);
var ks = class e extends Ss {
	constructor(e, t, n, r = !1) {
		super(), this.from = e, this.to = t, this.slice = n, this.structure = r;
	}
	apply(e) {
		return this.structure && js(e, this.from, this.to) ? Cs.fail("Structure replace would overwrite content") : Cs.fromReplace(e, this.from, this.to, this.slice);
	}
	getMap() {
		return new ys([
			this.from,
			this.to - this.from,
			this.slice.size
		]);
	}
	invert(t) {
		return new e(this.from, this.from + this.slice.size, t.slice(this.from, this.to));
	}
	map(t) {
		let n = t.mapResult(this.to, -1), r = this.from == this.to && e.MAP_BIAS < 0 ? n : t.mapResult(this.from, 1);
		return r.deletedAcross && n.deletedAcross ? null : new e(r.pos, Math.max(r.pos, n.pos), this.slice, this.structure);
	}
	merge(t) {
		if (!(t instanceof e) || t.structure || this.structure) return null;
		if (this.from + this.slice.size == t.from && !this.slice.openEnd && !t.slice.openStart) {
			let n = this.slice.size + t.slice.size == 0 ? J.empty : new J(this.slice.content.append(t.slice.content), this.slice.openStart, t.slice.openEnd);
			return new e(this.from, this.to + (t.to - t.from), n, this.structure);
		} else if (t.to == this.from && !this.slice.openStart && !t.slice.openEnd) {
			let n = this.slice.size + t.slice.size == 0 ? J.empty : new J(t.slice.content.append(this.slice.content), t.slice.openStart, this.slice.openEnd);
			return new e(t.from, this.to, n, this.structure);
		} else return null;
	}
	toJSON() {
		let e = {
			stepType: "replace",
			from: this.from,
			to: this.to
		};
		return this.slice.size && (e.slice = this.slice.toJSON()), this.structure && (e.structure = !0), e;
	}
	static fromJSON(t, n) {
		if (typeof n.from != "number" || typeof n.to != "number") throw RangeError("Invalid input for ReplaceStep.fromJSON");
		return new e(n.from, n.to, J.fromJSON(t, n.slice), !!n.structure);
	}
};
ks.MAP_BIAS = 1, Ss.jsonID("replace", ks);
var As = class e extends Ss {
	constructor(e, t, n, r, i, a, o = !1) {
		super(), this.from = e, this.to = t, this.gapFrom = n, this.gapTo = r, this.slice = i, this.insert = a, this.structure = o;
	}
	apply(e) {
		if (this.structure && (js(e, this.from, this.gapFrom) || js(e, this.gapTo, this.to))) return Cs.fail("Structure gap-replace would overwrite content");
		let t = e.slice(this.gapFrom, this.gapTo);
		if (t.openStart || t.openEnd) return Cs.fail("Gap is not a flat range");
		let n = this.slice.insertAt(this.insert, t.content);
		return n ? Cs.fromReplace(e, this.from, this.to, n) : Cs.fail("Content does not fit in gap");
	}
	getMap() {
		return new ys([
			this.from,
			this.gapFrom - this.from,
			this.insert,
			this.gapTo,
			this.to - this.gapTo,
			this.slice.size - this.insert
		]);
	}
	invert(t) {
		let n = this.gapTo - this.gapFrom;
		return new e(this.from, this.from + this.slice.size + n, this.from + this.insert, this.from + this.insert + n, t.slice(this.from, this.to).removeBetween(this.gapFrom - this.from, this.gapTo - this.from), this.gapFrom - this.from, this.structure);
	}
	map(t) {
		let n = t.mapResult(this.from, 1), r = t.mapResult(this.to, -1), i = this.from == this.gapFrom ? n.pos : t.map(this.gapFrom, -1), a = this.to == this.gapTo ? r.pos : t.map(this.gapTo, 1);
		return n.deletedAcross && r.deletedAcross || i < n.pos || a > r.pos ? null : new e(n.pos, r.pos, i, a, this.slice, this.insert, this.structure);
	}
	toJSON() {
		let e = {
			stepType: "replaceAround",
			from: this.from,
			to: this.to,
			gapFrom: this.gapFrom,
			gapTo: this.gapTo,
			insert: this.insert
		};
		return this.slice.size && (e.slice = this.slice.toJSON()), this.structure && (e.structure = !0), e;
	}
	static fromJSON(t, n) {
		if (typeof n.from != "number" || typeof n.to != "number" || typeof n.gapFrom != "number" || typeof n.gapTo != "number" || typeof n.insert != "number") throw RangeError("Invalid input for ReplaceAroundStep.fromJSON");
		return new e(n.from, n.to, n.gapFrom, n.gapTo, J.fromJSON(t, n.slice), n.insert, !!n.structure);
	}
};
Ss.jsonID("replaceAround", As);
function js(e, t, n) {
	let r = e.resolve(t), i = n - t, a = r.depth;
	for (; i > 0 && a > 0 && r.indexAfter(a) == r.node(a).childCount;) a--, i--;
	if (i > 0) {
		let e = r.node(a).maybeChild(r.indexAfter(a));
		for (; i > 0;) {
			if (!e || e.isLeaf) return !0;
			e = e.firstChild, i--;
		}
	}
	return !1;
}
function Ms(e, t, n, r) {
	let i = [], a = [], o, s;
	e.doc.nodesBetween(t, n, (e, c, l) => {
		if (!e.isInline) return;
		let u = e.marks;
		if (!r.isInSet(u) && l.type.allowsMarkType(r.type)) {
			let l = Math.max(c, t), d = Math.min(c + e.nodeSize, n), f = r.addToSet(u);
			for (let e = 0; e < u.length; e++) u[e].isInSet(f) || (o && o.to == l && o.mark.eq(u[e]) ? o.to = d : i.push(o = new Es(l, d, u[e])));
			s && s.to == l ? s.to = d : a.push(s = new Ts(l, d, r));
		}
	}), i.forEach((t) => e.step(t)), a.forEach((t) => e.step(t));
}
function Ns(e, t, n, r) {
	let i = [], a = 0;
	e.doc.nodesBetween(t, n, (e, o) => {
		if (!e.isInline) return;
		a++;
		let s = null;
		if (r instanceof Io) {
			let t = e.marks, n;
			for (; n = r.isInSet(t);) (s ||= []).push(n), t = n.removeFromSet(t);
		} else r ? r.isInSet(e.marks) && (s = [r]) : s = e.marks;
		if (s && s.length) {
			let r = Math.min(o + e.nodeSize, n);
			for (let e = 0; e < s.length; e++) {
				let n = s[e], c;
				for (let e = 0; e < i.length; e++) {
					let t = i[e];
					t.step == a - 1 && n.eq(i[e].style) && (c = t);
				}
				c ? (c.to = r, c.step = a) : i.push({
					style: n,
					from: Math.max(o, t),
					to: r,
					step: a
				});
			}
		}
	}), i.forEach((t) => e.step(new Es(t.from, t.to, t.style)));
}
function Ps(e, t, n, r = n.contentMatch, i = !0) {
	let a = e.doc.nodeAt(t), o = [], s = t + 1;
	for (let t = 0; t < a.childCount; t++) {
		let c = a.child(t), l = s + c.nodeSize, u = r.matchType(c.type);
		if (!u) o.push(new ks(s, l, J.empty));
		else {
			r = u;
			for (let t = 0; t < c.marks.length; t++) n.allowsMarkType(c.marks[t].type) || e.step(new Es(s, l, c.marks[t]));
			if (i && c.isText && n.whitespace != "pre") {
				let e, t = /\r?\n|\r/g, r;
				for (; e = t.exec(c.text);) r ||= new J(q.from(n.schema.text(" ", n.allowedMarks(c.marks))), 0, 0), o.push(new ks(s + e.index, s + e.index + e[0].length, r));
			}
		}
		s = l;
	}
	if (!r.validEnd) {
		let t = r.fillBefore(q.empty, !0);
		e.replace(s, s, new J(t, 0, 0));
	}
	for (let t = o.length - 1; t >= 0; t--) e.step(o[t]);
}
function Fs(e, t, n) {
	return (t == 0 || e.canReplace(t, e.childCount)) && (n == e.childCount || e.canReplace(0, n));
}
function Is(e) {
	let t = e.parent.content.cutByIndex(e.startIndex, e.endIndex);
	for (let n = e.depth, r = 0, i = 0;; --n) {
		let a = e.$from.node(n), o = e.$from.index(n) + r, s = e.$to.indexAfter(n) - i;
		if (n < e.depth && a.canReplace(o, s, t)) return n;
		if (n == 0 || a.type.spec.isolating || !Fs(a, o, s)) break;
		o && (r = 1), s < a.childCount && (i = 1);
	}
	return null;
}
function Ls(e, t, n) {
	let { $from: r, $to: i, depth: a } = t, o = r.before(a + 1), s = i.after(a + 1), c = o, l = s, u = q.empty, d = 0;
	for (let e = a, t = !1; e > n; e--) t || r.index(e) > 0 ? (t = !0, u = q.from(r.node(e).copy(u)), d++) : c--;
	let f = q.empty, p = 0;
	for (let e = a, t = !1; e > n; e--) t || i.after(e + 1) < i.end(e) ? (t = !0, f = q.from(i.node(e).copy(f)), p++) : l++;
	e.step(new As(c, l, o, s, new J(u.append(f), d, p), u.size - d, !0));
}
function Rs(e, t, n = null, r = e) {
	let i = Bs(e, t), a = i && Vs(r, t);
	return a ? i.map(zs).concat({
		type: t,
		attrs: n
	}).concat(a.map(zs)) : null;
}
function zs(e) {
	return {
		type: e,
		attrs: null
	};
}
function Bs(e, t) {
	let { parent: n, startIndex: r, endIndex: i } = e, a = n.contentMatchAt(r).findWrapping(t);
	if (!a) return null;
	let o = a.length ? a[0] : t;
	return n.canReplaceWith(r, i, o) ? a : null;
}
function Vs(e, t) {
	let { parent: n, startIndex: r, endIndex: i } = e, a = n.child(r), o = t.contentMatch.findWrapping(a.type);
	if (!o) return null;
	let s = (o.length ? o[o.length - 1] : t).contentMatch;
	for (let e = r; s && e < i; e++) s = s.matchType(n.child(e).type);
	return !s || !s.validEnd ? null : o;
}
function Hs(e, t, n) {
	let r = q.empty;
	for (let e = n.length - 1; e >= 0; e--) {
		if (r.size) {
			let t = n[e].type.contentMatch.matchFragment(r);
			if (!t || !t.validEnd) throw RangeError("Wrapper type given to Transform.wrap does not form valid content of its parent wrapper");
		}
		r = q.from(n[e].type.create(n[e].attrs, r));
	}
	let i = t.start, a = t.end;
	e.step(new As(i, a, i, a, new J(r, 0, 0), n.length, !0));
}
function Us(e, t, n, r, i) {
	if (!r.isTextblock) throw RangeError("Type given to setBlockType should be a textblock");
	let a = e.steps.length;
	e.doc.nodesBetween(t, n, (t, n) => {
		let o = typeof i == "function" ? i(t) : i;
		if (t.isTextblock && !t.hasMarkup(r, o) && Ks(e.doc, e.mapping.slice(a).map(n), r)) {
			let i = null;
			if (r.schema.linebreakReplacement) {
				let e = r.whitespace == "pre", t = !!r.contentMatch.matchType(r.schema.linebreakReplacement);
				e && !t ? i = !1 : !e && t && (i = !0);
			}
			i === !1 && Gs(e, t, n, a), Ps(e, e.mapping.slice(a).map(n, 1), r, void 0, i === null);
			let s = e.mapping.slice(a), c = s.map(n, 1), l = s.map(n + t.nodeSize, 1);
			return e.step(new As(c, l, c + 1, l - 1, new J(q.from(r.create(o, null, t.marks)), 0, 0), 1, !0)), i === !0 && Ws(e, t, n, a), !1;
		}
	});
}
function Ws(e, t, n, r) {
	t.forEach((i, a) => {
		if (i.isText) {
			let o, s = /\r?\n|\r/g;
			for (; o = s.exec(i.text);) {
				let i = e.mapping.slice(r).map(n + 1 + a + o.index);
				e.replaceWith(i, i + 1, t.type.schema.linebreakReplacement.create());
			}
		}
	});
}
function Gs(e, t, n, r) {
	t.forEach((i, a) => {
		if (i.type == i.type.schema.linebreakReplacement) {
			let i = e.mapping.slice(r).map(n + 1 + a);
			e.replaceWith(i, i + 1, t.type.schema.text("\n"));
		}
	});
}
function Ks(e, t, n) {
	let r = e.resolve(t), i = r.index();
	return r.parent.canReplaceWith(i, i + 1, n);
}
function qs(e, t, n, r, i) {
	let a = e.doc.nodeAt(t);
	if (!a) throw RangeError("No node at given position");
	n ||= a.type;
	let o = n.create(r, null, i || a.marks);
	if (a.isLeaf) return e.replaceWith(t, t + a.nodeSize, o);
	if (!n.validContent(a.content)) throw RangeError("Invalid content for node type " + n.name);
	e.step(new As(t, t + a.nodeSize, t + 1, t + a.nodeSize - 1, new J(q.from(o), 0, 0), 1, !0));
}
function Js(e, t, n = 1, r) {
	let i = e.resolve(t), a = i.depth - n, o = r && r[r.length - 1] || i.parent;
	if (a < 0 || i.parent.type.spec.isolating || !i.parent.canReplace(i.index(), i.parent.childCount) || !o.type.validContent(i.parent.content.cutByIndex(i.index(), i.parent.childCount))) return !1;
	for (let e = i.depth - 1, t = n - 2; e > a; e--, t--) {
		let n = i.node(e), a = i.index(e);
		if (n.type.spec.isolating) return !1;
		let o = n.content.cutByIndex(a, n.childCount), s = r && r[t + 1];
		s && (o = o.replaceChild(0, s.type.create(s.attrs)));
		let c = r && r[t] || n;
		if (!n.canReplace(a + 1, n.childCount) || !c.type.validContent(o)) return !1;
	}
	let s = i.indexAfter(a), c = r && r[0];
	return i.node(a).canReplaceWith(s, s, c ? c.type : i.node(a + 1).type);
}
function Ys(e, t, n = 1, r) {
	let i = e.doc.resolve(t), a = q.empty, o = q.empty;
	for (let e = i.depth, t = i.depth - n, s = n - 1; e > t; e--, s--) {
		a = q.from(i.node(e).copy(a));
		let t = r && r[s];
		o = q.from(t ? t.type.create(t.attrs, o) : i.node(e).copy(o));
	}
	e.step(new ks(t, t, new J(a.append(o), n, n), !0));
}
function Xs(e, t) {
	let n = e.resolve(t), r = n.index();
	return Qs(n.nodeBefore, n.nodeAfter) && n.parent.canReplace(r, r + 1);
}
function Zs(e, t) {
	t.content.size || e.type.compatibleContent(t.type);
	let n = e.contentMatchAt(e.childCount), { linebreakReplacement: r } = e.type.schema;
	for (let i = 0; i < t.childCount; i++) {
		let a = t.child(i), o = a.type == r ? e.type.schema.nodes.text : a.type;
		if (n = n.matchType(o), !n || !e.type.allowsMarks(a.marks)) return !1;
	}
	return n.validEnd;
}
function Qs(e, t) {
	return !!(e && t && !e.isLeaf && Zs(e, t));
}
function $s(e, t, n = -1) {
	let r = e.resolve(t);
	for (let e = r.depth;; e--) {
		let i, a, o = r.index(e);
		if (e == r.depth ? (i = r.nodeBefore, a = r.nodeAfter) : n > 0 ? (i = r.node(e + 1), o++, a = r.node(e).maybeChild(o)) : (i = r.node(e).maybeChild(o - 1), a = r.node(e + 1)), i && !i.isTextblock && Qs(i, a) && r.node(e).canReplace(o, o + 1)) return t;
		if (e == 0) break;
		t = n < 0 ? r.before(e) : r.after(e);
	}
}
function ec(e, t, n) {
	let r = null, { linebreakReplacement: i } = e.doc.type.schema, a = e.doc.resolve(t - n), o = a.node().type;
	if (i && o.inlineContent) {
		let e = o.whitespace == "pre", t = !!o.contentMatch.matchType(i);
		e && !t ? r = !1 : !e && t && (r = !0);
	}
	let s = e.steps.length;
	if (r === !1) {
		let r = e.doc.resolve(t + n);
		Gs(e, r.node(), r.before(), s);
	}
	o.inlineContent && Ps(e, t + n - 1, o, a.node().contentMatchAt(a.index()), r == null);
	let c = e.mapping.slice(s), l = c.map(t - n);
	if (e.step(new ks(l, c.map(t + n, -1), J.empty, !0)), r === !0) {
		let t = e.doc.resolve(l);
		Ws(e, t.node(), t.before(), e.steps.length);
	}
	return e;
}
function tc(e, t, n) {
	let r = e.resolve(t);
	if (r.parent.canReplaceWith(r.index(), r.index(), n)) return t;
	if (r.parentOffset == 0) for (let e = r.depth - 1; e >= 0; e--) {
		let t = r.index(e);
		if (r.node(e).canReplaceWith(t, t, n)) return r.before(e + 1);
		if (t > 0) return null;
	}
	if (r.parentOffset == r.parent.content.size) for (let e = r.depth - 1; e >= 0; e--) {
		let t = r.indexAfter(e);
		if (r.node(e).canReplaceWith(t, t, n)) return r.after(e + 1);
		if (t < r.node(e).childCount) return null;
	}
	return null;
}
function nc(e, t, n) {
	let r = e.resolve(t);
	if (!n.content.size) return t;
	let i = n.content;
	for (let e = 0; e < n.openStart; e++) i = i.firstChild.content;
	for (let e = 1; e <= (n.openStart == 0 && n.size ? 2 : 1); e++) for (let t = r.depth; t >= 0; t--) {
		let n = t == r.depth ? 0 : r.pos <= (r.start(t + 1) + r.end(t + 1)) / 2 ? -1 : 1, a = r.index(t) + +(n > 0), o = r.node(t), s = !1;
		if (e == 1) s = o.canReplace(a, a, i);
		else {
			let e = o.contentMatchAt(a).findWrapping(i.firstChild.type);
			s = e && o.canReplaceWith(a, a, e[0]);
		}
		if (s) return n == 0 ? r.pos : n < 0 ? r.before(t + 1) : r.after(t + 1);
	}
	return null;
}
function rc(e, t, n = t, r = J.empty) {
	if (t == n && !r.size) return null;
	let i = e.resolve(t), a = e.resolve(n);
	return ic(i, a, r) ? new ks(t, n, r) : new ac(i, a, r).fit();
}
function ic(e, t, n) {
	return !n.openStart && !n.openEnd && e.start() == t.start() && e.parent.canReplace(e.index(), t.index(), n.content);
}
var ac = class {
	constructor(e, t, n) {
		this.$from = e, this.$to = t, this.unplaced = n, this.frontier = [], this.placed = q.empty;
		for (let t = 0; t <= e.depth; t++) {
			let n = e.node(t);
			this.frontier.push({
				type: n.type,
				match: n.contentMatchAt(e.indexAfter(t))
			});
		}
		for (let t = e.depth; t > 0; t--) this.placed = q.from(e.node(t).copy(this.placed));
	}
	get depth() {
		return this.frontier.length - 1;
	}
	fit() {
		for (; this.unplaced.size;) {
			let e = this.findFittable();
			e ? this.placeNodes(e) : this.openMore() || this.dropNode();
		}
		let e = this.mustMoveInline(), t = this.placed.size - this.depth - this.$from.depth, n = this.$from, r = this.close(e < 0 ? this.$to : n.doc.resolve(e));
		if (!r) return null;
		let i = this.placed, a = n.depth, o = r.depth;
		for (; a && o && i.childCount == 1;) i = i.firstChild.content, a--, o--;
		let s = new J(i, a, o);
		return e > -1 ? new As(n.pos, e, this.$to.pos, this.$to.end(), s, t) : s.size || n.pos != this.$to.pos ? new ks(n.pos, r.pos, s) : null;
	}
	findFittable() {
		let e = this.unplaced.openStart;
		for (let t = this.unplaced.content, n = 0, r = this.unplaced.openEnd; n < e; n++) {
			let i = t.firstChild;
			if (t.childCount > 1 && (r = 0), i.type.spec.isolating && r <= n) {
				e = n;
				break;
			}
			t = i.content;
		}
		for (let t = 1; t <= 2; t++) for (let n = t == 1 ? e : this.unplaced.openStart; n >= 0; n--) {
			let e, r = null;
			n ? (r = cc(this.unplaced.content, n - 1).firstChild, e = r.content) : e = this.unplaced.content;
			let i = e.firstChild;
			for (let e = this.depth; e >= 0; e--) {
				let { type: a, match: o } = this.frontier[e], s, c = null;
				if (t == 1 && (i ? o.matchType(i.type) || (c = o.fillBefore(q.from(i), !1)) : r && a.compatibleContent(r.type))) return {
					sliceDepth: n,
					frontierDepth: e,
					parent: r,
					inject: c
				};
				if (t == 2 && i && (s = o.findWrapping(i.type))) return {
					sliceDepth: n,
					frontierDepth: e,
					parent: r,
					wrap: s
				};
				if (r && o.matchType(r.type)) break;
			}
		}
	}
	openMore() {
		let { content: e, openStart: t, openEnd: n } = this.unplaced, r = cc(e, t);
		return !r.childCount || r.firstChild.isLeaf ? !1 : (this.unplaced = new J(e, t + 1, Math.max(n, r.size + t >= e.size - n ? t + 1 : 0)), !0);
	}
	dropNode() {
		let { content: e, openStart: t, openEnd: n } = this.unplaced, r = cc(e, t);
		if (r.childCount <= 1 && t > 0) {
			let i = e.size - t <= t + r.size;
			this.unplaced = new J(oc(e, t - 1, 1), t - 1, i ? t - 1 : n);
		} else this.unplaced = new J(oc(e, t, 1), t, n);
	}
	placeNodes({ sliceDepth: e, frontierDepth: t, parent: n, inject: r, wrap: i }) {
		for (; this.depth > t;) this.closeFrontierNode();
		if (i) for (let e = 0; e < i.length; e++) this.openFrontierNode(i[e]);
		let a = this.unplaced, o = n ? n.content : a.content, s = a.openStart - e, c = 0, l = [], { match: u, type: d } = this.frontier[t];
		if (r) {
			for (let e = 0; e < r.childCount; e++) l.push(r.child(e));
			u = u.matchFragment(r);
		}
		let f = o.size + e - (a.content.size - a.openEnd);
		for (; c < o.childCount;) {
			let e = o.child(c), t = u.matchType(e.type);
			if (!t) break;
			c++, (c > 1 || s == 0 || e.content.size) && (u = t, l.push(lc(e.mark(d.allowedMarks(e.marks)), c == 1 ? s : 0, c == o.childCount ? f : -1)));
		}
		let p = c == o.childCount;
		p || (f = -1), this.placed = sc(this.placed, t, q.from(l)), this.frontier[t].match = u, p && f < 0 && n && n.type == this.frontier[this.depth].type && this.frontier.length > 1 && this.closeFrontierNode();
		for (let e = 0, t = o; e < f; e++) {
			let e = t.lastChild;
			this.frontier.push({
				type: e.type,
				match: e.contentMatchAt(e.childCount)
			}), t = e.content;
		}
		this.unplaced = p ? e == 0 ? J.empty : new J(oc(a.content, e - 1, 1), e - 1, f < 0 ? a.openEnd : e - 1) : new J(oc(a.content, e, c), a.openStart, a.openEnd);
	}
	mustMoveInline() {
		if (!this.$to.parent.isTextblock) return -1;
		let e = this.frontier[this.depth], t;
		if (!e.type.isTextblock || !uc(this.$to, this.$to.depth, e.type, e.match, !1) || this.$to.depth == this.depth && (t = this.findCloseLevel(this.$to)) && t.depth == this.depth) return -1;
		let { depth: n } = this.$to, r = this.$to.after(n);
		for (; n > 1 && r == this.$to.end(--n);) ++r;
		return r;
	}
	findCloseLevel(e) {
		scan: for (let t = Math.min(this.depth, e.depth); t >= 0; t--) {
			let { match: n, type: r } = this.frontier[t], i = t < e.depth && e.end(t + 1) == e.pos + (e.depth - (t + 1)), a = uc(e, t, r, n, i);
			if (a) {
				for (let n = t - 1; n >= 0; n--) {
					let { match: t, type: r } = this.frontier[n], i = uc(e, n, r, t, !0);
					if (!i || i.childCount) continue scan;
				}
				return {
					depth: t,
					fit: a,
					move: i ? e.doc.resolve(e.after(t + 1)) : e
				};
			}
		}
	}
	close(e) {
		let t = this.findCloseLevel(e);
		if (!t) return null;
		for (; this.depth > t.depth;) this.closeFrontierNode();
		t.fit.childCount && (this.placed = sc(this.placed, t.depth, t.fit)), e = t.move;
		for (let n = t.depth + 1; n <= e.depth; n++) {
			let t = e.node(n), r = t.type.contentMatch.fillBefore(t.content, !0, e.index(n));
			this.openFrontierNode(t.type, t.attrs, r);
		}
		return e;
	}
	openFrontierNode(e, t = null, n) {
		let r = this.frontier[this.depth];
		r.match = r.match.matchType(e), this.placed = sc(this.placed, this.depth, q.from(e.create(t, n))), this.frontier.push({
			type: e,
			match: e.contentMatch
		});
	}
	closeFrontierNode() {
		let e = this.frontier.pop().match.fillBefore(q.empty, !0);
		e.childCount && (this.placed = sc(this.placed, this.frontier.length, e));
	}
};
function oc(e, t, n) {
	return t == 0 ? e.cutByIndex(n, e.childCount) : e.replaceChild(0, e.firstChild.copy(oc(e.firstChild.content, t - 1, n)));
}
function sc(e, t, n) {
	return t == 0 ? e.append(n) : e.replaceChild(e.childCount - 1, e.lastChild.copy(sc(e.lastChild.content, t - 1, n)));
}
function cc(e, t) {
	for (let n = 0; n < t; n++) e = e.firstChild.content;
	return e;
}
function lc(e, t, n) {
	if (t <= 0) return e;
	let r = e.content;
	return t > 1 && (r = r.replaceChild(0, lc(r.firstChild, t - 1, r.childCount == 1 ? n - 1 : 0))), t > 0 && (r = e.type.contentMatch.fillBefore(r).append(r), n <= 0 && (r = r.append(e.type.contentMatch.matchFragment(r).fillBefore(q.empty, !0)))), e.copy(r);
}
function uc(e, t, n, r, i) {
	let a = e.node(t), o = i ? e.indexAfter(t) : e.index(t);
	if (o == a.childCount && !n.compatibleContent(a.type)) return null;
	let s = r.fillBefore(a.content, !0, o);
	return s && !dc(n, a.content, o) ? s : null;
}
function dc(e, t, n) {
	for (let r = n; r < t.childCount; r++) if (!e.allowsMarks(t.child(r).marks)) return !0;
	return !1;
}
function fc(e) {
	return e.spec.defining || e.spec.definingForContent;
}
function pc(e, t, n, r) {
	if (!r.size) return e.deleteRange(t, n);
	let i = e.doc.resolve(t), a = e.doc.resolve(n);
	if (ic(i, a, r)) return e.step(new ks(t, n, r));
	let o = _c(i, a);
	o[o.length - 1] == 0 && o.pop();
	let s = -(i.depth + 1);
	o.unshift(s);
	for (let e = i.depth, t = i.pos - 1; e > 0; e--, t--) {
		let n = i.node(e).type.spec;
		if (n.defining || n.definingAsContext || n.isolating) break;
		o.indexOf(e) > -1 ? s = e : i.before(e) == t && o.splice(1, 0, -e);
	}
	let c = o.indexOf(s), l = [], u = r.openStart;
	for (let e = r.content, t = 0;; t++) {
		let n = e.firstChild;
		if (l.push(n), t == r.openStart) break;
		e = n.content;
	}
	for (let e = u - 1; e >= 0; e--) {
		let t = l[e], n = fc(t.type);
		if (n && !t.sameMarkup(i.node(Math.abs(s) - 1))) u = e;
		else if (n || !t.type.isTextblock) break;
	}
	for (let t = r.openStart; t >= 0; t--) {
		let s = (t + u + 1) % (r.openStart + 1), d = l[s];
		if (d) for (let t = 0; t < o.length; t++) {
			let l = o[(t + c) % o.length], u = !0;
			l < 0 && (u = !1, l = -l);
			let f = i.node(l - 1), p = i.index(l - 1);
			if (f.canReplaceWith(p, p, d.type, d.marks)) return e.replace(i.before(l), u ? a.after(l) : n, new J(mc(r.content, 0, r.openStart, s), s, r.openEnd));
		}
	}
	let d = e.steps.length;
	for (let s = o.length - 1; s >= 0 && (e.replace(t, n, r), !(e.steps.length > d)); s--) {
		let e = o[s];
		e < 0 || (t = i.before(e), n = a.after(e));
	}
}
function mc(e, t, n, r, i) {
	if (t < n) {
		let i = e.firstChild;
		e = e.replaceChild(0, i.copy(mc(i.content, t + 1, n, r, i)));
	}
	if (t > r) {
		let t = i.contentMatchAt(0), n = t.fillBefore(e).append(e);
		e = n.append(t.matchFragment(n).fillBefore(q.empty, !0));
	}
	return e;
}
function hc(e, t, n, r) {
	if (!r.isInline && t == n && e.doc.resolve(t).parent.content.size) {
		let i = tc(e.doc, t, r.type);
		i != null && (t = n = i);
	}
	e.replaceRange(t, n, new J(q.from(r), 0, 0));
}
function gc(e, t, n) {
	let r = e.doc.resolve(t), i = e.doc.resolve(n);
	if (r.parent.isTextblock && i.parent.isTextblock && r.start() != i.start() && r.parentOffset == 0 && i.parentOffset == 0) {
		let a = r.sharedDepth(n), o = !1;
		for (let e = r.depth; e > a; e--) r.node(e).type.spec.isolating && (o = !0);
		for (let e = i.depth; e > a; e--) i.node(e).type.spec.isolating && (o = !0);
		if (!o) {
			for (let e = r.depth; e > 0 && t == r.start(e); e--) t = r.before(e);
			for (let e = i.depth; e > 0 && n == i.start(e); e--) n = i.before(e);
			r = e.doc.resolve(t), i = e.doc.resolve(n);
		}
	}
	let a = _c(r, i);
	for (let t = 0; t < a.length; t++) {
		let n = a[t], o = t == a.length - 1;
		if (o && n == 0 || r.node(n).type.contentMatch.validEnd) return e.delete(r.start(n), i.end(n));
		if (n > 0 && (o || r.node(n - 1).canReplace(r.index(n - 1), i.indexAfter(n - 1)))) return e.delete(r.before(n), i.after(n));
	}
	for (let a = 1; a <= r.depth && a <= i.depth; a++) if (t - r.start(a) == r.depth - a && n > r.end(a) && i.end(a) - n != i.depth - a && r.start(a - 1) == i.start(a - 1) && r.node(a - 1).canReplace(r.index(a - 1), i.index(a - 1))) return e.delete(r.before(a), n);
	e.delete(t, n);
}
function _c(e, t) {
	let n = [], r = Math.min(e.depth, t.depth);
	for (let i = r; i >= 0; i--) {
		let r = e.start(i);
		if (r < e.pos - (e.depth - i) || t.end(i) > t.pos + (t.depth - i) || e.node(i).type.spec.isolating || t.node(i).type.spec.isolating) break;
		(r == t.start(i) || i == e.depth && i == t.depth && e.parent.inlineContent && t.parent.inlineContent && i && t.start(i - 1) == r - 1) && n.push(i);
	}
	return n;
}
var vc = class e extends Ss {
	constructor(e, t, n) {
		super(), this.pos = e, this.attr = t, this.value = n;
	}
	apply(e) {
		let t = e.nodeAt(this.pos);
		if (!t) return Cs.fail("No node at attribute step's position");
		let n = Object.create(null);
		for (let e in t.attrs) n[e] = t.attrs[e];
		n[this.attr] = this.value;
		let r = t.type.create(n, null, t.marks);
		return Cs.fromReplace(e, this.pos, this.pos + 1, new J(q.from(r), 0, +!t.isLeaf));
	}
	getMap() {
		return ys.empty;
	}
	invert(t) {
		return new e(this.pos, this.attr, t.nodeAt(this.pos).attrs[this.attr]);
	}
	map(t) {
		let n = t.mapResult(this.pos, 1);
		return n.deletedAfter ? null : new e(n.pos, this.attr, this.value);
	}
	toJSON() {
		return {
			stepType: "attr",
			pos: this.pos,
			attr: this.attr,
			value: this.value
		};
	}
	static fromJSON(t, n) {
		if (typeof n.pos != "number" || typeof n.attr != "string") throw RangeError("Invalid input for AttrStep.fromJSON");
		return new e(n.pos, n.attr, n.value);
	}
};
Ss.jsonID("attr", vc);
var yc = class e extends Ss {
	constructor(e, t) {
		super(), this.attr = e, this.value = t;
	}
	apply(e) {
		let t = Object.create(null);
		for (let n in e.attrs) t[n] = e.attrs[n];
		t[this.attr] = this.value;
		let n = e.type.create(t, e.content, e.marks);
		return Cs.ok(n);
	}
	getMap() {
		return ys.empty;
	}
	invert(t) {
		return new e(this.attr, t.attrs[this.attr]);
	}
	map(e) {
		return this;
	}
	toJSON() {
		return {
			stepType: "docAttr",
			attr: this.attr,
			value: this.value
		};
	}
	static fromJSON(t, n) {
		if (typeof n.attr != "string") throw RangeError("Invalid input for DocAttrStep.fromJSON");
		return new e(n.attr, n.value);
	}
};
Ss.jsonID("docAttr", yc);
var bc = class extends Error {};
bc = function e(t) {
	let n = Error.call(this, t);
	return n.__proto__ = e.prototype, n;
}, bc.prototype = Object.create(Error.prototype), bc.prototype.constructor = bc, bc.prototype.name = "TransformError";
var xc = class {
	constructor(e) {
		this.doc = e, this.steps = [], this.docs = [], this.mapping = new bs();
	}
	get before() {
		return this.docs.length ? this.docs[0] : this.doc;
	}
	step(e) {
		let t = this.maybeStep(e);
		if (t.failed) throw new bc(t.failed);
		return this;
	}
	maybeStep(e) {
		let t = e.apply(this.doc);
		return t.failed || this.addStep(e, t.doc), t;
	}
	get docChanged() {
		return this.steps.length > 0;
	}
	changedRange() {
		let e = 1e9, t = -1e9;
		for (let n = 0; n < this.mapping.maps.length; n++) {
			let r = this.mapping.maps[n];
			n && (e = r.map(e, 1), t = r.map(t, -1)), r.forEach((n, r, i, a) => {
				e = Math.min(e, i), t = Math.max(t, a);
			});
		}
		return e == 1e9 ? null : {
			from: e,
			to: t
		};
	}
	addStep(e, t) {
		this.docs.push(this.doc), this.steps.push(e), this.mapping.appendMap(e.getMap()), this.doc = t;
	}
	replace(e, t = e, n = J.empty) {
		let r = rc(this.doc, e, t, n);
		return r && this.step(r), this;
	}
	replaceWith(e, t, n) {
		return this.replace(e, t, new J(q.from(n), 0, 0));
	}
	delete(e, t) {
		return this.replace(e, t, J.empty);
	}
	insert(e, t) {
		return this.replaceWith(e, e, t);
	}
	replaceRange(e, t, n) {
		return pc(this, e, t, n), this;
	}
	replaceRangeWith(e, t, n) {
		return hc(this, e, t, n), this;
	}
	deleteRange(e, t) {
		return gc(this, e, t), this;
	}
	lift(e, t) {
		return Ls(this, e, t), this;
	}
	join(e, t = 1) {
		return ec(this, e, t), this;
	}
	wrap(e, t) {
		return Hs(this, e, t), this;
	}
	setBlockType(e, t = e, n, r = null) {
		return Us(this, e, t, n, r), this;
	}
	setNodeMarkup(e, t, n = null, r) {
		return qs(this, e, t, n, r), this;
	}
	setNodeAttribute(e, t, n) {
		return this.step(new vc(e, t, n)), this;
	}
	setDocAttribute(e, t) {
		return this.step(new yc(e, t)), this;
	}
	addNodeMark(e, t) {
		return this.step(new Ds(e, t)), this;
	}
	removeNodeMark(e, t) {
		let n = this.doc.nodeAt(e);
		if (!n) throw RangeError("No node at position " + e);
		if (t instanceof Ga) t.isInSet(n.marks) && this.step(new Os(e, t));
		else {
			let r = n.marks, i, a = [];
			for (; i = t.isInSet(r);) a.push(new Os(e, i)), r = i.removeFromSet(r);
			for (let e = a.length - 1; e >= 0; e--) this.step(a[e]);
		}
		return this;
	}
	split(e, t = 1, n) {
		return Ys(this, e, t, n), this;
	}
	addMark(e, t, n) {
		return Ms(this, e, t, n), this;
	}
	removeMark(e, t, n) {
		return Ns(this, e, t, n), this;
	}
	clearIncompatible(e, t, n) {
		return Ps(this, e, t, n), this;
	}
}, Sc = Object.create(null), Y = class {
	constructor(e, t, n) {
		this.$anchor = e, this.$head = t, this.ranges = n || [new Cc(e.min(t), e.max(t))];
	}
	get anchor() {
		return this.$anchor.pos;
	}
	get head() {
		return this.$head.pos;
	}
	get from() {
		return this.$from.pos;
	}
	get to() {
		return this.$to.pos;
	}
	get $from() {
		return this.ranges[0].$from;
	}
	get $to() {
		return this.ranges[0].$to;
	}
	get empty() {
		let e = this.ranges;
		for (let t = 0; t < e.length; t++) if (e[t].$from.pos != e[t].$to.pos) return !1;
		return !0;
	}
	content() {
		return this.$from.doc.slice(this.from, this.to, !0);
	}
	replace(e, t = J.empty) {
		let n = t.content.lastChild, r = null;
		for (let e = 0; e < t.openEnd; e++) r = n, n = n.lastChild;
		let i = e.steps.length, a = this.ranges;
		for (let o = 0; o < a.length; o++) {
			let { $from: s, $to: c } = a[o], l = e.mapping.slice(i);
			e.replaceRange(l.map(s.pos), l.map(c.pos), o ? J.empty : t), o == 0 && jc(e, i, (n ? n.isInline : r && r.isTextblock) ? -1 : 1);
		}
	}
	replaceWith(e, t) {
		let n = e.steps.length, r = this.ranges;
		for (let i = 0; i < r.length; i++) {
			let { $from: a, $to: o } = r[i], s = e.mapping.slice(n), c = s.map(a.pos), l = s.map(o.pos);
			i ? e.deleteRange(c, l) : (e.replaceRangeWith(c, l, t), jc(e, n, t.isInline ? -1 : 1));
		}
	}
	static findFrom(e, t, n = !1) {
		let r = e.parent.inlineContent ? new X(e) : Ac(e.node(0), e.parent, e.pos, e.index(), t, n);
		if (r) return r;
		for (let r = e.depth - 1; r >= 0; r--) {
			let i = t < 0 ? Ac(e.node(0), e.node(r), e.before(r + 1), e.index(r), t, n) : Ac(e.node(0), e.node(r), e.after(r + 1), e.index(r) + 1, t, n);
			if (i) return i;
		}
		return null;
	}
	static near(e, t = 1) {
		return this.findFrom(e, t) || this.findFrom(e, -t) || new Oc(e.node(0));
	}
	static atStart(e) {
		return Ac(e, e, 0, 0, 1) || new Oc(e);
	}
	static atEnd(e) {
		return Ac(e, e, e.content.size, e.childCount, -1) || new Oc(e);
	}
	static fromJSON(e, t) {
		if (!t || !t.type) throw RangeError("Invalid input for Selection.fromJSON");
		let n = Sc[t.type];
		if (!n) throw RangeError(`No selection type ${t.type} defined`);
		return n.fromJSON(e, t);
	}
	static jsonID(e, t) {
		if (e in Sc) throw RangeError("Duplicate use of selection JSON ID " + e);
		return Sc[e] = t, t.prototype.jsonID = e, t;
	}
	getBookmark() {
		return X.between(this.$anchor, this.$head).getBookmark();
	}
};
Y.prototype.visible = !0;
var Cc = class {
	constructor(e, t) {
		this.$from = e, this.$to = t;
	}
}, wc = !1;
function Tc(e) {
	!wc && !e.parent.inlineContent && (wc = !0, console.warn("TextSelection endpoint not pointing into a node with inline content (" + e.parent.type.name + ")"));
}
var X = class e extends Y {
	constructor(e, t = e) {
		Tc(e), Tc(t), super(e, t);
	}
	get $cursor() {
		return this.$anchor.pos == this.$head.pos ? this.$head : null;
	}
	map(t, n) {
		let r = t.resolve(n.map(this.head));
		if (!r.parent.inlineContent) return Y.near(r);
		let i = t.resolve(n.map(this.anchor));
		return new e(i.parent.inlineContent ? i : r, r);
	}
	replace(e, t = J.empty) {
		if (super.replace(e, t), t == J.empty) {
			let t = this.$from.marksAcross(this.$to);
			t && e.ensureMarks(t);
		}
	}
	eq(t) {
		return t instanceof e && t.anchor == this.anchor && t.head == this.head;
	}
	getBookmark() {
		return new Ec(this.anchor, this.head);
	}
	toJSON() {
		return {
			type: "text",
			anchor: this.anchor,
			head: this.head
		};
	}
	static fromJSON(t, n) {
		if (typeof n.anchor != "number" || typeof n.head != "number") throw RangeError("Invalid input for TextSelection.fromJSON");
		return new e(t.resolve(n.anchor), t.resolve(n.head));
	}
	static create(e, t, n = t) {
		let r = e.resolve(t);
		return new this(r, n == t ? r : e.resolve(n));
	}
	static between(t, n, r) {
		let i = t.pos - n.pos;
		if ((!r || i) && (r = i >= 0 ? 1 : -1), !n.parent.inlineContent) {
			let e = Y.findFrom(n, r, !0) || Y.findFrom(n, -r, !0);
			if (e) n = e.$head;
			else return Y.near(n, r);
		}
		return t.parent.inlineContent || (i == 0 ? t = n : (t = (Y.findFrom(t, -r, !0) || Y.findFrom(t, r, !0)).$anchor, t.pos < n.pos != i < 0 && (t = n))), new e(t, n);
	}
};
Y.jsonID("text", X);
var Ec = class e {
	constructor(e, t) {
		this.anchor = e, this.head = t;
	}
	map(t) {
		return new e(t.map(this.anchor), t.map(this.head));
	}
	resolve(e) {
		return X.between(e.resolve(this.anchor), e.resolve(this.head));
	}
}, Z = class e extends Y {
	constructor(e) {
		let t = e.nodeAfter, n = e.node(0).resolve(e.pos + t.nodeSize);
		super(e, n), this.node = t;
	}
	map(t, n) {
		let { deleted: r, pos: i } = n.mapResult(this.anchor), a = t.resolve(i);
		return r ? Y.near(a) : new e(a);
	}
	content() {
		return new J(q.from(this.node), 0, 0);
	}
	eq(t) {
		return t instanceof e && t.anchor == this.anchor;
	}
	toJSON() {
		return {
			type: "node",
			anchor: this.anchor
		};
	}
	getBookmark() {
		return new Dc(this.anchor);
	}
	static fromJSON(t, n) {
		if (typeof n.anchor != "number") throw RangeError("Invalid input for NodeSelection.fromJSON");
		return new e(t.resolve(n.anchor));
	}
	static create(t, n) {
		return new e(t.resolve(n));
	}
	static isSelectable(e) {
		return !e.isText && e.type.spec.selectable !== !1;
	}
};
Z.prototype.visible = !1, Y.jsonID("node", Z);
var Dc = class e {
	constructor(e) {
		this.anchor = e;
	}
	map(t) {
		let { deleted: n, pos: r } = t.mapResult(this.anchor);
		return n ? new Ec(r, r) : new e(r);
	}
	resolve(e) {
		let t = e.resolve(this.anchor), n = t.nodeAfter;
		return n && Z.isSelectable(n) ? new Z(t) : Y.near(t);
	}
}, Oc = class e extends Y {
	constructor(e) {
		super(e.resolve(0), e.resolve(e.content.size));
	}
	replace(e, t = J.empty) {
		if (t == J.empty) {
			e.delete(0, e.doc.content.size);
			let t = Y.atStart(e.doc);
			t.eq(e.selection) || e.setSelection(t);
		} else super.replace(e, t);
	}
	toJSON() {
		return { type: "all" };
	}
	static fromJSON(t) {
		return new e(t);
	}
	map(t) {
		return new e(t);
	}
	eq(t) {
		return t instanceof e;
	}
	getBookmark() {
		return kc;
	}
};
Y.jsonID("all", Oc);
var kc = {
	map() {
		return this;
	},
	resolve(e) {
		return new Oc(e);
	}
};
function Ac(e, t, n, r, i, a = !1) {
	if (t.inlineContent) return X.create(e, n);
	for (let o = r - (i > 0 ? 0 : 1); i > 0 ? o < t.childCount : o >= 0; o += i) {
		let r = t.child(o);
		if (!r.isAtom) {
			let t = Ac(e, r, n + i, i < 0 ? r.childCount : 0, i, a);
			if (t) return t;
		} else if (!a && Z.isSelectable(r)) return Z.create(e, n - (i < 0 ? r.nodeSize : 0));
		n += r.nodeSize * i;
	}
	return null;
}
function jc(e, t, n) {
	let r = e.steps.length - 1;
	if (r < t) return;
	let i = e.steps[r];
	if (!(i instanceof ks || i instanceof As)) return;
	let a = e.mapping.maps[r], o;
	a.forEach((e, t, n, r) => {
		o ??= r;
	}), e.setSelection(Y.near(e.doc.resolve(o), n));
}
var Mc = 1, Nc = 2, Pc = 4, Fc = class extends xc {
	constructor(e) {
		super(e.doc), this.curSelectionFor = 0, this.updated = 0, this.meta = Object.create(null), this.time = Date.now(), this.curSelection = e.selection, this.storedMarks = e.storedMarks;
	}
	get selection() {
		return this.curSelectionFor < this.steps.length && (this.curSelection = this.curSelection.map(this.doc, this.mapping.slice(this.curSelectionFor)), this.curSelectionFor = this.steps.length), this.curSelection;
	}
	setSelection(e) {
		if (e.$from.doc != this.doc) throw RangeError("Selection passed to setSelection must point at the current document");
		return this.curSelection = e, this.curSelectionFor = this.steps.length, this.updated = (this.updated | Mc) & ~Nc, this.storedMarks = null, this;
	}
	get selectionSet() {
		return (this.updated & Mc) > 0;
	}
	setStoredMarks(e) {
		return this.storedMarks = e, this.updated |= Nc, this;
	}
	ensureMarks(e) {
		return Ga.sameSet(this.storedMarks || this.selection.$from.marks(), e) || this.setStoredMarks(e), this;
	}
	addStoredMark(e) {
		return this.ensureMarks(e.addToSet(this.storedMarks || this.selection.$head.marks()));
	}
	removeStoredMark(e) {
		return this.ensureMarks(e.removeFromSet(this.storedMarks || this.selection.$head.marks()));
	}
	get storedMarksSet() {
		return (this.updated & Nc) > 0;
	}
	addStep(e, t) {
		super.addStep(e, t), this.updated &= ~Nc, this.storedMarks = null;
	}
	setTime(e) {
		return this.time = e, this;
	}
	replaceSelection(e) {
		return this.selection.replace(this, e), this;
	}
	replaceSelectionWith(e, t = !0) {
		let n = this.selection;
		return t && (e = e.mark(this.storedMarks || (n.empty ? n.$from.marks() : n.$from.marksAcross(n.$to) || Ga.none))), n.replaceWith(this, e), this;
	}
	deleteSelection() {
		return this.selection.replace(this), this;
	}
	insertText(e, t, n) {
		let r = this.doc.type.schema;
		if (t == null) return e ? this.replaceSelectionWith(r.text(e), !0) : this.deleteSelection();
		{
			if (n ??= t, !e) return this.deleteRange(t, n);
			let i = this.storedMarks;
			if (!i) {
				let e = this.doc.resolve(t);
				i = n == t ? e.marks() : e.marksAcross(this.doc.resolve(n));
			}
			return this.replaceRangeWith(t, n, r.text(e, i)), !this.selection.empty && this.selection.to == t + e.length && this.setSelection(Y.near(this.selection.$to)), this;
		}
	}
	setMeta(e, t) {
		return this.meta[typeof e == "string" ? e : e.key] = t, this;
	}
	getMeta(e) {
		return this.meta[typeof e == "string" ? e : e.key];
	}
	get isGeneric() {
		for (let e in this.meta) return !1;
		return !0;
	}
	scrollIntoView() {
		return this.updated |= Pc, this;
	}
	get scrolledIntoView() {
		return (this.updated & Pc) > 0;
	}
};
function Ic(e, t) {
	return !t || !e ? e : e.bind(t);
}
var Lc = class {
	constructor(e, t, n) {
		this.name = e, this.init = Ic(t.init, n), this.apply = Ic(t.apply, n);
	}
}, Rc = [
	new Lc("doc", {
		init(e) {
			return e.doc || e.schema.topNodeType.createAndFill();
		},
		apply(e) {
			return e.doc;
		}
	}),
	new Lc("selection", {
		init(e, t) {
			return e.selection || Y.atStart(t.doc);
		},
		apply(e) {
			return e.selection;
		}
	}),
	new Lc("storedMarks", {
		init(e) {
			return e.storedMarks || null;
		},
		apply(e, t, n, r) {
			return r.selection.$cursor ? e.storedMarks : null;
		}
	}),
	new Lc("scrollToSelection", {
		init() {
			return 0;
		},
		apply(e, t) {
			return e.scrolledIntoView ? t + 1 : t;
		}
	})
], zc = class {
	constructor(e, t) {
		this.schema = e, this.plugins = [], this.pluginsByKey = Object.create(null), this.fields = Rc.slice(), t && t.forEach((e) => {
			if (this.pluginsByKey[e.key]) throw RangeError("Adding different instances of a keyed plugin (" + e.key + ")");
			this.plugins.push(e), this.pluginsByKey[e.key] = e, e.spec.state && this.fields.push(new Lc(e.key, e.spec.state, e));
		});
	}
}, Bc = class e {
	constructor(e) {
		this.config = e;
	}
	get schema() {
		return this.config.schema;
	}
	get plugins() {
		return this.config.plugins;
	}
	apply(e) {
		return this.applyTransaction(e).state;
	}
	filterTransaction(e, t = -1) {
		for (let n = 0; n < this.config.plugins.length; n++) if (n != t) {
			let t = this.config.plugins[n];
			if (t.spec.filterTransaction && !t.spec.filterTransaction.call(t, e, this)) return !1;
		}
		return !0;
	}
	applyTransaction(e) {
		if (!this.filterTransaction(e)) return {
			state: this,
			transactions: []
		};
		let t = [e], n = this.applyInner(e), r = null;
		for (;;) {
			let i = !1;
			for (let a = 0; a < this.config.plugins.length; a++) {
				let o = this.config.plugins[a];
				if (o.spec.appendTransaction) {
					let s = r ? r[a].n : 0, c = r ? r[a].state : this, l = s < t.length && o.spec.appendTransaction.call(o, s ? t.slice(s) : t, c, n);
					if (l && n.filterTransaction(l, a)) {
						if (l.setMeta("appendedTransaction", e), !r) {
							r = [];
							for (let e = 0; e < this.config.plugins.length; e++) r.push(e < a ? {
								state: n,
								n: t.length
							} : {
								state: this,
								n: 0
							});
						}
						t.push(l), n = n.applyInner(l), i = !0;
					}
					r && (r[a] = {
						state: n,
						n: t.length
					});
				}
			}
			if (!i) return {
				state: n,
				transactions: t
			};
		}
	}
	applyInner(t) {
		if (!t.before.eq(this.doc)) throw RangeError("Applying a mismatched transaction");
		let n = new e(this.config), r = this.config.fields;
		for (let e = 0; e < r.length; e++) {
			let i = r[e];
			n[i.name] = i.apply(t, this[i.name], this, n);
		}
		return n;
	}
	get tr() {
		return new Fc(this);
	}
	static create(t) {
		let n = new zc(t.doc ? t.doc.type.schema : t.schema, t.plugins), r = new e(n);
		for (let e = 0; e < n.fields.length; e++) r[n.fields[e].name] = n.fields[e].init(t, r);
		return r;
	}
	reconfigure(t) {
		let n = new zc(this.schema, t.plugins), r = n.fields, i = new e(n);
		for (let e = 0; e < r.length; e++) {
			let n = r[e].name;
			i[n] = this.hasOwnProperty(n) ? this[n] : r[e].init(t, i);
		}
		return i;
	}
	toJSON(e) {
		let t = {
			doc: this.doc.toJSON(),
			selection: this.selection.toJSON()
		};
		if (this.storedMarks && (t.storedMarks = this.storedMarks.map((e) => e.toJSON())), e && typeof e == "object") for (let n in e) {
			if (n == "doc" || n == "selection") throw RangeError("The JSON fields `doc` and `selection` are reserved");
			let r = e[n], i = r.spec.state;
			i && i.toJSON && (t[n] = i.toJSON.call(r, this[r.key]));
		}
		return t;
	}
	static fromJSON(t, n, r) {
		if (!n) throw RangeError("Invalid input for EditorState.fromJSON");
		if (!t.schema) throw RangeError("Required config field 'schema' missing");
		let i = new zc(t.schema, t.plugins), a = new e(i);
		return i.fields.forEach((e) => {
			if (e.name == "doc") a.doc = fo.fromJSON(t.schema, n.doc);
			else if (e.name == "selection") a.selection = Y.fromJSON(a.doc, n.selection);
			else if (e.name == "storedMarks") n.storedMarks && (a.storedMarks = n.storedMarks.map(t.schema.markFromJSON));
			else {
				if (r) for (let i in r) {
					let o = r[i], s = o.spec.state;
					if (o.key == e.name && s && s.fromJSON && Object.prototype.hasOwnProperty.call(n, i)) {
						a[e.name] = s.fromJSON.call(o, t, n[i], a);
						return;
					}
				}
				a[e.name] = e.init(t, a);
			}
		}), a;
	}
};
function Vc(e, t, n) {
	for (let r in e) {
		let i = e[r];
		i instanceof Function ? i = i.bind(t) : r == "handleDOMEvents" && (i = Vc(i, t, {})), n[r] = i;
	}
	return n;
}
var Hc = class {
	constructor(e) {
		this.spec = e, this.props = {}, e.props && Vc(e.props, this, this.props), this.key = e.key ? e.key.key : Wc("plugin");
	}
	getState(e) {
		return e[this.key];
	}
}, Uc = Object.create(null);
function Wc(e) {
	return e in Uc ? e + "$" + ++Uc[e] : (Uc[e] = 0, e + "$");
}
var Gc = class {
	constructor(e = "key") {
		this.key = Wc(e);
	}
	get(e) {
		return e.config.pluginsByKey[this.key];
	}
	getState(e) {
		return e[this.key];
	}
}, Kc = function(e) {
	for (var t = 0;; t++) if (e = e.previousSibling, !e) return t;
}, qc = function(e) {
	let t = e.assignedSlot || e.parentNode;
	return t && t.nodeType == 11 ? t.host : t;
}, Jc = null, Yc = function(e, t, n) {
	let r = Jc ||= document.createRange();
	return r.setEnd(e, n ?? e.nodeValue.length), r.setStart(e, t || 0), r;
}, Xc = function() {
	Jc = null;
}, Zc = function(e, t, n, r) {
	return n && ($c(e, t, n, r, -1) || $c(e, t, n, r, 1));
}, Qc = /^(img|br|input|textarea|hr)$/i;
function $c(e, t, n, r, i) {
	for (;;) {
		if (e == n && t == r) return !0;
		if (t == (i < 0 ? 0 : el(e))) {
			let n = e.parentNode;
			if (!n || n.nodeType != 1 || il(e) || Qc.test(e.nodeName) || e.contentEditable == "false") return !1;
			t = Kc(e) + (i < 0 ? 0 : 1), e = n;
		} else if (e.nodeType == 1) {
			let n = e.childNodes[t + (i < 0 ? -1 : 0)];
			if (n.nodeType == 1 && n.contentEditable == "false") if (n.pmViewDesc?.ignoreForSelection) t += i;
			else return !1;
			else e = n, t = i < 0 ? el(e) : 0;
		} else return !1;
	}
}
function el(e) {
	return e.nodeType == 3 ? e.nodeValue.length : e.childNodes.length;
}
function tl(e, t) {
	for (;;) {
		if (e.nodeType == 3 && t) return e;
		if (e.nodeType == 1 && t > 0) {
			if (e.contentEditable == "false") return null;
			e = e.childNodes[t - 1], t = el(e);
		} else if (e.parentNode && !il(e)) t = Kc(e), e = e.parentNode;
		else return null;
	}
}
function nl(e, t) {
	for (;;) {
		if (e.nodeType == 3 && t < e.nodeValue.length) return e;
		if (e.nodeType == 1 && t < e.childNodes.length) {
			if (e.contentEditable == "false") return null;
			e = e.childNodes[t], t = 0;
		} else if (e.parentNode && !il(e)) t = Kc(e) + 1, e = e.parentNode;
		else return null;
	}
}
function rl(e, t, n) {
	for (let r = t == 0, i = t == el(e); r || i;) {
		if (e == n) return !0;
		let t = Kc(e);
		if (e = e.parentNode, !e) return !1;
		r &&= t == 0, i &&= t == el(e);
	}
}
function il(e) {
	let t;
	for (let n = e; n && !(t = n.pmViewDesc); n = n.parentNode);
	return t && t.node && t.node.isBlock && (t.dom == e || t.contentDOM == e);
}
var al = function(e) {
	return e.focusNode && Zc(e.focusNode, e.focusOffset, e.anchorNode, e.anchorOffset);
};
function ol(e, t) {
	let n = document.createEvent("Event");
	return n.initEvent("keydown", !0, !0), n.keyCode = e, n.key = n.code = t, n;
}
function sl(e) {
	let t = e.activeElement;
	for (; t && t.shadowRoot;) t = t.shadowRoot.activeElement;
	return t;
}
function cl(e, t, n) {
	if (e.caretPositionFromPoint) try {
		let r = e.caretPositionFromPoint(t, n);
		if (r) return {
			node: r.offsetNode,
			offset: Math.min(el(r.offsetNode), r.offset)
		};
	} catch {}
	if (e.caretRangeFromPoint) {
		let r = e.caretRangeFromPoint(t, n);
		if (r) return {
			node: r.startContainer,
			offset: Math.min(el(r.startContainer), r.startOffset)
		};
	}
}
var ll = typeof navigator < "u" ? navigator : null, ul = typeof document < "u" ? document : null, dl = ll && ll.userAgent || "", fl = /Edge\/(\d+)/.exec(dl), pl = /MSIE \d/.exec(dl), ml = /Trident\/(?:[7-9]|\d{2,})\..*rv:(\d+)/.exec(dl), hl = !!(pl || ml || fl), gl = pl ? document.documentMode : ml ? +ml[1] : fl ? +fl[1] : 0, _l = !hl && /gecko\/(\d+)/i.test(dl);
_l && +(/Firefox\/(\d+)/.exec(dl) || [0, 0])[1];
var vl = !hl && /Chrome\/(\d+)/.exec(dl), yl = !!vl, bl = vl ? +vl[1] : 0, xl = !hl && !!ll && /Apple Computer/.test(ll.vendor), Sl = xl && (/Mobile\/\w+/.test(dl) || !!ll && ll.maxTouchPoints > 2), Cl = Sl || (ll ? /Mac/.test(ll.platform) : !1), wl = ll ? /Win/.test(ll.platform) : !1, Tl = /Android \d/.test(dl), El = !!ul && "webkitFontSmoothing" in ul.documentElement.style, Dl = El ? +(/\bAppleWebKit\/(\d+)/.exec(navigator.userAgent) || [0, 0])[1] : 0;
function Ol(e) {
	let t = e.defaultView && e.defaultView.visualViewport;
	return t ? {
		left: 0,
		right: t.width,
		top: 0,
		bottom: t.height
	} : {
		left: 0,
		right: e.documentElement.clientWidth,
		top: 0,
		bottom: e.documentElement.clientHeight
	};
}
function kl(e, t) {
	return typeof e == "number" ? e : e[t];
}
function Al(e) {
	let t = e.getBoundingClientRect(), n = t.width / e.offsetWidth || 1, r = t.height / e.offsetHeight || 1;
	return {
		left: t.left,
		right: t.left + e.clientWidth * n,
		top: t.top,
		bottom: t.top + e.clientHeight * r
	};
}
function jl(e, t, n) {
	let r = e.someProp("scrollThreshold") || 0, i = e.someProp("scrollMargin") || 5, a = e.dom.ownerDocument;
	for (let o = n || e.dom; o;) {
		if (o.nodeType != 1) {
			o = qc(o);
			continue;
		}
		let e = o, n = e == a.body, s = n ? Ol(a) : Al(e), c = 0, l = 0;
		if (t.top < s.top + kl(r, "top") ? l = -(s.top - t.top + kl(i, "top")) : t.bottom > s.bottom - kl(r, "bottom") && (l = t.bottom - t.top > s.bottom - s.top ? t.top + kl(i, "top") - s.top : t.bottom - s.bottom + kl(i, "bottom")), t.left < s.left + kl(r, "left") ? c = -(s.left - t.left + kl(i, "left")) : t.right > s.right - kl(r, "right") && (c = t.right - s.right + kl(i, "right")), c || l) if (n) a.defaultView.scrollBy(c, l);
		else {
			let n = e.scrollLeft, r = e.scrollTop;
			l && (e.scrollTop += l), c && (e.scrollLeft += c);
			let i = e.scrollLeft - n, a = e.scrollTop - r;
			t = {
				left: t.left - i,
				top: t.top - a,
				right: t.right - i,
				bottom: t.bottom - a
			};
		}
		let u = n ? "fixed" : getComputedStyle(o).position;
		if (/^(fixed|sticky)$/.test(u)) break;
		o = u == "absolute" ? o.offsetParent : qc(o);
	}
}
function Ml(e) {
	let t = e.dom.getBoundingClientRect(), n = Math.max(0, t.top), r, i;
	for (let a = (t.left + t.right) / 2, o = n + 1; o < Math.min(innerHeight, t.bottom); o += 5) {
		let t = e.root.elementFromPoint(a, o);
		if (!t || t == e.dom || !e.dom.contains(t)) continue;
		let s = t.getBoundingClientRect();
		if (s.top >= n - 20) {
			r = t, i = s.top;
			break;
		}
	}
	return {
		refDOM: r,
		refTop: i,
		stack: Nl(e.dom)
	};
}
function Nl(e) {
	let t = [], n = e.ownerDocument;
	for (let r = e; r && (t.push({
		dom: r,
		top: r.scrollTop,
		left: r.scrollLeft
	}), e != n); r = qc(r));
	return t;
}
function Pl({ refDOM: e, refTop: t, stack: n }) {
	let r = e ? e.getBoundingClientRect().top : 0;
	Fl(n, r == 0 ? 0 : r - t);
}
function Fl(e, t) {
	for (let n = 0; n < e.length; n++) {
		let { dom: r, top: i, left: a } = e[n];
		r.scrollTop != i + t && (r.scrollTop = i + t), r.scrollLeft != a && (r.scrollLeft = a);
	}
}
var Il = null;
function Ll(e) {
	if (e.setActive) return e.setActive();
	if (Il) return e.focus(Il);
	let t = Nl(e);
	e.focus(Il == null ? { get preventScroll() {
		return Il = { preventScroll: !0 }, !0;
	} } : void 0), Il || (Il = !1, Fl(t, 0));
}
function Rl(e, t) {
	let n, r = 2e8, i, a = 0, o = t.top, s = t.top, c, l;
	for (let u = e.firstChild, d = 0; u; u = u.nextSibling, d++) {
		let e;
		if (u.nodeType == 1) e = u.getClientRects();
		else if (u.nodeType == 3) e = Yc(u).getClientRects();
		else continue;
		for (let f = 0; f < e.length; f++) {
			let p = e[f];
			if (p.top <= o && p.bottom >= s) {
				o = Math.max(p.bottom, o), s = Math.min(p.top, s);
				let e = p.left > t.left ? p.left - t.left : p.right < t.left ? t.left - p.right : 0;
				if (e < r) {
					n = u, r = e, i = e && n.nodeType == 3 ? {
						left: p.right < t.left ? p.right : p.left,
						top: t.top
					} : t, u.nodeType == 1 && e && (a = d + +(t.left >= (p.left + p.right) / 2));
					continue;
				}
			} else p.top > t.top && !c && p.left <= t.left && p.right >= t.left && (c = u, l = {
				left: Math.max(p.left, Math.min(p.right, t.left)),
				top: p.top
			});
			!n && (t.left >= p.right && t.top >= p.top || t.left >= p.left && t.top >= p.bottom) && (a = d + 1);
		}
	}
	return !n && c && (n = c, i = l, r = 0), n && n.nodeType == 3 ? zl(n, i) : !n || r && n.nodeType == 1 ? {
		node: e,
		offset: a
	} : Rl(n, i);
}
function zl(e, t) {
	let n = e.nodeValue.length, r = document.createRange(), i;
	for (let a = 0; a < n; a++) {
		r.setEnd(e, a + 1), r.setStart(e, a);
		let n = ql(r, 1);
		if (n.top != n.bottom && Bl(t, n)) {
			i = {
				node: e,
				offset: a + +(t.left >= (n.left + n.right) / 2)
			};
			break;
		}
	}
	return r.detach(), i || {
		node: e,
		offset: 0
	};
}
function Bl(e, t) {
	return e.left >= t.left - 1 && e.left <= t.right + 1 && e.top >= t.top - 1 && e.top <= t.bottom + 1;
}
function Vl(e, t) {
	let n = e.parentNode;
	return n && /^li$/i.test(n.nodeName) && t.left < e.getBoundingClientRect().left ? n : e;
}
function Hl(e, t, n) {
	let { node: r, offset: i } = Rl(t, n), a = -1;
	if (r.nodeType == 1 && !r.firstChild) {
		let e = r.getBoundingClientRect();
		a = e.left != e.right && n.left > (e.left + e.right) / 2 ? 1 : -1;
	}
	return e.docView.posFromDOM(r, i, a);
}
function Ul(e, t, n, r) {
	let i = -1;
	for (let n = t, a = !1; n != e.dom;) {
		let t = e.docView.nearestDesc(n, !0), o;
		if (!t) return null;
		if (t.dom.nodeType == 1 && (t.node.isBlock && t.parent || !t.contentDOM) && ((o = t.dom.getBoundingClientRect()).width || o.height) && (t.node.isBlock && t.parent && !/^T(R|BODY|HEAD|FOOT)$/.test(t.dom.nodeName) && (!a && o.left > r.left || o.top > r.top ? i = t.posBefore : (!a && o.right < r.left || o.bottom < r.top) && (i = t.posAfter), a = !0), !t.contentDOM && i < 0 && !t.node.isText)) return (t.node.isBlock ? r.top < (o.top + o.bottom) / 2 : r.left < (o.left + o.right) / 2) ? t.posBefore : t.posAfter;
		n = t.dom.parentNode;
	}
	return i > -1 ? i : e.docView.posFromDOM(t, n, -1);
}
function Wl(e, t, n) {
	let r = e.childNodes.length;
	if (r && n.top < n.bottom) for (let i = Math.max(0, Math.min(r - 1, Math.floor(r * (t.top - n.top) / (n.bottom - n.top)) - 2)), a = i;;) {
		let n = e.childNodes[a];
		if (n.nodeType == 1) {
			let e = n.getClientRects();
			for (let r = 0; r < e.length; r++) {
				let i = e[r];
				if (Bl(t, i)) return Wl(n, t, i);
			}
		}
		if ((a = (a + 1) % r) == i) break;
	}
	return e;
}
function Gl(e, t) {
	let n = e.dom.ownerDocument, r, i = 0, a = cl(n, t.left, t.top);
	a && ({node: r, offset: i} = a);
	let o = (e.root.elementFromPoint ? e.root : n).elementFromPoint(t.left, t.top), s;
	if (!o || !e.dom.contains(o.nodeType == 1 ? o : o.parentNode)) {
		let n = e.dom.getBoundingClientRect();
		if (!Bl(t, n) || (o = Wl(e.dom, t, n), !o)) return null;
	}
	if (xl) for (let e = o; r && e; e = qc(e)) e.draggable && (r = void 0);
	if (o = Vl(o, t), r) {
		if (_l && r.nodeType == 1 && (i = Math.min(i, r.childNodes.length), i < r.childNodes.length)) {
			let e = r.childNodes[i], n;
			e.nodeName == "IMG" && (n = e.getBoundingClientRect()).right <= t.left && n.bottom > t.top && i++;
		}
		let n;
		El && i && r.nodeType == 1 && (n = r.childNodes[i - 1]).nodeType == 1 && n.contentEditable == "false" && n.getBoundingClientRect().top >= t.top && i--, r == e.dom && i == r.childNodes.length - 1 && r.lastChild.nodeType == 1 && t.top > r.lastChild.getBoundingClientRect().bottom ? s = e.state.doc.content.size : (i == 0 || r.nodeType != 1 || r.childNodes[i - 1].nodeName != "BR") && (s = Ul(e, r, i, t));
	}
	s ??= Hl(e, o, t);
	let c = e.docView.nearestDesc(o, !0);
	return {
		pos: s,
		inside: c ? c.posAtStart - c.border : -1
	};
}
function Kl(e) {
	return e.top < e.bottom || e.left < e.right;
}
function ql(e, t) {
	let n = e.getClientRects();
	if (n.length) {
		let e = n[t < 0 ? 0 : n.length - 1];
		if (Kl(e)) return e;
	}
	return Array.prototype.find.call(n, Kl) || e.getBoundingClientRect();
}
var Jl = /[\u0590-\u05f4\u0600-\u06ff\u0700-\u08ac]/;
function Yl(e, t, n) {
	let { node: r, offset: i, atom: a } = e.docView.domFromPos(t, n < 0 ? -1 : 1), o = El || _l;
	if (r.nodeType == 3) if (o && (Jl.test(r.nodeValue) || (n < 0 ? !i : i == r.nodeValue.length))) {
		let e = ql(Yc(r, i, i), n);
		if (_l && i && /\s/.test(r.nodeValue[i - 1]) && i < r.nodeValue.length) {
			let t = ql(Yc(r, i - 1, i - 1), -1);
			if (t.top == e.top) {
				let n = ql(Yc(r, i, i + 1), -1);
				if (n.top != e.top) return Xl(n, n.left < t.left);
			}
		}
		return e;
	} else {
		let e = i, t = i, a = n < 0 ? 1 : -1;
		return n < 0 && !i ? (t++, a = -1) : n >= 0 && i == r.nodeValue.length ? (e--, a = 1) : n < 0 ? e-- : t++, Xl(ql(Yc(r, e, t), a), a < 0);
	}
	if (!e.state.doc.resolve(t - (a || 0)).parent.inlineContent) {
		if (a == null && i && (n < 0 || i == el(r))) {
			let e = r.childNodes[i - 1];
			if (e.nodeType == 1) return Zl(e.getBoundingClientRect(), !1);
		}
		if (a == null && i < el(r)) {
			let e = r.childNodes[i];
			if (e.nodeType == 1) return Zl(e.getBoundingClientRect(), !0);
		}
		return Zl(r.getBoundingClientRect(), n >= 0);
	}
	if (a == null && i && (n < 0 || i == el(r))) {
		let e = r.childNodes[i - 1], t = e.nodeType == 3 ? Yc(e, el(e) - +!o) : e.nodeType == 1 && (e.nodeName != "BR" || !e.nextSibling) ? e : null;
		if (t) return Xl(ql(t, 1), !1);
	}
	if (a == null && i < el(r)) {
		let e = r.childNodes[i];
		for (; e.pmViewDesc && e.pmViewDesc.ignoreForCoords;) e = e.nextSibling;
		let t = e ? e.nodeType == 3 ? Yc(e, 0, +!o) : e.nodeType == 1 ? e : null : null;
		if (t) return Xl(ql(t, -1), !0);
	}
	return Xl(ql(r.nodeType == 3 ? Yc(r) : r, -n), n >= 0);
}
function Xl(e, t) {
	if (e.width == 0) return e;
	let n = t ? e.left : e.right;
	return {
		top: e.top,
		bottom: e.bottom,
		left: n,
		right: n
	};
}
function Zl(e, t) {
	if (e.height == 0) return e;
	let n = t ? e.top : e.bottom;
	return {
		top: n,
		bottom: n,
		left: e.left,
		right: e.right
	};
}
function Ql(e, t, n) {
	let r = e.state, i = e.root.activeElement;
	r != t && e.updateState(t), i != e.dom && e.focus();
	try {
		return n();
	} finally {
		r != t && e.updateState(r), i != e.dom && i && i.focus();
	}
}
function $l(e, t, n) {
	let r = t.selection, i = n == "up" ? r.$from : r.$to;
	return Ql(e, t, () => {
		let { node: t } = e.docView.domFromPos(i.pos, n == "up" ? -1 : 1);
		for (;;) {
			let n = e.docView.nearestDesc(t, !0);
			if (!n) break;
			if (n.node.isBlock) {
				t = n.contentDOM || n.dom;
				break;
			}
			t = n.dom.parentNode;
		}
		let r = Yl(e, i.pos, 1);
		for (let e = t.firstChild; e; e = e.nextSibling) {
			let t;
			if (e.nodeType == 1) t = e.getClientRects();
			else if (e.nodeType == 3) t = Yc(e, 0, e.nodeValue.length).getClientRects();
			else continue;
			for (let e = 0; e < t.length; e++) {
				let i = t[e];
				if (i.bottom > i.top + 1 && (n == "up" ? r.top - i.top > (i.bottom - r.top) * 2 : i.bottom - r.bottom > (r.bottom - i.top) * 2)) return !1;
			}
		}
		return !0;
	});
}
var eu = /[\u0590-\u08ac]/;
function tu(e, t, n) {
	let { $head: r } = t.selection;
	if (!r.parent.isTextblock) return !1;
	let i = r.parentOffset, a = !i, o = i == r.parent.content.size, s = e.domSelection();
	return s ? !eu.test(r.parent.textContent) || !s.modify ? n == "left" || n == "backward" ? a : o : Ql(e, t, () => {
		let { focusNode: t, focusOffset: i, anchorNode: a, anchorOffset: o } = e.domSelectionRange(), c = s.caretBidiLevel;
		s.modify("move", n, "character");
		let l = r.depth ? e.docView.domAfterPos(r.before()) : e.dom, { focusNode: u, focusOffset: d } = e.domSelectionRange(), f = u && !l.contains(u.nodeType == 1 ? u : u.parentNode) || t == u && i == d;
		try {
			s.collapse(a, o), t && (t != a || i != o) && s.extend && s.extend(t, i);
		} catch {}
		return c != null && (s.caretBidiLevel = c), f;
	}) : r.pos == r.start() || r.pos == r.end();
}
var nu = null, ru = null, iu = !1;
function au(e, t, n) {
	return nu == t && ru == n ? iu : (nu = t, ru = n, iu = n == "up" || n == "down" ? $l(e, t, n) : tu(e, t, n));
}
var ou = 0, su = 1, cu = 2, lu = 3, uu = class {
	constructor(e, t, n, r) {
		this.parent = e, this.children = t, this.dom = n, this.contentDOM = r, this.dirty = ou, n.pmViewDesc = this;
	}
	matchesWidget(e) {
		return !1;
	}
	matchesMark(e) {
		return !1;
	}
	matchesNode(e, t, n) {
		return !1;
	}
	matchesHack(e) {
		return !1;
	}
	parseRule() {
		return null;
	}
	stopEvent(e) {
		return !1;
	}
	get size() {
		let e = 0;
		for (let t = 0; t < this.children.length; t++) e += this.children[t].size;
		return e;
	}
	get border() {
		return 0;
	}
	destroy() {
		this.parent = void 0, this.dom.pmViewDesc == this && (this.dom.pmViewDesc = void 0);
		for (let e = 0; e < this.children.length; e++) this.children[e].destroy();
	}
	posBeforeChild(e) {
		for (let t = 0, n = this.posAtStart;; t++) {
			let r = this.children[t];
			if (r == e) return n;
			n += r.size;
		}
	}
	get posBefore() {
		return this.parent.posBeforeChild(this);
	}
	get posAtStart() {
		return this.parent ? this.parent.posBeforeChild(this) + this.border : 0;
	}
	get posAfter() {
		return this.posBefore + this.size;
	}
	get posAtEnd() {
		return this.posAtStart + this.size - 2 * this.border;
	}
	localPosFromDOM(e, t, n) {
		if (this.contentDOM && this.contentDOM.contains(e.nodeType == 1 ? e : e.parentNode)) if (n < 0) {
			let n, r;
			if (e == this.contentDOM) n = e.childNodes[t - 1];
			else {
				for (; e.parentNode != this.contentDOM;) e = e.parentNode;
				n = e.previousSibling;
			}
			for (; n && !((r = n.pmViewDesc) && r.parent == this);) n = n.previousSibling;
			return n ? this.posBeforeChild(r) + r.size : this.posAtStart;
		} else {
			let n, r;
			if (e == this.contentDOM) n = e.childNodes[t];
			else {
				for (; e.parentNode != this.contentDOM;) e = e.parentNode;
				n = e.nextSibling;
			}
			for (; n && !((r = n.pmViewDesc) && r.parent == this);) n = n.nextSibling;
			return n ? this.posBeforeChild(r) : this.posAtEnd;
		}
		let r;
		if (e == this.dom && this.contentDOM) r = t > Kc(this.contentDOM);
		else if (this.contentDOM && this.contentDOM != this.dom && this.dom.contains(this.contentDOM)) r = e.compareDocumentPosition(this.contentDOM) & 2;
		else if (this.dom.firstChild) {
			if (t == 0) for (let t = e;; t = t.parentNode) {
				if (t == this.dom) {
					r = !1;
					break;
				}
				if (t.previousSibling) break;
			}
			if (r == null && t == e.childNodes.length) for (let t = e;; t = t.parentNode) {
				if (t == this.dom) {
					r = !0;
					break;
				}
				if (t.nextSibling) break;
			}
		}
		return r ?? n > 0 ? this.posAtEnd : this.posAtStart;
	}
	nearestDesc(e, t = !1) {
		for (let n = !0, r = e; r; r = r.parentNode) {
			let i = this.getDesc(r), a;
			if (i && (!t || i.node)) if (n && (a = i.nodeDOM) && !(a.nodeType == 1 ? a.contains(e.nodeType == 1 ? e : e.parentNode) : a == e)) n = !1;
			else return i;
		}
	}
	getDesc(e) {
		let t = e.pmViewDesc;
		for (let e = t; e; e = e.parent) if (e == this) return t;
	}
	posFromDOM(e, t, n) {
		for (let r = e; r; r = r.parentNode) {
			let i = this.getDesc(r);
			if (i) return i.localPosFromDOM(e, t, n);
		}
		return -1;
	}
	descAt(e) {
		for (let t = 0, n = 0; t < this.children.length; t++) {
			let r = this.children[t], i = n + r.size;
			if (n == e && i != n) {
				for (; !r.border && r.children.length;) for (let e = 0; e < r.children.length; e++) {
					let t = r.children[e];
					if (t.size) {
						r = t;
						break;
					}
				}
				return r;
			}
			if (e < i) return r.descAt(e - n - r.border);
			n = i;
		}
	}
	domFromPos(e, t) {
		if (!this.contentDOM) return {
			node: this.dom,
			offset: 0,
			atom: e + 1
		};
		let n = 0, r = 0;
		for (let t = 0; n < this.children.length; n++) {
			let i = this.children[n], a = t + i.size;
			if (a > e || i instanceof _u) {
				r = e - t;
				break;
			}
			t = a;
		}
		if (r) return this.children[n].domFromPos(r - this.children[n].border, t);
		for (let e; n && !(e = this.children[n - 1]).size && e instanceof du && e.side >= 0; n--);
		if (t <= 0) {
			let e, r = !0;
			for (; e = n ? this.children[n - 1] : null, !(!e || e.dom.parentNode == this.contentDOM); n--, r = !1);
			return e && t && r && !e.border && !e.domAtom ? e.domFromPos(e.size, t) : {
				node: this.contentDOM,
				offset: e ? Kc(e.dom) + 1 : 0
			};
		} else {
			let e, r = !0;
			for (; e = n < this.children.length ? this.children[n] : null, !(!e || e.dom.parentNode == this.contentDOM); n++, r = !1);
			return e && r && !e.border && !e.domAtom ? e.domFromPos(0, t) : {
				node: this.contentDOM,
				offset: e ? Kc(e.dom) : this.contentDOM.childNodes.length
			};
		}
	}
	parseRange(e, t, n = 0) {
		if (this.children.length == 0) return {
			node: this.contentDOM,
			from: e,
			to: t,
			fromOffset: 0,
			toOffset: this.contentDOM.childNodes.length
		};
		let r = -1, i = -1;
		for (let a = n, o = 0;; o++) {
			let n = this.children[o], s = a + n.size;
			if (r == -1 && e <= s) {
				let i = a + n.border;
				if (e >= i && t <= s - n.border && n.node && n.contentDOM && this.contentDOM.contains(n.contentDOM)) return n.parseRange(e, t, i);
				e = a;
				for (let t = o; t > 0; t--) {
					let n = this.children[t - 1];
					if (n.size && n.dom.parentNode == this.contentDOM && !n.emptyChildAt(1)) {
						r = Kc(n.dom) + 1;
						break;
					}
					e -= n.size;
				}
				r == -1 && (r = 0);
			}
			if (r > -1 && (s > t || o == this.children.length - 1)) {
				t = s;
				for (let e = o + 1; e < this.children.length; e++) {
					let n = this.children[e];
					if (n.size && n.dom.parentNode == this.contentDOM && !n.emptyChildAt(-1)) {
						i = Kc(n.dom);
						break;
					}
					t += n.size;
				}
				i == -1 && (i = this.contentDOM.childNodes.length);
				break;
			}
			a = s;
		}
		return {
			node: this.contentDOM,
			from: e,
			to: t,
			fromOffset: r,
			toOffset: i
		};
	}
	emptyChildAt(e) {
		if (this.border || !this.contentDOM || !this.children.length) return !1;
		let t = this.children[e < 0 ? 0 : this.children.length - 1];
		return t.size == 0 || t.emptyChildAt(e);
	}
	domAfterPos(e) {
		let { node: t, offset: n } = this.domFromPos(e, 0);
		if (t.nodeType != 1 || n == t.childNodes.length) throw RangeError("No node after pos " + e);
		return t.childNodes[n];
	}
	setSelection(e, t, n, r = !1) {
		let i = Math.min(e, t), a = Math.max(e, t);
		for (let o = 0, s = 0; o < this.children.length; o++) {
			let c = this.children[o], l = s + c.size;
			if (i > s && a < l) return c.setSelection(e - s - c.border, t - s - c.border, n, r);
			s = l;
		}
		let o = this.domFromPos(e, e ? -1 : 1), s = t == e ? o : this.domFromPos(t, t ? -1 : 1), c = n.root.getSelection(), l = n.domSelectionRange(), u = !1;
		if ((_l || xl) && e == t) {
			let { node: e, offset: t } = o;
			if (e.nodeType == 3) {
				if (u = !!(t && e.nodeValue[t - 1] == "\n"), u && t == e.nodeValue.length) for (let t = e, n; t; t = t.parentNode) {
					if (n = t.nextSibling) {
						n.nodeName == "BR" && (o = s = {
							node: n.parentNode,
							offset: Kc(n) + 1
						});
						break;
					}
					let e = t.pmViewDesc;
					if (e && e.node && e.node.isBlock) break;
				}
			} else {
				let n = e.childNodes[t - 1];
				u = n && (n.nodeName == "BR" || n.contentEditable == "false");
			}
		}
		if (_l && l.focusNode && l.focusNode != s.node && l.focusNode.nodeType == 1) {
			let e = l.focusNode.childNodes[l.focusOffset];
			e && e.contentEditable == "false" && (r = !0);
		}
		if (!(r || u && xl) && Zc(o.node, o.offset, l.anchorNode, l.anchorOffset) && Zc(s.node, s.offset, l.focusNode, l.focusOffset)) return;
		let d = !1;
		if ((c.extend || e == t) && !(u && _l)) {
			c.collapse(o.node, o.offset);
			try {
				e != t && c.extend(s.node, s.offset), d = !0;
			} catch {}
		}
		if (!d) {
			if (e > t) {
				let e = o;
				o = s, s = e;
			}
			let n = document.createRange();
			n.setEnd(s.node, s.offset), n.setStart(o.node, o.offset), c.removeAllRanges(), c.addRange(n);
		}
	}
	ignoreMutation(e) {
		return !this.contentDOM && e.type != "selection";
	}
	get contentLost() {
		return this.contentDOM && this.contentDOM != this.dom && !this.dom.contains(this.contentDOM);
	}
	markDirty(e, t) {
		for (let n = 0, r = 0; r < this.children.length; r++) {
			let i = this.children[r], a = n + i.size;
			if (n == a ? e <= a && t >= n : e < a && t > n) {
				let r = n + i.border, o = a - i.border;
				if (e >= r && t <= o) {
					this.dirty = e == n || t == a ? cu : su, e == r && t == o && (i.contentLost || i.dom.parentNode != this.contentDOM) ? i.dirty = lu : i.markDirty(e - r, t - r);
					return;
				} else i.dirty = i.dom == i.contentDOM && i.dom.parentNode == this.contentDOM && !i.children.length ? cu : lu;
			}
			n = a;
		}
		this.dirty = cu;
	}
	markParentsDirty() {
		let e = 1;
		for (let t = this.parent; t; t = t.parent, e++) {
			let n = e == 1 ? cu : su;
			t.dirty < n && (t.dirty = n);
		}
	}
	get domAtom() {
		return !1;
	}
	get ignoreForCoords() {
		return !1;
	}
	get ignoreForSelection() {
		return !1;
	}
	isText(e) {
		return !1;
	}
}, du = class extends uu {
	constructor(e, t, n, r) {
		let i, a = t.type.toDOM;
		if (typeof a == "function" && (a = a(n, () => {
			if (!i) return r;
			if (i.parent) return i.parent.posBeforeChild(i);
		})), !t.type.spec.raw) {
			if (a.nodeType != 1) {
				let e = document.createElement("span");
				e.appendChild(a), a = e;
			}
			a.contentEditable = "false", a.classList.add("ProseMirror-widget");
		}
		super(e, [], a, null), this.widget = t, this.widget = t, i = this;
	}
	matchesWidget(e) {
		return this.dirty == ou && e.type.eq(this.widget.type);
	}
	parseRule() {
		return { ignore: !0 };
	}
	stopEvent(e) {
		let t = this.widget.spec.stopEvent;
		return t ? t(e) : !1;
	}
	ignoreMutation(e) {
		return e.type != "selection" || this.widget.spec.ignoreSelection;
	}
	destroy() {
		this.widget.type.destroy(this.dom), super.destroy();
	}
	get domAtom() {
		return !0;
	}
	get ignoreForSelection() {
		return !!this.widget.type.spec.relaxedSide;
	}
	get side() {
		return this.widget.type.side;
	}
}, fu = class extends uu {
	constructor(e, t, n, r) {
		super(e, [], t, null), this.textDOM = n, this.text = r;
	}
	get size() {
		return this.text.length;
	}
	localPosFromDOM(e, t) {
		return e == this.textDOM ? this.posAtStart + t : this.posAtStart + (t ? this.size : 0);
	}
	domFromPos(e) {
		return {
			node: this.textDOM,
			offset: e
		};
	}
	ignoreMutation(e) {
		return e.type === "characterData" && e.target.nodeValue == e.oldValue;
	}
}, pu = class e extends uu {
	constructor(e, t, n, r, i) {
		super(e, [], n, r), this.mark = t, this.spec = i;
	}
	static create(t, n, r, i) {
		let a = i.nodeViews[n.type.name], o = a && a(n, i, r);
		return (!o || !o.dom) && (o = ts.renderSpec(document, n.type.spec.toDOM(n, r), null, n.attrs)), new e(t, n, o.dom, o.contentDOM || o.dom, o);
	}
	parseRule() {
		return this.dirty & lu || this.mark.type.spec.reparseInView ? null : {
			mark: this.mark.type.name,
			attrs: this.mark.attrs,
			contentElement: this.contentDOM
		};
	}
	matchesMark(e) {
		return this.dirty != lu && this.mark.eq(e);
	}
	markDirty(e, t) {
		if (super.markDirty(e, t), this.dirty != ou) {
			let e = this.parent;
			for (; !e.node;) e = e.parent;
			e.dirty < this.dirty && (e.dirty = this.dirty), this.dirty = ou;
		}
	}
	slice(t, n, r) {
		let i = e.create(this.parent, this.mark, !0, r), a = this.children, o = this.size;
		n < o && (a = Pu(a, n, o, r)), t > 0 && (a = Pu(a, 0, t, r));
		for (let e = 0; e < a.length; e++) a[e].parent = i;
		return i.children = a, i;
	}
	ignoreMutation(e) {
		return this.spec.ignoreMutation ? this.spec.ignoreMutation(e) : super.ignoreMutation(e);
	}
	destroy() {
		this.spec.destroy && this.spec.destroy(), super.destroy();
	}
}, mu = class e extends uu {
	constructor(e, t, n, r, i, a, o, s, c) {
		super(e, [], i, a), this.node = t, this.outerDeco = n, this.innerDeco = r, this.nodeDOM = o;
	}
	static create(t, n, r, i, a, o) {
		let s = a.nodeViews[n.type.name], c, l = s && s(n, a, () => {
			if (!c) return o;
			if (c.parent) return c.parent.posBeforeChild(c);
		}, r, i), u = l && l.dom, d = l && l.contentDOM;
		if (n.isText) {
			if (!u) u = document.createTextNode(n.text);
			else if (u.nodeType != 3) throw RangeError("Text must be rendered as a DOM text node");
		} else if (!u) {
			let e = ts.renderSpec(document, n.type.spec.toDOM(n), null, n.attrs);
			({dom: u, contentDOM: d} = e);
		}
		!d && !n.isText && u.nodeName != "BR" && (u.hasAttribute("contenteditable") || (u.contentEditable = "false"), n.type.spec.draggable && (u.draggable = !0));
		let f = u;
		return u = Tu(u, r, n), l ? c = new vu(t, n, r, i, u, d || null, f, l, a, o + 1) : n.isText ? new gu(t, n, r, i, u, f, a) : new e(t, n, r, i, u, d || null, f, a, o + 1);
	}
	parseRule() {
		if (this.node.type.spec.reparseInView) return null;
		let e = {
			node: this.node.type.name,
			attrs: this.node.attrs
		};
		if (this.node.type.whitespace == "pre" && (e.preserveWhitespace = "full"), !this.contentDOM) e.getContent = () => this.node.content;
		else if (!this.contentLost) e.contentElement = this.contentDOM;
		else {
			for (let t = this.children.length - 1; t >= 0; t--) {
				let n = this.children[t];
				if (this.dom.contains(n.dom.parentNode)) {
					e.contentElement = n.dom.parentNode;
					break;
				}
			}
			e.contentElement || (e.getContent = () => q.empty);
		}
		return e;
	}
	matchesNode(e, t, n) {
		return this.dirty == ou && e.eq(this.node) && Eu(t, this.outerDeco) && n.eq(this.innerDeco);
	}
	get size() {
		return this.node.nodeSize;
	}
	get border() {
		return +!this.node.isLeaf;
	}
	updateChildren(e, t) {
		let n = this.node.inlineContent, r = t, i = e.composing ? this.localCompositionInfo(e, t) : null, a = i && i.pos > -1 ? i : null, o = i && i.pos < 0, s = new Ou(this, a && a.node, e);
		ju(this.node, this.innerDeco, (t, i, a) => {
			t.spec.marks ? s.syncToMarks(t.spec.marks, n, e, i) : t.type.side >= 0 && !a && s.syncToMarks(i == this.node.childCount ? Ga.none : this.node.child(i).marks, n, e, i), s.placeWidget(t, e, r);
		}, (t, a, c, l) => {
			s.syncToMarks(t.marks, n, e, l);
			let u;
			s.findNodeMatch(t, a, c, l) || o && e.state.selection.from > r && e.state.selection.to < r + t.nodeSize && (u = s.findIndexWithChild(i.node)) > -1 && s.updateNodeAt(t, a, c, u, e) || s.updateNextNode(t, a, c, e, l, r) || s.addNode(t, a, c, e, r), r += t.nodeSize;
		}), s.syncToMarks([], n, e, 0), this.node.isTextblock && s.addTextblockHacks(), s.destroyRest(), (s.changed || this.dirty == cu) && (a && this.protectLocalComposition(e, a), yu(this.contentDOM, this.children, e), Sl && Mu(this.dom));
	}
	localCompositionInfo(e, t) {
		let { from: n, to: r } = e.state.selection;
		if (!(e.state.selection instanceof X) || n < t || r > t + this.node.content.size) return null;
		let i = e.input.compositionNode;
		if (!i || !this.dom.contains(i.parentNode)) return null;
		if (this.node.inlineContent) {
			let e = i.nodeValue, a = Nu(this.node.content, e, n - t, r - t);
			return a < 0 ? null : {
				node: i,
				pos: a,
				text: e
			};
		} else return {
			node: i,
			pos: -1,
			text: ""
		};
	}
	protectLocalComposition(e, { node: t, pos: n, text: r }) {
		if (this.getDesc(t)) return;
		let i = t;
		for (; i.parentNode != this.contentDOM; i = i.parentNode) {
			for (; i.previousSibling;) i.parentNode.removeChild(i.previousSibling);
			for (; i.nextSibling;) i.parentNode.removeChild(i.nextSibling);
			i.pmViewDesc &&= void 0;
		}
		let a = new fu(this, i, t, r);
		e.input.compositionNodes.push(a), this.children = Pu(this.children, n, n + r.length, e, a);
	}
	update(e, t, n, r) {
		return this.dirty == lu || !e.sameMarkup(this.node) ? !1 : (this.updateInner(e, t, n, r), !0);
	}
	updateInner(e, t, n, r) {
		this.updateOuterDeco(t), this.node = e, this.innerDeco = n, this.contentDOM && this.updateChildren(r, this.posAtStart), this.dirty = ou;
	}
	updateOuterDeco(e) {
		if (Eu(e, this.outerDeco)) return;
		let t = this.nodeDOM.nodeType != 1, n = this.dom;
		this.dom = Cu(this.dom, this.nodeDOM, Su(this.outerDeco, this.node, t), Su(e, this.node, t)), this.dom != n && (n.pmViewDesc = void 0, this.dom.pmViewDesc = this), this.outerDeco = e;
	}
	selectNode() {
		this.nodeDOM.nodeType == 1 && (this.nodeDOM.classList.add("ProseMirror-selectednode"), (this.contentDOM || !this.node.type.spec.draggable) && (this.nodeDOM.draggable = !0));
	}
	deselectNode() {
		this.nodeDOM.nodeType == 1 && (this.nodeDOM.classList.remove("ProseMirror-selectednode"), (this.contentDOM || !this.node.type.spec.draggable) && this.nodeDOM.removeAttribute("draggable"));
	}
	get domAtom() {
		return this.node.isAtom;
	}
};
function hu(e, t, n, r, i) {
	Tu(r, t, e);
	let a = new mu(void 0, e, t, n, r, r, r, i, 0);
	return a.contentDOM && a.updateChildren(i, 0), a;
}
var gu = class e extends mu {
	constructor(e, t, n, r, i, a, o) {
		super(e, t, n, r, i, null, a, o, 0);
	}
	parseRule() {
		let e = this.nodeDOM.parentNode;
		for (; e && e != this.dom && !e.pmIsDeco;) e = e.parentNode;
		return { skip: e || !0 };
	}
	update(e, t, n, r) {
		return this.dirty == lu || this.dirty != ou && !this.inParent() || !e.sameMarkup(this.node) ? !1 : (this.updateOuterDeco(t), (this.dirty != ou || e.text != this.node.text) && e.text != this.nodeDOM.nodeValue && (this.nodeDOM.nodeValue = e.text, r.trackWrites == this.nodeDOM && (r.trackWrites = null)), this.node = e, this.dirty = ou, !0);
	}
	inParent() {
		let e = this.parent.contentDOM;
		for (let t = this.nodeDOM; t; t = t.parentNode) if (t == e) return !0;
		return !1;
	}
	domFromPos(e) {
		return {
			node: this.nodeDOM,
			offset: e
		};
	}
	localPosFromDOM(e, t, n) {
		return e == this.nodeDOM ? this.posAtStart + Math.min(t, this.node.text.length) : super.localPosFromDOM(e, t, n);
	}
	ignoreMutation(e) {
		return e.type != "characterData" && e.type != "selection";
	}
	slice(t, n, r) {
		let i = this.node.cut(t, n), a = document.createTextNode(i.text);
		return new e(this.parent, i, this.outerDeco, this.innerDeco, a, a, r);
	}
	markDirty(e, t) {
		super.markDirty(e, t), this.dom != this.nodeDOM && (e == 0 || t == this.nodeDOM.nodeValue.length) && (this.dirty = lu);
	}
	get domAtom() {
		return !1;
	}
	isText(e) {
		return this.node.text == e;
	}
}, _u = class extends uu {
	parseRule() {
		return { ignore: !0 };
	}
	matchesHack(e) {
		return this.dirty == ou && this.dom.nodeName == e;
	}
	get domAtom() {
		return !0;
	}
	get ignoreForCoords() {
		return this.dom.nodeName == "IMG";
	}
}, vu = class extends mu {
	constructor(e, t, n, r, i, a, o, s, c, l) {
		super(e, t, n, r, i, a, o, c, l), this.spec = s;
	}
	update(e, t, n, r) {
		if (this.dirty == lu) return !1;
		if (this.spec.update && (this.node.type == e.type || this.spec.multiType)) {
			let i = this.spec.update(e, t, n);
			return i && this.updateInner(e, t, n, r), i;
		} else if (!this.contentDOM && !e.isLeaf) return !1;
		else return super.update(e, t, n, r);
	}
	selectNode() {
		this.spec.selectNode ? this.spec.selectNode() : super.selectNode();
	}
	deselectNode() {
		this.spec.deselectNode ? this.spec.deselectNode() : super.deselectNode();
	}
	setSelection(e, t, n, r) {
		this.spec.setSelection ? this.spec.setSelection(e, t, n.root) : super.setSelection(e, t, n, r);
	}
	destroy() {
		this.spec.destroy && this.spec.destroy(), super.destroy();
	}
	stopEvent(e) {
		return this.spec.stopEvent ? this.spec.stopEvent(e) : !1;
	}
	ignoreMutation(e) {
		return this.spec.ignoreMutation ? this.spec.ignoreMutation(e) : super.ignoreMutation(e);
	}
};
function yu(e, t, n) {
	let r = e.firstChild, i = !1;
	for (let a = 0; a < t.length; a++) {
		let o = t[a], s = o.dom;
		if (s.parentNode == e) {
			for (; s != r;) r = Du(r), i = !0;
			r = r.nextSibling;
		} else i = !0, e.insertBefore(s, r);
		if (o instanceof pu) {
			let t = r ? r.previousSibling : e.lastChild;
			yu(o.contentDOM, o.children, n), r = t ? t.nextSibling : e.firstChild;
		}
	}
	for (; r;) r = Du(r), i = !0;
	i && n.trackWrites == e && (n.trackWrites = null);
}
var bu = function(e) {
	e && (this.nodeName = e);
};
bu.prototype = Object.create(null);
var xu = [new bu()];
function Su(e, t, n) {
	if (e.length == 0) return xu;
	let r = n ? xu[0] : new bu(), i = [r];
	for (let a = 0; a < e.length; a++) {
		let o = e[a].type.attrs;
		if (o) {
			o.nodeName && i.push(r = new bu(o.nodeName));
			for (let e in o) {
				let a = o[e];
				a != null && (n && i.length == 1 && i.push(r = new bu(t.isInline ? "span" : "div")), e == "class" ? r.class = (r.class ? r.class + " " : "") + a : e == "style" ? r.style = (r.style ? r.style + ";" : "") + a : e != "nodeName" && (r[e] = a));
			}
		}
	}
	return i;
}
function Cu(e, t, n, r) {
	if (n == xu && r == xu) return t;
	let i = t;
	for (let t = 0; t < r.length; t++) {
		let a = r[t], o = n[t];
		if (t) {
			let t;
			o && o.nodeName == a.nodeName && i != e && (t = i.parentNode) && t.nodeName.toLowerCase() == a.nodeName ? i = t : (t = document.createElement(a.nodeName), t.pmIsDeco = !0, t.appendChild(i), o = xu[0], i = t);
		}
		wu(i, o || xu[0], a);
	}
	return i;
}
function wu(e, t, n) {
	for (let r in t) r != "class" && r != "style" && r != "nodeName" && !(r in n) && e.removeAttribute(r);
	for (let r in n) r != "class" && r != "style" && r != "nodeName" && n[r] != t[r] && e.setAttribute(r, n[r]);
	if (t.class != n.class) {
		let r = t.class ? t.class.split(" ").filter(Boolean) : [], i = n.class ? n.class.split(" ").filter(Boolean) : [];
		for (let t = 0; t < r.length; t++) i.indexOf(r[t]) == -1 && e.classList.remove(r[t]);
		for (let t = 0; t < i.length; t++) r.indexOf(i[t]) == -1 && e.classList.add(i[t]);
		e.classList.length == 0 && e.removeAttribute("class");
	}
	if (t.style != n.style) {
		if (t.style) {
			let n = /\s*([\w\-\xa1-\uffff]+)\s*:(?:"(?:\\.|[^"])*"|'(?:\\.|[^'])*'|\(.*?\)|[^;])*/g, r;
			for (; r = n.exec(t.style);) e.style.removeProperty(r[1]);
		}
		n.style && (e.style.cssText += n.style);
	}
}
function Tu(e, t, n) {
	return Cu(e, e, xu, Su(t, n, e.nodeType != 1));
}
function Eu(e, t) {
	if (e.length != t.length) return !1;
	for (let n = 0; n < e.length; n++) if (!e[n].type.eq(t[n].type)) return !1;
	return !0;
}
function Du(e) {
	let t = e.nextSibling;
	return e.parentNode.removeChild(e), t;
}
var Ou = class {
	constructor(e, t, n) {
		this.lock = t, this.view = n, this.index = 0, this.stack = [], this.changed = !1, this.top = e, this.preMatch = ku(e.node.content, e);
	}
	destroyBetween(e, t) {
		if (e != t) {
			for (let n = e; n < t; n++) this.top.children[n].destroy();
			this.top.children.splice(e, t - e), this.changed = !0;
		}
	}
	destroyRest() {
		this.destroyBetween(this.index, this.top.children.length);
	}
	syncToMarks(e, t, n, r) {
		let i = 0, a = this.stack.length >> 1, o = Math.min(a, e.length);
		for (; i < o && (i == a - 1 ? this.top : this.stack[i + 1 << 1]).matchesMark(e[i]) && e[i].type.spec.spanning !== !1;) i++;
		for (; i < a;) this.destroyRest(), this.top.dirty = ou, this.index = this.stack.pop(), this.top = this.stack.pop(), a--;
		for (; a < e.length;) {
			this.stack.push(this.top, this.index + 1);
			let i = -1, o = this.top.children.length;
			r < this.preMatch.index && (o = Math.min(this.index + 3, o));
			for (let t = this.index; t < o; t++) {
				let n = this.top.children[t];
				if (n.matchesMark(e[a]) && !this.isLocked(n.dom)) {
					i = t;
					break;
				}
			}
			if (i > -1) i > this.index && (this.changed = !0, this.destroyBetween(this.index, i)), this.top = this.top.children[this.index];
			else {
				let r = pu.create(this.top, e[a], t, n);
				this.top.children.splice(this.index, 0, r), this.top = r, this.changed = !0;
			}
			this.index = 0, a++;
		}
	}
	findNodeMatch(e, t, n, r) {
		let i = -1, a;
		if (r >= this.preMatch.index && (a = this.preMatch.matches[r - this.preMatch.index]).parent == this.top && a.matchesNode(e, t, n)) i = this.top.children.indexOf(a, this.index);
		else for (let r = this.index, a = Math.min(this.top.children.length, r + 5); r < a; r++) {
			let a = this.top.children[r];
			if (a.matchesNode(e, t, n) && !this.preMatch.matched.has(a)) {
				i = r;
				break;
			}
		}
		return i < 0 ? !1 : (this.destroyBetween(this.index, i), this.index++, !0);
	}
	updateNodeAt(e, t, n, r, i) {
		let a = this.top.children[r];
		return a.dirty == lu && a.dom == a.contentDOM && (a.dirty = cu), a.update(e, t, n, i) ? (this.destroyBetween(this.index, r), this.index++, !0) : !1;
	}
	findIndexWithChild(e) {
		for (;;) {
			let t = e.parentNode;
			if (!t) return -1;
			if (t == this.top.contentDOM) {
				let t = e.pmViewDesc;
				if (t) {
					for (let e = this.index; e < this.top.children.length; e++) if (this.top.children[e] == t) return e;
				}
				return -1;
			}
			e = t;
		}
	}
	updateNextNode(e, t, n, r, i, a) {
		for (let o = this.index; o < this.top.children.length; o++) {
			let s = this.top.children[o];
			if (s instanceof mu) {
				let c = this.preMatch.matched.get(s);
				if (c != null && c != i) return !1;
				let l = s.dom, u, d = this.isLocked(l) && !(e.isText && s.node && s.node.isText && s.nodeDOM.nodeValue == e.text && s.dirty != lu && Eu(t, s.outerDeco));
				if (!d && s.update(e, t, n, r)) return this.destroyBetween(this.index, o), s.dom != l && (this.changed = !0), this.index++, !0;
				if (!d && (u = this.recreateWrapper(s, e, t, n, r, a))) return this.destroyBetween(this.index, o), this.top.children[this.index] = u, u.contentDOM && (u.dirty = cu, u.updateChildren(r, a + 1), u.dirty = ou), this.changed = !0, this.index++, !0;
				break;
			}
		}
		return !1;
	}
	recreateWrapper(e, t, n, r, i, a) {
		if (e.dirty || t.isAtom || !e.children.length || !e.node.content.eq(t.content) || !Eu(n, e.outerDeco) || !r.eq(e.innerDeco)) return null;
		let o = mu.create(this.top, t, n, r, i, a);
		if (o.contentDOM) {
			o.children = e.children, e.children = [];
			for (let e of o.children) e.parent = o;
		}
		return e.destroy(), o;
	}
	addNode(e, t, n, r, i) {
		let a = mu.create(this.top, e, t, n, r, i);
		a.contentDOM && a.updateChildren(r, i + 1), this.top.children.splice(this.index++, 0, a), this.changed = !0;
	}
	placeWidget(e, t, n) {
		let r = this.index < this.top.children.length ? this.top.children[this.index] : null;
		if (r && r.matchesWidget(e) && (e == r.widget || !r.widget.type.toDOM.parentNode)) this.index++;
		else {
			let r = new du(this.top, e, t, n);
			this.top.children.splice(this.index++, 0, r), this.changed = !0;
		}
	}
	addTextblockHacks() {
		let e = this.top.children[this.index - 1], t = this.top;
		for (; e instanceof pu;) t = e, e = t.children[t.children.length - 1];
		(!e || !(e instanceof gu) || /\n$/.test(e.node.text) || this.view.requiresGeckoHackNode && /\s$/.test(e.node.text)) && ((xl || yl) && e && e.dom.contentEditable == "false" && this.addHackNode("IMG", t), this.addHackNode("BR", this.top));
	}
	addHackNode(e, t) {
		if (t == this.top && this.index < t.children.length && t.children[this.index].matchesHack(e)) this.index++;
		else {
			let n = document.createElement(e);
			e == "IMG" && (n.className = "ProseMirror-separator", n.alt = ""), e == "BR" && (n.className = "ProseMirror-trailingBreak");
			let r = new _u(this.top, [], n, null);
			t == this.top ? t.children.splice(this.index++, 0, r) : t.children.push(r), this.changed = !0;
		}
	}
	isLocked(e) {
		return this.lock && (e == this.lock || e.nodeType == 1 && e.contains(this.lock.parentNode));
	}
};
function ku(e, t) {
	let n = t, r = n.children.length, i = e.childCount, a = /* @__PURE__ */ new Map(), o = [];
	outer: for (; i > 0;) {
		let s;
		for (;;) if (r) {
			let e = n.children[r - 1];
			if (e instanceof pu) n = e, r = e.children.length;
			else {
				s = e, r--;
				break;
			}
		} else if (n == t) break outer;
		else r = n.parent.children.indexOf(n), n = n.parent;
		let c = s.node;
		if (c) {
			if (c != e.child(i - 1)) break;
			--i, a.set(s, i), o.push(s);
		}
	}
	return {
		index: i,
		matched: a,
		matches: o.reverse()
	};
}
function Au(e, t) {
	return e.type.side - t.type.side;
}
function ju(e, t, n, r) {
	let i = t.locals(e), a = 0;
	if (i.length == 0) {
		for (let n = 0; n < e.childCount; n++) {
			let o = e.child(n);
			r(o, i, t.forChild(a, o), n), a += o.nodeSize;
		}
		return;
	}
	let o = 0, s = [], c = null;
	for (let l = 0;;) {
		let u, d;
		for (; o < i.length && i[o].to == a;) {
			let e = i[o++];
			e.widget && (u ? (d ||= [u]).push(e) : u = e);
		}
		if (u) if (d) {
			d.sort(Au);
			for (let e = 0; e < d.length; e++) n(d[e], l, !!c);
		} else n(u, l, !!c);
		let f, p;
		if (c) p = -1, f = c, c = null;
		else if (l < e.childCount) p = l, f = e.child(l++);
		else break;
		for (let e = 0; e < s.length; e++) s[e].to <= a && s.splice(e--, 1);
		for (; o < i.length && i[o].from <= a && i[o].to > a;) s.push(i[o++]);
		let m = a + f.nodeSize;
		if (f.isText) {
			let e = m;
			o < i.length && i[o].from < e && (e = i[o].from);
			for (let t = 0; t < s.length; t++) s[t].to < e && (e = s[t].to);
			e < m && (c = f.cut(e - a), f = f.cut(0, e - a), m = e, p = -1);
		} else for (; o < i.length && i[o].to < m;) o++;
		let h = f.isInline && !f.isLeaf ? s.filter((e) => !e.inline) : s.slice();
		r(f, h, t.forChild(a, f), p), a = m;
	}
}
function Mu(e) {
	if (e.nodeName == "UL" || e.nodeName == "OL") {
		let t = e.style.cssText;
		e.style.cssText = t + "; list-style: square !important", window.getComputedStyle(e).listStyle, e.style.cssText = t;
	}
}
function Nu(e, t, n, r) {
	for (let i = 0, a = 0; i < e.childCount && a <= r;) {
		let o = e.child(i++), s = a;
		if (a += o.nodeSize, !o.isText) continue;
		let c = o.text;
		for (; i < e.childCount;) {
			let t = e.child(i++);
			if (a += t.nodeSize, !t.isText) break;
			c += t.text;
		}
		if (a >= n) {
			if (a >= r && c.slice(r - t.length - s, r - s) == t) return r - t.length;
			let e = s < r ? c.lastIndexOf(t, r - s - 1) : -1;
			if (e >= 0 && e + t.length + s >= n) return s + e;
			if (n == r && c.length >= r + t.length - s && c.slice(r - s, r - s + t.length) == t) return r;
		}
	}
	return -1;
}
function Pu(e, t, n, r, i) {
	let a = [];
	for (let o = 0, s = 0; o < e.length; o++) {
		let c = e[o], l = s, u = s += c.size;
		l >= n || u <= t ? a.push(c) : (l < t && a.push(c.slice(0, t - l, r)), i &&= (a.push(i), void 0), u > n && a.push(c.slice(n - l, c.size, r)));
	}
	return a;
}
function Fu(e, t = null) {
	let n = e.domSelectionRange(), r = e.state.doc;
	if (!n.focusNode) return null;
	let i = e.docView.nearestDesc(n.focusNode), a = i && i.size == 0, o = e.docView.posFromDOM(n.focusNode, n.focusOffset, 1);
	if (o < 0) return null;
	let s = r.resolve(o), c, l;
	if (al(n)) {
		for (c = o; i && !i.node;) i = i.parent;
		let e = i.node;
		if (i && e.isAtom && Z.isSelectable(e) && i.parent && !(e.isInline && rl(n.focusNode, n.focusOffset, i.dom))) {
			let e = i.posBefore;
			l = new Z(o == e ? s : r.resolve(e));
		}
	} else {
		if (n instanceof e.dom.ownerDocument.defaultView.Selection && n.rangeCount > 1) {
			let t = o, i = o;
			for (let r = 0; r < n.rangeCount; r++) {
				let a = n.getRangeAt(r);
				t = Math.min(t, e.docView.posFromDOM(a.startContainer, a.startOffset, 1)), i = Math.max(i, e.docView.posFromDOM(a.endContainer, a.endOffset, -1));
			}
			if (t < 0) return null;
			[c, o] = i == e.state.selection.anchor ? [i, t] : [t, i], s = r.resolve(o);
		} else c = e.docView.posFromDOM(n.anchorNode, n.anchorOffset, 1);
		if (c < 0) return null;
	}
	let u = r.resolve(c);
	if (!l) {
		let n = t == "pointer" || e.state.selection.head < s.pos && !a ? 1 : -1;
		l = Ku(e, u, s, n);
	}
	return l;
}
function Iu(e) {
	return e.editable ? e.hasFocus() : Ju(e) && document.activeElement && document.activeElement.contains(e.dom);
}
function Lu(e, t = !1) {
	let n = e.state.selection;
	if (Wu(e, n), Iu(e)) {
		if (!t && e.input.mouseDown && e.input.mouseDown.allowDefault && yl) {
			let t = e.domSelectionRange(), n = e.domObserver.currentSelection;
			if (t.anchorNode && n.anchorNode && Zc(t.anchorNode, t.anchorOffset, n.anchorNode, n.anchorOffset)) {
				e.input.mouseDown.delayedSelectionSync = !0, e.domObserver.setCurSelection();
				return;
			}
		}
		if (e.domObserver.disconnectSelection(), e.cursorWrapper) Uu(e);
		else {
			let { anchor: r, head: i } = n, a, o;
			Ru && !(n instanceof X) && (n.$from.parent.inlineContent || (a = zu(e, n.from)), !n.empty && !n.$from.parent.inlineContent && (o = zu(e, n.to))), e.docView.setSelection(r, i, e, t), Ru && (a && Vu(a), o && Vu(o)), n.visible ? e.dom.classList.remove("ProseMirror-hideselection") : (e.dom.classList.add("ProseMirror-hideselection"), "onselectionchange" in document && Hu(e));
		}
		e.domObserver.setCurSelection(), e.domObserver.connectSelection();
	}
}
var Ru = xl || yl && bl < 63;
function zu(e, t) {
	let { node: n, offset: r } = e.docView.domFromPos(t, 0), i = r < n.childNodes.length ? n.childNodes[r] : null, a = r ? n.childNodes[r - 1] : null;
	if (xl && i && i.contentEditable == "false") return Bu(i);
	if ((!i || i.contentEditable == "false") && (!a || a.contentEditable == "false")) {
		if (i) return Bu(i);
		if (a) return Bu(a);
	}
}
function Bu(e) {
	return e.contentEditable = "true", xl && e.draggable && (e.draggable = !1, e.wasDraggable = !0), e;
}
function Vu(e) {
	e.contentEditable = "false", e.wasDraggable &&= (e.draggable = !0, null);
}
function Hu(e) {
	let t = e.dom.ownerDocument;
	t.removeEventListener("selectionchange", e.input.hideSelectionGuard);
	let n = e.domSelectionRange(), r = n.anchorNode, i = n.anchorOffset;
	t.addEventListener("selectionchange", e.input.hideSelectionGuard = () => {
		(n.anchorNode != r || n.anchorOffset != i) && (t.removeEventListener("selectionchange", e.input.hideSelectionGuard), setTimeout(() => {
			(!Iu(e) || e.state.selection.visible) && e.dom.classList.remove("ProseMirror-hideselection");
		}, 20));
	});
}
function Uu(e) {
	let t = e.domSelection();
	if (!t) return;
	let n = e.cursorWrapper.dom, r = n.nodeName == "IMG";
	r ? t.collapse(n.parentNode, Kc(n) + 1) : t.collapse(n, 0), !r && !e.state.selection.visible && hl && gl <= 11 && (n.disabled = !0, n.disabled = !1);
}
function Wu(e, t) {
	if (t instanceof Z) {
		let n = e.docView.descAt(t.from);
		n != e.lastSelectedViewDesc && (Gu(e), n && n.selectNode(), e.lastSelectedViewDesc = n);
	} else Gu(e);
}
function Gu(e) {
	e.lastSelectedViewDesc &&= (e.lastSelectedViewDesc.parent && e.lastSelectedViewDesc.deselectNode(), void 0);
}
function Ku(e, t, n, r) {
	return e.someProp("createSelectionBetween", (r) => r(e, t, n)) || X.between(t, n, r);
}
function qu(e) {
	return e.editable && !e.hasFocus() ? !1 : Ju(e);
}
function Ju(e) {
	let t = e.domSelectionRange();
	if (!t.anchorNode) return !1;
	try {
		return e.dom.contains(t.anchorNode.nodeType == 3 ? t.anchorNode.parentNode : t.anchorNode) && (e.editable || e.dom.contains(t.focusNode.nodeType == 3 ? t.focusNode.parentNode : t.focusNode));
	} catch {
		return !1;
	}
}
function Yu(e) {
	let t = e.docView.domFromPos(e.state.selection.anchor, 0), n = e.domSelectionRange();
	return Zc(t.node, t.offset, n.anchorNode, n.anchorOffset);
}
function Xu(e, t) {
	let { $anchor: n, $head: r } = e.selection, i = t > 0 ? n.max(r) : n.min(r), a = i.parent.inlineContent ? i.depth ? e.doc.resolve(t > 0 ? i.after() : i.before()) : null : i;
	return a && Y.findFrom(a, t);
}
function Zu(e, t) {
	return e.dispatch(e.state.tr.setSelection(t).scrollIntoView()), !0;
}
function Qu(e, t, n) {
	let r = e.state.selection;
	if (r instanceof X) {
		if (n.indexOf("s") > -1) {
			let { $head: n } = r, i = n.textOffset ? null : t < 0 ? n.nodeBefore : n.nodeAfter;
			if (!i || i.isText || !i.isLeaf) return !1;
			let a = e.state.doc.resolve(n.pos + i.nodeSize * (t < 0 ? -1 : 1));
			return Zu(e, new X(r.$anchor, a));
		} else if (!r.empty) return !1;
		else if (e.endOfTextblock(t > 0 ? "forward" : "backward")) {
			let n = Xu(e.state, t);
			return n && n instanceof Z ? Zu(e, n) : !1;
		} else if (!(Cl && n.indexOf("m") > -1)) {
			let n = r.$head, i = n.textOffset ? null : t < 0 ? n.nodeBefore : n.nodeAfter, a;
			if (!i || i.isText) return !1;
			let o = t < 0 ? n.pos - i.nodeSize : n.pos;
			return i.isAtom || (a = e.docView.descAt(o)) && !a.contentDOM ? Z.isSelectable(i) ? Zu(e, new Z(t < 0 ? e.state.doc.resolve(n.pos - i.nodeSize) : n)) : El ? Zu(e, new X(e.state.doc.resolve(t < 0 ? o : o + i.nodeSize))) : !1 : !1;
		}
	} else if (r instanceof Z && r.node.isInline) return Zu(e, new X(t > 0 ? r.$to : r.$from));
	else {
		let n = Xu(e.state, t);
		return n ? Zu(e, n) : !1;
	}
}
function $u(e) {
	return e.nodeType == 3 ? e.nodeValue.length : e.childNodes.length;
}
function ed(e, t) {
	let n = e.pmViewDesc;
	return n && n.size == 0 && (t < 0 || e.nextSibling || e.nodeName != "BR");
}
function td(e, t) {
	return t < 0 ? nd(e) : rd(e);
}
function nd(e) {
	let t = e.domSelectionRange(), n = t.focusNode, r = t.focusOffset;
	if (!n) return;
	let i, a, o = !1;
	for (_l && n.nodeType == 1 && r < $u(n) && ed(n.childNodes[r], -1) && (o = !0);;) if (r > 0) {
		if (n.nodeType != 1) break;
		{
			let e = n.childNodes[r - 1];
			if (ed(e, -1)) i = n, a = --r;
			else if (e.nodeType == 3) n = e, r = n.nodeValue.length;
			else break;
		}
	} else if (id(n)) break;
	else {
		let t = n.previousSibling;
		for (; t && ed(t, -1);) i = n.parentNode, a = Kc(t), t = t.previousSibling;
		if (t) n = t, r = $u(n);
		else {
			if (n = n.parentNode, n == e.dom) break;
			r = 0;
		}
	}
	o ? sd(e, n, r) : i && sd(e, i, a);
}
function rd(e) {
	let t = e.domSelectionRange(), n = t.focusNode, r = t.focusOffset;
	if (!n) return;
	let i = $u(n), a, o;
	for (;;) if (r < i) {
		if (n.nodeType != 1) break;
		let e = n.childNodes[r];
		if (ed(e, 1)) a = n, o = ++r;
		else break;
	} else if (id(n)) break;
	else {
		let t = n.nextSibling;
		for (; t && ed(t, 1);) a = t.parentNode, o = Kc(t) + 1, t = t.nextSibling;
		if (t) n = t, r = 0, i = $u(n);
		else {
			if (n = n.parentNode, n == e.dom) break;
			r = i = 0;
		}
	}
	a && sd(e, a, o);
}
function id(e) {
	let t = e.pmViewDesc;
	return t && t.node && t.node.isBlock;
}
function ad(e, t) {
	for (; e && t == e.childNodes.length && !il(e);) t = Kc(e) + 1, e = e.parentNode;
	for (; e && t < e.childNodes.length;) {
		let n = e.childNodes[t];
		if (n.nodeType == 3) return n;
		if (n.nodeType == 1 && n.contentEditable == "false") break;
		e = n, t = 0;
	}
}
function od(e, t) {
	for (; e && !t && !il(e);) t = Kc(e), e = e.parentNode;
	for (; e && t;) {
		let n = e.childNodes[t - 1];
		if (n.nodeType == 3) return n;
		if (n.nodeType == 1 && n.contentEditable == "false") break;
		e = n, t = e.childNodes.length;
	}
}
function sd(e, t, n) {
	if (t.nodeType != 3) {
		let e, r;
		(r = ad(t, n)) ? (t = r, n = 0) : (e = od(t, n)) && (t = e, n = e.nodeValue.length);
	}
	let r = e.domSelection();
	if (!r) return;
	if (al(r)) {
		let e = document.createRange();
		e.setEnd(t, n), e.setStart(t, n), r.removeAllRanges(), r.addRange(e);
	} else r.extend && r.extend(t, n);
	e.domObserver.setCurSelection();
	let { state: i } = e;
	setTimeout(() => {
		e.state == i && Lu(e);
	}, 50);
}
function cd(e, t) {
	let n = e.state.doc.resolve(t);
	if (!(yl || wl) && n.parent.inlineContent) {
		let r = e.coordsAtPos(t);
		if (t > n.start()) {
			let n = e.coordsAtPos(t - 1), i = (n.top + n.bottom) / 2;
			if (i > r.top && i < r.bottom && Math.abs(n.left - r.left) > 1) return n.left < r.left ? "ltr" : "rtl";
		}
		if (t < n.end()) {
			let n = e.coordsAtPos(t + 1), i = (n.top + n.bottom) / 2;
			if (i > r.top && i < r.bottom && Math.abs(n.left - r.left) > 1) return n.left > r.left ? "ltr" : "rtl";
		}
	}
	return getComputedStyle(e.dom).direction == "rtl" ? "rtl" : "ltr";
}
function ld(e, t, n) {
	let r = e.state.selection;
	if (r instanceof X && !r.empty || n.indexOf("s") > -1 || Cl && n.indexOf("m") > -1) return !1;
	let { $from: i, $to: a } = r;
	if (!i.parent.inlineContent || e.endOfTextblock(t < 0 ? "up" : "down")) {
		let n = Xu(e.state, t);
		if (n && n instanceof Z) return Zu(e, n);
	}
	if (!i.parent.inlineContent) {
		let n = t < 0 ? i : a, o = r instanceof Oc ? Y.near(n, t) : Y.findFrom(n, t);
		return o ? Zu(e, o) : !1;
	}
	return !1;
}
function ud(e, t) {
	if (!(e.state.selection instanceof X)) return !0;
	let { $head: n, $anchor: r, empty: i } = e.state.selection;
	if (!n.sameParent(r)) return !0;
	if (!i) return !1;
	if (e.endOfTextblock(t > 0 ? "forward" : "backward")) return !0;
	let a = !n.textOffset && (t < 0 ? n.nodeBefore : n.nodeAfter);
	if (a && !a.isText) {
		let r = e.state.tr;
		return t < 0 ? r.delete(n.pos - a.nodeSize, n.pos) : r.delete(n.pos, n.pos + a.nodeSize), e.dispatch(r), !0;
	}
	return !1;
}
function dd(e, t, n) {
	e.domObserver.stop(), t.contentEditable = n, e.domObserver.start();
}
function fd(e) {
	if (!xl || e.state.selection.$head.parentOffset > 0) return !1;
	let { focusNode: t, focusOffset: n } = e.domSelectionRange();
	if (t && t.nodeType == 1 && n == 0 && t.firstChild && t.firstChild.contentEditable == "false") {
		let n = t.firstChild;
		dd(e, n, "true"), setTimeout(() => dd(e, n, "false"), 20);
	}
	return !1;
}
function pd(e) {
	let t = "";
	return e.ctrlKey && (t += "c"), e.metaKey && (t += "m"), e.altKey && (t += "a"), e.shiftKey && (t += "s"), t;
}
function md(e, t) {
	let n = t.keyCode, r = pd(t);
	if (n == 8 || Cl && n == 72 && r == "c") return ud(e, -1) || td(e, -1);
	if (n == 46 && !t.shiftKey || Cl && n == 68 && r == "c") return ud(e, 1) || td(e, 1);
	if (n == 13 || n == 27) return !0;
	if (n == 37 || Cl && n == 66 && r == "c") {
		let t = n == 37 ? cd(e, e.state.selection.from) == "ltr" ? -1 : 1 : -1;
		return Qu(e, t, r) || td(e, t);
	} else if (n == 39 || Cl && n == 70 && r == "c") {
		let t = n == 39 ? cd(e, e.state.selection.from) == "ltr" ? 1 : -1 : 1;
		return Qu(e, t, r) || td(e, t);
	} else if (n == 38 || Cl && n == 80 && r == "c") return ld(e, -1, r) || td(e, -1);
	else if (n == 40 || Cl && n == 78 && r == "c") return fd(e) || ld(e, 1, r) || td(e, 1);
	else if (r == (Cl ? "m" : "c") && (n == 66 || n == 73 || n == 89 || n == 90)) return !0;
	return !1;
}
function hd(e, t) {
	e.someProp("transformCopied", (n) => {
		t = n(t, e);
	});
	let n = [], { content: r, openStart: i, openEnd: a } = t;
	for (; i > 1 && a > 1 && r.childCount == 1 && r.firstChild.childCount == 1;) {
		i--, a--;
		let e = r.firstChild;
		n.push(e.type.name, e.attrs == e.type.defaultAttrs ? null : e.attrs), r = e.content;
	}
	let o = e.someProp("clipboardSerializer") || ts.fromSchema(e.state.schema), s = Ed(), c = s.createElement("div");
	c.appendChild(o.serializeFragment(r, { document: s }));
	let l = c.firstChild, u, d = 0;
	for (; l && l.nodeType == 1 && (u = wd[l.nodeName.toLowerCase()]);) {
		for (let e = u.length - 1; e >= 0; e--) {
			let t = s.createElement(u[e]);
			for (; c.firstChild;) t.appendChild(c.firstChild);
			c.appendChild(t), d++;
		}
		l = c.firstChild;
	}
	return l && l.nodeType == 1 && l.setAttribute("data-pm-slice", `${i} ${a}${d ? ` -${d}` : ""} ${JSON.stringify(n)}`), {
		dom: c,
		text: e.someProp("clipboardTextSerializer", (n) => n(t, e)) || t.content.textBetween(0, t.content.size, "\n\n"),
		slice: t
	};
}
function gd(e, t, n, r, i) {
	let a = i.parent.type.spec.code, o, s;
	if (!n && !t) return null;
	let c = !!t && (r || a || !n);
	if (c) {
		if (e.someProp("transformPastedText", (n) => {
			t = n(t, a || r, e);
		}), a) return s = new J(q.from(e.state.schema.text(t.replace(/\r\n?/g, "\n"))), 0, 0), e.someProp("transformPasted", (t) => {
			s = t(s, e, !0);
		}), s;
		let n = e.someProp("clipboardTextParser", (n) => n(t, i, r, e));
		if (n) s = n;
		else {
			let n = i.marks(), { schema: r } = e.state, a = ts.fromSchema(r);
			o = document.createElement("div"), t.split(/(?:\r\n?|\n)+/).forEach((e) => {
				let t = o.appendChild(document.createElement("p"));
				e && t.appendChild(a.serializeNode(r.text(e, n)));
			});
		}
	} else e.someProp("transformPastedHTML", (t) => {
		n = t(n, e);
	}), o = kd(n), El && Ad(o);
	let l = o && o.querySelector("[data-pm-slice]"), u = l && /^(\d+) (\d+)(?: -(\d+))? (.*)/.exec(l.getAttribute("data-pm-slice") || "");
	if (u && u[3]) for (let e = +u[3]; e > 0; e--) {
		let e = o.firstChild;
		for (; e && e.nodeType != 1;) e = e.nextSibling;
		if (!e) break;
		o = e;
	}
	if (s ||= (e.someProp("clipboardParser") || e.someProp("domParser") || Vo.fromSchema(e.state.schema)).parseSlice(o, {
		preserveWhitespace: !!(c || u),
		context: i,
		ruleFromNode(e) {
			return e.nodeName == "BR" && !e.nextSibling && e.parentNode && !_d.test(e.parentNode.nodeName) ? { ignore: !0 } : null;
		}
	}), u) s = jd(Cd(s, +u[1], +u[2]), u[4]);
	else if (s = J.maxOpen(vd(s.content, i), !0), s.openStart || s.openEnd) {
		let e = 0, t = 0;
		for (let t = s.content.firstChild; e < s.openStart && !t.type.spec.isolating; e++, t = t.firstChild);
		for (let e = s.content.lastChild; t < s.openEnd && !e.type.spec.isolating; t++, e = e.lastChild);
		s = Cd(s, e, t);
	}
	return e.someProp("transformPasted", (t) => {
		s = t(s, e, c);
	}), s;
}
var _d = /^(a|abbr|acronym|b|cite|code|del|em|i|ins|kbd|label|output|q|ruby|s|samp|span|strong|sub|sup|time|u|tt|var)$/i;
function vd(e, t) {
	if (e.childCount < 2) return e;
	for (let n = t.depth; n >= 0; n--) {
		let r = t.node(n).contentMatchAt(t.index(n)), i, a = [];
		if (e.forEach((e) => {
			if (!a) return;
			let t = r.findWrapping(e.type), n;
			if (!t) return a = null;
			if (n = a.length && i.length && bd(t, i, e, a[a.length - 1], 0)) a[a.length - 1] = n;
			else {
				a.length && (a[a.length - 1] = xd(a[a.length - 1], i.length));
				let n = yd(e, t);
				a.push(n), r = r.matchType(n.type), i = t;
			}
		}), a) return q.from(a);
	}
	return e;
}
function yd(e, t, n = 0) {
	for (let r = t.length - 1; r >= n; r--) e = t[r].create(null, q.from(e));
	return e;
}
function bd(e, t, n, r, i) {
	if (i < e.length && i < t.length && e[i] == t[i]) {
		let a = bd(e, t, n, r.lastChild, i + 1);
		if (a) return r.copy(r.content.replaceChild(r.childCount - 1, a));
		if (r.contentMatchAt(r.childCount).matchType(i == e.length - 1 ? n.type : e[i + 1])) return r.copy(r.content.append(q.from(yd(n, e, i + 1))));
	}
}
function xd(e, t) {
	if (t == 0) return e;
	let n = e.content.replaceChild(e.childCount - 1, xd(e.lastChild, t - 1)), r = e.contentMatchAt(e.childCount).fillBefore(q.empty, !0);
	return e.copy(n.append(r));
}
function Sd(e, t, n, r, i, a) {
	let o = t < 0 ? e.firstChild : e.lastChild, s = o.content;
	return e.childCount > 1 && (a = 0), i < r - 1 && (s = Sd(s, t, n, r, i + 1, a)), i >= n && (s = t < 0 ? o.contentMatchAt(0).fillBefore(s, a <= i).append(s) : s.append(o.contentMatchAt(o.childCount).fillBefore(q.empty, !0))), e.replaceChild(t < 0 ? 0 : e.childCount - 1, o.copy(s));
}
function Cd(e, t, n) {
	return t < e.openStart && (e = new J(Sd(e.content, -1, t, e.openStart, 0, e.openEnd), t, e.openEnd)), n < e.openEnd && (e = new J(Sd(e.content, 1, n, e.openEnd, 0, 0), e.openStart, n)), e;
}
var wd = {
	thead: ["table"],
	tbody: ["table"],
	tfoot: ["table"],
	caption: ["table"],
	colgroup: ["table"],
	col: ["table", "colgroup"],
	tr: ["table", "tbody"],
	td: [
		"table",
		"tbody",
		"tr"
	],
	th: [
		"table",
		"tbody",
		"tr"
	]
}, Td = null;
function Ed() {
	return Td ||= document.implementation.createHTMLDocument("title");
}
var Dd = null;
function Od(e) {
	let t = window.trustedTypes;
	return t ? (Dd ||= t.defaultPolicy || t.createPolicy("ProseMirrorClipboard", { createHTML: (e) => e }), Dd.createHTML(e)) : e;
}
function kd(e) {
	let t = /^(\s*<meta [^>]*>)*/.exec(e);
	t && (e = e.slice(t[0].length));
	let n = Ed().createElement("div"), r = /<([a-z][^>\s]+)/i.exec(e), i;
	if ((i = r && wd[r[1].toLowerCase()]) && (e = i.map((e) => "<" + e + ">").join("") + e + i.map((e) => "</" + e + ">").reverse().join("")), n.innerHTML = Od(e), i) for (let e = 0; e < i.length; e++) n = n.querySelector(i[e]) || n;
	return n;
}
function Ad(e) {
	let t = e.querySelectorAll(yl ? "span:not([class]):not([style])" : "span.Apple-converted-space");
	for (let n = 0; n < t.length; n++) {
		let r = t[n];
		r.childNodes.length == 1 && r.textContent == "\xA0" && r.parentNode && r.parentNode.replaceChild(e.ownerDocument.createTextNode(" "), r);
	}
}
function jd(e, t) {
	if (!e.size) return e;
	let n = e.content.firstChild.type.schema, r;
	try {
		r = JSON.parse(t);
	} catch {
		return e;
	}
	let { content: i, openStart: a, openEnd: o } = e;
	for (let e = r.length - 2; e >= 0; e -= 2) {
		let t = n.nodes[r[e]];
		if (!t || t.hasRequiredAttrs()) break;
		i = q.from(t.create(r[e + 1], i)), a++, o++;
	}
	return new J(i, a, o);
}
var Md = {}, Nd = {}, Pd = {
	touchstart: !0,
	touchmove: !0
}, Fd = class {
	constructor() {
		this.shiftKey = !1, this.mouseDown = null, this.lastKeyCode = null, this.lastKeyCodeTime = 0, this.lastClick = {
			time: 0,
			x: 0,
			y: 0,
			type: "",
			button: 0
		}, this.lastSelectionOrigin = null, this.lastSelectionTime = 0, this.lastIOSEnter = 0, this.lastIOSEnterFallbackTimeout = -1, this.lastFocus = 0, this.lastTouch = 0, this.lastChromeDelete = 0, this.composing = !1, this.compositionNode = null, this.composingTimeout = -1, this.compositionNodes = [], this.compositionEndedAt = -2e8, this.compositionID = 1, this.badSafariComposition = !1, this.compositionPendingChanges = 0, this.domChangeCount = 0, this.eventHandlers = Object.create(null), this.hideSelectionGuard = null;
	}
};
function Id(e) {
	for (let t in Md) {
		let n = Md[t];
		e.dom.addEventListener(t, e.input.eventHandlers[t] = (t) => {
			Vd(e, t) && !Bd(e, t) && (e.editable || !(t.type in Nd)) && n(e, t);
		}, Pd[t] ? { passive: !0 } : void 0);
	}
	xl && e.dom.addEventListener("input", () => null), zd(e);
}
function Ld(e, t) {
	e.input.lastSelectionOrigin = t, e.input.lastSelectionTime = Date.now();
}
function Rd(e) {
	e.domObserver.stop();
	for (let t in e.input.eventHandlers) e.dom.removeEventListener(t, e.input.eventHandlers[t]);
	clearTimeout(e.input.composingTimeout), clearTimeout(e.input.lastIOSEnterFallbackTimeout);
}
function zd(e) {
	e.someProp("handleDOMEvents", (t) => {
		for (let n in t) e.input.eventHandlers[n] || e.dom.addEventListener(n, e.input.eventHandlers[n] = (t) => Bd(e, t));
	});
}
function Bd(e, t) {
	return e.someProp("handleDOMEvents", (n) => {
		let r = n[t.type];
		return r ? r(e, t) || t.defaultPrevented : !1;
	});
}
function Vd(e, t) {
	if (!t.bubbles) return !0;
	if (t.defaultPrevented) return !1;
	for (let n = t.target; n != e.dom; n = n.parentNode) if (!n || n.nodeType == 11 || n.pmViewDesc && n.pmViewDesc.stopEvent(t)) return !1;
	return !0;
}
function Hd(e, t) {
	!Bd(e, t) && Md[t.type] && (e.editable || !(t.type in Nd)) && Md[t.type](e, t);
}
Nd.keydown = (e, t) => {
	let n = t;
	if (e.input.shiftKey = n.keyCode == 16 || n.shiftKey, !nf(e, n) && (e.input.lastKeyCode = n.keyCode, e.input.lastKeyCodeTime = Date.now(), !(Tl && yl && n.keyCode == 13))) if (n.keyCode != 229 && e.domObserver.forceFlush(), Sl && n.keyCode == 13 && !n.ctrlKey && !n.altKey && !n.metaKey) {
		let t = Date.now();
		e.input.lastIOSEnter = t, e.input.lastIOSEnterFallbackTimeout = setTimeout(() => {
			e.input.lastIOSEnter == t && (e.someProp("handleKeyDown", (t) => t(e, ol(13, "Enter"))), e.input.lastIOSEnter = 0);
		}, 200);
	} else e.someProp("handleKeyDown", (t) => t(e, n)) || md(e, n) ? n.preventDefault() : Ld(e, "key");
}, Nd.keyup = (e, t) => {
	t.keyCode == 16 && (e.input.shiftKey = !1);
}, Nd.keypress = (e, t) => {
	let n = t;
	if (nf(e, n) || !n.charCode || n.ctrlKey && !n.altKey || Cl && n.metaKey) return;
	if (e.someProp("handleKeyPress", (t) => t(e, n))) {
		n.preventDefault();
		return;
	}
	let r = e.state.selection;
	if (!(r instanceof X) || !r.$from.sameParent(r.$to)) {
		let t = String.fromCharCode(n.charCode), i = () => e.state.tr.insertText(t).scrollIntoView();
		!/[\r\n]/.test(t) && !e.someProp("handleTextInput", (n) => n(e, r.$from.pos, r.$to.pos, t, i)) && e.dispatch(i()), n.preventDefault();
	}
};
function Ud(e) {
	return {
		left: e.clientX,
		top: e.clientY
	};
}
function Wd(e, t) {
	let n = t.x - e.clientX, r = t.y - e.clientY;
	return n * n + r * r < 100;
}
function Gd(e, t, n, r, i) {
	if (r == -1) return !1;
	let a = e.state.doc.resolve(r);
	for (let r = a.depth + 1; r > 0; r--) if (e.someProp(t, (t) => r > a.depth ? t(e, n, a.nodeAfter, a.before(r), i, !0) : t(e, n, a.node(r), a.before(r), i, !1))) return !0;
	return !1;
}
function Kd(e, t, n) {
	if (e.focused || e.focus(), e.state.selection.eq(t)) return;
	let r = e.state.tr.setSelection(t);
	n == "pointer" && r.setMeta("pointer", !0), e.dispatch(r);
}
function qd(e, t) {
	if (t == -1) return !1;
	let n = e.state.doc.resolve(t), r = n.nodeAfter;
	return r && r.isAtom && Z.isSelectable(r) ? (Kd(e, new Z(n), "pointer"), !0) : !1;
}
function Jd(e, t) {
	if (t == -1) return !1;
	let n = e.state.selection, r, i;
	n instanceof Z && (r = n.node);
	let a = e.state.doc.resolve(t);
	for (let e = a.depth + 1; e > 0; e--) {
		let t = e > a.depth ? a.nodeAfter : a.node(e);
		if (Z.isSelectable(t)) {
			i = r && n.$from.depth > 0 && e >= n.$from.depth && a.before(n.$from.depth + 1) == n.$from.pos ? a.before(n.$from.depth) : a.before(e);
			break;
		}
	}
	return i == null ? !1 : (Kd(e, Z.create(e.state.doc, i), "pointer"), !0);
}
function Yd(e, t, n, r, i) {
	return Gd(e, "handleClickOn", t, n, r) || e.someProp("handleClick", (n) => n(e, t, r)) || (i ? Jd(e, n) : qd(e, n));
}
function Xd(e, t, n, r) {
	return Gd(e, "handleDoubleClickOn", t, n, r) || e.someProp("handleDoubleClick", (n) => n(e, t, r));
}
function Zd(e, t, n, r) {
	return Gd(e, "handleTripleClickOn", t, n, r) || e.someProp("handleTripleClick", (n) => n(e, t, r)) || Qd(e, n, r);
}
function Qd(e, t, n) {
	if (n.button != 0) return !1;
	let r = e.state.doc;
	if (t == -1) return r.inlineContent ? (Kd(e, X.create(r, 0, r.content.size), "pointer"), !0) : !1;
	let i = r.resolve(t);
	for (let t = i.depth + 1; t > 0; t--) {
		let n = t > i.depth ? i.nodeAfter : i.node(t), a = i.before(t);
		if (n.inlineContent) Kd(e, X.create(r, a + 1, a + 1 + n.content.size), "pointer");
		else if (Z.isSelectable(n)) Kd(e, Z.create(r, a), "pointer");
		else continue;
		return !0;
	}
}
function $d(e) {
	return uf(e);
}
var ef = Cl ? "metaKey" : "ctrlKey";
Md.mousedown = (e, t) => {
	let n = t;
	e.input.shiftKey = n.shiftKey;
	let r = $d(e), i = Date.now(), a = "singleClick";
	i - e.input.lastClick.time < 500 && Wd(n, e.input.lastClick) && !n[ef] && e.input.lastClick.button == n.button && (e.input.lastClick.type == "singleClick" ? a = "doubleClick" : e.input.lastClick.type == "doubleClick" && (a = "tripleClick")), e.input.lastClick = {
		time: i,
		x: n.clientX,
		y: n.clientY,
		type: a,
		button: n.button
	};
	let o = e.posAtCoords(Ud(n));
	o && (a == "singleClick" ? (e.input.mouseDown && e.input.mouseDown.done(), e.input.mouseDown = new tf(e, o, n, !!r)) : (a == "doubleClick" ? Xd : Zd)(e, o.pos, o.inside, n) ? n.preventDefault() : Ld(e, "pointer"));
};
var tf = class {
	constructor(e, t, n, r) {
		this.view = e, this.pos = t, this.event = n, this.flushed = r, this.delayedSelectionSync = !1, this.mightDrag = null, this.startDoc = e.state.doc, this.selectNode = !!n[ef], this.allowDefault = n.shiftKey;
		let i, a;
		if (t.inside > -1) i = e.state.doc.nodeAt(t.inside), a = t.inside;
		else {
			let n = e.state.doc.resolve(t.pos);
			i = n.parent, a = n.depth ? n.before() : 0;
		}
		let o = r ? null : n.target, s = o ? e.docView.nearestDesc(o, !0) : null;
		this.target = s && s.nodeDOM.nodeType == 1 ? s.nodeDOM : null;
		let { selection: c } = e.state;
		n.button == 0 && (i.type.spec.draggable && i.type.spec.selectable !== !1 || c instanceof Z && c.from <= a && c.to > a) && (this.mightDrag = {
			node: i,
			pos: a,
			addAttr: !!(this.target && !this.target.draggable),
			setUneditable: !!(this.target && _l && !this.target.hasAttribute("contentEditable"))
		}), this.target && this.mightDrag && (this.mightDrag.addAttr || this.mightDrag.setUneditable) && (this.view.domObserver.stop(), this.mightDrag.addAttr && (this.target.draggable = !0), this.mightDrag.setUneditable && setTimeout(() => {
			this.view.input.mouseDown == this && this.target.setAttribute("contentEditable", "false");
		}, 20), this.view.domObserver.start()), e.root.addEventListener("mouseup", this.up = this.up.bind(this)), e.root.addEventListener("mousemove", this.move = this.move.bind(this)), Ld(e, "pointer");
	}
	done() {
		this.view.root.removeEventListener("mouseup", this.up), this.view.root.removeEventListener("mousemove", this.move), this.mightDrag && this.target && (this.view.domObserver.stop(), this.mightDrag.addAttr && this.target.removeAttribute("draggable"), this.mightDrag.setUneditable && this.target.removeAttribute("contentEditable"), this.view.domObserver.start()), this.delayedSelectionSync && setTimeout(() => Lu(this.view)), this.view.input.mouseDown = null;
	}
	up(e) {
		if (this.done(), !this.view.dom.contains(e.target)) return;
		let t = this.pos;
		this.view.state.doc != this.startDoc && (t = this.view.posAtCoords(Ud(e))), this.updateAllowDefault(e), this.allowDefault || !t ? Ld(this.view, "pointer") : Yd(this.view, t.pos, t.inside, e, this.selectNode) ? e.preventDefault() : e.button == 0 && (this.flushed || xl && this.mightDrag && !this.mightDrag.node.isAtom || yl && !this.view.state.selection.visible && Math.min(Math.abs(t.pos - this.view.state.selection.from), Math.abs(t.pos - this.view.state.selection.to)) <= 2) ? (Kd(this.view, Y.near(this.view.state.doc.resolve(t.pos)), "pointer"), e.preventDefault()) : Ld(this.view, "pointer");
	}
	move(e) {
		this.updateAllowDefault(e), Ld(this.view, "pointer"), e.buttons == 0 && this.done();
	}
	updateAllowDefault(e) {
		!this.allowDefault && (Math.abs(this.event.x - e.clientX) > 4 || Math.abs(this.event.y - e.clientY) > 4) && (this.allowDefault = !0);
	}
};
Md.touchstart = (e) => {
	e.input.lastTouch = Date.now(), $d(e), Ld(e, "pointer");
}, Md.touchmove = (e) => {
	e.input.lastTouch = Date.now(), Ld(e, "pointer");
}, Md.contextmenu = (e) => $d(e);
function nf(e, t) {
	return e.composing ? !0 : xl && Math.abs(t.timeStamp - e.input.compositionEndedAt) < 500 ? (e.input.compositionEndedAt = -2e8, !0) : !1;
}
var rf = Tl ? 5e3 : -1;
Nd.compositionstart = Nd.compositionupdate = (e) => {
	if (!e.composing) {
		e.domObserver.flush();
		let { state: t } = e, n = t.selection.$to;
		if (t.selection instanceof X && (t.storedMarks || !n.textOffset && n.parentOffset && n.nodeBefore.marks.some((e) => e.type.spec.inclusive === !1) || yl && wl && af(e))) e.markCursor = e.state.storedMarks || n.marks(), uf(e, !0), e.markCursor = null;
		else if (uf(e, !t.selection.empty), _l && t.selection.empty && n.parentOffset && !n.textOffset && n.nodeBefore.marks.length) {
			let t = e.domSelectionRange();
			for (let n = t.focusNode, r = t.focusOffset; n && n.nodeType == 1 && r != 0;) {
				let t = r < 0 ? n.lastChild : n.childNodes[r - 1];
				if (!t) break;
				if (t.nodeType == 3) {
					let n = e.domSelection();
					n && n.collapse(t, t.nodeValue.length);
					break;
				} else n = t, r = -1;
			}
		}
		e.input.composing = !0;
	}
	of(e, rf);
};
function af(e) {
	let { focusNode: t, focusOffset: n } = e.domSelectionRange();
	if (!t || t.nodeType != 1 || n >= t.childNodes.length) return !1;
	let r = t.childNodes[n];
	return r.nodeType == 1 && r.contentEditable == "false";
}
Nd.compositionend = (e, t) => {
	e.composing && (e.input.composing = !1, e.input.compositionEndedAt = t.timeStamp, e.input.compositionPendingChanges = e.domObserver.pendingRecords().length ? e.input.compositionID : 0, e.input.compositionNode = null, e.input.badSafariComposition ? e.domObserver.forceFlush() : e.input.compositionPendingChanges && Promise.resolve().then(() => e.domObserver.flush()), e.input.compositionID++, of(e, 20));
};
function of(e, t) {
	clearTimeout(e.input.composingTimeout), t > -1 && (e.input.composingTimeout = setTimeout(() => uf(e), t));
}
function sf(e) {
	for (e.composing && (e.input.composing = !1, e.input.compositionEndedAt = lf()); e.input.compositionNodes.length > 0;) e.input.compositionNodes.pop().markParentsDirty();
}
function cf(e) {
	let t = e.domSelectionRange();
	if (!t.focusNode) return null;
	let n = tl(t.focusNode, t.focusOffset), r = nl(t.focusNode, t.focusOffset);
	if (n && r && n != r) {
		let t = r.pmViewDesc, i = e.domObserver.lastChangedTextNode;
		if (n == i || r == i) return i;
		if (!t || !t.isText(r.nodeValue)) return r;
		if (e.input.compositionNode == r) {
			let e = n.pmViewDesc;
			if (!(!e || !e.isText(n.nodeValue))) return r;
		}
	}
	return n || r;
}
function lf() {
	let e = document.createEvent("Event");
	return e.initEvent("event", !0, !0), e.timeStamp;
}
function uf(e, t = !1) {
	if (!(Tl && e.domObserver.flushingSoon >= 0)) {
		if (e.domObserver.forceFlush(), sf(e), t || e.docView && e.docView.dirty) {
			let n = Fu(e), r = e.state.selection;
			return n && !n.eq(r) ? e.dispatch(e.state.tr.setSelection(n)) : (e.markCursor || t) && !r.$from.node(r.$from.sharedDepth(r.to)).inlineContent ? e.dispatch(e.state.tr.deleteSelection()) : e.updateState(e.state), !0;
		}
		return !1;
	}
}
function df(e, t) {
	if (!e.dom.parentNode) return;
	let n = e.dom.parentNode.appendChild(document.createElement("div"));
	n.appendChild(t), n.style.cssText = "position: fixed; left: -10000px; top: 10px";
	let r = getSelection(), i = document.createRange();
	i.selectNodeContents(t), e.dom.blur(), r.removeAllRanges(), r.addRange(i), setTimeout(() => {
		n.parentNode && n.parentNode.removeChild(n), e.focus();
	}, 50);
}
var ff = hl && gl < 15 || Sl && Dl < 604;
Md.copy = Nd.cut = (e, t) => {
	let n = t, r = e.state.selection, i = n.type == "cut";
	if (r.empty) return;
	let a = ff ? null : n.clipboardData, { dom: o, text: s } = hd(e, r.content());
	a ? (n.preventDefault(), a.clearData(), a.setData("text/html", o.innerHTML), a.setData("text/plain", s)) : df(e, o), i && e.dispatch(e.state.tr.deleteSelection().scrollIntoView().setMeta("uiEvent", "cut"));
};
function pf(e) {
	return e.openStart == 0 && e.openEnd == 0 && e.content.childCount == 1 ? e.content.firstChild : null;
}
function mf(e, t) {
	if (!e.dom.parentNode) return;
	let n = e.input.shiftKey || e.state.selection.$from.parent.type.spec.code, r = e.dom.parentNode.appendChild(document.createElement(n ? "textarea" : "div"));
	n || (r.contentEditable = "true"), r.style.cssText = "position: fixed; left: -10000px; top: 10px", r.focus();
	let i = e.input.shiftKey && e.input.lastKeyCode != 45;
	setTimeout(() => {
		e.focus(), r.parentNode && r.parentNode.removeChild(r), n ? hf(e, r.value, null, i, t) : hf(e, r.textContent, r.innerHTML, i, t);
	}, 50);
}
function hf(e, t, n, r, i) {
	let a = gd(e, t, n, r, e.state.selection.$from);
	if (e.someProp("handlePaste", (t) => t(e, i, a || J.empty))) return !0;
	if (!a) return !1;
	let o = pf(a), s = o ? e.state.tr.replaceSelectionWith(o, r) : e.state.tr.replaceSelection(a);
	return e.dispatch(s.scrollIntoView().setMeta("paste", !0).setMeta("uiEvent", "paste")), !0;
}
function gf(e) {
	let t = e.getData("text/plain") || e.getData("Text");
	if (t) return t;
	let n = e.getData("text/uri-list");
	return n ? n.replace(/\r?\n/g, " ") : "";
}
Nd.paste = (e, t) => {
	let n = t;
	if (e.composing && !Tl) return;
	let r = ff ? null : n.clipboardData, i = e.input.shiftKey && e.input.lastKeyCode != 45;
	r && hf(e, gf(r), r.getData("text/html"), i, n) ? n.preventDefault() : mf(e, n);
};
var _f = class {
	constructor(e, t, n) {
		this.slice = e, this.move = t, this.node = n;
	}
}, vf = Cl ? "altKey" : "ctrlKey";
function yf(e, t) {
	let n;
	return e.someProp("dragCopies", (e) => {
		n ||= e(t);
	}), n == null ? !t[vf] : !n;
}
Md.dragstart = (e, t) => {
	let n = t, r = e.input.mouseDown;
	if (r && r.done(), !n.dataTransfer) return;
	let i = e.state.selection, a = i.empty ? null : e.posAtCoords(Ud(n)), o;
	if (!(a && a.pos >= i.from && a.pos <= (i instanceof Z ? i.to - 1 : i.to))) {
		if (r && r.mightDrag) o = Z.create(e.state.doc, r.mightDrag.pos);
		else if (n.target && n.target.nodeType == 1) {
			let t = e.docView.nearestDesc(n.target, !0);
			t && t.node.type.spec.draggable && t != e.docView && (o = Z.create(e.state.doc, t.posBefore));
		}
	}
	let { dom: s, text: c, slice: l } = hd(e, (o || e.state.selection).content());
	(!n.dataTransfer.files.length || !yl || bl > 120) && n.dataTransfer.clearData(), n.dataTransfer.setData(ff ? "Text" : "text/html", s.innerHTML), n.dataTransfer.effectAllowed = "copyMove", ff || n.dataTransfer.setData("text/plain", c), e.dragging = new _f(l, yf(e, n), o);
}, Md.dragend = (e) => {
	let t = e.dragging;
	window.setTimeout(() => {
		e.dragging == t && (e.dragging = null);
	}, 50);
}, Nd.dragover = Nd.dragenter = (e, t) => t.preventDefault(), Nd.drop = (e, t) => {
	try {
		bf(e, t, e.dragging);
	} finally {
		e.dragging = null;
	}
};
function bf(e, t, n) {
	if (!t.dataTransfer) return;
	let r = e.posAtCoords(Ud(t));
	if (!r) return;
	let i = e.state.doc.resolve(r.pos), a = n && n.slice;
	a ? e.someProp("transformPasted", (t) => {
		a = t(a, e, !1);
	}) : a = gd(e, gf(t.dataTransfer), ff ? null : t.dataTransfer.getData("text/html"), !1, i);
	let o = !!(n && yf(e, t));
	if (e.someProp("handleDrop", (n) => n(e, t, a || J.empty, o))) {
		t.preventDefault();
		return;
	}
	if (!a) return;
	t.preventDefault();
	let s = a ? nc(e.state.doc, i.pos, a) : i.pos;
	s ??= i.pos;
	let c = e.state.tr;
	if (o) {
		let { node: e } = n;
		e ? e.replace(c) : c.deleteSelection();
	}
	let l = c.mapping.map(s), u = a.openStart == 0 && a.openEnd == 0 && a.content.childCount == 1, d = c.doc;
	if (u ? c.replaceRangeWith(l, l, a.content.firstChild) : c.replaceRange(l, l, a), c.doc.eq(d)) return;
	let f = c.doc.resolve(l);
	if (u && Z.isSelectable(a.content.firstChild) && f.nodeAfter && f.nodeAfter.sameMarkup(a.content.firstChild)) c.setSelection(new Z(f));
	else {
		let t = c.mapping.map(s);
		c.mapping.maps[c.mapping.maps.length - 1].forEach((e, n, r, i) => t = i), c.setSelection(Ku(e, f, c.doc.resolve(t)));
	}
	e.focus(), e.dispatch(c.setMeta("uiEvent", "drop"));
}
Md.focus = (e) => {
	e.input.lastFocus = Date.now(), e.focused || (e.domObserver.stop(), e.dom.classList.add("ProseMirror-focused"), e.domObserver.start(), e.focused = !0, setTimeout(() => {
		e.docView && e.hasFocus() && !e.domObserver.currentSelection.eq(e.domSelectionRange()) && Lu(e);
	}, 20));
}, Md.blur = (e, t) => {
	let n = t;
	e.focused &&= (e.domObserver.stop(), e.dom.classList.remove("ProseMirror-focused"), e.domObserver.start(), n.relatedTarget && e.dom.contains(n.relatedTarget) && e.domObserver.currentSelection.clear(), !1);
}, Md.beforeinput = (e, t) => {
	if (yl && Tl && t.inputType == "deleteContentBackward") {
		e.domObserver.flushSoon();
		let { domChangeCount: t } = e.input;
		setTimeout(() => {
			if (e.input.domChangeCount != t || (e.dom.blur(), e.focus(), e.someProp("handleKeyDown", (t) => t(e, ol(8, "Backspace"))))) return;
			let { $cursor: n } = e.state.selection;
			n && n.pos > 0 && e.dispatch(e.state.tr.delete(n.pos - 1, n.pos).scrollIntoView());
		}, 50);
	}
};
for (let e in Nd) Md[e] = Nd[e];
function xf(e, t) {
	if (e == t) return !0;
	for (let n in e) if (e[n] !== t[n]) return !1;
	for (let n in t) if (!(n in e)) return !1;
	return !0;
}
var Sf = class e {
	constructor(e, t) {
		this.toDOM = e, this.spec = t || Df, this.side = this.spec.side || 0;
	}
	map(e, t, n, r) {
		let { pos: i, deleted: a } = e.mapResult(t.from + r, this.side < 0 ? -1 : 1);
		return a ? null : new Tf(i - n, i - n, this);
	}
	valid() {
		return !0;
	}
	eq(t) {
		return this == t || t instanceof e && (this.spec.key && this.spec.key == t.spec.key || this.toDOM == t.toDOM && xf(this.spec, t.spec));
	}
	destroy(e) {
		this.spec.destroy && this.spec.destroy(e);
	}
}, Cf = class e {
	constructor(e, t) {
		this.attrs = e, this.spec = t || Df;
	}
	map(e, t, n, r) {
		let i = e.map(t.from + r, this.spec.inclusiveStart ? -1 : 1) - n, a = e.map(t.to + r, this.spec.inclusiveEnd ? 1 : -1) - n;
		return i >= a ? null : new Tf(i, a, this);
	}
	valid(e, t) {
		return t.from < t.to;
	}
	eq(t) {
		return this == t || t instanceof e && xf(this.attrs, t.attrs) && xf(this.spec, t.spec);
	}
	static is(t) {
		return t.type instanceof e;
	}
	destroy() {}
}, wf = class e {
	constructor(e, t) {
		this.attrs = e, this.spec = t || Df;
	}
	map(e, t, n, r) {
		let i = e.mapResult(t.from + r, 1);
		if (i.deleted) return null;
		let a = e.mapResult(t.to + r, -1);
		return a.deleted || a.pos <= i.pos ? null : new Tf(i.pos - n, a.pos - n, this);
	}
	valid(e, t) {
		let { index: n, offset: r } = e.content.findIndex(t.from), i;
		return r == t.from && !(i = e.child(n)).isText && r + i.nodeSize == t.to;
	}
	eq(t) {
		return this == t || t instanceof e && xf(this.attrs, t.attrs) && xf(this.spec, t.spec);
	}
	destroy() {}
}, Tf = class e {
	constructor(e, t, n) {
		this.from = e, this.to = t, this.type = n;
	}
	copy(t, n) {
		return new e(t, n, this.type);
	}
	eq(e, t = 0) {
		return this.type.eq(e.type) && this.from + t == e.from && this.to + t == e.to;
	}
	map(e, t, n) {
		return this.type.map(e, this, t, n);
	}
	static widget(t, n, r) {
		return new e(t, t, new Sf(n, r));
	}
	static inline(t, n, r, i) {
		return new e(t, n, new Cf(r, i));
	}
	static node(t, n, r, i) {
		return new e(t, n, new wf(r, i));
	}
	get spec() {
		return this.type.spec;
	}
	get inline() {
		return this.type instanceof Cf;
	}
	get widget() {
		return this.type instanceof Sf;
	}
}, Ef = [], Df = {}, Of = class e {
	constructor(e, t) {
		this.local = e.length ? e : Ef, this.children = t.length ? t : Ef;
	}
	static create(e, t) {
		return t.length ? If(t, e, 0, Df) : kf;
	}
	find(e, t, n) {
		let r = [];
		return this.findInner(e ?? 0, t ?? 1e9, r, 0, n), r;
	}
	findInner(e, t, n, r, i) {
		for (let a = 0; a < this.local.length; a++) {
			let o = this.local[a];
			o.from <= t && o.to >= e && (!i || i(o.spec)) && n.push(o.copy(o.from + r, o.to + r));
		}
		for (let a = 0; a < this.children.length; a += 3) if (this.children[a] < t && this.children[a + 1] > e) {
			let o = this.children[a] + 1;
			this.children[a + 2].findInner(e - o, t - o, n, r + o, i);
		}
	}
	map(e, t, n) {
		return this == kf || e.maps.length == 0 ? this : this.mapInner(e, t, 0, 0, n || Df);
	}
	mapInner(t, n, r, i, a) {
		let o;
		for (let e = 0; e < this.local.length; e++) {
			let s = this.local[e].map(t, r, i);
			s && s.type.valid(n, s) ? (o ||= []).push(s) : a.onRemove && a.onRemove(this.local[e].spec);
		}
		return this.children.length ? jf(this.children, o || [], t, n, r, i, a) : o ? new e(o.sort(Lf), Ef) : kf;
	}
	add(t, n) {
		return n.length ? this == kf ? e.create(t, n) : this.addInner(t, n, 0) : this;
	}
	addInner(t, n, r) {
		let i, a = 0;
		t.forEach((e, t) => {
			let o = t + r, s;
			if (s = Pf(n, e, o)) {
				for (i ||= this.children.slice(); a < i.length && i[a] < t;) a += 3;
				i[a] == t ? i[a + 2] = i[a + 2].addInner(e, s, o + 1) : i.splice(a, 0, t, t + e.nodeSize, If(s, e, o + 1, Df)), a += 3;
			}
		});
		let o = Mf(a ? Ff(n) : n, -r);
		for (let e = 0; e < o.length; e++) o[e].type.valid(t, o[e]) || o.splice(e--, 1);
		return new e(o.length ? this.local.concat(o).sort(Lf) : this.local, i || this.children);
	}
	remove(e) {
		return e.length == 0 || this == kf ? this : this.removeInner(e, 0);
	}
	removeInner(t, n) {
		let r = this.children, i = this.local;
		for (let e = 0; e < r.length; e += 3) {
			let i, a = r[e] + n, o = r[e + 1] + n;
			for (let e = 0, n; e < t.length; e++) (n = t[e]) && n.from > a && n.to < o && (t[e] = null, (i ||= []).push(n));
			if (!i) continue;
			r == this.children && (r = this.children.slice());
			let s = r[e + 2].removeInner(i, a + 1);
			s == kf ? (r.splice(e, 3), e -= 3) : r[e + 2] = s;
		}
		if (i.length) {
			for (let e = 0, r; e < t.length; e++) if (r = t[e]) for (let e = 0; e < i.length; e++) i[e].eq(r, n) && (i == this.local && (i = this.local.slice()), i.splice(e--, 1));
		}
		return r == this.children && i == this.local ? this : i.length || r.length ? new e(i, r) : kf;
	}
	forChild(t, n) {
		if (this == kf) return this;
		if (n.isLeaf) return e.empty;
		let r, i;
		for (let e = 0; e < this.children.length; e += 3) if (this.children[e] >= t) {
			this.children[e] == t && (r = this.children[e + 2]);
			break;
		}
		let a = t + 1, o = a + n.content.size;
		for (let e = 0; e < this.local.length; e++) {
			let t = this.local[e];
			if (t.from < o && t.to > a && t.type instanceof Cf) {
				let e = Math.max(a, t.from) - a, n = Math.min(o, t.to) - a;
				e < n && (i ||= []).push(t.copy(e, n));
			}
		}
		if (i) {
			let t = new e(i.sort(Lf), Ef);
			return r ? new Af([t, r]) : t;
		}
		return r || kf;
	}
	eq(t) {
		if (this == t) return !0;
		if (!(t instanceof e) || this.local.length != t.local.length || this.children.length != t.children.length) return !1;
		for (let e = 0; e < this.local.length; e++) if (!this.local[e].eq(t.local[e])) return !1;
		for (let e = 0; e < this.children.length; e += 3) if (this.children[e] != t.children[e] || this.children[e + 1] != t.children[e + 1] || !this.children[e + 2].eq(t.children[e + 2])) return !1;
		return !0;
	}
	locals(e) {
		return Rf(this.localsInner(e));
	}
	localsInner(e) {
		if (this == kf) return Ef;
		if (e.inlineContent || !this.local.some(Cf.is)) return this.local;
		let t = [];
		for (let e = 0; e < this.local.length; e++) this.local[e].type instanceof Cf || t.push(this.local[e]);
		return t;
	}
	forEachSet(e) {
		e(this);
	}
};
Of.empty = new Of([], []), Of.removeOverlap = Rf;
var kf = Of.empty, Af = class e {
	constructor(e) {
		this.members = e;
	}
	map(t, n) {
		let r = this.members.map((e) => e.map(t, n, Df));
		return e.from(r);
	}
	forChild(t, n) {
		if (n.isLeaf) return Of.empty;
		let r = [];
		for (let i = 0; i < this.members.length; i++) {
			let a = this.members[i].forChild(t, n);
			a != kf && (a instanceof e ? r = r.concat(a.members) : r.push(a));
		}
		return e.from(r);
	}
	eq(t) {
		if (!(t instanceof e) || t.members.length != this.members.length) return !1;
		for (let e = 0; e < this.members.length; e++) if (!this.members[e].eq(t.members[e])) return !1;
		return !0;
	}
	locals(e) {
		let t, n = !0;
		for (let r = 0; r < this.members.length; r++) {
			let i = this.members[r].localsInner(e);
			if (i.length) if (!t) t = i;
			else {
				n &&= (t = t.slice(), !1);
				for (let e = 0; e < i.length; e++) t.push(i[e]);
			}
		}
		return t ? Rf(n ? t : t.sort(Lf)) : Ef;
	}
	static from(t) {
		switch (t.length) {
			case 0: return kf;
			case 1: return t[0];
			default: return new e(t.every((e) => e instanceof Of) ? t : t.reduce((e, t) => e.concat(t instanceof Of ? t : t.members), []));
		}
	}
	forEachSet(e) {
		for (let t = 0; t < this.members.length; t++) this.members[t].forEachSet(e);
	}
};
function jf(e, t, n, r, i, a, o) {
	let s = e.slice();
	for (let e = 0, t = a; e < n.maps.length; e++) {
		let r = 0;
		n.maps[e].forEach((e, n, i, a) => {
			let o = a - i - (n - e);
			for (let i = 0; i < s.length; i += 3) {
				let a = s[i + 1];
				if (a < 0 || e > a + t - r) continue;
				let c = s[i] + t - r;
				n >= c ? s[i + 1] = e <= c ? -2 : -1 : e >= t && o && (s[i] += o, s[i + 1] += o);
			}
			r += o;
		}), t = n.maps[e].map(t, -1);
	}
	let c = !1;
	for (let t = 0; t < s.length; t += 3) if (s[t + 1] < 0) {
		if (s[t + 1] == -2) {
			c = !0, s[t + 1] = -1;
			continue;
		}
		let l = n.map(e[t] + a), u = l - i;
		if (u < 0 || u >= r.content.size) {
			c = !0;
			continue;
		}
		let d = n.map(e[t + 1] + a, -1) - i, { index: f, offset: p } = r.content.findIndex(u), m = r.maybeChild(f);
		if (m && p == u && p + m.nodeSize == d) {
			let r = s[t + 2].mapInner(n, m, l + 1, e[t] + a + 1, o);
			r == kf ? (s[t + 1] = -2, c = !0) : (s[t] = u, s[t + 1] = d, s[t + 2] = r);
		} else c = !0;
	}
	if (c) {
		let c = If(Nf(s, e, t, n, i, a, o), r, 0, o);
		t = c.local;
		for (let e = 0; e < s.length; e += 3) s[e + 1] < 0 && (s.splice(e, 3), e -= 3);
		for (let e = 0, t = 0; e < c.children.length; e += 3) {
			let n = c.children[e];
			for (; t < s.length && s[t] < n;) t += 3;
			s.splice(t, 0, c.children[e], c.children[e + 1], c.children[e + 2]);
		}
	}
	return new Of(t.sort(Lf), s);
}
function Mf(e, t) {
	if (!t || !e.length) return e;
	let n = [];
	for (let r = 0; r < e.length; r++) {
		let i = e[r];
		n.push(new Tf(i.from + t, i.to + t, i.type));
	}
	return n;
}
function Nf(e, t, n, r, i, a, o) {
	function s(e, t) {
		for (let a = 0; a < e.local.length; a++) {
			let s = e.local[a].map(r, i, t);
			s ? n.push(s) : o.onRemove && o.onRemove(e.local[a].spec);
		}
		for (let n = 0; n < e.children.length; n += 3) s(e.children[n + 2], e.children[n] + t + 1);
	}
	for (let n = 0; n < e.length; n += 3) e[n + 1] == -1 && s(e[n + 2], t[n] + a + 1);
	return n;
}
function Pf(e, t, n) {
	if (t.isLeaf) return null;
	let r = n + t.nodeSize, i = null;
	for (let t = 0, a; t < e.length; t++) (a = e[t]) && a.from > n && a.to < r && ((i ||= []).push(a), e[t] = null);
	return i;
}
function Ff(e) {
	let t = [];
	for (let n = 0; n < e.length; n++) e[n] != null && t.push(e[n]);
	return t;
}
function If(e, t, n, r) {
	let i = [], a = !1;
	t.forEach((t, o) => {
		let s = Pf(e, t, o + n);
		if (s) {
			a = !0;
			let e = If(s, t, n + o + 1, r);
			e != kf && i.push(o, o + t.nodeSize, e);
		}
	});
	let o = Mf(a ? Ff(e) : e, -n).sort(Lf);
	for (let e = 0; e < o.length; e++) o[e].type.valid(t, o[e]) || (r.onRemove && r.onRemove(o[e].spec), o.splice(e--, 1));
	return o.length || i.length ? new Of(o, i) : kf;
}
function Lf(e, t) {
	return e.from - t.from || e.to - t.to;
}
function Rf(e) {
	let t = e;
	for (let n = 0; n < t.length - 1; n++) {
		let r = t[n];
		if (r.from != r.to) for (let i = n + 1; i < t.length; i++) {
			let a = t[i];
			if (a.from == r.from) {
				a.to != r.to && (t == e && (t = e.slice()), t[i] = a.copy(a.from, r.to), zf(t, i + 1, a.copy(r.to, a.to)));
				continue;
			} else {
				a.from < r.to && (t == e && (t = e.slice()), t[n] = r.copy(r.from, a.from), zf(t, i, r.copy(a.from, r.to)));
				break;
			}
		}
	}
	return t;
}
function zf(e, t, n) {
	for (; t < e.length && Lf(n, e[t]) > 0;) t++;
	e.splice(t, 0, n);
}
function Bf(e) {
	let t = [];
	return e.someProp("decorations", (n) => {
		let r = n(e.state);
		r && r != kf && t.push(r);
	}), e.cursorWrapper && t.push(Of.create(e.state.doc, [e.cursorWrapper.deco])), Af.from(t);
}
var Vf = {
	childList: !0,
	characterData: !0,
	characterDataOldValue: !0,
	attributes: !0,
	attributeOldValue: !0,
	subtree: !0
}, Hf = hl && gl <= 11, Uf = class {
	constructor() {
		this.anchorNode = null, this.anchorOffset = 0, this.focusNode = null, this.focusOffset = 0;
	}
	set(e) {
		this.anchorNode = e.anchorNode, this.anchorOffset = e.anchorOffset, this.focusNode = e.focusNode, this.focusOffset = e.focusOffset;
	}
	clear() {
		this.anchorNode = this.focusNode = null;
	}
	eq(e) {
		return e.anchorNode == this.anchorNode && e.anchorOffset == this.anchorOffset && e.focusNode == this.focusNode && e.focusOffset == this.focusOffset;
	}
}, Wf = class {
	constructor(e, t) {
		this.view = e, this.handleDOMChange = t, this.queue = [], this.flushingSoon = -1, this.observer = null, this.currentSelection = new Uf(), this.onCharData = null, this.suppressingSelectionUpdates = !1, this.lastChangedTextNode = null, this.observer = window.MutationObserver && new window.MutationObserver((t) => {
			for (let e = 0; e < t.length; e++) this.queue.push(t[e]);
			hl && gl <= 11 && t.some((e) => e.type == "childList" && e.removedNodes.length || e.type == "characterData" && e.oldValue.length > e.target.nodeValue.length) ? this.flushSoon() : xl && e.composing && t.some((e) => e.type == "childList" && e.target.nodeName == "TR") ? (e.input.badSafariComposition = !0, this.flushSoon()) : this.flush();
		}), Hf && (this.onCharData = (e) => {
			this.queue.push({
				target: e.target,
				type: "characterData",
				oldValue: e.prevValue
			}), this.flushSoon();
		}), this.onSelectionChange = this.onSelectionChange.bind(this);
	}
	flushSoon() {
		this.flushingSoon < 0 && (this.flushingSoon = window.setTimeout(() => {
			this.flushingSoon = -1, this.flush();
		}, 20));
	}
	forceFlush() {
		this.flushingSoon > -1 && (window.clearTimeout(this.flushingSoon), this.flushingSoon = -1, this.flush());
	}
	start() {
		this.observer && (this.observer.takeRecords(), this.observer.observe(this.view.dom, Vf)), this.onCharData && this.view.dom.addEventListener("DOMCharacterDataModified", this.onCharData), this.connectSelection();
	}
	stop() {
		if (this.observer) {
			let e = this.observer.takeRecords();
			if (e.length) {
				for (let t = 0; t < e.length; t++) this.queue.push(e[t]);
				window.setTimeout(() => this.flush(), 20);
			}
			this.observer.disconnect();
		}
		this.onCharData && this.view.dom.removeEventListener("DOMCharacterDataModified", this.onCharData), this.disconnectSelection();
	}
	connectSelection() {
		this.view.dom.ownerDocument.addEventListener("selectionchange", this.onSelectionChange);
	}
	disconnectSelection() {
		this.view.dom.ownerDocument.removeEventListener("selectionchange", this.onSelectionChange);
	}
	suppressSelectionUpdates() {
		this.suppressingSelectionUpdates = !0, setTimeout(() => this.suppressingSelectionUpdates = !1, 50);
	}
	onSelectionChange() {
		if (qu(this.view)) {
			if (this.suppressingSelectionUpdates) return Lu(this.view);
			if (hl && gl <= 11 && !this.view.state.selection.empty) {
				let e = this.view.domSelectionRange();
				if (e.focusNode && Zc(e.focusNode, e.focusOffset, e.anchorNode, e.anchorOffset)) return this.flushSoon();
			}
			this.flush();
		}
	}
	setCurSelection() {
		this.currentSelection.set(this.view.domSelectionRange());
	}
	ignoreSelectionChange(e) {
		if (!e.focusNode) return !0;
		let t = /* @__PURE__ */ new Set(), n;
		for (let n = e.focusNode; n; n = qc(n)) t.add(n);
		for (let r = e.anchorNode; r; r = qc(r)) if (t.has(r)) {
			n = r;
			break;
		}
		let r = n && this.view.docView.nearestDesc(n);
		if (r && r.ignoreMutation({
			type: "selection",
			target: n.nodeType == 3 ? n.parentNode : n
		})) return this.setCurSelection(), !0;
	}
	pendingRecords() {
		if (this.observer) for (let e of this.observer.takeRecords()) this.queue.push(e);
		return this.queue;
	}
	flush() {
		let { view: e } = this;
		if (!e.docView || this.flushingSoon > -1) return;
		let t = this.pendingRecords();
		t.length && (this.queue = []);
		let n = e.domSelectionRange(), r = !this.suppressingSelectionUpdates && !this.currentSelection.eq(n) && qu(e) && !this.ignoreSelectionChange(n), i = -1, a = -1, o = !1, s = [];
		if (e.editable) for (let e = 0; e < t.length; e++) {
			let n = this.registerMutation(t[e], s);
			n && (i = i < 0 ? n.from : Math.min(n.from, i), a = a < 0 ? n.to : Math.max(n.to, a), n.typeOver && (o = !0));
		}
		if (s.some((e) => e.nodeName == "BR") && (e.input.lastKeyCode == 8 || e.input.lastKeyCode == 46)) {
			for (let e of s) if (e.nodeName == "BR" && e.parentNode) {
				let t = e.nextSibling;
				for (; t && t.nodeType == 1;) {
					if (t.contentEditable == "false") {
						e.parentNode.removeChild(e);
						break;
					}
					t = t.firstChild;
				}
			}
		} else if (_l && s.length) {
			let t = s.filter((e) => e.nodeName == "BR");
			if (t.length == 2) {
				let [e, n] = t;
				e.parentNode && e.parentNode.parentNode == n.parentNode ? n.remove() : e.remove();
			} else {
				let { focusNode: n } = this.currentSelection;
				for (let r of t) {
					let t = r.parentNode;
					t && t.nodeName == "LI" && (!n || Xf(e, n) != t) && r.remove();
				}
			}
		}
		let c = null;
		i < 0 && r && e.input.lastFocus > Date.now() - 200 && Math.max(e.input.lastTouch, e.input.lastClick.time) < Date.now() - 300 && al(n) && (c = Fu(e)) && c.eq(Y.near(e.state.doc.resolve(0), 1)) ? (e.input.lastFocus = 0, Lu(e), this.currentSelection.set(n), e.scrollToSelection()) : (i > -1 || r) && (i > -1 && (e.docView.markDirty(i, a), qf(e)), e.input.badSafariComposition && (e.input.badSafariComposition = !1, Zf(e, s)), this.handleDOMChange(i, a, o, s), e.docView && e.docView.dirty ? e.updateState(e.state) : this.currentSelection.eq(n) || Lu(e), this.currentSelection.set(n));
	}
	registerMutation(e, t) {
		if (t.indexOf(e.target) > -1) return null;
		let n = this.view.docView.nearestDesc(e.target);
		if (e.type == "attributes" && (n == this.view.docView || e.attributeName == "contenteditable" || e.attributeName == "style" && !e.oldValue && !e.target.getAttribute("style")) || !n || n.ignoreMutation(e)) return null;
		if (e.type == "childList") {
			for (let n = 0; n < e.addedNodes.length; n++) {
				let r = e.addedNodes[n];
				t.push(r), r.nodeType == 3 && (this.lastChangedTextNode = r);
			}
			if (n.contentDOM && n.contentDOM != n.dom && !n.contentDOM.contains(e.target)) return {
				from: n.posBefore,
				to: n.posAfter
			};
			let r = e.previousSibling, i = e.nextSibling;
			if (hl && gl <= 11 && e.addedNodes.length) for (let t = 0; t < e.addedNodes.length; t++) {
				let { previousSibling: n, nextSibling: a } = e.addedNodes[t];
				(!n || Array.prototype.indexOf.call(e.addedNodes, n) < 0) && (r = n), (!a || Array.prototype.indexOf.call(e.addedNodes, a) < 0) && (i = a);
			}
			let a = r && r.parentNode == e.target ? Kc(r) + 1 : 0, o = n.localPosFromDOM(e.target, a, -1), s = i && i.parentNode == e.target ? Kc(i) : e.target.childNodes.length;
			return {
				from: o,
				to: n.localPosFromDOM(e.target, s, 1)
			};
		} else if (e.type == "attributes") return {
			from: n.posAtStart - n.border,
			to: n.posAtEnd + n.border
		};
		else return this.lastChangedTextNode = e.target, {
			from: n.posAtStart,
			to: n.posAtEnd,
			typeOver: e.target.nodeValue == e.oldValue
		};
	}
}, Gf = /* @__PURE__ */ new WeakMap(), Kf = !1;
function qf(e) {
	if (!Gf.has(e) && (Gf.set(e, null), [
		"normal",
		"nowrap",
		"pre-line"
	].indexOf(getComputedStyle(e.dom).whiteSpace) !== -1)) {
		if (e.requiresGeckoHackNode = _l, Kf) return;
		console.warn("ProseMirror expects the CSS white-space property to be set, preferably to 'pre-wrap'. It is recommended to load style/prosemirror.css from the prosemirror-view package."), Kf = !0;
	}
}
function Jf(e, t) {
	let n = t.startContainer, r = t.startOffset, i = t.endContainer, a = t.endOffset, o = e.domAtPos(e.state.selection.anchor);
	return Zc(o.node, o.offset, i, a) && ([n, r, i, a] = [
		i,
		a,
		n,
		r
	]), {
		anchorNode: n,
		anchorOffset: r,
		focusNode: i,
		focusOffset: a
	};
}
function Yf(e, t) {
	if (t.getComposedRanges) {
		let n = t.getComposedRanges(e.root)[0];
		if (n) return Jf(e, n);
	}
	let n;
	function r(e) {
		e.preventDefault(), e.stopImmediatePropagation(), n = e.getTargetRanges()[0];
	}
	return e.dom.addEventListener("beforeinput", r, !0), document.execCommand("indent"), e.dom.removeEventListener("beforeinput", r, !0), n ? Jf(e, n) : null;
}
function Xf(e, t) {
	for (let n = t.parentNode; n && n != e.dom; n = n.parentNode) {
		let t = e.docView.nearestDesc(n, !0);
		if (t && t.node.isBlock) return n;
	}
	return null;
}
function Zf(e, t) {
	let { focusNode: n, focusOffset: r } = e.domSelectionRange();
	for (let i of t) if (i.parentNode?.nodeName == "TR") {
		let t = i.nextSibling;
		for (; t && t.nodeName != "TD" && t.nodeName != "TH";) t = t.nextSibling;
		if (t) {
			let a = t;
			for (;;) {
				let e = a.firstChild;
				if (!e || e.nodeType != 1 || e.contentEditable == "false" || /^(BR|IMG)$/.test(e.nodeName)) break;
				a = e;
			}
			a.insertBefore(i, a.firstChild), n == i && e.domSelection().collapse(i, r);
		} else i.parentNode.removeChild(i);
	}
}
function Qf(e, t, n) {
	let { node: r, fromOffset: i, toOffset: a, from: o, to: s } = e.docView.parseRange(t, n), c = e.domSelectionRange(), l, u = c.anchorNode;
	if (u && e.dom.contains(u.nodeType == 1 ? u : u.parentNode) && (l = [{
		node: u,
		offset: c.anchorOffset
	}], al(c) || l.push({
		node: c.focusNode,
		offset: c.focusOffset
	})), yl && e.input.lastKeyCode === 8) for (let e = a; e > i; e--) {
		let t = r.childNodes[e - 1], n = t.pmViewDesc;
		if (t.nodeName == "BR" && !n) {
			a = e;
			break;
		}
		if (!n || n.size) break;
	}
	let d = e.state.doc, f = e.someProp("domParser") || Vo.fromSchema(e.state.schema), p = d.resolve(o), m = null, h = f.parse(r, {
		topNode: p.parent,
		topMatch: p.parent.contentMatchAt(p.index()),
		topOpen: !0,
		from: i,
		to: a,
		preserveWhitespace: p.parent.type.whitespace == "pre" ? "full" : !0,
		findPositions: l,
		ruleFromNode: $f,
		context: p
	});
	if (l && l[0].pos != null) {
		let e = l[0].pos, t = l[1] && l[1].pos;
		t ??= e, m = {
			anchor: e + o,
			head: t + o
		};
	}
	return {
		doc: h,
		sel: m,
		from: o,
		to: s
	};
}
function $f(e) {
	let t = e.pmViewDesc;
	if (t) return t.parseRule();
	if (e.nodeName == "BR" && e.parentNode) {
		if (xl && /^(ul|ol)$/i.test(e.parentNode.nodeName)) {
			let e = document.createElement("div");
			return e.appendChild(document.createElement("li")), { skip: e };
		} else if (e.parentNode.lastChild == e || xl && /^(tr|table)$/i.test(e.parentNode.nodeName)) return { ignore: !0 };
	} else if (e.nodeName == "IMG" && e.getAttribute("mark-placeholder")) return { ignore: !0 };
	return null;
}
var ep = /^(a|abbr|acronym|b|bd[io]|big|br|button|cite|code|data(list)?|del|dfn|em|i|img|ins|kbd|label|map|mark|meter|output|q|ruby|s|samp|small|span|strong|su[bp]|time|u|tt|var)$/i;
function tp(e, t, n, r, i) {
	let a = e.input.compositionPendingChanges || (e.composing ? e.input.compositionID : 0);
	if (e.input.compositionPendingChanges = 0, t < 0) {
		let t = e.input.lastSelectionTime > Date.now() - 50 ? e.input.lastSelectionOrigin : null, n = Fu(e, t);
		if (n && !e.state.selection.eq(n)) {
			if (yl && Tl && e.input.lastKeyCode === 13 && Date.now() - 100 < e.input.lastKeyCodeTime && e.someProp("handleKeyDown", (t) => t(e, ol(13, "Enter")))) return;
			let r = e.state.tr.setSelection(n);
			t == "pointer" ? r.setMeta("pointer", !0) : t == "key" && r.scrollIntoView(), a && r.setMeta("composition", a), e.dispatch(r);
		}
		return;
	}
	let o = e.state.doc.resolve(t), s = o.sharedDepth(n);
	t = o.before(s + 1), n = e.state.doc.resolve(n).after(s + 1);
	let c = e.state.selection, l = Qf(e, t, n), u = e.state.doc, d = u.slice(l.from, l.to), f, p;
	e.input.lastKeyCode === 8 && Date.now() - 100 < e.input.lastKeyCodeTime ? (f = e.state.selection.to, p = "end") : (f = e.state.selection.from, p = "start"), e.input.lastKeyCode = null;
	let m = op(d.content, l.doc.content, l.from, f, p);
	if (m && e.input.domChangeCount++, (Sl && e.input.lastIOSEnter > Date.now() - 225 || Tl) && i.some((e) => e.nodeType == 1 && !ep.test(e.nodeName)) && (!m || m.endA >= m.endB) && e.someProp("handleKeyDown", (t) => t(e, ol(13, "Enter")))) {
		e.input.lastIOSEnter = 0;
		return;
	}
	if (!m) if (r && c instanceof X && !c.empty && c.$head.sameParent(c.$anchor) && !e.composing && !(l.sel && l.sel.anchor != l.sel.head)) m = {
		start: c.from,
		endA: c.to,
		endB: c.to
	};
	else {
		if (l.sel) {
			let t = np(e, e.state.doc, l.sel);
			if (t && !t.eq(e.state.selection)) {
				let n = e.state.tr.setSelection(t);
				a && n.setMeta("composition", a), e.dispatch(n);
			}
		}
		return;
	}
	e.state.selection.from < e.state.selection.to && m.start == m.endB && e.state.selection instanceof X && (m.start > e.state.selection.from && m.start <= e.state.selection.from + 2 && e.state.selection.from >= l.from ? m.start = e.state.selection.from : m.endA < e.state.selection.to && m.endA >= e.state.selection.to - 2 && e.state.selection.to <= l.to && (m.endB += e.state.selection.to - m.endA, m.endA = e.state.selection.to)), hl && gl <= 11 && m.endB == m.start + 1 && m.endA == m.start && m.start > l.from && l.doc.textBetween(m.start - l.from - 1, m.start - l.from + 1) == " \xA0" && (m.start--, m.endA--, m.endB--);
	let h = l.doc.resolveNoCache(m.start - l.from), g = l.doc.resolveNoCache(m.endB - l.from), _ = u.resolve(m.start), v = h.sameParent(g) && h.parent.inlineContent && _.end() >= m.endA;
	if ((Sl && e.input.lastIOSEnter > Date.now() - 225 && (!v || i.some((e) => e.nodeName == "DIV" || e.nodeName == "P")) || !v && h.pos < l.doc.content.size && (!h.sameParent(g) || !h.parent.inlineContent) && h.pos < g.pos && !/\S/.test(l.doc.textBetween(h.pos, g.pos, "", ""))) && e.someProp("handleKeyDown", (t) => t(e, ol(13, "Enter")))) {
		e.input.lastIOSEnter = 0;
		return;
	}
	if (e.state.selection.anchor > m.start && ip(u, m.start, m.endA, h, g) && e.someProp("handleKeyDown", (t) => t(e, ol(8, "Backspace")))) {
		Tl && yl && e.domObserver.suppressSelectionUpdates();
		return;
	}
	yl && m.endB == m.start && (e.input.lastChromeDelete = Date.now()), Tl && !v && h.start() != g.start() && g.parentOffset == 0 && h.depth == g.depth && l.sel && l.sel.anchor == l.sel.head && l.sel.head == m.endA && (m.endB -= 2, g = l.doc.resolveNoCache(m.endB - l.from), setTimeout(() => {
		e.someProp("handleKeyDown", function(t) {
			return t(e, ol(13, "Enter"));
		});
	}, 20));
	let y = m.start, b = m.endA, x = (t) => {
		let n = t || e.state.tr.replace(y, b, l.doc.slice(m.start - l.from, m.endB - l.from));
		if (l.sel) {
			let t = np(e, n.doc, l.sel);
			t && !(yl && e.composing && t.empty && (m.start != m.endB || e.input.lastChromeDelete < Date.now() - 100) && (t.head == y || t.head == n.mapping.map(b) - 1) || hl && t.empty && t.head == y) && n.setSelection(t);
		}
		return a && n.setMeta("composition", a), n.scrollIntoView();
	}, S;
	if (v) if (h.pos == g.pos) {
		hl && gl <= 11 && h.parentOffset == 0 && (e.domObserver.suppressSelectionUpdates(), setTimeout(() => Lu(e), 20));
		let t = x(e.state.tr.delete(y, b)), n = u.resolve(m.start).marksAcross(u.resolve(m.endA));
		n && t.ensureMarks(n), e.dispatch(t);
	} else if (m.endA == m.endB && (S = rp(h.parent.content.cut(h.parentOffset, g.parentOffset), _.parent.content.cut(_.parentOffset, m.endA - _.start())))) {
		let t = x(e.state.tr);
		S.type == "add" ? t.addMark(y, b, S.mark) : t.removeMark(y, b, S.mark), e.dispatch(t);
	} else if (h.parent.child(h.index()).isText && h.index() == g.index() - +!g.textOffset) {
		let t = h.parent.textBetween(h.parentOffset, g.parentOffset), n = () => x(e.state.tr.insertText(t, y, b));
		e.someProp("handleTextInput", (r) => r(e, y, b, t, n)) || e.dispatch(n());
	} else e.dispatch(x());
	else e.dispatch(x());
}
function np(e, t, n) {
	return Math.max(n.anchor, n.head) > t.content.size ? null : Ku(e, t.resolve(n.anchor), t.resolve(n.head));
}
function rp(e, t) {
	let n = e.firstChild.marks, r = t.firstChild.marks, i = n, a = r, o, s, c;
	for (let e = 0; e < r.length; e++) i = r[e].removeFromSet(i);
	for (let e = 0; e < n.length; e++) a = n[e].removeFromSet(a);
	if (i.length == 1 && a.length == 0) s = i[0], o = "add", c = (e) => e.mark(s.addToSet(e.marks));
	else if (i.length == 0 && a.length == 1) s = a[0], o = "remove", c = (e) => e.mark(s.removeFromSet(e.marks));
	else return null;
	let l = [];
	for (let e = 0; e < t.childCount; e++) l.push(c(t.child(e)));
	if (q.from(l).eq(e)) return {
		mark: s,
		type: o
	};
}
function ip(e, t, n, r, i) {
	if (n - t <= i.pos - r.pos || ap(r, !0, !1) < i.pos) return !1;
	let a = e.resolve(t);
	if (!r.parent.isTextblock) {
		let e = a.nodeAfter;
		return e != null && n == t + e.nodeSize;
	}
	if (a.parentOffset < a.parent.content.size || !a.parent.isTextblock) return !1;
	let o = e.resolve(ap(a, !0, !0));
	return !o.parent.isTextblock || o.pos > n || ap(o, !0, !1) < n ? !1 : r.parent.content.cut(r.parentOffset).eq(o.parent.content);
}
function ap(e, t, n) {
	let r = e.depth, i = t ? e.end() : e.pos;
	for (; r > 0 && (t || e.indexAfter(r) == e.node(r).childCount);) r--, i++, t = !1;
	if (n) {
		let t = e.node(r).maybeChild(e.indexAfter(r));
		for (; t && !t.isLeaf;) t = t.firstChild, i++;
	}
	return i;
}
function op(e, t, n, r, i) {
	let a = e.findDiffStart(t, n);
	if (a == null) return null;
	let { a: o, b: s } = e.findDiffEnd(t, n + e.size, n + t.size);
	if (i == "end") {
		let e = Math.max(0, a - Math.min(o, s));
		r -= o + e - a;
	}
	if (o < a && e.size < t.size) {
		let e = r <= a && r >= o ? a - r : 0;
		a -= e, a && a < t.size && sp(t.textBetween(a - 1, a + 1)) && (a += e ? 1 : -1), s = a + (s - o), o = a;
	} else if (s < a) {
		let t = r <= a && r >= s ? a - r : 0;
		a -= t, a && a < e.size && sp(e.textBetween(a - 1, a + 1)) && (a += t ? 1 : -1), o = a + (o - s), s = a;
	}
	return {
		start: a,
		endA: o,
		endB: s
	};
}
function sp(e) {
	if (e.length != 2) return !1;
	let t = e.charCodeAt(0), n = e.charCodeAt(1);
	return t >= 56320 && t <= 57343 && n >= 55296 && n <= 56319;
}
var cp = class {
	constructor(e, t) {
		this._root = null, this.focused = !1, this.trackWrites = null, this.mounted = !1, this.markCursor = null, this.cursorWrapper = null, this.lastSelectedViewDesc = void 0, this.input = new Fd(), this.prevDirectPlugins = [], this.pluginViews = [], this.requiresGeckoHackNode = !1, this.dragging = null, this._props = t, this.state = t.state, this.directPlugins = t.plugins || [], this.directPlugins.forEach(hp), this.dispatch = this.dispatch.bind(this), this.dom = e && e.mount || document.createElement("div"), e && (e.appendChild ? e.appendChild(this.dom) : typeof e == "function" ? e(this.dom) : e.mount && (this.mounted = !0)), this.editable = dp(this), up(this), this.nodeViews = pp(this), this.docView = hu(this.state.doc, lp(this), Bf(this), this.dom, this), this.domObserver = new Wf(this, (e, t, n, r) => tp(this, e, t, n, r)), this.domObserver.start(), Id(this), this.updatePluginViews();
	}
	get composing() {
		return this.input.composing;
	}
	get props() {
		if (this._props.state != this.state) {
			let e = this._props;
			this._props = {};
			for (let t in e) this._props[t] = e[t];
			this._props.state = this.state;
		}
		return this._props;
	}
	update(e) {
		e.handleDOMEvents != this._props.handleDOMEvents && zd(this);
		let t = this._props;
		this._props = e, e.plugins && (e.plugins.forEach(hp), this.directPlugins = e.plugins), this.updateStateInner(e.state, t);
	}
	setProps(e) {
		let t = {};
		for (let e in this._props) t[e] = this._props[e];
		t.state = this.state;
		for (let n in e) t[n] = e[n];
		this.update(t);
	}
	updateState(e) {
		this.updateStateInner(e, this._props);
	}
	updateStateInner(e, t) {
		let n = this.state, r = !1, i = !1;
		e.storedMarks && this.composing && (sf(this), i = !0), this.state = e;
		let a = n.plugins != e.plugins || this._props.plugins != t.plugins;
		if (a || this._props.plugins != t.plugins || this._props.nodeViews != t.nodeViews) {
			let e = pp(this);
			mp(e, this.nodeViews) && (this.nodeViews = e, r = !0);
		}
		(a || t.handleDOMEvents != this._props.handleDOMEvents) && zd(this), this.editable = dp(this), up(this);
		let o = Bf(this), s = lp(this), c = n.plugins != e.plugins && !n.doc.eq(e.doc) ? "reset" : e.scrollToSelection > n.scrollToSelection ? "to selection" : "preserve", l = r || !this.docView.matchesNode(e.doc, s, o);
		(l || !e.selection.eq(n.selection)) && (i = !0);
		let u = c == "preserve" && i && this.dom.style.overflowAnchor == null && Ml(this);
		if (i) {
			this.domObserver.stop();
			let t = l && (hl || yl) && !this.composing && !n.selection.empty && !e.selection.empty && fp(n.selection, e.selection);
			if (l) {
				let n = yl ? this.trackWrites = this.domSelectionRange().focusNode : null;
				this.composing && (this.input.compositionNode = cf(this)), (r || !this.docView.update(e.doc, s, o, this)) && (this.docView.updateOuterDeco(s), this.docView.destroy(), this.docView = hu(e.doc, s, o, this.dom, this)), n && (!this.trackWrites || !this.dom.contains(this.trackWrites)) && (t = !0);
			}
			t || !(this.input.mouseDown && this.domObserver.currentSelection.eq(this.domSelectionRange()) && Yu(this)) ? Lu(this, t) : (Wu(this, e.selection), this.domObserver.setCurSelection()), this.domObserver.start();
		}
		this.updatePluginViews(n), this.dragging?.node && !n.doc.eq(e.doc) && this.updateDraggedNode(this.dragging, n), c == "reset" ? this.dom.scrollTop = 0 : c == "to selection" ? this.scrollToSelection() : u && Pl(u);
	}
	scrollToSelection() {
		let e = this.domSelectionRange().focusNode;
		if (!(!e || !this.dom.contains(e.nodeType == 1 ? e : e.parentNode)) && !this.someProp("handleScrollToSelection", (e) => e(this))) if (this.state.selection instanceof Z) {
			let t = this.docView.domAfterPos(this.state.selection.from);
			t.nodeType == 1 && jl(this, t.getBoundingClientRect(), e);
		} else jl(this, this.coordsAtPos(this.state.selection.head, 1), e);
	}
	destroyPluginViews() {
		let e;
		for (; e = this.pluginViews.pop();) e.destroy && e.destroy();
	}
	updatePluginViews(e) {
		if (!e || e.plugins != this.state.plugins || this.directPlugins != this.prevDirectPlugins) {
			this.prevDirectPlugins = this.directPlugins, this.destroyPluginViews();
			for (let e = 0; e < this.directPlugins.length; e++) {
				let t = this.directPlugins[e];
				t.spec.view && this.pluginViews.push(t.spec.view(this));
			}
			for (let e = 0; e < this.state.plugins.length; e++) {
				let t = this.state.plugins[e];
				t.spec.view && this.pluginViews.push(t.spec.view(this));
			}
		} else for (let t = 0; t < this.pluginViews.length; t++) {
			let n = this.pluginViews[t];
			n.update && n.update(this, e);
		}
	}
	updateDraggedNode(e, t) {
		let n = e.node, r = -1;
		if (n.from < this.state.doc.content.size && this.state.doc.nodeAt(n.from) == n.node) r = n.from;
		else {
			let e = n.from + (this.state.doc.content.size - t.doc.content.size);
			(e > 0 && e < this.state.doc.content.size && this.state.doc.nodeAt(e)) == n.node && (r = e);
		}
		this.dragging = new _f(e.slice, e.move, r < 0 ? void 0 : Z.create(this.state.doc, r));
	}
	someProp(e, t) {
		let n = this._props && this._props[e], r;
		if (n != null && (r = t ? t(n) : n)) return r;
		for (let n = 0; n < this.directPlugins.length; n++) {
			let i = this.directPlugins[n].props[e];
			if (i != null && (r = t ? t(i) : i)) return r;
		}
		let i = this.state.plugins;
		if (i) for (let n = 0; n < i.length; n++) {
			let a = i[n].props[e];
			if (a != null && (r = t ? t(a) : a)) return r;
		}
	}
	hasFocus() {
		if (hl) {
			let e = this.root.activeElement;
			if (e == this.dom) return !0;
			if (!e || !this.dom.contains(e)) return !1;
			for (; e && this.dom != e && this.dom.contains(e);) {
				if (e.contentEditable == "false") return !1;
				e = e.parentElement;
			}
			return !0;
		}
		return this.root.activeElement == this.dom;
	}
	focus() {
		this.domObserver.stop(), this.editable && Ll(this.dom), Lu(this), this.domObserver.start();
	}
	get root() {
		let e = this._root;
		if (e == null) {
			for (let e = this.dom.parentNode; e; e = e.parentNode) if (e.nodeType == 9 || e.nodeType == 11 && e.host) return e.getSelection || (Object.getPrototypeOf(e).getSelection = () => e.ownerDocument.getSelection()), this._root = e;
		}
		return e || document;
	}
	updateRoot() {
		this._root = null;
	}
	posAtCoords(e) {
		return Gl(this, e);
	}
	coordsAtPos(e, t = 1) {
		return Yl(this, e, t);
	}
	domAtPos(e, t = 0) {
		return this.docView.domFromPos(e, t);
	}
	nodeDOM(e) {
		let t = this.docView.descAt(e);
		return t ? t.nodeDOM : null;
	}
	posAtDOM(e, t, n = -1) {
		let r = this.docView.posFromDOM(e, t, n);
		if (r == null) throw RangeError("DOM position not inside the editor");
		return r;
	}
	endOfTextblock(e, t) {
		return au(this, t || this.state, e);
	}
	pasteHTML(e, t) {
		return hf(this, "", e, !1, t || new ClipboardEvent("paste"));
	}
	pasteText(e, t) {
		return hf(this, e, null, !0, t || new ClipboardEvent("paste"));
	}
	serializeForClipboard(e) {
		return hd(this, e);
	}
	destroy() {
		this.docView && (Rd(this), this.destroyPluginViews(), this.mounted ? (this.docView.update(this.state.doc, [], Bf(this), this), this.dom.textContent = "") : this.dom.parentNode && this.dom.parentNode.removeChild(this.dom), this.docView.destroy(), this.docView = null, Xc());
	}
	get isDestroyed() {
		return this.docView == null;
	}
	dispatchEvent(e) {
		return Hd(this, e);
	}
	domSelectionRange() {
		let e = this.domSelection();
		return e ? xl && this.root.nodeType === 11 && sl(this.dom.ownerDocument) == this.dom && Yf(this, e) || e : {
			focusNode: null,
			focusOffset: 0,
			anchorNode: null,
			anchorOffset: 0
		};
	}
	domSelection() {
		return this.root.getSelection();
	}
};
cp.prototype.dispatch = function(e) {
	let t = this._props.dispatchTransaction;
	t ? t.call(this, e) : this.updateState(this.state.apply(e));
};
function lp(e) {
	let t = Object.create(null);
	return t.class = "ProseMirror", t.contenteditable = String(e.editable), e.someProp("attributes", (n) => {
		if (typeof n == "function" && (n = n(e.state)), n) for (let e in n) e == "class" ? t.class += " " + n[e] : e == "style" ? t.style = (t.style ? t.style + ";" : "") + n[e] : !t[e] && e != "contenteditable" && e != "nodeName" && (t[e] = String(n[e]));
	}), t.translate ||= "no", [Tf.node(0, e.state.doc.content.size, t)];
}
function up(e) {
	if (e.markCursor) {
		let t = document.createElement("img");
		t.className = "ProseMirror-separator", t.setAttribute("mark-placeholder", "true"), t.setAttribute("alt", ""), e.cursorWrapper = {
			dom: t,
			deco: Tf.widget(e.state.selection.from, t, {
				raw: !0,
				marks: e.markCursor
			})
		};
	} else e.cursorWrapper = null;
}
function dp(e) {
	return !e.someProp("editable", (t) => t(e.state) === !1);
}
function fp(e, t) {
	let n = Math.min(e.$anchor.sharedDepth(e.head), t.$anchor.sharedDepth(t.head));
	return e.$anchor.start(n) != t.$anchor.start(n);
}
function pp(e) {
	let t = Object.create(null);
	function n(e) {
		for (let n in e) Object.prototype.hasOwnProperty.call(t, n) || (t[n] = e[n]);
	}
	return e.someProp("nodeViews", n), e.someProp("markViews", n), t;
}
function mp(e, t) {
	let n = 0, r = 0;
	for (let r in e) {
		if (e[r] != t[r]) return !0;
		n++;
	}
	for (let e in t) r++;
	return n != r;
}
function hp(e) {
	if (e.spec.state || e.spec.filterTransaction || e.spec.appendTransaction) throw RangeError("Plugins passed directly to the view must not have a state component");
}
for (var gp = {
	8: "Backspace",
	9: "Tab",
	10: "Enter",
	12: "NumLock",
	13: "Enter",
	16: "Shift",
	17: "Control",
	18: "Alt",
	20: "CapsLock",
	27: "Escape",
	32: " ",
	33: "PageUp",
	34: "PageDown",
	35: "End",
	36: "Home",
	37: "ArrowLeft",
	38: "ArrowUp",
	39: "ArrowRight",
	40: "ArrowDown",
	44: "PrintScreen",
	45: "Insert",
	46: "Delete",
	59: ";",
	61: "=",
	91: "Meta",
	92: "Meta",
	106: "*",
	107: "+",
	108: ",",
	109: "-",
	110: ".",
	111: "/",
	144: "NumLock",
	145: "ScrollLock",
	160: "Shift",
	161: "Shift",
	162: "Control",
	163: "Control",
	164: "Alt",
	165: "Alt",
	173: "-",
	186: ";",
	187: "=",
	188: ",",
	189: "-",
	190: ".",
	191: "/",
	192: "`",
	219: "[",
	220: "\\",
	221: "]",
	222: "'"
}, _p = {
	48: ")",
	49: "!",
	50: "@",
	51: "#",
	52: "$",
	53: "%",
	54: "^",
	55: "&",
	56: "*",
	57: "(",
	59: ":",
	61: "+",
	173: "_",
	186: ":",
	187: "+",
	188: "<",
	189: "_",
	190: ">",
	191: "?",
	192: "~",
	219: "{",
	220: "|",
	221: "}",
	222: "\""
}, vp = typeof navigator < "u" && /Mac/.test(navigator.platform), yp = typeof navigator < "u" && /MSIE \d|Trident\/(?:[7-9]|\d{2,})\..*rv:(\d+)/.exec(navigator.userAgent), bp = 0; bp < 10; bp++) gp[48 + bp] = gp[96 + bp] = String(bp);
for (var bp = 1; bp <= 24; bp++) gp[bp + 111] = "F" + bp;
for (var bp = 65; bp <= 90; bp++) gp[bp] = String.fromCharCode(bp + 32), _p[bp] = String.fromCharCode(bp);
for (var xp in gp) _p.hasOwnProperty(xp) || (_p[xp] = gp[xp]);
function Sp(e) {
	var t = !(vp && e.metaKey && e.shiftKey && !e.ctrlKey && !e.altKey || yp && e.shiftKey && e.key && e.key.length == 1 || e.key == "Unidentified") && e.key || (e.shiftKey ? _p : gp)[e.keyCode] || e.key || "Unidentified";
	return t == "Esc" && (t = "Escape"), t == "Del" && (t = "Delete"), t == "Left" && (t = "ArrowLeft"), t == "Up" && (t = "ArrowUp"), t == "Right" && (t = "ArrowRight"), t == "Down" && (t = "ArrowDown"), t;
}
//#endregion
//#region node_modules/prosemirror-keymap/dist/index.js
var Cp = typeof navigator < "u" && /Mac|iP(hone|[oa]d)/.test(navigator.platform), wp = typeof navigator < "u" && /Win/.test(navigator.platform);
function Tp(e) {
	let t = e.split(/-(?!$)/), n = t[t.length - 1];
	n == "Space" && (n = " ");
	let r, i, a, o;
	for (let e = 0; e < t.length - 1; e++) {
		let n = t[e];
		if (/^(cmd|meta|m)$/i.test(n)) o = !0;
		else if (/^a(lt)?$/i.test(n)) r = !0;
		else if (/^(c|ctrl|control)$/i.test(n)) i = !0;
		else if (/^s(hift)?$/i.test(n)) a = !0;
		else if (/^mod$/i.test(n)) Cp ? o = !0 : i = !0;
		else throw Error("Unrecognized modifier name: " + n);
	}
	return r && (n = "Alt-" + n), i && (n = "Ctrl-" + n), o && (n = "Meta-" + n), a && (n = "Shift-" + n), n;
}
function Ep(e) {
	let t = Object.create(null);
	for (let n in e) t[Tp(n)] = e[n];
	return t;
}
function Dp(e, t, n = !0) {
	return t.altKey && (e = "Alt-" + e), t.ctrlKey && (e = "Ctrl-" + e), t.metaKey && (e = "Meta-" + e), n && t.shiftKey && (e = "Shift-" + e), e;
}
function Op(e) {
	return new Hc({ props: { handleKeyDown: kp(e) } });
}
function kp(e) {
	let t = Ep(e);
	return function(e, n) {
		let r = Sp(n), i, a = t[Dp(r, n)];
		if (a && a(e.state, e.dispatch, e)) return !0;
		if (r.length == 1 && r != " ") {
			if (n.shiftKey) {
				let i = t[Dp(r, n, !1)];
				if (i && i(e.state, e.dispatch, e)) return !0;
			}
			if ((n.altKey || n.metaKey || n.ctrlKey) && !(wp && n.ctrlKey && n.altKey) && (i = gp[n.keyCode]) && i != r) {
				let r = t[Dp(i, n)];
				if (r && r(e.state, e.dispatch, e)) return !0;
			}
		}
		return !1;
	};
}
//#endregion
//#region node_modules/prosemirror-commands/dist/index.js
var Ap = (e, t) => e.selection.empty ? !1 : (t && t(e.tr.deleteSelection().scrollIntoView()), !0);
function jp(e, t) {
	let { $cursor: n } = e.selection;
	return !n || (t ? !t.endOfTextblock("backward", e) : n.parentOffset > 0) ? null : n;
}
var Mp = (e, t, n) => {
	let r = jp(e, n);
	if (!r) return !1;
	let i = Rp(r);
	if (!i) {
		let n = r.blockRange(), i = n && Is(n);
		return i == null ? !1 : (t && t(e.tr.lift(n, i).scrollIntoView()), !0);
	}
	let a = i.nodeBefore;
	if (nm(e, i, t, -1)) return !0;
	if (r.parent.content.size == 0 && (Ip(a, "end") || Z.isSelectable(a))) for (let n = r.depth;; n--) {
		let o = rc(e.doc, r.before(n), r.after(n), J.empty);
		if (o && o.slice.size < o.to - o.from) {
			if (t) {
				let n = e.tr.step(o);
				n.setSelection(Ip(a, "end") ? Y.findFrom(n.doc.resolve(n.mapping.map(i.pos, -1)), -1) : Z.create(n.doc, i.pos - a.nodeSize)), t(n.scrollIntoView());
			}
			return !0;
		}
		if (n == 1 || r.node(n - 1).childCount > 1) break;
	}
	return a.isAtom && i.depth == r.depth - 1 ? (t && t(e.tr.delete(i.pos - a.nodeSize, i.pos).scrollIntoView()), !0) : !1;
}, Np = (e, t, n) => {
	let r = jp(e, n);
	if (!r) return !1;
	let i = Rp(r);
	return i ? Fp(e, i, t) : !1;
}, Pp = (e, t, n) => {
	let r = zp(e, n);
	if (!r) return !1;
	let i = Hp(r);
	return i ? Fp(e, i, t) : !1;
};
function Fp(e, t, n) {
	let r = t.nodeBefore, i = t.pos - 1;
	for (; !r.isTextblock; i--) {
		if (r.type.spec.isolating) return !1;
		let e = r.lastChild;
		if (!e) return !1;
		r = e;
	}
	let a = t.nodeAfter, o = t.pos + 1;
	for (; !a.isTextblock; o++) {
		if (a.type.spec.isolating) return !1;
		let e = a.firstChild;
		if (!e) return !1;
		a = e;
	}
	let s = rc(e.doc, i, o, J.empty);
	if (!s || s.from != i || s instanceof ks && s.slice.size >= o - i) return !1;
	if (n) {
		let t = e.tr.step(s);
		t.setSelection(X.create(t.doc, i)), n(t.scrollIntoView());
	}
	return !0;
}
function Ip(e, t, n = !1) {
	for (let r = e; r; r = t == "start" ? r.firstChild : r.lastChild) {
		if (r.isTextblock) return !0;
		if (n && r.childCount != 1) return !1;
	}
	return !1;
}
var Lp = (e, t, n) => {
	let { $head: r, empty: i } = e.selection, a = r;
	if (!i) return !1;
	if (r.parent.isTextblock) {
		if (n ? !n.endOfTextblock("backward", e) : r.parentOffset > 0) return !1;
		a = Rp(r);
	}
	let o = a && a.nodeBefore;
	return !o || !Z.isSelectable(o) ? !1 : (t && t(e.tr.setSelection(Z.create(e.doc, a.pos - o.nodeSize)).scrollIntoView()), !0);
};
function Rp(e) {
	if (!e.parent.type.spec.isolating) for (let t = e.depth - 1; t >= 0; t--) {
		if (e.index(t) > 0) return e.doc.resolve(e.before(t + 1));
		if (e.node(t).type.spec.isolating) break;
	}
	return null;
}
function zp(e, t) {
	let { $cursor: n } = e.selection;
	return !n || (t ? !t.endOfTextblock("forward", e) : n.parentOffset < n.parent.content.size) ? null : n;
}
var Bp = (e, t, n) => {
	let r = zp(e, n);
	if (!r) return !1;
	let i = Hp(r);
	if (!i) return !1;
	let a = i.nodeAfter;
	if (nm(e, i, t, 1)) return !0;
	if (r.parent.content.size == 0 && (Ip(a, "start") || Z.isSelectable(a))) {
		let n = rc(e.doc, r.before(), r.after(), J.empty);
		if (n && n.slice.size < n.to - n.from) {
			if (t) {
				let r = e.tr.step(n);
				r.setSelection(Ip(a, "start") ? Y.findFrom(r.doc.resolve(r.mapping.map(i.pos)), 1) : Z.create(r.doc, r.mapping.map(i.pos))), t(r.scrollIntoView());
			}
			return !0;
		}
	}
	return a.isAtom && i.depth == r.depth - 1 ? (t && t(e.tr.delete(i.pos, i.pos + a.nodeSize).scrollIntoView()), !0) : !1;
}, Vp = (e, t, n) => {
	let { $head: r, empty: i } = e.selection, a = r;
	if (!i) return !1;
	if (r.parent.isTextblock) {
		if (n ? !n.endOfTextblock("forward", e) : r.parentOffset < r.parent.content.size) return !1;
		a = Hp(r);
	}
	let o = a && a.nodeAfter;
	return !o || !Z.isSelectable(o) ? !1 : (t && t(e.tr.setSelection(Z.create(e.doc, a.pos)).scrollIntoView()), !0);
};
function Hp(e) {
	if (!e.parent.type.spec.isolating) for (let t = e.depth - 1; t >= 0; t--) {
		let n = e.node(t);
		if (e.index(t) + 1 < n.childCount) return e.doc.resolve(e.after(t + 1));
		if (n.type.spec.isolating) break;
	}
	return null;
}
var Up = (e, t) => {
	let n = e.selection, r = n instanceof Z, i;
	if (r) {
		if (n.node.isTextblock || !Xs(e.doc, n.from)) return !1;
		i = n.from;
	} else if (i = $s(e.doc, n.from, -1), i == null) return !1;
	if (t) {
		let n = e.tr.join(i);
		r && n.setSelection(Z.create(n.doc, i - e.doc.resolve(i).nodeBefore.nodeSize)), t(n.scrollIntoView());
	}
	return !0;
}, Wp = (e, t) => {
	let n = e.selection, r;
	if (n instanceof Z) {
		if (n.node.isTextblock || !Xs(e.doc, n.to)) return !1;
		r = n.to;
	} else if (r = $s(e.doc, n.to, 1), r == null) return !1;
	return t && t(e.tr.join(r).scrollIntoView()), !0;
}, Gp = (e, t) => {
	let { $from: n, $to: r } = e.selection, i = n.blockRange(r), a = i && Is(i);
	return a == null ? !1 : (t && t(e.tr.lift(i, a).scrollIntoView()), !0);
}, Kp = (e, t) => {
	let { $head: n, $anchor: r } = e.selection;
	return !n.parent.type.spec.code || !n.sameParent(r) ? !1 : (t && t(e.tr.insertText("\n").scrollIntoView()), !0);
};
function qp(e) {
	for (let t = 0; t < e.edgeCount; t++) {
		let { type: n } = e.edge(t);
		if (n.isTextblock && !n.hasRequiredAttrs()) return n;
	}
	return null;
}
var Jp = (e, t) => {
	let { $head: n, $anchor: r } = e.selection;
	if (!n.parent.type.spec.code || !n.sameParent(r)) return !1;
	let i = n.node(-1), a = n.indexAfter(-1), o = qp(i.contentMatchAt(a));
	if (!o || !i.canReplaceWith(a, a, o)) return !1;
	if (t) {
		let r = n.after(), i = e.tr.replaceWith(r, r, o.createAndFill());
		i.setSelection(Y.near(i.doc.resolve(r), 1)), t(i.scrollIntoView());
	}
	return !0;
}, Yp = (e, t) => {
	let n = e.selection, { $from: r, $to: i } = n;
	if (n instanceof Oc || r.parent.inlineContent || i.parent.inlineContent) return !1;
	let a = qp(i.parent.contentMatchAt(i.indexAfter()));
	if (!a || !a.isTextblock) return !1;
	if (t) {
		let n = (!r.parentOffset && i.index() < i.parent.childCount ? r : i).pos, o = e.tr.insert(n, a.createAndFill());
		o.setSelection(X.create(o.doc, n + 1)), t(o.scrollIntoView());
	}
	return !0;
}, Xp = (e, t) => {
	let { $cursor: n } = e.selection;
	if (!n || n.parent.content.size) return !1;
	if (n.depth > 1 && n.after() != n.end(-1)) {
		let r = n.before();
		if (Js(e.doc, r)) return t && t(e.tr.split(r).scrollIntoView()), !0;
	}
	let r = n.blockRange(), i = r && Is(r);
	return i == null ? !1 : (t && t(e.tr.lift(r, i).scrollIntoView()), !0);
};
function Zp(e) {
	return (t, n) => {
		let { $from: r, $to: i } = t.selection;
		if (t.selection instanceof Z && t.selection.node.isBlock) return !r.parentOffset || !Js(t.doc, r.pos) ? !1 : (n && n(t.tr.split(r.pos).scrollIntoView()), !0);
		if (!r.depth) return !1;
		let a = [], o, s, c = !1, l = !1;
		for (let t = r.depth;; t--) if (r.node(t).isBlock) {
			c = r.end(t) == r.pos + (r.depth - t), l = r.start(t) == r.pos - (r.depth - t), s = qp(r.node(t - 1).contentMatchAt(r.indexAfter(t - 1)));
			let n = e && e(i.parent, c, r);
			a.unshift(n || (c && s ? { type: s } : null)), o = t;
			break;
		} else {
			if (t == 1) return !1;
			a.unshift(null);
		}
		let u = t.tr;
		(t.selection instanceof X || t.selection instanceof Oc) && u.deleteSelection();
		let d = u.mapping.map(r.pos), f = Js(u.doc, d, a.length, a);
		if (f ||= (a[0] = s ? { type: s } : null, Js(u.doc, d, a.length, a)), !f) return !1;
		if (u.split(d, a.length, a), !c && l && r.node(o).type != s) {
			let e = u.mapping.map(r.before(o)), t = u.doc.resolve(e);
			s && r.node(o - 1).canReplaceWith(t.index(), t.index() + 1, s) && u.setNodeMarkup(u.mapping.map(r.before(o)), s);
		}
		return n && n(u.scrollIntoView()), !0;
	};
}
var Qp = Zp(), $p = (e, t) => {
	let { $from: n, to: r } = e.selection, i, a = n.sharedDepth(r);
	return a == 0 ? !1 : (i = n.before(a), t && t(e.tr.setSelection(Z.create(e.doc, i))), !0);
}, em = (e, t) => (t && t(e.tr.setSelection(new Oc(e.doc))), !0);
function tm(e, t, n) {
	let r = t.nodeBefore, i = t.nodeAfter, a = t.index();
	return !r || !i || !r.type.compatibleContent(i.type) ? !1 : !r.content.size && t.parent.canReplace(a - 1, a) ? (n && n(e.tr.delete(t.pos - r.nodeSize, t.pos).scrollIntoView()), !0) : !t.parent.canReplace(a, a + 1) || !(i.isTextblock || Xs(e.doc, t.pos)) ? !1 : (n && n(e.tr.join(t.pos).scrollIntoView()), !0);
}
function nm(e, t, n, r) {
	let i = t.nodeBefore, a = t.nodeAfter, o, s, c = i.type.spec.isolating || a.type.spec.isolating;
	if (!c && tm(e, t, n)) return !0;
	let l = !c && t.parent.canReplace(t.index(), t.index() + 1);
	if (l && (o = (s = i.contentMatchAt(i.childCount)).findWrapping(a.type)) && s.matchType(o[0] || a.type).validEnd) {
		if (n) {
			let r = t.pos + a.nodeSize, s = q.empty;
			for (let e = o.length - 1; e >= 0; e--) s = q.from(o[e].create(null, s));
			s = q.from(i.copy(s));
			let c = e.tr.step(new As(t.pos - 1, r, t.pos, r, new J(s, 1, 0), o.length, !0)), l = c.doc.resolve(r + 2 * o.length);
			l.nodeAfter && l.nodeAfter.type == i.type && Xs(c.doc, l.pos) && c.join(l.pos), n(c.scrollIntoView());
		}
		return !0;
	}
	let u = a.type.spec.isolating || r > 0 && c ? null : Y.findFrom(t, 1), d = u && u.$from.blockRange(u.$to), f = d && Is(d);
	if (f != null && f >= t.depth) return n && n(e.tr.lift(d, f).scrollIntoView()), !0;
	if (l && Ip(a, "start", !0) && Ip(i, "end")) {
		let r = i, o = [];
		for (; o.push(r), !r.isTextblock;) r = r.lastChild;
		let s = a, c = 1;
		for (; !s.isTextblock; s = s.firstChild) c++;
		if (r.canReplace(r.childCount, r.childCount, s.content)) {
			if (n) {
				let r = q.empty;
				for (let e = o.length - 1; e >= 0; e--) r = q.from(o[e].copy(r));
				n(e.tr.step(new As(t.pos - o.length, t.pos + a.nodeSize, t.pos + c, t.pos + a.nodeSize - c, new J(r, o.length, 0), 0, !0)).scrollIntoView());
			}
			return !0;
		}
	}
	return !1;
}
function rm(e) {
	return function(t, n) {
		let r = t.selection, i = e < 0 ? r.$from : r.$to, a = i.depth;
		for (; i.node(a).isInline;) {
			if (!a) return !1;
			a--;
		}
		return i.node(a).isTextblock ? (n && n(t.tr.setSelection(X.create(t.doc, e < 0 ? i.start(a) : i.end(a)))), !0) : !1;
	};
}
var im = rm(-1), am = rm(1);
function om(e, t = null) {
	return function(n, r) {
		let { $from: i, $to: a } = n.selection, o = i.blockRange(a), s = o && Rs(o, e, t);
		return s ? (r && r(n.tr.wrap(o, s).scrollIntoView()), !0) : !1;
	};
}
function sm(e, t = null) {
	return function(n, r) {
		let i = !1;
		for (let r = 0; r < n.selection.ranges.length && !i; r++) {
			let { $from: { pos: a }, $to: { pos: o } } = n.selection.ranges[r];
			n.doc.nodesBetween(a, o, (r, a) => {
				if (i) return !1;
				if (!(!r.isTextblock || r.hasMarkup(e, t))) if (r.type == e) i = !0;
				else {
					let t = n.doc.resolve(a), r = t.index();
					i = t.parent.canReplaceWith(r, r + 1, e);
				}
			});
		}
		if (!i) return !1;
		if (r) {
			let i = n.tr;
			for (let r = 0; r < n.selection.ranges.length; r++) {
				let { $from: { pos: a }, $to: { pos: o } } = n.selection.ranges[r];
				i.setBlockType(a, o, e, t);
			}
			r(i.scrollIntoView());
		}
		return !0;
	};
}
function cm(...e) {
	return function(t, n, r) {
		for (let i = 0; i < e.length; i++) if (e[i](t, n, r)) return !0;
		return !1;
	};
}
var lm = cm(Ap, Mp, Lp), um = cm(Ap, Bp, Vp), dm = {
	Enter: cm(Kp, Yp, Xp, Qp),
	"Mod-Enter": Jp,
	Backspace: lm,
	"Mod-Backspace": lm,
	"Shift-Backspace": lm,
	Delete: um,
	"Mod-Delete": um,
	"Mod-a": em
}, fm = {
	"Ctrl-h": dm.Backspace,
	"Alt-Backspace": dm["Mod-Backspace"],
	"Ctrl-d": dm.Delete,
	"Ctrl-Alt-Backspace": dm["Mod-Delete"],
	"Alt-Delete": dm["Mod-Delete"],
	"Alt-d": dm["Mod-Delete"],
	"Ctrl-a": im,
	"Ctrl-e": am
};
for (let e in dm) fm[e] = dm[e];
typeof navigator < "u" ? /Mac|iP(hone|[oa]d)/.test(navigator.platform) : typeof os < "u" && os.platform && os.platform();
//#endregion
//#region node_modules/prosemirror-schema-list/dist/index.js
function pm(e, t = null) {
	return function(n, r) {
		let { $from: i, $to: a } = n.selection, o = i.blockRange(a);
		if (!o) return !1;
		let s = r ? n.tr : null;
		return mm(s, o, e, t) ? (r && r(s.scrollIntoView()), !0) : !1;
	};
}
function mm(e, t, n, r = null) {
	let i = !1, a = t, o = t.$from.doc;
	if (t.depth >= 2 && t.$from.node(t.depth - 1).type.compatibleContent(n) && t.startIndex == 0) {
		if (t.$from.index(t.depth - 1) == 0) return !1;
		let e = o.resolve(t.start - 2);
		a = new lo(e, e, t.depth), t.endIndex < t.parent.childCount && (t = new lo(t.$from, o.resolve(t.$to.end(t.depth)), t.depth)), i = !0;
	}
	let s = Rs(a, n, r, t);
	return s ? (e && hm(e, t, s, i, n), !0) : !1;
}
function hm(e, t, n, r, i) {
	let a = q.empty;
	for (let e = n.length - 1; e >= 0; e--) a = q.from(n[e].type.create(n[e].attrs, a));
	e.step(new As(t.start - (r ? 2 : 0), t.end, t.start, t.end, new J(a, 0, 0), n.length, !0));
	let o = 0;
	for (let e = 0; e < n.length; e++) n[e].type == i && (o = e + 1);
	let s = n.length - o, c = t.start + n.length - (r ? 2 : 0), l = t.parent;
	for (let n = t.startIndex, r = t.endIndex, i = !0; n < r; n++, i = !1) !i && Js(e.doc, c, s) && (e.split(c, s), c += 2 * s), c += l.child(n).nodeSize;
	return e;
}
function gm(e) {
	return function(t, n) {
		let { $from: r, $to: i } = t.selection, a = r.blockRange(i, (t) => t.childCount > 0 && t.firstChild.type == e);
		return a ? n ? r.node(a.depth - 1).type == e ? _m(t, n, e, a) : vm(t, n, a) : !0 : !1;
	};
}
function _m(e, t, n, r) {
	let i = e.tr, a = r.end, o = r.$to.end(r.depth);
	a < o && (i.step(new As(a - 1, o, a, o, new J(q.from(n.create(null, r.parent.copy())), 1, 0), 1, !0)), r = new lo(i.doc.resolve(r.$from.pos), i.doc.resolve(o), r.depth));
	let s = Is(r);
	if (s == null) return !1;
	i.lift(r, s);
	let c = i.doc.resolve(i.mapping.map(a, -1) - 1);
	return Xs(i.doc, c.pos) && c.nodeBefore.type == c.nodeAfter.type && i.join(c.pos), t(i.scrollIntoView()), !0;
}
function vm(e, t, n) {
	let r = e.tr, i = n.parent;
	for (let e = n.end, t = n.endIndex - 1, a = n.startIndex; t > a; t--) e -= i.child(t).nodeSize, r.delete(e - 1, e + 1);
	let a = r.doc.resolve(n.start), o = a.nodeAfter;
	if (r.mapping.map(n.end) != n.start + a.nodeAfter.nodeSize) return !1;
	let s = n.startIndex == 0, c = n.endIndex == i.childCount, l = a.node(-1), u = a.index(-1);
	if (!l.canReplace(u + +!s, u + 1, o.content.append(c ? q.empty : q.from(i)))) return !1;
	let d = a.pos, f = d + o.nodeSize;
	return r.step(new As(d - +!!s, f + +!!c, d + 1, f - 1, new J((s ? q.empty : q.from(i.copy(q.empty))).append(c ? q.empty : q.from(i.copy(q.empty))), +!s, +!c), +!s)), t(r.scrollIntoView()), !0;
}
function ym(e) {
	return function(t, n) {
		let { $from: r, $to: i } = t.selection, a = r.blockRange(i, (t) => t.childCount > 0 && t.firstChild.type == e);
		if (!a) return !1;
		let o = a.startIndex;
		if (o == 0) return !1;
		let s = a.parent, c = s.child(o - 1);
		if (c.type != e) return !1;
		if (n) {
			let r = c.lastChild && c.lastChild.type == s.type, i = q.from(r ? e.create() : null), o = new J(q.from(e.create(null, q.from(s.type.create(null, i)))), r ? 3 : 1, 0), l = a.start, u = a.end;
			n(t.tr.step(new As(l - (r ? 3 : 1), u, l, u, o, 1, !0)).scrollIntoView());
		}
		return !0;
	};
}
//#endregion
//#region node_modules/@tiptap/core/dist/index.js
function bm(e) {
	let { state: t, transaction: n } = e, { selection: r } = n, { doc: i } = n, { storedMarks: a } = n;
	return {
		...t,
		apply: t.apply.bind(t),
		applyTransaction: t.applyTransaction.bind(t),
		plugins: t.plugins,
		schema: t.schema,
		reconfigure: t.reconfigure.bind(t),
		toJSON: t.toJSON.bind(t),
		get storedMarks() {
			return a;
		},
		get selection() {
			return r;
		},
		get doc() {
			return i;
		},
		get tr() {
			return r = n.selection, i = n.doc, a = n.storedMarks, n;
		}
	};
}
var xm = class {
	constructor(e) {
		this.editor = e.editor, this.rawCommands = this.editor.extensionManager.commands, this.customState = e.state;
	}
	get hasCustomState() {
		return !!this.customState;
	}
	get state() {
		return this.customState || this.editor.state;
	}
	get commands() {
		let { rawCommands: e, editor: t, state: n } = this, { view: r } = t, { tr: i } = n, a = this.buildProps(i);
		return Object.fromEntries(Object.entries(e).map(([e, t]) => [e, (...e) => {
			let n = t(...e)(a);
			return !i.getMeta("preventDispatch") && !this.hasCustomState && r.dispatch(i), n;
		}]));
	}
	get chain() {
		return () => this.createChain();
	}
	get can() {
		return () => this.createCan();
	}
	createChain(e, t = !0) {
		let { rawCommands: n, editor: r, state: i } = this, { view: a } = r, o = [], s = !!e, c = e || i.tr, l = () => (!s && t && !c.getMeta("preventDispatch") && !this.hasCustomState && a.dispatch(c), o.every((e) => e === !0)), u = {
			...Object.fromEntries(Object.entries(n).map(([e, n]) => [e, (...e) => {
				let r = this.buildProps(c, t), i = n(...e)(r);
				return o.push(i), u;
			}])),
			run: l
		};
		return u;
	}
	createCan(e) {
		let { rawCommands: t, state: n } = this, r = e || n.tr, i = this.buildProps(r, !1);
		return {
			...Object.fromEntries(Object.entries(t).map(([e, t]) => [e, (...e) => t(...e)({
				...i,
				dispatch: void 0
			})])),
			chain: () => this.createChain(r, !1)
		};
	}
	buildProps(e, t = !0) {
		let { rawCommands: n, editor: r, state: i } = this, { view: a } = r, o = {
			tr: e,
			editor: r,
			view: a,
			state: bm({
				state: i,
				transaction: e
			}),
			dispatch: t ? () => void 0 : void 0,
			chain: () => this.createChain(e, t),
			can: () => this.createCan(e),
			get commands() {
				return Object.fromEntries(Object.entries(n).map(([e, t]) => [e, (...e) => t(...e)(o)]));
			}
		};
		return o;
	}
}, Sm = class {
	constructor() {
		this.callbacks = {};
	}
	on(e, t) {
		return this.callbacks[e] || (this.callbacks[e] = []), this.callbacks[e].push(t), this;
	}
	emit(e, ...t) {
		let n = this.callbacks[e];
		return n && n.forEach((e) => e.apply(this, t)), this;
	}
	off(e, t) {
		let n = this.callbacks[e];
		return n && (t ? this.callbacks[e] = n.filter((e) => e !== t) : delete this.callbacks[e]), this;
	}
	once(e, t) {
		let n = (...r) => {
			this.off(e, n), t.apply(this, r);
		};
		return this.on(e, n);
	}
	removeAllListeners() {
		this.callbacks = {};
	}
};
function Q(e, t, n) {
	return e.config[t] === void 0 && e.parent ? Q(e.parent, t, n) : typeof e.config[t] == "function" ? e.config[t].bind({
		...n,
		parent: e.parent ? Q(e.parent, t, n) : null
	}) : e.config[t];
}
function Cm(e) {
	return {
		baseExtensions: e.filter((e) => e.type === "extension"),
		nodeExtensions: e.filter((e) => e.type === "node"),
		markExtensions: e.filter((e) => e.type === "mark")
	};
}
function wm(e) {
	let t = [], { nodeExtensions: n, markExtensions: r } = Cm(e), i = [...n, ...r], a = {
		default: null,
		rendered: !0,
		renderHTML: null,
		parseHTML: null,
		keepOnSplit: !0,
		isRequired: !1
	};
	return e.forEach((e) => {
		let n = Q(e, "addGlobalAttributes", {
			name: e.name,
			options: e.options,
			storage: e.storage,
			extensions: i
		});
		n && n().forEach((e) => {
			e.types.forEach((n) => {
				Object.entries(e.attributes).forEach(([e, r]) => {
					t.push({
						type: n,
						name: e,
						attribute: {
							...a,
							...r
						}
					});
				});
			});
		});
	}), i.forEach((e) => {
		let n = Q(e, "addAttributes", {
			name: e.name,
			options: e.options,
			storage: e.storage
		});
		if (!n) return;
		let r = n();
		Object.entries(r).forEach(([n, r]) => {
			let i = {
				...a,
				...r
			};
			typeof i?.default == "function" && (i.default = i.default()), i?.isRequired && i?.default === void 0 && delete i.default, t.push({
				type: e.name,
				name: n,
				attribute: i
			});
		});
	}), t;
}
function Tm(e, t) {
	if (typeof e == "string") {
		if (!t.nodes[e]) throw Error(`There is no node type named '${e}'. Maybe you forgot to add the extension?`);
		return t.nodes[e];
	}
	return e;
}
function Em(...e) {
	return e.filter((e) => !!e).reduce((e, t) => {
		let n = { ...e };
		return Object.entries(t).forEach(([e, t]) => {
			if (!n[e]) {
				n[e] = t;
				return;
			}
			if (e === "class") {
				let r = t ? String(t).split(" ") : [], i = n[e] ? n[e].split(" ") : [], a = r.filter((e) => !i.includes(e));
				n[e] = [...i, ...a].join(" ");
			} else if (e === "style") {
				let r = t ? t.split(";").map((e) => e.trim()).filter(Boolean) : [], i = n[e] ? n[e].split(";").map((e) => e.trim()).filter(Boolean) : [], a = /* @__PURE__ */ new Map();
				i.forEach((e) => {
					let [t, n] = e.split(":").map((e) => e.trim());
					a.set(t, n);
				}), r.forEach((e) => {
					let [t, n] = e.split(":").map((e) => e.trim());
					a.set(t, n);
				}), n[e] = Array.from(a.entries()).map(([e, t]) => `${e}: ${t}`).join("; ");
			} else n[e] = t;
		}), n;
	}, {});
}
function Dm(e, t) {
	return t.filter((t) => t.type === e.type.name).filter((e) => e.attribute.rendered).map((t) => t.attribute.renderHTML ? t.attribute.renderHTML(e.attrs) || {} : { [t.name]: e.attrs[t.name] }).reduce((e, t) => Em(e, t), {});
}
function Om(e) {
	return typeof e == "function";
}
function $(e, t = void 0, ...n) {
	return Om(e) ? t ? e.bind(t)(...n) : e(...n) : e;
}
function km(e = {}) {
	return Object.keys(e).length === 0 && e.constructor === Object;
}
function Am(e) {
	return typeof e == "string" ? e.match(/^[+-]?(?:\d*\.)?\d+$/) ? Number(e) : e === "true" ? !0 : e === "false" ? !1 : e : e;
}
function jm(e, t) {
	return "style" in e ? e : {
		...e,
		getAttrs: (n) => {
			let r = e.getAttrs ? e.getAttrs(n) : e.attrs;
			if (r === !1) return !1;
			let i = t.reduce((e, t) => {
				let r = t.attribute.parseHTML ? t.attribute.parseHTML(n) : Am(n.getAttribute(t.name));
				return r == null ? e : {
					...e,
					[t.name]: r
				};
			}, {});
			return {
				...r,
				...i
			};
		}
	};
}
function Mm(e) {
	return Object.fromEntries(Object.entries(e).filter(([e, t]) => e === "attrs" && km(t) ? !1 : t != null));
}
function Nm(e, t) {
	let n = wm(e), { nodeExtensions: r, markExtensions: i } = Cm(e);
	return new Lo({
		topNode: r.find((e) => Q(e, "topNode"))?.name,
		nodes: Object.fromEntries(r.map((r) => {
			let i = n.filter((e) => e.type === r.name), a = {
				name: r.name,
				options: r.options,
				storage: r.storage,
				editor: t
			}, o = Mm({
				...e.reduce((e, t) => {
					let n = Q(t, "extendNodeSchema", a);
					return {
						...e,
						...n ? n(r) : {}
					};
				}, {}),
				content: $(Q(r, "content", a)),
				marks: $(Q(r, "marks", a)),
				group: $(Q(r, "group", a)),
				inline: $(Q(r, "inline", a)),
				atom: $(Q(r, "atom", a)),
				selectable: $(Q(r, "selectable", a)),
				draggable: $(Q(r, "draggable", a)),
				code: $(Q(r, "code", a)),
				whitespace: $(Q(r, "whitespace", a)),
				linebreakReplacement: $(Q(r, "linebreakReplacement", a)),
				defining: $(Q(r, "defining", a)),
				isolating: $(Q(r, "isolating", a)),
				attrs: Object.fromEntries(i.map((e) => [e.name, { default: e?.attribute?.default }]))
			}), s = $(Q(r, "parseHTML", a));
			s && (o.parseDOM = s.map((e) => jm(e, i)));
			let c = Q(r, "renderHTML", a);
			c && (o.toDOM = (e) => c({
				node: e,
				HTMLAttributes: Dm(e, i)
			}));
			let l = Q(r, "renderText", a);
			return l && (o.toText = l), [r.name, o];
		})),
		marks: Object.fromEntries(i.map((r) => {
			let i = n.filter((e) => e.type === r.name), a = {
				name: r.name,
				options: r.options,
				storage: r.storage,
				editor: t
			}, o = Mm({
				...e.reduce((e, t) => {
					let n = Q(t, "extendMarkSchema", a);
					return {
						...e,
						...n ? n(r) : {}
					};
				}, {}),
				inclusive: $(Q(r, "inclusive", a)),
				excludes: $(Q(r, "excludes", a)),
				group: $(Q(r, "group", a)),
				spanning: $(Q(r, "spanning", a)),
				code: $(Q(r, "code", a)),
				attrs: Object.fromEntries(i.map((e) => [e.name, { default: e?.attribute?.default }]))
			}), s = $(Q(r, "parseHTML", a));
			s && (o.parseDOM = s.map((e) => jm(e, i)));
			let c = Q(r, "renderHTML", a);
			return c && (o.toDOM = (e) => c({
				mark: e,
				HTMLAttributes: Dm(e, i)
			})), [r.name, o];
		}))
	});
}
function Pm(e, t) {
	return t.nodes[e] || t.marks[e] || null;
}
function Fm(e, t) {
	return Array.isArray(t) ? t.some((t) => (typeof t == "string" ? t : t.name) === e.name) : t;
}
function Im(e, t) {
	let n = ts.fromSchema(t).serializeFragment(e), r = document.implementation.createHTMLDocument().createElement("div");
	return r.appendChild(n), r.innerHTML;
}
var Lm = (e, t = 500) => {
	let n = "", r = e.parentOffset;
	return e.parent.nodesBetween(Math.max(0, r - t), r, (e, t, i, a) => {
		var o;
		let s = (o = e.type.spec).toText?.call(o, {
			node: e,
			pos: t,
			parent: i,
			index: a
		}) || e.textContent || "%leaf%";
		n += e.isAtom && !e.isText ? s : s.slice(0, Math.max(0, r - t));
	}), n;
};
function Rm(e) {
	return Object.prototype.toString.call(e) === "[object RegExp]";
}
var zm = class {
	constructor(e) {
		this.find = e.find, this.handler = e.handler;
	}
}, Bm = (e, t) => {
	if (Rm(t)) return t.exec(e);
	let n = t(e);
	if (!n) return null;
	let r = [n.text];
	return r.index = n.index, r.input = e, r.data = n.data, n.replaceWith && (n.text.includes(n.replaceWith) || console.warn("[tiptap warn]: \"inputRuleMatch.replaceWith\" must be part of \"inputRuleMatch.text\"."), r.push(n.replaceWith)), r;
};
function Vm(e) {
	let { editor: t, from: n, to: r, text: i, rules: a, plugin: o } = e, { view: s } = t;
	if (s.composing) return !1;
	let c = s.state.doc.resolve(n);
	if (c.parent.type.spec.code || (c.nodeBefore || c.nodeAfter)?.marks.find((e) => e.type.spec.code)) return !1;
	let l = !1, u = Lm(c) + i;
	return a.forEach((e) => {
		if (l) return;
		let a = Bm(u, e.find);
		if (!a) return;
		let c = s.state.tr, d = bm({
			state: s.state,
			transaction: c
		}), f = {
			from: n - (a[0].length - i.length),
			to: r
		}, { commands: p, chain: m, can: h } = new xm({
			editor: t,
			state: d
		});
		e.handler({
			state: d,
			range: f,
			match: a,
			commands: p,
			chain: m,
			can: h
		}) === null || !c.steps.length || (c.setMeta(o, {
			transform: c,
			from: n,
			to: r,
			text: i
		}), s.dispatch(c), l = !0);
	}), l;
}
function Hm(e) {
	let { editor: t, rules: n } = e, r = new Hc({
		state: {
			init() {
				return null;
			},
			apply(e, i, a) {
				let o = e.getMeta(r);
				if (o) return o;
				let s = e.getMeta("applyInputRules");
				return s && setTimeout(() => {
					let { text: e } = s;
					e = typeof e == "string" ? e : Im(q.from(e), a.schema);
					let { from: i } = s;
					Vm({
						editor: t,
						from: i,
						to: i + e.length,
						text: e,
						rules: n,
						plugin: r
					});
				}), e.selectionSet || e.docChanged ? null : i;
			}
		},
		props: {
			handleTextInput(e, i, a, o) {
				return Vm({
					editor: t,
					from: i,
					to: a,
					text: o,
					rules: n,
					plugin: r
				});
			},
			handleDOMEvents: { compositionend: (e) => (setTimeout(() => {
				let { $cursor: i } = e.state.selection;
				i && Vm({
					editor: t,
					from: i.pos,
					to: i.pos,
					text: "",
					rules: n,
					plugin: r
				});
			}), !1) },
			handleKeyDown(e, i) {
				if (i.key !== "Enter") return !1;
				let { $cursor: a } = e.state.selection;
				return a ? Vm({
					editor: t,
					from: a.pos,
					to: a.pos,
					text: "\n",
					rules: n,
					plugin: r
				}) : !1;
			}
		},
		isInputRules: !0
	});
	return r;
}
function Um(e) {
	return Object.prototype.toString.call(e).slice(8, -1);
}
function Wm(e) {
	return Um(e) === "Object" ? e.constructor === Object && Object.getPrototypeOf(e) === Object.prototype : !1;
}
function Gm(e, t) {
	let n = { ...e };
	return Wm(e) && Wm(t) && Object.keys(t).forEach((r) => {
		Wm(t[r]) && Wm(e[r]) ? n[r] = Gm(e[r], t[r]) : n[r] = t[r];
	}), n;
}
var Km = class e {
	constructor(e = {}) {
		this.type = "mark", this.name = "mark", this.parent = null, this.child = null, this.config = {
			name: this.name,
			defaultOptions: {}
		}, this.config = {
			...this.config,
			...e
		}, this.name = this.config.name, e.defaultOptions && Object.keys(e.defaultOptions).length > 0 && console.warn(`[tiptap warn]: BREAKING CHANGE: "defaultOptions" is deprecated. Please use "addOptions" instead. Found in extension: "${this.name}".`), this.options = this.config.defaultOptions, this.config.addOptions && (this.options = $(Q(this, "addOptions", { name: this.name }))), this.storage = $(Q(this, "addStorage", {
			name: this.name,
			options: this.options
		})) || {};
	}
	static create(t = {}) {
		return new e(t);
	}
	configure(e = {}) {
		let t = this.extend({
			...this.config,
			addOptions: () => Gm(this.options, e)
		});
		return t.name = this.name, t.parent = this.parent, t;
	}
	extend(t = {}) {
		let n = new e(t);
		return n.parent = this, this.child = n, n.name = t.name ? t.name : n.parent.name, t.defaultOptions && Object.keys(t.defaultOptions).length > 0 && console.warn(`[tiptap warn]: BREAKING CHANGE: "defaultOptions" is deprecated. Please use "addOptions" instead. Found in extension: "${n.name}".`), n.options = $(Q(n, "addOptions", { name: n.name })), n.storage = $(Q(n, "addStorage", {
			name: n.name,
			options: n.options
		})), n;
	}
	static handleExit({ editor: e, mark: t }) {
		let { tr: n } = e.state, r = e.state.selection.$from;
		if (r.pos === r.end()) {
			let i = r.marks();
			if (!i.find((e) => e?.type.name === t.name)) return !1;
			let a = i.find((e) => e?.type.name === t.name);
			return a && n.removeStoredMark(a), n.insertText(" ", r.pos), e.view.dispatch(n), !0;
		}
		return !1;
	}
};
function qm(e) {
	return typeof e == "number";
}
var Jm = class {
	constructor(e) {
		this.find = e.find, this.handler = e.handler;
	}
}, Ym = (e, t, n) => {
	if (Rm(t)) return [...e.matchAll(t)];
	let r = t(e, n);
	return r ? r.map((t) => {
		let n = [t.text];
		return n.index = t.index, n.input = e, n.data = t.data, t.replaceWith && (t.text.includes(t.replaceWith) || console.warn("[tiptap warn]: \"pasteRuleMatch.replaceWith\" must be part of \"pasteRuleMatch.text\"."), n.push(t.replaceWith)), n;
	}) : [];
};
function Xm(e) {
	let { editor: t, state: n, from: r, to: i, rule: a, pasteEvent: o, dropEvent: s } = e, { commands: c, chain: l, can: u } = new xm({
		editor: t,
		state: n
	}), d = [];
	return n.doc.nodesBetween(r, i, (e, t) => {
		if (!e.isTextblock || e.type.spec.code) return;
		let f = Math.max(r, t), p = Math.min(i, t + e.content.size);
		Ym(e.textBetween(f - t, p - t, void 0, "￼"), a.find, o).forEach((e) => {
			if (e.index === void 0) return;
			let t = f + e.index + 1, r = t + e[0].length, i = {
				from: n.tr.mapping.map(t),
				to: n.tr.mapping.map(r)
			}, p = a.handler({
				state: n,
				range: i,
				match: e,
				commands: c,
				chain: l,
				can: u,
				pasteEvent: o,
				dropEvent: s
			});
			d.push(p);
		});
	}), d.every((e) => e !== null);
}
var Zm = null, Qm = (e) => {
	var t;
	let n = new ClipboardEvent("paste", { clipboardData: new DataTransfer() });
	return (t = n.clipboardData) == null || t.setData("text/html", e), n;
};
function $m(e) {
	let { editor: t, rules: n } = e, r = null, i = !1, a = !1, o = typeof ClipboardEvent < "u" ? new ClipboardEvent("paste") : null, s;
	try {
		s = typeof DragEvent < "u" ? new DragEvent("drop") : null;
	} catch {
		s = null;
	}
	let c = ({ state: e, from: n, to: r, rule: i, pasteEvt: a }) => {
		let c = e.tr;
		if (!(!Xm({
			editor: t,
			state: bm({
				state: e,
				transaction: c
			}),
			from: Math.max(n - 1, 0),
			to: r.b - 1,
			rule: i,
			pasteEvent: a,
			dropEvent: s
		}) || !c.steps.length)) {
			try {
				s = typeof DragEvent < "u" ? new DragEvent("drop") : null;
			} catch {
				s = null;
			}
			return o = typeof ClipboardEvent < "u" ? new ClipboardEvent("paste") : null, c;
		}
	};
	return n.map((e) => new Hc({
		view(e) {
			let n = (n) => {
				r = e.dom.parentElement?.contains(n.target) ? e.dom.parentElement : null, r && (Zm = t);
			}, i = () => {
				Zm &&= null;
			};
			return window.addEventListener("dragstart", n), window.addEventListener("dragend", i), { destroy() {
				window.removeEventListener("dragstart", n), window.removeEventListener("dragend", i);
			} };
		},
		props: { handleDOMEvents: {
			drop: (e, t) => {
				if (a = r === e.dom.parentElement, s = t, !a) {
					let e = Zm;
					e?.isEditable && setTimeout(() => {
						let t = e.state.selection;
						t && e.commands.deleteRange({
							from: t.from,
							to: t.to
						});
					}, 10);
				}
				return !1;
			},
			paste: (e, t) => {
				let n = t.clipboardData?.getData("text/html");
				return o = t, i = !!n?.includes("data-pm-slice"), !1;
			}
		} },
		appendTransaction: (t, n, r) => {
			let s = t[0], l = s.getMeta("uiEvent") === "paste" && !i, u = s.getMeta("uiEvent") === "drop" && !a, d = s.getMeta("applyPasteRules"), f = !!d;
			if (!l && !u && !f) return;
			if (f) {
				let { text: t } = d;
				t = typeof t == "string" ? t : Im(q.from(t), r.schema);
				let { from: n } = d, i = n + t.length, a = Qm(t);
				return c({
					rule: e,
					state: r,
					from: n,
					to: { b: i },
					pasteEvt: a
				});
			}
			let p = n.doc.content.findDiffStart(r.doc.content), m = n.doc.content.findDiffEnd(r.doc.content);
			if (!(!qm(p) || !m || p === m.b)) return c({
				rule: e,
				state: r,
				from: p,
				to: m,
				pasteEvt: o
			});
		}
	}));
}
function eh(e) {
	let t = e.filter((t, n) => e.indexOf(t) !== n);
	return Array.from(new Set(t));
}
var th = class e {
	constructor(t, n) {
		this.splittableMarks = [], this.editor = n, this.extensions = e.resolve(t), this.schema = Nm(this.extensions, n), this.setupExtensions();
	}
	static resolve(t) {
		let n = e.sort(e.flatten(t)), r = eh(n.map((e) => e.name));
		return r.length && console.warn(`[tiptap warn]: Duplicate extension names found: [${r.map((e) => `'${e}'`).join(", ")}]. This can lead to issues.`), n;
	}
	static flatten(e) {
		return e.map((e) => {
			let t = Q(e, "addExtensions", {
				name: e.name,
				options: e.options,
				storage: e.storage
			});
			return t ? [e, ...this.flatten(t())] : e;
		}).flat(10);
	}
	static sort(e) {
		return e.sort((e, t) => {
			let n = Q(e, "priority") || 100, r = Q(t, "priority") || 100;
			return n > r ? -1 : +(n < r);
		});
	}
	get commands() {
		return this.extensions.reduce((e, t) => {
			let n = Q(t, "addCommands", {
				name: t.name,
				options: t.options,
				storage: t.storage,
				editor: this.editor,
				type: Pm(t.name, this.schema)
			});
			return n ? {
				...e,
				...n()
			} : e;
		}, {});
	}
	get plugins() {
		let { editor: t } = this, n = e.sort([...this.extensions].reverse()), r = [], i = [], a = n.map((e) => {
			let n = {
				name: e.name,
				options: e.options,
				storage: e.storage,
				editor: t,
				type: Pm(e.name, this.schema)
			}, a = [], o = Q(e, "addKeyboardShortcuts", n), s = {};
			if (e.type === "mark" && Q(e, "exitable", n) && (s.ArrowRight = () => Km.handleExit({
				editor: t,
				mark: e
			})), o) {
				let e = Object.fromEntries(Object.entries(o()).map(([e, n]) => [e, () => n({ editor: t })]));
				s = {
					...s,
					...e
				};
			}
			let c = Op(s);
			a.push(c);
			let l = Q(e, "addInputRules", n);
			Fm(e, t.options.enableInputRules) && l && r.push(...l());
			let u = Q(e, "addPasteRules", n);
			Fm(e, t.options.enablePasteRules) && u && i.push(...u());
			let d = Q(e, "addProseMirrorPlugins", n);
			if (d) {
				let e = d();
				a.push(...e);
			}
			return a;
		}).flat();
		return [
			Hm({
				editor: t,
				rules: r
			}),
			...$m({
				editor: t,
				rules: i
			}),
			...a
		];
	}
	get attributes() {
		return wm(this.extensions);
	}
	get nodeViews() {
		let { editor: e } = this, { nodeExtensions: t } = Cm(this.extensions);
		return Object.fromEntries(t.filter((e) => !!Q(e, "addNodeView")).map((t) => {
			let n = this.attributes.filter((e) => e.type === t.name), r = Q(t, "addNodeView", {
				name: t.name,
				options: t.options,
				storage: t.storage,
				editor: e,
				type: Tm(t.name, this.schema)
			});
			return r ? [t.name, (i, a, o, s, c) => {
				let l = Dm(i, n);
				return r()({
					node: i,
					view: a,
					getPos: o,
					decorations: s,
					innerDecorations: c,
					editor: e,
					extension: t,
					HTMLAttributes: l
				});
			}] : [];
		}));
	}
	setupExtensions() {
		this.extensions.forEach((e) => {
			this.editor.extensionStorage[e.name] = e.storage;
			let t = {
				name: e.name,
				options: e.options,
				storage: e.storage,
				editor: this.editor,
				type: Pm(e.name, this.schema)
			};
			e.type === "mark" && ($(Q(e, "keepOnSplit", t)) ?? !0) && this.splittableMarks.push(e.name);
			let n = Q(e, "onBeforeCreate", t), r = Q(e, "onCreate", t), i = Q(e, "onUpdate", t), a = Q(e, "onSelectionUpdate", t), o = Q(e, "onTransaction", t), s = Q(e, "onFocus", t), c = Q(e, "onBlur", t), l = Q(e, "onDestroy", t);
			n && this.editor.on("beforeCreate", n), r && this.editor.on("create", r), i && this.editor.on("update", i), a && this.editor.on("selectionUpdate", a), o && this.editor.on("transaction", o), s && this.editor.on("focus", s), c && this.editor.on("blur", c), l && this.editor.on("destroy", l);
		});
	}
}, nh = class e {
	constructor(e = {}) {
		this.type = "extension", this.name = "extension", this.parent = null, this.child = null, this.config = {
			name: this.name,
			defaultOptions: {}
		}, this.config = {
			...this.config,
			...e
		}, this.name = this.config.name, e.defaultOptions && Object.keys(e.defaultOptions).length > 0 && console.warn(`[tiptap warn]: BREAKING CHANGE: "defaultOptions" is deprecated. Please use "addOptions" instead. Found in extension: "${this.name}".`), this.options = this.config.defaultOptions, this.config.addOptions && (this.options = $(Q(this, "addOptions", { name: this.name }))), this.storage = $(Q(this, "addStorage", {
			name: this.name,
			options: this.options
		})) || {};
	}
	static create(t = {}) {
		return new e(t);
	}
	configure(e = {}) {
		let t = this.extend({
			...this.config,
			addOptions: () => Gm(this.options, e)
		});
		return t.name = this.name, t.parent = this.parent, t;
	}
	extend(t = {}) {
		let n = new e({
			...this.config,
			...t
		});
		return n.parent = this, this.child = n, n.name = t.name ? t.name : n.parent.name, t.defaultOptions && Object.keys(t.defaultOptions).length > 0 && console.warn(`[tiptap warn]: BREAKING CHANGE: "defaultOptions" is deprecated. Please use "addOptions" instead. Found in extension: "${n.name}".`), n.options = $(Q(n, "addOptions", { name: n.name })), n.storage = $(Q(n, "addStorage", {
			name: n.name,
			options: n.options
		})), n;
	}
};
function rh(e, t, n) {
	let { from: r, to: i } = t, { blockSeparator: a = "\n\n", textSerializers: o = {} } = n || {}, s = "";
	return e.nodesBetween(r, i, (e, n, c, l) => {
		e.isBlock && n > r && (s += a);
		let u = o?.[e.type.name];
		if (u) return c && (s += u({
			node: e,
			pos: n,
			parent: c,
			index: l,
			range: t
		})), !1;
		e.isText && (s += (e?.text)?.slice(Math.max(r, n) - n, i - n));
	}), s;
}
function ih(e) {
	return Object.fromEntries(Object.entries(e.nodes).filter(([, e]) => e.spec.toText).map(([e, t]) => [e, t.spec.toText]));
}
var ah = nh.create({
	name: "clipboardTextSerializer",
	addOptions() {
		return { blockSeparator: void 0 };
	},
	addProseMirrorPlugins() {
		return [new Hc({
			key: new Gc("clipboardTextSerializer"),
			props: { clipboardTextSerializer: () => {
				let { editor: e } = this, { state: t, schema: n } = e, { doc: r, selection: i } = t, { ranges: a } = i, o = Math.min(...a.map((e) => e.$from.pos)), s = Math.max(...a.map((e) => e.$to.pos)), c = ih(n);
				return rh(r, {
					from: o,
					to: s
				}, {
					...this.options.blockSeparator === void 0 ? {} : { blockSeparator: this.options.blockSeparator },
					textSerializers: c
				});
			} }
		})];
	}
}), oh = () => ({ editor: e, view: t }) => (requestAnimationFrame(() => {
	var n;
	e.isDestroyed || (t.dom.blur(), (n = window == null ? void 0 : window.getSelection()) == null || n.removeAllRanges());
}), !0), sh = (e = !1) => ({ commands: t }) => t.setContent("", e), ch = () => ({ state: e, tr: t, dispatch: n }) => {
	let { selection: r } = t, { ranges: i } = r;
	return n && i.forEach(({ $from: n, $to: r }) => {
		e.doc.nodesBetween(n.pos, r.pos, (e, n) => {
			if (e.type.isText) return;
			let { doc: r, mapping: i } = t, a = r.resolve(i.map(n)), o = r.resolve(i.map(n + e.nodeSize)), s = a.blockRange(o);
			if (!s) return;
			let c = Is(s);
			if (e.type.isTextblock) {
				let { defaultType: e } = a.parent.contentMatchAt(a.index());
				t.setNodeMarkup(s.start, e);
			}
			(c || c === 0) && t.lift(s, c);
		});
	}), !0;
}, lh = (e) => (t) => e(t), uh = () => ({ state: e, dispatch: t }) => Yp(e, t), dh = (e, t) => ({ editor: n, tr: r }) => {
	let { state: i } = n, a = i.doc.slice(e.from, e.to);
	r.deleteRange(e.from, e.to);
	let o = r.mapping.map(t);
	return r.insert(o, a.content), r.setSelection(new X(r.doc.resolve(Math.max(o - 1, 0)))), !0;
}, fh = () => ({ tr: e, dispatch: t }) => {
	let { selection: n } = e, r = n.$anchor.node();
	if (r.content.size > 0) return !1;
	let i = e.selection.$anchor;
	for (let n = i.depth; n > 0; --n) if (i.node(n).type === r.type) {
		if (t) {
			let t = i.before(n), r = i.after(n);
			e.delete(t, r).scrollIntoView();
		}
		return !0;
	}
	return !1;
}, ph = (e) => ({ tr: t, state: n, dispatch: r }) => {
	let i = Tm(e, n.schema), a = t.selection.$anchor;
	for (let e = a.depth; e > 0; --e) if (a.node(e).type === i) {
		if (r) {
			let n = a.before(e), r = a.after(e);
			t.delete(n, r).scrollIntoView();
		}
		return !0;
	}
	return !1;
}, mh = (e) => ({ tr: t, dispatch: n }) => {
	let { from: r, to: i } = e;
	return n && t.delete(r, i), !0;
}, hh = () => ({ state: e, dispatch: t }) => Ap(e, t), gh = () => ({ commands: e }) => e.keyboardShortcut("Enter"), _h = () => ({ state: e, dispatch: t }) => Jp(e, t);
function vh(e, t, n = { strict: !0 }) {
	let r = Object.keys(t);
	return r.length ? r.every((r) => n.strict ? t[r] === e[r] : Rm(t[r]) ? t[r].test(e[r]) : t[r] === e[r]) : !0;
}
function yh(e, t, n = {}) {
	return e.find((e) => e.type === t && vh(Object.fromEntries(Object.keys(n).map((t) => [t, e.attrs[t]])), n));
}
function bh(e, t, n = {}) {
	return !!yh(e, t, n);
}
function xh(e, t, n) {
	if (!e || !t) return;
	let r = e.parent.childAfter(e.parentOffset);
	if ((!r.node || !r.node.marks.some((e) => e.type === t)) && (r = e.parent.childBefore(e.parentOffset)), !r.node || !r.node.marks.some((e) => e.type === t) || (n ||= r.node.marks[0]?.attrs, !yh([...r.node.marks], t, n))) return;
	let i = r.index, a = e.start() + r.offset, o = i + 1, s = a + r.node.nodeSize;
	for (; i > 0 && bh([...e.parent.child(i - 1).marks], t, n);) --i, a -= e.parent.child(i).nodeSize;
	for (; o < e.parent.childCount && bh([...e.parent.child(o).marks], t, n);) s += e.parent.child(o).nodeSize, o += 1;
	return {
		from: a,
		to: s
	};
}
function Sh(e, t) {
	if (typeof e == "string") {
		if (!t.marks[e]) throw Error(`There is no mark type named '${e}'. Maybe you forgot to add the extension?`);
		return t.marks[e];
	}
	return e;
}
var Ch = (e, t = {}) => ({ tr: n, state: r, dispatch: i }) => {
	let a = Sh(e, r.schema), { doc: o, selection: s } = n, { $from: c, from: l, to: u } = s;
	if (i) {
		let e = xh(c, a, t);
		if (e && e.from <= l && e.to >= u) {
			let t = X.create(o, e.from, e.to);
			n.setSelection(t);
		}
	}
	return !0;
}, wh = (e) => (t) => {
	let n = typeof e == "function" ? e(t) : e;
	for (let e = 0; e < n.length; e += 1) if (n[e](t)) return !0;
	return !1;
};
function Th(e) {
	return e instanceof X;
}
function Eh(e = 0, t = 0, n = 0) {
	return Math.min(Math.max(e, t), n);
}
function Dh(e, t = null) {
	if (!t) return null;
	let n = Y.atStart(e), r = Y.atEnd(e);
	if (t === "start" || t === !0) return n;
	if (t === "end") return r;
	let i = n.from, a = r.to;
	return t === "all" ? X.create(e, Eh(0, i, a), Eh(e.content.size, i, a)) : X.create(e, Eh(t, i, a), Eh(t, i, a));
}
function Oh() {
	return navigator.platform === "Android" || /android/i.test(navigator.userAgent);
}
function kh() {
	return [
		"iPad Simulator",
		"iPhone Simulator",
		"iPod Simulator",
		"iPad",
		"iPhone",
		"iPod"
	].includes(navigator.platform) || navigator.userAgent.includes("Mac") && "ontouchend" in document;
}
function Ah() {
	return typeof navigator < "u" ? /^((?!chrome|android).)*safari/i.test(navigator.userAgent) : !1;
}
var jh = (e = null, t = {}) => ({ editor: n, view: r, tr: i, dispatch: a }) => {
	t = {
		scrollIntoView: !0,
		...t
	};
	let o = () => {
		(kh() || Oh()) && r.dom.focus(), requestAnimationFrame(() => {
			n.isDestroyed || (r.focus(), Ah() && !kh() && !Oh() && r.dom.focus({ preventScroll: !0 }));
		});
	};
	if (r.hasFocus() && e === null || e === !1) return !0;
	if (a && e === null && !Th(n.state.selection)) return o(), !0;
	let s = Dh(i.doc, e) || n.state.selection, c = n.state.selection.eq(s);
	return a && (c || i.setSelection(s), c && i.storedMarks && i.setStoredMarks(i.storedMarks), o()), !0;
}, Mh = (e, t) => (n) => e.every((e, r) => t(e, {
	...n,
	index: r
})), Nh = (e, t) => ({ tr: n, commands: r }) => r.insertContentAt({
	from: n.selection.from,
	to: n.selection.to
}, e, t), Ph = (e) => {
	let t = e.childNodes;
	for (let n = t.length - 1; n >= 0; --n) {
		let r = t[n];
		r.nodeType === 3 && r.nodeValue && /^(\n\s\s|\n)$/.test(r.nodeValue) ? e.removeChild(r) : r.nodeType === 1 && Ph(r);
	}
	return e;
};
function Fh(e) {
	let t = `<body>${e}</body>`, n = new window.DOMParser().parseFromString(t, "text/html").body;
	return Ph(n);
}
function Ih(e, t, n) {
	if (e instanceof fo || e instanceof q) return e;
	n = {
		slice: !0,
		parseOptions: {},
		...n
	};
	let r = typeof e == "object" && !!e, i = typeof e == "string";
	if (r) try {
		if (Array.isArray(e) && e.length > 0) return q.fromArray(e.map((e) => t.nodeFromJSON(e)));
		let r = t.nodeFromJSON(e);
		return n.errorOnInvalidContent && r.check(), r;
	} catch (r) {
		if (n.errorOnInvalidContent) throw Error("[tiptap error]: Invalid JSON content", { cause: r });
		return console.warn("[tiptap warn]: Invalid content.", "Passed value:", e, "Error:", r), Ih("", t, n);
	}
	if (i) {
		if (n.errorOnInvalidContent) {
			let r = !1, i = "", a = new Lo({
				topNode: t.spec.topNode,
				marks: t.spec.marks,
				nodes: t.spec.nodes.append({ __tiptap__private__unknown__catch__all__node: {
					content: "inline*",
					group: "block",
					parseDOM: [{
						tag: "*",
						getAttrs: (e) => (r = !0, i = typeof e == "string" ? e : e.outerHTML, null)
					}]
				} })
			});
			if (n.slice ? Vo.fromSchema(a).parseSlice(Fh(e), n.parseOptions) : Vo.fromSchema(a).parse(Fh(e), n.parseOptions), n.errorOnInvalidContent && r) throw Error("[tiptap error]: Invalid HTML content", { cause: /* @__PURE__ */ Error(`Invalid element found: ${i}`) });
		}
		let r = Vo.fromSchema(t);
		return n.slice ? r.parseSlice(Fh(e), n.parseOptions).content : r.parse(Fh(e), n.parseOptions);
	}
	return Ih("", t, n);
}
function Lh(e, t, n) {
	let r = e.steps.length - 1;
	if (r < t) return;
	let i = e.steps[r];
	if (!(i instanceof ks || i instanceof As)) return;
	let a = e.mapping.maps[r], o = 0;
	a.forEach((e, t, n, r) => {
		o === 0 && (o = r);
	}), e.setSelection(Y.near(e.doc.resolve(o), n));
}
var Rh = (e) => !("type" in e), zh = (e, t, n) => ({ tr: r, dispatch: i, editor: a }) => {
	if (i) {
		n = {
			parseOptions: a.options.parseOptions,
			updateSelection: !0,
			applyInputRules: !1,
			applyPasteRules: !1,
			...n
		};
		let i, o = (e) => {
			a.emit("contentError", {
				editor: a,
				error: e,
				disableCollaboration: () => {
					a.storage.collaboration && (a.storage.collaboration.isDisabled = !0);
				}
			});
		}, s = {
			preserveWhitespace: "full",
			...n.parseOptions
		};
		if (!n.errorOnInvalidContent && !a.options.enableContentCheck && a.options.emitContentError) try {
			Ih(t, a.schema, {
				parseOptions: s,
				errorOnInvalidContent: !0
			});
		} catch (e) {
			o(e);
		}
		try {
			i = Ih(t, a.schema, {
				parseOptions: s,
				errorOnInvalidContent: n.errorOnInvalidContent ?? a.options.enableContentCheck
			});
		} catch (e) {
			return o(e), !1;
		}
		let { from: c, to: l } = typeof e == "number" ? {
			from: e,
			to: e
		} : {
			from: e.from,
			to: e.to
		}, u = !0, d = !0;
		if ((Rh(i) ? i : [i]).forEach((e) => {
			e.check(), u = u ? e.isText && e.marks.length === 0 : !1, d = d ? e.isBlock : !1;
		}), c === l && d) {
			let { parent: e } = r.doc.resolve(c);
			e.isTextblock && !e.type.spec.code && !e.childCount && (--c, l += 1);
		}
		let f;
		if (u) {
			if (Array.isArray(t)) f = t.map((e) => e.text || "").join("");
			else if (t instanceof q) {
				let e = "";
				t.forEach((t) => {
					t.text && (e += t.text);
				}), f = e;
			} else f = typeof t == "object" && t && t.text ? t.text : t;
			r.insertText(f, c, l);
		} else f = i, r.replaceWith(c, l, f);
		n.updateSelection && Lh(r, r.steps.length - 1, -1), n.applyInputRules && r.setMeta("applyInputRules", {
			from: c,
			text: f
		}), n.applyPasteRules && r.setMeta("applyPasteRules", {
			from: c,
			text: f
		});
	}
	return !0;
}, Bh = () => ({ state: e, dispatch: t }) => Up(e, t), Vh = () => ({ state: e, dispatch: t }) => Wp(e, t), Hh = () => ({ state: e, dispatch: t }) => Mp(e, t), Uh = () => ({ state: e, dispatch: t }) => Bp(e, t), Wh = () => ({ state: e, dispatch: t, tr: n }) => {
	try {
		let r = $s(e.doc, e.selection.$from.pos, -1);
		return r == null ? !1 : (n.join(r, 2), t && t(n), !0);
	} catch {
		return !1;
	}
}, Gh = () => ({ state: e, dispatch: t, tr: n }) => {
	try {
		let r = $s(e.doc, e.selection.$from.pos, 1);
		return r == null ? !1 : (n.join(r, 2), t && t(n), !0);
	} catch {
		return !1;
	}
}, Kh = () => ({ state: e, dispatch: t }) => Np(e, t), qh = () => ({ state: e, dispatch: t }) => Pp(e, t);
function Jh() {
	return typeof navigator < "u" ? /Mac/.test(navigator.platform) : !1;
}
function Yh(e) {
	let t = e.split(/-(?!$)/), n = t[t.length - 1];
	n === "Space" && (n = " ");
	let r, i, a, o;
	for (let e = 0; e < t.length - 1; e += 1) {
		let n = t[e];
		if (/^(cmd|meta|m)$/i.test(n)) o = !0;
		else if (/^a(lt)?$/i.test(n)) r = !0;
		else if (/^(c|ctrl|control)$/i.test(n)) i = !0;
		else if (/^s(hift)?$/i.test(n)) a = !0;
		else if (/^mod$/i.test(n)) kh() || Jh() ? o = !0 : i = !0;
		else throw Error(`Unrecognized modifier name: ${n}`);
	}
	return r && (n = `Alt-${n}`), i && (n = `Ctrl-${n}`), o && (n = `Meta-${n}`), a && (n = `Shift-${n}`), n;
}
var Xh = (e) => ({ editor: t, view: n, tr: r, dispatch: i }) => {
	let a = Yh(e).split(/-(?!$)/), o = a.find((e) => ![
		"Alt",
		"Ctrl",
		"Meta",
		"Shift"
	].includes(e)), s = new KeyboardEvent("keydown", {
		key: o === "Space" ? " " : o,
		altKey: a.includes("Alt"),
		ctrlKey: a.includes("Ctrl"),
		metaKey: a.includes("Meta"),
		shiftKey: a.includes("Shift"),
		bubbles: !0,
		cancelable: !0
	});
	return t.captureTransaction(() => {
		n.someProp("handleKeyDown", (e) => e(n, s));
	})?.steps.forEach((e) => {
		let t = e.map(r.mapping);
		t && i && r.maybeStep(t);
	}), !0;
};
function Zh(e, t, n = {}) {
	let { from: r, to: i, empty: a } = e.selection, o = t ? Tm(t, e.schema) : null, s = [];
	e.doc.nodesBetween(r, i, (e, t) => {
		if (e.isText) return;
		let n = Math.max(r, t), a = Math.min(i, t + e.nodeSize);
		s.push({
			node: e,
			from: n,
			to: a
		});
	});
	let c = i - r, l = s.filter((e) => o ? o.name === e.node.type.name : !0).filter((e) => vh(e.node.attrs, n, { strict: !1 }));
	return a ? !!l.length : l.reduce((e, t) => e + t.to - t.from, 0) >= c;
}
var Qh = (e, t = {}) => ({ state: n, dispatch: r }) => Zh(n, Tm(e, n.schema), t) ? Gp(n, r) : !1, $h = () => ({ state: e, dispatch: t }) => Xp(e, t), eg = (e) => ({ state: t, dispatch: n }) => gm(Tm(e, t.schema))(t, n), tg = () => ({ state: e, dispatch: t }) => Kp(e, t);
function ng(e, t) {
	return t.nodes[e] ? "node" : t.marks[e] ? "mark" : null;
}
function rg(e, t) {
	let n = typeof t == "string" ? [t] : t;
	return Object.keys(e).reduce((t, r) => (n.includes(r) || (t[r] = e[r]), t), {});
}
var ig = (e, t) => ({ tr: n, state: r, dispatch: i }) => {
	let a = null, o = null, s = ng(typeof e == "string" ? e : e.name, r.schema);
	return s ? (s === "node" && (a = Tm(e, r.schema)), s === "mark" && (o = Sh(e, r.schema)), i && n.selection.ranges.forEach((e) => {
		r.doc.nodesBetween(e.$from.pos, e.$to.pos, (e, r) => {
			a && a === e.type && n.setNodeMarkup(r, void 0, rg(e.attrs, t)), o && e.marks.length && e.marks.forEach((i) => {
				o === i.type && n.addMark(r, r + e.nodeSize, o.create(rg(i.attrs, t)));
			});
		});
	}), !0) : !1;
}, ag = () => ({ tr: e, dispatch: t }) => (t && e.scrollIntoView(), !0), og = () => ({ tr: e, dispatch: t }) => {
	if (t) {
		let t = new Oc(e.doc);
		e.setSelection(t);
	}
	return !0;
}, sg = () => ({ state: e, dispatch: t }) => Lp(e, t), cg = () => ({ state: e, dispatch: t }) => Vp(e, t), lg = () => ({ state: e, dispatch: t }) => $p(e, t), ug = () => ({ state: e, dispatch: t }) => am(e, t), dg = () => ({ state: e, dispatch: t }) => im(e, t);
function fg(e, t, n = {}, r = {}) {
	return Ih(e, t, {
		slice: !1,
		parseOptions: n,
		errorOnInvalidContent: r.errorOnInvalidContent
	});
}
var pg = (e, t = !1, n = {}, r = {}) => ({ editor: i, tr: a, dispatch: o, commands: s }) => {
	let { doc: c } = a;
	if (n.preserveWhitespace !== "full") {
		let s = fg(e, i.schema, n, { errorOnInvalidContent: r.errorOnInvalidContent ?? i.options.enableContentCheck });
		return o && a.replaceWith(0, c.content.size, s).setMeta("preventUpdate", !t), !0;
	}
	return o && a.setMeta("preventUpdate", !t), s.insertContentAt({
		from: 0,
		to: c.content.size
	}, e, {
		parseOptions: n,
		errorOnInvalidContent: r.errorOnInvalidContent ?? i.options.enableContentCheck
	});
};
function mg(e, t) {
	let n = Sh(t, e.schema), { from: r, to: i, empty: a } = e.selection, o = [];
	a ? (e.storedMarks && o.push(...e.storedMarks), o.push(...e.selection.$head.marks())) : e.doc.nodesBetween(r, i, (e) => {
		o.push(...e.marks);
	});
	let s = o.find((e) => e.type.name === n.name);
	return s ? { ...s.attrs } : {};
}
function hg(e) {
	for (let t = 0; t < e.edgeCount; t += 1) {
		let { type: n } = e.edge(t);
		if (n.isTextblock && !n.hasRequiredAttrs()) return n;
	}
	return null;
}
function gg(e, t) {
	for (let n = e.depth; n > 0; --n) {
		let r = e.node(n);
		if (t(r)) return {
			pos: n > 0 ? e.before(n) : 0,
			start: e.start(n),
			depth: n,
			node: r
		};
	}
}
function _g(e) {
	return (t) => gg(t.$from, e);
}
function vg(e, t) {
	return rh(e, {
		from: 0,
		to: e.content.size
	}, t);
}
function yg(e, t) {
	let n = Tm(t, e.schema), { from: r, to: i } = e.selection, a = [];
	e.doc.nodesBetween(r, i, (e) => {
		a.push(e);
	});
	let o = a.reverse().find((e) => e.type.name === n.name);
	return o ? { ...o.attrs } : {};
}
function bg(e, t) {
	let n = ng(typeof t == "string" ? t : t.name, e.schema);
	return n === "node" ? yg(e, t) : n === "mark" ? mg(e, t) : {};
}
function xg(e, t, n) {
	let r = [];
	return e === t ? n.resolve(e).marks().forEach((t) => {
		let i = xh(n.resolve(e), t.type);
		i && r.push({
			mark: t,
			...i
		});
	}) : n.nodesBetween(e, t, (e, t) => {
		!e || e?.nodeSize === void 0 || r.push(...e.marks.map((n) => ({
			from: t,
			to: t + e.nodeSize,
			mark: n
		})));
	}), r;
}
function Sg(e, t, n) {
	return Object.fromEntries(Object.entries(n).filter(([n]) => {
		let r = e.find((e) => e.type === t && e.name === n);
		return r ? r.attribute.keepOnSplit : !1;
	}));
}
function Cg(e, t, n = {}) {
	let { empty: r, ranges: i } = e.selection, a = t ? Sh(t, e.schema) : null;
	if (r) return !!(e.storedMarks || e.selection.$from.marks()).filter((e) => a ? a.name === e.type.name : !0).find((e) => vh(e.attrs, n, { strict: !1 }));
	let o = 0, s = [];
	if (i.forEach(({ $from: t, $to: n }) => {
		let r = t.pos, i = n.pos;
		e.doc.nodesBetween(r, i, (e, t) => {
			if (!e.isText && !e.marks.length) return;
			let n = Math.max(r, t), a = Math.min(i, t + e.nodeSize), c = a - n;
			o += c, s.push(...e.marks.map((e) => ({
				mark: e,
				from: n,
				to: a
			})));
		});
	}), o === 0) return !1;
	let c = s.filter((e) => a ? a.name === e.mark.type.name : !0).filter((e) => vh(e.mark.attrs, n, { strict: !1 })).reduce((e, t) => e + t.to - t.from, 0), l = s.filter((e) => a ? e.mark.type !== a && e.mark.type.excludes(a) : !0).reduce((e, t) => e + t.to - t.from, 0);
	return (c > 0 ? c + l : c) >= o;
}
function wg(e, t, n = {}) {
	if (!t) return Zh(e, null, n) || Cg(e, null, n);
	let r = ng(t, e.schema);
	return r === "node" ? Zh(e, t, n) : r === "mark" ? Cg(e, t, n) : !1;
}
function Tg(e, t) {
	let { nodeExtensions: n } = Cm(t), r = n.find((t) => t.name === e);
	if (!r) return !1;
	let i = $(Q(r, "group", {
		name: r.name,
		options: r.options,
		storage: r.storage
	}));
	return typeof i == "string" ? i.split(" ").includes("list") : !1;
}
function Eg(e, { checkChildren: t = !0, ignoreWhitespace: n = !1 } = {}) {
	if (n) {
		if (e.type.name === "hardBreak") return !0;
		if (e.isText) return /^\s*$/m.test(e.text ?? "");
	}
	if (e.isText) return !e.text;
	if (e.isAtom || e.isLeaf) return !1;
	if (e.content.childCount === 0) return !0;
	if (t) {
		let r = !0;
		return e.content.forEach((e) => {
			r !== !1 && (Eg(e, {
				ignoreWhitespace: n,
				checkChildren: t
			}) || (r = !1));
		}), r;
	}
	return !1;
}
function Dg(e) {
	return e instanceof Z;
}
function Og(e, t, n) {
	let { selection: r } = t, i = null;
	if (Th(r) && (i = r.$cursor), i) {
		let t = e.storedMarks ?? i.marks();
		return !!n.isInSet(t) || !t.some((e) => e.type.excludes(n));
	}
	let { ranges: a } = r;
	return a.some(({ $from: t, $to: r }) => {
		let i = t.depth === 0 ? e.doc.inlineContent && e.doc.type.allowsMarkType(n) : !1;
		return e.doc.nodesBetween(t.pos, r.pos, (e, t, r) => {
			if (i) return !1;
			if (e.isInline) {
				let t = !r || r.type.allowsMarkType(n), a = !!n.isInSet(e.marks) || !e.marks.some((e) => e.type.excludes(n));
				i = t && a;
			}
			return !i;
		}), i;
	});
}
var kg = (e, t = {}) => ({ tr: n, state: r, dispatch: i }) => {
	let { selection: a } = n, { empty: o, ranges: s } = a, c = Sh(e, r.schema);
	if (i) if (o) {
		let e = mg(r, c);
		n.addStoredMark(c.create({
			...e,
			...t
		}));
	} else s.forEach((e) => {
		let i = e.$from.pos, a = e.$to.pos;
		r.doc.nodesBetween(i, a, (e, r) => {
			let o = Math.max(r, i), s = Math.min(r + e.nodeSize, a);
			e.marks.find((e) => e.type === c) ? e.marks.forEach((e) => {
				c === e.type && n.addMark(o, s, c.create({
					...e.attrs,
					...t
				}));
			}) : n.addMark(o, s, c.create(t));
		});
	});
	return Og(r, n, c);
}, Ag = (e, t) => ({ tr: n }) => (n.setMeta(e, t), !0), jg = (e, t = {}) => ({ state: n, dispatch: r, chain: i }) => {
	let a = Tm(e, n.schema), o;
	return n.selection.$anchor.sameParent(n.selection.$head) && (o = n.selection.$anchor.parent.attrs), a.isTextblock ? i().command(({ commands: e }) => sm(a, {
		...o,
		...t
	})(n) ? !0 : e.clearNodes()).command(({ state: e }) => sm(a, {
		...o,
		...t
	})(e, r)).run() : (console.warn("[tiptap warn]: Currently \"setNode()\" only supports text block nodes."), !1);
}, Mg = (e) => ({ tr: t, dispatch: n }) => {
	if (n) {
		let { doc: n } = t, r = Eh(e, 0, n.content.size), i = Z.create(n, r);
		t.setSelection(i);
	}
	return !0;
}, Ng = (e) => ({ tr: t, dispatch: n }) => {
	if (n) {
		let { doc: n } = t, { from: r, to: i } = typeof e == "number" ? {
			from: e,
			to: e
		} : e, a = X.atStart(n).from, o = X.atEnd(n).to, s = Eh(r, a, o), c = Eh(i, a, o), l = X.create(n, s, c);
		t.setSelection(l);
	}
	return !0;
}, Pg = (e) => ({ state: t, dispatch: n }) => ym(Tm(e, t.schema))(t, n);
function Fg(e, t) {
	let n = e.storedMarks || e.selection.$to.parentOffset && e.selection.$from.marks();
	if (n) {
		let r = n.filter((e) => t?.includes(e.type.name));
		e.tr.ensureMarks(r);
	}
}
var Ig = ({ keepMarks: e = !0 } = {}) => ({ tr: t, state: n, dispatch: r, editor: i }) => {
	let { selection: a, doc: o } = t, { $from: s, $to: c } = a, l = i.extensionManager.attributes, u = Sg(l, s.node().type.name, s.node().attrs);
	if (a instanceof Z && a.node.isBlock) return !s.parentOffset || !Js(o, s.pos) ? !1 : (r && (e && Fg(n, i.extensionManager.splittableMarks), t.split(s.pos).scrollIntoView()), !0);
	if (!s.parent.isBlock) return !1;
	let d = c.parentOffset === c.parent.content.size, f = s.depth === 0 ? void 0 : hg(s.node(-1).contentMatchAt(s.indexAfter(-1))), p = d && f ? [{
		type: f,
		attrs: u
	}] : void 0, m = Js(t.doc, t.mapping.map(s.pos), 1, p);
	if (!p && !m && Js(t.doc, t.mapping.map(s.pos), 1, f ? [{ type: f }] : void 0) && (m = !0, p = f ? [{
		type: f,
		attrs: u
	}] : void 0), r) {
		if (m && (a instanceof X && t.deleteSelection(), t.split(t.mapping.map(s.pos), 1, p), f && !d && !s.parentOffset && s.parent.type !== f)) {
			let e = t.mapping.map(s.before()), n = t.doc.resolve(e);
			s.node(-1).canReplaceWith(n.index(), n.index() + 1, f) && t.setNodeMarkup(t.mapping.map(s.before()), f);
		}
		e && Fg(n, i.extensionManager.splittableMarks), t.scrollIntoView();
	}
	return m;
}, Lg = (e, t = {}) => ({ tr: n, state: r, dispatch: i, editor: a }) => {
	let o = Tm(e, r.schema), { $from: s, $to: c } = r.selection, l = r.selection.node;
	if (l && l.isBlock || s.depth < 2 || !s.sameParent(c)) return !1;
	let u = s.node(-1);
	if (u.type !== o) return !1;
	let d = a.extensionManager.attributes;
	if (s.parent.content.size === 0 && s.node(-1).childCount === s.indexAfter(-1)) {
		if (s.depth === 2 || s.node(-3).type !== o || s.index(-2) !== s.node(-2).childCount - 1) return !1;
		if (i) {
			let e = q.empty, r = s.index(-1) ? 1 : s.index(-2) ? 2 : 3;
			for (let t = s.depth - r; t >= s.depth - 3; --t) e = q.from(s.node(t).copy(e));
			let i = s.indexAfter(-1) < s.node(-2).childCount ? 1 : s.indexAfter(-2) < s.node(-3).childCount ? 2 : 3, a = {
				...Sg(d, s.node().type.name, s.node().attrs),
				...t
			}, c = o.contentMatch.defaultType?.createAndFill(a) || void 0;
			e = e.append(q.from(o.createAndFill(null, c) || void 0));
			let l = s.before(s.depth - (r - 1));
			n.replace(l, s.after(-i), new J(e, 4 - r, 0));
			let u = -1;
			n.doc.nodesBetween(l, n.doc.content.size, (e, t) => {
				if (u > -1) return !1;
				e.isTextblock && e.content.size === 0 && (u = t + 1);
			}), u > -1 && n.setSelection(X.near(n.doc.resolve(u))), n.scrollIntoView();
		}
		return !0;
	}
	let f = c.pos === s.end() ? u.contentMatchAt(0).defaultType : null, p = {
		...Sg(d, u.type.name, u.attrs),
		...t
	}, m = {
		...Sg(d, s.node().type.name, s.node().attrs),
		...t
	};
	n.delete(s.pos, c.pos);
	let h = f ? [{
		type: o,
		attrs: p
	}, {
		type: f,
		attrs: m
	}] : [{
		type: o,
		attrs: p
	}];
	if (!Js(n.doc, s.pos, 2)) return !1;
	if (i) {
		let { selection: e, storedMarks: t } = r, { splittableMarks: o } = a.extensionManager, c = t || e.$to.parentOffset && e.$from.marks();
		if (n.split(s.pos, 2, h).scrollIntoView(), !c || !i) return !0;
		let l = c.filter((e) => o.includes(e.type.name));
		n.ensureMarks(l);
	}
	return !0;
}, Rg = (e, t) => {
	let n = _g((e) => e.type === t)(e.selection);
	if (!n) return !0;
	let r = e.doc.resolve(Math.max(0, n.pos - 1)).before(n.depth);
	if (r === void 0) return !0;
	let i = e.doc.nodeAt(r);
	return n.node.type === i?.type && Xs(e.doc, n.pos) && e.join(n.pos), !0;
}, zg = (e, t) => {
	let n = _g((e) => e.type === t)(e.selection);
	if (!n) return !0;
	let r = e.doc.resolve(n.start).after(n.depth);
	if (r === void 0) return !0;
	let i = e.doc.nodeAt(r);
	return n.node.type === i?.type && Xs(e.doc, r) && e.join(r), !0;
}, Bg = /* @__PURE__ */ Object.freeze({
	__proto__: null,
	blur: oh,
	clearContent: sh,
	clearNodes: ch,
	command: lh,
	createParagraphNear: uh,
	cut: dh,
	deleteCurrentNode: fh,
	deleteNode: ph,
	deleteRange: mh,
	deleteSelection: hh,
	enter: gh,
	exitCode: _h,
	extendMarkRange: Ch,
	first: wh,
	focus: jh,
	forEach: Mh,
	insertContent: Nh,
	insertContentAt: zh,
	joinBackward: Hh,
	joinDown: Vh,
	joinForward: Uh,
	joinItemBackward: Wh,
	joinItemForward: Gh,
	joinTextblockBackward: Kh,
	joinTextblockForward: qh,
	joinUp: Bh,
	keyboardShortcut: Xh,
	lift: Qh,
	liftEmptyBlock: $h,
	liftListItem: eg,
	newlineInCode: tg,
	resetAttributes: ig,
	scrollIntoView: ag,
	selectAll: og,
	selectNodeBackward: sg,
	selectNodeForward: cg,
	selectParentNode: lg,
	selectTextblockEnd: ug,
	selectTextblockStart: dg,
	setContent: pg,
	setMark: kg,
	setMeta: Ag,
	setNode: jg,
	setNodeSelection: Mg,
	setTextSelection: Ng,
	sinkListItem: Pg,
	splitBlock: Ig,
	splitListItem: Lg,
	toggleList: (e, t, n, r = {}) => ({ editor: i, tr: a, state: o, dispatch: s, chain: c, commands: l, can: u }) => {
		let { extensions: d, splittableMarks: f } = i.extensionManager, p = Tm(e, o.schema), m = Tm(t, o.schema), { selection: h, storedMarks: g } = o, { $from: _, $to: v } = h, y = _.blockRange(v), b = g || h.$to.parentOffset && h.$from.marks();
		if (!y) return !1;
		let x = _g((e) => Tg(e.type.name, d))(h);
		if (y.depth >= 1 && x && y.depth - x.depth <= 1) {
			if (x.node.type === p) return l.liftListItem(m);
			if (Tg(x.node.type.name, d) && p.validContent(x.node.content) && s) return c().command(() => (a.setNodeMarkup(x.pos, p), !0)).command(() => Rg(a, p)).command(() => zg(a, p)).run();
		}
		return !n || !b || !s ? c().command(() => u().wrapInList(p, r) ? !0 : l.clearNodes()).wrapInList(p, r).command(() => Rg(a, p)).command(() => zg(a, p)).run() : c().command(() => {
			let e = u().wrapInList(p, r), t = b.filter((e) => f.includes(e.type.name));
			return a.ensureMarks(t), e ? !0 : l.clearNodes();
		}).wrapInList(p, r).command(() => Rg(a, p)).command(() => zg(a, p)).run();
	},
	toggleMark: (e, t = {}, n = {}) => ({ state: r, commands: i }) => {
		let { extendEmptyMarkRange: a = !1 } = n, o = Sh(e, r.schema);
		return Cg(r, o, t) ? i.unsetMark(o, { extendEmptyMarkRange: a }) : i.setMark(o, t);
	},
	toggleNode: (e, t, n = {}) => ({ state: r, commands: i }) => {
		let a = Tm(e, r.schema), o = Tm(t, r.schema), s = Zh(r, a, n), c;
		return r.selection.$anchor.sameParent(r.selection.$head) && (c = r.selection.$anchor.parent.attrs), s ? i.setNode(o, c) : i.setNode(a, {
			...c,
			...n
		});
	},
	toggleWrap: (e, t = {}) => ({ state: n, commands: r }) => {
		let i = Tm(e, n.schema);
		return Zh(n, i, t) ? r.lift(i) : r.wrapIn(i, t);
	},
	undoInputRule: () => ({ state: e, dispatch: t }) => {
		let n = e.plugins;
		for (let r = 0; r < n.length; r += 1) {
			let i = n[r], a;
			if (i.spec.isInputRules && (a = i.getState(e))) {
				if (t) {
					let t = e.tr, n = a.transform;
					for (let e = n.steps.length - 1; e >= 0; --e) t.step(n.steps[e].invert(n.docs[e]));
					if (a.text) {
						let n = t.doc.resolve(a.from).marks();
						t.replaceWith(a.from, a.to, e.schema.text(a.text, n));
					} else t.delete(a.from, a.to);
				}
				return !0;
			}
		}
		return !1;
	},
	unsetAllMarks: () => ({ tr: e, dispatch: t }) => {
		let { selection: n } = e, { empty: r, ranges: i } = n;
		return r || t && i.forEach((t) => {
			e.removeMark(t.$from.pos, t.$to.pos);
		}), !0;
	},
	unsetMark: (e, t = {}) => ({ tr: n, state: r, dispatch: i }) => {
		let { extendEmptyMarkRange: a = !1 } = t, { selection: o } = n, s = Sh(e, r.schema), { $from: c, empty: l, ranges: u } = o;
		if (!i) return !0;
		if (l && a) {
			let { from: e, to: t } = o, r = xh(c, s, c.marks().find((e) => e.type === s)?.attrs);
			r && (e = r.from, t = r.to), n.removeMark(e, t, s);
		} else u.forEach((e) => {
			n.removeMark(e.$from.pos, e.$to.pos, s);
		});
		return n.removeStoredMark(s), !0;
	},
	updateAttributes: (e, t = {}) => ({ tr: n, state: r, dispatch: i }) => {
		let a = null, o = null, s = ng(typeof e == "string" ? e : e.name, r.schema);
		return s ? (s === "node" && (a = Tm(e, r.schema)), s === "mark" && (o = Sh(e, r.schema)), i && n.selection.ranges.forEach((e) => {
			let i = e.$from.pos, s = e.$to.pos, c, l, u, d;
			n.selection.empty ? r.doc.nodesBetween(i, s, (e, t) => {
				a && a === e.type && (u = Math.max(t, i), d = Math.min(t + e.nodeSize, s), c = t, l = e);
			}) : r.doc.nodesBetween(i, s, (e, r) => {
				r < i && a && a === e.type && (u = Math.max(r, i), d = Math.min(r + e.nodeSize, s), c = r, l = e), r >= i && r <= s && (a && a === e.type && n.setNodeMarkup(r, void 0, {
					...e.attrs,
					...t
				}), o && e.marks.length && e.marks.forEach((a) => {
					if (o === a.type) {
						let c = Math.max(r, i), l = Math.min(r + e.nodeSize, s);
						n.addMark(c, l, o.create({
							...a.attrs,
							...t
						}));
					}
				}));
			}), l && (c !== void 0 && n.setNodeMarkup(c, void 0, {
				...l.attrs,
				...t
			}), o && l.marks.length && l.marks.forEach((e) => {
				o === e.type && n.addMark(u, d, o.create({
					...e.attrs,
					...t
				}));
			}));
		}), !0) : !1;
	},
	wrapIn: (e, t = {}) => ({ state: n, dispatch: r }) => om(Tm(e, n.schema), t)(n, r),
	wrapInList: (e, t = {}) => ({ state: n, dispatch: r }) => pm(Tm(e, n.schema), t)(n, r)
}), Vg = nh.create({
	name: "commands",
	addCommands() {
		return { ...Bg };
	}
}), Hg = nh.create({
	name: "drop",
	addProseMirrorPlugins() {
		return [new Hc({
			key: new Gc("tiptapDrop"),
			props: { handleDrop: (e, t, n, r) => {
				this.editor.emit("drop", {
					editor: this.editor,
					event: t,
					slice: n,
					moved: r
				});
			} }
		})];
	}
}), Ug = nh.create({
	name: "editable",
	addProseMirrorPlugins() {
		return [new Hc({
			key: new Gc("editable"),
			props: { editable: () => this.editor.options.editable }
		})];
	}
}), Wg = new Gc("focusEvents"), Gg = nh.create({
	name: "focusEvents",
	addProseMirrorPlugins() {
		let { editor: e } = this;
		return [new Hc({
			key: Wg,
			props: { handleDOMEvents: {
				focus: (t, n) => {
					e.isFocused = !0;
					let r = e.state.tr.setMeta("focus", { event: n }).setMeta("addToHistory", !1);
					return t.dispatch(r), !1;
				},
				blur: (t, n) => {
					e.isFocused = !1;
					let r = e.state.tr.setMeta("blur", { event: n }).setMeta("addToHistory", !1);
					return t.dispatch(r), !1;
				}
			} }
		})];
	}
}), Kg = nh.create({
	name: "keymap",
	addKeyboardShortcuts() {
		let e = () => this.editor.commands.first(({ commands: e }) => [
			() => e.undoInputRule(),
			() => e.command(({ tr: t }) => {
				let { selection: n, doc: r } = t, { empty: i, $anchor: a } = n, { pos: o, parent: s } = a, c = a.parent.isTextblock && o > 0 ? t.doc.resolve(o - 1) : a, l = c.parent.type.spec.isolating, u = a.pos - a.parentOffset, d = l && c.parent.childCount === 1 ? u === a.pos : Y.atStart(r).from === o;
				return !i || !s.type.isTextblock || s.textContent.length || !d || d && a.parent.type.name === "paragraph" ? !1 : e.clearNodes();
			}),
			() => e.deleteSelection(),
			() => e.joinBackward(),
			() => e.selectNodeBackward()
		]), t = () => this.editor.commands.first(({ commands: e }) => [
			() => e.deleteSelection(),
			() => e.deleteCurrentNode(),
			() => e.joinForward(),
			() => e.selectNodeForward()
		]), n = {
			Enter: () => this.editor.commands.first(({ commands: e }) => [
				() => e.newlineInCode(),
				() => e.createParagraphNear(),
				() => e.liftEmptyBlock(),
				() => e.splitBlock()
			]),
			"Mod-Enter": () => this.editor.commands.exitCode(),
			Backspace: e,
			"Mod-Backspace": e,
			"Shift-Backspace": e,
			Delete: t,
			"Mod-Delete": t,
			"Mod-a": () => this.editor.commands.selectAll()
		}, r = { ...n }, i = {
			...n,
			"Ctrl-h": e,
			"Alt-Backspace": e,
			"Ctrl-d": t,
			"Ctrl-Alt-Backspace": t,
			"Alt-Delete": t,
			"Alt-d": t,
			"Ctrl-a": () => this.editor.commands.selectTextblockStart(),
			"Ctrl-e": () => this.editor.commands.selectTextblockEnd()
		};
		return kh() || Jh() ? i : r;
	},
	addProseMirrorPlugins() {
		return [new Hc({
			key: new Gc("clearDocument"),
			appendTransaction: (e, t, n) => {
				if (e.some((e) => e.getMeta("composition"))) return;
				let r = e.some((e) => e.docChanged) && !t.doc.eq(n.doc), i = e.some((e) => e.getMeta("preventClearDocument"));
				if (!r || i) return;
				let { empty: a, from: o, to: s } = t.selection, c = Y.atStart(t.doc).from, l = Y.atEnd(t.doc).to;
				if (a || !(o === c && s === l) || !Eg(n.doc)) return;
				let u = n.tr, d = bm({
					state: n,
					transaction: u
				}), { commands: f } = new xm({
					editor: this.editor,
					state: d
				});
				if (f.clearNodes(), u.steps.length) return u;
			}
		})];
	}
}), qg = nh.create({
	name: "paste",
	addProseMirrorPlugins() {
		return [new Hc({
			key: new Gc("tiptapPaste"),
			props: { handlePaste: (e, t, n) => {
				this.editor.emit("paste", {
					editor: this.editor,
					event: t,
					slice: n
				});
			} }
		})];
	}
}), Jg = nh.create({
	name: "tabindex",
	addProseMirrorPlugins() {
		return [new Hc({
			key: new Gc("tabindex"),
			props: { attributes: () => this.editor.isEditable ? { tabindex: "0" } : {} }
		})];
	}
}), Yg = class e {
	get name() {
		return this.node.type.name;
	}
	constructor(e, t, n = !1, r = null) {
		this.currentNode = null, this.actualDepth = null, this.isBlock = n, this.resolvedPos = e, this.editor = t, this.currentNode = r;
	}
	get node() {
		return this.currentNode || this.resolvedPos.node();
	}
	get element() {
		return this.editor.view.domAtPos(this.pos).node;
	}
	get depth() {
		return this.actualDepth ?? this.resolvedPos.depth;
	}
	get pos() {
		return this.resolvedPos.pos;
	}
	get content() {
		return this.node.content;
	}
	set content(e) {
		let t = this.from, n = this.to;
		if (this.isBlock) {
			if (this.content.size === 0) {
				console.error(`You can’t set content on a block node. Tried to set content on ${this.name} at ${this.pos}`);
				return;
			}
			t = this.from + 1, n = this.to - 1;
		}
		this.editor.commands.insertContentAt({
			from: t,
			to: n
		}, e);
	}
	get attributes() {
		return this.node.attrs;
	}
	get textContent() {
		return this.node.textContent;
	}
	get size() {
		return this.node.nodeSize;
	}
	get from() {
		return this.isBlock ? this.pos : this.resolvedPos.start(this.resolvedPos.depth);
	}
	get range() {
		return {
			from: this.from,
			to: this.to
		};
	}
	get to() {
		return this.isBlock ? this.pos + this.size : this.resolvedPos.end(this.resolvedPos.depth) + +!this.node.isText;
	}
	get parent() {
		if (this.depth === 0) return null;
		let t = this.resolvedPos.start(this.resolvedPos.depth - 1);
		return new e(this.resolvedPos.doc.resolve(t), this.editor);
	}
	get before() {
		let t = this.resolvedPos.doc.resolve(this.from - (this.isBlock ? 1 : 2));
		return t.depth !== this.depth && (t = this.resolvedPos.doc.resolve(this.from - 3)), new e(t, this.editor);
	}
	get after() {
		let t = this.resolvedPos.doc.resolve(this.to + (this.isBlock ? 2 : 1));
		return t.depth !== this.depth && (t = this.resolvedPos.doc.resolve(this.to + 3)), new e(t, this.editor);
	}
	get children() {
		let t = [];
		return this.node.content.forEach((n, r) => {
			let i = n.isBlock && !n.isTextblock, a = n.isAtom && !n.isText, o = this.pos + r + +!a;
			if (o < 0 || o > this.resolvedPos.doc.nodeSize - 2) return;
			let s = this.resolvedPos.doc.resolve(o);
			if (!i && s.depth <= this.depth) return;
			let c = new e(s, this.editor, i, i ? n : null);
			i && (c.actualDepth = this.depth + 1), t.push(new e(s, this.editor, i, i ? n : null));
		}), t;
	}
	get firstChild() {
		return this.children[0] || null;
	}
	get lastChild() {
		let e = this.children;
		return e[e.length - 1] || null;
	}
	closest(e, t = {}) {
		let n = null, r = this.parent;
		for (; r && !n;) {
			if (r.node.type.name === e) if (Object.keys(t).length > 0) {
				let e = r.node.attrs, n = Object.keys(t);
				for (let r = 0; r < n.length; r += 1) {
					let i = n[r];
					if (e[i] !== t[i]) break;
				}
			} else n = r;
			r = r.parent;
		}
		return n;
	}
	querySelector(e, t = {}) {
		return this.querySelectorAll(e, t, !0)[0] || null;
	}
	querySelectorAll(e, t = {}, n = !1) {
		let r = [];
		if (!this.children || this.children.length === 0) return r;
		let i = Object.keys(t);
		return this.children.forEach((a) => {
			n && r.length > 0 || (a.node.type.name === e && i.every((e) => t[e] === a.node.attrs[e]) && r.push(a), !(n && r.length > 0) && (r = r.concat(a.querySelectorAll(e, t, n))));
		}), r;
	}
	setAttribute(e) {
		let { tr: t } = this.editor.state;
		t.setNodeMarkup(this.from, void 0, {
			...this.node.attrs,
			...e
		}), this.editor.view.dispatch(t);
	}
}, Xg = ".ProseMirror {\n  position: relative;\n}\n\n.ProseMirror {\n  word-wrap: break-word;\n  white-space: pre-wrap;\n  white-space: break-spaces;\n  -webkit-font-variant-ligatures: none;\n  font-variant-ligatures: none;\n  font-feature-settings: \"liga\" 0; /* the above doesn't seem to work in Edge */\n}\n\n.ProseMirror [contenteditable=\"false\"] {\n  white-space: normal;\n}\n\n.ProseMirror [contenteditable=\"false\"] [contenteditable=\"true\"] {\n  white-space: pre-wrap;\n}\n\n.ProseMirror pre {\n  white-space: pre-wrap;\n}\n\nimg.ProseMirror-separator {\n  display: inline !important;\n  border: none !important;\n  margin: 0 !important;\n  width: 0 !important;\n  height: 0 !important;\n}\n\n.ProseMirror-gapcursor {\n  display: none;\n  pointer-events: none;\n  position: absolute;\n  margin: 0;\n}\n\n.ProseMirror-gapcursor:after {\n  content: \"\";\n  display: block;\n  position: absolute;\n  top: -2px;\n  width: 20px;\n  border-top: 1px solid black;\n  animation: ProseMirror-cursor-blink 1.1s steps(2, start) infinite;\n}\n\n@keyframes ProseMirror-cursor-blink {\n  to {\n    visibility: hidden;\n  }\n}\n\n.ProseMirror-hideselection *::selection {\n  background: transparent;\n}\n\n.ProseMirror-hideselection *::-moz-selection {\n  background: transparent;\n}\n\n.ProseMirror-hideselection * {\n  caret-color: transparent;\n}\n\n.ProseMirror-focused .ProseMirror-gapcursor {\n  display: block;\n}\n\n.tippy-box[data-animation=fade][data-state=hidden] {\n  opacity: 0\n}";
function Zg(e, t, n) {
	let r = document.querySelector(`style[data-tiptap-style${n ? `-${n}` : ""}]`);
	if (r !== null) return r;
	let i = document.createElement("style");
	return t && i.setAttribute("nonce", t), i.setAttribute(`data-tiptap-style${n ? `-${n}` : ""}`, ""), i.innerHTML = e, document.getElementsByTagName("head")[0].appendChild(i), i;
}
var Qg = class extends Sm {
	constructor(e = {}) {
		super(), this.isFocused = !1, this.isInitialized = !1, this.extensionStorage = {}, this.options = {
			element: document.createElement("div"),
			content: "",
			injectCSS: !0,
			injectNonce: void 0,
			extensions: [],
			autofocus: !1,
			editable: !0,
			editorProps: {},
			parseOptions: {},
			coreExtensionOptions: {},
			enableInputRules: !0,
			enablePasteRules: !0,
			enableCoreExtensions: !0,
			enableContentCheck: !1,
			emitContentError: !1,
			onBeforeCreate: () => null,
			onCreate: () => null,
			onUpdate: () => null,
			onSelectionUpdate: () => null,
			onTransaction: () => null,
			onFocus: () => null,
			onBlur: () => null,
			onDestroy: () => null,
			onContentError: ({ error: e }) => {
				throw e;
			},
			onPaste: () => null,
			onDrop: () => null
		}, this.isCapturingTransaction = !1, this.capturedTransaction = null, this.setOptions(e), this.createExtensionManager(), this.createCommandManager(), this.createSchema(), this.on("beforeCreate", this.options.onBeforeCreate), this.emit("beforeCreate", { editor: this }), this.on("contentError", this.options.onContentError), this.createView(), this.injectCSS(), this.on("create", this.options.onCreate), this.on("update", this.options.onUpdate), this.on("selectionUpdate", this.options.onSelectionUpdate), this.on("transaction", this.options.onTransaction), this.on("focus", this.options.onFocus), this.on("blur", this.options.onBlur), this.on("destroy", this.options.onDestroy), this.on("drop", ({ event: e, slice: t, moved: n }) => this.options.onDrop(e, t, n)), this.on("paste", ({ event: e, slice: t }) => this.options.onPaste(e, t)), window.setTimeout(() => {
			this.isDestroyed || (this.commands.focus(this.options.autofocus), this.emit("create", { editor: this }), this.isInitialized = !0);
		}, 0);
	}
	get storage() {
		return this.extensionStorage;
	}
	get commands() {
		return this.commandManager.commands;
	}
	chain() {
		return this.commandManager.chain();
	}
	can() {
		return this.commandManager.can();
	}
	injectCSS() {
		this.options.injectCSS && document && (this.css = Zg(Xg, this.options.injectNonce));
	}
	setOptions(e = {}) {
		this.options = {
			...this.options,
			...e
		}, !(!this.view || !this.state || this.isDestroyed) && (this.options.editorProps && this.view.setProps(this.options.editorProps), this.view.updateState(this.state));
	}
	setEditable(e, t = !0) {
		this.setOptions({ editable: e }), t && this.emit("update", {
			editor: this,
			transaction: this.state.tr
		});
	}
	get isEditable() {
		return this.options.editable && this.view && this.view.editable;
	}
	get state() {
		return this.view.state;
	}
	registerPlugin(e, t) {
		let n = Om(t) ? t(e, [...this.state.plugins]) : [...this.state.plugins, e], r = this.state.reconfigure({ plugins: n });
		return this.view.updateState(r), r;
	}
	unregisterPlugin(e) {
		if (this.isDestroyed) return;
		let t = this.state.plugins, n = t;
		if ([].concat(e).forEach((e) => {
			let t = typeof e == "string" ? `${e}$` : e.key;
			n = n.filter((e) => !e.key.startsWith(t));
		}), t.length === n.length) return;
		let r = this.state.reconfigure({ plugins: n });
		return this.view.updateState(r), r;
	}
	createExtensionManager() {
		let e = [...this.options.enableCoreExtensions ? [
			Ug,
			ah.configure({ blockSeparator: this.options.coreExtensionOptions?.clipboardTextSerializer?.blockSeparator }),
			Vg,
			Gg,
			Kg,
			Jg,
			Hg,
			qg
		].filter((e) => typeof this.options.enableCoreExtensions == "object" ? this.options.enableCoreExtensions[e.name] !== !1 : !0) : [], ...this.options.extensions].filter((e) => [
			"extension",
			"node",
			"mark"
		].includes(e?.type));
		this.extensionManager = new th(e, this);
	}
	createCommandManager() {
		this.commandManager = new xm({ editor: this });
	}
	createSchema() {
		this.schema = this.extensionManager.schema;
	}
	createView() {
		let e;
		try {
			e = fg(this.options.content, this.schema, this.options.parseOptions, { errorOnInvalidContent: this.options.enableContentCheck });
		} catch (t) {
			if (!(t instanceof Error) || !["[tiptap error]: Invalid JSON content", "[tiptap error]: Invalid HTML content"].includes(t.message)) throw t;
			this.emit("contentError", {
				editor: this,
				error: t,
				disableCollaboration: () => {
					this.storage.collaboration && (this.storage.collaboration.isDisabled = !0), this.options.extensions = this.options.extensions.filter((e) => e.name !== "collaboration"), this.createExtensionManager();
				}
			}), e = fg(this.options.content, this.schema, this.options.parseOptions, { errorOnInvalidContent: !1 });
		}
		let t = Dh(e, this.options.autofocus);
		this.view = new cp(this.options.element, {
			...this.options.editorProps,
			attributes: {
				role: "textbox",
				...this.options.editorProps?.attributes
			},
			dispatchTransaction: this.dispatchTransaction.bind(this),
			state: Bc.create({
				doc: e,
				selection: t || void 0
			})
		});
		let n = this.state.reconfigure({ plugins: this.extensionManager.plugins });
		this.view.updateState(n), this.createNodeViews(), this.prependClass();
		let r = this.view.dom;
		r.editor = this;
	}
	createNodeViews() {
		this.view.isDestroyed || this.view.setProps({ nodeViews: this.extensionManager.nodeViews });
	}
	prependClass() {
		this.view.dom.className = `tiptap ${this.view.dom.className}`;
	}
	captureTransaction(e) {
		this.isCapturingTransaction = !0, e(), this.isCapturingTransaction = !1;
		let t = this.capturedTransaction;
		return this.capturedTransaction = null, t;
	}
	dispatchTransaction(e) {
		if (this.view.isDestroyed) return;
		if (this.isCapturingTransaction) {
			if (!this.capturedTransaction) {
				this.capturedTransaction = e;
				return;
			}
			e.steps.forEach((e) => this.capturedTransaction?.step(e));
			return;
		}
		let t = this.state.apply(e), n = !this.state.selection.eq(t.selection);
		this.emit("beforeTransaction", {
			editor: this,
			transaction: e,
			nextState: t
		}), this.view.updateState(t), this.emit("transaction", {
			editor: this,
			transaction: e
		}), n && this.emit("selectionUpdate", {
			editor: this,
			transaction: e
		});
		let r = e.getMeta("focus"), i = e.getMeta("blur");
		r && this.emit("focus", {
			editor: this,
			event: r.event,
			transaction: e
		}), i && this.emit("blur", {
			editor: this,
			event: i.event,
			transaction: e
		}), !(!e.docChanged || e.getMeta("preventUpdate")) && this.emit("update", {
			editor: this,
			transaction: e
		});
	}
	getAttributes(e) {
		return bg(this.state, e);
	}
	isActive(e, t) {
		let n = typeof e == "string" ? e : null, r = typeof e == "string" ? t : e;
		return wg(this.state, n, r);
	}
	getJSON() {
		return this.state.doc.toJSON();
	}
	getHTML() {
		return Im(this.state.doc.content, this.schema);
	}
	getText(e) {
		let { blockSeparator: t = "\n\n", textSerializers: n = {} } = e || {};
		return vg(this.state.doc, {
			blockSeparator: t,
			textSerializers: {
				...ih(this.schema),
				...n
			}
		});
	}
	get isEmpty() {
		return Eg(this.state.doc);
	}
	getCharacterCount() {
		return console.warn("[tiptap warn]: \"editor.getCharacterCount()\" is deprecated. Please use \"editor.storage.characterCount.characters()\" instead."), this.state.doc.content.size - 2;
	}
	destroy() {
		if (this.emit("destroy"), this.view) {
			let e = this.view.dom;
			e && e.editor && delete e.editor, this.view.destroy();
		}
		this.removeAllListeners();
	}
	get isDestroyed() {
		return !this.view?.docView;
	}
	$node(e, t) {
		return this.$doc?.querySelector(e, t) || null;
	}
	$nodes(e, t) {
		return this.$doc?.querySelectorAll(e, t) || null;
	}
	$pos(e) {
		return new Yg(this.state.doc.resolve(e), this);
	}
	get $doc() {
		return this.$pos(0);
	}
};
function $g(e) {
	return new zm({
		find: e.find,
		handler: ({ state: t, range: n, match: r }) => {
			let i = $(e.getAttributes, void 0, r);
			if (i === !1 || i === null) return null;
			let { tr: a } = t, o = r[r.length - 1], s = r[0];
			if (o) {
				let r = s.search(/\S/), c = n.from + s.indexOf(o), l = c + o.length;
				if (xg(n.from, n.to, t.doc).filter((t) => t.mark.type.excluded.find((n) => n === e.type && n !== t.mark.type)).filter((e) => e.to > c).length) return null;
				l < n.to && a.delete(l, n.to), c > n.from && a.delete(n.from + r, c);
				let u = n.from + r + o.length;
				a.addMark(n.from + r, u, e.type.create(i || {})), a.removeStoredMark(e.type);
			}
		}
	});
}
function e_(e) {
	return new zm({
		find: e.find,
		handler: ({ state: t, range: n, match: r }) => {
			let i = $(e.getAttributes, void 0, r) || {}, { tr: a } = t, o = n.from, s = n.to, c = e.type.create(i);
			if (r[1]) {
				let e = o + r[0].lastIndexOf(r[1]);
				e > s ? e = s : s = e + r[1].length;
				let t = r[0][r[0].length - 1];
				a.insertText(t, o + r[0].length - 1), a.replaceWith(e, s, c);
			} else if (r[0]) {
				let t = e.type.isInline ? o : o - 1;
				a.insert(t, e.type.create(i)).delete(a.mapping.map(o), a.mapping.map(s));
			}
			a.scrollIntoView();
		}
	});
}
function t_(e) {
	return new zm({
		find: e.find,
		handler: ({ state: t, range: n, match: r }) => {
			let i = t.doc.resolve(n.from), a = $(e.getAttributes, void 0, r) || {};
			if (!i.node(-1).canReplaceWith(i.index(-1), i.indexAfter(-1), e.type)) return null;
			t.tr.delete(n.from, n.to).setBlockType(n.from, n.from, e.type, a);
		}
	});
}
function n_(e) {
	return new zm({
		find: e.find,
		handler: ({ state: t, range: n, match: r, chain: i }) => {
			let a = $(e.getAttributes, void 0, r) || {}, o = t.tr.delete(n.from, n.to), s = o.doc.resolve(n.from).blockRange(), c = s && Rs(s, e.type, a);
			if (!c) return null;
			if (o.wrap(s, c), e.keepMarks && e.editor) {
				let { selection: n, storedMarks: r } = t, { splittableMarks: i } = e.editor.extensionManager, a = r || n.$to.parentOffset && n.$from.marks();
				if (a) {
					let e = a.filter((e) => i.includes(e.type.name));
					o.ensureMarks(e);
				}
			}
			if (e.keepAttributes) {
				let t = e.type.name === "bulletList" || e.type.name === "orderedList" ? "listItem" : "taskList";
				i().updateAttributes(t, a).run();
			}
			let l = o.doc.resolve(n.from - 1).nodeBefore;
			l && l.type === e.type && Xs(o.doc, n.from - 1) && (!e.joinPredicate || e.joinPredicate(r, l)) && o.join(n.from - 1);
		}
	});
}
var r_ = class e {
	constructor(e = {}) {
		this.type = "node", this.name = "node", this.parent = null, this.child = null, this.config = {
			name: this.name,
			defaultOptions: {}
		}, this.config = {
			...this.config,
			...e
		}, this.name = this.config.name, e.defaultOptions && Object.keys(e.defaultOptions).length > 0 && console.warn(`[tiptap warn]: BREAKING CHANGE: "defaultOptions" is deprecated. Please use "addOptions" instead. Found in extension: "${this.name}".`), this.options = this.config.defaultOptions, this.config.addOptions && (this.options = $(Q(this, "addOptions", { name: this.name }))), this.storage = $(Q(this, "addStorage", {
			name: this.name,
			options: this.options
		})) || {};
	}
	static create(t = {}) {
		return new e(t);
	}
	configure(e = {}) {
		let t = this.extend({
			...this.config,
			addOptions: () => Gm(this.options, e)
		});
		return t.name = this.name, t.parent = this.parent, t;
	}
	extend(t = {}) {
		let n = new e(t);
		return n.parent = this, this.child = n, n.name = t.name ? t.name : n.parent.name, t.defaultOptions && Object.keys(t.defaultOptions).length > 0 && console.warn(`[tiptap warn]: BREAKING CHANGE: "defaultOptions" is deprecated. Please use "addOptions" instead. Found in extension: "${n.name}".`), n.options = $(Q(n, "addOptions", { name: n.name })), n.storage = $(Q(n, "addStorage", {
			name: n.name,
			options: n.options
		})), n;
	}
};
function i_(e) {
	return new Jm({
		find: e.find,
		handler: ({ state: t, range: n, match: r, pasteEvent: i }) => {
			let a = $(e.getAttributes, void 0, r, i);
			if (a === !1 || a === null) return null;
			let { tr: o } = t, s = r[r.length - 1], c = r[0], l = n.to;
			if (s) {
				let r = c.search(/\S/), i = n.from + c.indexOf(s), u = i + s.length;
				if (xg(n.from, n.to, t.doc).filter((t) => t.mark.type.excluded.find((n) => n === e.type && n !== t.mark.type)).filter((e) => e.to > i).length) return null;
				u < n.to && o.delete(u, n.to), i > n.from && o.delete(n.from + r, i), l = n.from + r + s.length, o.addMark(n.from + r, l, e.type.create(a || {})), o.removeStoredMark(e.type);
			}
		}
	});
}
function a_(e, t) {
	let { selection: n } = e, { $from: r } = n;
	if (n instanceof Z) {
		let e = r.index();
		return r.parent.canReplaceWith(e, e + 1, t);
	}
	let i = r.depth;
	for (; i >= 0;) {
		let e = r.index(i);
		if (r.node(i).contentMatchAt(e).matchType(t)) return !0;
		--i;
	}
	return !1;
}
//#endregion
//#region node_modules/@tiptap/extension-blockquote/dist/index.js
var o_ = /^\s*>\s$/, s_ = r_.create({
	name: "blockquote",
	addOptions() {
		return { HTMLAttributes: {} };
	},
	content: "block+",
	group: "block",
	defining: !0,
	parseHTML() {
		return [{ tag: "blockquote" }];
	},
	renderHTML({ HTMLAttributes: e }) {
		return [
			"blockquote",
			Em(this.options.HTMLAttributes, e),
			0
		];
	},
	addCommands() {
		return {
			setBlockquote: () => ({ commands: e }) => e.wrapIn(this.name),
			toggleBlockquote: () => ({ commands: e }) => e.toggleWrap(this.name),
			unsetBlockquote: () => ({ commands: e }) => e.lift(this.name)
		};
	},
	addKeyboardShortcuts() {
		return { "Mod-Shift-b": () => this.editor.commands.toggleBlockquote() };
	},
	addInputRules() {
		return [n_({
			find: o_,
			type: this.type
		})];
	}
}), c_ = /(?:^|\s)(\*\*(?!\s+\*\*)((?:[^*]+))\*\*(?!\s+\*\*))$/, l_ = /(?:^|\s)(\*\*(?!\s+\*\*)((?:[^*]+))\*\*(?!\s+\*\*))/g, u_ = /(?:^|\s)(__(?!\s+__)((?:[^_]+))__(?!\s+__))$/, d_ = /(?:^|\s)(__(?!\s+__)((?:[^_]+))__(?!\s+__))/g, f_ = Km.create({
	name: "bold",
	addOptions() {
		return { HTMLAttributes: {} };
	},
	parseHTML() {
		return [
			{ tag: "strong" },
			{
				tag: "b",
				getAttrs: (e) => e.style.fontWeight !== "normal" && null
			},
			{
				style: "font-weight=400",
				clearMark: (e) => e.type.name === this.name
			},
			{
				style: "font-weight",
				getAttrs: (e) => /^(bold(er)?|[5-9]\d{2,})$/.test(e) && null
			}
		];
	},
	renderHTML({ HTMLAttributes: e }) {
		return [
			"strong",
			Em(this.options.HTMLAttributes, e),
			0
		];
	},
	addCommands() {
		return {
			setBold: () => ({ commands: e }) => e.setMark(this.name),
			toggleBold: () => ({ commands: e }) => e.toggleMark(this.name),
			unsetBold: () => ({ commands: e }) => e.unsetMark(this.name)
		};
	},
	addKeyboardShortcuts() {
		return {
			"Mod-b": () => this.editor.commands.toggleBold(),
			"Mod-B": () => this.editor.commands.toggleBold()
		};
	},
	addInputRules() {
		return [$g({
			find: c_,
			type: this.type
		}), $g({
			find: u_,
			type: this.type
		})];
	},
	addPasteRules() {
		return [i_({
			find: l_,
			type: this.type
		}), i_({
			find: d_,
			type: this.type
		})];
	}
}), p_ = "listItem", m_ = "textStyle", h_ = /^\s*([-+*])\s$/, g_ = r_.create({
	name: "bulletList",
	addOptions() {
		return {
			itemTypeName: "listItem",
			HTMLAttributes: {},
			keepMarks: !1,
			keepAttributes: !1
		};
	},
	group: "block list",
	content() {
		return `${this.options.itemTypeName}+`;
	},
	parseHTML() {
		return [{ tag: "ul" }];
	},
	renderHTML({ HTMLAttributes: e }) {
		return [
			"ul",
			Em(this.options.HTMLAttributes, e),
			0
		];
	},
	addCommands() {
		return { toggleBulletList: () => ({ commands: e, chain: t }) => this.options.keepAttributes ? t().toggleList(this.name, this.options.itemTypeName, this.options.keepMarks).updateAttributes(p_, this.editor.getAttributes(m_)).run() : e.toggleList(this.name, this.options.itemTypeName, this.options.keepMarks) };
	},
	addKeyboardShortcuts() {
		return { "Mod-Shift-8": () => this.editor.commands.toggleBulletList() };
	},
	addInputRules() {
		let e = n_({
			find: h_,
			type: this.type
		});
		return (this.options.keepMarks || this.options.keepAttributes) && (e = n_({
			find: h_,
			type: this.type,
			keepMarks: this.options.keepMarks,
			keepAttributes: this.options.keepAttributes,
			getAttributes: () => this.editor.getAttributes(m_),
			editor: this.editor
		})), [e];
	}
}), __ = /(^|[^`])`([^`]+)`(?!`)/, v_ = /(^|[^`])`([^`]+)`(?!`)/g, y_ = Km.create({
	name: "code",
	addOptions() {
		return { HTMLAttributes: {} };
	},
	excludes: "_",
	code: !0,
	exitable: !0,
	parseHTML() {
		return [{ tag: "code" }];
	},
	renderHTML({ HTMLAttributes: e }) {
		return [
			"code",
			Em(this.options.HTMLAttributes, e),
			0
		];
	},
	addCommands() {
		return {
			setCode: () => ({ commands: e }) => e.setMark(this.name),
			toggleCode: () => ({ commands: e }) => e.toggleMark(this.name),
			unsetCode: () => ({ commands: e }) => e.unsetMark(this.name)
		};
	},
	addKeyboardShortcuts() {
		return { "Mod-e": () => this.editor.commands.toggleCode() };
	},
	addInputRules() {
		return [$g({
			find: __,
			type: this.type
		})];
	},
	addPasteRules() {
		return [i_({
			find: v_,
			type: this.type
		})];
	}
}), b_ = /^```([a-z]+)?[\s\n]$/, x_ = /^~~~([a-z]+)?[\s\n]$/, S_ = r_.create({
	name: "codeBlock",
	addOptions() {
		return {
			languageClassPrefix: "language-",
			exitOnTripleEnter: !0,
			exitOnArrowDown: !0,
			defaultLanguage: null,
			HTMLAttributes: {}
		};
	},
	content: "text*",
	marks: "",
	group: "block",
	code: !0,
	defining: !0,
	addAttributes() {
		return { language: {
			default: this.options.defaultLanguage,
			parseHTML: (e) => {
				let { languageClassPrefix: t } = this.options;
				return [...e.firstElementChild?.classList || []].filter((e) => e.startsWith(t)).map((e) => e.replace(t, ""))[0] || null;
			},
			rendered: !1
		} };
	},
	parseHTML() {
		return [{
			tag: "pre",
			preserveWhitespace: "full"
		}];
	},
	renderHTML({ node: e, HTMLAttributes: t }) {
		return [
			"pre",
			Em(this.options.HTMLAttributes, t),
			[
				"code",
				{ class: e.attrs.language ? this.options.languageClassPrefix + e.attrs.language : null },
				0
			]
		];
	},
	addCommands() {
		return {
			setCodeBlock: (e) => ({ commands: t }) => t.setNode(this.name, e),
			toggleCodeBlock: (e) => ({ commands: t }) => t.toggleNode(this.name, "paragraph", e)
		};
	},
	addKeyboardShortcuts() {
		return {
			"Mod-Alt-c": () => this.editor.commands.toggleCodeBlock(),
			Backspace: () => {
				let { empty: e, $anchor: t } = this.editor.state.selection, n = t.pos === 1;
				return !e || t.parent.type.name !== this.name ? !1 : n || !t.parent.textContent.length ? this.editor.commands.clearNodes() : !1;
			},
			Enter: ({ editor: e }) => {
				if (!this.options.exitOnTripleEnter) return !1;
				let { state: t } = e, { selection: n } = t, { $from: r, empty: i } = n;
				if (!i || r.parent.type !== this.type) return !1;
				let a = r.parentOffset === r.parent.nodeSize - 2, o = r.parent.textContent.endsWith("\n\n");
				return !a || !o ? !1 : e.chain().command(({ tr: e }) => (e.delete(r.pos - 2, r.pos), !0)).exitCode().run();
			},
			ArrowDown: ({ editor: e }) => {
				if (!this.options.exitOnArrowDown) return !1;
				let { state: t } = e, { selection: n, doc: r } = t, { $from: i, empty: a } = n;
				if (!a || i.parent.type !== this.type || i.parentOffset !== i.parent.nodeSize - 2) return !1;
				let o = i.after();
				return o === void 0 ? !1 : r.nodeAt(o) ? e.commands.command(({ tr: e }) => (e.setSelection(Y.near(r.resolve(o))), !0)) : e.commands.exitCode();
			}
		};
	},
	addInputRules() {
		return [t_({
			find: b_,
			type: this.type,
			getAttributes: (e) => ({ language: e[1] })
		}), t_({
			find: x_,
			type: this.type,
			getAttributes: (e) => ({ language: e[1] })
		})];
	},
	addProseMirrorPlugins() {
		return [new Hc({
			key: new Gc("codeBlockVSCodeHandler"),
			props: { handlePaste: (e, t) => {
				if (!t.clipboardData || this.editor.isActive(this.type.name)) return !1;
				let n = t.clipboardData.getData("text/plain"), r = t.clipboardData.getData("vscode-editor-data"), i = (r ? JSON.parse(r) : void 0)?.mode;
				if (!n || !i) return !1;
				let { tr: a, schema: o } = e.state, s = o.text(n.replace(/\r\n?/g, "\n"));
				return a.replaceSelectionWith(this.type.create({ language: i }, s)), a.selection.$from.parent.type !== this.type && a.setSelection(X.near(a.doc.resolve(Math.max(0, a.selection.from - 2)))), a.setMeta("paste", !0), e.dispatch(a), !0;
			} }
		})];
	}
}), C_ = r_.create({
	name: "doc",
	topNode: !0,
	content: "block+"
});
//#endregion
//#region node_modules/prosemirror-dropcursor/dist/index.js
function w_(e = {}) {
	return new Hc({ view(t) {
		return new T_(t, e);
	} });
}
var T_ = class {
	constructor(e, t) {
		this.editorView = e, this.cursorPos = null, this.element = null, this.timeout = -1, this.width = t.width ?? 1, this.color = t.color === !1 ? void 0 : t.color || "black", this.class = t.class, this.handlers = [
			"dragover",
			"dragend",
			"drop",
			"dragleave"
		].map((t) => {
			let n = (e) => {
				this[t](e);
			};
			return e.dom.addEventListener(t, n), {
				name: t,
				handler: n
			};
		});
	}
	destroy() {
		this.handlers.forEach(({ name: e, handler: t }) => this.editorView.dom.removeEventListener(e, t));
	}
	update(e, t) {
		this.cursorPos != null && t.doc != e.state.doc && (this.cursorPos > e.state.doc.content.size ? this.setCursor(null) : this.updateOverlay());
	}
	setCursor(e) {
		e != this.cursorPos && (this.cursorPos = e, e == null ? (this.element.parentNode.removeChild(this.element), this.element = null) : this.updateOverlay());
	}
	updateOverlay() {
		let e = this.editorView.state.doc.resolve(this.cursorPos), t = !e.parent.inlineContent, n, r = this.editorView.dom, i = r.getBoundingClientRect(), a = i.width / r.offsetWidth, o = i.height / r.offsetHeight;
		if (t) {
			let t = e.nodeBefore, r = e.nodeAfter;
			if (t || r) {
				let e = this.editorView.nodeDOM(this.cursorPos - (t ? t.nodeSize : 0));
				if (e) {
					let i = e.getBoundingClientRect(), a = t ? i.bottom : i.top;
					t && r && (a = (a + this.editorView.nodeDOM(this.cursorPos).getBoundingClientRect().top) / 2);
					let s = this.width / 2 * o;
					n = {
						left: i.left,
						right: i.right,
						top: a - s,
						bottom: a + s
					};
				}
			}
		}
		if (!n) {
			let e = this.editorView.coordsAtPos(this.cursorPos), t = this.width / 2 * a;
			n = {
				left: e.left - t,
				right: e.left + t,
				top: e.top,
				bottom: e.bottom
			};
		}
		let s = this.editorView.dom.offsetParent;
		this.element || (this.element = s.appendChild(document.createElement("div")), this.class && (this.element.className = this.class), this.element.style.cssText = "position: absolute; z-index: 50; pointer-events: none;", this.color && (this.element.style.backgroundColor = this.color)), this.element.classList.toggle("prosemirror-dropcursor-block", t), this.element.classList.toggle("prosemirror-dropcursor-inline", !t);
		let c, l;
		if (!s || s == document.body && getComputedStyle(s).position == "static") c = -pageXOffset, l = -pageYOffset;
		else {
			let e = s.getBoundingClientRect(), t = e.width / s.offsetWidth, n = e.height / s.offsetHeight;
			c = e.left - s.scrollLeft * t, l = e.top - s.scrollTop * n;
		}
		this.element.style.left = (n.left - c) / a + "px", this.element.style.top = (n.top - l) / o + "px", this.element.style.width = (n.right - n.left) / a + "px", this.element.style.height = (n.bottom - n.top) / o + "px";
	}
	scheduleRemoval(e) {
		clearTimeout(this.timeout), this.timeout = setTimeout(() => this.setCursor(null), e);
	}
	dragover(e) {
		if (!this.editorView.editable) return;
		let t = this.editorView.posAtCoords({
			left: e.clientX,
			top: e.clientY
		}), n = t && t.inside >= 0 && this.editorView.state.doc.nodeAt(t.inside), r = n && n.type.spec.disableDropCursor, i = typeof r == "function" ? r(this.editorView, t, e) : r;
		if (t && !i) {
			let e = t.pos;
			if (this.editorView.dragging && this.editorView.dragging.slice) {
				let t = nc(this.editorView.state.doc, e, this.editorView.dragging.slice);
				t != null && (e = t);
			}
			this.setCursor(e), this.scheduleRemoval(5e3);
		}
	}
	dragend() {
		this.scheduleRemoval(20);
	}
	drop() {
		this.scheduleRemoval(20);
	}
	dragleave(e) {
		this.editorView.dom.contains(e.relatedTarget) || this.setCursor(null);
	}
}, E_ = nh.create({
	name: "dropCursor",
	addOptions() {
		return {
			color: "currentColor",
			width: 1,
			class: void 0
		};
	},
	addProseMirrorPlugins() {
		return [w_(this.options)];
	}
}), D_ = class e extends Y {
	constructor(e) {
		super(e, e);
	}
	map(t, n) {
		let r = t.resolve(n.map(this.head));
		return e.valid(r) ? new e(r) : Y.near(r);
	}
	content() {
		return J.empty;
	}
	eq(t) {
		return t instanceof e && t.head == this.head;
	}
	toJSON() {
		return {
			type: "gapcursor",
			pos: this.head
		};
	}
	static fromJSON(t, n) {
		if (typeof n.pos != "number") throw RangeError("Invalid input for GapCursor.fromJSON");
		return new e(t.resolve(n.pos));
	}
	getBookmark() {
		return new O_(this.anchor);
	}
	static valid(e) {
		let t = e.parent;
		if (t.inlineContent || !A_(e) || !j_(e)) return !1;
		let n = t.type.spec.allowGapCursor;
		if (n != null) return n;
		let r = t.contentMatchAt(e.index()).defaultType;
		return r && r.isTextblock;
	}
	static findGapCursorFrom(t, n, r = !1) {
		search: for (;;) {
			if (!r && e.valid(t)) return t;
			let i = t.pos, a = null;
			for (let r = t.depth;; r--) {
				let o = t.node(r);
				if (n > 0 ? t.indexAfter(r) < o.childCount : t.index(r) > 0) {
					a = o.child(n > 0 ? t.indexAfter(r) : t.index(r) - 1);
					break;
				} else if (r == 0) return null;
				i += n;
				let s = t.doc.resolve(i);
				if (e.valid(s)) return s;
			}
			for (;;) {
				let o = n > 0 ? a.firstChild : a.lastChild;
				if (!o) {
					if (a.isAtom && !a.isText && !Z.isSelectable(a)) {
						t = t.doc.resolve(i + a.nodeSize * n), r = !1;
						continue search;
					}
					break;
				}
				a = o, i += n;
				let s = t.doc.resolve(i);
				if (e.valid(s)) return s;
			}
			return null;
		}
	}
};
D_.prototype.visible = !1, D_.findFrom = D_.findGapCursorFrom, Y.jsonID("gapcursor", D_);
var O_ = class e {
	constructor(e) {
		this.pos = e;
	}
	map(t) {
		return new e(t.map(this.pos));
	}
	resolve(e) {
		let t = e.resolve(this.pos);
		return D_.valid(t) ? new D_(t) : Y.near(t);
	}
};
function k_(e) {
	return e.isAtom || e.spec.isolating || e.spec.createGapCursor;
}
function A_(e) {
	for (let t = e.depth; t >= 0; t--) {
		let n = e.index(t), r = e.node(t);
		if (n == 0) {
			if (r.type.spec.isolating) return !0;
			continue;
		}
		for (let e = r.child(n - 1);; e = e.lastChild) {
			if (e.childCount == 0 && !e.inlineContent || k_(e.type)) return !0;
			if (e.inlineContent) return !1;
		}
	}
	return !0;
}
function j_(e) {
	for (let t = e.depth; t >= 0; t--) {
		let n = e.indexAfter(t), r = e.node(t);
		if (n == r.childCount) {
			if (r.type.spec.isolating) return !0;
			continue;
		}
		for (let e = r.child(n);; e = e.firstChild) {
			if (e.childCount == 0 && !e.inlineContent || k_(e.type)) return !0;
			if (e.inlineContent) return !1;
		}
	}
	return !0;
}
function M_() {
	return new Hc({ props: {
		decorations: L_,
		createSelectionBetween(e, t, n) {
			return t.pos == n.pos && D_.valid(n) ? new D_(n) : null;
		},
		handleClick: F_,
		handleKeyDown: N_,
		handleDOMEvents: { beforeinput: I_ }
	} });
}
var N_ = kp({
	ArrowLeft: P_("horiz", -1),
	ArrowRight: P_("horiz", 1),
	ArrowUp: P_("vert", -1),
	ArrowDown: P_("vert", 1)
});
function P_(e, t) {
	let n = e == "vert" ? t > 0 ? "down" : "up" : t > 0 ? "right" : "left";
	return function(e, r, i) {
		let a = e.selection, o = t > 0 ? a.$to : a.$from, s = a.empty;
		if (a instanceof X) {
			if (!i.endOfTextblock(n) || o.depth == 0) return !1;
			s = !1, o = e.doc.resolve(t > 0 ? o.after() : o.before());
		}
		let c = D_.findGapCursorFrom(o, t, s);
		return c ? (r && r(e.tr.setSelection(new D_(c))), !0) : !1;
	};
}
function F_(e, t, n) {
	if (!e || !e.editable) return !1;
	let r = e.state.doc.resolve(t);
	if (!D_.valid(r)) return !1;
	let i = e.posAtCoords({
		left: n.clientX,
		top: n.clientY
	});
	return i && i.inside > -1 && Z.isSelectable(e.state.doc.nodeAt(i.inside)) ? !1 : (e.dispatch(e.state.tr.setSelection(new D_(r))), !0);
}
function I_(e, t) {
	if (t.inputType != "insertCompositionText" || !(e.state.selection instanceof D_)) return !1;
	let { $from: n } = e.state.selection, r = n.parent.contentMatchAt(n.index()).findWrapping(e.state.schema.nodes.text);
	if (!r) return !1;
	let i = q.empty;
	for (let e = r.length - 1; e >= 0; e--) i = q.from(r[e].createAndFill(null, i));
	let a = e.state.tr.replace(n.pos, n.pos, new J(i, 0, 0));
	return a.setSelection(X.near(a.doc.resolve(n.pos + 1))), e.dispatch(a), !1;
}
function L_(e) {
	if (!(e.selection instanceof D_)) return null;
	let t = document.createElement("div");
	return t.className = "ProseMirror-gapcursor", Of.create(e.doc, [Tf.widget(e.selection.head, t, { key: "gapcursor" })]);
}
//#endregion
//#region node_modules/@tiptap/extension-gapcursor/dist/index.js
var R_ = nh.create({
	name: "gapCursor",
	addProseMirrorPlugins() {
		return [M_()];
	},
	extendNodeSchema(e) {
		return { allowGapCursor: $(Q(e, "allowGapCursor", {
			name: e.name,
			options: e.options,
			storage: e.storage
		})) ?? null };
	}
}), z_ = r_.create({
	name: "hardBreak",
	addOptions() {
		return {
			keepMarks: !0,
			HTMLAttributes: {}
		};
	},
	inline: !0,
	group: "inline",
	selectable: !1,
	linebreakReplacement: !0,
	parseHTML() {
		return [{ tag: "br" }];
	},
	renderHTML({ HTMLAttributes: e }) {
		return ["br", Em(this.options.HTMLAttributes, e)];
	},
	renderText() {
		return "\n";
	},
	addCommands() {
		return { setHardBreak: () => ({ commands: e, chain: t, state: n, editor: r }) => e.first([() => e.exitCode(), () => e.command(() => {
			let { selection: e, storedMarks: i } = n;
			if (e.$from.parent.type.spec.isolating) return !1;
			let { keepMarks: a } = this.options, { splittableMarks: o } = r.extensionManager, s = i || e.$to.parentOffset && e.$from.marks();
			return t().insertContent({ type: this.name }).command(({ tr: e, dispatch: t }) => {
				if (t && s && a) {
					let t = s.filter((e) => o.includes(e.type.name));
					e.ensureMarks(t);
				}
				return !0;
			}).run();
		})]) };
	},
	addKeyboardShortcuts() {
		return {
			"Mod-Enter": () => this.editor.commands.setHardBreak(),
			"Shift-Enter": () => this.editor.commands.setHardBreak()
		};
	}
}), B_ = r_.create({
	name: "heading",
	addOptions() {
		return {
			levels: [
				1,
				2,
				3,
				4,
				5,
				6
			],
			HTMLAttributes: {}
		};
	},
	content: "inline*",
	group: "block",
	defining: !0,
	addAttributes() {
		return { level: {
			default: 1,
			rendered: !1
		} };
	},
	parseHTML() {
		return this.options.levels.map((e) => ({
			tag: `h${e}`,
			attrs: { level: e }
		}));
	},
	renderHTML({ node: e, HTMLAttributes: t }) {
		return [
			`h${this.options.levels.includes(e.attrs.level) ? e.attrs.level : this.options.levels[0]}`,
			Em(this.options.HTMLAttributes, t),
			0
		];
	},
	addCommands() {
		return {
			setHeading: (e) => ({ commands: t }) => this.options.levels.includes(e.level) ? t.setNode(this.name, e) : !1,
			toggleHeading: (e) => ({ commands: t }) => this.options.levels.includes(e.level) ? t.toggleNode(this.name, "paragraph", e) : !1
		};
	},
	addKeyboardShortcuts() {
		return this.options.levels.reduce((e, t) => ({
			...e,
			[`Mod-Alt-${t}`]: () => this.editor.commands.toggleHeading({ level: t })
		}), {});
	},
	addInputRules() {
		return this.options.levels.map((e) => t_({
			find: RegExp(`^(#{${Math.min(...this.options.levels)},${e}})\\s$`),
			type: this.type,
			getAttributes: { level: e }
		}));
	}
}), V_ = 200, H_ = function() {};
H_.prototype.append = function(e) {
	return e.length ? (e = H_.from(e), !this.length && e || e.length < V_ && this.leafAppend(e) || this.length < V_ && e.leafPrepend(this) || this.appendInner(e)) : this;
}, H_.prototype.prepend = function(e) {
	return e.length ? H_.from(e).append(this) : this;
}, H_.prototype.appendInner = function(e) {
	return new W_(this, e);
}, H_.prototype.slice = function(e, t) {
	return e === void 0 && (e = 0), t === void 0 && (t = this.length), e >= t ? H_.empty : this.sliceInner(Math.max(0, e), Math.min(this.length, t));
}, H_.prototype.get = function(e) {
	if (!(e < 0 || e >= this.length)) return this.getInner(e);
}, H_.prototype.forEach = function(e, t, n) {
	t === void 0 && (t = 0), n === void 0 && (n = this.length), t <= n ? this.forEachInner(e, t, n, 0) : this.forEachInvertedInner(e, t, n, 0);
}, H_.prototype.map = function(e, t, n) {
	t === void 0 && (t = 0), n === void 0 && (n = this.length);
	var r = [];
	return this.forEach(function(t, n) {
		return r.push(e(t, n));
	}, t, n), r;
}, H_.from = function(e) {
	return e instanceof H_ ? e : e && e.length ? new U_(e) : H_.empty;
};
var U_ = /* @__PURE__ */ function(e) {
	function t(t) {
		e.call(this), this.values = t;
	}
	e && (t.__proto__ = e), t.prototype = Object.create(e && e.prototype), t.prototype.constructor = t;
	var n = {
		length: { configurable: !0 },
		depth: { configurable: !0 }
	};
	return t.prototype.flatten = function() {
		return this.values;
	}, t.prototype.sliceInner = function(e, n) {
		return e == 0 && n == this.length ? this : new t(this.values.slice(e, n));
	}, t.prototype.getInner = function(e) {
		return this.values[e];
	}, t.prototype.forEachInner = function(e, t, n, r) {
		for (var i = t; i < n; i++) if (e(this.values[i], r + i) === !1) return !1;
	}, t.prototype.forEachInvertedInner = function(e, t, n, r) {
		for (var i = t - 1; i >= n; i--) if (e(this.values[i], r + i) === !1) return !1;
	}, t.prototype.leafAppend = function(e) {
		if (this.length + e.length <= V_) return new t(this.values.concat(e.flatten()));
	}, t.prototype.leafPrepend = function(e) {
		if (this.length + e.length <= V_) return new t(e.flatten().concat(this.values));
	}, n.length.get = function() {
		return this.values.length;
	}, n.depth.get = function() {
		return 0;
	}, Object.defineProperties(t.prototype, n), t;
}(H_);
H_.empty = new U_([]);
var W_ = /* @__PURE__ */ function(e) {
	function t(t, n) {
		e.call(this), this.left = t, this.right = n, this.length = t.length + n.length, this.depth = Math.max(t.depth, n.depth) + 1;
	}
	return e && (t.__proto__ = e), t.prototype = Object.create(e && e.prototype), t.prototype.constructor = t, t.prototype.flatten = function() {
		return this.left.flatten().concat(this.right.flatten());
	}, t.prototype.getInner = function(e) {
		return e < this.left.length ? this.left.get(e) : this.right.get(e - this.left.length);
	}, t.prototype.forEachInner = function(e, t, n, r) {
		var i = this.left.length;
		if (t < i && this.left.forEachInner(e, t, Math.min(n, i), r) === !1 || n > i && this.right.forEachInner(e, Math.max(t - i, 0), Math.min(this.length, n) - i, r + i) === !1) return !1;
	}, t.prototype.forEachInvertedInner = function(e, t, n, r) {
		var i = this.left.length;
		if (t > i && this.right.forEachInvertedInner(e, t - i, Math.max(n, i) - i, r + i) === !1 || n < i && this.left.forEachInvertedInner(e, Math.min(t, i), n, r) === !1) return !1;
	}, t.prototype.sliceInner = function(e, t) {
		if (e == 0 && t == this.length) return this;
		var n = this.left.length;
		return t <= n ? this.left.slice(e, t) : e >= n ? this.right.slice(e - n, t - n) : this.left.slice(e, n).append(this.right.slice(0, t - n));
	}, t.prototype.leafAppend = function(e) {
		var n = this.right.leafAppend(e);
		if (n) return new t(this.left, n);
	}, t.prototype.leafPrepend = function(e) {
		var n = this.left.leafPrepend(e);
		if (n) return new t(n, this.right);
	}, t.prototype.appendInner = function(e) {
		return this.left.depth >= Math.max(this.right.depth, e.depth) + 1 ? new t(this.left, new t(this.right, e)) : new t(this, e);
	}, t;
}(H_), G_ = 500, K_ = class e {
	constructor(e, t) {
		this.items = e, this.eventCount = t;
	}
	popEvent(t, n) {
		if (this.eventCount == 0) return null;
		let r = this.items.length;
		for (;; r--) if (this.items.get(r - 1).selection) {
			--r;
			break;
		}
		let i, a;
		n && (i = this.remapping(r, this.items.length), a = i.maps.length);
		let o = t.tr, s, c, l = [], u = [];
		return this.items.forEach((t, n) => {
			if (!t.step) {
				i || (i = this.remapping(r, n + 1), a = i.maps.length), a--, u.push(t);
				return;
			}
			if (i) {
				u.push(new J_(t.map));
				let e = t.step.map(i.slice(a)), n;
				e && o.maybeStep(e).doc && (n = o.mapping.maps[o.mapping.maps.length - 1], l.push(new J_(n, void 0, void 0, l.length + u.length))), a--, n && i.appendMap(n, a);
			} else o.maybeStep(t.step);
			if (t.selection) return s = i ? t.selection.map(i.slice(a)) : t.selection, c = new e(this.items.slice(0, r).append(u.reverse().concat(l)), this.eventCount - 1), !1;
		}, this.items.length, 0), {
			remaining: c,
			transform: o,
			selection: s
		};
	}
	addTransform(t, n, r, i) {
		let a = [], o = this.eventCount, s = this.items, c = !i && s.length ? s.get(s.length - 1) : null;
		for (let e = 0; e < t.steps.length; e++) {
			let r = t.steps[e].invert(t.docs[e]), l = new J_(t.mapping.maps[e], r, n), u;
			(u = c && c.merge(l)) && (l = u, e ? a.pop() : s = s.slice(0, s.length - 1)), a.push(l), n &&= (o++, void 0), i || (c = l);
		}
		let l = o - r.depth;
		return l > X_ && (s = q_(s, l), o -= l), new e(s.append(a), o);
	}
	remapping(e, t) {
		let n = new bs();
		return this.items.forEach((t, r) => {
			let i = t.mirrorOffset != null && r - t.mirrorOffset >= e ? n.maps.length - t.mirrorOffset : void 0;
			n.appendMap(t.map, i);
		}, e, t), n;
	}
	addMaps(t) {
		return this.eventCount == 0 ? this : new e(this.items.append(t.map((e) => new J_(e))), this.eventCount);
	}
	rebased(t, n) {
		if (!this.eventCount) return this;
		let r = [], i = Math.max(0, this.items.length - n), a = t.mapping, o = t.steps.length, s = this.eventCount;
		this.items.forEach((e) => {
			e.selection && s--;
		}, i);
		let c = n;
		this.items.forEach((e) => {
			let n = a.getMirror(--c);
			if (n == null) return;
			o = Math.min(o, n);
			let i = a.maps[n];
			if (e.step) {
				let o = t.steps[n].invert(t.docs[n]), l = e.selection && e.selection.map(a.slice(c + 1, n));
				l && s++, r.push(new J_(i, o, l));
			} else r.push(new J_(i));
		}, i);
		let l = [];
		for (let e = n; e < o; e++) l.push(new J_(a.maps[e]));
		let u = new e(this.items.slice(0, i).append(l).append(r), s);
		return u.emptyItemCount() > G_ && (u = u.compress(this.items.length - r.length)), u;
	}
	emptyItemCount() {
		let e = 0;
		return this.items.forEach((t) => {
			t.step || e++;
		}), e;
	}
	compress(t = this.items.length) {
		let n = this.remapping(0, t), r = n.maps.length, i = [], a = 0;
		return this.items.forEach((e, o) => {
			if (o >= t) i.push(e), e.selection && a++;
			else if (e.step) {
				let t = e.step.map(n.slice(r)), o = t && t.getMap();
				if (r--, o && n.appendMap(o, r), t) {
					let s = e.selection && e.selection.map(n.slice(r));
					s && a++;
					let c = new J_(o.invert(), t, s), l, u = i.length - 1;
					(l = i.length && i[u].merge(c)) ? i[u] = l : i.push(c);
				}
			} else e.map && r--;
		}, this.items.length, 0), new e(H_.from(i.reverse()), a);
	}
};
K_.empty = new K_(H_.empty, 0);
function q_(e, t) {
	let n;
	return e.forEach((e, r) => {
		if (e.selection && t-- == 0) return n = r, !1;
	}), e.slice(n);
}
var J_ = class e {
	constructor(e, t, n, r) {
		this.map = e, this.step = t, this.selection = n, this.mirrorOffset = r;
	}
	merge(t) {
		if (this.step && t.step && !t.selection) {
			let n = t.step.merge(this.step);
			if (n) return new e(n.getMap().invert(), n, this.selection);
		}
	}
}, Y_ = class {
	constructor(e, t, n, r, i) {
		this.done = e, this.undone = t, this.prevRanges = n, this.prevTime = r, this.prevComposition = i;
	}
}, X_ = 20;
function Z_(e, t, n, r) {
	let i = n.getMeta(av), a;
	if (i) return i.historyState;
	n.getMeta(ov) && (e = new Y_(e.done, e.undone, null, 0, -1));
	let o = n.getMeta("appendedTransaction");
	if (n.steps.length == 0) return e;
	if (o && o.getMeta(av)) return o.getMeta(av).redo ? new Y_(e.done.addTransform(n, void 0, r, iv(t)), e.undone, $_(n.mapping.maps), e.prevTime, e.prevComposition) : new Y_(e.done, e.undone.addTransform(n, void 0, r, iv(t)), null, e.prevTime, e.prevComposition);
	if (n.getMeta("addToHistory") !== !1 && !(o && o.getMeta("addToHistory") === !1)) {
		let i = n.getMeta("composition"), a = e.prevTime == 0 || !o && e.prevComposition != i && (e.prevTime < (n.time || 0) - r.newGroupDelay || !Q_(n, e.prevRanges)), s = o ? ev(e.prevRanges, n.mapping) : $_(n.mapping.maps);
		return new Y_(e.done.addTransform(n, a ? t.selection.getBookmark() : void 0, r, iv(t)), K_.empty, s, n.time, i ?? e.prevComposition);
	} else if (a = n.getMeta("rebased")) return new Y_(e.done.rebased(n, a), e.undone.rebased(n, a), ev(e.prevRanges, n.mapping), e.prevTime, e.prevComposition);
	else return new Y_(e.done.addMaps(n.mapping.maps), e.undone.addMaps(n.mapping.maps), ev(e.prevRanges, n.mapping), e.prevTime, e.prevComposition);
}
function Q_(e, t) {
	if (!t) return !1;
	if (!e.docChanged) return !0;
	let n = !1;
	return e.mapping.maps[0].forEach((e, r) => {
		for (let i = 0; i < t.length; i += 2) e <= t[i + 1] && r >= t[i] && (n = !0);
	}), n;
}
function $_(e) {
	let t = [];
	for (let n = e.length - 1; n >= 0 && t.length == 0; n--) e[n].forEach((e, n, r, i) => t.push(r, i));
	return t;
}
function ev(e, t) {
	if (!e) return null;
	let n = [];
	for (let r = 0; r < e.length; r += 2) {
		let i = t.map(e[r], 1), a = t.map(e[r + 1], -1);
		i <= a && n.push(i, a);
	}
	return n;
}
function tv(e, t, n) {
	let r = iv(t), i = av.get(t).spec.config, a = (n ? e.undone : e.done).popEvent(t, r);
	if (!a) return null;
	let o = a.selection.resolve(a.transform.doc), s = (n ? e.done : e.undone).addTransform(a.transform, t.selection.getBookmark(), i, r), c = new Y_(n ? s : a.remaining, n ? a.remaining : s, null, 0, -1);
	return a.transform.setSelection(o).setMeta(av, {
		redo: n,
		historyState: c
	});
}
var nv = !1, rv = null;
function iv(e) {
	let t = e.plugins;
	if (rv != t) {
		nv = !1, rv = t;
		for (let e = 0; e < t.length; e++) if (t[e].spec.historyPreserveItems) {
			nv = !0;
			break;
		}
	}
	return nv;
}
var av = new Gc("history"), ov = new Gc("closeHistory");
function sv(e = {}) {
	return e = {
		depth: e.depth || 100,
		newGroupDelay: e.newGroupDelay || 500
	}, new Hc({
		key: av,
		state: {
			init() {
				return new Y_(K_.empty, K_.empty, null, 0, -1);
			},
			apply(t, n, r) {
				return Z_(n, r, t, e);
			}
		},
		config: e,
		props: { handleDOMEvents: { beforeinput(e, t) {
			let n = t.inputType, r = n == "historyUndo" ? lv : n == "historyRedo" ? uv : null;
			return !r || !e.editable ? !1 : (t.preventDefault(), r(e.state, e.dispatch));
		} } }
	});
}
function cv(e, t) {
	return (n, r) => {
		let i = av.getState(n);
		if (!i || (e ? i.undone : i.done).eventCount == 0) return !1;
		if (r) {
			let a = tv(i, n, e);
			a && r(t ? a.scrollIntoView() : a);
		}
		return !0;
	};
}
var lv = cv(!1, !0), uv = cv(!0, !0), dv = nh.create({
	name: "history",
	addOptions() {
		return {
			depth: 100,
			newGroupDelay: 500
		};
	},
	addCommands() {
		return {
			undo: () => ({ state: e, dispatch: t }) => lv(e, t),
			redo: () => ({ state: e, dispatch: t }) => uv(e, t)
		};
	},
	addProseMirrorPlugins() {
		return [sv(this.options)];
	},
	addKeyboardShortcuts() {
		return {
			"Mod-z": () => this.editor.commands.undo(),
			"Shift-Mod-z": () => this.editor.commands.redo(),
			"Mod-y": () => this.editor.commands.redo(),
			"Mod-я": () => this.editor.commands.undo(),
			"Shift-Mod-я": () => this.editor.commands.redo()
		};
	}
}), fv = r_.create({
	name: "horizontalRule",
	addOptions() {
		return { HTMLAttributes: {} };
	},
	group: "block",
	parseHTML() {
		return [{ tag: "hr" }];
	},
	renderHTML({ HTMLAttributes: e }) {
		return ["hr", Em(this.options.HTMLAttributes, e)];
	},
	addCommands() {
		return { setHorizontalRule: () => ({ chain: e, state: t }) => {
			if (!a_(t, t.schema.nodes[this.name])) return !1;
			let { selection: n } = t, { $from: r, $to: i } = n, a = e();
			return r.parentOffset === 0 ? a.insertContentAt({
				from: Math.max(r.pos - 1, 0),
				to: i.pos
			}, { type: this.name }) : Dg(n) ? a.insertContentAt(i.pos, { type: this.name }) : a.insertContent({ type: this.name }), a.command(({ tr: e, dispatch: t }) => {
				if (t) {
					let { $to: t } = e.selection, n = t.end();
					if (t.nodeAfter) t.nodeAfter.isTextblock ? e.setSelection(X.create(e.doc, t.pos + 1)) : t.nodeAfter.isBlock ? e.setSelection(Z.create(e.doc, t.pos)) : e.setSelection(X.create(e.doc, t.pos));
					else {
						let r = t.parent.type.contentMatch.defaultType?.create();
						r && (e.insert(n, r), e.setSelection(X.create(e.doc, n + 1)));
					}
					e.scrollIntoView();
				}
				return !0;
			}).run();
		} };
	},
	addInputRules() {
		return [e_({
			find: /^(?:---|—-|___\s|\*\*\*\s)$/,
			type: this.type
		})];
	}
}), pv = /(?:^|\s)(\*(?!\s+\*)((?:[^*]+))\*(?!\s+\*))$/, mv = /(?:^|\s)(\*(?!\s+\*)((?:[^*]+))\*(?!\s+\*))/g, hv = /(?:^|\s)(_(?!\s+_)((?:[^_]+))_(?!\s+_))$/, gv = /(?:^|\s)(_(?!\s+_)((?:[^_]+))_(?!\s+_))/g, _v = Km.create({
	name: "italic",
	addOptions() {
		return { HTMLAttributes: {} };
	},
	parseHTML() {
		return [
			{ tag: "em" },
			{
				tag: "i",
				getAttrs: (e) => e.style.fontStyle !== "normal" && null
			},
			{
				style: "font-style=normal",
				clearMark: (e) => e.type.name === this.name
			},
			{ style: "font-style=italic" }
		];
	},
	renderHTML({ HTMLAttributes: e }) {
		return [
			"em",
			Em(this.options.HTMLAttributes, e),
			0
		];
	},
	addCommands() {
		return {
			setItalic: () => ({ commands: e }) => e.setMark(this.name),
			toggleItalic: () => ({ commands: e }) => e.toggleMark(this.name),
			unsetItalic: () => ({ commands: e }) => e.unsetMark(this.name)
		};
	},
	addKeyboardShortcuts() {
		return {
			"Mod-i": () => this.editor.commands.toggleItalic(),
			"Mod-I": () => this.editor.commands.toggleItalic()
		};
	},
	addInputRules() {
		return [$g({
			find: pv,
			type: this.type
		}), $g({
			find: hv,
			type: this.type
		})];
	},
	addPasteRules() {
		return [i_({
			find: mv,
			type: this.type
		}), i_({
			find: gv,
			type: this.type
		})];
	}
}), vv = r_.create({
	name: "listItem",
	addOptions() {
		return {
			HTMLAttributes: {},
			bulletListTypeName: "bulletList",
			orderedListTypeName: "orderedList"
		};
	},
	content: "paragraph block*",
	defining: !0,
	parseHTML() {
		return [{ tag: "li" }];
	},
	renderHTML({ HTMLAttributes: e }) {
		return [
			"li",
			Em(this.options.HTMLAttributes, e),
			0
		];
	},
	addKeyboardShortcuts() {
		return {
			Enter: () => this.editor.commands.splitListItem(this.name),
			Tab: () => this.editor.commands.sinkListItem(this.name),
			"Shift-Tab": () => this.editor.commands.liftListItem(this.name)
		};
	}
}), yv = "listItem", bv = "textStyle", xv = /^(\d+)\.\s$/, Sv = r_.create({
	name: "orderedList",
	addOptions() {
		return {
			itemTypeName: "listItem",
			HTMLAttributes: {},
			keepMarks: !1,
			keepAttributes: !1
		};
	},
	group: "block list",
	content() {
		return `${this.options.itemTypeName}+`;
	},
	addAttributes() {
		return {
			start: {
				default: 1,
				parseHTML: (e) => e.hasAttribute("start") ? parseInt(e.getAttribute("start") || "", 10) : 1
			},
			type: {
				default: null,
				parseHTML: (e) => e.getAttribute("type")
			}
		};
	},
	parseHTML() {
		return [{ tag: "ol" }];
	},
	renderHTML({ HTMLAttributes: e }) {
		let { start: t, ...n } = e;
		return t === 1 ? [
			"ol",
			Em(this.options.HTMLAttributes, n),
			0
		] : [
			"ol",
			Em(this.options.HTMLAttributes, e),
			0
		];
	},
	addCommands() {
		return { toggleOrderedList: () => ({ commands: e, chain: t }) => this.options.keepAttributes ? t().toggleList(this.name, this.options.itemTypeName, this.options.keepMarks).updateAttributes(yv, this.editor.getAttributes(bv)).run() : e.toggleList(this.name, this.options.itemTypeName, this.options.keepMarks) };
	},
	addKeyboardShortcuts() {
		return { "Mod-Shift-7": () => this.editor.commands.toggleOrderedList() };
	},
	addInputRules() {
		let e = n_({
			find: xv,
			type: this.type,
			getAttributes: (e) => ({ start: +e[1] }),
			joinPredicate: (e, t) => t.childCount + t.attrs.start === +e[1]
		});
		return (this.options.keepMarks || this.options.keepAttributes) && (e = n_({
			find: xv,
			type: this.type,
			keepMarks: this.options.keepMarks,
			keepAttributes: this.options.keepAttributes,
			getAttributes: (e) => ({
				start: +e[1],
				...this.editor.getAttributes(bv)
			}),
			joinPredicate: (e, t) => t.childCount + t.attrs.start === +e[1],
			editor: this.editor
		})), [e];
	}
}), Cv = r_.create({
	name: "paragraph",
	priority: 1e3,
	addOptions() {
		return { HTMLAttributes: {} };
	},
	group: "block",
	content: "inline*",
	parseHTML() {
		return [{ tag: "p" }];
	},
	renderHTML({ HTMLAttributes: e }) {
		return [
			"p",
			Em(this.options.HTMLAttributes, e),
			0
		];
	},
	addCommands() {
		return { setParagraph: () => ({ commands: e }) => e.setNode(this.name) };
	},
	addKeyboardShortcuts() {
		return { "Mod-Alt-0": () => this.editor.commands.setParagraph() };
	}
}), wv = /(?:^|\s)(~~(?!\s+~~)((?:[^~]+))~~(?!\s+~~))$/, Tv = /(?:^|\s)(~~(?!\s+~~)((?:[^~]+))~~(?!\s+~~))/g, Ev = Km.create({
	name: "strike",
	addOptions() {
		return { HTMLAttributes: {} };
	},
	parseHTML() {
		return [
			{ tag: "s" },
			{ tag: "del" },
			{ tag: "strike" },
			{
				style: "text-decoration",
				consuming: !1,
				getAttrs: (e) => e.includes("line-through") ? {} : !1
			}
		];
	},
	renderHTML({ HTMLAttributes: e }) {
		return [
			"s",
			Em(this.options.HTMLAttributes, e),
			0
		];
	},
	addCommands() {
		return {
			setStrike: () => ({ commands: e }) => e.setMark(this.name),
			toggleStrike: () => ({ commands: e }) => e.toggleMark(this.name),
			unsetStrike: () => ({ commands: e }) => e.unsetMark(this.name)
		};
	},
	addKeyboardShortcuts() {
		return { "Mod-Shift-s": () => this.editor.commands.toggleStrike() };
	},
	addInputRules() {
		return [$g({
			find: wv,
			type: this.type
		})];
	},
	addPasteRules() {
		return [i_({
			find: Tv,
			type: this.type
		})];
	}
}), Dv = r_.create({
	name: "text",
	group: "inline"
}), Ov = nh.create({
	name: "starterKit",
	addExtensions() {
		let e = [];
		return this.options.bold !== !1 && e.push(f_.configure(this.options.bold)), this.options.blockquote !== !1 && e.push(s_.configure(this.options.blockquote)), this.options.bulletList !== !1 && e.push(g_.configure(this.options.bulletList)), this.options.code !== !1 && e.push(y_.configure(this.options.code)), this.options.codeBlock !== !1 && e.push(S_.configure(this.options.codeBlock)), this.options.document !== !1 && e.push(C_.configure(this.options.document)), this.options.dropcursor !== !1 && e.push(E_.configure(this.options.dropcursor)), this.options.gapcursor !== !1 && e.push(R_.configure(this.options.gapcursor)), this.options.hardBreak !== !1 && e.push(z_.configure(this.options.hardBreak)), this.options.heading !== !1 && e.push(B_.configure(this.options.heading)), this.options.history !== !1 && e.push(dv.configure(this.options.history)), this.options.horizontalRule !== !1 && e.push(fv.configure(this.options.horizontalRule)), this.options.italic !== !1 && e.push(_v.configure(this.options.italic)), this.options.listItem !== !1 && e.push(vv.configure(this.options.listItem)), this.options.orderedList !== !1 && e.push(Sv.configure(this.options.orderedList)), this.options.paragraph !== !1 && e.push(Cv.configure(this.options.paragraph)), this.options.strike !== !1 && e.push(Ev.configure(this.options.strike)), this.options.text !== !1 && e.push(Dv.configure(this.options.text)), e;
	}
}), kv = Km.create({
	name: "underline",
	addOptions() {
		return { HTMLAttributes: {} };
	},
	parseHTML() {
		return [{ tag: "u" }, {
			style: "text-decoration",
			consuming: !1,
			getAttrs: (e) => e.includes("underline") ? {} : !1
		}];
	},
	renderHTML({ HTMLAttributes: e }) {
		return [
			"u",
			Em(this.options.HTMLAttributes, e),
			0
		];
	},
	addCommands() {
		return {
			setUnderline: () => ({ commands: e }) => e.setMark(this.name),
			toggleUnderline: () => ({ commands: e }) => e.toggleMark(this.name),
			unsetUnderline: () => ({ commands: e }) => e.unsetMark(this.name)
		};
	},
	addKeyboardShortcuts() {
		return {
			"Mod-u": () => this.editor.commands.toggleUnderline(),
			"Mod-U": () => this.editor.commands.toggleUnderline()
		};
	}
}), Av = /(?:^|\s)(!\[(.+|:?)]\((\S+)(?:(?:\s+)["'](\S+)["'])?\))$/, jv = r_.create({
	name: "image",
	addOptions() {
		return {
			inline: !1,
			allowBase64: !1,
			HTMLAttributes: {}
		};
	},
	inline() {
		return this.options.inline;
	},
	group() {
		return this.options.inline ? "inline" : "block";
	},
	draggable: !0,
	addAttributes() {
		return {
			src: { default: null },
			alt: { default: null },
			title: { default: null }
		};
	},
	parseHTML() {
		return [{ tag: this.options.allowBase64 ? "img[src]" : "img[src]:not([src^=\"data:\"])" }];
	},
	renderHTML({ HTMLAttributes: e }) {
		return ["img", Em(this.options.HTMLAttributes, e)];
	},
	addCommands() {
		return { setImage: (e) => ({ commands: t }) => t.insertContent({
			type: this.name,
			attrs: e
		}) };
	},
	addInputRules() {
		return [e_({
			find: Av,
			type: this.type,
			getAttributes: (e) => {
				let [, , t, n, r] = e;
				return {
					src: n,
					alt: t,
					title: r
				};
			}
		})];
	}
}).extend({
	draggable: !0,
	inline: !1,
	group: "block",
	addAttributes() {
		return {
			...this.parent?.(),
			width: {
				default: "400px",
				parseHTML: (e) => e.style.width || e.getAttribute("width") || "400px",
				renderHTML: (e) => ({
					width: e.width,
					style: `width: ${e.width}; height: auto; cursor: pointer;`
				})
			},
			fabricData: {
				default: null,
				parseHTML: (e) => e.getAttribute("data-fabric"),
				renderHTML: (e) => e.fabricData ? { "data-fabric": e.fabricData } : {}
			}
		};
	},
	addNodeView() {
		return ({ node: e, getPos: t, editor: n }) => {
			let r = document.createElement("div");
			r.className = "resizable-image-container", r.contentEditable = "false", r.style.display = "block", r.draggable = !0, r.setAttribute("data-drag-handle", "");
			let i = document.createElement("img");
			i.src = e.attrs.src, i.style.width = e.attrs.width;
			let a = document.createElement("div");
			a.className = "resize-handle", r.appendChild(i), r.appendChild(a), i.ondblclick = () => {
				if (e.attrs.fabricData && window.app && window.app.editor) {
					window.app.editor.switchTab("shapes");
					let t = window.app.editor.fabricCanvas;
					if (t) try {
						let n = decodeURIComponent(atob(e.attrs.fabricData));
						t.loadFromJSON(n, () => {
							t.renderAll();
						});
					} catch (e) {
						console.error("Failed to parse fabricData", e);
					}
				}
			};
			let o = !1, s, c;
			return a.onmousedown = (a) => {
				a.preventDefault(), a.stopPropagation(), o = !0, s = a.clientX, c = i.offsetWidth, r.classList.add("resizing");
				let l = (e) => {
					if (!o) return;
					let t = Math.max(50, c + (e.clientX - s));
					i.style.width = `${t}px`;
				}, u = () => {
					o = !1, r.classList.remove("resizing"), document.removeEventListener("mousemove", l), document.removeEventListener("mouseup", u), typeof t == "function" && n.view.dispatch(n.view.state.tr.setNodeMarkup(t(), null, {
						...e.attrs,
						width: i.style.width
					}));
				};
				document.addEventListener("mousemove", l), document.addEventListener("mouseup", u);
			}, {
				dom: r,
				update: (t) => t.type.name === e.type.name ? (t.attrs.src !== e.attrs.src && (i.src = t.attrs.src), t.attrs.width !== e.attrs.width && (i.style.width = t.attrs.width), !0) : !1,
				ignoreMutation: () => !0,
				stopEvent: (e) => a.contains(e.target)
			};
		};
	}
}), Mv = r_.create({
	name: "mathNode",
	group: "inline",
	inline: !0,
	atom: !0,
	addAttributes() {
		return { latex: { default: "" } };
	},
	parseHTML() {
		return [{ tag: "span[data-type=\"mathNode\"]" }];
	},
	renderHTML({ HTMLAttributes: e }) {
		return ["span", Em(e, { "data-type": "mathNode" })];
	},
	addNodeView() {
		return ({ node: e, getPos: t, editor: n }) => {
			let r = document.createElement("span");
			r.classList.add("math-node"), r.setAttribute("data-type", "mathNode");
			try {
				let t = (e.attrs.latex || "").replace(/\\softmax\b/g, "\\operatorname{softmax}");
				Fa.render(t, r, {
					throwOnError: !1,
					displayMode: !1
				});
			} catch {
				r.textContent = e.attrs.latex, r.style.color = "red";
			}
			return r.ondblclick = async (r) => {
				r.stopPropagation();
				let i = await o({
					title: "✍ Редактор формулы (LaTeX)",
					value: e.attrs.latex,
					okLabel: "Сохранить",
					cancelLabel: "Отмена"
				});
				i !== null && typeof t == "function" && n.view.dispatch(n.view.state.tr.setNodeMarkup(t(), null, {
					...e.attrs,
					latex: i
				}));
			}, { dom: r };
		};
	}
}), Nv = {
	async init() {
		if (window.functionPlotLoaded) return;
		let e = (e) => new Promise((t, n) => {
			if (document.querySelector(`script[src="${e}"]`)) return t();
			let r = document.createElement("script");
			r.src = e, r.async = !0, r.onload = t, r.onerror = () => n(/* @__PURE__ */ Error(`Failed to load script: ${e}`)), document.head.appendChild(r);
		});
		try {
			window.app?.logDebug && window.app.logDebug("Loading dependencies (D3 + FunctionPlot)..."), await e("/static/js/vendor/d3.min.js"), await e("/static/js/vendor/function-plot.js"), this.isLoaded = !0, window.app?.logDebug && window.app.logDebug("Graph libraries initialized.");
		} catch (e) {
			console.error("GraphTool init error:", e), window.app?.logDebug && window.app.logDebug(`Load error: ${e.message}`);
		}
	},
	plot(e, t) {
		let n = t.trim() || "x^2";
		if (e.innerHTML = "", window.app && window.app.logDebug && (window.app.logDebug(`Plotting: ${n}`), window.app.logDebug(`functionPlot type: ${typeof window.functionPlot}`), window.app.logDebug(`d3 version: ${window.d3 ? window.d3.version : "MISSING"}`)), !this.isLoaded) {
			e.innerHTML = "<div style=\"color:red; padding:20px;\">Error: Graph library is not loaded.</div>";
			return;
		}
		if (!window.d3) {
			e.innerHTML = "<div style=\"color:red; padding:20px;\">Error: D3 library not found.</div>";
			return;
		}
		let r = {
			target: e,
			width: e.clientWidth > 100 ? e.clientWidth - 20 : 450,
			height: 300,
			grid: !0,
			data: [{
				fn: n,
				range: [-10, 10],
				color: "#3b82f6"
			}]
		};
		try {
			window.functionPlot(r), window.app && window.app.logDebug && window.app.logDebug("Success calling functionPlot");
		} catch (t) {
			window.app && window.app.logDebug && window.app.logDebug(`Error in functionPlot: ${t.message}`);
			try {
				if (t.message.includes("new") || t.message.includes("constructor")) {
					let e = new window.functionPlot(r);
					e && typeof e.build == "function" && e.build();
				} else throw t;
			} catch (t) {
				console.error("Plot error:", t), e.innerHTML = `<div style="color:red; padding:20px;">Render error: ${t.message}</div>`;
			}
		}
	},
	async exportToPNG(e, t, n) {
		try {
			e.getAttribute("xmlns") || e.setAttribute("xmlns", "http://www.w3.org/2000/svg");
			let r = new XMLSerializer().serializeToString(e), i = document.createElement("canvas"), a = i.getContext("2d"), o = new window.Image(), s = e.getBoundingClientRect(), c = s.width || 400, l = s.height || 300;
			i.width = c * 2, i.height = l * 2;
			let u = new Blob([r], { type: "image/svg+xml;charset=utf-8" }), d = URL.createObjectURL(u);
			o.onload = () => {
				a.fillStyle = "white", a.fillRect(0, 0, i.width, i.height), a.drawImage(o, 0, 0, i.width, i.height);
				let e = i.toDataURL("image/png");
				t.chain().focus().insertContent({
					type: "image",
					attrs: {
						src: e,
						alt: "Function Graph",
						width: "400px"
					}
				}).createParagraphNear().focus("end").run(), URL.revokeObjectURL(d), n && n();
			}, o.src = d;
		} catch (e) {
			console.error("Graph export error:", e);
		}
	}
}, Pv = {
	async init(t, n) {
		try {
			let r = await import("./fabric-B26mpxRe.js").then((t) => /* @__PURE__ */ e(t.default, 1)), i = r.fabric || r, a = document.getElementById(n), o = a.clientWidth - 20, s = new i.Canvas(t, {
				width: o,
				height: 350,
				backgroundColor: "#ffffff",
				isDrawingMode: !1
			}), c = (e) => {
				let t = document.getElementById("shapeDimBadge");
				if (t || (t = document.createElement("div"), t.id = "shapeDimBadge", t.style.position = "absolute", t.style.bottom = "10px", t.style.left = "10px", t.style.background = "rgba(0,0,0,0.7)", t.style.color = "#fff", t.style.padding = "4px 8px", t.style.borderRadius = "4px", t.style.fontSize = "12px", t.style.pointerEvents = "none", t.style.zIndex = "10", a.appendChild(t)), !e) {
					t.style.display = "none";
					return;
				}
				let n = "";
				if (e.type === "line") {
					let t = Math.round(e.width * e.scaleX), r = Math.round(e.height * e.scaleY), i = Math.round(Math.sqrt(t * t + r * r)), a = Math.round(e.angle % 360);
					a < 0 && (a += 360), n = `Length: ${i} | Angle: ${a}°`;
				} else if (e.type === "circle") n = `R: ${Math.round(e.radius * e.scaleX)}`;
				else if (e.type !== "i-text" && e.type !== "text") {
					let t = Math.round(e.width * e.scaleX), r = Math.round(e.height * e.scaleY), i = Math.round(e.angle % 360);
					i < 0 && (i += 360), n = `W: ${t} H: ${r} | Angle: ${i}°`;
				}
				n ? (t.innerText = n, t.style.display = "block") : t.style.display = "none";
			};
			return s.on("object:scaling", (e) => c(e.target)), s.on("object:rotating", (e) => c(e.target)), s.on("object:moving", (e) => c(e.target)), s.on("selection:created", () => c(s.getActiveObject())), s.on("selection:updated", () => c(s.getActiveObject())), s.on("selection:cleared", () => {
				let e = document.getElementById("shapeDimBadge");
				e && (e.style.display = "none");
			}), s;
		} catch (e) {
			return console.error("Fabric init error:", e), null;
		}
	},
	setTool(e, t, n) {
		e && (t === "draw" ? (e.isDrawingMode = !0, e.freeDrawingBrush.width = 3, e.freeDrawingBrush.color = n) : e.isDrawingMode = !1);
	},
	async toggleGrid(t) {
		if (!t) return;
		let n = await import("./fabric-B26mpxRe.js").then((t) => /* @__PURE__ */ e(t.default, 1)), r = n.fabric || n;
		if (t._hasGrid) t.setBackgroundColor("#ffffff", t.renderAll.bind(t)), t._hasGrid = !1;
		else {
			t._hasGrid = !0;
			let e = document.createElement("canvas");
			e.width = 20, e.height = 20;
			let n = e.getContext("2d");
			n.strokeStyle = "#e2e8f0", n.lineWidth = 1, n.beginPath(), n.moveTo(20, 0), n.lineTo(20, 20), n.lineTo(0, 20), n.stroke();
			let i = new r.Pattern({
				source: e,
				repeat: "repeat"
			});
			t.setBackgroundColor(i, t.renderAll.bind(t));
		}
	},
	async copySelectedShape(e) {
		if (!e) return;
		let t = e.getActiveObject();
		t && t.clone(function(t) {
			e.discardActiveObject(), t.set({
				left: t.left + 20,
				top: t.top + 20,
				evented: !0
			}), t.type === "activeSelection" ? (t.canvas = e, t.forEachObject(function(t) {
				t.set({
					evented: !0,
					selectable: !0
				}), e.add(t);
			}), t.setCoords()) : (t.set({
				evented: !0,
				selectable: !0
			}), e.add(t)), e.setActiveObject(t), e.renderAll();
		});
	},
	_paramDefs: {
		"right-triangle": {
			title: "Right Triangle",
			fields: [{
				key: "a",
				label: "Leg a (vertical)",
				default: 100,
				min: 10,
				max: 500
			}, {
				key: "b",
				label: "Leg b (horizontal)",
				default: 100,
				min: 10,
				max: 500
			}]
		},
		triangle: {
			title: "Isosceles Triangle",
			fields: [{
				key: "base",
				label: "Base",
				default: 120,
				min: 10,
				max: 500
			}, {
				key: "height",
				label: "Height",
				default: 100,
				min: 10,
				max: 500
			}]
		},
		rect: {
			title: "Rectangle",
			fields: [{
				key: "width",
				label: "Width",
				default: 120,
				min: 10,
				max: 500
			}, {
				key: "height",
				label: "Height",
				default: 80,
				min: 10,
				max: 500
			}]
		},
		circle: {
			title: "Circle",
			fields: [{
				key: "radius",
				label: "Radius",
				default: 50,
				min: 5,
				max: 250
			}]
		},
		line: {
			title: "Line Segment",
			fields: [{
				key: "length",
				label: "Length",
				default: 100,
				min: 5,
				max: 500
			}, {
				key: "angle",
				label: "Angle (°) — 0 = horizontal",
				default: 0,
				min: -360,
				max: 360
			}]
		},
		diamond: {
			title: "Rhombus",
			fields: [{
				key: "side",
				label: "Side",
				default: 80,
				min: 10,
				max: 400
			}]
		},
		arrow: {
			title: "Arrow",
			fields: [{
				key: "length",
				label: "Length",
				default: 100,
				min: 20,
				max: 500
			}]
		}
	},
	async add(t, n, r) {
		if (t) {
			if (n === "text") {
				let n = await import("./fabric-B26mpxRe.js").then((t) => /* @__PURE__ */ e(t.default, 1)), r = new (n.fabric || n).IText("Text", {
					left: 100,
					top: 100,
					fontSize: 24,
					fill: "#1f2937",
					fontWeight: "bold",
					fontFamily: "serif",
					fontStyle: "italic",
					originX: "center",
					originY: "center"
				});
				t.add(r), t.setActiveObject(r), t.renderAll();
				return;
			}
			this._showParamDialog(t, n, r);
		}
	},
	_showParamDialog(e, t, n) {
		let r = this._paramDefs[t];
		if (!r) return;
		let i = document.getElementById("shapeParamDialog");
		i && i.remove(), i = document.createElement("div"), i.id = "shapeParamDialog", i.style.position = "absolute", i.style.top = "0", i.style.left = "0", i.style.width = "100%", i.style.height = "100%", i.style.backgroundColor = "rgba(0,0,0,0.3)", i.style.display = "none", i.style.justifyContent = "center", i.style.alignItems = "center", i.style.zIndex = "9999", i.innerHTML = "\n            <div style=\"background:white; padding:20px; border-radius:12px; width:300px; box-shadow:0 10px 25px rgba(0,0,0,0.2); font-family:sans-serif;\">\n                <h3 id=\"shapeParamTitle\" style=\"margin-top:0; margin-bottom:15px; font-size:16px; color:#1e293b;\"></h3>\n                <div id=\"shapeParamFields\"></div>\n                <div style=\"margin-top:15px; display:flex; align-items:center; gap:8px;\">\n                    <input type=\"checkbox\" id=\"shapeParamFill\" style=\"width:16px; height:16px; cursor:pointer;\">\n                    <label for=\"shapeParamFill\" style=\"font-size:14px; color:#475569; cursor:pointer; user-select:none;\">With fill</label>\n                </div>\n                <div style=\"display:flex; justify-content:flex-end; gap:10px; margin-top:20px;\">\n                    <button id=\"shapeParamCancel\" style=\"padding:8px 12px; border:none; background:#f1f5f9; color:#475569; border-radius:6px; cursor:pointer;\">Cancel</button>\n                    <button id=\"shapeParamBuild\" style=\"padding:8px 12px; border:none; background:#3b82f6; color:white; border-radius:6px; cursor:pointer;\">Create</button>\n                </div>\n            </div>\n        ", e && e.wrapperEl ? e.wrapperEl.appendChild(i) : document.body.appendChild(i);
		let a = document.getElementById("shapeParamTitle"), o = document.getElementById("shapeParamFields");
		if (!a || !o) return;
		a.textContent = r.title, o.innerHTML = r.fields.map((e) => `
            <div style="margin-bottom:10px;">
                <label style="display:block; font-size:12px; color:#64748b; margin-bottom:4px;">${e.label}</label>
                <input type="number" id="sp_${e.key}" value="${e.default}" style="width:100%; padding:6px; border:1px solid #cbd5e1; border-radius:4px; font-size:14px; box-sizing:border-box;">
            </div>
        `).join(""), i.style.display = "flex", i._ctx = {
			canvas: e,
			type: t,
			color: n,
			def: r,
			tool: this
		};
		let s = document.getElementById("shapeParamFill");
		s && (t === "line" || t === "arrow" ? s.parentElement.style.display = "none" : (s.parentElement.style.display = "flex", s.checked = !1));
		let c = document.getElementById("shapeParamCancel"), l = document.getElementById("shapeParamBuild"), u = c.cloneNode(!0), d = l.cloneNode(!0);
		c.parentNode.replaceChild(u, c), l.parentNode.replaceChild(d, l), u.addEventListener("click", () => {
			i.style.display = "none";
		}), d.addEventListener("click", () => {
			let { canvas: e, type: t, color: n, def: r, tool: a } = i._ctx, o = {};
			r.fields.forEach((e) => {
				let t = document.getElementById("sp_" + e.key);
				o[e.key] = t && parseFloat(t.value) || e.default;
			});
			let c = s ? s.checked : !1;
			i.style.display = "none", a.buildParametric(e, t, n, o, c);
		}), o.addEventListener("keydown", (e) => {
			e.key === "Enter" && d.click();
		}), setTimeout(() => {
			let e = o.querySelector("input");
			e && e.select();
		}, 50);
	},
	async buildParametric(t, n, r, i, a) {
		if (!t) return;
		let o = await import("./fabric-B26mpxRe.js").then((t) => /* @__PURE__ */ e(t.default, 1)), s = o.fabric || o, c = (e, t, n, i) => (Math.abs(e - n) < .001 && (n += .01), Math.abs(t - i) < .001 && (i += .01), new s.Line([
			e,
			t,
			n,
			i
		], {
			stroke: r,
			strokeWidth: 2.5,
			strokeUniform: !0,
			strokeLineCap: "round",
			strokeLineJoin: "round",
			selectable: !0,
			perPixelTargetFind: !0,
			targetFindTolerance: 12,
			snapAngle: 15,
			snapThreshold: 7
		})), l = [], u = {
			fill: a ? r + "33" : "transparent",
			stroke: r,
			strokeWidth: 2.5,
			strokeUniform: !0,
			strokeLineJoin: "round",
			selectable: !0,
			perPixelTargetFind: !0
		};
		if (n === "right-triangle") {
			let { a: e, b: t } = i;
			l.push(new s.Polygon([
				{
					x: 0,
					y: 0
				},
				{
					x: 0,
					y: e
				},
				{
					x: t,
					y: e
				}
			], {
				left: 100,
				top: 100,
				...u
			}));
		} else if (n === "triangle") {
			let { base: e, height: t } = i;
			l.push(new s.Triangle({
				left: 100,
				top: 100,
				width: e,
				height: t,
				...u
			}));
		} else if (n === "rect") {
			let { width: e, height: t } = i;
			l.push(new s.Rect({
				left: 100,
				top: 100,
				width: e,
				height: t,
				...u
			}));
		} else if (n === "circle") {
			let e = i.radius;
			l.push(new s.Circle({
				left: 100,
				top: 100,
				radius: e,
				...u
			}));
		} else if (n === "line") {
			let { length: e, angle: t } = i, n = t * Math.PI / 180, r = 100 + e * Math.cos(n), a = 100 + e * Math.sin(n);
			l.push(c(100, 100, r, a));
		} else if (n === "diamond") {
			let e = i.side, t = e * Math.cos(Math.PI / 6), n = e * Math.sin(Math.PI / 6);
			l.push(new s.Polygon([
				{
					x: t,
					y: 0
				},
				{
					x: t * 2,
					y: n
				},
				{
					x: t,
					y: n * 2
				},
				{
					x: 0,
					y: n
				}
			], {
				left: 100,
				top: 100,
				...u
			}));
		} else if (n === "arrow") {
			let e = 100 + i.length;
			l.push(c(100, 100, e, 100)), l.push(new s.Triangle({
				left: e,
				top: 94,
				width: 12,
				height: 12,
				fill: r,
				angle: 90,
				selectable: !0
			}));
		}
		l.forEach((e) => t.add(e)), l.length > 1 ? t.setActiveObject(new s.ActiveSelection(l, { canvas: t })) : l.length === 1 && t.setActiveObject(l[0]), t.renderAll();
	},
	exportToPNG(e, t, n) {
		if (!e || !t) return;
		e.discardActiveObject(), e.renderAll();
		let r = e.getObjects();
		if (r.length === 0) {
			n && n();
			return;
		}
		let i = Infinity, a = Infinity, o = -Infinity, s = -Infinity;
		r.forEach((e) => {
			let t = e.getBoundingRect();
			i = Math.min(i, t.left), a = Math.min(a, t.top), o = Math.max(o, t.left + t.width), s = Math.max(s, t.top + t.height);
		}), i = Math.max(0, i - 15), a = Math.max(0, a - 15);
		let c = o - i + 30, l = s - a + 30, u = e.toDataURL({
			format: "png",
			multiplier: 2,
			left: i,
			top: a,
			width: c,
			height: l
		}), d = JSON.stringify(e.toJSON()), f = btoa(encodeURIComponent(d));
		t.chain().focus().insertContent({
			type: "image",
			attrs: {
				src: u,
				alt: "Drawing",
				title: "Canvas Drawing",
				width: Math.round(c) + "px",
				fabricData: f
			}
		}).createParagraphNear().focus("end").run(), n && n();
	}
}, Fv = class {
	constructor(e) {
		this.engine = e, this.tiptap = null, this.fabricCanvas = null;
	}
	async init() {
		if (this.tiptap) return;
		let e = document.getElementById("tiptap-editor");
		if (e) {
			e.addEventListener("mousedown", (e) => e.stopPropagation()), e.addEventListener("contextmenu", (e) => {
				let t = window.getSelection();
				if (!(t && !t.isCollapsed && t.toString().trim() !== "")) {
					e.preventDefault(), this.engine.logDebug(`[EditorManager] Right-click detected at ${e.clientX}, ${e.clientY}`);
					try {
						this.showMathMenu(e.clientX, e.clientY), this.engine.logDebug("[EditorManager] Menu rendered successfully");
					} catch (e) {
						this.engine.logDebug(`[EditorManager] Error showing menu: ${e.message}`), console.error(e);
					}
				}
			}, !0);
			try {
				this.engine.logDebug("[EditorManager] Initializing TipTap..."), this.tiptap = new Qg({
					element: e,
					extensions: [
						Ov,
						kv,
						jv.configure({ allowBase64: !0 }),
						Mv
					],
					content: "<p></p>",
					autofocus: "end",
					onFocus: () => {
						e.classList.add("focused"), this.updateFormattingToolbarStates();
					},
					onBlur: () => {
						e.classList.remove("focused"), setTimeout(() => {
							this.updateFormattingToolbarStates();
						}, 200);
					},
					editorProps: { handleDOMEvents: { mousedown: (e, t) => (t.stopPropagation(), !1) } },
					onSelectionUpdate: ({ editor: e }) => {
						this.updateFormattingToolbarStates();
					},
					onUpdate: ({ editor: e }) => {
						try {
							let t = JSON.parse(localStorage.getItem("papanda_editor_open_state") || "{}");
							t.content = e.getHTML(), localStorage.setItem("papanda_editor_open_state", JSON.stringify(t));
						} catch {}
						this.updateFormattingToolbarStates();
					}
				});
				let t = document.getElementById("editorFormattingToolbar");
				t && t.querySelectorAll(".format-btn").forEach((e) => {
					e.onclick = (t) => {
						t.preventDefault(), t.stopPropagation();
						let n = e.dataset.format;
						if (!n) return;
						let r = this.tiptap.chain().focus();
						n === "bold" ? r.toggleBold().run() : n === "italic" ? r.toggleItalic().run() : n === "underline" ? r.toggleUnderline().run() : n === "strike" ? r.toggleStrike().run() : n === "code" ? r.toggleCode().run() : n === "clear" && r.unsetAllMarks().clearNodes().run(), this.updateFormattingToolbarStates();
					};
				}), this.engine.logDebug("[EditorManager] TipTap initialized successfully.");
			} catch (e) {
				this.engine.logDebug(`[EditorManager] TipTap init error: ${e.message}`), console.error("TipTap init error:", e);
			}
		}
	}
	updateFormattingToolbarStates() {
		let e = document.getElementById("editorFormattingToolbar");
		if (!e || !this.tiptap) return;
		let t = document.querySelector(".editor-tab.active")?.dataset.tab, { from: n, to: r } = this.tiptap.state.selection;
		n !== r && t === "text" ? (e.style.display = "inline-flex", e.querySelectorAll(".format-btn").forEach((e) => {
			let t = e.dataset.format, n = this.tiptap.isActive(t);
			e.classList.toggle("active", n);
		})) : e.style.display = "none";
	}
	async switchTab(e) {
		if (this.engine.logDebug(`[EditorManager] Switching tab to: ${e}`), document.querySelectorAll(".editor-tab").forEach((t) => t.classList.toggle("active", t.dataset.tab === e)), document.querySelectorAll(".tab-content").forEach((t) => {
			let n = t.id === `editor-${e}`;
			t.classList.toggle("active", n), t.style.display = n ? "flex" : "none";
		}), this.updateFormattingToolbarStates(), e === "text") await this.init();
		else if (e === "graph") await Nv.init();
		else if (e === "shapes" && !this.fabricCanvas) {
			this.fabricCanvas = await Pv.init("shapesCanvas", "shapesCanvasWrapper"), this.shapeHistory = [], this.isHistoryProcessing = !1;
			let e = () => {
				this.isHistoryProcessing || (this.shapeHistory.push(JSON.stringify(this.fabricCanvas.toJSON())), this.shapeHistory.length > 50 && this.shapeHistory.shift());
			};
			e(), this.fabricCanvas.on("object:added", e), this.fabricCanvas.on("object:modified", e), this.fabricCanvas.on("object:removed", e);
			let t = () => {
				let e = document.getElementById("objectListPanel");
				e && e.style.display === "flex" && this._refreshObjectList();
			};
			this.fabricCanvas.on("selection:created", t), this.fabricCanvas.on("selection:updated", t), this.fabricCanvas.on("selection:cleared", t), this.fabricCanvas.on("object:added", t), this.fabricCanvas.on("object:removed", t);
		}
	}
	showMathMenu(e, t) {
		let n = document.getElementById("mathContextMenu");
		n && n.remove();
		let r = document.createElement("div");
		r.id = "mathContextMenu", r.style.position = "fixed", r.style.left = `${e}px`, r.style.top = `${t}px`, r.style.background = "white", r.style.border = "1px solid #e2e8f0", r.style.boxShadow = "0 10px 15px -3px rgba(0,0,0,0.1)", r.style.borderRadius = "8px", r.style.padding = "8px 0", r.style.zIndex = "999999", r.style.display = "flex", r.style.flexDirection = "column", r.style.minWidth = "200px";
		let i = "\n            background: transparent;\n            border: none;\n            padding: 8px 16px;\n            text-align: left;\n            cursor: pointer;\n            font-family: inherit;\n            font-size: 0.9rem;\n            color: #334155;\n            transition: background 0.2s;\n        ", a = document.createElement("button");
		a.innerHTML = window._ ? window._("dialectics.dictate_formula", "🎙 Dictate formula") : "🎙 Dictate formula", a.style.cssText = i, a.onmouseover = () => a.style.background = "#f1f5f9", a.onmouseout = () => a.style.background = "transparent", a.onclick = () => {
			r.remove(), this.engine.startVoiceMathDictation();
		};
		let o = document.createElement("button");
		o.innerHTML = window._ ? window._("dialectics.write_formula_in_text", "✍ Write formula in text") : "✍ Write formula in text", o.style.cssText = i, o.onmouseover = () => o.style.background = "#f1f5f9", o.onmouseout = () => o.style.background = "transparent", o.onclick = () => {
			r.remove(), this.engine.startTextMathDictation();
		};
		let s = document.createElement("button");
		s.innerHTML = window._ ? window._("dialectics.insert_formula_image", "📷 Insert formula image") : "📷 Insert formula image", s.style.cssText = i, s.onmouseover = () => s.style.background = "#f1f5f9", s.onmouseout = () => s.style.background = "transparent", s.onclick = () => {
			r.remove(), this.engine.startImageMathDictation();
		}, r.appendChild(a), r.appendChild(o), r.appendChild(s), document.body.appendChild(r), setTimeout(() => {
			document.addEventListener("click", function e(t) {
				r.contains(t.target) || (r.remove(), document.removeEventListener("click", e));
			});
		}, 10);
	}
	plotGraph() {
		Nv.plot(document.getElementById("graphPreview"), document.getElementById("graphFuncInput").value);
	}
	async insertGraphToNote() {
		let e = document.getElementById("graphPreview").querySelector("svg");
		e && this.tiptap && await Nv.exportToPNG(e, this.tiptap, () => this.switchTab("text"));
	}
	setShapeTool(e) {
		Pv.setTool(this.fabricCanvas, e, document.getElementById("shapeColor").value);
	}
	async addShape(e) {
		await Pv.add(this.fabricCanvas, e, document.getElementById("shapeColor").value);
	}
	deleteSelectedShape() {
		if (!this.fabricCanvas) return;
		let e = this.fabricCanvas.getActiveObjects();
		this.fabricCanvas.discardActiveObject(), this.fabricCanvas.remove(...e);
	}
	async toggleShapeGrid() {
		await Pv.toggleGrid(this.fabricCanvas);
	}
	async copySelectedShape() {
		await Pv.copySelectedShape(this.fabricCanvas);
	}
	undoShape() {
		if (!this.fabricCanvas || !this.shapeHistory || this.shapeHistory.length <= 1) return;
		this.isHistoryProcessing = !0, this.shapeHistory.pop();
		let e = this.shapeHistory[this.shapeHistory.length - 1];
		this.fabricCanvas.loadFromJSON(e, () => {
			this.fabricCanvas.renderAll(), this.isHistoryProcessing = !1;
		});
	}
	applyColorToSelected(e) {
		if (!this.fabricCanvas) return;
		let t = this.fabricCanvas.getActiveObject();
		if (!t) return;
		let n = (t) => {
			t.type === "i-text" || t.type === "text" ? t.set({
				fill: e,
				dirty: !0
			}) : (t.type === "line" || t.type === "path" || t.type === "polygon" || t.type === "rect" || t.type === "circle" || t.type === "triangle") && t.set({
				stroke: e,
				dirty: !0
			});
		};
		t.type === "group" || t.type === "activeSelection" ? t.forEachObject((e) => n(e)) : n(t), this.fabricCanvas.renderAll(), this._saveHistory();
	}
	applyFillToSelected(e) {
		if (!this.fabricCanvas) return;
		let t = this.fabricCanvas.getActiveObject();
		if (!t) return;
		let n = (t) => {
			(t.type === "polygon" || t.type === "rect" || t.type === "circle" || t.type === "triangle") && t.set({
				fill: e,
				dirty: !0
			});
		};
		t.type === "group" || t.type === "activeSelection" ? t.forEachObject((e) => n(e)) : n(t), this.fabricCanvas.renderAll(), this._saveHistory();
	}
	toggleFillForSelected() {
		if (!this.fabricCanvas) return;
		let e = this.fabricCanvas.getActiveObject();
		if (!e) return;
		let t = document.getElementById("shapeFillColor"), n = t ? t.value + "33" : "rgba(59, 130, 246, 0.2)", r = (e) => {
			(e.type === "polygon" || e.type === "rect" || e.type === "circle" || e.type === "triangle") && (!e.fill || e.fill === "transparent" ? e.set({
				fill: n,
				dirty: !0
			}) : e.set({
				fill: "transparent",
				dirty: !0
			}));
		};
		e.type === "group" || e.type === "activeSelection" ? e.forEachObject((e) => r(e)) : r(e), this.fabricCanvas.renderAll(), this._saveHistory();
	}
	_saveHistory() {
		this.shapeHistory && !this.isHistoryProcessing && (this.shapeHistory.push(JSON.stringify(this.fabricCanvas.toJSON())), this.shapeHistory.length > 50 && this.shapeHistory.shift());
	}
	async clearShapes() {
		await window.NotificationService.confirm("Clear canvas?", {
			isDanger: !0,
			okText: "Clear"
		}) && this.fabricCanvas && (this.fabricCanvas.clear(), this.fabricCanvas.backgroundColor = "#ffffff", this.fabricCanvas.renderAll(), this._refreshObjectList());
	}
	groupSelected() {
		let e = this.fabricCanvas;
		if (!e) return;
		let t = e.getActiveObject();
		if (t) if (t.type === "activeSelection") {
			let n = t.toGroup();
			n._isLockedGroup = !0, e.setActiveObject(n), e.renderAll(), this._refreshObjectList();
		} else t.type === "group" && (t.toActiveSelection(), e.renderAll(), this._refreshObjectList());
	}
	toggleObjectListPanel() {
		let e = document.getElementById("objectListPanel");
		e && (e.style.display === "flex" ? e.style.display = "none" : (e.style.display = "flex", this._refreshObjectList()));
	}
	_refreshObjectList() {
		let e = this.fabricCanvas, t = document.getElementById("objectListItems");
		if (!e || !t) return;
		let n = {
			line: "— Segment",
			group: "🔒 Group",
			circle: "○ Circle",
			rect: "▯ Rectangle",
			triangle: "△ Triangle",
			polygon: "◇ Polygon",
			"i-text": "🔤 Text",
			path: "✎ Drawing"
		}, r = e.getObjects();
		if (r.length === 0) {
			t.innerHTML = "<div style=\"padding:8px;font-size:11px;color:#94a3b8;text-align:center;\">Canvas is empty</div>";
			return;
		}
		t.innerHTML = r.map((t, r) => {
			let i = n[t.type] || t.type, a = e.getActiveObjects().includes(t);
			return `<div data-obj-index="${r}" style="
                padding:5px 8px; border-radius:6px; cursor:pointer; font-size:12px;
                background:${a ? "#eff6ff" : "transparent"};
                color:${a ? "#1d4ed8" : "#334155"};
                border:1px solid ${a ? "#bfdbfe" : "transparent"};
                margin-bottom:2px;
                display:flex; align-items:center; gap:6px;
            ">${i} <span style="color:#94a3b8;font-size:10px;">#${r + 1}</span></div>`;
		}).join(""), t.querySelectorAll("[data-obj-index]").forEach((t) => {
			t.addEventListener("click", () => {
				let n = parseInt(t.dataset.objIndex), r = e.getObjects()[n];
				r && (e.discardActiveObject(), e.setActiveObject(r), e.renderAll(), this._refreshObjectList());
			});
		});
	}
	insertShapesToNote() {
		Pv.exportToPNG(this.fabricCanvas, this.tiptap, () => this.switchTab("text"));
	}
	setContent(e) {
		this.tiptap && (this.tiptap.commands.setContent(e), this.tiptap.commands.focus());
	}
	getHTML() {
		return this.tiptap ? this.tiptap.getHTML() : "";
	}
}, Iv = {
	async showReferenceModal() {
		let e = document.getElementById("referenceDialecticsModal");
		if (!e) return;
		e.style.display = "flex";
		let t = document.getElementById("dialecticsReferenceContent");
		if (t && t.dataset.loaded !== "true") try {
			t.innerHTML = "<div style=\"color: #64748b; text-align: center; padding: 20px;\">Загрузка справочника...</div>";
			let e = await fetch("/api/dialectics/reference");
			if (!e.ok) throw Error("Failed to load reference");
			t.innerHTML = `<div class="guide-markdown-content">${(await e.json()).html}</div>`, t.dataset.loaded = "true";
		} catch (e) {
			console.error(e), t.innerHTML = "<div style=\"color: #ef4444; text-align: center; padding: 20px;\">Не удалось загрузить справочник.</div>";
		}
	},
	async showGuideModal() {
		let e = document.getElementById("guideDialecticsModal");
		if (!e) return;
		e.style.display = "flex", e.offsetHeight, e.classList.add("active");
		let t = document.getElementById("dialecticsGuideContent");
		if (t && t.dataset.loaded !== "true") try {
			t.innerHTML = "<div style=\"color: #64748b; text-align: center; padding: 20px;\">Загрузка инструкции...</div>";
			let e = await fetch("/api/dialectics/guide");
			if (!e.ok) throw Error("Failed to load guide");
			t.innerHTML = `<div class="guide-markdown-content">${(await e.json()).html}</div>`, t.dataset.loaded = "true";
		} catch (e) {
			console.error(e), t.innerHTML = "<div style=\"color: #ef4444; text-align: center; padding: 20px;\">Не удалось загрузить инструкцию.</div>";
		}
	},
	hideGuideModal() {
		let e = document.getElementById("guideDialecticsModal");
		e && (e.classList.remove("active"), setTimeout(() => e.style.display = "none", 200));
	},
	showLoadModal() {
		this.logDebug("showLoadModal() called"), this.dom.loadModal ? (this.dom.loadModal.style.display = "flex", this.dom.loadModal.offsetHeight, this.dom.loadModal.classList.add("active"), this.logDebug("loadModal display set to flex and active class added")) : this.logDebug("ERROR: this.dom.loadModal is undefined!"), this.searchNotes("");
	},
	hideLoadModal() {
		this.dom.loadModal && (this.dom.loadModal.classList.remove("active"), setTimeout(() => this.dom.loadModal.style.display = "none", 200));
	},
	async searchNotes(e) {
		if (this.logDebug("searchNotes called with query: " + e), !this.dom.loadList) {
			this.logDebug("ERROR: this.dom.loadList is undefined!");
			return;
		}
		n.setLoading(this.dom.loadList);
		try {
			let n = await t.list(e);
			this.logDebug("DialecticsAPI.list returned " + n.length + " notes"), this.renderNotesList(n);
		} catch (e) {
			this.logDebug("ERROR in DialecticsAPI.list: " + e.message);
		}
	},
	renderNotesList(e) {
		this.dom.loadList.innerHTML = e.length ? "" : "<div style=\"color: #64748b; text-align: center; padding: 20px;\">Nothing found</div>", e.forEach((e) => {
			let n = document.createElement("div");
			n.className = "load-note-item";
			let i = new Date(e.updated_at || e.created_at), a = "";
			i.getFullYear() > 1970 && (a = i.toLocaleDateString() + " " + i.toLocaleTimeString([], {
				hour: "2-digit",
				minute: "2-digit"
			}));
			let o = e.is_pinned ? "<span style=\"color: #f59e0b; margin-right: 8px;\" title=\"Pinned\">📌</span>" : "", s = e.title === "Example Note" || e.title === "Пример конспекта" || e.title === "Конспект мысалы" ? "" : "<button class=\"load-note-item-delete\" title=\"Delete\">🗑️</button>";
			n.innerHTML = `
                <div class="load-note-item-content" style="flex: 1;">
                    <div class="load-note-item-title" style="display: flex; align-items: center; color: #1e293b; font-size: 1.05em; margin-bottom: 4px;">${o}<strong>${e.title || (window._ ? window._("dialectics.topic_placeholder") : "Untitled")}</strong></div>
                    <div class="load-note-item-date" style="color: #94a3b8; font-size: 0.85em;">${a}</div>
                </div>
                ${s}
            `, n.onclick = () => this.loadNoteToEditor(e.id);
			let c = n.querySelector(".load-note-item-delete");
			c && (c.onclick = async (i) => {
				i.stopPropagation();
				let a = window._ ? window._("dialectics.delete", "Confirm Deletion") : "Confirm Deletion", o = window._ ? window._("dialectics.confirm_delete", "Delete note \"%s\"?") : "Delete note \"%s\"?", s = window._ ? window._("dialectics.cancel", "Cancel") : "Cancel", c = window._ ? window._("dialectics.delete", "Delete") : "Delete";
				await r({
					title: a,
					message: o.replace("%s", e.title),
					icon: "🗑️",
					buttons: [{
						label: s,
						value: !1,
						class: "confirm-btn-secondary"
					}, {
						label: c,
						value: !0,
						class: "confirm-btn-danger"
					}]
				}) && await t.delete(e.id) && (window.showToast(window._("toast.record_deleted"), "info"), n.remove(), this.dom.loadList.children.length === 0 && (this.dom.loadList.innerHTML = "<div style=\"color: #64748b; text-align: center; padding: 20px;\">Nothing found</div>"), this.state.currentNoteId === e.id && (this.close(), this.dom.title.value = "", La.render(this.dom.canvas, []), this.state.currentNoteId = null, this.dom.deleteBtn && (this.dom.deleteBtn.style.display = "none")));
			}), this.dom.loadList.appendChild(n);
		});
	},
	async deleteGlobal() {
		if (this.state.currentNoteId) {
			if (this.dom.title && (this.dom.title.value === "Example Note" || this.dom.title.value === "Пример конспекта" || this.dom.title.value === "Конспект мысалы")) {
				window.showToast && window.showToast(window._("toast.cannot_delete_the_example_note"), "error");
				return;
			}
			await r({
				title: window._ ? window._("dialectics.delete_note_title") : "Удаление конспекта",
				message: window._ ? window._("dialectics.delete_note_msg") : "Вы уверены, что хотите удалить этот конспект?",
				icon: "🗑️",
				buttons: [{
					label: window._ ? window._("dialectics.cancel") : "Отмена",
					value: !1,
					class: "confirm-btn-secondary"
				}, {
					label: window._ ? window._("dialectics.delete") : "Удалить",
					value: !0,
					class: "confirm-btn-danger"
				}]
			}) && await t.delete(this.state.currentNoteId) && (window.showToast(window._("toast.dialectics_deleted"), "info"), location.reload());
		}
	},
	async pinCurrent() {
		if (!this.state.currentNoteId) {
			window.showToast(window._("toast.save_first_to_pin"), "warning");
			return;
		}
		let e = this.dom.title.value || (window._ ? window._("dialectics.topic_placeholder") : "Untitled Dialectics"), n = La.getBlocks(this.dom.canvas), r = {
			id: this.state.currentNoteId,
			title: e,
			blocks: n,
			is_pinned: !0
		};
		await t.save(r, this.state.currentNoteId) && window.showToast(window._("toast.pinned_successfully"), "success");
	},
	showViewModal(e, t, n) {
		this.state.viewingNoteId = e, this.dom.viewTitle.textContent = t;
		let r = "";
		n.forEach((e) => {
			r += `<div style="margin-bottom: 15px; border-bottom: 1px solid #eee; padding-bottom: 10px;">
                <small style="color: #94a3b8; text-transform: uppercase;">${e.side}</small>
                <div>${e.html}</div>
            </div>`;
		}), this.dom.viewBody.innerHTML = r, this.dom.viewModal.style.display = "flex", this.dom.viewModal.offsetHeight, this.dom.viewModal.classList.add("active");
	},
	hideViewModal() {
		this.dom.viewModal && (this.dom.viewModal.classList.remove("active"), setTimeout(() => this.dom.viewModal.style.display = "none", 200)), this.state.viewingNoteId = null;
	},
	async loadCategories() {
		try {
			this.state.categories = await t.listCategories(), this.renderCategorySelect(), this.renderConnectionsCategories();
		} catch (e) {
			console.error("Error loading categories", e);
		}
	},
	renderCategorySelect() {
		if (!this.dom.categorySelect) return;
		let e = this.dom.categorySelect.value;
		this.dom.categorySelect.innerHTML = "<option value=\"\">Без категории</option>", this.state.categories.forEach((e) => {
			let t = document.createElement("option");
			t.value = e.id, t.textContent = e.name, this.dom.categorySelect.appendChild(t);
		});
		let t = document.createElement("option");
		t.value = "__add_new__", t.textContent = "➕ Новая категория...", t.style.fontWeight = "bold", t.style.color = "var(--color-primary)", this.dom.categorySelect.appendChild(t), this.dom.categorySelect.value = e;
	},
	renderConnectionsCategories() {
		this.dom.connCategoriesList && (this.dom.connCategoriesList.innerHTML = "", this.state.categories.forEach((e) => {
			let t = document.createElement("li");
			t.className = "connections-category-item", t.style.cssText = "display: flex; align-items: center; gap: 12px; padding: 10px 14px; border-radius: var(--radius-md); cursor: pointer; transition: all 0.2s; border: 1px solid transparent;", t.onmouseover = () => {
				t.style.backgroundColor = "var(--color-bg-subtle)", t.style.borderColor = "var(--color-border)";
			}, t.onmouseout = () => {
				t.style.backgroundColor = "transparent", t.style.borderColor = "transparent";
			}, t.innerHTML = `
                <span class="category-color-dot" style="width: 10px; height: 10px; border-radius: 50%; display: inline-block; background-color: ${e.color || "#94a3b8"}; box-shadow: 0 0 0 2px ${e.color}33;"></span>
                <span style="font-weight: 500; font-size: 0.95rem;">${e.name}</span>
            `, t.addEventListener("click", () => {
				let t = document.getElementById("connections-search-input");
				t && (t.value = e.name, this.searchConnections(e.name));
			}), this.dom.connCategoriesList.appendChild(t);
		}));
	},
	async addCategory(e) {
		if (e && e.preventDefault(), !this.dom.newCategoryInput) return;
		let t = this.dom.newCategoryInput.value.trim();
		t && await this.createNewCategory(t) && (this.dom.newCategoryInput.value = "");
	},
	async createNewCategory(e) {
		try {
			let n = await t.createCategory(e);
			if (n) return this.state.categories.push(n), this.state.categories.sort((e, t) => e.name.localeCompare(t.name)), this.renderCategorySelect(), this.renderConnectionsCategories(), this.dom.categorySelect && (this.dom.categorySelect.value = n.id), window.showToast("Категория добавлена", "success"), !0;
		} catch (e) {
			console.error("Error adding category", e), window.showToast("Ошибка при добавлении категории", "error");
		}
		return !1;
	},
	async showConnectionsModal(e) {
		console.log("showConnectionsModal called", e), e && e.preventDefault();
		let t = document.getElementById("dialectics-connections-modal");
		t ? (t.style.display = "flex", t.offsetHeight, t.classList.add("active"), this.dom.connectionsModal = t, this.renderConnectionsCategories(), this.searchConnections("")) : (console.error("Connections modal element not found in DOM!"), window.showToast("Ошибка: модальное окно не найдено", "error"));
	},
	hideConnectionsModal() {
		this.dom.connectionsModal && (this.dom.connectionsModal.classList.remove("active"), setTimeout(() => this.dom.connectionsModal.style.display = "none", 200));
	},
	async searchConnections(e) {
		if (this.dom.connResultsContainer) {
			this.dom.connResultsContainer.innerHTML = "<div style=\"color:#64748b; padding:20px; text-align:center; font-style: italic;\"><i class=\"fas fa-circle-notch fa-spin\" style=\"margin-right: 8px;\"></i> Поиск...</div>";
			try {
				let n = [];
				if (n = !e || e.trim().length < 2 ? await t.list("") : await t.searchNotes(e), !n || n.length === 0) {
					this.dom.connResultsContainer.innerHTML = "\n                    <div class=\"empty-state\" style=\"display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; color: var(--color-text-light); opacity: 0.7; padding: 40px 0;\">\n                        <i class=\"fas fa-search\" style=\"font-size: 3rem; margin-bottom: 16px; color: var(--color-bg-app);\"></i>\n                        <p class=\"connections-empty-state\" data-i18n=\"dialectics_search_empty\" style=\"margin: 0; font-size: 0.95rem;\">Ничего не найдено</p>\n                    </div>";
					return;
				}
				this.dom.connResultsContainer.innerHTML = "", n.forEach((e) => {
					let t = document.createElement("div");
					t.className = "connections-result-item", t.style.cssText = "padding: 16px; border-radius: var(--radius-lg); background: var(--color-bg-white); border: 1px solid var(--color-border); cursor: pointer; transition: all 0.2s; box-shadow: 0 2px 4px rgba(0,0,0,0.02); display: flex; flex-direction: column; gap: 8px;", t.onmouseover = () => {
						t.style.transform = "translateY(-2px)", t.style.boxShadow = "0 6px 12px rgba(0,0,0,0.05)", t.style.borderColor = "var(--color-primary)";
					}, t.onmouseout = () => {
						t.style.transform = "translateY(0)", t.style.boxShadow = "0 2px 4px rgba(0,0,0,0.02)", t.style.borderColor = "var(--color-border)";
					};
					let n = e.title || "Untitled", r = e.category ? e.category.name : "Без категории", i = e.category && e.category.color ? e.category.color : "#cbd5e1";
					t.innerHTML = `
                    <div class="connections-result-header" style="display: flex; justify-content: space-between; align-items: flex-start; gap: 12px;">
                        <strong style="font-size: 1.05rem; font-weight: 700; color: var(--color-text); line-height: 1.3;">${n}</strong>
                        <span class="connections-result-cat" style="background-color: ${i}15; color: ${i}; padding: 4px 10px; border-radius: 20px; font-size: 0.75rem; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; white-space: nowrap; border: 1px solid ${i}30;">${r}</span>
                    </div>
                    <div class="connections-result-date" style="font-size: 0.8rem; color: var(--color-text-light);"><i class="far fa-clock" style="margin-right: 4px;"></i>${new Date(e.created_at).toLocaleDateString()}</div>
                `, t.addEventListener("click", () => {
						this.loadNoteToEditor(e.id), this.dom.connectionsModal && this.dom.connectionsModal.classList.remove("active"), setTimeout(() => {
							this.dom.connectionsModal && (this.dom.connectionsModal.style.display = "none");
						}, 200);
					}), this.dom.connResultsContainer.appendChild(t);
				});
			} catch (e) {
				console.error("Search error", e), this.dom.connResultsContainer.innerHTML = "<p class=\"connections-empty-state\">Ошибка поиска</p>";
			}
		}
	}
}, Lv = class {
	async saveGlobal(e = !0, n = "toast.dialectics_saved") {
		let r = this.dom.title.value || (window._ ? window._("dialectics.topic_placeholder") : "Untitled Dialectics"), i = this.editor.getHTML(), a = document.getElementById("editorBlockTitleInput")?.value?.trim() || "";
		if (console.log("TipTap HTML Output -> length:", i.length), this.state.editingBlock) {
			let e = this.state.editingBlock.querySelector(".dialectics-content-inner");
			e && (e.innerHTML = i), a ? this.state.editingBlock.dataset.title = a : delete this.state.editingBlock.dataset.title;
			let t = La.getBlocks(this.dom.canvas);
			La.render(this.dom.canvas, t, this._blockCallbacks());
		} else if (this.state.pendingSide && i !== "<p></p>" && i.trim() !== "") {
			let e = La.getBlocks(this.dom.canvas), t = {
				id: this.state.pendingBlockId,
				side: this.state.pendingSide,
				html: i,
				title: a || void 0
			};
			this.state.pendingRole && (t.role = this.state.pendingRole);
			let n;
			n = this.state.insertAfterIndex === null ? [...e, t] : [
				...e.slice(0, this.state.insertAfterIndex + 1),
				t,
				...e.slice(this.state.insertAfterIndex + 1)
			], this.state.insertAfterIndex = null, this.state.pendingRole = null, La.render(this.dom.canvas, n, this._blockCallbacks());
		}
		let o = La.getBlocks(this.dom.canvas), s = this.dom.categorySelect ? this.dom.categorySelect.value : null, c = {
			title: r,
			blocks: o.map((e) => ({
				id: e.id,
				side: e.side,
				html: e.html,
				role: e.role,
				sources: e.sources || [],
				title: e.title || void 0,
				collapsed: e.collapsed || !1,
				words: e.words || [],
				color: e.color || void 0
			})),
			is_pinned: this.state.isPinned || !1,
			category_id: s ? parseInt(s) : null,
			sticker_text: document.getElementById("dialecticsStickerText")?.value || "",
			sticker_title: document.getElementById("dialecticsStickerTitle")?.value || "",
			sticker_color: document.getElementById("dialecticsStickerColor")?.value || "#fff9c4",
			sticker_type: document.getElementById("dialecticsStickerType")?.value || "text"
		};
		this.state.currentNoteId && (c.id = Number(this.state.currentNoteId));
		let l = await t.save(c, this.state.currentNoteId);
		if (l) {
			this.state.currentNoteId = l.id, localStorage.setItem("dialectics_last_note_id", l.id);
			let t = new URL(window.location);
			return t.searchParams.get("id") !== String(l.id) && (t.searchParams.set("id", l.id), window.history.pushState({}, "", t)), window.showToast(window._(n) || window._("toast.dialectics_saved"), "success"), e && this.close(), this.dom.deleteBtn && (this.dom.deleteBtn.style.display = "block"), l.id;
		}
		return null;
	}
	async openStickersForCurrent(e = null) {
		if (!this.state.currentNoteId && (window.showToast && window.showToast(window._("toast.saving_note_to_attach_sticker"), "info"), !await this.saveGlobal(!1))) {
			window.showToast && window.showToast(window._("toast.failed_to_save_note"), "error");
			return;
		}
		let t = e;
		t || (this.state.editingBlock ? t = this.state.editingBlock.dataset.blockId : this.state.pendingBlockId && (t = this.state.pendingBlockId)), window.openParentStickers && window.openParentStickers("dialectics", this.state.currentNoteId, t);
	}
	async saveAndPin() {
		let e = {
			title: this.dom.title.value || (window._ ? window._("dialectics.topic_placeholder") : "Untitled Dialectics"),
			blocks: [{
				side: "left",
				html: this.editor.getHTML() || this.dom.dashboardTextarea?.value.replace(/\n/g, "<br>") || ""
			}],
			is_pinned: !0,
			sticker_text: document.getElementById("dialecticsStickerText")?.value || "",
			sticker_title: document.getElementById("dialecticsStickerTitle")?.value || "",
			sticker_color: document.getElementById("dialecticsStickerColor")?.value || "#fff9c4",
			sticker_type: document.getElementById("dialecticsStickerType")?.value || "text"
		};
		this.state.currentNoteId && (e.id = this.state.currentNoteId), await t.save(e, this.state.currentNoteId) && (window.showToast(window._("toast.saved_and_pinned"), "success"), this.close(), setTimeout(() => location.reload(), 500));
	}
	async loadNoteToEditor(e, n = !0) {
		let r = await t.get(e);
		if (r) {
			if (n && this.state.currentNoteId && this.state.currentNoteId !== r.id) {
				let e = this.getNoteHistory();
				(e.length === 0 || e[e.length - 1] !== this.state.currentNoteId) && (e.push(this.state.currentNoteId), this.saveNoteHistory(e));
			}
			this.state.currentNoteId = r.id, localStorage.setItem("dialectics_last_note_id", r.id), this.dom.title.value = r.title;
			let e = typeof r.content_json == "string" ? JSON.parse(r.content_json) : r.content_json;
			this.dom.categorySelect && (this.dom.categorySelect.value = r.category_id || "");
			let t = {};
			try {
				let e = await fetch(`/api/stickers/dialectics/${r.id}/`).then((e) => e.json());
				Array.isArray(e) && e.forEach((e) => {
					e.dialectics_block_id && (t[e.dialectics_block_id] = (t[e.dialectics_block_id] || 0) + 1);
				});
			} catch (e) {
				console.error("Failed to load block stickers:", e);
			}
			this.state.blockStickersCount = t;
			let i = document.getElementById("toggleOnlyTitlesMode");
			i && (i.checked = !1, window.toggleOnlyTitlesMode && window.toggleOnlyTitlesMode(!1)), La.render(this.dom.canvas, e, this._blockCallbacks()), this._revealInterface(), this.hideLoadModal(), this.dom.deleteBtn && (this.dom.deleteBtn.style.display = r.title === "Example Note" || r.title === "Пример конспекта" || r.title === "Конспект мысалы" ? "none" : "block");
			let a = new URL(window.location);
			a.searchParams.get("id") !== String(r.id) && (a.searchParams.set("id", r.id), window.history.pushState({}, "", a));
		} else localStorage.removeItem("dialectics_last_note_id"), this._revealInterface();
	}
	async loadExample() {
		n.setLoading(this.dom.canvas);
		try {
			let e = await fetch("/api/dialectics/example/get_or_create_id");
			if (e.ok) {
				let t = await e.json();
				t && t.id && (await this.loadNoteToEditor(t.id), window.showToast(window._("toast.opened_existing_example_note") || "Example Note loaded", "info"));
			} else console.error("Failed to load example note ID."), n.clearLoading(this.dom.canvas);
		} catch (e) {
			console.error(e), n.clearLoading(this.dom.canvas);
		}
	}
	async createNewNote() {
		this.state.isDirty ? await customConfirm({
			title: window._ ? window._("dialectics.unsaved_title") : "Внимание",
			message: window._ ? window._("dialectics.unsaved_new_msg") : "Есть несохранённые изменения. Создать новый конспект?",
			icon: "⚠️",
			buttons: [{
				label: window._ ? window._("dialectics.cancel") : "Отмена",
				value: !1,
				class: "confirm-btn-secondary"
			}, {
				label: window._ ? window._("dialectics.create_btn") : "Создать",
				value: !0,
				class: "confirm-btn-primary"
			}]
		}) && (this.state.isDirty = !1, this._resetToNewNote()) : this._resetToNewNote();
	}
	_resetToNewNote() {
		if (this.state.currentNoteId) {
			let e = this.getNoteHistory();
			(e.length === 0 || e[e.length - 1] !== this.state.currentNoteId) && (e.push(this.state.currentNoteId), this.saveNoteHistory(e));
		}
		this.state.currentNoteId = null, localStorage.removeItem("dialectics_last_note_id"), this.dom.title && (this.dom.title.value = ""), this.dom.categorySelect && (this.dom.categorySelect.value = ""), this.dom.canvas && La.render(this.dom.canvas, [], this._blockCallbacks()), this.dom.deleteBtn && (this.dom.deleteBtn.style.display = "none");
		let e = new URL(window.location);
		e.searchParams.delete("id"), window.history.pushState({}, "", e), window.showToast(window._("toast.created_a_new_blank_note"), "success");
	}
	getNoteHistory() {
		try {
			let e = sessionStorage.getItem("dialectics_note_history");
			return e ? JSON.parse(e) : [];
		} catch {
			return [];
		}
	}
	saveNoteHistory(e) {
		try {
			sessionStorage.setItem("dialectics_note_history", JSON.stringify(e));
		} catch {}
	}
	loadPreviousNote() {
		let e = this.getNoteHistory();
		if (e.length > 0) {
			let t = e.pop();
			this.saveNoteHistory(e), this.loadNoteToEditor(t, !1), window.showToast(window._("toast.loaded_previous_note"), "info");
		} else window.location.href = "/";
	}
}, Rv = {};
Object.getOwnPropertyNames(Lv.prototype).forEach((e) => {
	e !== "constructor" && (Rv[e] = Lv.prototype[e]);
});
//#endregion
//#region fastapi_app/static/js/dialectics/AIController.js
var zv = class {
	async runHintAI(e) {
		if (!e || e.id === "anchor") {
			window.showToast("Cannot run AI on the main goal block before it is created.", "info");
			return;
		}
		let t = La.getBlocks(this.dom.canvas), n = t.find((e) => e.role === "anchor"), r = (e) => {
			let t = document.createElement("DIV");
			return t.innerHTML = e, t.textContent || t.innerText || "";
		}, i = n ? r(n.html) : "", a = t.filter((e) => e.role && e.role !== "anchor").map((e) => `[${e.role}]: ${r(e.html)}`).join("\\n\\n");
		window.showToast("✨ " + window._("toast.ai_is_thinking", "AI is generating response..."), "info");
		try {
			let t = await fetch("/api/ai/dialectics/hint-step", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					step_id: e.id,
					goal_text: i,
					context_text: a
				})
			});
			if (!t.ok) {
				let e = await t.json();
				throw Error(e.detail || "API Error");
			}
			let n = (await t.json()).result;
			!n.includes("<p>") && !n.includes("<div>") && (n = n.split("\\n").filter((e) => e.trim()).map((e) => `<p>${e}</p>`).join("")), this.openHintEditor(e, "", n);
		} catch (e) {
			console.error("AI Error:", e), window.showToast("AI Error: " + e.message, "error");
		}
	}
	openInsertAfter(e, t) {
		if (e === "section") {
			this.openSectionTitleModal && this.openSectionTitleModal(t);
			return;
		}
		this.state.editingBlock = null, this.state.pendingSide = e, this.state.pendingRole = null, this.state.pendingBlockId = "block_" + Math.random().toString(36).substr(2, 9), this.state.insertAfterIndex = t;
		let n = document.getElementById("editorBlockTitleInput");
		n && (n.value = ""), this.open();
	}
	async runAI(e) {
		let t = e.closest(".dialectics-editor") || document, n = (e) => {
			let n = t.querySelector(`[data-role="${e}"] .dialectics-content-inner`);
			return n ? (n.innerText || n.textContent).trim() : "";
		}, i = n("anchor"), a = n("step1"), o = n("step2"), s = [];
		i && s.push(`Что понять: ${i}`), a && s.push(`Простейший процесс: ${a}`), o && s.push(`Развитие процесса: ${o}`);
		let c = s.join("\n\n");
		if (!c) {
			let t = e.querySelector(".dialectics-content-inner");
			c = t ? (t.innerText || t.textContent).trim() : "";
		}
		if (c) {
			window.showToast(window._("toast.ai_is_analyzing_the_process"), "info");
			try {
				let e = await fetch("/api/ai/dialectics/opposites", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ process_a: c })
				});
				if (!e.ok) {
					let t = await e.json();
					throw Error(t.detail || "API Error");
				}
				let t = await e.json(), n = document.getElementById("explainConceptModal"), i = document.getElementById("explainConceptTitle"), a = document.getElementById("explainConceptBody");
				n && i && a ? (i.innerText = window._ && window._("analysis_result") || "Результат анализа", a.innerHTML = this._renderMarkdown(t.result), n.style.display = "flex") : r({
					title: "Результат анализа",
					message: `<div style="white-space: pre-wrap; text-align: left; font-family: monospace; font-size: 14px; background: #f8fafc; padding: 15px; border-radius: 8px; max-height: 60vh; overflow-y: auto;">${t.result.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</div>`,
					buttons: [{
						label: "Закрыть",
						value: !0,
						class: "confirm-btn-primary"
					}]
				});
			} catch (e) {
				console.error(e);
				let t = document.getElementById("explainConceptModal"), n = document.getElementById("explainConceptTitle"), i = document.getElementById("explainConceptBody");
				t && n && i ? (n.innerText = "Ошибка", i.innerHTML = `<div style="color:#ef4444;">${e.message}</div>`, t.style.display = "flex") : r({
					title: "Ошибка",
					message: `<div style="color: red;">${e.message}</div>`,
					buttons: [{
						label: "Закрыть",
						value: !0,
						class: "confirm-btn-secondary"
					}]
				});
			}
		}
	}
	async runGlobalParser() {
		if (window.WidgetManager) window.WidgetManager.toggle("formulaParserWidget");
		else {
			let e = document.getElementById("formulaParserWidget");
			e && (e.style.display = "flex");
		}
	}
	async startTextMathDictation() {
		let e = await customPrompt({
			title: window._ ? window._("dialectics.describe_formula_prompt", "✍ Describe the formula in words") : "✍ Describe the formula in words",
			message: window._ ? window._("dialectics.describe_formula_example", "Example: \"square root of x squared plus y squared\"") : "Example: \"square root of x squared plus y squared\"",
			placeholder: window._ ? window._("dashboard.enter_title", "Your text...") : "Your text..."
		});
		if (!(!e || !e.trim())) {
			window.showToast(window._("toast.ai_is_generating_formula"), "info");
			try {
				let t = await fetch("/api/ai/dialectics/text-math", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ text: e.trim() })
				});
				if (!t.ok) throw Error(await t.text());
				let n = (await t.json()).latex;
				this.editor && this.editor.tiptap && (this.editor.tiptap.chain().focus().insertContent({
					type: "mathNode",
					attrs: { latex: n }
				}).run(), window.showToast(window._("toast.formula_added"), "success"));
			} catch (e) {
				console.error(e), window.showToast(window._("toast.error_generating_formula"), "error");
			}
		}
	}
	async startImageMathDictation() {
		let e = document.createElement("input");
		e.type = "file", e.accept = "image/*", e.onchange = async (e) => {
			let t = e.target.files[0];
			if (!t) return;
			let n = this.editor && this.editor.tiptap;
			window.showToast(window._("toast.ai_is_parsing_formula", "🧮 Распознавание формулы с фото..."), "info");
			let r = new FormData();
			r.append("file", t);
			try {
				let e = await fetch("/api/ai/dialectics/formula/ocr", {
					method: "POST",
					body: r
				});
				if (!e.ok) {
					let t = await e.json().catch(() => ({}));
					throw Error(t.detail || await e.text());
				}
				let t = (await e.json()).latex;
				t && n ? (n.chain().focus().insertContent({
					type: "mathNode",
					attrs: { latex: t }
				}).run(), window.showToast(window._("toast.formula_added", "✅ Формула добавлена"), "success")) : t ? window.showToast(`LaTeX: ${t}`, "info") : window.showToast(window._("toast.error_generating_formula", "❌ Не удалось распознать формулу"), "error");
			} catch (e) {
				console.error("Formula OCR error:", e), window.showToast(window._("toast.error_generating_formula", "❌ Ошибка при распознавании формулы"), "error");
			}
		}, e.click();
	}
	async startVoiceMathDictation() {
		try {
			let e = await navigator.mediaDevices.getUserMedia({ audio: !0 }), t = new MediaRecorder(e), n = [], i = !1, a = this.editor && this.editor.tiptap;
			t.addEventListener("dataavailable", (e) => {
				n.push(e.data);
			}), t.addEventListener("stop", async () => {
				let t = new Blob(n, { type: "audio/webm" });
				if (e.getTracks().forEach((e) => e.stop()), i) {
					window.showToast(window._("toast.recording_cancelled"), "info");
					return;
				}
				window.showToast(window._("toast.recognizing_and_generating_lat"), "info");
				let r = new FormData();
				r.append("file", t, "voice-math.webm");
				try {
					let e = await fetch("/api/ai/dialectics/voice-math", {
						method: "POST",
						body: r
					});
					if (!e.ok) throw Error(await e.text());
					let t = await e.json(), n = t.latex;
					console.log("Transcribed text:", t.transcribed_text), console.log("LaTeX:", n), a ? (a.chain().focus().insertContent({
						type: "mathNode",
						attrs: { latex: n }
					}).run(), window.showToast(window._("toast.formula_added"), "success")) : (console.warn("tiptap not available, cannot insert formula"), window.showToast(`LaTeX: ${n}`, "info"));
				} catch (e) {
					console.error(e), window.showToast(window._("toast.audio_processing_error"), "error");
				}
			}), t.start(), r({
				title: "🎙 Recording",
				message: "<div style=\"text-align: center; color: red; font-weight: bold; animation: pulse 1.5s infinite;\">Audio recording in progress... Speak the formula.</div>",
				buttons: [{
					label: "Stop and recognize",
					value: !0,
					class: "confirm-btn-primary"
				}, {
					label: "Cancel",
					value: !1,
					class: "confirm-btn-secondary"
				}]
			}).then((e) => {
				e === !1 && (i = !0), t.state === "recording" && t.stop();
			});
		} catch (e) {
			console.error("Microphone access denied or error:", e), window.showToast(window._("toast.no_microphone_access"), "error");
		}
	}
}, Bv = {};
Object.getOwnPropertyNames(zv.prototype).forEach((e) => {
	e !== "constructor" && (Bv[e] = zv.prototype[e]);
});
//#endregion
//#region fastapi_app/static/js/dialectics/BlocksOrchestrator.js
var Vv = class {
	open(e = "") {
		this.dom.editor && !this.dom.editor.classList.contains("embedded") && n.toggleDisplay(this.dom.editor, !0, !0);
		let t = document.getElementById("tab-ai");
		if (t && (t.style.display = "none"), this.editor.switchTab("text"), this.editor.setContent(e), !this.editor.tiptap && this.dom.dashboardTextarea) {
			let t = document.createElement("div");
			t.innerHTML = e, this.dom.dashboardTextarea.value = t.innerText || t.textContent || "", this.dom.dashboardTextarea.dispatchEvent(new Event("input"));
		}
		try {
			localStorage.setItem("papanda_editor_open_state", JSON.stringify({
				isOpen: !0,
				content: e
			}));
		} catch {}
	}
	openEdit(e) {
		let t = e.querySelector(".dialectics-content-inner")?.innerHTML || "", n = document.getElementById("editorBlockTitleInput");
		n && (n.value = e.dataset.title || ""), this.open(t);
	}
	close() {
		this.dom.editor && (this.dom.editor.style.display = "none", this.dom.editor.classList.remove("embedded")), this.editor.setContent(""), this.state.editingBlock = null, this.state.pendingSide = null, this.state.pendingRole = null, this.state.pendingBlockId = null;
		try {
			localStorage.setItem("papanda_editor_open_state", JSON.stringify({ isOpen: !1 }));
		} catch {}
		this.state.insertAfterIndex = null;
	}
	save() {
		this.saveGlobal(!1, "toast.dialectics_saved");
	}
	createBlock(e, t, n, r, i = [], a = [], o = null) {
		let s = e === "left" ? this.dom.leftCol : this.dom.rightCol;
		if (!s) return;
		let c = document.createElement("div");
		if (c.className = "dialectics-block", c.dataset.id = r, c.dataset.side = e, c.dataset.role = t, i.length > 0 && (c.dataset.stickers = JSON.stringify(i)), a.length > 0 && (c.dataset.sources = JSON.stringify(a)), c.innerHTML = `
            <div class="dialectics-block-header">
                <span class="dialectics-block-badge">${window._("dialectics.roles." + t) || t}</span>
                <div class="dialectics-block-actions">
                    <button type="button" class="btn-block-action btn-block-sources" title="Источники">🔗</button>
                    <button type="button" class="btn-block-action btn-block-stickers" title="Стикеры">🏷️</button>
                    <button type="button" class="btn-block-action btn-block-edit" title="Редактировать">✏️</button>
                    <button type="button" class="btn-block-action btn-block-del" title="Удалить">🗑️</button>
                </div>
            </div>
            <div class="dialectics-content-inner">${n}</div>
            <div class="dialectics-stickers-container" style="display:none; margin-top:10px; border-top:1px dashed #e2e8f0; padding-top:8px;"></div>
        `, this.attachBlockEvents(c), o != null) {
			let e = Array.from(s.querySelectorAll(".dialectics-block"));
			o < e.length ? e[o].after(c) : s.appendChild(c);
		} else s.appendChild(c);
		i.length > 0 && this.renderStickersForBlock(c);
	}
	attachBlockEvents(e) {
		let t = e.querySelector(".btn-block-edit"), n = e.querySelector(".btn-block-del"), r = e.querySelector(".btn-block-stickers"), i = e.querySelector(".btn-block-sources");
		t && (t.onclick = () => {
			this.state.editingBlock = e, this.openEdit(e);
		}), n && (n.onclick = () => {
			e.remove(), window.showToast && window.showToast(window._("toast.dialectics_updated", "Обновлено"), "success");
		}), r && (r.onclick = () => {
			this.openStickersForCurrent(e.dataset.id);
		}), i && (i.onclick = () => {
			this.openSourcesModal(e);
		});
	}
	initStickersModal() {
		let e = document.getElementById("blockStickersModal"), t = document.getElementById("btnAddStickerModal");
		document.getElementById("modalStickersList"), !(!e || !t) && (t.onclick = () => {
			let t = e.dataset.currentBlockId;
			if (!t) return;
			let n = document.getElementById("modalStickerText"), r = document.getElementById("modalStickerTitle"), i = document.getElementById("modalStickerColor"), a = n?.value?.trim();
			if (!a) {
				window.showToast && window.showToast("Введите текст стикера", "warning");
				return;
			}
			let o = document.querySelector(`.dialectics-block[data-id="${t}"]`);
			if (o) {
				let e = [];
				try {
					e = JSON.parse(o.dataset.stickers || "[]");
				} catch {}
				e.push({
					text: a,
					title: r?.value?.trim() || "Важное примечание",
					color: i?.value || "#fff9c4",
					type: "text"
				}), o.dataset.stickers = JSON.stringify(e), this.renderStickersForBlock(o), this.renderStickersListInModal(t), this.saveGlobal(!1, "toast.dialectics_updated");
			}
			n && (n.value = ""), r && (r.value = "");
		});
	}
	renderStickersListInModal(e) {
		let t = document.getElementById("modalStickersList");
		if (!t) return;
		t.innerHTML = "";
		let n = document.querySelector(`.dialectics-block[data-id="${e}"]`);
		if (!n) return;
		let r = [];
		try {
			r = JSON.parse(n.dataset.stickers || "[]");
		} catch {}
		if (r.length === 0) {
			t.innerHTML = "<div style=\"color:#94a3b8; font-size:0.9rem; font-style:italic;\">Стикеры пока не добавлены.</div>";
			return;
		}
		r.forEach((i, a) => {
			let o = document.createElement("div");
			o.style.cssText = `background:${i.color || "#fff9c4"}; padding:10px; border-radius:6px; margin-bottom:8px; display:flex; justify-content:space-between; align-items:flex-start; box-shadow:0 1px 2px rgba(0,0,0,0.05);`, o.innerHTML = `
                <div>
                    <div style="font-weight:bold; font-size:0.85rem; margin-bottom:4px; color:#334155;">${i.title || "Примечание"}</div>
                    <div style="font-size:0.9rem; color:#1e293b; white-space:pre-wrap;">${i.text}</div>
                </div>
                <button type="button" class="btn-del-st" style="background:none; border:none; cursor:pointer; color:#ef4444; font-weight:bold; padding:0 4px;" title="Удалить">&times;</button>
            `, o.querySelector(".btn-del-st").onclick = () => {
				r.splice(a, 1), n.dataset.stickers = JSON.stringify(r), this.renderStickersForBlock(n), this.renderStickersListInModal(e), this.saveGlobal(!1, "toast.dialectics_updated");
			}, t.appendChild(o);
		});
	}
	renderStickersForBlock(e) {
		let t = [];
		try {
			t = JSON.parse(e.dataset.stickers || "[]");
		} catch {}
		let n = e.querySelector(".dialectics-stickers-container"), r = e.querySelector(".btn-block-stickers");
		if (r && (r.innerHTML = `🏷️${t.length > 0 ? `<span style="font-size:0.7rem; font-weight:bold; background:#e2e8f0; border-radius:10px; padding:2px 5px; margin-left:4px; color:#334155;">${t.length}</span>` : ""}`), n) {
			if (n.innerHTML = "", t.length === 0) {
				n.style.display = "none";
				return;
			}
			n.style.display = "flex", n.style.flexWrap = "wrap", n.style.gap = "8px", t.forEach((e) => {
				let t = document.createElement("div");
				t.style.cssText = `background:${e.color || "#fff9c4"}; padding:6px 10px; border-radius:6px; font-size:0.85rem; box-shadow:0 1px 2px rgba(0,0,0,0.05); border:1px solid rgba(0,0,0,0.05); max-width:100%;`, t.innerHTML = `<strong style="display:block; font-size:0.75rem; color:#64748b; margin-bottom:2px;">${e.title || "Примечание"}:</strong><span style="color:#1e293b; white-space:pre-wrap;">${e.text}</span>`, n.appendChild(t);
			});
		}
	}
	initHintEvents() {
		document.querySelectorAll(".dialectics-hint-block").forEach((e) => {
			let t = e.querySelector(".btn-hint-ai");
			t && (t.onclick = (t) => {
				t.stopPropagation(), this.runHintAI({
					id: e.dataset.stepId || e.dataset.id,
					side: e.dataset.side
				});
			}), e.onclick = () => {
				this.openHintEditor({
					id: e.dataset.stepId || e.dataset.id,
					side: e.dataset.side
				});
			};
		});
	}
	bindEvents() {
		this.dom.btnSave && (this.dom.btnSave.onclick = () => this.save()), this.dom.btnCancel && (this.dom.btnCancel.onclick = () => this.close()), this.dom.btnClose && (this.dom.btnClose.onclick = () => this.close()), document.addEventListener("click", (e) => {
			let t = e.target.closest(".dialectics-hint-badge");
			if (t) {
				e.preventDefault(), e.stopPropagation();
				let n = t.closest(".dialectics-hint-block");
				n && this.openHintEditor({
					id: n.dataset.stepId || n.dataset.id,
					side: n.dataset.side
				});
				return;
			}
			let n = e.target.closest(".btn-hint-ai");
			if (n) {
				e.preventDefault(), e.stopPropagation();
				let t = n.closest(".dialectics-hint-block");
				t && this.runHintAI({
					id: t.dataset.stepId || t.dataset.id,
					side: t.dataset.side
				});
				return;
			}
		}), window.BlockManager && window.BlockManager.setCallbacks({
			onEdit: (e) => this.openEdit(e),
			onDelete: async () => {
				await this.saveGlobal(!1, "toast.dialectics_updated");
				let e = La.getBlocks(this.dom.canvas);
				La.render(this.dom.canvas, e, this._blockCallbacks());
			},
			onHintClick: (e) => this.openHintEditor(e),
			onHintAI: (e) => e && e.id === "step3" ? this.runAI(this.dom.canvas) : this.runHintAI(e),
			onHacks: (e) => this.openHacksPopover(e)
		});
	}
	openHintEditor(e, t = "", n = null) {
		this.state.editingBlock = null, this.state.pendingSide = e.side, this.state.pendingRole = e.id, this.state.pendingBlockId = "block_" + Math.random().toString(36).substr(2, 9), this.state.insertAfterIndex = null;
		let r = document.getElementById("editorBlockTitleInput");
		r && (r.value = ""), this.open(t);
		let i = document.getElementById("tab-ai");
		if (n) {
			i && (i.style.display = "flex");
			let e = document.getElementById("aiHelpContent");
			e && (e.innerHTML = n);
			let t = document.getElementById("btnCopyAiToText");
			t && (t.onclick = () => {
				this.editor.setContent(n), this.editor.switchTab("text"), window.showToast && window.showToast(window._("dialectics.ai_transferred", "Текст от ИИ перенесен в редактор"), "success");
			}), this.editor.switchTab("ai");
		} else i && (i.style.display = "none");
	}
	toggleExpand() {
		this.state.isExpanded = !this.state.isExpanded, this.dom.editor && (this.dom.editor.classList.toggle("expanded", this.state.isExpanded), this.dom.backdrop && n.toggleDisplay(this.dom.backdrop, this.state.isExpanded)), setTimeout(() => {
			let e = document.getElementById("shapesCanvasWrapper"), t = this.editor && this.editor.fabricCanvas;
			if (e && t) {
				let n = e.clientWidth, r = e.clientHeight;
				n > 10 && r > 10 && (t.setWidth(n), t.setHeight(r), t.calcOffset(), t.renderAll());
			}
		}, 320);
	}
	_blockCallbacks() {
		return {
			onEdit: (e) => {
				if (e.classList.contains("block-section") || e.dataset.isSection === "true") {
					this.openSectionTitleModal(null, e);
					return;
				}
				this.state.editingBlock = e, this.openEdit(e);
			},
			onInsertAfter: (e, t) => {
				this.openInsertAfter(e, t);
			},
			onDelete: async () => {
				await this.saveGlobal(!1, "toast.dialectics_updated");
				let e = La.getBlocks(this.dom.canvas);
				La.render(this.dom.canvas, e, this._blockCallbacks());
			},
			onAI: (e) => {
				this.runAI(e);
			},
			onSources: (e) => {
				this.openSourcesModal(e);
			},
			onWords: (e) => {
				this.openWordsModal(e);
			},
			onColor: (e) => {
				this.openColorModal(e);
			},
			onHintClick: (e) => {
				this.openHintEditor(e);
			},
			onHintAI: (e) => {
				e && e.id === "step3" ? this.runAI(this.dom.canvas) : this.runHintAI(e);
			},
			onFoldToggle: () => {
				this.saveGlobal(!1, "toast.dialectics_updated");
			},
			onHacks: (e) => {
				this.openHacksPopover(e);
			}
		};
	}
	openSourcesModal(e) {
		let t = document.getElementById("blockSourcesModal"), n = document.getElementById("sourcesList"), r = document.getElementById("sourceUrl"), i = document.getElementById("sourceTitle"), a = document.getElementById("sourceQuote"), o = document.getElementById("btnAddSource");
		if (!t || !n) return;
		let s = [];
		try {
			e.dataset.sources && (s = JSON.parse(e.dataset.sources));
		} catch {}
		let c = () => {
			if (n.innerHTML = "", s.length === 0) {
				n.innerHTML = "<div style=\"color:#94a3b8; font-size:0.9rem; font-style:italic;\">Источники пока не добавлены.</div>";
				return;
			}
			s.forEach((e, t) => {
				let r = document.createElement("div");
				r.style.cssText = "background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:10px 14px; display:flex; justify-content:space-between; align-items:flex-start; gap:12px;";
				let i = e.title || e.url;
				i = e.url ? `<a href="${e.url.startsWith("http") ? e.url : "https://" + e.url}" target="_blank" rel="noopener noreferrer" style="color:#2563eb; font-weight:600; text-decoration:none;">${e.title || e.url}</a>` : `<span style="font-weight:600; color:#1e293b;">${e.title}</span>`;
				let a = "";
				e.quote && (a = `<div style="font-size:0.85rem; color:#475569; margin-top:4px; white-space:pre-wrap;">${e.quote}</div>`), r.innerHTML = `
                    <div style="flex-grow:1; overflow:hidden;">
                        ${i}
                        ${a}
                    </div>
                    <button type="button" class="btn-del-src" style="background:none; border:none; cursor:pointer; color:#ef4444; font-size:1.2rem; padding:0 4px; line-height:1;" title="Удалить">&times;</button>
                `, r.querySelector(".btn-del-src").onclick = () => {
					s.splice(t, 1), l(), c();
				}, n.appendChild(r);
			});
		}, l = () => {
			e.dataset.sources = JSON.stringify(s);
			let t = e.querySelector(".btn-block-sources");
			t && (t.innerHTML = `🔗${s.length > 0 ? `<span style="font-size:0.7rem; font-weight:bold; background:#e2e8f0; border-radius:10px; padding:2px 5px; margin-left:4px; color:#334155;">${s.length}</span>` : ""}`), this.saveGlobal(!1, "toast.dialectics_updated");
		};
		o.onclick = () => {
			let e = r ? r.value.trim() : "", t = i ? i.value.trim() : "", n = a ? a.value.trim() : "";
			if (!e && !t && !n) {
				window.showToast && window.showToast("Введите информацию об источнике", "warning");
				return;
			}
			s.push({
				url: e,
				title: t,
				quote: n
			}), r && (r.value = ""), i && (i.value = ""), a && (a.value = ""), l(), c();
		}, c(), t.style.display = "flex";
	}
	openWordsModal(e) {
		let t = document.getElementById("blockWordsModal"), n = document.getElementById("wordsList"), r = document.getElementById("wordTerm"), i = document.getElementById("wordDefinition"), a = document.getElementById("wordConnections"), o = document.getElementById("btnAddWord");
		if (!t || !n) return;
		let s = [];
		try {
			e.dataset.words && (s = JSON.parse(e.dataset.words));
		} catch {}
		let c = () => {
			if (n.innerHTML = "", s.length === 0) {
				n.innerHTML = "<div style=\"color:#94a3b8; font-size:0.9rem; font-style:italic;\">Словарь блока пуст.</div>";
				return;
			}
			s.forEach((e, t) => {
				let r = document.createElement("div");
				r.style.cssText = "background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:10px 14px; display:flex; justify-content:space-between; align-items:flex-start; gap:12px; margin-bottom: 8px;";
				let i = "";
				e.connections && (i = `<div style="font-size:0.8rem; color:#64748b; margin-top:4px;"><b>Связи:</b> ${e.connections}</div>`), r.innerHTML = `
                    <div style="flex-grow:1; overflow:hidden;">
                        <span style="font-weight:600; color:#1e40af;">📖 ${e.word}</span>
                        <div style="font-size:0.85rem; color:#475569; margin-top:4px; white-space:pre-wrap;">${e.definition}</div>
                        ${i}
                    </div>
                    <button type="button" class="btn-del-word" style="background:none; border:none; cursor:pointer; color:#ef4444; font-size:1.2rem; padding:0 4px; line-height:1;" title="Удалить">&times;</button>
                `, r.querySelector(".btn-del-word").onclick = () => {
					s.splice(t, 1), l(), c();
				}, n.appendChild(r);
			});
		}, l = () => {
			e.dataset.words = JSON.stringify(s);
			let t = e.querySelector(".btn-block-words");
			t && (t.innerHTML = `📖${s.length > 0 ? `<span style="font-size:0.7rem; font-weight:bold; background:#e2e8f0; border-radius:10px; padding:2px 5px; margin-left:4px; color:#334155;">${s.length}</span>` : ""}`), this.saveGlobal(!1, "toast.dialectics_updated");
			let n = La.getBlocks(this.dom.canvas);
			La.render(this.dom.canvas, n, this._blockCallbacks());
		};
		o.onclick = () => {
			let e = r ? r.value.trim() : "", t = i ? i.value.trim() : "", n = a ? a.value.trim() : "";
			if (!e || !t) {
				window.showToast && window.showToast("Введите понятие и его объяснение", "warning");
				return;
			}
			if (s.some((t) => t.word.toLowerCase() === e.toLowerCase())) {
				window.showToast && window.showToast("Это слово уже есть в словаре блока", "warning");
				return;
			}
			s.push({
				word: e,
				definition: t,
				connections: n
			}), r && (r.value = ""), i && (i.value = ""), a && (a.value = ""), l(), c();
		}, c(), t.style.display = "flex";
	}
	async openColorModal(e) {
		let t = e.dataset.color || "", n = await i({
			title: "Цвет блока",
			options: [
				{
					label: "⚪ По умолчанию",
					value: "default",
					checked: !t
				},
				{
					label: "🔵 Синий",
					value: "blue",
					checked: t === "blue"
				},
				{
					label: "🟢 Зеленый",
					value: "green",
					checked: t === "green"
				},
				{
					label: "🔴 Красный",
					value: "red",
					checked: t === "red"
				},
				{
					label: "🟡 Желтый",
					value: "yellow",
					checked: t === "yellow"
				},
				{
					label: "🟣 Фиолетовый",
					value: "purple",
					checked: t === "purple"
				}
			],
			okLabel: "Выбрать",
			cancelLabel: "Отмена"
		});
		if (n != null) {
			let t = n === "default" ? "" : n;
			if (t) {
				e.dataset.color = t;
				let n = Ia[t];
				n && (e.style.setProperty("--block-custom-bg", n.bg), e.style.setProperty("--block-custom-accent", n.accent));
			} else delete e.dataset.color, e.style.removeProperty("--block-custom-bg"), e.style.removeProperty("--block-custom-accent");
			await this.saveGlobal(!1, "toast.dialectics_updated");
			let r = La.getBlocks(this.dom.canvas);
			La.render(this.dom.canvas, r, this._blockCallbacks());
		}
	}
	addSectionBlock() {
		this.openSectionTitleModal(-1);
	}
	openSectionTitleModal(e = null, t = null) {
		this.state.pendingSectionIndex = e, this.state.editingSectionBlock = t;
		let n = document.getElementById("sectionTitleModal"), r = document.getElementById("sectionTitleInputField");
		if (!(!n || !r)) {
			if (t) {
				let e = t.dataset.title;
				if (!e) {
					let n = t.querySelector(".dialectics-block-header span:nth-child(2)");
					e = n ? n.innerText : "Раздел";
				}
				r.value = e || "";
			} else r.value = "";
			n.style.display = "flex", setTimeout(() => r.focus(), 50);
		}
	}
	closeSectionTitleModal() {
		let e = document.getElementById("sectionTitleModal");
		e && (e.style.display = "none"), this.state.pendingSectionIndex = null, this.state.editingSectionBlock = null;
	}
	saveSectionTitle() {
		let e = document.getElementById("sectionTitleInputField");
		if (!e || !this.dom.canvas) return;
		let t = e.value.trim() || "Раздел";
		if (this.state.editingSectionBlock) {
			this.state.editingSectionBlock.dataset.title = t;
			let e = this.state.editingSectionBlock.querySelector(".block-title-text");
			e && (e.innerText = t);
			let n = this.state.editingSectionBlock.querySelector(".dialectics-content-inner");
			n && (n.innerHTML = `<p>${t}</p>`);
			let r = La.getBlocks(this.dom.canvas);
			La.render(this.dom.canvas, r, this._blockCallbacks()), this.saveGlobal(!1, "toast.dialectics_updated");
		} else {
			let e = La.getBlocks(this.dom.canvas), n = {
				id: "block_" + Math.random().toString(36).substr(2, 9),
				side: "section",
				isSection: !0,
				title: t,
				html: `<p>${t}</p>`
			};
			this.state.pendingSectionIndex !== null && this.state.pendingSectionIndex !== void 0 && this.state.pendingSectionIndex >= 0 ? this.state.pendingSectionIndex < e.length ? e.splice(this.state.pendingSectionIndex + 1, 0, n) : e.push(n) : this.state.pendingSectionIndex === -1 ? e.unshift(n) : e.push(n), La.render(this.dom.canvas, e, this._blockCallbacks()), this.saveGlobal(!1, "toast.dialectics_updated");
		}
		this.closeSectionTitleModal();
	}
	toggleTableOfContents(e) {
		e && e.stopPropagation();
		let t = document.getElementById("tableOfContentsMenu");
		if (t) if (t.style.display === "none" || !t.style.display) {
			this.updateTableOfContents(), t.style.display = "block";
			let e = (n) => {
				!t.contains(n.target) && n.target.id !== "btnToggleTOC" && (t.style.display = "none", document.removeEventListener("click", e));
			};
			setTimeout(() => document.addEventListener("click", e), 10);
		} else t.style.display = "none";
	}
	updateTableOfContents() {
		let e = document.getElementById("tableOfContentsList");
		if (!e || !this.dom.canvas) return;
		let t = Array.from(this.dom.canvas.querySelectorAll(".dialectics-block"));
		if (e.innerHTML = "", t.length === 0) {
			e.innerHTML = "<div style=\"padding: 12px; color: #94a3b8; font-size: 0.85rem; text-align: center;\">В конспекте пока нет блоков и разделов.</div>";
			return;
		}
		t.forEach((t, n) => {
			let r = t.classList.contains("block-section") || t.dataset.isSection === "true", i = t.dataset.title;
			if (!i) {
				let e = t.querySelector(".dialectics-block-header span:first-child");
				i = e ? e.innerText : r ? "Раздел" : `Блок ${n + 1}`;
			}
			let a = document.createElement("div");
			a.style.cssText = `
                display: flex; align-items: center; gap: 8px; padding: 8px 12px; 
                border-radius: 8px; cursor: pointer; transition: background 0.15s;
                font-size: ${r ? "0.9rem" : "0.8rem"};
                font-weight: ${r ? "700" : "500"};
                color: ${r ? "#ea580c" : "#334155"};
                background: ${r ? "#fff7ed" : "transparent"};
                border-left: ${r ? "4px solid #ea580c" : "2px solid transparent"};
            `, a.onmouseover = () => a.style.background = r ? "#ffedd5" : "#f8fafc", a.onmouseout = () => a.style.background = r ? "#fff7ed" : "transparent", a.innerHTML = `<span>${r ? "📑" : t.classList.contains("block-left") ? "▫️" : "▪️"}</span><span style="flex-grow:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${i}</span>`, a.onclick = () => {
				document.getElementById("tableOfContentsMenu").style.display = "none", t.scrollIntoView({
					behavior: "smooth",
					block: "center"
				}), t.style.transition = "box-shadow 0.5s ease";
				let e = t.style.boxShadow;
				t.style.boxShadow = "0 0 0 4px #ea580c", setTimeout(() => {
					t.style.boxShadow = e;
				}, 1500);
			}, e.appendChild(a);
		});
	}
	openHacksPopover(e) {
		let t = document.getElementById("dialecticsHacksPopover");
		if (t) {
			let n = t.dataset.blockId === (e.dataset.blockId || "");
			if (t.remove(), n) return;
		}
		let n = document.createElement("div");
		if (n.id = "dialecticsHacksPopover", n.dataset.blockId = e.dataset.blockId || "", n.style.cssText = "\n            position: fixed;\n            z-index: 999999;\n            width: 350px;\n            max-height: 440px;\n            background: #ffffff;\n            border: 1px solid #cbd5e1;\n            border-radius: 12px;\n            box-shadow: 0 14px 30px -5px rgba(15, 23, 42, 0.15), 0 8px 15px -6px rgba(15, 23, 42, 0.1);\n            display: flex;\n            flex-direction: column;\n            overflow: hidden;\n            animation: hacksPopoverFadeIn 0.18s ease-out;\n        ", !document.getElementById("hacksPopoverStyles")) {
			let e = document.createElement("style");
			e.id = "hacksPopoverStyles", e.textContent = "\n                @keyframes hacksPopoverFadeIn {\n                    from { opacity: 0; transform: translateY(-6px) scale(0.97); }\n                    to { opacity: 1; transform: translateY(0) scale(1); }\n                }\n            ", document.head.appendChild(e);
		}
		let r = e.querySelector(".btn-block-hacks"), i = r ? r.getBoundingClientRect() : e.getBoundingClientRect(), a = i.right - 350;
		a < 10 && (a = i.left);
		let o = i.bottom + 8;
		o + 440 > window.innerHeight && (o = Math.max(10, i.top - 448)), n.style.left = `${a}px`, n.style.top = `${o}px`;
		let s = window._ ? window._("dialectics.hacks_title", "Хаки понимания") : "Хаки понимания", c = window._ ? window._("dialectics.hack_copy_hint", "Нажмите на карточку, чтобы скопировать совет") : "Нажмите на карточку, чтобы скопировать совет", l = window._ ? window._("dialectics.hack_copied", "Совет скопирован в буфер обмена") : "Совет скопирован в буфер обмена", u = [{
			title: window._ ? window._("dialectics.hack_1_title", "Количественный подход к формуле") : "Количественный подход к формуле",
			text: window._ ? window._("dialectics.hack_1_text", "Если сразу сложно понять формулу, то сначала изучите ее количественно, сведите к суммированию, а затем уже изучите качественно.") : "Если сразу сложно понять формулу, то сначала изучите ее количественно, сведите к суммированию, а затем уже изучите качественно.",
			tag: "📊 Базовый"
		}], d = "";
		u.forEach((e, t) => {
			d += `
                <div class="hack-card-item" data-idx="${t}" style="background: #ffffff; border: 1px solid #e2e8f0; border-left: 3.5px solid #3b82f6; border-radius: 10px; padding: 12px; cursor: pointer; box-shadow: 0 2px 4px rgba(0,0,0,0.02); transition: transform 0.15s, box-shadow 0.15s;">
                    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px;">
                        <span style="font-weight: 600; font-size: 0.88rem; color: #0f172a;">${e.title}</span>
                        <span style="font-size: 0.72rem; font-weight: 600; background: #eff6ff; color: #2563eb; padding: 2px 6px; border-radius: 6px;">${e.tag}</span>
                    </div>
                    <div style="font-size: 0.82rem; color: #475569; line-height: 1.45;">
                        ${e.text}
                    </div>
                </div>
            `;
		}), n.innerHTML = `
            <div style="display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%); border-bottom: 1px solid #e2e8f0;">
                <div style="display: flex; align-items: center; gap: 8px; font-weight: 700; font-size: 0.92rem; color: #1e293b;">
                    <span>💡</span>
                    <span>${s}</span>
                </div>
                <button class="hacks-popover-close" style="background: transparent; border: none; font-size: 1.1rem; color: #64748b; cursor: pointer; padding: 2px 6px; border-radius: 6px;">✕</button>
            </div>
            <div style="padding: 14px; overflow-y: auto; display: flex; flex-direction: column; gap: 10px;">
                ${d}
            </div>
            <div style="font-size:0.72rem; color:#94a3b8; text-align:center; padding: 6px 12px 10px 12px; border-top: 1px solid #f1f5f9; background: #f8fafc;">
                ${c}
            </div>
        `, document.body.appendChild(n), n.querySelectorAll(".hack-card-item").forEach((e) => {
			e.onmouseenter = () => {
				e.style.transform = "translateY(-1px)", e.style.boxShadow = "0 4px 8px rgba(0,0,0,0.05)";
			}, e.onmouseleave = () => {
				e.style.transform = "none", e.style.boxShadow = "0 2px 4px rgba(0,0,0,0.02)";
			}, e.onclick = (t) => {
				t.stopPropagation();
				let n = u[parseInt(e.dataset.idx)];
				navigator.clipboard.writeText(n.title + ": " + n.text), window.showToast && window.showToast(l, "success");
			};
		}), setTimeout(() => {
			let e = (t) => {
				!n.contains(t.target) && t.target !== r && !(r && r.contains(t.target)) && (n.remove(), document.removeEventListener("click", e));
			};
			document.addEventListener("click", e);
			let t = n.querySelector(".hacks-popover-close");
			t && (t.onclick = () => {
				n.remove(), document.removeEventListener("click", e);
			});
		}, 10);
	}
}, Hv = {};
Object.getOwnPropertyNames(Vv.prototype).forEach((e) => {
	e !== "constructor" && (Hv[e] = Vv.prototype[e]);
});
//#endregion
//#region fastapi_app/static/js/dialectics.js
var Uv = class {
	constructor() {
		window.showToast = window.showToast || ((e) => console.log("Toast:", e)), this.state = {
			currentNoteId: null,
			noteHistory: [],
			pendingSide: null,
			isExpanded: !1,
			editingBlock: null,
			notesList: [],
			viewingNoteId: null,
			insertAfterIndex: null,
			categories: [],
			blockStickersCount: {}
		}, this.dom = {
			canvas: document.getElementById("dialecticsCanvas"),
			editor: document.getElementById("inlineEditor"),
			title: document.getElementById("globalDialecticsTitle"),
			deleteBtn: document.getElementById("btnDeleteDialectics"),
			backdrop: document.getElementById("expandedBackdrop"),
			dragHandle: document.getElementById("editorDragHandle"),
			loadModal: document.getElementById("loadDialecticsModal"),
			loadList: document.getElementById("loadDialecticsList"),
			guideModal: document.getElementById("guideDialecticsModal"),
			guideContent: document.getElementById("dialecticsGuideContent"),
			viewModal: document.getElementById("dialecticsViewModal"),
			viewTitle: document.getElementById("dialecticsViewTitle"),
			viewBody: document.getElementById("dialecticsViewBody"),
			debug: document.getElementById("debugLogContent"),
			dashboardTextarea: document.getElementById("dashboard-note-editor"),
			connectionsModal: document.getElementById("dialectics-connections-modal"),
			categorySelect: document.getElementById("dialecticsCategorySelect"),
			connCategoriesList: document.getElementById("connections-categories-list"),
			connResultsContainer: document.getElementById("connections-results-container"),
			newCategoryInput: document.getElementById("new-category-input")
		}, this.editor = new Fv(this), this.dom.editor && this.init();
	}
	async init() {
		if (this.logDebug("Engine init..."), this._bindEvents(), await this.loadCategories(), this.dom.editor.classList.contains("embedded") && this.dom.dashboardTextarea) this.setupDashboardTextarea(), this._revealInterface();
		else {
			let e = new URLSearchParams(window.location.search).get("id");
			if (!e && (e = localStorage.getItem("dialectics_last_note_id"), e)) {
				let t = new URL(window.location);
				t.searchParams.set("id", e), window.history.replaceState({}, "", t);
			}
			e ? await this.loadNoteToEditor(e, !1) : (this.state.currentNoteId = null, this.dom.title && (this.dom.title.value = ""), this.dom.categorySelect && (this.dom.categorySelect.value = ""), this.dom.canvas && La.render(this.dom.canvas, [], this._blockCallbacks()), this.dom.deleteBtn && (this.dom.deleteBtn.style.display = "none"), this._revealInterface());
		}
		await this.editor.switchTab("text");
		try {
			let e = JSON.parse(localStorage.getItem("papanda_editor_open_state") || "null");
			e && e.isOpen && this.open(e.content || "");
		} catch {}
	}
	_revealInterface() {
		let e = document.querySelector(".note-interface");
		e && (e.style.opacity = "1");
	}
	_bindEvents() {
		n.setupDraggable(this.dom.editor, this.dom.dragHandle, this.state), n.setupResizable(this.dom.editor, document.getElementById("editorResizeHandle"));
		let e = (e, t) => document.getElementById(e)?.addEventListener("click", t.bind(this));
		e("btnDeleteDialectics", this.deleteGlobal), e("btnSaveDialectics", this.saveGlobal), e("btnMathFormula", () => this.editor.showMathMenu()), this.dom.editor.classList.contains("embedded") ? (this.logDebug("Binding embedded editor save"), e("btnEditorSave", this.saveAndPin)) : (this.logDebug("Binding global save"), e("btnEditorSave", this.saveGlobal)), this.logDebug("Binding other buttons"), e("btnPinNote", this.pinCurrent), e("btnEditorClose", this.close), e("btnEditorExpand", this.toggleExpand), this.logDebug("Binding btnLoadDialectics..."), e("btnLoadDialectics", async (e) => {
			this.logDebug("btnLoadDialectics CLICKED!"), e.preventDefault(), e.stopPropagation();
			try {
				if (this.logDebug("isDirty = " + this.state.isDirty), this.state.isDirty) {
					this.logDebug("Showing customConfirm for unsaved changes...");
					let e = await r({
						title: window._ ? window._("dialectics.unsaved_title") : "Внимание",
						message: window._ ? window._("dialectics.unsaved_msg") : "Есть несохранённые изменения. Продолжить?",
						icon: "⚠️",
						buttons: [{
							label: window._ ? window._("dialectics.cancel") : "Отмена",
							value: !1,
							class: "confirm-btn-secondary"
						}, {
							label: window._ ? window._("dialectics.continue_btn") : "Продолжить",
							value: !0,
							class: "confirm-btn-primary"
						}]
					});
					if (this.logDebug("customConfirm resolved: " + e), e) {
						this.state.isDirty = !1, this.showLoadModal();
						let e = document.getElementById("dialecticsSearchInput");
						e && (e.value = "", e.focus());
					}
				} else {
					this.logDebug("No unsaved changes. Opening modal directly."), this.showLoadModal();
					let e = document.getElementById("dialecticsSearchInput");
					e && (e.value = "", e.focus());
				}
			} catch (e) {
				this.logDebug("ERROR in open button: " + e.message), alert("Error in open button: " + e.message);
			}
		}), this.logDebug("Binding btnLoadDialectics COMPLETED.");
		let t = document.getElementById("dialecticsSearchInput");
		t && t.addEventListener("input", (e) => this.searchNotes(e.target.value)), e("btnNewDialectics", this.createNewNote), e("btnGlobalParser", this.runGlobalParser), e("btnExampleDialectics", this.loadExample), e("btnPrevDialectics", this.loadPreviousNote), e("btnDialecticsReference", this.showReferenceModal), e("btnDialecticsGuide", this.showGuideModal), e("btnDialecticsConnections", this.showConnectionsModal), e("close-connections-btn", () => {
			this.dom.connectionsModal && (this.dom.connectionsModal.style.display = "none");
		}), e("add-category-btn", this.addCategory);
		let i = document.getElementById("connections-search-input");
		i && i.addEventListener("input", (e) => this.searchConnections(e.target.value)), this.dom.categorySelect && this.dom.categorySelect.addEventListener("change", async (e) => {
			if (e.target.value === "__add_new__") {
				e.target.value = "";
				let t = await a({
					title: "Новая категория",
					message: "Введите название новой категории:",
					placeholder: "Например: Физика, Идеи..."
				});
				t && t.trim() && await this.createNewCategory(t.trim());
			}
		}), e("btnViewModalEdit", () => {
			this.hideViewModal(), this.loadNoteToEditor(this.state.viewingNoteId);
		}), Ra.init(this.dom.canvas, {
			onClick: (e, t) => {
				let n = e < t ? "left" : "right";
				this.state.editingBlock = null, this.state.pendingSide = n, this.state.pendingBlockId = "block_" + Math.random().toString(36).substr(2, 9), this.state.pendingRole = null;
				let r = La.getBlocks(this.dom.canvas).some((e) => e.role === "anchor");
				n === "left" && !r && (this.state.pendingRole = "anchor"), this.open();
			},
			onDoubleClick: (e) => {
				this.state.editingBlock = e, this.openEdit(e);
			}
		}), document.querySelectorAll(".editor-tab").forEach((e) => {
			e.addEventListener("click", () => this.editor.switchTab(e.dataset.tab));
		}), e("btnGraphPlot", () => this.editor.plotGraph()), e("btnGraphInsert", () => this.editor.insertGraphToNote()), e("btnShapeUndo", () => this.editor.undoShape()), e("btnShapeDelete", () => this.editor.deleteSelectedShape()), e("btnShapeGrid", () => this.editor.toggleShapeGrid()), e("btnShapeCopy", () => this.editor.copySelectedShape()), e("btnShapeClear", () => this.editor.clearShapes()), e("btnShapesInsert", () => this.editor.insertShapesToNote()), e("btnShapeGroup", () => this.editor.groupSelected()), e("btnObjectList", () => this.editor.toggleObjectListPanel()), this.setupExplainTooltip(), document.querySelectorAll(".shape-tool[data-tool]").forEach((e) => {
			e.addEventListener("click", () => this.editor.setShapeTool(e.dataset.tool));
		}), document.querySelectorAll(".shape-tool[data-shape]").forEach((e) => {
			e.addEventListener("click", () => this.editor.addShape(e.dataset.shape));
		});
		let o = document.getElementById("shapeColor");
		o && o.addEventListener("input", (e) => {
			this.editor.applyColorToSelected(e.target.value);
		});
		let s = document.getElementById("shapeFillColor");
		if (s && s.addEventListener("input", (e) => {
			this.editor.applyFillToSelected(e.target.value + "33");
		}), e("btnToggleFill", () => this.editor.toggleFillForSelected()), window.addEventListener("stickersUpdated", async (e) => {
			let { parentType: t, parentId: n } = e.detail || {};
			if (t === "dialectics" && Number(n) === Number(this.state.currentNoteId)) {
				let e = {};
				try {
					let t = await fetch(`/api/stickers/dialectics/${this.state.currentNoteId}/`).then((e) => e.json());
					Array.isArray(t) && t.forEach((t) => {
						t.dialectics_block_id && (e[t.dialectics_block_id] = (e[t.dialectics_block_id] || 0) + 1);
					});
				} catch (e) {
					console.error("Failed to refresh block stickers:", e);
				}
				this.state.blockStickersCount = e;
				let t = La.getBlocks(this.dom.canvas);
				La.render(this.dom.canvas, t, this._blockCallbacks());
			}
		}), this.dom.canvas) {
			let e = null;
			this.dom.canvas.addEventListener("dragstart", (t) => {
				let n = t.target.closest(".dialectics-block");
				if (!n || n._preventDrag || n.getAttribute("draggable") !== "true") {
					t.preventDefault();
					return;
				}
				e = n, n.classList.add("is-dragging"), this.dom.canvas.classList.add("is-dragging-active"), t.dataTransfer && (t.dataTransfer.effectAllowed = "move", t.dataTransfer.setData("text/plain", n.dataset.blockId || ""));
			}), this.dom.canvas.addEventListener("drop", (e) => {
				e.preventDefault();
			}), this.dom.canvas.addEventListener("dragover", (t) => {
				if (t.preventDefault(), !e) return;
				let n = t.target.closest(".dialectics-block");
				if (!n || n === e) return;
				let r = n.getBoundingClientRect(), i = r.top + r.height / 2;
				t.clientY < i ? this.dom.canvas.insertBefore(e, n) : this.dom.canvas.insertBefore(e, n.nextSibling);
			}), this.dom.canvas.addEventListener("dragend", async (t) => {
				e && (e.classList.remove("is-dragging"), e.setAttribute("draggable", "false")), this.dom.canvas.classList.remove("is-dragging-active"), e = null;
				let n = La.getBlocks(this.dom.canvas);
				La.render(this.dom.canvas, n, this._blockCallbacks()), await this.saveGlobal(!1, "toast.dialectics_updated");
			});
		}
	}
	_renderMarkdown(e) {
		return e.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>").replace(/\*(.+?)\*/g, "<em>$1</em>").replace(/\n\n/g, "</p><p>").replace(/\n/g, "<br>").replace(/^/, "<p>").replace(/$/, "</p>");
	}
	setupExplainTooltip() {
		let e = document.createElement("div");
		e.className = "dialectics-context-menu", e.style.display = "none";
		let t = document.createElement("div");
		t.className = "dialectics-context-menu-item", t.innerHTML = "Что это?", e.appendChild(t), document.body.appendChild(e);
		let n = "", r = (e) => e.closest(".dialectics-content-inner") || e.closest(".tiptap-editor") || e.closest(".ProseMirror") || e.closest("#inlineEditor");
		document.addEventListener("contextmenu", (t) => {
			let i = window.getSelection();
			if (!i || !i.rangeCount || i.isCollapsed) {
				e.style.display = "none";
				return;
			}
			let a = i.getRangeAt(0).commonAncestorContainer;
			if (!r(a.nodeType === 3 ? a.parentElement : a)) {
				e.style.display = "none";
				return;
			}
			if (n = i.toString().trim(), !n) {
				e.style.display = "none";
				return;
			}
			t.preventDefault(), e.style.display = "block";
			let o = t.pageX, s = t.pageY;
			o + 160 > window.innerWidth && (o = window.innerWidth - 160), s + 50 > window.innerHeight + window.scrollY && (s = t.pageY - 50), e.style.left = `${o}px`, e.style.top = `${s}px`;
		}, !0), document.addEventListener("click", (t) => {
			e.contains(t.target) || (e.style.display = "none");
		}), document.addEventListener("keydown", (t) => {
			t.key === "Escape" && (e.style.display = "none");
		}), t.addEventListener("click", async (t) => {
			if (t.stopPropagation(), !n) return;
			e.style.display = "none";
			let r = document.getElementById("explainConceptModal"), i = document.getElementById("explainConceptTitle"), a = document.getElementById("explainConceptBody");
			if (!(!r || !a)) {
				i.innerText = `Что это: "${n}"?`, a.innerHTML = "<div style=\"text-align:center; padding:40px; color:#94a3b8;\"><div style=\"font-size:2rem; margin-bottom:12px;\">⏳</div><div>Анализирую концепт...</div></div>", r.style.display = "flex";
				try {
					let e = await fetch("/api/ai/dialectics/explain-concept", {
						method: "POST",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify({ text: n })
					});
					if (!e.ok) throw Error(`HTTP ${e.status}`);
					let t = await e.json();
					a.innerHTML = this._renderMarkdown(t.result);
				} catch (e) {
					a.innerHTML = `<div style="color:#ef4444;">Ошибка: ${e.message}</div>`;
				}
				window.getSelection()?.removeAllRanges();
			}
		});
	}
	logDebug(e) {
		if (!this.dom.debug) return;
		let t = document.createElement("div");
		t.textContent = `[${(/* @__PURE__ */ new Date()).toLocaleTimeString()}] ${e}`, this.dom.debug.prepend(t);
	}
	showWordDefinition(e) {
		let t = La.getBlocks(document.getElementById("dialecticsCanvas")), n = null, r = null;
		for (let i of t) if (i.words) {
			let t = i.words.find((t) => t.word.toLowerCase() === e.toLowerCase());
			if (t) {
				n = t, r = i.id;
				break;
			}
		}
		if (!n) {
			window.showToast && window.showToast("Слово не найдено в словаре этого конспекта", "warning");
			return;
		}
		let i = document.getElementById("explainConceptModal"), a = document.getElementById("explainConceptTitle"), o = document.getElementById("explainConceptBody");
		if (!i || !o) return;
		a.innerText = `📖 ${n.word}`;
		let s = "";
		if (n.connections) {
			let e = n.connections.split(",").map((e) => e.trim()).filter(Boolean);
			e.length > 0 && (s = "<div style=\"margin-top: 16px; padding-top: 12px; border-top: 1px dashed #e2e8f0;\">\n                    <strong style=\"color: #475569; font-size: 0.85rem; display: block; margin-bottom: 6px;\">Связи:</strong>\n                    <div style=\"display: flex; flex-wrap: wrap; gap: 6px;\">\n                ", e.forEach((e) => {
				s += `<span onclick="window.app && window.app.showWordDefinition('${e.replace(/'/g, "\\'")}')" style="cursor: pointer; background: #f1f5f9; border: 1px solid #cbd5e1; color: #475569; border-radius: 12px; padding: 2px 8px; font-size: 0.8rem; font-weight: 500; display: inline-flex; align-items: center; gap: 4px;">📖 ${e}</span>`;
			}), s += "</div></div>");
		}
		o.innerHTML = `
            <div style="font-size: 1rem; color: #1e293b; line-height: 1.6;">
                ${n.definition.replace(/\n/g, "<br>")}
            </div>
            ${s}
            <div style="margin-top: 20px; text-align: right;">
                <button class="btn btn-secondary" onclick="document.getElementById('explainConceptModal').style.display='none'; const el = document.querySelector('[data-block-id=\\'${r}\\']'); if (el) { el.scrollIntoView({behavior: 'smooth', block: 'center'}); el.style.boxShadow = '0 0 20px rgba(59, 130, 246, 0.5)'; setTimeout(() => el.style.boxShadow = '', 2000); }" style="font-size: 0.85rem; padding: 6px 12px; border-radius: 6px; background: #3b82f6; color: white; border: none; cursor: pointer; font-weight: 600;">🔍 Перейти к блоку</button>
            </div>
        `, i.style.display = "flex";
	}
};
Object.assign(Uv.prototype, Iv), Object.assign(Uv.prototype, Iv, Rv, Bv, Hv), window.toggleOnlyTitlesMode = function(e) {
	let t = document.getElementById("dialecticsCanvas");
	t && (e ? t.classList.add("mode-only-titles") : t.classList.remove("mode-only-titles"));
}, window.app = new Uv();
//#endregion
