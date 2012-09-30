/*
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND,
 * either express or implied. See the License for the specific language
 * governing permissions and limitations under the License.
 */

/**
 * @fileOverview SSJSプロファイラを、profiler_def.jsの定義に従ってAOP的に設定する。
 * 
 * ※ session.js は、intra-mart JSSPフレームワークで予約されたファイル名。
 *    全ての *.jssp, *.jssps リクエストの前に実行される。（*.jssprpcでは実行されない）
 * 
 * @see <a href="https://github.com/cwan/SSJS-Profiler">SSJS-Profiler Project</a>
 * @since Ver.1.0.0
 */

include("profiler");

var $imSystemPackage = Packages.jp.co.intra_mart.system;

var $javaClass = {
	JSSPScriptBuilder:		$imSystemPackage.jssp.provider.application.JSSPScriptBuilder,
	JSSPViewBuilder:		$imSystemPackage.jssp.provider.application.JSSPViewBuilder,
	Context:				$imSystemPackage.javascript.Context,
	ScriptScope:			$imSystemPackage.display.ScriptScope,
	ScriptableObject:		$imSystemPackage.javascript.ScriptableObject,
	JSSPSourceManager:		$imSystemPackage.jssp.provider.application.JSSPSourceManager
};

/**
 * 
 * @param {Request} request リクエストオブジェクト
 * @returns {undefined}
 */
function init(request) {
	profile(request);
}

/*
 * プロファイルを行う。
 *
 * @param {Request} request リクエストオブジェクト
 * @returns {undefined}
 */
function profile(request) {
	
	var currentPath = Web.current();
	
	var profiler = new Procedure.Profiler(currentPath);
	var profilerDef = new Content("profiler_def");
	

	// forwardのオーバーライド
	if (typeof this.__proto__.__original_forward === "undefined") {
		
		this.__proto__.__original_forward = this.__proto__.forward;
		
		this.__proto__.forward = function(path, args) {
			
			if (isProfiled(profilerDef, path)) {
				
				// Web.current()が返すパスを変更
				var originalWebCurrent = Web.current;
				
				try {
					Web.current = function() {
						return path;
					}
					
					// 疑似foward実行
					executeAndProfile(profiler, profilerDef, path, args);
					
				} finally {
					Web.current = originalWebCurrent;
				}
				
			} else {
				__original_forward(path, args);
			}
		}
	}

	
	// ライブラリのプロファイル設定
	profilerDef.getFunction("profileLibraries")(profiler);
	
	
	if (isProfiled(profilerDef, currentPath)) {
		
		// im_actionの処理
		var imAction = request.im_action;
		var imActive = request.im_active ? request.im_active.replace(/\(2f\)/g, "/").replace(/\(5f\)/g, "_") : null;
		
		if (imAction) {
			
			var path = imActive || currentPath;
			
			var locale = $javaClass.Context.getCurrentContext().getLocale();
			
			var scriptScope = $javaClass.JSSPScriptBuilder.getBuilder(locale).getScriptScope(path);
			
			profiler.addAllExclude(scriptScope, getExcludeFunctions(profilerDef, path), path);
			
			scriptScope[imAction](request);
		}
		
		// initの処理
		executeAndProfile(profiler, profilerDef, currentPath, request);
	}
}

/**
 * pathがプロファイル対象かどうか判定する。
 *
 * @param {Object} profilerDef プロファイラ対象定義オブジェクト
 * @param {String} path JSSPパス（拡張子は含まない）
 * @returns {boolean} true:プロファイル対象である | false:ロファイル対象ではない
 */
function isProfiled(profilerDef, path) {
	
	return profilerDef.getFunction("isProfiled")(path);
}

/**
 * pathのプロファイル例外関数名の配列を取得する。
 *
 * @param {Object} profilerDef プロファイラ対象定義オブジェクト
 * @param {String} path JSSPパス（拡張子は含まない）
 * @returns {Array<String>} プロファイル例外関数名の配列（対象がない場合は空配列）
 */
function getExcludeFunctions(profilerDef, path) {
	
	return profilerDef.getFunction("getExcludeFunctions")(path);
}

/**
 * pathを実行し、プロファイルを行う。また、結果をレスポンスに書き出す。
 *
 * @param {Profiler} profiler プロファイラオブジェクト
 * @param {Object} profilerDef プロファイラ対象定義オブジェクト
 * @param {String} path JSSPパス（拡張子は含まない）
 * @param {Array<Object>} args pathの引数
 * @returns {undefined}
 */
function executeAndProfile(profiler, profilerDef, path, args) {
	
	var ctx = $javaClass.Context.getCurrentContext();
	var locale = ctx.getLocale();
	
	if (existsJsSource(path, locale)) {
		var scriptScope = $javaClass.JSSPScriptBuilder.getBuilder(locale).getScriptScope(path);
		
		profiler.addAllExclude(scriptScope, getExcludeFunctions(profilerDef, path), path);
		
		if ($javaClass.ScriptableObject.hasProperty(scriptScope, "init")) {
			
			scriptScope.init(args);	// ※ ScriptScope#call(ctx, "init", args)は、JavaではOKだがJSではNG
		}
	}
	
	try {
		var view = $javaClass.JSSPViewBuilder.getBuilder(locale).getComposition(path);
		
		if (scriptScope) {
			var before = $javaClass.ScriptScope.entry(scriptScope);
		}
		
		try {
			var html = view.execute(ctx, scriptScope || new $javaClass.ScriptScope());
			
			Web.getHTTPResponse().sendMessageBodyString(html);
			
		} finally {
			if (scriptScope) {
				$javaClass.ScriptScope.entry(before);
			}
		}
		
	} finally {
		if (scriptScope && $javaClass.ScriptableObject.hasProperty(scriptScope, "close")) {
			scriptScope.close(args);
		}
	}

}
 
/**
 * JSファイルが存在するかチェックする
 *
 * @param {String} path 確認対象のJSファイルパス（拡張子は含まない）
 * @param {Object} locale ロケールオブジェクト
 * @returns {boolean} JSファイルが存在するならばtrueを返す。
 */
function existsJsSource(path, locale) {
	
	try {
		$javaClass.JSSPSourceManager.getSourceManager(locale).getSource(path + ".js");
	} catch (e) {
		if (e.message && e.message.indexOf("java.io.FileNotFoundException") === 0) {
			return false;
		}
		
		throw e;
	}
	
	return true;
}

/**
 * レポートの出力を行う。
 * @returns {undefined}
 */
function close() {
	
	var profiler = new Procedure.Profiler(Web.current());
	
	if (profiler.hasReport()) {
		// プロファイルレポートをログに書き出す
		profiler.report();
	}
}
