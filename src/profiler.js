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
 * @fileOverview intra-mart SSJS (Server Side JavaScript) のプロファイラ。
 * 
 * @see <a href="https://github.com/cwan/SSJS-Profiler">SSJS-Profiler Project</a>
 * @since Ver.1.0.0
 */

/**
 * Profilerクラスの定義を行う。
 * 
 * @returns {undefined}
 */
function init() {

	if (typeof Procedure.CompatibleLogger === "undefined") {
		include("compatible_logger");
	}
	
	Procedure.define("Profiler", Profiler);
}

/**
 * @constructor
 * @param {String} name プロファイラ名。省略時はWeb.current()が適用される。
 */
function Profiler(name) {
	
	this.CONTENT_ID = "profiler";
	
	this.logger = Procedure.CompatibleLogger.get(this.CONTENT_ID);
	
	this.profilerName = name || Web.current();
}

/**
 * リクエストスコープの関数統計情報を取得する。
 *
 * @returns {Object} 関数統計情報の連想配列。
 *   キー : {Function} 関数オブジェクト
 *   値 : {
 *	 	functionName {String} : 関数名,
 *	 	receiverName {String} : レシーバ名,
 *	 	count {Number} : 実行回数,
 *	 	elapsedTime {Number} : 処理時間（ミリ秒）
 *   }	 
 */
Profiler.prototype.getFunctionStats = function getFunctionStats() {
	 
	var request = Web.getRequest();
	
	var RKEY_FUNCTION_STATS = this.CONTENT_ID + ".functionStats";
	
	var functionStats = request.getAttribute(RKEY_FUNCTION_STATS);
	
	if (!functionStats) {
		functionStats = {};
		request.setAttribute(RKEY_FUNCTION_STATS, functionStats);
	}
	
	return functionStats;
}

/**
 * リクエストスコープのストップウォッチ情報を取得する。
 *
 * @returns {Object} ストップウォッチの連想配列。
 *   キー : {String} ストップウォッチ名
 *   値 : {StopWatch} ストップウォッチオブジェクト
 */
Profiler.prototype.getStopWatches = function getStopWatches() {
	
	var request = Web.getRequest();
	
	var RKEY_STOPWATCHES = this.CONTENT_ID + ".stopWatches";
	
	var stopWatches = request.getAttribute(RKEY_STOPWATCHES);
	
	if (!stopWatches) {
		stopWatches = {};
		request.setAttribute(RKEY_STOPWATCHES, stopWatches);
	}
	
	return stopWatches;
}
 
/**
 * 引数receiverのすべてのfunctionをプロファイル対象に設定する。
 *
 * @param {Object} receiver レシーバオブジェクト
 * @param {String} receiverName レシーバ名（ログ出力時の判別用。オプション）
 * @returns {Profiler} 自オブジェクト
 */
Profiler.prototype.addAll =	function addAll(receiver, receiverName) {
	 
	if (!this.logger.isInfoEnabled()) {
		return this;
	}
		
	return this.addAllExclude(receiver, [], receiverName);
};

/**
 * 引数receiverのexcludeFunctionsを除いたすべてのfunctionをプロファイル対象に設定する。
 * 
 * @param {Object} receiver レシーバオブジェクト
 * @param {Array<String>} excludeFunctions 除外functionまたはfuncion名の配列
 * @param {String} receiverName レシーバ名（ログ出力時の判別用。オプション）
 * @returns {Profiler} 自オブジェクト
 */
