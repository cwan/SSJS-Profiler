SSJS-Profiler
=============

[intra-mart](http://www.intra-mart.jp/) SSJS (Server Side JavaScript) / Function Container の簡易プロファイラです。

function 単位の実行回数および処理時間の合計を調べることができます。

## 設定方法

### インストール

Resource Service のルートソースディレクトリ (pages/src 等) に、以下のファイルを配置してください

 - compatible_logger.js
 - profiler.js
 - profiler_def.js
 - session.js

**注意**
 - サーバモジュールの文字コードが UTF-8 以外の場合は、ソースファイルの文字コードを変換してください。
 - 既存の session.js がある場合は、マージしてください。

### アンインストール

配置したソースファイルを削除した後、intra-mart を再起動してください。

### 詳細な設定

#### profiler_def.js の設定

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
例えば、インスタンス化して使用する function などを除外するときに使用します。（[制限事項および注意事項](#制限事項および注意事項)参照）

**profileLibraries**

ライブラリ function などをプロファイル対象とするときに使用します。  
配布版のソースでは、Procedure で定義された function 全てをプロファイル対象としています。

#### Profiler を直接使用する方法

session.js と profiler_def.js を使用すると、プロファイラの設定を自動的に行うことができますが、Profiler オブジェクトを使用して明示的にプロファイル対象を指定することも可能です。

    // profiler.jsの読み込み
    // include("profiler");
    
    // プロファイラインスタンスの生成
    var profiler = new Procedure.Profiler();
    
    // 特定オブジェクトのすべての function をプロファイル対象とするならば、addAll を使用する
    // 第1引数:レシーバオブジェクト、第2引数:ログ出力時の判別に使用するレシーバ名（オプション）
    profiler.addAdd(this, Web.current());
    
    // 特定の function だけプロファイル対象とするならば、add を使用する
    // 第1引数:レシーバオブジェクト、第2引数:function、第2引数:ログ出力時の判別に使用するレシーバ名（オプション）
    profiler.add(Procedure.IspUtil, Procedure.IspUtil.toJSONString, "IspUtil");
    
    // Java で実装された API をプロファイル対象とする
    // この場合、addAll は不可。（「制限事項および注意事項」参照）
    var manager = new ISPBulletinManager();
    profiler.add(manager, manager.getBulletinCls, "ISPBulletinManager");
    
    // プロファイルレポートをログに出力する
    profiler.report();
    
    // reportOnClose を実行すると、close の中で自動的に report() を実行するようになる
    profiler.reportOnClose(this);

#### ストップウォッチの使用方法

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

## 制限事項および注意事項

 - プロファイラを使用することによって、パフォーマンスはかなり低下しますので、測定される処理時間は実際のものより長くなります。
 - jsspRpc の場合には、プロファイラが自動的に設定されません(session.js が実行されないため）。
 - 再帰呼び出しの場合には、処理時間が重複して計上されます。
 - インスタンス化して使用する function には、プロファイラを設定することはできません。
 - Java で実装された API のプロファイルを取得する場合、プロトタイプに対してプロファイラを設定することはできません。インスタンスに対して設定することは可能です。ただし、addAll や addAllExclude で一括設定をすることはできず、add で関数毎にプロファイラを設定する必要があります。
 - system-install.xml に定義して使用する JavaScript API に対してプロファイラを設定することはできません。また、`Module.*` の API や Imart （カスタムタグ）に対してプロファイラを設定することもできません。（API の実装にプロファイラを埋め込むことはできます）
 - インスタンスを生成せず、static で使用するライブラリに対してプロファイラを適用した場合、Application Runtime を再起動するまでプロファイラが適用されたままになります。

## 動作環境

 - intra-mart WebPlatform 6.1, 7.2
 - IM-共通マスタ 7.2
 - IM-Workflow 7.2
 - Intranet Startpack 6.1, 7.1

**注意**
 - 上記以外のプロダクト・バージョンは動作確認を行なっていません（動作する可能性はあります）。
 - 上記のプロダクト・バージョンでも、一部の機能は正常に動作しない可能性があります。その場合は、除外パターンを設定してください。

## ライセンス

[Apache License, Version 2.0](https://github.com/cwan/SSJS-Profiler/blob/master/LICENSE.txt)

## 更新履歴

### Ver.1.0.1 (2012-09-18)
- [#1 Ver.6.x に対応](/cwan/SSJS-Profiler/issues/1)

### Ver.1.0.0 (2012-09-09)
- 初期リリース

## Keywords
intra-mart, intramart, イントラマート, プロファイラ, profiler, JavaScript
