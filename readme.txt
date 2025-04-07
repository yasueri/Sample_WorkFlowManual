■構成メモ
/WorkFlow
│── index.html         # トップページのHTMLファイル。CSS・JavaScript：htmlファイルに含む
│── 他のhtmlファイル    # メインコンテンツ。CSSやJavaScriptはstyle.cssやscript.jsに記載　　
│── style.css          # CSSファイル
│── script.js          # JavaScriptファイル
└── assets/            # 画像・マニュアル・その他のアセット　←現在、未実装
    ├── images/        # 画像（.png, .jpg, .svgなど）
    ├── videos/        # 動画ファイル
    └── manuals/       # マニュアル ※マニュアルへのリンクを設定する場合はここに格納

■主な機能
・CSVデータをもとに、表示内容を更新できる（htmlファイルの該当データを差し替える）
・スタート地点を選択（ハンバーガーメニュー）
・自動選択（過去と同一の選択肢が表示された場合、前回と同一の選択肢が自動的に選択される。矛盾防止のため変更できないようにする）
・選択やり直し
・「要印刷」「画面」の文字が含まれる場合は赤字