Profiler.prototype.addAllExclude = function addAllExclude(receiver, excludeFunctions, receiverName) {
	
	if (!this.logger.isInfoEnabled()) {
		return this;
	}
	
	if (!receiver) {
		this.logger.error("An argument 'receiver' of Profiler#addAllExclude is invalid. ({})", receiverName);
		return this;
	}
	
	for (var property in receiver) {
		
		if (typeof receiver[property] !== "function") {
			continue;
		}
		
		// 除外チェック
		var exclude = false;
		
		for (var i = 0; i < excludeFunctions.length; i++) {
			
			if (typeof excludeFunctions[i] === "function" &&
					excludeFunctions[i] === receiver[property]) {
				exclude = true;
				break;
			}
			
			try {
				if (("" + receiver[property]).indexOf("[JavaClass ") === 0) {
					return this;
				}
			} catch (e) {
			}
			
			if (typeof excludeFunctions[i] === "string" &&
					excludeFunctions[i] === receiver[property].name) {
				exclude = true;
				break;
			}
		}
		
		if (!exclude) {
			this.add(receiver, receiver[property], receiverName, property);
		}
	}
	
	return this;
};


/**
 * 1つのfunctionをプロファイル対象にする。
 * 
 * @param {Object} receiver レシーバオブジェクト
 * @param {Function} func Functionオブジェクト
 * @param {String} receiverName レシーバ名（ログ出力時の判別用。オプション）
 * @param {String} functionName function名（省略時はfuncのnameプロパティが適用される。無名関数の場合は必須）
 * @retuns {Profiler} 自オブジェクト
 */
Profiler.prototype.add = function add(receiver, func, receiverName, functionName) {
	
	if (!this.logger.isInfoEnabled()) {
		return this;
	}
		
	if (!receiver) {
		this.logger.error("An argument 'receiver' of Profiler#add is invalid. ({})", receiverName);
		return this;
	}
	
	if (!func) {
		this.logger.error("An argument 'func' of Profiler#add is invalid. ({})", receiverName);
		return this;
		
	} else if (typeof func !== "function") {
		this.logger.error("An argument 'func' of Profiler#add is not a function. ({})", receiverName);
		return this;
	}
	
	try {
		if (("" + func).indexOf("[JavaClass ") === 0) {
			return this;
		}
	} catch (e) {
	}
	
	functionName = functionName || func.name;
	
	if (functionName === "forward" || functionName === "__original_forward") {
		return this;
	}
	
	if (receiver[functionName] && receiver[functionName].__profiler_weaved__) {
		// オーバーライド済み
		return this;
	}
	
	var self = this;
	
	// 関数をオーバーライドして、処理時間の測定を行う
	receiver[functionName] = function() {
		
		var start = +new Date;
		
		try {
			// 元々のfunction実行
			return func.apply(this, Array.prototype.slice.call(arguments));
			
		} finally {
			var elapsedTime = new Date - start;
			
			var functionStats = self.getFunctionStats();
			
			var stat = functionStats[func];
			
			if (stat) {
				stat.count++;
				stat.elapsedTime += elapsedTime;
				
			} else {
				functionStats[func] = {
					receiverName : receiverName,
					functionName : functionName,
					count : 1,
					elapsedTime : elapsedTime
				};
			}
		}
	};
	
	
	receiver[functionName].__profiler_weaved__ = true;
	
	return this;
};

/**
 * 第2引数のfnTargetが渡されない場合は、引数の識別名のストップウォッチを取得する。
 * 第2引数のfnTargetが渡された場合は、fnTargetを実行し、その処理時間を測定する。
 * 
 * @param {String} stopWatchName ストップウォッチ名
 * @param {Function} fnTarget 測定対象の関数（オプション）
 * @return {StopWatch} ストップウォッチオブジェクト
 */
Profiler.prototype.stopWatch =
Profiler.prototype.sw =	function sw(stopWatchName, fnTarget) {
	
	if (!stopWatchName) {
		this.logger.error("An argument of stopWatch is invalid.");
		return {};
	}
	
	var stopWatches = this.getStopWatches();
	
	var objStopWatch = stopWatches[stopWatchName];
	
	if (!objStopWatch) {
		objStopWatch = new StopWatch(stopWatchName, this.logger);
		stopWatches[stopWatchName] = objStopWatch;
	}
	
	if (typeof fnTarget === "function") {
		
		objStopWatch.start();
		
		try {
			fnTarget();
		} finally {
			objStopWatch.stop();
		}
	}
	
	return objStopWatch;
};

