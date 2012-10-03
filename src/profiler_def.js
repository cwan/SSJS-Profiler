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
 * @fileOverview パスや関数がプロファイル対象とするかどうかが定義される。
 * 
 * @see <a href="https://github.com/cwan/SSJS-Profiler">SSJS-Profiler Project</a>
 * @since Ver.1.0.0
 * @version Ver.1.0.4
 */

/**
 * 引数のパスがプロファイル対象かどうかを判定する。
 * 
 * @param {String} path SSJSのパス（拡張子は含まない）
 * @returns {boolean} 引数のパスがプロファイル対象ならば、trueを返す。 
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
 *
 * @param {String} path SSJSのパス（拡張子は含まない）
 * @returns {Array<String>} 除外する関数名の配列。
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
 *
 * @param {Profiler} profiler プロファイラオブジェクト
 * @returns {undefined}
 */
function profileLibraries(profiler) {

	// 設定済みチェック
	var doneCheckKey = "profiler_def.profileLibraries";

	if (Procedure[doneCheckKey]) {
		return;
	}
	
	Procedure.define(doneCheckKey, true);
	
	// JavaScriptで実装されたAPIにプロファイル設定を行う
	_profileJsApis(profiler);
	
	// Javaで実装されたAPIにプロファイル設定を行う
	_profileJavaApis(profiler);
}

/**
 * JavaScriptで実装されたAPIにプロファイル設定を行う。
 *  
 * @param {Profiler} profiler プロファイラオブジェクト
 * @returns {undefined}
 * @since Ver.1.0.3
 */
function _profileJsApis(profiler) {
	
	// 除外するAPI
	var exclusions = {
		"Procedure.profiler_def.profileLibraries" : true,
		"Procedure.Profiler" : true,
		"Procedure.CompatibleLogger" : true,
		"Procedure.imAppComSearch.services.util.validate_table_fields.DTFColumnConverter" : true
	};
	
	function profileStaticApisRecursive(receiverName) {

		if (exclusions[receiverName]) {
			return;
		}
		
		if (eval("typeof " + receiverName + " === 'undefined'")) {
			return;
		}			
		
		var receiver = eval(receiverName);
	
		for (var p in receiver) {
		
			var func = receiver[p];
			var funcFullName = isNaN(p) ? (receiverName + "." + p) : (receiverName + "[" + p + "]");  
			
			if (typeof func === "function" &&!exclusions[funcFullName]) {
				profiler.add(receiver, func, receiverName, p);
			}
			
			arguments.callee(funcFullName);
		}
	}
	
	profileStaticApisRecursive("Procedure");
	profileStaticApisRecursive("Module");
	
	// system-install*.xmlで定義されたAPI
	profileStaticApisRecursive("ImJson");
	profileStaticApisRecursive("ImDepartment");
	profileStaticApisRecursive("ImRole");
	profileStaticApisRecursive("ImPost");
	profileStaticApisRecursive("ImPublicGroup");
	profileStaticApisRecursive("ImSelectCondition");
}

/**
 * Javaで実装されたAPIにプロファイル設定を行う。
 *  
 * @param {Profiler} profiler プロファイラオブジェクト
 * @returns {undefined}
 * @since Ver.1.0.3
 */
