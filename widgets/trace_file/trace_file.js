'use strict';

angular.module('adf.widget.trace_file', ['adf.provider', "adfDynamicSample", 'contextMenuCustom', 'ngContextMenu','websocket', 'wbManagerIntegration','utils','HyperAceModule','angularjs-dropdown-multiselect'])
  .config(function(dashboardProvider){
    dashboardProvider
      .widget('trace_file', {
        type: 'traceFile',
        title: 'NEXA Trace File Viewer',
        description: 'Trace File Viewer',
        templateUrl: '../widgets/trace_file/src/view.html',
        config: {
          trace_file: "",
          cmd_out:"",
   		    mantis_url:"",
		      mts_lwb_min_cycle:"",
		      mts_lwb_max_cycle:"",
          curr_RTX_Path:"",
		      current_cycle:"",
			  display_info:"",
          loadTraceFile:"",
          fileTypeMsg:"",
          hideDiagnostics:"",
          sizeDisplay:"",
          openFile:"",
          grep_command:""
        },
        edit: {
          templateUrl: '../widgets/trace_file/src/edit.html'
        },
        controller:'trace_file_cntrl',
        controllerAs:'trace_file'
      });
  })
  .controller('trace_file_cntrl',function(childWindows,$mdDialog,$http,$scope,$rootScope,websocket,TemplateWidgets,config,sharedModelServices,$window,$timeout,DirService,$q,checkChildService){
    let trace_file = this;
    //trace_file.display_info = false;
    config.current_cycle=0;
    config.mts_lwb_min_cycle=0;
    trace_file.hideDiagnostics=true;
    trace_file.filelaunch_info=true;
    trace_file.errorDisplay=false;
    config.mts_lwb_max_cycle=100;
    trace_file.selectedText = "";
    trace_file.scroll_event_enabled = false;
    trace_file.mantis_websocket_enabled = false;
    trace_file.file_browser = false;
    trace_file.inNewTab = false;
    trace_file.dirValidationMsg = "";
    trace_file.file_load_error = false;
    trace_file.data_filter_enabled = false;
    trace_file.file_data = "";
    trace_file.filtered_data = [];
    trace_file.getting_grep_data = false;
    trace_file.hide_grep_error = true;
    trace_file.openFileRTXSet = false;
    //trace_file.grep_load_error = true;
    //config.sizeDisplay = false;
    //config.traceFileSize = 0;
    trace_file.execute_grep_command = false;

    //dropdown
    trace_file.dropdown_extra_settings = {showCheckAll:false,
                                          showUncheckAll:false,
                                          closeOnBlur:true,
                                          closeOnSelect:true,
                                          closeOnDeselect:true,
                                          styleActive:true,
                                          enableSearch:true,
                                          scrollable:true,
                                          scrollableHeight:'200px',
                                          searchField:"label",
                                          smartButtonMaxItems:3,
                                          smartButtonTextConverter: function(itemText, originalItem) { return itemText; }
                                        };

    trace_file.dropdown_on_select = function(item){
      trace_file.dropdown_selected_file=[item];
      trace_file.selected_file = trace_file.files[item.id];
    }
    trace_file.dropdown_on_deselect = function(item){
      trace_file.dropdown_selected_file=[item];
      trace_file.selected_file = trace_file.files[item.id];
    }
    //trace_file.search_results = false;
    if(!config.search_results)
    {
      config.search_results=false;
    }

    var user_info = sharedModelServices.intra_getValue("USER_INFO");
    var cell = user_info["cell"];
    var user = user_info["user"];

    //TODO: write a service to get all these information.
    var fullScreenMode = $scope.$parent.$parent.definition.fullScreenMode?$scope.$parent.$parent.definition.fullScreenMode:false;

    if(!config.data_filter_options)
    {
      config.data_filter_options = {caseSensitive:false,RegExp_enable:false};
    }

    if(!config.data_filter){
      config.data_filter=""
    }

    if(!config.current_row)
    {
      config.current_row=0;
    }
    if(!config.file_filter || config.file_filter=="" ){
      config.file_filter="\\.trace($|\\.gz$)";
    }
    var temp_data ="Tracing involves a specialized use of logging to record information about a program's execution. This information is typically used by programmers for"
      + "debugging purposes, and additionally, depending on the type and detail of information contained in a trace log, by software monitoring tools to diagnose common problems.";

    $scope.$on('currentCycle', function() {
		config.current_cycle = JSON.parse(sharedModelServices.intra_getValue("currentCycle"));
    });

    // $scope.$on('width_changed', function() {
    //   var aceEdtr = document.getElementsByClassName("ace_editor");
    //   aceEdtr[aceEdtr.length-1]
    // });

	//////websocket connection to mantis
	function ws_url( run )
	{
		console.log("ws://" + run.host + "." + run.domain + ":" + run.ws_port);
		return "ws://" + run.host + "." + run.domain + ":" + run.ws_port;
	}

	  //mantis definitions
  function get_mantis_ws( answer )
  {
    let u = "http://edautil1.pok.ibm.com/sm/runs/" + userid;
    $http.get( u ).then( ( active ) =>
    {
      let runs = active.data.filter(function(entry) {
		return entry.app_name.includes('Mantis');
		});
      answer( ws_url( runs[ 0 ] ) );
       //if( runs.length == 1 )
       //{
         answer( ws_url( runs[ 0 ] ) );
       /*}
       else
       {
         mantis_lwb_api.prompt_sessions( runs, answer );
       }*/

    }, (err) =>
    {
      throw new Error( err );
    } );
  }
  function close_find_box_ace ()
  {
    //hack to close the minimized display coming up in fullscreen mode
    //var elems = document.getElementsByClassName('ace_search');
    document.getElementsByClassName('ace_search')[0].style.display = 'none';
  }
   function get_mantis_ws_from_url( answer)
   {
     let u = "http://edautil1.pok.ibm.com/sm/runs/" + userid;
     $http.get( u ).then( ( active ) =>
     {
       let runs = active.data.filter(function(entry) {
         if(entry.mantis_frontend == config.mantis_url){
           return entry;
         }
    });
     answer( ws_url( runs[ 0 ] ) );
     }, (err) =>
     {
       throw new Error( err );
     } );
   }

  var mantis_websocket = {};

  trace_file.get_aet_name = function()
  {
    mantis_websocket.send( "mts_ji_api::get_aet_name", { } ).then( ( r ) =>
    {
      config.mts_lwb_aet = r.aet_name;
    } );
  }

  trace_file.openFile = function()
  {
    trace_file.selectedFile =  trace_file.editor.getSelectedText();
     if (!trace_file.selectedFile || trace_file.selectedFile=="")
     {
       return;
     }
    trace_file.selectedFile=trace_file.selectedFile.trim();
    if(config.curr_RTX_Path && config.curr_RTX_Path!="")
      {
        var lastCharRTXPath = config.curr_RTX_Path[config.curr_RTX_Path.length -1];
        if (lastCharRTXPath != "/"){
          config.curr_RTX_Path =  config.curr_RTX_Path + "/";
        }
        var firstCharRTXPath = config.curr_RTX_Path.charAt(0);
        if (firstCharRTXPath != "/"){
          config.curr_RTX_Path = "/" + config.curr_RTX_Path;
        }
         var fileToOpen = config.curr_RTX_Path+trace_file.selectedFile;
         var command ="ksh";
         var fileExistCheck="ls"+" "+fileToOpen;
         var user_info = sharedModelServices.intra_getValue("USER_INFO");
         var cell = user_info["cell"];
         var user = user_info["user"];
         trace_file.filelaunch_info=false;
         $http.get('/remoteExecute/?cmd='+ command + '&args='+fileExistCheck + '&afsId=' + user+ '&cell=' + cell).then(function(response){
             var data = response.data;
             console.log("@@@ Inside add_data_to_ace - response.data - ",data);
               if(data.data.rc!=0){
                 if(data.data.stderr.includes("No such file"))
                 {
                  trace_file.fileOpenErrorMsg="File does not exist";
                 }
                 else if (data.data.stderr.includes("Permission denied"))
                 {
                  trace_file.fileOpenErrorMsg="Permission Denied";
                 }
                 else {
                  trace_file.fileOpenErrorMsg="Error Opening file";
                 }

               trace_file.launchInfo=trace_file.selectedFile + " :  " +trace_file.fileOpenErrorMsg;
               trace_file.filelaunch_info=true;
               trace_file.errorDisplay=true;
               }
               else {
               //var adfModel = $scope.$parent.$parent.$parent.$parent.adfModel;
               var adfModel = checkChildService.getmodel($scope);
               var name = adfModel.title;
               var widgType = checkChildService.getWidtype($scope);
               console.log("#### name , adfModel, widgType, filename - ",name , adfModel, widgType, fileToOpen);
               if($scope.$parent.$parent.$parent.parentScope)
              {
               $scope.$parent.$parent.$parent.parentScope.$emit("addNewAppInstance", name , adfModel, widgType, fileToOpen);
              } 
              else {
                   $scope.$emit("addNewAppInstance", name , adfModel, widgType, fileToOpen);
                 }
               trace_file.filelaunch_info=false;

               }
           },function(response){
             console.log("Error: Please check if the file exists and that you have the right permissions");
           });



      }
      else {
        trace_file.openFileRTXSet = true;
        trace_file.showConfirm();
      }
  }

  trace_file.reset_data_filter = function()
  {
    if(trace_file.file_data!="")
    {
      trace_file.editor.blur();
      trace_file.editor.setValue(trace_file.file_data,-1)
      config.data_filter="";
    }
  }

   trace_file.get_aet_min_cycle = function()
  {
    mantis_websocket.send( "mts_ji_api::get_aet_min_cycle", { } ).then( ( r ) =>
    {
      config.mts_lwb_min_cycle = r.cycle;
    } );
  }
  trace_file.get_aet_max_cycle = function()
  {
    mantis_websocket.send( "mts_ji_api::get_aet_max_cycle", { } ).then( ( r ) =>
    {
      config.mts_lwb_max_cycle = r.cycle;
    } );
  }
   trace_file.get_current_cycle = function()
  {
    mantis_websocket.send( "mts_ji_api::get_current_cycle", { } ).then( ( r ) =>
    {
      config.current_cycle = r.cycle;
    } );
  }
  trace_file.showConfirm = function(ev) {
    var srcBsrDirSelScope = $scope.$new();
    var openedInNewTab = srcBsrDirSelScope.$parent.$parent.model.openedInNewTab;
    if(openedInNewTab == true){
      trace_file.inNewTab = true;
      trace_file.RTXPath = config.curr_RTX_Path;
      trace_file.showRTXPathInfo=!trace_file.showRTXPathInfo;
    } else {
      trace_file.showRTXPathInfo=true;
      var setRTXPathScope = $scope.$new();

      $mdDialog.show(
      {
        templateUrl: "setUserRTXPath.html",
        controller: setRTXPathController,
        controllerAs: 'setRTXPathCtrl',
        targetEvent: ev,
        multiple: true
      }).then(function(answer){
      });
    }
  }
    var setRTXPathController = function($scope, $mdDialog, $rootScope) {

    this.RTXPath = config.curr_RTX_Path;

    $scope.cancel = function() {
      trace_file.showRTXPathInfo=false;
      $mdDialog.hide();
    };

    $scope.setRTXPath = function(answer){
      var result = answer.RTXPath;
      trace_file.showRTXPathInfo=false;
        if(result){
        config.curr_RTX_Path = result;
        sharedModelServices.intra_insertKeyValue("CQ_DEBUG_INFO","RTXPath",config.curr_RTX_Path);
      } else{
        config.curr_RTX_Path = '';
      }
      $mdDialog.hide();

      if(trace_file.openFileRTXSet == true)
      {
      trace_file.openFile();
      trace_file.openFileRTXSet = false;
      }

    }
  };

  trace_file.save_RTXPath = function()
  {
    trace_file.showRTXPathInfo=false;
      if(trace_file.RTXPath){
      config.curr_RTX_Path = trace_file.RTXPath ;
      sharedModelServices.intra_insertKeyValue("CQ_DEBUG_INFO","RTXPath",config.curr_RTX_Path);
    } else{
      config.curr_RTX_Path = '';
    }
  }

	trace_file.synchronize_cycle = function() {
    trace_file.selectedText =  trace_file.editor.getSelectedText();
		var cycleval = Number(trace_file.selectedText);
		if( (!isNaN(cycleval)) && (cycleval <= config.mts_lwb_max_cycle) && (cycleval >= config.mts_lwb_min_cycle)){
		   sharedModelServices.intra_insertKeyValue("Logic_debug","currentCycle",Number(trace_file.selectedText));
       console.log("trace selectedText", trace_file.selectedText,cycleval);
		   mantis_websocket.send( "mts_ji_api::goto_last_cycle", { gotocycle: cycleval } ).then( ( r ) => {
//			sharedModelServices.intra_insertKeyValue("Logic_debug","currentCycle",cycleval);
		   } );
		}
    };

    trace_file.execute_grep_view = function() {
      trace_file.execute_grep_command = !trace_file.execute_grep_command;
      //trace_file.execute_grep("ls -lrt");
    }

    trace_file.set_data_to_ace = function (data)
    {
      trace_file.file_data = data;
      trace_file.editor.setValue(data,-1);
      trace_file.editor.setShowPrintMargin(true);
      console.log('trace file',config.current_row);
      trace_file.file_loaded = true;
      setTimeout(function(){
        trace_file.editor.scrollToLine(config.current_row);
        if(!trace_file.scroll_event_enabled){
          enable_scroll_event();
        }
      },100);
      if(config.search_results){
        trace_file.editor.execCommand("find");
        if(fullScreenMode){
           var aceEdtr = document.getElementsByClassName("ace_editor");
            aceEdtr[aceEdtr.length-1].style.height = '400px';
          }
      }
      $rootScope.$broadcast("widgetsLoaded");//When the widget is loaded, broadcast to set widget dimensions
    }

//Following code to support  grep operation

    $scope.aceLoaded = function(_editor){
        trace_file.editor = _editor;
        trace_file.editor.setAutoScrollEditorIntoView(true);
        trace_file.aceRange = ace.require('ace/range').Range;
        trace_file.editor.renderer.setOption('showLineNumbers', true);
        if((config.trace_file && config.trace_file !="")){
          console.log("@@@ Inside aceloaded - if");
          trace_file.file_loaded = false;
          add_data_to_ace();
          trace_file.showFileSelectMsg = false;
        } else {
           trace_file.editor.setValue(temp_data,-1);
           trace_file.showFileSelectMsg = true;
        }
        trace_file.editor.setShowPrintMargin(false);
        trace_file.editor.$blockScrolling = Infinity;
        if(fullScreenMode)
        {
          close_find_box_ace();
        }
    }
    console.log("trace_file $scope - ",$scope);
    // var group =$scope.$parent.$parent.$parent.definition.group;
    //  var wid = $scope.$parent.$parent.$parent.definition.wid;
    var group =$scope.$parent.$parent.definition.group;
     var wid = $scope.$parent.$parent.definition.wid;

	if(config.mantis_ws_url && config.mantis_ws_url !="") {
      mantis_websocket = websocket( config.mantis_ws_url, () =>
       {
         mantis_websocket.send( "mts_ji_api::get_fe_url", { } ).then( ( r ) =>
         {
	      if (r.fe_url === config.mantis_url )
              {
                console.log("-----fe matches ****");
                trace_file.mantis_websocket_enabled = true;
                trace_file.mantis_ws = mantis_websocket.url;
                trace_file.get_aet_min_cycle();
                trace_file.get_aet_max_cycle();
                trace_file.get_current_cycle();
	      }
    	 } );
       });
    } else {
      if( group){
        var templatefiles = TemplateWidgets.getfiles();
        var RTXPath = sharedModelServices.intra_getValue("RTXPath");
        if(RTXPath && RTXPath!='Not found'){
          config.curr_RTX_Path = RTXPath;
        }
        console.log("type",typeof(templatefiles));
        if(templatefiles.hasOwnProperty('trace')){
          var file = templatefiles.trace;
          trace_file.file_loaded = false;
          config.trace_file = file;
          if(file){
            config.cqDirectory = file.substr(0, file.lastIndexOf("/") );
          }
	    var tempData = TemplateWidgets.getApplicationData(wid,group,'mantis');
	 console.log('tempdata',tempData);
         if(tempData){
            tempData[0].then(function(data){
//              config.mantis_url=data.open;
              config.mantis_url=data.attachedData.fe_url;
              config.mantis_ws_url=data.attachedData.ws_url;
	             console.log('mantis url',config.mantis_url);
              $rootScope.$broadcast('widgetChangesApplied');
              mantis_websocket = websocket( config.mantis_ws_url, () =>
               {
                 trace_file.mantis_websocket_enabled = true;
                 trace_file.mantis_ws = mantis_websocket.url;
                 trace_file.get_aet_min_cycle();
                 trace_file.get_aet_max_cycle();
                 trace_file.get_current_cycle();
            });
         });
       }
       }
      } else {
           var applications = sharedModelServices.intra_getValue("APPLICATIONS");
           if(!(applications == null)){
             var mantis_info = applications["mantis_fe"];
             if(!(mantis_info == null)){
                config.mantis_url=mantis_info["fe_url"];
                config.mantis_ws_url=mantis_info["ws_url"];

                mantis_websocket = websocket( config.mantis_ws_url, () =>
                {
                   trace_file.mantis_websocket_enabled=true;
                   trace_file.mantis_ws = mantis_websocket.url;
                   trace_file.get_aet_min_cycle();
                   trace_file.get_aet_max_cycle();
                   trace_file.get_current_cycle();
                });
             }
           }
           // Following may be needed only for the new file viewer app: Pradeep
           var externalLaunch = $scope.$parent.$parent.$parent.definition.externalLaunch;
           if (externalLaunch)
           {
              config.trace_file = externalLaunch;
           }

      }
    }

function enable_scroll_event(){
  trace_file.scroll_event_enabled = true;
  var throttled_annotation = _.throttle(function() {
      config.current_row = trace_file.editor.getFirstVisibleRow();
      console.log("current row",config.current_row);
   },100,{leading: false});
  trace_file.editor.renderer.scrollBarH.inner.style.width = trace_file.editor.renderer.content.style.width;
  trace_file.editor.getSession().on("changeScrollTop", throttled_annotation);
}

//modified to fix Trace full screen with/without Search Results on New Tab - Start
trace_file.bring_up_search = function() {
  config.search_results=!config.search_results;
  var openedInNewTab = $scope.$parent.model.openedInNewTab;
  //var aceEdtr = document.getElementsByClassName("ace_editor");
  if(config.search_results){
    trace_file.editor.execCommand("find");
    //if(fullScreenMode){
    if(openedInNewTab) {
        $scope.$emit("searchFilter", config.search_results);
        //aceEdtr[aceEdtr.length-1].style.height = '400px';
      }
  } else {
    trace_file.editor.container.getElementsByClassName('ace_search')[0].style.display = 'none';
    //if(fullScreenMode){
    if(openedInNewTab) {
      $scope.$emit("searchFilter", config.search_results);
      //aceEdtr[aceEdtr.length-1].style.height = '610px';
    }
  }
}
//modified to fix Trace full screen with/without Search Results on New Tab - End

trace_file.getfiles = function()
{
  DirService.getfiles(config.cqDirectory,config.file_filter).then(function(data){
      trace_file.files=data;
      //dropdown works well where the menu-items are objects. Converting array to objects
      if(trace_file.inNewTab){
        trace_file.dropdown_files= [];
        trace_file.files.forEach(function(item,index){
          trace_file.dropdown_files.push({id:index,label:item})
        });
        trace_file.dropdown_selected_file=[{id:0}];
      }
      trace_file.selected_file=data[0];
      trace_file.dirValidationMsg = "";
  },function(data){
    trace_file.dirValidationMsg = "Invalid File Directory or No Files found";
    trace_file.files=undefined;
  });
}

trace_file.reload_file = function(selected_file)
{
  config.bigFileLoadError = false;
  trace_file.file_browser=false;
  //trace_file.hideDiagnostics=false;
  trace_file.file_load_error = false;
  config.current_row=0;
  config.grep_command="";
  config.trace_file = config.cqDirectory+"/"+selected_file;
  DirService.updateSessionModel(config.trace_file,"trace");
  $rootScope.$broadcast('widgetChangesApplied');
  config.loadTraceFile = false;
  trace_file.file_loaded = false;
  config.data_filter="";
  config.search_results = false;
  close_find_box_ace();
  add_data_to_ace();
 trace_file.showFileSelectMsg = false;
}

trace_file.stop_load_file = function()
{
  config.loadTraceFile = false;
  trace_file.execute_grep_command = true;
  trace_file.hideDiagnostics = true;
}

trace_file.load_file = function()
{
  config.loadTraceFile = true;
  trace_file.hideDiagnostics = true;
  add_data_to_ace();
}

trace_file.execute_grep = function(grepInput) {
  trace_file.hide_grep_error = false;
  if(!(grepInput && grepInput.length > 0) || ((grepInput.indexOf("$FILE") == -1) && (grepInput.indexOf("$file") == -1))){
    //cmd = grepInput;//
    document.getElementById('grep_prompt').innerHTML = 'Error in command.. Eg:grep pattern $file';
    document.getElementById('grep_prompt').style.color = "red";

    trace_file.file_load_error = true;
    return;
  }
var flagError =1;
var pipePos = grepInput.indexOf(" |");
var grepPos = grepInput.indexOf("grep");
var filePos = grepInput.indexOf("$file");

if(pipePos>=0 && grepPos >=0 && filePos>= 0)
if (grepPos<pipePos)
{
  if (filePos > pipePos )
  {
    flagError=0;
  }
}


        var file = /\$file/ig;
        var fileInsertedcmd = grepInput.replace(file, config.trace_file);
        var grep = /grep/gi;
        var zgrep_cmd = fileInsertedcmd.replace(grep, 'zgrep');
        config.fileType = config.trace_file.slice(-3);
        var userCommand = fileInsertedcmd.split(" ");

        if (userCommand.length <= 2 || (flagError == 0) )
        {
          trace_file.file_load_error = true;
          document.getElementById('grep_prompt').innerHTML = 'Error in command.. Eg:grep pattern1 $file | grep pattern2';
          document.getElementById('grep_prompt').style.color = "red";

          return;
        }
        document.getElementById('grep_prompt').innerHTML = 'Grep expression Eg:grep pattern $file';
        document.getElementById('grep_prompt').style.color = "grey";
        config.bigFileLoadError = false;
        trace_file.getting_grep_data = true;
        trace_file.file_loaded = false;

        if(userCommand[0] === "grep"){
        if(config.fileType === ".gz")
        {
          if((userCommand[1] === ".*") )
          {
            userCommand[0] = "zcat";
            userCommand.splice(1,1);
            fileInsertedcmd=userCommand.join(" ");
          }
          else {
            fileInsertedcmd = zgrep_cmd;
          }

        }
        else {
          if((userCommand[1] === ".*"))
          {
            //var splitfileInsertedcmd = fileInsertedcmd.split(" ");
            userCommand[0] = "cat";
            userCommand.splice(1,1);
            fileInsertedcmd=userCommand.join(" ");
          }

        }
      }
  console.log("Executing Grep command:",fileInsertedcmd);
  var command = "ksh";
  $http.get('/remoteExecute/?cmd='+ command + '&args='+fileInsertedcmd + '&afsId=' + user+ '&cell=' + cell).then(function(response){
      var data = response.data;
      console.log("@@@ Inside add_data_to_ace - response.data - ",data);
      if(data.rc!=0){
        trace_file.file_load_error = true;
      } else {
        trace_file.getting_grep_data = false;
        trace_file.file_load_error =false;
        trace_file.set_data_to_ace(data.data.stdout);
      }
    },function(response){
      trace_file.file_load_error = true;
    });
}

trace_file.read_file_data = function(file){
  if(!file){
      if(config.trace_file=="")
       {
          console.log("error can't find any trace file to load");
           return;
          }
          file = config.trace_file;
    } else {
      config.trace_file = file;
      config.cqDirectory = file.substr(0, file.lastIndexOf("/") );
      $rootScope.$broadcast('widgetChangesApplied');
    }
    if (config.loadTraceFile == true)
      {
        loadTraceFile();
      }
      else {
       var cmd = "du";
       $http.get('/remoteExecute/?cmd='+ cmd + '&args='+file + '&afsId=' + user+ '&cell=' + cell).then(function(response){
       trace_file.hideDiagnostics = false;
       var fileSize = response.data;
       config.fileType = file.slice(-3);
       if(config.fileType === ".gz")
       {
         config.fileTypeMsg = "gunzipped and of size";
       }
       else {
         config.fileTypeMsg = "";
       }
       if(fileSize.data.rc!=0){
         trace_file.file_sizeread_error = true;
       } else {
         var trace_file_size_string = fileSize.data.stdout.split(" ");
         var trace_file_size_int = parseInt(trace_file_size_string[0]);
         //don't load files greater than 20MB gz and 200MB unzipped.
         config.traceFileSize = Math.round(trace_file_size_int/1024);
         if((config.fileType === ".gz" && trace_file_size_int > 30000) || (trace_file_size_int > 300000) )
         {
            config.bigFileLoadError = true;
            trace_file.hideDiagnostics = true;

         } else if ((config.fileType === ".gz" && trace_file_size_int > 3000) || (trace_file_size_int > 30000) )
          {
           //config.loadTraceFile = "false";
           config.sizeDisplay = true;
           config.loadTraceFile = false;
          }
          else
          {
            config.sizeDisplay = false;
	          config.loadTraceFile = true;
            loadTraceFile();

          }
       }
     },function(response){
       trace_file.file_sizeread_error = true;
     });
     }
   }

   function loadTraceFile()
   {
   var file = config.trace_file;
   $http.get('/readFile/?filePath='+file +'&afsId=' + user+ '&cell=' + cell).then(function(response){
     var data = response.data;
     console.log("@@@ Inside add_data_to_ace - response.data - ",data);
     if(data.rc!=0){
       trace_file.file_load_error = true;
     } else {
       trace_file.set_data_to_ace(data.data);
    }
   },function(response){
     trace_file.file_load_error = true;
   });
   console.log("trace_file.file_loaded, trace_file.file_load_error , config.cqDirectory - ",trace_file.file_loaded, trace_file.file_load_error , config.cqDirectory);
  }

  function add_data_to_ace(file){
      if(config.grep_command && (config.grep_command!="")){
        trace_file.execute_grep(config.grep_command);
      } else if (config.bigFileLoadError){
        //do nothing.
      } else {
        trace_file.read_file_data(file);
      }
    }


  trace_file.showDirSelection = function(ev) {
    var dirSelScope = $scope.$new();
    //console.log("dirSelScope",dirSelScope);
    //var parentWindow = angular.element(document.body);
    var openedInNewTab = dirSelScope.$parent.$parent.model.openedInNewTab;
    //var newTabWidTitle = dirSelScope.$parent.$parent.model.title;
    //console.log("openedInNewTab - newTabWidTitle",openedInNewTab,newTabWidTitle);
    if(openedInNewTab == true){
      trace_file.inNewTab = true;
      trace_file.file_browser=!trace_file.file_browser;
      // var tmpChild =  childWindows.getWindow();
      // //console.log("*** tmpChild *** ",tmpChild);
      // for( var i = 0;i<tmpChild.length;i++){
      //   var childwindow = tmpChild[i]['scpe'];
      //   var childWin = tmpChild[i]['childWin'];
      //   var childWigTitle = childwindow.definition.title;
      //   console.log("*** childWin *** ",childWin);
      //   if( newTabWidTitle == childWigTitle){
      //     //parentWindow = angular.element(dirSelScope.$parent.$parent.$parent.window.document.body);
      //     parentWindow = angular.element(childWin.document.body);
      //     //dirSelScope = childwindow;
      //     //console.log("### dirSelScope",dirSelScope);
      //   }
      // }
    } else {
      trace_file.file_browser=true;
      $mdDialog.show(
      {
        templateUrl: "showDirSelectionTrace.html",
        //parent: parentWindow,
        scope: dirSelScope,
        preserveScope: true,
        focusOnOpen: true,
        // autoWrap: true,
        // skipHide: true,
        targetEvent: ev,
        multiple: true
        //locals: {param:  config}
      }).then(function(answer){
      });
    }
    dirSelScope.closeDialog = function() {
      $mdDialog.hide();
      trace_file.file_browser=false;
    };
  }
})
.run(["$templateCache", function($templateCache)
  { $templateCache.put("showDirSelectionTrace.html","<md-dialog aria-label=\"ShowDirSelection\"> <md-toolbar> <div class=\"md-toolbar-tools\"> <img src=\"../../../icons/nn4.png\" style=\"height: 40px;\" /> <h2>Select File</h2> <span flex></span> <a style=\"cursor: pointer;\" ng-click=\"closeDialog()\"> <i class=\"material-icons\">close</i> </a> </div> </md-toolbar> <md-dialog-content> <div class=\"md-dialog-content\"> <form role=\"form\" name=\"showDirSelect\"> <div layout=\"column\" style=\"background-color:#fefefe\"> <md-input-container layout-nowrap> <label>File Directory</label> <input ng-model=\"config.cqDirectory\" name=\"cqDirectory\" size=\"60\" type=\"text\" ng-blur=\"trace_file.getfiles()\" ng-keyup=\"$event.keyCode == 13 ? trace_file.getfiles() : null\"> <div ng-messages=\"showDirSelect.cqDirectory.$error\"><div>{{ trace_file.dirValidationMsg }}</div> </div></md-input-container> <md-input-container layout-nowrap> <label>Filter*</label> <input ng-model=\"config.file_filter\" name=\"Filter\" size=\"60\" type=\"text\" ng-blur=\"trace_file.getfiles()\" ng-keyup=\"$event.keyCode == 13 ? trace_file.getfiles() : null\"> </md-input-container> <div layout=row layout-align=\"end\" flex><md-button class=\"md-raised md-primary\" title=\"Filter files\" data-placement=\"bottom\"  aria-label=\"info\" style=\"{height:5px;color:blue;}\" ng-click=\"trace_file.getfiles()\" ng-show=\"!trace_file.files\">  List </md-button></div> <div layout=\"column\" style=\"margin-top:5px;margin-bottom:10px\" ng-show=\"trace_file.files\"> <md-input-container layout-nowrap><label>Files in the Directory:</label><md-select ng-model=\"trace_file.selected_file\" name=\"FileOptions\"><md-option ng-repeat=\"file in trace_file.files\" ng-value=file>{{ file }}</md-option></md-select></md-input-container><div layout=row layout-align=\"end\" flex> <md-button class=\"md-raised md-warn\" title=\"Cancel Reload\" data-placement=\"bottom\" style=\"height:5px;color : rgb(100, 100, 100);background-color: rgba(230, 230, 229, 0.96);\" ng-click=\"closeDialog()\" > Cancel </md-button> <md-button class=\"md-raised md-primary\" title=\"Reload file\" data-placement=\"bottom\"  style=\"height:5px;\" ng-click=\"trace_file.reload_file(trace_file.selected_file);closeDialog();\" > Open </md-button> </div></div> </div> </form> </div> </md-dialog-content> </md-dialog>");
      $templateCache.put("setUserRTXPath.html","<md-dialog aria-label=\"Set RTX run path\"> <md-toolbar> <div class=\"md-toolbar-tools\"> <img src=\"../../../icons/nn4.png\" style=\"height: 40px;\" /> <h2>Set RTX Path</h2> <span flex></span> <a style=\"cursor: pointer;\" ng-click=\"cancel()\"> <i class=\"material-icons\">close</i> </a> </div> </md-toolbar> <md-dialog-content> <div class=\"md-dialog-content\"> <form role=\"form\" name=\"setUserRTXPath\"> <div layout=\"column\"> <md-input-container > <label>Set the directory that has to set as a reference to open the debug files</label> <input ng-model=\"setRTXPathCtrl.RTXPath\" name=\"RTXPath\" size=\"50\" type=\"text\"> </md-input-container> <div layout=row layout-align=\"end\" flex> <md-button ng-click=\"cancel()\" class=\"md-raised md-primary\">Cancel</md-button> <md-button ng-click=\"setRTXPath(setRTXPathCtrl)\"  type=\"submit\" class=\"md-raised md-primary\">OK</md-button> </div> </div> </form> </div> </md-dialog-content> </md-dialog>");
}])
;
