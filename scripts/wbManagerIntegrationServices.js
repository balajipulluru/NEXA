angular.module('wbManagerIntegration',['LocalStorageModule','adf.provider'])
.factory('wbManagerConnect', function($q,$http,$location,widgetIntanceMap,sharedModelServices,$httpParamSerializerJQLike,storeService){
//****to be removed ***/


  var connectInit = {
    createApplication: wbm_create,
    deleteApplication: wbm_delete,
    applicationLogsPath: wbm_logspath,
  };
  function wbm_logspath(applicationName,unique_id)
  {
      var user_info = sharedModelServices.intra_getValue("USER_INFO");
      var logspath = install_path+"/logs/bjob_"+applicationName+"/"+user_info.user+"_"+unique_id+"_applogs.txt";
      return logspath;
  }
  function wbm_create(applicationName,data,wid,group='default')
  {
    var q = $q.defer();
    // connection to application wrapper ---will be removed once workbench manager
    // supports command line arguments
    var user_info = sharedModelServices.intra_getValue("USER_INFO");
    data.cell = user_info["cell"];
    data.afsid = user_info["user"];
    data.dedicated_server_launch = false;
    var cloudConfig = sharedModelServices.intra_getValue("NEXA_Cloud_Configuration");
    if(cloudConfig == 'Not found') {
      cloudConfig = '{"mem": 2, "cpu": 1, "R": "select[(osname==linux) && (type==X86_64)]","W":"720:00"}';
      data.LSF_Options =  JSON.parse(cloudConfig);
    }else {
    data.LSF_Options =  JSON.parse(cloudConfig.LSF_Options)
    data.dedicated_server_launch = cloudConfig.dedicated_server_launch;
    }
    if(data.cell == "vlsilab"){
      data.LSF_Options['P'] = 'p9';
      data.LSF_Options['G'] = 'p9s1_unit';
      var LSF_Options = JSON.stringify(data.LSF_Options);
      sharedModelServices.intra_insertKeyValue("NEXA_Cloud_Configuration","LSF_Options",LSF_Options);
    }
    
    console.log("wbm_create ",data);
    if(!via_WBM){
      if(applicationName == 'mantis')
      {
        console.log("matis create",data);
        let mantis_instanceId = (new Date()).getTime();
        console.log(data);
        var urlPath = application_wrapper_url+'/create/' + mantis_instanceId;
        $http({
         method: 'POST',
         url: urlPath,
         headers: {
           'Content-Type': 'application/x-www-form-urlencoded'
         },
         withCredentials: true,
         data:$httpParamSerializerJQLike(data),
         }).success(function (data, status, headers, config) {
            console.log(data);
            if(wid!=-1){
              widgetIntanceMap.setInstanceId(wid,mantis_instanceId);
            }
            //mantis_instanceId +=1;
             //document.getElementById('frameUrl').src = data.open;
            q.resolve(data);
         }).error(function (data, status, headers, config) {
           q.reject("error occured while requesting WB manager");
        });
      }
    } else {
      if(wb_integration_app_id_map.hasOwnProperty(applicationName))
      {
        // var applicationId = '58ceb8afd860fb50b4c3a395'; //calculator app id as defined in WB Manager
        if(wid===-1){
           data.logfile=wbm_logspath(applicationName,group);
           data.uniqueId=group;
           }
        else{
           data.logfile=wbm_logspath(applicationName,wid);
           data.uniqueId=wid;
           }
        console.log("wbm_create data",data);
        var applicationId = wb_integration_app_id_map[applicationName]
        console.log(applicationId);
        // var sessionId = $location.absUrl();
        // var res = sessionId.split("/");
        // sessionId = res[5];
        var sessionId = storeService.getSessionId();
        var urlPath = workbench_manager_url+'/user/sessions/' + sessionId + '/applications/' + applicationId;
        $http({
         method: 'POST',
         url: urlPath,
         headers: {
              'Content-Type': 'application/x-www-form-urlencoded'
            },
            withCredentials: true,
            data: $httpParamSerializerJQLike(data),
         }).success(function (data, status, headers, config) {
		      console.log("WBM data",data);
            // //TODO: remove when instanceId is part of the returned object
            // var instanceId = data.open;
            // var pos = instanceId.lastIndexOf('=')
    				// if(pos==-1) {
    				// 	pos = instanceId.lastIndexOf('/');
    				// }
    				// instanceId = instanceId.slice(pos+1,instanceId.length);
            // if(wid==-1) {
            //   widgetIntanceMap.setInstanceId(wid,instanceId);
            // }
             //document.getElementById('frameUrl').src = data.open;
            q.resolve(data);
         }).error(function (data, status, headers, config) {
           q.reject("error occured while requesting WB manager");
        });
      }
    }
    return q.promise;
  }

  function wbm_delete(wid)
  {
    var q = $q.defer();
    console.log("delete called");
    // "deleteInstance" : "http://edagl11m.pok.ibm.com:8081/delete/${instanceId}",
    //**mantis_FE
    var instanceId = widgetIntanceMap.getInstanceID(wid);
    if(instanceId != -1){
        if(remote_launch===1){
          //var urlPath = 'http://edagl10aj.pok.ibm.com:8083/delete/' + instanceId[0];
                var urlPath = 'http://edagl15aq.pok.ibm.com:9083/delete/' + instanceId[0];
        } else {
        //  var urlPath = 'http://edagl10aj.pok.ibm.com:9083/delete/' + instanceId[0];
        var urlPath = 'http://edagl15aq.pok.ibm.com:9083/delete/' + mantis_instanceId;
      }
        $http({
         method: 'GET',
         url: urlPath,
         }).success(function (data, status, headers, config) {
            // console.log(data);
             //document.getElementById('frameUrl').src = data.open;
            q.resolve(data);
         }).error(function (data, status, headers, config) {
           q.reject("error occured while requesting WB manager");
        });
    }else{
      q.resolve("no application instances found");
    }
    return q.promise;
  }

  return connectInit;
})

