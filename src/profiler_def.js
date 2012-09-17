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
 * 引数のパスがプロファイル対象ならば、trueを返す。
 * @param path
 */
function isProfiled(path) {
	
	// プロファイル対象のパス
	var includePaths = [
		/.+/
	];
	
	// includePathPatternsの中で、除外するパス
	var excludePaths = [
	];
	
	for (var i = 0; i < includePaths.length; i++) {
		
		if (includePaths[i] === path ||
			(includePaths[i] instanceof RegExp) && includePaths[i].test(path)) {
			
			var excluded = false;
			
			for (var j = 0; j < excludePaths.length; j++) {
				if (excludePaths[i] === path ||
					(excludePaths[i] instanceof RegExp) && excludePaths[i].test(path)) {
					
					excluded = true;
					break;
				}
			}
			
			if (!excluded) {
				return true;
			}
		}
	}
	
	return false;
}

/**
 * 引数のパスに関する除外関数リストを取得する。
 * @param {} path
 * @returns {} 
 */
function getExcludeFunctions(path) {

	// 完全一致パス
	var excludePaths = {
	};
	
	// 正規表現パターン
	var excludePatterns = {
		".*" : [ "DTFColumnConverter" ]
	};
	
	var result = [];
	var i, x;
	
	for (x in excludePaths) {
		if (x === path) {
			for (i = 0; i < excludePaths[x].length; i++) {
				result.push(excludePaths[x][i]);
			}
		}
	}
	
	for (x in excludePatterns) {
		if (new RegExp(x).test(path)) {
			for (i = 0; i < excludePatterns[x].length; i++) {
				result.push(excludePatterns[x][i]);
			}
		}
	}
	
	return result;
}

/**
 * ライブラリのプロファイル設定を行う。
 * @param profiler
 */
function profileLibraries(profiler) {

	// 設定済みチェック
	var doneCheckKey = "profiler_def.profileLibraries";

	if (Procedure[doneCheckKey]) {
		return;
	}
	
	Procedure.define(doneCheckKey, true);
	
	
	// 除外リスト
	var exclusionFunctions = [
		Procedure.Profiler,
		Procedure.CompatibleLogger
	];
	
	if (Procedure.imAppComSearch) {
		exclusionFunctions.push(Procedure.imAppComSearch.services.util.validate_table_fields.DTFColumnConverter);
	}
	
	// Procedureで定義されたfunctionを再帰的にプロファイル設定する
	(function(receiver, receiverName) {
	
		for (var p in receiver) {
		
			var func = receiver[p];
			
			if (!func) {
				continue;
			}
			
			var exclude = false;
			
			for (var i = 0; i < exclusionFunctions.length; i++) {
				if (exclusionFunctions[i] === func) {
					exclude = true;
					break;
				}
			}
			
			if (typeof func === "function" && !exclude) {
				profiler.add(receiver, func, receiverName);
			}
			
			if (!exclude) {
				arguments.callee(func, receiverName + "." + p);
			}
		}
	
	})(Procedure, "Procedure");
}
