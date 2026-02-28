---
marp: true
theme: default
paginate: true
backgroundColor: #FFFFFF
color: #1F2937
style: |
  section {
    font-family: "Inter", "Source Han Sans", "PingFang SC", sans-serif;
  }
  section.dark {
    background-color: #0F172A;
    color: #FFFFFF;
  }
  h1 { color: #1F2937; font-size: 38pt; }
  h2 { color: #2563EB; font-size: 12pt; font-weight: bold; letter-spacing: 2px; }
  strong { color: #2563EB; }
  .red { color: #DC2626; }
  table { font-size: 14pt; }
---

<!-- _class: dark -->

# NEMUKE BUSTER

〜眠気バスター〜

**眠気を検知し、運動で覚醒させる。ブラウザだけで。**

Soma Kaibuchi / Yuya Tokumitsu
KOSENJIN Hackathon 2026

---

## PROBLEM

# 居眠りは「あるある」ではない。社会問題だ。

| OECD最下位 | 70% | $136B | 6,400人 |
|:---:|:---:|:---:|:---:|
| 日本の睡眠時間 | 20代の睡眠不足率 | 生産性損失（米国/年） | 居眠り運転死亡（米国/年） |

> **既存の解決策は「アラームを鳴らすだけ」。止めて、また寝る。これが現実。**

Sources: OECD 2021, NSC, Sleep Foundation, Japan Ministry of Health

---

## SOLUTION

# NEMUKE BUSTERは「検知」で終わらない。「覚醒」まで完結する。

### 3ステップの覚醒サイクル

| 1. 検知 | 2. 警告 | 3. 覚醒 |
|:---:|:---:|:---:|
| カメラでEARをリアルタイム計測 | 3秒間の閉眼でアラーム発動 | スクワット5回で解除（ポーズAI判定） |

**インストール不要** / **サーバー不要** / **プライバシー完全保護**

---

<!-- _class: dark -->

## LIVE DEMO

# デモ — 実際に体験してください

| Step | Action |
|------|--------|
| **START** | ブラウザでURLを開くだけ |
| **MONITOR** | 顔ランドマーク表示 + 覚醒レベルバー |
| **DETECT** | 目を閉じて3秒 → アラーム発動 |
| **SQUAT** | スクワット5回でカウント → 解除 |
| **RETURN** | 覚醒状態で監視モードに復帰 |

**審査員の皆さんも、今夜試せます。URLを開くだけです。**

---

## WHY NOW

# エッジAIの爆発的成長が、このプロダクトを可能にした

| $23B → $197B | WebGPU | 91% | 60 FPS |
|:---:|:---:|:---:|:---:|
| エッジAI市場（2034年） | 2025年に主要ブラウザ全対応 | オンデバイスAI処理を好む | MediaPipe リアルタイム検知 |

> **2年前は不可能だった。今だからこそできる。**

---

## MARKET

# $8.9Bの市場に、ソフトウェアで切り込む

| TAM $27.2B | SAM $3.5B | SOM $50M |
|:---:|:---:|:---:|
| 居眠り検知市場全体（2034） | ソフトウェアDMS + 生産性ツール | 日本の学生・リモートワーカー・運送業 |

> **既存プレイヤーは全てハードウェア依存（$500〜$5,000/台）。NEMUKE BUSTERは限界費用ほぼゼロ。**

---

## ADVANTAGE

# なぜNEMUKE BUSTERが勝てるのか

|  | 車載DMS | 専用デバイス | アラームアプリ | **NEMUKE BUSTER** |
|---|---|---|---|---|
| コスト | $500〜5,000 | $200〜500 | 無料 | **無料/Freemium** |
| インストール | 車両組込 | デバイス購入 | アプリDL | **URLを開くだけ** |
| 覚醒アクション | なし | なし | なし | **スクワット判定** |
| プライバシー | クラウド送信 | クラウド送信 | ローカル | **完全ローカル** |
| 利用場所 | 車内のみ | 固定場所 | どこでも | **どこでも** |

---

## TECHNOLOGY

# ブラウザネイティブAIという技術的優位

1. **React 19 + TypeScript + Vite** — モダンWeb技術スタック
2. **MediaPipe FaceLandmarker** — 468点の顔特徴点でEAR算出
3. **MediaPipe PoseLandmarker** — 33点の体関節でスクワット判定
4. **誤検知防止** — 3フレーム連続一致 + 800msクールダウン
5. **Web Audio API** — OSレベルのアラーム生成

> **サーバーコスト $0。100万ユーザーでも運用コストが増えない。**

---

## BUSINESS MODEL

# Freemiumで獲得し、B2Bで収益化

| Phase 1（Now） | Phase 2（6ヶ月後） | Phase 3（1年後） |
|:---:|:---:|:---:|
| **無料版でユーザー獲得** | **プレミアム機能** | **B2B展開** |
| 居眠り検知 + スクワット解除 | 覚醒データ分析ダッシュボード | 運送会社向けドライバー管理 |
| 「NEMUKE BUSTERされた」SNS拡散 | カスタムエクササイズ・PWA | 企業向け生産性ツール |

> **サーバーコストゼロ → フリーミアムでも十分に成立するユニットエコノミクス**

---

<!-- _class: dark -->

# NEMUKE BUSTER

**$27B市場に、ゼロコストのソフトウェアで挑む。**

眠気を検知し、運動で覚醒させる。ハードウェア不要。ブラウザだけで。

### 今夜から使えます。

ありがとうございました！