.factory('TemplateWidgets',function(wbManagerConnect,sharedModelServices){
  var file_list=[];
  var group_application_map = new Map();
  //application_file_map and widget_application_map needs to be obatined
  //from widget developers, this data can be provided during widget is registered
  //with dashboard provider
  var application_file_map = {
   mantis:{'aet':'aet','proto':'proto','iolist':'iolist'}
 };
 var widget_application_map = {
   mantis_FE:['mantis'],
   //navigator application wrapper not available as if now
   //Hierarchy_Browser:['mantis','navigator'],
   //Hierarchy_Browser:['mantis'],
   NEXA_Source_Browser:['mantis']
 };

  var TemplateWidgetsInit = {
    addfiles:add_files,
    getfiles:get_files,
    addFilesFromDirectory: add_files_from_dir,
    addApplicationData:add_application_data_for_group,
    getApplicationData:get_application_data_from_group,
    getTemplate:get_template
  };

//add application(output from application wrapper) data for applications in a group (template)
  function add_application_data_for_group(group,application,data){
    var temp = group_application_map.get(group);
    if(temp)
    {
      if(temp.hasOwnProperty(application)){
        temp[application].push(data);
      }else{
        temp[application]=[data];
      }
    }else {
      var temp = {};
      temp[application]=[data];
      group_application_map.set(group,temp);
    }
    console.log("add application for group",group_application_map);
    //process_registerd_promises();
  }
  //get application(output from application wrapper) data for applications in a group (template)
    function get_application_data_from_group (wid,group,application){
      console.log("calee arguments",wid,group,application);
      var temp = group_application_map.get(group);
      if(temp){
        if(temp.hasOwnProperty(application)){
          return temp[application];
        }
      }
    }

function add_files(files){
    console.log("adding files",files);
    file_list=files;
  }

 function add_files_from_dir(dir){
  file_list = sharedModelServices.intra_getValue("files_selected");
  console.log("**** file_list - ",file_list);
  // var list = sharedModelServices.intra_getValue(dir);
  // var files = {};
  // Object.keys(list).forEach(function(key){
  //   files[key]=cq_dir+"/"+list[key];
  // });
  // file_list=files;
}

  function get_files(files){
    return file_list;
  }

  function create_applications(group,widgetList)
  {
    var application_set = new Set();
    angular.forEach(widgetList, function(value) {
        if(widget_application_map.hasOwnProperty(value)){
            angular.forEach(widget_application_map[value],function(app){
                application_set.add(app);
            });
        } else {
          console.log("no application dependence defined for widget "+value);
        }
    });
    application_set.forEach(function(applicationName){
      if(application_file_map.hasOwnProperty(applicationName)){
        var inputs = {};
        var files_required = application_file_map[applicationName];
        Object.keys(files_required).forEach(function(file) {
          if(file_list.hasOwnProperty(file)){
            inputs[files_required[file]] = file_list[file];
          }
        });
        // console.log('inputs',inputs,Object.keys(inputs).length);
        if(Object.keys(inputs).length>0){
          var promise = wbManagerConnect.createApplication(applicationName,inputs,-1,group);
          add_application_data_for_group(group,applicationName,promise);
        } else {
          console.log("could not find the required files for application " + applicationName);
        }
      } else {
        console.log("could not find file map for application "+applicationName);
      }
    });
    // var wid = 0;
    // var inputs = {};
    // if(file_list.hasOwnProperty('aet')){
    //     inputs.aet=file_list.aet;
    // }
  }
//get template for the files/default template of the user
// @ interfaceName - name of interface
//@2 TemplateName - name of the template/group of widgets
  function get_template(interfaceName,dashboardID)
  {
    var groupID = (new Date()).getTime();
    group_application_map.set(groupID,{});
	if (file_list.hasOwnProperty("cgcsv") && file_list["cgcsv"]) {
      if (file_list.hasOwnProperty("aet") && file_list["aet"]) {
      var template = {
	       "title": interfaceName,
         "intfId": dashboardID,
  	      "structure": "4-8",
  	       "rows": [{
  		         "columns": [{
  				           "styleClass": "col-md-4",
  				               "widgets": [{
  						                         "type": "trace_file",
  						                         "group": groupID,
  					                          },
  					                          {
  						                          "type": "NEXA_Source_Browser",
  						                          "group": groupID,
  					                          }
  				                           ]
  			                    },
  			                    {
  				            "styleClass": "col-md-8",
  				                "widgets": [{
  						                          "type": "mantis_FE",
  						                          "group": groupID,
  					                           },
  					                          {
  						                          "type": "nexa_csv_viewer",
  						                          "group": groupID,
  					                          }
  				                            ]
  			                    }
  		                      ]
  	             }],
       }
     //get template should create a template on the fly and hence be aware
      create_applications(groupID,['mantis_FE','NEXA_Source_Browser','trace_file','nexa_csv_viewer']);
    } else {
      var template = {
	       "title": interfaceName,
	       "intfId": dashboardID,
	       "structure": "4-8",
	       "rows": [{
  		         "columns": [{
  				           "styleClass": "col-md-6",
  				               "widgets": [{
  						               "type": "trace_file",
  						               "group": groupID,
  					                   }
  				                          ]
  			                    },
  			                    {
  				            "styleClass": "col-md-6",
  				                "widgets": [{
                                                               "type": "NEXA_Source_Browser",
                                                               "group": groupID,
                                                            }
                				           ]
  			                    },
  			                    {
  				            "styleClass": "col-md-6",
  				                "widgets": [{
                                                               "type": "nexa_csv_viewer",
                                                               "group": groupID,
                                                            }
                				           ]
  			                    }
  		                    ]
  	             }],
       }
    }
	return template;
  }
  else{
    if (file_list.hasOwnProperty("aet") && file_list["aet"]) {
      var template = {
	       "title": interfaceName,
         "intfId": dashboardID,
  	      "structure": "4-8",
  	       "rows": [{
  		         "columns": [{
  				           "styleClass": "col-md-4",
  				               "widgets": [{
  						                         "type": "trace_file",
  						                         "group": groupID,
  					                          },
  					                          {
  						                          "type": "NEXA_Source_Browser",
  						                          "group": groupID,
  					                          }
  				                           ]
  			                    },
  			                    {
  				            "styleClass": "col-md-8",
  				                "widgets": [{
  						                          "type": "mantis_FE",
  						                          "group": groupID,
  					                           }
  				                            ]
  			                    }
  		                      ]
  	             }],
       }
     //get template should create a template on the fly and hence be aware
     //of the widgets it should launch
      create_applications(groupID,['mantis_FE','NEXA_Source_Browser','trace_file','nexa_csv_viewer']);
    } else {
      var template = {
	       "title": interfaceName,
         "intfId": dashboardID,
  	      "structure": "4-8",
  	       "rows": [{
  		         "columns": [{
  				           "styleClass": "col-md-6",
  				               "widgets": [{
  						                         "type": "trace_file",
  						                         "group": groupID,
  					                          }
  				                           ]
  			                    },
  			                    {
  				            "styleClass": "col-md-6",
  				                "widgets": [{
                                          "type": "NEXA_Source_Browser",
                                          "group": groupID,
                                        }
                				             ]
  			                    }
  		                      ]
  	             }],
       }
    }
    return template;
  }
  }//end of get_template

  return TemplateWidgetsInit;
})

