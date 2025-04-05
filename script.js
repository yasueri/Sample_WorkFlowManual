// ページ読み込み時の処理を開始
document.addEventListener('DOMContentLoaded', function() {
    // HTMLから埋め込まれたCSVデータを取得
    const csvData = window.csvData || "";
    
    // CSVパース関数（より厳密なバージョン）
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
            obj[header] = index < row.length ? row[index].trim() : "";
        });
        return obj;
    });

    // ステップデータの構造化
    const stepsData = {};
    data.forEach(row => {
        if (!row.StepID) return; // 空行をスキップ
        
        const id = row.StepID;
        const title = row.タイトル;
        let desc = "";
        if (row.説明１) desc += row.説明１;
        if (row.説明２) desc += "\n" + row.説明２;
        if (row.説明３) desc += "\n" + row.説明３;

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
        
        // NonAutoSelect フラグを取得 - 明示的に "1" または "true" の場合のみ自動選択を無効にする
        // ここを修正：文字列として比較するようにし、厳密な比較演算子を避ける
        const nonAutoSelectValue = row.NonAutoSelect ? row.NonAutoSelect.trim() : "";
        const nonAutoSelect = nonAutoSelectValue === "1" || nonAutoSelectValue.toLowerCase() === "true";
        
        // デバッグ出力 - CSVの値を表示
        console.log(`StepID: ${id}, NonAutoSelect値: "${nonAutoSelectValue}", 解釈結果: ${nonAutoSelect}`);
        
        stepsData[id] = { 
            id, 
            title, 
            desc, 
            options, 
            defaultNext,
            // 自動選択無効フラグの反転（非自動選択が有効=自動選択が無効）
            autoSelectEnabled: !nonAutoSelect,
            nonAutoSelect: nonAutoSelectValue // デバッグ用に元の値も保存
        };
        
        // デバッグ用にフラグの状態を出力
        console.log(`StepID: ${id}, nonAutoSelect: ${nonAutoSelect}, autoSelectEnabled: ${!nonAutoSelect}`);
    });

    // フロー履歴の管理
    let storyHistory = [];
    // 選択肢のテキストベースの履歴を保存するオブジェクト
    let optionTextHistory = {};

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

    // 警告ポップアップ表示
    function showWarningPopup() {
        const overlay = document.getElementById("warning-popup-overlay");
        overlay.style.display = "flex";
        
        const okBtn = document.getElementById("warning-popup-ok");
        okBtn.onclick = hideWarningPopup;
    }

    // 警告ポップアップを非表示
    function hideWarningPopup() {
        const overlay = document.getElementById("warning-popup-overlay");
        overlay.style.display = "none";
    }

    // 選択肢テキストに基づく履歴キーを作成（StepIDは含めない）
    function createOptionsTextKey(options) {
        // 選択肢のテキストのみに基づいてキーを作成
        return options.map(opt => opt.text).sort().join('||');
    }

    // フローのレンダリング
    function renderFlow() {
        const container = document.getElementById("story-container");
        container.innerHTML = "";

        storyHistory.forEach((entry, index) => {
            const step = stepsData[entry.stepId];
            if (!step) {
                console.error(`StepID ${entry.stepId} not found in stepsData`);
                return;
            }
            
            const section = document.createElement("div");
            section.classList.add("story-section");
            section.classList.add(
                index === storyHistory.length - 1 ? "current" : "past"
            );

            if (step.title) {
                const titleDiv = document.createElement("div");
                titleDiv.className = "story-title";
                titleDiv.textContent = step.title;
                section.appendChild(titleDiv);
            }

            const descDiv = document.createElement("div");
            descDiv.className = "story-desc";
            descDiv.innerHTML = styleDesc(step.desc);
            section.appendChild(descDiv);

            // 自動選択メッセージの表示
            if (entry.autoSelected) {
                const autoSelectMessage = document.createElement("div");
                autoSelectMessage.innerHTML = `<p style="color:#007acc;font-weight:bold;margin:10px 0;">
                    ※前回と同じ選択肢が自動選択されました</p>`;
                section.appendChild(autoSelectMessage);
            }

            const optionsDiv = document.createElement("div");
            optionsDiv.className = "option-container";

            // 最後のステップで、かつ選択肢がある場合の処理
            if (index === storyHistory.length - 1 && step.options.length > 0) {
                // デバッグ出力
                console.log(`現在のステップ: ${step.id}, 自動選択有効: ${step.autoSelectEnabled}, NonAutoSelect原値: "${step.nonAutoSelect}"`);
                
                // 自動選択が有効な場合のみ処理
                if (step.autoSelectEnabled) {
                    // 選択肢のテキストのみに基づいてキーを作成
                    const optionsTextKey = createOptionsTextKey(step.options);
                    
                    // デバッグ出力
                    console.log(`選択肢テキストキー: ${optionsTextKey}`);
                    console.log(`過去の選択: ${optionTextHistory[optionsTextKey]}`);
                    
                    // この選択肢のテキスト組み合わせが過去にあり、かつまだ選択が行われていない場合
                    if (optionTextHistory[optionsTextKey] && !entry.chosenOption) {
                        // 過去の選択を取得
                        const pastChoice = optionTextHistory[optionsTextKey];
                        
                        // 対応する選択肢とターゲットステップを検索
                        const matchedOption = step.options.find(option => option.text === pastChoice);
                        
                        if (matchedOption) {
                            // 自動選択のメッセージを表示
                            const autoSelectMessage = document.createElement("div");
                            autoSelectMessage.innerHTML = `<p style="color:#007acc;font-weight:bold;margin:10px 0;">
                                ※前回と同じ選択肢が自動選択されました</p>`;
                            section.appendChild(autoSelectMessage);
                            
                            // 自動的に選択を適用
                            entry.chosenOption = pastChoice;
                            entry.autoSelected = true;
                            
                            // 次のステップに進む（遅延を設定して画面表示後に実行）
                            setTimeout(() => {
                                if (stepsData[matchedOption.next]) {
                                    storyHistory.push({ 
                                        stepId: matchedOption.next, 
                                        chosenOption: null
                                    });
                                    renderFlow();
                                    scrollToCurrent();
                                }
                            }, 1500); // 1.5秒後に次に進む
                        }
                    }
                } else {
                    console.log(`ステップ ${step.id} は自動選択が無効です`);
                }
            }

            if (step.options.length > 0) {
                step.options.forEach(option => {
                    const btn = document.createElement("button");
                    btn.className = "option-button";
                    btn.innerHTML = styleDesc(option.text);

                    if (entry.chosenOption === option.text) {
                        btn.classList.add("selected");
                    }

                    // 自動選択されたステップの場合のみ変更不可に
                    if (entry.autoSelected) {
                        // 選択肢が選択済みの場合、クリックすると警告を表示
                        btn.onclick = () => {
                            showWarningPopup();
                        };
                        // 視覚的に変更不可であることを示す
                        btn.style.opacity = "0.7";
                        btn.style.cursor = "not-allowed";
                    } else if (index < storyHistory.length - 1) {
                        btn.onclick = () => {
                            showConfirmation(index, option.text, option.next);
                        };
                    } else {
                        btn.onclick = () => {
                            storyHistory = storyHistory.slice(0, index + 1);
                            storyHistory[index].chosenOption = option.text;
                            
                            // 選択肢のテキストベースで履歴を記録（自動選択が有効な場合のみ）
                            if (step.autoSelectEnabled) {
                                const optionsTextKey = createOptionsTextKey(step.options);
                                optionTextHistory[optionsTextKey] = option.text;
                                console.log(`テキスト履歴を記録: ${optionsTextKey} = ${option.text}`);
                            } else {
                                console.log(`自動選択が無効なため履歴を記録しません: ${step.id}`);
                            }
                            
                            if (stepsData[option.next]) {
                                storyHistory.push({ 
                                    stepId: option.next, 
                                    chosenOption: null
                                });
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

                // 自動選択されたステップの場合のみ変更不可に
                if (entry.autoSelected) {
                    btn.onclick = () => {
                        showWarningPopup();
                    };
                    btn.style.opacity = "0.7";
                    btn.style.cursor = "not-allowed";
                } else if (index < storyHistory.length - 1) {
                    btn.onclick = () => {
                        showConfirmation(index, "次へ", step.defaultNext);
                    };
                } else {
                    btn.onclick = () => {
                        storyHistory = storyHistory.slice(0, index + 1);
                        if (stepsData[step.defaultNext]) {
                            storyHistory.push({ 
                                stepId: step.defaultNext, 
                                chosenOption: null
                            });
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

        // 警告ポップアップの閉じるボタン
        document.getElementById("warning-popup-ok").onclick = hideWarningPopup;

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
