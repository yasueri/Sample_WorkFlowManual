/**
 * テンキー操作を管理するためのモジュール
 * 業務フローナビゲーションシステム用
 */
class KeyboardManager {
    constructor() {
        // キーボードイベントリスナーの設定
        document.addEventListener('keydown', this.handleKeyPress.bind(this));
        
        // フォーカス状態の管理
        this.currentFocus = {
            type: 'story', // 'story', 'dropdown', 'submenu', 'popup'
            index: 0,      // フォーカス位置のインデックス
            parentIndex: -1, // サブメニューの場合の親メニューインデックス
            submenuName: '',  // 現在開いているサブメニュー名
        };
        
        // ポップアップのフォーカス状態 (0: なし, 1: はい, 2: いいえ)
        this.popupFocusButton = 0;
        
        // 初期状態ではドロップダウンメニューは非表示
        this.isDropdownVisible = false;
        
        // フォーカス表示用のスタイルを追加
        this.addFocusStyles();
        
        // DOMが準備できたらポップアップの監視を開始
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                this.setupPopupObservers();
            });
        } else {
            this.setupPopupObservers();
        }
    }

    /**
     * ポップアップの表示状態を監視するためのオブザーバーを設定
     */
    setupPopupObservers() {
        console.log('Setting up popup observers...');
        
        // 通常ポップアップの表示監視
        const popupOverlay = document.getElementById('popup-overlay');
        if (popupOverlay) {
            const popupObserver = new MutationObserver((mutations) => {
                mutations.forEach((mutation) => {
                    if (mutation.type === 'attributes' && 
                        mutation.attributeName === 'style') {
                        
                        // ポップアップの表示状態をコンソールに出力
                        console.log('Popup style changed:', popupOverlay.style.display);
                        
                        if (popupOverlay.style.display === 'flex') {
                            // ポップアップが表示された時
                            console.log('Popup is now visible');
                            this.currentFocus.type = 'popup';
                            
                            // 少し遅延させてフォーカスを設定
                            setTimeout(() => {
                                // 初期状態ではフォーカスなし
                                this.resetPopupFocus();
                                
                                // 左矢印キーイベントを発火して「はい」ボタンにフォーカス（自動フォーカス設定）
                                this.setPopupFocus(1);
                            }, 100);
                            
                        } else if (popupOverlay.style.display === 'none') {
                            // ポップアップが閉じられた時
                            console.log('Popup is now hidden');
                            this.currentFocus.type = 'story';
                            this.updateFocus();
                        }
                    }
                });
            });
            
            // オブザーバーを開始
            popupObserver.observe(popupOverlay, { attributes: true });
            console.log('Popup observer started');
        } else {
            console.warn('Popup overlay element not found');
        }
        
        // 警告ポップアップの表示監視
        const warningPopup = document.getElementById('warning-popup-overlay');
        if (warningPopup) {
            const warningObserver = new MutationObserver((mutations) => {
                mutations.forEach((mutation) => {
                    if (mutation.type === 'attributes' && 
                        mutation.attributeName === 'style') {
                        
                        if (warningPopup.style.display === 'flex') {
                            // 警告ポップアップが表示された時
                            console.log('Warning popup is now visible');
                            this.currentFocus.type = 'warning';
                            const okButton = document.getElementById('warning-popup-ok');
                            if (okButton) {
                                okButton.classList.add('keyboard-focus');
                            }
                        } else if (warningPopup.style.display === 'none' || warningPopup.style.display === '') {
                            // 警告ポップアップが閉じられた時
                            console.log('Warning popup is now hidden');
                            // フォーカスをストーリーに戻す
                            this.currentFocus.type = 'story';
                            // フォーカスを更新
                            this.updateFocus();
                        }
                    }
                });
            });
            
            // オブザーバーを開始
            warningObserver.observe(warningPopup, { attributes: true });
            console.log('Warning popup observer started');
        }
    }
    
    /**
     * ポップアップのフォーカスをリセット（フォーカスなしの状態に）
     */
    resetPopupFocus() {
        const yesButton = document.getElementById('popup-yes');
        const noButton = document.getElementById('popup-no');
        
        if (yesButton) yesButton.classList.remove('keyboard-focus');
        if (noButton) noButton.classList.remove('keyboard-focus');
        
        this.popupFocusButton = 0;
    }
    
    /**
     * ポップアップの特定のボタンにフォーカスを設定
     * @param {number} buttonIndex 1:はい, 2:いいえ
     */
    setPopupFocus(buttonIndex) {
        const yesButton = document.getElementById('popup-yes');
        const noButton = document.getElementById('popup-no');
        
        console.log(`Setting popup focus to button ${buttonIndex}`);
        
        // すべてのフォーカスをクリア
        if (yesButton) yesButton.classList.remove('keyboard-focus');
        if (noButton) noButton.classList.remove('keyboard-focus');
        
        if (buttonIndex === 1 && yesButton) {
            yesButton.classList.add('keyboard-focus');
            this.popupFocusButton = 1;
            console.log('Focus set to YES button');
        } else if (buttonIndex === 2 && noButton) {
            noButton.classList.add('keyboard-focus');
            this.popupFocusButton = 2;
            console.log('Focus set to NO button');
        } else {
            this.popupFocusButton = 0;
            console.log('Popup focus reset (no focus)');
        }
    }
    
    /**
     * キーボードイベントのハンドラー
     * @param {KeyboardEvent} event キーボードイベント
     */
    handleKeyPress(event) {
        // テンキーのキーコードを取得
        const key = event.key;
        
        console.log(`Key pressed: ${key}, Current focus type: ${this.currentFocus.type}`);
        
        // 現在表示されているポップアップを確認
        const popupOverlay = document.getElementById('popup-overlay');
        const warningPopup = document.getElementById('warning-popup-overlay');
        const isPopupVisible = popupOverlay && popupOverlay.style.display === 'flex';
        const isWarningVisible = warningPopup && warningPopup.style.display === 'flex';
        
        // ポップアップ表示状態と内部状態が一致しない場合は修正
        if (isPopupVisible && this.currentFocus.type !== 'popup') {
            console.log('Correcting focus type to popup');
            this.currentFocus.type = 'popup';
        } else if (isWarningVisible && this.currentFocus.type !== 'warning') {
            console.log('Correcting focus type to warning');
            this.currentFocus.type = 'warning';
        }
        
        // ポップアップ表示中の処理
        if (this.currentFocus.type === 'popup' || isPopupVisible) {
            this.handlePopupKeyPress(key, event);
            return;
        }
        
        // 警告ポップアップ表示中の処理
        if (this.currentFocus.type === 'warning' || isWarningVisible) {
            if (key === 'Enter' || key === 'Escape' || key === '1' || key === '2' || key === '3') {
                // 了解ボタンクリック
                const okButton = document.getElementById('warning-popup-ok');
                if (okButton) {
                    okButton.click();
                    // フォーカスタイプをストーリーに戻す
                    this.currentFocus.type = 'story';
                    // 少し遅延させてからフォーカスを更新
                    setTimeout(() => {
                        this.updateFocus();
                    }, 100);
                    event.preventDefault();
                }
                return;
            }
            return;
        }
        
        // フォーカスタイプに応じた処理
        switch(this.currentFocus.type) {
            case 'story':
                this.handleStoryKeyPress(key);
                break;
            case 'dropdown':
                this.handleDropdownKeyPress(key);
                break;
            case 'submenu':
                this.handleSubmenuKeyPress(key);
                break;
        }
    }
    
    /**
     * ポップアップ表示中のキー操作処理
     * @param {string} key 押されたキー
     * @param {KeyboardEvent} event キーボードイベント
     */
    handlePopupKeyPress(key, event) {
        const popupYes = document.getElementById('popup-yes');
        const popupNo = document.getElementById('popup-no');
        
        console.log(`Handling popup key: ${key}, current focus: ${this.popupFocusButton}`);
        
        switch(key) {
            case 'ArrowLeft':
            case '4':  // テンキー4（左）を追加
                // 左矢印キー - 「はい」ボタンにフォーカス
                this.setPopupFocus(1);
                event.preventDefault();
                break;
            case 'ArrowRight':
            case '6':  // テンキー6（右）を追加
                // 右矢印キー - 「いいえ」ボタンにフォーカス
                this.setPopupFocus(2);
                event.preventDefault();
                break;
            case '1':
            case 'y':
                // 1キーまたはy - 「はい」ボタンにフォーカスして選択
                this.setPopupFocus(1);
                setTimeout(() => {
                    if (popupYes) popupYes.click();
                }, 100);
                event.preventDefault();
                break;
            case '3':
            case 'n':
            case 'Escape':
                // 3キー、n、Escキー - 「いいえ」ボタンにフォーカスして選択
                this.setPopupFocus(2);
                setTimeout(() => {
                    if (popupNo) popupNo.click();
                }, 100);
                event.preventDefault();
                break;
            case 'Enter':
            case ' ':
                // Enterキーまたはスペース - フォーカスがある場合のみ選択
                console.log(`Enter pressed with focus: ${this.popupFocusButton}`);
                if (this.popupFocusButton === 1 && popupYes) {
                    popupYes.click();
                    event.preventDefault();
                } else if (this.popupFocusButton === 2 && popupNo) {
                    popupNo.click();
                    event.preventDefault();
                }
                break;
        }
    }
    
    /**
     * ストーリーエリアでのキー操作処理
     * @param {string} key 押されたキー
     */
    handleStoryKeyPress(key) {
        switch(key) {
            case '7':
                // ドロップダウンメニューを表示
                this.openDropdownMenu();
                break;
            case '*':
                // ページ上部へ戻るボタンをクリック
                document.getElementById('scroll-top-button').click();
                break;
            case '-':
                // トップページへ戻るボタンをクリック
                document.getElementById('top-page-button').click();
                break;
            case '8':
                // 上カーソル - 前のオプションまたはセクションにフォーカス
                this.moveFocusInStory('up');
                break;
            case '5':
                // 下カーソル - 次のオプションまたはセクションにフォーカス
                this.moveFocusInStory('down');
                break;
            case '4':
                // 左カーソル - 左のオプションにフォーカス
                this.moveFocusInStory('left');
                break;
            case '6':
                // 右カーソル - 右のオプションにフォーカス
                this.moveFocusInStory('right');
                break;
            case '1':
                // オプション1を選択
                this.selectOptionByNumber(1);
                break;
            case '2':
                // オプション2または次へボタンを選択
                this.selectOptionByNumber(2);
                break;
            case '3':
                // オプション3または2を選択
                this.selectOptionByNumber(3);
                break;
            case 'Enter':
            case ' ':
                // フォーカスがあるボタンを選択
                this.selectFocusedButton();
                break;
        }
    }
    
    /**
     * ドロップダウンメニューでのキー操作処理
     * @param {string} key 押されたキー
     */
    handleDropdownKeyPress(key) {
        const dropdownItems = document.querySelectorAll('.dropdown-item');
        
        switch(key) {
            case '7':
                // ドロップダウンメニューを閉じる
                this.closeDropdownMenu();
                break;
            case '8':
                // 上カーソル - 前のアイテムにフォーカス
                if (this.currentFocus.index > 0) {
                    this.currentFocus.index--;
                    this.updateFocus();
                    
                    // サブメニューを持つアイテムの場合、自動展開
                    const currentItem = dropdownItems[this.currentFocus.index];
                    if (currentItem.classList.contains('has-submenu')) {
                        this.showSubmenuOnly(currentItem);
                    } else {
                        // 他のサブメニューを閉じる
                        this.closeAllSubmenus();
                    }
                }
                break;
            case '5':
                // 下カーソル - 次のアイテムにフォーカス
                if (this.currentFocus.index < dropdownItems.length - 1) {
                    this.currentFocus.index++;
                    this.updateFocus();
                    
                    // サブメニューを持つアイテムの場合、自動展開
                    const currentItem = dropdownItems[this.currentFocus.index];
                    if (currentItem.classList.contains('has-submenu')) {
                        this.showSubmenuOnly(currentItem);
                    } else {
                        // 他のサブメニューを閉じる
                        this.closeAllSubmenus();
                    }
                }
                break;
            case '6':
                // 右カーソル - サブメニューがあれば展開してフォーカス
                const currentItem = dropdownItems[this.currentFocus.index];
                if (currentItem.classList.contains('has-submenu')) {
                    this.openSubmenu(currentItem);
                }
                break;
            case 'Enter':
            case ' ':
                // 現在フォーカスのアイテムを選択
                dropdownItems[this.currentFocus.index].click();
                break;
        }
    }
    
    /**
     * すべてのサブメニューを閉じる
     */
    closeAllSubmenus() {
        document.querySelectorAll('.submenu').forEach(submenu => {
            submenu.style.display = '';
        });
    }
    
    /**
     * 指定されたドロップダウンアイテムのサブメニューのみ表示
     * @param {HTMLElement} parentItem 親メニューアイテム
     */
    showSubmenuOnly(parentItem) {
        // 一旦すべてのサブメニューを閉じる
        this.closeAllSubmenus();
        
        // 指定されたアイテムのサブメニューを表示
        const submenu = parentItem.querySelector('.submenu');
        if (submenu) {
            submenu.style.display = 'block';
        }
    }
    
    /**
     * サブメニューでのキー操作処理
     * @param {string} key 押されたキー
     */
    handleSubmenuKeyPress(key) {
        // 現在のサブメニューアイテムを取得
        const submenuItems = document.querySelectorAll(`.dropdown-item:nth-child(${this.currentFocus.parentIndex + 1}) .submenu-item`);
        
        switch(key) {
            case '7':
                // サブメニューを閉じてドロップダウンに戻る
                this.closeSubmenu();
                break;
            case '8':
                // 上カーソル - 前のアイテムにフォーカス
                if (this.currentFocus.index > 0) {
                    this.currentFocus.index--;
                    this.updateFocus();
                }
                break;
            case '5':
                // 下カーソル - 次のアイテムにフォーカス
                if (this.currentFocus.index < submenuItems.length - 1) {
                    this.currentFocus.index++;
                    this.updateFocus();
                }
                break;
            case '4':
                // 左カーソル - サブメニューを閉じてドロップダウンに戻る
                this.closeSubmenu();
                break;
            case 'Enter':
            case ' ':
                // 現在フォーカスのアイテムを選択
                if (submenuItems.length > 0 && this.currentFocus.index < submenuItems.length) {
                    submenuItems[this.currentFocus.index].click();
                }
                break;
        }
    }
    
    /**
     * ストーリーエリア内でのフォーカス移動
     * @param {string} direction 移動方向 ('up', 'down', 'left', 'right')
     */
    moveFocusInStory(direction) {
        if (direction === 'up' || direction === 'down') {
            // 上下キーの場合は異なるセクション間を移動
            this.moveBetweenSections(direction);
            return;
        }
        
        // 現在のステップのオプションボタンまたは次へボタンを取得
        const currentSection = document.querySelector('.story-section.current');
        if (!currentSection) return;
        
        // すべてのボタンを取得
        const buttons = currentSection.querySelectorAll('.option-button, .next-button');
        if (!buttons.length) return;
        
        // 現在フォーカスのあるボタンを探す
        let focusedIndex = -1;
        for (let i = 0; i < buttons.length; i++) {
            if (buttons[i].classList.contains('keyboard-focus')) {
                focusedIndex = i;
                break;
            }
        }
        
        // フォーカスがなければ最初のボタンにフォーカス
        if (focusedIndex === -1) {
            buttons[0].classList.add('keyboard-focus');
            return;
        }
        
        // 方向に応じてインデックスを更新
        let newIndex = focusedIndex;
        switch(direction) {
            case 'left':
                // 左に移動
                newIndex = Math.max(0, focusedIndex - 1);
                break;
            case 'right':
                // 右に移動
                newIndex = Math.min(buttons.length - 1, focusedIndex + 1);
                break;
        }
        
        // インデックスが変わった場合のみフォーカスを移動
        if (newIndex !== focusedIndex) {
            // まず現在のセクション内の全ボタンからフォーカスをクリア
            buttons.forEach(btn => {
                btn.classList.remove('keyboard-focus');
            });
            
            // 新しいフォーカス位置にスタイルを適用
            buttons[newIndex].classList.add('keyboard-focus');
            buttons[newIndex].scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }

    /**
     * セクション間のフォーカス移動
     * @param {string} direction 移動方向 ('up', 'down')
     */
    moveBetweenSections(direction) {
        // すべてのセクションを取得
        const sections = document.querySelectorAll('.story-section');
        if (!sections.length) return;
        
        // 現在フォーカスのあるセクションを特定
        let currentSectionIndex = -1;
        let currentButtonIndex = -1;
        
        // 現在フォーカスがある要素を探す
        const focusedElement = document.querySelector('.keyboard-focus');
        if (focusedElement) {
            // フォーカス要素が属するセクションを特定
            const parentSection = focusedElement.closest('.story-section');
            if (parentSection) {
                for (let i = 0; i < sections.length; i++) {
                    if (sections[i] === parentSection) {
                        currentSectionIndex = i;
                        break;
                    }
                }
                
                // このセクション内でのボタンのインデックスを特定
                const buttons = parentSection.querySelectorAll('.option-button, .next-button');
                for (let i = 0; i < buttons.length; i++) {
                    if (buttons[i] === focusedElement) {
                        currentButtonIndex = i;
                        break;
                    }
                }
            }
        }
        
        // フォーカスがなければ、現在のセクションを使用
        if (currentSectionIndex === -1) {
            for (let i = 0; i < sections.length; i++) {
                if (sections[i].classList.contains('current')) {
                    currentSectionIndex = i;
                    break;
                }
            }
        }
        
        if (currentSectionIndex === -1) return;
        
        // すべてのフォーカスをクリア
        document.querySelectorAll('.keyboard-focus').forEach(el => {
            el.classList.remove('keyboard-focus');
        });
        
        // 方向に応じて移動先のセクションを決定
        let targetIndex = currentSectionIndex;
        if (direction === 'up') {
            targetIndex = Math.max(0, currentSectionIndex - 1);
        } else if (direction === 'down') {
            targetIndex = Math.min(sections.length - 1, currentSectionIndex + 1);
        }
        
        // 対象セクションのボタンを取得
        const targetSection = sections[targetIndex];
        const buttons = targetSection.querySelectorAll('.option-button, .next-button');
        
        // ボタンが存在する場合
        if (buttons.length > 0) {
            // 同じ相対位置のボタンにフォーカスするか、最初のボタンにフォーカス
            const buttonIndex = (currentButtonIndex >= 0 && currentButtonIndex < buttons.length) ? currentButtonIndex : 0;
            buttons[buttonIndex].classList.add('keyboard-focus');
            buttons[buttonIndex].scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        
        // セクションが変わったことを視覚的に示すためのハイライト効果
        if (targetIndex !== currentSectionIndex) {
            targetSection.classList.add('keyboard-section-highlight');
            setTimeout(() => {
                targetSection.classList.remove('keyboard-section-highlight');
            }, 500);
        }
    }
    
    /**
     * オプションを番号で選択
     * @param {number} optionNumber 選択するオプション番号
     */
    selectOptionByNumber(optionNumber) {
        const currentSection = document.querySelector('.story-section.current');
        if (!currentSection) return;
        
        // オプションボタンを取得
        const optionButtons = currentSection.querySelectorAll('.option-button');
        
        // 次へボタンを取得
        const nextButton = currentSection.querySelector('.next-button');
        
        // 次へボタンがある場合は、1,2,3のいずれでも選択可能
        if (nextButton && (optionNumber === 1 || optionNumber === 2 || optionNumber === 3)) {
            nextButton.click();
            return;
        }
        
        // オプションボタンがない場合は処理終了
        if (optionButtons.length === 0) return;
        
        // 選択肢が1つだけの場合は、1,2,3のいずれでも選択可能
        if (optionButtons.length === 1 && (optionNumber === 1 || optionNumber === 2 || optionNumber === 3)) {
            optionButtons[0].click();
            return;
        }
        
        // オプション1の処理 - 常に最初の選択肢
        if (optionNumber === 1 && optionButtons.length >= 1) {
            optionButtons[0].click();
            return;
        }
        
        // OptionNext3がある選択肢の場合（3つ以上ある場合）
        if (optionButtons.length >= 3) {
            if (optionNumber === 2) {
                // 2を押したときは2番目の選択肢（OptionNext2）
                optionButtons[1].click();
            } else if (optionNumber === 3) {
                // 3を押したときは3番目の選択肢（OptionNext3）
                optionButtons[2].click();
            }
        }
        // OptionNext3がない選択肢の場合（2つのみ）
        else if (optionButtons.length === 2) {
            if (optionNumber === 2) {
                // 2つしかない場合、2キーは何も反応しない
                return;
            } else if (optionNumber === 3) {
                // 2つしかない場合、3キーは2番目の選択肢（OptionNext2）
                optionButtons[1].click();
            }
        }
    }
    
    /**
     * フォーカスがあるボタンを選択
     */
    selectFocusedButton() {
        // 現在フォーカスがあるボタンを見つける
        const focusedButton = document.querySelector('.keyboard-focus');
        if (focusedButton) {
            // ボタンをクリック
            focusedButton.click();
        }
    }
    
    /**
     * ドロップダウンメニューを開く
     */
    openDropdownMenu() {
        const dropdownMenu = document.getElementById('dropdown-menu');
        dropdownMenu.style.display = 'block';
        this.isDropdownVisible = true;
        
        // フォーカスをドロップダウンに移動
        this.currentFocus.type = 'dropdown';
        this.currentFocus.index = 0;
        this.updateFocus();
    }
    
    /**
     * ドロップダウンメニューを閉じる
     */
    closeDropdownMenu() {
        const dropdownMenu = document.getElementById('dropdown-menu');
        dropdownMenu.style.display = 'none';
        this.isDropdownVisible = false;
        
        // フォーカスをストーリーに戻す
        this.currentFocus.type = 'story';
        this.updateFocus();
    }
    
    /**
     * サブメニューを開く
     * @param {HTMLElement} parentItem 親メニューアイテム
     */
    openSubmenu(parentItem) {
        const dropdownItems = document.querySelectorAll('.dropdown-item');
        const parentIndex = Array.from(dropdownItems).indexOf(parentItem);
        const submenu = parentItem.querySelector('.submenu');
        
        if (!submenu) return;
        
        // サブメニューを表示
        submenu.style.display = 'block';
        
        // サブメニューの名前を取得（親アイテムのテキストから）
        const submenuName = parentItem.textContent.trim().split(':')[0] + ':';
        
        // フォーカスをサブメニューに移動
        this.currentFocus.type = 'submenu';
        this.currentFocus.parentIndex = parentIndex;
        this.currentFocus.index = 0;
        this.currentFocus.submenuName = submenuName;
        
        this.updateFocus();
    }
    
    /**
     * サブメニューを閉じる
     */
    closeSubmenu() {
        // サブメニューを非表示
        const submenu = document.querySelector(`.dropdown-item:nth-child(${this.currentFocus.parentIndex + 1}) .submenu`);
        if (submenu) {
            submenu.style.display = '';
        }
        
        // フォーカスをドロップダウンに戻す
        this.currentFocus.type = 'dropdown';
        this.currentFocus.index = this.currentFocus.parentIndex;
        this.currentFocus.parentIndex = -1;
        this.currentFocus.submenuName = '';
        
        this.updateFocus();
    }
    
    /**
     * フォーカスを更新
     */
    updateFocus() {
        console.log(`Updating focus for type: ${this.currentFocus.type}`);
        
        // すべてのフォーカスをクリア
        document.querySelectorAll('.keyboard-focus').forEach(el => {
            el.classList.remove('keyboard-focus');
        });
        
        // 現在のフォーカスタイプに基づいて新しいフォーカスを設定
        if (this.currentFocus.type === 'dropdown') {
            const dropdownItems = document.querySelectorAll('.dropdown-item');
            if (dropdownItems.length > 0 && this.currentFocus.index < dropdownItems.length) {
                dropdownItems[this.currentFocus.index].classList.add('keyboard-focus');
            }
        } else if (this.currentFocus.type === 'submenu') {
            const submenuItems = document.querySelectorAll(`.dropdown-item:nth-child(${this.currentFocus.parentIndex + 1}) .submenu-item`);
            if (submenuItems.length > 0 && this.currentFocus.index < submenuItems.length) {
                submenuItems[this.currentFocus.index].classList.add('keyboard-focus');
            }
        } else if (this.currentFocus.type === 'story') {
            // ストーリーの最初のボタンにフォーカス
            const currentSection = document.querySelector('.story-section.current');
            if (currentSection) {
                const firstButton = currentSection.querySelector('.option-button, .next-button');
                if (firstButton) {
                    firstButton.classList.add('keyboard-focus');
                }
            }
        } else if (this.currentFocus.type === 'popup') {
            // ポップアップのフォーカス状態を反映
            const yesButton = document.getElementById('popup-yes');
            const noButton = document.getElementById('popup-no');
            
            if (this.popupFocusButton === 1 && yesButton) {
                yesButton.classList.add('keyboard-focus');
            } else if (this.popupFocusButton === 2 && noButton) {
                noButton.classList.add('keyboard-focus');
            }
        }
    }
    
    /**
     * フォーカス表示用のスタイルを追加
     */
    addFocusStyles() {
        // CSSがまだ存在しない場合のみ追加
        if (!document.getElementById('keyboard-manager-styles')) {
            const style = document.createElement('style');
            style.id = 'keyboard-manager-styles';
            style.textContent = `
                .keyboard-focus {
                    outline: 3px solid #ffcc00 !important;
                    box-shadow: 0 0 8px #ffcc00 !important;
                    position: relative;
                    z-index: 10;
                }
                .dropdown-item.keyboard-focus,
                .submenu-item.keyboard-focus {
                    background-color: #e0e0e0;
                }
                .keyboard-section-highlight {
                    transition: background-color 0.3s ease;
                    background-color: #fffacd !important;
                }
            `;
            document.head.appendChild(style);
        }
    }
}

// DOMContentLoaded イベントでキーボードマネージャーを初期化
document.addEventListener('DOMContentLoaded', function() {
    // グローバル変数としてエクスポート
    window.keyboardManager = new KeyboardManager();
    
    // ポップアップボタンにマウスオーバーイベントを追加
    const yesButton = document.getElementById('popup-yes');
    const noButton = document.getElementById('popup-no');
    
    if (yesButton) {
        yesButton.addEventListener('mouseover', () => {
            if (window.keyboardManager) {
                window.keyboardManager.setPopupFocus(1);
            }
        });
    }
    
    if (noButton) {
        noButton.addEventListener('mouseover', () => {
            if (window.keyboardManager) {
                window.keyboardManager.setPopupFocus(2);
            }
        });
    }

    // 警告ポップアップの「了解」ボタンにイベントリスナーを追加
    const warningOkButton = document.getElementById('warning-popup-ok');
    if (warningOkButton) {
        warningOkButton.addEventListener('click', () => {
            if (window.keyboardManager) {
                // フォーカスをストーリーに戻す
                window.keyboardManager.currentFocus.type = 'story';
                // 少し遅延してからフォーカスを更新
                setTimeout(() => {
                    window.keyboardManager.updateFocus();
                }, 100);
            }
        });
    }

    // ポップアップ表示監視の初期化を確認
    setTimeout(() => {
        if (window.keyboardManager) {
            console.log('Checking popup observers...');
            // 念のためにもう一度ポップアップ監視を設定
            window.keyboardManager.setupPopupObservers();
        }
    }, 1000);
});

// 「テンキー操作ガイド」 ドラッグ機能の実装
document.addEventListener('DOMContentLoaded', function() {
    const helpBox = document.getElementById('keypad-guide');
    if (!helpBox) return;

    let isDragging = false;
    let offsetX, offsetY;

    // ボックス全体をドラッグ可能に
    helpBox.addEventListener('mousedown', (e) => {
        isDragging = true;
        offsetX = e.clientX - helpBox.getBoundingClientRect().left;
        offsetY = e.clientY - helpBox.getBoundingClientRect().top;
        helpBox.style.cursor = 'grabbing';
    });

    document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        
        const x = e.clientX - offsetX;
        const y = e.clientY - offsetY;
        
        helpBox.style.left = `${x}px`;
        helpBox.style.right = 'auto';
        helpBox.style.top = `${y}px`;
        helpBox.style.bottom = 'auto';
    });

    document.addEventListener('mouseup', () => {
        isDragging = false;
        helpBox.style.cursor = 'move';
    });

    // 閉じるボタンのクリックイベント
    const closeButton = document.getElementById('close-keypad-guide');
    if (closeButton) {
        closeButton.addEventListener('click', function() {
            document.getElementById('keypad-guide').style.display = 'none';
        });
    }
});