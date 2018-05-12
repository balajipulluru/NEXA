'use strict';

var ui_ace_mod=angular.module('adf.widget.ui_ace', ['adf.provider','ui.ace','ngMaterial', 'websocket','wbManagerIntegration','utils','angularjs-dropdown-multiselect']);
ui_ace_mod.config(function(dashboardProvider,$mdThemingProvider){
    dashboardProvider
      .widget('NEXA_Source_Browser', {
        type: 'sourceBrowser',
        title: 'NEXA Source Browser',
        description: 'RTL Source Browser',
        controller:'AceViewCtrl',
        controllerAs:'ace_editor',
        templateUrl: '../widgets/NexaSourceBrowser/src/view.html',
        application: ['mantis'],
        config: {
          vhdl_path:"",
          file_filter:"\.(v|vhdl|nvhdl|svhdl|turbo.*)",
          enable_annotation:false,
          curr_hier_inst_name_wo_top_hier:"",
	        current_cycle:0,
          display_info:"",
          add_to_wave_result:"",
          showAddWave:"",
          search_results:"",
          showAddWavePrime:"",
          mts_lwb_min_cycle:0,
          mts_lwb_min_cycle:1
        },
        edit: {
          controller:'AceEditCtrl',
          controllerAs:'edit_cntrl',
          templateUrl: '../widgets/NexaSourceBrowser/src/edit.html'
        }
      });
  $mdThemingProvider.theme( "menu_ui_ace" )
        .primaryPalette( "cyan",{"default":"500"} )
        .accentPalette(  "cyan",{"default":"100"} )
        .warnPalette( "orange" )
  })
  .controller("AceEditCtrl",ace_edit_cntrl)
  .controller("AceViewCtrl",ace_view_cntrl);

   function ace_view_cntrl($rootScope,$scope,websocket, $http,TemplateWidgets,config,sharedModelServices,$q,$timeout,$mdDialog,DirService) {

    var ace_editor =this;
    ace_editor.editor ={};
    config.configData={
		mode:"text",
		theme: "dreamweaver",
		fontSize: "13px",
		softWrap:"free"
	 };
   ace_editor.signals_annotation = [];
   ace_editor.scroll_event_enabled = false;
   ace_editor.mantis_connected = false;
   ace_editor.signal_value_map = new Map();
   //config.display_info = false;
   ace_editor.mantis_websocket_enabled = false;
   //config.file_browser = false;
    ace_editor.inNewTab = false;
    ace_editor.dirValidationMsg = "";
   ace_editor.file_loaded = false;
   ace_editor.showAddWavePrime = false;
   ace_editor.file_load_error = false;
   ace_editor.signal_name_Prime = "";
   ace_editor.showHierarchyInfo=false;
   if(!config.search_results)
   {
     config.search_results=false;
   }

   if(!config.file_filter || config.file_filter=="" ){
     config.file_filter="\\.(v|vhdl|nvhdl|svhdl|turbo.*)";
   }
 if((config.vhdl_path && config.vhdl_path !="")){

} else {
   ace_editor.data = "VHDL (VHSIC Hardware Description Language) is a hardware description language"
  		+"used in electronic design automation to describe digital and mixed-signal systems such as field-programmable gate arrays and integrated circuits. "
  		+"VHDL can also be used as a general purpose parallel programming language. "
  		+"VHDL was originally developed at the behest of the U.S Department of Defense in order to document the behavior of the ASICs that supplier companies were including in equipment."
  		+"The idea of being able to simulate the ASICs from the information in this documentation was so obviously attractive that logic simulators were developed that could read the VHDL files. "
  		+"The next step was the development of logic synthesis tools that read the VHDL, and output a definition of the physical implementation of the circuit.";

	}
    if(!config.data_filter){
      config.data_filter="";
    }
    if(!config.current_row)
    {
      config.current_row=0;
    }
    if(!config.curr_hier_inst_name_wo_top_hier){
      config.curr_hier_inst_name_wo_top_hier='';
    }
    config.websocket_url = {};
    //config.add_to_wave_result="";
    ace_editor.source_data = {};
    // config.mts_lwb_min_cycle=0;
    // config.mts_lwb_max_cycle=1;

  //dropdown
  ace_editor.dropdown_extra_settings = {showCheckAll:false,
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

  ace_editor.dropdown_on_select = function(item){
    ace_editor.dropdown_selected_file=[item];
    ace_editor.selected_file = ace_editor.files[item.id];
  }
  ace_editor.dropdown_on_deselect = function(item){
    ace_editor.dropdown_selected_file=[item];
    ace_editor.selected_file = ace_editor.files[item.id];
  }

	$scope.$on('currentCycle', function() {
		config.current_cycle = JSON.parse(sharedModelServices.intra_getValue("currentCycle"));
		if(config.enable_annotation) {
		  ace_editor.aet_annotation();
		}
	});


    $scope.$on('vhdl_changed', function (event,args) {
  		ace_editor.source_data=args;
  		config.curr_hier_inst_name_wo_top_hier ="";
  		var n =ace_editor.source_data.hier_name.indexOf(".");
  		if(n>0){
  	      config.curr_hier_inst_name_wo_top_hier = ace_editor.source_data.hier_name.substring(++n);
  		}
  		ace_editor.signals_annotation = ace_editor.source_data.signals;
  		config.vhdl_path = ace_editor.source_data.vhdl;
      config.cqDirectory = config.vhdl_path.substr(0, config.vhdl_path.lastIndexOf("/"));
      $rootScope.$broadcast('widgetChangepath.substr(0, path.lastIndexOf("/") - 1);sApplied');
      ace_editor.file_loaded = false;
  		add_data_to_ace();
		if(config.enable_annotation) {
		  ace_editor.aet_annotation();
		}
   });

     var throttled_slider_change = _.throttle(function() {
     if(config.current_cycle>config.mts_lwb_max_cycle) {
       config.current_cycle = config.mts_lwb_max_cycle;
     } else {
       if (config.current_cycle<config.mts_lwb_min_cycle){
        config.current_cycle=config.mts_lwb_min_cycle;
      }
    }
     ace_editor_websocket.send( "mts_ji_api::goto_last_cycle", { gotocycle: config.current_cycle } ).then( ( r ) =>
   	{
   		ace_editor.aet_annotation();
   	} );
 	   sharedModelServices.intra_insertKeyValue("Logic_debug","currentCycle",config.current_cycle);
   },100,{leading:false});

   ace_editor.slider_changed = function(){
     throttled_slider_change();
   }

   ace_editor.refresh_annotation = function ()
   {
  	 ace_editor_websocket.send( "mts_ji_api::get_current_cycle", { } ).then( ( r ) =>
  	{
  		config.current_cycle=r.cycle;
       if(config.enable_annotation){
  		     ace_editor.aet_annotation();
         }
  	});
   }

   ace_editor.toggle_annotation = function(){
  	 config.enable_annotation=!config.enable_annotation;
  	 if(config.enable_annotation){
  		 ace_editor.refresh_annotation();
  	 } else {
  		 ace_editor.editor.setValue(ace_editor.data,-1);
  		 ace_editor.editor.scrollToLine(config.current_row);
  	 }
   }

   // The ui-ace option
     ace_editor.aceOption = {
  	//mode : 'vhdl',
  	useWrapMode : true,
  	showGutter: false,
  	theme:'dreamweaver',
  	firstLineNumber: 1,
      onLoad: ace_editor.aceLoaded,
    };



    $scope.aceLoaded = function(_editor){
    	ace_editor.editor = _editor;
      ace_editor.aceRange = ace.require('ace/range').Range;
      ace_editor.editor.renderer.setOption('showPrintMargin', false);
      // ace_editor.editor.setShowPrintMargin(false);
      if((config.vhdl_path && config.vhdl_path !="")){
        config.cqDirectory = config.vhdl_path.substr(0, config.vhdl_path.lastIndexOf("/") );
        ace_editor.file_loaded = false;
        add_data_to_ace();
        ace_editor.showFileSelectMsg = false;
      } else {
        ace_editor.editor.setValue(ace_editor.data,-1);
        ace_editor.showFileSelectMsg = true;
      }
      ace_editor.editor.$blockScrolling = Infinity;

      $scope.aceSession = _editor.getSession();
      _editor.on('dblclick', function() {
        //var signal_name = _editor.getSelectedText();
        //ace_editor.signal_name_Prime = signal_name;
        //console.log("@!# ace_editor.signal_name_Prime -",ace_editor.signal_name_Prime);
        var selectionRange = ace_editor.editor.getSelectionRange();
        var content = ace_editor.editor.session.doc.getTextRange(selectionRange);
        ace_editor.signal_name_Prime = content;
      });
    }

    ace_editor.findSignalsInPage = function(range)
    {
      if(!range){
        var firstrow = ace_editor.editor.getFirstVisibleRow();
        var lastrow = ace_editor.editor.getLastVisibleRow();
        var range= new ace_editor.aceRange(firstrow,0,lastrow+1,0);
      }
      var text = ace_editor.editor.getSession().getTextRange(range);
      var word_pattern = /\w+/g;
      var index = 0;
      var signals_for_annotation = new Array();
      var myArray;
      //console.log("executing timeouw",text);
      while ((myArray = word_pattern.exec(text)) !== null) {
        if(ace_editor.signals_annotation.indexOf(myArray[0])!==-1){
          signals_for_annotation.push(myArray[0]);
        }
      }
      return signals_for_annotation;
    }

    ace_editor.set_annotated_data = function(){
      var firstrow = ace_editor.editor.getFirstVisibleRow();
      var lastrow = ace_editor.editor.getLastVisibleRow();
      // console.log("visible range",firstrow,lastrow);
      // console.log("findAll start",(new Date()).getTime());
      ace_editor.documentRange = new ace_editor.aceRange(firstrow,0,lastrow+1,0);
      var signal_value;
      var hier_signal_name
      var signals_for_annotation = ace_editor.findSignalsInPage(ace_editor.documentRange);
     angular.forEach(signals_for_annotation,function(signal) {
       var search_signal= '\\b'+signal+'(\\[.+\\])*(?=[\\s\\W])';
       signal_value = ace_editor.signal_value_map.get(signal);
       if(!signal_value){
         hier_signal_name = signal;
         if(config.curr_hier_inst_name_wo_top_hier!=""){
          hier_signal_name = config.curr_hier_inst_name_wo_top_hier + "." + signal;
        }

        ace_editor_websocket.send( "mts_ji_api::get_sig_value", { signal: hier_signal_name, cycle: config.current_cycle } ).then( ( d ) =>
        {
          ace_editor.signal_value_map.set(signal,d.value);
          if(ace_editor.editor.findAll(search_signal,{caseSensitive: true,start:0,regExp:true,range:ace_editor.documentRange})>0) {
            var range = ace_editor.editor.getSelection().getAllRanges();
            angular.forEach(range,function(data) {
                ace_editor.editor.getSession().replace(data,signal+'['+d.value+']');
                ace_editor.editor.scrollToLine(config.current_row);
                ace_editor.editor.clearSelection();
            });
          }
       });
     } else {
       if(ace_editor.editor.findAll(search_signal,{caseSensitive: true,start:0,regExp:true,range:ace_editor.documentRange})>0) {
         var range = ace_editor.editor.getSelection().getAllRanges();
         angular.forEach(range,function(data) {
             ace_editor.editor.getSession().replace(data,signal+'['+signal_value+']');
             ace_editor.editor.scrollToLine(config.current_row);
             ace_editor.editor.clearSelection();
         });
       }
     }
    });
  }
    ace_editor.enable_scroll_event = function(){
      ace_editor.scroll_event_enabled =true;
      var throttled_annotation = _.throttle(function() {
        if(config.current_row != ace_editor.editor.getFirstVisibleRow()) {
    	     config.current_row = ace_editor.editor.getFirstVisibleRow();
           if(config.enable_annotation){
             ace_editor.set_annotated_data();
           }
            console.log("current row",config.current_row);
          }
       },2000,{leading: false});
      ace_editor.editor.getSession().on("changeScrollTop", throttled_annotation);
    }


    $scope.$watch('config.configData', function(newVal,oldVal,scope) {
      if(newVal)
      {
        console.log("value changed",newVal);
        ace_editor.editor.setTheme("ace/theme/"+angular.lowercase(config.configData.theme));
        ace_editor.editor.getSession().setMode("ace/mode/"+angular.lowercase(config.configData.mode));
        ace_editor.editor.setFontSize(config.configData.fontSize);
      }
    });

   //  $scope.$watch('ace_editor.data', function(newVal,oldVal,scope) {
  	//  if(newVal)
  	//  {
  	// 	 ace_editor.editor.setValue(ace_editor.data,-1);
  	// 	 if(config.enable_annotation){
  	// 		    ace_editor.refresh_annotation();
  	// 	 }
  	// 	 ace_editor.editor.scrollToLine(config.current_row);
  	//  }
   // });

    ace_editor.add_to_wave_Prime = function(waveInput) {
      config.showAddWavePrime = !config.showAddWavePrime;
      var signal_name = "";
      if(waveInput && waveInput.length > 0){
        signal_name = waveInput;
      } else {
        signal_name = ace_editor.editor.getSelectedText();
      }
      ace_editor.signal_name_Prime = signal_name;

      // if(config.curr_hier_inst_name_wo_top_hier!="") {
      //   signal_name = config.curr_hier_inst_name_wo_top_hier + "." + signal_name;
      // }
      // ace_editor_websocket.send( "mts_ji_api::add_signal_to_wave", { signal: signal_name } ).then( ( r ) =>
      // {
      //   if(r.return)ace_editor.add_to_wave_result="added to wave";
      //   else ace_editor.add_to_wave_result = "could not find signal "+ "'"+signal_name+"'";
      // });
    }

   //connect to mantis sessions
    ace_editor.add_to_wave = function(waveInfo) {
      config.showAddWave = !config.showAddWave;
      var signal_name = ace_editor.editor.getSelectedText();
      if(waveInfo && waveInfo!=""){
        signal_name = waveInfo;
      }
      if((config.curr_hier_inst_name_wo_top_hier !="") && config.curr_hier_inst_name_wo_top_hier.length>0) {
	       signal_name = config.curr_hier_inst_name_wo_top_hier + "." + signal_name;
    	}
    	ace_editor_websocket.send( "mts_ji_api::add_signal_to_wave", { signal: signal_name } ).then( ( r ) =>
    	{
    		if(r.return)config.add_to_wave_result="'"+signal_name+"'"+" added to wave";
    		else config.add_to_wave_result = "could not find signal "+ "'"+signal_name+"'";
      });
    }

  //scan all signals between 'Entity' and end of Port declarations
   ace_editor.parse_vhdl = function() {
      var text = ace_editor.editor.getValue();
      ace_editor.signals_annotation = [];
    //  console.log(text);
    text = text.split(/[\n\r]/g);
    var find_entity_pattern = /Entity.*\s+is\s+/im;
    var port_signal_pattern = /^\s*\w+\s*:\s*(in|out|inout)\s+.*/i;
    var signal_declaration_pattern = /^\s*SIGNAL.*;/i;
    var comment_pattern = /^\s*--/
    var entity = true;
    var endPort = false;

      //console.log("parse vhdl");
    angular.forEach(text,function(line){
     //skip comments
     if(!comment_pattern.test(line)) {
       //if(!entity){
       //if(find_entity_pattern.test(line)){
       // entity = true;
       // console.log("entity",line);
       //}
       //} else {
        //signals defined in port declarations
        if(port_signal_pattern.test(line)){
          line = line.trim();
          // var temp_array = line.split(/\s+|\(|\)|;/);
          var temp_array = line.split(/\s+|;/);
	  //console.log("port signals",line,temp_array);
          ace_editor.signals_annotation.push(temp_array[0]);
        }
        //signals declared with signal keyword
        if(signal_declaration_pattern.test(line)){
          line = line.trim();
          var temp_array = line.split(/\s+|,|;/);
          if(temp_array[2]==':') {
          ace_editor.signals_annotation.push(temp_array[1]);
	  //console.log("signals",line,temp_array);
          }
          else {
            ace_editor.signals_annotation.push(temp_array[1]);
            for (var i = 4; i < temp_array.length; i=i+2) {
              ace_editor.signals_annotation.push(temp_array[i-1]);
              if(temp_array[i]=':') {
                break;
              }
            }
          }
        }
	//}
     }
    });
   }

 ace_editor.reload_file = function(selected_file)
 {
   ace_editor.file_browser=false;
   config.current_row=0;
   config.vhdl_path = config.cqDirectory+"/"+selected_file;
   DirService.updateSessionModel(config.vhdl_path,"vhdl");
   $rootScope.$broadcast('widgetChangesApplied');
   config.data_filter="";
   ace_editor.file_loaded = false;
   ace_editor.file_load_error = false;
   var promise = add_data_to_ace();
   promise.then(function(msg){
     ace_editor.signals_annotation = [];
     if(config.enable_annotation) {
          ace_editor.aet_annotation();
      }
   });
   ace_editor.showFileSelectMsg = false;
 }

 function add_data_to_ace (file) {
   var q = $q.defer();
   if(!file){
     if(config.vhdl_path=="")
  {
    return;
  }
     file = config.vhdl_path;
   } else {
     config.vhdl_path = file;
     config.cqDirectory = file.substr(0, file.lastIndexOf("/") );
     $rootScope.$broadcast('widgetChangesApplied');
   }
   var user_info = sharedModelServices.intra_getValue("USER_INFO");
   var cell = user_info["cell"];
   var user = user_info["user"];
   // *****Following code has been added for supporting Verilog Syntax highlighting
   var fileType = file.slice(-2);
   var aceMode="ace/mode/vhdl";

   if(fileType === ".v")
   {
     aceMode="ace/mode/verilog";
   }
   else
   {
     aceMode="ace/mode/vhdl";
   }
   console.log("Ace mode is",aceMode);
   // ***************************************************************
  //$http.get('/read/'+file +'//' +user+'//'+cell).then(function(response){
  $http.get('/readFile/?filePath='+file +'&afsId=' + user+ '&cell=' + cell).then(function(response){
    var data = response.data;

    if(data.rc!=0)
    {
      ace_editor.file_load_error = true;
    } else {
      ace_editor.data =data.data;
       ace_editor.editor.setValue(data.data,-1);
       ace_editor.editor.getSession().setMode(aceMode);
       ace_editor.editor.setShowPrintMargin(true);
       setTimeout(function(){
         console.log("current row",config.current_row);
         ace_editor.editor.scrollToLine(config.current_row);
         if(!ace_editor.scroll_event_enabled){
           ace_editor.enable_scroll_event();
         }
         ace_editor.editor.resize();
         ace_editor.editor.renderer.scrollBarH.inner.style.width = ace_editor.editor.renderer.content.style.width;
       },100);
       ace_editor.file_loaded = true
       q.resolve("data loaded");
       if(config.search_results){
         setTimeout(function(){ace_editor.editor.execCommand("find");},300);
       }
       $rootScope.$broadcast("widgetsLoaded"); //When the widget is loaded, broadcast to set widget dimensions
     }
   },function(response){
     ace_editor.file_load_error = true;
     q.reject("error loading file");
   });
   return q.promise;
}


ace_editor.getfiles = function()
{
   DirService.getfiles(config.cqDirectory,config.file_filter).then(function(data){
      ace_editor.files=data;
      //dropdown works well where the menu-items are objects. Converting array to objects
      if(ace_editor.inNewTab){
        ace_editor.dropdown_files= [];
        ace_editor.files.forEach(function(item,index){
          ace_editor.dropdown_files.push({id:index,label:item})
        });
        ace_editor.dropdown_selected_file=[{id:0}];
      }
      ace_editor.selected_file=data[0];
      ace_editor.dirValidationMsg = "";
  },function(data){
    ace_editor.dirValidationMsg = "Invalid File Directory or No Files found";
    ace_editor.files=undefined;
  });
}

/* ace_editor.bring_up_search = function() {
   ace_editor.editor.execCommand("find");
 }*/
 //modified to fix Source Browser full screen with/without Search Results on New Tab - Start
  ace_editor.bring_up_search = function() {
    config.search_results=!config.search_results;
    var openedInNewTab = $scope.$parent.model.openedInNewTab;
    console.log("source openedInNewTab - ",openedInNewTab);
    //var aceEdtr = document.getElementsByClassName("ace_editor");
    if(config.search_results){
      ace_editor.editor.execCommand("find");
      if(openedInNewTab) {
        //$scope.$emit("searchFilter", config.search_results);
      }
    } else {
      ace_editor.editor.container.getElementsByClassName('ace_search')[0].style.display = 'none';
      if(openedInNewTab) {
        //$scope.$emit("searchFilter", config.search_results);
      }
    }
  }
//modified to fix Source Browser full screen with/without Search Results on New Tab - End

   ace_editor.aet_annotation =function()
   {
    if(!ace_editor.signals_annotation || ace_editor.signals_annotation.length ==0)
    {
      ace_editor.parse_vhdl();

    }
    ace_editor.signal_value_map.clear();
    ace_editor.set_annotated_data();
  	// angular.forEach(ace_editor.signals_annotation,function(signal) {
  	// 	var hier_signal_name = signal;
  	// 	if(config.curr_hier_inst_name_wo_top_hier!=""){
  	// 		hier_signal_name = config.curr_hier_inst_name_wo_top_hier + "." + signal;
  	// 	}
    //   ace_editor.signal_value_map.clear();
  	// 	ace_editor_websocket.send( "mts_ji_api::get_sig_value", { signal: hier_signal_name, cycle: config.current_cycle } ).then( ( d ) =>
  	// 	{
    //       ace_editor.signal_value_map.set(signal,d.value);
    //       if(ace_editor.signal_value_map.size==ace_editor.signals_annotation.length) {
    //         ace_editor.set_annotated_data();
    //       }
  	// 	});
  	// });
   }
   //////websocket connection to mantis
    ace_editor.get_aet_min_cycle = function()
   {
     ace_editor_websocket.send( "mts_ji_api::get_aet_min_cycle", { } ).then( ( r ) =>
     {
       config.mts_lwb_min_cycle = r.cycle;
     } );
   }
   ace_editor.get_aet_max_cycle = function()
   {
     ace_editor_websocket.send( "mts_ji_api::get_aet_max_cycle", { } ).then( ( r ) =>
     {
       config.mts_lwb_max_cycle = r.cycle;
     } );
   }
    ace_editor.get_current_cycle = function()
   {
     ace_editor_websocket.send( "mts_ji_api::get_current_cycle", { } ).then( ( r ) =>
     {
       config.current_cycle = r.cycle;
     } );
   }
   ace_editor.goto_cycle = function()
   {
     ace_editor_websocket.send( "mts_ji_api::goto_last_cycle", { gotocycle: config.current_cycle } ).then( ( r ) =>
     {
     } );
   }
   function ws_url( run )
   {
  //console.log("ws://" + run.host + "." + run.domain + ":" + run.ws_port);
     return "ws://" + run.host + "." + run.domain + ":" + run.ws_port;
   }
   function ws_get_url ()
   {
  return "ws://" + GetURLParameter('host') + "." + GetURLParameter('domain') + ":" + GetURLParameter('ws_port');
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

   function get_mantis_ws_from_url( answer)
   {
     let u = "http://edautil1.pok.ibm.com/sm/runs/" + userid;
     $http.get( u ).then( ( active ) =>
     {
       //console.log("mantis url",config.mantis_url);
       let runs = active.data.filter(function(entry) {
         //console.log("ui_ace ws",entry);
         if(entry.mantis_frontend == config.mantis_url){
          //  console.log("ui_ace ws",entry);
           return entry;
         }
    });
       answer( ws_url( runs[ 0 ] ) );
     }, (err) =>
     {
       throw new Error( err );
     } );
   }
   ////websocket connection code end
  var ace_editor_websocket = {};
//  if((config.mantis_url && config.mantis_url !="")){
  if((config.mantis_ws_url && config.mantis_ws_url !="")){
    //shashi:need to remove this, hack for the demo
      //ace_editor.signals_annotation = signals_annotation;
//    ace_editor_websocket = websocket( get_mantis_ws_from_url, () =>
    ace_editor_websocket = websocket( config.mantis_ws_url, () =>
       {
         ace_editor_websocket.send( "mts_ji_api::get_fe_url", { } ).then( ( r ) =>
         {
	      if (r.fe_url === config.mantis_url )
              {
		ace_editor.mantis_websocket_enabled = true;
		ace_editor.mantis_ws = ace_editor_websocket.url;
		ace_editor.get_aet_min_cycle();
		ace_editor.get_aet_max_cycle();
		ace_editor.get_current_cycle();
		ace_editor.mantis_connected  = true;
		//add_data_to_ace();
    ace_editor.editor.resize(true);
		if(config.enable_annotation) {
		  ace_editor.aet_annotation();
		}
	      }
    	 } );

    });
  } else {
      var group =$scope.$parent.$parent.$parent.definition.group;
      var wid = $scope.$parent.$parent.$parent.definition.wid;
      if( group){
        //shashi:need to remove this, hack for the demo
          //signals_annotation.signals_annotation = signals_annotation;
        var templatefiles = TemplateWidgets.getfiles();
        var hierarchy = sharedModelServices.intra_getValue("hierarchy");
        if(hierarchy && hierarchy!='Not found'){
          config.curr_hier_inst_name_wo_top_hier = hierarchy;
        }
            // console.log("type",templatefiles);
         if(templatefiles.hasOwnProperty('vhdl')){
             ace_editor.source_data.vhdl = templatefiles.vhdl;
             // config.vhdl_path=ace_editor.source_data.vhdl;
             //$timeout(function(){ace_editor.file_loaded = false; add_data_to_ace(ace_editor.source_data.vhdl);},2000);
             ace_editor.file_loaded = false;
             var file = templatefiles.vhdl;
             config.vhdl_path = file;
             if(file){
               config.cqDirectory = file.substr(0, file.lastIndexOf("/") );
             }
              var tempData = TemplateWidgets.getApplicationData(wid,group,'mantis');
              if(tempData){
                tempData[0].then(function(data){
//              config.mantis_url=data.open;
              config.mantis_url=data.attachedData.fe_url;
              config.mantis_ws_url=data.attachedData.ws_url;
               config.cqDirectory = config.vhdl_path.substr(0, config.vhdl_path.lastIndexOf("/") );
              $rootScope.$broadcast('widgetChangesApplied');
              //add_data_to_ace();
//            setTimeout(function(){ace_editor_websocket = websocket( config.mantis_ws_url, () =>
            ace_editor_websocket = websocket( config.mantis_ws_url, () =>
               {
                 ace_editor.mantis_websocket_enabled = true;
                 ace_editor.mantis_ws = ace_editor_websocket.url;
                 /*ace_editor_websocket.send( "nut::startup" ).then( ( info ) =>
                 {
                   console.log(info);
                 } );*/
                 ace_editor.mantis_connected  = true;
                 ace_editor.get_aet_min_cycle();
                 ace_editor.get_aet_max_cycle();
                 ace_editor.get_current_cycle();
            		 if(config.enable_annotation) {
            		   ace_editor.aet_annotation();
            		 }
            });
//          },3000);
         });
       }
       }
     }else {
          var applications = sharedModelServices.intra_getValue("APPLICATIONS");
          if(!(applications == null)){
             var mantis_info = applications["mantis_fe"];
             if(!(mantis_info == null)){
                config.mantis_url=mantis_info["fe_url"];
                config.mantis_ws_url=mantis_info["ws_url"];
                ace_editor_websocket = websocket( config.mantis_ws_url, () =>
                {
                   ace_editor.mantis_websocket_enabled = true;
                   ace_editor.mantis_ws = ace_editor_websocket.url;
                   ace_editor.get_aet_min_cycle();
                   ace_editor.get_aet_max_cycle();
                   ace_editor.get_current_cycle();
	           if(config.enable_annotation) {
	             ace_editor.aet_annotation();
	           }
                });
             }
          }
        }
    }

    //ace_editor.showConfirm = function(ev) {
      // Appending dialog to document.body to cover sidenav in docs app
      // var confirm = $mdDialog.prompt()
      //   .title('Hierarchy to be used for the vhdl chosen')
      //   //.textContent('Bowser is a common name.')
      //   .placeholder('Top Hierarchy')
      //   .ariaLabel('Top Hierarchy')
      //   .initialValue(config.curr_hier_inst_name_wo_top_hier)
      //   .targetEvent(ev)
      //   .ok('OK')
      //   .cancel('Cancel');

      // $mdDialog.show(confirm).then(function(result) {
	     //   config.curr_hier_inst_name_wo_top_hier = result;
	     //   sharedModelServices.intra_insertKeyValue("CQ_DEBUG_INFO","hierarchy",config.curr_hier_inst_name_wo_top_hier);
      // }, function() {
      //   //$scope.status = 'You didn\'t name your dog.';
      // });

    //Code modified for issue #29 - Balaji Pulluru - start
    ace_editor.showConfirm = function(ev) {
      var srcBsrDirSelScope = $scope.$new();
      var openedInNewTab = srcBsrDirSelScope.$parent.$parent.model.openedInNewTab;
      if(openedInNewTab == true){
        ace_editor.inNewTab = true;
        ace_editor.top_hier = config.curr_hier_inst_name_wo_top_hier;
        ace_editor.showHierarchyInfo=!ace_editor.showHierarchyInfo;
      } else {
        ace_editor.showHierarchyInfo=true;
        var vhdlHierScope = $scope.$new();

        $mdDialog.show(
        {
          templateUrl: "vhdlHierarchy.html",
          controller: vhdlHierController,
          controllerAs: 'vhdlHierCtrl',
          targetEvent: ev,
          multiple: true
        }).then(function(answer){
        });
      }
    }

    var vhdlHierController = function($scope, $mdDialog, $rootScope) {

      this.topHierarchy = config.curr_hier_inst_name_wo_top_hier;

      $scope.cancel = function() {
        ace_editor.showHierarchyInfo=false;
        //if(result !="")
        $mdDialog.hide();
      };

      $scope.setVHDLHier = function(answer){
        var result = answer.topHierarchy;
        ace_editor.showHierarchyInfo=false;
          if(result){
          config.curr_hier_inst_name_wo_top_hier = result;
          sharedModelServices.intra_insertKeyValue("CQ_DEBUG_INFO","hierarchy",config.curr_hier_inst_name_wo_top_hier);
        } else{
          config.curr_hier_inst_name_wo_top_hier = '';
        }
        $mdDialog.hide();
      }
    };

    ace_editor.saveHierarchyInfo = function(){
      ace_editor.showHierarchyInfo=false;
        if(ace_editor.top_hier){
        config.curr_hier_inst_name_wo_top_hier = ace_editor.top_hier;
        sharedModelServices.intra_insertKeyValue("CQ_DEBUG_INFO","hierarchy",config.curr_hier_inst_name_wo_top_hier);
      } else{
        config.curr_hier_inst_name_wo_top_hier = '';
      }
    }
    //Code modified for issue #29 - Balaji Pulluru - end

    ace_editor.showDirSelection = function(ev) {
      var srcBsrDirSelScope = $scope.$new();
      var openedInNewTab = srcBsrDirSelScope.$parent.$parent.model.openedInNewTab;
      if(openedInNewTab == true){
        ace_editor.inNewTab = true;
        ace_editor.file_browser=!ace_editor.file_browser;
      } else {
        ace_editor.file_browser=true;
        $mdDialog.show(
        {
          templateUrl: "sourceBrowserDirSelection.html",
          scope: srcBsrDirSelScope,
          preserveScope: true,
          focusOnOpen: true,
          targetEvent: ev,
          multiple: true
          //locals: {param:  config}
        }).then(function(answer){
        });
      }
      srcBsrDirSelScope.closeDialog = function() {
        $mdDialog.hide();
        ace_editor.file_browser=false;
      };
    }
  }
  function ace_edit_cntrl ($scope,config) {
  	var edit_cntrl=this;
  	// //console.log("contructor")
  	// //console.log(edit_cntrl.configData);
  	// $scope.$watch('edit_cntrl.configData', function(newVal,oldVal,scope) {
  	// 	if(newVal) {
  	// 		//console.log("edited");
  	// 		//console.log(edit_cntrl.configData);
  	// 		EditConfigData.setConfig(edit_cntrl.configData);
  	// 	}
  	// });
  }
ui_ace_mod.run(["$templateCache", function($templateCache)
  { $templateCache.put("sourceBrowserDirSelection.html","<md-dialog aria-label=\"ShowDirSelection\"> <md-toolbar> <div class=\"md-toolbar-tools\"> <img src=\"../../../icons/nn4.png\" style=\"height: 40px;\" /> <h2>Select File</h2> <span flex></span> <a style=\"cursor: pointer;\" ng-click=\"closeDialog()\"> <i class=\"material-icons\">close</i> </a> </div> </md-toolbar> <md-dialog-content> <div class=\"md-dialog-content\"> <form role=\"form\" name=\"showDirSelect\"> <div layout=\"column\" style=\"background-color:#fefefe\"> <md-input-container layout-nowrap> <label>File Directory</label> <input ng-model=\"config.cqDirectory\" name=\"cqDirectory\" size=\"60\" type=\"text\" ng-blur=\"ace_editor.getfiles()\" ng-keyup=\"$event.keyCode == 13 ? ace_editor.getfiles() : null\"> <md-icon><i class=\"material-icons\">help_outline</i><md-tooltip style=\"height: auto;\" md-direction=\"right\">The directory which contains your VHDL.</br>Example: /afs/apd/u/arunj/sdkssh_xfvc_hb_mac/vhdl</md-tooltip></md-icon><div ng-messages=\"showDirSelect.cqDirectory.$error\"><div>{{ ace_editor.dirValidationMsg }}</div> </div></md-input-container> <md-input-container layout-nowrap> <label>Filter*</label> <input ng-model=\"config.file_filter\" name=\"Filter\" size=\"60\" type=\"text\" ng-blur=\"ace_editor.getfiles()\" ng-keyup=\"$event.keyCode == 13 ? ace_editor.getfiles() : null\"> </md-input-container> <div layout=row layout-align=\"end\" flex><md-button class=\"md-raised md-primary\" title=\"Filter files\" data-placement=\"bottom\"  aria-label=\"info\" style=\"{height:5px;color:blue;}\" ng-click=\"ace_editor.getfiles()\" ng-show=\"!ace_editor.files\"> List </md-button></div> <div layout=\"column\" style=\"margin-top:5px;margin-bottom:10px\" ng-show=\"ace_editor.files\"> <md-input-container layout-nowrap><label>Files in the Directory:</label><md-select ng-model=\"ace_editor.selected_file\" name=\"FileOptions\"><md-option ng-repeat=\"file in ace_editor.files\" ng-value=file>{{ file }}</md-option></md-select></md-input-container><div layout=row layout-align=\"end\" flex> <md-button class=\"md-raised md-warn\" title=\"Cancel Reload\" data-placement=\"bottom\" style=\"height:5px;color : rgb(100, 100, 100);background-color: rgba(230, 230, 229, 0.96);\" ng-click=\"closeDialog()\" > Cancel </md-button> <md-button class=\"md-raised md-primary\" title=\"Reload file\" data-placement=\"bottom\"  style=\"height:5px;\" ng-click=\"ace_editor.reload_file(ace_editor.selected_file);closeDialog();\" > Open </md-button> </div></div> </div> </form> </div> </md-dialog-content> </md-dialog>");
    $templateCache.put("vhdlHierarchy.html","<md-dialog aria-label=\"Hierarchy to be used for the vhdl chosen\"> <md-toolbar> <div class=\"md-toolbar-tools\"> <img src=\"../../../icons/nn4.png\" style=\"height: 40px;\" /> <h2>Hierarchy to be used for the vhdl chosen</h2> <span flex></span> <a style=\"cursor: pointer;\" ng-click=\"cancel()\"> <i class=\"material-icons\">close</i> </a> </div> </md-toolbar> <md-dialog-content> <div class=\"md-dialog-content\"> <form role=\"form\" name=\"vhdlHierarchy\"> <div layout=\"column\"> <md-input-container > <label>Top Hierarchy</label> <input ng-model=\"vhdlHierCtrl.topHierarchy\" name=\"topHierarchy\" size=\"50\" type=\"text\"> </md-input-container> <div layout=row layout-align=\"end\" flex> <md-button ng-click=\"cancel()\" class=\"md-raised md-primary\">Cancel</md-button> <md-button ng-click=\"setVHDLHier(vhdlHierCtrl)\"  type=\"submit\" class=\"md-raised md-primary\">OK</md-button> </div> </div> </form> </div> </md-dialog-content> </md-dialog>");
}])
