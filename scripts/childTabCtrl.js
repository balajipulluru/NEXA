var childTabApp = angular.module('childTabApp', ['adfDynamicSample','adf','ui.router','adf.structures.base','ngMaterial',
	'adf.widget.ui_ace','adf.widget.mantis_FE',
	'adf.widget.trace_file','adf.widget.nexa_csv_viewer','adfCustom',
	'LocalStorageModule','eda-helperprefs','helper']);

childTabApp.run(["$templateCache", function($templateCache)
  { $templateCache.put("showDirSelectionTrace.html","<md-dialog aria-label=\"ShowDirSelection\"> <md-toolbar> <div class=\"md-toolbar-tools\"> <img src=\"../../../icons/nn4.png\" style=\"height: 40px;\" /> <h2>Select File</h2> <span flex></span> <a style=\"cursor: pointer;\" ng-click=\"closeDialog()\"> <i class=\"material-icons\">close</i> </a> </div> </md-toolbar> <md-dialog-content> <div class=\"md-dialog-content\"> <form role=\"form\" name=\"showDirSelect\"> <div layout=\"column\" style=\"background-color:#fefefe\"> <md-input-container layout-nowrap> <label>File Directory</label> <input ng-model=\"config.cqDirectory\" name=\"cqDirectory\" size=\"60\" type=\"text\" ng-blur=\"trace_file.getfiles()\" ng-keyup=\"$event.keyCode == 13 ? trace_file.getfiles() : null\"> <div ng-messages=\"showDirSelect.cqDirectory.$error\"><div>{{ trace_file.dirValidationMsg }}</div> </div></md-input-container> <md-input-container layout-nowrap> <label>Filter*</label> <input ng-model=\"config.file_filter\" name=\"Filter\" size=\"60\" type=\"text\" ng-blur=\"trace_file.getfiles()\" ng-keyup=\"$event.keyCode == 13 ? trace_file.getfiles() : null\"> </md-input-container> <div layout=row layout-align=\"end\" flex><md-button class=\"md-raised md-primary\" title=\"Filter files\" data-placement=\"bottom\"  aria-label=\"info\" style=\"{height:5px;color:blue;}\" ng-click=\"trace_file.getfiles()\" ng-show=\"!trace_file.files\">  List </md-button></div> <div layout=\"column\" style=\"margin-top:5px;margin-bottom:10px\" ng-show=\"trace_file.files\"> <md-input-container layout-nowrap><label>Files in the Directory:</label><md-select ng-model=\"trace_file.selected_file\" name=\"FileOptions\"><md-option ng-repeat=\"file in trace_file.files\" ng-value=file>{{ file }}</md-option></md-select></md-input-container><div layout=row layout-align=\"end\" flex> <md-button class=\"md-raised md-warn\" title=\"Cancel Reload\" data-placement=\"bottom\" style=\"height:5px;color : rgb(100, 100, 100);background-color: rgba(230, 230, 229, 0.96);\" ng-click=\"closeDialog()\" > Cancel </md-button> <md-button class=\"md-raised md-primary\" title=\"Reload file\" data-placement=\"bottom\"  style=\"height:5px;\" ng-click=\"trace_file.reload_file(trace_file.selected_file);closeDialog();\" > Open </md-button> </div></div> </div> </form> </div> </md-dialog-content> </md-dialog>");
}])


childTabApp.controller('childTabCtrl', function(sharedModelServices, $scope, $http, $window, $mdDialog, storeService, $stateParams) {

	$scope.widgetDataLoaded = false;
	$scope.parentScope = $window.parentScope;
	console.log("Hello World from childTabApp controller -$scope.parentScope - ",$scope.parentScope);
	$scope.definition = $scope.parentScope.definition;
	$scope.widget = $scope.parentScope.widget;
	//$scope.widgetClasses = $scope.parentScope.widgetClasses;
	$scope.widgetState = $scope.parentScope.widgetState;
	$scope.config = $scope.parentScope.config;
	$scope.col = $scope.parentScope.col;
	$scope.options = $scope.parentScope.options;
	$scope.editMode = $scope.parentScope.editMode;
    var sessionId = $window.location.href;
 	var regex = new RegExp("(=|&)")
    var res = sessionId.split(regex);
	// var res = sessionId.split("/");
	sessionId = res[2];
	storeService.setSessionId(sessionId);
	storeService.loadSessionDataFromFile("consolidatedJson").then(function(k){
      		sharedModelServices.intra_setSharedData(k);
      		$scope.widgetDataLoaded = true;
     });
	

	// $scope.dataSrvc = $window.$scope.parentScope.dataSrvc;
	// //console.log("##### - ",$window.$scope.parentScope);
	// //console.log("##### - ",window.opener);
	// $scope.showDialog = function(ev){
	//   var dirSelScope = $scope.$new();
	//   $mdDialog.show(
	//       {
	//         templateUrl: "showDirSelectionTrace.html",
	//         //parent: parentWindow,
	//         scope: dirSelScope,
	//         preserveScope: true,
	//         focusOnOpen: true,
	//         // autoWrap: true,
	//         // skipHide: true,
	//         targetEvent: ev,
	//         multiple: true
	//         //locals: {param:  config}
	//       }).then(function(answer){
	//       });
	// }
	
	$scope.updateVaules = function(){
		console.log("popupCtrl updateVaules - ");
		$window.parentScope.$apply();
	}
})
