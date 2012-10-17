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
 * @fileOverview バージョン互換性のあるロガークラス。
 * 
 * @see <a href="https://github.com/cwan/SSJS-Profiler">SSJS-Profiler Project</a>
 * @since 1.0.1
 * @version 1.0.4
 */

/**
 * CompatibleLoggerクラスの定義を行う。
 * 
 * @returns {undefined}
 */
function init() {

	Procedure.define(
		"CompatibleLogger", {
			
			/**
			 * ロガーオブジェクトを取得する。 
			 *
			 * @param {String} name ロガー名。省略時は、Web.current() が適用される。
			 * @returns {Object} ロガーオブジェクト
			 */
			get : function get(name) {
			
				if (typeof Logger === "undefined") {
					return new CompatibleLogger(name, echo);
				} else {
					return (typeof name !== "undefined") ? Logger.getLogger(name) : Logger.getLogger();
				}
			}
		}
	);
}

/**
 * iWP/iAF Ver.6以前で、<a href="http://www.intra-mart.jp/apilist/v72/doclet/function_container/foundation/logger.html">Ver.7</a>と
 * ほぼ同じインターフェースを実装するロガークラス。
 * （ログレベルはハードコーディングされている）
 * 
 * @constructor
 * @param {String} name ロガー名。省略時は、Web.current() が適用される。
 * @param {Function} fnPrintln ログ出力を行う関数。
 */
function CompatibleLogger(name, fnPrintln) {

	this.loggerName = (typeof name !== "undefined") ? name : Web.current();
	
	this.println = fnPrintln;
	
	this.loggable = {
		trace: true,
		debug: true,
		info: true,
		warn: true,
		error: true
	}
}

/**
 * ログ出力を行う。
 * 
 * @param {String} level ログレベル
 * @param {Array} args 1番目の要素はログフォーマット（必須）。2番目以降の要素はログパラメータ（オプション）。
 * @returns {undefined}
 */
CompatibleLogger.prototype.log = function log(level, args) {

	var args = Array.prototype.slice.call(args);
	
	var message = args[0];
	
	if (args.length > 1) {
		// フォーマット変換
		
		var logArgs;
		
		if (isArray(args[1])) {
			logArgs = args[1];
		} else {
			logArgs = [];
		
			for (var i = 1; i < args.length; i++) {
				logArgs.push(args[i]);
			}
		}
		
		var iLogArgs = 0;
		
		while (message.indexOf("{}") >= 0 && iLogArgs < logArgs.length) {
		
			message = message.replace("{}", logArgs[iLogArgs++]);
		}
	}
	
	this.println([ "[", level, "] ", this.loggerName, " - ", message ].join(""));
};

/**
 * TRACEレベルのログを出力する。<br/>
 * 1番目の引数にログフォーマット（必須）、2番目以降の引数にログパラメータを指定する（オプション）。
 * 
 * @returns {undefined}
 */
CompatibleLogger.prototype.trace = function trace() {
	
	if (this.loggable.trace) {
		this.log("TRACE", arguments);
	}
};

/**
 * DEBUGレベルのログを出力する。<br/>
 * 1番目の引数にログフォーマット（必須）、2番目以降の引数にログパラメータを指定する（オプション）。
 * 
 * @returns {undefined}
 */
CompatibleLogger.prototype.debug = function debug() {
	
	if (this.loggable.debug) {
		this.log("DEBUG", arguments);
	}
};

/**
 * INFOレベルのログを出力する。<br/>
 * 1番目の引数にログフォーマット（必須）、2番目以降の引数にログパラメータを指定する（オプション）。
 * 
 * @returns {undefined}
 */
CompatibleLogger.prototype.info = function info() {
	
	if (this.loggable.info) {
		this.log("INFO", arguments);
	}
};

/**
 * WARNレベルのログを出力する。<br/>
 * 1番目の引数にログフォーマット（必須）、2番目以降の引数にログパラメータを指定する（オプション）。
 * 
 * @returns {undefined}
 */
CompatibleLogger.prototype.warn = function warn() {
	
	if (this.loggable.warn) {
		this.log("WARN", arguments);
	}
};

/**
 * ERRORレベルのログを出力する。<br/>
 * 1番目の引数にログフォーマット（必須）、2番目以降の引数にログパラメータを指定する（オプション）。
 * 
 * @returns {undefined}
 */
CompatibleLogger.prototype.error = function error() {
	
	if (this.loggable.error) {
		this.log("ERROR", arguments);
	}
};

/**
 * TRACEレベルのログを出力するかどうかを取得する。
 * 
 * @returns {boolean} 出力するならばtrueを返す。
 */
CompatibleLogger.prototype.isTraceEnabled = function isTraceEnabled() {

	return this.loggable.trace;
};

/**
 * DEBUGレベルのログを出力するかどうかを取得する。
 * 
 * @returns {boolean} 出力するならばtrueを返す。
 */
CompatibleLogger.prototype.isDebugEnabled = function isDebugEnabled() {

	return this.loggable.debug;
};

/**
 * INFOレベルのログを出力するかどうかを取得する。
 * 
 * @returns {boolean} 出力するならばtrueを返す。
 */
CompatibleLogger.prototype.isInfoEnabled = function isInfoEnabled() {

	return this.loggable.info;
};

/**
 * WARNレベルのログを出力するかどうかを取得する。
 * 
 * @returns {boolean} 出力するならばtrueを返す。
 */
CompatibleLogger.prototype.isWarnEnabled = function isWarnEnabled() {

	return this.loggable.warn;
};

/**
 * ERRORレベルのログを出力するかどうかを取得する。
 * 
 * @returns {boolean} 出力するならばtrueを返す。
 */
CompatibleLogger.prototype.isErrorEnabled = function isErrorEnabled() {

	return this.loggable.error;
};
