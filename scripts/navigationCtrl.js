angular.module('adfDynamicSample')
  .controller('navigationCtrl', function(cq_info, childWindows, $mdDialog,sharedModelServices, $scope, $q, $location, storeService, stateContainer, $rootScope, sessionId, $http, $window,TemplateWidgets,getFiles,Helper){
    var nav = this;
    var helper_notified = new Object;
    console.log("navigationCtrl " +sessionId);
  nav.showDashboard = false;
  nav.showDashboards = function(){
    nav.showDashboard = !nav.showDashboard;
  }
  nav.showMenu = false;
  nav.showToggleMenu = function() {
    nav.showMenu = !nav.showMenu;
    if(nav.showMenu == false){
      nav.showDashboard = false;
    }
  }

    // hide popup div when clicking outside the div - Balaji Pulluru - Start
    var dropdownMenuDiv = document.getElementById("appMenu");
    var dropdownMenu = document.getElementById("appIcon");
    document.onclick = check;

    function check(e){
      //alert(e);
      var target = (e && e.target) || (event && event.srcElement);
      if (!checkParent(target, dropdownMenuDiv)) {
        // click NOT on the appMenu
        if (checkParent(target, dropdownMenu)) {
          // click on the appIcon
          if (dropdownMenuDiv.classList.contains("invisible")) {
            dropdownMenuDiv.classList.remove("invisible");
          } else {
            dropdownMenuDiv.classList.add("invisible");
          }
        } else {
          // click both outside appIcon and outside appMenu, hide appMenu
          dropdownMenuDiv.classList.add("invisible");
        }
      }
    }

    function checkParent(t, elm) {
      while(t.parentNode) {
        if( t == elm ) {return true;}
        t = t.parentNode;
      }
      return false;
    }
    // hide popup div when clicking outside the div - Balaji Pulluru - End

    //storeService.setSessionId(sessionId);
    //shashi: get session details and set the title, colors of the tabs for the session
  $http.get('/session_data/' + sessionId ).success(function(data){
    //console.log('sessionData',data);
         //check if there is an input to auto initialise the session
        //  if(data.hasOwnProperty('sessionInput')){
        $scope.sessionName = data.sessionName;
        var temp = data.sessionName.toLowerCase();
	temp = temp.replace(/\s/g,'');
        $window.document.title = 'NEXA-'+ data.sessionName;
        var link = document.createElement('link');
        link.type = 'image/x-icon';
        link.rel = 'shortcut icon';
        storeService.loadSharedDataFromFile("consolidatedJson").then(function(k) {
      		sharedModelServices.inter_setSharedData(k);

      		var session_count = 0;
      		var t = [];

      		t = sharedModelServices.inter_getValue("sessionList");
      		if (t === "Not found")
      		{
      		  t = [];
      		}
      		for (var i=0;i<t.length;i++)
      		{
      			if (data.sessionName === t[i])
      			{
      			 session_count = i + 1;
      			}

      		}

		var idx = temp.indexOf("session");
		if(idx>=0) {
		   session_count = temp.substring(idx+7);
		   console.log(session_count);
		   link.href = 'icons/favicon_'+session_count+'.ico';

		   document.getElementsByTagName('head')[0].appendChild(link);
		 }
      		if (session_count == 0)
      		{
        		session_count = t.length + 1;
        		t.push(data.sessionName);
        		sharedModelServices.inter_insertKeyValue("favicon","sessionList",t);
      		}

    		});
      })

    this.navClass = function(page) {
      var currentRoute = $location.path().substring(1);
      return page === currentRoute || new RegExp(page).test(currentRoute) ? 'active' : '';
    };

    $scope.$on('initialiseSession', function(event,cq_dir){
      console.log("HANDLER");
      nav.create("cq_dir1");
    });

     function sortAlphaNum(a,b) {
        var reA = /[^a-zA-Z]/g;
        var reN = /[^0-9]/g;
        var aA = a.replace(reA, "");
        var bA = b.replace(reA, "");
        if(aA === bA) {
            var aN = parseInt(a.replace(reN, ""), 10);
            var bN = parseInt(b.replace(reN, ""), 10);
            return aN === bN ? 0 : aN > bN ? 1 : -1;
        } else {
            return aA > bA ? 1 : -1;
        }
    }

    $scope.iDIR = function(ev) {
      storeService.getAll().then(function(data){
      console.log("get all - data -",data);
        if(data && data.length <= 0)
        {
        $mdDialog.show({
            templateUrl: "./partials/cqDirInput.html",
            // clickOutsideToClose: true,
            controller: DialogController,
            controllerAs: 'dgCtrl',
            targetEvent: ev,
            multiple: true,
            // parent: angular.element(document.body),
            // locals: {parent: $scope},
            locals: {param: ''},
          }).then(function(answer){

          });
        }
      })
    };

    function searchStringInArray (str, strArray) {
      var match = [];
      var i =0;
      for (var j=0; j<strArray.length; j++) {
        if (strArray[j].match(str))
        {
          match[i] = strArray[j];
          i= i+1;
        }
      }
      return match;
    }

    var cloudConfigController = function($scope, $mdDialog, $rootScope) {
      var cloudConfigCtrl =  this;
      cloudConfigCtrl.dedicated_server_launch = false;
      var cloudConfig= sharedModelServices.intra_getValue("NEXA_Cloud_Configuration");
      console.log("cloudConfig.LSF_Options ",cloudConfig.LSF_Options);
      if(!cloudConfig.LSF_Options){
        cloudConfigCtrl.LSF_Options = '{"mem": 2, "cpu": 1, "R": "select[(osname==linux) && (type==X86_64)]","W":"720:00"}';
      } else {
        cloudConfigCtrl.LSF_Options = cloudConfig.LSF_Options;
      }
      if(cloudConfig.dedicated_server_launch)
      {
        cloudConfigCtrl.dedicated_server_launch = cloudConfig.dedicated_server_launch;
      }

      $scope.cancel = function() {
        $mdDialog.cancel();
      };
      $scope.savecloudConfig = function(answer){
        if(answer.LSF_Options!=cloudConfig.LSF_Options){
          console.log("^^ savecloudConfig - ",answer.LSF_Options, cloudConfig.LSF_Options);
          sharedModelServices.intra_insertKeyValue("NEXA_Cloud_Configuration","LSF_Options",answer.LSF_Options);
        }
        if(answer.dedicated_server_launch!=cloudConfig.dedicated_server_launch){
          console.log("^^ save launch config - ",answer.dedicated_server_launch, cloudConfig.dedicated_server_launch);
          sharedModelServices.intra_insertKeyValue("NEXA_Cloud_Configuration","dedicated_server_launch",answer.dedicated_server_launch);
        }
        $mdDialog.hide();
      }
    }

    var UserPrefController = function($scope, $mdDialog, $rootScope) {
      console.log("UserPrefController - ",nav.selectTabName);
      var usrPrfCtrl =  this;
      var usrPrefs = sharedModelServices.intra_getValue("USER_PREFS");
      usrPrfCtrl.toggleHead = usrPrefs.toggleHeader;
      $scope.cancel = function() {
        $mdDialog.cancel();
      };
      $scope.saveUsrPrefs = function(answer){
        console.log("^^ saveUsrPrefs - ",answer.toggleHead, usrPrfCtrl.toggleHead, nav.selectTabName);
        sharedModelServices.intra_insertKeyValue("USER_PREFS","toggleHeader",answer.toggleHead);
        $mdDialog.hide();
        $rootScope.$broadcast('widgToggleHead', answer.toggleHead);
      }
    }

    function CteKlogInfoCtrl($scope, $mdDialog, args, cells) {
      $scope.args = args;

      /*setting error code to select appropriate msg and actions
    mode 1: one unique cell identified across search directories
    actions: display session expiry warningm but continue with session Initializer
    mode 2: multiple unique cells identified
    actions: display can't continue with session initialize and stop initialization
    mode 3: helper launched and cteklog is setup but input files are in cells for which tokens does not exists
    actions: display can't continue with session initialize and stop initialization
    */

      if(cells.cell_fail_list && cells.cell_fail_list.length>0)
      {
        $scope.cteklog_code = 3;
        $scope.cell_fail_list = cells.cell_fail_list.toString();
      } else {
        $scope.cteklog_code = cells.pickedcell.size>1?2:1;
      }
      var cell_list = Array.from(cells.pickedcell);
      $scope.cellList = cell_list.toString();

      $scope.hide = function() {
        $mdDialog.hide();
      };

      $scope.cancel = function() {
        $mdDialog.cancel();
      };

      $scope.answer = function(answer) {
        if($scope.cteklog_code!=1){
          $window.location.reload();
        } else {
          $mdDialog.hide(answer);
        }
      };
    }

    function HelperNeededCtrl($scope, $mdDialog, $http, helperData, fails, selectedCells, helperlaunched,cteklog_not_found) {
      $scope.helperdata = helperData;
      var cell_list = Array.from(selectedCells);
      $scope.cellList = cell_list.join(', ');
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
          $mdDialog.hide(answer);
        } else {
          $window.location.reload();
        }
      };
    }

    var DialogController = [ '$scope','$mdDialog',"param","eda.helperprefs","DirService", function($scope,$mdDialog,param,helperprefs,DirService) {

      //$scope.validCQDir = false;
      var helper_notified = new Object;
      $scope.param= param;
      var dgCtrl = this;
      $scope.helper_loading=false;

      if($scope.param=='showCQ'){
        var userInfo = sharedModelServices.intra_getValue("USER_INFO");
        var cqDebugInfo = sharedModelServices.intra_getValue("CQ_DEBUG_INFO");

        dgCtrl.cqDirectory = cqDebugInfo.logic_debug_dir;
        dgCtrl.adSrchDirectory = cqDebugInfo.additional_search_dir;
        dgCtrl.afsId = userInfo.user;
        dgCtrl.cellName = userInfo.cell;
        dgCtrl.traceOption = cqDebugInfo.files_selected.trace;
        dgCtrl.aetOption = cqDebugInfo.files_selected.aet;
        dgCtrl.vhdlOption = cqDebugInfo.files_selected.vhdl;
        dgCtrl.iolistOption = cqDebugInfo.files_selected.iolist;
        dgCtrl.csvOption = cqDebugInfo.files_selected.cgcsv;
        dgCtrl.scratchPad = cqDebugInfo.scratch_pad;
        dgCtrl.hierarchy = cqDebugInfo.hierarchy;
      }

      if($scope.param=='showPopNotes'){
        var cqDebugInfo = sharedModelServices.intra_getValue("CQ_DEBUG_INFO");
        dgCtrl.scratchPad = cqDebugInfo.scratch_pad;
      }
      dgCtrl.showUseCases = "";
      if($scope.param =="LogicDebugDir"){
        dgCtrl.showSelectLogicDebugDir = true;
        dgCtrl.showClockGatePower = false;
        dgCtrl.showUseCases = "LOGIC DEBUG";
      } else if($scope.param =="ClockGatePower"){
        dgCtrl.showSelectLogicDebugDir = false;
        dgCtrl.showClockGatePower = true;
        dgCtrl.showUseCases = "CLOCK GATING AND POWER";
      }
      $scope.isValidCQDir= function() {
        console.log("isValidCQDir",$scope.validCQDir);
        return  $scope.validCQDir;
      }
      $scope.hide = function() {
        $mdDialog.hide();
      };
      $scope.cancel = function() {
        $mdDialog.cancel();
      };
      $scope.answer = function(answer){
        console.log("answer", answer);

        $mdDialog.hide(answer);
        nav.create("cq_dir1");
      }
      $scope.helperArray=[];

      // $scope.saveScratch = function(answer){
      //   sharedModelServices.intra_insertKeyValue("CQ_DEBUG_INFO","scratch_pad",answer.scratchPad);
      // }
      function unique(a){
        var arr = [];
        for (var i=0;i<a.length;i++){
          if ( arr.indexOf(a[i]) == -1){
              arr.push(a[i]);
          }
        }
        return arr;
      }
      $scope.readCQDir = function(answer, initCase) {
        console.log("readCQDir answer", answer, initCase);
        if(answer.cqDirectory){

    		  var adhelperArray =[], newObj = new Object(), newArr = new Array();
    		  var adhelper = [], cntr = 1;
    		  $scope.fileTypeMap = new Object();

          var adSrchPaths = new Array();
          if(answer.adSrchDirectory && answer.adSrchDirectory.length > 0) {
    		    adSrchPaths = answer.adSrchDirectory.split(":");
          }
    		  adSrchPaths.push(answer.cqDirectory);
          adSrchPaths = unique(adSrchPaths);
          adSrchPaths.forEach(function(listItem, index){

            var tmpPath = listItem;
            console.log("Paths",tmpPath,answer);
            //$http.get('/ReadDir/?dirPath='+tmpPath +'&afsId=' +answer.afsId + '&cell=' + answer.cellName).success(function(response){
            DirService.getfiles(tmpPath,"",answer.cellName,answer.afsId).then(function(data){
              $scope.validCQDir = true;
              //adhelper[index] = data;
              //adhelper[index] = adhelper[index].substring(1, adhelper[index].length-1);
              // adhelperArray = adhelper[index].split(",");
              adhelperArray = data;
              for (var i=0;i<adhelperArray.length;i++)
              {
                if(adhelperArray[i] != ""){
                  $scope.fileTypeMap[tmpPath + '/' +adhelperArray[i]] = adhelperArray[i];
                  newArr.push({ "id":cntr, "fileName":adhelperArray[i], "fullPath":tmpPath + '/' +adhelperArray[i] });
                  console.log({ "id":cntr, "fileName":adhelperArray[i], "fullPath":tmpPath + '/' +adhelperArray[i] });
                  cntr = cntr+1;
                }
              }
              $scope.helperArray = newArr;
              console.log("$scope.helperArray - "+$scope.helperArray);
              console.log("=======++=========");
              $scope.getCQFiles(answer, initCase);
            },function(data){
              $scope.validCQDir = false;
            });
          })
        }
      };

    function readArrObj4Files(extn, arrObj, initCase){
      var match = [];
      var i =0;
      for (var j=0; j<arrObj.length; j++) {
        if (arrObj[j]['fileName'].match(extn)) {
          match[i] = arrObj[j];
          i= i+1;
        }
      }
      if(initCase=="SELECTFILES"){
        return match;
      } else if(initCase=="AUTOINIT") {
        return match[0]['fullPath'];
      }
    }
    $scope.setFilesWithPath = function(value){
      //to set the search text to a full path when switched in autocomplete
      if(dgCtrl.vhdlOption){
        dgCtrl.vhdlSearchText = (dgCtrl.vhdlOption && value)?dgCtrl.vhdlOption.fullPath:dgCtrl.vhdlOption.fileName;}
      if(dgCtrl.traceOption ){
        dgCtrl.traceSearchText = (dgCtrl.traceOption && value)?dgCtrl.traceOption.fullPath:dgCtrl.traceOption.fileName;}
      if(dgCtrl.aetOption){
      dgCtrl.aetSearchText = (dgCtrl.aetOption && value)?dgCtrl.aetOption.fullPath:dgCtrl.aetOption.fileName;}
      if(dgCtrl.iolistOption) {
        dgCtrl.iolistSearchText = (dgCtrl.iolistOption && value)?dgCtrl.iolistOption.fullPath:dgCtrl.iolistOption.fileName;}
      if(dgCtrl.csvOption) {
        dgCtrl.csvSearchText = value?dgCtrl.csvOption.fullPath:dgCtrl.csvOption.fileName;}
      //end
      $scope.filesWithPath = value;
    }
    $scope.getFilesWithPath = function() {
      return $scope.filesWithPath;
    }
      $scope.getCQFiles = function(answer, initCase) {
        $scope.initCase = initCase;
        console.log("getCQFiles answer", answer, initCase);

        //sharedModelServices.intra_insertKeyValue("defaultCommon","toggleHeader","true");
          console.log("helper array check",$scope.helperArray);
          //$scope.doValidation(answer);
          var helperArray = $scope.helperArray;

          if(initCase && initCase=="AUTOINIT"){
            answer.aetOption = readArrObj4Files("\.aet",helperArray,initCase);
            answer.traceOption = readArrObj4Files("\.trace($|\.gz$)",helperArray,initCase);
	           answer.vhdlOption = readArrObj4Files("\\.(v($)|vhdl($)|nvhdl($)|svhdl($)|turbo.*)",helperArray,initCase);
            answer.iolistOption = readArrObj4Files("\.iolist",helperArray,initCase);
            $scope.saveSelection(answer);
            $scope.answer(answer);
          } else if(initCase && initCase=="SELECTFILES"){
            $scope.aetOptions = readArrObj4Files("\.aet",helperArray,initCase);
            $scope.traceOptions = readArrObj4Files("\.trace($|\.gz$)",helperArray,initCase);
	           $scope.vhdlOptions = readArrObj4Files("\\.(v($)|vhdl($)|nvhdl($)|svhdl($)|turbo.*)",helperArray,initCase);
            $scope.ioOptions = readArrObj4Files("\.iolist",helperArray,initCase);
            $scope.csvOptions = readArrObj4Files("\.csv",helperArray,initCase);
            $scope.csvOptionsLength = $scope.csvOptions.length;
            // console.log("******");
            // console.log("$scope.aetOptions - ",$scope.aetOptions);
            // console.log("$scope.traceOptions - ",$scope.traceOptions);
            // console.log("$scope.vhdlOptions - ",$scope.vhdlOptions);
            // console.log("$scope.ioOptions - ",$scope.ioOptions);

            //select the first option for autocomplete
            if($scope.vhdlOptions[0]){
              dgCtrl.vhdlOption=$scope.vhdlOptions[0];
              dgCtrl.vhdlSearchText = $scope.filesWithPath?dgCtrl.vhdlOption.fullPath:dgCtrl.vhdlOption.fileName;
            }
            if($scope.traceOptions[0]){
              dgCtrl.traceOption=$scope.traceOptions[0];
              dgCtrl.traceSearchText = $scope.filesWithPath?dgCtrl.traceOption.fullPath:dgCtrl.traceOption.fileName;
            }
            if($scope.aetOptions[0]){
              dgCtrl.aetOption=$scope.aetOptions[0];
              dgCtrl.aetSearchText = $scope.filesWithPath?dgCtrl.aetOption.fullPath:dgCtrl.aetOption.fileName;
            }
            if($scope.ioOptions[0]){
              dgCtrl.iolistOption=$scope.ioOptions[0];
              dgCtrl.iolistSearchText = $scope.filesWithPath?dgCtrl.iolistOption.fullPath:dgCtrl.iolistOption.fileName;
            }
            if(($scope.csvOptionsLength>0) && $scope.csvOptions[0]){
              dgCtrl.csvOption=$scope.csvOptions[0];
              dgCtrl.csvSearchText = $scope.filesWithPath?dgCtrl.csvOption.fullPath:dgCtrl.csvOption.fileName;
            }
            //
          }
      };

      $scope.saveSelection = function(answer){
        console.log(" saveSelection options ",answer);

        //selected value in autocomplete is an object and not value
        var fileType = ['traceOption','vhdlOption','aetOption','iolistOption','csvOption']
        fileType.forEach(function(value,indes){
          if(answer[value]){
            answer[value] = (typeof answer[value] === 'string')?answer[value]:answer[value].fullPath;
          }
        });

        var files = {
          aet:answer.aetOption,
          trace:answer.traceOption,
          vhdl:answer.vhdlOption,
          iolist:answer.iolistOption,
          cgcsv:answer.csvOption
        };
        console.log(files);

        sharedModelServices.intra_insertKeyValue("USER_INFO","cell",answer.cellName);
        sharedModelServices.intra_insertKeyValue("USER_INFO","user",answer.afsId);
        sharedModelServices.intra_insertKeyValue("CQ_DEBUG_INFO","logic_debug_dir",answer.cqDirectory);
        sharedModelServices.intra_insertKeyValue("CQ_DEBUG_INFO","additional_search_dir",answer.adSrchDirectory);
        sharedModelServices.intra_insertKeyValue("CQ_DEBUG_INFO","files_selected",files);
        // sharedModelServices.intra_insertKeyValue("CQ_DEBUG_INFO","scratch_pad",scratchPadVal);
        sharedModelServices.intra_insertKeyValue("CQ_DEBUG_INFO","hierarchy",answer.hierarchy);
      }

      $scope.getItemData = function(item){
        return $scope.filesWithPath?item.fullPath:item.fileName;
      }

      $scope.QuerySearch = function(query,fileType){
         return query ? $scope[fileType].filter( createFilterFor(query) ) : $scope[fileType];
      }

      function createFilterFor(query) {
        var lowercaseQuery =angular.lowercase(query);

        return function filterFn(file) {
          if($scope.filesWithPath){
              return (file.fullPath.search(new RegExp(lowercaseQuery, "i")) >=0);
          } else{
            return (file.fileName.search(new RegExp(lowercaseQuery, "i")) >=0);
          }
        };
      }

      $scope.loadUseCase1 = function(answer){
        console.log("&&&& inside loadUseCase1");
        //helper-prefs integration
        var SrchPaths = new Array();
        $scope.currentDir = answer;
        if(answer.adSrchDirectory && answer.adSrchDirectory.length > 0) {
          SrchPaths = answer.adSrchDirectory.split(":");
        }
        //SrchPaths.push(answer.cqDirectory);
        $scope.unique_picked_cells = new Set();
        var pickedcell;
        SrchPaths.forEach(function(filename,index){
          pickedcell = helperprefs.file2cell(filename);
          $scope.unique_picked_cells.add(pickedcell);
          console.log("file name, pickedcell ",filename,pickedcell);
        });
        pickedcell = helperprefs.file2cell(answer.cqDirectory);
        var cells = ["apd", "eda", "awd", "vlsilab"]
        if(helper_process_cell_select_override){
          if(cells.findIndex(function(element){return element==pickedcell})==-1){
            $scope.unique_picked_cells.add(pickedcell);
            pickedcell="apd";
          }
        }
        $scope.unique_picked_cells.add(pickedcell);
        if(install_cell && (install_cell!=""))
        {
          $scope.unique_picked_cells.add(install_cell);
        }
        helperprefs.helper(pickedcell).then(function(helperdata){
          answer.afsId=helperdata.userid;//use the correct id and cell name for the files
          answer.cellName=helperdata.cell;
          $scope.currentDir = answer;
          var helper_launched = false;
          if($scope.helper_loading){
            helper_launched = true;
            $scope.helper_loading=false;
          }
          helper_check(helperdata,$scope.unique_picked_cells,helper_launched,function(){$scope.readCQDir(answer,"AUTOINIT");});
        });
        //$scope.dirValidation(answer);
      }

      helperprefs.prefs().then(function (prefs) {
        console.log("prefs loaded ",prefs);
      });

      $scope.$on('helper.needcell',function(evt,args) {
        $mdDialog.show({
          multiple: true
        });
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
         callback_func();
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
             if(cell_token_fail_list.length>0)
             {
               helper_check_dialog(helperData,fails,selectedCells,helperJustLaunched,cteklog_not_found,callback_func);
             } else{
               callback_func();
             }
           }
           console.log("Helper check case1",helperData,fails,selectedCells,helperJustLaunched,cteklog_not_found,callback_func);
         });
       } else {
         if(no_tokens_fail||cell_token_fail_list.length>0){
           console.log("Helper check case2",helperData,fails,selectedCells,helperJustLaunched,cteklog_not_found,callback_func);
           helper_check_dialog(helperData,fails,selectedCells,helperJustLaunched,cteklog_not_found,callback_func);
         }else{
           console.log("Helper check case 3");
           callback_func();
         }
       }
      }

      $scope.loadCQDebug = function(answer){
        //helper-prefs integration
        $scope.initialize_mode = "SELECTFILES"
        var SrchPaths = new Array();
        if(answer.adSrchDirectory && answer.adSrchDirectory.length > 0) {
          SrchPaths = answer.adSrchDirectory.split(":");
        }
        $scope.unique_picked_cells = new Set();
        var pickedcell;
        SrchPaths.forEach(function(filename,index){
          pickedcell = helperprefs.file2cell(filename);
          $scope.unique_picked_cells.add(pickedcell);
          console.log("file name, pickedcell ",filename,pickedcell);
        });
        pickedcell = helperprefs.file2cell(answer.cqDirectory);
        var cells = ["apd", "eda", "awd", "vlsilab"]
        if(helper_process_cell_select_override){
          if(cells.findIndex(function(element){return element==pickedcell})==-1){
            $scope.unique_picked_cells.add(pickedcell);
            pickedcell="apd";
          }
        }
        $scope.unique_picked_cells.add(pickedcell);
        if(install_cell && (install_cell!=""))
        {
          $scope.unique_picked_cells.add(install_cell);
        }
        helperprefs.helper(pickedcell).then(function(helperdata){
          answer.afsId=helperdata.userid;//use the correct id and cell name for the files
          answer.cellName=helperdata.cell;
          $scope.currentDir = answer;
          var helper_launched = false;
          if($scope.helper_loading){
            helper_launched = true;
            $scope.helper_loading=false;
          }
          helper_check(helperdata,$scope.unique_picked_cells,helper_launched,function(){$scope.readCQDir($scope.currentDir,"SELECTFILES");});
        }).catch(function(err) {
          console.log("gave up on",err);
        });
      }

      $scope.loadDebug = function(answer){
        $scope.saveSelection(answer);
        $scope.answer(answer);
      }
      $scope.saveNotes = function(answer){
        sharedModelServices.intra_insertKeyValue("CQ_DEBUG_INFO","scratch_pad",answer.scratchPad);
        $scope.cancel();
      }

      $scope.dirValidation = function(answer){
        var ret =  false;
        console.log("answer.cqDirectory.length ",answer.cqDirectory, $scope.validCQDir);
        if($scope.param != 'showCQ' && !answer.cqDirectory) {
          console.log("inside if required");
          dgCtrl.dirValidationMsg = "This field is required!";
          return true;
        } else if(answer.cqDirectory) {
          if($scope.validCQDir == false) {
            console.log("inside elseif validCQDir - ",$scope.validCQDir);
            dgCtrl.dirValidationMsg = "The CQ Debug Directory entered is invalid!";
            return true;
          } else if($scope.validCQDir == true) {
            console.log("inside else validCQDir - ",$scope.validCQDir);
            dgCtrl.dirValidationMsg = "";
            return true;
          } else {
            dgCtrl.dirValidationMsg = "";
            return true;
          }
        }
      }
      $scope.asfIdValidation = function(answer){
        var ret =  false;
        if($scope.param != 'showCQ' && !answer.afsId) {
          dgCtrl.asfIdValidationMsg = "This field is required!";
          return true;
        } else if(answer.afsId) {
          dgCtrl.asfIdValidationMsg = "";
          return true;
        }
      }
      $scope.cellValidation = function(answer){
        var ret =  false;
        if($scope.param != 'showCQ' && !answer.cellName) {
          dgCtrl.cellValidationMsg = "This field is required!";
          return true;
        } else if(answer.cellName) {
          dgCtrl.cellValidationMsg = "";
          return true;
        }
      }
    }];

    $scope.inputCQDir = function(ev, usecaseType) {
      $mdDialog.show(
      {
        templateUrl: "./partials/cqDirUsecase1.html",
        controller: DialogController,
        controllerAs: 'dgCtrl',
        targetEvent: ev,
        locals: {param: usecaseType},
      }).then(function(result) {
        console.log("inputCQDir - result",result);
        //$http.get('/helper/'+result).success(function(response){
        $http.get('/ReadDir/?dirPath='+tmpPath +'&afsId=' +result.afsId + '&cell=' + result.cellName).success(function(response){
          console.log("inputCQDir - helper response",response);
          helper = response;
          //helper = helper.substring(1, helper.length-1);

          if(helper.length > 0 ) {
            var helperArray = helper.split(",");
            var helper =helperArray;
            var AET = (searchStringInArray(".aet",helperArray))[0];
            var TRACE = (searchStringInArray(".trace",helperArray))[0];
            var VHDL = (searchStringInArray(".vhdl",helperArray))[0];
            var IOLIST = (searchStringInArray(".iolist",helperArray))[0];
          }
        });
      });
    };

    this.create = function(dir){
      //var autoInit = Object.keys(dir).length>0;
      console.log(dir);
      console.log("============================");
      var autoInit = dir;
       console.log("navCntrl",autoInit);
      if(autoInit ==="cq_dir1" ){
        //var list = getFiles.getListOfFiles();
        //read from shared json model
        // var cq_dir = sharedModelServices.intra_getValue("cq_dir");
        // var list = sharedModelServices.intra_getValue(dir);
         console.log('autoInit',dir);
         TemplateWidgets.addFilesFromDirectory(dir)
        // TemplateWidgets.addfiles(list);
      }
      if(nav.items){
        console.log("nav.items",nav.items,nav.items.length);
        if(nav.items.length>0) {
          nav.items.sort(function(a,b){ return sortAlphaNum(a.id, b.id)});
          for(var i=0;i<nav.items.length;i++){
            console.log("nav.items["+i+"].id -- "+nav.items[i].id)  ;
          }
          var lastNavItem = nav.items[nav.items.length-1].id;
          var lastNavCount = lastNavItem.substring(lastNavItem.indexOf("Dashboard")+9, lastNavItem.length);
          //alert("lastNavCount -- "+lastNavCount+" -- "+lastNavCount+1);
          var intCount = Number(lastNavCount) + 1;
        } else {
          var intCount = 1;
        }
    } else {
        var intCount = 1;
    }
      var intTitle = "Dashboard"+intCount;
      var id = intTitle;//'_' + new Date().getTime();
    if (intCount == 1   && dir !=="cq_dir1") {
		var j = {};
		var d = {};
		//var t;
		storeService.loadSharedDataFromFile("consolidatedJson").then(function(k) {
			sharedModelServices.inter_setSharedData(k);
			//t = sharedModelServices.inter_getValue("toggleHeader");
			//	t = "true";
			//}

			//d["toggleHeader"] = t;
			j["defaultCommon"] = d;
    storeService.writeSessionDataToFile("consolidatedJson",j);
    storeService.loadSessionDataFromFile("consolidatedJson").then(function(k){
       Object.assign(k,j);
	     storeService.writeSessionDataToFile("consolidatedJson",k);
	      sharedModelServices.intra_setSharedData(k);
      },function() {
      storeService.writeSessionDataToFile("consolidatedJson",j);
       sharedModelServices.intra_setSharedData(j);
    });
	  //storeService.writeSessionDataToFile("defaultCommon",d);
      });
	  }
    var template = {
      "title": intTitle,
      "intfId": intTitle,
      "structure": "4-8",
      "rows": [{
        "columns": [{
          "styleClass": "col-md-4",
          "widgets": []
        },{
          "styleClass": "col-md-8",
          "widgets": []
        }]
      }]
    }
    if(autoInit === "cq_dir1") {
      //defined in wbManagerIntegration module
      template = TemplateWidgets.getTemplate("Dashboard"+intCount,id);

    }

    if(autoInit == 1) {
      template = {
        "title": "Dashboard1",
        "intfId": "Dashboard1",
        "structure": "12/6-6/12",
        "rows": [ {
          "columns": [ {
                "styleClass": "col-md-12",
            "widgets": [ {
                    "type": "SessionModelInitializer",
                    "config": {
                      "CQ_Directory": ""
                    },
                    "titleTemplateUrl": "partials/customWidgetTitle.html",
                    "title": "NEXA Session Model Initializer 1",
                    "wid": "1503191594859-6"
            } ],
                "cid": "1503191796295-7"
              }
        ] }
        ]
      }
    }

    var q = storeService.set(id, template); //modified to getAll Dashboards after inserting the last Dashboard - Balaji
    childWindows.closeAllChildWindows();
    storeService.getAll().then(function(values){
      console.log("all promises resolved");
      nav.items = values;
        if(nav.items && nav.items.length > 0){
          nav.items.sort(function(a,b){ return sortAlphaNum(a.id, b.id)});
          nav.dshBrdCount = nav.items.length;
        }
      console.log("nav.item",nav.items);
      nav.selectTabName = intTitle;
      location.href = "#/boards/"+ sessionId + "/" + intTitle;
    });
    dropdownMenuDiv.classList.add("invisible");
  };

  this.showCQDebug = function(ev) {
      var userinfo = sharedModelServices.intra_getValue("user");
      console.log(" showCQDebug - userinfo ",userinfo);
      if(userinfo!='Not found'){
      $mdDialog.show({
          templateUrl: "./partials/cqDirInput.html",
          controller: DialogController,
          controllerAs: 'dgCtrl',
          targetEvent: ev,
          locals: {param: 'showCQ'},
        }).then(function(answer){
        });
      } else {
        $mdDialog.show(
          $mdDialog.alert()
            .clickOutsideToClose(true)
            .title('No Debug Directory found')
            .textContent('CQ Debug Directory not set.')
            .ariaLabel('Alert Dialog Demo')
            .ok('OK')
            .targetEvent(ev)
        );
      }
      dropdownMenuDiv.classList.add("invisible");
    };
  /************************ Sticky Notes *************Start*/
  var stickyNotesInfo = sharedModelServices.intra_getValue("STICKY_NOTES");
  //console.log("*** stickyNotesInfo - ",stickyNotesInfo);
  //nav.showNotes = true;
  if(stickyNotesInfo && stickyNotesInfo != "Not found"){
    //console.log("*^* inside if ");
    nav.notes = stickyNotesInfo;
  } else if( Object.keys(cq_info).length > 0 ){
    //console.log("*^* inside else-if ");
    if(cq_info.STICKY_NOTES && cq_info.STICKY_NOTES != "Not found"){
      nav.notes = cq_info.STICKY_NOTES;
    } else {
      nav.notes = [];
    }
  } else {
    //console.log("*^* inside else ");
    nav.notes = [];
  }
  var notes2Array = Object.keys(nav.notes).map(function(key){
    return nav.notes[key]
  });
  //console.log("*** ### notes2Array - ",notes2Array);
  notes2Array.forEach(function(noteItem){
    //console.log("*** ### noteItem - ",noteItem);
  })
  nav.notes = notes2Array;
  if(nav.notes.length > 0 ){
     nav.notes.forEach(function(noteItem, index){
      for(var key in noteItem){
        console.log("noteItem("+key+") - "+noteItem[key]);
        nav.showNotes = noteItem.showHide;
      }
    })
  } else {
    nav.showNotes = false;
  }
  console.log("*** onLoad ### nav.showNotes - ",nav.showNotes);
  $scope.resize = function(ev,ui,noteId) {
    //console.log (evt,ui);
    nav.width = ui.size.width+'px';
    nav.height = ui.size.height+'px';
    $scope.saveStickyNotes(noteId);
    //console.log("*** $scope.w,$scope.h - ",$scope.w,$scope.h);
  };
  $scope.ctrlFn = function(offsetXPos,offsetYPos,noteId) {
    //console.log("************** called * - ",offsetXPos,offsetYPos);
    nav.top = offsetYPos+'px';
    nav.left = offsetXPos+'px';
    $scope.saveStickyNotes(noteId);
  };
  var note = {};
  $scope.statusMessage = '';
  this.addNote = function(){
    var notes = [];
    note.id = new Date().getTime();
    note.text = "";
    note.top = "40px";
    note.left = "400px";
    nav.notes.push(note);
    note = {};
    // nav.notes.forEach(function(noteItem){
    // //console.log("noteItem - ",noteItem);
    // })
  }
  this.deleteNote = function(noteId){
    $scope.statusMessage = 'Note deleted ';
    //console.log("noteId - ",noteId);
    nav.notes.forEach(function(noteItem, index){
      for(var key in noteItem){
        //console.log("noteItem("+key+") - "+noteItem[key]);
        if(key == "id" && noteItem[key] == noteId){
          nav.notes.splice(index,1);
          sharedModelServices.intra_deleteKeyValue("STICKY_NOTES",noteItem.id);
        }
      }
    })
    if(nav.notes.length <= 0) {
      nav.showNotes = false;
    }
    //console.log("notes deleted - ",nav.notes);
  }
  $scope.saveStickyNotes = function(noteId) {
    var stickyID = "",
    exitLoop = false;
    console.log("@@@@ saveStickyNotes");
    nav.notes.forEach(function(noteItem){
      noteItem.showHide = nav.showNotes;
      if(!exitLoop){
        console.log("noteItem -1- ",noteItem);
        //console.log("nav.top, nav.left, noteId - ",nav.top, nav.left, noteId);
        if(noteId && noteItem.id == noteId){
          //console.log("*##* save if ");
          if(nav.top && nav.top != ""){
            noteItem.top = nav.top;
            nav.top = "";
          }
          if(nav.left && nav.left != ""){
            noteItem.left = nav.left;
            nav.left = "";
          }
          if(nav.width && nav.width != ""){
            noteItem.width = nav.width;
            nav.width = "";
          }
          if(nav.height && nav.height != ""){
            noteItem.height = nav.height;
            nav.height = "";
          }
          sharedModelServices.intra_insertKeyValue("STICKY_NOTES",noteId,noteItem);
          exitLoop = true;
        } else if(!noteId){
          console.log("*##* save else ");
          sharedModelServices.intra_insertKeyValue("STICKY_NOTES",noteItem.id,noteItem);
        }
      }
    })
  }
  this.stickyNotes = function() {
    console.log("nav.notes.length, nav.showNotes - ",typeof nav.notes, nav.notes.length, nav.showNotes);
    if(nav.notes.length <= 0) {
      this.addNote();
    } //else if(nav.showNotes) {
    //}
    nav.showNotes = !nav.showNotes;
    $scope.saveStickyNotes();
    dropdownMenuDiv.classList.add("invisible");
  }
  // $window.onbeforeunload = function()
  // {
  //   //console.log("on window close");
  //   $scope.saveStickyNotes();
  //   storeService.writeFile(this.name,this.model);
  // }
  /************************ Sticky Notes *************End*/
    this.popNotes = function() {
      $mdDialog.show(
      {
        templateUrl: "./partials/cqDirUsecase1.html",
        controller: DialogController,
        controllerAs: 'dgCtrl',
        locals: {param: 'showPopNotes'},
      }).then(function(answer){
      });
      dropdownMenuDiv.classList.add("invisible");
    }
    this.showUserPrefs = function(ev) {
      $mdDialog.show(
      {
        templateUrl: "./partials/userPrefs.html",
        controller: UserPrefController,
        controllerAs: 'usrPrefCtrl',
        targetEvent: ev
      }).then(function(answer){
      });
      dropdownMenuDiv.classList.add("invisible");
    }
    this.cloudConfig = function(ev) {
      $mdDialog.show(
      {
        templateUrl: "./partials/cloudConfig.html",
        controller: cloudConfigController,
        controllerAs: 'cloudConfigCtrl',
        targetEvent: ev
      }).then(function(answer){
      });
      dropdownMenuDiv.classList.add("invisible");
    }
    storeService.getAll().then(function(data){
      console.log("get all - data -",data);
      nav.items = data;
      if(data){
      if(data.length>0){
          nav.items.sort(function(a,b){ return sortAlphaNum(a.id, b.id)});
        storeService.loadSessionDataFromFile("consolidatedJson").then(function(k) {
          sharedModelServices.intra_setSharedData(k);
          var userInf = sharedModelServices.intra_getValue("USER_INFO");
          var defDash = userInf.defDashboard;
          if(defDash && defDash != "Not found" ){
            for(var i=0;i<data.length;i++){
              if(defDash == data[i].id) {
                location.href = "#/boards/"+ sessionId + "/" + data[i].id;
                nav.selectTabName = data[i].title;
              }
            }
          } else {
        location.href = "#/boards/"+ sessionId + "/" + data[0].id;
            nav.selectTabName = data[0].title;
          }
          nav.dshBrdCount = data.length;
        })
        }}
    });

    $scope.selectTabName = function(intfName) {
      nav.selectTabName = intfName;
    };
    $scope.closeAllChildWindows = function() {
      childWindows.closeAllChildWindows();
    };
    $scope.$on('navChanged', function(event, selectTab){
      storeService.getAll().then(function(data){
        nav.items = data;
        nav.selectTabName = "";
        console.log("inside navChanged", data.length);
        if(data.length>0){
          if(selectTab){
            for(var i=0;i<data.length;i++){
              if(selectTab == data[i].title){
                nav.selectTabName = data[i].title;
                location.href = "#/boards/"+ sessionId + "/" + data[i].id;
              }
            }
          } else {
          nav.items.sort(function(a,b){ return sortAlphaNum(a.id, b.id)});
          nav.selectTabName = data[data.length-1].title;
          location.href = "#/boards/"+ sessionId + "/" + data[data.length-1].id;
          }
          nav.dshBrdCount = data.length;
        }
      });
    });
    $scope.$on('dshNameChanged', function(event, intfName){
      storeService.getAll().then(function(data){
        nav.items = data;
        nav.selectTabName = "";
        if(data.length>0){
          nav.items.sort(function(a,b){ return sortAlphaNum(a.id, b.id)});
          for(var i=0;i<data.length;i++){
            if(intfName == data[i].id){
              nav.selectTabName = data[i].title;
              location.href = "#/boards/"+ sessionId + "/" + data[i].id;
            }
          }
          nav.dshBrdCount = data.length;
        }
      });
    });

    //Listener for widget communication
    stateContainer.addListener(function (type, srcObj) {
  	  //alert("Inside app.js - addListener - type - "+type+" - srcObj - "+srcObj);
      var srcIntf = new Object(),
      trgIntf = new Object();
      if(type == "Dashboard") {
        //alert("Inside listener for Interface");
        storeService.get(srcObj.srcIntf).then(function(srcResponse){
          srcIntf = srcResponse;
          storeService.get(srcObj.trgIntf).then(function(trgResponse){
            trgIntf = trgResponse;
            var rowLength= srcIntf.rows.length;
            console.log("rowLength - before"+rowLength);
            for (var rowIndex = 0; rowIndex < rowLength; rowIndex++) {
              var colLength= srcIntf.rows[rowIndex].columns.length;
              console.log("colLength - before"+colLength);
              for (var colIndex = 0; colIndex < colLength; colIndex++) {
                var srcWidgets = srcIntf.rows[rowIndex].columns[colIndex].widgets;
                var trgWidgets = trgIntf.rows[0].columns[0].widgets;
                for(var k=0;k<srcWidgets.length;k++){
                  if(srcWidgets[k].wid == srcObj.curWid){
                    trgWidgets.push(srcWidgets[k]);
                    srcWidgets.splice(k, 1);
                  }
                }
              }
            }
            storeService.set(srcObj.srcIntf, srcIntf);
            storeService.set(srcObj.trgIntf, trgIntf);
            nav.selectTabName = trgIntf.title;
            location.href = "#/boards/"+sessionId+"/"+srcObj.trgIntf;
          });
        });
      } else if(type == "Widget") {
        var targetNode = document.querySelectorAll('[adf-id="'+srcObj.targetWId+'"]');
        var targetChildNodes = targetNode[0].childNodes;

        for (var i = 0; i < targetChildNodes.length; ++i) {
          if( (typeof targetChildNodes[i].className != 'undefined') && (targetChildNodes[i].className == "panel-body in collapse")) {
            var iDiv = document.createElement("div");
            iDiv.id = srcObj.currentWId;
            var para = document.createElement("P");
            var t = document.createTextNode("Data sent from Source Widget Id '"+srcObj.currentWId+"' to Target Widget "+srcObj.targetWTitle+"'");
            para.appendChild(t);
            iDiv.appendChild(para);
            targetChildNodes[i].getElementsByClassName("ng-scope")[0].appendChild(iDiv);
          }
        }
  		}
    })
    $scope.$on('dshBrdNameChanged', function(event, name){
      nav.selectTabName = name;
      storeService.getAll().then(function(data){
        console.log("dshBrdNameChanged - data -",data);
        nav.items = data;
        nav.dshBrdCount = data.length;
      })
    })
    $scope.$on('$viewContentLoaded', function(){
      console.log("***Here your view content is fully loaded !!***");
    });
  })
