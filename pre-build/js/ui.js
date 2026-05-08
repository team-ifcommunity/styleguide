(function () {
    function initToggleSwitch() {
        document.querySelectorAll('.toggle-switch[role="switch"]').forEach(function (btn) {
            btn.addEventListener("click", function () {
                var isChecked = this.getAttribute("aria-checked") === "true";
                isChecked = !isChecked;
                this.setAttribute("aria-checked", isChecked);
                this.classList.toggle("is-checked", isChecked);

                var thumb = this.querySelector(".toggle-switch__thumb");
                if (!thumb) return;
                var use = thumb.querySelector("use");
                if (use) {
                    use.setAttribute("href", isChecked ? "#icon-outline-check" : "#icon-outline-close");
                }
            });
        });
    }

    function init() {
        initToggleSwitch();

        /* 자동 타이틀 달아주기 */
        var titleTargets = document.querySelectorAll("a, .btn, .eps");
        titleTargets.forEach(function (el) {
            var attr = (el.textContent || "").trim();
            attr = attr.replace(/(\r\n|\n|\r)/gm, "");
            attr = attr.replace(/\s{2,}/g, " ");

            if (!el.hasAttribute("title")) {
                el.setAttribute("title", attr);
            }
        });
        if (document.querySelectorAll(".eps a").length > 0) {
            document.querySelectorAll(".eps").forEach(function (eps) {
                eps.removeAttribute("title");
            });
        }

        /* 탭 리스트 */
        var tabItems = document.querySelectorAll(".tabList li");
        tabItems.forEach(function (item) {
            item.addEventListener("click", function () {
                var clicked = this;
                var tabNav = clicked.closest(".tabNav");
                var index = Array.from(clicked.parentElement.children).indexOf(clicked);

                clicked.classList.add("active");
                Array.from(clicked.parentElement.children).forEach(function (sibling) {
                    if (sibling !== clicked) sibling.classList.remove("active");
                });

                if (tabNav && tabNav.parentElement) {
                    var tabConts = Array.from(tabNav.parentElement.children).filter(function (el) {
                        return el !== tabNav && el.classList.contains("tabCont");
                    });
                    var targetCont = tabConts[index];
                    tabConts.forEach(function (cont) {
                        cont.classList.toggle("active", cont === targetCont);
                    });
                }
            });
        });

        /* input 맞춤법 검사 제거 */
        document.querySelectorAll('input[type="text"]').forEach(function (el) {
            el.setAttribute("spellcheck", "false");
        });

        /* input disabled 자동 타이틀 */
        document.querySelectorAll("input[disabled].disabled").forEach(function (el) {
            el.setAttribute("title", el.value);
        });

        /* textarea disabled 자동 타이틀 */
        document.querySelectorAll("textarea[disabled].disabled").forEach(function (el) {
            el.setAttribute("title", el.value);
        });

        /* 탭 기능 (.tab-area, role="tab", .tab-panel) */
        var tabAreas = document.querySelectorAll(".tab-area");

        tabAreas.forEach(function (area) {
            // :scope로 직계 자식만 선택 → 중첩 탭 간 간섭 방지
            var tabList = area.querySelector(":scope > .tab-list");
            var tabContents = area.querySelector(":scope > .tab-contents");

            if (!tabList || !tabContents) return;

            var tabs = tabList.querySelectorAll('[role="tab"]');
            var panels = tabContents.querySelectorAll(":scope > .tab-panel");

            function activateTab(tab) {
                var targetId = tab.getAttribute("aria-controls");
                if (!targetId) return;

                // 현재 tab-area의 탭만 초기화
                tabs.forEach(function (t) {
                    t.classList.remove("is-active");
                    t.setAttribute("aria-selected", "false");
                    var sr = t.querySelector(".sr-only.created");
                    if (sr) sr.remove();
                });

                // 현재 tab-area의 패널만 초기화
                panels.forEach(function (p) {
                    p.classList.remove("is-active");
                    p.hidden = true;
                });

                // 선택된 탭 활성화
                tab.classList.add("is-active");
                tab.setAttribute("aria-selected", "true");
                var btn = tab.querySelector(".tab-btn");
                if (btn) btn.insertAdjacentHTML("beforeend", '<i class="sr-only created">선택됨</i>');

                // 대응 패널 활성화
                var panel = tabContents.querySelector(":scope > #" + CSS.escape(targetId));
                if (panel) {
                    panel.classList.add("is-active");
                    panel.hidden = false;
                }
            }

            tabs.forEach(function (tab, index) {
                var tabBtn = tab.querySelector(".tab-btn");

                tab.addEventListener("click", function () {
                    activateTab(tab);
                });

                if (tabBtn) {
                    tabBtn.addEventListener("keydown", function (e) {
                        var nextIndex = -1;
                        if (e.key === "ArrowLeft") nextIndex = index - 1;
                        else if (e.key === "ArrowRight") nextIndex = index + 1;
                        else if (e.key === "Home") nextIndex = 0;
                        else if (e.key === "End") nextIndex = tabs.length - 1;

                        if (nextIndex >= 0 && nextIndex < tabs.length) {
                            e.preventDefault();
                            var nextBtn = tabs[nextIndex].querySelector(".tab-btn");
                            if (nextBtn) nextBtn.focus();
                            activateTab(tabs[nextIndex]);
                        }
                    });
                }
            });
        });
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();