function _profileJavaApis(profiler) {
	
	// ※ for-inでプロパティを取得できないため、個別に設定する必要がある
	 
	 
	function profileInstancializeApis(receiverName, functionNames) {
	
		if (eval("typeof " + receiverName) === "undefined") {
			return;
		}
		
		var prototype = eval(receiverName + ".prototype");
		
		if (!prototype) {
			return;
		}
		
		for (var i = 0, functionName; functionName = functionNames[i]; i++) {
			
			if (!prototype[functionName]) {
				continue;
			}
			
			profiler.add(prototype, prototype[functionName], receiverName, functionName);
		}
	}
	
	function profileStaticApis(receiverName, functionNames) {
		
		if (eval("typeof " + receiverName) === "undefined") {
			return;
		}
		
		var receiver = eval(receiverName);
		
		for (var i = 0, functionName; functionName = functionNames[i]; i++) {
			
			if (!receiver[functionName]) {
				continue;
			}
			
			profiler.add(receiver, receiver[functionName], receiverName, functionName);
		}
	}
	
//	// アプリケーション共通モジュール API
//	// （Webに設定すると無限ループになる？ので除外）
//	profileStaticApis("Archiver", [ "zip", "unzip" ]);
//	profileInstancializeApis("BatchManager", [ "exportData", "getExportCategories", "getImportCategories", "importData", "isUpdate", "addBatch", "deleteBatch", "deleteBatches", "getBatch", "getBatches", "getBatchesByIds", "getBatchIds", "updateBatch" ]);
//	profileInstancializeApis("BatchServer", [ "isConnected", "start", "restart", "stop", "setRefresh", "getRefresh", "isRun", "executeBatchProgram" ]);
//	profileStaticApis("CSVParser", [ "parse" ]);
//	profileStaticApis("Client", [ "destroy", "get", "identifier", "keys", "life", "remove", "removeSession", "set", "sleep" ]);
//	profileStaticApis("Content", [ "executeFunction" ]);
//	profileInstancializeApis("Content", [ "execute", "isError", "toString", "getFunction" ]);
//	profileInstancializeApis("DOMAttribute", [ "getName", "getValue", "getParentNode", "toString" ]);
//	profileInstancializeApis("DOMDocument", [ "getDocumentElement", "getElementsByTagName", "getElementById", "createElement", "createTextNode", "getDoctype", "isError", "getErrorMessage" ]);
//	profileInstancializeApis("DOMDocumentType", [ "getName", "getPublicId", "getSystemId", "getInternalSubset", "getEntities", "getNotations", "toString" ]);
//	profileInstancializeApis("DOMEntity", [ "getPublicId", "getSystemId", "toString" ]);
//	profileInstancializeApis("DOMNode", [ "getName", "getValue", "appendChild", "cloneNode", "getAttribute", "getAttributes", "hasAttribute", "hasAttributes", "hasChildNodes", "getChildNodes", "insertBefore", "normalize", "getParentNode", "getNodeType", "removeAttribute", "removeChild", "replaceChild", "setAttribute", "getTagName", "toString" ]);
//	profileInstancializeApis("DOMNotation", [ "getPublicId", "getSystemId", "toString" ]);
//	profileInstancializeApis("DataSourceMappingConfigurater", [ "bindSystemDatabase", "bindLoginGroupDatabase", "rebindSystemDatabase", "rebindLoginGroupDatabase", "unbindSystemDatabase", "unbindLoginGroupDatabase", "getDataSourceMappingInfos", "getSystemDatabaseMappingInfos", "getLoginGroupDatabaseMappingInfos", "getSystemDatabaseMappingInfo", "getLoginGroupDatabaseMappingInfo" ]);
//	profileStaticApis("DatabaseExport", [ "getMonitor", "downloadCSV", "exportCSV", "setNullValue", "setColumnsInfo", "setSleepInterval", "setDetectionTimeOut", "setExportEncoding", "discontinue", "getExecutingLineNumber", "addCSVHeaderText", "setFieldNames" ]);
//	profileInstancializeApis("DatabaseExport", [ "execute", "add", "setExportOptionsXmlString", "getExportOptionsXmlString", "setMonitor", "includeImportOptions", "getDefaultExportFileName" ]);
//	profileStaticApis("DatabaseImport", [ "getMonitor", "listenerSkip", "listenerError", "listenerDelete", "listenerTerminate" ]);
//	profileInstancializeApis("DatabaseImport", [ "execute", "add", "setMonitor", "addString", "getListenerNames", "getImportOptionsXmlString", "setExplicitFile", "setImportOptionsXmlString", "setListener" ]);
//	profileStaticApis("DatabaseManager", [ "remove", "execute", "select", "fetch", "execStoredFunc", "execStoredProc", "beginTransaction", "isTransaction", "commit", "dateToString", "getConnectIdsBySystem", "getCount", "getDataSourceNameByLoginGroup", "getLogDataSourceNameByLoginGroup", "getLogConnectIdByLoginGroup", "getDataSourceNameBySystem", "getDbName", "getDbVersion", "getEscape", "getMax", "getMin", "getStoredArg", "insert", "isColumn", "isConnect", "rollback", "stringToDate", "update", "getSystemDatabaseType", "getGroupDatabaseType", "isSQLServer2000", "setSQLServer2000", "isFastFetch", "setFastFetch", "isPreparedModify", "setPreparedModify" ]);
//	profileStaticApis("Debug", [ "write", "browse", "print", "console" ]);
//	profileInstancializeApis("Drawer", [ "clearClip", "copyArea", "draw3DRect", "drawArc", "drawLine", "drawOval", "drawPolygon", "drawRect", "drawRoundRect", "drawString", "fill3DRect", "fillArc", "fillOval", "fillPolygon", "fillRect", "fillRoundRect", "getColor", "getFontName", "getFontSize", "getFontStyle", "getLineSize", "getLineStyle", "putImage", "setClipArc", "setClipPolygon", "setClipRect", "setColor", "setFontName", "setFontSize", "setFontStyle", "setLineSize", "setLineStyle" ]);
//	profileInstancializeApis("EventNavigatorManager", [ "exportData", "importData", "getEventFlowInfos", "deleteEventFlow", "getEventFlow", "registEventFlow", "copyEventFlow", "getEventItemInfo", "getEventResultItemInfo", "addEventResultItemInfo", "getSaveEventResultItemInfo", "updateEventResultItemInfo", "updateEventResultItemInfoTitle", "getSaveEventResultItemInfos", "removeSaveEventResultItemInfo", "addFavoriteSaveEventResultItemInfo", "getSaveEventResultItemInfosHistory", "updateEventFlow", "setOrderSortNum", "setViewOpen", "getLinkPageInfo", "getSaveLinkPageInfo", "getConfigPageCount", "setConfigPageCount" ]);
//	profileStaticApis("ExtendsImportManager", [ "doImport" ]);
//	profileStaticApis("File", [ "createTempFile" ]);
//	profileInstancializeApis("File", [ "append", "directories", "exist", "files", "isDirectory", "isFile", "isRead", "isWrite", "lastModified", "load", "makeDirectories", "makeDirectory", "move", "path", "read", "remove", "save", "size", "write" ]);
//	profileStaticApis("Format", [ "get", "fromDate", "toDate", "fromNumber", "toMoney" ]);
//	profileStaticApis("Identifier", [ "get" ]);
//	profileStaticApis("ImAjaxUtil", [ "setErrorResponseHeaders" ]);
//	profileInstancializeApis("ImageIconManager", [ "isDuplicateSrc", "setDuplicateSrc", "getGroupImageIcons", "getUserImageIcons", "getImageIcon", "addGroupImageIcon", "addUserImageIcon", "existImageIcon", "existGroupImageIconBySrc", "existUserImageIconBySrc", "deleteGroupImageIcons", "deleteUserImageIcons", "deleteImageIcon", "existGroupImageIcons", "existUserImageIcons", "updateGroupImageIcon", "updateUserImageIcon" ]);
//	profileStaticApis("Imart", [ "defineType", "execute", "compile", "defineAttribute", "getType", "isType" ]);
//	profileInstancializeApis("InnerText", [ "execute" ]);
//	profileInstancializeApis("JsTestSuite", [ "addTest" ]);
//	profileStaticApis("JsUnit", [ "execute", "loadScriptModule", "assert", "assertTrue", "assertFalse", "assertEquals", "assertNotEquals", "assertNull", "assertNotNull", "assertNaN", "assertNotNaN", "assertUndefined", "assertNotUndefined" ]);
//	profileStaticApis("Lock", [ "isValid", "begin", "beginRequestScope", "end", "entry", "isLocked" ]);
//	profileStaticApis("Logger", [ "getLogger" ]);
//	profileInstancializeApis("Logger", [ "error", "error", "error", "error", "error", "warn", "warn", "warn", "warn", "warn", "info", "info", "info", "info", "info", "debug", "debug", "debug", "debug", "debug", "trace", "trace", "trace", "trace", "trace" ]);
//	profileStaticApis("LoggerMDC", [ "get", "remove", "put", "clear" ]);
//	profileInstancializeApis("MailSender", [ "send", "setFrom", "setSubject", "getErrorMessage", "addAttachment", "addBcc", "addCc", "addTo", "addHeader", "addReplyTo", "setText" ]);
//	profileStaticApis("ParameterManager", [ "getParameter", "getParameterNames" ]);
//	profileStaticApis("Permanent", [ "entries" ]);
//	profileInstancializeApis("Permanent", [ "move", "remove", "get", "set", "extinction", "elements", "keys" ]);
//	profileInstancializeApis("PluginDescriptor", [ "createInstance", "createNodeInstance", "createInstances", "getGroups", "getId", "getName", "getNode", "getRank", "getTarget", "getVersion", "isBefore", "isEnable", "getXmlString" ]);
//	profileInstancializeApis("PluginManager", [ "clear", "getPluginDescriptor", "getPluginDescriptors", "getExtensionPoints", "containsPoint" ]);
//	profileInstancializeApis("ResinDataSourceConfigurater", [ "bind", "rebind", "unbind", "getResinDataSourceInfos", "getResinDataSourceInfo", "connectionConfirm" ]);
//	profileInstancializeApis("SOAPFault", [ "throwFault" ]);
//	profileStaticApis("System", [ "isTrue", "getValue", "addSuperUser", "defineProperty", "getClientType", "getClientTypes", "getColorPattern", "getColorPatterns", "getDefaultClientType", "getDefaultColorPatternId", "getDefaultLocale", "getFloat", "getInteger", "getLocale", "getLocales", "getSuperUser", "isFalse", "isValid", "read", "updateSuperUser", "getSystemMenu", "getSystemMinDate", "getSystemMaxDate", "existClientType", "getClientTypesByAttribute", "existLocale", "existColorPatternId", "existLoginType", "getLoginTypes", "getDefaultLoginType" ]);
//	profileStaticApis("URL", [ "encode", "decode", "createSessionURL" ]);
//	profileInstancializeApis("URL", [ "absoluteLocation", "location", "getArgument", "setArgument", "setLabel", "setAction" ]);
//	profileStaticApis("Unicode", [ "from", "to" ]);
//	profileInstancializeApis("VirtualFile", [ "append", "directories", "exist", "files", "isDirectory", "isFile", "lastModified", "load", "makeDirectories", "move", "path", "read", "remove", "save", "size", "write", "lists" ]);
//	profileStaticApis("WSAuthDigestGenerator4WSSE", [ "getAuthType", "getDigest" ]);
//	profileInstancializeApis("XMLDocument", [ "isError", "getXmlString", "getDocumentElement", "getElementsByTagName", "getElementById", "createElement", "createTextNode", "getDoctype" ]);
//	profileInstancializeApis("XMLParser", [ "isError", "parse", "parseString", "getErrorMessage" ]);
//	profileStaticApis("Batch", [ "entries" ]);
//	profileInstancializeApis("Batch", [ "remove", "get", "set", "extinction", "elements", "keys" ]);
//	profileStaticApis("Mail", [ "getSMTPServer", "sendMail", "setSMTPServer" ]);
//	profileInstancializeApis("Mail", [ "attachFile", "badAdress", "getErrCode", "getErrMessage", "getSMTPSrv", "send", "sendByTempl", "setAttachment", "setBcc", "setBody", "setCc", "setFrom", "setHeader", "setReplyTo", "setSmtpServer", "setSubject", "setTo" ]);
//	
//	// アクセスセキュリティモジュール API
//	profileInstancializeApis("AccessControllerManager", [ "addControllerDepartment", "addController", "addControllerPost", "addControllerPublicGroup", "addControllerRole", "deleteController", "deleteControllerDepartment", "deleteControllerDepartments", "deleteControllerPost", "deleteControllerPosts", "deleteControllerPublicGroup", "deleteControllerPublicGroups", "deleteControllerRole", "deleteControllerRoles", "deleteControllers", "exportData", "getController", "getControllerDepartments", "getControllerIds", "getControllerIdsByDepartment", "getControllerIdsByPost", "getControllerIdsByPublicGroup", "getControllerIdsByRole", "getControllerIdsByUser", "getControllerPosts", "getControllerPublicGroups", "getControllerRoles", "getControllers", "getExportCategories", "getImportCategories", "getLoginGroupId", "importData", "updateController", "isUpdate" ]);
//	profileStaticApis("AccessSecurityManager", [ "createLoginRequestInfo", "certification", "forceLogin", "login", "createUrlSignature", "getCookieSessionInfo", "getErrorPageUrl", "getErrorPage", "getInitialPageUrl", "getInitialPage", "getLoginCertification", "getMainPageUrl", "getMainPage", "getSessionConfig", "getSessionInfo", "getSessionMode", "forward", "logout", "getMobileUserAgent", "decrypt", "encrypt", "createSignature", "checkSignature" ]);
//	profileInstancializeApis("AccountManager", [ "exportData", "getExportCategories", "getImportCategories", "getLoginGroupId", "importData", "isUpdate", "addAccount", "addAccountRole", "addFavoriteMenu", "contains", "count", "del", "deleteAccount", "deleteAccountRole", "deleteAccountRoles", "deleteAccounts", "deleteFavoriteMenu", "deleteFavoriteMenus", "get", "getAccount", "getAccountRoleIds", "getAccountRoles", "getAccounts", "getAccountsByUserIds", "getFavoriteMenuIds", "getFavoriteMenus", "getKeys", "getRoleIds", "getUserIds", "getUserIdsByAccountRole", "getUserIdsByRole", "searchAccounts", "set", "updateAccount", "updateAccountRole", "updateFavoriteMenu", "getAttribute", "getAttributeNames", "setAttribute", "deleteAttribute", "getUserIdsByAttribute" ]);
//	profileInstancializeApis("ActiveSessionManager", [ "count", "isObservable", "addActiveSessionInfo", "removeActiveSessionInfo", "destory", "invalidate", "isValid", "isLogined", "getActiveSessionInfos", "getActiveSessionInfo", "hasActiveSessionInfo", "getInvalidatedActiveSessionInfo", "searchActiveSessionInfosByUserId", "getActiveSessionBindingListenerSessionName", "updateToProcessing", "updateLastResponseTime", "distinctNavigator" ]);
//	profileStaticApis("AdminMenuManager", [ "addMenuItem", "deleteMenuItem", "deleteMenuItems", "getChildMenuIds", "getFirstMenuIds", "getMenuIds", "getMenuItem", "getMenuItems", "getMenuTree", "getLoginGroupMenuTree", "getParentMenuId", "moveMenuItem", "updateMenuItem", "getImportCategories", "getExportCategories", "importData", "exportData", "addMenuLoginGroup", "deleteMenuLoginGroup", "getMenuLoginGroups", "getMenuIdsByLoginGroup", "getMenuItemsByIds", "setAccessControlEnabled", "isAccessControlEnabled" ]);
//	profileInstancializeApis("AdminUserManager", [ "exportData", "getExportCategories", "getImportCategories", "importData", "isUpdate", "setMenus", "clearMenusByUserId", "clearMenusByMenuId", "registerAdminUser", "isRegisterAdminUser", "getAdminUsers", "deleteAdminUser", "getMenuIdsByUserId", "getUserIdsByMenuId", "getAdminUserMenuTree" ]);
//	profileInstancializeApis("CalendarManager", [ "exportData", "getExportCategories", "getImportCategories", "getLoginGroupId", "importData", "isUpdate", "isWeekday", "addCalendarInfo", "deleteCalendar", "deleteCalendarInfo", "deleteCalendarInfos", "deleteCalendars", "getCalendarIds", "getCalendarInfo", "getCalendarInfoIds", "getCalendarInfos", "getCalendarInfosByIds", "getDayInfo", "getDefaultCalendarId", "getMonthInfos", "getPluginIds", "isHoliday", "isNationalHoliday", "updateCalendarInfo", "validatePlugin" ]);
//	profileInstancializeApis("DuplicateLoginManager", [ "isDuplicateLogined", "isDetectEnable", "isInvalidatableByUser", "getRequestedPageAttributeName", "getInvalidateOtherSessionsAttributeName", "isInitialPageSessionHandleable" ]);
//	profileStaticApis("LicenseManager", [ "getProduct", "getApplication", "getApplicationLicense", "getApplications", "getSystemLicense", "getSystemMaxLicense" ]);
//	profileInstancializeApis("LicenseManager", [ "deleteAccountLicense", "deleteApplicationLicenseFromAccount", "getLicense", "getMaxLicense", "getRegisteredAccountLicenses", "getRegisteredApplicationLicensesToAccount", "isRegisteredAccountLicense", "isRegisteredApplicationLicenseToAccount", "registerAccountLicense", "registerApplicationLicenseToAccount", "setMaxLicense", "setLoginGroupMaxApplicationLicense", "getLoginGroupMaxApplicationLicense", "getLoginGroupApplicationLicense" ]);
//	profileInstancializeApis("LoginBlockManager", [ "isBlockaded", "release", "blockage" ]);
//	profileStaticApis("LoginGroupManager", [ "addLoginGroup", "addMainPagePattern", "addSuperUser", "countLoginGroup", "deleteLoginGroup", "deleteMainPagePattern", "deleteMainPagePatterns", "deleteSuperUser", "getLoginGroup", "getLoginGroupIds", "getLoginGroups", "getMainPagePattern", "getMainPagePatternIds", "getMainPagePatterns", "getSuperUser", "updateLoginGroup", "updateMainPagePattern", "updateSuperUser" ]);
//	profileInstancializeApis("MenuControlManager", [ "isUpdate", "setStoppedMenus", "clearStoppedMenus", "clearStoppedMenuByMenuId", "isStoppedMenu", "isEnable", "getStoppedMenuInfo", "getStoppedMenuPage" ]);
//	profileInstancializeApis("MenuManager", [ "exportData", "getExportCategories", "getImportCategories", "getLoginGroupId", "importData", "isUpdate", "addMenuDepartment", "addMenuItem", "addMenuPost", "addMenuPublicGroup", "addMenuRole", "deleteMenuDepartment", "deleteMenuDepartments", "deleteMenuItem", "deleteMenuItems", "deleteMenuPost", "deleteMenuPosts", "deleteMenuPublicGroup", "deleteMenuPublicGroups", "deleteMenuRole", "deleteMenuRoles", "getAccountMenuTree", "getChildMenuIds", "getFirstMenuIds", "getMenuDepartments", "getMenuIds", "getMenuIdsByDepartment", "getMenuIdsByPost", "getMenuIdsByPublicGroup", "getMenuIdsByRole", "getMenuItem", "getMenuItems", "getMenuItemsByIds", "getMenuPosts", "getMenuPublicGroups", "getMenuRoles", "getMenuTree", "getParentMenuId", "moveMenuItem", "updateMenuItem" ]);
//	profileStaticApis("MessageManager", [ "getMessage", "getLocaleMessage" ]);
//	profileInstancializeApis("PasswordHistoryManager", [ "addPasswordHistory", "checkPasswordHistory", "clearPasswordHistories", "clearPasswordHistory", "getPasswordHistories", "getPasswordHistoryCount", "getLatestPasswordHistory", "isPasswordExpired", "getPasswordHistoryManagedCount", "getPasswordPage", "isForwardInitialPage", "isPasswordHistoryManaged", "verifyPasswordHistory", "createPassword", "isChangePasswordFirstLogin", "isFirstLogin", "isDenyClientType", "getPasswordExpireLimit", "setFirstLogin" ]);
//	profileInstancializeApis("PasswordReminderManager", [ "isUpdate", "getShortCutUrl", "isEnabled", "getMailInfo" ]);
//	profileInstancializeApis("PermissionManager", [ "getCategories", "doSelection" ]);
//	profileInstancializeApis("RoleManager", [ "exportData", "getExportCategories", "getImportCategories", "getLoginGroupId", "importData", "isUpdate", "contains", "count", "del", "get", "getKeys", "getRoleIds", "set", "getCategories", "addRole", "addSubRole", "certify", "containsCategory", "countByCategory", "deleteCategories", "deleteCategory", "deleteRole", "deleteRoles", "deleteSubRole", "deleteSubRoles", "getAllParentRoleIds", "getAllSubRoleIds", "getIdByName", "getList", "getParentRoleIds", "getParents", "getRole", "getRoles", "getRolesByCategory", "getRolesByIds", "getSubRole", "moveCategory", "searchRolesById", "searchRolesByName", "updateRole" ]);
//	profileInstancializeApis("ShortCutManager", [ "createShortCut", "deleteShortCut", "verifyShortCut", "getShortCutInfo", "getErrorPage", "getMainPage", "addValidEndDate", "isAllowUser" ]);
//	profileInstancializeApis("UpdateManager", [ "getKeys", "getLastModified", "isUpDate", "modify", "remove", "removeAll" ]);
//	profileInstancializeApis("WSAccessManager", [ "exportData", "getExportCategories", "getImportCategories", "getLoginGroupId", "importData", "isUpdate", "addWSAccess", "addWSAccessRole", "deleteWSAccess", "deleteWSAccessRole", "deleteWSAccessRoles", "deleteWSAccesses", "getWSAccess", "getWSAccessesByRole", "getWSAccessesByUser", "getWSAccessRoles", "getWSAccesses", "updateWSAccess" ]);
//
//	// アプリケーション共通マスタ API
//	profileInstancializeApis("CategoryManager", [ "addCategoryDetail", "updateCategoryDetail", "deleteCategoryDetail", "getCategoryDetail", "getCategoryDetails" ]);
//	profileInstancializeApis("CompanyManager", [ "addCompany", "addDepartment", "addPost", "addVersion", "copyVersion", "deleteCompany", "deleteDepartment", "deleteMember", "deletePost", "deleteVersion", "getDepartmentStructs", "joinDepartment", "leaveDepartment", "moveDepartment", "removeCategoryDetail", "removeMain", "setCategoryDetail", "setMain", "setMember", "updateDepartment", "updatePost", "updateVersion", "getPostsInCompany", "getPostsOfUser", "getVersion", "getDepartment", "getDepartmentAttach", "getDepartmentMain", "getMember", "getAttachedDepartments" ]);
//	profileInstancializeApis("CurrencyManager", [ "getSystemCurrencyCode", "getCurrencyCodes", "getCurrencyName" ]);
//	profileInstancializeApis("DealManager", [ "addDeal", "updateDeal", "deleteDeal", "getDeal", "getDeals", "getDealsByKey", "getUsersDeals", "getUsersDealsByKey" ]);
//	profileInstancializeApis("DealPermissionManager", [ "setPermissionToDepartment", "setPermissionToPublicGroup", "setPermissionToRole", "removePermissionFromDepartment", "removePermissionFromPublicGroup", "removePermissionFromRole", "getDepartments", "getPublicGroups", "getRoles" ]);
//	profileInstancializeApis("ItemCategoryManager", [ "addCategory", "updateCategory", "deleteCategory", "setItem", "removeItem", "getCategoryTypes", "getCategoryStruct", "getCategory", "getCategorizedItems", "getAllCategorizedItems", "isEndCategory" ]);
//	profileInstancializeApis("ItemManager", [ "addItem", "updateItem", "deleteItem", "setCatalogue", "deleteCatalogue", "getCatalogueMediaFileName", "getItems", "getItem", "getItemsByKey", "getCatalogue", "getCatalogues", "setAttribute", "removeAttribute", "getAttributes" ]);
//	profileInstancializeApis("ItemTemplateManager", [ "addTemplate", "updateTemplate", "deleteTemplate", "setTemplateDetail", "deleteTemplateDetail", "getTemplates", "getTemplate", "getTemplateDetail" ]);
//	profileInstancializeApis("ItemUnitManager", [ "getUnits", "getUnitName", "addUnit", "updateUnit", "deleteUnit", "getUnitCode" ]);
//	profileInstancializeApis("PrivateGroupManager", [ "deleteMember", "setMember", "getMember", "addPrivateGroup", "deletePrivateGroup", "updatePrivateGroup", "getPrivateGroup", "getPrivateGroups" ]);
//	profileInstancializeApis("PublicGroupManager", [ "addVersion", "copyVersion", "deleteMember", "deleteVersion", "removeCategoryDetail", "setCategoryDetail", "setMember", "updateVersion", "getVersion", "getMember", "addGroupSet", "addPublicGroup", "deleteGroupSet", "deletePublicGroup", "getPublicGroupStructs", "joinPublicGroup", "leavePublicGroup", "movePublicGroup", "updatePublicGroup", "getPublicGroup", "getAttachedPublicGroups", "getPublicGroupAttach" ]);
//	profileStaticApis("TermManager", [ "validateTerm", "validateTerms", "getMinDate", "getMaxDate", "subtract", "getOverlap" ]);
//	profileInstancializeApis("UserManager", [ "addUser", "deleteUser", "updateUser", "getUser" ]);
//	
//	// ワークフローモジュール API (BPW)
//	profileInstancializeApis("UserTransaction", [ "begin", "commit", "getStatus", "rollback", "setRollbackOnly", "setTransactionTimeout", "setLoginGroupId" ]);
//	profileInstancializeApis("WkfAgentSetting", [ "noTransaction", "getTransferInfo", "getTransferProcessDefList", "getTransferVersionList", "getTransferActivityList", "setAgent", "cancelAgent" ]);
//	profileInstancializeApis("WkfApprover", [ "noTransaction", "approve", "denial", "suspend", "sendBack", "pullBack", "getActivityTaskList", "getEndTaskList", "getTargetDepartment" ]);
//	profileInstancializeApis("WkfDrafter", [ "noTransaction", "pullBack", "getTargetDepartment", "draft", "retry", "cancel", "getActivityProcessDefList", "getEndProcessList", "subProcessDraft" ]);
//	profileInstancializeApis("WkfMailSettingBehavior", [ "reserveRequest", "reserveCancel", "stopRequest", "stopCancel", "setTamplateRequest", "send", "getResult", "setStopMail", "remove" ]);
//	profileInstancializeApis("WkfManager", [ "noTransaction", "exportProcessDef", "getActivityInfo", "getCategoryInfo", "getCategoryInfoByName", "getFlowInfo", "getFlowInfoByTargetNo", "getProcessDefInfo", "getProcessDefInfoByName", "getProcessDefInfoByVersion", "getProcessDefInfoByCategory", "getProcessList", "getVersionInfo", "importProcessDef", "removeProcess", "controlProcess", "registProcessDef", "addVersion" ]);
//	profileInstancializeApis("WkfProcess", [ "getFileList", "getProcessHistory", "hasNext", "next", "getFlow", "getProcessInfo", "getTaskResultInfo", "getApplicationKeys" ]);
//	profileInstancializeApis("WkfReference", [ "getReferTaskList" ]);
//	profileInstancializeApis("WkfSearchCondition", [ "setCondition" ]);
//	profileInstancializeApis("WkfSort", [ "setAscending", "setDescending" ]);
//	profileInstancializeApis("WkfTaskInfo", [ "noTransaction", "getTargetRunInfo", "getTargetReferInfo", "changeRunUser" ]);
//	profileInstancializeApis("WkfUtil", [ "autoPass", "autoPress", "sendMail" ]);
//
//	// FormatCreator API
//	profileInstancializeApis("FcApplication", [ "getApplicationDataItem", "getApplicationData", "getApplicationDataList", "getPDFData", "getApplicationBasicData" ]);
//	profileInstancializeApis("FcSwitchPostScriptFlag", [ "changePostScriptFlag" ]);
//
//	// ポータル API
//	profileInstancializeApis("ActionRequest", [ "getParameter", "getParameterValue", "getParameterValues", "getAttribute", "getAttributeNames", "setAttribute", "getPortletMode", "removeAttribute", "getWindowState", "getWindowID", "toString" ]);
//	profileInstancializeApis("ActionResponse", [ "sendRedirect", "setPortletMode", "getPortletMode", "setRenderParameter", "setWindowState", "getWindowState", "setEvent", "toString" ]);
//	profileInstancializeApis("EventRequest", [ "getParameter", "getParameterValue", "getParameterValues", "getAttribute", "getAttributeNames", "setAttribute", "getPortletMode", "getWindowState", "removeAttribute", "getWindowID", "toString" ]);
//	profileInstancializeApis("EventResponse", [ "setPortletMode", "getPortletMode", "setRenderParameter", "setWindowState", "getWindowState", "setEvent", "toString" ]);
//	profileStaticApis("PortalManager", [ "getRenderResponse", "getRenderRequest", "createActionURL", "createRenderURL", "createResourceURL", "getPortletId", "setHeader", "removeHeader" ]);
//	profileInstancializeApis("PortletManager", [ "setPortlet", "deletePortlet", "getPortlet", "getPortlets" ]);
//	profileInstancializeApis("RenderRequest", [ "getParameter", "getParameterValue", "getParameterValues", "getAttribute", "getAttributeNames", "setAttribute", "getPortletMode", "getWindowState", "removeAttribute", "getWindowID", "toString" ]);
//	profileInstancializeApis("RenderResponse", [ "createActionURL", "createRenderURL", "createResourceURL", "setTitle", "toString" ]);
//	
//	
//	// マスカット連携モジュール API
//	profileInstancializeApis("MKError", [ "setErrorCode", "setMessageCode", "setMessage", "setInfo", "setSystemErrorMessage" ]);
//	profileInstancializeApis("MKErrors", [ "addError", "size" ]);
//	profileInstancializeApis("StandardImmkError", [ "setMessage", "setId" ]);
//	profileInstancializeApis("StandardImmkErrors", [ "addError", "size" ]);
//
//	// BPM API
//	profileInstancializeApis("AnswerManager", [ "setTargetRecordNumber4Answer", "setAnswerSortKeys", "getAnswerCount", "getAnswer", "searchAnswers", "searchAnswersFromQuestionnaireName", "searchNotBelongProcessAnswer", "searchMatchOwner", "searchNotBelongProcess", "searchUnanswers", "getAnswerChoices", "registAnswer", "removeAnswer", "getAnswerRates", "getUserCodes", "delivery" ]);
//	profileInstancializeApis("NoticeProgressManager", [ "addBpmsProcess", "addNoticeTask", "updateProcessStatus", "updateNoticeTaskStatus", "updateNoticeTask", "getProcessProgresses", "setProgressSortCondition", "getProcessProgressCount", "getTaskProgresses", "deleteProgress", "isCompleteProcessInstance", "getDiagramUrl" ]);
//	profileInstancializeApis("ProgressManagerExtension", [ "setProcessBusinessData", "setTaskBusinessData" ]);
//	profileInstancializeApis("QuestionManager", [ "setTargetRecordNumber4QuestionMaster", "setQuestionMasterSortKeys", "searchQuestionCategories", "searchQuestionMasters", "searchQuestionMastersWithOr", "getQuestionMaster", "getQuestionChoiceMasters", "registQuestionMaster", "removeQuestionMaster", "removeQuestionMasters", "getTotalQuestionMasterCount", "setTargetRecordNumber4Questionnaire", "setQuestionnaireSortKeys", "searchQuestionnaires", "getQuestionnaire", "getQuestionnaires", "getQuestions", "registQuestionnaire", "removeQuestionnaire", "removeQuestionnaires", "getTotalQuestionnaireCount" ]);
//	profileInstancializeApis("TaskManager", [ "getTask", "getTaskList", "getTaskCount", "getInitialTaskList", "getActivityTaskList", "getNotificationTaskList", "getCompletedTaskList", "init", "save", "claim", "revoke", "complete", "claimAndComplete", "dismiss" ]);
//	profileInstancializeApis("TokenManager", [ "createToken", "getBPMSUser" ]);
//	profileStaticApis("WSAuthDigestGenerator4BPMS", [ "getAuthType", "getDigest" ]);
//	profileInstancializeApis("WorkflowTaskManager", [ "complete", "getWorkflowTask", "store" ]);
//	
//	// IM-共通マスタ API
//	profileInstancializeApis("AppCmnSearchCondition", [ "addCondition", "addConditionAsTarget", "addConditionAsTargetWithIndex", "addConditionWithIndex", "addIsNotNull", "addIsNotNullAsTarget", "addIsNotNullAsTargetWithIndex", "addIsNotNullWithIndex", "addIsNull", "addIsNullAsTarget", "addIsNullAsTargetWithIndex", "addIsNullWithIndex", "addLike", "addLikeAsTarget", "addLikeAsTargetWithIndex", "addLikeWithIndex", "addNotLike", "addNotLikeAsTarget", "addNotLikeAsTargetWithIndex", "addNotLikeWithIndex", "addOrder", "addOrderAsTarget", "addOrderAsTargetWithIndex", "addOrderWithIndex", "copy", "createConditionSection", "createWhereSection", "getConditionCount", "getConditions", "getDeleteSqlStatement", "getLogicalOperetor", "getOrders", "getParameters", "getSearchTargetValues", "getSortDirection", "isUseLike", "setLogicalOperetor", "setSearchTargetValues", "setSortDirection" ]);
//	profileInstancializeApis("AppCommonManager", [ "getSystemEndDate", "getSystemStartDate", "setSystemStartDate" ]);
//	profileInstancializeApis("IMMCompanyGroupManager", [ "changeCompanyGroupSetState", "countCompanyGroup", "countCompanyGroupWithCompany", "countCompanyWithCompanyGroup", "countCompanyWithCompanyGroupTree", "countTreeRoot", "getAbsoluteBranch", "getAbsoluteChildren", "getAbsoluteIsolation", "getAbsoluteTree", "getBranch", "getChildren", "getCompanyAttachTerm", "getCompanyAttachTermList", "getCompanyGroup", "getCompanyGroupList", "getCompanyGroupSet", "getCompanyGroupSetAll", "getCompanyGroupTerm", "getCompanyGroupTermList", "getFullPathListNode", "getIsolation", "getTree", "getTreeTerm", "getTreeTermList", "listCompanyGroup", "listCompanyGroupWithCompany", "listCompanyWithCompanyGroup", "listCompanyWithCompanyGroupTree", "listTreeRoot", "mergeBackwardTermCompanyAttach", "mergeBackwardTermCompanyGroup", "mergeBackwardTermCompanyGroupSet", "mergeForwardTermCompanyAttach", "mergeForwardTermCompanyGroup", "mergeForwardTermCompanyGroupSet", "moveTermCompanyAttach", "moveTermCompanyGroup", "moveTermCompanyGroupSet", "removeCompanyAttach", "removeCompanyGroup", "removeCompanyGroupInclusion", "removeCompanyGroupSet", "searchCompanyGroup", "searchCompanyGroupWithCompany", "searchCompanyWithCompanyGroup", "searchCompanyWithCompanyGroupTree", "searchTreeRoot", "separateTermCompanyAttach", "separateTermCompanyGroup", "separateTermCompanyGroupSet", "setCompanyAttach", "setCompanyGroup", "setCompanyGroupInclusion", "totalCompanyGroup", "totalCompanyGroupWithCompany", "totalCompanyWithCompanyGroup", "totalCompanyWithCompanyGroupTree", "totalTreeRoot", "updateCompanyGroupSet" ]);
//	profileInstancializeApis("IMMCompanyManager", [ "changeDepartmentSetState", "countCompany", "countCompanyPost", "countCompanyPostWithUser", "countCompanyPostWithUserOnDepartment", "countDepartment", "countDepartmentCategory", "countDepartmentCategoryItem", "countDepartmentCategoryItemWithDepartment", "countDepartmentWithDepartmentCategoryItem", "countDepartmentWithUser", "countTreeRoot", "countUserWithCompanyPost", "countUserWithCompanyPostOnDepartment", "countUserWithDepartment", "countUserWithDepartmentTree", "getAbsoluteBranch", "getAbsoluteChildren", "getAbsoluteIsolation", "getAbsoluteTree", "getBranch", "getChildren", "getCompany", "getCompanyAll", "getCompanyPost", "getCompanyPostAttachTerm", "getCompanyPostAttachTermList", "getCompanyPostList", "getCompanyPostTerm", "getCompanyPostTermList", "getDepartment", "getDepartmentCategory", "getDepartmentCategoryItem", "getDepartmentCategoryItemAttachTerm", "getDepartmentCategoryItemAttachTermList", "getDepartmentList", "getDepartmentSet", "getDepartmentSetAll", "getDepartmentSetWithCompany", "getDepartmentTerm", "getDepartmentTermList", "getFullPathListNode", "getIsolation", "getTree", "getTreeTerm", "getTreeTermList", "getUserAttachTerm", "getUserAttachTermList", "listCompany", "listCompanyPost", "listCompanyPostWithUser", "listCompanyPostWithUserOnDepartment", "listDepartment", "listDepartmentCategory", "listDepartmentCategoryItem", "listDepartmentCategoryItemWithDepartment", "listDepartmentWithDepartmentCategoryItem", "listDepartmentWithUser", "listTreeRoot", "listUserWithCompanyPost", "listUserWithCompanyPostOnDepartment", "listUserWithDepartment", "listUserWithDepartmentTree", "mergeBackwardTermCompanyPost", "mergeBackwardTermDepartment", "mergeBackwardTermDepartmentSet", "mergeBackwardTermUserAttach", "mergeForwardTermCompanyPost", "mergeForwardTermDepartment", "mergeForwardTermDepartmentSet", "mergeForwardTermUserAttach", "moveTermCompanyPost", "moveTermDepartment", "moveTermDepartmentSet", "moveTermUserAttach", "removeCompany", "removeCompanyPost", "removeCompanyPostAttach", "removeDepartment", "removeDepartmentCategory", "removeDepartmentCategoryItem", "removeDepartmentCategoryItemAttach", "removeDepartmentInclusion", "removeDepartmentSet", "removeUserAttach", "searchCompany", "searchCompanyPost", "searchCompanyPostWithUser", "searchCompanyPostWithUserOnDepartment", "searchDepartment", "searchDepartmentCategory", "searchDepartmentCategoryItem", "searchDepartmentCategoryItemWithDepartment", "searchDepartmentWithDepartmentCategoryItem", "searchDepartmentWithUser", "searchTreeRoot", "searchUserWithCompanyPost", "searchUserWithCompanyPostOnDepartment", "searchUserWithDepartment", "searchUserWithDepartmentTree", "separateTermCompanyPost", "separateTermDepartment", "separateTermDepartmentSet", "separateTermUserAttach", "setCompanyPost", "setCompanyPostAttach", "setDepartment", "setDepartmentCategory", "setDepartmentCategoryItem", "setDepartmentCategoryItemAttach", "setDepartmentInclusion", "setUserAttach", "totalCompany", "totalCompanyPost", "totalCompanyPostWithUser", "totalCompanyPostWithUserOnDepartment", "totalDepartment", "totalDepartmentCategory", "totalDepartmentCategoryItem", "totalDepartmentCategoryItemWithDepartment", "totalDepartmentWithDepartmentCategoryItem", "totalDepartmentWithUser", "totalTreeRoot", "totalUserWithCompanyPost", "totalUserWithCompanyPostOnDepartment", "totalUserWithDepartment", "totalUserWithDepartmentTree", "updateCompany", "updateDepartmentSet" ]);
//	profileInstancializeApis("IMMCorporationManager", [ "changeCorporationSetState", "countCorporation", "countCorporationWithCustomer", "countCustomerWithCorporation", "countCustomerWithCorporationTree", "countTreeRoot", "getAbsoluteBranch", "getAbsoluteChildren", "getAbsoluteIsolation", "getAbsoluteTree", "getBranch", "getChildren", "getCorporation", "getCorporationAttachTerm", "getCorporationAttachTermList", "getCorporationList", "getCorporationSet", "getCorporationSetAll", "getCorporationTerm", "getCorporationTermList", "getCorporationWithCustomer", "getCustomerWithCorporation", "getFullPathListNode", "getIsolation", "getTree", "getTreeTerm", "getTreeTermList", "listCorporation", "listCorporationWithCustomer", "listCustomerWithCorporation", "listCustomerWithCorporationTree", "listTreeRoot", "mergeBackwardCorporation", "mergeBackwardCorporationAttach", "mergeBackwardCorporationSet", "mergeForwardCorporation", "mergeForwardCorporationAttach", "mergeForwardCorporationSet", "moveTermCorporation", "moveTermCorporationAttach", "moveTermCorporationSet", "removeCorporation", "removeCorporationAttach", "removeCorporationInclusion", "removeCorporationSet", "searchCorporation", "searchCorporationWithCustomer", "searchCustomerWithCorporation", "searchCustomerWithCorporationTree", "searchTreeRoot", "separateTermCorporation", "separateTermCorporationAttach", "separateTermCorporationSet", "setCorporation", "setCorporationAsRoot", "setCorporationAttach", "setCorporationInclusion", "totalCorporation", "totalCorporationWithCustomer", "totalCustomerWithCorporation", "totalCustomerWithCorporationTree", "totalTreeRoot", "updateCorporationSet" ]);
//	profileInstancializeApis("IMMCurrencyRateManager", [ "get", "getAll", "getRating", "getTerm", "getTermList", "mergeBackwardTerm", "mergeForwardTerm", "moveTerm", "remove", "separateTerm", "set" ]);
//	profileInstancializeApis("IMMCustomerManager", [ "count", "get", "getTerm", "getTermList", "list", "mergeBackwardTerm", "mergeForwardTerm", "moveTerm", "remove", "search", "separateTerm", "set", "total" ]);
//	profileInstancializeApis("IMMItemCategoryManager", [ "changeCategorySetState", "countCategory", "countCategoryWithItem", "countItemWithCategory", "countItemWithCategoryTree", "countTreeRoot", "getAbsoluteBranch", "getAbsoluteChildren", "getAbsoluteIsolation", "getAbsoluteTree", "getBranch", "getCategory", "getCategoryAttachTerm", "getCategoryAttachTermList", "getCategoryList", "getCategorySet", "getCategorySetAll", "getCategoryTerm", "getCategoryTermList", "getCategoryWithItem", "getChildren", "getFullPathListNode", "getIsolation", "getItemWithCategory", "getTree", "getTreeTerm", "getTreeTermList", "listCategory", "listCategoryWithItem", "listItemWithCategory", "listItemWithCategoryTree", "listTreeRoot", "mergeBackwardCategory", "mergeBackwardCategoryAttach", "mergeBackwardCategorySet", "mergeForwardCategory", "mergeForwardCategoryAttach", "mergeForwardCategorySet", "moveTermCategory", "moveTermCategoryAttach", "moveTermCategorySet", "removeCategory", "removeCategoryAttach", "removeCategoryInclusion", "removeCategorySet", "searchCategory", "searchCategoryWithItem", "searchItemWithCategory", "searchItemWithCategoryTree", "searchTreeRoot", "separateTermCategory", "separateTermCategoryAttach", "separateTermCategorySet", "setCategory", "setCategoryAsRoot", "setCategoryAttach", "setCategoryInclusion", "totalCategory", "totalCategoryWithItem", "totalItemWithCategory", "totalItemWithCategoryTree", "totalTreeRoot", "updateCategorySet" ]);
//	profileInstancializeApis("IMMItemManager", [ "count", "get", "getTerm", "getTermList", "list", "mergeBackwardTerm", "mergeForwardTerm", "moveTerm", "remove", "search", "separateTerm", "set", "total" ]);
//	profileInstancializeApis("IMMPrivateGroupManager", [ "countPrivateGroup", "countUserWithPrivateGroup", "getPrivateGroup", "listUserWithPrivateGroup", "removePrivateGroup", "removeUserAttach", "searchPrivateGroup", "searchUserWithPrivateGroup", "setPrivateGroup", "setUserAttach", "totalUserWithPrivateGroup" ]);
//	profileInstancializeApis("IMMPublicGroupManager", [ "changePublicGroupSetState", "countPublicGroup", "countPublicGroupCategory", "countPublicGroupCategoryItem", "countPublicGroupCategoryItemWithPublicGroup", "countPublicGroupRole", "countPublicGroupRoleWithUser", "countPublicGroupRoleWithUserOnPublicGroup", "countPublicGroupWithPublicGroupCategoryItem", "countPublicGroupWithUser", "countTreeRoot", "countUserWithPublicGroup", "countUserWithPublicGroupRole", "countUserWithPublicGroupRoleOnPublicGroup", "countUserWithPublicGroupTree", "getAbsoluteBranch", "getAbsoluteChildren", "getAbsoluteIsolation", "getAbsoluteTree", "getBranch", "getChildren", "getFullPathListNode", "getIsolation", "getPublicGroup", "getPublicGroupCategory", "getPublicGroupCategoryItem", "getPublicGroupCategoryItemAttachTerm", "getPublicGroupCategoryItemAttachTermList", "getPublicGroupList", "getPublicGroupRole", "getPublicGroupRoleAttachTerm", "getPublicGroupRoleAttachTermList", "getPublicGroupRoleList", "getPublicGroupRoleTerm", "getPublicGroupRoleTermList", "getPublicGroupSet", "getPublicGroupSetAll", "getPublicGroupTerm", "getPublicGroupTermList", "getTree", "getTreeTerm", "getTreeTermList", "getUserAttachTerm", "getUserAttachTermList", "listPublicGroup", "listPublicGroupCategory", "listPublicGroupCategoryItem", "listPublicGroupCategoryItemWithPublicGroup", "listPublicGroupRole", "listPublicGroupRoleWithUser", "listPublicGroupRoleWithUserOnPublicGroup", "listPublicGroupWithPublicGroupCategoryItem", "listPublicGroupWithUser", "listTreeRoot", "listUserWithPublicGroup", "listUserWithPublicGroupRole", "listUserWithPublicGroupRoleOnPublicGroup", "listUserWithPublicGroupTree", "mergeBackwardTermPublicGroup", "mergeBackwardTermPublicGroupRole", "mergeBackwardTermPublicGroupSet", "mergeBackwardTermUserAttach", "mergeForwardTermPublicGroup", "mergeForwardTermPublicGroupRole", "mergeForwardTermPublicGroupSet", "mergeForwardTermUserAttach", "moveTerm", "moveTermPublicGroup", "moveTermPublicGroupRole", "moveTermPublicGroupSet", "moveTermUserAttach", "removePublicGroup", "removePublicGroupCategory", "removePublicGroupCategoryItem", "removePublicGroupCategoryItemAttach", "removePublicGroupInclusion", "removePublicGroupRole", "removePublicGroupRoleAttach", "removePublicGroupSet", "removeUserAttach", "searchPublicGroup", "searchPublicGroupCategory", "searchPublicGroupCategoryItem", "searchPublicGroupCategoryItemWithPublicGroup", "searchPublicGroupRole", "searchPublicGroupRoleWithUser", "searchPublicGroupRoleWithUserOnPublicGroup", "searchPublicGroupWithPublicGroupCategoryItem", "searchPublicGroupWithUser", "searchTreeRoot", "searchUserWithPublicGroup", "searchUserWithPublicGroupRole", "searchUserWithPublicGroupRoleOnPublicGroup", "searchUserWithPublicGroupTree", "separateTermPublicGroup", "separateTermPublicGroupRole", "separateTermPublicGroupSet", "separateTermUserAttach", "set", "setPublicGroup", "setPublicGroupCategory", "setPublicGroupCategoryItem", "setPublicGroupCategoryItemAttach", "setPublicGroupInclusion", "setPublicGroupRole", "setPublicGroupRoleAttach", "setUserAttach", "totalPublicGroup", "totalPublicGroupCategory", "totalPublicGroupCategoryItem", "totalPublicGroupCategoryItemWithPublicGroup", "totalPublicGroupRole", "totalPublicGroupRoleWithUser", "totalPublicGroupRoleWithUserOnPublicGroup", "totalPublicGroupWithPublicGroupCategoryItem", "totalPublicGroupWithUser", "totalTreeRoot", "totalUserWithPublicGroup", "totalUserWithPublicGroupRole", "totalUserWithPublicGroupRoleOnPublicGroup", "totalUserWithPublicGroupTree", "updatePublicGroupSet" ]);
//	profileInstancializeApis("IMMUserManager", [ "countUser", "countUserCategory", "countUserCategoryItem", "countUserCategoryItemWithUser", "countUserWithUserCategoryItem", "getUser", "getUserCategory", "getUserCategoryItem", "getUserCategoryItemAttachTerm", "getUserCategoryItemAttachTermList", "getUserList", "getUserTerm", "getUserTermList", "listUser", "listUserCategory", "listUserCategoryItem", "listUserCategoryItemWithUser", "listUserWithUserCategoryItem", "mergeBackwardTermUser", "mergeForwardTermUser", "moveTermUser", "removeUser", "removeUserCategory", "removeUserCategoryItem", "removeUserCategoryItemAttach", "searchUser", "searchUserCategory", "searchUserCategoryItem", "searchUserCategoryItemWithUser", "searchUserWithUserCategoryItem", "separateTermUser", "setUser", "setUserCategory", "setUserCategoryItem", "setUserCategoryItemAttach", "totalUser", "totalUserCategory", "totalUserCategoryItem", "totalUserCategoryItemWithUser", "totalUserWithUserCategoryItem" ]);
//	profileInstancializeApis("SearchCondition", [ "addCondition", "addConditionWithIndex", "addIsNotNull", "addIsNotNullWithIndex", "addIsNull", "addIsNullWithIndex", "addLike", "addLikeWithIndex", "addNotLike", "addNotLikeWithIndex", "addOrder", "addOrderWithIndex", "copy", "createConditionSection", "createOrderSection", "createWhereSection", "getConditionCount", "getConditions", "getDeleteSqlStatement", "getLogicalOperetor", "getOrders", "getParameters", "getSortDirection", "isUseLike", "setLogicalOperetor", "setSortDirection" ]);
//	
//	// IM-Workflow API
//	profileInstancializeApis("ActAuthorityUserManager", [ "createActAdministrationData", "updateActAdministrationData", "deleteActAdministrationData", "getActAdministrationDataList", "getActAdministrationDataWithActAdministrationPluginId" ]);
//	profileInstancializeApis("ActConfig", [ "getActConfig", "createActConfig", "updateActConfig", "deleteActConfig", "isActAuthorityUser" ]);
//	profileInstancializeApis("ActTemporaryExpandList", [ "getActTemporaryExpandList", "getActTemporaryExpandListCount" ]);
//	profileInstancializeApis("ActvMatter", [ "getMatterHandleAuthList", "getMatterHandleAuthListCount", "getCnfmAuthUserList", "getCnfmAuthUserListCount", "getMatter", "getProcessHistoryList", "getProcessHistoryListCount", "getProcessHistoryLatestList", "getCnfmHistoryList", "getCnfmHistoryListCount", "getAttachFileList", "getAttachFileListCount", "getMatterProperty", "getMatterPropertyList", "getMatterPropertyListCount", "getMatterHandleAuth", "getExecNodeListWithProcessType", "getMasterNodeListWithProcessType", "getExecFlow", "getMasterFlow", "getExecFlowXML", "getMasterFlowXML", "getActvNodeList", "getNodeProgressList" ]);
//	profileInstancializeApis("ActvMatterHandleManager", [ "copyNodeFromMasterFlow", "deleteNode", "expandHorizontalVerticalNode", "initializeHorizontalVerticalNode", "createProcessTarget", "deleteProcessTarget", "deleteProcessTargetAll", "expandProcessTarget", "expandConfirmTarget", "getNodesToMove", "moveActvNode", "setBranchForwardNode", "createMatterHandleAuth", "updateMatterHandleAuth", "deleteMatterHandleAuth", "deleteMatterHandleAuthAll", "expandMatterHandleAuth", "reserveCancel" ]);
//	profileInstancializeApis("ActvMatterNode", [ "getCnfmAuthUserList", "getCnfmAuthUserListCount", "getProcessHistoryList", "getProcessHistoryListCount", "getExecutableUserList", "getMatterNode", "getProcessHistoryLatest", "getAvailableProcessTypeList", "getNodesToConfigProcessTarget", "getNodesToConfigBranchStart", "getPageForApply", "getPageForTempSave", "getPageForReapply", "getPageForProcess", "getPageForConfirm", "getPageAvailable", "getExecNodeConfig", "getExecProcessTargetList", "getMasterNodeConfig", "getMasterProcessTargetList", "getBeforeProcessedNode" ]);
//	profileInstancializeApis("ActvMatterStampList", [ "getStampList", "getStampListCount", "getStampTransactionFrameList", "getStampMasterFrameList" ]);
//	profileInstancializeApis("ActvMatterUserDataManager", [ "updateUserDataId" ]);
//	profileInstancializeApis("AdminGroupManager", [ "createAdminGroup", "updateAdminGroup", "deleteAdminGroup", "createAdminGroupFamily", "updateAdminGroupFamily", "deleteAdminGroupFamily", "createAdminGroupAuth", "updateAdminGroupAuth", "deleteAdminGroupAuth", "createAdminGroupManage", "updateAdminGroupManage", "deleteAdminGroupManage", "deleteAdminGroupManageWithTarget", "getAdminGroup", "getAdminGroupWithAccessRole", "getAdminGroupFamilyWithLocale", "getAdminGroupListFamilyWithLocale", "getAdminGroupCount", "getAdminGroupAuth", "getAdminGroupManage", "getAdminGroupManageWithTargetId", "getAdminGroupManageWithAdminTypeTargetId", "getAdminGroupName", "getFlowDataList", "getRouteDataList", "getContentsDataList", "getMailDataList", "getAdminGroupList", "getAdminGroupListWithAccessRole", "getAdminGroupListCount", "getAdminGroupListCountWithAccessRole" ]);
//	profileInstancializeApis("AlertManager", [ "createAlertData", "updateAlertData", "deleteAlertData", "getAlertDataTotalInfoList", "getAlertDataList", "getAlertDataListCount" ]);
//	profileInstancializeApis("ApplyFlowList", [ "getApplyFlowList", "getApplyFlowListCount", "getActApplyFlowList", "getActApplyFlowListCount" ]);
//	profileInstancializeApis("ApplyManager", [ "apply", "draft", "getAuthUserOrgz", "getConfigSetToApply", "getConfigSetToApplyWithProcessTarget" ]);
//	profileInstancializeApis("ArcMatter", [ "getMatter", "getProcessHistoryList", "getProcessHistoryListCount", "getProcessHistoryLatestList", "getCnfmHistoryList", "getCnfmHistoryListCount", "getAttachFileList", "getAttachFileListCount", "getMatterProperty", "getMatterPropertyList", "getMatterPropertyListCount", "getExecNodeListWithProcessType", "getMasterNodeListWithProcessType", "getExecFlow", "getMasterFlow", "getExecFlowXML", "getMasterFlowXML", "getNodeProgressList", "getRefAuthUserList", "getRefAuthUserListCount" ]);
//	profileInstancializeApis("ArcMatterAdminList", [ "getArcMatterList", "getArcMatterListCount" ]);
//	profileInstancializeApis("ArcMatterList", [ "getProcessedList", "getProcessedListCount" ]);
//	profileInstancializeApis("ArcMatterNode", [ "getProcessHistoryList", "getProcessHistoryListCount", "getMatterNode", "getProcessHistoryLatest", "getExecNodeConfig" ]);
//	profileInstancializeApis("ArcMatterStampList", [ "getStampList", "getStampListCount", "getStampResultFrameList" ]);
//	profileInstancializeApis("CnfmActvMatterList", [ "getLumpCnfmList", "getLumpCnfmListCount", "getCnfmList", "getCnfmListCount" ]);
//	profileInstancializeApis("CnfmActvMatterManager", [ "getAuthUserOrgz", "confirm", "isPossibleToConfirm" ]);
//	profileInstancializeApis("CnfmCplMatterList", [ "getLumpCnfmList", "getLumpCnfmListCount", "getCnfmUserSetList", "getCnfmUserSetListCount" ]);
//	profileInstancializeApis("CnfmCplMatterManager", [ "getAuthUserOrgz", "confirm", "isPossibleToConfirm" ]);
//	profileInstancializeApis("ContentsDataManager", [ "getContentsDataList", "getContentsDataListWithAccessRole", "getContentsData", "getContentsDataWithLocale", "getContentsDataFamily", "getContentsDataFamilyWithLocale", "getContentsDataListCount", "getContentsDataListCountWithAccessRole", "getContentsDataCount", "getContentsDataCountWithLocale", "createContentsData", "updateContentsData", "deleteContentsData", "createContentsDataFamily", "updateContentsDataFamily", "deleteContentsDataFamily", "createContentsDataWithAdjust", "updateContentsDataWithAdjust", "getContentsDetailDataList", "getContentsDetailDataListWithAccessRole", "getContentsDetailDataListWithLocale", "getContentsDetailDataListFamilyWithLocale", "getContentsDetailDataListWithLocaleAndVersionStatuses", "getContentsDetailDataListFamilyWithLocaleAndVersionStatuses", "getContentsDetailData", "getContentsDetailDataWithLocale", "getContentsDetailDataFamily", "getContentsDetailDataFamilyWithLocale", "getContentsDetailDataListCount", "getContentsDetailDataListCountWithAccessRole", "getContentsDetailDataListCountWithLocale", "getContentsDetailDataCount", "getContentsDetailDataCountWithLocale", "createContentsDetailData", "updateContentsDetailData", "deleteContentsDetailData", "createContentsDetailDataFamily", "updateContentsDetailDataFamily", "deleteContentsDetailDataFamily", "createContentsDetailDataWithAdjust", "updateContentsDetailDataWithAdjust", "deleteContentsDetailDataWithAdjust", "createContentsPagePathData", "updateContentsPagePathData", "deleteContentsPagePathData", "getContentsPagePathDataList", "getContentsPagePathData", "getContentsPagePathDataCount", "getContentsPagePathDataWithLocale", "getContentsPagePathDataListWithCondition", "getContentsPagePathDataListCountWithCondition", "createContentsPluginData", "updateContentsPluginData", "deleteContentsPluginData", "getContentsPluginDataList", "getContentsPluginData", "getContentsPluginDataCount", "getContentsPluginDataWithLocale", "getContentsPluginDataListWithCondition", "getContentsPluginDataListCountWithCondition", "createContentsMailTemplateData", "updateContentsMailTemplateData", "deleteContentsMailTemplateData", "getContentsMailTemplateDataList", "getContentsMailTemplateDataListWithAccessRole", "getContentsMailTemplateDataWithLocale", "getContentsMailTemplateDataCount", "getContentsMailTemplateDataCountWithVersionId", "getContentsMailTemplateDataListWithCondition", "getContentsMailTemplateDataListWithConditionAndAccessRole", "getContentsMailTemplateDataListCountWithCondition", "getContentsMailTemplateDataListCountWithConditionAndAccessRole", "createContentsRuleData", "updateContentsRuleData", "deleteContentsRuleData", "getContentsRuleDataList", "getContentsRuleDataWithLocale", "getContentsRuleDataCount", "getContentsRuleDataListWithCondition", "getContentsRuleDataListCountWithCondition" ]);
//	profileInstancializeApis("CplMatter", [ "getCnfmAuthUserList", "getCnfmAuthUserListCount", "getMatter", "getProcessHistoryList", "getProcessHistoryListCount", "getProcessHistoryLatestList", "getCnfmHistoryList", "getCnfmHistoryListCount", "getAttachFileList", "getAttachFileListCount", "getMatterProperty", "getMatterPropertyList", "getMatterPropertyListCount", "getExecNodeListWithProcessType", "getMasterNodeListWithProcessType", "getExecFlow", "getMasterFlow", "getExecFlowXML", "getMasterFlowXML", "getNodeProgressList", "getMatterHandleAuthUserList", "getMatterHandleAuthUserListCount", "getMatterHandleAuthUser" ]);
//	profileInstancializeApis("CplMatterHandleManager", [ "expandConfirmTarget", "createMatterHandleAuth", "updateMatterHandleAuth", "deleteMatterHandleAuth", "deleteMatterHandleAuthAll", "expandMatterHandleAuth", "createConfirmTarget", "deleteConfirmTarget", "deleteConfirmTargetAll" ]);
//	profileInstancializeApis("CplMatterNode", [ "getCnfmAuthUserList", "getCnfmAuthUserListCount", "getProcessHistoryList", "getProcessHistoryListCount", "getMatterNode", "getProcessHistoryLatest", "getExecNodeConfig", "getExecProcessTargetList", "getMasterProcessTargetList" ]);
//	profileInstancializeApis("CplMatterStampList", [ "getStampList", "getStampListCount", "getStampResultFrameList" ]);
//	profileInstancializeApis("FlowDataManager", [ "getFlowDataList", "getFlowDataListWithAccessRole", "getFlowData", "getFlowDataWithLocale", "getFlowDataFamily", "getFlowDataFamilyWithLocale", "getFlowDataListCount", "getFlowDataListCountWithAccessRole", "getFlowDataCount", "getFlowDataCountWithLocale", "createFlowData", "updateFlowData", "deleteFlowData", "createFlowDataFamily", "updateFlowDataFamily", "deleteFlowDataFamily", "createFlowDataWithAdjust", "updateFlowDataWithAdjust", "getFlowDetailDataList", "getFlowDetailDataListWithAccessRole", "getFlowDetailDataListForAllFlow", "getFlowDetailDataListWithLocale", "getFlowDetailDataListFamilyWithLocale", "getFlowDetailDataListWithLocaleAndVersionStatuses", "getFlowDetailDataListFamilyWithLocaleAndVersionStatuses", "getFlowDetailData", "getFlowDetailDataWithLocale", "getFlowDetailDataFamily", "getFlowDetailDataFamilyWithVersion", "getFlowDetailDataFamilyWithLocale", "getFlowDetailDataFamilyWithVersionAndLocale", "getFlowDetailDataListCount", "getFlowDetailDataListCountWithAccessRole", "getFlowDetailDataListCountForAllFlow", "getFlowDetailDataListCountWithLocale", "getFlowDetailDataCount", "getFlowDetailDataCountWithLocale", "getFlowDetailDataWithContents", "getFlowDetailDataCountWithContents", "getFlowDetailDataWithRoute", "getFlowDetailDataCountWithRoute", "getFlowDetailDataWithRouteTemplate", "getFlowDetailDataCountWithRouteTemplate", "createFlowDetailData", "updateFlowDetailData", "deleteFlowDetailData", "createFlowDetailDataFamily", "updateFlowDetailDataFamily", "deleteFlowDetailDataFamily", "createFlowDetailDataWithAdjust", "updateFlowDetailDataWithAdjust", "deleteFlowDetailDataWithAdjust", "getFlowHandleUserData", "getFlowHandleUserDataCount", "createFlowHandleUserData", "updateFlowHandleUserData", "deleteFlowHandleUserData", "getFlowDefaultOrgzData", "getFlowDefaultOrgzDataCount", "createFlowDefaultOrgzData", "updateFlowDefaultOrgzData", "deleteFlowDefaultOrgzData", "getFlowCooperationDataList", "getFlowCooperationDataListFamily", "getFlowCooperationData", "getFlowCooperationDataWithType", "getFlowCooperationDataFamily", "getFlowCooperationDataFamilyWithType", "getFlowCooperationDataFamilyWithAdjust", "getFlowCooperationDataListCount", "getFlowCooperationDataListCountWithType", "getFlowCooperationDataCount", "getFlowCooperationDataCountWithType", "createFlowCooperationData", "updateFlowCooperationData", "deleteFlowCooperationData", "createFlowCooperationDataFamily", "updateFlowCooperationDataFamily", "deleteFlowCooperationDataFamily", "getFlowCooperationDetailData", "getFlowCooperationDetailDataWithType", "getFlowCooperationDetailDataCount", "getFlowCooperationDetailDataCountWithType", "createFlowCooperationDetailData", "updateFlowCooperationDetailData", "deleteFlowCooperationDetailData", "getNodeCooperationDataList", "getNodeCooperationDataListFamily", "getNodeCooperationDataListFamilyWithLocale", "getNodeCooperationData", "getNodeCooperationDataWithNode", "getNodeCooperationDataFamily", "getNodeCooperationDataFamilyWithLocale", "getNodeCooperationDataFamilyWithNode", "getNodeCooperationDataFamilyWithNodeAndLocale", "getNodeCooperationDataFamilyWithAdjust", "getNodeCooperationDataFamilyWithNodeAndAdjust", "getNodeCooperationDataListCount", "getNodeCooperationDataListCountWithNode", "getNodeCooperationDataCount", "getNodeCooperationDataCountWithNode", "createNodeCooperationData", "updateNodeCooperationData", "deleteNodeCooperationData", "createNodeCooperationDataFamily", "updateNodeCooperationDataFamily", "deleteNodeCooperationDataFamily", "getNodeCooperationDetailData", "getNodeCooperationDetailDataWithNode", "getNodeCooperationDetailDataWithNodeAndType", "getNodeCooperationDetailDataCount", "getNodeCooperationDetailDataCountWithNode", "getNodeCooperationDetailDataCountWithNodeAndType", "createNodeCooperationDetailData", "updateNodeCooperationDetailData", "deleteNodeCooperationDetailData", "getNodeAttributeCooperationData", "getNodeAttributeCooperationDataWithLocale", "getNodeAttributeCooperationDataCount", "getNodeAttributeCooperationDataCountWithLocale", "getNodeAttributeCooperationDataCountWithAttribute", "getNodeAttributeCooperationDataCountWithAttributeValue", "createNodeAttributeCooperationData", "updateNodeAttributeCooperationData", "deleteNodeAttributeCooperationData", "getBranchUnionDetailData", "getBranchUnionDetailDataWithNode", "getBranchUnionDetailDataCount", "getBranchUnionDetailDataCountWithNode", "createBranchUnionDetailData", "updateBranchUnionDetailData", "deleteBranchUnionDetailData", "createCooperationDataWithContents", "updateCooperationDataWithContents", "deleteCooperationDataWithContents", "createCooperationDataWithRoute", "updateCooperationDataWithRoute", "deleteCooperationDataWithRoute", "deleteCooperationDataWithContentsPagePath", "deleteCooperationDataWithContentsPlugin", "deleteCooperationDataWithContentsMail", "deleteCooperationDataWithContentsRule", "getRouteNodeData", "getTargetFlowDataWithLocale", "getTargetFlowDataFamilyWithLocale" ]);
//	profileInstancializeApis("FlowGroupManager", [ "getFlowGroup", "getFlowGroupWithLocale", "getFlowGroupListWithLocale", "getFlowGroupInc", "getChildFlowGroupDataListWithFlowGroupId", "getFlowDataListWithFlowGroupId", "getFlowGroupCount", "getFlowGroupCountWithLocale", "getFlowGroupCountWithFlowGroupAndLocale", "createFlowGroup", "updateFlowGroup", "deleteFlowGroup", "createFlowGroupFamily", "updateFlowGroupFamily", "deleteFlowGroupFamily", "updateFlowGroupTreePath", "deleteFlowGroupTreePath", "createFlowGroupInc", "updateFlowGroupInc", "deleteFlowGroupInc", "getFlowGroupInfo", "getFlowGroupInfoList", "getFlowGroupInfoCount", "createFlowGroupInfo", "updateFlowGroupInfo", "deleteFlowGroupInfo", "getFlowGroupTreeData" ]);
//	profileInstancializeApis("ListDisplayPatternManager", [ "createListPatternData", "updateListPatternData", "deleteListPatternData", "createListPatternDataFamily", "updateListPatternDataFamily", "deleteListPatternDataFamily", "getListPatternDataList", "getListPatternData", "getListPatternDataWithLocale", "getListPatternDataFamily", "getListPatternDataFamilyWithLocale", "getListPatternDataCount", "getListPatternDataCountWithLocale", "getListPatternDataListCount", "createSelectedColumnListData", "updateSelectedColumnListData", "deleteSelectedColumnListData", "getSelectedColumnListData", "getColumnDataListWithListPageType", "getUserSelectColumnListDataCountWithListPageTypeAndPatternId" ]);
//	profileInstancializeApis("ListSearchCondition", [ "addColumnByMatterProp", "addCondition", "addConditionByMatterProp", "addOrder", "addOrderByMatterProp", "setAndCombination", "setCount", "setOffset" ]);
//	profileInstancializeApis("ListSearchConditionNoMatterProperty", [ "addCondition", "addOrder", "setAndCombination", "setCount", "setOffset" ]);
//	profileInstancializeApis("LumpAuthUserOrgzManager", [ "getProcAuthUserOrgz", "getCnfmAuthUserOrgzForActvMtr", "getCnfmAuthUserOrgzForCplMtr" ]);
//	profileInstancializeApis("MailTemplateManager", [ "createMailTemplateDataFamily", "createMailTemplateData", "createMailTemplateTypeData", "updateMailTemplateDataFamily", "updateMailTemplateData", "updateMailTemplateTypeData", "deleteMailTemplateDataFamily", "deleteMailTemplateData", "deleteMailTemplateTypeData", "getMailTemplateDataList", "getMailTemplateDataListCount", "getMailTemplateDataListWithAccessRole", "getMailTemplateDataListCountWithAccessRole", "getMailTemplateDataFamily", "getMailTemplateData", "getMailTemplateDataCount", "getMailTemplateDataCountWithLocale", "getMailTemplateDataFamilyWithLocale", "getMailTemplateDataWithLocale", "getMailTemplateTypeData", "getMailTemplateUseStatusList", "getMailTemplateUseStatusListCount", "getReplaceStringData" ]);
//	profileInstancializeApis("MatterArchiveManager", [ "archive", "createReferableUser", "deleteReferableUser" ]);
//	profileInstancializeApis("MatterDeleteManager", [ "deleteActvMatter", "deleteCplMatter", "deleteArcMatter", "deleteArcMatterTargetYearMonth" ]);
//	profileInstancializeApis("MatterPropertyDataManager", [ "createMatterPropertyData", "updateMatterPropertyData", "deleteMatterPropertyData", "getMatterPropertyDataList", "getMatterPropertyDataListCount", "getMatterPropertyData", "getMatterPropertyDataWithLocale", "getMatterPropertyDataCount", "getMatterPropertyDataCountWithLocale", "getMatterPropertyUseCount" ]);
//	profileInstancializeApis("MonitoringManager", [ "createMonitoringFlowData", "updateMonitoringFlowData", "deleteMonitoringFlowData", "getMonitoringFlowDataList", "createMonitoringMatterData", "updateMonitoringMatterData", "deleteMonitoringMatterData", "getMonitoringMatterDataList" ]);
//	profileInstancializeApis("OriginalActAdminList", [ "getPersList", "getPersListCount", "getAppliList", "getAppliListCount", "getPersAppliUserList", "getPersAppliUserListCount" ]);
//	profileInstancializeApis("OriginalActList", [ "getPersList", "getPersListCount", "getAppliList", "getAppliListCount", "getPersAppliUserList", "getPersAppliUserListCount" ]);
//	profileInstancializeApis("ProcessManager", [ "reserveCancel", "getAuthUserOrgz", "approve", "reapply", "applyFromUnapply", "discontinue", "approveEnd", "getNodesToSendBack", "sendBack", "deny", "reserve", "isPossibleToProcess", "getAuthUser", "getConfigSetToProcess", "getConfigSetToProcessWithProcessTarget" ]);
//	profileInstancializeApis("ProcessedActvMatterList", [ "getProcessedList", "getProcessedListCount" ]);
//	profileInstancializeApis("ProcessedActvMatterNodeList", [ "getProcessedList", "getProcessedListCount" ]);
//	profileInstancializeApis("ProcessedCplMatterList", [ "getProcessedList", "getProcessedListCount" ]);
//	profileInstancializeApis("ProcessedCplMatterNodeList", [ "getProcessedList", "getProcessedListCount" ]);
//	profileInstancializeApis("PullBackManager", [ "pullBack", "getNodesToPullBack" ]);
//	profileInstancializeApis("RefActvMatterAdminList", [ "getActvMatterList", "getActvMatterListCount" ]);
//	profileInstancializeApis("RefActvMatterList", [ "getRefList", "getRefListCount" ]);
//	profileInstancializeApis("RefCplMatterAdminList", [ "getCplMatterList", "getCplMatterListCount" ]);
//	profileInstancializeApis("RefCplMatterList", [ "getRefList", "getRefListCount" ]);
//	profileInstancializeApis("RouteDataManager", [ "getRouteDataList", "getRouteNodeData", "getRouteDataListWithAccessRole", "getRouteData", "getRouteDataWithLocale", "getRouteDataFamily", "getRouteDataFamilyWithLocale", "getRouteDataListCount", "getRouteDataListCountWithAccessRole", "getRouteDataCount", "getRouteDataCountWithLocale", "createRouteData", "updateRouteData", "deleteRouteData", "createRouteDataFamily", "updateRouteDataFamily", "deleteRouteDataFamily", "createRouteDataWithAdjust", "updateRouteDataWithAdjust", "getRouteDetailDataList", "getRouteDetailDataListWithAccessRole", "getRouteDetailDataListWithLocale", "getRouteDetailDataListFamilyWithLocale", "getRouteDetailDataListWithLocaleAndVersionStatuses", "getRouteDetailDataListFamilyWithLocaleAndVersionStatuses", "getRouteDetailData", "getRouteDetailDataWithLocale", "getRouteDetailDataFamily", "getRouteDetailDataFamilyWithLocale", "getRouteDetailDataListCount", "getRouteDetailDataListCountWithAccessRole", "getRouteDetailDataListCountWithLocale", "getRouteDetailDataCount", "getRouteDetailDataCountWithLocale", "createRouteDetailData", "updateRouteDetailData", "deleteRouteDetailData", "createRouteDetailDataFamily", "updateRouteDetailDataFamily", "deleteRouteDetailDataFamily", "createRouteDetailDataWithAdjust", "updateRouteDetailDataWithAdjust", "deleteRouteDetailDataWithAdjust", "getRoutePluginData", "getRoutePluginDataWithNode", "getRoutePluginDataCount", "getRoutePluginDataCountWithNode", "createRoutePluginData", "updateRoutePluginData", "deleteRoutePluginData" ]);
//	profileInstancializeApis("RuleDataManager", [ "createRuleData", "updateRuleData", "deleteRuleData", "createRuleDataFamily", "updateRuleDataFamily", "deleteRuleDataFamily", "getRuleDataList", "getRuleDataListCount", "getRuleData", "getRuleDataFamily", "getRuleDataWithLocale", "getRuleDataCount", "getRuleDataCountWithLocale", "createRuleDetailData", "updateRuleDetailData", "deleteRuleDetailData", "getRuleUseStatusList", "getRuleUseStatusListCount", "getRuleDetailData", "getRuleDataFamilyWithLocale" ]);
//	profileInstancializeApis("SortConditionForAuthUser", [ "addOrder", "setCount", "setOffset" ]);
//	profileInstancializeApis("StampConfig", [ "createStampConfig", "createStampTagConfig", "updateStampConfig", "updateStampTagConfig", "deleteStampConfig", "deleteStampTagConfig" ]);
//	profileInstancializeApis("StampConfigList", [ "getStampList", "getStampListCount", "getStampTagList" ]);
//	profileInstancializeApis("StampListSearchCondition", [ "addCondition", "addOrder", "setAndCombination", "setCount", "setOffset" ]);
//	profileInstancializeApis("StampParamaterManager", [ "getParameter", "getStampTypeModel", "getFieldTypeModel" ]);
//	profileInstancializeApis("StampProcessManager", [ "createActvMatterStampData", "deleteActvMatterStampData", "deleteCplMatterStampData", "deleteArcMatterStampData", "updateActvMatterStampData", "updateActvMatterCancelFlag", "recoverActvMatterCancelFlag", "moveActvData2Cpl", "moveCplData2Arc", "existPluginInfoInTransactionFlow", "existPluginInfoInMasterData" ]);
//	profileInstancializeApis("TargetActAdminList", [ "getPersList", "getPersListCount", "getAppliList", "getAppliListCount", "getPersAppliUserList", "getPersAppliUserListCount" ]);
//	profileInstancializeApis("TargetActList", [ "getPersList", "getPersListCount", "getAppliList", "getAppliListCount", "getPersAppliUserList", "getPersAppliUserListCount" ]);
//	profileInstancializeApis("TempSaveManager", [ "createTempSaveMatter", "updateTempSaveMatter", "deleteTempSaveMatter" ]);
//	profileInstancializeApis("TempSaveMatter", [ "getMatterProperty", "getMatterPropertyList", "getMatterPropertyListCount", "getTempSaveMatter" ]);
//	profileInstancializeApis("TempSaveMatterAdminList", [ "getTempSaveMatterList", "getTempSaveMatterListCount" ]);
//	profileInstancializeApis("TempSaveMatterList", [ "getTempSaveMatterList", "getTempSaveMatterListCount" ]);
//	profileInstancializeApis("TransferManager", [ "transfer" ]);
//	profileInstancializeApis("UnprocessActvMatterList", [ "getLumpProcessList", "getLumpProcessListCount", "getProcessList", "getProcessListCount" ]);
//	profileInstancializeApis("UnprocessActvMatterNodeList", [ "getLumpProcessList", "getLumpProcessListCount", "getProcessList", "getProcessListCount" ]);
//	profileInstancializeApis("UserActvMatterPropertyValue", [ "getMatterProperty", "getMatterPropertyList", "getMatterPropertyListCount", "createMatterProperty", "updateMatterProperty", "deleteMatterProperty" ]);
//	profileInstancializeApis("UserArcMatterPropertyValue", [ "getMatterProperty", "getMatterPropertyList", "getMatterPropertyListCount", "createMatterProperty", "updateMatterProperty", "deleteMatterProperty" ]);
//	profileInstancializeApis("UserCplMatterPropertyValue", [ "getMatterProperty", "getMatterPropertyList", "getMatterPropertyListCount", "createMatterProperty", "updateMatterProperty", "deleteMatterProperty" ]);
//	profileInstancializeApis("UserListDisplayPattern", [ "getAvailableListPattern", "createUserListPattern", "deleteUserListPattern" ]);
//	profileInstancializeApis("UserMatterStatus", [ "getMatterStatus", "getMatterStatusDetail", "getMatterPropertyStatus" ]);
//	profileInstancializeApis("UserNodeConfig", [ "getUserNodeConfigList", "getUserNodeConfigListCount", "createUserNodeConfig", "deleteUserNodeConfig", "getUserNodeConfigDetailList", "getUserNodeConfigDetailListCount", "getUserNodeConfigNodeList", "getUserNodeConfigNodeListCount", "getUserNodeConfigFamily" ]);
//	profileInstancializeApis("WorkflowAttachFileManager", [ "createTempDirKey", "addFileToTemp", "removeTempFile", "removeTempDir", "removeAllTempDir", "getTempFileList" ]);
//	profileInstancializeApis("WorkflowCodeUtil", [ "getMatterStatus", "getActClassify", "getAdministrationGroupSearchCondition", "getAdministrationType", "getAdministratorType", "getAlertLevel", "getAlignType", "getArriveType", "getAttachmentFileConfig", "getAttributeKey", "getAttributeType", "getAuthorityType", "getAutoProcessLimitType", "getBranchUnionConditionSetting", "getBranchUnionGroupClassify", "getCalendarSearchCondition", "getCnfmNodeStatus", "getColumnType", "getConditionType", "getContentsSearchCondition", "getContentsType", "getCooperationClassify", "getCooperationType", "getFlagStatus", "getFlowSearchCondition", "getGroupSearchCondition", "getHandleLevel", "getListPageColumn", "getListPagePattenSearchCondition", "getListPageType", "getMailConfigType", "getMailSearchCondition", "getMailType", "getMatterEndStatus", "getMatterPropertySearchCondition", "getMatterPropertyType", "getModelType", "getNodeSearchCondition", "getNodeStatus", "getNodeType", "getNodeVariety", "getPageSearchCondition", "getPageType", "getPathType", "getPluginSearchCondition", "getPluginType", "getPriorityLevel", "getProcessAuth", "getProcessType", "getRouteSearchCondition", "getRouteType", "getRuleSearchCondition", "getSearchRangeType", "getSerialProcessType", "getSortSequence", "getUnionCondition", "getVariableType", "getVersionStatus", "getEnumCodeActClassify", "getEnumCodeAdministrationGroupSearchCondition", "getEnumCodeAdministrationType", "getEnumCodeAdministratorType", "getEnumCodeAlertLevel", "getEnumCodeAlignType", "getEnumCodeArriveType", "getEnumCodeAttachmentFileConfig", "getEnumCodeAttributeKey", "getEnumCodeAttributeType", "getEnumCodeAuthorityType", "getEnumCodeAutoProcessLimitType", "getEnumCodeBranchUnionConditionSetting", "getEnumCodeBranchUnionGroupClassify", "getEnumCodeCalendarSearchCondition", "getEnumCodeCnfmNodeStatus", "getEnumCodeColumnType", "getEnumCodeConditionType", "getEnumCodeContentsSearchCondition", "getEnumCodeContentsType", "getEnumCodeCooperationClassify", "getEnumCodeCooperationType", "getEnumCodeFlagStatus", "getEnumCodeFlowSearchCondition", "getEnumCodeGroupSearchCondition", "getEnumCodeHandleLevel", "getEnumCodeListPageColumn", "getEnumCodeListPagePattenSearchCondition", "getEnumCodeListPageType", "getEnumCodeMailConfigType", "getEnumCodeMailSearchCondition", "getEnumCodeMailType", "getEnumCodeMatterEndStatus", "getEnumCodeMatterPropertySearchCondition", "getEnumCodeMatterPropertyType", "getEnumCodeMatterStatus", "getEnumCodeModelType", "getEnumCodeNodeSearchCondition", "getEnumCodeNodeStatus", "getEnumCodeNodeType", "getEnumCodeNodeVariety", "getEnumCodePageSearchCondition", "getEnumCodePageType", "getEnumCodePathType", "getEnumCodePluginSearchCondition", "getEnumCodePluginType", "getEnumCodePriorityLevel", "getEnumCodeProcessAuth", "getEnumCodeProcessType", "getEnumCodeRouteSearchCondition", "getEnumCodeRouteType", "getEnumCodeRuleSearchCondition", "getEnumCodeSearchRangeType", "getEnumCodeSerialProcessType", "getEnumCodeSortSequence", "getEnumCodeTaskStatus", "getEnumCodeUnionCondition", "getEnumCodeVariableType", "getEnumCodeVersionStatus" ]);
//	profileStaticApis("WorkflowCommonUtil", [ "getMessage" ]);
//	profileInstancializeApis("WorkflowImageManager", [ "getActvMatterExecFlowImage", "getActvMatterMasterFlowImage", "getCplMatterExecFlowImage", "getCplMatterMasterFlowImage", "getArcMatterExecFlowImage", "getArcMatterMasterFlowImage", "getRouteImage", "getTemplateRouteImage" ]);
//	profileStaticApis("WorkflowNumberingManager", [ "getNumber" ]);
//	profileInstancializeApis("WorkflowParameterManager", [ "getParameter", "getIntegerParameter", "getParamMap", "getBooleanParameter", "reload" ]);
//	profileStaticApis("WorkflowPluginUtilManager", [ "getUser", "getLoginGroup", "getLocale", "getLocales" ]);
//	
//	// Intranet Startpack API
//	profileInstancializeApis("ISPAddressManager", [ "deleteAddressItemPersonalMng", "deleteAddressItemPersonalMngs", "deleteAddressItemPublicMng", "deleteAddressItemPublicMngs", "deleteGroup", "deleteGroups", "deletePerson", "deletePersons", "getAddressItemPersonalMng", "getAddressItemPersonalMngs", "getAddressItemPersonalMngsCount", "getAddressItemPublicMng", "getAddressItemPublicMngs", "getAddressItemPublicMngsCount", "getGroup", "getGroups", "getGroupsCount", "getPerson", "getPersons", "getPersonsCount", "setAddressGroupDetailSearchType", "setGroupSortCondition", "setPersonSortCondition", "updateAddressItemPersonalMng", "updateAddressItemPublicMng", "updateGroup", "updatePerson" ]);
//	profileInstancializeApis("ISPBlogArticleManager", [ "deleteBlogAccessHistories", "deleteBlogArticles", "deleteBlogArticlesIncAccData", "deleteBlogAttachedFiles", "deleteBlogComments", "getBlogAccessHistories", "getBlogAccessHistoriesCount", "getBlogArticle", "getBlogArticleIncAccData", "getBlogArticleIndexDay", "getBlogArticleIndexMonth", "getBlogArticles", "getBlogArticlesCount", "getBlogArticlesIncAccData", "getBlogAttachedFiles", "getBlogAttachedFilesCount", "getBlogComments", "getBlogCommentsCount", "setBlogAccessHistorySortCondition", "setBlogArticleSortCondition", "setBlogAttachedFileSortCondition", "setBlogCommentSortCondition", "updateBlogAccessHistory", "updateBlogArticle", "updateBlogAttachedFile", "updateBlogComment" ]);
//	profileInstancializeApis("ISPBlogMasterManager", [ "deleteBlogCategories", "deleteBlogCategoriesIncAccData", "deleteBlogFortes", "deleteBlogKinds", "getBlogCategories", "getBlogCategoriesCount", "getBlogCategoriesIncAccData", "getBlogFortes", "getBlogFortesCount", "getBlogKinds", "getBlogKindsCount", "setBlogCategoriesortCondition", "setBlogForteSortCondition", "setBlogKindSortCondition", "updateBlogCategory", "updateBlogCategorySorts", "updateBlogForte", "updateBlogForteSorts", "updateBlogKind", "updateBlogKindSortsAttentions" ]);
//	profileInstancializeApis("ISPBlogMessageManager", [ "deleteBlogMessageReceivers", "deleteBlogMessages", "deleteBlogMessagesIncAccData", "getBlogMessage", "getBlogMessageIncAccData", "getBlogMessageReceiver", "getBlogMessageReceivers", "getBlogMessageReceiversCount", "getBlogMessages", "getBlogMessagesCount", "getBlogMessagesIncAccData", "setBlogMessageReceiverSortCondition", "setBlogMessageSortCondition", "updateBlogMessage", "updateBlogMessageReceiver" ]);
//	profileInstancializeApis("ISPBlogUserManager", [ "deleteBlogFriends", "deleteBlogProfiles", "deleteBlogProfilesIncAccData", "deleteBlogUsersCategories", "deleteBlogUsersConfigs", "deleteBlogUsersConfigsIncAccData", "deleteBlogUsersFortes", "getBlogFriends", "getBlogFriendsCount", "getBlogProfile", "getBlogProfileIncAccData", "getBlogProfiles", "getBlogProfilesCount", "getBlogProfilesIncAccData", "getBlogUsersCategories", "getBlogUsersCategoriesCount", "getBlogUsersConfig", "getBlogUsersConfigIncAccData", "getBlogUsersConfigs", "getBlogUsersConfigsCount", "getBlogUsersConfigsIncAccData", "getBlogUsersFortes", "getBlogUsersFortesCount", "setBlogFriendSortCondition", "setBlogProfileSortCondition", "setBlogUsersCategorySortCondition", "setBlogUsersConfigSortCondition", "setBlogUsersForteSortCondition", "updateBlogFriend", "updateBlogProfile", "updateBlogUsersCategory", "updateBlogUsersConfig", "updateBlogUsersForte" ]);
//	profileInstancializeApis("ISPBulletinManager", [ "deleteBulletin", "deleteBulletinCls", "deleteBulletinClses", "deleteBulletins", "deleteBulletinsIncAccData", "getBulletin", "getBulletinAttachedFiles", "getBulletinAttachedFilesCount", "getBulletinCls", "getBulletinClsACLs", "getBulletinClsACLsUsers", "getBulletinClses", "getBulletinClsesCount", "getBulletinISPUserInfoNotices", "getBulletinISPUserInfoNoticesCount", "getBulletins", "getBulletinsCount", "getNonReadBulletins", "getReferableCommunityBulletinClses", "getReferableNormalBulletinClses", "setBulletinClsACLLevel", "setBulletinClsDetailSearchType", "setBulletinClsSortCondition", "setBulletinDetailSearchType", "setBulletinSortCondition", "setParentBulletinCls", "updateBulletin", "updateBulletinCls", "updateBulletinReadFlg", "updateBulletinReadFlgBatch", "updateBulletinSubordinateACLs" ]);
//	profileStaticApis("ISPClientDate", [ "format", "getTimeZoneOffset", "stringify", "toDate", "toDBString" ]);
//	profileInstancializeApis("ISPCommonManager", [ "deleteAttachedFile", "deleteGroupRelation", "getACLs", "getACLsUsers", "getGroupRelations", "getGroupRelationsCount", "getNewNoticeInfos", "getNewNoticeInfosCount", "getNewScheduleInfosCount", "getNewScheduleNoticeInfos", "updateAttachedFile", "updateGroupRelation" ]);
//	profileInstancializeApis("ISPCommunityManager", [ "deleteCommunities", "deleteCommunity", "deleteCommunityGroup", "deleteCommunityGroups", "getCommunities", "getCommunitiesCount", "getCommunity", "getCommunityGroup", "getCommunityGroups", "getCommunityGroupsCount", "getCommunityMembers", "getCommunityMembersCount", "setCommunityDetailSearchType", "setCommunityGroupSortCondition", "setCommunitySortCondition", "updateCommunity", "updateCommunityGroup" ]);
//	profileInstancializeApis("ISPConferenceManager", [ "deleteConference", "deleteConferenceCls", "deleteConferenceClses", "deleteConferenceMng", "deleteConferences", "deleteConferencesIncAccData", "getConference", "getConferenceAttachedFiles", "getConferenceAttachedFilesCount", "getConferenceCd", "getConferenceCls", "getConferenceClsACLs", "getConferenceClsACLsUsers", "getConferenceClses", "getConferenceClsesCount", "getConferenceISPUserInfoNotices", "getConferenceISPUserInfoNoticesCount", "getConferenceMng", "getConferenceMngs", "getConferenceMngsCount", "getConferences", "getConferencesCount", "getConferenceses", "getNonReadConferences", "getReferableCommunityConferenceClses", "getReferableNormalConferenceClses", "getReferableThreadCds", "getReferableThreadCdsCount", "setConferenceClsACLLevel", "setConferenceClsDetailSearchType", "setConferenceClsSortCondition", "setConferenceDetailSearchType", "setConferenceSortCondition", "setParentConferenceCls", "updateConference", "updateConferenceCls", "updateConferenceMng", "updateConferenceReadFlg", "updateConferences", "updateConferenceSubordinateACLs" ]);
//	profileStaticApis("ISPConfigUtil", [ "deleteTZOffset", "retrieveTZOffset", "storeTZOffset" ]);
//	profileInstancializeApis("ISPDailyReportManager", [ "deleteDailyColProperties", "deleteDailyColProperty", "deleteDailyComment", "deleteDailyReport", "deleteDailyReportDraft", "deleteDailyReportDrafts", "deleteDailyReports", "getDailyColProperties", "getDailyColPropertiesCount", "getDailyColProperty", "getDailyReport", "getDailyReportAttachedFiles", "getDailyReportAttachedFilesCount", "getDailyReportCustomers", "getDailyReportCustomersCount", "getDailyReportDraft", "getDailyReportDrafts", "getDailyReportDraftsCount", "getDailyReportISPUserInfoNotices", "getDailyReportISPUserInfoNoticesCount", "getDailyReports", "getDailyReportsCount", "getNewNoticeDailyReportInfos", "getNewNoticeDailyReportInfosCount", "getNonReadDocuments", "getSfamDlyCustomer", "getSfamDlyCustomers", "getSfatDlyClients", "getSfatDlyClientsCount", "getSfatDlySalesmans", "getSfatDlySalesmansCount", "setDailyColPropertiesSortCondition", "setDailyReportDetailSearchType", "setDailyReportDraftSortCondition", "setDailyReportSortCondition", "updateDailyColProperty", "updateDailyComment", "updateDailyReport", "updateDailyReportDraft", "updateDailyReportReadFlg" ]);
//	profileInstancializeApis("ISPDocumentManager", [ "deleteDocument", "deleteDocumentFolder", "deleteDocumentFolders", "deleteDocumentIncAccData", "deleteDocuments", "getDocument", "getDocumentAttachedFiles", "getDocumentAttachedFilesCount", "getDocumentes", "getDocumentFolder", "getDocumentFolderACLs", "getDocumentFolderACLsUsers", "getDocumentFolders", "getDocumentFoldersCount", "getDocumentISPUserInfoNotices", "getDocumentISPUserInfoNoticesCount", "getDocuments", "getDocumentsCount", "getNonReadDocuments", "getReferableCommunityDocumentFolders", "getReferableNormalDocumentFolders", "setDocumentDetailSearchType", "setDocumentFolderACLLevel", "setDocumentFolderDetailSearchType", "setDocumentFolderSortCondition", "setDocumentSortCondition", "setParentDocumentFolder", "updateDocument", "updateDocumentFolder", "updateDocumentReadFlg", "updateDocumentSubordinateACLs" ]);
//	profileInstancializeApis("ISPEnvironmentManager", [ "deleteApplicationInitial", "deleteEnvironmentValue", "getApplicationInitial", "getApplicationInitials", "getApplicationInitialsCount", "getEnvironmentValue", "getEnvironmentValues", "getEnvironmentValuesCount", "setEnvironmentSortCondition", "updateApplicationInitial", "updateEnvironmentValue" ]);
//	profileInstancializeApis("ISPEventManager", [ "deleteEvent", "deleteEventComment", "deleteEventComment", "deleteEventComments", "deleteEvents", "DoJoinEvent", "getEvent", "getEventComment", "getEventComments", "getEventCommentsCount", "getEventJoins", "getEventNewNotices", "getEventNewNoticesCount", "getEvents", "getEventsCount", "getJoinedEventsByUserCd", "getJoinedEventsCountByUserCd", "getNonAnsweredEventsByUserCd", "getNonAnsweredEventsCountByUserCd", "getNonJoinedEventsByUserCd", "getNonJoinedEventsCountByUserCd", "getParticipantsCount", "setAnsweredEventNewNotice", "setSortCondition", "updateEvent", "updateEventComment" ]);
//	profileInstancializeApis("ISPMailAccountManager", [ "deleteAccountInfos", "deleteAccountInitial", "deleteAddressHistory", "deleteManagerServer", "deleteMountFolders", "deleteRule", "deleteRuleCondition", "deleteSortFolders", "deleteTemplate", "getAccountCount", "getAccountInfo", "getAccountInitial", "getAccountList", "getAddressHistory", "getDefaultAccount", "getFullAccountInfo", "getManagerServer", "getMaxUid", "getMountFolders", "getRule", "getRuleCondition", "getRuleConditions", "getRules", "getSortFolders", "getTemplate", "getTemplates", "isExistAddress", "setAccountSortCondition", "setDefaultAccount", "setFolderSortCondition", "setMaxUid", "updateAccountInfo", "updateAccountInitial", "updateAddressHistory", "updateManagerServer", "updateMountFolders", "updateRule", "updateRuleCondition", "updateSortFolders", "updateTemplate" ]);
//	profileInstancializeApis("ISPMailManager", [ "closeCurFolder", "copyMessages", "createFolder", "disconnect", "expungeFolder", "getAllHeaders", "getAttachment", "getAttachmentFromRFC822", "getChildrenFolder", "getContentMessage", "getEmlMessage", "getEncodingList", "getFolderList", "getFolderNodes", "getFolderSize", "getImportantMessages", "getMaxFolderSize", "getMessage", "getMessageAddress", "getMessageCount", "getMessageFromRFC822", "getMessages", "getMessagesAllHeader", "getMessagesByMsgNOS", "getUIDAttachment", "getUIDAttachmentFromRFC822", "getUIDContentMessage", "getUIDEmlMessage", "getUIDMessage", "getUIDMessageAddress", "getUIDMessageFromRFC822", "getUIDMessages", "getUnreadMessageCount", "getUnreadMessages", "getUnreadMessagesRange", "initConnect", "isConnect", "isExistFolder", "isSupportSort", "moveMessages", "openCurFolder", "removeFolder", "removeMessage", "removePOPMessage", "removeUIDMessage", "renameFolder", "searchMessage", "sendMail", "sendNotificationMail", "sendUIDNotificationMail", "setSeen", "setUIDSeen", "sortMessages", "sortMessagesFetch" ]);
//	profileInstancializeApis("ISPRequestionManager", [ "deleteRequestion", "deleteRequestionComment", "deleteRequestionComment", "deleteRequestionComments", "deleteRequestions", "DoVote", "getAnsweredRequestionsByUserCd", "getAnsweredRequestionsCountByUserCd", "getNonAnsweredRequestionsByUserCd", "getNonAnsweredRequestionsCountByUserCd", "getRequestion", "getRequestionAnswerers", "getRequestionComment", "getRequestionComments", "getRequestionCommentsCount", "getRequestionNewNotices", "getRequestionNewNoticesCount", "getRequestions", "getRequestionsCount", "getRequestionTallies", "getRequestionTally", "setAnsweredRequestionNewNotice", "setSortCondition", "updateRequestion", "updateRequestionComment" ]);
//	profileInstancializeApis("ISPScheduleManager", [ "addFavoriteGroup", "addFavoriteGroups", "deleteAll", "deleteFacilities", "deleteFacility", "deleteFacilityGroup", "deleteFacilityGroups", "deleteFavoriteGroup", "deleteGroupACL", "deleteGroupACLs", "deleteGroupSort", "deleteGroupSorts", "deleteInitialization", "deleteInitializations", "deleteMailConfig", "deleteMailConfigs", "deletePersonalACL", "deletePersonalACLs", "deleteReserve", "deleteReserves", "deleteSchedule", "deleteScheduleMail", "getFacilities", "getFacilitiesCount", "getFacility", "getFacilityGroup", "getFacilityGroups", "getFacilityGroupsCount", "getFacilityReserves", "getFacilityReservesCount", "getFavoriteGroups", "getFavoriteGroupsCount", "getGroupACL", "getGroupACLs", "getGroupACLsCount", "getGroupSort", "getGroupSorts", "getInitialization", "getInitializations", "getMailConfig", "getMailConfigs", "getPersonalACL", "getPersonalACLs", "getPersonalACLsCount", "getReserve", "getReserveForUpdate", "getReserves", "getReservesByFacilities", "getReservesByFacility", "getReservesByIndex", "getReservesByUser", "getReservesByUsers", "getReservesCount", "getReservesWithFacilityReservesByFacilities", "getReservesWithFacilityReservesByFacility", "getReservesWithSchedulesByUser", "getReservesWithSchedulesByUsers", "getScheduleFacilityInitializationsCount", "getScheduleGroupSortsCount", "getScheduleMails", "getScheduleMailsCount", "getSchedules", "getSchedulesCount", "getScheduleUserMailConfigsCount", "setFacilityACLLevel", "setFacilityDetailSearchType", "setFacilityGroupACLLevel", "setFacilityGroupDetailSearchType", "setFacilityGroupSortCondition", "setFacilityParentGroupSearchType", "setFacilitySortCondition", "setGroupACLSortCondition", "setPersonalACLSortCondition", "setReserveDetailSearchType", "setReserveSortCondition", "setScheduleGroupSortSortCondition", "updateFacility", "updateFacilityGroup", "updateFacilitySubordinateACLs", "updateGroupACL", "updateGroupSort", "updateInitialization", "updateMailConfig", "updatePersonalACL", "updateReserve", "updateSchedule", "updateScheduleMail" ]);
//	profileStaticApis("ISPSession", [ "clear", "get", "remove", "set" ]);
//	profileInstancializeApis("ISPToDoManager", [ "deleteExistStatus", "deleteToDoCategories", "deleteToDoCategory", "deleteToDoInfo", "deleteToDoInfos", "deleteToDoMem", "deleteToDoNotice", "deleteToDoNotices", "getExistStatus", "getExistStatuses", "getExistStatusesCount", "getToDoAttachedFiles", "getToDoAttachedFilesCount", "getToDoCategories", "getToDoCategoriesCount", "getToDoCategory", "getToDoInfo", "getToDoInfos", "getToDoInfosCount", "getToDoMember", "getToDoMembers", "getToDoMembersCount", "getToDoNotice", "getToDoNotices", "getToDoNoticesCount", "setNoticeFlg", "setToDoCategoryDetailSearchType", "setToDoCategorySortCondition", "setToDoInfoDetailSearchType", "setToDoInfoSortCondition", "setToDoNoticeSortCondition", "updateExistStatus", "updateToDoCategory", "updateToDoInfo", "updateToDoMember", "updateToDoNotice" ]);

}