/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
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

function init(request) {
	profile(request);
}

/*
 * プロファイルを行う。
 *
 * 制限事項:
 * 		・jsspRpcの場合はsession.jsが実行されないのでプロファイル不可
 *
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
 * @param profilerDef
 * @param path
 * @return true:プロファイル対象である | false:ロファイル対象ではない
 */
function isProfiled(profilerDef, path) {
	
	return profilerDef.getFunction("isProfiled")(path);
}

/**
 * pathのプロファイル例外関数名の配列を取得する。
 * @param profilerDef
 * @param path
 * @return プロファイル例外関数名の配列（対象がない場合は空配列）
 */
function getExcludeFunctions(profilerDef, path) {
	
	return profilerDef.getFunction("getExcludeFunctions")(path);
}

/**
 * pathを実行し、プロファイルを行う。また、結果をレスポンスに書き出す。
 * @param profiler
 * @param profilerDef
 * @param path
 * @param args pathの引数（配列）
 * @return
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
 * @param path
 * @param locale
 * @return
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
 
function close() {
	
	var profiler = new Procedure.Profiler(Web.current());
	
	if (profiler.hasReport()) {
		// プロファイルレポートをログに書き出す
		profiler.report();
	}
}
