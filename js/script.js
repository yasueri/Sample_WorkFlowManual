// ページ読み込み時の処理を開始
document.addEventListener('DOMContentLoaded', function() {
    // HTMLから埋め込まれたCSVデータを取得
    const csvData = window.csvData || "";
    
    // CSVの安全性を検証する関数
    function validateCsvSafety(csvText) {
        // 潜在的な危険パターンのチェック
        const dangerPatterns = [
            /<script/i,
            /javascript:/i,
            /data:text\/html/i,
            /function\(\)/i,
            /eval\(/i,
            /setTimeout\(/i,
            /setInterval\(/i
        ];
        
        // いずれかのパターンにマッチする場合は警告
        const foundPattern = dangerPatterns.find(pattern => pattern.test(csvText));
        if (foundPattern) {
            console.warn("CSVデータに潜在的な危険パターンが見つかりました。処理を続行する前に内容を確認してください。");
            return false;
        }
        
        return true;
    }

    // CSVパース関数（より厳密なバージョン）
    function parseCSV(csvText) {
        // 事前に安全性を検証
        if (!validateCsvSafety(csvText)) {
            // 安全でない場合は空の配列を返す
            console.error("CSVデータに危険なパターンが含まれているため、処理を中止します。");
            return [];
        }

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

    // 強化されたサニタイズ関数
    function enhancedSanitizeInput(input) {
        if (input === null || input === undefined) return "";
        
        // 文字列化
        input = String(input);
        
        // HTML特殊文字のエスケープ
        input = input
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
        
        // スクリプトインジェクション対策（強化版）
        input = input
            .replace(/javascript:/gi, '')
            .replace(/data:/gi, '')
            .replace(/vbscript:/gi, '')
            .replace(/expression:/gi, '')  // CSSインジェクション対策を追加
            .replace(/eval\(/gi, '')       // eval呼び出し対策を追加
            .replace(/prompt\(/gi, '')     // ブラウザプロンプト対策
            .replace(/alert\(/gi, '');     // アラート対策
        
        // イベントハンドラと危険な属性の徹底的な除去
        input = input.replace(/on\w+\s*=|\w+:\s*url\s*\(/gi, '');
        
        return input;
    }

    // 安全なHTML描画関数
    function renderSafeHtml(unsafeContent) {
        if (!unsafeContent) return "";
        
        // まずコンテンツをサニタイズ
        const sanitized = enhancedSanitizeInput(unsafeContent);
        
        // 改行のみを特別扱い
        const withLineBreaks = sanitized.replace(/\n/g, "<br>");
        
        // 限定的な置換のみを行う
        const withHighlights = withLineBreaks
            .replace(/要印刷/g, '<span class="csv-text-highlight">要印刷</span>')
            .replace(/画面/g, '<span class="csv-text-highlight">画面</span>');
        
        return withHighlights;
    }

    // CSVデータの処理
    let isDataValid = false;
    let csvRows = [];
    let headers = [];
    let data = [];

    try {
        // CSVデータの安全性を検証してからパース
        if (validateCsvSafety(csvData)) {
            csvRows = parseCSV(csvData);
            headers = csvRows[0] ? csvRows[0].map(h => h.trim()) : [];
            const rows = csvRows.slice(1);
            data = rows.map(row => {
                const obj = {};
                headers.forEach((header, index) => {
                    obj[header] = index < row.length ? row[index].trim() : "";
                });
                return obj;
            });
        } else {
            // 安全でない場合は処理を停止
            showValidationResults(
                ["CSVデータに潜在的に危険なコンテンツが含まれています。データを確認してください。"], 
                []
            );
            data = []; // 空のデータを設定
        }
    } catch (error) {
        console.error("CSVデータの処理中にエラーが発生しました:", error);
        data = []; // エラー時は空のデータを設定
        showValidationResults(
            ["CSVデータの処理中にエラーが発生しました: " + error.message], 
            []
        );
    }

    // StepIDの設定に問題がないかチェック
    function validateCsvData(data) {
        const errors = [];
        const warnings = [];
        
        // データが空の場合は検証エラー
        if (!data || data.length === 0) {
            errors.push("CSVデータが空または無効です");
            return { errors, warnings, isValid: false };
        }
        
        // 必須フィールドの存在確認
        const requiredFields = ["StepID", "タイトル"];
        const firstRow = data[0] || {};
        const availableFields = Object.keys(firstRow);
        
        requiredFields.forEach(field => {
            if (!availableFields.includes(field)) {
                errors.push(`必須フィールド "${field}" がCSVデータに存在しません`);
            }
        });
        
        // StepIDの一意性チェック
        const stepIds = {};
        data.forEach((row, index) => {
            if (!row.StepID) return; // 空行はスキップ
            
            if (stepIds[row.StepID]) {
                errors.push(`重複するStepID "${row.StepID}" が行 ${index + 2} で見つかりました`);
            } else {
                stepIds[row.StepID] = true;
            }
        });
        
        // すべてのステップIDを収集して、参照先の存在をチェックできるようにする
        const allStepIds = new Set(data.map(row => row.StepID).filter(id => id));
        
        data.forEach(row => {
            if (!row.StepID) return; // 空行はスキップ
            
            // 次ステップの参照が有効かチェック
            if (row.DefaultNext && !allStepIds.has(row.DefaultNext)) {
                warnings.push(`ステップ ${row.StepID}: 「次へ」ボタンが無効なステップ "${row.DefaultNext}" を指しています`);
            }
            
            // 選択肢の検証
            if (row.Option1Text && !row.Option1Next) {
                errors.push(`ステップ ${row.StepID}: 選択肢「${row.Option1Text}」の次のステップが指定されていません`);
            } else if (row.Option1Next && !allStepIds.has(row.Option1Next)) {
                warnings.push(`ステップ ${row.StepID}: 選択肢「${row.Option1Text}」が無効なステップ "${row.Option1Next}" を指しています`);
            }
            
            // 選択肢2の検証
            if (row.Option2Text && !row.Option2Next) {
                errors.push(`ステップ ${row.StepID}: 選択肢「${row.Option2Text}」の次のステップが指定されていません`);
            } else if (row.Option2Next && !allStepIds.has(row.Option2Next)) {
                warnings.push(`ステップ ${row.StepID}: 選択肢「${row.Option2Text}」が無効なステップ "${row.Option2Next}" を指しています`);
            }
            
            // 選択肢3の検証
            if (row.Option3Text && !row.Option3Next) {
                errors.push(`ステップ ${row.StepID}: 選択肢「${row.Option3Text}」の次のステップが指定されていません`);
            } else if (row.Option3Next && !allStepIds.has(row.Option3Next)) {
                warnings.push(`ステップ ${row.StepID}: 選択肢「${row.Option3Text}」が無効なステップ "${row.Option3Next}" を指しています`);
            }
        });
        
        // ユーザーフレンドリーなポップアップで通知
        showValidationResults(errors, warnings);
        
        return { 
            errors, 
            warnings, 
            isValid: errors.length === 0 
        };
    }
    
    // ポップアップ表示関数（StepIDの設定に問題があった時のために）
    function showValidationResults(errors, warnings) {
        // エラーや警告がなければ何もしない
        if (errors.length === 0 && warnings.length === 0) return;
        
        // ポップアップのHTML要素を作成
        const popupOverlay = document.createElement('div');
        popupOverlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 2000;
        `;
        
        const popupBox = document.createElement('div');
        popupBox.style.cssText = `
            background: #fff;
            width: 80%;
            max-width: 600px;
            max-height: 80vh;
            padding: 20px;
            border-radius: 5px;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
            display: flex;
            flex-direction: column;
            overflow: hidden;
        `;
        
        const title = document.createElement('h2');
        title.style.cssText = `
            margin: 0 0 15px 0;
            color: #d9534f;
            font-size: 1.5em;
        `;
        title.textContent = errors.length > 0 ? 'CSVデータにエラーがあります' : '警告';
        
        const messageArea = document.createElement('div');
        messageArea.style.cssText = `
            overflow-y: auto;
            margin-bottom: 15px;
            flex-grow: 1;
        `;
        
        // エラーの表示
        if (errors.length > 0) {
            const errorsList = document.createElement('div');
            const errorTitle = document.createElement('p');
            errorTitle.style.cssText = "color: #d9534f; font-weight: bold;";
            errorTitle.textContent = "次のエラーを修正してください:";
            errorsList.appendChild(errorTitle);
            
            const ul = document.createElement('ul');
            ul.style.cssText = "color: #d9534f; text-align: left; margin-bottom: 15px;";
            
            errors.forEach(err => {
                const li = document.createElement('li');
                li.textContent = err; // textContentを使用して安全に設定
                ul.appendChild(li);
            });
            
            errorsList.appendChild(ul);
            messageArea.appendChild(errorsList);
        }
        
        // 警告の表示
        if (warnings.length > 0) {
            const warningsList = document.createElement('div');
            const warningTitle = document.createElement('p');
            warningTitle.style.cssText = "color: #f0ad4e; font-weight: bold;";
            warningTitle.textContent = "注意事項:";
            warningsList.appendChild(warningTitle);
            
            const ul = document.createElement('ul');
            ul.style.cssText = "color: #f0ad4e; text-align: left;";
            
            warnings.forEach(warn => {
                const li = document.createElement('li');
                li.textContent = warn; // textContentを使用して安全に設定
                ul.appendChild(li);
            });
            
            warningsList.appendChild(ul);
            messageArea.appendChild(warningsList);
        }
        
        // 閉じるボタン
        const buttonContainer = document.createElement('div');
        buttonContainer.style.cssText = `
            display: flex;
            justify-content: center;
        `;
        
        const closeButton = document.createElement('button');
        closeButton.textContent = '閉じる';
        closeButton.style.cssText = `
            min-width: 100px;
            padding: 8px 16px;
            background-color: #6c757d;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 1em;
        `;
        closeButton.addEventListener('click', () => {
            document.body.removeChild(popupOverlay);
        });
        
        buttonContainer.appendChild(closeButton);
        
        // ポップアップの組み立て
        popupBox.appendChild(title);
        popupBox.appendChild(messageArea);
        popupBox.appendChild(buttonContainer);
        popupOverlay.appendChild(popupBox);
        
        // ポップアップを表示
        document.body.appendChild(popupOverlay);
        
        // コンソールにも記録
        if (errors.length > 0) {
            console.error("CSVデータにエラーがあります:", errors);
        }
        if (warnings.length > 0) {
            console.warn("CSVデータに警告があります:", warnings);
        }
    }

    // 実際に検証を実行
    const validationResult = validateCsvData(data);
    isDataValid = validationResult.isValid;

    // ステップデータの構造化（エラーがなければ処理を続行）
    const stepsData = {};
    if (isDataValid) {
        try {
            data.forEach(row => {
                if (!row.StepID) return; // 空行をスキップ
                
                const id = row.StepID;
                const title = row.タイトル;
                let desc = "";
                let nota = ""; // 補足説明１を格納する変数を追加
                
                if (row.説明１) desc += row.説明１;
                if (row.補足説明１) nota = row.補足説明１; // 補足説明１を取得
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
                // 3つ目の選択肢に対応（新規追加）
                if (row.Option3Text && row.Option3Next) {
                    options.push({
                        text: row.Option3Text,
                        next: row.Option3Next.replace(/to\s*/, "")
                    });
                }

                const defaultNext = row.DefaultNext || "";
                
                // NonAutoSelect フラグを取得 - 明示的に "1" または "true" の場合のみ自動選択を無効にする
                const nonAutoSelectValue = row.NonAutoSelect ? row.NonAutoSelect.trim() : "";
                const nonAutoSelect = nonAutoSelectValue === "1" || nonAutoSelectValue.toLowerCase() === "true";
                
                stepsData[id] = { 
                    id, 
                    title, 
                    desc, 
                    nota, // 補足説明１をステップデータに追加
                    options, 
                    defaultNext,
                    // 自動選択が有効かどうかのフラグ（NonAutoSelectが1または真の場合は無効）
                    nonAutoSelect: nonAutoSelect
                };
            });
        } catch (error) {
            console.error("ステップデータの構造化中にエラーが発生しました:", error);
            showValidationResults(
                ["ステップデータの処理中にエラーが発生しました: " + error.message], 
                []
            );
            isDataValid = false;
        }
    }

    // データが無効な場合、最低限の初期データを設定
    if (!isDataValid || Object.keys(stepsData).length === 0) {
        console.warn("エラーがあるためステップデータの構造化をスキップしました");
        stepsData["1"] = {
            id: "1",
            title: "エラー",
            desc: "CSVデータにエラーがあります。修正してからやり直してください。",
            nota: "",
            options: [],
            defaultNext: "",
            nonAutoSelect: false
        };
    }

    // フロー履歴の管理
    let storyHistory = [];
    // 選択肢と選択内容のマッピングを保存するオブジェクト
    let optionSelectionHistory = {};
    // シーケンス番号のカウンター
    let sequenceCounter = 0;

    // スタイリング適用関数の改善 - セキュリティ対策を強化
    function styleDesc(text) {
        return renderSafeHtml(text);
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

    // 選択肢テキストに基づく履歴キーを作成（StepIDは含めない）
    function createOptionsTextKey(options) {
        // 選択肢のテキストのみに基づいてキーを作成
        return options.map(opt => opt.text).sort().join('||');
    }

    // 履歴の初期化関数
    function clearHistoryAfterIndex(index) {
        // 指定されたインデックスまでの履歴を保持し、それ以降をクリア
        storyHistory = storyHistory.slice(0, index + 1);
        
        // シーケンスカウンターを更新
        // 現在の履歴の最後のシーケンスID+1にセット
        if (storyHistory.length > 0 && storyHistory[storyHistory.length - 1].sequenceId !== undefined) {
            sequenceCounter = storyHistory[storyHistory.length - 1].sequenceId + 1;
        } else {
            sequenceCounter = storyHistory.length; // フォールバック
        }
        
        // 自動選択履歴の初期化
        optionSelectionHistory = {};
        
        // 現在までの選択を新しい履歴に登録
        storyHistory.forEach((entry, idx) => {
            if (entry.chosenOption && stepsData[entry.stepId]) {
                const step = stepsData[entry.stepId];
                if (!step.nonAutoSelect && step.options.length > 0) {
                    const optionsTextKey = createOptionsTextKey(step.options);
                    optionSelectionHistory[optionsTextKey] = entry.chosenOption;
                }
            }
        });
    }

    // 確認ポップアップ表示
    function showConfirmation(index, optionText, targetStep) {
        const overlay = document.getElementById("popup-overlay");
        overlay.style.display = "flex";

        const yesBtn = document.getElementById("popup-yes");
        const noBtn = document.getElementById("popup-no");

        yesBtn.onclick = () => {
            // 修正: 先に選択を更新してから履歴を初期化
            // 理由: clearHistoryAfterIndex内で自動選択履歴が再構築される際に、
            // 最新の選択が反映されるようにするため
            storyHistory[index].chosenOption = optionText;
            
            // 履歴を初期化（インデックスまで保持、以降をクリア＆自動選択履歴を再構築）
            clearHistoryAfterIndex(index);
            
            // 次のステップを追加
            if (stepsData[targetStep]) {
                storyHistory.push({ 
                    stepId: targetStep, 
                    chosenOption: null,
                    sequenceId: sequenceCounter++
                });
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

    // フローのレンダリング - セキュリティ対策強化
    function renderFlow() {
        const container = document.getElementById("story-container");
        
        // 安全にコンテナをクリア
        while (container.firstChild) {
            container.removeChild(container.firstChild);
        }

        try {
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
                    titleDiv.innerHTML = styleDesc(step.title);
                    section.appendChild(titleDiv);
                }

                const descDiv = document.createElement("div");
                descDiv.className = "story-desc";
                
                // 説明１と補足説明１を組み合わせて表示
                descDiv.innerHTML = styleDesc(step.desc);
                section.appendChild(descDiv);
                
                // 補足説明があれば、別の要素として追加
                if (step.nota) {
                    const notaDiv = document.createElement("div");
                    notaDiv.className = "story-nota";
                    notaDiv.innerHTML = styleDesc(step.nota);
                    section.appendChild(notaDiv);
                }

                // 自動選択メッセージの表示
                if (entry.autoSelected) {
                    const autoSelectMessage = document.createElement("div");
                    autoSelectMessage.innerHTML = '<p style="color:#007acc;font-weight:bold;margin:10px 0;">※前回と同じ選択肢が自動選択されました</p>';
                    section.appendChild(autoSelectMessage);
                }

                const optionsDiv = document.createElement("div");
                optionsDiv.className = "option-container";

                // 最後のステップで、かつ選択肢がある場合の処理
                if (index === storyHistory.length - 1 && step.options.length > 0) {
                    // 自動選択が有効な場合のみ処理（nonAutoSelectが無効の場合）
                    if (!step.nonAutoSelect) {
                        // 選択肢のテキストのみに基づいてキーを作成
                        const optionsTextKey = createOptionsTextKey(step.options);
                        
                        // この選択肢のテキスト組み合わせが過去にあり、かつまだ選択が行われていない場合
                        if (optionSelectionHistory[optionsTextKey] && !entry.chosenOption) {
                            // 過去の選択を取得
                            const pastChoice = optionSelectionHistory[optionsTextKey];
                            
                            // 対応する選択肢とターゲットステップを検索
                            const matchedOption = step.options.find(option => option.text === pastChoice);
                            
                            if (matchedOption) {
                                // 自動選択のメッセージを表示
                                const autoSelectMessage = document.createElement("div");
                                autoSelectMessage.innerHTML = '<p style="color:#007acc;font-weight:bold;margin:10px 0;">※前回と同じ選択肢が自動選択されました</p>';
                                section.appendChild(autoSelectMessage);
                                
                                // 自動的に選択を適用
                                entry.chosenOption = pastChoice;
                                entry.autoSelected = true;
                                
                                // 次のステップに進む（遅延を設定して画面表示後に実行）
                                setTimeout(() => {
                                    if (stepsData[matchedOption.next]) {
                                        storyHistory.push({ 
                                            stepId: matchedOption.next, 
                                            chosenOption: null,
                                            sequenceId: sequenceCounter++
                                        });
                                        renderFlow();
                                        scrollToCurrent();
                                    }
                                }, 1500); // 1.5秒後に次に進む
                            }
                        }
                    }
                }

                if (step.options.length > 0) {
                    step.options.forEach(option => {
                        const btn = document.createElement("button");
                        btn.className = "option-button";
                        // 選択肢テキストもsanitizeInputを使用してサニタイズ
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
                                // 現在のステップで選択を更新
                                storyHistory[index].chosenOption = option.text;
                                
                                // 選択肢のテキストベースで履歴を記録（nonAutoSelectが無効=自動選択が有効な場合のみ）
                                if (!step.nonAutoSelect) {
                                    const optionsTextKey = createOptionsTextKey(step.options);
                                    optionSelectionHistory[optionsTextKey] = option.text;
                                }
                                
                                // 次のステップへ進む
                                if (stepsData[option.next]) {
                                    storyHistory.push({ 
                                        stepId: option.next, 
                                        chosenOption: null,
                                        sequenceId: sequenceCounter++
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
                            // 現在のステップで選択を更新
                            storyHistory[index].chosenOption = "次へ";
                            
                            // 次のステップへ進む
                            if (stepsData[step.defaultNext]) {
                                storyHistory.push({ 
                                    stepId: step.defaultNext, 
                                    chosenOption: null,
                                    sequenceId: sequenceCounter++
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
        } catch (error) {
            console.error("レンダリング中にエラーが発生しました:", error);
            showValidationResults(
                ["画面表示中にエラーが発生しました: " + error.message], 
                []
            );
        }
    }

    // 初期化と各種イベントハンドラの設定
    function init() {
        try {
            // 最初のステップを設定（シーケンス番号を追加）
            sequenceCounter = 0;
            storyHistory.push({ 
                stepId: "1", 
                chosenOption: null,
                sequenceId: sequenceCounter++
            });
            renderFlow();

            // 安全なイベントハンドラ設定
            function setEventHandler(elementId, eventType, handler) {
                const element = document.getElementById(elementId);
                if (element) {
                    element.addEventListener(eventType, handler);
                } else {
                    console.warn(`Element with ID "${elementId}" not found for event binding`);
                }
            }

            // ページ上部へ戻るボタン
            setEventHandler("scroll-top-button", "click", () => {
                window.scrollTo({ top: 0, behavior: "smooth" });
            });

            // トップページへ戻るボタン
            setEventHandler("top-page-button", "click", () => {
                window.location.href = "../index.html";
            });

            // 警告ポップアップの閉じるボタン
            setEventHandler("warning-popup-ok", "click", hideWarningPopup);

            // ドロップダウンメニューの表示・非表示
            const headerMenu = document.querySelector(".header-menu");
            const dropdownMenu = document.getElementById("dropdown-menu");

            if (headerMenu && dropdownMenu) {
                headerMenu.addEventListener("click", (e) => {
                    e.stopPropagation();
                    dropdownMenu.style.display =
                        dropdownMenu.style.display === "block" ? "none" : "block";
                });

                // ドロップダウンメニュー自体のクリックイベントを阻止
                dropdownMenu.addEventListener("click", (e) => {
                    e.stopPropagation();
                });

                // ドキュメント全体をクリックしたらドロップダウンを閉じる
                document.addEventListener("click", (e) => {
                    if (dropdownMenu.style.display === "block" && 
                        !dropdownMenu.contains(e.target) && 
                        !headerMenu.contains(e.target)) {
                        dropdownMenu.style.display = "none";
                    }
                });
            }

            // ドロップダウンアイテムのクリックイベント
            const dropdownItems = document.querySelectorAll(".dropdown-item:not(.has-submenu)");
            dropdownItems.forEach((item) => {
                item.addEventListener("click", (e) => {
                    e.stopPropagation(); // イベント伝播を防止
                    
                    // データ属性から安全にステップIDを取得
                    const stepId = item.getAttribute("data-step");
                    
                    // 有効なステップIDのみを受け入れる厳格な検証
                    if (stepId && /^[a-zA-Z0-9_-]+$/.test(stepId) && stepsData[stepId]) {
                        // 履歴を完全にクリアして新しく開始
                        storyHistory = [];
                        optionSelectionHistory = {}; // 自動選択履歴もクリア
                        sequenceCounter = 0; // シーケンスカウンターもリセット
                        storyHistory.push({ 
                            stepId: stepId, 
                            chosenOption: null,
                            sequenceId: sequenceCounter++
                        });
                        renderFlow();
                    } else {
                        console.warn(`Invalid or non-existent stepId: ${stepId}`);
                    }
                });
            });

            // サブメニューアイテムのクリックイベント
            const submenuItems = document.querySelectorAll(".submenu-item");
            submenuItems.forEach((item) => {
                item.addEventListener("click", (e) => {
                    e.stopPropagation(); // 親要素へのイベント伝播を防止
                    
                    // データ属性から安全にステップIDを取得
                    const stepId = item.getAttribute("data-step");
                    
                    // 有効なステップIDのみを受け入れる検証
                    if (stepId && /^[a-zA-Z0-9_-]+$/.test(stepId) && stepsData[stepId]) {
                        // 履歴を完全にクリアして新しく開始
                        storyHistory = [];
                        optionSelectionHistory = {}; // 自動選択履歴もクリア
                        sequenceCounter = 0; // シーケンスカウンターもリセット
                        storyHistory.push({ 
                            stepId: stepId, 
                            chosenOption: null,
                            sequenceId: sequenceCounter++
                        });
                        renderFlow();
                    } else {
                        console.warn(`Invalid or non-existent stepId: ${stepId}`);
                    }
                });
            });

            // サブメニューを持つドロップダウンアイテムのクリックイベント
            const hasSubmenuItems = document.querySelectorAll(".dropdown-item.has-submenu");
            hasSubmenuItems.forEach((item) => {
                // クリックイベントを防止（そのままでは親メニュークリックで閉じてしまうため）
                item.addEventListener("click", (e) => {
                    e.stopPropagation();
                });
            });
        } catch (error) {
            console.error("初期化処理中にエラーが発生しました:", error);
            showValidationResults(
                ["アプリケーションの初期化中にエラーが発生しました: " + error.message], 
                []
            );
        }
    }

    // 初期化実行
    init();
});
