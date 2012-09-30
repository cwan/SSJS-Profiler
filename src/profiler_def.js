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
			var funcFullName = receiverName + "." + p;
			
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
	
	// TODO アプリケーション共通モジュール API
	
	// TODO アクセスセキュリティモジュール API
	
	// TODO アプリケーション共通マスタ API
	
	// TODO ワークフローモジュール API (BPW)
	
	// TODO FormatCreator API
	
	// TODO ポータル API 
	
	// TODO マスカット連携モジュール API 
	
	// TODO BPM API 
	
	// IM-共通マスタ API 
	profileInstancializeApis("AppCmnSearchCondition", [ "addCondition", "addConditionAsTarget", "addConditionAsTargetWithIndex", "addConditionWithIndex", "addIsNotNull", "addIsNotNullAsTarget", "addIsNotNullAsTargetWithIndex", "addIsNotNullWithIndex", "addIsNull", "addIsNullAsTarget", "addIsNullAsTargetWithIndex", "addIsNullWithIndex", "addLike", "addLikeAsTarget", "addLikeAsTargetWithIndex", "addLikeWithIndex", "addNotLike", "addNotLikeAsTarget", "addNotLikeAsTargetWithIndex", "addNotLikeWithIndex", "addOrder", "addOrderAsTarget", "addOrderAsTargetWithIndex", "addOrderWithIndex", "copy", "createConditionSection", "createWhereSection", "getConditionCount", "getConditions", "getDeleteSqlStatement", "getLogicalOperetor", "getOrders", "getParameters", "getSearchTargetValues", "getSortDirection", "isUseLike", "setLogicalOperetor", "setSearchTargetValues", "setSortDirection" ]);
	profileInstancializeApis("AppCommonManager", [ "getSystemEndDate", "getSystemStartDate", "setSystemStartDate" ]);
	profileInstancializeApis("IMMCompanyGroupManager", [ "changeCompanyGroupSetState", "countCompanyGroup", "countCompanyGroupWithCompany", "countCompanyWithCompanyGroup", "countCompanyWithCompanyGroupTree", "countTreeRoot", "getAbsoluteBranch", "getAbsoluteChildren", "getAbsoluteIsolation", "getAbsoluteTree", "getBranch", "getChildren", "getCompanyAttachTerm", "getCompanyAttachTermList", "getCompanyGroup", "getCompanyGroupList", "getCompanyGroupSet", "getCompanyGroupSetAll", "getCompanyGroupTerm", "getCompanyGroupTermList", "getFullPathListNode", "getIsolation", "getTree", "getTreeTerm", "getTreeTermList", "listCompanyGroup", "listCompanyGroupWithCompany", "listCompanyWithCompanyGroup", "listCompanyWithCompanyGroupTree", "listTreeRoot", "mergeBackwardTermCompanyAttach", "mergeBackwardTermCompanyGroup", "mergeBackwardTermCompanyGroupSet", "mergeForwardTermCompanyAttach", "mergeForwardTermCompanyGroup", "mergeForwardTermCompanyGroupSet", "moveTermCompanyAttach", "moveTermCompanyGroup", "moveTermCompanyGroupSet", "removeCompanyAttach", "removeCompanyGroup", "removeCompanyGroupInclusion", "removeCompanyGroupSet", "searchCompanyGroup", "searchCompanyGroupWithCompany", "searchCompanyWithCompanyGroup", "searchCompanyWithCompanyGroupTree", "searchTreeRoot", "separateTermCompanyAttach", "separateTermCompanyGroup", "separateTermCompanyGroupSet", "setCompanyAttach", "setCompanyGroup", "setCompanyGroupInclusion", "totalCompanyGroup", "totalCompanyGroupWithCompany", "totalCompanyWithCompanyGroup", "totalCompanyWithCompanyGroupTree", "totalTreeRoot", "updateCompanyGroupSet" ]);
	profileInstancializeApis("IMMCompanyManager", [ "changeDepartmentSetState", "countCompany", "countCompanyPost", "countCompanyPostWithUser", "countCompanyPostWithUserOnDepartment", "countDepartment", "countDepartmentCategory", "countDepartmentCategoryItem", "countDepartmentCategoryItemWithDepartment", "countDepartmentWithDepartmentCategoryItem", "countDepartmentWithUser", "countTreeRoot", "countUserWithCompanyPost", "countUserWithCompanyPostOnDepartment", "countUserWithDepartment", "countUserWithDepartmentTree", "getAbsoluteBranch", "getAbsoluteChildren", "getAbsoluteIsolation", "getAbsoluteTree", "getBranch", "getChildren", "getCompany", "getCompanyAll", "getCompanyPost", "getCompanyPostAttachTerm", "getCompanyPostAttachTermList", "getCompanyPostList", "getCompanyPostTerm", "getCompanyPostTermList", "getDepartment", "getDepartmentCategory", "getDepartmentCategoryItem", "getDepartmentCategoryItemAttachTerm", "getDepartmentCategoryItemAttachTermList", "getDepartmentList", "getDepartmentSet", "getDepartmentSetAll", "getDepartmentSetWithCompany", "getDepartmentTerm", "getDepartmentTermList", "getFullPathListNode", "getIsolation", "getTree", "getTreeTerm", "getTreeTermList", "getUserAttachTerm", "getUserAttachTermList", "listCompany", "listCompanyPost", "listCompanyPostWithUser", "listCompanyPostWithUserOnDepartment", "listDepartment", "listDepartmentCategory", "listDepartmentCategoryItem", "listDepartmentCategoryItemWithDepartment", "listDepartmentWithDepartmentCategoryItem", "listDepartmentWithUser", "listTreeRoot", "listUserWithCompanyPost", "listUserWithCompanyPostOnDepartment", "listUserWithDepartment", "listUserWithDepartmentTree", "mergeBackwardTermCompanyPost", "mergeBackwardTermDepartment", "mergeBackwardTermDepartmentSet", "mergeBackwardTermUserAttach", "mergeForwardTermCompanyPost", "mergeForwardTermDepartment", "mergeForwardTermDepartmentSet", "mergeForwardTermUserAttach", "moveTermCompanyPost", "moveTermDepartment", "moveTermDepartmentSet", "moveTermUserAttach", "removeCompany", "removeCompanyPost", "removeCompanyPostAttach", "removeDepartment", "removeDepartmentCategory", "removeDepartmentCategoryItem", "removeDepartmentCategoryItemAttach", "removeDepartmentInclusion", "removeDepartmentSet", "removeUserAttach", "searchCompany", "searchCompanyPost", "searchCompanyPostWithUser", "searchCompanyPostWithUserOnDepartment", "searchDepartment", "searchDepartmentCategory", "searchDepartmentCategoryItem", "searchDepartmentCategoryItemWithDepartment", "searchDepartmentWithDepartmentCategoryItem", "searchDepartmentWithUser", "searchTreeRoot", "searchUserWithCompanyPost", "searchUserWithCompanyPostOnDepartment", "searchUserWithDepartment", "searchUserWithDepartmentTree", "separateTermCompanyPost", "separateTermDepartment", "separateTermDepartmentSet", "separateTermUserAttach", "setCompanyPost", "setCompanyPostAttach", "setDepartment", "setDepartmentCategory", "setDepartmentCategoryItem", "setDepartmentCategoryItemAttach", "setDepartmentInclusion", "setUserAttach", "totalCompany", "totalCompanyPost", "totalCompanyPostWithUser", "totalCompanyPostWithUserOnDepartment", "totalDepartment", "totalDepartmentCategory", "totalDepartmentCategoryItem", "totalDepartmentCategoryItemWithDepartment", "totalDepartmentWithDepartmentCategoryItem", "totalDepartmentWithUser", "totalTreeRoot", "totalUserWithCompanyPost", "totalUserWithCompanyPostOnDepartment", "totalUserWithDepartment", "totalUserWithDepartmentTree", "updateCompany", "updateDepartmentSet" ]);
	profileInstancializeApis("IMMCorporationManager", [ "changeCorporationSetState", "countCorporation", "countCorporationWithCustomer", "countCustomerWithCorporation", "countCustomerWithCorporationTree", "countTreeRoot", "getAbsoluteBranch", "getAbsoluteChildren", "getAbsoluteIsolation", "getAbsoluteTree", "getBranch", "getChildren", "getCorporation", "getCorporationAttachTerm", "getCorporationAttachTermList", "getCorporationList", "getCorporationSet", "getCorporationSetAll", "getCorporationTerm", "getCorporationTermList", "getCorporationWithCustomer", "getCustomerWithCorporation", "getFullPathListNode", "getIsolation", "getTree", "getTreeTerm", "getTreeTermList", "listCorporation", "listCorporationWithCustomer", "listCustomerWithCorporation", "listCustomerWithCorporationTree", "listTreeRoot", "mergeBackwardCorporation", "mergeBackwardCorporationAttach", "mergeBackwardCorporationSet", "mergeForwardCorporation", "mergeForwardCorporationAttach", "mergeForwardCorporationSet", "moveTermCorporation", "moveTermCorporationAttach", "moveTermCorporationSet", "removeCorporation", "removeCorporationAttach", "removeCorporationInclusion", "removeCorporationSet", "searchCorporation", "searchCorporationWithCustomer", "searchCustomerWithCorporation", "searchCustomerWithCorporationTree", "searchTreeRoot", "separateTermCorporation", "separateTermCorporationAttach", "separateTermCorporationSet", "setCorporation", "setCorporationAsRoot", "setCorporationAttach", "setCorporationInclusion", "totalCorporation", "totalCorporationWithCustomer", "totalCustomerWithCorporation", "totalCustomerWithCorporationTree", "totalTreeRoot", "updateCorporationSet" ]);
	profileInstancializeApis("IMMCurrencyRateManager", [ "get", "getAll", "getRating", "getTerm", "getTermList", "mergeBackwardTerm", "mergeForwardTerm", "moveTerm", "remove", "separateTerm", "set" ]);
	profileInstancializeApis("IMMCustomerManager", [ "count", "get", "getTerm", "getTermList", "list", "mergeBackwardTerm", "mergeForwardTerm", "moveTerm", "remove", "search", "separateTerm", "set", "total" ]);
	profileInstancializeApis("IMMItemCategoryManager", [ "changeCategorySetState", "countCategory", "countCategoryWithItem", "countItemWithCategory", "countItemWithCategoryTree", "countTreeRoot", "getAbsoluteBranch", "getAbsoluteChildren", "getAbsoluteIsolation", "getAbsoluteTree", "getBranch", "getCategory", "getCategoryAttachTerm", "getCategoryAttachTermList", "getCategoryList", "getCategorySet", "getCategorySetAll", "getCategoryTerm", "getCategoryTermList", "getCategoryWithItem", "getChildren", "getFullPathListNode", "getIsolation", "getItemWithCategory", "getTree", "getTreeTerm", "getTreeTermList", "listCategory", "listCategoryWithItem", "listItemWithCategory", "listItemWithCategoryTree", "listTreeRoot", "mergeBackwardCategory", "mergeBackwardCategoryAttach", "mergeBackwardCategorySet", "mergeForwardCategory", "mergeForwardCategoryAttach", "mergeForwardCategorySet", "moveTermCategory", "moveTermCategoryAttach", "moveTermCategorySet", "removeCategory", "removeCategoryAttach", "removeCategoryInclusion", "removeCategorySet", "searchCategory", "searchCategoryWithItem", "searchItemWithCategory", "searchItemWithCategoryTree", "searchTreeRoot", "separateTermCategory", "separateTermCategoryAttach", "separateTermCategorySet", "setCategory", "setCategoryAsRoot", "setCategoryAttach", "setCategoryInclusion", "totalCategory", "totalCategoryWithItem", "totalItemWithCategory", "totalItemWithCategoryTree", "totalTreeRoot", "updateCategorySet" ]);
	profileInstancializeApis("IMMItemManager", [ "count", "get", "getTerm", "getTermList", "list", "mergeBackwardTerm", "mergeForwardTerm", "moveTerm", "remove", "search", "separateTerm", "set", "total" ]);
	profileInstancializeApis("IMMPrivateGroupManager", [ "countPrivateGroup", "countUserWithPrivateGroup", "getPrivateGroup", "listUserWithPrivateGroup", "removePrivateGroup", "removeUserAttach", "searchPrivateGroup", "searchUserWithPrivateGroup", "setPrivateGroup", "setUserAttach", "totalUserWithPrivateGroup" ]);
	profileInstancializeApis("IMMPublicGroupManager", [ "changePublicGroupSetState", "countPublicGroup", "countPublicGroupCategory", "countPublicGroupCategoryItem", "countPublicGroupCategoryItemWithPublicGroup", "countPublicGroupRole", "countPublicGroupRoleWithUser", "countPublicGroupRoleWithUserOnPublicGroup", "countPublicGroupWithPublicGroupCategoryItem", "countPublicGroupWithUser", "countTreeRoot", "countUserWithPublicGroup", "countUserWithPublicGroupRole", "countUserWithPublicGroupRoleOnPublicGroup", "countUserWithPublicGroupTree", "getAbsoluteBranch", "getAbsoluteChildren", "getAbsoluteIsolation", "getAbsoluteTree", "getBranch", "getChildren", "getFullPathListNode", "getIsolation", "getPublicGroup", "getPublicGroupCategory", "getPublicGroupCategoryItem", "getPublicGroupCategoryItemAttachTerm", "getPublicGroupCategoryItemAttachTermList", "getPublicGroupList", "getPublicGroupRole", "getPublicGroupRoleAttachTerm", "getPublicGroupRoleAttachTermList", "getPublicGroupRoleList", "getPublicGroupRoleTerm", "getPublicGroupRoleTermList", "getPublicGroupSet", "getPublicGroupSetAll", "getPublicGroupTerm", "getPublicGroupTermList", "getTree", "getTreeTerm", "getTreeTermList", "getUserAttachTerm", "getUserAttachTermList", "listPublicGroup", "listPublicGroupCategory", "listPublicGroupCategoryItem", "listPublicGroupCategoryItemWithPublicGroup", "listPublicGroupRole", "listPublicGroupRoleWithUser", "listPublicGroupRoleWithUserOnPublicGroup", "listPublicGroupWithPublicGroupCategoryItem", "listPublicGroupWithUser", "listTreeRoot", "listUserWithPublicGroup", "listUserWithPublicGroupRole", "listUserWithPublicGroupRoleOnPublicGroup", "listUserWithPublicGroupTree", "mergeBackwardTermPublicGroup", "mergeBackwardTermPublicGroupRole", "mergeBackwardTermPublicGroupSet", "mergeBackwardTermUserAttach", "mergeForwardTermPublicGroup", "mergeForwardTermPublicGroupRole", "mergeForwardTermPublicGroupSet", "mergeForwardTermUserAttach", "moveTerm", "moveTermPublicGroup", "moveTermPublicGroupRole", "moveTermPublicGroupSet", "moveTermUserAttach", "removePublicGroup", "removePublicGroupCategory", "removePublicGroupCategoryItem", "removePublicGroupCategoryItemAttach", "removePublicGroupInclusion", "removePublicGroupRole", "removePublicGroupRoleAttach", "removePublicGroupSet", "removeUserAttach", "searchPublicGroup", "searchPublicGroupCategory", "searchPublicGroupCategoryItem", "searchPublicGroupCategoryItemWithPublicGroup", "searchPublicGroupRole", "searchPublicGroupRoleWithUser", "searchPublicGroupRoleWithUserOnPublicGroup", "searchPublicGroupWithPublicGroupCategoryItem", "searchPublicGroupWithUser", "searchTreeRoot", "searchUserWithPublicGroup", "searchUserWithPublicGroupRole", "searchUserWithPublicGroupRoleOnPublicGroup", "searchUserWithPublicGroupTree", "separateTermPublicGroup", "separateTermPublicGroupRole", "separateTermPublicGroupSet", "separateTermUserAttach", "set", "setPublicGroup", "setPublicGroupCategory", "setPublicGroupCategoryItem", "setPublicGroupCategoryItemAttach", "setPublicGroupInclusion", "setPublicGroupRole", "setPublicGroupRoleAttach", "setUserAttach", "totalPublicGroup", "totalPublicGroupCategory", "totalPublicGroupCategoryItem", "totalPublicGroupCategoryItemWithPublicGroup", "totalPublicGroupRole", "totalPublicGroupRoleWithUser", "totalPublicGroupRoleWithUserOnPublicGroup", "totalPublicGroupWithPublicGroupCategoryItem", "totalPublicGroupWithUser", "totalTreeRoot", "totalUserWithPublicGroup", "totalUserWithPublicGroupRole", "totalUserWithPublicGroupRoleOnPublicGroup", "totalUserWithPublicGroupTree", "updatePublicGroupSet" ]);
	profileInstancializeApis("IMMUserManager", [ "countUser", "countUserCategory", "countUserCategoryItem", "countUserCategoryItemWithUser", "countUserWithUserCategoryItem", "getUser", "getUserCategory", "getUserCategoryItem", "getUserCategoryItemAttachTerm", "getUserCategoryItemAttachTermList", "getUserList", "getUserTerm", "getUserTermList", "listUser", "listUserCategory", "listUserCategoryItem", "listUserCategoryItemWithUser", "listUserWithUserCategoryItem", "mergeBackwardTermUser", "mergeForwardTermUser", "moveTermUser", "removeUser", "removeUserCategory", "removeUserCategoryItem", "removeUserCategoryItemAttach", "searchUser", "searchUserCategory", "searchUserCategoryItem", "searchUserCategoryItemWithUser", "searchUserWithUserCategoryItem", "separateTermUser", "setUser", "setUserCategory", "setUserCategoryItem", "setUserCategoryItemAttach", "totalUser", "totalUserCategory", "totalUserCategoryItem", "totalUserCategoryItemWithUser", "totalUserWithUserCategoryItem" ]);
	profileInstancializeApis("SearchCondition", [ "addCondition", "addConditionWithIndex", "addIsNotNull", "addIsNotNullWithIndex", "addIsNull", "addIsNullWithIndex", "addLike", "addLikeWithIndex", "addNotLike", "addNotLikeWithIndex", "addOrder", "addOrderWithIndex", "copy", "createConditionSection", "createOrderSection", "createWhereSection", "getConditionCount", "getConditions", "getDeleteSqlStatement", "getLogicalOperetor", "getOrders", "getParameters", "getSortDirection", "isUseLike", "setLogicalOperetor", "setSortDirection" ]);
	
	// TODO IM-Workflow API
	
	// Intranet Startpack API
	profileInstancializeApis("ISPAddressManager", [ "deleteAddressItemPersonalMng", "deleteAddressItemPersonalMngs", "deleteAddressItemPublicMng", "deleteAddressItemPublicMngs", "deleteGroup", "deleteGroups", "deletePerson", "deletePersons", "getAddressItemPersonalMng", "getAddressItemPersonalMngs", "getAddressItemPersonalMngsCount", "getAddressItemPublicMng", "getAddressItemPublicMngs", "getAddressItemPublicMngsCount", "getGroup", "getGroups", "getGroupsCount", "getPerson", "getPersons", "getPersonsCount", "setAddressGroupDetailSearchType", "setGroupSortCondition", "setPersonSortCondition", "updateAddressItemPersonalMng", "updateAddressItemPublicMng", "updateGroup", "updatePerson" ]);
	profileInstancializeApis("ISPBlogArticleManager", [ "deleteBlogAccessHistories", "deleteBlogArticles", "deleteBlogArticlesIncAccData", "deleteBlogAttachedFiles", "deleteBlogComments", "getBlogAccessHistories", "getBlogAccessHistoriesCount", "getBlogArticle", "getBlogArticleIncAccData", "getBlogArticleIndexDay", "getBlogArticleIndexMonth", "getBlogArticles", "getBlogArticlesCount", "getBlogArticlesIncAccData", "getBlogAttachedFiles", "getBlogAttachedFilesCount", "getBlogComments", "getBlogCommentsCount", "setBlogAccessHistorySortCondition", "setBlogArticleSortCondition", "setBlogAttachedFileSortCondition", "setBlogCommentSortCondition", "updateBlogAccessHistory", "updateBlogArticle", "updateBlogAttachedFile", "updateBlogComment" ]);
	profileInstancializeApis("ISPBlogMasterManager", [ "deleteBlogCategories", "deleteBlogCategoriesIncAccData", "deleteBlogFortes", "deleteBlogKinds", "getBlogCategories", "getBlogCategoriesCount", "getBlogCategoriesIncAccData", "getBlogFortes", "getBlogFortesCount", "getBlogKinds", "getBlogKindsCount", "setBlogCategoriesortCondition", "setBlogForteSortCondition", "setBlogKindSortCondition", "updateBlogCategory", "updateBlogCategorySorts", "updateBlogForte", "updateBlogForteSorts", "updateBlogKind", "updateBlogKindSortsAttentions" ]);
	profileInstancializeApis("ISPBlogMessageManager", [ "deleteBlogMessageReceivers", "deleteBlogMessages", "deleteBlogMessagesIncAccData", "getBlogMessage", "getBlogMessageIncAccData", "getBlogMessageReceiver", "getBlogMessageReceivers", "getBlogMessageReceiversCount", "getBlogMessages", "getBlogMessagesCount", "getBlogMessagesIncAccData", "setBlogMessageReceiverSortCondition", "setBlogMessageSortCondition", "updateBlogMessage", "updateBlogMessageReceiver" ]);
	profileInstancializeApis("ISPBlogUserManager", [ "deleteBlogFriends", "deleteBlogProfiles", "deleteBlogProfilesIncAccData", "deleteBlogUsersCategories", "deleteBlogUsersConfigs", "deleteBlogUsersConfigsIncAccData", "deleteBlogUsersFortes", "getBlogFriends", "getBlogFriendsCount", "getBlogProfile", "getBlogProfileIncAccData", "getBlogProfiles", "getBlogProfilesCount", "getBlogProfilesIncAccData", "getBlogUsersCategories", "getBlogUsersCategoriesCount", "getBlogUsersConfig", "getBlogUsersConfigIncAccData", "getBlogUsersConfigs", "getBlogUsersConfigsCount", "getBlogUsersConfigsIncAccData", "getBlogUsersFortes", "getBlogUsersFortesCount", "setBlogFriendSortCondition", "setBlogProfileSortCondition", "setBlogUsersCategorySortCondition", "setBlogUsersConfigSortCondition", "setBlogUsersForteSortCondition", "updateBlogFriend", "updateBlogProfile", "updateBlogUsersCategory", "updateBlogUsersConfig", "updateBlogUsersForte" ]);
	profileInstancializeApis("ISPBulletinManager", [ "deleteBulletin", "deleteBulletinCls", "deleteBulletinClses", "deleteBulletins", "deleteBulletinsIncAccData", "getBulletin", "getBulletinAttachedFiles", "getBulletinAttachedFilesCount", "getBulletinCls", "getBulletinClsACLs", "getBulletinClsACLsUsers", "getBulletinClses", "getBulletinClsesCount", "getBulletinISPUserInfoNotices", "getBulletinISPUserInfoNoticesCount", "getBulletins", "getBulletinsCount", "getNonReadBulletins", "getReferableCommunityBulletinClses", "getReferableNormalBulletinClses", "setBulletinClsACLLevel", "setBulletinClsDetailSearchType", "setBulletinClsSortCondition", "setBulletinDetailSearchType", "setBulletinSortCondition", "setParentBulletinCls", "updateBulletin", "updateBulletinCls", "updateBulletinReadFlg", "updateBulletinReadFlgBatch", "updateBulletinSubordinateACLs" ]);
	profileStaticApis("ISPClientDate", [ "format", "getTimeZoneOffset", "stringify", "toDate", "toDBString" ]);
	profileInstancializeApis("ISPCommonManager", [ "deleteAttachedFile", "deleteGroupRelation", "getACLs", "getACLsUsers", "getGroupRelations", "getGroupRelationsCount", "getNewNoticeInfos", "getNewNoticeInfosCount", "getNewScheduleInfosCount", "getNewScheduleNoticeInfos", "updateAttachedFile", "updateGroupRelation" ]);
	profileInstancializeApis("ISPCommunityManager", [ "deleteCommunities", "deleteCommunity", "deleteCommunityGroup", "deleteCommunityGroups", "getCommunities", "getCommunitiesCount", "getCommunity", "getCommunityGroup", "getCommunityGroups", "getCommunityGroupsCount", "getCommunityMembers", "getCommunityMembersCount", "setCommunityDetailSearchType", "setCommunityGroupSortCondition", "setCommunitySortCondition", "updateCommunity", "updateCommunityGroup" ]);
	profileInstancializeApis("ISPConferenceManager", [ "deleteConference", "deleteConferenceCls", "deleteConferenceClses", "deleteConferenceMng", "deleteConferences", "deleteConferencesIncAccData", "getConference", "getConferenceAttachedFiles", "getConferenceAttachedFilesCount", "getConferenceCd", "getConferenceCls", "getConferenceClsACLs", "getConferenceClsACLsUsers", "getConferenceClses", "getConferenceClsesCount", "getConferenceISPUserInfoNotices", "getConferenceISPUserInfoNoticesCount", "getConferenceMng", "getConferenceMngs", "getConferenceMngsCount", "getConferences", "getConferencesCount", "getConferenceses", "getNonReadConferences", "getReferableCommunityConferenceClses", "getReferableNormalConferenceClses", "getReferableThreadCds", "getReferableThreadCdsCount", "setConferenceClsACLLevel", "setConferenceClsDetailSearchType", "setConferenceClsSortCondition", "setConferenceDetailSearchType", "setConferenceSortCondition", "setParentConferenceCls", "updateConference", "updateConferenceCls", "updateConferenceMng", "updateConferenceReadFlg", "updateConferences", "updateConferenceSubordinateACLs" ]);
	profileStaticApis("ISPConfigUtil", [ "deleteTZOffset", "retrieveTZOffset", "storeTZOffset" ]);
	profileInstancializeApis("ISPDailyReportManager", [ "deleteDailyColProperties", "deleteDailyColProperty", "deleteDailyComment", "deleteDailyReport", "deleteDailyReportDraft", "deleteDailyReportDrafts", "deleteDailyReports", "getDailyColProperties", "getDailyColPropertiesCount", "getDailyColProperty", "getDailyReport", "getDailyReportAttachedFiles", "getDailyReportAttachedFilesCount", "getDailyReportCustomers", "getDailyReportCustomersCount", "getDailyReportDraft", "getDailyReportDrafts", "getDailyReportDraftsCount", "getDailyReportISPUserInfoNotices", "getDailyReportISPUserInfoNoticesCount", "getDailyReports", "getDailyReportsCount", "getNewNoticeDailyReportInfos", "getNewNoticeDailyReportInfosCount", "getNonReadDocuments", "getSfamDlyCustomer", "getSfamDlyCustomers", "getSfatDlyClients", "getSfatDlyClientsCount", "getSfatDlySalesmans", "getSfatDlySalesmansCount", "setDailyColPropertiesSortCondition", "setDailyReportDetailSearchType", "setDailyReportDraftSortCondition", "setDailyReportSortCondition", "updateDailyColProperty", "updateDailyComment", "updateDailyReport", "updateDailyReportDraft", "updateDailyReportReadFlg" ]);
	profileInstancializeApis("ISPDocumentManager", [ "deleteDocument", "deleteDocumentFolder", "deleteDocumentFolders", "deleteDocumentIncAccData", "deleteDocuments", "getDocument", "getDocumentAttachedFiles", "getDocumentAttachedFilesCount", "getDocumentes", "getDocumentFolder", "getDocumentFolderACLs", "getDocumentFolderACLsUsers", "getDocumentFolders", "getDocumentFoldersCount", "getDocumentISPUserInfoNotices", "getDocumentISPUserInfoNoticesCount", "getDocuments", "getDocumentsCount", "getNonReadDocuments", "getReferableCommunityDocumentFolders", "getReferableNormalDocumentFolders", "setDocumentDetailSearchType", "setDocumentFolderACLLevel", "setDocumentFolderDetailSearchType", "setDocumentFolderSortCondition", "setDocumentSortCondition", "setParentDocumentFolder", "updateDocument", "updateDocumentFolder", "updateDocumentReadFlg", "updateDocumentSubordinateACLs" ]);
	profileInstancializeApis("ISPEnvironmentManager", [ "deleteApplicationInitial", "deleteEnvironmentValue", "getApplicationInitial", "getApplicationInitials", "getApplicationInitialsCount", "getEnvironmentValue", "getEnvironmentValues", "getEnvironmentValuesCount", "setEnvironmentSortCondition", "updateApplicationInitial", "updateEnvironmentValue" ]);
	profileInstancializeApis("ISPEventManager", [ "deleteEvent", "deleteEventComment", "deleteEventComment", "deleteEventComments", "deleteEvents", "DoJoinEvent", "getEvent", "getEventComment", "getEventComments", "getEventCommentsCount", "getEventJoins", "getEventNewNotices", "getEventNewNoticesCount", "getEvents", "getEventsCount", "getJoinedEventsByUserCd", "getJoinedEventsCountByUserCd", "getNonAnsweredEventsByUserCd", "getNonAnsweredEventsCountByUserCd", "getNonJoinedEventsByUserCd", "getNonJoinedEventsCountByUserCd", "getParticipantsCount", "setAnsweredEventNewNotice", "setSortCondition", "updateEvent", "updateEventComment" ]);
	profileInstancializeApis("ISPMailAccountManager", [ "deleteAccountInfos", "deleteAccountInitial", "deleteAddressHistory", "deleteManagerServer", "deleteMountFolders", "deleteRule", "deleteRuleCondition", "deleteSortFolders", "deleteTemplate", "getAccountCount", "getAccountInfo", "getAccountInitial", "getAccountList", "getAddressHistory", "getDefaultAccount", "getFullAccountInfo", "getManagerServer", "getMaxUid", "getMountFolders", "getRule", "getRuleCondition", "getRuleConditions", "getRules", "getSortFolders", "getTemplate", "getTemplates", "isExistAddress", "setAccountSortCondition", "setDefaultAccount", "setFolderSortCondition", "setMaxUid", "updateAccountInfo", "updateAccountInitial", "updateAddressHistory", "updateManagerServer", "updateMountFolders", "updateRule", "updateRuleCondition", "updateSortFolders", "updateTemplate" ]);
	profileInstancializeApis("ISPMailManager", [ "closeCurFolder", "copyMessages", "createFolder", "disconnect", "expungeFolder", "getAllHeaders", "getAttachment", "getAttachmentFromRFC822", "getChildrenFolder", "getContentMessage", "getEmlMessage", "getEncodingList", "getFolderList", "getFolderNodes", "getFolderSize", "getImportantMessages", "getMaxFolderSize", "getMessage", "getMessageAddress", "getMessageCount", "getMessageFromRFC822", "getMessages", "getMessagesAllHeader", "getMessagesByMsgNOS", "getUIDAttachment", "getUIDAttachmentFromRFC822", "getUIDContentMessage", "getUIDEmlMessage", "getUIDMessage", "getUIDMessageAddress", "getUIDMessageFromRFC822", "getUIDMessages", "getUnreadMessageCount", "getUnreadMessages", "getUnreadMessagesRange", "initConnect", "isConnect", "isExistFolder", "isSupportSort", "moveMessages", "openCurFolder", "removeFolder", "removeMessage", "removePOPMessage", "removeUIDMessage", "renameFolder", "searchMessage", "sendMail", "sendNotificationMail", "sendUIDNotificationMail", "setSeen", "setUIDSeen", "sortMessages", "sortMessagesFetch" ]);
	profileInstancializeApis("ISPRequestionManager", [ "deleteRequestion", "deleteRequestionComment", "deleteRequestionComment", "deleteRequestionComments", "deleteRequestions", "DoVote", "getAnsweredRequestionsByUserCd", "getAnsweredRequestionsCountByUserCd", "getNonAnsweredRequestionsByUserCd", "getNonAnsweredRequestionsCountByUserCd", "getRequestion", "getRequestionAnswerers", "getRequestionComment", "getRequestionComments", "getRequestionCommentsCount", "getRequestionNewNotices", "getRequestionNewNoticesCount", "getRequestions", "getRequestionsCount", "getRequestionTallies", "getRequestionTally", "setAnsweredRequestionNewNotice", "setSortCondition", "updateRequestion", "updateRequestionComment" ]);
	profileInstancializeApis("ISPScheduleManager", [ "addFavoriteGroup", "addFavoriteGroups", "deleteAll", "deleteFacilities", "deleteFacility", "deleteFacilityGroup", "deleteFacilityGroups", "deleteFavoriteGroup", "deleteGroupACL", "deleteGroupACLs", "deleteGroupSort", "deleteGroupSorts", "deleteInitialization", "deleteInitializations", "deleteMailConfig", "deleteMailConfigs", "deletePersonalACL", "deletePersonalACLs", "deleteReserve", "deleteReserves", "deleteSchedule", "deleteScheduleMail", "getFacilities", "getFacilitiesCount", "getFacility", "getFacilityGroup", "getFacilityGroups", "getFacilityGroupsCount", "getFacilityReserves", "getFacilityReservesCount", "getFavoriteGroups", "getFavoriteGroupsCount", "getGroupACL", "getGroupACLs", "getGroupACLsCount", "getGroupSort", "getGroupSorts", "getInitialization", "getInitializations", "getMailConfig", "getMailConfigs", "getPersonalACL", "getPersonalACLs", "getPersonalACLsCount", "getReserve", "getReserveForUpdate", "getReserves", "getReservesByFacilities", "getReservesByFacility", "getReservesByIndex", "getReservesByUser", "getReservesByUsers", "getReservesCount", "getReservesWithFacilityReservesByFacilities", "getReservesWithFacilityReservesByFacility", "getReservesWithSchedulesByUser", "getReservesWithSchedulesByUsers", "getScheduleFacilityInitializationsCount", "getScheduleGroupSortsCount", "getScheduleMails", "getScheduleMailsCount", "getSchedules", "getSchedulesCount", "getScheduleUserMailConfigsCount", "setFacilityACLLevel", "setFacilityDetailSearchType", "setFacilityGroupACLLevel", "setFacilityGroupDetailSearchType", "setFacilityGroupSortCondition", "setFacilityParentGroupSearchType", "setFacilitySortCondition", "setGroupACLSortCondition", "setPersonalACLSortCondition", "setReserveDetailSearchType", "setReserveSortCondition", "setScheduleGroupSortSortCondition", "updateFacility", "updateFacilityGroup", "updateFacilitySubordinateACLs", "updateGroupACL", "updateGroupSort", "updateInitialization", "updateMailConfig", "updatePersonalACL", "updateReserve", "updateSchedule", "updateScheduleMail" ]);
	profileStaticApis("ISPSession", [ "clear", "get", "remove", "set" ]);
	profileInstancializeApis("ISPToDoManager", [ "deleteExistStatus", "deleteToDoCategories", "deleteToDoCategory", "deleteToDoInfo", "deleteToDoInfos", "deleteToDoMem", "deleteToDoNotice", "deleteToDoNotices", "getExistStatus", "getExistStatuses", "getExistStatusesCount", "getToDoAttachedFiles", "getToDoAttachedFilesCount", "getToDoCategories", "getToDoCategoriesCount", "getToDoCategory", "getToDoInfo", "getToDoInfos", "getToDoInfosCount", "getToDoMember", "getToDoMembers", "getToDoMembersCount", "getToDoNotice", "getToDoNotices", "getToDoNoticesCount", "setNoticeFlg", "setToDoCategoryDetailSearchType", "setToDoCategorySortCondition", "setToDoInfoDetailSearchType", "setToDoInfoSortCondition", "setToDoNoticeSortCondition", "updateExistStatus", "updateToDoCategory", "updateToDoInfo", "updateToDoMember", "updateToDoNotice" ]);
	
}