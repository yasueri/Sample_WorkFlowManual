// ページ読み込み時の処理を開始
document.addEventListener('DOMContentLoaded', function() {
    // HTMLから埋め込まれたCSVデータを取得
    const csvData = window.csvData || "";
    
    // CSVパース関数
    function parseCSV(csvText) {
        const rows = [];
        let currentRow = [];
        let currentField = "";
        let insideQuotes = false;

        for (let i = 0; i < csvText.length; i++) {
            const char = csvText[i];

            if (char === '"') {
                if (insideQuotes && csvText[i + 1] === '"') {
                    currentField += '"';
                    i++;
                } else {
                    insideQuotes = !insideQuotes;
                }
            } else if (char === "," && !insideQuotes) {
                currentRow.push(currentField);
                currentField = "";
            } else if ((char === "\n" || char === "\r") && !insideQuotes) {
                if (char === "\r" && csvText[i + 1] === "\n") {
                    i++;
                }
                currentRow.push(currentField);
                rows.push(currentRow);
                currentRow = [];
                currentField = "";
            } else {
                currentField += char;
            }
        }

        if (currentField || currentRow.length > 0) {
            currentRow.push(currentField);
            rows.push(currentRow);
        }

        return rows;
    }

    // CSVデータの処理
    const csvRows = parseCSV(csvData);
    const headers = csvRows[0] ? csvRows[0].map(h => h.trim()) : [];
    const rows = csvRows.slice(1);
    const data = rows.map(row => {
        const obj = {};
        headers.forEach((header, index) => {
            obj[header] = row[index] ? row[index].trim() : "";
        });
        return obj;
    });

    // ステップデータの構造化
    const stepsData = {};
    data.forEach(row => {
        const id = row.StepID;
        const title = row.Title;
        let desc = "";
        if (row.Description1) desc += row.Description1;
        if (row.Description2) desc += "\n" + row.Description2;
        if (row.Description3) desc += "\n" + row.Description3;

        const options = [];
        if (row.Option1Text && row.Option1Next) {
            options.push({
                text: row.Option1Text,
                next: row.Option1Next.replace(/to\s*/, "")
            });
        }
        if (row.Option2Text && row.Option2Next) {
            options.push({
                text: row.Option2Text,
                next: row.Option2Next.replace(/to\s*/, "")
            });
        }

        const defaultNext = row.DefaultNext || "";
        stepsData[id] = { id, title, desc, options, defaultNext };
    });

    // フロー履歴の管理
    let storyHistory = [];

    // 説明テキストのスタイル適用
    function styleDesc(text) {
        if (!text) return "";
        let styled = text.replace(/\n/g, "<br>");
        styled = styled.replace(/要印刷/g, '<span style="color: red; font-weight: bold;">要印刷</span>');
        return styled;
    }

    // 現在のセクションへスクロール
    function scrollToCurrent() {
        const sections = document.querySelectorAll(".story-section");
        if (sections.length > 0) {
            sections[sections.length - 1].scrollIntoView({
                behavior: "smooth",
                block: "center"
            });
        }
    }

    // 確認ポップアップ表示
    function showConfirmation(index, optionText, targetStep) {
        const overlay = document.getElementById("popup-overlay");
        overlay.style.display = "flex";

        const yesBtn = document.getElementById("popup-yes");
        const noBtn = document.getElementById("popup-no");

        yesBtn.onclick = () => {
            storyHistory = storyHistory.slice(0, index + 1);
            storyHistory[index].chosenOption = optionText;
            if (stepsData[targetStep]) {
                storyHistory.push({ stepId: targetStep, chosenOption: null });
            }
            hidePopup();
            renderFlow();
            scrollToCurrent();
        };

        noBtn.onclick = hidePopup;
    }

    // ポップアップを非表示
    function hidePopup() {
        const overlay = document.getElementById("popup-overlay");
        overlay.style.display = "none";
    }

    // フローのレンダリング
    function renderFlow() {
        const container = document.getElementById("story-container");
        container.innerHTML = "";

        storyHistory.forEach((entry, index) => {
            const step = stepsData[entry.stepId];
            const section = document.createElement("div");
            section.classList.add("story-section");
            section.classList.add(
                index === storyHistory.length - 1 ? "current" : "past"
            );

            if (step.title) {
                const titleDiv = document.createElement("div");
                titleDiv.className = "story-title";
                titleDiv.textContent = step.id + " - " + step.title;
                section.appendChild(titleDiv);
            }

            const descDiv = document.createElement("div");
            descDiv.className = "story-desc";
            descDiv.innerHTML = styleDesc(step.desc);
            section.appendChild(descDiv);

            const optionsDiv = document.createElement("div");
            optionsDiv.className = "option-container";

            if (step.options.length > 0) {
                step.options.forEach(option => {
                    const btn = document.createElement("button");
                    btn.className = "option-button";
                    btn.innerHTML = styleDesc(option.text);

                    if (entry.chosenOption === option.text) {
                        btn.classList.add("selected");
                    }

                    if (index < storyHistory.length - 1) {
                        btn.onclick = () => {
                            showConfirmation(index, option.text, option.next);
                        };
                    } else {
                        btn.onclick = () => {
                            storyHistory = storyHistory.slice(0, index + 1);
                            storyHistory[index].chosenOption = option.text;
                            if (stepsData[option.next]) {
                                storyHistory.push({ stepId: option.next, chosenOption: null });
                            }
                            renderFlow();
                            scrollToCurrent();
                        };
                    }

                    optionsDiv.appendChild(btn);
                });
            } else if (step.defaultNext) {
                const btn = document.createElement("button");
                btn.className = "next-button";
                btn.textContent = "次へ";

                if (index < storyHistory.length - 1) {
                    btn.onclick = () => {
                        showConfirmation(index, "次へ", step.defaultNext);
                    };
                } else {
                    btn.onclick = () => {
                        storyHistory = storyHistory.slice(0, index + 1);
                        if (stepsData[step.defaultNext]) {
                            storyHistory.push({ stepId: step.defaultNext, chosenOption: null });
                        }
                        renderFlow();
                        scrollToCurrent();
                    };
                }

                optionsDiv.appendChild(btn);
            }

            section.appendChild(optionsDiv);
            container.appendChild(section);
        });

        scrollToCurrent();
    }

    // 初期化と各種イベントハンドラの設定
    function init() {
        // 最初のステップを設定
        storyHistory.push({ stepId: "1", chosenOption: null });
        renderFlow();

        // ページ上部へ戻るボタン
        document.getElementById("scroll-top-button").onclick = () => {
            window.scrollTo({ top: 0, behavior: "smooth" });
        };

        // トップページへ戻るボタン
        document.getElementById("top-page-button").onclick = () => {
            window.location.href = "index.html";
        };

        // ドロップダウンメニューの表示・非表示
        const headerMenu = document.querySelector(".header-menu");
        const dropdownMenu = document.getElementById("dropdown-menu");

        headerMenu.onclick = (e) => {
            e.stopPropagation();
            dropdownMenu.style.display =
                dropdownMenu.style.display === "block" ? "none" : "block";
        };

        // ドキュメント全体をクリックしたらドロップダウンを閉じる
        document.addEventListener("click", (e) => {
            if (dropdownMenu.style.display === "block") {
                dropdownMenu.style.display = "none";
            }
        });

        // ドロップダウンアイテムのクリックイベント
        const dropdownItems = document.querySelectorAll(".dropdown-item");
        dropdownItems.forEach((item) => {
            item.onclick = (e) => {
                const stepId = item.getAttribute("data-step");
                storyHistory = [];
                storyHistory.push({ stepId: stepId, chosenOption: null });
                renderFlow();
                dropdownMenu.style.display = "none";
            };
        });
    }

    // 初期化実行
    init();
});