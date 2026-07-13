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
		let n = t ? `/api/dialectics/${t}` : "/api/dialectics/save", r = t ? "PATCH" : "POST", i = await fetch(n, {
			method: r,
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(e)
		});
		if (!i.ok) {
			let e = await i.text().catch(() => "");
			console.error(`[DialecticsAPI.save] ${r} ${n} → ${i.status}`, e);
		}
		return i.ok ? await i.json() : null;
	},
	async delete(e) {
		return (await fetch(`/api/dialectics/${e}`, { method: "DELETE" })).ok;
	},
	async updateStatus(e, t) {
		let n = await fetch(`/api/dialectics/${e}/status?status=${encodeURIComponent(t)}`, { method: "POST" });
		return n.ok ? await n.json() : null;
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
	},
	async listByCategory(e) {
		let t = await fetch(`/api/dialectics?category_id=${encodeURIComponent(e)}`);
		return t.ok ? await t.json() : [];
	},
	async listTrash() {
		let e = await fetch("/api/dialectics/trash/list");
		return e.ok ? await e.json() : [];
	},
	async restoreTrash(e) {
		let t = await fetch(`/api/dialectics/${e}/restore`, { method: "POST" });
		return t.ok ? await t.json() : null;
	},
	async permanentDelete(e) {
		return (await fetch(`/api/dialectics/${e}/permanent`, { method: "DELETE" })).ok;
	},
	async getVersions(e) {
		let t = await fetch(`/api/dialectics/${e}/versions`);
		return t.ok ? await t.json() : [];
	},
	async createVersion(e, t) {
		let n = await fetch(`/api/dialectics/${e}/versions`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ title: t })
		});
		return n.ok ? await n.json() : null;
	},
	async restoreVersion(e, t) {
		let n = await fetch(`/api/dialectics/${e}/versions/${t}/restore`, { method: "POST" });
		return n.ok ? await n.json() : null;
	},
	async togglePinVersion(e, t) {
		let n = await fetch(`/api/dialectics/${e}/versions/${t}/pin`, { method: "POST" });
		return n.ok ? await n.json() : null;
	},
	async deleteVersion(e, t) {
		return (await fetch(`/api/dialectics/${e}/versions/${t}`, { method: "DELETE" })).ok;
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
			e.classList.contains("expanded") || (t.preventDefault(), n = !0, r = e.offsetWidth, i = e.offsetHeight, a = t.clientX, o = t.clientY, e.style.transition = "none");
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
function a({ title: e = "Input Required", message: t = "", value: n = "", placeholder: r = "", okLabel: i = "", cancelLabel: a = "", watermark: o = "", width: s = "", multiline: c = !1 }) {
	return new Promise((l) => {
		try {
			let u = document.getElementById("customConfirmModal"), d = document.getElementById("confirmModalTitle"), f = document.getElementById("confirmModalMessage"), p = document.getElementById("confirmModalIconWrapper"), m = document.getElementById("confirmModalFooter");
			if (!u || !d || !f || !m) {
				console.warn("[customPrompt] UI elements missing, falling back to native."), l(prompt(t, n));
				return;
			}
			p && (p.style.display = "none"), d.innerText = e, f.innerHTML = "";
			let h = document.createElement("div");
			if (h.className = "prompt-container", h.style.textAlign = "left", t) {
				let e = document.createElement("div");
				e.textContent = t, e.style.marginBottom = "15px", e.style.fontSize = "0.95rem", e.style.color = "var(--color-text-body)", h.appendChild(e);
			}
			let g = c ? document.createElement("textarea") : document.createElement("input");
			c ? (g.rows = 5, g.style.resize = "vertical", g.style.minHeight = "100px", g.style.fontFamily = "inherit") : g.type = "text", g.value = n, g.placeholder = r, g.className = "form-input-premium", g.style.width = "100%", h.appendChild(g);
			let _ = u.querySelector(".modal-content");
			if (_ && (_.style.position = "relative", _.querySelectorAll(".modal-watermark").forEach((e) => e.remove()), s ? _.style.setProperty("max-width", s, "important") : _.style.removeProperty("max-width"), o)) {
				let e = document.createElement("div");
				e.className = "modal-watermark", e.textContent = o, e.style.position = "absolute", e.style.bottom = "5px", e.style.left = "20px", e.style.fontSize = "14px", e.style.color = "#cbd5e1", e.style.fontWeight = "600", e.style.opacity = "0.6", e.style.pointerEvents = "none", e.style.letterSpacing = "0.5px", _.appendChild(e);
			}
			f.appendChild(h), m.innerHTML = "";
			let v = () => {
				u.classList.remove("active"), setTimeout(() => {
					u.style.display = "none";
				}, 200), _ && (_.style.removeProperty("max-width"), _.querySelectorAll(".modal-watermark").forEach((e) => e.remove()));
			}, y = a || window._ && window._("modal.cancel") || "Отмена", b = i || window._ && window._("modal.save_entry") || "Создать", x = document.createElement("button");
			x.className = "btn btn-secondary", x.innerText = y, x.onclick = (e) => {
				e.stopPropagation(), v(), l(null);
			};
			let S = document.createElement("button");
			S.className = "btn btn-primary", S.innerText = b;
			let C = () => {
				v(), l(g.value);
			};
			S.onclick = (e) => {
				e.stopPropagation(), C();
			}, g.onkeydown = (e) => {
				e.key === "Enter" ? (e.preventDefault(), C()) : e.key === "Escape" && (v(), l(null));
			}, m.appendChild(x), m.appendChild(S), u.style.display = "flex", u.offsetHeight, u.classList.add("active"), setTimeout(() => g.focus(), 100);
		} catch (e) {
			console.error("[customPrompt] Error:", e), l(prompt(t, n));
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
			let re = document.createElement("button");
			re.className = "btn btn-secondary", re.innerText = r, re.onclick = (e) => {
				e.stopPropagation(), ne(), a.classList.remove("active"), setTimeout(() => {
					a.style.display = "none";
				}, 200), i(null);
			};
			let ie = document.createElement("button");
			ie.className = "btn btn-primary", ie.innerText = n;
			let ae = () => {
				ne(), a.classList.remove("active"), setTimeout(() => {
					a.style.display = "none";
				}, 200), i(f.value);
			};
			ie.onclick = (e) => {
				e.stopPropagation(), ae();
			}, f.onkeydown = (e) => {
				e.key === "Enter" ? (e.preventDefault(), ae()) : e.key === "Escape" && (a.classList.remove("active"), setTimeout(() => {
					a.style.display = "none";
				}, 200), i(null));
			}, c.appendChild(re), c.appendChild(ie), a.style.display = "flex", a.offsetHeight, a.classList.add("active"), setTimeout(() => f.focus(), 100);
		} catch (n) {
			console.error("[customLatexPrompt] Error:", n), i(prompt(e, t));
		}
	});
}
function s({ title: e = "Выберите целевой блок", blocks: t = [] }) {
	return new Promise((n) => {
		try {
			let r = document.getElementById("customConfirmModal"), i = document.getElementById("confirmModalTitle"), a = document.getElementById("confirmModalMessage"), o = document.getElementById("confirmModalIconWrapper"), s = document.getElementById("confirmModalFooter");
			if (!r || !i || !a || !s) {
				n(null);
				return;
			}
			o && (o.style.display = "none"), i.innerText = e;
			let c = document.createElement("div");
			c.style.cssText = "display: flex; flex-direction: column; gap: 12px; width: 100%;";
			let l = window.app && window.app.state ? window.app.state.currentNoteId : null, u = window.app && window.app.dom && window.app.dom.title && window.app.dom.title.value ? window.app.dom.title.value : "Текущий конспект", d = document.createElement("div");
			d.style.cssText = "display: flex; flex-direction: column; gap: 4px;", d.innerHTML = "<label style=\"font-size: 0.8rem; font-weight: 600; color: #64748b;\">Конспект:</label>";
			let f = document.createElement("select");
			f.style.cssText = "width: 100%; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 0.9rem; outline: none; background: white;";
			let p = document.createElement("option");
			p.value = "current", p.innerText = `Этот конспект: ${u}`, f.appendChild(p), d.appendChild(f), c.appendChild(d);
			let m = [];
			fetch("/api/dialectics").then((e) => e.ok ? e.json() : []).then((e) => {
				m = e, e.forEach((e) => {
					if (l && String(e.id) === String(l)) return;
					let t = document.createElement("option");
					t.value = e.id, t.innerText = e.title || `Конспект #${e.id}`, f.appendChild(t);
				});
			}).catch((e) => console.error("Error loading note list:", e));
			let h = document.createElement("input");
			h.type = "text", h.placeholder = "🔍 Поиск по названию блока...", h.className = "form-control", h.style.cssText = "width: 100%; padding: 10px 14px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 0.95rem; outline: none; transition: border-color 0.2s;", h.onfocus = () => h.style.borderColor = "#3b82f6", h.onblur = () => h.style.borderColor = "#cbd5e1";
			let g = document.createElement("div");
			g.style.cssText = "display: flex; flex-direction: column; gap: 6px; max-height: 260px; overflow-y: auto; padding-right: 4px;";
			let _ = null, v = [...t], y = "", b = "", x = (e = "") => {
				g.innerHTML = "";
				let t = e.toLowerCase().trim(), n = !1;
				v.forEach((e) => {
					if (t && !e.title.toLowerCase().includes(t)) return;
					n = !0;
					let r = document.createElement("div");
					r.style.cssText = `
                        padding: 10px 14px; border: 1px solid #e2e8f0; border-radius: 8px;
                        cursor: pointer; transition: all 0.15s ease; display: flex; align-items: center; gap: 10px;
                        background: ${_ === e ? "#eff6ff" : "white"};
                        border-color: ${_ === e ? "#3b82f6" : "#e2e8f0"};
                        box-shadow: ${_ === e ? "0 2px 8px rgba(59, 130, 246, 0.15)" : "none"};
                    `, r.onmouseover = () => {
						_ !== e && (r.style.background = "#f8fafc");
					}, r.onmouseout = () => {
						_ !== e && (r.style.background = "white");
					}, r.innerHTML = `
                        <span style="font-size: 1.1rem;">${e.icon || "▪️"}</span>
                        <span style="font-weight: 600; color: #1e293b; font-size: 0.9rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex-grow: 1;">${e.title}</span>
                    `, r.onclick = () => {
						_ = e, x(h.value);
					}, r.ondblclick = () => {
						_ = e, w();
					}, g.appendChild(r);
				}), n || (g.innerHTML = "<div style=\"padding: 20px; text-align: center; color: #94a3b8; font-size: 0.9rem;\">Блоки не найдены</div>");
			};
			f.onchange = async () => {
				let e = f.value;
				if (_ = null, e === "current") v = [...t], y = "", b = "", x(h.value);
				else {
					y = e;
					let t = m.find((t) => String(t.id) === String(e));
					b = t ? t.title : "", g.innerHTML = "<div style=\"padding: 20px; text-align: center; color: #94a3b8; font-size: 0.9rem;\">Загрузка блоков...</div>";
					try {
						let t = await fetch(`/api/dialectics/${e}`);
						if (!t.ok) throw Error("Failed to load blocks");
						let n = await t.json();
						if (n) {
							let e = typeof n.content_json == "string" ? JSON.parse(n.content_json) : n.content_json;
							v = [], Array.isArray(e) && e.forEach((e, t) => {
								let n = e.role === "section" || e.isSection === !0, r = e.title;
								if (!r) {
									let i = document.createElement("div");
									i.innerHTML = e.html || "", r = i.innerText.trim(), r.length > 50 && (r = r.substring(0, 50) + "..."), r ||= n ? "Раздел" : `Блок ${t + 1}`;
								}
								v.push({
									id: e.id,
									title: r.trim(),
									icon: n ? "📑" : "▪️"
								});
							});
						}
					} catch (e) {
						v = [], console.error(e);
					}
					x(h.value);
				}
			}, h.oninput = () => x(h.value), x(), c.appendChild(h), c.appendChild(g), a.innerHTML = "", a.appendChild(c), s.innerHTML = "";
			let S = document.createElement("button");
			S.className = "btn btn-secondary", S.innerText = window._ && window._("modal.cancel") || "Отмена", S.onclick = (e) => {
				e.stopPropagation(), r.classList.remove("active"), setTimeout(() => {
					r.style.display = "none";
				}, 200), n(null);
			};
			let C = document.createElement("button");
			C.className = "btn btn-primary", C.innerText = window._ && window._("modal.save_entry") || "Выбрать";
			let w = () => {
				if (!_) {
					window.app && window.app.toast && window.app.toast("Выберите блок из списка", "warning");
					return;
				}
				r.classList.remove("active"), setTimeout(() => {
					r.style.display = "none";
				}, 200), n({
					id: _.id,
					title: _.title,
					noteId: y,
					noteTitle: b
				});
			};
			C.onclick = (e) => {
				e.stopPropagation(), w();
			}, s.appendChild(S), s.appendChild(C), r.style.display = "flex", r.offsetHeight, r.classList.add("active"), setTimeout(() => h.focus(), 100);
		} catch (e) {
			console.error(e), n(null);
		}
	});
}
typeof window < "u" && (window.customConfirm = r, window.customChoice = i, window.customPrompt = a, window.customSelectBlockPrompt = s);
//#endregion
//#region node_modules/orderedmap/dist/index.js
function c(e) {
	this.content = e;
}
c.prototype = {
	constructor: c,
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
		return i == -1 ? a.push(n || e, t) : (a[i + 1] = t, n && (a[i] = n)), new c(a);
	},
	remove: function(e) {
		var t = this.find(e);
		if (t == -1) return this;
		var n = this.content.slice();
		return n.splice(t, 2), new c(n);
	},
	addToStart: function(e, t) {
		return new c([e, t].concat(this.remove(e).content));
	},
	addToEnd: function(e, t) {
		var n = this.remove(e).content.slice();
		return n.push(e, t), new c(n);
	},
	addBefore: function(e, t, n) {
		var r = this.remove(t), i = r.content.slice(), a = r.find(e);
		return i.splice(a == -1 ? i.length : a, 0, t, n), new c(i);
	},
	forEach: function(e) {
		for (var t = 0; t < this.content.length; t += 2) e(this.content[t], this.content[t + 1]);
	},
	prepend: function(e) {
		return e = c.from(e), e.size ? new c(e.content.concat(this.subtract(e).content)) : this;
	},
	append: function(e) {
		return e = c.from(e), e.size ? new c(this.subtract(e).content.concat(e.content)) : this;
	},
	subtract: function(e) {
		var t = this;
		e = c.from(e);
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
}, c.from = function(e) {
	if (e instanceof c) return e;
	var t = [];
	if (e) for (var n in e) t.push(n, e[n]);
	return new c(t);
};
//#endregion
//#region node_modules/prosemirror-model/dist/index.js
function l(e, t, n) {
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
			let e = l(i.content, a.content, n + 1);
			if (e != null) return e;
		}
		n += i.nodeSize;
	}
}
function u(e, t, n, r) {
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
			let e = u(o.content, s.content, n - 1, r - 1);
			if (e) return e;
		}
		n -= c, r -= c;
	}
}
var d = class e {
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
		return l(this, e, t);
	}
	findDiffEnd(e, t = this.size, n = e.size) {
		return u(this, e, t, n);
	}
	findIndex(e) {
		if (e == 0) return p(0, e);
		if (e == this.size) return p(this.content.length, e);
		if (e > this.size || e < 0) throw RangeError(`Position ${e} outside of fragment (${this})`);
		for (let t = 0, n = 0;; t++) {
			let r = this.child(t), i = n + r.nodeSize;
			if (i >= e) return i == e ? p(t + 1, i) : p(t, n);
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
d.empty = new d([], 0);
var f = {
	index: 0,
	offset: 0
};
function p(e, t) {
	return f.index = e, f.offset = t, f;
}
function m(e, t) {
	if (e === t) return !0;
	if (!(e && typeof e == "object") || !(t && typeof t == "object")) return !1;
	let n = Array.isArray(e);
	if (Array.isArray(t) != n) return !1;
	if (n) {
		if (e.length != t.length) return !1;
		for (let n = 0; n < e.length; n++) if (!m(e[n], t[n])) return !1;
	} else {
		for (let n in e) if (!(n in t) || !m(e[n], t[n])) return !1;
		for (let n in t) if (!(n in e)) return !1;
	}
	return !0;
}
var h = class e {
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
		return this == e || this.type == e.type && m(this.attrs, e.attrs);
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
h.none = [];
var g = class extends Error {}, _ = class e {
	constructor(e, t, n) {
		this.content = e, this.openStart = t, this.openEnd = n;
	}
	get size() {
		return this.content.size - this.openStart - this.openEnd;
	}
	insertAt(t, n) {
		let r = y(this.content, t + this.openStart, n);
		return r && new e(r, this.openStart, this.openEnd);
	}
	removeBetween(t, n) {
		return new e(v(this.content, t + this.openStart, n + this.openStart), this.openStart, this.openEnd);
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
		return new e(d.fromJSON(t, n.content), r, i);
	}
	static maxOpen(t, n = !0) {
		let r = 0, i = 0;
		for (let e = t.firstChild; e && !e.isLeaf && (n || !e.type.spec.isolating); e = e.firstChild) r++;
		for (let e = t.lastChild; e && !e.isLeaf && (n || !e.type.spec.isolating); e = e.lastChild) i++;
		return new e(t, r, i);
	}
};
_.empty = new _(d.empty, 0, 0);
function v(e, t, n) {
	let { index: r, offset: i } = e.findIndex(t), a = e.maybeChild(r), { index: o, offset: s } = e.findIndex(n);
	if (i == t || a.isText) {
		if (s != n && !e.child(o).isText) throw RangeError("Removing non-flat range");
		return e.cut(0, t).append(e.cut(n));
	}
	if (r != o) throw RangeError("Removing non-flat range");
	return e.replaceChild(r, a.copy(v(a.content, t - i - 1, n - i - 1)));
}
function y(e, t, n, r) {
	let { index: i, offset: a } = e.findIndex(t), o = e.maybeChild(i);
	if (a == t || o.isText) return r && !r.canReplace(i, i, n) ? null : e.cut(0, t).append(n).append(e.cut(t));
	let s = y(o.content, t - a - 1, n, o);
	return s && e.replaceChild(i, o.copy(s));
}
function b(e, t, n) {
	if (n.openStart > e.depth) throw new g("Inserted content deeper than insertion position");
	if (e.depth - n.openStart != t.depth - n.openEnd) throw new g("Inconsistent open depths");
	return x(e, t, n, 0);
}
function x(e, t, n, r) {
	let i = e.index(r), a = e.node(r);
	if (i == t.index(r) && r < e.depth - n.openStart) {
		let o = x(e, t, n, r + 1);
		return a.copy(a.content.replaceChild(i, o));
	} else if (!n.content.size) return E(a, te(e, t, r));
	else if (!n.openStart && !n.openEnd && e.depth == r && t.depth == r) {
		let r = e.parent, i = r.content;
		return E(r, i.cut(0, e.parentOffset).append(n.content).append(i.cut(t.parentOffset)));
	} else {
		let { start: i, end: o } = ne(n, e);
		return E(a, ee(e, i, o, t, r));
	}
}
function S(e, t) {
	if (!t.type.compatibleContent(e.type)) throw new g("Cannot join " + t.type.name + " onto " + e.type.name);
}
function C(e, t, n) {
	let r = e.node(n);
	return S(r, t.node(n)), r;
}
function w(e, t) {
	let n = t.length - 1;
	n >= 0 && e.isText && e.sameMarkup(t[n]) ? t[n] = e.withText(t[n].text + e.text) : t.push(e);
}
function T(e, t, n, r) {
	let i = (t || e).node(n), a = 0, o = t ? t.index(n) : i.childCount;
	e && (a = e.index(n), e.depth > n ? a++ : e.textOffset && (w(e.nodeAfter, r), a++));
	for (let e = a; e < o; e++) w(i.child(e), r);
	t && t.depth == n && t.textOffset && w(t.nodeBefore, r);
}
function E(e, t) {
	return e.type.checkContent(t), e.copy(t);
}
function ee(e, t, n, r, i) {
	let a = e.depth > i && C(e, t, i + 1), o = r.depth > i && C(n, r, i + 1), s = [];
	return T(null, e, i, s), a && o && t.index(i) == n.index(i) ? (S(a, o), w(E(a, ee(e, t, n, r, i + 1)), s)) : (a && w(E(a, te(e, t, i + 1)), s), T(t, n, i, s), o && w(E(o, te(n, r, i + 1)), s)), T(r, null, i, s), new d(s);
}
function te(e, t, n) {
	let r = [];
	return T(null, e, n, r), e.depth > n && w(E(C(e, t, n + 1), te(e, t, n + 1)), r), T(t, null, n, r), new d(r);
}
function ne(e, t) {
	let n = t.depth - e.openStart, r = t.node(n).copy(e.content);
	for (let e = n - 1; e >= 0; e--) r = t.node(e).copy(d.from(r));
	return {
		start: r.resolveNoCache(e.openStart + n),
		end: r.resolveNoCache(r.content.size - e.openEnd - n)
	};
}
var re = class e {
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
		if (e.content.size == 0) return h.none;
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
		for (let n = this.depth - (this.parent.inlineContent || this.pos == e.pos ? 1 : 0); n >= 0; n--) if (e.pos <= this.end(n) && (!t || t(this.node(n)))) return new se(this, e, n);
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
		let r = oe.get(t);
		if (r) for (let e = 0; e < r.elts.length; e++) {
			let t = r.elts[e];
			if (t.pos == n) return t;
		}
		else oe.set(t, r = new ie());
		let i = r.elts[r.i] = e.resolve(t, n);
		return r.i = (r.i + 1) % ae, i;
	}
}, ie = class {
	constructor() {
		this.elts = [], this.i = 0;
	}
}, ae = 12, oe = /* @__PURE__ */ new WeakMap(), se = class {
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
}, ce = Object.create(null), le = class e {
	constructor(e, t, n, r = h.none) {
		this.type = e, this.attrs = t, this.marks = r, this.content = n || d.empty;
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
		return this.type == e && m(this.attrs, t || e.defaultAttrs || ce) && h.sameSet(this.marks, n || h.none);
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
		if (e == t) return _.empty;
		let r = this.resolve(e), i = this.resolve(t), a = n ? 0 : r.sharedDepth(t), o = r.start(a);
		return new _(r.node(a).content.cut(r.pos - o, i.pos - o), r.depth - a, i.depth - a);
	}
	replace(e, t, n) {
		return b(this.resolve(e), this.resolve(t), n);
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
		return re.resolveCached(this, e);
	}
	resolveNoCache(e) {
		return re.resolve(this, e);
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
		return this.content.size && (e += "(" + this.content.toStringInner() + ")"), de(this.marks, e);
	}
	contentMatchAt(e) {
		let t = this.type.contentMatch.matchFragment(this.content, 0, e);
		if (!t) throw Error("Called contentMatchAt on a node with invalid content");
		return t;
	}
	canReplace(e, t, n = d.empty, r = 0, i = n.childCount) {
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
		let e = h.none;
		for (let t = 0; t < this.marks.length; t++) {
			let n = this.marks[t];
			n.type.checkAttrs(n.attrs), e = n.addToSet(e);
		}
		if (!h.sameSet(e, this.marks)) throw RangeError(`Invalid collection of marks for node ${this.type.name}: ${this.marks.map((e) => e.type.name)}`);
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
		let r = d.fromJSON(e, t.content), i = e.nodeType(t.type).create(t.attrs, r, n);
		return i.type.checkAttrs(i.attrs), i;
	}
};
le.prototype.text = void 0;
var ue = class e extends le {
	constructor(e, t, n, r) {
		if (super(e, t, null, r), !n) throw RangeError("Empty text nodes are not allowed");
		this.text = n;
	}
	toString() {
		return this.type.spec.toDebugString ? this.type.spec.toDebugString(this) : de(this.marks, JSON.stringify(this.text));
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
function de(e, t) {
	for (let n = e.length - 1; n >= 0; n--) t = e[n].type.name + "(" + t + ")";
	return t;
}
var fe = class e {
	constructor(e) {
		this.validEnd = e, this.next = [], this.wrapCache = [];
	}
	static parse(t, n) {
		let r = new pe(t, n);
		if (r.next == null) return e.empty;
		let i = me(r);
		r.next && r.err("Unexpected trailing text");
		let a = we(xe(i));
		return Te(a, r), a;
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
			if (s && (!t || s.validEnd)) return d.from(o.map((e) => e.createAndFill()));
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
fe.empty = new fe(!0);
var pe = class {
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
function me(e) {
	let t = [];
	do
		t.push(he(e));
	while (e.eat("|"));
	return t.length == 1 ? t[0] : {
		type: "choice",
		exprs: t
	};
}
function he(e) {
	let t = [];
	do
		t.push(ge(e));
	while (e.next && e.next != ")" && e.next != "|");
	return t.length == 1 ? t[0] : {
		type: "seq",
		exprs: t
	};
}
function ge(e) {
	let t = be(e);
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
	else if (e.eat("{")) t = ve(e, t);
	else break;
	return t;
}
function _e(e) {
	/\D/.test(e.next) && e.err("Expected number, got '" + e.next + "'");
	let t = Number(e.next);
	return e.pos++, t;
}
function ve(e, t) {
	let n = _e(e), r = n;
	return e.eat(",") && (r = e.next == "}" ? -1 : _e(e)), e.eat("}") || e.err("Unclosed braced range"), {
		type: "range",
		min: n,
		max: r,
		expr: t
	};
}
function ye(e, t) {
	let n = e.nodeTypes, r = n[t];
	if (r) return [r];
	let i = [];
	for (let e in n) {
		let r = n[e];
		r.isInGroup(t) && i.push(r);
	}
	return i.length == 0 && e.err("No node type or group '" + t + "' found"), i;
}
function be(e) {
	if (e.eat("(")) {
		let t = me(e);
		return e.eat(")") || e.err("Missing closing paren"), t;
	} else if (/\W/.test(e.next)) e.err("Unexpected token '" + e.next + "'");
	else {
		let t = ye(e, e.next).map((t) => (e.inline == null ? e.inline = t.isInline : e.inline != t.isInline && e.err("Mixing inline and block content"), {
			type: "name",
			value: t
		}));
		return e.pos++, t.length == 1 ? t[0] : {
			type: "choice",
			exprs: t
		};
	}
}
function xe(e) {
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
function Se(e, t) {
	return t - e;
}
function Ce(e, t) {
	let n = [];
	return r(t), n.sort(Se);
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
function we(e) {
	let t = Object.create(null);
	return n(Ce(e, 0));
	function n(r) {
		let i = [];
		r.forEach((t) => {
			e[t].forEach(({ term: t, to: n }) => {
				if (!t) return;
				let r;
				for (let e = 0; e < i.length; e++) i[e][0] == t && (r = i[e][1]);
				Ce(e, n).forEach((e) => {
					r || i.push([t, r = []]), r.indexOf(e) == -1 && r.push(e);
				});
			});
		});
		let a = t[r.join(",")] = new fe(r.indexOf(e.length - 1) > -1);
		for (let e = 0; e < i.length; e++) {
			let r = i[e][1].sort(Se);
			a.next.push({
				type: i[e][0],
				next: t[r.join(",")] || n(r)
			});
		}
		return a;
	}
}
function Te(e, t) {
	for (let n = 0, r = [e]; n < r.length; n++) {
		let e = r[n], i = !e.validEnd, a = [];
		for (let t = 0; t < e.next.length; t++) {
			let { type: n, next: o } = e.next[t];
			a.push(n.name), i && !(n.isText || n.hasRequiredAttrs()) && (i = !1), r.indexOf(o) == -1 && r.push(o);
		}
		i && t.err("Only non-generatable nodes (" + a.join(", ") + ") in a required position (see https://prosemirror.net/docs/guide/#generatable)");
	}
}
function Ee(e) {
	let t = Object.create(null);
	for (let n in e) {
		let r = e[n];
		if (!r.hasDefault) return null;
		t[n] = r.default;
	}
	return t;
}
function De(e, t) {
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
function Oe(e, t, n, r) {
	for (let r in t) if (!(r in e)) throw RangeError(`Unsupported attribute ${r} for ${n} of type ${r}`);
	for (let n in e) {
		let r = e[n];
		r.validate && r.validate(t[n]);
	}
}
function ke(e, t) {
	let n = Object.create(null);
	if (t) for (let r in t) n[r] = new Me(e, r, t[r]);
	return n;
}
var Ae = class e {
	constructor(e, t, n) {
		this.name = e, this.schema = t, this.spec = n, this.markSet = null, this.groups = n.group ? n.group.split(" ") : [], this.attrs = ke(e, n.attrs), this.defaultAttrs = Ee(this.attrs), this.contentMatch = null, this.inlineContent = null, this.isBlock = !(n.inline || e == "text"), this.isText = e == "text";
	}
	get isInline() {
		return !this.isBlock;
	}
	get isTextblock() {
		return this.isBlock && this.inlineContent;
	}
	get isLeaf() {
		return this.contentMatch == fe.empty;
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
		return !e && this.defaultAttrs ? this.defaultAttrs : De(this.attrs, e);
	}
	create(e = null, t, n) {
		if (this.isText) throw Error("NodeType.create can't construct text nodes");
		return new le(this, this.computeAttrs(e), d.from(t), h.setFrom(n));
	}
	createChecked(e = null, t, n) {
		return t = d.from(t), this.checkContent(t), new le(this, this.computeAttrs(e), t, h.setFrom(n));
	}
	createAndFill(e = null, t, n) {
		if (e = this.computeAttrs(e), t = d.from(t), t.size) {
			let e = this.contentMatch.fillBefore(t);
			if (!e) return null;
			t = e.append(t);
		}
		let r = this.contentMatch.matchFragment(t), i = r && r.fillBefore(d.empty, !0);
		return i ? new le(this, e, t.append(i), h.setFrom(n)) : null;
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
		Oe(this.attrs, e, "node", this.name);
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
		return t ? t.length ? t : h.none : e;
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
function je(e, t, n) {
	let r = n.split("|");
	return (n) => {
		let i = n === null ? "null" : typeof n;
		if (r.indexOf(i) < 0) throw RangeError(`Expected value of type ${r} for attribute ${t} on type ${e}, got ${i}`);
	};
}
var Me = class {
	constructor(e, t, n) {
		this.hasDefault = Object.prototype.hasOwnProperty.call(n, "default"), this.default = n.default, this.validate = typeof n.validate == "string" ? je(e, t, n.validate) : n.validate;
	}
	get isRequired() {
		return !this.hasDefault;
	}
}, Ne = class e {
	constructor(e, t, n, r) {
		this.name = e, this.rank = t, this.schema = n, this.spec = r, this.attrs = ke(e, r.attrs), this.excluded = null;
		let i = Ee(this.attrs);
		this.instance = i ? new h(this, i) : null;
	}
	create(e = null) {
		return !e && this.instance ? this.instance : new h(this, De(this.attrs, e));
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
		Oe(this.attrs, e, "mark", this.name);
	}
	excludes(e) {
		return this.excluded.indexOf(e) > -1;
	}
}, Pe = class {
	constructor(e) {
		this.linebreakReplacement = null, this.cached = Object.create(null);
		let t = this.spec = {};
		for (let n in e) t[n] = e[n];
		t.nodes = c.from(e.nodes), t.marks = c.from(e.marks || {}), this.nodes = Ae.compile(this.spec.nodes, this), this.marks = Ne.compile(this.spec.marks, this);
		let n = Object.create(null);
		for (let e in this.nodes) {
			if (e in this.marks) throw RangeError(e + " can not be both a node and a mark");
			let t = this.nodes[e], r = t.spec.content || "", i = t.spec.marks;
			if (t.contentMatch = n[r] || (n[r] = fe.parse(r, this.nodes)), t.inlineContent = t.contentMatch.inlineContent, t.spec.linebreakReplacement) {
				if (this.linebreakReplacement) throw RangeError("Multiple linebreak nodes defined");
				if (!t.isInline || !t.isLeaf) throw RangeError("Linebreak replacement nodes must be inline leaf nodes");
				this.linebreakReplacement = t;
			}
			t.markSet = i == "_" ? null : i ? Fe(this, i.split(" ")) : i == "" || !t.inlineContent ? [] : null;
		}
		for (let e in this.marks) {
			let t = this.marks[e], n = t.spec.excludes;
			t.excluded = n == null ? [t] : n == "" ? [] : Fe(this, n.split(" "));
		}
		this.nodeFromJSON = (e) => le.fromJSON(this, e), this.markFromJSON = (e) => h.fromJSON(this, e), this.topNodeType = this.nodes[this.spec.topNode || "doc"], this.cached.wrappings = Object.create(null);
	}
	node(e, t = null, n, r) {
		if (typeof e == "string") e = this.nodeType(e);
		else if (!(e instanceof Ae)) throw RangeError("Invalid node type: " + e);
		else if (e.schema != this) throw RangeError("Node type from different schema used (" + e.name + ")");
		return e.createChecked(t, n, r);
	}
	text(e, t) {
		let n = this.nodes.text;
		return new ue(n, n.defaultAttrs, e, h.setFrom(t));
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
function Fe(e, t) {
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
function Ie(e) {
	return e.tag != null;
}
function Le(e) {
	return e.style != null;
}
var Re = class e {
	constructor(e, t) {
		this.schema = e, this.rules = t, this.tags = [], this.styles = [];
		let n = this.matchedStyles = [];
		t.forEach((e) => {
			if (Ie(e)) this.tags.push(e);
			else if (Le(e)) {
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
		let n = new qe(this, t, !1);
		return n.addAll(e, h.none, t.from, t.to), n.finish();
	}
	parseSlice(e, t = {}) {
		let n = new qe(this, t, !0);
		return n.addAll(e, h.none, t.from, t.to), _.maxOpen(n.finish());
	}
	matchTag(e, t, n) {
		for (let r = n ? this.tags.indexOf(n) + 1 : 0; r < this.tags.length; r++) {
			let n = this.tags[r];
			if (Ye(e, n.tag) && (n.namespace === void 0 || e.namespaceURI == n.namespace) && (!n.context || t.matchesContext(n.context))) {
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
				n(e = Xe(e)), e.mark || e.ignore || e.clearMark || (e.mark = t);
			});
		}
		for (let t in e.nodes) {
			let r = e.nodes[t].spec.parseDOM;
			r && r.forEach((e) => {
				n(e = Xe(e)), e.node || e.ignore || e.mark || (e.node = t);
			});
		}
		return t;
	}
	static fromSchema(t) {
		return t.cached.domParser || (t.cached.domParser = new e(t, e.schemaRules(t)));
	}
}, ze = {
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
}, Be = {
	head: !0,
	noscript: !0,
	object: !0,
	script: !0,
	style: !0,
	title: !0
}, Ve = {
	ol: !0,
	ul: !0
}, He = 1, Ue = 2, We = 4;
function Ge(e, t, n) {
	return t == null ? e && e.whitespace == "pre" ? He | Ue : n & ~We : (t ? He : 0) | (t === "full" ? Ue : 0);
}
var Ke = class {
	constructor(e, t, n, r, i, a) {
		this.type = e, this.attrs = t, this.marks = n, this.solid = r, this.options = a, this.content = [], this.activeMarks = h.none, this.match = i || (a & We ? null : e.contentMatch);
	}
	findWrapping(e) {
		if (!this.match) {
			if (!this.type) return [];
			let t = this.type.contentMatch.fillBefore(d.from(e));
			if (t) this.match = this.type.contentMatch.matchFragment(t);
			else {
				let t = this.type.contentMatch, n;
				return (n = t.findWrapping(e.type)) ? (this.match = t, n) : null;
			}
		}
		return this.match.findWrapping(e.type);
	}
	finish(e) {
		if (!(this.options & He)) {
			let e = this.content[this.content.length - 1], t;
			if (e && e.isText && (t = /[ \t\r\n\u000c]+$/.exec(e.text))) {
				let n = e;
				e.text.length == t[0].length ? this.content.pop() : this.content[this.content.length - 1] = n.withText(n.text.slice(0, n.text.length - t[0].length));
			}
		}
		let t = d.from(this.content);
		return !e && this.match && (t = t.append(this.match.fillBefore(d.empty, !0))), this.type ? this.type.create(this.attrs, t, this.marks) : t;
	}
	inlineContext(e) {
		return this.type ? this.type.inlineContent : this.content.length ? this.content[0].isInline : e.parentNode && !ze.hasOwnProperty(e.parentNode.nodeName.toLowerCase());
	}
}, qe = class {
	constructor(e, t, n) {
		this.parser = e, this.options = t, this.isOpen = n, this.open = 0, this.localPreserveWS = !1;
		let r = t.topNode, i, a = Ge(null, t.preserveWhitespace, 0) | (n ? We : 0);
		i = r ? new Ke(r.type, r.attrs, h.none, !0, t.topMatch || r.type.contentMatch, a) : n ? new Ke(null, null, h.none, !0, null, a) : new Ke(e.schema.topNodeType, null, h.none, !0, null, a), this.nodes = [i], this.find = t.findPositions, this.needsBlock = !1;
	}
	get top() {
		return this.nodes[this.open];
	}
	addDOM(e, t) {
		e.nodeType == 3 ? this.addTextNode(e, t) : e.nodeType == 1 && this.addElement(e, t);
	}
	addTextNode(e, t) {
		let n = e.nodeValue, r = this.top, i = r.options & Ue ? "full" : this.localPreserveWS || (r.options & He) > 0, { schema: a } = this.parser;
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
		Ve.hasOwnProperty(a) && this.parser.normalizeLists && Je(e);
		let s = this.options.ruleFromNode && this.options.ruleFromNode(e) || (o = this.parser.matchTag(e, this, n));
		out: if (s ? s.ignore : Be.hasOwnProperty(a)) this.findInside(e), this.ignoreFallback(e, t);
		else if (!s || s.skip || s.closeParent) {
			s && s.closeParent ? this.open = Math.max(0, this.open - 1) : s && s.skip.nodeType && (e = s.skip);
			let n, r = this.needsBlock;
			if (ze.hasOwnProperty(a)) i.content.length && i.content[0].isInline && this.open && (this.open--, i = this.top), n = !0, i.type || (this.needsBlock = !0);
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
			let n = h.none;
			for (let i of r.concat(e.marks)) (t.type ? t.type.allowsMarkType(i.type) : Ze(i.type, e.type)) && (n = i.addToSet(n));
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
		let o = Ge(e, i, a.options);
		a.options & We && a.content.length == 0 && (o |= We);
		let s = h.none;
		return n = n.filter((t) => (a.type ? a.type.allowsMarkType(t.type) : Ze(t.type, e)) ? (s = t.addToSet(s), !1) : !0), this.nodes.push(new Ke(e, t, s, r, null, o)), this.open++, n;
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
		else this.localPreserveWS && (this.nodes[t].options |= He);
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
function Je(e) {
	for (let t = e.firstChild, n = null; t; t = t.nextSibling) {
		let e = t.nodeType == 1 ? t.nodeName.toLowerCase() : null;
		e && Ve.hasOwnProperty(e) && n ? (n.appendChild(t), t = n) : e == "li" ? n = t : e && (n = null);
	}
}
function Ye(e, t) {
	return (e.matches || e.msMatchesSelector || e.webkitMatchesSelector || e.mozMatchesSelector).call(e, t);
}
function Xe(e) {
	let t = {};
	for (let n in e) t[n] = e[n];
	return t;
}
function Ze(e, t) {
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
var Qe = class e {
	constructor(e, t) {
		this.nodes = e, this.marks = t;
	}
	serializeFragment(e, t = {}, n) {
		n ||= et(t).createDocumentFragment();
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
		let { dom: n, contentDOM: r } = it(et(t), this.nodes[e.type.name](e), null, e.attrs);
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
		return r && it(et(n), r(e, t), null, e.attrs);
	}
	static renderSpec(e, t, n = null, r) {
		return it(e, t, n, r);
	}
	static fromSchema(t) {
		return t.cached.domSerializer || (t.cached.domSerializer = new e(this.nodesFromSchema(t), this.marksFromSchema(t)));
	}
	static nodesFromSchema(e) {
		let t = $e(e.nodes);
		return t.text ||= (e) => e.text, t;
	}
	static marksFromSchema(e) {
		return $e(e.marks);
	}
};
function $e(e) {
	let t = {};
	for (let n in e) {
		let r = e[n].spec.toDOM;
		r && (t[n] = r);
	}
	return t;
}
function et(e) {
	return e.document || window.document;
}
var tt = /* @__PURE__ */ new WeakMap();
function nt(e) {
	let t = tt.get(e);
	return t === void 0 && tt.set(e, t = rt(e)), t;
}
function rt(e) {
	let t = null;
	function n(e) {
		if (e && typeof e == "object") if (Array.isArray(e)) if (typeof e[0] == "string") t ||= [], t.push(e);
		else for (let t = 0; t < e.length; t++) n(e[t]);
		else for (let t in e) n(e[t]);
	}
	return n(e), t;
}
function it(e, t, n, r) {
	if (typeof t == "string") return { dom: e.createTextNode(t) };
	if (t.nodeType != null) return { dom: t };
	if (t.dom && t.dom.nodeType != null) return t;
	let i = t[0], a;
	if (typeof i != "string") throw RangeError("Invalid array passed to renderSpec");
	if (r && (a = nt(r)) && a.indexOf(t) > -1) throw RangeError("Using an array from an attribute object as a DOM spec. This may be an attempted cross site scripting attack.");
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
			let { dom: t, contentDOM: i } = it(e, a, n, r);
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
var at = 65535, ot = 2 ** 16;
function st(e, t) {
	return e + t * ot;
}
function ct(e) {
	return e & at;
}
function lt(e) {
	return (e - (e & at)) / ot;
}
var ut = 1, dt = 2, ft = 4, pt = 8, mt = class {
	constructor(e, t, n) {
		this.pos = e, this.delInfo = t, this.recover = n;
	}
	get deleted() {
		return (this.delInfo & pt) > 0;
	}
	get deletedBefore() {
		return (this.delInfo & (ut | ft)) > 0;
	}
	get deletedAfter() {
		return (this.delInfo & (dt | ft)) > 0;
	}
	get deletedAcross() {
		return (this.delInfo & ft) > 0;
	}
}, ht = class e {
	constructor(t, n = !1) {
		if (this.ranges = t, this.inverted = n, !t.length && e.empty) return e.empty;
	}
	recover(e) {
		let t = 0, n = ct(e);
		if (!this.inverted) for (let e = 0; e < n; e++) t += this.ranges[e * 3 + 2] - this.ranges[e * 3 + 1];
		return this.ranges[n * 3] + t + lt(e);
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
				let d = e == (t < 0 ? s : u) ? null : st(o / 3, e - s), f = e == s ? dt : e == u ? ut : ft;
				return (t < 0 ? e != s : e != u) && (f |= pt), new mt(a, f, d);
			}
			r += l - c;
		}
		return n ? e + r : new mt(e + r, 0, null);
	}
	touches(e, t) {
		let n = 0, r = ct(t), i = this.inverted ? 2 : 1, a = this.inverted ? 1 : 2;
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
ht.empty = new ht([]);
var gt = class e {
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
		return n ? e : new mt(e, r, null);
	}
}, _t = Object.create(null), vt = class {
	getMap() {
		return ht.empty;
	}
	merge(e) {
		return null;
	}
	static fromJSON(e, t) {
		if (!t || !t.stepType) throw RangeError("Invalid input for Step.fromJSON");
		let n = _t[t.stepType];
		if (!n) throw RangeError(`No step type ${t.stepType} defined`);
		return n.fromJSON(e, t);
	}
	static jsonID(e, t) {
		if (e in _t) throw RangeError("Duplicate use of step JSON ID " + e);
		return _t[e] = t, t.prototype.jsonID = e, t;
	}
}, yt = class e {
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
			if (t instanceof g) return e.fail(t.message);
			throw t;
		}
	}
};
function bt(e, t, n) {
	let r = [];
	for (let i = 0; i < e.childCount; i++) {
		let a = e.child(i);
		a.content.size && (a = a.copy(bt(a.content, t, a))), a.isInline && (a = t(a, n, i)), r.push(a);
	}
	return d.fromArray(r);
}
var xt = class e extends vt {
	constructor(e, t, n) {
		super(), this.from = e, this.to = t, this.mark = n;
	}
	apply(e) {
		let t = e.slice(this.from, this.to), n = e.resolve(this.from), r = n.node(n.sharedDepth(this.to)), i = new _(bt(t.content, (e, t) => !e.isAtom || !t.type.allowsMarkType(this.mark.type) ? e : e.mark(this.mark.addToSet(e.marks)), r), t.openStart, t.openEnd);
		return yt.fromReplace(e, this.from, this.to, i);
	}
	invert() {
		return new St(this.from, this.to, this.mark);
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
vt.jsonID("addMark", xt);
var St = class e extends vt {
	constructor(e, t, n) {
		super(), this.from = e, this.to = t, this.mark = n;
	}
	apply(e) {
		let t = e.slice(this.from, this.to), n = new _(bt(t.content, (e) => e.mark(this.mark.removeFromSet(e.marks)), e), t.openStart, t.openEnd);
		return yt.fromReplace(e, this.from, this.to, n);
	}
	invert() {
		return new xt(this.from, this.to, this.mark);
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
vt.jsonID("removeMark", St);
var Ct = class e extends vt {
	constructor(e, t) {
		super(), this.pos = e, this.mark = t;
	}
	apply(e) {
		let t = e.nodeAt(this.pos);
		if (!t) return yt.fail("No node at mark step's position");
		let n = t.type.create(t.attrs, null, this.mark.addToSet(t.marks));
		return yt.fromReplace(e, this.pos, this.pos + 1, new _(d.from(n), 0, +!t.isLeaf));
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
		return new wt(this.pos, this.mark);
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
vt.jsonID("addNodeMark", Ct);
var wt = class e extends vt {
	constructor(e, t) {
		super(), this.pos = e, this.mark = t;
	}
	apply(e) {
		let t = e.nodeAt(this.pos);
		if (!t) return yt.fail("No node at mark step's position");
		let n = t.type.create(t.attrs, null, this.mark.removeFromSet(t.marks));
		return yt.fromReplace(e, this.pos, this.pos + 1, new _(d.from(n), 0, +!t.isLeaf));
	}
	invert(e) {
		let t = e.nodeAt(this.pos);
		return !t || !this.mark.isInSet(t.marks) ? this : new Ct(this.pos, this.mark);
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
vt.jsonID("removeNodeMark", wt);
var Tt = class e extends vt {
	constructor(e, t, n, r = !1) {
		super(), this.from = e, this.to = t, this.slice = n, this.structure = r;
	}
	apply(e) {
		return this.structure && Dt(e, this.from, this.to) ? yt.fail("Structure replace would overwrite content") : yt.fromReplace(e, this.from, this.to, this.slice);
	}
	getMap() {
		return new ht([
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
			let n = this.slice.size + t.slice.size == 0 ? _.empty : new _(this.slice.content.append(t.slice.content), this.slice.openStart, t.slice.openEnd);
			return new e(this.from, this.to + (t.to - t.from), n, this.structure);
		} else if (t.to == this.from && !this.slice.openStart && !t.slice.openEnd) {
			let n = this.slice.size + t.slice.size == 0 ? _.empty : new _(t.slice.content.append(this.slice.content), t.slice.openStart, this.slice.openEnd);
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
		return new e(n.from, n.to, _.fromJSON(t, n.slice), !!n.structure);
	}
};
Tt.MAP_BIAS = 1, vt.jsonID("replace", Tt);
var Et = class e extends vt {
	constructor(e, t, n, r, i, a, o = !1) {
		super(), this.from = e, this.to = t, this.gapFrom = n, this.gapTo = r, this.slice = i, this.insert = a, this.structure = o;
	}
	apply(e) {
		if (this.structure && (Dt(e, this.from, this.gapFrom) || Dt(e, this.gapTo, this.to))) return yt.fail("Structure gap-replace would overwrite content");
		let t = e.slice(this.gapFrom, this.gapTo);
		if (t.openStart || t.openEnd) return yt.fail("Gap is not a flat range");
		let n = this.slice.insertAt(this.insert, t.content);
		return n ? yt.fromReplace(e, this.from, this.to, n) : yt.fail("Content does not fit in gap");
	}
	getMap() {
		return new ht([
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
		return new e(n.from, n.to, n.gapFrom, n.gapTo, _.fromJSON(t, n.slice), n.insert, !!n.structure);
	}
};
vt.jsonID("replaceAround", Et);
function Dt(e, t, n) {
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
function Ot(e, t, n, r) {
	let i = [], a = [], o, s;
	e.doc.nodesBetween(t, n, (e, c, l) => {
		if (!e.isInline) return;
		let u = e.marks;
		if (!r.isInSet(u) && l.type.allowsMarkType(r.type)) {
			let l = Math.max(c, t), d = Math.min(c + e.nodeSize, n), f = r.addToSet(u);
			for (let e = 0; e < u.length; e++) u[e].isInSet(f) || (o && o.to == l && o.mark.eq(u[e]) ? o.to = d : i.push(o = new St(l, d, u[e])));
			s && s.to == l ? s.to = d : a.push(s = new xt(l, d, r));
		}
	}), i.forEach((t) => e.step(t)), a.forEach((t) => e.step(t));
}
function kt(e, t, n, r) {
	let i = [], a = 0;
	e.doc.nodesBetween(t, n, (e, o) => {
		if (!e.isInline) return;
		a++;
		let s = null;
		if (r instanceof Ne) {
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
	}), i.forEach((t) => e.step(new St(t.from, t.to, t.style)));
}
function At(e, t, n, r = n.contentMatch, i = !0) {
	let a = e.doc.nodeAt(t), o = [], s = t + 1;
	for (let t = 0; t < a.childCount; t++) {
		let c = a.child(t), l = s + c.nodeSize, u = r.matchType(c.type);
		if (!u) o.push(new Tt(s, l, _.empty));
		else {
			r = u;
			for (let t = 0; t < c.marks.length; t++) n.allowsMarkType(c.marks[t].type) || e.step(new St(s, l, c.marks[t]));
			if (i && c.isText && n.whitespace != "pre") {
				let e, t = /\r?\n|\r/g, r;
				for (; e = t.exec(c.text);) r ||= new _(d.from(n.schema.text(" ", n.allowedMarks(c.marks))), 0, 0), o.push(new Tt(s + e.index, s + e.index + e[0].length, r));
			}
		}
		s = l;
	}
	if (!r.validEnd) {
		let t = r.fillBefore(d.empty, !0);
		e.replace(s, s, new _(t, 0, 0));
	}
	for (let t = o.length - 1; t >= 0; t--) e.step(o[t]);
}
function jt(e, t, n) {
	return (t == 0 || e.canReplace(t, e.childCount)) && (n == e.childCount || e.canReplace(0, n));
}
function Mt(e) {
	let t = e.parent.content.cutByIndex(e.startIndex, e.endIndex);
	for (let n = e.depth, r = 0, i = 0;; --n) {
		let a = e.$from.node(n), o = e.$from.index(n) + r, s = e.$to.indexAfter(n) - i;
		if (n < e.depth && a.canReplace(o, s, t)) return n;
		if (n == 0 || a.type.spec.isolating || !jt(a, o, s)) break;
		o && (r = 1), s < a.childCount && (i = 1);
	}
	return null;
}
function Nt(e, t, n) {
	let { $from: r, $to: i, depth: a } = t, o = r.before(a + 1), s = i.after(a + 1), c = o, l = s, u = d.empty, f = 0;
	for (let e = a, t = !1; e > n; e--) t || r.index(e) > 0 ? (t = !0, u = d.from(r.node(e).copy(u)), f++) : c--;
	let p = d.empty, m = 0;
	for (let e = a, t = !1; e > n; e--) t || i.after(e + 1) < i.end(e) ? (t = !0, p = d.from(i.node(e).copy(p)), m++) : l++;
	e.step(new Et(c, l, o, s, new _(u.append(p), f, m), u.size - f, !0));
}
function Pt(e, t, n = null, r = e) {
	let i = It(e, t), a = i && Lt(r, t);
	return a ? i.map(Ft).concat({
		type: t,
		attrs: n
	}).concat(a.map(Ft)) : null;
}
function Ft(e) {
	return {
		type: e,
		attrs: null
	};
}
function It(e, t) {
	let { parent: n, startIndex: r, endIndex: i } = e, a = n.contentMatchAt(r).findWrapping(t);
	if (!a) return null;
	let o = a.length ? a[0] : t;
	return n.canReplaceWith(r, i, o) ? a : null;
}
function Lt(e, t) {
	let { parent: n, startIndex: r, endIndex: i } = e, a = n.child(r), o = t.contentMatch.findWrapping(a.type);
	if (!o) return null;
	let s = (o.length ? o[o.length - 1] : t).contentMatch;
	for (let e = r; s && e < i; e++) s = s.matchType(n.child(e).type);
	return !s || !s.validEnd ? null : o;
}
function Rt(e, t, n) {
	let r = d.empty;
	for (let e = n.length - 1; e >= 0; e--) {
		if (r.size) {
			let t = n[e].type.contentMatch.matchFragment(r);
			if (!t || !t.validEnd) throw RangeError("Wrapper type given to Transform.wrap does not form valid content of its parent wrapper");
		}
		r = d.from(n[e].type.create(n[e].attrs, r));
	}
	let i = t.start, a = t.end;
	e.step(new Et(i, a, i, a, new _(r, 0, 0), n.length, !0));
}
function zt(e, t, n, r, i) {
	if (!r.isTextblock) throw RangeError("Type given to setBlockType should be a textblock");
	let a = e.steps.length;
	e.doc.nodesBetween(t, n, (t, n) => {
		let o = typeof i == "function" ? i(t) : i;
		if (t.isTextblock && !t.hasMarkup(r, o) && Ht(e.doc, e.mapping.slice(a).map(n), r)) {
			let i = null;
			if (r.schema.linebreakReplacement) {
				let e = r.whitespace == "pre", t = !!r.contentMatch.matchType(r.schema.linebreakReplacement);
				e && !t ? i = !1 : !e && t && (i = !0);
			}
			i === !1 && Vt(e, t, n, a), At(e, e.mapping.slice(a).map(n, 1), r, void 0, i === null);
			let s = e.mapping.slice(a), c = s.map(n, 1), l = s.map(n + t.nodeSize, 1);
			return e.step(new Et(c, l, c + 1, l - 1, new _(d.from(r.create(o, null, t.marks)), 0, 0), 1, !0)), i === !0 && Bt(e, t, n, a), !1;
		}
	});
}
function Bt(e, t, n, r) {
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
function Vt(e, t, n, r) {
	t.forEach((i, a) => {
		if (i.type == i.type.schema.linebreakReplacement) {
			let i = e.mapping.slice(r).map(n + 1 + a);
			e.replaceWith(i, i + 1, t.type.schema.text("\n"));
		}
	});
}
function Ht(e, t, n) {
	let r = e.resolve(t), i = r.index();
	return r.parent.canReplaceWith(i, i + 1, n);
}
function Ut(e, t, n, r, i) {
	let a = e.doc.nodeAt(t);
	if (!a) throw RangeError("No node at given position");
	n ||= a.type;
	let o = n.create(r, null, i || a.marks);
	if (a.isLeaf) return e.replaceWith(t, t + a.nodeSize, o);
	if (!n.validContent(a.content)) throw RangeError("Invalid content for node type " + n.name);
	e.step(new Et(t, t + a.nodeSize, t + 1, t + a.nodeSize - 1, new _(d.from(o), 0, 0), 1, !0));
}
function Wt(e, t, n = 1, r) {
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
function Gt(e, t, n = 1, r) {
	let i = e.doc.resolve(t), a = d.empty, o = d.empty;
	for (let e = i.depth, t = i.depth - n, s = n - 1; e > t; e--, s--) {
		a = d.from(i.node(e).copy(a));
		let t = r && r[s];
		o = d.from(t ? t.type.create(t.attrs, o) : i.node(e).copy(o));
	}
	e.step(new Tt(t, t, new _(a.append(o), n, n), !0));
}
function Kt(e, t) {
	let n = e.resolve(t), r = n.index();
	return Jt(n.nodeBefore, n.nodeAfter) && n.parent.canReplace(r, r + 1);
}
function qt(e, t) {
	t.content.size || e.type.compatibleContent(t.type);
	let n = e.contentMatchAt(e.childCount), { linebreakReplacement: r } = e.type.schema;
	for (let i = 0; i < t.childCount; i++) {
		let a = t.child(i), o = a.type == r ? e.type.schema.nodes.text : a.type;
		if (n = n.matchType(o), !n || !e.type.allowsMarks(a.marks)) return !1;
	}
	return n.validEnd;
}
function Jt(e, t) {
	return !!(e && t && !e.isLeaf && qt(e, t));
}
function Yt(e, t, n = -1) {
	let r = e.resolve(t);
	for (let e = r.depth;; e--) {
		let i, a, o = r.index(e);
		if (e == r.depth ? (i = r.nodeBefore, a = r.nodeAfter) : n > 0 ? (i = r.node(e + 1), o++, a = r.node(e).maybeChild(o)) : (i = r.node(e).maybeChild(o - 1), a = r.node(e + 1)), i && !i.isTextblock && Jt(i, a) && r.node(e).canReplace(o, o + 1)) return t;
		if (e == 0) break;
		t = n < 0 ? r.before(e) : r.after(e);
	}
}
function Xt(e, t, n) {
	let r = null, { linebreakReplacement: i } = e.doc.type.schema, a = e.doc.resolve(t - n), o = a.node().type;
	if (i && o.inlineContent) {
		let e = o.whitespace == "pre", t = !!o.contentMatch.matchType(i);
		e && !t ? r = !1 : !e && t && (r = !0);
	}
	let s = e.steps.length;
	if (r === !1) {
		let r = e.doc.resolve(t + n);
		Vt(e, r.node(), r.before(), s);
	}
	o.inlineContent && At(e, t + n - 1, o, a.node().contentMatchAt(a.index()), r == null);
	let c = e.mapping.slice(s), l = c.map(t - n);
	if (e.step(new Tt(l, c.map(t + n, -1), _.empty, !0)), r === !0) {
		let t = e.doc.resolve(l);
		Bt(e, t.node(), t.before(), e.steps.length);
	}
	return e;
}
function Zt(e, t, n) {
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
function Qt(e, t, n) {
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
function $t(e, t, n = t, r = _.empty) {
	if (t == n && !r.size) return null;
	let i = e.resolve(t), a = e.resolve(n);
	return en(i, a, r) ? new Tt(t, n, r) : new tn(i, a, r).fit();
}
function en(e, t, n) {
	return !n.openStart && !n.openEnd && e.start() == t.start() && e.parent.canReplace(e.index(), t.index(), n.content);
}
var tn = class {
	constructor(e, t, n) {
		this.$from = e, this.$to = t, this.unplaced = n, this.frontier = [], this.placed = d.empty;
		for (let t = 0; t <= e.depth; t++) {
			let n = e.node(t);
			this.frontier.push({
				type: n.type,
				match: n.contentMatchAt(e.indexAfter(t))
			});
		}
		for (let t = e.depth; t > 0; t--) this.placed = d.from(e.node(t).copy(this.placed));
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
		let s = new _(i, a, o);
		return e > -1 ? new Et(n.pos, e, this.$to.pos, this.$to.end(), s, t) : s.size || n.pos != this.$to.pos ? new Tt(n.pos, r.pos, s) : null;
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
			n ? (r = an(this.unplaced.content, n - 1).firstChild, e = r.content) : e = this.unplaced.content;
			let i = e.firstChild;
			for (let e = this.depth; e >= 0; e--) {
				let { type: a, match: o } = this.frontier[e], s, c = null;
				if (t == 1 && (i ? o.matchType(i.type) || (c = o.fillBefore(d.from(i), !1)) : r && a.compatibleContent(r.type))) return {
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
		let { content: e, openStart: t, openEnd: n } = this.unplaced, r = an(e, t);
		return !r.childCount || r.firstChild.isLeaf ? !1 : (this.unplaced = new _(e, t + 1, Math.max(n, r.size + t >= e.size - n ? t + 1 : 0)), !0);
	}
	dropNode() {
		let { content: e, openStart: t, openEnd: n } = this.unplaced, r = an(e, t);
		if (r.childCount <= 1 && t > 0) {
			let i = e.size - t <= t + r.size;
			this.unplaced = new _(nn(e, t - 1, 1), t - 1, i ? t - 1 : n);
		} else this.unplaced = new _(nn(e, t, 1), t, n);
	}
	placeNodes({ sliceDepth: e, frontierDepth: t, parent: n, inject: r, wrap: i }) {
		for (; this.depth > t;) this.closeFrontierNode();
		if (i) for (let e = 0; e < i.length; e++) this.openFrontierNode(i[e]);
		let a = this.unplaced, o = n ? n.content : a.content, s = a.openStart - e, c = 0, l = [], { match: u, type: f } = this.frontier[t];
		if (r) {
			for (let e = 0; e < r.childCount; e++) l.push(r.child(e));
			u = u.matchFragment(r);
		}
		let p = o.size + e - (a.content.size - a.openEnd);
		for (; c < o.childCount;) {
			let e = o.child(c), t = u.matchType(e.type);
			if (!t) break;
			c++, (c > 1 || s == 0 || e.content.size) && (u = t, l.push(on(e.mark(f.allowedMarks(e.marks)), c == 1 ? s : 0, c == o.childCount ? p : -1)));
		}
		let m = c == o.childCount;
		m || (p = -1), this.placed = rn(this.placed, t, d.from(l)), this.frontier[t].match = u, m && p < 0 && n && n.type == this.frontier[this.depth].type && this.frontier.length > 1 && this.closeFrontierNode();
		for (let e = 0, t = o; e < p; e++) {
			let e = t.lastChild;
			this.frontier.push({
				type: e.type,
				match: e.contentMatchAt(e.childCount)
			}), t = e.content;
		}
		this.unplaced = m ? e == 0 ? _.empty : new _(nn(a.content, e - 1, 1), e - 1, p < 0 ? a.openEnd : e - 1) : new _(nn(a.content, e, c), a.openStart, a.openEnd);
	}
	mustMoveInline() {
		if (!this.$to.parent.isTextblock) return -1;
		let e = this.frontier[this.depth], t;
		if (!e.type.isTextblock || !sn(this.$to, this.$to.depth, e.type, e.match, !1) || this.$to.depth == this.depth && (t = this.findCloseLevel(this.$to)) && t.depth == this.depth) return -1;
		let { depth: n } = this.$to, r = this.$to.after(n);
		for (; n > 1 && r == this.$to.end(--n);) ++r;
		return r;
	}
	findCloseLevel(e) {
		scan: for (let t = Math.min(this.depth, e.depth); t >= 0; t--) {
			let { match: n, type: r } = this.frontier[t], i = t < e.depth && e.end(t + 1) == e.pos + (e.depth - (t + 1)), a = sn(e, t, r, n, i);
			if (a) {
				for (let n = t - 1; n >= 0; n--) {
					let { match: t, type: r } = this.frontier[n], i = sn(e, n, r, t, !0);
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
		t.fit.childCount && (this.placed = rn(this.placed, t.depth, t.fit)), e = t.move;
		for (let n = t.depth + 1; n <= e.depth; n++) {
			let t = e.node(n), r = t.type.contentMatch.fillBefore(t.content, !0, e.index(n));
			this.openFrontierNode(t.type, t.attrs, r);
		}
		return e;
	}
	openFrontierNode(e, t = null, n) {
		let r = this.frontier[this.depth];
		r.match = r.match.matchType(e), this.placed = rn(this.placed, this.depth, d.from(e.create(t, n))), this.frontier.push({
			type: e,
			match: e.contentMatch
		});
	}
	closeFrontierNode() {
		let e = this.frontier.pop().match.fillBefore(d.empty, !0);
		e.childCount && (this.placed = rn(this.placed, this.frontier.length, e));
	}
};
function nn(e, t, n) {
	return t == 0 ? e.cutByIndex(n, e.childCount) : e.replaceChild(0, e.firstChild.copy(nn(e.firstChild.content, t - 1, n)));
}
function rn(e, t, n) {
	return t == 0 ? e.append(n) : e.replaceChild(e.childCount - 1, e.lastChild.copy(rn(e.lastChild.content, t - 1, n)));
}
function an(e, t) {
	for (let n = 0; n < t; n++) e = e.firstChild.content;
	return e;
}
function on(e, t, n) {
	if (t <= 0) return e;
	let r = e.content;
	return t > 1 && (r = r.replaceChild(0, on(r.firstChild, t - 1, r.childCount == 1 ? n - 1 : 0))), t > 0 && (r = e.type.contentMatch.fillBefore(r).append(r), n <= 0 && (r = r.append(e.type.contentMatch.matchFragment(r).fillBefore(d.empty, !0)))), e.copy(r);
}
function sn(e, t, n, r, i) {
	let a = e.node(t), o = i ? e.indexAfter(t) : e.index(t);
	if (o == a.childCount && !n.compatibleContent(a.type)) return null;
	let s = r.fillBefore(a.content, !0, o);
	return s && !cn(n, a.content, o) ? s : null;
}
function cn(e, t, n) {
	for (let r = n; r < t.childCount; r++) if (!e.allowsMarks(t.child(r).marks)) return !0;
	return !1;
}
function ln(e) {
	return e.spec.defining || e.spec.definingForContent;
}
function un(e, t, n, r) {
	if (!r.size) return e.deleteRange(t, n);
	let i = e.doc.resolve(t), a = e.doc.resolve(n);
	if (en(i, a, r)) return e.step(new Tt(t, n, r));
	let o = mn(i, a);
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
		let t = l[e], n = ln(t.type);
		if (n && !t.sameMarkup(i.node(Math.abs(s) - 1))) u = e;
		else if (n || !t.type.isTextblock) break;
	}
	for (let t = r.openStart; t >= 0; t--) {
		let s = (t + u + 1) % (r.openStart + 1), d = l[s];
		if (d) for (let t = 0; t < o.length; t++) {
			let l = o[(t + c) % o.length], u = !0;
			l < 0 && (u = !1, l = -l);
			let f = i.node(l - 1), p = i.index(l - 1);
			if (f.canReplaceWith(p, p, d.type, d.marks)) return e.replace(i.before(l), u ? a.after(l) : n, new _(dn(r.content, 0, r.openStart, s), s, r.openEnd));
		}
	}
	let d = e.steps.length;
	for (let s = o.length - 1; s >= 0 && (e.replace(t, n, r), !(e.steps.length > d)); s--) {
		let e = o[s];
		e < 0 || (t = i.before(e), n = a.after(e));
	}
}
function dn(e, t, n, r, i) {
	if (t < n) {
		let i = e.firstChild;
		e = e.replaceChild(0, i.copy(dn(i.content, t + 1, n, r, i)));
	}
	if (t > r) {
		let t = i.contentMatchAt(0), n = t.fillBefore(e).append(e);
		e = n.append(t.matchFragment(n).fillBefore(d.empty, !0));
	}
	return e;
}
function fn(e, t, n, r) {
	if (!r.isInline && t == n && e.doc.resolve(t).parent.content.size) {
		let i = Zt(e.doc, t, r.type);
		i != null && (t = n = i);
	}
	e.replaceRange(t, n, new _(d.from(r), 0, 0));
}
function pn(e, t, n) {
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
	let a = mn(r, i);
	for (let t = 0; t < a.length; t++) {
		let n = a[t], o = t == a.length - 1;
		if (o && n == 0 || r.node(n).type.contentMatch.validEnd) return e.delete(r.start(n), i.end(n));
		if (n > 0 && (o || r.node(n - 1).canReplace(r.index(n - 1), i.indexAfter(n - 1)))) return e.delete(r.before(n), i.after(n));
	}
	for (let a = 1; a <= r.depth && a <= i.depth; a++) if (t - r.start(a) == r.depth - a && n > r.end(a) && i.end(a) - n != i.depth - a && r.start(a - 1) == i.start(a - 1) && r.node(a - 1).canReplace(r.index(a - 1), i.index(a - 1))) return e.delete(r.before(a), n);
	e.delete(t, n);
}
function mn(e, t) {
	let n = [], r = Math.min(e.depth, t.depth);
	for (let i = r; i >= 0; i--) {
		let r = e.start(i);
		if (r < e.pos - (e.depth - i) || t.end(i) > t.pos + (t.depth - i) || e.node(i).type.spec.isolating || t.node(i).type.spec.isolating) break;
		(r == t.start(i) || i == e.depth && i == t.depth && e.parent.inlineContent && t.parent.inlineContent && i && t.start(i - 1) == r - 1) && n.push(i);
	}
	return n;
}
var hn = class e extends vt {
	constructor(e, t, n) {
		super(), this.pos = e, this.attr = t, this.value = n;
	}
	apply(e) {
		let t = e.nodeAt(this.pos);
		if (!t) return yt.fail("No node at attribute step's position");
		let n = Object.create(null);
		for (let e in t.attrs) n[e] = t.attrs[e];
		n[this.attr] = this.value;
		let r = t.type.create(n, null, t.marks);
		return yt.fromReplace(e, this.pos, this.pos + 1, new _(d.from(r), 0, +!t.isLeaf));
	}
	getMap() {
		return ht.empty;
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
vt.jsonID("attr", hn);
var gn = class e extends vt {
	constructor(e, t) {
		super(), this.attr = e, this.value = t;
	}
	apply(e) {
		let t = Object.create(null);
		for (let n in e.attrs) t[n] = e.attrs[n];
		t[this.attr] = this.value;
		let n = e.type.create(t, e.content, e.marks);
		return yt.ok(n);
	}
	getMap() {
		return ht.empty;
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
vt.jsonID("docAttr", gn);
var _n = class extends Error {};
_n = function e(t) {
	let n = Error.call(this, t);
	return n.__proto__ = e.prototype, n;
}, _n.prototype = Object.create(Error.prototype), _n.prototype.constructor = _n, _n.prototype.name = "TransformError";
var vn = class {
	constructor(e) {
		this.doc = e, this.steps = [], this.docs = [], this.mapping = new gt();
	}
	get before() {
		return this.docs.length ? this.docs[0] : this.doc;
	}
	step(e) {
		let t = this.maybeStep(e);
		if (t.failed) throw new _n(t.failed);
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
	replace(e, t = e, n = _.empty) {
		let r = $t(this.doc, e, t, n);
		return r && this.step(r), this;
	}
	replaceWith(e, t, n) {
		return this.replace(e, t, new _(d.from(n), 0, 0));
	}
	delete(e, t) {
		return this.replace(e, t, _.empty);
	}
	insert(e, t) {
		return this.replaceWith(e, e, t);
	}
	replaceRange(e, t, n) {
		return un(this, e, t, n), this;
	}
	replaceRangeWith(e, t, n) {
		return fn(this, e, t, n), this;
	}
	deleteRange(e, t) {
		return pn(this, e, t), this;
	}
	lift(e, t) {
		return Nt(this, e, t), this;
	}
	join(e, t = 1) {
		return Xt(this, e, t), this;
	}
	wrap(e, t) {
		return Rt(this, e, t), this;
	}
	setBlockType(e, t = e, n, r = null) {
		return zt(this, e, t, n, r), this;
	}
	setNodeMarkup(e, t, n = null, r) {
		return Ut(this, e, t, n, r), this;
	}
	setNodeAttribute(e, t, n) {
		return this.step(new hn(e, t, n)), this;
	}
	setDocAttribute(e, t) {
		return this.step(new gn(e, t)), this;
	}
	addNodeMark(e, t) {
		return this.step(new Ct(e, t)), this;
	}
	removeNodeMark(e, t) {
		let n = this.doc.nodeAt(e);
		if (!n) throw RangeError("No node at position " + e);
		if (t instanceof h) t.isInSet(n.marks) && this.step(new wt(e, t));
		else {
			let r = n.marks, i, a = [];
			for (; i = t.isInSet(r);) a.push(new wt(e, i)), r = i.removeFromSet(r);
			for (let e = a.length - 1; e >= 0; e--) this.step(a[e]);
		}
		return this;
	}
	split(e, t = 1, n) {
		return Gt(this, e, t, n), this;
	}
	addMark(e, t, n) {
		return Ot(this, e, t, n), this;
	}
	removeMark(e, t, n) {
		return kt(this, e, t, n), this;
	}
	clearIncompatible(e, t, n) {
		return At(this, e, t, n), this;
	}
}, yn = Object.create(null), D = class {
	constructor(e, t, n) {
		this.$anchor = e, this.$head = t, this.ranges = n || [new bn(e.min(t), e.max(t))];
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
	replace(e, t = _.empty) {
		let n = t.content.lastChild, r = null;
		for (let e = 0; e < t.openEnd; e++) r = n, n = n.lastChild;
		let i = e.steps.length, a = this.ranges;
		for (let o = 0; o < a.length; o++) {
			let { $from: s, $to: c } = a[o], l = e.mapping.slice(i);
			e.replaceRange(l.map(s.pos), l.map(c.pos), o ? _.empty : t), o == 0 && On(e, i, (n ? n.isInline : r && r.isTextblock) ? -1 : 1);
		}
	}
	replaceWith(e, t) {
		let n = e.steps.length, r = this.ranges;
		for (let i = 0; i < r.length; i++) {
			let { $from: a, $to: o } = r[i], s = e.mapping.slice(n), c = s.map(a.pos), l = s.map(o.pos);
			i ? e.deleteRange(c, l) : (e.replaceRangeWith(c, l, t), On(e, n, t.isInline ? -1 : 1));
		}
	}
	static findFrom(e, t, n = !1) {
		let r = e.parent.inlineContent ? new O(e) : Dn(e.node(0), e.parent, e.pos, e.index(), t, n);
		if (r) return r;
		for (let r = e.depth - 1; r >= 0; r--) {
			let i = t < 0 ? Dn(e.node(0), e.node(r), e.before(r + 1), e.index(r), t, n) : Dn(e.node(0), e.node(r), e.after(r + 1), e.index(r) + 1, t, n);
			if (i) return i;
		}
		return null;
	}
	static near(e, t = 1) {
		return this.findFrom(e, t) || this.findFrom(e, -t) || new Tn(e.node(0));
	}
	static atStart(e) {
		return Dn(e, e, 0, 0, 1) || new Tn(e);
	}
	static atEnd(e) {
		return Dn(e, e, e.content.size, e.childCount, -1) || new Tn(e);
	}
	static fromJSON(e, t) {
		if (!t || !t.type) throw RangeError("Invalid input for Selection.fromJSON");
		let n = yn[t.type];
		if (!n) throw RangeError(`No selection type ${t.type} defined`);
		return n.fromJSON(e, t);
	}
	static jsonID(e, t) {
		if (e in yn) throw RangeError("Duplicate use of selection JSON ID " + e);
		return yn[e] = t, t.prototype.jsonID = e, t;
	}
	getBookmark() {
		return O.between(this.$anchor, this.$head).getBookmark();
	}
};
D.prototype.visible = !0;
var bn = class {
	constructor(e, t) {
		this.$from = e, this.$to = t;
	}
}, xn = !1;
function Sn(e) {
	!xn && !e.parent.inlineContent && (xn = !0, console.warn("TextSelection endpoint not pointing into a node with inline content (" + e.parent.type.name + ")"));
}
var O = class e extends D {
	constructor(e, t = e) {
		Sn(e), Sn(t), super(e, t);
	}
	get $cursor() {
		return this.$anchor.pos == this.$head.pos ? this.$head : null;
	}
	map(t, n) {
		let r = t.resolve(n.map(this.head));
		if (!r.parent.inlineContent) return D.near(r);
		let i = t.resolve(n.map(this.anchor));
		return new e(i.parent.inlineContent ? i : r, r);
	}
	replace(e, t = _.empty) {
		if (super.replace(e, t), t == _.empty) {
			let t = this.$from.marksAcross(this.$to);
			t && e.ensureMarks(t);
		}
	}
	eq(t) {
		return t instanceof e && t.anchor == this.anchor && t.head == this.head;
	}
	getBookmark() {
		return new Cn(this.anchor, this.head);
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
			let e = D.findFrom(n, r, !0) || D.findFrom(n, -r, !0);
			if (e) n = e.$head;
			else return D.near(n, r);
		}
		return t.parent.inlineContent || (i == 0 ? t = n : (t = (D.findFrom(t, -r, !0) || D.findFrom(t, r, !0)).$anchor, t.pos < n.pos != i < 0 && (t = n))), new e(t, n);
	}
};
D.jsonID("text", O);
var Cn = class e {
	constructor(e, t) {
		this.anchor = e, this.head = t;
	}
	map(t) {
		return new e(t.map(this.anchor), t.map(this.head));
	}
	resolve(e) {
		return O.between(e.resolve(this.anchor), e.resolve(this.head));
	}
}, k = class e extends D {
	constructor(e) {
		let t = e.nodeAfter, n = e.node(0).resolve(e.pos + t.nodeSize);
		super(e, n), this.node = t;
	}
	map(t, n) {
		let { deleted: r, pos: i } = n.mapResult(this.anchor), a = t.resolve(i);
		return r ? D.near(a) : new e(a);
	}
	content() {
		return new _(d.from(this.node), 0, 0);
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
		return new wn(this.anchor);
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
k.prototype.visible = !1, D.jsonID("node", k);
var wn = class e {
	constructor(e) {
		this.anchor = e;
	}
	map(t) {
		let { deleted: n, pos: r } = t.mapResult(this.anchor);
		return n ? new Cn(r, r) : new e(r);
	}
	resolve(e) {
		let t = e.resolve(this.anchor), n = t.nodeAfter;
		return n && k.isSelectable(n) ? new k(t) : D.near(t);
	}
}, Tn = class e extends D {
	constructor(e) {
		super(e.resolve(0), e.resolve(e.content.size));
	}
	replace(e, t = _.empty) {
		if (t == _.empty) {
			e.delete(0, e.doc.content.size);
			let t = D.atStart(e.doc);
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
		return En;
	}
};
D.jsonID("all", Tn);
var En = {
	map() {
		return this;
	},
	resolve(e) {
		return new Tn(e);
	}
};
function Dn(e, t, n, r, i, a = !1) {
	if (t.inlineContent) return O.create(e, n);
	for (let o = r - (i > 0 ? 0 : 1); i > 0 ? o < t.childCount : o >= 0; o += i) {
		let r = t.child(o);
		if (!r.isAtom) {
			let t = Dn(e, r, n + i, i < 0 ? r.childCount : 0, i, a);
			if (t) return t;
		} else if (!a && k.isSelectable(r)) return k.create(e, n - (i < 0 ? r.nodeSize : 0));
		n += r.nodeSize * i;
	}
	return null;
}
function On(e, t, n) {
	let r = e.steps.length - 1;
	if (r < t) return;
	let i = e.steps[r];
	if (!(i instanceof Tt || i instanceof Et)) return;
	let a = e.mapping.maps[r], o;
	a.forEach((e, t, n, r) => {
		o ??= r;
	}), e.setSelection(D.near(e.doc.resolve(o), n));
}
var kn = 1, An = 2, jn = 4, Mn = class extends vn {
	constructor(e) {
		super(e.doc), this.curSelectionFor = 0, this.updated = 0, this.meta = Object.create(null), this.time = Date.now(), this.curSelection = e.selection, this.storedMarks = e.storedMarks;
	}
	get selection() {
		return this.curSelectionFor < this.steps.length && (this.curSelection = this.curSelection.map(this.doc, this.mapping.slice(this.curSelectionFor)), this.curSelectionFor = this.steps.length), this.curSelection;
	}
	setSelection(e) {
		if (e.$from.doc != this.doc) throw RangeError("Selection passed to setSelection must point at the current document");
		return this.curSelection = e, this.curSelectionFor = this.steps.length, this.updated = (this.updated | kn) & ~An, this.storedMarks = null, this;
	}
	get selectionSet() {
		return (this.updated & kn) > 0;
	}
	setStoredMarks(e) {
		return this.storedMarks = e, this.updated |= An, this;
	}
	ensureMarks(e) {
		return h.sameSet(this.storedMarks || this.selection.$from.marks(), e) || this.setStoredMarks(e), this;
	}
	addStoredMark(e) {
		return this.ensureMarks(e.addToSet(this.storedMarks || this.selection.$head.marks()));
	}
	removeStoredMark(e) {
		return this.ensureMarks(e.removeFromSet(this.storedMarks || this.selection.$head.marks()));
	}
	get storedMarksSet() {
		return (this.updated & An) > 0;
	}
	addStep(e, t) {
		super.addStep(e, t), this.updated &= ~An, this.storedMarks = null;
	}
	setTime(e) {
		return this.time = e, this;
	}
	replaceSelection(e) {
		return this.selection.replace(this, e), this;
	}
	replaceSelectionWith(e, t = !0) {
		let n = this.selection;
		return t && (e = e.mark(this.storedMarks || (n.empty ? n.$from.marks() : n.$from.marksAcross(n.$to) || h.none))), n.replaceWith(this, e), this;
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
			return this.replaceRangeWith(t, n, r.text(e, i)), !this.selection.empty && this.selection.to == t + e.length && this.setSelection(D.near(this.selection.$to)), this;
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
		return this.updated |= jn, this;
	}
	get scrolledIntoView() {
		return (this.updated & jn) > 0;
	}
};
function Nn(e, t) {
	return !t || !e ? e : e.bind(t);
}
var Pn = class {
	constructor(e, t, n) {
		this.name = e, this.init = Nn(t.init, n), this.apply = Nn(t.apply, n);
	}
}, Fn = [
	new Pn("doc", {
		init(e) {
			return e.doc || e.schema.topNodeType.createAndFill();
		},
		apply(e) {
			return e.doc;
		}
	}),
	new Pn("selection", {
		init(e, t) {
			return e.selection || D.atStart(t.doc);
		},
		apply(e) {
			return e.selection;
		}
	}),
	new Pn("storedMarks", {
		init(e) {
			return e.storedMarks || null;
		},
		apply(e, t, n, r) {
			return r.selection.$cursor ? e.storedMarks : null;
		}
	}),
	new Pn("scrollToSelection", {
		init() {
			return 0;
		},
		apply(e, t) {
			return e.scrolledIntoView ? t + 1 : t;
		}
	})
], In = class {
	constructor(e, t) {
		this.schema = e, this.plugins = [], this.pluginsByKey = Object.create(null), this.fields = Fn.slice(), t && t.forEach((e) => {
			if (this.pluginsByKey[e.key]) throw RangeError("Adding different instances of a keyed plugin (" + e.key + ")");
			this.plugins.push(e), this.pluginsByKey[e.key] = e, e.spec.state && this.fields.push(new Pn(e.key, e.spec.state, e));
		});
	}
}, Ln = class e {
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
		return new Mn(this);
	}
	static create(t) {
		let n = new In(t.doc ? t.doc.type.schema : t.schema, t.plugins), r = new e(n);
		for (let e = 0; e < n.fields.length; e++) r[n.fields[e].name] = n.fields[e].init(t, r);
		return r;
	}
	reconfigure(t) {
		let n = new In(this.schema, t.plugins), r = n.fields, i = new e(n);
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
		let i = new In(t.schema, t.plugins), a = new e(i);
		return i.fields.forEach((e) => {
			if (e.name == "doc") a.doc = le.fromJSON(t.schema, n.doc);
			else if (e.name == "selection") a.selection = D.fromJSON(a.doc, n.selection);
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
function Rn(e, t, n) {
	for (let r in e) {
		let i = e[r];
		i instanceof Function ? i = i.bind(t) : r == "handleDOMEvents" && (i = Rn(i, t, {})), n[r] = i;
	}
	return n;
}
var zn = class {
	constructor(e) {
		this.spec = e, this.props = {}, e.props && Rn(e.props, this, this.props), this.key = e.key ? e.key.key : Vn("plugin");
	}
	getState(e) {
		return e[this.key];
	}
}, Bn = Object.create(null);
function Vn(e) {
	return e in Bn ? e + "$" + ++Bn[e] : (Bn[e] = 0, e + "$");
}
var Hn = class {
	constructor(e = "key") {
		this.key = Vn(e);
	}
	get(e) {
		return e.config.pluginsByKey[this.key];
	}
	getState(e) {
		return e[this.key];
	}
}, Un = function(e) {
	for (var t = 0;; t++) if (e = e.previousSibling, !e) return t;
}, Wn = function(e) {
	let t = e.assignedSlot || e.parentNode;
	return t && t.nodeType == 11 ? t.host : t;
}, Gn = null, Kn = function(e, t, n) {
	let r = Gn ||= document.createRange();
	return r.setEnd(e, n ?? e.nodeValue.length), r.setStart(e, t || 0), r;
}, qn = function() {
	Gn = null;
}, Jn = function(e, t, n, r) {
	return n && (Xn(e, t, n, r, -1) || Xn(e, t, n, r, 1));
}, Yn = /^(img|br|input|textarea|hr)$/i;
function Xn(e, t, n, r, i) {
	for (;;) {
		if (e == n && t == r) return !0;
		if (t == (i < 0 ? 0 : Zn(e))) {
			let n = e.parentNode;
			if (!n || n.nodeType != 1 || tr(e) || Yn.test(e.nodeName) || e.contentEditable == "false") return !1;
			t = Un(e) + (i < 0 ? 0 : 1), e = n;
		} else if (e.nodeType == 1) {
			let n = e.childNodes[t + (i < 0 ? -1 : 0)];
			if (n.nodeType == 1 && n.contentEditable == "false") if (n.pmViewDesc?.ignoreForSelection) t += i;
			else return !1;
			else e = n, t = i < 0 ? Zn(e) : 0;
		} else return !1;
	}
}
function Zn(e) {
	return e.nodeType == 3 ? e.nodeValue.length : e.childNodes.length;
}
function Qn(e, t) {
	for (;;) {
		if (e.nodeType == 3 && t) return e;
		if (e.nodeType == 1 && t > 0) {
			if (e.contentEditable == "false") return null;
			e = e.childNodes[t - 1], t = Zn(e);
		} else if (e.parentNode && !tr(e)) t = Un(e), e = e.parentNode;
		else return null;
	}
}
function $n(e, t) {
	for (;;) {
		if (e.nodeType == 3 && t < e.nodeValue.length) return e;
		if (e.nodeType == 1 && t < e.childNodes.length) {
			if (e.contentEditable == "false") return null;
			e = e.childNodes[t], t = 0;
		} else if (e.parentNode && !tr(e)) t = Un(e) + 1, e = e.parentNode;
		else return null;
	}
}
function er(e, t, n) {
	for (let r = t == 0, i = t == Zn(e); r || i;) {
		if (e == n) return !0;
		let t = Un(e);
		if (e = e.parentNode, !e) return !1;
		r &&= t == 0, i &&= t == Zn(e);
	}
}
function tr(e) {
	let t;
	for (let n = e; n && !(t = n.pmViewDesc); n = n.parentNode);
	return t && t.node && t.node.isBlock && (t.dom == e || t.contentDOM == e);
}
var nr = function(e) {
	return e.focusNode && Jn(e.focusNode, e.focusOffset, e.anchorNode, e.anchorOffset);
};
function rr(e, t) {
	let n = document.createEvent("Event");
	return n.initEvent("keydown", !0, !0), n.keyCode = e, n.key = n.code = t, n;
}
function ir(e) {
	let t = e.activeElement;
	for (; t && t.shadowRoot;) t = t.shadowRoot.activeElement;
	return t;
}
function ar(e, t, n) {
	if (e.caretPositionFromPoint) try {
		let r = e.caretPositionFromPoint(t, n);
		if (r) return {
			node: r.offsetNode,
			offset: Math.min(Zn(r.offsetNode), r.offset)
		};
	} catch {}
	if (e.caretRangeFromPoint) {
		let r = e.caretRangeFromPoint(t, n);
		if (r) return {
			node: r.startContainer,
			offset: Math.min(Zn(r.startContainer), r.startOffset)
		};
	}
}
var or = typeof navigator < "u" ? navigator : null, sr = typeof document < "u" ? document : null, cr = or && or.userAgent || "", lr = /Edge\/(\d+)/.exec(cr), ur = /MSIE \d/.exec(cr), dr = /Trident\/(?:[7-9]|\d{2,})\..*rv:(\d+)/.exec(cr), fr = !!(ur || dr || lr), pr = ur ? document.documentMode : dr ? +dr[1] : lr ? +lr[1] : 0, mr = !fr && /gecko\/(\d+)/i.test(cr);
mr && +(/Firefox\/(\d+)/.exec(cr) || [0, 0])[1];
var hr = !fr && /Chrome\/(\d+)/.exec(cr), gr = !!hr, _r = hr ? +hr[1] : 0, vr = !fr && !!or && /Apple Computer/.test(or.vendor), yr = vr && (/Mobile\/\w+/.test(cr) || !!or && or.maxTouchPoints > 2), br = yr || (or ? /Mac/.test(or.platform) : !1), xr = or ? /Win/.test(or.platform) : !1, Sr = /Android \d/.test(cr), Cr = !!sr && "webkitFontSmoothing" in sr.documentElement.style, wr = Cr ? +(/\bAppleWebKit\/(\d+)/.exec(navigator.userAgent) || [0, 0])[1] : 0;
function Tr(e) {
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
function Er(e, t) {
	return typeof e == "number" ? e : e[t];
}
function Dr(e) {
	let t = e.getBoundingClientRect(), n = t.width / e.offsetWidth || 1, r = t.height / e.offsetHeight || 1;
	return {
		left: t.left,
		right: t.left + e.clientWidth * n,
		top: t.top,
		bottom: t.top + e.clientHeight * r
	};
}
function Or(e, t, n) {
	let r = e.someProp("scrollThreshold") || 0, i = e.someProp("scrollMargin") || 5, a = e.dom.ownerDocument;
	for (let o = n || e.dom; o;) {
		if (o.nodeType != 1) {
			o = Wn(o);
			continue;
		}
		let e = o, n = e == a.body, s = n ? Tr(a) : Dr(e), c = 0, l = 0;
		if (t.top < s.top + Er(r, "top") ? l = -(s.top - t.top + Er(i, "top")) : t.bottom > s.bottom - Er(r, "bottom") && (l = t.bottom - t.top > s.bottom - s.top ? t.top + Er(i, "top") - s.top : t.bottom - s.bottom + Er(i, "bottom")), t.left < s.left + Er(r, "left") ? c = -(s.left - t.left + Er(i, "left")) : t.right > s.right - Er(r, "right") && (c = t.right - s.right + Er(i, "right")), c || l) if (n) a.defaultView.scrollBy(c, l);
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
		o = u == "absolute" ? o.offsetParent : Wn(o);
	}
}
function kr(e) {
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
		stack: Ar(e.dom)
	};
}
function Ar(e) {
	let t = [], n = e.ownerDocument;
	for (let r = e; r && (t.push({
		dom: r,
		top: r.scrollTop,
		left: r.scrollLeft
	}), e != n); r = Wn(r));
	return t;
}
function jr({ refDOM: e, refTop: t, stack: n }) {
	let r = e ? e.getBoundingClientRect().top : 0;
	Mr(n, r == 0 ? 0 : r - t);
}
function Mr(e, t) {
	for (let n = 0; n < e.length; n++) {
		let { dom: r, top: i, left: a } = e[n];
		r.scrollTop != i + t && (r.scrollTop = i + t), r.scrollLeft != a && (r.scrollLeft = a);
	}
}
var Nr = null;
function Pr(e) {
	if (e.setActive) return e.setActive();
	if (Nr) return e.focus(Nr);
	let t = Ar(e);
	e.focus(Nr == null ? { get preventScroll() {
		return Nr = { preventScroll: !0 }, !0;
	} } : void 0), Nr || (Nr = !1, Mr(t, 0));
}
function Fr(e, t) {
	let n, r = 2e8, i, a = 0, o = t.top, s = t.top, c, l;
	for (let u = e.firstChild, d = 0; u; u = u.nextSibling, d++) {
		let e;
		if (u.nodeType == 1) e = u.getClientRects();
		else if (u.nodeType == 3) e = Kn(u).getClientRects();
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
	return !n && c && (n = c, i = l, r = 0), n && n.nodeType == 3 ? Ir(n, i) : !n || r && n.nodeType == 1 ? {
		node: e,
		offset: a
	} : Fr(n, i);
}
function Ir(e, t) {
	let n = e.nodeValue.length, r = document.createRange(), i;
	for (let a = 0; a < n; a++) {
		r.setEnd(e, a + 1), r.setStart(e, a);
		let n = Wr(r, 1);
		if (n.top != n.bottom && Lr(t, n)) {
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
function Lr(e, t) {
	return e.left >= t.left - 1 && e.left <= t.right + 1 && e.top >= t.top - 1 && e.top <= t.bottom + 1;
}
function Rr(e, t) {
	let n = e.parentNode;
	return n && /^li$/i.test(n.nodeName) && t.left < e.getBoundingClientRect().left ? n : e;
}
function zr(e, t, n) {
	let { node: r, offset: i } = Fr(t, n), a = -1;
	if (r.nodeType == 1 && !r.firstChild) {
		let e = r.getBoundingClientRect();
		a = e.left != e.right && n.left > (e.left + e.right) / 2 ? 1 : -1;
	}
	return e.docView.posFromDOM(r, i, a);
}
function Br(e, t, n, r) {
	let i = -1;
	for (let n = t, a = !1; n != e.dom;) {
		let t = e.docView.nearestDesc(n, !0), o;
		if (!t) return null;
		if (t.dom.nodeType == 1 && (t.node.isBlock && t.parent || !t.contentDOM) && ((o = t.dom.getBoundingClientRect()).width || o.height) && (t.node.isBlock && t.parent && !/^T(R|BODY|HEAD|FOOT)$/.test(t.dom.nodeName) && (!a && o.left > r.left || o.top > r.top ? i = t.posBefore : (!a && o.right < r.left || o.bottom < r.top) && (i = t.posAfter), a = !0), !t.contentDOM && i < 0 && !t.node.isText)) return (t.node.isBlock ? r.top < (o.top + o.bottom) / 2 : r.left < (o.left + o.right) / 2) ? t.posBefore : t.posAfter;
		n = t.dom.parentNode;
	}
	return i > -1 ? i : e.docView.posFromDOM(t, n, -1);
}
function Vr(e, t, n) {
	let r = e.childNodes.length;
	if (r && n.top < n.bottom) for (let i = Math.max(0, Math.min(r - 1, Math.floor(r * (t.top - n.top) / (n.bottom - n.top)) - 2)), a = i;;) {
		let n = e.childNodes[a];
		if (n.nodeType == 1) {
			let e = n.getClientRects();
			for (let r = 0; r < e.length; r++) {
				let i = e[r];
				if (Lr(t, i)) return Vr(n, t, i);
			}
		}
		if ((a = (a + 1) % r) == i) break;
	}
	return e;
}
function Hr(e, t) {
	let n = e.dom.ownerDocument, r, i = 0, a = ar(n, t.left, t.top);
	a && ({node: r, offset: i} = a);
	let o = (e.root.elementFromPoint ? e.root : n).elementFromPoint(t.left, t.top), s;
	if (!o || !e.dom.contains(o.nodeType == 1 ? o : o.parentNode)) {
		let n = e.dom.getBoundingClientRect();
		if (!Lr(t, n) || (o = Vr(e.dom, t, n), !o)) return null;
	}
	if (vr) for (let e = o; r && e; e = Wn(e)) e.draggable && (r = void 0);
	if (o = Rr(o, t), r) {
		if (mr && r.nodeType == 1 && (i = Math.min(i, r.childNodes.length), i < r.childNodes.length)) {
			let e = r.childNodes[i], n;
			e.nodeName == "IMG" && (n = e.getBoundingClientRect()).right <= t.left && n.bottom > t.top && i++;
		}
		let n;
		Cr && i && r.nodeType == 1 && (n = r.childNodes[i - 1]).nodeType == 1 && n.contentEditable == "false" && n.getBoundingClientRect().top >= t.top && i--, r == e.dom && i == r.childNodes.length - 1 && r.lastChild.nodeType == 1 && t.top > r.lastChild.getBoundingClientRect().bottom ? s = e.state.doc.content.size : (i == 0 || r.nodeType != 1 || r.childNodes[i - 1].nodeName != "BR") && (s = Br(e, r, i, t));
	}
	s ??= zr(e, o, t);
	let c = e.docView.nearestDesc(o, !0);
	return {
		pos: s,
		inside: c ? c.posAtStart - c.border : -1
	};
}
function Ur(e) {
	return e.top < e.bottom || e.left < e.right;
}
function Wr(e, t) {
	let n = e.getClientRects();
	if (n.length) {
		let e = n[t < 0 ? 0 : n.length - 1];
		if (Ur(e)) return e;
	}
	return Array.prototype.find.call(n, Ur) || e.getBoundingClientRect();
}
var Gr = /[\u0590-\u05f4\u0600-\u06ff\u0700-\u08ac]/;
function Kr(e, t, n) {
	let { node: r, offset: i, atom: a } = e.docView.domFromPos(t, n < 0 ? -1 : 1), o = Cr || mr;
	if (r.nodeType == 3) if (o && (Gr.test(r.nodeValue) || (n < 0 ? !i : i == r.nodeValue.length))) {
		let e = Wr(Kn(r, i, i), n);
		if (mr && i && /\s/.test(r.nodeValue[i - 1]) && i < r.nodeValue.length) {
			let t = Wr(Kn(r, i - 1, i - 1), -1);
			if (t.top == e.top) {
				let n = Wr(Kn(r, i, i + 1), -1);
				if (n.top != e.top) return qr(n, n.left < t.left);
			}
		}
		return e;
	} else {
		let e = i, t = i, a = n < 0 ? 1 : -1;
		return n < 0 && !i ? (t++, a = -1) : n >= 0 && i == r.nodeValue.length ? (e--, a = 1) : n < 0 ? e-- : t++, qr(Wr(Kn(r, e, t), a), a < 0);
	}
	if (!e.state.doc.resolve(t - (a || 0)).parent.inlineContent) {
		if (a == null && i && (n < 0 || i == Zn(r))) {
			let e = r.childNodes[i - 1];
			if (e.nodeType == 1) return Jr(e.getBoundingClientRect(), !1);
		}
		if (a == null && i < Zn(r)) {
			let e = r.childNodes[i];
			if (e.nodeType == 1) return Jr(e.getBoundingClientRect(), !0);
		}
		return Jr(r.getBoundingClientRect(), n >= 0);
	}
	if (a == null && i && (n < 0 || i == Zn(r))) {
		let e = r.childNodes[i - 1], t = e.nodeType == 3 ? Kn(e, Zn(e) - +!o) : e.nodeType == 1 && (e.nodeName != "BR" || !e.nextSibling) ? e : null;
		if (t) return qr(Wr(t, 1), !1);
	}
	if (a == null && i < Zn(r)) {
		let e = r.childNodes[i];
		for (; e.pmViewDesc && e.pmViewDesc.ignoreForCoords;) e = e.nextSibling;
		let t = e ? e.nodeType == 3 ? Kn(e, 0, +!o) : e.nodeType == 1 ? e : null : null;
		if (t) return qr(Wr(t, -1), !0);
	}
	return qr(Wr(r.nodeType == 3 ? Kn(r) : r, -n), n >= 0);
}
function qr(e, t) {
	if (e.width == 0) return e;
	let n = t ? e.left : e.right;
	return {
		top: e.top,
		bottom: e.bottom,
		left: n,
		right: n
	};
}
function Jr(e, t) {
	if (e.height == 0) return e;
	let n = t ? e.top : e.bottom;
	return {
		top: n,
		bottom: n,
		left: e.left,
		right: e.right
	};
}
function Yr(e, t, n) {
	let r = e.state, i = e.root.activeElement;
	r != t && e.updateState(t), i != e.dom && e.focus();
	try {
		return n();
	} finally {
		r != t && e.updateState(r), i != e.dom && i && i.focus();
	}
}
function Xr(e, t, n) {
	let r = t.selection, i = n == "up" ? r.$from : r.$to;
	return Yr(e, t, () => {
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
		let r = Kr(e, i.pos, 1);
		for (let e = t.firstChild; e; e = e.nextSibling) {
			let t;
			if (e.nodeType == 1) t = e.getClientRects();
			else if (e.nodeType == 3) t = Kn(e, 0, e.nodeValue.length).getClientRects();
			else continue;
			for (let e = 0; e < t.length; e++) {
				let i = t[e];
				if (i.bottom > i.top + 1 && (n == "up" ? r.top - i.top > (i.bottom - r.top) * 2 : i.bottom - r.bottom > (r.bottom - i.top) * 2)) return !1;
			}
		}
		return !0;
	});
}
var Zr = /[\u0590-\u08ac]/;
function Qr(e, t, n) {
	let { $head: r } = t.selection;
	if (!r.parent.isTextblock) return !1;
	let i = r.parentOffset, a = !i, o = i == r.parent.content.size, s = e.domSelection();
	return s ? !Zr.test(r.parent.textContent) || !s.modify ? n == "left" || n == "backward" ? a : o : Yr(e, t, () => {
		let { focusNode: t, focusOffset: i, anchorNode: a, anchorOffset: o } = e.domSelectionRange(), c = s.caretBidiLevel;
		s.modify("move", n, "character");
		let l = r.depth ? e.docView.domAfterPos(r.before()) : e.dom, { focusNode: u, focusOffset: d } = e.domSelectionRange(), f = u && !l.contains(u.nodeType == 1 ? u : u.parentNode) || t == u && i == d;
		try {
			s.collapse(a, o), t && (t != a || i != o) && s.extend && s.extend(t, i);
		} catch {}
		return c != null && (s.caretBidiLevel = c), f;
	}) : r.pos == r.start() || r.pos == r.end();
}
var $r = null, ei = null, ti = !1;
function ni(e, t, n) {
	return $r == t && ei == n ? ti : ($r = t, ei = n, ti = n == "up" || n == "down" ? Xr(e, t, n) : Qr(e, t, n));
}
var ri = 0, ii = 1, ai = 2, oi = 3, si = class {
	constructor(e, t, n, r) {
		this.parent = e, this.children = t, this.dom = n, this.contentDOM = r, this.dirty = ri, n.pmViewDesc = this;
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
		if (e == this.dom && this.contentDOM) r = t > Un(this.contentDOM);
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
			if (a > e || i instanceof mi) {
				r = e - t;
				break;
			}
			t = a;
		}
		if (r) return this.children[n].domFromPos(r - this.children[n].border, t);
		for (let e; n && !(e = this.children[n - 1]).size && e instanceof ci && e.side >= 0; n--);
		if (t <= 0) {
			let e, r = !0;
			for (; e = n ? this.children[n - 1] : null, !(!e || e.dom.parentNode == this.contentDOM); n--, r = !1);
			return e && t && r && !e.border && !e.domAtom ? e.domFromPos(e.size, t) : {
				node: this.contentDOM,
				offset: e ? Un(e.dom) + 1 : 0
			};
		} else {
			let e, r = !0;
			for (; e = n < this.children.length ? this.children[n] : null, !(!e || e.dom.parentNode == this.contentDOM); n++, r = !1);
			return e && r && !e.border && !e.domAtom ? e.domFromPos(0, t) : {
				node: this.contentDOM,
				offset: e ? Un(e.dom) : this.contentDOM.childNodes.length
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
						r = Un(n.dom) + 1;
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
						i = Un(n.dom);
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
		if ((mr || vr) && e == t) {
			let { node: e, offset: t } = o;
			if (e.nodeType == 3) {
				if (u = !!(t && e.nodeValue[t - 1] == "\n"), u && t == e.nodeValue.length) for (let t = e, n; t; t = t.parentNode) {
					if (n = t.nextSibling) {
						n.nodeName == "BR" && (o = s = {
							node: n.parentNode,
							offset: Un(n) + 1
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
		if (mr && l.focusNode && l.focusNode != s.node && l.focusNode.nodeType == 1) {
			let e = l.focusNode.childNodes[l.focusOffset];
			e && e.contentEditable == "false" && (r = !0);
		}
		if (!(r || u && vr) && Jn(o.node, o.offset, l.anchorNode, l.anchorOffset) && Jn(s.node, s.offset, l.focusNode, l.focusOffset)) return;
		let d = !1;
		if ((c.extend || e == t) && !(u && mr)) {
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
					this.dirty = e == n || t == a ? ai : ii, e == r && t == o && (i.contentLost || i.dom.parentNode != this.contentDOM) ? i.dirty = oi : i.markDirty(e - r, t - r);
					return;
				} else i.dirty = i.dom == i.contentDOM && i.dom.parentNode == this.contentDOM && !i.children.length ? ai : oi;
			}
			n = a;
		}
		this.dirty = ai;
	}
	markParentsDirty() {
		let e = 1;
		for (let t = this.parent; t; t = t.parent, e++) {
			let n = e == 1 ? ai : ii;
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
}, ci = class extends si {
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
		return this.dirty == ri && e.type.eq(this.widget.type);
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
}, li = class extends si {
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
}, ui = class e extends si {
	constructor(e, t, n, r, i) {
		super(e, [], n, r), this.mark = t, this.spec = i;
	}
	static create(t, n, r, i) {
		let a = i.nodeViews[n.type.name], o = a && a(n, i, r);
		return (!o || !o.dom) && (o = Qe.renderSpec(document, n.type.spec.toDOM(n, r), null, n.attrs)), new e(t, n, o.dom, o.contentDOM || o.dom, o);
	}
	parseRule() {
		return this.dirty & oi || this.mark.type.spec.reparseInView ? null : {
			mark: this.mark.type.name,
			attrs: this.mark.attrs,
			contentElement: this.contentDOM
		};
	}
	matchesMark(e) {
		return this.dirty != oi && this.mark.eq(e);
	}
	markDirty(e, t) {
		if (super.markDirty(e, t), this.dirty != ri) {
			let e = this.parent;
			for (; !e.node;) e = e.parent;
			e.dirty < this.dirty && (e.dirty = this.dirty), this.dirty = ri;
		}
	}
	slice(t, n, r) {
		let i = e.create(this.parent, this.mark, !0, r), a = this.children, o = this.size;
		n < o && (a = ji(a, n, o, r)), t > 0 && (a = ji(a, 0, t, r));
		for (let e = 0; e < a.length; e++) a[e].parent = i;
		return i.children = a, i;
	}
	ignoreMutation(e) {
		return this.spec.ignoreMutation ? this.spec.ignoreMutation(e) : super.ignoreMutation(e);
	}
	destroy() {
		this.spec.destroy && this.spec.destroy(), super.destroy();
	}
}, di = class e extends si {
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
			let e = Qe.renderSpec(document, n.type.spec.toDOM(n), null, n.attrs);
			({dom: u, contentDOM: d} = e);
		}
		!d && !n.isText && u.nodeName != "BR" && (u.hasAttribute("contenteditable") || (u.contentEditable = "false"), n.type.spec.draggable && (u.draggable = !0));
		let f = u;
		return u = Si(u, r, n), l ? c = new hi(t, n, r, i, u, d || null, f, l, a, o + 1) : n.isText ? new pi(t, n, r, i, u, f, a) : new e(t, n, r, i, u, d || null, f, a, o + 1);
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
			e.contentElement || (e.getContent = () => d.empty);
		}
		return e;
	}
	matchesNode(e, t, n) {
		return this.dirty == ri && e.eq(this.node) && Ci(t, this.outerDeco) && n.eq(this.innerDeco);
	}
	get size() {
		return this.node.nodeSize;
	}
	get border() {
		return +!this.node.isLeaf;
	}
	updateChildren(e, t) {
		let n = this.node.inlineContent, r = t, i = e.composing ? this.localCompositionInfo(e, t) : null, a = i && i.pos > -1 ? i : null, o = i && i.pos < 0, s = new Ti(this, a && a.node, e);
		Oi(this.node, this.innerDeco, (t, i, a) => {
			t.spec.marks ? s.syncToMarks(t.spec.marks, n, e, i) : t.type.side >= 0 && !a && s.syncToMarks(i == this.node.childCount ? h.none : this.node.child(i).marks, n, e, i), s.placeWidget(t, e, r);
		}, (t, a, c, l) => {
			s.syncToMarks(t.marks, n, e, l);
			let u;
			s.findNodeMatch(t, a, c, l) || o && e.state.selection.from > r && e.state.selection.to < r + t.nodeSize && (u = s.findIndexWithChild(i.node)) > -1 && s.updateNodeAt(t, a, c, u, e) || s.updateNextNode(t, a, c, e, l, r) || s.addNode(t, a, c, e, r), r += t.nodeSize;
		}), s.syncToMarks([], n, e, 0), this.node.isTextblock && s.addTextblockHacks(), s.destroyRest(), (s.changed || this.dirty == ai) && (a && this.protectLocalComposition(e, a), gi(this.contentDOM, this.children, e), yr && ki(this.dom));
	}
	localCompositionInfo(e, t) {
		let { from: n, to: r } = e.state.selection;
		if (!(e.state.selection instanceof O) || n < t || r > t + this.node.content.size) return null;
		let i = e.input.compositionNode;
		if (!i || !this.dom.contains(i.parentNode)) return null;
		if (this.node.inlineContent) {
			let e = i.nodeValue, a = Ai(this.node.content, e, n - t, r - t);
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
		let a = new li(this, i, t, r);
		e.input.compositionNodes.push(a), this.children = ji(this.children, n, n + r.length, e, a);
	}
	update(e, t, n, r) {
		return this.dirty == oi || !e.sameMarkup(this.node) ? !1 : (this.updateInner(e, t, n, r), !0);
	}
	updateInner(e, t, n, r) {
		this.updateOuterDeco(t), this.node = e, this.innerDeco = n, this.contentDOM && this.updateChildren(r, this.posAtStart), this.dirty = ri;
	}
	updateOuterDeco(e) {
		if (Ci(e, this.outerDeco)) return;
		let t = this.nodeDOM.nodeType != 1, n = this.dom;
		this.dom = bi(this.dom, this.nodeDOM, yi(this.outerDeco, this.node, t), yi(e, this.node, t)), this.dom != n && (n.pmViewDesc = void 0, this.dom.pmViewDesc = this), this.outerDeco = e;
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
function fi(e, t, n, r, i) {
	Si(r, t, e);
	let a = new di(void 0, e, t, n, r, r, r, i, 0);
	return a.contentDOM && a.updateChildren(i, 0), a;
}
var pi = class e extends di {
	constructor(e, t, n, r, i, a, o) {
		super(e, t, n, r, i, null, a, o, 0);
	}
	parseRule() {
		let e = this.nodeDOM.parentNode;
		for (; e && e != this.dom && !e.pmIsDeco;) e = e.parentNode;
		return { skip: e || !0 };
	}
	update(e, t, n, r) {
		return this.dirty == oi || this.dirty != ri && !this.inParent() || !e.sameMarkup(this.node) ? !1 : (this.updateOuterDeco(t), (this.dirty != ri || e.text != this.node.text) && e.text != this.nodeDOM.nodeValue && (this.nodeDOM.nodeValue = e.text, r.trackWrites == this.nodeDOM && (r.trackWrites = null)), this.node = e, this.dirty = ri, !0);
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
		super.markDirty(e, t), this.dom != this.nodeDOM && (e == 0 || t == this.nodeDOM.nodeValue.length) && (this.dirty = oi);
	}
	get domAtom() {
		return !1;
	}
	isText(e) {
		return this.node.text == e;
	}
}, mi = class extends si {
	parseRule() {
		return { ignore: !0 };
	}
	matchesHack(e) {
		return this.dirty == ri && this.dom.nodeName == e;
	}
	get domAtom() {
		return !0;
	}
	get ignoreForCoords() {
		return this.dom.nodeName == "IMG";
	}
}, hi = class extends di {
	constructor(e, t, n, r, i, a, o, s, c, l) {
		super(e, t, n, r, i, a, o, c, l), this.spec = s;
	}
	update(e, t, n, r) {
		if (this.dirty == oi) return !1;
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
function gi(e, t, n) {
	let r = e.firstChild, i = !1;
	for (let a = 0; a < t.length; a++) {
		let o = t[a], s = o.dom;
		if (s.parentNode == e) {
			for (; s != r;) r = wi(r), i = !0;
			r = r.nextSibling;
		} else i = !0, e.insertBefore(s, r);
		if (o instanceof ui) {
			let t = r ? r.previousSibling : e.lastChild;
			gi(o.contentDOM, o.children, n), r = t ? t.nextSibling : e.firstChild;
		}
	}
	for (; r;) r = wi(r), i = !0;
	i && n.trackWrites == e && (n.trackWrites = null);
}
var _i = function(e) {
	e && (this.nodeName = e);
};
_i.prototype = Object.create(null);
var vi = [new _i()];
function yi(e, t, n) {
	if (e.length == 0) return vi;
	let r = n ? vi[0] : new _i(), i = [r];
	for (let a = 0; a < e.length; a++) {
		let o = e[a].type.attrs;
		if (o) {
			o.nodeName && i.push(r = new _i(o.nodeName));
			for (let e in o) {
				let a = o[e];
				a != null && (n && i.length == 1 && i.push(r = new _i(t.isInline ? "span" : "div")), e == "class" ? r.class = (r.class ? r.class + " " : "") + a : e == "style" ? r.style = (r.style ? r.style + ";" : "") + a : e != "nodeName" && (r[e] = a));
			}
		}
	}
	return i;
}
function bi(e, t, n, r) {
	if (n == vi && r == vi) return t;
	let i = t;
	for (let t = 0; t < r.length; t++) {
		let a = r[t], o = n[t];
		if (t) {
			let t;
			o && o.nodeName == a.nodeName && i != e && (t = i.parentNode) && t.nodeName.toLowerCase() == a.nodeName ? i = t : (t = document.createElement(a.nodeName), t.pmIsDeco = !0, t.appendChild(i), o = vi[0], i = t);
		}
		xi(i, o || vi[0], a);
	}
	return i;
}
function xi(e, t, n) {
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
function Si(e, t, n) {
	return bi(e, e, vi, yi(t, n, e.nodeType != 1));
}
function Ci(e, t) {
	if (e.length != t.length) return !1;
	for (let n = 0; n < e.length; n++) if (!e[n].type.eq(t[n].type)) return !1;
	return !0;
}
function wi(e) {
	let t = e.nextSibling;
	return e.parentNode.removeChild(e), t;
}
var Ti = class {
	constructor(e, t, n) {
		this.lock = t, this.view = n, this.index = 0, this.stack = [], this.changed = !1, this.top = e, this.preMatch = Ei(e.node.content, e);
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
		for (; i < a;) this.destroyRest(), this.top.dirty = ri, this.index = this.stack.pop(), this.top = this.stack.pop(), a--;
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
				let r = ui.create(this.top, e[a], t, n);
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
		return a.dirty == oi && a.dom == a.contentDOM && (a.dirty = ai), a.update(e, t, n, i) ? (this.destroyBetween(this.index, r), this.index++, !0) : !1;
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
			if (s instanceof di) {
				let c = this.preMatch.matched.get(s);
				if (c != null && c != i) return !1;
				let l = s.dom, u, d = this.isLocked(l) && !(e.isText && s.node && s.node.isText && s.nodeDOM.nodeValue == e.text && s.dirty != oi && Ci(t, s.outerDeco));
				if (!d && s.update(e, t, n, r)) return this.destroyBetween(this.index, o), s.dom != l && (this.changed = !0), this.index++, !0;
				if (!d && (u = this.recreateWrapper(s, e, t, n, r, a))) return this.destroyBetween(this.index, o), this.top.children[this.index] = u, u.contentDOM && (u.dirty = ai, u.updateChildren(r, a + 1), u.dirty = ri), this.changed = !0, this.index++, !0;
				break;
			}
		}
		return !1;
	}
	recreateWrapper(e, t, n, r, i, a) {
		if (e.dirty || t.isAtom || !e.children.length || !e.node.content.eq(t.content) || !Ci(n, e.outerDeco) || !r.eq(e.innerDeco)) return null;
		let o = di.create(this.top, t, n, r, i, a);
		if (o.contentDOM) {
			o.children = e.children, e.children = [];
			for (let e of o.children) e.parent = o;
		}
		return e.destroy(), o;
	}
	addNode(e, t, n, r, i) {
		let a = di.create(this.top, e, t, n, r, i);
		a.contentDOM && a.updateChildren(r, i + 1), this.top.children.splice(this.index++, 0, a), this.changed = !0;
	}
	placeWidget(e, t, n) {
		let r = this.index < this.top.children.length ? this.top.children[this.index] : null;
		if (r && r.matchesWidget(e) && (e == r.widget || !r.widget.type.toDOM.parentNode)) this.index++;
		else {
			let r = new ci(this.top, e, t, n);
			this.top.children.splice(this.index++, 0, r), this.changed = !0;
		}
	}
	addTextblockHacks() {
		let e = this.top.children[this.index - 1], t = this.top;
		for (; e instanceof ui;) t = e, e = t.children[t.children.length - 1];
		(!e || !(e instanceof pi) || /\n$/.test(e.node.text) || this.view.requiresGeckoHackNode && /\s$/.test(e.node.text)) && ((vr || gr) && e && e.dom.contentEditable == "false" && this.addHackNode("IMG", t), this.addHackNode("BR", this.top));
	}
	addHackNode(e, t) {
		if (t == this.top && this.index < t.children.length && t.children[this.index].matchesHack(e)) this.index++;
		else {
			let n = document.createElement(e);
			e == "IMG" && (n.className = "ProseMirror-separator", n.alt = ""), e == "BR" && (n.className = "ProseMirror-trailingBreak");
			let r = new mi(this.top, [], n, null);
			t == this.top ? t.children.splice(this.index++, 0, r) : t.children.push(r), this.changed = !0;
		}
	}
	isLocked(e) {
		return this.lock && (e == this.lock || e.nodeType == 1 && e.contains(this.lock.parentNode));
	}
};
function Ei(e, t) {
	let n = t, r = n.children.length, i = e.childCount, a = /* @__PURE__ */ new Map(), o = [];
	outer: for (; i > 0;) {
		let s;
		for (;;) if (r) {
			let e = n.children[r - 1];
			if (e instanceof ui) n = e, r = e.children.length;
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
function Di(e, t) {
	return e.type.side - t.type.side;
}
function Oi(e, t, n, r) {
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
			d.sort(Di);
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
function ki(e) {
	if (e.nodeName == "UL" || e.nodeName == "OL") {
		let t = e.style.cssText;
		e.style.cssText = t + "; list-style: square !important", window.getComputedStyle(e).listStyle, e.style.cssText = t;
	}
}
function Ai(e, t, n, r) {
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
function ji(e, t, n, r, i) {
	let a = [];
	for (let o = 0, s = 0; o < e.length; o++) {
		let c = e[o], l = s, u = s += c.size;
		l >= n || u <= t ? a.push(c) : (l < t && a.push(c.slice(0, t - l, r)), i &&= (a.push(i), void 0), u > n && a.push(c.slice(n - l, c.size, r)));
	}
	return a;
}
function Mi(e, t = null) {
	let n = e.domSelectionRange(), r = e.state.doc;
	if (!n.focusNode) return null;
	let i = e.docView.nearestDesc(n.focusNode), a = i && i.size == 0, o = e.docView.posFromDOM(n.focusNode, n.focusOffset, 1);
	if (o < 0) return null;
	let s = r.resolve(o), c, l;
	if (nr(n)) {
		for (c = o; i && !i.node;) i = i.parent;
		let e = i.node;
		if (i && e.isAtom && k.isSelectable(e) && i.parent && !(e.isInline && er(n.focusNode, n.focusOffset, i.dom))) {
			let e = i.posBefore;
			l = new k(o == e ? s : r.resolve(e));
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
		l = Ui(e, u, s, n);
	}
	return l;
}
function Ni(e) {
	return e.editable ? e.hasFocus() : Gi(e) && document.activeElement && document.activeElement.contains(e.dom);
}
function Pi(e, t = !1) {
	let n = e.state.selection;
	if (Vi(e, n), Ni(e)) {
		if (!t && e.input.mouseDown && e.input.mouseDown.allowDefault && gr) {
			let t = e.domSelectionRange(), n = e.domObserver.currentSelection;
			if (t.anchorNode && n.anchorNode && Jn(t.anchorNode, t.anchorOffset, n.anchorNode, n.anchorOffset)) {
				e.input.mouseDown.delayedSelectionSync = !0, e.domObserver.setCurSelection();
				return;
			}
		}
		if (e.domObserver.disconnectSelection(), e.cursorWrapper) Bi(e);
		else {
			let { anchor: r, head: i } = n, a, o;
			Fi && !(n instanceof O) && (n.$from.parent.inlineContent || (a = Ii(e, n.from)), !n.empty && !n.$from.parent.inlineContent && (o = Ii(e, n.to))), e.docView.setSelection(r, i, e, t), Fi && (a && Ri(a), o && Ri(o)), n.visible ? e.dom.classList.remove("ProseMirror-hideselection") : (e.dom.classList.add("ProseMirror-hideselection"), "onselectionchange" in document && zi(e));
		}
		e.domObserver.setCurSelection(), e.domObserver.connectSelection();
	}
}
var Fi = vr || gr && _r < 63;
function Ii(e, t) {
	let { node: n, offset: r } = e.docView.domFromPos(t, 0), i = r < n.childNodes.length ? n.childNodes[r] : null, a = r ? n.childNodes[r - 1] : null;
	if (vr && i && i.contentEditable == "false") return Li(i);
	if ((!i || i.contentEditable == "false") && (!a || a.contentEditable == "false")) {
		if (i) return Li(i);
		if (a) return Li(a);
	}
}
function Li(e) {
	return e.contentEditable = "true", vr && e.draggable && (e.draggable = !1, e.wasDraggable = !0), e;
}
function Ri(e) {
	e.contentEditable = "false", e.wasDraggable &&= (e.draggable = !0, null);
}
function zi(e) {
	let t = e.dom.ownerDocument;
	t.removeEventListener("selectionchange", e.input.hideSelectionGuard);
	let n = e.domSelectionRange(), r = n.anchorNode, i = n.anchorOffset;
	t.addEventListener("selectionchange", e.input.hideSelectionGuard = () => {
		(n.anchorNode != r || n.anchorOffset != i) && (t.removeEventListener("selectionchange", e.input.hideSelectionGuard), setTimeout(() => {
			(!Ni(e) || e.state.selection.visible) && e.dom.classList.remove("ProseMirror-hideselection");
		}, 20));
	});
}
function Bi(e) {
	let t = e.domSelection();
	if (!t) return;
	let n = e.cursorWrapper.dom, r = n.nodeName == "IMG";
	r ? t.collapse(n.parentNode, Un(n) + 1) : t.collapse(n, 0), !r && !e.state.selection.visible && fr && pr <= 11 && (n.disabled = !0, n.disabled = !1);
}
function Vi(e, t) {
	if (t instanceof k) {
		let n = e.docView.descAt(t.from);
		n != e.lastSelectedViewDesc && (Hi(e), n && n.selectNode(), e.lastSelectedViewDesc = n);
	} else Hi(e);
}
function Hi(e) {
	e.lastSelectedViewDesc &&= (e.lastSelectedViewDesc.parent && e.lastSelectedViewDesc.deselectNode(), void 0);
}
function Ui(e, t, n, r) {
	return e.someProp("createSelectionBetween", (r) => r(e, t, n)) || O.between(t, n, r);
}
function Wi(e) {
	return e.editable && !e.hasFocus() ? !1 : Gi(e);
}
function Gi(e) {
	let t = e.domSelectionRange();
	if (!t.anchorNode) return !1;
	try {
		return e.dom.contains(t.anchorNode.nodeType == 3 ? t.anchorNode.parentNode : t.anchorNode) && (e.editable || e.dom.contains(t.focusNode.nodeType == 3 ? t.focusNode.parentNode : t.focusNode));
	} catch {
		return !1;
	}
}
function Ki(e) {
	let t = e.docView.domFromPos(e.state.selection.anchor, 0), n = e.domSelectionRange();
	return Jn(t.node, t.offset, n.anchorNode, n.anchorOffset);
}
function qi(e, t) {
	let { $anchor: n, $head: r } = e.selection, i = t > 0 ? n.max(r) : n.min(r), a = i.parent.inlineContent ? i.depth ? e.doc.resolve(t > 0 ? i.after() : i.before()) : null : i;
	return a && D.findFrom(a, t);
}
function Ji(e, t) {
	return e.dispatch(e.state.tr.setSelection(t).scrollIntoView()), !0;
}
function Yi(e, t, n) {
	let r = e.state.selection;
	if (r instanceof O) {
		if (n.indexOf("s") > -1) {
			let { $head: n } = r, i = n.textOffset ? null : t < 0 ? n.nodeBefore : n.nodeAfter;
			if (!i || i.isText || !i.isLeaf) return !1;
			let a = e.state.doc.resolve(n.pos + i.nodeSize * (t < 0 ? -1 : 1));
			return Ji(e, new O(r.$anchor, a));
		} else if (!r.empty) return !1;
		else if (e.endOfTextblock(t > 0 ? "forward" : "backward")) {
			let n = qi(e.state, t);
			return n && n instanceof k ? Ji(e, n) : !1;
		} else if (!(br && n.indexOf("m") > -1)) {
			let n = r.$head, i = n.textOffset ? null : t < 0 ? n.nodeBefore : n.nodeAfter, a;
			if (!i || i.isText) return !1;
			let o = t < 0 ? n.pos - i.nodeSize : n.pos;
			return i.isAtom || (a = e.docView.descAt(o)) && !a.contentDOM ? k.isSelectable(i) ? Ji(e, new k(t < 0 ? e.state.doc.resolve(n.pos - i.nodeSize) : n)) : Cr ? Ji(e, new O(e.state.doc.resolve(t < 0 ? o : o + i.nodeSize))) : !1 : !1;
		}
	} else if (r instanceof k && r.node.isInline) return Ji(e, new O(t > 0 ? r.$to : r.$from));
	else {
		let n = qi(e.state, t);
		return n ? Ji(e, n) : !1;
	}
}
function Xi(e) {
	return e.nodeType == 3 ? e.nodeValue.length : e.childNodes.length;
}
function Zi(e, t) {
	let n = e.pmViewDesc;
	return n && n.size == 0 && (t < 0 || e.nextSibling || e.nodeName != "BR");
}
function Qi(e, t) {
	return t < 0 ? $i(e) : ea(e);
}
function $i(e) {
	let t = e.domSelectionRange(), n = t.focusNode, r = t.focusOffset;
	if (!n) return;
	let i, a, o = !1;
	for (mr && n.nodeType == 1 && r < Xi(n) && Zi(n.childNodes[r], -1) && (o = !0);;) if (r > 0) {
		if (n.nodeType != 1) break;
		{
			let e = n.childNodes[r - 1];
			if (Zi(e, -1)) i = n, a = --r;
			else if (e.nodeType == 3) n = e, r = n.nodeValue.length;
			else break;
		}
	} else if (ta(n)) break;
	else {
		let t = n.previousSibling;
		for (; t && Zi(t, -1);) i = n.parentNode, a = Un(t), t = t.previousSibling;
		if (t) n = t, r = Xi(n);
		else {
			if (n = n.parentNode, n == e.dom) break;
			r = 0;
		}
	}
	o ? ia(e, n, r) : i && ia(e, i, a);
}
function ea(e) {
	let t = e.domSelectionRange(), n = t.focusNode, r = t.focusOffset;
	if (!n) return;
	let i = Xi(n), a, o;
	for (;;) if (r < i) {
		if (n.nodeType != 1) break;
		let e = n.childNodes[r];
		if (Zi(e, 1)) a = n, o = ++r;
		else break;
	} else if (ta(n)) break;
	else {
		let t = n.nextSibling;
		for (; t && Zi(t, 1);) a = t.parentNode, o = Un(t) + 1, t = t.nextSibling;
		if (t) n = t, r = 0, i = Xi(n);
		else {
			if (n = n.parentNode, n == e.dom) break;
			r = i = 0;
		}
	}
	a && ia(e, a, o);
}
function ta(e) {
	let t = e.pmViewDesc;
	return t && t.node && t.node.isBlock;
}
function na(e, t) {
	for (; e && t == e.childNodes.length && !tr(e);) t = Un(e) + 1, e = e.parentNode;
	for (; e && t < e.childNodes.length;) {
		let n = e.childNodes[t];
		if (n.nodeType == 3) return n;
		if (n.nodeType == 1 && n.contentEditable == "false") break;
		e = n, t = 0;
	}
}
function ra(e, t) {
	for (; e && !t && !tr(e);) t = Un(e), e = e.parentNode;
	for (; e && t;) {
		let n = e.childNodes[t - 1];
		if (n.nodeType == 3) return n;
		if (n.nodeType == 1 && n.contentEditable == "false") break;
		e = n, t = e.childNodes.length;
	}
}
function ia(e, t, n) {
	if (t.nodeType != 3) {
		let e, r;
		(r = na(t, n)) ? (t = r, n = 0) : (e = ra(t, n)) && (t = e, n = e.nodeValue.length);
	}
	let r = e.domSelection();
	if (!r) return;
	if (nr(r)) {
		let e = document.createRange();
		e.setEnd(t, n), e.setStart(t, n), r.removeAllRanges(), r.addRange(e);
	} else r.extend && r.extend(t, n);
	e.domObserver.setCurSelection();
	let { state: i } = e;
	setTimeout(() => {
		e.state == i && Pi(e);
	}, 50);
}
function aa(e, t) {
	let n = e.state.doc.resolve(t);
	if (!(gr || xr) && n.parent.inlineContent) {
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
function oa(e, t, n) {
	let r = e.state.selection;
	if (r instanceof O && !r.empty || n.indexOf("s") > -1 || br && n.indexOf("m") > -1) return !1;
	let { $from: i, $to: a } = r;
	if (!i.parent.inlineContent || e.endOfTextblock(t < 0 ? "up" : "down")) {
		let n = qi(e.state, t);
		if (n && n instanceof k) return Ji(e, n);
	}
	if (!i.parent.inlineContent) {
		let n = t < 0 ? i : a, o = r instanceof Tn ? D.near(n, t) : D.findFrom(n, t);
		return o ? Ji(e, o) : !1;
	}
	return !1;
}
function sa(e, t) {
	if (!(e.state.selection instanceof O)) return !0;
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
function ca(e, t, n) {
	e.domObserver.stop(), t.contentEditable = n, e.domObserver.start();
}
function la(e) {
	if (!vr || e.state.selection.$head.parentOffset > 0) return !1;
	let { focusNode: t, focusOffset: n } = e.domSelectionRange();
	if (t && t.nodeType == 1 && n == 0 && t.firstChild && t.firstChild.contentEditable == "false") {
		let n = t.firstChild;
		ca(e, n, "true"), setTimeout(() => ca(e, n, "false"), 20);
	}
	return !1;
}
function ua(e) {
	let t = "";
	return e.ctrlKey && (t += "c"), e.metaKey && (t += "m"), e.altKey && (t += "a"), e.shiftKey && (t += "s"), t;
}
function da(e, t) {
	let n = t.keyCode, r = ua(t);
	if (n == 8 || br && n == 72 && r == "c") return sa(e, -1) || Qi(e, -1);
	if (n == 46 && !t.shiftKey || br && n == 68 && r == "c") return sa(e, 1) || Qi(e, 1);
	if (n == 13 || n == 27) return !0;
	if (n == 37 || br && n == 66 && r == "c") {
		let t = n == 37 ? aa(e, e.state.selection.from) == "ltr" ? -1 : 1 : -1;
		return Yi(e, t, r) || Qi(e, t);
	} else if (n == 39 || br && n == 70 && r == "c") {
		let t = n == 39 ? aa(e, e.state.selection.from) == "ltr" ? 1 : -1 : 1;
		return Yi(e, t, r) || Qi(e, t);
	} else if (n == 38 || br && n == 80 && r == "c") return oa(e, -1, r) || Qi(e, -1);
	else if (n == 40 || br && n == 78 && r == "c") return la(e) || oa(e, 1, r) || Qi(e, 1);
	else if (r == (br ? "m" : "c") && (n == 66 || n == 73 || n == 89 || n == 90)) return !0;
	return !1;
}
function fa(e, t) {
	e.someProp("transformCopied", (n) => {
		t = n(t, e);
	});
	let n = [], { content: r, openStart: i, openEnd: a } = t;
	for (; i > 1 && a > 1 && r.childCount == 1 && r.firstChild.childCount == 1;) {
		i--, a--;
		let e = r.firstChild;
		n.push(e.type.name, e.attrs == e.type.defaultAttrs ? null : e.attrs), r = e.content;
	}
	let o = e.someProp("clipboardSerializer") || Qe.fromSchema(e.state.schema), s = Ca(), c = s.createElement("div");
	c.appendChild(o.serializeFragment(r, { document: s }));
	let l = c.firstChild, u, d = 0;
	for (; l && l.nodeType == 1 && (u = xa[l.nodeName.toLowerCase()]);) {
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
function pa(e, t, n, r, i) {
	let a = i.parent.type.spec.code, o, s;
	if (!n && !t) return null;
	let c = !!t && (r || a || !n);
	if (c) {
		if (e.someProp("transformPastedText", (n) => {
			t = n(t, a || r, e);
		}), a) return s = new _(d.from(e.state.schema.text(t.replace(/\r\n?/g, "\n"))), 0, 0), e.someProp("transformPasted", (t) => {
			s = t(s, e, !0);
		}), s;
		let n = e.someProp("clipboardTextParser", (n) => n(t, i, r, e));
		if (n) s = n;
		else {
			let n = i.marks(), { schema: r } = e.state, a = Qe.fromSchema(r);
			o = document.createElement("div"), t.split(/(?:\r\n?|\n)+/).forEach((e) => {
				let t = o.appendChild(document.createElement("p"));
				e && t.appendChild(a.serializeNode(r.text(e, n)));
			});
		}
	} else e.someProp("transformPastedHTML", (t) => {
		n = t(n, e);
	}), o = Ea(n), Cr && Da(o);
	let l = o && o.querySelector("[data-pm-slice]"), u = l && /^(\d+) (\d+)(?: -(\d+))? (.*)/.exec(l.getAttribute("data-pm-slice") || "");
	if (u && u[3]) for (let e = +u[3]; e > 0; e--) {
		let e = o.firstChild;
		for (; e && e.nodeType != 1;) e = e.nextSibling;
		if (!e) break;
		o = e;
	}
	if (s ||= (e.someProp("clipboardParser") || e.someProp("domParser") || Re.fromSchema(e.state.schema)).parseSlice(o, {
		preserveWhitespace: !!(c || u),
		context: i,
		ruleFromNode(e) {
			return e.nodeName == "BR" && !e.nextSibling && e.parentNode && !ma.test(e.parentNode.nodeName) ? { ignore: !0 } : null;
		}
	}), u) s = Oa(ba(s, +u[1], +u[2]), u[4]);
	else if (s = _.maxOpen(ha(s.content, i), !0), s.openStart || s.openEnd) {
		let e = 0, t = 0;
		for (let t = s.content.firstChild; e < s.openStart && !t.type.spec.isolating; e++, t = t.firstChild);
		for (let e = s.content.lastChild; t < s.openEnd && !e.type.spec.isolating; t++, e = e.lastChild);
		s = ba(s, e, t);
	}
	return e.someProp("transformPasted", (t) => {
		s = t(s, e, c);
	}), s;
}
var ma = /^(a|abbr|acronym|b|cite|code|del|em|i|ins|kbd|label|output|q|ruby|s|samp|span|strong|sub|sup|time|u|tt|var)$/i;
function ha(e, t) {
	if (e.childCount < 2) return e;
	for (let n = t.depth; n >= 0; n--) {
		let r = t.node(n).contentMatchAt(t.index(n)), i, a = [];
		if (e.forEach((e) => {
			if (!a) return;
			let t = r.findWrapping(e.type), n;
			if (!t) return a = null;
			if (n = a.length && i.length && _a(t, i, e, a[a.length - 1], 0)) a[a.length - 1] = n;
			else {
				a.length && (a[a.length - 1] = va(a[a.length - 1], i.length));
				let n = ga(e, t);
				a.push(n), r = r.matchType(n.type), i = t;
			}
		}), a) return d.from(a);
	}
	return e;
}
function ga(e, t, n = 0) {
	for (let r = t.length - 1; r >= n; r--) e = t[r].create(null, d.from(e));
	return e;
}
function _a(e, t, n, r, i) {
	if (i < e.length && i < t.length && e[i] == t[i]) {
		let a = _a(e, t, n, r.lastChild, i + 1);
		if (a) return r.copy(r.content.replaceChild(r.childCount - 1, a));
		if (r.contentMatchAt(r.childCount).matchType(i == e.length - 1 ? n.type : e[i + 1])) return r.copy(r.content.append(d.from(ga(n, e, i + 1))));
	}
}
function va(e, t) {
	if (t == 0) return e;
	let n = e.content.replaceChild(e.childCount - 1, va(e.lastChild, t - 1)), r = e.contentMatchAt(e.childCount).fillBefore(d.empty, !0);
	return e.copy(n.append(r));
}
function ya(e, t, n, r, i, a) {
	let o = t < 0 ? e.firstChild : e.lastChild, s = o.content;
	return e.childCount > 1 && (a = 0), i < r - 1 && (s = ya(s, t, n, r, i + 1, a)), i >= n && (s = t < 0 ? o.contentMatchAt(0).fillBefore(s, a <= i).append(s) : s.append(o.contentMatchAt(o.childCount).fillBefore(d.empty, !0))), e.replaceChild(t < 0 ? 0 : e.childCount - 1, o.copy(s));
}
function ba(e, t, n) {
	return t < e.openStart && (e = new _(ya(e.content, -1, t, e.openStart, 0, e.openEnd), t, e.openEnd)), n < e.openEnd && (e = new _(ya(e.content, 1, n, e.openEnd, 0, 0), e.openStart, n)), e;
}
var xa = {
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
}, Sa = null;
function Ca() {
	return Sa ||= document.implementation.createHTMLDocument("title");
}
var wa = null;
function Ta(e) {
	let t = window.trustedTypes;
	return t ? (wa ||= t.defaultPolicy || t.createPolicy("ProseMirrorClipboard", { createHTML: (e) => e }), wa.createHTML(e)) : e;
}
function Ea(e) {
	let t = /^(\s*<meta [^>]*>)*/.exec(e);
	t && (e = e.slice(t[0].length));
	let n = Ca().createElement("div"), r = /<([a-z][^>\s]+)/i.exec(e), i;
	if ((i = r && xa[r[1].toLowerCase()]) && (e = i.map((e) => "<" + e + ">").join("") + e + i.map((e) => "</" + e + ">").reverse().join("")), n.innerHTML = Ta(e), i) for (let e = 0; e < i.length; e++) n = n.querySelector(i[e]) || n;
	return n;
}
function Da(e) {
	let t = e.querySelectorAll(gr ? "span:not([class]):not([style])" : "span.Apple-converted-space");
	for (let n = 0; n < t.length; n++) {
		let r = t[n];
		r.childNodes.length == 1 && r.textContent == "\xA0" && r.parentNode && r.parentNode.replaceChild(e.ownerDocument.createTextNode(" "), r);
	}
}
function Oa(e, t) {
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
		i = d.from(t.create(r[e + 1], i)), a++, o++;
	}
	return new _(i, a, o);
}
var ka = {}, Aa = {}, ja = {
	touchstart: !0,
	touchmove: !0
}, Ma = class {
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
function Na(e) {
	for (let t in ka) {
		let n = ka[t];
		e.dom.addEventListener(t, e.input.eventHandlers[t] = (t) => {
			Ra(e, t) && !La(e, t) && (e.editable || !(t.type in Aa)) && n(e, t);
		}, ja[t] ? { passive: !0 } : void 0);
	}
	vr && e.dom.addEventListener("input", () => null), Ia(e);
}
function Pa(e, t) {
	e.input.lastSelectionOrigin = t, e.input.lastSelectionTime = Date.now();
}
function Fa(e) {
	e.domObserver.stop();
	for (let t in e.input.eventHandlers) e.dom.removeEventListener(t, e.input.eventHandlers[t]);
	clearTimeout(e.input.composingTimeout), clearTimeout(e.input.lastIOSEnterFallbackTimeout);
}
function Ia(e) {
	e.someProp("handleDOMEvents", (t) => {
		for (let n in t) e.input.eventHandlers[n] || e.dom.addEventListener(n, e.input.eventHandlers[n] = (t) => La(e, t));
	});
}
function La(e, t) {
	return e.someProp("handleDOMEvents", (n) => {
		let r = n[t.type];
		return r ? r(e, t) || t.defaultPrevented : !1;
	});
}
function Ra(e, t) {
	if (!t.bubbles) return !0;
	if (t.defaultPrevented) return !1;
	for (let n = t.target; n != e.dom; n = n.parentNode) if (!n || n.nodeType == 11 || n.pmViewDesc && n.pmViewDesc.stopEvent(t)) return !1;
	return !0;
}
function za(e, t) {
	!La(e, t) && ka[t.type] && (e.editable || !(t.type in Aa)) && ka[t.type](e, t);
}
Aa.keydown = (e, t) => {
	let n = t;
	if (e.input.shiftKey = n.keyCode == 16 || n.shiftKey, !$a(e, n) && (e.input.lastKeyCode = n.keyCode, e.input.lastKeyCodeTime = Date.now(), !(Sr && gr && n.keyCode == 13))) if (n.keyCode != 229 && e.domObserver.forceFlush(), yr && n.keyCode == 13 && !n.ctrlKey && !n.altKey && !n.metaKey) {
		let t = Date.now();
		e.input.lastIOSEnter = t, e.input.lastIOSEnterFallbackTimeout = setTimeout(() => {
			e.input.lastIOSEnter == t && (e.someProp("handleKeyDown", (t) => t(e, rr(13, "Enter"))), e.input.lastIOSEnter = 0);
		}, 200);
	} else e.someProp("handleKeyDown", (t) => t(e, n)) || da(e, n) ? n.preventDefault() : Pa(e, "key");
}, Aa.keyup = (e, t) => {
	t.keyCode == 16 && (e.input.shiftKey = !1);
}, Aa.keypress = (e, t) => {
	let n = t;
	if ($a(e, n) || !n.charCode || n.ctrlKey && !n.altKey || br && n.metaKey) return;
	if (e.someProp("handleKeyPress", (t) => t(e, n))) {
		n.preventDefault();
		return;
	}
	let r = e.state.selection;
	if (!(r instanceof O) || !r.$from.sameParent(r.$to)) {
		let t = String.fromCharCode(n.charCode), i = () => e.state.tr.insertText(t).scrollIntoView();
		!/[\r\n]/.test(t) && !e.someProp("handleTextInput", (n) => n(e, r.$from.pos, r.$to.pos, t, i)) && e.dispatch(i()), n.preventDefault();
	}
};
function Ba(e) {
	return {
		left: e.clientX,
		top: e.clientY
	};
}
function Va(e, t) {
	let n = t.x - e.clientX, r = t.y - e.clientY;
	return n * n + r * r < 100;
}
function Ha(e, t, n, r, i) {
	if (r == -1) return !1;
	let a = e.state.doc.resolve(r);
	for (let r = a.depth + 1; r > 0; r--) if (e.someProp(t, (t) => r > a.depth ? t(e, n, a.nodeAfter, a.before(r), i, !0) : t(e, n, a.node(r), a.before(r), i, !1))) return !0;
	return !1;
}
function Ua(e, t, n) {
	if (e.focused || e.focus(), e.state.selection.eq(t)) return;
	let r = e.state.tr.setSelection(t);
	n == "pointer" && r.setMeta("pointer", !0), e.dispatch(r);
}
function Wa(e, t) {
	if (t == -1) return !1;
	let n = e.state.doc.resolve(t), r = n.nodeAfter;
	return r && r.isAtom && k.isSelectable(r) ? (Ua(e, new k(n), "pointer"), !0) : !1;
}
function Ga(e, t) {
	if (t == -1) return !1;
	let n = e.state.selection, r, i;
	n instanceof k && (r = n.node);
	let a = e.state.doc.resolve(t);
	for (let e = a.depth + 1; e > 0; e--) {
		let t = e > a.depth ? a.nodeAfter : a.node(e);
		if (k.isSelectable(t)) {
			i = r && n.$from.depth > 0 && e >= n.$from.depth && a.before(n.$from.depth + 1) == n.$from.pos ? a.before(n.$from.depth) : a.before(e);
			break;
		}
	}
	return i == null ? !1 : (Ua(e, k.create(e.state.doc, i), "pointer"), !0);
}
function Ka(e, t, n, r, i) {
	return Ha(e, "handleClickOn", t, n, r) || e.someProp("handleClick", (n) => n(e, t, r)) || (i ? Ga(e, n) : Wa(e, n));
}
function qa(e, t, n, r) {
	return Ha(e, "handleDoubleClickOn", t, n, r) || e.someProp("handleDoubleClick", (n) => n(e, t, r));
}
function Ja(e, t, n, r) {
	return Ha(e, "handleTripleClickOn", t, n, r) || e.someProp("handleTripleClick", (n) => n(e, t, r)) || Ya(e, n, r);
}
function Ya(e, t, n) {
	if (n.button != 0) return !1;
	let r = e.state.doc;
	if (t == -1) return r.inlineContent ? (Ua(e, O.create(r, 0, r.content.size), "pointer"), !0) : !1;
	let i = r.resolve(t);
	for (let t = i.depth + 1; t > 0; t--) {
		let n = t > i.depth ? i.nodeAfter : i.node(t), a = i.before(t);
		if (n.inlineContent) Ua(e, O.create(r, a + 1, a + 1 + n.content.size), "pointer");
		else if (k.isSelectable(n)) Ua(e, k.create(r, a), "pointer");
		else continue;
		return !0;
	}
}
function Xa(e) {
	return oo(e);
}
var Za = br ? "metaKey" : "ctrlKey";
ka.mousedown = (e, t) => {
	let n = t;
	e.input.shiftKey = n.shiftKey;
	let r = Xa(e), i = Date.now(), a = "singleClick";
	i - e.input.lastClick.time < 500 && Va(n, e.input.lastClick) && !n[Za] && e.input.lastClick.button == n.button && (e.input.lastClick.type == "singleClick" ? a = "doubleClick" : e.input.lastClick.type == "doubleClick" && (a = "tripleClick")), e.input.lastClick = {
		time: i,
		x: n.clientX,
		y: n.clientY,
		type: a,
		button: n.button
	};
	let o = e.posAtCoords(Ba(n));
	o && (a == "singleClick" ? (e.input.mouseDown && e.input.mouseDown.done(), e.input.mouseDown = new Qa(e, o, n, !!r)) : (a == "doubleClick" ? qa : Ja)(e, o.pos, o.inside, n) ? n.preventDefault() : Pa(e, "pointer"));
};
var Qa = class {
	constructor(e, t, n, r) {
		this.view = e, this.pos = t, this.event = n, this.flushed = r, this.delayedSelectionSync = !1, this.mightDrag = null, this.startDoc = e.state.doc, this.selectNode = !!n[Za], this.allowDefault = n.shiftKey;
		let i, a;
		if (t.inside > -1) i = e.state.doc.nodeAt(t.inside), a = t.inside;
		else {
			let n = e.state.doc.resolve(t.pos);
			i = n.parent, a = n.depth ? n.before() : 0;
		}
		let o = r ? null : n.target, s = o ? e.docView.nearestDesc(o, !0) : null;
		this.target = s && s.nodeDOM.nodeType == 1 ? s.nodeDOM : null;
		let { selection: c } = e.state;
		n.button == 0 && (i.type.spec.draggable && i.type.spec.selectable !== !1 || c instanceof k && c.from <= a && c.to > a) && (this.mightDrag = {
			node: i,
			pos: a,
			addAttr: !!(this.target && !this.target.draggable),
			setUneditable: !!(this.target && mr && !this.target.hasAttribute("contentEditable"))
		}), this.target && this.mightDrag && (this.mightDrag.addAttr || this.mightDrag.setUneditable) && (this.view.domObserver.stop(), this.mightDrag.addAttr && (this.target.draggable = !0), this.mightDrag.setUneditable && setTimeout(() => {
			this.view.input.mouseDown == this && this.target.setAttribute("contentEditable", "false");
		}, 20), this.view.domObserver.start()), e.root.addEventListener("mouseup", this.up = this.up.bind(this)), e.root.addEventListener("mousemove", this.move = this.move.bind(this)), Pa(e, "pointer");
	}
	done() {
		this.view.root.removeEventListener("mouseup", this.up), this.view.root.removeEventListener("mousemove", this.move), this.mightDrag && this.target && (this.view.domObserver.stop(), this.mightDrag.addAttr && this.target.removeAttribute("draggable"), this.mightDrag.setUneditable && this.target.removeAttribute("contentEditable"), this.view.domObserver.start()), this.delayedSelectionSync && setTimeout(() => Pi(this.view)), this.view.input.mouseDown = null;
	}
	up(e) {
		if (this.done(), !this.view.dom.contains(e.target)) return;
		let t = this.pos;
		this.view.state.doc != this.startDoc && (t = this.view.posAtCoords(Ba(e))), this.updateAllowDefault(e), this.allowDefault || !t ? Pa(this.view, "pointer") : Ka(this.view, t.pos, t.inside, e, this.selectNode) ? e.preventDefault() : e.button == 0 && (this.flushed || vr && this.mightDrag && !this.mightDrag.node.isAtom || gr && !this.view.state.selection.visible && Math.min(Math.abs(t.pos - this.view.state.selection.from), Math.abs(t.pos - this.view.state.selection.to)) <= 2) ? (Ua(this.view, D.near(this.view.state.doc.resolve(t.pos)), "pointer"), e.preventDefault()) : Pa(this.view, "pointer");
	}
	move(e) {
		this.updateAllowDefault(e), Pa(this.view, "pointer"), e.buttons == 0 && this.done();
	}
	updateAllowDefault(e) {
		!this.allowDefault && (Math.abs(this.event.x - e.clientX) > 4 || Math.abs(this.event.y - e.clientY) > 4) && (this.allowDefault = !0);
	}
};
ka.touchstart = (e) => {
	e.input.lastTouch = Date.now(), Xa(e), Pa(e, "pointer");
}, ka.touchmove = (e) => {
	e.input.lastTouch = Date.now(), Pa(e, "pointer");
}, ka.contextmenu = (e) => Xa(e);
function $a(e, t) {
	return e.composing ? !0 : vr && Math.abs(t.timeStamp - e.input.compositionEndedAt) < 500 ? (e.input.compositionEndedAt = -2e8, !0) : !1;
}
var eo = Sr ? 5e3 : -1;
Aa.compositionstart = Aa.compositionupdate = (e) => {
	if (!e.composing) {
		e.domObserver.flush();
		let { state: t } = e, n = t.selection.$to;
		if (t.selection instanceof O && (t.storedMarks || !n.textOffset && n.parentOffset && n.nodeBefore.marks.some((e) => e.type.spec.inclusive === !1) || gr && xr && to(e))) e.markCursor = e.state.storedMarks || n.marks(), oo(e, !0), e.markCursor = null;
		else if (oo(e, !t.selection.empty), mr && t.selection.empty && n.parentOffset && !n.textOffset && n.nodeBefore.marks.length) {
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
	no(e, eo);
};
function to(e) {
	let { focusNode: t, focusOffset: n } = e.domSelectionRange();
	if (!t || t.nodeType != 1 || n >= t.childNodes.length) return !1;
	let r = t.childNodes[n];
	return r.nodeType == 1 && r.contentEditable == "false";
}
Aa.compositionend = (e, t) => {
	e.composing && (e.input.composing = !1, e.input.compositionEndedAt = t.timeStamp, e.input.compositionPendingChanges = e.domObserver.pendingRecords().length ? e.input.compositionID : 0, e.input.compositionNode = null, e.input.badSafariComposition ? e.domObserver.forceFlush() : e.input.compositionPendingChanges && Promise.resolve().then(() => e.domObserver.flush()), e.input.compositionID++, no(e, 20));
};
function no(e, t) {
	clearTimeout(e.input.composingTimeout), t > -1 && (e.input.composingTimeout = setTimeout(() => oo(e), t));
}
function ro(e) {
	for (e.composing && (e.input.composing = !1, e.input.compositionEndedAt = ao()); e.input.compositionNodes.length > 0;) e.input.compositionNodes.pop().markParentsDirty();
}
function io(e) {
	let t = e.domSelectionRange();
	if (!t.focusNode) return null;
	let n = Qn(t.focusNode, t.focusOffset), r = $n(t.focusNode, t.focusOffset);
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
function ao() {
	let e = document.createEvent("Event");
	return e.initEvent("event", !0, !0), e.timeStamp;
}
function oo(e, t = !1) {
	if (!(Sr && e.domObserver.flushingSoon >= 0)) {
		if (e.domObserver.forceFlush(), ro(e), t || e.docView && e.docView.dirty) {
			let n = Mi(e), r = e.state.selection;
			return n && !n.eq(r) ? e.dispatch(e.state.tr.setSelection(n)) : (e.markCursor || t) && !r.$from.node(r.$from.sharedDepth(r.to)).inlineContent ? e.dispatch(e.state.tr.deleteSelection()) : e.updateState(e.state), !0;
		}
		return !1;
	}
}
function so(e, t) {
	if (!e.dom.parentNode) return;
	let n = e.dom.parentNode.appendChild(document.createElement("div"));
	n.appendChild(t), n.style.cssText = "position: fixed; left: -10000px; top: 10px";
	let r = getSelection(), i = document.createRange();
	i.selectNodeContents(t), e.dom.blur(), r.removeAllRanges(), r.addRange(i), setTimeout(() => {
		n.parentNode && n.parentNode.removeChild(n), e.focus();
	}, 50);
}
var co = fr && pr < 15 || yr && wr < 604;
ka.copy = Aa.cut = (e, t) => {
	let n = t, r = e.state.selection, i = n.type == "cut";
	if (r.empty) return;
	let a = co ? null : n.clipboardData, { dom: o, text: s } = fa(e, r.content());
	a ? (n.preventDefault(), a.clearData(), a.setData("text/html", o.innerHTML), a.setData("text/plain", s)) : so(e, o), i && e.dispatch(e.state.tr.deleteSelection().scrollIntoView().setMeta("uiEvent", "cut"));
};
function lo(e) {
	return e.openStart == 0 && e.openEnd == 0 && e.content.childCount == 1 ? e.content.firstChild : null;
}
function uo(e, t) {
	if (!e.dom.parentNode) return;
	let n = e.input.shiftKey || e.state.selection.$from.parent.type.spec.code, r = e.dom.parentNode.appendChild(document.createElement(n ? "textarea" : "div"));
	n || (r.contentEditable = "true"), r.style.cssText = "position: fixed; left: -10000px; top: 10px", r.focus();
	let i = e.input.shiftKey && e.input.lastKeyCode != 45;
	setTimeout(() => {
		e.focus(), r.parentNode && r.parentNode.removeChild(r), n ? fo(e, r.value, null, i, t) : fo(e, r.textContent, r.innerHTML, i, t);
	}, 50);
}
function fo(e, t, n, r, i) {
	let a = pa(e, t, n, r, e.state.selection.$from);
	if (e.someProp("handlePaste", (t) => t(e, i, a || _.empty))) return !0;
	if (!a) return !1;
	let o = lo(a), s = o ? e.state.tr.replaceSelectionWith(o, r) : e.state.tr.replaceSelection(a);
	return e.dispatch(s.scrollIntoView().setMeta("paste", !0).setMeta("uiEvent", "paste")), !0;
}
function po(e) {
	let t = e.getData("text/plain") || e.getData("Text");
	if (t) return t;
	let n = e.getData("text/uri-list");
	return n ? n.replace(/\r?\n/g, " ") : "";
}
Aa.paste = (e, t) => {
	let n = t;
	if (e.composing && !Sr) return;
	let r = co ? null : n.clipboardData, i = e.input.shiftKey && e.input.lastKeyCode != 45;
	r && fo(e, po(r), r.getData("text/html"), i, n) ? n.preventDefault() : uo(e, n);
};
var mo = class {
	constructor(e, t, n) {
		this.slice = e, this.move = t, this.node = n;
	}
}, ho = br ? "altKey" : "ctrlKey";
function go(e, t) {
	let n;
	return e.someProp("dragCopies", (e) => {
		n ||= e(t);
	}), n == null ? !t[ho] : !n;
}
ka.dragstart = (e, t) => {
	let n = t, r = e.input.mouseDown;
	if (r && r.done(), !n.dataTransfer) return;
	let i = e.state.selection, a = i.empty ? null : e.posAtCoords(Ba(n)), o;
	if (!(a && a.pos >= i.from && a.pos <= (i instanceof k ? i.to - 1 : i.to))) {
		if (r && r.mightDrag) o = k.create(e.state.doc, r.mightDrag.pos);
		else if (n.target && n.target.nodeType == 1) {
			let t = e.docView.nearestDesc(n.target, !0);
			t && t.node.type.spec.draggable && t != e.docView && (o = k.create(e.state.doc, t.posBefore));
		}
	}
	let { dom: s, text: c, slice: l } = fa(e, (o || e.state.selection).content());
	(!n.dataTransfer.files.length || !gr || _r > 120) && n.dataTransfer.clearData(), n.dataTransfer.setData(co ? "Text" : "text/html", s.innerHTML), n.dataTransfer.effectAllowed = "copyMove", co || n.dataTransfer.setData("text/plain", c), e.dragging = new mo(l, go(e, n), o);
}, ka.dragend = (e) => {
	let t = e.dragging;
	window.setTimeout(() => {
		e.dragging == t && (e.dragging = null);
	}, 50);
}, Aa.dragover = Aa.dragenter = (e, t) => t.preventDefault(), Aa.drop = (e, t) => {
	try {
		_o(e, t, e.dragging);
	} finally {
		e.dragging = null;
	}
};
function _o(e, t, n) {
	if (!t.dataTransfer) return;
	let r = e.posAtCoords(Ba(t));
	if (!r) return;
	let i = e.state.doc.resolve(r.pos), a = n && n.slice;
	a ? e.someProp("transformPasted", (t) => {
		a = t(a, e, !1);
	}) : a = pa(e, po(t.dataTransfer), co ? null : t.dataTransfer.getData("text/html"), !1, i);
	let o = !!(n && go(e, t));
	if (e.someProp("handleDrop", (n) => n(e, t, a || _.empty, o))) {
		t.preventDefault();
		return;
	}
	if (!a) return;
	t.preventDefault();
	let s = a ? Qt(e.state.doc, i.pos, a) : i.pos;
	s ??= i.pos;
	let c = e.state.tr;
	if (o) {
		let { node: e } = n;
		e ? e.replace(c) : c.deleteSelection();
	}
	let l = c.mapping.map(s), u = a.openStart == 0 && a.openEnd == 0 && a.content.childCount == 1, d = c.doc;
	if (u ? c.replaceRangeWith(l, l, a.content.firstChild) : c.replaceRange(l, l, a), c.doc.eq(d)) return;
	let f = c.doc.resolve(l);
	if (u && k.isSelectable(a.content.firstChild) && f.nodeAfter && f.nodeAfter.sameMarkup(a.content.firstChild)) c.setSelection(new k(f));
	else {
		let t = c.mapping.map(s);
		c.mapping.maps[c.mapping.maps.length - 1].forEach((e, n, r, i) => t = i), c.setSelection(Ui(e, f, c.doc.resolve(t)));
	}
	e.focus(), e.dispatch(c.setMeta("uiEvent", "drop"));
}
ka.focus = (e) => {
	e.input.lastFocus = Date.now(), e.focused || (e.domObserver.stop(), e.dom.classList.add("ProseMirror-focused"), e.domObserver.start(), e.focused = !0, setTimeout(() => {
		e.docView && e.hasFocus() && !e.domObserver.currentSelection.eq(e.domSelectionRange()) && Pi(e);
	}, 20));
}, ka.blur = (e, t) => {
	let n = t;
	e.focused &&= (e.domObserver.stop(), e.dom.classList.remove("ProseMirror-focused"), e.domObserver.start(), n.relatedTarget && e.dom.contains(n.relatedTarget) && e.domObserver.currentSelection.clear(), !1);
}, ka.beforeinput = (e, t) => {
	if (gr && Sr && t.inputType == "deleteContentBackward") {
		e.domObserver.flushSoon();
		let { domChangeCount: t } = e.input;
		setTimeout(() => {
			if (e.input.domChangeCount != t || (e.dom.blur(), e.focus(), e.someProp("handleKeyDown", (t) => t(e, rr(8, "Backspace"))))) return;
			let { $cursor: n } = e.state.selection;
			n && n.pos > 0 && e.dispatch(e.state.tr.delete(n.pos - 1, n.pos).scrollIntoView());
		}, 50);
	}
};
for (let e in Aa) ka[e] = Aa[e];
function vo(e, t) {
	if (e == t) return !0;
	for (let n in e) if (e[n] !== t[n]) return !1;
	for (let n in t) if (!(n in e)) return !1;
	return !0;
}
var yo = class e {
	constructor(e, t) {
		this.toDOM = e, this.spec = t || wo, this.side = this.spec.side || 0;
	}
	map(e, t, n, r) {
		let { pos: i, deleted: a } = e.mapResult(t.from + r, this.side < 0 ? -1 : 1);
		return a ? null : new So(i - n, i - n, this);
	}
	valid() {
		return !0;
	}
	eq(t) {
		return this == t || t instanceof e && (this.spec.key && this.spec.key == t.spec.key || this.toDOM == t.toDOM && vo(this.spec, t.spec));
	}
	destroy(e) {
		this.spec.destroy && this.spec.destroy(e);
	}
}, bo = class e {
	constructor(e, t) {
		this.attrs = e, this.spec = t || wo;
	}
	map(e, t, n, r) {
		let i = e.map(t.from + r, this.spec.inclusiveStart ? -1 : 1) - n, a = e.map(t.to + r, this.spec.inclusiveEnd ? 1 : -1) - n;
		return i >= a ? null : new So(i, a, this);
	}
	valid(e, t) {
		return t.from < t.to;
	}
	eq(t) {
		return this == t || t instanceof e && vo(this.attrs, t.attrs) && vo(this.spec, t.spec);
	}
	static is(t) {
		return t.type instanceof e;
	}
	destroy() {}
}, xo = class e {
	constructor(e, t) {
		this.attrs = e, this.spec = t || wo;
	}
	map(e, t, n, r) {
		let i = e.mapResult(t.from + r, 1);
		if (i.deleted) return null;
		let a = e.mapResult(t.to + r, -1);
		return a.deleted || a.pos <= i.pos ? null : new So(i.pos - n, a.pos - n, this);
	}
	valid(e, t) {
		let { index: n, offset: r } = e.content.findIndex(t.from), i;
		return r == t.from && !(i = e.child(n)).isText && r + i.nodeSize == t.to;
	}
	eq(t) {
		return this == t || t instanceof e && vo(this.attrs, t.attrs) && vo(this.spec, t.spec);
	}
	destroy() {}
}, So = class e {
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
		return new e(t, t, new yo(n, r));
	}
	static inline(t, n, r, i) {
		return new e(t, n, new bo(r, i));
	}
	static node(t, n, r, i) {
		return new e(t, n, new xo(r, i));
	}
	get spec() {
		return this.type.spec;
	}
	get inline() {
		return this.type instanceof bo;
	}
	get widget() {
		return this.type instanceof yo;
	}
}, Co = [], wo = {}, To = class e {
	constructor(e, t) {
		this.local = e.length ? e : Co, this.children = t.length ? t : Co;
	}
	static create(e, t) {
		return t.length ? No(t, e, 0, wo) : Eo;
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
		return this == Eo || e.maps.length == 0 ? this : this.mapInner(e, t, 0, 0, n || wo);
	}
	mapInner(t, n, r, i, a) {
		let o;
		for (let e = 0; e < this.local.length; e++) {
			let s = this.local[e].map(t, r, i);
			s && s.type.valid(n, s) ? (o ||= []).push(s) : a.onRemove && a.onRemove(this.local[e].spec);
		}
		return this.children.length ? Oo(this.children, o || [], t, n, r, i, a) : o ? new e(o.sort(Po), Co) : Eo;
	}
	add(t, n) {
		return n.length ? this == Eo ? e.create(t, n) : this.addInner(t, n, 0) : this;
	}
	addInner(t, n, r) {
		let i, a = 0;
		t.forEach((e, t) => {
			let o = t + r, s;
			if (s = jo(n, e, o)) {
				for (i ||= this.children.slice(); a < i.length && i[a] < t;) a += 3;
				i[a] == t ? i[a + 2] = i[a + 2].addInner(e, s, o + 1) : i.splice(a, 0, t, t + e.nodeSize, No(s, e, o + 1, wo)), a += 3;
			}
		});
		let o = ko(a ? Mo(n) : n, -r);
		for (let e = 0; e < o.length; e++) o[e].type.valid(t, o[e]) || o.splice(e--, 1);
		return new e(o.length ? this.local.concat(o).sort(Po) : this.local, i || this.children);
	}
	remove(e) {
		return e.length == 0 || this == Eo ? this : this.removeInner(e, 0);
	}
	removeInner(t, n) {
		let r = this.children, i = this.local;
		for (let e = 0; e < r.length; e += 3) {
			let i, a = r[e] + n, o = r[e + 1] + n;
			for (let e = 0, n; e < t.length; e++) (n = t[e]) && n.from > a && n.to < o && (t[e] = null, (i ||= []).push(n));
			if (!i) continue;
			r == this.children && (r = this.children.slice());
			let s = r[e + 2].removeInner(i, a + 1);
			s == Eo ? (r.splice(e, 3), e -= 3) : r[e + 2] = s;
		}
		if (i.length) {
			for (let e = 0, r; e < t.length; e++) if (r = t[e]) for (let e = 0; e < i.length; e++) i[e].eq(r, n) && (i == this.local && (i = this.local.slice()), i.splice(e--, 1));
		}
		return r == this.children && i == this.local ? this : i.length || r.length ? new e(i, r) : Eo;
	}
	forChild(t, n) {
		if (this == Eo) return this;
		if (n.isLeaf) return e.empty;
		let r, i;
		for (let e = 0; e < this.children.length; e += 3) if (this.children[e] >= t) {
			this.children[e] == t && (r = this.children[e + 2]);
			break;
		}
		let a = t + 1, o = a + n.content.size;
		for (let e = 0; e < this.local.length; e++) {
			let t = this.local[e];
			if (t.from < o && t.to > a && t.type instanceof bo) {
				let e = Math.max(a, t.from) - a, n = Math.min(o, t.to) - a;
				e < n && (i ||= []).push(t.copy(e, n));
			}
		}
		if (i) {
			let t = new e(i.sort(Po), Co);
			return r ? new Do([t, r]) : t;
		}
		return r || Eo;
	}
	eq(t) {
		if (this == t) return !0;
		if (!(t instanceof e) || this.local.length != t.local.length || this.children.length != t.children.length) return !1;
		for (let e = 0; e < this.local.length; e++) if (!this.local[e].eq(t.local[e])) return !1;
		for (let e = 0; e < this.children.length; e += 3) if (this.children[e] != t.children[e] || this.children[e + 1] != t.children[e + 1] || !this.children[e + 2].eq(t.children[e + 2])) return !1;
		return !0;
	}
	locals(e) {
		return Fo(this.localsInner(e));
	}
	localsInner(e) {
		if (this == Eo) return Co;
		if (e.inlineContent || !this.local.some(bo.is)) return this.local;
		let t = [];
		for (let e = 0; e < this.local.length; e++) this.local[e].type instanceof bo || t.push(this.local[e]);
		return t;
	}
	forEachSet(e) {
		e(this);
	}
};
To.empty = new To([], []), To.removeOverlap = Fo;
var Eo = To.empty, Do = class e {
	constructor(e) {
		this.members = e;
	}
	map(t, n) {
		let r = this.members.map((e) => e.map(t, n, wo));
		return e.from(r);
	}
	forChild(t, n) {
		if (n.isLeaf) return To.empty;
		let r = [];
		for (let i = 0; i < this.members.length; i++) {
			let a = this.members[i].forChild(t, n);
			a != Eo && (a instanceof e ? r = r.concat(a.members) : r.push(a));
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
		return t ? Fo(n ? t : t.sort(Po)) : Co;
	}
	static from(t) {
		switch (t.length) {
			case 0: return Eo;
			case 1: return t[0];
			default: return new e(t.every((e) => e instanceof To) ? t : t.reduce((e, t) => e.concat(t instanceof To ? t : t.members), []));
		}
	}
	forEachSet(e) {
		for (let t = 0; t < this.members.length; t++) this.members[t].forEachSet(e);
	}
};
function Oo(e, t, n, r, i, a, o) {
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
			r == Eo ? (s[t + 1] = -2, c = !0) : (s[t] = u, s[t + 1] = d, s[t + 2] = r);
		} else c = !0;
	}
	if (c) {
		let c = No(Ao(s, e, t, n, i, a, o), r, 0, o);
		t = c.local;
		for (let e = 0; e < s.length; e += 3) s[e + 1] < 0 && (s.splice(e, 3), e -= 3);
		for (let e = 0, t = 0; e < c.children.length; e += 3) {
			let n = c.children[e];
			for (; t < s.length && s[t] < n;) t += 3;
			s.splice(t, 0, c.children[e], c.children[e + 1], c.children[e + 2]);
		}
	}
	return new To(t.sort(Po), s);
}
function ko(e, t) {
	if (!t || !e.length) return e;
	let n = [];
	for (let r = 0; r < e.length; r++) {
		let i = e[r];
		n.push(new So(i.from + t, i.to + t, i.type));
	}
	return n;
}
function Ao(e, t, n, r, i, a, o) {
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
function jo(e, t, n) {
	if (t.isLeaf) return null;
	let r = n + t.nodeSize, i = null;
	for (let t = 0, a; t < e.length; t++) (a = e[t]) && a.from > n && a.to < r && ((i ||= []).push(a), e[t] = null);
	return i;
}
function Mo(e) {
	let t = [];
	for (let n = 0; n < e.length; n++) e[n] != null && t.push(e[n]);
	return t;
}
function No(e, t, n, r) {
	let i = [], a = !1;
	t.forEach((t, o) => {
		let s = jo(e, t, o + n);
		if (s) {
			a = !0;
			let e = No(s, t, n + o + 1, r);
			e != Eo && i.push(o, o + t.nodeSize, e);
		}
	});
	let o = ko(a ? Mo(e) : e, -n).sort(Po);
	for (let e = 0; e < o.length; e++) o[e].type.valid(t, o[e]) || (r.onRemove && r.onRemove(o[e].spec), o.splice(e--, 1));
	return o.length || i.length ? new To(o, i) : Eo;
}
function Po(e, t) {
	return e.from - t.from || e.to - t.to;
}
function Fo(e) {
	let t = e;
	for (let n = 0; n < t.length - 1; n++) {
		let r = t[n];
		if (r.from != r.to) for (let i = n + 1; i < t.length; i++) {
			let a = t[i];
			if (a.from == r.from) {
				a.to != r.to && (t == e && (t = e.slice()), t[i] = a.copy(a.from, r.to), Io(t, i + 1, a.copy(r.to, a.to)));
				continue;
			} else {
				a.from < r.to && (t == e && (t = e.slice()), t[n] = r.copy(r.from, a.from), Io(t, i, r.copy(a.from, r.to)));
				break;
			}
		}
	}
	return t;
}
function Io(e, t, n) {
	for (; t < e.length && Po(n, e[t]) > 0;) t++;
	e.splice(t, 0, n);
}
function Lo(e) {
	let t = [];
	return e.someProp("decorations", (n) => {
		let r = n(e.state);
		r && r != Eo && t.push(r);
	}), e.cursorWrapper && t.push(To.create(e.state.doc, [e.cursorWrapper.deco])), Do.from(t);
}
var Ro = {
	childList: !0,
	characterData: !0,
	characterDataOldValue: !0,
	attributes: !0,
	attributeOldValue: !0,
	subtree: !0
}, zo = fr && pr <= 11, Bo = class {
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
}, Vo = class {
	constructor(e, t) {
		this.view = e, this.handleDOMChange = t, this.queue = [], this.flushingSoon = -1, this.observer = null, this.currentSelection = new Bo(), this.onCharData = null, this.suppressingSelectionUpdates = !1, this.lastChangedTextNode = null, this.observer = window.MutationObserver && new window.MutationObserver((t) => {
			for (let e = 0; e < t.length; e++) this.queue.push(t[e]);
			fr && pr <= 11 && t.some((e) => e.type == "childList" && e.removedNodes.length || e.type == "characterData" && e.oldValue.length > e.target.nodeValue.length) ? this.flushSoon() : vr && e.composing && t.some((e) => e.type == "childList" && e.target.nodeName == "TR") ? (e.input.badSafariComposition = !0, this.flushSoon()) : this.flush();
		}), zo && (this.onCharData = (e) => {
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
		this.observer && (this.observer.takeRecords(), this.observer.observe(this.view.dom, Ro)), this.onCharData && this.view.dom.addEventListener("DOMCharacterDataModified", this.onCharData), this.connectSelection();
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
		if (Wi(this.view)) {
			if (this.suppressingSelectionUpdates) return Pi(this.view);
			if (fr && pr <= 11 && !this.view.state.selection.empty) {
				let e = this.view.domSelectionRange();
				if (e.focusNode && Jn(e.focusNode, e.focusOffset, e.anchorNode, e.anchorOffset)) return this.flushSoon();
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
		for (let n = e.focusNode; n; n = Wn(n)) t.add(n);
		for (let r = e.anchorNode; r; r = Wn(r)) if (t.has(r)) {
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
		let n = e.domSelectionRange(), r = !this.suppressingSelectionUpdates && !this.currentSelection.eq(n) && Wi(e) && !this.ignoreSelectionChange(n), i = -1, a = -1, o = !1, s = [];
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
		} else if (mr && s.length) {
			let t = s.filter((e) => e.nodeName == "BR");
			if (t.length == 2) {
				let [e, n] = t;
				e.parentNode && e.parentNode.parentNode == n.parentNode ? n.remove() : e.remove();
			} else {
				let { focusNode: n } = this.currentSelection;
				for (let r of t) {
					let t = r.parentNode;
					t && t.nodeName == "LI" && (!n || qo(e, n) != t) && r.remove();
				}
			}
		}
		let c = null;
		i < 0 && r && e.input.lastFocus > Date.now() - 200 && Math.max(e.input.lastTouch, e.input.lastClick.time) < Date.now() - 300 && nr(n) && (c = Mi(e)) && c.eq(D.near(e.state.doc.resolve(0), 1)) ? (e.input.lastFocus = 0, Pi(e), this.currentSelection.set(n), e.scrollToSelection()) : (i > -1 || r) && (i > -1 && (e.docView.markDirty(i, a), Wo(e)), e.input.badSafariComposition && (e.input.badSafariComposition = !1, Jo(e, s)), this.handleDOMChange(i, a, o, s), e.docView && e.docView.dirty ? e.updateState(e.state) : this.currentSelection.eq(n) || Pi(e), this.currentSelection.set(n));
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
			if (fr && pr <= 11 && e.addedNodes.length) for (let t = 0; t < e.addedNodes.length; t++) {
				let { previousSibling: n, nextSibling: a } = e.addedNodes[t];
				(!n || Array.prototype.indexOf.call(e.addedNodes, n) < 0) && (r = n), (!a || Array.prototype.indexOf.call(e.addedNodes, a) < 0) && (i = a);
			}
			let a = r && r.parentNode == e.target ? Un(r) + 1 : 0, o = n.localPosFromDOM(e.target, a, -1), s = i && i.parentNode == e.target ? Un(i) : e.target.childNodes.length;
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
}, Ho = /* @__PURE__ */ new WeakMap(), Uo = !1;
function Wo(e) {
	if (!Ho.has(e) && (Ho.set(e, null), [
		"normal",
		"nowrap",
		"pre-line"
	].indexOf(getComputedStyle(e.dom).whiteSpace) !== -1)) {
		if (e.requiresGeckoHackNode = mr, Uo) return;
		console.warn("ProseMirror expects the CSS white-space property to be set, preferably to 'pre-wrap'. It is recommended to load style/prosemirror.css from the prosemirror-view package."), Uo = !0;
	}
}
function Go(e, t) {
	let n = t.startContainer, r = t.startOffset, i = t.endContainer, a = t.endOffset, o = e.domAtPos(e.state.selection.anchor);
	return Jn(o.node, o.offset, i, a) && ([n, r, i, a] = [
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
function Ko(e, t) {
	if (t.getComposedRanges) {
		let n = t.getComposedRanges(e.root)[0];
		if (n) return Go(e, n);
	}
	let n;
	function r(e) {
		e.preventDefault(), e.stopImmediatePropagation(), n = e.getTargetRanges()[0];
	}
	return e.dom.addEventListener("beforeinput", r, !0), document.execCommand("indent"), e.dom.removeEventListener("beforeinput", r, !0), n ? Go(e, n) : null;
}
function qo(e, t) {
	for (let n = t.parentNode; n && n != e.dom; n = n.parentNode) {
		let t = e.docView.nearestDesc(n, !0);
		if (t && t.node.isBlock) return n;
	}
	return null;
}
function Jo(e, t) {
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
function Yo(e, t, n) {
	let { node: r, fromOffset: i, toOffset: a, from: o, to: s } = e.docView.parseRange(t, n), c = e.domSelectionRange(), l, u = c.anchorNode;
	if (u && e.dom.contains(u.nodeType == 1 ? u : u.parentNode) && (l = [{
		node: u,
		offset: c.anchorOffset
	}], nr(c) || l.push({
		node: c.focusNode,
		offset: c.focusOffset
	})), gr && e.input.lastKeyCode === 8) for (let e = a; e > i; e--) {
		let t = r.childNodes[e - 1], n = t.pmViewDesc;
		if (t.nodeName == "BR" && !n) {
			a = e;
			break;
		}
		if (!n || n.size) break;
	}
	let d = e.state.doc, f = e.someProp("domParser") || Re.fromSchema(e.state.schema), p = d.resolve(o), m = null, h = f.parse(r, {
		topNode: p.parent,
		topMatch: p.parent.contentMatchAt(p.index()),
		topOpen: !0,
		from: i,
		to: a,
		preserveWhitespace: p.parent.type.whitespace == "pre" ? "full" : !0,
		findPositions: l,
		ruleFromNode: Xo,
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
function Xo(e) {
	let t = e.pmViewDesc;
	if (t) return t.parseRule();
	if (e.nodeName == "BR" && e.parentNode) {
		if (vr && /^(ul|ol)$/i.test(e.parentNode.nodeName)) {
			let e = document.createElement("div");
			return e.appendChild(document.createElement("li")), { skip: e };
		} else if (e.parentNode.lastChild == e || vr && /^(tr|table)$/i.test(e.parentNode.nodeName)) return { ignore: !0 };
	} else if (e.nodeName == "IMG" && e.getAttribute("mark-placeholder")) return { ignore: !0 };
	return null;
}
var Zo = /^(a|abbr|acronym|b|bd[io]|big|br|button|cite|code|data(list)?|del|dfn|em|i|img|ins|kbd|label|map|mark|meter|output|q|ruby|s|samp|small|span|strong|su[bp]|time|u|tt|var)$/i;
function Qo(e, t, n, r, i) {
	let a = e.input.compositionPendingChanges || (e.composing ? e.input.compositionID : 0);
	if (e.input.compositionPendingChanges = 0, t < 0) {
		let t = e.input.lastSelectionTime > Date.now() - 50 ? e.input.lastSelectionOrigin : null, n = Mi(e, t);
		if (n && !e.state.selection.eq(n)) {
			if (gr && Sr && e.input.lastKeyCode === 13 && Date.now() - 100 < e.input.lastKeyCodeTime && e.someProp("handleKeyDown", (t) => t(e, rr(13, "Enter")))) return;
			let r = e.state.tr.setSelection(n);
			t == "pointer" ? r.setMeta("pointer", !0) : t == "key" && r.scrollIntoView(), a && r.setMeta("composition", a), e.dispatch(r);
		}
		return;
	}
	let o = e.state.doc.resolve(t), s = o.sharedDepth(n);
	t = o.before(s + 1), n = e.state.doc.resolve(n).after(s + 1);
	let c = e.state.selection, l = Yo(e, t, n), u = e.state.doc, d = u.slice(l.from, l.to), f, p;
	e.input.lastKeyCode === 8 && Date.now() - 100 < e.input.lastKeyCodeTime ? (f = e.state.selection.to, p = "end") : (f = e.state.selection.from, p = "start"), e.input.lastKeyCode = null;
	let m = rs(d.content, l.doc.content, l.from, f, p);
	if (m && e.input.domChangeCount++, (yr && e.input.lastIOSEnter > Date.now() - 225 || Sr) && i.some((e) => e.nodeType == 1 && !Zo.test(e.nodeName)) && (!m || m.endA >= m.endB) && e.someProp("handleKeyDown", (t) => t(e, rr(13, "Enter")))) {
		e.input.lastIOSEnter = 0;
		return;
	}
	if (!m) if (r && c instanceof O && !c.empty && c.$head.sameParent(c.$anchor) && !e.composing && !(l.sel && l.sel.anchor != l.sel.head)) m = {
		start: c.from,
		endA: c.to,
		endB: c.to
	};
	else {
		if (l.sel) {
			let t = $o(e, e.state.doc, l.sel);
			if (t && !t.eq(e.state.selection)) {
				let n = e.state.tr.setSelection(t);
				a && n.setMeta("composition", a), e.dispatch(n);
			}
		}
		return;
	}
	e.state.selection.from < e.state.selection.to && m.start == m.endB && e.state.selection instanceof O && (m.start > e.state.selection.from && m.start <= e.state.selection.from + 2 && e.state.selection.from >= l.from ? m.start = e.state.selection.from : m.endA < e.state.selection.to && m.endA >= e.state.selection.to - 2 && e.state.selection.to <= l.to && (m.endB += e.state.selection.to - m.endA, m.endA = e.state.selection.to)), fr && pr <= 11 && m.endB == m.start + 1 && m.endA == m.start && m.start > l.from && l.doc.textBetween(m.start - l.from - 1, m.start - l.from + 1) == " \xA0" && (m.start--, m.endA--, m.endB--);
	let h = l.doc.resolveNoCache(m.start - l.from), g = l.doc.resolveNoCache(m.endB - l.from), _ = u.resolve(m.start), v = h.sameParent(g) && h.parent.inlineContent && _.end() >= m.endA;
	if ((yr && e.input.lastIOSEnter > Date.now() - 225 && (!v || i.some((e) => e.nodeName == "DIV" || e.nodeName == "P")) || !v && h.pos < l.doc.content.size && (!h.sameParent(g) || !h.parent.inlineContent) && h.pos < g.pos && !/\S/.test(l.doc.textBetween(h.pos, g.pos, "", ""))) && e.someProp("handleKeyDown", (t) => t(e, rr(13, "Enter")))) {
		e.input.lastIOSEnter = 0;
		return;
	}
	if (e.state.selection.anchor > m.start && ts(u, m.start, m.endA, h, g) && e.someProp("handleKeyDown", (t) => t(e, rr(8, "Backspace")))) {
		Sr && gr && e.domObserver.suppressSelectionUpdates();
		return;
	}
	gr && m.endB == m.start && (e.input.lastChromeDelete = Date.now()), Sr && !v && h.start() != g.start() && g.parentOffset == 0 && h.depth == g.depth && l.sel && l.sel.anchor == l.sel.head && l.sel.head == m.endA && (m.endB -= 2, g = l.doc.resolveNoCache(m.endB - l.from), setTimeout(() => {
		e.someProp("handleKeyDown", function(t) {
			return t(e, rr(13, "Enter"));
		});
	}, 20));
	let y = m.start, b = m.endA, x = (t) => {
		let n = t || e.state.tr.replace(y, b, l.doc.slice(m.start - l.from, m.endB - l.from));
		if (l.sel) {
			let t = $o(e, n.doc, l.sel);
			t && !(gr && e.composing && t.empty && (m.start != m.endB || e.input.lastChromeDelete < Date.now() - 100) && (t.head == y || t.head == n.mapping.map(b) - 1) || fr && t.empty && t.head == y) && n.setSelection(t);
		}
		return a && n.setMeta("composition", a), n.scrollIntoView();
	}, S;
	if (v) if (h.pos == g.pos) {
		fr && pr <= 11 && h.parentOffset == 0 && (e.domObserver.suppressSelectionUpdates(), setTimeout(() => Pi(e), 20));
		let t = x(e.state.tr.delete(y, b)), n = u.resolve(m.start).marksAcross(u.resolve(m.endA));
		n && t.ensureMarks(n), e.dispatch(t);
	} else if (m.endA == m.endB && (S = es(h.parent.content.cut(h.parentOffset, g.parentOffset), _.parent.content.cut(_.parentOffset, m.endA - _.start())))) {
		let t = x(e.state.tr);
		S.type == "add" ? t.addMark(y, b, S.mark) : t.removeMark(y, b, S.mark), e.dispatch(t);
	} else if (h.parent.child(h.index()).isText && h.index() == g.index() - +!g.textOffset) {
		let t = h.parent.textBetween(h.parentOffset, g.parentOffset), n = () => x(e.state.tr.insertText(t, y, b));
		e.someProp("handleTextInput", (r) => r(e, y, b, t, n)) || e.dispatch(n());
	} else e.dispatch(x());
	else e.dispatch(x());
}
function $o(e, t, n) {
	return Math.max(n.anchor, n.head) > t.content.size ? null : Ui(e, t.resolve(n.anchor), t.resolve(n.head));
}
function es(e, t) {
	let n = e.firstChild.marks, r = t.firstChild.marks, i = n, a = r, o, s, c;
	for (let e = 0; e < r.length; e++) i = r[e].removeFromSet(i);
	for (let e = 0; e < n.length; e++) a = n[e].removeFromSet(a);
	if (i.length == 1 && a.length == 0) s = i[0], o = "add", c = (e) => e.mark(s.addToSet(e.marks));
	else if (i.length == 0 && a.length == 1) s = a[0], o = "remove", c = (e) => e.mark(s.removeFromSet(e.marks));
	else return null;
	let l = [];
	for (let e = 0; e < t.childCount; e++) l.push(c(t.child(e)));
	if (d.from(l).eq(e)) return {
		mark: s,
		type: o
	};
}
function ts(e, t, n, r, i) {
	if (n - t <= i.pos - r.pos || ns(r, !0, !1) < i.pos) return !1;
	let a = e.resolve(t);
	if (!r.parent.isTextblock) {
		let e = a.nodeAfter;
		return e != null && n == t + e.nodeSize;
	}
	if (a.parentOffset < a.parent.content.size || !a.parent.isTextblock) return !1;
	let o = e.resolve(ns(a, !0, !0));
	return !o.parent.isTextblock || o.pos > n || ns(o, !0, !1) < n ? !1 : r.parent.content.cut(r.parentOffset).eq(o.parent.content);
}
function ns(e, t, n) {
	let r = e.depth, i = t ? e.end() : e.pos;
	for (; r > 0 && (t || e.indexAfter(r) == e.node(r).childCount);) r--, i++, t = !1;
	if (n) {
		let t = e.node(r).maybeChild(e.indexAfter(r));
		for (; t && !t.isLeaf;) t = t.firstChild, i++;
	}
	return i;
}
function rs(e, t, n, r, i) {
	let a = e.findDiffStart(t, n);
	if (a == null) return null;
	let { a: o, b: s } = e.findDiffEnd(t, n + e.size, n + t.size);
	if (i == "end") {
		let e = Math.max(0, a - Math.min(o, s));
		r -= o + e - a;
	}
	if (o < a && e.size < t.size) {
		let e = r <= a && r >= o ? a - r : 0;
		a -= e, a && a < t.size && is(t.textBetween(a - 1, a + 1)) && (a += e ? 1 : -1), s = a + (s - o), o = a;
	} else if (s < a) {
		let t = r <= a && r >= s ? a - r : 0;
		a -= t, a && a < e.size && is(e.textBetween(a - 1, a + 1)) && (a += t ? 1 : -1), o = a + (o - s), s = a;
	}
	return {
		start: a,
		endA: o,
		endB: s
	};
}
function is(e) {
	if (e.length != 2) return !1;
	let t = e.charCodeAt(0), n = e.charCodeAt(1);
	return t >= 56320 && t <= 57343 && n >= 55296 && n <= 56319;
}
var as = class {
	constructor(e, t) {
		this._root = null, this.focused = !1, this.trackWrites = null, this.mounted = !1, this.markCursor = null, this.cursorWrapper = null, this.lastSelectedViewDesc = void 0, this.input = new Ma(), this.prevDirectPlugins = [], this.pluginViews = [], this.requiresGeckoHackNode = !1, this.dragging = null, this._props = t, this.state = t.state, this.directPlugins = t.plugins || [], this.directPlugins.forEach(ps), this.dispatch = this.dispatch.bind(this), this.dom = e && e.mount || document.createElement("div"), e && (e.appendChild ? e.appendChild(this.dom) : typeof e == "function" ? e(this.dom) : e.mount && (this.mounted = !0)), this.editable = ls(this), cs(this), this.nodeViews = ds(this), this.docView = fi(this.state.doc, ss(this), Lo(this), this.dom, this), this.domObserver = new Vo(this, (e, t, n, r) => Qo(this, e, t, n, r)), this.domObserver.start(), Na(this), this.updatePluginViews();
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
		e.handleDOMEvents != this._props.handleDOMEvents && Ia(this);
		let t = this._props;
		this._props = e, e.plugins && (e.plugins.forEach(ps), this.directPlugins = e.plugins), this.updateStateInner(e.state, t);
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
		e.storedMarks && this.composing && (ro(this), i = !0), this.state = e;
		let a = n.plugins != e.plugins || this._props.plugins != t.plugins;
		if (a || this._props.plugins != t.plugins || this._props.nodeViews != t.nodeViews) {
			let e = ds(this);
			fs(e, this.nodeViews) && (this.nodeViews = e, r = !0);
		}
		(a || t.handleDOMEvents != this._props.handleDOMEvents) && Ia(this), this.editable = ls(this), cs(this);
		let o = Lo(this), s = ss(this), c = n.plugins != e.plugins && !n.doc.eq(e.doc) ? "reset" : e.scrollToSelection > n.scrollToSelection ? "to selection" : "preserve", l = r || !this.docView.matchesNode(e.doc, s, o);
		(l || !e.selection.eq(n.selection)) && (i = !0);
		let u = c == "preserve" && i && this.dom.style.overflowAnchor == null && kr(this);
		if (i) {
			this.domObserver.stop();
			let t = l && (fr || gr) && !this.composing && !n.selection.empty && !e.selection.empty && us(n.selection, e.selection);
			if (l) {
				let n = gr ? this.trackWrites = this.domSelectionRange().focusNode : null;
				this.composing && (this.input.compositionNode = io(this)), (r || !this.docView.update(e.doc, s, o, this)) && (this.docView.updateOuterDeco(s), this.docView.destroy(), this.docView = fi(e.doc, s, o, this.dom, this)), n && (!this.trackWrites || !this.dom.contains(this.trackWrites)) && (t = !0);
			}
			t || !(this.input.mouseDown && this.domObserver.currentSelection.eq(this.domSelectionRange()) && Ki(this)) ? Pi(this, t) : (Vi(this, e.selection), this.domObserver.setCurSelection()), this.domObserver.start();
		}
		this.updatePluginViews(n), this.dragging?.node && !n.doc.eq(e.doc) && this.updateDraggedNode(this.dragging, n), c == "reset" ? this.dom.scrollTop = 0 : c == "to selection" ? this.scrollToSelection() : u && jr(u);
	}
	scrollToSelection() {
		let e = this.domSelectionRange().focusNode;
		if (!(!e || !this.dom.contains(e.nodeType == 1 ? e : e.parentNode)) && !this.someProp("handleScrollToSelection", (e) => e(this))) if (this.state.selection instanceof k) {
			let t = this.docView.domAfterPos(this.state.selection.from);
			t.nodeType == 1 && Or(this, t.getBoundingClientRect(), e);
		} else Or(this, this.coordsAtPos(this.state.selection.head, 1), e);
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
		this.dragging = new mo(e.slice, e.move, r < 0 ? void 0 : k.create(this.state.doc, r));
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
		if (fr) {
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
		this.domObserver.stop(), this.editable && Pr(this.dom), Pi(this), this.domObserver.start();
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
		return Hr(this, e);
	}
	coordsAtPos(e, t = 1) {
		return Kr(this, e, t);
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
		return ni(this, t || this.state, e);
	}
	pasteHTML(e, t) {
		return fo(this, "", e, !1, t || new ClipboardEvent("paste"));
	}
	pasteText(e, t) {
		return fo(this, e, null, !0, t || new ClipboardEvent("paste"));
	}
	serializeForClipboard(e) {
		return fa(this, e);
	}
	destroy() {
		this.docView && (Fa(this), this.destroyPluginViews(), this.mounted ? (this.docView.update(this.state.doc, [], Lo(this), this), this.dom.textContent = "") : this.dom.parentNode && this.dom.parentNode.removeChild(this.dom), this.docView.destroy(), this.docView = null, qn());
	}
	get isDestroyed() {
		return this.docView == null;
	}
	dispatchEvent(e) {
		return za(this, e);
	}
	domSelectionRange() {
		let e = this.domSelection();
		return e ? vr && this.root.nodeType === 11 && ir(this.dom.ownerDocument) == this.dom && Ko(this, e) || e : {
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
as.prototype.dispatch = function(e) {
	let t = this._props.dispatchTransaction;
	t ? t.call(this, e) : this.updateState(this.state.apply(e));
};
function ss(e) {
	let t = Object.create(null);
	return t.class = "ProseMirror", t.contenteditable = String(e.editable), e.someProp("attributes", (n) => {
		if (typeof n == "function" && (n = n(e.state)), n) for (let e in n) e == "class" ? t.class += " " + n[e] : e == "style" ? t.style = (t.style ? t.style + ";" : "") + n[e] : !t[e] && e != "contenteditable" && e != "nodeName" && (t[e] = String(n[e]));
	}), t.translate ||= "no", [So.node(0, e.state.doc.content.size, t)];
}
function cs(e) {
	if (e.markCursor) {
		let t = document.createElement("img");
		t.className = "ProseMirror-separator", t.setAttribute("mark-placeholder", "true"), t.setAttribute("alt", ""), e.cursorWrapper = {
			dom: t,
			deco: So.widget(e.state.selection.from, t, {
				raw: !0,
				marks: e.markCursor
			})
		};
	} else e.cursorWrapper = null;
}
function ls(e) {
	return !e.someProp("editable", (t) => t(e.state) === !1);
}
function us(e, t) {
	let n = Math.min(e.$anchor.sharedDepth(e.head), t.$anchor.sharedDepth(t.head));
	return e.$anchor.start(n) != t.$anchor.start(n);
}
function ds(e) {
	let t = Object.create(null);
	function n(e) {
		for (let n in e) Object.prototype.hasOwnProperty.call(t, n) || (t[n] = e[n]);
	}
	return e.someProp("nodeViews", n), e.someProp("markViews", n), t;
}
function fs(e, t) {
	let n = 0, r = 0;
	for (let r in e) {
		if (e[r] != t[r]) return !0;
		n++;
	}
	for (let e in t) r++;
	return n != r;
}
function ps(e) {
	if (e.spec.state || e.spec.filterTransaction || e.spec.appendTransaction) throw RangeError("Plugins passed directly to the view must not have a state component");
}
for (var ms = {
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
}, hs = {
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
}, gs = typeof navigator < "u" && /Mac/.test(navigator.platform), _s = typeof navigator < "u" && /MSIE \d|Trident\/(?:[7-9]|\d{2,})\..*rv:(\d+)/.exec(navigator.userAgent), vs = 0; vs < 10; vs++) ms[48 + vs] = ms[96 + vs] = String(vs);
for (var vs = 1; vs <= 24; vs++) ms[vs + 111] = "F" + vs;
for (var vs = 65; vs <= 90; vs++) ms[vs] = String.fromCharCode(vs + 32), hs[vs] = String.fromCharCode(vs);
for (var ys in ms) hs.hasOwnProperty(ys) || (hs[ys] = ms[ys]);
function bs(e) {
	var t = !(gs && e.metaKey && e.shiftKey && !e.ctrlKey && !e.altKey || _s && e.shiftKey && e.key && e.key.length == 1 || e.key == "Unidentified") && e.key || (e.shiftKey ? hs : ms)[e.keyCode] || e.key || "Unidentified";
	return t == "Esc" && (t = "Escape"), t == "Del" && (t = "Delete"), t == "Left" && (t = "ArrowLeft"), t == "Up" && (t = "ArrowUp"), t == "Right" && (t = "ArrowRight"), t == "Down" && (t = "ArrowDown"), t;
}
//#endregion
//#region node_modules/prosemirror-keymap/dist/index.js
var xs = typeof navigator < "u" && /Mac|iP(hone|[oa]d)/.test(navigator.platform), Ss = typeof navigator < "u" && /Win/.test(navigator.platform);
function Cs(e) {
	let t = e.split(/-(?!$)/), n = t[t.length - 1];
	n == "Space" && (n = " ");
	let r, i, a, o;
	for (let e = 0; e < t.length - 1; e++) {
		let n = t[e];
		if (/^(cmd|meta|m)$/i.test(n)) o = !0;
		else if (/^a(lt)?$/i.test(n)) r = !0;
		else if (/^(c|ctrl|control)$/i.test(n)) i = !0;
		else if (/^s(hift)?$/i.test(n)) a = !0;
		else if (/^mod$/i.test(n)) xs ? o = !0 : i = !0;
		else throw Error("Unrecognized modifier name: " + n);
	}
	return r && (n = "Alt-" + n), i && (n = "Ctrl-" + n), o && (n = "Meta-" + n), a && (n = "Shift-" + n), n;
}
function ws(e) {
	let t = Object.create(null);
	for (let n in e) t[Cs(n)] = e[n];
	return t;
}
function Ts(e, t, n = !0) {
	return t.altKey && (e = "Alt-" + e), t.ctrlKey && (e = "Ctrl-" + e), t.metaKey && (e = "Meta-" + e), n && t.shiftKey && (e = "Shift-" + e), e;
}
function Es(e) {
	return new zn({ props: { handleKeyDown: Ds(e) } });
}
function Ds(e) {
	let t = ws(e);
	return function(e, n) {
		let r = bs(n), i, a = t[Ts(r, n)];
		if (a && a(e.state, e.dispatch, e)) return !0;
		if (r.length == 1 && r != " ") {
			if (n.shiftKey) {
				let i = t[Ts(r, n, !1)];
				if (i && i(e.state, e.dispatch, e)) return !0;
			}
			if ((n.altKey || n.metaKey || n.ctrlKey) && !(Ss && n.ctrlKey && n.altKey) && (i = ms[n.keyCode]) && i != r) {
				let r = t[Ts(i, n)];
				if (r && r(e.state, e.dispatch, e)) return !0;
			}
		}
		return !1;
	};
}
//#endregion
//#region node_modules/prosemirror-commands/dist/index.js
var Os = (e, t) => e.selection.empty ? !1 : (t && t(e.tr.deleteSelection().scrollIntoView()), !0);
function ks(e, t) {
	let { $cursor: n } = e.selection;
	return !n || (t ? !t.endOfTextblock("backward", e) : n.parentOffset > 0) ? null : n;
}
var As = (e, t, n) => {
	let r = ks(e, n);
	if (!r) return !1;
	let i = Is(r);
	if (!i) {
		let n = r.blockRange(), i = n && Mt(n);
		return i == null ? !1 : (t && t(e.tr.lift(n, i).scrollIntoView()), !0);
	}
	let a = i.nodeBefore;
	if (ec(e, i, t, -1)) return !0;
	if (r.parent.content.size == 0 && (Ps(a, "end") || k.isSelectable(a))) for (let n = r.depth;; n--) {
		let o = $t(e.doc, r.before(n), r.after(n), _.empty);
		if (o && o.slice.size < o.to - o.from) {
			if (t) {
				let n = e.tr.step(o);
				n.setSelection(Ps(a, "end") ? D.findFrom(n.doc.resolve(n.mapping.map(i.pos, -1)), -1) : k.create(n.doc, i.pos - a.nodeSize)), t(n.scrollIntoView());
			}
			return !0;
		}
		if (n == 1 || r.node(n - 1).childCount > 1) break;
	}
	return a.isAtom && i.depth == r.depth - 1 ? (t && t(e.tr.delete(i.pos - a.nodeSize, i.pos).scrollIntoView()), !0) : !1;
}, js = (e, t, n) => {
	let r = ks(e, n);
	if (!r) return !1;
	let i = Is(r);
	return i ? Ns(e, i, t) : !1;
}, Ms = (e, t, n) => {
	let r = Ls(e, n);
	if (!r) return !1;
	let i = Bs(r);
	return i ? Ns(e, i, t) : !1;
};
function Ns(e, t, n) {
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
	let s = $t(e.doc, i, o, _.empty);
	if (!s || s.from != i || s instanceof Tt && s.slice.size >= o - i) return !1;
	if (n) {
		let t = e.tr.step(s);
		t.setSelection(O.create(t.doc, i)), n(t.scrollIntoView());
	}
	return !0;
}
function Ps(e, t, n = !1) {
	for (let r = e; r; r = t == "start" ? r.firstChild : r.lastChild) {
		if (r.isTextblock) return !0;
		if (n && r.childCount != 1) return !1;
	}
	return !1;
}
var Fs = (e, t, n) => {
	let { $head: r, empty: i } = e.selection, a = r;
	if (!i) return !1;
	if (r.parent.isTextblock) {
		if (n ? !n.endOfTextblock("backward", e) : r.parentOffset > 0) return !1;
		a = Is(r);
	}
	let o = a && a.nodeBefore;
	return !o || !k.isSelectable(o) ? !1 : (t && t(e.tr.setSelection(k.create(e.doc, a.pos - o.nodeSize)).scrollIntoView()), !0);
};
function Is(e) {
	if (!e.parent.type.spec.isolating) for (let t = e.depth - 1; t >= 0; t--) {
		if (e.index(t) > 0) return e.doc.resolve(e.before(t + 1));
		if (e.node(t).type.spec.isolating) break;
	}
	return null;
}
function Ls(e, t) {
	let { $cursor: n } = e.selection;
	return !n || (t ? !t.endOfTextblock("forward", e) : n.parentOffset < n.parent.content.size) ? null : n;
}
var Rs = (e, t, n) => {
	let r = Ls(e, n);
	if (!r) return !1;
	let i = Bs(r);
	if (!i) return !1;
	let a = i.nodeAfter;
	if (ec(e, i, t, 1)) return !0;
	if (r.parent.content.size == 0 && (Ps(a, "start") || k.isSelectable(a))) {
		let n = $t(e.doc, r.before(), r.after(), _.empty);
		if (n && n.slice.size < n.to - n.from) {
			if (t) {
				let r = e.tr.step(n);
				r.setSelection(Ps(a, "start") ? D.findFrom(r.doc.resolve(r.mapping.map(i.pos)), 1) : k.create(r.doc, r.mapping.map(i.pos))), t(r.scrollIntoView());
			}
			return !0;
		}
	}
	return a.isAtom && i.depth == r.depth - 1 ? (t && t(e.tr.delete(i.pos, i.pos + a.nodeSize).scrollIntoView()), !0) : !1;
}, zs = (e, t, n) => {
	let { $head: r, empty: i } = e.selection, a = r;
	if (!i) return !1;
	if (r.parent.isTextblock) {
		if (n ? !n.endOfTextblock("forward", e) : r.parentOffset < r.parent.content.size) return !1;
		a = Bs(r);
	}
	let o = a && a.nodeAfter;
	return !o || !k.isSelectable(o) ? !1 : (t && t(e.tr.setSelection(k.create(e.doc, a.pos)).scrollIntoView()), !0);
};
function Bs(e) {
	if (!e.parent.type.spec.isolating) for (let t = e.depth - 1; t >= 0; t--) {
		let n = e.node(t);
		if (e.index(t) + 1 < n.childCount) return e.doc.resolve(e.after(t + 1));
		if (n.type.spec.isolating) break;
	}
	return null;
}
var Vs = (e, t) => {
	let n = e.selection, r = n instanceof k, i;
	if (r) {
		if (n.node.isTextblock || !Kt(e.doc, n.from)) return !1;
		i = n.from;
	} else if (i = Yt(e.doc, n.from, -1), i == null) return !1;
	if (t) {
		let n = e.tr.join(i);
		r && n.setSelection(k.create(n.doc, i - e.doc.resolve(i).nodeBefore.nodeSize)), t(n.scrollIntoView());
	}
	return !0;
}, Hs = (e, t) => {
	let n = e.selection, r;
	if (n instanceof k) {
		if (n.node.isTextblock || !Kt(e.doc, n.to)) return !1;
		r = n.to;
	} else if (r = Yt(e.doc, n.to, 1), r == null) return !1;
	return t && t(e.tr.join(r).scrollIntoView()), !0;
}, Us = (e, t) => {
	let { $from: n, $to: r } = e.selection, i = n.blockRange(r), a = i && Mt(i);
	return a == null ? !1 : (t && t(e.tr.lift(i, a).scrollIntoView()), !0);
}, Ws = (e, t) => {
	let { $head: n, $anchor: r } = e.selection;
	return !n.parent.type.spec.code || !n.sameParent(r) ? !1 : (t && t(e.tr.insertText("\n").scrollIntoView()), !0);
};
function Gs(e) {
	for (let t = 0; t < e.edgeCount; t++) {
		let { type: n } = e.edge(t);
		if (n.isTextblock && !n.hasRequiredAttrs()) return n;
	}
	return null;
}
var Ks = (e, t) => {
	let { $head: n, $anchor: r } = e.selection;
	if (!n.parent.type.spec.code || !n.sameParent(r)) return !1;
	let i = n.node(-1), a = n.indexAfter(-1), o = Gs(i.contentMatchAt(a));
	if (!o || !i.canReplaceWith(a, a, o)) return !1;
	if (t) {
		let r = n.after(), i = e.tr.replaceWith(r, r, o.createAndFill());
		i.setSelection(D.near(i.doc.resolve(r), 1)), t(i.scrollIntoView());
	}
	return !0;
}, qs = (e, t) => {
	let n = e.selection, { $from: r, $to: i } = n;
	if (n instanceof Tn || r.parent.inlineContent || i.parent.inlineContent) return !1;
	let a = Gs(i.parent.contentMatchAt(i.indexAfter()));
	if (!a || !a.isTextblock) return !1;
	if (t) {
		let n = (!r.parentOffset && i.index() < i.parent.childCount ? r : i).pos, o = e.tr.insert(n, a.createAndFill());
		o.setSelection(O.create(o.doc, n + 1)), t(o.scrollIntoView());
	}
	return !0;
}, Js = (e, t) => {
	let { $cursor: n } = e.selection;
	if (!n || n.parent.content.size) return !1;
	if (n.depth > 1 && n.after() != n.end(-1)) {
		let r = n.before();
		if (Wt(e.doc, r)) return t && t(e.tr.split(r).scrollIntoView()), !0;
	}
	let r = n.blockRange(), i = r && Mt(r);
	return i == null ? !1 : (t && t(e.tr.lift(r, i).scrollIntoView()), !0);
};
function Ys(e) {
	return (t, n) => {
		let { $from: r, $to: i } = t.selection;
		if (t.selection instanceof k && t.selection.node.isBlock) return !r.parentOffset || !Wt(t.doc, r.pos) ? !1 : (n && n(t.tr.split(r.pos).scrollIntoView()), !0);
		if (!r.depth) return !1;
		let a = [], o, s, c = !1, l = !1;
		for (let t = r.depth;; t--) if (r.node(t).isBlock) {
			c = r.end(t) == r.pos + (r.depth - t), l = r.start(t) == r.pos - (r.depth - t), s = Gs(r.node(t - 1).contentMatchAt(r.indexAfter(t - 1)));
			let n = e && e(i.parent, c, r);
			a.unshift(n || (c && s ? { type: s } : null)), o = t;
			break;
		} else {
			if (t == 1) return !1;
			a.unshift(null);
		}
		let u = t.tr;
		(t.selection instanceof O || t.selection instanceof Tn) && u.deleteSelection();
		let d = u.mapping.map(r.pos), f = Wt(u.doc, d, a.length, a);
		if (f ||= (a[0] = s ? { type: s } : null, Wt(u.doc, d, a.length, a)), !f) return !1;
		if (u.split(d, a.length, a), !c && l && r.node(o).type != s) {
			let e = u.mapping.map(r.before(o)), t = u.doc.resolve(e);
			s && r.node(o - 1).canReplaceWith(t.index(), t.index() + 1, s) && u.setNodeMarkup(u.mapping.map(r.before(o)), s);
		}
		return n && n(u.scrollIntoView()), !0;
	};
}
var Xs = Ys(), Zs = (e, t) => {
	let { $from: n, to: r } = e.selection, i, a = n.sharedDepth(r);
	return a == 0 ? !1 : (i = n.before(a), t && t(e.tr.setSelection(k.create(e.doc, i))), !0);
}, Qs = (e, t) => (t && t(e.tr.setSelection(new Tn(e.doc))), !0);
function $s(e, t, n) {
	let r = t.nodeBefore, i = t.nodeAfter, a = t.index();
	return !r || !i || !r.type.compatibleContent(i.type) ? !1 : !r.content.size && t.parent.canReplace(a - 1, a) ? (n && n(e.tr.delete(t.pos - r.nodeSize, t.pos).scrollIntoView()), !0) : !t.parent.canReplace(a, a + 1) || !(i.isTextblock || Kt(e.doc, t.pos)) ? !1 : (n && n(e.tr.join(t.pos).scrollIntoView()), !0);
}
function ec(e, t, n, r) {
	let i = t.nodeBefore, a = t.nodeAfter, o, s, c = i.type.spec.isolating || a.type.spec.isolating;
	if (!c && $s(e, t, n)) return !0;
	let l = !c && t.parent.canReplace(t.index(), t.index() + 1);
	if (l && (o = (s = i.contentMatchAt(i.childCount)).findWrapping(a.type)) && s.matchType(o[0] || a.type).validEnd) {
		if (n) {
			let r = t.pos + a.nodeSize, s = d.empty;
			for (let e = o.length - 1; e >= 0; e--) s = d.from(o[e].create(null, s));
			s = d.from(i.copy(s));
			let c = e.tr.step(new Et(t.pos - 1, r, t.pos, r, new _(s, 1, 0), o.length, !0)), l = c.doc.resolve(r + 2 * o.length);
			l.nodeAfter && l.nodeAfter.type == i.type && Kt(c.doc, l.pos) && c.join(l.pos), n(c.scrollIntoView());
		}
		return !0;
	}
	let u = a.type.spec.isolating || r > 0 && c ? null : D.findFrom(t, 1), f = u && u.$from.blockRange(u.$to), p = f && Mt(f);
	if (p != null && p >= t.depth) return n && n(e.tr.lift(f, p).scrollIntoView()), !0;
	if (l && Ps(a, "start", !0) && Ps(i, "end")) {
		let r = i, o = [];
		for (; o.push(r), !r.isTextblock;) r = r.lastChild;
		let s = a, c = 1;
		for (; !s.isTextblock; s = s.firstChild) c++;
		if (r.canReplace(r.childCount, r.childCount, s.content)) {
			if (n) {
				let r = d.empty;
				for (let e = o.length - 1; e >= 0; e--) r = d.from(o[e].copy(r));
				n(e.tr.step(new Et(t.pos - o.length, t.pos + a.nodeSize, t.pos + c, t.pos + a.nodeSize - c, new _(r, o.length, 0), 0, !0)).scrollIntoView());
			}
			return !0;
		}
	}
	return !1;
}
function tc(e) {
	return function(t, n) {
		let r = t.selection, i = e < 0 ? r.$from : r.$to, a = i.depth;
		for (; i.node(a).isInline;) {
			if (!a) return !1;
			a--;
		}
		return i.node(a).isTextblock ? (n && n(t.tr.setSelection(O.create(t.doc, e < 0 ? i.start(a) : i.end(a)))), !0) : !1;
	};
}
var nc = tc(-1), rc = tc(1);
function ic(e, t = null) {
	return function(n, r) {
		let { $from: i, $to: a } = n.selection, o = i.blockRange(a), s = o && Pt(o, e, t);
		return s ? (r && r(n.tr.wrap(o, s).scrollIntoView()), !0) : !1;
	};
}
function ac(e, t = null) {
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
function oc(...e) {
	return function(t, n, r) {
		for (let i = 0; i < e.length; i++) if (e[i](t, n, r)) return !0;
		return !1;
	};
}
var sc = oc(Os, As, Fs), cc = oc(Os, Rs, zs), lc = {
	Enter: oc(Ws, qs, Js, Xs),
	"Mod-Enter": Ks,
	Backspace: sc,
	"Mod-Backspace": sc,
	"Shift-Backspace": sc,
	Delete: cc,
	"Mod-Delete": cc,
	"Mod-a": Qs
}, uc = {
	"Ctrl-h": lc.Backspace,
	"Alt-Backspace": lc["Mod-Backspace"],
	"Ctrl-d": lc.Delete,
	"Ctrl-Alt-Backspace": lc["Mod-Delete"],
	"Alt-Delete": lc["Mod-Delete"],
	"Alt-d": lc["Mod-Delete"],
	"Ctrl-a": nc,
	"Ctrl-e": rc
};
for (let e in lc) uc[e] = lc[e];
typeof navigator < "u" ? /Mac|iP(hone|[oa]d)/.test(navigator.platform) : typeof os < "u" && os.platform && os.platform();
//#endregion
//#region node_modules/prosemirror-schema-list/dist/index.js
function dc(e, t = null) {
	return function(n, r) {
		let { $from: i, $to: a } = n.selection, o = i.blockRange(a);
		if (!o) return !1;
		let s = r ? n.tr : null;
		return fc(s, o, e, t) ? (r && r(s.scrollIntoView()), !0) : !1;
	};
}
function fc(e, t, n, r = null) {
	let i = !1, a = t, o = t.$from.doc;
	if (t.depth >= 2 && t.$from.node(t.depth - 1).type.compatibleContent(n) && t.startIndex == 0) {
		if (t.$from.index(t.depth - 1) == 0) return !1;
		let e = o.resolve(t.start - 2);
		a = new se(e, e, t.depth), t.endIndex < t.parent.childCount && (t = new se(t.$from, o.resolve(t.$to.end(t.depth)), t.depth)), i = !0;
	}
	let s = Pt(a, n, r, t);
	return s ? (e && pc(e, t, s, i, n), !0) : !1;
}
function pc(e, t, n, r, i) {
	let a = d.empty;
	for (let e = n.length - 1; e >= 0; e--) a = d.from(n[e].type.create(n[e].attrs, a));
	e.step(new Et(t.start - (r ? 2 : 0), t.end, t.start, t.end, new _(a, 0, 0), n.length, !0));
	let o = 0;
	for (let e = 0; e < n.length; e++) n[e].type == i && (o = e + 1);
	let s = n.length - o, c = t.start + n.length - (r ? 2 : 0), l = t.parent;
	for (let n = t.startIndex, r = t.endIndex, i = !0; n < r; n++, i = !1) !i && Wt(e.doc, c, s) && (e.split(c, s), c += 2 * s), c += l.child(n).nodeSize;
	return e;
}
function mc(e) {
	return function(t, n) {
		let { $from: r, $to: i } = t.selection, a = r.blockRange(i, (t) => t.childCount > 0 && t.firstChild.type == e);
		return a ? n ? r.node(a.depth - 1).type == e ? hc(t, n, e, a) : gc(t, n, a) : !0 : !1;
	};
}
function hc(e, t, n, r) {
	let i = e.tr, a = r.end, o = r.$to.end(r.depth);
	a < o && (i.step(new Et(a - 1, o, a, o, new _(d.from(n.create(null, r.parent.copy())), 1, 0), 1, !0)), r = new se(i.doc.resolve(r.$from.pos), i.doc.resolve(o), r.depth));
	let s = Mt(r);
	if (s == null) return !1;
	i.lift(r, s);
	let c = i.doc.resolve(i.mapping.map(a, -1) - 1);
	return Kt(i.doc, c.pos) && c.nodeBefore.type == c.nodeAfter.type && i.join(c.pos), t(i.scrollIntoView()), !0;
}
function gc(e, t, n) {
	let r = e.tr, i = n.parent;
	for (let e = n.end, t = n.endIndex - 1, a = n.startIndex; t > a; t--) e -= i.child(t).nodeSize, r.delete(e - 1, e + 1);
	let a = r.doc.resolve(n.start), o = a.nodeAfter;
	if (r.mapping.map(n.end) != n.start + a.nodeAfter.nodeSize) return !1;
	let s = n.startIndex == 0, c = n.endIndex == i.childCount, l = a.node(-1), u = a.index(-1);
	if (!l.canReplace(u + +!s, u + 1, o.content.append(c ? d.empty : d.from(i)))) return !1;
	let f = a.pos, p = f + o.nodeSize;
	return r.step(new Et(f - +!!s, p + +!!c, f + 1, p - 1, new _((s ? d.empty : d.from(i.copy(d.empty))).append(c ? d.empty : d.from(i.copy(d.empty))), +!s, +!c), +!s)), t(r.scrollIntoView()), !0;
}
function _c(e) {
	return function(t, n) {
		let { $from: r, $to: i } = t.selection, a = r.blockRange(i, (t) => t.childCount > 0 && t.firstChild.type == e);
		if (!a) return !1;
		let o = a.startIndex;
		if (o == 0) return !1;
		let s = a.parent, c = s.child(o - 1);
		if (c.type != e) return !1;
		if (n) {
			let r = c.lastChild && c.lastChild.type == s.type, i = d.from(r ? e.create() : null), o = new _(d.from(e.create(null, d.from(s.type.create(null, i)))), r ? 3 : 1, 0), l = a.start, u = a.end;
			n(t.tr.step(new Et(l - (r ? 3 : 1), u, l, u, o, 1, !0)).scrollIntoView());
		}
		return !0;
	};
}
//#endregion
//#region node_modules/@tiptap/core/dist/index.js
function vc(e) {
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
var yc = class {
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
			state: vc({
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
}, bc = class {
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
function A(e, t, n) {
	return e.config[t] === void 0 && e.parent ? A(e.parent, t, n) : typeof e.config[t] == "function" ? e.config[t].bind({
		...n,
		parent: e.parent ? A(e.parent, t, n) : null
	}) : e.config[t];
}
function xc(e) {
	return {
		baseExtensions: e.filter((e) => e.type === "extension"),
		nodeExtensions: e.filter((e) => e.type === "node"),
		markExtensions: e.filter((e) => e.type === "mark")
	};
}
function Sc(e) {
	let t = [], { nodeExtensions: n, markExtensions: r } = xc(e), i = [...n, ...r], a = {
		default: null,
		rendered: !0,
		renderHTML: null,
		parseHTML: null,
		keepOnSplit: !0,
		isRequired: !1
	};
	return e.forEach((e) => {
		let n = A(e, "addGlobalAttributes", {
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
		let n = A(e, "addAttributes", {
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
function Cc(e, t) {
	if (typeof e == "string") {
		if (!t.nodes[e]) throw Error(`There is no node type named '${e}'. Maybe you forgot to add the extension?`);
		return t.nodes[e];
	}
	return e;
}
function wc(...e) {
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
function Tc(e, t) {
	return t.filter((t) => t.type === e.type.name).filter((e) => e.attribute.rendered).map((t) => t.attribute.renderHTML ? t.attribute.renderHTML(e.attrs) || {} : { [t.name]: e.attrs[t.name] }).reduce((e, t) => wc(e, t), {});
}
function Ec(e) {
	return typeof e == "function";
}
function j(e, t = void 0, ...n) {
	return Ec(e) ? t ? e.bind(t)(...n) : e(...n) : e;
}
function Dc(e = {}) {
	return Object.keys(e).length === 0 && e.constructor === Object;
}
function Oc(e) {
	return typeof e == "string" ? e.match(/^[+-]?(?:\d*\.)?\d+$/) ? Number(e) : e === "true" ? !0 : e === "false" ? !1 : e : e;
}
function kc(e, t) {
	return "style" in e ? e : {
		...e,
		getAttrs: (n) => {
			let r = e.getAttrs ? e.getAttrs(n) : e.attrs;
			if (r === !1) return !1;
			let i = t.reduce((e, t) => {
				let r = t.attribute.parseHTML ? t.attribute.parseHTML(n) : Oc(n.getAttribute(t.name));
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
function Ac(e) {
	return Object.fromEntries(Object.entries(e).filter(([e, t]) => e === "attrs" && Dc(t) ? !1 : t != null));
}
function jc(e, t) {
	let n = Sc(e), { nodeExtensions: r, markExtensions: i } = xc(e);
	return new Pe({
		topNode: r.find((e) => A(e, "topNode"))?.name,
		nodes: Object.fromEntries(r.map((r) => {
			let i = n.filter((e) => e.type === r.name), a = {
				name: r.name,
				options: r.options,
				storage: r.storage,
				editor: t
			}, o = Ac({
				...e.reduce((e, t) => {
					let n = A(t, "extendNodeSchema", a);
					return {
						...e,
						...n ? n(r) : {}
					};
				}, {}),
				content: j(A(r, "content", a)),
				marks: j(A(r, "marks", a)),
				group: j(A(r, "group", a)),
				inline: j(A(r, "inline", a)),
				atom: j(A(r, "atom", a)),
				selectable: j(A(r, "selectable", a)),
				draggable: j(A(r, "draggable", a)),
				code: j(A(r, "code", a)),
				whitespace: j(A(r, "whitespace", a)),
				linebreakReplacement: j(A(r, "linebreakReplacement", a)),
				defining: j(A(r, "defining", a)),
				isolating: j(A(r, "isolating", a)),
				attrs: Object.fromEntries(i.map((e) => [e.name, { default: e?.attribute?.default }]))
			}), s = j(A(r, "parseHTML", a));
			s && (o.parseDOM = s.map((e) => kc(e, i)));
			let c = A(r, "renderHTML", a);
			c && (o.toDOM = (e) => c({
				node: e,
				HTMLAttributes: Tc(e, i)
			}));
			let l = A(r, "renderText", a);
			return l && (o.toText = l), [r.name, o];
		})),
		marks: Object.fromEntries(i.map((r) => {
			let i = n.filter((e) => e.type === r.name), a = {
				name: r.name,
				options: r.options,
				storage: r.storage,
				editor: t
			}, o = Ac({
				...e.reduce((e, t) => {
					let n = A(t, "extendMarkSchema", a);
					return {
						...e,
						...n ? n(r) : {}
					};
				}, {}),
				inclusive: j(A(r, "inclusive", a)),
				excludes: j(A(r, "excludes", a)),
				group: j(A(r, "group", a)),
				spanning: j(A(r, "spanning", a)),
				code: j(A(r, "code", a)),
				attrs: Object.fromEntries(i.map((e) => [e.name, { default: e?.attribute?.default }]))
			}), s = j(A(r, "parseHTML", a));
			s && (o.parseDOM = s.map((e) => kc(e, i)));
			let c = A(r, "renderHTML", a);
			return c && (o.toDOM = (e) => c({
				mark: e,
				HTMLAttributes: Tc(e, i)
			})), [r.name, o];
		}))
	});
}
function Mc(e, t) {
	return t.nodes[e] || t.marks[e] || null;
}
function Nc(e, t) {
	return Array.isArray(t) ? t.some((t) => (typeof t == "string" ? t : t.name) === e.name) : t;
}
function Pc(e, t) {
	let n = Qe.fromSchema(t).serializeFragment(e), r = document.implementation.createHTMLDocument().createElement("div");
	return r.appendChild(n), r.innerHTML;
}
var Fc = (e, t = 500) => {
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
function Ic(e) {
	return Object.prototype.toString.call(e) === "[object RegExp]";
}
var Lc = class {
	constructor(e) {
		this.find = e.find, this.handler = e.handler;
	}
}, Rc = (e, t) => {
	if (Ic(t)) return t.exec(e);
	let n = t(e);
	if (!n) return null;
	let r = [n.text];
	return r.index = n.index, r.input = e, r.data = n.data, n.replaceWith && (n.text.includes(n.replaceWith) || console.warn("[tiptap warn]: \"inputRuleMatch.replaceWith\" must be part of \"inputRuleMatch.text\"."), r.push(n.replaceWith)), r;
};
function zc(e) {
	let { editor: t, from: n, to: r, text: i, rules: a, plugin: o } = e, { view: s } = t;
	if (s.composing) return !1;
	let c = s.state.doc.resolve(n);
	if (c.parent.type.spec.code || (c.nodeBefore || c.nodeAfter)?.marks.find((e) => e.type.spec.code)) return !1;
	let l = !1, u = Fc(c) + i;
	return a.forEach((e) => {
		if (l) return;
		let a = Rc(u, e.find);
		if (!a) return;
		let c = s.state.tr, d = vc({
			state: s.state,
			transaction: c
		}), f = {
			from: n - (a[0].length - i.length),
			to: r
		}, { commands: p, chain: m, can: h } = new yc({
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
function Bc(e) {
	let { editor: t, rules: n } = e, r = new zn({
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
					e = typeof e == "string" ? e : Pc(d.from(e), a.schema);
					let { from: i } = s;
					zc({
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
				return zc({
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
				i && zc({
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
				return a ? zc({
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
function Vc(e) {
	return Object.prototype.toString.call(e).slice(8, -1);
}
function Hc(e) {
	return Vc(e) === "Object" ? e.constructor === Object && Object.getPrototypeOf(e) === Object.prototype : !1;
}
function Uc(e, t) {
	let n = { ...e };
	return Hc(e) && Hc(t) && Object.keys(t).forEach((r) => {
		Hc(t[r]) && Hc(e[r]) ? n[r] = Uc(e[r], t[r]) : n[r] = t[r];
	}), n;
}
var Wc = class e {
	constructor(e = {}) {
		this.type = "mark", this.name = "mark", this.parent = null, this.child = null, this.config = {
			name: this.name,
			defaultOptions: {}
		}, this.config = {
			...this.config,
			...e
		}, this.name = this.config.name, e.defaultOptions && Object.keys(e.defaultOptions).length > 0 && console.warn(`[tiptap warn]: BREAKING CHANGE: "defaultOptions" is deprecated. Please use "addOptions" instead. Found in extension: "${this.name}".`), this.options = this.config.defaultOptions, this.config.addOptions && (this.options = j(A(this, "addOptions", { name: this.name }))), this.storage = j(A(this, "addStorage", {
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
			addOptions: () => Uc(this.options, e)
		});
		return t.name = this.name, t.parent = this.parent, t;
	}
	extend(t = {}) {
		let n = new e(t);
		return n.parent = this, this.child = n, n.name = t.name ? t.name : n.parent.name, t.defaultOptions && Object.keys(t.defaultOptions).length > 0 && console.warn(`[tiptap warn]: BREAKING CHANGE: "defaultOptions" is deprecated. Please use "addOptions" instead. Found in extension: "${n.name}".`), n.options = j(A(n, "addOptions", { name: n.name })), n.storage = j(A(n, "addStorage", {
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
function Gc(e) {
	return typeof e == "number";
}
var Kc = class {
	constructor(e) {
		this.find = e.find, this.handler = e.handler;
	}
}, qc = (e, t, n) => {
	if (Ic(t)) return [...e.matchAll(t)];
	let r = t(e, n);
	return r ? r.map((t) => {
		let n = [t.text];
		return n.index = t.index, n.input = e, n.data = t.data, t.replaceWith && (t.text.includes(t.replaceWith) || console.warn("[tiptap warn]: \"pasteRuleMatch.replaceWith\" must be part of \"pasteRuleMatch.text\"."), n.push(t.replaceWith)), n;
	}) : [];
};
function Jc(e) {
	let { editor: t, state: n, from: r, to: i, rule: a, pasteEvent: o, dropEvent: s } = e, { commands: c, chain: l, can: u } = new yc({
		editor: t,
		state: n
	}), d = [];
	return n.doc.nodesBetween(r, i, (e, t) => {
		if (!e.isTextblock || e.type.spec.code) return;
		let f = Math.max(r, t), p = Math.min(i, t + e.content.size);
		qc(e.textBetween(f - t, p - t, void 0, "￼"), a.find, o).forEach((e) => {
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
var Yc = null, Xc = (e) => {
	var t;
	let n = new ClipboardEvent("paste", { clipboardData: new DataTransfer() });
	return (t = n.clipboardData) == null || t.setData("text/html", e), n;
};
function Zc(e) {
	let { editor: t, rules: n } = e, r = null, i = !1, a = !1, o = typeof ClipboardEvent < "u" ? new ClipboardEvent("paste") : null, s;
	try {
		s = typeof DragEvent < "u" ? new DragEvent("drop") : null;
	} catch {
		s = null;
	}
	let c = ({ state: e, from: n, to: r, rule: i, pasteEvt: a }) => {
		let c = e.tr;
		if (!(!Jc({
			editor: t,
			state: vc({
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
	return n.map((e) => new zn({
		view(e) {
			let n = (n) => {
				r = e.dom.parentElement?.contains(n.target) ? e.dom.parentElement : null, r && (Yc = t);
			}, i = () => {
				Yc &&= null;
			};
			return window.addEventListener("dragstart", n), window.addEventListener("dragend", i), { destroy() {
				window.removeEventListener("dragstart", n), window.removeEventListener("dragend", i);
			} };
		},
		props: { handleDOMEvents: {
			drop: (e, t) => {
				if (a = r === e.dom.parentElement, s = t, !a) {
					let e = Yc;
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
			let s = t[0], l = s.getMeta("uiEvent") === "paste" && !i, u = s.getMeta("uiEvent") === "drop" && !a, f = s.getMeta("applyPasteRules"), p = !!f;
			if (!l && !u && !p) return;
			if (p) {
				let { text: t } = f;
				t = typeof t == "string" ? t : Pc(d.from(t), r.schema);
				let { from: n } = f, i = n + t.length, a = Xc(t);
				return c({
					rule: e,
					state: r,
					from: n,
					to: { b: i },
					pasteEvt: a
				});
			}
			let m = n.doc.content.findDiffStart(r.doc.content), h = n.doc.content.findDiffEnd(r.doc.content);
			if (!(!Gc(m) || !h || m === h.b)) return c({
				rule: e,
				state: r,
				from: m,
				to: h,
				pasteEvt: o
			});
		}
	}));
}
function Qc(e) {
	let t = e.filter((t, n) => e.indexOf(t) !== n);
	return Array.from(new Set(t));
}
var $c = class e {
	constructor(t, n) {
		this.splittableMarks = [], this.editor = n, this.extensions = e.resolve(t), this.schema = jc(this.extensions, n), this.setupExtensions();
	}
	static resolve(t) {
		let n = e.sort(e.flatten(t)), r = Qc(n.map((e) => e.name));
		return r.length && console.warn(`[tiptap warn]: Duplicate extension names found: [${r.map((e) => `'${e}'`).join(", ")}]. This can lead to issues.`), n;
	}
	static flatten(e) {
		return e.map((e) => {
			let t = A(e, "addExtensions", {
				name: e.name,
				options: e.options,
				storage: e.storage
			});
			return t ? [e, ...this.flatten(t())] : e;
		}).flat(10);
	}
	static sort(e) {
		return e.sort((e, t) => {
			let n = A(e, "priority") || 100, r = A(t, "priority") || 100;
			return n > r ? -1 : +(n < r);
		});
	}
	get commands() {
		return this.extensions.reduce((e, t) => {
			let n = A(t, "addCommands", {
				name: t.name,
				options: t.options,
				storage: t.storage,
				editor: this.editor,
				type: Mc(t.name, this.schema)
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
				type: Mc(e.name, this.schema)
			}, a = [], o = A(e, "addKeyboardShortcuts", n), s = {};
			if (e.type === "mark" && A(e, "exitable", n) && (s.ArrowRight = () => Wc.handleExit({
				editor: t,
				mark: e
			})), o) {
				let e = Object.fromEntries(Object.entries(o()).map(([e, n]) => [e, () => n({ editor: t })]));
				s = {
					...s,
					...e
				};
			}
			let c = Es(s);
			a.push(c);
			let l = A(e, "addInputRules", n);
			Nc(e, t.options.enableInputRules) && l && r.push(...l());
			let u = A(e, "addPasteRules", n);
			Nc(e, t.options.enablePasteRules) && u && i.push(...u());
			let d = A(e, "addProseMirrorPlugins", n);
			if (d) {
				let e = d();
				a.push(...e);
			}
			return a;
		}).flat();
		return [
			Bc({
				editor: t,
				rules: r
			}),
			...Zc({
				editor: t,
				rules: i
			}),
			...a
		];
	}
	get attributes() {
		return Sc(this.extensions);
	}
	get nodeViews() {
		let { editor: e } = this, { nodeExtensions: t } = xc(this.extensions);
		return Object.fromEntries(t.filter((e) => !!A(e, "addNodeView")).map((t) => {
			let n = this.attributes.filter((e) => e.type === t.name), r = A(t, "addNodeView", {
				name: t.name,
				options: t.options,
				storage: t.storage,
				editor: e,
				type: Cc(t.name, this.schema)
			});
			return r ? [t.name, (i, a, o, s, c) => {
				let l = Tc(i, n);
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
				type: Mc(e.name, this.schema)
			};
			e.type === "mark" && (j(A(e, "keepOnSplit", t)) ?? !0) && this.splittableMarks.push(e.name);
			let n = A(e, "onBeforeCreate", t), r = A(e, "onCreate", t), i = A(e, "onUpdate", t), a = A(e, "onSelectionUpdate", t), o = A(e, "onTransaction", t), s = A(e, "onFocus", t), c = A(e, "onBlur", t), l = A(e, "onDestroy", t);
			n && this.editor.on("beforeCreate", n), r && this.editor.on("create", r), i && this.editor.on("update", i), a && this.editor.on("selectionUpdate", a), o && this.editor.on("transaction", o), s && this.editor.on("focus", s), c && this.editor.on("blur", c), l && this.editor.on("destroy", l);
		});
	}
}, el = class e {
	constructor(e = {}) {
		this.type = "extension", this.name = "extension", this.parent = null, this.child = null, this.config = {
			name: this.name,
			defaultOptions: {}
		}, this.config = {
			...this.config,
			...e
		}, this.name = this.config.name, e.defaultOptions && Object.keys(e.defaultOptions).length > 0 && console.warn(`[tiptap warn]: BREAKING CHANGE: "defaultOptions" is deprecated. Please use "addOptions" instead. Found in extension: "${this.name}".`), this.options = this.config.defaultOptions, this.config.addOptions && (this.options = j(A(this, "addOptions", { name: this.name }))), this.storage = j(A(this, "addStorage", {
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
			addOptions: () => Uc(this.options, e)
		});
		return t.name = this.name, t.parent = this.parent, t;
	}
	extend(t = {}) {
		let n = new e({
			...this.config,
			...t
		});
		return n.parent = this, this.child = n, n.name = t.name ? t.name : n.parent.name, t.defaultOptions && Object.keys(t.defaultOptions).length > 0 && console.warn(`[tiptap warn]: BREAKING CHANGE: "defaultOptions" is deprecated. Please use "addOptions" instead. Found in extension: "${n.name}".`), n.options = j(A(n, "addOptions", { name: n.name })), n.storage = j(A(n, "addStorage", {
			name: n.name,
			options: n.options
		})), n;
	}
};
function tl(e, t, n) {
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
function nl(e) {
	return Object.fromEntries(Object.entries(e.nodes).filter(([, e]) => e.spec.toText).map(([e, t]) => [e, t.spec.toText]));
}
var rl = el.create({
	name: "clipboardTextSerializer",
	addOptions() {
		return { blockSeparator: void 0 };
	},
	addProseMirrorPlugins() {
		return [new zn({
			key: new Hn("clipboardTextSerializer"),
			props: { clipboardTextSerializer: () => {
				let { editor: e } = this, { state: t, schema: n } = e, { doc: r, selection: i } = t, { ranges: a } = i, o = Math.min(...a.map((e) => e.$from.pos)), s = Math.max(...a.map((e) => e.$to.pos)), c = nl(n);
				return tl(r, {
					from: o,
					to: s
				}, {
					...this.options.blockSeparator === void 0 ? {} : { blockSeparator: this.options.blockSeparator },
					textSerializers: c
				});
			} }
		})];
	}
}), il = () => ({ editor: e, view: t }) => (requestAnimationFrame(() => {
	var n;
	e.isDestroyed || (t.dom.blur(), (n = window == null ? void 0 : window.getSelection()) == null || n.removeAllRanges());
}), !0), al = (e = !1) => ({ commands: t }) => t.setContent("", e), ol = () => ({ state: e, tr: t, dispatch: n }) => {
	let { selection: r } = t, { ranges: i } = r;
	return n && i.forEach(({ $from: n, $to: r }) => {
		e.doc.nodesBetween(n.pos, r.pos, (e, n) => {
			if (e.type.isText) return;
			let { doc: r, mapping: i } = t, a = r.resolve(i.map(n)), o = r.resolve(i.map(n + e.nodeSize)), s = a.blockRange(o);
			if (!s) return;
			let c = Mt(s);
			if (e.type.isTextblock) {
				let { defaultType: e } = a.parent.contentMatchAt(a.index());
				t.setNodeMarkup(s.start, e);
			}
			(c || c === 0) && t.lift(s, c);
		});
	}), !0;
}, sl = (e) => (t) => e(t), cl = () => ({ state: e, dispatch: t }) => qs(e, t), ll = (e, t) => ({ editor: n, tr: r }) => {
	let { state: i } = n, a = i.doc.slice(e.from, e.to);
	r.deleteRange(e.from, e.to);
	let o = r.mapping.map(t);
	return r.insert(o, a.content), r.setSelection(new O(r.doc.resolve(Math.max(o - 1, 0)))), !0;
}, ul = () => ({ tr: e, dispatch: t }) => {
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
}, dl = (e) => ({ tr: t, state: n, dispatch: r }) => {
	let i = Cc(e, n.schema), a = t.selection.$anchor;
	for (let e = a.depth; e > 0; --e) if (a.node(e).type === i) {
		if (r) {
			let n = a.before(e), r = a.after(e);
			t.delete(n, r).scrollIntoView();
		}
		return !0;
	}
	return !1;
}, fl = (e) => ({ tr: t, dispatch: n }) => {
	let { from: r, to: i } = e;
	return n && t.delete(r, i), !0;
}, pl = () => ({ state: e, dispatch: t }) => Os(e, t), ml = () => ({ commands: e }) => e.keyboardShortcut("Enter"), hl = () => ({ state: e, dispatch: t }) => Ks(e, t);
function gl(e, t, n = { strict: !0 }) {
	let r = Object.keys(t);
	return r.length ? r.every((r) => n.strict ? t[r] === e[r] : Ic(t[r]) ? t[r].test(e[r]) : t[r] === e[r]) : !0;
}
function _l(e, t, n = {}) {
	return e.find((e) => e.type === t && gl(Object.fromEntries(Object.keys(n).map((t) => [t, e.attrs[t]])), n));
}
function vl(e, t, n = {}) {
	return !!_l(e, t, n);
}
function yl(e, t, n) {
	if (!e || !t) return;
	let r = e.parent.childAfter(e.parentOffset);
	if ((!r.node || !r.node.marks.some((e) => e.type === t)) && (r = e.parent.childBefore(e.parentOffset)), !r.node || !r.node.marks.some((e) => e.type === t) || (n ||= r.node.marks[0]?.attrs, !_l([...r.node.marks], t, n))) return;
	let i = r.index, a = e.start() + r.offset, o = i + 1, s = a + r.node.nodeSize;
	for (; i > 0 && vl([...e.parent.child(i - 1).marks], t, n);) --i, a -= e.parent.child(i).nodeSize;
	for (; o < e.parent.childCount && vl([...e.parent.child(o).marks], t, n);) s += e.parent.child(o).nodeSize, o += 1;
	return {
		from: a,
		to: s
	};
}
function bl(e, t) {
	if (typeof e == "string") {
		if (!t.marks[e]) throw Error(`There is no mark type named '${e}'. Maybe you forgot to add the extension?`);
		return t.marks[e];
	}
	return e;
}
var xl = (e, t = {}) => ({ tr: n, state: r, dispatch: i }) => {
	let a = bl(e, r.schema), { doc: o, selection: s } = n, { $from: c, from: l, to: u } = s;
	if (i) {
		let e = yl(c, a, t);
		if (e && e.from <= l && e.to >= u) {
			let t = O.create(o, e.from, e.to);
			n.setSelection(t);
		}
	}
	return !0;
}, Sl = (e) => (t) => {
	let n = typeof e == "function" ? e(t) : e;
	for (let e = 0; e < n.length; e += 1) if (n[e](t)) return !0;
	return !1;
};
function Cl(e) {
	return e instanceof O;
}
function wl(e = 0, t = 0, n = 0) {
	return Math.min(Math.max(e, t), n);
}
function Tl(e, t = null) {
	if (!t) return null;
	let n = D.atStart(e), r = D.atEnd(e);
	if (t === "start" || t === !0) return n;
	if (t === "end") return r;
	let i = n.from, a = r.to;
	return t === "all" ? O.create(e, wl(0, i, a), wl(e.content.size, i, a)) : O.create(e, wl(t, i, a), wl(t, i, a));
}
function El() {
	return navigator.platform === "Android" || /android/i.test(navigator.userAgent);
}
function Dl() {
	return [
		"iPad Simulator",
		"iPhone Simulator",
		"iPod Simulator",
		"iPad",
		"iPhone",
		"iPod"
	].includes(navigator.platform) || navigator.userAgent.includes("Mac") && "ontouchend" in document;
}
function Ol() {
	return typeof navigator < "u" ? /^((?!chrome|android).)*safari/i.test(navigator.userAgent) : !1;
}
var kl = (e = null, t = {}) => ({ editor: n, view: r, tr: i, dispatch: a }) => {
	t = {
		scrollIntoView: !0,
		...t
	};
	let o = () => {
		(Dl() || El()) && r.dom.focus(), requestAnimationFrame(() => {
			n.isDestroyed || (r.focus(), Ol() && !Dl() && !El() && r.dom.focus({ preventScroll: !0 }));
		});
	};
	if (r.hasFocus() && e === null || e === !1) return !0;
	if (a && e === null && !Cl(n.state.selection)) return o(), !0;
	let s = Tl(i.doc, e) || n.state.selection, c = n.state.selection.eq(s);
	return a && (c || i.setSelection(s), c && i.storedMarks && i.setStoredMarks(i.storedMarks), o()), !0;
}, Al = (e, t) => (n) => e.every((e, r) => t(e, {
	...n,
	index: r
})), jl = (e, t) => ({ tr: n, commands: r }) => r.insertContentAt({
	from: n.selection.from,
	to: n.selection.to
}, e, t), Ml = (e) => {
	let t = e.childNodes;
	for (let n = t.length - 1; n >= 0; --n) {
		let r = t[n];
		r.nodeType === 3 && r.nodeValue && /^(\n\s\s|\n)$/.test(r.nodeValue) ? e.removeChild(r) : r.nodeType === 1 && Ml(r);
	}
	return e;
};
function Nl(e) {
	let t = `<body>${e}</body>`, n = new window.DOMParser().parseFromString(t, "text/html").body;
	return Ml(n);
}
function Pl(e, t, n) {
	if (e instanceof le || e instanceof d) return e;
	n = {
		slice: !0,
		parseOptions: {},
		...n
	};
	let r = typeof e == "object" && !!e, i = typeof e == "string";
	if (r) try {
		if (Array.isArray(e) && e.length > 0) return d.fromArray(e.map((e) => t.nodeFromJSON(e)));
		let r = t.nodeFromJSON(e);
		return n.errorOnInvalidContent && r.check(), r;
	} catch (r) {
		if (n.errorOnInvalidContent) throw Error("[tiptap error]: Invalid JSON content", { cause: r });
		return console.warn("[tiptap warn]: Invalid content.", "Passed value:", e, "Error:", r), Pl("", t, n);
	}
	if (i) {
		if (n.errorOnInvalidContent) {
			let r = !1, i = "", a = new Pe({
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
			if (n.slice ? Re.fromSchema(a).parseSlice(Nl(e), n.parseOptions) : Re.fromSchema(a).parse(Nl(e), n.parseOptions), n.errorOnInvalidContent && r) throw Error("[tiptap error]: Invalid HTML content", { cause: /* @__PURE__ */ Error(`Invalid element found: ${i}`) });
		}
		let r = Re.fromSchema(t);
		return n.slice ? r.parseSlice(Nl(e), n.parseOptions).content : r.parse(Nl(e), n.parseOptions);
	}
	return Pl("", t, n);
}
function Fl(e, t, n) {
	let r = e.steps.length - 1;
	if (r < t) return;
	let i = e.steps[r];
	if (!(i instanceof Tt || i instanceof Et)) return;
	let a = e.mapping.maps[r], o = 0;
	a.forEach((e, t, n, r) => {
		o === 0 && (o = r);
	}), e.setSelection(D.near(e.doc.resolve(o), n));
}
var Il = (e) => !("type" in e), Ll = (e, t, n) => ({ tr: r, dispatch: i, editor: a }) => {
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
			Pl(t, a.schema, {
				parseOptions: s,
				errorOnInvalidContent: !0
			});
		} catch (e) {
			o(e);
		}
		try {
			i = Pl(t, a.schema, {
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
		}, u = !0, f = !0;
		if ((Il(i) ? i : [i]).forEach((e) => {
			e.check(), u = u ? e.isText && e.marks.length === 0 : !1, f = f ? e.isBlock : !1;
		}), c === l && f) {
			let { parent: e } = r.doc.resolve(c);
			e.isTextblock && !e.type.spec.code && !e.childCount && (--c, l += 1);
		}
		let p;
		if (u) {
			if (Array.isArray(t)) p = t.map((e) => e.text || "").join("");
			else if (t instanceof d) {
				let e = "";
				t.forEach((t) => {
					t.text && (e += t.text);
				}), p = e;
			} else p = typeof t == "object" && t && t.text ? t.text : t;
			r.insertText(p, c, l);
		} else p = i, r.replaceWith(c, l, p);
		n.updateSelection && Fl(r, r.steps.length - 1, -1), n.applyInputRules && r.setMeta("applyInputRules", {
			from: c,
			text: p
		}), n.applyPasteRules && r.setMeta("applyPasteRules", {
			from: c,
			text: p
		});
	}
	return !0;
}, Rl = () => ({ state: e, dispatch: t }) => Vs(e, t), zl = () => ({ state: e, dispatch: t }) => Hs(e, t), Bl = () => ({ state: e, dispatch: t }) => As(e, t), Vl = () => ({ state: e, dispatch: t }) => Rs(e, t), Hl = () => ({ state: e, dispatch: t, tr: n }) => {
	try {
		let r = Yt(e.doc, e.selection.$from.pos, -1);
		return r == null ? !1 : (n.join(r, 2), t && t(n), !0);
	} catch {
		return !1;
	}
}, Ul = () => ({ state: e, dispatch: t, tr: n }) => {
	try {
		let r = Yt(e.doc, e.selection.$from.pos, 1);
		return r == null ? !1 : (n.join(r, 2), t && t(n), !0);
	} catch {
		return !1;
	}
}, Wl = () => ({ state: e, dispatch: t }) => js(e, t), Gl = () => ({ state: e, dispatch: t }) => Ms(e, t);
function Kl() {
	return typeof navigator < "u" ? /Mac/.test(navigator.platform) : !1;
}
function ql(e) {
	let t = e.split(/-(?!$)/), n = t[t.length - 1];
	n === "Space" && (n = " ");
	let r, i, a, o;
	for (let e = 0; e < t.length - 1; e += 1) {
		let n = t[e];
		if (/^(cmd|meta|m)$/i.test(n)) o = !0;
		else if (/^a(lt)?$/i.test(n)) r = !0;
		else if (/^(c|ctrl|control)$/i.test(n)) i = !0;
		else if (/^s(hift)?$/i.test(n)) a = !0;
		else if (/^mod$/i.test(n)) Dl() || Kl() ? o = !0 : i = !0;
		else throw Error(`Unrecognized modifier name: ${n}`);
	}
	return r && (n = `Alt-${n}`), i && (n = `Ctrl-${n}`), o && (n = `Meta-${n}`), a && (n = `Shift-${n}`), n;
}
var Jl = (e) => ({ editor: t, view: n, tr: r, dispatch: i }) => {
	let a = ql(e).split(/-(?!$)/), o = a.find((e) => ![
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
function Yl(e, t, n = {}) {
	let { from: r, to: i, empty: a } = e.selection, o = t ? Cc(t, e.schema) : null, s = [];
	e.doc.nodesBetween(r, i, (e, t) => {
		if (e.isText) return;
		let n = Math.max(r, t), a = Math.min(i, t + e.nodeSize);
		s.push({
			node: e,
			from: n,
			to: a
		});
	});
	let c = i - r, l = s.filter((e) => o ? o.name === e.node.type.name : !0).filter((e) => gl(e.node.attrs, n, { strict: !1 }));
	return a ? !!l.length : l.reduce((e, t) => e + t.to - t.from, 0) >= c;
}
var Xl = (e, t = {}) => ({ state: n, dispatch: r }) => Yl(n, Cc(e, n.schema), t) ? Us(n, r) : !1, Zl = () => ({ state: e, dispatch: t }) => Js(e, t), Ql = (e) => ({ state: t, dispatch: n }) => mc(Cc(e, t.schema))(t, n), $l = () => ({ state: e, dispatch: t }) => Ws(e, t);
function eu(e, t) {
	return t.nodes[e] ? "node" : t.marks[e] ? "mark" : null;
}
function tu(e, t) {
	let n = typeof t == "string" ? [t] : t;
	return Object.keys(e).reduce((t, r) => (n.includes(r) || (t[r] = e[r]), t), {});
}
var nu = (e, t) => ({ tr: n, state: r, dispatch: i }) => {
	let a = null, o = null, s = eu(typeof e == "string" ? e : e.name, r.schema);
	return s ? (s === "node" && (a = Cc(e, r.schema)), s === "mark" && (o = bl(e, r.schema)), i && n.selection.ranges.forEach((e) => {
		r.doc.nodesBetween(e.$from.pos, e.$to.pos, (e, r) => {
			a && a === e.type && n.setNodeMarkup(r, void 0, tu(e.attrs, t)), o && e.marks.length && e.marks.forEach((i) => {
				o === i.type && n.addMark(r, r + e.nodeSize, o.create(tu(i.attrs, t)));
			});
		});
	}), !0) : !1;
}, ru = () => ({ tr: e, dispatch: t }) => (t && e.scrollIntoView(), !0), iu = () => ({ tr: e, dispatch: t }) => {
	if (t) {
		let t = new Tn(e.doc);
		e.setSelection(t);
	}
	return !0;
}, au = () => ({ state: e, dispatch: t }) => Fs(e, t), ou = () => ({ state: e, dispatch: t }) => zs(e, t), su = () => ({ state: e, dispatch: t }) => Zs(e, t), cu = () => ({ state: e, dispatch: t }) => rc(e, t), lu = () => ({ state: e, dispatch: t }) => nc(e, t);
function uu(e, t, n = {}, r = {}) {
	return Pl(e, t, {
		slice: !1,
		parseOptions: n,
		errorOnInvalidContent: r.errorOnInvalidContent
	});
}
var du = (e, t = !1, n = {}, r = {}) => ({ editor: i, tr: a, dispatch: o, commands: s }) => {
	let { doc: c } = a;
	if (n.preserveWhitespace !== "full") {
		let s = uu(e, i.schema, n, { errorOnInvalidContent: r.errorOnInvalidContent ?? i.options.enableContentCheck });
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
function fu(e, t) {
	let n = bl(t, e.schema), { from: r, to: i, empty: a } = e.selection, o = [];
	a ? (e.storedMarks && o.push(...e.storedMarks), o.push(...e.selection.$head.marks())) : e.doc.nodesBetween(r, i, (e) => {
		o.push(...e.marks);
	});
	let s = o.find((e) => e.type.name === n.name);
	return s ? { ...s.attrs } : {};
}
function pu(e) {
	for (let t = 0; t < e.edgeCount; t += 1) {
		let { type: n } = e.edge(t);
		if (n.isTextblock && !n.hasRequiredAttrs()) return n;
	}
	return null;
}
function mu(e, t) {
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
function hu(e) {
	return (t) => mu(t.$from, e);
}
function gu(e, t) {
	return tl(e, {
		from: 0,
		to: e.content.size
	}, t);
}
function _u(e, t) {
	let n = Cc(t, e.schema), { from: r, to: i } = e.selection, a = [];
	e.doc.nodesBetween(r, i, (e) => {
		a.push(e);
	});
	let o = a.reverse().find((e) => e.type.name === n.name);
	return o ? { ...o.attrs } : {};
}
function vu(e, t) {
	let n = eu(typeof t == "string" ? t : t.name, e.schema);
	return n === "node" ? _u(e, t) : n === "mark" ? fu(e, t) : {};
}
function yu(e, t, n) {
	let r = [];
	return e === t ? n.resolve(e).marks().forEach((t) => {
		let i = yl(n.resolve(e), t.type);
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
function bu(e, t, n) {
	return Object.fromEntries(Object.entries(n).filter(([n]) => {
		let r = e.find((e) => e.type === t && e.name === n);
		return r ? r.attribute.keepOnSplit : !1;
	}));
}
function xu(e, t, n = {}) {
	let { empty: r, ranges: i } = e.selection, a = t ? bl(t, e.schema) : null;
	if (r) return !!(e.storedMarks || e.selection.$from.marks()).filter((e) => a ? a.name === e.type.name : !0).find((e) => gl(e.attrs, n, { strict: !1 }));
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
	let c = s.filter((e) => a ? a.name === e.mark.type.name : !0).filter((e) => gl(e.mark.attrs, n, { strict: !1 })).reduce((e, t) => e + t.to - t.from, 0), l = s.filter((e) => a ? e.mark.type !== a && e.mark.type.excludes(a) : !0).reduce((e, t) => e + t.to - t.from, 0);
	return (c > 0 ? c + l : c) >= o;
}
function Su(e, t, n = {}) {
	if (!t) return Yl(e, null, n) || xu(e, null, n);
	let r = eu(t, e.schema);
	return r === "node" ? Yl(e, t, n) : r === "mark" ? xu(e, t, n) : !1;
}
function Cu(e, t) {
	let { nodeExtensions: n } = xc(t), r = n.find((t) => t.name === e);
	if (!r) return !1;
	let i = j(A(r, "group", {
		name: r.name,
		options: r.options,
		storage: r.storage
	}));
	return typeof i == "string" ? i.split(" ").includes("list") : !1;
}
function wu(e, { checkChildren: t = !0, ignoreWhitespace: n = !1 } = {}) {
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
			r !== !1 && (wu(e, {
				ignoreWhitespace: n,
				checkChildren: t
			}) || (r = !1));
		}), r;
	}
	return !1;
}
function Tu(e) {
	return e instanceof k;
}
function Eu(e, t, n) {
	let { selection: r } = t, i = null;
	if (Cl(r) && (i = r.$cursor), i) {
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
var Du = (e, t = {}) => ({ tr: n, state: r, dispatch: i }) => {
	let { selection: a } = n, { empty: o, ranges: s } = a, c = bl(e, r.schema);
	if (i) if (o) {
		let e = fu(r, c);
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
	return Eu(r, n, c);
}, Ou = (e, t) => ({ tr: n }) => (n.setMeta(e, t), !0), ku = (e, t = {}) => ({ state: n, dispatch: r, chain: i }) => {
	let a = Cc(e, n.schema), o;
	return n.selection.$anchor.sameParent(n.selection.$head) && (o = n.selection.$anchor.parent.attrs), a.isTextblock ? i().command(({ commands: e }) => ac(a, {
		...o,
		...t
	})(n) ? !0 : e.clearNodes()).command(({ state: e }) => ac(a, {
		...o,
		...t
	})(e, r)).run() : (console.warn("[tiptap warn]: Currently \"setNode()\" only supports text block nodes."), !1);
}, Au = (e) => ({ tr: t, dispatch: n }) => {
	if (n) {
		let { doc: n } = t, r = wl(e, 0, n.content.size), i = k.create(n, r);
		t.setSelection(i);
	}
	return !0;
}, ju = (e) => ({ tr: t, dispatch: n }) => {
	if (n) {
		let { doc: n } = t, { from: r, to: i } = typeof e == "number" ? {
			from: e,
			to: e
		} : e, a = O.atStart(n).from, o = O.atEnd(n).to, s = wl(r, a, o), c = wl(i, a, o), l = O.create(n, s, c);
		t.setSelection(l);
	}
	return !0;
}, Mu = (e) => ({ state: t, dispatch: n }) => _c(Cc(e, t.schema))(t, n);
function Nu(e, t) {
	let n = e.storedMarks || e.selection.$to.parentOffset && e.selection.$from.marks();
	if (n) {
		let r = n.filter((e) => t?.includes(e.type.name));
		e.tr.ensureMarks(r);
	}
}
var Pu = ({ keepMarks: e = !0 } = {}) => ({ tr: t, state: n, dispatch: r, editor: i }) => {
	let { selection: a, doc: o } = t, { $from: s, $to: c } = a, l = i.extensionManager.attributes, u = bu(l, s.node().type.name, s.node().attrs);
	if (a instanceof k && a.node.isBlock) return !s.parentOffset || !Wt(o, s.pos) ? !1 : (r && (e && Nu(n, i.extensionManager.splittableMarks), t.split(s.pos).scrollIntoView()), !0);
	if (!s.parent.isBlock) return !1;
	let d = c.parentOffset === c.parent.content.size, f = s.depth === 0 ? void 0 : pu(s.node(-1).contentMatchAt(s.indexAfter(-1))), p = d && f ? [{
		type: f,
		attrs: u
	}] : void 0, m = Wt(t.doc, t.mapping.map(s.pos), 1, p);
	if (!p && !m && Wt(t.doc, t.mapping.map(s.pos), 1, f ? [{ type: f }] : void 0) && (m = !0, p = f ? [{
		type: f,
		attrs: u
	}] : void 0), r) {
		if (m && (a instanceof O && t.deleteSelection(), t.split(t.mapping.map(s.pos), 1, p), f && !d && !s.parentOffset && s.parent.type !== f)) {
			let e = t.mapping.map(s.before()), n = t.doc.resolve(e);
			s.node(-1).canReplaceWith(n.index(), n.index() + 1, f) && t.setNodeMarkup(t.mapping.map(s.before()), f);
		}
		e && Nu(n, i.extensionManager.splittableMarks), t.scrollIntoView();
	}
	return m;
}, Fu = (e, t = {}) => ({ tr: n, state: r, dispatch: i, editor: a }) => {
	let o = Cc(e, r.schema), { $from: s, $to: c } = r.selection, l = r.selection.node;
	if (l && l.isBlock || s.depth < 2 || !s.sameParent(c)) return !1;
	let u = s.node(-1);
	if (u.type !== o) return !1;
	let f = a.extensionManager.attributes;
	if (s.parent.content.size === 0 && s.node(-1).childCount === s.indexAfter(-1)) {
		if (s.depth === 2 || s.node(-3).type !== o || s.index(-2) !== s.node(-2).childCount - 1) return !1;
		if (i) {
			let e = d.empty, r = s.index(-1) ? 1 : s.index(-2) ? 2 : 3;
			for (let t = s.depth - r; t >= s.depth - 3; --t) e = d.from(s.node(t).copy(e));
			let i = s.indexAfter(-1) < s.node(-2).childCount ? 1 : s.indexAfter(-2) < s.node(-3).childCount ? 2 : 3, a = {
				...bu(f, s.node().type.name, s.node().attrs),
				...t
			}, c = o.contentMatch.defaultType?.createAndFill(a) || void 0;
			e = e.append(d.from(o.createAndFill(null, c) || void 0));
			let l = s.before(s.depth - (r - 1));
			n.replace(l, s.after(-i), new _(e, 4 - r, 0));
			let u = -1;
			n.doc.nodesBetween(l, n.doc.content.size, (e, t) => {
				if (u > -1) return !1;
				e.isTextblock && e.content.size === 0 && (u = t + 1);
			}), u > -1 && n.setSelection(O.near(n.doc.resolve(u))), n.scrollIntoView();
		}
		return !0;
	}
	let p = c.pos === s.end() ? u.contentMatchAt(0).defaultType : null, m = {
		...bu(f, u.type.name, u.attrs),
		...t
	}, h = {
		...bu(f, s.node().type.name, s.node().attrs),
		...t
	};
	n.delete(s.pos, c.pos);
	let g = p ? [{
		type: o,
		attrs: m
	}, {
		type: p,
		attrs: h
	}] : [{
		type: o,
		attrs: m
	}];
	if (!Wt(n.doc, s.pos, 2)) return !1;
	if (i) {
		let { selection: e, storedMarks: t } = r, { splittableMarks: o } = a.extensionManager, c = t || e.$to.parentOffset && e.$from.marks();
		if (n.split(s.pos, 2, g).scrollIntoView(), !c || !i) return !0;
		let l = c.filter((e) => o.includes(e.type.name));
		n.ensureMarks(l);
	}
	return !0;
}, Iu = (e, t) => {
	let n = hu((e) => e.type === t)(e.selection);
	if (!n) return !0;
	let r = e.doc.resolve(Math.max(0, n.pos - 1)).before(n.depth);
	if (r === void 0) return !0;
	let i = e.doc.nodeAt(r);
	return n.node.type === i?.type && Kt(e.doc, n.pos) && e.join(n.pos), !0;
}, Lu = (e, t) => {
	let n = hu((e) => e.type === t)(e.selection);
	if (!n) return !0;
	let r = e.doc.resolve(n.start).after(n.depth);
	if (r === void 0) return !0;
	let i = e.doc.nodeAt(r);
	return n.node.type === i?.type && Kt(e.doc, r) && e.join(r), !0;
}, Ru = /* @__PURE__ */ Object.freeze({
	__proto__: null,
	blur: il,
	clearContent: al,
	clearNodes: ol,
	command: sl,
	createParagraphNear: cl,
	cut: ll,
	deleteCurrentNode: ul,
	deleteNode: dl,
	deleteRange: fl,
	deleteSelection: pl,
	enter: ml,
	exitCode: hl,
	extendMarkRange: xl,
	first: Sl,
	focus: kl,
	forEach: Al,
	insertContent: jl,
	insertContentAt: Ll,
	joinBackward: Bl,
	joinDown: zl,
	joinForward: Vl,
	joinItemBackward: Hl,
	joinItemForward: Ul,
	joinTextblockBackward: Wl,
	joinTextblockForward: Gl,
	joinUp: Rl,
	keyboardShortcut: Jl,
	lift: Xl,
	liftEmptyBlock: Zl,
	liftListItem: Ql,
	newlineInCode: $l,
	resetAttributes: nu,
	scrollIntoView: ru,
	selectAll: iu,
	selectNodeBackward: au,
	selectNodeForward: ou,
	selectParentNode: su,
	selectTextblockEnd: cu,
	selectTextblockStart: lu,
	setContent: du,
	setMark: Du,
	setMeta: Ou,
	setNode: ku,
	setNodeSelection: Au,
	setTextSelection: ju,
	sinkListItem: Mu,
	splitBlock: Pu,
	splitListItem: Fu,
	toggleList: (e, t, n, r = {}) => ({ editor: i, tr: a, state: o, dispatch: s, chain: c, commands: l, can: u }) => {
		let { extensions: d, splittableMarks: f } = i.extensionManager, p = Cc(e, o.schema), m = Cc(t, o.schema), { selection: h, storedMarks: g } = o, { $from: _, $to: v } = h, y = _.blockRange(v), b = g || h.$to.parentOffset && h.$from.marks();
		if (!y) return !1;
		let x = hu((e) => Cu(e.type.name, d))(h);
		if (y.depth >= 1 && x && y.depth - x.depth <= 1) {
			if (x.node.type === p) return l.liftListItem(m);
			if (Cu(x.node.type.name, d) && p.validContent(x.node.content) && s) return c().command(() => (a.setNodeMarkup(x.pos, p), !0)).command(() => Iu(a, p)).command(() => Lu(a, p)).run();
		}
		return !n || !b || !s ? c().command(() => u().wrapInList(p, r) ? !0 : l.clearNodes()).wrapInList(p, r).command(() => Iu(a, p)).command(() => Lu(a, p)).run() : c().command(() => {
			let e = u().wrapInList(p, r), t = b.filter((e) => f.includes(e.type.name));
			return a.ensureMarks(t), e ? !0 : l.clearNodes();
		}).wrapInList(p, r).command(() => Iu(a, p)).command(() => Lu(a, p)).run();
	},
	toggleMark: (e, t = {}, n = {}) => ({ state: r, commands: i }) => {
		let { extendEmptyMarkRange: a = !1 } = n, o = bl(e, r.schema);
		return xu(r, o, t) ? i.unsetMark(o, { extendEmptyMarkRange: a }) : i.setMark(o, t);
	},
	toggleNode: (e, t, n = {}) => ({ state: r, commands: i }) => {
		let a = Cc(e, r.schema), o = Cc(t, r.schema), s = Yl(r, a, n), c;
		return r.selection.$anchor.sameParent(r.selection.$head) && (c = r.selection.$anchor.parent.attrs), s ? i.setNode(o, c) : i.setNode(a, {
			...c,
			...n
		});
	},
	toggleWrap: (e, t = {}) => ({ state: n, commands: r }) => {
		let i = Cc(e, n.schema);
		return Yl(n, i, t) ? r.lift(i) : r.wrapIn(i, t);
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
		let { extendEmptyMarkRange: a = !1 } = t, { selection: o } = n, s = bl(e, r.schema), { $from: c, empty: l, ranges: u } = o;
		if (!i) return !0;
		if (l && a) {
			let { from: e, to: t } = o, r = yl(c, s, c.marks().find((e) => e.type === s)?.attrs);
			r && (e = r.from, t = r.to), n.removeMark(e, t, s);
		} else u.forEach((e) => {
			n.removeMark(e.$from.pos, e.$to.pos, s);
		});
		return n.removeStoredMark(s), !0;
	},
	updateAttributes: (e, t = {}) => ({ tr: n, state: r, dispatch: i }) => {
		let a = null, o = null, s = eu(typeof e == "string" ? e : e.name, r.schema);
		return s ? (s === "node" && (a = Cc(e, r.schema)), s === "mark" && (o = bl(e, r.schema)), i && n.selection.ranges.forEach((e) => {
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
	wrapIn: (e, t = {}) => ({ state: n, dispatch: r }) => ic(Cc(e, n.schema), t)(n, r),
	wrapInList: (e, t = {}) => ({ state: n, dispatch: r }) => dc(Cc(e, n.schema), t)(n, r)
}), zu = el.create({
	name: "commands",
	addCommands() {
		return { ...Ru };
	}
}), Bu = el.create({
	name: "drop",
	addProseMirrorPlugins() {
		return [new zn({
			key: new Hn("tiptapDrop"),
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
}), Vu = el.create({
	name: "editable",
	addProseMirrorPlugins() {
		return [new zn({
			key: new Hn("editable"),
			props: { editable: () => this.editor.options.editable }
		})];
	}
}), Hu = new Hn("focusEvents"), Uu = el.create({
	name: "focusEvents",
	addProseMirrorPlugins() {
		let { editor: e } = this;
		return [new zn({
			key: Hu,
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
}), Wu = el.create({
	name: "keymap",
	addKeyboardShortcuts() {
		let e = () => this.editor.commands.first(({ commands: e }) => [
			() => e.undoInputRule(),
			() => e.command(({ tr: t }) => {
				let { selection: n, doc: r } = t, { empty: i, $anchor: a } = n, { pos: o, parent: s } = a, c = a.parent.isTextblock && o > 0 ? t.doc.resolve(o - 1) : a, l = c.parent.type.spec.isolating, u = a.pos - a.parentOffset, d = l && c.parent.childCount === 1 ? u === a.pos : D.atStart(r).from === o;
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
		return Dl() || Kl() ? i : r;
	},
	addProseMirrorPlugins() {
		return [new zn({
			key: new Hn("clearDocument"),
			appendTransaction: (e, t, n) => {
				if (e.some((e) => e.getMeta("composition"))) return;
				let r = e.some((e) => e.docChanged) && !t.doc.eq(n.doc), i = e.some((e) => e.getMeta("preventClearDocument"));
				if (!r || i) return;
				let { empty: a, from: o, to: s } = t.selection, c = D.atStart(t.doc).from, l = D.atEnd(t.doc).to;
				if (a || !(o === c && s === l) || !wu(n.doc)) return;
				let u = n.tr, d = vc({
					state: n,
					transaction: u
				}), { commands: f } = new yc({
					editor: this.editor,
					state: d
				});
				if (f.clearNodes(), u.steps.length) return u;
			}
		})];
	}
}), Gu = el.create({
	name: "paste",
	addProseMirrorPlugins() {
		return [new zn({
			key: new Hn("tiptapPaste"),
			props: { handlePaste: (e, t, n) => {
				this.editor.emit("paste", {
					editor: this.editor,
					event: t,
					slice: n
				});
			} }
		})];
	}
}), Ku = el.create({
	name: "tabindex",
	addProseMirrorPlugins() {
		return [new zn({
			key: new Hn("tabindex"),
			props: { attributes: () => this.editor.isEditable ? { tabindex: "0" } : {} }
		})];
	}
}), qu = class e {
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
}, Ju = ".ProseMirror {\n  position: relative;\n}\n\n.ProseMirror {\n  word-wrap: break-word;\n  white-space: pre-wrap;\n  white-space: break-spaces;\n  -webkit-font-variant-ligatures: none;\n  font-variant-ligatures: none;\n  font-feature-settings: \"liga\" 0; /* the above doesn't seem to work in Edge */\n}\n\n.ProseMirror [contenteditable=\"false\"] {\n  white-space: normal;\n}\n\n.ProseMirror [contenteditable=\"false\"] [contenteditable=\"true\"] {\n  white-space: pre-wrap;\n}\n\n.ProseMirror pre {\n  white-space: pre-wrap;\n}\n\nimg.ProseMirror-separator {\n  display: inline !important;\n  border: none !important;\n  margin: 0 !important;\n  width: 0 !important;\n  height: 0 !important;\n}\n\n.ProseMirror-gapcursor {\n  display: none;\n  pointer-events: none;\n  position: absolute;\n  margin: 0;\n}\n\n.ProseMirror-gapcursor:after {\n  content: \"\";\n  display: block;\n  position: absolute;\n  top: -2px;\n  width: 20px;\n  border-top: 1px solid black;\n  animation: ProseMirror-cursor-blink 1.1s steps(2, start) infinite;\n}\n\n@keyframes ProseMirror-cursor-blink {\n  to {\n    visibility: hidden;\n  }\n}\n\n.ProseMirror-hideselection *::selection {\n  background: transparent;\n}\n\n.ProseMirror-hideselection *::-moz-selection {\n  background: transparent;\n}\n\n.ProseMirror-hideselection * {\n  caret-color: transparent;\n}\n\n.ProseMirror-focused .ProseMirror-gapcursor {\n  display: block;\n}\n\n.tippy-box[data-animation=fade][data-state=hidden] {\n  opacity: 0\n}";
function Yu(e, t, n) {
	let r = document.querySelector(`style[data-tiptap-style${n ? `-${n}` : ""}]`);
	if (r !== null) return r;
	let i = document.createElement("style");
	return t && i.setAttribute("nonce", t), i.setAttribute(`data-tiptap-style${n ? `-${n}` : ""}`, ""), i.innerHTML = e, document.getElementsByTagName("head")[0].appendChild(i), i;
}
var Xu = class extends bc {
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
		this.options.injectCSS && document && (this.css = Yu(Ju, this.options.injectNonce));
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
		let n = Ec(t) ? t(e, [...this.state.plugins]) : [...this.state.plugins, e], r = this.state.reconfigure({ plugins: n });
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
			Vu,
			rl.configure({ blockSeparator: this.options.coreExtensionOptions?.clipboardTextSerializer?.blockSeparator }),
			zu,
			Uu,
			Wu,
			Ku,
			Bu,
			Gu
		].filter((e) => typeof this.options.enableCoreExtensions == "object" ? this.options.enableCoreExtensions[e.name] !== !1 : !0) : [], ...this.options.extensions].filter((e) => [
			"extension",
			"node",
			"mark"
		].includes(e?.type));
		this.extensionManager = new $c(e, this);
	}
	createCommandManager() {
		this.commandManager = new yc({ editor: this });
	}
	createSchema() {
		this.schema = this.extensionManager.schema;
	}
	createView() {
		let e;
		try {
			e = uu(this.options.content, this.schema, this.options.parseOptions, { errorOnInvalidContent: this.options.enableContentCheck });
		} catch (t) {
			if (!(t instanceof Error) || !["[tiptap error]: Invalid JSON content", "[tiptap error]: Invalid HTML content"].includes(t.message)) throw t;
			this.emit("contentError", {
				editor: this,
				error: t,
				disableCollaboration: () => {
					this.storage.collaboration && (this.storage.collaboration.isDisabled = !0), this.options.extensions = this.options.extensions.filter((e) => e.name !== "collaboration"), this.createExtensionManager();
				}
			}), e = uu(this.options.content, this.schema, this.options.parseOptions, { errorOnInvalidContent: !1 });
		}
		let t = Tl(e, this.options.autofocus);
		this.view = new as(this.options.element, {
			...this.options.editorProps,
			attributes: {
				role: "textbox",
				...this.options.editorProps?.attributes
			},
			dispatchTransaction: this.dispatchTransaction.bind(this),
			state: Ln.create({
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
		return vu(this.state, e);
	}
	isActive(e, t) {
		let n = typeof e == "string" ? e : null, r = typeof e == "string" ? t : e;
		return Su(this.state, n, r);
	}
	getJSON() {
		return this.state.doc.toJSON();
	}
	getHTML() {
		return Pc(this.state.doc.content, this.schema);
	}
	getText(e) {
		let { blockSeparator: t = "\n\n", textSerializers: n = {} } = e || {};
		return gu(this.state.doc, {
			blockSeparator: t,
			textSerializers: {
				...nl(this.schema),
				...n
			}
		});
	}
	get isEmpty() {
		return wu(this.state.doc);
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
		return new qu(this.state.doc.resolve(e), this);
	}
	get $doc() {
		return this.$pos(0);
	}
};
function Zu(e) {
	return new Lc({
		find: e.find,
		handler: ({ state: t, range: n, match: r }) => {
			let i = j(e.getAttributes, void 0, r);
			if (i === !1 || i === null) return null;
			let { tr: a } = t, o = r[r.length - 1], s = r[0];
			if (o) {
				let r = s.search(/\S/), c = n.from + s.indexOf(o), l = c + o.length;
				if (yu(n.from, n.to, t.doc).filter((t) => t.mark.type.excluded.find((n) => n === e.type && n !== t.mark.type)).filter((e) => e.to > c).length) return null;
				l < n.to && a.delete(l, n.to), c > n.from && a.delete(n.from + r, c);
				let u = n.from + r + o.length;
				a.addMark(n.from + r, u, e.type.create(i || {})), a.removeStoredMark(e.type);
			}
		}
	});
}
function Qu(e) {
	return new Lc({
		find: e.find,
		handler: ({ state: t, range: n, match: r }) => {
			let i = j(e.getAttributes, void 0, r) || {}, { tr: a } = t, o = n.from, s = n.to, c = e.type.create(i);
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
function $u(e) {
	return new Lc({
		find: e.find,
		handler: ({ state: t, range: n, match: r }) => {
			let i = t.doc.resolve(n.from), a = j(e.getAttributes, void 0, r) || {};
			if (!i.node(-1).canReplaceWith(i.index(-1), i.indexAfter(-1), e.type)) return null;
			t.tr.delete(n.from, n.to).setBlockType(n.from, n.from, e.type, a);
		}
	});
}
function ed(e) {
	return new Lc({
		find: e.find,
		handler: ({ state: t, range: n, match: r, chain: i }) => {
			let a = j(e.getAttributes, void 0, r) || {}, o = t.tr.delete(n.from, n.to), s = o.doc.resolve(n.from).blockRange(), c = s && Pt(s, e.type, a);
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
			l && l.type === e.type && Kt(o.doc, n.from - 1) && (!e.joinPredicate || e.joinPredicate(r, l)) && o.join(n.from - 1);
		}
	});
}
var td = class e {
	constructor(e = {}) {
		this.type = "node", this.name = "node", this.parent = null, this.child = null, this.config = {
			name: this.name,
			defaultOptions: {}
		}, this.config = {
			...this.config,
			...e
		}, this.name = this.config.name, e.defaultOptions && Object.keys(e.defaultOptions).length > 0 && console.warn(`[tiptap warn]: BREAKING CHANGE: "defaultOptions" is deprecated. Please use "addOptions" instead. Found in extension: "${this.name}".`), this.options = this.config.defaultOptions, this.config.addOptions && (this.options = j(A(this, "addOptions", { name: this.name }))), this.storage = j(A(this, "addStorage", {
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
			addOptions: () => Uc(this.options, e)
		});
		return t.name = this.name, t.parent = this.parent, t;
	}
	extend(t = {}) {
		let n = new e(t);
		return n.parent = this, this.child = n, n.name = t.name ? t.name : n.parent.name, t.defaultOptions && Object.keys(t.defaultOptions).length > 0 && console.warn(`[tiptap warn]: BREAKING CHANGE: "defaultOptions" is deprecated. Please use "addOptions" instead. Found in extension: "${n.name}".`), n.options = j(A(n, "addOptions", { name: n.name })), n.storage = j(A(n, "addStorage", {
			name: n.name,
			options: n.options
		})), n;
	}
};
function nd(e) {
	return new Kc({
		find: e.find,
		handler: ({ state: t, range: n, match: r, pasteEvent: i }) => {
			let a = j(e.getAttributes, void 0, r, i);
			if (a === !1 || a === null) return null;
			let { tr: o } = t, s = r[r.length - 1], c = r[0], l = n.to;
			if (s) {
				let r = c.search(/\S/), i = n.from + c.indexOf(s), u = i + s.length;
				if (yu(n.from, n.to, t.doc).filter((t) => t.mark.type.excluded.find((n) => n === e.type && n !== t.mark.type)).filter((e) => e.to > i).length) return null;
				u < n.to && o.delete(u, n.to), i > n.from && o.delete(n.from + r, i), l = n.from + r + s.length, o.addMark(n.from + r, l, e.type.create(a || {})), o.removeStoredMark(e.type);
			}
		}
	});
}
function rd(e, t) {
	let { selection: n } = e, { $from: r } = n;
	if (n instanceof k) {
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
//#region node_modules/@tiptap/extension-image/dist/index.js
var id = /(?:^|\s)(!\[(.+|:?)]\((\S+)(?:(?:\s+)["'](\S+)["'])?\))$/, ad = td.create({
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
		return ["img", wc(this.options.HTMLAttributes, e)];
	},
	addCommands() {
		return { setImage: (e) => ({ commands: t }) => t.insertContent({
			type: this.name,
			attrs: e
		}) };
	},
	addInputRules() {
		return [Qu({
			find: id,
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
}), M = class e extends Error {
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
}, od = /([A-Z])/g, sd = (e) => e.replace(od, "-$1").toLowerCase(), cd = {
	"&": "&amp;",
	">": "&gt;",
	"<": "&lt;",
	"\"": "&quot;",
	"'": "&#x27;"
}, ld = /[&><"']/g, ud = (e) => String(e).replace(ld, (e) => cd[e]), dd = (e) => e.type === "ordgroup" || e.type === "color" ? e.body.length === 1 ? dd(e.body[0]) : e : e.type === "font" ? dd(e.body) : e, fd = new Set([
	"mathord",
	"textord",
	"atom"
]), pd = (e) => fd.has(dd(e).type), md = (e) => {
	var t = /^[\x00-\x20]*([^\\/#?]*?)(:|&#0*58|&#x0*3a|&colon)/i.exec(e);
	return t ? t[2] !== ":" || !/^[a-zA-Z][a-zA-Z0-9+\-.]*$/.test(t[1]) ? null : t[1].toLowerCase() : "_relative";
}, hd = {
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
function gd(e) {
	if (typeof e != "string") return e.enum[0];
	switch (e) {
		case "boolean": return !1;
		case "string": return "";
		case "number": return 0;
		case "object": return {};
		default: throw Error("Unexpected schema type; settings must declare an explicit default.");
	}
}
function _d(e) {
	return e.default === void 0 ? gd(Array.isArray(e.type) ? e.type[0] : e.type) : e.default;
}
function vd(e, t, n, r) {
	var i = n[t];
	e[t] = i === void 0 ? _d(r) : r.processor ? r.processor(i) : i;
}
var yd = class {
	constructor(e) {
		e === void 0 && (e = {}), this.displayMode = void 0, this.output = void 0, this.leqno = void 0, this.fleqn = void 0, this.throwOnError = void 0, this.errorColor = void 0, this.macros = void 0, this.minRuleThickness = void 0, this.colorIsTextColor = void 0, this.strict = void 0, this.trust = void 0, this.maxSize = void 0, this.maxExpand = void 0, this.globalGroup = void 0, e ||= {};
		for (var t of Object.keys(hd)) {
			var n = hd[t];
			n && vd(this, t, e, n);
		}
	}
	reportNonstrict(e, t, n) {
		var r = this.strict;
		if (typeof r == "function" && (r = r(e, t, n)), !(!r || r === "ignore")) {
			if (r === !0 || r === "error") throw new M("LaTeX-incompatible input and strict mode is set to 'error': " + (t + " [" + e + "]"), n);
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
			var t = md(e.url);
			if (t == null) return !1;
			e.protocol = t;
		}
		return !!(typeof this.trust == "function" ? this.trust(e) : this.trust);
	}
}, bd = class {
	constructor(e, t, n) {
		this.id = void 0, this.size = void 0, this.cramped = void 0, this.id = e, this.size = t, this.cramped = n;
	}
	sup() {
		return kd[Ad[this.id]];
	}
	sub() {
		return kd[jd[this.id]];
	}
	fracNum() {
		return kd[Md[this.id]];
	}
	fracDen() {
		return kd[Nd[this.id]];
	}
	cramp() {
		return kd[Pd[this.id]];
	}
	text() {
		return kd[Fd[this.id]];
	}
	isTight() {
		return this.size >= 2;
	}
}, xd = 0, Sd = 1, Cd = 2, wd = 3, Td = 4, Ed = 5, Dd = 6, Od = 7, kd = [
	new bd(xd, 0, !1),
	new bd(Sd, 0, !0),
	new bd(Cd, 1, !1),
	new bd(wd, 1, !0),
	new bd(Td, 2, !1),
	new bd(Ed, 2, !0),
	new bd(Dd, 3, !1),
	new bd(Od, 3, !0)
], Ad = [
	Td,
	Ed,
	Td,
	Ed,
	Dd,
	Od,
	Dd,
	Od
], jd = [
	Ed,
	Ed,
	Ed,
	Ed,
	Od,
	Od,
	Od,
	Od
], Md = [
	Cd,
	wd,
	Td,
	Ed,
	Dd,
	Od,
	Dd,
	Od
], Nd = [
	wd,
	wd,
	Ed,
	Ed,
	Od,
	Od,
	Od,
	Od
], Pd = [
	Sd,
	Sd,
	wd,
	wd,
	Ed,
	Ed,
	Od,
	Od
], Fd = [
	xd,
	Sd,
	Cd,
	wd,
	Cd,
	wd,
	Cd,
	wd
], N = {
	DISPLAY: kd[xd],
	TEXT: kd[Cd],
	SCRIPT: kd[Td],
	SCRIPTSCRIPT: kd[Dd]
}, Id = [
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
function Ld(e) {
	for (var t = 0; t < Id.length; t++) for (var n = Id[t], r = 0; r < n.blocks.length; r++) {
		var i = n.blocks[r];
		if (e >= i[0] && e <= i[1]) return n.name;
	}
	return null;
}
var Rd = [];
Id.forEach((e) => e.blocks.forEach((e) => Rd.push(...e)));
function zd(e) {
	for (var t = 0; t < Rd.length; t += 2) if (e >= Rd[t] && e <= Rd[t + 1]) return !0;
	return !1;
}
var Bd = (e) => e + " " + e, Vd = 80, Hd = function(e, t) {
	return "M95," + (622 + e + t) + "\nc-2.7,0,-7.17,-2.7,-13.5,-8c-5.8,-5.3,-9.5,-10,-9.5,-14\nc0,-2,0.3,-3.3,1,-4c1.3,-2.7,23.83,-20.7,67.5,-54\nc44.2,-33.3,65.8,-50.3,66.5,-51c1.3,-1.3,3,-2,5,-2c4.7,0,8.7,3.3,12,10\ns173,378,173,378c0.7,0,35.3,-71,104,-213c68.7,-142,137.5,-285,206.5,-429\nc69,-144,104.5,-217.7,106.5,-221\nl" + e / 2.075 + " -" + e + "\nc5.3,-9.3,12,-14,20,-14\nH400000v" + (40 + e) + "H845.2724\ns-225.272,467,-225.272,467s-235,486,-235,486c-2.7,4.7,-9,7,-19,7\nc-6,0,-10,-1,-12,-3s-194,-422,-194,-422s-65,47,-65,47z\nM" + (834 + e) + " " + t + "h400000v" + (40 + e) + "h-400000z";
}, Ud = function(e, t) {
	return "M263," + (601 + e + t) + "c0.7,0,18,39.7,52,119\nc34,79.3,68.167,158.7,102.5,238c34.3,79.3,51.8,119.3,52.5,120\nc340,-704.7,510.7,-1060.3,512,-1067\nl" + e / 2.084 + " -" + e + "\nc4.7,-7.3,11,-11,19,-11\nH40000v" + (40 + e) + "H1012.3\ns-271.3,567,-271.3,567c-38.7,80.7,-84,175,-136,283c-52,108,-89.167,185.3,-111.5,232\nc-22.3,46.7,-33.8,70.3,-34.5,71c-4.7,4.7,-12.3,7,-23,7s-12,-1,-12,-1\ns-109,-253,-109,-253c-72.7,-168,-109.3,-252,-110,-252c-10.7,8,-22,16.7,-34,26\nc-22,17.3,-33.3,26,-34,26s-26,-26,-26,-26s76,-59,76,-59s76,-60,76,-60z\nM" + (1001 + e) + " " + t + "h400000v" + (40 + e) + "h-400000z";
}, Wd = function(e, t) {
	return "M983 " + (10 + e + t) + "\nl" + e / 3.13 + " -" + e + "\nc4,-6.7,10,-10,18,-10 H400000v" + (40 + e) + "\nH1013.1s-83.4,268,-264.1,840c-180.7,572,-277,876.3,-289,913c-4.7,4.7,-12.7,7,-24,7\ns-12,0,-12,0c-1.3,-3.3,-3.7,-11.7,-7,-25c-35.3,-125.3,-106.7,-373.3,-214,-744\nc-10,12,-21,25,-33,39s-32,39,-32,39c-6,-5.3,-15,-14,-27,-26s25,-30,25,-30\nc26.7,-32.7,52,-63,76,-91s52,-60,52,-60s208,722,208,722\nc56,-175.3,126.3,-397.3,211,-666c84.7,-268.7,153.8,-488.2,207.5,-658.5\nc53.7,-170.3,84.5,-266.8,92.5,-289.5z\nM" + (1001 + e) + " " + t + "h400000v" + (40 + e) + "h-400000z";
}, Gd = function(e, t) {
	return "M424," + (2398 + e + t) + "\nc-1.3,-0.7,-38.5,-172,-111.5,-514c-73,-342,-109.8,-513.3,-110.5,-514\nc0,-2,-10.7,14.3,-32,49c-4.7,7.3,-9.8,15.7,-15.5,25c-5.7,9.3,-9.8,16,-12.5,20\ns-5,7,-5,7c-4,-3.3,-8.3,-7.7,-13,-13s-13,-13,-13,-13s76,-122,76,-122s77,-121,77,-121\ns209,968,209,968c0,-2,84.7,-361.7,254,-1079c169.3,-717.3,254.7,-1077.7,256,-1081\nl" + e / 4.223 + " -" + e + "c4,-6.7,10,-10,18,-10 H400000\nv" + (40 + e) + "H1014.6\ns-87.3,378.7,-272.6,1166c-185.3,787.3,-279.3,1182.3,-282,1185\nc-2,6,-10,9,-24,9\nc-8,0,-12,-0.7,-12,-2z M" + (1001 + e) + " " + t + "\nh400000v" + (40 + e) + "h-400000z";
}, Kd = function(e, t) {
	return "M473," + (2713 + e + t) + "\nc339.3,-1799.3,509.3,-2700,510,-2702 l" + e / 5.298 + " -" + e + "\nc3.3,-7.3,9.3,-11,18,-11 H400000v" + (40 + e) + "H1017.7\ns-90.5,478,-276.2,1466c-185.7,988,-279.5,1483,-281.5,1485c-2,6,-10,9,-24,9\nc-8,0,-12,-0.7,-12,-2c0,-1.3,-5.3,-32,-16,-92c-50.7,-293.3,-119.7,-693.3,-207,-1200\nc0,-1.3,-5.3,8.7,-16,30c-10.7,21.3,-21.3,42.7,-32,64s-16,33,-16,33s-26,-26,-26,-26\ns76,-153,76,-153s77,-151,77,-151c0.7,0.7,35.7,202,105,604c67.3,400.7,102,602.7,104,\n606zM" + (1001 + e) + " " + t + "h400000v" + (40 + e) + "H1017.7z";
}, qd = function(e) {
	var t = e / 2;
	return "M400000 " + e + " H0 L" + t + " 0 l65 45 L145 " + (e - 80) + " H400000z";
}, Jd = function(e, t, n) {
	var r = n - 54 - t - e;
	return "M702 " + (e + t) + "H400000" + (40 + e) + "\nH742v" + r + "l-4 4-4 4c-.667.7 -2 1.5-4 2.5s-4.167 1.833-6.5 2.5-5.5 1-9.5 1\nh-12l-28-84c-16.667-52-96.667 -294.333-240-727l-212 -643 -85 170\nc-4-3.333-8.333-7.667-13 -13l-13-13l77-155 77-156c66 199.333 139 419.667\n219 661 l218 661zM702 " + t + "H400000v" + (40 + e) + "H742z";
}, Yd = function(e, t, n) {
	t = 1e3 * t;
	var r = "";
	switch (e) {
		case "sqrtMain":
			r = Hd(t, Vd);
			break;
		case "sqrtSize1":
			r = Ud(t, Vd);
			break;
		case "sqrtSize2":
			r = Wd(t, Vd);
			break;
		case "sqrtSize3":
			r = Gd(t, Vd);
			break;
		case "sqrtSize4":
			r = Kd(t, Vd);
			break;
		case "sqrtTall": r = Jd(t, Vd, n);
	}
	return r;
}, Xd = function(e, t) {
	switch (e) {
		case "⎜": return Bd("M291 0 H417 V" + t + " H291z");
		case "∣": return Bd("M145 0 H188 V" + t + " H145z");
		case "∥": return Bd("M145 0 H188 V" + t + " H145z") + Bd("M367 0 H410 V" + t + " H367z");
		case "⎟": return Bd("M457 0 H583 V" + t + " H457z");
		case "⎢": return Bd("M319 0 H403 V" + t + " H319z");
		case "⎥": return Bd("M263 0 H347 V" + t + " H263z");
		case "⎪": return Bd("M384 0 H504 V" + t + " H384z");
		case "⏐": return Bd("M312 0 H355 V" + t + " H312z");
		case "‖": return Bd("M257 0 H300 V" + t + " H257z") + Bd("M478 0 H521 V" + t + " H478z");
		default: return "";
	}
}, Zd = {
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
	leftlinesegment: Bd("M40 281 V428 H0 V94 H40 V241 H400000 v40z"),
	leftbracketunder: Bd("M0 0 h120 V290 H399995 v120 H0z"),
	leftbracketover: Bd("M0 440 h120 V150 H399995 v-120 H0z"),
	leftmapsto: Bd("M40 281 V448H0V74H40V241H400000v40z"),
	leftToFrom: "M0 147h400000v40H0zm0 214c68 40 115.7 95.7 143 167h22c15.3 0 23\n-.3 23-1 0-1.3-5.3-13.7-16-37-18-35.3-41.3-69-70-101l-7-8h399905v-40H95l7-8\nc28.7-32 52-65.7 70-101 10.7-23.3 16-35.7 16-37 0-.7-7.7-1-23-1h-22C115.7 265.3\n 68 321 0 361zm0-174v-40h399900v40zm100 154v40h399900v-40z",
	longequal: Bd("M0 50 h400000 v40H0z m0 194h40000v40H0z"),
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
	rightlinesegment: Bd("M399960 241 V94 h40 V428 h-40 V281 H0 v-40z"),
	rightbracketunder: Bd("M399995 0 h-120 V290 H0 v120 H400000z"),
	rightbracketover: Bd("M399995 440 h-120 V150 H0 v-120 H399995z"),
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
}, Qd = function(e, t) {
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
function $d(e) {
	return "toText" in e;
}
var ef = class {
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
			if ($d(e)) return e.toText();
			throw Error("Expected MathDomNode with toText, got " + e.constructor.name);
		}).join("");
	}
}, tf = {
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
}, nf = {
	ex: !0,
	em: !0,
	mu: !0
}, rf = function(e) {
	return typeof e != "string" && (e = e.unit), e in tf || e in nf || e === "ex";
}, af = function(e, t) {
	var n;
	if (e.unit in tf) n = tf[e.unit] / t.fontMetrics().ptPerEm / t.sizeMultiplier;
	else if (e.unit === "mu") n = t.fontMetrics().cssEmPerMu;
	else {
		var r = t.style.isTight() ? t.havingStyle(t.style.text()) : t;
		if (e.unit === "ex") n = r.fontMetrics().xHeight;
		else if (e.unit === "em") n = r.fontMetrics().quad;
		else throw new M("Invalid unit: '" + e.unit + "'");
		r !== t && (n *= r.sizeMultiplier / t.sizeMultiplier);
	}
	return Math.min(e.number * n, t.maxSize);
}, P = function(e) {
	return +e.toFixed(4) + "em";
}, of = function(e) {
	return e.filter((e) => e).join(" ");
}, sf = function(e) {
	var t = "";
	for (var n of Object.keys(e)) {
		var r = e[n];
		r !== void 0 && (t += sd(n) + ":" + r + ";");
	}
	return t;
}, cf = function(e, t, n) {
	if (this.classes = e || [], this.attributes = {}, this.height = 0, this.depth = 0, this.maxFontSize = 0, this.style = n || {}, t) {
		t.style.isTight() && this.classes.push("mtight");
		var r = t.getColor();
		r && (this.style.color = r);
	}
}, lf = function(e) {
	var t = document.createElement(e);
	t.className = of(this.classes), Object.assign(t.style, this.style);
	for (var n of Object.keys(this.attributes)) t.setAttribute(n, this.attributes[n]);
	for (var r = 0; r < this.children.length; r++) t.appendChild(this.children[r].toNode());
	return t;
}, uf = /[\s"'>/=\x00-\x1f]/, df = function(e) {
	var t = "<" + e;
	this.classes.length && (t += " class=\"" + ud(of(this.classes)) + "\"");
	var n = sf(this.style);
	n && (t += " style=\"" + ud(n) + "\"");
	for (var r of Object.keys(this.attributes)) {
		if (uf.test(r)) throw new M("Invalid attribute name '" + r + "'");
		t += " " + r + "=\"" + ud(this.attributes[r]) + "\"";
	}
	t += ">";
	for (var i = 0; i < this.children.length; i++) t += this.children[i].toMarkup();
	return t += "</" + e + ">", t;
}, ff = class {
	constructor(e, t, n, r) {
		this.children = void 0, this.attributes = void 0, this.classes = void 0, this.height = void 0, this.depth = void 0, this.width = void 0, this.maxFontSize = void 0, this.style = void 0, this.italic = void 0, cf.call(this, e, n, r), this.children = t || [];
	}
	setAttribute(e, t) {
		this.attributes[e] = t;
	}
	hasClass(e) {
		return this.classes.includes(e);
	}
	toNode() {
		return lf.call(this, "span");
	}
	toMarkup() {
		return df.call(this, "span");
	}
}, pf = class {
	constructor(e, t, n, r) {
		this.children = void 0, this.attributes = void 0, this.classes = void 0, this.height = void 0, this.depth = void 0, this.maxFontSize = void 0, this.style = void 0, cf.call(this, t, r), this.children = n || [], this.setAttribute("href", e);
	}
	setAttribute(e, t) {
		this.attributes[e] = t;
	}
	hasClass(e) {
		return this.classes.includes(e);
	}
	toNode() {
		return lf.call(this, "a");
	}
	toMarkup() {
		return df.call(this, "a");
	}
}, mf = class {
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
		var e = "<img src=\"" + ud(this.src) + "\"" + (" alt=\"" + ud(this.alt) + "\""), t = sf(this.style);
		return t && (e += " style=\"" + ud(t) + "\""), e += "'/>", e;
	}
}, hf = {
	î: "ı̂",
	ï: "ı̈",
	í: "ı́",
	ì: "ı̀"
}, gf = class {
	constructor(e, t, n, r, i, a, o, s) {
		this.text = void 0, this.height = void 0, this.depth = void 0, this.italic = void 0, this.skew = void 0, this.width = void 0, this.maxFontSize = void 0, this.classes = void 0, this.style = void 0, this.text = e, this.height = t || 0, this.depth = n || 0, this.italic = r || 0, this.skew = i || 0, this.width = a || 0, this.classes = o || [], this.style = s || {}, this.maxFontSize = 0;
		var c = Ld(this.text.charCodeAt(0));
		c && this.classes.push(c + "_fallback"), /[îïíì]/.test(this.text) && (this.text = hf[this.text]);
	}
	hasClass(e) {
		return this.classes.includes(e);
	}
	toNode() {
		var e = document.createTextNode(this.text), t = null;
		return this.italic > 0 && (t = document.createElement("span"), t.style.marginRight = P(this.italic)), this.classes.length > 0 && (t ||= document.createElement("span"), t.className = of(this.classes)), Object.keys(this.style).length > 0 && (t ||= document.createElement("span"), Object.assign(t.style, this.style)), t ? (t.appendChild(e), t) : e;
	}
	toMarkup() {
		var e = !1, t = "<span";
		this.classes.length && (e = !0, t += " class=\"", t += ud(of(this.classes)), t += "\"");
		var n = "";
		this.italic > 0 && (n += "margin-right:" + P(this.italic) + ";"), n += sf(this.style), n && (e = !0, t += " style=\"" + ud(n) + "\"");
		var r = ud(this.text);
		return e ? (t += ">", t += r, t += "</span>", t) : r;
	}
}, _f = class {
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
		for (var t of Object.keys(this.attributes)) e += " " + t + "=\"" + ud(this.attributes[t]) + "\"";
		e += ">";
		for (var n = 0; n < this.children.length; n++) e += this.children[n].toMarkup();
		return e += "</svg>", e;
	}
}, vf = class {
	constructor(e, t) {
		this.pathName = void 0, this.alternate = void 0, this.pathName = e, this.alternate = t;
	}
	toNode() {
		var e = document.createElementNS("http://www.w3.org/2000/svg", "path");
		return this.alternate ? e.setAttribute("d", this.alternate) : e.setAttribute("d", Zd[this.pathName]), e;
	}
	toMarkup() {
		return this.alternate ? "<path d=\"" + ud(this.alternate) + "\"/>" : "<path d=\"" + ud(Zd[this.pathName]) + "\"/>";
	}
}, yf = class {
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
		for (var t of Object.keys(this.attributes)) e += " " + t + "=\"" + ud(this.attributes[t]) + "\"";
		return e += "/>", e;
	}
};
function bf(e) {
	if (e instanceof gf) return e;
	throw Error("Expected symbolNode but got " + String(e) + ".");
}
function xf(e) {
	if (e instanceof ff) return e;
	throw Error("Expected span<HtmlDomNode> but got " + String(e) + ".");
}
var Sf = (e) => e instanceof ff || e instanceof pf || e instanceof ef, Cf = {
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
}, wf = {
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
}, Tf = {
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
function Ef(e, t) {
	Cf[e] = t;
}
function Df(e, t, n) {
	if (!Cf[t]) throw Error("Font metrics not found for font: " + t + ".");
	var r = e.charCodeAt(0), i = Cf[t][r];
	if (!i && e[0] in Tf && (r = Tf[e[0]].charCodeAt(0), i = Cf[t][r]), !i && n === "text" && zd(r) && (i = Cf[t][77]), i) return {
		depth: i[0],
		height: i[1],
		italic: i[2],
		skew: i[3],
		width: i[4]
	};
}
var Of = {};
function kf(e) {
	var t = e >= 5 ? 0 : e >= 3 ? 1 : 2;
	if (!Of[t]) {
		var n = Of[t] = { cssEmPerMu: wf.quad[t] / 18 };
		for (var r in wf) wf.hasOwnProperty(r) && (n[r] = wf[r][t]);
	}
	return Of[t];
}
var Af = {
	math: {},
	text: {}
};
function F(e, t, n, r, i, a) {
	Af[e][i] = {
		font: t,
		group: n,
		replace: r
	}, a && r && (Af[e][r] = Af[e][i]);
}
var I = "math", L = "text", R = "main", z = "ams", jf = "accent-token", B = "bin", Mf = "close", Nf = "inner", V = "mathord", Pf = "op-token", Ff = "open", If = "punct", H = "rel", Lf = "spacing", U = "textord";
F(I, R, H, "≡", "\\equiv", !0), F(I, R, H, "≺", "\\prec", !0), F(I, R, H, "≻", "\\succ", !0), F(I, R, H, "∼", "\\sim", !0), F(I, R, H, "⊥", "\\perp"), F(I, R, H, "⪯", "\\preceq", !0), F(I, R, H, "⪰", "\\succeq", !0), F(I, R, H, "≃", "\\simeq", !0), F(I, R, H, "∣", "\\mid", !0), F(I, R, H, "≪", "\\ll", !0), F(I, R, H, "≫", "\\gg", !0), F(I, R, H, "≍", "\\asymp", !0), F(I, R, H, "∥", "\\parallel"), F(I, R, H, "⋈", "\\bowtie", !0), F(I, R, H, "⌣", "\\smile", !0), F(I, R, H, "⊑", "\\sqsubseteq", !0), F(I, R, H, "⊒", "\\sqsupseteq", !0), F(I, R, H, "≐", "\\doteq", !0), F(I, R, H, "⌢", "\\frown", !0), F(I, R, H, "∋", "\\ni", !0), F(I, R, H, "∝", "\\propto", !0), F(I, R, H, "⊢", "\\vdash", !0), F(I, R, H, "⊣", "\\dashv", !0), F(I, R, H, "∋", "\\owns"), F(I, R, If, ".", "\\ldotp"), F(I, R, If, "⋅", "\\cdotp"), F(I, R, If, "⋅", "·"), F(L, R, U, "⋅", "·"), F(I, R, U, "#", "\\#"), F(L, R, U, "#", "\\#"), F(I, R, U, "&", "\\&"), F(L, R, U, "&", "\\&"), F(I, R, U, "ℵ", "\\aleph", !0), F(I, R, U, "∀", "\\forall", !0), F(I, R, U, "ℏ", "\\hbar", !0), F(I, R, U, "∃", "\\exists", !0), F(I, R, U, "∇", "\\nabla", !0), F(I, R, U, "♭", "\\flat", !0), F(I, R, U, "ℓ", "\\ell", !0), F(I, R, U, "♮", "\\natural", !0), F(I, R, U, "♣", "\\clubsuit", !0), F(I, R, U, "℘", "\\wp", !0), F(I, R, U, "♯", "\\sharp", !0), F(I, R, U, "♢", "\\diamondsuit", !0), F(I, R, U, "ℜ", "\\Re", !0), F(I, R, U, "♡", "\\heartsuit", !0), F(I, R, U, "ℑ", "\\Im", !0), F(I, R, U, "♠", "\\spadesuit", !0), F(I, R, U, "§", "\\S", !0), F(L, R, U, "§", "\\S"), F(I, R, U, "¶", "\\P", !0), F(L, R, U, "¶", "\\P"), F(I, R, U, "†", "\\dag"), F(L, R, U, "†", "\\dag"), F(L, R, U, "†", "\\textdagger"), F(I, R, U, "‡", "\\ddag"), F(L, R, U, "‡", "\\ddag"), F(L, R, U, "‡", "\\textdaggerdbl"), F(I, R, Mf, "⎱", "\\rmoustache", !0), F(I, R, Ff, "⎰", "\\lmoustache", !0), F(I, R, Mf, "⟯", "\\rgroup", !0), F(I, R, Ff, "⟮", "\\lgroup", !0), F(I, R, B, "∓", "\\mp", !0), F(I, R, B, "⊖", "\\ominus", !0), F(I, R, B, "⊎", "\\uplus", !0), F(I, R, B, "⊓", "\\sqcap", !0), F(I, R, B, "∗", "\\ast"), F(I, R, B, "⊔", "\\sqcup", !0), F(I, R, B, "◯", "\\bigcirc", !0), F(I, R, B, "∙", "\\bullet", !0), F(I, R, B, "‡", "\\ddagger"), F(I, R, B, "≀", "\\wr", !0), F(I, R, B, "⨿", "\\amalg"), F(I, R, B, "&", "\\And"), F(I, R, H, "⟵", "\\longleftarrow", !0), F(I, R, H, "⇐", "\\Leftarrow", !0), F(I, R, H, "⟸", "\\Longleftarrow", !0), F(I, R, H, "⟶", "\\longrightarrow", !0), F(I, R, H, "⇒", "\\Rightarrow", !0), F(I, R, H, "⟹", "\\Longrightarrow", !0), F(I, R, H, "↔", "\\leftrightarrow", !0), F(I, R, H, "⟷", "\\longleftrightarrow", !0), F(I, R, H, "⇔", "\\Leftrightarrow", !0), F(I, R, H, "⟺", "\\Longleftrightarrow", !0), F(I, R, H, "↦", "\\mapsto", !0), F(I, R, H, "⟼", "\\longmapsto", !0), F(I, R, H, "↗", "\\nearrow", !0), F(I, R, H, "↩", "\\hookleftarrow", !0), F(I, R, H, "↪", "\\hookrightarrow", !0), F(I, R, H, "↘", "\\searrow", !0), F(I, R, H, "↼", "\\leftharpoonup", !0), F(I, R, H, "⇀", "\\rightharpoonup", !0), F(I, R, H, "↙", "\\swarrow", !0), F(I, R, H, "↽", "\\leftharpoondown", !0), F(I, R, H, "⇁", "\\rightharpoondown", !0), F(I, R, H, "↖", "\\nwarrow", !0), F(I, R, H, "⇌", "\\rightleftharpoons", !0), F(I, z, H, "≮", "\\nless", !0), F(I, z, H, "", "\\@nleqslant"), F(I, z, H, "", "\\@nleqq"), F(I, z, H, "⪇", "\\lneq", !0), F(I, z, H, "≨", "\\lneqq", !0), F(I, z, H, "", "\\@lvertneqq"), F(I, z, H, "⋦", "\\lnsim", !0), F(I, z, H, "⪉", "\\lnapprox", !0), F(I, z, H, "⊀", "\\nprec", !0), F(I, z, H, "⋠", "\\npreceq", !0), F(I, z, H, "⋨", "\\precnsim", !0), F(I, z, H, "⪹", "\\precnapprox", !0), F(I, z, H, "≁", "\\nsim", !0), F(I, z, H, "", "\\@nshortmid"), F(I, z, H, "∤", "\\nmid", !0), F(I, z, H, "⊬", "\\nvdash", !0), F(I, z, H, "⊭", "\\nvDash", !0), F(I, z, H, "⋪", "\\ntriangleleft"), F(I, z, H, "⋬", "\\ntrianglelefteq", !0), F(I, z, H, "⊊", "\\subsetneq", !0), F(I, z, H, "", "\\@varsubsetneq"), F(I, z, H, "⫋", "\\subsetneqq", !0), F(I, z, H, "", "\\@varsubsetneqq"), F(I, z, H, "≯", "\\ngtr", !0), F(I, z, H, "", "\\@ngeqslant"), F(I, z, H, "", "\\@ngeqq"), F(I, z, H, "⪈", "\\gneq", !0), F(I, z, H, "≩", "\\gneqq", !0), F(I, z, H, "", "\\@gvertneqq"), F(I, z, H, "⋧", "\\gnsim", !0), F(I, z, H, "⪊", "\\gnapprox", !0), F(I, z, H, "⊁", "\\nsucc", !0), F(I, z, H, "⋡", "\\nsucceq", !0), F(I, z, H, "⋩", "\\succnsim", !0), F(I, z, H, "⪺", "\\succnapprox", !0), F(I, z, H, "≆", "\\ncong", !0), F(I, z, H, "", "\\@nshortparallel"), F(I, z, H, "∦", "\\nparallel", !0), F(I, z, H, "⊯", "\\nVDash", !0), F(I, z, H, "⋫", "\\ntriangleright"), F(I, z, H, "⋭", "\\ntrianglerighteq", !0), F(I, z, H, "", "\\@nsupseteqq"), F(I, z, H, "⊋", "\\supsetneq", !0), F(I, z, H, "", "\\@varsupsetneq"), F(I, z, H, "⫌", "\\supsetneqq", !0), F(I, z, H, "", "\\@varsupsetneqq"), F(I, z, H, "⊮", "\\nVdash", !0), F(I, z, H, "⪵", "\\precneqq", !0), F(I, z, H, "⪶", "\\succneqq", !0), F(I, z, H, "", "\\@nsubseteqq"), F(I, z, B, "⊴", "\\unlhd"), F(I, z, B, "⊵", "\\unrhd"), F(I, z, H, "↚", "\\nleftarrow", !0), F(I, z, H, "↛", "\\nrightarrow", !0), F(I, z, H, "⇍", "\\nLeftarrow", !0), F(I, z, H, "⇏", "\\nRightarrow", !0), F(I, z, H, "↮", "\\nleftrightarrow", !0), F(I, z, H, "⇎", "\\nLeftrightarrow", !0), F(I, z, H, "△", "\\vartriangle"), F(I, z, U, "ℏ", "\\hslash"), F(I, z, U, "▽", "\\triangledown"), F(I, z, U, "◊", "\\lozenge"), F(I, z, U, "Ⓢ", "\\circledS"), F(I, z, U, "®", "\\circledR"), F(L, z, U, "®", "\\circledR"), F(I, z, U, "∡", "\\measuredangle", !0), F(I, z, U, "∄", "\\nexists"), F(I, z, U, "℧", "\\mho"), F(I, z, U, "Ⅎ", "\\Finv", !0), F(I, z, U, "⅁", "\\Game", !0), F(I, z, U, "‵", "\\backprime"), F(I, z, U, "▲", "\\blacktriangle"), F(I, z, U, "▼", "\\blacktriangledown"), F(I, z, U, "■", "\\blacksquare"), F(I, z, U, "⧫", "\\blacklozenge"), F(I, z, U, "★", "\\bigstar"), F(I, z, U, "∢", "\\sphericalangle", !0), F(I, z, U, "∁", "\\complement", !0), F(I, z, U, "ð", "\\eth", !0), F(L, R, U, "ð", "ð"), F(I, z, U, "╱", "\\diagup"), F(I, z, U, "╲", "\\diagdown"), F(I, z, U, "□", "\\square"), F(I, z, U, "□", "\\Box"), F(I, z, U, "◊", "\\Diamond"), F(I, z, U, "¥", "\\yen", !0), F(L, z, U, "¥", "\\yen", !0), F(I, z, U, "✓", "\\checkmark", !0), F(L, z, U, "✓", "\\checkmark"), F(I, z, U, "ℶ", "\\beth", !0), F(I, z, U, "ℸ", "\\daleth", !0), F(I, z, U, "ℷ", "\\gimel", !0), F(I, z, U, "ϝ", "\\digamma", !0), F(I, z, U, "ϰ", "\\varkappa"), F(I, z, Ff, "┌", "\\@ulcorner", !0), F(I, z, Mf, "┐", "\\@urcorner", !0), F(I, z, Ff, "└", "\\@llcorner", !0), F(I, z, Mf, "┘", "\\@lrcorner", !0), F(I, z, H, "≦", "\\leqq", !0), F(I, z, H, "⩽", "\\leqslant", !0), F(I, z, H, "⪕", "\\eqslantless", !0), F(I, z, H, "≲", "\\lesssim", !0), F(I, z, H, "⪅", "\\lessapprox", !0), F(I, z, H, "≊", "\\approxeq", !0), F(I, z, B, "⋖", "\\lessdot"), F(I, z, H, "⋘", "\\lll", !0), F(I, z, H, "≶", "\\lessgtr", !0), F(I, z, H, "⋚", "\\lesseqgtr", !0), F(I, z, H, "⪋", "\\lesseqqgtr", !0), F(I, z, H, "≑", "\\doteqdot"), F(I, z, H, "≓", "\\risingdotseq", !0), F(I, z, H, "≒", "\\fallingdotseq", !0), F(I, z, H, "∽", "\\backsim", !0), F(I, z, H, "⋍", "\\backsimeq", !0), F(I, z, H, "⫅", "\\subseteqq", !0), F(I, z, H, "⋐", "\\Subset", !0), F(I, z, H, "⊏", "\\sqsubset", !0), F(I, z, H, "≼", "\\preccurlyeq", !0), F(I, z, H, "⋞", "\\curlyeqprec", !0), F(I, z, H, "≾", "\\precsim", !0), F(I, z, H, "⪷", "\\precapprox", !0), F(I, z, H, "⊲", "\\vartriangleleft"), F(I, z, H, "⊴", "\\trianglelefteq"), F(I, z, H, "⊨", "\\vDash", !0), F(I, z, H, "⊪", "\\Vvdash", !0), F(I, z, H, "⌣", "\\smallsmile"), F(I, z, H, "⌢", "\\smallfrown"), F(I, z, H, "≏", "\\bumpeq", !0), F(I, z, H, "≎", "\\Bumpeq", !0), F(I, z, H, "≧", "\\geqq", !0), F(I, z, H, "⩾", "\\geqslant", !0), F(I, z, H, "⪖", "\\eqslantgtr", !0), F(I, z, H, "≳", "\\gtrsim", !0), F(I, z, H, "⪆", "\\gtrapprox", !0), F(I, z, B, "⋗", "\\gtrdot"), F(I, z, H, "⋙", "\\ggg", !0), F(I, z, H, "≷", "\\gtrless", !0), F(I, z, H, "⋛", "\\gtreqless", !0), F(I, z, H, "⪌", "\\gtreqqless", !0), F(I, z, H, "≖", "\\eqcirc", !0), F(I, z, H, "≗", "\\circeq", !0), F(I, z, H, "≜", "\\triangleq", !0), F(I, z, H, "∼", "\\thicksim"), F(I, z, H, "≈", "\\thickapprox"), F(I, z, H, "⫆", "\\supseteqq", !0), F(I, z, H, "⋑", "\\Supset", !0), F(I, z, H, "⊐", "\\sqsupset", !0), F(I, z, H, "≽", "\\succcurlyeq", !0), F(I, z, H, "⋟", "\\curlyeqsucc", !0), F(I, z, H, "≿", "\\succsim", !0), F(I, z, H, "⪸", "\\succapprox", !0), F(I, z, H, "⊳", "\\vartriangleright"), F(I, z, H, "⊵", "\\trianglerighteq"), F(I, z, H, "⊩", "\\Vdash", !0), F(I, z, H, "∣", "\\shortmid"), F(I, z, H, "∥", "\\shortparallel"), F(I, z, H, "≬", "\\between", !0), F(I, z, H, "⋔", "\\pitchfork", !0), F(I, z, H, "∝", "\\varpropto"), F(I, z, H, "◀", "\\blacktriangleleft"), F(I, z, H, "∴", "\\therefore", !0), F(I, z, H, "∍", "\\backepsilon"), F(I, z, H, "▶", "\\blacktriangleright"), F(I, z, H, "∵", "\\because", !0), F(I, z, H, "⋘", "\\llless"), F(I, z, H, "⋙", "\\gggtr"), F(I, z, B, "⊲", "\\lhd"), F(I, z, B, "⊳", "\\rhd"), F(I, z, H, "≂", "\\eqsim", !0), F(I, R, H, "⋈", "\\Join"), F(I, z, H, "≑", "\\Doteq", !0), F(I, z, B, "∔", "\\dotplus", !0), F(I, z, B, "∖", "\\smallsetminus"), F(I, z, B, "⋒", "\\Cap", !0), F(I, z, B, "⋓", "\\Cup", !0), F(I, z, B, "⩞", "\\doublebarwedge", !0), F(I, z, B, "⊟", "\\boxminus", !0), F(I, z, B, "⊞", "\\boxplus", !0), F(I, z, B, "⋇", "\\divideontimes", !0), F(I, z, B, "⋉", "\\ltimes", !0), F(I, z, B, "⋊", "\\rtimes", !0), F(I, z, B, "⋋", "\\leftthreetimes", !0), F(I, z, B, "⋌", "\\rightthreetimes", !0), F(I, z, B, "⋏", "\\curlywedge", !0), F(I, z, B, "⋎", "\\curlyvee", !0), F(I, z, B, "⊝", "\\circleddash", !0), F(I, z, B, "⊛", "\\circledast", !0), F(I, z, B, "⋅", "\\centerdot"), F(I, z, B, "⊺", "\\intercal", !0), F(I, z, B, "⋒", "\\doublecap"), F(I, z, B, "⋓", "\\doublecup"), F(I, z, B, "⊠", "\\boxtimes", !0), F(I, z, H, "⇢", "\\dashrightarrow", !0), F(I, z, H, "⇠", "\\dashleftarrow", !0), F(I, z, H, "⇇", "\\leftleftarrows", !0), F(I, z, H, "⇆", "\\leftrightarrows", !0), F(I, z, H, "⇚", "\\Lleftarrow", !0), F(I, z, H, "↞", "\\twoheadleftarrow", !0), F(I, z, H, "↢", "\\leftarrowtail", !0), F(I, z, H, "↫", "\\looparrowleft", !0), F(I, z, H, "⇋", "\\leftrightharpoons", !0), F(I, z, H, "↶", "\\curvearrowleft", !0), F(I, z, H, "↺", "\\circlearrowleft", !0), F(I, z, H, "↰", "\\Lsh", !0), F(I, z, H, "⇈", "\\upuparrows", !0), F(I, z, H, "↿", "\\upharpoonleft", !0), F(I, z, H, "⇃", "\\downharpoonleft", !0), F(I, R, H, "⊶", "\\origof", !0), F(I, R, H, "⊷", "\\imageof", !0), F(I, z, H, "⊸", "\\multimap", !0), F(I, z, H, "↭", "\\leftrightsquigarrow", !0), F(I, z, H, "⇉", "\\rightrightarrows", !0), F(I, z, H, "⇄", "\\rightleftarrows", !0), F(I, z, H, "↠", "\\twoheadrightarrow", !0), F(I, z, H, "↣", "\\rightarrowtail", !0), F(I, z, H, "↬", "\\looparrowright", !0), F(I, z, H, "↷", "\\curvearrowright", !0), F(I, z, H, "↻", "\\circlearrowright", !0), F(I, z, H, "↱", "\\Rsh", !0), F(I, z, H, "⇊", "\\downdownarrows", !0), F(I, z, H, "↾", "\\upharpoonright", !0), F(I, z, H, "⇂", "\\downharpoonright", !0), F(I, z, H, "⇝", "\\rightsquigarrow", !0), F(I, z, H, "⇝", "\\leadsto"), F(I, z, H, "⇛", "\\Rrightarrow", !0), F(I, z, H, "↾", "\\restriction"), F(I, R, U, "‘", "`"), F(I, R, U, "$", "\\$"), F(L, R, U, "$", "\\$"), F(L, R, U, "$", "\\textdollar"), F(I, R, U, "%", "\\%"), F(L, R, U, "%", "\\%"), F(I, R, U, "_", "\\_"), F(L, R, U, "_", "\\_"), F(L, R, U, "_", "\\textunderscore"), F(I, R, U, "∠", "\\angle", !0), F(I, R, U, "∞", "\\infty", !0), F(I, R, U, "′", "\\prime"), F(I, R, U, "△", "\\triangle"), F(I, R, U, "Γ", "\\Gamma", !0), F(I, R, U, "Δ", "\\Delta", !0), F(I, R, U, "Θ", "\\Theta", !0), F(I, R, U, "Λ", "\\Lambda", !0), F(I, R, U, "Ξ", "\\Xi", !0), F(I, R, U, "Π", "\\Pi", !0), F(I, R, U, "Σ", "\\Sigma", !0), F(I, R, U, "Υ", "\\Upsilon", !0), F(I, R, U, "Φ", "\\Phi", !0), F(I, R, U, "Ψ", "\\Psi", !0), F(I, R, U, "Ω", "\\Omega", !0), F(I, R, U, "A", "Α"), F(I, R, U, "B", "Β"), F(I, R, U, "E", "Ε"), F(I, R, U, "Z", "Ζ"), F(I, R, U, "H", "Η"), F(I, R, U, "I", "Ι"), F(I, R, U, "K", "Κ"), F(I, R, U, "M", "Μ"), F(I, R, U, "N", "Ν"), F(I, R, U, "O", "Ο"), F(I, R, U, "P", "Ρ"), F(I, R, U, "T", "Τ"), F(I, R, U, "X", "Χ"), F(I, R, U, "¬", "\\neg", !0), F(I, R, U, "¬", "\\lnot"), F(I, R, U, "⊤", "\\top"), F(I, R, U, "⊥", "\\bot"), F(I, R, U, "∅", "\\emptyset"), F(I, z, U, "∅", "\\varnothing"), F(I, R, V, "α", "\\alpha", !0), F(I, R, V, "β", "\\beta", !0), F(I, R, V, "γ", "\\gamma", !0), F(I, R, V, "δ", "\\delta", !0), F(I, R, V, "ϵ", "\\epsilon", !0), F(I, R, V, "ζ", "\\zeta", !0), F(I, R, V, "η", "\\eta", !0), F(I, R, V, "θ", "\\theta", !0), F(I, R, V, "ι", "\\iota", !0), F(I, R, V, "κ", "\\kappa", !0), F(I, R, V, "λ", "\\lambda", !0), F(I, R, V, "μ", "\\mu", !0), F(I, R, V, "ν", "\\nu", !0), F(I, R, V, "ξ", "\\xi", !0), F(I, R, V, "ο", "\\omicron", !0), F(I, R, V, "π", "\\pi", !0), F(I, R, V, "ρ", "\\rho", !0), F(I, R, V, "σ", "\\sigma", !0), F(I, R, V, "τ", "\\tau", !0), F(I, R, V, "υ", "\\upsilon", !0), F(I, R, V, "ϕ", "\\phi", !0), F(I, R, V, "χ", "\\chi", !0), F(I, R, V, "ψ", "\\psi", !0), F(I, R, V, "ω", "\\omega", !0), F(I, R, V, "ε", "\\varepsilon", !0), F(I, R, V, "ϑ", "\\vartheta", !0), F(I, R, V, "ϖ", "\\varpi", !0), F(I, R, V, "ϱ", "\\varrho", !0), F(I, R, V, "ς", "\\varsigma", !0), F(I, R, V, "φ", "\\varphi", !0), F(I, R, B, "∗", "*", !0), F(I, R, B, "+", "+"), F(I, R, B, "−", "-", !0), F(I, R, B, "⋅", "\\cdot", !0), F(I, R, B, "∘", "\\circ", !0), F(I, R, B, "÷", "\\div", !0), F(I, R, B, "±", "\\pm", !0), F(I, R, B, "×", "\\times", !0), F(I, R, B, "∩", "\\cap", !0), F(I, R, B, "∪", "\\cup", !0), F(I, R, B, "∖", "\\setminus", !0), F(I, R, B, "∧", "\\land"), F(I, R, B, "∨", "\\lor"), F(I, R, B, "∧", "\\wedge", !0), F(I, R, B, "∨", "\\vee", !0), F(I, R, U, "√", "\\surd"), F(I, R, Ff, "⟨", "\\langle", !0), F(I, R, Ff, "∣", "\\lvert"), F(I, R, Ff, "∥", "\\lVert"), F(I, R, Mf, "?", "?"), F(I, R, Mf, "!", "!"), F(I, R, Mf, "⟩", "\\rangle", !0), F(I, R, Mf, "∣", "\\rvert"), F(I, R, Mf, "∥", "\\rVert"), F(I, R, H, "=", "="), F(I, R, H, ":", ":"), F(I, R, H, "≈", "\\approx", !0), F(I, R, H, "≅", "\\cong", !0), F(I, R, H, "≥", "\\ge"), F(I, R, H, "≥", "\\geq", !0), F(I, R, H, "←", "\\gets"), F(I, R, H, ">", "\\gt", !0), F(I, R, H, "∈", "\\in", !0), F(I, R, H, "", "\\@not"), F(I, R, H, "⊂", "\\subset", !0), F(I, R, H, "⊃", "\\supset", !0), F(I, R, H, "⊆", "\\subseteq", !0), F(I, R, H, "⊇", "\\supseteq", !0), F(I, z, H, "⊈", "\\nsubseteq", !0), F(I, z, H, "⊉", "\\nsupseteq", !0), F(I, R, H, "⊨", "\\models"), F(I, R, H, "←", "\\leftarrow", !0), F(I, R, H, "≤", "\\le"), F(I, R, H, "≤", "\\leq", !0), F(I, R, H, "<", "\\lt", !0), F(I, R, H, "→", "\\rightarrow", !0), F(I, R, H, "→", "\\to"), F(I, z, H, "≱", "\\ngeq", !0), F(I, z, H, "≰", "\\nleq", !0), F(I, R, Lf, "\xA0", "\\ "), F(I, R, Lf, "\xA0", "\\space"), F(I, R, Lf, "\xA0", "\\nobreakspace"), F(L, R, Lf, "\xA0", "\\ "), F(L, R, Lf, "\xA0", " "), F(L, R, Lf, "\xA0", "\\space"), F(L, R, Lf, "\xA0", "\\nobreakspace"), F(I, R, Lf, "", "\\nobreak"), F(I, R, Lf, "", "\\allowbreak"), F(I, R, If, ",", ","), F(I, R, If, ";", ";"), F(I, z, B, "⊼", "\\barwedge", !0), F(I, z, B, "⊻", "\\veebar", !0), F(I, R, B, "⊙", "\\odot", !0), F(I, R, B, "⊕", "\\oplus", !0), F(I, R, B, "⊗", "\\otimes", !0), F(I, R, U, "∂", "\\partial", !0), F(I, R, B, "⊘", "\\oslash", !0), F(I, z, B, "⊚", "\\circledcirc", !0), F(I, z, B, "⊡", "\\boxdot", !0), F(I, R, B, "△", "\\bigtriangleup"), F(I, R, B, "▽", "\\bigtriangledown"), F(I, R, B, "†", "\\dagger"), F(I, R, B, "⋄", "\\diamond"), F(I, R, B, "⋆", "\\star"), F(I, R, B, "◃", "\\triangleleft"), F(I, R, B, "▹", "\\triangleright"), F(I, R, Ff, "{", "\\{"), F(L, R, U, "{", "\\{"), F(L, R, U, "{", "\\textbraceleft"), F(I, R, Mf, "}", "\\}"), F(L, R, U, "}", "\\}"), F(L, R, U, "}", "\\textbraceright"), F(I, R, Ff, "{", "\\lbrace"), F(I, R, Mf, "}", "\\rbrace"), F(I, R, Ff, "[", "\\lbrack", !0), F(L, R, U, "[", "\\lbrack", !0), F(I, R, Mf, "]", "\\rbrack", !0), F(L, R, U, "]", "\\rbrack", !0), F(I, R, Ff, "(", "\\lparen", !0), F(I, R, Mf, ")", "\\rparen", !0), F(L, R, U, "<", "\\textless", !0), F(L, R, U, ">", "\\textgreater", !0), F(I, R, Ff, "⌊", "\\lfloor", !0), F(I, R, Mf, "⌋", "\\rfloor", !0), F(I, R, Ff, "⌈", "\\lceil", !0), F(I, R, Mf, "⌉", "\\rceil", !0), F(I, R, U, "\\", "\\backslash"), F(I, R, U, "∣", "|"), F(I, R, U, "∣", "\\vert"), F(L, R, U, "|", "\\textbar", !0), F(I, R, U, "∥", "\\|"), F(I, R, U, "∥", "\\Vert"), F(L, R, U, "∥", "\\textbardbl"), F(L, R, U, "~", "\\textasciitilde"), F(L, R, U, "\\", "\\textbackslash"), F(L, R, U, "^", "\\textasciicircum"), F(I, R, H, "↑", "\\uparrow", !0), F(I, R, H, "⇑", "\\Uparrow", !0), F(I, R, H, "↓", "\\downarrow", !0), F(I, R, H, "⇓", "\\Downarrow", !0), F(I, R, H, "↕", "\\updownarrow", !0), F(I, R, H, "⇕", "\\Updownarrow", !0), F(I, R, Pf, "∐", "\\coprod"), F(I, R, Pf, "⋁", "\\bigvee"), F(I, R, Pf, "⋀", "\\bigwedge"), F(I, R, Pf, "⨄", "\\biguplus"), F(I, R, Pf, "⋂", "\\bigcap"), F(I, R, Pf, "⋃", "\\bigcup"), F(I, R, Pf, "∫", "\\int"), F(I, R, Pf, "∫", "\\intop"), F(I, R, Pf, "∬", "\\iint"), F(I, R, Pf, "∭", "\\iiint"), F(I, R, Pf, "∏", "\\prod"), F(I, R, Pf, "∑", "\\sum"), F(I, R, Pf, "⨂", "\\bigotimes"), F(I, R, Pf, "⨁", "\\bigoplus"), F(I, R, Pf, "⨀", "\\bigodot"), F(I, R, Pf, "∮", "\\oint"), F(I, R, Pf, "∯", "\\oiint"), F(I, R, Pf, "∰", "\\oiiint"), F(I, R, Pf, "⨆", "\\bigsqcup"), F(I, R, Pf, "∫", "\\smallint"), F(L, R, Nf, "…", "\\textellipsis"), F(I, R, Nf, "…", "\\mathellipsis"), F(L, R, Nf, "…", "\\ldots", !0), F(I, R, Nf, "…", "\\ldots", !0), F(I, R, Nf, "⋯", "\\@cdots", !0), F(I, R, Nf, "⋱", "\\ddots", !0), F(I, R, U, "⋮", "\\varvdots"), F(L, R, U, "⋮", "\\varvdots"), F(I, R, jf, "ˊ", "\\acute"), F(I, R, jf, "ˋ", "\\grave"), F(I, R, jf, "¨", "\\ddot"), F(I, R, jf, "~", "\\tilde"), F(I, R, jf, "ˉ", "\\bar"), F(I, R, jf, "˘", "\\breve"), F(I, R, jf, "ˇ", "\\check"), F(I, R, jf, "^", "\\hat"), F(I, R, jf, "⃗", "\\vec"), F(I, R, jf, "˙", "\\dot"), F(I, R, jf, "˚", "\\mathring"), F(I, R, V, "", "\\@imath"), F(I, R, V, "", "\\@jmath"), F(I, R, U, "ı", "ı"), F(I, R, U, "ȷ", "ȷ"), F(L, R, U, "ı", "\\i", !0), F(L, R, U, "ȷ", "\\j", !0), F(L, R, U, "ß", "\\ss", !0), F(L, R, U, "æ", "\\ae", !0), F(L, R, U, "œ", "\\oe", !0), F(L, R, U, "ø", "\\o", !0), F(L, R, U, "Æ", "\\AE", !0), F(L, R, U, "Œ", "\\OE", !0), F(L, R, U, "Ø", "\\O", !0), F(L, R, jf, "ˊ", "\\'"), F(L, R, jf, "ˋ", "\\`"), F(L, R, jf, "ˆ", "\\^"), F(L, R, jf, "˜", "\\~"), F(L, R, jf, "ˉ", "\\="), F(L, R, jf, "˘", "\\u"), F(L, R, jf, "˙", "\\."), F(L, R, jf, "¸", "\\c"), F(L, R, jf, "˚", "\\r"), F(L, R, jf, "ˇ", "\\v"), F(L, R, jf, "¨", "\\\""), F(L, R, jf, "˝", "\\H"), F(L, R, jf, "◯", "\\textcircled");
var Rf = {
	"--": !0,
	"---": !0,
	"``": !0,
	"''": !0
};
F(L, R, U, "–", "--", !0), F(L, R, U, "–", "\\textendash"), F(L, R, U, "—", "---", !0), F(L, R, U, "—", "\\textemdash"), F(L, R, U, "‘", "`", !0), F(L, R, U, "‘", "\\textquoteleft"), F(L, R, U, "’", "'", !0), F(L, R, U, "’", "\\textquoteright"), F(L, R, U, "“", "``", !0), F(L, R, U, "“", "\\textquotedblleft"), F(L, R, U, "”", "''", !0), F(L, R, U, "”", "\\textquotedblright"), F(I, R, U, "°", "\\degree", !0), F(L, R, U, "°", "\\degree"), F(L, R, U, "°", "\\textdegree", !0), F(I, R, U, "£", "\\pounds"), F(I, R, U, "£", "\\mathsterling", !0), F(L, R, U, "£", "\\pounds"), F(L, R, U, "£", "\\textsterling", !0), F(I, z, U, "✠", "\\maltese"), F(L, z, U, "✠", "\\maltese");
for (var zf = "0123456789/@.\"", Bf = 0; Bf < zf.length; Bf++) {
	var Vf = zf.charAt(Bf);
	F(I, R, U, Vf, Vf);
}
for (var Hf = "0123456789!@*()-=+\";:?/.,", Uf = 0; Uf < Hf.length; Uf++) {
	var Wf = Hf.charAt(Uf);
	F(L, R, U, Wf, Wf);
}
for (var Gf = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz", Kf = 0; Kf < Gf.length; Kf++) {
	var qf = Gf.charAt(Kf);
	F(I, R, V, qf, qf), F(L, R, U, qf, qf);
}
F(I, z, U, "C", "ℂ"), F(L, z, U, "C", "ℂ"), F(I, z, U, "H", "ℍ"), F(L, z, U, "H", "ℍ"), F(I, z, U, "N", "ℕ"), F(L, z, U, "N", "ℕ"), F(I, z, U, "P", "ℙ"), F(L, z, U, "P", "ℙ"), F(I, z, U, "Q", "ℚ"), F(L, z, U, "Q", "ℚ"), F(I, z, U, "R", "ℝ"), F(L, z, U, "R", "ℝ"), F(I, z, U, "Z", "ℤ"), F(L, z, U, "Z", "ℤ"), F(I, R, V, "h", "ℎ"), F(L, R, V, "h", "ℎ");
for (var W, Jf = 0; Jf < Gf.length; Jf++) {
	var Yf = Gf.charAt(Jf);
	W = String.fromCharCode(55349, 56320 + Jf), F(I, R, V, Yf, W), F(L, R, U, Yf, W), W = String.fromCharCode(55349, 56372 + Jf), F(I, R, V, Yf, W), F(L, R, U, Yf, W), W = String.fromCharCode(55349, 56424 + Jf), F(I, R, V, Yf, W), F(L, R, U, Yf, W), W = String.fromCharCode(55349, 56580 + Jf), F(I, R, V, Yf, W), F(L, R, U, Yf, W), W = String.fromCharCode(55349, 56684 + Jf), F(I, R, V, Yf, W), F(L, R, U, Yf, W), W = String.fromCharCode(55349, 56736 + Jf), F(I, R, V, Yf, W), F(L, R, U, Yf, W), W = String.fromCharCode(55349, 56788 + Jf), F(I, R, V, Yf, W), F(L, R, U, Yf, W), W = String.fromCharCode(55349, 56840 + Jf), F(I, R, V, Yf, W), F(L, R, U, Yf, W), W = String.fromCharCode(55349, 56944 + Jf), F(I, R, V, Yf, W), F(L, R, U, Yf, W), Jf < 26 && (W = String.fromCharCode(55349, 56632 + Jf), F(I, R, V, Yf, W), F(L, R, U, Yf, W), W = String.fromCharCode(55349, 56476 + Jf), F(I, R, V, Yf, W), F(L, R, U, Yf, W));
}
W = String.fromCharCode(55349, 56668), F(I, R, V, "k", W), F(L, R, U, "k", W);
for (var Xf = 0; Xf < 10; Xf++) {
	var Zf = Xf.toString();
	W = String.fromCharCode(55349, 57294 + Xf), F(I, R, V, Zf, W), F(L, R, U, Zf, W), W = String.fromCharCode(55349, 57314 + Xf), F(I, R, V, Zf, W), F(L, R, U, Zf, W), W = String.fromCharCode(55349, 57324 + Xf), F(I, R, V, Zf, W), F(L, R, U, Zf, W), W = String.fromCharCode(55349, 57334 + Xf), F(I, R, V, Zf, W), F(L, R, U, Zf, W);
}
for (var Qf = "ÐÞþ", $f = 0; $f < Qf.length; $f++) {
	var ep = Qf.charAt($f);
	F(I, R, V, ep, ep), F(L, R, U, ep, ep);
}
var tp = {
	mathClass: "mathbf",
	textClass: "textbf",
	font: "Main-Bold"
}, np = {
	mathClass: "mathnormal",
	textClass: "textit",
	font: "Math-Italic"
}, rp = {
	mathClass: "boldsymbol",
	textClass: "boldsymbol",
	font: "Main-BoldItalic"
}, ip = {
	mathClass: "mathscr",
	textClass: "textscr",
	font: "Script-Regular"
}, ap = {
	mathClass: "",
	textClass: "",
	font: ""
}, op = {
	mathClass: "mathfrak",
	textClass: "textfrak",
	font: "Fraktur-Regular"
}, sp = {
	mathClass: "mathbb",
	textClass: "textbb",
	font: "AMS-Regular"
}, cp = {
	mathClass: "mathboldfrak",
	textClass: "textboldfrak",
	font: "Fraktur-Regular"
}, lp = {
	mathClass: "mathsf",
	textClass: "textsf",
	font: "SansSerif-Regular"
}, up = {
	mathClass: "mathboldsf",
	textClass: "textboldsf",
	font: "SansSerif-Bold"
}, dp = {
	mathClass: "mathitsf",
	textClass: "textitsf",
	font: "SansSerif-Italic"
}, fp = {
	mathClass: "mathtt",
	textClass: "texttt",
	font: "Typewriter-Regular"
}, pp = [
	tp,
	tp,
	np,
	np,
	rp,
	rp,
	ip,
	ap,
	ap,
	ap,
	op,
	op,
	sp,
	sp,
	cp,
	cp,
	lp,
	lp,
	up,
	up,
	dp,
	dp,
	ap,
	ap,
	fp,
	fp
], mp = [
	tp,
	ap,
	lp,
	up,
	fp
], hp = (e) => {
	var t = e.charCodeAt(0), n = e.charCodeAt(1), r = (t - 55296) * 1024 + (n - 56320) + 65536;
	if (119808 <= r && r < 120484) return pp[Math.floor((r - 119808) / 26)];
	if (120782 <= r && r <= 120831) return mp[Math.floor((r - 120782) / 10)];
	if (r === 120485 || r === 120486) return pp[0];
	if (120486 < r && r < 120782) return ap;
	throw new M("Unsupported character: " + e);
}, gp = function(e, t, n) {
	if (Af[n][e]) {
		var r = Af[n][e].replace;
		r && (e = r);
	}
	return {
		value: e,
		metrics: Df(e, t, n)
	};
}, _p = function(e, t, n, r, i) {
	var a = gp(e, t, n), o = a.metrics;
	e = a.value;
	var s;
	if (o) {
		var c = o.italic;
		(n === "text" || r && r.font === "mathit") && (c = 0), s = new gf(e, o.height, o.depth, c, o.skew, o.width, i);
	} else typeof console < "u" && console.warn("No character metrics " + ("for '" + e + "' in style '" + t + "' and mode '" + n + "'")), s = new gf(e, 0, 0, 0, 0, 0, i);
	if (r) {
		s.maxFontSize = r.sizeMultiplier, r.style.isTight() && s.classes.push("mtight");
		var l = r.getColor();
		l && (s.style.color = l);
	}
	return s;
}, vp = function(e, t, n, r) {
	return r === void 0 && (r = []), n.font === "boldsymbol" && gp(e, "Main-Bold", t).metrics ? _p(e, "Main-Bold", t, n, r.concat(["mathbf"])) : e === "\\" || Af[t][e].font === "main" ? _p(e, "Main-Regular", t, n, r) : _p(e, "AMS-Regular", t, n, r.concat(["amsrm"]));
}, yp = function(e, t, n) {
	return n !== "textord" && gp(e, "Math-BoldItalic", t).metrics ? {
		fontName: "Math-BoldItalic",
		fontClass: "boldsymbol"
	} : {
		fontName: "Main-Bold",
		fontClass: "mathbf"
	};
}, bp = function(e, t) {
	var n = e.type === "mathord" ? "mathord" : "textord", r = e.mode, i = e.text, a = ["mord"], { font: o, fontFamily: s, fontWeight: c, fontShape: l } = t, u = r === "math" || r === "text" && !!o, d = u ? o : s, f = "", p = "";
	if (i.charCodeAt(0) === 55349) {
		var m = hp(i);
		f = m.font, p = m[r + "Class"];
	}
	if (f) return _p(i, f, r, t, a.concat(p));
	if (d) {
		var h, g;
		if (d === "boldsymbol") {
			var _ = yp(i, r, n);
			h = _.fontName, g = [_.fontClass];
		} else u ? (h = Mp[o].fontName, g = [o]) : (h = jp(s, c, l), g = [
			s,
			c,
			l
		]);
		if (gp(i, h, r).metrics) return _p(i, h, r, t, a.concat(g));
		if (Rf.hasOwnProperty(i) && h.slice(0, 10) === "Typewriter") {
			for (var v = [], y = 0; y < i.length; y++) v.push(_p(i[y], h, r, t, a.concat(g)));
			return Dp(v);
		}
	}
	if (n === "mathord") return _p(i, "Math-Italic", r, t, a.concat(["mathnormal"]));
	if (n === "textord") {
		var b = Af[r][i] && Af[r][i].font;
		if (b === "ams") return _p(i, jp("amsrm", c, l), r, t, a.concat("amsrm", c, l));
		if (b === "main" || !b) return _p(i, jp("textrm", c, l), r, t, a.concat(c, l));
		var x = jp(b, c, l);
		return _p(i, x, r, t, a.concat(x, c, l));
	} else throw Error("unexpected type: " + n + " in makeOrd");
}, xp = (e, t) => {
	if (of(e.classes) !== of(t.classes) || e.skew !== t.skew || e.maxFontSize !== t.maxFontSize || e.italic !== 0 && e.hasClass("mathnormal")) return !1;
	if (e.classes.length === 1) {
		var n = e.classes[0];
		if (n === "mbin" || n === "mord") return !1;
	}
	for (var r of Object.keys(e.style)) if (e.style[r] !== t.style[r]) return !1;
	for (var i of Object.keys(t.style)) if (e.style[i] !== t.style[i]) return !1;
	return !0;
}, Sp = (e) => {
	for (var t = 0; t < e.length - 1; t++) {
		var n = e[t], r = e[t + 1];
		n instanceof gf && r instanceof gf && xp(n, r) && (n.text += r.text, n.height = Math.max(n.height, r.height), n.depth = Math.max(n.depth, r.depth), n.italic = r.italic, e.splice(t + 1, 1), t--);
	}
	return e;
}, Cp = function(e) {
	for (var t = 0, n = 0, r = 0, i = 0; i < e.children.length; i++) {
		var a = e.children[i];
		a.height > t && (t = a.height), a.depth > n && (n = a.depth), a.maxFontSize > r && (r = a.maxFontSize);
	}
	e.height = t, e.depth = n, e.maxFontSize = r;
}, G = function(e, t, n, r) {
	var i = new ff(e, t, n, r);
	return Cp(i), i;
}, wp = (e, t, n, r) => new ff(e, t, n, r), Tp = function(e, t, n) {
	var r = G([e], [], t);
	return r.height = Math.max(n || t.fontMetrics().defaultRuleThickness, t.minRuleThickness), r.style.borderBottomWidth = P(r.height), r.maxFontSize = 1, r;
}, Ep = function(e, t, n, r) {
	var i = new pf(e, t, n, r);
	return Cp(i), i;
}, Dp = function(e) {
	var t = new ef(e);
	return Cp(t), t;
}, Op = function(e, t) {
	return e instanceof ef ? G([], [e], t) : e;
}, kp = function(e) {
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
}, K = function(e, t) {
	for (var { children: n, depth: r } = kp(e), i = 0, a = 0; a < n.length; a++) {
		var o = n[a];
		if (o.type === "elem") {
			var s = o.elem;
			i = Math.max(i, s.maxFontSize, s.height);
		}
	}
	i += 2;
	var c = G(["pstrut"], []);
	c.style.height = P(i);
	for (var l = [], u = r, d = r, f = r, p = 0; p < n.length; p++) {
		var m = n[p];
		if (m.type === "kern") f += m.size;
		else {
			var h = m.elem, g = m.wrapperClasses || [], _ = m.wrapperStyle || {}, v = G(g, [c, h], void 0, _);
			v.style.top = P(-i - f - h.depth), m.marginLeft && (v.style.marginLeft = m.marginLeft), m.marginRight && (v.style.marginRight = m.marginRight), l.push(v), f += h.height + h.depth;
		}
		u = Math.min(u, f), d = Math.max(d, f);
	}
	var y = G(["vlist"], l);
	y.style.height = P(d);
	var b;
	if (u < 0) {
		var x = G(["vlist"], [G([], [])]);
		x.style.height = P(-u), b = [G(["vlist-r"], [y, G(["vlist-s"], [new gf("​")])]), G(["vlist-r"], [x])];
	} else b = [G(["vlist-r"], [y])];
	var S = G(["vlist-t"], b);
	return b.length === 2 && S.classes.push("vlist-t2"), S.height = d, S.depth = -u, S;
}, Ap = (e, t) => {
	var n = G(["mspace"], [], t), r = af(e, t);
	return n.style.marginRight = P(r), n;
}, jp = (e, t, n) => {
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
}, Mp = {
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
}, Np = {
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
}, Pp = function(e, t) {
	var [n, r, i] = Np[e], a = wp(["overlay"], [new _f([new vf(n)], {
		width: P(r),
		height: P(i),
		style: "width:" + P(r),
		viewBox: "0 0 " + 1e3 * r + " " + 1e3 * i,
		preserveAspectRatio: "xMinYMin"
	})], t);
	return a.height = i, a.style.height = P(i), a.style.width = P(r), a;
}, Fp = {
	number: 3,
	unit: "mu"
}, Ip = {
	number: 4,
	unit: "mu"
}, Lp = {
	number: 5,
	unit: "mu"
}, Rp = {
	mord: {
		mop: Fp,
		mbin: Ip,
		mrel: Lp,
		minner: Fp
	},
	mop: {
		mord: Fp,
		mop: Fp,
		mrel: Lp,
		minner: Fp
	},
	mbin: {
		mord: Ip,
		mop: Ip,
		mopen: Ip,
		minner: Ip
	},
	mrel: {
		mord: Lp,
		mop: Lp,
		mopen: Lp,
		minner: Lp
	},
	mopen: {},
	mclose: {
		mop: Fp,
		mbin: Ip,
		mrel: Lp,
		minner: Fp
	},
	mpunct: {
		mord: Fp,
		mop: Fp,
		mrel: Lp,
		mopen: Fp,
		mclose: Fp,
		mpunct: Fp,
		minner: Fp
	},
	minner: {
		mord: Fp,
		mop: Fp,
		mbin: Ip,
		mrel: Lp,
		mopen: Fp,
		mpunct: Fp,
		minner: Fp
	}
}, zp = {
	mord: { mop: Fp },
	mop: {
		mord: Fp,
		mop: Fp
	},
	mbin: {},
	mrel: {},
	mopen: {},
	mclose: { mop: Fp },
	mpunct: {},
	minner: { mop: Fp }
}, Bp = {}, Vp = {}, Hp = {};
function q(e) {
	for (var { type: t, names: n, htmlBuilder: r, mathmlBuilder: i } = e, a = 0; a < n.length; ++a) Bp[n[a]] = e;
	t && (r && (Vp[t] = r), i && (Hp[t] = i));
}
function Up(e) {
	var { type: t, htmlBuilder: n, mathmlBuilder: r } = e;
	n && (Vp[t] = n), r && (Hp[t] = r);
}
var Wp = function(e) {
	return e.type === "ordgroup" && e.body.length === 1 ? e.body[0] : e;
}, Gp = function(e) {
	return e.type === "ordgroup" ? e.body : [e];
}, Kp = new Set([
	"leftmost",
	"mbin",
	"mopen",
	"mrel",
	"mop",
	"mpunct"
]), qp = new Set([
	"rightmost",
	"mrel",
	"mclose",
	"mpunct"
]), Jp = {
	display: N.DISPLAY,
	text: N.TEXT,
	script: N.SCRIPT,
	scriptscript: N.SCRIPTSCRIPT
}, Yp = {
	mord: "mord",
	mop: "mop",
	mbin: "mbin",
	mrel: "mrel",
	mopen: "mopen",
	mclose: "mclose",
	mpunct: "mpunct",
	minner: "minner"
}, Xp = function(e, t, n, r) {
	r === void 0 && (r = [null, null]);
	for (var i = [], a = 0; a < e.length; a++) {
		var o = J(e[a], t);
		if (o instanceof ef) {
			var s = o.children;
			i.push(...s);
		} else i.push(o);
	}
	if (Sp(i), !n) return i;
	var c = t;
	if (e.length === 1) {
		var l = e[0];
		l.type === "sizing" ? c = t.havingSize(l.size) : l.type === "styling" && (c = t.havingStyle(Jp[l.style]));
	}
	var u = G([r[0] || "leftmost"], [], t), d = G([r[1] || "rightmost"], [], t), f = n === "root";
	return Zp(i, (e, t) => {
		var n = t.classes[0], r = e.classes[0];
		n === "mbin" && qp.has(r) ? t.classes[0] = "mord" : r === "mbin" && Kp.has(n) && (e.classes[0] = "mord");
	}, { node: u }, d, f), Zp(i, (e, t) => {
		var n = em(t), r = em(e), i = n && r ? e.hasClass("mtight") ? zp[n]?.[r] : Rp[n]?.[r] : null;
		if (i) return Ap(i, c);
	}, { node: u }, d, f), i;
}, Zp = function(e, t, n, r, i) {
	r && e.push(r);
	for (var a = 0; a < e.length; a++) {
		var o = e[a], s = Qp(o);
		if (s) {
			Zp(s.children, t, n, null, i);
			continue;
		}
		var c = !o.hasClass("mspace");
		if (c) {
			var l = t(o, n.node);
			l && (n.insertAfter ? n.insertAfter(l) : (e.unshift(l), a++));
		}
		c ? n.node = o : i && o.hasClass("newline") && (n.node = G(["leftmost"])), n.insertAfter = ((t) => (n) => {
			e.splice(t + 1, 0, n), a++;
		})(a);
	}
	r && e.pop();
}, Qp = function(e) {
	return e instanceof ef || e instanceof pf || e instanceof ff && e.hasClass("enclosing") ? e : null;
}, $p = function(e, t) {
	var n = Qp(e);
	if (n) {
		var r = n.children;
		if (r.length) {
			if (t === "right") return $p(r[r.length - 1], "right");
			if (t === "left") return $p(r[0], "left");
		}
	}
	return e;
}, em = function(e, t) {
	return e ? (t && (e = $p(e, t)), Yp[e.classes[0]] || null) : null;
}, tm = function(e, t) {
	var n = ["nulldelimiter"].concat(e.baseSizingClasses());
	return G(t.concat(n));
}, J = function(e, t, n) {
	if (!e) return G();
	if (Vp[e.type]) {
		var r = Vp[e.type](e, t);
		if (n && t.size !== n.size) {
			r = G(t.sizingClasses(n), [r], t);
			var i = t.sizeMultiplier / n.sizeMultiplier;
			r.height *= i, r.depth *= i;
		}
		return r;
	} else throw new M("Got group of unknown type: '" + e.type + "'");
};
function nm(e, t) {
	var n = G(["base"], e, t), r = G(["strut"]);
	return r.style.height = P(n.height + n.depth), n.depth && (r.style.verticalAlign = P(-n.depth)), n.children.unshift(r), n;
}
function rm(e, t) {
	var n = null;
	e.length === 1 && e[0].type === "tag" && (n = e[0].tag, e = e[0].body);
	var r = Xp(e, t, "root"), i;
	r.length === 2 && r[1].hasClass("tag") && (i = r.pop());
	for (var a = [], o = [], s = 0; s < r.length; s++) if (o.push(r[s]), r[s].hasClass("mbin") || r[s].hasClass("mrel") || r[s].hasClass("allowbreak")) {
		for (var c = !1; s < r.length - 1 && r[s + 1].hasClass("mspace") && !r[s + 1].hasClass("newline");) s++, o.push(r[s]), r[s].hasClass("nobreak") && (c = !0);
		c || (a.push(nm(o, t)), o = []);
	} else r[s].hasClass("newline") && (o.pop(), o.length > 0 && (a.push(nm(o, t)), o = []), a.push(r[s]));
	o.length > 0 && a.push(nm(o, t));
	var l;
	n ? (l = nm(Xp(n, t, !0), t), l.classes = ["tag"], a.push(l)) : i && a.push(i);
	var u = G(["katex-html"], a);
	if (u.setAttribute("aria-hidden", "true"), l) {
		var d = l.children[0];
		d.style.height = P(u.height + u.depth), u.depth && (d.style.verticalAlign = P(-u.depth));
	}
	return u;
}
function im(e) {
	return new ef(e);
}
var Y = class {
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
		this.classes.length > 0 && (e.className = of(this.classes));
		for (var n = 0; n < this.children.length; n++) if (this.children[n] instanceof am && this.children[n + 1] instanceof am) {
			for (var r = this.children[n].toText() + this.children[++n].toText(); this.children[n + 1] instanceof am;) r += this.children[++n].toText();
			e.appendChild(new am(r).toNode());
		} else e.appendChild(this.children[n].toNode());
		return e;
	}
	toMarkup() {
		var e = "<" + this.type;
		for (var t in this.attributes) Object.prototype.hasOwnProperty.call(this.attributes, t) && (e += " " + t + "=\"", e += ud(this.attributes[t]), e += "\"");
		this.classes.length > 0 && (e += " class =\"" + ud(of(this.classes)) + "\""), e += ">";
		for (var n = 0; n < this.children.length; n++) e += this.children[n].toMarkup();
		return e += "</" + this.type + ">", e;
	}
	toText() {
		return this.children.map((e) => e.toText()).join("");
	}
}, am = class {
	constructor(e) {
		this.text = void 0, this.text = e;
	}
	toNode() {
		return document.createTextNode(this.text);
	}
	toMarkup() {
		return ud(this.toText());
	}
	toText() {
		return this.text;
	}
}, om = class {
	constructor(e) {
		this.width = void 0, this.character = void 0, this.width = e, e >= .05555 && e <= .05556 ? this.character = " " : e >= .1666 && e <= .1667 ? this.character = " " : e >= .2222 && e <= .2223 ? this.character = " " : e >= .2777 && e <= .2778 ? this.character = "  " : e >= -.05556 && e <= -.05555 ? this.character = " ⁣" : e >= -.1667 && e <= -.1666 ? this.character = " ⁣" : e >= -.2223 && e <= -.2222 ? this.character = " ⁣" : e >= -.2778 && e <= -.2777 ? this.character = " ⁣" : this.character = null;
	}
	toNode() {
		if (this.character) return document.createTextNode(this.character);
		var e = document.createElementNS("http://www.w3.org/1998/Math/MathML", "mspace");
		return e.setAttribute("width", P(this.width)), e;
	}
	toMarkup() {
		return this.character ? "<mtext>" + this.character + "</mtext>" : "<mspace width=\"" + P(this.width) + "\"/>";
	}
	toText() {
		return this.character ? this.character : " ";
	}
}, sm = new Set(["\\imath", "\\jmath"]), cm = new Set(["mrow", "mtable"]), lm = function(e, t, n) {
	return Af[t][e] && Af[t][e].replace && e.charCodeAt(0) !== 55349 && !(Rf.hasOwnProperty(e) && n && (n.fontFamily && n.fontFamily.slice(4, 6) === "tt" || n.font && n.font.slice(4, 6) === "tt")) && (e = Af[t][e].replace), new am(e);
}, um = function(e) {
	return e.length === 1 ? e[0] : new Y("mrow", e);
}, dm = {
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
}, fm = (e, t) => {
	if (e.mode === "text") {
		if (t.fontFamily === "texttt") return "monospace";
		if (t.fontFamily === "textsf") return t.fontShape === "textit" && t.fontWeight === "textbf" ? "sans-serif-bold-italic" : t.fontShape === "textit" ? "sans-serif-italic" : t.fontWeight === "textbf" ? "bold-sans-serif" : "sans-serif";
		if (t.fontShape === "textit" && t.fontWeight === "textbf") return "bold-italic";
		if (t.fontShape === "textit") return "italic";
		if (t.fontWeight === "textbf") return "bold";
	}
	var n = t.font;
	if (!n || n === "mathnormal") return null;
	var r = e.mode, i = dm[n];
	if (i) return typeof i == "function" ? i(e) : i;
	var a = e.text;
	if (sm.has(a)) return null;
	if (Af[r][a]) {
		var o = Af[r][a].replace;
		o && (a = o);
	}
	var s = Mp[n].fontName;
	return Df(a, s, r) ? Mp[n].variant : null;
};
function pm(e) {
	if (!e) return !1;
	if (e.type === "mi" && e.children.length === 1) {
		var t = e.children[0];
		return t instanceof am && t.text === ".";
	} else if (e.type === "mo" && e.children.length === 1 && e.getAttribute("separator") === "true" && e.getAttribute("lspace") === "0em" && e.getAttribute("rspace") === "0em") {
		var n = e.children[0];
		return n instanceof am && n.text === ",";
	} else return !1;
}
var mm = function(e, t, n) {
	if (e.length === 1) {
		var r = X(e[0], t);
		return n && r instanceof Y && r.type === "mo" && (r.setAttribute("lspace", "0em"), r.setAttribute("rspace", "0em")), [r];
	}
	for (var i = [], a, o = 0; o < e.length; o++) {
		var s = X(e[o], t);
		if (s instanceof Y && a instanceof Y) {
			if (s.type === "mtext" && a.type === "mtext" && s.getAttribute("mathvariant") === a.getAttribute("mathvariant")) {
				a.children.push(...s.children);
				continue;
			} else if (s.type === "mn" && a.type === "mn") {
				a.children.push(...s.children);
				continue;
			} else if (pm(s) && a.type === "mn") {
				a.children.push(...s.children);
				continue;
			} else if (s.type === "mn" && pm(a)) s.children = [...a.children, ...s.children], i.pop();
			else if ((s.type === "msup" || s.type === "msub") && s.children.length >= 1 && (a.type === "mn" || pm(a))) {
				var c = s.children[0];
				c instanceof Y && c.type === "mn" && (c.children = [...a.children, ...c.children], i.pop());
			} else if (a.type === "mi" && a.children.length === 1) {
				var l = a.children[0];
				if (l instanceof am && l.text === "̸" && (s.type === "mo" || s.type === "mi" || s.type === "mn")) {
					var u = s.children[0];
					u instanceof am && u.text.length > 0 && (u.text = u.text.slice(0, 1) + "̸" + u.text.slice(1), i.pop());
				}
			}
		}
		i.push(s), a = s;
	}
	return i;
}, hm = function(e, t, n) {
	return um(mm(e, t, n));
}, X = function(e, t) {
	if (!e) return new Y("mrow");
	if (Hp[e.type]) return Hp[e.type](e, t);
	throw new M("Got group of unknown type: '" + e.type + "'");
};
function gm(e, t, n, r, i) {
	var a = mm(e, n), o = a.length === 1 && a[0] instanceof Y && cm.has(a[0].type) ? a[0] : new Y("mrow", a), s = new Y("annotation", [new am(t)]);
	s.setAttribute("encoding", "application/x-tex");
	var c = new Y("math", [new Y("semantics", [o, s])]);
	return c.setAttribute("xmlns", "http://www.w3.org/1998/Math/MathML"), r && c.setAttribute("display", "block"), G([i ? "katex" : "katex-mathml"], [c]);
}
var _m = [
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
], vm = [
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
], ym = function(e, t) {
	return t.size < 2 ? e : _m[e - 1][t.size - 1];
}, bm = class e {
	constructor(t) {
		this.style = void 0, this.color = void 0, this.size = void 0, this.textSize = void 0, this.phantom = void 0, this.font = void 0, this.fontFamily = void 0, this.fontWeight = void 0, this.fontShape = void 0, this.sizeMultiplier = void 0, this.maxSize = void 0, this.minRuleThickness = void 0, this._fontMetrics = void 0, this.style = t.style, this.color = t.color, this.size = t.size || e.BASESIZE, this.textSize = t.textSize || this.size, this.phantom = !!t.phantom, this.font = t.font || "", this.fontFamily = t.fontFamily || "", this.fontWeight = t.fontWeight || "", this.fontShape = t.fontShape || "", this.sizeMultiplier = vm[this.size - 1], this.maxSize = t.maxSize, this.minRuleThickness = t.minRuleThickness, this._fontMetrics = void 0;
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
			size: ym(this.textSize, e)
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
			sizeMultiplier: vm[e - 1]
		});
	}
	havingBaseStyle(t) {
		t ||= this.style.text();
		var n = ym(e.BASESIZE, t);
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
		return this._fontMetrics ||= kf(this.size), this._fontMetrics;
	}
	getColor() {
		return this.phantom ? "transparent" : this.color;
	}
};
bm.BASESIZE = 6;
var xm = function(e) {
	return new bm({
		style: e.displayMode ? N.DISPLAY : N.TEXT,
		maxSize: e.maxSize,
		minRuleThickness: e.minRuleThickness
	});
}, Sm = function(e, t) {
	if (t.displayMode) {
		var n = ["katex-display"];
		t.leqno && n.push("leqno"), t.fleqn && n.push("fleqn"), e = G(n, [e]);
	}
	return e;
}, Cm = function(e, t, n) {
	var r = xm(n), i;
	return n.output === "mathml" ? gm(e, t, r, n.displayMode, !0) : (i = n.output === "html" ? G(["katex"], [rm(e, r)]) : G(["katex"], [gm(e, t, r, n.displayMode, !1), rm(e, r)]), Sm(i, n));
}, wm = function(e, t, n) {
	return Sm(G(["katex"], [rm(e, xm(n))]), n);
}, Tm = {
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
}, Em = function(e) {
	var t = new Y("mo", [new am(Tm[e.replace(/^\\/, "")])]);
	return t.setAttribute("stretchy", "true"), t;
}, Dm = {
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
}, Om = new Set([
	"widehat",
	"widecheck",
	"widetilde",
	"utilde"
]), km = function(e, t) {
	function n() {
		var n = 4e5, r = e.label.slice(1);
		if (Om.has(r) && "base" in e) {
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
				span: wp([], [new _f([new vf(o)], {
					width: "100%",
					height: P(s),
					viewBox: "0 0 " + n + " " + a,
					preserveAspectRatio: "none"
				})], t),
				minWidth: 0,
				height: s
			};
		} else {
			var l = [], u = Dm[r];
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
				var y = new _f([new vf(d[v])], {
					width: "400em",
					height: P(m),
					viewBox: "0 0 " + n + " " + p,
					preserveAspectRatio: _[v] + " slice"
				}), b = wp([g[v]], [y], t);
				if (h === 1) return {
					span: b,
					minWidth: f,
					height: m
				};
				b.style.height = P(m), l.push(b);
			}
			return {
				span: G(["stretchy"], l, t),
				minWidth: f,
				height: m
			};
		}
	}
	var { span: r, minWidth: i, height: a } = n();
	return r.height = a, r.style.height = P(a), i > 0 && (r.style.minWidth = P(i)), r;
}, Am = function(e, t, n, r, i) {
	var a, o = e.height + e.depth + n + r;
	if (/fbox|color|angl/.test(t)) {
		if (a = G(["stretchy", t], [], i), t === "fbox") {
			var s = i.color && i.getColor();
			s && (a.style.borderColor = s);
		}
	} else {
		var c = [];
		/^[bx]cancel$/.test(t) && c.push(new yf({
			x1: "0",
			y1: "0",
			x2: "100%",
			y2: "100%",
			"stroke-width": "0.046em"
		})), /^x?cancel$/.test(t) && c.push(new yf({
			x1: "0",
			y1: "100%",
			x2: "100%",
			y2: "0",
			"stroke-width": "0.046em"
		})), a = wp([], [new _f(c, {
			width: "100%",
			height: P(o)
		})], i);
	}
	return a.height = o, a.style.height = P(o), a;
}, jm = {
	bin: 1,
	close: 1,
	inner: 1,
	open: 1,
	punct: 1,
	rel: 1
}, Mm = {
	"accent-token": 1,
	mathord: 1,
	"op-token": 1,
	spacing: 1,
	textord: 1
};
function Nm(e) {
	return e in jm;
}
function Z(e, t) {
	if (!e || e.type !== t) throw Error("Expected node of type " + t + ", but got " + (e ? "node of type " + e.type : String(e)));
	return e;
}
function Pm(e) {
	var t = Fm(e);
	if (!t) throw Error("Expected node of symbol group type, but got " + (e ? "node of type " + e.type : String(e)));
	return t;
}
function Fm(e) {
	return e && (e.type === "atom" || Mm.hasOwnProperty(e.type)) ? e : null;
}
var Im = (e) => {
	if (e instanceof gf) return e;
	if (Sf(e) && e.children.length === 1) return Im(e.children[0]);
}, Lm = (e, t) => {
	var n, r, i;
	e && e.type === "supsub" ? (r = Z(e.base, "accent"), n = r.base, e.base = n, i = xf(J(e, t)), e.base = r) : (r = Z(e, "accent"), n = r.base);
	var a = J(n, t.havingCrampedStyle()), o = r.isShifty && pd(n), s = 0;
	o && (s = Im(a)?.skew ?? 0);
	var c = r.label === "\\c", l = c ? a.height + a.depth : Math.min(a.height, t.fontMetrics().xHeight), u;
	if (r.isStretchy) u = km(r, t), u = K({
		positionType: "firstBaseline",
		children: [{
			type: "elem",
			elem: a
		}, {
			type: "elem",
			elem: u,
			wrapperClasses: ["svg-align"],
			wrapperStyle: s > 0 ? {
				width: "calc(100% - " + P(2 * s) + ")",
				marginLeft: P(2 * s)
			} : void 0
		}]
	});
	else {
		var d, f;
		r.label === "\\vec" ? (d = Pp("vec", t), f = Np.vec[1]) : (d = bp({
			type: "textord",
			mode: r.mode,
			text: r.label
		}, t), d = bf(d), d.italic = 0, f = d.width, c && (l += d.depth)), u = G(["accent-body"], [d]);
		var p = r.label === "\\textcircled";
		p && (u.classes.push("accent-full"), l = a.height);
		var m = s;
		p || (m -= f / 2), u.style.left = P(m), r.label === "\\textcircled" && (u.style.top = ".2em"), u = K({
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
	var h = G(["mord", "accent"], [u], t);
	return i ? (i.children[0] = h, i.height = Math.max(h.height, i.height), i.classes[0] = "mord", i) : h;
}, Rm = (e, t) => {
	var n = e.isStretchy ? Em(e.label) : new Y("mo", [lm(e.label, e.mode)]), r = new Y("mover", [X(e.base, t), n]);
	return r.setAttribute("accent", "true"), r;
}, zm = new RegExp([
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
q({
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
		var n = Wp(t[0]), r = !zm.test(e.funcName), i = !r || e.funcName === "\\widehat" || e.funcName === "\\widetilde" || e.funcName === "\\widecheck";
		return {
			type: "accent",
			mode: e.parser.mode,
			label: e.funcName,
			isStretchy: r,
			isShifty: i,
			base: n
		};
	},
	htmlBuilder: Lm,
	mathmlBuilder: Rm
}), q({
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
}), q({
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
		var n = J(e.base, t), r = km(e, t), i = e.label === "\\utilde" ? .12 : 0;
		return G(["mord", "accentunder"], [K({
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
		var n = Em(e.label), r = new Y("munder", [X(e.base, t), n]);
		return r.setAttribute("accentunder", "true"), r;
	}
});
var Bm = (e) => {
	var t = new Y("mpadded", e ? [e] : []);
	return t.setAttribute("width", "+0.6em"), t.setAttribute("lspace", "0.3em"), t;
};
q({
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
		var n = t.style, r = t.havingStyle(n.sup()), i = Op(J(e.body, r, t), t), a = e.label.slice(0, 2) === "\\x" ? "x" : "cd";
		i.classes.push(a + "-arrow-pad");
		var o;
		e.below && (r = t.havingStyle(n.sub()), o = Op(J(e.below, r, t), t), o.classes.push(a + "-arrow-pad"));
		var s = km(e, t), c = -t.fontMetrics().axisHeight + .5 * s.height, l = -t.fontMetrics().axisHeight - .5 * s.height - .111;
		(i.depth > .25 || e.label === "\\xleftequilibrium") && (l -= i.depth);
		var u;
		if (o) {
			var d = -t.fontMetrics().axisHeight + o.height + .5 * s.height + .111;
			u = K({
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
		} else u = K({
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
		return G(["mrel", "x-arrow"], [u], t);
	},
	mathmlBuilder(e, t) {
		var n = Em(e.label);
		n.setAttribute("minsize", e.label.charAt(0) === "x" ? "1.75em" : "3.0em");
		var r;
		if (e.body) {
			var i = Bm(X(e.body, t));
			r = e.below ? new Y("munderover", [
				n,
				Bm(X(e.below, t)),
				i
			]) : new Y("mover", [n, i]);
		} else e.below ? r = new Y("munder", [n, Bm(X(e.below, t))]) : (r = Bm(), r = new Y("mover", [n, r]));
		return r;
	}
});
function Vm(e, t) {
	var n = Xp(e.body, t, !0);
	return G([e.mclass], n, t);
}
function Hm(e, t) {
	var n, r = mm(e.body, t);
	return e.mclass === "minner" ? n = new Y("mpadded", r) : e.mclass === "mord" ? e.isCharacterBox ? (n = r[0], n.type = "mi") : n = new Y("mi", r) : (e.isCharacterBox ? (n = r[0], n.type = "mo") : n = new Y("mo", r), e.mclass === "mbin" ? (n.attributes.lspace = "0.22em", n.attributes.rspace = "0.22em") : e.mclass === "mpunct" ? (n.attributes.lspace = "0em", n.attributes.rspace = "0.17em") : (e.mclass === "mopen" || e.mclass === "mclose") && (n.attributes.lspace = "0em", n.attributes.rspace = "0em")), n;
}
q({
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
			body: Gp(i),
			isCharacterBox: pd(i)
		};
	},
	htmlBuilder: Vm,
	mathmlBuilder: Hm
});
var Um = (e) => {
	var t = e.type === "ordgroup" && e.body.length ? e.body[0] : e;
	return t.type === "atom" && (t.family === "bin" || t.family === "rel") ? "m" + t.family : "mord";
};
q({
	type: "mclass",
	names: ["\\@binrel"],
	numArgs: 2,
	handler(e, t) {
		var { parser: n } = e;
		return {
			type: "mclass",
			mode: n.mode,
			mclass: Um(t[0]),
			body: Gp(t[1]),
			isCharacterBox: pd(t[1])
		};
	}
}), q({
	type: "mclass",
	names: [
		"\\stackrel",
		"\\overset",
		"\\underset"
	],
	numArgs: 2,
	handler(e, t) {
		var { parser: n, funcName: r } = e, i = t[1], a = t[0], o = r === "\\stackrel" ? "mrel" : Um(i), s = {
			type: "op",
			mode: i.mode,
			limits: !0,
			alwaysHandleSupSub: !0,
			parentIsSupSub: !1,
			symbol: !1,
			suppressBaseShift: r !== "\\stackrel",
			body: Gp(i)
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
			isCharacterBox: pd(c)
		};
	}
}), q({
	type: "pmb",
	names: ["\\pmb"],
	numArgs: 1,
	allowedInText: !0,
	handler(e, t) {
		var { parser: n } = e;
		return {
			type: "pmb",
			mode: n.mode,
			mclass: Um(t[0]),
			body: Gp(t[0])
		};
	},
	htmlBuilder(e, t) {
		var n = Xp(e.body, t, !0), r = G([e.mclass], n, t);
		return r.style.textShadow = "0.02em 0.01em 0.04px", r;
	},
	mathmlBuilder(e, t) {
		var n = new Y("mstyle", mm(e.body, t));
		return n.setAttribute("style", "text-shadow: 0.02em 0.01em 0.04px"), n;
	}
});
var Wm = {
	">": "\\\\cdrightarrow",
	"<": "\\\\cdleftarrow",
	"=": "\\\\cdlongequal",
	A: "\\uparrow",
	V: "\\downarrow",
	"|": "\\Vert",
	".": "no arrow"
}, Gm = () => ({
	type: "styling",
	body: [],
	mode: "math",
	style: "display",
	resetFont: !0
}), Km = (e) => e.type === "textord" && e.text === "@", qm = (e, t) => (e.type === "mathord" || e.type === "atom") && e.text === t;
function Jm(e, t, n) {
	var r = Wm[e];
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
function Ym(e) {
	var t = [];
	for (e.gullet.beginGroup(), e.gullet.macros.set("\\cr", "\\\\\\relax"), e.gullet.beginGroup();;) {
		t.push(e.parseExpression(!1, "\\\\")), e.gullet.endGroup(), e.gullet.beginGroup();
		var n = e.fetch().text;
		if (n === "&" || n === "\\\\") e.consume();
		else if (n === "\\end") {
			t[t.length - 1].length === 0 && t.pop();
			break;
		} else throw new M("Expected \\\\ or \\cr or \\end", e.nextToken);
	}
	for (var r = [], i = [r], a = 0; a < t.length; a++) {
		for (var o = t[a], s = Gm(), c = 0; c < o.length; c++) if (!Km(o[c])) s.body.push(o[c]);
		else {
			r.push(s), c += 1;
			var l = Pm(o[c]).text, u = [, ,];
			if (u[0] = {
				type: "ordgroup",
				mode: "math",
				body: []
			}, u[1] = {
				type: "ordgroup",
				mode: "math",
				body: []
			}, !"=|.".includes(l)) if ("<>AV".includes(l)) for (var d = 0; d < 2; d++) {
				for (var f = !0, p = c + 1; p < o.length; p++) {
					if (qm(o[p], l)) {
						f = !1, c = p;
						break;
					}
					if (Km(o[p])) throw new M("Missing a " + l + " character to complete a CD arrow.", o[p]);
					u[d].body.push(o[p]);
				}
				if (f) throw new M("Missing a " + l + " character to complete a CD arrow.", o[c]);
			}
			else throw new M("Expected one of \"<>AV=|.\" after @", o[c]);
			var m = {
				type: "styling",
				body: [Jm(l, u, e)],
				mode: "math",
				style: "display",
				resetFont: !0
			};
			r.push(m), s = Gm();
		}
		a % 2 == 0 ? r.push(s) : r.shift(), r = [], i.push(r);
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
q({
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
		var n = t.havingStyle(t.style.sup()), r = Op(J(e.label, n, t), t);
		return r.classes.push("cd-label-" + e.side), r.style.bottom = P(.8 - r.depth), r.height = 0, r.depth = 0, r;
	},
	mathmlBuilder(e, t) {
		var n = new Y("mrow", [X(e.label, t)]);
		return n = new Y("mpadded", [n]), n.setAttribute("width", "0"), e.side === "left" && n.setAttribute("lspace", "-1width"), n.setAttribute("voffset", "0.7em"), n = new Y("mstyle", [n]), n.setAttribute("displaystyle", "false"), n.setAttribute("scriptlevel", "1"), n;
	}
}), q({
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
		var n = Op(J(e.fragment, t), t);
		return n.classes.push("cd-vert-arrow"), n;
	},
	mathmlBuilder(e, t) {
		return new Y("mrow", [X(e.fragment, t)]);
	}
}), q({
	type: "textord",
	names: ["\\@char"],
	numArgs: 1,
	allowedInText: !0,
	handler(e, t) {
		for (var { parser: n } = e, r = Z(t[0], "ordgroup").body, i = "", a = 0; a < r.length; a++) {
			var o = Z(r[a], "textord");
			i += o.text;
		}
		var s = parseInt(i), c;
		if (isNaN(s)) throw new M("\\@char has non-numeric argument " + i);
		if (s < 0 || s >= 1114111) throw new M("\\@char with invalid code point " + i);
		return s <= 65535 ? c = String.fromCharCode(s) : (s -= 65536, c = String.fromCharCode((s >> 10) + 55296, (s & 1023) + 56320)), {
			type: "textord",
			mode: n.mode,
			text: c
		};
	}
}), q({
	type: "color",
	names: ["\\textcolor"],
	numArgs: 2,
	allowedInText: !0,
	argTypes: ["color", "original"],
	handler(e, t) {
		var { parser: n } = e, r = Z(t[0], "color-token").color, i = t[1];
		return {
			type: "color",
			mode: n.mode,
			color: r,
			body: Gp(i)
		};
	},
	htmlBuilder: (e, t) => Dp(Xp(e.body, t.withColor(e.color), !1)),
	mathmlBuilder: (e, t) => {
		var n = new Y("mstyle", mm(e.body, t.withColor(e.color)));
		return n.setAttribute("mathcolor", e.color), n;
	}
}), q({
	type: "color",
	names: ["\\color"],
	numArgs: 1,
	allowedInText: !0,
	argTypes: ["color"],
	handler(e, t) {
		var { parser: n, breakOnTokenText: r } = e, i = Z(t[0], "color-token").color;
		n.gullet.macros.set("\\current@color", i);
		var a = n.parseExpression(!0, r);
		return {
			type: "color",
			mode: n.mode,
			color: i,
			body: a
		};
	}
}), q({
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
			size: i && Z(i, "size").value
		};
	},
	htmlBuilder(e, t) {
		var n = G(["mspace"], [], t);
		return e.newLine && (n.classes.push("newline"), e.size && (n.style.marginTop = P(af(e.size, t)))), n;
	},
	mathmlBuilder(e, t) {
		var n = new Y("mspace");
		return e.newLine && (n.setAttribute("linebreak", "newline"), e.size && n.setAttribute("height", P(af(e.size, t)))), n;
	}
});
var Xm = {
	"\\global": "\\global",
	"\\long": "\\\\globallong",
	"\\\\globallong": "\\\\globallong",
	"\\def": "\\gdef",
	"\\gdef": "\\gdef",
	"\\edef": "\\xdef",
	"\\xdef": "\\xdef",
	"\\let": "\\\\globallet",
	"\\futurelet": "\\\\globalfuture"
}, Zm = (e) => {
	var t = e.text;
	if (/^(?:[\\{}$&#^_]|EOF)$/.test(t)) throw new M("Expected a control sequence", e);
	return t;
}, Qm = (e) => {
	var t = e.gullet.popToken();
	return t.text === "=" && (t = e.gullet.popToken(), t.text === " " && (t = e.gullet.popToken())), t;
}, $m = (e, t, n, r) => {
	var i = e.gullet.macros.get(n.text);
	i ??= (n.noexpand = !0, {
		tokens: [n],
		numArgs: 0,
		unexpandable: !e.gullet.isExpandable(n.text)
	}), e.gullet.macros.set(t, i, r);
};
q({
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
		if (Xm[r.text]) return (n === "\\global" || n === "\\\\globallong") && (r.text = Xm[r.text]), Z(t.parseFunction(), "internal");
		throw new M("Invalid token after macro prefix", r);
	}
}), q({
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
		if (/^(?:[\\{}$&#^_]|EOF)$/.test(i)) throw new M("Expected a control sequence", r);
		for (var a = 0, o, s = [[]]; t.gullet.future().text !== "{";) if (r = t.gullet.popToken(), r.text === "#") {
			if (t.gullet.future().text === "{") {
				o = t.gullet.future(), s[a].push("{");
				break;
			}
			if (r = t.gullet.popToken(), !/^[1-9]$/.test(r.text)) throw new M("Invalid argument number \"" + r.text + "\"");
			if (parseInt(r.text) !== a + 1) throw new M("Argument number \"" + r.text + "\" out of order");
			a++, s.push([]);
		} else if (r.text === "EOF") throw new M("Expected a macro definition");
		else s[a].push(r.text);
		var { tokens: c } = t.gullet.consumeArg();
		return o && c.unshift(o), (n === "\\edef" || n === "\\xdef") && (c = t.gullet.expandTokens(c), c.reverse()), t.gullet.macros.set(i, {
			tokens: c,
			numArgs: a,
			delimiters: s
		}, n === Xm[n]), {
			type: "internal",
			mode: t.mode
		};
	}
}), q({
	type: "internal",
	names: ["\\let", "\\\\globallet"],
	numArgs: 0,
	allowedInText: !0,
	primitive: !0,
	handler(e) {
		var { parser: t, funcName: n } = e, r = Zm(t.gullet.popToken());
		return t.gullet.consumeSpaces(), $m(t, r, Qm(t), n === "\\\\globallet"), {
			type: "internal",
			mode: t.mode
		};
	}
}), q({
	type: "internal",
	names: ["\\futurelet", "\\\\globalfuture"],
	numArgs: 0,
	allowedInText: !0,
	primitive: !0,
	handler(e) {
		var { parser: t, funcName: n } = e, r = Zm(t.gullet.popToken()), i = t.gullet.popToken(), a = t.gullet.popToken();
		return $m(t, r, a, n === "\\\\globalfuture"), t.gullet.pushToken(a), t.gullet.pushToken(i), {
			type: "internal",
			mode: t.mode
		};
	}
});
var eh = function(e, t, n) {
	var r = Df(Af.math[e] && Af.math[e].replace || e, t, n);
	if (!r) throw Error("Unsupported symbol " + e + " and font size " + t + ".");
	return r;
}, th = function(e, t, n, r) {
	var i = n.havingBaseStyle(t), a = G(r.concat(i.sizingClasses(n)), [e], n), o = i.sizeMultiplier / n.sizeMultiplier;
	return a.height *= o, a.depth *= o, a.maxFontSize = i.sizeMultiplier, a;
}, nh = function(e, t, n) {
	var r = t.havingBaseStyle(n), i = (1 - t.sizeMultiplier / r.sizeMultiplier) * t.fontMetrics().axisHeight;
	e.classes.push("delimcenter"), e.style.top = P(i), e.height -= i, e.depth += i;
}, rh = function(e, t, n, r, i, a) {
	var o = th(_p(e, "Main-Regular", i, r), t, r, a);
	return n && nh(o, r, t), o;
}, ih = function(e, t, n, r) {
	return _p(e, "Size" + t + "-Regular", n, r);
}, ah = function(e, t, n, r, i, a) {
	var o = ih(e, t, i, r), s = th(G(["delimsizing", "size" + t], [o], r), N.TEXT, r, a);
	return n && nh(s, r, N.TEXT), s;
}, oh = function(e, t, n) {
	return {
		type: "elem",
		elem: G(["delimsizinginner", t === "Size1-Regular" ? "delim-size1" : "delim-size4"], [G([], [_p(e, t, n)])])
	};
}, sh = function(e, t, n) {
	var r = Cf["Size4-Regular"][e.charCodeAt(0)] ? Cf["Size4-Regular"][e.charCodeAt(0)][4] : Cf["Size1-Regular"][e.charCodeAt(0)][4], i = wp([], [new _f([new vf("inner", Xd(e, Math.round(1e3 * t)))], {
		width: P(r),
		height: P(t),
		style: "width:" + P(r),
		viewBox: "0 0 " + 1e3 * r + " " + Math.round(1e3 * t),
		preserveAspectRatio: "xMinYMin"
	})], n);
	return i.height = t, i.style.height = P(t), i.style.width = P(r), {
		type: "elem",
		elem: i
	};
}, ch = .008, lh = {
	type: "kern",
	size: -1 * ch
}, uh = new Set([
	"|",
	"\\lvert",
	"\\rvert",
	"\\vert"
]), dh = new Set([
	"\\|",
	"\\lVert",
	"\\rVert",
	"\\Vert"
]), fh = function(e, t, n, r, i, a) {
	var o, s, c, l, u = "", d = 0;
	o = c = l = e, s = null;
	var f = "Size1-Regular";
	e === "\\uparrow" ? c = l = "⏐" : e === "\\Uparrow" ? c = l = "‖" : e === "\\downarrow" ? o = c = "⏐" : e === "\\Downarrow" ? o = c = "‖" : e === "\\updownarrow" ? (o = "\\uparrow", c = "⏐", l = "\\downarrow") : e === "\\Updownarrow" ? (o = "\\Uparrow", c = "‖", l = "\\Downarrow") : uh.has(e) ? (c = "∣", u = "vert", d = 333) : dh.has(e) ? (c = "∥", u = "doublevert", d = 556) : e === "[" || e === "\\lbrack" ? (o = "⎡", c = "⎢", l = "⎣", f = "Size4-Regular", u = "lbrack", d = 667) : e === "]" || e === "\\rbrack" ? (o = "⎤", c = "⎥", l = "⎦", f = "Size4-Regular", u = "rbrack", d = 667) : e === "\\lfloor" || e === "⌊" ? (c = o = "⎢", l = "⎣", f = "Size4-Regular", u = "lfloor", d = 667) : e === "\\lceil" || e === "⌈" ? (o = "⎡", c = l = "⎢", f = "Size4-Regular", u = "lceil", d = 667) : e === "\\rfloor" || e === "⌋" ? (c = o = "⎥", l = "⎦", f = "Size4-Regular", u = "rfloor", d = 667) : e === "\\rceil" || e === "⌉" ? (o = "⎤", c = l = "⎥", f = "Size4-Regular", u = "rceil", d = 667) : e === "(" || e === "\\lparen" ? (o = "⎛", c = "⎜", l = "⎝", f = "Size4-Regular", u = "lparen", d = 875) : e === ")" || e === "\\rparen" ? (o = "⎞", c = "⎟", l = "⎠", f = "Size4-Regular", u = "rparen", d = 875) : e === "\\{" || e === "\\lbrace" ? (o = "⎧", s = "⎨", l = "⎩", c = "⎪", f = "Size4-Regular") : e === "\\}" || e === "\\rbrace" ? (o = "⎫", s = "⎬", l = "⎭", c = "⎪", f = "Size4-Regular") : e === "\\lgroup" || e === "⟮" ? (o = "⎧", l = "⎩", c = "⎪", f = "Size4-Regular") : e === "\\rgroup" || e === "⟯" ? (o = "⎫", l = "⎭", c = "⎪", f = "Size4-Regular") : e === "\\lmoustache" || e === "⎰" ? (o = "⎧", l = "⎭", c = "⎪", f = "Size4-Regular") : (e === "\\rmoustache" || e === "⎱") && (o = "⎫", l = "⎩", c = "⎪", f = "Size4-Regular");
	var p = eh(o, f, i), m = p.height + p.depth, h = eh(c, f, i), g = h.height + h.depth, _ = eh(l, f, i), v = _.height + _.depth, y = 0, b = 1;
	if (s !== null) {
		var x = eh(s, f, i);
		y = x.height + x.depth, b = 2;
	}
	var S = m + v + y, C = S + Math.max(0, Math.ceil((t - S) / (b * g))) * b * g, w = r.fontMetrics().axisHeight;
	n && (w *= r.sizeMultiplier);
	var T = C / 2 - w, E = [];
	if (u.length > 0) {
		var ee = C - m - v, te = Math.round(C * 1e3), ne = Qd(u, Math.round(ee * 1e3)), re = new vf(u, ne), ie = P(d / 1e3), ae = P(te / 1e3), oe = wp([], [new _f([re], {
			width: ie,
			height: ae,
			viewBox: "0 0 " + d + " " + te
		})], r);
		oe.height = te / 1e3, oe.style.width = ie, oe.style.height = ae, E.push({
			type: "elem",
			elem: oe
		});
	} else {
		if (E.push(oh(l, f, i)), E.push(lh), s === null) {
			var se = C - m - v + 2 * ch;
			E.push(sh(c, se, r));
		} else {
			var ce = (C - m - v - y) / 2 + 2 * ch;
			E.push(sh(c, ce, r)), E.push(lh), E.push(oh(s, f, i)), E.push(lh), E.push(sh(c, ce, r));
		}
		E.push(lh), E.push(oh(o, f, i));
	}
	var le = r.havingBaseStyle(N.TEXT);
	return th(G(["delimsizing", "mult"], [K({
		positionType: "bottom",
		positionData: T,
		children: E
	})], le), N.TEXT, r, a);
}, ph = 80, mh = .08, hh = function(e, t, n, r, i) {
	return wp(["hide-tail"], [new _f([new vf(e, Yd(e, r, n))], {
		width: "400em",
		height: P(t),
		viewBox: "0 0 400000 " + n,
		preserveAspectRatio: "xMinYMin slice"
	})], i);
}, gh = function(e, t) {
	var n = t.havingBaseSizing(), r = Eh("\\surd", e * n.sizeMultiplier, wh, n), i = n.sizeMultiplier, a = Math.max(0, t.minRuleThickness - t.fontMetrics().sqrtRuleThickness), o, s, c, l, u;
	return r.type === "small" ? (l = 1e3 + 1e3 * a + ph, e < 1 ? i = 1 : e < 1.4 && (i = .7), s = (1 + a + mh) / i, c = (1 + a) / i, o = hh("sqrtMain", s, l, a, t), o.style.minWidth = "0.853em", u = .833 / i) : r.type === "large" ? (l = (1e3 + ph) * bh[r.size], c = (bh[r.size] + a) / i, s = (bh[r.size] + a + mh) / i, o = hh("sqrtSize" + r.size, s, l, a, t), o.style.minWidth = "1.02em", u = 1 / i) : (s = e + a + mh, c = e + a, l = Math.floor(1e3 * e + a) + ph, o = hh("sqrtTall", s, l, a, t), o.style.minWidth = "0.742em", u = 1.056), o.height = c, o.style.height = P(s), {
		span: o,
		advanceWidth: u,
		ruleWidth: (t.fontMetrics().sqrtRuleThickness + a) * i
	};
}, _h = new Set([
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
]), vh = new Set([
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
]), yh = new Set([
	"<",
	">",
	"\\langle",
	"\\rangle",
	"/",
	"\\backslash",
	"\\lt",
	"\\gt"
]), bh = [
	0,
	1.2,
	1.8,
	2.4,
	3
], xh = function(e, t, n, r, i) {
	if (e === "<" || e === "\\lt" || e === "⟨" ? e = "\\langle" : (e === ">" || e === "\\gt" || e === "⟩") && (e = "\\rangle"), _h.has(e) || yh.has(e)) return ah(e, t, !1, n, r, i);
	if (vh.has(e)) return fh(e, bh[t], !1, n, r, i);
	throw new M("Illegal delimiter: '" + e + "'");
}, Sh = [
	{
		type: "small",
		style: N.SCRIPTSCRIPT
	},
	{
		type: "small",
		style: N.SCRIPT
	},
	{
		type: "small",
		style: N.TEXT
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
], Ch = [
	{
		type: "small",
		style: N.SCRIPTSCRIPT
	},
	{
		type: "small",
		style: N.SCRIPT
	},
	{
		type: "small",
		style: N.TEXT
	},
	{ type: "stack" }
], wh = [
	{
		type: "small",
		style: N.SCRIPTSCRIPT
	},
	{
		type: "small",
		style: N.SCRIPT
	},
	{
		type: "small",
		style: N.TEXT
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
], Th = function(e) {
	if (e.type === "small") return "Main-Regular";
	if (e.type === "large") return "Size" + e.size + "-Regular";
	if (e.type === "stack") return "Size4-Regular";
	var t = e.type;
	throw Error("Add support for delim type '" + t + "' here.");
}, Eh = function(e, t, n, r) {
	for (var i = Math.min(2, 3 - r.style.size); i < n.length; i++) {
		var a = n[i];
		if (a.type === "stack") break;
		var o = eh(e, Th(a), "math"), s = o.height + o.depth;
		if (a.type === "small") {
			var c = r.havingBaseStyle(a.style);
			s *= c.sizeMultiplier;
		}
		if (s > t) return a;
	}
	return n[n.length - 1];
}, Dh = function(e, t, n, r, i, a) {
	e === "<" || e === "\\lt" || e === "⟨" ? e = "\\langle" : (e === ">" || e === "\\gt" || e === "⟩") && (e = "\\rangle");
	var o = yh.has(e) ? Sh : _h.has(e) ? wh : Ch, s = Eh(e, t, o, r);
	return s.type === "small" ? rh(e, s.style, n, r, i, a) : s.type === "large" ? ah(e, s.size, n, r, i, a) : fh(e, t, n, r, i, a);
}, Oh = function(e, t, n, r, i, a) {
	var o = r.fontMetrics().axisHeight * r.sizeMultiplier, s = 901, c = 5 / r.fontMetrics().ptPerEm, l = Math.max(t - o, n + o);
	return Dh(e, Math.max(l / 500 * s, 2 * l - c), !0, r, i, a);
}, kh = {
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
}, Ah = new Set(/* @__PURE__ */ "(,\\lparen,),\\rparen,[,\\lbrack,],\\rbrack,\\{,\\lbrace,\\},\\rbrace,\\lfloor,\\rfloor,⌊,⌋,\\lceil,\\rceil,⌈,⌉,<,>,\\langle,⟨,\\rangle,⟩,\\lt,\\gt,\\lvert,\\rvert,\\lVert,\\rVert,\\lgroup,\\rgroup,⟮,⟯,\\lmoustache,\\rmoustache,⎰,⎱,/,\\backslash,|,\\vert,\\|,\\Vert,\\uparrow,\\Uparrow,\\downarrow,\\Downarrow,\\updownarrow,\\Updownarrow,.".split(","));
function jh(e) {
	return "isMiddle" in e;
}
function Mh(e, t) {
	var n = Fm(e);
	if (n && Ah.has(n.text)) return n;
	throw n ? new M("Invalid delimiter '" + n.text + "' after '" + t.funcName + "'", e) : new M("Invalid delimiter type '" + e.type + "'", e);
}
q({
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
		var n = Mh(t[0], e);
		return {
			type: "delimsizing",
			mode: e.parser.mode,
			size: kh[e.funcName].size,
			mclass: kh[e.funcName].mclass,
			delim: n.text
		};
	},
	htmlBuilder: (e, t) => e.delim === "." ? G([e.mclass]) : xh(e.delim, e.size, t, e.mode, [e.mclass]),
	mathmlBuilder: (e) => {
		var t = [];
		e.delim !== "." && t.push(lm(e.delim, e.mode));
		var n = new Y("mo", t);
		e.mclass === "mopen" || e.mclass === "mclose" ? n.setAttribute("fence", "true") : n.setAttribute("fence", "false"), n.setAttribute("stretchy", "true");
		var r = P(bh[e.size]);
		return n.setAttribute("minsize", r), n.setAttribute("maxsize", r), n;
	}
});
function Nh(e) {
	if (!e.body) throw Error("Bug: The leftright ParseNode wasn't fully parsed.");
}
q({
	type: "leftright-right",
	names: ["\\right"],
	numArgs: 1,
	primitive: !0,
	handler: (e, t) => {
		var n = e.parser.gullet.macros.get("\\current@color");
		if (n && typeof n != "string") throw new M("\\current@color set to non-string in \\right");
		return {
			type: "leftright-right",
			mode: e.parser.mode,
			delim: Mh(t[0], e).text,
			color: n
		};
	}
}), q({
	type: "leftright",
	names: ["\\left"],
	numArgs: 1,
	primitive: !0,
	handler: (e, t) => {
		var n = Mh(t[0], e), r = e.parser;
		++r.leftrightDepth;
		var i = r.parseExpression(!1);
		--r.leftrightDepth, r.expect("\\right", !1);
		var a = Z(r.parseFunction(), "leftright-right");
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
		Nh(e);
		for (var n = Xp(e.body, t, !0, ["mopen", "mclose"]), r = 0, i = 0, a = !1, o = 0; o < n.length; o++) {
			var s = n[o];
			jh(s) ? a = !0 : (r = Math.max(n[o].height, r), i = Math.max(n[o].depth, i));
		}
		r *= t.sizeMultiplier, i *= t.sizeMultiplier;
		var c = e.left === "." ? tm(t, ["mopen"]) : Oh(e.left, r, i, t, e.mode, ["mopen"]);
		if (n.unshift(c), a) for (var l = 1; l < n.length; l++) {
			var u = n[l];
			if (jh(u)) {
				var d = u.isMiddle;
				n[l] = Oh(d.delim, r, i, d.options, e.mode, []);
			}
		}
		var f;
		if (e.right === ".") f = tm(t, ["mclose"]);
		else {
			var p = e.rightColor ? t.withColor(e.rightColor) : t;
			f = Oh(e.right, r, i, p, e.mode, ["mclose"]);
		}
		return n.push(f), G(["minner"], n, t);
	},
	mathmlBuilder: (e, t) => {
		Nh(e);
		var n = mm(e.body, t);
		if (e.left !== ".") {
			var r = new Y("mo", [lm(e.left, e.mode)]);
			r.setAttribute("fence", "true"), n.unshift(r);
		}
		if (e.right !== ".") {
			var i = new Y("mo", [lm(e.right, e.mode)]);
			i.setAttribute("fence", "true"), e.rightColor && i.setAttribute("mathcolor", e.rightColor), n.push(i);
		}
		return um(n);
	}
}), q({
	type: "middle",
	names: ["\\middle"],
	numArgs: 1,
	primitive: !0,
	handler: (e, t) => {
		var n = Mh(t[0], e);
		if (!e.parser.leftrightDepth) throw new M("\\middle without preceding \\left", n);
		return {
			type: "middle",
			mode: e.parser.mode,
			delim: n.text
		};
	},
	htmlBuilder: (e, t) => {
		var n;
		return e.delim === "." ? n = tm(t, []) : (n = xh(e.delim, 1, t, e.mode, []), n.isMiddle = {
			delim: e.delim,
			options: t
		}), n;
	},
	mathmlBuilder: (e, t) => {
		var n = new Y("mo", [e.delim === "\\vert" || e.delim === "|" ? lm("|", "text") : lm(e.delim, e.mode)]);
		return n.setAttribute("fence", "true"), n.setAttribute("lspace", "0.05em"), n.setAttribute("rspace", "0.05em"), n;
	}
}), q({
	type: "enclose",
	names: ["\\colorbox"],
	numArgs: 2,
	allowedInText: !0,
	argTypes: ["color", "hbox"],
	handler(e, t, n) {
		var { parser: r, funcName: i } = e, a = Z(t[0], "color-token").color, o = t[1];
		return {
			type: "enclose",
			mode: r.mode,
			label: i,
			backgroundColor: a,
			body: o
		};
	},
	htmlBuilder: (e, t) => {
		var n = Op(J(e.body, t), t), r = e.label.slice(1), i = t.sizeMultiplier, a, o, s = pd(e.body);
		if (r === "sout") a = G(["stretchy", "sout"]), a.height = t.fontMetrics().defaultRuleThickness / i, o = -.5 * t.fontMetrics().xHeight;
		else if (r === "phase") {
			var c = af({
				number: .6,
				unit: "pt"
			}, t), l = af({
				number: .35,
				unit: "ex"
			}, t), u = t.havingBaseSizing();
			i /= u.sizeMultiplier;
			var d = n.height + n.depth + c + l;
			n.style.paddingLeft = P(d / 2 + c);
			var f = Math.floor(1e3 * d * i);
			a = wp(["hide-tail"], [new _f([new vf("phase", qd(f))], {
				width: "400em",
				height: P(f / 1e3),
				viewBox: "0 0 400000 " + f,
				preserveAspectRatio: "xMinYMin slice"
			})], t), a.style.height = P(d), o = n.depth + c + l;
		} else {
			/cancel/.test(r) ? s || n.classes.push("cancel-pad") : r === "angl" ? n.classes.push("anglpad") : n.classes.push("boxpad");
			var p, m, h = 0;
			/box/.test(r) ? (h = Math.max(t.fontMetrics().fboxrule, t.minRuleThickness), p = t.fontMetrics().fboxsep + (r === "colorbox" ? 0 : h), m = p) : r === "angl" ? (h = Math.max(t.fontMetrics().defaultRuleThickness, t.minRuleThickness), p = 4 * h, m = Math.max(0, .25 - n.depth)) : (p = s ? .2 : 0, m = p), a = Am(n, r, p, m, t), /fbox|boxed|fcolorbox/.test(r) ? (a.style.borderStyle = "solid", a.style.borderWidth = P(h)) : r === "angl" && h !== .049 && (a.style.borderTopWidth = P(h), a.style.borderRightWidth = P(h)), o = n.depth + m, e.backgroundColor && (a.style.backgroundColor = e.backgroundColor, e.borderColor && (a.style.borderColor = e.borderColor));
		}
		var g;
		if (e.backgroundColor) g = K({
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
			var _ = /cancel|phase/.test(r) ? ["svg-align"] : [];
			g = K({
				positionType: "individualShift",
				children: [{
					type: "elem",
					elem: n,
					shift: 0
				}, {
					type: "elem",
					elem: a,
					shift: o,
					wrapperClasses: _
				}]
			});
		}
		return /cancel/.test(r) && (g.height = n.height, g.depth = n.depth), /cancel/.test(r) && !s ? G(["mord", "cancel-lap"], [g], t) : G(["mord"], [g], t);
	},
	mathmlBuilder: (e, t) => {
		var n, r = new Y(e.label.includes("colorbox") ? "mpadded" : "menclose", [X(e.body, t)]);
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
					r.setAttribute("style", "border: " + P(i) + " solid " + e.borderColor);
				}
				break;
			case "\\xcancel":
				r.setAttribute("notation", "updiagonalstrike downdiagonalstrike");
				break;
		}
		return e.backgroundColor && r.setAttribute("mathbackground", e.backgroundColor), r;
	}
}), q({
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
		var { parser: r, funcName: i } = e, a = Z(t[0], "color-token").color, o = Z(t[1], "color-token").color, s = t[2];
		return {
			type: "enclose",
			mode: r.mode,
			label: i,
			backgroundColor: o,
			borderColor: a,
			body: s
		};
	}
}), q({
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
}), q({
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
}), q({
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
}), q({
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
var Ph = {};
function Fh(e) {
	for (var { type: t, names: n, props: r, handler: i, htmlBuilder: a, mathmlBuilder: o } = e, s = {
		type: t,
		numArgs: r.numArgs || 0,
		allowedInText: !1,
		numOptionalArgs: 0,
		handler: i
	}, c = 0; c < n.length; ++c) Ph[n[c]] = s;
	a && (Vp[t] = a), o && (Hp[t] = o);
}
var Ih = {};
function Q(e, t) {
	Ih[e] = t;
}
var Lh = class e {
	constructor(e, t, n) {
		this.lexer = void 0, this.start = void 0, this.end = void 0, this.lexer = e, this.start = t, this.end = n;
	}
	static range(t, n) {
		return n ? !t || !t.loc || !n.loc || t.loc.lexer !== n.loc.lexer ? null : new e(t.loc.lexer, t.loc.start, n.loc.end) : t && t.loc;
	}
}, Rh = class e {
	constructor(e, t) {
		this.text = void 0, this.loc = void 0, this.noexpand = void 0, this.treatAsRelax = void 0, this.text = e, this.loc = t;
	}
	range(t, n) {
		return new e(n, Lh.range(this, t));
	}
};
function zh(e) {
	var t = [];
	e.consumeSpaces();
	var n = e.fetch().text;
	for (n === "\\relax" && (e.consume(), e.consumeSpaces(), n = e.fetch().text); n === "\\hline" || n === "\\hdashline";) e.consume(), t.push(n === "\\hdashline"), e.consumeSpaces(), n = e.fetch().text;
	return t;
}
var Bh = (e) => {
	if (!e.parser.settings.displayMode) throw new M("{" + e.envName + "} can be used only in display mode.");
}, Vh = new Set(["gather", "gather*"]);
function Hh(e) {
	if (!e.includes("ed")) return !e.includes("*");
}
function Uh(e, t, n) {
	var { hskipBeforeAndAfter: r, addJot: i, cols: a, arraystretch: o, colSeparationType: s, autoTag: c, singleRow: l, emptySingleRow: u, maxNumCols: d, leqno: f } = t;
	if (e.gullet.beginGroup(), l || e.gullet.macros.set("\\cr", "\\\\\\relax"), !o) {
		var p = e.gullet.expandMacroAsText("\\arraystretch");
		if (p == null) o = 1;
		else if (o = parseFloat(p), !o || o < 0) throw new M("Invalid \\arraystretch: " + p);
	}
	e.gullet.beginGroup();
	var m = [], h = [m], g = [], _ = [], v = c == null ? void 0 : [];
	function y() {
		c && e.gullet.macros.set("\\@eqnsw", "1", !0);
	}
	function b() {
		v && (e.gullet.macros.get("\\df@tag") ? (v.push(e.subparse([new Rh("\\df@tag")])), e.gullet.macros.set("\\df@tag", void 0, !0)) : v.push(!!c && e.gullet.macros.get("\\@eqnsw") === "1"));
	}
	for (y(), _.push(zh(e));;) {
		var x = e.parseExpression(!1, l ? "\\end" : "\\\\");
		e.gullet.endGroup(), e.gullet.beginGroup();
		var S = {
			type: "ordgroup",
			mode: e.mode,
			body: x
		};
		n && (S = {
			type: "styling",
			mode: e.mode,
			style: n,
			resetFont: !0,
			body: [S]
		}), m.push(S);
		var C = e.fetch().text;
		if (C === "&") {
			if (d && m.length === d) {
				if (l || s) throw new M("Too many tab characters: &", e.nextToken);
				e.settings.reportNonstrict("textEnv", "Too few columns specified in the {array} column argument.");
			}
			e.consume();
		} else if (C === "\\end") {
			b(), m.length === 1 && S.type === "styling" && S.body.length === 1 && S.body[0].type === "ordgroup" && S.body[0].body.length === 0 && (h.length > 1 || !u) && h.pop(), _.length < h.length + 1 && _.push([]);
			break;
		} else if (C === "\\\\") {
			e.consume();
			var w = void 0;
			e.gullet.future().text !== " " && (w = e.parseSizeGroup(!0)), g.push(w ? w.value : null), b(), _.push(zh(e)), m = [], h.push(m), y();
		} else throw new M("Expected & or \\\\ or \\cr or \\end", e.nextToken);
	}
	return e.gullet.endGroup(), e.gullet.endGroup(), {
		type: "array",
		mode: e.mode,
		addJot: i,
		arraystretch: o,
		body: h,
		cols: a,
		rowGaps: g,
		hskipBeforeAndAfter: r,
		hLinesBeforeRow: _,
		colSeparationType: s,
		tags: v,
		leqno: f
	};
}
function Wh(e) {
	return e.slice(0, 1) === "d" ? "display" : "text";
}
var Gh = function(e, t) {
	var n, r, i = e.body.length, a = e.hLinesBeforeRow, o = 0, s = Array(i), c = [], l = Math.max(t.fontMetrics().arrayRuleWidth, t.minRuleThickness), u = 1 / t.fontMetrics().ptPerEm, d = 5 * u;
	e.colSeparationType && e.colSeparationType === "small" && (d = .2778 * (t.havingStyle(N.SCRIPT).sizeMultiplier / t.sizeMultiplier));
	var f = e.colSeparationType === "CD" ? af({
		number: 3,
		unit: "ex"
	}, t) : 12 * u, p = 3 * u, m = e.arraystretch * f, h = .7 * m, g = .3 * m, _ = 0;
	function v(e) {
		for (var t = 0; t < e.length; ++t) t > 0 && (_ += .25), c.push({
			pos: _,
			isDashed: e[t]
		});
	}
	for (v(a[0]), n = 0; n < e.body.length; ++n) {
		var y = e.body[n], b = h, x = g;
		o < y.length && (o = y.length);
		var S = {
			cells: Array(y.length),
			height: 0,
			depth: 0,
			pos: 0
		};
		for (r = 0; r < y.length; ++r) {
			var C = J(y[r], t);
			x < C.depth && (x = C.depth), b < C.height && (b = C.height), S.cells[r] = C;
		}
		var w = e.rowGaps[n], T = 0;
		w && (T = af(w, t), T > 0 && (T += g, x < T && (x = T), T = 0)), e.addJot && n < e.body.length - 1 && (x += p), S.height = b, S.depth = x, _ += b, S.pos = _, _ += x + T, s[n] = S, v(a[n + 1]);
	}
	var E = _ / 2 + t.fontMetrics().axisHeight, ee = e.cols || [], te = [], ne, re, ie = [];
	if (e.tags && e.tags.some((e) => e)) for (n = 0; n < i; ++n) {
		var ae = s[n], oe = ae.pos - E, se = e.tags[n], ce = void 0;
		ce = se === !0 ? G(["eqn-num"], [], t) : se === !1 ? G([], [], t) : G([], Xp(se, t, !0), t), ce.depth = ae.depth, ce.height = ae.height, ie.push({
			type: "elem",
			elem: ce,
			shift: oe
		});
	}
	for (r = 0, re = 0; r < o || re < ee.length; ++r, ++re) {
		for (var le = ee[re], ue = !0; (de = le)?.type === "separator";) {
			var de;
			if (ue || (ne = G(["arraycolsep"], []), ne.style.width = P(t.fontMetrics().doubleRuleSep), te.push(ne)), le.separator === "|" || le.separator === ":") {
				var fe = le.separator === "|" ? "solid" : "dashed", pe = G(["vertical-separator"], [], t);
				pe.style.height = P(_), pe.style.borderRightWidth = P(l), pe.style.borderRightStyle = fe, pe.style.margin = "0 " + P(-l / 2);
				var me = _ - E;
				me && (pe.style.verticalAlign = P(-me)), te.push(pe);
			} else throw new M("Invalid separator type: " + le.separator);
			re++, le = ee[re], ue = !1;
		}
		if (!(r >= o)) {
			var he = void 0;
			(r > 0 || e.hskipBeforeAndAfter) && (he = le?.pregap ?? d, he !== 0 && (ne = G(["arraycolsep"], []), ne.style.width = P(he), te.push(ne)));
			var ge = [];
			for (n = 0; n < i; ++n) {
				var _e = s[n], ve = _e.cells[r];
				if (ve) {
					var ye = _e.pos - E;
					ve.depth = _e.depth, ve.height = _e.height, ge.push({
						type: "elem",
						elem: ve,
						shift: ye
					});
				}
			}
			var be = K({
				positionType: "individualShift",
				children: ge
			}), xe = G(["col-align-" + (le?.align || "c")], [be]);
			te.push(xe), (r < o - 1 || e.hskipBeforeAndAfter) && (he = le?.postgap ?? d, he !== 0 && (ne = G(["arraycolsep"], []), ne.style.width = P(he), te.push(ne)));
		}
	}
	var Se = G(["mtable"], te);
	if (c.length > 0) {
		for (var Ce = Tp("hline", t, l), we = Tp("hdashline", t, l), Te = [{
			type: "elem",
			elem: Se,
			shift: 0
		}]; c.length > 0;) {
			var Ee = c.pop(), De = Ee.pos - E;
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
		Se = K({
			positionType: "individualShift",
			children: Te
		});
	}
	if (ie.length === 0) return G(["mord"], [Se], t);
	var Oe = G(["tag"], [K({
		positionType: "individualShift",
		children: ie
	})], t);
	return Dp([Se, Oe]);
}, Kh = {
	c: "center ",
	l: "left ",
	r: "right "
}, qh = function(e, t) {
	for (var n = [], r = new Y("mtd", [], ["mtr-glue"]), i = new Y("mtd", [], ["mml-eqn-num"]), a = 0; a < e.body.length; a++) {
		for (var o = e.body[a], s = [], c = 0; c < o.length; c++) s.push(new Y("mtd", [X(o[c], t)]));
		e.tags && e.tags[a] && (s.unshift(r), s.push(r), e.leqno ? s.unshift(i) : s.push(i)), n.push(new Y("mtr", s));
	}
	var l = new Y("mtable", n), u = e.arraystretch === .5 ? .1 : .16 + e.arraystretch - 1 + (e.addJot ? .09 : 0);
	l.setAttribute("rowspacing", P(u));
	var d = "", f = "";
	if (e.cols && e.cols.length > 0) {
		var p = e.cols, m = "", h = !1, g = 0, _ = p.length;
		p[0].type === "separator" && (d += "top ", g = 1), p[p.length - 1].type === "separator" && (d += "bottom ", --_);
		for (var v = g; v < _; v++) {
			var y = p[v];
			y.type === "align" ? (f += Kh[y.align], h && (m += "none "), h = !0) : y.type === "separator" && (h &&= (m += y.separator === "|" ? "solid " : "dashed ", !1));
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
	return /[sd]/.test(C) && l.setAttribute("rowlines", C.trim()), d !== "" && (l = new Y("menclose", [l]), l.setAttribute("notation", d.trim())), e.arraystretch && e.arraystretch < 1 && (l = new Y("mstyle", [l]), l.setAttribute("scriptlevel", "1")), l;
}, Jh = function(e, t) {
	e.envName.includes("ed") || Bh(e);
	var n = [], r = e.envName === "split", i = Uh(e.parser, {
		cols: n,
		addJot: !0,
		autoTag: r ? void 0 : Hh(e.envName),
		emptySingleRow: !0,
		colSeparationType: e.envName.includes("at") ? "alignat" : "align",
		maxNumCols: r ? 2 : void 0,
		leqno: e.parser.settings.leqno
	}, "display"), a = 0, o = 0, s = {
		type: "ordgroup",
		mode: e.mode,
		body: []
	};
	if (t[0] && t[0].type === "ordgroup") {
		for (var c = "", l = 0; l < t[0].body.length; l++) {
			var u = Z(t[0].body[l], "textord");
			c += u.text;
		}
		a = Number(c), o = a * 2;
	}
	var d = !o;
	i.body.forEach(function(e) {
		for (var t = 1; t < e.length; t += 2) Z(Z(e[t], "styling").body[0], "ordgroup").body.unshift(s);
		if (d) o < e.length && (o = e.length);
		else {
			var n = e.length / 2;
			if (a < n) throw new M("Too many math in a row: " + ("expected " + a + ", but got " + n), e[0]);
		}
	});
	for (var f = 0; f < o; ++f) {
		var p = "r", m = 0;
		f % 2 == 1 ? p = "l" : f > 0 && d && (m = 1), n[f] = {
			type: "align",
			align: p,
			pregap: m,
			postgap: 0
		};
	}
	return i.colSeparationType = d ? "align" : "alignat", i;
};
Fh({
	type: "array",
	names: ["array", "darray"],
	props: { numArgs: 1 },
	handler(e, t) {
		var n = (Fm(t[0]) ? [t[0]] : Z(t[0], "ordgroup").body).map(function(e) {
			var t = Pm(e).text;
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
			throw new M("Unknown column alignment: " + t, e);
		}), r = {
			cols: n,
			hskipBeforeAndAfter: !0,
			maxNumCols: n.length
		};
		return Uh(e.parser, r, Wh(e.envName));
	},
	htmlBuilder: Gh,
	mathmlBuilder: qh
}), Fh({
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
				if (i.consume(), i.consumeSpaces(), n = i.fetch().text, !"lcr".includes(n)) throw new M("Expected l or c or r", i.nextToken);
				i.consume(), i.consumeSpaces(), i.expect("]"), i.consume(), r.cols = [{
					type: "align",
					align: n
				}];
			}
		}
		var a = Uh(e.parser, r, Wh(e.envName)), o = Math.max(0, ...a.body.map((e) => e.length));
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
	htmlBuilder: Gh,
	mathmlBuilder: qh
}), Fh({
	type: "array",
	names: ["smallmatrix"],
	props: { numArgs: 0 },
	handler(e) {
		var t = Uh(e.parser, { arraystretch: .5 }, "script");
		return t.colSeparationType = "small", t;
	},
	htmlBuilder: Gh,
	mathmlBuilder: qh
}), Fh({
	type: "array",
	names: ["subarray"],
	props: { numArgs: 1 },
	handler(e, t) {
		var n = (Fm(t[0]) ? [t[0]] : Z(t[0], "ordgroup").body).map(function(e) {
			var t = Pm(e).text;
			if ("lc".includes(t)) return {
				type: "align",
				align: t
			};
			throw new M("Unknown column alignment: " + t, e);
		});
		if (n.length > 1) throw new M("{subarray} can contain only one column");
		var r = {
			cols: n,
			hskipBeforeAndAfter: !1,
			arraystretch: .5
		}, i = Uh(e.parser, r, "script");
		if (i.body.length > 0 && i.body[0].length > 1) throw new M("{subarray} can contain only one column");
		return i;
	},
	htmlBuilder: Gh,
	mathmlBuilder: qh
}), Fh({
	type: "array",
	names: [
		"cases",
		"dcases",
		"rcases",
		"drcases"
	],
	props: { numArgs: 0 },
	handler(e) {
		var t = Uh(e.parser, {
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
		}, Wh(e.envName));
		return {
			type: "leftright",
			mode: e.mode,
			body: [t],
			left: e.envName.includes("r") ? "." : "\\{",
			right: e.envName.includes("r") ? "\\}" : ".",
			rightColor: void 0
		};
	},
	htmlBuilder: Gh,
	mathmlBuilder: qh
}), Fh({
	type: "array",
	names: [
		"align",
		"align*",
		"aligned",
		"split"
	],
	props: { numArgs: 0 },
	handler: Jh,
	htmlBuilder: Gh,
	mathmlBuilder: qh
}), Fh({
	type: "array",
	names: [
		"gathered",
		"gather",
		"gather*"
	],
	props: { numArgs: 0 },
	handler(e) {
		Vh.has(e.envName) && Bh(e);
		var t = {
			cols: [{
				type: "align",
				align: "c"
			}],
			addJot: !0,
			colSeparationType: "gather",
			autoTag: Hh(e.envName),
			emptySingleRow: !0,
			leqno: e.parser.settings.leqno
		};
		return Uh(e.parser, t, "display");
	},
	htmlBuilder: Gh,
	mathmlBuilder: qh
}), Fh({
	type: "array",
	names: [
		"alignat",
		"alignat*",
		"alignedat"
	],
	props: { numArgs: 1 },
	handler: Jh,
	htmlBuilder: Gh,
	mathmlBuilder: qh
}), Fh({
	type: "array",
	names: ["equation", "equation*"],
	props: { numArgs: 0 },
	handler(e) {
		Bh(e);
		var t = {
			autoTag: Hh(e.envName),
			emptySingleRow: !0,
			singleRow: !0,
			maxNumCols: 1,
			leqno: e.parser.settings.leqno
		};
		return Uh(e.parser, t, "display");
	},
	htmlBuilder: Gh,
	mathmlBuilder: qh
}), Fh({
	type: "array",
	names: ["CD"],
	props: { numArgs: 0 },
	handler(e) {
		return Bh(e), Ym(e.parser);
	},
	htmlBuilder: Gh,
	mathmlBuilder: qh
}), Q("\\nonumber", "\\gdef\\@eqnsw{0}"), Q("\\notag", "\\nonumber"), q({
	type: "text",
	names: ["\\hline", "\\hdashline"],
	numArgs: 0,
	allowedInText: !0,
	allowedInMath: !0,
	handler(e, t) {
		throw new M(e.funcName + " valid only within array environment");
	}
});
var Yh = Ph;
q({
	type: "environment",
	names: ["\\begin", "\\end"],
	numArgs: 1,
	argTypes: ["text"],
	handler(e, t) {
		var { parser: n, funcName: r } = e, i = t[0];
		if (i.type !== "ordgroup") throw new M("Invalid environment name", i);
		for (var a = "", o = 0; o < i.body.length; ++o) a += Z(i.body[o], "textord").text;
		if (r === "\\begin") {
			if (!Yh.hasOwnProperty(a)) throw new M("No such environment: " + a, i);
			var s = Yh[a], { args: c, optArgs: l } = n.parseArguments("\\begin{" + a + "}", s), u = {
				mode: n.mode,
				envName: a,
				parser: n
			}, d = s.handler(u, c, l);
			n.expect("\\end", !1);
			var f = n.nextToken, p = Z(n.parseFunction(), "environment");
			if (p.name !== a) throw new M("Mismatch: \\begin{" + a + "} matched by \\end{" + p.name + "}", f);
			return d;
		}
		return {
			type: "environment",
			mode: n.mode,
			name: a,
			nameGroup: i
		};
	}
});
var Xh = (e, t) => {
	var n = e.font, r = t.withFont(n);
	return J(e.body, r);
}, Zh = (e, t) => {
	var n = e.font, r = t.withFont(n);
	return X(e.body, r);
}, Qh = {
	"\\Bbb": "\\mathbb",
	"\\bold": "\\mathbf",
	"\\frak": "\\mathfrak"
};
q({
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
		var { parser: n, funcName: r } = e, i = Wp(t[0]), a = r in Qh ? Qh[r] : r;
		return {
			type: "font",
			mode: n.mode,
			font: a.slice(1),
			body: i
		};
	},
	htmlBuilder: Xh,
	mathmlBuilder: Zh
}), q({
	type: "mclass",
	names: ["\\boldsymbol", "\\bm"],
	numArgs: 1,
	handler: (e, t) => {
		var { parser: n } = e, r = t[0];
		return {
			type: "mclass",
			mode: n.mode,
			mclass: Um(r),
			body: [{
				type: "font",
				mode: n.mode,
				font: "boldsymbol",
				body: r
			}],
			isCharacterBox: pd(r)
		};
	}
}), q({
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
var $h = (e, t) => {
	var n = t.style, r = n.fracNum(), i = n.fracDen(), a = t.havingStyle(r), o = J(e.numer, a, t);
	if (e.continued) {
		var s = 8.5 / t.fontMetrics().ptPerEm, c = 3.5 / t.fontMetrics().ptPerEm;
		o.height = o.height < s ? s : o.height, o.depth = o.depth < c ? c : o.depth;
	}
	a = t.havingStyle(i);
	var l = J(e.denom, a, t), u, d, f;
	e.hasBarLine ? (e.barSize ? (d = af(e.barSize, t), u = Tp("frac-line", t, d)) : u = Tp("frac-line", t), d = u.height, f = u.height) : (u = null, d = 0, f = t.fontMetrics().defaultRuleThickness);
	var p, m, h;
	n.size === N.DISPLAY.size ? (p = t.fontMetrics().num1, m = d > 0 ? 3 * f : 7 * f, h = t.fontMetrics().denom1) : (d > 0 ? (p = t.fontMetrics().num2, m = f) : (p = t.fontMetrics().num3, m = 3 * f), h = t.fontMetrics().denom2);
	var g;
	if (u) {
		var _ = t.fontMetrics().axisHeight;
		p - o.depth - (_ + .5 * d) < m && (p += m - (p - o.depth - (_ + .5 * d))), _ - .5 * d - (l.height - h) < m && (h += m - (_ - .5 * d - (l.height - h)));
		var v = -(_ - .5 * d);
		g = K({
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
		y < m && (p += .5 * (m - y), h += .5 * (m - y)), g = K({
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
	var b = n.size === N.DISPLAY.size ? t.fontMetrics().delim1 : n.size === N.SCRIPTSCRIPT.size ? t.havingStyle(N.SCRIPT).fontMetrics().delim2 : t.fontMetrics().delim2, x = e.leftDelim == null ? tm(t, ["mopen"]) : Dh(e.leftDelim, b, !0, t.havingStyle(n), e.mode, ["mopen"]), S = e.continued ? G([]) : e.rightDelim == null ? tm(t, ["mclose"]) : Dh(e.rightDelim, b, !0, t.havingStyle(n), e.mode, ["mclose"]);
	return G(["mord"].concat(a.sizingClasses(t)), [
		x,
		G(["mfrac"], [g]),
		S
	], t);
}, eg = (e, t) => {
	var n = new Y("mfrac", [X(e.numer, t), X(e.denom, t)]);
	if (!e.hasBarLine) n.setAttribute("linethickness", "0px");
	else if (e.barSize) {
		var r = af(e.barSize, t);
		n.setAttribute("linethickness", P(r));
	}
	if (e.leftDelim != null || e.rightDelim != null) {
		var i = [];
		if (e.leftDelim != null) {
			var a = new Y("mo", [new am(e.leftDelim.replace("\\", ""))]);
			a.setAttribute("fence", "true"), i.push(a);
		}
		if (i.push(n), e.rightDelim != null) {
			var o = new Y("mo", [new am(e.rightDelim.replace("\\", ""))]);
			o.setAttribute("fence", "true"), i.push(o);
		}
		return um(i);
	}
	return n;
}, tg = (e, t) => t ? {
	type: "styling",
	mode: e.mode,
	style: t,
	body: [e]
} : e;
q({
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
		return l || r.startsWith("\\d") ? u = "display" : r.startsWith("\\t") && (u = "text"), tg({
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
	htmlBuilder: $h,
	mathmlBuilder: eg
}), q({
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
var ng = [
	"display",
	"text",
	"script",
	"scriptscript"
], rg = function(e) {
	var t = null;
	return e.length > 0 && (t = e, t = t === "." ? null : t), t;
};
q({
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
		var { parser: n } = e, r = t[4], i = t[5], a = Wp(t[0]), o = a.type === "atom" && a.family === "open" ? rg(a.text) : null, s = Wp(t[1]), c = s.type === "atom" && s.family === "close" ? rg(s.text) : null, l = Z(t[2], "size"), u, d = null;
		l.isBlank ? u = !0 : (d = l.value, u = d.number > 0);
		var f = null, p = t[3];
		if (p.type === "ordgroup") {
			if (p.body.length > 0) {
				var m = Z(p.body[0], "textord");
				f = ng[Number(m.text)];
			}
		} else p = Z(p, "textord"), f = ng[Number(p.text)];
		return tg({
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
}), q({
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
			size: Z(t[0], "size").value,
			token: i
		};
	}
}), q({
	type: "genfrac",
	names: ["\\\\abovefrac"],
	numArgs: 3,
	argTypes: [
		"math",
		"size",
		"math"
	],
	handler: (e, t) => {
		var { parser: n, funcName: r } = e, i = t[0], a = Z(t[1], "infix").size;
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
var ig = (e, t) => {
	var n = t.style, r, i;
	e.type === "supsub" ? (r = e.sup ? J(e.sup, t.havingStyle(n.sup()), t) : J(e.sub, t.havingStyle(n.sub()), t), i = Z(e.base, "horizBrace")) : i = Z(e, "horizBrace");
	var a = J(i.base, t.havingBaseStyle(N.DISPLAY)), o = km(i, t), s = i.isOver ? K({
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
	}) : K({
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
		var c = G(["minner", i.isOver ? "mover" : "munder"], [s], t);
		s = i.isOver ? K({
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
		}) : K({
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
	return G(["minner", i.isOver ? "mover" : "munder"], [s], t);
};
q({
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
	htmlBuilder: ig,
	mathmlBuilder: (e, t) => {
		var n = Em(e.label);
		return new Y(e.isOver ? "mover" : "munder", [X(e.base, t), n]);
	}
}), q({
	type: "href",
	names: ["\\href"],
	numArgs: 2,
	argTypes: ["url", "original"],
	allowedInText: !0,
	handler: (e, t) => {
		var { parser: n } = e, r = t[1], i = Z(t[0], "url").url;
		return n.settings.isTrusted({
			command: "\\href",
			url: i
		}) ? {
			type: "href",
			mode: n.mode,
			href: i,
			body: Gp(r)
		} : n.formatUnsupportedCmd("\\href");
	},
	htmlBuilder: (e, t) => {
		var n = Xp(e.body, t, !1);
		return Ep(e.href, [], n, t);
	},
	mathmlBuilder: (e, t) => {
		var n = hm(e.body, t);
		return n instanceof Y || (n = new Y("mrow", [n])), n.setAttribute("href", e.href), n;
	}
}), q({
	type: "href",
	names: ["\\url"],
	numArgs: 1,
	argTypes: ["url"],
	allowedInText: !0,
	handler: (e, t) => {
		var { parser: n } = e, r = Z(t[0], "url").url;
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
			body: Gp(s)
		};
	}
}), q({
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
			body: Gp(t[0])
		};
	},
	htmlBuilder(e, t) {
		return Dp(Xp(e.body, t.withFont(""), !1));
	},
	mathmlBuilder(e, t) {
		return new Y("mrow", mm(e.body, t.withFont("")));
	}
}), q({
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
		var { parser: n, funcName: r, token: i } = e, a = Z(t[0], "raw").string, o = t[1];
		n.settings.strict && n.settings.reportNonstrict("htmlExtension", "HTML extension is disabled on strict mode");
		var s, c = {};
		switch (r) {
			case "\\htmlClass":
				c.class = a, s = {
					command: "\\htmlClass",
					class: a
				};
				break;
			case "\\htmlId":
				c.id = a, s = {
					command: "\\htmlId",
					id: a
				};
				break;
			case "\\htmlStyle":
				c.style = a, s = {
					command: "\\htmlStyle",
					style: a
				};
				break;
			case "\\htmlData":
				for (var l = a.split(","), u = 0; u < l.length; u++) {
					var d = l[u], f = d.indexOf("=");
					if (f < 0) throw new M("\\htmlData key/value '" + d + "' missing equals sign");
					var p = d.slice(0, f), m = d.slice(f + 1);
					c["data-" + p.trim()] = m;
				}
				s = {
					command: "\\htmlData",
					attributes: c
				};
				break;
			default: throw Error("Unrecognized html command");
		}
		return n.settings.isTrusted(s) ? {
			type: "html",
			mode: n.mode,
			attributes: c,
			body: Gp(o)
		} : n.formatUnsupportedCmd(r);
	},
	htmlBuilder: (e, t) => {
		var n = Xp(e.body, t, !1), r = ["enclosing"];
		e.attributes.class && r.push(...e.attributes.class.trim().split(/\s+/));
		var i = G(r, n, t);
		for (var a in e.attributes) a !== "class" && e.attributes.hasOwnProperty(a) && i.setAttribute(a, e.attributes[a]);
		return i;
	},
	mathmlBuilder: (e, t) => hm(e.body, t)
}), q({
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
			html: Gp(t[0]),
			mathml: Gp(t[1])
		};
	},
	htmlBuilder: (e, t) => Dp(Xp(e.html, t, !1)),
	mathmlBuilder: (e, t) => hm(e.mathml, t)
});
var ag = function(e) {
	if (/^[-+]? *(\d+(\.\d*)?|\.\d+)$/.test(e)) return {
		number: +e,
		unit: "bp"
	};
	var t = /([-+]?) *(\d+(?:\.\d*)?|\.\d+) *([a-z]{2})/.exec(e);
	if (!t) throw new M("Invalid size: '" + e + "' in \\includegraphics");
	var n = {
		number: +(t[1] + t[2]),
		unit: t[3]
	};
	if (!rf(n)) throw new M("Invalid unit: '" + n.unit + "' in \\includegraphics.");
	return n;
};
q({
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
		}, s = "";
		if (n[0]) for (var c = Z(n[0], "raw").string.split(","), l = 0; l < c.length; l++) {
			var u = c[l].split("=");
			if (u.length === 2) {
				var d = u[1].trim();
				switch (u[0].trim()) {
					case "alt":
						s = d;
						break;
					case "width":
						i = ag(d);
						break;
					case "height":
						a = ag(d);
						break;
					case "totalheight":
						o = ag(d);
						break;
					default: throw new M("Invalid key: '" + u[0] + "' in \\includegraphics.");
				}
			}
		}
		var f = Z(t[0], "url").url;
		return s === "" && (s = f, s = s.replace(/^.*[\\/]/, ""), s = s.substring(0, s.lastIndexOf("."))), r.settings.isTrusted({
			command: "\\includegraphics",
			url: f
		}) ? {
			type: "includegraphics",
			mode: r.mode,
			alt: s,
			width: i,
			height: a,
			totalheight: o,
			src: f
		} : r.formatUnsupportedCmd("\\includegraphics");
	},
	htmlBuilder: (e, t) => {
		var n = af(e.height, t), r = 0;
		e.totalheight.number > 0 && (r = af(e.totalheight, t) - n);
		var i = 0;
		e.width.number > 0 && (i = af(e.width, t));
		var a = { height: P(n + r) };
		i > 0 && (a.width = P(i)), r > 0 && (a.verticalAlign = P(-r));
		var o = new mf(e.src, e.alt, a);
		return o.height = n, o.depth = r, o;
	},
	mathmlBuilder: (e, t) => {
		var n = new Y("mglyph", []);
		n.setAttribute("alt", e.alt);
		var r = af(e.height, t), i = 0;
		if (e.totalheight.number > 0 && (i = af(e.totalheight, t) - r, n.setAttribute("valign", P(-i))), n.setAttribute("height", P(r + i)), e.width.number > 0) {
			var a = af(e.width, t);
			n.setAttribute("width", P(a));
		}
		return n.setAttribute("src", e.src), n;
	}
}), q({
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
		var { parser: n, funcName: r } = e, i = Z(t[0], "size");
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
		return Ap(e.dimension, t);
	},
	mathmlBuilder(e, t) {
		return new om(af(e.dimension, t));
	}
}), q({
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
		e.alignment === "clap" ? (n = G([], [J(e.body, t)]), n = G(["inner"], [n], t)) : n = G(["inner"], [J(e.body, t)]);
		var r = G(["fix"], []), i = G([e.alignment], [n, r], t), a = G(["strut"]);
		return a.style.height = P(i.height + i.depth), i.depth && (a.style.verticalAlign = P(-i.depth)), i.children.unshift(a), i = G(["thinbox"], [i], t), G(["mord", "vbox"], [i], t);
	},
	mathmlBuilder: (e, t) => {
		var n = new Y("mpadded", [X(e.body, t)]);
		if (e.alignment !== "rlap") {
			var r = e.alignment === "llap" ? "-1" : "-0.5";
			n.setAttribute("lspace", r + "width");
		}
		return n.setAttribute("width", "0px"), n;
	}
}), q({
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
}), q({
	type: "text",
	names: ["\\)", "\\]"],
	numArgs: 0,
	allowedInText: !0,
	allowedInMath: !1,
	handler(e, t) {
		throw new M("Mismatched " + e.funcName);
	}
});
var og = (e, t) => {
	switch (t.style.size) {
		case N.DISPLAY.size: return e.display;
		case N.TEXT.size: return e.text;
		case N.SCRIPT.size: return e.script;
		case N.SCRIPTSCRIPT.size: return e.scriptscript;
		default: return e.text;
	}
};
q({
	type: "mathchoice",
	names: ["\\mathchoice"],
	numArgs: 4,
	primitive: !0,
	handler: (e, t) => {
		var { parser: n } = e;
		return {
			type: "mathchoice",
			mode: n.mode,
			display: Gp(t[0]),
			text: Gp(t[1]),
			script: Gp(t[2]),
			scriptscript: Gp(t[3])
		};
	},
	htmlBuilder: (e, t) => Dp(Xp(og(e, t), t, !1)),
	mathmlBuilder: (e, t) => hm(og(e, t), t)
});
var sg = (e, t, n, r, i, a, o) => {
	e = G([], [e]);
	var s = n && pd(n), c, l;
	if (t) {
		var u = J(t, r.havingStyle(i.sup()), r);
		l = {
			elem: u,
			kern: Math.max(r.fontMetrics().bigOpSpacing1, r.fontMetrics().bigOpSpacing3 - u.depth)
		};
	}
	if (n) {
		var d = J(n, r.havingStyle(i.sub()), r);
		c = {
			elem: d,
			kern: Math.max(r.fontMetrics().bigOpSpacing2, r.fontMetrics().bigOpSpacing4 - d.height)
		};
	}
	var f;
	if (l && c) f = K({
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
				marginLeft: P(-a)
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
				marginLeft: P(a)
			},
			{
				type: "kern",
				size: r.fontMetrics().bigOpSpacing5
			}
		]
	});
	else if (c) f = K({
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
				marginLeft: P(-a)
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
	else if (l) f = K({
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
				marginLeft: P(a)
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
		var m = G(["mspace"], [], r);
		m.style.marginRight = P(a), p.unshift(m);
	}
	return G(["mop", "op-limits"], p, r);
}, cg = new Set(["\\smallint"]), lg = (e, t) => {
	var n, r, i = !1, a;
	e.type === "supsub" ? (n = e.sup, r = e.sub, a = Z(e.base, "op"), i = !0) : a = Z(e, "op");
	var o = t.style, s = !1;
	o.size === N.DISPLAY.size && a.symbol && !cg.has(a.name) && (s = !0);
	var c, l;
	if (a.symbol) {
		var u = s ? "Size2-Regular" : "Size1-Regular", d = "";
		if ((a.name === "\\oiint" || a.name === "\\oiiint") && (d = a.name.slice(1), a.name = d === "oiint" ? "\\iint" : "\\iiint"), c = _p(a.name, u, "math", t, [
			"mop",
			"op-symbol",
			s ? "large-op" : "small-op"
		]), l = c.italic, d.length > 0) {
			var f = Pp(d + "Size" + (s ? "2" : "1"), t);
			c = K({
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
		var p = Xp(a.body, t, !0);
		p.length === 1 && p[0] instanceof gf ? (c = p[0], c.classes[0] = "mop") : c = G(["mop"], p, t);
	} else {
		for (var m = [], h = 1; h < a.name.length; h++) m.push(vp(a.name[h], a.mode, t));
		c = G(["mop"], m, t);
	}
	var g = 0, _ = 0;
	return (c instanceof gf || a.name === "\\oiint" || a.name === "\\oiiint") && !a.suppressBaseShift && (g = (c.height - c.depth) / 2 - t.fontMetrics().axisHeight, _ = c.italic ?? 0), i ? sg(c, n, r, t, o, _, g) : (g && (c.style.position = "relative", c.style.top = P(g)), c);
}, ug = (e, t) => {
	var n;
	if (e.symbol) n = new Y("mo", [lm(e.name, e.mode)]), cg.has(e.name) && n.setAttribute("largeop", "false");
	else if (e.body) n = new Y("mo", mm(e.body, t));
	else {
		n = new Y("mi", [new am(e.name.slice(1))]);
		var r = new Y("mo", [lm("⁡", "text")]);
		n = e.parentIsSupSub ? new Y("mrow", [n, r]) : im([n, r]);
	}
	return n;
}, dg = {
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
q({
	type: "op",
	names: /* @__PURE__ */ "\\coprod.\\bigvee.\\bigwedge.\\biguplus.\\bigcap.\\bigcup.\\intop.\\prod.\\sum.\\bigotimes.\\bigoplus.\\bigodot.\\bigsqcup.\\smallint.∏.∐.∑.⋀.⋁.⋂.⋃.⨀.⨁.⨂.⨄.⨆".split("."),
	numArgs: 0,
	handler: (e, t) => {
		var { parser: n, funcName: r } = e, i = r;
		return i.length === 1 && (i = dg[i]), {
			type: "op",
			mode: n.mode,
			limits: !0,
			parentIsSupSub: !1,
			symbol: !0,
			name: i
		};
	},
	htmlBuilder: lg,
	mathmlBuilder: ug
}), q({
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
			body: Gp(r)
		};
	}
});
var fg = {
	"∫": "\\int",
	"∬": "\\iint",
	"∭": "\\iiint",
	"∮": "\\oint",
	"∯": "\\oiint",
	"∰": "\\oiiint"
};
q({
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
}), q({
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
}), q({
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
		return r.length === 1 && (r = fg[r]), {
			type: "op",
			mode: t.mode,
			limits: !1,
			parentIsSupSub: !1,
			symbol: !0,
			name: r
		};
	}
});
var pg = (e, t) => {
	var n, r, i = !1, a;
	e.type === "supsub" ? (n = e.sup, r = e.sub, a = Z(e.base, "operatorname"), i = !0) : a = Z(e, "operatorname");
	var o;
	if (a.body.length > 0) {
		for (var s = Xp(a.body.map((e) => {
			var t = "text" in e ? e.text : void 0;
			return typeof t == "string" ? {
				type: "textord",
				mode: e.mode,
				text: t
			} : e;
		}), t.withFont("mathrm"), !0), c = 0; c < s.length; c++) {
			var l = s[c];
			l instanceof gf && (l.text = l.text.replace(/\u2212/, "-").replace(/\u2217/, "*"));
		}
		o = G(["mop"], s, t);
	} else o = G(["mop"], [], t);
	return i ? sg(o, n, r, t, t.style, 0, 0) : o;
};
q({
	type: "operatorname",
	names: ["\\operatorname@", "\\operatornamewithlimits"],
	numArgs: 1,
	handler: (e, t) => {
		var { parser: n, funcName: r } = e, i = t[0];
		return {
			type: "operatorname",
			mode: n.mode,
			body: Gp(i),
			alwaysHandleSupSub: r === "\\operatornamewithlimits",
			limits: !1,
			parentIsSupSub: !1
		};
	},
	htmlBuilder: pg,
	mathmlBuilder: (e, t) => {
		for (var n = mm(e.body, t.withFont("mathrm")), r = !0, i = 0; i < n.length; i++) {
			var a = n[i];
			if (!(a instanceof om)) if (a instanceof Y) switch (a.type) {
				case "mi":
				case "mn":
				case "mspace":
				case "mtext": break;
				case "mo":
					var o = a.children[0];
					a.children.length === 1 && o instanceof am ? o.text = o.text.replace(/\u2212/, "-").replace(/\u2217/, "*") : r = !1;
					break;
				default: r = !1;
			}
			else r = !1;
		}
		r && (n = [new am(n.map((e) => e.toText()).join(""))]);
		var s = new Y("mi", n);
		s.setAttribute("mathvariant", "normal");
		var c = new Y("mo", [lm("⁡", "text")]);
		return e.parentIsSupSub ? new Y("mrow", [s, c]) : im([s, c]);
	}
}), Q("\\operatorname", "\\@ifstar\\operatornamewithlimits\\operatorname@"), Up({
	type: "ordgroup",
	htmlBuilder(e, t) {
		return e.semisimple ? Dp(Xp(e.body, t, !1)) : G(["mord"], Xp(e.body, t, !0), t);
	},
	mathmlBuilder(e, t) {
		return hm(e.body, t, !0);
	}
}), q({
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
		var n = J(e.body, t.havingCrampedStyle()), r = Tp("overline-line", t), i = t.fontMetrics().defaultRuleThickness;
		return G(["mord", "overline"], [K({
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
		var n = new Y("mo", [new am("‾")]);
		n.setAttribute("stretchy", "true");
		var r = new Y("mover", [X(e.body, t), n]);
		return r.setAttribute("accent", "true"), r;
	}
}), q({
	type: "phantom",
	names: ["\\phantom"],
	numArgs: 1,
	allowedInText: !0,
	handler: (e, t) => {
		var { parser: n } = e, r = t[0];
		return {
			type: "phantom",
			mode: n.mode,
			body: Gp(r)
		};
	},
	htmlBuilder: (e, t) => Dp(Xp(e.body, t.withPhantom(), !1)),
	mathmlBuilder: (e, t) => new Y("mphantom", mm(e.body, t))
}), Q("\\hphantom", "\\smash{\\phantom{#1}}"), q({
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
	htmlBuilder: (e, t) => G(["mord", "rlap"], [G(["inner"], [J(e.body, t.withPhantom())]), G(["fix"], [])], t),
	mathmlBuilder: (e, t) => {
		var n = new Y("mpadded", [new Y("mphantom", mm(Gp(e.body), t))]);
		return n.setAttribute("width", "0px"), n;
	}
}), q({
	type: "raisebox",
	names: ["\\raisebox"],
	numArgs: 2,
	argTypes: ["size", "hbox"],
	allowedInText: !0,
	handler(e, t) {
		var { parser: n } = e, r = Z(t[0], "size").value, i = t[1];
		return {
			type: "raisebox",
			mode: n.mode,
			dy: r,
			body: i
		};
	},
	htmlBuilder(e, t) {
		var n = J(e.body, t);
		return K({
			positionType: "shift",
			positionData: -af(e.dy, t),
			children: [{
				type: "elem",
				elem: n
			}]
		});
	},
	mathmlBuilder(e, t) {
		var n = new Y("mpadded", [X(e.body, t)]), r = e.dy.number + e.dy.unit;
		return n.setAttribute("voffset", r), n;
	}
}), q({
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
}), q({
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
		var { parser: r } = e, i = n[0], a = Z(t[0], "size"), o = Z(t[1], "size");
		return {
			type: "rule",
			mode: r.mode,
			shift: i && Z(i, "size").value,
			width: a.value,
			height: o.value
		};
	},
	htmlBuilder(e, t) {
		var n = G(["mord", "rule"], [], t), r = af(e.width, t), i = af(e.height, t), a = e.shift ? af(e.shift, t) : 0;
		return n.style.borderRightWidth = P(r), n.style.borderTopWidth = P(i), n.style.bottom = P(a), n.width = r, n.height = i + a, n.depth = -a, n.maxFontSize = i * 1.125 * t.sizeMultiplier, n;
	},
	mathmlBuilder(e, t) {
		var n = af(e.width, t), r = af(e.height, t), i = e.shift ? af(e.shift, t) : 0, a = t.color && t.getColor() || "black", o = new Y("mspace");
		o.setAttribute("mathbackground", a), o.setAttribute("width", P(n)), o.setAttribute("height", P(r));
		var s = new Y("mpadded", [o]);
		return i >= 0 ? s.setAttribute("height", P(i)) : (s.setAttribute("height", P(i)), s.setAttribute("depth", P(-i))), s.setAttribute("voffset", P(i)), s;
	}
});
function mg(e, t, n) {
	for (var r = Xp(e, t, !1), i = t.sizeMultiplier / n.sizeMultiplier, a = 0; a < r.length; a++) {
		var o = r[a].classes.indexOf("sizing");
		o < 0 ? Array.prototype.push.apply(r[a].classes, t.sizingClasses(n)) : r[a].classes[o + 1] === "reset-size" + t.size && (r[a].classes[o + 1] = "reset-size" + n.size), r[a].height *= i, r[a].depth *= i;
	}
	return Dp(r);
}
var hg = [
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
q({
	type: "sizing",
	names: hg,
	numArgs: 0,
	allowedInText: !0,
	handler: (e, t) => {
		var { breakOnTokenText: n, funcName: r, parser: i } = e, a = i.parseExpression(!1, n);
		return {
			type: "sizing",
			mode: i.mode,
			size: hg.indexOf(r) + 1,
			body: a
		};
	},
	htmlBuilder: (e, t) => {
		var n = t.havingSize(e.size);
		return mg(e.body, n, t);
	},
	mathmlBuilder: (e, t) => {
		var n = t.havingSize(e.size), r = new Y("mstyle", mm(e.body, n));
		return r.setAttribute("mathsize", P(n.sizeMultiplier)), r;
	}
}), q({
	type: "smash",
	names: ["\\smash"],
	numArgs: 1,
	numOptionalArgs: 1,
	allowedInText: !0,
	handler: (e, t, n) => {
		var { parser: r } = e, i = !1, a = !1, o = n[0] && Z(n[0], "ordgroup");
		if (o) for (var s, c = 0; c < o.body.length; ++c) {
			var l = o.body[c];
			if (s = Pm(l).text, s === "t") i = !0;
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
		var n = G([], [J(e.body, t)]);
		if (!e.smashHeight && !e.smashDepth) return n;
		if (e.smashHeight && (n.height = 0), e.smashDepth && (n.depth = 0), e.smashHeight && e.smashDepth) return G(["mord", "smash"], [n], t);
		if (n.children) for (var r = 0; r < n.children.length; r++) e.smashHeight && (n.children[r].height = 0), e.smashDepth && (n.children[r].depth = 0);
		return G(["mord"], [K({
			positionType: "firstBaseline",
			children: [{
				type: "elem",
				elem: n
			}]
		})], t);
	},
	mathmlBuilder: (e, t) => {
		var n = new Y("mpadded", [X(e.body, t)]);
		return e.smashHeight && n.setAttribute("height", "0px"), e.smashDepth && n.setAttribute("depth", "0px"), n;
	}
}), q({
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
		var n = J(e.body, t.havingCrampedStyle());
		n.height === 0 && (n.height = t.fontMetrics().xHeight), n = Op(n, t);
		var r = t.fontMetrics().defaultRuleThickness, i = r;
		t.style.id < N.TEXT.id && (i = t.fontMetrics().xHeight);
		var a = r + i / 4, { span: o, ruleWidth: s, advanceWidth: c } = gh(n.height + n.depth + a + r, t), l = o.height - s;
		l > n.height + n.depth + a && (a = (a + l - n.height - n.depth) / 2);
		var u = o.height - n.height - a - s;
		n.style.paddingLeft = P(c);
		var d = K({
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
			var f = t.havingStyle(N.SCRIPTSCRIPT), p = J(e.index, f, t);
			return G(["mord", "sqrt"], [G(["root"], [K({
				positionType: "shift",
				positionData: -(.6 * (d.height - d.depth)),
				children: [{
					type: "elem",
					elem: p
				}]
			})]), d], t);
		} else return G(["mord", "sqrt"], [d], t);
	},
	mathmlBuilder(e, t) {
		var { body: n, index: r } = e;
		return r ? new Y("mroot", [X(n, t), X(r, t)]) : new Y("msqrt", [X(n, t)]);
	}
});
var gg = {
	display: N.DISPLAY,
	text: N.TEXT,
	script: N.SCRIPT,
	scriptscript: N.SCRIPTSCRIPT
};
function _g(e) {
	return e in gg;
}
q({
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
		if (!_g(o)) throw Error("Unknown style: " + o);
		return {
			type: "styling",
			mode: i.mode,
			style: o,
			body: a
		};
	},
	htmlBuilder(e, t) {
		var n = gg[e.style], r = t.havingStyle(n);
		return e.resetFont && (r = r.withFont("")), mg(e.body, r, t);
	},
	mathmlBuilder(e, t) {
		var n = gg[e.style], r = t.havingStyle(n);
		e.resetFont && (r = r.withFont(""));
		var i = new Y("mstyle", mm(e.body, r)), a = {
			display: ["0", "true"],
			text: ["0", "false"],
			script: ["1", "false"],
			scriptscript: ["2", "false"]
		}[e.style];
		return i.setAttribute("scriptlevel", a[0]), i.setAttribute("displaystyle", a[1]), i;
	}
});
var vg = function(e, t) {
	var n = e.base;
	return n ? n.type === "op" ? n.limits && (t.style.size === N.DISPLAY.size || n.alwaysHandleSupSub) ? lg : null : n.type === "operatorname" ? n.alwaysHandleSupSub && (t.style.size === N.DISPLAY.size || n.limits) ? pg : null : n.type === "accent" ? pd(n.base) ? Lm : null : n.type === "horizBrace" && !e.sub === n.isOver ? ig : null : null;
};
Up({
	type: "supsub",
	htmlBuilder(e, t) {
		var n = vg(e, t);
		if (n) return n(e, t);
		var { base: r, sup: i, sub: a } = e, o = J(r, t), s, c, l = t.fontMetrics(), u = 0, d = 0, f = r && pd(r);
		if (i) {
			var p = t.havingStyle(t.style.sup());
			s = J(i, p, t), f || (u = o.height - p.fontMetrics().supDrop * p.sizeMultiplier / t.sizeMultiplier);
		}
		if (a) {
			var m = t.havingStyle(t.style.sub());
			c = J(a, m, t), f || (d = o.depth + m.fontMetrics().subDrop * m.sizeMultiplier / t.sizeMultiplier);
		}
		var h = t.style === N.DISPLAY ? l.sup1 : t.style.cramped ? l.sup3 : l.sup2, g = t.sizeMultiplier, _ = P(.5 / l.ptPerEm / g), v = null;
		if (c) {
			var y = e.base && e.base.type === "op" && e.base.name && (e.base.name === "\\oiint" || e.base.name === "\\oiiint");
			(o instanceof gf || y) && (v = P(-(o.italic ?? 0)));
		}
		var b;
		if (s && c) {
			u = Math.max(u, h, s.depth + .25 * l.xHeight), d = Math.max(d, l.sub2);
			var x = 4 * l.defaultRuleThickness;
			if (u - s.depth - (c.height - d) < x) {
				d = x - (u - s.depth) + c.height;
				var S = .8 * l.xHeight - (u - s.depth);
				S > 0 && (u += S, d -= S);
			}
			b = K({
				positionType: "individualShift",
				children: [{
					type: "elem",
					elem: c,
					shift: d,
					marginRight: _,
					marginLeft: v
				}, {
					type: "elem",
					elem: s,
					shift: -u,
					marginRight: _
				}]
			});
		} else if (c) d = Math.max(d, l.sub1, c.height - .8 * l.xHeight), b = K({
			positionType: "shift",
			positionData: d,
			children: [{
				type: "elem",
				elem: c,
				marginLeft: v,
				marginRight: _
			}]
		});
		else if (s) u = Math.max(u, h, s.depth + .25 * l.xHeight), b = K({
			positionType: "shift",
			positionData: -u,
			children: [{
				type: "elem",
				elem: s,
				marginRight: _
			}]
		});
		else throw Error("supsub must have either sup or sub.");
		return G([em(o, "right") || "mord"], [o, G(["msupsub"], [b])], t);
	},
	mathmlBuilder(e, t) {
		var n = !1, r, i;
		e.base && e.base.type === "horizBrace" && (i = !!e.sup, i === e.base.isOver && (n = !0, r = e.base.isOver)), e.base && (e.base.type === "op" || e.base.type === "operatorname") && (e.base.parentIsSupSub = !0);
		var a = [X(e.base, t)];
		e.sub && a.push(X(e.sub, t)), e.sup && a.push(X(e.sup, t));
		var o;
		if (n) o = r ? "mover" : "munder";
		else if (!e.sub) {
			var s = e.base;
			o = s && s.type === "op" && s.limits && (t.style === N.DISPLAY || s.alwaysHandleSupSub) || s && s.type === "operatorname" && s.alwaysHandleSupSub && (s.limits || t.style === N.DISPLAY) ? "mover" : "msup";
		} else if (e.sup) {
			var c = e.base;
			o = c && c.type === "op" && c.limits && t.style === N.DISPLAY || c && c.type === "operatorname" && c.alwaysHandleSupSub && (t.style === N.DISPLAY || c.limits) ? "munderover" : "msubsup";
		} else {
			var l = e.base;
			o = l && l.type === "op" && l.limits && (t.style === N.DISPLAY || l.alwaysHandleSupSub) || l && l.type === "operatorname" && l.alwaysHandleSupSub && (l.limits || t.style === N.DISPLAY) ? "munder" : "msub";
		}
		return new Y(o, a);
	}
}), Up({
	type: "atom",
	htmlBuilder(e, t) {
		return vp(e.text, e.mode, t, ["m" + e.family]);
	},
	mathmlBuilder(e, t) {
		var n = new Y("mo", [lm(e.text, e.mode)]);
		if (e.family === "bin") {
			var r = fm(e, t);
			r === "bold-italic" && n.setAttribute("mathvariant", r);
		} else e.family === "punct" ? n.setAttribute("separator", "true") : (e.family === "open" || e.family === "close") && n.setAttribute("stretchy", "false");
		return n;
	}
});
var yg = {
	mi: "italic",
	mn: "normal",
	mtext: "normal"
};
Up({
	type: "mathord",
	htmlBuilder(e, t) {
		return bp(e, t);
	},
	mathmlBuilder(e, t) {
		var n = new Y("mi", [lm(e.text, e.mode, t)]), r = fm(e, t) || "italic";
		return r !== yg[n.type] && n.setAttribute("mathvariant", r), n;
	}
}), Up({
	type: "textord",
	htmlBuilder(e, t) {
		return bp(e, t);
	},
	mathmlBuilder(e, t) {
		var n = lm(e.text, e.mode, t), r = fm(e, t) || "normal", i = e.mode === "text" ? new Y("mtext", [n]) : /[0-9]/.test(e.text) ? new Y("mn", [n]) : e.text === "\\prime" ? new Y("mo", [n]) : new Y("mi", [n]);
		return r !== yg[i.type] && i.setAttribute("mathvariant", r), i;
	}
});
var bg = {
	"\\nobreak": "nobreak",
	"\\allowbreak": "allowbreak"
}, xg = {
	" ": {},
	"\\ ": {},
	"~": { className: "nobreak" },
	"\\space": {},
	"\\nobreakspace": { className: "nobreak" }
};
Up({
	type: "spacing",
	htmlBuilder(e, t) {
		if (xg.hasOwnProperty(e.text)) {
			var n = xg[e.text].className || "";
			if (e.mode === "text") {
				var r = bp(e, t);
				return r.classes.push(n), r;
			} else return G(["mspace", n], [vp(e.text, e.mode, t)], t);
		} else if (bg.hasOwnProperty(e.text)) return G(["mspace", bg[e.text]], [], t);
		else throw new M("Unknown type of space \"" + e.text + "\"");
	},
	mathmlBuilder(e, t) {
		var n;
		if (xg.hasOwnProperty(e.text)) n = new Y("mtext", [new am("\xA0")]);
		else if (bg.hasOwnProperty(e.text)) return new Y("mspace");
		else throw new M("Unknown type of space \"" + e.text + "\"");
		return n;
	}
});
var Sg = () => {
	var e = new Y("mtd", []);
	return e.setAttribute("width", "50%"), e;
};
Up({
	type: "tag",
	mathmlBuilder(e, t) {
		var n = new Y("mtable", [new Y("mtr", [
			Sg(),
			new Y("mtd", [hm(e.body, t)]),
			Sg(),
			new Y("mtd", [hm(e.tag, t)])
		])]);
		return n.setAttribute("width", "100%"), n;
	}
});
var Cg = {
	"\\text": void 0,
	"\\textrm": "textrm",
	"\\textsf": "textsf",
	"\\texttt": "texttt",
	"\\textnormal": "textrm"
}, wg = {
	"\\textbf": "textbf",
	"\\textmd": "textmd"
}, Tg = {
	"\\textit": "textit",
	"\\textup": "textup"
}, Eg = (e, t) => {
	var n = e.font;
	return n ? Cg[n] ? t.withTextFontFamily(Cg[n]) : wg[n] ? t.withTextFontWeight(wg[n]) : n === "\\emph" ? t.fontShape === "textit" ? t.withTextFontShape("textup") : t.withTextFontShape("textit") : t.withTextFontShape(Tg[n]) : t;
};
q({
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
			body: Gp(i),
			font: r
		};
	},
	htmlBuilder(e, t) {
		var n = Eg(e, t);
		return G(["mord", "text"], Xp(e.body, n, !0), n);
	},
	mathmlBuilder(e, t) {
		var n = Eg(e, t);
		return hm(e.body, n);
	}
}), q({
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
		var n = J(e.body, t), r = Tp("underline-line", t), i = t.fontMetrics().defaultRuleThickness;
		return G(["mord", "underline"], [K({
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
		var n = new Y("mo", [new am("‾")]);
		n.setAttribute("stretchy", "true");
		var r = new Y("munder", [X(e.body, t), n]);
		return r.setAttribute("accentunder", "true"), r;
	}
}), q({
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
		var n = J(e.body, t), r = t.fontMetrics().axisHeight;
		return K({
			positionType: "shift",
			positionData: .5 * (n.height - r - (n.depth + r)),
			children: [{
				type: "elem",
				elem: n
			}]
		});
	},
	mathmlBuilder(e, t) {
		return new Y("mrow", [new Y("mpadded", [X(e.body, t)], ["vcenter"])]);
	}
}), q({
	type: "verb",
	names: ["\\verb"],
	numArgs: 0,
	allowedInText: !0,
	handler(e, t, n) {
		throw new M("\\verb ended by end of line instead of matching delimiter");
	},
	htmlBuilder(e, t) {
		for (var n = Dg(e), r = [], i = t.havingStyle(t.style.text()), a = 0; a < n.length; a++) {
			var o = n[a];
			o === "~" && (o = "\\textasciitilde"), r.push(_p(o, "Typewriter-Regular", e.mode, i, ["mord", "texttt"]));
		}
		return G(["mord", "text"].concat(i.sizingClasses(t)), Sp(r), i);
	},
	mathmlBuilder(e, t) {
		var n = new Y("mtext", [new am(Dg(e))]);
		return n.setAttribute("mathvariant", "monospace"), n;
	}
});
var Dg = (e) => e.body.replace(/ /g, e.star ? "␣" : "\xA0"), Og = Bp, kg = "[ \r\n	]", Ag = "\\\\[a-zA-Z@]+", jg = "\\\\[^\ud800-\udfff]", Mg = "(" + Ag + ")" + kg + "*", Ng = "\\\\(\n|[ \r	]+\n?)[ \r	]*", Pg = "[̀-ͯ]", Fg = RegExp(Pg + "+$"), Ig = "(" + kg + "+)|" + (Ng + "|") + "([!-\\[\\]-‧‪-퟿豈-￿]" + (Pg + "*") + "|[\ud800-\udbff][\udc00-\udfff]" + (Pg + "*") + "|\\\\verb\\*([^]).*?\\4|\\\\verb([^*a-zA-Z]).*?\\5" + ("|" + Mg) + ("|" + jg + ")"), Lg = class {
	constructor(e, t) {
		this.input = void 0, this.settings = void 0, this.tokenRegex = void 0, this.catcodes = void 0, this.input = e, this.settings = t, this.tokenRegex = new RegExp(Ig, "g"), this.catcodes = {
			"%": 14,
			"~": 13
		};
	}
	setCatcode(e, t) {
		this.catcodes[e] = t;
	}
	lex() {
		var e = this.input, t = this.tokenRegex.lastIndex;
		if (t === e.length) return new Rh("EOF", new Lh(this, t, t));
		var n = this.tokenRegex.exec(e);
		if (n === null || n.index !== t) throw new M("Unexpected character: '" + e[t] + "'", new Rh(e[t], new Lh(this, t, t + 1)));
		var r = n[6] || n[3] || (n[2] ? "\\ " : " ");
		if (this.catcodes[r] === 14) {
			var i = e.indexOf("\n", this.tokenRegex.lastIndex);
			return i === -1 ? (this.tokenRegex.lastIndex = e.length, this.settings.reportNonstrict("commentAtEnd", "% comment has no terminating newline; LaTeX would fail because of commenting the end of math mode (e.g. $)")) : this.tokenRegex.lastIndex = i + 1, this.lex();
		}
		return new Rh(r, new Lh(this, t, this.tokenRegex.lastIndex));
	}
}, Rg = class {
	constructor(e, t) {
		e === void 0 && (e = {}), t === void 0 && (t = {}), this.current = void 0, this.builtins = void 0, this.undefStack = void 0, this.current = t, this.builtins = e, this.undefStack = [];
	}
	beginGroup() {
		this.undefStack.push({});
	}
	endGroup() {
		if (this.undefStack.length === 0) throw new M("Unbalanced namespace destruction: attempt to pop global namespace; please report this as a bug");
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
}, zg = Ih;
Q("\\noexpand", function(e) {
	var t = e.popToken();
	return e.isExpandable(t.text) && (t.noexpand = !0, t.treatAsRelax = !0), {
		tokens: [t],
		numArgs: 0
	};
}), Q("\\expandafter", function(e) {
	var t = e.popToken();
	return e.expandOnce(!0), {
		tokens: [t],
		numArgs: 0
	};
}), Q("\\@firstoftwo", function(e) {
	return {
		tokens: e.consumeArgs(2)[0],
		numArgs: 0
	};
}), Q("\\@secondoftwo", function(e) {
	return {
		tokens: e.consumeArgs(2)[1],
		numArgs: 0
	};
}), Q("\\@ifnextchar", function(e) {
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
}), Q("\\@ifstar", "\\@ifnextchar *{\\@firstoftwo{#1}}"), Q("\\TextOrMath", function(e) {
	var t = e.consumeArgs(2);
	return e.mode === "text" ? {
		tokens: t[0],
		numArgs: 0
	} : {
		tokens: t[1],
		numArgs: 0
	};
});
var Bg = {
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
Q("\\char", function(e) {
	var t = e.popToken(), n, r = 0;
	if (t.text === "'") n = 8, t = e.popToken();
	else if (t.text === "\"") n = 16, t = e.popToken();
	else if (t.text === "`") if (t = e.popToken(), t.text[0] === "\\") r = t.text.charCodeAt(1);
	else if (t.text === "EOF") throw new M("\\char` missing argument");
	else r = t.text.charCodeAt(0);
	else n = 10;
	if (n) {
		if (r = Bg[t.text], r == null || r >= n) throw new M("Invalid base-" + n + " digit " + t.text);
		for (var i; (i = Bg[e.future().text]) != null && i < n;) r *= n, r += i, e.popToken();
	}
	return "\\@char{" + r + "}";
});
var Vg = (e, t, n, r) => {
	var i = e.consumeArg().tokens;
	if (i.length !== 1) throw new M("\\newcommand's first argument must be a macro name");
	var a = i[0].text, o = e.isDefined(a);
	if (o && !t) throw new M("\\newcommand{" + a + "} attempting to redefine " + (a + "; use \\renewcommand"));
	if (!o && !n) throw new M("\\renewcommand{" + a + "} when command " + a + " does not yet exist; use \\newcommand");
	var s = 0;
	if (i = e.consumeArg().tokens, i.length === 1 && i[0].text === "[") {
		for (var c = "", l = e.expandNextToken(); l.text !== "]" && l.text !== "EOF";) c += l.text, l = e.expandNextToken();
		if (!c.match(/^\s*[0-9]+\s*$/)) throw new M("Invalid number of arguments: " + c);
		s = parseInt(c), i = e.consumeArg().tokens;
	}
	return o && r || e.macros.set(a, {
		tokens: i,
		numArgs: s
	}), "";
};
Q("\\newcommand", (e) => Vg(e, !1, !0, !1)), Q("\\renewcommand", (e) => Vg(e, !0, !1, !1)), Q("\\providecommand", (e) => Vg(e, !0, !0, !0)), Q("\\message", (e) => {
	var t = e.consumeArgs(1)[0];
	return console.log(t.reverse().map((e) => e.text).join("")), "";
}), Q("\\errmessage", (e) => {
	var t = e.consumeArgs(1)[0];
	return console.error(t.reverse().map((e) => e.text).join("")), "";
}), Q("\\show", (e) => {
	var t = e.popToken(), n = t.text;
	return console.log(t, e.macros.get(n), Og[n], Af.math[n], Af.text[n]), "";
}), Q("\\bgroup", "{"), Q("\\egroup", "}"), Q("~", "\\nobreakspace"), Q("\\lq", "`"), Q("\\rq", "'"), Q("\\aa", "\\r a"), Q("\\AA", "\\r A"), Q("\\textcopyright", "\\html@mathml{\\textcircled{c}}{\\char`©}"), Q("\\copyright", "\\TextOrMath{\\textcopyright}{\\text{\\textcopyright}}"), Q("\\textregistered", "\\html@mathml{\\textcircled{\\scriptsize R}}{\\char`®}"), Q("ℬ", "\\mathscr{B}"), Q("ℰ", "\\mathscr{E}"), Q("ℱ", "\\mathscr{F}"), Q("ℋ", "\\mathscr{H}"), Q("ℐ", "\\mathscr{I}"), Q("ℒ", "\\mathscr{L}"), Q("ℳ", "\\mathscr{M}"), Q("ℛ", "\\mathscr{R}"), Q("ℭ", "\\mathfrak{C}"), Q("ℌ", "\\mathfrak{H}"), Q("ℨ", "\\mathfrak{Z}"), Q("\\Bbbk", "\\Bbb{k}"), Q("\\llap", "\\mathllap{\\textrm{#1}}"), Q("\\rlap", "\\mathrlap{\\textrm{#1}}"), Q("\\clap", "\\mathclap{\\textrm{#1}}"), Q("\\mathstrut", "\\vphantom{(}"), Q("\\underbar", "\\underline{\\text{#1}}"), Q("\\not", "\\html@mathml{\\mathrel{\\mathrlap\\@not}\\nobreak}{\\char\"338}"), Q("\\neq", "\\html@mathml{\\mathrel{\\not=}}{\\mathrel{\\char`≠}}"), Q("\\ne", "\\neq"), Q("≠", "\\neq"), Q("\\notin", "\\html@mathml{\\mathrel{{\\in}\\mathllap{/\\mskip1mu}}}{\\mathrel{\\char`∉}}"), Q("∉", "\\notin"), Q("≘", "\\html@mathml{\\mathrel{=\\kern{-1em}\\raisebox{0.4em}{$\\scriptsize\\frown$}}}{\\mathrel{\\char`≘}}"), Q("≙", "\\html@mathml{\\stackrel{\\tiny\\wedge}{=}}{\\mathrel{\\char`≘}}"), Q("≚", "\\html@mathml{\\stackrel{\\tiny\\vee}{=}}{\\mathrel{\\char`≚}}"), Q("≛", "\\html@mathml{\\stackrel{\\scriptsize\\star}{=}}{\\mathrel{\\char`≛}}"), Q("≝", "\\html@mathml{\\stackrel{\\tiny\\mathrm{def}}{=}}{\\mathrel{\\char`≝}}"), Q("≞", "\\html@mathml{\\stackrel{\\tiny\\mathrm{m}}{=}}{\\mathrel{\\char`≞}}"), Q("≟", "\\html@mathml{\\stackrel{\\tiny?}{=}}{\\mathrel{\\char`≟}}"), Q("⟂", "\\perp"), Q("‼", "\\mathclose{!\\mkern-0.8mu!}"), Q("∌", "\\notni"), Q("⌜", "\\ulcorner"), Q("⌝", "\\urcorner"), Q("⌞", "\\llcorner"), Q("⌟", "\\lrcorner"), Q("©", "\\copyright"), Q("®", "\\textregistered"), Q("\\ulcorner", "\\html@mathml{\\@ulcorner}{\\mathop{\\char\"231c}}"), Q("\\urcorner", "\\html@mathml{\\@urcorner}{\\mathop{\\char\"231d}}"), Q("\\llcorner", "\\html@mathml{\\@llcorner}{\\mathop{\\char\"231e}}"), Q("\\lrcorner", "\\html@mathml{\\@lrcorner}{\\mathop{\\char\"231f}}"), Q("\\vdots", "{\\varvdots\\rule{0pt}{15pt}}"), Q("⋮", "\\vdots"), Q("\\varGamma", "\\mathit{\\Gamma}"), Q("\\varDelta", "\\mathit{\\Delta}"), Q("\\varTheta", "\\mathit{\\Theta}"), Q("\\varLambda", "\\mathit{\\Lambda}"), Q("\\varXi", "\\mathit{\\Xi}"), Q("\\varPi", "\\mathit{\\Pi}"), Q("\\varSigma", "\\mathit{\\Sigma}"), Q("\\varUpsilon", "\\mathit{\\Upsilon}"), Q("\\varPhi", "\\mathit{\\Phi}"), Q("\\varPsi", "\\mathit{\\Psi}"), Q("\\varOmega", "\\mathit{\\Omega}"), Q("\\substack", "\\begin{subarray}{c}#1\\end{subarray}"), Q("\\colon", "\\nobreak\\mskip2mu\\mathpunct{}\\mathchoice{\\mkern-3mu}{\\mkern-3mu}{}{}{:}\\mskip6mu\\relax"), Q("\\boxed", "\\fbox{$\\displaystyle{#1}$}"), Q("\\iff", "\\DOTSB\\;\\Longleftrightarrow\\;"), Q("\\implies", "\\DOTSB\\;\\Longrightarrow\\;"), Q("\\impliedby", "\\DOTSB\\;\\Longleftarrow\\;"), Q("\\dddot", "{\\overset{\\raisebox{-0.1ex}{\\normalsize ...}}{#1}}"), Q("\\ddddot", "{\\overset{\\raisebox{-0.1ex}{\\normalsize ....}}{#1}}");
var Hg = {
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
}, Ug = new Set(["bin", "rel"]);
Q("\\dots", function(e) {
	var t = "\\dotso", n = e.expandAfterFuture().text;
	return n in Hg ? t = Hg[n] : (n.slice(0, 4) === "\\not" || n in Af.math && Ug.has(Af.math[n].group)) && (t = "\\dotsb"), t;
});
var Wg = {
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
Q("\\dotso", function(e) {
	return e.future().text in Wg ? "\\ldots\\," : "\\ldots";
}), Q("\\dotsc", function(e) {
	var t = e.future().text;
	return t in Wg && t !== "," ? "\\ldots\\," : "\\ldots";
}), Q("\\cdots", function(e) {
	return e.future().text in Wg ? "\\@cdots\\," : "\\@cdots";
}), Q("\\dotsb", "\\cdots"), Q("\\dotsm", "\\cdots"), Q("\\dotsi", "\\!\\cdots"), Q("\\dotsx", "\\ldots\\,"), Q("\\DOTSI", "\\relax"), Q("\\DOTSB", "\\relax"), Q("\\DOTSX", "\\relax"), Q("\\tmspace", "\\TextOrMath{\\kern#1#3}{\\mskip#1#2}\\relax"), Q("\\,", "\\tmspace+{3mu}{.1667em}"), Q("\\thinspace", "\\,"), Q("\\>", "\\mskip{4mu}"), Q("\\:", "\\tmspace+{4mu}{.2222em}"), Q("\\medspace", "\\:"), Q("\\;", "\\tmspace+{5mu}{.2777em}"), Q("\\thickspace", "\\;"), Q("\\!", "\\tmspace-{3mu}{.1667em}"), Q("\\negthinspace", "\\!"), Q("\\negmedspace", "\\tmspace-{4mu}{.2222em}"), Q("\\negthickspace", "\\tmspace-{5mu}{.277em}"), Q("\\enspace", "\\kern.5em "), Q("\\enskip", "\\hskip.5em\\relax"), Q("\\quad", "\\hskip1em\\relax"), Q("\\qquad", "\\hskip2em\\relax"), Q("\\tag", "\\@ifstar\\tag@literal\\tag@paren"), Q("\\tag@paren", "\\tag@literal{({#1})}"), Q("\\tag@literal", (e) => {
	if (e.macros.get("\\df@tag")) throw new M("Multiple \\tag");
	return "\\gdef\\df@tag{\\text{#1}}";
}), Q("\\bmod", "\\mathchoice{\\mskip1mu}{\\mskip1mu}{\\mskip5mu}{\\mskip5mu}\\mathbin{\\rm mod}\\mathchoice{\\mskip1mu}{\\mskip1mu}{\\mskip5mu}{\\mskip5mu}"), Q("\\pod", "\\allowbreak\\mathchoice{\\mkern18mu}{\\mkern8mu}{\\mkern8mu}{\\mkern8mu}(#1)"), Q("\\pmod", "\\pod{{\\rm mod}\\mkern6mu#1}"), Q("\\mod", "\\allowbreak\\mathchoice{\\mkern18mu}{\\mkern12mu}{\\mkern12mu}{\\mkern12mu}{\\rm mod}\\,\\,#1"), Q("\\newline", "\\\\\\relax"), Q("\\TeX", "\\textrm{\\html@mathml{T\\kern-.1667em\\raisebox{-.5ex}{E}\\kern-.125emX}{TeX}}");
var Gg = P(Cf["Main-Regular"][84][1] - .7 * Cf["Main-Regular"][65][1]);
Q("\\LaTeX", "\\textrm{\\html@mathml{" + ("L\\kern-.36em\\raisebox{" + Gg + "}{\\scriptstyle A}") + "\\kern-.15em\\TeX}{LaTeX}}"), Q("\\KaTeX", "\\textrm{\\html@mathml{" + ("K\\kern-.17em\\raisebox{" + Gg + "}{\\scriptstyle A}") + "\\kern-.15em\\TeX}{KaTeX}}"), Q("\\hspace", "\\@ifstar\\@hspacer\\@hspace"), Q("\\@hspace", "\\hskip #1\\relax"), Q("\\@hspacer", "\\rule{0pt}{0pt}\\hskip #1\\relax"), Q("\\ordinarycolon", ":"), Q("\\vcentcolon", "\\mathrel{\\mathop\\ordinarycolon}"), Q("\\dblcolon", "\\html@mathml{\\mathrel{\\vcentcolon\\mathrel{\\mkern-.9mu}\\vcentcolon}}{\\mathop{\\char\"2237}}"), Q("\\coloneqq", "\\html@mathml{\\mathrel{\\vcentcolon\\mathrel{\\mkern-1.2mu}=}}{\\mathop{\\char\"2254}}"), Q("\\Coloneqq", "\\html@mathml{\\mathrel{\\dblcolon\\mathrel{\\mkern-1.2mu}=}}{\\mathop{\\char\"2237\\char\"3d}}"), Q("\\coloneq", "\\html@mathml{\\mathrel{\\vcentcolon\\mathrel{\\mkern-1.2mu}\\mathrel{-}}}{\\mathop{\\char\"3a\\char\"2212}}"), Q("\\Coloneq", "\\html@mathml{\\mathrel{\\dblcolon\\mathrel{\\mkern-1.2mu}\\mathrel{-}}}{\\mathop{\\char\"2237\\char\"2212}}"), Q("\\eqqcolon", "\\html@mathml{\\mathrel{=\\mathrel{\\mkern-1.2mu}\\vcentcolon}}{\\mathop{\\char\"2255}}"), Q("\\Eqqcolon", "\\html@mathml{\\mathrel{=\\mathrel{\\mkern-1.2mu}\\dblcolon}}{\\mathop{\\char\"3d\\char\"2237}}"), Q("\\eqcolon", "\\html@mathml{\\mathrel{\\mathrel{-}\\mathrel{\\mkern-1.2mu}\\vcentcolon}}{\\mathop{\\char\"2239}}"), Q("\\Eqcolon", "\\html@mathml{\\mathrel{\\mathrel{-}\\mathrel{\\mkern-1.2mu}\\dblcolon}}{\\mathop{\\char\"2212\\char\"2237}}"), Q("\\colonapprox", "\\html@mathml{\\mathrel{\\vcentcolon\\mathrel{\\mkern-1.2mu}\\approx}}{\\mathop{\\char\"3a\\char\"2248}}"), Q("\\Colonapprox", "\\html@mathml{\\mathrel{\\dblcolon\\mathrel{\\mkern-1.2mu}\\approx}}{\\mathop{\\char\"2237\\char\"2248}}"), Q("\\colonsim", "\\html@mathml{\\mathrel{\\vcentcolon\\mathrel{\\mkern-1.2mu}\\sim}}{\\mathop{\\char\"3a\\char\"223c}}"), Q("\\Colonsim", "\\html@mathml{\\mathrel{\\dblcolon\\mathrel{\\mkern-1.2mu}\\sim}}{\\mathop{\\char\"2237\\char\"223c}}"), Q("∷", "\\dblcolon"), Q("∹", "\\eqcolon"), Q("≔", "\\coloneqq"), Q("≕", "\\eqqcolon"), Q("⩴", "\\Coloneqq"), Q("\\ratio", "\\vcentcolon"), Q("\\coloncolon", "\\dblcolon"), Q("\\colonequals", "\\coloneqq"), Q("\\coloncolonequals", "\\Coloneqq"), Q("\\equalscolon", "\\eqqcolon"), Q("\\equalscoloncolon", "\\Eqqcolon"), Q("\\colonminus", "\\coloneq"), Q("\\coloncolonminus", "\\Coloneq"), Q("\\minuscolon", "\\eqcolon"), Q("\\minuscoloncolon", "\\Eqcolon"), Q("\\coloncolonapprox", "\\Colonapprox"), Q("\\coloncolonsim", "\\Colonsim"), Q("\\simcolon", "\\mathrel{\\sim\\mathrel{\\mkern-1.2mu}\\vcentcolon}"), Q("\\simcoloncolon", "\\mathrel{\\sim\\mathrel{\\mkern-1.2mu}\\dblcolon}"), Q("\\approxcolon", "\\mathrel{\\approx\\mathrel{\\mkern-1.2mu}\\vcentcolon}"), Q("\\approxcoloncolon", "\\mathrel{\\approx\\mathrel{\\mkern-1.2mu}\\dblcolon}"), Q("\\notni", "\\html@mathml{\\not\\ni}{\\mathrel{\\char`∌}}"), Q("\\limsup", "\\DOTSB\\operatorname*{lim\\,sup}"), Q("\\liminf", "\\DOTSB\\operatorname*{lim\\,inf}"), Q("\\injlim", "\\DOTSB\\operatorname*{inj\\,lim}"), Q("\\projlim", "\\DOTSB\\operatorname*{proj\\,lim}"), Q("\\varlimsup", "\\DOTSB\\operatorname*{\\overline{lim}}"), Q("\\varliminf", "\\DOTSB\\operatorname*{\\underline{lim}}"), Q("\\varinjlim", "\\DOTSB\\operatorname*{\\underrightarrow{lim}}"), Q("\\varprojlim", "\\DOTSB\\operatorname*{\\underleftarrow{lim}}"), Q("\\gvertneqq", "\\html@mathml{\\@gvertneqq}{≩}"), Q("\\lvertneqq", "\\html@mathml{\\@lvertneqq}{≨}"), Q("\\ngeqq", "\\html@mathml{\\@ngeqq}{≱}"), Q("\\ngeqslant", "\\html@mathml{\\@ngeqslant}{≱}"), Q("\\nleqq", "\\html@mathml{\\@nleqq}{≰}"), Q("\\nleqslant", "\\html@mathml{\\@nleqslant}{≰}"), Q("\\nshortmid", "\\html@mathml{\\@nshortmid}{∤}"), Q("\\nshortparallel", "\\html@mathml{\\@nshortparallel}{∦}"), Q("\\nsubseteqq", "\\html@mathml{\\@nsubseteqq}{⊈}"), Q("\\nsupseteqq", "\\html@mathml{\\@nsupseteqq}{⊉}"), Q("\\varsubsetneq", "\\html@mathml{\\@varsubsetneq}{⊊}"), Q("\\varsubsetneqq", "\\html@mathml{\\@varsubsetneqq}{⫋}"), Q("\\varsupsetneq", "\\html@mathml{\\@varsupsetneq}{⊋}"), Q("\\varsupsetneqq", "\\html@mathml{\\@varsupsetneqq}{⫌}"), Q("\\imath", "\\html@mathml{\\@imath}{ı}"), Q("\\jmath", "\\html@mathml{\\@jmath}{ȷ}"), Q("\\llbracket", "\\html@mathml{\\mathopen{[\\mkern-3.2mu[}}{\\mathopen{\\char`⟦}}"), Q("\\rrbracket", "\\html@mathml{\\mathclose{]\\mkern-3.2mu]}}{\\mathclose{\\char`⟧}}"), Q("⟦", "\\llbracket"), Q("⟧", "\\rrbracket"), Q("\\lBrace", "\\html@mathml{\\mathopen{\\{\\mkern-3.2mu[}}{\\mathopen{\\char`⦃}}"), Q("\\rBrace", "\\html@mathml{\\mathclose{]\\mkern-3.2mu\\}}}{\\mathclose{\\char`⦄}}"), Q("⦃", "\\lBrace"), Q("⦄", "\\rBrace"), Q("\\minuso", "\\mathbin{\\html@mathml{{\\mathrlap{\\mathchoice{\\kern{0.145em}}{\\kern{0.145em}}{\\kern{0.1015em}}{\\kern{0.0725em}}\\circ}{-}}}{\\char`⦵}}"), Q("⦵", "\\minuso"), Q("\\darr", "\\downarrow"), Q("\\dArr", "\\Downarrow"), Q("\\Darr", "\\Downarrow"), Q("\\lang", "\\langle"), Q("\\rang", "\\rangle"), Q("\\uarr", "\\uparrow"), Q("\\uArr", "\\Uparrow"), Q("\\Uarr", "\\Uparrow"), Q("\\N", "\\mathbb{N}"), Q("\\R", "\\mathbb{R}"), Q("\\Z", "\\mathbb{Z}"), Q("\\alef", "\\aleph"), Q("\\alefsym", "\\aleph"), Q("\\Alpha", "\\mathrm{A}"), Q("\\Beta", "\\mathrm{B}"), Q("\\bull", "\\bullet"), Q("\\Chi", "\\mathrm{X}"), Q("\\clubs", "\\clubsuit"), Q("\\cnums", "\\mathbb{C}"), Q("\\Complex", "\\mathbb{C}"), Q("\\Dagger", "\\ddagger"), Q("\\diamonds", "\\diamondsuit"), Q("\\empty", "\\emptyset"), Q("\\Epsilon", "\\mathrm{E}"), Q("\\Eta", "\\mathrm{H}"), Q("\\exist", "\\exists"), Q("\\harr", "\\leftrightarrow"), Q("\\hArr", "\\Leftrightarrow"), Q("\\Harr", "\\Leftrightarrow"), Q("\\hearts", "\\heartsuit"), Q("\\image", "\\Im"), Q("\\infin", "\\infty"), Q("\\Iota", "\\mathrm{I}"), Q("\\isin", "\\in"), Q("\\Kappa", "\\mathrm{K}"), Q("\\larr", "\\leftarrow"), Q("\\lArr", "\\Leftarrow"), Q("\\Larr", "\\Leftarrow"), Q("\\lrarr", "\\leftrightarrow"), Q("\\lrArr", "\\Leftrightarrow"), Q("\\Lrarr", "\\Leftrightarrow"), Q("\\Mu", "\\mathrm{M}"), Q("\\natnums", "\\mathbb{N}"), Q("\\Nu", "\\mathrm{N}"), Q("\\Omicron", "\\mathrm{O}"), Q("\\plusmn", "\\pm"), Q("\\rarr", "\\rightarrow"), Q("\\rArr", "\\Rightarrow"), Q("\\Rarr", "\\Rightarrow"), Q("\\real", "\\Re"), Q("\\reals", "\\mathbb{R}"), Q("\\Reals", "\\mathbb{R}"), Q("\\Rho", "\\mathrm{P}"), Q("\\sdot", "\\cdot"), Q("\\sect", "\\S"), Q("\\spades", "\\spadesuit"), Q("\\sub", "\\subset"), Q("\\sube", "\\subseteq"), Q("\\supe", "\\supseteq"), Q("\\Tau", "\\mathrm{T}"), Q("\\thetasym", "\\vartheta"), Q("\\weierp", "\\wp"), Q("\\Zeta", "\\mathrm{Z}"), Q("\\argmin", "\\DOTSB\\operatorname*{arg\\,min}"), Q("\\argmax", "\\DOTSB\\operatorname*{arg\\,max}"), Q("\\plim", "\\DOTSB\\mathop{\\operatorname{plim}}\\limits"), Q("\\bra", "\\mathinner{\\langle{#1}|}"), Q("\\ket", "\\mathinner{|{#1}\\rangle}"), Q("\\braket", "\\mathinner{\\langle{#1}\\rangle}"), Q("\\Bra", "\\left\\langle#1\\right|"), Q("\\Ket", "\\left|#1\\right\\rangle");
var Kg = (e) => (t) => {
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
Q("\\bra@ket", Kg(!1)), Q("\\bra@set", Kg(!0)), Q("\\Braket", "\\bra@ket{\\left\\langle}{\\,\\middle\\vert\\,}{\\,\\middle\\vert\\,}{\\right\\rangle}"), Q("\\Set", "\\bra@set{\\left\\{\\:}{\\;\\middle\\vert\\;}{\\;\\middle\\Vert\\;}{\\:\\right\\}}"), Q("\\set", "\\bra@set{\\{\\,}{\\mid}{}{\\,\\}}"), Q("\\angln", "{\\angl n}"), Q("\\blue", "\\textcolor{##6495ed}{#1}"), Q("\\orange", "\\textcolor{##ffa500}{#1}"), Q("\\pink", "\\textcolor{##ff00af}{#1}"), Q("\\red", "\\textcolor{##df0030}{#1}"), Q("\\green", "\\textcolor{##28ae7b}{#1}"), Q("\\gray", "\\textcolor{gray}{#1}"), Q("\\purple", "\\textcolor{##9d38bd}{#1}"), Q("\\blueA", "\\textcolor{##ccfaff}{#1}"), Q("\\blueB", "\\textcolor{##80f6ff}{#1}"), Q("\\blueC", "\\textcolor{##63d9ea}{#1}"), Q("\\blueD", "\\textcolor{##11accd}{#1}"), Q("\\blueE", "\\textcolor{##0c7f99}{#1}"), Q("\\tealA", "\\textcolor{##94fff5}{#1}"), Q("\\tealB", "\\textcolor{##26edd5}{#1}"), Q("\\tealC", "\\textcolor{##01d1c1}{#1}"), Q("\\tealD", "\\textcolor{##01a995}{#1}"), Q("\\tealE", "\\textcolor{##208170}{#1}"), Q("\\greenA", "\\textcolor{##b6ffb0}{#1}"), Q("\\greenB", "\\textcolor{##8af281}{#1}"), Q("\\greenC", "\\textcolor{##74cf70}{#1}"), Q("\\greenD", "\\textcolor{##1fab54}{#1}"), Q("\\greenE", "\\textcolor{##0d923f}{#1}"), Q("\\goldA", "\\textcolor{##ffd0a9}{#1}"), Q("\\goldB", "\\textcolor{##ffbb71}{#1}"), Q("\\goldC", "\\textcolor{##ff9c39}{#1}"), Q("\\goldD", "\\textcolor{##e07d10}{#1}"), Q("\\goldE", "\\textcolor{##a75a05}{#1}"), Q("\\redA", "\\textcolor{##fca9a9}{#1}"), Q("\\redB", "\\textcolor{##ff8482}{#1}"), Q("\\redC", "\\textcolor{##f9685d}{#1}"), Q("\\redD", "\\textcolor{##e84d39}{#1}"), Q("\\redE", "\\textcolor{##bc2612}{#1}"), Q("\\maroonA", "\\textcolor{##ffbde0}{#1}"), Q("\\maroonB", "\\textcolor{##ff92c6}{#1}"), Q("\\maroonC", "\\textcolor{##ed5fa6}{#1}"), Q("\\maroonD", "\\textcolor{##ca337c}{#1}"), Q("\\maroonE", "\\textcolor{##9e034e}{#1}"), Q("\\purpleA", "\\textcolor{##ddd7ff}{#1}"), Q("\\purpleB", "\\textcolor{##c6b9fc}{#1}"), Q("\\purpleC", "\\textcolor{##aa87ff}{#1}"), Q("\\purpleD", "\\textcolor{##7854ab}{#1}"), Q("\\purpleE", "\\textcolor{##543b78}{#1}"), Q("\\mintA", "\\textcolor{##f5f9e8}{#1}"), Q("\\mintB", "\\textcolor{##edf2df}{#1}"), Q("\\mintC", "\\textcolor{##e0e5cc}{#1}"), Q("\\grayA", "\\textcolor{##f6f7f7}{#1}"), Q("\\grayB", "\\textcolor{##f0f1f2}{#1}"), Q("\\grayC", "\\textcolor{##e3e5e6}{#1}"), Q("\\grayD", "\\textcolor{##d6d8da}{#1}"), Q("\\grayE", "\\textcolor{##babec2}{#1}"), Q("\\grayF", "\\textcolor{##888d93}{#1}"), Q("\\grayG", "\\textcolor{##626569}{#1}"), Q("\\grayH", "\\textcolor{##3b3e40}{#1}"), Q("\\grayI", "\\textcolor{##21242c}{#1}"), Q("\\kaBlue", "\\textcolor{##314453}{#1}"), Q("\\kaGreen", "\\textcolor{##71B307}{#1}");
var qg = {
	"^": !0,
	_: !0,
	"\\limits": !0,
	"\\nolimits": !0
}, Jg = class {
	constructor(e, t, n) {
		this.settings = void 0, this.expansionCount = void 0, this.lexer = void 0, this.macros = void 0, this.stack = void 0, this.mode = void 0, this.settings = t, this.expansionCount = 0, this.feed(e), this.macros = new Rg(zg, t.macros), this.mode = n, this.stack = [];
	}
	feed(e) {
		this.lexer = new Lg(e, this.settings);
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
		return this.pushToken(new Rh("EOF", n.loc)), this.pushTokens(r), new Rh("", Lh.range(t, n));
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
				if (--a, a === -1) throw new M("Extra }", i);
			} else if (i.text === "EOF") throw new M("Unexpected end of input in a macro argument, expected '" + (e && n ? e[o] : "}") + "'", i);
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
			if (t.length !== e + 1) throw new M("The length of delimiters doesn't match the number of args!");
			for (var n = t[0], r = 0; r < n.length; r++) {
				var i = this.popToken();
				if (n[r] !== i.text) throw new M("Use of the macro doesn't match its definition", i);
			}
		}
		for (var a = [], o = 0; o < e; o++) a.push(this.consumeArg(t && t[o + 1]).tokens);
		return a;
	}
	countExpansion(e) {
		if (this.expansionCount += e, this.expansionCount > this.settings.maxExpand) throw new M("Too many expansions: infinite loop or need to increase maxExpand setting");
	}
	expandOnce(e) {
		var t = this.popToken(), n = t.text, r = t.noexpand ? null : this._getExpansion(n);
		if (r == null || e && r.unexpandable) {
			if (e && r == null && n[0] === "\\" && !this.isDefined(n)) throw new M("Undefined control sequence: " + n);
			return this.pushToken(t), !1;
		}
		this.countExpansion(1);
		var i = r.tokens, a = this.consumeArgs(r.numArgs, r.delimiters);
		if (r.numArgs) {
			i = i.slice();
			for (var o = i.length - 1; o >= 0; --o) {
				var s = i[o];
				if (s.text === "#") {
					if (o === 0) throw new M("Incomplete placeholder at end of macro body", s);
					if (s = i[--o], s.text === "#") i.splice(o + 1, 1);
					else if (/^[1-9]$/.test(s.text)) i.splice(o, 2, ...a[s.text - 1]);
					else throw new M("Not a valid argument number", s);
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
		return this.macros.has(e) ? this.expandTokens([new Rh(e)]) : void 0;
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
			for (var o = new Lg(r, this.settings), s = [], c = o.lex(); c.text !== "EOF";) s.push(c), c = o.lex();
			return s.reverse(), {
				tokens: s,
				numArgs: i
			};
		}
		return r;
	}
	isDefined(e) {
		return this.macros.has(e) || Og.hasOwnProperty(e) || Af.math.hasOwnProperty(e) || Af.text.hasOwnProperty(e) || qg.hasOwnProperty(e);
	}
	isExpandable(e) {
		var t = this.macros.get(e);
		return t == null ? Og.hasOwnProperty(e) && !Og[e].primitive : typeof t == "string" || typeof t == "function" || !t.unexpandable;
	}
}, Yg = /^[₊₋₌₍₎₀₁₂₃₄₅₆₇₈₉ₐₑₕᵢⱼₖₗₘₙₒₚᵣₛₜᵤᵥₓᵦᵧᵨᵩᵪ]/, Xg = Object.freeze({
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
}), Zg = {
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
}, Qg = {
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
}, $g = class e {
	constructor(e, t) {
		this.mode = void 0, this.gullet = void 0, this.settings = void 0, this.leftrightDepth = void 0, this.nextToken = void 0, this.mode = "math", this.gullet = new Jg(e, t, this.mode), this.settings = t, this.leftrightDepth = 0, this.nextToken = null;
	}
	expect(e, t) {
		if (t === void 0 && (t = !0), this.fetch().text !== e) throw new M("Expected '" + e + "', got '" + this.fetch().text + "'", this.fetch());
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
		this.consume(), this.gullet.pushToken(new Rh("}")), this.gullet.pushTokens(e);
		var n = this.parseExpression(!1);
		return this.expect("}"), this.nextToken = t, n;
	}
	parseExpression(t, n) {
		for (var r = [];;) {
			this.mode === "math" && this.consumeSpaces();
			var i = this.fetch();
			if (e.endOfExpression.has(i.text) || n && i.text === n || t && Og[i.text] && Og[i.text].infix) break;
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
				if (t !== -1) throw new M("only one infix operator per group", i.token);
				t = r, n = i.replaceWith;
			}
		}
		if (t !== -1 && n) {
			var a, o, s = e.slice(0, t), c = e.slice(t + 1);
			return a = s.length === 1 && s[0].type === "ordgroup" ? s[0] : {
				type: "ordgroup",
				mode: this.mode,
				body: s
			}, o = c.length === 1 && c[0].type === "ordgroup" ? c[0] : {
				type: "ordgroup",
				mode: this.mode,
				body: c
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
		if (!r) throw new M("Expected group after '" + n + "'", t);
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
				else throw new M("Limit controls must follow a math operator", i);
				this.consume();
			} else if (i.text === "^") {
				if (n) throw new M("Double superscript", i);
				n = this.handleSupSubscript("superscript");
			} else if (i.text === "_") {
				if (r) throw new M("Double subscript", i);
				r = this.handleSupSubscript("subscript");
			} else if (i.text === "'") {
				if (n) throw new M("Double superscript", i);
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
			} else if (Xg[i.text]) {
				var s = Yg.test(i.text), c = [];
				for (c.push(new Rh(Xg[i.text])), this.consume();;) {
					var l = this.fetch().text;
					if (!Xg[l] || Yg.test(l) !== s) break;
					c.unshift(new Rh(Xg[l])), this.consume();
				}
				var u = this.subparse(c);
				s ? r = {
					type: "ordgroup",
					mode: "math",
					body: u
				} : n = {
					type: "ordgroup",
					mode: "math",
					body: u
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
		var n = this.fetch(), r = n.text, i = Og[r];
		if (!i) return null;
		if (this.consume(), t && t !== "atom" && !i.allowedInArgument) throw new M("Got function '" + r + "' with no arguments" + (t ? " as " + t : ""), n);
		if (this.mode === "text" && !i.allowedInText) throw new M("Can't use function '" + r + "' in text mode", n);
		if (this.mode === "math" && i.allowedInMath === !1) throw new M("Can't use function '" + r + "' in math mode", n);
		var { args: a, optArgs: o } = this.parseArguments(r, i);
		return this.callFunction(r, a, o, n, e);
	}
	callFunction(e, t, n, r, i) {
		var a = {
			funcName: e,
			parser: this,
			token: r,
			breakOnTokenText: i
		}, o = Og[e];
		if (o && o.handler) return o.handler(a, t, n);
		throw new M("No function handler for " + e);
	}
	parseArguments(e, t) {
		var n = t.numOptionalArgs ?? 0, r = t.numArgs + n;
		if (r === 0) return {
			args: [],
			optArgs: []
		};
		for (var i = [], a = [], o = 0; o < r; o++) {
			var s = t.argTypes?.[o], c = o < n;
			("primitive" in t && t.primitive && s == null || t.type === "sqrt" && o === 1 && a[0] == null) && (s = "primitive");
			var l = this.parseGroupOfType("argument to '" + e + "'", s, c);
			if (c) a.push(l);
			else if (l != null) i.push(l);
			else throw new M("Null argument, please report this as a bug");
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
				if (n) throw new M("A primitive argument cannot be optional");
				var a = this.parseGroup(e);
				if (a == null) throw new M("Expected group as " + e, this.fetch());
				return a;
			case "original":
			case void 0: return this.parseArgumentGroup(n);
			default: throw new M("Unknown group type as " + e, this.fetch());
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
		if (i === "") throw new M("Invalid " + t + ": '" + n.text + "'", n);
		return n.range(r, i);
	}
	parseColorGroup(e) {
		var t = this.parseStringGroup(e);
		if (t == null) return null;
		var n = /^(#[a-f0-9]{3,4}|#[a-f0-9]{6}|#[a-f0-9]{8}|[a-f0-9]{6}|[a-z]+)$/i.exec(t.text);
		if (!n) throw new M("Invalid color: '" + t.text + "'", t);
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
		if (!r) throw new M("Invalid size: '" + t.text + "'", t);
		var i = {
			number: +(r[1] + r[2]),
			unit: r[3]
		};
		if (!rf(i)) throw new M("Invalid unit: '" + i.unit + "'", t);
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
			var o = this.parseExpression(!1, a), s = this.fetch();
			this.expect(a), this.gullet.endGroup(), i = {
				type: "ordgroup",
				mode: this.mode,
				loc: Lh.range(n, s),
				body: o,
				semisimple: r === "\\begingroup" || void 0
			};
		} else if (i = this.parseFunction(t, e) || this.parseSymbol(), i == null && r[0] === "\\" && !qg.hasOwnProperty(r)) {
			if (this.settings.throwOnError) throw new M("Undefined control sequence: " + r, n);
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
							loc: Lh.range(r, o),
							text: "---"
						}), t -= 2) : (e.splice(n, 2, {
							type: "textord",
							mode: "text",
							loc: Lh.range(r, a),
							text: "--"
						}), --t);
					}
					(i === "'" || i === "`") && a.text === i && (e.splice(n, 2, {
						type: "textord",
						mode: "text",
						loc: Lh.range(r, a),
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
			if (r && (n = n.slice(1)), n.length < 2 || n.charAt(0) !== n.slice(-1)) throw new M("\\verb assertion failed --\n                    please report what input caused this bug");
			return n = n.slice(1, -1), {
				type: "verb",
				mode: "text",
				body: n,
				star: r
			};
		}
		Qg.hasOwnProperty(t[0]) && !Af[this.mode][t[0]] && (this.settings.strict && this.mode === "math" && this.settings.reportNonstrict("unicodeTextInMathMode", "Accented Unicode text character \"" + t[0] + "\" used in math mode", e), t = Qg[t[0]] + t.slice(1));
		var i = Fg.exec(t);
		i && (t = t.substring(0, i.index), t === "i" ? t = "ı" : t === "j" && (t = "ȷ"));
		var a;
		if (Af[this.mode][t]) {
			this.settings.strict && this.mode === "math" && Qf.includes(t) && this.settings.reportNonstrict("unicodeTextInMathMode", "Latin-1/Unicode text character \"" + t[0] + "\" used in math mode", e);
			var o = Af[this.mode][t].group, s = Lh.range(e);
			a = Nm(o) ? {
				type: "atom",
				mode: this.mode,
				family: o,
				loc: s,
				text: t
			} : {
				type: o,
				mode: this.mode,
				loc: s,
				text: t
			};
		} else if (t.charCodeAt(0) >= 128) this.settings.strict && (zd(t.charCodeAt(0)) ? this.mode === "math" && this.settings.reportNonstrict("unicodeTextInMathMode", "Unicode text character \"" + t[0] + "\" used in math mode", e) : this.settings.reportNonstrict("unknownSymbol", "Unrecognized Unicode character \"" + t[0] + "\"" + (" (" + t.charCodeAt(0) + ")"), e)), a = {
			type: "textord",
			mode: "text",
			loc: Lh.range(e),
			text: t
		};
		else return null;
		if (this.consume(), i) for (var c = 0; c < i[0].length; c++) {
			var l = i[0][c];
			if (!Zg[l]) throw new M("Unknown accent ' " + l + "'", e);
			var u = Zg[l][this.mode] || Zg[l].text;
			if (!u) throw new M("Accent " + l + " unsupported in " + this.mode + " mode", e);
			a = {
				type: "accent",
				mode: this.mode,
				loc: Lh.range(e),
				label: u,
				isStretchy: !1,
				isShifty: !0,
				base: a
			};
		}
		return a;
	}
};
$g.endOfExpression = new Set([
	"}",
	"\\endgroup",
	"\\end",
	"\\right",
	"&"
]);
var e_ = function(e, t) {
	if (!(typeof e == "string" || e instanceof String)) throw TypeError("KaTeX can only parse string typed expression");
	var n = new $g(e, t);
	delete n.gullet.macros.current["\\df@tag"];
	var r = n.parse();
	if (delete n.gullet.macros.current["\\current@color"], delete n.gullet.macros.current["\\color"], n.gullet.macros.get("\\df@tag")) {
		if (!t.displayMode) throw new M("\\tag works only in display equations");
		r = [{
			type: "tag",
			mode: "text",
			body: r,
			tag: n.subparse([new Rh("\\df@tag")])
		}];
	}
	return r;
}, t_ = function(e, t, n) {
	t.textContent = "";
	var r = a_(e, n).toNode();
	t.appendChild(r);
};
typeof document < "u" && document.compatMode !== "CSS1Compat" && (typeof console < "u" && console.warn("Warning: KaTeX doesn't work in quirks mode. Make sure your website has a suitable doctype."), t_ = function() {
	throw new M("KaTeX doesn't work in quirks mode.");
});
var n_ = function(e, t) {
	return a_(e, t).toMarkup();
}, r_ = function(e, t) {
	return e_(e, new yd(t));
}, i_ = function(e, t, n) {
	if (n.throwOnError || !(e instanceof M)) throw e;
	var r = G(["katex-error"], [new gf(t)]);
	return r.setAttribute("title", e.toString()), r.setAttribute("style", "color:" + n.errorColor), r;
}, a_ = function(e, t) {
	var n = new yd(t);
	try {
		return Cm(e_(e, n), e, n);
	} catch (t) {
		return i_(t, e, n);
	}
}, o_ = {
	version: "0.17.0",
	render: t_,
	renderToString: n_,
	ParseError: M,
	SETTINGS_SCHEMA: hd,
	__parse: r_,
	__renderToDomTree: a_,
	__renderToHTMLTree: function(e, t) {
		var n = new yd(t);
		try {
			return wm(e_(e, n), e, n);
		} catch (t) {
			return i_(t, e, n);
		}
	},
	__setFontMetrics: Ef,
	__defineSymbol: F,
	__defineFunction: q,
	__defineMacro: Q,
	__domTree: {
		Span: ff,
		Anchor: pf,
		SymbolNode: gf,
		SvgNode: _f,
		PathNode: vf,
		LineNode: yf
	}
}, s_ = Wc.create({
	name: "questionMark",
	inclusive: !1,
	addAttributes() {
		return { title: {
			default: "Есть вопрос, непонятно",
			parseHTML: (e) => e.getAttribute("title"),
			renderHTML: (e) => ({ title: e.title })
		} };
	},
	parseHTML() {
		return [{ tag: "span[data-question=\"true\"]" }, { tag: "span.dialectics-question-highlight" }];
	},
	renderHTML({ HTMLAttributes: e }) {
		return [
			"span",
			wc(e, {
				class: "dialectics-question-highlight",
				"data-question": "true"
			}),
			0
		];
	},
	addCommands() {
		return { toggleQuestionMark: (e) => ({ commands: t }) => t.toggleMark(this.name, e) };
	}
}), c_ = Wc.create({
	name: "hiddenPhrase",
	inclusive: !1,
	addAttributes() {
		return {
			note: {
				default: "Пояснение",
				parseHTML: (e) => e.getAttribute("data-note") || "Пояснение",
				renderHTML: (e) => ({ "data-note": e.note })
			},
			expanded: {
				default: "false",
				parseHTML: (e) => e.getAttribute("data-expanded") || "false",
				renderHTML: (e) => ({ "data-expanded": e.expanded })
			}
		};
	},
	parseHTML() {
		return [{ tag: "span[data-hidden-phrase=\"true\"]" }, { tag: "span.dialectics-hidden-phrase" }];
	},
	renderHTML({ HTMLAttributes: e }) {
		return [
			"span",
			wc(e, {
				class: "dialectics-hidden-phrase",
				"data-hidden-phrase": "true"
			}),
			0
		];
	},
	addCommands() {
		return { toggleHiddenPhrase: (e) => ({ commands: t }) => t.toggleMark(this.name, e) };
	}
}), l_ = Wc.create({
	name: "blockLink",
	inclusive: !1,
	addAttributes() {
		return {
			targetId: {
				default: "",
				parseHTML: (e) => e.getAttribute("data-target-id") || "",
				renderHTML: (e) => ({ "data-target-id": e.targetId })
			},
			targetTitle: {
				default: "",
				parseHTML: (e) => e.getAttribute("data-target-title") || "",
				renderHTML: (e) => ({ "data-target-title": e.targetTitle })
			},
			targetNoteId: {
				default: "",
				parseHTML: (e) => e.getAttribute("data-target-note-id") || "",
				renderHTML: (e) => e.targetNoteId ? { "data-target-note-id": e.targetNoteId } : {}
			},
			targetNoteTitle: {
				default: "",
				parseHTML: (e) => e.getAttribute("data-target-note-title") || "",
				renderHTML: (e) => e.targetNoteTitle ? { "data-target-note-title": e.targetNoteTitle } : {}
			}
		};
	},
	parseHTML() {
		return [{ tag: "span[data-block-link=\"true\"]" }, { tag: "span.dialectics-block-link" }];
	},
	renderHTML({ HTMLAttributes: e }) {
		return [
			"span",
			wc(e, {
				class: "dialectics-block-link",
				"data-block-link": "true"
			}),
			0
		];
	},
	addCommands() {
		return {
			setBlockLink: (e) => ({ commands: t }) => t.setMark(this.name, e),
			unsetBlockLink: () => ({ commands: e }) => e.unsetMark(this.name),
			toggleBlockLink: (e) => ({ commands: t }) => t.toggleMark(this.name, e)
		};
	}
}), u_ = ad.extend({
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
}), d_ = td.create({
	name: "mathNode",
	group: "inline",
	inline: !0,
	atom: !0,
	addAttributes() {
		return { latex: { default: "" } };
	},
	addInputRules() {
		return [new Lc({
			find: /\$([^$]+)\$$/,
			handler: ({ state: e, range: t, match: n }) => {
				let { tr: r } = e, i = t.from, a = t.to;
				r.replaceWith(i, a, this.type.create({ latex: n[1] }));
			}
		})];
	},
	parseHTML() {
		return [{ tag: "span[data-type=\"mathNode\"]" }];
	},
	renderHTML({ HTMLAttributes: e }) {
		return ["span", wc(e, { "data-type": "mathNode" })];
	},
	addNodeView() {
		return ({ node: e, getPos: t, editor: n }) => {
			let r = document.createElement("span");
			r.classList.add("math-node"), r.setAttribute("data-type", "mathNode");
			try {
				let t = (e.attrs.latex || "").replace(/\\softmax\b/g, "\\operatorname{softmax}");
				o_.render(t, r, {
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
}), f_ = td.create({
	name: "quoteBlock",
	group: "block",
	content: "block+",
	addAttributes() {
		return { author: {
			default: "",
			parseHTML: (e) => e.getAttribute("data-author") || "",
			renderHTML: (e) => e.author ? { "data-author": e.author } : {}
		} };
	},
	parseHTML() {
		return [{ tag: "blockquote[data-type=\"quoteBlock\"]" }];
	},
	renderHTML({ HTMLAttributes: e }) {
		return [
			"blockquote",
			wc(e, {
				"data-type": "quoteBlock",
				class: "modern-blockquote"
			}),
			0
		];
	},
	addCommands() {
		return { toggleQuoteBlock: () => ({ commands: e }) => e.toggleWrap(this.name) };
	},
	addKeyboardShortcuts() {
		return { Enter: ({ editor: e }) => {
			let { state: t } = e, { $from: n, empty: r } = t.selection;
			if (!r || n.parent.content.size > 0) return !1;
			let i = -1;
			for (let e = n.depth; e > 0; e--) if (n.node(e).type.name === "quoteBlock") {
				i = e;
				break;
			}
			if (i === -1) return !1;
			let a = n.node(i);
			if (a.lastChild !== n.parent) return !1;
			let o = n.after(i);
			if (a.childCount > 1) {
				let t = n.before(n.depth), r = n.after(n.depth), i = o - (r - t);
				return e.chain().deleteRange({
					from: t,
					to: r
				}).insertContentAt(i, { type: "paragraph" }).setTextSelection(i + 1).run();
			} else return e.chain().insertContentAt(o, { type: "paragraph" }).setTextSelection(o + 1).run();
		} };
	},
	addNodeView() {
		return ({ node: e, getPos: t, editor: n }) => {
			let r = e, i = document.createElement("blockquote");
			i.className = "modern-blockquote", i.setAttribute("data-type", "quoteBlock"), r.attrs.author && i.setAttribute("data-author", r.attrs.author);
			let o = document.createElement("div");
			o.className = "quote-content", i.appendChild(o);
			let s = document.createElement("div");
			s.className = "quote-author-line", s.contentEditable = "false";
			let c = document.createElement("span");
			c.className = "quote-author-text";
			let l = (e) => {
				c.textContent = e ? `— ${e}` : "— Указать автора/источник...", c.classList.toggle("empty", !e), e ? i.setAttribute("data-author", e) : i.removeAttribute("data-author");
			};
			return l(r.attrs.author), c.onclick = async (e) => {
				e.stopPropagation();
				let i = await a({
					title: "✍ Автор или источник цитаты",
					placeholder: "Например: И. Кант, «Критика чистого разума»",
					value: r.attrs.author
				});
				i !== null && typeof t == "function" && n.view.dispatch(n.view.state.tr.setNodeMarkup(t(), null, {
					...r.attrs,
					author: i.trim()
				}));
			}, s.appendChild(c), i.appendChild(s), {
				dom: i,
				contentDOM: o,
				update(e) {
					return e.type.name === "quoteBlock" ? (r = e, l(e.attrs.author), !0) : !1;
				}
			};
		};
	}
});
if (typeof window < "u" && !window._hiddenPhraseHandlerInitialized && (window._hiddenPhraseHandlerInitialized = !0, document.addEventListener("click", (e) => {
	let t = e.target.closest(".dialectics-hidden-phrase");
	if (t) {
		if (t.closest("[contenteditable=\"true\"]")) return;
		e.preventDefault(), e.stopPropagation();
		let n = t.getAttribute("data-expanded") === "true" ? "false" : "true";
		if (t.setAttribute("data-expanded", n), window.app && window.app.editor && window.app.editor.tiptap) {
			let e = window.app.editor.tiptap, r = e.view.posAtDOM(t, 0);
			if (r >= 0) {
				let { doc: t } = e.state, i = e.state.tr, a = !1;
				t.nodesBetween(Math.max(0, r - 2), Math.min(t.content.size, r + 2), (e, t) => {
					e.isInline && e.marks.forEach((r) => {
						r.type.name === "hiddenPhrase" && (i = i.removeMark(t, t + e.nodeSize, r.type), i = i.addMark(t, t + e.nodeSize, r.type.create({
							...r.attrs,
							expanded: n
						})), a = !0);
					});
				}), a && e.view.dispatch(i);
			}
		}
	}
}), window.toggleAllHiddenPhrases = function() {
	let e = document.querySelectorAll(".dialectics-hidden-phrase");
	if (!e.length) return;
	let t = !1;
	e.forEach((e) => {
		e.getAttribute("data-expanded") !== "true" && (t = !0);
	});
	let n = t ? "true" : "false";
	if (e.forEach((e) => {
		e.setAttribute("data-expanded", n);
	}), window.app && window.app.editor && window.app.editor.tiptap) {
		let e = window.app.editor.tiptap, { doc: t } = e.state, r = e.state.tr, i = !1;
		t.descendants((e, t) => {
			e.isInline && e.marks.forEach((a) => {
				a.type.name === "hiddenPhrase" && a.attrs.expanded !== n && (r = r.removeMark(t, t + e.nodeSize, a.type), r = r.addMark(t, t + e.nodeSize, a.type.create({
					...a.attrs,
					expanded: n
				})), i = !0);
			});
		}), i && e.view.dispatch(r);
	}
}), typeof window < "u" && !window._blockLinkHandlerInitialized) {
	window._blockLinkHandlerInitialized = !0, document.addEventListener("click", async (e) => {
		let t = e.target.closest(".dialectics-block-link");
		if (t) {
			e.preventDefault(), e.stopPropagation();
			let n = t.getAttribute("data-target-id"), r = t.getAttribute("data-target-note-id");
			if (!n) return;
			let i = (e) => {
				let t = document.querySelector(`.dialectics-block[data-block-id="${e}"], .dialectics-block[data-id="${e}"]`);
				if (t) {
					t.scrollIntoView({
						behavior: "smooth",
						block: "center"
					}), t.style.transition = "box-shadow 0.5s ease";
					let e = t.style.boxShadow;
					return t.style.boxShadow = "0 0 0 4px #3b82f6, 0 0 25px rgba(59, 130, 246, 0.5)", setTimeout(() => {
						t.style.boxShadow = e;
					}, 2e3), !0;
				}
				return !1;
			};
			r ? window.app && typeof window.app.loadNoteToEditor == "function" ? (await window.app.loadNoteToEditor(r), setTimeout(() => {
				i(n) || window.showToast && window.showToast("Целевой блок не найден в загруженном конспекте", "warning");
			}, 300)) : window.showToast && window.showToast("Не удалось загрузить целевой конспект", "warning") : i(n) || window.showToast && window.showToast("Целевой блок не найден на холсте", "warning");
		}
	});
	let e = null, t = null;
	function n() {
		t &&= (t.remove(), null);
	}
	document.addEventListener("mouseover", (r) => {
		let i = r.target.closest(".dialectics-block-link");
		if (i) {
			e && clearTimeout(e), n();
			let r = i.getAttribute("data-target-id"), a = i.getAttribute("data-target-note-id"), o = i.getAttribute("data-target-note-title"), s = i.getAttribute("data-target-title") || "Связанный блок";
			o && (s += ` (в "${o}")`);
			let c = document.querySelector(`.dialectics-block[data-block-id="${r}"], .dialectics-block[data-id="${r}"]`), l = "Текст блока отсутствует или блок удалён";
			if (a) l = "Загрузка превью...", fetch(`/api/dialectics/${a}`).then((e) => e.ok ? e.json() : null).then((e) => {
				if (!e) return;
				let n = typeof e.content_json == "string" ? JSON.parse(e.content_json) : e.content_json;
				if (Array.isArray(n)) {
					let e = n.find((e) => e.id === r);
					if (e) {
						let n = document.createElement("div");
						n.innerHTML = e.html || "";
						let r = n.innerText.trim();
						if (r.length > 180 && (r = r.substring(0, 180) + "..."), l = r || "Пустой блок", t) {
							let e = t.querySelector(".preview-body-text");
							e && (e.innerText = l);
						}
					}
				}
			}).catch((e) => console.error("Preview load error:", e));
			else if (c) {
				let e = c.querySelector(".dialectics-content-inner");
				e && (l = e.innerText.trim(), l.length > 180 && (l = l.substring(0, 180) + "..."));
			}
			t = document.createElement("div"), t.className = "dialectics-link-preview-popover", t.style.cssText = "\n                position: absolute; z-index: 10000; width: 300px; background: white;\n                border: 1px solid #93c5fd; border-radius: 12px; padding: 14px;\n                box-shadow: 0 10px 25px -5px rgba(59, 130, 246, 0.25);\n                font-size: 0.85rem; pointer-events: none; opacity: 0;\n                transition: opacity 0.15s ease, transform 0.15s ease;\n                transform: translateY(4px); font-family: inherit;\n            ", t.innerHTML = `
                <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 8px; font-weight: 700; color: #1d4ed8; font-size: 0.9rem; border-bottom: 1px solid #eff6ff; padding-bottom: 6px;">
                    <span>🔗</span><span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${s}</span>
                </div>
                <div class="preview-body-text" style="color: #475569; line-height: 1.45; font-size: 0.82rem; max-height: 90px; overflow: hidden; text-overflow: ellipsis;">
                    ${l}
                </div>
            `, document.body.appendChild(t);
			let u = i.getBoundingClientRect(), d = Math.max(10, u.left + window.scrollX);
			d + 300 > window.innerWidth && (d = window.innerWidth - 310), t.style.left = `${d}px`, t.style.top = `${u.bottom + window.scrollY + 6}px`, requestAnimationFrame(() => {
				t && (t.style.opacity = "1", t.style.transform = "translateY(0)");
			});
		}
	}), document.addEventListener("mouseout", (t) => {
		t.target.closest(".dialectics-block-link") && (e && clearTimeout(e), e = setTimeout(() => {
			n();
		}, 200));
	});
}
function p_(e, t = [], n = null, r = null) {
	e.innerHTML = "", e.style.cssText = "border: 2px dashed #cbd5e1; border-radius: 12px; padding: 12px; margin: 14px 0; background: #f8fafc; font-family: inherit;";
	let i = document.createElement("div");
	i.style.cssText = "display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; flex-wrap: wrap; gap: 8px;";
	let o = document.createElement("span");
	if (o.style.cssText = "font-weight: 600; font-size: 0.9rem; color: #334155; display: flex; align-items: center; gap: 6px;", o.innerHTML = "🔀 <span>Альтернативные формулировки <small style=\"color: #64748b; font-weight: normal;\">(выберите финальный вариант)</small></span>", i.appendChild(o), n) {
		let e = document.createElement("button");
		e.type = "button", e.innerHTML = "+ Добавить вариант", e.style.cssText = "background: #e2e8f0; border: none; border-radius: 6px; padding: 4px 10px; font-size: 0.8rem; font-weight: 600; color: #334155; cursor: pointer; transition: background 0.2s;", e.onmouseover = () => e.style.background = "#cbd5e1", e.onmouseout = () => e.style.background = "#e2e8f0", e.onclick = async (e) => {
			e.stopPropagation();
			let r = await a({
				title: "➕ Новый вариант формулировки",
				value: "",
				placeholder: "Введите текст альтернативного варианта...",
				okLabel: "Добавить",
				cancelLabel: "Отмена",
				multiline: !0
			});
			r !== null && r.trim() !== "" && n([...t, r.trim()]);
		}, i.appendChild(e);
	}
	e.appendChild(i);
	let s = document.createElement("div");
	s.style.cssText = "display: flex; gap: 12px; overflow-x: auto; padding-bottom: 4px;", t.forEach((e, i) => {
		let o = document.createElement("div");
		o.style.cssText = "flex: 1; min-width: 260px; max-width: 450px; border: 1px solid #cbd5e1; border-radius: 8px; padding: 12px; background: white; display: flex; flex-direction: column; justify-content: space-between; box-shadow: 0 1px 3px rgba(0,0,0,0.05);";
		let c = document.createElement("div");
		c.style.cssText = "display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; border-bottom: 1px solid #f1f5f9; padding-bottom: 6px;";
		let l = document.createElement("span");
		if (l.style.cssText = "font-weight: 600; font-size: 0.85rem; color: #475569;", l.innerText = `Вариант #${i + 1}`, c.appendChild(l), n) {
			let r = document.createElement("div");
			r.style.cssText = "display: flex; gap: 4px;";
			let o = document.createElement("button");
			o.type = "button", o.title = "Редактировать", o.innerHTML = "✎", o.style.cssText = "background: transparent; border: none; cursor: pointer; font-size: 0.95rem; color: #64748b; padding: 2px 6px; border-radius: 4px; transition: background 0.2s;", o.onmouseover = () => o.style.background = "#f1f5f9", o.onmouseout = () => o.style.background = "transparent", o.onclick = async (r) => {
				r.stopPropagation();
				let o = await a({
					title: `✎ Редактировать Вариант #${i + 1}`,
					value: e,
					placeholder: "Текст формулировки...",
					okLabel: "Сохранить",
					cancelLabel: "Отмена",
					multiline: !0
				});
				if (o !== null && o.trim() !== "") {
					let e = [...t];
					e[i] = o.trim(), n(e);
				}
			};
			let s = document.createElement("button");
			s.type = "button", s.title = "Удалить вариант", s.innerHTML = "✕", s.style.cssText = "background: transparent; border: none; cursor: pointer; font-size: 0.95rem; color: #ef4444; padding: 2px 6px; border-radius: 4px; transition: background 0.2s;", s.onmouseover = () => s.style.background = "#fee2e2", s.onmouseout = () => s.style.background = "transparent", s.onclick = (e) => {
				if (e.stopPropagation(), t.length <= 1) {
					window.showToast && window.showToast("Должен остаться хотя бы один вариант", "warning");
					return;
				}
				n(t.filter((e, t) => t !== i));
			}, r.appendChild(o), r.appendChild(s), c.appendChild(r);
		}
		o.appendChild(c);
		let u = document.createElement("div");
		if (u.style.cssText = "font-size: 0.9rem; color: #1e293b; margin-bottom: 14px; white-space: pre-wrap; line-height: 1.45; word-break: break-word; flex: 1;", e.includes("<") && e.includes(">") ? (u.innerHTML = e, u.querySelectorAll("span[data-type=\"mathNode\"]").forEach((e) => {
			let t = e.getAttribute("latex");
			if (t && o_ !== void 0) try {
				o_.render(t, e, { throwOnError: !1 });
			} catch {}
		})) : u.innerText = e, o.appendChild(u), r) {
			let t = document.createElement("button");
			t.type = "button", t.innerHTML = "✅ Выбрать этот вариант", t.style.cssText = "width: 100%; background: #22c55e; color: white; border: none; border-radius: 6px; padding: 6px 12px; font-size: 0.85rem; font-weight: 600; cursor: pointer; transition: background 0.2s; box-shadow: 0 1px 2px rgba(0,0,0,0.1);", t.onmouseover = () => t.style.background = "#16a34a", t.onmouseout = () => t.style.background = "#22c55e", t.onclick = (t) => {
				t.stopPropagation(), r(e), window.showToast && window.showToast("Выбран финальный вариант формулировки! ✨", "success");
			}, o.appendChild(t);
		}
		s.appendChild(o);
	}), e.appendChild(s);
}
var m_ = td.create({
	name: "alternativesBlock",
	group: "block",
	atom: !0,
	addAttributes() {
		return { options: {
			default: ["Вариант 1: Напишите первую формулировку...", "Вариант 2: Напишите альтернативную формулировку..."],
			parseHTML: (e) => {
				try {
					let t = JSON.parse(e.getAttribute("data-options"));
					if (Array.isArray(t) && t.length > 0) return t;
				} catch {}
				return ["Вариант 1: Напишите первую формулировку...", "Вариант 2: Напишите альтернативную формулировку..."];
			},
			renderHTML: (e) => ({ "data-options": JSON.stringify(e.options || ["Вариант 1: Напишите первую формулировку...", "Вариант 2: Напишите альтернативную формулировку..."]) })
		} };
	},
	parseHTML() {
		return [{ tag: "div[data-type=\"alternativesBlock\"]" }];
	},
	renderHTML({ HTMLAttributes: e }) {
		return ["div", wc(e, {
			"data-type": "alternativesBlock",
			class: "modern-alternatives-block"
		})];
	},
	addCommands() {
		return { insertAlternativesBlock: (e) => ({ commands: t }) => t.insertContent({
			type: this.name,
			attrs: { options: e || ["Вариант 1: Напишите первую формулировку...", "Вариант 2: Напишите альтернативную формулировку..."] }
		}) };
	},
	addNodeView() {
		return ({ node: e, getPos: t, editor: n }) => {
			let r = document.createElement("div");
			r.className = "modern-alternatives-block", r.setAttribute("data-type", "alternativesBlock"), r.setAttribute("data-options", JSON.stringify(e.attrs.options)), r.contentEditable = "false";
			let i = (i) => {
				r.setAttribute("data-options", JSON.stringify(i)), p_(r, i, (r) => {
					typeof t == "function" && n.view.dispatch(n.view.state.tr.setNodeMarkup(t(), null, {
						...e.attrs,
						options: r
					}));
				}, (r) => {
					if (typeof t == "function") {
						let i = t(), a = r.includes("<") && r.includes(">") ? r : `<p>${r}</p>`;
						n.chain().deleteRange({
							from: i,
							to: i + e.nodeSize
						}).insertContentAt(i, a).run();
					}
				});
			};
			return i(e.attrs.options), {
				dom: r,
				update(e) {
					return e.type.name === "alternativesBlock" ? (i(e.attrs.options), !0) : !1;
				},
				ignoreMutation() {
					return !0;
				}
			};
		};
	}
}), h_ = el.create({
	name: "clearMarksOnEnter",
	addKeyboardShortcuts() {
		return { Enter: ({ editor: e }) => e.state.selection.empty && e.commands.splitBlock() ? (e.view.dispatch(e.state.tr.setStoredMarks([])), !0) : !1 };
	}
});
window.DIALECTICS_HINTS = null, fetch("/api/ai/dialectics/hints").then((e) => e.json()).then((e) => {
	window.DIALECTICS_HINTS = e;
}).catch((e) => console.warn("Failed to load dialectics hints:", e));
var g_ = {
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
}, $ = {
	globalCallbacks: {},
	setCallbacks(e) {
		this.globalCallbacks = e;
	},
	renderMath(e) {
		let t = document.createTreeWalker(e, NodeFilter.SHOW_TEXT, null, !1), n, r = [];
		for (; n = t.nextNode();) {
			let e = n.parentNode;
			e && e.tagName !== "SCRIPT" && e.tagName !== "STYLE" && e.tagName !== "CODE" && e.tagName !== "PRE" && e.getAttribute("data-type") !== "mathNode" && !e.closest(".ProseMirror") && n.nodeValue.includes("$") && r.push(n);
		}
		r.forEach((e) => {
			let t = e.nodeValue, n = /(\$\$[\s\S]+?\$\$|\$[^\$]+?\$)/g, r = 0, i, a = document.createDocumentFragment(), o = !1;
			for (; (i = n.exec(t)) !== null;) {
				o = !0;
				let e = i.index, s = i[0];
				e > r && a.appendChild(document.createTextNode(t.substring(r, e)));
				let c = s.startsWith("$$") ? s.slice(2, -2) : s.slice(1, -1), l = document.createElement("span");
				l.setAttribute("data-type", "mathNode"), l.setAttribute("latex", c.trim()), l.className = "math-node", a.appendChild(l), r = n.lastIndex;
			}
			o && (r < t.length && a.appendChild(document.createTextNode(t.substring(r))), e.parentNode.replaceChild(a, e));
		}), e.querySelectorAll("span[data-type=\"mathNode\"]").forEach((e) => {
			let t = e.getAttribute("latex");
			if (t) try {
				o_.render(t, e, { throwOnError: !1 });
			} catch {
				e.textContent = t, e.style.color = "red";
			}
		}), e.querySelectorAll("blockquote[data-type=\"quoteBlock\"]").forEach((e) => {
			let t = e.getAttribute("data-author");
			if (t && !e.querySelector(".quote-author-line")) {
				let n = document.createElement("div");
				n.className = "quote-author-line", n.contentEditable = "false", n.innerHTML = `<span class="quote-author-text">— ${t}</span>`, e.appendChild(n);
			}
		}), e.querySelectorAll("div[data-type=\"alternativesBlock\"]").forEach((e) => {
			let t = [];
			try {
				t = JSON.parse(e.getAttribute("data-options"));
			} catch {}
			(!Array.isArray(t) || t.length === 0) && (t = ["Вариант 1: Напишите первую формулировку...", "Вариант 2: Напишите альтернативную формулировку..."]), p_(e, t, null, (t) => {
				let n = t.includes("<") && t.includes(">") ? t : `<p>${t}</p>`, r = document.createElement("div");
				r.innerHTML = n;
				let i = e.closest(".dialectics-block");
				if (i) {
					e.replaceWith(...r.childNodes);
					let t = i.dataset.blockId || i.dataset.id;
					if (window.app && window.app.note && window.app.note.blocks) {
						let e = window.app.note.blocks.find((e) => e.id === t);
						if (e) {
							let t = i.querySelector(".block-tab-content.active");
							if (t) {
								let n = t.dataset.tabId;
								if (e.tabs) {
									let r = e.tabs.find((e) => e.id === n);
									r && (r.html = t.innerHTML);
								} else e.html = t.innerHTML;
							} else {
								let t = i.querySelector(".dialectics-content-inner");
								t && (e.html = t.innerHTML);
							}
							window.app.saveNote && window.app.saveNote();
						}
					}
				}
			});
		});
	},
	updateProgressWidget(e) {
		let t = document.getElementById("noteProgressWidget");
		if (!t) return;
		let n = (e || []).filter((e) => e && !e.isSection && e.side !== "section" && e.role !== "anchor"), r = n.length, i = n.filter((e) => e.status === "ready").length, a = n.filter((e) => e.status === "in_progress").length, o = document.getElementById("noteProgressReadyCount"), s = document.getElementById("noteProgressWorkingCount"), c = document.getElementById("noteProgressTotalCount"), l = document.getElementById("noteProgressPercent"), u = document.getElementById("noteProgressReadyBar"), d = document.getElementById("noteProgressWorkingBar");
		if (o && (o.innerText = i), s && (s.innerText = a), c && (c.innerText = r), r === 0) {
			t.style.opacity = "0.5", l && (l.innerText = "0%"), u && (u.style.width = "0%"), d && (d.style.width = "0%");
			return;
		}
		t.style.opacity = "1";
		let f = i / r * 100, p = a / r * 100;
		l && (l.innerText = Math.round(f) + "%"), u && (u.style.width = `${f}%`), d && (d.style.width = `${p}%`);
	},
	render(e, t, n = {}) {
		if (!e) return;
		n = {
			...this.globalCallbacks,
			...n
		};
		let i = document.getElementById("canvasDivider");
		e.innerHTML = "", i && e.appendChild(i), this.updateProgressWidget(t);
		let a = (e, t) => {
			if (typeof window._ == "function") {
				let t = window._(e);
				if (t && t !== e) return t;
			}
			let n = e.replace("dialectics.hints.", "");
			return window.DIALECTICS_HINTS && window.DIALECTICS_HINTS[n] ? window.DIALECTICS_HINTS[n] : t;
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
		], c = {}, l = [], u = {
			left: "step1",
			right: "step2",
			center: "step5"
		};
		t.forEach((e) => {
			e.isSection === !0 || e.side, e.role && e.role !== "anchor" && e.side && u[e.side] && (u[e.side] = e.role), e.role ? (c[e.role] = e, e.role !== "anchor" && l.push(e)) : l.push(e);
		});
		let d = {
			step1: 1,
			step2: 2,
			step3: 3,
			step4: 4,
			step5: 5
		}, f = [];
		if (!c.anchor) l.forEach((e) => f.push({
			type: "block",
			data: e
		})), f.push({
			type: "hint",
			data: o
		});
		else {
			let e = null;
			for (let t of s) {
				let n = window.app && window.app.state && window.app.state.dismissedHints && window.app.state.dismissedHints.includes(t.id), r = document.getElementById("toggleShowHiddenHints")?.checked;
				if (!c[t.id] && !(n && !r)) {
					e = t;
					break;
				}
			}
			let t = !1;
			l.forEach((n) => {
				e && !t && n.role && d[n.role] && d[n.role] > d[e.id] && (f.push({
					type: "hint",
					data: e
				}), t = !0), f.push({
					type: "block",
					data: n
				});
			}), e && !t && f.push({
				type: "hint",
				data: e
			}), f.push({
				type: "block",
				data: c.anchor
			});
		}
		let p = (e) => {
			let t = document.createElement("div");
			return t.className = "block-insert-row", [
				"left",
				"right",
				"center"
			].forEach((r) => {
				let i = document.createElement("div");
				if (i.className = `insert-wrap insert-wrap--${r}`, r === "left") {
					i.style.display = "flex", i.style.gap = "8px", i.style.alignItems = "center", i.style.justifyContent = "center", i.innerHTML = "\n                        <button class=\"btn-insert-block btn-insert-round\" title=\"Добавить блок\">+</button>\n                    ";
					let t = i.querySelectorAll("button");
					t[0].onclick = (t) => {
						t.stopPropagation(), n.onInsertAfter("left", e - 1);
					};
				} else if (r === "right") {
					i.style.display = "flex", i.style.gap = "8px", i.style.alignItems = "center", i.style.justifyContent = "center", i.innerHTML = "\n                        <button class=\"btn-insert-block btn-insert-round\" title=\"Добавить блок\">+</button>\n                        <button class=\"btn-insert-block btn-insert-section\" title=\"Добавить раздел\">📑 Раздел</button>\n                    ";
					let t = i.querySelectorAll("button");
					t[0].onclick = (t) => {
						t.stopPropagation(), n.onInsertAfter("right", e - 1);
					}, t[1].onclick = (t) => {
						t.stopPropagation(), n.onInsertAfter("section", e - 1);
					};
				} else {
					i.style.display = "flex", i.style.gap = "8px", i.style.alignItems = "center", i.style.justifyContent = "center", i.innerHTML = "\n                        <button class=\"btn-insert-block btn-insert-square\" title=\"Add summary\">+</button>\n                    ";
					let t = i.querySelectorAll("button");
					t[0].onclick = (t) => {
						t.stopPropagation(), n.onInsertAfter("center", e - 1);
					};
				}
				t.appendChild(i);
			}), t;
		};
		n.onInsertAfter && e.appendChild(p(0));
		let m = 0;
		f.forEach((t) => {
			if (t.type === "hint") {
				if (e.classList.contains("mode-no-dialectics") || document.getElementById("toggleDialecticsMode") && !document.getElementById("toggleDialecticsMode").checked) return;
				let r = t.data, i = document.createElement("div");
				i.className = `dialectics-hint-block block-${r.side}`, i.dataset.hintId = r.id, i.dataset.side = r.side;
				let o = r.id === "step3" ? a("dialectics.ai_opposites", "ИИ-противоположности") : a("dialectics.ai_help", "Помощь ИИ");
				i.innerHTML = `
                    <button class="btn-hint-dismiss" title="Скрыть подсказку" style="position:absolute; left: 12px; top: 12px; background:none; border:none; cursor:pointer; font-size:1rem; color:#94a3b8; transition:color 0.2s; display:flex; align-items:center; justify-content:center; padding:2px; z-index:10;">✕</button>
                    <div class="dialectics-hint-text">${r.text}</div>
                    <button class="btn-hint-ai" title="${o}" style="position:absolute; right: 12px; top: 12px; background:rgba(255,255,255,0.7); border:1px solid #cbd5e1; border-radius:14px; padding:3px 10px; cursor:pointer; opacity:0.85; transition:all 0.2s; font-size: 0.82rem; display:flex; align-items:center; gap:5px; color:#334155; font-weight:500; box-shadow: 0 1px 2px rgba(0,0,0,0.05);"><span style="font-size:1rem;">✨</span> <span>${o}</span></button>
                `, i.onclick = (e) => {
					e.stopPropagation(), n.onHintClick && n.onHintClick(r);
				};
				let s = i.querySelector(".btn-hint-dismiss");
				s && (s.onmouseover = () => s.style.color = "#ef4444", s.onmouseleave = () => s.style.color = "#94a3b8", s.onclick = (e) => {
					e.stopPropagation(), n.onHintDismiss && n.onHintDismiss(r.id);
				});
				let c = i.querySelector(".btn-hint-ai");
				c && (c.onmouseover = () => c.style.opacity = "1", c.onmouseout = () => c.style.opacity = "0.6", c.onclick = (e) => {
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
					e.appendChild(c), n.onInsertAfter && e.appendChild(p(m + 1)), m++;
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
				d && c.classList.add("is-collapsed"), c.dataset.collapsed = d ? "true" : "false";
				let f = i.pinned === !0 || i.isPinned === !0 || i.isSticky === !0 || i.dataset?.pinned === "true";
				f && (i.side === "left" || !i.side) && c.classList.add("is-sticky"), c.dataset.pinned = f && (i.side === "left" || !i.side) ? "true" : "false";
				let h = i.status || "none";
				if (c.dataset.status = h, i.title && (c.dataset.title = i.title), i.color) {
					c.dataset.color = i.color;
					let e = g_[i.color];
					e && (c.style.setProperty("--block-custom-bg", e.bg), c.style.setProperty("--block-custom-accent", e.accent));
				} else delete c.dataset.color, c.style.removeProperty("--block-custom-bg"), c.style.removeProperty("--block-custom-accent");
				let g = `<button class="btn-block-fold-toggle" title="Свернуть/Развернуть" style="background:none; border:none; cursor:pointer; font-size:0.75rem; color:#64748b; padding:2px 6px; line-height:1; display:inline-flex; align-items:center; justify-content:center; border-radius:4px; transition:background 0.2s;" onmouseover="this.style.background='#f1f5f9'" onmouseout="this.style.background='transparent'">${d ? "▶" : "▼"}</button>`, _ = `<span class="note-status-circle status-${h} btn-block-status" title="Статус блока: ${h === "ready" ? "Готово (Заблокировано)" : h === "in_progress" ? "В работе" : "Не указан"}" style="width: 14px; height: 14px; margin-right: 4px; flex-shrink: 0; display: inline-block; cursor: pointer; box-sizing: border-box; border-radius: 50%; padding: 0; background-clip: padding-box;"></span>`, v = "";
				h === "ready" && (v = "<span class=\"block-lock-icon\" title=\"Блок заблокирован от изменений\" style=\"font-size: 0.85rem; margin-left: 6px; cursor: default; user-select: none;\">🔒</span>");
				let y = "", b = "";
				(i.side === "left" || !i.side) && (y = `<button class="btn-block-pin-header ${f ? "is-pinned" : ""}" title="${f ? "Открепить блок при прокрутке" : "Заставить блок плавать при прокрутке"}" style="margin-left:auto; background: ${f ? "#e0e7ff" : "transparent"}; border: 1px solid ${f ? "#6366f1" : "transparent"}; color: ${f ? "#4338ca" : "#94a3b8"}; padding: 2px 8px; border-radius: 12px; font-size: 0.75rem; font-weight: 800; display: inline-flex; align-items: center; gap: 4px; cursor: pointer; transition: all 0.2s;">${f ? "📌 Закреплен" : "📌"}</button>`, b = "");
				let x = i.html || "<p></p>";
				if (i.tabs && i.active_tab_id) {
					let e = i.tabs.find((e) => e.id === i.active_tab_id);
					e && (x = e.content || e.html || x);
				}
				let S = `
                    <div class="dialectics-block-header" style="display:flex; align-items:center; justify-content:space-between; font-size: 0.8rem; color: #64748b; font-weight: 700; padding: 12px 14px 6px 14px; border-bottom:1px solid #f1f5f9; text-transform: uppercase; background:#f8fafc; border-top-left-radius:12px; border-top-right-radius:12px; cursor: grab; position: sticky; top: 0; z-index: 15; box-shadow: 0 2px 6px -1px rgba(0,0,0,0.05);" title="Зажмите заголовок для перетаскивания блока">
                        <div style="display:flex; align-items:center; gap:4px; overflow:hidden;">
                            ${_}
                            ${g}
                            <span class="block-title-text" style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${l}</span>
                            ${u}
                            ${v}
                        </div>
                        ${y}
                    </div>
                `, C = "";
				i.sources && i.sources.length > 0 && (C = `<span style="font-size:0.7rem; font-weight:bold; background:#e2e8f0; border-radius:10px; padding:2px 5px; margin-left:4px;">${i.sources.length}</span>`);
				let w = "";
				i.words && i.words.length > 0 && (w = `<span style="font-size:0.7rem; font-weight:bold; background:#e2e8f0; border-radius:10px; padding:2px 5px; margin-left:4px;">${i.words.length}</span>`);
				let T = "";
				i.words && i.words.length > 0 && (T = "<div class=\"dialectics-block-words-row\" style=\"margin-top: 4px; display: flex; flex-wrap: wrap; gap: 6px; padding: 0 14px 10px 14px;\">", i.words.forEach((e) => {
					T += `<span class="dialectics-word-badge" onclick="event.stopPropagation(); window.app && window.app.showWordDefinition('${e.word.replace(/'/g, "\\'")}')" style="cursor: pointer; background: #eff6ff; border: 1px solid #bfdbfe; color: #1e40af; border-radius: 12px; padding: 2px 8px; font-size: 0.8rem; font-weight: 500; display: inline-flex; align-items: center; gap: 4px;" title="Нажмите для просмотра определения">📖 ${e.word}</span>`;
				}), T += "</div>");
				let E = 0;
				window.app && window.app.state && window.app.state.blockStickersCount && (E = window.app.state.blockStickersCount[i.id] || 0);
				let ee = E > 0 ? `<span style="font-size:0.7rem; font-weight:bold; background:#fde68a; border-radius:10px; padding:2px 5px; margin-left:4px; color:#b45309;">${E}</span>` : "", te = `<div class="dialectics-content-inner">${x}</div>`;
				c.innerHTML = `
                    <div class="dialectics-block-actions">
                        ${b}
                        <button class="btn-block-sources" title="Sources">🔗${C}</button>
                        <button class="btn-block-words" title="Словарь">📖${w}</button>
                        <button class="btn-block-hacks" title="${window._ ? window._("dialectics.hacks_title") : "Хаки понимания"}">💡</button>
                        <button class="btn-block-sticker" title="Stickers" style="display: flex; align-items: center; justify-content: center; gap: 2px;"><div class="sticker-icon-mini" style="transform: scale(0.65); margin: 0;"></div>${ee}</button>
                        <button class="btn-block-hidden-phrases" title="Развернуть/свернуть сноски">👁</button>
                        <span class="btn-block-sep" style="width: 1px; height: 16px; background-color: #cbd5e1; margin: 0 4px; align-self: center;"></span>
                        <button class="btn-block-edit" title="Edit">✎</button>
                        ${i.role === "step3" ? "<button class=\"btn-block-ai\" title=\"Поиск противоположностей\">✨</button>" : ""}
                        <button class="btn-block-check-ai" title="${window._ ? window._("dialectics.check_ai") : "Проверить ИИ"}">🔬</button>
                        <button class="btn-block-copy" title="${window._ ? window._("dialectics.copy_text") : "Скопировать текст"}">📋</button>
                        <button class="btn-block-color" title="Цвет">🎨</button>
                        <button class="btn-block-del" title="Delete">🗑️</button>
                    </div>
                    ${S}
                    ${te}
                    ${T}
                `, this.renderMath(c);
				let ne = c.querySelector(".dialectics-block-header");
				ne && (ne.addEventListener("mouseenter", () => {
					c.setAttribute("draggable", "true");
				}), ne.addEventListener("mouseleave", () => {
					c.classList.contains("is-dragging") || c.setAttribute("draggable", "false");
				}), ne.addEventListener("mousedown", (e) => {
					e.target.closest("button") || e.target.closest(".dialectics-step-info-trigger") ? (c.setAttribute("draggable", "false"), c._preventDrag = !0) : (c.setAttribute("draggable", "true"), c._preventDrag = !1);
				}));
				let re = c.querySelector(".btn-block-status");
				re && (re.onclick = (e) => {
					e.stopPropagation(), e.preventDefault(), n.onStatusToggle && n.onStatusToggle(c);
				}, re.onmousedown = (e) => {
					e.stopPropagation();
				});
				let ie = c.querySelector(".btn-block-fold-toggle");
				ie && (ie.onclick = (e) => {
					e.stopPropagation(), c.classList.contains("is-collapsed") ? (c.classList.remove("is-collapsed"), ie.innerHTML = "▼", c.dataset.collapsed = "false") : (c.classList.add("is-collapsed"), ie.innerHTML = "▶", c.dataset.collapsed = "true"), n.onFoldToggle && n.onFoldToggle();
				});
				let ae = (t) => {
					t.stopPropagation();
					let r = c.dataset.pinned === "true" || c.classList.contains("is-sticky");
					r || e.querySelectorAll(".dialectics-block.is-sticky").forEach((e) => {
						if (e !== c) {
							e.classList.remove("is-sticky"), e.dataset.pinned = "false";
							let t = e.querySelector(".btn-block-pin-header");
							t && (t.innerHTML = "📌", t.classList.remove("is-pinned"), t.style.background = "transparent", t.style.borderColor = "transparent", t.style.color = "#94a3b8", t.title = "Заставить блок плавать при прокрутке");
							let n = e.querySelector(".btn-block-pin");
							n && (n.classList.remove("is-pinned"), n.style.color = "inherit", n.title = "Заставить блок плавать при прокрутке");
						}
					});
					let i = !r;
					c.dataset.pinned = i ? "true" : "false", i ? c.classList.add("is-sticky") : c.classList.remove("is-sticky");
					let a = c.querySelector(".btn-block-pin-header");
					a && (a.innerHTML = i ? "📌 Закреплен" : "📌", i ? (a.classList.add("is-pinned"), a.style.background = "#e0e7ff", a.style.borderColor = "#6366f1", a.style.color = "#4338ca") : (a.classList.remove("is-pinned"), a.style.background = "transparent", a.style.borderColor = "transparent", a.style.color = "#94a3b8"), a.title = i ? "Открепить блок при прокрутке" : "Заставить блок плавать при прокрутке");
					let o = c.querySelector(".btn-block-pin");
					o && (i ? (o.classList.add("is-pinned"), o.style.color = "#6366f1") : (o.classList.remove("is-pinned"), o.style.color = "inherit"), o.title = i ? "Открепить блок при прокрутке" : "Заставить блок плавать при прокрутке"), n.onSave ? n.onSave() : window.app && window.app.saveNote && window.app.saveNote();
				}, oe = c.querySelector(".btn-block-pin");
				oe && (oe.onclick = ae);
				let se = c.querySelector(".btn-block-pin-header");
				se && (se.onclick = ae);
				let ce = c.querySelector(".btn-block-ai");
				ce && (ce.onclick = (e) => {
					if (e.stopPropagation(), h === "ready") {
						window.showToast && window.showToast("Этот блок заблокирован от изменений.", "warning");
						return;
					}
					n.onAI && n.onAI(c);
				});
				let le = c.querySelector(".btn-block-check-ai");
				le && (le.onclick = (e) => {
					e.stopPropagation(), n.onCheckAI && n.onCheckAI(c);
				});
				let ue = c.querySelector(".btn-block-copy");
				ue && (ue.onclick = (e) => {
					e.stopPropagation();
					let t = c.querySelector(".dialectics-content-inner");
					if (t) {
						let e = t.innerText || t.textContent || "";
						navigator.clipboard.writeText(e).then(() => {
							let e = window._ ? window._("dialectics.text_copied") : "Текст скопирован в буфер обмена";
							window.showToast && window.showToast(e, "success");
						}).catch((e) => {
							console.error("Failed to copy: ", e);
						});
					}
				}), c.querySelector(".btn-block-edit").onclick = (e) => {
					if (e.stopPropagation(), h === "ready") {
						window.showToast && window.showToast("Этот блок заблокирован. Смените статус на «В работе», чтобы изменить его.", "warning");
						return;
					}
					let t = i.tabs && i.tabs.find((e) => e.id === i.active_tab_id);
					if (t && t.status === "clean" && t.is_locked !== !1) {
						window.showToast && window.showToast("Для редактирования чистовика сперва нажмите на иконку замка 🔒 в шапке вкладки", "warning");
						return;
					}
					n.onEdit(c);
				}, c.querySelector(".btn-block-sticker").onclick = (e) => {
					if (e.stopPropagation(), h === "ready") {
						window.showToast && window.showToast("Этот блок заблокирован от изменений.", "warning");
						return;
					}
					window.app && window.app.openStickersForCurrent(i.id);
				};
				let de = c.querySelector(".btn-block-hidden-phrases");
				de && (de.onclick = (e) => {
					e.stopPropagation();
					let t = c.querySelectorAll(".dialectics-hidden-phrase");
					if (!t.length) {
						window.showToast && window.showToast("В этом блоке нет сносок / скрытого текста", "info");
						return;
					}
					let n = !1;
					t.forEach((e) => {
						e.getAttribute("data-expanded") !== "true" && (n = !0);
					});
					let r = n ? "true" : "false";
					t.forEach((e) => {
						e.setAttribute("data-expanded", r);
					});
				}), i.sources && (c.dataset.sources = JSON.stringify(i.sources)), i.words && (c.dataset.words = JSON.stringify(i.words)), c.querySelector(".btn-block-sources").onclick = (e) => {
					if (e.stopPropagation(), h === "ready") {
						window.showToast && window.showToast("Этот блок заблокирован от изменений.", "warning");
						return;
					}
					n.onSources && n.onSources(c);
				}, c.querySelector(".btn-block-words").onclick = (e) => {
					if (e.stopPropagation(), h === "ready") {
						window.showToast && window.showToast("Этот блок заблокирован от изменений.", "warning");
						return;
					}
					n.onWords && n.onWords(c);
				};
				let fe = c.querySelector(".btn-block-color");
				fe && (fe.onclick = (e) => {
					if (e.stopPropagation(), h === "ready") {
						window.showToast && window.showToast("Этот блок заблокирован от изменений.", "warning");
						return;
					}
					n.onColor && n.onColor(c);
				}), c.querySelector(".btn-block-del").onclick = async (e) => {
					if (e.stopPropagation(), h === "ready") {
						window.showToast && window.showToast("Этот блок заблокирован от удаления. Смените статус на «В работе», чтобы удалить его.", "warning");
						return;
					}
					if (await r({
						title: window._ ? window._("dialectics.delete_block_title") : "Удаление блока",
						message: window._ ? window._("dialectics.delete_block_msg") : "Вы уверены, что хотите удалить этот блок?",
						icon: "",
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
						e && e.classList.contains("block-insert-row") && e.remove(), c.remove(), n.onDelete && n.onDelete(c.dataset.blockId || c.dataset.id);
					}
				};
				let pe = c.querySelector(".btn-block-hacks");
				pe && (pe.onclick = (e) => {
					if (e.stopPropagation(), h === "ready") {
						window.showToast && window.showToast("Этот блок заблокирован от изменений.", "warning");
						return;
					}
					n.onHacks && n.onHacks(c);
				}), e.appendChild(c), n.onInsertAfter && e.appendChild(p(m + 1)), m++;
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
				let a = n.innerHTML;
				e._tiptapEditor && (a = e._tiptapEditor.getHTML());
				let o = e.dataset.title || void 0;
				if (e.classList.contains("is-editing")) {
					let t = e.querySelector(".inline-title-input");
					t && (o = t.value.trim() || void 0);
				}
				t.push({
					id: e.dataset.blockId || "block_" + Math.random().toString(36).substring(2, 9),
					side: e.classList.contains("block-left") ? "left" : e.classList.contains("block-center") ? "center" : "right",
					isSection: !1,
					html: a,
					role: e.dataset.role || void 0,
					sources: r,
					title: o,
					collapsed: e.dataset.collapsed === "true",
					pinned: e.dataset.pinned === "true" || e.classList.contains("is-sticky"),
					words: i,
					color: e.dataset.color || void 0,
					status: e.dataset.status || "none"
				});
			}
		}), t;
	},
	getLastSide(e) {
		if (!e) return null;
		let t = e.querySelectorAll(".dialectics-block");
		return t.length === 0 ? null : t[t.length - 1].classList.contains("block-left") ? "left" : "right";
	}
}, __ = { init(e, t) {
	if (!e) return;
	let n = 0, r = (r, i) => {
		let a = Date.now();
		if (a - n < 500 || (n = a, r.closest("button, .resize-handle, .block-actions"))) return;
		let o = r.closest(".dialectics-block");
		if (o) t.onDoubleClick && t.onDoubleClick(o);
		else {
			let n = e.getBoundingClientRect(), r = n.left + n.width / 2;
			t.onClick && t.onClick(i, r);
		}
	};
	e.addEventListener("dblclick", (e) => {
		e.target && r(e.target, e.clientX);
	});
	let i = 0, a = null;
	e.addEventListener("touchend", (e) => {
		let t = e.changedTouches && e.changedTouches[0];
		if (!t) return;
		let n = t.target;
		if (!n || n.closest("button, .resize-handle, .block-actions")) return;
		let o = Date.now();
		o - i < 350 && (a === n || n.closest(".dialectics-block") === a?.closest(".dialectics-block")) ? (e.cancelable && e.preventDefault(), i = 0, a = null, r(n, t.clientX)) : (i = o, a = n);
	});
} }, v_ = /^\s*>\s$/, y_ = td.create({
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
			wc(this.options.HTMLAttributes, e),
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
		return [ed({
			find: v_,
			type: this.type
		})];
	}
}), b_ = /(?:^|\s)(\*\*(?!\s+\*\*)((?:[^*]+))\*\*(?!\s+\*\*))$/, x_ = /(?:^|\s)(\*\*(?!\s+\*\*)((?:[^*]+))\*\*(?!\s+\*\*))/g, S_ = /(?:^|\s)(__(?!\s+__)((?:[^_]+))__(?!\s+__))$/, C_ = /(?:^|\s)(__(?!\s+__)((?:[^_]+))__(?!\s+__))/g, w_ = Wc.create({
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
			wc(this.options.HTMLAttributes, e),
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
		return [Zu({
			find: b_,
			type: this.type
		}), Zu({
			find: S_,
			type: this.type
		})];
	},
	addPasteRules() {
		return [nd({
			find: x_,
			type: this.type
		}), nd({
			find: C_,
			type: this.type
		})];
	}
}), T_ = "listItem", E_ = "textStyle", D_ = /^\s*([-+*])\s$/, O_ = td.create({
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
			wc(this.options.HTMLAttributes, e),
			0
		];
	},
	addCommands() {
		return { toggleBulletList: () => ({ commands: e, chain: t }) => this.options.keepAttributes ? t().toggleList(this.name, this.options.itemTypeName, this.options.keepMarks).updateAttributes(T_, this.editor.getAttributes(E_)).run() : e.toggleList(this.name, this.options.itemTypeName, this.options.keepMarks) };
	},
	addKeyboardShortcuts() {
		return { "Mod-Shift-8": () => this.editor.commands.toggleBulletList() };
	},
	addInputRules() {
		let e = ed({
			find: D_,
			type: this.type
		});
		return (this.options.keepMarks || this.options.keepAttributes) && (e = ed({
			find: D_,
			type: this.type,
			keepMarks: this.options.keepMarks,
			keepAttributes: this.options.keepAttributes,
			getAttributes: () => this.editor.getAttributes(E_),
			editor: this.editor
		})), [e];
	}
}), k_ = /(^|[^`])`([^`]+)`(?!`)/, A_ = /(^|[^`])`([^`]+)`(?!`)/g, j_ = Wc.create({
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
			wc(this.options.HTMLAttributes, e),
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
		return [Zu({
			find: k_,
			type: this.type
		})];
	},
	addPasteRules() {
		return [nd({
			find: A_,
			type: this.type
		})];
	}
}), M_ = /^```([a-z]+)?[\s\n]$/, N_ = /^~~~([a-z]+)?[\s\n]$/, P_ = td.create({
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
			wc(this.options.HTMLAttributes, t),
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
				return o === void 0 ? !1 : r.nodeAt(o) ? e.commands.command(({ tr: e }) => (e.setSelection(D.near(r.resolve(o))), !0)) : e.commands.exitCode();
			}
		};
	},
	addInputRules() {
		return [$u({
			find: M_,
			type: this.type,
			getAttributes: (e) => ({ language: e[1] })
		}), $u({
			find: N_,
			type: this.type,
			getAttributes: (e) => ({ language: e[1] })
		})];
	},
	addProseMirrorPlugins() {
		return [new zn({
			key: new Hn("codeBlockVSCodeHandler"),
			props: { handlePaste: (e, t) => {
				if (!t.clipboardData || this.editor.isActive(this.type.name)) return !1;
				let n = t.clipboardData.getData("text/plain"), r = t.clipboardData.getData("vscode-editor-data"), i = (r ? JSON.parse(r) : void 0)?.mode;
				if (!n || !i) return !1;
				let { tr: a, schema: o } = e.state, s = o.text(n.replace(/\r\n?/g, "\n"));
				return a.replaceSelectionWith(this.type.create({ language: i }, s)), a.selection.$from.parent.type !== this.type && a.setSelection(O.near(a.doc.resolve(Math.max(0, a.selection.from - 2)))), a.setMeta("paste", !0), e.dispatch(a), !0;
			} }
		})];
	}
}), F_ = td.create({
	name: "doc",
	topNode: !0,
	content: "block+"
});
//#endregion
//#region node_modules/prosemirror-dropcursor/dist/index.js
function I_(e = {}) {
	return new zn({ view(t) {
		return new L_(t, e);
	} });
}
var L_ = class {
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
				let t = Qt(this.editorView.state.doc, e, this.editorView.dragging.slice);
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
}, R_ = el.create({
	name: "dropCursor",
	addOptions() {
		return {
			color: "currentColor",
			width: 1,
			class: void 0
		};
	},
	addProseMirrorPlugins() {
		return [I_(this.options)];
	}
}), z_ = class e extends D {
	constructor(e) {
		super(e, e);
	}
	map(t, n) {
		let r = t.resolve(n.map(this.head));
		return e.valid(r) ? new e(r) : D.near(r);
	}
	content() {
		return _.empty;
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
		return new B_(this.anchor);
	}
	static valid(e) {
		let t = e.parent;
		if (t.inlineContent || !H_(e) || !U_(e)) return !1;
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
					if (a.isAtom && !a.isText && !k.isSelectable(a)) {
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
z_.prototype.visible = !1, z_.findFrom = z_.findGapCursorFrom, D.jsonID("gapcursor", z_);
var B_ = class e {
	constructor(e) {
		this.pos = e;
	}
	map(t) {
		return new e(t.map(this.pos));
	}
	resolve(e) {
		let t = e.resolve(this.pos);
		return z_.valid(t) ? new z_(t) : D.near(t);
	}
};
function V_(e) {
	return e.isAtom || e.spec.isolating || e.spec.createGapCursor;
}
function H_(e) {
	for (let t = e.depth; t >= 0; t--) {
		let n = e.index(t), r = e.node(t);
		if (n == 0) {
			if (r.type.spec.isolating) return !0;
			continue;
		}
		for (let e = r.child(n - 1);; e = e.lastChild) {
			if (e.childCount == 0 && !e.inlineContent || V_(e.type)) return !0;
			if (e.inlineContent) return !1;
		}
	}
	return !0;
}
function U_(e) {
	for (let t = e.depth; t >= 0; t--) {
		let n = e.indexAfter(t), r = e.node(t);
		if (n == r.childCount) {
			if (r.type.spec.isolating) return !0;
			continue;
		}
		for (let e = r.child(n);; e = e.firstChild) {
			if (e.childCount == 0 && !e.inlineContent || V_(e.type)) return !0;
			if (e.inlineContent) return !1;
		}
	}
	return !0;
}
function W_() {
	return new zn({ props: {
		decorations: Y_,
		createSelectionBetween(e, t, n) {
			return t.pos == n.pos && z_.valid(n) ? new z_(n) : null;
		},
		handleClick: q_,
		handleKeyDown: G_,
		handleDOMEvents: { beforeinput: J_ }
	} });
}
var G_ = Ds({
	ArrowLeft: K_("horiz", -1),
	ArrowRight: K_("horiz", 1),
	ArrowUp: K_("vert", -1),
	ArrowDown: K_("vert", 1)
});
function K_(e, t) {
	let n = e == "vert" ? t > 0 ? "down" : "up" : t > 0 ? "right" : "left";
	return function(e, r, i) {
		let a = e.selection, o = t > 0 ? a.$to : a.$from, s = a.empty;
		if (a instanceof O) {
			if (!i.endOfTextblock(n) || o.depth == 0) return !1;
			s = !1, o = e.doc.resolve(t > 0 ? o.after() : o.before());
		}
		let c = z_.findGapCursorFrom(o, t, s);
		return c ? (r && r(e.tr.setSelection(new z_(c))), !0) : !1;
	};
}
function q_(e, t, n) {
	if (!e || !e.editable) return !1;
	let r = e.state.doc.resolve(t);
	if (!z_.valid(r)) return !1;
	let i = e.posAtCoords({
		left: n.clientX,
		top: n.clientY
	});
	return i && i.inside > -1 && k.isSelectable(e.state.doc.nodeAt(i.inside)) ? !1 : (e.dispatch(e.state.tr.setSelection(new z_(r))), !0);
}
function J_(e, t) {
	if (t.inputType != "insertCompositionText" || !(e.state.selection instanceof z_)) return !1;
	let { $from: n } = e.state.selection, r = n.parent.contentMatchAt(n.index()).findWrapping(e.state.schema.nodes.text);
	if (!r) return !1;
	let i = d.empty;
	for (let e = r.length - 1; e >= 0; e--) i = d.from(r[e].createAndFill(null, i));
	let a = e.state.tr.replace(n.pos, n.pos, new _(i, 0, 0));
	return a.setSelection(O.near(a.doc.resolve(n.pos + 1))), e.dispatch(a), !1;
}
function Y_(e) {
	if (!(e.selection instanceof z_)) return null;
	let t = document.createElement("div");
	return t.className = "ProseMirror-gapcursor", To.create(e.doc, [So.widget(e.selection.head, t, { key: "gapcursor" })]);
}
//#endregion
//#region node_modules/@tiptap/extension-gapcursor/dist/index.js
var X_ = el.create({
	name: "gapCursor",
	addProseMirrorPlugins() {
		return [W_()];
	},
	extendNodeSchema(e) {
		return { allowGapCursor: j(A(e, "allowGapCursor", {
			name: e.name,
			options: e.options,
			storage: e.storage
		})) ?? null };
	}
}), Z_ = td.create({
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
		return ["br", wc(this.options.HTMLAttributes, e)];
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
}), Q_ = td.create({
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
			wc(this.options.HTMLAttributes, t),
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
		return this.options.levels.map((e) => $u({
			find: RegExp(`^(#{${Math.min(...this.options.levels)},${e}})\\s$`),
			type: this.type,
			getAttributes: { level: e }
		}));
	}
}), $_ = 200, ev = function() {};
ev.prototype.append = function(e) {
	return e.length ? (e = ev.from(e), !this.length && e || e.length < $_ && this.leafAppend(e) || this.length < $_ && e.leafPrepend(this) || this.appendInner(e)) : this;
}, ev.prototype.prepend = function(e) {
	return e.length ? ev.from(e).append(this) : this;
}, ev.prototype.appendInner = function(e) {
	return new nv(this, e);
}, ev.prototype.slice = function(e, t) {
	return e === void 0 && (e = 0), t === void 0 && (t = this.length), e >= t ? ev.empty : this.sliceInner(Math.max(0, e), Math.min(this.length, t));
}, ev.prototype.get = function(e) {
	if (!(e < 0 || e >= this.length)) return this.getInner(e);
}, ev.prototype.forEach = function(e, t, n) {
	t === void 0 && (t = 0), n === void 0 && (n = this.length), t <= n ? this.forEachInner(e, t, n, 0) : this.forEachInvertedInner(e, t, n, 0);
}, ev.prototype.map = function(e, t, n) {
	t === void 0 && (t = 0), n === void 0 && (n = this.length);
	var r = [];
	return this.forEach(function(t, n) {
		return r.push(e(t, n));
	}, t, n), r;
}, ev.from = function(e) {
	return e instanceof ev ? e : e && e.length ? new tv(e) : ev.empty;
};
var tv = /* @__PURE__ */ function(e) {
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
		if (this.length + e.length <= $_) return new t(this.values.concat(e.flatten()));
	}, t.prototype.leafPrepend = function(e) {
		if (this.length + e.length <= $_) return new t(e.flatten().concat(this.values));
	}, n.length.get = function() {
		return this.values.length;
	}, n.depth.get = function() {
		return 0;
	}, Object.defineProperties(t.prototype, n), t;
}(ev);
ev.empty = new tv([]);
var nv = /* @__PURE__ */ function(e) {
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
}(ev), rv = 500, iv = class e {
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
				u.push(new ov(t.map));
				let e = t.step.map(i.slice(a)), n;
				e && o.maybeStep(e).doc && (n = o.mapping.maps[o.mapping.maps.length - 1], l.push(new ov(n, void 0, void 0, l.length + u.length))), a--, n && i.appendMap(n, a);
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
			let r = t.steps[e].invert(t.docs[e]), l = new ov(t.mapping.maps[e], r, n), u;
			(u = c && c.merge(l)) && (l = u, e ? a.pop() : s = s.slice(0, s.length - 1)), a.push(l), n &&= (o++, void 0), i || (c = l);
		}
		let l = o - r.depth;
		return l > cv && (s = av(s, l), o -= l), new e(s.append(a), o);
	}
	remapping(e, t) {
		let n = new gt();
		return this.items.forEach((t, r) => {
			let i = t.mirrorOffset != null && r - t.mirrorOffset >= e ? n.maps.length - t.mirrorOffset : void 0;
			n.appendMap(t.map, i);
		}, e, t), n;
	}
	addMaps(t) {
		return this.eventCount == 0 ? this : new e(this.items.append(t.map((e) => new ov(e))), this.eventCount);
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
				l && s++, r.push(new ov(i, o, l));
			} else r.push(new ov(i));
		}, i);
		let l = [];
		for (let e = n; e < o; e++) l.push(new ov(a.maps[e]));
		let u = new e(this.items.slice(0, i).append(l).append(r), s);
		return u.emptyItemCount() > rv && (u = u.compress(this.items.length - r.length)), u;
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
					let c = new ov(o.invert(), t, s), l, u = i.length - 1;
					(l = i.length && i[u].merge(c)) ? i[u] = l : i.push(c);
				}
			} else e.map && r--;
		}, this.items.length, 0), new e(ev.from(i.reverse()), a);
	}
};
iv.empty = new iv(ev.empty, 0);
function av(e, t) {
	let n;
	return e.forEach((e, r) => {
		if (e.selection && t-- == 0) return n = r, !1;
	}), e.slice(n);
}
var ov = class e {
	constructor(e, t, n, r) {
		this.map = e, this.step = t, this.selection = n, this.mirrorOffset = r;
	}
	merge(t) {
		if (this.step && t.step && !t.selection) {
			let n = t.step.merge(this.step);
			if (n) return new e(n.getMap().invert(), n, this.selection);
		}
	}
}, sv = class {
	constructor(e, t, n, r, i) {
		this.done = e, this.undone = t, this.prevRanges = n, this.prevTime = r, this.prevComposition = i;
	}
}, cv = 20;
function lv(e, t, n, r) {
	let i = n.getMeta(_v), a;
	if (i) return i.historyState;
	n.getMeta(vv) && (e = new sv(e.done, e.undone, null, 0, -1));
	let o = n.getMeta("appendedTransaction");
	if (n.steps.length == 0) return e;
	if (o && o.getMeta(_v)) return o.getMeta(_v).redo ? new sv(e.done.addTransform(n, void 0, r, gv(t)), e.undone, dv(n.mapping.maps), e.prevTime, e.prevComposition) : new sv(e.done, e.undone.addTransform(n, void 0, r, gv(t)), null, e.prevTime, e.prevComposition);
	if (n.getMeta("addToHistory") !== !1 && !(o && o.getMeta("addToHistory") === !1)) {
		let i = n.getMeta("composition"), a = e.prevTime == 0 || !o && e.prevComposition != i && (e.prevTime < (n.time || 0) - r.newGroupDelay || !uv(n, e.prevRanges)), s = o ? fv(e.prevRanges, n.mapping) : dv(n.mapping.maps);
		return new sv(e.done.addTransform(n, a ? t.selection.getBookmark() : void 0, r, gv(t)), iv.empty, s, n.time, i ?? e.prevComposition);
	} else if (a = n.getMeta("rebased")) return new sv(e.done.rebased(n, a), e.undone.rebased(n, a), fv(e.prevRanges, n.mapping), e.prevTime, e.prevComposition);
	else return new sv(e.done.addMaps(n.mapping.maps), e.undone.addMaps(n.mapping.maps), fv(e.prevRanges, n.mapping), e.prevTime, e.prevComposition);
}
function uv(e, t) {
	if (!t) return !1;
	if (!e.docChanged) return !0;
	let n = !1;
	return e.mapping.maps[0].forEach((e, r) => {
		for (let i = 0; i < t.length; i += 2) e <= t[i + 1] && r >= t[i] && (n = !0);
	}), n;
}
function dv(e) {
	let t = [];
	for (let n = e.length - 1; n >= 0 && t.length == 0; n--) e[n].forEach((e, n, r, i) => t.push(r, i));
	return t;
}
function fv(e, t) {
	if (!e) return null;
	let n = [];
	for (let r = 0; r < e.length; r += 2) {
		let i = t.map(e[r], 1), a = t.map(e[r + 1], -1);
		i <= a && n.push(i, a);
	}
	return n;
}
function pv(e, t, n) {
	let r = gv(t), i = _v.get(t).spec.config, a = (n ? e.undone : e.done).popEvent(t, r);
	if (!a) return null;
	let o = a.selection.resolve(a.transform.doc), s = (n ? e.done : e.undone).addTransform(a.transform, t.selection.getBookmark(), i, r), c = new sv(n ? s : a.remaining, n ? a.remaining : s, null, 0, -1);
	return a.transform.setSelection(o).setMeta(_v, {
		redo: n,
		historyState: c
	});
}
var mv = !1, hv = null;
function gv(e) {
	let t = e.plugins;
	if (hv != t) {
		mv = !1, hv = t;
		for (let e = 0; e < t.length; e++) if (t[e].spec.historyPreserveItems) {
			mv = !0;
			break;
		}
	}
	return mv;
}
var _v = new Hn("history"), vv = new Hn("closeHistory");
function yv(e = {}) {
	return e = {
		depth: e.depth || 100,
		newGroupDelay: e.newGroupDelay || 500
	}, new zn({
		key: _v,
		state: {
			init() {
				return new sv(iv.empty, iv.empty, null, 0, -1);
			},
			apply(t, n, r) {
				return lv(n, r, t, e);
			}
		},
		config: e,
		props: { handleDOMEvents: { beforeinput(e, t) {
			let n = t.inputType, r = n == "historyUndo" ? xv : n == "historyRedo" ? Sv : null;
			return !r || !e.editable ? !1 : (t.preventDefault(), r(e.state, e.dispatch));
		} } }
	});
}
function bv(e, t) {
	return (n, r) => {
		let i = _v.getState(n);
		if (!i || (e ? i.undone : i.done).eventCount == 0) return !1;
		if (r) {
			let a = pv(i, n, e);
			a && r(t ? a.scrollIntoView() : a);
		}
		return !0;
	};
}
var xv = bv(!1, !0), Sv = bv(!0, !0), Cv = el.create({
	name: "history",
	addOptions() {
		return {
			depth: 100,
			newGroupDelay: 500
		};
	},
	addCommands() {
		return {
			undo: () => ({ state: e, dispatch: t }) => xv(e, t),
			redo: () => ({ state: e, dispatch: t }) => Sv(e, t)
		};
	},
	addProseMirrorPlugins() {
		return [yv(this.options)];
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
}), wv = td.create({
	name: "horizontalRule",
	addOptions() {
		return { HTMLAttributes: {} };
	},
	group: "block",
	parseHTML() {
		return [{ tag: "hr" }];
	},
	renderHTML({ HTMLAttributes: e }) {
		return ["hr", wc(this.options.HTMLAttributes, e)];
	},
	addCommands() {
		return { setHorizontalRule: () => ({ chain: e, state: t }) => {
			if (!rd(t, t.schema.nodes[this.name])) return !1;
			let { selection: n } = t, { $from: r, $to: i } = n, a = e();
			return r.parentOffset === 0 ? a.insertContentAt({
				from: Math.max(r.pos - 1, 0),
				to: i.pos
			}, { type: this.name }) : Tu(n) ? a.insertContentAt(i.pos, { type: this.name }) : a.insertContent({ type: this.name }), a.command(({ tr: e, dispatch: t }) => {
				if (t) {
					let { $to: t } = e.selection, n = t.end();
					if (t.nodeAfter) t.nodeAfter.isTextblock ? e.setSelection(O.create(e.doc, t.pos + 1)) : t.nodeAfter.isBlock ? e.setSelection(k.create(e.doc, t.pos)) : e.setSelection(O.create(e.doc, t.pos));
					else {
						let r = t.parent.type.contentMatch.defaultType?.create();
						r && (e.insert(n, r), e.setSelection(O.create(e.doc, n + 1)));
					}
					e.scrollIntoView();
				}
				return !0;
			}).run();
		} };
	},
	addInputRules() {
		return [Qu({
			find: /^(?:---|—-|___\s|\*\*\*\s)$/,
			type: this.type
		})];
	}
}), Tv = /(?:^|\s)(\*(?!\s+\*)((?:[^*]+))\*(?!\s+\*))$/, Ev = /(?:^|\s)(\*(?!\s+\*)((?:[^*]+))\*(?!\s+\*))/g, Dv = /(?:^|\s)(_(?!\s+_)((?:[^_]+))_(?!\s+_))$/, Ov = /(?:^|\s)(_(?!\s+_)((?:[^_]+))_(?!\s+_))/g, kv = Wc.create({
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
			wc(this.options.HTMLAttributes, e),
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
		return [Zu({
			find: Tv,
			type: this.type
		}), Zu({
			find: Dv,
			type: this.type
		})];
	},
	addPasteRules() {
		return [nd({
			find: Ev,
			type: this.type
		}), nd({
			find: Ov,
			type: this.type
		})];
	}
}), Av = td.create({
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
			wc(this.options.HTMLAttributes, e),
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
}), jv = "listItem", Mv = "textStyle", Nv = /^(\d+)\.\s$/, Pv = td.create({
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
			wc(this.options.HTMLAttributes, n),
			0
		] : [
			"ol",
			wc(this.options.HTMLAttributes, e),
			0
		];
	},
	addCommands() {
		return { toggleOrderedList: () => ({ commands: e, chain: t }) => this.options.keepAttributes ? t().toggleList(this.name, this.options.itemTypeName, this.options.keepMarks).updateAttributes(jv, this.editor.getAttributes(Mv)).run() : e.toggleList(this.name, this.options.itemTypeName, this.options.keepMarks) };
	},
	addKeyboardShortcuts() {
		return { "Mod-Shift-7": () => this.editor.commands.toggleOrderedList() };
	},
	addInputRules() {
		let e = ed({
			find: Nv,
			type: this.type,
			getAttributes: (e) => ({ start: +e[1] }),
			joinPredicate: (e, t) => t.childCount + t.attrs.start === +e[1]
		});
		return (this.options.keepMarks || this.options.keepAttributes) && (e = ed({
			find: Nv,
			type: this.type,
			keepMarks: this.options.keepMarks,
			keepAttributes: this.options.keepAttributes,
			getAttributes: (e) => ({
				start: +e[1],
				...this.editor.getAttributes(Mv)
			}),
			joinPredicate: (e, t) => t.childCount + t.attrs.start === +e[1],
			editor: this.editor
		})), [e];
	}
}), Fv = td.create({
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
			wc(this.options.HTMLAttributes, e),
			0
		];
	},
	addCommands() {
		return { setParagraph: () => ({ commands: e }) => e.setNode(this.name) };
	},
	addKeyboardShortcuts() {
		return { "Mod-Alt-0": () => this.editor.commands.setParagraph() };
	}
}), Iv = /(?:^|\s)(~~(?!\s+~~)((?:[^~]+))~~(?!\s+~~))$/, Lv = /(?:^|\s)(~~(?!\s+~~)((?:[^~]+))~~(?!\s+~~))/g, Rv = Wc.create({
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
			wc(this.options.HTMLAttributes, e),
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
		return [Zu({
			find: Iv,
			type: this.type
		})];
	},
	addPasteRules() {
		return [nd({
			find: Lv,
			type: this.type
		})];
	}
}), zv = td.create({
	name: "text",
	group: "inline"
}), Bv = el.create({
	name: "starterKit",
	addExtensions() {
		let e = [];
		return this.options.bold !== !1 && e.push(w_.configure(this.options.bold)), this.options.blockquote !== !1 && e.push(y_.configure(this.options.blockquote)), this.options.bulletList !== !1 && e.push(O_.configure(this.options.bulletList)), this.options.code !== !1 && e.push(j_.configure(this.options.code)), this.options.codeBlock !== !1 && e.push(P_.configure(this.options.codeBlock)), this.options.document !== !1 && e.push(F_.configure(this.options.document)), this.options.dropcursor !== !1 && e.push(R_.configure(this.options.dropcursor)), this.options.gapcursor !== !1 && e.push(X_.configure(this.options.gapcursor)), this.options.hardBreak !== !1 && e.push(Z_.configure(this.options.hardBreak)), this.options.heading !== !1 && e.push(Q_.configure(this.options.heading)), this.options.history !== !1 && e.push(Cv.configure(this.options.history)), this.options.horizontalRule !== !1 && e.push(wv.configure(this.options.horizontalRule)), this.options.italic !== !1 && e.push(kv.configure(this.options.italic)), this.options.listItem !== !1 && e.push(Av.configure(this.options.listItem)), this.options.orderedList !== !1 && e.push(Pv.configure(this.options.orderedList)), this.options.paragraph !== !1 && e.push(Fv.configure(this.options.paragraph)), this.options.strike !== !1 && e.push(Rv.configure(this.options.strike)), this.options.text !== !1 && e.push(zv.configure(this.options.text)), e;
	}
}), Vv = Wc.create({
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
			wc(this.options.HTMLAttributes, e),
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
}), Hv = {
	async init() {
		if (window.functionPlotLoaded) return;
		let e = (e) => new Promise((t, n) => {
			if (document.querySelector(`script[src="${e}"]`)) return t();
			let r = document.createElement("script");
			r.src = e, r.async = !0, r.onload = t, r.onerror = () => n(/* @__PURE__ */ Error(`Failed to load script: ${e}`)), document.head.appendChild(r);
		});
		try {
			window.app?.logDebug && window.app.logDebug("Loading dependencies (D3 + FunctionPlot)..."), await e("/static/libs/d3.min.js"), await e("/static/libs/function-plot.js"), this.isLoaded = !0, window.app?.logDebug && window.app.logDebug("Graph libraries initialized.");
		} catch (e) {
			console.error("GraphTool init error:", e), window.app?.logDebug && window.app.logDebug(`Load error: ${e.message}`);
		}
	},
	plot(e, t) {
		let n = t.trim();
		if (e.innerHTML = "", !this.isLoaded) {
			e.innerHTML = "<div style=\"color:red; padding:20px;\">Error: Graph library is not loaded.</div>";
			return;
		}
		if (!window.d3) {
			e.innerHTML = "<div style=\"color:red; padding:20px;\">Error: D3 library not found.</div>";
			return;
		}
		window.app && window.app.logDebug && window.app.logDebug(`Plotting: ${n}`);
		let r = [];
		if (!/[a-wy-z]/i.test(n) && (n.includes(",") || n.includes("[") || n.includes("("))) {
			let e = /(-?\d*\.?\d+)\s*,\s*(-?\d*\.?\d+)/g, t;
			for (; (t = e.exec(n)) !== null;) {
				let e = parseFloat(t[1]), n = parseFloat(t[2]);
				!isNaN(e) && !isNaN(n) && r.push([e, n]);
			}
		}
		let i;
		if (r.length > 0) {
			let t = r.map((e) => e[0]), n = r.map((e) => e[1]), a = Math.min(...t), o = Math.max(...t), s = Math.min(...n), c = Math.max(...n), l = Math.max(2, (o - a) * .2), u = Math.max(2, (c - s) * .2), d = [a - l, o + l], f = [s - u, c + u], p = [];
			r.length > 1 && p.push({
				points: r,
				fnType: "points",
				graphType: "polyline",
				color: "#3b82f6"
			}), p.push({
				points: r,
				fnType: "points",
				graphType: "scatter",
				color: "#ef4444"
			}), i = {
				target: e,
				width: e.clientWidth > 100 ? e.clientWidth - 20 : 450,
				height: 300,
				grid: !0,
				xAxis: { domain: d },
				yAxis: { domain: f },
				data: p
			};
		} else {
			let t = n || "x^2";
			i = {
				target: e,
				width: e.clientWidth > 100 ? e.clientWidth - 20 : 450,
				height: 300,
				grid: !0,
				data: [{
					fn: t,
					range: [-10, 10],
					color: "#3b82f6"
				}]
			};
		}
		try {
			window.functionPlot(i), window.app && window.app.logDebug && window.app.logDebug("Success calling functionPlot");
		} catch (t) {
			window.app && window.app.logDebug && window.app.logDebug(`Error in functionPlot: ${t.message}`);
			try {
				if (t.message.includes("new") || t.message.includes("constructor")) {
					let e = new window.functionPlot(i);
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
}, Uv = {
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
}, Wv = class {
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
				this.engine.logDebug("[EditorManager] Initializing TipTap..."), this.tiptap = new Xu({
					element: e,
					extensions: [
						Bv.configure({ blockquote: !1 }),
						Vv,
						s_,
						c_,
						l_,
						u_.configure({ allowBase64: !0 }),
						d_,
						f_,
						m_,
						h_
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
							t.content = e.getHTML(), localStorage.setItem("papanda_editor_open_state", JSON.stringify(t)), this.engine && this.engine.state && !this.engine.state.isProgrammaticUpdate && (this.engine.state.isDirty = !0);
						} catch {}
						this.updateFormattingToolbarStates();
					}
				}), this.mainTiptap = this.tiptap;
				let t = document.getElementById("editorBlockTitleInput");
				t && t.addEventListener("input", (e) => {
					this.engine && this.engine.state && (this.engine.state.isDirty = !0);
					try {
						let t = JSON.parse(localStorage.getItem("papanda_editor_open_state") || "{}");
						t.isOpen && (t.blockTitle = e.target.value, localStorage.setItem("papanda_editor_open_state", JSON.stringify(t)));
					} catch {}
				});
				let n = document.getElementById("editorFormattingToolbar");
				n && n.querySelectorAll(".format-btn").forEach((e) => {
					e.onclick = async (t) => {
						t.preventDefault(), t.stopPropagation();
						let n = e.dataset.format;
						if (!n) return;
						let r = this.tiptap.chain().focus();
						if (n === "bold") r.toggleBold().run();
						else if (n === "italic") r.toggleItalic().run();
						else if (n === "underline") r.toggleUnderline().run();
						else if (n === "strike") r.toggleStrike().run();
						else if (n === "code") r.toggleCode().run();
						else if (n === "question") {
							let { from: e, to: t } = this.tiptap.state.selection;
							if (this.tiptap.isActive("questionMark")) {
								let e = await a({
									title: "Вопрос к выделенному тексту",
									message: "Измените текст вопроса или неясности (оставьте пустым для удаления отметки):",
									placeholder: "Например: Не совсем ясен вывод формулы...",
									value: this.tiptap.getAttributes("questionMark").title || "",
									okLabel: "Сохранить",
									cancelLabel: "Отмена"
								});
								e === null || (e.trim() === "" ? this.tiptap.chain().focus().unsetMark("questionMark").run() : this.tiptap.chain().focus().updateAttributes("questionMark", { title: e.trim() }).run());
							} else {
								if (e === t) {
									window.showToast && window.showToast("Сначала выделите текст для отметки вопроса", "warning");
									return;
								}
								let n = await a({
									title: "Вопрос к выделенному тексту",
									message: "В чём заключается вопрос или неясность?",
									placeholder: "Например: Не совсем ясен вывод формулы / Откуда взялось это утверждение...",
									okLabel: "Сохранить",
									cancelLabel: "Отмена"
								});
								n !== null && n.trim() !== "" ? this.tiptap.chain().focus().setTextSelection({
									from: e,
									to: t
								}).setMark("questionMark", { title: n.trim() }).setTextSelection(t).unsetMark("questionMark").run() : n !== null && this.tiptap.chain().focus().setTextSelection({
									from: e,
									to: t
								}).setMark("questionMark", { title: "Есть вопрос, непонятно" }).setTextSelection(t).unsetMark("questionMark").run();
							}
						} else if (n === "hiddenPhrase") {
							let { from: e, to: t } = this.tiptap.state.selection;
							if (this.tiptap.isActive("hiddenPhrase")) {
								let e = this.tiptap.getAttributes("hiddenPhrase").note || "", t = await a({
									title: window._ ? window._("dialectics.edit_hidden_phrase", "👁 Изменить скрытую фразу") : "👁 Изменить скрытую фразу",
									message: window._ ? window._("dialectics.hidden_phrase_prompt", "Введите новый текст пояснения или сноски (оставьте пустым для удаления):") : "Введите новый текст пояснения или сноски (оставьте пустым для удаления):",
									placeholder: "Например: наука о всеобщих законах развития...",
									value: e,
									okLabel: window._ ? window._("ok", "Сохранить") : "Сохранить",
									cancelLabel: window._ ? window._("cancel", "Отмена") : "Отмена"
								});
								t === null || (t.trim() === "" ? this.tiptap.chain().focus().unsetMark("hiddenPhrase").run() : this.tiptap.chain().focus().updateAttributes("hiddenPhrase", { note: t.trim() }).run());
							} else {
								if (e === t) {
									window.showToast && window.showToast("Сначала выделите текст для скрытой фразы", "warning");
									return;
								}
								let n = await a({
									title: window._ ? window._("dialectics.add_hidden_phrase", "👁 Добавить скрытую фразу") : "👁 Добавить скрытую фразу",
									message: window._ ? window._("dialectics.hidden_phrase_prompt", "Введите текст пояснения или сноски, который будет разворачиваться по клику:") : "Введите текст пояснения или сноски, который будет разворачиваться по клику:",
									placeholder: "Например: наука о всеобщих законах развития...",
									okLabel: window._ ? window._("ok", "Сохранить") : "Сохранить",
									cancelLabel: window._ ? window._("cancel", "Отмена") : "Отмена"
								});
								n !== null && n.trim() !== "" && this.tiptap.chain().focus().setTextSelection({
									from: e,
									to: t
								}).setMark("hiddenPhrase", {
									note: n.trim(),
									expanded: "false"
								}).setTextSelection(t).unsetMark("hiddenPhrase").run();
							}
						} else if (n === "blockLink") if (this.tiptap.isActive("blockLink")) this.tiptap.chain().focus().unsetMark("blockLink").run();
						else {
							let { from: e, to: t } = this.tiptap.state.selection;
							if (e === t) {
								window.showToast && window.showToast("Сначала выделите текст для ссылки", "warning");
								return;
							}
							let n = [], r = this.engine && this.engine.state && this.engine.state.editingBlock ? this.engine.state.editingBlock.dataset.blockId || this.engine.state.editingBlock.dataset.id : null;
							if (this.engine && this.engine.dom && this.engine.dom.canvas && this.engine.dom.canvas.querySelectorAll(".dialectics-block").forEach((e, t) => {
								let i = e.dataset.blockId || e.dataset.id, a = e.classList.contains("block-section") || e.dataset.isSection === "true", o = e.dataset.title;
								if (!o) {
									let n = e.querySelector(".dialectics-block-header span:first-child");
									o = n ? n.innerText : a ? "Раздел" : `Блок ${t + 1}`;
								}
								i && i !== r && n.push({
									id: i,
									title: o.trim(),
									icon: a ? "📑" : "▪️"
								});
							}), n.length === 0) {
								window.showToast && window.showToast("Нет других блоков для создания ссылки", "warning");
								return;
							}
							let i = await s({
								title: "🔗 Выберите блок для ссылки",
								blocks: n
							});
							i && this.tiptap.chain().focus().setTextSelection({
								from: e,
								to: t
							}).setMark("blockLink", {
								targetId: i.id,
								targetTitle: i.title,
								targetNoteId: i.noteId || "",
								targetNoteTitle: i.noteTitle || ""
							}).setTextSelection(t).run();
						}
						else n === "quote" ? r.toggleQuoteBlock().run() : n === "alternatives" ? r.insertAlternativesBlock().run() : n === "clear" && r.unsetAllMarks().clearNodes().run();
						this.updateFormattingToolbarStates();
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
		let t = ((this.tiptap.options.element ? this.tiptap.options.element.closest(".dialectics-floating-editor") : null) || document).querySelector(".editor-tab.active"), n = t ? t.dataset.tab : "text", { from: r, to: i } = this.tiptap.state.selection;
		r !== i && n === "text" ? (e.style.display = "inline-flex", e.querySelectorAll(".format-btn").forEach((e) => {
			let t = e.dataset.format, n = t === "question" ? this.tiptap.isActive("questionMark") : t === "hiddenPhrase" ? this.tiptap.isActive("hiddenPhrase") : t === "blockLink" ? this.tiptap.isActive("blockLink") : t === "quote" ? this.tiptap.isActive("quoteBlock") : t === "alternatives" ? this.tiptap.isActive("alternativesBlock") : this.tiptap.isActive(t);
			e.classList.toggle("active", n);
		})) : e.style.display = "none";
	}
	async switchTab(e, t = null) {
		this.engine.logDebug(`[EditorManager] Switching tab to: ${e}`);
		let n = t || document;
		if (n.querySelectorAll(".editor-tab").forEach((t) => t.classList.toggle("active", t.dataset.tab === e)), n.querySelectorAll(".tab-content").forEach((t) => {
			let n = t.id === `editor-${e}` || t.classList.contains(`editor-${e}`) || t.classList.contains(`tab-content-${e}`);
			t.id === `editor-${e}` && (t.removeAttribute("id"), t.classList.add(`tab-content-${e}`)), t.classList.toggle("active", n), t.style.display = n ? "flex" : "none";
		}), this.updateFormattingToolbarStates(), e === "text") await this.init();
		else if (e === "graph") await Hv.init();
		else if (e === "shapes" && !this.fabricCanvas) {
			this.fabricCanvas = await Uv.init("shapesCanvas", "shapesCanvasWrapper"), this.shapeHistory = [], this.isHistoryProcessing = !1;
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
		}, r.appendChild(a), r.appendChild(o), r.appendChild(s);
		let c = document.createElement("div");
		c.style.cssText = "height: 1px; background: #e2e8f0; margin: 4px 0;", r.appendChild(c);
		let l = document.createElement("button");
		l.innerHTML = window._ ? window._("dialectics.insert_quote", "💬 Вставить цитату") : "💬 Вставить цитату", l.style.cssText = i, l.onmouseover = () => l.style.background = "#f1f5f9", l.onmouseout = () => l.style.background = "transparent", l.onclick = () => {
			r.remove(), this.tiptap && this.tiptap.chain().focus().toggleQuoteBlock().run();
		}, r.appendChild(l);
		let u = document.createElement("button");
		u.innerHTML = window._ ? window._("dialectics.insert_alternatives", "🔀 Вставить альтернативы") : "🔀 Вставить альтернативы", u.style.cssText = i, u.onmouseover = () => u.style.background = "#f1f5f9", u.onmouseout = () => u.style.background = "transparent", u.onclick = () => {
			r.remove(), this.tiptap && this.tiptap.chain().focus().insertAlternativesBlock().run();
		}, r.appendChild(u), document.body.appendChild(r), setTimeout(() => {
			document.addEventListener("click", function e(t) {
				r.contains(t.target) || (r.remove(), document.removeEventListener("click", e));
			});
		}, 10);
	}
	plotGraph() {
		Hv.plot(document.getElementById("graphPreview"), document.getElementById("graphFuncInput").value);
	}
	async insertGraphToNote() {
		let e = document.getElementById("graphPreview").querySelector("svg");
		e && this.tiptap && await Hv.exportToPNG(e, this.tiptap, () => this.switchTab("text"));
	}
	setShapeTool(e) {
		Uv.setTool(this.fabricCanvas, e, document.getElementById("shapeColor").value);
	}
	async addShape(e) {
		await Uv.add(this.fabricCanvas, e, document.getElementById("shapeColor").value);
	}
	deleteSelectedShape() {
		if (!this.fabricCanvas) return;
		let e = this.fabricCanvas.getActiveObjects();
		this.fabricCanvas.discardActiveObject(), this.fabricCanvas.remove(...e);
	}
	async toggleShapeGrid() {
		await Uv.toggleGrid(this.fabricCanvas);
	}
	async copySelectedShape() {
		await Uv.copySelectedShape(this.fabricCanvas);
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
		Uv.exportToPNG(this.fabricCanvas, this.tiptap, () => this.switchTab("text"));
	}
	setContent(e) {
		this.tiptap && (this.engine && this.engine.state && (this.engine.state.isProgrammaticUpdate = !0), this.tiptap.commands.setContent(e), this.tiptap.commands.focus(), this.engine && this.engine.state && (this.engine.state.isProgrammaticUpdate = !1));
	}
	getHTML() {
		return this.tiptap ? this.tiptap.getHTML() : "";
	}
	createEditor(e, t, n, r) {
		return new Xu({
			element: e,
			extensions: [
				Bv.configure({ blockquote: !1 }),
				Vv,
				s_,
				c_,
				l_,
				u_.configure({ allowBase64: !0 }),
				d_,
				f_,
				m_,
				h_
			],
			content: t || "<p></p>",
			autofocus: "end",
			onFocus: ({ editor: e }) => {
				this.tiptap = e, n && n(), this.updateFormattingToolbarStates();
			},
			onBlur: () => {
				this.updateFormattingToolbarStates();
			},
			editorProps: { handleDOMEvents: { mousedown: (e, t) => (t.stopPropagation(), !1) } },
			onSelectionUpdate: ({ editor: e }) => {
				this.updateFormattingToolbarStates();
			},
			onUpdate: ({ editor: e }) => {
				r && r(), this.updateFormattingToolbarStates();
			}
		});
	}
};
//#endregion
//#region fastapi_app/static/js/dialectics/ModalsController.js
function Gv(e) {
	return e ? (typeof e == "string" && !e.endsWith("Z") && !e.includes("+") && !e.includes("-", 10) && (e += "Z"), new Date(e)) : /* @__PURE__ */ new Date();
}
var Kv = {
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
			let i = Gv(e.updated_at || e.created_at), a = "";
			i.getFullYear() > 1970 && (a = i.toLocaleDateString() + " " + i.toLocaleTimeString([], {
				hour: "2-digit",
				minute: "2-digit"
			}));
			let o = e.is_pinned ? "<span style=\"color: #f59e0b; margin-right: 8px;\" title=\"Pinned\">📌</span>" : "", s = (e.title || "").trim().toLowerCase(), c = [
				"example note",
				"пример конспекта",
				"конспект мысалы",
				"summation",
				"суммирование",
				"суммалау"
			].includes(s) || s.includes("сумм") || s.includes("summation") || s.includes("пример конспекта") ? "" : "<button class=\"load-note-item-delete\" title=\"Delete\">✕</button>", l = e.status || "none", u = "Статус: Не указано (нажмите для смены)";
			l === "in_progress" ? u = "В работе" : l === "ready" && (u = "Готовый конспект"), n.innerHTML = `
                <div class="load-note-item-content" style="flex: 1;">
                    <div class="load-note-item-title" style="display: flex; align-items: center; gap: 8px; color: #1e293b; font-size: 1.05em; margin-bottom: 4px;">
                        <button class="note-status-circle status-${l}" data-status="${l}" title="${u}" onclick="if(window.app) window.app.toggleListNoteStatus(event, ${e.id}, this);"></button>
                        ${o}<strong>${e.title || (window._ ? window._("dialectics.topic_placeholder") : "Untitled")}</strong>
                    </div>
                    <div class="load-note-item-date" style="color: #94a3b8; font-size: 0.85em;">${a}</div>
                </div>
                ${c}
            `, n.onclick = () => this.loadNoteToEditor(e.id);
			let d = n.querySelector(".load-note-item-delete");
			d && (d.onclick = async (i) => {
				i.stopPropagation();
				let a = window._ ? window._("dialectics.delete", "Confirm Deletion") : "Confirm Deletion", o = window._ ? window._("dialectics.confirm_delete", "Delete note \"%s\"?") : "Delete note \"%s\"?", s = window._ ? window._("dialectics.cancel", "Cancel") : "Cancel", c = window._ ? window._("dialectics.delete", "Delete") : "Delete";
				await r({
					title: a,
					message: o.replace("%s", e.title),
					icon: "",
					buttons: [{
						label: s,
						value: !1,
						class: "confirm-btn-secondary"
					}, {
						label: c,
						value: !0,
						class: "confirm-btn-danger"
					}]
				}) && await t.delete(e.id) && (window.showToast(window._("toast.record_deleted"), "info"), n.remove(), this.dom.loadList.children.length === 0 && (this.dom.loadList.innerHTML = "<div style=\"color: #64748b; text-align: center; padding: 20px;\">Nothing found</div>"), this.state.currentNoteId === e.id && (await this.close(!1), this.dom.title.value = "", $.render(this.dom.canvas, []), this.state.currentNoteId = null, this.dom.deleteBtn && (this.dom.deleteBtn.style.display = "none")));
			}), this.dom.loadList.appendChild(n);
		});
	},
	async showTrashModal() {
		let e = document.getElementById("trashDialecticsModal"), n = document.getElementById("trashDialecticsList");
		if (e && n) {
			e.style.display = "flex", e.offsetHeight, e.classList.add("active"), n.innerHTML = "<div style=\"color: #64748b; text-align: center; padding: 20px;\">Загрузка корзины...</div>";
			try {
				let e = await t.listTrash();
				this.renderTrashList(e, n);
			} catch {
				n.innerHTML = "<div style=\"color: #ef4444; text-align: center; padding: 20px;\">Ошибка загрузки корзины</div>";
			}
		}
	},
	renderTrashList(e, n) {
		if (!e || !e.length) {
			n.innerHTML = "<div style=\"color: #64748b; text-align: center; padding: 20px;\">Корзина пуста</div>";
			return;
		}
		n.innerHTML = "", e.forEach((e) => {
			let i = document.createElement("div");
			i.className = "load-note-item";
			let a = Gv(e.deleted_at || e.updated_at || e.created_at), o = a.toLocaleDateString() + " " + a.toLocaleTimeString([], {
				hour: "2-digit",
				minute: "2-digit"
			});
			i.innerHTML = `
                <div class="load-note-item-content" style="flex: 1;">
                    <div class="load-note-item-title" style="color: #64748b; text-decoration: line-through; font-size: 1.02em; margin-bottom: 4px;"><strong>${e.title || "Без названия"}</strong></div>
                    <div class="load-note-item-date" style="color: #94a3b8; font-size: 0.85em;">Удалено: ${o}</div>
                </div>
                <div style="display: flex; gap: 6px;">
                    <button class="btn btn-secondary btn-sm restore-trash-btn" title="Восстановить из корзины" style="padding: 4px 8px;">♻️</button>
                    <button class="btn btn-danger btn-sm permanent-del-btn" title="Удалить навсегда" style="padding: 4px 8px; background: #fee2e2; border: 1px solid #fca5a5; color: #dc2626; border-radius: 6px;">🔥</button>
                </div>
            `;
			let s = i.querySelector(".restore-trash-btn");
			s.onclick = async (r) => {
				r.stopPropagation(), await t.restoreTrash(e.id) && (window.showToast("Конспект восстановлен из корзины", "success"), i.remove(), n.children.length || (n.innerHTML = "<div style=\"color: #64748b; text-align: center; padding: 20px;\">Корзина пуста</div>"));
			};
			let c = i.querySelector(".permanent-del-btn");
			c.onclick = async (a) => {
				a.stopPropagation(), await r({
					title: "Окончательное удаление",
					message: `Удалить конспект "${e.title}" навсегда? Это действие необратимо!`,
					icon: "🔥",
					buttons: [{
						label: "Отмена",
						value: !1,
						class: "confirm-btn-secondary"
					}, {
						label: "Удалить навсегда",
						value: !0,
						class: "confirm-btn-danger"
					}]
				}) && await t.permanentDelete(e.id) && (window.showToast("Конспект удалён окончательно", "info"), i.remove(), n.children.length || (n.innerHTML = "<div style=\"color: #64748b; text-align: center; padding: 20px;\">Корзина пуста</div>"));
			}, n.appendChild(i);
		});
	},
	async deleteGlobal() {
		if (!this.state.currentNoteId) return;
		let e = (this.dom.title && this.dom.title.value ? this.dom.title.value : "").trim().toLowerCase();
		if (e && ([
			"example note",
			"пример конспекта",
			"конспект мысалы",
			"summation",
			"суммирование",
			"суммалау"
		].includes(e) || e.includes("сумм") || e.includes("summation") || e.includes("пример конспекта"))) {
			window.showToast && window.showToast(window._("toast.cannot_delete_the_example_note"), "error");
			return;
		}
		await r({
			title: window._ ? window._("dialectics.delete_note_title") : "Удаление конспекта",
			message: window._ ? window._("dialectics.delete_note_msg") : "Вы уверены, что хотите удалить этот конспект?",
			icon: "",
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
	},
	async pinCurrent() {
		if (!this.state.currentNoteId) {
			window.showToast(window._("toast.save_first_to_pin"), "warning");
			return;
		}
		let e = this.dom.title.value || (window._ ? window._("dialectics.topic_placeholder") : "Untitled Dialectics"), n = $.getBlocks(this.dom.canvas), r = this.dom.categorySelect ? this.dom.categorySelect.value : null, i = {
			id: this.state.currentNoteId,
			title: e,
			blocks: n,
			is_pinned: !0,
			category_id: r ? parseInt(r) : null,
			status: this.state.currentNoteStatus || "none"
		};
		await t.save(i, this.state.currentNoteId) && window.showToast(window._("toast.pinned_successfully"), "success");
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
				t && (t.value = ""), this.searchConnectionsByCategory(e.id, e.name);
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
		if (t) {
			t.style.display = "flex", t.offsetHeight, t.classList.add("active"), this.dom.connectionsModal = t, this.renderConnectionsCategories();
			let e = document.getElementById("connections-search-input");
			e && (e.value = ""), this.searchConnections("");
		} else console.error("Connections modal element not found in DOM!"), window.showToast("Ошибка: модальное окно не найдено", "error");
	},
	hideConnectionsModal() {
		this.dom.connectionsModal && (this.dom.connectionsModal.classList.remove("active"), setTimeout(() => this.dom.connectionsModal.style.display = "none", 200));
	},
	async searchConnections(e) {
		if (!this.dom.connResultsContainer) return;
		let n = document.getElementById("connections-pane-title");
		n && (!e || e.trim().length === 0 ? n.textContent = "Все конспекты" : n.textContent = "Результаты поиска"), this.dom.connResultsContainer.innerHTML = "<div style=\"color:#64748b; padding:20px; text-align:center; font-style: italic;\"><i class=\"fas fa-circle-notch fa-spin\" style=\"margin-right: 8px;\"></i> Поиск...</div>";
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
				let n = e.title || "Untitled", r = e.category ? e.category.name : "Без категории", i = e.category && e.category.color ? e.category.color : "#cbd5e1", a = e.status || "none", o = "Статус: Не указано (нажмите для смены)";
				a === "in_progress" ? o = "В работе" : a === "ready" && (o = "Готовый конспект"), t.innerHTML = `
                    <div class="connections-result-header" style="display: flex; justify-content: space-between; align-items: flex-start; gap: 12px;">
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <button class="note-status-circle status-${a}" data-status="${a}" title="${o}" onclick="if(window.app) window.app.toggleListNoteStatus(event, ${e.id}, this);"></button>
                            <strong style="font-size: 1.05rem; font-weight: 700; color: var(--color-text); line-height: 1.3;">${n}</strong>
                        </div>
                        <span class="connections-result-cat" style="background-color: ${i}15; color: ${i}; padding: 4px 10px; border-radius: 20px; font-size: 0.75rem; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; white-space: nowrap; border: 1px solid ${i}30;">${r}</span>
                    </div>
                    <div class="connections-result-date" style="font-size: 0.8rem; color: var(--color-text-light);"><i class="far fa-clock" style="margin-right: 4px;"></i>${Gv(e.created_at).toLocaleDateString()}</div>
                `, t.addEventListener("click", () => {
					this.loadNoteToEditor(e.id), this.dom.connectionsModal && this.dom.connectionsModal.classList.remove("active"), setTimeout(() => {
						this.dom.connectionsModal && (this.dom.connectionsModal.style.display = "none");
					}, 200);
				}), this.dom.connResultsContainer.appendChild(t);
			});
		} catch (e) {
			console.error("Search error", e), this.dom.connResultsContainer.innerHTML = "<p class=\"connections-empty-state\">Ошибка поиска</p>";
		}
	},
	async searchConnectionsByCategory(e, n) {
		if (!this.dom.connResultsContainer) return;
		let r = document.getElementById("connections-pane-title");
		r && (r.textContent = `Конспекты раздела «${n}»`), this.dom.connResultsContainer.innerHTML = "<div style=\"color:#64748b; padding:20px; text-align:center; font-style: italic;\"><i class=\"fas fa-circle-notch fa-spin\" style=\"margin-right: 8px;\"></i> Поиск...</div>";
		try {
			let r = await t.listByCategory(e);
			if (!r || r.length === 0) {
				this.dom.connResultsContainer.innerHTML = `
                    <div class="empty-state" style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; color: var(--color-text-light); opacity: 0.7; padding: 40px 0;">
                        <i class="fas fa-search" style="font-size: 3rem; margin-bottom: 16px; color: var(--color-bg-app);"></i>
                        <p class="connections-empty-state" style="margin: 0; font-size: 0.95rem;">Нет конспектов в категории «${n}»</p>
                    </div>`;
				return;
			}
			this.dom.connResultsContainer.innerHTML = "", r.forEach((e) => {
				let t = document.createElement("div");
				t.className = "connections-result-item", t.style.cssText = "padding: 16px; border-radius: var(--radius-lg); background: var(--color-bg-white); border: 1px solid var(--color-border); cursor: pointer; transition: all 0.2s; box-shadow: 0 2px 4px rgba(0,0,0,0.02); display: flex; flex-direction: column; gap: 8px;", t.onmouseover = () => {
					t.style.transform = "translateY(-2px)", t.style.boxShadow = "0 6px 12px rgba(0,0,0,0.05)", t.style.borderColor = "var(--color-primary)";
				}, t.onmouseout = () => {
					t.style.transform = "translateY(0)", t.style.boxShadow = "0 2px 4px rgba(0,0,0,0.02)", t.style.borderColor = "var(--color-border)";
				};
				let r = e.title || "Untitled", i = e.category && e.category.color ? e.category.color : "#cbd5e1", a = e.status || "none", o = "Статус: Не указано (нажмите для смены)";
				a === "in_progress" ? o = "В работе" : a === "ready" && (o = "Готовый конспект"), t.innerHTML = `
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 12px;">
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <button class="note-status-circle status-${a}" data-status="${a}" title="${o}" onclick="if(window.app) window.app.toggleListNoteStatus(event, ${e.id}, this);"></button>
                            <strong style="font-size: 1.05rem; font-weight: 700; color: var(--color-text); line-height: 1.3;">${r}</strong>
                        </div>
                        <span style="background-color: ${i}15; color: ${i}; padding: 4px 10px; border-radius: 20px; font-size: 0.75rem; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; white-space: nowrap; border: 1px solid ${i}30;">${n}</span>
                    </div>
                    <div style="font-size: 0.8rem; color: var(--color-text-light);"><i class="far fa-clock" style="margin-right: 4px;"></i>${Gv(e.created_at).toLocaleDateString()}</div>
                `, t.addEventListener("click", () => {
					this.loadNoteToEditor(e.id), this.dom.connectionsModal && this.dom.connectionsModal.classList.remove("active"), setTimeout(() => {
						this.dom.connectionsModal && (this.dom.connectionsModal.style.display = "none");
					}, 200);
				}), this.dom.connResultsContainer.appendChild(t);
			});
		} catch (e) {
			console.error("Category search error", e), this.dom.connResultsContainer.innerHTML = "<p class=\"connections-empty-state\">Ошибка поиска</p>";
		}
	},
	async toggleListNoteStatus(e, n, r) {
		e && e.stopPropagation();
		let i = r.dataset.status || "none", a = "none";
		i === "none" ? a = "in_progress" : i === "in_progress" ? a = "ready" : i === "ready" && (a = "none"), r.dataset.status = a, r.className = `note-status-circle status-${a}`;
		let o = "Статус: Не указано (нажмите для смены)";
		if (a === "in_progress" ? o = "В работе" : a === "ready" && (o = "Готовый конспект"), r.title = o, await t.updateStatus(n, a), this.state && Number(this.state.currentNoteId) === Number(n) && this.updateStatusButtonDisplay && this.updateStatusButtonDisplay(a), window.showToast) {
			let e = "Статус изменён: Не указано";
			a === "in_progress" && (e = "Статус изменён: В работе"), a === "ready" && (e = "Статус изменён: Готовый конспект"), window.showToast(e, "success");
		}
	}
}, qv = class {
	async saveGlobal(e = !0, n = "toast.dialectics_saved") {
		let r = this.dom.title.value || (window._ ? window._("dialectics.topic_placeholder") : "Untitled Dialectics"), i = this.editor.getHTML(), a = document.getElementById("editorBlockTitleInput")?.value?.trim() || "";
		if (this.state.editingAltCard && this.state.editingBlock) {
			let e = this.state.editingAltCard.querySelector(".dialectics-content-inner");
			if (e && (e.innerHTML = i), a) {
				let e = this.state.editingAltCard.querySelector(".alt-title");
				e && (e.innerText = a);
			}
			let t = $.getBlocks(this.dom.canvas);
			$.render(this.dom.canvas, t, this._blockCallbacks());
		} else if (this.state.editingBlock && this.dom.editor && this.dom.editor.style.display !== "none" && !this.state.editingBlock.classList.contains("is-editing") && !this.state.editingBlock._floatingEditorWindow) {
			typeof this.cleanUpInlineEditForBlock == "function" ? this.cleanUpInlineEditForBlock(this.state.editingBlock) : typeof this.cleanUpInlineEdit == "function" && this.cleanUpInlineEdit();
			let e = this.state.editingBlock.querySelector(".dialectics-content-inner");
			e && (e.innerHTML = i), a ? this.state.editingBlock.dataset.title = a : delete this.state.editingBlock.dataset.title;
			let t = $.getBlocks(this.dom.canvas);
			$.render(this.dom.canvas, t, this._blockCallbacks());
		} else if (this.state.pendingSide && i !== "<p></p>" && i.trim() !== "") {
			let e = $.getBlocks(this.dom.canvas), t = {
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
			], this.state.insertAfterIndex = null, this.state.pendingRole = null, $.render(this.dom.canvas, n, this._blockCallbacks());
		}
		let o = $.getBlocks(this.dom.canvas), s = this.dom.categorySelect ? this.dom.categorySelect.value : null, c = {
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
				color: e.color || void 0,
				status: e.status || "none"
			})),
			is_pinned: this.state.isPinned || !1,
			category_id: s ? parseInt(s) : null,
			status: this.state.currentNoteStatus || "none",
			sticker_text: document.getElementById("dialecticsStickerText")?.value || "",
			sticker_title: document.getElementById("dialecticsStickerTitle")?.value || "",
			sticker_color: document.getElementById("dialecticsStickerColor")?.value || "#fff9c4",
			sticker_type: document.getElementById("dialecticsStickerType")?.value || "text"
		};
		this.state.currentNoteId && (c.id = Number(this.state.currentNoteId));
		let l = await t.save(c, this.state.currentNoteId);
		if (l) {
			this.state.isDirty = !1, this.state.currentNoteId = l.id, localStorage.setItem("dialectics_last_note_id", l.id), this.updateCurrentVersionDisplay(l);
			let t = new URL(window.location);
			return t.searchParams.get("id") !== String(l.id) && (t.searchParams.set("id", l.id), window.history.pushState({}, "", t)), n !== null && window.showToast(window._(n, window._("toast.dialectics_saved", "Сохранено")), "success"), e && await this.close(!1), this.dom.deleteBtn && (this.dom.deleteBtn.style.display = "block"), l.id;
		}
		return window.showToast && window.showToast(window._("toast.save_error", "Ошибка сохранения. Попробуйте ещё раз."), "error"), null;
	}
	async openStickersForCurrent(e = null) {
		if (!this.state.currentNoteId && (window.showToast && window.showToast(window._("toast.saving_note_to_attach_sticker"), "info"), !await this.saveGlobal(!1, null))) {
			window.showToast && window.showToast(window._("toast.failed_to_save_note"), "error");
			return;
		}
		let t = e;
		t || (this.state.editingBlock ? t = this.state.editingBlock.dataset.blockId : this.state.pendingBlockId && (t = this.state.pendingBlockId)), window.openParentStickers && window.openParentStickers("dialectics", this.state.currentNoteId, t);
	}
	async saveAndPin() {
		let e = this.dom.title.value || (window._ ? window._("dialectics.topic_placeholder") : "Untitled Dialectics"), n = this.editor.getHTML() || "", r = this.dom.categorySelect ? this.dom.categorySelect.value : null, i = {
			title: e,
			blocks: [{
				side: "left",
				html: n
			}],
			is_pinned: !0,
			category_id: r ? parseInt(r) : null,
			status: this.state.currentNoteStatus || "none",
			sticker_text: document.getElementById("dialecticsStickerText")?.value || "",
			sticker_title: document.getElementById("dialecticsStickerTitle")?.value || "",
			sticker_color: document.getElementById("dialecticsStickerColor")?.value || "#fff9c4",
			sticker_type: document.getElementById("dialecticsStickerType")?.value || "text"
		};
		this.state.currentNoteId && (i.id = this.state.currentNoteId);
		let a = await t.save(i, this.state.currentNoteId);
		a && (this.updateCurrentVersionDisplay(a), window.showToast(window._("toast.saved_and_pinned"), "success"), await this.close(!1), setTimeout(() => location.reload(), 500));
	}
	async loadNoteToEditor(e, n = !0, r = null) {
		typeof this.close == "function" && await this.close();
		let i = r || await t.get(e);
		if (i) {
			if (n && this.state.currentNoteId && this.state.currentNoteId !== i.id) {
				let e = this.getNoteHistory();
				(e.length === 0 || e[e.length - 1] !== this.state.currentNoteId) && (e.push(this.state.currentNoteId), this.saveNoteHistory(e));
			}
			this.state.currentNoteId = i.id, this.state.dismissedHints = JSON.parse(localStorage.getItem("dialectics_dismissed_hints_" + i.id) || "[]"), localStorage.setItem("dialectics_last_note_id", i.id), this.updateCurrentVersionDisplay(i), this.dom.title.value = i.title;
			let e = typeof i.content_json == "string" ? JSON.parse(i.content_json) : i.content_json;
			this.dom.categorySelect && (this.dom.categorySelect.value = i.category_id || "");
			let t = {}, r = 0;
			try {
				let e = /* @__PURE__ */ new Set();
				if (i.content) try {
					let t = typeof i.content == "string" ? JSON.parse(i.content) : i.content;
					Array.isArray(t) && t.forEach((t) => {
						t.id && e.add(String(t.id));
					});
				} catch (e) {
					console.error("Failed to parse note content for block IDs:", e);
				}
				let n = await fetch(`/api/stickers/dialectics/${i.id}/`).then((e) => e.json());
				Array.isArray(n) && n.forEach((n) => {
					n.dialectics_block_id ? e.has(String(n.dialectics_block_id)) ? t[n.dialectics_block_id] = (t[n.dialectics_block_id] || 0) + 1 : fetch(`/api/stickers/${n.id}/archive/`, { method: "POST" }).catch(() => {}) : r++;
				});
			} catch (e) {
				console.error("Failed to load block stickers:", e);
			}
			this.state.blockStickersCount = t, this.state.globalStickersCount = r, this.updateGlobalStickersBadge();
			let a = document.getElementById("toggleOnlyTitlesMode");
			if (a && (a.checked = !1, window.toggleOnlyTitlesMode && window.toggleOnlyTitlesMode(!1)), $.render(this.dom.canvas, e, this._blockCallbacks()), this._revealInterface(), this.hideLoadModal(), this.dom.deleteBtn) {
				let e = (i.title || "").trim().toLowerCase(), t = [
					"example note",
					"пример конспекта",
					"конспект мысалы",
					"summation",
					"суммирование",
					"суммалау"
				].includes(e) || e.includes("сумм") || e.includes("summation") || e.includes("пример конспекта");
				this.dom.deleteBtn.style.display = t ? "none" : "block";
			}
			let o = new URL(window.location);
			o.searchParams.get("id") !== String(i.id) && (o.searchParams.set("id", i.id), window.history.pushState({}, "", o));
		} else localStorage.removeItem("dialectics_last_note_id"), this.updateCurrentVersionDisplay(null), this._revealInterface();
	}
	updateGlobalStickersBadge() {
		let e = document.getElementById("globalStickersCountBadge");
		if (e) {
			let t = this.state.globalStickersCount || 0;
			e.innerText = t, e.style.display = t > 0 ? "inline-block" : "none";
		}
	}
	async refreshStickers() {
		if (!this.state.currentNoteId) return;
		let e = {}, t = 0, n = /* @__PURE__ */ new Set();
		this.dom.canvas && window.BlockManager && window.BlockManager.getBlocks(this.dom.canvas).forEach((e) => {
			e.id && n.add(String(e.id));
		});
		try {
			let r = await fetch(`/api/stickers/dialectics/${this.state.currentNoteId}/`).then((e) => e.json());
			Array.isArray(r) && r.forEach((r) => {
				r.dialectics_block_id ? n.has(String(r.dialectics_block_id)) ? e[r.dialectics_block_id] = (e[r.dialectics_block_id] || 0) + 1 : fetch(`/api/stickers/${r.id}/archive/`, { method: "POST" }).catch(() => {}) : t++;
			});
		} catch (e) {
			console.error("Failed to load block stickers:", e);
		}
		if (this.state.blockStickersCount = e, this.state.globalStickersCount = t, this.updateGlobalStickersBadge(), window.BlockManager && this.dom.canvas) {
			let e = window.BlockManager.getBlocks(this.dom.canvas);
			window.BlockManager.render(this.dom.canvas, e, this._blockCallbacks());
		}
	}
	goToBlock(e) {
		window.closeParentStickersOverview && window.closeParentStickersOverview();
		let t = document.getElementById("dialecticsCanvas");
		if (!t) return;
		let n = t.querySelector(`[data-block-id="${e}"]`);
		n ? (n.scrollIntoView({
			behavior: "smooth",
			block: "center"
		}), n.style.boxShadow = "0 0 0 4px #3b82f6, 0 20px 25px -5px rgba(0, 0, 0, 0.1)", n.style.transform = "scale(1.02)", n.style.transition = "all 0.3s ease", setTimeout(() => {
			n.style.boxShadow = "", n.style.transform = "";
		}, 2e3)) : window.showToast && window.showToast("Блок не найден на холсте", "warning");
	}
	async deleteStickersForBlock(e) {
		if (this.state.currentNoteId) try {
			let t = await fetch(`/api/stickers/dialectics/${this.state.currentNoteId}/?recurrence_id=${e}`);
			if (t.ok) {
				let e = await t.json();
				Array.isArray(e) && (await Promise.all(e.map((e) => fetch(`/api/stickers/${e.id}/archive/`, { method: "POST" }))), window.dispatchEvent(new CustomEvent("stickersUpdated", { detail: {
					parentType: "dialectics",
					parentId: this.state.currentNoteId
				} })));
			}
		} catch (t) {
			console.error("Failed to delete stickers for block:", e, t);
		}
	}
	async loadExample(e = null) {
		if (typeof e != "string" || !e) {
			if (window.openExampleChoiceModal) {
				window.openExampleChoiceModal();
				return;
			}
			e = "pythagoras";
		}
		await this.loadExampleNoteByType(e);
	}
	async loadExampleNoteByType(e = "pythagoras") {
		n.setLoading(this.dom.canvas);
		try {
			let t = await fetch(`/api/dialectics/example/get_or_create_id?type=${e}`);
			if (t.ok) {
				let n = await t.json();
				if (n && n.id) {
					await this.loadNoteToEditor(n.id);
					let t = e === "summation" ? window._ ? window._("toast.opened_summation_note") : "Конспект «Суммирование» загружен" : window._ ? window._("toast.opened_existing_example_note") : "Пример конспекта загружен";
					window.showToast && window.showToast(t || "Пример конспекта загружен", "info");
				}
			} else console.error("Failed to load example note ID."), n.clearLoading(this.dom.canvas);
		} catch (e) {
			console.error(e), n.clearLoading(this.dom.canvas);
		}
	}
	async createNewNote() {
		this.state.isDirty ? await r({
			title: window._ ? window._("dialectics.unsaved_title") : "Внимание",
			message: window._ ? window._("dialectics.unsaved_new_msg") : "Есть несохранённые изменения. Создать новый конспект?",
			icon: "",
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
		this.state.currentNoteId = null, this.state.dismissedHints = [], localStorage.removeItem("dialectics_last_note_id"), this.updateCurrentVersionDisplay(null), this.dom.title && (this.dom.title.value = ""), this.dom.categorySelect && (this.dom.categorySelect.value = ""), this.dom.canvas && $.render(this.dom.canvas, [], this._blockCallbacks()), this.dom.deleteBtn && (this.dom.deleteBtn.style.display = "none");
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
	async loadPreviousNote() {
		if (this.state.isDirty && !await r({
			title: window._ ? window._("dialectics.unsaved_title", "Внимание") : "Внимание",
			message: window._ ? window._("dialectics.unsaved_msg", "Есть несохранённые изменения. Продолжить?") : "Есть несохранённые изменения. Продолжить?",
			icon: "",
			buttons: [{
				label: window._ ? window._("dialectics.cancel", "Отмена") : "Отмена",
				value: !1,
				class: "confirm-btn-secondary"
			}, {
				label: window._ ? window._("dialectics.continue_btn", "Продолжить") : "Продолжить",
				value: !0,
				class: "confirm-btn-primary"
			}]
		})) return;
		this.state.isDirty = !1;
		let e = this.getNoteHistory();
		if (e.length > 0) {
			let t = e.pop();
			this.saveNoteHistory(e), this.loadNoteToEditor(t, !1), window.showToast(window._("toast.loaded_previous_note"), "info");
		} else window.location.href = "/";
	}
	updateCurrentVersionDisplay(e) {
		this.updateStatusButtonDisplay(e && e.status || "none");
		let t = document.getElementById("currentVersionLabel");
		if (!t) return;
		if (!e) {
			t.innerText = "Новый конспект";
			return;
		}
		let n = e.updated_at || e.created_at;
		n ? t.innerText = `Сохранено: ${new Date(n).toLocaleTimeString([], {
			hour: "2-digit",
			minute: "2-digit"
		})}` : t.innerText = "Сохранено";
	}
	updateStatusButtonDisplay(e = "none") {
		this.state && (this.state.currentNoteStatus = e);
		let t = document.getElementById("currentNoteStatusBtn");
		if (!t) return;
		t.className = `note-status-circle status-${e}`;
		let n = "Статус: Не указано (нажмите для смены)";
		e === "in_progress" ? n = "В работе" : e === "ready" && (n = "Готовый конспект"), t.title = n;
	}
	async toggleCurrentNoteStatus(e) {
		e && e.stopPropagation();
		let n = this.state && this.state.currentNoteStatus || "none", r = "none";
		if (n === "none" ? r = "in_progress" : n === "in_progress" ? r = "ready" : n === "ready" && (r = "none"), this.updateStatusButtonDisplay(r), this.state && this.state.currentNoteId) {
			if (await t.updateStatus(this.state.currentNoteId, r), window.showToast) {
				let e = "Статус изменён: Не указано";
				r === "in_progress" && (e = "Статус изменён: В работе"), r === "ready" && (e = "Статус изменён: Готовый конспект"), window.showToast(e, "success");
			}
		} else if (window.showToast) {
			let e = "Статус установлен: Не указано (сохранится с конспектом)";
			r === "in_progress" && (e = "Статус установлен: В работе (сохранится с конспектом)"), r === "ready" && (e = "Статус установлен: Готовый конспект (сохранится с конспектом)"), window.showToast(e, "info");
		}
	}
	toggleVersionsMenu(e) {
		if (e && e.stopPropagation(), !this.state.currentNoteId) {
			window.showToast && window.showToast("Сначала сохраните конспект, чтобы работать с версиями", "warning");
			return;
		}
		let t = document.getElementById("versionsMenu");
		if (!t) return;
		let n = document.getElementById("tableOfContentsMenu");
		if (n && (n.style.display = "none"), t.style.display === "none" || !t.style.display) {
			this.loadVersions(), t.style.display = "block";
			let e = (n) => {
				!t.contains(n.target) && !n.target.closest("#btnVersionsMenu") && (t.style.display = "none", document.removeEventListener("click", e));
			};
			setTimeout(() => document.addEventListener("click", e), 10);
		} else t.style.display = "none";
	}
	async loadVersions() {
		if (!this.state.currentNoteId) return;
		let e = document.getElementById("versionsListContainer");
		if (!e) return;
		e.innerHTML = "<div style=\"text-align: center; color: #64748b; font-size: 0.85rem; padding: 20px 0;\">Загрузка версий...</div>";
		let n = await t.getVersions(this.state.currentNoteId);
		if (e.innerHTML = "", !n || n.length === 0) {
			e.innerHTML = "<div style=\"padding: 12px; color: #94a3b8; font-size: 0.85rem; text-align: center;\">Нет сохраненных версий.</div>";
			return;
		}
		n.forEach((t) => {
			let n = t.created_at;
			typeof n == "string" && !n.endsWith("Z") && !n.includes("+") && (n += "Z");
			let r = new Date(n).toLocaleString(), i = t.is_manual ? "background: #dbeafe; color: #1e40af; border: 1px solid #bfdbfe;" : "background: #f1f5f9; color: #475569; border: 1px solid #cbd5e1;", a = t.is_manual ? "📌 Ручная" : "🤖 Авто", o = t.is_manual ? "🔓 Открепить" : "📌 Закрепить", s = t.is_manual ? "Разрешить автоудаление версии" : "Защитить от автоудаления (закрепить)", c = document.createElement("div");
			c.style.cssText = "border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px; background: #f8fafc; display: flex; flex-direction: column; gap: 6px;", c.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 8px;">
                    <span style="font-weight: 700; color: #1e293b; font-size: 0.9rem; word-break: break-word;">${t.title || "Без названия"}</span>
                    <span style="font-size: 0.75rem; font-weight: 600; padding: 2px 6px; border-radius: 6px; white-space: nowrap; ${i}">${a}</span>
                </div>
                <div style="font-size: 0.75rem; color: #64748b;">${r}</div>
                <div style="display: flex; justify-content: flex-end; gap: 6px; margin-top: 4px;">
                    <button onclick="if(window.app) window.app.restoreVersion(${t.id})" style="background: #10b981; color: white; border: none; border-radius: 6px; padding: 4px 8px; font-size: 0.75rem; font-weight: 600; cursor: pointer;" title="Восстановить эту версию">↩️ Восстановить</button>
                    <button onclick="if(window.app) window.app.togglePinVersion(${t.id})" style="background: white; border: 1px solid #cbd5e1; color: #334155; border-radius: 6px; padding: 4px 8px; font-size: 0.75rem; font-weight: 600; cursor: pointer;" title="${s}">${o}</button>
                    <button onclick="if(window.app) window.app.deleteVersion(${t.id})" style="background: #fef2f2; border: 1px solid #fecaca; color: #ef4444; border-radius: 6px; padding: 4px 8px; font-size: 0.75rem; font-weight: 600; cursor: pointer;" title="Удалить версию">✕</button>
                </div>
            `, e.appendChild(c);
		});
	}
	async saveManualVersion() {
		if (!this.state.currentNoteId) {
			window.showToast && window.showToast("Сначала сохраните сам конспект", "warning");
			return;
		}
		let e = document.getElementById("newVersionTitleInput"), n = e ? e.value.trim() : "";
		await this.saveGlobal(!1), await t.createVersion(this.state.currentNoteId, n) ? (e && (e.value = ""), window.showToast && window.showToast("Версия успешно сохранена", "success"), await this.loadVersions()) : window.showToast && window.showToast("Ошибка при сохранении версии", "error");
	}
	async restoreVersion(e) {
		if (!this.state.currentNoteId || !await r({
			title: "Восстановление версии",
			message: "Восстановить конспект из этой версии? Текущее состояние будет сохранено как резервная копия в истории.",
			icon: "↩️",
			buttons: [{
				label: "Отмена",
				value: !1,
				class: "confirm-btn-secondary"
			}, {
				label: "Восстановить",
				value: !0,
				class: "confirm-btn-primary"
			}]
		})) return;
		let n = await t.restoreVersion(this.state.currentNoteId, e);
		if (n) {
			this.state.isDirty = !1, window.showToast && window.showToast("Версия восстановлена!", "success"), await this.loadNoteToEditor(n.id, !0, n);
			let e = document.getElementById("versionsMenu");
			e && (e.style.display = "none");
		} else window.showToast && window.showToast("Ошибка при восстановлении", "error");
	}
	async togglePinVersion(e) {
		if (!this.state.currentNoteId) return;
		let n = await t.togglePinVersion(this.state.currentNoteId, e);
		n ? (window.showToast && window.showToast(n.is_manual ? "Версия закреплена от автоудаления" : "Версия откреплена (разрешено автоудаление)", "info"), await this.loadVersions()) : window.showToast && window.showToast("Ошибка при изменении статуса", "error");
	}
	async deleteVersion(e) {
		this.state.currentNoteId && await r({
			title: "Удаление версии",
			message: "Вы уверены, что хотите удалить эту версию из истории?",
			icon: "",
			buttons: [{
				label: "Отмена",
				value: !1,
				class: "confirm-btn-secondary"
			}, {
				label: "Удалить",
				value: !0,
				class: "confirm-btn-danger"
			}]
		}) && (await t.deleteVersion(this.state.currentNoteId, e) ? (window.showToast && window.showToast("Версия удалена", "info"), await this.loadVersions()) : window.showToast && window.showToast("Ошибка при удалении версии", "error"));
	}
	exportMarkdown() {
		let e = this.dom.title?.value || (window._ ? window._("dialectics.topic_placeholder") : "Конспект"), t = $.getBlocks(this.dom.canvas);
		if (!t || t.length === 0) {
			window.showToast(window._ && window._("toast.no_blocks_to_export") || "Нет блоков для экспорта!", "warning");
			return;
		}
		let n = (e) => {
			if (!e) return "";
			let t = document.createElement("div");
			t.innerHTML = e;
			for (let e = 1; e <= 6; e++) t.querySelectorAll(`h${e}`).forEach((t) => {
				t.outerHTML = `\n${"#".repeat(e)} ${t.innerText.trim()}\n\n`;
			});
			return t.querySelectorAll("strong, b").forEach((e) => {
				e.outerHTML = `**${e.innerText.trim()}**`;
			}), t.querySelectorAll("em, i").forEach((e) => {
				e.outerHTML = `*${e.innerText.trim()}*`;
			}), t.querySelectorAll("code").forEach((e) => {
				e.outerHTML = `\`${e.innerText.trim()}\``;
			}), t.querySelectorAll("a").forEach((e) => {
				e.outerHTML = `[${e.innerText.trim()}](${e.getAttribute("href") || ""})`;
			}), t.querySelectorAll("img").forEach((e) => {
				e.outerHTML = `\n![${e.getAttribute("alt") || "image"}](${e.getAttribute("src") || ""})\n`;
			}), t.querySelectorAll("ul").forEach((e) => {
				let t = "\n";
				e.querySelectorAll("li").forEach((e) => {
					t += `- ${e.innerText.trim()}\n`;
				}), e.outerHTML = t + "\n";
			}), t.querySelectorAll("ol").forEach((e) => {
				let t = "\n";
				e.querySelectorAll("li").forEach((e, n) => {
					t += `${n + 1}. ${e.innerText.trim()}\n`;
				}), e.outerHTML = t + "\n";
			}), t.querySelectorAll("p").forEach((e) => {
				e.outerHTML = `${e.innerText.trim()}\n\n`;
			}), t.querySelectorAll("br").forEach((e) => {
				e.outerHTML = "\n";
			}), t.innerText.replace(/\n{3,}/g, "\n\n").trim();
		}, r = `# ${e}\n\n`, i = this.dom.categorySelect || document.getElementById("dialecticsCategorySelect");
		i && i.selectedIndex > 0 && i.value !== "" && (r += `**Категория:** ${i.options[i.selectedIndex].text}\n\n`), r += "---\n\n", t.forEach((e) => {
			if (e.isSection || e.side === "section") r += `## ${e.title || "Раздел"}\n\n`;
			else {
				let t = "";
				e.side === "left" ? t = "🔴 ТЕЗИС / ВОПРОС" : e.side === "right" ? t = "🔵 АНТИТЕЗИС / ОТВЕТ" : e.side === "center" && (t = "🟣 СИНТЕЗ / ВЫВОД"), e.title && (r += `### ${e.title}\n`), t && (r += `*${t}*\n\n`);
				let i = n(e.html);
				i && (r += `${i}\n\n`), e.sources && e.sources.length > 0 && (r += "**Источники:**\n", e.sources.forEach((e) => {
					(e.title || e.url) && (r += `- [${e.title || e.url}](${e.url || "#"}) ${e.quote ? `"${e.quote}"` : ""}\n`);
				}), r += "\n"), r += "---\n\n";
			}
		});
		let a = new Blob([r], { type: "text/markdown;charset=utf-8" }), o = URL.createObjectURL(a), s = document.createElement("a");
		s.href = o, s.download = `${(e || "dialectics_note").replace(/[^a-zA-Z0-9а-яА-Яw\-_ ]/g, "_")}.md`, document.body.appendChild(s), s.click(), document.body.removeChild(s), URL.revokeObjectURL(o), window.showToast(window._ && window._("toast.export_md_success") || "Конспект экспортирован в Markdown!", "success");
	}
	exportPDF() {
		let e = this.dom.title?.value || (window._ ? window._("dialectics.topic_placeholder") : "Конспект"), t = $.getBlocks(this.dom.canvas);
		if (!t || t.length === 0) {
			window.showToast(window._ && window._("toast.no_blocks_to_export") || "Нет блоков для экспорта!", "warning");
			return;
		}
		let n = this.dom.categorySelect || document.getElementById("dialecticsCategorySelect"), r = "";
		n && n.selectedIndex > 0 && n.value !== "" && (r = n.options[n.selectedIndex].text);
		let i = "";
		t.forEach((e) => {
			if (e.isSection || e.side === "section") i += `<div class="section-title">${e.title || "Раздел"}</div>`;
			else {
				let t = "block-left", n = "role-left", r = "Тезис / Вопрос";
				e.side === "right" ? (t = "block-right", n = "role-right", r = "Антитезис / Ответ") : e.side === "center" && (t = "block-center", n = "role-center", r = "Синтез / Вывод"), i += `<div class="block-card ${t}">`, i += `<div class="block-role ${n}">${e.role || r}</div>`, e.title && (i += `<div class="block-title">${e.title}</div>`), i += `<div class="block-content">${e.html || ""}</div>`, e.sources && e.sources.length > 0 && (i += "<div class=\"block-sources\"><strong>Источники:</strong><ul>", e.sources.forEach((e) => {
					(e.title || e.url) && (i += `<li><a href="${e.url || "#"}" target="_blank">${e.title || e.url}</a> ${e.quote ? `— "${e.quote}"` : ""}</li>`);
				}), i += "</ul></div>"), i += "</div>";
			}
		});
		let a = window.open("", "_blank");
		if (!a) {
			window.showToast("Пожалуйста, разрешите всплывающие окна для экспорта в PDF", "error");
			return;
		}
		let o = `<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>${e}</title>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css">
    <style>
        @page {
            margin: 20mm;
            size: A4;
        }
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            color: #1e293b;
            line-height: 1.6;
            margin: 0;
            padding: 20px;
            background: #fff;
        }
        .header {
            border-bottom: 2px solid #e2e8f0;
            padding-bottom: 16px;
            margin-bottom: 24px;
        }
        .title {
            font-size: 28px;
            font-weight: 800;
            color: #0f172a;
            margin: 0 0 8px 0;
        }
        .category-badge {
            display: inline-block;
            background: #f1f5f9;
            color: #475569;
            padding: 4px 12px;
            border-radius: 16px;
            font-size: 14px;
            font-weight: 600;
        }
        .section-title {
            font-size: 20px;
            font-weight: 700;
            color: #1e293b;
            margin-top: 32px;
            margin-bottom: 16px;
            padding-bottom: 8px;
            border-bottom: 1px solid #cbd5e1;
            page-break-after: avoid;
            page-break-inside: avoid;
        }
        .block-card {
            margin-bottom: 16px;
            padding: 16px 20px;
            border-radius: 8px;
            page-break-inside: avoid;
            box-sizing: border-box;
        }
        .block-left { border-left: 5px solid #ea580c; background: #fffaf5; }
        .block-right { border-left: 5px solid #2563eb; background: #f8fafc; }
        .block-center { border-left: 5px solid #9333ea; background: #faf5ff; }
        .block-role {
            font-size: 11px;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 8px;
        }
        .role-left { color: #ea580c; }
        .role-right { color: #2563eb; }
        .role-center { color: #9333ea; }
        .block-title {
            font-size: 16px;
            font-weight: 700;
            margin: 0 0 8px 0;
            color: #0f172a;
        }
        .block-content { font-size: 14px; }
        .block-content p { margin: 0 0 8px 0; }
        .block-content p:last-child { margin-bottom: 0; }
        .block-content img { max-width: 100%; height: auto; border-radius: 4px; margin: 8px 0; }
        .block-sources {
            margin-top: 12px;
            padding-top: 8px;
            border-top: 1px dashed #cbd5e1;
            font-size: 12px;
            color: #64748b;
        }
        .block-sources ul { margin: 4px 0 0 0; padding-left: 20px; }
    </style>
</head>
<body>
    <div class="header">
        <h1 class="title">${e}</h1>
        ${r ? `<div class="category-badge">${r}</div>` : ""}
    </div>
    <div class="content">
        ${i}
    </div>
    <script>
        window.onload = function() {
            setTimeout(function() {
                window.print();
            }, 500);
        };
    <\/script>
</body>
</html>`;
		a.document.open(), a.document.write(o), a.document.close(), window.showToast(window._ && window._("toast.export_pdf_success") || "Открыто окно для печати в PDF!", "info");
	}
}, Jv = {};
Object.getOwnPropertyNames(qv.prototype).forEach((e) => {
	e !== "constructor" && (Jv[e] = qv.prototype[e]);
});
//#endregion
//#region fastapi_app/static/js/dialectics/AIController.js
var Yv = class {
	async runHintAI(e) {
		if (!e || e.id === "anchor") {
			window.showToast("Cannot run AI on the main goal block before it is created.", "info");
			return;
		}
		let t = $.getBlocks(this.dom.canvas), n = t.find((e) => e.role === "anchor"), r = (e) => {
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
	async openInsertAfter(e, t) {
		if (this.state.isDirty && !await r({
			title: window._ ? window._("dialectics.unsaved_title", "Внимание") : "Внимание",
			message: window._ ? window._("dialectics.unsaved_msg", "Есть несохранённые изменения. Продолжить?") : "Есть несохранённые изменения. Продолжить?",
			icon: "",
			buttons: [{
				label: window._ ? window._("dialectics.cancel", "Отмена") : "Отмена",
				value: !1,
				class: "confirm-btn-secondary"
			}, {
				label: window._ ? window._("dialectics.continue_btn", "Продолжить") : "Продолжить",
				value: !0,
				class: "confirm-btn-primary"
			}]
		})) return;
		if (this.state.isDirty = !1, e === "section") {
			this.openSectionTitleModal && this.openSectionTitleModal(t);
			return;
		}
		this.state.editingBlock = null, this.state.pendingSide = e;
		let n = null;
		if (window.BlockManager && this.dom && this.dom.canvas) {
			let e = window.BlockManager.getBlocks(this.dom.canvas);
			if (t != null && t >= 0 && e[t] && (n = e[t].role || null, !n)) {
				for (let r = t; r >= 0; r--) if (e[r].role && e[r].role !== "anchor") {
					n = e[r].role;
					break;
				}
			}
		}
		n ||= e === "right" ? "step2" : e === "center" ? "step5" : "step1", this.state.pendingRole = n, this.state.pendingBlockId = "block_" + Math.random().toString(36).substr(2, 9), this.state.insertAfterIndex = t;
		let i = document.getElementById("editorBlockTitleInput");
		i && (i.value = ""), this.open();
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
				if (n && i && a) {
					let e = document.getElementById("explainConceptDefaultFooter"), r = document.getElementById("explainConceptChatFooter");
					e && (e.style.display = "block"), r && (r.style.display = "none"), i.innerText = window._ && window._("analysis_result") || "Результат анализа", a.innerHTML = this._renderMarkdown(t.result), n.style.display = "flex";
				} else r({
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
				if (t && n && i) {
					let r = document.getElementById("explainConceptDefaultFooter"), a = document.getElementById("explainConceptChatFooter");
					r && (r.style.display = "block"), a && (a.style.display = "none"), n.innerText = "Ошибка", i.innerHTML = `<div style="color:#ef4444;">${e.message}</div>`, t.style.display = "flex";
				} else r({
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
	async checkAI(e) {
		let t = e.querySelector(".block-title-text"), n = t ? t.innerText.trim() : "", r = e.querySelector(".dialectics-content-inner"), i = r ? (r.innerText || r.textContent).trim() : "", a = n ? `Заголовок: ${n}\n\nТекст:\n${i}` : i;
		if (!a.trim()) {
			window.showToast && window.showToast("Блок пуст. Нечего проверять.", "warning");
			return;
		}
		window.showToast && window.showToast("🤖 Анализирую текст...", "info");
		let o = document.getElementById("explainConceptModal"), s = document.getElementById("explainConceptTitle"), c = document.getElementById("explainConceptBody"), l = document.getElementById("explainConceptDefaultFooter"), u = document.getElementById("explainConceptChatFooter"), d = document.getElementById("explainConceptInput"), f = document.getElementById("explainConceptSendBtn");
		if (!o || !c || !d || !f) return;
		let p = [];
		s.innerText = window._ && window._("dialectics.ai_checking") || "Проверка ИИ", c.innerHTML = "", d.value = "", d.disabled = !0, f.disabled = !0, l && (l.style.display = "none"), u && (u.style.display = "block"), o.style.display = "flex";
		let m = (e, t) => {
			let n = document.createElement("div");
			e === "user" ? (n.style.cssText = "margin-left: auto; margin-right: 0; max-width: 80%; background: #3b82f6; color: #fff; padding: 10px 14px; border-radius: 12px 12px 0 12px; box-shadow: 0 2px 4px rgba(59, 130, 246, 0.15); margin-bottom: 12px; word-break: break-word;", n.innerText = t) : e === "assistant" ? (n.style.cssText = "margin-left: 0; margin-right: auto; max-width: 85%; background: #f1f5f9; color: #1e293b; padding: 12px 16px; border-radius: 12px 12px 12px 0; box-shadow: 0 1px 2px rgba(0,0,0,0.05); margin-bottom: 12px; word-break: break-word;", n.innerHTML = this._renderMarkdown ? this._renderMarkdown(t) : t) : e === "loading" && (n.id = "explainConceptLoading", n.style.cssText = "margin-left: 0; margin-right: auto; max-width: 85%; background: #f1f5f9; color: #94a3b8; padding: 12px 16px; border-radius: 12px 12px 12px 0; box-shadow: 0 1px 2px rgba(0,0,0,0.05); margin-bottom: 12px; display: flex; align-items: center; gap: 8px;", n.innerHTML = "<span class=\"spinner\" style=\"border: 2px solid #cbd5e1; border-top: 2px solid #3b82f6; border-radius: 50%; width: 14px; height: 14px; animation: spin 0.8s linear infinite; display: inline-block;\"></span><span>Думаю...</span>"), c.appendChild(n), c.scrollTop = c.scrollHeight;
		};
		m("loading");
		try {
			let e = await fetch("/api/ai/dialectics/check-ai", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ text: a })
			}), t = document.getElementById("explainConceptLoading");
			if (t && t.remove(), !e.ok) throw Error(`HTTP ${e.status}`);
			let n = await e.json();
			p.push({
				role: "user",
				content: `Проверь следующий текст:\n${a}`
			}), p.push({
				role: "assistant",
				content: n.result
			}), m("assistant", n.result), d.disabled = !1, f.disabled = !1, d.focus();
		} catch (e) {
			let t = document.getElementById("explainConceptLoading");
			t && t.remove(), c.innerHTML = `<div style="color:#ef4444; padding:10px;">Ошибка: ${e.message}</div>`;
		}
		let h = document.getElementById("explainConceptForm");
		h && (h.onsubmit = async (e) => {
			e.preventDefault();
			let t = d.value.trim();
			if (!(!t || d.disabled)) {
				m("user", t), p.push({
					role: "user",
					content: t
				}), d.value = "", d.disabled = !0, f.disabled = !0, m("loading");
				try {
					let e = await fetch("/api/ai/dialectics/check-ai", {
						method: "POST",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify({
							text: a,
							history: p
						})
					}), t = document.getElementById("explainConceptLoading");
					if (t && t.remove(), !e.ok) throw Error(`HTTP ${e.status}`);
					let n = await e.json();
					p.push({
						role: "assistant",
						content: n.result
					}), m("assistant", n.result);
				} catch (e) {
					let t = document.getElementById("explainConceptLoading");
					t && t.remove();
					let n = document.createElement("div");
					n.style.cssText = "margin-left: 0; margin-right: auto; max-width: 85%; color: #ef4444; padding: 10px 12px; margin-bottom: 12px;", n.innerText = `Ошибка: ${e.message}`, c.appendChild(n), c.scrollTop = c.scrollHeight;
				} finally {
					d.disabled = !1, f.disabled = !1, d.focus();
				}
			}
		});
	}
}, Xv = {};
Object.getOwnPropertyNames(Yv.prototype).forEach((e) => {
	e !== "constructor" && (Xv[e] = Yv.prototype[e]);
});
//#endregion
//#region fastapi_app/static/js/dialectics/BlocksOrchestrator.js
var Zv = class {
	open(e = "") {
		if (this.state.editingBlock) {
			let t = this.state.editingBlock, n = this.state.originalTitle || t.dataset.title || "";
			this.createFloatingEditor(t, e, n, this.state.isExpanded);
		} else {
			let t = { dataset: {
				id: "new_block_" + (this.state.pendingSide || "left"),
				side: this.state.pendingSide || "left",
				role: this.state.pendingRole || void 0
			} }, n = this.state.originalTitle || "";
			this.createFloatingEditor(t, e, n, this.state.isExpanded);
		}
	}
	createFloatingEditor(e, t, r, i = !1) {
		let a = document.getElementById("inlineEditor");
		a && (a.style.display = "none");
		let o = e.dataset ? e.dataset.id || e.dataset.blockId : e.id || "new_block", s = document.querySelector(`.dialectics-floating-editor[data-block-id="${o}"]`);
		if (s) return this.bringToFront(s), s._tiptapEditor && s._tiptapEditor.commands.setContent(t), s;
		s = a.cloneNode(!0), s.removeAttribute("id"), s.classList.add("dialectics-floating-editor"), s.dataset.blockId = o;
		let c = document.querySelectorAll(".dialectics-floating-editor").length, l = 40 + c * 30, u = 120 + c * 25;
		s.style.left = `${l}px`, s.style.top = `${u}px`, s.style.position = "fixed", s.style.display = "flex", s.style.zIndex = String(this.getNextZIndex()), document.body.appendChild(s);
		let d = s.querySelector(".editor-drag-handle");
		d && (d.removeAttribute("id"), n.setupDraggable(s, d, this.state));
		let f = s.querySelector("#editorResizeHandle") || s.querySelector(".editor-resize-handle");
		f && (f.removeAttribute("id"), n.setupResizable(s, f));
		let p = s.querySelector("#tiptap-editor");
		p && (p.removeAttribute("id"), p.classList.add("tiptap-editor"));
		let m = s.querySelector("#editorBlockTitleInput");
		m && (m.removeAttribute("id"), m.classList.add("editor-block-title-input"), m.value = r || "", m.addEventListener("input", () => {
			this.state.isDirty = !0, this.saveAllEditorsState();
		}));
		let h = s.querySelector("#dialecticsStickerBtn");
		h && (h.removeAttribute("id"), h.onclick = (e) => {
			e.stopPropagation(), window.app && window.app.openStickersForCurrent(o);
		});
		let g = s.querySelector("#btnEditorExpand");
		g && (g.removeAttribute("id"), g.onclick = () => {
			s.classList.toggle("expanded"), this.saveAllEditorsState();
		});
		let _ = s.querySelector("#btnEditorClose");
		_ && (_.removeAttribute("id"), _.onclick = async () => {
			await this.closeFloatingEditor(e);
		});
		let v = s.querySelector("#btnEditorSave") || s.querySelector(".btn-primary");
		v && (v.removeAttribute("id"), v.onclick = async () => {
			await this.saveFloatingEditor(e);
		}), this.setupWindowTabs(s);
		let y = this.editor.createEditor(p, t, () => {
			this.editor.tiptap = y, o.startsWith("new_block") ? this.state.editingBlock = null : this.state.editingBlock = e, this.bringToFront(s);
			let t = document.getElementById("editorFormattingToolbar");
			if (t) {
				let e = s.querySelector(".editor-header-controls");
				e && !e.contains(t) && (e.parentNode.insertBefore(t, e), t.style.marginLeft = "20px", t.style.boxShadow = "0 4px 12px rgba(0,0,0,0.08)", t.style.border = "1px solid #e2e8f0", t.style.padding = "2px 8px", t.style.display = "flex");
			}
		}, () => {
			this.state.isDirty = !0, this.saveAllEditorsState();
		});
		return s._tiptapEditor = y, e._floatingEditorWindow = s, e._tiptapEditor = y, this.switchWindowTab(s, "text"), i && s.classList.add("expanded"), this.saveAllEditorsState(), s;
	}
	setupWindowTabs(e) {
		let t = e.querySelector(".editor-tabs");
		t && (t.removeAttribute("id"), t.querySelectorAll(".editor-tab").forEach((t) => {
			t.removeAttribute("id"), t.onclick = () => {
				this.switchWindowTab(e, t.dataset.tab);
			};
		}));
	}
	async switchWindowTab(e, t) {
		e.querySelectorAll(".editor-tab").forEach((e) => e.classList.toggle("active", e.dataset.tab === t)), e.querySelectorAll(".tab-content").forEach((e) => {
			let n = e.id === `editor-${t}` || e.classList.contains(`editor-${t}`) || e.classList.contains(`tab-content-${t}`);
			e.id === `editor-${t}` && (e.removeAttribute("id"), e.classList.add(`tab-content-${t}`)), e.classList.toggle("active", n), e.style.display = n ? "flex" : "none";
		}), t === "text" && this.editor && await this.editor.init();
	}
	bringToFront(e) {
		let t = Array.from(document.querySelectorAll(".dialectics-floating-editor"));
		if (t.length <= 1) return;
		let n = 1e4;
		t.forEach((e) => {
			let t = parseInt(e.style.zIndex) || 1e4;
			t > n && (n = t);
		}), parseInt(e.style.zIndex) < n && (e.style.zIndex = String(n + 1));
	}
	getNextZIndex() {
		let e = Array.from(document.querySelectorAll(".dialectics-floating-editor")), t = 1e4;
		return e.forEach((e) => {
			let n = parseInt(e.style.zIndex) || 1e4;
			n > t && (t = n);
		}), t + 1;
	}
	async closeFloatingEditor(e) {
		let t = e.dataset ? e.dataset.id || e.dataset.blockId : e.id || "new_block", n = document.querySelector(`.dialectics-floating-editor[data-block-id="${t}"]`);
		n && (this.state.isDirty && !await r({
			title: window._ ? window._("dialectics.unsaved_title", "Внимание") : "Внимание",
			message: window._ ? window._("dialectics.unsaved_msg", "Есть несохранённые изменения. Продолжить?") : "Есть несохранённые изменения. Продолжить?",
			icon: "",
			buttons: [{
				label: window._ ? window._("dialectics.cancel", "Отмена") : "Отмена",
				value: !1,
				class: "confirm-btn-secondary"
			}, {
				label: window._ ? window._("dialectics.continue_btn", "Продолжить") : "Продолжить",
				value: !0,
				class: "confirm-btn-primary"
			}]
		}) || this.destroyFloatingEditorWindow(n, e));
	}
	destroyFloatingEditorWindow(e, t) {
		if (e._tiptapEditor) try {
			e._tiptapEditor.destroy();
		} catch {}
		let n = document.getElementById("editorFormattingToolbar"), r = document.getElementById("editorDragHandle");
		n && e.contains(n) && r && (r.appendChild(n), n.style.marginLeft = "20px", n.style.boxShadow = "0 4px 12px rgba(0,0,0,0.08)", n.style.border = "1px solid #e2e8f0", n.style.padding = "2px 8px", n.style.display = "none"), e.remove(), t && (delete t._floatingEditorWindow, delete t._tiptapEditor), this.saveAllEditorsState();
	}
	async saveFloatingEditor(e) {
		let t = e.dataset ? e.dataset.id || e.dataset.blockId : e.id || "new_block", n = document.querySelector(`.dialectics-floating-editor[data-block-id="${t}"]`);
		if (!n) return;
		let r = n.querySelector(".editor-block-title-input"), i = r ? r.value.trim() : "", a = n._tiptapEditor ? n._tiptapEditor.getHTML() : "";
		if (!t.startsWith("new_block") && e.dataset) {
			i ? e.dataset.title = i : delete e.dataset.title;
			let t = e.querySelector(".dialectics-content-inner");
			t && (t.innerHTML = a), this.state.editingBlock = e;
			let n = document.getElementById("editorBlockTitleInput");
			n && (n.value = i), this.editor && this.editor.tiptap && this.editor.tiptap.commands.setContent(a), await this.saveGlobal(!1), this.state.editingBlock = null;
			let r = $.getBlocks(this.dom.canvas);
			$.render(this.dom.canvas, r, this._blockCallbacks());
		} else if (a !== "<p></p>" && a.trim() !== "") {
			let e = $.getBlocks(this.dom.canvas), t = {
				id: this.state.pendingBlockId || "block_" + Math.random().toString(36).substring(2, 9),
				side: this.state.pendingSide || "left",
				html: a,
				title: i || void 0
			};
			this.state.pendingRole && (t.role = this.state.pendingRole);
			let n;
			n = this.state.insertAfterIndex === null ? [...e, t] : [
				...e.slice(0, this.state.insertAfterIndex + 1),
				t,
				...e.slice(this.state.insertAfterIndex + 1)
			], this.state.insertAfterIndex = null, this.state.pendingRole = null, $.render(this.dom.canvas, n, this._blockCallbacks()), await this.saveGlobal(!1);
		}
		this.destroyFloatingEditorWindow(n, e);
	}
	saveAllEditorsState() {
		try {
			let e = [];
			Array.from(document.querySelectorAll(".dialectics-floating-editor")).forEach((t) => {
				let n = t.dataset.blockId, r = t.querySelector(".editor-block-title-input"), i = r ? r.value : "", a = t._tiptapEditor ? t._tiptapEditor.getHTML() : "";
				e.push({
					blockId: n,
					title: i,
					content: a,
					isExpanded: t.classList.contains("expanded"),
					styleLeft: t.style.left,
					styleTop: t.style.top,
					styleWidth: t.style.width,
					styleHeight: t.style.height
				});
			}), localStorage.setItem("papanda_multiple_editors_state", JSON.stringify(e));
		} catch {}
	}
	cleanUpInlineEdit() {
		this.cleanUpAllInlineEditors();
	}
	cleanUpAllInlineEditors() {
		this.dom.canvas && Array.from(this.dom.canvas.querySelectorAll(".dialectics-block.is-editing")).forEach((e) => {
			this.cleanUpInlineEditForBlock(e);
		});
	}
	cleanUpInlineEditForBlock(e) {
		if (!e) return;
		if (e._tiptapEditor) {
			try {
				e._tiptapEditor.destroy();
			} catch {}
			e._tiptapEditor = null;
		}
		let t = document.getElementById("editorFormattingToolbar"), n = document.getElementById("editorDragHandle"), r = e.querySelector(".dialectics-inline-editor-container");
		t && r && r.contains(t) && n && (n.appendChild(t), t.style.marginLeft = "20px", t.style.boxShadow = "0 4px 12px rgba(0,0,0,0.08)", t.style.border = "1px solid #e2e8f0", t.style.padding = "2px 8px", t.style.display = "none"), e.classList.remove("is-editing"), r && r.remove(), this.state.editingBlock === e && (this.state.editingBlock = null);
	}
	async saveInlineEdit() {
		this.state.editingBlock && await this.saveInlineEditForBlock(this.state.editingBlock);
	}
	async saveInlineEditForBlock(e) {
		if (!e) return;
		let t = e.querySelector(".dialectics-inline-editor-container"), n = e._originalTitle;
		if (t) {
			let e = t.querySelector(".inline-title-input");
			e && (n = e.value.trim());
		}
		let r = e._tiptapEditor ? e._tiptapEditor.getHTML() : e._originalHtml || "";
		this.cleanUpInlineEditForBlock(e), n ? e.dataset.title = n : delete e.dataset.title;
		let i = e.querySelector(".dialectics-content-inner");
		i && (i.innerHTML = r), this.state.editingBlock = e, await this.saveGlobal(!1), this.state.editingBlock = null;
		let a = $.getBlocks(this.dom.canvas);
		$.render(this.dom.canvas, a, this._blockCallbacks());
	}
	cancelInlineEdit() {
		this.state.editingBlock && this.cancelInlineEditForBlock(this.state.editingBlock);
	}
	cancelInlineEditForBlock(e) {
		if (!e) return;
		let t = e.querySelector(".dialectics-content-inner");
		t && e._originalHtml !== void 0 && (t.innerHTML = e._originalHtml), e._originalTitle !== void 0 && (e.dataset.title = e._originalTitle), this.cleanUpInlineEditForBlock(e);
		let n = $.getBlocks(this.dom.canvas);
		$.render(this.dom.canvas, n, this._blockCallbacks());
	}
	detachInlineEdit(e = !1) {
		this.state.editingBlock && this.detachInlineEditForBlock(this.state.editingBlock, e);
	}
	detachInlineEditForBlock(e, t = !1) {
		if (!e) return;
		let n = e._tiptapEditor ? e._tiptapEditor.getHTML() : e._originalHtml || "", r = e.querySelector(".dialectics-inline-editor-container"), i = e._originalTitle || "";
		if (r) {
			let e = r.querySelector(".inline-title-input");
			e && (i = e.value);
		}
		this.cleanUpInlineEditForBlock(e), this.createFloatingEditor(e, n, i, t);
	}
	async openEdit(e) {
		if (e.classList.contains("is-editing")) return;
		this.dom.editor && (this.dom.editor.style.display = "none"), this.dom.backdrop && (this.dom.backdrop.style.display = "none"), this.state.isDirty = !1, e.classList.add("is-editing");
		let t = e.querySelector(".dialectics-inline-editor-container");
		if (!t) {
			t = document.createElement("div"), t.className = "dialectics-inline-editor-container";
			let n = e.querySelector(".dialectics-content-inner");
			n ? n.after(t) : e.appendChild(t);
		}
		let n = e.dataset.title || "", r = e.querySelector(".dialectics-content-inner")?.innerHTML || "<p></p>";
		e._originalHtml = r, e._originalTitle = n, t.innerHTML = `
            <div class="inline-edit-toolbar" style="display:flex; justify-content:space-between; align-items:center; padding: 6px 12px; background:#f1f5f9; border-bottom:1px solid #cbd5e1; border-top-left-radius:12px; border-top-right-radius:12px; gap:8px;">
                <div class="inline-format-placeholder" style="display:flex; align-items:center; gap:4px;"></div>
                <div style="display:flex; align-items:center; gap:6px; margin-left:auto;">
                    <button type="button" class="btn-inline-action btn-inline-detach" title="Открыть в отдельном окне" style="background:none; border:none; cursor:pointer; font-size:1.1rem; padding:4px 6px; border-radius:6px; transition:background 0.15s; display:flex; align-items:center; justify-content:center;">↗️</button>
                    <button type="button" class="btn-inline-action btn-inline-fullscreen" title="Во весь экран" style="background:none; border:none; cursor:pointer; font-size:1.1rem; padding:4px 6px; border-radius:6px; transition:background 0.15s; display:flex; align-items:center; justify-content:center;">⛶</button>
                    <span style="width:1px; height:16px; background:#cbd5e1; margin:0 2px;"></span>
                    <button type="button" class="btn-inline-action btn-inline-save" title="Сохранить" style="background:#10b981; border:none; color:white; font-weight:600; cursor:pointer; font-size:0.85rem; padding:6px 12px; border-radius:8px; transition:opacity 0.15s;">OK</button>
                    <button type="button" class="btn-inline-action btn-inline-cancel" title="Отмена" style="background:#ef4444; border:none; color:white; font-weight:600; cursor:pointer; font-size:0.85rem; padding:6px 12px; border-radius:8px; transition:opacity 0.15s;">Отмена</button>
                </div>
            </div>
            <div class="inline-edit-title-row" style="padding: 10px 14px; display:flex; align-items:center; gap:8px; background:#f8fafc; border-bottom:1px solid #e2e8f0;">
                <span style="font-size:0.85rem; font-weight:600; color:#475569;">Заголовок:</span>
                <input type="text" class="inline-title-input" value="${n}" placeholder="Введите заголовок блока..." style="flex-grow:1; padding:6px 12px; border:1px solid #cbd5e1; border-radius:8px; font-size:0.9rem; font-family:inherit; outline:none; transition:border 0.15s;">
            </div>
            <div class="inline-tiptap-wrapper">
                <div class="block-tiptap-editor"></div>
            </div>
        `, [t.querySelector(".btn-inline-detach"), t.querySelector(".btn-inline-fullscreen")].forEach((e) => {
			e && (e.onmouseenter = () => e.style.background = "#e2e8f0", e.onmouseleave = () => e.style.background = "none");
		});
		let i = t.querySelector(".block-tiptap-editor");
		e._tiptapEditor = this.editor.createEditor(i, r, () => {
			let n = document.getElementById("editorFormattingToolbar");
			if (n) {
				let e = t.querySelector(".inline-format-placeholder");
				e && !e.contains(n) && (e.appendChild(n), n.style.marginLeft = "0", n.style.boxShadow = "none", n.style.border = "none", n.style.padding = "0", n.style.display = "flex");
			}
			this.state.editingBlock = e;
		}, () => {
			this.state.isDirty = !0;
		}), t.querySelector(".inline-title-input").addEventListener("input", (e) => {
			this.state.isDirty = !0;
		}), t.querySelector(".btn-inline-save").onclick = async (t) => {
			t.stopPropagation(), await this.saveInlineEditForBlock(e);
		}, t.querySelector(".btn-inline-cancel").onclick = (t) => {
			t.stopPropagation(), this.cancelInlineEditForBlock(e);
		}, t.querySelector(".btn-inline-detach").onclick = (t) => {
			t.stopPropagation(), this.detachInlineEditForBlock(e, !1);
		}, t.querySelector(".btn-inline-fullscreen").onclick = (t) => {
			t.stopPropagation(), this.detachInlineEditForBlock(e, !0);
		};
	}
	async openEditAltCard(e, t) {
		if (this.state.isDirty && (this.state.editingBlock !== t || this.state.editingAltCard !== e) && !await r({
			title: window._ ? window._("dialectics.unsaved_title", "Внимание") : "Внимание",
			message: window._ ? window._("dialectics.unsaved_msg", "Есть несохранённые изменения. Продолжить?") : "Есть несохранённые изменения. Продолжить?",
			icon: "",
			buttons: [{
				label: window._ ? window._("dialectics.cancel", "Отмена") : "Отмена",
				value: !1,
				class: "confirm-btn-secondary"
			}, {
				label: window._ ? window._("dialectics.continue_btn", "Продолжить") : "Продолжить",
				value: !0,
				class: "confirm-btn-primary"
			}]
		})) return;
		this.state.isDirty = !1, this.state.editingBlock = t, this.state.editingAltCard = e;
		let n = e.querySelector(".dialectics-content-inner")?.innerHTML || "", i = document.getElementById("editorBlockTitleInput");
		if (i) {
			let t = e.querySelector(".alt-title");
			i.value = t ? t.innerText : "";
		}
		this.open(n);
	}
	async close(e = !0) {
		if (!this._isClosing) {
			if (this._isClosing = !0, e && this.state.isDirty && !await r({
				title: window._ ? window._("dialectics.unsaved_title", "Внимание") : "Внимание",
				message: window._ ? window._("dialectics.unsaved_msg", "Есть несохранённые изменения. Продолжить?") : "Есть несохранённые изменения. Продолжить?",
				icon: "",
				buttons: [{
					label: window._ ? window._("dialectics.cancel", "Отмена") : "Отмена",
					value: !1,
					class: "confirm-btn-secondary"
				}, {
					label: window._ ? window._("dialectics.continue_btn", "Продолжить") : "Продолжить",
					value: !0,
					class: "confirm-btn-primary"
				}]
			})) {
				this._isClosing = !1;
				return;
			}
			typeof this.cleanUpInlineEdit == "function" && this.cleanUpInlineEdit(), this.state.isDirty = !1, this.state.editingBlock = null, this.state.editingAltCard = null, this.state.pendingSide = null, this.state.pendingRole = null, this.state.pendingBlockId = null, this.state.insertAfterIndex = null, this.state.isExpanded = !1, this.editor.setContent(""), this.dom.editor && (this.dom.editor.classList.remove("expanded"), this.dom.editor.style.display = "none"), this.dom.backdrop && (this.dom.backdrop.style.display = "none");
			try {
				localStorage.setItem("papanda_editor_open_state", JSON.stringify({ isOpen: !1 }));
			} catch {}
			this._isClosing = !1;
		}
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
			this.openEdit(e);
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
		this.dom.btnSave && (this.dom.btnSave.onclick = () => this.save()), this.dom.btnCancel && (this.dom.btnCancel.onclick = async () => await this.close()), this.dom.btnClose && (this.dom.btnClose.onclick = async () => await this.close()), document.addEventListener("click", (e) => {
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
			onEditAltCard: (e, t) => this.openEditAltCard(e, t),
			onDelete: async (e) => {
				e && await this.deleteStickersForBlock(e), await this.saveGlobal(!1, "toast.dialectics_updated");
				let t = $.getBlocks(this.dom.canvas);
				$.render(this.dom.canvas, t, this._blockCallbacks());
			},
			onHintClick: (e) => this.openHintEditor(e),
			onHintAI: (e) => e && e.id === "step3" ? this.runAI(this.dom.canvas) : this.runHintAI(e),
			onHacks: (e) => this.openHacksPopover(e)
		});
	}
	async openHintEditor(e, t = "", n = null) {
		if (this.state.isDirty && !await r({
			title: window._ ? window._("dialectics.unsaved_title", "Внимание") : "Внимание",
			message: window._ ? window._("dialectics.unsaved_msg", "Есть несохранённые изменения. Продолжить?") : "Есть несохранённые изменения. Продолжить?",
			icon: "",
			buttons: [{
				label: window._ ? window._("dialectics.cancel", "Отмена") : "Отмена",
				value: !1,
				class: "confirm-btn-secondary"
			}, {
				label: window._ ? window._("dialectics.continue_btn", "Продолжить") : "Продолжить",
				value: !0,
				class: "confirm-btn-primary"
			}]
		})) return;
		this.state.isDirty = !1, this.state.editingBlock = null, this.state.pendingSide = e.side, this.state.pendingRole = e.id, this.state.pendingBlockId = "block_" + Math.random().toString(36).substr(2, 9), this.state.insertAfterIndex = null;
		let i = document.getElementById("editorBlockTitleInput");
		i && (i.value = ""), this.open(t);
		let a = document.getElementById("tab-ai");
		if (n) {
			a && (a.style.display = "flex");
			let e = document.getElementById("aiHelpContent");
			e && (e.innerHTML = n);
			let t = document.getElementById("btnCopyAiToText");
			t && (t.onclick = () => {
				this.editor.setContent(n), this.editor.switchTab("text"), window.showToast && window.showToast(window._("dialectics.ai_transferred", "Текст от ИИ перенесен в редактор"), "success");
			}), this.editor.switchTab("ai");
		} else a && (a.style.display = "none");
	}
	toggleExpand() {
		this.state.isExpanded = !this.state.isExpanded, this.dom.editor && (this.dom.editor.classList.toggle("expanded", this.state.isExpanded), this.dom.backdrop && (this.dom.backdrop.style.display = this.state.isExpanded ? "block" : "none")), setTimeout(() => {
			let e = document.getElementById("shapesCanvasWrapper"), t = this.editor && this.editor.fabricCanvas;
			if (e && t) {
				let n = e.clientWidth, r = e.clientHeight;
				n > 10 && r > 10 && (t.setWidth(n), t.setHeight(r), t.calcOffset(), t.renderAll());
			}
		}, 320);
	}
	dismissHint(e) {
		if (this.state.dismissedHints || (this.state.dismissedHints = []), !this.state.dismissedHints.includes(e)) {
			this.state.dismissedHints.push(e);
			try {
				let e = this.state.currentNoteId ? "dialectics_dismissed_hints_" + this.state.currentNoteId : "dialectics_dismissed_hints_temp";
				localStorage.setItem(e, JSON.stringify(this.state.dismissedHints));
			} catch {}
		}
		let t = $.getBlocks(this.dom.canvas);
		$.render(this.dom.canvas, t, this._blockCallbacks());
	}
	toggleShowHiddenHints(e) {
		try {
			localStorage.setItem("dialectics_show_hidden_hints", e ? "true" : "false");
		} catch {}
		let t = $.getBlocks(this.dom.canvas);
		$.render(this.dom.canvas, t, this._blockCallbacks());
	}
	_blockCallbacks() {
		return {
			onEdit: (e) => {
				if (e.classList.contains("block-section") || e.dataset.isSection === "true") {
					this.openSectionTitleModal(null, e);
					return;
				}
				if ((e.dataset.status || "none") === "ready") {
					window.showToast && window.showToast("Этот блок заблокирован. Смените статус на «В работе», чтобы изменить его.", "warning");
					return;
				}
				this.openEdit(e);
			},
			onEditAltCard: (e, t) => {
				this.openEditAltCard(e, t);
			},
			onInsertAfter: (e, t) => {
				this.openInsertAfter(e, t);
			},
			onDelete: async (e) => {
				e && await this.deleteStickersForBlock(e), await this.saveGlobal(!1, "toast.dialectics_updated");
				let t = $.getBlocks(this.dom.canvas);
				$.render(this.dom.canvas, t, this._blockCallbacks());
			},
			onAI: (e) => {
				this.runAI(e);
			},
			onCheckAI: (e) => {
				this.checkAI(e);
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
			onHintDismiss: (e) => {
				this.dismissHint(e);
			},
			onFoldToggle: () => {
				this.saveGlobal(!1, null);
			},
			onHacks: (e) => {
				this.openHacksPopover(e);
			},
			onStatusToggle: async (e) => {
				let t = e.dataset.status || "none", n = "none";
				if (t === "none" ? n = "in_progress" : t === "in_progress" ? n = "ready" : t === "ready" && (n = "none"), e.dataset.status = n, window.showToast) {
					let e = "Статус блока: Не указан";
					n === "in_progress" && (e = "Статус блока: В работе"), n === "ready" && (e = "Статус блока: Готово (Заблокировано)"), window.showToast(e, "info");
				}
				let r = $.getBlocks(this.dom.canvas);
				$.render(this.dom.canvas, r, this._blockCallbacks()), await this.saveGlobal(!1, null);
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
			let n = $.getBlocks(this.dom.canvas);
			$.render(this.dom.canvas, n, this._blockCallbacks());
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
				let n = g_[t];
				n && (e.style.setProperty("--block-custom-bg", n.bg), e.style.setProperty("--block-custom-accent", n.accent));
			} else delete e.dataset.color, e.style.removeProperty("--block-custom-bg"), e.style.removeProperty("--block-custom-accent");
			await this.saveGlobal(!1, "toast.dialectics_updated");
			let r = $.getBlocks(this.dom.canvas);
			$.render(this.dom.canvas, r, this._blockCallbacks());
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
			let r = $.getBlocks(this.dom.canvas);
			$.render(this.dom.canvas, r, this._blockCallbacks()), this.saveGlobal(!1, "toast.dialectics_updated");
		} else {
			let e = $.getBlocks(this.dom.canvas), n = {
				id: "block_" + Math.random().toString(36).substr(2, 9),
				side: "section",
				isSection: !0,
				title: t,
				html: `<p>${t}</p>`
			};
			this.state.pendingSectionIndex !== null && this.state.pendingSectionIndex !== void 0 && this.state.pendingSectionIndex >= 0 ? this.state.pendingSectionIndex < e.length ? e.splice(this.state.pendingSectionIndex + 1, 0, n) : e.push(n) : this.state.pendingSectionIndex === -1 ? e.unshift(n) : e.push(n), $.render(this.dom.canvas, e, this._blockCallbacks()), this.saveGlobal(!1, "toast.dialectics_updated");
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
			a.setAttribute("draggable", "true"), a.dataset.index = n, a.style.cssText = `
                display: flex; align-items: center; gap: 8px; padding: 8px 12px; 
                border-radius: 8px; cursor: grab; transition: background 0.15s;
                font-size: ${r ? "0.9rem" : "0.8rem"};
                font-weight: ${r ? "700" : "500"};
                color: ${r ? "#ea580c" : "#334155"};
                background: ${r ? "#fff7ed" : "transparent"};
                border-left: ${r ? "4px solid #ea580c" : "2px solid transparent"};
            `, a.onmouseover = () => a.style.background = r ? "#ffedd5" : "#f8fafc", a.onmouseout = () => a.style.background = r ? "#fff7ed" : "transparent", a.innerHTML = `<span style="opacity: 0.3; cursor: grab; font-size: 0.8rem;" title="Перетащите для изменения порядка">⋮⋮</span><span>${r ? "📑" : t.classList.contains("block-left") ? "▫️" : "▪️"}</span><span style="flex-grow:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${i}</span>`, a.onclick = () => {
				if (this._wasDragging) {
					this._wasDragging = !1;
					return;
				}
				document.getElementById("tableOfContentsMenu").style.display = "none", t.scrollIntoView({
					behavior: "smooth",
					block: "center"
				}), t.style.transition = "box-shadow 0.5s ease";
				let e = t.style.boxShadow;
				t.style.boxShadow = "0 0 0 4px #ea580c", setTimeout(() => {
					t.style.boxShadow = e;
				}, 1500);
			}, a.addEventListener("dragstart", (e) => {
				e.stopPropagation(), this._wasDragging = !0, this._draggedTocIndex = n, e.dataTransfer.effectAllowed = "move", a.style.opacity = "0.5";
			}), a.addEventListener("dragend", (t) => {
				t.stopPropagation(), a.style.opacity = "1", setTimeout(() => {
					this._wasDragging = !1;
				}, 100), e.querySelectorAll("div").forEach((e) => {
					e.style.borderTop = "", e.style.borderBottom = "";
				});
			}), a.addEventListener("dragover", (t) => {
				t.preventDefault(), t.stopPropagation(), t.dataTransfer.dropEffect = "move", e.querySelectorAll("div").forEach((e) => {
					e !== a && (e.style.borderTop = "", e.style.borderBottom = "");
				});
				let n = a.getBoundingClientRect();
				t.clientY - n.top > n.height / 2 ? (a.style.borderBottom = "2px solid #ea580c", a.style.borderTop = "") : (a.style.borderTop = "2px solid #ea580c", a.style.borderBottom = "");
			}), a.addEventListener("dragleave", (e) => {
				e.stopPropagation(), a.style.borderTop = "", a.style.borderBottom = "";
			}), a.addEventListener("drop", (e) => {
				e.preventDefault(), e.stopPropagation(), a.style.borderTop = "", a.style.borderBottom = "", setTimeout(() => {
					this._wasDragging = !1;
				}, 100);
				let t = this._draggedTocIndex, r = n;
				if (t == null || t === r) return;
				let i = a.getBoundingClientRect(), o = e.clientY - i.top > i.height / 2, s = $.getBlocks(this.dom.canvas);
				if (!s || !s[t] || !s[r]) return;
				let c = s[t].isSection, l = 1;
				if (c) for (let e = t + 1; e < s.length && !s[e].isSection; e++) l++;
				let u = r;
				if (o) if (c && s[r].isSection) {
					let e = r + 1;
					for (; e < s.length && !s[e].isSection;) e++;
					u = e;
				} else u = r + 1;
				let d = s.splice(t, l);
				u > t && (u -= l), s.splice(u, 0, ...d), $.render(this.dom.canvas, s, this._blockCallbacks()), this.saveGlobal(!1, "toast.dialectics_updated"), this.updateTableOfContents();
			}), e.appendChild(a);
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
	toggleSearchInNote(e) {
		e && e.stopPropagation();
		let t = document.getElementById("searchInNoteMenu");
		if (t) if (t.style.display === "none" || !t.style.display) {
			let e = document.getElementById("tableOfContentsMenu");
			e && (e.style.display = "none");
			let n = document.getElementById("versionsMenu");
			n && (n.style.display = "none"), t.style.display = "block";
			let r = document.getElementById("searchInNoteInput");
			r && (r.value = "", r.focus());
			let i = document.getElementById("searchInNoteResults");
			i && (i.innerHTML = "<div style=\"text-align: center; color: #64748b; font-size: 0.85rem; padding: 10px 0;\">Введите текст для начала поиска</div>");
			let a = (e) => {
				!t.contains(e.target) && e.target.id !== "btnToggleSearch" && (t.style.display = "none", document.removeEventListener("click", a));
			};
			setTimeout(() => document.addEventListener("click", a), 10);
		} else t.style.display = "none";
	}
	performSearchInNote(e) {
		let t = document.getElementById("searchInNoteResults");
		if (!t || !this.dom.canvas) return;
		if (e = (e || "").trim().toLowerCase(), !e) {
			t.innerHTML = "<div style=\"text-align: center; color: #64748b; font-size: 0.85rem; padding: 10px 0;\">Введите текст для начала поиска</div>";
			return;
		}
		let n = Array.from(this.dom.canvas.querySelectorAll(".dialectics-block"));
		t.innerHTML = "";
		let r = 0;
		n.forEach((n, i) => {
			let a = n.classList.contains("block-section") || n.dataset.isSection === "true", o = n.dataset.title || "";
			if (!o) {
				let e = n.querySelector(".block-title-text");
				o = e ? e.innerText : "";
			}
			if (!o) {
				let e = n.querySelector(".dialectics-block-header span:first-child");
				o = e ? e.innerText : a ? "Раздел" : `Блок ${i + 1}`;
			}
			let s = n.querySelector(".dialectics-content-inner"), c = s && (s.innerText || s.textContent) || "", l = o.toLowerCase().includes(e), u = c.toLowerCase().includes(e);
			if (l || u) {
				r++;
				let i = document.createElement("div");
				i.style.cssText = "\n                    display: flex; flex-direction: column; gap: 4px; padding: 8px 12px; \n                    border-radius: 8px; cursor: pointer; transition: background 0.15s;\n                    border: 1px solid #e2e8f0; background: #fff; text-align: left;\n                ", i.onmouseover = () => i.style.background = "#f8fafc", i.onmouseout = () => i.style.background = "#fff";
				let s = a ? "📑" : n.classList.contains("block-left") ? "▫️" : "▪️", l = "";
				if (u) {
					let t = c.toLowerCase().indexOf(e), n = Math.max(0, t - 30), r = Math.min(c.length, t + e.length + 30);
					l = (n > 0 ? "..." : "") + c.substring(n, r) + (r < c.length ? "..." : ""), l = l.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
					let i = e.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&");
					l = l.replace(RegExp(`(${i})`, "gi"), "<mark style=\"background: #fef08a; padding: 0 2px; border-radius: 2px;\">$1</mark>");
				} else l = c.substring(0, 60) + (c.length > 60 ? "..." : "");
				i.innerHTML = `
                    <div style="display: flex; align-items: center; gap: 6px; font-weight: 700; font-size: 0.85rem; color: ${a ? "#ea580c" : "#1e293b"};">
                        <span>${s}</span>
                        <span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${o}</span>
                    </div>
                    ${l ? `<div style="font-size: 0.75rem; color: #64748b; line-height: 1.3; overflow:hidden; text-overflow:ellipsis; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical;">${l}</div>` : ""}
                `, i.onclick = () => {
					document.getElementById("searchInNoteMenu").style.display = "none", n.scrollIntoView({
						behavior: "smooth",
						block: "center"
					}), n.style.transition = "box-shadow 0.5s ease";
					let e = n.style.boxShadow;
					n.style.boxShadow = "0 0 0 4px #3b82f6", setTimeout(() => {
						n.style.boxShadow = e;
					}, 2e3);
				}, t.appendChild(i);
			}
		}), r === 0 && (t.innerHTML = "<div style=\"text-align: center; color: #94a3b8; font-size: 0.85rem; padding: 20px 0;\">Ничего не найдено</div>");
	}
}, Qv = {};
Object.getOwnPropertyNames(Zv.prototype).forEach((e) => {
	e !== "constructor" && (Qv[e] = Zv.prototype[e]);
});
//#endregion
//#region fastapi_app/static/js/dialectics.js
var $v = class {
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
			blockStickersCount: {},
			dismissedHints: []
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
			connectionsModal: document.getElementById("dialectics-connections-modal"),
			categorySelect: document.getElementById("dialecticsCategorySelect"),
			connCategoriesList: document.getElementById("connections-categories-list"),
			connResultsContainer: document.getElementById("connections-results-container"),
			newCategoryInput: document.getElementById("new-category-input")
		}, this.editor = new Wv(this), this.dom.editor && this.init();
	}
	async init() {
		this.logDebug("Engine init..."), this._bindEvents(), window.addEventListener("stickersUpdated", async (e) => {
			e.detail && e.detail.parentType === "dialectics" && String(e.detail.parentId) === String(this.state.currentNoteId) && typeof this.refreshStickers == "function" && await this.refreshStickers();
		}), await this.loadCategories();
		let e = new URLSearchParams(window.location.search).get("id");
		if (!e && (e = localStorage.getItem("dialectics_last_note_id"), e)) {
			let t = new URL(window.location);
			t.searchParams.set("id", e), window.history.replaceState({}, "", t);
		}
		e ? await this.loadNoteToEditor(e, !1) : (this.state.currentNoteId = null, this.state.dismissedHints = JSON.parse(localStorage.getItem("dialectics_dismissed_hints_temp") || "[]"), this.dom.title && (this.dom.title.value = ""), this.dom.categorySelect && (this.dom.categorySelect.value = ""), this.dom.canvas && $.render(this.dom.canvas, [], this._blockCallbacks()), this.dom.deleteBtn && (this.dom.deleteBtn.style.display = "none"), this._revealInterface());
		let t = document.getElementById("toggleShowHiddenHints");
		t && (t.checked = localStorage.getItem("dialectics_show_hidden_hints") === "true"), await this.editor.switchTab("text");
		try {
			let e = JSON.parse(localStorage.getItem("papanda_multiple_editors_state") || "[]");
			if (Array.isArray(e) && e.length > 0) setTimeout(() => {
				e.forEach((e) => {
					let t = null;
					if (e.blockId && !e.blockId.startsWith("new_block") && (t = this.dom.canvas.querySelector(`[data-block-id="${e.blockId}"], [data-id="${e.blockId}"]`)), t || e.blockId && e.blockId.startsWith("new_block")) {
						let n = t || { dataset: { id: e.blockId } }, r = this.createFloatingEditor(n, e.content, e.title, e.isExpanded);
						r && (e.styleLeft && (r.style.left = e.styleLeft), e.styleTop && (r.style.top = e.styleTop), e.styleWidth && (r.style.width = e.styleWidth), e.styleHeight && (r.style.height = e.styleHeight));
					}
				});
			}, 300);
			else {
				let e = JSON.parse(localStorage.getItem("papanda_editor_open_state") || "null");
				if (e && e.isOpen) {
					if (e.editingBlockId) {
						let t = this.dom.canvas.querySelector(`[data-block-id="${e.editingBlockId}"], [data-id="${e.editingBlockId}"]`);
						if (t && (this.state.editingBlock = t, e.editingAltCardIndex !== void 0 && e.editingAltCardIndex !== null)) {
							let n = Array.from(t.querySelectorAll("div")).filter((e) => e.querySelector(".alt-title") || e.querySelector(".alt-title-text"));
							this.state.editingAltCard = n[e.editingAltCardIndex] || null;
						}
					}
					e.pendingSide && (this.state.pendingSide = e.pendingSide), e.pendingBlockId && (this.state.pendingBlockId = e.pendingBlockId), e.pendingRole && (this.state.pendingRole = e.pendingRole), e.insertAfterIndex !== void 0 && (this.state.insertAfterIndex = e.insertAfterIndex);
					let t = document.getElementById("editorBlockTitleInput");
					t && e.blockTitle !== void 0 && (t.value = e.blockTitle), this.open(e.content || "");
				}
			}
		} catch {}
	}
	_revealInterface() {
		let e = document.querySelector(".note-interface");
		e && (e.style.opacity = "1");
	}
	_bindEvents() {
		n.setupDraggable(this.dom.editor, this.dom.dragHandle, this.state), n.setupResizable(this.dom.editor, document.getElementById("editorResizeHandle"));
		let e = (e, t) => document.getElementById(e)?.addEventListener("click", t.bind(this));
		e("btnDeleteDialectics", this.deleteGlobal), e("btnSaveDialectics", () => this.saveGlobal(!1)), e("btnExportMarkdown", this.exportMarkdown), e("btnExportPDF", this.exportPDF), e("btnMathFormula", () => this.editor.showMathMenu()), e("btnEditorSave", () => this.saveGlobal(!0)), e("btnPinNote", this.pinCurrent), e("btnEditorClose", async () => await this.close(!0)), e("btnEditorExpand", this.toggleExpand), this.logDebug("Binding btnLoadDialectics..."), e("btnLoadDialectics", async (e) => {
			this.logDebug("btnLoadDialectics CLICKED!"), e.preventDefault(), e.stopPropagation();
			try {
				if (this.logDebug("isDirty = " + this.state.isDirty), this.state.isDirty) {
					this.logDebug("Showing customConfirm for unsaved changes...");
					let e = await r({
						title: window._ ? window._("dialectics.unsaved_title") : "Внимание",
						message: window._ ? window._("dialectics.unsaved_msg") : "Есть несохранённые изменения. Продолжить?",
						icon: "",
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
		t && t.addEventListener("input", (e) => this.searchNotes(e.target.value)), e("btnNewDialectics", this.createNewNote), e("btnTrashDialectics", () => {
			let e = document.getElementById("dialecticsMenuContent");
			e && (e.style.display = "none"), this.showTrashModal();
		}), e("btnGlobalParser", this.runGlobalParser), e("btnExampleDialectics", this.loadExample), e("btnPrevDialectics", this.loadPreviousNote), e("btnDialecticsReference", this.showReferenceModal), e("btnDialecticsGuide", this.showGuideModal), e("btnDialecticsConnections", this.showConnectionsModal), e("close-connections-btn", () => {
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
			} else this.state.currentNoteId && await this.saveGlobal(!1, "toast.dialectics_updated");
		}), e("btnViewModalEdit", () => {
			this.hideViewModal(), this.loadNoteToEditor(this.state.viewingNoteId);
		}), __.init(this.dom.canvas, {
			onClick: async (e, t) => {
				if (this.state.isDirty && !await r({
					title: window._ ? window._("dialectics.unsaved_title", "Внимание") : "Внимание",
					message: window._ ? window._("dialectics.unsaved_msg", "Есть несохранённые изменения. Продолжить?") : "Есть несохранённые изменения. Продолжить?",
					icon: "",
					buttons: [{
						label: window._ ? window._("dialectics.cancel", "Отмена") : "Отмена",
						value: !1,
						class: "confirm-btn-secondary"
					}, {
						label: window._ ? window._("dialectics.continue_btn", "Продолжить") : "Продолжить",
						value: !0,
						class: "confirm-btn-primary"
					}]
				})) return;
				this.state.isDirty = !1;
				let n = e < t ? "left" : "right";
				this.state.editingBlock = null, this.state.pendingSide = n, this.state.pendingBlockId = "block_" + Math.random().toString(36).substr(2, 9), this.state.pendingRole = null;
				let i = $.getBlocks(this.dom.canvas).some((e) => e.role === "anchor");
				n === "left" && !i && (this.state.pendingRole = "anchor"), this.open();
			},
			onDoubleClick: (e) => {
				this.openEdit(e);
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
		}), e("btnToggleFill", () => this.editor.toggleFillForSelected()), this.dom.canvas) {
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
				let n = $.getBlocks(this.dom.canvas);
				$.render(this.dom.canvas, n, this._blockCallbacks()), await this.saveGlobal(!1, "toast.dialectics_updated");
			});
		}
	}
	_renderMarkdown(e) {
		return e.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>").replace(/\*(.+?)\*/g, "<em>$1</em>").replace(/\n\n/g, "</p><p>").replace(/\n/g, "<br>").replace(/^/, "<p>").replace(/$/, "</p>");
	}
	setupExplainTooltip() {
		if (!document.getElementById("explain-concept-styles")) {
			let e = document.createElement("style");
			e.id = "explain-concept-styles", e.innerHTML = "\n                @keyframes spin {\n                    0% { transform: rotate(0deg); }\n                    100% { transform: rotate(360deg); }\n                }\n            ", document.head.appendChild(e);
		}
		let e = document.createElement("div");
		e.className = "dialectics-context-menu", e.style.display = "none";
		let t = document.createElement("div");
		t.className = "dialectics-context-menu-item", t.innerHTML = "Что это?", e.appendChild(t), document.body.appendChild(e);
		let n = "", r = "", i = "", a = [], o = (e) => {
			let t = e;
			for (; t && t !== document.body;) {
				if (t.classList.contains("tiptap-editor") || t.classList.contains("ProseMirror") || t.classList.contains("dialectics-content-inner") || t.id === "inlineEditor" || [
					"P",
					"DIV",
					"LI",
					"BLOCKQUOTE",
					"PRE",
					"H1",
					"H2",
					"H3",
					"H4",
					"H5",
					"H6"
				].includes(t.tagName)) return t;
				t = t.parentElement;
			}
			return e;
		}, s = (e) => {
			if (!e || !e.rangeCount) return {
				before: "",
				after: ""
			};
			try {
				let t = e.getRangeAt(0), n = t.commonAncestorContainer, r = o(n.nodeType === 3 ? n.parentElement : n), i = document.createRange();
				i.selectNodeContents(r), i.setEnd(t.startContainer, t.startOffset);
				let a = i.toString(), s = document.createRange();
				return s.selectNodeContents(r), s.setStart(t.endContainer, t.endOffset), {
					before: a,
					after: s.toString()
				};
			} catch (e) {
				return console.error("Error getting context:", e), {
					before: "",
					after: ""
				};
			}
		}, c = (e) => e.closest(".dialectics-content-inner") || e.closest(".tiptap-editor") || e.closest(".ProseMirror") || e.closest("#inlineEditor"), l = document.getElementById("explainConceptBody"), u = (e, t) => {
			if (!l) return;
			let n = document.createElement("div");
			e === "user" ? (n.style.cssText = "margin-left: auto; margin-right: 0; max-width: 80%; background: #3b82f6; color: #fff; padding: 10px 14px; border-radius: 12px 12px 0 12px; box-shadow: 0 2px 4px rgba(59, 130, 246, 0.15); margin-bottom: 12px; word-break: break-word;", n.innerText = t) : e === "assistant" ? (n.style.cssText = "margin-left: 0; margin-right: auto; max-width: 85%; background: #f1f5f9; color: #1e293b; padding: 12px 16px; border-radius: 12px 12px 12px 0; box-shadow: 0 1px 2px rgba(0,0,0,0.05); margin-bottom: 12px; word-break: break-word;", n.innerHTML = this._renderMarkdown(t)) : e === "loading" && (n.id = "explainConceptLoading", n.style.cssText = "margin-left: 0; margin-right: auto; max-width: 85%; background: #f1f5f9; color: #94a3b8; padding: 12px 16px; border-radius: 12px 12px 12px 0; box-shadow: 0 1px 2px rgba(0,0,0,0.05); margin-bottom: 12px; display: flex; align-items: center; gap: 8px;", n.innerHTML = "<span class=\"spinner\" style=\"border: 2px solid #cbd5e1; border-top: 2px solid #3b82f6; border-radius: 50%; width: 14px; height: 14px; animation: spin 0.8s linear infinite; display: inline-block;\"></span><span>Думаю...</span>"), l.appendChild(n), l.scrollTop = l.scrollHeight;
		};
		document.addEventListener("contextmenu", (t) => {
			let a = window.getSelection();
			if (!a || !a.rangeCount || a.isCollapsed) {
				e.style.display = "none";
				return;
			}
			let o = a.getRangeAt(0).commonAncestorContainer;
			if (!c(o.nodeType === 3 ? o.parentElement : o)) {
				e.style.display = "none";
				return;
			}
			if (n = a.toString().trim(), !n) {
				e.style.display = "none";
				return;
			}
			let l = s(a);
			r = l.before, i = l.after, t.preventDefault(), e.style.display = "block";
			let u = t.pageX, d = t.pageY;
			u + 160 > window.innerWidth && (u = window.innerWidth - 160), d + 50 > window.innerHeight + window.scrollY && (d = t.pageY - 50), e.style.left = `${u}px`, e.style.top = `${d}px`;
		}, !0), document.addEventListener("click", (t) => {
			e.contains(t.target) || (e.style.display = "none");
		}), document.addEventListener("keydown", (t) => {
			t.key === "Escape" && (e.style.display = "none");
		}), t.addEventListener("click", async (t) => {
			if (t.stopPropagation(), !n) return;
			e.style.display = "none";
			let o = document.getElementById("explainConceptModal"), s = document.getElementById("explainConceptTitle"), c = document.getElementById("explainConceptDefaultFooter"), d = document.getElementById("explainConceptChatFooter"), f = document.getElementById("explainConceptInput"), p = document.getElementById("explainConceptSendBtn");
			if (!(!o || !l || !f || !p)) {
				a = [], s.innerText = `Что это: "${n}"?`, l.innerHTML = "", f.value = "", f.disabled = !0, p.disabled = !0, c && (c.style.display = "none"), d && (d.style.display = "block"), o.style.display = "flex", u("loading");
				try {
					let e = await fetch("/api/ai/dialectics/explain-concept", {
						method: "POST",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify({
							text: n,
							context_before: r,
							context_after: i
						})
					}), t = document.getElementById("explainConceptLoading");
					if (t && t.remove(), !e.ok) throw Error(`HTTP ${e.status}`);
					let o = await e.json(), s = o.user_query || `Объясни следующее понятие: ${n}`;
					a.push({
						role: "user",
						content: s
					}), a.push({
						role: "assistant",
						content: o.result
					}), u("assistant", o.result), f.disabled = !1, p.disabled = !1, f.focus();
				} catch (e) {
					let t = document.getElementById("explainConceptLoading");
					t && t.remove(), l.innerHTML = `<div style="color:#ef4444; padding:10px;">Ошибка: ${e.message}</div>`;
				}
				window.getSelection()?.removeAllRanges();
			}
		});
		let d = document.getElementById("explainConceptForm");
		d && (d.onsubmit = async (e) => {
			e.preventDefault();
			let t = document.getElementById("explainConceptInput"), r = document.getElementById("explainConceptSendBtn");
			if (!t || !r) return;
			let i = t.value.trim();
			if (!(!i || t.disabled)) {
				u("user", i), a.push({
					role: "user",
					content: i
				}), t.value = "", t.disabled = !0, r.disabled = !0, u("loading");
				try {
					let e = await fetch("/api/ai/dialectics/explain-concept", {
						method: "POST",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify({
							text: n,
							history: a
						})
					}), t = document.getElementById("explainConceptLoading");
					if (t && t.remove(), !e.ok) throw Error(`HTTP ${e.status}`);
					let r = await e.json();
					a.push({
						role: "assistant",
						content: r.result
					}), u("assistant", r.result);
				} catch (e) {
					let t = document.getElementById("explainConceptLoading");
					t && t.remove();
					let n = document.createElement("div");
					n.style.cssText = "margin-left: 0; margin-right: auto; max-width: 85%; color: #ef4444; padding: 10px 12px; margin-bottom: 12px;", n.innerText = `Ошибка: ${e.message}`, l.appendChild(n), l.scrollTop = l.scrollHeight;
				} finally {
					t.disabled = !1, r.disabled = !1, t.focus();
				}
			}
		});
	}
	logDebug(e) {
		if (!this.dom.debug) return;
		let t = document.createElement("div");
		t.textContent = `[${(/* @__PURE__ */ new Date()).toLocaleTimeString()}] ${e}`, this.dom.debug.prepend(t);
	}
	showWordDefinition(e) {
		let t = $.getBlocks(document.getElementById("dialecticsCanvas")), n = null, r = null;
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
		let s = document.getElementById("explainConceptDefaultFooter"), c = document.getElementById("explainConceptChatFooter");
		s && (s.style.display = "block"), c && (c.style.display = "none"), a.innerText = `📖 ${n.word}`;
		let l = "";
		if (n.connections) {
			let e = n.connections.split(",").map((e) => e.trim()).filter(Boolean);
			e.length > 0 && (l = "<div style=\"margin-top: 16px; padding-top: 12px; border-top: 1px dashed #e2e8f0;\">\n                    <strong style=\"color: #475569; font-size: 0.85rem; display: block; margin-bottom: 6px;\">Связи:</strong>\n                    <div style=\"display: flex; flex-wrap: wrap; gap: 6px;\">\n                ", e.forEach((e) => {
				l += `<span onclick="window.app && window.app.showWordDefinition('${e.replace(/'/g, "\\'")}')" style="cursor: pointer; background: #f1f5f9; border: 1px solid #cbd5e1; color: #475569; border-radius: 12px; padding: 2px 8px; font-size: 0.8rem; font-weight: 500; display: inline-flex; align-items: center; gap: 4px;">📖 ${e}</span>`;
			}), l += "</div></div>");
		}
		o.innerHTML = `
            <div style="font-size: 1rem; color: #1e293b; line-height: 1.6;">
                ${n.definition.replace(/\n/g, "<br>")}
            </div>
            ${l}
            <div style="margin-top: 20px; text-align: right;">
                <button class="btn btn-secondary" onclick="document.getElementById('explainConceptModal').style.display='none'; const el = document.querySelector('[data-block-id=\\'${r}\\']'); if (el) { el.scrollIntoView({behavior: 'smooth', block: 'center'}); el.style.boxShadow = '0 0 20px rgba(59, 130, 246, 0.5)'; setTimeout(() => el.style.boxShadow = '', 2000); }" style="font-size: 0.85rem; padding: 6px 12px; border-radius: 6px; background: #3b82f6; color: white; border: none; cursor: pointer; font-weight: 600;">🔍 ${window._ && window._("dialectics.go_to_block") || "Перейти к блоку"}</button>
            </div>
        `, i.style.display = "flex";
	}
};
Object.assign($v.prototype, Kv, Jv, Xv, Qv), window.toggleOnlyTitlesMode = function(e) {
	let t = document.getElementById("dialecticsCanvas");
	t && (e ? t.classList.add("mode-only-titles") : t.classList.remove("mode-only-titles"));
}, window.toggleCompressedMode = function(e) {
	let t = document.getElementById("dialecticsCanvas");
	t && (e ? t.classList.add("mode-compressed-left") : t.classList.remove("mode-compressed-left"));
}, window.BlockManager = $, window.CanvasManager = __, window.app = new $v();
//#endregion
