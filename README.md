SSJS-Profiler
=============

[intra-mart](http://www.intra-mart.jp/) SSJS (Server Side JavaScript) / Function Container の簡易プロファイラです。

function 単位の実行回数および処理時間の合計を調べることができます。

ダウンロードは [tags](/cwan/SSJS-Profiler/tags) から行ってください。

## 1. 設定方法

### <a name="install"></a>1.1. インストール

Resource Service のルートソースディレクトリ (pages/src 等) に、以下のファイルを配置してください

 - compatible_logger.js
 - profiler.js
 - profiler_def.js
 - session.js

**注意**
 - サーバモジュールの文字コードが UTF-8 以外の場合は、ソースファイルの文字コードを変換してください。
 - 既存の session.js がある場合は、マージしてください。

### 1.2. アンインストール

配置したソースファイルを削除した後、intra-mart を再起動してください。

### 1.3. 詳細設定

[インストール](#install)を行うだけでプロファイラが使えるようになりますが、以下の設定によってプロファイラの動作を細かく制御することができます。

#### 1.3.1. profiler_def.js の設定

profiler_def.js には、プロファイル対象が定義されます。（session.js から読み込まれます）

**isProfiled**

引数の jssp パスをプロファイル対象とするならば true を返します。  
配布版のソースでは、全てのパスがプロファイル対象となります。  
特定のパス（機能）だけをプロファイル対象とする場合は、以下のように設定してください。

    // プロファイル対象のパス
    var includePaths = [
        /^startpack\/.+/,
        /^workflow\/.+/
    ];
    
    // includePathPatternsの中で、除外するパス
    var excludePaths = [
        "workflow/user/apply/apply_list"
    ];
    
includePaths および excludePaths には、プロファイル対象とするパス・除外するパスを、それぞれ正規表現または文字列でしてします。文字列で指定した場合は、完全一致で比較されます。  
includePaths のいずれかに一致し、かつ excludePaths のいずれにも一致しないパスがプロファイル対象となります。

**getExcludeFunctions**

引数の jssp パスをプロファイルする際に、除外する function 名を定義します。  
例えば、インスタンス化して使用する function などを除外するときに使用します。（[制限事項および注意事項](#restrictions)参照）

**profileLibraries**

ライブラリ function などをプロファイル対象とするときに使用します。  
配布版のソースでは、Procedure や Module で定義された function 全てをプロファイル対象としています。

#### 1.3.2. Profiler を直接使用する方法

session.js と profiler_def.js を使用すると、プロファイラの設定を自動的に行うことができますが、Profiler オブジェクトを使用して明示的にプロファイル対象を指定することも可能です。

    // profiler.js の読み込み
    include("profiler");
    
    // プロファイラインスタンスの生成
    var profiler = new Procedure.Profiler();
    
    // 特定オブジェクトのすべての function をプロファイル対象とするならば、addAll を使用する
    // 第1引数: レシーバオブジェクト、第2引数: ログ出力時の判別に使用するレシーバ名（オプション）
    profiler.addAdd(this, Web.current());
    
    // 特定の function だけプロファイル対象とするならば、add を使用する
    // 第1引数: レシーバオブジェクト、第2引数: function、第3引数: ログ出力時の判別に使用するレシーバ名（オプション）、
    // 第4引数: function 名（第2引数の name プロパティが取得できない場合に必要）
    profiler.add(objA, funcX, "ClaasA", "funcX");
    
    // プロファイルレポートをログに出力する
    profiler.report();
    
    // reportOnClose を実行すると、close の中で自動的に report() を実行するようになる
    profiler.reportOnClose(this);

IM-Workflow の標準画面からの申請などは、jsspRpc で行われますが、[制限事項および注意事項](#restrictions)にある通り、
jsspRpc は自動的にプロファイルの設定を行うことはできません。また、申請アクション処理なども同様です。

これらの処理のプロファイルを取得するには、以下のようにソースに手を加えます。  
_（reportFinally が使用できるのは、Ver.1.0.3 以降です）_

`pages/platform/src/workflow/common/proc/exec/apply_jssp.js`

    // グローバルスコープに、以下の4行を追加
    var path = "workflow/common/proc/exec/apply_jssp";  // jsspRpc では Web.current() が取得できないので、パスを明示的に指定する
    var profiler = new Procedure.Profiler(path);
    profiler.add(this, apply, path, "apply");   // プロファイルを取得する function を指定
    profiler.reportFinally(this, "apply");      // apply の最後にレポートを出力する

    function apply(request){
        ...

`pages/src/sample/workflow/purchase/action/ActionProcess1.js` _（任意のアクション処理）_

    // グローバルスコープに、以下の2行を追加
    var profiler = new Procedure.Profiler();
    profiler.addAll(this, "sample/workflow/purchase/action/ActionProcess1");    // この js 内に定義された全ての function のプロファイルを取得
    
    // ※ レポート出力は、apply_jssp で行われるので、ここに reportFinally などを記述する必要はない
    
    // 申請
    function apply(parameter,userParameter) {
        ...

#### 1.3.3. Java で実装された API のプロファイル

Java で実装された API のプロファイルを取得することも可能です（_Ver.1.0.3 以降_）。
しかし、プロファイラの設定の処理が重く、初回実行時に時間がかかるため、配布版のソースでは無効になっています。

profiler_def.js の _profileJavaApis 関数の内部を編集し、プロファイルを取得したい API のコメントを外して再起動してください。

    // 例: VirtualFile のプロファイルを有効にする
    profileInstancializeApis("VirtualFile", [ "append", "directories", "exist", "files", "isDirectory", "isFile", "lastModified", "load", "makeDirectories", "move", "path", "read", "remove", "save", "size", "write", "lists" ]);

#### 1.3.4. ストップウォッチの使用方法

function よりも細かい粒度で測定を行いたい場合は、ストップウォッチが使用できます。  
profiler オブジェクトの stopWatch メソッドの第1引数に与えられた文字列毎に、実行回数と処理時間の合計が取得されます。  
レポートの出力方法は通常のプロファイラと同じです。  

**start / stop を使用する方法**

    var profiler = new Procedure.Profiler();
    
    profiler.stopWatch("処理1").start();  // 測定開始
    
    // 測定を行いたい処理
    doSomething1();
    doSomething2();
    
    profiler.stopWatch("処理1").stop();  // 測定終了
    
    for (var i = 0; i < len; i++) {
        profiler.start("処理2").start();  // 測定開始
        
        // 測定を行いたい処理
        doSomething3();
        doSomething4();
        
        profiler.stopWatch("処理2").stop();  // 測定終了
    }
    
    
**内部関数を使用する方法**

    var profiler = new Procedure.Profiler();
    
    profiler.stopWatch("処理3", function() {
    
        // 測定を行いたい処理
        doSomething1();
        doSomething2();
        
        // 注: ここで変数の宣言を行っていると、外側のスコープからは参照できなくなります
    });
    
stopWatch メソッドの別名として、sw を使用することも可能です。    

## 2. 実行方法

intra-mart を再起動すると、プロファイラの設定が有効になります。

画面から操作を行うと、以下の様なログ（標準設定では、stdout.log と system.log） が出力されるようになります。

    SSJS Profiling report : workflow/user/process/process_list
     | FUNCTION / STOPWATCH NAME                                        | COUNT | TIME [ms] | 
     | ImJson.checkJSONString                                           |     2 |         5 | 
     | ImJson.parseJSON                                                 |     2 |         6 | 
     | Procedure.imw_paging_utils.initActionRefresh                     |     1 |         0 | 
     | ImJson.escapeData                                                |    42 |        14 | 
     | ImJson.toJSONString                                              |     2 |        32 | 
     | workflow/user/process/process_list.makeValidation                |     1 |         1 | 
     | Procedure.imw_user_list_utils.getListDisplayPattern              |     1 |        25 | 
     | Procedure.imw_utils.getValue                                     |     7 |         0 | 
     | Procedure.imw_paging_utils.createSortIconParts                   |    17 |         4 | 
     | Procedure.imw_user_list_utils.setListPatternHeader               |     1 |        30 | 
     | workflow/user/process/process_list.getHeaderInfo                 |     1 |        30 | 
     | Procedure.imw_user_list_utils.getMatterPropertyCodes             |     2 |         1 | 
     | workflow/user/process/process_list.setListSearchCondition        |     1 |         1 | 
     | Procedure.imw_user_list_utils.setOrderCondition                  |     1 |         4 | 
     | Procedure.imw_paging_utils.adjustPagingNumber                    |     1 |         0 | 
     | Procedure.imw_user_list_utils.getListColumnObject                |   340 |        66 | 
     | Procedure.imw_utils.escapeHTML                                   |   360 |        69 | 
     | Procedure.imw_user_list_utils.createListProcessLink              |    20 |        39 | 
     | Procedure.imw_user_list_utils.setListColumnAttribute             |   340 |        58 | 
     | Procedure.imw_user_list_utils.createListTransferLink             |    20 |        21 | 
     | Procedure.imw_user_list_utils.defaultListColumnObjectPriority    |    20 |         2 | 
     | Procedure.imw_datetime_utils.getBaseDateFormat                   |    80 |        14 | 
     | Procedure.imw_user_list_utils.defaultListColumnObjectStatus      |    20 |         3 | 
     | Procedure.imw_user_list_utils.defaultListColumnObjectProcessAuth |    20 |         4 | 
     | Procedure.imw_user_list_utils.createListDetailLink               |    20 |        21 | 
     | Procedure.imw_user_list_utils.createListFlowLink                 |    20 |        12 | 
     | Procedure.imw_user_list_utils.createListHistoryLink              |    20 |        12 | 
     | workflow/user/process/process_list.getDisplayCondition           |     1 |       589 | 
     | Procedure.imw_paging_utils.createPagingParts                     |     1 |         0 | 
     | Procedure.imw_utils.makeHiddenObject                             |     2 |         2 | 
     | workflow/user/process/process_list.init                          |     1 |       790 | 
     | workflow/user/process/process_list.actionRefresh                 |     1 |     1,007 | 
     | [StopWatch].getProcessListCount                                  |     1 |         8 | 

1行目の : の右側は、リクエストが送信された JSSP のパスです。  
基本的には、このパスに対するリクエストを受信してからレスポンスを返すまでに実行された処理の統計情報がログに出力されます。

2行目はヘッダ行です。

3行目からがプロファイル結果です。  
左端の項 (_FUNCTION / STOPWATCH NAME_) は、functionまたはストップウォッチの名称です。
 - `<JSSPパス名>.<function名>`
 - `<Proceder/Module定義オブジェクト名>.<function名>`
 - `[StopWatch].<ストップウォッチ名>`
 
中央の項 (_COUNT_) は、functionまたはストップウォッチの実行回数です。  
右端の項 (_TIME_)は、functionまたはストップウォッチの処理時間の合計（ミリ秒）です。

## <a name="restrictions"></a>3. 制限事項および注意事項

 1. プロファイラを使用することによって、パフォーマンスはかなり低下しますので、測定される処理時間は実際のものより長くなります。
特に、session.js でプロファイラの設定を行う場合、画面を最初に表示するときにライブラリのプロファイル設定を行うため、時間がかかります。
profiler_def.js を編集し、プロファイルの取得が不要な API やパスを除外することで性能は向上します。
 1. jsspRpc の場合には、プロファイラが自動的に設定されません（session.js が実行されないため）。
 1. IM-Workflow のアクション処理やバッチプログラムなど、画面から直接実行されないプログラムには、プロファイラが自動的に設定されません（session.js が実行されないため）。
 1. 再帰呼び出しの場合には、処理時間が重複して計上されます。
 1. Java で実装された API のプロファイルを取得する場合、addAll や addAllExclude で一括設定をすることはできず、add で関数毎にプロファイラを設定する必要があります。
 1. ライブラリ（Procedure や Module、Java で実装された API 等）に対してプロファイラを適用した場合、Application Runtime を再起動するまでプロファイラが適用されたままになります。

## 4. 動作環境

 - intra-mart WebPlatform 6.1, 7.2
 - IM-共通マスタ 7.2
 - IM-Workflow 7.2
 - Intranet Startpack 6.1, 7.1

**備考**
 - 上記以外のプロダクト・バージョンは動作確認を行なっていません（動作する可能性はあります）。
 - 上記のプロダクト・バージョンでも、一部の機能は正常に動作しない可能性があります。その場合は、除外パターンを設定してください。

## 5. ライセンス

[Apache License, Version 2.0](https://github.com/cwan/SSJS-Profiler/blob/master/LICENSE.txt)

## 6. 更新履歴

### Ver.1.0.3 (2012-10-01)
- [#5 intra-mart Ver.6.x でレポートが system.log に出力されない不具合を修正](/cwan/SSJS-Profiler/issues/5)
- [#6 jsspRpc や IM-Workflow のアクション処理などのプロファイルを比較的簡単に取得する方法を追加（Profiler.reportFinally 追加）](/cwan/SSJS-Profiler/issues/6)
- [#7 Java で実装された API のプロファイルを取得できるようにした](/cwan/SSJS-Profiler/issues/7)

### Ver.1.0.2 (2012-09-22)
- [#2 無名関数に対応](/cwan/SSJS-Profiler/issues/2)
- [#4 全角文字が含まれるとレポートの桁ぞろえがずれる不具合を修正](/cwan/SSJS-Profiler/issues/4)

### Ver.1.0.1 (2012-09-18)
- [#1 Ver.6.x に対応](/cwan/SSJS-Profiler/issues/1)

### Ver.1.0.0 (2012-09-09)
- 初期リリース

## Keywords
intra-mart intramart イントラマート プロファイラ profiler JavaScript 性能 Performance パフォーマンス
