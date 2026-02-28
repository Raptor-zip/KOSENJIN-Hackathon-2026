# NEMUNAI - 居眠り検知 & スクワット強制解除 Web アプリ

サーバー不要、スマホのブラウザだけで完結する居眠り検知アプリ。
居眠りを検知するとアラームが鳴り、**スクワット 5 回**で解除できる。

## デモ

| Start | Monitoring | Penalty |
|-------|-----------|---------|
| 監視スタートボタン | カメラ映像 + 顔メッシュ描画 | 赤点滅 + 骨格描画 + スクワットカウンター |

## 技術スタック

- **React** (Vite, TypeScript)
- **Tailwind CSS v4** - ダークモード UI
- **@mediapipe/tasks-vision** - ブラウザ上 WASM 推論
  - FaceLandmarker (468 点顔メッシュ)
  - PoseLandmarker (33 点骨格)
- **Web Audio API** - アラーム音生成 (外部ファイル不要)

## 3 つの状態

```
[Start] --タップ--> [Monitoring] --居眠り3秒--> [Penalty]
                        ^                          |
                        |---スクワット5回達成--------|
```

### 1. Start State
- 「監視スタート」ボタンで カメラ許可 + AudioContext アンロック (iOS/Android 対応)

### 2. Monitoring State
- FaceLandmarker で EAR (Eye Aspect Ratio) をリアルタイム計算
- 顔メッシュ・目・虹彩をカメラ映像上に描画
- EAR < 0.2 が 3 秒継続 → Penalty へ遷移
- 複数人検出時は画面中央の顔を優先

### 3. Penalty State
- Web Audio API でブザー音ループ再生 (square 波 880Hz + 8Hz LFO 変調)
- 画面全体が赤く点滅
- PoseLandmarker に切り替え、骨格をカメラ映像上に描画
- 膝角度 (Hip→Knee→Ankle) でスクワットを判定
  - 安定化フィルター: 3 フレーム連続で状態確定 + 800ms クールダウン
- 5 回完了 → アラーム停止、Monitoring に復帰

## セットアップ

```bash
npm install
npm run dev
```

### スマホからアクセス

カメラ API は HTTPS 必須のため、Vite は自己署名証明書付きで起動する (`@vitejs/plugin-basic-ssl`)。

```
https://<PC の IP>:5173/
```

ブラウザの「安全でない接続」警告を許可して進む。

## プロジェクト構成

```
src/
├── main.tsx                          # エントリーポイント
├── index.css                         # Tailwind CSS + アニメーション定義
├── types.ts                          # 型定義
├── App.tsx                           # 状態管理 + ランドマーク描画
├── hooks/
│   ├── useCamera.ts                  # カメラ制御
│   ├── useAlarm.ts                   # Web Audio API アラーム
│   ├── useFaceLandmarker.ts          # 顔検出 + EAR 計算 + 中央顔選択
│   └── usePoseLandmarker.ts          # ポーズ検出 + スクワット判定 + 安定化
└── components/
    ├── StartScreen.tsx               # 初期画面
    ├── MonitoringScreen.tsx          # 監視画面 (覚醒レベル表示)
    └── PenaltyScreen.tsx             # ペナルティ画面
```
