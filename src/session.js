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
 * @since 1.0.0
 * @version 1.0.4
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
	
	// forwardのプロファイル設定
	weaveIntoForward(profiler, profilerDef);
	
	// Contentのプロファイル設定
	weaveIntoContent(profiler, profilerDef);

	// ライブラリのプロファイル設定
	profilerDef.getFunction("profileLibraries")(profiler);
	
	
	if (!isProfiled(profilerDef, currentPath)) {
		return;
	}
		
	// im_actionの処理
	executeAndProfileAction(request, profiler, profilerDef);
	
	// initの処理
	executeAndProfile(profiler, profilerDef, currentPath, request);
}

/**
 * forward関数をオーバーライドして、プロファイラの設定を行う。
 * 
 * @param {Profiler} profiler
 * @param {Content} profilerDef
 * @returns {undefined}
 * @since 1.0.4
 */
function weaveIntoForward(profiler, profilerDef) {
	
	if (typeof this.__proto__.__original_forward !== "undefined") {
		return;
	}
		
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

/**
 * Contentをオーバーライドして、プロファイラの設定を行う。
 * 
 * @param {Profiler} profiler
 * @param {Content} profilerDef
 * @returns {undefined}
 * @since 1.0.4
 */
function weaveIntoContent(profiler, profilerDef) {
	
	if (Content.__profiler_weaved__) {
		return;
	}
	
	// コンストラクタ引数を getFuncion などから参照できるように、
	// Content完全に作りかえる。

	// コンストラクタ
	this.__proto__.Content = function(srcPath) {
		this.srcPath = srcPath;
	};
	
	this.__proto__.Content.__profiler_weaved__ = true;
	
	// execute
	this.__proto__.Content.prototype.execute = function execute(request) {
		
		return executeAndProfile(profiler, profilerDef, this.srcPath, request, true);
	};
	
	// executeFunction
	this.__proto__.Content.executeFunction = function executeFunction() {
	
		var args = Array.prototype.slice.call(arguments);
		var path = args[0];
		var functionName = args[1];
		var funcArgs = [];
		
		if (args.length >= 3) {
			for (var i = 2; i < args.length; i++) {
				funcArgs[i - 2] = args[i];
			}
		}
		
		var scriptScope = getScriptScope(profiler, profilerDef, path);
		return scriptScope[functionName].apply(this, funcArgs);
	};
	
	// getFunction
	this.__proto__.Content.prototype.getFunction = function getFunction(functionName) {
		
		var scriptScope = getScriptScope(profiler, profilerDef, this.srcPath);
		return scriptScope[functionName];
	};
	
	// isError
	this.__proto__.Content.prototype.isError = function isError() {
		
		try {
			$javaClass.JSSPViewBuilder.getBuilder().getComposition(this.srcPath);
			return false;
			
		} catch (e) {
			return true;
		}
	};
	
	// toString
	this.__proto__.Content.prototype.toString = function toString() {
		return this.srcPath;
	};
}

/**
 * im_actionにプロファイラを設定して実行する。
 * 
 * @param {Request} request リクエストオブジェクト
 * @param {Profiler} profiler
 * @param {Content} profilerDef
 * @returns {undefined}
 * @since 1.0.4
 */
function executeAndProfileAction(request, profiler, profilerDef) {

	var imAction = request.im_action;
	
	if (!imAction) {
		return;
	}
	
	var imActive = request.im_active ? 
					request.im_active.replace(/\(2f\)/g, "/").replace(/\(5f\)/g, "_") : 
					null;
	
	var scriptScope = getScriptScope(profiler, profilerDef, imActive || currentPath);
	
	scriptScope[imAction](request);
}

/**
 * プロファイラ設定済みのScriptScopeオブジェクトを取得する。
 * 
 * @param {Profiler} profiler
 * @param {Content} profilerDef
 * @param {String} path
 * @returns {ScriptScope}
 */
function getScriptScope(profiler, profilerDef, path) {
	
	var scriptScope = $javaClass.JSSPScriptBuilder.getBuilder().getScriptScope(path);
	
	if (path !== "profiler_def") {
		profiler.addAllExclude(scriptScope, getExcludeFunctions(profilerDef, path), path);
	}
	
	return scriptScope;
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
 * pathを実行し、プロファイルを行う。
 *
 * @param {Profiler} profiler プロファイラオブジェクト
 * @param {Object} profilerDef プロファイラ対象定義オブジェクト
 * @param {String} path JSSPパス（拡張子は含まない）
 * @param {Array<Object>} args pathの引数
 * @param {boolean} returnText trueの場合、実行結果のHTMLを文字列で返却する。falseの場合は、結果をレスポンスに書き出す。
 * @returns {undefined}
 */
function executeAndProfile(profiler, profilerDef, path, args, returnText) {
	
	var ctx = $javaClass.Context.getCurrentContext();
	
	if (existsJsSource(path)) {
		
		var scriptScope = getScriptScope(profiler, profilerDef, path);
		
		if ($javaClass.ScriptableObject.hasProperty(scriptScope, "init")) {
			
			scriptScope.init(args);	// ※ ScriptScope#call(ctx, "init", args)は、JavaではOKだがJSではNG
		}
	}
	
	try {
		var view = $javaClass.JSSPViewBuilder.getBuilder().getComposition(path);
		
		if (scriptScope) {
			var before = $javaClass.ScriptScope.entry(scriptScope);
		}
		
		try {
			var html = view.execute(ctx, scriptScope || new $javaClass.ScriptScope());
			
			if (returnText) {
				return html;
			}
			
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
 * @returns {boolean} JSファイルが存在するならばtrueを返す。
 */
function existsJsSource(path) {
	
	var locale = $javaClass.Context.getCurrentContext().getLocale();
	 
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