/**
 * 統計レポートをINFOログに出力する。
 * 
 * @param {String} delimiter
 * 		レポートの区切り文字。例えば、CSV形式で出力したい場合は "," を指定する。
 * 		省略時は、スペースで桁揃えしたレポートが出力される。
 * @returns {undefined}
 */
Profiler.prototype.report = function report(delimiter) {
	
	if (!this.logger.isInfoEnabled()) {
		return;
	}
	
	// 文字列長を取得する（全角文字は2文字分）
	function getStrLen(s) {
		
		if (!s) return 0;
		
		var n = 0;
		
		for (var i = 0; i < s.length; i++) {
			var c = s.charCodeAt(i);
			n += (c < 256 || (c >= 0xff61 && c <= 0xff9f)) ? 1 : 2;
		}
		
		return n;
	}
	
	var buf = [];
	var i;
	var lineSeparator = Packages.java.lang.System.getProperty("line.separator", "\n");

	buf[buf.length] = lineSeparator;
	buf[buf.length] = "SSJS Profiling report : ";
	buf[buf.length] = this.profilerName;
	buf[buf.length] = lineSeparator;
	
	var reportData = [];
	
	// ヘッダ
	reportData[0] = {
			name : "FUNCTION / STOPWATCH NAME",
			count : "COUNT",
			elapsedTime : "TIME [ms]"
	};
	
	// 各列の最大長（桁ぞろえ用）
	if (!delimiter) {
		var maxLenName = reportData[0].name.length;
		var maxLenCount = reportData[0].count.length;
		var maxLenTime = reportData[0].elapsedTime.length;
	}
	
	var functionStats = this.getFunctionStats();
	
	for (var f in functionStats) {
		
		var row = {};
		reportData[reportData.length] = row;
		
		var stat = functionStats[f];
		
		if (stat.receiverName) {
			row.name = stat.receiverName + "." + stat.functionName;
		} else {
			row.name = stat.functionName;
		}
		
		row.count = Format.fromNumber("#,##0", stat.count);
		row.elapsedTime = Format.fromNumber("#,##0", stat.elapsedTime);
		
		if (!delimiter) {
			maxLenName = Math.max(getStrLen(row.name), maxLenName);
			maxLenCount = Math.max(row.count.length, maxLenCount);
			maxLenTime = Math.max(row.elapsedTime.length, maxLenTime);
		}
	}
	
	var stopWatches = this.getStopWatches();
	
	for (var stopWatchName in stopWatches) {
		
		var row = {};
		reportData[reportData.length] = row;
		
		var sw = stopWatches[stopWatchName];
		
		row.name = "[StopWatch]." + stopWatchName;
		row.count = Format.fromNumber("#,##0", sw.count);
		row.elapsedTime = Format.fromNumber("#,##0", sw.elapsedTime);
		
		if (!delimiter) {
			maxLenName = Math.max(getStrLen(row.name), maxLenName);
			maxLenCount = Math.max(row.count.length, maxLenCount);
			maxLenTime = Math.max(row.elapsedTime.length, maxLenTime);
		}
	}
	
	
	if (delimiter) {
		// 区切り文字あり
		
		for (i = 0; i < reportData.length; i++) {
			
			var row = reportData[i];
			
			buf[buf.length] = '"';
			buf[buf.length] = row.name;
			buf[buf.length] = '"';
			buf[buf.length] = delimiter;
			buf[buf.length] = '"';
			buf[buf.length] = row.count;
			buf[buf.length] = '"';
			buf[buf.length] = delimiter;
			buf[buf.length] = '"';
			buf[buf.length] = row.elapsedTime;
			buf[buf.length] = '"';
			
			if (i !== reportData.length - 1) {
				buf[buf.length] = lineSeparator;
			}
		}
		
	} else {
		// 区切り文字なし
		
		var spacerLen = Math.max(maxLenName, maxLenCount, maxLenTime);
		
		var spacer = [];
		for (i = 0; i < spacerLen; i++) {
			spacer[i] = " ";
		}
		
		spacer = spacer.join("");
		
		var separator = " | ";
		
		for (i = 0; i < reportData.length; i++) {
			
			var row = reportData[i];
			
			buf[buf.length] = separator;
			buf[buf.length] = row.name;
			buf[buf.length] = spacer.substring(getStrLen(row.name) + spacerLen - maxLenName);
			buf[buf.length] = separator;
			
			if (i !== 0) {
				// ヘッダ以外は右揃え
				buf[buf.length] = spacer.substring(row.count.length + spacerLen - maxLenCount);
				buf[buf.length] = row.count;
				buf[buf.length] = separator;
				
				buf[buf.length] = spacer.substring(row.elapsedTime.length + spacerLen - maxLenTime);
				buf[buf.length] = row.elapsedTime;
				
			} else {
				// ヘッダだけは左揃え
				buf[buf.length] = row.count;
				buf[buf.length] = spacer.substring(row.count.length + spacerLen - maxLenCount);
				buf[buf.length] = separator;
				
				buf[buf.length] = row.elapsedTime;
				buf[buf.length] = spacer.substring(row.elapsedTime.length + spacerLen - maxLenTime);
			} 

			buf[buf.length] = separator;
			
			if (i !== reportData.length - 1) {
				buf[buf.length] = lineSeparator;
			}
		}
		
	}
	
	this.logger.info(buf.join(""));
};

