SSJS-Profiler
=============

[intra-mart](http://www.intra-mart.jp/) SSJS (Server Side JavaScript) の簡易プロファイラです。

function 単位の実行回数および処理時間の合計を調べることができます。

## 設定方法

### インストール

Resource Service のルートソースディレクトリ (pages/src 等) に、以下のファイルを配置してください

 - profiler.js
 - profiler_def.js
 - session.js

**注意**
 - サーバモジュールの文字コードが UTF-8 以外の場合は、ソースファイルの文字コードを変換してください。
 - 既存の session.js がある場合は、マージしてください。

### アンインストール

配置したソースファイルを削除した後、intra-mart を再起動してください。

### 詳細な設定

*あとで書きます*

#### profiler_def.js の設定

#### Profiler を直接使用する方法

#### ストップウォッチの使用方法

## 実行方法

intra-mart を再起動すると、プロファイラの設定が有効になります。

画面から操作を行うと、以下の様なログ（標準設定では、stdout.log と system.log） が出力されるようになります。

    SSJS Profiling report : workflow/user/process/process_list
     | FUNCTION / STOPWATCH NAME                                 | COUNT | TIME [ms] | 
     | workflow/user/process/process_list.makeValidation         |     1 |         0 | 
     | Procedure.imw_user_list_utils.getListDisplayPattern       |     1 |        94 | 
     | Procedure.imw_utils.getValue                              |     7 |         1 | 
     | Procedure.imw_paging_utils.createSortIconParts            |    17 |         7 | 
     | Procedure.imw_user_list_utils.setListPatternHeader        |     1 |        60 | 
     | workflow/user/process/process_list.getHeaderInfo          |     1 |        61 | 
     | Procedure.imw_user_list_utils.getMatterPropertyCodes      |     1 |         0 | 
     | workflow/user/process/process_list.setListSearchCondition |     1 |         4 | 
     | Procedure.imw_user_list_utils.setOrderCondition           |     1 |        16 | 
     | Procedure.imw_paging_utils.adjustPagingNumber             |     1 |         1 | 
     | workflow/user/process/process_list.getDisplayCondition    |     1 |         1 | 
     | Procedure.imw_paging_utils.createPagingParts              |     1 |         0 | 
     | Procedure.imw_utils.makeHiddenObject                      |     2 |         1 | 
     | workflow/user/process/process_list.init                   |     1 |       352 | 

1行目の : の右側は、リクエストが送信された JSSP のパスです。
基本的には、このパスに対するリクエストを受信してからレスポンスを返すまでに実行された処理の統計情報がログに出力されます。

2行目はヘッダ行です。

3行目からがプロファイル結果です。

左端の項は、functionまたはストップウォッチの名称です。
 - `<JSSPパス名>.<function名>`
 - `<Proceder定義オブジェクト名>.<function名>`

中央の項は、functionまたはストップウォッチの実行回数です。

右端の項は、functionまたはストップウォッチの処理時間の合計（ミリ秒）です。

## 制限事項

 - jsspRpc の場合には、プロファイラが自動的に設定されません(session.js が実行されないため）。
 - 再帰呼び出しの場合には、処理時間が重複して計上されます。
 - インスタンス化して使用するfunctionには、プロファイラを設定することはできません。

## 動作環境

 - intra-mart WebPlatform 7.2
 - IM-共通マスタ 7.2
 - IM-Workflow 7.2
 - Intranet Startpack 7.1

**注意**
 - 上記以外のプロダクト・バージョンは動作確認を行なっていません（動作する可能性はあります）。
 - 上記のプロダクト・バージョンでも、一部の機能は正常に動作しない可能性があります。その場合は、除外パターンを設定してください。

## ライセンス

[Apache License, Version 2.0](https://github.com/cwan/SSJS-Profiler/blob/master/LICENSE.txt)

## 更新履歴

### Ver.1.0.0 (2012-09-09)
- 初期リリース