.service('getFiles',function(sharedModelServices){
  this.parseDir = function(cq_dir){
    console.log('getFiles',cq_dir);
    /*var files = {
      aet:"/afs/eda/project/eins-cg/runs6/LS_SETI_MAC_feb22/B0.C0.S0.P0.E9.EX00.EC.C0.LS.LSSETI0.einscg_gen_m3/input_files/power_triad16rel_smt4.aet",
      trace:"sample/../widgets/trace_file/docs/example.trace",
      vhdl:"/afs/awd/projects/eclipz/c14/verif/p9nd2/core/release/gold/vhdl/lsu/ls_seti_mac.vhdl"
    };*/
    //var files = sharedModelServices.intra_getValue("cq_dir1");
    return file_list;
   //sharedModelServices.intra_insertKeyValue("session_input",String(cq_dir),files);
  }
})

.service("widgetIntanceMap",function(localStorageService) {
  let widInstanceMap = localStorageService.get("widgetIntanceMap");
  if(!widInstanceMap)
  {
    widInstanceMap = new Object();
  }

  this.getInstanceID = function (wid) {
    if(widInstanceMap.hasOwnProperty(wid)){
        return widInstanceMap[wid];
      } else {
        return -1;
      }

  }

  this.setInstanceId = function (wid,instanceId) {
    if(widInstanceMap.hasOwnProperty(wid))
    {
      widInstanceMap[wid].push(instanceId);
    } else {
        widInstanceMap[wid]=new Array();
        widInstanceMap[wid].push(instanceId);
      }
    localStorageService.set("widgetIntanceMap",widInstanceMap);
    console.log(widInstanceMap);
  }
});