/**
 * @returns {boolean} レポート情報があるならばtrue、なければfalseを返す。
 */
Profiler.prototype.hasReport = function hasReport() {
	
	if (!this.logger.isInfoEnabled()) {
		return false;
	}
	
	for (var f in this.getFunctionStats()) {
		return true;
	}
	
	for (var s in this.getStopWatches()) {
		return true;
	}
	
	return false;
};

/**
 * close関数実行時に統計レポートをログに出力する場合、closeのレシーバを設定する。
 * 
 * @param {Object} receiver レシーバオブジェクト
 * @param {String} delimiter レポートの区切り文字。詳細は、{@link #report}参照。
 * @returns {Profiler} 自オブジェクト
 */
Profiler.prototype.reportOnClose = function reportOnClose(receiver, delimiter) {
	
	if (!this.logger.isInfoEnabled()) {
		return this;
	}
	
	if (!receiver) {
		this.logger.error("An argument of reportOnClose is invalid.");
	}
	
	var self = this;
	
	if (typeof receiver.close === "function") {
		// close関数が存在する
		
		var fnClose = receiver.close;
		
		receiver.close = function() {
			
			// オリジナルのclose実行
			fnClose();
			
			self.report(delimiter);
		};
		
	} else {
		// close関数が存在しない
		
		receiver.close = function() {
			self.report(delimiter);
		};
	}
	
	return this;
};

/**
 * @constructor
 * @param {String} stopWatchName ストップウォッチの識別名
 */
function StopWatch(stopWatchName, logger) {

	this.stopWatchName = stopWatchName;
	this.count = 0;
	this.elapsedTime = 0;
	this.startTime = -1;
	this.logger = logger;
}

/**
 * ストップウォッチを開始する。
 * @returns {undefined}
 */
StopWatch.prototype.start = function() {

	if (this.startTime >= 0) {
		this.logger.error("StopWatch({})#start is called without stop.", this.stopWatchName);
		return;
	}

	this.startTime = +new Date;
};

/**
 * ストップウォッチを停止する。
 * @returns {undefined}
 */
StopWatch.prototype.stop = function() {

	if (this.startTime < 0) {
		this.logger.error("StopWatch({})#stop is called without start.", this.stopWatchName);
		return;
	}

	this.elapsedTime += new Date - this.startTime;
	this.startTime = -1;
	this.count++;
};
