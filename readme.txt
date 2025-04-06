■構成メモ
/WorkFlow
│── index.html         # トップページのHTMLファイル。CSS・JavaScript：htmlファイルに含む
│── 他のhtmlファイル    # メインコンテンツ。CSSやJavaScriptはstyle.cssやscript.jsに記載　　
│── style.css          # CSSファイル
│── script.js          # JavaScriptファイル
└── assets/            # 画像・マニュアル・その他のアセット
    ├── images/        # 画像（.png, .jpg, .svgなど）
    ├── videos/        # 動画ファイル
    └── manuals/       # マニュアル ※マニュアルへのリンクを設定する場合はここに格納

■主な機能
・CSVデータをもとに、表示内容を更新できる（htmlファイルの該当データを差し替える）
・選択やり直し
・自動選択（過去と同一の選択肢が表示された場合、前回と同一の選択肢が自動的に選択される。矛盾防止のため変更できないようにする）
・途中から始める（ハンバーガーメニュー）
