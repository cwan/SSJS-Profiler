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

function init() {

	Procedure.define(
		"CompatibleLogger", {
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
}

CompatibleLogger.prototype.trace = function trace() {
	
	if (this.loggable.trace) {
		this.log("TRACE", arguments);
	}
}

CompatibleLogger.prototype.debug = function debug() {
	
	if (this.loggable.debug) {
		this.log("DEBUG", arguments);
	}
}

CompatibleLogger.prototype.info = function info() {
	
	if (this.loggable.info) {
		this.log("INFO", arguments);
	}
}

CompatibleLogger.prototype.warn = function warn() {
	
	if (this.loggable.warn) {
		this.log("WARN", arguments);
	}
}

CompatibleLogger.prototype.error = function error() {
	
	if (this.loggable.error) {
		this.log("ERROR", arguments);
	}
}

CompatibleLogger.prototype.isTraceEnabled = function isTraceEnabled() {

	return this.loggable.trace;
}

CompatibleLogger.prototype.isDebugEnabled = function isDebugEnabled() {

	return this.loggable.debug;
}

CompatibleLogger.prototype.isInfoEnabled = function isInfoEnabled() {

	return this.loggable.info;
}

CompatibleLogger.prototype.isWarnEnabled = function isWarnEnabled() {

	return this.loggable.warn;
}

CompatibleLogger.prototype.isErrorEnabled = function isErrorEnabled() {

	return this.loggable.error;
}
