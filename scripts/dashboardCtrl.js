 angular.module('adfDynamicSample')
  .controller('dashboardCtrl', ['$location','$http','$rootScope', '$scope', '$stateParams', 'storeService', 'data', 'cq_info', 'sharedModelServices','sessionId','$window','eda.helperprefs','$mdDialog','Helper',function($location, $http, $rootScope, $scope, $stateParams, storeService, data, cq_info, sharedModelServices,sessionId,$window,helperprefs,$mdDialog,Helper){
    //this.name = $routeParams.id;
    let dashboardData = this
    $scope.dashboard_enable = false;
    $scope.dashboard_reload_error = false;
    console.log(data);
    dashboardData.name = $stateParams.id;
    dashboardData.model = data;
    //storeService.writeFile(dashboardData.name,dashboardData.model);
    location.href = "#/boards/"+ sessionId + "/" + $stateParams.id;
    var helper_notified = new Object;

    $scope.$on('helper.needcell',function(evt,args) {
      console.log("notified of need for helper",args);
      args.helper.helperDialog($mdDialog,args.cell,args.user);
      $scope.helper_loading=true;
    });

    $scope.$on('helper.dialogcancelled',function(evt,args) {
      console.log("user cancelled dialog for helper",args);
    });

    function helper_check_dialog(helperData,fails,selectedCells,helperlaunched,cteklog_not_found,callback_func){
      $mdDialog.show({
        controller: HelperNeededCtrl,
        templateUrl: './partials/helperNeeded.html',
        clickOutsideToClose:true,
        focusOnOpen: true,
        multiple: true,
        locals: {
        helperData:helperData,
        fails: fails,
        selectedCells:selectedCells,
        helperlaunched:helperlaunched,
        cteklog_not_found:cteklog_not_found
       },
     }).then(function(answer) {
       // $scope.readCQDir($scope.currentDir,"SELECTFILES");
       callback_func(answer);
     });
    }
    function helper_check(helperData,selectedCells,helperJustLaunched=false,callback_func){
      var no_tokens_fail = helperData.tokens.length<=0;
      var cteklog_not_found = false;
      var cell_token_fail_list = [];
      selectedCells.forEach(function(val1){
        if((helperData.tokens.indexOf(val1) == -1)){
          cell_token_fail_list.push(val1);
        }
      });
      var fails = {"no_tokens_fail":no_tokens_fail,
                    "cell_token_fail_list":cell_token_fail_list };
     if(helperJustLaunched){
       var cmd = "ls";
       var args = '.CTE_AFS_PW';
       $http.get('/remoteExecute/?cmd='+ cmd + '&args='+ args + '&afsId=' + helperData.userid+ '&cell=' + helperData.cell).then(function(response){
         if(response.data.data.rc!=0){
           cteklog_not_found=true;
           helper_check_dialog(helperData,fails,selectedCells,helperJustLaunched,cteklog_not_found,callback_func);
         } else{
					if(cell_token_fail_list.length>0) {
             helper_check_dialog(helperData,fails,selectedCells,helperJustLaunched,cteklog_not_found,callback_func);
           } else{
             callback_func();
           }
         }
       });
     } else {
       if(no_tokens_fail||cell_token_fail_list.length>0){
         helper_check_dialog(helperData,fails,selectedCells,helperJustLaunched,cteklog_not_found,callback_func);
       }else{
         callback_func();
       }
     }
    }
      //var cqDebugInfo = sharedModelServices.intra_getValue("CQ_DEBUG_INFO");
    if((Object.keys(cq_info).length==0) || (!cq_info.CQ_DEBUG_INFO)){
      $scope.dashboard_enable = true;
      console.log("DashboardCtrl (E): cqinfo data not available.")
    } else {
      var logic_debug_dir = cq_info.CQ_DEBUG_INFO.logic_debug_dir;
      var SrchPaths = new Array();
      if(cq_info.CQ_DEBUG_INFO.additional_search_dir && cq_info.CQ_DEBUG_INFO.additional_search_dir.length > 0) {
        SrchPaths = cq_info.CQ_DEBUG_INFO.additional_search_dir.split(":");
      }
    //SrchPaths.push(answer.cqDirectory);
      $scope.unique_picked_cells = new Set();
      var pickedcell;
      SrchPaths.forEach(function(filename,index){
        pickedcell = helperprefs.file2cell(filename);
        $scope.unique_picked_cells.add(pickedcell);
        //console.log("file name, pickedcell ",filename,pickedcell);
      });
      pickedcell = helperprefs.file2cell(logic_debug_dir);
      if(cq_info.USER_INFO && cq_info.USER_INFO.cell){
        pickedcell=cq_info.USER_INFO.cell;
      } else {
        var cells = ["apd", "eda", "awd","vlsilab"];
        if(helper_process_cell_select_override){
          if(cells.findIndex(function(element){return element==pickedcell})==-1){
            $scope.unique_picked_cells.add(pickedcell);
            pickedcell="apd";
          }
        }
      }
      $scope.unique_picked_cells.add(pickedcell);
      if(install_cell && (install_cell!=""))
      {
        $scope.unique_picked_cells.add(install_cell);
      }
      function __helper_check(helperdata){
        $scope.currentDir = logic_debug_dir;
        var helper_launched = false;
        if($scope.helper_loading){
          helper_launched = true;
          $scope.helper_loading=false;
        }
        var func = function(answer=true){
          if(answer) {
            $scope.dashboard_enable = true;
            $scope.$apply();
          } else {
            $scope.dashboard_reload_error=true;
          }
        }
        helper_check(helperdata,$scope.unique_picked_cells,helper_launched,func);
      }
      // //assigning a scope variable to have the selected cell value in prefs callback
      // $scope.pickedcell = pickedcell;

      if(cq_info.USER_INFO && cq_info.USER_INFO.user){
        //Delegate operation: when the dashboard is delegated, afsId stored in sesion model
        //is of previous user. However, the model can be updated during pause api made to server.
        helperprefs.prefs().then(function(prefs){
          var user="";
          if(prefs.cellinfo){
            if(prefs.cellinfo[pickedcell]){
              var cell = prefs.cellinfo[pickedcell];
						if(cell.id && cell.id == cq_info.USER_INFO.user) {
                user = cq_info.USER_INFO.user;
              }else{
                if(cell.ids && (cell.ids.indexOf(cq_info.USER_INFO.user)!=-1)){
                  user = cq_info.USER_INFO.user;
                }
              }
            }
          }
          if(user!=""){
            helperprefs.helper(pickedcell,cq_info.USER_INFO.user).then(function(helperdata){
              __helper_check(helperdata);
            });
          } else {
            //implies different user, must be delegated session, so read file and set data_filter
					storeService.clear();
					storeService.get(dashboardData.name).then(function(data){
              dashboardData.model = data;
              helperprefs.helper(pickedcell).then(function(helperdata){
                cq_info.USER_INFO.user=helperdata.userid;
                sharedModelServices.intra_insertKeyValue("USER_INFO","user",helperdata.userid);
                // answer.afsId=helperdata.userid;//use the correct id and cell name for the files
                // answer.cellName=helperdata.cell;
                __helper_check(helperdata);
              });
            });
          }
        });
      }else {
        helperprefs.helper(pickedcell).then(function(helperdata){
          cq_info.USER_INFO.user=helperdata.userid;
          sharedModelServices.intra_insertKeyValue("USER_INFO","user",helperdata.userid);
          // answer.afsId=helperdata.userid;//use the correct id and cell name for the files
          // answer.cellName=helperdata.cell;
          __helper_check(helperdata);
        });
      }
  }

  function HelperNeededCtrl($scope, $mdDialog, $http, helperData, fails, selectedCells, helperlaunched,cteklog_not_found) {
    $scope.helperdata = helperData;
    var cell_list = Array.from(selectedCells);
    $scope.cellList = cell_list.toString();
    $scope.fails = fails;
    $scope.cell_fail_list = "";
    $scope.helper_header = "NEXA Helper Error"
    if(helperlaunched) {
      if(cteklog_not_found){
          if($scope.fails.cell_token_fail_list && $scope.fails.cell_token_fail_list.length>0){
            $scope.cteklog_code=2
          } else {
            $scope.cteklog_code = 1;
            $scope.helper_header = "NEXA Helper Warning"
          }
        } else {
          if($scope.fails.cell_token_fail_list && $scope.fails.cell_token_fail_list.length>0)
          {
            $scope.cteklog_code = 3;
            $scope.cell_fail_list = $scope.fails.cell_token_fail_list.toString();
          }
        }
    } else {
      if(fails.no_tokens_fail){
          $scope.helper_code = 1;
      } else {
        $scope.helper_code = 2;
        $scope.cell_fail_list = $scope.fails.cell_token_fail_list.toString();
      }
    }

    $scope.hide = function() {
      $mdDialog.hide();
    };

    $scope.cancel = function() {
      $mdDialog.cancel();
    };

    $scope.answer = function(answer) {
      if($scope.cteklog_code==1){
        $mdDialog.hide(true);
      } else {
        $mdDialog.hide(false);
      }
    };
  }

    this.delete = function(id){
      console.log(id);
      storeService.delete(id);
      $location.path('/boards/'+sessionId);
      $rootScope.$broadcast('navChanged');
    };
    this.getInterfaceCount = function(){
      console.log("getInterfaceCount");
      storeService.getAll().then(function(data){
        console.log("data",data);
        if(data){
          this.hasInterface = true;
        } else {
          this.hasInterface = false;
        }
      })
    };
    this.getWidgetCount = function(id){
      storeService.get(id).then(function(srcResponse){
        srcIntf = srcResponse;
        var rowLength= srcIntf.rows.length;
        console.log("rowLength - before"+rowLength);
      })
    };
	var a;
	var aspectNames = [];
	storeService.loadSessionDataFromFile("consolidatedJson").then(function(k) {
		sharedModelServices.intra_setSharedData(k);
		for(var key in k){
			aspectNames.push(key);
			sharedModelServices.intra_setAspectNames(aspectNames);
		}
	});

	var aspectNamesGlobal = [];
	storeService.loadSharedDataFromFile("consolidatedJson").then(function(k) {
		sharedModelServices.inter_setSharedData(k);

		for(var key in k){
			aspectNamesGlobal.push(key);
			sharedModelServices.inter_setAspectNames(aspectNamesGlobal);
		}
	});

	$scope.collapsible = true;
	$scope.maximizable = true;
	$scope.categories = false;

  $window.onbeforeunload = function()
  {
    storeService.writeFile(this.name,this.model);
  }
    $scope.$on('adfDashboardChanged', function(event, name, model) {
      console.log("adf dashboard event",name,model);
      storeService.set(name, model);
      //storeService.writeFile(name, model);
    });
  }])
